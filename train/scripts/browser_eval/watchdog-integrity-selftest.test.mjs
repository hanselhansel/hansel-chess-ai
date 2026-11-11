// Genuine own-subrun Watchdog/Recorder/control receipt over controlled Native
// tuples and the exact private scanner body in an isolated AST test realm.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import ts from "typescript";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord, assertCommonIdentity } from "./record-schema.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createWatchdogLifetime, assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";
import { createWatchdog, createWatchdogFacade } from "./watchdog.mjs";
import { captureWatchdogRuntimeConfig } from "./watchdog-config.mjs";
import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createDriverActualScope, finishDriverActualScope } from "./watchdog-driver-actual.mjs";
import { fixtureWorkspace, fixtureManifest, makeStore, writeFixtureInputs } from "./test-fixtures.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import { cleanupMonitorFixture, watchdogTestClock, forkDriverFixture, row, OBS } from "./watchdog-test-fixtures.mjs";
import { createRunDrainBinding, drain, advanceBy, liveStart, closeFacts } from "./watchdog-drain-test-fixtures.mjs";
import { admitWatchdogDriver } from "./watchdog-admission.mjs";
import { verifyReceipt } from "./prerequisites.mjs";

const source = await fsp.readFile(new URL("./final-integrity.mjs", import.meta.url), "utf8");
const parsed = ts.createSourceFile("final-integrity.mjs", source, ts.ScriptTarget.Latest, true);
const body = parsed.statements.filter((node) => !ts.isImportDeclaration(node))
  .map((node) => node.getText(parsed).replace(/^export /, "")).join("\n");
const factory = (verifyIdentity) => {
  const bindings = { path, canonicalBytes, parseCanonicalBytes, sha256Bytes, assertRecord, assertCommonIdentity,
    isObj, exactFields, createBudgetHandle, assertWatchdogLifetime, issueActual, verifyIdentity };
  return new Function(...Object.keys(bindings), `${body}\nreturn createFinalIntegrity`)(...Object.values(bindings));
};
const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};

