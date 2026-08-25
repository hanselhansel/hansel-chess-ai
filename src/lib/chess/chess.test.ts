import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import {
  PARAM_CAP,
  algebraicToIndex,
  flipIndex,
  indexToAlgebraic,
} from "./constants.ts";
import { encodeBoard } from "./encode.ts";
import { search } from "./mcts.ts";
import { encodeMovePlane, moveToPlane, softmax } from "./policy.ts";
import { paramCount, randomWeights } from "./weights.ts";

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

  it("1-visit search returns a legal move that is the policy argmax", () => {
    const weights = randomWeights(2026);
    const fen = new Chess().fen();
    const result = search(fen, 1, weights);
    const legal = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
    assert.ok(legal.includes(result.uci), `illegal ${result.uci}`);
    const best = [...result.children].sort((a, b) => b.prior - a.prior)[0];
    assert.equal(result.uci, best.uci);
  });

  it("4-visit search still only plays legal moves", () => {
    const weights = randomWeights(7);
    const chess = new Chess();
    chess.move("e4");
    const result = search(chess.fen(), 4, weights);
    assert.ok(chess.move({ from: result.from, to: result.to, promotion: result.promotion }));
  });
});
