"""Lazy ctypes libproc core for the Darwin/arm64 native supervisor.

Owns every bounded PID/read/path/RSS/identity/probe/signal/UID-discovery
primitive and the fixed lsof argv validation used by process-macos.py.
The shared constants, fault taxonomy, explicit BsdInfo/TaskInfo ctypes
declarations and the lazy libproc binding live in process-macos-abi.py,
loaded explicitly from the frozen sibling path below so no import ever
resolves through sys.path, PYTHONPATH or an installed fallback. All ABI
names are re-exported here unchanged so existing callers keep one API.
Importing this module declares functions and constants only: it loads
no CDLL, spawns nothing and enters no loop. Stdlib only.
"""
import ctypes
import errno
import importlib.util
import os

_ABI_SIBLING = "process-macos-abi.py"


def _load_abi():
    """Load the frozen ABI sibling explicitly; no path fallback."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, _ABI_SIBLING)
    spec = importlib.util.spec_from_file_location(
        "process_macos_abi", path)
    if spec is None or spec.loader is None:
        raise OSError(f"{_ABI_SIBLING} missing at {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_abi = _load_abi()

# Re-exported ABI surface: the exact same class/functions/names the
# single-file core published, so accepted callers and tests keep one API.
BackendError = _abi.BackendError
ipc_error = _abi.ipc_error
bind_libproc = _abi.bind_libproc
Backend = _abi.Backend
BsdInfo = _abi.BsdInfo
TaskInfo = _abi.TaskInfo
PROC_UID_ONLY = _abi.PROC_UID_ONLY
PROC_PIDTBSDINFO = _abi.PROC_PIDTBSDINFO
PROC_PIDTASKINFO = _abi.PROC_PIDTASKINFO
BSD_INFO_SIZE = _abi.BSD_INFO_SIZE
TASK_INFO_SIZE = _abi.TASK_INFO_SIZE
PID_MAX = _abi.PID_MAX
LIBPROC_PATH = _abi.LIBPROC_PATH
LSOF_PATH = _abi.LSOF_PATH
SIGMAP = _abi.SIGMAP
FAULT_REASONS = _abi.FAULT_REASONS


def _checked_pid(pid):
    """Range-check a PID before it reaches a c_int or os.kill."""
    if type(pid) is not int or pid < 1 or pid > PID_MAX:
        raise BackendError("root-invalid", f"pid {pid!r} out of bounds")
    return pid


def _call_error(name, pid, n, e):
    """Normalize one native return value plus errno into a bounded fault."""
    if n <= 0 and e in (errno.EPERM, errno.EACCES):
        return BackendError("permission", f"{name} {pid} errno {e}")
    if n <= 0:
        return BackendError("unclassifiable-process",
                            f"{name} {pid} rc {n} errno {e}")
    return BackendError("short-read", f"{name} {pid} rc {n}")


def _read(be, name, pid, flavor, buftype, size):
    """One proc_pidinfo read into buftype. Returns None on ESRCH."""
    _checked_pid(pid)
    buf = buftype()
    ctypes.set_errno(0)
    n = be.pidinfo(pid, flavor, 0, ctypes.byref(buf), size)
    if n != size:
        e = ctypes.get_errno()
        if n <= 0 and e == errno.ESRCH:
            return None
        raise _call_error(name, pid, n, e)
    return buf


def bsd_row(be, pid):
    """One BSD read -> full-tuple row dict, or None on ESRCH."""
    buf = _read(be, "pidinfo-bsd", pid, PROC_PIDTBSDINFO,
                BsdInfo, BSD_INFO_SIZE)
    if buf is None:
        return None
    if buf.pbi_pid != pid or buf.pbi_start_tvusec > 999999:
        raise BackendError(
            "unstable-identity",
            f"bsd {buf.pbi_pid} usec {buf.pbi_start_tvusec}")
    return {
        "identity": {
            "pid": pid,
            "startSec": str(buf.pbi_start_tvsec),
            "startUsec": int(buf.pbi_start_tvusec),
        },
        "ppid": int(buf.pbi_ppid),
        "pgid": int(buf.pbi_pgid),
        "uid": int(buf.pbi_uid),
    }


def resident_bytes(be, pid):
    """proc_pidinfo TASKINFO resident bytes, or None on ESRCH."""
    buf = _read(be, "pidinfo-task", pid, PROC_PIDTASKINFO,
                TaskInfo, TASK_INFO_SIZE)
    return None if buf is None else int(buf.pti_resident_size)


def pid_path(be, pid):
    """proc_pidpath absolute executable path, or None on ESRCH.

    Apple returns strlen(buffer): n path bytes excluding the NUL. The
    count must satisfy 0 < n < capacity, all n payload bytes must be
    non-NUL and the byte at offset n must be the NUL terminator; the
    decoded [:n] path must be absolute. A reused-PID path for a
    different tuple is never bound: callers pair this with a bracketed
    BSD read through inspect_process.
    """
    _checked_pid(pid)
    buf = ctypes.create_string_buffer(4096)
    ctypes.set_errno(0)
    n = be.pidpath(pid, buf, len(buf))
    if n <= 0:
        e = ctypes.get_errno()
        if e == errno.ESRCH:
            return None
        raise _call_error("pidpath", pid, n, e)
    if n >= len(buf):
        raise BackendError("short-read", f"pidpath {pid} rc {n}")
    raw = bytes(buf.raw[:n])
    if b"\x00" in raw or buf.raw[n] != 0:
        raise BackendError("unclassifiable-process",
                           f"pidpath {pid} unterminated")
    # Path bytes must decode strictly as UTF-8: surrogateescape would
    # smuggle malformed collector paths into the evidence tuple.
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise BackendError("unclassifiable-process",
                           f"pidpath {pid} not utf-8")
    if not text.startswith("/"):
        raise BackendError("unclassifiable-process",
                           f"pidpath {pid} not absolute")
    return text


def _confirm_gone(be, identity, pid):
    """Re-read once: the old tuple must not reappear to report gone."""
    row = bsd_row(be, pid)
    if row is None or row["identity"] != identity:
        return True
    raise BackendError("unstable-identity", f"tuple reappeared {pid}")


def _gone_or_unstable(be, identity, pid):
    """Confirm disappearance: a repeated read must not return the tuple."""
    again = bsd_row(be, pid)
    if again is None or again["identity"] != identity:
        return {"state": "gone"}
    raise BackendError("unstable-identity", f"tuple reappeared {pid}")


def sample_process(be, identity):
    """Bracketed BSD -> TASKINFO -> BSD sample for one owned identity."""
    pid = identity["pid"]
    first = bsd_row(be, pid)
    if first is None or first["identity"] != identity:
        return _gone_or_unstable(be, identity, pid)
    rss = resident_bytes(be, pid)
    if rss is None:
        return _gone_or_unstable(be, identity, pid)
    last = bsd_row(be, pid)
    if last is None or last["identity"] != identity:
        return _gone_or_unstable(be, identity, pid)
    if last["uid"] != first["uid"]:
        raise BackendError("unstable-identity", f"uid changed {pid}")
    row = dict(last)
    row["identity"] = first["identity"]
    return {"state": "live", "row": row, "residentBytes": rss}


def inspect_process(be, pid):
    """Bracketed BSD -> pid_path -> BSD root proof for one PID.

    A path read between two matching-tuple BSD reads binds the absolute
    executable to that exact tuple. Every ESRCH boundary performs the
    repeated old-tuple-gone confirmation; a reappearing tuple is
    unstable, never gone.
    """
    pid = _checked_pid(pid)
    first = bsd_row(be, pid)
    if first is None:
        if bsd_row(be, pid) is None:
            return {"state": "gone"}
        raise BackendError("unstable-identity", f"pid {pid} reappeared")
    ident = first["identity"]
    path = pid_path(be, pid)
    if path is None:
        if _confirm_gone(be, ident, pid):
            return {"state": "gone"}
    last = bsd_row(be, pid)
    if last is None or last["identity"] != ident:
        if _confirm_gone(be, ident, pid):
            return {"state": "gone"}
    return {"state": "live", "process": first, "executable": path}


def probe_identity(be, identity):
    """same-live on a fresh exact tuple; confirmed absent only -> gone."""
    pid = _checked_pid(identity["pid"])
    row = bsd_row(be, pid)
    if row is not None:
        return "same-live" if row["identity"] == identity else "gone"
    if bsd_row(be, pid) is None:
        return "gone"
    return _gone_or_unstable(be, identity, pid)["state"]


def signal_identity(be, identity, signame):
    """Fresh tuple check immediately before os.kill; never a stale signal."""
    signo = SIGMAP.get(signame)
    if signo is None:
        raise BackendError("internal", f"signal {signame!r}")
    pid = _checked_pid(identity["pid"])
    row = bsd_row(be, pid)
    if row is None and _confirm_gone(be, identity, pid):
        return "gone"
    if row["identity"] != identity:
        return "identity-changed"
    try:
        os.kill(pid, signo)
    except ProcessLookupError:
        if _confirm_gone(be, identity, pid):
            return "gone"
    except PermissionError as exc:
        raise BackendError("permission", f"kill {pid} {exc}")
    return "sent"


def list_process_pids(be, capacity=4096):
    """proc_listpids for the caller's UID with full-buffer retry.

    A zero-or-error return, a byte count not aligned to sizeof(pid_t),
    an out-of-range entry or a duplicate PID is rejected outright: the
    complete current-UID list must be well-formed before any BSD row
    read consumes it.
    """
    uid = os.getuid()
    nbuf = max(16, int(capacity))
    for _ in range(4):
        arr = (ctypes.c_int * nbuf)()
        ctypes.set_errno(0)
        n = be.listpids(PROC_UID_ONLY, uid, arr, ctypes.sizeof(arr))
        if n < 0:
            raise _call_error("listpids", uid, n, ctypes.get_errno())
        if n == 0 and ctypes.get_errno() != 0:
            raise _call_error("listpids", uid, n, ctypes.get_errno())
        if n == 0:
            raise BackendError("unstable-list", "empty pid list")
        if n % 4 != 0:
            raise BackendError("unstable-list", f"unaligned bytes {n}")
        if n >= ctypes.sizeof(arr):
            nbuf *= 2
            continue
        pids = [int(p) for p in arr[: n // 4]]
        if any(p < 1 or p > PID_MAX for p in pids):
            raise BackendError("unstable-list", "pid out of range")
        if len(set(pids)) != len(pids):
            raise BackendError("unstable-list", "duplicate pid")
        return pids
    raise BackendError("unstable-list", "pid buffer never settled")


def discover(be):
    """Complete current-UID BSD census, with one permission revalidation.

    A first BSD permission failure discards ALL partial rows and restarts
    the complete validated UID vector once. No row is skipped on denial;
    every second failure is fatal. List/UID/other BSD errors never restart.
    The caller's original sample start covers both attempts, without sleep
    or a fresh clock/budget. Owned tuple/RSS reads remain separate duties.
    """
    uid = os.getuid()
    first = None
    for attempt in range(2):
        try:
            pids = list_process_pids(be)
            rows = []
            for pid in pids:
                try:
                    row = bsd_row(be, pid)
                except BackendError as exc:
                    if attempt == 0 and exc.reason == "permission":
                        first = exc
                        break
                    raise
                if row is not None:
                    if row["uid"] != uid:
                        raise BackendError("uid-mismatch",
                                           f"pid {pid} uid {row['uid']}")
                    rows.append(row)
            else:
                return rows
        except BackendError as exc:
            if first is not None:
                raise BackendError(
                    exc.reason, f"{first.detail}; revalidation {exc.reason}: {exc.detail}",
                    ipc=exc.code == "IPC_INVALID") from exc
            raise


def project_discovery(rows, owned, roots):
    """Conservative DATA-ONLY superset of a validated row snapshot.

    `rows` is the COMPLETE current-UID discover() output. Seeds are only
    current rows whose FULL (pid,startSec,startUsec) tuple equals a
    requested owned identity or a registered root identity, widened by
    each seed's PGID plus every registered root PID as candidate PGIDs —
    deliberately across ALL roles — then closed transitively over PPID
    descendants inside the same snapshot. Ambient or reused rows this
    may add are data only: JS ownership remains the sole authority for
    scope/ambient-group/PID-reuse decisions, and the upstream full-UID
    validation is unchanged. Pure lists/dicts/sets; no OS or IO work.
    """
    key = lambda i: (i["pid"], i["startSec"], i["startUsec"])
    wanted = {key(i) for i in owned} | {key(r["identity"]) for r in roots}
    seeds = [r for r in rows if key(r["identity"]) in wanted]
    inc = {key(r["identity"]) for r in seeds}
    pgids = {r["pgid"] for r in seeds} | {r["identity"]["pid"] for r in roots}
    inc |= {key(r["identity"]) for r in rows if r["pgid"] in pgids}
    children = {}
    for r in rows:
        children.setdefault(r["ppid"], []).append(r)
    work = [r for r in rows if key(r["identity"]) in inc]
    seen = {r["identity"]["pid"] for r in work}
    while work:
        parent = work.pop()
        for c in children.get(parent["identity"]["pid"], ()):
            if c["identity"]["pid"] not in seen:
                seen.add(c["identity"]["pid"])
                work.append(c)
                inc.add(key(c["identity"]))
    # Original row objects/fields, returned in the snapshot's own order.
    return [r for r in rows if key(r["identity"]) in inc]


def lsof_argv(query):
    """The only argv the gated wrapper may exec. Fixed flags, no shell."""
    if not isinstance(query, dict):
        raise BackendError("exec-gate", "query not object")
    if query.get("kind") == "owned-pids":
        pids = query.get("pids")
        ok = (isinstance(pids, list) and pids
              and len(set(pids)) == len(pids)
              and all(type(p) is int and 1 <= p <= PID_MAX for p in pids))
        if not ok:
            raise BackendError("exec-gate", "owned-pids fields")
        return [LSOF_PATH, "-nP", "-a", "-p", ",".join(str(p) for p in pids),
                "-iTCP", "-sTCP:LISTEN", "-F0pn"]
    if query.get("kind") == "port":
        port = query.get("port")
        if type(port) is not int or port < 1 or port > 65535:
            raise BackendError("exec-gate", "port field")
        return [LSOF_PATH, "-nP", "-a", f"-iTCP:{port}", "-sTCP:LISTEN",
                "-F0pn"]
    raise BackendError("exec-gate", "query kind")