test("first begin pauses parent; own durable subrun scan precedes injection and exact control receipt", { timeout: 15000 }, async (t) => {
  const clock = watchdogTestClock();
  const scan = gate();
  const entered = gate();
  const subrunReady = gate();
  const parentAck = gate();
  const faults = [];
  const journal = [];
  const live = new Set([6000]);
  const supervisor = identity(7000);
  const parentId = "parent-preflight";
  const runId = `${parentId}:watchdog-selftest`;
  let env;
  let life;
  let scope;
  let driver;
  let wd;
  let ownRun;
  let binding;
  let recorder;
  let ops;
  // Teardown is registered before acquisition, releases held IO first, joins
  // real nested scope/recorder bodies, then observes fresh owner zero.
  t.after(async () => {
    scan.resolve();
    if (wd) wd.requestStop("TEARDOWN");
    if (driver) closeFacts(driver);
    if (ownRun) await drain(clock, ownRun);
    else if (recorder) await recorder.closeIncompleteEvidence();
    if (ops) {
      ops.closeOrdinaryAdmission();
      await ops.whenOrdinarySettled();
    }
    if (binding) await binding.settleActual();
    if (scope) await finishDriverActualScope(scope);
    if (life) await life.whenSettled();
    if (env) await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  env = await makeStore();
  life = artifactStoreLifetime(env.store);
  const io = Object.freeze({ retainActual: life.retainActual });
  scope = createDriverActualScope({ runId: parentId, retainActual: life.retainActual });
  const workspace = fixtureWorkspace();
  await writeWorkspaceOnce({ store: env.store, workspace });
  const inputs = await writeFixtureInputs({ store: env.store });
  const originalEnd = clock.nowMonoMs() + 90000;
  const { monitor, calls } = cleanupMonitorFixture({ runId: parentId, clock,
    supervisor, collector: identity(7001),
    rows: () => [...live].map((pid) => row(pid, pid === 6000 ? 7000 : 6000,
      pid === 6000 ? "driver" : "fixture", true, runId)),
    script: {
      knownRoots: { 6000: identity(6000), 6100: identity(6100) },
      probe: (tuple) => {
        if (canonicalBytes(tuple).equals(canonicalBytes(supervisor))) return "same-live";
        if ([6000, 6100].some((pid) => canonicalBytes(tuple).equals(canonicalBytes(identity(pid))))) {
          return live.has(tuple.pid) ? "same-live" : "gone";
        }
        return "unavailable";
      },
      observation: OBS, listeners: { [runId]: { listeners: [], unexpected: [] } },
      signalResult: "sent", onSignal: ({ identity: tuple }) => {
        live.delete(tuple.pid);
        if (tuple.pid === 6000) closeFacts(driver);
      },
    },
  });
  let activeArm;
  const ctx = {
    phase: "preflight", runId: parentId, workspaceId: workspace.workspaceId,
    commonIdentity: workspace.commonIdentity, workspaceRoot: env.workspaceRoot,
    monitor, clock, io, retainActual: life.retainActual, driverActualScope: scope,
    nowMonoMs: clock.nowMonoMs, workRemainingMs: () => originalEnd - clock.nowMonoMs(),
    admissionOpen: () => faults.length === 0, stopped: () => false, stopReason: () => null,
    armOperation: (kind) => {
      assert.equal(kind, "command");
      activeArm = { deadlineMonoMs: originalEnd };
      journal.push("parent-pause");
      return activeArm;
    },
    onFirstStop: () => {}, parentSupervisor: () => supervisor,
    recordFault: (error) => { faults.push(error); parentAck.resolve(); entered.resolve(); },
    requestStop: (reason) => { faults.push(reason); parentAck.resolve(); entered.resolve(); },
    send: async (type, fields) => {
      assert.equal(type, "begun");
      assert.equal(fields.operationId, `${parentId}:preflight-selftest`);
      journal.push("parent-begun");
      parentAck.resolve(fields);
    },
    selftest: { id: `${parentId}:preflight-selftest`, invoked: false, verified: null, completionRef: null },
  };
  ops = createWatchdogOperations({ ctx, records: { manifestInputs: async () => inputs },
    runInternalSelfTest: async (context) => {
      assert.equal(context.deadlineMonoNs, BigInt(originalEnd) * 1000000n);
      const manifest = fixtureManifest({ workspace, phase: "watchdog-selftest", runId,
        owner: context.owner, inputs });
      const collect = factory(async (args, resource) => {
        const persisted = parseCanonicalBytes(await fsp.readFile(path.join(env.workspaceRoot,
          "preflight/selftest/manifest.json")));
        assert.deepEqual(persisted, manifest);
        assert.equal(args.runId, runId);
        assert.equal(args.phase, "watchdog-selftest");
        assert.deepEqual(args.inputs, inputs);
        assert.equal(resource.budget.deadlineMonoMs(), originalEnd - 5000);
        journal.push("own-scan");
        entered.resolve();
        await scan.promise;
        journal.push("own-scan-complete");
        return structuredClone(workspace.commonIdentity);
      });
      const owner = collect({ workspaceRoot: env.workspaceRoot, manifest,
        expectedCommonIdentity: workspace.commonIdentity, workEndMonoMs: originalEnd - 5000, lifetime: life },
      { clock, nowMonoMs: clock.nowMonoMs });
      binding = createRunDrainBinding({ monitor, clock, runId });
      recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
        verifyIdentity: owner.consume, verifyCleanup: binding.cleanup.verifyCleanup });
      driver = forkDriverFixture({ runId, phase: "watchdog-selftest", commonIdentitySha256: manifest.commonIdentitySha256 });
      const actualFork = driver.forkImpl;
      driver.forkImpl = (...args) => { journal.push("fork"); return actualFork(...args); };
      wd = createWatchdog({ phase: "watchdog-selftest", runId, workspace,
        commonIdentitySha256: manifest.commonIdentitySha256,
        manifestPath: path.join(env.workspaceRoot, "preflight/selftest/manifest.json"),
        protocol: createProtocolValidator({ runId }), monitor,
        footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 100 }), stop: () => {} },
        recorder, cleanup: binding.cleanup, finalIntegrity: owner,
        driverEntry: { executable: "/drv/node", expectedExecutable: "/drv/node", args: ["/drv/driver.js"] },
        internalContext: context, selftestOwnerSupervisor: supervisor, clock, spawnImpl: driver.forkImpl,
      });
      ownRun = binding.trackRun(wd.run());
      ownRun.then(() => entered.resolve(), () => entered.resolve());
      subrunReady.resolve();
      await ownRun;
      const filename = "preflight/selftest/completion.json";
      const bytes = await fsp.readFile(path.join(env.workspaceRoot, filename));
      const completionRef = { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
      const verified = await verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef,
        expectedIdentity: workspace.commonIdentity }, io);
      assert.equal(verified.final.stopReason, "HEARTBEAT_TIMEOUT");
      assert.equal(verified.final.exitCode, 2);
      assert.equal(verified.final.analysisEligible, false);
      assert.equal(verified.final.summary.scoredGames, 0);
      assert.equal(verified.final.cleanup.verified, true);
      return { completionRef };
    },
  });
  ops.dispatch({ type: "begin", kind: "command", operationId: ctx.selftest.id });
  await entered.promise;
  assert.deepEqual(faults, []);
  assert.deepEqual(journal, ["parent-pause", "own-scan"]);
  assert.equal(driver.calls.length, 0);
  assert.equal(calls.some((value) => value.startsWith("signal:")), false);
  scan.resolve();
  await subrunReady.promise;
  await liveStart(clock, driver);
  const registered = gate();
  const originalSend = driver.child.send;
  driver.child.send = function (...args) {
    const result = originalSend.apply(this, args);
    if (args[0].type === "registered") registered.resolve();
    return result;
  };
  live.add(6100);
  driver.emit({ type: "register", requestId: "synthetic-child", kind: "fixture", rootPid: 6100,
    expectedExecutable: "/drv/node", listener: null });
  await registered.promise;
  assert.ok(journal.indexOf("own-scan-complete") < journal.indexOf("fork"));
  await advanceBy(clock, 5);
  const result = await drain(clock, ownRun);
  assert.equal(result.stopReason, "HEARTBEAT_TIMEOUT");
  await parentAck.promise;
  assert.deepEqual(faults, []);
  assert.ok(ctx.selftest.verified);
  assert.equal(journal.at(-1), "parent-begun");
  assert.equal(calls.includes("stopAndReap"), false);
  assert.ok(calls.includes("signal:TERM:6100:1000:0:" + runId));
  assert.equal(activeArm.deadlineMonoMs, originalEnd);
});

