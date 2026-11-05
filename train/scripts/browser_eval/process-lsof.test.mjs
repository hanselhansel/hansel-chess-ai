// process-lsof.test.mjs: the gated wrapper lifecycle with the REAL
// protocol validator against injected spawn/registration/transition
// seams. The gate registers and proves before any authorization,
// writes the exec frame on fd-3, and settles only on real exit plus
// both pipe closes. Parser-only cases moved whole to
// process-lsof-fields.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";

import { createLsofQueries } from "./process-lsof.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import {
  fakeChild,
  fakeClock,
  fakeFailedSpawnChild,
  identity,
} from "./supervision-test-fixtures.mjs";
import {
  createLsofGateFixture as makeGate,
  finishLsofFixture as finish,
  lsofFixtureOut as out,
} from "./process-lsof-test-fixtures.mjs";

const lsofErr = (p) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => assert.equal(e.code, "LSOF_UNAVAILABLE"),
  );
const flush = () => new Promise((r) => setImmediate(r));
const held = (r) => {
  let s = false;
  r.then(() => (s = true));
  return () => s;
};

test("the gate registers and proves before one authorized seq-0 exec frame", async () => {
  const spawned = [];
  const { order, children, lq } = makeGate({ spawned });
  const p = lq.queryPort(9222, { remainingMs: 30000 });
  await flush();
  const { file, args, opts, child } = spawned[0];
  assert.equal(file, "/py");
  assert.deepEqual(args.slice(0, 4), ["-I", "-B", "/h.py", "--exec-gated"]);
  assert.deepEqual(opts.stdio, ["ignore", "pipe", "pipe", "pipe"]);
  // Spawn precedes registration, registration precedes the frame.
  assert.deepEqual(order, ["spawn", "register 5000", "transition"]);
  const frameMsg = JSON.parse(child.fd3.writes[0].toString().trim());
  assert.equal(frameMsg.seq, 0);
  assert.equal(frameMsg.type, "exec");
  assert.match(frameMsg.requestId, /^lq-R1-/);
  assert.equal(frameMsg.runId, "R1");
  assert.deepEqual(frameMsg.identity, identity(5000));
  assert.deepEqual(frameMsg.query, { kind: "port", port: 9222 });
  finish(child, "p4242\0f13\0n127.0.0.1:9222\0");
  const res = await p;
  assert.deepEqual(res.rows, [
    { address: "127.0.0.1", port: 9222, pid: 4242 },
  ]);
  const g = lq._lastGate();
  assert.equal(g.transition, "live-transition");
  assert.equal(g.reaped, true);
  assert.equal(g.exitCode, 0);
  // A settled wrapper is never signalled.
  assert.ok(!order.includes("signal KILL"));
});

test("registration before spawn never happens; the receipt precedes spawn", async () => {
  const spawned = [];
  const { clock, order, lq, mk } = makeGate({ spawned });
  const receipts = [];
  const p = lq.queryPort(9, {
    budget: mk(),
    retainActual: (r) => {
      order.push("receipt");
      receipts.push(r);
    },
  });
  await flush();
  // The deferred physical receipt registered BEFORE the actual spawn.
  assert.ok(order.indexOf("receipt") < order.indexOf("spawn"));
  assert.equal(receipts.length, 1);
  finish(spawned[0].child, "p1\0f3\0n127.0.0.1:9\0");
  await p;
});

test("a spent budget performs no resolution, spawn or registration", async () => {
  const spawned = [];
  const { clock, order, lq, mk } = makeGate({ spawned });
  const h = mk(5);
  clock.advance(10);
  await assert.rejects(
    lq.queryPort(9, { budget: h, retainActual: () => {} }),
    /ACCOUNTING_UNAVAILABLE/,
  );
  assert.equal(spawned.length, 0);
  assert.deepEqual(order, []);
  // An expiry BETWEEN receipt registration and the second live
  // guard: the registrar records the real receipt while the handle
  // is still LIVE, then jumps the same fake clock without firing
  // timers — the second pre-spawn check is the honest failure.
  const spawned2 = [];
  const env = makeGate({ spawned: spawned2 });
  const receipts = [];
  const h2 = env.mk(5);
  let disposed = false;
  const origDispose = h2.dispose;
  h2.dispose = () => {
    disposed = true;
    return origDispose();
  };
  const q = env.lq.queryPort(9, {
    budget: h2,
    retainActual: (r) => {
      receipts.push(r); // receipt registered while still live
      env.clock.jumpWithoutTimers(10); // expiry lands before respawn
    },
  });
  await assert.rejects(q, /ACCOUNTING_UNAVAILABLE/);
  assert.equal(spawned2.length, 0);
  assert.equal(receipts.length, 1);
  const settled = held(receipts[0]);
  await flush();
  assert.equal(settled(), true);
  // The borrowed handle was never disposed — only its work failed.
  assert.equal(disposed, false);
});

