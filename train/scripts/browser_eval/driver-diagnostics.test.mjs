// Selected actual driver catch/finally over real Node IPC and real Recorder
// files. No Native, SDK, browser, model or actual phase is executed.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import ts from "typescript";
import { createDriverChannel, createDriverActualScope, finishDriverActualScope } from "./watchdog-driver.mjs";
import * as lifetimeAPI from "./watchdog-lifetime.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { issueActual } from "./artifact-files.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { makeStore, fixtureWorkspace, writeFixtureInputs, fixtureManifest, fixtureRunning, copy } from "./test-fixtures.mjs";

const source = await fsp.readFile(new URL("./run-driver.mjs", import.meta.url), "utf8");
const tree = ts.createSourceFile("driver.mjs", source, ts.ScriptTarget.Latest, true);
const selected = {};
const select = (node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "transport") selected.transport = node.initializer;
  if (ts.isTryStatement(node) && node.catchClause?.getText(tree).includes("controller.abort(error)")) {
    selected.caught = node.catchClause.block;
    selected.finally = node.finallyBlock;
  }
  if (ts.isFunctionDeclaration(node) && node.name?.text === "executeDriver") {
    selected.throwFirst = node.body.statements.at(-1);
  }
  ts.forEachChild(node, select);
};
select(tree);
assert.ok(selected.transport && selected.caught && selected.finally && selected.throwFirst);

