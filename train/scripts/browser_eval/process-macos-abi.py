"""Shared Darwin/arm64 native ABI layer for the supervisor helper.

Owns every fixed constant, the fault taxonomy and BackendError, the
explicit field-by-field proc_bsdinfo/proc_taskinfo ctypes declarations,
the Backend callable record, platform/size/offset checks and the lazy
fixed libproc symbol/signature binding. Loaded only by
process-macos-native.py through an explicit same-directory spec import;
never through sys.path, PYTHONPATH or an installed fallback. Importing
this module declares structures and constants only: it loads no CDLL,
spawns nothing and enters no loop. Stdlib only; no model, browser or
network imports.
"""
import ctypes
import platform
import sys
from collections import namedtuple

# proc_listpids flavor: list only processes owned by the supplied UID.
PROC_UID_ONLY = 4
# proc_pidinfo flavors.
PROC_PIDTBSDINFO = 3
PROC_PIDTASKINFO = 4
# Frozen Darwin ABI sizes asserted before any call.
BSD_INFO_SIZE = 136
TASK_INFO_SIZE = 96
PID_MAX = 2147483647
LIBPROC_PATH = "/usr/lib/libproc.dylib"
LSOF_PATH = "/usr/sbin/lsof"
SIGMAP = {"TERM": 15, "KILL": 9}

FAULT_REASONS = (
    "unsupported-backend",
    "abi-mismatch",
    "symbol-missing",
    "short-read",
    "permission",
    "unstable-list",
    "unstable-identity",
    "uid-mismatch",
    "unclassifiable-process",
    "sample-stale",
    "root-invalid",
    "exec-gate",
    "internal",
)

U32 = ctypes.c_uint32
U64 = ctypes.c_uint64
I32 = ctypes.c_int32
Backend = namedtuple("Backend", "listpids pidinfo pidpath")


class BackendError(Exception):
    """One bounded fault reason plus a wire code.

    ipc=True marks a protocol/IPC violation (IPC_INVALID); every native
    or backend failure stays ACCOUNTING_UNAVAILABLE.
    """

    def __init__(self, reason, detail, ipc=False):
        if reason not in FAULT_REASONS:
            reason = "internal"
        super().__init__(f"{reason}: {detail}")
        self.reason = reason
        self.detail = str(detail)[:2048]
        self.code = "IPC_INVALID" if ipc else "ACCOUNTING_UNAVAILABLE"


def ipc_error(detail):
    """Build an IPC_INVALID BackendError for malformed wire traffic."""
    return BackendError("internal", detail, ipc=True)


class BsdInfo(ctypes.Structure):
    """proc_bsdinfo, exactly 136 bytes on Darwin arm64."""

    _fields_ = [
        ("pbi_flags", U32),
        ("pbi_status", U32),
        ("pbi_xstatus", U32),
        ("pbi_pid", U32),
        ("pbi_ppid", U32),
        ("pbi_uid", U32),
        ("pbi_gid", U32),
        ("pbi_ruid", U32),
        ("pbi_rgid", U32),
        ("pbi_svuid", U32),
        ("pbi_svgid", U32),
        ("pbi_rfu_1", U32),
        ("pbi_comm", ctypes.c_char * 16),
        ("pbi_name", ctypes.c_char * 32),
        ("pbi_nfiles", U32),
        ("pbi_pgid", U32),
        ("pbi_pjobc", U32),
        ("e_tdev", U32),
        ("e_tpgid", U32),
        ("pbi_nice", I32),
        ("pbi_start_tvsec", U64),
        ("pbi_start_tvusec", U64),
    ]


class TaskInfo(ctypes.Structure):
    """proc_taskinfo, exactly 96 bytes on Darwin arm64."""

    _fields_ = [
        ("pti_virtual_size", U64),
        ("pti_resident_size", U64),
        ("pti_total_user", U64),
        ("pti_total_system", U64),
        ("pti_threads_user", U64),
        ("pti_threads_system", U64),
        ("pti_policy", I32),
        ("pti_faults", I32),
        ("pti_pageins", I32),
        ("pti_cow_faults", I32),
        ("pti_messages_sent", I32),
        ("pti_messages_received", I32),
        ("pti_syscalls_mach", I32),
        ("pti_syscalls_unix", I32),
        ("pti_csw", I32),
        ("pti_threadnum", I32),
        ("pti_numrunning", I32),
        ("pti_priority", I32),
    ]


def bind_libproc(path=LIBPROC_PATH):
    """Assert platform/ABI, load libproc, bind the three symbols lazily.

    The backend runs only on Darwin arm64 with the frozen 136/96 layout.
    The fixed libproc path is loaded once here at call time, never at
    import; a missing symbol or an unexpected signature is a bounded
    unsupported-backend fault, not a fallback.
    """
    if sys.platform != "darwin" or platform.machine() != "arm64":
        raise BackendError(
            "unsupported-backend",
            f"{sys.platform} {platform.machine()}")
    if ctypes.sizeof(BsdInfo) != BSD_INFO_SIZE:
        raise BackendError(
            "abi-mismatch",
            f"bsdinfo {ctypes.sizeof(BsdInfo)}")
    if ctypes.sizeof(TaskInfo) != TASK_INFO_SIZE:
        raise BackendError(
            "abi-mismatch",
            f"taskinfo {ctypes.sizeof(TaskInfo)}")
    try:
        lib = ctypes.CDLL(path, use_errno=True)
        fns = (lib.proc_listpids, lib.proc_pidinfo, lib.proc_pidpath)
    except OSError as exc:
        raise BackendError("unsupported-backend", str(exc))
    except AttributeError as exc:
        raise BackendError("symbol-missing", str(exc))
    listpids, pidinfo, pidpath = fns
    listpids.restype = ctypes.c_int
    listpids.argtypes = [U32, U32, ctypes.c_void_p, ctypes.c_int]
    pidinfo.restype = ctypes.c_int
    pidinfo.argtypes = [
        ctypes.c_int, ctypes.c_int, U64, ctypes.c_void_p, ctypes.c_int,
    ]
    pidpath.restype = ctypes.c_int
    pidpath.argtypes = [ctypes.c_int, ctypes.c_void_p, U32]
    return Backend(listpids, pidinfo, pidpath)
