"""Stdlib suite for process-macos-native.py primitives via importlib
(matching the production frozen-sibling loader) so it runs under
`python -I -B` with fake Backend callables; no libproc is loaded.
Collector/exec-gate wire cases live in process-macos-wire.test.py.
Scaffolding lives in process_macos_test_support.py; path/discovery case
classes bind from process_macos_path_test_cases.py.
"""
import ctypes
import errno
import importlib.util
import os
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))

_S = importlib.util.spec_from_file_location(
    "process_macos_test_support",
    os.path.join(HERE, "process_macos_test_support.py"))
support = importlib.util.module_from_spec(_S)
_S.loader.exec_module(support)

load_sibling = support.load_sibling
FakeFunction = support.FakeFunction
FakeLibproc = support.FakeLibproc
make_backend = support.make_backend

N = load_sibling("process_macos_native", "process-macos-native.py")
# The ABI module identity the assertions compare against is the ONE
# the production native module itself loaded through its frozen-sibling
# loader — never a second independently exec'd copy, which would carry
# different class objects and could never prove re-export identity.
A = N._abi

IDENT = {"pid": 4242, "startSec": "1700000000", "startUsec": 123}
bsd_struct = lambda **kw: support.bsd_struct(N, **kw)
task_struct = lambda rss=123456: support.task_struct(N, rss=rss)


def fake_be(pidinfo=None, listpids=None, pidpath=None):
    return make_backend(N, pidinfo=pidinfo, listpids=listpids,
                        pidpath=pidpath)

class AbiTests(unittest.TestCase):
    def test_reexport_identity(self):
        # The core re-exports the exact ABI symbols: one class, one
        # binding, same constants. Splitting owners must not fork the
        # error class or the fixed contract.
        self.assertIs(N.BackendError, A.BackendError)
        self.assertIs(N.ipc_error, A.ipc_error)
        self.assertIs(N.bind_libproc, A.bind_libproc)
        self.assertIs(N.BsdInfo, A.BsdInfo)
        self.assertIs(N.TaskInfo, A.TaskInfo)
        self.assertIs(N.Backend, A.Backend)
        self.assertEqual(N.FAULT_REASONS, A.FAULT_REASONS)
        for name in ("PROC_UID_ONLY", "PROC_PIDTBSDINFO",
                     "PROC_PIDTASKINFO", "BSD_INFO_SIZE",
                     "TASK_INFO_SIZE", "PID_MAX", "LIBPROC_PATH",
                     "LSOF_PATH", "SIGMAP"):
            self.assertIs(getattr(N, name), getattr(A, name))

    def test_backend_error_codes(self):
        self.assertEqual(N.BackendError("permission", "x").code,
                         "ACCOUNTING_UNAVAILABLE")
        self.assertEqual(N.ipc_error("y").code, "IPC_INVALID")
        self.assertEqual(N.BackendError("bogus", "z").reason, "internal")

    def test_struct_sizes(self):
        self.assertEqual(ctypes.sizeof(N.BsdInfo), 136)
        self.assertEqual(ctypes.sizeof(N.TaskInfo), 96)

    def test_field_offsets(self):
        self.assertEqual(N.BsdInfo.pbi_pid.offset, 12)
        self.assertEqual(N.BsdInfo.pbi_ppid.offset, 16)
        self.assertEqual(N.BsdInfo.pbi_uid.offset, 20)
        self.assertEqual(N.BsdInfo.pbi_pgid.offset, 100)
        self.assertEqual(N.BsdInfo.pbi_start_tvsec.offset, 120)
        self.assertEqual(N.BsdInfo.pbi_start_tvusec.offset, 128)
        self.assertEqual(N.TaskInfo.pti_resident_size.offset, 8)

    def test_bind_size_guard(self):
        self.assertEqual(N.BSD_INFO_SIZE, ctypes.sizeof(N.BsdInfo))
        self.assertEqual(N.TASK_INFO_SIZE, ctypes.sizeof(N.TaskInfo))


