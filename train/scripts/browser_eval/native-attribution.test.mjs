// PURE diagnostic controls. All child events are fake; no Native/OS spawn.
import test from "node:test";
import assert from "node:assert/strict";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter } from "node:events";
import { createNativeFixtureIO } from "./native-fixture-io.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
const child = () =>
  Object.assign(new EventEmitter(), {
    pid: 4242,
    stdin: new EventEmitter(),
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });
const fixture = (observeChild) => {
  const lifetime = createWatchdogLifetime();
  const clock = fakeClock();
  const mrec = { collectorRec: null };
  const state = { children: [], monitors: new Map([["unit", mrec]]), errors: [], overflow: false };
  const io = createNativeFixtureIO({
    inputs: {
      pythonExecutable: "/unit/python",
      helperPath: "/unit/helper.py",
      lifetime,
      observeChild,
    },
    state,
    bounds: { deadlineMonoMs: 10000 },
    clock: { nowMonoMs: clock.nowMs, nowMonoNs: clock.nowMonoNs },
    constants: { DIRECT_MODES: new Set(), FIXTURE_BOUND_MS: 10000 },
    observe: {
      fail: (detail) => new Error(detail),
      isObj: (v) => v !== null && typeof v === "object",
      room: () => {},
      retainEntry: () => {},
      recordError: (where, value) => state.errors.push({ where, value }),
    },
    getAdmission: () => ({ guardedText: String, guardedError: (value) => ({ value }) }),
  });
  return { io, state, lifetime };
};
const issue = (io) =>
  io.spawnImpl(
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
const close = (c) => {
  c.emit("exit", 0, null);
  c.stdout.emit("close");
  c.stderr.emit("close");
};

for (const observerFault of [false, true]) {
  test(`observer follows genuine adoption and cannot release or orphan child: fault=${observerFault}`, async () => {
    const c = child(),
      first = Object.freeze({ original: "observer failure" });
    let calls = 0,
      meta;
    const f = fixture((actual, captured) => {
      calls++;
      meta = captured;
      assert.equal(actual, c);
      assert.equal(f.state.children.length, 1);
      assert.ok(c.listenerCount("exit") > 0 && c.stdout.listenerCount("close") > 0);
      if (observerFault) throw first;
    });
    const original = cp.spawn;
    cp.spawn = () => c;
    syncBuiltinESMExports();
    try {
      assert.equal(issue(f.io), c);
      assert.equal(calls, 1);
      assert.equal(Object.isFrozen(meta), true);
      assert.equal(meta.physicalSettlement, f.state.children[0].receipt.promise);
      assert.equal(meta.kind, "collector");
      assert.equal(f.state.errors.length, observerFault ? 1 : 0);
      if (observerFault) assert.equal(f.state.errors[0].value, first);
      let settled = false;
      const joined = f.lifetime.whenSettled().then(() => {
        settled = true;
      });
      c.emit("exit", 0, null);
      c.stdout.emit("close");
      await turn();
      assert.equal(settled, false, "exit plus one pipe does not retire actual debt");
      c.stderr.emit("close");
      await joined;
      assert.equal(settled, true);
    } finally {
      close(c);
      await f.lifetime.whenSettled();
      cp.spawn = original;
      syncBuiltinESMExports();
    }
  });
}

// Shared test instrumentation is imported only by PURE test/control owners.
import {
  createAttributionObserver,
  requireFullNativeWindow,
} from "./native-attribution-observer.mjs";
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const observer = (retainDiagnostic = () => true, write = null) => {
  let time = 100n;
  const o = createAttributionObserver({ nowNs: () => String(time++) });
  const c = child(),
    physical = deferred();
  c.stdin.write =
    write ??
    function (...args) {
      this.last = args;
      return false;
    };
  o.observeChild(c, {
    kind: "collector",
    monitorRunId: "unit",
    queryId: null,
    physicalSettlement: physical.promise,
    retainDiagnostic,
  });
  return { o, c, physical };
};

test("original receiver, args, false backpressure, arbitrary throw and listener identity survive", async () => {
  const rows = [];
  const f = observer((kind, value, at) => {
    rows.push({ kind, value, at });
    return true;
  });
  const callback = () => {};
  const bytes = Buffer.from("actual");
  assert.equal(f.c.stdin.write(bytes, callback), false);
  assert.deepEqual(f.c.stdin.last, [bytes, callback]);
  const listeners = [];
  const first = () => listeners.push("first"),
    second = () => listeners.push("second");
  f.c.stdout.on("data", first);
  f.c.stdout.on("data", second);
  assert.deepEqual(f.c.stdout.listeners("data"), [first, second]);
  f.c.stdout.off("data", first);
  f.c.stdout.emit("data", bytes);
  assert.deepEqual(listeners, ["second"]);
  assert.equal(
    rows.some((r) => r.kind === "attribution:write-enter"),
    true,
  );
  assert.equal(rows.find((r) => r.kind === "attribution:write-return").value.accepted, false);
  assert.equal(
    rows.some((r) => r.kind === "attribution:stdout-dispatch"),
    true,
  );
  const raw = f.c.stdin.write;
  f.physical.resolve();
  await f.physical.promise;
  await turn();
  assert.notEqual(f.c.stdin.write, raw, "only actual physical receipt restores wrapper");
});

test("FS return is distinct from original Promise settlement, pending crossing remains diagnostic", async () => {
  const rows = [];
  const f = observer((kind, value) => {
    rows.push({ kind, value });
    return true;
  });
  const gate = deferred(),
    original = function (...args) {
      assert.equal(this, fs);
      assert.deepEqual(args, ["x"]);
      return gate.promise;
    };
  const fs = { stat: original };
  f.o.instrumentFs(fs);
  const p = fs.stat("x");
  assert.equal(p, gate.promise);
  f.o.flush("held");
  let row = rows.find((r) => r.kind === "attribution:fs").value;
  assert.equal(row.pending.length, 1);
  assert.ok(row.pending[0].returnNs);
  assert.equal(row.bins[0].settled, 0);
  assert.equal(f.o.result().pendingCalls, 1);
  const restore = f.o.restoreAfter(gate.promise);
  assert.notEqual(fs.stat, original);
  gate.resolve("same");
  assert.equal(await p, "same");
  await restore;
  assert.equal(fs.stat, original);
  assert.equal(f.o.result().pendingCalls, 0);
  row = rows.filter((r) => r.kind === "attribution:fs").at(-1).value;
  assert.ok(row.bins[0].maximumDispatch.settledNs);
  f.physical.resolve();
  await turn();
});

for (const first of [null, undefined, false, Object.freeze({ first: true })]) {
  test(`original arbitrary FS throw survives failed diagnostic: ${String(first)}`, async () => {
    const f = observer(() => {
      throw new Error("observer/accountant failure");
    });
    const fs = {
      read: () => {
        throw first;
      },
    };
    f.o.instrumentFs(fs);
    let actual = "missing";
    try {
      fs.read();
    } catch (e) {
      actual = e;
    }
    assert.equal(actual, first);
    f.o.flush("error");
    assert.equal(f.o.result().failed, true);
    f.physical.resolve();
    await f.o.restoreAfter(f.physical.promise);
  });
}

test("original rejected Promise is unchanged when diagnostic accountant overflows", async () => {
  const f = observer(() => false),
    first = new Error("raw rejection"),
    gate = deferred();
  const fs = { open: () => gate.promise };
  f.o.instrumentFs(fs);
  const original = fs.open();
  assert.equal(original, gate.promise);
  f.o.flush("overflow");
  assert.equal(f.o.result().failed, true);
  gate.reject(first);
  await assert.rejects(original, (e) => e === first);
  f.physical.resolve();
  await f.o.restoreAfter(f.physical.promise);
});

test("pure original90/60 admission has no tolerance or replacement window", () => {
  requireFullNativeWindow(90000, 30000);
  assert.throws(() => requireFullNativeWindow(90000, 30001));
  for (const pair of [
    [NaN, 0],
    [90000, Infinity],
    [90000, 90000],
  ])
    assert.throws(() => requireFullNativeWindow(...pair));
});

import { createNativeTestHarness } from "./native-test-fixtures.mjs";
const harness = (observeChild, lifetime) =>
  createNativeTestHarness({
    runId: "unit",
    recordRoot: "/unit/root",
    pythonExecutable: "/unit/python",
    helperPath: "/unit/helper.py",
    fixtureEntry: "/unit/fixture.mjs",
    evidenceRoot: "/unit/evidence",
    lifetime,
    observeChild,
  });

test("constructor validation has no observer callout and keeps exact frozen12 facade", async () => {
  const owner = createWatchdogLifetime();
  let calls = 0;
  assert.throws(() => harness(5, owner), /child observer/);
  const h = harness(() => {
    calls++;
  }, owner);
  assert.equal(calls, 0);
  assert.equal(Object.isFrozen(h), true);
  assert.equal(Object.keys(h).length, 12);
  assert.equal(h.bounds.deadlineMonoMs - h.bounds.startedMonoMs, 60000);
  assert.equal(h.bounds.workEndMonoMs - h.bounds.startedMonoMs, 55000);
  await h.finish();
  await owner.whenSettled();
});

test("shared original4MiB counter overflow cannot suppress original writes or orphan adopted child", async () => {
  const owner = createWatchdogLifetime(),
    c = child();
  c.stdin.write = () => false;
  const o = createAttributionObserver({ nowNs: () => process.hrtime.bigint().toString() });
  const h = harness(o.observeChild, owner),
    lane = h.createMonitor({ runId: "unit" });
  assert.ok(lane.monitor);
  const original = cp.spawn;
  cp.spawn = () => c;
  syncBuiltinESMExports();
  try {
    assert.equal(issue(h), c);
    c.stdout.emit("data", Buffer.alloc(4 * 1024 * 1024));
    assert.equal(c.stdin.write(Buffer.from("{}\n")), false);
    assert.equal(h.snapshot().bytes.overflow, true);
    assert.equal(o.result().failed, true);
    let zero = false;
    const joining = owner.whenSettled().then(() => {
      zero = true;
    });
    await turn();
    assert.equal(zero, false);
    close(c);
    await joining;
    await h.finish();
  } finally {
    close(c);
    await owner.whenSettled();
    cp.spawn = original;
    syncBuiltinESMExports();
  }
});

test("late-effect diagnostics never reject original operation; mandatory closes stay distinct", async () => {
  const physical = deferred();
  let at = 1000000n;
  const o = createAttributionObserver({ nowNs: () => String(at++), workEndMonoMs: 1 });
  const c = child();
  c.stdin.write = () => true;
  o.observeChild(c, {
    kind: "collector",
    physicalSettlement: physical.promise,
    retainDiagnostic: () => true,
  });
  const raw = {
    stat: () => Promise.resolve("same"),
    read: () => Promise.resolve(),
    write: () => Promise.resolve(),
    sync: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  const fs = { open: () => Promise.resolve(raw) };
  o.instrumentFs(fs);
  assert.equal(await fs.open(), raw);
  const before = o.result().lateEffects;
  await raw.close();
  assert.equal(o.result().lateEffects, before);
  assert.equal(await raw.stat(), "same");
  assert.equal(o.result().lateEffects, before + 1);
  assert.ok(o.result().firstLate.atMonoNs);
  physical.resolve();
  await o.restoreAfter(physical.promise);
});

test("original stdin and listener throws survive failed observer without callback replacement", async () => {
  for (const first of [null, undefined, false, Object.freeze({ same: true })]) {
    const f = observer(
      () => {
        throw new Error("diagnostic only");
      },
      function () {
        throw first;
      },
    );
    let caught = "missing";
    try {
      f.c.stdin.write(Buffer.from("{}\n"));
    } catch (error) {
      caught = error;
    }
    assert.equal(caught, first);
    const listener = () => {
      throw first;
    };
    f.c.stdout.on("data", listener);
    caught = "missing";
    try {
      f.c.stdout.emit("data", Buffer.from("x"));
    } catch (error) {
      caught = error;
    }
    assert.equal(caught, first);
    assert.equal(f.c.stdout.listeners("data")[0], listener);
    f.c.stdout.off("data", listener);
    assert.equal(f.c.stdout.listenerCount("data"), 0);
    f.physical.resolve();
    await f.physical.promise;
    await turn();
  }
});
