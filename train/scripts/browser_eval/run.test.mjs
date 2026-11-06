// Pure launch boundaries and one real stdlib-only rejected child. No
// Native, browser, Torch import, model loading or phase execution.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { makeEnv, driveStart, deferred } from "./driver-bridge-test-fixtures.mjs";
import { capturePriorReceiptProbes } from "./watchdog-parent-admission-test-fixtures.mjs";
import { admitPhase } from "./prerequisites.mjs";
import { bootstrapWorkspace, runSupervisor, runDriver } from "./run.mjs";
import { executeSupervisor } from "./run-supervisor.mjs";
import { runPythonReference } from "./reference-child.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { fixtureWorkspace, fixtureManifest } from "./test-fixtures.mjs";
import { makeEvidenceWorkspace, makePreflightRun, gateFs } from "./watchdog-evidence-test-fixtures.mjs";
import { watchdogTestClock } from "./watchdog-test-fixtures.mjs";
import { drain, advanceBy } from "./watchdog-drain-test-fixtures.mjs";
import { registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";

const execute = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "../../..");
const base = { phase: "check", candidate: "WORKTREE", protocolPath: "train/fixtures/browser-protocol.json",
  workspaceRoot: "/unissued-workspace", repoRoot };

test("invalid public launch selections reject before any setup work", async () => {
  for (const change of [{ phase: "unknown" }, { candidate: "" }, { protocolPath: "/other/protocol.json" },
    { workspaceRoot: "relative" }, { repoRoot: "relative" }]) {
    await assert.rejects(bootstrapWorkspace({ ...base, ...change }), /RUN_INVALID/);
  }
  await assert.rejects(runSupervisor(base), /must execute archived CLI/);
  await assert.rejects(runDriver({ manifestPath: "relative", workspaceRoot: "/tmp", repoRoot }), /arguments\/IPC/);
});

test("spent original setup handle starts no parent/Native assembly", async () => {
  const lifetime = createWatchdogLifetime();
  const now = () => Number(process.hrtime.bigint() / 1000000n);
  const budget = createBudgetHandle({ deadlineMonoMs: now() - 1,
    clock: { setTimeout, clearTimeout }, nowMonoMs: now });
  try {
    const workspace = fixtureWorkspace();
    const manifest = fixtureManifest({ workspace });
    await assert.rejects(executeSupervisor({ phase: "check", workspaceRoot: "/unissued-workspace", repoRoot,
      captured: { workspace, inputs: manifest.inputs }, lifetime, budget,
      phaseDeadlineMonoMs: now() + 600000 }), /ACCOUNTING_UNAVAILABLE/);
  } finally {
    budget.dispose();
    await lifetime.whenSettled();
  }
});

test("Python numeric JSON is strict but does not require JS numeric spelling", async () => {
  const { stdout, stderr } = await execute(PYTHON_EXECUTABLE, ["-I", "-B", "-c",
    'import json; print(json.dumps({"maximumAbsoluteError":0.0,"scientific":1e-8}))'], { maxBuffer: 4096 });
  assert.equal(stderr, "");
  assert.match(stdout, /0\.0/);
  assert.match(stdout, /1e-08/);
  assert.deepEqual(parseJSONBytes(Buffer.from(stdout)), { maximumAbsoluteError: 0, scientific: 1e-8 });
  assert.throws(() => parseCanonicalBytes(Buffer.from(stdout)), /noncanonical bytes/);
  for (const value of ['{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}', '{"x":1e999}', '{} trailing']) {
    assert.throws(() => parseJSONBytes(Buffer.from(value)));
  }
  assert.throws(() => parseJSONBytes(Buffer.from([0xff])));
});

test("closed CLI arguments fail with no setup or phase command", async () => {
  for (const args of [["unexpected"], ["check", "--candidate", "WORKTREE"], ["--driver", "--manifest", "wrong"]]) {
    await assert.rejects(execute(process.execPath, [path.join(import.meta.dirname, "cli.mjs"), ...args], { maxBuffer: 16384 }),
      (error) => error.code === 1 && error.stdout === "" && /CLI|arguments/.test(error.stderr));
  }
  await assert.rejects(execute(PYTHON_EXECUTABLE, ["-I", "-B", path.join(repoRoot, "train/scripts/check_browser_parity.py"), "--unknown"],
    { maxBuffer: 16384 }), (error) => error.code === 2 && error.stdout === "" && /required/.test(error.stderr));
});

