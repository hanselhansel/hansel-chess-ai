// Pure final-facts derivation only. The caller is the actual closed-facts
// compiler, after cleanup/identity verification, never the live driver.
import { canonicalBytes } from "./canonical-json.mjs";
import { exactFields, isObj, isRef, nat, strNE } from "./protocol-values.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { summarizePairs } from "./stats.mjs";

const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));
const terminal = (result) => ["1-0", "0-1", "1/2-1/2"].includes(result);
const bodyFields = ["schemaVersion", "frozen", "firstStopReason", "freezeAtMonoNs", "games", "diagnostics"];
const gameFields = ["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor", "state", "result", "stopReason", "checkpoint"];
const checkpointFields = ["checkpointId", "ordinal", "slot", "plyCount", "initialFen", "fen", "pgn"];

export function deriveFinalGameEvidence({ request, status, artifactRefs, cleanupOk, identityProven, faults, recordSchemaVersion = 1, scienceProven = false }) {
  const next = copy(request);
  const summary = isObj(next.summary) ? next.summary : {};
  for (const key of ["pairedAnalysis", "pValue", "interval95", "conditionalEstimate", "classification", "analysisEligible", "elo", "Elo"]) {
    delete summary[key];
  }
  const body = summary.gameEvidence;
  const inventory = new Map(artifactRefs.map((ref) => [ref.path, ref]));
  let proven = true;
  let reason = null;
  let pairs = [];
  const reject = (detail) => {
    proven = false;
    if (reason === null) {
      reason = detail;
    }
  };
  if (!isObj(body) || !exactFields(body, bodyFields) || body.schemaVersion !== 1 || body.frozen !== true ||
    !(body.firstStopReason === null || strNE(body.firstStopReason)) ||
    typeof body.freezeAtMonoNs !== "string" || !/^(0|[1-9][0-9]*)$/.test(body.freezeAtMonoNs) ||
    !Array.isArray(body.games) || body.games.length > 40 || !Array.isArray(body.diagnostics)) {
    reject("frozen supervisor body");
  } else {
    for (const [index, game] of body.games.entries()) {
      const pairNumber = Math.floor(index / 2) + 1;
      const gameNumber = index % 2 + 1;
      const openingId = `p${String(pairNumber).padStart(2, "0")}`;
      const candidateColor = (pairNumber % 2 === 1) === (gameNumber === 1) ? "white" : "black";
      if (!isObj(game) || !exactFields(game, gameFields) || game.gameId !== `${openingId}-g${gameNumber}` ||
        game.pairNumber !== pairNumber || game.gameNumber !== gameNumber || game.openingId !== openingId ||
        game.candidateColor !== candidateColor || !isObj(game.checkpoint) || !exactFields(game.checkpoint, checkpointFields) ||
        !nat(game.checkpoint.ordinal) || !nat(game.checkpoint.plyCount) ||
        !strNE(game.checkpoint.initialFen) || !strNE(game.checkpoint.fen) ||
        game.checkpoint.checkpointId !== `${game.gameId}-c${game.checkpoint.ordinal}` ||
        game.checkpoint.slot !== (game.checkpoint.ordinal % 2 === 0 ? "a" : "b") ||
        !isRef(game.checkpoint.pgn) || !deepEqual(inventory.get(game.checkpoint.pgn.path), game.checkpoint.pgn) ||
        game.checkpoint.pgn.path !== `compare/games/${game.gameId}.${game.checkpoint.slot}.pgn` ||
        !["a", "b"].includes(game.checkpoint.slot) ||
        !(game.state === "complete" && terminal(game.result) && game.stopReason === null ||
          game.state === "incomplete" && game.result === "*" && index === body.games.length - 1 && game.stopReason === body.firstStopReason)) {
        reject("selected checkpoint/rules/schedule/inventory binding");
        break;
      }
      if (gameNumber === 1) {
        pairs.push({ pairNumber, openingId, games: [] });
      }
      pairs[pairs.length - 1].games.push({ gameNumber, candidateColor, result: game.result });
    }
  }
  if (!proven) {
    // Preserve original claimed results in gameEvidence as unproven data.
    // No changed/missing selected ref is reclassified into a result.
    pairs = [];
  }
  const complete = proven && pairs.length === 20 && pairs.every((pair) => pair.games.length === 2 && pair.games.every((game) => terminal(game.result)));
  const inferenceAllowed = complete && (recordSchemaVersion === 2 ? scienceProven === true : status === "passed") && cleanupOk === true && identityProven === true &&
    faults === 0 && next.stopReason === null && body.firstStopReason === null;
  const analysis = summarizePairs(pairs, {
    unplannedFaultCount: faults,
    stoppedEarly: !inferenceAllowed,
    cleanupVerified: cleanupOk === true && identityProven === true,
  });
  summary.gameEvidenceValidation = { proven, reason };
  summary.pairedAnalysis = analysis;
  next.summary = summary;
  next.analysisEligible = analysis.analysisEligible;
  return freezeDeep({
    request: next,
    status: !complete ? "inconclusive" : status,
    pairedCheckPassed: analysis.analysisEligible,
  });
}