class BsdRowTests(unittest.TestCase):
    def test_row_fields(self):
        be = fake_be(FakeFunction([(136, bsd_struct())]))
        row = N.bsd_row(be, 4242)
        self.assertEqual(row["identity"], IDENT)
        self.assertEqual(row["ppid"], 1)
        self.assertEqual(row["pgid"], 4242)
        self.assertEqual(row["uid"], 501)

    def test_esrch_none(self):
        be = fake_be(FakeFunction([errno.ESRCH]))
        self.assertIsNone(N.bsd_row(be, 4242))

    def test_pid_mismatch_rejected(self):
        be = fake_be(FakeFunction([(136, bsd_struct(pid=9999))]))
        with self.assertRaises(N.BackendError):
            N.bsd_row(be, 4242)

    def test_usec_bounds(self):
        be = fake_be(FakeFunction([(136, bsd_struct(usec=1000000))]))
        with self.assertRaises(N.BackendError):
            N.bsd_row(be, 4242)

    def test_short_read(self):
        be = fake_be(FakeFunction([(100, bsd_struct())]))
        with self.assertRaises(N.BackendError) as ctx:
            N.bsd_row(be, 4242)
        self.assertEqual(ctx.exception.reason, "short-read")

    def test_permission(self):
        be = fake_be(FakeFunction([errno.EPERM]))
        with self.assertRaises(N.BackendError) as ctx:
            N.bsd_row(be, 4242)
        self.assertEqual(ctx.exception.reason, "permission")

    def test_pid_bounds(self):
        for bad in (0, -1, 2147483648, "7"):
            with self.assertRaises(N.BackendError):
                N.bsd_row(fake_be(), bad)


class SampleTests(unittest.TestCase):
    def test_live_bracket(self):
        be = fake_be(FakeFunction([
            (136, bsd_struct()),
            (96, task_struct(999)),
            (136, bsd_struct()),
        ]))
        r = N.sample_process(be, IDENT)
        self.assertEqual(r["state"], "live")
        self.assertEqual(r["residentBytes"], 999)
        self.assertEqual(r["row"]["identity"], IDENT)

    def test_gone_confirmed_by_second_read(self):
        be = fake_be(FakeFunction([errno.ESRCH, errno.ESRCH]))
        r = N.sample_process(be, IDENT)
        self.assertEqual(r["state"], "gone")

    def test_tuple_change_is_gone(self):
        be = fake_be(FakeFunction([(136, bsd_struct(sec=1800000000)), errno.ESRCH]))
        r = N.sample_process(be, IDENT)
        self.assertEqual(r["state"], "gone")

    def test_reappear_is_unstable(self):
        be = fake_be(FakeFunction([errno.ESRCH, (136, bsd_struct())]))
        with self.assertRaises(N.BackendError) as ctx:
            N.sample_process(be, IDENT)
        self.assertEqual(ctx.exception.reason, "unstable-identity")

    def test_uid_change_unstable(self):
        be = fake_be(FakeFunction([
            (136, bsd_struct()),
            (96, task_struct()),
            (136, bsd_struct(uid=502)),
        ]))
        with self.assertRaises(N.BackendError):
            N.sample_process(be, IDENT)


class ProbeSignalTests(unittest.TestCase):
    def test_probe_same_live(self):
        be = fake_be(FakeFunction([(136, bsd_struct())]))
        self.assertEqual(N.probe_identity(be, IDENT), "same-live")

    def test_probe_gone(self):
        be = fake_be(FakeFunction([errno.ESRCH, errno.ESRCH]))
        self.assertEqual(N.probe_identity(be, IDENT), "gone")

    def test_signal_fresh_check_then_kill(self):
        be = fake_be(FakeFunction([(136, bsd_struct())]))
        with mock.patch.object(N.os, "kill") as k:
            self.assertEqual(N.signal_identity(be, IDENT, "TERM"), "sent")
            k.assert_called_once_with(4242, 15)

    def test_signal_identity_changed(self):
        be = fake_be(FakeFunction([(136, bsd_struct(sec=1))]))
        with mock.patch.object(N.os, "kill") as k:
            self.assertEqual(N.signal_identity(be, IDENT, "KILL"), "identity-changed")
            k.assert_not_called()

    def test_signal_gone(self):
        # The first ESRCH triggers the repeated-read _confirm_gone
        # boundary, so the fake backend must supply both entries.
        be = fake_be(FakeFunction([errno.ESRCH, errno.ESRCH]))
        self.assertEqual(N.signal_identity(be, IDENT, "KILL"), "gone")


class ListDiscoverTests(unittest.TestCase):
    def test_listpids_full_buffer_retry(self):
        calls = []

        def listpids(flavor, uid, arr, nbytes):
            calls.append(nbytes)
            if len(calls) == 1:
                return nbytes  # full buffer -> retry
            arr[0] = 5
            arr[1] = 9
            return 8

        be = fake_be(listpids=listpids)
        self.assertEqual(N.list_process_pids(be, capacity=64), [5, 9])
        self.assertGreater(calls[1], calls[0])

    def test_discover_uid_mismatch(self):
        def listpids(flavor, uid, arr, nbytes):
            arr[0] = 4242
            return 4

        be = fake_be(FakeFunction([(136, bsd_struct(uid=os.getuid() + 1))]),
                     listpids=listpids)
        with self.assertRaises(N.BackendError) as ctx:
            N.discover(be)
        self.assertEqual(ctx.exception.reason, "uid-mismatch")