test("actual private-FD child rejects missing module inventory before ML and joins every pipe", async (t) => {
  const workspaceRoot = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-reference-stdlib-")));
  const lifetime = createWatchdogLifetime();
  let body = null;
  t.after(async () => {
    if (body !== null) await body.catch(() => {});
    await lifetime.whenSettled();
    await fsp.rm(workspaceRoot, { recursive: true });
  });
  await fsp.mkdir(path.join(workspaceRoot, "parity"), { recursive: true });
  await fsp.mkdir(path.join(workspaceRoot, "inputs/candidate/train/src"), { recursive: true });
  const scripts = path.join(workspaceRoot, "inputs/harness/train/scripts");
  await fsp.mkdir(path.join(scripts, "browser_eval"), { recursive: true });
  for (const [source, target] of [[path.join(repoRoot, "train/scripts/check_browser_parity.py"), path.join(scripts, "check_browser_parity.py")],
    [path.join(import.meta.dirname, "parity-reference.py"), path.join(scripts, "browser_eval/parity-reference.py")]]) {
    await fsp.copyFile(source, target);
    await fsp.chmod(target, 0o444);
  }
  const workspace = fixtureWorkspace();
  const manifest = fixtureManifest({ workspace, phase: "parity", prerequisites: [{
    phase: "check", runId: "fixture-check", completion: { path: "check/completion.json", byteLength: 1, sha256: "a".repeat(64) },
  }] });
  await fsp.writeFile(path.join(workspaceRoot, "parity/manifest.json"), canonicalBytes(manifest));
  const registrations = [];
  const outputs = [];
  const controller = new AbortController();
  const capabilities = { runId: manifest.runId, manifest, signal: controller.signal,
    async operation(kind, id, work) {
      assert.equal(kind, "command");
      assert.equal(id, `${manifest.runId}-python-parity`);
      return work({ remainingMs: 90000, signal: controller.signal });
    },
    async register(fields) {
      registrations.push(fields);
      return { identity: { pid: fields.rootPid }, listener: null };
    },
    async artifact(filename, mode, chunks) {
      const parts = [];
      for await (const part of chunks) parts.push(Buffer.from(part));
      const bytes = Buffer.concat(parts);
      outputs.push({ filename, mode, bytes });
      return { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    },
  };
  body = runPythonReference({ manifest, capabilities, workspaceRoot, lifetime, commonIdentity: workspace.commonIdentity });
  await assert.rejects(body, /REFERENCE_INVALID six-module inventory/);
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].kind, "python");
  assert.equal(registrations[0].expectedExecutable, workspace.commonIdentity.environment.monitoring.python.processImage.realPath);
  assert.notEqual(registrations[0].expectedExecutable, workspace.commonIdentity.environment.python.runtime.invocationPath);
  assert.equal(outputs.length, 2);
  assert.equal(outputs[0].filename, "parity/python-reference.json");
  assert.equal(outputs[0].bytes.length, 0);
  assert.equal(outputs[1].filename, "parity/python-reference.stderr.txt");
  assert.match(outputs[1].bytes.toString("utf8"), /six-module inventory/);
  await lifetime.whenSettled();
});


test("held parent admission cannot delay independent Native cleanup or launch a driver", { timeout: 10000 }, async (t) => {
  const clock = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock });
  const { monitor, monitorCalls, driver, w, run, dispose } = await makePreflightRun(t, { evidence, clock });
  const gate = gateFs(t, { workspaceRoot: evidence.env.workspaceRoot,
    relativePath: "check/completion.json", operation: "read" });
  let stopEntered;
  const entered = new Promise((resolve) => { stopEntered = resolve; });
  const original = monitor.stopAndReap;
  registerFixtureTeardown(t, { restore: () => { monitor.stopAndReap = original; } });
  monitor.stopAndReap = function (...args) {
    stopEntered();
    return original.apply(this, args);
  };
  let pending = null;
  try {
    pending = run();
    await gate.entered;
    w.requestStop("REQUESTED");
    await advanceBy(clock, 8);
    await entered;
    assert.ok(monitorCalls.includes("stopAndReap"));
    assert.equal(driver.calls.length, 0);
    // The actual read remains held while the collector has already
    // entered teardown. Its later raw failure cannot revive admission.
    gate.release(new Error("controlled actual admission read failure"));
    const outcome = await drain(clock, pending);
    assert.equal(outcome.stopReason, "REQUESTED");
    assert.equal(outcome.exitCode, 2);
    assert.equal(driver.calls.length, 0);
  } finally {
    gate.release();
    if (pending !== null) await drain(clock, pending).catch(() => {});
    await dispose();
  }
});


