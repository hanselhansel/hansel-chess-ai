import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { describe, it } from "node:test";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import { OPERATION_DEADLINE_MS } from "./constants.ts";
import { createThinker } from "./think-client.ts";
import type { ClientMessage, EngineState, Thinker } from "./think-protocol.ts";
import {
  contextOf,
  expectCode,
  FakeWorker,
  fetchOnce,
  makeClock,
  moveOutcome,
  patchRuntime,
  readyMsg,
  rejection,
  sessionOf,
  START_FEN,
  tick,
  until,
  workerFactory,
} from "./think-test-fixtures.ts";
const noop = () => {};

const emitReady = (w: FakeWorker) =>
  w.emit("message", readyMsg(w.posted[0], SELECTED_MODEL_IDENTITY));

const wireError = (posted: ClientMessage, scope: "initialization" | "request",
  code: string, diagnostic: string, context?: unknown) =>
  ({
    ...sessionOf(posted), type: "error", scope,
    ...(context === undefined ? {} : { context }),
    failure: { code, diagnostic, searchMs: null, completedVisits: null },
  });

async function toInitPost(counter = { n: 0 }): Promise<
  { thinker: Thinker; workers: FakeWorker[]; unpatch: () => void }
> {
  const workers: FakeWorker[] = [];
  const unpatch = patchRuntime({
    fetch: fetchOnce(counter),
    createWorker: workerFactory(workers),
  });
  const thinker = createThinker();
  await until(() => workers.length === 1 && workers[0].posted.length === 1);
  return { thinker, workers, unpatch };
}

