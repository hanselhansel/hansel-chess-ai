// watchdog-operations.mjs owns validated
// driver dispatch and the fixed-first preflight runInternalSelfTest handshake
// over the SAME shared run context supplied by watchdog.mjs.
// createWatchdogOperationContext now lives in watchdog-config.mjs under the
// final readable-owners decision (19) and is re-exported here so the
// lifecycle keeps the original private import API. Dispatch semantics are
// unchanged: hello/
// heartbeat/end/finish/closed update lifecycle state synchronously; register/
// begin/event/artifact run through the bounded serialized ordinary queue with
// real Native deadlines. begun/recorded use the current remaining bound and
// the unchanged wire recordSeq. No copied registry, second writer, phase-clock
// reset, wire field, process launcher, direct kill or final-writer authority.
import { copyDeep, isObj } from "./protocol-values.mjs";
import { verifyInternalSelfTest } from "./prerequisites.mjs";
import { issueActual } from "./artifact-files.mjs";
import { createWatchdogOrdinaryQueue } from "./watchdog-ordinary.mjs";

export { createWatchdogOperationContext } from "./watchdog-config.mjs";

// Error factory: returns the Error. Guard sites throw explicitly; queue,
// callback and handshake paths record/latch without throwing first.
const fail = (code, detail) => {
  const e = new Error(`watchdog-operations ${code}: ${detail}`);
  e.code = code;
  return e;
};

