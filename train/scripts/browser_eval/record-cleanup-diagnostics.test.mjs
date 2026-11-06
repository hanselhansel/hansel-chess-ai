// Genuine Store/Recorder capture classification. Controlled verifier callbacks
// are unit data, never Native cleanup proof or actual phase acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import * as lifetimeAPI from "./watchdog-lifetime.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import {
  makeStore, fixtureWorkspace, fixtureManifest, fixtureRunning,
  writeFixtureInputs, copy, proof,
} from "./test-fixtures.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const request = () => ({
  intent: { status: "passed", exitCode: 0, stopReason: null,
    summary: {}, unplannedFaultCount: 0, analysisEligible: false },
  checks: REQUIRED_CHECK_IDS.check.filter((id) => id !== "cleanup")
    .map((id) => ({ id, status: "passed", evidencePaths: [] })),
  prerequisites: [], expectedSelfTest: null,
});

async function fixture(t, { times = [1, 2, 3, 4], cleanup, reporter } = {}) {
  const lines = [];
  let owner;
  owner = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => {
    lines.push(line);
    if (reporter) reporter(owner, line);
  } });
  let env;
  let recorder;
  let body;
  const releases = [];
  t.after(async () => {
    for (const release of releases) release();
    if (body) await body.catch(() => {});
    if (recorder) await recorder.closeIncompleteEvidence().catch((error) => {
      assert.equal(error.code, "RECORDER_STATE");
    });
    await owner.whenSettled();
    if (env) await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  env = await makeStore({ lifetime: owner });
  const workspace = fixtureWorkspace();
  await writeWorkspaceOnce({ store: env.store, workspace });
  const inputs = await writeFixtureInputs({ store: env.store });
  const manifest = fixtureManifest({ workspace, inputs });
  let reads = 0;
  let calls = 0;
  const observed = [];
  recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
    verifyIdentity: async () => copy(workspace.commonIdentity),
    verifyCleanup: async (arg, bound) => {
      calls += 1;
      observed.push({ arg, bound });
      return cleanup ? cleanup(arg, bound) : proof(arg.claimedProof.scope, arg.claimedProof.expectedFinalizer);
    },
  });
  recorder.bindRuntime({ lifetime: owner, nowMonoMs: () => {
    const value = times[Math.min(reads, times.length - 1)];
    reads += 1;
    return value;
  } });
  await recorder.writeManifest();
  await recorder.writeRunning(fixtureRunning({ manifest }));
  return { owner, lines, releases, observed, calls: () => calls, reads: () => reads,
    capture: () => {
      body = recorder.closeEvidenceBeforeCutoff(request(), { deadlineMonoMs: 100 });
      return body;
    },
    seal: () => {
      body = recorder.sealClosedEvidence();
      return body;
    },
  };
}
const marker = (lines) => {
  for (const line of lines) assert.ok(Buffer.byteLength(line, "utf8") <= 256);
  const records = lines.map((line) => JSON.parse(line.slice("TINYAZ_AWAIT ".length)));
  return records.find((record) => record.stage === "records.cleanup");
};

for (const classification of ["pre-bound-spent", "callback-rejected", "post-bound-spent", "copy-invalid", "shape-invalid", "accepted"]) {
  test(`genuine capture describes cleanup ${classification}`, async (t) => {
    const first = Object.freeze(Object.assign(new Error("controlled callback"), {
      code: "CONTROLLED_CLEANUP", detail: "EIO cleanup-callback",
    }));
    const times = classification === "pre-bound-spent" ? [1, 2, 100] :
      classification === "post-bound-spent" ? [1, 2, 3, 100] : [1, 2, 3, 4];
    const f = await fixture(t, { times, cleanup: (arg, bound) => {
      assert.deepEqual(bound, { deadlineMonoMs: 100 });
      if (classification === "callback-rejected") throw first;
      if (classification === "copy-invalid") return undefined;
      if (classification === "shape-invalid") return null;
      return proof(arg.claimedProof.scope, arg.claimedProof.expectedFinalizer);
    } });
    await f.capture();
    const result = await f.seal();
    const row = marker(f.lines);
    assert.ok(row, "classification survives genuine final capture/default proof");
    assert.equal(row.state, classification);
    assert.equal(row.end, 100);
    assert.equal(row.at, classification.endsWith("bound-spent") ? 100 :
      classification === "callback-rejected" ? 3 : 4);
    assert.equal(f.calls(), classification === "pre-bound-spent" ? 0 : 1);
    assert.equal(f.reads(), classification === "pre-bound-spent" || classification === "callback-rejected" ? 3 : 4);
    if (classification === "callback-rejected") {
      assert.equal(row.code, first.code);
      assert.equal(row.detail, first.detail);
      assert.equal(first.message, "controlled callback");
    }
    const final = result.verified.final;
    assert.equal(final.cleanup.verified, classification === "accepted");
    assert.equal(final.status, classification === "accepted" ? "passed" : "inconclusive");
    assert.equal(final.unplannedFaultCount, 0);
    if (classification !== "accepted") {
      assert.equal(final.cleanup.expectedFinalizer, null);
      assert.equal(final.cleanup.accountingValid, false);
    }
    await f.owner.whenSettled();
  });
}

