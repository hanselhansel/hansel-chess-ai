// process-horizon.mjs is the pure branded one-shot original-end and
// min-only horizon owner. createNativeHorizon mints a private
// WeakMap-branded owner and frozen readonly reader: read() is null
// while unarmed, initialize arms exactly once, and narrow publishes
// only a strictly lower bound. Every bound is stored BEFORE any
// listener runs and ALL live subscribers are invoked synchronously
// despite individual exceptions; the FIRST thrown value — even a
// listener throwing null or undefined — is rethrown only after all
// ran, so a faulting listener can never skip cleanup for the rest.
// bindProcessHorizon subscribes the SAME
// queue.narrowAll so a strict update reaches already acquired ACTIVE,
// QUEUED and UNQUEUED-tracked BudgetHandles, and releaseAfter detaches
// only on the runtime's truthful actual drain/reap fulfillment. There
// is no timer, clock, queue, process, IO, reset, extension or status
// authority here. Functional runtime input.

import { isObj } from "./protocol-values.mjs";

const OWNERS = new WeakMap();
const READERS = new WeakMap();

const fail = (detail) => {
  const error = new Error(`process-horizon ${detail}`);
  error.code = "PROCESS_HORIZON";
  return error;
};

// A bound is a finite nonnegative safe-integer absolute hrtime-ms
// value; every other shape fails closed, never defaults or clamps.
const isBound = (value) => Number.isSafeInteger(value) && value >= 0;

// Owner-brand identity guard: only an owner minted by
// createNativeHorizon below carries a WeakMap entry and returns void;
// any other value — primitive, null, forged, spread or proxy — fails
// closed. It proves brand identity alone, never pairing, reader
// binding, state or runtime truth.
export function assertNativeHorizon(owner) {
  if (!OWNERS.has(owner)) throw fail("owner brand");
}

export function createNativeHorizon() {
  const state = { bound: null, armed: false, listeners: new Set() };

  // Every live subscriber is invoked synchronously; whether a failure
  // was observed is tracked separately from its value so the FIRST
  // thrown value — including a listener throwing null or undefined —
  // is captured unchanged and rethrown only after all ran.
  const publish = () => {
    let failed = false;
    let first;
    for (const callback of [...state.listeners]) {
      try {
        callback(state.bound);
      } catch (error) {
        if (!failed) {
          failed = true;
          first = error;
        }
      }
    }
    if (failed) throw first;
  };

  const reader = {
    read: () => state.bound,
    subscribe: (callback) => {
      if (typeof callback !== "function") throw fail("subscribe callback");
      state.listeners.add(callback);
      if (state.armed) {
        try {
          callback(state.bound);
        } catch (error) {
          // A failing immediate subscription removes its just-added
          // listener before throwing: it is never left half-registered.
          state.listeners.delete(callback);
          throw error;
        }
      }
      let off = false;
      return () => {
        if (off) return;
        off = true;
        state.listeners.delete(callback);
      };
    },
  };

  const initialize = (deadlineMonoMs) => {
    if (state.armed) throw fail("initialize once");
    if (!isBound(deadlineMonoMs)) throw fail("initialize bound");
    state.bound = deadlineMonoMs;
    state.armed = true;
    publish();
  };

  const narrow = (deadlineMonoMs) => {
    if (!state.armed) throw fail("narrow before initialize");
    if (!isBound(deadlineMonoMs)) throw fail("narrow bound");
    // Min-only: an equal or wider supplied bound changes nothing.
    if (deadlineMonoMs >= state.bound) return;
    state.bound = deadlineMonoMs;
    publish();
  };

  const owner = { reader: Object.freeze(reader), initialize, narrow };
  OWNERS.set(owner, state);
  READERS.set(owner.reader, state);
  return Object.freeze(owner);
}

// Subscribes the shared bounded queue's narrowAll to every published
// bound so strict narrowing synchronously reaches already acquired
// active, queued and unqueued-tracked handles — their transport
// pending replies, backpressure and borrowed waits — with no second
// queue, dummy query refresh or public native.narrow. The first
// published bound is captured once as the immutable original phase
// end; releaseAfter removes the subscription only when the runtime's
// truthful actual settlement fulfills — a rejection or unproven debt
// retains it, and releasing creates no new work or proof.
export function bindProcessHorizon({ reader, queue } = {}) {
  if (!READERS.has(reader)) throw fail("reader brand");
  if (!isObj(queue) || typeof queue.narrowAll !== "function") {
    throw fail("queue narrowAll");
  }
  let original = null;
  const unsubscribe = reader.subscribe((bound) => {
    if (original === null) original = bound;
    queue.narrowAll(bound);
  });
  const binding = {
    originalDeadlineMonoMs: () => original,
    readDeadlineMonoMs: () => reader.read(),
    releaseAfter: (actualSettlementPromise) => {
      Promise.resolve(actualSettlementPromise).then(
        () => unsubscribe(),
        () => {
          // Rejected or unproven settlement retains the subscription:
          // actual drain/reap was never truthfully observed.
        },
      );
    },
  };
  return Object.freeze(binding);
}
