// Approved failed-containment contracts over genuine owners; no actual Native.
import test from "node:test";
import assert from "node:assert/strict";
import { createMonitorFixture, monitorBootstrapScript, startMonitorFixture } from "./process-monitor-test-fixtures.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
for (const order of ["normal-to-failure", "failure-to-normal"]) {
  test(`one cached stop flow: ${order}`, async (t) => {
    const lifetime = createWatchdogLifetime();
    const script = monitorBootstrapScript();
    const env = createMonitorFixture({ lifetime, script });
    const { monitor, fixture, clock } = env;
    const faults = [];
    let eof = 0;
    fixture.child.stdin.on("finish", () => { eof += 1; queueMicrotask(() => fixture.exit(2)); });
    const teardownCount = () => eof + fixture.written.filter((f) => f.type === "shutdown").length;
    let stop;
    t.after(async () => {
      fixture.exit(0);
      if (stop) await stop.catch((e) => faults.push(e));
      await lifetime.whenSettled();
      env.cleanup();
    });
    await startMonitorFixture(env);
    script.muteSample = true;
    const work = monitor.sample({ deadlineMonoMs: clock.nowMs() + 5000 });
    const workObserved = work.catch((e) => faults.push(e));
    await turn();
    const C = clock.nowMs() + 500;
    const normal = { deadlineMonoMs: C };
    const failure = { deadlineMonoMs: C, failureContainment: true };
    stop = monitor.stopAndReap(order === "normal-to-failure" ? normal : failure);
    const observed = stop.catch((e) => faults.push(e));
    const same = monitor.stopAndReap(order === "normal-to-failure" ? failure : normal);
    const sameObserved = same.catch((e) => faults.push(e));
    try {
      assert.equal(same, stop, "mode upgrade joins identical original promise");
      await turn();
      assert.equal(teardownCount(), 1);
      await Promise.all([observed, sameObserved, workObserved]);
      assert.ok(faults.some((e) => e.code === "CLEANUP_UNPROVEN"));
      assert.equal(teardownCount(), 1);
      assert.equal(monitor.stopAndReap(failure), stop, "settled flow joins unchanged");
    } finally {
      fixture.exit(0);
      clock.advance(5000);
      await Promise.all([observed, sameObserved, workObserved]);
    }
  });
}

import { promises as fs } from "node:fs";
import { makeStore } from "./test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { confined } from "./artifact-files.mjs";
for (const [now, start, classification] of [[1001, 0, "age-exceeded"], [Infinity, 0, "invalid-now"], [0, 1, "future-start"]]) {
  test(`first stale accounting decision describes ${classification}`, async (t) => {
    const env = await makeStore();
    t.after(async () => { await artifactStoreLifetime(env.store).whenSettled(); await fs.rm(env.workspaceRoot, { recursive: true }); });
    env.ctl.now = now;
    env.ctl.observedAtMs = start;
    let original;
    try { await env.store.writeOnce("stale.bin", Buffer.from("x"), "ordinary"); } catch (e) { original = e; }
    assert.equal(original.code, "STORE_ACCOUNTING");
    const detail = JSON.parse(original.detail);
    assert.equal(detail.classification, classification);
    assert.equal(detail.sampleStartMs, start);
    assert.equal(detail.nowMs, Number.isFinite(now) ? now : null);
    assert.equal(detail.ageMs, Number.isFinite(now) ? now - start : null);
    assert.ok(Buffer.byteLength(original.detail) <= 256);
  });
}
test("proof effect fence rejects before real metadata issuance", async (t) => {
  const env = await makeStore();
  const owner = artifactStoreLifetime(env.store);
  t.after(async () => { await owner.whenSettled(); await fs.rm(env.workspaceRoot, { recursive: true }); });
  const first = new Error("proof fence expired");
  const io = Object.freeze({ retainActual: owner.retainActual, assertEffectLive() { throw first; } });
  await assert.rejects(confined(env.workspaceRoot, "missing", "proof", io), (e) => e === first);
});

