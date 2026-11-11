// Driver message transitions over the single supervisor-owned run state and
// shared ID authority passed in as `ctx`. No separate registry or factory:
// claimId here marks identifiers in the run-global usedIds map owned by
// supervisor-protocol.mjs.

import { FIXED_LIMITS } from "./record-schema.mjs";
import {
  base,
  copyDeep,
  envelope,
  eq,
  eventKinds,
  exactFields,
  isAbs,
  isH,
  isIdentity,
  isListener,
  isObj,
  isPid,
  isRef,
  isRel,
  nat,
  need,
  phases,
  poison,
  pos,
  strNE,
} from "./protocol-values.mjs";

export const S2D_FIELDS = {
  start: ["manifestPath", "commonIdentitySha256"],
  registered: ["requestId", "identity", "listener"],
  begun: ["operationId", "remainingMs"],
  recorded: ["recordId", "recordSeq", "ref"],
  stop: ["stopReason", "cleanupRemainingMs"],
};

const CHUNK = FIXED_LIMITS.ipc.chunkBytes;
const OP_CEILING = {
  readiness: FIXED_LIMITS.timing.readinessMs,
  command: FIXED_LIMITS.timing.commandMs,
};
// New workload/evidence is fenced by a run-global fault. A fully validated
// pre-STOP heartbeat is liveness from a peer not yet notified to stop.
// All existing envelope/sequence/operation and post-STOP guards still apply.
const ORDINARY = new Set(["register", "begin", "event", "artifact"]);

