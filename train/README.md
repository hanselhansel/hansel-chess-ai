# Hansel Chess AI

From-scratch AlphaZero-style chess net you can play, watch think, and rate. Under 3M parameters.

**Play it in the Grok app.** This repo is the training ground and the spec.

## Claim

Strongest *from-scratch* tiny AlphaZero you can inspect — not “beats Stockfish.”

| Size | Shape | Params |
|---|---|---|
| tinyaz-s (v1) | 8×64 ResNet | ~0.64M |
| tinyaz-m | 8×128 | ~2.4M |

Play / published search: **64 visits**. Self-play targets: **256 visits**. 1-visit is the naked net and the snapshot gate. Never mix those Elo numbers.

## Status

Phase 2 rated: **tinyaz-m** playable. 8×128, 2.43M. 64-visit **6–2 vs SF1320**, **7–1 vs SF1500**, **3–1–4 vs SF1800**, 24-game MLE **1715**. 1-visit vs random **18–2–0**. s (1370) kept on disk.

```
PYTHONPATH=train/src python3 train/scripts/test_encode.py
PYTHONPATH=train/src python3 train/scripts/test_climb_loop.py
CLIMB_GAMES=64 PYTHONPATH=train/src python3 train/scripts/climb_m.py
ln -sf "$(which stockfish)" train/bin/stockfish
PYTHONPATH=train/src python3 train/scripts/elo_gauntlet.py
node --experimental-strip-types src/lib/chess/gauntlet.ts
```

`fetch_stockfish.sh` is ubuntu-x86-64. On this Mac, symlink Homebrew Stockfish 18 instead.

## Spec

- Design: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`
- Climb loop: `docs/superpowers/specs/2026-08-27-climb-loop-design.md`
- Roadmap: `docs/LATER.md`

## Not this

Not a fork of `hansel-chesslite`. That repo perfected a measuring instrument and never produced a playable model.
