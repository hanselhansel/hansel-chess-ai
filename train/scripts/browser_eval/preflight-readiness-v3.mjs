// Pure closed scientific facts and policy-specific verified-parent admission.
import { V3_POLICY } from "./evaluation-policy.mjs";
import { REQUIRED_CHECK_IDS, REQUIRED_PARENT_PHASES, RECORDED_PHASES } from "./schema-constants.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
import { assertResourceEvidence } from "./resource-quality.mjs";
import { assertArtifactRef, deepEqual, eqLiteral, exactOnly, freezeDeep, oneOf,
  schemaFail, shape, sortedUnique } from "./schema-primitives.mjs";

const REASONS = "SCIENTIFIC_CHECK_UNPROVEN IDENTITY_UNPROVEN SELFTEST_UNPROVEN NATIVE_UNPROVEN MONITORING_UNPROVEN CLEANUP_UNPROVEN RECORDS_UNPROVEN STORE_UNPROVEN PREREQUISITE_UNPROVEN HARD_STOP".split(" ");
const NATIVE = "NATIVE TIMESTAMP UNION AGGREGATE TRANSPORT BACKEND PERMISSION TIMEOUT IDENTITY PROOF CLEANUP".split(" ");
const fail = (detail) => schemaFail("SCHEMA_COHERENCE", detail);
export function assertScientificReadinessV3(v) {
  shape(v, { status: "strNE", reasons: "list" }, "scientific readiness");
  oneOf(v.status, ["ready", "unready", "not-applicable"], "readiness status");
  sortedUnique(v.reasons, "readiness reasons");
  if (v.status === "not-applicable") eqLiteral(v.reasons, ["NOT_PREFLIGHT"], "nonpreflight readiness");
  else {
    v.reasons.forEach((r) => oneOf(r, REASONS, "readiness reason"));
    if ((v.status === "ready") !== (v.reasons.length === 0)) fail("readiness status/reasons");
  }
}

export function deriveScientificReadinessV3(f) {
  shape(f, {
    phase: "strNE", runId: "strNE", eventsRef: "obj", resourceEvidence: "obj",
    completedGames: "nat", completedPairs: "nat", cohortProven: "bool", scienceProven: "bool",
    identityProven: "bool", cleanupProven: "bool", recordsProven: "bool", prerequisitesProven: "bool",
    nativeProven: "bool", storeProven: "bool", monitoringComplete: "bool", workspaceLimitExceeded: "bool",
    hardFaultCount: "nat", stoppedEarly: "bool", checksPassed: "bool", provenViolation: "bool",
    abandoned: "bool", stats: "nullObj", prerequisiteResources: "list", evaluationPolicy: "obj",
    requiredChecks: "list", preflightEvidence: "nullObj", selftestProven: "bool", prerequisiteAdmissions: "list",
  }, "V3 closed facts");
  eqLiteral(f.evaluationPolicy, V3_POLICY, "facts policy");
  oneOf(f.phase, RECORDED_PHASES, "facts phase");
  assertArtifactRef(f.eventsRef);
  const e = f.resourceEvidence;
  assertResourceEvidence(e);
  if (e.policyId !== V3_POLICY.policyId || e.runId !== f.runId || e.phase !== f.phase) fail("facts resource binding");
  eqLiteral(f.requiredChecks.map((c) => c.id).sort(), [...REQUIRED_CHECK_IDS[f.phase]].sort(), "facts checks");
  f.requiredChecks.forEach((c) => {
    shape(c, { id: "strNE", status: "strNE", evidence: "list" }, "resolved check");
    oneOf(c.status, ["passed", "failed"], "check status");
    c.evidence.forEach(assertArtifactRef);
  });
  const required = REQUIRED_PARENT_PHASES[f.phase];
  eqLiteral(f.prerequisiteAdmissions.map((p) => p.phase), required, "admission order");
  f.prerequisiteAdmissions.forEach((p) => {
    shape(p, { phase: "strNE", runId: "strNE", completionRef: "obj", scientificAdmissible: "bool",
      resourceVerdict: "obj", closureResourceVerdict: "obj" }, "parent admission");
    assertArtifactRef(p.completionRef);
  });
  eqLiteral(f.prerequisiteResources, f.prerequisiteAdmissions.map((p) => p.resourceVerdict), "actual parent resources");
  eqLiteral(f.prerequisitesProven, f.prerequisiteAdmissions.every((p) => p.scientificAdmissible), "scientific parents");
  if (f.phase !== "preflight") {
    if (f.preflightEvidence !== null || f.selftestProven !== false) fail("nonpreflight facts");
    return freezeDeep({ status: "not-applicable", reasons: ["NOT_PREFLIGHT"] });
  }
  const independent = f.preflightEvidence;
  if (independent !== null) {
    shape(independent, { runId: "strNE", manifestSha256: "hash", checks: "list" }, "preflight evidence");
    eqLiteral(independent.checks.map((c) => c.id),
      ["cold-readiness", "ten-fresh-requests", "aa-color-pair", "timing-estimate"], "independent check set");
    independent.checks.forEach((c) => {
      shape(c, { id: "strNE", status: "strNE", evidence: "list" }, "independent check");
      oneOf(c.status, ["passed", "failed"], "independent status");
      c.evidence.forEach(assertArtifactRef);
    });
    if (independent.runId !== f.runId) fail("preflight evidence run");
  }
  const badCheck = (id) => f.requiredChecks.find((c) => c.id === id)?.status !== "passed";
  const reasons = [];
  const add = (reason, predicate) => { if (predicate) reasons.push(reason); };
  add("SCIENTIFIC_CHECK_UNPROVEN", ["cold-readiness", "ten-fresh-requests", "aa-color-pair", "timing-estimate"]
    .some((id) => badCheck(id) || independent?.checks.find((c) => c.id === id)?.status !== "passed"));
  add("IDENTITY_UNPROVEN", !f.identityProven);
  add("SELFTEST_UNPROVEN", !f.selftestProven || badCheck("watchdog-selftest"));
  add("NATIVE_UNPROVEN", !f.nativeProven || e.hardReasons.some((r) => NATIVE.includes(r)));
  add("MONITORING_UNPROVEN", !f.monitoringComplete || e.closureKind !== "monitor-stop" ||
    e.monitorRunId !== f.runId || e.coverageEndNs === null || e.pending || e.completedCycles === 0);
  add("CLEANUP_UNPROVEN", !f.cleanupProven || badCheck("cleanup"));
  add("RECORDS_UNPROVEN", !f.recordsProven || e.hardReasons.includes("GRAPH"));
  add("STORE_UNPROVEN", !f.storeProven || e.hardReasons.some((r) => ["STORE", "DISK"].includes(r)));
  add("PREREQUISITE_UNPROVEN", !f.prerequisitesProven);
  add("HARD_STOP", f.hardFaultCount > 0 || f.stoppedEarly || f.provenViolation || f.abandoned ||
    f.workspaceLimitExceeded || e.rssLimitExceeded || e.hardReasons.length > 0);
  return freezeDeep({ status: reasons.length ? "unready" : "ready", reasons: reasons.sort() });
}

