// process-runtime.mjs owns the WHOLE collector lifecycle extracted
// from processes.mjs under the readable-runtime split decision: real
// start group (delegated whole to process-runtime-start.mjs), the
// first covering observation, and the 250 ms sampling
// tick, and the shared createProcessLifetimeOwner factory; the whole
// stop flow delegates to process-stop.mjs over the same state, clock
// and borrowed authorities. It holds no second queue, request
// allocator, fault, clock or state authority: config carries the
// monitor's fixed inputs, state is the monitor's ONE shared mutable
// lifecycle object, and every wait consumes a borrowed BudgetHandle
// captured through authority.op on the monitor's same clock domain.
// The factories are pure and lazy — no spawn, timer or IO runs at
// construction.
import { createProcessStart } from "./process-runtime-start.mjs";
import { createProcessStop } from "./process-stop.mjs";
import {
  captureDeadlineMs,
  createBudgetHandle,
} from "./process-budget.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { isObj } from "./protocol-values.mjs";

// The ONE real clock declaration, moved whole from processes.mjs: the
// facade imports it as its default `realClock`. The literal only
// binds the timer globals and the lazy hrtime reader; nothing runs.
export const realProcessClock = {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  nowMonoNs: () => process.hrtime.bigint().toString(),
};

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

const unproven = (detail) => {
  const e = new Error(`CLEANUP_UNPROVEN ${detail}`);
  e.code = "CLEANUP_UNPROVEN";
  return e;
};

// One operation's actual-settlement lifetime over the SAME queue
// acquisitions, hosted here as the shared-owner factory: the owner
// track acquisition is taken immediately, actualSettled is captured
// while that acquisition is held, and the operation's real settlement
// is synchronously registered on the SAME supervisor owner registrar
// BEFORE return and before enqueue/spawn/unqueued work — never a
// public timeout promise. If registration throws, no IO was issued
// and only the never-issued setup ownership is released. finish()
// releases only the owner acquisition once; the per-operation
// retainActual(p) takes one more acquisition released exactly when
// the physical settlement receipt p (created BEFORE its IO is
// initiated) proves real settlement — a REJECTED receipt stays
// unproven debt, its rejection observed so it can never surface as an
// unhandled late failure; and the handle is disposed only when
// actualSettled fulfills after every acquisition reaches zero, never
// on public finally.
export function createProcessLifetimeOwner({ queue, retainActual }) {
  if (
    !isObj(queue) ||
    typeof queue.track !== "function" ||
    typeof queue.whenSettled !== "function" ||
    typeof retainActual !== "function"
  ) {
    throw acct("lifetime owner");
  }
  const retainSupervisorActual = retainActual;
  const ownOperation = (handle) => {
    const releaseOwner = queue.track(handle);
    const actualSettled = queue.whenSettled(handle);
    try {
      retainSupervisorActual(actualSettled);
    } catch (e) {
      releaseOwner();
      throw e;
    }
    let finished = false;
    actualSettled.then(
      () => handle.dispose(),
      () => {},
    );
    return {
      finish: () => {
        if (finished) return;
        finished = true;
        releaseOwner();
      },
      retainActual: (p) => {
        const release = queue.track(handle);
        p.then(release, () => {});
      },
      actualSettled,
    };
  };
  return ownOperation;
}

