"""Stdlib unit suite for the process-macos.py collector and exec gate.

Loads both production owners through the same explicit frozen-sibling
mechanism so `python -I -B` runs with no sys.path fallback. The native
core is replaced by an injected fake whose BackendError/ipc_error are
the REAL classes from process-macos-abi.py through the core re-export,
so guard assertions exercise the actual production error surface.
"""
import ctypes
import errno
import importlib.util
import io
import json
import os
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, file))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


N = load("process_macos_native", "process-macos-native.py")
E = load("process_macos_entry", "process-macos.py")
S = load("process_macos_support", "process_macos_test_support.py")


def frame(msg, seq, run="run-1"):
    return (json.dumps({"ipcVersion": 1, "runId": run, "seq": seq, **msg})
            .encode() + b"\n")


ROOT = {
    "identity": {"pid": 99, "startSec": "1", "startUsec": 0},
    "kind": "browser",
    "expectedExecutable": "/bin/x",
    "scopeRunId": "run-1",
}

SUPERVISOR_ROOT = dict(ROOT, kind="supervisor")


def fake_n():
    import types
    n = types.SimpleNamespace()
    n.BackendError = N.BackendError
    n.ipc_error = N.ipc_error
    n.BSD_INFO_SIZE = 136
    n.TASK_INFO_SIZE = 96
    n.PID_MAX = N.PID_MAX
    n.SIGMAP = N.SIGMAP
    n.LIBPROC_PATH = "/usr/lib/libproc.dylib"
    n.LSOF_PATH = "/usr/sbin/lsof"
    n.lsof_argv = N.lsof_argv
    n.bind_libproc = lambda: N.Backend(lambda *a: 0, lambda *a: 0,
                                     lambda *a: 0)
    n.bsd_row = lambda be, pid: {
        "identity": {"pid": pid, "startSec": "1", "startUsec": 0},
        "ppid": 1, "pgid": pid, "uid": 501,
    }
    n.discover = lambda be: []
    n.project_discovery = N.project_discovery
    n.sample_process = lambda be, i: {"state": "gone"}
    n.inspect_process = lambda be, pid: {
        "state": "live",
        "process": {"identity": {"pid": pid, "startSec": "1",
                                 "startUsec": 0},
                    "ppid": 1, "pgid": pid, "uid": 501},
        "executable": "/bin/x",
    }
    n.probe_identity = lambda be, i: "gone"
    n.signal_identity = lambda be, i, s: "sent"
    return n


