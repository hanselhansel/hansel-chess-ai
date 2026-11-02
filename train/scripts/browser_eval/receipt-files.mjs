// Confined stable-byte receipt reads and retained-input verification for
// prerequisites.mjs, its sole production consumer. Three responsibilities:
// every parsed record is bound to the exact stable bytes the declared
// inventory ref commits to, and every retained input ref is checked against
// real bytes under the workspace inputs/ tree through the shared streaming
// artifact inspector — never by buffering a whole model or output into one
// Buffer. Read-only: nothing here writes, signals or upgrades evidence.

import { promises as fsp } from "node:fs";
import path from "node:path";
import { parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { isRelPath } from "./schema-primitives.mjs";
import { confined, hashFileRef } from "./artifact-files.mjs";

const fail = (code, detail) => {
  const error = new Error(`receipt-files ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const sameRef = (a, b) =>
  a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256;

// Translates the shared artifact-file primitives' bounded codes into the
// receipt layer's evidence codes; anything else propagates unchanged.
const evidenceCall = async (fn, name) => {
  try {
    return await fn();
  } catch (error) {
    if (error.code === "ENOENT") fail("EVIDENCE_INCOMPLETE", `${name} missing`);
    if (error.code === "STORE_PATH") fail("EVIDENCE_INVALID", `${name} path`);
    if (error.code === "ARTIFACT_INTEGRITY") fail("EVIDENCE_MISMATCH", `${name} changed`);
    throw error;
  }
};

// Confined, symlink-free, stable-byte read: the file identity and size are
// pinned before and after the read so the returned bytes are exactly the
// bytes an inventory hash committed to.
export const confinedRead = async (root, rel, name) => {
  if (!isRelPath(rel)) fail("EVIDENCE_INVALID", `${name} path`);
  const { abs } = await evidenceCall(() => confined(root, rel, name), name);
  const statAt = (p) =>
    fsp.lstat(p).then(
      (s) => s,
      (error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      },
    );
  const before = await statAt(abs);
  if (before === null) fail("EVIDENCE_INCOMPLETE", `${name} missing`);
  if (!before.isFile() || before.isSymbolicLink()) fail("EVIDENCE_INVALID", `${name} regular`);
  const bytes = await fsp.readFile(abs);
  const after = await fsp.lstat(abs);
  if (
    bytes.length !== before.size ||
    after.size !== before.size ||
    after.ino !== before.ino ||
    after.mtimeMs !== before.mtimeMs
  ) {
    fail("EVIDENCE_MISMATCH", `${name} changed`);
  }
  return bytes;
};

// Snapshot a caller-supplied ref into a fresh owned frozen triple before
// any IO: later mutation of the caller's object cannot redirect or
// weaken the binding.
const ownRef = (declared) =>
  Object.freeze({
    path: `${declared.path}`,
    byteLength: declared.byteLength,
    sha256: declared.sha256,
  });

// Loads a record and, when a declared inventory ref is supplied, requires
// the parsed bytes to be exactly those committed by that ref. The same
// stable bytes feed the hash check and the canonical parse.
export const loadRecord = async (root, rel, kind, declared) => {
  const want = declared === undefined ? undefined : ownRef(declared);
  const bytes = await confinedRead(root, rel, `${kind}.json`);
  const ref = { path: rel, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
  if (want !== undefined && !sameRef(want, ref)) {
    fail("EVIDENCE_MISMATCH", `${kind} ref`);
  }
  const value = parseCanonicalBytes(bytes);
  assertRecord(kind, value);
  return { value, ref };
};

// Verifies each already-declared retained input ref: the actual bytes must
// exist outside the phase under the workspace inputs/ tree and equal the
// declared ref exactly. Every declared ref is snapshotted up front, before
// the first read, so later caller mutation cannot rewrite an expectation.
// Binary inputs stream through the shared stable artifact inspector;
// nothing buffers a whole input into one Buffer.
export const verifyInputRefs = async (root, inputs) => {
  const wants = [
    ...inputs.baseline.files,
    ...inputs.candidate.files,
    ...inputs.harness.files,
    ...inputs.setup,
    inputs.model,
  ].map(ownRef);
  for (const want of wants) {
    if (!want.path.startsWith("inputs/")) {
      fail("EVIDENCE_INVALID", `input ${want.path}`);
    }
    const { abs } = await evidenceCall(
      () => confined(root, want.path, "input"),
      `input ${want.path}`,
    );
    const observed = await evidenceCall(
      () => hashFileRef(abs, want.path),
      `input ${want.path}`,
    );
    if (!sameRef(observed, want)) fail("EVIDENCE_MISMATCH", `input ${want.path}`);
  }
};
