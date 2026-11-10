// TEST ONLY. Real producer/schema/graph; synthetic ledger, no Native proof.
import assert from "node:assert/strict";
import test from "node:test";
import { createResourceQuality, assertQualityCheckpoint, assertResourceEvidence } from "./resource-quality.mjs";
import { resourcePayload, createWatchdogResourceChecks } from "./watchdog-verdict-policy.mjs";
import { assertRecord } from "./record-schema.mjs";
import { verifyVerdictClosure, verifyResourcePrefixExtension } from "./receipt-verdicts-v2.mjs";
import { closureInput, v2Graph } from "./separate-verdicts-test-fixtures.mjs";

const schemaError = (error) => error.code === "SCHEMA_COHERENCE";

function capturedResource({ capturedNs = "12", fenceNs = "14" } = {}) {
  const ledger = createResourceQuality({ runId: "run-compare", phase: "compare" });
  ledger.bootstrap({ startedNs: "0", finishedNs: "10", nativeMaxDurationNs: "1",
    rssBytes: 4, requestId: "bootstrap", handleLive: true });
  const observation = { rssBytes: 4, peakRssBytes: 4, observedPeakRssBytes: 4,
    rssLimitExceeded: false, accountingValid: true, atMonoNs: "10",
    resourceQuality: ledger.snapshot() };
  const payload = resourcePayload(observation, capturedNs);
  ledger.close(fenceNs);
  const graph = closureInput(v2Graph({ resourceEvidence: ledger.snapshot() }));
  graph.checkpoints = [payload];
  const event = { ...graph.finalEvent, payload };
  return { observation, payload, graph, event };
}

test("real resource producer preserves cycle completion before later checkpoint capture", () => {
  const { observation, payload, graph, event } = capturedResource();
  assert.equal(observation.atMonoNs, "10");
  assert.equal(payload.atMonoNs, "10");
  assert.equal(payload.qualityCheckpoint.lastCompleteNs, "10");
  assert.equal(payload.qualityCheckpoint.lastTimelyNs, "10");
  assert.equal(payload.qualityCheckpoint.capturedNs, "12");
  assert.equal(graph.final.resourceEvidence.coverageEndNs, "14");
  assert.notEqual(payload.atMonoNs, payload.qualityCheckpoint.capturedNs);
  assert.doesNotThrow(() => assertRecord("event", event));
  assert.equal(verifyVerdictClosure(graph).resourceVerdict.status, "passed");
});

test("resource schema rejects observation time forged to capture or another cycle", () => {
  for (const falseObservation of ["12", "9", "11"]) {
    const { event } = capturedResource();
    event.payload.atMonoNs = falseObservation;
    assert.throws(() => assertRecord("event", event), schemaError);
  }
});

test("resource schema rejects capture before actual last completion and unknown fields", () => {
  const { event } = capturedResource();
  event.payload.qualityCheckpoint.capturedNs = "9";
  assert.throws(() => assertRecord("event", event), schemaError);
  const unknown = capturedResource().event;
  unknown.payload.qualityCheckpoint.inventedClock = "12";
  assert.throws(() => assertRecord("event", unknown), (error) => /^SCHEMA_/.test(error.code));
});

test("later checkpoint capture remains invalid beyond the actual final sampling fence", () => {
  // This preserves the existing capture11/finalFence10 graph negative while
  // making its observation10/capture11 payload independently schema-valid.
  const { payload, graph, event } = capturedResource({ capturedNs: "11", fenceNs: "10" });
  assert.equal(payload.atMonoNs, "10");
  assert.equal(payload.qualityCheckpoint.capturedNs, "11");
  assert.equal(graph.final.resourceEvidence.coverageEndNs, "10");
  assert.doesNotThrow(() => assertRecord("event", event));
  assert.throws(() => verifyVerdictClosure(graph), (error) =>
    schemaError(error) && /checkpoint after sampling fence/.test(error.message));
});

const cycle = (start, end, rss = 4, native = "1") => ({ startedNs: String(start),
  finishedNs: String(end), rssBytes: rss, nativeMaxDurationNs: native,
  requestId: `cycle-${end}`, handleLive: true });
