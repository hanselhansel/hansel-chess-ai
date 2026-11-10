// Whole original sticky-RSS and finish-boundary projection/retention group.
// No owned state, stop latch, clock, timer or ledger. Pure capture only.
import { assertResourceEvidence, assertQualityCheckpoint } from "./resource-quality.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { eqLiteral } from "./schema-primitives.mjs";

export function resourcePayload(mo, capturedNs) {
  // Closed coverage is sealed by Task8's mandatory full final event.
  if (mo?.resourceQuality && mo.resourceQuality.coverageEndNs !== null) return null;
  const base = { rssBytes: Number.isSafeInteger(mo?.rssBytes) ? mo.rssBytes : null,
    peakRssBytes: Number.isSafeInteger(mo?.peakRssBytes) ? mo.peakRssBytes : null,
    rssLimitExceeded: mo?.rssLimitExceeded === true, accountingValid: mo?.accountingValid === true,
    atMonoNs: mo?.atMonoNs !== undefined ? String(mo.atMonoNs) : null };
  if (!mo?.resourceQuality) return base;
  const q = mo.resourceQuality;
  const qualityCheckpoint = { capturedNs, ...Object.fromEntries([
    "completedCycles", "timelyCycles", "gapCount", "causeCounts", "maxGapNs", "coverageLost",
    "pending", "lastCompleteNs", "lastTimelyNs"].map((key) => [key, structuredClone(q[key])])),
    lateDropCount: q.lateDrops.count };
  assertQualityCheckpoint(qualityCheckpoint);
  return { ...base, observedPeakRssBytes: q.observedPeakRssBytes, qualityCheckpoint };
}

export function createWatchdogResourceChecks({
  monitor,
  state,
  recordFault,
  latchStop,
  makeError: fail,
  evaluationPolicy = null,
  phase = null,
  nowNs = null,
}) {
  const v2 = evaluationPolicy !== null;
  if (v2) eqLiteral(evaluationPolicy, V2_POLICY, "watchdog resource policy");
  const readObservation = () => {
    const mo = monitor.lastObservation();
    if (!v2) return mo;
    if (!mo) throw fail("ACCOUNTING_UNAVAILABLE", "native observation missing");
    assertResourceEvidence(mo.resourceQuality);
    const q = mo.resourceQuality;
    if (!Number.isSafeInteger(mo.rssBytes) || mo.rssBytes < 0 || !mo.snapshotComplete ||
      typeof mo.cycleTimely !== "boolean" || q.completedCycles < 1 ||
      mo.peakRssBytes !== q.peakRssBytes || mo.observedPeakRssBytes !== q.observedPeakRssBytes ||
      mo.rssLimitExceeded !== q.rssLimitExceeded) throw fail("ACCOUNTING_UNAVAILABLE", "native observation shape");
    // A validated retained overage survives stale and hard projections.
    if (q.rssLimitExceeded) return mo;
    if (monitor.fault?.() !== null || q.hardReasons.length ||
      (q.coverageEndNs !== null && state.finishReq === null && state.stopReq === null))
      throw fail("ACCOUNTING_UNAVAILABLE", "native hard fault");
    if (!mo.accountingValid && !(phase === "compare" && q.phase === "compare" && q.coverageLost))
      throw fail("ACCOUNTING_UNAVAILABLE", "native current proof");
    return mo;
  };
  const payload = (mo) => mo?.resourceQuality?.coverageEndNs != null
    ? null : resourcePayload(mo, v2 ? String(nowNs()) : undefined);
  // The sticky Native overage flag: a retained historical observed fact —
  // never a fresh sample — checked before ordinary admission, before a
  // finish may be admitted and again after cleanup before finalization.
  const rssExceeded = () => {
    try {
      const mo = readObservation();
      if (mo === null || mo.rssLimitExceeded !== true) return false;
      if (v2 && state.stopReq === null && state.finishReq === null) stopOnOverage(mo);
      return true;
    } catch (error) {
      if (v2) { recordFault(error); latchStop(error.code ?? "ACCOUNTING_UNAVAILABLE"); }
      return false;
    }
  };

  const stopOnOverage = (mo) => {
    if (mo !== null && mo.rssLimitExceeded === true) {
      if (v2 && state.stopReq !== null) return true;
      const e = fail("RESOURCE_RSS", `peak ${v2 ? mo.observedPeakRssBytes : mo.peakRssBytes}`);
      // Retain the actual separate current/peak/flag/time/verdict for the
      // rapid high -> lower -> finish race through the existing resource
      // lane — the fault detail alone never replaces real observations.
      const captured = payload(mo);
      recordFault(e);
      latchStop(e.code);
      if (state.records !== null && captured !== null) {
        void state.records
          .recordEvent("resource", captured)
          .catch(recordFault);
      }
      return true;
    }
    return false;
  };

  const stopFinishOnOverage = () => stopOnOverage(readObservation());
  return Object.freeze({ rssExceeded, stopFinishOnOverage, readObservation, payload });
}
