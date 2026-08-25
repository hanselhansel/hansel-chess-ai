import {
  KNIGHT_DELTAS,
  POLICY_PLANES,
  QUEEN_DIRS,
  algebraicToIndex,
  fileOf,
  flipIndex,
  rankOf,
} from "./constants.ts";

export type PromoPiece = "q" | "n" | "b" | "r" | undefined;

/** Map a STM-canonical move to a 73-plane policy index, or -1 if unrepresentable. */
export function moveToPlane(
  from: number,
  to: number,
  promotion: PromoPiece,
): number {
  const fr = rankOf(from);
  const ff = fileOf(from);
  const tr = rankOf(to);
  const tf = fileOf(to);
  const dr = tr - fr;
  const df = tf - ff;

  if (promotion && promotion !== "q") {
    const pieceIdx = promotion === "n" ? 0 : promotion === "b" ? 1 : 2;
    const dirIdx = df + 1;
    if (dirIdx < 0 || dirIdx > 2) return -1;
    return 64 + pieceIdx * 3 + dirIdx;
  }

  for (let k = 0; k < 8; k++) {
    const [kd, kr] = KNIGHT_DELTAS[k];
    if (df === kd && dr === kr) return 56 + k;
  }

  for (let d = 0; d < 8; d++) {
    const [ddf, ddr] = QUEEN_DIRS[d];
    if (ddf === 0 && df !== 0) continue;
    if (ddr === 0 && dr !== 0) continue;
    if (ddf !== 0 && ddr !== 0 && Math.abs(df) !== Math.abs(dr)) continue;
    if (Math.sign(df) !== Math.sign(ddf) && df !== 0) continue;
    if (Math.sign(dr) !== Math.sign(ddr) && dr !== 0) continue;
    const dist = Math.max(Math.abs(df), Math.abs(dr));
    if (dist < 1 || dist > 7) continue;
    if (ddf !== 0 && Math.abs(df) !== dist) continue;
    if (ddr !== 0 && Math.abs(dr) !== dist) continue;
    return d * 7 + (dist - 1);
  }
  return -1;
}

export function encodeMovePlane(
  fromAlg: string,
  toAlg: string,
  promotion: PromoPiece,
  flip: boolean,
): { from: number; plane: number } {
  let from = algebraicToIndex(fromAlg);
  let to = algebraicToIndex(toAlg);
  if (flip) {
    from = flipIndex(from);
    to = flipIndex(to);
  }
  return { from, plane: moveToPlane(from, to, promotion) };
}

export function legalLogits(
  policy: Float32Array,
  moves: { from: string; to: string; promotion?: string }[],
  flip: boolean,
): number[] {
  return moves.map((m) => {
    const { from, plane } = encodeMovePlane(
      m.from,
      m.to,
      m.promotion as PromoPiece,
      flip,
    );
    if (plane < 0 || plane >= POLICY_PLANES) return -1e9;
    return policy[plane * 64 + from];
  });
}

export function softmax(logits: number[]): number[] {
  let max = -Infinity;
  for (const x of logits) if (x > max) max = x;
  const exps = logits.map((x) => Math.exp(x - max));
  let sum = 0;
  for (const e of exps) sum += e;
  if (sum <= 0) return logits.map(() => 1 / logits.length);
  return exps.map((e) => e / sum);
}
