import {
  CHANNELS,
  N_BLOCKS,
  N_PLANES,
  POLICY_PLANES,
  VALUE_CH,
  VALUE_HIDDEN,
} from "./constants.ts";
import type { WeightSet } from "./weights.ts";

function conv3x3(
  input: Float32Array,
  cin: number,
  cout: number,
  w: Float32Array,
  b: Float32Array,
  out: Float32Array,
) {
  for (let oc = 0; oc < cout; oc++) {
    const wOff = oc * cin * 9;
    const bOc = b[oc];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        let s = bOc;
        for (let ic = 0; ic < cin; ic++) {
          const inOff = ic * 64;
          const wIc = wOff + ic * 9;
          for (let kr = 0; kr < 3; kr++) {
            const rr = r + kr - 1;
            if (rr < 0 || rr > 7) continue;
            const row = inOff + rr * 8;
            const wRow = wIc + kr * 3;
            for (let kf = 0; kf < 3; kf++) {
              const ff = f + kf - 1;
              if (ff < 0 || ff > 7) continue;
              s += w[wRow + kf] * input[row + ff];
            }
          }
        }
        out[oc * 64 + r * 8 + f] = s;
      }
    }
  }
}

function conv1x1(
  input: Float32Array,
  cin: number,
  cout: number,
  w: Float32Array,
  b: Float32Array,
  out: Float32Array,
) {
  for (let oc = 0; oc < cout; oc++) {
    const w1 = oc * cin;
    const bOc = b[oc];
    for (let s = 0; s < 64; s++) {
      let v = bOc;
      for (let ic = 0; ic < cin; ic++) v += w[w1 + ic] * input[ic * 64 + s];
      out[oc * 64 + s] = v;
    }
  }
}

function relu(x: Float32Array) {
  for (let i = 0; i < x.length; i++) if (x[i] < 0) x[i] = 0;
}

export type NetOut = { policy: Float32Array; value: number };

export function forward(planes: Float32Array, w: WeightSet): NetOut {
  const a = new Float32Array(CHANNELS * 64);
  const b = new Float32Array(CHANNELS * 64);
  const c = new Float32Array(CHANNELS * 64);
  conv3x3(planes, N_PLANES, CHANNELS, w.stemW, w.stemB, a);
  relu(a);

  for (let i = 0; i < N_BLOCKS; i++) {
    const bl = w.blocks[i];
    conv3x3(a, CHANNELS, CHANNELS, bl.w1, bl.b1, b);
    relu(b);
    conv3x3(b, CHANNELS, CHANNELS, bl.w2, bl.b2, c);
    for (let j = 0; j < a.length; j++) a[j] = a[j] + c[j];
    relu(a);
  }

  const policy = new Float32Array(POLICY_PLANES * 64);
  conv1x1(a, CHANNELS, POLICY_PLANES, w.policyW, w.policyB, policy);

  const vh = new Float32Array(VALUE_CH * 64);
  conv1x1(a, CHANNELS, VALUE_CH, w.valueConvW, w.valueConvB, vh);
  relu(vh);

  const h = new Float32Array(VALUE_HIDDEN);
  const inDim = VALUE_CH * 64;
  for (let o = 0; o < VALUE_HIDDEN; o++) {
    let s = w.valueFc1B[o];
    const row = o * inDim;
    for (let k = 0; k < inDim; k++) s += w.valueFc1W[row + k] * vh[k];
    h[o] = s > 0 ? s : 0;
  }
  let v = w.valueFc2B[0];
  for (let k = 0; k < VALUE_HIDDEN; k++) v += w.valueFc2W[k] * h[k];
  return { policy, value: Math.tanh(v) };
}