import { createWatchdogFaultRecorder } from "./watchdog-faults.mjs";
import { cleanupProofEnd, createWatchdogCleanupArgs } from "./watchdog-cleanup-context.mjs";
test("shared first fault is passive, bounded and retains the whole decision detail", async () => {
  const lines = [];
  const owner = createWatchdogLifetime({ reportAwaitStage(line) { lines.push(line); throw null; } });
  const first = Object.assign(new Error("artifact-store STORE_ACCOUNTING: stale sample"), {
    code: "STORE_ACCOUNTING", detail: JSON.stringify({ classification: "age-exceeded",
      nowMs: 2000001001, sampleStartMs: 2000000000, ageMs: 1001 }),
  });
  const recorder = createWatchdogFaultRecorder({ nowNs: () => 1n, lifetime: owner, scope: "phase" });
  recorder.recordFault(first);
  recorder.recordFault(new Error("later error"));
  assert.equal(lines.length, 0);
  await Promise.resolve();
  assert.equal(lines.length, 1);
  assert.ok(Buffer.byteLength(lines[0]) <= 256);
  const row = JSON.parse(lines[0].slice("TINYAZ_AWAIT ".length));
  assert.equal(row.stage, "supervisor.fault");
  for (const fact of ["age-exceeded", "2000001001", "2000000000", "1001"]) assert.ok(row.detail.includes(fact));
  assert.ok(row.detail.includes("age=1001"));
  assert.equal(recorder.faults.length, 2);
  assert.equal(recorder.faults[0].code, first.code);
  await owner.whenSettled();
});
test("stop validates before effects and settled joins cannot rewrite success", async (t) => {
  const env = createMonitorFixture({ script: monitorBootstrapScript() });
  t.after(() => { env.fixture.exit(0); env.cleanup(); });
  await startMonitorFixture(env);
  const C = env.clock.nowMs() + 500;
  for (const bad of [{ deadlineMonoMs: C, failureContainment: false }, { deadlineMonoMs: Infinity },
    { deadlineMonoMs: C, extra: true }, { failureContainment: true },
    ...[undefined, NaN, -1, C + 1, 1.5].map((ordinaryDeadlineMonoMs) => ({ deadlineMonoMs: C, ordinaryDeadlineMonoMs }))]) {
    await assert.rejects(env.monitor.stopAndReap(bad), (e) => e.code === "ACCOUNTING_UNAVAILABLE");
    assert.equal(env.fixture.written.some((f) => f.type === "shutdown"), false);
    assert.equal(env.monitor.fault(), null);
  }
  await env.monitor.sample();
  const result = env.monitor.stopAndReap({ deadlineMonoMs: C });
  assert.equal((await result).exitCode, 0);
  const priorFault = env.monitor.fault();
  assert.equal(env.monitor.stopAndReap({ deadlineMonoMs: C, failureContainment: true }), result);
  assert.equal(env.monitor.stopAndReap({ deadlineMonoMs: C, ordinaryDeadlineMonoMs: C - 100 }), result);
  await assert.rejects(env.monitor.stopAndReap({ deadlineMonoMs: C, ordinaryDeadlineMonoMs: C + 1 }),
    (e) => e.code === "ACCOUNTING_UNAVAILABLE");
  assert.deepEqual(env.monitor.fault(), priorFault);
});
test("failure upgrade narrows the first handle; withheld stderr stays owned past public expiry", async (t) => {
  const owner = createWatchdogLifetime();
  const script = monitorBootstrapScript();
  const env = createMonitorFixture({ lifetime: owner, script });
  let stopObserved;
  let workObserved;
  t.after(async () => {
    env.fixture.exit(0); env.clock.advance(10000);
    await Promise.all([stopObserved, workObserved]);
    await owner.whenSettled(); env.cleanup();
  });
  await startMonitorFixture(env);
  script.muteSample = true;
  workObserved = env.monitor.sample().catch(() => {});
  await turn();
  let eof = 0;
  env.fixture.child.stdin.on("finish", () => {
    eof += 1; env.fixture.child.exit(0); env.fixture.child.stdout.emitClose();
  });
  const now = env.clock.nowMs();
  const stop = env.monitor.stopAndReap({ deadlineMonoMs: now + 500 });
  let publicSettled = false;
  stopObserved = stop.catch((e) => { publicSettled = true; assert.equal(e.code, "CLEANUP_UNPROVEN"); });
  assert.equal(env.monitor.stopAndReap({ deadlineMonoMs: now + 100, failureContainment: true }), stop);
  assert.equal(env.monitor.stopAndReap({ deadlineMonoMs: now + 1000 }), stop);
  let physicalSettled = false;
  owner.whenSettled().then(() => { physicalSettled = true; });
  await turn();
  assert.equal(eof, 1);
  assert.equal(physicalSettled, false);
  env.clock.advance(100);
  await turn();
  assert.equal(publicSettled, true);
  assert.equal(physicalSettled, false);
  env.fixture.child.stderr.emitClose();
  await owner.whenSettled();
  assert.equal(eof, 1);
});
for (const late of [4501, 5001]) test(`cleanup callback cannot resume effects after ${late}ms`, async () => {
  let now = 0;
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let effects = 0;
  const owner = createWatchdogLifetime();
  const argsFor = createWatchdogCleanupArgs({ config: { phase: "preflight", runId: "R1", selftestPhase: false },
    capabilities: { lifetime: owner }, timing: { now: () => now },
    state: { cleanupStart: 0, cleanupEnd: 5000, phaseEnd: 10000, running: null,
      ops: { whenOrdinarySettled: () => held }, channel: { reap: () => { effects += 1; } } } });
  const args = argsFor({ proofDeadlineMonoMs: 4500, settleRequiredLiveEvidence: () => { effects += 1; } });
  const actual = args.settleWorkloadHandles({ deadlineMonoMs: 4500 });
  const observed = assert.rejects(actual, (e) => e.code === "CLEANUP_UNPROVEN");
  now = late; release();
  await observed;
  assert.equal(effects, 0);
});
test("inner proof reserve preserves fixed scope and handles inherited small windows", () => {
  assert.equal(cleanupProofEnd(100, 5100, "phase-workload"), 4600);
  assert.equal(cleanupProofEnd(100, 600, "phase-workload"), 100);
  assert.equal(cleanupProofEnd(100, 400, "phase-workload"), 100);
  assert.equal(cleanupProofEnd(100, 90, "phase-workload"), 90);
  assert.equal(cleanupProofEnd(100, 5100, "selftest-workload"), 5100);
});