export function createWatchdogOperations({ ctx, records, runInternalSelfTest = null }) {
  if (!isObj(ctx)) throw fail("IPC_INVALID", "ctx");
  if (!isObj(records)) throw fail("IPC_INVALID", "records");
  let firstOpAdmitted = false;

  // The bounded serialized ordinary queue lives in watchdog-ordinary.mjs —
  // ONE instance over the SAME ctx retainer, no copied chain here.
  const {
    enqueue,
    ordinaryAdmissionOpen,
    closeOrdinaryAdmission,
    whenOrdinarySettled,
  } = createWatchdogOrdinaryQueue({ ctx, retainActual: ctx.retainActual });
  if (ctx.stopped()) closeOrdinaryAdmission();

  const send = (type, fields) =>
    ctx.send(type, fields, Math.max(1, ctx.workRemainingMs()));

  const onRegister = async (msg) => {
    if (!ctx.admissionOpen()) return;
    // An accepted in-process fixture registration binds the ALREADY-PROVEN
    // driver owner — never an invented identity.
    if (msg.rootPid === null) {
      const owner = ctx.driverIdentity();
      if (owner === null) {
        const e = fail("ACCOUNTING_UNAVAILABLE", "no proven driver owner");
        ctx.recordFault(e);
        ctx.requestStop("ACCOUNTING_UNAVAILABLE");
        return;
      }
      if (msg.listener !== null) {
        ctx.monitor.registerPort({
          address: msg.listener.address,
          port: msg.listener.port,
          ownerIdentity: owner,
          scopeRunId: ctx.runId,
        });
      }
      await send("registered", {
        requestId: msg.requestId,
        identity: owner,
        listener: msg.listener,
      });
      return;
    }
    const reg = await ctx.monitor.registerRoot(
      {
        pid: msg.rootPid,
        kind: msg.kind,
        expectedExecutable: msg.expectedExecutable,
        scopeRunId: ctx.runId,
      },
      ctx.opDeadline(90000),
    );
    if (msg.listener !== null) {
      ctx.monitor.registerPort({
        address: msg.listener.address,
        port: msg.listener.port,
        ownerIdentity: reg.identity,
        scopeRunId: ctx.runId,
      });
    }
    await send("registered", {
      requestId: msg.requestId,
      identity: reg.identity,
      listener: msg.listener,
    });
  };

  const onBegin = async (msg, arm) => {
    if (!ctx.admissionOpen()) return;
    if (ctx.phase === "preflight" && msg.operationId === ctx.selftest.id) {
      return onSelftestBegin(msg, arm);
    }
    const remainingMs = Math.floor(arm.deadlineMonoMs - ctx.nowMonoMs());
    if (remainingMs <= 0) {
      ctx.requestStop("OPERATION_TIMEOUT");
      return;
    }
    await send("begun", { operationId: msg.operationId, remainingMs });
  };

  // Fixed-first-preflight handshake: the callback runs under the ORIGINAL
  // command/work bound (captured at dispatch) and an abort wired into the
  // first-stop latch with the real parent reason. Eligibility and the bound
  // are rechecked after the awaited manifest-input load BEFORE the callback
  // is invoked — a stop during that load cancels. The only accepted output is
  // a genuine independently verified completionRef; begun emits the current
  // remaining only while the run is still eligible.
  const onSelftestBegin = async (msg, arm) => {
    const st = ctx.selftest;
    if (msg.kind !== "command" || st.invoked) {
      const e = fail("IPC_INVALID", "selftest begin kind/order");
      ctx.recordFault(e);
      ctx.requestStop("SELFTEST_INVALID");
      return;
    }
    if (typeof runInternalSelfTest !== "function") {
      const e = fail("SELFTEST_UNAVAILABLE", "no trusted callback");
      ctx.recordFault(e);
      ctx.requestStop("SELFTEST_UNAVAILABLE");
      return;
    }
    st.invoked = true;
    const controller = new AbortController();
    st.controller = controller;
    ctx.onFirstStop(() => {
      if (!controller.signal.aborted) {
        controller.abort(ctx.stopReason() ?? "STOPPED");
      }
    });
    try {
      const inputs = await records.manifestInputs();
      if (ctx.stopped() || controller.signal.aborted) return;
      if (ctx.nowMonoMs() >= arm.deadlineMonoMs) {
        ctx.requestStop("OPERATION_TIMEOUT");
        return;
      }
      const context = Object.freeze({
        workspaceRoot: ctx.workspaceRoot,
        parentRunId: ctx.runId,
        parentSupervisor: copyDeep(ctx.parentSupervisor()),
        commonIdentity: copyDeep(ctx.commonIdentity),
        inputs: copyDeep(inputs),
        monitor: ctx.monitor,
        subrunRunId: `${ctx.runId}:watchdog-selftest`,
        phaseDirectory: "preflight/selftest",
        owner: {
          phase: "preflight",
          runId: ctx.runId,
          supervisor: copyDeep(ctx.parentSupervisor()),
        },
        deadlineMonoNs: BigInt(Math.floor(arm.deadlineMonoMs)) * 1000000n,
        signal: controller.signal,
        // The ONE opaque driver actual scope forwards by reference — the
        // nested selftest enrolls under it; never copied or remade.
        parentDriverScope: ctx.driverActualScope,
      });
      const result = await runInternalSelfTest(context);
      // Recheck actual admission AFTER the awaited selftest callback: a
      // first stop during it cancels — no fresh ordinary Native probe and
      // no late positive ack/ref can be admitted afterward.
      if (
        ctx.stopped() ||
        !ctx.admissionOpen() ||
        controller.signal.aborted
      ) {
        return;
      }
      if (ctx.nowMonoMs() >= arm.deadlineMonoMs) {
        ctx.requestStop("OPERATION_TIMEOUT");
        return;
      }
      const completionRef =
        isObj(result) && isObj(result.completionRef)
          ? copyDeep(result.completionRef)
          : null;
      if (!completionRef) throw fail("SELFTEST_UNAVAILABLE", "no completionRef");
      const verified = await verifyInternalSelfTest({
        workspaceRoot: ctx.workspaceRoot,
        completionRef,
        parentRunId: ctx.runId,
        parentSupervisor: ctx.parentSupervisor(),
        expectedIdentity: ctx.commonIdentity,
        probeIdentity: (identity) => {
          // The same guard runs INSIDE the post-receipt-IO probe: held
          // receipt IO can never let a Native dispatch begin after closed
          // admission or the captured original arm bound.
          if (
            ctx.stopped() ||
            !ctx.admissionOpen() ||
            controller.signal.aborted ||
            ctx.nowMonoMs() >= arm.deadlineMonoMs
          ) {
            return Promise.reject(
              fail("OPERATION_TIMEOUT", "probe after stop or bound"),
            );
          }
          return ctx.monitor.probeIdentity(identity, {
            deadlineMonoMs: arm.deadlineMonoMs,
          });
        },
      }, ctx.io);
      st.completionRef = copyDeep(verified.completionRef);
      st.verified = verified;
      const remainingMs = Math.floor(arm.deadlineMonoMs - ctx.nowMonoMs());
      if (ctx.admissionOpen() && remainingMs > 0) {
        await send("begun", { operationId: msg.operationId, remainingMs });
      }
    } catch (error) {
      ctx.recordFault(error);
      if (!ctx.stopped()) ctx.requestStop("SELFTEST_UNAVAILABLE");
    }
  };

  const onRecord = async (msg) => {
    if (!ctx.admissionOpen()) return;
    const ref =
      msg.type === "artifact"
        ? await records.persistArtifact(msg)
        : await records.persistEvent(msg);
    if (!ctx.admissionOpen()) return;
    await send("recorded", {
      recordId: msg.recordId,
      recordSeq: msg.recordSeq,
      ref: ref === undefined ? null : ref,
    });
  };

  // Re-verify the retained receipt before parent finalization while the
  // collector still answers probes. Returns the exact expectedSelfTest object
  // or null when no genuine receipt exists (incomplete evidence, never a
  // fabricated ref or retry).
  const selftestEvidence = async ({ deadlineMonoMs } = {}) => {
    const st = ctx.selftest;
    if (ctx.phase !== "preflight" || !st.completionRef) return null;
    // The trusted ORIGINAL absolute end (the captured cleanup end — never
    // phaseEnd) must be a finite safe integer; anything else is a binding
    // fault, not a fresh window.
    if (!Number.isSafeInteger(deadlineMonoMs)) {
      ctx.recordFault(fail("IPC_INVALID", "selftestEvidence bound"));
      return null;
    }
    // Snapshot the genuine retained ref/owner BEFORE the first await.
    const completionRef = copyDeep(st.completionRef);
    const parentSupervisor = ctx.parentSupervisor();
    // Clock guard BEFORE verifier IO: a spent bound never starts receipt
    // verification.
    if (ctx.nowMonoMs() >= deadlineMonoMs) return null;
    try {
      // Prearm the verifier body through the SAME actual retainer BEFORE
      // the verifier is invoked: the awaited issue covers its receipt IO
      // and post-FS probe dispatch as ONE genuine owner debt.
      const verified = await issueActual(ctx.retainActual, () =>
        verifyInternalSelfTest(
          {
            workspaceRoot: ctx.workspaceRoot,
            completionRef,
            parentRunId: ctx.runId,
            parentSupervisor,
            expectedIdentity: ctx.commonIdentity,
            probeIdentity: (identity) => {
              // The clock is checked AGAIN inside the actual probe AFTER
              // receipt IO and before the fresh Native dispatch — cleanup
              // proof may run after ordinary admission closed, but never
              // past the original captured end.
              if (ctx.nowMonoMs() >= deadlineMonoMs) {
                return Promise.reject(
                  fail("OPERATION_TIMEOUT", "probe past cleanup end"),
                );
              }
              return ctx.monitor.probeIdentity(identity, { deadlineMonoMs });
            },
          },
          ctx.io,
        ),
      );
      return {
        completion: copyDeep(verified.completionRef),
        expectedStopReason: "HEARTBEAT_TIMEOUT",
      };
    } catch (error) {
      ctx.recordFault(error);
      return null;
    }
  };

  // Validated d2s dispatch. Control messages mutate lifecycle synchronously so
  // heartbeats, finish admission and first-stop handling never wait on the
  // ordinary queue. The begin operation clock arms at dispatch — a stalled
  // record queue can never defer the 30/90-second bound.
  const dispatch = (msg) => {
    switch (msg.type) {
      case "hello":
        if (
          ctx.channelPid() !== null &&
          msg.pid === ctx.channelPid() &&
          msg.phase === ctx.phase &&
          msg.commonIdentitySha256 === ctx.commonIdentitySha256
        ) {
          ctx.noteHelloOk();
        } else {
          const e = fail("HELLO_MISMATCH", "pid/phase/hash");
          ctx.recordFault(e);
          ctx.requestStop("HELLO_MISMATCH");
        }
        return;
      case "heartbeat":
        ctx.noteHeartbeat();
        return;
      case "closed":
        ctx.noteDriverClosed();
        return;
      case "end": {
        const dl = ctx.operationDeadline();
        ctx.disarmOperation();
        if (dl !== null && ctx.nowMonoMs() > dl) {
          const e = fail("OPERATION_TIMEOUT", "end after captured bound");
          ctx.recordFault(e);
          ctx.requestStop("OPERATION_TIMEOUT");
        }
        if (ctx.admissionOpen() && ordinaryAdmissionOpen()) {
          enqueue(() =>
            records.recordOperationEnd(msg.operationId, copyDeep(msg.result)),
          );
        }
        return;
      }
      case "finish":
        ctx.noteFinish(msg);
        return;
      case "register":
        if (!ordinaryAdmissionOpen()) return;
        enqueue(() => onRegister(msg));
        return;
      case "begin": {
        // Fence BEFORE firstOpAdmitted mutation and ctx.armOperation; the
        // clock still arms at dispatch, never behind the queue.
        if (!ordinaryAdmissionOpen()) return;
        if (ctx.phase === "preflight" && !firstOpAdmitted) {
          if (msg.operationId !== ctx.selftest.id || msg.kind !== "command") {
            const e = fail("IPC_INVALID", "first op must be fixed selftest begin");
            ctx.recordFault(e);
            ctx.requestStop("SELFTEST_INVALID");
            return;
          }
          firstOpAdmitted = true;
        }
        const arm = ctx.armOperation(msg.kind);
        enqueue(() => onBegin(msg, arm));
        return;
      }
      case "event":
      case "artifact":
        if (!ordinaryAdmissionOpen()) return;
        if (ctx.phase === "preflight" && !firstOpAdmitted) {
          const e = fail("IPC_INVALID", "record before fixed selftest begin");
          ctx.recordFault(e);
          ctx.requestStop("SELFTEST_INVALID");
          return;
        }
        enqueue(() => onRecord(msg));
        return;
      default:
        return;
    }
  };

  return Object.freeze({
    dispatch,
    selftestEvidence,
    closeOrdinaryAdmission,
    whenOrdinarySettled,
  });
}
