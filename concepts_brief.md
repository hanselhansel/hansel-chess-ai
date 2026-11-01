# Tinyaz repair and playing-strength plan

- **Author:** Hansel Hansel, with Codex
- **Date:** 2026-11-01
- **Status:** Concept alignment and all six resolution proposals accepted by Hansel on 2026-11-01. The annotated resolution report is resolved. Formal design approval remains pending. No functional fixes, training, matches, or deployment have occurred.
- **Source revision:** `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`, on `chore/egm-bootstrap-tinyaz` with existing documentation changes.
- **Reviewed input SHA256:** `48bc533856c511d77a19cb4f4868248ecbee1fa7d18aa79eef6b0f0beb8063cc`. The brief stayed unchanged until all six reviewers finished.
- **Review:** [Goldfish findings and provenance](./goldfish_brainstorm_review.md). The dated [drift report](./2026-11-01_DRIFT_REPORT.md) and [approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md) remain unchanged.

## Overview

Make the browser use the intended trained model, repair confirmed software errors, and measure whether play improves. S is the small, 640,018-parameter model. M is the existing, 2,426,706-parameter model required by the approved design. Both remain under 3M parameters.

Browser players benefit from knowing which model is playing and from dependable turns. The project benefits from knowing whether a result came from better delivery, better software, more search, better trained weights, or a different measuring method. Finding no useful strength gain is a valid outcome.

The first proposed milestone ends after delivery repair, dependable checks, and one bounded comparison using existing weights. Clock management, search reuse, trained-weight improvement, publication redesign, and live bot work each need a separate admission decision. This is a reviewed concept, not an executable or approved implementation plan.

## Analysis

### Evidence and its limits

The browser loader defaults to S, while frontend constants and independently loaded metadata identify M. UCI, the text protocol used by chess GUIs and the bot, already defaults to M. Fixing browser delivery does not explain or promise a higher UCI rating. See [weights.ts:188-195](./src/lib/chess/weights.ts), [constants.ts:27-33](./src/lib/chess/constants.ts), [think-client.ts:115-125](./src/lib/chess/think-client.ts), [think.worker.ts:10-20](./src/workers/think.worker.ts), and [engine_uci.py:26-27](./train/src/tinyaz/engine_uci.py).

Read-only inspection of current local checkpoint bytes established these identities. Reading a header and hash does not validate inference or establish which checkpoint produced historical matches.

| Asset                         | Parameters | File bytes | SHA256                                                             |
| ----------------------------- | ---------: | ---------: | ------------------------------------------------------------------ |
| `public/weights/tinyaz-s.bin` |    640,018 |  2,560,088 | `8b08996db7a6b41c1bcc06793147d934f5f311ff6b08bf7a926bd6b5cdb17247` |
| `public/weights/tinyaz-m.bin` |  2,426,706 |  9,706,840 | `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee` |

The recorded M Stockfish-instrument estimate is 2035 (1895-2175) over 48 games. The separate recorded Lichess blitz BOT-pool rating is 1531 over 108 games, RD 45. These are historical repository records, not refreshed ratings or directly comparable scales. Public and bundled M metadata are byte-identical but contain no evaluated-checkpoint digest or measurement timestamp. Preserve unknown provenance as unknown. Do not retroactively assign today's binary hash to an old match without evidence.

Earlier lightweight diagnostics extracted parser and visit-selection functions without loading a model. With configured visits 64, `go movetime 50`, `go movetime 5000`, and a 60-second clock with two-second increments selected 64. A 250-ms clock selected 1. `go nodes 256 wtime 250` selected 256. An equal-prior/equal-visit selection probe found no evidence of a value-sign reversal. Both implementations negate child values on selection and alternate signs during backup. These probes do not establish full-search correctness, numerical parity, or strength.

### F1-F10 repair register

