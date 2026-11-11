// One run-global duplex IPC validator. Closed driver/collector/gated-exec
// variants, per-direction sequences, a shared request/operation/record/
// artifact ID registry, sticky per-channel faults and native-authority
// bindings. The factory alone owns the run-global registry, native
// authorities, sticky ordinary-work failure and channel state; driver and
// collector message transitions are delegated to driver-protocol.mjs and
// collector-protocol.mjs against that shared authority. No timers, clocks
// or process launch here; OS facts remain native duties.

import { assertPolicyBinding, protocolPathForPolicy } from "./evaluation-policy.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import {
  base,
  copyDeep,
  envelope,
  eq,
  fail,
  isIdentity,
  isObj,
  isQuery,
  nat,
  need,
  strNE,
} from "./protocol-values.mjs";
import { driverD2S, driverS2D } from "./driver-protocol.mjs";
import { collectC2S, collectS2C } from "./collector-protocol.mjs";

export const IPC_LIMITS = FIXED_LIMITS.ipc;
export const TIMING_LIMITS = FIXED_LIMITS.timing;
export const RESOURCE_LIMITS = FIXED_LIMITS.resources;

export function createProtocolValidator({ runId, recordSchemaVersion = 1, evaluationPolicy = null }) {
  if (!strNE(runId)) fail("runId");
  assertPolicyBinding({ schemaVersion: recordSchemaVersion, evaluationPolicy,
    protocolPath: protocolPathForPolicy(evaluationPolicy) });

  // Run-global registries: every request/operation/record/artifact/query ID
  // claimed by any channel lives in one map, so cross-channel reuse fails.
  const usedIds = new Map();
  const signalAuth = new Map();
  const ownedRoots = new Map();
  let execAuth = null;
  let teardownAuth = null;

  const claimId = (id, kind) => {
    if (!strNE(id) || usedIds.has(id)) fail(`${kind} id conflict`);
    usedIds.set(id, kind);
  };
  const reserveId = (id, kind) => {
    if (!strNE(id) || usedIds.has(id)) fail(`${kind} id conflict`);
    usedIds.set(id, `${kind}:reserved`);
  };
  const activateId = (id, kind) => {
    if (usedIds.get(id) !== `${kind}:reserved`) fail(`${kind} id unbound`);
    usedIds.set(id, kind);
  };

  const ctx = {
    runId, recordSchemaVersion, evaluationPolicy: evaluationPolicy === null ? null : copyDeep(evaluationPolicy),
    claimId,
    reserveId,
    activateId,
    signalAuth,
    ownedRoots,
    // The monitor's declared cached owned union, refreshed by every s2c
    // sample request. Signal authorization may reach a native-bound
    // workload descendant from this union while protected accounting
    // roots stay refused through ownedRoots below.
    ownedMembers: new Set(),
    getTeardownAuth: () => teardownAuth,
    // One shared sticky ordinary-work failure: any invalid known-channel
    // traffic or a collector accounting fault sets it. It blocks new
    // ordinary driver work and new workload roots while preserving
    // proof, owned signals, accounted cleanup helpers and teardown.
    failed: false,
  };

  const collectorState = () => ({
    poisoned: false,
    seq: { c2s: 0, s2c: 0 },
    ready: false,
    pending: new Map(),
    terminal: false,
    closing: false,
  });
  const states = {
    driver: {
      poisoned: false,
      seq: { d2s: 0, s2d: 0 },
      hello: false,
      started: false,
      stopped: false,
      finished: false,
      closed: false,
      pendingRegisters: new Map(),
      pendingBegin: null,
      liveOp: null,
      pendingRecords: new Map(),
      recordSeq: 0,
      artifacts: new Map(),
      artifactPaths: new Map(),
    },
    collector: collectorState(),
    "teardown-collector": collectorState(),
    "exec-gate": { poisoned: false, seq: { s2c: 0 }, consumed: false },
  };

  // The exec-gate channel carries exactly one pre-authorized gated query at
  // sequence 0, bound byte-identically to the authorizeExecGate declaration.
  const execGate = (st, message) => {
    need(st, execAuth !== null, "exec unauthorized");
    envelope(st, "s2c", message, [...base, "requestId", "identity", "query"], runId);
    need(
      st,
      message.type === "exec" &&
        message.seq === 0 &&
        message.requestId === execAuth.queryId &&
        eq(message.identity, execAuth.identity) &&
        eq(message.query, execAuth.query),
      "exec binding",
    );
    activateId(execAuth.queryId, "query");
    st.consumed = true;
    // Consumption frees the slot: a later gate gets its own fresh
    // authorization under the same run-global ID registry.
    execAuth = null;
  };

  const accept = (channel, direction, message, encodedByteLength) => {
    const st = states[channel];
    if (!st) fail(`channel ${channel}`);
    if (st.poisoned) fail("channel poisoned");
    // Every malformed input on a known channel, including a wrong
    // direction or a non-object message, fails inside this block with a
    // bounded IPC_INVALID plus channel poison and the run-global stop.
    try {
      need(st, Object.keys(st.seq).includes(direction), "direction");
      need(st, isObj(message), "message");
      const cap = channel === "driver" ? IPC_LIMITS.driverBytes : IPC_LIMITS.frameBytes;
      need(
        st,
        nat(encodedByteLength) && encodedByteLength > 0 && encodedByteLength <= cap,
        "frame bytes",
      );
      if (channel === "exec-gate") {
        execGate(st, message);
      } else if (channel === "driver") {
        if (direction === "d2s") driverD2S(ctx, st, message);
        else driverS2D(ctx, st, message);
      } else if (direction === "c2s") {
        collectC2S(ctx, st, channel === "teardown-collector", message);
      } else {
        collectS2C(ctx, st, channel === "teardown-collector", message);
      }
    } catch (error) {
      st.poisoned = true;
      ctx.failed = true;
      // A direct codec failure on a known channel (e.g. a non-JSON NaN
      // payload reaching a copy boundary) is normalized into the same
      // bounded IPC_INVALID evidence class as every other malformed
      // known-channel value. Parsed JSON can never carry NaN.
      if (typeof error.code === "string" && error.code.startsWith("CANON")) {
        fail("message value");
      }
      throw error;
    }
  };

  return Object.freeze({
    accept,

    // Pre-authorizes one exact (requestId, identity, signal) tuple. The
    // signal message itself must later arrive bound to an owned workload
    // root with the same identity and signal.
    authorizeSignal({ requestId, identity, signal }) {
      if (!isIdentity(identity) || !["TERM", "KILL"].includes(signal)) {
        fail("signal authorize fields");
      }
      reserveId(requestId, "request");
      signalAuth.set(requestId, { identity: copyDeep(identity), signal });
    },

    // Pre-authorizes one gated-exec query: requestId reservation plus the
    // exact identity and query the frame must carry. A fresh gate is
    // admitted only after the previous authorization was consumed; the
    // run-global ID registry and sticky failure are never reset.
    authorizeExecGate({ queryId, identity, query }) {
      if (execAuth !== null) fail("exec gate in use");
      if (!isIdentity(identity) || !isQuery(query)) fail("exec authorize fields");
      reserveId(queryId, "query");
      execAuth = { queryId, identity: copyDeep(identity), query: copyDeep(query) };
      // A fresh physical gate's stream restarts at sequence 0 after the
      // prior gate's consumption; the run-global ID registry, channel
      // poison and sticky failure are never reset.
      const gate = states["exec-gate"];
      gate.seq.s2c = 0;
      gate.consumed = false;
    },

    // Authorizes a fresh teardown-only collector channel once the healthy
    // collector is terminal, poisoned or closing. Its startup ready must
    // carry this exact collector identity; the channel can then continue
    // identity-safe cleanup (samples, signals on owned roots, shutdown) but
    // cannot take roots or launch workload.
    authorizeTeardownCollector({ identity }) {
      if (teardownAuth !== null) fail("teardown authorized");
      const coll = states.collector;
      if (!coll.terminal && !coll.poisoned && !coll.closing) fail("collector healthy");
      if (!isObj(identity) || !isIdentity(identity)) fail("teardown identity");
      teardownAuth = { identity: copyDeep(identity) };
    },
  });
}
