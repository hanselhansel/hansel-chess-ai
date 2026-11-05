// process-lsof-io.mjs owns ONE gated lsof wrapper child's complete
// physical lifecycle, extracted whole from process-lsof.mjs under the
// lsof child-IO readable split. The DEFERRED physical receipt is
// created and handed to the existing trusted registrar BEFORE the
// caller initiates spawn; it fulfills only on the real exit plus BOTH
// output-pipe closes plus every issued fd-3 operation's real
// callback/error outcome — a fault, public rejection, end() or
// destroy() invocation never fulfills it, while a synchronous
// failure before any child exists settles it truthfully. Output is
// accumulated under ONE combined 4 MiB pre-retention bound; every
// stdout/stderr/fd3-error/exit/close listener is a named registration
// released only at the shared terminal boundary. That boundary
// requires BOTH the physical receipt's fulfillment AND the caller's
// finishFlow: named listeners, captured buffers and the isolated
// `onPhysicalSettled` dispose callback release together there, never
// on the early receipt while the gate still parses under the same
// borrowed budget. This owner never spawns, resolves paths, registers
// roots, signals, samples, sets a timer or selects a deadline/clock —
// the lsof entry keeps every one of those authorities and wraps the
// returned promises under its ONE borrowed handle.
import { lsofError } from "./process-lsof-fields.mjs";

const MAX_OUT = 4 * 1024 * 1024;

