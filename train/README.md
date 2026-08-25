# Hansel Chess AI

From-scratch AlphaZero-style chess net you can play, watch think, and rate. Under 3M parameters.

**Play it in the Grok app.** This repo is the training ground and the spec.

## Claim

Strongest *from-scratch* tiny AlphaZero you can inspect — not “beats Stockfish.”

| Size | Shape | Params |
|---|---|---|
| tinyaz-s (v1) | 8×64 ResNet | ~0.64M |
| tinyaz-m | 8×128 | ~2.4M |

Play / published search: **64 visits**. 1-visit is the naked net. Never mix those Elo numbers.

## Status

Phase 2 rated: 384 self-play games. 64-visit Elo **<1320** vs Stockfish 18 (0–8 at 1320 after loop 3). 1-visit vs random **20–0–0**. Different claims.

```
PYTHONPATH=train/src python3 train/scripts/test_encode.py
PYTHONPATH=train/src python3 train/scripts/climb.py
bash train/scripts/fetch_stockfish.sh
PYTHONPATH=train/src python3 train/scripts/elo_gauntlet.py
node --experimental-strip-types src/lib/chess/gauntlet.ts
```

## Spec

- Design: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`
- Roadmap: `docs/LATER.md`

## Not this

Not a fork of `hansel-chesslite`. That repo perfected a measuring instrument and never produced a playable model.