test("a sample exactly 1000ms old remains valid", async (t) => {
  const env = await makeStore();
  t.after(async () => { await artifactStoreLifetime(env.store).whenSettled(); await fs.rm(env.workspaceRoot, { recursive: true }); });
  env.ctl.now = 1000; env.ctl.observedAtMs = 0;
  await env.store.writeOnce("edge.bin", Buffer.from("x"), "ordinary");
});
import { fixture, args, ROWS, OBS } from "./watchdog-cleanup-test-fixtures.mjs";
for (const window of [500, 250]) test(`inherited ${window}ms window fails proof before Native work`, async () => {
  const { cc, clk, calls } = fixture(ROWS, { observation: OBS, stopResult: { exitCode: 0 } });
  const start = clk.nowMonoMs();
  await assert.rejects(cc.run(args(clk, { deadlineMonoMs: start + window })),
    (e) => e.code === "CLEANUP_UNPROVEN");
  assert.deepEqual(calls, ["stopAndReap"]);
  assert.equal(clk.nowMonoMs(), start);
});

import { createCleanupController } from "./watchdog-cleanup.mjs";
for (const pendingSample of [true, false]) test(`normal collector stop preserves P/C: pending ordinary=${pendingSample}`, async (t) => {
  const script = monitorBootstrapScript();
  const owner = createWatchdogLifetime();
  const env = createMonitorFixture({ script, lifetime: owner });
  const { monitor, clock, fixture } = env;
  const actualExit = fixture.exit;
  const facts = { exit: false, stdout: false, stderr: false };
  fixture.child.once("exit", () => { facts.exit = true; });
  fixture.child.stdout.once("close", () => { facts.stdout = true; });
  fixture.child.stderr.once("close", () => { facts.stderr = true; });
  const turns = async () => { for (let i = 0; i < 8; i += 1) await turn(); };
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let observed;
  let proof;
  let done = false;
  let entered = false;
  let normalTeardown = false;
  const stopCalls = [];
  t.after(async () => {
    release(); actualExit(0); clock.advance(10000); await turns();
    if (observed) await observed;
    await owner.whenSettled(); env.cleanup();
  });
  await startMonitorFixture(env);
  if (!pendingSample) fixture.exit = () => { normalTeardown = true; };
  fixture.child.stdin.once("finish", () => actualExit(2));
  const start = clock.nowMs();
  const C = start + 5000;
  const P = C - 500;
  const cleanup = createCleanupController({ monitor: { ...monitor, stopAndReap(options) {
    stopCalls.push({ at: clock.nowMs(), options: structuredClone(options) });
    return monitor.stopAndReap(options);
  } }, clock: { ...clock, nowMonoMs: clock.nowMs }, runId: "R1", lifetime: owner });
  const actual = cleanup.run({ phase: "check", scope: "phase-workload", scopeRunId: "R1",
    supervisor: monitor._ready().supervisor, expectedFinalizer: monitor._ready().supervisor,
    cleanupStartMonoMs: start, deadlineMonoMs: C,
    settleWorkloadHandles: async () => { entered = true; await held; } });
  observed = actual.then((value) => { proof = value; done = true; });
  for (let i = 0; i < 16; i += 1) { clock.advance(250); await turns(); }
  assert.equal(entered, true);
  assert.equal(monitor.fault(), null);
  const samplesBefore = fixture.written.filter((f) => f.type === "sample").length;
  script.muteSample = pendingSample;
  clock.advance(250); await turns();
  assert.equal(fixture.written.filter((f) => f.type === "sample").length, samplesBefore + 1);
  release(); await turns();
  assert.equal(stopCalls.length, 1);
  assert.equal(stopCalls[0].at, start + 4250);
  assert.equal(stopCalls[0].options.deadlineMonoMs, C);
  assert.equal(stopCalls[0].options.failureContainment, undefined);
  clock.advance(250); await turns();
  if (pendingSample) {
    assert.equal(fixture.child.stdin.ended, true, "P must upgrade the SAME normal flow to wire containment");
    assert.deepEqual(facts, { exit: true, stdout: true, stderr: true });
    assert.equal(monitor.fault().code, "CLEANUP_UNPROVEN");
    clock.advance(500); await turns();
    await observed;
    assert.equal(proof.verified, false);
    assert.equal(proof.accountingValid, false);
  } else {
    assert.equal(normalTeardown, true, "ordinary prerequisite settled and normal teardown was issued before P");
    assert.equal(done, false, "collector physical reap still has its original C opportunity");
    assert.deepEqual(facts, { exit: false, stdout: false, stderr: false });
    assert.equal(monitor.fault(), null);
    clock.advance(250); actualExit(0); await turns();
    await observed;
    assert.equal(proof.verified, true);
    assert.equal(proof.accountingValid, true);
  }
  assert.equal(stopCalls.length, 1);
  assert.equal(fixture.written.filter((f) => f.type === "shutdown").length +
    (fixture.child.stdin.ended === true ? 1 : 0), 1);
  assert.deepEqual(facts, { exit: true, stdout: true, stderr: true });
  await owner.whenSettled();
});

