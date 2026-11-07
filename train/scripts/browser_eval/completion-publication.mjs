// Owned completion-temp capability and publication owner. A module
// private WeakMap binds each frozen opaque PreparedCompletion to its
// pinned entry: store-owner token, normalized root/phase, fixed
// canonical <phase>/completion.json target, exclusive original temp
// path, {dev,ino} file identity captured from the adopted writer,
// intended bytes/hash, the same io registrar, the {writer,failedReader}
// resource slots and transaction stage. A strong owner+phase map
// retains every capability for pure recovery — including an
// uncontained attempt whose thrown primary error is nonextensible —
// independently of WeakMap key reachability. Raw publish returns
// internally only after the real rename/dirsync — never after store
// accounting, readback or seal — and failed containment preserves
// actual bytes in the EXACT original temp with required sync and fresh
// canonical absence proof through the private observation leaf, which
// also performs the bounded prepared readback under the SAME owned
// slots. No caller io/path/ref override, constructor, plain object
// import, setter, status, queue or safe-exit authority exists here.
// Imports only artifact-files leaves, its observation leaf and the
// canonical hash utility — never receipt-verification or the Store.

import { privateFs as fsp } from "./private-fs.mjs";
import path from "node:path";
import { sha256Bytes } from "./canonical-json.mjs";
import {
  confined,
  dirSync,
  issueActual,
  normRel,
  openActual,
  storeFail as fail,
  tempIn,
  writeAll,
} from "./artifact-files.mjs";
import {
  observeFailedCompletionFile,
  readPreparedCompletionFile,
} from "./completion-file-observation.mjs";

// Frozen empty objects are the unforgeable capabilities: only this
// module's WeakMap associates them with their pinned entry, and no
// property can be added or changed by a caller.
const PREPARED = new WeakMap();

// Strong retention independent of the WeakMap: each store-owner token
// maps its normalized phase directory to the SAME capability, installed
// before preparation's first await. Uncontained attempts stay held
// here — never by error-property reachability or GC timing — so a
// nonextensible primary error cannot lose the owned descriptor.
const RECOVERY = new Map();

const entryOf = (prepared) => {
  const entry = PREPARED.get(prepared);
  if (entry === undefined) fail("STORE_ARGS", "prepared capability");
  return entry;
};

// The store mints the opaque owner token; identity equality — never
// path or field equality — authorizes every mutation.
const ownedBy = (entry, storeOwner) => {
  if (entry.storeOwner !== storeOwner) fail("STORE_STATE", "store owner");
};

const isToken = (value) =>
  value !== null && (typeof value === "object" || typeof value === "function");

const isSameFile = (stat, fileId) =>
  stat.isFile() &&
  !stat.isSymbolicLink() &&
  stat.dev === fileId.dev &&
  stat.ino === fileId.ino;

// Explicit has-primary state on the entry: the FIRST thrown operation
// fault is retained verbatim — including a null, undefined or
// nonextensible value — separate from the arbitrary thrown value
// itself, never overwritten by a later retain/read failure and never
// cleared by a later genuine closure or containment.
const retainPrimary = (entry, fault) => {
  if (!entry.hasPrimary) {
    entry.hasPrimary = true;
    entry.primary = fault;
  }
};

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