class LsofArgvTests(unittest.TestCase):
    def test_owned_pids_argv(self):
        argv = N.lsof_argv({"kind": "owned-pids", "pids": [9, 5]})
        self.assertEqual(
            argv,
            ["/usr/sbin/lsof", "-nP", "-a", "-p", "9,5",
             "-iTCP", "-sTCP:LISTEN", "-F0pn"],
        )

    def test_port_argv(self):
        argv = N.lsof_argv({"kind": "port", "port": 8080})
        self.assertEqual(
            argv,
            ["/usr/sbin/lsof", "-nP", "-a", "-iTCP:8080",
             "-sTCP:LISTEN", "-F0pn"],
        )

    def test_rejections(self):
        for q in ({"kind": "owned-pids", "pids": []},
                  {"kind": "owned-pids", "pids": [1, 1]},
                  {"kind": "port", "port": 0},
                  {"kind": "other"}):
            with self.assertRaises(N.BackendError):
                N.lsof_argv(q)


class BindLibprocTests(unittest.TestCase):
    # T01: the lazy binder against a MOCKED CDLL — never real libproc.

    def test_exact_signatures_and_symbols(self):
        lib = FakeLibproc()
        with mock.patch.object(A.ctypes, "CDLL", return_value=lib):
            be = A.bind_libproc()
        self.assertEqual(be.listpids.restype, ctypes.c_int)
        self.assertEqual(
            be.listpids.argtypes,
            [A.U32, A.U32, ctypes.c_void_p, ctypes.c_int])
        self.assertEqual(be.pidinfo.restype, ctypes.c_int)
        self.assertEqual(
            be.pidinfo.argtypes,
            [ctypes.c_int, ctypes.c_int, A.U64,
             ctypes.c_void_p, ctypes.c_int])
        self.assertEqual(be.pidpath.restype, ctypes.c_int)
        self.assertEqual(
            be.pidpath.argtypes,
            [ctypes.c_int, ctypes.c_void_p, A.U32])
        self.assertIsInstance(be, A.Backend)

    def test_missing_symbol_is_bounded_fault(self):
        lib = FakeLibproc(missing="proc_pidpath")
        with mock.patch.object(A.ctypes, "CDLL", return_value=lib):
            with self.assertRaises(N.BackendError) as ctx:
                A.bind_libproc()
        self.assertEqual(ctx.exception.reason, "symbol-missing")

    def test_cdll_failure_is_unsupported(self):
        with mock.patch.object(
                A.ctypes, "CDLL", side_effect=OSError("no lib")):
            with self.assertRaises(N.BackendError) as ctx:
                A.bind_libproc()
        self.assertEqual(ctx.exception.reason, "unsupported-backend")


class ListBoundaryTests(unittest.TestCase):
    def test_persistent_full_buffer_rejected(self):
        # A buffer that never settles below capacity exhausts retries.
        def lp(flavor, uid, arr, nbytes):
            return nbytes

        be = fake_be(listpids=lp)
        with self.assertRaises(N.BackendError) as ctx:
            N.list_process_pids(be)
        self.assertEqual(ctx.exception.reason, "unstable-list")

    def test_short_taskinfo_rejected(self):
        be = fake_be(FakeFunction([
            (136, bsd_struct()),
            (20, task_struct()),
        ]))
        with self.assertRaises(N.BackendError) as ctx:
            N.sample_process(be, IDENT)
        self.assertEqual(ctx.exception.reason, "short-read")


# The WHOLE PidPathTests class lives in the test-only companion and
# is bound here for discovery under the same -I -B command.
_P = load_sibling("process_macos_path_test_cases",
                  "process_macos_path_test_cases.py")
PidPathTests = _P.make_pid_path_cases(N, fake_be)
DiscoverStabilityTests = _P.make_discover_stability_cases(N, fake_be, bsd_struct)


class StartSecBoundaryTests(unittest.TestCase):
    def test_uint64_max_identity_survives(self):
        sec = 2 ** 64 - 1
        be = fake_be(FakeFunction([(136, bsd_struct(sec=sec))]))
        row = N.bsd_row(be, 4242)
        self.assertEqual(row["identity"]["startSec"], str(sec))

    def test_usec_top_accepted(self):
        # Closed identity microseconds are INTEGER usec; only seconds
        # stay canonical uint64 strings.
        be = fake_be(FakeFunction([(136, bsd_struct(usec=999999))]))
        row = N.bsd_row(be, 4242)
        self.assertEqual(row["identity"]["startUsec"], 999999)




if __name__ == "__main__":
    unittest.main()
