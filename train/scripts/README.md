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
