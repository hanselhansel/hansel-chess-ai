"""Entry/wire owner for the Darwin/arm64 native supervisor helper.

  --collector   bounded JSON-lines collector implementing the C4a1 wire
  --exec-gated  private-descriptor-3 gated wrapper that execs /usr/sbin/lsof

All lazy ctypes/ABI/native primitives live in process-macos-native.py
(which loads process-macos-abi.py), loaded explicitly from the frozen
sibling path below so the `-I` interpreter never resolves core code
through sys.path, PYTHONPATH or an installed fallback. Importing this
module performs no CDLL load, spawn or loop. Stdlib only.
"""
import importlib.util
import json
import os
import platform
import sys
import time

MAXFRAME = 1048576
NATIVE_SIBLING = "process-macos-native.py"
ENVELOPE = {"ipcVersion", "runId", "seq", "type", "requestId"}
ROOT_FIELDS = {"identity", "kind", "expectedExecutable", "scopeRunId"}
ROOT_KINDS = {"supervisor", "collector", "driver", "browser",
              "python", "fixture", "helper"}
IDENT_FIELDS = {"pid", "startSec", "startUsec"}
PROTECTED_KINDS = {"supervisor", "collector"}


def _load_native():
    """Load the frozen sibling core explicitly; no path/PYTHONPATH fallback."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, NATIVE_SIBLING)
    spec = importlib.util.spec_from_file_location(
        "process_macos_native", path)
    if spec is None or spec.loader is None:
        raise OSError(f"{NATIVE_SIBLING} missing at {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _closed(msg, required):
    """Closed-shape check: exactly ENVELOPE+required keys, no extras."""
    return isinstance(msg, dict) and set(msg) == ENVELOPE | required


def _u64(v):
    """Canonical ASCII uint64 decimal: 0 or no leading zeros, <= 2^64-1."""
    return (isinstance(v, str) and v.isascii() and v.isdigit()
            and (v == "0" or v[0] != "0")
            and int(v) <= 18446744073709551615)


def _abs(v):
    """Structural absolute path: leading root, no empty/dot/dotdot
    segments, no trailing slash, backslash or NUL."""
    return (isinstance(v, str) and len(v) > 1 and v.startswith("/")
            and not v.endswith("/") and "\\" not in v and "\x00" not in v
            and all(p not in ("", ".", "..") for p in v.split("/")[1:]))


def _identity(v):
    return (isinstance(v, dict) and set(v) == IDENT_FIELDS
            and type(v["pid"]) is int and 1 <= v["pid"] <= 2147483647
            and _u64(v["startSec"])
            and type(v["startUsec"]) is int
            and 0 <= v["startUsec"] <= 999999)


def _bounded(text, cap):
    """Byte-bounded diagnostic text, truncated by UTF-8 bytes."""
    return str(text).encode("utf-8")[:cap].decode("utf-8", "replace")


class Collector:
    """C4a1 collector wire over bounded strict-UTF8 JSON-lines frames.

    The native module `n` is injected so tests can substitute a fake core;
    `be` is its Backend (listpids/pidinfo/pidpath callables). Request IDs
    are registered once each; roots accumulate with conflict detection and
    protected accounting roots are never signal targets.
    """

    def __init__(self, n, be, run_id, teardown, instream, outstream):
        self.n = n
        self.be = be
        self.run_id = run_id
        self.teardown = teardown
        self.instream = instream
        self.outstream = outstream
        self.seq_in = 0
        self.seq_out = 0
        self.roots = []
        self.discovery_seeds = {}  # DATA ONLY, never terminal/proof authority.
        self.request_ids = set()
        self.protected = set()
        self.closed = False

    def send(self, msg):
        msg["seq"] = self.seq_out
        self.seq_out += 1
        frame = json.dumps({"ipcVersion": 1, "runId": self.run_id, **msg},
                           separators=(",", ":")).encode("utf-8") + b"\n"
        if len(frame) > MAXFRAME:
            raise self.n.BackendError("internal", "outbound frame overflow")
        self.outstream.write(frame)
        self.outstream.flush()

    def fault(self, request_id, exc):
        self.send({"type": "accounting-fault", "requestId": request_id,
                   "code": exc.code, "reason": exc.reason,
                   "diagnostic": _bounded(exc.detail, 4096)})

    def ready(self, supervisor_pid):
        own = self.n.bsd_row(self.be, os.getpid())
        sup = self.n.bsd_row(self.be, supervisor_pid)
        if own is None or sup is None:
            raise self.n.BackendError("unstable-identity",
                                      "bootstrap tuple gone")
        un = platform.uname()
        self.send({
            "type": "ready", "stage": "startup", "requestId": None,
            "collector": own["identity"], "supervisor": sup["identity"],
            "platform": un.system.lower(), "arch": un.machine,
            "abi": {"bsdInfoSize": self.n.BSD_INFO_SIZE,
                    "taskInfoSize": self.n.TASK_INFO_SIZE},
            "python": {"executable": sys.executable, "prefix": sys.prefix,
                       "basePrefix": sys.base_prefix,
                       "version": platform.python_version()},
            "libprocPath": self.n.LIBPROC_PATH,
        })

    def _key(self, ident):
        return (ident["pid"], ident["startSec"], ident["startUsec"])

    def _answer(self, rid, msg):
        msg["requestId"] = rid
        self.send(msg)
        return False

    def _roots(self, msg):
        roots = msg["roots"]
        # An empty own-roots list is a legal no-op batch.
        if not isinstance(roots, list):
            raise self.n.ipc_error("roots list")
        seen = {self._key(r["identity"]) for r in self.roots}
        for r in roots:
            if (not isinstance(r, dict) or set(r) != ROOT_FIELDS
                    or not _identity(r["identity"])
                    or r["kind"] not in ROOT_KINDS
                    or not _abs(r["expectedExecutable"])
                    or not isinstance(r["scopeRunId"], str)
                    or (r["scopeRunId"] != self.run_id
                        and not r["scopeRunId"].startswith(
                            self.run_id + ":"))):
                raise self.n.ipc_error("root fields")
            k = self._key(r["identity"])
            for prev in self.roots:
                if self._key(prev["identity"]) == k and prev != r:
                    raise self.n.ipc_error("root conflict")
            if k not in seen:
                seen.add(k)
                self.roots.append(dict(r))
                if r["kind"] in PROTECTED_KINDS:
                    self.protected.add(k)
        return self._answer(msg["requestId"], {"type": "ready",
                                               "stage": "roots-accepted"})

    def _rid(self, msg):
        """Nonempty, never-before-seen requestId, including shutdown."""
        rid = msg.get("requestId")
        if not isinstance(rid, str) or not rid or rid in self.request_ids:
            raise self.n.ipc_error("requestId")
        self.request_ids.add(rid)
        return rid

    def handle(self, msg):
        """Validate and answer one s2c message. Returns True when done."""
        if not isinstance(msg, dict):
            raise self.n.ipc_error("envelope")
        if type(msg.get("ipcVersion")) is not int \
                or msg["ipcVersion"] != 1:
            raise self.n.ipc_error("ipcVersion")
        if msg.get("runId") != self.run_id:
            raise self.n.ipc_error("runId")
        if type(msg.get("seq")) is not int or msg["seq"] != self.seq_in:
            raise self.n.ipc_error("seq")
        self.seq_in += 1
        t = msg.get("type")
        if t == "own-roots" and not self.teardown:
            if not _closed(msg, {"roots"}):
                raise self.n.ipc_error("own-roots fields")
            self._rid(msg)
            return self._roots(msg)
        if t == "sample":
            if not _closed(msg, {"owned", "inspectPids", "probes"}):
                raise self.n.ipc_error("sample fields")
            rid = self._rid(msg)
            self._sample(rid, msg)
            return False
        if t == "signal":
            if not _closed(msg, {"identity", "signal"}):
                raise self.n.ipc_error("signal fields")
            rid = self._rid(msg)
            if not _identity(msg["identity"]) or msg["signal"] not in \
                    self.n.SIGMAP:
                raise self.n.ipc_error("signal value")
            if self._key(msg["identity"]) in self.protected:
                raise self.n.ipc_error("protected root")
            return self._answer(rid, {
                "type": "signal-result", "identity": msg["identity"],
                "signal": msg["signal"],
                "outcome": self.n.signal_identity(
                    self.be, msg["identity"], msg["signal"])})
        if t == "shutdown":
            if set(msg) != ENVELOPE:
                raise self.n.ipc_error("shutdown fields")
            self._rid(msg)
            self.closed = True
            return True
        raise self.n.ipc_error(f"type {t!r}")

    def _sample(self, rid, msg):
        started = time.monotonic_ns()
        n, be = self.n, self.be
        owned, ins_pids, probes_in = (msg["owned"], msg["inspectPids"],
                                      msg["probes"])
        # Closed unique real list arrays, not arbitrary iterables.
        if (not isinstance(owned, list)
                or not all(_identity(i) for i in owned)
                or len({self._key(i) for i in owned}) != len(owned)):
            raise n.ipc_error("owned identities")
        if (not isinstance(ins_pids, list)
                or not all(type(p) is int and 1 <= p <= n.PID_MAX
                           for p in ins_pids)
                or len(set(ins_pids)) != len(ins_pids)):
            raise n.ipc_error("inspect pids")
        if (not isinstance(probes_in, list)
                or not all(_identity(i) for i in probes_in)
                or len({self._key(i) for i in probes_in})
                   != len(probes_in)):
            raise n.ipc_error("probe identities")
        discovered = n.discover(be)
        # The emitted set is the stateless conservative superset built
        # from the same snapshot + the complete owned union and roots.
        for ident in owned:
            self.discovery_seeds[self._key(ident)] = dict(ident)
        discovered = n.project_discovery(
            discovered, list(self.discovery_seeds.values()), self.roots)
        samples, gone, inspected = [], [], []
        for ident in msg["owned"]:
            r = n.sample_process(be, ident)
            if r["state"] == "live":
                samples.append({**r["row"],
                                "residentBytes": r["residentBytes"]})
            else:
                gone.append(ident)
        for pid in msg["inspectPids"]:
            ins = n.inspect_process(be, pid)
            if ins["state"] == "live":
                inspected.append({"pid": pid, "state": "live",
                                  "process": ins["process"],
                                  "executable": ins["executable"]})
            else:
                inspected.append({"pid": pid, "state": "gone"})
        probes = [{"identity": i, "state": n.probe_identity(be, i)}
                  for i in msg["probes"]]
        self.send({
            "type": "process-samples", "requestId": rid,
            "startedAtMonoNs": str(started),
            "finishedAtMonoNs": str(time.monotonic_ns()),
            "discovered": discovered, "samples": samples, "gone": gone,
            "inspected": inspected, "probes": probes,
        })

    def run(self, supervisor_pid):
        """Startup, then one bounded strict-UTF8 line per loop."""
        try:
            self.ready(supervisor_pid)
        except self.n.BackendError as exc:
            self.fault(None, exc)
            return 2
        while True:
            line = self.instream.readline(MAXFRAME + 2)
            if not line:
                return 0 if self.closed else 2
            rid = None
            try:
                if len(line) > MAXFRAME or not line.endswith(b"\n"):
                    raise self.n.ipc_error("inbound frame shape")
                if line == b"\n":
                    raise self.n.ipc_error("blank frame")
                msg = json.loads(line[:-1].decode("utf-8"))
                if isinstance(msg, dict) and isinstance(
                        msg.get("requestId"), str):
                    rid = msg["requestId"]
                if self.handle(msg):
                    return 0
            except UnicodeDecodeError:
                self.fault(rid, self.n.ipc_error("frame utf8"))
                return 2
            except json.JSONDecodeError as exc:
                self.fault(rid, self.n.ipc_error(f"json {exc}"))
                return 2
            except Exception as exc:
                e = exc if isinstance(exc, self.n.BackendError) \
                    else self.n.ipc_error(_bounded(exc, 2048))
                self.fault(rid, e)
                return 2


def run_exec_gate(n, run_id, query_id, gate_fd, query_json):
    """Read one authorized exec frame on the private fd, then same-PID exec.

    Exactly one strict-UTF8 frame is admitted; trailing bytes after its
    newline are records that must not exist. The frame binds ipcVersion 1,
    seq 0, type exec, run/query IDs, the same live identity and the
    byte-equal query before the fixed argv exec.
    """
    gate = os.fdopen(gate_fd, "rb", closefd=True)
    try:
        raw = gate.readline(MAXFRAME + 2)
        trailing = gate.read(1)
    finally:
        gate.close()
    if trailing or len(raw) > MAXFRAME or not raw.endswith(b"\n") \
            or raw == b"\n":
        raise n.BackendError("exec-gate", "gate frame shape")
    try:
        msg = json.loads(raw[:-1].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise n.BackendError("exec-gate", f"frame {_bounded(exc, 200)}")
    ok = (_closed(msg, {"identity", "query"})
          and type(msg.get("ipcVersion")) is int
          and msg.get("ipcVersion") == 1
          and type(msg.get("seq")) is int and msg.get("seq") == 0
          and msg.get("type") == "exec" and msg.get("runId") == run_id
          and msg.get("requestId") == query_id
          and _identity(msg.get("identity")))
    if not ok:
        raise n.BackendError("exec-gate", "exec binding")
    try:
        query = json.loads(query_json)
    except json.JSONDecodeError as exc:
        raise n.BackendError("exec-gate", f"query {_bounded(exc, 200)}")
    if msg.get("query") != query:
        raise n.BackendError("exec-gate", "query mismatch")
    argv = n.lsof_argv(query)
    be = n.bind_libproc()
    own = n.bsd_row(be, os.getpid())
    if own is None or own["identity"] != msg.get("identity"):
        raise n.BackendError("exec-gate", "identity mismatch")
    os.execv(n.LSOF_PATH, argv)
    raise n.BackendError("exec-gate", "execv returned")


def main(argv):
    args = argv[1:]
    opts = {}
    i = 1
    while i < len(args):
        if (args[i].startswith("--") and i + 1 < len(args)
                and not args[i + 1].startswith("--")):
            opts[args[i][2:]] = args[i + 1]
            i += 2
        else:
            i += 1
    try:
        n = _load_native()
        if args and args[0] == "--collector":
            be = n.bind_libproc()
            col = Collector(n, be, opts.get("run-id", ""),
                            "--teardown" in args,
                            sys.stdin.buffer, sys.stdout.buffer)
            return col.run(int(opts.get("supervisor-pid", "0")))
        if args and args[0] == "--exec-gated":
            return run_exec_gate(n, opts.get("run-id", ""),
                                 opts.get("query-id", ""),
                                 int(opts.get("gate-fd", "3")),
                                 opts.get("query-json", "{}"))
    except OSError as exc:
        sys.stderr.write(f"unsupported-backend: {exc}\n")
        return 3
    except Exception as exc:
        if getattr(exc, "reason", None) is not None:
            sys.stderr.write(f"{exc.reason}: {exc.detail}\n")
        else:
            sys.stderr.write(f"internal: {exc}\n")
        return 3
    sys.stderr.write("usage: process-macos.py --collector|--exec-gated\n")
    return 64


if __name__ == "__main__":
    sys.exit(main(sys.argv))
