// Confined paths, durable atomic file primitives and bounded streaming
// artifact hashing/inventory. Private owner: artifact-store.mjs retains
// queue/reservation/lane/seal ownership and re-exports the read APIs.
// The optional private `io` binding — exactly {retainActual} — threads
// the SAME owner registrar through every raw syscall and real handle
// close; absent keeps the legacy untimed path with identical guards and
// is never a noop or second ledger. OwnedFile acquisition and bounded
// physical close settlement are delegated whole to
// artifact-owned-file.mjs, bound once below with the SAME
// issueActual/storeFail. No process, model or browser operation here.

import { assertBudgetHandle, originalContextBudget } from "./process-budget.mjs";
import { createHash, randomBytes } from "node:crypto";
import { privateFs as fsp } from "./private-fs.mjs";
import path from "node:path";
import { assertArtifactRef } from "./record-schema.mjs";
import { isRelPath } from "./schema-primitives.mjs";
import { createOwnedFileOperations } from "./artifact-owned-file.mjs";

const READ_CHUNK = 65536;
const checkVerification = (context) => {
  if (context !== undefined) {
    const budget = originalContextBudget(context);
    assertBudgetHandle(budget);
    budget.assertLive("V3 artifact read");
  }
};

// Verifier-only captured effect fence. Actual descriptor closes are exempt.
export const assertReadEffect = (io) => {
  if (io?.assertEffectLive !== undefined) {
    if (typeof io.assertEffectLive !== "function") storeFail("STORE_ARGS", "io.assertEffectLive");
    io.assertEffectLive();
  }
};

export const storeFail = (code, detail, options) => {
  const error = new Error(`artifact-store ${code}: ${detail}`, options);
  error.code = code;
  throw error;
};

export const normRel = (rel, name) => {
  if (typeof rel !== "string" || rel.length === 0) storeFail("STORE_PATH", `${name} empty`);
  if (!isRelPath(rel)) storeFail("STORE_PATH", `${name} not confined`);
  return rel;
};

// The optional private `io` binding is exactly {retainActual}: one real
// owner registrar threaded through every raw effect below. Absent keeps
// the legacy untimed shape; a malformed supplied registrar fails closed
// rather than silently skipping registration.
const registrar = (io) => {
  if (io === undefined || io === null) return null;
  if (typeof io !== "object" && typeof io !== "function") {
    storeFail("STORE_ARGS", "io");
  }
  if (typeof io.retainActual !== "function") {
    storeFail("STORE_ARGS", "io.retainActual");
  }
  return io.retainActual;
};

// Arms a deferred RAW-effect receipt through the real registrar BEFORE
// the thunk is invoked, then settles that receipt on either observed
// outcome: a fulfilled result or a genuine error both mean the raw
// issuance settled, while the operation's value/error channel stays
// separate. If registration itself throws the thunk never runs, and an
// issued operation that never observably settles is never given
// synthetic fulfillment — no timer-raced wrapper counts as physical.
export const issueActual = (retainActual, issueThunk) => {
  let settle;
  const receipt = new Promise((resolve) => {
    settle = resolve;
  });
  retainActual(receipt);
  let issued;
  try {
    issued = issueThunk();
  } catch (error) {
    settle();
    throw error;
  }
  return Promise.resolve(issued).then(
    (value) => {
      settle();
      return value;
    },
    (error) => {
      settle();
      throw error;
    },
  );
};

// Raw metadata effects pass the real registrar when io is bound; the
// untimed path invokes the same thunk directly with identical guards.
const track = (retain, thunk, io, context) => {
  checkVerification(context);
  assertReadEffect(io);
  const actual = retain === null ? thunk() : issueActual(retain, thunk);
  return context === undefined ? actual : Promise.resolve(actual).then((value) => {
    checkVerification(context);
    return value;
  });
};

// The whole OwnedFile acquisition/close owner lives in
// artifact-owned-file.mjs; it is instantiated ONCE here, after
// issueActual is initialized, with the SAME two trusted functions, and
// the identical returned references are exported under the existing
// names — no facade, resolver or second ledger.
const ownedFileOperations = createOwnedFileOperations({ issueActual, storeFail });
export const openActual = ownedFileOperations.openActual;
export const ownedFileCloseReceipt = ownedFileOperations.ownedFileCloseReceipt;

