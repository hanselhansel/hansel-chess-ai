# Explicitly later

Recorded 2026-08-25 so we do not lose the roadmap after Phase 0.

These are **not** skipped forever. They are out of the current ship on purpose.

**Phase 0:** playable random net. Shipped.
**Phase 1:** Lichess 2013-01 supervised. 1-visit vs random 20–0–0. Shipped.
**Phase 2:** 64-visit self-play (**1152 games**, 6 loops) + **64-visit Elo <1320** vs Stockfish 18. Loop 6: 256 games, keep/discard by SF1320 (still 0–8). SF cannot go below 1320.
**Next:** 256-visit generate / 64-visit snapshot of m, 4 epochs. Spec: `docs/superpowers/specs/2026-08-29-tinyaz-m-256-targets-design.md`. 64-visit / 2-epoch SP is exhausted: 64-game loops VOID (0.4375, 0.25, 0.375); scale 256 games, 27308 pos, VOID **1–1–6 (0.1875)**. Public m: **4–4 vs SF1320**, **2–6 vs SF1500**, MLE **1315**. Not 2500. Lichess BOT waits.

**Signal loop (2026-08-27, this Mac, M4 MPS):** 64 games × 256 visits, 8 CPU workers, 8963 positions, train device mps (2 epochs, 43s). 1-visit vs snapshot **0–8–0** (score 0.5). VOID.

**Scale loop (2026-08-27):** 256 games × 256 visits, 8 workers, 35134 positions, MPS 79s. 1-visit vs snapshot **0–7–1** (score 0.4375). VOID. Public weights unchanged (`6c195086…`). More of the same 256-visit / 2-epoch mix does not climb 1-visit play.

1-visit vs random and 64-visit vs Stockfish are different claims. We print both. We never mix them.

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

## Immediate next after the gauntlet

1. Freeze current public weights as a snapshot.
2. Generate self-play at **256 visits** (training targets). Published play stays **64 visits**.
3. Train the candidate on MPS (CPU if MPS is missing).
4. Keep only if 1-visit vs snapshot scores **> 0.5**. Else VOID; public weights untouched.
5. Random-move gauntlet must still pass.
6. Promote even if 64-visit vs SF1320 is still 0–8. Update the card Elo only when SF scores a point.
7. First experiment: 64 games (VOID 0.5). Scale 256 games (VOID 0.4375). 256-visit self-play is off. Human-month spec is next.
8. Lichess BOT only after 64-visit Elo is not `<1320` (irreversible per account).

---

## After v1 (the climb)

| # | Item | Why it waits |
|---|---|---|
| 1 | **Supervised training (Phase 1)** | **Done.** Lichess 2013-01, 60k positions, 3 epochs. 1-visit vs random 20–0–0. |
| 2 | **Self-play (Phase 2)** | **Done (small).** 1152 games at 64 visits across 6 loops. Keep/discard by SF 1320. Still 0–8. More games later. |
| 3 | **tinyaz-m (8×128, ~2.4M)** | Ladder size. Not trained until S is playable and rated. Cap is 3M. |
| 4 | **Gauntlet Elo** | **Done.** 64-visit vs Stockfish 18 `UCI_Elo` 1320/1500/1800/2000, 4 openings × colours swapped, 32 games. Score 0–32. Published: **<1320**. |
| 5 | **Efficiency card filled in** | **Done.** Lichess Elo = BOT later. Gauntlet = 64-visit <1320. Params 640,018. FLOPs/move = 39M × visits. Browser ms/move on the last think. |
| 6 | **ONNX / in-browser weights file** | **Partial.** `public/weights/tinyaz-s.bin` is the JS/Python packed checkpoint. ONNX later. |
| 7 | **Autoresearch-style overnight loop** | Steal Karpathy’s *process* (one mutable train file, fixed wall-clock, keep/discard by a metric). Metric is **gauntlet Elo**, not val_bpb. Needs an NVIDIA GPU. This box does not have one. Do not clone the repo now. |
| 8 | **Lichess BOT account** | Irreversible per account. Only after gauntlet is not random. Fresh account, pin `config.yml` hash, export PGNs, report pools separately. Never convert a human account. |
| 9 | **256-visit published Elo** | Only if we re-rate at 256. The play slider must not leak into the published 64-visit number. |
| 10 | **Stockfish as teacher** | Optional later distillation. Not on the critical path. Labelling at depth 12 is how chesslite stalled. |

---

## Box constraints

Loops 1–6 ran on a Grok cloud box: 2 CPU cores, 4 GB RAM, no GPU, no apt.

This slice runs on a local Apple M4 (24 GB, 10 cores, PyTorch MPS, Homebrew Stockfish 18). Train on MPS. Self-play on CPU workers. Do not run `train/scripts/fetch_stockfish.sh` on this Mac (it fetches ubuntu-x86-64). Symlink `train/bin/stockfish` to the Homebrew binary.

---

## Never

- Claim we beat Stockfish / Lc0 / DeepMind 270M.
- Fork chesslite or Lc0 weights.
- Mutation-gate theatre before a playable game.
- Blend 1-visit and 64-visit numbers.
- Convert a Lichess human account to BOT.
