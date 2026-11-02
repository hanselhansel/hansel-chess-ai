import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHANNELS_M,
  CHANNELS_S,
  PACKED_WEIGHT_VERSION,
  SELECTED_CHECKPOINT,
  SOURCE_LICHESS_2013_01,
  SOURCE_RANDOM,
  paramCount,
} from "./constants.ts";
import {
  CheckpointError,
  SELECTED_MODEL_IDENTITY,
  hashCheckpointBytes,
  sameModelIdentity,
  verifyCheckpointBytes,
  type ModelIdentity,
} from "./checkpoint.ts";
import { thinkRuntime } from "./think-runtime.ts";
import {
  packWeights,
  paramCount as weightsParamCount,
  randomWeights,
  unpackWeights,
} from "./weights.ts";

const M_PIN = "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee";
const M_PATH = new URL("../../../public/weights/tinyaz-m.bin", import.meta.url).pathname;
const S_PATH = new URL("../../../public/weights/tinyaz-s.bin", import.meta.url).pathname;

function fileBytes(path: string): ArrayBuffer {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

function hexBytes(hex: string): ArrayBuffer {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out.buffer;
}

function mCopy(): ArrayBuffer {
  return fileBytes(M_PATH).slice(0);
}

function demoPacked(): ArrayBuffer {
  return packWeights(randomWeights(2026), SOURCE_RANDOM);
}

function demoIdentity(sha256: string): ModelIdentity {
  return {
    mode: "random-demo",
    modelName: "tinyaz-s",
    sha256,
    packedVersion: 1,
    parameterCount: 640018,
    byteLength: 2560088,
    channels: 64,
    sourceId: 0,
    seed: 2026,
  };
}

function patchU32(bytes: ArrayBuffer, offset: number, value: number): void {
  new DataView(bytes).setUint32(offset, value, true);
}

async function rejectsWith(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (err) {
    assert.ok(err instanceof CheckpointError, `expected CheckpointError, got ${String(err)}`);
    assert.equal(err.code, code);
    return;
  }
  assert.fail(`expected rejection with ${code}`);
}

describe("selected checkpoint description", () => {
  it("pins the frozen M descriptor", () => {
    assert.ok(Object.isFrozen(SELECTED_CHECKPOINT));
    assert.equal(SELECTED_CHECKPOINT.name, "tinyaz-m");
    assert.equal(SELECTED_CHECKPOINT.url, "/weights/tinyaz-m.bin");
    assert.equal(SELECTED_CHECKPOINT.packedVersion, PACKED_WEIGHT_VERSION);
    assert.equal(SELECTED_CHECKPOINT.parameterCount, 2_426_706);
    assert.equal(SELECTED_CHECKPOINT.byteLength, 9_706_840);
    assert.equal(SELECTED_CHECKPOINT.expectedSha256, M_PIN);
  });

  it("derives the frozen trained identity from the descriptor", () => {
    assert.ok(Object.isFrozen(SELECTED_MODEL_IDENTITY));
    assert.deepEqual(SELECTED_MODEL_IDENTITY, {
      mode: "trained",
      modelName: "tinyaz-m",
      sha256: M_PIN,
      packedVersion: 1,
      parameterCount: 2426706,
      byteLength: 9706840,
      channels: 128,
      sourceId: 1,
    });
    assert.equal(SELECTED_MODEL_IDENTITY.parameterCount, paramCount(CHANNELS_M));
  });

  it("keeps the paramCount formula and weights re-export identical", () => {
    assert.equal(weightsParamCount, paramCount);
    assert.equal(paramCount(), 640_018);
    assert.equal(paramCount(CHANNELS_S), 640_018);
    assert.equal(paramCount(CHANNELS_M), 2_426_706);
  });

  it("compares every identity field including mode and seed", () => {
    const digest = "a".repeat(64);
    const demo = demoIdentity(digest) as Record<string, unknown>;
    assert.ok(sameModelIdentity(demoIdentity(digest), demoIdentity(digest)));
    assert.ok(sameModelIdentity(SELECTED_MODEL_IDENTITY, SELECTED_MODEL_IDENTITY));
    assert.ok(!sameModelIdentity(SELECTED_MODEL_IDENTITY, demoIdentity(digest)));
    const variants: Record<string, unknown>[] = [
      { mode: "trained" },
      { modelName: "tinyaz-m" },
      { sha256: "b".repeat(64) },
      { packedVersion: 2 },
      { parameterCount: 1 },
      { byteLength: 1 },
      { channels: 128 },
      { sourceId: 1 },
      { seed: 2025 },
    ];
    for (const patch of variants) {
      const changed = { ...demo, ...patch } as ModelIdentity;
      assert.ok(
        !sameModelIdentity(changed, demo as ModelIdentity),
        `identity change in ${Object.keys(patch)} must compare unequal`,
      );
    }
  });
});

describe("actual tinyaz-m binary", () => {
  it("has the pinned TAZS header, count, source and length", () => {
    const bytes = fileBytes(M_PATH);
    assert.equal(bytes.byteLength, 9_706_840);
    const view = new DataView(bytes);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3),
    );
    assert.equal(magic, "TAZS");
    assert.equal(view.getUint32(4, true), PACKED_WEIGHT_VERSION);
    assert.equal(view.getUint32(8, true), 2_426_706);
    assert.equal(view.getUint32(12, true), SOURCE_LICHESS_2013_01);
  });

  it("hashes to the pinned SHA256 and verifies against the trained identity", async () => {
    const bytes = fileBytes(M_PATH);
    assert.equal(await hashCheckpointBytes(bytes), M_PIN);
    const verified = await verifyCheckpointBytes(bytes, SELECTED_MODEL_IDENTITY);
    assert.strictEqual(verified.identity, SELECTED_MODEL_IDENTITY);
    assert.ok(sameModelIdentity(verified.identity, SELECTED_MODEL_IDENTITY));
    assert.equal(verified.bytes.byteLength, 9_706_840);
    assert.notStrictEqual(verified.bytes, bytes);
  });

  it("still reads through the legacy generic S and M decoders", () => {
    const m = unpackWeights(fileBytes(M_PATH));
    assert.equal(m.paramCount, 2_426_706);
    assert.equal(m.source, "lichess-2013-01");
    const s = unpackWeights(fileBytes(S_PATH));
    assert.equal(s.paramCount, 640_018);
    assert.equal(s.source, "lichess-2013-01");
  });
});

