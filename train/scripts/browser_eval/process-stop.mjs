// process-stop.mjs owns the WHOLE Native stop flow extracted from
// process-runtime.mjs: the permanent stopping fence closing new
// start/tick/ordinary admission, the sampling-timer clear and the
// pending-start interruption, ONE min-only stop handle and flow, the
// actual ordinary drain, the passive collector-after-drain barrier,
// the bounded wire-only shutdown/EOF and the collector-last reap
// with retained failure. It borrows the monitor's ONE shared
// lifecycle state, config.clock and the same frozen borrowed
// authorities; construction is pure — no spawn, timer, Native call,
// queue acquisition, clock read or state transition at construction.
// Direction is Facade→Runtime→Stop→Budget/constants: acyclic, with
// no Runtime/facade/Store/Recorder/lifetime/horizon/transport import
// and no independent lifecycle, queue, clock origin or proof
// authority.
import { waitHandle } from "./process-budget.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { isObj } from "./protocol-values.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

const unproven = (detail) => {
  const e = new Error(`CLEANUP_UNPROVEN ${detail}`);
  e.code = "CLEANUP_UNPROVEN";
  return e;
};

export function createProcessStop({ state, clock, authority }) {
  if (
    !isObj(state) ||
    !isObj(clock) ||
    typeof clock.clearInterval !== "function" ||
    typeof clock.setTimeout !== "function" ||
    typeof clock.clearTimeout !== "function" ||
    !isObj(authority) ||
    typeof authority.op !== "function" ||
    typeof authority.ownOperation !== "function" ||
    !isObj(authority.queue) ||
    typeof authority.queue.settled !== "function" ||
    typeof authority.queue.narrowAll !== "function" ||
    typeof authority.captureOperationBound !== "function" ||
    typeof authority.nowMonoMs !== "function" ||
    typeof authority.nextRid !== "function" ||
    typeof authority.markFault !== "function" ||
    (authority.releaseHorizonAfter !== null &&
      typeof authority.releaseHorizonAfter !== "function")
  ) {
    throw acct("stop options");
  }
  const releaseHorizonAfter = authority.releaseHorizonAfter;

  // The wire-only shutdown attempt shared by teardown and the failed
  // drain path: a no-ack shutdown frame, or private-pipe EOF when the
  // wire is already failed. The SAME original borrowed handle is
  // asserted live immediately before every fresh wire/EOF action —
  // the initial pre-send check never authorizes a later fallback
  // after the deadline — so a spent bound issues nothing. It is a
  // failure action, never settlement or drain proof.
  const teardownSend = (handle) => {
    handle.assertLive("teardown deadline");
    if (state.transport !== null && !state.transport.exited) {
      try {
        state.transport.sendNoAck(
          "shutdown",
          {},
          authority.nextRid("shutdown"),
          handle,
        );
      } catch {
        handle.assertLive("teardown deadline");
        state.transport.close();
      }
    }
  };

  // Collector teardown through the wire only on a BORROWED handle:
  // assert the supplied original handle live before every fresh
  // wire/EOF action, then return the existing handle-bounded public
  // transport.reap attempt — real exit plus BOTH pipe closes. It is
  // never the collector physical receipt, the ordinary drain or the
  // stop barrier, and a null transport alone is no-child proof of
  // nothing. No own handle/deadline/flow/drain and no raw kill.
  const teardownCollector = async (handle) => {
    handle.assertLive("teardown deadline");
    teardownSend(handle);
    if (state.transport === null) return { exitCode: null };
    return state.transport.reap(handle);
  };

  // The passive barrier's second half, evaluated only AFTER the
  // genuine ordinary drain: reread the actual collector receipt. An
  // armed receipt is the truth — real exit plus both pipe closes once
  // a child was adopted, the settled no-creation branch of a definite
  // failed spawn, or still-pending unproven while closure is
  // unproven. No-child may be reported only when no receipt was ever
  // armed: admission is permanently closed and any pending start was
  // actually drained, so no child/acquisition remains possible.
  const collectorPhysicalAfterDrain = () =>
    state.collectorPhysical === null
      ? Promise.resolve()
      : state.collectorPhysical;

  // Collector-last under one min-only stop handle/flow and one
  // ownOperation lifetime: the first valid stop reserves the flow,
  // fences new admission and expires only the pending start handle,
  // captures queue.settled({excludeHandle: stopHandle}) EVEN WHEN the
  // child is currently null — closed admission plus actual drained
  // acquisitions is what covers a pending start/backend/query — and
  // registers the ONE passive actualStopSettlement before any
  // bounded wait. A public drain/reap timeout is CLEANUP_UNPROVEN —
  // never swallowed and never followed by late work; a rejected
  // public result never becomes success.
  // The method stays synchronous over its flow so a VALID repeated
  // call returns the SAME cached promise; synchronous validation or
  // setup failures take the predecessor's rejected-Promise channel
  // instead, validated before effects and never clearing a valid
  // existing flow after a caller error.
  const stopAndReap = (options) => {
    try {
      // Validate and snapshot the stop-only form before any latch/clock effects.
      let failure = false;
      let ordinaryEnd;
      let numeric;
      if (options != null) {
        if (!isObj(options)) throw acct("stop options");
        const keys = Object.getOwnPropertyNames(options);
        failure = keys.includes("failureContainment");
        const hasOrdinaryEnd = keys.includes("ordinaryDeadlineMonoMs");
        const deadlineMonoMs = options.deadlineMonoMs;
        ordinaryEnd = hasOrdinaryEnd ? options.ordinaryDeadlineMonoMs : undefined;
        const allowed = ["deadlineMonoMs", ...(failure ? ["failureContainment"] : []),
          ...(hasOrdinaryEnd ? ["ordinaryDeadlineMonoMs"] : [])];
        if (!keys.includes("deadlineMonoMs") || keys.length !== allowed.length ||
          keys.some((key) => !allowed.includes(key)) ||
          (hasOrdinaryEnd && (!Number.isSafeInteger(ordinaryEnd) || ordinaryEnd < 0 || ordinaryEnd > deadlineMonoMs)) ||
          Object.getOwnPropertySymbols(options).length !== 0 ||
          !Number.isFinite(deadlineMonoMs) || deadlineMonoMs < 0 ||
          (failure && options.failureContainment !== true)) throw acct("stop options");
        numeric = Object.freeze({ deadlineMonoMs });
      }
      if (state.stopFlow?.settled) return state.stopFlow.promise;
      const bound = authority.captureOperationBound(numeric, TIMING_LIMITS.commandMs);
      if (state.stopFlow !== null) {
        const flow = state.stopFlow;
        flow.handle.narrow(bound);
        authority.queue.narrowAll(bound);
        flow.fenceOrdinary(ordinaryEnd);
        if (failure) flow.upgrade();
        return flow.promise;
      }
      const h = authority.op({ deadlineMonoMs: bound }, TIMING_LIMITS.commandMs);
      const lifetime = authority.ownOperation(h);
      authority.closePreflightQuality?.();
      state.stopping = true;
      authority.closeCoverage?.();
      if (state.timer !== null) {
        clock.clearInterval(state.timer);
        state.timer = null;
      }
      if (state.startHandle !== null) state.startHandle.narrow(authority.nowMonoMs());
      authority.queue.narrowAll(h.deadlineMonoMs());
      const ordinaryDrain = authority.queue.settled({ excludeHandle: h });
      // Failure containment never retires this real drain or the independently
      // prearmed collector physical receipt; both remain owned after expiry.
      const actualStopSettlement = ordinaryDrain.then(() => collectorPhysicalAfterDrain());
      lifetime.retainActual(actualStopSettlement);
      if (releaseHorizonAfter !== null) releaseHorizonAfter(actualStopSettlement);
      const flow = { handle: h, promise: null, settled: false, failed: false, sent: false,
        upgrade: null, fenceOrdinary: null };
      let ordinaryProven = false;
      let ordinaryDecision = Infinity;
      let ordinaryTimer = null;
      const clearOrdinaryTimer = () => {
        if (ordinaryTimer !== null) clock.clearTimeout(ordinaryTimer);
        ordinaryTimer = null;
      };
      ordinaryDrain.then(() => {
        // Actual settlement observed at/after P cannot beat a delayed timer.
        if (ordinaryDecision !== Infinity && !flow.sent && !flow.failed &&
          !flow.settled && authority.nowMonoMs() >= ordinaryDecision) flow.upgrade();
        ordinaryProven = true;
        clearOrdinaryTimer();
      });
      const sendOnce = () => {
        if (flow.sent) return;
        h.assertLive("teardown deadline");
        flow.sent = true;
        teardownSend(h);
      };
      flow.upgrade = () => {
        clearOrdinaryTimer();
        if (!flow.failed) {
          flow.failed = true;
          authority.markFault(unproven("failed cleanup containment"));
        }
        try { sendOnce(); } catch { /* A spent/failed send never invents closure. */ }
      };
      // P decides only the actual ordinary prerequisite. The SAME collector
      // handle/reap stays at C after a timely normal teardown was issued.
      flow.fenceOrdinary = (end) => {
        if (end === undefined || end >= ordinaryDecision || ordinaryProven ||
          flow.sent || flow.failed || flow.settled) return;
        clearOrdinaryTimer();
        ordinaryDecision = end;
        if (authority.nowMonoMs() >= end) flow.upgrade();
        else ordinaryTimer = clock.setTimeout(() => {
          ordinaryTimer = null;
          if (!ordinaryProven && !flow.sent && !flow.settled) flow.upgrade();
        }, end - authority.nowMonoMs());
      };
      // Associate the one flow before any frame/callback can reenter stop.
      flow.promise = Promise.resolve().then(async () => {
        try {
          await waitHandle(h, ordinaryDrain, "drain");
        } catch {
          try { sendOnce(); } catch { /* No fresh action after the same end. */ }
          authority.markFault(unproven("drain"));
          throw unproven("drain");
        }
        try {
          sendOnce();
          const teardownRun = state.transport === null ? Promise.resolve({ exitCode: null }) : state.transport.reap(h);
          teardownRun.catch(() => {});
          await waitHandle(h, actualStopSettlement, "reap");
          const result = await teardownRun;
          h.assertLive("reap");
          if (flow.failed) throw unproven("failed cleanup containment");
          return result;
        } catch {
          authority.markFault(unproven("collector reap"));
          throw unproven("collector reap");
        }
      }).finally(() => { flow.settled = true; clearOrdinaryTimer(); lifetime.finish(); });
      state.stopFlow = flow;
      flow.fenceOrdinary(ordinaryEnd);
      if (failure) flow.upgrade();
      return flow.promise;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return Object.freeze({ stopAndReap, teardownCollector });
}
