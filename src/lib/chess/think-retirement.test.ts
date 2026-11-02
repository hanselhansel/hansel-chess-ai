import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPERATION_DEADLINE_MS } from "./constants.ts";
import { createThinker } from "./think-client.ts";
import { mainCapabilities } from "./think-main.ts";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import { capturePosition } from "./position.ts";
import type { WeightSet } from "./weights.ts";
import {
  clockRuntime, contextOf, delayedClock, expectCode, FakeWorker, fetchOnce,
  mCheckpoint, moveOutcome, patchRuntime, readyMsg, sessionOf,
  START_FEN, tick, until, workerFactory,
} from "./think-test-fixtures.ts";

const emitReady = (w: FakeWorker) =>
  w.emit("message", readyMsg(w.posted[0], SELECTED_MODEL_IDENTITY));

const mutableCaps = mainCapabilities as {
  decode(bytes: ArrayBuffer): WeightSet;
};

describe("captured worker retirement", () => {
  it("a late failed transport retires the captured worker and never recovers", async () => {
    const clock = delayedClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const saved = mutableCaps.decode;
    let decodeCalls = 0;
    mutableCaps.decode = (b) => {
      decodeCalls += 1;
      return saved(b);
    };
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const pending = thinker.think(contextOf(ready.engineSessionId, 0));
      await until(() => workers[0].posted.length === 2);
      clock.advance(OPERATION_DEADLINE_MS + 1);
      workers[0].emit("error", new Error("worker died"));
      const failure = await expectCode(pending, "DEADLINE");
      assert.equal(workers[0].terminated, true);
      assert.equal(decodeCalls, 0);
      const lastAttempt = failure.attempts.at(-1);
      assert.equal(lastAttempt?.backend, "worker");
      assert.equal(lastAttempt?.disposition, "deadline");
      assert.equal(lastAttempt?.code, "DEADLINE");
      assert.equal(thinker.getState().backend, null);
      assert.equal(clock.pending(), 0);

      workers[0].emit("error", new Error("old worker again"));
      workers[0].emit("message", { garbage: true });
      assert.equal(decodeCalls, 0);
      assert.equal(thinker.getState().stage, "failed");

      const second = contextOf(ready.engineSessionId, 1);
      const next = thinker.think(second);
      await until(() => workers.length === 2 && workers[1].posted.length === 1);
      emitReady(workers[1]);
      await until(() => workers[1].posted.length === 2);
      workers[0].emit("error", new Error("old worker a third time"));
      workers[0].emit("message", { stale: "reply" });
      workers[1].emit("message", {
        ...sessionOf(workers[1].posted[0]), type: "result", context: second,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const response = await next;
      assert.equal(response.kind, "move");
      assert.equal(response.backend, "worker");
      assert.equal(response.backendEpoch, 2);
      assert.equal(decodeCalls, 0);
      assert.equal(workers[1].terminated, false);
    } finally {
      mutableCaps.decode = saved;
      thinker.terminate();
      unpatch();
    }
  });

  it("expiry inside the backend publication retires the assigned worker", async () => {
    const clock = delayedClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const thinker = createThinker();
    try {
      thinker.subscribe((s) => {
        if (s.stage === "starting" && workers.length === 1
            && workers[0].posted.length === 1) {
          clock.advance(OPERATION_DEADLINE_MS + 1);
        }
      });
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(workers[0].terminated, true);
      const state = thinker.getState();
      assert.equal(state.stage, "failed");
      assert.equal(state.error?.code, "DEADLINE");
      assert.equal(state.backend, null);
      assert.equal(clock.pending(), 0);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("an idle orphan fault inside a terminating recovery escapes nothing", async () => {
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    const saved = mutableCaps.decode;
    let decodeCalls = 0;
    mutableCaps.decode = (b) => {
      decodeCalls += 1;
      return saved(b);
    };
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      await thinker.ready;
      thinker.subscribe((s) => {
        if (s.stage === "recovering") thinker.terminate();
      });
      assert.doesNotThrow(() =>
        workers[0].emit("error", new Error("worker died"))
      );
      assert.equal(decodeCalls, 0);
      assert.equal(workers[0].terminated, true);
      assert.equal(thinker.getState().stage, "stopped");
      assert.equal(thinker.getState().backend, null);
    } finally {
      mutableCaps.decode = saved;
      thinker.terminate();
      unpatch();
    }
  });
});

describe("held-loading queued request", () => {
  it("a request submitted during the held body keeps its context into starting", async () => {
    const gate: { release?: (b: ArrayBuffer) => void } = {};
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: (async () => ({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((res) => {
            gate.release = res;
          }),
      })) as never,
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => gate.release !== undefined);
      const sessionId = thinker.getState().engineSessionId;
      const context = {
        engineSessionId: sessionId,
        gameGeneration: 3,
        requestId: 0,
        position: capturePosition(START_FEN, ["e2e4"],
          "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
        requestedVisits: 4,
      };
      const pending = thinker.think(context);
      await tick();
      const loading = thinker.getState();
      assert.equal(loading.stage, "loading");
      assert.equal(loading.backend, null);
      assert.equal(loading.error, null);
      assert.equal(loading.activeContext?.requestId, 0);
      assert.equal(loading.activeContext?.gameGeneration, 3);
      assert.equal(loading.activeContext?.requestedVisits, 4);
      assert.deepEqual(loading.activeContext?.position.movesUci, ["e2e4"]);
      const release = gate.release;
      assert.ok(release);
      release(mCheckpoint());
      await until(() => thinker.getState().stage === "starting");
      const starting = thinker.getState();
      assert.equal(starting.modelIdentity, SELECTED_MODEL_IDENTITY);
      assert.equal(starting.backend, "worker");
      assert.equal(starting.backendEpoch, 1);
      assert.equal(starting.activeContext?.requestId, 0);
      assert.deepEqual(starting.activeContext?.position.movesUci, ["e2e4"]);
      emitReady(workers[0]);
      await until(() => thinker.getState().stage === "thinking");
      assert.equal(thinker.getState().modelIdentity, SELECTED_MODEL_IDENTITY);
      workers[0].emit("message", {
        ...sessionOf(workers[0].posted[0]), type: "result", context,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e7e5", 4),
      });
      const response = await pending;
      assert.equal(response.kind, "move");
      assert.equal(response.backend, "worker");
      assert.equal(response.backendEpoch, 1);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });
});
