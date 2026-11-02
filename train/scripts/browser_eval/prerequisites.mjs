// Completed-receipt verification, fixed phase dependency closure and
// workspace admission. Read-only: it never writes, signals or upgrades
// evidence. Every admission sits behind the mandatory live-identity probe
// and a full CommonIdentity snapshot, never a caller-supplied digest alone.
// The parsed record bytes are the exact stable bytes bound to the declared
// hashes; retained input and check-evidence refs are verified against the
// same inventory and the nested selftest receipt is admitted semantically.
// Confined byte/ref IO lives in receipt-files.mjs.

import { promises as fsp } from "node:fs";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import {
  assertRecord,
  assertArtifactRef,
  assertProcessIdentity,
  assertCommonIdentity,
  REQUIRED_PARENT_PHASES,
} from "./record-schema.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { isCleanupProven } from "./record-finalization.mjs";
import { phaseArtifactRefs } from "./artifact-store.mjs";
import { confinedRead, loadRecord, verifyInputRefs } from "./receipt-files.mjs";

const PHASES = ["check", "parity", "preflight", "compare"];

const fail = (code, detail) => {
  const error = new Error(`prerequisites ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const sameRef = (a, b) =>
  a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256;

const probe = async (probeIdentity, identity) => {
  if (typeof probeIdentity !== "function") fail("PROBE_UNAVAILABLE", "probe missing");
  let result;
  try {
    result = await probeIdentity(identity);
  } catch {
    fail("PROBE_UNAVAILABLE", "probe threw");
  }
  if (result === "same-live" || result === "gone") return result;
  fail("PROBE_UNAVAILABLE", "probe result");
};

// The exact internal selftest owner/outcome/cleanup binding shared by the
// nested admission inside verifyReceipt and the public live-verification
// API. Returns a failure detail or null.
const selftestOutcome = (ev, parentRunId, parentSupervisor) => {
  const owner = ev.manifest.owner;
  if (
    owner === null ||
    owner.phase !== "preflight" ||
    owner.runId !== parentRunId ||
    !canonicalBytes(owner.supervisor).equals(canonicalBytes(parentSupervisor))
  ) {
    return "owner";
  }
  const f = ev.final;
  if (
    f.status !== "inconclusive" ||
    f.exitCode !== 2 ||
    f.stopReason !== "HEARTBEAT_TIMEOUT" ||
    f.analysisEligible !== false ||
    f.unplannedFaultCount !== 0 ||
    f.summary.scoredGames !== 0 ||
    !f.requiredChecks.every((x) => x.status === "passed")
  ) {
    return "outcome";
  }
  if (!isCleanupProven(f.cleanup, "selftest-workload", parentSupervisor)) {
    return "cleanup";
  }
  return null;
};

// Merges one verified child's transitive entries into the run closure,
// rejecting two different receipts that claim the same phase.
const addClosure = (byPhase, closure, entries) => {
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

// Canonical deep copy of a caller-supplied JSON value: the verifier works
// from owned snapshots so later caller mutation cannot redirect reads,
// weaken declared bindings or alias into frozen results.
const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

export async function verifyReceipt({ workspaceRoot, completionRef, expectedIdentity }) {
  assertArtifactRef(completionRef);
  assertCommonIdentity(expectedIdentity);
  const ref = copy(completionRef);
  const identity = copy(expectedIdentity);
  return verifyReceiptInner(
    { workspaceRoot, completionRef: ref, expectedIdentity: identity },
    new Map(),
  );
}

const verifyReceiptInner = async ({ workspaceRoot, completionRef, expectedIdentity }, memo) => {
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
  const bytes = await confinedRead(root, completionRef.path, "completion");
  if (bytes.length !== completionRef.byteLength || sha256Bytes(bytes) !== completionRef.sha256) {
    fail("EVIDENCE_MISMATCH", "completion ref");
  }
  const completion = parseCanonicalBytes(bytes);
  assertRecord("completion", completion);
  const phaseDir = path.posix.dirname(completionRef.path);
  const wantDir = completion.phase === "watchdog-selftest" ? "preflight/selftest" : completion.phase;
  if (phaseDir !== wantDir) fail("EVIDENCE_MISMATCH", "phase directory");

  const inventory = await phaseArtifactRefs({ workspaceRoot: root, phaseDirectory: phaseDir });
  if (
    inventory.length !== completion.artifacts.length ||
    inventory.some((ref, i) => !sameRef(ref, completion.artifacts[i]))
  ) {
    fail("EVIDENCE_INCOMPLETE", "artifact inventory");
  }
  const byPath = new Map(inventory.map((r) => [r.path, r]));
  const loadBound = (name, kind) => {
    const declared = byPath.get(`${phaseDir}/${name}`);
    if (declared === undefined) fail("EVIDENCE_INCOMPLETE", name);
    return loadRecord(root, `${phaseDir}/${name}`, kind, declared);
  };
  const manifest = await loadBound("manifest.json", "manifest");
  const running = await loadBound("running.json", "running");
  const final = await loadBound("final.json", "final");
  const workspace = await loadRecord(root, "workspace.json", "workspace");
  await verifyInputRefs(root, manifest.value.inputs);
  for (const check of final.value.requiredChecks) {
    for (const r of check.evidence) {
      const declared = byPath.get(r.path);
      if (declared === undefined || !sameRef(declared, r)) {
        fail("EVIDENCE_INCOMPLETE", `check evidence ${r.path}`);
      }
    }
  }

  const canonIdentity = canonicalBytes(expectedIdentity);
  if (!canonIdentity.equals(canonicalBytes(workspace.value.commonIdentity))) {
    fail("EVIDENCE_MISMATCH", "commonIdentity");
  }
  const identityHash = sha256Bytes(canonIdentity);
  if (completion.commonIdentitySha256 !== identityHash) {
    fail("EVIDENCE_MISMATCH", "identity hash");
  }
  if (workspace.value.workspaceId !== completion.workspaceId) {
    fail("EVIDENCE_MISMATCH", "workspaceId");
  }
  for (const [rec, name] of [
    [manifest.value, "manifest"],
    [running.value, "running"],
    [final.value, "final"],
  ]) {
    if (
      rec.workspaceId !== completion.workspaceId ||
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

  if (completion.phase === "preflight") {
    const nestedRef = completion.expectedSelfTest.completion;
    const fixedPath = `${phaseDir}/selftest/completion.json`;
    if (nestedRef.path !== fixedPath) fail("SELFTEST_INVALID", "selftest path");
    const declared = byPath.get(fixedPath);
    if (declared === undefined || !sameRef(declared, nestedRef)) {
      fail("EVIDENCE_INCOMPLETE", "selftest ref");
    }
    const nested = await verifyReceiptInner(
      { workspaceRoot: root, completionRef: nestedRef, expectedIdentity },
      memo,
    );
    const detail = selftestOutcome(nested, completion.runId, running.value.supervisor);
    if (detail !== null) fail("SELFTEST_INVALID", detail);
  }

  const closure = [];
  const byPhase = new Map();
  for (const parent of completion.prerequisites) {
    const child = await verifyReceiptInner(
      {
        workspaceRoot: root,
        completionRef: parent.completion,
        expectedIdentity: workspace.value.commonIdentity,
      },
      memo,
    );
    if (child.phase !== parent.phase || child.runId !== parent.runId) {
      fail("EVIDENCE_MISMATCH", "prerequisite ref");
    }
    addClosure(byPhase, closure, [
      ...child.closure,
      { phase: child.phase, runId: child.runId, completionRef: child.completionRef },
    ]);
  }
  closure.sort((a, b) => (a.phase < b.phase ? -1 : 1));

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

const requirePassedParent = async (ev, probeIdentity) => {
  const f = ev.final;
  const pass =
    f.status === "passed" &&
    f.exitCode === 0 &&
    f.unplannedFaultCount === 0 &&
    f.requiredChecks.every((x) => x.status === "passed") &&
    isCleanupProven(f.cleanup, "phase-workload", ev.running.supervisor);
  if (!pass) fail("PREREQUISITE_INVALID", `${ev.phase} not passed`);
  if ((await probe(probeIdentity, ev.running.supervisor)) !== "gone") {
    fail("FINALIZER_LIVE", `${ev.phase} finalizer`);
  }
};

export async function admitPhase({ workspaceRoot, phase, commonIdentity, parents, probeIdentity }) {
  const root = path.resolve(workspaceRoot);
  if (!PHASES.includes(phase)) fail("PREREQUISITE_INVALID", "phase");
  if (!Array.isArray(parents)) fail("PREREQUISITE_INVALID", "parents");
  // Validate then snapshot every caller input synchronously, before the
  // first await: later mutation cannot rewrite declared refs or the
  // expected identity.
  const ownParents = parents.map((ref) => {
    assertArtifactRef(ref);
    return copy(ref);
  });
  assertCommonIdentity(commonIdentity);
  const ownIdentity = copy(commonIdentity);
  if (
    (phase === "preflight" || phase === "compare") &&
    ownIdentity.candidate.kind === "WORKTREE"
  ) {
    fail("WORKTREE_REJECTED", `${phase} WORKTREE self`);
  }
  const memo = new Map();
  const verified = [];
  for (const ref of ownParents) {
    verified.push(
      await verifyReceiptInner(
        { workspaceRoot: root, completionRef: ref, expectedIdentity: ownIdentity },
        memo,
      ),
    );
  }
  const required = REQUIRED_PARENT_PHASES[phase];
  if (
    verified.length !== required.length ||
    !required.every((p) => verified.some((ev) => ev.phase === p))
  ) {
    fail("PREREQUISITE_INVALID", "parent set");
  }
  const admitted = [];
  const byPhase = new Map();
  for (const ev of verified) {
    await requirePassedParent(ev, probeIdentity);
    admitted.push({ phase: ev.phase, runId: ev.runId, completion: ev.completionRef });
    addClosure(byPhase, [], [
      ...ev.closure,
      { phase: ev.phase, runId: ev.runId, completionRef: ev.completionRef },
    ]);
  }
  admitted.sort((a, b) => required.indexOf(a.phase) - required.indexOf(b.phase));
  const closure = [...byPhase.values()].sort((a, b) => (a.phase < b.phase ? -1 : 1));
  return freezeDeep({
    phase,
    commonIdentitySha256: sha256Bytes(canonicalBytes(ownIdentity)),
    parents: admitted,
    closure,
  });
}

export async function verifyInternalSelfTest({
  workspaceRoot,
  completionRef,
  parentRunId,
  parentSupervisor,
  expectedIdentity,
  probeIdentity,
}) {
  const root = path.resolve(workspaceRoot);
  if (typeof parentRunId !== "string" || parentRunId.length === 0) {
    fail("SELFTEST_INVALID", "parentRunId");
  }
  assertArtifactRef(completionRef);
  assertCommonIdentity(expectedIdentity);
  assertProcessIdentity(parentSupervisor);
  const ref = copy(completionRef);
  const identity = copy(expectedIdentity);
  const supervisor = copy(parentSupervisor);
  const ev = await verifyReceiptInner(
    { workspaceRoot: root, completionRef: ref, expectedIdentity: identity },
    new Map(),
  );
  const bad = (detail) => fail("SELFTEST_INVALID", detail);
  if (ev.phase !== "watchdog-selftest") bad("phase");
  const detail = selftestOutcome(ev, parentRunId, supervisor);
  if (detail !== null) bad(detail);
  const parentLive = await probe(probeIdentity, supervisor);
  if (parentLive !== "same-live") bad("parent not live");
  return freezeDeep({
    runId: ev.runId,
    completionRef: ref,
    parentRunId,
    parentSupervisor: supervisor,
  });
}

export async function inspectIncompletePhase({ workspaceRoot, phaseDirectory, probeIdentity }) {
  const root = path.resolve(workspaceRoot);
  if (typeof phaseDirectory !== "string" || phaseDirectory.length === 0) {
    fail("DISPOSITION_INVALID", "phaseDirectory");
  }
  const completionPath = `${phaseDirectory}/completion.json`;
  let running = null;
  try {
    running = (await loadRecord(root, `${phaseDirectory}/running.json`, "running")).value;
  } catch {
    running = null;
  }
  const completionExists = await fsp
    .lstat(path.resolve(root, completionPath))
    .then(() => true, () => false);
  if (completionExists) {
    const bytes = await confinedRead(root, completionPath, "completion");
    return freezeDeep({
      state: "complete",
      running,
      completionRef: Object.freeze({
        path: completionPath,
        byteLength: bytes.length,
        sha256: sha256Bytes(bytes),
      }),
    });
  }
  if (running === null) {
    return freezeDeep({ state: "unproven", running: null, completionRef: null });
  }
  let outcome;
  try {
    outcome = await probe(probeIdentity, running.supervisor);
  } catch {
    outcome = "unproven";
  }
  const state = outcome === "same-live" ? "in-use" : outcome === "gone" ? "abandoned" : "unproven";
  return freezeDeep({ state, running, completionRef: null });
}