// Builds the declared temp through the registered exclusive original
// path, writes the copied intended bytes, fsyncs and genuinely closes
// before the already-pinned entry is marked prepared. The capability,
// its private entry and the owner+phase association are owned from
// BEFORE the first await or filesystem effect, so a pre-capability
// failure runs the same owned containment: genuine close receipts,
// required directory sync, observed temp state and proven canonical
// absence, with actual failed/partial bytes retained in the EXACT
// original temp and the descriptor recoverable through the strong
// association — never a hidden deletion, retried-and-ignored close or
// orphaned unproven state.
export async function prepareCompletionFile({ storeOwner, root, phaseDirectory, bytes, io }) {
  if (!isToken(storeOwner)) fail("STORE_ARGS", "storeOwner");
  if (typeof root !== "string" || root.length === 0) fail("STORE_ARGS", "root");
  if (io === null || io === undefined || typeof io.retainActual !== "function") {
    fail("STORE_ARGS", "io.retainActual");
  }
  const retain = io.retainActual;
  const workspaceRoot = path.resolve(root);
  // Copy the intended canonical bytes synchronously: caller mutation
  // after this point cannot alter what is written or committed.
  const intended = Buffer.from(bytes ?? []);
  // normRel is the SAME pure normalization confined applies to derive
  // its clean path, so the owner+phase key and the fixed canonical
  // target are known before the first await or filesystem effect.
  const phaseClean = normRel(phaseDirectory, "phaseDirectory");
  const phaseAbs = path.resolve(workspaceRoot, phaseClean);
  const canonicalRel = `${phaseClean}/completion.json`;
  const canonicalAbs = path.join(phaseAbs, "completion.json");

  // The private entry, its resource slots and the owner+phase
  // association are pinned BEFORE the first acquisition await, so a
  // pre-capability failure keeps a strongly retained recoverable
  // descriptor instead of orphaned locals.
  const prepared = Object.freeze({});
  const entry = {
    storeOwner,
    workspaceRoot,
    phaseDirectory: phaseClean,
    phaseAbs,
    canonicalRel,
    canonicalAbs,
    tempAbs: null,
    tempRel: null,
    fileId: null,
    byteLength: intended.length,
    sha256: sha256Bytes(intended),
    io,
    stage: "preparing",
    ownedFiles: { writer: null, failedReader: null },
    contained: null,
    hasPrimary: false,
    primary: undefined,
  };
  PREPARED.set(prepared, entry);
  let byPhase = RECOVERY.get(storeOwner);
  if (byPhase === undefined) {
    byPhase = new Map();
    RECOVERY.set(storeOwner, byPhase);
  }
  // An existing owner+phase attempt is never replaced: a duplicate
  // rejects before any filesystem effect or acquisition.
  if (byPhase.has(phaseClean)) fail("STORE_STATE", "duplicate phase attempt");
  byPhase.set(phaseClean, prepared);

  try {
    // Re-walk the confined path for symlink components between root
    // and target; its clean path and absolute result are exactly the
    // normalized values already pinned on the entry.
    await confined(workspaceRoot, phaseDirectory, "phaseDirectory", io);
    await issueActual(retain, () => fsp.mkdir(phaseAbs, { recursive: true }));
    entry.tempAbs = await tempIn(phaseAbs, "completion.json", io);
    entry.tempRel = `${phaseClean}/${path.basename(entry.tempAbs)}`;

    // The adopted writer is pinned on the shared slot before the next
    // await, and the original nonlossy bigint identity is captured
    // FROM that writer — never an lstat guess after an ambiguous
    // failed open.
    entry.ownedFiles.writer = await openActual(retain, () =>
      fsp.open(entry.tempAbs, "wx"),
    );
    const writerStat = await entry.ownedFiles.writer.stat({ bigint: true });
    entry.fileId = { dev: writerStat.dev, ino: writerStat.ino };
    await writeAll(entry.ownedFiles.writer, intended);
    await entry.ownedFiles.writer.sync();
    await entry.ownedFiles.writer.close();
    entry.ownedFiles.writer = null;
    const stat = await issueActual(retain, () =>
      fsp.lstat(entry.tempAbs, { bigint: true }),
    );
    if (
      !isSameFile(stat, entry.fileId) ||
      stat.size !== BigInt(intended.length)
    ) {
      fail("ARTIFACT_INTEGRITY", "prepared temp");
    }
    entry.stage = "prepared";
  } catch (error) {
    // Failure runs the same owned containment through the private
    // observation leaf against the already-pinned entry: outstanding
    // owned handles are genuinely closed by receipt, the required
    // directory sync runs, canonical absence is proven and the exact
    // original temp keeps its actual bytes. Any unproven step leaves
    // the entry strongly retained and uncontained with its primary
    // fault — rejection never proves a safe exit.
    retainPrimary(entry, error);
    if (entry.tempAbs !== null) {
      let contained = null;
      try {
        contained = await observeFailedCompletionFile({
          tempAbs: entry.tempAbs,
          tempRel: entry.tempRel,
          phaseAbs,
          canonicalAbs,
          fileId: entry.fileId,
          maxBytes: entry.byteLength,
          io,
          ownedFiles: entry.ownedFiles,
        });
      } catch {
        // An unproven observation keeps the attempt held.
        contained = null;
      }
      if (contained !== null) {
        entry.contained = contained;
        entry.stage = "contained";
      }
    }
    // The capability rides on the thrown primary error as an optional
    // diagnostic; a nonextensible error still propagates itself while
    // the owner+phase association keeps the attempt recoverable.
    try {
      error.preparedCompletion = prepared;
    } catch {
      // Attachment is a recovery channel, never a containment proof.
    }
    throw error;
  }
  return prepared;
}

