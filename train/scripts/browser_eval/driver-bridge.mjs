// driver-bridge.mjs is the FACADE owner of the driver-side bridge
// inside the supervisor-forked driver process (C4b-03 integrated):
// it keeps the constructor validation, the ONE original session
// state over flags/maps/seq/counters/recordChain, the endLatch,
// snapshotFinish, the start/finish/close session controls, the
// subscriptions and the public assembly — and delegates the WHOLE
// raw-send/ACK-dispatch/envelope/heartbeat/fault/admission/ID blocks
// to createDriverBridgeWire and the WHOLE register/operation/event/
// artifact ordinary bodies to createDriverBridgeMethods over the
// SAME private ctx6 {runId,manifest,transport,signal,state,endLatch}
// speaking the EXISTING driver-protocol.mjs d2s/s2d wire over the
// trusted child process.send/message transport supplied by later
// run.mjs assembly — NEVER createDriverChannel, which the supervisor
// forks and owns separately. The transport receives validated PLAIN
// frame objects; canonical serialization only bounds the byte
// ceiling. Pending ACKs install BEFORE each send and neutral actual
// receipts are prearmed+retained BEFORE every raw send, queue
// admission and real body invocation — a real callback error faults
// the session even after a public ACK or closed, an unknown
// submission stays held until the real callback, and a serialization
// failure before transport.send is the definite no-issue boundary.
// The parent createProtocolValidator stays the sole run-global
// ID/protocol authority: this bridge adds no second validator,
// allocator, canonical registry or status/proof setter, no
// fork/Native/Store/Recorder/filesystem/model/browser/network
// capability and no deadline/timeout clock — the parent's frame
// bounds and the external signal bound public waits. DAG
// facade -> methods -> wire -> driver-protocol + pure primitives.
// Functional runtime input.

import {
  copyDeep,
  exactFields,
  isH,
  isObj,
  isPid,
  phases,
  strNE,
} from "./protocol-values.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import {
  bridgeError,
  defer,
  createDriverBridgeWire,
} from "./driver-bridge-wire.mjs";
import { createDriverBridgeMethods } from "./driver-bridge-methods.mjs";

const FINISH_FIELDS = [
  "requestedStatus",
  "requestedExitCode",
  "stopReason",
  "checks",
  "summary",
  "analysisEligible",
];
const EXIT_BY_STATUS = { passed: 0, failed: 1, inconclusive: 2 };