// Open calls gain the OwnedFile tracked-close wrapper only when bound.
const openTracked = (retain, thunk, io) => {
  assertReadEffect(io);
  return retain === null ? thunk() : openActual(retain, thunk);
};

// Resolves a confined absolute path and rejects any symlink component
// already present between the workspace root and the target.
export const confined = async (root, rel, name, io, context) => {
  checkVerification(context);
  const retain = registrar(io);
  const clean = normRel(rel, name);
  const abs = path.resolve(root, clean);
  if (!abs.startsWith(root + path.sep)) storeFail("STORE_PATH", `${name} escapes root`);
  let cursor = root;
  for (const segment of clean.split("/")) {
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = await track(retain, () => fsp.lstat(cursor), io, context);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink()) storeFail("STORE_PATH", `${name} symlink`);
  }
  return { abs, clean };
};

// The unsupported-directory compatibility covers only the open and
// sync issuance on these filesystems — never an adopted handle's
// close. Every returned handle owes a genuinely observed real close;
// a rejected close propagates its own failure with its retained debt
// and never poses as a clean sync.
export const dirSync = async (dir, io) => {
  const retain = registrar(io);
  let handle;
  let primaryFailed = false;
  let primary;
  try {
    handle = await openTracked(retain, () => fsp.open(dir, "r"), io);
    await handle.sync();
  } catch (error) {
    primaryFailed = true;
    primary = error;
  }
  let closeFailed = false;
  let closeError;
  if (handle !== undefined) {
    try {
      await handle.close();
    } catch (error) {
      closeFailed = true;
      closeError = error;
    }
  }
  if (
    primaryFailed &&
    !["ENOTSUP", "EINVAL", "EISDIR", "EBADF"].includes(primary?.code)
  ) {
    throw primary;
  }
  if (closeFailed) throw closeError;
};

