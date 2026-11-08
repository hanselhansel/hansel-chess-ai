import { accountingTrace } from "./accounting-trace.mjs";

// watchdog-lifetime.mjs is the supervisor's actual referenced-lifetime
// and deferred physical-debt owner. retainActual registers real debt
// synchronously BEFORE its issuer invokes the actual callback/IO and
// retainFinalizerUntil registers the publication transaction's
// safe-exit debt before any possible completion publication. ONE
// referenced Node hold keeps this supervisor process alive while any
// truthful debt exists and is released only at a fulfilled true zero.
// A receipt rejection is observed but NEVER releases debt: no public
// timeout, thrown operation error, error callback or
// destroy/end/close invocation proves physical closure, and a raw
// syscall's settled result settles only its own raw-effect receipt —
// every created FD/stream/child retains separate real-close/reap debt.
// whenSettled observes the actual registered debt, not public
// outcomes, and fulfills only at genuine zero; it is a fresh
// observation on every call, never a cached initially-resolved zero.
// There is no queue, clock, phase, Native capability, record/schema or
// status authority here. Functional runtime input.

const OWNERS = new WeakMap();
const AWAIT_LABELS = new Set([
  "accounting.trace", "supervisor.fault", "cleanup.run", "cleanup.event", "cleanup.term", "cleanup.kill",
  "cleanup.listeners", "cleanup.workload", "cleanup.monitor",
  "shutdown.ordinary", "shutdown.admission", "shutdown.resource",
  "shutdown.driver-reap", "shutdown.driver-scope", "shutdown.lifetime",
  "records.finalize", "records.containment", "run-supervisor.lifetime",
  "shutdown.stop-send", "records.stop-ordinary", "records.game-stop", "ordinary.fault", "records.cleanup", "driver.fault", "driver.requestfailed",
]);

