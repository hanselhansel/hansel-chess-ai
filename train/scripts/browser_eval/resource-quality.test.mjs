import assert from "node:assert/strict";
import test from "node:test";
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