Every item is **OPEN**. Completion evidence below is required future evidence. Review completion and document edits do not constitute a functional repair. Paths in file maps are relative to this repository. F4-F7 retain the dated report's exact export sets; revalidate those sets against source during repair. F1-F3 and F8-F10 also received direct source checks in this review.

#### F1. Browser S versus intended M. OPEN

- **Repair:** Reuse `WEIGHTS_URL` as intended selection. Trained play must fail visibly if the intended M checkpoint cannot be verified. Do not automatically substitute random weights. An explicit random demonstration is separate and carries no trained-model rating claim. Pin a session to verified checkpoint bytes and their SHA256, architecture/count, and mode. Worker-to-main fallback must retain those bytes or verify the same digest before continuing. Carry that identity and the actual backend into readiness and each completed result. Show historical records as historical unless their evaluated checkpoint identity is established. Preserve S utilities and legacy S/M readers. These are design requirements to implement and test, not descriptions of current behavior.
- **Modify:** `src/lib/chess/weights.ts`, `src/lib/chess/think-client.ts`, `src/workers/think.worker.ts`, `src/components/chess/workbench.tsx`, `src/components/chess/card-panel.tsx`, `src/lib/chess/chess.test.ts`. **Create:** `src/lib/chess/think-client.test.ts`. **Modify:** `package.json` to run focused checks. Identity fields must not fabricate historical measurement provenance.
- **Modify contracts with the code:** `README.md`, `src/README.md`, `train/README.md`, `src/lib/chess/README.md`, `src/workers/README.md`, `src/components/chess/README.md`.
- **Completion evidence:** Worker and main-thread paths load intended M bytes and report matching digest/count. Missing, corrupt, mismatched, slow, and fallback loads follow the chosen contract. A browser check verifies active identity and truthful historical-record display. A default-URL unit check alone is insufficient.
- **Possible Elo impact:** Plausible browser improvement through delivery of existing M. No measured gain. No new training required. UCI already selects M.

#### F2. Auth SQL header. OPEN

- **Repair / Modify:** Correct explanatory comments in `migrations/auth/0001_auth.sql`; reconcile `migrations/README.md` and `migrations/auth/README.md` if needed. Preserve SQL statements, filename identity, top-level discovery, and opt-in behavior.
- **Completion evidence:** Comment-only diff agrees with `scripts/migrate.mjs:29-56`, `scripts/migration-plan.mjs:3-12`, and `src/lib/db.ts:132-155`. No database operation is needed for this comment repair.
- **Possible Elo impact:** None shown.

#### F3. Database initialization comment. OPEN

- **Repair / Modify:** Correct `src/lib/db.ts:182-188`; reconcile `src/lib/README.md` if needed. Distinguish deploy-time PostgreSQL migrations from PGlite startup migration. Do not add migration behavior to the pg query wrapper.
- **Completion evidence:** Comment matches `createNeonSql`, `createPgliteSql`, `ensureDbReady`, and the deploy migrator. No database operation is needed.
- **Possible Elo impact:** None shown.

#### F4. Script API inventory. OPEN

- **Repair / Modify:** `scripts/README.md` only. Revalidate and name the report's 24 exports from `brand-check.mjs`, `browser-smoke-verdict.mjs`, `check-auth-invariant.mjs`, `grok-pwa-shared.mjs`, `preview.mjs`, and `with-app-env.mjs`, with signatures or useful type boundaries.
- **Completion evidence:** Every name in [F4](./2026-11-01_DRIFT_REPORT.md) has an owning-contract entry and source reference. Parent contracts link to that inventory. No runtime refactor or template reconstruction follows from this gap.
- **Possible Elo impact:** None shown.

#### F5. Library API inventory. OPEN

- **Repair / Modify:** `src/lib/README.md`. Revalidate and document `isGrokEmbedderOrigin`, `PREVIEW_BRIDGE_CHANNEL`, and `PREVIEW_BRIDGE_VERSION` from `src/lib/preview-embedder-origin.ts` and `src/lib/preview-host-bridge.ts`.
- **Completion evidence:** All three names and relevant signatures/values match source. No protocol change follows from an index omission.
- **Possible Elo impact:** None shown.

