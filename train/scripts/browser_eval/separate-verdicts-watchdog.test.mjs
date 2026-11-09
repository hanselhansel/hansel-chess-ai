// Strict-v1 whole Watchdog/Recorder/cleanup characterization. No Native phase.
import test from "node:test";
import assert from "node:assert/strict";
import { strictWatchdogRun } from "./separate-verdicts-test-fixtures.mjs";
import {
  setupRun, liveStart, closeFacts, FINISH, drain, yieldTurn, row,
} from "./watchdog-run-test-fixtures.mjs";

const read = async (env, name) => JSON.parse((await env.readFile(`check/${name}.json`)).toString());
const events = async (env) => (await env.readFile("check/events.jsonl")).toString()
  .trim().split("\n").map(JSON.parse);
const observed = (changes = {}) => ({ accountingValid: true, rssBytes: 7,
  peakRssBytes: 7, rssLimitExceeded: false, atMonoNs: "123", ...changes });

test("Task6 watchdog seam is the identical existing owned factory", () => {
  assert.equal(strictWatchdogRun, setupRun);
});

test("strict-v1 requested finish retains running version and missing-check failure", async (t) => {
  const { clk, env, driver, journal, run } = await strictWatchdogRun(t);
  const p = run();
  await liveStart(clk, driver);
  const running = await read(env, "running");
  assert.equal(running.schemaVersion, 1);
  assert.deepEqual(journal, ["manifest", "monitor.start", "running", "fork"]);
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  // FINISH carries checks:[]; resolvePhaseChecks rejects missing checks.
  assert.deepEqual(result, { status: "failed", exitCode: 1, stopReason: null });
  const final = await read(env, "final");
  assert.equal(final.schemaVersion, 1);
  assert.equal(final.cleanup.verified, true);
  assert.equal(final.analysisEligible, false);
});

test("strict-v1 resource poll retains invalid actual fields and original reason", async (t) => {
  let invalid = false;
  const { clk, env, driver, run } = await strictWatchdogRun(t, {
    monitorScript: { observation: () => observed(invalid ? {
      accountingValid: false, rssBytes: 11, peakRssBytes: 19, atMonoNs: "456",
    } : {}) },
  });
  const p = run();
  await liveStart(clk, driver);
  invalid = true;
  clk.advance(1000);
  await yieldTurn();
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.deepEqual(result, { status: "inconclusive", exitCode: 2,
    stopReason: "ACCOUNTING_UNAVAILABLE" });
  const logged = await events(env);
  const resource = logged.find((event) => event.kind === "resource");
  assert.deepEqual(resource.payload, { rssBytes: 11, peakRssBytes: 19,
    rssLimitExceeded: false, accountingValid: false, atMonoNs: "456" });
  const fault = logged.find((event) => event.kind === "fault");
  assert.equal(fault.payload.code, "ACCOUNTING_UNAVAILABLE");
  assert.equal(fault.payload.detail, "watchdog-runtime ACCOUNTING_UNAVAILABLE: native observation");
});