const seeded = () => {
  const ledger = createResourceQuality({ runId: "run-compare", phase: "compare" });
  ledger.bootstrap(cycle(100, 110));
  return ledger;
};
const checkpoint = (ledger, captured, rss = 4) => {
  const q = ledger.snapshot();
  return resourcePayload({ rssBytes: rss, peakRssBytes: q.peakRssBytes,
    observedPeakRssBytes: q.observedPeakRssBytes, rssLimitExceeded: q.rssLimitExceeded,
    accountingValid: true, atMonoNs: q.lastCompleteNs, resourceQuality: q }, String(captured));
};
const graphAt = (evidence, checkpoints = []) => {
  const graph = closureInput(v2Graph({ resourceEvidence: evidence }));
  graph.checkpoints = checkpoints;
  return graph;
};

test("graph rejects checkpoint completion before the final ledger start", () => {
  const ledger = seeded();
  const valid = checkpoint(ledger, 115);
  ledger.complete(cycle(115, 120)); ledger.close("140");
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(ledger.snapshot(), [valid])));
  const foreign = createResourceQuality({ runId: "run-compare", phase: "compare" });
  foreign.bootstrap(cycle(80, 90));
  const beforeStart = checkpoint(foreign, 115);
  assert.doesNotThrow(() => assertRecord("event", { ...capturedResource().event, payload: beforeStart }));
  assert.throws(() => verifyVerdictClosure(graphAt(ledger.snapshot(), [beforeStart])), schemaError);
});

for (const [name, mutate] of [
  ["timely count", v => { v.timelyCycles = 1; }],
  ["timely clock", v => { v.lastTimelyNs = "110"; }],
]) test(`seeded continuous checkpoint rejects unequal ${name}`, () => {
  const ledger = seeded(); ledger.complete(cycle(110, 120));
  const payload = checkpoint(ledger, 125); ledger.close("140");
  const evidence = ledger.snapshot();
  assert.doesNotThrow(() => assertQualityCheckpoint(payload.qualityCheckpoint));
  assert.doesNotThrow(() => assertResourceEvidence(evidence));
  const cp = structuredClone(payload.qualityCheckpoint); mutate(cp);
  assert.throws(() => assertQualityCheckpoint(cp), schemaError);
});

for (const [name, mutate] of [
  ["timely count", v => { v.timelyCycles = 1; }],
  ["timely clock", v => { v.lastTimelyNs = "110"; v.lastCoverageQualifiedNs = "110"; }],
  ["qualified clock", v => { v.lastCoverageQualifiedNs = "110"; }],
  ["observed peak", v => { v.observedPeakRssBytes = 5; }],
]) test(`seeded continuous full evidence rejects unequal ${name} without checkpoints`, () => {
  const ledger = seeded(); ledger.complete(cycle(110, 120)); ledger.close("140");
  const evidence = ledger.snapshot();
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(evidence)));
  const forged = structuredClone(evidence); mutate(forged);
  assert.throws(() => assertResourceEvidence(forged), schemaError);
  assert.throws(() => verifyVerdictClosure(graphAt(forged)), schemaError);
});

test("seeded checkpoint cannot omit its timely bootstrap", () => {
  const ledger = seeded(); ledger.complete(cycle(110, 120, 4, "500000001"));
  const cp = checkpoint(ledger, 125).qualityCheckpoint;
  assert.doesNotThrow(() => assertQualityCheckpoint(cp));
  cp.timelyCycles = 0;
  assert.throws(() => assertQualityCheckpoint(cp), schemaError);
});

test("graph rejects two timely admissions from one new completion", () => {
  const ledger = seeded();
  ledger.complete(cycle(110, 120, 4, "500000001"));
  ledger.complete(cycle(120, 130, 4, "500000001"));
  const before = checkpoint(ledger, 135);
  ledger.complete(cycle(135, 140)); ledger.close("150");
  const e = ledger.snapshot();
  assert.equal(before.qualityCheckpoint.completedCycles, 3);
  assert.equal(before.qualityCheckpoint.timelyCycles, 1);
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(e, [before])));
  const forged = structuredClone(e); forged.timelyCycles = 3;
  assert.throws(() => verifyVerdictClosure(graphAt(forged, [before])), schemaError);
});

test("graph rejects timely-clock movement without another timely admission", () => {
  const ledger = seeded(), before = checkpoint(ledger, 115);
  ledger.complete(cycle(115, 120, 4, "500000001")); ledger.close("140");
  const e = ledger.snapshot();
  assert.equal(e.timelyCycles, 1); assert.equal(e.lastTimelyNs, "110");
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(e, [before])));
  const forged = structuredClone(e); forged.lastTimelyNs = "120";
  assert.throws(() => verifyVerdictClosure(graphAt(forged, [before])), schemaError);
});