// The whole bound/handle capture owner moved here from processes.mjs
// under the cohesive capture-owner move: numeric capture BEFORE
// BudgetHandle creation with the same strict min rule — it never
// widens a bound — and the ONE narrow-only handle factory over the
// shared clock and queue. The caller's readBounds supplies the
// trusted original/current bounds and any armed-horizon validation;
// a current bound also synchronously narrows every live tracked
// handle. Construction invokes nothing.
export function createProcessOperationCapture({
  clock,
  nowMonoMs,
  queue,
  readBounds,
}) {
  if (
    !isObj(clock) ||
    typeof clock.setTimeout !== "function" ||
    typeof clock.clearTimeout !== "function" ||
    typeof nowMonoMs !== "function" ||
    !isObj(queue) ||
    typeof queue.narrowAll !== "function" ||
    typeof readBounds !== "function"
  ) {
    throw acct("capture options");
  }
  const captureOperationBound = (callOptions, ceilingMs) => {
    const bounds = readBounds();
    if (!isObj(bounds)) throw acct("capture bounds");
    if (bounds.laterDeadlineMs !== null) {
      queue.narrowAll(bounds.laterDeadlineMs);
    }
    return captureDeadlineMs({
      nowMonoMs: nowMonoMs(),
      constructorDeadlineMs: bounds.constructorDeadlineMs,
      laterDeadlineMs: bounds.laterDeadlineMs,
      callOptions,
      ceilingMs,
    });
  };
  const op = (callOptions, ceilingMs) =>
    createBudgetHandle({
      deadlineMonoMs: captureOperationBound(callOptions, ceilingMs),
      clock,
      nowMonoMs,
    });
  return Object.freeze({ captureOperationBound, op });
}

export function createProcessRuntime({ config, state, authority }) {
  if (
    !isObj(config) ||
    !isObj(state) ||
    !isObj(authority) ||
    typeof authority.op !== "function" ||
    typeof authority.ownOperation !== "function" ||
    typeof authority.enqueue !== "function" ||
    !isObj(authority.queue) ||
    typeof authority.queue.settled !== "function" ||
    typeof authority.queue.narrowAll !== "function" ||
    typeof authority.nextRid !== "function" ||
    typeof authority.markFault !== "function" ||
    typeof authority.hasAccountingFault !== "function" ||
    !isObj(authority.proofs) ||
    typeof authority.proofs.proveBootstrap !== "function" ||
    typeof authority.runCycle !== "function" ||
    typeof authority.getApi !== "function" ||
    typeof authority.registerHelper !== "function" ||
    typeof authority.signalHelper !== "function" ||
    typeof authority.proveTransition !== "function" ||
    typeof authority.retainSupervisorActual !== "function" ||
    typeof authority.captureOperationBound !== "function" ||
    typeof authority.nowMonoMs !== "function" ||
    (authority.releaseHorizonAfter !== null &&
      typeof authority.releaseHorizonAfter !== "function") ||
    (authority.verifyExpectedBackend != null &&
      typeof authority.verifyExpectedBackend !== "function") ||
    !isObj(config.clock) ||
    typeof config.clock.setInterval !== "function" ||
    typeof config.clock.clearInterval !== "function" ||
    typeof config.spawnImpl !== "function"
  ) {
    throw acct("runtime options");
  }
  const { clock } = config;

  // The whole stop flow over the SAME shared state, clock and
  // borrowed authorities: the stopping fence, pending-start
  // interruption, one min-only stop handle/flow, the actual ordinary
  // drain, the passive collector barrier and collector-last reap.
  const stopOwner = createProcessStop({ state, clock, authority });

  // At most one interval cycle is ever queued or in flight; a stalled
  // cycle blocks later ticks rather than accumulating pending samples.
  // The tick owns its actual-settlement lifetime: tickQueued resets
  // only when the zero-acquisitions promise resolves, so a public
  // expiry can never admit a second tick while the old actual queue
  // item is still pending. The stopping fence closes tick admission
  // permanently.
  const tick = () => {
    if (state.tickQueued || state.stopping || authority.hasAccountingFault()) {
      return;
    }
    state.tickQueued = true;
    const dl = authority.op(undefined, TIMING_LIMITS.commandMs);
    const lifetime = authority.ownOperation(dl);
    lifetime.actualSettled.then(() => {
      state.tickQueued = false;
    });
    authority
      .enqueue(() => authority.runCycle(dl), dl)
      .catch(() => {})
      .finally(() => lifetime.finish());
  };

  const start = createProcessStart({
    config,
    state,
    authority,
    stopOwner,
    tick,
    makeAccountingError: acct,
    makeCleanupError: unproven,
  });

  return Object.freeze({ start, stopAndReap: stopOwner.stopAndReap });
}
