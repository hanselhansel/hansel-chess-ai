# Climb until published 64-visit Elo > 1320

Date: 2026-08-29
Status: **approved** (loop mechanism: Python `while`; user chose option 1)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-28-more-lichess-months-design.md`

## Claim (unchanged)

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

Ruler: **64-visit vs Stockfish 18 `UCI_LimitStrength`**, 100 ms/move, same 8-game suite. Stockfish is a ruler, not a teacher.

## Why 2–6 is not >1320

Published now: **2–6 vs `UCI_Elo` 1320** (score 0.25), card `2/8 vs 1320`. Expected score 0.25 against a 1320 opponent is about 1100. `estimatedElo` stays `null` until the 32-game MLE is allowed to print a number.

8 games are noisy. The loop must not stop on “one extra win.”

## Stop gate (published >1320)

Either of:

1. **64-visit scores a point vs `UCI_Elo` 1500** (same 8-game suite), or
2. **8-game vs 1320 score ≥ 0.625 (5/8)** and the **32-game gauntlet MLE `estimatedElo` > 1320**.

Then the card uses the MLE label (a number), never `"1320+"` from 8 games. 1-visit vs random still must pass.

Until that gate: card stays `{wins}/{games} vs 1320`.

## Loop

Python `while` in `train/scripts/climb_until.py`. Not a Grok workflow. One night per month.

```
public tinyaz-s
  → add next Lichess month (2013-05, then 06, …)
  → rebuild 1.5M train rows with equal quota per month
  → train from public, 3 epochs MPS
  → 64-visit vs SF1320 (8 games)
  → promote only if score > published 1320 score
  → if 1320 score ≥ 0.5: also 8 games vs 1500
  → if 1320 score ≥ 0.625 or 1500 score > 0: run 32-game gauntlet, maybe STOP
  → if 3 consecutive VOID: STOP, next is tinyaz-m
  → else next month
```

`CLIMB_MAX_LOOPS` default **6**. `HUMAN_SP_LOOPS` default **0** until 1320 score ≥ 0.5.

## Data: equal quota, not sequential fill

The 1.5M cap already filled during 2013-04 if archives are parsed in order. Later months never enter.

Fix: `train_quotas(n_months, 1_500_000)` splits the cap evenly. Five months → 300k each. Rebuild every loop from every archive on disk.

Missing next-month zst: download
`https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst`
or exit loud. No fake rows. No Stockfish labels.

## Promote

Unchanged: random-move pass, then 64-visit 1320 score **strictly greater** than published. VOID leaves public bytes.

When the >1320 gate hits, promote (if not already) and write MLE into `gauntletElo`.

## Errors

| Failure | Behaviour |
|---|---|
| Month download fails | Exit. Print URL. Public unchanged. |
| Stockfish missing | Random still runs. SF skipped. Card stays. |
| 3 VOID loops | Stop. Print that tinyaz-m is next. |
| MPS missing | Train on CPU. Print it. |

## Non-goals

tinyaz-m (stop and switch, do not start it here). 256-visit SP. Stockfish-as-teacher. Lichess BOT. Mixing 1-visit and 64-visit on the card.

## Never

- Claim we beat Stockfish / Lc0.
- Print `1320+` from a single 8-game point.
- Convert a Lichess human account to BOT.
- Commit to main.
