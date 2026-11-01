The Detailed Implementation Plan does not yet meet the implementation-readiness standard. Six Major findings and one Nit remain.

All target references below are to `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md`.

**S9-IR-001**

- **Severity:** Major
- **Affected scope:** Lines 587 and 712–725, Python environment and required verification commands.
- **Finding & guidance:** The commands select the project Python interpreter only for the parent test process. `train/scripts/test_engine_uci.py:171–178` launches the extensionless UCI wrapper without an environment override. That wrapper executes `python3` from inherited `PATH`, not `sys.executable`. `tinyaz_uci.py` imports the Torch-dependent engine before parsing `--help`. Consequently, following the documented commands can test a different interpreter or fail on missing Torch despite a correctly installed `train/.venv`. Specify activation or an absolute venv `PATH` prefix covering child processes, or prescribe a controlled subprocess environment in the already mapped UCI test. Preserve the production wrapper and record both interpreter identities.

**S9-IR-002**

- **Severity:** Major
- **Affected scope:** Lines 589, 594 and 721, required climb-loop verification versus the prohibition on generation.
- **Finding & guidance:** The assertion that existing climb tests use controlled mocks is inaccurate. `train/scripts/test_climb_loop.py:121–127` runs eight actual S-checkpoint snapshot games. Lines 190–206 call the real `generate(..., games=1, visits=1, workers=1)` and write self-play targets. `tinyaz/generate.py` loads the checkpoint and plays up to 160 plies with root noise. These calls are included in the script’s required `main()` test list. The implementer must choose between running the prescribed command and obeying the stated no-generation instruction. Resolve this explicitly: authorize these existing finite verification workloads with their limits and accounting, or prescribe controlled replacements and add the necessary test-file change to the map. Retain the legality and public-write protections.

**S9-IR-003**

- **Severity:** Major
- **Affected scope:** Lines 466–481 and 535–575, new thinker/search/protocol contracts.
- **Finding & guidance:** The “exact runtime contracts” remain sketches where incompatible C3 consumers need concrete declarations. For example, the six “Protocol v1 messages” contain no version field or versioned envelope, although unsupported-version validation is required. The terminal outcome’s `reason` values are undefined. The relationship between `SearchOutcome`, the response’s `result`, and the move/terminal discriminator is not fully declared. Handling an unrecognizable active reply is also left between immediate failure and discard until timeout; line 571 only excludes availability recovery. These are wire-format and failure-policy choices. Supply the actual discriminated message/result types, version location, terminal-reason union, state/subscription signatures and malformed-message disposition before dispatching C3. Apply those declarations consistently to worker, client, hook, displays and tests.

**S9-IR-004**

- **Severity:** Major
- **Affected scope:** Lines 488, 495, 626–630 and 741, frozen candidate inputs for numeric parity.
- **Finding & guidance:** The immutable source snapshots explicitly contain only `src`, `package.json` and `package-lock.json`. The parity phase then launches Python reference mode, which must import `train/src/tinyaz` sources. Those sources are outside the specified snapshots, and the plan does not define an immutable reference-source location or how the child imports the candidate’s versions. Verifying that active harness files match Git does not resolve where Python model, encoding, policy and pack code execute. Specify a frozen Python reference-input set, its candidate-object checks and child import path. Reconcile that with “archive only” and the allowed file map. Add a check rejecting a dirty or mismatched Python reference while the JavaScript snapshot and launcher remain clean.

**S9-IR-005**

- **Severity:** Major
- **Affected scope:** Lines 489, 494, 503, 638–640, 727 and 741, persisted records and prerequisite acceptance.
- **Finding & guidance:** The plan names schema version 1 and lists record contents, but leaves the cross-phase acceptance protocol undefined. “Parent prerequisite hashes” does not identify whether a link hashes a manifest, successful final record, events, or an evidence bundle. A manifest is written before model requests and therefore cannot itself establish that checks passed. The implementer must design which final statuses and identity fields permit preflight or comparison, including how the expected failed watchdog self-test differs from a failed parent phase. Define the concrete prerequisite record schema, hashed artifacts, serialization/hash convention and acceptance rules. Require tests for a valid manifest with failed or missing completion evidence, altered final evidence, identity mismatch and abandoned workspaces.

**S9-IR-006**

- **Severity:** Major
- **Affected scope:** Lines 493–504 and 634–640, external watchdog and process ownership.
- **Finding & guidance:** The watchdog requirements leave its operating-system and interprocess boundary to the implementer. The target requires macOS process ancestry, RSS, PID start identities, listening-port proof, heartbeats and bounded cleanup, but selects no collection mechanism or supervisor/driver lifecycle protocol. The existing preview helper is Linux-specific: it reads `/proc` for process groups, command lines and socket ownership. It cannot provide the selected Mac’s accounting. Specify the macOS collection backend, required tool availability, descendant/reparenting ownership rules, supervisor/driver messages, heartbeat interval and failure threshold, and who enforces command deadlines when the driver stalls. Include focused blocked-driver, surviving-child, PID-reuse and unavailable-accounting cases before the actual browser packet depends on this boundary.

**S9-IR-007**

- **Severity:** Nit
- **Affected scope:** Lines 496, 499 and 630, standalone Workbench fixture configuration.
- **Finding & guidance:** The fixture must mount the actual Workbench “with its styles,” but the explicit standalone configuration names only the React transform. `src/styles.css` uses Tailwind’s `@import` and `@theme`; production enables `@tailwindcss/vite`. Workbench itself does not import the stylesheet because the application root normally supplies it. Name the stylesheet import and installed Tailwind transform in the fixture instructions, including its snapshot scan root. Verify a computed board-layout property so an unprocessed stylesheet cannot pass unnoticed.

Read evidence follows.

**Required review inputs**

