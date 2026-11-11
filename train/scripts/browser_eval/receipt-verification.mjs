// Whole exact-byte receipt-graph verification extracted from
// prerequisites.mjs. The ordinary graph walks fixed
// <phase>/completion.json paths: every parsed record is bound to the
// exact stable bytes its declared inventory ref commits to, the
// COMPLETE actual phase inventory must equal the declared artifacts,
// and the full common identity, check evidence, every retained input
// ref, final/status/exit/prerequisite equality, the nested selftest
// and the whole parent closure are verified — evidence-only
// filesystem verification that issues no Native probe. The narrowly
// branded prepared variant obtains its own bound io/path/bytes
// through readPreparedCompletion, requires the fixed canonical
// target absent, removes exactly the ONE owned temp from the
// complete inventory only after exact path/ref/private {dev,ino}
// identity equality, runs the same full core with its own fresh
// memo, and only then mints a frozen opaque PreparedVerification
// backed by a private WeakMap — consumed exactly once, never
// serialized and never an ordinary VerifiedEvidence. The optional
// private io is the EXACT frozen same-owner {retainActual} forwarded
// unchanged into the receipt and artifact file leaves: absent keeps
// legacy untimed reads, a malformed supplied binding rejects before
// any filesystem operation, and no new ledger, noop or fallback is
// created. This module imports neither the Store nor Prerequisites.

import { privateFs as fsp } from "./private-fs.mjs";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord, assertCommonIdentity } from "./record-schema.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { isCleanupProven } from "./record-finalization.mjs";
import { assertReadEffect, issueActual, phaseArtifactRefs, storeFail } from "./artifact-files.mjs";
import { confinedRead, loadRecord, verifyInputRefs } from "./receipt-files.mjs";
import { verifyReceiptVerdictsV2, verifyReceiptVerdictsV3, selftestOutcome } from "./receipt-verification-v2.mjs";
import { assertBudgetHandle, originalContextBudget } from "./process-budget.mjs";
import { readPreparedCompletion } from "./completion-publication.mjs";

