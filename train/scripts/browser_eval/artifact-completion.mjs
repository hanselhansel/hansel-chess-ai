// Store-owned prepared-completion transaction methods extracted from
// artifact-store.mjs. This module is a PURE trusted factory:
// createStoreCompletionMethods captures the frozen 18-field
// completionContext at construction, validates every binding before
// returning and invokes nothing — no callback, IO, clock, timer, queue,
// ledger, hold or transaction of its own, and no mutable dependency or
// result object. The Store constructs it ONCE and attaches the three
// returned functions to the SAME genuine frozen store; the existing
// owner WeakMap/artifactStoreLifetime stays the sole identity
// association. Each public method enqueues ONCE on the borrowed store
// queue; the WHOLE failure path — first-primary retention, pure
// same-owner+phase capability recovery, direct containment under the
// already-owned queue and the safe-settlement gate — is delegated to
// the extracted failure leaf, and a successful publication invokes the
// borrowed synchronous sealPhaseCore directly — never awaiting its own
// enqueued public methods. The ONE transaction safe-settlement is armed
// through the borrowed retainFinalizerUntil BEFORE any
// reserve/footprint/preparation/verification effect and resolves only
// at genuine sealed publication or at complete actual containment
// proven with required fresh whole-workspace accounting — unknown,
// null or unproven state stays held forever, never released, refunded
// or reclassified, and a held operation stays pending rather than
// rejecting while unsafe. A rejection escaping a required parent
// prepare/read/publish or graph readback call latches the SAME
// borrowed markIoFault so every later positive operation fences on
// usable() while owned containment still proceeds; pure argument,
// capability and token failures keep their own classifications, and
// reserve/postAccounting/reconcile keep their accounting faults — no
// raw IO fault is fabricated for them. Static imports only: the four
// parent capability functions, the graph consume/verify pair, the pure
// path/failure primitives and the failure leaf. DAG: Store ->
// ArtifactCompletion -> Graph -> Parent/ReceiptFiles/ArtifactFiles
// plus ArtifactCompletion -> ArtifactCompletionFailure ->
// Parent/ArtifactFiles; never helper -> Store/Recorder/Prerequisites/
// Watchdog/Native and no back-cycle.

import { assertVerificationContext, normRel, storeFail as fail } from "./artifact-files.mjs";
import {
  markPublicationSealed,
  prepareCompletionFile,
  publishCompletionFile,
  readPreparedCompletion,
} from "./completion-publication.mjs";
import {
  consumePreparedVerification,
  verifyReceiptGraph,
} from "./receipt-verification.mjs";
import { createCompletionFailureMethods } from "./artifact-completion-failure.mjs";

const FUNCTION_FIELDS = [
  "enqueue",
  "usable",
  "checkSeal",
  "reserve",
  "release",
  "reconcile",
  "postAccounting",
  "markIoFault",
  "retainActual",
  "retainFinalizerUntil",
  "sealPhaseCore",
];

const sameRef = (a, b) =>
  a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256;

const sameFileId = (a, b) => a.dev === b.dev && a.ino === b.ino;