#### F6. Connector constants. OPEN

- **Repair / Modify:** `src/lib/app-data/README.md`. Revalidate and name `CONNECTORS_HOST_STAGING` and `CONNECTORS_HOST_PROD` from `src/lib/app-data/client.server.ts`.
- **Completion evidence:** Both names and host roles match source. No connector runtime changes.
- **Possible Elo impact:** None shown.

#### F7. Auth type/configuration exports. OPEN

- **Repair / Modify:** `src/lib/auth/README.md`. Revalidate `GateJwks`, `VerifyGateIdentityTokenOptions`, `GateLinkedAccount`, `GATE_IDENTITY_HEADER`, `GATE_JWKS_PATH`, `PREVIEW_CLIENT_SECRET`, `GROK_ISSUER_DEFAULT`, `PREVIEW_ALLOWED_HOSTS`, and `GrokProvider` against `gate-identity.server.ts`, `preview.ts`, and `providers.ts` in that directory.
- **Completion evidence:** All nine names and relevant type boundaries match source. Do not expose secret values or change authentication behavior.
- **Possible Elo impact:** None shown.

#### F8. Browser geometry helpers. OPEN

- **Repair / Modify:** `src/lib/chess/README.md`. Add `fileOf`, `rankOf`, `algebraicToIndex`, and `indexToAlgebraic` from `src/lib/chess/constants.ts:61-79`.
- **Completion evidence:** Four names/signatures and source links agree. No geometry behavior changes.
- **Possible Elo impact:** None shown.

#### F9. Python geometry helpers. OPEN

- **Repair / Modify:** `train/src/tinyaz/README.md`. Add `square_index`, `file_of`, `rank_of`, `algebraic_to_index`, and `index_to_algebraic` from `train/src/tinyaz/constants.py:55-72`.
- **Completion evidence:** Five names/signatures and source links agree. No geometry behavior changes.
- **Possible Elo impact:** None shown.

#### F10. UCI invalid-position behavior. OPEN

- **Repair / Modify:** `train/src/tinyaz/README.md` only. Document `TinyazUci.apply_position`, valid-prefix retention when a later move is invalid, and silent `position` handling. See `train/src/tinyaz/engine_uci.py:95-124,146-148`.
- **Completion evidence:** Documentation matches current source for startpos/FEN and invalid first/later moves. No valid-game requirement violation was established. Atomic-position parsing is conditional future work requiring its own reason and approval. No engine change belongs to this documentation repair.
- **Possible Elo impact:** No demonstrated effect on valid-game strength.

### Additional software and evaluation limits

