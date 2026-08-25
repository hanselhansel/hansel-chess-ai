import type { ThinkResult } from "./mcts.ts";

type Ready = { paramCount: number; seed: number };

export function createThinker(): {
  ready: Promise<Ready>;
  think: (fen: string, visits: number) => Promise<ThinkResult>;
  terminate: () => void;
} {
  const worker = new Worker(new URL("../../workers/think.worker.ts", import.meta.url), {
    type: "module",
  });
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (r: ThinkResult) => void; reject: (e: Error) => void }
  >();

  const ready = new Promise<Ready>((resolve, reject) => {
    const onReady = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        worker.removeEventListener("message", onReady);
        resolve({ paramCount: msg.paramCount, seed: msg.seed });
      }
      if (msg.type === "error" && !msg.id) reject(new Error(msg.message));
    };
    worker.addEventListener("message", onReady);
    worker.postMessage({ type: "init", seed: 2026 });
  });

  worker.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "result") {
      pending.get(msg.id)?.resolve(msg.result);
      pending.delete(msg.id);
    }
    if (msg.type === "error" && msg.id) {
      pending.get(msg.id)?.reject(new Error(msg.message));
      pending.delete(msg.id);
    }
  });

  return {
    ready,
    think: (fen, visits) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ type: "think", fen, visits, id });
      }),
    terminate: () => worker.terminate(),
  };
}
