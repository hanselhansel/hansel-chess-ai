// watchdog-records.test.mjs: the record adapter over a REAL
// createPhaseRecorder, real artifact store and real verifyReceipt
// readback — mixed event/artifact ordinals with the legal append mode,
// actual ArtifactRef values, the existing "operation" event kind, PGN
// snapshot/observer faults carried through a REAL finalized receipt,
// coherent status/exit pairs, failed/1 -> stopped inconclusive/2, a
// cleanup-specific requested pass with otherwise valid claims, and
// normal-finish null stopReason. The whole per-test setup/settle
// helpers live in the declared watchdog-records-test-fixtures.mjs
// adapter leaf, imported identically as setup/settleCleanup. No
// fabricated pass; a synthetic unit pass is never a Native or phase
// acceptance.
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import {
  setupRecordAdapter as setup,
  settleRecordCleanup as settleCleanup,
} from "./watchdog-records-test-fixtures.mjs";

const sha = (b) => createHash("sha256").update(b).digest("hex");

const INTENT = (status, exitCode, extra = {}) => ({
  status,
  exitCode,
  stopReason: null,
  analysisEligible: status === "passed",
  summary: {},
  unplannedFaultCount: 0,
  ...extra,
});

// The check phase's seven driver-owned claim ids; "cleanup" is derived.
const CHECK_CLAIM_IDS = [
  "verified-delivery",
  "real-worker",
  "retained-main-recovery",
  "request-lifecycle",
  "explicit-failure-actions",
  "completed-display",
  "workbench-layout",
];

test("mixed event/artifact ordinals persist real bytes and ArtifactRefs", async (t) => {
  const { env, adapter, boot } = await setup(t);
  await boot();
  await adapter.persistEvent({
    kind: "operation",
    recordId: "e1",
    recordSeq: 0,
    payload: { operationId: "o0", result: { status: "completed" } },
  });
  const one = Buffer.from("hello");
  const ref1 = await adapter.persistArtifact({
    recordId: "a1",
    recordSeq: 99, // the wire seq is never trusted; the private ordinal is
    artifactId: "art-1",
    path: "check/out-1.bin",
    mode: "append",
    data: one.toString("base64"),
    last: true,
  });
  await adapter.persistArtifact({
    recordId: "a2",
    recordSeq: 0,
    artifactId: "art-2",
    path: "check/out-2.bin",
    mode: "append",
    data: Buffer.from("wor").toString("base64"),
    last: false,
  });
  const ref2 = await adapter.persistArtifact({
    recordId: "a3",
    recordSeq: 1,
    artifactId: "art-2",
    path: "check/out-2.bin",
    mode: "append",
    data: Buffer.from("ld").toString("base64"),
    last: true,
  });
  assert.equal(ref1.path, "check/out-1.bin");
  assert.equal(ref1.byteLength, one.length);
  assert.equal(ref1.sha256, sha(one));
  assert.equal(ref2.path, "check/out-2.bin");
  assert.equal(ref2.byteLength, 5);
  assert.equal(ref2.sha256, sha(Buffer.from("world")));
  assert.deepEqual(await env.readFile("check/out-1.bin"), one);
  await adapter.stopOrdinary();
});

test("recordOperationEnd uses the existing operation event kind", async (t) => {
  const { clk, env, adapter, boot, events, binding, finalizeAndRead } = await setup(t);
  await boot();
  await adapter.recordOperationEnd("op-9", {
    status: "completed",
    detail: { ms: 4 },
  });
  await adapter.stopOrdinary();
  await settleCleanup(clk, env, binding);
  const res = await finalizeAndRead({
    intent: INTENT("inconclusive", 2, { stopReason: "HEARTBEAT_TIMEOUT" }),
    checks: [],
    prerequisites: [],
    expectedSelfTest: null,
  });
  assert.equal(res.final.status, "inconclusive");
  assert.equal(res.final.exitCode, 2);
  assert.equal(res.final.stopReason, "HEARTBEAT_TIMEOUT");
  const lines = await events();
  const ops = lines.filter((l) => l.kind === "operation");
  assert.ok(
    ops.some(
      (l) => l.payload.operationId === "op-9" && l.payload.result.status === "completed",
    ),
  );
  assert.ok(!lines.some((l) => l.kind === "operation-end"));
});