1. **Identity can change after readiness.** Load failures become random S weights without retaining the cause. Worker failure reloads weights before main-thread retry, but the readiness identity stays unchanged. Source labels/counts cannot distinguish two M checkpoints. Preserve or explicitly replace identity across transitions. Keep unmatched legacy evaluations visibly historical. See `weights.ts:188-195`, `think-client.ts:5-35,159-170`, and `workbench.tsx:142-178`.
2. **Browser requests can outlive their game.** Reset mutates the same game and clears its guard. An old result can then apply to the reset game. Automatic-turn effects can retry a failed turn, and reset clears load warnings. Require game-generation, request-position, request-ID, and checkpoint checks before applying a result. Reset or engine replacement invalidates earlier work. A late result cannot mutate the current game. A failed turn remains stopped until an explicit retry or reset; automatic effects must not restart it. Keep load failures visible until recovery succeeds. Physical cancellation is best effort and does not replace result invalidation. See `workbench.tsx:87-117,181-199`.
3. **Timeouts do not bound total work.** The eight-second initialization timer begins another load. Worker thinking has a 90-second wrapper, but main-thread retry is outside it. Main-thread termination does not cancel search. UCI search/command processing are synchronous with no `stop` handler. Stockfish response reads have no response deadline. For the first design, propose a 90-second total browser-operation deadline starting before loading or search and shared by worker/main fallback. Permit at most one backend transition within that deadline. Retire the previous backend before retrying. Report loading, search, fallback, cancellation, and stale-result disposition separately. Use an external evaluation watchdog for engine commands. This proposed ceiling is a stop bound, not a measured latency promise. Do not add a UCI clock mode in this milestone. See `think-client.ts:37-42,112-179`, `engine_uci.py:85-93,164-196`, and `uci.py:21-60`.
4. **Clocks do not allocate search.** UCI uses explicit clamped nodes, otherwise one visit below 300 ms, otherwise configured visits. Parsed movetime/increments do not buy additional search. Explicit nodes bypass the low-clock guard. Preserve fixed-mode compatibility while designing any opt-in clock mode. Example `Visits: 64` and concurrency one do not prove host settings. See `engine_uci.py:30-83` and `train/lichess-bot/config.yml.example:7-25`.
5. **Search recovery needs fixtures.** Both implementations start fresh roots. Browser search rebuilds from FEN, which cannot supply earlier repetition history. Python restores its supplied board on the normal path, without finally-protected restoration after evaluator failure. Test terminal values, value perspective, legal moves, board/history restoration, and Python/browser parity before changing selection logic. See `src/lib/chess/mcts.ts:59-136,179-200` and `train/src/tinyaz/mcts.py:53-93,104-137`.
6. **Current measurements are small and protocol-specific.** `rate.py` uses four openings with colors swapped. `vs_snapshot(games=...)` still plays at most eight games, and both models use one imported search implementation. It cannot compare two software revisions. Stockfish gets 100 ms per move; unfinished games stop at 160 plies and use material adjudication. New openings, stopping rules, or outcomes create a new instrument. Repeated deterministic games do not become independent evidence merely by increasing a loop count. See `rate.py:18-19,31-87,136-190` and `outcome.py:24-32`.
7. **Numbers need precise meanings.** Search timers omit load/setup and failed attempts. Card timing can be relabeled by the next visit selection. UCI reports selected visits as nodes and `q * 1000` as `score cp`; this is not established centipawn calibration. Distinguish requested/effective visits, neural evaluations, search time, and complete move latency. Label architecture-derived arithmetic estimates with their convention. See `engine_uci.py:85-89,171-175`, `card-panel.tsx:56-59,86-95`, and `think-panel.tsx:35-60`.

The Stockfish-instrument result is separate from Stockfish's documented calibration protocol and Lichess BOT-pool ratings. The earlier brief cited the [official UCI explanation](https://github.com/official-stockfish/Stockfish/wiki/UCI-Protocol-and-Stockfish-Commands) and [Fishtest](https://github.com/official-stockfish/fishtest/wiki) for context. They do not calibrate tinyaz or demonstrate a new gain.

### Comparisons that isolate the cause

| Question                                    | Change under test                                        | What stays fixed                                                                                                        | Meaning                                                                                          |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Did browser delivery improve?               | Old S selection versus repaired existing M selection     | Browser/search protocol, visits, positions, hardware, outcome rule                                                      | Delivery of a different existing checkpoint. No new training or same-weight software-gain claim. |
| Does software improve existing M?           | Two pinned engine revisions                              | Exact same M hash, fresh-root 64 visits, opening pairs/colors, opponent binary/options, outcome rules, hardware/runtime | Same-weight software comparison. Speed alone may leave fixed-64 move quality unchanged.          |
| Does more search help?                      | Explicit larger visit budgets using existing controls    | Same M hash, software, openings and outcome rules                                                                       | Additional compute. Report each budget separately from fixed 64.                                 |
| Does clock-budget play help?                | Separately selected timing policy                        | Same M hash, agreed clock/overhead, opponent and game population                                                        | Practical play including timeout losses. It is not a new fixed-64 result.                        |
| Did the measuring method change the number? | Old versus proposed opening/adjudication/rating protocol | Same pinned engine and M hash at 64 visits                                                                              | Instrument sensitivity. Rerun both software arms under each protocol to isolate method effects.  |
| Do new weights help later?                  | Candidate weights versus preserved M                     | Same verified software, fixed-64 protocol and independent match set                                                     | Trained-weight improvement. Do not combine with a search-budget or ruler change.                 |

