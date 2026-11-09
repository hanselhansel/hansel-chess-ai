import assert from "node:assert/strict";
import test from "node:test";
import { RECORD_FIELDS } from "./record-fields.mjs";
import V1_PROTOCOL from "../../fixtures/browser-protocol.json" with { type: "json" };
import { assertCommonIdentity, assertRecord } from "./record-schema.mjs";
import { fixtureCommonIdentity } from "./test-fixtures.mjs";

test("explicit v2 identity binds its prospective protocol and policy", () => {
  const identity = structuredClone(fixtureCommonIdentity());
  identity.evaluationPolicy = {
    policyId: "tinyaz-separate-verdicts-v2",
    recordSchemaVersion: 2,
    softPhase: "compare",
  };
  identity.fixtures.protocol.path = "train/fixtures/browser-protocol-v2.json";
  assert.doesNotThrow(() => assertCommonIdentity(identity));
  assert.doesNotThrow(() =>
    assertRecord("workspace", {
      schemaVersion: 2,
      workspaceId: "test-v2",
      commonIdentity: identity,
    }),
  );
});

import { promises as fsp } from "node:fs";
import path from "node:path";
import { V2_POLICY, assertPolicyBinding, policyForProtocol } from "./evaluation-policy.mjs";
import { assertVerdicts, deriveVerdicts } from "./verdicts-v2.mjs";
import { verifyVerdictClosure } from "./receipt-verdicts-v2.mjs";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createPhaseRecorder } from "./records.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { fixtureManifest, fixtureRunning, makeWorkspace, runReceiptPhase, verifyCallbacks } from "./test-fixtures.mjs";
import { closedFacts, closureInput, quality, v2Graph, v2Workspace } from "./separate-verdicts-test-fixtures.mjs";

