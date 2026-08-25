import { Chess, type Move } from "chess.js";
import { C_PUCT } from "./constants.ts";
import { encodeBoard } from "./encode.ts";
import { forward } from "./net.ts";
import { legalLogits, softmax } from "./policy.ts";
import type { WeightSet } from "./weights.ts";

export type ChildStat = {
  san: string;
  uci: string;
  visits: number;
  q: number;
  prior: number;
};

export type ThinkResult = {
  uci: string;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  value: number;
  visits: number;
  ms: number;
  children: ChildStat[];
  heatmap: Record<string, number>;
};

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

function evaluate(chess: Chess, node: Node, weights: WeightSet): number {
  if (chess.isCheckmate()) {
    node.terminal = true;
    node.terminalValue = -1;
    node.expanded = true;
    return -1;
  }
  if (chess.isDraw() || chess.isGameOver()) {
    node.terminal = true;
    node.terminalValue = 0;
    node.expanded = true;
    return 0;
  }
  const legal = chess.moves({ verbose: true });
  const planes = encodeBoard(chess);
  const { policy, value } = forward(planes, weights);
  const flip = chess.turn() === "b";
  const logits = legalLogits(policy, legal, flip);
  const priors = softmax(logits);
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

function oneVisit(root: Node, fen: string, weights: WeightSet): void {
  const chess = new Chess(fen);
  let node = root;
  if (!node.expanded) {
    const val = evaluate(chess, node, weights);
    node.visits += 1;
    node.valueSum += val;
    return;
  }
  while (node.expanded && !node.terminal && node.children.length) {
    node = select(node);
    if (node.move) chess.move(node.move);
  }
  let value: number;
  if (node.terminal) {
    value = node.terminalValue;
  } else {
    value = evaluate(chess, node, weights);
  }
  let walk: Node | null = node;
  let sign = 1;
  while (walk) {
    walk.visits += 1;
    walk.valueSum += value * sign;
    sign = -sign;
    walk = walk.parent;
  }
}

function finish(root: Node, visits: number, t0: number): ThinkResult {
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

  const heatmap: Record<string, number> = {};
  let maxP = 0;
  for (const ch of root.children) {
    maxP = Math.max(maxP, ch.prior);
  }
  for (const ch of root.children) {
    heatmap[ch.move!.to] = Math.max(heatmap[ch.move!.to] ?? 0, ch.prior / (maxP || 1));
  }

  return {
    uci: uciOf(move),
    san: move.san,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    value: root.visits ? root.valueSum / root.visits : 0,
    visits,
    ms: Math.round(performance.now() - t0),
    children,
    heatmap,
  };
}

export function search(fen: string, visits: number, weights: WeightSet): ThinkResult {
  const t0 = performance.now();
  const root = makeRoot();
  for (let v = 0; v < visits; v++) oneVisit(root, fen, weights);
  return finish(root, visits, t0);
}

export async function searchAsync(
  fen: string,
  visits: number,
  weights: WeightSet,
): Promise<ThinkResult> {
  const t0 = performance.now();
  const root = makeRoot();
  for (let v = 0; v < visits; v++) {
    oneVisit(root, fen, weights);
    if (visits > 1 && (v & 3) === 3) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return finish(root, visits, t0);
}
