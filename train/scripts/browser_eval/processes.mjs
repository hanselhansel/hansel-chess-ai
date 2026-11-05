// processes.mjs owns the native process monitor behind its public API
// roster: the one request allocator, serialized request scheduling and
// sticky fault authority over ONE shared lifecycle state object. The
// whole collector lifecycle delegates to process-runtime.mjs, the wire
// to process-transport.mjs, cached ownership to process-ownership.mjs,
// gated lsof to process-lsof.mjs, native IO proof to
// process-proof.mjs, deadline capture/BudgetHandles/bounded waits and
// the serialized bounded queue to process-budget.mjs, the complete RSS
// cycle and projection to process-observation.mjs, and the closed
// BackendIdentity capture to process-backend.mjs. Every async method
// accepts an optional trusted {deadlineMonoMs} harness budget: the
// captured horizon is computed once BEFORE enqueue as the minimum of
// the constructor-captured deadline, the later getter value, the call
// deadline and now plus the fixed operation ceiling, then ONE
// narrow-only BudgetHandle carries it through the queue, transport
// replies, proofs, observation and borrowed backend/lsof/runtime
// stages in the shared hrtime domain. No raw signal ever reaches a
// child: teardown goes through the wire or the private pipes, and an
// unsettled handle retains CLEANUP_UNPROVEN rather than a faked reap.
import { spawn } from "node:child_process";
import path from "node:path";

import { createOwnership } from "./process-ownership.mjs";
import {
  createProcessLifetimeOwner,
  createProcessOperationCapture,
  createProcessRuntime,
  realProcessClock as realClock,
} from "./process-runtime.mjs";
import {
  assertWatchdogLifetime,
  createWatchdogLifetime,
} from "./watchdog-lifetime.mjs";
import { bindProcessHorizon } from "./process-horizon.mjs";
import { createProcessProofs } from "./process-proof.mjs";
import { createProcessObservation } from "./process-observation.mjs";
import { createBoundedQueue } from "./process-budget.mjs";
import { captureBackendIdentity } from "./process-backend.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import {
  copyDeep,
  isAbs,
  isObj,
  strNE,
} from "./protocol-values.mjs";

const HELPER_NAMES = [
  "process-macos.py",
  "process-macos-native.py",
  "process-macos-abi.py",
];
const MAXFAULT = 4096;

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

// The genuine owner association is module-private and unforgeable.
const MONITOR_LIFETIMES = new WeakMap();

export function processMonitorLifetime(monitor) {
  const owner = MONITOR_LIFETIMES.get(monitor);
  return owner === undefined ? null : owner;
}