const invalid = (f) => assert.throws(f, (e) => /^SCHEMA_/.test(e.code));
const copy = (value) => JSON.parse(JSON.stringify(value));
const workspaceForTest = async (t, readRecorder = () => null) => {
  const env = await makeWorkspace();
  t.after(async () => {
    await readRecorder()?.closeIncompleteEvidence();
    await artifactStoreLifetime(env.store).whenSettled();
    await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  return env;
};

test("closed identity rejects mixed/missing/unknown policy, version and fixture selection", () => {
  const ws = v2Workspace();
  assertRecord("workspace", ws);
  for (const mutate of [
    (v) => delete v.commonIdentity.evaluationPolicy,
    (v) => (v.schemaVersion = 1),
    (v) => (v.schemaVersion = 3),
    (v) => (v.commonIdentity.evaluationPolicy.softPhase = "check"),
    (v) => (v.commonIdentity.evaluationPolicy.extra = true),
    (v) => (v.commonIdentity.fixtures.protocol.path = "train/fixtures/browser-protocol.json"),
  ]) {
    const bad = copy(ws);
    mutate(bad);
    invalid(() => assertRecord("workspace", bad));
  }
  invalid(() =>
    assertPolicyBinding({
      schemaVersion: 2,
      evaluationPolicy: null,
      protocolPath: "train/fixtures/browser-protocol-v2.json",
    }),
  );
  assert.equal(policyForProtocol(V1_PROTOCOL), null);
  assert.equal(
    policyForProtocol(
      { ...V1_PROTOCOL, schemaVersion: 2, evaluationPolicy: V2_POLICY },
      "train/fixtures/browser-protocol-v2.json",
    ),
    V2_POLICY,
  );
});

test("all fatal-matrix rows reduce independent strength/resource/aggregate outcomes", () => {
  const cases = [
    [{}, "eligible", "passed", "passed", 0],
    [{ resourceEvidence: quality({ gap: true }) }, "eligible", "inconclusive", "inconclusive", 2],
    [{ resourceEvidence: quality({ gap: true, cap: true }) }, "ineligible", "failed", "inconclusive", 2],
    [
      { cleanupProven: false, nativeProven: false, identityProven: false, storeProven: false, recordsProven: false },
      "ineligible",
      "inconclusive",
      "inconclusive",
      2,
    ],
    [{ scienceProven: false, provenViolation: true }, "ineligible", "passed", "failed", 1],
    [
      { completedGames: 6, completedPairs: 3, cohortProven: false, stats: null },
      "ineligible",
      "passed",
      "inconclusive",
      2,
    ],
    [{ phase: "check" }, "not-applicable", "passed", "passed", 0],
    [
      {
        phase: "check",
        resourceEvidence: quality({ phase: "check", gap: true }),
        hardFaultCount: 1,
        stoppedEarly: true,
      },
      "not-applicable",
      "inconclusive",
      "inconclusive",
      2,
    ],
    [{ abandoned: true }, "ineligible", "passed", "abandoned", 2],
    [{ abandoned: true, provenViolation: true }, "ineligible", "passed", "failed", 1],
    [
      { workspaceLimitExceeded: true, resourceEvidence: quality({ gap: true }) },
      "ineligible",
      "failed",
      "inconclusive",
      2,
    ],
    [{ resourceEvidence: quality({ pending: true }) }, "ineligible", "inconclusive", "inconclusive", 2],
  ];
  cases.push([{ monitoringComplete: false }, "ineligible", "inconclusive", "inconclusive", 2]);
  cases.push([{ checksPassed: false }, "ineligible", "passed", "inconclusive", 2]);
  cases.push([
    { phase: "check", resourceEvidence: { ...quality({ phase: "check" }), hardReasons: ["SCIENCE"] } },
    "not-applicable",
    "passed",
    "inconclusive",
    2,
  ]);
  for (const [changes, strength, resource, status, exitCode] of cases) {
    const v = deriveVerdicts(closedFacts(changes));
    assert.deepEqual(
      [v.strengthVerdict.status, v.resourceVerdict.status, v.status, v.exitCode],
      [strength, resource, status, exitCode],
    );
    if (strength !== "eligible") assert.equal(v.strengthVerdict.classification, null);
  }
  const mixed = deriveVerdicts(
    closedFacts({ resourceEvidence: quality({ gap: true, cap: true }), nativeProven: false }),
  );
  assert.deepEqual(mixed.resourceVerdict.reasons, ["COVERAGE_GAP", "NATIVE_UNPROVEN", "RSS_CAP"]);
  assert(mixed.strengthVerdict.reasons.includes("HARD_STOP"));
});

test("resource closure unions graph refs and priority without hiding parent gaps", () => {
  const parent = deriveVerdicts(
    closedFacts({ phase: "check", resourceEvidence: quality({ phase: "check", gap: true }) }),
  ).resourceVerdict;
  const v = deriveVerdicts(closedFacts({ prerequisiteResources: [parent] }));
  assert.equal(v.strengthVerdict.status, "ineligible");
  assert(v.strengthVerdict.reasons.includes("PREREQUISITE_UNPROVEN"));
  assert.equal(v.resourceVerdict.status, "passed");
  assert.equal(v.closureResourceVerdict.status, "inconclusive");
  assert.deepEqual(v.closureResourceVerdict.phaseRunIds, ["run-check", "run-compare"]);
  assert.deepEqual(
    v.closureResourceVerdict.resourceEvidenceRefs.map((r) => r.path),
    ["check/events.jsonl", "compare/events.jsonl"],
  );
  invalid(() => deriveVerdicts({ ...closedFacts(), unknown: true }));
  const missing = closedFacts();
  delete missing.cleanupProven;
  invalid(() => deriveVerdicts(missing));
  const forged = copy(v);
  forged.closureResourceVerdict.reasons = [];
  invalid(() => assertVerdicts(forged));
});

test("every v2 record kind is closed and retains original limits/checks/environment guards", () => {
  const graph = v2Graph();
  const records = {
    workspace: graph.ws,
    manifest: graph.manifest,
    final: graph.final,
    completion: graph.completion,
    event: graph.finalEvent,
    running: {
      schemaVersion: 2,
      workspaceId: graph.ws.workspaceId,
      runId: graph.final.runId,
      phase: "compare",
      commonIdentitySha256: graph.final.commonIdentitySha256,
      supervisor: { pid: 1, startSec: "1", startUsec: 0 },
      startedAtUtc: "2026-11-10T00:00:00Z",
    },
  };
  for (const [kind, record] of Object.entries(records)) {
    assert.doesNotThrow(() => assertRecord(kind, record));
    invalid(() => assertRecord(kind, { ...record, unknown: true }));
    const missing = copy(record);
    delete missing.workspaceId;
    invalid(() => assertRecord(kind, missing));
    invalid(() => assertRecord(kind, { ...record, schemaVersion: 8 }));
  }
  const bad = copy(graph.manifest);
  bad.limits.timing.cleanupMs = 6000;
  invalid(() => assertRecord("manifest", bad));
  const policy = copy(graph.final);
  delete policy.evaluationPolicy;
  invalid(() => assertRecord("final", policy));
  const infer = copy(graph.final);
  infer.analysisEligible = false;
  invalid(() => assertRecord("final", infer));
  const dirty = copy(graph.final);
  dirty.cleanup.verified = false;
  invalid(() => assertRecord("final", dirty));
});

test("pure graph verification requires exact final event, scope, reducer and completion equality", () => {
  const graph = closureInput(v2Graph({ resourceEvidence: quality({ gap: true }) }));
  assert.equal(verifyVerdictClosure(graph).strengthVerdict.status, "eligible");
  for (const mutate of [
    (g) => (g.finalEvent.payload.resourceEvidence.gapCount = 0),
    (g) => (g.completion.strengthVerdict.completedGames = 39),
    (g) => (g.final.resourceVerdict.resourceEvidenceRefs[0].sha256 = "f".repeat(64)),
    (g) => (g.completion.schemaVersion = 1),
    (g) => (g.finalEvent.kind = "operation"),
    (g) => (g.final.resourceEvidence.pending = true),
    (g) => (g.facts.cleanupProven = false),
    (g) => (g.final.cleanup.verified = false),
    (g) => (g.final.cleanup.accountingValid = false),
    (g) => (g.final.unplannedFaultCount = 1),
  ]) {
    const bad = copy(graph);
    mutate(bad);
    invalid(() => verifyVerdictClosure(bad));
  }
});

test("checkpoint regression, invented clocks and lost cap fail graph reconciliation", () => {
  const g = closureInput(v2Graph());
  const e = g.final.resourceEvidence;
  const cp = {
    capturedNs: "10",
    completedCycles: 1,
    timelyCycles: 1,
    gapCount: 0,
    causeCounts: copy(e.causeCounts),
    maxGapNs: "0",
    coverageLost: false,
    pending: false,
    lastCompleteNs: "10",
    lastTimelyNs: "10",
    lateDropCount: 0,
  };
  const payload = {
    rssBytes: 4,
    peakRssBytes: 4,
    observedPeakRssBytes: 4,
    rssLimitExceeded: false,
    accountingValid: true,
    atMonoNs: "10",
    qualityCheckpoint: cp,
  };
  g.checkpoints = [payload];
  assert.doesNotThrow(() => verifyVerdictClosure(g));
  for (const mutate of [
    (p) => (p.qualityCheckpoint.completedCycles = 2),
    (p) => (p.qualityCheckpoint.lateDropCount = 1),
    (p) => (p.observedPeakRssBytes = 4294967297),
    (p) => (p.qualityCheckpoint.capturedNs = "11"),
  ]) {
    const bad = copy(g);
    mutate(bad.checkpoints[0]);
    invalid(() => verifyVerdictClosure(bad));
  }
});

test("selftest prefix explicitly scopes parent pending and cannot claim parent completion", () => {
  const phase = "watchdog-selftest",
    runId = "parent:watchdog-selftest";
  const graph = closureInput(
    v2Graph({ phase, runId, resourceEvidence: quality({ phase, runId, pending: true }), stoppedEarly: true }),
  );
  const v = verifyVerdictClosure(graph);
  assert.equal(v.resourceVerdict.scope, "selftest-prefix");
  assert.equal(v.resourceVerdict.status, "passed");
  assert.equal(v.strengthVerdict.status, "not-applicable");
  const bad = copy(graph);
  bad.final.resourceEvidence.monitorRunId = "other-parent";
  invalid(() => verifyVerdictClosure(bad));
});

test("v1 real Recorder/Store/prepared publication and golden readback preserve bytes and meaning", async (t) => {
  const env = await workspaceForTest(t);
  const { completionRef } = await runReceiptPhase({ env, phase: "check" });
  const ev = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  const bytes = await fsp.readFile(path.join(env.workspaceRoot, "check/completion.json"));
  assert.equal(sha256Bytes(bytes), completionRef.sha256);
  assert.deepEqual(canonicalBytes(ev.completion), bytes);
  assert.deepEqual(
    [ev.final.schemaVersion, ev.final.status, ev.final.exitCode, ev.final.analysisEligible, ev.final.cleanup.verified],
    [1, "passed", 0, false, true],
  );
  assert.equal(Object.hasOwn(ev.final, "evaluationPolicy"), false);
  assert.equal(sha256Bytes(bytes), "b3653531e96221121f83253d92ec64dac9e6d637e96665e01abab14e6835632e");
  const legacy = parseCanonicalBytes(bytes);
  invalid(() => assertRecord("completion", { ...legacy, evaluationPolicy: V2_POLICY }));
  invalid(() => assertRecord("completion", { ...legacy, schemaVersion: 2 }));
});

test("policy selection accepts genuine closed fixture declarations and rejects scientific drift", () => {
  const v2 = { ...copy(V1_PROTOCOL), schemaVersion: 2, evaluationPolicy: V2_POLICY };
  assert.equal(policyForProtocol(v2, "train/fixtures/browser-protocol-v2.json"), V2_POLICY);
  for (const mutate of [
    (v) => (v.limits.timing.sampleGapMs = 501),
    (v) => delete v.evaluationPolicy,
    (v) => (v.comparison.gameCount = 39),
    (v) => (v.evaluationPolicy = { ...V2_POLICY, softPhase: "check" }),
    (v) => (v.extra = 1),
  ]) {
    const bad = copy(v2);
    mutate(bad);
    invalid(() => policyForProtocol(bad, "train/fixtures/browser-protocol-v2.json"));
  }
});

test("shared v1 field declaration remains immutable after extraction", () => {
  assert.throws(() => {
    RECORD_FIELDS.final.push("forged");
  }, TypeError);
  assert.throws(() => {
    RECORD_FIELDS.workspace = [];
  }, TypeError);
});

test("v1 Recorder rejects v2 workspace with v1 manifest before publication", async (t) => {
  const env = await workspaceForTest(t);
  const workspace = v2Workspace();
  const manifest = fixtureManifest({ workspace: env.ws, inputs: env.inputs });
  const cb = verifyCallbacks({ commonIdentity: workspace.commonIdentity });
  assert.throws(
    () => createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
      verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup) }),
    (e) => e.code === "RECORDER_CONFIG",
  );
  await assert.rejects(fsp.stat(path.join(env.workspaceRoot, "check/completion.json")), (e) => e.code === "ENOENT");
});

