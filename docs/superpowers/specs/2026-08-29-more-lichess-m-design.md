# More Lichess months on public tinyaz-m

Date: 2026-08-29
Status: **approved** (continue after 256-visit SP VOID 0–8)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-29-tinyaz-m-256-targets-design.md`

## Claim (unchanged)

64-visit vs Stockfish 18 `UCI_Elo`, 100 ms. Under 3M. Next rung: **50% vs 1500**.

## Why not more self-play of m

64-visit / 2-epoch SP VOID (best scale 0.1875). 256-visit / 4-epoch VOID **0–8**. Same 256-visit games, 1 epoch + 20k human: **4–4**. Public m SHA `8c5a266c…` unchanged: **4–4 vs 1320**, **2–6 vs 1500**, MLE **1315**.

Human months are what moved the number. SP of this net does not.

## Loop

Public net is `tinyaz-m.bin`. Continue weights (`train_candidate`), do not Kaiming-reset. Add the next Lichess month (first: **2013-06**). Rebuild train jsonl with **300k rows per archive** (six months → 1.8M). Equal quota. No sequential fill.

```
tinyaz-m.bin
  → ensure next month zst (2013-06, then 07, …)
  → rebuild 300k × N months
  → train_candidate from m, 3 epochs, batch 256, MPS
  → 1-visit vs random must pass
  → 64-visit vs SF1320 and SF1500
  → public m only if 1500 score > published 0.25, or 1320 score > 0.5
  → stop if 1500 >= 0.5, else next month (max 3)
```

VOID does not touch `public/weights/tinyaz-m.bin` or `tinyaz-s.bin`.

Missing archive: download `https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst` or exit loud. No fake rows. No Stockfish labels.

## Card

If promoted: write measured 1320/1500 WDL and 16-game MLE. `gauntletElo.visits` = 64. Never `"1320+"`. Never mix 1-visit into the 64-visit label.

## Non-goals

256-visit published Elo. SF teacher. tinyaz-s fine-tune. Lichess BOT. Scaling the VOID 4-epoch SP mix.