test("cached ordinary P can narrow without extending or narrowing collector C", async (t) => {
  const script = monitorBootstrapScript();
  const owner = createWatchdogLifetime();
  const env = createMonitorFixture({ script, lifetime: owner });
  const { monitor, fixture, clock } = env;
  let stopObserved;
  let workObserved;
  t.after(async () => {
    fixture.exit(0); clock.advance(10000);
    await Promise.all([stopObserved, workObserved]); await owner.whenSettled(); env.cleanup();
  });
  await startMonitorFixture(env);
  script.muteSample = true;
  workObserved = monitor.sample().catch(() => {}); await turn();
  const now = clock.nowMs();
  const C = now + 500;
  fixture.child.stdin.once("finish", () => { fixture.child.exit(0); fixture.child.stdout.emitClose(); });
  const stop = monitor.stopAndReap({ deadlineMonoMs: C, ordinaryDeadlineMonoMs: now + 400 });
  let publicSettled = false;
  stopObserved = stop.catch((e) => { publicSettled = true; assert.equal(e.code, "CLEANUP_UNPROVEN"); });
  assert.equal(monitor.stopAndReap({ deadlineMonoMs: C, ordinaryDeadlineMonoMs: now + 100 }), stop);
  assert.equal(monitor.stopAndReap({ deadlineMonoMs: C, ordinaryDeadlineMonoMs: now + 300 }), stop);
  clock.advance(100); await turn();
  assert.equal(fixture.child.stdin.ended, true);
  assert.equal(publicSettled, false, "P must not expire the original collector handle");
  let settled = false;
  owner.whenSettled().then(() => { settled = true; });
  clock.advance(200); await turn();
  assert.equal(settled, false, "missing stderr remains real debt after the narrowed P");
  fixture.child.stderr.emitClose(); await owner.whenSettled(); await stopObserved;
  assert.equal(monitor.fault().code, "CLEANUP_UNPROVEN");
});

import { sampleReply } from "./supervision-test-fixtures.mjs";
test("a late actual ordinary settlement cannot beat a delayed P timer", async (t) => {
  const script = monitorBootstrapScript();
  const owner = createWatchdogLifetime();
  const env = createMonitorFixture({ script, lifetime: owner });
  let work;
  let observed;
  t.after(async () => {
    env.fixture.exit(0); env.clock.advance(10000);
    await Promise.all([work, observed]); await owner.whenSettled(); env.cleanup();
  });
  await startMonitorFixture(env);
  script.muteSample = true;
  work = env.monitor.sample().catch(() => {}); await turn();
  const request = env.fixture.written.findLast((frame) => frame.type === "sample");
  const now = env.clock.nowMs();
  const stop = env.monitor.stopAndReap({ deadlineMonoMs: now + 500, ordinaryDeadlineMonoMs: now + 100 });
  let result;
  observed = stop.then((value) => { result = { value }; }, (error) => { result = { error }; });
  env.clock.jumpWithoutTimers(150);
  env.fixture.emit(sampleReply({ ...request, script }));
  await work; await observed;
  assert.equal(result.error?.code, "CLEANUP_UNPROVEN");
  assert.equal(env.monitor.fault().code, "CLEANUP_UNPROVEN");
  assert.equal(env.fixture.written.filter((frame) => frame.type === "shutdown").length, 1);
});
