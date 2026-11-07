// Public Watchdog facade over the one grouped run state and first-stop latch.
// Runtime, operations, records and shutdown retain their existing ownership;
// Native/proof/driver resources remain owned by their dedicated modules.
// Every first stop captures and narrows the original cleanup bound once.
import { createWatchdogFaultRecorder } from "./watchdog-faults.mjs";
import { copyDeep } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { captureWatchdogRuntimeConfig, runWatchdogLifecycle } from "./watchdog-runtime.mjs";
import {
  createWatchdogShutdown,
  createWatchdogCleanupArgs,
} from "./watchdog-shutdown.mjs";

const L = FIXED_LIMITS;
const T = L.timing;
const realClock = {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  nowMonoMs: () => Number(process.hrtime.bigint() / 1000000n),
  nowUtc: () => new Date().toISOString(),
};

const fail = (code, detail) => {
  const e = new Error(`watchdog ${code}: ${detail}`);
  e.code = code;
  return e;
};
const strNE = (s) => typeof s === "string" && s.length > 0;
const OP_CEILING = {
  readiness: T.readinessMs,
  command: T.commandMs,
};

export function createWatchdog(options) {
  const { config, capabilities } = captureWatchdogRuntimeConfig(options, realClock);
  const { clock, monitor } = capabilities;

  // ONE shared mutable private state. No second state or validator.
  const state = {
    started: false,
    running: null,
    runningWritten: false,
    driverIdentity: null,
    helloOk: false,
    monitorStartAttempted: false,
    lastHb: null,
    driverClosed: false,
    finishReq: null,
    stopReq: null,
    channel: null,
    liveOp: null,
    liveOpTimer: null,
    records: null,
    ops: null,
    // The ONE private reference to an in-flight initial or periodic
    // filesystem scan body — an actual promise only, never proof or a
    // ledger.
    resourceTask: null,
    admissionTask: null,
    phaseEnd: Infinity,
    workEnd: Infinity,
    cleanupStart: null,
    cleanupEnd: null,
    selftest: {
      id: `${config.runId}:preflight-selftest`,
      invoked: false,
      controller: null,
      completionRef: null,
      verified: null,
    },
  };

  const now = () => clock.nowMonoMs();
  const nowNs = () => BigInt(Math.floor(now() * 1e6));

  // The genuine recorder's timed runtime binds ONCE here — purely,
  // before any adapter use and with no clock read at construction: the
  // derived shared owner, the SAME existing now closure passed
  // uninvoked and the descriptive settlement callback.
  capabilities.recorder.bindRuntime({
    lifetime: capabilities.lifetime,
    nowMonoMs: now,
    onBookkeepingSettlement: capabilities.onBookkeepingSettlement ?? undefined,
  });

  const timers = new Set();
  const later = (fn, ms) => {
    const t = clock.setTimeout(fn, Math.max(0, ms));
    timers.add(t);
    return t;
  };
  const clearT = (t) => {
    timers.delete(t);
    clock.clearTimeout(t);
  };
  const clearAll = () => {
    for (const t of timers) clearT(t);
  };

  const { faults, recordFault } = createWatchdogFaultRecorder({ nowNs,
    lifetime: capabilities.lifetime, scope: config.selftestPhase ? "selftest" : "phase" });

  // The sticky Native overage flag: a retained historical observed fact —
  // never a fresh sample — checked before ordinary admission, before a
  // finish may be admitted and again after cleanup before finalization.
  const rssExceeded = () => {
    try {
      const mo = monitor.lastObservation();
      return mo !== null && mo.rssLimitExceeded === true;
    } catch {
      return false;
    }
  };

  // The ONE original cleanup horizon: captured exactly once at the first
  // failure stop OR the admitted normal finish, capped by the original
  // phaseEnd. Repeated getters never make a fresh now+5000 window.
  const captureCleanupBound = () => {
    if (state.cleanupEnd !== null) return;
    state.cleanupStart = now();
    state.cleanupEnd = Math.min(state.cleanupStart + T.cleanupMs, state.phaseEnd);
  };

  // Narrow the supplied Native horizon to the JUST-captured original
  // cleanup end — synchronously, before any record write, PGN freeze,
  // first-stop hook or wake. A listener throw is routed through the
  // same fault authority and the stop/finish sequence still continues;
  // nested selftest runs hold no writer (config rejects it), so this
  // stays an inert no-op there.
  const narrowHorizonToCleanupEnd = () => {
    if (capabilities.nativeHorizon === null || state.cleanupEnd === null)
      return;
    try {
      capabilities.nativeHorizon.narrow(state.cleanupEnd);
    } catch (e) {
      recordFault(e);
    }
  };

  let resolveWake = null;
  const wake = new Promise((r) => {
    resolveWake = r;
  });
  const firstStopHooks = new Set();

  // The single first-stop authority: synchronous, independent of driver or
  // record IO. Captures the cleanup bound, closes ordinary admission, freezes
  // PGN with the REAL reason, aborts a pending selftest callback and wakes
  // the run. Late end/finish can never revive it.
  const latchStop = (reason) => {
    if (state.stopReq !== null) return;
    state.stopReq = {
      reason: strNE(reason) ? reason : "REQUESTED",
      atMonoNs: nowNs(),
    };
    state.ops?.closeOrdinaryAdmission();
    captureCleanupBound();
    narrowHorizonToCleanupEnd();
    capabilities.finalIntegrity?.interrupt(reason);
    // Facade-owned phase/work/heartbeat/resource/operation timers end
    // with admission — Native and cleanup-owned clock handles are
    // untouched — so a later filesystem-only seal can never produce a
    // fresh phase timeout or status mutation.
    clearAll();
    if (state.records !== null) {
      state.records.freeze({
        stopReason: state.stopReq.reason,
        atMonoNs: state.stopReq.atMonoNs,
      });
    }
    for (const fn of firstStopHooks) {
      try {
        fn();
      } catch {}
    }
    resolveWake();
  };
  const requestStop = (reason) => latchStop(reason);
  const stopped = () => state.stopReq !== null;
  const admissionOpen = () =>
    state.stopReq === null &&
    !state.driverClosed &&
    state.finishReq === null &&
    !rssExceeded();

  // Synchronous finish admission: the sticky overage flag is checked BEFORE
  // the finish may be admitted (a latched overage turns it into a resource
  // stop, never an admitted pass). An admitted finish copies the request,
  // closes ordinary admission, freezes PGN evidence with the actual null
  // reason, captures the same original cleanup bound once and wakes the run.
  // A late finish after any stop or driver close is ignored.
  const noteFinish = (msg) => {
    const mo = monitor.lastObservation();
    if (mo !== null && mo.rssLimitExceeded === true) {
      const e = fail("RESOURCE_RSS", `peak ${mo.peakRssBytes}`);
      // Retain the actual separate current/peak/flag/time/verdict for the
      // rapid high -> lower -> finish race through the existing resource
      // lane — the fault detail alone never replaces real observations.
      const rssBytes = Number.isSafeInteger(mo.rssBytes) ? mo.rssBytes : null;
      const peakRssBytes = Number.isSafeInteger(mo.peakRssBytes) ? mo.peakRssBytes : null;
      const accountingValid = mo.accountingValid === true;
      const atMonoNs = mo.atMonoNs !== undefined ? `${mo.atMonoNs}` : null;
      recordFault(e);
      latchStop(e.code);
      if (state.records !== null) {
        void state.records
          .recordEvent("resource", {
            rssBytes,
            peakRssBytes,
            rssLimitExceeded: true,
            accountingValid,
            atMonoNs,
          })
          .catch(recordFault);
      }
      return;
    }
    if (!admissionOpen()) return;
    if (capabilities.finalIntegrity !== null && !capabilities.finalIntegrity.isComplete()) {
      recordFault(fail("FINAL_INTEGRITY", "finish without completed own scan"));
      latchStop("FINAL_INTEGRITY");
      return;
    }
    state.finishReq = copyDeep(msg);
    state.ops?.closeOrdinaryAdmission();
    captureCleanupBound();
    narrowHorizonToCleanupEnd();
    clearAll();
    if (state.records !== null) {
      state.records.freeze({ stopReason: null, atMonoNs: nowNs() });
    }
    resolveWake();
  };

  const workRemainingMs = () => Math.max(0, state.workEnd - now());
  // The captured end governs; before capture the bound is the phase end —
  // never a recomputed now+5000.
  const cleanupRemainingMs = () =>
    Math.max(
      0,
      (state.cleanupEnd === null ? state.phaseEnd : state.cleanupEnd) - now(),
    );
  const opDeadline = (ceilingMs) => ({
    deadlineMonoMs: Math.min(now() + ceilingMs, state.workEnd),
  });

  const armOperation = (kind) => {
    const deadlineMonoMs = Math.min(now() + OP_CEILING[kind], state.workEnd);
    disarmOperation();
    state.liveOp = { kind, deadlineMonoMs };
    state.liveOpTimer = later(
      () => latchStop("OPERATION_TIMEOUT"),
      Math.max(1, deadlineMonoMs - now()),
    );
    return { deadlineMonoMs };
  };
  const disarmOperation = () => {
    if (state.liveOpTimer !== null) clearT(state.liveOpTimer);
    state.liveOpTimer = null;
    state.liveOp = null;
  };

  const faultEvent = (error) =>
    state.records === null
      ? Promise.resolve()
      : state.records
          .recordEvent("fault", {
            code: error && error.code ? error.code : "FAULT",
            detail: error && error.message ? error.message.slice(0, 4096) : "?",
          })
          .catch((e) => recordFault(e));

  const intentOutcome = () =>
    state.records !== null
      ? state.records.composeIntent({
          finishReq: state.finishReq,
          stopReq: state.stopReq,
          faultCount: () => faults.length,
        })
      : {
          status: "inconclusive",
          exitCode: 2,
          stopReason: state.stopReq !== null ? state.stopReq.reason : "DRIVER_LOST",
          analysisEligible: false,
          summary: {},
          unplannedFaultCount: faults.length,
        };

  // Channel callbacks stay thin: validated dispatch lives in the operations
  // owner, hello included.
  const noteNativeFault = () => {
    if (stopped()) return false;
    let retained;
    try { retained = monitor.fault?.(); } catch { return false; }
    if (!retained || typeof retained.detail !== "string") return false;
    const error = fail(typeof retained.code === "string" ? retained.code : "ACCOUNTING_UNAVAILABLE", retained.detail);
    recordFault(error);
    latchStop(error.code);
    void faultEvent(error);
    return true;
  };
  const onMessage = (msg) => {
    noteNativeFault();
    // Lifecycle dispatch remains required; admission/finish keep their fences.
    if (state.ops !== null) state.ops.dispatch(msg);
  };
  const onError = (error) => {
    noteNativeFault();
    recordFault(error);
    latchStop(error && error.code === "IPC_DISCONNECT" ? "IPC_DISCONNECT" : "IPC_INVALID");
    // Retained monitor facts describe the event only AFTER the original
    // first-stop/narrow. They cannot replace its primary code or value.
    let descriptive = error;
    try {
      const retained = monitor.fault?.()?.detail;
      if (typeof retained === "string") {
        descriptive = new Error(
          `${error?.message ?? "?"}; retained monitor fault: ${retained}`.slice(0, 4096),
          { cause: error },
        );
        descriptive.code = error && error.code ? error.code : "FAULT";
      }
    } catch {}
    void faultEvent(descriptive);
  };
  const onExit = ({ exitCode }) => {
    noteNativeFault();
    // CLOSED acknowledges graceful attempts, never a successful exit.
    if (!state.driverClosed || (Number.isInteger(exitCode) && exitCode !== 0)) {
      recordFault(fail("DRIVER_EXIT", "unexpected exit"));
      latchStop("DRIVER_EXIT");
    }
  };

  const timing = {
    now,
    nowNs,
    timers,
    later,
    clearT,
    clearAll,
    opDeadline,
    workRemainingMs,
    cleanupRemainingMs,
    armOperation,
    disarmOperation,
  };
  // The whole cleanupArgs capacity lives in watchdog-cleanup-context.mjs under
  // corrective 64 — pure construction over the same grouped refs, invoked
  // after the timing literal exists and before control (no TDZ).
  const cleanupArgs = createWatchdogCleanupArgs({
    config,
    capabilities,
    state,
    timing,
  });
  const control = {
    wake,
    resolveWake,
    firstStopHooks,
    recordFault,
    latchStop,
    requestStop,
    stopped,
    admissionOpen,
    noteFinish,
    rssExceeded,
    captureCleanupBound,
    faultEvent,
    cleanupArgs,
    intentOutcome,
    onMessage,
    onError,
    onExit,
  };
  // The single bounded shutdown/finalization owner over the same grouped
  // context; control.finalize/shutdown are the preserved wrapper names.
  const shutdownOwner = createWatchdogShutdown({
    config,
    capabilities,
    state,
    timing,
    control,
  });
  control.finalize = (expected) => shutdownOwner.finalize(expected);
  control.shutdown = () => shutdownOwner.shutdown();
  const run = () =>
    runWatchdogLifecycle({ config, capabilities, state, timing, control });

  return Object.freeze({ run, requestStop });
}
