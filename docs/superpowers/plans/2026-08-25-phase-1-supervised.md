# Plan: Phase 1 supervised tinyaz-s

Date: 2026-08-25
Work type: feature
Gates: waived (continue end to end)

## Goal

Train tinyaz-s on Lichess 2013-01 until a **1-visit** net beats a random-move control. Export those weights into the playable workbench. Do not print Elo.

## Check

- Rank-flip and 73-plane policy match Phase 0 tests.
- Packed checkpoint loads in JS; 1-visit move is legal.
- Gauntlet: 1-visit vs random-move, ≥20 games, both colours, win rate ≥ 70% or the run is void.
- Workbench card says Lichess supervised, not random seed.
- Roadmap Phase 1 current. No Stockfish. No 1-visit/64-visit mix.

## Order

1. Python encode / policy / TinyAZ matching JS layouts.
2. Stream Lichess 2013-01, split **by game**.
3. Train on CPU. Export `public/weights/tinyaz-s.bin`.
4. JS unpack + worker/main load. Gauntlet. UI.
