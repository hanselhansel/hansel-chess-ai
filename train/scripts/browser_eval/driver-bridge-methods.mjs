// driver-bridge-methods.mjs is the private ordinary-methods leaf of
// the driver-bridge three-owner split (C4b-02):
// createDriverBridgeMethods(ctx,wire) takes the SAME private ctx6
// plus the SAME wire instance and returns the frozen EXACT4
// {register,operation,event,artifact} — the WHOLE public ordinary
// bodies, the exact {status,evidencePaths,detail} OperationResult
// validation, the 256 ordinary pending bound and the ONE serialized
// recordChain over the wire's single seqOut / state.recordSeq / ID
// counters / ACK maps. No second queue, validator or clock: every
// queued ordinary body checks wire.admissible() before issue and
// after each await — no queued record, late iterator or end after
// stop. Every actual record body, work callback and iterator.next is
// retained through wire.retainBody BEFORE effect (the public race is
// not the body join). The event payload is snapshotted before the
// queue await and each chunk's bytes before the lookahead await so
// caller/producer buffer reuse cannot mutate in-flight data. The
// checkSerialized intent holds — a serialization/ceiling failure
// consumes no recordSeq or pending ACK slot while the real send
// still validates the exact frame and the 262144 driverBytes /
// 64 KiB chunk / 256 ceilings. Artifact streams keep fresh
// artifact/record IDs with no concurrently-active path or closed-ID
// reuse (a completed path may bind a fresh artifactId), one final
// last:true chunk (empty stream sends one empty final), null
// nonfinal refs and the final ref bound to the exact path. Imports
// shared bridgeError/defer from the wire leaf — never the facade.
// Functional runtime input; DAG methods -> wire -> pure primitives.

import { canonicalBytes } from "./canonical-json.mjs";
import {
  copyDeep,
  exactFields,
  eventKinds,
  isAbs,
  isObj,
  isPid,
  isRel,
  isListener,
  strNE,
} from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { bridgeError, defer } from "./driver-bridge-wire.mjs";

const IPC = FIXED_LIMITS.ipc;
const TIMING = FIXED_LIMITS.timing;
const OP_CEILING = { readiness: TIMING.readinessMs, command: TIMING.commandMs };
const REGISTER_KINDS = ["browser", "python", "fixture"];
const RESULT_FIELDS = ["status", "evidencePaths", "detail"];
const MAX_PENDING = 256;

