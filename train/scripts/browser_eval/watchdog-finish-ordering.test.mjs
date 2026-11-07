// Exact shutdown statement ordering, genuine ordinary queue and Recorder.
// Controlled Native-free dependencies do not establish a phase/cleanup pass.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp, realpathSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createNativeHorizon } from "./process-horizon.mjs";
import { cleanupProofEnd } from "./watchdog-cleanup-context.mjs";
import { makeRecorder } from "./test-fixtures.mjs";
import { phaseRecorderLifetime } from "./records.mjs";
import { createWatchdogRecordAdapter } from "./watchdog-records.mjs";
import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { createWatchdogLifetime, observeAwaitStage } from "./watchdog-lifetime.mjs";
import { createMonitorFixture, monitorBootstrapScript, monitorReadyOptions } from "./process-monitor-test-fixtures.mjs";
import { artifactStoreLifetime, createArtifactStore } from "./artifact-store.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { issueActual } from "./artifact-files.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { forkDriverFixture } from "./watchdog-driver-test-fixtures.mjs";
import { createRunDrainBinding, drain, liveStart } from "./watchdog-drain-test-fixtures.mjs";
import { bsdRow } from "./supervision-test-fixtures.mjs";
import { makeStore, makeTmpDir, fixtureWorkspace, fixtureManifest, writeFixtureInputs } from "./test-fixtures.mjs";
const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const text = await fsp.readFile(new URL("./watchdog-shutdown.mjs", import.meta.url), "utf8");
const parsed = ts.createSourceFile("watchdog-shutdown.mjs", text, ts.ScriptTarget.Latest, true);
let selected;
const visit = (node) => {
  if (ts.isBlock(node)) {
    const at = node.statements.findIndex((item) => ts.isIfStatement(item) &&
      item.getText(parsed).includes('state.records.stopOrdinary()') &&
      item.getText(parsed).includes('"stop-ordinary"'));
    if (at >= 0) {
      const prior = node.statements[at - 1];
      // Select the exact optional normal-finish drain and unchanged real
      // Recorder stop statement. No copied ordering implementation.
      selected = [
        ...(prior?.getText(parsed).includes('"finish-operation-tail"') ? [prior] : []),
        node.statements[at],
      ];
    }
  }
  ts.forEachChild(node, visit);
};
visit(parsed);
assert.ok(selected);
const stopStatements = new Function("state", "boundedCleanup", "control", "stage", "proofEnd",
  `return (async()=>{${selected.map((item) => item.getText(parsed)).join("\n")}})();`);

