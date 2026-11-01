S9-CB-001 — Blocker — The required climb check performs real model evaluation and self-play generation.

Affected scope: target lines 589, 594 and 721, “Required verification and numerical parity” and “Commands, green changes, effort, and admission gates.”

Source evidence:

- `train/scripts/test_climb_loop.py:121-127` calls the real `vs_snapshot` with the published S checkpoint for eight games.
- `train/scripts/test_climb_loop.py:190-206` calls the real `generate` with one game and writes generated rows to a temporary JSONL.
- `train/scripts/test_climb_loop.py:209-239` includes both checks in the prescribed script entrypoint.
- `train/src/tinyaz/rate.py:23-28,56-86` loads models and plays the snapshot games.
- `train/src/tinyaz/generate.py:70-115` loads a model, plays self-play and appends rows.

The target says the existing climb/rotator tests use controlled mocks and temporary paths. That is false for the climb test. Temporary output paths do not make its evaluator or generator mocked. The mandatory command therefore invokes behavior that the preceding sentence forbids as verification.

Recommended action: correct the infrastructure description and resolve the permitted test boundary before implementation. Either expressly permit and bound these existing real S test operations, or map a controlled test rewrite that preserves the assertions and records the displaced real coverage. Do not execute the command under the current contradictory instructions.

S9-CB-002 — Major — The verification commands do not pin the UCI wrapper’s child interpreter.

Affected scope: target lines 587 and 712-725, particularly command line 722.

Source evidence:

- `train/scripts/test_engine_uci.py:163-178` first launches Python with `sys.executable`, then separately executes `train/scripts/hansel-chess-ai`.
- `train/scripts/hansel-chess-ai:4-6` executes the bare command `python3`.
- `train/scripts/tinyaz_uci.py:13-14` imports `tinyaz.engine_uci` before parsing `--help`.
- `train/src/tinyaz/engine_uci.py:8-13` imports chess and Torch.

Running `train/.venv/bin/python` does not change the shell’s `PATH`. Consequently, the wrapper check can run an ambient Python without the pinned libraries, even when the parent test uses the prescribed environment. It can also pass using a different installation than the one recorded in the verification ledger.

Recommended action: prescribe a `PATH` containing the project environment’s `bin` directory for commands that execute the wrapper, or explicitly set that child environment in the mapped test change. Verify and record the child interpreter identity while preserving the wrapper’s runtime behavior.

S9-CB-003 — Major — The standalone Workbench fixture lacks the required Tailwind compilation configuration.

Affected scope: target lines 496, 499 and 630, covering `browser_eval/server.mjs` and `workbench-fixture.mjs`.

Source evidence:

- `src/styles.css:1-34` imports Tailwind and defines the application theme using `@theme`.
- `src/components/chess/board.tsx:41-85` relies on generated utility classes for the eight-column board, square dimensions, piece placement and legal-move markers.
- `vite.config.ts:7,162-183` enables the installed `@tailwindcss/vite` plugin separately from the React plugin.
- `package.json:47,83` already declares the Tailwind and React Vite integrations.

The plan requires the actual Workbench and its styles, disables the production Vite configuration, and explicitly selects a React transform. It does not select the Tailwind transform or its source-scanning root. Importing the stylesheet through ordinary Vite CSS handling does not generate the application’s utility classes. The implementer must discover and supply another configuration decision to obtain the intended component fixture.

Recommended action: specify the existing Tailwind Vite plugin in the standalone component-server configuration, with scanning confined to the selected snapshot. Add a browser assertion for the rendered board’s grid and square geometry so an uncompiled stylesheet cannot satisfy the UI gate.

S9-CB-004 — Major — Roadmap is an omitted consumer of the model and historical-rating display changes.

Affected scope: target lines 478-481 and 598, “Unified file map” and the UI verification row.

Source evidence:

