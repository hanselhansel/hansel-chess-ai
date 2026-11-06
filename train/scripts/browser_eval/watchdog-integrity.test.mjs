// Controlled actual bridge/Watchdog/Recorder ownership. Scripted Native and
// SDK interfaces do not establish an actual phase or integrity scan pass.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import ts from "typescript";
import { createMonitorFixture, monitorBootstrapScript, startMonitorFixture } from "./process-monitor-test-fixtures.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { canonicalBytes, parseCanonicalBytes } from "./canonical-json.mjs";
import { makeEnv, deferred, driveStart } from "./driver-bridge-test-fixtures.mjs";
import { setupRun, liveStart, closeFacts, drain, yieldTurn, FINISH } from "./watchdog-run-test-fixtures.mjs";
import { advanceBy } from "./watchdog-drain-test-fixtures.mjs";
import { registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

function control(t) {
  let entered;
  let release;
  const entry = new Promise((resolve) => { entered = resolve; });
  const held = new Promise((resolve) => { release = resolve; });
  const calls = [];
  let complete = false;
  let interrupted = false;
  const owner = {
    collect: async (association, bound) => {
      calls.push({ type: "collect", association, ...bound });
      entered();
      await held;
      if (interrupted) throw new Error("controlled scanner interrupted after actual release");
      complete = true;
    },
    consume: () => { throw new Error("controlled owner never supplies recorder proof"); },
    interrupt: (reason) => { calls.push({ type: "interrupt", reason }); interrupted = true; },
    isComplete: () => complete && !interrupted,
  };
  registerFixtureTeardown(t, { release, settle: () => {} });
  return { owner, calls, entry, release };
}
function sent(t, driver, type) {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  const original = driver.child.send;
  registerFixtureTeardown(t, { restore: () => { driver.child.send = original; } });
  driver.child.send = function (...args) {
    const value = original.apply(this, args);
    if (args[0]?.type === type) resolve(args[0]);
    return value;
  };
  return promise;
}

test("actual driver tail closes SDKs before supervisor scan ACK and finish; heartbeat stays live", async (t) => {
  const text = await fsp.readFile(new URL("./run-driver.mjs", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("run-driver.mjs", text, ts.ScriptTarget.Latest, true);
  const close = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === "closeSdkResources");
  let tail;
  const visit = (node) => {
    if (ts.isBlock(node)) {
      const index = node.statements.findIndex((item) => ts.isExpressionStatement(item) && ts.isAwaitExpression(item.expression) &&
        ts.isCallExpression(item.expression.expression) && item.expression.expression.expression.getText(parsed) === "closeSdkResources");
      if (index >= 0) tail = node.statements.slice(index, index + 3);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  assert.equal(tail.length, 3);
  assert.match(tail[1].getText(parsed), /:final-integrity/);
  assert.match(tail[2].getText(parsed), /session.finish/);
  const trace = [];
  let env;
  let scan;
  let scanEntered;
  const entry = new Promise((resolve) => { scanEntered = resolve; });
  env = makeEnv(t, { sendImpl: (frame, callback) => {
    env.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
    env.sends.push({ msg: frame, cb: callback });
    const respond = async () => {
      if (frame.type === "hello") env.s2d("start", { manifestPath: "unit/manifest.json", commonIdentitySha256: frame.commonIdentitySha256 });
      if (frame.type === "begin") {
        if (frame.operationId.endsWith(":final-integrity")) {
          trace.push("scan");
          scanEntered();
          await scan.promise;
        }
        env.s2d("begun", { operationId: frame.operationId, remainingMs: 90000 });
      }
      if (frame.type === "finish") {
        trace.push("finish");
        env.s2d("stop", { stopReason: "FINISH", cleanupRemainingMs: 5000 });
      }
      callback(null);
    };
    respond().catch(() => callback(new Error("controlled reply failure")));
    return true;
  } });
  scan = deferred(env);
  await env.b.start({ manifestPath: "unit/manifest.json" });
  const capabilities = env.b.capabilities;
  const resource = (name) => ({ close: async () => { trace.push(name); } });
  const bindings = { capabilities, manifest: { runId: capabilities.runId }, browser: resource("browser-close"),
    servers: [resource("baseline-close"), resource("candidate-close")], session: env.b,
    outcome: { requestedStatus: "inconclusive", requestedExitCode: 2, stopReason: null,
      checks: [], summary: {}, analysisEligible: false } };
  const invoke = new Function(...Object.keys(bindings), `${close.getText(parsed)}\nreturn (async()=>{${tail.map((node) => node.getText(parsed)).join("\n")}})();`);
  const pending = invoke(...Object.values(bindings));
  await entry;
  assert.deepEqual(trace, ["browser-close", "candidate-close", "baseline-close", "scan"]);
  for (const timer of env.intervals) if (!timer.cleared) timer.fn();
  assert.equal(env.sends.at(-1).msg.type, "heartbeat");
  assert.equal(env.sends.some((item) => item.msg.type === "finish"), false);
  scan.resolve();
  await pending;
  assert.equal(trace.at(-1), "finish");
  await env.b.close({ gracefulCloseAttempted: true });
  await env.owner.whenSettled();
});

test("held scanner never delays original stop/Native teardown and its actual body stays joined", { timeout: 10000 }, async (t) => {
  const c = control(t);
  const f = await setupRun(t, { finalIntegrity: c.owner });
  let stopEntered;
  const stop = new Promise((resolve) => { stopEntered = resolve; });
  const original = f.monitor.stopAndReap;
  registerFixtureTeardown(t, { restore: () => { f.monitor.stopAndReap = original; } });
  f.monitor.stopAndReap = function (...args) { stopEntered(args[0]); return original.apply(this, args); };
  const pending = f.run();
  await liveStart(f.clk, f.driver);
  const start = f.clk.nowMonoMs();
  f.driver.emit({ type: "begin", kind: "command", operationId: "R1:final-integrity" });
  await c.entry;
  assert.equal(c.calls[0].deadlineMonoMs, start + 90000);
  f.driver.emit({ type: "heartbeat", operationId: "R1:final-integrity" });
  await advanceBy(f.clk, 1);
  const stopAt = f.clk.nowMonoMs();
  f.w.requestStop("REQUESTED");
  assert.equal(c.calls[1].type, "interrupt");
  closeFacts(f.driver);
  await advanceBy(f.clk, 8);
  const native = await stop;
  assert.equal(native.deadlineMonoMs, stopAt + 5000);
  assert.equal(f.driver.written.some((frame) => frame.type === "begun"), false);
  let ended = false;
  pending.then(() => { ended = true; }, () => { ended = true; });
  await yieldTurn();
  assert.equal(ended, false);
  c.release();
  const result = await drain(f.clk, pending);
  assert.equal(result.exitCode, 2);
  assert.equal(result.stopReason, "REQUESTED");
  await f.dispose();
});

for (const type of ["begin", "register", "event", "artifact"]) {
  test(`the permanent scan fence rejects later experimental ${type}`, { timeout: 10000 }, async (t) => {
    const c = control(t);
    const f = await setupRun(t, { finalIntegrity: c.owner });
    const begun = sent(t, f.driver, "begun");
    const pending = f.run();
    await liveStart(f.clk, f.driver);
    f.driver.emit({ type: "begin", kind: "command", operationId: "R1:final-integrity" });
    await c.entry;
    c.release();
    await begun;
    f.driver.emit({ type: "end", operationId: "R1:final-integrity", result: { status: "completed", evidencePaths: [], detail: {} } });
    const extra = {
      begin: { kind: "command", operationId: "forbidden" },
      register: { requestId: "forbidden", kind: "fixture", rootPid: null, expectedExecutable: null, listener: null },
      event: { recordId: "forbidden", recordSeq: 0, kind: "response", payload: {} },
      artifact: { recordId: "forbidden", recordSeq: 0, artifactId: "forbidden-file", path: "check/forbidden.txt",
        mode: "append", encoding: "base64", data: "", last: true },
    }[type];
    f.driver.emit({ type, ...extra });
    closeFacts(f.driver);
    const result = await drain(f.clk, pending);
    assert.equal(result.stopReason, "FINAL_INTEGRITY");
    assert.equal(result.exitCode, 2);
    assert.equal(c.calls.filter((item) => item.type === "collect").length, 1);
    await f.dispose();
  });
}

test("finish without a privately completed scan cannot request pass", { timeout: 10000 }, async (t) => {
  const c = control(t);
  const f = await setupRun(t, { finalIntegrity: c.owner });
  const pending = f.run();
  await liveStart(f.clk, f.driver);
  f.driver.emit(FINISH("passed", 0));
  closeFacts(f.driver);
  const result = await drain(f.clk, pending);
  assert.equal(result.exitCode, 2);
  assert.equal(result.stopReason, "FINAL_INTEGRITY");
  assert.equal(c.calls.some((item) => item.type === "collect"), false);
  await f.dispose();
});


for (const raw of [null, new Error("real finish callback failure")]) {
  test(`normal STOP after finish submission joins held callback: ${raw === null ? "success" : "raw error"}`, async (t) => {
    const env = makeEnv(t);
    await driveStart(env);
    const pending = env.b.finish({ requestedStatus: "inconclusive", requestedExitCode: 2, stopReason: null,
      checks: [], summary: {}, analysisEligible: false });
    const submitted = env.sends.find((item) => item.msg.type === "finish");
    assert.ok(submitted);
    let finished = false;
    pending.then(() => { finished = true; }, () => { finished = true; });
    env.s2d("stop", { stopReason: "FINISH", cleanupRemainingMs: 5000 });
    const closed = env.b.close({ gracefulCloseAttempted: true });
    let closedDone = false;
    closed.then(() => { closedDone = true; }, () => { closedDone = true; });
    env.sends.find((item) => item.msg.type === "closed").cb(null);
    let zeroSeen = false;
    const zero = env.owner.whenSettled().then(() => { zeroSeen = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(finished, false);
    assert.equal(closedDone, false);
    assert.equal(zeroSeen, false);
    submitted.cb(raw);
    if (raw === null) await pending;
    else await assert.rejects(pending, (error) => error === raw);
    await closed;
    await zero;
    assert.equal(env.msgFns.size, 0);
  });
}

test("actual collector diagnostic reaches the persisted WD fault while accounting/cleanup remain unproven", { timeout: 10000 }, async (t) => {
  const native = createMonitorFixture({ script: monitorBootstrapScript() });
  const originalEnd = native.clock.nowMs() + 30000;
  // The actual monitor owns its fake collector separately. Release physical
  // facts, stop under that original bound, then join before root removal.
  registerFixtureTeardown(t, { release: () => native.fixture.exit(2),
    settle: async () => {
      await native.monitor.stopAndReap({ deadlineMonoMs: originalEnd });
      await processMonitorLifetime(native.monitor).whenSettled();
    }, remove: native.cleanup });
  await startMonitorFixture(native);
  const f = await setupRun(t);
  const oldObservation = f.monitor.lastObservation;
  const oldFault = f.monitor.fault;
  registerFixtureTeardown(t, { restore: () => {
    f.monitor.lastObservation = oldObservation;
    f.monitor.fault = oldFault;
  } });
  // Forward real read-only monitor facts, never expected text or a proof
  // callback. The actual Watchdog invalid-observation branch stays in use.
  f.monitor.lastObservation = native.monitor.lastObservation;
  f.monitor.fault = native.monitor.fault;
  const stopped = sent(t, f.driver, "stop");
  const pending = f.run();
  await liveStart(f.clk, f.driver);
  const first = JSON.stringify({ sameMembership: true, orderEqual: false });
  const second = JSON.stringify({ sameMembership: false, orderEqual: false });
  const diagnostic = `pid list never stable [${first},${" ".repeat(3800)}${second}]`;
  native.fixture.emit({ type: "accounting-fault", code: "ACCOUNTING_UNAVAILABLE",
    reason: "unstable-list", diagnostic });
  const originalFault = native.monitor.fault();
  assert.equal(originalFault.detail, `ACCOUNTING_UNAVAILABLE collector unstable-list: ${diagnostic}`);
  f.clk.advance(1000);
  const stop = await stopped;
  assert.equal(stop.stopReason, "ACCOUNTING_UNAVAILABLE");
  assert.equal(stop.cleanupRemainingMs, 5000);
  closeFacts(f.driver);
  const result = await drain(f.clk, pending);
  assert.equal(result.status, "inconclusive");
  assert.equal(result.exitCode, 2);
  assert.equal(result.stopReason, "ACCOUNTING_UNAVAILABLE");
  const final = parseCanonicalBytes(await f.env.readFile("check/final.json"));
  assert.equal(final.cleanup.accountingValid, false);
  assert.equal(final.cleanup.verified, false);
  const lines = (await f.env.readFile("check/events.jsonl")).toString().trim().split("\n")
    .map((line) => parseCanonicalBytes(Buffer.from(line + "\n")));
  const event = lines.find((line) => line.kind === "fault" && line.payload.detail.includes("native observation"));
  assert.ok(event);
  assert.equal(event.payload.code, "ACCOUNTING_UNAVAILABLE");
  assert.ok(event.payload.detail.includes("collector unstable-list: pid list never stable"));
  assert.ok(event.payload.detail.includes(first));
  assert.ok(event.payload.detail.includes(second));
  assert.ok(Buffer.byteLength(event.payload.detail) <= 4096);
  assert.deepEqual(native.monitor.fault(), originalFault);
  await f.dispose();
});

for (const unavailable of [null, () => { throw undefined; }]) {
  test(`invalid Native observation retains honest fallback when fault info is ${unavailable === null ? "absent" : "throwing"}`, async (t) => {
    const f = await setupRun(t);
    const original = f.monitor.lastObservation;
    registerFixtureTeardown(t, { restore: () => { f.monitor.lastObservation = original; } });
    const stopped = sent(t, f.driver, "stop");
    const pending = f.run();
    await liveStart(f.clk, f.driver);
    f.monitor.lastObservation = () => ({ accountingValid: false, rssBytes: 0,
      peakRssBytes: 0, rssLimitExceeded: false, atMonoNs: "1" });
    if (unavailable !== null) f.monitor.fault = unavailable;
    f.clk.advance(1000);
    await stopped;
    closeFacts(f.driver);
    const result = await drain(f.clk, pending);
    assert.equal(result.stopReason, "ACCOUNTING_UNAVAILABLE");
    const final = parseCanonicalBytes(await f.env.readFile("check/final.json"));
    assert.equal(final.cleanup.verified, false);
    const lines = (await f.env.readFile("check/events.jsonl")).toString().trim().split("\n").map(JSON.parse);
    assert.ok(lines.some((line) => line.kind === "fault" &&
      line.payload.detail === "watchdog-runtime ACCOUNTING_UNAVAILABLE: native observation"));
    await f.dispose();
  });
}