export const driverD2S = (ctx, st, message) => {
  const t = message.type;
  if (t === "hello") {
    need(st, !st.hello && st.seq.d2s === 0, "hello order");
    envelope(st, "d2s", message, [...base, "pid", "phase", "commonIdentitySha256",
      ...(ctx.recordSchemaVersion === 2 ? ["recordSchemaVersion", "evaluationPolicy"] : [])], ctx.runId);
    need(
      st,
      isPid(message.pid) && phases.includes(message.phase) && isH(message.commonIdentitySha256),
      "hello fields",
    );
    if (ctx.recordSchemaVersion === 2) need(st, message.recordSchemaVersion === 2 &&
      eq(message.evaluationPolicy, ctx.evaluationPolicy), "hello policy binding");
    st.hello = true;
    return;
  }
  need(st, st.hello, `${t} before hello`);
  if (t === "closed") {
    envelope(st, "d2s", message, [...base, "gracefulCloseAttempted", "expectedShutdowns"], ctx.runId);
    need(
      st,
      typeof message.gracefulCloseAttempted === "boolean" &&
        !st.closed &&
        Array.isArray(message.expectedShutdowns) &&
        message.expectedShutdowns.every(
          (s) =>
            isObj(s) &&
            exactFields(s, ["kind", "id"]) &&
            ["context", "worker", "browser", "fixture", "python"].includes(s.kind) &&
            strNE(s.id),
        ),
      "closed fields",
    );
    st.closed = true;
    return;
  }
  need(st, !st.closed && !st.finished, `${t} after end`);
  // After a supervisor stop only the graceful-close marker is admissible;
  // end/finish/ordinary output must have completed before stop.
  need(st, !st.stopped, `${t} after stop`);
  if (ctx.failed) need(st, !ORDINARY.has(t), `${t} after fault`);
  if (t === "heartbeat") {
    envelope(st, "d2s", message, [...base, "operationId"], ctx.runId);
    const current = st.liveOp?.operationId ?? st.pendingBegin?.operationId ?? null;
    need(st, message.operationId === current, "heartbeat op");
    return;
  }
  need(st, st.started, `${t} before start`);
  if (t === "register") {
    envelope(
      st,
      "d2s",
      message,
      [...base, "requestId", "kind", "rootPid", "expectedExecutable", "listener"],
      ctx.runId,
    );
    need(
      st,
      ["browser", "python", "fixture"].includes(message.kind) &&
        (message.kind === "fixture" || (isPid(message.rootPid) && isAbs(message.expectedExecutable))) &&
        (message.rootPid === null || isPid(message.rootPid)) &&
        (message.expectedExecutable === null || isAbs(message.expectedExecutable)) &&
        (message.listener === null || isListener(message.listener)),
      "register fields",
    );
    ctx.claimId(message.requestId, "request");
    st.pendingRegisters.set(
      message.requestId,
      copyDeep({
        kind: message.kind,
        rootPid: message.rootPid,
        expectedExecutable: message.expectedExecutable,
        listener: message.listener,
      }),
    );
    return;
  }
  if (t === "begin") {
    envelope(st, "d2s", message, [...base, "operationId", "kind"], ctx.runId);
    need(
      st,
      ["readiness", "command"].includes(message.kind) && st.pendingBegin === null && st.liveOp === null,
      "begin state",
    );
    ctx.claimId(message.operationId, "operation");
    st.pendingBegin = { operationId: message.operationId, kind: message.kind };
    return;
  }
  if (t === "end") {
    envelope(st, "d2s", message, [...base, "operationId", "result"], ctx.runId);
    need(
      st,
      st.liveOp !== null && st.liveOp.operationId === message.operationId,
      "end binding",
    );
    const r = message.result;
    need(
      st,
      isObj(r) &&
        exactFields(r, ["status", "evidencePaths", "detail"]) &&
        ["completed", "failed"].includes(r.status) &&
        Array.isArray(r.evidencePaths) &&
        r.evidencePaths.every(strNE) &&
        isObj(r.detail),
      "end fields",
    );
    st.liveOp = null;
    return;
  }
  if (t === "event" || t === "artifact") {
    const names =
      t === "event"
        ? [...base, "recordId", "recordSeq", "kind", "payload"]
        : [...base, "recordId", "recordSeq", "artifactId", "path", "mode", "encoding", "data", "last"];
    envelope(st, "d2s", message, names, ctx.runId);
    need(st, message.recordSeq === st.recordSeq, "recordSeq");
    st.recordSeq += 1;
    ctx.claimId(message.recordId, "record");
    st.pendingRecords.set(message.recordId, message.recordSeq);
    if (t === "event") {
      need(st, eventKinds.includes(message.kind) && isObj(message.payload), "event fields");
      return;
    }
    need(
      st,
      strNE(message.artifactId) &&
        isRel(message.path) &&
        ["append", "replace"].includes(message.mode) &&
        message.encoding === "base64" &&
        typeof message.data === "string" &&
        typeof message.last === "boolean",
      "artifact fields",
    );
    let decoded = null;
    try {
      const d = Buffer.from(message.data, "base64");
      if (d.toString("base64") === message.data) decoded = d;
    } catch {
      decoded = null;
    }
    need(st, decoded !== null && decoded.length <= CHUNK, "artifact data");
    const stream = st.artifacts.get(message.artifactId);
    if (stream === undefined) {
      // One artifactId binds one confined path at a time; a different
      // artifactId may not claim an already-active path, and a closed
      // artifactId stays permanently claimed by the run registry.
      ctx.claimId(message.artifactId, "artifact");
      need(st, !st.artifactPaths.has(message.path), "artifact path");
      st.artifacts.set(message.artifactId, { path: message.path, mode: message.mode });
      st.artifactPaths.set(message.path, message.artifactId);
    } else {
      need(st, stream.path === message.path && stream.mode === message.mode, "artifact binding");
    }
    if (message.last === true) {
      st.artifacts.delete(message.artifactId);
      st.artifactPaths.delete(message.path);
    }
    return;
  }
  if (t === "finish") {
    envelope(
      st,
      "d2s",
      message,
      [...base, "requestedStatus", "requestedExitCode", "stopReason", "checks", "summary", "analysisEligible"],
      ctx.runId,
    );
    need(
      st,
      ["passed", "failed", "inconclusive"].includes(message.requestedStatus) &&
        [0, 1, 2].includes(message.requestedExitCode) &&
        message.requestedExitCode === { passed: 0, failed: 1, inconclusive: 2 }[message.requestedStatus] &&
        (message.stopReason === null || typeof message.stopReason === "string") &&
        Array.isArray(message.checks) &&
        message.checks.every(
          (c) =>
            isObj(c) &&
            exactFields(c, ["id", "status", "evidencePaths"]) &&
            strNE(c.id) &&
            ["passed", "failed"].includes(c.status) &&
            Array.isArray(c.evidencePaths) &&
            c.evidencePaths.every(strNE),
        ) &&
        isObj(message.summary) &&
        typeof message.analysisEligible === "boolean",
      "finish fields",
    );
    if (ctx.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3")
      need(st, !["scientificReadinessVerdict", "preflightEvidence"].some((k) => Object.hasOwn(message.summary, k)), "reserved V3 science");
    // A passed finish can never recover a run after a sticky fault.
    need(st, !(ctx.failed && message.requestedStatus === "passed"), "passed after fault");
    st.finished = true;
    return;
  }
  poison(st, `d2s type ${t}`);
};

export const driverS2D = (ctx, st, message) => {
  const t = message.type;
  need(st, st.hello, `${t} before hello`);
  if (t === "start") {
    need(st, !st.started && !ctx.failed, "start state");
    envelope(st, "s2d", message, [...base, "manifestPath", "commonIdentitySha256",
      ...(ctx.recordSchemaVersion === 2 ? ["recordSchemaVersion", "evaluationPolicy"] : [])], ctx.runId);
    need(st, strNE(message.manifestPath) && isH(message.commonIdentitySha256), "start fields");
    if (ctx.recordSchemaVersion === 2) need(st, message.recordSchemaVersion === 2 &&
      eq(message.evaluationPolicy, ctx.evaluationPolicy), "start policy binding");
    st.started = true;
    return;
  }
  need(st, st.started, `${t} before start`);
  if (t === "registered") {
    envelope(st, "s2d", message, [...base, "requestId", "identity", "listener"], ctx.runId);
    const req = st.pendingRegisters.get(message.requestId);
    // The acknowledgement must match the requested registration exactly:
    // a browser/python root yields a live identity tuple for the declared
    // rootPid; the returned listener equals the declared listener.
    need(
      st,
      req !== undefined &&
        (req.rootPid === null
          ? message.identity === null || isIdentity(message.identity)
          : isIdentity(message.identity) && message.identity.pid === req.rootPid) &&
        eq(message.listener, req.listener),
      "registered binding",
    );
    st.pendingRegisters.delete(message.requestId);
    return;
  }
  if (t === "begun") {
    envelope(st, "s2d", message, [...base, "operationId", "remainingMs"], ctx.runId);
    const pending = st.pendingBegin;
    // Activating a pending operation requires the still-open,
    // ordinary-work-eligible driver state: a begin requested before a
    // stop, global fault, finish or close can never complete afterward.
    need(
      st,
      !st.stopped &&
        !st.finished &&
        !st.closed &&
        !ctx.failed &&
        pending !== null &&
        pending.operationId === message.operationId &&
        pos(message.remainingMs) &&
        message.remainingMs <= OP_CEILING[pending.kind],
      "begun fields",
    );
    st.liveOp = {
      operationId: pending.operationId,
      kind: pending.kind,
      remainingMs: message.remainingMs,
    };
    st.pendingBegin = null;
    return;
  }
  if (t === "recorded") {
    envelope(st, "s2d", message, [...base, "recordId", "recordSeq", "ref"], ctx.runId);
    need(
      st,
      st.pendingRecords.get(message.recordId) === message.recordSeq &&
        (message.ref === null || isRef(message.ref)),
      "recorded fields",
    );
    st.pendingRecords.delete(message.recordId);
    return;
  }
  if (t === "stop") {
    envelope(st, "s2d", message, [...base, "stopReason", "cleanupRemainingMs"], ctx.runId);
    need(
      st,
      strNE(message.stopReason) &&
        nat(message.cleanupRemainingMs) &&
        message.cleanupRemainingMs <= FIXED_LIMITS.timing.cleanupMs &&
        !st.stopped,
      "stop fields",
    );
    st.stopped = true;
    return;
  }
  poison(st, `s2d type ${t}`);
};

// Shared IPC_INVALID failure constructor for both leaves — the
// detail names the violated wire invariant; arbitrary caller values
// stay on their own promise/error channels, never this type.
export const bridgeError = (detail) => {
  const error = new Error(`driver-bridge ${detail}`);
  error.code = "IPC_INVALID";
  return error;
};

// Shared deferred; every created promise carries an immediate real
// rejection handler so an abandoned waiter can never surface as an
// unhandled rejection — every caller still observes the exact
// settled value through its own await.
export const defer = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.then(
    () => {},
    () => {},
  );
  return { promise, resolve, reject };
};

