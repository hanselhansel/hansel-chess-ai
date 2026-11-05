// Canonical full-mainline PGNs and actual rules replay. No IO or inference.
import { Chess } from "chess.js";
import { FIXED_LIMITS } from "./schema-constants.mjs";

const fail = (detail) => {
  const error = new Error(`PGN_INVALID ${detail}`);
  error.code = "PGN_INVALID";
  return error;
};

export function checkpointResult(board) {
  if (board.isCheckmate()) {
    return board.turn() === "w" ? "0-1" : "1-0";
  }
  if (board.isStalemate() || board.isInsufficientMaterial() || board.isThreefoldRepetition() || board.isDraw()) {
    return "1/2-1/2";
  }
  return "*";
}

const applyHeaders = (board, phase, game, result) => {
  const white = phase === "preflight" ? "baseline" : game.candidateColor === "white" ? "candidate" : "baseline";
  const black = phase === "preflight" ? "baseline" : game.candidateColor === "black" ? "candidate" : "baseline";
  board.header(
    "Event", `tinyaz-browser-${phase}`, "Site", "127.0.0.1",
    "Round", `${game.pairNumber}.${game.gameNumber}`, "White", white, "Black", black,
    "Result", result, "SetUp", "1", "FEN", game.initialFen,
    "GameId", game.gameId, "OpeningId", game.openingId,
    "CandidateColor", game.candidateColor,
  );
  const rendered = board.pgn({ maxWidth: 0, newline: "\n" });
  // chess.js omits the blank separator for a zero-move PGN. Normalize
  // every full snapshot to the same strict header/mainline framing.
  const boundary = rendered.lastIndexOf("]\n");
  if (boundary < 0) {
    throw fail("rendered header framing");
  }
  return Buffer.from(`${rendered.slice(0, boundary + 1)}\n\n${rendered.slice(boundary + 2).trim()}\n`);
};

export function serializeCheckpointPgn({ phase, game, movesUci, result }) {
  const board = new Chess(game.initialFen);
  for (const uci of movesUci) {
    if (checkpointResult(board) !== "*") {
      throw fail("continuation after terminal");
    }
    const move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (move === null) {
      throw fail("illegal mainline");
    }
  }
  if (checkpointResult(board) !== result) {
    throw fail("rules result");
  }
  const bytes = applyHeaders(board, phase, game, result);
  if (bytes.length > FIXED_LIMITS.ipc.frameBytes) {
    throw fail("PGN byte ceiling");
  }
  return bytes;
}

export async function replayCheckpointPgn({ phase, game, bytes, budget }) {
  budget.assertLive("PGN replay");
  if (!Buffer.isBuffer(bytes) || bytes.length > FIXED_LIMITS.ipc.frameBytes) {
    throw fail("PGN byte ceiling");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const split = text.indexOf("\n\n");
  if (split < 0) {
    throw fail("header/mainline framing");
  }
  const tokens = text.slice(split + 2).trim().split(/\s+/);
  const board = new Chess(game.initialFen);
  const movesUci = [];
  let result = null;
  for (const [index, token] of tokens.entries()) {
    budget.assertLive("PGN replay move");
    if (/^[0-9]+\.(?:\.\.)?$/.test(token)) {
      continue;
    }
    if (["*", "1-0", "0-1", "1/2-1/2"].includes(token)) {
      if (index !== tokens.length - 1) {
        throw fail("result terminator");
      }
      result = token;
      break;
    }
    if (checkpointResult(board) !== "*") {
      throw fail("continuation after terminal");
    }
    const move = board.move(token, { strict: true });
    if (move === null) {
      throw fail("illegal PGN mainline");
    }
    movesUci.push(`${move.from}${move.to}${move.promotion ?? ""}`);
    if (movesUci.length % 16 === 0) {
      await new Promise(setImmediate);
      budget.assertLive("PGN replay yielded");
    }
  }
  if (result === null || checkpointResult(board) !== result ||
    !applyHeaders(board, phase, game, result).equals(bytes)) {
    throw fail("canonical headers/mainline/result");
  }
  budget.assertLive("PGN replay complete");
  return { movesUci, fen: board.fen(), result };
}
