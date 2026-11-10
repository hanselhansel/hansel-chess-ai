// TEST-only genuine monitor/transport/ownership; controlled Native envelope facts.
import test from "node:test";
import assert from "node:assert/strict";
import { identity, bsdRow, sampleReply } from "./supervision-test-fixtures.mjs";
import { qualityMonitor, qualitySamples, flushQuality } from "./separate-verdicts-test-fixtures.mjs";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fixtureManifest, fixtureRunning, makeStore, writeFixtureInputs, ref } from "./test-fixtures.mjs";
import { v2Workspace } from "./separate-verdicts-test-fixtures.mjs";
import { createPhaseRecorder, phaseRecorderLifetime, writeWorkspaceOnce } from "./records.mjs";
import { createResourceQuality } from "./resource-quality.mjs";
import { createWatchdogFacade } from "./watchdog.mjs";
import { captureWatchdogRuntimeConfig, createWatchdogOperationContext } from "./watchdog-config.mjs";
import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { createWatchdogRecordAdapter } from "./watchdog-records.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { createDriverChannel } from "./watchdog-driver.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { cleanupMonitorFixture, watchdogTestClock, forkDriverFixture } from "./watchdog-test-fixtures.mjs";
import { armResourcePolling } from "./watchdog-resource-policy.mjs";
import { createPgnEvidence } from "./pgn-evidence.mjs";
import { buildGameSchedule } from "./phase-fixtures.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";

const old = identity(4444);
const root = async (f, startSec = "1000") => {
  f.script.inspected[4444] = { pid: 4444, state: "live",
    process: bsdRow(4444, process.pid, 4444, 501, startSec), executable: "/bin/echo" };
  return f.monitor.registerRoot({ pid: 4444, kind: "driver", expectedExecutable: "/bin/echo", scopeRunId: "R1" });
};
const gone = (f, { nativeSlow = false, cap = false } = {}) => {
  const request = qualitySamples(f).at(-1);
  const reply = sampleReply({ ...request, script: f.script });
  reply.gone = [old];
  reply.samples = reply.samples.filter((s) => s.identity.pid !== old.pid);
  if (nativeSlow) reply.finishedAtMonoNs = "501000001";
  if (cap) reply.samples[0].residentBytes = 4294967297;
  f.fixture.emit(reply);
};
const tick = async (f, ms = 250) => { f.script.muteSample = true; f.clock.advance(ms); await flushQuality(); };

test("v2 timely-after-gap admits terminal absence with full immutable ownership history", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); await root(f);
    await tick(f, 501); gone(f); await flushQuality();
    assert.equal(f.monitor.fault(), null);
    assert.equal(f.monitor.lastObservation().coverageContinuous, false);
    const count = qualitySamples(f).length;
    assert.equal(await f.monitor.probeIdentity(old), "gone");
    assert.equal(qualitySamples(f).length, count, "admitted exact absence needs no fresh native probe");
    assert.ok(f.monitor._ownership.ownedIdentities().some((i) => i.pid === old.pid));
  } finally { await f.dispose(); }
});

for (const cause of ["nativeSlow", "cap"]) {
  test(`v2 complete ${cause} gone cannot mint terminal absence`, async () => {
    const f = qualityMonitor();
    try {
      await f.start(); await root(f);
      await tick(f); gone(f, { [cause]: true }); await flushQuality();
      assert.equal(f.monitor.fault(), null);
      f.clock.advance(250); await flushQuality();
      assert.ok(qualitySamples(f).at(-1).owned.some((i) => i.pid === old.pid));
      if (cause === "nativeSlow") {
        gone(f); await flushQuality();
        const count = qualitySamples(f).length;
        assert.equal(await f.monitor.probeIdentity(old), "gone");
        assert.equal(qualitySamples(f).length, count);
      } else { f.reply(); await flushQuality(); }
    } finally { await f.dispose(); }
  });
}

test("v2 terminal exact reappearance stays hard and same PID/new birth has fresh admission", async () => {
  for (const newBirth of [false, true]) {
    const f = qualityMonitor();
    try {
      await f.start(); await root(f);
      await tick(f, 501); gone(f); await flushQuality();
      f.script.muteSample = false;
      if (newBirth) {
        await root(f, "2000");
        await tick(f);
        assert.deepEqual(qualitySamples(f).at(-1).owned.find((i) => i.pid === old.pid), identity(4444, "2000"));
        f.reply(); await flushQuality();
        assert.equal(f.monitor.fault(), null);
      } else {
        await tick(f);
        f.reply({ discovered: [bsdRow(4444, process.pid, 4444, 501)] }); await flushQuality();
        assert.match(f.monitor.fault().detail, /terminal identity reappeared/);
      }
    } finally { await f.dispose(); }
  }
});