// Raw publication: canonical target must be absent and the original
// temp must still be exactly the prepared file, then real rename and
// required directory sync. The stage flips the instant the rename
// lands so a sync failure is contained through the published path,
// never double-renamed. The internal ref is settled by rename/dirsync,
// not by accounting, readback or seal.
export async function publishCompletionFile(prepared, storeOwner) {
  const entry = entryOf(prepared);
  ownedBy(entry, storeOwner);
  if (entry.stage !== "prepared") fail("STORE_STATE", `publish ${entry.stage}`);
  // A latched primary fault sticks: the positive path rethrows the
  // exact first retained value — even null or undefined — rather than
  // minting a fresh token after an earlier fault.
  if (entry.hasPrimary) throw entry.primary;
  const { io } = entry;
  const retain = io.retainActual;

  const canonicalStat = await lstatOrNull(retain, entry.canonicalAbs);
  if (canonicalStat !== null) fail("STORE_EXISTS", entry.canonicalRel);

  const tempStat = await issueActual(retain, () =>
    fsp.lstat(entry.tempAbs, { bigint: true }),
  );
  if (!isSameFile(tempStat, entry.fileId)) {
    fail("STORE_STATE", "prepared temp replaced");
  }

  await issueActual(retain, () => fsp.rename(entry.tempAbs, entry.canonicalAbs));
  entry.stage = "published";
  await dirSync(entry.phaseAbs, io);

  const published = await issueActual(retain, () =>
    fsp.lstat(entry.canonicalAbs, { bigint: true }),
  );
  if (!isSameFile(published, entry.fileId)) {
    fail("ARTIFACT_INTEGRITY", "published identity");
  }
  return Object.freeze({
    path: entry.canonicalRel,
    byteLength: entry.byteLength,
    sha256: entry.sha256,
  });
}

