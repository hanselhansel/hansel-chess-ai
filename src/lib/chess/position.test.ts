import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import {
  capturePosition,
  createPositionState,
  pushPositionMove,
  undoPositionMove,
} from "./position.ts";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EP_ROOT_FEN =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const PINNED_FEN = "4k3/8/8/K2pP2r/8/8/8/8 w - d6 0 2";

function legalFen(initialFen: string, movesUci: readonly string[]): string {
  const chess = new Chess(initialFen);
  for (const uci of movesUci) {
    const move: { from: string; to: string; promotion?: string } = {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
    };
    if (uci.length === 5) move.promotion = uci[4];
    chess.move(move);
  }
  return chess.fen();
}

describe("capturePosition", () => {
  it("freezes the owned root, UCI sequence and expected FEN", () => {
    const moves = ["e2e4", "e7e5"];
    const pos = capturePosition(START_FEN, moves, legalFen(START_FEN, moves));
    assert.ok(Object.isFrozen(pos));
    assert.ok(Object.isFrozen(pos.movesUci));
    moves.push("g1f3");
    assert.deepEqual([...pos.movesUci], ["e2e4", "e7e5"]);
    assert.equal(pos.initialFen, START_FEN);
  });

  it("keeps the exact initial raw field even when it is uncapturable", () => {
    const pos = capturePosition(
      EP_ROOT_FEN,
      ["g8f6"],
      legalFen(EP_ROOT_FEN, ["g8f6"]),
    );
    assert.equal(pos.initialFen, EP_ROOT_FEN);
    assert.equal(pos.initialFen.split(" ")[3], "e3");
  });
});

describe("createPositionState", () => {
  it("replays a standard full history including castling", () => {
    const moves = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1"];
    const expected = legalFen(START_FEN, moves);
    const state = createPositionState(capturePosition(START_FEN, moves, expected));
    assert.equal(state.board.fen(), expected);
    assert.equal(state.board.get("g1")?.type, "k");
    assert.equal(state.rawEpTarget, null);
  });

  it("replays promotions and promotion captures", () => {
    const quiet = createPositionState(
      capturePosition(
        "8/2P5/8/8/8/8/8/k6K w - - 0 1",
        ["c7c8q"],
        legalFen("8/2P5/8/8/8/8/8/k6K w - - 0 1", ["c7c8q"]),
      ),
    );
    assert.equal(quiet.board.get("c8")?.type, "q");
    const capture = createPositionState(
      capturePosition(
        "1n6/2P5/8/8/8/8/8/k6K w - - 0 1",
        ["c7b8n"],
        legalFen("1n6/2P5/8/8/8/8/8/k6K w - - 0 1", ["c7b8n"]),
      ),
    );
    assert.equal(capture.board.get("b8")?.type, "n");
  });

  it("replays en-passant captures in both directions", () => {
    const white = createPositionState(
      capturePosition(
        START_FEN,
        ["e2e4", "e7e6", "e4e5", "d7d5", "e5d6"],
        legalFen(START_FEN, ["e2e4", "e7e6", "e4e5", "d7d5", "e5d6"]),
      ),
    );
    assert.equal(white.board.get("d6")?.color, "w");
    assert.equal(white.board.get("d5"), undefined);
    assert.equal(white.rawEpTarget, null);
    const black = createPositionState(
      capturePosition(
        START_FEN,
        ["a2a3", "e7e5", "d2d4", "e5e4", "f2f4", "e4f3"],
        legalFen(START_FEN, ["a2a3", "e7e5", "d2d4", "e5e4", "f2f4", "e4f3"]),
      ),
    );
    assert.equal(black.board.get("f3")?.color, "b");
    assert.equal(black.board.get("f4"), undefined);
    assert.equal(black.rawEpTarget, null);
  });

  it("rejects malformed UCI entries", () => {
    for (const uci of ["e2e9", "e2e4x", "e2", "garbage", "e2e4qq"]) {
      assert.throws(
        () => createPositionState(capturePosition(START_FEN, [uci], START_FEN)),
        /malformed UCI/,
        uci,
      );
    }
  });

  it("rejects illegal moves and bad prefixes", () => {
    const illegal = [["e7e5"], ["e2e5"], ["e2e4", "e7e5", "a1a8"]];
    for (const moves of illegal) {
      assert.throws(
        () => createPositionState(capturePosition(START_FEN, moves, START_FEN)),
        moves.join(" "),
      );
    }
  });

  it("rejects a final-FEN mismatch after a legal replay", () => {
    assert.throws(
      () =>
        createPositionState(
          capturePosition(
            START_FEN,
            ["e2e4"],
            legalFen(START_FEN, ["e2e4", "e7e5"]),
          ),
        ),
      /not expected/,
    );
  });

  it("rejects an invalid initial FEN", () => {
    assert.throws(() => createPositionState("not a fen"));
    assert.throws(() =>
      createPositionState(
        capturePosition("8/8/8/8/8/8/8/8 w - - 0 1", [], "x"),
      ),
    );
  });
});

