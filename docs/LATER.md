# Explicitly later

Recorded 2026-08-25 so we do not lose the roadmap after Phase 0.

These are **not** skipped forever. They are out of the current ship on purpose.

**Phase 0:** playable random net. Shipped.
**Phase 1 (this ship):** supervised training on Lichess 2013-01. 1-visit beats random-move (20–0–0, material adjudicated). No Elo.
**Phase 2 (next):** 64-visit self-play. Then we publish an Elo.

Everything below waits until Phase 2 exists.

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

## Immediate next after Phase 1 (Phase 2)

1. 64-visit self-play on this box or a GPU box. Overnight. Do not block the playable app.
2. Keep the Lichess-supervised checkpoint as the fallback if a self-play run is void.
3. Still no Stockfish labelling.

---

## After v1 (the climb)

| # | Item | Why it waits |
|---|---|---|
| 1 | **Supervised training (Phase 1)** | **Done.** Lichess 2013-01, 60k positions, 3 epochs. 1-visit vs random 20–0–0. |
| 2 | **Self-play (Phase 2)** | 64-visit self-play on 2 CPU cores is slow. Start it overnight. Do not block play on it. |
| 3 | **tinyaz-m (8×128, ~2.4M)** | Ladder size. Not trained until S is playable and rated. Cap is 3M. |
| 4 | **Gauntlet Elo** | Stockfish `UCI_Elo` 1320 / 1500 / 1800 / 2000, pinned openings, colours swapped. Apt cannot install Stockfish here; drop in a static binary when we have one. |
| 5 | **Efficiency card filled in** | Lichess Elo (humans vs bots separate), gauntlet Elo, params, FLOPs/move = (one eval) × visits, browser ms/move. Still empty of Elo — honest. |
| 6 | **ONNX / in-browser weights file** | **Partial.** `public/weights/tinyaz-s.bin` is the JS/Python packed checkpoint. ONNX later. |
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
