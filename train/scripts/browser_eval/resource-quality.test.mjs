import assert from "node:assert/strict";
import test from "node:test";
import { verifyVerdictClosure } from "./receipt-verdicts-v2.mjs";
import { deriveVerdicts } from "./verdicts-v2.mjs";
import { closedFacts, closureInput, v2Graph } from "./separate-verdicts-test-fixtures.mjs";
import { createResourceQuality, assertResourceEvidence, assertQualityCheckpoint } from "./resource-quality.mjs";

const make = () => createResourceQuality({ runId: "r", phase: "compare", monitorRunId: "r" });
const cycle = (start, end, rssBytes = 5, nativeMaxDurationNs = "1") => ({
  startedNs: String(start),
  finishedNs: String(end),
  rssBytes,
  nativeMaxDurationNs,
  requestId: "request",
  handleLive: true,
});
const seeded = () => {
  const q = make();
  q.bootstrap(cycle(0, 10));
  return q;
};

test("bootstrap seeds actual clocks, counters and peaks; first idle interval uses completion", () => {
  const q = seeded();
  const before = q.snapshot();
  assert.deepEqual(
    [
      before.startedNs,
      before.lastCompleteNs,
      before.lastTimelyNs,
      before.lastCoverageQualifiedNs,
      before.completedCycles,
      before.timelyCycles,
    ],
    ["0", "10", "10", "10", 1, 1],
  );
  q.complete(cycle(501000010, 501000011));
  const after = q.snapshot();
  assert.equal(after.gapCount, 1);
  assert.equal(after.maxGapNs, "501000001");
  assert.equal(after.lastCoverageQualifiedNs, "10");
  assert.equal(after.lastCompleteNs, "501000011");
  assert.equal(after.lastTimelyNs, "501000011");
  assert.throws(() => make().bootstrap(cycle(0, 500000001)));
  assert.throws(() => make().complete(cycle(0, 1)));
});

test("500ms exact is accepted; one extra ns loses coverage permanently", () => {
  const q = seeded();
  q.complete(cycle(10, 500000010));
  assert.equal(q.snapshot().coverageLost, false);
  q.complete(cycle(500000010, 1000000011));
  q.complete(cycle(1000000011, 1000000012));
  const s = q.snapshot();
  assert.equal(s.coverageLost, true);
  assert.equal(s.completedCycles, 4);
  assert.equal(s.timelyCycles, 3);
  assert.equal(s.lastCoverageQualifiedNs, "500000010");
  assert.equal(s.lastTimelyNs, "1000000012");
});

test("age reads merge one episode and exact distinct causes once", () => {
  const q = seeded();
  q.setPending(true);
  q.noteAge("500000011");
  q.noteAge("600000011");
  q.complete(cycle(500000010, 700000010, 10, "500000001"));
  const s = q.snapshot();
  assert.equal(s.gapCount, 1);
  assert.deepEqual(Object.values(s.causeCounts), [1, 1, 1]);
  assert.equal(s.firstGap.fromNs, "10");
  assert.equal(s.firstGap.toNs, "700000010");
  assert.equal(s.pending, true);
  q.setPending(false);
  q.close("700000011");
  assert.equal(q.snapshot().pending, false);
  assert.throws(() => q.complete(cycle(700000011, 700000012)));
});

test("native-only duration has its own episode and does not advance timely clocks", () => {
  const q = seeded();
  q.complete(cycle(10, 11, 20, "500000001"));
  const s = q.snapshot();
  assert.deepEqual(Object.values(s.causeCounts), [0, 1, 0]);
  assert.equal(s.lastCompleteNs, "11");
  assert.equal(s.lastTimelyNs, "10");
  assert.equal(s.observedPeakRssBytes, 20);
  assert.equal(s.peakRssBytes, 5);
});

test("65 episodes retain first and latest64 with exact counters and max", () => {
  const q = seeded();
  let t = 10n;
  for (let i = 0; i < 66; i += 1) {
    q.complete(cycle(t, t + 500000001n));
    t += 500000001n;
  }
  q.close(String(t));
  const s = q.snapshot();
  assert.equal(s.gapCount, 66);
  assert.equal(s.details.length, 64);
  assert.equal(s.detailsDropped, 2);
  assert.equal(s.firstGap.ordinal, 1);
  assert.equal(s.details[0].ordinal, 3);
  assert.equal(s.lastGap.ordinal, 66);
  assert.equal(s.causeCounts.PERIODIC_COMPLETION_GAP, 66);
  assert.equal(s.maxGapNs, "500000001");
  assert.doesNotThrow(() => assertResourceEvidence(s));
  const bad = structuredClone(s);
  bad.details.reverse();
  assert.throws(() => assertResourceEvidence(bad));
});

