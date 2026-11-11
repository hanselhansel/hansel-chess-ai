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
| [check_browser_parity.py](./check_browser_parity.py) | Stdlib setup90 verification and same-bound process transfer to the immutable archived parity CLI; private registered FD3 child dispatch, no active-source model import. |
| [browser_eval/](./browser_eval/README.md)  | Source-only browser-evaluation evidence libraries for the verified-M workflow (C4a1): canonical JSON codec, closed record schema and frozen constants, confined bounded artifact store, sole-writer phase recorder, transitive receipt admission, one run-global supervisor protocol, exact paired statistics, and a test-only fixture owner. Owns `test:browser-harness` (node:test over `browser_eval/*.test.mjs`). C4a2 added the authored `darwin-arm64-libproc-v1` native-supervision owners — the three-source `process-macos.py`/`process-macos-native.py`/`process-macos-abi.py` collector plus the ownership, lsof field-parser, lsof-gate, lsof child-IO, LF-framing, transport, backend-identity, backend owned-reader, native-proof, deadline-budget, RSS-observation, collector-runtime and monitor modules, footprint, cleanup and the seven-owner watchdog (`watchdog.mjs` facade/first-stop, `watchdog-runtime.mjs` lifecycle, `watchdog-config.mjs` pure option/ctx capture re-exported through runtime/operations, `watchdog-shutdown.mjs` bounded shutdown/finalization, `watchdog-driver.mjs` real fork IPC, `watchdog-operations.mjs` validated dispatch/selftest, `watchdog-records.mjs` recorder/PGN/receipt readback) plus the declared test-only watchdog owners (`watchdog-test-fixtures.mjs`, `watchdog-child-test-fixtures.mjs`, `watchdog-run-test-fixtures.mjs`, `watchdog-cleanup-test-fixtures.mjs`, `watchdog-evidence-test-fixtures.mjs`, `watchdog-fs-test-fixtures.mjs`, `watchdog-boundaries.test.mjs`, `watchdog-evidence-boundaries.test.mjs`, `watchdog-records.test.mjs`, `watchdog-resource.test.mjs`, `record-lifecycle.mjs`/`record-lifecycle.test.mjs`) — authored source-only at that boundary (dated status; the whole-JS closure is verified below). The isolated Python suites run once under the selected interpreter as `python -I -B process-macos.test.py` and `python -I -B process-macos-wire.test.py`; the shared test-only `supervision-test-fixtures.mjs`, `process-monitor-test-fixtures.mjs`, `process-lsof-test-fixtures.mjs` and `process_macos_test_support.py`/`process_macos_path_test_cases.py` owners plus the pure `process-budget`/`process-transport`/`process-backend`/`process-backend-reader`/`process-lifecycle`/`process-lsof`/`process-lsof-fields`/`process-lsof-io`/`processes` suites run inside the existing harness glob with fake clocks/processes, and the actual-native `native-supervision.test.mjs` suite is authored as ONE serial real Native group covering the frozen N01-N15 matrix over the five created TEST helpers (`native-test-fixtures.mjs` harness plus the `native-fixture.mjs`/`native-fixture-protocol.mjs`/`native-fixture-io.mjs`/`native-fixture-admission.mjs` leaves) — it fails explicitly on unsupported platforms rather than skipping (dated source-only authoring status; the actual run is recorded below). Sol's Native5 bounded acceptance (`native-unit-prepared-5`) ran the two selected-Python suites 63/63 and the cleared Node fake-unit groups 133/133 with no warnings or timeouts — a fake-unit boundary only; real Native, watchdog and full-glob gates were then UNRUN (dated status). The same-session watchdog repair added the private `record-lifecycle.mjs` leaf plus the test-only `watchdog-test-fixtures.mjs`/`watchdog-records.test.mjs` owners, and the readable test-owner split added the test-only `watchdog-run-test-fixtures.mjs`/`watchdog-cleanup-test-fixtures.mjs`/`record-lifecycle.test.mjs` owners by whole-block moves after canonical declarations — 27 JS test files plus the same two Python commands, still source-only with no new gate result. At the earlier authoring boundary (dated author-time statement, 2026-11-02), no browser, native monitor, model, capture, phase or network execution was performed by the writer. Current status (2026-11-05, actual receipt): the owned serial command `node --test --test-concurrency=1` plus the 35 explicit `*.test.mjs` suite paths exited 0 in 38.9228 s with 352/352 pass, 0 fail/cancel/skip, stderr 0, no signals and exactly the two deliberate `TINYAZ_BOOKKEEPING_OBSERVER`/`TinyazBookkeepingObserverWarning` cases — the real-Native group passed (all 14 created direct handles real exit plus BOTH pipe closes settled, collectors 0/0/2 with the deliberate EOF, watchdog ran, combined evidence 1,748,598 < 4 MiB; receipt `/tmp/tinyaz-c4a2-sol-review/wd-child-term-ignore-89a-source-1/fullglob-gate/result.json`). C4b browser capture/numeric parity/preflight, C5 and the ONE approved comparison have not run and remain open. Contract: [browser_eval/README.md](./browser_eval/README.md). |
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

## Browser evaluation PGNs and match control

The [browser harness](./browser_eval/README.md) includes persisted two-slot
PGN selection and a rules-owned match controller. Actual Recorder-close and
checkpoint-event acknowledgments precede the next move. First stop protects
the selected PGN and leaves later bytes diagnostic. Only final closed
artifact, identity and cleanup facts can produce paired inference.
These internal APIs add no training, publication or automatic comparison
command. Pure unit evidence is separate from browser phase execution.

The private `browser_eval/page-arm.mjs` producer now binds recorded readiness
and per-move commands to actual public Page fixture calls, Worker messages
and hashed model-response bytes. Scripted SDK tests do not establish an
actual browser phase result.

