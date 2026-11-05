// process-runtime.mjs owns the WHOLE collector lifecycle extracted
// from processes.mjs under the readable-runtime split decision: real
// spawn and the bootstrap-ready wait, the bootstrap proof, lsof
// composition, the first covering observation, the 250 ms sampling
// tick, and the shared createProcessLifetimeOwner factory; the whole
// stop flow delegates to process-stop.mjs over the same state, clock
// and borrowed authorities. It holds no second queue, request
// allocator, fault, clock or state authority: config carries the
// monitor's fixed inputs, state is the monitor's ONE shared mutable
// lifecycle object, and every wait consumes a borrowed BudgetHandle
// captured through authority.op on the monitor's same clock domain.
// The factories are pure and lazy — no spawn, timer or IO runs at
// construction.
import { createCollectorTransport } from "./process-transport.mjs";
import { createLsofQueries } from "./process-lsof.mjs";
import { createProcessStop } from "./process-stop.mjs";
import {
  captureDeadlineMs,
  createBudgetHandle,
} from "./process-budget.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { copyDeep, isObj } from "./protocol-values.mjs";

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

// The fixed collector argv: isolation flags, the pinned helper,
// collector mode and the run/supervisor bindings.
const collectorArgv = (helperPath, runId) => [
  "-I",
  "-B",
  helperPath,
  "--collector",
  "--run-id",
  runId,
  "--supervisor-pid",
  String(process.pid),
];

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
  const {
    runId,
    pythonExecutable,
    helperPath,
    protocol,
    clock,
    spawnImpl,
  } = config;

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

  // The whole start path under ONE readiness handle and ONE
  // ownOperation lifetime: a live-check and the stopping fence gate
  // the actual spawn (a spent bound or closed admission performs no
  // IO), the bootstrap-ready wait, the native bootstrap proof, the
  // optional trusted static-backend comparison, lsof composition,
  // the sample interval and the first covering cycle all
  // consume the same borrowed handle, and the public finally releases
  // only the owner acquisition — the handle is disposed when actual
  // settlement completes, not when the public promise settles. After
  // every awaited stage and before ready/UID/lsof/timer/first-cycle
  // commit and successful return, the fence is rechecked so a pending
  // start can never activate a new timer/cycle/healthy ready after
  // the first stop.
  const start = async (options) => {
    const h = authority.op(options, TIMING_LIMITS.readinessMs);
    const lifetime = authority.ownOperation(h);
    const finish = () => lifetime.finish();
    if (state.child !== null || state.transport !== null) {
      finish();
      throw acct("monitor started");
    }
    if (state.stopping) {
      finish();
      throw acct("monitor stopping");
    }
    state.startHandle = h;
    let settleCollector = null;
    try {
      h.assertLive("start deadline");
      // ONE collector physical debt on the SAME shared supervisor
      // owner, pre-armed BEFORE spawn and OUTSIDE the ordinary
      // queue — ordinary drain can never wait on collector exit
      // before shutdown is issued. Only the real
      // transport.whenReaped() fulfillment (exit plus BOTH output
      // closes) fulfills it; a raw spawn result/error, public reap,
      // end or destroy never does.
      const collectorPhysical = new Promise((resolve) => {
        settleCollector = resolve;
      });
      authority.retainSupervisorActual(collectorPhysical);
      state.collectorPhysical = collectorPhysical;
      if (state.stopping) throw acct("monitor stopping");
      const spawned = spawnImpl(
        pythonExecutable,
        collectorArgv(helperPath, runId),
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      if (spawned === null || spawned === undefined) {
        // The definite no-creation branch: no handle was returned at
        // all, so the never-acquired receipt retires in the catch.
        throw acct("collector spawn");
      }
      // ANY returned handle is adopted BEFORE shape/PID or bootstrap
      // validation — a real ChildProcess or EventEmitter is not a
      // plain JSON object. Transport/error/pipe/physical ownership is
      // installed on it first: a returned pid-less/failed child or an
      // ambiguous transport failure keeps its truthful exit/pipe
      // settlement through the pre-armed shared collector debt, and a
      // set state.child is never later read as absence.
      state.child = spawned;
      state.transport = createCollectorTransport({
        child: state.child,
        protocol,
        runId,
        clock,
        readyDeadlineMs: TIMING_LIMITS.readinessMs,
        onFault: authority.markFault,
        onInbound: (msg) => {
          if (msg.type === "accounting-fault") {
            authority.markFault(acct(`collector ${msg.reason}`));
          }
        },
      });
      state.transport.whenReaped().then(
        () => settleCollector(),
        () => {},
      );
      if (state.stopping) throw acct("monitor stopping");
      if (typeof state.child.pid !== "number") {
        throw acct("collector spawn");
      }
      const ready = await state.transport.awaitReady(h);
      // The live original handle AND the monotonic fence are rechecked
      // after every awaited stage and before any commit: a stop that
      // lands between the bounded fulfillment and this continuation
      // must never promote late readiness or start fresh work.
      h.assertLive("start deadline");
      if (state.stopping) throw acct("monitor stopping");
      // Native bootstrap proof binds the declared tuples to the actual
      // spawn handle, the supervisor tuple, resolved executables,
      // lineage and one UID before own-roots activates registrations.
      const boot = await authority.enqueue(
        () =>
          authority.proofs.proveBootstrap(
            { ready, childPid: state.child.pid },
            h,
          ),
        h,
      );
      h.assertLive("start deadline");
      if (state.stopping) throw acct("monitor stopping");
      // C4b-09: when configured, the static backend-identity
      // expectation is compared against a FRESH capture on the SAME
      // start handle and operation retainer before any ready commit.
      if (authority.verifyExpectedBackend != null) {
        await authority.verifyExpectedBackend(ready, h, lifetime.retainActual);
        h.assertLive("start deadline");
        if (state.stopping) throw acct("monitor stopping");
      }
      state.ownUid = boot.ownUid;
      state.readyEvidence = ready;
      state.lsof = createLsofQueries({
        registerHelper: authority.registerHelper,
        signalHelper: authority.signalHelper,
        proveTransition: authority.proveTransition,
        protocol,
        runId,
        pythonExecutable,
        helperPath,
        clock,
        spawnImpl,
      });
      state.timer = clock.setInterval(tick, TIMING_LIMITS.sampleMs);
      await authority.enqueue(() => authority.runCycle(h), h);
      h.assertLive("start deadline");
      if (state.stopping) {
        // A stop captured the fence while the first cycle ran: no
        // late healthy ready may be claimed after admission closed.
        throw acct("monitor stopping");
      }
      state.startHandle = null;
      finish();
      return copyDeep(state.readyEvidence);
    } catch (e) {
      authority.markFault(e);
      state.startHandle = null;
      // Definite no-creation may retire the never-opened collector
      // receipt; a returned/ambiguous child or an unadopted transport
      // keeps the shared debt held.
      if (state.child === null && settleCollector !== null) {
        settleCollector();
      }
      // A standalone bootstrap failure may attempt the wire-only
      // teardown only while its original handle is live and the stop
      // flow has not taken cleanup ownership; an unreaped child stays
      // on the shared collector debt, never on the START handle.
      if (state.transport !== null && !state.stopping) {
        try {
          await stopOwner.teardownCollector(h);
        } catch {
          authority.markFault(unproven("bootstrap child reap"));
          finish();
          throw unproven("bootstrap child reap");
        }
      }
      finish();
      throw e;
    }
  };

  return Object.freeze({ start, stopAndReap: stopOwner.stopAndReap });
}