for (const mode of ["error", "undefined", "null", "false"]) {
  test(`actual driver ${mode} survives IPC close through bounded late stderr`, { timeout: 10000 }, async (t) => {
    const lines = [];
    let stopped = false;
    let writerClosed = false;
    const owner = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => {
      assert.equal(stopped, true, "primary disconnect stop precedes late diagnostic");
      assert.equal(writerClosed, false);
      lines.push(line);
    } });
    const scope = createDriverActualScope({ runId: mode, retainActual: owner.retainActual });
    const env = await makeStore({ lifetime: owner });
    const root = env.workspaceRoot;
    let child;
    let physical;
    let channel;
    let recorder;
    const sends = [];
    const checkpointWrites = [];
    const errors = [];
    const facts = [false, false, false];
    const end = Date.now() + 8000;
    const remaining = () => Math.max(1, end - Date.now());
    t.after(async () => {
      if (channel) {
        channel.close();
        await channel.reap(remaining());
      }
      if (physical) await physical;
      await Promise.allSettled(sends);
      await Promise.allSettled(checkpointWrites);
      await finishDriverActualScope(scope);
      if (recorder && !writerClosed) await recorder.closeIncompleteEvidence();
      await owner.whenSettled();
      await fsp.rm(root, { recursive: true, force: true });
    });
    const workspace = fixtureWorkspace();
    await writeWorkspaceOnce({ store: env.store, workspace });
    const inputs = await writeFixtureInputs({ store: env.store });
    const manifest = fixtureManifest({ workspace, inputs, runId: mode });
    recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: async () => copy(workspace.commonIdentity),
      verifyCleanup: async ({ claimedProof }) => ({ scope: claimedProof.scope,
        expectedFinalizer: null, verified: false, survivorIdentities: [],
        listenersRemaining: [], accountingValid: false }),
    });
    await recorder.writeManifest();
    await recorder.writeRunning(fixtureRunning({ manifest }));
    const entry = path.join(root, "child.mjs");
    const checkpoint = path.join(root, "parent-stopped");
    const bridgeURL = new URL("./driver-bridge.mjs", import.meta.url).href;
    const lifetimeURL = new URL("./watchdog-lifetime.mjs", import.meta.url).href;
    await fsp.writeFile(entry, `import assert from 'node:assert/strict';
import {promises as fsp} from 'node:fs';
import {createDriverCapabilities} from ${JSON.stringify(bridgeURL)};
import * as L from ${JSON.stringify(lifetimeURL)};
const buffered=[];
const lifetime=L.createWatchdogLifetime({reportAwaitStage:line=>buffered.push(line)});
const reportDriverDiagnostic=(owner,scope,label,value)=>{assert.equal(process.connected,false);assert.equal(controller.signal.aborted,true);assert.strictEqual(value,primary);return L.reportDriverDiagnostic(owner,scope,label,value)};
const diagnosticScope='phase';
const controller=new AbortController();
const syntheticSilent=false;
const manifest=${JSON.stringify(manifest)};
const transport=${selected.transport.getText(tree)};
const session=createDriverCapabilities({runId:manifest.runId,manifest,transport,signal:controller.signal});
const budget={dispose(){}};const browser=null;const servers=[];
let hasPrimary=false;let primary;
const retainPrimary=error=>{if(!hasPrimary){hasPrimary=true;primary=error}};
await session.start({manifestPath:'check/manifest.json'});
const raw=${mode === "error" ? "Object.freeze(Object.assign(new Error('page.goto: net::ERR_ABORTED at http://user:pass@127.0.0.1:19001/engine?token=secret#fragment'),{code:'CONTROLLED_DRIVER',detail:'net::ERR_ABORTED /engine'}))" : mode};
const disconnected=new Promise(resolve=>process.once('disconnect',resolve));
try {throw raw} catch(error) ${selected.caught.getText(tree)} finally ${selected.finally.getText(tree)}
assert.equal(hasPrimary,true);assert.strictEqual(primary,raw);
let observed=false;try{${selected.throwFirst.getText(tree)}}catch(error){observed=true;assert.strictEqual(error,raw)}assert.equal(observed,true);
await disconnected;
const end=Date.now()+7000;
while(true){try{await fsp.readFile(${JSON.stringify(checkpoint)});break}catch(error){if(error.code!=='ENOENT')throw error}assert.ok(Date.now()<end);await new Promise(resolve=>setImmediate(resolve))}
await new Promise((resolve,reject)=>process.stderr.write('UNAPPROVED raw transcript token=secret\\n'+buffered.join(''),error=>error?reject(error):resolve()));
process.exitCode=7;
`);
    channel = createDriverChannel({ entry, args: [], cwd: root, execPath: process.execPath,
      runId: mode, protocol: createProtocolValidator({ runId: mode }), clock: { setTimeout, clearTimeout },
      retainActual: owner.retainActual, actualScope: scope,
      diagnosticOwner: owner, diagnosticScope: "phase",
      forkImpl: (...args) => {
        child = fork(...args);
        child.once("exit", () => { facts[0] = true; });
        child.stdout.once("close", () => { facts[1] = true; });
        child.stderr.once("close", () => { facts[2] = true; });
        physical = new Promise((resolve) => child.once("close", resolve));
        return child;
      },
      onMessage: (frame) => {
        if (frame.type === "hello") {
          const sent = channel.send("start", { manifestPath: "check/manifest.json",
            commonIdentitySha256: manifest.commonIdentitySha256 }, remaining());
          sends.push(sent);
          sent.catch(() => {});
        }
      },
      onError: (error) => {
        errors.push(error);
        stopped = true;
        // Independent test control only, never a new operational wire ACK.
        const write = issueActual(owner.retainActual, () => fsp.writeFile(checkpoint, "stopped"));
        checkpointWrites.push(write);
        write.catch(() => {});
      },
    });
    await physical;
    const reaped = await channel.reap(remaining());
    await Promise.all(sends);
    await Promise.all(checkpointWrites);
    await finishDriverActualScope(scope);
    assert.deepEqual(facts, [true, true, true]);
    assert.equal(reaped.exitCode, 7);
    assert.deepEqual(errors.map((error) => error.code), ["IPC_DISCONNECT"]);
    const retainedBeforeClose = [...lines];
    await recorder.finalize({ intent: { status: "inconclusive", exitCode: 2,
      stopReason: "IPC_DISCONNECT", summary: {}, unplannedFaultCount: 1, analysisEligible: false },
    checks: [], prerequisites: [], expectedSelfTest: null });
    writerClosed = true;
    await owner.whenSettled();
    assert.equal(retainedBeforeClose.length, 1, "approved diagnostic retained before genuine final writer closure");
    assert.ok(Buffer.byteLength(retainedBeforeClose[0]) <= 256);
    assert.equal(retainedBeforeClose[0].includes("secret"), false);
    assert.equal(retainedBeforeClose[0].includes("user:pass"), false);
    assert.equal(retainedBeforeClose[0].includes("UNAPPROVED"), false);
    const row = JSON.parse(retainedBeforeClose[0].slice("TINYAZ_AWAIT ".length));
    assert.equal(row.stage, "driver.fault");
    if (mode === "error") {
      assert.equal(row.code, "CONTROLLED_DRIVER");
      assert.equal(row.detail, "net::ERR_ABORTED /engine");
    }
  });
}

