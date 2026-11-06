// watchdog-driver.mjs owns the actual driver fork IPC channel: the frozen
// child_process.fork of an absolute module under its frozen dirname cwd with
// explicit execPath, execArgv:[], stdio ["ignore","pipe","pipe","ipc"] and
// detached:true, a referenced child, validated d2s/s2d envelopes through the
// run-bound protocol, a bounded pending-send set, once-submitted sends (a
// send(false) envelope is never requeued), bounded settlement, error/disconnect
// /exit routing and a bounded one-shot reap. No direct kill, no eligibility or
// cleanup-proof authority.
//
// Every fork and every admitted send is bound to a private branded actual
// scope: neutral raw-issuance, physical-child and send-callback receipts are
// deferred, registered with the SAME retainActual registrar and strongly
// indexed by the scope BEFORE any actual IO. Only a genuine exit plus BOTH
// real pipe close events retire physical debt — closed/destroyed/missing
// pipes, error, disconnect or a rejected public reap never prove it — and
// only the real send callback or a definite trusted no-issue settles a send
// receipt; unknown, rejected or pending actual debt stays held.
// finishDriverActualScope permanently fences ctor/send admission and nested
// enrollment across the ENTIRE enrolled subtree synchronously, then
// passively joins exactly those registered receipts, one cached promise.
import path from "node:path";
import { fork } from "node:child_process";
import {
  beginDriverActualAttempt,
  driverError as fail,
  observeDriverPhysicalChild,
} from "./watchdog-driver-actual.mjs";

// IDENTICAL re-exports only: the leaf owns the whole branded scope
// tree, its subtree finish/join, the shared neutral receipt
// prearming and the persistent physical exit/pipe-close observation;
// the channel/fork/send mechanics stay here.
export {
  createDriverActualScope,
  finishDriverActualScope,
} from "./watchdog-driver-actual.mjs";

const isAbs = (s) => typeof s === "string" && path.isAbsolute(s);
const MAX_PENDING_SENDS = 256;
const DEFAULT_SETTLE_MS = 30000;

