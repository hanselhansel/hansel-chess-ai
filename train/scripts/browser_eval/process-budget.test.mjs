// process-budget.test.mjs: injected-clock deadline/narrowing coverage.
// Queued expiry never dispatches, active/queued/unqueued narrowing,
// spent-bound no-IO, losing-timer clearing, whenSettled/settled drain
// semantics and actual ownership surviving public timeout — all on the
// fake clock so every assertion about the actual clock is exact.
import test from "node:test";
import assert from "node:assert/strict";

import {
  captureDeadlineMs,
  createBudgetHandle,
  createBoundedQueue,
  sleepHandle,
  pollHandle,
  waitHandle,
} from "./process-budget.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";

const acct = (p) => p.then(
  () => {
    throw new Error("expected rejection");
  },
  (e) => assert.equal(e.code, "ACCOUNTING_UNAVAILABLE"),
);
const flush = () => new Promise((r) => setImmediate(r));

test("captureDeadlineMs takes the minimum bound and validates options", () => {
  assert.equal(
    captureDeadlineMs({ nowMonoMs: 100, ceilingMs: 1000 }),
    1100,
  );
  assert.equal(
    captureDeadlineMs({
      nowMonoMs: 100,
      ceilingMs: 1000,
      constructorDeadlineMs: 900,
      laterDeadlineMs: 800,
      callOptions: { deadlineMonoMs: 950 },
    }),
    800,
  );
  // A null/undefined options object is the isolated-caller path; a
  // present object must carry exactly deadlineMonoMs.
  assert.throws(() =>
    captureDeadlineMs({ nowMonoMs: 1, ceilingMs: 9, callOptions: { x: 1 } }),
  );
  assert.throws(() =>
    captureDeadlineMs({
      nowMonoMs: 1,
      ceilingMs: 9,
      callOptions: { deadlineMonoMs: Number.NaN },
    }),
  );
});

test("narrow only ever moves the bound earlier; sync expiry clears the timer", () => {
  const clock = fakeClock();
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 1000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  assert.equal(clock.pendingTimeouts(), 1);
  h.narrow(clock.nowMs() + 5000); // wider: no-op
  assert.equal(h.deadlineMonoMs(), clock.nowMs() + 1000);
  // Narrow into the already-past domain: expiry is discovered without a
  // timer fire and the losing timer is still cleared.
  h.narrow(clock.nowMs() - 1);
  assert.equal(clock.pendingTimeouts(), 0);
  assert.throws(() => h.assertLive("late"), /ACCOUNTING_UNAVAILABLE/);
});

test("assertLive on a lapsed bound latches expiry once", () => {
  const clock = fakeClock();
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 10,
    clock,
    nowMonoMs: clock.nowMs,
  });
  h.dispose();
  clock.advance(20);
  assert.throws(() => h.assertLive("gone"));
  // A disposed handle never becomes live again and reports truthfully.
  assert.equal(h.remainingMs(), 0);
});

test("waitHandle rejects at expiry; the loser side always clears", async () => {
  const clock = fakeClock();
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 50,
    clock,
    nowMonoMs: clock.nowMs,
  });
  let resolveSlow;
  const slow = new Promise((r) => (resolveSlow = r));
  const p = waitHandle(h, slow, "slow wait");
  clock.advance(60);
  await acct(p);
  // A resolution arriving after expiry can never win: the subscription
  // is already released, and a late settle is just dropped.
  resolveSlow(1);
  await flush();
  const h2 = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 100,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const ok = waitHandle(h2, Promise.resolve(7), "ok wait");
  assert.equal(await ok, 7);
});

test("sleepHandle resolves on the actual clock and never after expiry", async () => {
  const clock = fakeClock();
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 100,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const s = sleepHandle(h, clock, 30);
  clock.advance(29);
  let done = false;
  s.then(() => (done = true), () => (done = true));
  await flush();
  assert.equal(done, false);
  clock.advance(1);
  await s;
  // A sleep whose timer lands after expiry rejects through the same
  // path, and a late wake can never claim success.
  const h2 = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 5,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const s2 = sleepHandle(h2, clock, 50);
  clock.advance(50);
  await acct(s2);
});

test("pollHandle check success requires a live handle on the real clock", async () => {
  const clock = fakeClock();
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 40,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const seen = [];
  const p = pollHandle({
    handle: h,
    clock,
    pollMs: 5,
    boundMs: 30,
    check: (done) => {
      seen.push(clock.nowMs());
      if (seen.length === 2) done.resolve("hit");
    },
  });
  clock.advance(5);
  assert.equal(seen.length, 1);
  clock.advance(5);
  assert.equal(await p, "hit");
  // A poll whose handle expired before the first check never runs one.
  const h2 = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 1,
    clock,
    nowMonoMs: clock.nowMs,
  });
  clock.advance(2);
  let ran = false;
  await acct(
    pollHandle({
      handle: h2,
      clock,
      pollMs: 5,
      boundMs: 30,
      check: () => (ran = true),
    }),
  );
  assert.equal(ran, false);
});

test("a spent queued handle is never dispatched", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 5,
    clock,
    nowMonoMs: clock.nowMs,
  });
  clock.advance(10);
  let ran = false;
  await acct(
    q.enqueue(() => {
      ran = true;
    }, h),
  );
  assert.equal(ran, false);
});

