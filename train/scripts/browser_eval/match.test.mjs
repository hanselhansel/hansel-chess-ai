// Stub raw transports exercise actual rules/controller/checkpoint logic.
// Stub observations are DATA, never an actual worker/engine/phase pass.
import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { playGame, createGameCheckpoint } from "./match.mjs";
import { buildGameSchedule } from "./phase-fixtures.mjs";
import { checkpointResult } from "./pgn-format.mjs";
import { MODEL_IDENTITY } from "./schema-constants.mjs";
import { sha256Bytes } from "./canonical-json.mjs";
import { ownFixtureAttempt, registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

const own = (t, thunk) => ownFixtureAttempt(t, thunk);
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const model = { mode: "trained", modelName: "tinyaz-m", sha256: MODEL_IDENTITY.sha256,
  packedVersion: 1, parameterCount: MODEL_IDENTITY.parameterCount, byteLength: MODEL_IDENTITY.byteLength, channels: 128, sourceId: 1 };
const mateGame = () => ({ gameId: "p01-g1", pairNumber: 1, gameNumber: 1,
  openingId: "p01", candidateColor: "white", initialFen: "7k/5Q2/6K1/8/8/8/8/8 w - - 99 50", movesUci: [] });

function arm(kind, { move = "f7g7", mutateReady, mutateTurn, hold } = {}) {
  const calls = [];
  const worker = "actual-worker-fixture-1";
  return { kind, calls,
    async initialize() {
      calls.push("initialize");
      const ready = kind === "baseline" ? { paramCount: MODEL_IDENTITY.parameterCount, seed: 0, source: "lichess-2013-01" } :
        { engineSessionId: "session-1", modelIdentity: model, initialBackend: "worker", initialBackendEpoch: 1 };
      const raw = kind === "baseline" ? { type: "ready", ...ready } :
        { type: "ready", protocolVersion: 1, engineSessionId: ready.engineSessionId, backendEpoch: 1, modelIdentity: model };
      const value = { ready: structuredClone(ready), worker: { instanceId: worker, raw: structuredClone(raw) },
        delivery: { path: kind === "baseline" ? "/weights/tinyaz-s.bin" : "/weights/tinyaz-m.bin",
          sha256: MODEL_IDENTITY.sha256, byteLength: MODEL_IDENTITY.byteLength } };
      mutateReady?.(value);
      return value;
    },
    async think(request) {
      calls.push(structuredClone(request));
      if (hold !== undefined) {
        hold.entered.resolve();
        await hold.release.promise;
      }
      const result = { uci: typeof move === "function" ? move(request) : move, visits: 64 };
      let response;
      let raw;
      if (kind === "baseline") {
        response = result;
        raw = { type: "result", id: request.requestId, result: structuredClone(result) };
      } else {
        const context = { engineSessionId: "session-1", ...request };
        const outcome = { kind: "move", result, completedVisits: 64, searchMs: 1 };
        response = { ...outcome, context, modelIdentity: model, backend: "worker", backendEpoch: 1,
          attempts: [{ backend: "worker", disposition: "complete", completedVisits: 64 }] };
        raw = { type: "result", protocolVersion: 1, engineSessionId: "session-1", backendEpoch: 1,
          modelIdentity: model, context: structuredClone(context), outcome: structuredClone(outcome) };
      }
      const value = { response, worker: { instanceId: worker, raw } };
      mutateTurn?.(value);
      return value;
    },
  };
}

function checkpointHarness(game, phase, controller = new AbortController()) {
  const artifacts = [];
  const events = [];
  const capabilities = {
    manifest: { phase }, signal: controller.signal,
    async artifact(filename, mode, chunks) {
      const parts = [];
      for await (const chunk of chunks) {
        assert.ok(chunk.length <= 65536);
        parts.push(Buffer.from(chunk));
      }
      const bytes = Buffer.concat(parts);
      const ref = { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
      artifacts.push({ mode, ref, bytes });
      return ref;
    },
    async event(kind, payload) {
      events.push({ kind, payload: structuredClone(payload) });
    },
  };
  return { controller, capabilities, artifacts, events,
    checkpoint: createGameCheckpoint({ game, capabilities }) };
}

test("two baseline A/A control games end only on actual rules draws", async (t) => {
  for (const game of buildGameSchedule({ phase: "preflight" })) {
    const h = checkpointHarness(game, "preflight");
    const whiteRole = game.candidateColor === "white" ? "candidate" : "baseline";
    const arms = { candidate: arm("baseline", { move: "b1b2" }), baseline: arm("baseline", { move: "b1b2" }) };
    const result = await own(t, () => playGame({ game, arms, checkpoint: h.checkpoint, signal: h.controller.signal }));
    assert.equal(result.result, "1/2-1/2");
    assert.equal(h.events.length, 2);
    assert.equal(h.events[0].payload.result, "*");
    assert.equal(h.events[1].payload.result, "1/2-1/2");
    assert.equal(arms[whiteRole].calls.filter((call) => typeof call === "object").length, 1);
    assert.equal(h.artifacts[1].bytes.toString().includes('[White "baseline"]'), true);
  }
});

test("candidate full context/worker/identity reaches mate before fifty-move draw", async (t) => {
  const game = mateGame();
  const h = checkpointHarness(game, "compare");
  const candidate = arm("candidate");
  const result = await own(t, () => playGame({ game, arms: { candidate, baseline: arm("baseline") }, checkpoint: h.checkpoint, signal: h.controller.signal }));
  assert.equal(result.result, "1-0");
  assert.deepEqual(candidate.calls[1].position, { initialFen: game.initialFen, movesUci: [], expectedFen: game.initialFen });
  assert.equal(candidate.calls[1].requestedVisits, 64);
  assert.equal(h.events[1].payload.result, "1-0");
  const terminal = new Chess(h.events[1].payload.fen);
  assert.equal(terminal.isCheckmate(), true);
  assert.equal(checkpointResult(terminal), "1-0");
});

for (const [name, options] of [
  ["identity", { mutateReady: (value) => { value.ready.modelIdentity.sha256 = "0".repeat(64); } }],
  ["context", { mutateTurn: (value) => { value.response.context.requestId = 999; } }],
  ["worker epoch", { mutateTurn: (value) => { value.worker.raw.backendEpoch += 1; } }],
  ["completed visits", { mutateTurn: (value) => { value.response.completedVisits = 63; } }],
  ["illegal UCI", { move: "f7e5" }],
]) {
  test(`controller rejects wrong ${name} without a terminal PGN`, async (t) => {
    const game = mateGame();
    const h = checkpointHarness(game, "compare");
    await assert.rejects(own(t, () => playGame({ game, arms: { candidate: arm("candidate", options), baseline: arm("baseline") },
      checkpoint: h.checkpoint, signal: h.controller.signal })));
    assert.equal(h.events.length, 1);
    assert.equal(h.events[0].payload.result, "*");
  });
}

test("stop during held engine response preserves exact reason and initial checkpoint", async (t) => {
  const game = mateGame();
  const h = checkpointHarness(game, "compare");
  const hold = { entered: deferred(), release: deferred() };
  registerFixtureTeardown(t, { release: () => hold.release.resolve() });
  const result = own(t, () => playGame({ game, arms: { candidate: arm("candidate", { hold }), baseline: arm("baseline") },
    checkpoint: h.checkpoint, signal: h.controller.signal }));
  const reason = new Error("real stop");
  const rejection = assert.rejects(result, (error) => error === reason);
  await hold.entered.promise;
  h.controller.abort(reason);
  hold.release.resolve();
  await rejection;
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].payload.result, "*");
});