class CollectorWireTests(unittest.TestCase):
    def run_col(self, script, teardown=False):
        instream = io.BytesIO(script)
        outstream = io.BytesIO()
        col = E.Collector(fake_n(), n_backend(), "run-1", teardown,
                          instream, outstream)
        code = col.run(1)
        outstream.seek(0)
        out = [json.loads(x) for x in outstream.read().split(b"\n") if x]
        return code, out

    def test_ready_then_roots_then_shutdown(self):
        script = frame({"type": "own-roots", "requestId": "r1",
                        "roots": [ROOT]}, 0)
        script += frame({"type": "shutdown", "requestId": "sd"}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 0)
        self.assertEqual(out[0]["type"], "ready")
        self.assertEqual(out[0]["stage"], "startup")
        self.assertEqual(out[1]["stage"], "roots-accepted")
        self.assertEqual(out[1]["requestId"], "r1")

    def test_empty_roots_is_a_legal_noop_batch(self):
        # An empty own-roots list is a legal no-op batch, not a fault:
        # it still produces the exact roots-accepted acknowledgement.
        script = frame({"type": "own-roots", "requestId": "e",
                        "roots": []}, 0)
        script += frame({"type": "shutdown", "requestId": "sd"}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 0)
        self.assertEqual(out[1]["stage"], "roots-accepted")
        self.assertEqual(out[1]["requestId"], "e")

    def test_root_accumulation_no_dup(self):
        script = frame({"type": "own-roots", "requestId": "a",
                        "roots": [ROOT]}, 0)
        script += frame({"type": "own-roots", "requestId": "b",
                         "roots": [ROOT]}, 1)
        script += frame({"type": "shutdown", "requestId": "sd"}, 2)
        code, out = self.run_col(script)
        self.assertEqual(code, 0)

    def test_root_conflict_rejected(self):
        other = dict(ROOT, expectedExecutable="/bin/y")
        script = frame({"type": "own-roots", "requestId": "a",
                        "roots": [ROOT]}, 0)
        script += frame({"type": "own-roots", "requestId": "b",
                         "roots": [other]}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 2)

    def test_duplicate_request_id_rejected(self):
        ident = {"pid": 3, "startSec": "4", "startUsec": 5}
        script = frame({"type": "sample", "requestId": "s1", "owned": [],
                        "inspectPids": [], "probes": []}, 0)
        script += frame({"type": "sample", "requestId": "s1", "owned": [],
                         "inspectPids": [], "probes": []}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 2)

    def test_trailing_key_rejected(self):
        script = frame({"type": "sample", "requestId": "s1", "owned": [],
                        "inspectPids": [], "probes": [], "extra": 1}, 0)
        code, out = self.run_col(script)
        self.assertEqual(code, 2)

    def test_sample_reply_shape(self):
        ident = {"pid": 3, "startSec": "4", "startUsec": 5}
        script = frame(
            {"type": "sample", "requestId": "s1", "owned": [ident],
             "inspectPids": [3], "probes": [ident]}, 0)
        script += frame({"type": "shutdown", "requestId": "sd"}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 0)
        rep = out[1]
        self.assertEqual(rep["type"], "process-samples")
        for k in ("discovered", "samples", "gone", "inspected", "probes"):
            self.assertIn(k, rep)
        self.assertEqual(rep["gone"], [ident])
        self.assertEqual(rep["inspected"][0]["state"], "live")

    def test_bad_seq_faults(self):
        script = frame({"type": "shutdown"}, 5)
        code, out = self.run_col(script)
        self.assertEqual(code, 2)
        self.assertEqual(out[-1]["type"], "accounting-fault")
        self.assertEqual(out[-1]["code"], "IPC_INVALID")

    def test_oversize_and_partial_fault(self):
        code, out = self.run_col(b"x" * (1048576 + 5) + b"\n")
        self.assertEqual(code, 2)
        self.assertEqual(out[-1]["type"], "accounting-fault")
        code2, out2 = self.run_col(b'{"type":"shutdown"')  # no LF, EOF
        self.assertEqual(code2, 2)
        code3, out3 = self.run_col(b"\n")  # blank frame
        self.assertEqual(code3, 2)

    def test_teardown_rejects_own_roots(self):
        code, out = self.run_col(
            frame({"type": "own-roots", "requestId": "r",
                   "roots": [ROOT]}, 0),
            teardown=True)
        self.assertEqual(code, 2)

    def test_discover_upstream_fault_not_hidden_by_projection(self):
        # A real native uid-mismatch inside discover must surface as
        # ACCOUNTING_UNAVAILABLE/exit 2: the projector only consumes
        # already-validated complete rows and cannot forgive it.
        n = fake_n()

        def raise_uid(be):
            raise N.BackendError("uid-mismatch", "pid 7 uid 502")

        n.discover = raise_uid
        calls = []

        def spy(*args):
            calls.append(args)
            return N.project_discovery(*args)

        n.project_discovery = spy
        instream = io.BytesIO(
            frame({"type": "sample", "requestId": "s1", "owned": [],
                   "inspectPids": [], "probes": []}, 0))
        outstream = io.BytesIO()
        col = E.Collector(n, n_backend(), "run-1", False,
                          instream, outstream)
        code = col.run(1)
        outstream.seek(0)
        out = [json.loads(x) for x in outstream.read().split(b"\n") if x]
        self.assertEqual(code, 2)
        self.assertEqual(out[-1]["type"], "accounting-fault")
        self.assertEqual(out[-1]["code"], "ACCOUNTING_UNAVAILABLE")
        self.assertEqual(calls, [])

    def test_revalidated_census_keeps_first_clock_and_owned_coverage(self):
        for owned_failure in (False, "task", "bsd"):
            with self.subTest(owned_failure=owned_failure):
                lists, bsd_reads = [], []

                def listpids(flavor, uid, arr, size):
                    vector = [3, 11] if not lists else [3]
                    lists.append(vector)
                    for index, pid in enumerate(vector):
                        arr[index] = pid
                    return len(vector) * 4

                def pidinfo(pid, flavor, arg, bufp, size):
                    if pid == 3 and flavor == N.PROC_PIDTBSDINFO:
                        bsd_reads.append(pid)
                    denied = ((owned_failure == "task" and flavor == N.PROC_PIDTASKINFO)
                              or (owned_failure == "bsd" and len(bsd_reads) >= 3))
                    if pid == 11 or denied:
                        ctypes.set_errno(errno.EPERM)
                        return -1
                    value = (S.task_struct(N, rss=123) if flavor == N.PROC_PIDTASKINFO
                             else S.bsd_struct(N, pid=pid, uid=os.getuid(), sec=1, usec=0))
                    ctypes.memmove(bufp, ctypes.byref(value), size)
                    return size

                native = fake_n()
                native.discover = N.discover
                native.sample_process = N.sample_process
                ident = {"pid": 3, "startSec": "1", "startUsec": 0}
                script = frame({"type": "sample", "requestId": "s1", "owned": [ident],
                                "inspectPids": [], "probes": []}, 0)
                script += frame({"type": "shutdown", "requestId": "done"}, 1)
                stream = io.BytesIO()
                collector = E.Collector(native, N.Backend(listpids, pidinfo, lambda *a: 0),
                                        "run-1", False, io.BytesIO(script), stream)
                with mock.patch.object(E.time, "monotonic_ns", side_effect=[100, 600000101]):
                    code = collector.run(1)
                messages = [json.loads(line) for line in stream.getvalue().splitlines()]
                self.assertEqual(lists, [[3, 11], [3]])
                if owned_failure:
                    self.assertEqual(code, 2)
                    self.assertFalse(any(m["type"] == "process-samples" for m in messages))
                    flavor = "task" if owned_failure == "task" else "bsd"
                    self.assertIn(f"pidinfo-{flavor} 3 errno 1", messages[-1]["diagnostic"])
                else:
                    self.assertEqual(code, 0)
                    reply = messages[1]
                    self.assertEqual(reply["startedAtMonoNs"], "100")
                    self.assertEqual(reply["finishedAtMonoNs"], "600000101")
                    self.assertEqual(reply["samples"][0]["identity"], ident)
                    self.assertEqual(reply["samples"][0]["residentBytes"], 123)
                    self.assertEqual(reply["gone"], [])

    def test_signal_reply(self):
        ident = {"pid": 3, "startSec": "4", "startUsec": 5}
        script = frame({"type": "signal", "requestId": "g1",
                        "identity": ident, "signal": "TERM"}, 0)
        script += frame({"type": "shutdown", "requestId": "sd"}, 1)
        code, out = self.run_col(script)
        self.assertEqual(out[1]["type"], "signal-result")
        self.assertEqual(out[1]["outcome"], "sent")

    def test_signal_protected_root_rejected(self):
        script = frame({"type": "own-roots", "requestId": "a",
                        "roots": [SUPERVISOR_ROOT]}, 0)
        script += frame({"type": "signal", "requestId": "g",
                         "identity": SUPERVISOR_ROOT["identity"],
                         "signal": "KILL"}, 1)
        code, out = self.run_col(script)
        self.assertEqual(code, 2)
        self.assertEqual(out[-1]["code"], "IPC_INVALID")


