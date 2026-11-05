// Pure canonical final/check-evidence/completion construction and
// eligibility helpers for records.mjs. No IO, callbacks or state here:
// records.mjs retains native/capture callback invocation, all artifact IO,
// and the close -> evidence-path hash -> final -> completion order. Nothing
// in this module is a second writer.

import { canonicalBytes, parseCanonicalBytes } from "./canonical-json.mjs";
import { assertRecord, REQUIRED_CHECK_IDS } from "./record-schema.mjs";

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const deepEqual = (a, b) => canonicalBytes(a).equals(canonicalBytes(b));

const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

// Freeze only copies this module produced, never caller objects. The
// copies are plain JSON, so enumerable own keys cover the whole graph,
// including an own "__proto__" data key the parser carries through.
const deepFreeze = (value) => {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

export const EXIT_CODES = { passed: 0, failed: 1, inconclusive: 2, abandoned: 2 };

export const UNPROVEN_PROOF = (scope) => ({
  scope,
  expectedFinalizer: null,
  verified: false,
  survivorIdentities: [],
  listenersRemaining: [],
  accountingValid: false,
});

// A cleanup proof is only usable if it is structurally a valid
// record-schema CleanupProof under this run's head fields. A malformed
// callback result degrades to the unproven proof rather than crashing.
export function structurallyValidProof(proof, headFields, commonIdentitySha256) {
  try {
    assertRecord("final", {
      ...headFields,
      commonIdentitySha256,
      status: "inconclusive",
      exitCode: 2,
      stopReason: null,
      requiredChecks: REQUIRED_CHECK_IDS[headFields.phase].map((id) => ({
        id,
        status: "failed",
        evidence: [],
      })),
      unplannedFaultCount: 0,
      analysisEligible: false,
      cleanup: proof,
      summary: {},
    });
    return true;
  } catch {
    return false;
  }
}

// Cleanup is proven only when every element of the proof verifies and the
// observed finalizer identity equals the expected one byte-for-byte.
export function isCleanupProven(proof, scope, expectedFinalizer) {
  return (
    proof.scope === scope &&
    proof.verified === true &&
    proof.accountingValid === true &&
    proof.survivorIdentities.length === 0 &&
    proof.listenersRemaining.length === 0 &&
    proof.expectedFinalizer !== null &&
    deepEqual(proof.expectedFinalizer, expectedFinalizer)
  );
}

// Validates ordinary-phase check claims: ids limited to the declared set
// minus "cleanup" (which the recorder derives), one entry per id, literal
// status and array evidencePaths.
export function validateCheckClaims(claims, phase) {
  const allowed = new Set(REQUIRED_CHECK_IDS[phase].filter((id) => id !== "cleanup"));
  for (const claim of claims) {
    if (!claim || typeof claim.id !== "string" || !allowed.has(claim.id)) {
      fail("RECORDER_CLAIM", "claim id");
    }
    if (claim.status !== "passed" && claim.status !== "failed") {
      fail("RECORDER_CLAIM", "claim status");
    }
    if (!Array.isArray(claim.evidencePaths)) fail("RECORDER_CLAIM", "evidencePaths");
  }
  if (new Set(claims.map((c) => c.id)).size !== claims.length) {
    fail("RECORDER_CLAIM", "duplicate claim");
  }
}

// Resolves claimed evidence paths to retained artifact refs. A claim with
// any unresolved, out-of-phase or missing evidence degrades to failed with
// no evidence, never to a partial pass.
const resolveCheck = (claim, refs, phaseDir) => {
  if (claim === undefined || claim.status !== "passed") {
    return { id: claim?.id, status: "failed", evidence: [] };
  }
  const evidence = [];
  for (const rel of claim.evidencePaths) {
    if (typeof rel !== "string" || !rel.startsWith(`${phaseDir}/`)) {
      return { id: claim.id, status: "failed", evidence: [] };
    }
    const ref = refs.get(rel);
    if (ref === undefined) return { id: claim.id, status: "failed", evidence: [] };
    evidence.push(ref);
  }
  return { id: claim.id, status: "passed", evidence };
};

export function resolvePhaseChecks({ claims, phase, refs, phaseDir, cleanupOk, eventsRef }) {
  validateCheckClaims(claims, phase);
  const byId = new Map(claims.map((c) => [c.id, c]));
  return REQUIRED_CHECK_IDS[phase].map((id) => {
    if (id === "cleanup") {
      return { id, status: cleanupOk ? "passed" : "failed", evidence: [eventsRef] };
    }
    return { ...resolveCheck(byId.get(id), refs, phaseDir), id };
  });
}

// The four declared internal self-test checks are derived only from the
// recorded request fields and the proven cleanup proof. claims must be
// empty for an internal phase.
export function deriveSelfTestChecks({ request, recordedProof, eventsRef }) {
  const summary = request.summary ?? {};
  const derived = {
    "injected-heartbeat-timeout": request.stopReason === "HEARTBEAT_TIMEOUT",
    "zero-scored-games": summary.scoredGames === 0,
    "surviving-child-cleanup":
      recordedProof.verified === true &&
      recordedProof.survivorIdentities.length === 0 &&
      recordedProof.listenersRemaining.length === 0,
    "accounting-valid": recordedProof.accountingValid === true,
  };
  return REQUIRED_CHECK_IDS["watchdog-selftest"].map((id) => ({
    id,
    status: derived[id] === true ? "passed" : "failed",
    evidence: [eventsRef],
  }));
}

// Status ladder: a requested pass can only stand when identity is proven,
// cleanup is proven, no check failed and there are no unplanned faults.
// Identity mismatch or a failed non-cleanup check is a hard failure;
// unproven evidence degrades to inconclusive. Failed/inconclusive/abandoned
// requests pass through unchanged.
export function resolveStatus({ request, identityProven, identityMismatch, cleanupOk, faults, requiredChecks }) {
  if (request.status === "passed") {
    if (
      identityMismatch ||
      requiredChecks.some((c) => c.status === "failed" && c.id !== "cleanup")
    ) {
      return "failed";
    }
    if (!identityProven || !cleanupOk || faults !== 0) return "inconclusive";
    return "passed";
  }
  if (["failed", "inconclusive", "abandoned"].includes(request.status)) {
    return request.status;
  }
  fail("RECORDER_INPUT", "intent.status");
}

// Analysis eligibility can only be retained through a fully proven run.
// Failed or inconclusive cleanup, unproven identity or any unplanned fault
// strips it regardless of the caller's claim.
export function resolveAnalysisEligible({ request, status, cleanupOk, identityProven, faults }) {
  return (
    request.analysisEligible === true &&
    status === "passed" &&
    cleanupOk === true &&
    identityProven === true &&
    faults === 0
  );
}

export function buildFinal({ headFields, commonIdentitySha256, status, requiredChecks, faults, analysisEligible, cleanup, request }) {
  const final = {
    ...headFields,
    commonIdentitySha256,
    status,
    exitCode: EXIT_CODES[status],
    stopReason: request.stopReason ?? null,
    requiredChecks,
    unplannedFaultCount: faults,
    analysisEligible,
    cleanup,
    summary: request.summary === undefined ? {} : request.summary,
  };
  assertRecord("final", final);
  return final;
}

export function buildCompletion({ headFields, commonIdentitySha256, status, prerequisites, artifacts, expectedSelfTest }) {
  const completion = {
    ...headFields,
    kind: "tinyaz-phase-completion",
    commonIdentitySha256,
    status,
    exitCode: EXIT_CODES[status],
    prerequisites,
    artifacts,
    expectedSelfTest,
  };
  assertRecord("completion", completion);
  return completion;
}

// Pure aggregation of the closed-facts tail of records.mjs finalize().
// The whole caller input bundle is canonical-copied before any field is
// selected, so a function, handle or Map smuggled inside cannot bypass
// the whole-JSON guard. The byPath lookup stays local and is never
// exposed; the returned record is independently owned and deep-frozen.
// Status, eligibility and the final record still come from the helpers
// above in the same order, and buildFinal keeps the assertRecord call.
export function buildFinalFromClosedFacts(input) {
  const facts = copy(input);
  const {
    headFields,
    commonIdentitySha256,
    request,
    phaseDirectory,
    artifactRefs,
    eventsRef,
    recordedProof,
    identityProven,
    identityMismatch,
    cleanupOk,
  } = facts;
  const claims = facts.claims ?? [];

  const byPath = new Map(artifactRefs.map((ref) => [ref.path, ref]));

  let requiredChecks;
  if (headFields.phase === "watchdog-selftest") {
    if (claims.length !== 0) fail("RECORDER_CLAIM", "selftest claims");
    requiredChecks = deriveSelfTestChecks({ request, recordedProof, eventsRef });
  } else {
    requiredChecks = resolvePhaseChecks({
      claims,
      phase: headFields.phase,
      refs: byPath,
      phaseDir: phaseDirectory,
      cleanupOk,
      eventsRef,
    });
  }

  const faults = Number.isSafeInteger(request.unplannedFaultCount)
    ? request.unplannedFaultCount
    : 1;
  const status = resolveStatus({
    request,
    identityProven,
    identityMismatch,
    cleanupOk,
    faults,
    requiredChecks,
  });
  const analysisEligible = resolveAnalysisEligible({
    request,
    status,
    cleanupOk,
    identityProven,
    faults,
  });

  return deepFreeze(
    buildFinal({
      headFields,
      commonIdentitySha256,
      status,
      requiredChecks,
      faults,
      analysisEligible,
      cleanup: recordedProof,
      request,
    }),
  );
}