test("strict-v1 sticky cap refuses finish before resource polling", async (t) => {
  let cap = false;
  const { clk, env, driver, monitor, run } = await strictWatchdogRun(t, {
    monitorScript: { observation: () => observed(cap ? {
      rssBytes: 8, peakRssBytes: 4294967297, rssLimitExceeded: true, atMonoNs: "789",
    } : {}) },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  cap = true;
  assert.equal(monitor.lastObservation().rssLimitExceeded, true);
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.equal(result.stopReason, "RESOURCE_RSS");
  const resource = (await events(env)).find((event) => event.kind === "resource");
  assert.deepEqual(resource.payload, { rssBytes: 8, peakRssBytes: 4294967297,
    rssLimitExceeded: true, accountingValid: true, atMonoNs: "789" });
  // Original noteFinish records the in-memory fault and resource event,
  // without dispatching faultEvent (the polling path dispatches both).
  assert.equal((await events(env)).some((event) => event.kind === "fault"), false);
  assert.ok((await read(env, "final")).unplannedFaultCount > 0);
  assert.equal((await read(env, "final")).cleanup.verified, true);
});

test("strict-v1 first stop keeps original cleanup bound across late finish", async (t) => {
  const { clk, env, driver, monitor, w, run } = await strictWatchdogRun(t);
  const stops = [];
  const original = monitor.stopAndReap;
  monitor.stopAndReap = function (options) {
    stops.push({ ...options });
    return original.call(this, options);
  };
  const p = run();
  await liveStart(clk, driver);
  const first = clk.nowMonoMs();
  w.requestStop("FIRST");
  clk.advance(25);
  w.requestStop("SECOND");
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.equal(result.stopReason, "FIRST");
  assert.deepEqual(stops, [{ deadlineMonoMs: first + 5000,
    ordinaryDeadlineMonoMs: first + 4500 }]);
  assert.equal((await read(env, "final")).stopReason, "FIRST");
});

import { createWatchdogResourceChecks } from "./watchdog-verdict-policy.mjs";
import { armResourcePolling } from "./watchdog-resource-policy.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { qualityMonitor, periodicQuality, flushQuality, qualitySamples } from "./separate-verdicts-test-fixtures.mjs";

const error = (code, detail) => Object.assign(new Error(detail), { code });
const controls = (f) => {
  const stops = [], faults = [], logged = [];
  const state = { stopReq: null, finishReq: null, resourceTask: null,
    records: { recordEvent: async (kind, payload) => { logged.push({ kind, payload }); } } };
  const control = { recordFault: (e) => faults.push(e), faultEvent: async (e) => faults.push(e),
    latchStop: (code) => { stops.push(code); state.stopReq ??= { reason: code }; } };
  const timing = { now: f.clock.nowMs, timers: new Set() };
  const checks = createWatchdogResourceChecks({ monitor: f.monitor, state, ...control,
    makeError: error, evaluationPolicy: V2_POLICY, phase: "compare", nowNs: f.clock.nowMonoNs });
  return { stops, faults, logged, state, control, timing, checks };
};

test("v2 actual resource lane records compare quality without stopping ordinary admission", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    await periodicQuality(f, 501);
    const c = controls(f);
    const lifetime = processMonitorLifetime(f.monitor);
    armResourcePolling({ capabilities: { clock: f.clock, monitor: f.monitor,
      footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 1 }) },
      io: { retainActual: lifetime.retainActual } }, ...c, makeError: error,
      evaluationPolicy: V2_POLICY, phase: "compare" });
    f.clock.runDue(); await flushQuality();
    assert.deepEqual(c.stops, []);
    assert.equal(c.checks.rssExceeded(), false);
    assert.equal(c.checks.stopFinishOnOverage(), false);
    const event = c.logged.find((e) => e.kind === "resource");
    assert.equal(event.payload.qualityCheckpoint.coverageLost, true);
    assert.equal(event.payload.qualityCheckpoint.completedCycles, 2);
    assert.equal(event.payload.observedPeakRssBytes, 2048);
    for (const timer of c.timing.timers) f.clock.clearInterval(timer);
  } finally { await f.dispose(); }
});

test("v2 untimely cap beats quality and remains sticky at finish after a low sample", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const cap = 4294967297;
    f.script.rss = cap;
    await periodicQuality(f, 250, { finishedAtMonoNs: "501000001" });
    f.script.rss = 1;
    const low = await periodicQuality(f);
    assert.equal(low.peakRssBytes, 2048, "untimely overage is observed, not admitted peak");
    assert.equal(low.observedPeakRssBytes, cap * 2);
    assert.equal(low.rssLimitExceeded, true);
    const c = controls(f);
    assert.equal(c.checks.rssExceeded(), true);
    assert.equal(c.checks.stopFinishOnOverage(), true);
    await flushQuality();
    assert.deepEqual(c.stops, ["RESOURCE_RSS"]);
    assert.equal(c.logged[0].payload.observedPeakRssBytes, cap * 2);
    assert.equal(c.logged[0].payload.rssLimitExceeded, true);
  } finally { await f.dispose(); }
});

const nested = async (f, { settle = async () => {} } = {}) => {
  const clock = { ...f.clock, nowMonoMs: f.clock.nowMs };
  const cc = createCleanupController({ monitor: f.monitor, clock,
    runId: "R1:watchdog-selftest", lifetime: processMonitorLifetime(f.monitor) });
  const supervisor = f.monitor._ready().supervisor;
  const start = clock.nowMonoMs();
  const actual = cc.run({ phase: "watchdog-selftest", scope: "selftest-workload",
    scopeRunId: "R1:watchdog-selftest", expectedFinalizer: supervisor, supervisor,
    deadlineMonoMs: start + 5000, cleanupStartMonoMs: start, settleWorkloadHandles: settle });
  actual.catch(() => {});
  for (let n = 0; n < 15; n += 1) { f.clock.advance(250); await flushQuality(); }
  f.script.muteSample = true;
  f.clock.advance(250); await flushQuality();
  return { cc, actual, start };
};

