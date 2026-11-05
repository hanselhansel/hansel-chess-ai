// Retained-input tampering, check-evidence binding, stable parsed-byte
// commitment, nested selftest outcome semantics and shared-ancestor
// memoization, all against real temporary receipt chains. Every controlled
// receipt writes actual bytes through the real store and recorder; the
// production verifier is never weakened to admit absent refs. Fixture
// receipts are never actual phase evidence.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import { admitPhase, verifyReceipt } from "./prerequisites.mjs";
import { loadRecord, verifyInputRefs } from "./receipt-files.mjs";
import {
  fixtureManifest,
  identity,
  makeRecorder,
  makeWorkspace,
  proof,
  ref,
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

const gone = async () => "gone";

// A denied phase leaves no canonical completion.json, and the SAME
// genuine owner drains once the failed publication is actually
// contained — physical debt, never a caught error, is the proof.
const absentAndSettled = async (env, phase) => {
  await code(
    fsp.lstat(path.join(env.workspaceRoot, phase, "completion.json")),
    "ENOENT",
  );
  await artifactStoreLifetime(env.store).whenSettled();
};

// A real check-phase receipt whose verified-delivery check cites one real
// retained evidence file written through the recorder's own artifact lane.
const evidencePhase = async (env) => {
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const cb = verifyCallbacks({ commonIdentity: env.ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cb });
  const evRef = await rec.recorder.appendArtifactChunk({
    recordId: "e1",
    recordSeq: 0,
    artifactId: "art1",
    path: "check/ev.bin",
    mode: "append",
    bytes: Buffer.from("check-evidence-bytes"),
    last: true,
  });
  const checks = REQUIRED_CHECK_IDS.check
    .filter((id) => id !== "cleanup")
    .map((id) => ({
      id,
      status: "passed",
      evidencePaths: id === "verified-delivery" ? [evRef.path] : [],
    }));
  const completionRef = await rec.recorder.finalize({
    intent: {
      status: "passed",
      exitCode: 0,
      stopReason: null,
      summary: {},
      unplannedFaultCount: 0,
      analysisEligible: false,
    },
    checks,
    prerequisites: [],
    expectedSelfTest: null,
  });
  return { rec, completionRef };
};

test("a flipped retained input byte breaks admission", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const model = path.join(env.workspaceRoot, "inputs/model/tinyaz-m.bin");
  const bytes = await fsp.readFile(model);
  bytes[0] ^= 0x01;
  await fsp.writeFile(model, bytes);
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: check.completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_MISMATCH",
  );
});

test("a missing retained input file breaks admission", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  await fsp.rm(path.join(env.workspaceRoot, "inputs/setup/env.json"));
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: check.completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_INCOMPLETE",
  );
});

test("an input ref that never existed on disk is not admitted", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  mf.inputs.setup = [ref("inputs/setup/ghost.json", 8, 9)];
  const cb = verifyCallbacks({ commonIdentity: env.ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cb });
  // The mandatory full-graph check before publication now denies the
  // ghost declared input inside finalize itself: no completionRef is
  // ever minted for the malformed manifest.
  await code(
    rec.recorder.finalize({
      intent: {
        status: "passed",
        exitCode: 0,
        stopReason: null,
        summary: {},
        unplannedFaultCount: 0,
        analysisEligible: false,
      },
      checks: REQUIRED_CHECK_IDS.check
        .filter((id) => id !== "cleanup")
        .map((id) => ({ id, status: "passed", evidencePaths: [] })),
      prerequisites: [],
      expectedSelfTest: null,
    }),
    "EVIDENCE_INCOMPLETE",
  );
  await absentAndSettled(env, "check");
});

test("check evidence binds the declared inventory and tampering fails", async () => {
  const env = await makeWorkspace();
  const { completionRef } = await evidencePhase(env);
  const ev = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  const check = ev.final.requiredChecks.find((c) => c.id === "verified-delivery");
  assert.equal(check.evidence[0].path, "check/ev.bin");
  const evPath = path.join(env.workspaceRoot, "check/ev.bin");
  const bytes = await fsp.readFile(evPath);
  bytes[0] ^= 0x01;
  await fsp.writeFile(evPath, bytes);
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_INCOMPLETE",
  );
});

test("parsed records are bound to the exact hashed bytes", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const ev = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef: check.completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  const declared = ev.completion.artifacts.find((a) => a.path === "check/final.json");
  assert.equal(sha256Bytes(canonicalBytes(ev.final)), declared.sha256);
  assert.ok(Object.isFrozen(ev.final));
  assert.ok(Object.isFrozen(ev.manifest));
});

test("the nested selftest is admitted on outcome, not merely presence", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const parity = await runReceiptPhase({
    env,
    phase: "parity",
    prerequisites: [
      { phase: "check", runId: "run-check", completion: check.completionRef },
    ],
  });
  const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity(4242) };
  const selftest = await runReceiptPhase({
    env,
    phase: "watchdog-selftest",
    runId: "run-selftest",
    owner,
    // A failed selftest outcome verifies as a receipt but can never satisfy
    // the fixed inconclusive/exit-2/HEARTBEAT_TIMEOUT outcome binding.
    intent: {
      status: "failed",
      exitCode: 1,
      stopReason: null,
      summary: { scoredGames: 0 },
      unplannedFaultCount: 0,
      analysisEligible: false,
    },
  });
  // The failed selftest is still a legitimate standalone receipt, but
  // the mandatory full-graph check before publication now denies the
  // parent preflight inside its own generation — no canonical
  // preflight/completion.json is ever minted.
  await code(
    runReceiptPhase({
      env,
      phase: "preflight",
      prerequisites: [
        { phase: "check", runId: "run-check", completion: check.completionRef },
        { phase: "parity", runId: "run-parity", completion: parity.completionRef },
      ],
      expectedSelfTest: {
        completion: selftest.completionRef,
        expectedStopReason: "HEARTBEAT_TIMEOUT",
      },
    }),
    "SELFTEST_INVALID",
  );
  await absentAndSettled(env, "preflight");
});

