// Confined async artifact IO under one workspace root. Owns the serialized
// operation queue, pending reservation accounting, lane budgets, immutable
// and seal registries, and atomic write/replace publication. Streaming
// append/replace sink opens are delegated to artifact-sinks.mjs through ONE
// frozen storeContext sharing this same queue; confined-path, durable-file
// and bounded hashing primitives are delegated to artifact-files.mjs; the
// public read APIs are re-exported unchanged. The optional lifetime is the
// genuine watchdog owner: omitted creates a real createWatchdogLifetime
// owner (never a noop), a supplied brand is validated before any debt can
// be armed, and its retainActual registrar — threaded as io here and via
// storeContext.retainActual into the sink — is the ONE ledger for every
// raw effect and real close. No process, model or browser operation here.

import { promises as fsp } from "node:fs";
import path from "node:path";
import { sha256Bytes } from "./canonical-json.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { openStoreArtifact } from "./artifact-sinks.mjs";
import {
  confined,
  issueActual,
  normRel,
  storeFail as fail,
  writeAtomic,
} from "./artifact-files.mjs";
import {
  assertWatchdogLifetime,
  createWatchdogLifetime,
} from "./watchdog-lifetime.mjs";
import { createStoreCompletionMethods } from "./artifact-completion.mjs";

const ORDINARY = FIXED_LIMITS.resources.ordinaryBytes;
const TOTAL = FIXED_LIMITS.resources.workspaceBytes;
const RESERVE = FIXED_LIMITS.resources.finalReserveBytes;
const STALE_MS = 1000;
const LANES = ["ordinary", "final"];

// Identity-keyed association from each constructor-produced store to its
// EXACT captured owner; WeakMap keys reject spread copies and lookalikes.
const STORE_OWNERS = new WeakMap();

export { inspectArtifactRef, phaseArtifactRefs } from "./artifact-files.mjs";

