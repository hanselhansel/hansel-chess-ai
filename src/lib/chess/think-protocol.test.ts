import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import {
  isClientMessage,
  isWorkerMessage,
  sameContext,
  sameModelIdentity,
} from "./think-protocol.ts";
import {
  CONTEXT,
  DEMO_IDENTITY,
  FATAL_MESSAGE,
  INIT_ERROR,
  INIT_MESSAGE,
  MOVE_OUTCOME,
  MOVE_RESULT,
  OPEN_FEN,
  POSITION,
  READY_MESSAGE,
  REQUEST_ERROR,
  RESULT_MESSAGE,
  SESSION,
  START_FEN,
  THINK_MESSAGE,
} from "./think-test-fixtures.ts";
import type { RequestContext } from "./think-protocol.ts";

describe("client message guards", () => {
  it("accepts canonical init and think messages", () => {
    assert.equal(isClientMessage(INIT_MESSAGE), true);
    assert.equal(isClientMessage(THINK_MESSAGE), true);
    assert.equal(isClientMessage({ ...INIT_MESSAGE, modelIdentity: DEMO_IDENTITY }), true);
  });

  it("rejects worker-direction types, absent and wrong versions", () => {
    for (const msg of [READY_MESSAGE, RESULT_MESSAGE, INIT_ERROR, FATAL_MESSAGE]) {
      assert.equal(isClientMessage(msg), false);
    }
    for (const v of [undefined, null, 0, 2, "1", 1.5]) {
      assert.equal(isClientMessage({ ...INIT_MESSAGE, protocolVersion: v }), false);
      assert.equal(isClientMessage({ ...THINK_MESSAGE, protocolVersion: v }), false);
    }
  });

  it("rejects missing and extra keys", () => {
    const { bytes: _bytes, ...noBytes } = INIT_MESSAGE;
    assert.equal(isClientMessage(noBytes), false);
    assert.equal(isClientMessage({ ...INIT_MESSAGE, extra: 1 }), false);
    const { context: _context, ...noContext } = THINK_MESSAGE;
    assert.equal(isClientMessage(noContext), false);
  });

  it("requires an ArrayBuffer body and session agreement", () => {
    assert.equal(isClientMessage({ ...INIT_MESSAGE, bytes: [1, 2, 3] }), false);
    const shared = new SharedArrayBuffer(16) as unknown as ArrayBuffer;
    assert.equal(isClientMessage({ ...INIT_MESSAGE, bytes: shared }), false);
    const alien = { ...CONTEXT, engineSessionId: "session-2" };
    assert.equal(isClientMessage({ ...THINK_MESSAGE, context: alien }), false);
  });

  it("bounds remaining budget and requested visits", () => {
    for (const ms of [0, -1, 90001, Number.NaN, Number.POSITIVE_INFINITY, "x"]) {
      assert.equal(isClientMessage({ ...THINK_MESSAGE, remainingMs: ms }), false);
    }
    assert.equal(isClientMessage({ ...THINK_MESSAGE, remainingMs: 90000 }), true);
    for (const v of [0, 4097, -1, 1.5, "64", Number.MAX_SAFE_INTEGER + 1]) {
      const ctx = { ...CONTEXT, requestedVisits: v };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context: ctx }), false);
    }
    for (const v of [1, 4096]) {
      const ctx = { ...CONTEXT, requestedVisits: v };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context: ctx }), true);
    }
  });

  it("rejects malformed ids, epochs and positions", () => {
    for (const patch of [
      { engineSessionId: "" },
      { backendEpoch: -1 },
      { backendEpoch: 1.5 },
      { gameGeneration: -1 },
      { requestId: 0.5 },
    ]) {
      assert.equal(isClientMessage({ ...THINK_MESSAGE, ...patch }), false);
      assert.equal(
        isClientMessage({ ...THINK_MESSAGE, context: { ...CONTEXT, ...patch } }),
        false,
      );
    }
    const badMoves = {
      ...CONTEXT,
      position: { ...POSITION, movesUci: ["e2e4", "e7e9"] },
    };
    assert.equal(isClientMessage({ ...THINK_MESSAGE, context: badMoves }), false);
    const badFen = { ...CONTEXT, position: { ...POSITION, expectedFen: "fen" } };
    assert.equal(isClientMessage({ ...THINK_MESSAGE, context: badFen }), false);
  });

  it("rejects sparse move histories before and after cloning", () => {
    for (const movesUci of [new Array(1), ["e2e4", , "e7e5"]]) {
      const context = { ...CONTEXT, position: { ...POSITION, movesUci } };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context }), false);
      const cloned = structuredClone({ ...THINK_MESSAGE, context });
      assert.equal(isClientMessage(cloned), false);
    }
  });

  it("rejects malformed rank encoding and unsafe clock fields", () => {
    const badFens = [
      "rnbqkbnr/pppppppp/8/8/8/8/44/RNBQKBNR w KQkq - 0 1",
      "8/8/8/8/8/8/8/8 w - - 0 0",
      "8/8/8/8/8/8/8/8 w - - 0 9007199254740992",
      "8/8/8/8/8/8/8/8 w - - 9007199254740992 1",
      "8/8/8/8/8/8/8/8 w - - -1 5",
      "8/8/8/8/8/8/8/8 w - - 1 -3",
    ];
    for (const fen of badFens) {
      const root = { ...CONTEXT, position: { ...POSITION, initialFen: fen } };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context: root }), false, fen);
      const leaf = { ...CONTEXT, position: { ...POSITION, expectedFen: fen } };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context: leaf }), false, fen);
    }
  });

  it("accepts canonical roots carrying raw en-passant fields", () => {
    const roots = [
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "4k3/8/8/K2pP2r/8/8/8/8 w - d6 0 2",
    ];
    for (const fen of roots) {
      const context = {
        ...CONTEXT,
        position: { initialFen: fen, movesUci: [], expectedFen: fen },
      };
      assert.equal(isClientMessage({ ...THINK_MESSAGE, context }), true, fen);
    }
  });
});