test("a selftest owner that mismatches the parent supervisor fails", async () => {
  const env = await makeWorkspace();
  const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity(9999) };
  const selftest = await runReceiptPhase({
    env,
    phase: "watchdog-selftest",
    runId: "run-selftest",
    owner,
  });
  const check = await runReceiptPhase({ env, phase: "check" });
  const parity = await runReceiptPhase({
    env,
    phase: "parity",
    prerequisites: [
      { phase: "check", runId: "run-check", completion: check.completionRef },
    ],
  });
  // The wrong nested owner likewise fails the parent's mandatory
  // pre-publication graph check inside its own generation.
  await code(
    runReceiptPhase({
      env,
      phase: "preflight",
      prerequisites: [
        { phase: "check", runId: "run-check", completion: check.completionRef },
        { phase: "parity", runId: "run-parity", completion: parity.completionRef },
      ],
      expectedSelfTest: {
        completion: selftest.completionRef,
        expectedStopReason: "HEARTBEAT_TIMEOUT",
      },
    }),
    "SELFTEST_INVALID",
  );
  await absentAndSettled(env, "preflight");
});

test("loadRecord binds the parsed record to the declared stable bytes", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const completion = parseCanonicalBytes(
    await fsp.readFile(path.join(env.workspaceRoot, check.completionRef.path)),
  );
  const declared = completion.artifacts.find((a) => a.path === "check/final.json");
  const loaded = await loadRecord(env.workspaceRoot, "check/final.json", "final", declared);
  assert.equal(loaded.value.phase, "check");
  assert.equal(loaded.ref.sha256, declared.sha256);
  // A controlled changed byte between the declared inventory ref and the
  // record load fails the stable-byte binding.
  const abs = path.join(env.workspaceRoot, "check/final.json");
  const bytes = await fsp.readFile(abs);
  bytes[bytes.length - 3] ^= 0x01;
  await fsp.writeFile(abs, bytes);
  await code(
    loadRecord(env.workspaceRoot, "check/final.json", "final", declared),
    "EVIDENCE_MISMATCH",
  );
});

test("declared refs are owned snapshots, never caller aliases", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const completion = parseCanonicalBytes(
    await fsp.readFile(path.join(env.workspaceRoot, check.completionRef.path)),
  );
  // A caller-mutated declared ref cannot redirect the record load, and
  // the caller's object is never frozen by the verifier.
  const declared = { ...completion.artifacts.find((a) => a.path === "check/final.json") };
  const pending = loadRecord(env.workspaceRoot, "check/final.json", "final", declared);
  declared.path = "check/manifest.json";
  declared.sha256 = "0".repeat(64);
  const { ref } = await pending;
  assert.equal(ref.path, "check/final.json");
  assert.equal(declared.path, "check/manifest.json");
  // Mutable caller-owned input refs are captured before the first read:
  // a ghost mutation cannot rewrite the verified expectation.
  const inputs = {
    baseline: { files: env.inputs.baseline.files.map((r) => ({ ...r })) },
    candidate: { files: env.inputs.candidate.files.map((r) => ({ ...r })) },
    harness: { files: env.inputs.harness.files.map((r) => ({ ...r })) },
    setup: env.inputs.setup.map((r) => ({ ...r })),
    model: { ...env.inputs.model },
  };
  const verifying = verifyInputRefs(env.workspaceRoot, inputs);
  inputs.model.sha256 = "0".repeat(64);
  inputs.setup[0].path = "inputs/nope";
  await verifying;
  // An initially wrong ref corrected mid-flight still rejects on the
  // captured expectation. The mutated setup refs are restored first so
  // the wrong model hash is the only divergence the next call sees.
  inputs.setup = env.inputs.setup.map((r) => ({ ...r }));
  inputs.model.sha256 = "0".repeat(64);
  const rejecting = verifyInputRefs(env.workspaceRoot, inputs);
  inputs.model.sha256 = env.inputs.model.sha256;
  await code(rejecting, "EVIDENCE_MISMATCH");
});

// Moved unchanged from prerequisites.test.mjs: exact retained-byte/ref
// binding is evidence-seam ownership, so it lives beside the other
// stable-byte cases here.
test("hash of completion bytes must match the ref exactly", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const bytes = await fsp.readFile(path.join(env.workspaceRoot, check.completionRef.path));
  assert.equal(sha256Bytes(bytes), check.completionRef.sha256);
  const wrong = { ...check.completionRef, sha256: "0".repeat(64) };
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: wrong,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_MISMATCH",
  );
});

test("a second ref for a shared ancestor path must bind the same bytes", async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const parity = await runReceiptPhase({
    env,
    phase: "parity",
    prerequisites: [
      { phase: "check", runId: "run-check", completion: check.completionRef },
    ],
  });
  const admitted = await admitPhase({
    workspaceRoot: env.workspaceRoot,
    phase: "preflight",
    commonIdentity: env.ws.commonIdentity,
    parents: [check.completionRef, parity.completionRef],
    probeIdentity: gone,
  });
  assert.equal(admitted.closure.length, 2);
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "preflight",
      commonIdentity: env.ws.commonIdentity,
      parents: [
        check.completionRef,
        { ...check.completionRef, sha256: "0".repeat(64) },
        parity.completionRef,
      ],
      probeIdentity: gone,
    }),
    "EVIDENCE_MISMATCH",
  );
});
