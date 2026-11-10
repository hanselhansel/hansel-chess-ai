// Pure bounded monitor-owned ledger. No IO, timers, Native calls or proof authority.
import { canonicalBytes } from "./canonical-json.mjs";
import {
  CHECK,
  eqLiteral,
  exactOnly,
  freezeDeep,
  oneOf,
  schemaFail,
  shape,
  sortedUnique,
} from "./schema-primitives.mjs";
import { RECORDED_PHASES } from "./schema-constants.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
const CAUSES = ["PERIODIC_COMPLETION_GAP", "PERIODIC_NATIVE_DURATION", "PERIODIC_OBSERVER_AGE"];
const HARD =
  "SCIENCE IDENTITY NATIVE TIMESTAMP UNION AGGREGATE TRANSPORT BACKEND PERMISSION PROOF STORE DISK GRAPH TIMEOUT CLEANUP PHASE_CHECK ABANDONED".split(
    " ",
  );
const DETAIL_FIELDS =
  "ordinal causes fromNs detectedNs toNs cycleStartedNs cycleFinishedNs nativeMaxDurationNs requestId".split(" ");
const EVIDENCE_FIELDS = (
  "schemaVersion policyId runId phase monitorRunId closureKind startedNs coverageEndNs " +
  "lastCoverageQualifiedNs lastCompleteNs lastTimelyNs coverageLost pending completedCycles timelyCycles " +
  "gapCount causeCounts maxGapNs firstGap lastGap details detailsDropped lateDrops " +
  "observedPeakRssBytes peakRssBytes rssLimitExceeded hardReasons"
).split(" ");
const GAP = 500000000n;
const CAP = 4294967296;
const fail = (detail) => schemaFail("SCHEMA_COHERENCE", detail);
const ns = (v) => {
  if (typeof v !== "string" || !/^(0|[1-9][0-9]*)$/.test(v)) fail("nanosecond string");
  return BigInt(v);
};
const nat = (v) => {
  if (!CHECK.nat(v)) fail("safe nonnegative integer");
};
const bounded = (v, limit) => {
  if (canonicalBytes(v).byteLength > limit) fail("resource evidence overflow");
};
const count = (v) => {
  nat(v);
  nat(v + 1);
  return v + 1;
};
const fieldSpec = (names, type = "strNE") => Object.fromEntries(names.split(" ").map((name) => [name, type]));
const CHECKPOINT_FIELDS =
  "completedCycles timelyCycles gapCount causeCounts maxGapNs coverageLost pending lastCompleteNs lastTimelyNs".split(
    " ",
  );
