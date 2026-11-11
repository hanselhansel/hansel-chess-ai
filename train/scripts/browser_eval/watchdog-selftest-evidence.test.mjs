// watchdog-selftest-evidence.test.mjs: the genuine selftest-evidence
// boundary suite — declared under the evidence partition before use.
// Every CommonIdentity, ArtifactRef, owner, receipt byte and
// verification comes from the REAL fixture workspace/store/records and
// the actual createWatchdogOperations selftestEvidence +
// verifyInternalSelfTest implementations: the bound validates and never
// probes past its original end — each malformed deadline binding on a
// FRESH genuinely eligible context returns null and records the real
// IPC_INVALID fault with ZERO additional selected receipt-path
// metadata admission and ZERO Native probes, and an already-spent
// bound starts nothing; a held re-verification read expiring past the
// captured end dispatches no fresh Native probe; and the actual
// required verifier body held while every unrelated driver handle has
// already settled keeps the collector un-reaped until the
// verification itself completes — the earlier fault record write held
// in the same window never gates the staged Native teardown. Held
// gates, the fake-child close facts and owned roots all settle
// through the one per-test teardown owner — even on assertion
// failure. A synthetic unit pass is never Native, phase or cleanup
// acceptance.
// The whole captured-end case now lives in watchdog-prior-evidence.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";

import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import {
  cleanupMonitorFixture,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import { capturePriorReceiptProbes, awaitEvidenceEntry as awaitEntered } from "./watchdog-parent-admission-test-fixtures.mjs";
import { advanceBy } from "./watchdog-drain-test-fixtures.mjs";
import {
  gateFs,
  makeEvidenceWorkspace,
  makePreflightRun,
  verifyReceipt,
} from "./watchdog-evidence-test-fixtures.mjs";
import {
  closeFacts as closeAll,
  drain as drainRun,
  heldGate,
  liveStart,
  row,
  yieldTurn,
} from "./watchdog-run-test-fixtures.mjs";
import {
  observeDriverBegun,
  observeSelectedReceiptMetadata,
} from "./watchdog-teardown-test-fixtures.mjs";

const yield2 = async () => {
  await yieldTurn();
  await yieldTurn();
};


test("selftestEvidence validates its bound and never probes past the original end", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { monitor, calls: monitorCalls } = cleanupMonitorFixture({
    runId: evidence.parentManifest.runId,
    clock: clk,
    supervisor: evidence.parentSupervisor,
    collector: identity(7001),
    rows: [],
    script: {
      probeDefault: "same-live",
      observation: {
        accountingValid: true,
        rssBytes: 0,
        peakRssBytes: 0,
        rssLimitExceeded: false,
        atMonoNs: "0",
      },
      listeners: {
        [evidence.parentManifest.runId]: { listeners: [], unexpected: [] },
      },
      stopResult: { exitCode: 0 },
    },
  });
  // The selected-metadata observer is registered and installed BEFORE
  // any selftestEvidence call below — the ZERO ADDITIONAL count
  // afterward is an actual observed verdict on the genuine earliest
  // receipt-path admission, never a completion-read or all-IO proof.
  const seen = observeSelectedReceiptMetadata(
    t,
    evidence.env.workspaceRoot,
    evidence.selftestRef.path,
  );
  // The genuine evidence-only positive control: the REAL verifyReceipt
  // over the actual selftestRef/CommonIdentity through the SAME frozen
  // owner io proves the observer admits the real selected path — and
  // it dispatches NO Native probe.
  const owner = artifactStoreLifetime(evidence.env.store);
  const io = Object.freeze({ retainActual: owner.retainActual });
  await verifyReceipt(
    {
      workspaceRoot: evidence.env.workspaceRoot,
      completionRef: evidence.selftestRef,
      expectedIdentity: evidence.commonIdentity,
    },
    io,
  );
  assert.ok(seen.admissions > 0);
  const baseline = seen.admissions;
  const faults = [];
  // A FRESH genuinely eligible context for every malformed bound: the
  // real preflight phase, the genuine retained ArtifactRef, the whole
  // CommonIdentity, the real workspace root, the SAME genuine owner
  // retainActual/io with a pure stopped and the actual parent
  // supervisor — never a short circuit through a malformed phase, a
  // missing reference, a noop owner or a permissive validator.
  const eligible = () => {
    const ctx = {
      phase: "preflight",
      runId: evidence.parentManifest.runId,
      workspaceRoot: evidence.env.workspaceRoot,
      commonIdentity: evidence.commonIdentity,
      monitor,
      retainActual: owner.retainActual,
      io,
      stopped: () => false,
      nowMonoMs: () => clk.nowMonoMs(),
      recordFault: (e) => faults.push(e && e.code ? e.code : "FAULT"),
      parentSupervisor: () => evidence.parentSupervisor,
      selftest: {
        id: `${evidence.parentManifest.runId}:preflight-selftest`,
        invoked: true,
        controller: null,
        completionRef: evidence.selftestRef,
        verified: null,
      },
    };
    return createWatchdogOperations({ ctx, records: {} });
  };
  // Fraction, nonfinite, string and supplied-null bindings all reject —
  // each on a fresh genuinely eligible context, each retained as a real
  // IPC_INVALID binding fault, none silently a fresh window.
  for (const bad of [1.5, Number.POSITIVE_INFINITY, "end", null]) {
    assert.equal(
      await eligible().selftestEvidence({ deadlineMonoMs: bad }),
      null,
    );
  }
  assert.deepEqual(faults, [
    "IPC_INVALID",
    "IPC_INVALID",
    "IPC_INVALID",
    "IPC_INVALID",
  ]);
  // An already-spent bound starts no receipt verification and dispatches
  // no Native probe at all.
  assert.equal(
    await eligible().selftestEvidence({ deadlineMonoMs: clk.nowMonoMs() - 1 }),
    null,
  );
  // ZERO additional selected receipt-path metadata admission landed on
  // the genuine completion path and ZERO Native probes ran across all
  // five calls — the bound guard rejects before either is reached.
  assert.equal(seen.admissions, baseline);
  assert.ok(!monitorCalls.some((c) => c.startsWith("probe:")));
});

