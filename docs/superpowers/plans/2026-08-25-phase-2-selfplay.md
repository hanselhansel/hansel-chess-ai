# Plan: Phase 2 64-visit self-play

Date: 2026-08-25
Gates: waived

## Goal

64-visit self-play on tinyaz-s. Keep Phase 1 if the run is void. No Elo.

## Check

- Python PUCT 1-visit matches JS on the Phase 1 checkpoint (e2e4, value).
- 64 self-play games at 64 visits, Dirichlet root noise.
- Fine-tune mixed with Lichess replay.
- 1-visit vs Phase 1 not collapsed (score ≥ 0.35).
- JS gauntlet 1-visit vs random ≥ 70%.
- Workbench source `selfplay-64`. Card does not print Elo.