Use two independently identified engine processes or revisions for software comparisons. Reuse UCI and existing legal-move libraries. First run a small identical-engine control to verify the runner, legal moves, pairing, identities, and output accounting. This control is not strength evidence. A same-M software comparison requires an actual change in the engine under test. If only browser delivery changed and Python execution is unchanged, record that no Python engine gain was tested. Keep the S-to-existing-M comparison separate. Establish browser/Python inference and search parity before using Python matches as supporting evidence for browser delivery; report any remaining difference. `vs_snapshot` comparing one M file with itself exercises one implementation twice. The evaluation-only runner writes run records and raw games without training, promotion, or historical-metadata replacement. Freeze software, checkpoint, openings, outcome protocol, and the statistical rule before candidate games.

Keep the historical fresh-root 64-visit instrument intact. Tree reuse with 64 new visits inherits earlier work and is a separate mode. If caching is considered, distinguish logical visits, new evaluations, cache hits, reused statistics, elapsed time, and memory bounds. Prove history, encoding, reset, and weight-identity invalidation. Profile first. No reuse implementation is approved.

### When retraining is needed

Selecting existing M, correcting inference/search errors, fixing stale browser replies, improving diagnostics, and changing time allocation do not require retraining. They change how existing weights are delivered or used. Larger search also uses the same weights. Each can help, do nothing measurable, or expose another bottleneck.

Training becomes a separate proposal when verified software and bounded comparisons still show a repeatable weakness worth addressing through data or learning. A defect that made saved training targets wrong may require corrected data and new training; correcting playback cannot undo what weights learned. A new learning objective needs updated weights. Changing model width is a different experiment, and S tensors cannot be copied into M. Existing M can instead be continued when a justified experiment calls for it.

Before opening training, require a separate design decision naming the repeatable learning weakness or demonstrated training-target defect, proposed data/target correction, candidate count, resource budget, and independent pass/stop criteria. Retain old M bytes as the control. No required measurement that is missing, failed, or linked to different weights can count as a pass. New weights cannot inherit an earlier checkpoint's rating. Before any later publication, choose and test complete-release identity, activation, missing-result behavior, single-writer coordination, and rollback. Before live bot work, obtain its separate runtime scope and bind completed eligible games and exports to authoritative engine/configuration identity. These are admission requirements for deferred work. They do not alter legacy publishers or authorize training, promotion, deployment, or live play. Training is not automatic after a disappointing result. No training has happened here.

### Cost, schedule, and conditional risks

M's current file is about 3.79 times S's size. The code's arithmetic estimate is about four times S's per evaluation; this does not predict latency. Unpacking holds downloaded bytes and copied tensors during decode. Measure cold readiness, warm latency including tail cases, peak memory, fetched bytes, fallback frequency, and responsiveness on selected devices. A dated Python/M4 timing is not a browser or host guarantee.

Proposed first-run ceilings for formal design: use one existing local machine, one game at a time, and no paid or remote compute. Limit the throughput preflight to 10 minutes. Limit the comparison cohort to 20 complete opening/color pairs, 40 games, or 60 minutes, whichever bound is reached first. Use a 30-second startup/readiness watchdog and a 90-second per-command watchdog. Cap aggregate evaluation-process resident memory at 4 GiB and new evaluation outputs at 256 MiB. Record hardware, runtime, device, thread settings, and actual use; do not silently raise a ceiling. Retain incomplete games/pairs and every fault in raw records. A fault or a time/resource stop before the planned complete cohort yields an inconclusive strength result. These are proposed resource limits, not measured requirements or performance estimates. Before matches, formal design must lock the opening list and independent final set, outcome rules, statistical decision method, error treatment, and exact pass/stop criteria. It must also provide task-effort and elapsed-run estimates from the detailed file plan and preflight. Do not infer a delivery date or numerical Elo gain. Preserve the old eight-game instrument separately.

