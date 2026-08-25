# Explicitly later

Recorded 2026-08-25 so we do not lose the roadmap after Phase 0.

These are **not** skipped forever. They are out of the current ship on purpose.

**Phase 0 (this chain):** a playable random net. You click pieces. It thinks. You see the tree.
**Phase 1 (next chain, after Phase 0 works):** supervised training on Lichess games.
Everything below waits until those two exist.

---

## Glossary we will not re-litigate

A **visit** is one look-ahead trip from the current position: pick a line, evaluate one new leaf with the net, write the result back up the tree.

| Mode | Visits | Meaning |
|---|---|---|
| 1-visit | 1 | Naked net. Policy argmax. The searchless number. |
| Play / rate | 64 | What you play. What we publish. |
| Think harder | 256 | Slider only. Not a published Elo unless we re-rate at 256. |

1-visit and 64-visit are **different claims**. Wall-clock rankings and node-count rankings invert (Rapfi). We never print them as one number.

---

## Immediate next after Phase 0 (Phase 1)

1. Download one Lichess monthly dump (start with a small archive, e.g. 2013-01).
2. Split **by game**, not by position.
3. Encode STM-canonical 19-plane boards (rank-flip `sq ^ 56` when Black to move — files stay put so kingside stays kingside).
4. Policy target = the move that was played (73-plane AZ encoding). Value target = game result from the side to move.
5. Train tinyaz-s on this CPU until it **beats a random-move control**. If it cannot, the run is void — do not call it trained.
6. Export weights the browser worker can load. Same architecture, no second dummy bot.

No Stockfish labelling. You do not play training games.

---

## After v1 (the climb)

| # | Item | Why it waits |
|---|---|---|
| 1 | **Supervised training (Phase 1)** | Needs a playable loop first so we can see the trained net, not only a loss curve. |
| 2 | **Self-play (Phase 2)** | 64-visit self-play on 2 CPU cores is slow. Start it overnight after Phase 1 beats random. Do not block play on it. |
| 3 | **tinyaz-m (8×128, ~2.4M)** | Ladder size. Not trained until S is playable and rated. Cap is 3M. |
| 4 | **Gauntlet Elo** | Stockfish `UCI_Elo` 1320 / 1500 / 1800 / 2000, pinned openings, colours swapped. Apt cannot install Stockfish here; drop in a static binary when we have one. |
| 5 | **Efficiency card filled in** | Lichess Elo (humans vs bots separate), gauntlet Elo, params, FLOPs/move = (one eval) × visits, browser ms/move. Empty cells in Phase 0 are honest. |
| 6 | **ONNX / in-browser weights file** | Goal: same checkpoint, no server. Phase 0 thinks in a worker with JS weights. Export after a real checkpoint exists. |
| 7 | **Autoresearch-style overnight loop** | Steal Karpathy’s *process* (one mutable train file, fixed wall-clock, keep/discard by a metric). Metric is **gauntlet Elo**, not val_bpb. Needs an NVIDIA GPU. This box does not have one. Do not clone the repo now. |
| 8 | **Lichess BOT account** | Irreversible per account. Only after gauntlet is not random. Fresh account, pin `config.yml` hash, export PGNs, report pools separately. Never convert a human account. |
| 9 | **256-visit published Elo** | Only if we re-rate at 256. The play slider must not leak into the published 64-visit number. |
| 10 | **Stockfish as teacher** | Optional later distillation. Not on the critical path. Labelling at depth 12 is how chesslite stalled. |

---

## Box constraints (this Grok cloud machine)

- 2 CPU cores, 4 GB RAM, no GPU.
- `apt` / `yum` do not work. No Stockfish from packages.
- Python training for Phase 1 must fit here or wait for a GPU box.
- The playable app is this Grok preview (TanStack Start). The GitHub repo `hanselhansel/hansel-chess-ai` is the spec + Python training ground.

---

## Never

- Claim we beat Stockfish / Lc0 / DeepMind 270M.
- Fork chesslite or Lc0 weights.
- Mutation-gate theatre before a playable game.
- Blend 1-visit and 64-visit numbers.
- Convert a Lichess human account to BOT.