function emitMarker(state, scope, label, call, phase, cause, atMonoMs, deadlineMonoMs) {
  if (!state?.reportAwaitStage || state.reporting || state.markerCount >= 64 ||
    !AWAIT_LABELS.has(label) || !["phase", "selftest"].includes(scope)) {
    return;
  }
  // Guard before property reads too: a hostile cause accessor can reenter.
  state.reporting = true;
  try {
    const record = { seq: state.markerCount, call, scope, stage: label, state: phase };
    if (Number.isFinite(atMonoMs)) {
      record.at = atMonoMs;
    }
    if (Number.isFinite(deadlineMonoMs)) {
      record.end = deadlineMonoMs;
    }
    const serialize = (value) => `TINYAZ_AWAIT ${JSON.stringify(value)}\n`;
    if (["rejected", "callback-rejected", "copy-invalid"].includes(phase) && cause !== null &&
      ["object", "function"].includes(typeof cause)) {
      const read = (source, key) => {
        try {
          return source?.[key];
        } catch {
          return undefined;
        }
      };
      const strings = (source) => {
        const result = {};
        if (source !== null && ["object", "function"].includes(typeof source)) {
          for (const key of ["code", "message", "detail"]) {
            const value = read(source, key);
            if (typeof value === "string") {
              let text = value.slice(0, key === "message" ? 4096 : 96);
              if (label.startsWith("driver.")) {
                text = text.split(/[\r\n]/, 1)[0]
                  .replace(/[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s"'<>]+/g, "[url]")
                  .replace(/\b(?:token|password|authorization|secret)\s*[:=]\s*\S+/gi, "[redacted]")
                  .replace(/\bBearer\s+\S+/gi, "[redacted]");
              }
              result[key] = text;
            }
          }
        }
        return result;
      };
      const top = strings(cause);
      const first = strings(read(cause, "cause")); // Exactly one level; no recursive cause read.
      if (label === "supervisor.fault") {
        const detail = read(cause, "detail");
        if (typeof detail === "string" && detail.length <= 256) try {
          const fact = JSON.parse(detail);
          if (["invalid-now", "future-start", "age-exceeded"].includes(fact.classification) &&
            [fact.nowMs, fact.sampleStartMs, fact.ageMs].every((v) => v === null || Number.isFinite(v))) {
            top.detail = `${fact.classification} now=${fact.nowMs} start=${fact.sampleStartMs} age=${fact.ageMs}`;
          }
        } catch {} // Unknown diagnostic data retains the original bounded formatter.
      }
      // Monitor wrappers already retain a bounded informational detail. Compact
      // ONLY known supplied sample scalars, never infer queue or scheduling time.
      let nativeDetail;
      const faultDetail = label.startsWith("driver.") ? undefined : read(read(cause, "fault"), "detail");
      const retained = typeof faultDetail === "string" ? faultDetail : top.message;
      if (typeof retained === "string") {
        const bounded = retained.slice(0, 4096);
        const start = bounded.indexOf("sample interval {");
        if (start >= 0) {
          try {
            const facts = JSON.parse(bounded.slice(start + "sample interval ".length));
            const keys = [["g", "gapMs"], ["p", "preCycleGapMs"], ["c", "cycleDurationMs"],
              ["n", "nativeDurationMs"], ["r", "coverageRounds"]];
            if (keys.every(([, key]) => (key === "preCycleGapMs" && facts[key] === null) ||
              (typeof facts[key] === "number" && Number.isFinite(facts[key])))) {
              nativeDetail = keys.map(([key, field]) => `${key}=${facts[field]}`).join(" ");
            }
          } catch {}
        }
        if (typeof faultDetail === "string") {
          nativeDetail ??= bounded.slice(0, 96);
        }
      }
      const fields = [
        ["code", top.code?.slice(0, 32)], ["causeCode", first.code?.slice(0, 32)],
        ["detail", nativeDetail || first.detail || top.detail], ["causeMessage", first.message], ["message", top.message],
      ];
      for (const [key, value] of fields) {
        if (typeof value !== "string") {
          continue;
        }
        // Bound before JSON encoding, without String/toString or raw objects.
        let text = value.slice(0, 96);
        while (text.length > 0) {
          const candidate = { ...record, [key]: text };
          if (Buffer.byteLength(serialize(candidate)) <= 256) {
            record[key] = text;
            break;
          }
          text = text.slice(0, -1);
        }
      }
    }
    const line = serialize(record);
    if (Buffer.byteLength(line) > 256) {
      return;
    }
    state.markerCount += 1;
    state.reportAwaitStage(line);
    return true;
  } catch {} finally {
    state.reporting = false;
  }
}

// Same lifetime/scope and original marker budget. Pure data, after first cause.
function emitAccountingTrace(state, scope, error) {
  if (state.traceScopes.has(scope) || state.reporting) return;
  state.reporting = true;
  let packet;
  try { packet = accountingTrace.packet(error, 64 - state.markerCount); }
  catch {} finally { state.reporting = false; }
  if (!packet?.length) return;
  state.traceScopes.add(scope);
  for (const detail of packet) emitMarker(state, scope, "accounting.trace",
    state.observationCount++, "rejected", { detail });
}

// Passive descriptive observation only. The issued object and every original
// result/cause are unchanged. Reporter work has no required-IO/debt authority.
export function observeAwaitStage(owner, scope, label, issue) {
  const state = OWNERS.get(owner);
  if (!state?.reportAwaitStage || state.reporting || state.markerCount >= 64 ||
    !AWAIT_LABELS.has(label) || !["phase", "selftest"].includes(scope)) {
    return issue();
  }
  const call = state.observationCount++;
  const emit = (phase, cause) => emitMarker(state, scope, label, call, phase, cause);
  emit("entered");
  let actual;
  try {
    actual = issue();
  } catch (error) {
    emit("rejected", error);
    throw error;
  }
  try {
    // Native Promise brand dispatch avoids invoking an arbitrary .then getter.
    // The passive child always fulfills; it is never a required settlement.
    Promise.prototype.then.call(actual, () => {
      emit("fulfilled");
    }, (error) => {
      emit("rejected", error);
    });
  } catch {} // A non-Promise supplies no observed async settlement fact.
  return actual;
}

// Internal ordinary-fault diagnostic, called only after its genuine first-stop.
// Synchronous data only: no issued promise, required IO or ownership change.
export function reportStoppedFault(owner, scope, error) {
  const state = OWNERS.get(owner);
  if (!state || state.reporting || !state.reportAwaitStage || state.markerCount >= 64) {
    return;
  }
  if (emitMarker(state, scope, "ordinary.fault", state.observationCount++, "rejected", error))
    emitAccountingTrace(state, scope, error);
}

// Earliest shared fault, including resource persistence; descriptive only.
export function reportSupervisorFault(owner, scope, error) {
  const state = OWNERS.get(owner);
  if (state && emitMarker(state, scope, "supervisor.fault", state.observationCount++, "rejected", error))
    emitAccountingTrace(state, scope, error);
}

// Private Recorder classification only. The SAME marker budget/guard is used;
// no clock read, extra verifier invocation, error replacement or required debt.
export function reportCleanupVerification(owner, scope, classification, cause, atMonoMs, deadlineMonoMs) {
  const state = OWNERS.get(owner);
  if (!state || state.reporting || !state.reportAwaitStage || state.markerCount >= 64 ||
    !["pre-bound-spent", "callback-rejected", "post-bound-spent", "copy-invalid", "shape-invalid", "accepted"].includes(classification)) {
    return;
  }
  emitMarker(state, scope, "records.cleanup", state.observationCount++, classification,
    cause, atMonoMs, deadlineMonoMs);
}

// Existing child diagnostic sink only. No issue, wait, clock or control.
export function reportDriverDiagnostic(owner, scope, label, cause) {
  const state = OWNERS.get(owner);
  if (!state || state.reporting || !state.reportAwaitStage || state.markerCount >= 64 ||
    !["driver.fault", "driver.requestfailed"].includes(label)) {
    return;
  }
  emitMarker(state, scope, label, state.observationCount++, "rejected", cause);
}

// Read only approved bounded lines from the existing stderr drain. Original
// pipe close/exit receipts remain the sole physical-settlement authority.
export function createDriverDiagnosticReader(owner, scope) {
  let pending = [];
  let dropping = false;
  const accept = (bytes) => {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(bytes));
      if (!text.startsWith("TINYAZ_AWAIT ") || Buffer.byteLength(text) + 1 > 256) return;
      const row = JSON.parse(text.slice("TINYAZ_AWAIT ".length));
      const fields = ["seq", "call", "scope", "stage", "state", "code", "message", "detail", "causeCode", "causeMessage"];
      if (row === null || typeof row !== "object" || Array.isArray(row) ||
        Object.keys(row).some((key) => !fields.includes(key)) ||
        !Number.isSafeInteger(row.seq) || row.seq < 0 || row.seq >= 64 ||
        !Number.isSafeInteger(row.call) || row.call < 0 || row.scope !== scope ||
        !["driver.fault", "driver.requestfailed"].includes(row.stage) || row.state !== "rejected") return;
      for (const key of ["code", "message", "detail", "causeCode", "causeMessage"]) {
        if (Object.hasOwn(row, key) && (typeof row[key] !== "string" || row[key].length > 96)) return;
      }
      reportDriverDiagnostic(owner, scope, row.stage, { code: row.code, message: row.message,
        detail: row.detail, cause: { code: row.causeCode, message: row.causeMessage } });
    } catch {} // Unapproved/raw transcript bytes never become diagnostic data.
  };
  return (chunk) => {
    if (!Buffer.isBuffer(chunk) || !OWNERS.has(owner)) return;
    for (const byte of chunk) {
      if (OWNERS.get(owner).markerCount >= 64) return;
      if (byte === 10) {
        const complete = pending;
        const valid = !dropping;
        pending = [];
        dropping = false;
        if (valid) accept(complete);
      } else if (!dropping) {
        if (pending.length >= 255) {
          pending = [];
          dropping = true;
        } else {
          pending.push(byte);
        }
      }
    }
  };
}

