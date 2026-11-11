// Pure explicit-V3 compiler over captured supervisor facts and actual graph data.
// No IO, Native, clock, writer or publication authority. V1 never enters here.
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { deepEqual, freezeDeep, exactOnly, shape, oneOf, eqLiteral, assertProcessIdentity } from "./schema-primitives.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
import { assertRecordV2, assertCleanupProofV2 } from "./record-schema-v2.mjs";
import { assertResourceEvidence } from "./resource-quality.mjs";
import { deriveVerdictsV3 } from "./verdicts-v3.mjs";
import { deriveFinalGameEvidence } from "./pgn-summary.mjs";
import { V3_POLICY } from "./evaluation-policy.mjs";

const clone = (v) => JSON.parse(canonicalBytes(v));
const cleanProof = (p, expected, phase) => p.verified && p.accountingValid &&
  p.scope === (phase === "watchdog-selftest" ? "selftest-workload" : "phase-workload") &&
  deepEqual(p.expectedFinalizer, expected) && !p.survivorIdentities.length && !p.listenersRemaining.length;
const trustworthyIdentity = (value, expected) => {
  try { assertCommonIdentity(value); return deepEqual(value, expected); } catch { return false; }
};
import { classifyVerifiedParentV3 } from "./preflight-readiness-v3.mjs";
import { selftestOutcome } from "./receipt-verification-v2.mjs";
import { verifyResourcePrefixExtension } from "./receipt-verdicts-v2.mjs";
import { REQUIRED_PARENT_PHASES, RECORDED_PHASES } from "./schema-constants.mjs";

