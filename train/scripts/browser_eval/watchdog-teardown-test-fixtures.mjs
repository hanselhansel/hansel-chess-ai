import { privateFs as phaseFs } from "./private-fs.mjs";
// watchdog-teardown-test-fixtures.mjs (TEST-ONLY, teardown leaf):
// the single per-test teardown owner shared by the evidence-boundary
// fixture factories and gates. registerFixtureTeardown/disposeFixture
// are PRIVATE helper-to-helper exports (never re-exported through the
// evidence helper): one module-private WeakMap per test owns the
// release -> settle -> afterSettle -> restore -> remove order under
// ONE t.after — every factory and gate registers before its effects,
// registration fences permanently once disposal begins, and the SAME
// cached actual promise is returned to every caller. ownFixtureAttempt
// is the PRIVATE helper-to-helper admission binding: a raw-body
// receipt is registered BEFORE the thunk's effects and the IDENTICAL
// direct result or original Promise is returned — a sync throw or
// rejected promise stays on the caller channel unchanged and is never
// read as physical close. observeSelectedReceiptMetadata is the
// shared TEST-ONLY selected-metadata observer imported DIRECTLY by
// its two owning suites (never re-exported through the FS owner): it
// preregisters its restore on the SAME per-test owner BEFORE the
// instrumentation lands and counts the genuine admission only on the
// exact canonical completion target or its phase directory.
// observeFixturePromise and captureFixtureThrow are the two pure
// TEST-ONLY neutral-observation helpers imported DIRECTLY by their
// owning suites: a descriptive live settled/fulfilled/rejected/
// hasError/error/value observation (never physical proof or a new
// ledger — the caller still awaits the ORIGINAL promise/error) and
// an exact arbitrary-throw capture behind an explicit presence flag.
// No second operational ledger, native/process polling, runtime
// identity/status or queue authority.

import { promises as fsp } from "node:fs";
import path from "node:path";

