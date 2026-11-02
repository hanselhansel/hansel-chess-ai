import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess, type Square } from "chess.js";
import {
  CHANNELS_M,
  FLOPS_PER_EVAL,
  FLOPS_PER_EVAL_M,
  FLOPS_PER_EVAL_S,
  PARAM_CAP,
  algebraicToIndex,
  flipIndex,
  indexToAlgebraic,
} from "./constants.ts";
import { encodeBoard } from "./encode.ts";
import { search, searchAsync } from "./mcts.ts";
import { encodeMovePlane, moveToPlane, softmax } from "./policy.ts";
import { paramCount, packWeights, randomWeights, unpackWeights } from "./weights.ts";

describe("rank-flip STM canonical", () => {
  it("xor 56 flips rank and keeps the file (a-file stays a-file)", () => {
    assert.equal(flipIndex(algebraicToIndex("e8")), algebraicToIndex("e1"));
    assert.equal(flipIndex(algebraicToIndex("a8")), algebraicToIndex("a1"));
    assert.equal(indexToAlgebraic(flipIndex(algebraicToIndex("a8"))), "a1");
    assert.notEqual(flipIndex(algebraicToIndex("a8")), algebraicToIndex("h1"));
  });
});

describe("encodeBoard", () => {
  it("puts the white king on plane 5 at e1 at the start", () => {
    const planes = encodeBoard(new Chess());
    assert.equal(planes[5 * 64 + algebraicToIndex("e1")], 1);
    assert.equal(planes[0 * 64 + algebraicToIndex("a2")], 1);
    assert.equal(planes[6 * 64 + algebraicToIndex("a7")], 1);
  });

  it("rank-flips so a black pawn on a7 sits at STM a2 after 1. e4", () => {
    const chess = new Chess();
    chess.move("e4");
    const planes = encodeBoard(chess);
    assert.equal(chess.turn(), "b");
    assert.equal(planes[0 * 64 + algebraicToIndex("a2")], 1);
    assert.equal(planes[5 * 64 + algebraicToIndex("e1")], 1);
    assert.equal(planes[11 * 64 + algebraicToIndex("e8")], 1);
  });
});

describe("policy encoding", () => {
  it("maps e2e4 to queen-direction north, distance 2", () => {
    const from = algebraicToIndex("e2");
    const to = algebraicToIndex("e4");
    assert.equal(moveToPlane(from, to, undefined), 1);
  });

  it("maps a knight from b1 to c3", () => {
    const plane = moveToPlane(algebraicToIndex("b1"), algebraicToIndex("c3"), undefined);
    assert.equal(plane, 56 + 0);
  });

  it("flips both ends of a move when Black is to move", () => {
    const { from, plane } = encodeMovePlane("e7", "e5", undefined, true);
    assert.equal(from, algebraicToIndex("e2"));
    assert.equal(plane, 1);
  });

  it("softmaxes to one", () => {
    const p = softmax([0, 1, 2]);
    const sum = p.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-6);
    assert.ok(p[2] > p[1] && p[1] > p[0]);
  });
});