for (const outcome of ["complete", "cap", "fault", "never"]) {
  test(`v2 exact synchronous nested prefix keeps parent pending through later ${outcome}`, async () => {
    const f = qualityMonitor({ phase: "preflight" });
    try {
      await f.start();
      const { cc, actual, start } = await nested(f);
      assert.equal((await actual).verified, true);
      const prefix = cc.readResourcePrefix();
      assert.equal(prefix.pending, true);
      assert.equal(prefix.closureKind, "selftest-prefix");
      assert.equal(prefix.monitorRunId, "R1");
      assert.equal(prefix.coverageEndNs, f.clock.nowMonoNs());
      assert.equal(prefix.lastCompleteNs, String(BigInt(f.clock.nowMonoNs()) - 250000000n));
      assert.equal(Object.isFrozen(prefix), true);
      const before = { frames: f.fixture.written.length, timers: f.clock.pendingTimeouts(), intervals: f.clock.liveIntervals() };
      assert.equal(cc.readResourcePrefix(), prefix);
      const parentBefore = f.monitor.lastObservation().resourceQuality;
      const synchronous = f.monitor._captureResourcePrefix({ scopeRunId: "R1:watchdog-selftest", deadlineMonoMs: start + 5000 });
      assert.equal(synchronous.then, undefined);
      assert.deepEqual(synchronous, prefix);
      assert.deepEqual(f.monitor.lastObservation().resourceQuality, parentBefore);
      assert.deepEqual({ frames: f.fixture.written.length, timers: f.clock.pendingTimeouts(), intervals: f.clock.liveIntervals() }, before);
      assert.equal(f.monitor.lastObservation().resourceQuality.coverageEndNs, null);
      assert.throws(() => f.monitor._captureResourcePrefix({ scopeRunId: "other", deadlineMonoMs: start + 5000 }), /prefix binding/);
      if (outcome === "fault") f.fixture.emit({ type: "accounting-fault", reason: "ACCOUNTING_UNAVAILABLE", diagnostic: "later fault" });
      else if (outcome === "never") f.clock.advance(90001);
      else f.reply(outcome === "cap" ? { samples: qualitySamples(f).at(-1).owned.map((i) => ({
        identity: i, ppid: 1, pgid: i.pid, uid: 501, residentBytes: 4294967297 })) } : {});
      await flushQuality();
      if (outcome === "complete") assert.equal(f.monitor.lastObservation().resourceQuality.pending, false);
      if (outcome === "cap") assert.equal(f.monitor.lastObservation().rssLimitExceeded, true);
      if (["fault", "never"].includes(outcome)) assert.notEqual(f.monitor.fault(), null);
      assert.equal(cc.readResourcePrefix(), prefix);
      assert.equal(prefix.rssLimitExceeded, false, "bounded prefix never substitutes for eventual parent facts");
    } finally { await f.dispose(); }
  });
}

test("v2 nested unknown child body blocks prefix until actual child settlement", async () => {
  const f = qualityMonitor({ phase: "preflight" });
  let release;
  const child = new Promise((resolve) => { release = resolve; });
  try {
    await f.start();
    const { cc, actual } = await nested(f, { settle: () => child });
    assert.equal(cc.readResourcePrefix(), null);
    f.clock.advance(1001); await flushQuality();
    await assert.rejects(actual, /nested prefix child proof|cleanup proof window/);
    assert.equal(cc.readResourcePrefix(), null);
    release(); await flushQuality();
  } finally { release(); await f.dispose(); }
});

test("v2 retained cap beats a later hard projection at the actual finish boundary", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); f.script.rss = 4294967297;
    await periodicQuality(f);
    f.fixture.emit({ type: "accounting-fault", reason: "ACCOUNTING_UNAVAILABLE", diagnostic: "later permission" });
    await flushQuality();
    const c = controls(f);
    assert.equal(c.checks.stopFinishOnOverage(), true);
    assert.deepEqual(c.stops, ["RESOURCE_RSS"]);
    assert.equal(f.monitor.lastObservation().rssLimitExceeded, true);
  } finally { await f.dispose(); }
});

test("v2 synchronous prefix rejects expired C, stale current proof and wrong policy without IO", async () => {
  const f = qualityMonitor({ phase: "preflight" });
  const compare = qualityMonitor();
  try {
    await f.start(); await compare.start();
    const before = { frames: f.fixture.written.length, timers: f.clock.pendingTimeouts(), intervals: f.clock.liveIntervals() };
    const scopeRunId = "R1:watchdog-selftest";
    assert.throws(() => f.monitor._captureResourcePrefix({ scopeRunId, deadlineMonoMs: f.clock.nowMs() }), /prefix deadline/);
    assert.throws(() => compare.monitor._captureResourcePrefix({ scopeRunId, deadlineMonoMs: compare.clock.nowMs() + 5000 }), /prefix binding/);
    f.clock.jumpWithoutTimers(501);
    assert.throws(() => f.monitor._captureResourcePrefix({ scopeRunId, deadlineMonoMs: f.clock.nowMs() + 5000 }), /prefix current proof/);
    assert.deepEqual({ frames: f.fixture.written.length, timers: f.clock.pendingTimeouts(), intervals: f.clock.liveIntervals() }, before);
  } finally { await f.dispose(); await compare.dispose(); }
});

