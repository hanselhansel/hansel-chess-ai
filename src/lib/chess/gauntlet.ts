import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { search } from "./mcts.ts";
import { unpackWeights, type WeightSet } from "./weights.ts";

export type GauntletResult = {
  visits: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  passed: boolean;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function materialWhite(g: Chess): number {
  let s = 0;
  for (const row of g.board()) {
    for (const p of row) {
      if (!p) continue;
      s += (p.color === "w" ? 1 : -1) * (PIECE_VAL[p.type] ?? 0);
    }
  }
  return s;
}

function playGame(weights: WeightSet, netWhite: boolean, visits: number, rng: () => number): number {
  const g = new Chess();
  let plies = 0;
  while (!g.isGameOver() && plies < 240) {
    const netTurn = (g.turn() === "w") === netWhite;
    if (netTurn) {
      const r = search(g.fen(), visits, weights);
      g.move({ from: r.from, to: r.to, promotion: r.promotion });
    } else {
      const ms = g.moves({ verbose: true });
      const m = ms[Math.floor(rng() * ms.length)];
      g.move(m);
    }
    plies += 1;
  }
  if (g.isCheckmate()) {
    const winnerWhite = g.turn() === "b";
    return winnerWhite === netWhite ? 1 : -1;
  }
  const mat = materialWhite(g);
  if (Math.abs(mat) >= 4) {
    const whiteAhead = mat > 0;
    return whiteAhead === netWhite ? 1 : -1;
  }
  return 0;
}

export function playGauntlet(
  weights: WeightSet,
  games = 20,
  visits = 1,
  seed = 2026,
): GauntletResult {
  const rng = mulberry32(seed);
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (let i = 0; i < games; i++) {
    const netWhite = i % 2 === 0;
    const z = playGame(weights, netWhite, visits, rng);
    if (z > 0) wins += 1;
    else if (z < 0) losses += 1;
    else draws += 1;
  }
  const score = (wins + 0.5 * draws) / games;
  return {
    visits,
    games,
    wins,
    draws,
    losses,
    score,
    passed: score >= 0.7 && wins > losses,
  };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../../..");
  const src = resolve(root, process.argv[2] ?? "train/checkpoints/tinyaz-s.bin");
  if (!existsSync(src)) {
    console.error("no checkpoint", src);
    process.exit(2);
  }
  const weights = unpackWeights(readFileSync(src));
  console.log("loaded", weights.source, weights.paramCount, src);
  const result = playGauntlet(weights, 20, 1, 2026);
  console.log(result);
  const metaPath = resolve(root, "public/weights/tinyaz-s.meta.json");
  const trainMetaPath = resolve(root, "train/checkpoints/tinyaz-s.meta.json");
  let trainMeta = {};
  if (existsSync(trainMetaPath)) trainMeta = JSON.parse(readFileSync(trainMetaPath, "utf8"));
  const meta = {
    ...trainMeta,
    vsRandom: {
      visits: result.visits,
      games: result.games,
      wins: result.wins,
      draws: result.draws,
      losses: result.losses,
      score: result.score,
      passed: result.passed,
      adjudication: "mate, else material≥4 after 240 ply",
    },
  };
  mkdirSync(dirname(metaPath), { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  if (!result.passed) {
    console.error("VOID: 1-visit net did not beat random-move. Not publishing.");
    process.exit(2);
  }
  copyFileSync(src, resolve(root, "public/weights/tinyaz-s.bin"));
  writeFileSync(resolve(root, "src/lib/chess/checkpoint-meta.json"), JSON.stringify(meta, null, 2));
  console.log("published public/weights/tinyaz-s.bin");
}

const arg = process.argv[1] ?? "";
if (arg.includes("gauntlet.ts")) {
  void main();
}