export function compileFinalV3(input) {
  shape(input, {
    headFields: "obj", commonIdentitySha256: "hash", request: "obj", claims: "list", phaseDirectory: "strNE",
    recordedProof: "obj", identityProven: "bool", identityMismatch: "bool", cleanupOk: "bool",
    identityObservation: "nullObj", expectedIdentity: "obj", expectedFinalizer: "obj", artifactRefs: "list",
    eventsRef: "obj", events: "list", verifiedParents: "list", requiredChecks: "list",
    preflightEvidence: "nullObj", verifiedSelfTest: "nullObj",
  }, "V3 compiler input");
  const i = clone(input);
  const { headFields: head, recordedProof, expectedFinalizer, expectedIdentity, identityObservation,
    eventsRef, artifactRefs, events, verifiedParents } = i;
  assertCommonIdentity(expectedIdentity);
  eqLiteral(expectedIdentity.evaluationPolicy, V3_POLICY, "V3 compiler identity policy");
  eqLiteral(i.commonIdentitySha256, sha256Bytes(canonicalBytes(expectedIdentity)), "V3 compiler identity hash");
  assertProcessIdentity(expectedFinalizer);
  assertCleanupProofV2(recordedProof);
  shape(head, { schemaVersion: "nat", workspaceId: "strNE", runId: "strNE", phase: "strNE" }, "V3 compiler head");
  oneOf(head.phase, RECORDED_PHASES, "V3 compiler phase");
  if (head.schemaVersion !== 2 || i.phaseDirectory !== (head.phase === "watchdog-selftest" ? "preflight/selftest" : head.phase))
    throw new TypeError("V3 compiler phase directory");
  const request = i.request;
  exactOnly(request, ["status", "exitCode", "stopReason", "summary", "unplannedFaultCount", "analysisEligible", "resourceEvidence"], "V3 request");
  const { stopReason, ...requestFields } = request;
  shape(requestFields, { status: "strNE", exitCode: "nat", summary: "obj", unplannedFaultCount: "nat",
    analysisEligible: "bool", resourceEvidence: "obj" }, "V3 compiler request");
  oneOf(request.status, ["passed", "failed", "inconclusive", "abandoned"], "requested status");
  if (request.stopReason !== null && typeof request.stopReason !== "string") throw new TypeError("V3 stop reason");
  i.claims.forEach((claim) => {
    shape(claim, { id: "strNE", status: "strNE", evidencePaths: "list" }, "V3 compiler claim");
    oneOf(claim.status, ["passed", "failed"], "claimed status");
  });
  // Existing PhaseResult carries descriptive driver counters, including a
  // completedGames array. Neither field may choose scientific counts.
  delete request.summary.completedGames;
  delete request.summary.completedPairs;
  const e = request.resourceEvidence;
  assertResourceEvidence(e);
  const identityProven = trustworthyIdentity(identityObservation, expectedIdentity) &&
    (head.phase !== "preflight" || expectedIdentity.candidate.kind === "commit");
  let identityMismatch = false;
  try { assertCommonIdentity(identityObservation); identityMismatch = !identityProven; } catch { /* unproven */ }
  const cleanupOk = cleanProof(recordedProof, expectedFinalizer, head.phase);
  const faultsInEvents = events.filter((event) => event.kind === "fault");
  const faults = Math.max(request.unplannedFaultCount, faultsInEvents.length, e.hardReasons.length ? 1 : 0);
  const workspaceCap = request.stopReason === "RESOURCE_WORKSPACE" ||
    faultsInEvents.some((event) => event.payload.code === "RESOURCE_WORKSPACE");
  const hard = faults !== 0 || e.rssLimitExceeded || workspaceCap || request.stopReason !== null;
  if (!deepEqual(verifiedParents.map((p) => p.phase), REQUIRED_PARENT_PHASES[head.phase]))
    throw new Error("V3 required verified parent set");
  const prerequisiteAdmissions = verifiedParents.map((evidence) => classifyVerifiedParentV3({
    forPhase: head.phase, expectedIdentity, evidence }));
  const prerequisitesProven = prerequisiteAdmissions.every((p) => p.scientificAdmissible);
  let selftestProven = false;
  if (head.phase === "preflight" && i.verifiedSelfTest !== null) {
    const nested = i.verifiedSelfTest;
    selftestProven = nested.phase === "watchdog-selftest" &&
      nested.runId === `${head.runId}:watchdog-selftest` &&
      nested.completionRef.path === "preflight/selftest/completion.json" &&
      deepEqual(nested.commonIdentity, expectedIdentity) &&
      selftestOutcome(nested, head.runId, expectedFinalizer) === null;
    try { verifyResourcePrefixExtension(nested.final.resourceEvidence, e); }
    catch { selftestProven = false; }
  }
  let requiredChecks = i.requiredChecks;
  if (head.phase === "preflight") {
    const independent = i.preflightEvidence;
    if (independent === null || independent.runId !== head.runId) throw new Error("V3 preflight evidence required");
    requiredChecks = requiredChecks.map((check) => {
      const actual = independent.checks.find((c) => c.id === check.id);
      return actual && (check.status !== "passed" || actual.status !== "passed")
        ? { ...check, status: "failed" } : check;
    });
  }
  let next = request;
  let selectionsProven = head.phase !== "compare";
  const claims = i.claims ?? [];
  const independentFailed = head.phase === "preflight"
    ? i.preflightEvidence.checks.filter((check) => check.status === "failed").map((check) => check.id) : [];
  let recordsProven = !e.hardReasons.includes("GRAPH") && requiredChecks.every((check) =>
    ["cleanup", "paired-analysis"].includes(check.id) || check.status === "passed" ||
    claims.some((claim) => claim.id === check.id && claim.status === "failed") || independentFailed.includes(check.id));
  if (head.phase === "compare") {
    // Every selected frozen checkpoint must be present in the actual event log,
    // not merely claimed by the summary. Retained refs are checked by PGN summary.
    const games = request.summary?.gameEvidence?.games;
    const frozenAt = request.summary?.gameEvidence?.freezeAtMonoNs;
    selectionsProven = typeof frozenAt === "string" && /^(0|[1-9][0-9]*)$/.test(frozenAt) &&
      BigInt(frozenAt) >= BigInt(e.startedNs) && BigInt(frozenAt) <= BigInt(e.coverageEndNs);
    selectionsProven &&= Array.isArray(games) && games.every((game) => game && game.checkpoint && events.some((event) => {
      const p = event.payload;
      return event.kind === "response" && p.recordType === "pgn-checkpoint" &&
        ["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor", "result"]
          .every((key) => deepEqual(p[key], game[key])) &&
        Object.keys(game.checkpoint ?? {}).every((key) => deepEqual(p[key], game.checkpoint[key]));
    }));
    recordsProven &&= selectionsProven;
    const scientificChecks = requiredChecks.filter((c) => !["cleanup", "paired-analysis"].includes(c.id));
    const scienceReady = recordsProven && scientificChecks.every((c) => c.status === "passed" && c.evidence.length > 0) &&
      prerequisitesProven && !hard && request.status === "passed";
    const derived = deriveFinalGameEvidence({ request, status: scienceReady ? "passed" : "inconclusive",
      artifactRefs, cleanupOk, identityProven, faults, recordSchemaVersion: 2, scienceProven: scienceReady });
    next = derived.request;
    selectionsProven &&= next.summary.gameEvidenceValidation.proven;
    recordsProven &&= selectionsProven;
    requiredChecks = requiredChecks.map((c) => c.id === "paired-analysis"
      ? { ...c, status: derived.pairedCheckPassed ? "passed" : "failed" } : c);
  }
  const analysis = next.summary?.pairedAnalysis;
  const games = selectionsProven && Array.isArray(next.summary?.gameEvidence?.games) ? next.summary.gameEvidence.games : [];
  const completed = games.filter((g) => g.state === "complete" && ["1-0", "0-1", "1/2-1/2"].includes(g.result));
  const completedPairs = new Set(completed.filter((g) =>
    completed.filter((other) => other.pairNumber === g.pairNumber).length === 2).map((g) => g.pairNumber)).size;
  const checksPassed = requiredChecks.every((c) => c.status === "passed");
  // Missing/incomplete cohort or unproven evidence is inconclusive. Explicit
  // failed science checks and valid identity mismatches remain proven violations.
  const failedScienceCheck = independentFailed.length > 0 || claims.some((c) => c.status === "failed" &&
    c.id !== "cleanup" && !(c.id === "paired-analysis" && head.phase === "compare"));
  const facts = {
    evaluationPolicy: V3_POLICY, requiredChecks, preflightEvidence: i.preflightEvidence,
    selftestProven, prerequisiteAdmissions,
    phase: head.phase, runId: head.runId, eventsRef, resourceEvidence: e,
    completedGames: completed.length, completedPairs,
    cohortProven: recordsProven && completed.length === 40 && completedPairs === 20,
    scienceProven: head.phase !== "compare" ? checksPassed : recordsProven && checksPassed,
    identityProven, cleanupProven: cleanupOk, recordsProven,
    prerequisitesProven, nativeProven: identityProven && cleanupOk && !e.hardReasons.some((r) =>
      ["NATIVE", "TIMESTAMP", "UNION", "AGGREGATE", "TRANSPORT", "BACKEND", "PERMISSION", "TIMEOUT",
        "IDENTITY", "PROOF", "CLEANUP"].includes(r)),
    storeProven: !e.hardReasons.some((r) => ["STORE", "DISK"].includes(r)) && !faultsInEvents.some((f) => ["STORE", "GRAPH", "DISK"].includes(f.payload.hardClass) ||
      /^(STORE_|ARTIFACT_|EVIDENCE_)/.test(f.payload.code ?? "")),
    monitoringComplete: e.coverageEndNs !== null && (!e.pending || head.phase === "watchdog-selftest"),
    workspaceLimitExceeded: workspaceCap, hardFaultCount: faults,
    stoppedEarly: request.stopReason !== null, checksPassed,
    provenViolation: identityMismatch || failedScienceCheck || request.status === "failed" ||
      e.hardReasons.some((r) => ["SCIENCE", "IDENTITY", "PHASE_CHECK"].includes(r)),
    abandoned: request.status === "abandoned",
    stats: analysis ? { analysisEligible: analysis.analysisEligible, classification: analysis.classification } : null,
    prerequisiteResources: verifiedParents.map((p) => p.final.resourceVerdict),
  };
  const verdicts = deriveVerdictsV3(facts);
  const summary = clone(next.summary ?? {});
  // This namespace is overwritten from actual capture. Readback reconstructs
  // the same compiler inputs from it; driver fields never choose these facts.
  summary.supervisorOutcome = { status: request.status, exitCode: request.exitCode,
    reportedFaultCount: request.unplannedFaultCount, identityObservation, checkClaims: claims };
  const final = { ...head, commonIdentitySha256: i.commonIdentitySha256, ...verdicts,
    evaluationPolicy: V3_POLICY, stopReason: request.stopReason,
    requiredChecks, unplannedFaultCount: faults, analysisEligible: verdicts.strengthVerdict.analysisEligible,
    cleanup: recordedProof, summary, resourceEvidence: e };
  assertRecordV2("final", final);
  return freezeDeep({ final, facts });
}
