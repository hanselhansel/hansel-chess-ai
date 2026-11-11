// Pure closed-facts reducers. Facts must come from supervisor verification,
// never driver declarations. No IO, statistics recomputation or publication.
import {
  assertArtifactRef,
  CHECK,
  eqLiteral,
  exactOnly,
  freezeDeep,
  oneOf,
  schemaFail,
  shape,
  sortedRefs,
  sortedUnique,
} from "./schema-primitives.mjs";
import { PROTOCOL_IDS, RECORDED_PHASES } from "./schema-constants.mjs";
import { assertScientificReadinessV3, deriveScientificReadinessV3 } from "./preflight-readiness-v3.mjs";
import { V3_POLICY } from "./evaluation-policy.mjs";

const STRENGTH =
  "CLEANUP_UNPROVEN HARD_STOP IDENTITY_UNPROVEN INCOMPLETE_COHORT NOT_COMPARISON PREREQUISITE_UNPROVEN RECORDS_UNPROVEN SCIENTIFIC_FAULT".split(
    " ",
  );
const RESOURCE =
  "CLEANUP_UNPROVEN COVERAGE_GAP INCOMPLETE_MONITORING NATIVE_UNPROVEN PREREQUISITE_RESOURCE_FAILURE PREREQUISITE_RESOURCE_UNPROVEN RECORDS_UNPROVEN RSS_CAP STORE_UNPROVEN WORKSPACE_CAP".split(
    " ",
  );
const CLASSIFICATIONS = [
  "advantage_signal_on_locked_suite",
  "regression_signal_on_locked_suite",
  "no_detectable_advantage",
];
const fail = (detail) => schemaFail("SCHEMA_COHERENCE", detail);
const reasons = (v, allowed) => {
  if (!Array.isArray(v)) fail("reasons");
  sortedUnique(v, "reasons");
  v.forEach((r) => oneOf(r, allowed, "reason"));
};
const resourceStatus = (rs) =>
  rs.some((r) => ["RSS_CAP", "WORKSPACE_CAP", "COVERAGE_GAP", "PREREQUISITE_RESOURCE_FAILURE"].includes(r)) ? "failed" : rs.length ? "inconclusive" : "passed";
const assertResourceVerdict = (v) => {
  shape(
    v,
    { status: "strNE", reasons: "list", scope: "strNE", phaseRunIds: "list", resourceEvidenceRefs: "list" },
    "resourceVerdict",
  );
  oneOf(v.scope, ["phase", "prerequisite-closure", "selftest-prefix"], "resource scope");
  reasons(v.reasons, RESOURCE);
  if (v.status !== resourceStatus(v.reasons)) fail("resource priority");
  if (v.phaseRunIds.length === 0 || !v.phaseRunIds.every(CHECK.strNE)) fail("phase run ids");
  sortedUnique(v.phaseRunIds, "phase run ids");
  sortedRefs(v.resourceEvidenceRefs, "resource evidence refs");
  if (v.resourceEvidenceRefs.length === 0) fail("missing evidence refs");
};

