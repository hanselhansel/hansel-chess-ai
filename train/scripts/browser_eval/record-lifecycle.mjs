// Private leaf owner for the recorder attempt/admission/error-latching
// wrapper, the pending-actual unfinished-evidence closure and the v2
// late final-evidence fence/continuation pair. records.mjs supplies the
// five trusted recorder closures and remains the sole canonical writer,
// state/status owner and actual sink owner. This module owns no timer,
// IO, queue, clock, Native work, wire field, schema, status ladder or
// second debt ledger.

const makeError = (code, detail, options = undefined) => {
  const error = new Error(`records ${code}: ${detail}`, options);
  error.code = code;
  return error;
};

const fail = (code, detail) => {
  throw makeError(code, detail);
};

// CurrentBodyToken and FinalEvidenceTicket are frozen opaque objects
// whose only identity lives in these module-private WeakMaps: the owning
// lifecycle instance, the exact pending receipt and the body's actual
// settlement. They are never JSON, wire, record, ArtifactRef, status or
// retrievable through the recorder facade.
const tokenMeta = new WeakMap();
const ticketMeta = new WeakMap();

export function createRecorderLifecycle({
  readState,
  latchFailure,
  closeAdmission,
  closeWriters,
  retainActual,
}) {
  if (
    typeof readState !== "function" ||
    typeof latchFailure !== "function" ||
    typeof closeAdmission !== "function" ||
    typeof closeWriters !== "function" ||
    typeof retainActual !== "function"
  ) {
    fail("RECORDER_CONFIG", "lifecycle callbacks");
  }

  const owner = Object.freeze({});
  // The permanent incomplete and final evidence fences: once either is
  // installed, every later attempt — ordinary, fault/resource/cleanup
  // mutation or finalization — is rejected through the state guard.
  let incompleteFence = false;
  let finalFence = false;
  let closure = null;
  const pending = new Set();

  // One actual admitted body: a neutral receipt is preregistered in the
  // same pending Set and the SAME inherited registrar BEFORE the
  // synchronous callback invocation, marked by its token's actual
  // success or failure and removed only when the real body settles.
  // Arbitrary thrown values keep the original latch channel; a
  // secondary latch throw can never replace the first fault or skip
  // actual receipt settlement.
  const runBody = async (invoke) => {
    let markSettled;
    const receipt = new Promise((resolve) => {
      markSettled = resolve;
    });
    const token = Object.freeze({});
    const meta = { owner, receipt, active: true, succeeded: false };
    tokenMeta.set(token, meta);
    try {
      pending.add(receipt);
      retainActual(receipt);
      const value = await invoke(token);
      meta.succeeded = true;
      return value;
    } catch (error) {
      try {
        latchFailure(error);
      } catch {
        // A secondary latch failure keeps the original first fault.
      }
      throw error;
    } finally {
      meta.active = false;
      pending.delete(receipt);
      markSettled();
    }
  };

  const attempt = async (fn) => {
    if (incompleteFence) fail("RECORDER_STATE", "incomplete evidence closed");
    if (finalFence) fail("RECORDER_STATE", "final evidence fenced");
    const observed = readState();
    if (observed.sticky !== null) {
      throw makeError("RECORDER_STICKY", observed.sticky,
        observed.stickyCausePresent === true ? { cause: observed.stickyCause } : undefined);
    }
    // Existing ordinary callbacks ignore the extra private token
    // argument; the receipt still proves only actual body settlement,
    // never sink/child closure.
    return runBody((token) => fn(token));
  };

  // The v2 late evidence fence: only the still-active finalizer body
  // installs it, after the recorder's mandatory verifier/fact handling
  // and with finalizing already set and no earlier fence installed. The
  // permanent fence plus the recorder-owned admission close happen
  // synchronously before the first await, then every OTHER pre-fence
  // actual body drains — never this token's own receipt and never a
  // global settlement barrier. No file is closed and no event kind is
  // admitted past this point.
  const fenceFinalEvidence = async (token) => {
    const meta = tokenMeta.get(token);
    const observed = readState();
    if (
      meta === undefined ||
      meta.owner !== owner ||
      meta.active !== true ||
      !pending.has(meta.receipt) ||
      observed.finalizing !== true ||
      observed.finalized !== false ||
      incompleteFence ||
      finalFence
    ) {
      fail("RECORDER_STATE", "final evidence fence");
    }
    finalFence = true;
    closeAdmission();
    await Promise.all([...pending].filter((receipt) => receipt !== meta.receipt));
    // The ticket records its A token; whether A actually settled
    // successfully is read from that token at continuation time.
    const ticket = Object.freeze({});
    ticketMeta.set(ticket, { owner, token, consumed: false });
    return ticket;
  };

  // The single-use privileged continuation through the final fence:
  // every guard — forged/foreign/used/expired ticket, actually
  // successful settled capture body, drained other bodies, unchanged
  // finalizing/not-finalized/no-sticky state and this lifecycle's own
  // fence — rejects BEFORE the ticket is consumed, so a premature or
  // caller-correctable call leaves the genuine ticket usable. Its
  // separate actual body is preregistered before fn() with no ordinary
  // admission reopen and no caller fact or token argument.
  const continueFinalEvidence = async (ticket, fn) => {
    const tmeta = ticketMeta.get(ticket);
    const ameta = tmeta === undefined ? undefined : tokenMeta.get(tmeta.token);
    const observed = readState();
    if (
      tmeta === undefined ||
      tmeta.owner !== owner ||
      tmeta.consumed === true ||
      ameta === undefined ||
      ameta.active !== false ||
      ameta.succeeded !== true ||
      pending.size !== 0 ||
      observed.finalizing !== true ||
      observed.finalized !== false ||
      observed.sticky !== null ||
      finalFence !== true ||
      incompleteFence === true
    ) {
      fail("RECORDER_STATE", "final evidence continuation");
    }
    tmeta.consumed = true;
    return runBody(() => fn());
  };

  // Repeated calls return the same actual closure promise, including
  // its rejection; a rejected closure never counts anything settled. An
  // invalid competing/finalized state rejects through the promise
  // channel BEFORE any fence is installed or cached, so it cannot steal
  // the later legal finalizer. On the first valid call the cached
  // closure promise exists before any reentrant callback could observe
  // it; its own settlement receipt is retained through the SAME
  // registrar OUTSIDE the pending Set it drains; the permanent
  // incomplete fence plus the recorder-owned admission close run
  // synchronously; then every earlier actual body — including a
  // still-open late acquisition — is awaited before the real
  // closeWriters observes and closes every actual sink.
  const closeIncompleteEvidence = () => {
    if (closure !== null) return closure;
    const observed = readState();
    if (observed.finalizing || observed.finalized || finalFence) {
      return Promise.reject(
        makeError("RECORDER_STATE", "finalization owns the evidence"),
      );
    }
    let markSettled;
    const receipt = new Promise((resolve) => {
      markSettled = resolve;
    });
    let finish;
    closure = new Promise((resolve, reject) => {
      finish = { resolve, reject };
    });
    retainActual(receipt);
    incompleteFence = true;
    closeAdmission();
    (async () => {
      try {
        await Promise.all([...pending]);
        await closeWriters();
        finish.resolve();
      } catch (error) {
        finish.reject(error);
      } finally {
        markSettled();
      }
    })();
    return closure;
  };

  return Object.freeze({
    attempt,
    closeIncompleteEvidence,
    fenceFinalEvidence,
    continueFinalEvidence,
  });
}
