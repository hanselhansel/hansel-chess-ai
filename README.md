# Hansel Chess AI (tinyaz)

From-scratch AlphaZero-style chess you can **play in the browser** and watch think.

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

This is **Phase 2, rated**. tinyaz-s learned from Lichess 2013-01, then 64 games of 64-visit self-play.

- **1-visit vs random-move: 20–0–0** (not an Elo)
- **1-visit vs the Phase 1 net: 12–0–0** (n=12)
- **64-visit gauntlet Elo: <1320** vs Stockfish 18 `UCI_Elo` (0–32 at 1320/1500/1800/2000). Stockfish cannot go below 1320. This is the published number.

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
| 1-visit | 1 | Naked net. Policy argmax. |
| Play / rate | 64 | What you play. What we will publish. |

## Architecture (tinyaz-s)

19-plane side-to-move-canonical board → stem 3×3 → 8 residual blocks × 64 channels (~0.64M params) → 73-plane AlphaZero policy + tanh value. PUCT `c_puct = 1.5`. Rank-flip is `i ^ 56` (files stay put).

`chess.js` owns the rules. We do not fork chesslite or Lc0.

## What is later

See [docs/LATER.md](docs/LATER.md). Next is more 64-visit self-play until the gauntlet number moves. Lichess BOT waits until that is not `<1320`.

## Develop

```
npm test          # includes src/lib/chess/chess.test.ts
npm run typecheck
npm run dev
```
