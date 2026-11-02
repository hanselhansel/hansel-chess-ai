import { Chess, type Move, type Square } from "chess.js";
import type { Promotion } from "./search-types.ts";

export type GamePosition = Readonly<{
  initialFen: string;
  movesUci: readonly string[];
  expectedFen: string;
}>;

export type PositionMove = Readonly<{
  from: Square;
  to: Square;
  promotion?: Promotion;
}>;

export type PositionState = Readonly<{
  board: Chess;
  rawEpTarget: Square | null;
}>;

type MutablePositionState = {
  board: Chess;
  rawEpTarget: Square | null;
  undoTargets: (Square | null)[];
};

const SQUARE_PATTERN = /^[a-h][1-8]$/;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function rawTargetFromFen(fen: string): Square | null {
  const field = fen.trim().split(/\s+/)[3];
  if (field === undefined || field === "-") return null;
  if (!SQUARE_PATTERN.test(field)) {
    throw new Error(`invalid en-passant field "${field}" in initial FEN`);
  }
  return field as Square;
}

function midpointTarget(move: Move): Square | null {
  if (move.piece !== "p" || move.from[0] !== move.to[0]) return null;
  const gap = Math.abs(move.to.charCodeAt(1) - move.from.charCodeAt(1));
  if (gap !== 2) return null;
  const rank = (move.to.charCodeAt(1) + move.from.charCodeAt(1)) / 2;
  return `${move.from[0]}${String.fromCharCode(rank)}` as Square;
}

function parseUci(uci: string): PositionMove {
  if (!UCI_PATTERN.test(uci)) {
    throw new Error(`malformed UCI move "${String(uci)}"`);
  }
  const move: { from: Square; to: Square; promotion?: Promotion } = {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
  };
  if (uci.length === 5) move.promotion = uci[4] as Promotion;
  return move;
}

export function capturePosition(
  initialFen: string,
  movesUci: readonly string[],
  expectedFen: string,
): GamePosition {
  return Object.freeze({
    initialFen,
    movesUci: Object.freeze([...movesUci]),
    expectedFen,
  });
}

const PRIVATE_STATE = new WeakMap<PositionState, MutablePositionState>();

function privateState(state: PositionState): MutablePositionState {
  const inner = PRIVATE_STATE.get(state);
  if (inner === undefined) {
    throw new Error("position state was not created by createPositionState");
  }
  return inner;
}

export function createPositionState(positionOrFen: GamePosition | string): PositionState {
  const initialFen =
    typeof positionOrFen === "string" ? positionOrFen : positionOrFen.initialFen;
  const inner: MutablePositionState = {
    board: new Chess(initialFen),
    rawEpTarget: rawTargetFromFen(initialFen),
    undoTargets: [],
  };
  const state: PositionState = Object.freeze({
    get board() {
      return inner.board;
    },
    get rawEpTarget() {
      return inner.rawEpTarget;
    },
  });
  PRIVATE_STATE.set(state, inner);
  if (typeof positionOrFen === "string") return state;
  for (const uci of positionOrFen.movesUci) {
    pushPositionMove(state, parseUci(uci));
  }
  const finalFen = state.board.fen();
  if (finalFen !== positionOrFen.expectedFen) {
    throw new Error(
      `position history reaches ${finalFen}, not expected ${positionOrFen.expectedFen}`,
    );
  }
  return state;
}

export function pushPositionMove(state: PositionState, move: PositionMove): Move {
  const s = privateState(state);
  const applied = s.board.move(
    move.promotion === undefined
      ? { from: move.from, to: move.to }
      : { from: move.from, to: move.to, promotion: move.promotion },
  );
  s.undoTargets.push(s.rawEpTarget);
  s.rawEpTarget = midpointTarget(applied);
  return applied;
}

export function undoPositionMove(state: PositionState): Move {
  const s = privateState(state);
  const undone = s.board.undo();
  if (!undone) {
    throw new Error("position history is empty; nothing to undo");
  }
  s.rawEpTarget = s.undoTargets.pop() ?? null;
  return undone;
}
