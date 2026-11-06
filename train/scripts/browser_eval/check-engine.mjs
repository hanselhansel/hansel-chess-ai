// Actual imported client, Worker and retained-M recovery assertions.
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { createPageArm } from "./page-arm.mjs";
import { validateArmReady, validateArmTurn } from "./match-observations.mjs";

export async function checkEngine({ capabilities, resources, runCase }) {
  const { browser, servers } = resources;
  const open = () => browser.openGame({ candidateUrl: servers.candidate.engineUrl, baselineUrl: servers.baseline.engineUrl });
  const step = async (kind, id, body) => {
    let observed;
    await capabilities.operation(kind, `check-${id}`, async () => {
      observed = await body();
      return { status: "completed", evidencePaths: [], detail: { assertion: id } };
    });
    return observed;
  };
  const groups = {};
  const worker = await runCase("verified-real-worker", async () => {
    const game = await open();
    try {
      const arm = createPageArm({ kind: "candidate", id: "check-worker", page: game.candidate.page, context: game.candidate.context, capabilities });
      const ready = validateArmReady(arm, await arm.initialize());
      const board = new Chess();
      const request = { requestId: 1, gameGeneration: 1,
        position: { initialFen: board.fen(), movesUci: [], expectedFen: board.fen() }, requestedVisits: 64 };
      const response = await arm.think(request);
      const move = validateArmTurn(arm, ready, response, request);
      assert.ok(board.move(move.uci));
      return { ready, response };
    } finally {
      await game.close();
    }
  }, true);
  groups["verified-delivery"] = [worker];
  groups["real-worker"] = [worker];
  groups["retained-main-recovery"] = [await runCase("retained-main-recovery", async () => {
    const game = await open();
    const page = game.candidate.page;
    try {
      const ready = await step("readiness", "recovery-init", () => page.evaluate(async () => {
        const { createThinker } = await import("/src/lib/chess/think-client.ts");
        const { thinkRuntime } = await import("/src/lib/chess/think-runtime.ts");
        const slot = { fetches: 0, workerCount: 0, loseNext: true };
        window.__tinyazFunctional = slot;
        const originalFetch = thinkRuntime.fetch;
        const originalWorker = thinkRuntime.createWorker;
        thinkRuntime.fetch = (...args) => { slot.fetches += 1; return originalFetch(...args); };
        thinkRuntime.createWorker = () => {
          slot.workerCount += 1;
          const worker = originalWorker();
          const post = worker.postMessage.bind(worker);
          worker.postMessage = (...args) => {
            if (args[0]?.type === "think" && slot.loseNext) {
              slot.loseNext = false;
              worker.dispatchEvent(new Event("error"));
              worker.terminate();
              return;
            }
            return post(...args);
          };
          return worker;
        };
        slot.thinker = createThinker();
        slot.restore = () => {
          slot.thinker.terminate();
          thinkRuntime.fetch = originalFetch;
          thinkRuntime.createWorker = originalWorker;
        };
        slot.ready = await slot.thinker.ready;
        return slot.ready;
      }));
      assert.equal(ready.initialBackend, "worker");
      const responses = [];
      for (let id = 1; id <= 2; id += 1) {
        if (id === 1) game.candidate.expectWorkerRetirement();
        responses.push(await step("command", `recovery-move-${id}`, () => page.evaluate(async (requestId) => {
          const slot = window.__tinyazFunctional;
          const root = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const started = performance.now();
          let delay = null;
          const timer = new Promise((resolve) => setTimeout(() => { delay = performance.now() - started; resolve(); }, 0));
          const response = await slot.thinker.think({ engineSessionId: slot.ready.engineSessionId,
            gameGeneration: 1, requestId, position: { initialFen: root, movesUci: [], expectedFen: root }, requestedVisits: 64 });
          await timer;
          return { response, eventLoopDelayMs: delay, fetches: slot.fetches, workerCount: slot.workerCount };
        }, id)));
      }
      for (const observation of responses) {
        assert.equal(observation.response.backend, "main");
        assert.equal(observation.response.completedVisits, 64);
        assert.equal(observation.fetches, 1);
        assert.equal(observation.workerCount, 1);
        assert.deepEqual(observation.response.modelIdentity, ready.modelIdentity);
        assert.ok(Number.isFinite(observation.eventLoopDelayMs) && observation.eventLoopDelayMs >= 0);
      }
      assert.equal(responses[0].response.attempts.filter((attempt) => attempt.backend === "worker").length, 1);
      return { ready, responses };
    } finally {
      game.candidate.expectWorkerRetirement();
      await page.evaluate(() => window.__tinyazFunctional?.restore()).catch(() => {});
      await game.close();
    }
  }, true)];
  groups["request-lifecycle"] = [await runCase("request-lifecycle", async () => {
    const game = await open();
    const page = game.candidate.page;
    try {
      const ready = await step("readiness", "lifecycle-init", () => page.evaluate(async () => {
        const { createThinker } = await import("/src/lib/chess/think-client.ts");
        const thinker = createThinker();
        const states = [];
        const unsubscribe = thinker.subscribe((state) => states.push(state));
        const slot = { thinker, states, unsubscribe };
        window.__tinyazFunctional = slot;
        slot.ready = await thinker.ready;
        return slot.ready;
      }));
      const facts = {};
      for (const action of ["cancel", "successor", "invalid", "terminal", "deadline", "stopped"]) {
        if (["cancel", "deadline", "stopped"].includes(action)) game.candidate.expectWorkerRetirement();
        facts[action] = await step("command", `lifecycle-${action}`, () => page.evaluate(async (action) => {
          const slot = window.__tinyazFunctional;
          const { thinker, ready } = slot;
          const root = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const context = { engineSessionId: ready.engineSessionId, gameGeneration: 1, requestId: 1,
            position: { initialFen: root, movesUci: [], expectedFen: root }, requestedVisits: 64 };
          if (action === "cancel") {
            const pending = thinker.think(context).then(() => null, (error) => error.code);
            const cancelled = thinker.cancel(1);
            return { cancelled, code: await pending };
          }
          if (action === "successor") {
            const response = await thinker.think({ ...context, requestId: 2 });
            return { response, retiredCancel: thinker.cancel(1) };
          }
          if (action === "invalid") {
            return thinker.think({ ...context, requestId: 3, position: { ...context.position, expectedFen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" } })
              .then(() => null, (error) => error.code);
          }
          if (action === "terminal") {
            const { createPositionState, pushPositionMove } = await import("/src/lib/chess/position.ts");
            const history = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"];
            const replay = createPositionState(root);
            for (const uci of history) {
              pushPositionMove(replay, { from: uci.slice(0, 2), to: uci.slice(2, 4) });
            }
            return thinker.think({ ...context, requestId: 4,
              position: { initialFen: root, movesUci: history, expectedFen: replay.board.fen() } });
          }
          if (action === "deadline") {
            const { thinkRuntime } = await import("/src/lib/chess/think-runtime.ts");
            const originalNow = thinkRuntime.now;
            try {
              const pending = thinker.think({ ...context, requestId: 5 });
              // Only the application's test-owned clock changes. The
              // supervisor command/phase clocks remain independent.
              thinkRuntime.now = () => originalNow() + 90001;
              return await pending.then(() => null, (error) => error.code);
            } finally {
              thinkRuntime.now = originalNow;
            }
          }
          thinker.terminate();
          return { code: await thinker.think({ ...context, requestId: 6 }).then(() => null, (error) => error.code),
            frozenStates: slot.states.every((state) => Object.isFrozen(state) &&
              (state.activeContext === null || Object.isFrozen(state.activeContext.position.movesUci))),
            stages: slot.states.map((state) => state.stage) };
        }, action));
      }
      assert.equal(facts.cancel.cancelled, true);
      assert.equal(facts.cancel.code, "CANCELLED");
      assert.equal(facts.successor.response.completedVisits, 64);
      assert.equal(facts.successor.retiredCancel, false);
      assert.equal(facts.invalid, "POSITION_INVALID");
      assert.equal(facts.terminal.kind, "terminal");
      assert.equal(facts.terminal.terminal.reason, "threefold-repetition");
      assert.equal(facts.terminal.completedVisits, 0);
      assert.equal(facts.deadline, "DEADLINE");
      assert.equal(facts.stopped.code, "STOPPED");
      assert.equal(facts.stopped.frozenStates, true);
      assert.equal(facts.stopped.stages.at(-1), "stopped");
      return { ready, facts };
    } finally {
      game.candidate.expectWorkerRetirement();
      await page.evaluate(() => {
        window.__tinyazFunctional?.unsubscribe();
        window.__tinyazFunctional?.thinker.terminate();
      }).catch(() => {});
      await game.close();
    }
  }, true)];
  groups["explicit-failure-actions"] = [await runCase("explicit-load-failure-and-demo", async () => {
    const game = await open();
    const page = game.candidate.page;
    try {
      const failed = await step("readiness", "deliberate-load-failure", () => page.evaluate(async () => {
        const { createThinker } = await import("/src/lib/chess/think-client.ts");
        const { thinkRuntime } = await import("/src/lib/chess/think-runtime.ts");
        const original = thinkRuntime.fetch;
        let fetches = 0;
        thinkRuntime.fetch = async () => { fetches += 1; return new Response("missing", { status: 404 }); };
        const thinker = createThinker();
        try {
          return { code: await thinker.ready.then(() => null, (error) => error.code), state: thinker.getState(), fetches };
        } finally {
          thinker.terminate();
          thinkRuntime.fetch = original;
        }
      }));
      assert.equal(failed.code, "LOAD_HTTP");
      assert.equal(failed.state.stage, "failed");
      assert.equal(failed.state.modelIdentity, null);
      assert.equal(failed.fetches, 1);
      const retry = await step("readiness", "explicit-engine-retry", async () => {
        const ready = await page.evaluate(async () => {
          const { createThinker } = await import("/src/lib/chess/think-client.ts");
          const thinker = createThinker();
          window.__tinyazFunctional = { thinker };
          return thinker.ready;
        });
        game.candidate.expectWorkerRetirement();
        await page.evaluate(() => window.__tinyazFunctional.thinker.terminate());
        return ready;
      });
      const demo = await step("readiness", "explicit-random-demo", async () => {
        const ready = await page.evaluate(async () => {
          const { createThinker } = await import("/src/lib/chess/think-client.ts");
          const thinker = createThinker({ mode: "random-demo" });
          window.__tinyazFunctional = { thinker };
          return thinker.ready;
        });
        game.candidate.expectWorkerRetirement();
        await page.evaluate(() => window.__tinyazFunctional.thinker.terminate());
        return ready;
      });
      assert.equal(retry.modelIdentity.mode, "trained");
      assert.equal(retry.modelIdentity.modelName, "tinyaz-m");
      assert.equal(demo.modelIdentity.mode, "random-demo");
      assert.equal(demo.modelIdentity.seed, 2026);
      return { failed, retry, demo };
    } finally {
      await game.close();
    }
  }, true)];
  return groups;
}