export function createDriverChannel({
  entry,
  args,
  cwd,
  execPath,
  protocol,
  runId,
  clock,
  forkImpl = fork,
  onMessage,
  onError = () => {},
  onExit = () => {},
  retainActual,
  actualScope,
}) {
  if (!isAbs(entry)) throw fail("IPC_INVALID", "entry absolute");
  if (!isAbs(cwd) || cwd !== path.dirname(entry)) throw fail("IPC_INVALID", "cwd frozen dir");
  if (execPath !== undefined && !isAbs(execPath)) throw fail("IPC_INVALID", "execPath absolute");
  if (!Array.isArray(args) || !args.every((a) => typeof a === "string"))
    throw fail("IPC_INVALID", "args strings");
  // The frozen fork argument list is sliced BEFORE the effectful begin —
  // no fallible callout between admission and the actual fork escapes
  // unowned, and the same frozen list reaches forkImpl below.
  const forkArgs = args.slice();
  // The whole original admission — registrar/scope/runId/open/one
  // attempt — runs inside the leaf AFTER the argument guards above; it
  // pre-arms and indexes BOTH neutral native-promise receipts before the
  // first registrar callout and returns the PRIVATE capabilities by
  // reference. No fork happens inside begin.
  const { isOpen, rawFork, physicalChild, armSend } =
    beginDriverActualAttempt({ retainActual, runId, actualScope });
  const timers = new Set();
  const pendingSends = new Set();
  let seqOut = 0;
  let exited = false;
  let exitCode = null;
  let signalCode = null;
  let connected = false;
  let failed = false;
  let closedByUs = false;
  let closedReceived = false;
  let reaped = null;
  let reaping = null;

  const later = (fn, ms) => {
    const t = clock.setTimeout(fn, Math.max(0, ms));
    timers.add(t);
    return t;
  };
  const clearT = (t) => {
    timers.delete(t);
    clock.clearTimeout(t);
  };

  const poison = (error) => {
    failed = true;
    // Definite failure origin: the explicit fault flag rejects every
    // pending send with the exact caught value — even a thrown
    // null/undefined faults, never a falsy success.
    for (const s of pendingSends) s(error, true);
  };

  // Expected-pipe close facts are retained for the channel's WHOLE
  // lifetime, observed from immediately after fork: only a genuine
  // `closed === true` or a real `close` event counts — `destroyed` alone
  // is a destroy request, never physical close proof — and a missing
  // expected pipe stays invalid/unproven rather than positive absence.
  let outClosed = false;
  let errClosed = false;
  let settleNote = null;
  const noteSettle = () => {
    if (settleNote !== null) settleNote();
  };
  // A reentrant finish inside the begin callouts may already have fenced
  // the scope: a definite pre-issue NOFORK retires both armed
  // reservations truthfully — no fork is invoked and no IO occurs.
  if (!isOpen()) {
    rawFork.settle();
    physicalChild.settle();
    throw fail("IPC_INVALID", "scope fenced");
  }
  let child;
  try {
    child = forkImpl(entry, forkArgs, {
      execPath,
      execArgv: [],
      cwd,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      detached: true,
    });
  } catch (error) {
    // The observed synchronous throw ALWAYS settles the raw issuance
    // receipt and preserves the original error. Only the trusted default
    // Node fork identity may also retire the physical reservation on its
    // accepted no-child branch — an injected hidden-spawn-then-throw
    // keeps the physical debt held and joinable.
    rawFork.settle();
    if (forkImpl === fork) physicalChild.settle();
    throw error;
  }
  // The observed issuance return settles the raw receipt even when a
  // later adoption or semantic read throws.
  rawFork.settle();
  // Adopt the actual returned handle into the strong pending index BEFORE
  // any method/getter/pid/semantic read or user callback — a null,
  // undefined or unadoptable return is UNKNOWN physical, never absence
  // proof, and the held scope survives the invalid-handle throw below.
  physicalChild.adopt(child);
  if (child == null) {
    throw fail("IPC_INVALID", "fork issued no child");
  }
  // The persistent actual exit + BOTH real pipe close observers attach
  // immediately after adoption, before connected/pid/semantic reads. The
  // leaf owns the physical facts and settles the SAME physicalChild
  // receipt FIRST; only then does this callback record the public
  // retained flag and wake the reap awaiter.
  const { stdout: childOut, stderr: childErr } =
    observeDriverPhysicalChild({
      child,
      physicalChild,
      onPipeClose: (which) => {
        if (which === "stdout") outClosed = true;
        else errClosed = true;
        noteSettle();
      },
    });
  connected = child.connected === true;

  child.on("message", (msg) => {
    if (failed || exited) return;
    try {
      const bytes = Buffer.byteLength(JSON.stringify(msg), "utf8");
      protocol.accept("driver", "d2s", msg, bytes);
    } catch (error) {
      poison(error);
      onError(error);
      return;
    }
    try {
      onMessage(msg);
      if (msg.type === "closed") closedReceived = true;
    } catch (error) {
      poison(error);
      onError(error);
    }
  });
  child.on("error", (error) => {
    failed = true;
    for (const s of pendingSends) s(error, true);
    onError(error);
  });
  child.on("exit", (code, signal) => {
    exited = true;
    exitCode = code;
    signalCode = signal;
    for (const s of pendingSends)
      s(fail("DRIVER_EXIT", `exit ${code}/${signal}`));
    // noteSettle is retained even when onExit throws — the original
    // fault channel is preserved, never an uncaught skip.
    try {
      onExit({ exitCode: code, signalCode: signal });
    } finally {
      noteSettle();
    }
  });
  child.on("disconnect", () => {
    connected = false;
    // Our close initiation or a validated/dispatched closed notice permits
    // disconnect only; actual exit, pipes and callback debt remain owed.
    if (!exited && !failed && !closedByUs && !closedReceived) {
      const e = fail("IPC_DISCONNECT", "driver channel");
      poison(e);
      onError(e);
    }
  });
  if (childErr) {
    childErr.on("data", () => {});
    childErr.on("error", () => {});
  }
  if (childOut) {
    childOut.on("data", () => {});
    childOut.on("error", () => {});
  }
  // `closed === true` stays a PUBLIC retained-facts shortcut only — the
  // physical receipt accepts real close EVENTS exclusively.
  if (childOut && childOut.closed === true) outClosed = true;
  if (childErr && childErr.closed === true) errClosed = true;

  const send = (type, fields = {}, settleMs = DEFAULT_SETTLE_MS) =>
    new Promise((resolve, reject) => {
      if (failed || exited || !connected) {
        reject(fail("IPC_INVALID", "channel not connected"));
        return;
      }
      // Scope fence is a pure admission guard before any effect.
      if (!isOpen()) {
        reject(fail("IPC_INVALID", "scope fenced"));
        return;
      }
      if (pendingSends.size >= MAX_PENDING_SENDS) {
        reject(fail("IPC_OVERFLOW", "pending sends"));
        return;
      }
      // The leaf arms the raw send-callback/no-issue receipt with the
      // SAME registrar BEFORE serialization, spread getters,
      // protocol.accept, clock setup or any possible reentry — and
      // before child.send. An arm throw is a definite no-issue: the
      // reservation already settled and the original fault propagates.
      const issued = armSend();
      let msg;
      let bytes;
      try {
        msg = { ipcVersion: 1, runId, seq: seqOut, type, ...fields };
        bytes = Buffer.byteLength(JSON.stringify(msg), "utf8");
      } catch (error) {
        // Fallible preparation before any send: definite no-issue.
        issued.settle();
        reject(error);
        return;
      }
      try {
        protocol.accept("driver", "s2d", msg, bytes);
      } catch (error) {
        issued.settle();
        poison(error);
        reject(error);
        return;
      }
      seqOut += 1;
      let done = false;
      // Explicit fault presence — never truthiness — so an arbitrary
      // falsy thrown value is still a fault, while only null/undefined
      // is the success signal. Definite failure origins — poison, the
      // child error event, a caught send throw — pass `true` explicitly
      // so even a thrown null/undefined rejects with itself.
      const settle = (
        error,
        faulted = error !== null && error !== undefined,
      ) => {
        if (done) return;
        done = true;
        pendingSends.delete(settle);
        clearT(timer);
        if (faulted) reject(error);
        else resolve();
      };
      let timer;
      try {
        timer = later(
          () => settle(fail("ACCOUNTING_UNAVAILABLE", `${type} settle`)),
          settleMs,
        );
      } catch (error) {
        issued.settle();
        reject(error);
        return;
      }
      pendingSends.add(settle);
      if (!isOpen()) {
        // A reentrant finish fenced the scope during fallible
        // preparation: no late actual IO crosses — definite no-issue
        // retires the pre-armed receipt; the bounded caller still settles.
        issued.settle();
        settle(fail("IPC_INVALID", "scope fenced"));
        return;
      }
      try {
        // send(false) already submitted the envelope: never requeue or replay.
        child.send(msg, (error) => {
          // The genuine callback retires the raw receipt FIRST. A late
          // callback error after the public wait already settled is
          // independently retained through the existing onError lane —
          // the first public result/error is never replaced, and
          // nothing is dropped behind settle's done return.
          issued.settle();
          const faulted = error !== null && error !== undefined;
          if (done) {
            if (faulted) onError(error);
            return;
          }
          settle(error, faulted);
        });
      } catch (error) {
        // Ambiguous issued throw: the callback may still arrive — the raw
        // receipt stays owed; only the bounded caller settles now, a
        // definite fault with the exact thrown value.
        settle(error, true);
      }
    });

  const close = () => {
    closedByUs = true;
    try {
      // Disconnect is initiation only while the scope is unfenced; after a
      // fence, close() is pure observation/idempotence — never fresh IO.
      if (isOpen() && child.connected) child.disconnect();
    } catch {}
    connected = false;
  };

  const reap = (remainingMs = DEFAULT_SETTLE_MS) => {
    if (reaped) return Promise.resolve(reaped);
    if (reaping) return reaping;
    // Settlement requires the real exit AND BOTH real pipe closes — an
    // exited child with open pipes is not yet settled, and a close
    // observed before this first reap already counts through the
    // retained flags. Expiry leaves true state rather than faking it.
    reaping = new Promise((resolve, reject) => {
      const trySettle = () => {
        if (reaped !== null) return;
        if (!exited) return;
        if (!outClosed || !errClosed) return;
        reaped = { exitCode, signalCode };
        clearT(timer);
        resolve(reaped);
      };
      settleNote = trySettle;
      const timer = later(() => {
        reject(fail("CLEANUP_UNPROVEN", "driver reap deadline"));
      }, remainingMs);
      if (connected) close();
      trySettle();
    }).finally(() => {
      settleNote = null;
      for (const s of pendingSends) s(fail("DRIVER_EXIT", "reaped"));
    });
    return reaping;
  };

  return Object.freeze({
    send,
    close,
    reap,
    get pid() {
      return child.pid;
    },
    get exited() {
      return exited;
    },
    get exitCode() {
      return exitCode;
    },
    get connected() {
      return connected;
    },
    get failed() {
      return failed;
    },
    get closedByUs() {
      return closedByUs;
    },
  });
}
