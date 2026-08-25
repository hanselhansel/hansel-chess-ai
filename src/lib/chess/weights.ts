import {
  CHANNELS,
  N_BLOCKS,
  N_PLANES,
  POLICY_PLANES,
  VALUE_CH,
  VALUE_HIDDEN,
} from "./constants.ts";

export type WeightSet = {
  stemW: Float32Array;
  stemB: Float32Array;
  blocks: { w1: Float32Array; b1: Float32Array; w2: Float32Array; b2: Float32Array }[];
  policyW: Float32Array;
  policyB: Float32Array;
  valueConvW: Float32Array;
  valueConvB: Float32Array;
  valueFc1W: Float32Array;
  valueFc1B: Float32Array;
  valueFc2W: Float32Array;
  valueFc2B: Float32Array;
  seed: number;
  paramCount: number;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function kaiming(out: Float32Array, fanIn: number, rng: () => number) {
  const std = Math.sqrt(2 / fanIn);
  for (let i = 0; i < out.length; i++) out[i] = randn(rng) * std;
}

function zeros(n: number): Float32Array {
  return new Float32Array(n);
}

export function paramCount(): number {
  const stem = N_PLANES * CHANNELS * 9 + CHANNELS;
  const block = 2 * (CHANNELS * CHANNELS * 9 + CHANNELS);
  const policy = CHANNELS * POLICY_PLANES + POLICY_PLANES;
  const vconv = CHANNELS * VALUE_CH + VALUE_CH;
  const fc1 = VALUE_CH * 64 * VALUE_HIDDEN + VALUE_HIDDEN;
  const fc2 = VALUE_HIDDEN + 1;
  return stem + N_BLOCKS * block + policy + vconv + fc1 + fc2;
}

export function randomWeights(seed = 1): WeightSet {
  const rng = mulberry32(seed);
  const convW = (cout: number, cin: number) => {
    const w = new Float32Array(cout * cin * 9);
    kaiming(w, cin * 9, rng);
    return w;
  };
  const fcW = (rows: number, cols: number) => {
    const w = new Float32Array(rows * cols);
    kaiming(w, cols, rng);
    return w;
  };
  const linW = (cout: number, cin: number) => {
    const w = new Float32Array(cout * cin);
    kaiming(w, cin, rng);
    return w;
  };
  const blocks = [];
  for (let i = 0; i < N_BLOCKS; i++) {
    blocks.push({
      w1: convW(CHANNELS, CHANNELS),
      b1: zeros(CHANNELS),
      w2: convW(CHANNELS, CHANNELS),
      b2: zeros(CHANNELS),
    });
  }
  return {
    stemW: convW(CHANNELS, N_PLANES),
    stemB: zeros(CHANNELS),
    blocks,
    policyW: linW(POLICY_PLANES, CHANNELS),
    policyB: zeros(POLICY_PLANES),
    valueConvW: linW(VALUE_CH, CHANNELS),
    valueConvB: zeros(VALUE_CH),
    valueFc1W: fcW(VALUE_HIDDEN, VALUE_CH * 64),
    valueFc1B: zeros(VALUE_HIDDEN),
    valueFc2W: fcW(1, VALUE_HIDDEN),
    valueFc2B: zeros(1),
    seed,
    paramCount: paramCount(),
  };
}