Before later training, note that `load_jsonl(..., cap)` parses the whole file before sampling. Replay caps do not cap RAM or disk growth. Generation retains rows and appends fixed-name shards, allowing failed-run content into a later merge. Set row/byte/worker ceilings and run-specific resume/merge rules first. See `train_loop.py:38-49`, `generate.py:78-141`, and `climb_m.py:124-149`.

Publication is conditional. `maybe_promote` replaces weights and metadata separately. `train_m.py` then rewrites frontend constants by exact string matching. `climb_m.py` can publish after unavailable Stockfish results while retaining an earlier gauntlet record. These are static paths, not evidence they affected historical results. Keep comparisons away from those entrypoints. Before publishing new weights, decide missing-result policy, single-writer coordination, complete-release identity, legacy compatibility, and rollback. A publisher redesign is unnecessary merely to select existing M. See `promote.py:50-63`, `train_m.py:47-51,98-100`, and `climb_m.py:57-78,107-117`.

TypeScript reading accepts S/M under `TAZS` version 1; its writer still allocates S size. Do not change `CHANNELS` globally to repair playback. Use existing Python-packed M for delivery/parity fixtures. Serializer changes are deferred unless an M-writing use case enters scope. Preserve historical binaries and reader compatibility.

Bot evidence/export repair is deferred until live-run scope is separately authorized. The rotator cannot establish the playing engine's hash/configuration, mixes game categories, stops on lifetime account statistics, and saves seen IDs before WDL/PGN completion. A future live comparison needs run-specific identity, cohort filtering, recoverable exports, and authoritative game reconciliation. These are not prerequisites for the local milestone. See `challenge_rotator.py:213-269,283-286,315-339`.

## Goals vs. Non-Goals

- **In-scope working goals:** Account for all ten findings; repair intended M delivery; restore proportionate verification; check inference/search correctness; measure existing weights with a bounded software comparison; keep documentation current.
- **Approved constraints retained:** From-scratch AlphaZero-style model, under 3M parameters, existing chess libraries for rules, intended M browser delivery, and distinct 1-visit, 64-visit, and training-target budgets. Preserve approved requirements rather than rewriting them to excuse drift.
- **First milestone completion:** Delivery and documentation evidence is complete, required checks are accounted for, and the comparison reaches its predeclared decision or budget stop. No useful gain and inconclusive evidence are permitted outcomes.
- **Current non-goals:** Retraining, larger models, external trained weights, paid jobs, live bot/account changes, deployment, broader Grok auth/PWA support, an evaluation platform, a tracing service, or speculative cache/publication infrastructure.

## Alternatives Weighed

- **Select existing intended M first:** Retains the approved design and needs no new training. Measure its resource cost. This is the proposed first repair.
- **Change all architecture defaults to M:** Risks S random generation, counting, serialization, and tests. Reuse the intended URL and loaded-model boundary.
- **Train immediately:** Can spend compute on a delivery or measuring error. Defer until evidence identifies a learning problem and a separate bounded experiment is approved.
- **Raise visits immediately:** Existing UCI controls can test extra search. Preserve fixed 64 and label additional compute separately; this probe needs no clock manager.
- **Build clock management, caching, or tree reuse first:** Adds deadlines, state ownership, memory limits, and accounting changes before benefit is known. Admit each after measurements justify it.
- **Replace the rating ruler or use easier opposition:** Can move the number without improving play. Preserve the old ruler and run both software arms under any replacement.
- **Treat F4-F9 as runtime defects:** Adds unrelated behavior. Revalidate names and update their owning inventories only.
- **Make F10 atomic now:** Changes error semantics without an established requirement violation or valid-game benefit. Document current behavior; keep an atomic change conditional.
- **Restore the whole Grok template for green tests:** Expands beyond chess. Separate portable behavior, real application integration, and upstream authoring-template ownership. Preserve deployment checks.
- **Build a publication service now:** Addresses future promotion risk but is unnecessary for evaluation with unchanged assets. Use identity checks and snapshot rollback now; revisit coherent activation before publication.
- **Adopt stronger external engine weights:** Changes the from-scratch goal and requires explicit approval. It is outside this concept.

