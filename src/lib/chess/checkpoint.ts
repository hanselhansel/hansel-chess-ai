import {
  CHANNELS_M,
  CHANNELS_S,
  PACKED_WEIGHT_VERSION,
  SELECTED_CHECKPOINT,
  SOURCE_LICHESS_2013_01,
  SOURCE_RANDOM,
  paramCount,
} from "./constants.ts";
import { thinkRuntime } from "./think-runtime.ts";

export type Sha256 = string;
export type CheckpointSpec = Readonly<{
  name: string;
  url: string;
  packedVersion: 1;
  parameterCount: number;
  byteLength: number;
  expectedSha256: Sha256;
}>;
export type ModelIdentity =
  | Readonly<{
      mode: "trained";
      modelName: "tinyaz-m";
      sha256: Sha256;
      packedVersion: 1;
      parameterCount: 2426706;
      byteLength: 9706840;
      channels: 128;
      sourceId: 1;
    }>
  | Readonly<{
      mode: "random-demo";
      modelName: "tinyaz-s";
      sha256: Sha256;
      packedVersion: 1;
      parameterCount: 640018;
      byteLength: 2560088;
      channels: 64;
      sourceId: 0;
      seed: 2026;
    }>;
export type VerifiedCheckpoint = Readonly<{
  bytes: ArrayBuffer;
  identity: ModelIdentity;
}>;

export type CheckpointErrorCode =
  | "LOAD_HTTP"
  | "LOAD_FORMAT"
  | "LOAD_LENGTH"
  | "LOAD_NONFINITE"
  | "LOAD_DIGEST"
  | "CRYPTO_UNAVAILABLE"
  | "MODEL_MISMATCH";

export class CheckpointError extends Error {
  readonly code: CheckpointErrorCode;
  constructor(code: CheckpointErrorCode, diagnostic: string, options?: { cause?: unknown }) {
    super(diagnostic, options);
    this.name = "CheckpointError";
    this.code = code;
  }
}

const HEADER_BYTES = 16;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DEMO_SEED = 2026;

export const SELECTED_MODEL_IDENTITY: ModelIdentity = Object.freeze({
  mode: "trained",
  modelName: SELECTED_CHECKPOINT.name,
  sha256: SELECTED_CHECKPOINT.expectedSha256,
  packedVersion: SELECTED_CHECKPOINT.packedVersion,
  parameterCount: SELECTED_CHECKPOINT.parameterCount,
  byteLength: SELECTED_CHECKPOINT.byteLength,
  channels: CHANNELS_M,
  sourceId: SOURCE_LICHESS_2013_01,
});

export function sameModelIdentity(a: ModelIdentity, b: ModelIdentity): boolean {
  if (a.mode !== b.mode) return false;
  return (
    a.modelName === b.modelName &&
    a.sha256 === b.sha256 &&
    a.packedVersion === b.packedVersion &&
    a.parameterCount === b.parameterCount &&
    a.byteLength === b.byteLength &&
    a.channels === b.channels &&
    a.sourceId === b.sourceId &&
    ("seed" in a ? a.seed : undefined) === ("seed" in b ? b.seed : undefined)
  );
}

function isSharedBuffer(value: unknown): boolean {
  return typeof SharedArrayBuffer === "function" && value instanceof SharedArrayBuffer;
}

function toHex(digest: ArrayBuffer): string {
  let out = "";
  for (const byte of new Uint8Array(digest)) out += byte.toString(16).padStart(2, "0");
  return out;
}

async function digestHex(bytes: ArrayBuffer): Promise<string> {
  let pending: Promise<ArrayBuffer> | null;
  try {
    pending = thinkRuntime.digestSha256(bytes);
  } catch (cause) {
    throw new CheckpointError("CRYPTO_UNAVAILABLE", "SHA-256 digest capability threw", { cause });
  }
  if (pending === null) {
    throw new CheckpointError("CRYPTO_UNAVAILABLE", "SHA-256 digest capability is unavailable");
  }
  try {
    return toHex(await pending);
  } catch (cause) {
    throw new CheckpointError("CRYPTO_UNAVAILABLE", "SHA-256 digest capability rejected", {
      cause,
    });
  }
}

function channelsForCount(count: number): number | null {
  if (count === paramCount(CHANNELS_S)) return CHANNELS_S;
  if (count === paramCount(CHANNELS_M)) return CHANNELS_M;
  return null;
}