export function createStoreCompletionMethods(completionContext) {
  // Pure validation/capture of the trusted frozen context: a malformed
  // binding rejects before any method is produced and nothing here
  // invokes a callback, performs IO or starts a transaction.
  if (completionContext === null || typeof completionContext !== "object") {
    fail("STORE_ARGS", "completionContext");
  }
  const {
    root,
    enqueue,
    usable,
    checkSeal,
    reserve,
    release,
    reconcile,
    postAccounting,
    immutable,
    activePaths,
    markIoFault,
    retainActual,
    storeOwner,
    io,
    retainFinalizerUntil,
    completionByPhase,
    completionByPrepared,
    sealPhaseCore,
  } = completionContext;
  if (typeof root !== "string" || root.length === 0) {
    fail("STORE_ARGS", "root");
  }
  for (const name of FUNCTION_FIELDS) {
    if (typeof completionContext[name] !== "function") {
      fail("STORE_ARGS", name);
    }
  }
  if (!(immutable instanceof Set)) fail("STORE_ARGS", "immutable");
  if (!(activePaths instanceof Set)) fail("STORE_ARGS", "activePaths");
  if (!(completionByPhase instanceof Map)) {
    fail("STORE_ARGS", "completionByPhase");
  }
  if (!(completionByPrepared instanceof WeakMap)) {
    fail("STORE_ARGS", "completionByPrepared");
  }
  if (
    storeOwner === null ||
    (typeof storeOwner !== "object" && typeof storeOwner !== "function")
  ) {
    fail("STORE_ARGS", "storeOwner");
  }
  if (io === null || typeof io !== "object" || io.retainActual !== retainActual) {
    fail("STORE_ARGS", "io");
  }
  // The borrowed release binding is captured but never invoked for
  // created or unknown bytes: only a reservation that provably produced
  // nothing could retire, and the transaction never proves that through
  // a release — containment plus fresh accounting is the sole exit.

  // The WHOLE failure flow is produced ONCE by the extracted leaf from
  // seven bindings borrowed out of this SAME frozen context — the owner
  // token, the two accounting hooks, the immutable and active-path
  // registries, the prepared WeakMap and the sticky IO latch. Its pure
  // constructor validates and captures only, invoking nothing.
  const failure = createCompletionFailureMethods({
    storeOwner,
    postAccounting,
    reconcile,
    immutable,
    activePaths,
    completionByPrepared,
    markIoFault,
  });

  // Required-IO boundary: a rejection escaping one of the required
  // parent prepare/read/publish or graph readback calls leaves the
  // workspace's physical state unproven, so the SAME borrowed
  // markIoFault latches the sticky fault that fences every later
  // positive operation through usable() — while this operation's own
  // containment still proceeds and the original rejection propagates
  // untouched. Pure argument normalization, capability and token
  // guards run outside this wrapper and keep caller-correctable
  // rejections; reserve, postAccounting and reconcile keep their own
  // accounting classification — no raw IO fault is fabricated for
  // them, and a latched fault is never cleared.
  const requiredIo = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      markIoFault();
      throw error;
    }
  };

  // prepareCompletion({phaseDirectory, bytes}) -> Promise<PreparedCompletion>
  //
  // Caller bytes are copied and the phase normalized synchronously before
  // the first await. Inside ONE enqueued operation: usable/seal and all
  // canonical active/immutable guards run, the fixed canonical path is
  // claimed, a duplicate live-or-terminal phase rejects before replacing,
  // then the strong phase entry installs and the SAME
  // retainFinalizerUntil(safeSettlement) arms BEFORE any
  // reserve/footprint/preparation effect — a registration failure issues
  // no IO and unwinds only pure state. The FULL intended bytes reserve in
  // the final lane, parent prepareCompletionFile runs behind the
  // required-IO boundary with the exact owner/root/phase/owned
  // bytes/io, the returned capability associates immediately, the
  // reconcile-attempt latch arms BEFORE the single reconcile that moves
  // reservation/unobserved/finalBytes ahead of its own await even when
  // it rejects, and the parent readPreparedCompletion behind the same
  // boundary pins the ACTUAL temp ref/bigint fileId and genuinely
  // closes before the queue returns — no guessed temp name or
  // metadata. Any rejection delegates WHOLE to the failure leaf: it
  // retains the FIRST arbitrary fault, recovers ONLY through the pure
  // recoverPreparedCompletion(SAME owner, normalized phase),
  // associates the SAME cap and drives direct containment; a null,
  // foreign or unknown lookup is HELD/UNPROVEN — never a no-creation
  // proof or a writeOnce fallback — and the required failure is the
  // original operation rejection, exposed only after true safe
  // settlement.
  async function prepareCompletion({ phaseDirectory, bytes }) {
    const buffer = Buffer.from(bytes ?? []);
    const clean = normRel(phaseDirectory, "phaseDirectory");
    return enqueue(async () => {
      usable();
      checkSeal(clean);
      const canonicalRel = `${clean}/completion.json`;
      if (immutable.has(canonicalRel)) {
        fail("STORE_STATE", `${canonicalRel} immutable`);
      }
      if (activePaths.has(canonicalRel)) {
        fail("STORE_STATE", `${canonicalRel} active`);
      }
      if (completionByPhase.has(clean)) {
        fail("STORE_STATE", `${clean} duplicate phase`);
      }
      const entry = {
        phase: clean,
        canonicalRel,
        prepared: null,
        tempRel: null,
        reservation: null,
        claims: new Set(),
        hasPrimary: false,
        primary: undefined,
        reconcileAttempted: false,
        failedPublication: null,
        stage: "preparing",
        safeSettlement: null,
        resolveSafe: null,
      };
      completionByPhase.set(clean, entry);
      entry.claims.add(canonicalRel);
      activePaths.add(canonicalRel);
      entry.safeSettlement = new Promise((resolve) => {
        entry.resolveSafe = resolve;
      });
      try {
        retainFinalizerUntil(entry.safeSettlement);
      } catch (error) {
        // A registration failure issued no IO: unwind only pure state.
        activePaths.delete(canonicalRel);
        entry.claims.delete(canonicalRel);
        completionByPhase.delete(clean);
        throw error;
      }
      try {
        entry.reservation = await reserve(buffer.length, "final");
        const prepared = await requiredIo(() =>
          prepareCompletionFile({
            storeOwner,
            root,
            phaseDirectory: clean,
            bytes: buffer,
            io,
          }),
        );
        entry.prepared = prepared;
        completionByPrepared.set(prepared, entry);
        entry.reconcileAttempted = true;
        await reconcile(entry.reservation);
        const read = await requiredIo(() => readPreparedCompletion(prepared));
        entry.tempRel = read.temporaryRef.path;
        entry.claims.add(read.temporaryRef.path);
        activePaths.add(read.temporaryRef.path);
        entry.stage = "prepared";
        return prepared;
      } catch (error) {
        // The WHOLE failure path delegates to the leaf: it rethrows the
        // exact first primary after true safe settlement, or stays
        // pending while held — never rejecting while unsafe.
        await failure.failAfterContainment(entry, error);
      }
    });
  }

  // publishPreparedCompletion(prepared, preparedVerification) ->
  //   Promise<{completionRef, verified}>
  //
  // The exact store association, terminal and foreign guards run first
  // — tombstones and held entries reject and never revive — then the
  // genuine pair token is consumed ONCE inside the queue through
  // consumePreparedVerification: a malformed token always rejects yet
  // keeps its pure classification. Parent readPreparedCompletion behind
  // the required-IO boundary re-pins the current
  // root/phase/canonical+temp refs/full bigint fileId/io, all compared
  // against the pinned consumed association and entry before the
  // unchanged publishCompletionFile(cap, storeOwner); the parent's
  // positive-primary guards forbid any earlier-fault revival and no
  // extra reservation is taken for the rename. postAccounting and then
  // a FRESH real verifyReceiptGraph with its own new Map() memo and
  // the SAME io run mandatory full
  // inventory/input/check/selftest/closure/real-close verification
  // behind the required-IO boundary. Pure
  // owner/stage/other-active-path preflight runs BEFORE the final
  // synchronous mutation batch; only after the genuine readback are
  // this transaction's claims removed, sealPhaseCore invoked, the
  // canonical ref marked immutable, the parent marked sealed and the
  // safe deferred resolved — no fallible required await or IO after the
  // first semantic seal mutation, and immutable success is never
  // retracted or reclassified. Any required preseal failure delegates
  // to the failure leaf: FIRST primary retained, actual same-cap
  // containment/restore IO despite sticky usable faults — which fence
  // positive admission only and never gate owned cleanup — then the
  // exact primary rejection once truly safe; a side-effect failure
  // after the seal triggers no containment or reclassification.
  async function publishPreparedCompletion(prepared, preparedVerification) {
    return enqueue(async () => {
      const entry = completionByPrepared.get(prepared);
      if (entry === undefined || entry.prepared !== prepared) {
        fail("STORE_ARGS", "prepared capability");
      }
      if (entry.stage !== "prepared") {
        fail("STORE_STATE", `publish ${entry.stage}`);
      }
      try {
        usable();
        const association = consumePreparedVerification(
          prepared,
          preparedVerification,
        );
        const read = await requiredIo(() => readPreparedCompletion(prepared, association.verificationContext));
        if (
          read.workspaceRoot !== association.workspaceRoot ||
          read.workspaceRoot !== root ||
          read.phaseDirectory !== association.phaseDirectory ||
          read.phaseDirectory !== entry.phase ||
          !sameRef(read.canonicalRef, association.canonicalRef) ||
          read.canonicalRef.path !== entry.canonicalRel ||
          !sameRef(read.temporaryRef, association.temporaryRef) ||
          read.temporaryRef.path !== entry.tempRel ||
          !sameFileId(read.fileId, association.fileId) ||
          read.io !== io
        ) {
          fail("STORE_STATE", "prepared association mismatch");
        }
        // Pure preflight BEFORE the final synchronous batch: every other
        // path under the phase must already be inactive so the seal core
        // cannot fail once this transaction's claims are removed.
        const prefix = `${entry.phase}/`;
        for (const p of activePaths) {
          if (
            (p === entry.phase || p.startsWith(prefix)) &&
            !entry.claims.has(p)
          ) {
            fail("STORE_STATE", `${entry.phase} still active`);
          }
        }
        const completionRef = await requiredIo(() =>
          publishCompletionFile(prepared, storeOwner, association.verificationContext),
        );
        await postAccounting();
        const verified = await requiredIo(() =>
          verifyReceiptGraph(
            {
              workspaceRoot: root,
              completionRef,
              expectedIdentity: association.expectedIdentity,
            },
            new Map(),
            io,
            association.verificationContext,
          ),
        );
        assertVerificationContext(association.verificationContext);
        for (const claim of entry.claims) activePaths.delete(claim);
        entry.claims.clear();
        sealPhaseCore(entry.phase);
        immutable.add(completionRef.path);
        markPublicationSealed(prepared, storeOwner);
        entry.stage = "sealed";
        entry.resolveSafe();
        return Object.freeze({ completionRef, verified });
      } catch (error) {
        await failure.failAfterContainment(entry, error);
      }
    });
  }

  // containPreparedCompletion(prepared, cause) -> Promise<FailedPublication>
  //
  // Explicit containment under the SAME capability and owner through
  // the failure leaf's private core inside ONE enqueued operation:
  // idempotent only for the same already-contained capability,
  // returning the existing real FailedPublication — never a minted
  // success shape. A sealed entry is rejected by the core before any
  // mutation; an unproven containment leaves the entry held, and this
  // wrapper awaits the SAME per-entry safe settlement BEFORE exposing
  // the required containment failure — while unsafe it stays pending,
  // never rejecting-while-held and inventing no capability or phase
  // fallback.
  async function containPreparedCompletion(prepared, cause) {
    return enqueue(async () => {
      const entry = completionByPrepared.get(prepared);
      if (entry === undefined || entry.prepared !== prepared) {
        fail("STORE_ARGS", "prepared capability");
      }
      try {
        return await failure.containCore(entry, cause);
      } catch (error) {
        await entry.safeSettlement;
        throw error;
      }
    });
  }

  return Object.freeze({
    prepareCompletion,
    publishPreparedCompletion,
    containPreparedCompletion,
  });
}
