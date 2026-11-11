// Bounded prepared-readback capability owner for the completion
// publication parent. This module is a PURE factory:
// createPreparedCompletionReader captures the caller-supplied trusted
// acquisition closure immediately, validates it before returning and
// invokes nothing — no IO, clock, timer, queue, ledger or hold of its
// own, and no mutable dependency or result object. The returned
// stable function reopens the owned temp through that SAME private
// acquireReader — armed acquisition latch, pinned failedReader slot
// and genuine close debt — requires pinned {dev,ino} bigint identity,
// exact byte count/hash and stable before/after stats, then returns
// the frozen PreparedRead metadata — never a published receipt or
// verification token. It owns no status, phase, exit, seal,
// accounting or proof-setter authority and imports only node
// crypto/fs plus the artifact-files primitives it calls — never the
// observation module, the parent, the Store, the Recorder or
// receipt-verification.

import { createHash } from "node:crypto";
import { privateFs as fsp } from "./private-fs.mjs";
import { assertBudgetHandle, originalContextBudget } from "./process-budget.mjs";
import {
  issueActual,
  ownedFileCloseReceipt,
  storeFail as fail,
} from "./artifact-files.mjs";

const READ_CHUNK = 65536;

const isSameFile = (stat, fileId) =>
  stat.isFile() &&
  !stat.isSymbolicLink() &&
  stat.dev === fileId.dev &&
  stat.ino === fileId.ino;

