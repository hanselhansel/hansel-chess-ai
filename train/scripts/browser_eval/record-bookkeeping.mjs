// Private descriptive bookkeeping-observer owner for records.mjs.
// This leaf owns the whole optional settlement-diagnostic path: real
// bound-clock capture/settlement sampling, safe arbitrary-error
// description, the frozen five-field observer payload, at-most-once
// notification and the single best-effort process.emitWarning
// fallback. It imports nothing and holds no Records, Store,
// Lifecycle, Evidence, Native, filesystem, lifetime or retainActual
// capability; records.mjs remains the sole writer, state owner and
// status authority and calls the two methods only at the truthful
// boundaries it already controls. Nothing here proves closure,
// decides a phase result, feeds verified.final or delays a completed
// publication.

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const DETAIL_LIMIT = 400;
const WARNING_PREFIX = "Tinyaz bookkeeping observer failed: ";

// Freeze only the plain objects this module builds, never caller or
// thrown objects. The payload fields are scalars or objects produced
// here, so enumerable own keys cover the whole graph.
const deepFreeze = (value) => {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

// Safe arbitrary-value description shared by the payload primaryError
// and the warning detail. Literal "null"/"undefined" describe those
// thrown values and stay distinct from a clean no-fault result. For
// any other value the code is copied only when it is a string, under
// guarded property access; the detail prefers a string message under
// guarded property access, falls back to a guarded String conversion,
// and finally to a fixed type description if access or conversion
// itself throws. The original value is never canonical-copied,
// JSON-stringified, mutated, annotated or replaced.
const describeThrownValue = (value) => {
  if (value === null) return { code: null, detail: "null" };
  if (value === undefined) return { code: null, detail: "undefined" };

  let code = null;
  try {
    const rawCode = value.code;
    if (typeof rawCode === "string") code = rawCode;
  } catch {
    code = null;
  }

  let detail = null;
  try {
    const rawMessage = value.message;
    if (typeof rawMessage === "string") detail = rawMessage;
  } catch {
    detail = null;
  }
  if (detail === null) {
    try {
      detail = String(value);
    } catch {
      detail = `<${typeof value}>`;
    }
  }
  return { code, detail: detail.slice(0, DETAIL_LIMIT) };
};

// The single diagnostic route: Node's existing process.emitWarning.
// Emission itself is guarded best-effort — a replaced diagnostic
// primitive or a throwing warning handler cannot propagate into the
// Records pipeline or displace the genuine Store result/primary.
const warnObserverFailure = (fault) => {
  try {
    process.emitWarning(WARNING_PREFIX + describeThrownValue(fault).detail, {
      code: "TINYAZ_BOOKKEEPING_OBSERVER",
      type: "TinyazBookkeepingObserverWarning",
    });
  } catch {
    // Best-effort only; never rethrows into A, B or the Store path.
  }
};

export function createBookkeepingObserver({
  runId,
  phase,
  nowMonoMs,
  onBookkeepingSettlement,
}) {
  // Pure construction: validate and capture the four trusted bindings.
  // runId/phase arrive as already validated manifest strings,
  // nowMonoMs is the SAME real bound clock records.mjs inherited and
  // onBookkeepingSettlement is the optional callback bindRuntime
  // accepted. Nothing is invoked, scheduled, sampled or copied here.
  if (typeof runId !== "string" || typeof phase !== "string") {
    fail("RECORDER_CONFIG", "bookkeeping manifest strings");
  }
  if (
    typeof nowMonoMs !== "function" ||
    typeof onBookkeepingSettlement !== "function"
  ) {
    fail("RECORDER_CONFIG", "bookkeeping clock/observer functions");
  }

  // Descriptive state only. captureClosedMonoMs stays null until A's
  // real close is observed, so a failed A reports null. reportAvailable
  // drops to false once a clock/format failure already warned, so the
  // later incomplete report is skipped instead of shipped partial.
  // notified enforces at most one observer invocation per attempt.
  let captureClosedMonoMs = null;
  let reportAvailable = true;
  let notified = false;

  // records.mjs calls this ONLY after body A really closed every
  // evidence handle and finishClosedEvidence succeeded. It samples the
  // SAME bound clock once and retains the finite actual time — never a
  // deadline, fabricated zero, caller stamp or new origin. A throwing
  // or non-finite read warns once through the existing fallback and
  // marks the report unavailable; nothing throws into or delays A,
  // nothing reaches the observer — settlement body B is still required.
  const observeCaptureClosed = () => {
    if (!reportAvailable) return;
    let sampled;
    try {
      sampled = nowMonoMs();
    } catch (fault) {
      reportAvailable = false;
      warnObserverFailure(fault);
      return;
    }
    if (!Number.isFinite(sampled)) {
      reportAvailable = false;
      warnObserverFailure("nowMonoMs returned a non-finite capture sample");
      return;
    }
    captureClosedMonoMs = sampled;
  };

  // records.mjs supplies the trusted private {hasPrimary, primary}
  // tuple ONLY after its own safe settlement: a truthful settled body
  // B, or a failed body A after every acquired actual handle genuinely
  // closed. The true settled clock is read first; the independently
  // owned deeply frozen exact five-key payload is then delivered
  // through a detached Promise continuation whose rejection handler is
  // installed BEFORE the callback can run. The notification is never
  // awaited or retained: a throwing, rejecting or hanging observer
  // cannot delay, retract or replace the authoritative completed
  // result, and every descriptive failure lands in the same single
  // best-effort warning rather than in the Records pipeline.
  const notifySettled = (settled) => {
    if (notified || !reportAvailable) return;
    notified = true;
    try {
      const settledMonoMs = nowMonoMs();
      if (!Number.isFinite(settledMonoMs)) {
        reportAvailable = false;
        warnObserverFailure("nowMonoMs returned a non-finite settlement sample");
        return;
      }
      const hasPrimary =
        settled !== null && settled !== undefined && settled.hasPrimary === true;
      const primaryError = hasPrimary
        ? deepFreeze(describeThrownValue(settled.primary))
        : null;
      const payload = deepFreeze({
        runId,
        phase,
        captureClosedMonoMs,
        bookkeepingSettledMonoMs: settledMonoMs,
        primaryError,
      });
      const notification = Promise.resolve().then(() => {
        return onBookkeepingSettlement(payload);
      });
      notification.then(undefined, (fault) => {
        warnObserverFailure(fault);
      });
    } catch (fault) {
      reportAvailable = false;
      warnObserverFailure(fault);
    }
  };

  return Object.freeze({ observeCaptureClosed, notifySettled });
}
