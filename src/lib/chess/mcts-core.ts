import type { Chess, Move, Square } from "chess.js";
import { C_PUCT } from "./constants.ts";
import type { NetOut } from "./net.ts";
import { legalLogits, softmax } from "./policy.ts";
import {
  pushPositionMove,
  undoPositionMove,
  type PositionMove,
  type PositionState,
} from "./position.ts";
import type {
  ChildStat,
  Promotion,
  SearchControl,
  SearchOutcome,
  TerminalOutcome,
  ThinkResult,
} from "./search-types.ts";
import { thinkRuntime } from "./think-runtime.ts";

/** Internal evaluator seam: tests inject deterministic fakes, production wraps forward(). */
export type PositionEvaluator = (board: Chess, rawEpTarget: Square | null) => NetOut;

export class SearchCancelledError extends Error {
  constructor() {
    super("search cancelled");
    this.name = "SearchCancelledError";
  }
}

export class SearchDeadlineError extends Error {
  constructor() {
    super("search deadline exceeded");
    this.name = "SearchDeadlineError";
  }
}

type Node = {
  parent: Node | null;
  move: Move | null;
  prior: number;
  visits: number;
  valueSum: number;
  children: Node[];
  expanded: boolean;
  terminal: boolean;
  terminalValue: number;
};

function uciOf(m: Move): string {
  return m.from + m.to + (m.promotion ?? "");
}

function asPromotion(u: string | undefined): Promotion | undefined {
  return u === "q" || u === "r" || u === "b" || u === "n" ? u : undefined;
}

function toPositionMove(m: Move): PositionMove {
  const promotion = asPromotion(m.promotion);
  return promotion === undefined
    ? { from: m.from, to: m.to }
    : { from: m.from, to: m.to, promotion };
}

/** Terminal truth for the position to move, or null when play continues. */
export function diagnoseTerminal(board: Chess): TerminalOutcome | null {
  if (board.isCheckmate()) {
    return { reason: "checkmate", winner: board.turn() === "w" ? "b" : "w" };
  }
  if (board.isStalemate()) return { reason: "stalemate", winner: null };
  if (board.isInsufficientMaterial()) {
    return { reason: "insufficient-material", winner: null };
  }
  if (board.isThreefoldRepetition()) {
    return { reason: "threefold-repetition", winner: null };
  }
  if (board.isDrawByFiftyMoves()) return { reason: "fifty-move", winner: null };
  return null;
}

function checkControl(control?: SearchControl): void {
  if (control === undefined) return;
  if (control.signal.aborted) throw new SearchCancelledError();
  if (control.now() >= control.deadlineMs) throw new SearchDeadlineError();
}

function makeRoot(): Node {
  return {
    parent: null,
    move: null,
    prior: 1,
    visits: 0,
    valueSum: 0,
    children: [],
    expanded: false,
    terminal: false,
    terminalValue: 0,
  };
}

function select(node: Node): Node {
  let best = node.children[0];
  let bestScore = -Infinity;
  const parentN = Math.sqrt(node.visits + 1e-8);
  for (const ch of node.children) {
    const q = ch.visits === 0 ? 0 : -(ch.valueSum / ch.visits);
    const u = (C_PUCT * ch.prior * parentN) / (1 + ch.visits);
    const s = q + u;
    if (s > bestScore) {
      bestScore = s;
      best = ch;
    }
  }
  return best;
}

function evaluateNode(
  state: PositionState,
  node: Node,
  evaluate: PositionEvaluator,
): number {
  const board = state.board;
  if (board.isCheckmate()) {
    node.terminal = true;
    node.terminalValue = -1;
    node.expanded = true;
    return -1;
  }
  if (board.isDraw() || board.isGameOver()) {
    node.terminal = true;
    node.terminalValue = 0;
    node.expanded = true;
    return 0;
  }
  const legal = board.moves({ verbose: true });
  const { policy, value } = evaluate(board, state.rawEpTarget);
  const flip = board.turn() === "b";
  const priors = softmax(legalLogits(policy, legal, flip));
  node.children = legal.map((m, i) => ({
    parent: node,
    move: m,
    prior: priors[i],
    visits: 0,
    valueSum: 0,
    children: [],
    expanded: false,
    terminal: false,
    terminalValue: 0,
  }));
  node.expanded = true;
  return value;
}