for (const alreadyComplete of [false, true]) {
  test(`own admission rejects ${alreadyComplete ? "completed" : "unused"} parent observation before driver/injection`, async (t) => {
    const clock = watchdogTestClock();
    const lifetime = createWatchdogLifetime();
    t.after(() => lifetime.whenSettled());
    const workspace = fixtureWorkspace();
    const parent = fixtureManifest({ workspace, phase: "check", runId: "parent" });
    let calls = 0;
    const make = factory(async (args) => { calls += 1; return args.expectedCommonIdentity; });
    const parentOwner = make({ workspaceRoot: "/unit-workspace", manifest: parent,
      expectedCommonIdentity: workspace.commonIdentity, workEndMonoMs: clock.nowMonoMs() + 90000, lifetime },
    { clock, nowMonoMs: clock.nowMonoMs });
    if (alreadyComplete) {
      await parentOwner.collect({ workspaceId: workspace.workspaceId, runId: parent.runId,
        phase: parent.phase, expectedCommonIdentity: workspace.commonIdentity, inputs: parent.inputs },
      { deadlineMonoMs: clock.nowMonoMs() + 90000 });
    }
    const state = { admissionTask: null, workEnd: clock.nowMonoMs() + 85000,
      records: { manifestInputs: async () => structuredClone(parent.inputs) } };
    let injected = false;
    const admissionThenDriver = async () => {
      await admitWatchdogDriver({ config: { selftestPhase: true, runId: "own-selftest",
        phase: "watchdog-selftest", workspace },
      capabilities: { finalIntegrity: parentOwner, io: { retainActual: lifetime.retainActual } }, state,
      timing: { workRemainingMs: () => state.workEnd - clock.nowMonoMs() },
      bounded: (body) => body, checkLive: () => {} });
      injected = true;
    };
    await assert.rejects(admissionThenDriver(), alreadyComplete ? /collection once/ : /collection association/);
    assert.equal(injected, false);
    assert.equal(state.admissionTask, null);
    assert.equal(parentOwner.isComplete(), false);
    assert.equal(calls, alreadyComplete ? 1 : 0);
    await lifetime.whenSettled();
  });
}


// Real shared monitor/state and real nested config/facade admission. This is
// the pre-heartbeat association boundary, not Native heartbeat/cleanup proof.
import { monitorV3, v3Workspace } from "./preflight-v3-test-fixtures.mjs";
import { createV2RecorderWorkspace, v2Workspace } from "./separate-verdicts-test-fixtures.mjs";
import { V2_POLICY, V3_POLICY } from "./evaluation-policy.mjs";

