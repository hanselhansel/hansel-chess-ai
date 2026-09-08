# Hansel Chess AI (tinyaz)

From-scratch AlphaZero-style chess you can **play in the browser** and watch think.

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

This is **Phase 2, rated**. Playable net is **tinyaz-m** (8×128, 2.43M params) continued on Lichess 2013-01..2015-02 (7.8M). tinyaz-s stays on disk as the 1370 net.

- **1-visit vs random-move: 19–1–0** (passed; not an Elo)
- **64-visit vs Stockfish 18: 8–0 vs `UCI_Elo` 1320, 8–0 vs 1500, 5–1–2 vs 1800, 4–2–2 vs 2000, 2–1–5 vs 2200, 0–8 vs 2500.** 48-game MLE **2035** (1895–2175). KEEP+GATE vs SF2000 on 8 games. 2500 is 0–8. Not 2500. Eight-game rungs are noisy.
- **Lichess blitz, 64 visits, vs other BOT accounts: 1531** over **108** games (RD 45). BOT **[hanselhansel](https://lichess.org/@/hanselhansel)**. Not a human pool. Not the Stockfish 2035 number.

1-visit, 64-visit Stockfish, and Lichess blitz stay separate.

## UCI

```
train/scripts/hansel-chess-ai
```

Speaks UCI. Default 64 visits, weights `public/weights/tinyaz-m.bin`. Cute Chess and lichess-bot use this wrapper. Setup: [train/lichess-bot/README.md](train/lichess-bot/README.md).

## Play

Open the app. You are White.

1. Click a piece, then a highlighted square.
2. The model thinks in a Web Worker (the board stays live).
3. Toggle **1 visit** (naked net) vs **64 visits** (the number we will publish).
4. Read the tree: SAN, visits `n`, prior `P`, value `Q`.
5. The efficiency card never mixes 1-visit and 64-visit Elo.

Play Black if you want the model to move first.

## What a visit is

One look-ahead trip from the current position: pick a line, evaluate one new leaf with the net, write it back up the tree.

| Mode | Visits | Meaning |
|---|---|---|
| 1-visit | 1 | Naked net. Policy argmax. Snapshot keep/discard. |
| Play / rate | 64 | What you play. What we will publish. |
| Train targets | 256 | Self-play only. Not a published Elo. |

## Architecture (tinyaz-s)

19-plane side-to-move-canonical board → stem 3×3 → 8 residual blocks × 64 channels (~0.64M params) → 73-plane AlphaZero policy + tanh value. PUCT `c_puct = 1.5`. Rank-flip is `i ^ 56` (files stay put).

`chess.js` owns the rules. We do not fork chesslite or Lc0.

## What is later

See [docs/LATER.md](docs/LATER.md) and [the tinyaz-m ladder spec](docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md). Playable net is m. GATE vs SF2000. SF2500 is 0–8. Self-play of the GATE net is later. Not 2500.

## Develop

```
npm test          # includes src/lib/chess/chess.test.ts
npm run typecheck
npm run dev
```
