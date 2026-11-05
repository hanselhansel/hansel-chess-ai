// TEST-ONLY suite: genuine timed-recorder evidence regressions over
// real temporary workspaces and the real Store/lifetime owner. Each
// timed fixture creates the recorder directly (makeRecorder uses the
// recorder immediately and cannot bind), binds the genuine inherited
// lifetime plus the injected absolute clock BEFORE first use, then
// writes real manifest/running records. The controlled callbacks are
// unit-only verifier inputs, never Native or actual-phase acceptance.
// Covers mandatory-verifier debt under the original cutoff, the late
// total fence, pre-await request snapshots, premature-B
// correctability, optional bookkeeping-observer failure/hang
// independence, the unbound legacy pipeline and the branded min-only
// horizon leaf — never a fake Store/Recorder/lifetime, copied intent
// as result or fabricated proof flag.

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  assertRejectCode as code,
  copy,
  fixtureManifest,
  fixtureRunning,
  makeRecorder,
  makeWorkspace,
  proof,
  verifyCallbacks,
} from "./test-fixtures.mjs";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import { sha256Bytes } from "./canonical-json.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createPhaseRecorder, phaseRecorderLifetime } from "./records.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { assertNativeHorizon, createNativeHorizon } from "./process-horizon.mjs";
import { captureFixtureThrow as captureThrow, observeFixturePromise as observe }
  from "./watchdog-teardown-test-fixtures.mjs";

const makeGate = () => {
  let release;
  let entered;
  const gate = new Promise((resolve) => { release = resolve; });
  const entry = new Promise((resolve) => { entered = resolve; });
  return { gate, release, entry, entered };
};

// A whole macrotask so every queued microtask — including neutral
// observation handlers — has actually run before a flag is read.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const passedRequest = () => ({
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
});