test("checkpoint factory waits for close and event ACK; stop prevents subsequent event", async (t) => {
  const game = mateGame();
  const h = checkpointHarness(game, "compare");
  const original = h.capabilities.artifact;
  const closed = deferred();
  const release = deferred();
  registerFixtureTeardown(t, { release: () => release.resolve() });
  h.capabilities.artifact = async (...args) => {
    const ref = await original(...args);
    closed.resolve();
    await release.promise;
    return ref;
  };
  // Construct after the test-owned lowlevel capability is installed.
  const checkpoint = createGameCheckpoint({ game, capabilities: h.capabilities });
  const result = own(t, () => checkpoint({ gameId: game.gameId, ordinal: 0,
    initialFen: game.initialFen, movesUci: [], fen: game.initialFen, result: "*" }));
  const reason = new Error("stop after actual close");
  const rejected = assert.rejects(result, (error) => error === reason);
  await closed.promise;
  assert.equal(h.events.length, 0);
  h.controller.abort(reason);
  release.resolve();
  await rejected;
  assert.equal(h.events.length, 0);
});

test("full opening and every accepted ply remain live for threefold repetition", async (t) => {
  const game = { ...mateGame(), initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    movesUci: ["g1f3", "g8f6", "f3g1", "f6g8"] };
  const next = (request) => ["g1f3", "g8f6", "f3g1", "f6g8"][request.position.movesUci.length - 4];
  const h = checkpointHarness(game, "compare");
  const candidate = arm("candidate", { move: next });
  const baseline = arm("baseline", { move: next });
  const result = await own(t, () => playGame({ game, arms: { candidate, baseline }, checkpoint: h.checkpoint, signal: h.controller.signal }));
  assert.equal(result.result, "1/2-1/2");
  assert.equal(h.events.length, 5);
  assert.equal(h.events[4].payload.plyCount, 8);
  assert.equal(candidate.calls[1].position.movesUci.length, 4);
  assert.equal(candidate.calls[2].position.movesUci.length, 6);
  assert.equal(baseline.calls[2].position.movesUci.length, 7);
});
