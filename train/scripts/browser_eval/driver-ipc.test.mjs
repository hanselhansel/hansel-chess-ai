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
        if (frame.type === "finish" && mode === "normal") sends.push(channel.send("stop", { stopReason: "FINISH",
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