export function createArtifactStore({ workspaceRoot, readFootprint, monotonicNow, lifetime }) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("STORE_ARGS", "workspaceRoot");
  }
  if (typeof readFootprint !== "function" || typeof monotonicNow !== "function") {
    fail("STORE_ARGS", "mandatory callbacks");
  }
  // A supplied lifetime must carry the genuine watchdog brand and is
  // validated before this store can arm any hold or debt; omitted gets a
  // real referenced owner, never a noop or a second ledger.
  if (lifetime !== undefined) assertWatchdogLifetime(lifetime);
  const owner = lifetime === undefined ? createWatchdogLifetime() : lifetime;
  const retainActual = owner.retainActual;
  const io = Object.freeze({ retainActual });
  const root = path.resolve(workspaceRoot);
  const state = {
    queue: Promise.resolve(),
    pending: new Set(),
    finalBytes: 0,
    unobserved: [],
    lastObservedAtMs: -Infinity,
    sealedDirs: [],
    immutable: new Set(),
    activePaths: new Set(),
    activeArtifactIds: new Set(),
    closedArtifactIds: new Set(),
    accountingFault: false,
    overrun: false,
    ioFault: false,
  };

  const enqueue = (op) => {
    const run = state.queue.then(op);
    state.queue = run.then(
      () => {},
      () => {},
    );
    return run;
  };

  const usable = () => {
    if (state.accountingFault) fail("STORE_ACCOUNTING", "sticky accounting fault");
    if (state.overrun) fail("STORE_OVERRUN", "workspace over ceiling");
    if (state.ioFault) fail("STORE_IO", "sticky io fault");
  };

  const checkSeal = (clean) => {
    for (const dir of state.sealedDirs) {
      if (clean === dir || clean.startsWith(`${dir}/`)) fail("STORE_SEALED", clean);
    }
  };

  // Every operation samples the whole-workspace footprint before reserving.
  // An exception, malformed sample or stale timestamp is a sticky accounting
  // fault: the store never silently continues on unverifiable usage.
  const charge = async () => {
    let sample;
    try {
      sample = await readFootprint();
    } catch (error) {
      state.accountingFault = true;
      fail("STORE_ACCOUNTING", "footprint threw", { cause: error });
    }
    const ok =
      sample &&
      typeof sample === "object" &&
      sample.accountingValid === true &&
      Number.isFinite(sample.chargedBytes) &&
      sample.chargedBytes >= 0 &&
      Number.isFinite(sample.observedAtMs);
    if (!ok) {
      state.accountingFault = true;
      fail("STORE_ACCOUNTING", "invalid sample");
    }
    const now = monotonicNow();
    if (
      !Number.isFinite(now) ||
      sample.observedAtMs > now ||
      now - sample.observedAtMs > STALE_MS
    ) {
      state.accountingFault = true;
      fail("STORE_ACCOUNTING", "stale sample");
    }
    // observedAtMs is the conservative start of the provider's whole
    // footprint scan: a walk can only prove bytes that committed strictly
    // before its scan started. Scan starts are nondecreasing: an older,
    // still-fresh observation arriving after a newer one already retired
    // its covered deltas would resurrect freed budget, so it is rejected
    // as sticky unavailable accounting before its charge is used or any
    // delta retires. A same-timestamp rescan remains admissible.
    if (sample.observedAtMs < state.lastObservedAtMs) {
      state.accountingFault = true;
      fail("STORE_ACCOUNTING", "regressing observation");
    }
    // Retire a committed delta only when its commit boundary is strictly
    // earlier than this sample's start; a write committed during (or at
    // the same tick as) the scan's start stays charged as unobserved
    // growth instead of being dropped.
    if (sample.observedAtMs > state.lastObservedAtMs) {
      state.lastObservedAtMs = sample.observedAtMs;
    }
    state.unobserved = state.unobserved.filter(
      (delta) => delta.committedAtMs >= sample.observedAtMs,
    );
    return sample.chargedBytes;
  };

  const unobservedTotal = () => {
    let total = 0;
    for (const delta of state.unobserved) total += delta.bytes;
    return total;
  };

  const pendingTotal = () => {
    let total = 0;
    for (const res of state.pending) total += res.bytes;
    return total;
  };

  const pendingFinal = () => {
    let total = 0;
    for (const res of state.pending) {
      if (res.lane === "final") total += res.bytes;
    }
    return total;
  };

  const reserve = async (bytes, lane) => {
    const observed = await charge();
    const unobserved = unobservedTotal();
    if (lane === "ordinary") {
      if (observed + unobserved + pendingTotal() + bytes > ORDINARY) {
        fail("STORE_CAPACITY", lane);
      }
    } else {
      if (observed + unobserved + pendingTotal() + bytes > TOTAL) {
        fail("STORE_CAPACITY", lane);
      }
      if (state.finalBytes + pendingFinal() + bytes > RESERVE) {
        fail("STORE_CAPACITY", "final reserve");
      }
    }
    const res = { bytes, lane };
    state.pending.add(res);
    return res;
  };

  // Post-write accounting must observe committed bytes inside the fixed
  // ceilings; a breach latches the overrun instead of rewriting record.
  const postAccounting = async () => {
    const observed = await charge();
    if (observed > TOTAL) {
      state.overrun = true;
      fail("STORE_OVERRUN", "post-write ceiling");
    }
  };

  // Committed bytes stay charged as unobserved growth until a footprint
  // scan whose start boundary is strictly later than the commit boundary
  // includes them. Unavailable accounting or an observed ceiling breach
  // rejects the current operation, after the reservation has already been
  // folded into the unobserved charge.
  const reconcile = async (res) => {
    state.pending.delete(res);
    state.unobserved.push({ lane: res.lane, bytes: res.bytes, committedAtMs: monotonicNow() });
    if (res.lane === "final") state.finalBytes += res.bytes;
    await postAccounting();
  };

  const release = (res) => state.pending.delete(res);

  const markIoFault = () => {
    state.ioFault = true;
  };

  // Frozen once per store and handed to the extracted sink: the same
  // queue, accounting hooks, registry Sets and bound registrar — never
  // the whole mutable state, a second ledger or a leaf-local owner.
  const storeContext = Object.freeze({
    root,
    lanes: LANES,
    enqueue,
    usable,
    checkSeal,
    reserve,
    release,
    reconcile,
    postAccounting,
    immutable: state.immutable,
    activePaths: state.activePaths,
    activeArtifactIds: state.activeArtifactIds,
    closedArtifactIds: state.closedArtifactIds,
    markIoFault,
    retainActual,
  });

  // ONE unforgeable owner token authorizes every completion-capability
  // mutation at the parent; ONE strong phase Map keeps every transaction
  // entry — including its terminal tombstone — recoverable, and ONE
  // prepared WeakMap binds each genuine capability to its entry.
  const storeOwner = Object.freeze({});
  const completionByPhase = new Map();
  const completionByPrepared = new WeakMap();

  // The WHOLE previous sealPhase body factored into a synchronous
  // lexical core: public sealPhase only enqueues it, while a successful
  // prepared publication invokes it DIRECTLY under the already-owned
  // queue — never awaiting its own enqueued public method.
  const sealPhaseCore = (phaseDirectory) => {
    const clean = normRel(phaseDirectory, "phaseDirectory");
    const prefix = `${clean}/`;
    for (const p of state.activePaths) {
      if (p === clean || p.startsWith(prefix)) {
        fail("STORE_STATE", `${clean} still active`);
      }
    }
    if (!state.sealedDirs.includes(clean)) state.sealedDirs.push(clean);
  };

  // Frozen once per store: the EXACT 18-field completion context. The
  // first twelve borrow this store's closures/Sets/function identities;
  // the last six are Store-owned private bindings — the minted owner
  // token, the EXACT same frozen io, the same owner finalizer registrar,
  // the strong phase map, the prepared WeakMap and the synchronous seal
  // core. Never the whole mutable state, a second queue or a new owner.
  const completionContext = Object.freeze({
    root,
    enqueue,
    usable,
    checkSeal,
    reserve,
    release,
    reconcile,
    postAccounting,
    immutable: state.immutable,
    activePaths: state.activePaths,
    markIoFault,
    retainActual,
    storeOwner,
    io,
    retainFinalizerUntil: owner.retainFinalizerUntil,
    completionByPhase,
    completionByPrepared,
    sealPhaseCore,
  });
  const completionMethods = createStoreCompletionMethods(completionContext);

  const store = {
    root,

    async writeOnce(rel, bytes, lane) {
      // Copy caller bytes synchronously: mutation after this call cannot
      // alter what is written or hashed into the receipt.
      const buffer = Buffer.from(bytes ?? []);
      if (!LANES.includes(lane)) fail("STORE_ARGS", "lane");
      return enqueue(async () => {
        usable();
        const { abs, clean } = await confined(root, rel, "path", io);
        checkSeal(clean);
        if (state.activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
        if (state.immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
        const exists = await issueActual(retainActual, () => fsp.lstat(abs)).then(
          () => true,
          (e) => {
            if (e.code === "ENOENT") return false;
            throw e;
          },
        );
        if (exists) fail("STORE_EXISTS", clean);
        const res = await reserve(buffer.length, lane);
        try {
          await writeAtomic(abs, buffer, io);
        } catch (error) {
          // A write/sync/rename durability failure is a sticky IO fault;
          // path/setup rejections stay caller-correctable.
          if (error.storeStage === "io") state.ioFault = true;
          release(res);
          throw error;
        }
        await reconcile(res);
        state.immutable.add(clean);
        return Object.freeze({
          path: clean,
          byteLength: buffer.length,
          sha256: sha256Bytes(buffer),
        });
      });
    },

    async openArtifact({ artifactId, path: rel, mode, lane }) {
      // One queue end to end: the extracted sink enqueues its
      // open/append/close operations on this same queue through
      // storeContext.enqueue; no leaf enqueues and awaits itself.
      return openStoreArtifact({ artifactId, path: rel, mode, lane }, storeContext);
    },

    async deleteEphemeral(rel) {
      return enqueue(async () => {
        usable();
        const { abs, clean } = await confined(root, rel, "path", io);
        checkSeal(clean);
        if (state.immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
        if (state.activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
        const stat = await issueActual(retainActual, () => fsp.lstat(abs));
        if (!stat.isFile() || stat.isSymbolicLink()) fail("STORE_PATH", clean);
        try {
          await issueActual(retainActual, () => fsp.unlink(abs));
        } catch (error) {
          state.ioFault = true;
          throw error;
        }
      });
    },

    async sealPhase(phaseDirectory) {
      // The whole body lives in the synchronous sealPhaseCore above;
      // this method only queues it on the same store queue.
      return enqueue(() => {
        sealPhaseCore(phaseDirectory);
      });
    },

    // The three prepared-transaction methods produced by the ONE
    // completion factory attach to this SAME store result.
    prepareCompletion: completionMethods.prepareCompletion,
    publishPreparedCompletion: completionMethods.publishPreparedCompletion,
    containPreparedCompletion: completionMethods.containPreparedCompletion,
  };

  STORE_OWNERS.set(store, owner);
  return Object.freeze(store);
}

// Returns the genuine lifetime owner captured at construction. The
// WeakMap key accepts only a real createArtifactStore result: spread
// copies, lookalikes and proxies carry no association.
export function artifactStoreLifetime(store) {
  const owner = STORE_OWNERS.get(store);
  if (owner === undefined) fail("STORE_ARGS", "unknown store");
  return owner;
}