class ExecGateTests(unittest.TestCase):
    def write_gate(self, frames):
        r, w = os.pipe()
        for f in frames:
            os.write(w, f)
        os.close(w)
        return r

    def test_gate_execv_sentinel(self):
        # A successful exec never returns: the sentinel raises out of
        # the function, proving control reached os.execv.
        query = {"kind": "owned-pids", "pids": [7]}
        ident = {"pid": os.getpid(), "startSec": "1", "startUsec": 0}
        r = self.write_gate([frame({"type": "exec", "requestId": "q1",
                                    "identity": ident, "query": query}, 0)])
        calls = []

        def sentinel(path, argv):
            calls.append((path, argv))
            raise SystemExit(0)

        with mock.patch.object(E.os, "execv", side_effect=sentinel):
            with self.assertRaises(SystemExit):
                E.run_exec_gate(fake_n(), "run-1", "q1", r,
                                json.dumps(query))
        self.assertEqual(calls[0][0], "/usr/sbin/lsof")
        self.assertIn("-p", calls[0][1])

    def test_gate_execv_return_is_failure(self):
        # Production treats an execv return as an exec-gate error.
        query = {"kind": "owned-pids", "pids": [7]}
        ident = {"pid": os.getpid(), "startSec": "1", "startUsec": 0}
        r = self.write_gate([frame({"type": "exec", "requestId": "q1",
                                    "identity": ident, "query": query}, 0)])
        with mock.patch.object(E.os, "execv", return_value=None):
            with self.assertRaises(N.BackendError) as ctx:
                E.run_exec_gate(fake_n(), "run-1", "q1", r,
                                json.dumps(query))
        self.assertEqual(ctx.exception.reason, "exec-gate")

    def test_gate_rejects_wrong_run(self):
        query = {"kind": "port", "port": 9}
        r = self.write_gate([frame({"type": "exec", "requestId": "q1",
                                    "identity": {}, "query": query}, 0,
                                   run="other")])
        with self.assertRaises(N.BackendError):
            E.run_exec_gate(fake_n(), "run-1", "q1", r, json.dumps(query))

    def test_gate_rejects_trailing_records(self):
        query = {"kind": "port", "port": 9}
        ident = {"pid": os.getpid(), "startSec": "1", "startUsec": 0}
        r = self.write_gate([
            frame({"type": "exec", "requestId": "q1", "identity": ident,
                   "query": query}, 0),
            frame({"type": "exec", "requestId": "q2", "identity": ident,
                   "query": query}, 1),
        ])
        with self.assertRaises(N.BackendError):
            E.run_exec_gate(fake_n(), "run-1", "q1", r, json.dumps(query))

    def test_gate_rejects_query_mismatch(self):
        query = {"kind": "port", "port": 9}
        ident = {"pid": os.getpid(), "startSec": "1", "startUsec": 0}
        r = self.write_gate([frame({"type": "exec", "requestId": "q1",
                                    "identity": ident,
                                    "query": {"kind": "port",
                                              "port": 10}}, 0)])
        with self.assertRaises(N.BackendError):
            E.run_exec_gate(fake_n(), "run-1", "q1", r, json.dumps(query))


def n_backend():
    return N.Backend(lambda *a: 0, lambda *a: 0, lambda *a: 0)


if __name__ == "__main__":
    unittest.main()