function oneVisit(root: Node, state: PositionState, evaluate: PositionEvaluator): void {
  let pushed = 0;
  try {
    let node = root;
    if (!node.expanded) {
      const val = evaluateNode(state, node, evaluate);
      node.visits += 1;
      node.valueSum += val;
      return;
    }
    while (node.expanded && !node.terminal && node.children.length) {
      node = select(node);
      if (node.move) {
        pushPositionMove(state, toPositionMove(node.move));
        pushed += 1;
      }
    }
    const value = node.terminal
      ? node.terminalValue
      : evaluateNode(state, node, evaluate);
    let walk: Node | null = node;
    let sign = 1;
    while (walk) {
      walk.visits += 1;
      walk.valueSum += value * sign;
      sign = -sign;
      walk = walk.parent;
    }
  } finally {
    while (pushed > 0) {
      undoPositionMove(state);
      pushed -= 1;
    }
  }
}

function finishMove(root: Node, visits: number, searchMs: number): SearchOutcome {
  const ranked = [...root.children].sort((a, b) => {
    if (b.visits !== a.visits) return b.visits - a.visits;
    return b.prior - a.prior;
  });
  const best = ranked[0];
  if (!best?.move) {
    throw new Error("search produced no legal move");
  }
  const move = best.move;
  const children: ChildStat[] = ranked.slice(0, 8).map((ch) => ({
    san: ch.move!.san,
    uci: uciOf(ch.move!),
    visits: ch.visits,
    q: ch.visits ? -(ch.valueSum / ch.visits) : 0,
    prior: ch.prior,
  }));
  const heatmap: Partial<Record<Square, number>> = {};
  let maxP = 0;
  for (const ch of root.children) maxP = Math.max(maxP, ch.prior);
  for (const ch of root.children) {
    heatmap[ch.move!.to] = Math.max(heatmap[ch.move!.to] ?? 0, ch.prior / (maxP || 1));
  }
  const promotion = asPromotion(move.promotion);
  const result: ThinkResult = {
    uci: uciOf(move),
    san: move.san,
    from: move.from,
    to: move.to,
    ...(promotion === undefined ? {} : { promotion }),
    value: root.visits ? root.valueSum / root.visits : 0,
    visits,
    ms: Math.round(searchMs),
    children,
    heatmap,
  };
  return { kind: "move", result, completedVisits: visits, searchMs };
}

export function coreSearch(
  state: PositionState,
  visits: number,
  evaluate: PositionEvaluator,
  control?: SearchControl,
): SearchOutcome {
  const now = control?.now ?? (() => thinkRuntime.now());
  const t0 = now();
  checkControl(control);
  const terminal = diagnoseTerminal(state.board);
  checkControl(control);
  if (terminal) {
    return { kind: "terminal", terminal, completedVisits: 0, searchMs: now() - t0 };
  }
  const root = makeRoot();
  for (let v = 0; v < visits; v++) {
    checkControl(control);
    oneVisit(root, state, evaluate);
  }
  checkControl(control);
  return finishMove(root, visits, now() - t0);
}

export async function coreSearchAsync(
  state: PositionState,
  visits: number,
  evaluate: PositionEvaluator,
  control?: SearchControl,
): Promise<SearchOutcome> {
  const now = control?.now ?? (() => thinkRuntime.now());
  const t0 = now();
  checkControl(control);
  const terminal = diagnoseTerminal(state.board);
  checkControl(control);
  if (terminal) {
    return { kind: "terminal", terminal, completedVisits: 0, searchMs: now() - t0 };
  }
  const root = makeRoot();
  for (let v = 0; v < visits; v++) {
    checkControl(control);
    oneVisit(root, state, evaluate);
    if (visits > 1 && (v & 3) === 3) {
      await new Promise<void>((r) => {
        thinkRuntime.setTimeout(r, 0);
      });
    }
  }
  checkControl(control);
  return finishMove(root, visits, now() - t0);
}