export function classifyVerifiedParentV3(input) {
  shape(input, { forPhase: "strNE", expectedIdentity: "obj", evidence: "obj" }, "V3 parent classifier");
  const { forPhase, expectedIdentity, evidence } = input;
  exactOnly(evidence, ["workspaceId", "runId", "phase", "commonIdentity", "completionRef", "completion",
    "final", "manifest", "running", "closure"], "verified evidence");
  assertCommonIdentity(expectedIdentity);
  eqLiteral(expectedIdentity.evaluationPolicy, V3_POLICY, "parent policy");
  const f = evidence.final;
  if (!REQUIRED_PARENT_PHASES[forPhase]?.includes(evidence.phase) || evidence.phase !== f.phase ||
    evidence.runId !== f.runId || !deepEqual(evidence.commonIdentity, expectedIdentity) ||
    !deepEqual(f.evaluationPolicy, V3_POLICY) || evidence.completion.runId !== f.runId ||
    evidence.completionRef.path !== `${f.phase}/completion.json`) fail("verified parent binding");
  const strict = f.status === "passed" && f.exitCode === 0 &&
    f.resourceVerdict.status === "passed" && f.closureResourceVerdict.status === "passed";
  const ready = forPhase === "compare" && f.phase === "preflight" &&
    f.status === "inconclusive" && f.exitCode === 2 && f.scientificReadinessVerdict.status === "ready" &&
    f.resourceVerdict.status === "failed" && f.closureResourceVerdict.status === "failed" &&
    deepEqual(f.resourceVerdict.reasons, ["COVERAGE_GAP"]) &&
    deepEqual(f.closureResourceVerdict.reasons, ["COVERAGE_GAP"]) &&
    f.resourceEvidence.closureKind === "monitor-stop" && !f.resourceEvidence.pending;
  const safety = f.unplannedFaultCount === 0 && f.stopReason === null &&
    f.requiredChecks.every((c) => c.status === "passed") && f.cleanup.verified && f.cleanup.accountingValid &&
    f.cleanup.survivorIdentities.length === 0 && f.cleanup.listenersRemaining.length === 0;
  return freezeDeep({ phase: f.phase, runId: f.runId, completionRef: evidence.completionRef,
    scientificAdmissible: safety && (strict || ready), resourceVerdict: f.resourceVerdict,
    closureResourceVerdict: f.closureResourceVerdict });
}