const fail = (code, detail) => {
  const error = new Error(`receipt-verification ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const guardV3 = (identity, context) => {
  if (identity.evaluationPolicy?.policyId !== "tinyaz-separate-verdicts-v3") return;
  const budget = originalContextBudget(context);
  assertBudgetHandle(budget);
  budget.assertLive("V3 receipt graph");
};

const sameRef = (a, b) =>
  a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256;

const isSameFile = (stat, fileId) =>
  stat.isFile() &&
  !stat.isSymbolicLink() &&
  stat.dev === fileId.dev &&
  stat.ino === fileId.ino;

const isToken = (value) =>
  value !== null && (typeof value === "object" || typeof value === "function");

// The optional private io binding is exactly {retainActual}: absent
// keeps the legacy untimed read path, while a malformed supplied
// binding fails in the binding's own argument-error style before any
// filesystem operation.
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

// Registered bigint lstat that reports genuine absence instead of
// rejecting.
const lstatOrNull = async (retain, abs, io) => {
  try {
    assertReadEffect(io);
    return await issueActual(retain, () => fsp.lstat(abs, { bigint: true }));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

// Canonical deep copy of a caller-supplied JSON value: the verifier works
// from owned snapshots so later caller mutation cannot redirect reads,
// weaken declared bindings or alias into frozen results.
const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

export { selftestOutcome } from "./receipt-verification-v2.mjs";

// Merges one verified child's transitive entries into the run closure,
// rejecting two different receipts that claim the same phase.
export const addClosure = (byPhase, closure, entries) => {
  for (const entry of entries) {
    const prior = byPhase.get(entry.phase);
    if (prior && !sameRef(prior.completionRef, entry.completionRef)) {
      fail("EVIDENCE_MISMATCH", `conflicting ${entry.phase} parents`);
    }
    if (!prior) {
      byPhase.set(entry.phase, entry);
      closure.push(entry);
    }
  }
};

// The whole shared full-graph core over already-obtained stable
// completion bytes: fixed phase directory, complete actual inventory,
// record bindings, common identity, check evidence, input refs,
// nested selftest and parent closure. `prepared` is null on the
// ordinary path; on the branded prepared path it carries the exact
// owned {temporaryRef,fileId} the complete inventory must contain as
// its sole extra entry.
const verifyCompletion = async (
  root,
  completionRef,
  bytes,
  expectedIdentity,
  memo,
  io,
  prepared,
  verificationContext,
) => {
  const guard = () => guardV3(expectedIdentity, verificationContext);
  guard();
  const completion = parseCanonicalBytes(bytes);
  assertRecord("completion", completion);
  const phaseDir = path.posix.dirname(completionRef.path);
  const wantDir = completion.phase === "watchdog-selftest" ? "preflight/selftest" : completion.phase;
  if (phaseDir !== wantDir) fail("EVIDENCE_MISMATCH", "phase directory");

  let inventory = await phaseArtifactRefs({ workspaceRoot: root, phaseDirectory: phaseDir }, io, verificationContext);
  if (prepared !== null) {
    // The prepared transaction contributes exactly ONE owned temp to
    // the complete actual inventory: it may be removed only after the
    // path, committed ref and private {dev,ino} bigint identity all
    // equal the branded read. Every other extra, missing or changed
    // file fails the declared-artifact comparison below.
    const index = inventory.findIndex((r) => r.path === prepared.temporaryRef.path);
    if (index === -1) fail("EVIDENCE_INCOMPLETE", "prepared temp");
    if (!sameRef(inventory[index], prepared.temporaryRef)) {
      fail("EVIDENCE_MISMATCH", "prepared temp");
    }
    const tempAbs = path.resolve(root, prepared.temporaryRef.path);
    guard();
    const tempStat = await lstatOrNull(registrar(io), tempAbs, io);
    guard();
    if (tempStat === null || !isSameFile(tempStat, prepared.fileId)) {
      fail("EVIDENCE_MISMATCH", "prepared temp");
    }
    inventory = inventory.filter((_, i) => i !== index);
  }
  if (
    inventory.length !== completion.artifacts.length ||
    inventory.some((ref, i) => !sameRef(ref, completion.artifacts[i]))
  ) {
    fail("EVIDENCE_INCOMPLETE", "artifact inventory");
  }
  guard();
  const byPath = new Map(inventory.map((r) => [r.path, r]));
  const loadBound = (name, kind) => {
    const declared = byPath.get(`${phaseDir}/${name}`);
    if (declared === undefined) fail("EVIDENCE_INCOMPLETE", name);
    guard();
    return loadRecord(root, `${phaseDir}/${name}`, kind, declared, io, verificationContext);
  };
  const manifest = await loadBound("manifest.json", "manifest");
  const running = await loadBound("running.json", "running");
  const final = await loadBound("final.json", "final");
  const workspace = await loadRecord(root, "workspace.json", "workspace", undefined, io, verificationContext);
  await verifyInputRefs(root, manifest.value.inputs, io, verificationContext);
  for (const check of final.value.requiredChecks) {
    for (const r of check.evidence) {
      const declared = byPath.get(r.path);
      if (declared === undefined || !sameRef(declared, r)) {
        fail("EVIDENCE_INCOMPLETE", `check evidence ${r.path}`);
      }
    }
  }

  guard();
  const canonIdentity = canonicalBytes(expectedIdentity);
  if (!canonIdentity.equals(canonicalBytes(workspace.value.commonIdentity))) {
    fail("EVIDENCE_MISMATCH", "commonIdentity");
  }
  const identityHash = sha256Bytes(canonIdentity);
  if (completion.commonIdentitySha256 !== identityHash) {
    fail("EVIDENCE_MISMATCH", "identity hash");
  }
  if (workspace.value.workspaceId !== completion.workspaceId || workspace.value.schemaVersion !== completion.schemaVersion) {
    fail("EVIDENCE_MISMATCH", "workspaceId");
  }
  for (const [rec, name] of [
    [manifest.value, "manifest"],
    [running.value, "running"],
    [final.value, "final"],
  ]) {
    if (
      rec.schemaVersion !== completion.schemaVersion || rec.workspaceId !== completion.workspaceId ||
      rec.runId !== completion.runId ||
      rec.phase !== completion.phase ||
      rec.commonIdentitySha256 !== identityHash
    ) {
      fail("EVIDENCE_MISMATCH", `${name} fields`);
    }
  }
  if (
    final.value.status !== completion.status ||
    final.value.exitCode !== completion.exitCode ||
    !canonicalBytes(manifest.value.prerequisites).equals(canonicalBytes(completion.prerequisites))
  ) {
    fail("EVIDENCE_MISMATCH", "final/prerequisite fields");
  }

  let nested = null;
  if (completion.phase === "preflight") {
    const nestedRef = completion.expectedSelfTest.completion;
    const fixedPath = `${phaseDir}/selftest/completion.json`;
    if (nestedRef.path !== fixedPath) fail("SELFTEST_INVALID", "selftest path");
    const declared = byPath.get(fixedPath);
    if (declared === undefined || !sameRef(declared, nestedRef)) {
      fail("EVIDENCE_INCOMPLETE", "selftest ref");
    }
    nested = await verifyReceiptGraph(
      { workspaceRoot: root, completionRef: nestedRef, expectedIdentity },
      memo,
      io,
      verificationContext,
    );
    const detail = selftestOutcome(nested, completion.runId, running.value.supervisor);
    if (detail !== null) fail("SELFTEST_INVALID", detail);
  }

  const closure = [];
  const byPhase = new Map();
  const parents = [];
  for (const parent of completion.prerequisites) {
    const child = await verifyReceiptGraph(
      {
        workspaceRoot: root,
        completionRef: parent.completion,
        expectedIdentity: workspace.value.commonIdentity,
      },
      memo,
      io,
      verificationContext,
    );
    parents.push(child);
    if (child.phase !== parent.phase || child.runId !== parent.runId) {
      fail("EVIDENCE_MISMATCH", "prerequisite ref");
    }
    addClosure(byPhase, closure, [
      ...child.closure,
      { phase: child.phase, runId: child.runId, completionRef: child.completionRef },
    ]);
  }
  closure.sort((a, b) => (a.phase < b.phase ? -1 : 1));

  const verifyVerdicts = completion.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3"
    ? verifyReceiptVerdictsV3 : verifyReceiptVerdictsV2;
  if (completion.schemaVersion === 2) await verifyVerdicts({
    workspaceRoot: root, workspace: workspace.value, manifest: manifest.value,
    running: running.value, final: final.value, completion, inventory, parents, nested,
  }, io, verificationContext);
  guard();
  const evidence = freezeDeep({
    workspaceId: completion.workspaceId,
    runId: completion.runId,
    phase: completion.phase,
    commonIdentity: workspace.value.commonIdentity,
    completionRef,
    completion,
    final: final.value,
    manifest: manifest.value,
    running: running.value,
    closure,
  });
  memo.set(completionRef.path, evidence);
  return evidence;
};

// Ordinary canonical verification: fixed completion paths are read
// confined and bound to their declared refs, then the shared full
// core runs. Each real graph invocation carries its own fresh memo
// supplied by the caller.
export async function verifyReceiptGraph({ workspaceRoot, completionRef, expectedIdentity }, memo, io, verificationContext) {
  guardV3(expectedIdentity, verificationContext);
  const retain = registrar(io);
  if (expectedIdentity.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3" && retain === null)
    storeFail("STORE_ARGS", "V3 actual graph registrar required");
  const root = path.resolve(workspaceRoot);
  const prior = memo.get(completionRef.path);
  if (prior !== undefined) {
    // A shared ancestor is verified once; a second reference must declare
    // the exact same bytes, never a different receipt under the same path.
    if (!sameRef(prior.completionRef, completionRef)) {
      fail("EVIDENCE_MISMATCH", "shared receipt ref");
    }
    return prior;
  }
  const bytes = await confinedRead(root, completionRef.path, "completion", io, verificationContext);
  guardV3(expectedIdentity, verificationContext);
  if (bytes.length !== completionRef.byteLength || sha256Bytes(bytes) !== completionRef.sha256) {
    fail("EVIDENCE_MISMATCH", "completion ref");
  }
  return verifyCompletion(root, completionRef, bytes, expectedIdentity, memo, io, null, verificationContext);
}

// Identity-keyed private association from each minted
// PreparedVerification token to its pinned execution facts: the exact
// PreparedCompletion identity, projected canonicalRef, actual
// temporaryRef, private {dev,ino} bigint fileId and the owned
// expectedIdentity snapshot. WeakMap keys reject spread copies,
// forged lookalikes and proxies by construction; no token
// constructor, serializer or setter is exported.
const VERIFIED = new WeakMap();

// Genuine prepared-temp full-graph verification. The full
// expectedIdentity is validated and canonically snapshotted
// synchronously BEFORE the first await; the PreparedCompletion is
// read only through its own branded reader, which supplies the bound
// io/path/bytes — never a caller path, ref, ignore list or callback.
// The fixed canonical target must be absent; the same full core then
// runs over the ACTUAL verified bytes with its own fresh memo. Only
// genuine success mints the opaque token.
export async function verifyPreparedReceiptGraph({ preparedCompletion, expectedIdentity }, verificationContext) {
  guardV3(expectedIdentity, verificationContext);
  assertCommonIdentity(expectedIdentity);
  if (!isToken(preparedCompletion)) storeFail("STORE_ARGS", "prepared capability");
  const identity = freezeDeep(copy(expectedIdentity));
  const read = await readPreparedCompletion(preparedCompletion, verificationContext);
  guardV3(expectedIdentity, verificationContext);
  const retain = read.io.retainActual;
  const root = path.resolve(read.workspaceRoot);
  // The fixed canonical target must still be absent: this verifier
  // never publishes and never accepts an occupied target.
  const canonicalAbs = path.resolve(root, read.canonicalRef.path);
  if ((await lstatOrNull(retain, canonicalAbs, read.io)) !== null) {
    storeFail("STORE_EXISTS", read.canonicalRef.path);
  }
  await verifyCompletion(
    root,
    read.canonicalRef,
    read.bytes,
    identity,
    new Map(),
    read.io,
    { temporaryRef: read.temporaryRef, fileId: read.fileId },
    verificationContext,
  );
  guardV3(expectedIdentity, verificationContext);
  const preparedVerification = Object.freeze({});
  VERIFIED.set(preparedVerification, {
    prepared: preparedCompletion,
    workspaceRoot: read.workspaceRoot,
    phaseDirectory: read.phaseDirectory,
    canonicalRef: read.canonicalRef,
    temporaryRef: read.temporaryRef,
    fileId: read.fileId,
    expectedIdentity: identity,
    ...(identity.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3" ? { verificationContext } : {}),
    consumed: false,
  });
  return preparedVerification;
}

// One-shot consumption by the store's publication transaction:
// forged, mismatched or already-consumed tokens reject
// synchronously; success consumes the token exactly once and returns
// the frozen pinned association. The store still rechecks the
// still-owned temp against it and performs its own fresh canonical
// full-graph readback afterward — this token never substitutes for
// that readback.
export function consumePreparedVerification(preparedCompletion, preparedVerification) {
  const entry = VERIFIED.get(preparedVerification);
  if (entry === undefined) storeFail("STORE_ARGS", "prepared verification");
  if (entry.prepared !== preparedCompletion) {
    storeFail("STORE_STATE", "prepared verification pairing");
  }
  if (entry.consumed) storeFail("STORE_STATE", "prepared verification consumed");
  entry.consumed = true;
  return Object.freeze({
    workspaceRoot: entry.workspaceRoot,
    phaseDirectory: entry.phaseDirectory,
    canonicalRef: entry.canonicalRef,
    temporaryRef: entry.temporaryRef,
    fileId: entry.fileId,
    expectedIdentity: entry.expectedIdentity,
    ...(entry.verificationContext ? { verificationContext: entry.verificationContext } : {}),
  });
}
