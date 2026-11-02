import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CheckpointError, SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import { OPERATION_DEADLINE_MS, SELECTED_CHECKPOINT } from "./constants.ts";
import {
  PositionInvalidError, SearchCancelledError, SearchDeadlineError,
} from "./mcts.ts";
import { coreSearch, coreSearchAsync } from "./mcts-core.ts";
import type { PositionEvaluator } from "./mcts-core.ts";
import { createPositionState } from "./position.ts";
import { createThinker } from "./think-client.ts";
import { Failure, fault, faultOf } from "./think-failure.ts";
import { isErrorCode } from "./think-message-guards.ts";
import { thinkRuntime } from "./think-runtime.ts";
import { loadPlayWeightsTimed } from "./weights.ts";
import {
  clockRuntime, contextOf, delayedClock, expectCode, FakeWorker, fetchOnce,
  makeClock, mCheckpoint, moveOutcome, patchRuntime, readyMsg, rejection,
  sessionOf, tick, until, workerFactory,
} from "./think-test-fixtures.ts";

const emitReady = (w: FakeWorker) =>
  w.emit("message", readyMsg(w.posted[0], SELECTED_MODEL_IDENTITY));

describe("initialization deadline authority", () => {
  it("an in-flight fetch cannot revive init after the deadline", async () => {
    const clock = makeClock();
    const counter = { n: 0 };
    const gate: { release?: (b: ArrayBuffer) => void } = {};
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime({
      ...clockRuntime(clock, workers, counter),
      fetch: (async () => ({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((res) => {
            gate.release = res;
          }),
      })) as never,
    });
    const thinker = createThinker();
    try {
      await tick();
      clock.advance(OPERATION_DEADLINE_MS + 1);
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(thinker.getState().stage, "failed");
      gate.release?.(new ArrayBuffer(16));
      await tick();
      assert.equal(thinker.getState().stage, "failed");
      assert.equal(thinker.getState().error?.code, "DEADLINE");
      assert.equal(workers.length, 0);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a held fetch rejection classifies against the real deadline", async () => {
    const clock = delayedClock();
    const gate: { release?: (e: unknown) => void } = {};
    const unpatch = patchRuntime({
      ...clockRuntime(clock, [], { n: 0 }),
      fetch: (() => new Promise((_res, rej) => { gate.release = rej; })) as never,
    });
    const thinker = createThinker();
    try {
      await tick();
      clock.advance(OPERATION_DEADLINE_MS + 1);
      gate.release?.(new Error("late http error"));
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(thinker.getState().error?.code, "DEADLINE");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("normalizes a loader abort to the deadline category, not LOAD_HTTP", async () => {
    const clock = makeClock();
    const unpatch = patchRuntime({
      ...clockRuntime(clock, [], { n: 0 }),
      fetch: ((_input: unknown, init?: { signal: AbortSignal }) =>
        new Promise((_res, rej) => {
          init?.signal.addEventListener("abort", () =>
            rej(new DOMException("fetch aborted", "AbortError")),
          );
        })) as never,
    });
    const thinker = createThinker();
    try {
      await tick();
      clock.advance(OPERATION_DEADLINE_MS + 1);
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(thinker.getState().error?.code, "DEADLINE");
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a delayed handshake cannot grant time after the deadline", async () => {
    const clock = makeClock();
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, counter));
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      clock.advance(OPERATION_DEADLINE_MS + 1);
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(thinker.getState().stage, "failed");
      emitReady(workers[0]);
      await tick();
      assert.equal(thinker.getState().stage, "failed");
      assert.equal(workers[0].terminated, true);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });
});

describe("delayed timer callbacks", () => {
  it("a held init timer cannot extend a late handshake past the deadline", async () => {
    const clock = delayedClock();
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, counter));
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      clock.advance(OPERATION_DEADLINE_MS + 1);
      emitReady(workers[0]);
      await expectCode(thinker.ready, "DEADLINE");
      assert.equal(thinker.getState().stage, "failed");
      assert.equal(workers.length, 1);
      assert.equal(workers[0].terminated, true);
      assert.equal(thinker.getState().backend, null);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });

  it("a held request timer cannot extend a late reply past the deadline", async () => {
    const clock = delayedClock();
    const counter = { n: 0 };
    const workers: FakeWorker[] = [];
    const unpatch = patchRuntime(clockRuntime(clock, workers, counter));
    const thinker = createThinker();
    try {
      await until(() => workers.length === 1 && workers[0].posted.length === 1);
      emitReady(workers[0]);
      const ready = await thinker.ready;
      const context = contextOf(ready.engineSessionId, 0);
      const pending = thinker.think(context);
      await until(() => workers[0].posted.length === 2);
      clock.advance(OPERATION_DEADLINE_MS + 1);
      workers[0].emit("message", {
        ...sessionOf(workers[0].posted[0]), type: "result", context,
        modelIdentity: SELECTED_MODEL_IDENTITY, outcome: moveOutcome("e2e4", 1),
      });
      await expectCode(pending, "DEADLINE");
      assert.equal(thinker.getState().backend, "worker");
      assert.equal(thinker.getState().backendEpoch, 1);
    } finally {
      thinker.terminate();
      unpatch();
    }
  });
});

describe("loader abort classification", () => {
  it("a pre-aborted entry calls fetch zero times and rethrows the reason", async () => {
    const counter = { n: 0 };
    const unpatch = patchRuntime({ fetch: fetchOnce(counter) });
    try {
      const control = new AbortController();
      control.abort();
      const err = await rejection(
        loadPlayWeightsTimed(SELECTED_CHECKPOINT, control.signal),
      );
      assert.equal(counter.n, 0);
      assert.equal(err, control.signal.reason);
      assert.ok(!(err instanceof CheckpointError));
    } finally {
      unpatch();
    }
  });

  it("a body abort after a late resolve never fulfills a checkpoint", async () => {
    const control = new AbortController();
    const gate: { release?: (b: ArrayBuffer) => void } = {};
    const unpatch = patchRuntime({
      fetch: (async () => ({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((res) => {
            gate.release = res;
          }),
      })) as never,
    });
    try {
      const pending = rejection(
        loadPlayWeightsTimed(SELECTED_CHECKPOINT, control.signal),
      );
      await until(() => gate.release !== undefined);
      control.abort();
      gate.release?.(mCheckpoint());
      const err = await pending;
      assert.equal(err, control.signal.reason);
      assert.ok(!(err instanceof CheckpointError));
    } finally {
      unpatch();
    }
  });

  it("a digest abort after a late resolve never fulfills a checkpoint", async () => {
    const control = new AbortController();
    const realDigest = thinkRuntime.digestSha256;
    const gate: { release?: () => void } = {};
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      digestSha256: (bytes) =>
        new Promise<ArrayBuffer>((res) => {
          const real = realDigest(bytes);
          gate.release = () => {
            assert.ok(real !== null);
            void real.then(res);
          };
        }),
    });
    try {
      const pending = rejection(
        loadPlayWeightsTimed(SELECTED_CHECKPOINT, control.signal),
      );
      await until(() => gate.release !== undefined);
      control.abort();
      gate.release?.();
      const err = await pending;
      assert.equal(err, control.signal.reason);
      assert.ok(!(err instanceof CheckpointError));
    } finally {
      unpatch();
    }
  });

  it("a held digest rejection after abort rethrows the original reason", async () => {
    const control = new AbortController();
    const gate: { release?: (e: unknown) => void } = {};
    const unpatch = patchRuntime({
      fetch: fetchOnce({ n: 0 }),
      digestSha256: () => new Promise<ArrayBuffer>((_res, rej) => { gate.release = rej; }),
    });
    try {
      const pending = rejection(
        loadPlayWeightsTimed(SELECTED_CHECKPOINT, control.signal),
      );
      await until(() => gate.release !== undefined);
      control.abort();
      gate.release?.(new CheckpointError("LOAD_DIGEST", "hash mismatch"));
      assert.equal(await pending, control.signal.reason);
    } finally {
      unpatch();
    }
  });
});

