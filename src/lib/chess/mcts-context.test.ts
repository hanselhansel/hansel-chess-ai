import { Chess } from "chess.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Square } from "chess.js";
import { POLICY_PLANES } from "./constants.ts";
import {
  coreSearch,
  coreSearchAsync,
  diagnoseTerminal,
  SearchCancelledError,
  SearchDeadlineError,
  type PositionEvaluator,
} from "./mcts-core.ts";
import {
  PositionInvalidError,
  search,
  searchAsync,
  verifyOutcome,
} from "./mcts.ts";
import type { NetOut } from "./net.ts";
import type { SearchOutcome } from "./search-types.ts";
import { encodeMovePlane } from "./policy.ts";
import { capturePosition, createPositionState, type PositionState } from "./position.ts";
import { randomWeights } from "./weights.ts";
import { OPEN_FEN, POSITION, START_FEN } from "./think-test-fixtures.ts";

const MATE_FEN = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const STALE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
const BARE_KINGS = "8/8/4k3/8/8/8/8/K7 w - - 0 1";
const SHUTTLES = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"];

function replay(movesUci: readonly string[]): string {
  const g = new Chess();
  for (const u of movesUci) {
    g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  }
  return g.fen();
}

function positionOf(movesUci: readonly string[]) {
  return capturePosition(START_FEN, movesUci, replay(movesUci));
}

/** Six plies ending in a double push: nonterminal, raw "d6" while the legal
 * convention shows "-", and a knight cycle leaving nonzero repetition counts. */
const DEEP_HISTORY = ["g1f3", "g8f6", "f3g1", "f6g8", "e2e4", "d7d5"];

/** Full truth of a mutable position state: ordered history, legal/raw targets,
 * turn/castling/counters, and repetition bookkeeping. */
function stateSnapshot(state: PositionState) {
  const [placement, turn, castling, legalEp, halfmove, fullmove] =
    state.board.fen().split(" ");
  const counts = (state.board as unknown as {
    _positionCount: Map<string, number>;
  })._positionCount;
  return {
    placement, turn, castling, legalEp, halfmove, fullmove,
    rawEpTarget: state.rawEpTarget,
    uciHistory: state.board.history({ verbose: true })
      .map((m) => m.from + m.to + (m.promotion ?? "")),
    threefold: state.board.isThreefoldRepetition(),
    positionCounts: [...counts.values()].sort((a, b) => a - b),
  };
}

const zeroPolicy = (): Float32Array => new Float32Array(POLICY_PLANES * 64);

function constantEval(policy: Float32Array, value = 0): PositionEvaluator {
  return (): NetOut => ({ policy, value });
}

/** Bias one move so it becomes the root policy argmax. */
function biasedEval(from: string, to: string, value = 0): PositionEvaluator {
  const policy = zeroPolicy();
  const { from: f, plane } = encodeMovePlane(from, to, undefined, false);
  policy[plane * 64 + f] = 8;
  return constantEval(policy, value);
}

describe("diagnoseTerminal", () => {
  it("reports checkmate winner, draw reasons, and null for playable positions", () => {
    assert.deepEqual(diagnoseTerminal(new Chess(MATE_FEN)), {
      reason: "checkmate",
      winner: "b",
    });
    assert.deepEqual(diagnoseTerminal(new Chess(STALE_FEN)), {
      reason: "stalemate",
      winner: null,
    });
    assert.deepEqual(diagnoseTerminal(new Chess(BARE_KINGS)), {
      reason: "insufficient-material",
      winner: null,
    });
    assert.deepEqual(diagnoseTerminal(new Chess("8/8/4k3/8/8/8/8/K6R w - - 100 1")), {
      reason: "fifty-move",
      winner: null,
    });
    assert.equal(diagnoseTerminal(new Chess(START_FEN)), null);
  });

  it("prefers checkmate over a simultaneous fifty-move draw", () => {
    const mated = new Chess("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 100 3");
    assert.deepEqual(diagnoseTerminal(mated), { reason: "checkmate", winner: "b" });
  });
});