describe("tinyaz-s", () => {
  it("stays under the 3M cap", () => {
    const n = paramCount();
    assert.ok(n < PARAM_CAP, `${n} >= cap`);
    assert.ok(n > 500_000, `${n} too small for 8x64`);
  });

  it("tinyaz-m 8x128 stays under 3M and above 2M", () => {
    const n = paramCount(CHANNELS_M);
    assert.ok(n < PARAM_CAP, `${n} >= cap`);
    assert.ok(n > 2_000_000, `${n} too small for 8x128`);
  });

  it("counts MACs per eval so FLOPs/move is visits times that", () => {
    assert.equal(FLOPS_PER_EVAL_S, 38_813_760);
    assert.equal(FLOPS_PER_EVAL_M, 153_092_160);
    assert.equal(FLOPS_PER_EVAL, FLOPS_PER_EVAL_M);
  });

  it("1-visit search returns a legal move that is the policy argmax", () => {
    const weights = randomWeights(2026);
    const fen = new Chess().fen();
    const out = search(fen, 1, weights);
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    const legal = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
    assert.ok(legal.includes(out.result.uci), `illegal ${out.result.uci}`);
    const best = [...out.result.children].sort((a, b) => b.prior - a.prior)[0];
    assert.equal(out.result.uci, best.uci);
  });

  it("4-visit search still only plays legal moves", () => {
    const weights = randomWeights(7);
    const chess = new Chess();
    chess.move("e4");
    const out = search(chess.fen(), 4, weights);
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    assert.ok(
      chess.move({
        from: out.result.from,
        to: out.result.to,
        promotion: out.result.promotion,
      }),
    );
  });

  it("searchAsync matches 1-visit search", async () => {
    const weights = randomWeights(2026);
    const fen = new Chess().fen();
    const a = search(fen, 1, weights);
    const b = await searchAsync(fen, 1, weights);
    assert.equal(b.kind, "move");
    if (a.kind === "move" && b.kind === "move") {
      assert.equal(b.result.uci, a.result.uci);
      assert.ok(b.result.ms >= 0);
    }
  });

  it("packs and unpacks the same weights", () => {
    const w = randomWeights(2026);
    const again = unpackWeights(packWeights(w, 0));
    assert.equal(again.paramCount, w.paramCount);
    assert.equal(again.source, "random");
    assert.equal(again.stemW.length, w.stemW.length);
    assert.equal(again.stemW[0], w.stemW[0]);
    assert.equal(again.blocks.length, 8);
    assert.equal(again.valueFc2B[0], w.valueFc2B[0]);
    const fen = new Chess().fen();
    const a = search(fen, 1, again);
    const b = search(fen, 1, w);
    assert.equal(a.kind, "move");
    assert.equal(b.kind, "move");
    if (a.kind === "move" && b.kind === "move") assert.equal(a.result.uci, b.result.uci);
  });
});

describe("encodeBoard en-passant plane", () => {
  const epPlane = (p: Float32Array) => p.slice(16 * 64, 17 * 64);
  const outside16 = (a: Float32Array, b: Float32Array) => {
    for (let i = 0; i < a.length; i++) {
      if (Math.floor(i / 64) !== 16) assert.equal(a[i], b[i]);
    }
  };

  it("derives, overrides, clears, and expires the raw target", () => {
    const g = new Chess();
    g.move("e4");
    const derived = encodeBoard(g);
    assert.equal(epPlane(derived)[44], 1);
    const explicit = encodeBoard(g, "e3" as Square);
    assert.deepEqual(epPlane(explicit), epPlane(derived));
    const none = encodeBoard(g, null);
    assert.ok(epPlane(none).every((v) => v === 0));
    outside16(derived, none);
    g.move("Nf6");
    assert.ok(epPlane(encodeBoard(g)).every((v) => v === 0));
  });

  it("keeps a FEN-declared raw target and leaves other planes unchanged", () => {
    const g = new Chess("rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 2");
    const planes = encodeBoard(g);
    assert.equal(epPlane(planes)[algebraicToIndex("e6")], 1);
    const cleared = encodeBoard(g, null);
    outside16(planes, cleared);
    assert.equal(planes[5 * 64 + algebraicToIndex("e1")], 1);
  });
});

describe("phase 1 checkpoint", () => {
  const path = new URL("../../../public/weights/tinyaz-s.bin", import.meta.url);
  const file = path.pathname;
  const has = existsSync(file);

  it("loads and plays a legal 1-visit move", { skip: !has }, () => {
    const w = unpackWeights(readFileSync(file));
    assert.ok(w.source === "lichess-2013-01" || w.source === "selfplay-64", w.source);
    assert.equal(w.paramCount, paramCount());
    const fen = new Chess().fen();
    const out = search(fen, 1, w);
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    const legal = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
    assert.ok(legal.includes(out.result.uci), `illegal ${out.result.uci}`);
  });
});

describe("tinyaz-m checkpoint decoder", () => {
  it("decodes the pinned M bytes as 8 blocks of width 128", () => {
    const file = new URL("../../../public/weights/tinyaz-m.bin", import.meta.url).pathname;
    const w = unpackWeights(readFileSync(file));
    assert.equal(w.paramCount, paramCount(CHANNELS_M));
    assert.equal(w.blocks.length, 8);
    assert.equal(w.stemW.length, CHANNELS_M * 19 * 9);
    assert.equal(w.blocks[0].w1.length, CHANNELS_M * CHANNELS_M * 9);
    assert.equal(w.valueFc2B.length, 1);
    assert.equal(w.stemB.length, CHANNELS_M);
  });
});
