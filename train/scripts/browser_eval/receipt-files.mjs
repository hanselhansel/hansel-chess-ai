// Confined stable-byte receipt reads and retained-input verification for
// the receipt graph owners. Three responsibilities: every parsed record
// is bound to the exact stable bytes the declared inventory ref commits
// to, and every retained input ref is checked against real bytes under
// the workspace inputs/ tree through the shared streaming artifact
// inspector — never by buffering a whole model or output into one
// Buffer. The optional private io binding — exactly {retainActual} — is
// the SAME owner registrar threaded through every raw syscall and real
// handle close; absent keeps the legacy untimed read path with
// identical guards and is never a noop or second ledger. Read-only:
// nothing here writes, signals or upgrades evidence.

import { promises as fsp } from "node:fs";
import path from "node:path";
import { parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { isRelPath } from "./schema-primitives.mjs";
import {
  assertReadEffect,
  confined,
  hashFileRef,
  issueActual,
  openActual,
  storeFail,
} from "./artifact-files.mjs";

const READ_CHUNK = 65536;

const fail = (code, detail) => {
  const error = new Error(`receipt-files ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const sameRef = (a, b) =>
  a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256;

// The optional private io binding is exactly {retainActual}: the same
// owner registrar artifact-files threads through every raw effect and
// real close. Absent keeps the legacy untimed read path; a malformed
// supplied binding fails in the binding's own argument-error style
// before any filesystem operation.
const registrar = (io) => {
  if (io === undefined) return null;
  if (io === null || (typeof io !== "object" && typeof io !== "function")) {
    storeFail("STORE_ARGS", "io");
  }
  if (typeof io.retainActual !== "function") {
    storeFail("STORE_ARGS", "io.retainActual");
  }
  return io.retainActual;
};

// Raw metadata effects pass the real registrar when io is bound; the
// untimed path invokes the same thunk directly with identical guards.
const track = (retain, thunk, io) => {
  assertReadEffect(io);
  return retain === null ? thunk() : issueActual(retain, thunk);
};

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

// Streams the whole record through an explicitly owned bounded
// FileHandle: a raw readFile promise is never real-close evidence, so
// the adopted OwnedFile's actual close must genuinely succeed before
// the bytes are returned. Accumulation is capped by the pinned
// pre-read size — a grown file stops accumulating and the post-read
// stat check fails it — and a rejected close propagates its real
// fault instead of posing as read evidence.
const readOwned = async (retain, abs, size, io) => {
  assertReadEffect(io);
  const handle = await openActual(retain, () => fsp.open(abs, "r"));
  // Fault presence is tracked separately from the fault value so a
  // nullish rejection still counts: the first read failure always wins,
  // then the first close failure.
  let hasReadFault = false;
  let readFault;
  let result;
  try {
    const chunks = [];
    let read = 0;
    const buffer = Buffer.alloc(Math.max(1, Math.min(READ_CHUNK, size)));
    for (;;) {
      assertReadEffect(io);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, read);
      if (bytesRead === 0) break;
      read += bytesRead;
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
      if (read > size) break;
    }
    result = Buffer.concat(chunks);
  } catch (error) {
    hasReadFault = true;
    readFault = error;
  }
  // The genuine OwnedFile close is attempted after every read, failed
  // or not; one bounded retry may settle the real descriptor debt but
  // never clears an earlier operation fault, and a later successful
  // close is not evidence that the first close succeeded.
  let hasCloseFault = false;
  let closeFault;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await handle.close();
      break;
    } catch (error) {
      if (!hasCloseFault) {
        hasCloseFault = true;
        closeFault = error;
      }
    }
  }
  if (hasReadFault) throw readFault;
  if (hasCloseFault) throw closeFault;
  return result;
};

// Confined, symlink-free, stable-byte read: the file identity and size are
// pinned before and after the read so the returned bytes are exactly the
// bytes an inventory hash committed to. With io bound, metadata is a
// registered raw effect and the JSON body is read through an explicitly
// owned bounded FileHandle whose real close is mandatory.
export const confinedRead = async (root, rel, name, io) => {
  const retain = registrar(io);
  if (!isRelPath(rel)) fail("EVIDENCE_INVALID", `${name} path`);
  const { abs } = await evidenceCall(() => confined(root, rel, name, io), name);
  const statAt = (p) =>
    track(retain, () => fsp.lstat(p), io).then(
      (s) => s,
      (error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      },
    );
  const before = await statAt(abs);
  if (before === null) fail("EVIDENCE_INCOMPLETE", `${name} missing`);
  if (!before.isFile() || before.isSymbolicLink()) fail("EVIDENCE_INVALID", `${name} regular`);
  const bytes =
    retain === null ? await fsp.readFile(abs) : await readOwned(retain, abs, before.size, io);
  const after = await track(retain, () => fsp.lstat(abs), io);
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
export const loadRecord = async (root, rel, kind, declared, io) => {
  registrar(io);
  const want = declared === undefined ? undefined : ownRef(declared);
  const bytes = await confinedRead(root, rel, `${kind}.json`, io);
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
export const verifyInputRefs = async (root, inputs, io) => {
  registrar(io);
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
      () => confined(root, want.path, "input", io),
      `input ${want.path}`,
    );
    const observed = await evidenceCall(
      () => hashFileRef(abs, want.path, io),
      `input ${want.path}`,
    );
    if (!sameRef(observed, want)) fail("EVIDENCE_MISMATCH", `input ${want.path}`);
  }
};