- `src/components/chess/workbench.tsx:119-140` derives phase, rated state and status text from stored metadata.
- `src/components/chess/workbench.tsx:275` renders `Roadmap`.
- `src/components/chess/roadmap.tsx:1-5` contains the unconditional claim “currently <1320.”
- `src/components/chess/roadmap.tsx:7-29` renders every phase’s text, including that rating claim, regardless of which phase is current.
- `src/lib/chess/checkpoint-meta.json:44-119` records the separate historical 2035 Stockfish instrument result.

The plan changes CardPanel’s claims and adds demo mode, but does not specify Roadmap’s treatment. Changing the `current` and `rated` props cannot remove its unconditional numeric claim. Following the listed display migration can therefore leave an obsolete current-rating statement visible, including during an untrained demo.

Recommended action: explicitly define Roadmap’s active-session versus historical behavior. Map the required Roadmap or Workbench rendering change and its owning contract. Include the complete rendered Workbench in the demo claim check, rather than checking only CardPanel.

S9-CB-005 — Major — The fixed documentation inventories leave additional public interfaces undocumented.

Affected scope: target lines 515, 519 and 758-769, covering F4/F7 inventories and closure proof.

Source evidence:

- `src/lib/auth/gate-identity.server.ts:22,49-52,162-165` exports and consumes `JwksFetch`. The owning README does not identify this public callback type. Its reference to the private `defaultJwksFetch` function is a different symbol.
- Additional exported functions absent from both the current script contract and the prescribed F4 additions are:
  - `appNameFromHost`, `scripts/grok-pwa-shared.mjs:62-82`
  - `stripInstallParams`, lines 145-152
  - `renderInstallPageHtml`, lines 154-158
  - `renderWebManifest`, lines 160-183
  - `readOgSite`, lines 245-253
  - `ogCardPublicPath`, lines 256-260
  - `ogServiceUrl`, lines 290-293
- Additional exported constants absent from that same owning inventory are `DEFAULT_APP_NAME`, `OG_SERVICE_URL_DEFAULT`, `OG_SITE_REL_PATH`, `GROK_EXTENSIONS_SCRIPT_SRC`, `APP_ENV_REL_PATH`, `OG_PENDING_REL_PATH`, `PREVIEW_SIGN_OUT_TIMEOUT_MS` and `DEPLOYED_SIGN_OUT_TIMEOUT_MS`.
- Their definitions are in `scripts/grok-pwa-shared.mjs:9-11,203`, `scripts/with-app-env.mjs:28`, `scripts/brand-check.mjs:41`, and `scripts/sign-out-plan.mjs:27,34`.

The plan supplies a fixed name list and requires exact owning-interface entries, but does not account for these current exports. `JwksFetch` also defines the injection boundary used for controlled JWKS verification. These omissions can survive the planned repair and its closure checklist.

Recommended action: reconcile the owning inventories against the current export sets and list the additional entries with signatures or roles. Preserve the original F4/F7 historical finding sets, recording the newly discovered omissions separately where needed. No runtime change is justified by these index omissions.

Read evidence

Repository root for the repository-relative paths below is `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai`.

Frozen review inputs:

- `/Users/hansel/.codex/plugins/cache/egm/egm/0.1.0/agents/codebase_details.md`: full read, 69 lines. SHA256 `d80db07e449b57b3b3776d1401cca72a54b6b65a0ab218b86f9064ee4b8167bc`.
- `/Users/hansel/.codex/plugins/cache/egm/egm/0.1.0/resources/document_standards/implementation-readiness-standard.md`: full read, 34 lines. SHA256 `ed0d2a085eac0fd9581d504a2ec0df2a92d6b2538636a22b16e0b1370fba6dbb`.
- `docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md`: full read, lines 1-794, in bounded chunks. The file map was read in short chunks. Detailed Implementation begins at line 404. Before and after SHA256 was `c708f35e3c6e0ce4eda679d7a68820c6232e2cdb56b17a3b98e7919b7d5cfd80`; final count remained 794.
- `docs/superpowers/plans/2026-11-02-tinyaz-devin-orchestration.md`: full read as execution-role data, lines 1-97. Before and after SHA256 was `3781cadb94906fa030f5283e812475e835caac29b7fc7cfc01b468a84fa4aff4`. Linked operational skills were not read or invoked.

