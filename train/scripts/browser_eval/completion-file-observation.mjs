// Failed-temp observer and bounded prepared readback for the
// completion publication owner. Given the parent's pinned original
// temp descriptor it first settles any outstanding owned writer or
// reader through the SAME pre-armed close receipts, proves the EXACT
// original identity, streams the actual failed bytes in bounded
// chunks, then finishes the required directory sync and fresh
// canonical absence before returning the frozen FailedPublication
// descriptive result. For a prepared entry it delegates to the
// dedicated prepared-reader module through the SAME private
// acquisition closure: the owned temp is reopened under the armed
// acquisition latch and real-close debt, pinned {dev,ino} bigint
// identity, exact byte count/hash and stable before/after stats are
// required, then the frozen PreparedRead metadata is returned —
// never a published receipt or verification token. A lost, replaced
// or unknown original — or any adopted handle whose close receipt
// never fulfils — is never contained: the rejection leaves the
// parent's strong entry and retained debt held, and never means a
// safe Store exit. This leaf owns no status, phase, exit, seal,
// accounting or proof-setter authority and imports only the
// artifact-files primitives it calls — never the parent, the Store,
// the Recorder or receipt-verification.

import { createHash } from "node:crypto";
import { privateFs as fsp } from "./private-fs.mjs";
import {
  dirSync,
  issueActual,
  openActual,
  ownedFileCloseReceipt,
  storeFail as fail,
} from "./artifact-files.mjs";
import { createPreparedCompletionReader } from "./completion-prepared-read.mjs";

const READ_CHUNK = 65536;

const isSameFile = (stat, fileId) =>
  stat.isFile() &&
  !stat.isSymbolicLink() &&
  stat.dev === fileId.dev &&
  stat.ino === fileId.ino;

