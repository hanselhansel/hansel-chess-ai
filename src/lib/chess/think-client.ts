import type { ThinkResult } from "./mcts.ts";
import { searchAsync } from "./mcts.ts";
import { loadPlayWeights, randomWeights, type WeightSet } from "./weights.ts";

export type Ready = { paramCount: number; seed: number; source: string };

export type Thinker = {
  ready: Promise<Ready>;
  think: (fen: string, visits: number) => Promise<ThinkResult>;
  terminate: () => void;
};

const INIT_MS = 8000;
const THINK_MS = 90_000;
const SEED = 2026;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function infoOf(w: WeightSet): Ready {
  return { paramCount: w.paramCount, seed: w.seed, source: w.source };
}

function mainThinker(weights: WeightSet): Thinker {
  return {
    ready: Promise.resolve(infoOf(weights)),
    think: (fen, visits) => searchAsync(fen, visits, weights),
    terminate: () => {},
  };
}

function workerThinker(worker: Worker): Thinker {
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (r: ThinkResult) => void; reject: (e: Error) => void }
  >();

  const failAll = (err: Error) => {
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };

  const ready = new Promise<Ready>((resolve, reject) => {
    const onReady = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === "ready") {
        worker.removeEventListener("message", onReady);
        resolve({
          paramCount: msg.paramCount,
          seed: msg.seed,
          source: msg.source ?? "random",
        });
      }
      if (msg?.type === "error" && !msg.id) reject(new Error(String(msg.message)));
    };
    worker.addEventListener("message", onReady);
    worker.addEventListener(
      "error",
      () => reject(new Error("engine worker failed to start")),
      { once: true },
    );
    worker.postMessage({ type: "init", seed: SEED });
  });

  worker.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;
    if (msg?.type === "result") {
      pending.get(msg.id)?.resolve(msg.result);
      pending.delete(msg.id);
    }
    if (msg?.type === "error" && msg.id) {
      pending.get(msg.id)?.reject(new Error(String(msg.message)));
      pending.delete(msg.id);
    }
  });
  worker.addEventListener("error", () => failAll(new Error("engine worker crashed")));

  return {
    ready,
    think: (fen, visits) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ type: "think", fen, visits, id });
      }),
    terminate: () => {
      failAll(new Error("engine stopped"));
      worker.terminate();
    },
  };
}

export function createThinker(): Thinker {
  let terminated = false;
  let impl: Thinker | null = null;
  let worker: Worker | null = null;

  const ready = new Promise<Ready>((resolve) => {
    let settled = false;

    const settleMain = () => {
      if (settled || terminated) return;
      void loadPlayWeights().then((weights) => {
        if (settled || terminated) return;
        settled = true;
        if (worker) {
          worker.terminate();
          worker = null;
        }
        impl = mainThinker(weights);
        resolve(infoOf(weights));
      });
    };

    try {
      const w = new Worker(new URL("../../workers/think.worker.ts", import.meta.url), {
        type: "module",
      });
      worker = w;
      const thinker = workerThinker(w);
      const timer = setTimeout(settleMain, INIT_MS);
      thinker.ready.then(
        (info) => {
          clearTimeout(timer);
          if (settled || terminated) {
            w.terminate();
            return;
          }
          settled = true;
          impl = thinker;
          resolve(info);
        },
        () => {
          clearTimeout(timer);
          settleMain();
        },
      );
    } catch {
      settleMain();
    }
  });

  return {
    ready,
    think: async (fen, visits) => {
      await ready;
      if (terminated || !impl) throw new Error("engine not ready");
      try {
        return await withTimeout(impl.think(fen, visits), THINK_MS, "think timed out");
      } catch (err) {
        if (worker) {
          worker.terminate();
          worker = null;
          const weights = await loadPlayWeights();
          impl = mainThinker(weights);
          return impl.think(fen, visits);
        }
        throw err;
      }
    },
    terminate: () => {
      terminated = true;
      worker?.terminate();
      worker = null;
      impl?.terminate();
    },
  };
}