describe("raw en-passant target", () => {
  it("retains e3 after e2e4 without adjacent capturers", () => {
    const state = createPositionState(
      capturePosition(START_FEN, ["e2e4"], legalFen(START_FEN, ["e2e4"])),
    );
    assert.equal(state.rawEpTarget, "e3");
    assert.equal(state.board.fen().split(" ")[3], "-");
  });

  it("agrees with the legal convention when a capture exists", () => {
    const blackCan = createPositionState(
      capturePosition(
        START_FEN,
        ["a2a3", "e7e5", "d2d4", "e5e4", "f2f4"],
        legalFen(START_FEN, ["a2a3", "e7e5", "d2d4", "e5e4", "f2f4"]),
      ),
    );
    assert.equal(blackCan.rawEpTarget, "f3");
    assert.equal(blackCan.board.fen().split(" ")[3], "f3");
    const whiteCan = createPositionState(
      capturePosition(
        START_FEN,
        ["e2e4", "a7a6", "e4e5", "d7d5"],
        legalFen(START_FEN, ["e2e4", "a7a6", "e4e5", "d7d5"]),
      ),
    );
    assert.equal(whiteCan.rawEpTarget, "d6");
    assert.equal(whiteCan.board.fen().split(" ")[3], "d6");
  });

  it("retains an arbitrary initial raw target with zero and later moves", () => {
    const root = createPositionState(EP_ROOT_FEN);
    assert.equal(root.rawEpTarget, "e3");
    assert.equal(root.board.fen().split(" ")[3], "-");
    assert.equal(root.board.history().length, 0);
    const pos = capturePosition(
      EP_ROOT_FEN,
      ["g8f6"],
      legalFen(EP_ROOT_FEN, ["g8f6"]),
    );
    const state = createPositionState(pos);
    assert.equal(state.rawEpTarget, null);
    assert.equal(pos.initialFen.split(" ")[3], "e3");
  });

  it("retains a pinned initial d6 target without a legal capture", () => {
    const state = createPositionState(PINNED_FEN);
    assert.equal(state.rawEpTarget, "d6");
    assert.equal(state.board.fen().split(" ")[3], "-");
    assert.ok(
      state.board
        .moves({ verbose: true })
        .every((m) => !(m.from === "e5" && m.to === "d6")),
    );
    const viaPosition = createPositionState(
      capturePosition(PINNED_FEN, [], new Chess(PINNED_FEN).fen()),
    );
    assert.equal(viaPosition.rawEpTarget, "d6");
  });
});

