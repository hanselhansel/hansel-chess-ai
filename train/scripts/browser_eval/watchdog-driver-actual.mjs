// watchdog-driver-actual.mjs is the PRIVATE actual-effect owner leaf for the
// browser-eval watchdog driver. It owns the whole opaque branded scope tree
// and its subtree finish/join, the module STRONG pending-resource index, the
// one-shot constructor admission, the shared neutral receipt prearming —
// rawFork issuance, physicalChild adoption and per-send armSend receipts —
// and the persistent physical observation of the adopted child: the genuine
// exit plus BOTH real pipe close events alone retire the physicalChild
// receipt.
// Five exports, no more: createDriverActualScope, finishDriverActualScope,
// beginDriverActualAttempt, observeDriverPhysicalChild, driverError.
//
// JS intrinsics only — no imports, no Node IO issuance, no clocks or
// timers, no protocol/fork/send/disconnect mechanics, no queue, writer,
// status or proof authority. It produces frozen capabilities and guarded
// physical observations only: never a running scope authority, never a
// second owner of the driver's channel state.
// DAG: watchdog-driver.mjs -> watchdog-driver-actual.mjs. No back-edge.

// Error factory: returns the Error. Guard sites throw explicitly; timer,
// pending-send and exit callbacks reject/settle without throwing first.
const fail = (code, detail) => {
  const e = new Error(`watchdog-driver ${code}: ${detail}`);
  e.code = code;
  return e;
};

// Named export alias: the driver imports this as its own local fail.
export { fail as driverError };

// Private brand: the frozen scope object stays opaque — all mutable scope
// state lives in this WeakMap, so brand checks never read scope props.
const driverScopeBrand = new WeakMap();

// Module STRONG pending-resource index: pins every armed receipt entry and
// every adopted physical handle independently of scope-WeakMap, channel or
// error reachability, so unknown actual debt can never be garbage-collected
// out of a join. Scope receipt sets index the SAME entry objects for
// subtree joins — an index, never a counter, ledger or queue. Entries
// retire only on truthful settle; unknown or pending actual debt stays
// pinned, and an adopted handle stays reachable until genuine physical
// close settles it.
const pendingActual = new Set();

// Pure scope factory: validates the trusted registrar function, a nonempty
// runId and a genuinely branded parent BEFORE any parent property — exact
// same registrar, every ancestor open — then synchronously enrolls the
// child. No IO, timers, clocks, receipts or queues are created here.
// Parent and nested runIds MAY DIFFER: only the scope's OWN runId gates its
// single constructor admission.
export function createDriverActualScope({
  retainActual,
  runId,
  parentScope = null,
}) {
  if (typeof retainActual !== "function")
    throw fail("IPC_INVALID", "retainActual function");
  if (typeof runId !== "string" || runId === "")
    throw fail("IPC_INVALID", "runId nonempty");
  let parent = null;
  if (parentScope !== null) {
    parent = driverScopeBrand.get(parentScope);
    if (parent === undefined) throw fail("IPC_INVALID", "parent scope brand");
    if (parent.retainActual !== retainActual)
      throw fail("IPC_INVALID", "scope registrar");
    for (let s = parent; s !== null; s = s.parent)
      if (!s.open) throw fail("IPC_INVALID", "ancestor fenced");
  }
  const state = {
    retainActual,
    runId,
    parent,
    children: new Set(),
    receipts: new Set(),
    open: true,
    ctorUsed: false,
    join: null,
  };
  const scope = Object.freeze({});
  driverScopeBrand.set(scope, state);
  if (parent !== null) parent.children.add(state);
  return scope;
}

