// Confined async artifact IO under one workspace root. Owns the serialized
// operation queue, pending reservation accounting, lane budgets, immutable
// and seal registries, and atomic write/replace publication. Confined-path,
// durable-file and bounded hashing primitives are delegated to
// artifact-files.mjs; the public read APIs are re-exported unchanged.
// No process, model or browser operation here.

import { promises as fsp } from "node:fs";
import path from "node:path";
import { sha256Bytes } from "./canonical-json.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import {
  confined,
  dirSync,
  hashFileRef,
  normRel,
  storeFail as fail,
  tempIn,
  writeAll,
  writeAtomic,
} from "./artifact-files.mjs";

const ORDINARY = FIXED_LIMITS.resources.ordinaryBytes;
const TOTAL = FIXED_LIMITS.resources.workspaceBytes;
const RESERVE = FIXED_LIMITS.resources.finalReserveBytes;
const STALE_MS = 1000;
const LANES = ["ordinary", "final"];

export { inspectArtifactRef, phaseArtifactRefs } from "./artifact-files.mjs";

export function createArtifactStore({ workspaceRoot, readFootprint, monotonicNow }) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("STORE_ARGS", "workspaceRoot");
  }
  if (typeof readFootprint !== "function" || typeof monotonicNow !== "function") {
    fail("STORE_ARGS", "mandatory callbacks");
  }
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

  const store = {
    root,

    async writeOnce(rel, bytes, lane) {
      // Copy caller bytes synchronously: mutation after this call cannot
      // alter what is written or hashed into the receipt.
      const buffer = Buffer.from(bytes ?? []);
      if (!LANES.includes(lane)) fail("STORE_ARGS", "lane");
      return enqueue(async () => {
        usable();
        const { abs, clean } = await confined(root, rel, "path");
        checkSeal(clean);
        if (state.activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
        if (state.immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
        const exists = await fsp.lstat(abs).then(
          () => true,
          (e) => {
            if (e.code === "ENOENT") return false;
            throw e;
          },
        );
        if (exists) fail("STORE_EXISTS", clean);
        const res = await reserve(buffer.length, lane);
        try {
          await writeAtomic(abs, buffer);
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
      if (typeof artifactId !== "string" || artifactId.length === 0) {
        fail("STORE_ARGS", "artifactId");
      }
      if (!["append", "replace"].includes(mode)) fail("STORE_ARGS", "mode");
      if (!LANES.includes(lane)) fail("STORE_ARGS", "lane");
      return enqueue(async () => {
        usable();
        const { abs, clean } = await confined(root, rel, "path");
        checkSeal(clean);
        if (state.activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
        if (state.immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
        if (
          state.activeArtifactIds.has(artifactId) ||
          state.closedArtifactIds.has(artifactId)
        ) {
          fail("STORE_STATE", `${artifactId} reused`);
        }
        let handle;
        let tmp = null;
        if (mode === "append") {
          await fsp.mkdir(path.dirname(abs), { recursive: true });
          handle = await fsp.open(abs, "a");
        } else {
          const stat = await fsp.lstat(abs).catch((e) => {
            if (e.code === "ENOENT") fail("STORE_STATE", `${clean} no replace target`);
            throw e;
          });
          if (!stat.isFile() || stat.isSymbolicLink()) fail("STORE_PATH", clean);
          await fsp.mkdir(path.dirname(abs), { recursive: true });
          tmp = await tempIn(path.dirname(abs), path.basename(abs));
          handle = await fsp.open(tmp, "wx");
        }
        state.activePaths.add(clean);
        state.activeArtifactIds.add(artifactId);
        let sinkLane = lane;
        let closed = false;
        let terminalError = null;
        let result = null;
        // The sink's first terminal append/write/close/reconcile/hash
        // failure is retained: every later close or retry rejects with it
        // instead of resolving null or a success-shaped ref.
        const sink = {
          async append(bytes) {
            const buffer = Buffer.from(bytes ?? []);
            return enqueue(async () => {
              usable();
              if (closed) fail("STORE_STATE", "closed sink");
              if (terminalError !== null) throw terminalError;
              checkSeal(clean);
              const res = await reserve(buffer.length, sinkLane);
              try {
                await writeAll(handle, buffer);
              } catch (error) {
                state.ioFault = true;
                terminalError ??= error;
                release(res);
                throw error;
              }
              // The stored chunk's reservation becomes a commit-bound
              // unobserved delta before the append is acknowledged, so
              // a fresh whole scan counting these bytes retires the
              // delta instead of charging the chunk twice; in-flight
              // reservations on any stream stay in pending.
              try {
                await reconcile(res);
              } catch (error) {
                terminalError ??= error;
                throw error;
              }
            });
          },
          setLane(next) {
            if (!LANES.includes(next)) fail("STORE_ARGS", "lane");
            sinkLane = next;
          },
          async close() {
            return enqueue(async () => {
              if (closed) {
                if (terminalError !== null) throw terminalError;
                return result;
              }
              closed = true;
              if (terminalError === null) {
                try {
                  checkSeal(clean);
                  await handle.sync();
                  await handle.close();
                  if (tmp !== null) {
                    await fsp.rename(tmp, abs);
                    await dirSync(path.dirname(abs));
                  }
                } catch (error) {
                  // Required durable IO failed: the fault is latched and
                  // the failure becomes this sink's terminal result.
                  state.ioFault = true;
                  terminalError = error;
                }
              }
              // The owned handle is always drained, whatever happened.
              await handle.close().catch(() => {});
              state.activePaths.delete(clean);
              state.activeArtifactIds.delete(artifactId);
              state.closedArtifactIds.add(artifactId);
              // Required final accounting still runs after the durable
              // close; a breach keeps the stream failure-terminal.
              try {
                await postAccounting();
              } catch (error) {
                terminalError ??= error;
              }
              if (terminalError === null) {
                try {
                  result = Object.freeze(await hashFileRef(abs, clean));
                } catch (error) {
                  terminalError = error;
                }
              }
              if (terminalError !== null) throw terminalError;
              return result;
            });
          },
        };
        return sink;
      });
    },

    async deleteEphemeral(rel) {
      return enqueue(async () => {
        usable();
        const { abs, clean } = await confined(root, rel, "path");
        checkSeal(clean);
        if (state.immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
        if (state.activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
        const stat = await fsp.lstat(abs);
        if (!stat.isFile() || stat.isSymbolicLink()) fail("STORE_PATH", clean);
        try {
          await fsp.unlink(abs);
        } catch (error) {
          state.ioFault = true;
          throw error;
        }
      });
    },

    async sealPhase(phaseDirectory) {
      return enqueue(async () => {
        const clean = normRel(phaseDirectory, "phaseDirectory");
        const prefix = `${clean}/`;
        for (const p of state.activePaths) {
          if (p === clean || p.startsWith(prefix)) {
            fail("STORE_STATE", `${clean} still active`);
          }
        }
        if (!state.sealedDirs.includes(clean)) state.sealedDirs.push(clean);
      });
    },
  };

  return Object.freeze(store);
}
