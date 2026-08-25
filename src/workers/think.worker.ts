import { search } from "../lib/chess/mcts.ts";
import { randomWeights, type WeightSet } from "../lib/chess/weights.ts";

let weights: WeightSet | null = null;

self.onmessage = (e: MessageEvent) => {
  const msg = e.data as
    | { type: "init"; seed: number }
    | { type: "think"; fen: string; visits: number; id: number };
  if (msg.type === "init") {
    weights = randomWeights(msg.seed);
    self.postMessage({
      type: "ready",
      paramCount: weights.paramCount,
      seed: weights.seed,
    });
    return;
  }
  if (msg.type === "think") {
    if (!weights) weights = randomWeights(1);
    try {
      const result = search(msg.fen, msg.visits, weights);
      self.postMessage({ type: "result", id: msg.id, result });
    } catch (err) {
      self.postMessage({
        type: "error",
        id: msg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
