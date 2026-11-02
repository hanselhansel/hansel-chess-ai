/** TinyAZ-S: 8 residual blocks × 64 channels. ~0.64M params. */

import type { CheckpointSpec } from "./checkpoint.ts";

export const N_PLANES = 19;
export const CHANNELS_S = 64;
export const CHANNELS_M = 128;
export const CHANNELS = CHANNELS_S;
export const N_BLOCKS = 8;
export const POLICY_PLANES = 73;
export const VALUE_CH = 8;
export const VALUE_HIDDEN = 64;
export const BOARD = 8;
export const SQUARES = 64;

export const C_PUCT = 1.5;
export const PLAY_VISITS = 64;
export const ONE_VISIT = 1;
/** Self-play target visits live in Python. JS play stays 64. */

export const SOURCE_RANDOM = 0;
export const SOURCE_LICHESS_2013_01 = 1;
export const SOURCE_SELFPLAY_64 = 2;
export const SOURCE_NAMES: Record<number, string> = {
  [SOURCE_RANDOM]: "random",
  [SOURCE_LICHESS_2013_01]: "lichess-2013-01",
  [SOURCE_SELFPLAY_64]: "selfplay-64",
};
export const WEIGHTS_URL = "/weights/tinyaz-m.bin";
export const MODEL_NAME = "tinyaz-m";
export const PARAM_CAP = 3_000_000;
/** Multiply-accumulates for one forward. FLOPs/move ≈ this × visits. */
export const FLOPS_PER_EVAL_S = 38_813_760;
export const FLOPS_PER_EVAL_M = 153_092_160;
export const FLOPS_PER_EVAL = FLOPS_PER_EVAL_M;

export const PACKED_WEIGHT_VERSION = 1;
export const THINK_PROTOCOL_VERSION = 1;
/** Whole-operation deadline for initialization or one move, in milliseconds. */
export const OPERATION_DEADLINE_MS = 90_000;
/** Subordinate worker start acknowledgement bound, in milliseconds. */
export const WORKER_ACK_MS = 8_000;
/** Explicit protocol visit bound: the existing UCI ceiling, not a clamp. */
export const MAX_VISITS = 4_096;

export function paramCount(channels: number = CHANNELS): number {
  const stem = N_PLANES * channels * 9 + channels;
  const block = 2 * (channels * channels * 9 + channels);
  const policy = channels * POLICY_PLANES + POLICY_PLANES;
  const vconv = channels * VALUE_CH + VALUE_CH;
  const fc1 = VALUE_CH * 64 * VALUE_HIDDEN + VALUE_HIDDEN;
  const fc2 = VALUE_HIDDEN + 1;
  return stem + N_BLOCKS * block + policy + vconv + fc1 + fc2;
}

export const SELECTED_CHECKPOINT = Object.freeze({
  name: MODEL_NAME,
  url: WEIGHTS_URL,
  packedVersion: PACKED_WEIGHT_VERSION,
  parameterCount: 2_426_706,
  byteLength: 9_706_840,
  expectedSha256: "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee",
} as const) satisfies CheckpointSpec;

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
