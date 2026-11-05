// watchdog-driver-test-fixtures.mjs (TEST-ONLY): the driver-assembly
// leaf of the watchdog fixture DAG, created under corrective 69. It
// owns the WHOLE forkDriverFixture implementation — the faithful
// fork-shaped child validated by the REAL createProtocolValidator
// boundary inside the driver channel — the createObservedDriver
// factory and the declared drivers map binding that child to a REAL
// createDriverChannel over the REAL protocol, minting each channel's
// OWN genuine driver actual scope BEFORE the constructor under the
// SAME trusted retainActual registrar, plus the WHOLE shared
// watchdogTestClock hub. The whole factories moved out of
// watchdog-child-test-fixtures.mjs and the whole clock out of
// watchdog-drain-test-fixtures.mjs so those owners stay readable —
// each imports and re-exports the IDENTICAL function objects, so the
// accepted rosters and every existing import path are preserved.
// Imported only by test-fixture and test owners; never imported by
// production modules. No real fork/spawn/kill, Native, browser, model
// or network work, no proof authority, and no inherited runtime flags.
import { EventEmitter } from "node:events";

import { copyDeep } from "./protocol-values.mjs";
import { createDriverChannel } from "./watchdog-driver.mjs";
import { createDriverActualScope } from "./watchdog-driver-actual.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";

// A faithful fork-shaped driver child: forkImpl receives the same
// (entry, args, {execPath, execArgv, cwd, stdio, detached}) arguments the
// channel issues and retains them in calls; outbound envelopes land in
// written; emit(msg) delivers exactly one closed d2s envelope
// {ipcVersion:1, runId, seq, ...msg} through the real validator boundary
// inside createDriverChannel. exit, stdout close, stderr close,
// disconnect and send-callback settlement are SEPARATELY controllable so
// exit alone never satisfies settlement. A send(false) result marks one
// submitted message that is never replayed. No real process is created.
export function forkDriverFixture({
  runId,
  phase,
  commonIdentitySha256,
  pid = 6000,
  script = {},
}) {
  const calls = [];
  const written = [];
  const pendingSend = [];
  // Once releaseSendCallbacks permanently unlatches the held queue, no
  // later send may park in pendingSend — a late held callback settles
  // through the same ordinary microtask instead of hanging forever.
  let sendReleased = false;
  let d2sSeq = 0;
  const pipe = () => {
    const p = new EventEmitter();
    p.closed = false;
    p.destroyed = false;
    return p;
  };
  const child = new EventEmitter();
  child.pid = pid;
  child.connected = true;
  child.stdout = pipe();
  child.stderr = pipe();
  child.stdin = null;
  // Resolves only once the channel has actually attached its IPC message
  // listener — an emit before then would be lost, so tests await it. The
  // resolution is EVENT-DRIVEN through `newListener` (fired synchronously
  // before the channel's `on` completes, so the listener is attached by
  // the microtask): a run that never forks leaves only a dormant pending
  // promise and no scheduled poll work.
  const ready = new Promise((resolve) => {
    const onAdd = (ev) => {
      if (ev !== "message") return;
      child.off("newListener", onAdd);
      queueMicrotask(resolve);
    };
    child.on("newListener", onAdd);
  });
  // send always receives the channel's own send callback — it settles
  // through the ordinary microtask unless the script holds it.
  child.send = (msg, cb) => {
    written.push(msg);
    if (typeof cb === "function") {
      if (script.holdSend === true && !sendReleased) pendingSend.push(cb);
      else queueMicrotask(() => cb(null));
    }
    return script.sendResult === false ? false : true;
  };
  child.disconnect = () => {
    if (!child.connected) return;
    child.connected = false;
    child.emit("disconnect");
  };
  // A bare {type:"hello"} composes the bound exact tuple automatically;
  // explicit fields in msg still win so mismatch cases stay expressible.
  const emit = (msg) =>
    child.emit("message", {
      ipcVersion: 1,
      runId,
      seq: d2sSeq++,
      ...(msg.type === "hello"
        ? { pid, phase, commonIdentitySha256, ...msg }
        : msg),
    });
  const exit = (code = 0, signal = null) => child.emit("exit", code, signal);
  const closeOut = () => {
    child.stdout.closed = true;
    child.stdout.destroyed = true;
    child.stdout.emit("close");
  };
  const closeErr = () => {
    child.stderr.closed = true;
    child.stderr.destroyed = true;
    child.stderr.emit("close");
  };
  const respondSend = (error = null) => {
    const cb = pendingSend.shift();
    if (cb) cb(error);
  };
  // Permanently unlatches the held-send queue so teardown never abandons
  // real issued debt: EVERY still-queued actual callback is invoked — no
  // callback is silently dropped — even when an earlier delivery throws.
  // The exact FIRST arbitrary thrown value is retained behind the
  // explicit hasValue presence flag (a falsy thrown value still counts)
  // and rethrown only after ALL deliveries have been attempted, so one
  // throwing callback cannot mask a sibling's delivery. Actual callback
  // delivery is never physical close or debt proof; respondSend stays
  // the one-callback test control with its shift-and-invoke semantics.
  const releaseSendCallbacks = (error = null) => {
    sendReleased = true;
    let firstValue;
    let hasValue = false;
    while (pendingSend.length > 0) {
      const cb = pendingSend.shift();
      try {
        cb(error);
      } catch (thrown) {
        if (!hasValue) {
          firstValue = thrown;
          hasValue = true;
        }
      }
    }
    if (hasValue) throw firstValue;
  };
  const forkImpl = (entry, args, opts) => {
    calls.push({ entry, args: args.slice(), ...copyDeep(opts) });
    return child;
  };
  return {
    forkImpl,
    child,
    calls,
    emit,
    exit,
    closeOut,
    closeErr,
    disconnect: () => child.disconnect(),
    respondSend,
    releaseSendCallbacks,
    ready,
    written,
  };
}

