// Controlled real Node IPC over the actual bridge/channel and operational
// transport/close body. No Native, SDK, model or phase is executed.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fork } from "node:child_process";
import ts from "typescript";
import { createDriverChannel, createDriverActualScope, finishDriverActualScope } from "./watchdog-driver.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createObservedDriver, watchdogTestClock } from "./watchdog-driver-test-fixtures.mjs";
const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const source = await fsp.readFile(new URL("./run-driver.mjs", import.meta.url), "utf8");
const tree = ts.createSourceFile("run-driver.mjs", source, ts.ScriptTarget.Latest, true);
let transport;
let closeBlock;
const select = (node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "transport") transport = node.initializer;
  if (ts.isTryStatement(node) && node.finallyBlock && node.finallyBlock.getText(tree).includes("await lifetime.whenSettled()")) {
    const statements = node.finallyBlock.statements;
    closeBlock = statements.slice(statements.findIndex((item) => ts.isIfStatement(item) && item.expression.getText(tree) === "session !== null"));
  }
  ts.forEachChild(node, select);
};
select(tree);
assert.ok(transport);
assert.equal(closeBlock.length, 3);
const bridgeURL = new URL("./driver-bridge.mjs", import.meta.url).href;
const lifetimeURL = new URL("./watchdog-lifetime.mjs", import.meta.url).href;
const hash = "1".repeat(64);
const outcome = { requestedStatus: "failed", requestedExitCode: 1, stopReason: null,
  checks: [], summary: {}, analysisEligible: false };

for (const mode of ["normal", "missing-closed", "invalid-closed"]) {
  test(`actual Node IPC ${mode} keeps expected close distinct from disconnect faults`, { timeout: 10000 }, async (t) => {
    const lifetime = createWatchdogLifetime();
    const scope = createDriverActualScope({ runId: mode, retainActual: lifetime.retainActual });
    const disconnected = gate();
    const physical = gate();
    const frames = [];
    const errors = [];
    const sends = [];
    const stderr = [];
    let root;
    let child;
    let channel;
    let exit = false;
    const pipes = [false, false];
    const end = Date.now() + 8000;
    const remaining = () => Math.max(1, end - Date.now());
    t.after(async () => {
      if (channel) {
        channel.close();
        await channel.reap(remaining());
      }
      if (child) await physical.promise;
      await Promise.allSettled(sends);
      await finishDriverActualScope(scope);
      await lifetime.whenSettled();
      if (root) await fsp.rm(root, { recursive: true, force: true });
    });
    root = await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-ipc-control-"));
    const entry = path.join(root, "control.mjs");
    const manifest = { runId: mode, phase: "check", commonIdentitySha256: hash };
    await fsp.writeFile(entry, `import {createDriverCapabilities} from ${JSON.stringify(bridgeURL)};
import {createWatchdogLifetime} from ${JSON.stringify(lifetimeURL)};
const lifetime=createWatchdogLifetime();
const controller=new AbortController();
const syntheticSilent=false;
const manifest=${JSON.stringify(manifest)};
const transport=${transport.getText(tree)};
let primary; let hasPrimary=false;
const retainPrimary=(value)=>{if(!hasPrimary){hasPrimary=true;primary=value;}};
const session=createDriverCapabilities({runId:manifest.runId,manifest,transport,signal:controller.signal});
await session.start({manifestPath:'unit/manifest.json'});
await session.finish(${JSON.stringify(outcome)});
if (${JSON.stringify(mode)} === 'normal') {
${closeBlock.map((item) => item.getText(tree)).join("\n")}
if(hasPrimary) throw primary;
} else {
if (${JSON.stringify(mode)} === 'invalid-closed') await new Promise((resolve,reject)=>{
process.send({ipcVersion:1,runId:manifest.runId,seq:2,type:'closed',gracefulCloseAttempted:'bad',expectedShutdowns:[]},(error)=>error?reject(error):resolve());
});
if(process.connected)process.disconnect();
}
`);
    channel = createDriverChannel({ entry, args: [], cwd: root, execPath: process.execPath,
      runId: mode, protocol: createProtocolValidator({ runId: mode }), clock: { setTimeout, clearTimeout },
      retainActual: lifetime.retainActual, actualScope: scope,
      forkImpl: (...args) => {
        child = fork(...args);
        child.stdout.on("data", (chunk) => { assert.equal(chunk.length, 0); });
        child.stderr.on("data", (chunk) => { stderr.push(chunk); });
        child.stdout.once("close", () => { pipes[0] = true; });
        child.stderr.once("close", () => { pipes[1] = true; });
        child.once("exit", () => { exit = true; });
        child.once("disconnect", disconnected.resolve);
        child.once("close", physical.resolve);
        return child;
      },
      onMessage: (frame) => {
        frames.push(frame.type);
        if (frame.type === "hello") sends.push(channel.send("start", {
          manifestPath: "unit/manifest.json", commonIdentitySha256: hash,
        }, remaining()));
        if (frame.type === "finish") sends.push(channel.send("stop", { stopReason: "FINISH",
          cleanupRemainingMs: 5000 }, remaining()));
        for (const sent of sends) sent.catch(() => {});
      },
      onError: (error) => errors.push(error),
    });
    await disconnected.promise;
    // Reap is deliberately later than child disconnect, matching a driver
    // whose validated closed notice wins the race with parent cleanup.
    const reaped = await channel.reap(remaining());
    await physical.promise;
    await Promise.all(sends);
    await finishDriverActualScope(scope);
    await lifetime.whenSettled();
    assert.equal(reaped.exitCode, 0);
    assert.equal(exit, true);
    assert.deepEqual(pipes, [true, true]);
    assert.equal(Buffer.concat(stderr).length, 0);
    assert.deepEqual(frames, mode === "normal" ? ["hello", "finish", "closed"] : ["hello", "finish"]);
    assert.deepEqual(errors.map((error) => error.code), mode === "normal" ? [] :
      [mode === "missing-closed" ? "IPC_DISCONNECT" : "IPC_INVALID"]);
    assert.throws(() => process.kill(child.pid, 0), (error) => error.code === "ESRCH");
  });
}

