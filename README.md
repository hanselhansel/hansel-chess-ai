# Hansel Chess AI (tinyaz)

From-scratch AlphaZero-style chess you can **play in the browser** and watch think.

Project claim:

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

## Recorded model results

These results are retained from revision `bb76439` (2026-09-09). The revision date is not a measurement date. No live ratings or new gauntlets were checked during this documentation pass.

The recorded **Phase 2, rated** checkpoint is **tinyaz-m** (8×128, 2.43M params), continued on Lichess 2013-01..2015-02 (7.8M). tinyaz-s stays on disk as the recorded 1370 net.

- **1-visit vs random-move: 19–1–0** (passed; not an Elo)
- **64-visit vs Stockfish 18: 8–0 vs `UCI_Elo` 1320, 8–0 vs 1500, 5–1–2 vs 1800, 4–2–2 vs 2000, 2–1–5 vs 2200, 0–8 vs 2500.** 48-game MLE **2035** (1895–2175). KEEP+GATE vs SF2000 on 8 games. 2500 is 0–8. Not 2500. Eight-game rungs are noisy.
- **Lichess blitz, 64 visits, vs other BOT accounts: 1531** over **108** games (RD 45). BOT **[hanselhansel](https://lichess.org/@/hanselhansel)**. Not a human pool. Not the Stockfish 2035 number.

1-visit, 64-visit Stockfish, and Lichess blitz stay separate.

## Verified browser checkpoint

The [approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md), First experiment item 6, requires the browser and card to use published `tinyaz-m`. Trained mode now loads only `/weights/tinyaz-m.bin` through a strict verifier: format, exact byte length, architecture, source, finite tensors, and the SHA256 digest are all checked before a usable session exists, and the worker independently re-verifies the transferred bytes. There is no random-weight fallback in trained play; `random-demo` mode is an explicit untrained seed-2026 S demonstration. The recorded M results above still do not establish the strength of this browser path; native browser execution remains a separate check.

`SELECTED_CHECKPOINT` is a local pin. The legacy train/promotion publishers may still write public weights, metadata, and frontend constants, but they do not maintain this new digest/length/source/input identity: a future public replacement requires a coordinated reviewed selection-description and input-identity update with fresh verification, and a mismatch must fail visibly. [src/lib/chess/weights.ts:loadPlayWeightsTimed] [src/lib/chess/checkpoint.ts:verifyCheckpointBytes] [src/lib/chess/think-client.ts:createThinker] [src/workers/think.worker.ts:createWorkerHandler] [src/lib/chess/constants.ts:SELECTED_CHECKPOINT] [src/components/chess/workbench.tsx:Workbench] [train/src/tinyaz/engine_uci.py:default_weights]

## UCI

```
train/scripts/hansel-chess-ai
train/scripts/hansel-chess-ai --weights public/weights/tinyaz-m.bin --visits 64 --device cpu
```

Speaks UCI. Default 64 visits, weights `public/weights/tinyaz-m.bin`. Flags: `--weights`, `--visits` (clamped to 1–4096), and `--device` (CPU default; the parser accepts a device string). UCI options expose `Weights` and `Visits`. Cute Chess and lichess-bot use this wrapper. Setup: [train/lichess-bot/README.md](./train/lichess-bot/README.md). Training: [train/README.md](./train/README.md).

## Play

Open the app. You are White.

1. Click a piece, then a highlighted square.
2. The thinker verifies the pinned M checkpoint, then tries a Web Worker, with a main-thread asynchronous backend as the one controlled recovery.
3. Toggle **1 visit** (naked net) vs **64 visits** (the published number).
4. Read the tree: SAN, visits `n`, prior `P`, value `Q`.
5. Read 1-visit and 64-visit results as separate claims. The card reports the verified model identity for the active session; stored evaluation rows stay labeled historical records.

Play Black if you want the model to move first.

## What a visit is

One look-ahead trip from the current position: pick a line, evaluate one new leaf with the net, write it back up the tree.

| Mode          | Visits | Meaning                                                            |
| ------------- | ------ | ------------------------------------------------------------------ |
| 1-visit       | 1      | Naked net. Policy argmax. Small-model `climb.py` snapshot gate.    |
| Play / rate   | 64     | Published play/rating budget. Medium-model snapshot gate.          |
| Train targets | 256    | Default in both climb entrypoints; `CLIMB_VISITS` can override it. |

Legacy Phase 2 and human-month self-play generate at 64 visits. The [training contract](./train/README.md) records the per-entrypoint budgets. Training targets do not establish a published Elo. [train/scripts/climb.py:main] [train/scripts/climb_m.py:main] [train/scripts/climb_m.py:one_loop] [train/scripts/human_month.py:selfplay_loop] [train/scripts/phase2.py:VISITS]

## Architecture (tinyaz-s)

The published medium checkpoint is **tinyaz-m** (8×128, 2.43M). s is the same stem at 64 channels (~0.64M), still on disk. The earlier browser S-loader discrepancy is resolved at source level, recorded above.

19-plane side-to-move-canonical board → stem 3×3 → 8 residual blocks × 64 channels (~0.64M params) → 73-plane AlphaZero policy + tanh value. PUCT `c_puct = 1.5`. Rank-flip is `i ^ 56` (files stay put).

`chess.js` owns the rules. We do not fork chesslite or Lc0.

## What is later

See [docs/LATER.md](./docs/LATER.md) and [the tinyaz-m ladder spec](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md). The recorded published net is m. GATE vs SF2000. SF2500 is 0–8. Self-play of the GATE net is later. Not 2500.

## Local browser verification commands

The browser harness now has explicit `test:chess-browser`,
`eval:browser:preflight` and `eval:browser` command aliases. The Python
parity entry is `train/scripts/check_browser_parity.py`. Each command runs
one phase through an immutable archived CLI. It never starts the next phase.
See [browser harness usage](train/scripts/browser_eval/README.md#operational-command-usage)
for arguments, workspace retention, prerequisite admission and fixed limits.
Development check/parity accept `WORKTREE`; preflight/comparison require a
committed candidate and verified parents in the same workspace. Source and
scripted tests do not establish actual browser/parity or comparison results.

## Develop

```
npm test          # test:scripts (scripts/**/*.test.mjs) then test:core (src/**/*.test.ts)
npm run typecheck
npm run dev
```

Training and UCI tests: [train/README.md](./train/README.md). Releases: [CHANGELOG.md](./CHANGELOG.md).

## System Overview

The repository contains two chess execution paths: TypeScript inference/search for the browser and Python inference/search behind a UCI process. Python data and training commands produce packed checkpoints. Rating and promotion remain separate entrypoints. The external `lichess-bot` runtime consumes UCI; the local challenge rotator submits challenges and records games. [src/lib/chess/net.ts:forward] [src/lib/chess/think-client.ts:createThinker] [train/src/tinyaz/engine_uci.py:TinyazUci] [train/src/tinyaz/train_loop.py:train_candidate] [train/src/tinyaz/promote.py:maybe_promote] [train/lichess-bot/challenge_rotator.py:main]

The web application also contains preview, authentication, connector, database, PWA, and WebRTC libraries. Their contracts describe their actual boundaries; helper functions or client URLs do not establish that an application route or remote service is available. [src/router.tsx:getRouter] [src/lib/auth/popup.server.ts:handleAuthPopupRequest] [src/lib/app-data/client.server.ts:callTool] [src/lib/db.ts:getSql] [src/lib/multiplayer/p2p.ts:P2PRoom]

## Subdirectories & System Boundaries

- [src](./src/README.md): browser router, chess workbench, inference worker, and service libraries. [src/router.tsx:getRouter] [src/components/chess/workbench.tsx:Workbench] [src/workers/think.worker.ts:createWorkerHandler]
- [train](./train/README.md): Python model, training/data/rating/promotion, UCI, and bot integration. [train/src/tinyaz/model.py:TinyAZ] [train/src/tinyaz/promote.py:maybe_promote] [train/src/tinyaz/engine_uci.py:TinyazUci]
- [scripts](./scripts/README.md): environment wrapping, PWA/build integration, browser captures, preview lifecycle, migrations, and sign-out helpers. [scripts/with-app-env.mjs:main] [scripts/grok-pwa-plugin.mjs:grokPwaPlugin] [scripts/migrate.mjs:main]
- [server](./server/README.md): deployed PWA middleware and the virtual OG identity declaration. [server/middleware/grok-pwa.ts:grokPwaMiddleware] [server/virtual-grok-og-identity.d.ts:grokOgIdentity]
- [migrations](./migrations/README.md): SQL input boundary and opt-in authentication schema. [scripts/migration-plan.mjs:pendingMigrations] [migrations/auth/0001_auth.sql:"user"]

Non-code documentation, weight assets, ignored dependencies/data, and test-only directories have no generated directory contracts. Existing roadmap, design, and release links above remain available.

## Local Interface & Invariants

### Interface

- The Vite default config supplies server/preview addresses, plugin ordering, and conditional Nitro deployment. Its database-bootstrap and auth-popup helpers are private configuration hooks. [vite.config.ts:defineConfig] [vite.config.ts:pgliteBootstrapPlugin] [vite.config.ts:authPopupPlugin]
- Package scripts expose development, build, preview, migration, test, type, lint, and formatting commands. ESLint exports a flat config; TypeScript checks `src` and `server` with no emit. [package.json:scripts] [eslint.config.mjs:tseslint.config] [tsconfig.json:include] [tsconfig.json:compilerOptions.noEmit]
- `startup.sh` launches the cloud workspace's development workflow from `/workspace`. [startup.sh:cd /workspace] [startup.sh:npm run dev]

### Invariants

- Development binds `0.0.0.0:8080`; preview binds `127.0.0.1:8081`. Both use strict ports. Nitro is included for build/preview with the Vercel preset and `serverDir: "./server"`. [vite.config.ts:server] [vite.config.ts:preview] [vite.config.ts:plugins]
- Development DB bootstrap skips when no direct SQL entry is present, otherwise awaits `ensureDbReady`. The serve-only `/auth/popup` middleware runs before TanStack Start and rejects non-GET requests with 405. [vite.config.ts:hasGlobbedMigrations] [vite.config.ts:pgliteBootstrapPlugin] [vite.config.ts:authPopupPlugin]
- `npm run build` invokes `db:migrate` after successful compilation. `build:dev` does not include that command. [package.json:scripts.build] [package.json:scripts.build:dev]

### Side Effects

- Startup invokes preview shutdown, probes port 8080, and can background the dev process with output appended to `/tmp/app-startup.log`. [startup.sh:node scripts/preview.mjs stop] [startup.sh:curl] [startup.sh:npm run dev]
- Vite hooks install middleware, initialize the selected database when required, and forward OAuth response bodies, headers, and cookies. These operations call implementations owned by child packages. [vite.config.ts:pgliteBootstrapPlugin] [vite.config.ts:authPopupPlugin] [src/lib/db.ts:ensureDbReady] [src/lib/auth/popup.server.ts:handleAuthPopupRequest]

## Global Invariants

- Board/policy contracts use 19 side-to-move input planes, 73 policy planes, and rank flip `i ^ 56`. Packed loaders recognize `TAZS` version 1 and the S/M parameter counts. This is a structural interface contract, not a numerical-parity test. [src/lib/chess/encode.ts:encodeBoard] [src/lib/chess/policy.ts:legalLogits] [src/lib/chess/weights.ts:unpackWeights] [train/src/tinyaz/encode.py:encode_board] [train/src/tinyaz/pack.py:load_model]
- Visit budgets and promotion gates belong to each entrypoint. Small climb uses a 1-visit snapshot gate; medium climb and human-month paths use 64. `maybe_promote(False, ...)` performs no public writes. Successful publication replaces each artifact separately. [train/scripts/climb.py:main] [train/scripts/climb_m.py:one_loop] [train/scripts/human_month.py:selfplay_loop] [train/src/tinyaz/promote.py:maybe_promote]
- Migration discovery is nonrecursive and keyed by basename. Nested auth SQL is opt-in. PGlite applies eligible top-level files; configured PostgreSQL migrations run through the deploy script. [scripts/migration-plan.mjs:pendingMigrations] [scripts/migrate.mjs:main] [src/lib/db.ts:createPgliteSql] [src/lib/db.ts:createNeonSql]
- The approved design keeps the under-3M goal and distinct measurement budgets. It requires promoted M in the browser; the earlier S-loader mismatch is resolved at source level through verified pinned loading, while native browser proof remains open. [docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md:Claim (unchanged)] [docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md:First experiment (this spec’s ship)]

## Global Side Effects

- Browser execution fetches weights/metadata, creates workers, runs CPU search, updates game state, and exchanges messages. Preview, connector, auth, and WebRTC libraries can perform their documented browser/network operations when invoked. [src/components/chess/workbench.tsx:Workbench] [src/lib/chess/think-client.ts:createThinker] [src/lib/app-data/client.server.ts:callTool] [src/lib/auth/client.ts:signIn] [src/lib/multiplayer/p2p.ts:P2PRoom]
- Database setup/query paths allocate PGlite or PostgreSQL resources and can execute SQL. Deployment migration execution creates bookkeeping and applies pending SQL transactionally per file. [src/lib/db.ts:createPgliteSql] [src/lib/db.ts:createNeonSql] [scripts/migrate.mjs:main]
- PWA integrations read identity/assets and transform HTTP streams. Capture commands separately launch Chromium and write screenshots/verdicts. Preview control can signal port-8081 owners and manage PID/log files. [scripts/grok-pwa-shared.mjs:snapshotOgIdentity] [server/middleware/grok-pwa.ts:injectHeadStreaming] [scripts/browser-smoke.mjs:browser] [scripts/preview.mjs:stop] [scripts/preview.mjs:restart]
- Training commands read archives/replay, update parameters, and write checkpoints. Promotion can replace public weights and frontend/public metadata. Fresh M training can also rewrite frontend constants. [train/src/tinyaz/data.py:write_human_months] [train/src/tinyaz/train_loop.py:train_candidate] [train/src/tinyaz/promote.py:maybe_promote] [train/scripts/train_m.py:point_js_at_m]
- Operational commands can download archives/binaries, launch Stockfish, submit rated bot challenges, and write state/WDL/PGNs. They are separate from documentation verification. [train/scripts/climb_until.py:ensure_month] [train/scripts/fetch_stockfish.sh:curl] [train/src/tinyaz/uci.py:Stockfish] [train/lichess-bot/challenge_rotator.py:challenge] [train/lichess-bot/challenge_rotator.py:sync_games]

## System Verification

From the repository root:

```sh
npm test
npm run typecheck
```

`npm test` is `npm run test:scripts && npm run test:core`: `node --test 'scripts/**/*.test.mjs'` first, then `node --experimental-strip-types --test 'src/**/*.test.ts'`, which discovers the three existing TypeScript suites and any later core test. `npm run check:auth` is an HTTP probe against an already running dev server; an unobservable server is indeterminate. Python commands and dependencies are documented in [train](./train/README.md). [package.json:scripts.test] [package.json:scripts.test:scripts] [package.json:scripts.test:core] [package.json:scripts.typecheck] [scripts/check-auth-invariant.mjs:probeDevAuthEnabled] [scripts/check-auth-invariant.mjs:main]

`npm run test:template-authoring` is a separate upstream contract, not part of `npm test`. It runs `scripts/template-authoring/contract.mjs` against the real authoring documents (`AGENTS.md`, `.grok/skills/og/SKILL.md`, `.grok/skills/og/references/`) of an external template checkout named by a nonempty `GROK_TEMPLATE_ROOT`, using this checkout's own marker constants and argument/staging parsers. This app does not ship those documents; a missing, unreadable or incomplete `GROK_TEMPLATE_ROOT` fails the command nonzero and is an unavailable external check, never a pass. [package.json:scripts.test:template-authoring] [scripts/template-authoring/README.md] [scripts/template-authoring/contract.mjs]

Bootstrap checks on 2026-11-01, based on revision `bb76439`:

- Type checking passed. All 39 core TypeScript tests passed when run separately.
- All 13 mocked rotator and 14 dataset-split checks passed. The split checks used Python 3.11 with its installed dependencies.
- The configured `npm test` script stage had 179 passes and 16 pre-existing failures involving absent Grok template support files, app-env assumptions, and branding fixtures. It stopped before its TypeScript stage.
- PyTorch-dependent checks were not run because PyTorch is absent from the checked interpreters. No dependencies were installed for bootstrap.

These are dated verification observations. They do not establish deployment health, live bot activity, or current playing strength.

## Contract maintenance

Update affected README contracts and usage/API/configuration docs with each meaningful code change. Compare the final diff against actual behavior, interfaces, invariants, side effects, paths, and commands. Carry that comparison into implementation plans and handoffs. Preserve approved requirements and record unresolved drift until the code is fixed or a design change is approved.

The accepted [final integrity ordering amendment](docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#accepted-final-integrity-ordering-amendment-2026-11-06)
places the fresh complete supervisor scan after experimental work and SDK close,
before normal finish, under the existing original command/work end. Capture A
consumes that privately bound same-run observation. Stop and Native cleanup
remain immediate and retain their original five-second limit. Internal watchdog
selftests perform their own scan after their durable manifest and before
synthetic-driver admission under the original paused parent command bound.

Planned supervisor STOP cancellation now retains IPC through the driver's
real SDK/actual-body close and CLOSED handshake. Only the session's exact
validated stop cause takes that path. Genuine callback errors and nonzero
driver exits remain faults. The historical post-cap protected-Node reference
remains unidentified; bounded full-CLI/Native/compare controls naturally
closed but do not identify or repair that historical reference.
The archived CLI now reports bounded public active-resource type counts
after the supervisor returns, without adding timers or changing its result.

The newly authorized second comparison uses a finite 24-hour ceiling
(86,400,000 ms) for the locked 40 games/20 pairs. Readiness 30s, command 90s,
Native cleanup 5s, RSS 4GiB and output 256MiB remain unchanged. Its bounded
`TINYAZ_COMPARE_PROGRESS` stderr lines report acknowledged completed-game/pair
counts only. They have no result or proof authority. The original one-hour
cohort stays inconclusive; see the [accepted budget amendment](docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#accepted-second-cohort-budget-and-progress-amendment-2026-11-06)
and [progress format](train/scripts/browser_eval/README.md#authorized-second-comparison-budget-and-progress-2026-11-06).

The 24-hour candidate `17d2ff8` naturally exited 2 at 6/40 complete games
and 3/20 pairs. Its permission fault, three sealed faults and invalid Native
cleanup/accounting remain inconclusive. The source repair preserves Native
first-cause priority across valid pre-STOP heartbeats and permits one complete
readable-census revalidation after a first BSD permission failure. Persistent
denials, all owned tuple/RSS requirements and the original timing guards
remain fatal. A fresh full cohort requires reviewed committed source, fresh
check/parity/preflight and a separate controller execution release.


The historical `6ff0128` attempt reached 30/40 acknowledged games and 15/20 pairs,
then hung in shutdown and required supervisor TERM. Final/completion records
are absent, so it is incomplete and intervention-qualified, with no eligible
analysis. The underlying async filesystem/runtime cause remains UNKNOWN.
Official isolated Node 24.22.2 LTS passed controlled runtime qualification,
including the 719-case harness and actual Native joins. This is an environment
workaround, not a demonstrated causal fix. See the [runtime procedure](train/scripts/browser_eval/README.md#isolated-node-runtime-qualification-2026-11-07)
and [preserved attempt](docs/experiments/tinyaz-software-plan.md#incomplete-6ff0128-attempt-and-runtime-qualification-2026-11-07).
Fresh runtime-bound preparation/check/parity/preflight and a separate controller
release remain required before one fresh full cohort.

Current published candidate `fc307657d8c33af9c6e226087610a454ec6bbfcf` passed
fresh CHECK/PARITY/PREFLIGHT. Its full 40-game comparison failed at 6 acknowledged
games / 3 pairs and remains ineligible, with Native cleanup unproven. M weights
are unchanged. See the [current factual checkpoint](docs/experiments/tinyaz-software-plan.md#fresh-repaired-candidate-comparison-2026-11-09).
The next direction awaits the user; a valid full 40-game result and whole-change
final review remain pending.


## Accepted separate-verdicts direction (2026-11-10)

Hansel approved the reviewed `tinyaz-separate-verdicts-v2` amendment and Sol High implementation. The [accepted canonical contract](docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#accepted-separate-verdicts-v2-contract-2026-11-10) and [Tasks 4-14](docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md#task-4-accepted-contract-and-before-use-declarations) declare the prospective work. V2 implementation and runtime validation remain pending; current operational code remains strict v1. The fc30765 attempt remains incomplete at 6/40 acknowledged games and 3/20 pairs, with no eligible analysis and unproven Native cleanup/accounting. All earlier failed cohorts remain ineligible. M weights remain unchanged. No fresh strength or Elo result is claimed. Fresh scoped reviews, whole-change review, Root runtime/candidate/policy releases, strict prerequisites and one separately released fresh full40 remain required.

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

Owning contract: [exact v2 root grammar and diagnostics](train/scripts/browser_eval/README.md#task10-r1-exact-root-grammar-and-diagnostic-disclosure-2026-11-10).

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

Task12 repair preparation (2026-11-10): one combined review fix wave is mapped in
[the owning contract](train/scripts/browser_eval/README.md#task12-single-repair-wave-before-use-map-2026-11-10).
Production remains OLD. New causal tests and inert FIXED profiles have no runtime
or phase result yet. W/v2-task-12-report.md records the staged evidence gates.

Task12 same-wave preparation continues after the first Root-run OLD diagnostic.
Failed e84f8a9e evidence stays immutable; corrected TEST/v2 selection package
requires new exact Root GO. W/v2-task-12-report.md records the causal diagnosis.

Task12 retains the qualified49-case OLD control. A bounded W-only nested-error
diagnostic is source-prepared for a fresh exact Root gate; I5 attribution remains
unproven. W/v2-task-12-report.md preserves the actual receipts and qualifications.

Task12 current status (2026-11-10): six Important and three Minor groups are
implemented and locally validated. Causal49/49, related410/410 and Native1059/1059
closed with Root audits. The controlled cap remains aggregate/resource
INCONCLUSIVE. [Owning status and limits](train/scripts/browser_eval/README.md#task12-fixed-implementation-and-local-validation-2026-11-10).
Scoped independent re-review is pending; Task12 and phase/full40 release stay open.

Task14 failed-attempt handoff (2026-11-10): Task12 passed its scoped review and
candidate4709b15 was feature-published. Fresh strict parents passed0 with BOTH
resource verdicts passed/gaps0. The ONE full40 failed at descriptive12/40 games,
6/20 pairs: Store scan-start age2300>1000ms, then Recorder sticky. No authoritative
comparison graph, eligibility or verified persisted cleanup exists. Five quiet
post-failure scans did not reproduce the delay; cause remains UNKNOWN.
[Evidence and limits](train/scripts/browser_eval/README.md#task14-failed-comparison-handoff-and-idle-control-2026-11-10).
Task14 documents the failed handoff. Task3/full40 remains INCOMPLETE; no automatic retry.
