# Human-month climb to 64-visit Elo >1320

Date: 2026-08-28
Status: **approved** (brainstorming 2026-08-27/28)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-27-climb-loop-design.md`

## Claim (unchanged)

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

Published number: **64-visit vs Stockfish 18 `UCI_Elo` 1320**, 100 ms/move, same 8-game opening suite (start, e4e5, Sicilian, Q-pawn), colours swapped.

Success for this spec: **at least one point** (win or draw) at 64 visits. Card Elo then leaves `<1320`.

X is not “beats Stockfish.” Stockfish stays a **ruler**, not a teacher.

## Why the last loops failed

| Loop | Data | Snapshot (1-visit) | SF1320 64-visit |
|---|---|---|---|
| Climb loops 1–6 | 1152 games, 64-visit self-play | 12 draws vs previous | 0–8 |
| Signal 64 | 64 games × 256-visit self-play | 0–8–0 (0.5) VOID | not reached |
| Scale 256 | 256 games × 256-visit self-play, 35134 pos | 0–7–1 (0.4375) VOID | not reached |

256-visit self-play of a net that already loses 0–8 to SF1320 produced weak games. Training on those games moved 1-visit play **down**.

Stockfish 18 `UCI_Elo` 1320 is Skill Level 0. It is calibrated at 120s+1s against CCRL Blitz, not a Lichess 1320 human. We still keep that ruler. We change the train recipe, not the test.

Phase 1 used **60k** positions from Lichess 2013-01. That is too small a human prior for 64 visits to score against limited Stockfish.

## Visits

| Use | Visits |
|---|---|
| Browser, published Elo, SF gauntlet, self-play, snapshot keep/discard | **64** |
| 1-visit vs random | diagnostic only. Must still pass. Not keep/discard. |
| 256 | **off this climb** |

JS `PLAY_VISITS` stays 64. Python `TRAIN_VISITS` for this spec is 64. Do not mix 1-visit and 64-visit numbers on the card.

## Start checkpoint

Train from `public/weights/tinyaz-s-lichess.bin` (Phase 1), **not** the stalled `tinyaz-s.bin` self-play net.

The playable public net stays `tinyaz-s.bin` until this spec promotes.

## Data

Source: [Lichess 2013-01 standard rated](https://database.lichess.org/) `lichess_db_standard_rated_2013-01.pgn.zst`. Same month as Phase 1, full archive, not the 60k slice.

- Split **by game**, not by position. Hash a real game id. Header-less `?` ids are rejected (Phase 1 already caught that trap).
- Skip the first 8 plies. Sample up to 4 positions per game.
- Cap **~1.5M** train positions. Held-out by game for a smoke loss check, not as a published Elo.
- Policy target = the human move. Value target = game result from the side to move (+1 / 0 / −1).
- No Stockfish labels. No chesslite fork.

Missing PGN: exit loud. Do not invent positions.

## Data flow

```
tinyaz-s-lichess.bin
        |
        v
   supervised on ~1.5M Lichess 2013-01 positions (MPS)
        |
        v
   train/checkpoints/tinyaz-s-human.bin
        |
        v
   rate 64-visit vs SF18 UCI_Elo 1320
        |
        +-- score > 0  -->  random-move still pass --> promote public --> STOP (success)
        |
        +-- still 0    -->  64-visit self-play from the human checkpoint
                              |
                              v
                         keep if 64-visit vs frozen human snapshot > 0.5
                         (else VOID that SP loop; human checkpoint stays)
                              |
                              v
                         rate 64-visit vs SF1320 again
                         promote public only if SF score > 0
```

Self-play loops in this spec: at most **three**. If SF1320 is still 0 after supervised + three 64-visit loops, **stop**. Do not generate more 256-visit games. Report that 1.5M human positions + 64-visit SP was not enough.

## Promote rule

Public `tinyaz-s.bin` and both meta jsons change **only** when 64-visit vs SF1320 score > 0.

Side checkpoints always written:

- `train/checkpoints/tinyaz-s-human.bin`
- `train/checkpoints/tinyaz-s-spN.bin` for kept self-play loops

Random-move 1-visit must still pass before any public promote.

VOID of a self-play loop does not delete the human checkpoint.

## Modules (keep the four-unit split)

| Unit | File | This spec |
|---|---|---|
| dataset | `train/scripts/build_lichess.py` (new) | stream PGN → game-split shards |
| train_loop | `train/src/tinyaz/train_loop.py` | MPS, human rows or self-play rows |
| generate | `train/src/tinyaz/generate.py` | **64 visits** |
| rate | `train/src/tinyaz/rate.py` | snapshot at **64 visits**; SF at 64; random at 1 |
| promote | `train/src/tinyaz/promote.py` | public only on SF point |
| climb | `train/scripts/climb.py` | orchestrate human then SP; do not default to 256 |

Files stay under 400 lines. Grok workbench / auth / PWA untouched except meta the card already reads.

## Errors

| Failure | Behaviour |
|---|---|
| PGN / zst missing | Exit. Print the download URL. No fake dataset. |
| Stockfish binary missing | Snapshot and random still run. SF rate skipped. Card stays “not rated”, never a guessed Elo. |
| Snapshot 64-visit score ≤ 0.5 | VOID that self-play loop. Human checkpoint kept. Public untouched. |
| Random-move 1-visit fails | VOID. Public untouched. |
| MPS missing | Train on CPU. Print it. |

## Tests before the overnight run

- Existing: `src/lib/chess/chess.test.ts`, `train/scripts/test_encode.py`, `train/scripts/test_climb_loop.py`.
- Two positions from one game never appear in both train and held-out.
- Sampled policy index is a legal move from that FEN.
- JS `PLAY_VISITS === 64`. Python generate default for this climb is 64.
- VOID still does not change `public/weights/tinyaz-s.bin` bytes.
- `tinyaz-s-lichess.bin` loads and plays a legal 1-visit move (already true).

## First experiment

1. Obtain the 2013-01 archive. Build ~1.5M-position shards.
2. Fine-tune from Phase 1 on MPS. Write `tinyaz-s-human.bin`.
3. Rate 64-visit vs SF1320. Print WDL. **Do not promote** unless score > 0.
4. Only if still 0: one 64-visit self-play loop from the human checkpoint (256 games is enough for a signal; scale after a keep).

Wall-clock on this M4: dataset build is the long pole (PGN parse). Train of 1.5M × a few epochs on MPS should be hours, not days.

## Non-goals

tinyaz-m. ONNX. Lichess BOT. Stockfish-as-teacher. Forking chesslite. Publishing a 256-visit Elo. Changing the SF 100 ms protocol. Claiming CCRL 1320 equals Lichess 1320.

## Never (still)

- Claim we beat Stockfish / Lc0 / DeepMind 270M.
- Mix 1-visit and 64-visit Elo on the card.
- Convert a Lichess human account to BOT.