test("composeIntent emits only coherent pairs with the fresh fault count", async (t) => {
  const { adapter } = await setup(t);
  const finish = (requestedStatus, requestedExitCode) => ({
    requestedStatus,
    requestedExitCode,
    stopReason: "FINISH",
    analysisEligible: true,
    checks: [],
    summary: { gameEvidence: { forged: true }, keep: 1 },
  });
  assert.deepEqual(
    adapter.composeIntent({ finishReq: finish("passed", 0), stopReq: null, faultCount: () => 0 }),
    {
      status: "passed",
      exitCode: 0,
      stopReason: null, // driver finish text has no authority
      analysisEligible: true,
      summary: { keep: 1 }, // forged gameEvidence stripped, no snapshot
      unplannedFaultCount: 0,
    },
  );
  assert.equal(
    adapter.composeIntent({ finishReq: finish("failed", 1), stopReq: null, faultCount: () => 0 })
      .exitCode,
    1,
  );
  assert.equal(
    adapter.composeIntent({ finishReq: finish("inconclusive", 2), stopReq: null, faultCount: () => 0 })
      .exitCode,
    2,
  );
  const stopped = adapter.composeIntent({
    finishReq: finish("passed", 0),
    stopReq: { reason: "HEARTBEAT_TIMEOUT", atMonoNs: 0n },
    faultCount: () => 3,
  });
  assert.equal(stopped.status, "inconclusive");
  assert.equal(stopped.exitCode, 2);
  assert.equal(stopped.stopReason, "HEARTBEAT_TIMEOUT");
  assert.equal(stopped.analysisEligible, false);
});

test("a PGN snapshot fault reaches the real finalized receipt count", async (t) => {
  const pgn = {
    observePersisted: async () => {},
    freeze: () => {},
    snapshot: () => {
      throw new Error("pgn unreadable");
    },
  };
  const { clk, env, adapter, boot, observerFaults, binding, finalizeAndRead } = await setup(t, { pgnEvidence: pgn });
  const intent = adapter.composeIntent({
    finishReq: {
      requestedStatus: "passed",
      requestedExitCode: 0,
      analysisEligible: true,
      checks: [],
      summary: {},
    },
    stopReq: null,
    faultCount: () => observerFaults.length,
  });
  assert.equal(observerFaults.length, 1);
  assert.equal(intent.unplannedFaultCount, 1);
  assert.ok(!("gameEvidence" in intent.summary));
  // The actual intent is finalized through the REAL recorder: the counted
  // observer fault downgrades the requested pass in the real receipt.
  await boot();
  // Valid unrelated claims back every driver-owned id so no independently
  // missing claim can supply the not-passed verdict — only the counted
  // observer fault can.
  const ref = await adapter.persistArtifact({
    recordId: "a1",
    recordSeq: 0,
    artifactId: "art-ev",
    path: "check/evidence.bin",
    mode: "append",
    data: Buffer.from("ok").toString("base64"),
    last: true,
  });
  await adapter.stopOrdinary();
  await settleCleanup(clk, env, binding);
  const res = await finalizeAndRead({
    intent,
    checks: CHECK_CLAIM_IDS.map((id) => ({
      id,
      status: "passed",
      evidencePaths: [ref.path],
    })),
    prerequisites: [],
    expectedSelfTest: null,
  });
  // The exact retained outcome: counted fault -> inconclusive/2 with the
  // real cleanup proof verified, every OTHER derived/method check still
  // passed and analysis refused — the downgrade is fault-specific.
  assert.equal(res.final.status, "inconclusive");
  assert.equal(res.final.exitCode, 2);
  assert.equal(res.final.unplannedFaultCount, 1);
  assert.equal(res.final.cleanup.verified, true);
  assert.equal(res.final.analysisEligible, false);
  for (const c of res.final.requiredChecks) {
    assert.equal(c.status, "passed");
  }
});