export function assertVerdictsV3(v) {
  exactOnly(
    v,
    ["strengthVerdict", "resourceVerdict", "closureResourceVerdict", "status", "exitCode", "scientificReadinessVerdict"],
    "verdict bundle",
  );
  assertScientificReadinessV3(v.scientificReadinessVerdict);
  const s = v.strengthVerdict;
  // classification is nullable, unlike the shared string primitive.
  exactOnly(
    s,
    ["status", "reasons", "analysisId", "analysisEligible", "completedGames", "completedPairs", "classification"],
    "strengthVerdict",
  );
  oneOf(s.status, ["eligible", "ineligible", "not-applicable"], "strength status");
  reasons(s.reasons, STRENGTH);
  if (
    s.analysisId !== PROTOCOL_IDS.analysisId ||
    !CHECK.bool(s.analysisEligible) ||
    !CHECK.nat(s.completedGames) ||
    !CHECK.nat(s.completedPairs) ||
    s.completedGames > 40 ||
    s.completedPairs > 20 ||
    s.completedPairs * 2 > s.completedGames
  )
    fail("strength fields");
  if (s.status === "eligible") {
    if (!s.analysisEligible || s.completedGames !== 40 || s.completedPairs !== 20 || s.reasons.length)
      fail("eligible cohort");
    oneOf(s.classification, CLASSIFICATIONS, "classification");
  } else {
    if (s.analysisEligible || s.classification !== null || s.reasons.length === 0) fail("ineligible inference");
    if (s.status === "not-applicable") eqLiteral(s.reasons, ["NOT_COMPARISON"], "noncompare reason");
    else if (s.reasons.includes("NOT_COMPARISON")) fail("compare reason");
  }
  assertResourceVerdict(v.resourceVerdict);
  assertResourceVerdict(v.closureResourceVerdict);
  const local = v.resourceVerdict;
  const closure = v.closureResourceVerdict;
  if (local.scope === "selftest-prefix") {
    eqLiteral(closure, local, "prefix closure scope");
  } else if (local.scope !== "phase" || closure.scope !== "prerequisite-closure") fail("phase/closure scopes");
  for (const r of local.reasons) if (!closure.reasons.includes(r)) fail("lost local resource reason");
  for (const id of local.phaseRunIds) if (!closure.phaseRunIds.includes(id)) fail("lost local resource scope");
  for (const ref of local.resourceEvidenceRefs)
    if (
      !closure.resourceEvidenceRefs.some(
        (r) => r.path === ref.path && r.sha256 === ref.sha256 && r.byteLength === ref.byteLength,
      )
    )
      fail("lost local ref");
  oneOf(v.status, ["passed", "failed", "inconclusive", "abandoned"], "aggregate status");
  if (v.exitCode !== { passed: 0, failed: 1, inconclusive: 2, abandoned: 2 }[v.status]) fail("aggregate exit");
  if (v.status === "passed" && (closure.status !== "passed" || s.status === "ineligible")) fail("aggregate passed");
  if (s.status === "eligible" && closure.reasons.some((reason) =>
    !["COVERAGE_GAP", "PREREQUISITE_RESOURCE_FAILURE"].includes(reason))) fail("eligible resource reasons");
  if (s.status === "eligible" && (v.status === "failed" || v.status === "abandoned"))
    fail("eligible aggregate");
}

