// Sole-writer write order, immutable input snapshots, chunk/sink
// settlement, mandatory cleanup/identity callback failures,
// inventory/final/completion ordering and post-seal rejection, driven
// through real temporary workspaces with controlled callbacks. Fixture
// passes are never actual phase or cleanup passes.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseCanonicalBytes } from "./canonical-json.mjs";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import {
  copy,
  fixtureManifest,
  fixtureRunning,
  fixtureWorkspace,
  identity,
  makeRecorder,
  makeStore,
  proof,
  verifyCallbacks,
} from "./test-fixtures.mjs";

const code = async (promise, want) => {
  try {
    await promise;
  } catch (e) {
    assert.equal(e.code, want);
    return;
  }
  assert.fail(`expected ${want}`);
};

const readJson = async (root, rel) => parseCanonicalBytes(await fsp.readFile(path.join(root, rel)));

const passChecks = (phase) =>
  REQUIRED_CHECK_IDS[phase]
    .filter((id) => id !== "cleanup")
    .map((id) => ({ id, status: "passed", evidencePaths: [] }));

const finalizePassed = (env, extra = {}) =>
  env.recorder.finalize({
    intent: {
      status: "passed",
      exitCode: 0,
      stopReason: null,
      summary: {},
      unplannedFaultCount: 0,
      analysisEligible: false,
      ...extra.intent,
    },
    checks: passChecks(env.mf.phase),
    prerequisites: [],
    expectedSelfTest: null,
    ...extra.rest,
  });

test("manifest precedes running, running precedes ordinary work", async () => {
  const { store, workspaceRoot, ctl, recorder, mf } = await makeRecorder();
  const manifest = await readJson(workspaceRoot, "check/manifest.json");
  const running = await readJson(workspaceRoot, "check/running.json");
  assert.equal(manifest.phase, "check");
  assert.equal(running.supervisor.pid, 4242);
  assert.ok(ctl);
  const events = await fsp.readFile(path.join(workspaceRoot, "check/events.jsonl"), "utf8");
  assert.equal(events, "");
  // Drain the owned evidence sink deterministically.
  await finalizePassed({ recorder, mf });
});

test("write order rejects running before manifest and duplicates", async () => {
  const { store } = await makeStore();
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  const rec = createPhaseRecorder({
    store,
    workspace: ws,
    manifest: mf,
    verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
    verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
  });
  await writeWorkspaceOnce({ store, workspace: ws });
  await code(rec.writeRunning(fixtureRunning({ manifest: mf })), "RECORDER_STATE");
  await rec.writeManifest();
  await code(rec.writeManifest(), "RECORDER_STATE");
  await rec.writeRunning(fixtureRunning({ manifest: mf }));
  await code(rec.writeRunning(fixtureRunning({ manifest: mf })), "RECORDER_STATE");
  // Close the owned evidence sink through a real finalize.
  await finalizePassed({ recorder: rec, mf });
});

test("finalize writes final before completion and seals the phase", async () => {
  const env = await makeRecorder();
  const out = await finalizePassed(env);
  assert.equal(out.path, "check/completion.json");
  const final = await readJson(env.workspaceRoot, "check/final.json");
  const completion = await readJson(env.workspaceRoot, "check/completion.json");
  assert.equal(final.status, "passed");
  assert.equal(final.cleanup.verified, true);
  assert.equal(completion.status, "passed");
  assert.equal(completion.kind, "tinyaz-phase-completion");
  assert.deepEqual(
    completion.artifacts.map((r) => r.path),
    ["check/events.jsonl", "check/final.json", "check/manifest.json", "check/running.json"],
  );
  await code(env.store.writeOnce("check/late", Buffer.from("x"), "ordinary"), "STORE_SEALED");
  await code(env.recorder.appendEvent({ kind: "operation", payload: {} }), "RECORDER_STATE");
  await code(finalizePassed(env), "RECORDER_STATE");
});