const MATE_FEN =
  "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const noEval: PositionEvaluator = () => {
  throw new Error("a terminal position must never reach the evaluator");
};

describe("terminal final control", () => {
  it("a clock advance during terminal diagnosis rejects with DEADLINE", () => {
    let calls = 0;
    const now = () => {
      calls += 1;
      return calls <= 2 ? 0 : OPERATION_DEADLINE_MS + 1;
    };
    const control = {
      signal: new AbortController().signal,
      deadlineMs: OPERATION_DEADLINE_MS,
      now,
    };
    assert.throws(
      () => coreSearch(createPositionState(MATE_FEN), 4, noEval, control),
      SearchDeadlineError,
    );
  });

  it("an abort during terminal diagnosis rejects with CANCELLED", async () => {
    let calls = 0;
    const ac = new AbortController();
    const now = () => {
      calls += 1;
      if (calls === 2) ac.abort();
      return 0;
    };
    const control = { signal: ac.signal, deadlineMs: Infinity, now };
    assert.throws(
      () => coreSearch(createPositionState(MATE_FEN), 4, noEval, control),
      SearchCancelledError,
    );
    const ac2 = new AbortController();
    let calls2 = 0;
    const err = await rejection(
      coreSearchAsync(createPositionState(MATE_FEN), 4, noEval, {
        signal: ac2.signal, deadlineMs: Infinity,
        now: () => {
          calls2 += 1;
          if (calls2 === 2) ac2.abort();
          return 0;
        },
      }),
    );
    assert.ok(err instanceof SearchCancelledError);
  });

  it("a passing control still returns the honest terminal outcome", async () => {
    const control = {
      signal: new AbortController().signal, deadlineMs: Infinity, now: () => 0,
    };
    const syncOut = coreSearch(createPositionState(MATE_FEN), 4, noEval, control);
    assert.equal(syncOut.kind, "terminal");
    assert.equal(syncOut.completedVisits, 0);
    const asyncOut = await coreSearchAsync(
      createPositionState(MATE_FEN), 4, noEval, control,
    );
    assert.equal(asyncOut.kind, "terminal");
    assert.equal(asyncOut.completedVisits, 0);
  });
});