// Sole factory export — pure construction over the SAME ctx6 and
// wire instance; it invokes nothing at factory time.
export function createDriverBridgeMethods(ctx, wire) {
  const runId = ctx.runId;
  const st = ctx.state;
  const transport = ctx.transport;

  // Pure pre-validation of the exact frame a send would carry —
  // recordSeq and pending ACK slots are claimed only after it
  // passes, so a serialization/ceiling failure is definite no-issue
  // with the sequence slot unconsumed. wire.sendFrame still guards
  // the identical frame and ceiling before transport.send.
  const checkSerialized = (type, fields) => {
    const wire = canonicalBytes({
      ipcVersion: 1,
      runId,
      seq: st.seqOut,
      type,
      ...fields,
    });
    if (wire.length > IPC.driverBytes) throw bridgeError("driverBytes");
  };

  const admitOrdinary = () => {
    if (st.ordinary >= MAX_PENDING) throw bridgeError("pending bound");
    st.ordinary += 1;
    return () => {
      st.ordinary -= 1;
    };
  };
  // ONE serialized record queue: a neutral actual receipt is prearmed
  // BEFORE queue admission — an immediate close sees every admitted
  // body, not only the running head. Each step is then retained as a
  // real body before it runs (the public race is not the body join),
  // rechecks admissible before issue, and the run surfaces the
  // original value or exact arbitrary error.
  const enqueueRecord = (fn) => {
    const actual = defer();
    st.actual.add(actual.promise);
    transport.retainActual(actual.promise);
    const run = st.recordChain.then(async () => {
      let outcome;
      try {
        wire.admissible();
        outcome = await wire.retainBody(fn);
      } catch (e) {
        outcome = { threw: true, value: e };
      } finally {
        st.actual.delete(actual.promise);
        actual.resolve();
      }
      if (outcome.threw) throw outcome.value;
      return outcome.value;
    });
    st.recordChain = run.then(
      () => {},
      () => {},
    );
    return run;
  };

  // Bounded descriptive text for a failed end.result detail only — a
  // hostile toString can never mask the ORIGINAL value, which still
  // rejects the public below by explicit presence (null/undefined
  // preserved, never truthiness).
  const failedErrorText = (v) => {
    try {
      return String(v).slice(0, 512);
    } catch {
      return "[unstringifiable]";
    }
  };
  const snapshotResult = (v) => {
    const c = copyDeep(v);
    if (
      !isObj(c) ||
      !exactFields(c, RESULT_FIELDS) ||
      !(c.status === "completed" || c.status === "failed") ||
      !Array.isArray(c.evidencePaths) ||
      !c.evidencePaths.every(strNE) ||
      !isObj(c.detail)
    ) {
      throw bridgeError("result");
    }
    return c;
  };

  const register = async (fields) => {
    const release = admitOrdinary();
    try {
      wire.admissible();
      if (!isObj(fields)) throw bridgeError("fields");
      const { kind, rootPid, expectedExecutable, listener } = fields;
      if (!REGISTER_KINDS.includes(kind)) throw bridgeError("kind");
      if (!(rootPid === null || isPid(rootPid))) throw bridgeError("rootPid");
      if (!(expectedExecutable === null || isAbs(expectedExecutable)))
        throw bridgeError("expectedExecutable");
      if (!(listener === null || isListener(listener))) throw bridgeError("listener");
      if (kind !== "fixture" && !(isPid(rootPid) && isAbs(expectedExecutable)))
        throw bridgeError("binding");
      const requestId = wire.freshId("request");
      const req = defer();
      req.kind = kind;
      req.rootPid = rootPid;
      req.listener = listener === null ? null : copyDeep(listener);
      st.pendingRegisters.set(requestId, req);
      // The frame carries the SAME copied metadata snapshot — never
      // the caller's still-mutable listener object.
      const sendDebt = wire.sendFrame("register", {
        requestId,
        kind,
        rootPid,
        expectedExecutable,
        listener: req.listener,
      });
      const [, ack] = await wire.raced(Promise.all([sendDebt, req.promise]));
      return ack;
    } finally {
      release();
    }
  };

  const operation = async (kind, operationId, work) => {
    const release = admitOrdinary();
    try {
      wire.admissible();
      if (!(kind === "readiness" || kind === "command")) throw bridgeError("kind");
      if (!strNE(operationId)) throw bridgeError("operationId");
      if (typeof work !== "function") throw bridgeError("work");
      if (st.pendingBegin !== null || st.liveOp !== null) throw bridgeError("operation busy");
      wire.claimId(operationId);
      const op = defer();
      op.operationId = operationId;
      op.ceilingMs = OP_CEILING[kind];
      st.pendingBegin = op;
      const flow = (async () => {
        let begun;
        try {
          const sendDebt = wire.sendFrame("begin", { operationId, kind });
          [, begun] = await wire.raced(Promise.all([sendDebt, op.promise]));
        } finally {
          if (st.pendingBegin === op) st.pendingBegin = null;
        }
        if (st.liveOp === null || st.liveOp.operationId !== operationId)
          throw bridgeError("begun lost");
        // The actual work body is retained BEFORE invocation — the
        // public race may reject on stop while the genuine body
        // receipt stays held until actual settlement.
        const outcome = await wire.retainBody(() =>
          work({ remainingMs: begun.remainingMs, signal: st.derived.signal }),
        );
        let resultOk = !outcome.threw;
        let resultValue = null;
        let resultError = outcome.threw ? outcome.value : null;
        if (resultOk) {
          try {
            resultValue = snapshotResult(outcome.value);
          } catch (e) {
            resultOk = false;
            resultError = e;
          }
        }
        if (st.liveOp !== null && st.liveOp.operationId === operationId) {
          st.liveOp = null;
          if (
            !st.stopped &&
            st.fault === null &&
            !st.disconnected &&
            !st.aborted &&
            !st.finished &&
            !st.closed
          ) {
            const result = resultOk
              ? resultValue
              : {
                  status: "failed",
                  evidencePaths: [],
                  detail: { error: failedErrorText(resultError) },
                };
            await wire.raced(wire.sendFrame("end", { operationId, result }));
          }
        }
        if (!resultOk) throw resultError;
        return outcome.value;
      })();
      return await wire.raced(flow);
    } finally {
      release();
    }
  };

  const event = async (kind, payload) => {
    const release = admitOrdinary();
    try {
      wire.admissible();
      if (!eventKinds.includes(kind)) throw bridgeError("kind");
      if (!isObj(payload)) throw bridgeError("payload");
      // Snapshot before the queue await — caller mutation after the
      // call can never alter what the queued step serializes.
      const snapshot = copyDeep(payload);
      await wire.raced(
        enqueueRecord(async () => {
          wire.admissible();
          const recordId = wire.freshId("record");
          const recordSeq = st.recordSeq;
          checkSerialized("event", {
            recordId,
            recordSeq,
            kind,
            payload: snapshot,
          });
          st.recordSeq += 1;
          const rec = defer();
          rec.recordSeq = recordSeq;
          rec.final = false;
          st.pendingRecords.set(recordId, rec);
          const sendDebt = wire.sendFrame("event", {
            recordId,
            recordSeq,
            kind,
            payload: snapshot,
          });
          await wire.raced(Promise.all([sendDebt, rec.promise]));
          wire.admissible();
        }),
      );
    } finally {
      release();
    }
  };

  const artifact = async (path, mode, chunks) => {
    const release = admitOrdinary();
    try {
      wire.admissible();
      if (!isRel(path)) throw bridgeError("path");
      if (!(mode === "append" || mode === "replace")) throw bridgeError("mode");
      if (st.openArtifacts.has(path)) throw bridgeError("artifact path");
      const iterator =
        chunks !== null &&
        chunks !== undefined &&
        (typeof chunks[Symbol.asyncIterator] === "function"
          ? chunks[Symbol.asyncIterator]()
          : typeof chunks[Symbol.iterator] === "function"
            ? chunks[Symbol.iterator]()
            : null);
      if (iterator === null) throw bridgeError("chunks");
      const artifactId = wire.freshId("artifact");
      st.openArtifacts.add(path);
      // Each iterator.next is a real body retained before the pull,
      // admission-fenced on both sides of the await.
      const pull = async () => {
        wire.admissible();
        const out = await wire.retainBody(() => iterator.next());
        if (out.threw) throw out.value;
        wire.admissible();
        return out.value;
      };
      return await wire.raced(
        enqueueRecord(async () => {
          wire.admissible();
          let ref = null;
          let sentAny = false;
          let cur = await pull();
          while (true) {
            if (cur.done === true) {
              if (sentAny) break;
              cur = { done: false, value: new Uint8Array(0) };
            }
            if (!(cur.value instanceof Uint8Array)) throw bridgeError("chunk");
            // Snapshot the chunk bytes BEFORE the lookahead pull —
            // the producer may reuse the returned buffer.
            const chunk = Buffer.from(cur.value);
            if (chunk.length > IPC.chunkBytes) throw bridgeError("chunkBytes");
            const data = chunk.toString("base64");
            const nxt = await pull();
            const last = nxt.done === true;
            wire.admissible();
            const recordId = wire.freshId("record");
            const recordSeq = st.recordSeq;
            checkSerialized("artifact", {
              recordId,
              recordSeq,
              artifactId,
              path,
              mode,
              encoding: "base64",
              data,
              last,
            });
            st.recordSeq += 1;
            const rec = defer();
            rec.recordSeq = recordSeq;
            rec.final = last;
            rec.path = path;
            st.pendingRecords.set(recordId, rec);
            const sendDebt = wire.sendFrame("artifact", {
              recordId,
              recordSeq,
              artifactId,
              path,
              mode,
              encoding: "base64",
              data,
              last,
            });
            const [, ackRef] = await wire.raced(Promise.all([sendDebt, rec.promise]));
            wire.admissible();
            sentAny = true;
            if (last) {
              ref = ackRef;
              break;
            }
            cur = nxt;
          }
          st.openArtifacts.delete(path);
          return ref;
        }),
      );
    } finally {
      release();
    }
  };

  return Object.freeze({ register, operation, event, artifact });
}
