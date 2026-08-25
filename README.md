# Hansel Chess AI

From-scratch AlphaZero-style chess net you can play, watch think, and rate. Under 3M parameters.

**Play it in the Grok app.** This repo is the training ground and the spec. Weights start random. You do not play games to teach it.

## Claim

Strongest *from-scratch* tiny AlphaZero you can inspect — not “beats Stockfish.”

| Size | Shape | Params |
|---|---|---|
| tinyaz-s (v1) | 8×64 ResNet | ~0.7M |
| tinyaz-m | 8×128 | ~2.4M |

Play / published search: **64 visits**. 1-visit is the naked net. Never mix those Elo numbers.

## Status

Phase 0: random net + MCTS + browser workbench. Supervised training is next.

## Spec

- Design: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`
- Roadmap we are *not* doing yet: `docs/LATER.md`

## Not this

Not a fork of `hansel-chesslite`. That repo perfected a measuring instrument and never produced a playable model.
