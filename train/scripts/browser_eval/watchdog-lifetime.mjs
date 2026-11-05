// watchdog-lifetime.mjs is the supervisor's actual referenced-lifetime
// and deferred physical-debt owner. retainActual registers real debt
// synchronously BEFORE its issuer invokes the actual callback/IO and
// retainFinalizerUntil registers the publication transaction's
// safe-exit debt before any possible completion publication. ONE
// referenced Node hold keeps this supervisor process alive while any
// truthful debt exists and is released only at a fulfilled true zero.
// A receipt rejection is observed but NEVER releases debt: no public
// timeout, thrown operation error, error callback or
// destroy/end/close invocation proves physical closure, and a raw
// syscall's settled result settles only its own raw-effect receipt —
// every created FD/stream/child retains separate real-close/reap debt.
// whenSettled observes the actual registered debt, not public
// outcomes, and fulfills only at genuine zero; it is a fresh
// observation on every call, never a cached initially-resolved zero.
// There is no queue, clock, phase, Native capability, record/schema or
// status authority here. Functional runtime input.

const OWNERS = new WeakMap();

// A large interval keeps the process referenced indefinitely; the tick
// is a process-lifetime handle only, never a deadline or control clock.
const HOLD_TICK_MS = 2147483647;

const fail = (detail) => {
  const error = new Error(`watchdog-lifetime ${detail}`);
  error.code = "WATCHDOG_LIFETIME";
  return error;
};

// The operational default: ONE actual referenced Node timer created in
// the same supervisor on first debt, returning an idempotent release.
// Isolated leaf fault tests alone may inject a createHold spy through
// the explicit factory option; operational assembly exposes no hold
// factory or fake-lifetime switch.
const defaultReferencedHold = () => {
  const timer = setInterval(() => {}, HOLD_TICK_MS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    clearInterval(timer);
  };
};

export function assertWatchdogLifetime(owner) {
  if (!OWNERS.has(owner)) throw fail("owner brand");
}

export function createWatchdogLifetime({ createHold = defaultReferencedHold } = {}) {
  if (typeof createHold !== "function") throw fail("createHold");
  const state = {
    outstanding: 0,
    holdRelease: null,
    waiters: new Set(),
  };

  // The single hold is reused while any debt exists and is created
  // lazily: the constructor itself starts no timer and performs no IO.
  const acquireHold = () => {
    if (state.holdRelease !== null) return;
    const release = createHold();
    if (typeof release !== "function") throw fail("hold release");
    let released = false;
    state.holdRelease = () => {
      if (released) return;
      released = true;
      release();
    };
  };

  const drainIfZero = () => {
    if (state.outstanding !== 0) return;
    if (state.holdRelease !== null) {
      const release = state.holdRelease;
      state.holdRelease = null;
      release();
    }
    for (const resolve of [...state.waiters]) {
      state.waiters.delete(resolve);
      resolve();
    }
  };

  // Registers debt BEFORE the issuer's actual work begins. Fulfillment
  // is the only path that retires it; a rejected or unproven receipt is
  // observed so the process cannot report an unhandled rejection, but
  // the debt — and the referenced hold — stay held forever.
  const retain = (settlementPromise) => {
    if (
      settlementPromise === null ||
      (typeof settlementPromise !== "object" &&
        typeof settlementPromise !== "function") ||
      typeof settlementPromise.then !== "function"
    ) {
      throw fail("settlement promise");
    }
    state.outstanding += 1;
    try {
      acquireHold();
    } catch (error) {
      state.outstanding -= 1;
      throw error;
    }
    settlementPromise.then(
      () => {
        state.outstanding -= 1;
        drainIfZero();
      },
      () => {
        // Observed rejection: debt and hold retained; unproven
        // physical state can never be claimed settled.
      },
    );
  };

  const owner = {
    retainActual: retain,
    retainFinalizerUntil: retain,
    // Fresh actual-debt observation on every call: resolves only at a
    // genuine zero of registered receipts, stays pending while any
    // rejected or unproven debt remains.
    whenSettled: () => {
      if (state.outstanding === 0) return Promise.resolve();
      return new Promise((resolve) => {
        state.waiters.add(resolve);
      });
    },
  };
  OWNERS.set(owner, state);
  return Object.freeze(owner);
}