// Permanently fences ctor/send admission and nested enrollment across the
// ENTIRE enrolled subtree synchronously — before the first await or receipt
// snapshot — then passively joins exactly the SAME registered receipts.
// Repeated calls return the SAME cached join promise; unknown, rejected or
// pending actual debt stays held, never proven by timeout or public result.
export function finishDriverActualScope(scope) {
  const state = driverScopeBrand.get(scope);
  if (state === undefined) throw fail("IPC_INVALID", "actual scope brand");
  if (state.join !== null) return state.join;
  const subtree = [];
  const stack = [state];
  while (stack.length > 0) {
    const s = stack.pop();
    s.open = false;
    subtree.push(s);
    for (const nested of s.children) stack.push(nested);
  }
  const debt = [];
  for (const s of subtree) for (const r of s.receipts) debt.push(r.promise);
  state.join = Promise.all(debt).then(() => {});
  return state.join;
}

// A neutral actual receipt is a deferred whose executor only captures
// resolve: settle FULFILLS only — never rejects — so retirement is always a
// truthful actual fact owned by the caller, never a rejection-based fake
// completion. Each entry is indexed in the SAME scope receipt set AND the
// module STRONG pending index BEFORE the FIRST registrar callout, so a
// reentrant finish inside retainActual already sees the debt and no actual
// IO escapes a zero snapshot. `handle` keeps an adopted physical child
// strongly reachable until genuine physical close; settle is idempotent and
// retires entry and handle from every index, so fulfilled send and
// issuance receipts never accumulate for the whole phase.
const armActualReceipt = (scopeState) => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  const entry = {
    promise,
    handle: null,
    settled: false,
    settle: () => {
      if (entry.settled) return;
      entry.settled = true;
      scopeState.receipts.delete(entry);
      if (entry.handle !== null) {
        pendingActual.delete(entry.handle);
        entry.handle = null;
      }
      pendingActual.delete(entry);
      resolve();
    },
  };
  scopeState.receipts.add(entry);
  pendingActual.add(entry);
  return entry;
};

// EFFECTFUL one-shot prearming — NOT a pure scope constructor: runs the
// whole original constructor admission guards in their SAME priority after
// the caller's own argument guards, consumes the scope's single ctor
// attempt, then creates and indexes BOTH neutral receipts BEFORE the FIRST
// external retainActual callout, so a reentrant finish sees both debts and
// no zero-snapshot escape exists. Each SAME native .promise registers
// exactly once — never the entry object. The registrar may reenter finish
// or throw arbitrary values: on any pre-issue failure or fence both known
// NOFORK reservations settle truthfully and the original throw is
// preserved — no later actual fork is admitted on this consumed attempt.
// No actual fork happens here; the returned capabilities are PRIVATE
// driver-owned actual-effect refs, never public proof, status, cancel or
// FD-deletion API.
export function beginDriverActualAttempt({
  retainActual,
  runId,
  actualScope,
}) {
  if (typeof retainActual !== "function")
    throw fail("IPC_INVALID", "retainActual function");
  const scopeState = driverScopeBrand.get(actualScope);
  if (scopeState === undefined) throw fail("IPC_INVALID", "actual scope brand");
  if (scopeState.retainActual !== retainActual)
    throw fail("IPC_INVALID", "scope registrar");
  if (scopeState.runId !== runId) throw fail("IPC_INVALID", "scope runId");
  if (!scopeState.open) throw fail("IPC_INVALID", "scope fenced");
  if (scopeState.ctorUsed) throw fail("IPC_INVALID", "scope ctor used");
  // One scope admits exactly ONE constructor attempt — never a replacement
  // after an unknown acquisition.
  scopeState.ctorUsed = true;
  const rawFork = armActualReceipt(scopeState);
  const physicalChild = armActualReceipt(scopeState);
  try {
    scopeState.retainActual(rawFork.promise);
    if (!scopeState.open) throw fail("IPC_INVALID", "scope fenced");
    scopeState.retainActual(physicalChild.promise);
    if (!scopeState.open) throw fail("IPC_INVALID", "scope fenced");
  } catch (e) {
    rawFork.settle();
    physicalChild.settle();
    throw e;
  }
  // adopt pins the actual returned child handle in the STRONG index BEFORE
  // the caller performs semantic reads or getters on it — allowed even when
  // the scope fenced reentrantly during the fork, because an already-owned
  // physical observation must continue. It never validates the handle into
  // a child, never substitutes a lookalike, never settles and never
  // replaces: a null, primitive or repeat adoption leaves the physical
  // debt owed.
  const adopt = (value) => {
    if (physicalChild.settled || physicalChild.handle !== null) return;
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    )
      return;
    physicalChild.handle = value;
    pendingActual.add(value);
  };
  // armSend opens one neutral send-callback receipt per call: the scope-open
  // check runs first — a fenced scope fails before ANY effect — then the
  // entry indexes BEFORE the registrar callout and BEFORE callback,
  // protocol, timer, serialization or the actual child.send. The SAME
  // native promise registers once; a registration throw or a reentrant
  // fence before actual issuance retires the definite NO-SEND reservation
  // and rethrows the original error or scope fault. Retainers fail before
  // target IO, so this truthful pre-issue cleanup never proves unissued
  // process IO. No IO or new message is performed here.
  const armSend = () => {
    if (!scopeState.open) throw fail("IPC_INVALID", "scope fenced");
    const send = armActualReceipt(scopeState);
    try {
      scopeState.retainActual(send.promise);
      if (!scopeState.open) throw fail("IPC_INVALID", "scope fenced");
    } catch (e) {
      send.settle();
      throw e;
    }
    return Object.freeze({ promise: send.promise, settle: send.settle });
  };
  return Object.freeze({
    isOpen: () => scopeState.open,
    rawFork: Object.freeze({
      promise: rawFork.promise,
      settle: rawFork.settle,
    }),
    physicalChild: Object.freeze({
      promise: physicalChild.promise,
      settle: physicalChild.settle,
      adopt,
    }),
    armSend,
  });
}