// A REAL createDriverChannel bound to the in-memory fork child above:
// the genuine protocol validator, real envelope bytes and real retained
// close observations drive settlement — a destroy request or a missing
// expected pipe never satisfies reap. Absolute in-memory paths satisfy
// the frozen dir/cwd/execArgv/stdio binding; no real process exists.
// errors retains every actual onError value the channel delivers.
// retainActual and the channel's OWN genuine driver actual scope are
// REQUIRED trusted references forwarded UNCHANGED to the real
// constructor — the caller mints and owns the scope, so this factory
// never invents a hidden default owner or a second registrar — and the
// SAME scope reference is returned additively beside the original
// {driver, channel, errors} roster so a caller can truthfully join the
// genuine registered debt its channel created.
export function createObservedDriver({
  clock,
  runId,
  pid,
  phase = "check",
  commonIdentitySha256,
  retainActual,
  actualScope,
}) {
  const driver = forkDriverFixture({
    runId,
    phase,
    commonIdentitySha256,
    pid,
  });
  const errors = [];
  const channel = createDriverChannel({
    entry: "/drv/driver.js",
    args: [],
    cwd: "/drv",
    execPath: "/drv/node",
    protocol: createProtocolValidator({ runId }),
    runId,
    clock,
    forkImpl: driver.forkImpl,
    onMessage: () => {},
    onError: (error) => errors.push(error),
    retainActual,
    actualScope,
  });
  return { driver, channel, errors, actualScope };
}

// The declared drivers map: each named in-scope driver row binds a REAL
// observed driver channel — a genuine createDriverChannel over the
// fork-shaped child — so the required driver-handle settlement reaps
// through actual retained exit + BOTH pipe closes. A driver whose real
// facts are withheld keeps its debt pending; a noop settlement can
// never stand in for physical close proof. The REQUIRED third context
// supplies the trusted retainActual registrar and an optional genuine
// parent scope: every entry mints its OWN genuine driver actual scope
// BEFORE its channel constructor — a nested parent runId may differ
// under the SAME registrar — so each row's raw exit/pipe debt registers
// against the same owner and a cleanup can join the genuine scopes it
// created rather than a fictional global latch.
export const drivers = (clk, specs = {}, { retainActual, parentScope = null } = {}) =>
  new Map(
    Object.entries(specs).map(([name, spec]) => {
      const actualScope = createDriverActualScope({
        retainActual,
        runId: "R1",
        parentScope,
      });
      return [
        name,
        createObservedDriver({
          clock: clk,
          runId: "R1",
          pid: spec.pid,
          commonIdentitySha256: "0".repeat(64),
          retainActual,
          actualScope,
        }),
      ];
    }),
  );

// The ONE shared fake clock/timer hub the injected watchdog clock and the
// test observe through the same monotonic value. nowMonoMs is the exact
// Number the watchdog reads; nowUtc is fixed; advance fires due timers,
// runDue drains only already-due callbacks and jumpWithoutTimers moves
// the monotonic clock without firing anything. No Date.now, no
// performance.now, no real interval and no production-clock mutation.
export function watchdogTestClock() {
  const c = fakeClock();
  return {
    setTimeout: c.setTimeout,
    clearTimeout: c.clearTimeout,
    setInterval: c.setInterval,
    clearInterval: c.clearInterval,
    nowMonoMs: c.nowMs,
    nowUtc: () => "2026-11-02T00:00:00.000Z",
    advance: c.advance,
    runDue: c.runDue,
    jumpWithoutTimers: c.jumpWithoutTimers,
    pendingTimeouts: c.pendingTimeouts,
    liveIntervals: c.liveIntervals,
  };
}
