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
import {
  copyDeep,
  identityKey,
  isIdentity,
  isObj,
} from "./protocol-values.mjs";

const COVERAGE_ROUNDS = 8;

const acct = (detail, resourceReason = "NATIVE") => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  e.resourceReason = resourceReason;
  return e;
};

export { readProcessInspections, readHelperReadyInspection,
  readLiveWorkloadPids } from "./process-inspections.mjs";

export function createProcessObservation({
  ownership,
  send,
  nextRid,
  requireHealthy,
  clock,
  state,
  commitCycle,
  quality = null,
  softCompare = false,
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

  // Sole Node terminal store. No external writer, producer authority or PID keys.
  let terminal = new Set();
  const isTerminalIdentity = (i) => isIdentity(i) && terminal.has(identityKey(i));
  const sampleOwnedIdentities = () => ownership.ownedIdentities().filter((i) => !isTerminalIdentity(i));
  const checkReply = (reply, absent) => {
    const identities = [
      ...(reply.discovered ?? []).map((r) => r.identity),
      ...(reply.samples ?? []).map((r) => r.identity),
      ...(reply.inspected ?? []).filter((r) => r.state === "live").map((r) => r.process.identity),
      ...(reply.probes ?? []).filter((r) => r.state === "same-live").map((r) => r.identity),
    ];
    if (identities.some((i) => absent.has(identityKey(i)))) throw acct("terminal identity reappeared", "IDENTITY");
  };
  const assertNoTerminalReappearance = (reply) => checkReply(reply, terminal);

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
  // sample. Only private v2 compare periodic timing predicates return
  // quality data. Structural and strict-policy failures remain thrown.
  const runCycle = async (handle, metadata = {}) => {
    if (state().stopping) throw acct("monitor stopping");
    if (quality !== null && quality.snapshot().completedCycles === 0 && metadata.purpose !== "bootstrap")
      throw acct("missing strict bootstrap");
    const soft = quality !== null && softCompare && metadata.purpose === "periodic" &&
      quality.snapshot().completedCycles > 0;
    requireHealthy();
    const startedNs = nowNs();
    const found = new Map();
    const staged = new Set();
    for (const i of ownership.ownedIdentities()) if (isTerminalIdentity(i)) found.set(identityKey(i), "gone");
    let requestId; // Diagnostic copy of the original allocator result, not reply data.
    let res = await send(
      "sample",
      { owned: sampleOwnedIdentities(), inspectPids: [], probes: [] },
      (requestId = nextRid("sample")),
      handle,
    );
    let nativeDurationNs = 0n;
    let nativeMaxDurationNs = 0n;
    let coverageRounds = 0;
    for (let round = 0; ; round += 1) {
      const nativeNs =
        BigInt(res.finishedAtMonoNs) - BigInt(res.startedAtMonoNs);
      if (BigInt(res.startedAtMonoNs) < 0n || BigInt(res.finishedAtMonoNs) < 0n || nativeNs < 0n)
        throw acct("native interval", "TIMESTAMP");
      if (
        (!soft && nativeNs > BigInt(TIMING_LIMITS.sampleGapMs) * 1000000n)
      ) {
        throw acct("native interval");
      }
      nativeDurationNs += nativeNs;
      if (nativeNs > nativeMaxDurationNs) nativeMaxDurationNs = nativeNs;
      coverageRounds += 1;
      // This census precedes THIS reply's gone reads. Only prior absence
      // (earlier admitted cycles/coverage rounds) can contradict it.
      checkReply(res, new Set([...terminal, ...staged]));
      ownership.observeDiscovery(res.discovered);
      for (const s of res.samples) found.set(identityKey(s.identity), s);
      for (const g of res.gone) {
        staged.add(identityKey(g));
        found.set(identityKey(g), "gone");
      }
      const fresh = ownership
        .ownedIdentities()
        .filter((i) => !found.has(identityKey(i)));
      if (fresh.length === 0) break;
      if (round >= COVERAGE_ROUNDS) throw acct("coverage unsettled", "UNION");
      res = await send(
        "sample",
        {
          owned: sampleOwnedIdentities(),
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
      if (!Number.isSafeInteger(s.residentBytes) || s.residentBytes < 0) throw acct("rss aggregate", "AGGREGATE");
      rssBytes += s.residentBytes;
      if (!Number.isSafeInteger(rssBytes) || rssBytes < 0) {
        throw acct("rss aggregate", "AGGREGATE");
      }
    }
    const current = state();
    if (quality !== null && current.stopping) {
      // Only decoded attempts reaching this guard are attributable. The
      // immutable end is diagnostic; the SAME live handle still decides.
      const d = { requestId, observedAtNs: String(nowNs()), originalEndNs: metadata.originalEndNs };
      try { handle.assertLive("observation commit"); }
      catch (error) { quality.noteLateDrop(d); throw error; }
      quality.noteLateDrop(d, soft ? rssBytes : null);
      return Object.freeze({ kind: "fenced-observation" });
    }
    const { lastValidNs, stickyFault } = current;
    const previousNs = lastValidNs === null ? null : BigInt(lastValidNs);
    const intervalMs =
      previousNs === null
        ? Number(finishedNs - startedNs) / 1e6
        : Number(finishedNs - previousNs) / 1e6;
    if ((!soft && (intervalMs > TIMING_LIMITS.sampleGapMs ||
      finishedNs - startedNs > 500000000n)) || stickyFault !== null) {
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
    if (quality !== null) {
      const timely = finishedNs - startedNs <= 500000000n && nativeMaxDurationNs <= 500000000n;
      const cycle = { startedNs: String(startedNs), finishedNs: String(finishedNs),
        nativeMaxDurationNs: String(nativeMaxDurationNs), rssBytes, requestId, handleLive: true };
      // The original guard precedes every ledger/terminal/observation commit.
      handle.assertLive("observation commit");
      if (quality.snapshot().completedCycles === 0) quality.bootstrap(cycle);
      else quality.complete(cycle);
      const q = quality.snapshot();
      const obs = { atMonoNs: String(finishedNs), rssBytes, peakRssBytes: q.peakRssBytes,
        observedPeakRssBytes: q.observedPeakRssBytes, rssLimitExceeded: q.rssLimitExceeded,
        accountingValid: timely, snapshotComplete: true, cycleTimely: timely,
        intervalMs, sampled: samples.length, gone };
      commitCycle(obs, String(finishedNs));
      if (timely && !q.rssLimitExceeded) terminal = new Set([...terminal, ...staged]);
      return { ...copyDeep(obs), kind: soft && (!timely || intervalMs > TIMING_LIMITS.sampleGapMs) ? "periodic-quality" : "observation",
        resourceQuality: q };
    }
    // The commit is the success point: a late callback can never beat
    // the shared horizon because assertLive rechecks the actual clock.
    // Only an ADMITTED complete sample moves the peak aggregate; the
    // strict overage predicate is rssBytes > 4 GiB and once latched it
    // never clears.
    const nextPeak = peakRssBytes === null ? rssBytes : Math.max(peakRssBytes, rssBytes);
    const nextLimit = rssLimitExceeded || rssBytes > 4294967296;
    const obs = {
      atMonoNs: finishedNs.toString(),
      rssBytes,
      peakRssBytes: nextPeak,
      rssLimitExceeded: nextLimit,
      accountingValid: true,
      intervalMs,
      sampled: samples.length,
      gone,
    };
    // All fallible preparation precedes the last original guard. No await
    // or public callback separates original commit and terminal publication.
    const result = copyDeep(obs);
    const nextTerminal = new Set([...terminal, ...staged]);
    const finished = finishedNs.toString();
    handle.assertLive("observation commit");
    commitCycle(obs, finished);
    terminal = nextTerminal;
    peakRssBytes = nextPeak;
    rssLimitExceeded = nextLimit;
    return result;
  };

  // The current-observation projection: the newest admitted cycle is
  // retained with its own verdict; a latched fault or a still-sampling
  // monitor whose last valid completion went stale reports invalid
  // accounting without zeroing the retained sample facts.
  const projectObservation = () => {
    const { lastObservation, stickyFault, sampling, nowMonoNs, pending } = state();
    if (quality !== null) {
      quality.setPending(pending === true);
      if (sampling && quality.snapshot().completedCycles > 0) quality.noteAge(String(nowMonoNs));
    }
    if (lastObservation === null) return null;
    const obs = copyDeep(lastObservation);
    if (quality !== null) {
      const q = quality.snapshot();
      Object.assign(obs, { resourceQuality: q, coverageContinuous: !q.coverageLost,
        lastCoverageQualifiedNs: q.lastCoverageQualifiedNs, lastCompleteNs: q.lastCompleteNs,
        lastTimelyNs: q.lastTimelyNs, observedPeakRssBytes: q.observedPeakRssBytes,
        peakRssBytes: q.peakRssBytes, rssLimitExceeded: q.rssLimitExceeded });
    }
    if (stickyFault !== null) {
      obs.accountingValid = false;
    } else if (sampling && obs.accountingValid) {
      const age = Number(BigInt(nowMonoNs) - BigInt(obs.atMonoNs)) / 1e6;
      if (age > TIMING_LIMITS.sampleGapMs) obs.accountingValid = false;
    }
    return obs;
  };

  return Object.freeze({ runCycle, projectObservation, sampleOwnedIdentities,
    isTerminalIdentity, assertNoTerminalReappearance });
}
