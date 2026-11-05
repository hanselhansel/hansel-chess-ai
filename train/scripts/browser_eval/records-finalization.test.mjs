// Finalization-output regressions: literal positive check/exit-code output,
// cleanup-event admittance through finalizing until sink closure and their
// post-closure hashes, immutable caller snapshots, competing-finalizer
// rejection and post-close refusal. The discovered unfinished-evidence
// closure cases live in record-lifecycle.test.mjs. Driven on real
// temporary workspaces; fixture passes are never actual phase or cleanup
// evidence.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import { createPhaseRecorder } from "./records.mjs";
import {
  fixtureManifest,
  fixtureRunning,
  identity,
  makeRecorder,
  makeWorkspace,
  proof,
  runReceiptPhase,
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

const passChecks = (phase, evidencePaths = {}) =>
  REQUIRED_CHECK_IDS[phase]
    .filter((id) => id !== "cleanup")
    .map((id) => ({ id, status: "passed", evidencePaths: evidencePaths[id] ?? [] }));

const passIntent = {
  status: "passed",
  exitCode: 0,
  stopReason: null,
  summary: {},
  unplannedFaultCount: 0,
  analysisEligible: false,
};

const cleanCallbacks = (ws) => {
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  return cb;
};

// Moved unchanged in assertions from records.test.mjs: the bootstrap
// admittance boundary is recorder write-order ownership, but it drains
// through a real finalize like the rest of this suite.
test("before running only observed bootstrap evidence is admissible", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const cb = cleanCallbacks(env.ws);
  const rec = createPhaseRecorder({
    store: env.store,
    workspace: env.ws,
    manifest: mf,
    verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
    verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
  });
  await rec.writeManifest();
  // No running tuple is invented: ordinary operation/delivery/response
  // and artifact work have no phase to bind to yet.
  for (const kind of ["operation", "delivery", "response"]) {
    await code(rec.appendEvent({ kind, payload: {} }), "RECORDER_STATE");
  }
  const early = {
    recordId: "r0", recordSeq: 0, artifactId: "a0", path: "check/early",
    mode: "append", bytes: Buffer.from("x"), last: false,
  };
  await code(rec.appendArtifactChunk(early), "RECORDER_STATE");
  // Observed supervisor bootstrap fault/resource/cleanup facts are
  // admissible evidence even before running exists.
  for (const kind of ["fault", "resource", "cleanup"]) {
    await rec.appendEvent({ kind, payload: { note: kind } });
  }
  // Once actual running exists, ordinary work proceeds normally.
  await rec.writeRunning(fixtureRunning({ manifest: mf }));
  await rec.appendEvent({ kind: "operation", payload: { op: "x" } });
  await rec.finalize({
    intent: { ...passIntent },
    checks: passChecks("check"),
    prerequisites: [],
    expectedSelfTest: null,
  });
});

test("a passed finalize writes literal positive check, exit and evidence output", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
  const evRef = await rec.recorder.appendArtifactChunk({
    recordId: "e1",
    recordSeq: 0,
    artifactId: "art1",
    path: "check/ev.bin",
    mode: "append",
    bytes: Buffer.from("delivery-evidence"),
    last: true,
  });
  await rec.recorder.finalize({
    intent: { ...passIntent },
    checks: passChecks("check", { "verified-delivery": [evRef.path] }),
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "passed");
  assert.equal(final.exitCode, 0);
  assert.equal(final.requiredChecks.length, REQUIRED_CHECK_IDS.check.length);
  assert.ok(final.requiredChecks.every((c) => c.status === "passed"));
  const delivery = final.requiredChecks.find((c) => c.id === "verified-delivery");
  const evidenceBytes = await fsp.readFile(path.join(env.workspaceRoot, "check/ev.bin"));
  assert.deepEqual(delivery.evidence, [
    { path: "check/ev.bin", byteLength: evidenceBytes.length, sha256: sha256Bytes(evidenceBytes) },
  ]);
  assert.equal(final.cleanup.verified, true);
  const completion = await readJson(env.workspaceRoot, "check/completion.json");
  assert.equal(completion.exitCode, 0);
  assert.ok(
    completion.artifacts.some((a) => a.path === "check/final.json" && a.byteLength > 0),
  );
});

