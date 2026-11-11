// Original min-only operation budgets, waits and one serialized bounded queue.
export { originalContextBudget } from "./protocol-values.mjs";
const HANDLES = new WeakMap();
export const assertBudgetHandle = (handle) => {
  const originals = HANDLES.get(handle);
  if (!originals || Object.keys(originals).some((key) => {
    const own = Object.getOwnPropertyDescriptor(handle, key);
    return !own || !Object.hasOwn(own, "value") || own.value !== originals[key];
  })) throw new TypeError("genuine original BudgetHandle required");
};
import { isObj } from "./protocol-values.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

// min(nowMonoMs + fixed operation ceiling, constructorDeadlineMs,
// laterDeadlineMs, callOptions.deadlineMonoMs). Every bound that is
// present must be a finite absolute monotonic millisecond value in the
// shared hrtime domain; callOptions is the trusted private
// {deadlineMonoMs} object only.
export function captureDeadlineMs({
  nowMonoMs,
  constructorDeadlineMs = null,
  laterDeadlineMs = null,
  callOptions = undefined,
  ceilingMs,
}) {
  if (
    !Number.isFinite(nowMonoMs) ||
    !Number.isFinite(ceilingMs) ||
    ceilingMs <= 0
  ) {
    throw acct("deadline clock");
  }
  const bounds = [nowMonoMs + ceilingMs];
  const check = (v) => {
    if (v === null || v === undefined) return;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw acct("deadline bound");
    }
    bounds.push(v);
  };
  check(constructorDeadlineMs);
  check(laterDeadlineMs);
  // A supplied options object must own EXACTLY the declared
  // deadlineMonoMs key with a finite absolute value: {wrong:1}, a
  // null/undefined value or any extra field fails closed rather than
  // silently defaulting. Omitting the option entirely stays valid for
  // isolated callers.
  if (callOptions !== undefined && callOptions !== null) {
    if (
      !isObj(callOptions) ||
      Object.keys(callOptions).length !== 1 ||
      !Object.prototype.hasOwnProperty.call(callOptions, "deadlineMonoMs")
    ) {
      throw acct("deadline options");
    }
    const v = callOptions.deadlineMonoMs;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      throw acct("deadline bound");
    }
    bounds.push(v);
  }
  return Math.min(...bounds);
}

// The ONE narrow-only mutable budget authority shared inside an
// operation: a queued item, its dispatched work, transport pending
// replies, proof/observation activations and borrowed lsof/backend
// stages all borrow the SAME handle rather than copying a numeric
// deadline. It owns one re-armable expiry timer on the supplied clock;
// narrow() only ever moves the bound earlier (re-arming or expiring
// now), expiry is sticky and notifies every live waiter exactly once,
// assertLive rechecks the actual supplied clock so a late callback can
// never beat a delayed timeout, and dispose() releases the timer and
// waiters without ever making an expired handle live again.
export function createBudgetHandle({ deadlineMonoMs, clock, nowMonoMs }) {
  if (
    typeof deadlineMonoMs !== "number" ||
    !Number.isFinite(deadlineMonoMs) ||
    deadlineMonoMs < 0 ||
    !isObj(clock) ||
    typeof clock.setTimeout !== "function" ||
    typeof clock.clearTimeout !== "function" ||
    typeof nowMonoMs !== "function"
  ) {
    throw acct("budget handle");
  }
  let bound = deadlineMonoMs;
  let expired = false;
  let disposed = false;
  let timer = null;
  const waiters = new Set();
  const fire = () => {
    if (expired) return;
    expired = true;
    // Synchronous expiry discovery (assertLive) must still clear the
    // pending re-armed timer so it cannot fire a second time later.
    if (timer !== null) {
      clock.clearTimeout(timer);
      timer = null;
    }
    for (const cb of [...waiters]) {
      try {
        cb();
      } catch {
        // A faulting subscriber cannot break expiry for the rest.
      }
    }
  };
  const arm = () => {
    if (disposed || expired) return;
    const left = bound - nowMonoMs();
    if (left <= 0) {
      fire();
      return;
    }
    timer = clock.setTimeout(fire, left);
  };
  arm();
  const handle = {
    // The current effective absolute bound in the shared hrtime-ms
    // domain; it only ever decreases under narrow().
    deadlineMonoMs: () => bound,
    // Conservative remaining budget, floored at zero.
    remainingMs: () => Math.max(0, Math.floor(bound - nowMonoMs())),
    // The success gate: throws the shared accounting error when the
    // handle is expired, disposed or past its bound on the real clock.
    // Detecting a lapsed bound also latches and notifies, so a delayed
    // timeout can never leave a live-looking handle.
    assertLive: (detail) => {
      if (!expired && !disposed && nowMonoMs() >= bound) fire();
      if (expired || disposed) throw acct(detail);
    },
    // min-only narrowing: validates, clamps and re-arms earlier or
    // expires immediately. A wider or invalid bound changes nothing.
    narrow: (b) => {
      if (typeof b !== "number" || !Number.isFinite(b) || b >= bound) {
        return;
      }
      bound = b;
      if (timer !== null) {
        clock.clearTimeout(timer);
        timer = null;
      }
      arm();
    },
    // Subscribe to the single expiry; already-expired handles notify
    // immediately. Returns the unsubscribe for settlement cleanup.
    onExpire: (cb) => {
      if (expired) {
        try {
          cb();
        } catch {
          // expiry already latched
        }
        return () => {};
      }
      if (disposed) return () => {};
      waiters.add(cb);
      return () => waiters.delete(cb);
    },
    // Release the owned timer and waiters. Expiry stays latched; a
    // disposed handle is never live again, but remainingMs/deadline
    // keep reporting the true bound for teardown bookkeeping.
    dispose: () => {
      disposed = true;
      if (timer !== null) {
        clock.clearTimeout(timer);
        timer = null;
      }
      waiters.clear();
    },
  };
  HANDLES.set(handle, { ...handle });
  return handle;
}