// Private actual-receipt pair for the bridge wire leaf (C4b-04):
// captures the SAME facade-owned mutable state and the trusted
// transport over the SAME st.actual receipt Set — pure
// construction returning the frozen EXACT2 {retainBody,joinActual},
// invoking no retainActual/IO/clock/body itself. The protocol
// never imports any bridge module.
export function createDriverBridgeActual({ state: st, transport }) {
  // Neutral actual receipt for a real body invocation: armed BEFORE
  // the callback runs and fulfilled on ANY actual settlement — a
  // rejected domain value is not unclosed physical debt. The run
  // resolves with the original {threw,value} outcome so callers
  // preserve arbitrary results and errors by explicit presence.
  const retainBody = (fn) => {
    const actual = defer();
    st.actual.add(actual.promise);
    transport.retainActual(actual.promise);
    const run = (async () => {
      try {
        const value = await fn();
        st.actual.delete(actual.promise);
        actual.resolve();
        return { threw: false, value };
      } catch (e) {
        st.actual.delete(actual.promise);
        actual.resolve();
        return { threw: true, value: e };
      }
    })();
    return run;
  };

  // Passive local join over the SAME strong receipt Set: resolves
  // only when every armed neutral receipt has truly settled — never
  // a global owner whenSettled, never a self-wait, and an
  // unknown-submission receipt honestly keeps it pending.
  const joinActual = async () => {
    while (st.actual.size !== 0) await Promise.all([...st.actual]);
  };

  return Object.freeze({ retainBody, joinActual });
}
