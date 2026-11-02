# Training and engine scripts

## Overview

Operational entrypoints around the [tinyaz package](../src/tinyaz/README.md).
The scripts prepare human data, train small or medium models, generate
self-play, evaluate candidates, publish selected artifacts, or expose UCI.
Historical small-model entrypoints retain their own defaults.

## Interface

| Entrypoint                                 | Boundary and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [build_lichess.py](./build_lichess.py)     | `month_of`, `next_month`, `download_url`, `months_label`, `find_pgns`, and `main`; finds local monthly archives and writes human train/validation shards through `tinyaz.data`. `[build_lichess.py:month_of]` `[build_lichess.py:next_month]` `[build_lichess.py:download_url]` `[build_lichess.py:months_label]` `[build_lichess.py:find_pgns]` `[build_lichess.py:main]`                                                                                                                      |
| [phase1.py](./phase1.py)                   | `JsonlPositions`, `prepare`, `train`, `main`; original CPU-only tinyaz-s supervised checkpoint workflow. `[phase1.py:JsonlPositions]` `[phase1.py:prepare]` `[phase1.py:train]` `[phase1.py:main]`                                                                                                                                                                                                                                                                                              |
| [phase2.py](./phase2.py)                   | `play_game`, `selfplay`, `MixDataset`, `collate`, `load_lichess_mix`, `train_on`, `pit`, `main`; original 64-visit tinyaz-s self-play candidate workflow. `[phase2.py:play_game]` `[phase2.py:selfplay]` `[phase2.py:MixDataset]` `[phase2.py:collate]` `[phase2.py:load_lichess_mix]` `[phase2.py:train_on]` `[phase2.py:pit]` `[phase2.py:main]`                                                                                                                                              |
| [climb.py](./climb.py)                     | `main`; small-model snapshot, self-play, training, gating, promotion, and SF1320 evaluation. Environment: `CLIMB_GAMES`, `CLIMB_WORKERS`, `CLIMB_VISITS`. `[climb.py:main]`                                                                                                                                                                                                                                                                                                                     |
| [human_month.py](./human_month.py)         | `published_score`, `supervised`, `selfplay_loop`, `main`; fine-tunes tinyaz-s on prepared human rows and optionally runs 64-visit self-play. Environment: `HUMAN_MONTHS`, `HUMAN_EPOCHS`, `HUMAN_BATCH`, `HUMAN_SP_LOOPS`, `CLIMB_GAMES`, `CLIMB_WORKERS`. `[human_month.py:published_score]` `[human_month.py:supervised]` `[human_month.py:selfplay_loop]` `[human_month.py:main]`                                                                                                            |
| [climb_until.py](./climb_until.py)         | `last_trained_month`, `ensure_month`, `rebuild`, `one_loop`, `main`; downloads later archives and repeats the tinyaz-s human-month flow with `CLIMB_MAX_LOOPS`. `[climb_until.py:last_trained_month]` `[climb_until.py:ensure_month]` `[climb_until.py:rebuild]` `[climb_until.py:one_loop]` `[climb_until.py:main]`                                                                                                                                                                            |
| [train_m.py](./train_m.py)                 | `published_1500`, `point_js_at_m`, `main`; trains a fresh 128-channel model from human shards and conditionally publishes it. Environment: `HUMAN_EPOCHS`, `HUMAN_BATCH`. `[train_m.py:published_1500]` `[train_m.py:point_js_at_m]` `[train_m.py:main]`                                                                                                                                                                                                                                        |
| [climb_m.py](./climb_m.py)                 | `published_1500`, `one_loop`, `main`; medium-model self-play continuation. Controls include `CLIMB_GAMES`, `CLIMB_WORKERS`, `CLIMB_MAX_LOOPS`, `CLIMB_VISITS`, `CLIMB_EPOCHS`, `CLIMB_LICHESS_MIX`, `CLIMB_SKIP_GENERATE`, `CLIMB_GAMES_KEEP`. `[climb_m.py:published_1500]` `[climb_m.py:one_loop]` `[climb_m.py:main]`                                                                                                                                                                        |
| [months_m.py](./months_m.py)               | `last_trained_month`, `published_score`, `published_1500`, `rate_higher`, `one_loop`, `main`; medium-model monthly continuation and ratings. Controls include `MONTHS_FROM`, `MONTHS_RATE_ONLY`, `MONTHS_SKIP_REBUILD`, `MONTHS_SKIP_RATE`, `MONTHS_RATE_HIGHER`, `HUMAN_EPOCHS`, `HUMAN_BATCH`, `CLIMB_MAX_LOOPS`. `[months_m.py:last_trained_month]` `[months_m.py:published_score]` `[months_m.py:published_1500]` `[months_m.py:rate_higher]` `[months_m.py:one_loop]` `[months_m.py:main]` |
| [elo_gauntlet.py](./elo_gauntlet.py)       | `play_game`, `mle_elo`, `merge_meta`, `main`; tinyaz-s gauntlet with optional first positional Stockfish path. This is not a CLI for reproducing the recorded medium-model 48-game result. `[elo_gauntlet.py:play_game]` `[elo_gauntlet.py:mle_elo]` `[elo_gauntlet.py:merge_meta]` `[elo_gauntlet.py:main]` `[elo_gauntlet.py:WEIGHTS]` `[elo_gauntlet.py:SF_PATH]`                                                                                                                            |
| [rematch_32.py](./rematch_32.py)           | `rate` and `main`; fixed historical medium checkpoint, 16 openings with both colors per Elo rung. `[rematch_32.py:rate]` `[rematch_32.py:main]` `[rematch_32.py:CAND]` `[rematch_32.py:OPENINGS]`                                                                                                                                                                                                                                                                                               |
| [tinyaz_uci.py](./tinyaz_uci.py)           | `main`; `--weights`, `--visits`, and `--device` delegate to `tinyaz.engine_uci`. Defaults are imported weights, 64 visits, and CPU. `[tinyaz_uci.py:main]` `[tinyaz_uci.py:PLAY_VISITS]`                                                                                                                                                                                                                                                                                                        |
| [hansel-chess-ai](./hansel-chess-ai)       | Extensionless bash wrapper; prepends `train/src` to `PYTHONPATH` and forwards all arguments to unbuffered `tinyaz_uci.py`. `[hansel-chess-ai:PYTHONPATH]` `[hansel-chess-ai:exec]`                                                                                                                                                                                                                                                                                                              |
| [fetch_stockfish.sh](./fetch_stockfish.sh) | Ubuntu x86-64 binary fetch helper; destination is `train/bin/stockfish`. `[fetch_stockfish.sh:DEST]` `[fetch_stockfish.sh:curl]` |
| [uci_child_test_support.py](./uci_child_test_support.py) | Test-only support imported by `test_engine_uci.py`: `SITECUSTOMIZE` identity hook, `build_child_env`, `select_python3`, `parent_identity`/`validate_parent`, `validate_child`, `run_help_child`, and `run_help`. Owns the pinned project-venv child environment, `python3` resolution against the actual child `PATH`, bounded identity sidecar comparison, and the help-only subprocess boundary. Never imported by production code. `[uci_child_test_support.py:run_help]` `[uci_child_test_support.py:select_python3]` `[uci_child_test_support.py:validate_child]` |

