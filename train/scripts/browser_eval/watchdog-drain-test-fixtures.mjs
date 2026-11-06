// watchdog-drain-test-fixtures.mjs (TEST-ONLY drain/binding leaf): the
// ONE module-private association between an ORIGINAL actual
// run/controller Promise and its binding's observed cleanup flow, the
// transparent createRunDrainBinding tap over the SAME real
// createCleanupController, the event-driven ORIGINAL-stage drain, the
// shared yieldTurn turn helper, the heldGate releasable temporal
// primitive, the advanceBy ordered partial-advance helper, the
// private issueFixtureBody raw-completion receipt and the drive
// stage-only bound-drain helper and the moved driver-lifecycle
// primitives. The shared watchdogTestClock delegates further to the
// watchdog-driver-test-fixtures.mjs leaf under corrective 69 and is
// re-exported identically so the accepted roster stays.
// Imported by the run/cleanup/child/evidence test
// fixture owners; never imported by production modules. The cleanup
// tap is a nonasync forward to the ONE actual
// Object.freeze({run, verifyCleanup}) controller — the frozen object
// is never mutated, no proof, second controller or second association
// is minted, and the original argument/result/error pass through
// unchanged. drain accepts ONLY an ORIGINAL promise associated through
// trackRun or the bound cleanup.run tap — a .finally/Promise.all
// wrapper or any unassociated input is rejected BEFORE any clock
// advance. Stage policy is literal: fake time holds while real
// start/register/FS/callback prerequisites settle, only the unconsumed
// ORIGINAL +2000 then +4000 boundaries advance (the ACTUAL term
// emission gates the second), and ZERO further advance happens
// at/through the captured end while real IO/required settlement
// drains — never a whole-window jump past an ORIGINAL bound, no
// fake-clock rewind, no wall polling, and max is finite scheduler
// bookkeeping, never another time allowance. No test() declaration,
// Native/phase/proof authority, new runtime hook, clock or queue.
import { createCleanupController } from "./watchdog-cleanup.mjs";

export const yieldTurn = () => new Promise((r) => setImmediate(r));

// An owned releasable gate: tests hold and then release real awaited
// dependencies (registration, monitor start, fault-IO) deterministically.
export const heldGate = () => {
  const g = { held: true };
  g.promise = new Promise((r) => {
    g.release = r;
  });
  return g;
};

