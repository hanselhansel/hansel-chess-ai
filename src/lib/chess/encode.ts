import { Chess, type Piece, type Square } from "chess.js";
import { N_PLANES, SQUARES, algebraicToIndex, flipIndex } from "./constants.ts";

const PIECE_ORDER = ["p", "n", "b", "r", "q", "k"] as const;

function piecePlane(piece: Piece, us: "w" | "b"): number {
  const idx = PIECE_ORDER.indexOf(piece.type);
  const ours = piece.color === us;
  return ours ? idx : 6 + idx;
}

/**
 * Raw en-passant target for the side to move: the last move's pawn
 * double-push, or the loaded FEN's declared square (which chess.js keeps on
 * `_epSquare` even when no pawn can capture it). Played non-capturable
 * double-pushes are not retained by chess.js, so the midpoint is derived
 * from move history rather than the board FEN.
 */
function lastRawTarget(chess: Chess): Square | null {
  const history = chess.history({ verbose: true });
  if (history.length > 0) {
    const move = history[history.length - 1];
    if (move.piece === "p" && move.from[0] === move.to[0]) {
      const gap = Math.abs(move.to.charCodeAt(1) - move.from.charCodeAt(1));
      if (gap === 2) {
        const rank = (move.to.charCodeAt(1) + move.from.charCodeAt(1)) / 2;
        return `${move.from[0]}${String.fromCharCode(rank)}` as Square;
      }
    }
    return null;
  }
  const ep = chess.fen({ forceEnpassantSquare: true }).split(" ")[3];
  return ep !== undefined && ep !== "-" ? (ep as Square) : null;
}

/**
 * 19 × 64 planes, side-to-move canonical (us on the "bottom").
 * `rawEpTarget` is the explicit raw en-passant square search maintains:
 * pass `null` for none; omit it to derive the target from move history or
 * the loaded FEN.
 */
export function encodeBoard(chess: Chess, rawEpTarget?: Square | null): Float32Array {
  const out = new Float32Array(N_PLANES * SQUARES);
  const us = chess.turn();
  const flip = us === "b";

  const board = chess.board();
  for (let rankFromTop = 0; rankFromTop < 8; rankFromTop++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rankFromTop][file];
      if (!piece) continue;
      const rank = 7 - rankFromTop;
      let i = rank * 8 + file;
      if (flip) i = flipIndex(i);
      const p = piecePlane(piece, us);
      out[p * 64 + i] = 1;
    }
  }

  const rights = chess.fen().split(" ")[2] ?? "-";
  const fill = (plane: number) => {
    const off = plane * 64;
    for (let i = 0; i < 64; i++) out[off + i] = 1;
  };
  if (us === "w") {
    if (rights.includes("K")) fill(12);
    if (rights.includes("Q")) fill(13);
    if (rights.includes("k")) fill(14);
    if (rights.includes("q")) fill(15);
  } else {
    if (rights.includes("k")) fill(12);
    if (rights.includes("q")) fill(13);
    if (rights.includes("K")) fill(14);
    if (rights.includes("Q")) fill(15);
  }

  const ep = rawEpTarget === undefined ? lastRawTarget(chess) : rawEpTarget;
  if (ep !== null) {
    let i = algebraicToIndex(ep);
    if (flip) i = flipIndex(i);
    out[16 * 64 + i] = 1;
  }

  const parts = chess.fen().split(" ");
  const halfN = Math.min(Number(parts[4] ?? 0) / 100, 1);
  const fullN = Math.min(Number(parts[5] ?? 1) / 200, 1);
  for (let i = 0; i < 64; i++) {
    out[17 * 64 + i] = halfN;
    out[18 * 64 + i] = fullN;
  }

  return out;
}

export function stmIsBlack(chess: Chess): boolean {
  return chess.turn() === "b";
}