// A pure factory: `retainActual` is the existing trusted physical
// registrar (null for an isolated gate) and `onPhysicalSettled` is
// the optional isolated-handle dispose callback invoked only at the
// shared physical+flow terminal boundary. The deferred promise's
// executor stores only its resolver — no IO starts early.
export function createLsofChildIO({ retainActual, onPhysicalSettled } = {}) {
  let settlePhysical;
  const physical = new Promise((r) => (settlePhysical = r));
  if (typeof retainActual === "function") retainActual(physical);
  let child = null;
  let exited = false;
  let exitCode = null;
  let outClosed = false;
  let errClosed = false;
  // The fd-3 issuance decision is itself a required settlement input:
  // while the entry may still issue its FIRST tracked end (the
  // authorized frame or the bounded no-frame close), an early exit plus
  // both closes can never fulfill the physical receipt — the issued
  // operation's own real callback/error would otherwise land after the
  // acquisition released. `gateClosed` marks the permanent end of
  // permitted issuance; `fd3Issued` enforces exactly one tracked end;
  // `fd3Done` records its actual landed outcome. end-invocation or
  // writableEnded alone is never proof.
  let gateClosed = false;
  let fd3Done = false;
  let fd3Issued = false;
  // A broken private gate is latched for the flow, preserving the
  // ORIGINAL error: an fd-3 fault before any write or one arriving
  // after its issued operation is still the gate's truthful failure,
  // and no authorized frame may follow it.
  let fd3Failed = null;
  let pendingWrite = null;
  let physicalSettled = false;
  const checkPhysical = () => {
    if (
      exited &&
      outClosed &&
      errClosed &&
      gateClosed &&
      (!fd3Issued || fd3Done)
    ) {
      physicalSettled = true;
      settlePhysical();
    }
  };
  // Permanently end first-issuance permission: called by the issued
  // end itself, by closeGate when no end is issuable and by
  // finishFlow; an already-issued operation's landed outcome is still
  // required.
  const closeIssuance = () => {
    gateClosed = true;
    checkPhysical();
  };
  let outParts = [];
  let errParts = [];
  let outBytes = 0;
  let errBytes = 0;
  let faulted = false;
  let doneResolve;
  let doneReject;
  // The bounded-query promise and the deferred physical receipt share
  // the same real facts but serve different roles: a fault rejects
  // `done` immediately while `physical` stays pending until genuine
  // exit-plus-closes-plus-write settlement.
  const done = new Promise((resolve, reject) => {
    doneResolve = resolve;
    doneReject = reject;
  });
  // The original rejection carries an immediate observer so a delayed
  // caller await can never produce an unhandled rejection — the
  // promise itself stays rejected with the real error.
  done.then(
    () => {},
    () => {},
  );
  const settled = () => {
    if (exited && outClosed && errClosed) doneResolve();
    checkPhysical();
  };
  // ONE combined 4 MiB bound across stdout+stderr, enforced BEFORE
  // accumulation so a flood can never buffer unboundedly.
  const take = (which, d) => {
    if (faulted) return;
    if (outBytes + errBytes + d.length > MAX_OUT) {
      faulted = true;
      doneReject(lsofError("output overflow"));
      return;
    }
    if (which === 0) {
      outBytes += d.length;
      outParts.push(d);
    } else {
      errBytes += d.length;
      errParts.push(d);
    }
  };
  const onPipeError = (e) => {
    faulted = true;
    doneReject(e);
  };
  // Any real fd-3 error — before a write, during its issued operation
  // or after it — latches the failed gate, rejects an in-flight write
  // with the ORIGINAL error and fails `done`: a broken private gate
  // can never advance to transition or parse. The error is also the
  // ACTUAL outcome of ANY issued fd-3 operation, including a no-frame
  // close that carries no pendingWrite — only an issued operation's
  // own callback/error discharges its physical input.
  const onFd3Error = (e) => {
    if (fd3Failed === null) fd3Failed = e;
    doneReject(e);
    if (fd3Issued) fd3Done = true;
    if (pendingWrite !== null) {
      const w = pendingWrite;
      pendingWrite = null;
      w.reject(e);
    }
    checkPhysical();
  };
  // Every [emitter, event, handler] registration is named in this
  // list so actual settlement can release exactly what was attached.
  const attached = [];
  const on = (ee, ev, fn) => {
    if (ee === null || ee === undefined || typeof ee.on !== "function") {
      return;
    }
    ee.on(ev, fn);
    attached.push([ee, ev, fn]);
  };
  // The named listeners, captured output and the isolated dispose
  // callback are released together ONLY after BOTH actual settlement
  // and the caller's own flow have completed — never on the physical
  // receipt alone while the flow still parses under the same budget —
  // so unproven debt keeps all evidence attached to the child.
  let endFlow;
  const flowDone = new Promise((r) => (endFlow = r));
  const freeSettled = () => {
    for (const [ee, ev, fn] of attached) {
      if (typeof ee.off === "function") ee.off(ev, fn);
    }
    outParts = [];
    errParts = [];
    if (typeof onPhysicalSettled === "function") onPhysicalSettled();
  };
  Promise.all([physical, flowDone]).then(freeSettled);
  // attach owns the RETURNED child immediately — before PID or any
  // registration/bootstrap validation — installing every named
  // stdout/stderr/fd3-error/exit/close listener so a failed-spawn or
  // pid-less child keeps truthful settlement and no early event can
  // be missed. It never invents a PID, exit or close.
  const attach = (c) => {
    if (child !== null || gateClosed || physicalSettled)
      throw lsofError("child attached");
    if (c === null || c === undefined) throw lsofError("attach child");
    child = c;
    on(child.stdout, "data", (d) => take(0, d));
    on(child.stderr, "data", (d) => take(1, d));
    on(child.stdout, "close", () => {
      outClosed = true;
      settled();
    });
    on(child.stderr, "close", () => {
      errClosed = true;
      settled();
    });
    on(child.stdout, "error", onPipeError);
    on(child.stderr, "error", onPipeError);
    const fd3 =
      child.stdio === null || child.stdio === undefined
        ? null
        : child.stdio[3];
    on(fd3, "error", onFd3Error);
    on(child, "error", doneReject);
    on(child, "exit", (code) => {
      exited = true;
      exitCode = code;
      settled();
    });
  };
  // neverSpawned is valid only BEFORE attach: it truthfully settles
  // ONLY the never-spawned physical receipt and ends the flow, while
  // `done` carries the original error for any late consumer — no fake
  // PID, exit or close is fabricated for a missing child.
  const neverSpawned = (error) => {
    if (child !== null) throw lsofError("neverSpawned child");
    gateClosed = true; // no late attach/write follows the final closure
    physicalSettled = true;
    settlePhysical();
    endFlow();
    doneReject(error);
  };
  // writeGate issues the ONE authorized frame through fd-3: the real
  // callback outcome is armed BEFORE the end invocation, the armed
  // fd-3 error listener settles the physical input, and the issued
  // write participates in physical settlement even after a public
  // rejection. No replay, backpressure duplicate or second untracked
  // end — exactly one issue is ever permitted.
  const writeGate = (frame) => {
    if (child === null) return Promise.reject(lsofError("fd3 child"));
    if (gateClosed) return Promise.reject(lsofError("fd3 write"));
    if (fd3Failed !== null) return Promise.reject(fd3Failed);
    const fd3 =
      child.stdio === null || child.stdio === undefined
        ? null
        : child.stdio[3];
    if (fd3 === null || fd3 === undefined || typeof fd3.end !== "function") {
      return Promise.reject(lsofError("fd3"));
    }
    if (fd3Issued) return Promise.reject(lsofError("fd3 write"));
    fd3Issued = true;
    closeIssuance();
    return new Promise((resolve, reject) => {
      const inFlight = { resolve, reject };
      pendingWrite = inFlight;
      try {
        fd3.end(frame, (err) => {
          fd3Done = true;
          checkPhysical();
          if (pendingWrite === inFlight) pendingWrite = null;
          if (err) {
            if (fd3Failed === null) fd3Failed = err;
            doneReject(err);
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (e) {
        // A synchronous end failure is itself the landed outcome.
        fd3Done = true;
        checkPhysical();
        if (pendingWrite === inFlight) pendingWrite = null;
        if (fd3Failed === null) fd3Failed = e;
        doneReject(e);
        reject(e);
      }
    });
  };
  // closeGate is the bounded best-effort private gate end used to
  // unblock a never-authorized wrapper: even a no-frame close arms
  // the real callback outcome BEFORE the end invocation and the
  // issued end participates in physical settlement. A repeated call —
  // or any call after an authorized write — issues no second
  // untracked end. When no end is issuable the call still closes the
  // first-issuance decision so physical facts may settle.
  const closeGate = () => {
    if (gateClosed) return;
    if (
      child !== null &&
      !fd3Issued &&
      fd3Failed === null
    ) {
      const fd3 =
        child.stdio === null || child.stdio === undefined
          ? null
          : child.stdio[3];
      if (fd3 !== null && fd3 !== undefined && typeof fd3.end === "function") {
        fd3Issued = true;
        try {
          fd3.end((err) => {
            fd3Done = true;
            checkPhysical();
            if (err) {
              if (fd3Failed === null) fd3Failed = err;
              doneReject(err);
            }
          });
        } catch (e) {
          // A synchronous end failure is itself the landed outcome.
          fd3Done = true;
          if (fd3Failed === null) fd3Failed = e;
          doneReject(e);
        }
      }
    }
    closeIssuance();
  };
  // snapshot returns a fresh copied view of the primitive actual
  // facts only — never a proof or status claim.
  const snapshot = () => ({
    exited,
    exitCode,
    outClosed,
    errClosed,
    fd3Done: !fd3Issued || fd3Done,
  });
  // output hands the bounded concatenated captures to the consumer;
  // the retained chunks and listeners are not released until the
  // physical+flow terminal boundary, after parsing finished.
  const output = () => ({
    stdout: Buffer.concat(outParts),
    stderr: Buffer.concat(errParts),
  });
  // finishFlow marks the caller's parse/control flow complete in the
  // gate finally; combined with physical fulfillment it performs the
  // listener/buffer release and the isolated dispose callback.
  const finishFlow = () => {
    closeIssuance();
    endFlow();
  };
  return Object.freeze({
    physical,
    done,
    attach,
    neverSpawned,
    writeGate,
    closeGate,
    snapshot,
    output,
    finishFlow,
  });
}
