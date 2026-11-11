// Pure closed-fact tests. No persisted label supplies readiness authority.
import test from "node:test";
import assert from "node:assert/strict";
import { deriveScientificReadinessV3, assertScientificReadinessV3, classifyVerifiedParentV3 } from "./preflight-readiness-v3.mjs";
import { deriveVerdictsV3 } from "./verdicts-v3.mjs";
import { factsV3, qualityV3, createV3GraphFixture } from "./preflight-v3-test-fixtures.mjs";

test("V3 completed quality loss retains ready science and literal failed resources/2", () => {
  const facts = factsV3({ resourceEvidence: qualityV3({ gap: true }) });
  assert.deepEqual(deriveScientificReadinessV3(facts), { status: "ready", reasons: [] });
  const result = deriveVerdictsV3(facts);
  assert.equal(result.status, "inconclusive");
  assert.equal(result.exitCode, 2);
  assert.equal(result.resourceVerdict.status, "failed");
  assert.deepEqual(result.resourceVerdict.reasons, ["COVERAGE_GAP"]);
  assert.equal(result.closureResourceVerdict.status, "failed");
});

test("readiness evaluates every overlapping reason and rejects malformed facts", () => {
  const facts = factsV3();
  Object.assign(facts, { identityProven: false, selftestProven: false, nativeProven: false,
    monitoringComplete: false, cleanupProven: false, recordsProven: false, storeProven: false,
    hardFaultCount: 1, preflightEvidence: null });
  facts.prerequisiteAdmissions[0].scientificAdmissible = false;
  facts.prerequisitesProven = false;
  assert.deepEqual(deriveScientificReadinessV3(facts).reasons, ["CLEANUP_UNPROVEN", "HARD_STOP",
    "IDENTITY_UNPROVEN", "MONITORING_UNPROVEN", "NATIVE_UNPROVEN", "PREREQUISITE_UNPROVEN",
    "RECORDS_UNPROVEN", "SCIENTIFIC_CHECK_UNPROVEN", "SELFTEST_UNPROVEN", "STORE_UNPROVEN"]);
  for (const key of Object.keys(facts)) {
    const bad = structuredClone(facts); delete bad[key];
    assert.throws(() => deriveScientificReadinessV3(bad), undefined, key);
  }
  for (const bad of [{ status: "ready", reasons: ["HARD_STOP"] }, { status: "unready", reasons: [] },
    { status: "unready", reasons: ["HARD_STOP", "HARD_STOP"] },
    { status: "not-applicable", reasons: ["NOT_COMPARISON"] }])
    assert.throws(() => assertScientificReadinessV3(bad));
});

test("scientific compare admission preserves the actual failed preflight resource", async (t) => {
  const f = await createV3GraphFixture(t);
  const admission = classifyVerifiedParentV3({ forPhase: "compare", expectedIdentity: f.workspace.commonIdentity,
    evidence: f.preflight });
  assert.equal(admission.scientificAdmissible, true);
  assert.equal(admission.resourceVerdict.status, "failed");
  assert.deepEqual(admission.resourceVerdict, f.preflight.final.resourceVerdict);
  const facts = factsV3({ phase: "compare" });
  facts.prerequisiteAdmissions[2] = admission;
  facts.prerequisiteResources[2] = admission.resourceVerdict;
  const result = deriveVerdictsV3(facts);
  assert.equal(result.strengthVerdict.status, "eligible");
  assert.equal(result.resourceVerdict.status, "passed");
  assert.equal(result.closureResourceVerdict.status, "failed");
  assert.deepEqual(result.closureResourceVerdict.reasons, ["COVERAGE_GAP", "PREREQUISITE_RESOURCE_FAILURE"]);
  assert.equal(result.exitCode, 2);
  for (const mutate of [v => { v.final.scientificReadinessVerdict.status = "unready"; },
    v => { v.final.resourceVerdict.reasons.push("RSS_CAP"); }, v => { v.final.resourceEvidence.pending = true; }]) {
    const bad = structuredClone(f.preflight); mutate(bad);
    assert.equal(classifyVerifiedParentV3({ forPhase: "compare", expectedIdentity: f.workspace.commonIdentity,
      evidence: bad }).scientificAdmissible, false);
  }
});

test("full cohort remains mandatory after a soft loss", () => {
  for (const completedGames of [0, 39]) {
    const result = deriveVerdictsV3(factsV3({ phase: "compare", completedGames,
      completedPairs: completedGames === 39 ? 19 : 0,
      resourceEvidence: qualityV3({ phase: "compare", gap: true }) }));
    assert.equal(result.strengthVerdict.status, "ineligible");
    assert.equal(result.analysisEligible, undefined);
  }
});