test("check evidence resolves only against retained in-phase artifacts", async () => {
  const env = await makeRecorder();
  const ref = await env.recorder.appendArtifactChunk({
    recordId: "r1",
    recordSeq: 0,
    artifactId: "a1",
    path: "check/ev.bin",
    mode: "append",
    bytes: Buffer.from("evidence"),
    last: true,
  });
  const checks = passChecks("check").map((c) =>
    c.id === "verified-delivery" ? { ...c, evidencePaths: [ref.path] } : c,
  );
  await env.recorder.finalize({
    intent: { status: "passed", exitCode: 0, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: false },
    checks,
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  const check = final.requiredChecks.find((c) => c.id === "verified-delivery");
  assert.equal(check.status, "passed");
  assert.equal(check.evidence[0].path, "check/ev.bin");
});

test("out-of-phase or missing evidence degrades the check to failed", async () => {
  const env = await makeRecorder();
  const checks = passChecks("check").map((c) =>
    c.id === "verified-delivery" ? { ...c, evidencePaths: ["../outside", "check/missing"] } : c,
  );
  await env.recorder.finalize({
    intent: { status: "passed", exitCode: 0, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: false },
    checks,
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "failed");
  assert.equal(
    final.requiredChecks.find((c) => c.id === "verified-delivery").status,
    "failed",
  );
});

test("unproven cleanup callback degrades outcome and never passes cleanup", async () => {
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyCleanup.impl = async () => {
    throw new Error("native down");
  };
  const env = await makeRecorder({ workspace: ws, manifest: mf, callbacks: cb });
  await env.recorder.finalize({
    intent: { status: "passed", exitCode: 0, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: true },
    checks: passChecks("check"),
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "inconclusive");
  assert.equal(final.cleanup.verified, false);
  assert.equal(final.analysisEligible, false);
  assert.equal(final.requiredChecks.find((c) => c.id === "cleanup").status, "failed");
});

test("mismatched cleanup proof fields degrade to unproven", async () => {
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(9999));
  const env = await makeRecorder({ workspace: ws, manifest: mf, callbacks: cb });
  await finalizePassed(env);
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "inconclusive");
  assert.equal(final.analysisEligible, false);
});

test("identity callback mismatch is a hard failure, throw is inconclusive", async () => {
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyIdentity.impl = async () => ({ ...copy(ws.commonIdentity), model: { ...copy(ws.commonIdentity).model, byteLength: 1 } });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  const env = await makeRecorder({ workspace: ws, manifest: mf, callbacks: cb });
  await finalizePassed(env);
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "failed");
  assert.equal(final.analysisEligible, false);

  const cb2 = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb2.verifyIdentity.impl = async () => {
    throw new Error("probe down");
  };
  cb2.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  const env2 = await makeRecorder({ workspace: ws, manifest: mf, callbacks: cb2 });
  await finalizePassed(env2);
  const final2 = await readJson(env2.workspaceRoot, "check/final.json");
  assert.equal(final2.status, "inconclusive");
});

test("ordinary work after stopOrdinary is rejected; cleanup events allowed", async () => {
  const env = await makeRecorder();
  await env.recorder.stopOrdinary();
  await code(env.recorder.appendEvent({ kind: "operation", payload: {} }), "RECORDER_STATE");
  await env.recorder.appendEvent({ kind: "cleanup", payload: { detail: "x" } });
  await code(
    env.recorder.appendArtifactChunk({
      recordId: "r2",
      recordSeq: 0,
      artifactId: "a2",
      path: "check/late",
      mode: "append",
      bytes: Buffer.from("x"),
      last: true,
    }),
    "RECORDER_STATE",
  );
  // The cleanup event is durable evidence; a real finalize drains it.
  await finalizePassed(env);
});

test("appendArtifactChunk enforces seq/id/stream binding", async () => {
  const env = await makeRecorder();
  await code(
    env.recorder.appendArtifactChunk({
      recordId: "r1",
      recordSeq: 1,
      artifactId: "a1",
      path: "check/f",
      mode: "append",
      bytes: Buffer.alloc(1),
      last: false,
    }),
    "RECORDER_INPUT",
  );
  await env.recorder.appendArtifactChunk({
    recordId: "r1",
    recordSeq: 0,
    artifactId: "a1",
    path: "check/f",
    mode: "append",
    bytes: Buffer.alloc(1),
    last: false,
  });
  await code(
    env.recorder.appendArtifactChunk({
      recordId: "r1",
      recordSeq: 1,
      artifactId: "a1",
      path: "check/f",
      mode: "append",
      bytes: Buffer.alloc(1),
      last: false,
    }),
    "RECORDER_INPUT",
  );
  await code(
    env.recorder.appendArtifactChunk({
      recordId: "r2",
      recordSeq: 1,
      artifactId: "a1",
      path: "check/other",
      mode: "append",
      bytes: Buffer.alloc(1),
      last: false,
    }),
    "RECORDER_INPUT",
  );
  await code(
    env.recorder.appendArtifactChunk({
      recordId: "r3",
      recordSeq: 1,
      artifactId: "a1",
      path: "check/f",
      mode: "append",
      bytes: Buffer.alloc(65537),
      last: false,
    }),
    "RECORDER_INPUT",
  );
  // Drain the owned stream and evidence sink deterministically.
  await env.recorder.appendArtifactChunk({
    recordId: "r4",
    recordSeq: 1,
    artifactId: "a1",
    path: "check/f",
    mode: "append",
    bytes: Buffer.alloc(1),
    last: true,
  });
  await finalizePassed(env);
});

test("selftest derives its four checks and requires owner supervisor", async () => {
  const ws = fixtureWorkspace();
  const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity(7777) };
  const mf = fixtureManifest({ workspace: ws, phase: "watchdog-selftest", owner });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("selftest-workload", owner.supervisor);
  const env = await makeRecorder({ workspace: ws, manifest: mf, callbacks: cb });
  await env.recorder.finalize({
    intent: {
      status: "inconclusive",
      exitCode: 2,
      stopReason: "HEARTBEAT_TIMEOUT",
      summary: { scoredGames: 0 },
      unplannedFaultCount: 0,
      analysisEligible: false,
    },
    checks: [],
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "preflight/selftest/final.json");
  assert.equal(final.cleanup.scope, "selftest-workload");
  assert.ok(final.requiredChecks.every((c) => c.status === "passed"));
});

test("caller input is snapshotted before first await", async () => {
  const env = await makeRecorder();
  const intent = { status: "passed", exitCode: 0, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: false };
  const checks = passChecks("check");
  const pending = env.recorder.finalize({ intent, checks, prerequisites: [], expectedSelfTest: null });
  checks[0].status = "failed";
  checks[0].id = "bogus";
  await pending;
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "passed");
});

test("intent exitCode must match the declared status", async () => {
  const env = await makeRecorder();
  await code(
    env.recorder.finalize({
      intent: { status: "passed", exitCode: 1, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: false },
      checks: passChecks("check"),
      prerequisites: [],
      expectedSelfTest: null,
    }),
    "RECORDER_INPUT",
  );
  // The correctable rejection does not poison; a real finalize still drains.
  await finalizePassed(env);
});

test("mandatory callback types are required at construction", async () => {
  const { store } = await makeStore();
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws });
  assert.throws(
    () => createPhaseRecorder({ store, workspace: ws, manifest: mf, verifyCleanup: null, verifyIdentity: async () => {} }),
    (e) => e.code === "RECORDER_CONFIG",
  );
});