for (const normal of [true, false]) {
  test(`${normal ? "normal finish drains" : "fault stop fences"} an already-admitted end under the original bound`, async (t) => {
    const release = gate();
    const entered = gate();
    const stopCalled = gate();
    const faults = [];
    let env;
    let ops;
    let pending;
    let joined;
    t.after(async () => {
      release.resolve();
      if (ops) {
        ops.closeOrdinaryAdmission();
        await ops.whenOrdinarySettled();
      }
      await Promise.allSettled([pending, joined].filter(Boolean));
      if (env) {
        await env.recorder.closeIncompleteEvidence();
        await phaseRecorderLifetime(env.recorder).whenSettled();
        await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
      }
    });
    env = await makeRecorder();
    const life = phaseRecorderLifetime(env.recorder);
    const adapter = createWatchdogRecordAdapter({ recorder: env.recorder,
      workspaceRoot: env.workspaceRoot, manifestRel: "check/manifest.json", phase: "check",
      commonIdentity: env.ws.commonIdentity, io: Object.freeze({ retainActual: life.retainActual }) });
    let admission = true;
    let stopped = false;
    const ctx = { runId: env.mf.runId, phase: "check", selftest: {},
      retainActual: life.retainActual, stopped: () => stopped,
      admissionOpen: () => admission, operationDeadline: () => 90000,
      disarmOperation: () => {}, nowMonoMs: () => 10,
      recordFault: (error) => faults.push(error), requestStop: () => { stopped = true; } };
    ops = createWatchdogOperations({ ctx, records: { ...adapter,
      recordOperationEnd: async (...args) => {
        entered.resolve();
        await release.promise;
        return adapter.recordOperationEnd(...args);
      },
    } });
    ops.dispatch({ type: "end", operationId: "last-work", result: {
      status: "completed", evidencePaths: [], detail: {},
    } });
    await entered.promise;
    admission = false;
    stopped = !normal;
    ops.closeOrdinaryAdmission();
    let stoppedRecorder = false;
    const state = { finishReq: normal ? {} : null, stopReq: normal ? null : { reason: "REQUESTED" },
      ops, records: { ...adapter, stopOrdinary: () => {
        stoppedRecorder = true;
        stopCalled.resolve();
        return adapter.stopOrdinary();
      } } };
    const waits = [];
    const originalEnd = 5000;
    const proofEnd = cleanupProofEnd(0, originalEnd, "phase-workload");
    const boundedCleanup = (body, label, end = originalEnd) => {
      waits.push({ label, end });
      return body;
    };
    pending = stopStatements(state, boundedCleanup, { recordFault: (error) => faults.push(error) },
      (label, issue) => observeAwaitStage(life, "phase", label, issue), proofEnd);
    pending.catch(() => {});
    if (normal) {
      assert.equal(stoppedRecorder, false);
      assert.equal(waits[0].label, "finish-operation-tail");
    } else {
      await Promise.race([stopCalled.promise, pending]);
      await pending;
      assert.equal(waits.some((item) => item.label === "finish-operation-tail"), false);
    }
    release.resolve();
    joined = ops.whenOrdinarySettled();
    await joined;
    await pending;
    assert.equal(stoppedRecorder, true);
    assert.deepEqual(waits, [
      ...(normal ? [{ label: "finish-operation-tail", end: proofEnd }] : []),
      { label: "stop-ordinary", end: originalEnd },
      ...(!normal ? [{ label: "game-stop", end: originalEnd }] : []),
    ]);
    if (normal) {
      assert.deepEqual(faults, []);
      const events = (await fsp.readFile(env.workspaceRoot + "/check/events.jsonl", "utf8"))
        .trim().split("\n").map(JSON.parse);
      assert.equal(events.at(-1).kind, "operation");
      assert.equal(events.at(-1).payload.operationId, "last-work");
    }
    await assert.rejects(env.recorder.appendEvent({ kind: "operation", payload: {} }),
      (error) => error.code === "RECORDER_STATE" && /ordinary work stopped/.test(error.message));
  });
}



