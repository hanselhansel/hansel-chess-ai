// processes.mjs owns the native process monitor behind its public API
// roster: the one request allocator, serialized request scheduling and
// sticky fault authority over ONE shared lifecycle state object. The
// whole collector lifecycle delegates to process-runtime.mjs, the wire
// to process-transport.mjs, cached ownership to process-ownership.mjs,
// gated lsof to process-lsof.mjs, native IO proof to
// process-proof.mjs, deadline capture/BudgetHandles/bounded waits and
// the serialized bounded queue to process-budget.mjs, the complete RSS
// cycle/terminal admission to process-observation.mjs (same-ref assembly
// in process-accounting.mjs, inspection helpers in process-inspections.mjs),
// and the closed
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
import { V2_POLICY } from "./evaluation-policy.mjs";
import { createResourceQuality, assertResourceEvidence } from "./resource-quality.mjs";
import { eqLiteral, freezeDeep } from "./schema-primitives.mjs";
import { RECORDED_PHASES } from "./schema-constants.mjs";
import { createProcessAccounting } from "./process-accounting.mjs";
import { createBoundedQueue } from "./process-budget.mjs";
import { createMonitorBackendCapture } from "./process-backend.mjs";
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
  expectedBackendIdentity = undefined,
  evaluationPolicy = null,
  phase = null,
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
  if (evaluationPolicy !== null) {
    eqLiteral(evaluationPolicy, V2_POLICY, "monitor evaluationPolicy");
    if (!RECORDED_PHASES.includes(phase) || phase === "watchdog-selftest") throw acct("monitor phase");
  } else if (phase !== null) throw acct("monitor policy/phase");
  const quality = evaluationPolicy === null ? null : createResourceQuality({ runId, phase });
  // One ledger and immutable per-handle diagnostic end. Neither grants IO.
  const cycleMetadata = new WeakMap();
  const lifetimeOwner =
    lifetime === undefined ? createWatchdogLifetime() : lifetime;
  if (lifetime !== undefined) assertWatchdogLifetime(lifetimeOwner);

  const ownership = createOwnership({ runId });
  const helperDir = path.dirname(helperPath);
  const helperPaths = HELPER_NAMES.map((n) => path.join(helperDir, n));
  const nowMonoMs = () => Number(BigInt(clock.nowMonoNs()) / 1000000n);
  const backendCapture = createMonitorBackendCapture({
    expectedBackendIdentity,
    captureOptions: {
      pythonExecutable, helperPaths, recordRoot, nowMonoMs,
      delay: (fn, ms) => clock.setTimeout(fn, ms),
      clearDelay: (t) => clock.clearTimeout(t),
    },
  });
  const constructorDeadlineMs =
    getDeadlineMonoMs === null ? null : getDeadlineMonoMs();
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

  const queue = createBoundedQueue({ clock, nowMonoMs });
  // Queue admission stays owned until actual body settlement, including expiry.
  const enqueue = (fn, handle) => queue.enqueue(() => {
    if (state.stopping) throw acct("monitor stopping");
    return fn();
  }, handle);
  const binding =
    horizon === null ? null : bindProcessHorizon({ reader: horizon, queue });

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

  const capture = createProcessOperationCapture({ clock, nowMonoMs, queue, readBounds });

  // Copy the original numeric minimum before enqueue; genuine narrowing wins.
  const op = (callOptions, ceilingMs) => {
    if (state.stopping) throw acct("monitor stopping");
    const handle = capture.op(callOptions, ceilingMs);
    cycleMetadata.set(handle, Object.freeze({ originalEndNs:
      BigInt(Math.floor(handle.deadlineMonoMs() * 1000000)).toString() }));
    return handle;
  };

  const ownOperation = createProcessLifetimeOwner({
    queue,
    retainActual: lifetimeOwner.retainActual,
  });

  const markFault = (e) => {
    const reason = ["IDENTITY", "TIMESTAMP", "UNION", "AGGREGATE"].includes(e?.resourceReason)
      ? e.resourceReason : e?.code === "CLEANUP_UNPROVEN" ? "CLEANUP" :
        e?.code === "IPC_INVALID" ? "TRANSPORT" : "NATIVE";
    quality?.markHard(reason);
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

  const send = (type, fields, rid, handle) => {
    if (state.stopping) throw acct("monitor stopping");
    return state.transport.send(type, fields, rid, handle);
  };

  const { proofs, observation, runCycle } = createProcessAccounting({
    runId, pythonExecutable, protocol, ownership, send, enqueue, nextRid,
    requireHealthy, lsofQueries: () => state.lsof, ownUid: () => state.ownUid,
    clock, quality, softCompare: quality !== null && phase === "compare",
    state: () => ({ lastObservation: lastObs, lastValidNs, stickyFault,
      stopping: state.stopping, pending: state.tickQueued,
      sampling: state.timer !== null, nowMonoNs: clock.nowMonoNs() }),
    commitCycle: (obs, finishedNs) => { lastObs = obs; lastValidNs = finishedNs; },
    markFault,
  });

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
    verifyExpectedBackend: backendCapture.verifyStartup,
    releaseHorizonAfter: binding === null ? null : binding.releaseAfter,
    hasAccountingFault: () => stickyFault !== null,
    proofs,
    runCycle: (h, purpose = "ordinary") => runCycle(h, { ...cycleMetadata.get(h),
      purpose: purpose === "periodic" && state.startHandle !== null ? "ordinary" : purpose }),
    closeCoverage: () => {
      if (quality !== null && quality.snapshot().completedCycles > 0) {
        quality.setPending(state.tickQueued);
        quality.close(String(clock.nowMonoNs()));
      }
    },
    getApi: () => api,
    registerHelper: (input, handle) =>
      enqueue(() => proofs.registerRootProved(input, handle), handle),
    signalHelper: (input, handle) =>
      enqueue(() => proofs.signalOwnedProved(input, handle), handle),
    proveTransition: (args, handle) =>
      enqueue(() => proofs.proveTransition(args, handle), handle),
  };

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

  const call = (fn, options) => {
    const h = op(options, TIMING_LIMITS.commandMs);
    const lifetime = ownOperation(h);
    return enqueue(() => fn(h), h).then((result) => {
      if (state.stopping && result?.kind !== "fenced-observation") throw acct("monitor stopping");
      return result;
    }).finally(() => lifetime.finish());
  };

  const callUnqueued = (fn, options) => {
    const h = op(options, TIMING_LIMITS.commandMs);
    const lifetime = ownOperation(h);
    return Promise.resolve()
      .then(() => {
        if (state.stopping) throw acct("monitor stopping");
        return fn(h, lifetime.retainActual);
      })
      .then((result) => {
        if (state.stopping) throw acct("monitor stopping");
        return result;
      })
      .finally(() => lifetime.finish());
  };

  const registerRoot = (input, options) =>
    call((h) => proofs.registerRootProved(input, h), options);

  const registerPort = ({ address, port, ownerIdentity, scopeRunId }) => {
    requireHealthy();
    if (state.stopping) throw acct("monitor stopping");
    ownership.registerPort({ address, port, ownerIdentity, scopeRunId });
  };

  const sample = (options) => call((h) => runCycle(h, { ...cycleMetadata.get(h), purpose: "ordinary" }), options);

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

  const backendIdentity = (options) =>
    callUnqueued(
      (h, retainActual) =>
        backendCapture.capture(state.readyEvidence, h, retainActual),
      options,
    );

  const lastObservation = () => {
    try { return observation.projectObservation(); }
    catch (error) { markFault(error); throw error; }
  };

  const fault = () => (stickyFault === null ? null : { ...stickyFault });
  const _ready = () => copyDeep(state.readyEvidence);

  const _captureResourcePrefix = ({ scopeRunId, deadlineMonoMs }) => {
    if (quality === null || phase !== "preflight" || scopeRunId !== `${runId}:watchdog-selftest` ||
      !Number.isFinite(deadlineMonoMs) || deadlineMonoMs < 0 || state.stopping) throw acct("prefix binding");
    const bounds = readBounds();
    const end = Math.min(deadlineMonoMs, bounds.constructorDeadlineMs ?? Infinity,
      bounds.laterDeadlineMs ?? Infinity);
    const at = String(clock.nowMonoNs());
    if (Number(BigInt(at)) / 1e6 >= end) throw acct("prefix deadline");
    requireHealthy();
    const q = quality.snapshot();
    if (stickyFault !== null || !lastObs?.cycleTimely || q.coverageLost || q.rssLimitExceeded ||
      BigInt(at) - BigInt(lastObs.atMonoNs) > 500000000n) throw acct("prefix current proof");
    const value = { ...q, pending: state.tickQueued, runId: scopeRunId, phase: "watchdog-selftest",
      closureKind: "selftest-prefix", coverageEndNs: at };
    assertResourceEvidence(value);
    return freezeDeep(value);
  };

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
    ...(quality === null ? {} : { _captureResourcePrefix }),
    _ownership: ownership,
  });
  MONITOR_LIFETIMES.set(api, lifetimeOwner);
  return api;
}
