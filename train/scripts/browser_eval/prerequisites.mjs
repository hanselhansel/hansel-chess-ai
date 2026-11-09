// Completed-receipt verification, fixed phase dependency closure and
// workspace admission. Read-only: it never writes, signals or upgrades
// evidence. Every admission sits behind the mandatory live-identity probe
// and a full CommonIdentity snapshot, never a caller-supplied digest alone.
// The whole exact-byte receipt-graph core — inventory, record binding,
// identity, check/input/selftest and closure verification — delegates to
// receipt-verification.mjs; confined byte/ref IO lives in
// receipt-files.mjs. The optional private io is the EXACT frozen
// same-owner {retainActual} forwarded unchanged through the graph and
// the direct incomplete-phase filesystem calls: absent keeps legacy
// untimed reads, a malformed supplied binding rejects before any
// filesystem operation, and no new ledger, noop or fallback is created.

import { privateFs as fsp } from "./private-fs.mjs";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import {
  assertArtifactRef,
  assertProcessIdentity,
  assertCommonIdentity,
  REQUIRED_PARENT_PHASES,
} from "./record-schema.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { isCleanupProven } from "./record-finalization.mjs";
import { issueActual, storeFail } from "./artifact-files.mjs";
import {
  verifyReceiptGraph,
  selftestOutcome,
  addClosure,
} from "./receipt-verification.mjs";
import { confinedRead, loadRecord } from "./receipt-files.mjs";

const PHASES = ["check", "parity", "preflight", "compare"];

const fail = (code, detail) => {
  const error = new Error(`prerequisites ${code}: ${detail}`);
  error.code = code;
  throw error;
};

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
const track = (retain, thunk) =>
  retain === null ? thunk() : issueActual(retain, thunk);

// Canonical deep copy of a caller-supplied JSON value: the verifier works
// from owned snapshots so later caller mutation cannot redirect reads,
// weaken declared bindings or alias into frozen results.
const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

export async function verifyReceipt({ workspaceRoot, completionRef, expectedIdentity }, io) {
  registrar(io);
  assertArtifactRef(completionRef);
  assertCommonIdentity(expectedIdentity);
  const ref = copy(completionRef);
  const identity = copy(expectedIdentity);
  return verifyReceiptGraph(
    { workspaceRoot, completionRef: ref, expectedIdentity: identity },
    new Map(),
    io,
  );
}

const requirePassedParent = async (ev, probeIdentity) => {
  const f = ev.final;
  const pass =
    f.status === "passed" &&
    f.exitCode === 0 &&
    (f.schemaVersion !== 2 || (f.resourceVerdict.status === "passed" &&
      f.closureResourceVerdict.status === "passed")) &&
    f.unplannedFaultCount === 0 &&
    f.requiredChecks.every((x) => x.status === "passed") &&
    isCleanupProven(f.cleanup, "phase-workload", ev.running.supervisor);
  if (!pass) fail("PREREQUISITE_INVALID", `${ev.phase} not passed`);
  if ((await probe(probeIdentity, ev.running.supervisor)) !== "gone") {
    fail("FINALIZER_LIVE", `${ev.phase} finalizer`);
  }
};

export async function admitPhase({ workspaceRoot, phase, commonIdentity, parents, probeIdentity }, io) {
  registrar(io);
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
      await verifyReceiptGraph(
        { workspaceRoot: root, completionRef: ref, expectedIdentity: ownIdentity },
        memo,
        io,
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
}, io) {
  registrar(io);
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
  const ev = await verifyReceiptGraph(
    { workspaceRoot: root, completionRef: ref, expectedIdentity: identity },
    new Map(),
    io,
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

export async function inspectIncompletePhase({ workspaceRoot, phaseDirectory, probeIdentity }, io) {
  const retain = registrar(io);
  const root = path.resolve(workspaceRoot);
  if (typeof phaseDirectory !== "string" || phaseDirectory.length === 0) {
    fail("DISPOSITION_INVALID", "phaseDirectory");
  }
  const completionPath = `${phaseDirectory}/completion.json`;
  let running = null;
  try {
    running = (await loadRecord(root, `${phaseDirectory}/running.json`, "running", undefined, io)).value;
  } catch {
    running = null;
  }
  const completionExists = await track(retain, () =>
    fsp.lstat(path.resolve(root, completionPath)),
  ).then(
    () => true,
    () => false,
  );
  if (completionExists) {
    const bytes = await confinedRead(root, completionPath, "completion", io);
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