async function sharedMonitorFacade(t, mode) {
  let native, parentScope;
  t.after(async () => {
    if (parentScope) await finishDriverActualScope(parentScope);
    if (native) await native.close();
  });
  const policy = mode === "v2" ? V2_POLICY : V3_POLICY;
  const workspace = policy === V2_POLICY ? v2Workspace() : v3Workspace();
  const env = await createV2RecorderWorkspace(t, { workspace });
  const lifetime = artifactStoreLifetime(env.store);
  native = monitorV3({ lifetime, policy: mode === "wrong-policy" ? V2_POLICY : policy,
    phase: mode === "wrong-phase" ? "check" : "preflight" });
  await native.start();
  const clock = { ...native.clock, nowMonoMs: native.clock.nowMs,
    nowUtc: () => "2026-11-11T00:00:00.000Z" };
  const top = mode === "top-phase" || mode === "top-run";
  const parentRunId = mode === "wrong-parent" ? "foreign-parent" : "R1";
  const runId = top ? mode === "top-run" ? "foreign-parent" : "R1" : `${parentRunId}:watchdog-selftest`;
  const phase = top ? "check" : "watchdog-selftest";
  const supervisor = native.monitor._ready().supervisor;
  const owner = { phase: "preflight", runId: parentRunId, supervisor };
  const manifest = { ...fixtureManifest({ workspace, inputs: env.inputs, phase, runId,
    owner: top ? null : owner }), schemaVersion: 2, evaluationPolicy: policy };
  const recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
    verifyIdentity: async () => workspace.commonIdentity,
    verifyCleanup: async () => { throw new Error("no cleanup proof requested by admission control"); } });
  env.recorders.push(recorder);
  parentScope = createDriverActualScope({ runId: parentRunId, retainActual: lifetime.retainActual });
  const context = { monitor: native.monitor, parentRunId, subrunRunId: runId,
    owner, parentSupervisor: supervisor, commonIdentity: workspace.commonIdentity,
    workspaceRoot: env.workspaceRoot, inputs: env.inputs, phaseDirectory: "preflight/selftest",
    deadlineMonoNs: BigInt(clock.nowMonoMs() + 90000) * 1000000n,
    signal: new AbortController().signal, parentDriverScope: parentScope };
  if (mode === "wrong-context") context.monitor = {};
  if (mode === "wrong-subrun") context.subrunRunId = "unrelated-selftest";
  if (mode === "wrong-owner") context.owner = { ...owner, runId: "unrelated-owner" };
  const options = { phase, runId, workspace, commonIdentitySha256: manifest.commonIdentitySha256,
    manifestPath: path.join(env.workspaceRoot, top ? "check/manifest.json" : "preflight/selftest/manifest.json"),
    protocol: createProtocolValidator({ runId, recordSchemaVersion: 2, evaluationPolicy: policy }),
    monitor: native.monitor, recorder, lifetime, clock,
    footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 0 }), stop() {} },
    cleanup: { run: async () => { throw new Error("no cleanup body requested by admission control"); } },
    driverEntry: { executable: "/drv/node", expectedExecutable: "/drv/node", args: ["/drv/driver.js"] },
    ...(top ? {} : { internalContext: context, selftestOwnerSupervisor: supervisor }) };
  return { native, options, context, runId };
}

for (const mode of ["valid", "v2", "wrong-parent", "wrong-context", "wrong-subrun",
  "wrong-owner", "wrong-phase", "wrong-policy", "top-phase", "top-run"]) {
  test(`shared parent monitor nested facade association: ${mode}`, async (t) => {
    const f = await sharedMonitorFacade(t, mode);
    if (["wrong-context", "wrong-subrun", "wrong-owner"].includes(mode)) {
      assert.throws(() => captureWatchdogRuntimeConfig(f.options), /internalContext.*association/);
      return;
    }
    const captured = captureWatchdogRuntimeConfig(f.options);
    assert.equal(captured.capabilities.monitor, f.native.monitor);
    const group = createWatchdogFacade(captured, actual => actual).run();
    const valid = mode === "valid" || mode === "v2";
    assert.equal(group.control.admissionOpen(), valid,
      "original trusted parent binding must admit only its genuine shared monitor");
    if (!valid) {
      assert.equal(group.state.stopReq?.reason, "ACCOUNTING_UNAVAILABLE");
      return;
    }
    assert.equal(group.state.stopReq, null);
    assert.equal(group.control.intentOutcome().unplannedFaultCount, 0);
    assert.equal(f.native.monitor.fault(), null);
    const raw = f.native.monitor.lastObservation().resourceQuality;
    assert.equal(raw.runId, "R1"); assert.equal(raw.monitorRunId, "R1");
    const prefix = f.native.monitor._captureResourcePrefix({ scopeRunId: f.runId,
      deadlineMonoMs: Number(f.context.deadlineMonoNs / 1000000n) });
    assert.equal(prefix.runId, "R1:watchdog-selftest");
    assert.equal(prefix.monitorRunId, "R1"); assert.equal(prefix.phase, "watchdog-selftest");
    assert.equal(prefix.gapCount, 0); assert.equal(prefix.coverageLost, false);
    assert.equal(prefix.pending, false); assert(Object.isFrozen(prefix));
    assert.equal(f.native.monitor.lastObservation().resourceQuality.runId, "R1",
      "a nested prefix never rewrites the shared parent ledger");
  });
}