Owning contracts fully read:

- `README.md:1-152`
- `src/README.md:1-79`
- `src/lib/README.md:1-108`
- `src/lib/chess/README.md:1-116`
- `src/workers/README.md:1-55`
- `src/components/README.md:1-47`
- `src/components/chess/README.md:1-78`
- `src/lib/auth/README.md:1-132`
- `src/lib/app-data/README.md:1-81`
- `scripts/README.md:1-69`
- `train/README.md:1-110`
- `train/scripts/README.md:1-66`
- `train/src/README.md:1-46`
- `train/src/tinyaz/README.md:1-69`
- `train/lichess-bot/README.md:1-94`
- `migrations/README.md:1-34`
- `migrations/auth/README.md:1-100`
- `server/README.md:1-39`
- `server/middleware/README.md:1-41`

Browser source fully read:

- `src/lib/chess/constants.ts:1-80`
- `src/lib/chess/weights.ts:1-230`
- `src/lib/chess/encode.ts:1-68`
- `src/lib/chess/policy.ts:1-94`
- `src/lib/chess/net.ts:1-105`
- `src/lib/chess/mcts.ts:1-200`
- `src/lib/chess/think-client.ts:1-182`
- `src/workers/think.worker.ts:1-43`
- `src/lib/chess/gauntlet.ts:1-141`
- `src/components/chess/workbench.tsx:1-335`
- `src/components/chess/card-panel.tsx:1-155`
- `src/components/chess/think-panel.tsx:1-106`
- `src/components/chess/board.tsx:1-112`
- `src/components/chess/roadmap.tsx:1-35`
- `src/styles.css:1-55`
- `src/lib/chess/checkpoint-meta.json:1-287`

Python source and verification infrastructure:

- Full reads: `train/src/tinyaz/constants.py:1-101`, `encode.py:1-74`, `policy.py:1-82`, `model.py:1-43`, `pack.py:1-124`, `mcts.py:1-164`, `engine_uci.py:1-196`, `rate.py:1-190`, `generate.py:1-141`, `train_loop.py:1-159`, `promote.py:1-63`, `uci.py:1-67`, and `outcome.py:1-32`.
- Full reads: `train/scripts/test_encode.py:1-78`, `test_climb_loop.py:1-243`, `test_engine_uci.py:1-246`, `test_lichess_split.py:1-205`, `test_challenge_rotator.py:1-597`, `hansel-chess-ai:1-6`, and `tinyaz_uci.py:1-28`.
- Targeted reads: `train/src/tinyaz/data.py:1-140`; `train/scripts/months_m.py:1-100`.
- Structural searches covered definitions, imports, side effects and publication boundaries in `train/scripts/climb_m.py`, `train_m.py` and `elo_gauntlet.py`.
- The rotator mocks, fake responses, temporary path installation, restoration blocks and script test dispatch were inspected. The climb test’s actual inference/generation boundary was traced into production helpers.

Script test infrastructure and runtime:

