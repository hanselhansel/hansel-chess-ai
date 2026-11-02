// Confined paths, durable atomic file primitives and bounded streaming
// artifact hashing/inventory. Private owner: artifact-store.mjs retains
// queue/reservation/lane/seal ownership and re-exports the read APIs.
// No process, model or browser operation here.

import { createHash, randomBytes } from "node:crypto";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { assertArtifactRef } from "./record-schema.mjs";

const READ_CHUNK = 65536;

export const storeFail = (code, detail, options) => {
  const error = new Error(`artifact-store ${code}: ${detail}`, options);
  error.code = code;
  throw error;
};

export const normRel = (rel, name) => {
  if (typeof rel !== "string" || rel.length === 0) storeFail("STORE_PATH", `${name} empty`);
  if (
    rel.includes("\\") ||
    rel.includes("\0") ||
    rel.startsWith("/") ||
    rel.endsWith("/") ||
    rel.split("/").some((p) => p === "" || p === "." || p === "..")
  ) {
    storeFail("STORE_PATH", `${name} not confined`);
  }
  return rel;
};

// Resolves a confined absolute path and rejects any symlink component
// already present between the workspace root and the target.
export const confined = async (root, rel, name) => {
  const clean = normRel(rel, name);
  const abs = path.resolve(root, clean);
  if (!abs.startsWith(root + path.sep)) storeFail("STORE_PATH", `${name} escapes root`);
  let cursor = root;
  for (const segment of clean.split("/")) {
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = await fsp.lstat(cursor);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink()) storeFail("STORE_PATH", `${name} symlink`);
  }
  return { abs, clean };
};

export const dirSync = async (dir) => {
  try {
    const handle = await fsp.open(dir, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (!["ENOTSUP", "EINVAL", "EISDIR", "EBADF"].includes(error.code)) throw error;
  }
};

export const tempIn = async (dir, base) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = path.join(dir, `.${base}.tmp-${randomBytes(6).toString("hex")}`);
    try {
      await fsp.lstat(candidate);
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

export const writeAtomic = async (abs, bytes) => {
  const dir = path.dirname(abs);
  // Failures are tagged by stage: mkdir/open-of-temp setup rejections stay
  // caller-correctable, while write/sync/rename durability failures are the
  // store's sticky IO fault.
  const tag = (stage) => (error) => {
    error.storeStage = stage;
    throw error;
  };
  await fsp.mkdir(dir, { recursive: true }).catch(tag("setup"));
  const tmp = await tempIn(dir, path.basename(abs));
  const handle = await fsp.open(tmp, "wx").catch(tag("setup"));
  let primary = null;
  try {
    await writeAll(handle, bytes);
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
    await fsp.unlink(tmp).catch(() => {});
    throw primary;
  }
  try {
    await fsp.rename(tmp, abs);
  } catch (error) {
    error.storeStage = "io";
    await fsp.unlink(tmp).catch(() => {});
    throw error;
  }
  await dirSync(dir).catch(tag("io"));
};

// Streams the file in bounded reads, hashing incrementally, and requires the
// observed byte count and file identity to match the pre-read stat. This
// bounds memory and detects concurrent size or inode changes.
export const hashFileRef = async (abs, rel) => {
  const before = await fsp.lstat(abs);
  if (!before.isFile() || before.isSymbolicLink()) {
    storeFail("ARTIFACT_INTEGRITY", `${rel} not regular`);
  }
  const hash = createHash("sha256");
  let read = 0;
  const handle = await fsp.open(abs, "r");
  try {
    const buffer = Buffer.alloc(READ_CHUNK);
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, READ_CHUNK, read);
      if (bytesRead === 0) break;
      read += bytesRead;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    await handle.close();
  }
  const after = await fsp.lstat(abs);
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

export async function inspectArtifactRef({ workspaceRoot, ref }) {
  const root = path.resolve(workspaceRoot);
  assertArtifactRef(ref);
  // Copy the caller-owned ref fields before the first await: later mutation
  // of the input object cannot redirect the confined read or its result.
  const declared = Object.freeze({ ...ref });
  const { abs } = await confined(root, declared.path, "ref.path");
  let stat;
  try {
    stat = await fsp.lstat(abs);
  } catch (error) {
    if (error.code === "ENOENT") storeFail("ARTIFACT_MISSING", declared.path);
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) storeFail("ARTIFACT_INTEGRITY", declared.path);
  const observed = await hashFileRef(abs, declared.path);
  if (observed.byteLength !== declared.byteLength || observed.sha256 !== declared.sha256) {
    storeFail("ARTIFACT_INTEGRITY", `${declared.path} mismatch`);
  }
  return declared;
}

export async function phaseArtifactRefs({ workspaceRoot, phaseDirectory }) {
  const root = path.resolve(workspaceRoot);
  const { abs, clean } = await confined(root, phaseDirectory, "phaseDirectory");
  const stat = await fsp.lstat(abs);
  if (!stat.isDirectory()) storeFail("STORE_PATH", `${clean} not a directory`);
  const completion = `${clean}/completion.json`;
  const refs = [];
  const walk = async (dirAbs, dirRel) => {
    const entries = await fsp.readdir(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      const entryAbs = path.join(dirAbs, entry.name);
      const entryRel = `${dirRel}/${entry.name}`;
      const st = await fsp.lstat(entryAbs);
      if (st.isSymbolicLink()) storeFail("STORE_PATH", `${entryRel} symlink`);
      if (st.isDirectory()) {
        await walk(entryAbs, entryRel);
        continue;
      }
      if (!st.isFile()) storeFail("STORE_PATH", `${entryRel} not regular`);
      if (entryRel === completion) continue;
      refs.push(await hashFileRef(entryAbs, entryRel));
    }
  };
  await walk(abs, clean);
  refs.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return refs.map((r) => Object.freeze(r));
}
