import { encodeBoard } from "./encode.ts";
import {
  coreSearch,
  coreSearchAsync,
  diagnoseTerminal,
  type PositionEvaluator,
} from "./mcts-core.ts";
import { forward } from "./net.ts";
import { createPositionState, type PositionState } from "./position.ts";
import type { GamePosition } from "./position.ts";
import type { SearchControl, SearchOutcome } from "./search-types.ts";
import type { WeightSet } from "./weights.ts";

export { SearchCancelledError, SearchDeadlineError } from "./mcts-core.ts";
export type {
  ChildStat,
  DrawReason,
  Promotion,
  SearchControl,
  SearchOutcome,
  TerminalOutcome,
  ThinkResult,
} from "./search-types.ts";
export type { GamePosition } from "./position.ts";

/** Position replay failed: malformed FEN, illegal history, or wrong final FEN. */
export class PositionInvalidError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = "PositionInvalidError";
  }
}

function openState(positionOrFen: GamePosition | string): PositionState {
  try {
    return createPositionState(positionOrFen);
  } catch (cause) {
    throw new PositionInvalidError(cause);
  }
}

function evaluator(weights: WeightSet): PositionEvaluator {
  return (board, rawEpTarget) => forward(encodeBoard(board, rawEpTarget), weights);
}

/**
 * Search one position. A GamePosition replays the full move history (and its
 * raw en-passant state); a legacy FEN string keeps its documented
 * history-free semantics. Terminal positions return a typed terminal
 * outcome, never a fabricated move.
 */
export function search(
  positionOrFen: GamePosition | string,
  visits: number,
  weights: WeightSet,
  control?: SearchControl,
): SearchOutcome {
  return coreSearch(openState(positionOrFen), visits, evaluator(weights), control);
}

export async function searchAsync(
  positionOrFen: GamePosition | string,
  visits: number,
  weights: WeightSet,
  control?: SearchControl,
): Promise<SearchOutcome> {
  return coreSearchAsync(openState(positionOrFen), visits, evaluator(weights), control);
}

/**
 * Final acceptance check: replay the request position and confirm a move
 * outcome is legal there, or that a terminal outcome matches the real
 * terminal diagnosis. `"badpos"` means the context itself cannot be
 * reconstructed; `"illegal"` means the outcome is false for the position.
 */
export function verifyOutcome(
  position: GamePosition,
  outcome: SearchOutcome,
): "ok" | "illegal" | "badpos" {
  let board;
  try {
    board = createPositionState(position).board;
  } catch {
    return "badpos";
  }
  if (outcome.kind === "move") {
    const legal = board
      .moves({ verbose: true })
      .some((m) => m.from + m.to + (m.promotion ?? "") === outcome.result.uci);
    return legal ? "ok" : "illegal";
  }
  const expected = diagnoseTerminal(board);
  return expected !== null &&
    expected.reason === outcome.terminal.reason &&
    expected.winner === outcome.terminal.winner
    ? "ok"
    : "illegal";
}
