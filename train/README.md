# Hansel Chess AI

## Overview

From-scratch AlphaZero-style chess net you can play, watch think, and rate. Under 3M parameters.

**Play it in the Grok app.** This repo is the training ground and the spec.

## Claim

Strongest _from-scratch_ tiny AlphaZero you can inspect. The claim is not “beats Stockfish.”

| Size          | Shape       | Params |
| ------------- | ----------- | ------ |
| tinyaz-s (v1) | 8×64 ResNet | ~0.64M |
| tinyaz-m      | 8×128       | ~2.4M  |

Play / published search: **64 visits**. Self-play targets: **256 visits** by default in both current climb entrypoints. 1-visit is the naked net and the original tinyaz-s `climb.py` snapshot gate. `climb_m.py` and the human-month self-play path use 64-visit snapshot gates. The older Phase 2 and human-month self-play generation use 64 visits. Never mix those Elo numbers.

The [2026-08-27 climb-loop spec](../docs/superpowers/specs/2026-08-27-climb-loop-design.md) covers the small-model 1-visit gate. The later [approved medium-model ladder](../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md) specifies 64-visit snapshot self-play gates for its later rungs. These remain separate design contexts.

## Current code discrepancy

UCI defaults to `tinyaz-m.bin`, and the browser's trained mode now matches it at source level: `loadPlayWeightsTimed` fetches only `SELECTED_CHECKPOINT` (`/weights/tinyaz-m.bin`) and verifies format, length, architecture, source, finite tensors, and SHA256 before decode, with no random fallback. The earlier S-default discrepancy is resolved in source; native browser execution remains unproven. See the [browser contract](../src/lib/chess/README.md). `[src/tinyaz/engine_uci.py:default_weights]` `[../src/lib/chess/weights.ts:loadPlayWeightsTimed]` `[../src/lib/chess/constants.ts:SELECTED_CHECKPOINT]` `[../src/lib/chess/constants.ts:MODEL_NAME]`

## Status

Recorded repository results, retained from revision `bb76439` (2026-09-09).
That date identifies the repository snapshot, not each measurement. These
ratings, game counts, and SHA notes were not live-verified in this pass.

