// Whole existing inspection helper group. Same borrowed callbacks/handles.
import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import { copyDeep, eq, isIdentity, isObj } from "./protocol-values.mjs";
const acct = (detail) =>
  Object.assign(new Error(`ACCOUNTING_UNAVAILABLE ${detail}`), { code: "ACCOUNTING_UNAVAILABLE" });

// The shared inspectPids wire wrapper, housed here under the approved
// existing-owner move in the diagnostic-repair decision (22) to keep
// process-proof.mjs under the readable cap: ONE bounded sample request
// carrying the unresolved/live owned partition at EVERY issue (only
// Node-admitted terminal exacttuples omitted), plus
// inspectPids through the caller's transport-bound send and request
// allocator on the borrowed handle, returning reply.inspected. It
// performs no validation, IO, state, timer, registry, scheduler or
// clock authority of its own; the caller classifies the returned rows
// and all transport/validator guards stay exactly as they were.
export const readProcessInspections = (
  pids,
  handle,
  { send, nextRid, getOwnedIdentities, assertNoTerminalReappearance = () => {} },
) => {
  if (typeof assertNoTerminalReappearance !== "function") throw acct("terminal binding");
  return send(
    "sample",
    { owned: getOwnedIdentities(), inspectPids: pids, probes: [] },
    nextRid("inspect"),
    handle,
  ).then((r) => {
    assertNoTerminalReappearance(r);
    return r.inspected;
  });
};

// The helper-only readiness read (corrective 79): ONE first same-handle
// inspection shared by every registration — a non-"helper" row or a row
// already at the expected image returns immediately with no Python FS
// resolution at all. Only a pending helper whose expectedExecutable
// equals the deterministic derived process image AND whose resolved
// launcher differs — and whose first row is live EXACT-launcher with
// the supplied non-null UID and this supervisor's PPID — qualifies for
// the bounded wait: fresh same-handle inspections of ONLY this pid,
// assertLive on the ORIGINAL handle before every read and immediately
// after each return, the first row's full tuple/UID/PPID held in a
// private copy across the awaits. A gone/unavailable/reused or
// UID-or-PPID change fails ACCOUNTING_UNAVAILABLE, a third image fails
// instead of retrying, and a launcher row is NEVER returned as
// readiness proof — only the exact payload row returns, with every
// caller-side proof fence and the roots-accepted ack still ahead. No
// sleep, tick, budget, clock, queue, registry or owner of its own.
export const readHelperReadyInspection = async (
  { pid, kind, expectedExecutable, pythonExecutable, resolvePath, uid, inspect },
  handle,
) => {
  handle.assertLive("helper register read");
  const first = (await inspect([pid], handle)).find((x) => x.pid === pid);
  handle.assertLive("helper register read");
  if (kind !== "helper" || first === undefined || first.executable === expectedExecutable) {
    return first;
  }
  const payload = resolvePythonProcessImage(pythonExecutable, {
    resolvePath,
  });
  const launcher = resolvePath(pythonExecutable);
  if (
    expectedExecutable !== payload ||
    launcher === payload ||
    first.state !== "live" ||
    first.executable !== launcher ||
    uid === null ||
    first.process.uid !== uid ||
    first.process.ppid !== process.pid
  ) {
    return first;
  }
  const ident = copyDeep(first.process.identity);
  const firstUid = first.process.uid;
  const firstPpid = first.process.ppid;
  for (;;) {
    handle.assertLive("helper ready read");
    const cur = (await inspect([pid], handle)).find((x) => x.pid === pid);
    handle.assertLive("helper ready read");
    if (
      cur === undefined ||
      cur.state !== "live" ||
      !eq(cur.process.identity, ident) ||
      cur.process.uid !== firstUid ||
      cur.process.ppid !== firstPpid
    ) {
      throw acct("helper readiness");
    }
    if (cur.executable === payload) return cur;
    if (cur.executable !== launcher) throw acct("helper readiness image");
  }
};

// The live-workload PID classifier (corrective 81): ONE fresh
// same-handle inspection over the PID set of an EXACT captured
// full-tuple snapshot — the identities are privately copied before any
// await, filtered ONLY by the admitted-terminal reader, then deduplicated
// by PID (two retained birth tuples can share
// one PID), an empty snapshot returns [] with NO native issue at all.
// For each captured identity the fresh row must be present and
// well-formed: a missing/unavailable/malformed row or a UID that
// differs from the supplied uid fails ACCOUNTING_UNAVAILABLE and is
// never claimed gone. Only a NATIVE gone row — or a live row on the
// same PID carrying a DIFFERENT full start tuple — skips the old
// identity (the old tuple is gone; the retained cache is never
// evicted). A live row on the same full tuple with the same uid
// contributes its PID once. assertLive runs on the ORIGINAL borrowed
// handle before the single inspect and immediately after it. No FS,
// clock, queue, cache, registry or ownership authority of its own.
export const readLiveWorkloadPids = async (
  identities,
  handle,
  { inspect, uid, isTerminalIdentity = () => false },
) => {
  if (!Array.isArray(identities)) throw acct("workload identities");
  const wanted = copyDeep(identities);
  if (wanted.length === 0) return [];
  if (!wanted.every(isIdentity) || !Number.isSafeInteger(uid)) {
    throw acct("workload identities");
  }
  if (typeof isTerminalIdentity !== "function") throw acct("terminal binding");
  const unresolved = wanted.filter((i) => !isTerminalIdentity(i));
  const pids = [...new Set(unresolved.map((i) => i.pid))];
  handle.assertLive("workload live read");
  if (pids.length === 0) return [];
  const rows = await inspect(pids, handle);
  handle.assertLive("workload live read");
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const live = [];
  for (const ident of unresolved) {
    const ins = byPid.get(ident.pid);
    if (ins === undefined) throw acct("workload inspection");
    if (ins.state === "gone") continue;
    const proc = ins.process;
    if (ins.state !== "live" || !isObj(proc) || !isIdentity(proc.identity)) {
      throw acct("workload inspection");
    }
    if (proc.uid !== uid) throw acct("workload uid");
    if (eq(proc.identity, ident)) live.push(ident.pid);
  }
  return [...new Set(live)];
};