describe("coreSearch with a deterministic evaluator", () => {
  it("one visit expands the root and picks the policy argmax", () => {
    const state = createPositionState(positionOf([]));
    const out = coreSearch(state, 1, biasedEval("e2", "e4", 0.5));
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    assert.equal(out.result.uci, "e2e4");
    assert.equal(out.completedVisits, 1);
    assert.equal(out.result.visits, 1);
    assert.ok(Math.abs(out.result.value - 0.5) < 1e-6);
    assert.ok(out.result.children.length <= 8);
    const legal = new Chess().moves({ verbose: true }).map((m) => m.from + m.to);
    for (const ch of out.result.children) assert.ok(legal.includes(ch.uci));
    const best = [...out.result.children].sort((a, b) => b.prior - a.prior)[0];
    assert.equal(out.result.uci, best.uci);
  });

  it("64 visits complete exactly and rank children by visits", () => {
    const state = createPositionState(positionOf([]));
    const out = coreSearch(state, 64, constantEval(zeroPolicy(), 0.25));
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    assert.equal(out.completedVisits, 64);
    assert.equal(out.result.visits, 64);
    assert.ok(out.result.value >= -1 && out.result.value <= 1);
    let total = 0;
    for (let i = 0; i < out.result.children.length; i++) {
      const ch = out.result.children[i];
      total += ch.visits;
      if (i > 0) assert.ok(out.result.children[i - 1].visits >= ch.visits);
    }
    assert.ok(total > 0 && total <= 63);
  });

  it("returns typed terminal outcomes with zero completed visits", () => {
    const out = coreSearch(createPositionState(MATE_FEN), 64, constantEval(zeroPolicy()));
    assert.equal(out.kind, "terminal");
    if (out.kind !== "terminal") return;
    assert.equal(out.terminal.reason, "checkmate");
    assert.equal(out.terminal.winner, "b");
    assert.equal(out.completedVisits, 0);
  });

  it("reconstructs threefold repetition only from full history", () => {
    const fen = replay(SHUTTLES);
    const withHistory = createPositionState(capturePosition(START_FEN, SHUTTLES, fen));
    assert.deepEqual(diagnoseTerminal(withHistory.board), {
      reason: "threefold-repetition",
      winner: null,
    });
    const terminalOut = coreSearch(withHistory, 64, constantEval(zeroPolicy()));
    assert.equal(terminalOut.kind, "terminal");
    const bare = createPositionState(fen);
    assert.equal(diagnoseTerminal(bare.board), null);
    const moveOut = coreSearch(bare, 1, constantEval(zeroPolicy()));
    assert.equal(moveOut.kind, "move");
  });

  it("passes the raw en-passant target to the evaluator", () => {
    const seen: (Square | null)[] = [];
    const evalSpy: PositionEvaluator = (_board, rawEp) => {
      seen.push(rawEp);
      return { policy: zeroPolicy(), value: 0 };
    };
    const afterE4 = capturePosition(START_FEN, ["e2e4"], replay(["e2e4"]));
    coreSearch(createPositionState(afterE4), 1, evalSpy);
    assert.equal(seen[0], "e3");
    const afterE4C5 = capturePosition(START_FEN, ["e2e4", "c7c5"], replay(["e2e4", "c7c5"]));
    coreSearch(createPositionState(afterE4C5), 1, evalSpy);
    assert.equal(seen[1], "c6");
    const state = createPositionState(afterE4C5);
    assert.equal(state.board.fen().split(" ")[3], "-");
    assert.equal(state.rawEpTarget, "c6");
  });

  it("restores complete history and targets when a mid-descent evaluation throws", () => {
    const state = createPositionState(positionOf(DEEP_HISTORY));
    const before = stateSnapshot(state);
    const rootFen = state.board.fen();
    let calls = 0;
    let leafFen: string | null = null;
    const throwing: PositionEvaluator = (board) => {
      calls += 1;
      leafFen = board.fen();
      if (calls > 1) throw new Error("evaluator blew up");
      return { policy: zeroPolicy(), value: 0 };
    };
    assert.throws(() => coreSearch(state, 4, throwing), /evaluator blew up/);
    assert.ok(calls >= 2);
    assert.notEqual(leafFen, rootFen);
    assert.deepEqual(stateSnapshot(state), before);
  });

  it("restores complete history and repetition after a mid-descent cancellation", () => {
    const state = createPositionState(positionOf(DEEP_HISTORY));
    const before = stateSnapshot(state);
    const rootFen = state.board.fen();
    assert.equal(before.rawEpTarget, "d6");
    assert.equal(before.legalEp, "-");
    assert.equal(before.uciHistory.length, DEEP_HISTORY.length);
    const controller = new AbortController();
    let calls = 0;
    let leafFen: string | null = null;
    const aborting: PositionEvaluator = (board) => {
      calls += 1;
      leafFen = board.fen();
      if (calls >= 2) controller.abort();
      return { policy: zeroPolicy(), value: 0 };
    };
    assert.throws(
      () =>
        coreSearch(state, 4, aborting, {
          signal: controller.signal,
          deadlineMs: Infinity,
          now: () => 0,
        }),
      SearchCancelledError,
    );
    assert.equal(calls, 2);
    assert.notEqual(leafFen, rootFen);
    assert.deepEqual(stateSnapshot(state), before);
  });

  it("honours cancellation and deadlines and still restores", () => {
    const aborted = new AbortController();
    aborted.abort();
    assert.throws(
      () =>
        coreSearch(createPositionState(positionOf([])), 4, constantEval(zeroPolicy()), {
          signal: aborted.signal,
          deadlineMs: Infinity,
          now: () => 0,
        }),
      SearchCancelledError,
    );
    assert.throws(
      () =>
        coreSearch(createPositionState(positionOf([])), 4, constantEval(zeroPolicy()), {
          signal: new AbortController().signal,
          deadlineMs: 10,
          now: () => 10,
        }),
      SearchDeadlineError,
    );
    const state = createPositionState(positionOf([]));
    let tick = 0;
    assert.throws(
      () =>
        coreSearch(state, 8, constantEval(zeroPolicy()), {
          signal: new AbortController().signal,
          deadlineMs: 3,
          now: () => tick++,
        }),
      SearchDeadlineError,
    );
    assert.equal(state.board.fen(), new Chess().fen());
    const epState = createPositionState(positionOf(["e2e4", "c7c5"]));
    const epBefore = epState.board.fen();
    let deep = 0;
    assert.throws(
      () =>
        coreSearch(epState, 8, constantEval(zeroPolicy()), {
          signal: new AbortController().signal,
          deadlineMs: 3,
          now: () => deep++,
        }),
      SearchDeadlineError,
    );
    assert.equal(epState.board.fen(), epBefore);
    assert.equal(epState.rawEpTarget, "c6");
  });

  it("backs up a forced mate for the side to move", () => {
    const mateIn1 = "6k1/8/6K1/8/8/8/8/R7 w - - 0 1";
    const out = coreSearch(createPositionState(mateIn1), 8, biasedEval("a1", "a8"));
    assert.equal(out.kind, "move");
    if (out.kind !== "move") return;
    assert.equal(out.result.uci, "a1a8");
    assert.ok(out.result.value > 0, `value ${out.result.value}`);
    const mateChild = out.result.children.find((c) => c.uci === "a1a8");
    assert.ok(mateChild !== undefined && mateChild.visits >= 1);
  });

  it("async search matches sync on the same evaluator", async () => {
    const a = coreSearch(createPositionState(positionOf([])), 4, biasedEval("e2", "e4"));
    const b = await coreSearchAsync(
      createPositionState(positionOf([])),
      4,
      biasedEval("e2", "e4"),
    );
    assert.equal(b.kind, "move");
    if (a.kind === "move" && b.kind === "move") {
      assert.equal(b.result.uci, a.result.uci);
      assert.equal(b.result.visits, a.result.visits);
      assert.equal(b.result.value, a.result.value);
      assert.deepEqual(
        b.result.children.map((c) => [c.uci, c.visits, c.prior]),
        a.result.children.map((c) => [c.uci, c.visits, c.prior]),
      );
    }
    assert.equal(b.completedVisits, a.completedVisits);
  });
});

