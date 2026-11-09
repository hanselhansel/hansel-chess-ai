// Fixed protocol/opening validation and deterministic schedule data only.
// Actual chess.js rules verify prefixes; no engine or model executes here.
import { V2_POLICY } from "./evaluation-policy.mjs";
import { Chess } from "chess.js";
import { exactFields, isObj, strNE } from "./protocol-values.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { PROTOCOL_IDS, FIXED_LIMITS, REQUIRED_CHECK_IDS } from "./schema-constants.mjs";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CONTROL = "7k/8/8/8/8/8/8/KR6 w - - 99 50";
const LOCKED_PREFIXES = Object.freeze([
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4",
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d6",
  "e2e4 e7e5 b1c3 g8f6 f2f4 d7d5",
  "e2e4 e7e5 g1f3 d7d6 d2d4 g8f6",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4",
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4",
  "e2e4 e7e6 d2d4 d7d5 b1c3 f8b4",
  "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4",
  "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6",
  "e2e4 d7d5 e4d5 d8d5 b1c3 d5a5",
  "e2e4 g8f6 e4e5 f6d5 d2d4 d7d6",
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6",
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6",
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7",
  "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5",
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4",
  "c2c4 e7e5 b1c3 g8f6 g1f3 b8c6",
  "g1f3 d7d5 c2c4 d5d4 e2e3 b8c6"
]);
const fail = (detail) => {
  const error = new Error(`FIXTURE_INVALID ${detail}`);
  error.code = "FIXTURE_INVALID";
  return error;
};
const fields = (value, names, detail) => {
  if (!isObj(value) || !exactFields(value, names)) {
    throw fail(detail);
  }
};

export function validateProtocolFixture(value) {
  fields(value, ["schemaVersion", "conventions", "limits", "requiredCheckIds", "preflight", "comparison",
    ...(value?.schemaVersion === 2 ? ["evaluationPolicy"] : [])], "protocol fields");
  if (value.schemaVersion === 2 && !deepEqual(value.evaluationPolicy, V2_POLICY)) throw fail("protocol policy");
  if (![1, 2].includes(value.schemaVersion) || !deepEqual(value.conventions, PROTOCOL_IDS) ||
    !deepEqual(value.limits, FIXED_LIMITS) || !deepEqual(value.requiredCheckIds, REQUIRED_CHECK_IDS)) {
    throw fail("protocol literals");
  }
  fields(value.preflight, ["controlFen", "freshRequestsPerArm"], "preflight fields");
  fields(value.comparison, ["openingCount", "gameCount"], "comparison fields");
  if (value.preflight.controlFen !== CONTROL || value.preflight.freshRequestsPerArm !== 5 ||
    value.comparison.openingCount !== 20 || value.comparison.gameCount !== 40) {
    throw fail("schedule literals");
  }
  return freezeDeep(structuredClone(value));
}

export function validateOpeningFixture(value) {
  fields(value, ["schemaVersion", "openings"], "opening fields");
  if (value.schemaVersion !== 1 || !Array.isArray(value.openings) || value.openings.length !== 20) {
    throw fail("opening suite");
  }
  const seen = new Set();
  for (const [index, opening] of value.openings.entries()) {
    fields(opening, ["id", "label", "initialFen", "movesUci"], "opening entry fields");
    if (opening.id !== `p${String(index + 1).padStart(2, "0")}` || !strNE(opening.label) ||
      opening.initialFen !== START || !Array.isArray(opening.movesUci) ||
      opening.movesUci.join(" ") !== LOCKED_PREFIXES[index]) {
      throw fail("locked prefix");
    }
    const board = new Chess(opening.initialFen);
    for (const uci of opening.movesUci) {
      const result = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      if (result === null) {
        throw fail("illegal opening move");
      }
    }
    if (board.turn() !== "w" || board.isGameOver() || seen.has(board.fen())) {
      throw fail("opening end position");
    }
    seen.add(board.fen());
  }
  return freezeDeep(structuredClone(value));
}

export function buildGameSchedule(options) {
  if (!isObj(options) || !["preflight", "compare"].includes(options.phase) ||
    !Object.keys(options).every((key) => ["phase", "openings"].includes(key))) {
    throw fail("schedule fields");
  }
  if (options.phase === "preflight") {
    if (Object.hasOwn(options, "openings")) {
      throw fail("preflight cannot consume final openings");
    }
    return freezeDeep([1, 2].map((gameNumber) => ({
      gameId: `aa-g${gameNumber}`, pairNumber: 1, gameNumber,
      openingId: "aa-control", candidateColor: gameNumber === 1 ? "white" : "black",
      initialFen: CONTROL, movesUci: [],
    })));
  }
  const fixture = validateOpeningFixture(options.openings);
  return freezeDeep(fixture.openings.flatMap((opening, index) => [1, 2].map((gameNumber) => ({
    gameId: `${opening.id}-g${gameNumber}`, pairNumber: index + 1, gameNumber,
    openingId: opening.id,
    candidateColor: (index % 2 === 0) === (gameNumber === 1) ? "white" : "black",
    initialFen: opening.initialFen, movesUci: [...opening.movesUci],
  }))));
}

export function validateGameSchedule({ phase, gameSchedule }) {
  let expected;
  if (phase === "preflight") {
    expected = buildGameSchedule({ phase });
  } else if (phase === "compare" && Array.isArray(gameSchedule)) {
    const openings = gameSchedule.filter((game) => game.gameNumber === 1).map((game) => ({
      id: game.openingId, label: game.openingId,
      initialFen: game.initialFen, movesUci: game.movesUci,
    }));
    expected = buildGameSchedule({ phase, openings: { schemaVersion: 1, openings } });
  } else {
    throw fail("PGN phase schedule");
  }
  if (!deepEqual(gameSchedule, expected)) {
    throw fail("game schedule binding");
  }
  return expected;
}