The operational browser commands are `npm run test:chess-browser`,
`npm run eval:browser:preflight`, `npm run eval:browser` and the standalone
`check_browser_parity.py` wrapper. Each transfers into immutable archived
code and admits only its requested phase through verified same-workspace
parents. The private `browser_eval/run.mjs` entry owns preparation and
supervisor/driver composition; `phase-runners.mjs` dispatches real checks,
full numeric exports, throughput controls and locked matches. Scratch,
profiles, evidence and cache files stay counted in the workspace. These
paths do not train, publish weights or automatically launch a comparison.
See [exact usage](browser_eval/README.md#operational-command-usage). The newly authorized second comparison
uses 24 hours, with all shorter watchdogs and 256 MiB output accounting
unchanged. Count-only `TINYAZ_COMPARE_PROGRESS` lines follow real validated
terminal checkpoint ACKs and have no result/proof authority.


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


## Accepted separate-verdicts direction (2026-11-10)

Hansel approved the reviewed `tinyaz-separate-verdicts-v2` amendment and Sol High implementation. The [accepted canonical contract](../../docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#accepted-separate-verdicts-v2-contract-2026-11-10) and [Tasks 4-14](../../docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md#task-4-accepted-contract-and-before-use-declarations) declare the prospective work. V2 implementation and runtime validation remain pending; current operational code remains strict v1. The fc30765 attempt remains incomplete at 6/40 acknowledged games and 3/20 pairs, with no eligible analysis and unproven Native cleanup/accounting. All earlier failed cohorts remain ineligible. M weights remain unchanged. No fresh strength or Elo result is claimed. Fresh scoped reviews, whole-change review, Root runtime/candidate/policy releases, strict prerequisites and one separately released fresh full40 remain required.

Future v2 uses the same check/preflight/compare aliases and parity wrapper with the explicit protocol argument `--protocol train/fixtures/browser-protocol-v2.json`. Until implemented, do not invoke this prospective path. After implementation, an aggregate exit2 can carry graph-verified eligible strength and inconclusive resources only for a complete valid comparison. Inspect separate strength, phase/closure resource verdicts and authoritative completion/owner closure; a wrapper exit0 is readback success, not experiment passage. Keep all original shorter bounds and strict parent admission. The [owning declarations](browser_eval/README.md#accepted-separate-verdicts-v2-declarations-before-creation-2026-11-10) define the exact file/API scope.

### Task 5 pure foundations checkpoint (2026-11-10)

Pure policy selection, CommonIdentity/schema2 dispatch, bounded resource ledger, closed verdict reducers and data-only graph reconciliation are implemented. Operational defaults remain strict v1. The existing Recorder rejects v2 constructor/running input until Task8 integration; schema2 validity alone grants no publication authority. Monitor/Native/driver integration, genuine positive v2 publication, fixture/CLI selection, full validation and runtime release remain pending. All failed cohorts remain ineligible.

The four exact focused owners passed 51/51 on qualified Node24.22.2, and qualified npm typecheck exited0. The real v1 Recorder/Store/prepared-publication/readback control matched baseline completion SHA256 `b3653531e96221121f83253d92ec64dac9e6d637e96665e01abab14e6835632e`. A failed fixture teardown required TERM of its positively owned test child after the90s file guard; its actual coordinator exit1 and BOTH pipe closes are retained. Corrected teardown closes the genuine writer before inherited-owner settlement; subsequent causal RED/GREEN and focused checks closed naturally. These are local pure/scripted controls, with no Native, browser, model, phase or cohort passage claim.

Evidence: W/`separate-verdicts-implementation-evidence/b4d71967-8baf-4ebd-8472-a588dd66fe2a/`. Exact commands, input hashes, local costs, failed gates, intervention and actual exits/pipes are retained there. Root fresh source review is a separate pending gate.

### Task5 review fix round1 checkpoint (2026-11-10)

The independent review found five important issues. Local fixes now independently reject a fabricated clean tail over500ms, require eligible-strength cleanup/check/fault/stop coherence even when aggregate status is inconclusive, bind those final facts to reducer input, make incomplete monitoring or nonpassed strict parent resources ineligible, and reject backdated ledger/graph checkpoints (including future maximum durations). The owning browser-evaluation README now documents every current ledger method and all five TEST fixture factories, including argument fields/defaults, admission conditions, returns, errors and proof limits. Prior implementation status and51-test evidence are retained history; the fix suite is56/56 and qualified typecheck exited0. The correction still needs a fresh independent scoped re-review before Task6.

The earlier intervened fixture control establishes child72128 TERM followed by child/coordinator absence, coordinator72127 exit1 and both coordinator pipe closes. A separate child wait status was not captured. That limitation remains explicit; intervention is not natural closure or Native proof. Original raw evidence remains unchanged. Current fix evidence is W/`separate-verdicts-implementation-evidence/5ff32bac-98cf-4d06-ac6d-093c0277675b/`. Strictv1 staging remains active; no operational v2 publication, Native/browser/model/phase execution or fresh cohort result is claimed.

### Task5 review fix round2 checkpoint (2026-11-10)

Re-review accepted I1, I2, I3 and I5; I4 remained open because the monitor-start bound allowed an earlier checkpoint to borrow a later-origin episode's future duration. The local correction now clips each available retained episode at capture and uses only conservative retained-neighbor interval bounds for dropped ordinal ranges. Missing episode details remain unavailable; no history, policy or schema is reconstructed. Genuine earlier completed maxima and genuine open/completed checkpoints with66/70-episode final rings remain accepted. The exact600ms-to900ms later-origin forgery rejects. The focused suite is59/59; final typecheck and invariant evidence accompany the round2 report. Fresh independent scoped re-review remains pending before Task6.

Only the pure graph checker, its existing resource-quality test owner and affected documentation change. Strictv1 staging, all prior failed/control evidence and the unavailable separate historical child wait status remain unchanged. There is no Native/browser/model/phase execution or v2 publication/passage claim. Round2 evidence: W/`separate-verdicts-implementation-evidence/fd56d529-e22c-4b6a-a142-d08c6b190ce6/`.


### Task6 strict-v1 extraction checkpoint (2026-11-10)

The whole collector start,1000ms resource poll and sticky-RSS finish-boundary groups now delegate to their three declared owners on the original references. Strict-v1 tick/fault/cadence/debt/cleanup behavior and schemaVersion1 running records remain active. The Task6 table's v2 routing and policy behavior are staged for Task7 under Root's execution clarification; the approved normative projection is unchanged. Task5 Recorder v2 staging remains active.

Genuine pre-extraction characterization passed10/10, then identical inputs passed within the final six-owner suite43/43. Qualified typecheck exited0. Actual exit and both pipe closure receipts, frozen source hashes and local costs are retained in W/`separate-verdicts-implementation-evidence/46cb8caf-2b51-4294-b63e-9073fce7f4ac/`. The initial7/10 characterization attempt is retained; three new test assumptions were corrected against unchanged v1 owner behavior before extraction. No production behavior changed to satisfy them. Whole-group equivalence and protected23/M/whole Section3 audits pass. APIs and direct source-to-doc comparison are recorded in the owning browser-evaluation README and W/`v2-task-6-report.md`.

These are local scripted controls only. No actual Native/browser/model/phase execution, runtime release, v2 publication, fresh cohort or strength result is claimed. All failed cohorts remain ineligible. Fresh independent Root-dispatched scoped review is required before Task7.

Functional-closure staging: the three new runtime imports are not yet captured by `snapshot-files.mjs` (authorized Task9 scope). Local strict-v1 source equivalence is tested; archived CLI/phase qualification is unavailable at this checkpoint until Task9 captures every new runtime import and later gates pass. No source-stage result is a runtime release.


### Task7 monitor and Watchdog component checkpoint (2026-11-10)

Explicit v2 monitor policy now separates sticky whole-run coverage loss from
rolling complete/current timely observations and the original hard-fault channel.
Only private periodic compare timing predicates are soft. Bootstrap, public
sampling, other phases, structural/transport/permission faults and all original
bounds remain strict. Terminal admission requires a timely live complete cycle
without an overage. Observed versus admitted peaks stay distinct; observed caps
remain sticky through the real sampling fence and admitted-work drain.

Nested cleanup captures and caches an exact synchronous selftest prefix only
after its actual child-scope proof. Parent periodic debt remains pending and
owned. Later parent caps/faults/debt are parent evidence. V2 resource captures use
the borrowed clock's exact `nowMonoNs` reader, with no ms reconstruction or
change to operational ms deadlines. Closed monitor/prefix coverage emits no
redundant ordinary checkpoint; Task8 Recorder remains the sole mandatory full
final-resource-event publisher after actual drain.

The final exact nine-owner scripted Node roster passed112/112; isolated
`terminal-identity.test.py` passed8/8. Qualified npm typecheck exited0. Commands
retain actual process exit, BOTH pipe EOF, closed raw files and stable source
hashes. Causal failures and all intervening attempts remain in
W/`separate-verdicts-implementation-evidence/6114b3a8-893e-4e27-aa9e-78f72dcdd095/`.
The report is W/`v2-task-7-report.md`. The owning browser-evaluation README
records current signatures, defaults, errors, side effects and proof limits.

This is a local component checkpoint awaiting Root's independent scoped review.
Task5's v1-only Recorder staging guards remain active. Genuine positive v2
Recorder/Store/graph publication is Task8. Versioned fixture/driver/CLI capture
and reopen are Task9. `snapshot-files.mjs` is unchanged and does not yet capture
all new transitive runtime imports. Archived CLI/phase qualification and runtime
release remain unavailable. No actual Native/browser/model/phase execution,
fresh cohort or strength result is claimed. Failed cohorts remain ineligible.


### Task7 review fix round1 (2026-11-10)

Fresh review found two Important facade defects. A resource predicate could
synchronously latch stop while the caller still returned admission-open. The
quality timestamp reader could also throw while handling its own failure, before
fault retention and original cleanup capture. Both paths are corrected: admission
rechecks the actual stop/finish/driver state after the resource predicate, and
fault/stop containment uses the original operational clock. The exact reader
remains strict and is used only for resource evidence. No quality timestamp is
synthesized and operational deadlines/cleanup windows retain their original values.

The internal whole-facade component seam keeps public createWatchdog config
capture/default lifecycle unchanged. New controls drive actual facade callbacks,
operations, validated fork IPC, genuine v1 Recorder ownership, actual cleanup and
owned exit/BOTH-pipe settlement. They prove no ordinary registration/port issuance
after hard read failure, and containment with a broken exact reader installed.
R1 re-review found that its reader controls stopped at an earlier native hard
fault (closed ledger and absent fault channel), before exact capture. Those
receipts did not prove failed quality capture. R2 below corrects that evidence.
These controls are component evidence only;
they produce no normal v2 runtime, final publication, graph or Native proof.

Causal RED22/25 preceded GREEN25/25. The final authorized nine-owner Node roster
passed115/115, isolated Python8/8 and qualified typecheck exit0. Actual exit/BOTH
pipe EOF, raw hashes and frozen inputs are retained at
W/`separate-verdicts-implementation-evidence/b7adb175-84a8-4a99-96c7-8c7b1f7a6b67/`.
The initial23/25 exploratory fixture attempt is retained separately. Full fix
commands, audit and remaining limits are appended to W/`v2-task-7-report.md`.
Prior failures, approved contract, M/protected23/whole Section3 and v1-only staging
remain unchanged. Fresh scoped re-review precedes Task8. Task9 archived closure,
Native controls and all runtime releases remain future gates. No push or release.


### Task7 review fix round2 (2026-11-10)

R2 corrects the I2 fixture and evidence claims. I1 remains closed and production
watchdog code is unchanged in this commit. The control now owns a genuinely active
resource ledger seeded at current original-clock time, reads its unclosed snapshot
directly and supplies monitor.fault() returning null. It first proves actual
observation/admission valid, then observes invalid-reader calls or missing-reader
access and the primary capture error before genuine facade containment. The
primary persisted fault diagnostic must equal that capture error. No healthy v2
resource publication is needed or attempted through the backing v1 Recorder.

One explicitly authorized historical control temporarily restored only the two
recorded shared-nowNs I2 blocks, retaining the facade seam and I1 fix. Both exact
reader cases reached capture then failed containment (0/2,exit1). Actual process
exit/BOTH EOF preceded byte/hash restoration of current production. The corrected
owner then passed25/25; final required Node roster115/115, isolated Python8/8 and
qualified typecheck exit0 share frozen corrected inputs. GREEN keeps the broken
reader through actual shutdown and the original +2s/+4s/withheld-stderr proof.
RED-only TEST-reader restoration permits owned teardown and proves no healthy run.

Evidence: W/`separate-verdicts-implementation-evidence/01c2f667-532c-4bf3-825c-fc667112719c/`.
R1 receipts and their earlier source-clock correction remain preserved, with the
exact-capture proof limitation stated explicitly. W/`v2-task-7-report.md` appends
R2 commands, primary-cause controls, historical/restoration hashes and audits.
Protected23/M/whole Section3 and approved contract remain unchanged. Fresh scoped
review still precedes Task8; no publication, archived CLI/Native/phase or runtime
release is claimed. No push, merge or deploy.


### Task8 local Recorder/graph integration checkpoint (2026-11-10)

Explicit schema2 Recorder construction now uses the genuine Store, mandatory
identity/cleanup capture, sole event writer and original prepared publication
sequence. The full final resource snapshot is last, after actual admitted-body
fencing/drain and before writer close. Closed science/selection facts are derived
before resource aggregate degradation; graph readback independently recompiles
those facts and binds versions, policy, hashes, strict parents and nested prefix
extension. Pure helpers create no IO/publication/Native authority. V1 construction,
old readback and golden completion bytes retain their historical meanings.

The final exact nine-owner scripted Node roster passed178/178; qualified
Node24.22.2 typecheck exited0. Each final command retains actual process wait,
BOTH pipe EOF, fsynced/closed raw files and unchanged before/after source hashes.
Genuine publication/readback controls cover full40 synthetic fixtures with
eligible/inconclusive2 cadence-only outcomes, partial6/3 with absent finish checks
and no inference, every hard class, caps, cleanup/Store/publication failures,
forged resource graphs, strict parents and eventual pending-prefix closure.
Actual scripted-monitor post-fence cap retention is bound into genuine final
graphs. Existing producer-shaped driver completedGames arrays and diagnostic
completedPairs are accepted then discarded; authoritative counts come only from
validated recorded selections. All source/test owners remain below400 lines.

All causal REDs and intervening failed setup controls remain in
W/`separate-verdicts-implementation-evidence/77679d89-d055-4b70-b788-c2b1322a1c82/`.
The report is W/`v2-task-8-report.md`; the owning browser-evaluation README records
current APIs/defaults/errors/side effects/proof limits and the final code-to-doc
comparison. One failed test attempt required TERM of its positively owned worker;
its separate wait status is UNPROVEN. No Native closure is inferred from that
intervention. A later fixture factoring setup failed before lifetime/root-removal
teardown because of missing TEST imports; its natural failed process closure is
retained and its temporary-root cleanup remains unproven. Corrected final controls
inspect all close outcomes, join the exact owner and remove their owned roots.

This is local scripted integration awaiting Root's independent scoped review.
Task9 still owns fixture/driver/CLI and functional snapshot integration, including
`record-finalization-v2.mjs` and `receipt-verification-v2.mjs`. Current
snapshot-files.mjs lacks the complete new runtime closure, so archived CLI/phase
qualification remains unavailable. Task10 includes the new recorder TEST owner.
No actual Native/browser/model/match/phase/cohort execution, runtime release,
publication of a candidate, fresh strength result or old-cohort reclassification
is claimed. M, protected assets, original bounds and failed history are unchanged.


### Task8 review fix R1 identity/resource proof (2026-11-10)

The independent review found one Important defect in the prior Task8 compiler:
continuous monitor evidence and valid cleanup could retain phase/closure resource
passed when the mandatory identity callback rejected, returned malformed data or
returned a valid mismatch. The earlier178/178 suite did not cover those
continuous callback failures; quality-gap identity controls masked the false pass.
This was implementation drift from the approved missing-identity row, not a
policy change or permission to interpret old evidence differently.

Resource Native proof now also requires the actual captured on-time valid
CommonIdentity to equal the expected identity. All three negative callback
outcomes retain NATIVE_UNPROVEN in both phase and closure resource verdicts.
Without a cap they are inconclusive; an observed cap keeps failed priority and
its cap reason alongside NATIVE_UNPROVEN. Scientific/resource separation,
statistics, Native/clock/budget behavior, producers and v1 output are unchanged.

Genuine continuous Recorder/Store/prepared-publication/fresh-readback controls
reproduced all six failures (71/77 RED), then passed77/77 focused GREEN. The final
exact nine-owner roster passed184/184; qualified Node24.22.2 typecheck exited0.
All commands retain actual process wait, BOTH EOF, closed/fsynced raw files and
stable source maps. RED/GREEN runtime maps differ only in the compiler. Evidence
is W/`separate-verdicts-implementation-evidence/5aae4ee1-2455-4620-9de8-41e0ed1d52d5/`;
W/`v2-task-8-report.md` appends the fix commands, coverage, hashes and limits.

Protected23/M, whole Section3, amendment/approval and the full prior spec prefix
remain exact. Source/tests stay below400 lines. All old failed evidence, worker
wait and temporary-root cleanup UNPROVEN limits remain unchanged. No broad
cleanup or actual Native/browser/model/match/phase execution occurred. Root's
fresh scoped review remains required before Task9; archive/driver/CLI and later
execution-release gates remain open. No push, merge or runtime release.


### Task9 explicit selection integration checkpoint (2026-11-10)

Local Task9 integration now selects v2 only through the exact prospective
`train/fixtures/browser-protocol-v2.json` and closed approved policy. V1 remains
the omitted identity/reopen default; public command syntax still requires its
existing explicit --protocol value. Both fixtures being present selects nothing.
Capture, final measurement, independent reopen, manifest/monitor setup, driver
hello/start and verified CLI projection retain the selected identity. The runtime
union preserves the original114 paths/order and appends exactly12 inputs,
including both Task8 runtime leaves; TEST helpers remain excluded.

The final exact seven-owner scripted Node roster passed75/75. Isolated pinned
Python tests passed58+19+8, and qualified Node24.22.2 typecheck exited0. Actual
command wait/BOTH EOF, fsynced/closed raw files and stable source maps are retained.
Fresh-process controls use actual archived snapshot/Git/file/final measurement
owners, with synthetic environment acquisition through a TEST module hook.
They prove selected v1/v2 roundtrips and fail-closed byte/path/policy/version/hash
binding, including current-byte drift in fresh temporary repos. They do not
qualify the real environment, archived public CLI phase or Native behavior.
The one actual supervisor start constructor is covered against strict v1/v2
validation. Its other start literal is the unchanged bounded-wait label.

Causal REDs and failed setup attempts remain preserved. Prior Task8 worker-wait
and temporary-root cleanup UNPROVEN limits remain unchanged. Historical failed
cohorts remain ineligible; no model, statistics, science or bound changed.
Root's independent scoped review, later whole-change/control/runtime releases
and any fresh cohort remain open. No Native/browser/model/match/phase execution,
push, merge, deploy or operational release occurred.
Report: W/`v2-task-9-report.md`; evidence:
W/`separate-verdicts-implementation-evidence/63022b8a-a92e-4059-82d9-3aaa1257fdc8/`.


### Task9 review fix R1 checkpoint (2026-11-10)

Independent review identified one stale wider-roster TEST count and incomplete
shared TEST helper contracts. The count now follows the approved 126-path union;
every other private-fs-phase TEST byte/assertion is unchanged. Its whole-owner
causal RED is 3/4, exit1 at 126!=114; GREEN is 4/4, exit0 and reaches all runtime
module filesystem checks. Both commands retain actual wait/BOTH EOF, fsynced/
closed raw files and stable inputs. Their maps differ only in that TEST literal.

The owning browser-evaluation README now states exact helper return/error/IO
contracts, capture versus reopen branching without a closed-mode validator,
successful workspace JSON stdout, returned root/repo path, partial failure/
teardown limits and BOTH environment capture and verification substitutions.
The earlier acquisition-only wording and final comparison were incomplete.
Environment provenance in those controls is synthetic; production verification
is unchanged. Task10 reuses the documented helper via the same compat TEST.

All production and compat helper/TEST implementation bytes remain exact. Prior
Task9 prefixes/evidence, protected23/M, whole Section3 and approved policy remain
unchanged. Prior 75/75, Python 85/85 and typecheck 0 are retained results, not rerun
by R1. Root fresh scoped re-review, wider Task10 and later Native/CLI/runtime/
cohort releases remain open. No Native/model/browser/phase/network/push occurred.
Details append to W/`v2-task-9-report.md`; R1 evidence is
W/`separate-verdicts-implementation-evidence/aa689799-eac0-4fdb-9a51-fabc1b4e01c7/`.


### Task10 local scripted integration checkpoint (2026-11-10)

Prospective v2 operator/readback/inert-template integration is locally GREEN.
The final exact83-owner scripted roster passed1019/1019, zero skips/cancelled;
fresh W controls passed four real child cases, both real closed-graph cases and
all binding/physical negatives. Same final paired TEST bytes give18/20 causal
RED on the old observer and20/20 GREEN after the single-line v1 restoration.
RED/GREEN maps differ only in that observer; the full534-byte v2 fence block
and all public return/admission/queue/live-handle/P/C guards remain unchanged.
The existing v1 postreply completion/drain order is restored. Public samples
still cannot return ordinary success across the stopping fence.

The focused scripted CLI owner passed9/9. Its temporary v1 protocol alone uses
the existing synthetic8s check clock, with exact actual-byte ref binding.
Repository fixtures, production validators/constants/policy and hooks stay exact.
App test:scripts191/191, core184/184, typecheck and isolated Python58+19+8 plus
the six required standalone Python commands passed on unchanged dependencies.
Root explicitly retained those results without unnecessary repeats.

Original1010/1018 roster failure, StageA CLI2/9 and cleanup18/20 RED, StageB
cleanup19/20 failure and all raw evidence remain retained. The final TEST-only
shutdown-write microtask seam preserves original args/this/callback, validator,
exit/BOTH closes and actual lifetime. It fixes impossible same-stack fake-exit
reentry in that pair, with no production transport or global fixture edit.

Every final command retains actual child wait, BOTH EOF/raw-file/journal closure
and stable560 inputs. Seven subsequent result-doc appends intentionally differ
from those frozen maps; execution-source/TEST/helper/runtime pins remain current.
The original owner-green outer-tool relay wait remains UNPROVEN; its primary
Node/control-child receipts are positive and separate. The final fresh W command
and outer wait are retained. Previous Task8 worker-wait/temporary-root cleanup
UNPROVEN limits and all failed cohorts remain unchanged.

W/separate-verdicts-release-v2.template.json stays PREPARATION_ONLY, with release
candidate/safety/Node/Python/workspace/orchestration values and script hashes
null. Its exact protocol ref and fixed constraints remain present. No actual Native, real
environment/public archived CLI cap, CHECK/PARITY/PREFLIGHT/COMPARE, model phase,
training, measured scoring, network/install, push/merge/deploy or next phase ran.
This is scripted component evidence. Fresh independent full Task10 source/spec/
code-doc review precedes Task11; later runtime/candidate/policy releases remain
separate. Report: W/v2-task-10-report.md. Final evidence:
W/separate-verdicts-implementation-evidence/69e23b45-c09e-4f07-a2fe-3db7e5d5e44a/.


### Task10 R1 exact root grammar and diagnostic disclosure (2026-11-10)

This supplies the omitted preparation-path interface against unchanged operator
and control-validator bytes. It changes no accepted e78 requirement or release.
`candidate` is the released 40-character lowercase hexadecimal commit SHA.
`candidate7` is exactly `candidate.slice(0, 7)`, with no uppercase or other suffix.
The three required basenames are exactly:

- Workspace: `tinyaz-v2-<candidate7>-<UUID>`.
- Orchestration: `task-3-execution-<candidate7>-<UUID>`.
- Scripted control: `task-3-owner-controls-<UUID>`.

`UUID` has exactly this lowercase hexadecimal, hyphenated UUID v4 grammar:
`[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`.
The third group starts with `4`; the fourth starts with `8`, `9`, `a` or `b`
(the standard variant). The validators anchor the entire basename with `^`/`$`.
Uppercase, another UUID version/variant, an omitted segment or an added suffix
rejects even when a proposed directory is fresh and otherwise canonical.

For release workspace/orchestration values, use absolute normalized paths equal
to `path.resolve(value)`. Their parents must already exist: joining the realpath
of the parent to the basename must equal the supplied value. The loader creates
no parents. `ROOT` is the operator's fixed repository root; `PLAN` is the existing
directory containing the W operator. The workspace must be outside `ROOT`, never
under `ROOT/`. Its parent may be another existing canonical external directory.
The orchestration parent must be exactly `PLAN`. A control root also has parent
exactly `PLAN`, and that parent's realpath must equal the supplied parent string.
Its exclusive reservation separately enforces the control basename above.

First `check` requires an absent workspace and exclusively creates the fresh
orchestration root. Archived input bootstrap creates the fresh workspace under
its existing exclusive rules. Root reservation/phase/case `mkdir` calls create
no missing parents and reject collisions; JSON artifacts use exclusive `wx`.
Control roots are exclusively reserved once, then contain the fixed
`normal`, `exit2`, `nonzero`, `post-spawn-sink-failure` case directories and root
control-summary. Existing or historical control roots cannot be extended/reused.

Later manually selected parity/preflight/compare phases reuse the SAME released
workspace/orchestration roots. They require existing execution.json to match the
exact release hash, candidate and workspace, an existing workspace directory,
and the prior strict passed/closed/verified parents. Each new phase directory is
still created exclusively; compare's one-cohort claim is exclusive. This reuse
within that bound execution does not permit another bootstrap, repeated phase,
second cohort or reuse of historical roots. Readback reads the bound existing
phase and writes its verification artifact exclusively. No next phase launches
automatically; path conformance supplies no execution authorization.

Retained final scripted stdout contains two deliberate
`TinyazBookkeepingObserverWarning` messages, code `TINYAZ_BOOKKEEPING_OBSERVER`,
for controlled optional-observer failures `null` and `undefined` (lines531/533).
`record-evidence.test.mjs` checks those diagnostics and the unchanged authoritative
seal. This is expected controlled diagnostic noise; the result remains1019/1019.
No warning/test/source was silenced or changed. Older warning-source Minor items
remain for Task12 triage. The historical closure/proof limits and future Native,
phase, runtime and independent-review gates retain their existing meanings.

Owning contract: [exact v2 root grammar and diagnostics](browser_eval/README.md#task10-r1-exact-root-grammar-and-diagnostic-disclosure-2026-11-10).

### Task11 Native/control source preparation (2026-11-10)

Task10's actual fresh review is PASS at07e3035. Task11 is SOURCE PREPARATION
ONLY. New genuine Native compare/strict-check delivery controls retain real
transport/validator/clock/handles/lifetime, original60s group55s work5s reserve,
10s actor4MiB. A transparent bounded650ms Node delivery hold on one periodic
reply observes compare quality loss/recovery versus original strict hard fault.
The separate fresh v2 archived CLI control acquires its environment through
current genuine captureEnvironment, keeps existing controlled SDK/body/input
reopen, synthetic8s TEST clock and actual5s Native cleanup. Its cap is TIME /
PHASE_TIMEOUT. Actual RSS-overage is not claimed; scripted RSS controls remain
scripted. No4GiB allocation, lower limit, old environment/workspace reuse or
new Native authority. Only two declared TEST factories gain minimal optional
policy/phase or exact v1/v2 protocol selection/actual-byte binding adaptations.

All runtime checks are FUTURE and unrun for Task11. Fresh isolated Max source/
code-doc review and a separate exact Root execution GO precede the explicit85
serial owner command and current-byte cap control. Root alone executes/polls.
Actual exits, BOTH pipes, raw/journal/descriptor/body/owner settlement and no
intervention remain required. Historical failed evidence and unproven limits
are preserved. No model/browser/scoring/real phase/cohort/release, commit or
publication occurred during this preparation. Full interfaces/mechanisms and
proof limits are in the owning browser-evaluation README and W/v2-task-11-report.md.


### Task11 local Native and controlled TIME-cap validation (2026-11-10)

Fresh scoped R5 source/spec/code-doc review passed. The exact86-owner serial
harness passed1025/1025, zero failed/cancelled/skipped/todo, natural0 in
145.793413s. Outer4500 closed0. Actual wait/BOTH EOF/raw+journal fsync/close and
all647 before/after/current input pins were verified. Original14 and new3 direct
Native actors retain actual exits, BOTH pipe closes and settled ownership.
Compare's real delayed delivery kept coverage loss sticky through timely recovery
and healthy cleanup; strict check retained its hard accounting fault.

Fresh controlled v2 TIME-cap operator passed0 in25.119047s, outer86481 closed0.
Its archived CLI naturally exited2/PHASE_TIMEOUT; driver/collector exited0 with
BOTH closes. Setup verified23 artifact hashes/sizes (22 setup files/14 RECORDs
plus fresh environment). Containment was unused, no forced flag or sink error,
Native cleanup verified/accountingValid true, and all body/lifetime markers
fulfilled. The sealed completion and final resource event match; two actual
checkpoints preserve distinct Native completion and later capture timestamps.

The cap aggregate and BOTH resource verdicts remain INCONCLUSIVE. Resource reasons
are NATIVE_UNPROVEN and RECORDS_UNPROVEN because SDK/body/input-reopen and full
scientific inputs are controlled. This passes the TIME-cap/environment/process/
cleanup component control only. It is not a strict CHECK prerequisite,
scientific/cohort/strength/RSS-overage result. Earlier failed/intervened caps
remain preserved and ineligible. No historical result is repaired.

OPEN Important finding, assigned by Root to mandatory Task12 broader review:
the pre-existing graph verifier can admit jointly forged completion clocks before
ledger start when later cycle counts increase. R5 fixed the separate observation/
capture binding; it did not close this older gap. Do not publish or release a
phase/cohort before Task12 triage. Fresh Task11 completion review must pass before
Task12 admission. No push, merge, deployment or operational release is implied.

Final receipts/audits and ignored cap source bytes are retained in
W/separate-verdicts-implementation-evidence/4103de8f-9f45-4224-bdf7-dfec389e83b8/;
W/v2-task-11-report.md carries exact commands, receipt hashes and proof limits.
Protected23/M, whole Section3, e78/approval, old six helpers, runtime union126,
explicit86 roster and readable source below400 lines remain required and audited.
This status append changes no source/TEST/helper/manager or model bytes.

Task12 repair preparation (2026-11-10): the bounded existing-owner fixes and
causal TEST map are declared in [the owning contract](browser_eval/README.md#task12-single-repair-wave-before-use-map-2026-11-10).
Production remains OLD. New source execution and all phase/cohort release remain
withheld pending exact Root gates. W/v2-task-12-report.md tracks actual evidence.

Task12 same-wave preparation continues after the first Root-run OLD diagnostic.
Failed e84f8a9e evidence stays immutable; corrected TEST/v2 selection package
requires new exact Root GO. W/v2-task-12-report.md records the causal diagnosis.

Task12 retains the qualified49-case OLD control. A bounded W-only nested-error
diagnostic is source-prepared for a fresh exact Root gate; I5 attribution remains
unproven. W/v2-task-12-report.md preserves the actual receipts and qualifications.

Task12 current status (2026-11-10): all six Important and three Minor groups are
implemented and locally validated. Causal49/49, related410/410 and Native1059/1059
closed with Root audits. Controlled cap remains aggregate/resource INCONCLUSIVE.
[Owning status and limits](browser_eval/README.md#task12-fixed-implementation-and-local-validation-2026-11-10).
Scoped independent re-review is pending; Task12 and phase/full40 release stay open.

Task14 failed-attempt handoff (2026-11-10): Task12 scoped review passed all9 groups
and4709b15 was feature-published. Fresh strict CHECK/PARITY/PREFLIGHT passed0,
BOTH resource verdicts passed/gaps0. The ONE compare stopped at descriptive12/40,
6/20 after Store age2300>1000ms and downstream sticky failure. No final graph,
eligibility or verified persisted Native cleanup. Quiet producer scans did not
reproduce the timing; historical cause remains UNKNOWN.
[Owning outcome and control limits](browser_eval/README.md#task14-failed-comparison-handoff-and-idle-control-2026-11-10).
Task14 is a failed handoff; Task3/full40 remains INCOMPLETE with no automatic retry.

Task15 B1 is source preparation for scan-correlated diagnostics. The passive leaf
and two TEST owners exist; original observer/Store/FS hooks and runtime126 remain
OLD for semantic RED. Future runtime127 and exact packet/snapshot APIs are
[declared before use](browser_eval/README.md#task15-before-use-scan-diagnostics-contract-2026-11-10).
ONE later WORKTREE/v2 CHECK reuses actual environment/snapshot/Native/browser/SDK
cleanup and verified M64-visit inference. It retains setup90s, CHECK600000ms,
readiness30000ms, command90000ms, cleanup5000ms, all caps and1000ms scan-start
freshness. Root uses the unchanged170-line Python owner and a separately owned
genuine WORKTREE/check/v2 graph readback, not the committed-candidate operator.
A test-only natural-beforeExit preload exports only the cached archived trace.
No command has run; no cohort, scientific parent, guessed fix or old-run rescue.
The historical2300ms cause is UNKNOWN and Task3/full40 remains INCOMPLETE.

Task15 B2 source is now connected: exact scan/sample/Store-role attribution and
runtime127, with original clock/error/promise/cleanup authority unchanged. Root's
OLD-hook RED naturally1 in0.381963542s,33 tests27pass/6 intended attribution
failures, with actual wait/BOTHpipe/raw/journal/input closure. SAME causal TEST
bytes apply to the prepared GREEN. GREEN/whole-owner/serial88 and real diagnostic
CHECK remain UNRUN. No guessed historical-delay fix or new comparison release.

Task15 scripted GREEN passed33/33 (natural0/0.366397458s). Whole01 then passed
112/113; its sole failure was an obsolete snapshot runtime-prefix expectation.
Root declared the exact115-prefix digest, preserved historical114 digest after
filtering only the new leaf, unchanged12-entry tail and explicit leaf membership.
Only that inventory TEST changes; tested runtime order/source and four causal
TEST bytes stay unchanged. Whole02/serial88-02 remain UNRUN; old whole failure
and unrun serial01 are preserved. No live CHECK or full40 release follows.

Task15 current scripted gates: GREEN33/33, whole02 113/113 and serial88 1076/1076
passed with actual wait/BOTHpipe/raw/journal/input closure. The earlier whole01
112/113 inventory-expectation failure remains preserved; production source and
four causal TESTs were unchanged for the passing whole02/serial gates. ONE real
WORKTREE/v2 diagnostic CHECK and independent review remain UNRUN. These scripted
results do not identify the historical2300ms cause or complete Task3/full40.

Task15 actual validation: scoped source review and schema rereview passed; the
ONE real M64-visit WORKTREE/v2 CHECK naturally0 in166.025079250s. Separate genuine
readback naturally0 in0.247289209s verified the closed graph, both resource verdicts
passed, persisted cleanup and original task/lifetime joins. Root verified597/729
stable inputs and127 archived-source bindings with actual wait/BOTHpipe/raw/journal
closure. The trace recorded416 scans/415 consumers, unavailable0/overflow0; its
last16 consumer ages9..44ms are a rolling window, not a full-run latency maximum.
This diagnostic CHECK cannot serve as a scientific prerequisite. Historical2300ms
cause stays UNKNOWN; old12/40 comparison remains ineligible, old persisted cleanup
UNPROVEN, Task3/full40 INCOMPLETE. At this pre-commit validation checkpoint,
Task15 final audit/green commit remains pending. Later state is in the W progress ledger.


### Task17 approved serial-verification contract (Stage B)

The approved amendment is E17/approved-serial-verification.md, SHA256
`821b448edd2f0d930228333703e48a568be0897edaeafa0785e76b880309cd83`.
E17 is `.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/507bc314-6904-4be0-bbef-f3a33c1e94fe`.
User approval supersedes that immutable proposal's historical pending label.
Root qualified the two semantic RED owners on OLD16: natural1/3.950107750s,
three tamper children passed, environment16 streams and snapshot16 actual OSFDs
failed the expected1 assertions. All583 input pins and actual command closure
were verified. Stage B now sets frozen-input batches (FROZEN_READ_WIDTH) and each
existing file-worker/directory pool (FILE_WORK_WIDTH) to1. Distinct pool instances and
the independent footprint observer may overlap. This is no global semaphore.
The separate completed===16 cooperative yield, full measurements/hash/path-set/
environment checks, first observed error and issued-work joins stay unchanged.
The new independent-pool TEST stays outside the127 functional runtime paths.
Migrated nil/expiry/peer ownership controls are FIXED-only, never OLD16 RED.
Serial work can lengthen setup/integrity or leave host contention unresolved.
Original90s setup/command,30s readiness,5s Native cleanup,1000ms scan-start
freshness,24h comparison and all other proof/resource/science limits remain.
M stays9706840 bytes/SHA b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee.
The same causal TEST/fixture bytes remain frozen across OLD16 and FIXED1.
Root qualified same-byte GREEN5/5, affected whole owners and full89 serial
1077/1077 without skipped/cancelled tests, with exact586 pins and actual command
closure. Source/tests are ready. The same-body old-data control naturally1 in
5.596536167s before any scan: genuine reopen rejected changed current source
bytes in environment-files.mjs. Its root/content and actual owners stayed closed
and unchanged. This establishes no latency repair or completed control.
Hansel approved the binding/order correction in E17/control-binding-approval.json,
exact proposal SHA86efd98290b2a90057c87a74c8d860df35a0a8530a3c86b1f24b777c0b51ef1e.
This acceptance supersedes the proposal's historical pending-approval label.
Scoped implementation/code-to-doc quality is Approved with no Critical/Important
findings. Binding readiness has no findings. The sole Minor evidence issue is
qualified in E17/task-17-validation-qualification.md: the passing optional-observer
fault test emits expected null/undefined warnings. Frozen stdout stays preserved;
the serial suite passed but was not warning-free.
The accepted sequence is final Root diff/input audit, reviewed green feature
commit/publication, then ONE successful CLOSED strict committed CHECK, then the
SAME147-line control with ONLY fresh workspaceRoot/candidate string literals,
then13-case parity,preflight and ONE40-game/20-pair/64-visit comparison. CHECK's
valid graph, actual input equality, physical owner/body/descriptor cleanup and
both passed resource verdicts are required before the control. No strict CHECK
is bypassed, replaced or added as an extra diagnostic run. Root externally rejects
late/missing/failed closure or any scan-start age over original1000ms. All original
caps, identity/contents checks, weights and diagnostic-only control status stay
unchanged. Fresh verifier bytes and sealed records change the dataset; compare
actual path/call counts and timings descriptively, with no paired causal ratio.
At the historical source-commit checkpoint, the rebound control/fresh phases
were UNRUN and commit/publication awaited Root release. Current evaluated
candidate d98db3f is published: strict CHECK passed, rebound control passed,
parity13/13 passed, and strict preflight failed at596.034ms>500ms during baseline's
fourth fresh request, before main final integrity. Task17 repair/control gates
are COMPLETE; Task3/full40 is INCOMPLETE, with no cohort or Elo claim. See the
[current prerequisite-results report](../../docs/experiments/2026-11-11-tinyaz-serial-verification-prerequisites.md) for exact times, pins,
closure distinctions and UNKNOWN underlying delay cause. No latency-cure claim,
retry, new control or comparison follows. Old failures stay preserved/ineligible.

## Approved prospective V3 checkpoint (Task18 Stage A, 2026-11-11)

The [canonical V3 contract](../../docs/superpowers/specs/2026-11-11-tinyaz-preflight-v3-software-design.md)
is approved and IN PROGRESS. Current executable behavior remains V1/V2 at
`67b85fe`, runtime127. The Python selector, public command grammar, original
hard limits, protected model and all old operators/fixtures remain unchanged.

Hansel approved the reviewed V3 contract on 2026-11-11. The exact approval is
`E19/implementation-approval.json`, status
`USER_APPROVED_IMPLEMENTATION_AND_FRESH_COMPARISON`, for proposal SHA256
`ad4b3d8a710c1dc4af24e305a946ed7b4e8a83035efec89e4973f9fad30638a8`.
E19 is `.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5e912df4-8fd0-4b5e-ac68-9e9c625a23a0`.
Historical pending labels are superseded by that exact approval record.


Only `browser_eval/preflight-policy-v3.test.mjs` is newly authored executable
TEST content here. It reads the existing V1 JSON and constructs V3 in memory,
importing only the existing selector and Node builtins. Root alone executes
its pinned OLD recognition RED. It adds one temporary TEST owner to the89
existing owners; it adds no functional runtime input. After qualification,
archive its exact bytes and remove only that temporary leaf before the128
capacity checkpoint. Restore identical bytes with Task20 selection. No tests,
imports, Native, browser/model, phase, commit or publication are claimed here.

## Task18 Stage B: authored capacity split (2026-11-11)

At the historical Task18 source-ready checkpoint, the Split A roster was128, preserving the exact original127
prefix and appending only `train/scripts/browser_eval/resource-quality-schema.mjs`.
The schema/primitive group is moved whole with original V2 validation; public
validator re-exports and the sole ledger factory remain unchanged. No V3 policy,
fixture, scope, graph or operator is activated. The compat leaf replaces the
archived recognition leaf, giving90 current TEST owners. Task19 runtime129 and
Task20 runtime135/TEST96 were approved future work at that checkpoint. The
following dated Task18 gate update records its later covering result. The
Task19 section below records the current source-ready state.

Root qualified the sole OLD recognition RED on unchanged `67b85fe`: natural
exit1 in0.2093892078846693s, intended first doesNotThrow ERR_ASSERTION from
`SCHEMA_LITERAL: policy/version/protocol binding`,582 exact pins and actual
wait/both-pipe/raw/journal closure. This proves missing recognition only.
The exact22-line TEST, SHA256
`ea3bf64a96bd95a839f19c3bac2ffea9fdb36ff1ff947ea2978e9c8a82146765`, is archived
exclusively in E20/recognition-test-original.mjs and removed from the runtime
TEST directory until identical restoration with Task20. E20 is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.

Historical Task18 gate update before commit (2026-11-11): Root's complete covering gate passed100/100,
zero skip/cancel, natural0 in19.657593500s, with587 exact pins and actual
wait/BOTH raw-pipe/journal closure. Scoped Sol Max spec/code-to-document quality
review is Approved with zero Critical/Important/Minor findings. Source remains
the reviewed Split A runtime128/TEST90 with unchanged V1/V2 behavior. Root's
final documentation audit and separate green-commit release remain pending.
Task18 is IN PROGRESS; no commit, publication, V3 activation or phase result
is claimed. Audit: E20/root-task18-covering-audit.json.

## Task19 Split B: context extraction source ready (2026-11-11)

Task18 Split A is green-reviewed and locally committed at
`c1ef53d6e05aa2cdb31aa7bc529e8b8fe2cbd7c5`. Its Root covering gate passed
100/100; those results cover Split A only. Current authored Split B has129
functional inputs: the exact original128 prefix followed only by
`train/scripts/browser_eval/watchdog-operation-context.mjs`. The same90 TEST
owners remain. Root's complete16-owner covering gate passed102/102, zero
fail/skip/cancel, natural exit0 in9.105876124929637s. All595 before/after/current
pins were exact; actual wait, BOTH EOF/raw/pipe and journal closure were
verified, with stderr0. Audit: E20/root-task19-covering-audit.json. Fresh scoped
Sol Max spec and quality reviews are Approved, zero Critical/Important/Minor
findings. Final Root code-to-document audit and separate local green-commit
release remain pending. Task19 stays IN PROGRESS; no commit, publication,
V3 activation or phase result is claimed here.

The new pure leaf owns the whole unchanged
`createWatchdogOperationContext({config,capabilities,state,timing,control})`
group. Its body and comments move byte for byte. The exact grouped references,
frozen return fields, capability identity and error text/code are preserved.
Config retains its named re-export; Operations retains its existing Config
re-export. Config still owns the unchanged whole capture and awaiter groups.
The new leaf imports only the existing protocol-value, lifetime and actual-IO
helpers; its local pure error factory preserves the original Config prefix.
There is no Config back-import or added authority. Private V3 scope forwarding
waits for the later real implementation.

Compat now asserts129 with the exact schema/context suffix, retaining every
original prefix/hash/membership/existence/uniqueness/frozen/import/exclusion
check. Private-FS asserts129 and scans the full current runtime closure. No
TEST leaf, fixture, policy, operator, Python, model, science or limit changes.
Task20's135 runtime/96 TEST transition remains prospective. Original failed
evidence and the archived recognition TEST remain unchanged and ineligible.

Root alone runs the complete affected watchdog/config/operations/lifecycle,
terminal, compat and private-FS owners. The implementer has performed static
reads, edits, byte comparisons and Git inspection only. Source-ready evidence
is E20/task-19-source-ready-report.md and E20/task-19-source-ready-pins.json;
E20 is the existing `5415eb97-ed40-4c92-8633-01764e186014` evidence directory.
The experiment index and existing ledger remain the current status owners.

## Task20 connected V3 implementation checkpoint (2026-11-11)

The approved V3 implementation is authored on `feat/tinyaz-browser-harness`
from committed Split B `32ede424e787b40ccfd9f887880c6b2d9125d797`.
Root alone runs gates and commissions independent review. The implementer has
performed source edits, static reads, hashes, Python AST parsing and Git
inspection only. No project import, test, Native operation, browser, model,
phase, commit or publication was executed by the implementer. Test results
remain UNRUN at this checkpoint. Historical results above retain their dated
scope. No new scientific or runtime phase result is claimed.

Current functional membership is135, preserving the exact original127 prefix.
Its ordered suffix is resource-quality-schema.mjs, watchdog-operation-context.mjs,
train/fixtures/browser-protocol-v3.json, preflight-readiness-v3.mjs,
preflight-evidence-v3.mjs, verdicts-v3.mjs, record-finalization-v3.mjs and
process-preflight-quality.mjs. All mjs names use train/scripts/browser_eval/.
The exact96 TEST owners include seven V3 leaves. The restored policy leaf is
byte-identical to the qualified recognition-only OLD RED. Timing, graph and
Native controls are FIXED contrasts and prospective implementation validation.

V3 is selected only by the exact browser-protocol-v3.json path, layout2 and
`{policyId:"tinyaz-separate-verdicts-v3",recordSchemaVersion:2,softPhases:["preflight","compare"]}`.
V1/V2 fixtures, V2 policy literal, old W sources, model/metadata, all hard limits
and statistics remain unchanged. V3 final/completion add only the derived
scientificReadinessVerdict. The complete graph independently reconstructs it.
Ready preflight with allowed completed periodic quality loss keeps failed
local/closure resource grades and aggregate inconclusive/2. Only V3 compare
admits that exact verified parent; finalizer-gone probes remain mandatory.
A full40 scientific comparison can remain eligible while retaining the actual
failed preflight resource grade and PREREQUISITE_RESOURCE_FAILURE. This never
certifies continuous RSS coverage, a latency cure or Elo.

The approved functional contract remains the canonical V3 software design.
The current API, test map, immutable-byte checks, roster/import closure,
code-to-document comparison and Root gate commands are recorded in
`task-20-source-ready-report.md` and `task-20-source-ready-pins.json` under
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.


Task20 reviewed original-context repair is authored. Event and genuine prepared
reads retain the caller's original budget association at every positive effect
boundary. Scope admission also retains original IO and handle through its
genuine graph/probe awaits. Required real close and failure containment remain
ungated cleanup. Exact runtime135/TEST96 and science/numeric limits remain.
The real Python CLI V3 selector and schema2 non-null policy boundaries match
their documented contracts. Worker tests are UNRUN; Root causal GREEN/full
verification and independent release review remain pending.


## Task20 implementation and required tests validated (2026-11-11)

Current implementation and required test gates are validated on the frozen
Task20 source. Root's gate08 serial96 run passed1139/1139, with zero failures,
skips or cancellations, natural exit0 in207.788426958 seconds. Isolated legacy
Native passed1/1; Python Native58/58, wire19/19 and terminal8/8; app scripts
191/191 and core184/184; `tsc --noEmit` exited0. Every owner retained652 exact
before/after/current pins, actual process/BOTH raw pipe/journal closure and no
intervention. Earlier causal55/new-seven63 are passing subsets, not additional
counts. Prior failed runs and the external intervention remain immutable history.
The full suite's two TinyazBookkeepingObserverWarning messages are deliberate
null/undefined observer fault controls. They are expected and were not suppressed.

Current changed inputs78 preserve functional runtime135, exact96 TEST leaves,
protected23/model weights, old protocol data/operators and the original
scientific/numeric contracts. The tested runtime/SOURCE/TEST bytes are frozen.
Original-context, per-effect prepared/event guards, actual CLI selection and
closed schema2 policy fixes match the affected contracts. Implementation and
tests validated does not establish a scientific phase result.

Fresh scoped Sol Max review, Root acceptance, commit/publication and Task21
remain pending. ALL V3 scientific CHECK/control/parity/preflight/full40 phases
remain UNRUN. No phase GO, timing cure, continuous RSS proof or Elo claim follows.
Root's authoritative gate audits/raw receipts are under E20/task20-gates-08/,
with `root-task20-gates-08-<label>-audit.json` and
`root-task20-remaining-test-gates-summary.json` in E20. E20 is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.
The final code-to-document comparison and docs-only pins/delta accompany
`E20/task20-green-docs-ready-report.md`. Earlier appended checkpoints retain
their dated scope; this is the current implementation/test status.


## Task20 reviewed and tested source ready for Root green commit (2026-11-11)

Root gate10 full96 passed1140/1140, natural exit0 in207.116713958 seconds,
with zero failures, skips, cancellations or intervention. The identical
handoff regression passed6/6 with zero collector/post-expiry effects in both
settled scenarios. Python58/19/8, scripts191, core184 and `tsc --noEmit` passed.
Recorded owners retained662 exact execution pins and complete actual process,
BOTH raw pipe and journal closure. Two deliberate null/undefined observer
warnings remain qualified and unsuppressed. Subsets are not added to totals;
prior1139/1139 and every failed run remain their dated immutable history.

Fresh scoped Sol Max re-review passed and closed the last original-handle
residual; all four production findings are addressed. The reviewed/tested
source is READY for Root's green commit/publication action. Runtime135/TEST96,
changed inputs78, protected23, original limits and proof ownership remain.
Scientific execution is separately gated. ALL V3 scientific CHECK/control/
parity/preflight/full40 phases remain UNRUN at this checkpoint, without phase
GO, timing cure or Elo claim. This status does not record a commit/publication.
Evidence: E20/task20-handoff-fix-rereview.md, Root gate10 audits/receipts and
E20/root-task20-handoff-all-required-checks-summary.json. Final docs-only
comparison/pins/delta: E20/task20-final-commit-docs-ready-report.md.
