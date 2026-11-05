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
      // Repeated calls join the SAME original flow: the options
      // object is validated through the same pure numeric capture,
      // then the first stop handle and the remaining queue are
      // narrowed MIN-only to an earlier supplied bound — never a
      // second acquired stop handle, a wider extension, a new stop
      // clock or a second shutdown flow.
      if (state.stopFlow !== null) {
        const bound = authority.captureOperationBound(
          options,
          TIMING_LIMITS.commandMs,
        );
        authority.queue.narrowAll(bound);
        return state.stopFlow.promise;
      }
      const h = authority.op(options, TIMING_LIMITS.commandMs);
      const lifetime = authority.ownOperation(h);
      // The monotonic fence closes new external admission BEFORE the
      // drain snapshot; the sampling timer clears and ONLY the
      // actual pending start handle is expired through the same
      // hrtime, preserving its actual pending body/IO debts — never
      // a raw kill, fresh grace or second queue.
      state.stopping = true;
      if (state.timer !== null) {
        clock.clearInterval(state.timer);
        state.timer = null;
      }
      if (state.startHandle !== null) {
        state.startHandle.narrow(authority.nowMonoMs());
      }
      // The stop handle's own bound narrows every already-admitted
      // non-start handle MIN-only BEFORE the drain snapshot, so an
      // explicit tighter stop option reaches active, queued and
      // unqueued handles alike — narrow only, never extend.
      authority.queue.narrowAll(h.deadlineMonoMs());
      const ordinaryDrain = authority.queue.settled({ excludeHandle: h });
      // ONE passive barrier: the continuation starts no shutdown,
      // Native call or IO, and contains neither stop's own
      // actualSettled/acquisition, the public stop promise nor the
      // global lifetime.whenSettled — so it can never self-wait.
      const actualStopSettlement = ordinaryDrain.then(() =>
        collectorPhysicalAfterDrain(),
      );
      // Registered on the STOP operation's local retainActual BEFORE
      // bounded waiting, and the SAME actual promise is handed to the
      // private horizon release when a binding exists.
      lifetime.retainActual(actualStopSettlement);
      if (releaseHorizonAfter !== null) {
        releaseHorizonAfter(actualStopSettlement);
      }
      const promise = (async () => {
        try {
          await waitHandle(h, ordinaryDrain, "drain");
        } catch {
          // Teardown remains a permitted failure action, never proof:
          // a spent original handle issues nothing fresh, the drain
          // stays unproven inside the bound and no late ordinary work
          // or late-success continuation follows.
          try {
            teardownSend(h);
          } catch {
            // The wire already owns its terminal state.
          }
          authority.markFault(unproven("drain"));
          throw unproven("drain");
        }
        try {
          // Only while the original stop handle is live may the
          // wire-only shutdown/EOF be issued; the actual barrier is
          // then awaited under the SAME handle, the real result is
          // captured and the actual clock rechecked immediately
          // before public success — a late actual settlement never
          // revives a timed-out result.
          const teardownRun = teardownCollector(h);
          teardownRun.then(
            () => {},
            () => {},
          );
          await waitHandle(h, actualStopSettlement, "reap");
          const result = await teardownRun;
          h.assertLive("reap");
          return result;
        } catch {
          authority.markFault(unproven("collector reap"));
          throw unproven("collector reap");
        }
      })().finally(() => lifetime.finish());
      state.stopFlow = { handle: h, promise };
      return promise;
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return Object.freeze({ stopAndReap, teardownCollector });
}