describe("pushPositionMove and undoPositionMove", () => {
  it("applies legal moves and tracks the raw target", () => {
    const state = createPositionState(START_FEN);
    const first = pushPositionMove(state, { from: "e2", to: "e4" });
    assert.equal(first.san, "e4");
    assert.equal(state.rawEpTarget, "e3");
    pushPositionMove(state, { from: "e7", to: "e5" });
    assert.equal(state.rawEpTarget, "e6");
    pushPositionMove(state, { from: "g1", to: "f3" });
    assert.equal(state.rawEpTarget, null);
  });

  it("restores the exact saved prior target with the board on undo", () => {
    const state = createPositionState(
      capturePosition(
        START_FEN,
        ["e2e4", "e7e5", "g1f3"],
        legalFen(START_FEN, ["e2e4", "e7e5", "g1f3"]),
      ),
    );
    undoPositionMove(state);
    assert.equal(state.rawEpTarget, "e6");
    undoPositionMove(state);
    assert.equal(state.rawEpTarget, "e3");
    const undone = undoPositionMove(state);
    assert.equal(undone.san, "e4");
    assert.equal(state.rawEpTarget, null);
    assert.equal(state.board.fen(), START_FEN);
  });

  it("throws on undo with empty history", () => {
    const state = createPositionState(START_FEN);
    assert.throws(() => undoPositionMove(state));
  });

  it("leaves board and target untouched when a push is rejected", () => {
    const state = createPositionState(
      capturePosition(START_FEN, ["e2e4"], legalFen(START_FEN, ["e2e4"])),
    );
    const before = state.board.fen();
    assert.throws(() => pushPositionMove(state, { from: "a1", to: "a8" }));
    assert.equal(state.board.fen(), before);
    assert.equal(state.rawEpTarget, "e3");
  });

  it("applies a promotion descriptor", () => {
    const state = createPositionState("8/2P5/8/8/8/8/8/k6K w - - 0 1");
    const move = pushPositionMove(state, { from: "c7", to: "c8", promotion: "q" });
    assert.equal(move.promotion, "q");
    assert.equal(state.board.get("c8")?.type, "q");
  });
});

describe("private runtime storage", () => {
  it("exposes only readonly board and rawEpTarget accessors", () => {
    const state = createPositionState(START_FEN);
    assert.deepEqual(Object.keys(state).sort(), ["board", "rawEpTarget"]);
    assert.equal(
      (state as unknown as Record<string, unknown>).undoTargets,
      undefined,
    );
    assert.throws(() => {
      (state as unknown as { rawEpTarget: string | null }).rawEpTarget = "e3";
    }, TypeError);
    assert.equal(state.rawEpTarget, null);
  });

  it("restores the exact prior target through push and undo without aliases", () => {
    const state = createPositionState(START_FEN);
    pushPositionMove(state, { from: "e2", to: "e4" });
    pushPositionMove(state, { from: "e7", to: "e5" });
    (state as unknown as { undoTargets?: unknown[] }).undoTargets?.splice(0);
    undoPositionMove(state);
    assert.equal(state.board.fen(), legalFen(START_FEN, ["e2e4"]));
    assert.equal(state.rawEpTarget, "e3");
    undoPositionMove(state);
    assert.equal(state.rawEpTarget, null);
    assert.equal(state.board.fen(), START_FEN);
  });
});

describe("history retention versus FEN-only input", () => {
  it("keeps threefold repetition that a final-FEN board cannot recover", () => {
    const cycle = [
      "g1f3",
      "g8f6",
      "f3g1",
      "f6g8",
      "g1f3",
      "g8f6",
      "f3g1",
      "f6g8",
    ];
    const pos = capturePosition(START_FEN, cycle, legalFen(START_FEN, cycle));
    const full = createPositionState(pos);
    assert.ok(full.board.isThreefoldRepetition());
    const fenOnly = createPositionState(legalFen(START_FEN, cycle));
    assert.ok(!fenOnly.board.isThreefoldRepetition());
  });

  it("never mutates the caller's source board", () => {
    const source = new Chess(START_FEN);
    const before = source.fen();
    const state = createPositionState(
      capturePosition(START_FEN, ["e2e4"], legalFen(START_FEN, ["e2e4"])),
    );
    pushPositionMove(state, { from: "e7", to: "e5" });
    assert.equal(source.fen(), before);
    assert.notStrictEqual(state.board, source);
  });
});