// Subscribe an already-issued settlement promise to a handle's expiry,
// clearing the subscription on either settlement path and rechecking
// the actual clock via assertLive before any successful resolution.
export function waitHandle(handle, settlePromise, detail) {
  return new Promise((resolve, reject) => {
    const tag = detail === undefined ? "bounded wait" : detail;
    const unsub = handle.onExpire(() => reject(acct(tag)));
    settlePromise.then(
      (v) => {
        unsub();
        try {
          handle.assertLive(tag);
          resolve(v);
        } catch (e) {
          reject(e);
        }
      },
      (e) => {
        unsub();
        reject(e);
      },
    );
  });
}

// A bounded sleep on a borrowed handle: resolves after ms or rejects at
// expiry, clearing whichever side loses. The handle is NOT disposed —
// it belongs to the caller.
export function sleepHandle(handle, clock, ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return Promise.reject(acct("bounded sleep"));
  }
  return new Promise((resolve, reject) => {
    const sleepTimer = clock.setTimeout(() => {
      unsub();
      // A late timer callback must recheck the actual clock: a delayed
      // wake can never report success after the handle expired.
      try {
        handle.assertLive("bounded sleep");
        resolve();
      } catch (e) {
        reject(e);
      }
    }, Math.max(1, Math.floor(ms)));
    const unsub = handle.onExpire(() => {
      clock.clearTimeout(sleepTimer);
      reject(acct("bounded sleep"));
    });
  });
}

// A bounded poll lifecycle on a borrowed handle: check(done) runs every
// pollMs until it calls done.resolve/done.reject; the outer bound is
// min(boundMs, handle.remainingMs()); handle expiry — including a
// later-narrowed bound — rejects through the same path, and every
// losing timer and subscription is cleared on settlement. An
// already-expired handle reports zero remaining and is rejected before
// the subscription, so onExpire can never fire before the timers exist.
export function pollHandle({ handle, clock, pollMs, boundMs, check }) {
  return new Promise((resolve, reject) => {
    let poll = null;
    const settle = (fn, v) => {
      unsub();
      clock.clearTimeout(deadline);
      if (poll !== null) clock.clearInterval(poll);
      fn(v);
    };
    const done = {
      // A check may only claim success while the SAME handle is still
      // live on the actual clock; otherwise the poll rejects instead.
      resolve: (v) => {
        try {
          handle.assertLive("poll deadline");
        } catch (e) {
          settle(reject, e);
          return;
        }
        settle(resolve, v);
      },
      reject: (e) => settle(reject, e),
    };
    const bound = Math.min(boundMs, handle.remainingMs());
    if (!Number.isFinite(bound) || bound <= 0) {
      reject(acct("poll deadline"));
      return;
    }
    const unsub = handle.onExpire(() =>
      done.reject(acct("poll deadline")),
    );
    const deadline = clock.setTimeout(
      () => done.reject(acct("poll deadline")),
      Math.max(1, bound),
    );
    poll = clock.setInterval(() => check(done), Math.max(1, pollMs));
  });
}

