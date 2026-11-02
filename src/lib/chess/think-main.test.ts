import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPERATION_DEADLINE_MS } from "./constants.ts";
import { createThinker } from "./think-client.ts";
import type { searchAsync } from "./mcts.ts";
import { mainCapabilities } from "./think-main.ts";
import type { SearchOutcome } from "./search-types.ts";
import type { Thinker } from "./think-protocol.ts";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import type { WeightSet } from "./weights.ts";
import {
  clockRuntime, contextOf, expectCode, FakeWorker, fetchOnce,
  makeClock, moveOutcome, patchRuntime, pause, readyMsg, tick, until,
  workerFactory,
} from "./think-test-fixtures.ts";

type HeldCall = {
  aborted: boolean;
  deadlineMs?: number;
  release(o: SearchOutcome): void;
};

/** Holds each dispatched search until released; tracks peak concurrency. */
function heldSearch() {
  const calls: HeldCall[] = [];
  let live = 0;
  let maxLive = 0;
  const search: typeof searchAsync = (_position, _visits, _weights, control) => {
    const call = { aborted: false, deadlineMs: control?.deadlineMs } as HeldCall;
    const promise = new Promise<SearchOutcome>((res) => {
      call.release = (outcome) => {
        live -= 1;
        res(outcome);
      };
      control?.signal.addEventListener(
        "abort",
        () => {
          call.aborted = true;
        },
        { once: true },
      );
    });
    void promise;
    live += 1;
    maxLive = Math.max(maxLive, live);
    calls.push(call);
    return promise;
  };
  return { calls, search, maxLive: () => maxLive };
}

const mutableCaps = mainCapabilities as {
  search: typeof searchAsync;
  decode(bytes: ArrayBuffer): WeightSet;
};

const emitReady = (w: FakeWorker) =>
  w.emit("message", readyMsg(w.posted[0], SELECTED_MODEL_IDENTITY));

/** Drive initialization to a worker transport loss so the main backend owns the epoch. */
async function toMainBackend(): Promise<{
  thinker: Thinker;
  unpatch: () => void;
  engineSessionId: string;
}> {
  const workers: FakeWorker[] = [];
  const unpatch = patchRuntime({
    fetch: fetchOnce({ n: 0 }),
    createWorker: workerFactory(workers),
  });
  const thinker = createThinker();
  await until(() => workers.length === 1 && workers[0].posted.length === 1);
  workers[0].emit("error", new Error("worker died at init"));
  const ready = await thinker.ready;
  assert.equal(ready.initialBackend, "main");
  return { thinker, unpatch, engineSessionId: ready.engineSessionId };
}

describe("main backend continuity", () => {
  it("a cancelled main request frees the serial tail for its successor", async () => {
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      fetch: fetchOnce(counter),
      createWorker: workerFactory(workers),
    });
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      workers[0].emit("error", new Error("worker died at init"));
      const ready = await thinker.ready;
      assert.equal(ready.initialBackend, "main");
      const first = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(first);
      assert.equal(thinker.cancel(first.requestId), true);
      await expectCode(pending, "CANCELLED");
      const second = contextOf(ready.engineSessionId, 1);
      const next = thinker.think(second);
      const response = await next;
      assert.equal(response.backend, "main");
      assert.equal(response.backendEpoch, 2);
      assert.equal(response.kind, "move");
      assert.equal(counter.n, 1);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });
});