describe("fault normalization bounds", () => {
  it("an unknown code normalizes to SEARCH_FAILED with the cause kept", () => {
    const f = faultOf({
      code: "NOT_A_CODE", diagnostic: "mystery",
      searchMs: 5, completedVisits: 3, cause: "root",
    });
    assert.equal(f.code, "SEARCH_FAILED");
    assert.equal(f.cause, "root");
    assert.ok(Object.isFrozen(f));
    assert.ok(isErrorCode("DEADLINE"));
    assert.ok(!isErrorCode("NOT_A_CODE"));
    assert.ok(!isErrorCode(42));
  });

  it("diagnostics are bounded to 2048 characters at every entry point", () => {
    const long = "x".repeat(3000);
    assert.equal(
      faultOf({ code: "SEARCH_FAILED", diagnostic: long }).diagnostic.length,
      2048,
    );
    assert.equal(fault("SEARCH_FAILED", long).diagnostic.length, 2048);
    const e = new Failure("SEARCH_FAILED", long, null, []);
    assert.equal(e.diagnostic.length, 2048);
    assert.equal(e.message.length, 2048);
  });

  it("partial metrics are finite nonnegative or null", () => {
    for (const bad of [NaN, Infinity, -1]) {
      const f = faultOf({
        code: "SEARCH_FAILED", diagnostic: "x",
        searchMs: bad, completedVisits: bad,
      });
      assert.equal(f.searchMs, null);
      assert.equal(f.completedVisits, null);
    }
    for (const bad of [1.5, 4097, "12"]) {
      const f = faultOf({
        code: "SEARCH_FAILED", diagnostic: "x", completedVisits: bad,
      });
      assert.equal(f.completedVisits, null);
    }
    const ok = faultOf({
      code: "SEARCH_FAILED", diagnostic: "x",
      searchMs: 12.5, completedVisits: 4096,
    });
    assert.equal(ok.searchMs, 12.5);
    assert.equal(ok.completedVisits, 4096);
  });

  it("typed errors map to their canonical code with cause preserved", () => {
    assert.equal(faultOf(new SearchCancelledError()).code, "CANCELLED");
    assert.equal(faultOf(new SearchDeadlineError()).code, "DEADLINE");
    assert.equal(faultOf(new PositionInvalidError("x")).code, "POSITION_INVALID");
    const raw = new Error("plain");
    const f = faultOf(raw);
    assert.equal(f.code, "SEARCH_FAILED");
    assert.equal(f.cause, raw);
  });
});
