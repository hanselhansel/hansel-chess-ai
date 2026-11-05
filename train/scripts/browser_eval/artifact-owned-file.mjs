// OwnedFile acquisition and physical close settlement, extracted whole
// from artifact-files.mjs. The pure factory is handed the SAME two
// trusted bindings — issueActual for raw-effect registration and
// storeFail for guard failures — which are validated and captured at
// construction; no callback, IO, clock, queue, timer or hold is
// invoked there. Each acquisition arms its own SEPARATE closeDebt
// through the caller's retainActual BEFORE the raw open is issued, and
// each OwnedFile close() starts at most ONE cached flow, associated
// before its first raw issue, that attempts at most TWO raw closes
// total. A genuinely observed raw close success alone retires the
// strong resource entry and fulfills the debt; a retained first fault
// is still thrown after a later real success, while failed or
// ambiguous attempts leave the flow pending on its own debt — never
// error-as-safe, fake closure, errno whitelist, timeout or GC proof.
// No second ledger, counter, owner, drain or resolver is created here.

const configError = (detail) => new Error(`artifact-owned-file ${detail}`);

// Validates and captures the two trusted bindings, then closes over
// the single private handle guard, the identity receipt map and the
// strong resource set — exactly the ownership ArtifactFiles formerly
// held inline. The frozen returned pair is the whole public surface;
// the leaf statically imports no ArtifactFiles/Store/Graph/Records/
// Lifetime owner, so the injection cannot become a backedge.
export const createOwnedFileOperations = (bindings) => {
  const { issueActual, storeFail } = bindings ?? {};
  // A bad binding fails construction with our own plain error rather
  // than through either provided callback, which is never invoked here.
  if (typeof issueActual !== "function" || typeof storeFail !== "function") {
    throw configError("requires {issueActual, storeFail} functions");
  }

  const isFileHandle = (value) =>
    value !== null &&
    typeof value === "object" &&
    typeof value.stat === "function" &&
    typeof value.read === "function" &&
    typeof value.write === "function" &&
    typeof value.sync === "function" &&
    typeof value.close === "function";

  // Identity-keyed private association from each constructor-produced
  // OwnedFile to the SAME close debt its open armed. Identity keys
  // reject spread copies, forged lookalikes and proxies by
  // construction.
  const ownedFileReceipts = new WeakMap();

  // Strongly-owned entries for every acquisition attempt and returned
  // raw resource. A pending attempt is pinned BEFORE issuance, the
  // fulfilled raw handle is pinned into the SAME entry before shape
  // validation, and the minted OwnedFile is pinned there too; an entry
  // is released only by an actual raw close success or a proven
  // pre-issuance no-open — GC never stands in for a close. This is
  // resource storage, not a second debt ledger.
  const strongResourceEntries = new Set();

  // Pre-arms a SEPARATE real-close debt BEFORE the open is issued,
  // pins the attempt entry, then performs the raw open through
  // issueActual. Only a proven pre-issuance failure — registration
  // threw before the raw open thunk ran — deletes the attempt
  // metadata, settles the never-opened debt and rethrows the original
  // error immediately. An issued rejection or an unadoptable return is
  // ambiguous — the resource may exist unobserved — so its cause and
  // attempt stay strongly retained and the acquisition awaits its own
  // closeDebt before the required failure can escape; unknown stays
  // pending and referenced, with no retry, timeout or no-creation
  // proof from errno, null handle or raw result.
  // OwnedFile exposes only the tracked stat/read/write/sync/close the
  // helpers need: every method is a registered raw effect whose
  // value/error channel stays separate from the neutral raw receipt.
  // close() owns the universal physical-settlement boundary: at most
  // ONE cached flow, associated before any raw issue so concurrent,
  // repeated, outer-retry and reentrant calls join it and add no raw
  // close, and at most TWO raw closes total per handle. A genuine raw
  // success alone marks closed, releases the entry and fulfills the
  // SAME closeDebt; the FIRST fault is retained behind a presence flag
  // — never a null sentinel or ??= — and after the bounded attempts
  // the flow awaits its own debt before the retained first value can
  // be rethrown, so two failed or ambiguous attempts stay pending. A
  // proven clean close stays idempotent; a physically settled but
  // faulted close rethrows the same first value on every call.
  const openActual = async (retainActual, issueOpenThunk) => {
    let settleClose;
    const closeDebt = new Promise((resolve) => {
      settleClose = resolve;
    });
    retainActual(closeDebt);
    // Pending attempt metadata, pinned BEFORE the raw open is issued
    // so an issued rejection or ambiguous return can never lose the
    // unknown resource; adopting a real handle turns the SAME entry
    // into the returned resource entry.
    const entry = { handle: undefined, owned: null };
    strongResourceEntries.add(entry);
    let issued = false;
    let handle;
    try {
      handle = await issueActual(retainActual, () => {
        issued = true;
        return issueOpenThunk();
      });
    } catch (error) {
      // Only a pre-issuance failure — registration threw before the
      // raw open thunk was invoked — is a proven no-open: it retires
      // the attempt metadata, settles the never-opened debt and
      // preserves the immediate original error.
      if (!issued) {
        strongResourceEntries.delete(entry);
        settleClose();
        throw error;
      }
      // Issued raw-open rejection: the resource may exist unobserved,
      // so the cause and attempt stay strongly retained and this
      // acquisition joins its own closeDebt before the required open
      // failure may escape — pending forever while unknown.
      entry.attemptCause = error;
      await closeDebt;
      throw error;
    }
    // Pin the actual returned handle IMMEDIATELY, before shape
    // validation or any further await.
    entry.handle = handle;
    // The guard reads method properties, so a throwing accessor or
    // proxy trap must not escape directly: that return is just as
    // unadoptable, so the FIRST arbitrary thrown value — including a
    // null, undefined or non-extensible one — is captured behind a
    // presence flag, never truthiness or ??=, retained as the attempt
    // cause in the SAME strong entry, and rethrown only after this
    // acquisition joins its own closeDebt.
    let shapeFaultPresent = false;
    let shapeFault;
    let adoptable = false;
    try {
      adoptable = isFileHandle(handle);
    } catch (error) {
      shapeFaultPresent = true;
      shapeFault = error;
    }
    if (shapeFaultPresent) {
      entry.attemptCause = shapeFault;
      await closeDebt;
      throw shapeFault;
    }
    if (!adoptable) {
      // Unadoptable return: the raw resource can never be observably
      // closed, so it stays pinned and the acquisition awaits its own
      // debt rather than reporting a completed failure.
      entry.unadoptable = true;
      await closeDebt;
      storeFail("STORE_IO", "open returned no handle");
    }
    let closed = false;
    let closeFlow;
    let firstFaultPresent = false;
    let firstFault;
    const performClose = async () => {
      // Raw attempt 1 of at most TWO for this handle; every raw call
      // is preregistered by the SAME issueActual/retainActual.
      try {
        await issueActual(retainActual, () => handle.close());
        closed = true;
        strongResourceEntries.delete(entry);
        settleClose();
        return;
      } catch (error) {
        firstFaultPresent = true;
        firstFault = error;
      }
      // Raw attempt 2: the bounded retry. A genuine success settles
      // the SAME debt physically; a fault leaves settlement unknown.
      try {
        await issueActual(retainActual, () => handle.close());
        closed = true;
        strongResourceEntries.delete(entry);
        settleClose();
      } catch {
        // Ambiguous: no observed success, so the debt stays unsettled
        // and the join below keeps the flow pending.
      }
      // Join this acquisition's OWN closeDebt before any required
      // close failure escapes. Reached only behind a retained first
      // fault: a later genuine success fulfills the debt and the same
      // first value is rethrown unchanged, while two failed or
      // ambiguous attempts stay pending and referenced. No third raw
      // retry, grace, timer or global barrier exists.
      await closeDebt;
      if (firstFaultPresent) throw firstFault;
    };
    const owned = {
      stat: (...args) => issueActual(retainActual, () => handle.stat(...args)),
      read: (...args) => issueActual(retainActual, () => handle.read(...args)),
      write: (...args) => issueActual(retainActual, () => handle.write(...args)),
      sync: () => issueActual(retainActual, () => handle.sync()),
      close: () => {
        // Associate the ONE cached flow before the first raw issue or
        // any reentrant callback can ask again: the deferred start
        // runs the flow on the microtask after this assignment, so
        // later, concurrent, outer-retry and reentrant calls all join
        // the SAME operation promise and issue no extra raw close. The
        // flow is its ordinary operation promise, never a new physical
        // proof or debt ledger.
        if (closeFlow === undefined) {
          closeFlow = Promise.resolve().then(performClose);
        }
        return closeFlow;
      },
    };
    const ownedFile = Object.freeze(owned);
    entry.owned = ownedFile;
    ownedFileReceipts.set(ownedFile, closeDebt);
    return ownedFile;
  };

  // Hands back the SAME existing close-debt receipt armed for this
  // exact OwnedFile — never a new promise, resolver, ledger, clock,
  // status or proof setter. An actual successful close alone (or a
  // proven pre-issuance no-open) fulfills it; the retained fault and a
  // later real close keep their semantics. Forged, spread or proxied
  // inputs have no identity key and are rejected.
  const ownedFileCloseReceipt = (genuineOwnedFile) => {
    const receipt = ownedFileReceipts.get(genuineOwnedFile);
    if (receipt === undefined) storeFail("STORE_ARGS", "unknown OwnedFile");
    return receipt;
  };

  return Object.freeze({ openActual, ownedFileCloseReceipt });
};