test("validated closed does not suppress a late raw send callback error or settle its debt early", async (t) => {
  const lifetime = createWatchdogLifetime();
  const scope = createDriverActualScope({ runId: "late", retainActual: lifetime.retainActual });
  const clock = watchdogTestClock();
  const { channel, driver, errors } = createObservedDriver({ runId: "late", phase: "check",
    commonIdentitySha256: hash, clock, retainActual: lifetime.retainActual, actualScope: scope });
  // This one fixture holds a genuine send callback rather than substituting
  // a public timeout for actual receipt completion.
  const send = driver.child.send;
  let callback;
  driver.child.send = (frame, done) => { callback = done; return true; };
  t.after(async () => {
    if (callback) callback(null);
    driver.child.send = send;
    driver.releaseSendCallbacks();
    driver.exit(0); driver.closeOut(); driver.closeErr();
    await channel.reap(5000);
    await finishDriverActualScope(scope);
    await lifetime.whenSettled();
  });
  driver.emit({ type: "hello" });
  const pending = channel.send("start", { manifestPath: "unit/manifest.json", commonIdentitySha256: hash }, 10);
  clock.advance(11);
  await assert.rejects(pending, (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  driver.emit({ type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [] });
  driver.disconnect();
  let zero = false;
  const joined = lifetime.whenSettled().then(() => { zero = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(zero, false);
  const raw = new Error("actual late callback failure");
  callback(raw);
  assert.deepEqual(errors, [raw]);
  driver.exit(0); driver.closeOut(); driver.closeErr();
  await channel.reap(5000);
  await finishDriverActualScope(scope);
  await joined;
});

for (const premature of [false, true]) {
  test(premature ? "unexpected disconnect before STOP preserves actual raw EPIPE fault" :
    "normal FINISH keeps real IPC open for a delayed parent STOP raw write", { timeout: 10000 }, async (t) => {
    const { existsSync, readFileSync } = await import("node:fs");
    const lifetime = createWatchdogLifetime();
    const scope = createDriverActualScope({ runId: "stop-race", retainActual: lifetime.retainActual });
    const physical = gate();
    const disconnected = gate();
    const errors = [];
    const stderr = [];
    const frames = [];
    const sends = [];
    const end = Date.now() + 8000;
    const remaining = () => Math.max(1, end - Date.now());
    let child;
    let channel;
    let root;
    let exited = false;
    const pipes = [false, false];
    t.after(async () => {
      if (channel) {
        channel.close();
        await channel.reap(remaining());
      }
      if (child) await physical.promise;
      await Promise.allSettled(sends);
      await finishDriverActualScope(scope);
      await lifetime.whenSettled();
      if (root) await fsp.rm(root, { recursive: true, force: true });
  });
  root = await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-stop-race-"));
  const checkpoint = path.join(root, "actual-peer-state.json");
  const entry = path.join(root, "control.mjs");
  const manifest = { runId: "stop-race", phase: "check", commonIdentitySha256: hash };
  await fsp.writeFile(entry, `import {createDriverCapabilities} from ${JSON.stringify(bridgeURL)};
import {createWatchdogLifetime} from ${JSON.stringify(lifetimeURL)};
import {writeFileSync} from 'node:fs';
const lifetime=createWatchdogLifetime();
const controller=new AbortController();
const syntheticSilent=false;
const manifest=${JSON.stringify(manifest)};
const transport=${transport.getText(tree)};
let finishReturned=false;
let done;
const rawSend=transport.send;
transport.send=(frame,callback)=>rawSend(frame,(error)=>{
callback(error);
if(frame.type==='finish') setImmediate(async()=>{
if(${premature}) await new Promise((resolve)=>{
process.once('disconnect',resolve);
process.disconnect();
});
else if(finishReturned) await done;
writeFileSync(${JSON.stringify(checkpoint)},JSON.stringify({finishReturned,connected:process.connected}));
});
});
const session=createDriverCapabilities({runId:manifest.runId,manifest,transport,signal:controller.signal});
await session.start({manifestPath:'unit/manifest.json'});
done=(async()=>{
await session.finish(${JSON.stringify(outcome)});
finishReturned=true;
await session.close({gracefulCloseAttempted:true});
await lifetime.whenSettled();
if(process.connected) process.disconnect();
})();
await done;
`);
  channel = createDriverChannel({ entry, args: [], cwd: root, execPath: process.execPath,
    runId: "stop-race", protocol: createProtocolValidator({ runId: "stop-race" }),
    clock: { setTimeout, clearTimeout }, retainActual: lifetime.retainActual, actualScope: scope,
    forkImpl: (...args) => {
      child = fork(...args);
      child.stdout.on("data", (bytes) => assert.equal(bytes.length, 0));
      child.stderr.on("data", (bytes) => stderr.push(bytes));
      child.once("exit", () => { exited = true; });
      child.stdout.once("close", () => { pipes[0] = true; });
      child.stderr.once("close", () => { pipes[1] = true; });
      child.once("close", physical.resolve);
      child.once("disconnect", disconnected.resolve);
      return child;
    },
    onMessage: (frame) => {
      frames.push(frame.type);
      if (frame.type === "hello") sends.push(channel.send("start", {
        manifestPath: "unit/manifest.json", commonIdentitySha256: hash,
      }, remaining()));
      if (frame.type === "finish") {
        // Controlled real filesystem checkpoint prevents parent event dispatch
        // until the peer either waits for STOP or actually disconnects. No
        // callback/closed state is fabricated. The deadline is test containment.
        while (!existsSync(checkpoint)) {
          if (Date.now() >= end) throw new Error("peer checkpoint not reached");
        }
        assert.equal(channel.connected, true, "guard state before queued CLOSED delivery");
        sends.push(channel.send("stop", { stopReason: "FINISH", cleanupRemainingMs: 5000 }, remaining()));
      }
      for (const send of sends) send.catch(() => {});
    },
    onError: (error) => errors.push(error),
  });
  await disconnected.promise;
  const reaped = await channel.reap(remaining());
  await physical.promise;
  const results = await Promise.allSettled(sends);
  await finishDriverActualScope(scope);
  await lifetime.whenSettled();
  const rawFailure = results.find((result) => result.status === "rejected");
  if (premature) {
    assert.equal(rawFailure?.reason.code, "EPIPE");
    assert.ok(errors.some((error) => error.code === "IPC_DISCONNECT"));
    assert.notEqual(reaped.exitCode, 0);
  } else {
    assert.equal(rawFailure, undefined, `actual raw STOP callback ${rawFailure?.reason?.code}: ${rawFailure?.reason?.message}`);
    assert.deepEqual(errors, []);
    assert.equal(reaped.exitCode, 0);
  }
  assert.deepEqual(JSON.parse(readFileSync(checkpoint, "utf8")), { finishReturned: false, connected: !premature });
  assert.deepEqual(frames, premature ? ["hello", "finish"] : ["hello", "finish", "closed"]);
  assert.equal(exited, true);
  assert.deepEqual(pipes, [true, true]);
  assert.equal(Buffer.concat(stderr).length === 0, !premature);
  });
}
