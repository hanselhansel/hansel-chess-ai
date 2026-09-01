# Hansel Chess AI (tinyaz)

From-scratch AlphaZero-style chess you can **play in the browser** and watch think.

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

This is **Phase 2, rated**. Playable net is **tinyaz-m** (8×128, 2.43M params) continued on Lichess 2013-01..2014-04 (4.8M). tinyaz-s stays on disk as the 1370 net.

- **1-visit vs random-move: 20–0–0** (passed; not an Elo)
- **64-visit vs Stockfish 18: 8–0 vs `UCI_Elo` 1320, 7–1–0 vs 1500, 4–1–3 vs 1800.** 24-game MLE **1895** (1705–2115). GATE: 50% vs SF1800. Not 2500. Not a Lichess rating. Eight-game rungs are noisy.

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

See [docs/LATER.md](docs/LATER.md) and [the tinyaz-m ladder spec](docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md). Playable net is m. Next is 2014-05 human month toward 50% vs SF2000. Not 2500 yet.

## Develop

```
npm test          # includes src/lib/chess/chess.test.ts
npm run typecheck
npm run dev
```