test("v2 terminal absence and fenced cap cannot retire missing actual parent pipe", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); await root(f);
    await tick(f, 501); gone(f); await flushQuality();
    f.script.holdShutdown = true;
    const stop = f.monitor.stopAndReap();
    let settled = false;
    stop.then(() => { settled = true; });
    await flushQuality();
    f.fixture.child.exit(0); f.fixture.child.stdout.emitClose();
    await flushQuality();
    assert.equal(settled, false);
    assert.equal(f.monitor.lastObservation().resourceQuality.coverageEndNs, f.clock.nowMonoNs());
    f.fixture.child.stderr.emitClose(); await stop;
    assert.equal(settled, true);
  } finally { await f.dispose(); }
});

test("v2 already-issued numeric root proof cannot commit after the stop fence", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); f.script.muteSample = true;
    const pending = root(f);
    const rejected = assert.rejects(pending, /monitor stopping/);
    await flushQuality();
    const stop = f.monitor.stopAndReap();
    f.reply(); await rejected; await stop;
    assert.equal(f.monitor._ownership.ownedIdentities().some((i) => i.pid === old.pid), false);
    assert.equal(f.fixture.written.filter((m) => m.type === "own-roots").length, 1);
  } finally { await f.dispose(); }
});

test("v2 unqueued backend work admitted before the fence cannot issue afterward", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const backend = f.monitor.backendIdentity();
    const rejected = assert.rejects(backend, /monitor stopping/);
    const count = f.fixture.written.length;
    await f.monitor.stopAndReap(); await rejected;
    assert.equal(f.fixture.written.length, count + 1, "only authorized shutdown issues");
  } finally { await f.dispose(); }
});