// observeDriverPhysicalChild is the persistent physical observer for one
// adopted child: it attaches the genuine `exit` listener and BOTH real
// pipe `close` EVENT listeners IMMEDIATELY after adoption — before the
// driver reads connected/pid/semantic properties — then returns the
// guarded pipe refs for the driver's public drains. Actual physical
// debt is stricter than the public retained flags: only the genuine
// `exit` event plus BOTH real pipe `close` EVENTS retire the physical
// receipt — never a `.closed`/`.destroyed` shortcut, a missing pipe, a
// throwing getter, error, disconnect or a rejected public reap. Each
// pipe close settles the SAME physicalChild receipt FIRST and only then
// calls onPipeClose("stdout"|"stderr"), so a public exception can never
// lose an actual observation. No new IO issuer or control, clock,
// queue, ledger or proof authority is introduced here.
export function observeDriverPhysicalChild({
  child,
  physicalChild,
  onPipeClose,
}) {
  let actualExited = false;
  let actualOutClosed = false;
  let actualErrClosed = false;
  // Actual physical debt settles ONLY here — the genuine exit plus BOTH
  // real pipe close events — and it settles BEFORE any fallible public
  // notification/timer path can run.
  const notePhysical = () => {
    if (actualExited && actualOutClosed && actualErrClosed)
      physicalChild.settle();
  };
  child.on("exit", () => {
    actualExited = true;
    notePhysical();
  });
  let stdout = null;
  let stderr = null;
  try {
    stdout = child.stdout;
  } catch {}
  try {
    stderr = child.stderr;
  } catch {}
  if (stdout) {
    stdout.on("close", () => {
      // Actual facts and the physical receipt settle FIRST — before the
      // fallible public flag callback — so a public exception can never
      // lose an actual observation.
      actualOutClosed = true;
      notePhysical();
      onPipeClose("stdout");
    });
  }
  if (stderr) {
    stderr.on("close", () => {
      actualErrClosed = true;
      notePhysical();
      onPipeClose("stderr");
    });
  }
  return Object.freeze({ stdout, stderr });
}