// Genuine timed recorder over a real workspace: bindRuntime carries
// the genuine same-instance lifetime and the injected clock once
// before first use, then real manifest/running writes land through
// the genuine recorder. The teardown — registered before any write —
// releases every controlled gate FIRST, neutrally joins the ORIGINAL
// A/B bodies, drains through the real closeIncompleteEvidence (its
// RECORDER_STATE is only the correctable "finalization owns the
// evidence" signal, never closure proof), then waits the SAME genuine
// owner to actual zero before removing the owned root. An unknown
// debt keeps the root and propagates instead of catch-and-remove.
const makeTimedRecorder = async (t, { onBookkeepingSettlement, onClockRead } = {}) => {
  const env = await makeWorkspace();
  const owner = artifactStoreLifetime(env.store);
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const cb = verifyCallbacks({ commonIdentity: env.ws.commonIdentity });
  const recorder = createPhaseRecorder({
    store: env.store,
    workspace: env.ws,
    manifest: mf,
    verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
    verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
  });
  assert.equal(phaseRecorderLifetime(recorder), owner);
  const clock = { now: 0 };
  const binding = {
    lifetime: owner,
    nowMonoMs: () => {
      if (onClockRead !== undefined) onClockRead(recorder);
      return clock.now;
    },
  };
  if (onBookkeepingSettlement !== undefined) {
    binding.onBookkeepingSettlement = onBookkeepingSettlement;
  }
  recorder.bindRuntime(binding);
  const control = { releases: [], joins: [], finalizerStarted: false };
  t.after(async () => {
    for (const release of control.releases) release();
    for (const join of control.joins) {
      await join.then(() => undefined, () => undefined);
    }
    // A legal drain only while the recorder never entered
    // finalization; RECORDER_STATE is never proof — the SAME owner's
    // actual zero below is the physical proof.
    if (control.finalizerStarted !== true) {
      await recorder.closeIncompleteEvidence();
    }
    await owner.whenSettled();
    await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  await recorder.writeManifest();
  await recorder.writeRunning(fixtureRunning({ manifest: mf }));
  return { env, owner, mf, cb, recorder, clock, control };
};

// Installs the real Node warning listener BEFORE the seal and resolves
// on the first actual expected observer warning; a missed emission
// fails the test by never resolving, never by asserting silence.
const nextObserverWarning = (t) => {
  let listener;
  const seen = new Promise((resolve) => {
    listener = (warning) => {
      if (
        warning.name === "TinyazBookkeepingObserverWarning" &&
        warning.code === "TINYAZ_BOOKKEEPING_OBSERVER"
      ) {
        process.off("warning", listener);
        resolve(warning);
      }
    };
  });
  process.on("warning", listener);
  t.after(async () => process.off("warning", listener));
  return seen;
};

test("a held mandatory verifier callback cannot mint evidence after the original deadline", async (t) => {
  const fx = await makeTimedRecorder(t);
  const { env, owner, cb, recorder, clock, control } = fx;
  const gate = makeGate();
  control.releases.push(gate.release);
  cb.verifyIdentity.impl = async () => {
    gate.entered();
    await gate.gate;
    return copy(env.ws.commonIdentity);
  };

  // The bound legacy finalizer is a correctable RECORDER_STATE before
  // the legal timed pair — it cannot bypass timing or poison state.
  await code(recorder.finalize(passedRequest()), "RECORDER_STATE");

  const a = recorder.closeEvidenceBeforeCutoff(passedRequest(), { deadlineMonoMs: 100 });
  control.finalizerStarted = true;
  control.joins.push(a);
  await gate.entry;

  const premature = observe(recorder.sealClosedEvidence());
  const settleObs = observe(owner.whenSettled());
  await tick();
  assert.equal(premature.rejected, true);
  assert.equal(premature.hasError, true);
  assert.equal(premature.error.code, "RECORDER_STATE");
  assert.equal(settleObs.settled, false);

  // Advance ONLY the injected clock beyond the ORIGINAL deadline, then
  // release the genuine held callback: its valid result arrives late.
  clock.now = 200;
  gate.release();
  await a;
  assert.equal(cb.verifyIdentity.calls.length, 1);
  assert.equal(cb.verifyCleanup.calls.length, 0);

  const b = recorder.sealClosedEvidence();
  control.joins.push(b);
  const sealed = await b;
  assert.equal(sealed.verified.final.status, "inconclusive");
  assert.equal(sealed.verified.final.exitCode, 2);
  assert.equal(sealed.verified.final.analysisEligible, false);
  assert.equal(sealed.verified.final.cleanup.verified, false);
  const cleanupCheck = sealed.verified.final.requiredChecks.find((x) => x.id === "cleanup");
  assert.equal(cleanupCheck.status, "failed");
  const bytes = await fsp.readFile(path.join(env.workspaceRoot, sealed.completionRef.path));
  assert.equal(sha256Bytes(bytes), sealed.completionRef.sha256);
  await owner.whenSettled();
});

test("the actually settled capture admits exactly one legal seal under reentrant premature attempts", async (t) => {
  const reentrant = [];
  const fx = await makeTimedRecorder(t, {
    onBookkeepingSettlement: () => {},
    // A trusted reentrant seal attempt on EVERY capture-time clock
    // read — including observeCaptureClosed's read after the private
    // pending bundle is assigned but before A/lifecycle settles. Each
    // rejection is observed immediately, never a discarded .finally.
    onClockRead: (recorder) => {
      recorder.sealClosedEvidence().then(
        () => reentrant.push("fulfilled"),
        (error) => reentrant.push(error.code),
      );
    },
  });
  const { owner, cb, recorder, clock, control } = fx;
  const gate = makeGate();
  control.releases.push(gate.release);
  cb.verifyIdentity.impl = async () => {
    gate.entered();
    await gate.gate;
    return copy(fx.env.ws.commonIdentity);
  };
  cb.verifyCleanup.impl = async ({ claimedProof }) => {
    // The late total fence is not yet installed while the mandatory
    // callback runs: a genuine cleanup append still lands before the
    // drain and the real sink close.
    await recorder.appendEvent({
      kind: "cleanup",
      payload: { note: "verifier cleanup observation" },
    });
    return proof(claimedProof.scope, claimedProof.expectedFinalizer);
  };

  const callerRequest = passedRequest();
  const a = recorder.closeEvidenceBeforeCutoff(callerRequest, { deadlineMonoMs: 300 });
  control.finalizerStarted = true;
  control.joins.push(a);
  await gate.entry;
  // Caller-owned request mutation after invocation cannot rewrite the
  // pre-await canonical snapshot.
  callerRequest.intent.status = "failed";
  callerRequest.intent.exitCode = 1;
  callerRequest.checks[0].status = "failed";
  gate.release();
  await a;
  assert.ok(reentrant.length >= 4);
  assert.ok(reentrant.every((value) => value === "RECORDER_STATE"));

  // The injected clock moves beyond the ORIGINAL cutoff only after the
  // real A settled: B runs no fresh verifier call and keeps the
  // on-time eligibility.
  clock.now = 900;
  const b = recorder.sealClosedEvidence();
  control.joins.push(b);
  const sealed = await b;
  assert.equal(sealed.verified.final.status, "passed");
  assert.equal(sealed.verified.final.exitCode, 0);
  assert.equal(sealed.verified.final.cleanup.verified, true);
  assert.equal(cb.verifyIdentity.calls.length, 1);
  assert.equal(cb.verifyCleanup.calls.length, 1);
  const cleanupCheck = sealed.verified.final.requiredChecks.find((x) => x.id === "cleanup");
  assert.equal(cleanupCheck.status, "passed");
  assert.equal(cleanupCheck.evidence[0].path, "check/events.jsonl");
  assert.ok(sealed.verified.completion.artifacts.some((r) => r.path === "check/events.jsonl"));

  await code(recorder.sealClosedEvidence(), "RECORDER_STATE");
  await code(fx.env.store.deleteEphemeral(sealed.completionRef.path), "STORE_SEALED");
  assert.ok(reentrant.every((value) => value === "RECORDER_STATE"));
  await owner.whenSettled();
});

test("optional observer failures never displace the authoritative seal", async (t) => {
  for (const variant of [
    { impl: async () => { throw null; }, want: "failed: null" },
    {
      impl: () => ({ get then() { throw undefined; } }),
      want: "failed: undefined",
    },
  ]) {
    const observed = [];
    const observer = (payload) => {
      observed.push(payload);
      return variant.impl(payload);
    };
    const seenWarning = nextObserverWarning(t);
    const fx = await makeTimedRecorder(t, { onBookkeepingSettlement: observer });
    const a = fx.recorder.closeEvidenceBeforeCutoff(passedRequest(), { deadlineMonoMs: 500 });
    fx.control.finalizerStarted = true;
    fx.control.joins.push(a);
    await a;
    const b = fx.recorder.sealClosedEvidence();
    fx.control.joins.push(b);
    const sealed = await b;
    const warning = await seenWarning;
    assert.equal(warning.code, "TINYAZ_BOOKKEEPING_OBSERVER");
    assert.equal(warning.name, "TinyazBookkeepingObserverWarning");
    assert.ok(warning.message.includes(variant.want));
    // The authoritative B result/ref/final is independent and unchanged.
    assert.equal(sealed.verified.final.status, "passed");
    assert.equal(sealed.completionRef.path, "check/completion.json");
    const payload = observed[0];
    assert.ok(Object.isFrozen(payload));
    assert.deepEqual([...Object.keys(payload)].sort(), [
      "bookkeepingSettledMonoMs", "captureClosedMonoMs", "phase", "primaryError", "runId",
    ]);
    assert.equal(payload.runId, "run-check");
    assert.equal(payload.phase, "check");
    assert.equal(payload.captureClosedMonoMs, 0);
    assert.equal(payload.bookkeepingSettledMonoMs, 0);
    assert.equal(payload.primaryError, null);
    await fx.owner.whenSettled();
  }

  // A hanging observer is genuinely invoked yet never awaited or
  // retained: the authoritative seal and fresh same-owner zero still
  // complete.
  let invoked;
  const invokedP = new Promise((resolve) => { invoked = resolve; });
  const fx = await makeTimedRecorder(t, {
    onBookkeepingSettlement: () => {
      invoked();
      return new Promise(() => {});
    },
  });
  const a = fx.recorder.closeEvidenceBeforeCutoff(passedRequest(), { deadlineMonoMs: 500 });
  fx.control.finalizerStarted = true;
  fx.control.joins.push(a);
  await a;
  const b = fx.recorder.sealClosedEvidence();
  fx.control.joins.push(b);
  const sealed = await b;
  await invokedP;
  assert.equal(sealed.verified.final.status, "passed");
  await fx.owner.whenSettled();
});

test("the unbound legacy finalize still mints an independently verifiable completion", async (t) => {
  const env = await makeWorkspace();
  const owner = artifactStoreLifetime(env.store);
  let recorder = null;
  let finalizerStarted = false;
  t.after(async () => {
    if (recorder !== null && finalizerStarted !== true) {
      await recorder.closeIncompleteEvidence();
    }
    await owner.whenSettled();
    await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  const rec = await makeRecorder({ env });
  recorder = rec.recorder;
  const finalize = recorder.finalize(passedRequest());
  finalizerStarted = true;
  const completionRef = await finalize;
  assert.equal(completionRef.path, "check/completion.json");
  const ev = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  assert.equal(ev.phase, "check");
  assert.equal(ev.final.status, "passed");
  assert.equal(ev.final.exitCode, 0);
  assert.deepEqual(ev.completionRef, completionRef);
});

test("createNativeHorizon rethrows the exact first listener fault after all subscribers ran", () => {
  const horizon = createNativeHorizon();
  assert.equal(horizon.reader.read(), null);
  const seen = [];
  let bomb = null;
  horizon.reader.subscribe(() => { throw bomb; });
  horizon.reader.subscribe((bound) => { seen.push(bound); });

  let out = captureThrow(() => horizon.initialize(500));
  assert.equal(out.observed, true);
  assert.strictEqual(out.value, null);
  assert.deepEqual(seen, [500]);
  assert.equal(horizon.reader.read(), 500);

  // A wider or equal supplied bound dispatches nothing and never
  // extends the armed minimum.
  horizon.narrow(600);
  horizon.narrow(500);
  assert.deepEqual(seen, [500]);
  assert.equal(horizon.reader.read(), 500);

  bomb = undefined;
  out = captureThrow(() => horizon.narrow(300));
  assert.equal(out.observed, true);
  assert.strictEqual(out.value, undefined);
  assert.deepEqual(seen, [500, 300]);
  assert.equal(horizon.reader.read(), 300);

  // Brand checking reads no caller getter: a lookalike, spread copy
  // and proxy all fail closed with PROCESS_HORIZON.
  let getterRead = false;
  const lookalike = {
    get reader() {
      getterRead = true;
      return null;
    },
  };
  for (const forged of [lookalike, { ...horizon }, new Proxy(horizon, {})]) {
    assert.throws(() => assertNativeHorizon(forged), (e) => e.code === "PROCESS_HORIZON");
  }
  assert.equal(getterRead, false);
});
