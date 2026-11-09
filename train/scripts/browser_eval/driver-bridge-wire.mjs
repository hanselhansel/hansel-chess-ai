// driver-bridge-wire.mjs is the private wire/dispatch leaf of the
// driver-bridge three-owner split (C4b-02): createDriverBridgeWire
// takes the SAME private ctx6 {runId,manifest,transport,signal,
// state,endLatch} created only by the facade and returns the frozen
// EXACT15 wire refs owning the WHOLE raw-send / ACK-dispatch /
// parent-envelope / subscription-callback / heartbeat / fault /
// admission / ID blocks of the original bridge. state is the ONE
// original mutable closure over flags/maps/counters; this leaf adds
// only state.actual — the SAME private strong Set of neutral actual
// receipts — while transport.retainActual stays the sole debt/hold
// authority (no second ledger, status or proof). transport.send
// receives the validated PLAIN frame object exactly as Node
// process.send and the parent driver-protocol carry it;
// canonicalBytes only bounds the serialized ceiling. Each raw send
// arms a neutral actual receipt BEFORE serialization and
// transport.send and resolves it ONLY at the real callback (any
// error) or a definite pre-issue serialization/ceiling failure,
// while a separate public promise carries the domain outcome: a real
// callback error faults the session even after a public ACK or
// closed, an uncertain sync send throw rejects the public with the
// exact arbitrary value yet never marks the actual receipt settled
// (no fired-flag, no fake completion), and a serialization failure
// before transport.send stays the definite no-issue boundary.
// retainBody preregisters a neutral actual before any real body
// invocation and fulfills it on ANY actual settlement — a rejected
// domain value is not unclosed physical debt. joinActual is a
// PASSIVE local join over state.actual after closed admission —
// never a global owner whenSettled or self-wait. The factory
// performs NO transport/timer/callback invocation and no IO; it only
// handles endLatch's rejection immediately. C4b-04: the retainBody/
// joinActual pair is built WHOLE by driver-protocol's
// createDriverBridgeActual({state:st,transport}) over the SAME
// st.actual Set and trusted transport — identical returned refs, no
// second queue/debt/ledger/proof/status/clock/globaljoin.

import { canonicalBytes } from "./canonical-json.mjs";
import { bridgeError, defer, createDriverBridgeActual, S2D_FIELDS } from "./driver-protocol.mjs";
import {
  copyDeep,
  eq,
  exactFields,
  isIdentity,
  isListener,
  isObj,
  isRef,
  nat,
  pos,
  strNE,
} from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { freezeDeep } from "./schema-primitives.mjs";

const IPC = FIXED_LIMITS.ipc;
const TIMING = FIXED_LIMITS.timing;
const BASE = ["ipcVersion", "runId", "seq", "type"];


// The shared bridgeError/defer helpers live in driver-protocol.mjs —
// imported above for local use and re-exported as the IDENTICAL
// functions so this leaf keeps its EXACT3 surface with no wrapper.
export { bridgeError, defer };

