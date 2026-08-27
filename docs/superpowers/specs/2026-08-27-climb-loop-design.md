# Climb-loop fix (local PC)

Date: 2026-08-27
Status: **approved**
Repo: `hanselhansel/hansel-chess-ai`
Predecessor spec: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`

## Claim (unchanged)

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

X is not “beats Stockfish.” First job of this slice: get 64-visit Elo off the `<1320` floor.

## Why the old loop stalled

Six 256-game loops at 64 visits scored **0–8** vs Stockfish 18 `UCI_Elo` 1320 every time. 1-visit vs the previous checkpoint was **12 draws**. Keep/discard by “not worse than 0–8” cannot rank two nets below the floor.

## Visits (never mixed on the card)

| Constant | Value | Role |
|---|---|---|
| `PLAY_VISITS` | 64 | Browser default, published Elo, SF gauntlet |
| `TRAIN_VISITS` | 256 | Self-play targets only. Python. JS play must not read this. |
| `SNAPSHOT_VISITS` | 1 | Below-floor keep/discard |

## Modules

Keep three layers. Do not merge them.

```
browser   src/lib/chess + workbench + worker     play at 64
python    train/src/tinyaz                       encode/net/mcts match JS
loop      generate / train_loop / rate / promote / climb orchestrator
```

| Unit | File | Does |
|---|---|---|
| generate | `train/src/tinyaz/generate.py` | Self-play at 256 visits, CPU workers, append jsonl |
| train_loop | `train/src/tinyaz/train_loop.py` | Mix new + replay + lichess, MPS train, write candidate |
| rate | `train/src/tinyaz/rate.py` | 1-visit vs snapshot; 64-visit vs SF1320; random-move gauntlet |
| promote | `train/src/tinyaz/promote.py` | Atomic pack to `public/weights` + both meta jsons |
| climb | `train/scripts/climb.py` | Orchestrator only |

Each file stays under 400 lines.

## Data flow

```
public/weights/tinyaz-s.bin  --freeze-->  train/checkpoints/snapshot.bin
        |
        v
   generate (256 visits, CPU)  -->  train/data/selfplay.jsonl
        |
        v
   train_loop (MPS)  -->  train/checkpoints/candidate.bin
        |
        v
   rate 1-visit vs snapshot
        |
        +-- score <= 0.5  -->  VOID. public weights untouched.
        |
        +-- score >  0.5  -->  random-move gauntlet must pass
                                  |
                                  v
                             promote (atomic)
                                  |
                                  v
                             rate 64-visit vs SF1320
                                  |
                                  +-- point scored  -->  card eloLabel updates
                                  +-- still 0-8     -->  card stays <1320, net still promoted
```

## Errors

- VOID: exit 2, `public/weights` bytes unchanged.
- MPS missing: train on CPU, print it.
- Stockfish missing: snapshot rate still runs; SF rate skipped; card says “not rated”; never a guessed Elo.
- Generate crash: no candidate, no promote.
- Promote: temp file, fsync, rename onto `tinyaz-s.bin` and both meta jsons.

## Tests

- Existing `src/lib/chess/chess.test.ts` and `train/scripts/test_encode.py` stay green.
- Identical nets vs snapshot score **0.5**.
- VOID path does not change `public/weights` bytes.
- JS `PLAY_VISITS === 64`.
- Every generate `pi` index is a legal move from that FEN.

## First experiment

`CLIMB_GAMES=64`. Success: snapshot score is a real number and VOID vs keep behaves. Published Elo stays `<1320` until SF1320 scores a point.

## Non-goals

tinyaz-m. ONNX. Lichess BOT. Autoresearch clone. Stockfish as teacher. Forking chesslite. Rewriting the Grok workbench. Publishing a 256-visit Elo.
