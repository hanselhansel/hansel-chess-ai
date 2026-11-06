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
