# Training source blueprint

## Overview

Source root for the Python distribution. This directory has no direct source
files; execution belongs to its child package and the callers in `train/scripts`.
The [manifest](../pyproject.toml) packages `src/tinyaz` with Hatchling.

## Subdirectories & Boundaries

- [tinyaz](./tinyaz/README.md): board/move encoding, network, packed checkpoints, search, human data, self-play, training, evaluation, promotion, and UCI. `[tinyaz/encode.py:encode_board]` `[tinyaz/model.py:TinyAZ]` `[tinyaz/pack.py:pack_model]` `[tinyaz/mcts.py:search_root]` `[tinyaz/train_loop.py:train_candidate]` `[tinyaz/engine_uci.py:TinyazUci]`

## Interface

- Import APIs from their `tinyaz` modules. The initializer only declares `__version__`; it does not re-export the module APIs. `[tinyaz/__init__.py:__version__]`
- Encoding and model boundaries are `encode_board`, `policy_target_index`, `TinyAZ`, `pack_model`, `load_model`, `NetEval`, and `search_root`. `[tinyaz/encode.py:encode_board]` `[tinyaz/policy.py:policy_target_index]` `[tinyaz/model.py:TinyAZ]` `[tinyaz/pack.py:pack_model]` `[tinyaz/pack.py:load_model]` `[tinyaz/mcts.py:NetEval]` `[tinyaz/mcts.py:search_root]`
- Pipeline boundaries include `write_human_months`, `generate`, `train_fresh`, `train_candidate`, `maybe_promote`, `TinyazUci`, and `run_stdio`. The child contract lists the complete module interfaces. `[tinyaz/data.py:write_human_months]` `[tinyaz/generate.py:generate]` `[tinyaz/train_loop.py:train_fresh]` `[tinyaz/train_loop.py:train_candidate]` `[tinyaz/promote.py:maybe_promote]` `[tinyaz/engine_uci.py:TinyazUci]` `[tinyaz/engine_uci.py:run_stdio]`

## Invariants

- Board/move encodings are side-to-move canonical, using 19 board planes, 73 policy planes, and rank flip `i ^ 56`. `[tinyaz/encode.py:encode_board]` `[tinyaz/policy.py:policy_target_index]` `[tinyaz/constants.py:flip_index]`
- The packed `TAZS` version-1 layout is shared by supported 64/128-channel models. Loading validates header and recognized parameter count. `[tinyaz/pack.py:load_model]` `[tinyaz/constants.py:channels_for_count]`
- Default visit budgets are play 64, training 256, and snapshot 1; callers may override them. Source tag `selfplay-64` does not enforce a visit count. `[tinyaz/constants.py:PLAY_VISITS]` `[tinyaz/constants.py:TRAIN_VISITS]` `[tinyaz/constants.py:SNAPSHOT_VISITS]` `[tinyaz/constants.py:SOURCE_NAMES]` `[tinyaz/generate.py:generate]`
- Replay is captured before appended generation; empty training data raises. False keep decisions leave public bytes untouched, while true publication replaces files separately. `[tinyaz/train_loop.py:mix_for_train]` `[tinyaz/train_loop.py:train_candidate]` `[tinyaz/promote.py:maybe_promote]`

## Side Effects

- Child modules read PGNs/JSONL/weights, create or replace datasets/checkpoints, and append/merge self-play shards. `[tinyaz/data.py:write_human_months]` `[tinyaz/train_loop.py:load_jsonl]` `[tinyaz/pack.py:pack_model]` `[tinyaz/generate.py:generate]`
- Child training mutates parameters and selects MPS or CPU. Generation can start worker processes; search mutates trees and the supplied board during exploration. `[tinyaz/train_loop.py:pick_device]` `[tinyaz/train_loop.py:_train_on]` `[tinyaz/generate.py:generate]` `[tinyaz/mcts.py:search_root]`
- Child promotion writes and replaces public artifact paths supplied by callers. UCI loads weights, mutates stored engine state, and reads/writes standard streams. `[tinyaz/promote.py:maybe_promote]` `[tinyaz/engine_uci.py:TinyazUci.ensure_eval]` `[tinyaz/engine_uci.py:TinyazUci.handle]` `[tinyaz/engine_uci.py:run_stdio]`

## Verification

From the repository root, use the pinned project environment `train/.venv`
(CPython 3.11, pip 25.2; see [train/README.md](../README.md)) with the four
pinned libraries in [requirements-verify.txt](../requirements-verify.txt).
The base package imports NumPy only; the optional `train` group supplies
PyTorch, `python-chess`, and `zstandard` for PGN work.

```sh
TINYAZ_VERIFY_BIN="$PWD/train/.venv/bin"
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_encode.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_lichess_split.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_climb_loop.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_engine_uci.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_mcts.py
```

These are standalone script entrypoints. `test_climb_loop.py` runs controlled
aggregation/dispatch checks; the retained real-S regressions live in
`test_climb_real_regressions.py`, which is deferred, excluded from required
gates, and never run here. Training, gauntlets, publication, and bot
operation were not run to check this blueprint.
