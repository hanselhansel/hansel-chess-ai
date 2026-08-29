# 256-visit targets, 64-visit snapshot of tinyaz-m

Date: 2026-08-29
Status: **approved** (user: continue after 64-visit / 2-epoch VOID)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-29-tinyaz-m-selfplay-design.md`

## Claim (unchanged)

64-visit vs Stockfish 18 `UCI_Elo`, 100 ms. Under 3M. Not 2500 yet. Next rung: **50% vs 1500**.

Published Elo is **always 64-visit**. Generate visits are training targets only.

## Why this recipe

64-visit / 2-epoch self-play of public m is exhausted. Signal 64-game loops VOID (0.4375, 0.25, 0.375). Scale 256 games, 27308 pos, fresh replay, VOID **1–1–6 (0.1875)**. Public m unchanged: **4–4 vs 1320**, **2–6 vs 1500**, MLE **1315**.

The unused lever is search quality of the *targets*, not more of the same 64-visit games. AlphaZero labelled with 800 visits and played at fewer. We label at **256**, keep/discard and publish at **64**.

## Loop

Public net is `tinyaz-m.bin`. Generate at **TRAIN_VISITS=256** (`CLIMB_VISITS` override). Snapshot keep/discard at **PLAY_VISITS=64**, score **> 0.5**. Epochs default **4** (`CLIMB_EPOCHS`). Replay file is `train/data/selfplay-m-256.jsonl` so 64-visit VOID games never mix in.

```
tinyaz-m.bin freeze snapshot
  → generate N games at 256 visits (CPU workers)
  → mix new + replay-before + 2000 human rows
  → train candidate from m (4 epochs, batch 64)
  → 64-visit vs snapshot; VOID if score <= 0.5
  → 1-visit vs random must pass
  → 64-visit vs SF1500 and SF1320
  → public m only if snapshot kept and 1500 score >= published 0.25
  → stop if 1500 >= 0.5, else next loop (max 3)
```

First N = **64** games (signal). `CLIMB_GAMES` can raise to 256 after a keep.

VOID does not touch `public/weights/tinyaz-m.bin` or `tinyaz-s.bin`.

## Card

If promoted:

- `gauntletElo.visits` = 64
- `playVisits` = 64
- `selfplayVisits` = 256 (how targets were generated, not a published Elo)

Never write a 256-visit WDL as the 64-visit label. Never `"1320+"`. Never mix 1-visit into the 64-visit number.

## Errors

| Failure | Behaviour |
|---|---|
| snapshot score ≤ 0.5 | VOID. Public bytes unchanged. |
| random-move fail | VOID. |
| SF1500 < published 0.25 | VOID public. Side checkpoint kept. |
| jsonl / Stockfish missing | Exit / skip SF. No fake rows. |

## Non-goals

256-visit published Elo. SF teacher. tinyaz-s SP. Lichess BOT. Mixing `selfplay-m.jsonl` (64-visit VOID) into this replay.

## Never

- Publish 256-visit Elo as 64-visit.
- Fork chesslite / Lc0.
- Commit to main.
- Convert a Lichess human account to BOT.
