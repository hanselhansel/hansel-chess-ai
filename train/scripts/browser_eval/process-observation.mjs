import { accountingTrace } from "./accounting-trace.mjs";
// process-observation.mjs owns the fixed-point RSS observation owner
// extracted from processes.mjs under the budget/observation split
// decision: the complete bounded coverage cycle, the native-duration
// and supervisor completed-gap timing checks, the safe aggregate
// admission and the current-observation projection. It holds no second
// ownership/protocol/state authority: every request uses the monitor's
// transport-bound send and one request allocator, every cycle consumes
// the caller's borrowed BudgetHandle, and the admitted observation
// commits through the monitor's explicit callbacks only.
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import {
  copyDeep,
  eq,
  identityKey,
  isIdentity,
  isObj,
} from "./protocol-values.mjs";

const COVERAGE_ROUNDS = 8;

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

// The shared inspectPids wire wrapper, housed here under the approved
// existing-owner move in the diagnostic-repair decision (22) to keep
// process-proof.mjs under the readable cap: ONE bounded sample request
// carrying the COMPLETE current owned union — the genuine
// `ownership.ownedIdentities()` evaluated at EVERY issue — plus
// inspectPids through the caller's transport-bound send and request
// allocator on the borrowed handle, returning reply.inspected. It
// performs no validation, IO, state, timer, registry, scheduler or
// clock authority of its own; the caller classifies the returned rows
// and all transport/validator guards stay exactly as they were.
export const readProcessInspections = (
  pids,
  handle,
  { send, nextRid, getOwnedIdentities },
) =>
  send(
    "sample",
    { owned: getOwnedIdentities(), inspectPids: pids, probes: [] },
    nextRid("inspect"),
    handle,
  ).then((r) => r.inspected);

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
  {
    pid,
    kind,
    expectedExecutable,
    pythonExecutable,
    resolvePath,
    uid,
    inspect,
  },
  handle,
) => {
  handle.assertLive("helper register read");
  const first = (await inspect([pid], handle)).find((x) => x.pid === pid);
  handle.assertLive("helper register read");
  if (
    kind !== "helper" ||
    first === undefined ||
    first.executable === expectedExecutable
  ) {
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
// await and deduplicated by PID (two retained birth tuples can share
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
  { inspect, uid },
) => {
  if (!Array.isArray(identities)) throw acct("workload identities");
  const wanted = copyDeep(identities);
  if (wanted.length === 0) return [];
  if (!wanted.every(isIdentity) || !Number.isSafeInteger(uid)) {
    throw acct("workload identities");
  }
  const pids = [...new Set(wanted.map((i) => i.pid))];
  handle.assertLive("workload live read");
  const rows = await inspect(pids, handle);
  handle.assertLive("workload live read");
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const live = [];
  for (const ident of wanted) {
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

export function createProcessObservation({
  ownership,
  send,
  nextRid,
  requireHealthy,
  clock,
  state,
  commitCycle,
}) {
  if (
    !isObj(ownership) ||
    typeof ownership.ownedIdentities !== "function" ||
    typeof ownership.observeDiscovery !== "function" ||
    typeof send !== "function" ||
    typeof nextRid !== "function" ||
    typeof requireHealthy !== "function" ||
    !isObj(clock) ||
    typeof clock.nowMonoNs !== "function" ||
    typeof state !== "function" ||
    typeof commitCycle !== "function"
  ) {
    throw acct("observation options");
  }

  const nowNs = () => BigInt(clock.nowMonoNs());

  // The private peak aggregate: the running maximum of actual
  // whole-union rssBytes across every ADMITTED complete cycle, plus
  // the sticky 4 GiB overage flag. Both survive lower later samples
  // and accounting faults, neither ever clears, and an overage alone
  // never latches the monitor fault or blocks healthy cleanup.
  let peakRssBytes = null;
  let rssLimitExceeded = false;

  // One complete bounded cycle: every owned union member is sampled or
  // proven gone, members discovered during the cycle are resampled in
  // the same bounded round set before the observation is admitted, and
  // each reply's native duration is checked in ITS OWN Python monotonic
  // origin — never subtracted against the supervisor's hrtime, which
  // separately bounds the completed-cycle gap including the slow first
  // sample. Any failure throws; the monitor latches the fault and the
  // retained last-valid observation stays untouched.
  const runCycle = async (handle) => {
    requireHealthy();
    const startedNs = nowNs();
    const found = new Map();
    let requestId; // Diagnostic copy of the original allocator result, not reply data.
    let res = await send(
      "sample",
      { owned: ownership.ownedIdentities(), inspectPids: [], probes: [] },
      (requestId = nextRid("sample")),
      handle,
    );
    let nativeDurationNs = 0n;
    let coverageRounds = 0;
    for (let round = 0; ; round += 1) {
      const nativeNs =
        BigInt(res.finishedAtMonoNs) - BigInt(res.startedAtMonoNs);
      if (
        nativeNs < 0n ||
        nativeNs > BigInt(TIMING_LIMITS.sampleGapMs) * 1000000n
      ) {
        throw acct("native interval");
      }
      nativeDurationNs += nativeNs;
      coverageRounds += 1;
      ownership.observeDiscovery(res.discovered);
      for (const s of res.samples) found.set(identityKey(s.identity), s);
      for (const g of res.gone) found.set(identityKey(g), "gone");
      const fresh = ownership
        .ownedIdentities()
        .filter((i) => !found.has(identityKey(i)));
      if (fresh.length === 0) break;
      if (round >= COVERAGE_ROUNDS) throw acct("coverage unsettled");
      res = await send(
        "sample",
        {
          owned: ownership.ownedIdentities(),
          inspectPids: [],
          probes: [],
        },
        (requestId = nextRid("sample")),
        handle,
      );
    }
    const finishedNs = nowNs();
    const samples = [...found.values()].filter((s) => s !== "gone");
    const gone = found.size - samples.length;
    let rssBytes = 0;
    for (const s of samples) {
      rssBytes += s.residentBytes;
      if (!Number.isSafeInteger(rssBytes) || rssBytes < 0) {
        throw acct("rss aggregate");
      }
    }
    const { lastValidNs, stickyFault } = state();
    const previousNs = lastValidNs === null ? null : BigInt(lastValidNs);
    const intervalMs =
      previousNs === null
        ? Number(finishedNs - startedNs) / 1e6
        : Number(finishedNs - previousNs) / 1e6;
    if (intervalMs > TIMING_LIMITS.sampleGapMs || stickyFault !== null) {
      const diagnostic = {
        startedNs: startedNs.toString(), finishedNs: finishedNs.toString(),
        lastValidNs: previousNs === null ? null : previousNs.toString(),
        gapMs: intervalMs,
        preCycleGapMs: previousNs === null ? null : Number(startedNs - previousNs) / 1e6,
        cycleDurationMs: Number(finishedNs - startedNs) / 1e6,
        nativeDurationMs: Number(nativeDurationNs) / 1e6,
        coverageRounds, stickyPresent: stickyFault !== null,
      };
      accountingTrace.cycle(diagnostic, requestId);
      throw acct(`sample interval ${JSON.stringify(diagnostic)}`);
    }
    // The commit is the success point: a late callback can never beat
    // the shared horizon because assertLive rechecks the actual clock.
    handle.assertLive("observation commit");
    // Only an ADMITTED complete sample moves the peak aggregate; the
    // strict overage predicate is rssBytes > 4 GiB and once latched it
    // never clears.
    peakRssBytes =
      peakRssBytes === null ? rssBytes : Math.max(peakRssBytes, rssBytes);
    if (rssBytes > 4294967296) {
      rssLimitExceeded = true;
    }
    const obs = {
      atMonoNs: finishedNs.toString(),
      rssBytes,
      peakRssBytes,
      rssLimitExceeded,
      accountingValid: true,
      intervalMs,
      sampled: samples.length,
      gone,
    };
    commitCycle(obs, finishedNs.toString());
    return copyDeep(obs);
  };

  // The current-observation projection: the newest admitted cycle is
  // retained with its own verdict; a latched fault or a still-sampling
  // monitor whose last valid completion went stale reports invalid
  // accounting without zeroing the retained sample facts.
  const projectObservation = () => {
    const { lastObservation, stickyFault, sampling, nowMonoNs } = state();
    if (lastObservation === null) return null;
    const obs = copyDeep(lastObservation);
    if (stickyFault !== null) {
      obs.accountingValid = false;
    } else if (sampling && obs.accountingValid) {
      const age = Number(BigInt(nowMonoNs) - BigInt(obs.atMonoNs)) / 1e6;
      if (age > TIMING_LIMITS.sampleGapMs) obs.accountingValid = false;
    }
    return obs;
  };

  return Object.freeze({ runCycle, projectObservation });
}