test("cap evidence is sticky; fenced positive sum changes no admitted clocks", () => {
  const q = seeded();
  q.complete(cycle(10, 11, 4294967296));
  assert.equal(q.snapshot().rssLimitExceeded, false);
  q.close("12");
  const before = q.snapshot();
  q.noteLateDrop({ requestId: "r1", observedAtNs: "13", originalEndNs: "1000250000" }, 4294967297);
  const after = q.snapshot();
  assert.equal(after.rssLimitExceeded, true);
  assert.equal(after.observedPeakRssBytes, 4294967297);
  for (const field of ["peakRssBytes", "completedCycles", "lastCompleteNs", "coverageEndNs"]) {
    assert.equal(after[field], before[field]);
  }
  assert.equal(after.lateDrops.count, 1);
  assert.throws(() => q.checkpoint("12"));
  assert.equal(after.lateDrops.first.originalEndNs, "1000250000");
  q.noteLateDrop({ requestId: "r2", observedAtNs: "14", originalEndNs: "15" }, 1);
  assert.equal(q.snapshot().observedPeakRssBytes, 4294967297);
});

test("reversed/unsafe/unknown inputs and impossible snapshots fail closed", () => {
  for (const bad of [
    cycle(12, 11),
    cycle(10, 11, NaN),
    cycle(10, 11, -1),
    cycle(10, 11, 1, "-1"),
    { ...cycle(10, 11), handleLive: false },
  ]) {
    assert.throws(() => seeded().complete(bad));
  }
  const s = seeded().snapshot();
  for (const mutate of [
    (v) => (v.completedCycles = 0),
    (v) => (v.timelyCycles = 2),
    (v) => (v.rssLimitExceeded = true),
    (v) => (v.lastTimelyNs = "12"),
    (v) => (v.causeCounts.UNKNOWN = 0),
    (v) => (v.extra = true),
  ]) {
    const bad = structuredClone(s);
    mutate(bad);
    assert.throws(() => assertResourceEvidence(bad));
  }
  assert.equal(Object.isFrozen(s), true);
  const q = seeded();
  q.markHard("NATIVE");
  assert.deepEqual(q.snapshot().hardReasons, ["NATIVE"]);
  assert.throws(() => q.markHard("other"));
});

test("checkpoint and evidence size limits fail hard, never truncate", () => {
  const q = seeded();
  assert.doesNotThrow(() => assertQualityCheckpoint(q.checkpoint("10")));
  const cp = structuredClone(q.checkpoint("10"));
  cp.capturedNs = "1".repeat(1100);
  assert.throws(() => assertQualityCheckpoint(cp));
  q.complete({ ...cycle(10, 500000011), requestId: "x".repeat(66000) });
  assert.throws(() => q.snapshot());
});

test("readback rejects forged max, missing causes and incoherent coverage clocks", () => {
  const q = seeded();
  q.complete(cycle(10, 500000011));
  q.close("500000011");
  for (const mutate of [
    (v) => (v.maxGapNs = "500000002"),
    (v) => (v.causeCounts.PERIODIC_COMPLETION_GAP = 0),
    (v) => (v.lastCoverageQualifiedNs = "500000011"),
  ]) {
    const bad = structuredClone(q.snapshot());
    mutate(bad);
    assert.throws(() => assertResourceEvidence(bad));
  }
});

test("observer time cannot reverse before a reply or fence; independent ledgers stay isolated", () => {
  const a = seeded(),
    b = seeded();
  a.noteAge("600000010");
  assert.throws(() => a.noteAge("550000010"));
  assert.throws(() => a.complete(cycle(10, 500000010)));
  assert.throws(() => a.close("500000010"));
  assert.equal(b.snapshot().coverageLost, false);
  assert.equal(b.snapshot().gapCount, 0);
});

test("independent readback accepts exactly500ms tail and rejects forged500ms+1ns clean tail", () => {
  const graph = closureInput(v2Graph());
  graph.final.resourceEvidence = structuredClone(graph.final.resourceEvidence);
  graph.final.resourceEvidence.coverageEndNs = "500000010";
  graph.facts.resourceEvidence = graph.final.resourceEvidence;
  graph.finalEvent.payload.resourceEvidence = graph.final.resourceEvidence;
  assert.doesNotThrow(() => assertResourceEvidence(graph.final.resourceEvidence));
  assert.doesNotThrow(() => verifyVerdictClosure(graph));
  graph.final.resourceEvidence.coverageEndNs = "500000011";
  assert.throws(() => assertResourceEvidence(graph.final.resourceEvidence));
  assert.throws(() => verifyVerdictClosure(graph));
});

test("ledger rejects backdated capture after observer loss while genuine capture remains valid", () => {
  const q = seeded();
  q.noteAge("600000010");
  assert.throws(() => q.checkpoint("10"));
  assert.equal(q.checkpoint("600000010").gapCount, 1);
});

