// Shared Native protocol/periodic-response faults through the actual full
// Watchdog, monitor, Recorder and borrowed lifetime. All process effects are
// controlled fixtures. This suite establishes no actual Native/phase pass.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp, realpathSync } from "node:fs";
import path from "node:path";
import { createMonitorFixture, monitorBootstrapScript, monitorReadyOptions } from "./process-monitor-test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createNativeHorizon } from "./process-horizon.mjs";
import { forkDriverFixture } from "./watchdog-driver-test-fixtures.mjs";
import { createRunDrainBinding, drain, liveStart } from "./watchdog-drain-test-fixtures.mjs";
import { parseCanonicalBytes } from "./canonical-json.mjs";
import { bsdRow } from "./supervision-test-fixtures.mjs";
import { makeStore, fixtureWorkspace, fixtureManifest, writeFixtureInputs } from "./test-fixtures.mjs";
import { issueActual } from "./artifact-files.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};

for (const [holdCleanupEvent, periodic, heartbeat] of [[false, false], [true, false], [false, true], [false, false, true], [false, false, "bad"], [false, false, "closed-first"]]) {
  test(`shared Native fault stops sampler, held event=${holdCleanupEvent}, pending periodic=${periodic}, driver=${heartbeat ?? "register"}`, { timeout: 15000 }, async (t) => {
    const ready = gate();
    const started = gate();
    const eventRelease = gate();
    const eventEntered = gate();
    const monitorStopped = gate();
    const stopCalls = [];
    const driverStops = [];
    const driverStopped = gate();
    const stopResults = [];
    const cleanupStages = [];
    const sampleEntered = gate();
    const markers = [];
    const cleanupCompleted = gate();
    const boundsAtEntry = [];
    let stopAt = null;
    let horizon;
    let env;
    let native;
    let driver;
    let wd;
    let binding;
    let pending;
    let recorder;
    let lifetime;
    let clock;
    let live = false;
    t.after(async () => {
      eventRelease.resolve();
      if (native) native.fixture.exit(2);
      if (driver) {
        driver.releaseSendCallbacks();
        if (live) driver.emit({ type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [] });
        driver.exit(0); driver.closeOut(); driver.closeErr();
      }
      if (wd) wd.requestStop("TEARDOWN");
      if (pending) await drain(clock, pending);
      else if (recorder) await recorder.closeIncompleteEvidence();
      if (binding) await binding.settleActual();
      if (native) await native.monitor.stopAndReap();
      if (lifetime) await lifetime.whenSettled();
      if (native) native.cleanup();
      if (env) await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
    });
    const suppliedOwner = createWatchdogLifetime({ reportAwaitStage: (line) => {
      const marker = JSON.parse(line.slice("TINYAZ_AWAIT ".length));
      if (marker.stage === "cleanup.run" && marker.state === "entered") {
        boundsAtEntry.push(horizon.reader.read());
      }
      if (marker.stage === "cleanup.run" && marker.state === "fulfilled") {
        cleanupCompleted.resolve();
      }
      markers.push(marker);
    } });
    env = await makeStore({ lifetime: suppliedOwner });
    lifetime = artifactStoreLifetime(env.store);
    const script = monitorBootstrapScript();
    script.inspected[6000] = { pid: 6000, state: "live",
      process: bsdRow(6000, process.pid, 6000, 501), executable: realpathSync(process.execPath) };
    native = createMonitorFixture({ lifetime, script });
    // Node's two clear functions accept either timer kind. Keep this local
    // clock faithful so generic WD interval debt cannot mask sampler state.
    const clearTimer = (id) => {
      native.clock.clearTimeout(id);
      native.clock.clearInterval(id);
    };
    clock = { ...native.clock, clearTimeout: clearTimer, clearInterval: clearTimer,
      nowMonoMs: native.clock.nowMs,
      nowUtc: () => "2026-11-06T00:00:00Z" };
    const observedMonitor = { ...native.monitor, stopAndReap(...args) {
      stopCalls.push({ at: clock.nowMonoMs(), args: structuredClone(args) });
      const actual = Reflect.apply(native.monitor.stopAndReap, native.monitor, args);
      actual.then(() => {
        stopResults.push({ ok: true });
        monitorStopped.resolve();
      }, (error) => {
        stopResults.push({ ok: false, error });
        monitorStopped.resolve();
      });
      return actual;
    } };
    horizon = createNativeHorizon();
    const workspace = fixtureWorkspace();
    await writeWorkspaceOnce({ store: env.store, workspace });
    const inputs = await writeFixtureInputs({ store: env.store });
    const manifest = fixtureManifest({ workspace, runId: "R1", inputs });
    recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: async () => structuredClone(workspace.commonIdentity),
      verifyCleanup: (q) => binding.cleanup.verifyCleanup(q) });
    binding = createRunDrainBinding({ monitor: observedMonitor, clock, runId: "R1", lifetime,
      recordEvent: (event) => issueActual(lifetime.retainActual, async () => {
        cleanupStages.push({ stage: event.payload.stage, at: clock.nowMonoMs() });
        if (holdCleanupEvent && event.payload.stage === "graceful") {
          eventEntered.resolve();
          await eventRelease.promise;
        }
        return recorder.appendEvent(event);
      }) });
    driver = forkDriverFixture({ runId: "R1", phase: "check", commonIdentitySha256: manifest.commonIdentitySha256 });
    const send = driver.child.send;
    driver.child.send = function (...args) {
      const result = send.apply(this, args);
      if (args[0].type === "start") started.resolve();
      if (args[0].type === "stop") {
        driverStops.push(structuredClone(args[0]));
        driverStopped.resolve();
      }
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
      cleanup: binding.cleanup, clock, spawnImpl: driver.forkImpl, lifetime, nativeHorizon: horizon,
      footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 100 }), stop: () => {} },
      driverEntry: { executable: process.execPath, expectedExecutable: realpathSync(process.execPath), args: ["/unit/driver.mjs"] },
    });
    pending = binding.trackRun(wd.run());
    const early = pending.then(() => { throw new Error("run ended before observed startup boundary"); });
    early.catch(() => {});
    await Promise.race([ready.promise, early]);
    native.fixture.ready(monitorReadyOptions());
    native.clock.advance(10);
    await Promise.race([liveStart(clock, driver), early]);
    await Promise.race([started.promise, early]);
    live = true;
    const registration = { type: "register", requestId: "startup-fixture", kind: "fixture",
      rootPid: null, expectedExecutable: null, listener: null };
    const healthy = createProtocolValidator({ runId: "R1" });
    for (const [direction, frame] of [
      ["d2s", { ipcVersion: 1, runId: "R1", seq: 0, type: "hello", pid: 6000,
        phase: "check", commonIdentitySha256: manifest.commonIdentitySha256 }],
      ["s2d", { ipcVersion: 1, runId: "R1", seq: 0, type: "start", manifestPath: "check/manifest.json",
        commonIdentitySha256: manifest.commonIdentitySha256 }],
      ["d2s", { ipcVersion: 1, runId: "R1", seq: 1, ...registration }],
    ]) healthy.accept("driver", direction, frame, Buffer.byteLength(JSON.stringify(frame)));
    const first = JSON.stringify({ sameMembership: true, orderEqual: false });
    const second = JSON.stringify({ sameMembership: false, orderEqual: false });
    const reason = heartbeat ? "permission" : "unstable-list";
    const diagnostic = heartbeat ? "pidinfo-bsd 37355 errno 1" :
      `pid list never stable [${first},${" ".repeat(3700)}${second}]`;
    let requestId = null;
    if (periodic) {
      script.muteSample = true;
      script.onSend = (message) => {
        if (message.type === "sample") sampleEntered.resolve(structuredClone(message));
      };
      // Drive the already-armed periodic sampler, not the public sample API.
      native.clock.advance(250);
      const issued = await Promise.race([sampleEntered.promise, early]);
      assert.equal(issued.type, "sample");
      assert.equal(typeof issued.requestId, "string");
      requestId = issued.requestId;
    }
    native.fixture.emit({ type: "accounting-fault", code: "ACCOUNTING_UNAVAILABLE",
      reason, diagnostic, requestId });
    const fault = native.monitor.fault();
    assert.ok(fault.detail.includes(diagnostic));
    const beforeRegister = clock.nowMonoMs();
    stopAt = beforeRegister;
    const originalPhaseEnd = horizon.reader.read();
    if (periodic) native.clock.runDue();
    else driver.emit(heartbeat === "closed-first" ? {
      type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [],
    } : heartbeat ? { type: "heartbeat", operationId: heartbeat === "bad" ? "ghost" : null } : registration);
    assert.equal(horizon.reader.read(), beforeRegister + 5000);
    assert.ok(horizon.reader.read() < originalPhaseEnd);
    if (heartbeat === true) await Promise.race([driverStopped.promise, early]);
    if (heartbeat !== "closed-first") driver.emit({ type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [] });
    driver.exit(0); driver.closeOut(); driver.closeErr();
    native.fixture.exit(2);
    let returned = false;
    pending.then(() => { returned = true; });
    const draining = drain(clock, pending);
    if (holdCleanupEvent) {
      await eventEntered.promise;
      await monitorStopped.promise;
      await cleanupCompleted.promise;
      assert.equal(returned, false, "held raw event remains actual owned debt");
      assert.equal(native.clock.liveIntervals(), 0);
      assert.ok(markers.some((marker) => marker.stage === "cleanup.run" && marker.state === "entered"));
      assert.ok(markers.some((marker) => marker.stage === "cleanup.run" && marker.state === "fulfilled"));
      assert.equal(markers.some((marker) => marker.stage === "shutdown.lifetime" &&
        marker.state === "fulfilled"), false);
      const eventEntry = markers.find((marker) => marker.stage === "cleanup.event" && marker.state === "entered");
      assert.ok(eventEntry);
      assert.equal(markers.some((marker) => marker.call === eventEntry.call && marker.state === "fulfilled"), false);
      assert.deepEqual(cleanupStages.slice(0, 3), [
        { stage: "graceful", at: beforeRegister },
        { stage: "term", at: beforeRegister + 2000 },
        { stage: "kill", at: beforeRegister + 4000 },
      ]);
      eventRelease.resolve();
    }
    const outcome = await draining;
    assert.equal(stopCalls.length, 1, "real monitor stop occurs before teardown fallback");
    assert.deepEqual(stopResults, [{ ok: true }]);
    assert.deepEqual(boundsAtEntry, [stopAt + 5000]);
    assert.equal(stopCalls[0].args[0].deadlineMonoMs, beforeRegister + 5000);
    assert.ok(stopCalls[0].at < beforeRegister + 5000);
    assert.equal(native.clock.liveIntervals(), 0,
      "Watchdog outcome must close the sampler before test teardown");
    assert.equal(outcome.stopReason, "ACCOUNTING_UNAVAILABLE");
    assert.equal(outcome.exitCode, 2);
    const lines = (await fsp.readFile(path.join(env.workspaceRoot, "check/events.jsonl"), "utf8"))
      .trim().split("\n").map((line) => parseCanonicalBytes(Buffer.from(line + "\n")));
    const event = lines.find((line) => line.kind === "fault");
    assert.equal(lines.filter((line) => line.kind === "cleanup" &&
      line.payload.stage === "graceful").length, 1);
    if (!periodic && !heartbeat) {
      assert.equal(event.seq, 0);
      assert.equal(lines.some((line) => line.kind === "resource"), false);
      assert.ok(lines.some((line) => line.kind === "fault" && line.payload.detail.includes("register after fault")));
    } else if (periodic) {
      const replied = native.fixture.written.filter((frame) => frame.requestId === requestId);
      assert.equal(replied.length, 1);
      assert.equal(replied[0].type, "sample");
    }
    assert.equal(event.payload.code, "ACCOUNTING_UNAVAILABLE");
    t.diagnostic(JSON.stringify({ nativeCode: fault.code, primaryCode: event.payload.code,
      nativePairs: [fault.detail.includes(first), fault.detail.includes(second)],
      persistedPairs: [event.payload.detail.includes(first), event.payload.detail.includes(second)] }));
    if (heartbeat) {
      assert.ok(event.payload.detail.includes("collector permission: pidinfo-bsd 37355 errno 1"));
    } else {
      assert.ok(event.payload.detail.includes("collector unstable-list: pid list never stable"));
      assert.ok(event.payload.detail.includes(first));
      assert.ok(event.payload.detail.includes(second));
    }
    assert.ok(Buffer.byteLength(event.payload.detail) <= 4096);
    const final = parseCanonicalBytes(await fsp.readFile(path.join(env.workspaceRoot, "check/final.json")));
    if (heartbeat === true) {
      assert.equal(final.unplannedFaultCount, 1, "one real Native fault, no heartbeat/STOP cascade");
      assert.equal(driverStops.length, 1);
      assert.equal(driverStops[0].stopReason, "ACCOUNTING_UNAVAILABLE");
    }
    if (heartbeat === "closed-first") {
      assert.equal(final.unplannedFaultCount, 1, "valid CLOSED still dispatches after Native first-stop");
      assert.equal(driverStops.length, 0);
    }
    if (heartbeat === "bad") {
      assert.ok(final.unplannedFaultCount >= 2);
      assert.ok(lines.some((line) => line.kind === "fault" && line.payload.detail.includes("heartbeat op")));
    }
    assert.equal(final.cleanup.accountingValid, false);
    assert.equal(final.cleanup.verified, false);
    assert.deepEqual(native.monitor.fault(), fault);
    assert.equal(processMonitorLifetime(native.monitor), lifetime);
    await lifetime.whenSettled();
    assert.equal(native.clock.pendingTimeouts(), 0);
  });
}
