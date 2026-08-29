# tinyaz-m ladder toward 64-visit Elo ~2500

Date: 2026-08-29
Status: **approved** (user chose ladder option 1)
Repo: `hanselhansel/hansel-chess-ai`
Predecessor: `docs/superpowers/specs/2026-08-29-climb-until-1320-design.md`

## Claim (unchanged)

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

Published ruler: **64-visit vs Stockfish 18 `UCI_LimitStrength`**, 100 ms/move. Not “beats Stockfish.” Not a Lichess rating.

## Why another 2013 month will not get us to 2500

tinyaz-s is **0.64M × 64 visits**. Published MLE **1370** (1205–1525). **1–7 vs `UCI_Elo` 1500.** 2500 is ~1100 Elo above that. Human 2013 imitation has done its job (off the 1320 floor). Self-play of a *stronger* net is the AZ climb. Capacity is the other unused lever: **tinyaz-m, 8×128, ~2.4M**, still under 3M.

## Cannot copy s weights into m

64-channel tensors do not load into 128-channel convs. m starts from Kaiming/random. Same 1.5M human mix as the teacher prior. Then 64-visit self-play of **m**, not of the old 0–8 net.

## First experiment (this spec’s ship)

1. Implement `TinyAZ(channels=128)`. Pack header still `TAZS` v1. Discriminator is **param count** (640018 = s, ~2.43M = m).
2. Train m from scratch on `train/data/human/train.jsonl` (1.5M), 3 epochs, batch 256, MPS.
3. 1-visit vs random must pass.
4. 64-visit vs SF **1500** (8-game suite). Keep m only if score **> 0.125** (beats s’s 1–7) **and** 64-visit vs 1320 score **≥ 0.5**.
5. VOID: public `tinyaz-s.bin` unchanged. Side checkpoint `train/checkpoints/tinyaz-m.bin`.
6. If keep: publish `public/weights/tinyaz-m.bin`, point the browser at it, card name `tinyaz-m`. JS forward uses `stemB.length` as channels so s and m both unpack.

256-visit generate is **off** this experiment. Snapshot SP is the **next** spec after m is public or after this VOID.

## Later rungs (not this ship)

After m is the public net (or s stays and we retry m with more data):

```
64-visit SP, snapshot keep if score > 0.5
  → 50% vs 1500
  → 1800
  → 2000
  → add gauntlet rungs 2200, 2500
  → 256-visit *targets* only once 1500 is ~50% at 64
```

Stop per rung. Card stays 64-visit. Mix 1-visit and 64-visit never.

## Modules

| Unit | Change |
|---|---|
| `tinyaz.constants` | `CHANNELS_S=64`, `CHANNELS_M=128`, `param_count(ch)` |
| `tinyaz.model` | `TinyAZ(channels=)` |
| `tinyaz.pack` | load/pack by param count |
| `src/lib/chess/net.ts` | buffers sized from `w.stemB.length` |
| `src/lib/chess/weights.ts` | unpack s or m from header count |
| `train/scripts/train_m.py` | orchestrate first experiment |

Files under 400 lines. Grok auth/PWA untouched.

## Errors

| Failure | Behaviour |
|---|---|
| jsonl missing | Exit. Print path. No fake rows. |
| Stockfish missing | Random still. SF skipped. s stays public. |
| 1500 score ≤ 0.125 or 1320 < 0.5 | VOID. s public. |
| Random-move fail | VOID. |
| Packed count not s and not m | Refuse to load. |

## Non-goals this ship

256-visit SP. SF teacher. Lichess BOT. ONNX. Changing PLAY_VISITS. Claiming 1370 is 2500.

## Never

- Publish 256-visit Elo as 64-visit.
- Fork chesslite / Lc0.
- Commit to main.
- Convert a Lichess human account to BOT.
