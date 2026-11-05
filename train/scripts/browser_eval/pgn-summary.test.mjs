// Closed synthetic facts only. These are not played games or cleanup proof.
import assert from "node:assert/strict";
import test from "node:test";
import { buildFinalFromClosedFacts } from "./record-finalization.mjs";
import { REQUIRED_CHECK_IDS } from "./schema-constants.mjs";
import { deriveFinalGameEvidence } from "./pgn-summary.mjs";

function facts() {
  const games = [];
  const artifactRefs = [];
  for (let pair = 1; pair <= 20; pair += 1) {
    const openingId = `p${String(pair).padStart(2, "0")}`;
    for (const gameNumber of [1, 2]) {
      const gameId = `${openingId}-g${gameNumber}`;
      const pgn = { path: `compare/games/${gameId}.a.pgn`, byteLength: 100,
        sha256: `${pair}`.padStart(64, "0") };
      artifactRefs.push(pgn);
      games.push({ gameId, pairNumber: pair, gameNumber, openingId,
        candidateColor: (pair % 2 === 1) === (gameNumber === 1) ? "white" : "black",
        state: "complete", result: "1/2-1/2", stopReason: null,
        checkpoint: { checkpointId: `${gameId}-c2`, ordinal: 2, slot: "a", plyCount: 8,
          initialFen: "fixture data", fen: "fixture terminal data", pgn } });
    }
  }
  return { request: { status: "passed", exitCode: 0, stopReason: null, analysisEligible: true, unplannedFaultCount: 0,
    summary: { pValue: 0.0001, elo: 3000, pairedAnalysis: { forged: true },
      gameEvidence: { schemaVersion: 1, frozen: true, firstStopReason: null, freezeAtMonoNs: "123", games, diagnostics: [] } } },
    status: "passed", artifactRefs, cleanupOk: true, identityProven: true, faults: 0 };
}

test("only actual complete closed facts derive paired inference and replace driver claims", () => {
  const result = deriveFinalGameEvidence(facts());
  assert.equal(result.status, "passed");
  assert.equal(result.pairedCheckPassed, true);
  assert.equal(result.request.analysisEligible, true);
  assert.equal(result.request.summary.pairedAnalysis.pValue, 1);
  assert.equal(result.request.summary.pairedAnalysis.classification, "no_detectable_advantage");
  assert.equal(Object.hasOwn(result.request.summary, "pValue"), false);
  assert.equal(Object.hasOwn(result.request.summary, "elo"), false);
});

for (const gate of ["cleanupOk", "identityProven", "faults", "status", "stop"]) {
  test(`paired inference absent with actual ${gate} gate`, () => {
    const value = facts();
    if (gate === "stop") {
      value.request.stopReason = "CAP_STOP";
      value.request.summary.gameEvidence.firstStopReason = "CAP_STOP";
    } else {
      value[gate] = gate === "faults" ? 1 : gate === "status" ? "inconclusive" : false;
    }
    const result = deriveFinalGameEvidence(value);
    assert.equal(result.pairedCheckPassed, false);
    assert.equal(result.request.analysisEligible, false);
    assert.equal(result.request.summary.pairedAnalysis.pValue, null);
    assert.equal(result.request.summary.pairedAnalysis.interval95, null);
  });
}

test("partial pair has descriptive counts and no substituted winner or inference", () => {
  const value = facts();
  value.request.summary.gameEvidence.games.pop();
  const result = deriveFinalGameEvidence(value);
  assert.equal(result.status, "inconclusive");
  assert.equal(result.request.summary.pairedAnalysis.completedGames, 39);
  assert.equal(result.request.summary.pairedAnalysis.completedPairs, 19);
  assert.equal(result.request.summary.pairedAnalysis.pValue, null);
  assert.equal(result.request.summary.gameEvidence.games.length, 39);
});

for (const mutate of [
  (value) => { value.artifactRefs.pop(); },
  (value) => { value.artifactRefs[0] = { ...value.artifactRefs[0], sha256: "f".repeat(64) }; },
]) {
  test("selected checkpoint ref must equal actual closed final inventory", () => {
    const value = facts();
    mutate(value);
    const result = deriveFinalGameEvidence(value);
    assert.equal(result.request.summary.gameEvidenceValidation.proven, false);
    assert.equal(result.request.summary.pairedAnalysis.pValue, null);
    assert.equal(result.request.summary.gameEvidence.games[0].result, "1/2-1/2");
    assert.equal(result.status, "inconclusive");
  });
}

function compile(value, { cleanupOk = true, identityProven = true } = {}) {
  const eventsRef = { path: "compare/events.jsonl", byteLength: 100, sha256: "a".repeat(64) };
  return buildFinalFromClosedFacts({
    headFields: { schemaVersion: 1, workspaceId: "fixture-ws", runId: "fixture-run", phase: "compare" },
    commonIdentitySha256: "b".repeat(64), request: value.request, phaseDirectory: "compare",
    artifactRefs: [...value.artifactRefs, eventsRef], eventsRef,
    recordedProof: { scope: "phase-workload", expectedFinalizer: { pid: 7000, startSec: "123", startUsec: 0 },
      verified: cleanupOk, survivorIdentities: [], listenersRemaining: [], accountingValid: cleanupOk },
    identityProven, identityMismatch: false, cleanupOk,
    claims: REQUIRED_CHECK_IDS.compare.filter((id) => id !== "cleanup")
      .map((id) => ({ id, status: "passed", evidencePaths: [eventsRef.path] })),
  });
}

test("actual closed-facts compiler owns paired check, exit and inference", () => {
  const final = compile(facts());
  assert.equal(final.status, "passed");
  assert.equal(final.exitCode, 0);
  assert.equal(final.analysisEligible, true);
  assert.equal(final.requiredChecks.find((check) => check.id === "paired-analysis").status, "passed");
  assert.equal(final.summary.pairedAnalysis.pValue, 1);
  const tampered = facts();
  tampered.artifactRefs.pop();
  const rejected = compile(tampered);
  assert.equal(rejected.status, "inconclusive");
  assert.equal(rejected.exitCode, 2);
  assert.equal(rejected.analysisEligible, false);
  assert.equal(rejected.requiredChecks.find((check) => check.id === "paired-analysis").status, "failed");
  assert.equal(rejected.summary.pairedAnalysis.pValue, null);
});

for (const gate of ["cleanupOk", "identityProven"]) {
  test(`late real compiler ${gate} downgrade retains no inference`, () => {
    const final = compile(facts(), { [gate]: false });
    assert.notEqual(final.status, "passed");
    assert.equal(final.analysisEligible, false);
    assert.equal(final.requiredChecks.find((check) => check.id === "paired-analysis").status, "failed");
    assert.equal(final.summary.pairedAnalysis.pValue, null);
  });
}