import { validatePreflightEvidenceV3 } from "./preflight-evidence-v3.mjs";
import { detachedInputForFixture } from "./preflight-v3-test-fixtures.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
test("pure preflight validator rejects complete detached semantic and tuple forgeries", async (t) => {
  const f = await createV3GraphFixture(t);
  const valid = await detachedInputForFixture(f);
  assert(validatePreflightEvidenceV3(valid).checks.every((check) => check.status === "passed"));
  const rebind = (input, entry) => {
    const bytes = canonicalBytes(entry.value);
    entry.ref = { ...entry.ref, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    input.inventory[input.inventory.findIndex((ref) => ref.path === entry.ref.path)] = entry.ref;
  };
  const mutations = [
    input => { input.observations[15].value.response.visits = 63; rebind(input, input.observations[15]); },
    input => { input.observations[0].value.delivery.sha256 = "0".repeat(64); rebind(input, input.observations[0]); },
    input => { input.observations[1].value.response.result.uci = "e2e5"; rebind(input, input.observations[1]); },
    input => { input.events.find(event => event.kind === "operation").payload.result.status = "failed"; },
    input => { input.observations[2].ref.path = input.observations[0].ref.path; },
    input => { input.throughput.value.timings.candidate.latenciesMs.pop(); rebind(input, input.throughput); },
    input => { input.throughput.value.timings.candidate.medianMs += 1; rebind(input, input.throughput); },
    input => { input.throughput.value.estimate.comparisonCeilingMs += 1; rebind(input, input.throughput); },
    input => { input.aaReplays[0].replay.result = "1-0"; },
    input => { input.aaReplays[1].gameId = "aa-g1"; },
    input => { input.aaReplays[0].replayedBytes.sha256 = "0".repeat(64); },
    input => { input.aaReplays[0].replay.movesUci = ["e2e4"]; },
    input => { input.summary.gameEvidence.games[0].checkpoint.fen = "invalid";
      input.aaReplays[0].replay.fen = "invalid"; },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(valid);
    mutate(input);
    assert(validatePreflightEvidenceV3(input).checks.some((check) => check.status === "failed"));
  }
  const missingEighth = structuredClone(valid);
  missingEighth.observations.splice(15, 1);
  assert.throws(() => validatePreflightEvidenceV3(missingEighth));
  const extra = { ...structuredClone(valid), replayPromise: Promise.resolve({}) };
  assert.throws(() => validatePreflightEvidenceV3(extra));
});


import { createResourceQuality } from "./resource-quality.mjs";
import { V2_POLICY, V3_POLICY } from "./evaluation-policy.mjs";
const admittedCycle = { startedNs: "0", finishedNs: "10", nativeMaxDurationNs: "1",
  rssBytes: 4, requestId: "bootstrap", handleLive: true };

test("V3 observed-only method preserves exact V2 API and never supplies admission", () => {
  const oldKeys = ["bootstrap", "complete", "noteAge", "setPending", "close", "noteLateDrop", "markHard", "snapshot", "checkpoint"];
  for (const options of [{}, { evaluationPolicy: V2_POLICY }]) {
    const q = createResourceQuality({ runId: "R1", phase: "preflight", ...options });
    assert.deepEqual(Object.keys(q), oldKeys);
    assert.equal(q.noteObservedAggregate, undefined);
  }
  for (const seeded of [false, true]) {
    const q = createResourceQuality({ runId: "R1", phase: "preflight", evaluationPolicy: V3_POLICY });
    assert.deepEqual(Object.keys(q), ["noteObservedAggregate", ...oldKeys]);
    if (seeded) q.bootstrap(admittedCycle);
    assert.throws(() => q.noteObservedAggregate(4294967297));
    q.markHard("NATIVE");
    const before = q.snapshot();
    for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "4294967297", null])
      assert.throws(() => q.noteObservedAggregate(invalid));
    q.noteObservedAggregate(4294967296);
    assert.equal(q.snapshot().rssLimitExceeded, false);
    q.noteObservedAggregate(4294967297);
    const after = q.snapshot();
    assert.equal(after.rssLimitExceeded, true);
    for (const key of ["peakRssBytes", "completedCycles", "timelyCycles", "lastCompleteNs", "lastTimelyNs", "lastCoverageQualifiedNs", "coverageEndNs"])
      assert.equal(after[key], before[key]);
    assert.equal(after.coverageLost, false);
    assert.equal(after.lateDrops.count, 0);
    const facts = factsV3({ runId: "R1", resourceEvidence: after, nativeProven: false, hardFaultCount: 1 });
    assert.equal(deriveScientificReadinessV3(facts).status, "unready");
    assert.notEqual(deriveVerdictsV3(facts).strengthVerdict.status, "eligible");
  }
  const prefix = createResourceQuality({ runId: "R1:watchdog-selftest", monitorRunId: "R1",
    phase: "watchdog-selftest", evaluationPolicy: V3_POLICY });
  prefix.markHard("NATIVE");
  assert.throws(() => prefix.noteObservedAggregate(4294967297));
});