describe("deterministic random-demo S", () => {
  it("packs seed-2026 S bytes with a stable computed digest", async () => {
    const a = demoPacked();
    assert.equal(a.byteLength, 2_560_088);
    const view = new DataView(a);
    assert.equal(view.getUint32(8, true), 640_018);
    assert.equal(view.getUint32(12, true), SOURCE_RANDOM);
    const digest = await hashCheckpointBytes(a);
    assert.match(digest, /^[0-9a-f]{64}$/);
    assert.equal(await hashCheckpointBytes(demoPacked()), digest);
    assert.notEqual(digest, M_PIN);
  });

  it("verifies the demo identity and keeps the legacy reader compatible", async () => {
    const digest = await hashCheckpointBytes(demoPacked());
    const verified = await verifyCheckpointBytes(demoPacked(), demoIdentity(digest));
    assert.ok(sameModelIdentity(verified.identity, demoIdentity(digest)));
    const w = unpackWeights(demoPacked());
    assert.equal(w.paramCount, 640_018);
    assert.equal(w.source, "random");
    assert.equal(w.seed, 2026);
  });
});

describe("malformed or mismatched payloads", () => {
  it("rejects non-ArrayBuffer and shared-buffer inputs", async () => {
    const view = new Uint8Array(32) as unknown as ArrayBuffer;
    await rejectsWith(verifyCheckpointBytes(view, SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
    const shared = new SharedArrayBuffer(32) as unknown as ArrayBuffer;
    await rejectsWith(verifyCheckpointBytes(shared, SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
  });

  it("rejects unreadable headers, truncated bodies and extra bytes", async () => {
    const m = fileBytes(M_PATH);
    await rejectsWith(verifyCheckpointBytes(m.slice(0, 12), SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
    await rejectsWith(
      verifyCheckpointBytes(m.slice(0, 9_706_836), SELECTED_MODEL_IDENTITY),
      "LOAD_LENGTH",
    );
    const extra = new ArrayBuffer(9_706_844);
    new Uint8Array(extra).set(new Uint8Array(m));
    await rejectsWith(verifyCheckpointBytes(extra, SELECTED_MODEL_IDENTITY), "LOAD_LENGTH");
  });

  it("rejects bad magic, unsupported version and unsupported counts", async () => {
    const magic = mCopy();
    new DataView(magic).setUint8(0, 88);
    await rejectsWith(verifyCheckpointBytes(magic, SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
    const version = mCopy();
    patchU32(version, 4, 2);
    await rejectsWith(verifyCheckpointBytes(version, SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
    const count = mCopy();
    patchU32(count, 8, 42);
    await rejectsWith(verifyCheckpointBytes(count, SELECTED_MODEL_IDENTITY), "LOAD_FORMAT");
    const sCount = mCopy();
    patchU32(sCount, 8, 640_018);
    await rejectsWith(verifyCheckpointBytes(sCount, SELECTED_MODEL_IDENTITY), "LOAD_LENGTH");
  });

  it("rejects architecture, source, expected-identity and digest mismatches", async () => {
    await rejectsWith(verifyCheckpointBytes(demoPacked(), SELECTED_MODEL_IDENTITY), "MODEL_MISMATCH");
    const source = mCopy();
    patchU32(source, 12, SOURCE_RANDOM);
    await rejectsWith(verifyCheckpointBytes(source, SELECTED_MODEL_IDENTITY), "MODEL_MISMATCH");
    const trainedS = demoIdentity("0".repeat(64));
    (trainedS as { mode: string }).mode = "trained";
    await rejectsWith(verifyCheckpointBytes(demoPacked(), trainedS), "MODEL_MISMATCH");
    await rejectsWith(
      verifyCheckpointBytes(demoPacked(), demoIdentity("not-a-sha")),
      "MODEL_MISMATCH",
    );
    await rejectsWith(
      verifyCheckpointBytes(demoPacked(), demoIdentity("0".repeat(64))),
      "LOAD_DIGEST",
    );
  });

  it("rejects non-finite payloads and corrupt tensor bodies", async () => {
    const nan = mCopy();
    new DataView(nan).setFloat32(16, Number.NaN, true);
    await rejectsWith(verifyCheckpointBytes(nan, SELECTED_MODEL_IDENTITY), "LOAD_NONFINITE");
    const inf = mCopy();
    new DataView(inf).setFloat32(16, Number.POSITIVE_INFINITY, true);
    await rejectsWith(verifyCheckpointBytes(inf, SELECTED_MODEL_IDENTITY), "LOAD_NONFINITE");
    const corrupt = mCopy();
    new DataView(corrupt).setFloat32(9_706_836, 12345, true);
    await rejectsWith(verifyCheckpointBytes(corrupt, SELECTED_MODEL_IDENTITY), "LOAD_DIGEST");
  });
});

describe("platform capability boundary", () => {
  it("fails visibly when the digest capability is unavailable", async (t) => {
    const m = fileBytes(M_PATH);
    t.mock.method(thinkRuntime, "digestSha256", () => null);
    await rejectsWith(hashCheckpointBytes(m), "CRYPTO_UNAVAILABLE");
    await rejectsWith(verifyCheckpointBytes(m, SELECTED_MODEL_IDENTITY), "CRYPTO_UNAVAILABLE");
  });

  it("routes verification through the capability digest", async (t) => {
    const m = fileBytes(M_PATH);
    t.mock.method(thinkRuntime, "digestSha256", () => Promise.resolve(new ArrayBuffer(32)));
    await rejectsWith(verifyCheckpointBytes(m, SELECTED_MODEL_IDENTITY), "LOAD_DIGEST");
  });

  it("normalizes a synchronous digest throw to a typed crypto failure", async (t) => {
    const m = fileBytes(M_PATH);
    const cause = new Error("digest capability exploded");
    t.mock.method(thinkRuntime, "digestSha256", () => {
      throw cause;
    });
    for (const attempt of [
      hashCheckpointBytes(m),
      verifyCheckpointBytes(m, SELECTED_MODEL_IDENTITY),
    ]) {
      try {
        await attempt;
        assert.fail("expected a crypto rejection");
      } catch (err) {
        assert.ok(err instanceof CheckpointError, `expected CheckpointError, got ${String(err)}`);
        assert.equal(err.code, "CRYPTO_UNAVAILABLE");
        assert.strictEqual(err.cause, cause);
      }
    }
  });

  it("normalizes an awaited digest rejection to a typed crypto failure", async (t) => {
    const m = fileBytes(M_PATH);
    const cause = new Error("digest promise rejected");
    t.mock.method(thinkRuntime, "digestSha256", () => Promise.reject(cause));
    for (const attempt of [
      hashCheckpointBytes(m),
      verifyCheckpointBytes(m, SELECTED_MODEL_IDENTITY),
    ]) {
      try {
        await attempt;
        assert.fail("expected a crypto rejection");
      } catch (err) {
        assert.ok(err instanceof CheckpointError, `expected CheckpointError, got ${String(err)}`);
        assert.equal(err.code, "CRYPTO_UNAVAILABLE");
        assert.strictEqual(err.cause, cause);
      }
    }
  });
});

describe("buffer ownership", () => {
  it("verifies a private snapshot even if the caller mutates its buffer mid-flight", async () => {
    const bytes = demoPacked();
    const digest = await hashCheckpointBytes(bytes);
    const pending = verifyCheckpointBytes(bytes, demoIdentity(digest));
    new Uint8Array(bytes).fill(0);
    const verified = await pending;
    assert.notStrictEqual(verified.bytes, bytes);
    assert.equal(await hashCheckpointBytes(verified.bytes), digest);
  });

  it("returns a detached identity snapshot for demo verification", async (t) => {
    const packed = demoPacked();
    const digest = await hashCheckpointBytes(packed);
    const expected = demoIdentity(digest);
    let release!: (value: ArrayBuffer) => void;
    t.mock.method(
      thinkRuntime,
      "digestSha256",
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          release = resolve;
        }),
    );
    const pending = verifyCheckpointBytes(packed, expected);
    (expected as { mode: string }).mode = "trained";
    (expected as { sha256: string }).sha256 = "f".repeat(64);
    (expected as { seed: number }).seed = 1;
    release(hexBytes(digest));
    const verified = await pending;
    assert.deepEqual(verified.identity, demoIdentity(digest));
    assert.ok(Object.isFrozen(verified));
    (expected as { sha256: string }).sha256 = "e".repeat(64);
    assert.equal(verified.identity.sha256, digest);
  });
});