export function createProcessMonitor({
  runId,
  pythonExecutable,
  helperPath,
  protocol,
  clock = realClock,
  spawnImpl = spawn,
  recordRoot = process.cwd(),
  getDeadlineMonoMs = null,
  horizon = null,
  lifetime = undefined,
}) {
  if (
    !strNE(runId) ||
    !isAbs(pythonExecutable) ||
    !isAbs(helperPath) ||
    !isObj(protocol) ||
    typeof protocol.accept !== "function" ||
    typeof protocol.authorizeSignal !== "function" ||
    typeof protocol.authorizeExecGate !== "function" ||
    !isAbs(recordRoot) ||
    typeof spawnImpl !== "function" ||
    typeof clock.setTimeout !== "function" ||
    typeof clock.clearTimeout !== "function" ||
    typeof clock.setInterval !== "function" ||
    typeof clock.clearInterval !== "function" ||
    typeof clock.nowMonoNs !== "function" ||
    (getDeadlineMonoMs !== null && typeof getDeadlineMonoMs !== "function") ||
    // The branded horizon reader and the legacy getter are mutually
    // exclusive: there is only ONE shared bound source.
    (horizon !== null && getDeadlineMonoMs !== null)
  ) {
    throw acct("monitor options");
  }
  // An omitted lifetime mints ONE real-default owner for isolated
  // legacy use; a supplied owner (null included) must be genuinely
  // branded and is retained by exact identity, never copied/rebound.
  const lifetimeOwner =
    lifetime === undefined ? createWatchdogLifetime() : lifetime;
  if (lifetime !== undefined) assertWatchdogLifetime(lifetimeOwner);

  const ownership = createOwnership({ runId });
  const helperDir = path.dirname(helperPath);
  const helperPaths = HELPER_NAMES.map((n) => path.join(helperDir, n));
  // The constructor-captured absolute bound: later getter reads may
  // narrow it, never extend.
  const constructorDeadlineMs =
    getDeadlineMonoMs === null ? null : getDeadlineMonoMs();
  // The ONE shared lifecycle object: the runtime mutates it and the
  // proofs/observation/health checks read the same fields.
  const state = {
    child: null,
    transport: null,
    lsof: null,
    readyEvidence: null,
    ownUid: null,
    timer: null,
    tickQueued: false,
    stopping: false,
    startHandle: null,
    collectorPhysical: null,
    stopFlow: null,
  };
  let stickyFault = null;
  let lastObs = null;
  let lastValidNs = null;
  let reqNo = 0;

  const nextRid = (p) => `${p}-${runId}-${(reqNo += 1)}`;
  const nowMonoMs = () => Number(BigInt(clock.nowMonoNs()) / 1000000n);

  // The one serialized bounded queue: public promises settle at their
  // handles' expiry and op() narrows every tracked active AND queued
  // handle when a later trusted getter yields an earlier bound.
  const queue = createBoundedQueue({ clock, nowMonoMs });
  const enqueue = (fn, handle) => queue.enqueue(fn, handle);
  // A supplied branded horizon binds once here: every strict narrowing
  // synchronously reaches every live handle through the same narrowAll.
  const binding =
    horizon === null ? null : bindProcessHorizon({ reader: horizon, queue });

  // The trusted bound source for the capture owner: the branded
  // horizon supplies its immutable original end and current min and is
  // validated armed here — an unarmed operational horizon rejects
  // before any timer, queue acquisition or IO — while the legacy
  // getter path keeps its captured/later reads.
  const readBounds = () => {
    if (binding !== null && binding.readDeadlineMonoMs() === null) {
      throw acct("unarmed horizon");
    }
    return binding === null
      ? {
          constructorDeadlineMs,
          laterDeadlineMs:
            getDeadlineMonoMs === null ? null : getDeadlineMonoMs(),
        }
      : {
          constructorDeadlineMs: binding.originalDeadlineMonoMs(),
          laterDeadlineMs: binding.readDeadlineMonoMs(),
        };
  };

  // The whole bound/handle capture owner, hosted by the runtime's
  // declared factory over the same clock, queue and bound source.
  const capture = createProcessOperationCapture({ clock, nowMonoMs, queue, readBounds });

  // Capture once BEFORE enqueue into ONE narrow-only handle: the
  // stopping fence permanently closes new ordinary admission; the
  // bare captureOperationBound stays fence-free so repeated stops
  // still validate and narrow after the fence is closed.
  const op = (callOptions, ceilingMs) => {
    if (state.stopping) throw acct("monitor stopping");
    return capture.op(callOptions, ceilingMs);
  };

  // One operation's actual-settlement lifetime over the SAME queue
  // acquisitions, from the runtime's shared-owner factory: each
  // operation's actualSettled registers on the SAME supervisor owner.
  const ownOperation = createProcessLifetimeOwner({
    queue,
    retainActual: lifetimeOwner.retainActual,
  });

  const markFault = (e) => {
    if (stickyFault === null) {
      stickyFault = {
        code: e && typeof e.code === "string" ? e.code : "ACCOUNTING_UNAVAILABLE",
        detail: String((e && e.message) || e).slice(0, MAXFAULT),
        atMonoNs: String(clock.nowMonoNs()),
      };
    }
  };

  const requireHealthy = () => {
    if (stickyFault !== null) {
      const e = acct("monitor fault");
      e.fault = { ...stickyFault };
      throw e;
    }
    if (state.transport === null || state.transport.exited) {
      throw acct("collector not running");
    }
  };

  const send = (type, fields, rid, handle) =>
    state.transport.send(type, fields, rid, handle);

  // The one native-proof owner over this monitor's shared state via
  // explicit callbacks; it keeps no parallel state of its own.
  const proofs = createProcessProofs({
    runId,
    pythonExecutable,
    protocol,
    ownership,
    send,
    enqueue,
    nextRid,
    requireHealthy,
    lsofQueries: () => state.lsof,
    ownUid: () => state.ownUid,
  });

  // The one RSS-observation owner: the bounded coverage cycle through
  // this monitor's send/allocator/registry and commit callbacks.
  const observation = createProcessObservation({
    ownership,
    send,
    nextRid,
    requireHealthy,
    clock,
    state: () => ({
      lastObservation: lastObs,
      lastValidNs,
      stickyFault,
      sampling: state.timer !== null,
      nowMonoNs: clock.nowMonoNs(),
    }),
    commitCycle: (obs, finishedNs) => {
      lastObs = obs;
      lastValidNs = finishedNs;
    },
  });

  // Any failed cycle latches the fault and leaves the retained LAST
  // VALID observation current-invalid.
  const runCycle = (handle) =>
    observation.runCycle(handle).catch((e) => {
      markFault(e);
      throw e;
    });

  // The borrowed authorities the runtime consumes: its nested lsof
  // registration/signal enqueue real proof work on the SAME queue with
  // the SAME borrowed handle, never disposing the owner handle.
  const authority = {
    op,
    ownOperation,
    enqueue,
    queue,
    nextRid,
    markFault,
    captureOperationBound: capture.captureOperationBound,
    nowMonoMs,
    retainSupervisorActual: lifetimeOwner.retainActual,
    releaseHorizonAfter: binding === null ? null : binding.releaseAfter,
    hasAccountingFault: () => stickyFault !== null,
    proofs,
    runCycle,
    getApi: () => api,
    registerHelper: (input, handle) =>
      enqueue(() => proofs.registerRootProved(input, handle), handle),
    signalHelper: (input, handle) =>
      enqueue(() => proofs.signalOwnedProved(input, handle), handle),
    proveTransition: (args, handle) =>
      enqueue(() => proofs.proveTransition(args, handle), handle),
  };

  // The whole collector lifecycle owner over the shared state.
  const runtime = createProcessRuntime({
    config: {
      runId,
      pythonExecutable,
      helperPath,
      protocol,
      clock,
      spawnImpl,
      recordRoot,
    },
    state,
    authority,
  });

  const start = (options) => runtime.start(options);

  // One ordinary public op: capture a handle plus its actual-settlement
  // lifetime BEFORE enqueue, dispatch the SAME handle through the queue
  // and release only the owner acquisition in the public finally — the
  // handle is disposed when every actual acquisition reaches zero,
  // never when the public promise merely timed out.
  const call = (fn, options) => {
    const h = op(options, TIMING_LIMITS.commandMs);
    const lifetime = ownOperation(h);
    return enqueue(() => fn(h), h).finally(() => lifetime.finish());
  };

  // The same capture/lifetime for work that never enters the queue:
  // queryListeners runs through the proof/lsof owners and
  // backendIdentity borrows the handle for its own IO stages, and each
  // receives the lifetime's retainActual registrar so its physical IO
  // receipts stay acquired until real settlement. fn runs inside a
  // Promise continuation so synchronous validation errors still reach
  // finish(); the handle stays queue-tracked through the owner
  // acquisition so a later narrower getter still reaches it until the
  // ACTUAL unqueued task settles.
  const callUnqueued = (fn, options) => {
    const h = op(options, TIMING_LIMITS.commandMs);
    const lifetime = ownOperation(h);
    return Promise.resolve()
      .then(() => fn(h, lifetime.retainActual))
      .finally(() => lifetime.finish());
  };

  const registerRoot = (input, options) =>
    call((h) => proofs.registerRootProved(input, h), options);

  const registerPort = ({ address, port, ownerIdentity, scopeRunId }) => {
    requireHealthy();
    if (state.stopping) throw acct("monitor stopping");
    ownership.registerPort({ address, port, ownerIdentity, scopeRunId });
  };

  const sample = (options) => call((h) => runCycle(h), options);

  const probeIdentity = (identity, options) =>
    call((h) => proofs.probeIdentityFresh(identity, h), options);

  const signalOwned = (input, options) =>
    call((h) => proofs.signalOwnedProved(input, h), options);

  const queryListeners = (scopeRunId, options) =>
    callUnqueued(
      (h, retainActual) =>
        proofs.queryListenersScoped(scopeRunId, h, { retainActual }),
      options,
    );

  const stopAndReap = (options) => runtime.stopAndReap(options);

  // The backend capture borrows this op's handle (documented private
  // `budget` option) and the monitor's own clock adapters, so one
  // injected clock drives every stat/read/hash/close wait.
  const backendIdentity = (options) =>
    callUnqueued(
      (h, retainActual) =>
        captureBackendIdentity({
          ready: state.readyEvidence,
          pythonExecutable,
          helperPaths,
          recordRoot,
          budget: h,
          retainActual,
          nowMonoMs,
          delay: (fn, ms) => clock.setTimeout(fn, ms),
          clearDelay: (t) => clock.clearTimeout(t),
        }),
      options,
    );

  const lastObservation = () => observation.projectObservation();

  const fault = () => (stickyFault === null ? null : { ...stickyFault });
  const _ready = () => copyDeep(state.readyEvidence);

  const api = Object.freeze({
    start,
    registerRoot,
    registerPort,
    sample,
    probeIdentity,
    signalOwned,
    queryListeners,
    stopAndReap,
    backendIdentity,
    lastObservation,
    fault,
    _ready,
    _ownership: ownership,
  });
  MONITOR_LIFETIMES.set(api, lifetimeOwner);
  return api;
}