for (const releaseAfter of [4501, 5001]) test(`failed verifier containment retains actual body released after ${releaseAfter}ms`, async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const runId = evidence.parentManifest.runId;
  // The held gate supplied to makePreflightRun forwards UNCHANGED into
  // the SAME instrumentRecorderFs fault slot — it holds the actual
  // kind:fault events append FileHandle.write, never a manual append,
  // a replacement writer or a stop-send proxy.
  const faultGate = heldGate();
  // A transparent test-local setter on the SAME held gate resolves the
  // entry receipt at the ACTUAL first true assignment — the original
  // boolean semantics are retained for every read.
  let faultEntered = false;
  const faultEntry = new Promise((resolve) => {
    Object.defineProperty(faultGate, "entered", {
      configurable: true,
      enumerable: true,
      get: () => faultEntered,
      set: (value) => {
        faultEntered = value;
        if (value === true) resolve();
      },
    });
  });
  // The coherent driver row 6000 under the parent run scope: the driver
  // stays live through the TERM probe — TERM never deletes it — and
  // answers gone only after the actual KILL; the parent supervisor
  // stays same-live at every stage.
  let driverKilled = false;
  const priorProbes = await capturePriorReceiptProbes(t, evidence);
  const { driver, monitorCalls, run, dispose, settleRecordWrites } =
    await makePreflightRun(t, {
      evidence,
      clock: clk,
      rows: [row(6000, evidence.parentSupervisor.pid, "driver", true, runId)],
      monitorScript: {
        probe: (arg) => {
          const key = `${arg.pid}:${arg.startSec}:${arg.startUsec}`;
          if (Object.hasOwn(priorProbes, key)) {
            return priorProbes[key];
          }
          const parent = evidence.parentSupervisor;
          if (key === `${parent.pid}:${parent.startSec}:${parent.startUsec}`) {
            return "same-live";
          }
          if (key === "6000:1000:0") {
            return driverKilled ? "gone" : "same-live";
          }
          return "unavailable";
        },
        onSignal: (arg) => {
          if (arg.identity.pid === 6000 && arg.signal === "KILL") {
            driverKilled = true;
          }
        },
      },
      faultGate,
    });
  const opId = `${runId}:preflight-selftest`;
  const begunReceipt = observeDriverBegun(t, driver);
  let p = null;
  let gate = null;
  try {
    p = run();
    await liveStart(clk, driver);
    driver.emit({ type: "begin", operationId: opId, kind: "command" });
    // The positive handshake completes: begun admitted and the first
    // genuine parent probe already landed — the verified ref is
    // retained for the required re-verification; racing the original
    // run outcome reports an impossible early end instead of hanging.
    const earlyEnd = p.then((res) => {
      throw new Error(`run ended before begun admission: ${res.stopReason}`);
    });
    earlyEnd.catch(() => {}); // the race loser never floats unhandled
    await Promise.race([begunReceipt, earlyEnd]);
    assert.ok(driver.written.some((m) => m.type === "begun"));
    assert.ok(
      monitorCalls.includes(`probe:${evidence.parentSupervisor.pid}:1000:0`),
    );
    // Arm the gate ONLY on the required re-verification's genuine
    // receipt read — the first verification's own read already settled
    // during the handshake.
    gate = gateFs(t, {
      workspaceRoot: evidence.env.workspaceRoot,
      relativePath: "preflight/selftest/completion.json",
      operation: "read",
    });
    // The REAL duplicate hello is rejected by the actual validator's
    // hello-order guard — the genuine IPC_INVALID through onError
    // records the real kind:fault event append whose FileHandle.write
    // is held, and the synchronous first stop latches that actual
    // cause.
    driver.emit({ type: "hello", commonIdentitySha256: "0".repeat(64) });
    // BOTH actual entries are observed: the real earlier fault write is
    // entered and held AND the required verifier's genuine receipt read
    // began while it stayed held — actual entries, never an optimistic
    // fixed-turn proxy.
    await faultEntry;
    assert.equal(faultGate.entered, true);
    await awaitEntered(gate);
    // The staged Native teardown still advances at the SAME original
    // offsets — the actual TERM then KILL are observed while BOTH the
    // earlier fault write and the required read stay held; held record
    // IO never gates either signal.
    await advanceBy(clk, 9);
    assert.ok(monitorCalls.includes(`signal:TERM:6000:1000:0:${runId}`));
    assert.ok(monitorCalls.includes(`signal:KILL:6000:1000:0:${runId}`));
    // ALL unrelated driver facts settle — every still-queued actual
    // send callback, the genuine exit and BOTH pipe closes — while the
    // required verifier body is still held.
    closeAll(driver);
    await yield2();
    // The earlier fault write is released and its ACTUAL record body is
    // joined through the identical local instrument join — the only
    // debt left is the held required read and the real verifier body
    // behind it, so the still-unreaped collector is attributed to that
    // alone.
    faultGate.held = false;
    faultGate.release();
    await settleRecordWrites();
    // P closes positive proof, while the held actual verifier still owns debt.
    assert.ok(monitorCalls.includes("stopAndReap"));
    let returned = false;
    p.then(() => { returned = true; });
    await yield2();
    assert.equal(returned, false);
    clk.advance(releaseAfter - 4500);
    gate.release();
    const res = await drainRun(clk, p);
    // The initial handshake probed once. Late verifier read completion cannot
    // issue another Native probe or promote the old result after P or C.
    assert.equal(monitorCalls.filter((c) => c === `probe:${evidence.parentSupervisor.pid}:1000:0`).length, 1);
    assert.equal(monitorCalls.at(-1), "stopAndReap");
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "IPC_INVALID");
  } finally {
    // BOTH held gates release unconditionally and every remaining
    // genuine fake-child fact is supplied BEFORE the ORIGINAL run join
    // and the shared fixture dispose — gate join/restore stay with the
    // teardown owner, never an early manual restore.
    faultGate.held = false;
    faultGate.release();
    if (gate !== null) gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});