// The one serialized bounded queue shared by the monitor's public
// methods. Each item carries the caller's BudgetHandle: the returned
// public promise settles at handle expiry even while a longer earlier
// request occupies the chain, admission re-checks assertLive before a
// queued function may run, and the SAME handle is forwarded into the
// dispatched work so narrowing reaches active sends/proofs, not just a
// wrapper timer. narrowAll() narrows every acquired handle — active
// AND queued AND unqueued-tracked — never widens. Acquisitions are
// reference-counted: an enqueue holds one until its run settles and a
// track() holds one until its unqueued owner untracks, so a nested
// queued subtask finishing never ends the owner handle's narrowing
// while the owner's actual task still runs. The actual dispatched
// task stays tracked in the chain until it settles even after the
// public promise rejected; an expired queued function never issues
// work or activates results, and unsettled work stays unproven, never
// fabricated cancelled/gone.
export function createBoundedQueue({ clock, nowMonoMs }) {
  if (
    !isObj(clock) ||
    typeof clock.setTimeout !== "function" ||
    typeof clock.clearTimeout !== "function" ||
    typeof nowMonoMs !== "function"
  ) {
    throw acct("queue clock");
  }
  let chain = Promise.resolve();
  // handle -> {n: live acquisitions (enqueues, explicit track calls
  // and registered physical receipts), zero/resolveZero: the deferred
  // zero-acquisitions promise handed out by whenSettled}.
  const counts = new Map();
  const acquire = (handle) => {
    let e = counts.get(handle);
    if (e === undefined) {
      e = { n: 0, zero: null, resolveZero: null };
      counts.set(handle, e);
    }
    e.n += 1;
    return () => {
      e.n -= 1;
      if (e.n <= 0) {
        counts.delete(handle);
        if (e.resolveZero !== null) e.resolveZero();
      }
    };
  };

  // A later-narrower trusted bound, observed by any subsequent op():
  // every acquired handle re-arms earlier or expires now; a captured or
  // wider bound never extends anything.
  const narrowAll = (bound) => {
    if (typeof bound !== "number" || !Number.isFinite(bound)) return;
    for (const h of counts.keys()) h.narrow(bound);
  };

  const enqueue = (fn, handle) => {
    if (
      !isObj(handle) ||
      typeof handle.assertLive !== "function" ||
      typeof handle.onExpire !== "function" ||
      typeof handle.narrow !== "function"
    ) {
      return Promise.reject(acct("queue handle"));
    }
    const release = acquire(handle);
    const run = chain.then(() => {
      handle.assertLive("queue deadline");
      return fn(handle);
    });
    chain = run.catch(() => {});
    // The handle stays tracked until the ACTUAL task settles — a
    // public timeout never claims the dispatched IO finished.
    run.then(release, release);
    // The public side is the shared bounded-wait primitive: expiry
    // rejection at the horizon, assertLive recheck before resolve.
    return waitHandle(handle, run, "queue deadline");
  };

  // Register a live handle for narrowAll OUTSIDE the queue: unqueued
  // lsof/backend and start/stop waits stay narrowable until the owner
  // calls the returned untrack after its actual task settles. Track
  // never disposes or expires the handle — it only holds an
  // acquisition.
  const track = (handle) => {
    if (!isObj(handle) || typeof handle.narrow !== "function") {
      throw acct("track handle");
    }
    return acquire(handle);
  };

  // The zero-acquisitions promise for one handle's live entry: resolves
  // only after every owner/queued/receipt acquisition on that handle
  // releases and stays pending while any physical receipt is unproven.
  // A handle with no live entry has nothing left to prove.
  const whenSettled = (handle) => {
    const e = counts.get(handle);
    if (e === undefined) return Promise.resolve();
    if (e.zero === null) {
      e.zero = new Promise((r) => {
        e.resolveZero = r;
      });
    }
    return e.zero;
  };

  // Drain the serialized chain AND every live tracked entry's
  // whenSettled — actual acquisitions, not public promises. An entry
  // whose physical receipts outlive its public rejection still gates
  // the drain; excludeHandle lets the drain owner skip itself so a
  // stop can never wait on its own lifetime. Always resolves, never
  // rejects.
  const settled = ({ excludeHandle } = {}) => {
    const waits = [chain.catch(() => {})];
    for (const h of counts.keys()) {
      if (h === excludeHandle) continue;
      waits.push(whenSettled(h));
    }
    return Promise.all(waits).then(() => undefined);
  };

  return Object.freeze({ narrowAll, enqueue, track, whenSettled, settled });
}