// Sole factory export: the wire/dispatch owner. Pure construction —
// it destructures the facade ctx, defines the EXACT15 closures and
// handles endLatch's rejection immediately; it invokes NO transport,
// timer, callback or IO itself.
export function createDriverBridgeWire(ctx) {
  const runId = ctx.runId;
  const manifestCopy = ctx.manifest;
  const transport = ctx.transport;
  const signal = ctx.signal;
  const st = ctx.state;
  const endLatch = ctx.endLatch;
  // SAME private strong receipt Set feeding joinActual; the genuine
  // lifetime through transport.retainActual remains the sole
  // debt/hold authority — the Set only keeps joinable references.
  if (!(st.actual instanceof Set)) st.actual = new Set();
  endLatch.promise.then(
    () => {},
    () => {},
  );

  // Ordinary public waits race the session end so a stop/abort/fault
  // rejects them promptly; lifecycle close does NOT race an
  // already-rejected endLatch — it awaits its own real callback and
  // the local join.
  const raced = (p) => Promise.race([p, endLatch.promise]);

  const rejectPending = (err) => {
    if (st.pendingStart !== null) {
      st.pendingStart.reject(err);
      st.pendingStart = null;
    }
    for (const req of st.pendingRegisters.values()) req.reject(err);
    st.pendingRegisters.clear();
    if (st.pendingBegin !== null) {
      st.pendingBegin.reject(err);
      st.pendingBegin = null;
    }
    for (const rec of st.pendingRecords.values()) rec.reject(err);
    st.pendingRecords.clear();
    st.liveOp = null;
    endLatch.reject(err);
  };
  const clearHeartbeat = () => {
    if (st.hb === null) return;
    transport.clock.clearInterval(st.hb);
    st.hb = null;
  };
  const terminate = (err) => {
    clearHeartbeat();
    st.derived.abort(err);
    rejectPending(err);
  };
  const sessionFault = (value) => {
    if (st.fault !== null) return;
    st.fault = { threw: true, value };
    terminate(value);
  };

  // One retained NEUTRAL actual receipt plus a separate public domain
  // promise per raw send: both are armed BEFORE serialization and
  // transport.send. The transport receives the validated PLAIN frame
  // object; canonicalBytes only bounds the serialized ceiling. The
  // neutral resolves ONLY at the real callback with any error or at
  // the definite pre-issue serialization/ceiling failure — the only
  // no-issue boundary. A real callback error — carried by presence,
  // never truthiness — rejects the public and faults the session
  // even after a public ACK or closed. An uncertain sync send throw
  // rejects the public with the exact arbitrary value and faults,
  // while the neutral stays PENDING for any real callback: the
  // submission is unknown, never claimed unissued, never faked
  // complete, and no fired-flag ignores a late callback.
  const sendFrame = (type, fields) => {
    const msg = { ipcVersion: 1, runId, seq: st.seqOut, type, ...fields };
    const actual = defer();
    const pub = defer();
    st.actual.add(actual.promise);
    transport.retainActual(actual.promise);
    const settleActual = () => {
      if (st.actual.delete(actual.promise)) actual.resolve();
    };
    try {
      const wire = canonicalBytes(msg);
      if (wire.length > IPC.driverBytes) throw bridgeError("driverBytes");
    } catch (e) {
      settleActual();
      throw e;
    }
    st.seqOut += 1;
    try {
      transport.send(msg, (err) => {
        // The real callback is the ONLY actual settlement for an
        // issued frame; it may arrive even after a public outcome.
        settleActual();
        if (err !== null && err !== undefined) {
          pub.reject(err);
          sessionFault(err);
        } else {
          pub.resolve();
        }
      });
    } catch (thrown) {
      // Submission unknown: public gets the exact value now; the
      // neutral stays pending for any real callback.
      pub.reject(thrown);
      sessionFault(thrown);
      throw thrown;
    }
    return pub.promise;
  };

  // Arms only while the session still admits work — a reentrant
  // stop/fault/abort/disconnect/finish/close leaves the interval
  // unset, and each tick re-checks the same state before any send.
  // The heartbeat send's rejected public promise is handled
  // immediately alongside the sync throw: never an unhandled
  // rejection.
  const startHeartbeat = () => {
    if (st.hb !== null) return;
    if (
      st.stopped ||
      st.fault !== null ||
      st.aborted ||
      st.disconnected ||
      st.finished ||
      st.closed
    ) {
      return;
    }
    st.hb = transport.clock.setInterval(() => {
      if (st.hb === null) return;
      if (
        st.stopped ||
        st.fault !== null ||
        st.aborted ||
        st.disconnected ||
        st.finished ||
        st.closed
      ) {
        return;
      }
      const operationId =
        st.liveOp !== null
          ? st.liveOp.operationId
          : st.pendingBegin !== null
            ? st.pendingBegin.operationId
            : null;
      try {
        sendFrame("heartbeat", { operationId }).then(
          () => {},
          () => {},
        );
      } catch {
        // The send already carried its own retained receipt and fault.
      }
    }, TIMING.heartbeatMs);
  };

  const freshId = (type) => {
    const n = st.counters[type] + 1;
    if (!Number.isSafeInteger(n)) throw bridgeError(`${type} counter`);
    st.counters[type] = n;
    const id = `${runId}:driver:${type}:${n}`;
    if (st.usedIds.has(id)) throw bridgeError(`${type} reuse`);
    st.usedIds.add(id);
    return id;
  };
  const claimId = (id) => {
    if (st.usedIds.has(id)) throw bridgeError("id reuse");
    st.usedIds.add(id);
  };

  const dispatch = (msg) => {
    if (msg.type === "start") {
      if (st.pendingStart === null) throw bridgeError("unexpected start");
      const pending = st.pendingStart;
      st.pendingStart = null;
      if (
        msg.manifestPath !== st.startPath ||
        msg.commonIdentitySha256 !== manifestCopy.commonIdentitySha256 ||
        (manifestCopy.schemaVersion === 2 && (msg.recordSchemaVersion !== 2 || !eq(msg.evaluationPolicy, manifestCopy.evaluationPolicy)))
      ) {
        throw bridgeError("start binding");
      }
      st.started = true;
      pending.resolve();
      return;
    }
    if (msg.type === "registered") {
      const req = st.pendingRegisters.get(msg.requestId);
      if (req === undefined) throw bridgeError("registered id");
      st.pendingRegisters.delete(msg.requestId);
      const identityOk =
        req.rootPid === null
          ? msg.identity === null || isIdentity(msg.identity)
          : isIdentity(msg.identity) && msg.identity.pid === req.rootPid;
      if (!identityOk) throw bridgeError("registered identity");
      if (!(msg.listener === null || isListener(msg.listener)) || !eq(msg.listener, req.listener))
        throw bridgeError("registered listener");
      st.registered.push({ kind: req.kind, id: msg.requestId });
      // ACK-returned bindings arrive fresh copied/frozen — the parent
      // cannot mutate what the caller later reads.
      req.resolve({
        identity: msg.identity === null ? null : freezeDeep(copyDeep(msg.identity)),
        listener: msg.listener === null ? null : freezeDeep(copyDeep(msg.listener)),
      });
      return;
    }
    if (msg.type === "begun") {
      const op = st.pendingBegin;
      if (op === null || op.operationId !== msg.operationId)
        throw bridgeError("begun id");
      st.pendingBegin = null;
      if (!pos(msg.remainingMs) || msg.remainingMs > op.ceilingMs)
        throw bridgeError("begun remainingMs");
      st.liveOp = { operationId: msg.operationId };
      op.resolve({ remainingMs: msg.remainingMs });
      return;
    }
    if (msg.type === "recorded") {
      const rec = st.pendingRecords.get(msg.recordId);
      if (rec === undefined || rec.recordSeq !== msg.recordSeq)
        throw bridgeError("recorded id");
      st.pendingRecords.delete(msg.recordId);
      if (rec.final) {
        if (!isRef(msg.ref) || msg.ref.path !== rec.path)
          throw bridgeError("recorded ref");
        rec.resolve(freezeDeep(copyDeep(msg.ref)));
      } else {
        if (msg.ref !== null) throw bridgeError("recorded ref");
        rec.resolve(undefined);
      }
      return;
    }
    if (msg.type === "stop") {
      if (!strNE(msg.stopReason)) throw bridgeError("stopReason");
      if (!nat(msg.cleanupRemainingMs) || msg.cleanupRemainingMs > TIMING.cleanupMs)
        throw bridgeError("cleanupRemainingMs");
      st.finishStop = st.finished && st.seqOut > st.finishSeq && msg.stopReason === "FINISH";
      st.stopped = true;
      st.stopReason = msg.stopReason;
      st.stopCause = bridgeError(`stop ${msg.stopReason}`);
      terminate(st.stopCause);
      return;
    }
    throw bridgeError("type");
  };

  // Every parent frame: closed field set, ipcVersion 1, exact runId,
  // exact expected seqIn once — malformed/duplicate/late frames fault
  // the bridge. A post-stop frame faults; after finish only a valid
  // stop remains admissible.
  const onFrame = (raw) => {
    if (st.closed || st.fault !== null) return;
    let msg = raw;
    if (typeof raw === "string" || raw instanceof Uint8Array) {
      try {
        msg = JSON.parse(String(raw));
      } catch (e) {
        sessionFault(e);
        return;
      }
    }
    try {
      if (!isObj(msg)) throw bridgeError("frame");
      const fields = S2D_FIELDS[msg.type];
      const versionFields = msg.type === "start" && manifestCopy.schemaVersion === 2 ? ["recordSchemaVersion", "evaluationPolicy"] : [];
      if (fields === undefined || !exactFields(msg, [...BASE, ...fields, ...versionFields]))
        throw bridgeError("fields");
      if (msg.ipcVersion !== 1) throw bridgeError("ipcVersion");
      if (msg.runId !== runId) throw bridgeError("runId");
      if (!nat(msg.seq) || msg.seq !== st.seqIn) throw bridgeError("seq");
      if (msg.type !== "start" && !st.started) throw bridgeError(`${msg.type} before start`);
      if (st.stopped) throw bridgeError("post-stop frame");
      if (st.finished && msg.type !== "stop") throw bridgeError("post-finish frame");
      st.seqIn += 1;
      dispatch(msg);
    } catch (e) {
      sessionFault(e);
    }
  };
  const onTransportClose = () => {
    if (st.closed) return;
    st.disconnected = true;
    terminate(bridgeError("transport closed"));
    unwind();
  };
  const onExternalAbort = () => {
    if (st.closed) return;
    st.aborted = true;
    terminate(bridgeError("signal aborted"));
  };
  const unwind = () => {
    clearHeartbeat();
    for (const unsub of st.unsubs.splice(0)) {
      try {
        unsub();
      } catch {
        // Listener removal is best-effort cleanup, never a new fault.
      }
    }
    if (typeof signal.removeEventListener === "function") {
      try {
        signal.removeEventListener("abort", onExternalAbort);
      } catch {
        // Same bounded cleanup boundary.
      }
    }
  };

  const admissible = () => {
    if (st.fault !== null) throw st.fault.value;
    if (st.disconnected) throw bridgeError("transport closed");
    if (st.aborted) throw bridgeError("aborted");
    if (st.stopped) throw bridgeError("stopped");
    if (!st.started) throw bridgeError("before start");
    if (st.finished || st.closed) throw bridgeError("finished");
  };

  // retainBody/joinActual moved WHOLE to driver-protocol's
  // createDriverBridgeActual (C4b-04): ONE pure construction over
  // the SAME st.actual Set and trusted transport; IDENTICAL refs.
  const { retainBody, joinActual } = createDriverBridgeActual({ state: st, transport });

  return Object.freeze({
    sendFrame, onFrame, onTransportClose, onExternalAbort,
    startHeartbeat, clearHeartbeat, terminate, sessionFault,
    admissible, raced, freshId, claimId, retainBody, joinActual,
    unwind,
  });
}