## Key Decisions & Staging for Next Steps

### Approved requirements, reviewed proposals, and implementation state

The approved M ladder remains the design authority. Hansel confirmed concept alignment and accepted all six resolution proposals on 2026-11-01. Carry the accepted direction, failure/identity rules, lifecycle requirements, verification ledger, and resource ceilings into formal design. Proposal wording in this brief records the accepted concept baseline; it is not a claim of implemented behavior or measured performance. Formal design still requires its section and final approval gates. All F1-F10 items remain OPEN. The resolution pass applies the accepted text and resolves the annotation. Source, contracts, weights, approved designs, and the dated report remain unrepaired.

Carry the accepted trained-load failure/demo policy, checkpoint pinning, request invalidation, watchdogs, verification ledger, and first-run ceilings into formal design. Before implementation, specify the exact interfaces and metadata compatibility, target devices, opening and holdout sets, statistical decision rule, numerical-parity tolerances, verification commands, effort and elapsed-run estimates, and rollback steps. Any later clock interface needs its own precedence/interruption design. Do not reopen accepted choices without recording and approving a design change.

### Proposed stages and completion evidence

1. **Pin the baseline.** Preserve unrelated dirty documentation and use a suitable `feat/`, `fix/`, or `chore/` branch for later code. Record both software revisions, full checkpoint hashes, configuration, hardware/runtime/device/threads, fresh-root accounting, opponent binary/options, openings, outcome rules, and failures. **Create:** `docs/experiments/tinyaz-software-plan.md` for the agreed protocol and caps. No training/public writes.
2. **Recover verification.** Reproduce and classify the dated 16 npm failures. Bootstrap recorded 179 script passes, 16 pre-existing failures, 39 separately passing TypeScript tests, passing typecheck, 13 mocked rotator checks, and 14 dataset-split checks. PyTorch-dependent encode/climb/UCI checks were not run because PyTorch was absent. These are dated observations, not fresh review results. Establish a project-local Python environment and record versions before using skipped checks as evidence. Add a verification ledger to the experiment plan with one row per existing failure or missing check: contract owner, reproduction command, classification, chosen repair, and result. Separate portable fixtures, application integration checks, and upstream authoring-template checks. Preserve required deployment and authentication checks. Do not waive a required check, change runtime defaults, or remove a template check without an explicit ownership decision. A green chess subset does not imply the full npm command is green.
3. **Keep test repair narrow.** **Modify as justified:** `package.json`, `scripts/brand-check.test.mjs`, `scripts/with-app-env.test.mjs`, and `scripts/README.md`; document Python setup in `train/README.md` and `train/scripts/README.md`. Preserve runtime missing-file/environment precedence. Isolate portable PWA fixtures; keep Nitro wiring/asset checks real. Decide ownership before moving authoring-document checks. Before touching the 506-line `scripts/grok-pwa-plugin.test.mjs`, make a scoped split, for example **Create** `scripts/grok-pwa-head.test.mjs` and keep both files under 400 lines. Do not modify the 527-line `scripts/grok-pwa-shared.mjs` for F4. A justified later runtime edit needs its own scoped split or another fixture seam. Do not weaken assertions, silently skip required checks, or reconstruct unrelated support.
4. **Repair the register.** Perform F2-F10 comment/index work with source comparison. Implement F1 after formal design approval, using the accepted identity/failure policy. Verify both execution paths, corrupt/missing/mismatched assets, explicit demo behavior, and historical-card separation. Apply the exact maps above. Keep each green change small with corresponding docs.
5. **Verify software before rating.** Establish forced-mate, terminal/draw, legal-move, value-perspective, repetition-history, restoration-on-error, and Python/browser packed-M parity fixtures with declared tolerances. **Modify as needed:** `src/lib/chess/chess.test.ts`, `train/scripts/test_encode.py`, `train/scripts/test_engine_uci.py`; **Create:** `train/scripts/test_mcts.py` for missing search/failure cases. Change `src/lib/chess/mcts.ts` or `train/src/tinyaz/mcts.py` only for a reproduced defect. Verify reset/stale replies, stable failures, and whole-operation timing across worker/main fallback using the client fixture and a browser check. **Modify as justified:** `src/components/chess/workbench.tsx`, `src/components/chess/card-panel.tsx`, `src/components/chess/think-panel.tsx`, `src/lib/chess/think-client.ts`, `src/workers/think.worker.ts`, with owning contracts. Distinguish terminal null moves from load/search faults; keep diagnostics protocol-safe.
6. **Run one bounded comparison.** **Create:** `train/scripts/compare_engines.py`, `train/scripts/test_compare_engines.py`; **Modify:** `train/scripts/README.md`, `train/README.md`, and the experiment plan. Use the smallest evaluation-only runner selecting pinned engines, weights, budget, protocol, and output directory. Reuse UCI/legal-move boundaries and color-swapped structure. Ensure it cannot train/promote. Verify identities and fixtures before match compute. An external watchdog bounds stalled engines. Predeclare openings, color swaps, effect/uncertainty rule, maximum complete pairs/elapsed time, error treatment, and an independent final set. Report W/D/L, uncertainty, raw games, failures, complete latency, and stopping reason. Do not overwrite historical metadata or add old matches to a new sample.
7. **Stop or admit one follow-up.** A supported negative result ends the first milestone. Useful larger-search results may justify an opt-in clock design. Profiling may justify bounded caching/reuse. Repeatable learning weaknesses may justify trained-weight experiments. None is automatic. Preserve fixed `Visits` behavior and fresh-root 64 control. Future clock work must name UCI/search/CLI/config files, interruption behavior, overhead, tests, and matching docs before implementation.
8. **Separate promotion and live play.** Before optional training/publication, address dataset bounds, unavailable-opponent policy, identity-bound measurements, coherent activation, and rollback in a separately approved design. Before live bot tests, separately authorize runtime scope, keep concurrency one, and require active-config/hash and completed-game/export evidence. Tests, writes, and promotion logs do not prove a live end state.

Every meaningful implementation change must update affected READMEs, API/configuration/usage contracts, and the new design's status/checklist in the same change. Keep every edited source or test file below 400 lines. Before each green commit, inspect the final diff and compare documentation with behavior, interfaces, invariants, side effects, paths, and commands. State why no doc update is needed when applicable. Never claim synchronization from timestamps or rewrite approved requirements to excuse drift.

Commit each green change on its scoped branch with corresponding docs. Leave the dated report as historical evidence; record actual closure in the repair register and later design checklist. This brainstorming step performs no git add, commit, push, merge, or release.

Rollback must restore the previous complete code/weights/metadata/selection configuration for the scoped change. Preserve unrelated dirty work. Recreate browser thinkers or reload/restart UCI processes so cached evaluators cannot retain the wrong checkpoint, then verify runtime digest and mode. If only an earlier mismatched browser state is available, keep its claims visibly unbound rather than call it repaired. Evaluation outputs stay separate from public assets. Deployment/bot rollback needs separately authorized runtime checks.

Concept alignment and the six resolution proposals are accepted. [goldfish_review_report.md](./goldfish_review_report.md) records the resolved disposition. The next design step is egm-draft, using this accepted concept baseline. Formal design approval precedes implementation.
