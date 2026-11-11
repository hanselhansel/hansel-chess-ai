// Pure resource schema and primitives. No ledger state, IO or proof authority.
import { canonicalBytes } from "./canonical-json.mjs";
import {
  CHECK,
  eqLiteral,
  exactOnly,
  oneOf,
  schemaFail,
  shape,
  sortedUnique,
} from "./schema-primitives.mjs";
import { RECORDED_PHASES } from "./schema-constants.mjs";
import { V2_POLICY, V3_POLICY } from "./evaluation-policy.mjs";

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
  if (v.schemaVersion !== 2 || ![V2_POLICY.policyId, V3_POLICY.policyId].includes(v.policyId)) fail("resource policy");
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
  const hardObserved = v.policyId === V3_POLICY.policyId && v.closureKind === "monitor-stop" &&
    v.phase !== "watchdog-selftest" && Array.isArray(v.hardReasons) && v.hardReasons.includes("NATIVE") &&
    v.timelyCycles === v.completedCycles && (v.completedCycles > 0 || v.peakRssBytes === null);
  if ((!v.coverageLost && v.peakRssBytes !== v.observedPeakRssBytes && !hardObserved &&
      !(v.lateDrops.count > 0 && v.rssLimitExceeded)) ||
    v.peakRssBytes > v.observedPeakRssBytes || v.rssLimitExceeded !== v.observedPeakRssBytes > CAP)
    fail("peak/cap coherence");
  if (!Array.isArray(v.hardReasons)) fail("hard reasons");
  sortedUnique(v.hardReasons, "hard reasons");
  v.hardReasons.forEach((c) => oneOf(c, HARD, "hard reason"));
}

export {
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
};