// Local component control. Genuine facade/channel/Recorder/PGN/cleanup owners;
// controlled Native facts, no phase publication or scientific qualification.
async function ordinaryCapControl(poll, finishFirst = false) {
  const clock = watchdogTestClock();
  clock.nowMonoNs = () => String(BigInt(clock.nowMonoMs()) * 1000000n);
  const { store, workspaceRoot } = await makeStore();
  const ws = v2Workspace(), supervisor = identity(1), driverIdentity = identity(6000);
  const prerequisites = ["check", "parity", "preflight"].map(phase => ({ phase,
    runId: `run-${phase}`, completion: ref(`${phase}/completion.json`) }));
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  const mf = { ...fixtureManifest({ workspace: ws, runId: "R1", phase: "compare", prerequisites, inputs }),
    schemaVersion: 2, evaluationPolicy: V2_POLICY };
  const journal = { cleanup: [], freezes: [], wake: false };
  const ledger = createResourceQuality({ runId: "R1", phase: "compare" });
  const cycle = (rss, native = "0") => ({ startedNs: clock.nowMonoNs(), finishedNs: clock.nowMonoNs(),
    nativeMaxDurationNs: native, requestId: "component-cap", rssBytes: rss, handleLive: true });
  ledger.bootstrap(cycle(4));
  const { monitor, calls, registeredPorts } = cleanupMonitorFixture({ runId: "R1", clock,
    supervisor, collector: identity(2), rows: [{ identity: driverIdentity, ppid: 1, pgid: 6000,
      workload: true, kind: "driver", scopeRunId: "R1" }],
    script: { observation: () => {
      ledger.noteAge(clock.nowMonoNs());
      const q = ledger.snapshot();
      return { atMonoNs: q.lastCompleteNs, rssBytes: q.rssLimitExceeded ? 4294967297 : 4,
        peakRssBytes: q.peakRssBytes, observedPeakRssBytes: q.observedPeakRssBytes,
        rssLimitExceeded: q.rssLimitExceeded, accountingValid: true, snapshotComplete: true,
        cycleTimely: !q.rssLimitExceeded, coverageContinuous: !q.coverageLost, resourceQuality: q };
    }, probeDefault: "gone", stopResult: { exitCode: 0 } } });
  monitor.fault = () => null;
  const cleanup = createCleanupController({ monitor, clock, runId: "R1" });
  const observedCleanup = { ...cleanup, run: args => {
    journal.cleanup.push({ start: args.cleanupStartMonoMs, end: args.deadlineMonoMs });
    return cleanup.run(args);
  } };
  const driver = forkDriverFixture({ runId: "R1", phase: "compare",
    commonIdentitySha256: mf.commonIdentitySha256 });
  let recorder = null, group = null, run = null, budget = null;
  try {
    recorder = createPhaseRecorder({ store, workspace: ws, manifest: mf,
      verifyIdentity: async () => ws.commonIdentity, verifyCleanup: cleanup.verifyCleanup });
    const captured = captureWatchdogRuntimeConfig({ phase: "compare", runId: "R1",
      commonIdentitySha256: mf.commonIdentitySha256,
      workspace: ws, recorder,
      manifestPath: path.join(workspaceRoot, "compare/manifest.json"),
      protocol: createProtocolValidator({ runId: "R1" }), monitor, cleanup: observedCleanup,
      footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 0 }), stop: () => {} },
      driverEntry: { executable: "/drv/node", expectedExecutable: "/drv/node", args: ["/drv/driver.js"] }, clock });
    budget = createBudgetHandle({ deadlineMonoMs: clock.nowMonoMs() + 90000,
      nowMonoMs: clock.nowMonoMs, clock });
    const openings = JSON.parse(await fs.readFile(new URL("../../fixtures/browser-openings.json", import.meta.url), "utf8"));
    const pgn = createPgnEvidence({ workspaceRoot, runId: "R1", phase: "compare",
      gameSchedule: buildGameSchedule({ phase: "compare", openings }) },
      { budget, lifetime: phaseRecorderLifetime(recorder) });
    const w = createWatchdogFacade(captured, async g => {
      group = g;
      const { state, control, capabilities, timing, config } = g;
      state.phaseEnd = clock.nowMonoMs() + 90000; state.workEnd = state.phaseEnd - 5000;
      state.running = supervisor; state.driverIdentity = driverIdentity;
      await recorder.writeManifest();
      await recorder.writeRunning({ ...fixtureRunning({ manifest: mf, supervisor }), schemaVersion: 2 });
      const adapter = createWatchdogRecordAdapter({ recorder, workspaceRoot,
        manifestRel: "compare/manifest.json", commonIdentity: ws.commonIdentity,
        phase: "compare", io: capabilities.io, pgnEvidence: pgn });
      state.records = adapter;
      const ctx = createWatchdogOperationContext(g);
      const captureAdmission = () => {
        const open = ctx.admissionOpen();
        if (journal.triggerAt !== undefined) journal.immediate = { stop: state.stopReq,
          start: state.cleanupStart, end: state.cleanupEnd, pgn: pgn.snapshot(),
          faults: control.intentOutcome().unplannedFaultCount };
        return open;
      };
      state.ops = createWatchdogOperations({ ctx: Object.freeze({ ...ctx, admissionOpen: captureAdmission }), records: adapter });
      state.channel = createDriverChannel({ entry: "/drv/driver.js", args: [], cwd: "/drv",
        execPath: "/drv/node", protocol: capabilities.protocol, runId: "R1", clock,
        forkImpl: driver.forkImpl, onMessage: control.onMessage, onError: control.onError,
        onExit: control.onExit, retainActual: capabilities.io.retainActual,
        actualScope: capabilities.driverActualScope });
      await driver.ready; driver.emit({ type: "hello" });
      await state.channel.send("start", { manifestPath: config.manifestPath,
        commonIdentitySha256: config.commonIdentitySha256 }, 90000);
      journal.clean = { admission: control.admissionOpen(), stop: state.stopReq, pgn: pgn.snapshot() };
      control.wake.then(() => { journal.wake = true; });
      control.firstStopHooks.add(() => journal.freezes.push(pgn.snapshot()));
      if (finishFirst) {
        control.noteFinish({ requestedStatus: "passed" });
        journal.finishBound = { start: state.cleanupStart, end: state.cleanupEnd };
        clock.jumpWithoutTimers(25);
      }
      ledger.complete(cycle(4294967297, "500000001"));
      if (poll) {
        armResourcePolling({ capabilities, state, timing, control, evaluationPolicy: V2_POLICY,
          phase: "compare", makeError: (code, detail) => Object.assign(new Error(detail), { code }) });
        clock.advance(1000);
      }
      journal.triggerAt = clock.nowMonoMs();
      if (finishFirst) control.noteFinish({ requestedStatus: "passed" });
      else driver.emit({ type: "register", requestId: "ordinary-cap", rootPid: null,
        kind: "fixture", expectedExecutable: null, listener: { address: "127.0.0.1", port: 4242 } });
      // The ordinary task is queued, but its admission guard and this snapshot
      // are synchronous. No poll, finish or shutdown can repair that snapshot.
      await flushQuality();
      if (poll || finishFirst) journal.immediate = { stop: state.stopReq, start: state.cleanupStart,
        end: state.cleanupEnd, pgn: pgn.snapshot(), faults: control.intentOutcome().unplannedFaultCount };
      if (state.stopReq !== null) {
        control.rssExceeded(); control.requestStop("LATER");
        control.noteFinish({ status: "passed", exitCode: 0 });
      } else control.requestStop("TEST_TEARDOWN");
      await flushQuality();
      journal.stable = { stop: state.stopReq, end: state.cleanupEnd,
        faults: control.intentOutcome().unplannedFaultCount, wake: journal.wake };
      const closing = control.shutdown();
      await flushQuality();
      driver.emit({ type: "closed" }); driver.releaseSendCallbacks(); driver.exit(0); driver.closeOut();
      let closed = false; closing.then(() => { closed = true; });
      clock.advance(2000); await flushQuality(); clock.advance(2000); await flushQuality();
      journal.pendingWithoutErr = !closed;
      driver.closeErr();
      return closing;
    });
    run = w.run();
    const outcome = await run;
    await phaseRecorderLifetime(recorder).whenSettled();
    const events = (await fs.readFile(path.join(workspaceRoot, "compare/events.jsonl"), "utf8"))
      .trim().split("\n").filter(Boolean).map(JSON.parse);
    return { ...journal, outcome, registeredPorts, calls, frames: driver.written, events, settled: true };
  } finally {
    driver.releaseSendCallbacks(); driver.exit(0); driver.closeOut(); driver.closeErr();
    if (group && !group.state.stopReq) group.control.requestStop("TEST_TEARDOWN");
    if (run) await run.catch(() => {});
    if (recorder) { await recorder.closeIncompleteEvidence(); await phaseRecorderLifetime(recorder).whenSettled(); }
    budget?.dispose(); await fs.rm(workspaceRoot, { recursive: true });
  }
}