// A large interval keeps the process referenced indefinitely; the tick
// is a process-lifetime handle only, never a deadline or control clock.
const HOLD_TICK_MS = 2147483647;

const fail = (detail) => {
  const error = new Error(`watchdog-lifetime ${detail}`);
  error.code = "WATCHDOG_LIFETIME";
  return error;
};

// The operational default: ONE actual referenced Node timer created in
// the same supervisor on first debt, returning an idempotent release.
// Isolated leaf fault tests alone may inject a createHold spy through
// the explicit factory option; operational assembly exposes no hold
// factory or fake-lifetime switch.
const defaultReferencedHold = () => {
  const timer = setInterval(() => {}, HOLD_TICK_MS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    clearInterval(timer);
  };
};

export function assertWatchdogLifetime(owner) {
  if (!OWNERS.has(owner)) throw fail("owner brand");
}

export function createWatchdogLifetime({ createHold = defaultReferencedHold, reportAwaitStage = null } = {}) {
  if (typeof createHold !== "function") throw fail("createHold");
  const state = {
    outstanding: 0,
    holdRelease: null,
    waiters: new Set(),
    reportAwaitStage: typeof reportAwaitStage === "function" ? reportAwaitStage : null,
    reporting: false,
    markerCount: 0,
    observationCount: 0,
    traceScopes: new Set(),
  };

  // The single hold is reused while any debt exists and is created
  // lazily: the constructor itself starts no timer and performs no IO.
  const acquireHold = () => {
    if (state.holdRelease !== null) return;
    const release = createHold();
    if (typeof release !== "function") throw fail("hold release");
    let released = false;
    state.holdRelease = () => {
      if (released) return;
      released = true;
      release();
    };
  };

  const drainIfZero = () => {
    if (state.outstanding !== 0) return;
    if (state.holdRelease !== null) {
      const release = state.holdRelease;
      state.holdRelease = null;
      release();
    }
    for (const resolve of [...state.waiters]) {
      state.waiters.delete(resolve);
      resolve();
    }
  };

  // Registers debt BEFORE the issuer's actual work begins. Fulfillment
  // is the only path that retires it; a rejected or unproven receipt is
  // observed so the process cannot report an unhandled rejection, but
  // the debt — and the referenced hold — stay held forever.
  const retain = (settlementPromise) => {
    if (
      settlementPromise === null ||
      (typeof settlementPromise !== "object" &&
        typeof settlementPromise !== "function") ||
      typeof settlementPromise.then !== "function"
    ) {
      throw fail("settlement promise");
    }
    state.outstanding += 1;
    try {
      acquireHold();
    } catch (error) {
      state.outstanding -= 1;
      throw error;
    }
    settlementPromise.then(
      () => {
        state.outstanding -= 1;
        drainIfZero();
      },
      () => {
        // Observed rejection: debt and hold retained; unproven
        // physical state can never be claimed settled.
      },
    );
  };

  const owner = {
    retainActual: retain,
    retainFinalizerUntil: retain,
    // Fresh actual-debt observation on every call: resolves only at a
    // genuine zero of registered receipts, stays pending while any
    // rejected or unproven debt remains.
    whenSettled: () => {
      if (state.outstanding === 0) return Promise.resolve();
      return new Promise((resolve) => {
        state.waiters.add(resolve);
      });
    },
  };
  OWNERS.set(owner, state);
  return Object.freeze(owner);
}