describe("worker message guards", () => {
  it("accepts canonical ready, result, error and fatal messages", () => {
    for (const msg of [READY_MESSAGE, RESULT_MESSAGE, INIT_ERROR, REQUEST_ERROR, FATAL_MESSAGE]) {
      assert.equal(isWorkerMessage(msg), true);
    }
    assert.equal(isWorkerMessage({ ...READY_MESSAGE, modelIdentity: DEMO_IDENTITY }), true);
    assert.equal(isClientMessage(READY_MESSAGE), false);
  });

  it("rejects absent and wrong versions plus unknown discriminators", () => {
    for (const v of [undefined, null, 0, 2, "1"]) {
      assert.equal(isWorkerMessage({ ...READY_MESSAGE, protocolVersion: v }), false);
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, protocolVersion: v }), false);
      assert.equal(isWorkerMessage({ ...FATAL_MESSAGE, protocolVersion: v }), false);
    }
    assert.equal(isWorkerMessage({ ...SESSION, type: "mystery" }), false);
    assert.equal(isWorkerMessage({ ...SESSION, type: "error", scope: "unknown" }), false);
    assert.equal(isWorkerMessage({ ...FATAL_MESSAGE, engineSessionId: "s" }), false);
    assert.equal(isWorkerMessage({ ...FATAL_MESSAGE, code: "BUSY" }), false);
  });

  it("checks both outcome branches", () => {
    const terminal = {
      kind: "terminal",
      terminal: { reason: "checkmate", winner: "w" },
      completedVisits: 0,
      searchMs: 5,
    };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: terminal }), true);
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: MOVE_OUTCOME }), true);
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { ...MOVE_OUTCOME, terminal: terminal.terminal } }),
      false,
    );
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { ...terminal, result: MOVE_RESULT } }),
      false,
    );
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { kind: "move", completedVisits: 64, searchMs: 1 } }),
      false,
    );
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { kind: "other" } }),
      false,
    );
  });

  it("accepts every terminal reason and winner pairing", () => {
    const pairings: [string, string | null][] = [
      ["checkmate", "w"],
      ["checkmate", "b"],
      ["stalemate", null],
      ["insufficient-material", null],
      ["threefold-repetition", null],
      ["fifty-move", null],
    ];
    for (const [reason, winner] of pairings) {
      const outcome = { kind: "terminal", terminal: { reason, winner }, completedVisits: 0, searchMs: 5 };
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome }), true, reason);
    }
    for (const bad of [
      { reason: "checkmate", winner: null },
      { reason: "stalemate", winner: "w" },
      { reason: "resignation", winner: null },
      { reason: "checkmate" },
    ]) {
      const outcome = { kind: "terminal", terminal: bad, completedVisits: 0, searchMs: 5 };
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome }), false, bad.reason);
    }
    const visited = { kind: "terminal", terminal: { reason: "stalemate", winner: null }, completedVisits: 1, searchMs: 5 };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: visited }), false);
  });

  it("enforces complete move budget, visit bounds and ms agreement", () => {
    for (const completed of [63, 0, 4097, 1.5]) {
      const outcome = { ...MOVE_OUTCOME, completedVisits: completed };
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome }), false);
    }
    const visits = { ...MOVE_OUTCOME, result: { ...MOVE_RESULT, visits: 63 } };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: visits }), false);
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { ...MOVE_OUTCOME, searchMs: 12.6 } }),
      false,
    );
    for (const ms of [-1, Number.NaN, "12"]) {
      assert.equal(
        isWorkerMessage({ ...RESULT_MESSAGE, outcome: { ...MOVE_OUTCOME, searchMs: ms } }),
        false,
      );
    }
    const fractional = { ...MOVE_OUTCOME, result: { ...MOVE_RESULT, ms: 12.5 } };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: fractional }), false);
  });

  it("requires unique, top-eight, in-range child records", () => {
    const dup = {
      ...MOVE_OUTCOME,
      result: {
        ...MOVE_RESULT,
        children: [MOVE_RESULT.children[0], MOVE_RESULT.children[0]],
      },
    };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: dup }), false);
    const nine = {
      ...MOVE_OUTCOME,
      result: { ...MOVE_RESULT, children: Array(9).fill(MOVE_RESULT.children[0]) },
    };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome: nine }), false);
    for (const child of [
      { san: "e5", uci: "e7e5", visits: 64, q: 0, prior: 0.5 },
      { san: "e5", uci: "e7e5", visits: -1, q: 0, prior: 0.5 },
      { san: "e5", uci: "e7e5", visits: 3, q: 1.5, prior: 0.5 },
      { san: "e5", uci: "e7e5", visits: 3, q: 0, prior: 1.5 },
      { san: "e5", uci: "e7e9", visits: 3, q: 0, prior: 0.5 },
      { san: "", uci: "e7e5", visits: 3, q: 0, prior: 0.5 },
    ]) {
      const outcome = { ...MOVE_OUTCOME, result: { ...MOVE_RESULT, children: [child] } };
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome }), false);
    }
  });

  it("validates move shape, promotion omission and heatmap ranges", () => {
    const promo = { ...MOVE_RESULT, uci: "e7e8q", from: "e7", to: "e8", promotion: "q" };
    assert.equal(
      isWorkerMessage({ ...RESULT_MESSAGE, outcome: { ...MOVE_OUTCOME, result: promo } }),
      true,
    );
    for (const result of [
      { ...MOVE_RESULT, uci: "f1c4q" },
      { ...MOVE_RESULT, promotion: "x", uci: "f1c4x" },
      { ...MOVE_RESULT, promotion: "q", uci: "f1c4" },
      { ...MOVE_RESULT, from: "i1" },
      { ...MOVE_RESULT, to: "c9" },
      { ...MOVE_RESULT, value: 2 },
      { ...MOVE_RESULT, heatmap: { c4: 1.5 } },
      { ...MOVE_RESULT, heatmap: { z9: 0.5 } },
      { ...MOVE_RESULT, children: "none" },
    ]) {
      const outcome = { ...MOVE_OUTCOME, result };
      assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, outcome }), false);
    }
  });

  it("validates identity discriminants and full session agreement", () => {
    for (const identity of [
      { ...DEMO_IDENTITY, sha256: "not-a-sha" },
      { ...DEMO_IDENTITY, seed: 2025 },
      { ...DEMO_IDENTITY, parameterCount: 2426706 },
      { ...DEMO_IDENTITY, mode: "trained" },
      { ...SELECTED_MODEL_IDENTITY, mode: "random-demo" },
      { ...SELECTED_MODEL_IDENTITY, seed: 2026 },
      { ...SELECTED_MODEL_IDENTITY, sha256: "a".repeat(64) },
      { mode: "mystery" },
    ]) {
      assert.equal(isWorkerMessage({ ...READY_MESSAGE, modelIdentity: identity }), false);
    }
    const alien = { ...CONTEXT, engineSessionId: "session-2" };
    assert.equal(isWorkerMessage({ ...RESULT_MESSAGE, context: alien }), false);
    assert.equal(isWorkerMessage({ ...REQUEST_ERROR, context: alien }), false);
  });

  it("accepts all eighteen error codes and rejects unknown codes", () => {
    const codes = [
      "LOAD_HTTP",
      "LOAD_FORMAT",
      "LOAD_LENGTH",
      "LOAD_NONFINITE",
      "LOAD_DIGEST",
      "CRYPTO_UNAVAILABLE",
      "MODEL_MISMATCH",
      "POSITION_INVALID",
      "PROTOCOL_INVALID",
      "PROTOCOL_VERSION",
      "NOT_READY",
      "BUSY",
      "WORKER_UNAVAILABLE",
      "SEARCH_FAILED",
      "ILLEGAL_RESULT",
      "CANCELLED",
      "DEADLINE",
      "STOPPED",
    ];
    assert.equal(codes.length, 18);
    for (const code of codes) {
      const msg = { ...REQUEST_ERROR, failure: { ...REQUEST_ERROR.failure, code } };
      assert.equal(isWorkerMessage(msg), true, code);
    }
    const bogus = { ...REQUEST_ERROR, failure: { ...REQUEST_ERROR.failure, code: "BOGUS" } };
    assert.equal(isWorkerMessage(bogus), false);
    const long = { ...REQUEST_ERROR, failure: { ...REQUEST_ERROR.failure, diagnostic: "x".repeat(2049) } };
    assert.equal(isWorkerMessage(long), false);
  });
});

