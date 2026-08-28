# More Lichess months from the 1–7 public net

Date: 2026-08-28
Status: **approved** (continue E2E after human-month 1–7)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-28-human-month-1320-design.md`

## Claim (unchanged)

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

Published ruler: **64-visit vs Stockfish 18 `UCI_Elo` 1320**, 100 ms/move, same 8-game suite. Not “beats Stockfish.” Stockfish stays a ruler, not a teacher.

## Why another human pass

2013-01 only produced **426,340** train positions (month was small vs the 1.5M cap). That got us **1–7** (score 0.125) at 64 visits. One noisy point. Not a 1320 rating.

256-visit self-play of a net that still loses to Skill 0 is off. More early Lichess months first.

## Start checkpoint

Train from **current public** `public/weights/tinyaz-s.bin` (the 1–7 net), not Phase 1 `tinyaz-s-lichess.bin`.

## Data

Months: Lichess standard rated **2013-01, 2013-02, 2013-03, 2013-04**.

URL pattern: `https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst`

- Same game-level sha256 split, skip 8 plies, 4 positions/game, policy = human move, value = result STM.
- Cap **1,500,000** train rows across all months. Val cap 50,000.
- No Stockfish labels. No chesslite fork.
- Missing archives: exit loud with the download URL. Do not invent positions.

## Promote rule

Public weights change **only** when:

1. 1-visit vs random still passes, and
2. 64-visit vs SF1320 **score > published 0.125**.

Equal score (another 1–7) is VOID. Public bytes stay. Side checkpoint `train/checkpoints/tinyaz-s-human.bin` is always written.

Card `eloLabel` is the actual WDL, e.g. `2/8 vs 1320`. Never `"1320+"` from a single point. Never mix 1-visit and 64-visit.

## Data flow

```
tinyaz-s.bin (public, 1-7)
        |
        v
   supervised on up to 1.5M positions from 2013-01..04 (MPS)
        |
        v
   train/checkpoints/tinyaz-s-human.bin
        |
        v
   rate 64-visit vs SF18 UCI_Elo 1320
        |
        +-- score > 0.125  -->  random-move pass --> promote public --> STOP
        |
        +-- score <= 0.125 -->  VOID public. One 64-visit self-play loop
                              from the human checkpoint (256 games).
                              Keep if 64-visit vs frozen human snapshot > 0.5.
                              Re-rate SF. Promote only if SF score > 0.125.
                              Then STOP even if still 0.125.
```

Self-play: at most **one** 64-visit loop this spec. 256-visit stays off. tinyaz-m stays later.

## Modules

| Unit | File | This spec |
|---|---|---|
| dataset | `train/scripts/build_lichess.py`, `tinyaz.data` | multi-archive glob → one shard pair |
| train_loop | `tinyaz.train_loop` | load public `tinyaz-s.bin` |
| rate | `tinyaz.rate` | SF at 64; random at 1 |
| promote | `tinyaz.promote` | public only if score beats 0.125 |
| orchestrate | `train/scripts/human_month.py` | public base; skip SF re-run after promote |

Files stay under 400 lines. JS play path untouched except meta the card already reads.

## Errors

| Failure | Behaviour |
|---|---|
| PGN / zst missing | Exit. Print download URLs. No fake dataset. |
| Stockfish missing | Snapshot and random still run. SF skipped. Card stays. |
| Score ≤ 0.125 | VOID public. Human checkpoint kept. |
| Random-move fails | VOID. Public untouched. |
| MPS missing | Train on CPU. Print it. |

## Tests before the overnight run

- Existing split/sample tests still pass.
- Two fake month files concatenate; cap respected.
- `should_promote` is false at 0.125, true above.
- `elo_label` from 1–7 is `1/8 vs 1320`, never `1320+`.
- VOID still does not change `public/weights/tinyaz-s.bin` bytes.
- JS `PLAY_VISITS === 64`.

## Non-goals

tinyaz-m. ONNX. Lichess BOT. Stockfish-as-teacher. Forking chesslite. Publishing a 256-visit Elo. Claiming CCRL 1320 equals Lichess 1320. Changing the 8-game / 100 ms protocol.

## Never (still)

- Claim we beat Stockfish / Lc0 / DeepMind 270M.
- Mix 1-visit and 64-visit Elo on the card.
- Convert a Lichess human account to BOT.
- Commit to main.
