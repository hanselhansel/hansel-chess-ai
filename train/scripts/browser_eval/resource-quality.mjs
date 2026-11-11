// Pure bounded monitor-owned ledger. No IO, timers, Native calls or proof authority.
import { CHECK, freezeDeep, oneOf, shape } from "./schema-primitives.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import {
  CAUSES,
  HARD,
  GAP,
  CAP,
  CHECKPOINT_FIELDS,
  ns,
  nat,
  count,
  counts,
  lateDetail,
  fieldSpec,
  fail,
  assertQualityCheckpoint,
  assertResourceEvidence,
} from "./resource-quality-schema.mjs";

export { assertQualityCheckpoint, assertResourceEvidence } from "./resource-quality-schema.mjs";

export function createResourceQuality({ runId, phase, monitorRunId = runId }) {
  let open = null;
  let clockNs = null;
  const s = {
    schemaVersion: 2,
    policyId: V2_POLICY.policyId,
    runId,
    phase,
    monitorRunId,
    closureKind: phase === "watchdog-selftest" ? "selftest-prefix" : "monitor-stop",
    startedNs: "0",
    coverageEndNs: null,
    lastCoverageQualifiedNs: null,
    lastCompleteNs: null,
    lastTimelyNs: null,
    coverageLost: false,
    pending: false,
    completedCycles: 0,
    timelyCycles: 0,
    gapCount: 0,
    causeCounts: counts(),
    maxGapNs: "0",
    firstGap: null,
    lastGap: null,
    details: [],
    detailsDropped: 0,
    lateDrops: { count: 0, first: null, last: null },
    observedPeakRssBytes: null,
    peakRssBytes: null,
    rssLimitExceeded: false,
    hardReasons: [],
  };
  assertResourceEvidence(s);
  const retain = () => {
    if (open.ordinal === 1) s.firstGap = structuredClone(open);
    s.lastGap = structuredClone(open);
    const i = s.details.findIndex((d) => d.ordinal === open.ordinal);
    if (i < 0) s.details.push(structuredClone(open));
    else s.details[i] = structuredClone(open);
    if (s.details.length > 64) s.details.shift();
    s.detailsDropped = s.gapCount - s.details.length;
  };
  const gap = (affected, at, cycle = null) => {
    if (!open) {
      s.gapCount = count(s.gapCount);
      open = {
        ordinal: s.gapCount,
        causes: [],
        fromNs: s.lastCompleteNs,
        detectedNs: at,
        toNs: null,
        cycleStartedNs: null,
        cycleFinishedNs: null,
        nativeMaxDurationNs: null,
        requestId: null,
      };
    }
    for (const c of affected)
      if (!open.causes.includes(c)) {
        open.causes.push(c);
        s.causeCounts[c] = count(s.causeCounts[c]);
      }
    open.causes.sort();
    if (cycle)
      Object.assign(open, {
        toNs: at,
        cycleStartedNs: cycle.startedNs,
        cycleFinishedNs: at,
        nativeMaxDurationNs: cycle.nativeMaxDurationNs,
        requestId: cycle.requestId,
      });
    const duration = ns(at) - ns(open.fromNs);
    if (duration > ns(s.maxGapNs)) s.maxGapNs = String(duration);
    s.coverageLost = true;
    retain();
    if (cycle) open = null;
  };
  const inspectCycle = (c) => {
    shape(
      c,
      { ...fieldSpec("startedNs finishedNs nativeMaxDurationNs requestId"), rssBytes: "nat", handleLive: "bool" },
      "cycle",
    );
    if (!c.handleLive || ns(c.startedNs) > ns(c.finishedNs) || s.hardReasons.length) fail("cycle admission");
    return ns(c.finishedNs) - ns(c.startedNs) <= GAP && ns(c.nativeMaxDurationNs) <= GAP;
  };
  const peak = (bytes, timely) => {
    s.observedPeakRssBytes = Math.max(s.observedPeakRssBytes ?? 0, bytes);
    if (timely) s.peakRssBytes = Math.max(s.peakRssBytes ?? 0, bytes);
    s.rssLimitExceeded ||= s.observedPeakRssBytes > CAP;
  };
  const active = () => {
    if (s.completedCycles === 0 || s.coverageEndNs !== null) fail("inactive ledger");
  };
  return Object.freeze({
    bootstrap(c) {
      if (s.completedCycles !== 0 || !inspectCycle(c)) fail("strict bootstrap");
      clockNs = ns(c.finishedNs);
      s.startedNs = c.startedNs;
      s.lastCoverageQualifiedNs = s.lastCompleteNs = s.lastTimelyNs = c.finishedNs;
      s.completedCycles = s.timelyCycles = 1;
      peak(c.rssBytes, true);
    },
    complete(c) {
      active();
      const timely = inspectCycle(c);
      if (ns(c.startedNs) < ns(s.lastCompleteNs) || ns(c.finishedNs) < clockNs) fail("cycle order");
      clockNs = ns(c.finishedNs);
      const affected = [];
      if (ns(c.finishedNs) - ns(s.lastCompleteNs) > GAP || ns(c.finishedNs) - ns(c.startedNs) > GAP)
        affected.push(CAUSES[0]);
      if (ns(c.nativeMaxDurationNs) > GAP) affected.push(CAUSES[1]);
      if (affected.length || open) gap(affected, c.finishedNs, c);
      s.completedCycles = count(s.completedCycles);
      if (timely) {
        s.timelyCycles = count(s.timelyCycles);
        s.lastTimelyNs = c.finishedNs;
      }
      s.lastCompleteNs = c.finishedNs;
      if (!s.coverageLost) s.lastCoverageQualifiedNs = c.finishedNs;
      peak(c.rssBytes, timely);
    },
    noteAge(at) {
      active();
      if (ns(at) < clockNs) fail("age chronology");
      clockNs = ns(at);
      if (ns(at) - ns(s.lastCompleteNs) > GAP) gap([CAUSES[2]], at);
    },
    setPending(value) {
      if (!CHECK.bool(value)) fail("pending");
      s.pending = value;
    },
    close(at) {
      active();
      if (ns(at) < clockNs) fail("fence chronology");
      clockNs = ns(at);
      if (ns(at) - ns(s.lastCompleteNs) > GAP) gap([CAUSES[2]], at);
      if (open) {
        open.toNs = at;
        retain();
        open = null;
      }
      s.coverageEndNs = at;
    },
    noteLateDrop(d, rssBytes = null) {
      lateDetail(d);
      if (
        s.coverageEndNs === null ||
        ns(d.observedAtNs) < ns(s.coverageEndNs) ||
        (s.lateDrops.last && ns(d.observedAtNs) < ns(s.lateDrops.last.observedAtNs))
      )
        fail("late guard chronology");
      clockNs = ns(d.observedAtNs);
      if (rssBytes !== null) nat(rssBytes);
      s.lateDrops.count = count(s.lateDrops.count);
      s.lateDrops.first ??= structuredClone(d);
      s.lateDrops.last = structuredClone(d);
      if (rssBytes > CAP) peak(rssBytes, false);
    },
    markHard(reason) {
      oneOf(reason, HARD, "hard reason");
      s.hardReasons = [...new Set([...s.hardReasons, reason])].sort();
    },
    snapshot() {
      assertResourceEvidence(s);
      return freezeDeep(structuredClone(s));
    },
    checkpoint(at) {
      if (ns(at) < clockNs || (s.coverageEndNs !== null && ns(at) > ns(s.coverageEndNs)))
        fail("checkpoint clock boundary");
      const value = {
        capturedNs: at,
        ...Object.fromEntries(CHECKPOINT_FIELDS.map((name) => [name, structuredClone(s[name])])),
        lateDropCount: s.lateDrops.count,
      };
      assertQualityCheckpoint(value);
      clockNs = ns(at);
      return freezeDeep(value);
    },
  });
}