describe("recovery provenance", () => {
  it("an explicit wire init error never consumes the recovery", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      workers[0].emit("message",
        wireError(workers[0].posted[0], "initialization", "WORKER_UNAVAILABLE", "refused init"));
      await expectCode(thinker.ready, "WORKER_UNAVAILABLE");
      const state = thinker.getState();
      assert.equal(state.stage, "failed");
      assert.equal(state.backend, null);
      assert.equal(state.modelIdentity, SELECTED_MODEL_IDENTITY);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("an explicit wire request error stays a request fault", async () => {
    const counter = { n: 0 };
    const { thinker, workers, unpatch } = await toInitPost(counter);
    try {
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const first = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(first);
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("message",
        wireError(workers[0].posted[0], "request", "WORKER_UNAVAILABLE", "said it was gone", first));
      await expectCode(pending, "WORKER_UNAVAILABLE");
      assert.equal(thinker.getState().backend, "worker");
      assert.equal(workers.length, 1);
      assert.equal(workers[0].terminated, false);

      const second = contextOf(ready.engineSessionId, 1);
      const next = thinker.think(second);
      await until(() => workers[0].posted.length === 3);
      workers[0].emit("message", {
        ...sessionOf(workers[0].posted[0]), type: "result", context: second,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const response = await next;
      assert.equal(response.backend, "worker");
      assert.equal(response.backendEpoch, 1);
      assert.equal(counter.n, 1);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a genuine transport crash mid-request recovers to main once", async () => {
    const counter = { n: 0 };
    const { thinker, workers, unpatch } = await toInitPost(counter);
    try {
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const pending = thinker.think(contextOf(ready.engineSessionId, 0));
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("error", new Error("worker died"));
      const response = await pending;
      assert.equal(response.backend, "main");
      assert.equal(response.backendEpoch, 2);
      assert.equal(counter.n, 1);
      assert.equal(response.kind, "move");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });
});

describe("stage and identity publication", () => {
  it("failed and stopped snapshots preserve the verified identity", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      workers[0].emit("message",
        wireError(workers[0].posted[0], "initialization", "MODEL_MISMATCH", "wrong model"));
      await expectCode(thinker.ready, "MODEL_MISMATCH");
      const failed = thinker.getState();
      assert.equal(failed.stage, "failed");
      assert.equal(failed.modelIdentity, SELECTED_MODEL_IDENTITY);
      thinker.terminate();
      const stopped = thinker.getState();
      assert.equal(stopped.stage, "stopped");
      assert.equal(stopped.modelIdentity, SELECTED_MODEL_IDENTITY);
    } finally {
      unpatch();
    }
  });
});

describe("disposal and subscribers", () => {
  it("terminate during fetch and during the ack wait settles STOPPED", async () => {
    const unpatch = patchRuntime({
      fetch: (() => new Promise(noop)) as never,
      createWorker: () => new FakeWorker(),
    });
    const t1 = createThinker();
    try {
      t1.terminate();
      await expectCode(t1.ready, "STOPPED");
      assert.equal(t1.getState().stage, "stopped");
    } finally {
      unpatch();
    }

    const { thinker, workers, unpatch: unpatch2 } = await toInitPost({ n: 0 });
    try {
      assert.equal(workers.length, 1);
      thinker.terminate();
      await expectCode(thinker.ready, "STOPPED");
      assert.equal(thinker.getState().stage, "stopped");
      assert.equal(workers[0].terminated, true);
    } finally {
      unpatch2();
    }
  });

  it("a queued request settles STOPPED when the engine is terminated", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      assert.equal(workers.length, 1);
      const pending = thinker.think(
        contextOf(thinker.getState().engineSessionId, 0),
      );
      await tick();
      thinker.terminate();
      await expectCode(pending, "STOPPED");
      await expectCode(thinker.ready, "STOPPED");
    } finally {
      unpatch();
    }
  });

  it("throwing and reentrant subscribers cannot break publication", async () => {
    const { thinker, unpatch } = await toInitPost({ n: 0 });
    const seen: EngineState[] = [];
    try {
      const bad = thinker.subscribe(() => {
        throw new Error("listener exploded");
      });
      thinker.subscribe((s) => {
        seen.push(s);
        if (s.stage === "starting") {
          thinker.subscribe(() => {
            throw new Error("reentrant");
          });
        }
      });
      bad();
      bad();
      thinker.terminate();
      assert.ok(seen.length > 0);
      assert.equal(seen[seen.length - 1].stage, "stopped");
      const after: EngineState[] = [];
      thinker.subscribe((s) => after.push(s));
      assert.equal(after.length, 1);
      assert.equal(after[0].stage, "stopped");
    } finally {
      unpatch();
    }
  });

  it("a starting subscriber that terminates prevents construction entirely", async () => {
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      thinker.subscribe((s) => {
        if (s.stage === "starting") thinker.terminate();
      });
      await expectCode(thinker.ready, "STOPPED");
      assert.equal(workers.length, 0);
      assert.equal(thinker.getState().stage, "stopped");
    } finally {
      unpatch();
    }
  });

  it("a constructor-side expiry retires the channel before init posts", async () => {
    const clock = makeClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      now: clock.now,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      createWorker: () => {
        clock.advance(OPERATION_DEADLINE_MS + 1);
        const w = new FakeWorker();
        workers.push(w);
        return w;
      },
    });
    const thinker = createThinker();
    try {
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(workers.length, 1);
      assert.equal(workers[0].posted.length, 0);
      assert.equal(workers[0].terminated, true);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a subscriber that terminates during startup recovery skips the decode", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      let fired = false;
      thinker.subscribe((s) => {
        if (!fired && s.stage === "recovering") {
          fired = true;
          thinker.terminate();
        }
      });
      workers[0].emit("error", new Error("worker died at init"));
      await expectCode(thinker.ready, "STOPPED");
      assert.equal(thinker.getState().backend, null);
      assert.equal(thinker.getState().stage, "stopped");
    } finally {
      unpatch();
    }
  });

  it("a queued request cancelled during startup recovery keeps the real phase", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    const seen: EngineState[] = [];
    let pending: Promise<unknown> | null = null;
    let fired = false;
    thinker.subscribe((s) => {
      seen.push(s);
      if (!fired && s.stage === "recovering") {
        fired = true;
        pending = thinker.think(contextOf(s.engineSessionId, 0));
        thinker.cancel(0);
      }
    });
    try {
      workers[0].emit("error", new Error("worker died at init"));
      const ready = await thinker.ready;
      assert.equal(ready.initialBackend, "main");
      const failure = (await rejection(pending!)) as { code: string; context: { requestId: number } };
      assert.equal(failure.code, "CANCELLED");
      assert.equal(failure.context.requestId, 0);
      const recovering = seen.filter((s) => s.stage === "recovering");
      assert.ok(recovering.some((s) => s.activeContext?.requestId === 0));
      assert.equal(recovering.at(-1)?.activeContext, null);
      assert.equal(thinker.getState().stage, "ready");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a queued request carries its own context into a readiness failure", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      const sessionId = thinker.getState().engineSessionId;
      const pending = thinker.think(contextOf(sessionId, 0));
      await tick();
      workers[0].emit("message",
        wireError(workers[0].posted[0], "initialization", "MODEL_MISMATCH", "wrong model"));
      const failure = await expectCode(pending, "MODEL_MISMATCH");
      assert.equal(failure.context?.requestId, 0);
      assert.ok(Object.isFrozen(failure.context));
      assert.equal(failure.attempts.length, 0);
      assert.notEqual(failure.cause, undefined);
      const state = thinker.getState();
      assert.equal(state.stage, "failed");
      assert.equal(state.error?.context?.requestId, 0);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("the stored request context is an immutable copy of caller input", async () => {
    const { thinker, workers, unpatch } = await toInitPost({ n: 0 });
    try {
      assert.equal(workers.length, 1);
      const uci = ["e2e4"];
      const g = new Chess();
      g.move({ from: "e2", to: "e4" });
      const engineSessionId = thinker.getState().engineSessionId;
      const rawFen = g.fen();
      const context = {
        ...contextOf(engineSessionId, 0),
        position: { initialFen: START_FEN, movesUci: uci, expectedFen: rawFen },
      };
      const pending = thinker.think(context);
      await tick();
      uci.push("e7e5");
      (context as { requestId: number }).requestId = 99;
      const stored = thinker.getState().activeContext;
      assert.ok(stored !== null);
      assert.equal(stored.requestId, 0);
      assert.deepEqual([...stored.position.movesUci], ["e2e4"]);
      assert.ok(Object.isFrozen(stored.position.movesUci));
      assert.ok(Object.isFrozen(stored));
      thinker.terminate();
      await rejection(pending);
    } finally {
      unpatch();
    }
  });
});
