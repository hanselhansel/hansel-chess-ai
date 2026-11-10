// TEST ONLY. Real producer/schema/graph; synthetic ledger, no Native proof.
import assert from "node:assert/strict";
import test from "node:test";
import { createResourceQuality } from "./resource-quality.mjs";
import { resourcePayload } from "./watchdog-verdict-policy.mjs";
import { assertRecord } from "./record-schema.mjs";
import { verifyVerdictClosure } from "./receipt-verdicts-v2.mjs";
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