- Full reads: `scripts/brand-check.test.mjs:1-373`, `write-atomic.test.mjs:1-201`, `check-auth-invariant.test.mjs:1-110`, `with-app-env.test.mjs:1-128`, and `grok-pwa-plugin.test.mjs:1-506`.
- Full reads: `scripts/with-app-env.mjs:1-130`, `check-auth-invariant.mjs:1-109`, `grok-pwa-shared.mjs:1-527`, `grok-pwa-plugin.mjs:1-190`, `browser-guard.mjs:1-47`, `migration-plan.mjs:1-46`, and `migrate.mjs:1-90`.
- Targeted reads: `scripts/brand-check.mjs:36-54,160-227`; `browser-smoke-verdict.mjs:1-55`; `preview.mjs:1-105`; `sign-out-plan.mjs:1-75`; `browser-smoke.mjs:1-71,90-108,157-177`.
- Additional helper/tripwire reads: `scripts/migration-plan.test.mjs:1-45`; `sign-out-plan.test.mjs:1-60,160-178`; `preview.test.mjs:1-100,203-219`; `browser-smoke-verdict.test.mjs:1-40,330-416`.
- Core helper reads: `src/lib/app-data/app-data.test.ts:1-135`; `src/lib/auth/gate-identity.test.ts:1-100`. Searches covered their remaining mock/environment boundaries. Simple unit-test body detail was not treated as a required production-code inventory.

Other current-source boundaries:

- Full reads: `src/lib/db.ts:1-238`, `migrations/auth/0001_auth.sql:1-67`, `vite.config.ts:1-185`, and `server/middleware/grok-pwa.ts:1-111`.
- Full reads: `src/lib/preview-embedder-origin.ts:1-56`, `src/lib/auth/gate-identity.server.ts:1-178`, and `src/lib/auth/providers.ts:1-31`.
- `src/lib/auth/preview.ts:1-32` was read with the secret value on line 21 redacted.
- Targeted reads: `src/lib/preview-host-bridge.ts:1-95`; `src/lib/app-data/client.server.ts:1-125`, with export searches through its re-export section.
- Installed chess.js source inspected at `node_modules/chess.js/src/chess.ts:770-903,1360-1390,1820-1862` for raw-target retention, FEN normalization and terminal predicates.

Configuration and assets:

- Full reads: `package.json:1-99`, `tsconfig.json:1-37`, `.gitignore:1-45`, and `train/pyproject.toml:1-16`.
- `package-lock.json` root metadata at lines 1-85 and targeted package records at 3938-3965, 4299-4306, 6314-6347, 6478-6490, 6509-6527 and 7271-7316. SHA256 `33b98f5c21eaf99765a1415c906e7457afcc279fd0ec0b2e8fdeb51f83b6d618`.
- Installed package metadata confirmed Playwright 1.62.1, Vite 8.2.2, chess.js 1.4.0, React/React DOM 19.2.8, React Vite plugin 5.2.0 and Tailwind Vite plugin 4.3.3.
- M binary: 9,706,840 bytes; header `TAZS`, version 1, count 2,426,706, source ID 1; SHA256 `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`.
- S binary: 2,560,088 bytes; header `TAZS`, version 1, count 640,018, source ID 1; SHA256 `8b08996db7a6b41c1bcc06793147d934f5f311ff6b08bf7a926bd6b5cdb17247`.
- Public M metadata and bundled metadata have identical SHA256 `09e5989f3fd1d9453a49c3626bdac50bedb847dc60992ecf2f98f922421e828d`. Public S metadata SHA256 is `524d100df1dd21509e8fc6a7abc6c4099a971de08a063eb0e954574d1fa2017f`.
- Binary inspection was limited to size, header and checksum. No model was loaded.

Search and review limits:

- `rg` searches covered thinker/loader/search/encoder/result/parameter-count consumers across `src` and `train/scripts`; exported interfaces across script, auth, connector and preview modules; Workbench/Roadmap/style consumers; and verification helper/runtime dependencies.
- All 79 file-map entries were checked. Every `Modify` path exists. Missing `Create` paths were correctly treated as proposed files.
- HEAD is `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`. A read-only scoped diff against that baseline showed only tracked README changes under the inspected source/configuration scope.
- Initial truncated displays were reread in smaller chunks. No unresolved truncation or missing required persona, standard or target read remains.
- No tests, builds, compilation, model execution, training, evaluation, operational imports, Devin commands, Git mutations, writes or additional agents were used. Excluded process-history documents, memory/GBrain, chat history and forbidden directories were not read.
