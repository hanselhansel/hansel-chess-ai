// WHOLE original fixed-first preflight handshake, moved for readable capacity.
// Parent pause, original bound, actual abort and receipt/ACK ordering stay here.
import { copyDeep, isObj } from "./protocol-values.mjs";
import { verifyInternalSelfTest } from "./prerequisites.mjs";
const fail = (code, detail) => {
  const error = new Error(`watchdog-operations ${code}: ${detail}`);
  error.code = code;
  return error;
};
export async function runSelftestBegin(ctx, records, runInternalSelfTest, msg, arm) {
  const send = (type, fields) => ctx.send(type, fields, Math.max(1, ctx.workRemainingMs()));
  // Fixed-first-preflight handshake: the callback runs under the ORIGINAL
  // command/work bound (captured at dispatch) and an abort wired into the
  // first-stop latch with the real parent reason. Eligibility and the bound
  // are rechecked after the awaited manifest-input load BEFORE the callback
  // is invoked — a stop during that load cancels. The only accepted output is
  // a genuine independently verified completionRef; begun emits the current
  // remaining only while the run is still eligible.
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
}