Phase 2 rated: **tinyaz-m** playable. 8×128, 2.43M. 64-visit **8–0 vs SF1320**, **8–0 vs SF1500**, **5–1–2 vs SF1800**, **4–2–2 vs SF2000**, **2–1–5 vs SF2200**, **0–8 vs SF2500**, 48-game MLE **2035**. KEEP+GATE vs SF2000. Public SHA `b716fe7b`. Not 2500. 1-visit vs random **19–1–0**. Lichess blitz **1531** (108 games, RD 45) at [hanselhansel](https://lichess.org/@/hanselhansel), BOT pool, 64 visits. Not the 2035 gauntlet. s (1370) kept on disk.

## Operational examples

These retained examples launch engines, train, configure Stockfish, or rate
models. They are separate from the standalone verification commands below.
`elo_gauntlet.py` targets tinyaz-s and does not reproduce the recorded
medium-model 48-game result.

```sh
train/scripts/hansel-chess-ai
CLIMB_GAMES=64 PYTHONPATH=train/src python3 train/scripts/climb_m.py
mkdir -p train/bin
ln -sf "$(which stockfish)" train/bin/stockfish
PYTHONPATH=train/src python3 train/scripts/elo_gauntlet.py
node --experimental-strip-types src/lib/chess/gauntlet.ts
```

UCI engine name is **hansel-chess-ai**. Flags: `--weights`, `--visits` (clamped to 1–4096), `--device` (CPU default, MPS when available). The parser accepts a device string rather than restricting choices to `cpu|mps`. See [Lichess BOT setup](lichess-bot/README.md).

`fetch_stockfish.sh` is ubuntu-x86-64. On this Mac, symlink Homebrew Stockfish 18 instead.

## Spec

- Design: [docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md](../docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md)
- Climb loop: [docs/superpowers/specs/2026-08-27-climb-loop-design.md](../docs/superpowers/specs/2026-08-27-climb-loop-design.md)
- Medium-model ladder: [docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md](../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md)
- Roadmap: [docs/LATER.md](../docs/LATER.md)

## Not this

Not a fork of `hansel-chesslite`. That repo perfected a measuring instrument and never produced a playable model.

## Subdirectories & Boundaries

- [src](./src/README.md): the Python package's encoders, model, search, data/training, evaluation, promotion, and UCI implementation. `[src/tinyaz/encode.py:encode_board]` `[src/tinyaz/model.py:TinyAZ]` `[src/tinyaz/engine_uci.py:TinyazUci]`
- [scripts](./scripts/README.md): orchestration and executable entrypoints, including historical tinyaz-s paths and current tinyaz-m continuation. `[scripts/climb.py:main]` `[scripts/climb_m.py:main]` `[scripts/months_m.py:main]` `[scripts/hansel-chess-ai:exec]`
- [lichess-bot](./lichess-bot/README.md): local challenge rotation and configuration for the separate external bot runtime. `[lichess-bot/challenge_rotator.py:main]` `[lichess-bot/config.yml.example:engine.name]`

## Interface

- The [manifest](./pyproject.toml) packages `src/tinyaz` with Hatchling. Module APIs include `TinyAZ`, `search_root`, `write_human_months`, `generate`, `train_candidate`, `maybe_promote`, and `TinyazUci`; implementation ownership stays in those modules. `[pyproject.toml:tool.hatch.build.targets.wheel]` `[src/tinyaz/model.py:TinyAZ]` `[src/tinyaz/mcts.py:search_root]` `[src/tinyaz/data.py:write_human_months]` `[src/tinyaz/generate.py:generate]` `[src/tinyaz/train_loop.py:train_candidate]` `[src/tinyaz/promote.py:maybe_promote]` `[src/tinyaz/engine_uci.py:TinyazUci]`
- `hansel-chess-ai` forwards arguments to the CLI, which accepts weights, visits, and device. Small/medium training entrypoints own their environment controls and keep/discard gates. `[scripts/hansel-chess-ai:exec]` `[scripts/tinyaz_uci.py:main]` `[scripts/climb.py:main]` `[scripts/climb_m.py:one_loop]` `[scripts/months_m.py:one_loop]`
- `challenge_rotator.main` runs opponent discovery, selection, challenge submission, and game recording. The YAML example configures the external `lichess-bot` runtime, not the rotator. `[lichess-bot/challenge_rotator.py:main]` `[lichess-bot/challenge_rotator.py:challenge]` `[lichess-bot/challenge_rotator.py:sync_games]` `[lichess-bot/config.yml.example:engine.protocol]`

## Invariants

- Board input uses 19 side-to-move canonical planes; policy uses 73 planes and rank flip `i ^ 56`. Packed `TAZS` v1 loading recognizes small/medium parameter counts. `[src/tinyaz/encode.py:encode_board]` `[src/tinyaz/policy.py:policy_target_index]` `[src/tinyaz/constants.py:flip_index]` `[src/tinyaz/pack.py:load_model]` `[src/tinyaz/constants.py:channels_for_count]`
- Both climb entrypoints default generation to 256 visits with `CLIMB_VISITS` override. `climb.py` gates snapshots at 1 visit; `climb_m.py` and `human_month.py` gate at 64. Legacy Phase 2 and human-month generation are 64-visit paths. The `selfplay-64` source tag alone does not establish visit count. `[scripts/climb.py:main]` `[scripts/climb_m.py:main]` `[scripts/climb_m.py:one_loop]` `[scripts/human_month.py:selfplay_loop]` `[scripts/phase2.py:VISITS]` `[src/tinyaz/constants.py:SOURCE_NAMES]`
- Gates are entrypoint-specific. Medium self-play requires snapshot score `>0.5` plus random passage and rejects available SF1500 regressions; monthly continuation requires a preserved SF1500 floor and an improving rung. `maybe_promote(False, ...)` performs no public write. `[scripts/climb_m.py:one_loop]` `[scripts/months_m.py:one_loop]` `[src/tinyaz/promote.py:maybe_promote]`
- UCI defaults to the medium checkpoint and 64 visits; counts clamp to 1..4096, explicit nodes take priority, and clocks below 300 ms force 1 visit. `[src/tinyaz/engine_uci.py:default_weights]` `[src/tinyaz/engine_uci.py:clamp_visits]` `[src/tinyaz/engine_uci.py:TinyazUci.visits_for_go]`
- The rotator validates its account and local token format, sends rated 180+2 challenges, and stops at 80 blitz games or 50 with RD below 80. Upgrade eligibility and CPU-only bot operation remain operator guidance. `[lichess-bot/challenge_rotator.py:token]` `[lichess-bot/challenge_rotator.py:account]` `[lichess-bot/challenge_rotator.py:challenge]` `[lichess-bot/challenge_rotator.py:done]` `[scripts/tinyaz_uci.py:main]`

## Side Effects

- Data/training paths read archives and JSONL, mutate model parameters, write checkpoints, and append self-play replay. Monthly continuation can download additional Lichess archives. `[src/tinyaz/data.py:write_human_months]` `[src/tinyaz/train_loop.py:train_candidate]` `[src/tinyaz/generate.py:generate]` `[scripts/climb_until.py:ensure_month]`
- Promotion can replace public weights, public metadata, and `src/lib/chess/checkpoint-meta.json`. Files are replaced separately. Accepted fresh medium training also rewrites frontend constants. These legacy publishers do not maintain the browser's digest/length/source/input identity (`SELECTED_CHECKPOINT` describes the selected BINARY identity the browser verifies; `checkpoint-meta.json` supplies only historical/unbound display fields and is never treated as browser-verified checkpoint-meta identity): a future public replacement requires a coordinated reviewed selection-description and input-identity update with fresh verification, and a mismatch must fail visibly. `[src/tinyaz/promote.py:maybe_promote]` `[scripts/climb_m.py:one_loop]` `[scripts/months_m.py:one_loop]` `[scripts/train_m.py:point_js_at_m]`
- UCI consumes standard streams and loads model bytes. Stockfish rating launches an external process; the binary-fetch helper makes a network download. `[src/tinyaz/engine_uci.py:run_stdio]` `[src/tinyaz/engine_uci.py:TinyazUci.ensure_eval]` `[src/tinyaz/uci.py:Stockfish]` `[scripts/fetch_stockfish.sh:curl]`
- Bot rotation reads its token/state, sends HTTP requests, writes state/WDL/PGNs, and sleeps between polls. It marks seen IDs before result exports; outputs are not one transaction. `[lichess-bot/challenge_rotator.py:token]` `[lichess-bot/challenge_rotator.py:api]` `[lichess-bot/challenge_rotator.py:save_state]` `[lichess-bot/challenge_rotator.py:sync_games]` `[lichess-bot/challenge_rotator.py:main]`

## Verification

Run standalone scripts from the repository root using an active Python >=3.10
interpreter with the required dependencies. The manifest declares NumPy and
optional PyTorch/`python-chess` training dependencies. PGN imports also require
`zstandard`, which is currently undeclared. No pytest command is configured.

```sh
PYTHONPATH=train/src python3 train/scripts/test_encode.py
PYTHONPATH=train/src python3 train/scripts/test_climb_loop.py
PYTHONPATH=train/src python3 train/scripts/test_engine_uci.py
PYTHONPATH=train/src python3 train/scripts/test_challenge_rotator.py
PYTHONPATH=train/src python3 train/scripts/test_lichess_split.py
```

The encode/climb/UCI checks need PyTorch in that interpreter. The rotator check
uses mocked requests. Operational examples above were not run for this
documentation pass; no training, public promotion, live bot, or full gauntlet
was used as a documentation check.
