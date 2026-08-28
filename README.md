# Hansel Chess AI (tinyaz)

From-scratch AlphaZero-style chess you can **play in the browser** and watch think.

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

This is **Phase 2, rated**. tinyaz-s is the public 1–7 net fine-tuned on **1.5M positions from Lichess 2013-01..04**. Public weights promoted after the 64-visit score vs Stockfish 18 `UCI_Elo` 1320 moved from 1–7 to 2–6.

- **1-visit vs random-move: 15–5–0** (passed; not an Elo)
- **64-visit gauntlet: 2–6 vs Stockfish 18 `UCI_Elo` 1320.** Not a 1320 rating. Not a Lichess rating.

1-visit and 64-visit stay separate. There is no Lichess rating yet (BOT later).

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

See [docs/LATER.md](docs/LATER.md) and [the more-months spec](docs/superpowers/specs/2026-08-28-more-lichess-months-design.md). Next is more human data or tinyaz-m. Lichess BOT waits until the gauntlet is not a couple of noisy points.

## Develop

```
npm test          # includes src/lib/chess/chess.test.ts
npm run typecheck
npm run dev
```