## Invariants

- Both `climb.py` and `climb_m.py` default generation to `TRAIN_VISITS=256`, with `CLIMB_VISITS` override. Small-model `climb.py` gates snapshots at 1 visit; `climb_m.py` gates them at `PLAY_VISITS=64`. The medium flow defaults to four training epochs. `[climb.py:main]` `[climb_m.py:main]` `[climb_m.py:one_loop]` `[../src/tinyaz/constants.py:TRAIN_VISITS]` `[../src/tinyaz/constants.py:PLAY_VISITS]`
- `phase2.py` retains its local 64-visit generation and 1-visit pit. `human_month.py` explicitly generates and compares snapshots at 64 visits. Shared defaults do not override those choices. `[phase2.py:VISITS]` `[phase2.py:pit]` `[human_month.py:selfplay_loop]`
- Small-model `climb.py` requires snapshot score `>0.5` and a passing random control before public promotion. Human-month public promotion additionally requires an available SF1320 result strictly better than the published score. `[climb.py:main]` `[human_month.py:_maybe_public]`
- Medium-model `climb_m.py` requires a 64-visit snapshot score `>0.5` and a passing random control. It rejects an available SF1500 score below the published floor; missing SF results do not trigger that floor rejection. Its GATE is score `>=0.5` vs SF1500, with at most three loops. `[climb_m.py:one_loop]` `[climb_m.py:main]` `[climb_m.py:MAX_LOOPS]`
- `train_m.py` requires the random pass, an available SF1320 score `>=0.5`, and an available SF1500 score strictly better than the small model's published score. `[train_m.py:main]` `[train_m.py:published_1500]`
- `months_m.py` keeps a random-passing candidate only when SF1500 holds its floor and at least one SF1500..2500 score improves. Its GATE is SF2000 score `>=0.5`. `MONTHS_RATE_HIGHER` rerates public/fallback weights without rerunning keep; `MONTHS_SKIP_RATE` returns after packing. `[months_m.py:one_loop]` `[months_m.py:rate_higher]` `[months_m.py:main]`
- Phase 1 writes a candidate under `train/checkpoints`; Phase 2 reads the public small model. Phase 2 writes its candidate and metadata before exiting 2 on a 12-game 1-visit pit score `<0.35`; it does not publish that candidate. `[phase1.py:CKPT]` `[phase2.py:PHASE1]` `[phase2.py:main]`
- `elo_gauntlet.py` uses 64 visits, four openings with both colors, and rungs 1320/1500/1800/2000. `rematch_32.py` uses 32 games per requested rung and combines them with a hardcoded historical eight-win SF1320 observation. These are Stockfish ruler outputs, separate from Lichess ratings. `[elo_gauntlet.py:VISITS]` `[elo_gauntlet.py:ELOS]` `[elo_gauntlet.py:OPENINGS]` `[elo_gauntlet.py:main]` `[rematch_32.py:rate]` `[rematch_32.py:main]`
- The fetch helper skips an existing executable, uses GitHub's `latest` Ubuntu x86-64 asset, and does not pin or validate a version. The source comment names Stockfish 18; the URL alone does not guarantee it. `[fetch_stockfish.sh:DEST]` `[fetch_stockfish.sh:curl]`