for (const peak of ["observedPeakRssBytes", "peakRssBytes"]) {
 test(`final ${peak} cannot increase without another observation`, () => {
  const ledger = seeded(), before = checkpoint(ledger, 115);
  ledger.close("140");
  const e = ledger.snapshot();
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(e, [before])));
  const changed = structuredClone(e); changed.observedPeakRssBytes = 5; changed[peak] = 5;
  assert.throws(() => verifyVerdictClosure(graphAt(changed, [before])), schemaError);
 });
 test(`checkpoint ${peak} cannot increase without another observation`, () => {
  const ledger = seeded(), before = checkpoint(ledger, 115), later = checkpoint(ledger, 120);
  ledger.close("140");
  const changed = structuredClone(ledger.snapshot()); changed.observedPeakRssBytes = 5; changed[peak] = 5;
  const changedPayload = structuredClone(later);
  changedPayload.observedPeakRssBytes = 5; changedPayload[peak] = 5;
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(ledger.snapshot(), [before, later])));
  assert.throws(() => verifyVerdictClosure(graphAt(changed, [before, changedPayload])), schemaError);
 });
}

test("admitted peak growth requires timely admission even when a new untimely cycle completed", () => {
  const untimely = seeded(), first = checkpoint(untimely, 115);
  untimely.complete(cycle(115, 120, 5, "500000001")); untimely.close("140");
  const genuine = untimely.snapshot();
  assert.equal(genuine.peakRssBytes, 4); assert.equal(genuine.observedPeakRssBytes, 5);
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(genuine, [first])));
  const admitted = structuredClone(genuine); admitted.peakRssBytes = 5;
  assert.throws(() => verifyVerdictClosure(graphAt(admitted, [first])), schemaError);
});

test("age-only loss permits no-completion checkpoints but cannot grow ordinary observed peak", () => {
  const aged = seeded(), ageBefore = checkpoint(aged, 115);
  aged.noteAge("500000111"); aged.close("500000111");
  const ageOnly = aged.snapshot();
  assert.equal(ageOnly.completedCycles, 1); assert.equal(ageOnly.coverageLost, true);
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(ageOnly, [ageBefore])));
  const unseen = structuredClone(ageOnly); unseen.observedPeakRssBytes = 5;
  assert.doesNotThrow(() => assertResourceEvidence(unseen));
  assert.throws(() => verifyVerdictClosure(graphAt(unseen, [ageBefore])), schemaError);
});

for (const mutation of ["admitted", "no-late"]) {
 test(`final late positive cap preserves counters but rejects ${mutation} peak forgery`, () => {
  const ledger = seeded(), before = checkpoint(ledger, 115);
  ledger.close("140");
  ledger.noteLateDrop({ requestId: "actual-drain", observedAtNs: "150", originalEndNs: "140" }, 4294967297);
  const e = ledger.snapshot();
  assert.equal(e.completedCycles, 1); assert.equal(e.timelyCycles, 1);
  assert.equal(e.peakRssBytes, 4); assert.equal(e.observedPeakRssBytes, 4294967297);
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(e, [before])));
  const forged = structuredClone(e);
  if (mutation === "admitted") forged.peakRssBytes = 4294967297;
  else forged.lateDrops = { count: 0, first: null, last: null };
  assert.throws(() => verifyVerdictClosure(graphAt(forged, [before])), schemaError);
 });
}

for (const mutation of ["observedPeakRssBytes", "peakRssBytes", "timely-clock"]) {
 test(`prefix extension applies the same ${mutation} guard`, () => {
  const ledger = seeded(); ledger.setPending(true); ledger.close("115");
  const prefix = { ...ledger.snapshot(), runId: "run-compare:watchdog-selftest",
    phase: "watchdog-selftest", closureKind: "selftest-prefix" };
  const parent = { ...ledger.snapshot(), pending: false, coverageEndNs: "140" };
  assert.doesNotThrow(() => verifyResourcePrefixExtension(prefix, parent));
  if (mutation !== "timely-clock") {
    const forged = structuredClone(parent); forged.observedPeakRssBytes = 5; forged[mutation] = 5;
    assert.throws(() => verifyResourcePrefixExtension(prefix, forged), schemaError);
    return;
  }
  const continuing = seeded(); continuing.complete(cycle(115, 120, 4, "500000001"));
  continuing.close("140");
  const untimely = continuing.snapshot();
  assert.doesNotThrow(() => verifyResourcePrefixExtension(prefix, untimely));
  const moved = structuredClone(untimely); moved.lastTimelyNs = "120";
  assert.throws(() => verifyResourcePrefixExtension(prefix, moved), schemaError);
 });
}