for (const poll of [false, true]) {
  test(`actual facade ${poll ? "poll diagnostic uses observed peak" : "ordinary cap refusal latches before next poll or finish"}`, async () => {
    const r = await ordinaryCapControl(poll);
    assert.equal(r.clean.admission, true); assert.equal(r.clean.stop, null);
    assert.equal(r.clean.pgn.frozen, false);
    assert.equal(r.immediate.stop?.reason, "RESOURCE_RSS");
    assert.equal(r.immediate.start, r.triggerAt); assert.equal(r.immediate.end, r.triggerAt + 5000);
    assert.equal(r.immediate.faults, 1); assert.equal(r.immediate.pgn.frozen, true);
    assert.equal(r.immediate.pgn.firstStopReason, "RESOURCE_RSS");
    assert.equal(r.immediate.pgn.freezeAtMonoNs, String(BigInt(r.triggerAt) * 1000000n));
    assert.equal(r.freezes.length, 1); assert.equal(r.freezes[0].frozen, true);
    assert.equal(r.stable.stop.reason, "RESOURCE_RSS"); assert.equal(r.stable.end, r.immediate.end);
    assert.equal(r.stable.faults, 1); assert.equal(r.stable.wake, true);
    assert.equal(r.registeredPorts.length, 0);
    assert.equal(r.frames.some(frame => frame.type === "registered" && frame.requestId === "ordinary-cap"), false);
    assert.equal(r.pendingWithoutErr, true); assert.equal(r.settled, true);
    assert.equal(r.outcome.stopReason, "RESOURCE_RSS");
    assert.deepEqual(r.cleanup, [{ start: r.triggerAt, end: r.triggerAt + 5000 }]);
    const resources = r.events.filter(event => event.kind === "resource");
    assert.ok(resources.some(event => event.payload.peakRssBytes === 4 &&
      event.payload.observedPeakRssBytes === 4294967297 && event.payload.rssLimitExceeded));
    if (poll) assert.ok(r.events.some(event => event.kind === "fault" &&
      event.payload.code === "RESOURCE_RSS" && event.payload.detail === "peak 4294967297"));
  });
}

test("a newly retained v2 cap after admitted finish stops under the original captured cleanup bound", async () => {
  const r = await ordinaryCapControl(false, true);
  assert.equal(r.clean.admission, true); assert.equal(r.clean.stop, null);
  assert.equal(r.immediate.stop?.reason, "RESOURCE_RSS");
  assert.equal(r.immediate.start, r.finishBound.start);
  assert.equal(r.immediate.end, r.finishBound.end);
  assert.equal(r.finishBound.end, r.finishBound.start + 5000);
  assert.equal(r.triggerAt, r.finishBound.start + 25);
  assert.equal(r.stable.end, r.finishBound.end); assert.equal(r.stable.faults, 1);
  assert.equal(r.immediate.pgn.frozen, true); assert.equal(r.immediate.pgn.firstStopReason, null);
  assert.equal(r.immediate.pgn.freezeAtMonoNs, String(BigInt(r.finishBound.start) * 1000000n));
  assert.equal(r.stable.wake, true); assert.equal(r.pendingWithoutErr, true); assert.equal(r.settled, true);
  assert.equal(r.outcome.stopReason, "RESOURCE_RSS");
  assert.deepEqual(r.cleanup, [r.finishBound]);
});