import { promises as fs } from "node:fs";
import path from "node:path";
import { createPhaseRecorder, phaseRecorderLifetime } from "./records.mjs";
import { createV2RecorderWorkspace } from "./separate-verdicts-test-fixtures.mjs";
import { v3Workspace, qualityV3, createV3GraphFixture, now } from "./preflight-v3-test-fixtures.mjs";
import { fixtureManifest, fixtureRunning, proof } from "./test-fixtures.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createPreflightQualityScope, allowsPreflightPeriodic } from "./process-preflight-quality.mjs";

for (const expires of [false, true]) test(`nested receipt keeps original parent ceiling, expires=${expires}`, async (t) => {
  const workspace = v3Workspace(), env = await createV2RecorderWorkspace(t, { workspace });
  const runId = "parent:watchdog-selftest", supervisor = identity(4242);
  const manifest = { ...fixtureManifest({ workspace, inputs: env.inputs, phase: "watchdog-selftest", runId,
    owner: { phase: "preflight", runId: "parent", supervisor } }), schemaVersion: 2,
    evaluationPolicy: workspace.commonIdentity.evaluationPolicy };
  let clock = now(), proofs = 0, metadata = 0;
  const captureEnd = clock + 1000, parentEnd = clock + 60000;
  const recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
    verifyIdentity: async () => { proofs += 1; return workspace.commonIdentity; },
    verifyCleanup: async ({ claimedProof }) => { proofs += 1; return proof(claimedProof.scope, claimedProof.expectedFinalizer); } });
  env.recorders.push(recorder);
  recorder.bindRuntime({ lifetime: phaseRecorderLifetime(recorder), nowMonoMs: () => clock,
    receiptCeilingMonoMs: parentEnd });
  await recorder.writeManifest();
  await recorder.writeRunning({ ...fixtureRunning({ manifest, supervisor }), schemaVersion: 2 });
  await recorder.closeEvidenceBeforeCutoff({ intent: { status: "inconclusive", exitCode: 2,
    stopReason: "HEARTBEAT_TIMEOUT", unplannedFaultCount: 0, analysisEligible: false,
    summary: { scoredGames: 0 }, resourceEvidence: qualityV3({ phase: "watchdog-selftest", runId }) },
    checks: [], prerequisites: [], expectedSelfTest: null }, { deadlineMonoMs: captureEnd });
  assert.equal(proofs, 2);
  clock = captureEnd + 1;
  const { privateFs } = await import("./private-fs.mjs"), lstat = privateFs.lstat;
  privateFs.lstat = async (...args) => {
    const value = await lstat(...args);
    if (args[0] === path.join(env.workspaceRoot, "preflight/selftest")) {
      metadata += 1;
      if (expires) clock = parentEnd;
    }
    return value;
  };
  try {
    if (expires) {
      await assert.rejects(recorder.sealClosedEvidence(), /ACCOUNTING_UNAVAILABLE/);
      await assert.rejects(fs.stat(path.join(env.workspaceRoot, "preflight/selftest/completion.json")), { code: "ENOENT" });
    } else assert.equal((await recorder.sealClosedEvidence()).verified.final.cleanup.verified, true);
    assert(metadata > 0, "receipt entered between original nested C and parent end");
    assert.equal(proofs, 2, "B never re-invokes timely A's Native/identity verifiers");
    await artifactStoreLifetime(env.store).whenSettled();
  } finally { privateFs.lstat = lstat; }
});