test("graph rejects a checkpoint reporting an episode before its retained detection time", () => {
  const q = seeded();
  q.noteAge("600000010");
  const captured = q.checkpoint("600000010");
  q.close("600000010");
  const graph = closureInput(
    v2Graph({ resourceEvidence: { ...q.snapshot(), runId: "run-compare", monitorRunId: "run-compare" } }),
  );
  const payload = {
    rssBytes: 5,
    peakRssBytes: 5,
    observedPeakRssBytes: 5,
    rssLimitExceeded: false,
    accountingValid: false,
    atMonoNs: "600000010",
    qualityCheckpoint: structuredClone(captured),
  };
  graph.checkpoints = [payload];
  assert.doesNotThrow(() => verifyVerdictClosure(graph));
  graph.checkpoints[0].atMonoNs = graph.checkpoints[0].qualityCheckpoint.capturedNs = "10";
  assert.throws(() => verifyVerdictClosure(graph));
  const futureMax = structuredClone(graph);
  Object.assign(futureMax.checkpoints[0].qualityCheckpoint, {
    gapCount: 0,
    coverageLost: false,
    causeCounts: { PERIODIC_COMPLETION_GAP: 0, PERIODIC_NATIVE_DURATION: 0, PERIODIC_OBSERVER_AGE: 0 },
  });
  assert.throws(() => verifyVerdictClosure(futureMax));
});

test("unseeded real ledger evidence cannot support strength despite a claimed monitoring-complete flag", () => {
  const resourceEvidence = { ...make().snapshot(), runId: "run-compare", monitorRunId: "run-compare" };
  const verdict = deriveVerdicts(closedFacts({ resourceEvidence }));
  assert.equal(verdict.resourceVerdict.status, "inconclusive");
  assert.equal(verdict.strengthVerdict.status, "ineligible");
  assert(verdict.strengthVerdict.reasons.includes("CLEANUP_UNPROVEN"));
});

const checkpointGraph = (q, cp) => {
  const graph = closureInput(v2Graph({ runId: "r", resourceEvidence: q.snapshot() }));
  graph.checkpoints = [
    {
      rssBytes: 5,
      peakRssBytes: 5,
      observedPeakRssBytes: 5,
      rssLimitExceeded: false,
      accountingValid: false,
      atMonoNs: cp.capturedNs,
      qualityCheckpoint: structuredClone(cp),
    },
  ];
  return graph;
};

test("later-origin episode cannot lend its future900ms maximum to a genuine600ms checkpoint", () => {
  const q = seeded();
  q.complete(cycle(10, 500000010));
  q.noteAge("1000000011");
  q.noteAge("1100000010");
  const cp = q.checkpoint("1100000010");
  assert.equal(cp.maxGapNs, "600000000");
  q.complete(cycle(500000010, 1400000010));
  q.close("1400000010");
  const graph = checkpointGraph(q, cp);
  assert.equal(q.snapshot().maxGapNs, "900000000");
  assert.doesNotThrow(() => verifyVerdictClosure(graph));
  graph.checkpoints[0].qualityCheckpoint.maxGapNs = "900000000";
  assert.throws(() => verifyVerdictClosure(graph));
});

test("a genuine checkpoint may retain a prior episode's larger completed maximum", () => {
  const q = seeded();
  q.complete(cycle(10, 1000000010));
  q.noteAge("1600000010");
  const cp = q.checkpoint("1600000010");
  assert.equal(cp.maxGapNs, "1000000000");
  q.complete(cycle(1000000010, 1900000010));
  q.close("1900000010");
  assert.doesNotThrow(() => verifyVerdictClosure(checkpointGraph(q, cp)));
});

test("dropped episodes stay unavailable while retained history bounds the possible maximum at capture", () => {
  for (const count of [66, 70]) {
    const q = seeded();
    q.complete(cycle(10, 1000000010));
    q.noteAge("2100000010");
    const cp = q.checkpoint("2100000010");
    assert.equal(cp.maxGapNs, "1100000000");
    q.complete(cycle(1000000010, 2500000010));
    const closedCp = q.checkpoint("2500000010");
    let end = 2500000010n;
    for (let ordinal = 3; ordinal <= count; ordinal += 1) {
      q.complete(cycle(end, end + 500000001n));
      end += 500000001n;
    }
    q.close(String(end));
    const final = q.snapshot();
    assert.equal(final.detailsDropped, count - 64);
    assert.equal(final.firstGap.ordinal, 1);
    assert.equal(
      final.details.some((d) => d.ordinal === 2),
      false,
    );
    const graph = checkpointGraph(q, cp);
    graph.checkpoints.push(checkpointGraph(q, closedCp).checkpoints[0]);
    assert.doesNotThrow(() => verifyVerdictClosure(graph));
    graph.checkpoints[0].qualityCheckpoint.maxGapNs = "1500000000";
    assert.throws(() => verifyVerdictClosure(graph));
  }
});
