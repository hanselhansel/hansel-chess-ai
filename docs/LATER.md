# Explicitly later

Recorded 2026-08-25 so we do not lose the roadmap after Phase 0.

These are **not** skipped forever. They are out of v1 on purpose. Phase 0 is a playable random net. Phase 1 is supervised training on Lichess games. Everything below waits until those two exist.

## After v1 (the climb)

1. **Supervised training (Phase 1)** — Lichess PGN, policy = the move played, value = game result. No Stockfish labelling. Must beat a random-move control or the run is void.
2. **Self-play (Phase 2)** — our net vs our net at 64 visits. Overnight on this box is slow (2 CPU cores); do not block play on it.
3. **tinyaz-m** — 8×128, ~2.4M params, under the 3M cap. Ladder, not a replacement for S until S is rated.
4. **Gauntlet Elo** — Stockfish `UCI_Elo` 1320 / 1500 / 1800 / 2000, pinned openings, colours swapped. Static Stockfish binary (apt is unavailable here).
5. **Efficiency card filled in** — Lichess Elo (humans and bots separate), gauntlet Elo, params, FLOPs/move = (one eval) × visits, browser ms/move. 1-visit and N-visit never mixed.
6. **ONNX / in-browser weights file** — same checkpoint, no server inference. v1 may think on this CPU via a worker; the goal is weights that travel with the app.
7. **Autoresearch-style overnight loop** — steal Karpathy’s *process* (one mutable train file, fixed wall-clock, keep/discard by a metric). Metric is **gauntlet Elo**, not val_bpb. Needs an NVIDIA GPU; this Grok box does not have one.
8. **Lichess BOT account** — irreversible per account. Only after gauntlet is not random. Fresh account, pin `config.yml` hash, export PGNs, report pools separately.
9. **256-visit published Elo** — only if we re-rate at 256. The play slider must not leak into the published 64-visit number.
10. **Stockfish as teacher** — optional later distillation. Not on the critical path. Labelling at depth 12 is how chesslite stalled.

## Never

- Claim we beat Stockfish / Lc0 / DeepMind 270M
- Fork chesslite or Lc0 weights
- Mutation-gate theatre before a playable game
- Blend 1-visit and 64-visit numbers
- Convert a Lichess human account to BOT