test("a held cleanup verifier stays owned and late proof remains unproven", async (t) => {
  const held = gate();
  const entered = gate();
  const times = [1, 2, 3, 100];
  const f = await fixture(t, { times, cleanup: async (arg) => {
    entered.resolve();
    await held.promise;
    return proof(arg.claimedProof.scope, arg.claimedProof.expectedFinalizer);
  } });
  f.releases.push(held.resolve);
  const pending = f.capture();
  await entered.promise;
  let zero = false;
  const actual = f.owner.whenSettled().then(() => { zero = true; });
  await turn();
  assert.equal(zero, false);
  assert.equal(marker(f.lines), undefined);
  held.resolve();
  await pending;
  const result = await f.seal();
  await actual;
  assert.equal(marker(f.lines).state, "post-bound-spent");
  assert.equal(result.verified.final.cleanup.verified, false);
  assert.equal(f.calls(), 1);
  assert.equal(f.reads(), 4);
});

for (const value of [undefined, null, false, 0]) {
  test(`falsey cleanup rejection remains classified: ${typeof value}/${value}`, async (t) => {
    const f = await fixture(t, { cleanup: () => { throw value; } });
    await f.capture();
    const result = await f.seal();
    assert.equal(marker(f.lines).state, "callback-rejected");
    assert.equal(result.verified.final.cleanup.verified, false);
    assert.equal(f.calls(), 1);
  });
}

test("hostile cause getters and reentrant throwing reporter cannot change fallback", async (t) => {
  let reads = 0;
  let rendered = false;
  let f;
  const cause = Object.freeze({
    get code() {
      reads += 1;
      lifetimeAPI.observeAwaitStage(f.owner, "phase", "records.finalize", () => 17);
      throw null;
    },
    get message() { throw undefined; },
    detail: "EACCES controlled-cleanup",
    toString() {
      rendered = true;
      throw new Error("must not render");
    },
  });
  f = await fixture(t, { cleanup: () => { throw cause; }, reporter: (owner) => {
    assert.equal(lifetimeAPI.observeAwaitStage(owner, "phase", "records.finalize", () => 23), 23);
    throw false;
  } });
  await f.capture();
  const result = await f.seal();
  assert.equal(marker(f.lines).state, "callback-rejected");
  assert.equal(marker(f.lines).detail, cause.detail);
  assert.equal(reads, 1);
  assert.equal(rendered, false);
  assert.equal(result.verified.final.cleanup.verified, false);
  assert.equal(f.calls(), 1);
});

test("cleanup descriptions share the existing full UTF8 marker and count cap", () => {
  const lines = [];
  const owner = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const error = Object.freeze({ code: "CONTROLLED", message: "字".repeat(200), detail: "é".repeat(200) });
  for (let index = 0; index < 70; index += 1) {
    lifetimeAPI.reportCleanupVerification(owner, "phase", "callback-rejected", error, 1917200965487, 1917200965587);
  }
  assert.equal(lines.length, 64);
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
  assert.ok(lines.reduce((sum, line) => sum + Buffer.byteLength(line), 0) <= 16384);
  const row = marker(lines);
  assert.equal(row.state, "callback-rejected");
  assert.equal(row.at, 1917200965487);
  assert.equal(row.end, 1917200965587);
});