export const tempIn = async (dir, base, io) => {
  const retain = registrar(io);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = path.join(dir, `.${base}.tmp-${randomBytes(6).toString("hex")}`);
    try {
      await track(retain, () => fsp.lstat(candidate), io);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
  storeFail("STORE_IO", "no temp name");
};

// Same-directory write-fsync-rename-dirsync publication. The temp name never
// collides with a tracked artifact and is unlinked on rename failure.
// Exact full-buffer write: short writes are retried until every byte is
// stored; a zero-progress write is an IO failure, never an acknowledged
// partial chunk.
export const writeAll = async (handle, buffer) => {
  let off = 0;
  while (off < buffer.length) {
    const { bytesWritten } = await handle.write(buffer, off);
    if (bytesWritten <= 0) storeFail("STORE_IO", "zero-progress write");
    off += bytesWritten;
  }
};

export const writeAtomic = async (abs, bytes, io) => {
  const retain = registrar(io);
  const dir = path.dirname(abs);
  // Failures are tagged by stage: mkdir/open-of-temp setup rejections stay
  // caller-correctable, while write/sync/rename durability failures are the
  // store's sticky IO fault.
  const tag = (stage) => (error) => {
    error.storeStage = stage;
    throw error;
  };
  // Copy the caller-owned bytes before the first await: later mutation
  // cannot alter what is written.
  const owned = Buffer.from(bytes ?? []);
  await track(retain, () => fsp.mkdir(dir, { recursive: true }), io).catch(tag("setup"));
  const tmp = await tempIn(dir, path.basename(abs), io);
  const handle = await openTracked(retain, () => fsp.open(tmp, "wx"), io).catch(tag("setup"));
  let primary = null;
  try {
    await writeAll(handle, owned);
    await handle.sync();
  } catch (error) {
    primary = error;
  }
  try {
    await handle.close();
  } catch (error) {
    primary ??= error;
  }
  if (primary !== null) {
    primary.storeStage = "io";
    await track(retain, () => fsp.unlink(tmp), io).catch(() => {});
    throw primary;
  }
  try {
    await track(retain, () => fsp.rename(tmp, abs), io);
  } catch (error) {
    error.storeStage = "io";
    await track(retain, () => fsp.unlink(tmp), io).catch(() => {});
    throw error;
  }
  await dirSync(dir, io).catch(tag("io"));
};

// Streams the file in bounded reads, hashing incrementally, and requires the
// observed byte count and file identity to match the pre-read stat. This
// bounds memory and detects concurrent size or inode changes.
export const hashFileRef = async (abs, rel, io, context) => {
  checkVerification(context);
  const retain = registrar(io);
  const before = await track(retain, () => fsp.lstat(abs), io, context);
  if (!before.isFile() || before.isSymbolicLink()) {
    storeFail("ARTIFACT_INTEGRITY", `${rel} not regular`);
  }
  const hash = createHash("sha256");
  let read = 0;
  checkVerification(context);
  const handle = await openTracked(retain, () => fsp.open(abs, "r"), io);
  let readFailed = false, firstReadError;
  try {
    const buffer = Buffer.alloc(READ_CHUNK);
    for (;;) {
      checkVerification(context);
      assertReadEffect(io);
      const { bytesRead } = await handle.read(buffer, 0, READ_CHUNK, read);
      checkVerification(context);
      if (bytesRead === 0) break;
      read += bytesRead;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } catch (error) {
    if (context === undefined) throw error;
    readFailed = true;
    firstReadError = error;
  } finally {
    if (context === undefined) await handle.close();
    else {
      try { await handle.close(); }
      catch (error) { if (!readFailed) { readFailed = true; firstReadError = error; } }
    }
  }
  if (readFailed) throw firstReadError;
  const after = await track(retain, () => fsp.lstat(abs), io, context);
  if (
    read !== before.size ||
    after.size !== before.size ||
    after.ino !== before.ino ||
    after.mtimeMs !== before.mtimeMs
  ) {
    storeFail("ARTIFACT_INTEGRITY", `${rel} changed during read`);
  }
  return { path: rel, byteLength: read, sha256: hash.digest("hex") };
};

export async function inspectArtifactRef({ workspaceRoot, ref }, io) {
  const retain = registrar(io);
  const root = path.resolve(workspaceRoot);
  assertArtifactRef(ref);
  // Copy the caller-owned ref fields before the first await: later mutation
  // of the input object cannot redirect the confined read or its result.
  const declared = Object.freeze({ ...ref });
  const { abs } = await confined(root, declared.path, "ref.path", io);
  let stat;
  try {
    stat = await track(retain, () => fsp.lstat(abs), io);
  } catch (error) {
    if (error.code === "ENOENT") storeFail("ARTIFACT_MISSING", declared.path);
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) storeFail("ARTIFACT_INTEGRITY", declared.path);
  const observed = await hashFileRef(abs, declared.path, io);
  if (observed.byteLength !== declared.byteLength || observed.sha256 !== declared.sha256) {
    storeFail("ARTIFACT_INTEGRITY", `${declared.path} mismatch`);
  }
  return declared;
}

export async function phaseArtifactRefs({ workspaceRoot, phaseDirectory }, io, context) {
  checkVerification(context);
  const retain = registrar(io);
  const root = path.resolve(workspaceRoot);
  const { abs, clean } = await confined(root, phaseDirectory, "phaseDirectory", io, context);
  const stat = await track(retain, () => fsp.lstat(abs), io, context);
  if (!stat.isDirectory()) storeFail("STORE_PATH", `${clean} not a directory`);
  const completion = `${clean}/completion.json`;
  const refs = [];
  const walk = async (dirAbs, dirRel) => {
    const entries = await track(retain, () => fsp.readdir(dirAbs, { withFileTypes: true }), io, context);
    for (const entry of entries) {
      const entryAbs = path.join(dirAbs, entry.name);
      const entryRel = `${dirRel}/${entry.name}`;
      const st = await track(retain, () => fsp.lstat(entryAbs), io, context);
      if (st.isSymbolicLink()) storeFail("STORE_PATH", `${entryRel} symlink`);
      if (st.isDirectory()) {
        await walk(entryAbs, entryRel);
        continue;
      }
      if (!st.isFile()) storeFail("STORE_PATH", `${entryRel} not regular`);
      if (entryRel === completion) continue;
      refs.push(await hashFileRef(entryAbs, entryRel, io, context));
    }
  };
  await walk(abs, clean);
  refs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return refs.map((r) => Object.freeze(r));
}