test("a previously failed/1 finish still stops inconclusive/2 on the real receipt", async (t) => {
  const { clk, env, adapter, boot, binding, finalizeAndRead } = await setup(t);
  await boot();
  await adapter.stopOrdinary();
  await settleCleanup(clk, env, binding);
  const stopped = adapter.composeIntent({
    finishReq: {
      requestedStatus: "failed",
      requestedExitCode: 1,
      analysisEligible: false,
      checks: [],
      summary: {},
    },
    stopReq: { reason: "PHASE_TIMEOUT", atMonoNs: 0n },
    faultCount: () => 0,
  });
  assert.equal(stopped.status, "inconclusive");
  assert.equal(stopped.exitCode, 2);
  const res = await finalizeAndRead({
    intent: stopped,
    checks: [],
    prerequisites: [],
    expectedSelfTest: null,
  });
  assert.equal(res.final.status, "inconclusive");
  assert.equal(res.final.exitCode, 2);
  assert.equal(res.final.stopReason, "PHASE_TIMEOUT");
});

test("a requested pass with otherwise valid claims fails only the cleanup guard", async (t) => {
  const unproven = async () => {
    const e = new Error("no settled cleanup");
    e.code = "CLEANUP_UNPROVEN";
    throw e;
  };
  const { env, adapter, boot, finalizeAndRead } = await setup(t, { verifyCleanup: unproven });
  await boot();
  // A real artifact backs every driver-owned claim so only the derived
  // cleanup check can fail — the degraded status is cleanup-specific.
  const ref = await adapter.persistArtifact({
    recordId: "a1",
    recordSeq: 0,
    artifactId: "art-ev",
    path: "check/evidence.bin",
    mode: "append",
    data: Buffer.from("ok").toString("base64"),
    last: true,
  });
  await adapter.stopOrdinary();
  const claims = CHECK_CLAIM_IDS.map((id) => ({
    id,
    status: "passed",
    evidencePaths: [ref.path],
  }));
  const res = await finalizeAndRead({
    intent: INTENT("passed", 0, { analysisEligible: true }),
    checks: claims,
    prerequisites: [],
    expectedSelfTest: null,
  });
  // Unproven cleanup degrades to inconclusive/2 — a failed CLAIM would
  // produce failed/1, so inconclusive is the cleanup-specific outcome.
  assert.equal(res.final.status, "inconclusive");
  assert.equal(res.final.exitCode, 2);
  const cleanupCheck = res.final.requiredChecks.find((c) => c.id === "cleanup");
  assert.equal(cleanupCheck.status, "failed");
  for (const c of res.final.requiredChecks) {
    if (c.id !== "cleanup") assert.equal(c.status, "passed");
  }
  // The retained final facts: the cleanup proof is genuinely UNVERIFIED,
  // eligibility is refused and no unplanned fault blurred the verdict.
  assert.equal(res.final.cleanup.verified, false);
  assert.equal(res.final.analysisEligible, false);
  assert.equal(res.final.unplannedFaultCount, 0);
});

test("a normal finish carries the actual null stopReason through the receipt", async (t) => {
  const { clk, env, adapter, boot, binding, finalizeAndRead } = await setup(t);
  await boot();
  await adapter.stopOrdinary();
  await settleCleanup(clk, env, binding);
  const res = await finalizeAndRead({
    intent: INTENT("inconclusive", 2, { stopReason: null }),
    checks: [],
    prerequisites: [],
    expectedSelfTest: null,
  });
  assert.equal(res.final.stopReason, null);
  assert.equal(res.final.exitCode, 2);
});
