/** TinyAZ-S: 8 residual blocks × 64 channels. ~0.64M params. */

export const N_PLANES = 19;
export const CHANNELS = 64;
export const N_BLOCKS = 8;
export const POLICY_PLANES = 73;
export const VALUE_CH = 8;
export const VALUE_HIDDEN = 64;
export const BOARD = 8;
export const SQUARES = 64;

export const C_PUCT = 1.5;
export const PLAY_VISITS = 64;
export const ONE_VISIT = 1;

export const SOURCE_RANDOM = 0;
export const SOURCE_LICHESS_2013_01 = 1;
export const SOURCE_SELFPLAY_64 = 2;
export const SOURCE_NAMES: Record<number, string> = {
  [SOURCE_RANDOM]: "random",
  [SOURCE_LICHESS_2013_01]: "lichess-2013-01",
  [SOURCE_SELFPLAY_64]: "selfplay-64",
};
export const WEIGHTS_URL = "/weights/tinyaz-s.bin";
export const MODEL_NAME = "tinyaz-s";
export const PARAM_CAP = 3_000_000;

export const QUEEN_DIRS: readonly [number, number][] = [
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
];

export const KNIGHT_DELTAS: readonly [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

export function squareIndex(file: number, rank: number): number {
  return rank * 8 + file;
}

export function fileOf(i: number): number {
  return i & 7;
}

export function rankOf(i: number): number {
  return i >> 3;
}

/** Rank-flip only. Files stay put so kingside stays kingside. */
export function flipIndex(i: number): number {
  return i ^ 56;
}

export function algebraicToIndex(sq: string): number {
  return squareIndex(sq.charCodeAt(0) - 97, Number(sq[1]) - 1);
}

export function indexToAlgebraic(i: number): string {
  return `${String.fromCharCode(97 + fileOf(i))}${rankOf(i) + 1}`;
}
