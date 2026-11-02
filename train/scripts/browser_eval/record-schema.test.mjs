// Exact envelope/type/check-set cross-field cases: every record/phase/
// status literal, closed fields, Hash64/uint64/native-Pid bounds, common
// and environment shapes, required-check sets and coherence combinations.
// Fixtures are synthetic; a passing assertion is never evidence that real
// packages or tools were inspected.

import assert from "node:assert/strict";
import test from "node:test";
import {
  assertArtifactRef,
  assertBackendIdentity,
  assertCommonIdentity,
  assertProcessIdentity,
  assertRecord,
  BASELINE_COMMIT,
  FIXED_LIMITS,
  MODEL_IDENTITY,
  PROTOCOL_IDS,
  REQUIRED_CHECK_IDS,
  REQUIRED_PARENT_PHASES,
} from "./record-schema.mjs";
import {
  copy,
  fixtureCommonIdentity,
  fixtureManifest,
  fixtureRunning,
  fixtureWorkspace,
  identity,
  proof,
  ref,
} from "./test-fixtures.mjs";

const fails = (fn, code) => assert.throws(fn, (e) => e.code === code);

test("frozen declarations hold exact pinned values", () => {
  assert.equal(BASELINE_COMMIT, "bb76439ea7bb4ae84bf15fe1276d75dc336d3cec");
  assert.equal(MODEL_IDENTITY.sha256, "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee");
  assert.equal(FIXED_LIMITS.ipc.chunkBytes, 65536);
  assert.equal(FIXED_LIMITS.timing.cleanupMs, 5000);
  assert.equal(FIXED_LIMITS.timing.phaseMs.compare, 3600000);
  assert.deepEqual(REQUIRED_PARENT_PHASES.compare, ["check", "parity", "preflight"]);
  assert.equal(REQUIRED_CHECK_IDS["watchdog-selftest"].length, 4);
  assert.equal(PROTOCOL_IDS.visitId, "completed-root64-v1");
  assert.throws(() => {
    FIXED_LIMITS.ipc.chunkBytes = 1;
  }, TypeError);
});