export function deriveVerdictsV3(f) {
  shape(
    f,
    {
      phase: "strNE",
      runId: "strNE",
      eventsRef: "obj",
      resourceEvidence: "obj",
      completedGames: "nat",
      completedPairs: "nat",
      cohortProven: "bool",
      scienceProven: "bool",
      identityProven: "bool",
      cleanupProven: "bool",
      recordsProven: "bool",
      prerequisitesProven: "bool",
      nativeProven: "bool",
      storeProven: "bool",
      monitoringComplete: "bool",
      workspaceLimitExceeded: "bool",
      hardFaultCount: "nat",
      stoppedEarly: "bool",
      checksPassed: "bool",
      provenViolation: "bool",
      abandoned: "bool",
      stats: "nullObj",
      prerequisiteResources: "list",
      evaluationPolicy: "obj", requiredChecks: "list", preflightEvidence: "nullObj",
      selftestProven: "bool", prerequisiteAdmissions: "list",
    },
    "supervisor closed facts",
  );
  const scientificReadinessVerdict = deriveScientificReadinessV3(f);
  oneOf(f.phase, RECORDED_PHASES, "facts phase");
  assertArtifactRef(f.eventsRef);
  const e = f.resourceEvidence;
  if (
    e.schemaVersion !== 2 ||
    e.policyId !== V3_POLICY.policyId ||
    e.runId !== f.runId ||
    e.phase !== f.phase ||
    !CHECK.bool(e.coverageLost) ||
    !CHECK.bool(e.rssLimitExceeded) ||
    !CHECK.bool(e.pending) ||
    !Array.isArray(e.hardReasons)
  )
    fail("resource fact binding");
  if (f.stats !== null) {
    shape(f.stats, { analysisEligible: "bool", classification: "strNE" }, "verified stats");
    oneOf(
      f.stats.classification,
      f.stats.analysisEligible ? CLASSIFICATIONS : ["inconclusive"],
      "verified classification",
    );
  }
  f.prerequisiteResources.forEach(assertResourceVerdict);
  const prefix = f.phase === "watchdog-selftest";
  if (prefix && f.prerequisiteResources.length) fail("prefix parents");
  const rr = [];
  if (e.rssLimitExceeded) rr.push("RSS_CAP");
  if (f.workspaceLimitExceeded) rr.push("WORKSPACE_CAP");
  if (e.coverageLost) rr.push("COVERAGE_GAP");
  if (
    !f.nativeProven ||
    e.hardReasons.some((r) =>
      ["NATIVE", "TIMESTAMP", "UNION", "AGGREGATE", "TRANSPORT", "BACKEND", "PERMISSION", "TIMEOUT"].includes(r),
    )
  )
    rr.push("NATIVE_UNPROVEN");
  if (!f.cleanupProven) rr.push("CLEANUP_UNPROVEN");
  if (!f.storeProven) rr.push("STORE_UNPROVEN");
  if (!f.recordsProven) rr.push("RECORDS_UNPROVEN");
  if (!f.monitoringComplete || e.coverageEndNs === null || e.completedCycles === 0 || (e.pending && !prefix))
    rr.push("INCOMPLETE_MONITORING");
  const resourceVerdict = {
    status: resourceStatus(rr),
    reasons: rr.sort(),
    scope: prefix ? "selftest-prefix" : "phase",
    phaseRunIds: [f.runId],
    resourceEvidenceRefs: [f.eventsRef],
  };
  const parents = f.prerequisiteResources;
  const cr = [...rr, ...parents.flatMap((p) => p.reasons)];
  if (!f.prerequisitesProven) cr.push("PREREQUISITE_RESOURCE_UNPROVEN");
  if (parents.some((p) => p.status === "failed")) cr.push("PREREQUISITE_RESOURCE_FAILURE");
  if (parents.some((p) => p.status === "inconclusive")) cr.push("PREREQUISITE_RESOURCE_UNPROVEN");
  const refs = new Map();
  for (const ref of [f.eventsRef, ...parents.flatMap((p) => p.resourceEvidenceRefs)]) {
    const previous = refs.get(ref.path);
    if (previous) eqLiteral(ref, previous, "resource ref collision");
    refs.set(ref.path, ref);
  }
  const closureResourceVerdict = prefix
    ? structuredClone(resourceVerdict)
    : {
        status: resourceStatus(cr),
        reasons: [...new Set(cr)].sort(),
        scope: "prerequisite-closure",
        phaseRunIds: [...new Set([f.runId, ...parents.flatMap((p) => p.phaseRunIds)])].sort(),
        resourceEvidenceRefs: [...refs.values()].sort((a, b) => (a.path < b.path ? -1 : 1)),
      };
  const sr = [];
  if (f.phase !== "compare") sr.push("NOT_COMPARISON");
  else {
    if (f.completedGames !== 40 || f.completedPairs !== 20 || !f.cohortProven) sr.push("INCOMPLETE_COHORT");
    if (!f.scienceProven || !f.checksPassed || f.stats === null || !f.stats.analysisEligible)
      sr.push("SCIENTIFIC_FAULT");
    if (!f.identityProven) sr.push("IDENTITY_UNPROVEN");
    if (!f.cleanupProven || !f.nativeProven || rr.includes("INCOMPLETE_MONITORING")) sr.push("CLEANUP_UNPROVEN");
    if (!f.recordsProven || !f.storeProven) sr.push("RECORDS_UNPROVEN");
    if (!f.prerequisitesProven) sr.push("PREREQUISITE_UNPROVEN");
    if (
      f.hardFaultCount > 0 ||
      e.hardReasons.length > 0 ||
      f.stoppedEarly ||
      e.rssLimitExceeded ||
      f.workspaceLimitExceeded ||
      f.provenViolation ||
      f.abandoned
    )
      sr.push("HARD_STOP");
  }
  const eligible = f.phase === "compare" && sr.length === 0;
  const strengthVerdict = {
    status: eligible ? "eligible" : f.phase === "compare" ? "ineligible" : "not-applicable",
    reasons: sr.sort(),
    analysisId: PROTOCOL_IDS.analysisId,
    analysisEligible: eligible,
    completedGames: f.completedGames,
    completedPairs: f.completedPairs,
    classification: eligible ? f.stats.classification : null,
  };
  const clean =
    (f.phase !== "preflight" || scientificReadinessVerdict.status === "ready") &&
    f.scienceProven &&
    f.identityProven &&
    f.cleanupProven &&
    f.recordsProven &&
    f.prerequisitesProven &&
    f.nativeProven &&
    f.storeProven &&
    f.checksPassed &&
    f.hardFaultCount === 0 &&
    e.hardReasons.length === 0 &&
    !f.stoppedEarly;
  const status = f.provenViolation
    ? "failed"
    : f.abandoned
      ? "abandoned"
      : clean && closureResourceVerdict.status === "passed" && (f.phase !== "compare" || eligible)
        ? "passed"
        : "inconclusive";
  const result = {
    scientificReadinessVerdict,
    strengthVerdict,
    resourceVerdict,
    closureResourceVerdict,
    status,
    exitCode: { passed: 0, failed: 1, inconclusive: 2, abandoned: 2 }[status],
  };
  assertVerdictsV3(result);
  return freezeDeep(result);
}