for (const stop of ["deadline", "abort"]) test(`nested receipt cannot open parent periodic scope after ${stop}`, async (t) => {
  const f = await createV3GraphFixture(t), controller = new AbortController();
  let clock = now(), probes = 0;
  const end = clock + 90000, budget = createBudgetHandle({ deadlineMonoMs: end,
    nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
  const scope = createPreflightQualityScope({ phase: "preflight", runId: f.main.manifest.runId,
    evaluationPolicy: f.workspace.commonIdentity.evaluationPolicy });
  try {
    await assert.rejects(scope.verifyAndOpen({ workspaceRoot: f.env.workspaceRoot,
      completionRef: f.nested.completionRef, parentRunId: f.main.manifest.runId,
      parentSupervisor: f.nested.manifest.owner.supervisor, expectedIdentity: f.workspace.commonIdentity,
      probeIdentity: async () => { probes += 1; if (stop === "deadline") clock = end;
        else controller.abort(new Error("original parent abort")); return "same-live"; } },
    { io: f.io, budget }, () => { budget.assertLive("original parent admission"); controller.signal.throwIfAborted(); }));
    assert.equal(probes, 1);
    assert.equal(allowsPreflightPeriodic(scope.reader, f.main.manifest.runId), false);
    await artifactStoreLifetime(f.env.store).whenSettled();
  } finally { scope.close(); budget.dispose(); }
});