describe("context and identity equality", () => {
  it("compares every context field deeply", () => {
    assert.equal(sameContext(CONTEXT, structuredClone(CONTEXT)), true);
    const variants: Partial<RequestContext>[] = [
      { engineSessionId: "other" },
      { gameGeneration: 3 },
      { requestId: 8 },
      { requestedVisits: 32 },
      { position: { ...POSITION, initialFen: OPEN_FEN } },
      { position: { ...POSITION, expectedFen: START_FEN } },
      { position: { ...POSITION, movesUci: ["e2e4"] } },
      { position: { ...POSITION, movesUci: ["e7e5", "e2e4"] } },
    ];
    for (const patch of variants) {
      assert.equal(sameContext(CONTEXT, { ...CONTEXT, ...patch }), false);
    }
  });

  it("compares every history index symmetrically", () => {
    const sparseMoves = new Array(1);
    const sparse = { ...CONTEXT, position: { ...POSITION, movesUci: sparseMoves } };
    const dense = { ...CONTEXT, position: { ...POSITION, movesUci: ["e2e4"] } };
    assert.equal(sameContext(sparse, dense), false);
    assert.equal(sameContext(dense, sparse), false);
    const forward = {
      ...CONTEXT,
      position: { ...POSITION, movesUci: ["e2e4", "e7e5"] },
    };
    const swapped = {
      ...CONTEXT,
      position: { ...POSITION, movesUci: ["e7e5", "e2e4"] },
    };
    assert.equal(sameContext(forward, swapped), false);
    assert.equal(sameContext(swapped, forward), false);
    assert.equal(sameContext(dense, structuredClone(dense)), true);
  });

  it("re-exports the checkpoint-owned identity comparison", () => {
    assert.equal(sameModelIdentity(SELECTED_MODEL_IDENTITY, SELECTED_MODEL_IDENTITY), true);
    assert.equal(sameModelIdentity(SELECTED_MODEL_IDENTITY, DEMO_IDENTITY), false);
    assert.equal(sameModelIdentity(DEMO_IDENTITY, { ...DEMO_IDENTITY }), true);
  });
});