const FAIL = (detail) => {
  const e = new Error(`watchdog-fs-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The ONE module-private per-test owner. Registration order is kept
// per kind; restore unwinds LIFO so stacked instrumentation returns
// cleanly. Exactly ONE t.after is installed per test.
const owners = new WeakMap();

const ownerFor = (t) => {
  let owner = owners.get(t);
  if (owner === undefined) {
    owner = {
      release: [],
      settle: [],
      afterSettle: [],
      restore: [],
      remove: [],
      closed: false,
      promise: null,
    };
    owners.set(t, owner);
    t.after(() => disposeFixture(t));
  }
  return owner;
};

// PRIVATE helper-to-helper export: registers owned teardown work
// BEFORE the effects it covers — controlled gate releases, the real
// fake-child exit/BOTH-close facts plus explicit original timer
// advances (release), actual bodies/callbacks/FS/channel/run
// settlement (settle), the OUTER closure observation that may run only
// once every actual body and physical fact is genuinely settled
// (afterSettle), instrumentation (restore) and owned roots
// (remove). Registration closes permanently once disposal begins;
// already-admitted bodies still fill preregistered slots/parent
// aggregates after the fence — never a fresh global registration.
export function registerFixtureTeardown(t, { release, settle, afterSettle, restore, remove } = {}) {
  const owner = ownerFor(t);
  if (owner.closed) throw FAIL("teardown registration closed");
  if (typeof release === "function") owner.release.push(release);
  if (typeof settle === "function") owner.settle.push(settle);
  if (typeof afterSettle === "function") owner.afterSettle.push(afterSettle);
  if (typeof restore === "function") owner.restore.push(restore);
  if (typeof remove === "function") owner.remove.push(remove);
}

// PRIVATE helper-to-helper export: idempotent — the SAME cached actual
// promise. The cached deferred promise and the closed
// registration/admission fence are installed synchronously BEFORE any
// callback executes — including a reentrant dispose from inside a
// callback. Disposal order is fixed: ALL release callbacks invoke first
// with nothing awaited between them — no release ever waits on a later
// release — then their actual returned bodies and every registered
// settle callback's body join together. Instrumentation restores LIFO
// and owned roots are removed ONLY once every required body/physical
// close actually settled; on an unknown or failed physical close BOTH
// instrumentation and roots are retained with the original errors — a
// timeout or rejection alone never counts as safe settlement and
// nothing is deleted in a finally. Expected injected caller errors stay
// on their asserted caller channel; settlement receipts are a separate
// fact.
export function disposeFixture(t) {
  const owner = owners.get(t);
  if (owner === undefined) return Promise.resolve();
  if (owner.promise !== null) return owner.promise;
  owner.closed = true;
  const d = deferred();
  owner.promise = d.promise;
  const errors = [];
  const finish = (async () => {
    const bodies = [];
    let settled = true;
    for (const fn of owner.release) {
      try {
        bodies.push(fn());
      } catch (e) {
        settled = false;
        errors.push(e);
      }
    }
    for (const fn of owner.settle) {
      try {
        bodies.push(fn());
      } catch (e) {
        settled = false;
        errors.push(e);
      }
    }
    for (const body of bodies) {
      try {
        await body;
      } catch (e) {
        settled = false;
        errors.push(e);
      }
    }
    if (!settled) {
      errors.push(FAIL("physical settlement unavailable; owned roots retained"));
      throw new AggregateError(errors, "watchdog-fs-fixture teardown");
    }
    // The OUTER afterSettle observations run only here — after every
    // actual release/settle body fulfilled and BEFORE any restore or
    // root removal. A rejected observation preserves BOTH the
    // instrumentation and the owned roots with the same original
    // error, never a skipped stage or a converted success.
    let observed = true;
    for (const fn of owner.afterSettle) {
      try {
        await fn();
      } catch (e) {
        observed = false;
        errors.push(e);
      }
    }
    if (!observed) {
      errors.push(FAIL("closure observation failed; owned roots retained"));
      throw new AggregateError(errors, "watchdog-fs-fixture teardown");
    }
    let restored = true;
    for (const fn of owner.restore.slice().reverse()) {
      try {
        await fn();
      } catch (e) {
        restored = false;
        errors.push(e);
      }
    }
    // A failed instrumentation restore retains BOTH the
    // instrumentation and the owned roots — removal never continues
    // past an unrestored gate, and no physical close error is caught
    // then deleted around.
    if (!restored) {
      errors.push(FAIL("instrumentation restore failed; owned roots retained"));
      throw new AggregateError(errors, "watchdog-fs-fixture teardown");
    }
    for (const fn of owner.remove) {
      try {
        await fn();
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "watchdog-fs-fixture teardown");
    }
  })();
  finish.then(
    () => d.resolve(),
    (e) => d.reject(e),
  );
  return owner.promise;
}

// PRIVATE helper-to-helper export: registers a deferred raw-body
// receipt on the SAME per-test owner BEFORE issueThunk may produce any
// effect — a closed owner rejects the new external work before the
// thunk runs. The IDENTICAL direct result or original Promise is
// returned: a synchronous throw and an original rejection stay on the
// caller channel unchanged, and the receipt settles only on actual raw
// completion — a rejection never invents descriptor close, successful
// exit or safe cleanup.
export function ownFixtureAttempt(t, issueThunk) {
  const receipt = deferred();
  registerFixtureTeardown(t, { settle: () => receipt.promise });
  let result;
  try {
    result = issueThunk();
  } catch (e) {
    receipt.resolve();
    throw e;
  }
  Promise.resolve(result).then(
    () => receipt.resolve(),
    () => receipt.resolve(),
  );
  return result;
}

// A narrow TEST-ONLY observer at the earliest SELECTED receipt-path
// metadata admission: its restore is preregistered on the SAME
// per-test owner BEFORE the instrumentation lands, it wraps the REAL
// phaseFs.lstat and phaseFs.realpath preserving the original this/args and
// delegating to the ORIGINAL functions — the genuine result Promise
// and errors pass through unchanged — and it counts the genuine
// admission AT invocation, before the underlying call, ONLY when the
// resolved path is EXACTLY the canonical completion target or its
// phase directory (the first uniquely selected confinement component;
// the existing root is already canonical). A zero count afterward is
// the observed absence of that selected metadata admission — never a
// completion-read or all-IO proof — and the optional test-local
// onAdmission sees each counted call for causal observation.
// observeDriverBegun is the shared TEST-ONLY outgoing-begun observer
// imported DIRECTLY by its owning suites: the send restore is
// preregistered on the SAME per-test owner BEFORE the tap lands and
// the receipt settles only on the actual outgoing admission — a begun
// resolves even on a false submit, a stop rejects with its real
// reason; no physical close authority is implied.
export function observeSelectedReceiptMetadata(t, workspaceRoot, refPath) {
  const target = path.resolve(workspaceRoot, refPath);
  const phaseDir = path.dirname(target);
  const origLstat = phaseFs.lstat;
  const origRealpath = phaseFs.realpath;
  const seen = { admissions: 0, onAdmission: null };
  registerFixtureTeardown(t, {
    restore: () => {
      phaseFs.lstat = origLstat;
      phaseFs.realpath = origRealpath;
    },
  });
  const selected = (p) => {
    if (typeof p !== "string") return false;
    const resolved = path.resolve(p);
    return resolved === target || resolved === phaseDir;
  };
  phaseFs.lstat = function (p, ...rest) {
    if (selected(p)) {
      seen.admissions += 1;
      if (seen.onAdmission) seen.onAdmission("lstat", p);
    }
    return origLstat.apply(this, [p, ...rest]);
  };
  phaseFs.realpath = function (p, ...rest) {
    if (selected(p)) {
      seen.admissions += 1;
      if (seen.onAdmission) seen.onAdmission("realpath", p);
    }
    return origRealpath.apply(this, [p, ...rest]);
  };
  return seen;
}

// A narrow TEST-ONLY observer on the actual OUTGOING begun admission:
// the restore is preregistered on the SAME per-test owner BEFORE the
// instrumentation lands, the saved child send is invoked with the
// original this/ALL args — the genuine callback, return and a thrown
// error pass through unchanged — and the returned receipt settles only
// AFTER the underlying send returns: an outgoing type:begun resolves
// it (a false admission still means the SAME envelope was submitted —
// resolved, never replayed) while an actual outgoing type:stop rejects
// it with that real stopReason, so a genuine verification failure
// reports as itself instead of fixed latency. Both outcomes are
// pre-observed so an unconsumed receipt never floats unhandled; the
// ORIGINAL receipt still rejects exactly.
export function observeDriverBegun(t, driverFixture) {
  const receipt = deferred();
  receipt.promise.then(
    () => {},
    () => {},
  );
  const origSend = driverFixture.child.send;
  registerFixtureTeardown(t, {
    restore: () => {
      driverFixture.child.send = origSend;
    },
  });
  driverFixture.child.send = function (...args) {
    const admitted = origSend.apply(this, args);
    const outgoing = args[0];
    if (outgoing && outgoing.type === "stop") {
      receipt.reject(outgoing.stopReason);
    } else if (outgoing && outgoing.type === "begun") {
      receipt.resolve(outgoing);
    }
    return admitted;
  };
  return receipt.promise;
}

// Neutral both-outcome observation: a settled flag is never read as a
// rejected-promise proof and the original error channel stays exact.
export const observeFixturePromise = (promise) => {
  const state = {
    settled: false,
    fulfilled: false,
    rejected: false,
    hasError: false,
    error: undefined,
    value: undefined,
  };
  promise.then(
    (value) => {
      state.settled = true;
      state.fulfilled = true;
      state.value = value;
    },
    (error) => {
      state.settled = true;
      state.rejected = true;
      state.hasError = true;
      state.error = error;
    },
  );
  return state;
};

// Captures the exact arbitrary thrown value behind an explicit
// presence flag so null/undefined stays distinguishable — the
// original value is preserved whole on the caller's own channel,
// never described, wrapped or read as evidence.
export const captureFixtureThrow = (fn) => {
  const out = { observed: false, value: undefined };
  try {
    fn();
  } catch (error) {
    out.observed = true;
    out.value = error;
  }
  return out;
};


// Whole bounded gate helper moved from await-stage.test.mjs for import margin.
export const createFixtureGate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
