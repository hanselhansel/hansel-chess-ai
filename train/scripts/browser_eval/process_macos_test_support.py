"""TEST-ONLY scaffolding for process-macos.test.py.

Moved whole from that suite under the observing-unit repair decision
(25): the sibling loader, the scripted fake Native callables and the
fake libproc library used by the mocked-CDLL binder cases. No assert,
test discovery, real CDLL/libproc/os.kill/process or import side
effect; excluded from the runtime union and BackendIdentity.helpers.
The guarded __main__ --project-discovery branch is the ONLY CLI mode:
a bounded stdin->stdout pure projection for differential TEST use —
no libproc/process-probe/model calls, while loading the fixed sibling
definitions is ordinary file IO; importing stays effect-free.
"""
import ctypes
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load_sibling(name, filename):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(HERE, filename))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeFunction:
    """Fake proc_* callable returning queued buffers or errno codes."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = []

    def __call__(self, pid, flavor, arg, bufp, size):
        self.calls.append((pid, flavor, size))
        item = self.script.pop(0)
        if isinstance(item, int):  # emulate native error: negative rc
            ctypes.set_errno(item)
            return -1
        if isinstance(item, tuple):  # (rc, struct)
            rc, struct = item
            ctypes.memmove(bufp, ctypes.byref(struct),
                           min(size, ctypes.sizeof(struct)))
            ctypes.set_errno(0)
            return rc
        ctypes.memmove(bufp, ctypes.byref(item), ctypes.sizeof(item))
        ctypes.set_errno(0)
        return size


class FakeLibproc:
    """Fake CDLL handle for bind_libproc: three proc_* attributes that
    accept restype/argtypes assignment, optionally missing one."""

    def __init__(self, missing=None):
        if missing != "proc_listpids":
            self.proc_listpids = lambda *a: 0
        if missing != "proc_pidinfo":
            self.proc_pidinfo = FakeFunction([])
        if missing != "proc_pidpath":
            self.proc_pidpath = lambda *a: 0


def make_backend(native, pidinfo=None, listpids=None, pidpath=None):
    return native.Backend(
        listpids or (lambda *a: 0),
        pidinfo or FakeFunction([]),
        pidpath or (lambda *a: 0),
    )


def bsd_struct(native, pid=4242, ppid=1, uid=501, pgid=4242,
               sec=1700000000, usec=123):
    b = native.BsdInfo()
    b.pbi_pid = pid
    b.pbi_ppid = ppid
    b.pbi_uid = uid
    b.pbi_pgid = pgid
    b.pbi_start_tvsec = sec
    b.pbi_start_tvusec = usec
    return b


def task_struct(native, rss=123456):
    t = native.TaskInfo()
    t.pti_resident_size = rss
    return t


# TEST-ONLY CLI bridge: the sole guarded mode drives the ACTUAL pure
# N.project_discovery through a bounded JSON pipe so Node ownership
# tests compare identical inputs. The native core is loaded for
# definitions only (never bind_libproc/CDLL/OS calls); this is not a
# fourth runtime helper and imports above remain effect-free.
if __name__ == "__main__":
    import json
    import sys

    if sys.argv[1:] != ["--project-discovery"]:
        sys.stderr.write(
            "usage: process_macos_test_support.py --project-discovery\n")
        sys.exit(64)
    raw = sys.stdin.buffer.read(65537)
    if len(raw) > 65536:
        sys.stderr.write("input over 65536 bytes\n")
        sys.exit(2)
    msg = json.loads(raw.decode("utf-8"))
    if not isinstance(msg, dict) or set(msg) != {"rows", "owned", "roots"}:
        sys.stderr.write("input must be exactly {rows, owned, roots}\n")
        sys.exit(2)
    _N = load_sibling("process_macos_native", "process-macos-native.py")
    sys.stdout.write(
        json.dumps(
            _N.project_discovery(msg["rows"], msg["owned"], msg["roots"]))
        + "\n")