- Fully read `/Users/hansel/.codex/plugins/cache/egm/egm/0.1.0/agents/implementation_readiness.md`, lines 1–62. SHA256 `1f6aa61cfe7cb86dc94943ab3b3fd339e5baba533937198fd10edb06dfa64e8f`.
- Fully read `/Users/hansel/.codex/plugins/cache/egm/egm/0.1.0/resources/document_standards/implementation-readiness-standard.md`, lines 1–34. SHA256 `ed0d2a085eac0fd9581d504a2ec0df2a92d6b2538636a22b16e0b1370fba6dbb`.
- Fully read the target, lines 1–794. Used short chunks throughout lines 441–528. Before and after review, SHA256 remained `c708f35e3c6e0ce4eda679d7a68820c6232e2cdb56b17a3b98e7919b7d5cfd80`, line count remained 794, and `## Detailed Implementation Plan` remained at line 404.
- Fully read `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/plans/2026-11-02-tinyaz-devin-orchestration.md`, lines 1–97, as execution-context data. Its initial and final SHA256 matched `3781cadb94906fa030f5283e812475e835caac29b7fc7cfc01b468a84fa4aff4`. No operational links were followed.

**Repository contracts fully read**

Repository root for the following exact relative paths: `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai`.

- `README.md`, 1–152.
- `src/README.md`, 1–79.
- `src/lib/README.md`, 1–108.
- `src/lib/chess/README.md`, 1–116.
- `src/workers/README.md`, 1–55.
- `src/components/README.md`, 1–47.
- `src/components/chess/README.md`, 1–78.
- `src/routes/README.md`, 1–44.
- `src/lib/app-data/README.md`, 1–81.
- `src/lib/auth/README.md`, 1–132.
- `scripts/README.md`, 1–69.
- `train/README.md`, 1–110.
- `train/scripts/README.md`, 1–66.
- `train/src/README.md`, 1–46.
- `train/src/tinyaz/README.md`, 1–69.
- `migrations/README.md`, 1–34.
- `migrations/auth/README.md`, 1–100.

**Sources and tests fully read**

- `src/lib/chess/constants.ts`, 1–80; `weights.ts`, 1–230; `encode.ts`, 1–68; `policy.ts`, 1–94; `net.ts`, 1–105.
- `src/lib/chess/mcts.ts`, 1–200; `think-client.ts`, 1–182; `gauntlet.ts`, 1–141; `chess.test.ts`, 1–148.
- `src/workers/think.worker.ts`, 1–43.
- `src/components/chess/workbench.tsx`, 1–335; `card-panel.tsx`, 1–155; `think-panel.tsx`, 1–106; `board.tsx`, 1–112.
- `src/routes/__root.tsx`, 1–47; `src/styles.css`, 1–55.
- `package.json`, 1–99; `tsconfig.json`, 1–37; `.gitignore`, 1–45; `train/pyproject.toml`, 1–16.
- `scripts/brand-check.test.mjs`, 1–373; `write-atomic.test.mjs`, 1–201; `check-auth-invariant.test.mjs`, 1–110; `with-app-env.test.mjs`, 1–128; `grok-pwa-plugin.test.mjs`, 1–506.
- `scripts/check-auth-invariant.mjs`, 1–109; `with-app-env.mjs`, 1–130; `grok-pwa-shared.mjs`, 1–527; `migrate.mjs`, 1–90; `migration-plan.mjs`, 1–46.
- `src/lib/db.ts`, 1–238.
- `train/src/tinyaz/mcts.py`, 1–164; `encode.py`, 1–74; `policy.py`, 1–82; `model.py`, 1–43; `pack.py`, 1–124; `engine_uci.py`, 1–196; `rate.py`, 1–190; `generate.py`, 1–141; `promote.py`, 1–63.
- `train/scripts/test_encode.py`, 1–78; `test_engine_uci.py`, 1–246; `test_lichess_split.py`, 1–205; `test_climb_loop.py`, 1–243; `test_challenge_rotator.py`, 1–597.
- `train/scripts/hansel-chess-ai`, 1–6; `tinyaz_uci.py`, 1–28.

**Targeted inspections and searches**

- `migrations/auth/0001_auth.sql`, lines 1–25, for the F2 header.
- `scripts/preview.mjs`, lines 90–235 and 250–320, plus searches for `/proc`, process ownership, process-group and port-owner functions.
- `vite.config.ts`, lines 153–183, plus searches for stylesheet/plugin wiring.
- `package-lock.json`, lines 1–110 and package records for `@tailwindcss/vite`, `@vitejs/plugin-react`, `chess.js`, Playwright, React and Vite. The complete lockfile was not read.
- `node_modules/chess.js/src/chess.ts`, lines 752–816, 1825–1856 and 2538–2569, plus searches for FEN, raw en-passant and history APIs.
- Searched `src/**/*.{ts,tsx}` for actual `loadPlayWeights`, `createThinker`, `search`, `searchAsync`, `ThinkResult` and thinker consumers.
- Searched source paths for stylesheet/JSON locations and inspected package line counts.

**Binary limits and review limits**

- Read only binary hashes, byte counts and M’s 16-byte header. M is 9,706,840 bytes with SHA256 `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`. S is 2,560,088 bytes with SHA256 `8b08996db7a6b41c1bcc06793147d934f5f311ff6b08bf7a926bd6b5cdb17247`.
- Oversized initial combined outputs were re-read in smaller chunks. No required read remains inaccessible or truncated.
- Planned Create paths were not treated as missing-current-state defects.
- No writes, tests, builds, compilation, model loading, training, evaluation, side-effect imports, Git mutations, Devin invocation or additional agents occurred.
- No memory, GBrain, history, restoration, excluded process-history documents or prohibited directories were read.
