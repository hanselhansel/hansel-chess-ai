// Store-owned prepared-completion FAILURE methods extracted from
// artifact-completion.mjs. This module is a PURE trusted factory:
// createCompletionFailureMethods captures seven bindings borrowed from
// the SAME frozen completionContext — the minted owner token, the two
// accounting hooks, the immutable and active-path registries, the
// prepared-capability WeakMap and the sticky IO-fault latch — validates
// each before returning and invokes nothing: no callback, IO, clock,
// timer, queue, ledger, hold or transaction of its own. The completion
// module constructs it ONCE and delegates the WHOLE failure flow to it
// with the SAME transaction entry, registries and callbacks: the FIRST
// arbitrary-fault retention, the pure same-owner+phase capability
// recovery, direct containment under the already-owned queue and the
// per-entry safe-settlement gate that exposes the required rejection
// only after genuine sealed publication or complete actual containment.
// Imports only the parent recovery/retention pair and the pure
// storeFail primitive — never the Store, the completion module, the
// receipt graph, the recorder or a lifetime binding; no back-cycle.

import { storeFail as fail } from "./artifact-files.mjs";
import {
  recoverPreparedCompletion,
  retainFailedCompletion,
} from "./completion-publication.mjs";

const FUNCTION_FIELDS = ["postAccounting", "reconcile", "markIoFault"];

export function createCompletionFailureMethods(failureContext) {
  // Pure validation/capture of the borrowed context: a malformed
  // binding rejects before any method is produced and nothing here
  // invokes a callback, performs IO or starts a transaction.
  if (failureContext === null || typeof failureContext !== "object") {
    fail("STORE_ARGS", "failureContext");
  }
  const {
    storeOwner,
    postAccounting,
    reconcile,
    immutable,
    activePaths,
    completionByPrepared,
    markIoFault,
  } = failureContext;
  if (
    storeOwner === null ||
    (typeof storeOwner !== "object" && typeof storeOwner !== "function")
  ) {
    fail("STORE_ARGS", "storeOwner");
  }
  for (const name of FUNCTION_FIELDS) {
    if (typeof failureContext[name] !== "function") {
      fail("STORE_ARGS", name);
    }
  }
  if (!(immutable instanceof Set)) fail("STORE_ARGS", "immutable");
  if (!(activePaths instanceof Set)) fail("STORE_ARGS", "activePaths");
  if (!(completionByPrepared instanceof WeakMap)) {
    fail("STORE_ARGS", "completionByPrepared");
  }

  // The FIRST arbitrary fault on a transaction entry is retained
  // verbatim — including a null, undefined or nonextensible thrown
  // value — behind an explicit flag, never overwritten and never
  // cleared by later genuine containment. The retained value stays
  // the operation's rejection.
  const retainPrimary = (entry, fault) => {
    if (!entry.hasPrimary) {
      entry.hasPrimary = true;
      entry.primary = fault;
    }
  };

  // Private containment core, invoked DIRECTLY under the already-owned
  // queue — never through the public method, which would enqueue behind
  // the operation that needs it. A sealed entry rejects BEFORE any
  // primary, registry or stage mutation; an already-contained entry
  // returns its ACTUAL retained FailedPublication without overwriting
  // the first cause. Under the SAME capability and SAME owner, the
  // parent restores matching canonical bytes to the EXACT original
  // temp without overwriting an unknown file, requires actual
  // original/reader closure — the OwnedFile boundary means a generic
  // failure cannot finish while its own descriptor is unknown —
  // post-close identity/size/mtimeNs, required sync and fresh canonical
  // absence. A rejected parent retention latches the SAME borrowed
  // sticky IO fault so every later positive operation fences on
  // usable(), while this transaction stays held and the original
  // rejection propagates untouched. Only proven containment plus
  // required fresh whole-workspace accounting may move the SAME full
  // reservation AT MOST ONCE (latched before the await, because the
  // Store already commits inside reconcile ahead of its own await) and
  // resolve the safe deferred; the actual retained failed temp is
  // pinned into the store immutable registry from the parent's ACTUAL
  // returned owned path BEFORE this transaction's claims are released,
  // so a later generic writeOnce/deleteEphemeral/append/replace cannot
  // erase the failed evidence. No refund, release, double charge or
  // size reduction: a pending or unknown reservation stays
  // conservatively charged in full, never restated as actual usage.
  // Cleanup never consults usable() and is never skipped on a sticky
  // fault; any unknown, failed-IO, accounting or absence state leaves
  // the entry unsafe and held — never a fake FailedPublication.
  const containCore = async (entry, cause) => {
    if (entry.stage === "sealed") {
      fail("STORE_STATE", "sealed publication");
    }
    if (entry.stage === "contained" && entry.failedPublication !== null) {
      return entry.failedPublication;
    }
    retainPrimary(entry, cause);
    let result;
    try {
      result = await retainFailedCompletion(
        entry.prepared,
        storeOwner,
        entry.primary,
      );
    } catch (error) {
      // The failed bytes' physical state is unproven: latch the SAME
      // borrowed sticky IO fault, then rethrow the rejection untouched.
      markIoFault();
      throw error;
    }
    // Protection lands before any claim release or further await.
    immutable.add(result.failedTemporaryPath);
    await postAccounting();
    if (entry.reservation !== null && !entry.reconcileAttempted) {
      entry.reconcileAttempted = true;
      await reconcile(entry.reservation);
    }
    for (const claim of entry.claims) activePaths.delete(claim);
    entry.claims.clear();
    entry.stage = "contained";
    entry.failedPublication = result;
    entry.resolveSafe();
    return result;
  };

  // Whole failure path behind a failed prepare/publish operation. An
  // already-sealed entry rejects up front with the ORIGINAL cause
  // before ANY retention — no primary, registry, stage or containment
  // mutation and no postseal reclassification may run on it. For every
  // other stage the FIRST fault is retained verbatim up front and the
  // pure same-owner+phase recoverPreparedCompletion lookup is the ONLY
  // recovery channel for a still-capless entry: a genuine returned
  // capability associates onto the SAME prepared WeakMap and drives
  // direct containCore under the already-owned queue (never a public
  // enqueue or a global self-wait), while a thrown, null or foreign
  // lookup is HELD/UNPROVEN — never a no-creation proof and never
  // retried by error property. A containment failure marks the entry
  // held but preserves the FIRST primary. The SAME per-entry
  // safeSettlement is then awaited BEFORE the required operation
  // rejects with the exact retained primary: while unsafe, unproven or
  // held, this method and its owning queued operation stay pending and
  // referenced — never reject-while-held, no global whenSettled, no
  // follow-up queue await, retry, timer or grace.
  const failAfterContainment = async (entry, cause) => {
    if (entry.stage === "sealed") {
      throw cause;
    }
    retainPrimary(entry, cause);
    if (entry.prepared === null) {
      let recovered = null;
      try {
        recovered = recoverPreparedCompletion(storeOwner, entry.phase);
      } catch {
        // A thrown or absent lookup is held, not a no-creation proof.
        recovered = null;
      }
      if (recovered !== null) {
        entry.prepared = recovered;
        completionByPrepared.set(recovered, entry);
      }
    }
    if (entry.prepared === null) {
      entry.stage = "held";
    } else {
      try {
        await containCore(entry, cause);
      } catch {
        entry.stage = "held";
      }
    }
    await entry.safeSettlement;
    throw entry.primary;
  };

  return Object.freeze({ retainPrimary, containCore, failAfterContainment });
}