test("artifact refs require closed shape and primitive-typed bounds", () => {
  assert.doesNotThrow(() => assertArtifactRef(ref("a/b", 3, 9)));
  fails(() => assertArtifactRef({ path: "a/b", byteLength: 3 }), "SCHEMA_MISSING");
  fails(() => assertArtifactRef({ path: "a/b", byteLength: 3, sha256: "0".repeat(64), x: 1 }), "SCHEMA_EXTRA");
  fails(() => assertArtifactRef({ path: "/a", byteLength: 1, sha256: "0".repeat(64) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a/../b", byteLength: 1, sha256: "0".repeat(64) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a\\b", byteLength: 1, sha256: "0".repeat(64) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a", byteLength: -1, sha256: "0".repeat(64) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a", byteLength: 1.5, sha256: "0".repeat(64) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a", byteLength: 1, sha256: "0".repeat(63) }), "SCHEMA_FORMAT");
  fails(() => assertArtifactRef({ path: "a", byteLength: 1, sha256: 0 }), "SCHEMA_FORMAT");
});

test("process identity enforces native pid bounds and U64 strings", () => {
  assert.doesNotThrow(() => assertProcessIdentity(identity()));
  fails(() => assertProcessIdentity({ pid: 0, startSec: "1", startUsec: 0 }), "SCHEMA_FORMAT");
  fails(() => assertProcessIdentity({ pid: 2147483648, startSec: "1", startUsec: 0 }), "SCHEMA_FORMAT");
  fails(() => assertProcessIdentity({ pid: 1.5, startSec: "1", startUsec: 0 }), "SCHEMA_FORMAT");
  fails(() => assertProcessIdentity({ pid: 1, startSec: 5, startUsec: 0 }), "SCHEMA_FORMAT");
  fails(() => assertProcessIdentity({ pid: 1, startSec: "01", startUsec: 0 }), "SCHEMA_FORMAT");
  fails(() => assertProcessIdentity({ pid: 1, startSec: "18446744073709551616", startUsec: 0 }), "SCHEMA_FORMAT");
  assert.doesNotThrow(() => assertProcessIdentity({ pid: 1, startSec: "18446744073709551615", startUsec: 999999 }));
  fails(() => assertProcessIdentity({ pid: 1, startSec: "1", startUsec: 1000000 }), "SCHEMA_FORMAT");
});

test("common identity fixture validates; mutations reject", () => {
  const ci = fixtureCommonIdentity();
  assert.doesNotThrow(() => assertCommonIdentity(ci));
  fails(() => assertCommonIdentity({ ...ci, extra: 1 }), "SCHEMA_EXTRA");
  const worktree = fixtureCommonIdentity({ candidateKind: "WORKTREE" });
  assert.doesNotThrow(() => assertCommonIdentity(worktree));
  const badCommit = copy(ci);
  badCommit.candidate.commit = "zz";
  fails(() => assertCommonIdentity(badCommit), "SCHEMA_LITERAL");
  const badBaseline = copy(ci);
  badBaseline.baseline.commit = "0".repeat(40);
  fails(() => assertCommonIdentity(badBaseline), "SCHEMA_LITERAL");
  const badModel = copy(ci);
  badModel.model.byteLength += 1;
  fails(() => assertCommonIdentity(badModel), "SCHEMA_LITERAL");
  const badFixturePath = copy(ci);
  badFixturePath.fixtures.parity.path = "train/fixtures/other.json";
  fails(() => assertCommonIdentity(badFixturePath), "SCHEMA_LITERAL");
  const badPyFiles = copy(ci);
  // `__other__.py` sorts first among the module paths, so the list stays
  // ordered and the mutation reaches the exact module-set literal.
  badPyFiles.pythonReference.files[0].path = "train/src/tinyaz/__other__.py";
  fails(() => assertCommonIdentity(badPyFiles), "SCHEMA_LITERAL");
  // A correctly sorted extra module still fails the exact module-set
  // literal: the mutation reaches the set guard, not the order guard.
  const extraPy = copy(ci);
  extraPy.pythonReference.files = [
    ...extraPy.pythonReference.files,
    ref("train/src/tinyaz/__other__.py", 10, 190),
  ].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  fails(() => assertCommonIdentity(extraPy), "SCHEMA_LITERAL");
  const badNorm = copy(ci);
  badNorm.baselineNormalization.provenance = "other";
  fails(() => assertCommonIdentity(badNorm), "SCHEMA_LITERAL");
  const badOs = copy(ci);
  badOs.environment.os.platform = "linux";
  fails(() => assertCommonIdentity(badOs), "SCHEMA_LITERAL");
  const driftMon = copy(ci);
  driftMon.environment.monitoring.os = { ...driftMon.environment.monitoring.os, build: "other" };
  fails(() => assertCommonIdentity(driftMon), "SCHEMA_COHERENCE");
  const driftPy = copy(ci);
  // The selected-version pin rejects a wrong CPython version before any
  // environment coherence comparison: this is a SCHEMA_LITERAL case.
  driftPy.environment.monitoring.python = { ...ci.environment.python.runtime, version: "9" };
  fails(() => assertCommonIdentity(driftPy), "SCHEMA_LITERAL");
  const torchNull = copy(ci);
  const t = torchNull.environment.python.distributions.find((d) => d.name === "torch");
  t.wheelSha256 = null;
  fails(() => assertCommonIdentity(torchNull), "SCHEMA_COHERENCE");
  const unsorted = copy(ci);
  unsorted.environment.python.distributions.reverse();
  fails(() => assertCommonIdentity(unsorted), "SCHEMA_ORDER");
  const badViewport = copy(ci);
  badViewport.environment.launch.viewport.width = 640;
  fails(() => assertCommonIdentity(badViewport), "SCHEMA_LITERAL");
});

test("backend identity pins the libproc ABI and lsof path", () => {
  const backend = fixtureCommonIdentity().environment.monitoring;
  assert.doesNotThrow(() => assertBackendIdentity(backend));
  const abi = copy(backend);
  abi.libproc.abi.bsdInfoSize = 135;
  fails(() => assertBackendIdentity(abi), "SCHEMA_LITERAL");
  const lsof = copy(backend);
  lsof.lsof.invocationPath = "/tmp/lsof";
  fails(() => assertBackendIdentity(lsof), "SCHEMA_LITERAL");
  const image = copy(backend);
  image.libproc.image = { kind: "file", sha256: "0".repeat(64) };
  assert.doesNotThrow(() => assertBackendIdentity(image));
  image.libproc.image = { kind: "file" };
  fails(() => assertBackendIdentity(image), "SCHEMA_MISSING");
});

test("array fields must be arrays, never plain objects", () => {
  const ci = fixtureCommonIdentity();
  const badFiles = copy(ci);
  badFiles.harness.files = { 0: badFiles.harness.files[0] };
  fails(() => assertCommonIdentity(badFiles), "SCHEMA_FORMAT");
  const badHelpers = copy(ci);
  badHelpers.environment.monitoring.helpers = { 0: badHelpers.environment.monitoring.helpers[0] };
  fails(() => assertCommonIdentity(badHelpers), "SCHEMA_FORMAT");
  const badImports = copy(ci);
  badImports.environment.python.imports = { 0: badImports.environment.python.imports[0] };
  fails(() => assertCommonIdentity(badImports), "SCHEMA_FORMAT");
  const badDists = copy(ci);
  badDists.environment.python.distributions = { 0: badDists.environment.python.distributions[0] };
  fails(() => assertCommonIdentity(badDists), "SCHEMA_FORMAT");
});

test("the selected python pins the venv executable and CPython 3.11.14", () => {
  const ci = fixtureCommonIdentity();
  const relExec = copy(ci);
  relExec.environment.python.runtime.executable = "train/.venv/bin/python";
  fails(() => assertCommonIdentity(relExec), "SCHEMA_FORMAT");
  const wrongExec = copy(ci);
  wrongExec.environment.python.runtime.executable = "/usr/bin/python3";
  fails(() => assertCommonIdentity(wrongExec), "SCHEMA_LITERAL");
  const wrongVersion = copy(ci);
  wrongVersion.environment.python.runtime.version = "3.13.1";
  fails(() => assertCommonIdentity(wrongVersion), "SCHEMA_LITERAL");
  const wrongPrefix = copy(ci);
  wrongPrefix.environment.python.runtime.prefix = "/opt/py";
  fails(() => assertCommonIdentity(wrongPrefix), "SCHEMA_LITERAL");
  // A different but still-absolute monitoring basePrefix breaks
  // cross-environment coherence while every fixed pin stays valid.
  const driftBase = copy(ci);
  driftBase.environment.monitoring.python = {
    ...driftBase.environment.monitoring.python,
    basePrefix: "/opt/other-python",
  };
  fails(() => assertCommonIdentity(driftBase), "SCHEMA_COHERENCE");
});

test("import origins are absolute and agree with distributions", () => {
  const ci = fixtureCommonIdentity();
  const relOrigin = copy(ci);
  relOrigin.environment.python.imports[0].origin = "site-packages";
  fails(() => assertCommonIdentity(relOrigin), "SCHEMA_FORMAT");
  const badImpVer = copy(ci);
  badImpVer.environment.python.imports[0].version = "9";
  fails(() => assertCommonIdentity(badImpVer), "SCHEMA_LITERAL");
  const missingDist = copy(ci);
  missingDist.environment.python.distributions = missingDist.environment.python.distributions.filter(
    (d) => d.name !== "chess",
  );
  fails(() => assertCommonIdentity(missingDist), "SCHEMA_COHERENCE");
  const badDistVer = copy(ci);
  badDistVer.environment.python.distributions[0].version = "9";
  fails(() => assertCommonIdentity(badDistVer), "SCHEMA_COHERENCE");
});

test("sha256 fields require 64 lowercase hex; null non-torch wheels pass", () => {
  const ci = fixtureCommonIdentity();
  const upper = copy(ci);
  upper.environment.python.pipFreezeSha256 = "A".repeat(64);
  fails(() => assertCommonIdentity(upper), "SCHEMA_FORMAT");
  const nullWheels = copy(ci);
  for (const d of nullWheels.environment.python.distributions) {
    if (d.name !== "torch") d.wheelSha256 = null;
  }
  assert.doesNotThrow(() => assertCommonIdentity(nullWheels));
  const nullBuild = copy(ci);
  nullBuild.environment.python.distributions[0].buildSha256 = null;
  fails(() => assertCommonIdentity(nullBuild), "SCHEMA_FORMAT");
});

test("cleanup proof accepts frozen nullable and array forms", () => {
  const f = baseFinal("check");
  delete f._running;
  delete f._mf;
  assert.doesNotThrow(() => assertRecord("final", f));
  const nullFinalizer = copy(f);
  nullFinalizer.status = "inconclusive";
  nullFinalizer.exitCode = 2;
  nullFinalizer.cleanup.verified = false;
  nullFinalizer.cleanup.expectedFinalizer = null;
  assert.doesNotThrow(() => assertRecord("final", nullFinalizer));
  const badSurvivors = copy(f);
  badSurvivors.cleanup.survivorIdentities = { 0: identity(1) };
  fails(() => assertRecord("final", badSurvivors), "SCHEMA_FORMAT");
  const badFinalizer = copy(f);
  badFinalizer.status = "inconclusive";
  badFinalizer.exitCode = 2;
  badFinalizer.cleanup.verified = false;
  badFinalizer.cleanup.expectedFinalizer = { pid: 1 };
  fails(() => assertRecord("final", badFinalizer), "SCHEMA_MISSING");
});

const baseFinal = (phase) => {
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws, phase });
  const running = fixtureRunning({ manifest: mf });
  return {
    schemaVersion: 1,
    workspaceId: mf.workspaceId,
    runId: mf.runId,
    phase: mf.phase,
    commonIdentitySha256: mf.commonIdentitySha256,
    status: "passed",
    exitCode: 0,
    stopReason: null,
    requiredChecks: REQUIRED_CHECK_IDS[phase].map((id) => ({ id, status: "passed", evidence: [] })),
    unplannedFaultCount: 0,
    analysisEligible: false,
    cleanup: proof("phase-workload", running.supervisor),
    summary: {},
    _running: running,
    _mf: mf,
  };
};

test("workspace and manifest records validate and reject coherence breaks", () => {
  const ws = fixtureWorkspace();
  assert.doesNotThrow(() => assertRecord("workspace", ws));
  fails(() => assertRecord("workspace", { ...ws, schemaVersion: 2 }), "SCHEMA_LITERAL");
  const mf = fixtureManifest({ workspace: ws });
  assert.doesNotThrow(() => assertRecord("manifest", mf));
  fails(() => assertRecord("manifest", { ...mf, unexpected: 1 }), "SCHEMA_EXTRA");
  const badLimits = copy(mf);
  badLimits.limits.timing.cleanupMs = 1;
  fails(() => assertRecord("manifest", badLimits), "SCHEMA_LITERAL");
  const badChecks = copy(mf);
  badChecks.requiredCheckIds = ["other"];
  fails(() => assertRecord("manifest", badChecks), "SCHEMA_LITERAL");
  const badPrereq = copy(mf);
  badPrereq.phase = "parity";
  fails(() => assertRecord("manifest", badPrereq), "SCHEMA_LITERAL");
  const selftestNoOwner = fixtureManifest({ workspace: ws, phase: "watchdog-selftest" });
  fails(() => assertRecord("manifest", selftestNoOwner), "SCHEMA_COHERENCE");
  const selftest = fixtureManifest({
    workspace: ws,
    phase: "watchdog-selftest",
    owner: { phase: "preflight", runId: "run-preflight", supervisor: identity(7) },
  });
  assert.doesNotThrow(() => assertRecord("manifest", selftest));
  const ownerOnCheck = copy(selftest);
  ownerOnCheck.phase = "check";
  // Reset the check-id literal first so the mutation reaches the
  // forbidden-owner coherence guard instead of stopping at the literal.
  ownerOnCheck.requiredCheckIds = [...REQUIRED_CHECK_IDS.check];
  fails(() => assertRecord("manifest", ownerOnCheck), "SCHEMA_COHERENCE");
});

test("running and event records validate and reject bad envelopes", () => {
  const mf = fixtureManifest({});
  const running = fixtureRunning({ manifest: mf });
  assert.doesNotThrow(() => assertRecord("running", running));
  fails(() => assertRecord("running", { ...running, startedAtUtc: "2026-11-02" }), "SCHEMA_FORMAT");
  fails(() => assertRecord("running", { ...running, supervisor: { pid: "x" } }), "SCHEMA_MISSING");
  const event = { schemaVersion: 1, workspaceId: "w", runId: "r", phase: "check", seq: 0, kind: "operation", payload: {} };
  assert.doesNotThrow(() => assertRecord("event", event));
  fails(() => assertRecord("event", { ...event, kind: "other" }), "SCHEMA_LITERAL");
  fails(() => assertRecord("event", { ...event, seq: -1 }), "SCHEMA_FORMAT");
  fails(() => assertRecord("event", { ...event, payload: [] }), "SCHEMA_TYPE");
});

test("final record enforces the check set, scope and passed coherence", () => {
  const f = baseFinal("check");
  delete f._running;
  delete f._mf;
  assert.doesNotThrow(() => assertRecord("final", f));
  const statusCode = copy(f);
  statusCode.status = "failed";
  fails(() => assertRecord("final", statusCode), "SCHEMA_COHERENCE");
  const missingCheck = copy(f);
  missingCheck.requiredChecks = missingCheck.requiredChecks.filter((c) => c.id !== "cleanup");
  fails(() => assertRecord("final", missingCheck), "SCHEMA_LITERAL");
  const badScope = copy(f);
  badScope.cleanup.scope = "selftest-workload";
  fails(() => assertRecord("final", badScope), "SCHEMA_LITERAL");
  const passDirty = copy(f);
  passDirty.cleanup.verified = false;
  fails(() => assertRecord("final", passDirty), "SCHEMA_COHERENCE");
  const passFault = copy(f);
  passFault.unplannedFaultCount = 1;
  fails(() => assertRecord("final", passFault), "SCHEMA_COHERENCE");
  const inconclusive = copy(f);
  inconclusive.status = "inconclusive";
  inconclusive.exitCode = 2;
  inconclusive.cleanup.verified = false;
  assert.doesNotThrow(() => assertRecord("final", inconclusive));
  const selftestFinal = copy(f);
  selftestFinal.phase = "watchdog-selftest";
  selftestFinal.requiredChecks = REQUIRED_CHECK_IDS["watchdog-selftest"].map((id) => ({ id, status: "passed", evidence: [] }));
  selftestFinal.cleanup.scope = "selftest-workload";
  assert.doesNotThrow(() => assertRecord("final", selftestFinal));
});

test("completion enforces parent lists and self-test metadata by phase", () => {
  const ws = fixtureWorkspace();
  const mf = fixtureManifest({ workspace: ws, phase: "check" });
  const base = {
    schemaVersion: 1,
    kind: "tinyaz-phase-completion",
    workspaceId: mf.workspaceId,
    runId: mf.runId,
    phase: "check",
    commonIdentitySha256: mf.commonIdentitySha256,
    status: "passed",
    exitCode: 0,
    prerequisites: [],
    artifacts: [ref("check/manifest.json", 10, 1), ref("check/running.json", 10, 2)],
    expectedSelfTest: null,
  };
  assert.doesNotThrow(() => assertRecord("completion", base));
  const kindBad = copy(base);
  kindBad.kind = "other";
  fails(() => assertRecord("completion", kindBad), "SCHEMA_LITERAL");
  const selftestOnCheck = copy(base);
  selftestOnCheck.expectedSelfTest = { completion: ref("preflight/selftest/completion.json", 1, 3), expectedStopReason: "HEARTBEAT_TIMEOUT" };
  fails(() => assertRecord("completion", selftestOnCheck), "SCHEMA_COHERENCE");
  const preflight = copy(base);
  preflight.phase = "preflight";
  // The exact required parent set goes in first so the next assertion
  // reaches the missing-selftest coherence guard, not the parent literal.
  preflight.prerequisites = [
    { phase: "check", runId: "run-check", completion: ref("check/completion.json", 5, 4) },
    { phase: "parity", runId: "run-parity", completion: ref("parity/completion.json", 5, 5) },
  ];
  fails(() => assertRecord("completion", preflight), "SCHEMA_COHERENCE");
  preflight.expectedSelfTest = { completion: ref("preflight/selftest/completion.json", 1, 3), expectedStopReason: "HEARTBEAT_TIMEOUT" };
  assert.doesNotThrow(() => assertRecord("completion", preflight));
  // A missing required parent stays a separate literal failure.
  const missingParent = copy(preflight);
  missingParent.prerequisites = missingParent.prerequisites.filter((p) => p.phase !== "parity");
  fails(() => assertRecord("completion", missingParent), "SCHEMA_LITERAL");
  const badStop = copy(preflight);
  badStop.expectedSelfTest.expectedStopReason = "OTHER";
  fails(() => assertRecord("completion", badStop), "SCHEMA_LITERAL");
  const unsorted = copy(preflight);
  unsorted.artifacts = [unsorted.artifacts[1], unsorted.artifacts[0]];
  fails(() => assertRecord("completion", unsorted), "SCHEMA_ORDER");
});

test("unknown record kind is a bounded literal failure", () => {
  fails(() => assertRecord("mystery", {}), "SCHEMA_LITERAL");
});