for (const mode of ["no-child", "throw-null", "throw-undefined"]) {
  test(`reference ${mode} retains actual child/write debt through every allocated pipe close`, async (t) => {
    const workspaceRoot = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-reference-debt-")));
    await fsp.mkdir(path.join(workspaceRoot, "parity"));
    const lifetime = createWatchdogLifetime();
    const workspace = fixtureWorkspace();
    const manifest = fixtureManifest({ workspace, phase: "parity", prerequisites: [{ phase: "check", runId: "fixture-check",
      completion: { path: "check/completion.json", byteLength: 1, sha256: "a".repeat(64) } }] });
    let spawned;
    const spawnEntered = new Promise((resolve) => { spawned = resolve; });
    let writing;
    const writeEntered = new Promise((resolve) => { writing = resolve; });
    class Pipe extends EventEmitter {
      end() {
        writing();
        if (mode === "throw-null") throw null;
        if (mode === "throw-undefined") throw undefined;
      }
    }
    class Child extends EventEmitter {
      constructor() {
        super();
        this.pid = mode === "no-child" ? undefined : 12345;
        this.stdout = new Pipe();
        this.stderr = new Pipe();
        this.stdio = [null, this.stdout, this.stderr, new Pipe()];
      }
    }
    const child = new Child();
    let pending = null;
    const release = () => {
      child.emit("exit", 1, null);
      child.stdout.emit("close");
      child.stderr.emit("close");
      child.stdio[3].emit("close");
    };
    t.after(async () => {
      release();
      if (pending !== null) await pending.catch(() => {});
      await lifetime.whenSettled();
      await fsp.rm(workspaceRoot, { recursive: true });
    });
    let registers = 0;
    const capabilities = { manifest, signal: new AbortController().signal,
      operation: async (kind, id, work) => work({ remainingMs: 90000 }),
      register: async ({ rootPid }) => { registers += 1; return { identity: { pid: rootPid } }; },
      artifact: async () => { throw new Error("failure must precede artifact issue"); },
    };
    pending = runPythonReference({ manifest, capabilities, workspaceRoot, lifetime, commonIdentity: workspace.commonIdentity }, {
      spawn: (executable, args) => {
        assert.equal(executable, PYTHON_EXECUTABLE);
        assert.deepEqual(args.slice(0, 2), ["-I", "-B"]);
        spawned();
        return child;
      },
    });
    pending.catch(() => {});
    await spawnEntered;
    const rawError = new Error("actual asynchronous creation failure");
    if (mode === "no-child") child.emit("error", rawError);
    else {
      child.stdio[3].emit("data", canonicalBytes({ type: "reference-entry", runId: manifest.runId,
        pid: child.pid, manifestSha256: sha256Bytes(canonicalBytes(manifest)) }));
      await writeEntered;
    }
    let zeroSeen = false;
    const zero = lifetime.whenSettled().then(() => { zeroSeen = true; });
    if (mode !== "no-child") child.emit("exit", 1, null);
    child.stdout.emit("close");
    child.stderr.emit("close");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(zeroSeen, false);
    child.stdio[3].emit("close");
    const expected = mode === "no-child" ? rawError : mode === "throw-null" ? null : undefined;
    await assert.rejects(pending, (error) => error === expected);
    await zero;
    await lifetime.whenSettled();
    assert.equal(registers, mode === "no-child" ? 0 : 1);
  });
}