for (const mode of ["raw-write", "footprint"]) {
  test(`pre-A sticky containment and first-cause marker: ${mode}`, { timeout: 15000 }, async (t) => {
    const primary = Object.freeze(Object.assign(new Error("controlled raw events write"), { code: "CONTROLLED_WRITE" }));
    const ready = gate();
    const started = gate();
    const cleanupEntered = gate();
    const lifetimeEntered = gate();
    const closeEntered = gate();
    const closeRelease = gate();
    const markers = [];
    const markerLines = [];
    const basename = "failed-" + "x".repeat(80) + ".bin";
    const horizon = createNativeHorizon();
    const owner = createWatchdogLifetime({ reportAwaitStage: (line) => {
      const marker = JSON.parse(line.slice("TINYAZ_AWAIT ".length));
      if (marker.stage === "ordinary.fault") {
        assert.ok(horizon.reader.read() <= clock.nowMs() + 5000, "first-stop already narrowed");
      }
      markers.push(marker);
      markerLines.push(line);
      if (marker.stage === "cleanup.run" && marker.state === "entered") cleanupEntered.resolve();
      if (marker.stage === "shutdown.lifetime" && marker.state === "entered") lifetimeEntered.resolve();
    } });
    let env;
    let native;
    let recorder;
    let driver;
    let wd;
    let clock;
    let binding;
    let pending;
    let draining;
    let armed = false;
    let rawWriteFailures = 0;
    let rawHandle = null;
    let rawCloseCalls = 0;
    let physicallyClosed = false;
    let returned = false;
    let manualRescue = false;
    const actualOpen = fsp.open;
    const actualStat = fsp.lstat;
    let firstCause;
    let stickyWrapper;
    t.after(async () => {
      closeRelease.resolve();
      if (driver) {
        driver.releaseSendCallbacks();
        driver.exit(0);
        driver.closeOut();
        driver.closeErr();
      }
      if (native) native.fixture.exit(2);
      if (wd) wd.requestStop("TEARDOWN");
      if (recorder && !returned) {
        manualRescue = true;
        await recorder.closeIncompleteEvidence().catch(() => {});
      }
      if (draining) await draining;
      else if (pending) await drain(clock, pending);
      if (binding) await binding.settleActual();
      if (native) await native.monitor.stopAndReap();
      await owner.whenSettled();
      fsp.open = actualOpen;
      fsp.lstat = actualStat;
      if (native) native.cleanup();
      if (env) await fsp.rm(env.cleanupRoot ?? env.workspaceRoot, { recursive: true, force: true });
      t.diagnostic(JSON.stringify({ manualRescue, rawWriteFailures, rawCloseCalls, physicallyClosed, returned }));
    });
    if (mode === "footprint") {
      const cleanupRoot = await makeTmpDir();
      const workspaceRoot = path.join(cleanupRoot, "long-root-" + "p".repeat(80), "prefix-" + "q".repeat(80));
      await fsp.mkdir(path.join(workspaceRoot, "cache"), { recursive: true });
      await fsp.writeFile(path.join(workspaceRoot, "cache", basename), "data");
      const footprint = createFootprintObserver({ workspaceRoot, clock: { nowMonoMs: () => 0 } });
      env = { workspaceRoot, cleanupRoot, store: createArtifactStore({ workspaceRoot, lifetime: owner,
        monotonicNow: () => 0, readFootprint: () => issueActual(owner.retainActual, () => footprint.readFootprint()) }) };
    } else {
      env = await makeStore({ lifetime: owner });
    }
    fsp.lstat = function (...args) {
      if (mode === "footprint" && armed && args[0] === path.join(env.workspaceRoot, "cache", basename)) {
        armed = false; // Only the first real scan fails; containment may close normally.
        return Promise.reject(Object.assign(new Error("controlled missing entry"), { code: "ENOENT" }));
      }
      return Reflect.apply(actualStat, this, args);
    };
    assert.equal(artifactStoreLifetime(env.store), owner);
    const eventsPath = path.join(env.workspaceRoot, "check/events.jsonl");
    fsp.open = async function (...args) {
      const handle = await Reflect.apply(actualOpen, this, args);
      if (String(args[0]) === eventsPath) {
        rawHandle = handle;
        const write = handle.write;
        const close = handle.close;
        handle.write = function (...writeArgs) {
          if (armed && mode === "raw-write") {
            rawWriteFailures += 1;
            throw primary;
          }
          return Reflect.apply(write, this, writeArgs);
        };
        handle.close = async function (...closeArgs) {
          rawCloseCalls += 1;
          closeEntered.resolve();
          await closeRelease.promise;
          const result = await Reflect.apply(close, this, closeArgs);
          physicallyClosed = true;
          return result;
        };
      }
      return handle;
    };
    const script = monitorBootstrapScript();
    script.inspected[6000] = { pid: 6000, state: "live",
      process: bsdRow(6000, process.pid, 6000, 501), executable: realpathSync(process.execPath) };
    native = createMonitorFixture({ lifetime: owner, script });
    const clearTimer = (id) => {
      native.clock.clearTimeout(id);
      native.clock.clearInterval(id);
    };
    clock = { ...native.clock, clearTimeout: clearTimer, clearInterval: clearTimer,
      nowMonoMs: native.clock.nowMs, nowUtc: () => "2026-11-06T00:00:00Z" };
    const workspace = fixtureWorkspace();
    await writeWorkspaceOnce({ store: env.store, workspace });
    const inputs = await writeFixtureInputs({ store: env.store });
    const manifest = fixtureManifest({ workspace, runId: "R1", inputs });
    binding = createRunDrainBinding({ monitor: native.monitor, clock, runId: "R1", lifetime: owner });
    recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: async () => structuredClone(workspace.commonIdentity),
      verifyCleanup: binding.cleanup.verifyCleanup });
    driver = forkDriverFixture({ runId: "R1", phase: "check", commonIdentitySha256: manifest.commonIdentitySha256 });
    const send = driver.child.send;
    driver.child.send = function (...args) {
      const result = Reflect.apply(send, this, args);
      if (args[0].type === "start") started.resolve();
      return result;
    };
    const onListener = (name) => {
      if (name === "data") {
        native.fixture.child.stdout.off("newListener", onListener);
        ready.resolve();
      }
    };
    native.fixture.child.stdout.on("newListener", onListener);
    wd = createWatchdog({ phase: "check", runId: "R1", workspace,
      commonIdentitySha256: manifest.commonIdentitySha256,
      manifestPath: path.join(realpathSync(env.workspaceRoot), "check/manifest.json"),
      protocol: native.fixture.protocol, monitor: native.monitor, recorder,
      cleanup: binding.cleanup, clock, spawnImpl: driver.forkImpl, lifetime: owner,
      nativeHorizon: horizon,
      footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 100 }), stop: () => {} },
      driverEntry: { executable: process.execPath, expectedExecutable: realpathSync(process.execPath), args: ["/unit/driver.mjs"] },
    });
    pending = binding.trackRun(wd.run());
    pending.then(() => { returned = true; });
    const early = pending.then(() => { throw new Error("run ended before controlled boundary"); });
    early.catch(() => {});
    await Promise.race([ready.promise, early]);
    native.fixture.ready(monitorReadyOptions());
    native.clock.advance(10);
    await Promise.race([liveStart(clock, driver), early]);
    await Promise.race([started.promise, early]);
    assert.ok(rawHandle, "genuine events FD acquired before first failure");
    armed = true;
    const payload = { operationId: "controlled-first-write", result: { status: "completed", evidencePaths: [], detail: {} } };
    driver.emit({ type: "event", recordId: "controlled-record", recordSeq: 0, kind: "operation", payload });
    await Promise.race([cleanupEntered.promise, early]);
    if (mode === "footprint") {
      await assert.rejects(recorder.stopOrdinary(), (error) => {
        stickyWrapper = error;
        firstCause = error.cause;
        return error.code === "RECORDER_STICKY";
      });
    }
    driver.emit({ type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [] });
    driver.exit(0);
    driver.closeOut();
    driver.closeErr();
    native.fixture.exit(2);
    draining = drain(clock, pending);
    draining.catch(() => {});
    await Promise.race([closeEntered.promise, lifetimeEntered.promise]);
    assert.equal(rawWriteFailures, mode === "raw-write" ? 1 : 0);
    assert.equal(rawCloseCalls, 1, "failed finalization starts genuine incomplete containment");
    assert.equal(physicallyClosed, false);
    assert.equal(returned, false);
    assert.equal(native.clock.liveIntervals(), 0, "Native teardown is independent of held file close");
    assert.ok(markers.some((marker) => marker.stage === "records.containment" && marker.state === "entered"));
    assert.equal(markers.some((marker) => marker.stage === "shutdown.lifetime"), false);
    let zero = false;
    const joined = owner.whenSettled().then(() => { zero = true; });
    assert.equal(zero, false, "held actual FD close cannot become owner zero");
    closeRelease.resolve();
    const outcome = await draining;
    await joined;
    assert.equal(physicallyClosed, true);
    assert.equal(rawHandle.fd, -1);
    assert.equal(outcome.stopReason, mode === "raw-write" ? "FAULT CONTROLLED_WRITE" : "FAULT STORE_ACCOUNTING");
    assert.equal(outcome.exitCode, 2);
    assert.equal(manualRescue, false);
    const primaryMarker = markers.find((marker) => marker.stage === "ordinary.fault");
    assert.equal(primaryMarker?.code, mode === "raw-write" ? "CONTROLLED_WRITE" : "STORE_ACCOUNTING");
    if (mode === "footprint") {
      assert.ok(primaryMarker.detail.includes(`ENOENT lstat cache/${basename.slice(-24)}`));
      const raw = markerLines.find((line) => {
        const marker = JSON.parse(line.slice("TINYAZ_AWAIT ".length));
        return marker.stage === "records.finalize" && marker.state === "rejected";
      });
      assert.ok(raw);
      assert.ok(Buffer.byteLength(raw) <= 256);
      const marker = JSON.parse(raw.slice("TINYAZ_AWAIT ".length));
      assert.ok(marker.detail?.includes(`ENOENT lstat cache/${basename.slice(-24)}`), raw);
      assert.equal(marker.code, "RECORDER_STICKY");
      assert.equal(marker.causeCode, "STORE_ACCOUNTING");
      assert.equal(stickyWrapper.message, "records RECORDER_STICKY: STORE_ACCOUNTING");
      assert.equal(stickyWrapper.cause, firstCause);
      assert.equal(raw.includes(env.workspaceRoot), false);
      assert.ok(markers.some((marker) => marker.stage === "records.containment" && marker.state === "fulfilled"));
      await assert.rejects(recorder.stopOrdinary(), (error) => {
        assert.equal(error.code, "RECORDER_STATE");
        return true;
      });
      assert.equal(firstCause.code, "STORE_ACCOUNTING");
    }

    await assert.rejects(fsp.stat(path.join(env.workspaceRoot, "check/final.json")), { code: "ENOENT" });
    await assert.rejects(fsp.stat(path.join(env.workspaceRoot, "check/completion.json")), { code: "ENOENT" });
  });

}