test("v1 Recorder rejects v2 running before writer admission", async (t) => {
  let recorder;
  const env = await workspaceForTest(t, () => recorder);
  const manifest = fixtureManifest({ workspace: env.ws, inputs: env.inputs });
  const cb = verifyCallbacks({ commonIdentity: env.ws.commonIdentity });
  recorder = createPhaseRecorder({
    store: env.store,
    workspace: env.ws,
    manifest,
    verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
    verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
  });
  await recorder.writeManifest();
  await assert.rejects(
    recorder.writeRunning({ ...fixtureRunning({ manifest }), schemaVersion: 2 }),
    (e) => e.code === "RECORDER_CONFIG",
  );
  await assert.rejects(fsp.stat(path.join(env.workspaceRoot, "check/running.json")), (e) => e.code === "ENOENT");
});

test("pure graph binds every prerequisite resource snapshot to the declared parent runs", () => {
  const g = closureInput(v2Graph());
  assert.doesNotThrow(() => verifyVerdictClosure(g));
  g.facts.prerequisiteResources = [];
  const forged = deriveVerdicts(g.facts);
  Object.assign(g.final, forged);
  Object.assign(g.completion, forged);
  invalid(() => verifyVerdictClosure(g));
});

test("graph binds ineligible final cleanup and fault facts to the independent reducer input", () => {
  const graph = closureInput(v2Graph({ completedGames: 6, completedPairs: 3, stats: null }));
  assert.doesNotThrow(() => verifyVerdictClosure(graph));
  for (const mutate of [(g) => (g.final.cleanup.verified = false), (g) => (g.final.unplannedFaultCount = 1)]) {
    const bad = copy(graph);
    mutate(bad);
    assert.doesNotThrow(() => assertRecord("final", bad.final));
    invalid(() => verifyVerdictClosure(bad));
  }
});
