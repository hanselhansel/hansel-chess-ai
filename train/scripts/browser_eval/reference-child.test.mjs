// Real monitor/proof and fake child pipes. No actual Native, Python or ML.
import test from "node:test";
import { privateFs as phaseFs } from "./private-fs.mjs";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runPythonReference } from "./reference-child.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { fixtureWorkspace, fixtureManifest } from "./test-fixtures.mjs";
import { bsdRow } from "./supervision-test-fixtures.mjs";
import { createMonitorFixture, monitorBootstrapScript, startMonitorFixture } from "./process-monitor-test-fixtures.mjs";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {});
  return { promise, resolve, reject };
};
async function prepare(t, { wrongImage = false, holdAck = false } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ref-entry-")));
  await fs.mkdir(path.join(root, "parity"));
  const lifetime = createWatchdogLifetime();
  const workspace = fixtureWorkspace();
  const manifest = fixtureManifest({ workspace, phase: "parity", prerequisites: [{
    phase: "check", runId: "fixture-check", completion: { path: "check/completion.json", byteLength: 1, sha256: "a".repeat(64) },
  }] });
  const image = workspace.commonIdentity.environment.monitoring.python.processImage.realPath;
  const launcher = workspace.commonIdentity.environment.python.runtime.realPath;
  const script = monitorBootstrapScript();
  script.inspected[4242] = { pid: 4242, state: "live",
    process: bsdRow(4242, process.pid, 4242, 501), executable: launcher };
  const native = createMonitorFixture({ lifetime, script });
  await startMonitorFixture(native);
  const spawned = deferred();
  const registered = deferred();
  const ackRelease = deferred();
  const nativeAck = deferred();
  const controller = new AbortController();
  const calls = { registrations: 0, go: 0, eof: 0, operations: 0 };
  let operationNow = 0;
  const originalEnd = 90000;
  const stopCause = Object.freeze(new Error("original reference command expired"));
  const budget = createBudgetHandle({ deadlineMonoMs: originalEnd,
    clock: { setTimeout: () => 1, clearTimeout: () => {} }, nowMonoMs: () => operationNow });
  budget.onExpire(() => controller.abort(stopCause));
  const outputs = [];
  let ack = false;
  let pending;
  class Pipe extends EventEmitter {
    end(bytes, callback) {
      if (typeof bytes === "function") {
        calls.eof += 1;
        bytes();
        release(2);
        return;
      }
      assert.equal(ack, true, "GO follows the actual roots-accepted ACK");
      assert.equal(JSON.parse(bytes).type, "reference-go");
      calls.go += 1;
      callback(null);
      child.stdout.emit("data", canonicalBytes({ runId: manifest.runId, passed: true }));
      release(0);
    }
  }
  const child = new EventEmitter();
  child.pid = 4242;
  child.stdout = new Pipe();
  child.stderr = new Pipe();
  child.stdio = [null, child.stdout, child.stderr, new Pipe()];
  const release = (code = 2) => {
    child.emit("exit", code, null);
    child.stdout.emit("close");
    child.stderr.emit("close");
    child.stdio[3].emit("close");
  };
  const entry = (value = undefined) => {
    script.inspected[4242].executable = wrongImage ? "/wrong/image" : image;
    const data = value ?? { type: "reference-entry", runId: manifest.runId, pid: child.pid,
      manifestSha256: sha256Bytes(canonicalBytes(manifest)) };
    child.stdio[3].emit("data", Buffer.isBuffer(data) ? data : canonicalBytes(data));
  };
  const capabilities = { manifest, signal: controller.signal,
    async operation(kind, id, work) {
      calls.operations += 1;
      assert.equal(kind, "command");
      budget.assertLive("one original command");
      return work({ remainingMs: budget.remainingMs() });
    },
    async register(fields) {
      calls.registrations += 1;
      assert.equal(fields.kind, "python");
      assert.equal(fields.expectedExecutable, image);
      registered.resolve();
      const result = await native.monitor.registerRoot({ pid: fields.rootPid, kind: fields.kind,
        expectedExecutable: fields.expectedExecutable, scopeRunId: "R1" });
      nativeAck.resolve();
      if (holdAck) await ackRelease.promise;
      ack = true;
      return result;
    },
    async artifact(filename, mode, chunks) {
      const parts = [];
      for await (const bytes of chunks) parts.push(Buffer.from(bytes));
      const bytes = Buffer.concat(parts);
      outputs.push({ filename, bytes });
      return { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    },
  };
  t.after(async () => {
    controller.abort(new Error("teardown"));
    ackRelease.resolve();
    release();
    if (pending) await pending.catch(() => {});
    await native.monitor.stopAndReap();
    await lifetime.whenSettled();
    native.cleanup();
    budget.dispose();
    await fs.rm(root, { recursive: true });
  });
  const run = () => {
    pending = runPythonReference({ manifest, capabilities, workspaceRoot: root, lifetime,
      commonIdentity: workspace.commonIdentity }, { spawn: (executable) => {
        assert.equal(executable, workspace.commonIdentity.environment.python.runtime.invocationPath);
        spawned.resolve();
        return child;
      } });
    pending.catch(() => {});
    return pending;
  };
  return { run, spawned, registered, entry, release, child, controller, calls, outputs, lifetime, native, manifest,
    ackRelease, nativeAck, originalEnd, deadline: budget.deadlineMonoMs,
    expire: () => {
      operationNow = originalEnd;
      assert.throws(() => budget.assertLive("expired original command"));
    } };

}

test("interpreter ENTRY precedes strict Python root proof and GO follows actual ACK", async (t) => {
  const f = await prepare(t);
  const pending = f.run();
  await f.spawned.promise;
  assert.equal(f.calls.registrations, 0, "no Native proof while image is still launcher");
  assert.equal(f.calls.go, 0);
  f.entry();
  const report = await pending;
  assert.equal(report.passed, true);
  assert.equal(f.calls.registrations, 1);
  assert.equal(f.calls.go, 1);
  assert.equal(f.calls.operations, 1);
  assert.deepEqual(JSON.parse(f.outputs[0].bytes), { runId: f.manifest.runId, passed: true });
  assert.equal(f.outputs[1].bytes.length, 0);
  await f.native.monitor.stopAndReap();
  await f.lifetime.whenSettled();
});

test("wrong image after ENTRY still fails the genuine strict Python root proof", async (t) => {
  const f = await prepare(t, { wrongImage: true });
  const pending = f.run();
  await f.spawned.promise;
  assert.equal(f.calls.registrations, 0);
  f.entry();
  await assert.rejects(pending, (error) => error.code === "ACCOUNTING_UNAVAILABLE" && /root executable/.test(error.message));
  assert.equal(f.calls.registrations, 1);
  assert.equal(f.calls.go, 0);
  assert.equal(f.calls.eof, 1);
});

for (const mode of ["missing", "invalid", "wrong-pid", "wrong-run", "wrong-manifest", "extra", "duplicate-key", "bad-utf8", "oversize", "extra-bytes", "coalesced-duplicate", "partial-EOF"]) {
  test(`entry ${mode} cannot authorize root registration or GO`, async (t) => {
    const f = await prepare(t);
    const pending = f.run();
    await f.spawned.promise;
    assert.equal(f.calls.registrations, 0);
    const valid = { type: "reference-entry", runId: f.manifest.runId, pid: f.child.pid,
      manifestSha256: sha256Bytes(canonicalBytes(f.manifest)) };
    switch (mode) {
      case "missing": f.release(); break;
      case "invalid": f.entry({ ...valid, type: "ready" }); break;
      case "wrong-pid": f.entry({ ...valid, pid: f.child.pid + 1 }); break;
      case "wrong-run": f.entry({ ...valid, runId: "other-run" }); break;
      case "wrong-manifest": f.entry({ ...valid, manifestSha256: "0".repeat(64) }); break;
      case "extra": f.entry({ ...valid, proof: true }); break;
      case "duplicate-key": f.entry(Buffer.from('{"type":"x","type":"reference-entry"}\n')); break;
      case "bad-utf8": f.entry(Buffer.from([255, 10])); break;
      case "oversize": f.entry(Buffer.alloc(4097, 120)); break;
      case "extra-bytes": f.entry(Buffer.concat([canonicalBytes(valid), Buffer.from("extra")])); break;
      case "coalesced-duplicate": f.entry(Buffer.concat([canonicalBytes(valid), canonicalBytes(valid)])); break;
      case "partial-EOF":
        f.entry(Buffer.from('{"type":'));
        f.child.stdio[3].emit("end");
        break;
    }
    await assert.rejects(pending);
    assert.equal(f.calls.registrations, 0);
    assert.equal(f.calls.go, 0);
  });
}

test("duplicate ENTRY while real roots ACK is pending cannot authorize GO", async (t) => {
  const f = await prepare(t, { holdAck: true });
  const pending = f.run();
  await f.spawned.promise;
  f.entry();
  await f.registered.promise;
  assert.equal(f.calls.go, 0);
  f.entry();
  f.ackRelease.resolve();
  await assert.rejects(pending, /duplicate interpreter entry/);
  assert.equal(f.calls.go, 0);
});

for (const expired of [false, true]) {
  test(`${expired ? "original command expiry" : "STOP"} before ENTRY retains physical debt and never admits late ENTRY`, async (t) => {
    const f = await prepare(t);
    const pending = f.run();
    await f.spawned.promise;
    const originalEnd = f.deadline();
    if (expired) f.expire();
    else f.controller.abort(Object.freeze(new Error("actual STOP")));
    f.entry(); // Late genuine-looking DATA cannot authorize anything.
    assert.equal(f.calls.registrations, 0);
    assert.equal(f.calls.go, 0);
    assert.equal(f.calls.eof, 0, "no late EOF write after STOP");
    assert.equal(f.deadline(), originalEnd);
    f.child.emit("exit", 2, null);
    f.child.stdout.emit("close");
    f.child.stderr.emit("close");
    // The allocated gate is still physically open, so even the child body's
    // public rejection remains held until the actual last stream close.
    let returned = false;
    pending.then(() => { returned = true; }, () => { returned = true; });
    await f.native.monitor.stopAndReap();
    let zero = false;
    const joined = f.lifetime.whenSettled().then(() => { zero = true; });
    assert.equal(returned, false);
    assert.equal(zero, false, "actual open gate remains debt after genuine Native stop");
    f.child.stdio[3].emit("close");
    await assert.rejects(pending, (error) => error === f.controller.signal.reason);
    await joined;
    assert.equal(f.calls.operations, 1, "late entry starts no renewed command90");
  });
}

test("fragmented ENTRY is exactly one DATA frame and leaves stdout JSON untouched", async (t) => {
  const f = await prepare(t);
  const pending = f.run();
  await f.spawned.promise;
  const frame = canonicalBytes({ type: "reference-entry", runId: f.manifest.runId, pid: f.child.pid,
    manifestSha256: sha256Bytes(canonicalBytes(f.manifest)) });
  f.entry(frame.subarray(0, 17));
  assert.equal(f.calls.registrations, 0);
  f.entry(frame.subarray(17, frame.length - 1));
  assert.equal(f.calls.registrations, 0);
  f.entry(frame.subarray(frame.length - 1));
  await pending;
  assert.equal(f.calls.registrations, 1);
  assert.equal(f.calls.go, 1);
  assert.deepEqual(f.outputs[0].bytes, canonicalBytes({ runId: f.manifest.runId, passed: true }));
});

test("genuine lifetime registrar STOP before issue admits no child and retires no-resource receipt", async (t) => {
  const root = await phaseFs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ref-reentry-")));
  await fs.mkdir(path.join(root, "parity"));
  const controller = new AbortController();
  const primary = false;
  let armed = false;
  let stopped = false;
  let spawns = 0;
  let releases = 0;
  const lifetime = createWatchdogLifetime({ createHold: () => {
    if (armed && !stopped) {
      stopped = true;
      controller.abort(primary);
    }
    return () => { releases += 1; };
  } });
  const realpath = phaseFs.realpath;
  phaseFs.realpath = async function (...args) {
    const result = await Reflect.apply(realpath, this, args);
    if (args[0] === path.join(root, "parity/tmp")) armed = true;
    return result;
  };
  const workspace = fixtureWorkspace();
  const manifest = fixtureManifest({ workspace, phase: "parity", prerequisites: [{ phase: "check",
    runId: "check", completion: { path: "check/completion.json", byteLength: 1, sha256: "a".repeat(64) } }] });
  let pending;
  t.after(async () => {
    if (pending) await pending.catch(() => {});
    await lifetime.whenSettled();
    phaseFs.realpath = realpath;
    await fs.rm(root, { recursive: true });
  });
  const capabilities = { manifest, signal: controller.signal,
    operation: async (kind, id, work) => work({ remainingMs: 90000 }),
    register: async () => { throw new Error("registration forbidden"); },
    artifact: async () => { throw new Error("artifact forbidden"); } };
  pending = runPythonReference({ manifest, capabilities, workspaceRoot: root, lifetime,
    commonIdentity: workspace.commonIdentity }, { spawn: () => {
      spawns += 1;
      const child = new EventEmitter();
      child.pid = 4242;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdio = [null, child.stdout, child.stderr, new EventEmitter()];
      queueMicrotask(() => {
        child.emit("exit", 2, null);
        child.stdout.emit("close");
        child.stderr.emit("close");
        child.stdio[3].emit("close");
      });
      return child;
    } });
  await assert.rejects(pending, (error) => error === primary);
  assert.equal(stopped, true, "genuine retainActual/createHold callout caused STOP");
  assert.equal(spawns, 0);
  await lifetime.whenSettled();
  assert.ok(releases > 0, "all real FS/no-resource receipts actually retired");
});

for (const mode of ["duplicate", "STOP-false", "STOP-null", "pipe-undefined"]) {
  test(`first ENTRY/STOP failure survives later ACK rejection: ${mode}`, async (t) => {
    const f = await prepare(t, { holdAck: true });
    const pending = f.run();
    await f.spawned.promise;
    f.entry();
    await f.nativeAck.promise;
    const primary = mode === "STOP-false" ? false : mode === "STOP-null" ? null : undefined;
    if (mode === "duplicate") f.entry();
    else if (mode === "pipe-undefined") f.child.stdio[3].emit("error", undefined);
    else f.controller.abort(primary);
    const secondary = Object.freeze(new Error("later actual registration ACK rejection"));
    f.ackRelease.reject(secondary);
    f.release();
    await assert.rejects(pending, (error) => mode === "duplicate"
      ? error !== secondary && /duplicate interpreter entry/.test(error.message) : error === primary);
    assert.equal(f.calls.go, 0);
    await f.native.monitor.stopAndReap();
    await f.lifetime.whenSettled();
  });
}