// The factory validates and captures the trusted acquisition function
// immediately — a non-function dependency fails before any reader is
// produced. It invokes nothing at composition time and the captured
// closure stays private for the lifetime of the returned function;
// no caller argument can override acquisition.
export const createPreparedCompletionReader = ({ acquireReader }) => {
  if (typeof acquireReader !== "function") {
    fail("STORE_ARGS", "acquireReader");
  }
  const acquire = acquireReader;

  // Bounded prepared readback for the parent's branded capability:
  // reopens the owned temp under the SAME armed acquisition latch and
  // real-close debt, requires pinned {dev,ino} bigint identity on the
  // path and the opened reader, streams under the exact reserved byte
  // bound while hashing, and demands a genuinely observed close. The
  // adopted reader is pinned on the shared failedReader slot so its
  // close debt survives a rejected read into the failure-observation
  // path; the first read rejection is preserved even when the close
  // also fails, and the outstanding genuine slot and its debt stay
  // retained. The frozen result carries a fresh owned Buffer and ref
  // snapshots — canonicalRef projected from ACTUAL verified bytes —
  // and is frozen metadata only, never published/ordinary
  // VerifiedEvidence: it cannot mint a verification token.
  return async function readPreparedCompletionFile({
    workspaceRoot,
    phaseDirectory,
    canonicalRel,
    tempAbs,
    tempRel,
    fileId,
    byteLength,
    sha256,
    io,
    ownedFiles,
    verificationContext,
  }) {
    const guard = () => {
      if (verificationContext !== undefined) {
        const budget = originalContextBudget(verificationContext);
        assertBudgetHandle(budget);
        budget.assertLive("V3 prepared read");
      }
    };
    guard();
    if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
      fail("STORE_ARGS", "workspaceRoot");
    }
    if (typeof phaseDirectory !== "string" || phaseDirectory.length === 0) {
      fail("STORE_ARGS", "phaseDirectory");
    }
    if (typeof canonicalRel !== "string" || canonicalRel.length === 0) {
      fail("STORE_ARGS", "canonicalRel");
    }
    if (typeof tempAbs !== "string" || tempAbs.length === 0) {
      fail("STORE_ARGS", "tempAbs");
    }
    if (typeof tempRel !== "string" || tempRel.length === 0) {
      fail("STORE_ARGS", "tempRel");
    }
    if (
      fileId === null ||
      typeof fileId !== "object" ||
      typeof fileId.dev !== "bigint" ||
      typeof fileId.ino !== "bigint"
    ) {
      fail("STORE_ARGS", "fileId");
    }
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
      fail("STORE_ARGS", "byteLength");
    }
    // The private declared hash is pinned to the exact
    // 64-lowercase-hex shape BEFORE any effect; the parent-pinned hash
    // already carries that shape and there is no public schema
    // change.
    if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) {
      fail("STORE_ARGS", "sha256");
    }
    if (
      io === null ||
      io === undefined ||
      typeof io.retainActual !== "function"
    ) {
      fail("STORE_ARGS", "io.retainActual");
    }
    if (ownedFiles === null || typeof ownedFiles !== "object") {
      fail("STORE_ARGS", "ownedFiles");
    }
    const retain = io.retainActual;
    // Snapshot the pinned identity and byte ceiling BEFORE the first
    // await; ownedFiles stays the SAME shared resource object, never
    // cloned.
    const pinnedId = Object.freeze({ dev: fileId.dev, ino: fileId.ino });
    const byteCeiling = BigInt(byteLength);

    guard();
    const before = await issueActual(retain, () =>
      fsp.lstat(tempAbs, { bigint: true }),
    );
    guard();
    if (!isSameFile(before, pinnedId)) {
      fail("STORE_STATE", "prepared temp replaced");
    }

    // Acquisition runs through the trusted private closure, which
    // owns the shared uncertain latch and the failedReader slot
    // checks BEFORE issuing the open and pins the adopted handle on
    // the SAME slot before the next await.
    guard();
    const handle = await acquire({ retain, tempAbs, ownedFiles });
    // Brand the adopted handle through the existing genuine close
    // receipt BEFORE relying on its methods: a forged or mock
    // lookalike has no receipt entry and fails here, never yielding a
    // positive readback.
    const closeReceipt = ownedFileCloseReceipt(handle);

    const hash = createHash("sha256");
    const chunks = [];
    let read = 0;
    let primary;
    let readFailed = false;
    try {
      guard();
      const opened = await handle.stat({ bigint: true });
      guard();
      if (!isSameFile(opened, pinnedId)) {
        fail("STORE_STATE", "prepared temp replaced");
      }
      const buffer = Buffer.alloc(
        Math.max(1, Math.min(READ_CHUNK, byteLength)),
      );
      for (;;) {
        guard();
        const { bytesRead } = await handle.read(
          buffer,
          0,
          buffer.length,
          read,
        );
        guard();
        if (bytesRead === 0) break;
        read += bytesRead;
        hash.update(buffer.subarray(0, bytesRead));
        chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
        // Completion reads stay bounded by the actual reserved
        // final-record size; a grown file rejects instead of
        // streaming.
        if (BigInt(read) > byteCeiling) {
          fail("ARTIFACT_INTEGRITY", "prepared grew");
        }
      }
    } catch (error) {
      readFailed = true;
      primary = error;
    }
    // The actual close is attempted even after a read failure: only
    // the observed receipt clears the shared slot, and the original
    // read rejection still wins when the close also fails — the
    // outstanding genuine slot and its debt stay retained for the
    // observation path. The handler is armed on the SAME real close
    // receipt BEFORE any close and the FIRST close rejection is
    // captured verbatim — a present null/undefined rejection value
    // still counts through the flag — so a later physically-settled
    // real close can settle the SAME debt without masking that first
    // fault into a positive prepared result.
    let closed = false;
    let closeFailed = false;
    let closeError;
    closeReceipt.then(() => {
      closed = true;
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await handle.close();
      } catch (error) {
        if (!closeFailed) {
          closeFailed = true;
          closeError = error;
        }
        // The sticky fault stays retained on the OwnedFile itself; a
        // repeated close lets a later real close settle the SAME
        // debt.
      }
      if (closed) break;
    }
    if (closed) {
      ownedFiles.failedReader = null;
    }
    if (readFailed) throw primary;
    if (closeFailed) throw closeError;
    if (ownedFiles.failedReader !== null) {
      fail("STORE_STATE", "reader close unproven");
    }

    // Fresh post-close path observation: the still-owned original
    // must remain exactly the pinned regular file — a lost, replaced
    // or grown temp is never returned as verified bytes.
    guard();
    const after = await issueActual(retain, () =>
      fsp.lstat(tempAbs, { bigint: true }),
    );
    guard();
    if (
      !isSameFile(after, pinnedId) ||
      read !== byteLength ||
      after.size !== before.size ||
      after.ino !== before.ino ||
      after.mtimeNs !== before.mtimeNs
    ) {
      fail("ARTIFACT_INTEGRITY", "prepared changed");
    }
    const digest = hash.digest("hex");
    if (digest !== sha256) fail("ARTIFACT_INTEGRITY", "prepared hash");

    return Object.freeze({
      workspaceRoot,
      phaseDirectory,
      canonicalRef: Object.freeze({
        path: canonicalRel,
        byteLength: read,
        sha256: digest,
      }),
      temporaryRef: Object.freeze({
        path: tempRel,
        byteLength: read,
        sha256: digest,
      }),
      fileId: pinnedId,
      bytes: Buffer.concat(chunks),
      io,
    });
  };
};
