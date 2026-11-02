import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import { OPERATION_DEADLINE_MS, SELECTED_CHECKPOINT, WORKER_ACK_MS } from "./constants.ts";
import { createThinker } from "./think-client.ts";
import {
  openWorkerChannel, isChannelFailure, type WorkerChannel,
} from "./think-worker-client.ts";
import type { EngineState, Thinker } from "./think-protocol.ts";
import {
  clockRuntime,
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
  tick,
  until,
  workerFactory,
} from "./think-test-fixtures.ts";

describe("thinker lifecycle", () => {
  it("rejects ready with a typed load failure and never builds a worker", async () => {
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: (async () => ({ ok: false, status: 404 })) as never,
      createWorker: workerFactory(workers),
    });
    try {
      const thinker = createThinker();
      await expectCode(thinker.ready, "LOAD_HTTP");
      assert.equal(thinker.getState().stage, "failed");
      const error = thinker.getState().error;
      assert.equal(error?.code, "LOAD_HTTP");
      assert.equal(thinker.getState().modelIdentity, null);
      assert.equal(workers.length, 0);
      thinker.terminate();
    } finally {
      unpatch();
    }
  });

  it("verifies the pinned checkpoint, starts one worker, and completes a request", async () => {
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce(counter),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      const init = workers[0].posted[0];
      assert.equal(init.type, "init");
      assert.equal((init as { bytes: ArrayBuffer }).bytes.byteLength, SELECTED_CHECKPOINT.byteLength);
      workers[0].emit("message", readyMsg(init, SELECTED_MODEL_IDENTITY));
      const ready = await thinker.ready;
      assert.equal(ready.modelIdentity, SELECTED_MODEL_IDENTITY);
      assert.equal(ready.initialBackend, "worker");
      assert.equal(ready.initialBackendEpoch, 1);
      assert.ok(ready.attempts.length >= 1);

      const context = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(context);
      await until(() => workers[0].posted.length === 2);
      const think = workers[0].posted[1] as { type: string; remainingMs: number };
      assert.equal(think.type, "think");
      assert.ok(think.remainingMs > 0 && think.remainingMs <= OPERATION_DEADLINE_MS);
      workers[0].emit("message", {
        ...sessionOf(init), type: "result", context,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const response = await pending;
      assert.equal(response.kind, "move");
      if (response.kind === "move") assert.equal(response.result.uci, "e2e4");
      assert.equal(response.backend, "worker");
      assert.equal(response.backendEpoch, 1);
      assert.equal(response.modelIdentity, SELECTED_MODEL_IDENTITY);
      assert.equal(response.attempts[0]?.disposition, "complete");
      assert.equal(response.attempts[0]?.searchMs, 1);
      assert.ok(Object.isFrozen(response));
      assert.ok(Object.isFrozen(response.context));
      assert.ok(Object.isFrozen(response.context.position.movesUci));
      assert.equal(thinker.getState().stage, "ready");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("recovers to the main backend once with no refetch", async () => {
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce(counter),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      workers[0].emit("error", new Error("worker crashed"));
      const ready = await thinker.ready;
      assert.equal(ready.initialBackend, "main");
      assert.equal(ready.initialBackendEpoch, 2);
      assert.equal(counter.n, 1);
      assert.equal(thinker.getState().backend, "main");
      const response = await thinker.think(contextOf(ready.engineSessionId, 0));
      assert.equal(response.backend, "main");
      assert.equal(response.backendEpoch, 2);
      assert.equal(response.kind, "move");
      assert.equal(counter.n, 1);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("cancels a pending request independently and serializes the successor", async () => {
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce(counter),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      const init = workers[0].posted[0];
      workers[0].emit("message", readyMsg(init, SELECTED_MODEL_IDENTITY));
      const ready = await thinker.ready;
      const first = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(first);
      await until(() => workers[0].posted.length === 2);
      await expectCode(thinker.think(contextOf(ready.engineSessionId, 1)), "BUSY");
      assert.equal(thinker.cancel(first.requestId), true);
      const failure = await expectCode(pending, "CANCELLED");
      assert.equal(failure.attempts[0]?.disposition, "cancelled");
      assert.equal(thinker.getState().stage, "ready");
      assert.equal(workers[0].terminated, true);

      const second = contextOf(ready.engineSessionId, 1);
      const next = thinker.think(second);
      await until(() => workers.length === 2 && workers[1].posted.length === 1);
      workers[1].emit("message", readyMsg(workers[1].posted[0], SELECTED_MODEL_IDENTITY));
      await until(() => workers[1].posted.length === 2);
      workers[1].emit("message", {
        ...sessionOf(workers[1].posted[0]), type: "result", context: second,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const response = await next;
      assert.equal(response.kind, "move");
      assert.equal(response.backend, "worker");
      assert.equal(response.backendEpoch, 2);
      await expectCode(thinker.think(contextOf(ready.engineSessionId, 1)), "PROTOCOL_INVALID");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("rejects an illegal worker outcome as a typed request failure", async () => {
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      const init = workers[0].posted[0];
      workers[0].emit("message", readyMsg(init, SELECTED_MODEL_IDENTITY));
      const ready = await thinker.ready;
      const context = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(context);
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("message", {
        ...sessionOf(init), type: "result", context,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e5", 1),
      });
      await expectCode(pending, "ILLEGAL_RESULT");
      assert.equal(thinker.getState().stage, "failed");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("enforces queued, post-ready and ack deadlines on a fake clock", async () => {
    const clock = makeClock();
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, counter));
    const thinker: Thinker = createThinker();
    try {
      const queued = thinker.think(contextOf(thinker.getState().engineSessionId, 0));
      await tick();
      clock.advance(OPERATION_DEADLINE_MS + 1);
      const early = await Promise.allSettled([thinker.ready, queued]);
      assert.equal(early[0].status, "rejected");
      assert.equal(early[1].status, "rejected");
      thinker.terminate();
      unpatch();

      const workers2: FakeWorker[] = [];
      const unpatch2 = patchRuntime(clockRuntime(clock, workers2, counter));
      const t2 = createThinker();
      try {
        await until(() => workers2.length === 1 && workers2[0].posted.length === 1);
        workers2[0].emit(
          "message",
          readyMsg(workers2[0].posted[0], SELECTED_MODEL_IDENTITY),
        );
        const ready = await t2.ready;
        assert.equal(ready.initialBackend, "worker");
        const context = contextOf(ready.engineSessionId, 0);
        const pending = t2.think(context);
        await until(() => workers2[0].posted.length === 2);
        clock.advance(OPERATION_DEADLINE_MS + 1);
        const failure = await expectCode(pending, "DEADLINE");
        assert.equal(failure.attempts[0]?.disposition, "deadline");
        assert.equal(workers2[0].terminated, true);
      } finally {
        t2.terminate();
        unpatch2();
      }

      const workers3: FakeWorker[] = [];
      const unpatch3 = patchRuntime(clockRuntime(clock, workers3, counter));
      const t3 = createThinker();
      try {
        await until(() => workers3.length === 1 && workers3[0].posted.length === 1);
        clock.advance(WORKER_ACK_MS + 1);
        const ready = await t3.ready;
        assert.equal(ready.initialBackend, "main");
        assert.equal(counter.n, 3);
      } finally {
        t3.terminate();
        unpatch3();
      }
    } finally {
      unpatch();
    }
  });

  it("publishes a frozen stopped snapshot and rejects late subscribers once", async () => {
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      thinker.terminate();
      await expectCode(thinker.ready, "STOPPED");
      const stopped = thinker.getState();
      assert.equal(stopped.stage, "stopped");
      assert.ok(Object.isFrozen(stopped));
      const seen: EngineState[] = [];
      thinker.subscribe((s) => seen.push(s));
      assert.equal(seen.length, 1);
      assert.equal(seen[0], stopped);
      await expectCode(
        thinker.think(contextOf(stopped.engineSessionId, 0)),
        "STOPPED",
      );
    } finally {
      unpatch();
    }
  });
});

describe("worker channel guards", () => {
  function channelPair() {
    const workers: FakeWorker[] = [];
    const orphans: string[] = [];
    const unpatch = patchRuntime({
      createWorker: workerFactory(workers),
    });
    const channel = openWorkerChannel({
      engineSessionId: "session-1",
      backendEpoch: 3,
      expectedIdentity: SELECTED_MODEL_IDENTITY,
      onOrphan: (f) => orphans.push(f.code),
    });
    return { workers, channel, orphans, unpatch };
  }

  const initSession = {
    protocolVersion: 1,
    engineSessionId: "session-1",
    backendEpoch: 3,
  };

  async function readyUp(channel: WorkerChannel, worker: FakeWorker) {
    const init = channel.init(SELECTED_MODEL_IDENTITY, new ArrayBuffer(16));
    worker.emit("message", { ...initSession, type: "ready", modelIdentity: SELECTED_MODEL_IDENTITY });
    await init;
  }

  it("faults before reading scoped fields on a fatal message", async () => {
    const { workers, channel, unpatch } = channelPair();
    try {
      const init = channel.init(SELECTED_MODEL_IDENTITY, new ArrayBuffer(16));
      workers[0].emit("message", {
        protocolVersion: 1,
        type: "fatal",
        code: "PROTOCOL_VERSION",
        diagnostic: "v2 required",
      });
      const failure = await rejection(init);
      assert.ok(isChannelFailure(failure));
      assert.equal((failure as { code: string }).code, "PROTOCOL_VERSION");
    } finally {
      channel.retire();
      unpatch();
    }
  });

  it("discards retired reply ids even while a newer request is pending", async () => {
    const { workers, channel, unpatch } = channelPair();
    try {
      await readyUp(channel, workers[0]);
      const ctxA = contextOf("session-1", 0);
      const first = channel.think(ctxA, 1000);
      channel.expireRequest(0);
      const cancelled = await rejection(first);
      assert.equal((cancelled as { code: string }).code, "CANCELLED");
      const ctxB = contextOf("session-1", 1);
      const second = channel.think(ctxB, 1000);
      workers[0].emit("message", {
        ...initSession, type: "result", context: ctxA,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      assert.equal(channel.staleCount, 1);
      workers[0].emit("message", {
        ...initSession, type: "result", context: ctxB,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const reply = await second;
      assert.equal(reply.context.requestId, 1);
    } finally {
      channel.retire();
      unpatch();
    }
  });

  it("faults on unknown ids, stale epochs, and future epochs", async () => {
    const { workers, channel, unpatch } = channelPair();
    try {
      await readyUp(channel, workers[0]);
      workers[0].emit("message", {
        ...initSession, backendEpoch: 2, type: "result",
        context: contextOf("session-1", 0),
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      assert.equal(channel.staleCount, 1);
      const pending = channel.think(contextOf("session-1", 0), 1000);
      workers[0].emit("message", {
        ...initSession, type: "result", context: contextOf("session-1", 99),
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      const failure = await rejection(pending);
      assert.equal((failure as { code: string }).code, "PROTOCOL_INVALID");
    } finally {
      channel.retire();
      unpatch();
    }
    const again = channelPair();
    try {
      const init = again.channel.init(SELECTED_MODEL_IDENTITY, new ArrayBuffer(16));
      again.workers[0].emit("message", {
        ...initSession,
        backendEpoch: 4,
        type: "ready",
        modelIdentity: SELECTED_MODEL_IDENTITY,
      });
      const failure = await rejection(init);
      assert.equal((failure as { code: string }).code, "PROTOCOL_INVALID");
    } finally {
      again.channel.retire();
      again.unpatch();
    }
  });
});