// Preseal failure containment: restores a matching canonical file to
// the EXACT original temp without overwriting another file, preserves
// the actual failed/partial bytes as visible retained evidence, and
// fulfills only after required sync, real close and fresh canonical
// absence are proven by the observation leaf. A missing, replaced or
// unknown-ownership file keeps the transaction unsafe and rejects.
// Idempotent only for the same already-contained capability.
export async function retainFailedCompletion(prepared, storeOwner, cause) {
  const entry = entryOf(prepared);
  ownedBy(entry, storeOwner);
  if (entry.stage === "sealed") fail("STORE_STATE", "sealed publication");
  if (entry.stage === "contained") return entry.contained;
  retainPrimary(entry, cause);
  if (entry.fileId === null) fail("STORE_STATE", "temp identity unknown");
  const { io } = entry;
  const retain = io.retainActual;

  const canonicalStat = await lstatOrNull(retain, entry.canonicalAbs);
  if (canonicalStat !== null) {
    if (!isSameFile(canonicalStat, entry.fileId)) {
      // The canonical path holds an unknown file: it is never deleted
      // or overwritten to manufacture absence.
      fail("STORE_STATE", "canonical ownership unknown");
    }
    const tempStat = await lstatOrNull(retain, entry.tempAbs);
    if (tempStat !== null) fail("STORE_STATE", "temp occupied");
    await issueActual(retain, () => fsp.rename(entry.canonicalAbs, entry.tempAbs));
  }

  // The SAME private observation core finishes containment: genuine
  // close receipts on the shared slots, required dirsync, observed
  // original identity and fresh canonical absence. A lost, replaced or
  // unknown original — or an outstanding handle — rejects and is never
  // contained; the retained entry keeps the primary fault.
  const result = await observeFailedCompletionFile({
    tempAbs: entry.tempAbs,
    tempRel: entry.tempRel,
    phaseAbs: entry.phaseAbs,
    canonicalAbs: entry.canonicalAbs,
    fileId: entry.fileId,
    maxBytes: entry.byteLength,
    io,
    ownedFiles: entry.ownedFiles,
  });
  entry.stage = "contained";
  entry.contained = result;
  return result;
}

// Semantic seal marker applied by the store only after its own
// accounting, fresh readback and phase seal succeed. After it lands,
// no mutation, reclassification or retraction of this capability is
// possible.
export function markPublicationSealed(prepared, storeOwner) {
  const entry = entryOf(prepared);
  ownedBy(entry, storeOwner);
  if (entry.stage !== "published") fail("STORE_STATE", `seal ${entry.stage}`);
  entry.stage = "sealed";
}

// Pure reverse lookup over the SAME owner+phase association installed
// before preparation's first await: an unregistered owner rejects, a
// registered owner missing the normalized phase returns null — never a
// safe/no-creation proof — and a hit returns the SAME opaque
// capability. No IO, constructor, error-property or status setter; the
// genuine Store invokes the private containment core inside its own
// queue rather than awaiting an enqueued public method.
export function recoverPreparedCompletion(storeOwner, phaseDirectory) {
  const byPhase = RECOVERY.get(storeOwner);
  if (byPhase === undefined) fail("STORE_ARGS", "store owner");
  const phaseClean = normRel(phaseDirectory, "phaseDirectory");
  return byPhase.get(phaseClean) ?? null;
}

// Branded temp readback for the private receipt verifier: validates
// the genuine prepared stage, copies the exact private input
// snapshots, then delegates the whole bounded read — pre/post bigint
// identity, exact byte count/hash, armed acquisition latch and
// real-close debt — to the SAME observation leaf through the shared
// {writer,failedReader} slots. The FIRST thrown operation fault is
// retained on this entry — never overwriting an earlier primary —
// and the original error channel is rethrown untouched. The returned
// PreparedRead is frozen metadata with a fresh owned Buffer and
// ref snapshots; canonicalRef is the projected fixed target derived
// from ACTUAL verified temp bytes, never a published receipt or a
// verification token.
export async function readPreparedCompletion(prepared) {
  const entry = entryOf(prepared);
  if (entry.stage !== "prepared") fail("STORE_STATE", `read ${entry.stage}`);
  // A latched primary fault sticks: rethrow the exact first retained
  // value — even null or undefined — before any read delegation.
  if (entry.hasPrimary) throw entry.primary;
  try {
    return await readPreparedCompletionFile({
      workspaceRoot: entry.workspaceRoot,
      phaseDirectory: entry.phaseDirectory,
      canonicalRel: entry.canonicalRel,
      tempAbs: entry.tempAbs,
      tempRel: entry.tempRel,
      fileId: { dev: entry.fileId.dev, ino: entry.fileId.ino },
      byteLength: entry.byteLength,
      sha256: entry.sha256,
      io: entry.io,
      ownedFiles: entry.ownedFiles,
    });
  } catch (error) {
    retainPrimary(entry, error);
    throw error;
  }
}