const counts = () => Object.fromEntries(CAUSES.map((c) => [c, 0]));
const causes = (v) => {
  if (!Array.isArray(v) || v.length === 0) fail("gap causes");
  sortedUnique(v, "causes");
  v.forEach((c) => oneOf(c, CAUSES, "cause"));
};
const causeCounts = (v) => {
  shape(v, Object.fromEntries(CAUSES.map((c) => [c, "nat"])), "causeCounts");
};
const lateDetail = (v) => {
  shape(v, { requestId: "strNE", observedAtNs: "strNE", originalEndNs: "strNE" }, "late drop");
  ns(v.observedAtNs);
  ns(v.originalEndNs);
};
const detail = (v) => {
  exactOnly(v, DETAIL_FIELDS, "gap");
  if (!CHECK.pos(v.ordinal)) fail("gap ordinal");
  causes(v.causes);
  if (ns(v.fromNs) > ns(v.detectedNs)) fail("gap detection chronology");
  if (v.toNs !== null && ns(v.detectedNs) > ns(v.toNs)) fail("gap end chronology");
  if (v.cycleStartedNs === null) {
    if (v.cycleFinishedNs !== null || v.nativeMaxDurationNs !== null || v.requestId !== null) fail("age-only detail");
  } else {
    if (
      !CHECK.strNE(v.requestId) ||
      ns(v.cycleStartedNs) > ns(v.cycleFinishedNs) ||
      ns(v.cycleFinishedNs) !== ns(v.toNs)
    )
      fail("cycle chronology");
    ns(v.nativeMaxDurationNs);
  }
};
export function assertQualityCheckpoint(v) {
  bounded(v, 1024);
  shape(
    v,
    {
      ...fieldSpec("capturedNs maxGapNs lastCompleteNs lastTimelyNs"),
      ...fieldSpec("completedCycles timelyCycles gapCount lateDropCount", "nat"),
      causeCounts: "obj",
      coverageLost: "bool",
      pending: "bool",
    },
    "qualityCheckpoint",
  );
  ns(v.capturedNs);
  ns(v.maxGapNs);
  causeCounts(v.causeCounts);
  if (v.timelyCycles === 0 || v.timelyCycles > v.completedCycles || v.coverageLost !== v.gapCount > 0 ||
    (!v.coverageLost && (v.timelyCycles !== v.completedCycles || v.lastTimelyNs !== v.lastCompleteNs)))
    fail("checkpoint counters");
  if (v.completedCycles === 0 || ns(v.lastTimelyNs) > ns(v.lastCompleteNs) || ns(v.lastCompleteNs) > ns(v.capturedNs))
    fail("checkpoint chronology");
  for (const c of CAUSES) if (v.causeCounts[c] > v.gapCount) fail("checkpoint cause count");
}
export function assertResourceEvidence(v) {
  bounded(v, 65536);
  exactOnly(v, EVIDENCE_FIELDS, "resourceEvidence");
  if (v.schemaVersion !== 2 || v.policyId !== V2_POLICY.policyId) fail("resource policy");
  for (const k of ["runId", "monitorRunId"]) if (!CHECK.strNE(v[k])) fail(k);
  oneOf(v.phase, RECORDED_PHASES, "resource phase");
  oneOf(v.closureKind, ["monitor-stop", "selftest-prefix"], "closureKind");
  if (v.closureKind === "selftest-prefix") {
    if (v.phase !== "watchdog-selftest" || v.runId !== `${v.monitorRunId}:watchdog-selftest`) fail("prefix binding");
  } else if (v.monitorRunId !== v.runId || v.phase === "watchdog-selftest") fail("monitor binding");
  for (const k of ["coverageLost", "pending", "rssLimitExceeded"]) if (!CHECK.bool(v[k])) fail(k);
  for (const k of ["completedCycles", "timelyCycles", "gapCount", "detailsDropped"]) nat(v[k]);
  const started = ns(v.startedNs);
  const end = v.coverageEndNs === null ? null : ns(v.coverageEndNs);
  if (end !== null && end < started) fail("coverage end");
  let previous = started;
  for (const k of ["lastCoverageQualifiedNs", "lastTimelyNs", "lastCompleteNs"]) {
    if (v[k] === null) {
      if (v.completedCycles !== 0) fail("missing observation");
    } else {
      const t = ns(v[k]);
      if (t < previous || (end !== null && t > end)) fail("observation chronology");
      previous = t;
    }
  }
  if (v.completedCycles === 0 && [v.lastCompleteNs, v.lastTimelyNs, v.lastCoverageQualifiedNs].some((x) => x !== null))
    fail("unseeded clocks");
  if (v.timelyCycles > v.completedCycles || (v.completedCycles > 0 && v.timelyCycles === 0)) fail("cycle counters");
  causeCounts(v.causeCounts);
  if (v.coverageLost !== v.gapCount > 0) fail("coverage counter");
  if (
    !Array.isArray(v.details) ||
    v.details.length !== Math.min(64, v.gapCount) ||
    v.detailsDropped !== v.gapCount - v.details.length
  )
    fail("ring count");
  if (v.gapCount === 0) {
    if (v.firstGap !== null || v.lastGap !== null || ns(v.maxGapNs) !== 0n ||
      v.timelyCycles !== v.completedCycles || v.lastCoverageQualifiedNs !== v.lastTimelyNs ||
      v.lastTimelyNs !== v.lastCompleteNs) fail("continuous resource evidence");
  } else {
    detail(v.firstGap);
    detail(v.lastGap);
    if (v.firstGap.ordinal !== 1 || v.lastGap.ordinal !== v.gapCount) fail("first/latest ordinal");
    eqLiteral(v.details.at(-1), v.lastGap, "latest detail");
    if (v.gapCount <= 64) eqLiteral(v.details[0], v.firstGap, "first detail");
    let lastEnd = started;
    const known = new Map([[1, v.firstGap]]);
    v.details.forEach((d, i) => {
      detail(d);
      if (
        d.ordinal !== v.detailsDropped + i + 1 ||
        ns(d.fromNs) < lastEnd ||
        (d.toNs === null && i !== v.details.length - 1)
      )
        fail("ring order");
      lastEnd = ns(d.toNs ?? d.detectedNs);
      known.set(d.ordinal, d);
    });
    const seen = counts();
    let knownMax = 0n;
    for (const d of known.values()) {
      if (
        ns(d.fromNs) < started ||
        (end !== null && ns(d.toNs ?? d.detectedNs) > end) ||
        ns(d.toNs ?? d.detectedNs) - ns(d.fromNs) > ns(v.maxGapNs)
      )
        fail("gap bounds");
      const duration = ns(d.toNs ?? d.detectedNs) - ns(d.fromNs);
      if (duration > knownMax) knownMax = duration;
      d.causes.forEach((c) => (seen[c] += 1));
    }
    for (const c of CAUSES) {
      if (v.causeCounts[c] < seen[c] || (v.gapCount <= 64 && v.causeCounts[c] !== seen[c])) fail("lost cause count");
    }
    if (v.gapCount <= 64 && v.lastGap.toNs !== null && ns(v.maxGapNs) !== knownMax) fail("forged maximum gap");
    if (v.lastCoverageQualifiedNs === null || ns(v.lastCoverageQualifiedNs) !== ns(v.firstGap.fromNs))
      fail("coverage restored after loss");
  }
  if (end !== null && v.lastCompleteNs !== null && end - ns(v.lastCompleteNs) > GAP) {
    const tail = v.lastGap;
    if (!tail || tail.fromNs !== v.lastCompleteNs || tail.toNs !== v.coverageEndNs || !tail.causes.includes(CAUSES[2]))
      fail("missing coverage tail");
  }
  for (const c of CAUSES)
    if (v.causeCounts[c] > v.gapCount || (v.gapCount === 0 && v.causeCounts[c] !== 0)) fail("cause total");
  shape(v.lateDrops, { count: "nat", first: "nullObj", last: "nullObj" }, "lateDrops");
  if (v.lateDrops.count === 0) {
    if (v.lateDrops.first !== null || v.lateDrops.last !== null) fail("empty lateDrops");
  } else {
    lateDetail(v.lateDrops.first);
    lateDetail(v.lateDrops.last);
    if (
      ns(v.lateDrops.first.observedAtNs) > ns(v.lateDrops.last.observedAtNs) ||
      end === null ||
      ns(v.lateDrops.first.observedAtNs) < end
    )
      fail("late chronology");
    if (v.lateDrops.count === 1) eqLiteral(v.lateDrops.first, v.lateDrops.last, "one late drop");
  }
  for (const k of ["observedPeakRssBytes", "peakRssBytes"]) {
    if (v[k] === null) {
      if (v.completedCycles !== 0) fail("missing peak");
    } else nat(v[k]);
  }
  if ((!v.coverageLost && v.peakRssBytes !== v.observedPeakRssBytes &&
      !(v.lateDrops.count > 0 && v.rssLimitExceeded)) ||
    v.peakRssBytes > v.observedPeakRssBytes || v.rssLimitExceeded !== v.observedPeakRssBytes > CAP)
    fail("peak/cap coherence");
  if (!Array.isArray(v.hardReasons)) fail("hard reasons");
  sortedUnique(v.hardReasons, "hard reasons");
  v.hardReasons.forEach((c) => oneOf(c, HARD, "hard reason"));
}
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