## Side Effects

- Dataset preparation reads local PGN archives and replaces JSONL shards; monthly continuation can download Lichess archives, deleting failed or undersized downloads. `[build_lichess.py:main]` `[phase1.py:prepare]` `[climb_until.py:ensure_month]` `[climb_until.py:rebuild]` `[months_m.py:one_loop]`
- Training and self-play mutate model parameters, write checkpoints and replay files, and print progress. Small/medium climb flows freeze snapshots and can replace public weights plus frontend/public metadata through `tinyaz.promote`. `[phase1.py:train]` `[phase2.py:main]` `[climb.py:main]` `[climb_m.py:one_loop]` `[human_month.py:supervised]` `[months_m.py:one_loop]`
- Phase 2 creates the small Lichess backup if absent. Accepted `train_m.py` also rewrites two exact frontend model constants; this is not merely a checkpoint write. `[phase2.py:main]` `[phase2.py:LICHESS_BAK]` `[train_m.py:point_js_at_m]` `[train_m.py:main]`
- Gauntlet/rating paths launch Stockfish through the package adapter. `elo_gauntlet.py` rewrites small-model and frontend metadata. Direct `rate_higher` invocation can publish fallback candidate bytes if public weights are absent; its CLI first requires public weights to exist. `[elo_gauntlet.py:main]` `[elo_gauntlet.py:merge_meta]` `[rematch_32.py:rate]` `[months_m.py:rate_higher]` `[months_m.py:main]`
- Python entrypoints prepend local import paths. The shell UCI wrapper exports `PYTHONPATH` and replaces itself with Python, which starts the package stdio engine. `[tinyaz_uci.py:sys.path.insert]` `[hansel-chess-ai:PYTHONPATH]` `[hansel-chess-ai:exec]` `[tinyaz_uci.py:main]`
- Fetching Stockfish creates a temporary directory, downloads/extracts an archive, copies/chmods the executable, and removes temporary files on exit. `[fetch_stockfish.sh:TMP]` `[fetch_stockfish.sh:curl]` `[fetch_stockfish.sh:trap]`

## Verification

Run these standalone checks from the repository root in the pinned project
environment `train/.venv` (CPython 3.11, pip 25.2; see
[train/README.md](../README.md)) with the four pinned libraries in
`train/requirements-verify.txt` (numpy, chess, zstandard, torch). No pytest
runner is configured.

```sh
TINYAZ_VERIFY_BIN="$PWD/train/.venv/bin"
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_encode.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_lichess_split.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_climb_loop.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_engine_uci.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_challenge_rotator.py
PATH="$TINYAZ_VERIFY_BIN:$PATH" PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python" train/scripts/test_mcts.py
```

`test_mcts.py` exercises imported search mechanics with a scripted fake
evaluator, including injected-error board restoration and optional
`--capture-control` / `--compare-control` modes writing a deterministic
normal-path control plus separate provenance companions. `test_engine_uci.py`
spawns its CLI and wrapper help children only with the project venv `PATH`
built by `uci_child_test_support.py`: `python3` is resolved against the
actual child `PATH` and rejected before launch when it lands outside the
venv, and each child's `sitecustomize` sidecar records invocation path,
resolved executable, executable binary SHA256, full `sys.version` and
`version_info`, prefix and base-prefix — all compared to the running parent
interpreter, with the validated records printed as bounded labeled JSON
before cleanup. A controlled wrong-`python3` selection is proven rejected
before a no-spawn sentinel. `test_climb_loop.py` uses controlled test doubles
behind fail-fast compute guards; `test_climb_real_regressions.py` retains the
original real-S snapshot/self-play cases as deferred coverage and is never
imported or run here. Training, gauntlets, the binary fetch helper, UCI
sessions, promotion, and bot launches are operational workflows. They were
not run as documentation checks.