test("driver descriptions guard hostile one-level causes and reporter reentry", () => {
  let owner;
  let codeReads = 0;
  let messageReads = 0;
  let faultReads = 0;
  let rendered = false;
  const lines = [];
  const cause = Object.freeze({
    get code() {
      codeReads += 1;
      lifetimeAPI.reportDriverDiagnostic(owner, "phase", "driver.fault", cause);
      throw false;
    },
    get message() {
      messageReads += 1;
      return "navigation failed http://user:pass@127.0.0.1/path?token=secret\nRAW_STACK";
    },
    get fault() {
      faultReads += 1;
      throw new Error("not approved for driver description");
    },
    detail: "token=secret controlled-safe-tail",
    toString() {
      rendered = true;
      throw null;
    },
  });
  owner = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => {
    lines.push(line);
    lifetimeAPI.reportDriverDiagnostic(owner, "phase", "driver.fault", cause);
    throw undefined;
  } });
  lifetimeAPI.reportDriverDiagnostic(owner, "phase", "driver.fault", cause);
  assert.equal(lines.length, 1);
  assert.equal(codeReads, 1);
  assert.equal(messageReads, 1);
  assert.equal(faultReads, 0);
  assert.equal(rendered, false);
  assert.equal(lines[0].includes("secret"), false);
  assert.equal(lines[0].includes("user:pass"), false);
  assert.equal(lines[0].includes("RAW_STACK"), false);
  assert.ok(Buffer.byteLength(lines[0]) <= 256);
});

test("stderr reader accepts only complete approved UTF8 diagnostics under shared cap", () => {
  const produced = [];
  const child = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => produced.push(line) });
  lifetimeAPI.reportDriverDiagnostic(child, "phase", "driver.fault", {
    code: "CONTROLLED", detail: "字 net::ERR_ABORTED /engine.html",
  });
  const lines = [];
  const owner = lifetimeAPI.createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const receive = lifetimeAPI.createDriverDiagnosticReader(owner, "phase");
  const valid = Buffer.from(produced[0]);
  receive(Buffer.from("RAW transcript token=secret\n"));
  receive(Buffer.from("x".repeat(17000) + "\n"));
  receive(Buffer.concat([Buffer.from("TINYAZ_AWAIT "), Buffer.from([0xff]), Buffer.from("\n")]));
  const row = JSON.parse(produced[0].slice("TINYAZ_AWAIT ".length));
  for (const invalid of [{ ...row, stack: "RAW_STACK" }, { ...row, stage: "ordinary.fault" },
    { ...row, scope: "selftest" }, { ...row, code: {} }, { ...row, state: "fulfilled" }]) {
    receive(Buffer.from(`TINYAZ_AWAIT ${JSON.stringify(invalid)}\n`));
  }
  assert.equal(lines.length, 0);
  const split = valid.indexOf(Buffer.from("字")) + 1;
  receive(valid.subarray(0, split));
  assert.equal(lines.length, 0, "incomplete line/UTF8 prefix is not a diagnostic");
  receive(valid.subarray(split));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /字 net::ERR_ABORTED/);
  for (let index = 0; index < 70; index += 1) receive(valid);
  lifetimeAPI.reportDriverDiagnostic(owner, "phase", "driver.fault", { detail: "beyond shared cap" });
  assert.equal(lines.length, 64);
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
  assert.ok(lines.reduce((sum, line) => sum + Buffer.byteLength(line), 0) <= 16384);
});