test("narrowAll reaches active, queued and unqueued-tracked handles", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const mk = () =>
    createBudgetHandle({
      deadlineMonoMs: clock.nowMs() + 1000,
      clock,
      nowMonoMs: clock.nowMs,
    });
  const active = mk();
  const queued = mk();
  const unqueued = mk();
  let dispatched = false;
  let releaseActive;
  const activeRun = q.enqueue(() => {
    dispatched = true;
    return new Promise((r) => (releaseActive = r));
  }, active);
  const queuedRun = q.enqueue(() => "second", queued);
  const untrack = q.track(unqueued);
  // Dispatch is asserted BEFORE the clock advances: the ACTIVE task
  // must actually be running for its public timeout to be observed
  // while the actual task stays owned — the queued entry separately
  // retains the never-dispatched spent-queue assertion below.
  await flush();
  assert.equal(dispatched, true);
  // The narrowing bound lands inside every live handle's horizon.
  q.narrowAll(clock.nowMs() + 10);
  assert.equal(active.deadlineMonoMs(), clock.nowMs() + 10);
  assert.equal(queued.deadlineMonoMs(), clock.nowMs() + 10);
  assert.equal(unqueued.deadlineMonoMs(), clock.nowMs() + 10);
  clock.advance(10);
  // The active run's public promise rejected but the ACTUAL task still
  // holds its acquisition until it settles.
  await acct(activeRun);
  await acct(queuedRun); // expired before dispatch: never ran "second"
  let settled = false;
  q.whenSettled(active).then(() => (settled = true));
  releaseActive();
  await flush();
  assert.equal(settled, true);
  untrack();
  await q.settled();
});

test("whenSettled stays pending while a physical receipt is held", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 1000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  // The ownOperation pattern: an owner acquisition plus a registered
  // physical receipt; the zero point arrives only after BOTH release.
  const releaseOwner = q.track(h);
  const zero = q.whenSettled(h);
  let settleReceipt;
  const receipt = new Promise((r) => (settleReceipt = r));
  const releaseReceipt = q.track(h);
  receipt.then(releaseReceipt, releaseReceipt);
  let done = false;
  zero.then(() => (done = true));
  releaseOwner();
  await flush();
  assert.equal(done, false); // the receipt still gates settlement
  settleReceipt();
  await flush();
  assert.equal(done, true);
});

test("a delayed expiry timer still rejects through the actual clock gate", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 10,
    clock,
    nowMonoMs: clock.nowMs,
  });
  let release;
  const run = q.enqueue(() => new Promise((r) => (release = r)), h);
  const observed = acct(run);
  await flush(); // dispatched and genuinely pending
  // The monotonic bound passes WITHOUT the expiry callback firing;
  // the task's late settle then meets the assertLive recheck — the
  // ACTUAL clock, never the delayed timer, rejects the public run.
  clock.jumpWithoutTimers(10);
  release("late");
  await flush();
  await observed;
  // Draining the delayed timer adds nothing; the acquisition already
  // released through the actual gate.
  clock.runDue();
  await q.settled();
});

test("settled({excludeHandle}) drains every other tracked entry, not itself", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const mk = () =>
    createBudgetHandle({
      deadlineMonoMs: clock.nowMs() + 1000,
      clock,
      nowMonoMs: clock.nowMs,
    });
  const stop = mk();
  const other = mk();
  q.track(stop);
  const untrackOther = q.track(other);
  const drain = q.settled({ excludeHandle: stop });
  let drained = false;
  drain.then(() => (drained = true));
  await flush();
  assert.equal(drained, false); // the other acquisition still gates
  untrackOther();
  await drain;
  assert.equal(drained, true);
});

test("public timeout never settles the actual queued task", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 10,
    clock,
    nowMonoMs: clock.nowMs,
  });
  let dispatched = false;
  let finishActual;
  const actualRan = new Promise((r) => (finishActual = r));
  const run = q.enqueue(() => {
    dispatched = true;
    return actualRan;
  }, h);
  // Dispatch is asserted BEFORE the clock advances so the expiry lands
  // on an ACTIVE task — never the never-dispatched spent-queue path.
  await flush();
  assert.equal(dispatched, true);
  clock.advance(10); // public promise expires while actual work waits
  await acct(run);
  let actualSettled = false;
  q.whenSettled(h).then(() => (actualSettled = true));
  await flush();
  assert.equal(actualSettled, false); // still owned by the actual task
  // The actual task's late truthful settlement is what releases the
  // acquisition; the already-rejected public promise can never flip
  // to a late success.
  finishActual("late-real-result");
  await flush();
  assert.equal(actualSettled, true);
  await acct(run);
});

test("unqueued owner can enqueue nested work on the same handle without deadlock", async () => {
  const clock = fakeClock();
  const q = createBoundedQueue({ clock, nowMonoMs: clock.nowMs });
  const h = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 1000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  // The lsof/proof pattern: the outer operation stays OUTSIDE the
  // queue while its nested registrations ride the SAME queue and
  // handle, so nothing is ever queued behind itself.
  const releaseOwner = q.track(h);
  const nested = async () => {
    const a = await q.enqueue(() => "one", h);
    const b = await q.enqueue(() => "two", h);
    return `${a}-${b}`;
  };
  assert.equal(await nested(), "one-two");
  releaseOwner();
  await q.settled();
});
