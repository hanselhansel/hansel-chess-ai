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

Phase 2: 64-visit self-play (64 games) on top of Lichess 2013-01. 1-visit vs random-move **20–0–0**. 1-visit vs Phase 1 **12–0–0** (n=12). No published Elo.

```
PYTHONPATH=train/src python3 train/scripts/test_encode.py
PYTHONPATH=train/src python3 train/scripts/phase1.py
node --experimental-strip-types src/lib/chess/gauntlet.ts
```

## Spec

- Design: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`
- Roadmap: `docs/LATER.md`

## Not this

Not a fork of `hansel-chesslite`. That repo perfected a measuring instrument and never produced a playable model.
