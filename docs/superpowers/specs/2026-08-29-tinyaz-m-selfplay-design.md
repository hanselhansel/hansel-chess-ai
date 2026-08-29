# 64-visit self-play of tinyaz-m

Date: 2026-08-29
Status: **approved** (ladder option 1; user: continue)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md`

## Claim (unchanged)

64-visit vs Stockfish 18 `UCI_Elo`, 100 ms. Under 3M. Not 2500 yet. Next rung: **50% vs 1500**.

## Loop

Public net is `tinyaz-m.bin`. Generate at **PLAY_VISITS=64**. Snapshot keep/discard at **64 visits**, score **> 0.5**. 256-visit generate is off.

```
tinyaz-m.bin freeze snapshot
  → generate N games at 64 visits (CPU workers)
  → mix new + replay-before + 2000 human rows
  → train candidate from m
  → 64-visit vs snapshot; VOID if score <= 0.5
  → 1-visit vs random must pass
  → 64-visit vs SF1500 and SF1320
  → public m only if snapshot kept and 1500 score >= published 0.25
  → stop if 1500 >= 0.5, else next loop (max 3)
```

First N = **64** games (signal). `CLIMB_GAMES` can raise to 256 after a keep.

VOID does not touch `public/weights/tinyaz-m.bin` or `tinyaz-s.bin`.

## Card

If promoted: write measured 1320/1500 WDL and 16-game MLE. Never `"1320+"`. Never mix 1-visit into the 64-visit label.

## Non-goals

256-visit generate. SF teacher. tinyaz-s SP. Lichess BOT.
