import type { Square } from "chess.js";

export type Promotion = "q" | "r" | "b" | "n";
export type ChildStat = Readonly<{
  san: string;
  uci: string;
  visits: number;
  q: number;
  prior: number;
}>;
export type ThinkResult = Readonly<{
  uci: string;
  san: string;
  from: Square;
  to: Square;
  promotion?: Promotion;
  value: number;
  visits: number;
  ms: number;
  children: readonly ChildStat[];
  heatmap: Readonly<Partial<Record<Square, number>>>;
}>;
export type DrawReason =
  | "stalemate"
  | "insufficient-material"
  | "threefold-repetition"
  | "fifty-move";
export type TerminalOutcome =
  | Readonly<{ reason: "checkmate"; winner: "w" | "b" }>
  | Readonly<{ reason: DrawReason; winner: null }>;
export type SearchOutcome =
  | Readonly<{
      kind: "move";
      result: ThinkResult;
      completedVisits: number;
      searchMs: number;
    }>
  | Readonly<{
      kind: "terminal";
      terminal: TerminalOutcome;
      completedVisits: 0;
      searchMs: number;
    }>;
export type SearchControl = Readonly<{
  signal: AbortSignal;
  deadlineMs: number;
  now: () => number;
}>;
