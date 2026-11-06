import { issueActual } from "./artifact-files.mjs";

// Error factory: returns the Error. Guard sites throw explicitly; queue,
// callback and handshake paths record/latch without throwing first.
const fail = (code, detail) => {
  const e = new Error(`watchdog-operations ${code}: ${detail}`);
  e.code = code;
  return e;
};

const MAX_QUEUE = 256;

export function createWatchdogOrdinaryQueue({ ctx, retainActual }) {
  let chain = Promise.resolve();
  let queued = 0;
  let closed = false;

  const onOrdinaryFault = (error) => {
    if (!ctx.stopped()) {
      ctx.recordFault(error);
      ctx.requestStop(`FAULT ${error && error.code ? error.code : "WORK"}`);
      // First-stop/narrow already happened. Descriptive failure cannot mask it.
      try {
        ctx.reportOrdinaryFault?.(error);
      } catch {}
    }
    throw error;
  };

  const releaseOrdinary = () => {
    queued -= 1;
  };

  // Bounded serialized ordinary-work queue. A queue fault still records the
  // fault and requests stop; it never becomes a successful admission, and an
  // overflow is consumed through that same fault/stop path rather than left
  // as an unhandled rejection.
  const enqueue = (fn) => {
    if (closed) return Promise.resolve();
    if (queued >= MAX_QUEUE) {
      const e = fail("IPC_OVERFLOW", "ordinary queue bound");
      ctx.recordFault(e);
      ctx.requestStop("IPC_OVERFLOW");
      return Promise.resolve();
    }
    queued += 1;
    const prior = chain;
    let p;
    try {
      // Prearm the neutral actual-body receipt through the SAME retainer
      // BEFORE the thunk creates the queued body: the receipt covers the
      // whole body including the shared catch/finally paths, and no work or
      // callback can begin ahead of its registered debt.
      p = issueActual(retainActual, () =>
        prior.then(fn).catch(onOrdinaryFault).finally(releaseOrdinary),
      );
    } catch (error) {
      // Registration or issuance failed before the body existed: the real
      // error still flows through the SAME fault/stop handlers and the slot
      // is released exactly once, with the chain consumed as usual below.
      p = Promise.reject(error)
        .catch(onOrdinaryFault)
        .finally(releaseOrdinary);
    }
    chain = p.catch(() => {});
    return p;
  };

  // Passive read of the admission fence only: no mutation, callback, clock
  // or IO. Operations checks this BEFORE arming fresh ordinary work.
  const ordinaryAdmissionOpen = () => !closed;

  // Permanent synchronous admission fence. Idempotent; already-admitted
  // bodies keep draining through the SAME chain.
  const closeOrdinaryAdmission = () => {
    closed = true;
  };

  // Before the fence this throws synchronously; after it the SAME current
  // chain is returned, so the caller joins real admitted-body settlement
  // (callback/fault/slot paths included), never a snapshot or wrapper.
  const whenOrdinarySettled = () => {
    if (!closed) throw fail("IPC_INVALID", "ordinary admission open");
    return chain;
  };

  return Object.freeze({
    enqueue,
    ordinaryAdmissionOpen,
    closeOrdinaryAdmission,
    whenOrdinarySettled,
  });
}
