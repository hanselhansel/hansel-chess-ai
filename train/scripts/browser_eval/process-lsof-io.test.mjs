// process-lsof-io.test.mjs: the pure createLsofChildIO physical
// lifecycle — physical fulfillment requires exit plus BOTH output
// closes plus the closed fd-3 issuance decision, every issued end's
// real callback/error is accounted before settlement, fd-3 error
// polarity is preserved, and listeners/buffers/the isolated dispose
// release only at the genuine physical+finishFlow boundary. Mixed
// direct-I/O cases over faithful fake ChildProcess/streams plus the
// full-entry deferred-registration/early-exit/delayed-no-frame-end
// case driven through the real validator boundary.
import test from "node:test";
import assert from "node:assert/strict";

import { createLsofChildIO } from "./process-lsof-io.mjs";
import { fakeChild } from "./supervision-test-fixtures.mjs";
import {
  createLsofGateFixture,
  finishLsofFixture,
} from "./process-lsof-test-fixtures.mjs";

const flush = () => new Promise((r) => setImmediate(r));

// One io owner with observable receipt/dispose spies.
const mkIO = () => {
  const receipts = [];
  let disposed = false;
  const io = createLsofChildIO({
    retainActual: (r) => receipts.push(r),
    onPhysicalSettled: () => {
      disposed = true;
    },
  });
  return { io, receipts, disposed: () => disposed };
};
const settle = (r) => {
  let done = false;
  r.then(() => (done = true));
  return () => done;
};
const finishChild = (c) => {
  c.exit(0);
  c.stdout.emitClose();
  c.stderr.emitClose();
};

test("early exit plus both closes cannot fulfill before closeGate's first end", async () => {
  const { io, receipts, disposed } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  // The physical facts arrive while the entry may still issue its
  // FIRST no-frame end — the receipt must stay pending.
  finishChild(child);
  const done = settle(receipts[0]);
  io.done.catch(() => {});
  await flush();
  assert.equal(done(), false);
  assert.equal(child.fd3.ended, false);
  // The entry's late no-frame close issues the tracked end whose own
  // callback outcome then lands — only now does physical settle.
  io.closeGate();
  assert.equal(child.fd3.ended, true);
  await flush();
  assert.equal(done(), true);
  assert.equal(io.snapshot().fd3Done, true);
  // The isolated dispose still waits for finishFlow.
  assert.equal(disposed(), false);
  io.finishFlow();
  await flush();
  assert.equal(disposed(), true);
  assert.equal(child.stdout.listenerCount("data"), 0);
});

test("the issued end's delayed callback is tracked until real settlement", async () => {
  const { io, receipts } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  // Arm a fake whose end callback the test drives later — end
  // invocation alone is never proof.
  let cb;
  child.fd3.end = (chunk, done) => {
    if (typeof chunk === "function") {
      done = chunk;
      chunk = undefined;
    }
    child.fd3.ended = true;
    cb = done;
    return child.fd3;
  };
  io.closeGate();
  finishChild(child);
  const done = settle(receipts[0]);
  io.done.catch(() => {});
  await flush();
  assert.equal(done(), false);
  cb(); // the issued operation's real outcome lands
  await flush();
  assert.equal(done(), true);
});

test("an fd-3 end callback error rejects the write with the original error", async () => {
  const { io } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  const boom = new Error("fd3 broke");
  let ends = 0;
  child.fd3.end = (chunk, cb) => {
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = undefined;
    }
    ends += 1;
    child.fd3.ended = true;
    cb(boom); // callback-before-error-event ordering
    return child.fd3;
  };
  const doneObs = io.done.catch((e) => e);
  const w = io.writeGate(Buffer.from("{}"));
  await assert.rejects(w, (e) => e === boom);
  // The failed write can never advance to transition/parse: done
  // rejects with the SAME original error, and a later authorized frame
  // is refused on the broken gate — no second end is ever issued.
  assert.equal(await doneObs, boom);
  // The original error was already observed above; a SECOND write
  // after permanent closure is refused at the closed decision — it
  // need not expose the first error again and issues no second end.
  await assert.rejects(io.writeGate(Buffer.from("{}")));
  assert.equal(ends, 1);
  finishChild(child);
  io.finishFlow();
});

test("a pre-write fd-3 error is latched even with no pending write", async () => {
  const { io, receipts } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  const boom = new Error("fd3 early fault");
  const doneObs = io.done.catch((e) => e);
  // The error arrives BEFORE any write is issued — pendingWrite is
  // null — yet the gate must latch it as the failed truth.
  child.fd3.emit("error", boom);
  assert.equal(await doneObs, boom);
  await assert.rejects(io.writeGate(Buffer.from("{}")), (e) => e === boom);
  assert.equal(child.fd3.writes.length, 0);
  // Physical settlement needs only the real facts now: no issued
  // operation's outcome is owed.
  const done = settle(receipts[0]);
  finishChild(child);
  io.finishFlow();
  await flush();
  assert.equal(done(), true);
});

test("an fd-3 error settles the issued no-frame end's real outcome", async () => {
  const { io, receipts } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  // The no-frame close issues its tracked end; its callback never
  // arrives — the real fd-3 error is that issued operation's ERROR
  // outcome even though no pendingWrite exists.
  let cb;
  child.fd3.end = (chunk, done) => {
    if (typeof chunk === "function") {
      done = chunk;
      chunk = undefined;
    }
    child.fd3.ended = true;
    cb = done;
    return child.fd3;
  };
  io.closeGate();
  const boom = new Error("fd3 close error");
  finishChild(child); // exit plus both output closes arrive
  const settled = settle(receipts[0]);
  await flush();
  assert.equal(settled(), false); // the issued end's outcome is owed
  child.fd3.emit("error", boom);
  await flush();
  // The real ERROR outcome discharged the issued operation: physical
  // now settles truthfully, with no uncaught event.
  assert.equal(settled(), true);
  // A late write is refused at the permanently closed issuance —
  // LSOF_UNAVAILABLE, never the latched original error — and issues
  // no second end or frame.
  await assert.rejects(io.writeGate(Buffer.from("{}")), /LSOF_UNAVAILABLE/);
  assert.equal(child.fd3.writes.length, 0);
  io.finishFlow();
});