function checkedIdentity(expected: ModelIdentity): ModelIdentity {
  if (!expected || typeof expected !== "object") {
    throw new CheckpointError("MODEL_MISMATCH", "expected model identity is missing");
  }
  const mode: unknown = expected.mode;
  if (expected.mode === "trained") {
    if (!sameModelIdentity(expected, SELECTED_MODEL_IDENTITY)) {
      throw new CheckpointError(
        "MODEL_MISMATCH",
        "trained identity must equal the selected M description",
      );
    }
    return SELECTED_MODEL_IDENTITY;
  }
  if (expected.mode === "random-demo") {
    const count = paramCount(CHANNELS_S);
    const valid =
      expected.modelName === "tinyaz-s" &&
      expected.packedVersion === PACKED_WEIGHT_VERSION &&
      expected.parameterCount === count &&
      expected.byteLength === HEADER_BYTES + count * 4 &&
      expected.channels === CHANNELS_S &&
      expected.sourceId === SOURCE_RANDOM &&
      expected.seed === DEMO_SEED &&
      SHA256_PATTERN.test(expected.sha256);
    if (!valid) {
      throw new CheckpointError(
        "MODEL_MISMATCH",
        "demo identity must equal the deterministic seed-2026 S description",
      );
    }
    return Object.freeze({ ...expected });
  }
  throw new CheckpointError("MODEL_MISMATCH", `unknown model mode ${String(mode)}`);
}

export async function hashCheckpointBytes(bytes: ArrayBuffer): Promise<string> {
  if (!(bytes instanceof ArrayBuffer) || isSharedBuffer(bytes)) {
    throw new CheckpointError("LOAD_FORMAT", "checkpoint bytes must be an ArrayBuffer");
  }
  return digestHex(bytes.slice(0));
}

export async function verifyCheckpointBytes(
  bytes: ArrayBuffer,
  expected: ModelIdentity,
): Promise<VerifiedCheckpoint> {
  if (!(bytes instanceof ArrayBuffer) || isSharedBuffer(bytes)) {
    throw new CheckpointError("LOAD_FORMAT", "checkpoint bytes must be an ArrayBuffer");
  }
  const copy = bytes.slice(0);
  if (copy.byteLength < HEADER_BYTES) {
    throw new CheckpointError(
      "LOAD_FORMAT",
      `checkpoint payload of ${copy.byteLength} bytes cannot hold the ${HEADER_BYTES}-byte header`,
    );
  }
  const view = new DataView(copy);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== "TAZS") {
    throw new CheckpointError("LOAD_FORMAT", `bad checkpoint magic ${magic}`);
  }
  const packedVersion = view.getUint32(4, true);
  if (packedVersion !== PACKED_WEIGHT_VERSION) {
    throw new CheckpointError("LOAD_FORMAT", `unsupported packed version ${packedVersion}`);
  }
  const count = view.getUint32(8, true);
  const sourceId = view.getUint32(12, true);
  const channels = channelsForCount(count);
  if (channels === null) {
    throw new CheckpointError("LOAD_FORMAT", `unsupported parameter count ${count}`);
  }
  const bodyLength = HEADER_BYTES + count * 4;
  if (copy.byteLength !== bodyLength) {
    throw new CheckpointError(
      "LOAD_LENGTH",
      `checkpoint body of ${copy.byteLength} bytes does not match declared count ${count}`,
    );
  }
  const identity = checkedIdentity(expected);
  if (count !== identity.parameterCount || channels !== identity.channels) {
    throw new CheckpointError(
      "MODEL_MISMATCH",
      `checkpoint architecture ${channels}x${count} != expected ${identity.channels}x${identity.parameterCount}`,
    );
  }
  if (copy.byteLength !== identity.byteLength) {
    throw new CheckpointError(
      "LOAD_LENGTH",
      `checkpoint length ${copy.byteLength} does not match declared ${identity.byteLength}`,
    );
  }
  if (sourceId !== identity.sourceId) {
    throw new CheckpointError(
      "MODEL_MISMATCH",
      `checkpoint source ${sourceId} != expected ${identity.sourceId}`,
    );
  }
  for (let i = 0; i < count; i++) {
    if (!Number.isFinite(view.getFloat32(HEADER_BYTES + i * 4, true))) {
      throw new CheckpointError("LOAD_NONFINITE", `non-finite tensor value at index ${i}`);
    }
  }
  const actual = await digestHex(copy);
  if (actual !== identity.sha256) {
    throw new CheckpointError("LOAD_DIGEST", "checkpoint digest does not match expected identity");
  }
  return Object.freeze({ bytes: copy, identity });
}
