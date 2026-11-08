// PURE regression owners for actual negative cleanup and diagnostic outcomes.
import test from "node:test";
import assert from "node:assert/strict";
import cp from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";
import { attributionVerdict, createAttributionObserver } from "./native-attribution-observer.mjs";
import { createNativeTestHarness } from "./native-test-fixtures.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { fixture, drive, args, OBS } from "./watchdog-cleanup-test-fixtures.mjs";
import {
  createMonitorFixture,
  monitorBootstrapScript,
  startMonitorFixture,
} from "./process-monitor-test-fixtures.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
const healthy = () => ({
  primary: null,
  cleanupProof: { verified: true, accountingValid: true },
  monitorFault: null,
  snapshot: { errors: [], bytes: { overflow: false } },
  diagnostics: { failed: false, lateEffects: 0, pendingCalls: 0 },
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test("genuine settled negative cleanup and successful cached stop cannot yield success", async () => {
  const f = fixture([], {
    observation: OBS,
    queryError: new Error("genuine listener capability failed"),
    stopResult: { exitCode: 0 },
  });
  const original = f.monitor.stopAndReap;
  let cached;
  f.monitor.stopAndReap = (options) => (cached ??= original(options));
  try {
    const proof = await drive(f.clk, f.cc.run(args(f.clk)));
    assert.equal(proof.verified, false);
    assert.equal(proof.accountingValid, false);
    assert.equal((await cached).exitCode, 0);
    assert.equal(
      f.monitor.stopAndReap({ deadlineMonoMs: f.clk.nowMonoMs() + 1, failureContainment: true }),
      cached,
    );
    assert.equal(f.calls.filter((x) => x === "stopAndReap").length, 1);
    assert.equal(attributionVerdict({ ...healthy(), cleanupProof: proof }).exitCode, 1);
  } finally {
    await f.lifetime.whenSettled();
  }
});

test("final genuine sticky monitor fault rejects otherwise clean final facts", async () => {
  const f = createMonitorFixture({ script: monitorBootstrapScript() });
  const bound = f.clock.nowMs() + 30000;
  try {
    await startMonitorFixture(f);
    f.fixture.emit({
      type: "accounting-fault",
      code: "ACCOUNTING_UNAVAILABLE",
      reason: "unstable-list",
      diagnostic: "controlled sticky",
    });
    await turn();
    const fault = f.monitor.fault();
    assert.ok(fault);
    const verdict = attributionVerdict({ ...healthy(), monitorFault: fault });
    assert.equal(verdict.exitCode, 1);
    assert.equal(verdict.failures[0].cause, fault, "keep exact retained diagnostic fact");
  } finally {
    f.fixture.exit(2);
    await f.monitor.stopAndReap({ deadlineMonoMs: bound });
    await processMonitorLifetime(f.monitor).whenSettled();
    f.cleanup();
  }
});

test("genuine seam snapshot errors fail even when observer flag/overflow remain clear", async () => {
  const owner = createWatchdogLifetime(),
    c = Object.assign(new EventEmitter(), {
      pid: 4242,
      stdin: new EventEmitter(),
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });
  Object.defineProperty(c.stdin, "write", { value: () => true, configurable: false });
  const observer = createAttributionObserver({ nowNs: () => process.hrtime.bigint().toString() });
  const h = createNativeTestHarness({
    runId: "unit",
    recordRoot: "/unit/root",
    pythonExecutable: "/unit/python",
    helperPath: "/unit/helper.py",
    fixtureEntry: "/unit/fixture.mjs",
    evidenceRoot: "/unit/evidence",
    lifetime: owner,
    observeChild: observer.observeChild,
  });
  h.createMonitor({ runId: "unit" });
  const original = cp.spawn;
  cp.spawn = () => c;
  syncBuiltinESMExports();
  const close = () => {
    c.emit("exit", 0, null);
    c.stdout.emit("close");
    c.stderr.emit("close");
  };
  try {
    const returned = h.spawnImpl(
      "/unit/python",
      [
        "-I",
        "-B",
        "/unit/helper.py",
        "--collector",
        "--run-id",
        "unit",
        "--supervisor-pid",
        String(process.pid),
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    assert.equal(returned, c);
    const snapshot = h.snapshot();
    assert.equal(snapshot.bytes.overflow, false);
    assert.equal(snapshot.errors.length, 1);
    assert.equal(snapshot.errors[0].where, "child observer");
    assert.equal(observer.result().failed, false);
    const verdict = attributionVerdict({ ...healthy(), snapshot, diagnostics: observer.result() });
    assert.equal(verdict.exitCode, 1);
    assert.equal(verdict.failures[0].cause, snapshot.errors[0]);
  } finally {
    close();
    await h.finish();
    await owner.whenSettled();
    cp.spawn = original;
    syncBuiltinESMExports();
  }
});

test("held rejected original Promise retains settlement duration/max and pending crossing", async () => {
  const rows = [],
    gate = deferred(),
    physical = deferred(),
    readings = [100n, 150n, 650n];
  const observer = createAttributionObserver({ nowNs: () => String(readings.shift() ?? 900n) });
  observer.observeChild(
    {},
    {
      kind: "fixture",
      physicalSettlement: physical.promise,
      retainDiagnostic: (kind, value) => {
        rows.push({ kind, value });
        return true;
      },
    },
  );
  const original = () => gate.promise,
    fs = { stat: original },
    first = Object.freeze(new Error("raw rejection"));
  observer.instrumentFs(fs);
  const pending = fs.stat();
  assert.equal(pending, gate.promise);
  observer.flush("held", 200n);
  assert.equal(rows[0].value.pending[0].returnNs, "150");
  try {
    gate.reject(first);
    await assert.rejects(pending, (error) => error === first);
    observer.flush("rejected", 700n);
    const bin = rows.at(-1).value.bins[0];
    assert.equal(bin.settled, 1);
    assert.equal(bin.rejected, 1);
    assert.equal(bin.dispatchNs, "500");
    assert.deepEqual(bin.maximumDispatch, {
      startNs: "100",
      returnNs: "150",
      settledNs: "650",
      durationNs: "500",
    });
    assert.deepEqual(rows.at(-1).value.pending, []);
    assert.equal(observer.result().failed, false);
  } finally {
    gate.reject(first);
    await pending.catch(() => {});
    physical.resolve();
    await observer.restoreAfter(physical.promise);
    assert.equal(fs.stat, original);
  }
});

test("clean actual-shaped facts pass and a prior primary remains failed", () => {
  assert.equal(attributionVerdict(healthy()).exitCode, 0);
  const primary = Object.freeze({ same: "original first" });
  assert.equal(attributionVerdict({ ...healthy(), primary }).exitCode, 1);
});

import { attributionHarnessOptions } from "./native-attribution-observer.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import { isAbs } from "./protocol-values.mjs";

test("real control-module URL shares actual constructor options and strict path contract", async () => {
  const owner = createWatchdogLifetime();
  let calls = 0,
    h = null;
  const options = attributionHarnessOptions({
    controlUrl: new URL(
      "../../../.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/accounting-attribution-control.mjs",
      import.meta.url,
    ),
    runId: "unit",
    pythonExecutable: PYTHON_EXECUTABLE,
    evidenceRoot: "/unit/evidence",
    lifetime: owner,
    observeChild: () => {
      calls++;
    },
  });
  try {
    h = createNativeTestHarness(options);
    for (const key of [
      "recordRoot",
      "pythonExecutable",
      "helperPath",
      "fixtureEntry",
      "evidenceRoot",
    ]) {
      assert.equal(isAbs(options[key]), true, key);
    }
    assert.equal(Object.isFrozen(h), true);
    assert.equal(Object.keys(h).length, 12);
    assert.equal(calls, 0);
    assert.deepEqual(h.snapshot().handles, []);
    assert.throws(
      () => createNativeTestHarness({ ...options, recordRoot: options.recordRoot + "/" }),
      /native-harness options/,
    );
    assert.equal(h.bounds.deadlineMonoMs - h.bounds.startedMonoMs, 60000);
    assert.equal(h.bounds.workEndMonoMs - h.bounds.startedMonoMs, 55000);
  } finally {
    if (h !== null) await h.finish();
    await owner.whenSettled();
  }
});