// Sole export: the private driver-session owner. The constructor is
// synchronous and performs NO sends/timers — it validates and
// canonical-copies/freezes the serializable manifest/run fields,
// validates the trusted transport and the external signal as a
// GENUINE AbortSignal (platform aborted getter plus
// add/removeEventListener — never a plain object), creates the local
// genuine AbortController exposing the read-only derived
// capabilities.signal, instantiates the two leaves over ctx6, and
// subscribes message/close ONCE before any hello can reenter. A
// construction/subscription failure unwinds its own listeners
// without IO.
export function createDriverCapabilities({ runId, manifest, transport, signal }) {
  if (!strNE(runId)) throw bridgeError("runId");
  if (!isObj(manifest)) throw bridgeError("manifest");
  const manifestCopy = freezeDeep(copyDeep(manifest));
  if (manifestCopy.runId !== runId) throw bridgeError("manifest runId");
  if (!phases.includes(manifestCopy.phase)) throw bridgeError("manifest phase");
  if (!isH(manifestCopy.commonIdentitySha256))
    throw bridgeError("manifest commonIdentitySha256");
  if (
    !isObj(transport) ||
    !isPid(transport.pid) ||
    typeof transport.send !== "function" ||
    typeof transport.onMessage !== "function" ||
    typeof transport.onClose !== "function" ||
    typeof transport.retainActual !== "function" ||
    !isObj(transport.clock) ||
    typeof transport.clock.setInterval !== "function" ||
    typeof transport.clock.clearInterval !== "function"
  ) {
    throw bridgeError("transport");
  }
  const abortedGet = Object.getOwnPropertyDescriptor(
    AbortSignal.prototype,
    "aborted",
  )?.get;
  let genuineSignal = false;
  try {
    genuineSignal =
      typeof abortedGet === "function" &&
      typeof abortedGet.call(signal) === "boolean" &&
      typeof signal.addEventListener === "function" &&
      typeof signal.removeEventListener === "function";
  } catch {
    genuineSignal = false;
  }
  if (!genuineSignal) throw bridgeError("signal");

  const st = {
    started: false,
    stopped: false,
    finished: false,
    closed: false,
    disconnected: false,
    aborted: false,
    fault: null,
    seqOut: 0,
    seqIn: 0,
    recordSeq: 0,
    counters: { request: 0, record: 0, artifact: 0 },
    usedIds: new Set(),
    actual: new Set(),
    pendingStart: null,
    startPath: null,
    startCalled: false,
    pendingRegisters: new Map(),
    registered: [],
    pendingBegin: null,
    liveOp: null,
    pendingRecords: new Map(),
    openArtifacts: new Set(),
    ordinary: 0,
    recordChain: Promise.resolve(),
    hb: null,
    derived: new AbortController(),
    unsubs: [],
    finishCalled: false,
    finishSeq: null,
    finishStop: false,
    stopCause: null,
    stopReason: null,
    closeCalled: false,
  };
  const endLatch = defer();
  const ctx = { runId, manifest: manifestCopy, transport, signal, state: st, endLatch };
  const wire = createDriverBridgeWire(ctx);
  const methods = createDriverBridgeMethods(ctx, wire);

  const snapshotFinish = (v) => {
    const c = copyDeep(v);
    if (!isObj(c) || !exactFields(c, FINISH_FIELDS)) throw bridgeError("PhaseResult fields");
    if (EXIT_BY_STATUS[c.requestedStatus] === undefined || c.requestedExitCode !== EXIT_BY_STATUS[c.requestedStatus])
      throw bridgeError("PhaseResult status");
    if (!(c.stopReason === null || strNE(c.stopReason))) throw bridgeError("stopReason");
    if (
      !Array.isArray(c.checks) ||
      !c.checks.every(
        (k) =>
          isObj(k) &&
          exactFields(k, ["id", "status", "evidencePaths"]) &&
          strNE(k.id) &&
          (k.status === "passed" || k.status === "failed") &&
          Array.isArray(k.evidencePaths) &&
          k.evidencePaths.every(strNE),
      )
    ) {
      throw bridgeError("checks");
    }
    if (!isObj(c.summary)) throw bridgeError("summary");
    if (typeof c.analysisEligible !== "boolean") throw bridgeError("analysisEligible");
    return c;
  };

  const start = async (args = {}) => {
    if (st.startCalled) throw bridgeError("start once");
    st.startCalled = true;
    const manifestPath = isObj(args) ? args.manifestPath : undefined;
    if (!strNE(manifestPath)) throw bridgeError("manifestPath");
    if (st.fault !== null) throw st.fault.value;
    if (st.disconnected || st.aborted) throw bridgeError("inactive");
    st.startPath = manifestPath;
    // The SAME waiter object is captured BEFORE hello is issued — a
    // reentrant stop/fault that clears the slot can never shortcut
    // the real callback + matching-start requirement.
    const pendingStart = defer();
    st.pendingStart = pendingStart;
    const flow = (async () => {
      const sendDebt = wire.sendFrame("hello", {
        pid: transport.pid,
        phase: manifestCopy.phase,
        commonIdentitySha256: manifestCopy.commonIdentitySha256,
      });
      // The heartbeat only arms while the session still admits work;
      // startHeartbeat re-checks the same state and each tick
      // re-guards before any send.
      if (
        !st.stopped &&
        st.fault === null &&
        !st.aborted &&
        !st.disconnected &&
        !st.finished &&
        !st.closed
      ) {
        wire.startHeartbeat();
      }
      await wire.raced(sendDebt);
      await wire.raced(pendingStart.promise);
    })();
    return wire.raced(flow);
  };

  const finish = async (phaseResult) => {
    if (st.finishCalled) throw bridgeError("finish once");
    st.finishCalled = true;
    if (!st.started || st.stopped || st.finished || st.closed) throw bridgeError("finish order");
    if (st.fault !== null) throw st.fault.value;
    if (st.disconnected || st.aborted) throw bridgeError("inactive");
    // Finish is admitted only once actual ordinary work, queued
    // records, pending begin/live op, pending ACKs and every armed
    // actual receipt have settled — not merely currently-empty maps.
    if (
      st.pendingBegin !== null ||
      st.liveOp !== null ||
      st.pendingRegisters.size !== 0 ||
      st.pendingRecords.size !== 0 ||
      st.ordinary !== 0 ||
      st.actual.size !== 0
    ) {
      throw bridgeError("finish early");
    }
    const fields = snapshotFinish(phaseResult);
    const flow = (async () => {
      wire.clearHeartbeat();
      st.finishSeq = st.seqOut;
      st.finished = true;
      // The real parent may stop after receiving finish but before its
      // raw send callback returns. Lifecycle finish owns that callback;
      // normal STOP cannot replace its actual success or first send error.
      await wire.sendFrame("finish", fields);
      // Keep IPC open until the supervisor's EXISTING validated normal STOP.
      // This wait owns no new timer/receipt and never replaces raw send error.
      try {
        await endLatch.promise;
      } catch (error) {
        if (st.fault !== null) throw st.fault.value;
        if (!st.finishStop || st.disconnected || st.aborted) throw error;
      }
    })();
    return flow;
  };

  const close = async (args = {}) => {
    if (st.closeCalled) throw bridgeError("close once");
    st.closeCalled = true;
    const gracefulCloseAttempted = isObj(args) ? args.gracefulCloseAttempted : undefined;
    if (typeof gracefulCloseAttempted !== "boolean")
      throw bridgeError("gracefulCloseAttempted");
    if (st.closed) throw bridgeError("closed");
    if (!st.stopped && !st.finished) throw bridgeError("close order");
    const expectedShutdowns = st.registered.map((r) => ({ kind: r.kind, id: r.id }));
    const flow = (async () => {
      // Ordinary admission is fenced synchronously BEFORE the closed
      // frame is issued; this lifecycle lane never races the
      // already-rejected ordinary endLatch.
      st.closed = true;
      wire.clearHeartbeat();
      let outcome;
      try {
        await wire.sendFrame("closed", { gracefulCloseAttempted, expectedShutdowns });
        outcome = { threw: false, value: undefined };
      } catch (e) {
        outcome = { threw: true, value: e };
      }
      // The passive local join — every armed send/body receipt —
      // completes before listeners unwind; a primary rejection keeps
      // its exact arbitrary value by explicit presence, and an
      // unknown submission honestly keeps the actual pending.
      await wire.joinActual();
      if (st.fault !== null) throw st.fault.value;
      if (outcome.threw) throw outcome.value;
    })();
    try {
      return await flow;
    } finally {
      wire.unwind();
    }
  };

  try {
    st.unsubs.push(transport.onMessage(wire.onFrame));
    st.unsubs.push(transport.onClose(wire.onTransportClose));
  } catch (e) {
    wire.unwind();
    throw e;
  }
  if (signal.aborted) wire.onExternalAbort();
  else signal.addEventListener("abort", wire.onExternalAbort, { once: true });

  const capabilities = Object.freeze({
    runId,
    manifest: manifestCopy,
    signal: st.derived.signal,
    register: methods.register,
    operation: methods.operation,
    event: methods.event,
    artifact: methods.artifact,
  });
  // Only this session's validated ordinary STOP cause is cancellation.
  // Forged errors, normal-finish/fault STOP and later transport faults
  // still enter the driver's original fault path.
  const isPlannedStop = (error) => st.stopCause !== null && error === st.stopCause &&
    st.stopped && !st.finishCalled && st.stopReason !== "FINISH" &&
    st.fault === null && !st.disconnected && !st.aborted;
  return Object.freeze({ capabilities, start, finish, close, isPlannedStop });
}