// Registered bigint lstat that reports genuine absence instead of
// rejecting.
const lstatOrNull = async (retain, abs) => {
  try {
    return await issueActual(retain, () => fsp.lstat(abs, { bigint: true }));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

// Same registered observation: the undefined outcome marks an
// UNOBSERVED state (a non-ENOENT rejection), distinguished from null
// genuine absence — an ambiguous raw-open rejection proves nothing.
const lstatOrUndefined = async (retain, abs) => {
  try {
    return await lstatOrNull(retain, abs);
  } catch {
    return undefined;
  }
};

// ONE module-private acquisition-uncertainty latch for BOTH prepared
// and failed reads, keyed by the SAME parent-owned {writer,failedReader}
// resource object — never a new ledger, public setter or substitute
// slot. It is armed BEFORE each openActual issue and cleared only by
// a successful adoption pinned to failedReader; an issued, rejected or
// unadoptable open with no handle leaves it sticky across retries —
// never overwritten, never bypassed — forbidding fresh acquisition and
// contained results while actual debt remains unknown. The parent's
// strong entry association keeps the key and attempt alive; this latch
// settles no debt and claims no closure.
const uncertainReads = new WeakSet();

// Genuine closure proof for an adopted OwnedFile. A private observed
// flag is armed on the SAME close-debt receipt BEFORE the first close
// attempt and may change ONLY through that receipt's real fulfilment —
// never from the public close return or error, which can keep
// reporting the original sticky fault after a later real close already
// settled the debt. The bounded retry lets a later real close settle
// the SAME debt; an unsettled receipt means the handle is still
// outstanding, never contained.
const genuinelyClosed = async (owned) => {
  let observed = false;
  ownedFileCloseReceipt(owned).then(() => {
    observed = true;
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await owned.close();
    } catch {
      // The sticky fault stays retained on the OwnedFile itself; a
      // repeated close lets a later real close settle the SAME debt.
    }
    if (observed) return true;
  }
  return observed;
};

// Private acquisition shared by BOTH the failed observation and the
// prepared reader. A reader left outstanding by an earlier failed
// close — or an acquisition still unproven on the shared latch — is
// never overwritten or substituted; only observed closure of the
// adopted slot or successful adoption opens the way for a fresh
// reader. The shared acquisition-uncertainty latch is armed BEFORE
// the open is issued; the adopted reader is pinned on the shared
// failedReader slot the instant openActual returns — before the next
// await — and only that successful adoption clears the latch. An
// issued, rejected or unadoptable open leaves it sticky across
// retries — never bypassed — so no fresh reader can substitute for
// unknown debt. This callback can acquire a real resource only; it
// never attests closure, status or verification and never clears
// ambiguity arbitrarily.
const acquireReader = async ({ retain, tempAbs, ownedFiles }) => {
  if (uncertainReads.has(ownedFiles)) {
    fail("STORE_STATE", "reader acquisition uncertain");
  }
  if (ownedFiles.failedReader !== null) {
    fail("STORE_STATE", "reader outstanding");
  }
  uncertainReads.add(ownedFiles);
  const handle = await openActual(retain, () => fsp.open(tempAbs, "r"));
  ownedFiles.failedReader = handle;
  uncertainReads.delete(ownedFiles);
  return handle;
};

// Streams the owned failed temp through the adopted reader in 64KiB
// chunks under the pinned bigint byteCeiling/exact-count bounds,
// hashing each chunk immediately — never whole-file buffering. Returns
// the actual observed ref, null for unreadable-but-still-owned bytes,
// or the "replaced" marker when the opened reader is not the original
// file.
const readFailedTemp = async (
  retain,
  reader,
  tempAbs,
  tempRel,
  fileId,
  byteCeiling,
  tempStat,
) => {
  try {
    const opened = await reader.stat({ bigint: true });
    if (!isSameFile(opened, fileId)) return "replaced";
    const hash = createHash("sha256");
    let read = 0;
    const buffer = Buffer.alloc(READ_CHUNK);
    for (;;) {
      const { bytesRead } = await reader.read(buffer, 0, READ_CHUNK, read);
      if (bytesRead === 0) break;
      read += bytesRead;
      // The owned temp cannot exceed the pinned bound; growth is
      // unreadable state, never a streamed oversized artifact.
      if (BigInt(read) > byteCeiling) return null;
      hash.update(buffer.subarray(0, bytesRead));
    }
    const after = await issueActual(retain, () =>
      fsp.lstat(tempAbs, { bigint: true }),
    );
    if (
      BigInt(read) === tempStat.size &&
      after.size === tempStat.size &&
      after.ino === tempStat.ino &&
      after.mtimeNs === tempStat.mtimeNs
    ) {
      return Object.freeze({
        path: tempRel,
        byteLength: read,
        sha256: hash.digest("hex"),
      });
    }
  } catch {
    // Unreadable owned bytes fall through to the null outcome once the
    // reader has been genuinely closed by the caller.
  }
  return null;
};

// The whole failed-containment observation: settle outstanding owned
// handles, reject an unproven acquisition or unknown original,
// observe the exact original temp, run the required dirsync, stream
// the actual bytes under genuine close, take a fresh post-close path
// observation, run the required post-close dirsync and finish on fresh
// canonical absence. Any unproven step rejects — the parent's retained
// entry and debts stay held.
export async function observeFailedCompletionFile({
  tempAbs,
  tempRel,
  phaseAbs,
  canonicalAbs,
  fileId,
  maxBytes,
  io,
  ownedFiles,
}) {
  if (typeof tempAbs !== "string" || tempAbs.length === 0) {
    fail("STORE_ARGS", "tempAbs");
  }
  if (typeof tempRel !== "string" || tempRel.length === 0) {
    fail("STORE_ARGS", "tempRel");
  }
  if (typeof phaseAbs !== "string" || phaseAbs.length === 0) {
    fail("STORE_ARGS", "phaseAbs");
  }
  if (typeof canonicalAbs !== "string" || canonicalAbs.length === 0) {
    fail("STORE_ARGS", "canonicalAbs");
  }
  if (
    fileId !== null &&
    (typeof fileId !== "object" ||
      typeof fileId.dev !== "bigint" ||
      typeof fileId.ino !== "bigint")
  ) {
    fail("STORE_ARGS", "fileId");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    fail("STORE_ARGS", "maxBytes");
  }
  if (io === null || io === undefined || typeof io.retainActual !== "function") {
    fail("STORE_ARGS", "io.retainActual");
  }
  if (ownedFiles === null || typeof ownedFiles !== "object") {
    fail("STORE_ARGS", "ownedFiles");
  }
  const retain = io.retainActual;
  // Snapshot the pinned identity and byte ceiling BEFORE the first
  // await; ownedFiles stays the SAME shared resource object, never
  // cloned.
  const pinnedId =
    fileId === null
      ? null
      : Object.freeze({ dev: fileId.dev, ino: fileId.ino });
  const byteCeiling = BigInt(maxBytes);

  // Settle outstanding owned handles before any observation: a
  // surviving writer or a reader left by an earlier failed observation
  // is genuinely closed through its SAME receipt — never overwritten,
  // including on retry after failure. An unproven receipt leaves an
  // outstanding handle and is never contained.
  if (ownedFiles.writer !== null) {
    if (!(await genuinelyClosed(ownedFiles.writer))) {
      fail("STORE_STATE", "writer close unproven");
    }
    ownedFiles.writer = null;
  }
  if (ownedFiles.failedReader !== null) {
    if (!(await genuinelyClosed(ownedFiles.failedReader))) {
      fail("STORE_STATE", "reader close unproven");
    }
    ownedFiles.failedReader = null;
  }

  // Only after the adopted slots were genuinely settled: a latched
  // unproven acquisition forbids any fresh acquisition or contained
  // result, and a null original identity is NEVER no-creation proof —
  // a rejected or ambiguous exclusive open may still have created the
  // temp unseen — so the unknown original rejects, never contained.
  if (uncertainReads.has(ownedFiles)) {
    fail("STORE_STATE", "reader acquisition uncertain");
  }
  if (pinnedId === null) fail("STORE_STATE", "temp identity unknown");

  // Observe the exact original temp state. An unobserved path proves
  // nothing; a null path after an adopted original is LOST evidence;
  // a present path without the pinned identity is replaced — a
  // rejected exclusive open is never rebranded by a present file.
  const tempStat = await lstatOrUndefined(retain, tempAbs);
  if (tempStat === undefined) fail("STORE_STATE", "temp unobserved");
  if (tempStat === null) fail("STORE_STATE", "temp lost");
  if (!isSameFile(tempStat, pinnedId)) fail("STORE_STATE", "temp replaced");

  // Required directory sync and proven canonical absence before the
  // byte observation, matching the pre-cap and post-restore callers.
  await dirSync(phaseAbs, io);
  if ((await lstatOrUndefined(retain, canonicalAbs)) !== null) {
    fail("STORE_STATE", "canonical present");
  }

  // Acquisition runs through the SAME private acquireReader: the
  // shared latch is armed BEFORE the open is issued, the adopted
  // reader is pinned on the shared slot the instant openActual
  // returns — before the next await — and only that successful
  // adoption clears the latch. An issued, rejected or unadoptable
  // open leaves it sticky and the attempt uncontained rather than
  // substituting a new reader.
  const handle = await acquireReader({ retain, tempAbs, ownedFiles });
  const observed = await readFailedTemp(
    retain,
    handle,
    tempAbs,
    tempRel,
    pinnedId,
    byteCeiling,
    tempStat,
  );
  if (!(await genuinelyClosed(handle))) {
    fail("STORE_STATE", "reader close unproven");
  }
  ownedFiles.failedReader = null;
  if (observed === "replaced") fail("STORE_STATE", "temp replaced");
  const failedTemporaryRef = observed;

  // Fresh post-close path observation: the still-owned original must
  // remain exactly the observed file — anything else is lost or
  // replaced evidence.
  const postStat = await lstatOrUndefined(retain, tempAbs);
  if (postStat === undefined) fail("STORE_STATE", "temp unobserved");
  if (postStat === null) fail("STORE_STATE", "temp lost");
  if (
    !isSameFile(postStat, pinnedId) ||
    postStat.size !== tempStat.size ||
    postStat.mtimeNs !== tempStat.mtimeNs
  ) {
    fail("STORE_STATE", "temp replaced");
  }

  // Required directory sync after the final genuine close, then fresh
  // canonical absence completes the proof; a present or unobserved
  // canonical path is never contained.
  await dirSync(phaseAbs, io);
  if ((await lstatOrUndefined(retain, canonicalAbs)) !== null) {
    fail("STORE_STATE", "canonical present");
  }

  return Object.freeze({ failedTemporaryPath: tempRel, failedTemporaryRef });
}

// Pure module composition: the prepared-reader factory is invoked
// ONCE here with THIS exact lexical acquireReader — the SAME
// registrar, uncertainty latch and failedReader slot — and its
// returned stable function is exported by direct constant alias.
// There is no caller-selectable acquisition override.
export const readPreparedCompletionFile = createPreparedCompletionReader({
  acquireReader,
});