test("ordinary resource current RSS cannot hide above its observed peak", () => {
  const { event, graph } = capturedResource();
  assert.doesNotThrow(() => assertRecord("event", event));
  event.payload.rssBytes = 4294967297;
  assert.throws(() => assertRecord("event", event), schemaError);
  graph.checkpoints = [event.payload];
  assert.throws(() => verifyVerdictClosure(graph), schemaError);
});

for (const key of ["rssBytes", "peakRssBytes", "observedPeakRssBytes"]) {
  test(`seeded ordinary resource requires numeric ${key}`, () => {
    const missing = capturedResource().event;
    assert.doesNotThrow(() => assertRecord("event", missing));
    missing.payload[key] = null;
    assert.throws(() => assertRecord("event", missing), schemaError);
  });
}

test("untimely current RSS may exceed admitted peak when observed peak covers it", () => {
  const ledger = seeded(); ledger.complete(cycle(110, 120, 5, "500000001"));
  const payload = checkpoint(ledger, 125, 5); ledger.close("140");
  assert.equal(payload.peakRssBytes, 4); assert.equal(payload.observedPeakRssBytes, 5);
  assert.doesNotThrow(() => assertRecord("event", { ...capturedResource().event, payload }));
  assert.doesNotThrow(() => verifyVerdictClosure(graphAt(ledger.snapshot(), [payload])));
});

test("ordinary cap diagnostic selects observed v2 peak and faults once through the original latch", () => {
  const ledger = seeded(); ledger.complete(cycle(110, 120, 4294967297, "500000001"));
  const q = ledger.snapshot(), faults = [];
  const state = { stopReq: null, finishReq: null, records: null };
  const monitor = { fault: () => null, lastObservation: () => ({ rssBytes: 4294967297,
    peakRssBytes: 4, observedPeakRssBytes: 4294967297, rssLimitExceeded: true,
    accountingValid: true, snapshotComplete: true, cycleTimely: false, resourceQuality: q }) };
  const checks = createWatchdogResourceChecks({ monitor, state, evaluationPolicy: {
    policyId: "tinyaz-separate-verdicts-v2", recordSchemaVersion: 2, softPhase: "compare" },
    phase: "compare", nowNs: () => "125", recordFault: error => faults.push(error),
    latchStop: reason => { state.stopReq ??= { reason }; },
    makeError: (code, detail) => Object.assign(new Error(detail), { code }) });
  assert.equal(checks.rssExceeded(), true);
  assert.equal(faults.length, 1); assert.equal(faults[0].code, "RESOURCE_RSS");
  assert.equal(faults[0].message, "peak 4294967297");
  assert.equal(state.stopReq.reason, "RESOURCE_RSS");
  checks.rssExceeded(); checks.stopFinishOnOverage();
  assert.equal(faults.length, 1);
});

test("default v1 RSS getter remains observational while finish still stops a newly known cap", () => {
  const faults = [], events = [];
  const state = { stopReq: null, finishReq: null,
    records: { recordEvent: async (kind, payload) => { events.push({ kind, payload }); } } };
  const observation = { rssBytes: 5, peakRssBytes: 4294967297,
    rssLimitExceeded: true, accountingValid: true, atMonoNs: "120" };
  const checks = createWatchdogResourceChecks({ monitor: { lastObservation: () => observation }, state,
    recordFault: error => faults.push(error), latchStop: reason => { state.stopReq ??= { reason }; },
    makeError: (code, detail) => Object.assign(new Error(detail), { code }) });
  assert.equal(checks.rssExceeded(), true);
  assert.equal(state.stopReq, null); assert.equal(faults.length, 0); assert.equal(events.length, 0);
  state.finishReq = { requestedStatus: "passed" };
  assert.equal(checks.stopFinishOnOverage(), true);
  assert.equal(state.stopReq.reason, "RESOURCE_RSS"); assert.equal(faults.length, 1);
  assert.equal(faults[0].message, "peak 4294967297");
  assert.deepEqual(events, [{ kind: "resource", payload: observation }]);
});
