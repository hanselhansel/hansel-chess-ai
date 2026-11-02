// Stateless closed driver/collector/native compound field validators and
// shared predicates/constants for the supervisor protocol. No registry or
// channel factory here: identifier reservation, signal/exec/teardown
// authorization and per-channel state remain owned by
// supervisor-protocol.mjs, which passes that authority to the handlers.

import { assertProcessIdentity } from "./record-schema.mjs";
import { canonicalBytes, parseCanonicalBytes } from "./canonical-json.mjs";

const RE_H = /^[0-9a-f]{64}$/;
const RE_U64 = /^(0|[1-9][0-9]{0,19})$/;
const U32 = 4294967295;
const U64_MAX = 18446744073709551615n;

export const fail = (detail) => {
  const error = new Error(`supervisor-protocol IPC_INVALID: ${detail}`);
  error.code = "IPC_INVALID";
  throw error;
};

export const isObj = (v) => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};

export const strNE = (v) => typeof v === "string" && v.length > 0;
export const nat = (v) => Number.isSafeInteger(v) && v >= 0;
export const pos = (v) => Number.isSafeInteger(v) && v > 0;
export const isPid = (v) => Number.isSafeInteger(v) && v >= 1 && v <= 2147483647;
export const isPort = (v) => Number.isSafeInteger(v) && v >= 1 && v <= 65535;
export const isU64 = (v) =>
  typeof v === "string" && RE_U64.test(v) && BigInt(v) <= U64_MAX;
export const isH = (v) => typeof v === "string" && RE_H.test(v);

export const isIdentity = (v) => {
  try {
    assertProcessIdentity(v);
    return true;
  } catch {
    return false;
  }
};

export const isRel = (v) =>
  typeof v === "string" &&
  v.length > 0 &&
  !v.includes("\\") &&
  !v.includes("\0") &&
  !v.startsWith("/") &&
  !v.endsWith("/") &&
  !v.split("/").some((p) => p === "" || p === "." || p === "..");

// A structurally absolute resolved POSIX path: leading root, no empty,
// dot or dotdot segments, no trailing slash. Structural only — no OS
// resolution or existence check is implied here.
export const isAbs = (v) =>
  typeof v === "string" &&
  v.length > 1 &&
  v.startsWith("/") &&
  !v.endsWith("/") &&
  !v.includes("\\") &&
  !v.includes("\0") &&
  !v
    .split("/")
    .slice(1)
    .some((p) => p === "" || p === "." || p === "..");

// A recorded ArtifactRef is closed: exactly path/byteLength/sha256 with a
// confined workspace-relative path.
export const isRef = (v) =>
  isObj(v) &&
  exactFields(v, ["path", "byteLength", "sha256"]) &&
  isRel(v.path) &&
  nat(v.byteLength) &&
  isH(v.sha256);

export const isListener = (v) =>
  isObj(v) &&
  Object.keys(v).length === 2 &&
  ["127.0.0.1", "::1", "localhost"].includes(v.address) &&
  isPort(v.port);

// Canonical-byte structural equality used for every compound binding
// comparison (identities, roots, queries, abi rows).
export const eq = (a, b) => {
  try {
    return canonicalBytes(a).equals(canonicalBytes(b));
  } catch {
    return false;
  }
};

// Deep canonical copy for retained caller-supplied compound bindings so a
// later mutation of the caller's object cannot rebind an authorization.
export const copyDeep = (v) => parseCanonicalBytes(canonicalBytes(v));

export const exactFields = (msg, names) => {
  if (!isObj(msg)) return false;
  const keys = Object.keys(msg);
  return keys.length === names.length && names.every((k) => keys.includes(k));
};

export const identityKey = (i) => `${i.pid}:${i.startSec}:${i.startUsec}`;
export const unique = (items, key) => new Set(items.map(key)).size === items.length;

export const base = ["ipcVersion", "runId", "seq", "type"];
export const eventKinds = [
  "operation",
  "delivery",
  "response",
  "resource",
  "fault",
  "cleanup",
  "artifact-deletion",
];
export const phases = ["check", "parity", "preflight", "compare", "watchdog-selftest"];
export const rootKinds = [
  "supervisor",
  "collector",
  "driver",
  "browser",
  "python",
  "fixture",
  "helper",
];
export const workloadKinds = ["driver", "browser", "python", "fixture", "helper"];
export const faultReasons = [
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
];
export const ABI = { bsdInfoSize: 136, taskInfoSize: 96 };

export const isBsdRow = (v) =>
  isObj(v) &&
  exactFields(v, ["identity", "ppid", "pgid", "uid"]) &&
  isIdentity(v.identity) &&
  nat(v.ppid) &&
  v.ppid <= U32 &&
  nat(v.pgid) &&
  v.pgid <= U32 &&
  nat(v.uid) &&
  v.uid <= U32;

export const isSample = (v) =>
  isObj(v) &&
  exactFields(v, ["identity", "ppid", "pgid", "uid", "residentBytes"]) &&
  isBsdRow({ identity: v.identity, ppid: v.ppid, pgid: v.pgid, uid: v.uid }) &&
  nat(v.residentBytes);

export const isInspection = (v) =>
  isObj(v) &&
  isPid(v.pid) &&
  ((v.state === "live" &&
    exactFields(v, ["pid", "state", "process", "executable"]) &&
    isBsdRow(v.process) &&
    v.process.identity.pid === v.pid &&
    strNE(v.executable)) ||
    (v.state === "gone" && exactFields(v, ["pid", "state"])));

export const isProbeResult = (v) =>
  isObj(v) &&
  exactFields(v, ["identity", "state"]) &&
  isIdentity(v.identity) &&
  (v.state === "same-live" || v.state === "gone");

export const isQuery = (v) =>
  isObj(v) &&
  ((v.kind === "owned-pids" &&
    exactFields(v, ["kind", "pids"]) &&
    Array.isArray(v.pids) &&
    v.pids.length > 0 &&
    v.pids.every(isPid) &&
    unique(v.pids, (x) => x)) ||
    (v.kind === "port" && exactFields(v, ["kind", "port"]) && isPort(v.port)));

// Channel-state helpers shared by every handler. `need` marks the channel
// poisoned on failure so the sticky-fault invariant holds for any early
// validation throw; `envelope` checks the closed field set, ipcVersion,
// runId binding and per-direction sequence, then advances the counter.
export const poison = (st, detail) => {
  st.poisoned = true;
  fail(detail);
};

export const need = (st, cond, detail) => {
  if (!cond) poison(st, detail);
};

export const envelope = (st, direction, message, allowed, runId) => {
  need(st, exactFields(message, allowed), "fields");
  need(st, message.ipcVersion === 1, "ipcVersion");
  need(st, message.runId === runId, "runId");
  need(st, nat(message.seq) && message.seq === st.seq[direction], "seq");
  st.seq[direction] += 1;
};
