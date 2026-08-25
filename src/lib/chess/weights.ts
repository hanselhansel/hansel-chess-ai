import {
  CHANNELS,
  N_BLOCKS,
  N_PLANES,
  POLICY_PLANES,
  SOURCE_NAMES,
  SOURCE_RANDOM,
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
  source: string;
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
    source: "random",
  };
}

const TENSOR_SIZES = [
  CHANNELS * N_PLANES * 9,
  CHANNELS,
  ...Array.from({ length: N_BLOCKS }, () => [
    CHANNELS * CHANNELS * 9,
    CHANNELS,
    CHANNELS * CHANNELS * 9,
    CHANNELS,
  ]).flat(),
  POLICY_PLANES * CHANNELS,
  POLICY_PLANES,
  VALUE_CH * CHANNELS,
  VALUE_CH,
  VALUE_HIDDEN * VALUE_CH * 64,
  VALUE_HIDDEN,
  VALUE_HIDDEN,
  1,
];

function asArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(data);
  return copy;
}

export function unpackWeights(data: ArrayBuffer | Uint8Array): WeightSet {
  const buf = asArrayBuffer(data);
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "TAZS") throw new Error(`bad weight magic ${magic}`);
  const version = view.getUint32(4, true);
  if (version !== 1) throw new Error(`bad weight version ${version}`);
  const n = view.getUint32(8, true);
  const sourceId = view.getUint32(12, true);
  if (n !== paramCount()) throw new Error(`weight count ${n} != ${paramCount()}`);
  let o = 16;
  const take = (len: number) => {
    const a = new Float32Array(buf, o, len);
    o += len * 4;
    return a.slice();
  };
  const parts = TENSOR_SIZES.map(take);
  const blocks = [];
  let i = 2;
  for (let b = 0; b < N_BLOCKS; b++) {
    blocks.push({ w1: parts[i], b1: parts[i + 1], w2: parts[i + 2], b2: parts[i + 3] });
    i += 4;
  }
  return {
    stemW: parts[0],
    stemB: parts[1],
    blocks,
    policyW: parts[i],
    policyB: parts[i + 1],
    valueConvW: parts[i + 2],
    valueConvB: parts[i + 3],
    valueFc1W: parts[i + 4],
    valueFc1B: parts[i + 5],
    valueFc2W: parts[i + 6],
    valueFc2B: parts[i + 7],
    seed: sourceId === SOURCE_RANDOM ? 2026 : 0,
    paramCount: n,
    source: SOURCE_NAMES[sourceId] ?? `source-${sourceId}`,
  };
}

export async function loadPlayWeights(url = "/weights/tinyaz-s.bin"): Promise<WeightSet> {
  try {
    const res = await fetch(url);
    if (!res.ok) return randomWeights(2026);
    return unpackWeights(await res.arrayBuffer());
  } catch {
    return randomWeights(2026);
  }
}

export function packWeights(w: WeightSet, sourceId = SOURCE_RANDOM): ArrayBuffer {
  const n = paramCount();
  const buf = new ArrayBuffer(16 + n * 4);
  const view = new DataView(buf);
  view.setUint8(0, 84);
  view.setUint8(1, 65);
  view.setUint8(2, 90);
  view.setUint8(3, 83);
  view.setUint32(4, 1, true);
  view.setUint32(8, n, true);
  view.setUint32(12, sourceId, true);
  const parts = [
    w.stemW,
    w.stemB,
    ...w.blocks.flatMap((b) => [b.w1, b.b1, b.w2, b.b2]),
    w.policyW,
    w.policyB,
    w.valueConvW,
    w.valueConvB,
    w.valueFc1W,
    w.valueFc1B,
    w.valueFc2W,
    w.valueFc2B,
  ];
  const out = new Float32Array(buf, 16, n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  if (o !== n) throw new Error(`packed ${o} != ${n}`);
  return buf;
}