const driverSource = ts.createSourceFile("run-driver.mjs", await fsp.readFile(new URL("./run-driver.mjs", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const closeNodes = driverSource.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === "closeSdkResources");
assert.equal(closeNodes.length, 1);
const actualCloseSdkResources = vm.runInNewContext(`(${closeNodes[0].getText(driverSource)})`);

for (const held of [false, true]) {
  test(`actual SDK close ${held ? "held stop" : "error"} cannot admit a successful finish`, async (t) => {
    const env = makeEnv(t);
    await driveStart(env);
    const entered = deferred(env);
    const release = deferred(env);
    const ended = deferred(env);
    const originalSend = env.transport.send;
    env.transport.send = function (...args) {
      const admitted = originalSend.apply(this, args);
      if (args[0].type === "end") ended.resolve(args[0]);
      return admitted;
    };
    const raw = new Error("actual SDK close rejected");
    const calls = [];
    class SdkResource {
      constructor(name) { this.name = name; this.expected = false; this.closed = false; }
      async close() {
        this.expected = true;
        calls.push(this.name);
        if (this.name === "browser") {
          entered.resolve();
          if (held) await release.promise;
          else throw raw;
        }
        this.closed = true;
      }
    }
    const resources = [new SdkResource("browser"), new SdkResource("candidate"), new SdkResource("baseline")];
    let finished = false;
    const pending = actualCloseSdkResources(env.b.capabilities, resources).then(() => { finished = true; });
    pending.catch(() => {});
    const begin = env.sends.at(-1);
    assert.equal(begin.msg.type, "begin");
    assert.equal(begin.msg.kind, "command");
    env.s2d("begun", { operationId: begin.msg.operationId, remainingMs: 90000 });
    begin.cb(null);
    await entered.promise;
    if (held) {
      env.s2d("stop", { stopReason: "OPERATION_TIMEOUT", cleanupRemainingMs: 5000 });
      await assert.rejects(pending, /stop/);
      let zeroSeen = false;
      const zero = env.owner.whenSettled().then(() => { zeroSeen = true; });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(zeroSeen, false);
      release.resolve();
      await zero;
      assert.equal(resources.every((resource) => resource.closed), true);
      assert.equal(env.sends.some((entry) => entry.msg.type === "end"), false);
    } else {
      const end = await ended.promise;
      assert.equal(end.result.status, "failed");
      env.sends.at(-1).cb(null);
      await assert.rejects(pending, (error) => error === raw);
    }
    assert.deepEqual(calls, ["browser", "candidate", "baseline"]);
    assert.equal(resources.every((resource) => resource.expected), true);
    assert.equal(finished, false);
    assert.equal(env.sends.some((entry) => entry.msg.type === "finish"), false);
    await env.owner.whenSettled();
  });
}

test("real prior receipts supply exact gone tuples while healthy parent remains same-live", async (t) => {
  const clock = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock });
  const probes = await capturePriorReceiptProbes(t, evidence);
  const key = (identity) => `${identity.pid}:${identity.startSec}:${identity.startUsec}`;
  assert.equal(Object.hasOwn(probes, key(evidence.parentSupervisor)), false);
  const observed = [];
  const admitted = await admitPhase({ workspaceRoot: evidence.env.workspaceRoot, phase: "preflight",
    commonIdentity: evidence.commonIdentity, parents: evidence.prerequisites.map((row) => row.completion),
    probeIdentity: async (identity) => {
      observed.push(key(identity));
      return key(identity) === key(evidence.parentSupervisor) ? "same-live" : probes[key(identity)] ?? "unavailable";
    } });
  assert.equal(admitted.parents.length, 2);
  assert.equal(observed.every((identity) => probes[identity] === "gone"), true);
  await evidence.dispose();
});

// This isolated leaf deliberately retains unproven debt. Its test-only hold
// spy allows the Node fixture to exit without claiming owner settlement;
// only that real process exit permits the outer test to remove its root.
test("an arbitrary spawn throw cannot manufacture physical completion", async (t) => {
  const workspaceRoot = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-unproven-spawn-")));
  t.after(() => fsp.rm(workspaceRoot, { recursive: true }));
  const source = `
    import { runPythonReference } from "./train/scripts/browser_eval/reference-child.mjs";
    import { createWatchdogLifetime } from "./train/scripts/browser_eval/watchdog-lifetime.mjs";
    import { fixtureWorkspace, fixtureManifest } from "./train/scripts/browser_eval/test-fixtures.mjs";
    import { mkdir } from "node:fs/promises";
    const workspaceRoot = ${JSON.stringify(workspaceRoot)};
    await mkdir(workspaceRoot + "/parity");
    let releases = 0;
    const lifetime = createWatchdogLifetime({ createHold: () => () => { releases += 1; } });
    const workspace = fixtureWorkspace();
    const manifest = fixtureManifest({ workspace, phase: "parity", prerequisites: [{ phase: "check", runId: "fixture-check",
      completion: { path: "check/completion.json", byteLength: 1, sha256: "a".repeat(64) } }] });
    let enter;
    const entered = new Promise((resolve) => { enter = resolve; });
    let rejected = false;
    let zero = false;
    let registrations = 0;
    let releasesAtIssue;
    const capabilities = { manifest, signal: new AbortController().signal,
      operation: async (kind, id, work) => work({ remainingMs: 90000 }),
      register: async () => { registrations += 1; throw new Error("must not register"); },
      artifact: async () => { throw new Error("must not write artifacts"); } };
    runPythonReference({ manifest, capabilities, workspaceRoot, lifetime, commonIdentity: workspace.commonIdentity }, {
      spawn: () => { releasesAtIssue = releases; enter(); throw undefined; },
    }).catch(() => { rejected = true; });
    await entered;
    lifetime.whenSettled().then(() => { zero = true; });
    await new Promise((resolve) => setImmediate(resolve));
    console.log(JSON.stringify({ rejected, zero, registrations, unprovenRelease: releases - releasesAtIssue }));
  `;
  const { stdout, stderr } = await execute(process.execPath, ["--input-type=module", "-e", source], {
    cwd: repoRoot, maxBuffer: 4096,
  });
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), { rejected: false, zero: false, registrations: 0, unprovenRelease: 0 });
});