describe("mcts wrappers", () => {
  it("rejects unplayable history with PositionInvalidError", () => {
    assert.throws(() => search("not a fen", 1, randomWeights(1)), PositionInvalidError);
    const wrong = capturePosition(START_FEN, ["e2e4"], START_FEN);
    assert.throws(() => search(wrong, 1, randomWeights(1)), PositionInvalidError);
  });

  it("a GamePosition and its equivalent FEN string search identically", async () => {
    const weights = randomWeights(2026);
    const a = search(positionOf(["e2e4", "e7e5"]), 1, weights);
    const b = search(OPEN_FEN, 1, weights);
    assert.equal(a.kind, "move");
    assert.equal(b.kind, "move");
    if (a.kind === "move" && b.kind === "move") assert.equal(a.result.uci, b.result.uci);
    const c = await searchAsync(positionOf(["e2e4", "e7e5"]), 1, weights);
    if (c.kind === "move" && a.kind === "move") assert.equal(c.result.uci, a.result.uci);
  });
});

describe("verifyOutcome", () => {
  const moveOutcome = (uci: string): SearchOutcome =>
    ({
      kind: "move",
      result: {
        uci,
        san: "x",
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        value: 0,
        visits: 1,
        ms: 0,
        children: [],
        heatmap: {},
      },
      completedVisits: 1,
      searchMs: 0,
    }) as const;

  it("accepts a legal move and rejects fabricated or terminal claims", () => {
    assert.equal(verifyOutcome(POSITION, moveOutcome("f1c4")), "ok");
    assert.equal(verifyOutcome(POSITION, moveOutcome("e2e5")), "illegal");
    assert.equal(
      verifyOutcome(POSITION, {
        kind: "terminal",
        terminal: { reason: "stalemate", winner: null },
        completedVisits: 0,
        searchMs: 0,
      }),
      "illegal",
    );
  });

  it("reports badpos when the context cannot be reconstructed", () => {
    const bad = capturePosition(START_FEN, ["e2e4"], START_FEN);
    assert.equal(verifyOutcome(bad, moveOutcome("e2e4")), "badpos");
    const mate = capturePosition(MATE_FEN, [], MATE_FEN);
    assert.equal(
      verifyOutcome(mate, {
        kind: "terminal",
        terminal: { reason: "checkmate", winner: "b" },
        completedVisits: 0,
        searchMs: 0,
      }),
      "ok",
    );
  });
});