for (const current of ["current", "stale", "missing"]) {
  test(`v2 compare actual cleanup after gap needs ${current} timely proof`, async () => {
    const f = qualityMonitor();
    try {
      if (current !== "missing") { await f.start(); await periodicQuality(f, 501); }
      const clock = { ...f.clock, nowMonoMs: f.clock.nowMs };
      const cc = createCleanupController({ monitor: f.monitor, clock, runId: "R1" });
      const supervisor = current === "missing" ? { pid: process.pid, startSec: "1000", startUsec: 0 } : f.monitor._ready().supervisor;
      const start = f.clock.nowMs();
      const actual = cc.run({ phase: "compare", scope: "phase-workload", scopeRunId: "R1",
        expectedFinalizer: supervisor, supervisor, deadlineMonoMs: start + 5000,
        cleanupStartMonoMs: start });
      actual.catch(() => {});
      for (let n = 0; n < 16; n += 1) {
        if (current === "stale" && n === 10) f.script.muteSample = true;
        f.clock.advance(250); await flushQuality();
      }
      if (current === "stale") { f.reply(); await flushQuality(); }
      const proof = await actual;
      assert.equal(proof.verified, current === "current");
      assert.equal(proof.accountingValid, current === "current");
      if (current === "current") assert.equal(f.monitor.lastObservation().coverageContinuous, false);
      assert.equal(cc.readResourcePrefix(), null);
    } finally { await f.dispose(); }
  });
}

test("v2 resource checkpoint uses the same clock's sub-millisecond capture, never ms reconstruction", async () => {
  const f = qualityMonitor({ startNs: 1000000001n });
  const c = controls(f);
  try {
    await f.start();
    armResourcePolling({ capabilities: { clock: f.clock, monitor: f.monitor,
      footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 0 }) },
      io: { retainActual: processMonitorLifetime(f.monitor).retainActual } }, ...c,
      makeError: error, evaluationPolicy: V2_POLICY, phase: "compare" });
    assert.doesNotThrow(() => f.clock.runDue()); await flushQuality();
    const captured = c.logged.find((e) => e.kind === "resource").payload.qualityCheckpoint.capturedNs;
    assert.equal(captured, f.clock.nowMonoNs());
  } finally {
    for (const timer of c.timing.timers) f.clock.clearInterval(timer);
    await f.dispose();
  }
});

for (const reader of [undefined, () => "invalid"]) {
  test(`v2 ${reader ? "invalid" : "missing"} exact clock reader remains hard`, async () => {
    const f = qualityMonitor(); const c = controls(f);
    try {
      await f.start();
      const capability = { clock: { ...f.clock, nowMonoNs: reader }, monitor: f.monitor,
        footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 0 }) },
        io: { retainActual: processMonitorLifetime(f.monitor).retainActual } };
      const arm = () => armResourcePolling({ capabilities: capability, ...c,
        makeError: error, evaluationPolicy: V2_POLICY, phase: "compare" });
      if (!reader) assert.throws(arm, /v2 clock nowMonoNs/);
      else { arm(); f.clock.runDue(); await flushQuality(); assert.equal(c.stops.length, 1); }
      assert.equal(c.logged.length, 0);
    } finally {
      for (const timer of c.timing.timers) f.clock.clearInterval(timer);
      await f.dispose();
    }
  });
}

test("v2 post-drain cap keeps final evidence without a backdated or post-fence checkpoint", async () => {
  const f = qualityMonitor(); const c = controls(f);
  try {
    await f.start(); f.script.rss = 4294967297;
    await periodicQuality(f); await f.monitor.stopAndReap();
    f.clock.jumpWithoutTimers(1);
    assert.equal(c.checks.stopFinishOnOverage(), true); await flushQuality();
    assert.deepEqual(c.stops, ["RESOURCE_RSS"]);
    assert.equal(c.logged.length, 0);
    const finalEvidence = f.monitor.lastObservation().resourceQuality;
    assert.equal(finalEvidence.rssLimitExceeded, true);
    assert.equal(finalEvidence.pending, false);
    assert.notEqual(finalEvidence.coverageEndNs, null);
  } finally { await f.dispose(); }
});

test("v2 normal stopped-monitor cap check cannot create a new hard stop after cleanup", async () => {
  const f = qualityMonitor(); const c = controls(f);
  try {
    await f.start();
    c.state.finishReq = { requestedStatus: "passed" };
    await f.monitor.stopAndReap();
    assert.equal(c.checks.rssExceeded(), false);
    assert.deepEqual(c.stops, []);
  } finally { await f.dispose(); }
});