test("a borrowed budget without the registrar rejects before launch", async () => {
  const spawned = [];
  const { lq, mk } = makeGate({ spawned });
  await lsofErr(lq.queryPort(9, { budget: mk() }));
  assert.equal(spawned.length, 0);
});

test("a legal fast post-ack exit still parses its real output", async () => {
  const spawned = [];
  const { lq } = makeGate({ spawned, script: { transitions: ["gone"] } });
  const p = lq.queryPort(9, { remainingMs: 30000 });
  await flush();
  finish(spawned[0].child, "p7\0f3\0n127.0.0.1:9\0", 0);
  const res = await p;
  assert.equal(res.rows[0].pid, 7);
});

test("pre-transition waits on the same handle until the real image appears", async () => {
  const spawned = [];
  const { clock, order, lq, mk } = makeGate({
    spawned,
    script: { transitions: ["pre-transition", "live-transition"] },
  });
  const p = lq.queryPort(9, { budget: mk(), retainActual: () => {} });
  await flush();
  assert.deepEqual(order.filter((o) => o === "transition"), ["transition"]);
  clock.advance(2); // the bounded recheck sleep on the SAME handle
  await flush();
  finish(spawned[0].child, "p7\0f3\0n127.0.0.1:9\0");
  const res = await p;
  assert.equal(res.rows[0].pid, 7);
  assert.equal(order.filter((o) => o === "transition").length, 2);
});

test("a stuck pre-transition exhausts the bound and signals only via ownership", async () => {
  const spawned = [];
  const { clock, order, lq, mk } = makeGate({
    spawned,
    script: { alwaysPre: true },
  });
  const h = mk(10);
  const receipts = [];
  const p = lq.queryPort(9, {
    budget: h,
    retainActual: (r) => receipts.push(r),
  });
  // Rejection observation is attached BEFORE the clock advances past
  // the original bound, so the public failure can never land unhandled.
  const observed = lsofErr(p);
  await flush();
  assert.equal(receipts.length, 1);
  clock.advance(10);
  await flush();
  // The transition-deadline public failure arrived, yet the physical
  // receipt still holds real debt: no exit, closes or issued-write
  // outcome completed settlement.
  await observed;
  const settled = held(receipts[0]);
  await flush();
  assert.equal(settled(), false);
  // The registered wrapper is signalled through the borrowed same-tuple
  // authority, never a raw kill; then the real exit facts arrive and
  // only their actual settlement releases the held receipt.
  const child = spawned[0].child;
  finish(child);
  await flush();
  assert.equal(settled(), true);
  assert.ok(order.includes("signal KILL"));
  const g = lq._lastGate();
  // The gate completed BEFORE the real exit facts arrived, so its
  // final snapshot truthfully reports the still-unproven state; the
  // separately held receipt is what later proved the real settlement.
  assert.equal(g.reaped, false);
});

test("a returned failed-spawn child keeps unproven debt — no invented exit", async () => {
  const clock = fakeClock();
  const receipts = [];
  const seenPids = [];
  const signals = [];
  let child;
  const bad = createLsofQueries({
    registerHelper: async (input) => {
      // The missing PID reaches the borrowed proof seam truthfully —
      // the genuine seam rejects rather than inventing identity(1)
      // for a failed spawn.
      seenPids.push(input.pid);
      if (input.pid === null || input.pid === undefined) {
        const e = new Error("helper pid");
        e.code = "ACCOUNTING_UNAVAILABLE";
        throw e;
      }
      return { identity: identity(input.pid) };
    },
    signalHelper: async (input) => {
      signals.push(input.signal);
      return { outcome: "sent" };
    },
    proveTransition: async () => "live-transition",
    protocol: createProtocolValidator({ runId: "R1" }),
    runId: "R1",
    pythonExecutable: "/py",
    helperPath: "/h.py",
    clock,
    spawnImpl: () => {
      child = fakeFailedSpawnChild();
      return child;
    },
    resolvePath: (p) => p,
  });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 30000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const p = bad.queryPort(9, {
    budget: h,
    retainActual: (r) => receipts.push(r),
  });
  const observed = assert.rejects(p);
  await flush();
  // The missing PID reached the registration seam and it rejected: no
  // exec frame, no signal, no invented identity. The real events are
  // an error plus pipe closes — no exit ever arrives, so the deferred
  // physical receipt stays genuinely pending after public rejection.
  assert.deepEqual(seenPids, [null]);
  assert.equal(child.fd3.writes.length, 0);
  assert.equal(signals.length, 0);
  child.fail(new Error("spawn died"));
  await observed;
  const settled = held(receipts[0]);
  await flush();
  assert.equal(settled(), false);
  assert.equal(bad._lastGate().reaped, false);
});