const FAIL = (detail) => {
  const e = new Error(`watchdog-drain-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The ONE module-private association between an ORIGINAL actual
// run/controller Promise and its binding's observed cleanup flow — keyed
// on the raw promise itself, never a .finally/Promise.all wrapper.
const runBindings = new WeakMap();

// PRIVATE TEST-ONLY binding over the SAME real controller: `cleanup` is
// a transparent tap — its nonasync run forwards EXACTLY ONCE to the ONE
// actual Object.freeze({run, verifyCleanup}) controller with the
// original argument q/result/error unchanged (the frozen object is never
// mutated and no proof, association or second controller is minted);
// verifyCleanup forwards unchanged. The supplied recordEvent observer is
// delegated exactly once with its original result/error while the actual
// emitted stage facts are retained; the observed callback body is itself
// registered debt joined by settleActual. trackRun(originalPromise)
// returns that SAME Promise and associates the raw public run body with
// this observed flow. settleActual joins the actual registered
// controller/required-settlement/event-callback bodies AFTER the caller
// closed issuance — independently of the bounded public run outcome,
// with no nested global dispose and no self-wait.
export function createRunDrainBinding({ monitor, clock, runId, recordEvent = null, lifetime = undefined } = {}) {
  const meta = {
    entered: false,
    term: false,
    kill: false,
    start: null,
    end: null,
    slot: null,
    bodies: [],
    // Deferred ACTUAL stage receipts: each resolves only when the real
    // emitted stage fact lands — a drain awaits these, never poll turns.
    graceful: deferred(),
    termSeen: deferred(),
    qSettled: deferred(),
  };
  const observe = (arg) => {
    const payload = arg !== null && typeof arg === "object" ? arg.payload : null;
    const stage =
      arg !== null && typeof arg === "object" && arg.kind === "cleanup" &&
      payload !== null && typeof payload === "object"
        ? payload.stage
        : null;
    if (stage === "graceful") {
      meta.entered = true;
      // The captured ORIGINAL start/end are admitted only at the actual
      // graceful callback — never from supplied args alone: the supplied
      // cleanupStartMonoMs, else this call's own entry capture, and
      // end = min(start+5000, supplied deadline). A shortened inherited
      // end is never a new grace.
      const slot = meta.slot;
      if (slot !== null && meta.start === null) {
        meta.start = slot.start !== null ? slot.start : slot.invokedAt;
        meta.end = Math.min(
          meta.start + 5000,
          slot.end !== null ? slot.end : meta.start + 5000,
        );
      }
      meta.graceful.resolve();
    } else if (stage === "term") {
      meta.term = true;
      meta.termSeen.resolve();
    } else if (stage === "kill") {
      meta.kill = true;
    }
    if (recordEvent === null) return undefined;
    // The actual observer body is prearmed as a neutral completion
    // receipt BEFORE invocation, then the IDENTICAL original result or
    // error returns directly — a synchronous observer throw stays a
    // synchronous throw for the real controller, and the neutral
    // receipt is never a physical close or proof fact.
    return issueFixtureBody(meta.bodies, () => recordEvent(arg));
  };
  const actual = createCleanupController({
    monitor,
    clock,
    runId,
    lifetime,
    recordEvent: observe,
  });
  const run = (q) => {
    const slot = {
      start:
        q !== null && typeof q === "object" && Number.isSafeInteger(q.cleanupStartMonoMs)
          ? q.cleanupStartMonoMs
          : null,
      end:
        q !== null && typeof q === "object" && Number.isSafeInteger(q.deadlineMonoMs)
          ? q.deadlineMonoMs
          : null,
      invokedAt: clock.nowMonoMs(),
      qDone: false,
      q: null,
      receipt: deferred(),
    };
    // The raw-body receipt AND the association slot are registered
    // BEFORE the one actual controller run is invoked — its original
    // argument, result and error stay untouched, and a synchronous
    // throw from the actual run is rethrown after the receipt settles.
    // The receipt is pre-observed so a never-joined binding cannot
    // float an unhandled rejection.
    slot.receipt.promise.then(
      () => {},
      () => {},
    );
    meta.slot = slot;
    meta.bodies.push(slot.receipt.promise);
    try {
      slot.q = actual.run(q);
    } catch (e) {
      slot.qDone = true;
      slot.receipt.reject(e);
      throw e;
    }
    slot.q.then(
      () => {
        slot.qDone = true;
        meta.qSettled.resolve();
        slot.receipt.resolve();
      },
      (e) => {
        slot.qDone = true;
        meta.qSettled.resolve();
        slot.receipt.reject(e);
      },
    );
    runBindings.set(slot.q, meta);
    return slot.q;
  };
  const trackRun = (p) => {
    runBindings.set(p, meta);
    return p;
  };
  // Joins every actual registered controller q / required-settlement /
  // event-callback body — a public bounded run result never substitutes
  // for raw physical settlement. The first real failure is retained;
  // remaining bodies still join.
  const settleActual = async () => {
    let firstError = null;
    for (let i = 0; i < meta.bodies.length; i += 1) {
      try {
        await meta.bodies[i];
      } catch (e) {
        if (firstError === null) firstError = e;
      }
    }
    if (firstError !== null) throw firstError;
  };
  const cleanup = {
    run,
    verifyCleanup: (arg) => actual.verifyCleanup(arg),
  };
  return { cleanup, trackRun, settleActual };
}

// Event-driven ORIGINAL-stage drain over the observed binding flow:
// every scheduler step is ONE real state transition — a deferred ACTUAL
// stage receipt (graceful, term, q settlement) or the original p
// settlement — never a turn-count poll. Fake time holds while the
// actual graceful admission is awaited (a missing terminal trigger
// stays pending — no synthesized timeout), only the unconsumed
// ORIGINAL +2000 then +4000 boundaries advance — the already-captured
// shorter end is the only permitted earlier boundary and runDue
// delivers already-due timers at the same instant — the ACTUAL term
// receipt is awaited before the second advance because the KILL wait
// is armed inside its continuation, then the clock holds while real
// IO/required settlement drains. max counts these scheduler state
// transitions, never IO turns — a late actual stage can still arrive
// after more than max TURNS and still receives its unconsumed
// ORIGINAL advance; no rewind, no 500 ms fallback, no new grace and
// no poll timeout.
const drainBound = async (clk, p, meta, max) => {
  let done = false;
  const tracked = Promise.resolve(p).then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );
  let stage = "hold";
  const advanceTo = (boundary) => {
    const now = clk.nowMonoMs();
    if (now < boundary) clk.advance(boundary - now);
    else clk.runDue();
  };
  for (let i = 0; i < max && !done && stage !== "settle"; i += 1) {
    if (stage === "hold") {
      await Promise.race([meta.graceful.promise, tracked]);
      stage = meta.entered && !done ? "toTerm" : "settle";
    } else if (stage === "toTerm") {
      advanceTo(Math.min(meta.start + 2000, meta.end));
      stage = "awaitTerm";
    } else if (stage === "awaitTerm") {
      await Promise.race([
        meta.termSeen.promise,
        meta.qSettled.promise,
        tracked,
      ]);
      stage = meta.term && !done ? "toKill" : "settle";
    } else if (stage === "toKill") {
      advanceTo(Math.min(meta.start + 4000, meta.end));
      stage = "settle";
    }
  }
  // ZERO advance at/through the captured end — already-due timers at
  // the same instant still deliver while the clock stays held.
  clk.runDue();
  await tracked;
  return p;
};

// Drives ONLY an ORIGINAL run/controller promise associated through
// trackRun or the bound cleanup.run tap: an unassociated promise or a
// .finally/Promise.all wrapper is REJECTED with FIXTURE_CONFIG BEFORE
// any clock advance — there is no blanket per-pending advance because a
// bounded public result never substitutes for raw physical settlement.
// Returns/adopts the ORIGINAL p unchanged.
export const drain = async (clk, p, max = 60) => {
  const meta =
    p !== null && (typeof p === "object" || typeof p === "function")
      ? runBindings.get(p)
        : undefined;
  if (meta === undefined) {
    throw FAIL("drain input is not an associated original promise");
  }
  return drainBound(clk, p, meta, max);
};

// Advance the fake clock in ordered 500 ms steps WITHOUT waiting for
// settlement — the held/interrupted cases drive partial progress only.
// Each step yields REAL event-loop turns: microtask-only loops cannot
// complete pending filesystem/callback IO, and fake time must never be
// driven past an end merely because IO had no turn.
export const advanceBy = async (clk, rounds = 6) => {
  for (let i = 0; i < rounds; i += 1) {
    clk.advance(500);
    await yieldTurn();
    await yieldTurn();
  }
};

// PRIVATE helper-to-helper export: pushes a deferred raw-completion
// receipt into the SAME caller-prearmed local actual-settlement array
// BEFORE issueThunk is invoked, then returns the IDENTICAL direct
// result or original Promise — a synchronous throw is rethrown and an
// original rejection stays on the caller channel unchanged. The
// receipt fulfills only on actual body completion, success OR
// rejection — a rejection never invents descriptor close, pass or
// safe exit. No new owner, clock, queue or global registration: the
// caller closes untrusted issuance and joins the fresh dynamic array
// — including the factory parent — before reading final slots or
// running the real close; no cached zero promise, no global dispose
// and no self-wait.
export const issueFixtureBody = (bodies, issueThunk) => {
  const receipt = deferred();
  bodies.push(receipt.promise);
  let result;
  try {
    result = issueThunk();
  } catch (e) {
    receipt.resolve();
    throw e;
  }
  Promise.resolve(result).then(
    () => receipt.resolve(),
    () => receipt.resolve(),
  );
  return result;
};

// Drive an admitted ORIGINAL controller/run promise to settlement
// through the declared bound drain — the input must already be
// associated through the bound cleanup.run tap or trackRun, never a
// .finally/Promise.all wrapper, and an unassociated promise is
// rejected BEFORE any clock advance. The original stages advance only
// the unconsumed +2000 then +4000 boundaries; max is finite scheduler
// bookkeeping, never another time allowance.
export const drive = (clk, p, max = 40) => drain(clk, p, max);

// The ONE shared fake clock/timer hub whole-moved to the
// watchdog-driver-test-fixtures.mjs leaf under corrective 69 —
// re-exported identically so the accepted roster stays.
export { watchdogTestClock } from "./watchdog-driver-test-fixtures.mjs";

// hello -> register -> start through the real validator only AFTER the
// channel's IPC listener provably exists; then the driver-side close
// facts for the separate settlement controls. closeFacts carries the
// declared binding delta: EVERY still-queued actual send callback is
// released BEFORE the fake child exit and BOTH pipe closes — delivery
// is attempted for all even when one throws — and the retained first
// thrown value rethrows only after the genuine facts still deliver, so
// a held callback is never abandoned and never counts as close proof.
export const liveStart = async (clk, driver) => {
  await driver.ready;
  driver.emit({ type: "hello" });
  clk.advance(50);
  await yieldTurn();
  await yieldTurn();
};

export const closeFacts = (driver) => {
  try {
    driver.releaseSendCallbacks();
  } finally {
    driver.emit({ type: "closed", gracefulCloseAttempted: true, expectedShutdowns: [] });
    driver.exit(0);
    driver.closeOut();
    driver.closeErr();
  }
};

export const FINISH = (requestedStatus, requestedExitCode) => ({
  type: "finish",
  requestedStatus,
  requestedExitCode,
  stopReason: null,
  checks: [],
  summary: {},
  analysisEligible: requestedStatus === "passed",
});