test("cleanup events written during finalizing hash into the closed evidence", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const cb = verifyCallbacks({ commonIdentity: env.ws.commonIdentity });
  let rec;
  cb.verifyCleanup.impl = async () => {
    // The trusted cleanup callback writes its own observed event while
    // the evidence stream is still open inside finalizing.
    await rec.recorder.appendEvent({
      kind: "cleanup",
      payload: { step: "drain-during-finalize" },
    });
    return proof("phase-workload", identity(4242));
  };
  rec = await makeRecorder({ env, manifest: mf, callbacks: cb });
  // Ordinary evidence lands before finalizing; the cleanup callback's own
  // event lands after, while the sink is still open.
  await rec.recorder.appendEvent({ kind: "operation", payload: { op: "start" } });
  await rec.recorder.finalize({
    intent: { ...passIntent },
    checks: passChecks("check"),
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  const cleanup = final.requiredChecks.find((c) => c.id === "cleanup");
  const eventsBytes = await fsp.readFile(path.join(env.workspaceRoot, "check/events.jsonl"));
  assert.deepEqual(cleanup.evidence, [
    {
      path: "check/events.jsonl",
      byteLength: eventsBytes.length,
      sha256: sha256Bytes(eventsBytes),
    },
  ]);
  // Each JSONL line re-parses with its canonical trailing LF restored.
  const lines = eventsBytes
    .toString("utf8")
    .split("\n")
    .filter((l) => l.length > 0);
  assert.equal(lines.length, 2);
  assert.deepEqual(
    lines.map((l) => parseCanonicalBytes(Buffer.from(`${l}\n`)).kind),
    ["operation", "cleanup"],
  );
});

test("a competing finalizer is rejected while the first completes", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
  const first = rec.recorder.finalize({
    intent: { ...passIntent },
    checks: passChecks("check"),
    prerequisites: [],
    expectedSelfTest: null,
  });
  await code(
    rec.recorder.finalize({
      intent: { status: "failed", exitCode: 1, stopReason: null, summary: {}, unplannedFaultCount: 0, analysisEligible: false },
      checks: [],
      prerequisites: [],
      expectedSelfTest: null,
    }),
    "RECORDER_STATE",
  );
  const out = await first;
  assert.equal(out.path, "check/completion.json");
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "passed");
});

test("prerequisite inputs are snapshotted before the first await", async () => {
  const env = await makeWorkspace();
  const ancestor = await runReceiptPhase({ env, phase: "check", runId: "run-check" });
  const parent = { phase: "check", runId: ancestor.mf.runId, completion: ancestor.completionRef };
  const mf = fixtureManifest({
    workspace: env.ws,
    phase: "parity",
    inputs: env.inputs,
    prerequisites: [parent],
  });
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
  const pending = rec.recorder.finalize({
    intent: { ...passIntent },
    checks: passChecks("parity"),
    prerequisites: [parent],
    expectedSelfTest: null,
  });
  parent.runId = "mutated-after-call";
  await pending;
  const completion = await readJson(env.workspaceRoot, "parity/completion.json");
  assert.equal(completion.prerequisites[0].runId, "run-check");
});

test("a failed intent records exit 1 and never retains eligibility", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
  await rec.recorder.finalize({
    intent: {
      status: "failed",
      exitCode: 1,
      stopReason: null,
      summary: {},
      unplannedFaultCount: 0,
      analysisEligible: true,
    },
    checks: passChecks("check").map((c) => ({ ...c, status: "failed" })),
    prerequisites: [],
    expectedSelfTest: null,
  });
  const final = await readJson(env.workspaceRoot, "check/final.json");
  assert.equal(final.status, "failed");
  assert.equal(final.exitCode, 1);
  assert.equal(final.analysisEligible, false);
  const completion = await readJson(env.workspaceRoot, "check/completion.json");
  assert.equal(completion.exitCode, 1);
});

test("after sink closure no further events or artifacts are admitted", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
  await rec.recorder.finalize({
    intent: { ...passIntent },
    checks: passChecks("check"),
    prerequisites: [],
    expectedSelfTest: null,
  });
  await code(
    rec.recorder.appendEvent({ kind: "cleanup", payload: {} }),
    "RECORDER_STATE",
  );
  await code(
    rec.recorder.appendArtifactChunk({
      recordId: "late",
      recordSeq: 0,
      artifactId: "late1",
      path: "check/late.bin",
      mode: "append",
      bytes: Buffer.from("x"),
      last: true,
    }),
    "RECORDER_STATE",
  );
  const refs = (await fsp.readdir(path.join(env.workspaceRoot, "check"))).sort();
  assert.deepEqual(refs, ["completion.json", "events.jsonl", "final.json", "manifest.json", "running.json"]);
});