test("named listeners and buffers release only at the genuine boundary", async () => {
  const { io, receipts, disposed } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  child.emitOut(Buffer.from("p1\0n127.0.0.1:9\0"));
  // Physical fulfillment alone — before finishFlow — must never
  // release the listeners, buffers or the isolated dispose callback:
  // parsing still reads bounded output under the same budget.
  io.closeGate();
  finishChild(child);
  const done = settle(receipts[0]);
  await flush();
  assert.equal(done(), true);
  assert.ok(child.stdout.listenerCount("data") > 0);
  assert.equal(disposed(), false);
  // The bounded captured facts are readable and copied BEFORE the
  // terminal release — parsing consumes them under the same budget.
  const out = io.output();
  assert.equal(out.stdout.toString(), "p1\0n127.0.0.1:9\0");
  // finishFlow completes the shared terminal boundary.
  io.finishFlow();
  await flush();
  assert.equal(disposed(), true);
  assert.equal(child.stdout.listenerCount("data"), 0);
  assert.equal(child.stdout.listenerCount("close"), 0);
  assert.equal(child.listenerCount("exit"), 0);
  // Buffers are released at that boundary: output is empty after.
  assert.equal(io.output().stdout.length, 0);
});

test("neverSpawned truthfully settles only the no-child receipt", async () => {
  const { io, receipts, disposed } = mkIO();
  const done = settle(receipts[0]);
  const boom = new Error("no child");
  io.neverSpawned(boom);
  await flush();
  assert.equal(done(), true);
  io.finishFlow();
  await flush();
  assert.equal(disposed(), true);
  // After the final closure and the fulfilled receipt, late work is
  // refused with no side effects: no listeners, no writes, no new
  // issued operation and no physical reversal.
  const late = fakeChild({ pid: 9 });
  assert.throws(() => io.attach(late));
  await assert.rejects(io.writeGate(Buffer.from("{}")));
  io.closeGate();
  assert.equal(late.stdout.listenerCount("data"), 0);
  assert.equal(late.fd3.writes.length, 0);
  assert.equal(late.fd3.ended, false);
  assert.equal(done(), true);
});

test("a failed registration's owed end outcome gates the whole entry's release", async () => {
  // Whole moved entry case: early exit plus both closes BEFORE the
  // issuance decision keep physical pending; the issued no-frame
  // end's held callback is owed until its real outcome; only then
  // does the shared physical+finishFlow boundary release the named
  // listeners through the entry path.
  const spawned = [];
  const receipts = [];
  let releaseReg;
  const deferredRegister = new Promise((_, rej) => (releaseReg = rej));
  const { order, lq, mk } = createLsofGateFixture({
    spawned,
    script: { deferredRegister },
  });
  const p = lq.queryPort(9, {
    budget: mk(),
    retainActual: (r) => receipts.push(r),
  });
  const observed = assert.rejects(p, /registration failed/);
  await flush();
  const child = spawned[0].child;
  finishLsofFixture(child);
  const settled = settle(receipts[0]);
  await flush();
  assert.equal(settled(), false);
  let releaseEnd;
  child.fd3.end = (chunk, cb) => {
    child.fd3.ended = true;
    releaseEnd = typeof chunk === "function" ? chunk : () => cb();
    return child.fd3;
  };
  releaseReg(new Error("registration failed"));
  await observed;
  // No exec frame or signal; the issued end's held callback is owed.
  assert.equal(child.fd3.writes.length, 0);
  assert.equal(child.fd3.ended, true); // pre-ack close unblocks the wrapper
  assert.ok(!order.some((o) => o.startsWith("signal")));
  await flush();
  assert.equal(settled(), false);
  releaseEnd();
  await flush();
  assert.equal(settled(), true);
  // The combined physical+finishFlow boundary — reached through the
  // real entry finally — released every named listener on the child.
  assert.equal(child.stdout.listenerCount("data"), 0);
  assert.equal(child.stderr.listenerCount("data"), 0);
  assert.equal(child.fd3.listenerCount("error"), 0);
  assert.equal(child.listenerCount("exit"), 0);
});

test("finishFlow alone permanently closes the gate to late work", async () => {
  // finishFlow before any attach: a late attach is refused outright
  // and adds no listeners — the closing decision stands alone.
  const early = mkIO();
  early.io.finishFlow();
  const orphan = fakeChild({ pid: 9 });
  assert.throws(() => early.io.attach(orphan));
  assert.equal(orphan.stdout.listenerCount("data"), 0);
  // finishFlow on an attached child before any write: the late write
  // is refused — no end and no frame — while real exit plus both
  // closes still fulfill the retained physical receipt.
  const { io, receipts } = mkIO();
  const child = fakeChild({ pid: 7 });
  io.attach(child);
  io.finishFlow();
  await assert.rejects(io.writeGate(Buffer.from("{}")), /LSOF_UNAVAILABLE/);
  assert.equal(child.fd3.ended, false);
  assert.equal(child.fd3.writes.length, 0);
  const done = settle(receipts[0]);
  finishChild(child);
  await flush();
  assert.equal(done(), true);
});