describe("dispatched main request control", () => {
  it("an expired successor never invokes search after held cleanup", async () => {
    const clock = makeClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      workers[0].emit("error", new Error("worker died at init"));
      const ready = await thinker.ready;
      assert.equal(ready.initialBackend, "main");
      const held = heldSearch();
      const saved = mutableCaps.search;
      mutableCaps.search = held.search;
      try {
        const first = contextOf(ready.engineSessionId, 0);
        const pendingFirst = thinker.think(first);
        await until(() => held.calls.length === 1);
        assert.equal(thinker.cancel(first.requestId), true);
        await expectCode(pendingFirst, "CANCELLED");
        assert.equal(held.calls[0].aborted, true);

        const second = contextOf(ready.engineSessionId, 1);
        const pendingSecond = thinker.think(second);
        await tick();
        assert.equal(held.calls.length, 1);
        clock.advance(OPERATION_DEADLINE_MS + 1);
        await expectCode(pendingSecond, "DEADLINE");
        held.calls[0].release(moveOutcome("e2e4", 1));
        await pause(25);
        assert.equal(held.calls.length, 1);
        assert.equal(held.maxLive(), 1);
      } finally {
        mutableCaps.search = saved;
      }
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("cancellation reaches only the captured handle; the successor runs serially", async () => {
    const { thinker, unpatch, engineSessionId } = await toMainBackend();
    const held = heldSearch();
    const saved = mutableCaps.search;
    mutableCaps.search = held.search;
    try {
      const first = contextOf(engineSessionId, 0);
      const pendingFirst = thinker.think(first);
      await until(() => held.calls.length === 1);
      assert.equal(thinker.cancel(first.requestId), true);
      await expectCode(pendingFirst, "CANCELLED");
      assert.equal(held.calls[0].aborted, true);

      const second = contextOf(engineSessionId, 1);
      const pendingSecond = thinker.think(second);
      await tick();
      assert.equal(held.calls.length, 1);
      held.calls[0].release(moveOutcome("e2e4", 1));
      await until(() => held.calls.length === 2);
      assert.equal(held.calls[1].aborted, false);
      assert.equal(held.maxLive(), 1);
      held.calls[1].release(moveOutcome("e2e4", 1));
      const response = await pendingSecond;
      assert.equal(response.backend, "main");
      assert.equal(response.kind, "move");
    } finally {
      mutableCaps.search = saved;
      thinker.terminate();
      unpatch();
    }
  });

  it("a successor's dispatched control keeps its entry-anchored deadline", async () => {
    const clock = makeClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const thinker = createThinker();
    const held = heldSearch();
    const saved = mutableCaps.search;
    mutableCaps.search = held.search;
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      workers[0].emit("error", new Error("worker died at init"));
      const ready = await thinker.ready;
      assert.equal(ready.initialBackend, "main");
      const first = contextOf(ready.engineSessionId, 0);
      const pendingFirst = thinker.think(first);
      await until(() => held.calls.length === 1);
      assert.equal(thinker.cancel(first.requestId), true);
      await expectCode(pendingFirst, "CANCELLED");
      const second = contextOf(ready.engineSessionId, 1);
      const submittedAt = clock.now();
      const pendingSecond = thinker.think(second);
      await tick();
      clock.advance(1000);
      held.calls[0].release(moveOutcome("e2e4", 1));
      await until(() => held.calls.length === 2);
      assert.equal(held.calls[1].deadlineMs, submittedAt + OPERATION_DEADLINE_MS);
      assert.equal(held.maxLive(), 1);
      held.calls[1].release(moveOutcome("e2e4", 1));
      const response = await pendingSecond;
      assert.equal(response.kind, "move");
      assert.equal(response.backend, "main");
    } finally {
      mutableCaps.search = saved;
      thinker.terminate();
      unpatch();
    }
  });

  it("termination aborts an actually dispatched main request", async () => {
    const { thinker, unpatch, engineSessionId } = await toMainBackend();
    const held = heldSearch();
    const saved = mutableCaps.search;
    mutableCaps.search = held.search;
    try {
      const pending = thinker.think(contextOf(engineSessionId, 0));
      await until(() => held.calls.length === 1);
      thinker.terminate();
      await expectCode(pending, "STOPPED");
      assert.equal(thinker.getState().stage, "stopped");
      assert.equal(held.calls[0].aborted, true);
      held.calls[0].release(moveOutcome("e2e4", 1));
      await tick();
    } finally {
      mutableCaps.search = saved;
      unpatch();
    }
  });
});

describe("recovery decode authority", () => {
  it("a cancel during the recovering publication never decodes a main backend", async () => {
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
      const ready = await thinker.ready;
      let fired = false;
      thinker.subscribe((s) => {
        if (!fired && s.stage === "recovering") {
          fired = true;
          thinker.cancel(0);
        }
      });
      const pending = thinker.think(contextOf(ready.engineSessionId, 0));
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("error", new Error("worker died"));
      await expectCode(pending, "CANCELLED");
      assert.equal(decodeCalls, 0);
      assert.equal(thinker.getState().backend, null);
    } finally {
      mutableCaps.decode = saved;
      thinker.terminate();
      unpatch();
    }
  });

  it("a recovery decode that crosses the deadline never assigns the backend", async () => {
    const clock = makeClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const thinker = createThinker();
    const saved = mutableCaps.decode;
    mutableCaps.decode = (b) => {
      clock.advance(OPERATION_DEADLINE_MS + 1);
      return saved(b);
    };
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const pending = thinker.think(contextOf(ready.engineSessionId, 0));
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("error", new Error("worker died"));
      const failure = await expectCode(pending, "DEADLINE");
      assert.equal(thinker.getState().backend, null);
      assert.ok(!failure.attempts.some((a) => a.backend === "main"));
    } finally {
      mutableCaps.decode = saved;
      thinker.terminate();
      unpatch();
    }
  });

  it("recovery decode time lands in that request's main attempt setup", async () => {
    const clock = makeClock();
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, { n: 0 }));
    const thinker = createThinker();
    const saved = mutableCaps.decode;
    mutableCaps.decode = (b) => {
      clock.advance(5);
      return saved(b);
    };
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const pending = thinker.think(contextOf(ready.engineSessionId, 0));
      await until(() => workers[0].posted.length === 2);
      workers[0].emit("error", new Error("worker died"));
      const response = await pending;
      const recovered = response.attempts.at(-1)!;
      assert.equal(recovered.backend, "main");
      assert.equal(recovered.disposition, "complete");
      assert.equal(recovered.setupMs, 5);
      const next = await thinker.think(contextOf(ready.engineSessionId, 1));
      assert.equal(next.attempts.at(-1)!.setupMs, 0);
    } finally {
      mutableCaps.decode = saved;
      thinker.terminate();
      unpatch();
    }
  });
});
