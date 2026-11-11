// Pure operation-context assembly extracted whole from watchdog-config.mjs.
// The same grouped references and frozen return shape remain unchanged.
// Config and Operations preserve their existing named re-exports.
// No second state, stop latch, clock, lifetime, writer or V3 scope field.
import { copyDeep } from "./protocol-values.mjs";
import { reportStoppedFault } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";

const fail = (code, detail) => {
  const e = new Error(`watchdog-config ${code}: ${detail}`);
  e.code = code;
  return e;
};

// The WHOLE operation-context literal: the sole assembly point, receiving the
// same grouped run context as the lifecycle owner. noteFinish binds the
// corrected main-control callback (synchronous admission close, null-reason
// PGN freeze, captured cleanup bound, wake) — never an assignment-only copy.
export function createWatchdogOperationContext({
  config,
  capabilities,
  state,
  timing,
  control,
}) {
  const { monitor, clock, lifetime, io, driverActualScope } = capabilities;
  return Object.freeze({
    phase: config.phase,
    runId: config.runId,
    commonIdentitySha256: config.commonIdentitySha256,
    workspaceRoot: config.workspaceRoot,
    manifestRel: config.manifestRel,
    commonIdentity: config.workspace.commonIdentity,
    workspaceId: config.workspace.workspaceId,
    monitor,
    clock,
    // The SAME owner registrar, the EXACT derived io object and the ONE
    // opaque driver actual scope forward unchanged — the operation owner
    // verifies them, never a rewrap or copy.
    retainActual: lifetime.retainActual,
    io,
    driverActualScope,
    nowMonoMs: timing.now,
    workEndMonoMs: () => state.workEnd,
    phaseEndMonoMs: () => state.phaseEnd,
    opDeadline: timing.opDeadline,
    send: (type, fields, settleMs) =>
      state.channel.send(type, fields, Math.max(1, settleMs)),
    workRemainingMs: timing.workRemainingMs,
    cleanupRemainingMs: timing.cleanupRemainingMs,
    recordFault: control.recordFault,
    requestStop: control.requestStop,
    reportOrdinaryFault: (error) => reportStoppedFault(lifetime, config.phase === "watchdog-selftest" ? "selftest" : "phase", error),
    stopped: control.stopped,
    stopReason: () => (state.stopReq ? state.stopReq.reason : null),
    admissionOpen: control.admissionOpen,
    armOperation: timing.armOperation,
    disarmOperation: timing.disarmOperation,
    operationDeadline: () =>
      state.liveOp ? state.liveOp.deadlineMonoMs : null,
    noteHeartbeat: () => {
      state.lastHb = timing.now();
    },
    noteHelloOk: () => {
      state.helloOk = true;
      state.lastHb = timing.now();
    },
    noteDriverClosed: () => {
      state.driverClosed = true;
      control.resolveWake();
    },
    noteFinish: control.noteFinish,
    onFirstStop: (fn) => control.firstStopHooks.add(fn),
    parentSupervisor: () => (state.running ? copyDeep(state.running) : null),
    channelPid: () => (state.channel ? state.channel.pid : null),
    driverIdentity: () =>
      state.driverIdentity ? copyDeep(state.driverIdentity) : null,
    manifestInputs: () => state.records.manifestInputs(),
    selftest: state.selftest,
    finalIntegrity: capabilities.finalIntegrity,
    startFinalIntegrity: (body) => {
      if (state.admissionTask !== null) throw fail("IPC_INVALID", "integrity task overlap");
      const actual = issueActual(lifetime.retainActual, body);
      state.admissionTask = actual.finally(() => { state.admissionTask = null; });
      return state.admissionTask;
    },
  });
}