test("an isolated resolvePath failure disposes only the owned handle", async () => {
  const clock = fakeClock();
  const spawned = [];
  const order = [];
  const bad = createLsofQueries({
    registerHelper: async () => ({ identity: identity(1) }),
    signalHelper: async () => ({ outcome: "sent" }),
    proveTransition: async () => "live-transition",
    protocol: createProtocolValidator({ runId: "R1" }),
    runId: "R1",
    pythonExecutable: "/py",
    helperPath: "/h.py",
    clock,
    spawnImpl: (f, a) => {
      order.push("spawn");
      return fakeChild({ pid: 1 });
    },
    resolvePath: () => {
      throw new Error("path vanished");
    },
  });
  // The isolated path (remainingMs, no borrowed budget) creates ONE
  // owned handle whose losing timer is armed; the resolve throw
  // happens before any child or IO debt exists, so the owned handle
  // disposes now — never on a later expiry and never a borrowed one.
  await assert.rejects(
    bad.queryPort(9, { remainingMs: 30000 }),
    /path vanished/,
  );
  assert.equal(spawned.length, 0);
  assert.equal(order.length, 0);
  // The owned losing timer was released by the early dispose, not by
  // the full horizon running out.
  assert.equal(clock.pendingTimeouts(), 0);
});

test("a borrowed handle is never disposed by a pre-child failure", async () => {
  const clock = fakeClock();
  const spawned = [];
  const bad = createLsofQueries({
    registerHelper: async () => ({ identity: identity(1) }),
    signalHelper: async () => ({ outcome: "sent" }),
    proveTransition: async () => "live-transition",
    protocol: createProtocolValidator({ runId: "R1" }),
    runId: "R1",
    pythonExecutable: "/py",
    helperPath: "/h.py",
    clock,
    spawnImpl: () => {
      spawned.push(1);
      return fakeChild({ pid: 1 });
    },
    resolvePath: () => {
      throw new Error("path vanished");
    },
  });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 30000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const timersBefore = clock.pendingTimeouts();
  await assert.rejects(
    bad.queryPort(9, { budget: h, retainActual: () => {} }),
    /path vanished/,
  );
  assert.equal(spawned.length, 0);
  // The borrowed monitor handle stays owned by its caller: its timer
  // is still armed and the handle remains usable/live for the caller.
  assert.equal(clock.pendingTimeouts(), timersBefore);
  h.dispose();
});

test("deduplicated owned pids and query validation reach the exec frame", async () => {
  const spawned = [];
  const { lq } = makeGate({ spawned });
  const p = lq.queryOwnedPids([9, 5, 9], { remainingMs: 30000 });
  await flush();
  const frameMsg = JSON.parse(
    spawned[0].child.fd3.writes[0].toString().trim(),
  );
  assert.deepEqual(frameMsg.query, { kind: "owned-pids", pids: [5, 9] });
  finish(spawned[0].child, "p5\0f3\0n127.0.0.1:9\0");
  await p;
  await lsofErr(lq.queryOwnedPids([], { remainingMs: 30000 }));
});

test("a synchronous spawn failure settles truthfully with no child facts", async () => {
  const { lq } = makeGate({});
  const bad = createLsofQueries({
    registerHelper: async () => ({ identity: identity(1) }),
    signalHelper: async () => ({ outcome: "sent" }),
    proveTransition: async () => "live-transition",
    protocol: createProtocolValidator({ runId: "R1" }),
    runId: "R1",
    pythonExecutable: "/py",
    helperPath: "/h.py",
    spawnImpl: () => {
      throw new Error("spawn refused");
    },
    resolvePath: (p) => p,
  });
  await assert.rejects(
    bad.queryPort(9, { remainingMs: 30000 }),
    /spawn refused/,
  );
  void lq;
});
