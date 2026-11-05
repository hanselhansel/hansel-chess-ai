// Streaming append/replace artifact sinks opened under the store's ONE
// serialized queue. openStoreArtifact is the whole extracted openArtifact
// implementation: every argument check, active/immutable/reused-path
// guard, reservation, commit-bound reconcile, retained terminal error
// and durable close sequence is preserved. The frozen storeContext is
// the only authority — the same queue, accounting hooks, registry Sets
// and bound registrar — so no leaf-local queue, budget or ledger exists.
// Raw FS effects route through the owner's issueActual and adopted
// handles through openActual/OwnedFile: registration precedes issuance,
// writeAll consumes the already-registered OwnedFile.write, and a
// rejected real close stays a retained fault with outstanding debt that
// a later genuine close may settle without clearing the original error.
// No process, model or browser operation here.

import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  confined,
  dirSync,
  hashFileRef,
  issueActual,
  openActual,
  storeFail as fail,
  tempIn,
  writeAll,
} from "./artifact-files.mjs";

export const openStoreArtifact = ({ artifactId, path: rel, mode, lane }, storeContext) => {
  const {
    root,
    lanes,
    enqueue,
    usable,
    checkSeal,
    reserve,
    release,
    reconcile,
    postAccounting,
    immutable,
    activePaths,
    activeArtifactIds,
    closedArtifactIds,
    markIoFault,
    retainActual,
  } = storeContext;
  if (typeof artifactId !== "string" || artifactId.length === 0) {
    fail("STORE_ARGS", "artifactId");
  }
  if (!["append", "replace"].includes(mode)) fail("STORE_ARGS", "mode");
  if (!lanes.includes(lane)) fail("STORE_ARGS", "lane");
  const io = { retainActual };
  return enqueue(async () => {
    usable();
    const { abs, clean } = await confined(root, rel, "path", io);
    checkSeal(clean);
    if (activePaths.has(clean)) fail("STORE_STATE", `${clean} sink active`);
    if (immutable.has(clean)) fail("STORE_STATE", `${clean} immutable`);
    if (activeArtifactIds.has(artifactId) || closedArtifactIds.has(artifactId)) {
      fail("STORE_STATE", `${artifactId} reused`);
    }
    let handle;
    let tmp = null;
    if (mode === "append") {
      await issueActual(retainActual, () => fsp.mkdir(path.dirname(abs), { recursive: true }));
      handle = await openActual(retainActual, () => fsp.open(abs, "a"));
    } else {
      const stat = await issueActual(retainActual, () => fsp.lstat(abs)).catch((e) => {
        if (e.code === "ENOENT") fail("STORE_STATE", `${clean} no replace target`);
        throw e;
      });
      if (!stat.isFile() || stat.isSymbolicLink()) fail("STORE_PATH", clean);
      await issueActual(retainActual, () => fsp.mkdir(path.dirname(abs), { recursive: true }));
      tmp = await tempIn(path.dirname(abs), path.basename(abs), io);
      handle = await openActual(retainActual, () => fsp.open(tmp, "wx"));
    }
    activePaths.add(clean);
    activeArtifactIds.add(artifactId);
    let sinkLane = lane;
    let closed = false;
    let terminalFailed = false;
    let terminalError;
    let result = null;
    // The sink's first terminal append/write/close/reconcile/hash
    // failure is latched as presence plus value: terminalFailed marks
    // that the stream went terminal while terminalError retains the
    // exact first thrown value — even null or undefined, which a null
    // sentinel or ??= capture would silently lose or overwrite. A
    // later append keeps its existing usable/closed guard order, then
    // rejects with the latched value; a later close rethrows that
    // exact first value instead of resolving null or a success-shaped
    // ref.
    const latchTerminal = (error) => {
      if (!terminalFailed) {
        terminalFailed = true;
        terminalError = error;
      }
    };
    const sink = {
      async append(bytes) {
        const buffer = Buffer.from(bytes ?? []);
        return enqueue(async () => {
          usable();
          if (closed) fail("STORE_STATE", "closed sink");
          if (terminalFailed) throw terminalError;
          checkSeal(clean);
          const res = await reserve(buffer.length, sinkLane);
          try {
            await writeAll(handle, buffer);
          } catch (error) {
            markIoFault();
            latchTerminal(error);
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
            latchTerminal(error);
            throw error;
          }
        });
      },
      setLane(next) {
        if (!lanes.includes(next)) fail("STORE_ARGS", "lane");
        sinkLane = next;
      },
      async close() {
        return enqueue(async () => {
          if (closed) {
            if (terminalFailed) throw terminalError;
            return result;
          }
          closed = true;
          if (!terminalFailed) {
            try {
              checkSeal(clean);
              await handle.sync();
              await handle.close();
              if (tmp !== null) {
                await issueActual(retainActual, () => fsp.rename(tmp, abs));
                await dirSync(path.dirname(abs), io);
              }
            } catch (error) {
              // Required durable IO failed: the fault is latched and
              // the failure becomes this sink's terminal result.
              markIoFault();
              latchTerminal(error);
            }
          }
          // The owned handle is always drained, whatever happened: a
          // genuine real close may still settle the outstanding
          // physical debt, but it never clears the latched first
          // fault.
          await handle.close().catch(() => {});
          activePaths.delete(clean);
          activeArtifactIds.delete(artifactId);
          closedArtifactIds.add(artifactId);
          // Required final accounting still runs after the durable
          // close; a breach keeps the stream failure-terminal.
          try {
            await postAccounting();
          } catch (error) {
            latchTerminal(error);
          }
          if (!terminalFailed) {
            try {
              result = Object.freeze(await hashFileRef(abs, clean, io));
            } catch (error) {
              latchTerminal(error);
            }
          }
          if (terminalFailed) throw terminalError;
          return result;
        });
      },
    };
    return sink;
  });
};
