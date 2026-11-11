# Tinyaz local software verification

Historical attempt (2026-11-07): `6ff0128` reached 30/40 acknowledged games and
15/20 pairs, then shutdown hung. One supervisor TERM closed the command and
both pipes; final/completion records remain absent. It is incomplete and
intervention-qualified, with no valid final graph or eligible analysis.
The async filesystem cause remains UNKNOWN. Official isolated Node 24.22.2
passed the 719-case/Native qualification as an environment workaround.
See the [ledger](tinyaz-software-plan.md#incomplete-6ff0128-attempt-and-runtime-qualification-2026-11-07)
and [exact runtime procedure](../../train/scripts/browser_eval/README.md#isolated-node-runtime-qualification-2026-11-07).
One fresh full cohort requires reviewed publication, fresh runtime-bound
preparation/check/parity/preflight and a separate controller release.

Historical 17d2ff8 attempt: committed `17d2ff8` naturally exited 2 at 6/40
complete games and 3/20 pairs, with `p04-g1` incomplete at 115 plies.
It remains inconclusive, IPC_INVALID, three faults and invalid Native
cleanup/accounting. The separate 36-known-tuple gone/reused probe does not
promote that cleanup. PID 37355's EPERM cause and the earlier retained Node
reference remain UNKNOWN. The [ledger](tinyaz-software-plan.md#preserved-full-cohort-failure-and-native-repair-2026-11-06)
records the immutable receipts and targeted permission/heartbeat repair.
A fresh full cohort needs the reviewed source repair, fresh committed
check/parity/preflight and controller execution release. The same model,
24-hour ceiling, locked schedule and analysis method remain fixed.

The executable local phase commands and archived launch/retention rules are
now documented in [harness usage](../../train/scripts/browser_eval/README.md#operational-command-usage).
Check/parity, committed preflight and the one locked cohort remain distinct
execution gates. Raw numeric/PGN evidence and actual cleanup decide passage;
a source change or scripted requested result is not an experiment receipt.
No comparison is started automatically and no output updates public ratings.

Historical operational result (2026-11-06): candidate
`583b317d458d361dc218ac3f704fe1f4ec158055` passed fresh committed check,
thirteen-case browser/Python numeric parity and preflight. Its ONE locked
comparison against `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec` sealed
`inconclusive`/2 with `PHASE_TIMEOUT`: five complete games, two complete
pairs and one partial game. The completed-game 2W/2D/1L is descriptive only.
There is no eligible statistical strength result, significance or Elo estimate.
No replacement cohort is authorized.

The sealed receipt graph and all six selected PGNs were verified, including
replay, hashes and verified Native cleanup/accounting. After printing the
sealed outcome and completing its reported lifetime joins, the supervisor
remained alive and required a separately guarded Node-only SIGTERM. The
post-run retained handle is unresolved; this intervention is not natural
command completion or a promotion of the experimental result. Exact external
evidence and limitations are in the [ledger](./tinyaz-software-plan.md#locked-comparison-result-2026-11-06).
The earlier paragraphs below retain their historical checkpoint statements.

The [canonical design](../superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md) owns requirements, the file map, protocol and experiment limits. The [implementation evidence ledger](./tinyaz-software-plan.md) records actual commands, finding status and the bounded attempt. It is not an alternative requirements document.

The first milestone uses existing M weights. Browser delivery, same-weight software behavior, learning changes and measured ratings remain separate. Historical Stockfish and Lichess instruments remain in their existing files and are not replaced by this ledger.

The single comparison attempt and its runtime artifacts remain in the explicit external evaluation workspace, with hashes and paths recorded in the ledger. Do not put generated weights, datasets, credentials or inferred ratings in this directory.

The C4a1 browser-evaluation evidence libraries under [train/scripts/browser_eval/](../../train/scripts/browser_eval/README.md) on `feat/tinyaz-browser-evidence` are accepted at the pure-JS library boundary: Sol's prepared-5 `test:browser-harness` gate passed 138/138 cases across the ten suites with zero fail/skip/cancel and no warnings, `git diff --check` exited 0, both independent Sol 6.1-Max reviewers returned ACCEPTABLE, and the final verdict is ACCEPTED_SOURCE_FOR_FINAL_DOCUMENTATION_METADATA. Three earlier failed reviews (55/86, 118/128, 133/136) and the qualified conservative stream-reservation assessment remain preserved in the ledger. Native cleanup/identity bindings, capture/browser wiring, numeric parity, preflight, the bounded cohort and any strength result remain pending C4a2/C4b/C5.

C4a2 native supervision and the watchdog supervision stack were authored source-only on `feat/tinyaz-native-supervision` (dated author-boundary status — the actual verified receipt is the final paragraph): the watchdog is split into the facade/first-stop `watchdog.mjs` plus private lifecycle `watchdog-runtime.mjs`, pure config/context capture `watchdog-config.mjs` (re-exported through runtime/operations), bounded shutdown/finalization `watchdog-shutdown.mjs`, real fork-IPC `watchdog-driver.mjs`, validated dispatch/selftest `watchdog-operations.mjs`, and recorder/PGN/receipt `watchdog-records.mjs` owners, sharing one run context, one protocol authority and one Native authority. The monitor side delegates its whole collector lifecycle to `process-runtime.mjs` and its bounded LF byte framing to `process-framing.mjs`, with ONE narrow-only BudgetHandle (`process-budget.mjs`) carried through queue, transport, proofs, observation, lsof and backend stages. No test, Native, browser, phase, parity or strength gate has run; Sol's frozen-diff review and every execution gate remain pending. A later bounded source pass on the same branch repaired the NF-R01–06 review groups across the Native owners, staged the `supervision-test-fixtures.mjs` shared fixture plus the `process-budget`/`process-transport`/`process-backend` pure suites, and repaired the lsof/monitor/protocol/Python unit suites to the real contracts — all commands remain UNRUN for Sol at that authoring boundary (dated author-time statement, 2026-11-02; Sol's later actual diagnostics follow below), still `NATIVE_AND_PURE_UNIT_SOURCE_PREPARED_NOT_STAGE_PREPARED`, with `watchdog-records.test.mjs`, `native-test-fixtures.mjs` and `native-fixture.mjs` still only planned. Sol's frozen integrity review then found the expanded `process-backend.mjs` at 407 lines over the readable cap; under delegated decision 21 the whole owned stat/stream/hash reader was extracted verbatim into `process-backend-reader.mjs` (`createBackendReader({handle, retainActual, statFile, createStream}) -> {readFact}`), preserving every deferred receipt, real-close listener release, binary-streaming hash and pre/post-stat guard, taking the scope to 45 paths and the canonical map to 160 rows with no semantic change — still source-prepared and unexecuted.

Sol's isolated pure diagnostics on the frozen 45-path snapshot then reported real failures — two Python suites at 46 and 47 results and nine Node suites at 88/103 with 15 failures plus rejection and asynchronous-teardown warnings, with no Native/full-glob/model/browser/common phase having run — while `process-proof.mjs` measured 402 and `process-lsof.mjs` measured 405 (interim 413 retained) against the readable cap. Under delegated decisions `22-native-pure-diagnostic-repair.md` and `24-lsof-child-io-readable-split.md` on the exact 26-path scope, the complete `readProcessInspections` wire wrapper moved into `process-observation.mjs` (delegation recorded before use; proof at the 399 cap) and the whole gated wrapper child-I/O lifecycle moved into the one new pure owner `process-lsof-io.mjs` — `createLsofChildIO({retainActual, onPhysicalSettled})` holding the deferred pre-spawn physical receipt, named listeners, the combined 4 MiB bound and tracked fd-3 outcomes, with listener/buffer release and the isolated dispose callback gated on BOTH physical fulfillment AND `finishFlow` and every fd-3 end/write arming its real callback/error before invocation — taking scope to 46 paths and the canonical map to 161 rows (49 planned). The same pass implemented S01–S04 (transport ownership before PID validation, `whenReaped` retained while one pipe stays open, the pre-spawn live-check inside the truthful no-child path, physical acquisitions retained through public rejection) and the T01–T06 suite corrections (production-loaded ABI identity, withheld/late-ack replies, dispatch-before-advance budget assertions, distinct wrapper tuples, a missing-PID failed-spawn fixture, and spent-start/explicit-shorter-stop/tick-debt/latched-overage monitor cases against the real facade) with actual debt held after every public failure and no warning suppressed. All suite commands remain UNRUN for Sol at that authoring boundary (dated author-time statement, 2026-11-02; Sol's later actual diagnostics follow below), still `NATIVE_AND_PURE_UNIT_SOURCE_PREPARED_NOT_STAGE_PREPARED`; `watchdog-records.test.mjs`, `native-test-fixtures.mjs` and `native-fixture.mjs` remain only planned and R4 finalization timing stays a pending owner decision.

Sol's second review of the frozen 46-path snapshot returned REQUIRES_CHANGES: the new Python suite passed 30/30 and the affected Node group reached 59/65 with six fixture-level failures and no warnings or timeouts (unchanged 17+44 carried separately), leaving three production defects in the lsof pair — an unclosed fd-3 issuance decision, an fd-3 error that never discharged an issued no-frame end, and a pre-child failure path that could not dispose an isolated local handle. Under delegated decisions `25-observing-native-unit-repair.md`, `26-lsof-gate-test-fixture-split.md` and the in-flight lifecycle continuation on the exact 21-path scope (production limited to the two lsof owners), the issuance decision now closes exactly once, any issued fd-3 operation discharges on its own real callback OR error outcome (including the error-only no-frame end, with the original failure preserved), the permanent `gateClosed` latch guards late attach/write/close while staying internal (snapshot keeps its original five fields), and the entry wraps pre-spawn path/IO setup so an isolated local handle is disposed and a borrowed one is not. Six delegated test-only owners carry the moved groups whole — `process-monitor-test-fixtures.mjs` (realpath-normalized root, separate collector/supervisor images), `process-lifecycle.test.mjs`, `process-lsof-fields.test.mjs`, `process-lsof-io.test.mjs`, `process-lsof-test-fixtures.mjs` (whole makeGate/finish/out group) and `process_macos_test_support.py` — plus `process-backend-reader.test.mjs`, taking scope to 53 paths and the canonical map to 168 rows (56 planned, 26 JS test files, helpers 3). Literal fixture fixes landed for real: backend Python executable/prefix/version now come from `schema-constants.mjs`, the missing-PID proof rejects with no fabricated identity/frame/signal, delayed-timeout tests advance the clock without firing timers, the binary fake reuses one mutable chunk buffer with digest checks, and `jumpWithoutTimers` advances monotonic time without callbacks. All suite commands remain UNRUN for Sol at that authoring boundary (dated author-time statement, 2026-11-02; Sol's later actual diagnostics follow below), still `NATIVE_AND_PURE_UNIT_SOURCE_PREPARED_NOT_STAGE_PREPARED`; R4 finalization timing stays a pending owner decision and `watchdog-records.test.mjs`, `native-test-fixtures.mjs` and `native-fixture.mjs` remain only planned. One earlier `wc` line count and one `true` no-op ran as read-only/no-effect deviations and stay disclosed.

Sol's third frozen review (`native-unit-prepared-3`, manifest `0560d6b7...`) cleared the ten exact fake-only commands statically but reported actual diagnostics: `process-macos.test.py` 42/43 with one usec-type failure, eight completed Node groups 63/67 with four io/reader expectation failures, and `process-transport.test.mjs` at 15 passing subtests then an external 35 s timeout with no summary (an incomplete malformed-UTF8 fixture, never a pass). Under delegated decision `27-final-observing-fixture-repair.md` on the exact 15-path scope, the only production change was `process-macos-native.py` `pid_path` switching its path decode to strict UTF-8 that raises the existing `BackendError("unclassifiable-process", ...)` (all count/NUL/terminator/absolute guards and lazy binding retained), and the whole `PidPathTests` class moved into the new test-only `process_macos_path_test_cases.py` companion (`make_pid_path_cases`) bound back into the same `-I -B` command — scope 54, canonical map 169, final plan 57, still 26 JS test files and the same two Python commands. The same pass corrected the six current report findings (first-error retention plus closed-gate refusal, error-polarity on the pending promise, output-before-release, the leaf `readFact` byteLength plus a scoped `Buffer.concat` observation on the actual binary call, complete-LF malformed-UTF8 transport frames with a bounded fake-clock fallback, valid-numeric outbound usec before the corrupt reply, and probe-completeness negatives) and the remaining observing obligations (no-child inter-check expiry, entry early-exit/deferred-registration with the delayed no-frame end, late attach/write refusal, tick stop-before-flush ordering, the scoped workload signal in the healthy-overage case, and the strict parser UTF-8 case). At that pass's authoring boundary all commands remained UNRUN for Sol (dated author-time statement; Sol's actual prepared-4 diagnostics follow below) — these were fixture/intended-state repairs, not Native/full-glob/phase acceptance; R4 finalization timing stays a pending owner decision.

Sol's fourth frozen review (`native-unit-prepared-4`, manifest `2f66559b...`) statically cleared the eight exact commands, accepted the strict-UTF8 `pid_path` as the sole production delta, and ran them once: actual fresh Python 63/63 (`process-macos.test.py` 46/46, wire 17/17) and six Node groups 62/64 with zero skip/cancel/todo/warning/timeout — transport 19/19 complete (the historical 35 s timeout remains history), backend-reader 12/12, lsof 13/13, lsof-fields 6/6, with only `process-lsof-io.test.mjs` 6/7 and `process-lifecycle.test.mjs` 6/7 failing; 68 unchanged Node results carried separately for 130/132 covered, not a full harness. Under delegated decision `28-bounded-final-fixture-observation-repair.md` on the exact 12-path scope (ALL production readonly), the two actual failures were repaired — the late write is refused as `LSOF_UNAVAILABLE` at the permanently closed issuance with no second end/frame, and the scoped workload signal uses the legal `fixture` root kind under R1 — plus the three remaining original observations: the inter-check expiry now jumps the fake clock inside the `retainActual` registrar callback AFTER the real receipt registers (borrowed handle observed undisposed, no timer fired, truthful never-child fulfillment), the whole full-entry deferred-registration/early-exit/delayed-no-frame-end case moved into `process-lsof-io.test.mjs` with dynamic named-listener release asserted through the entry path at the shared physical+finishFlow boundary, and an independent `finishFlow` closure observes late attach/write refusal with no listeners/end/frame. Same-pass doc truthfulness: the strict-UTF8 `pid_path` contract is recorded in the owning README and canonical row, `resolvePath`/`spawned` fixture descriptions corrected, `make_pid_path_cases(N, fake_be)` aligned, mutable-reference-retention comments qualified, and earlier unrun paragraphs partially labelled dated history (the remaining author-time UNRUN paragraphs carry their dated labels only as of the following pass). Scope stays 54 paths/map 169/57 planned/26 JS test files/same two Python commands — still `NATIVE_AND_PURE_UNIT_SOURCE_PREPARED_NOT_STAGE_PREPARED`, pending Sol's freeze/safety/affected runs; R4 stays a pending owner decision.

Sol's fifth frozen review (`native-unit-prepared-5`) accepted the bounded C4a2 source plus its fake-unit gates as `GREEN_ISOLATED_NATIVE_LIBRARY_FAKE_UNITS_NOT_REAL_NATIVE_OR_STAGE`: actual 63/63 selected-Python and 133/133 cleared Node cases with no warnings or timeouts — a fake-unit boundary only, never real Native, watchdog, full-glob, model or browser execution. A later bounded source-only pass on the same branch repaired the residual watchdog semantic groups (existing `operation` event kind, coherent status/exit intent, hello-live heartbeat supervision, original-start cleanup staging, separate driver settlement, genuine `AbortSignal` checks, retained resource facts) and created the test-only `watchdog-test-fixtures.mjs` plus `watchdog-records.test.mjs` owners after their canonical rows and README contracts; scope 56 paths/map 170/final plan 58, `native-test-fixtures.mjs` and `native-fixture.mjs` still future. The receipt-sealing timing question is now a USER-APPROVED normative choice (experiment/cleanup limits unchanged; only final receipt bookkeeping may seal afterward, recorded under `/tmp/tinyaz-publication-abort-binding/user-timing-approval.json`) with exact publication/lifetime binding and runtime implementation pending under the separate approved packet — R4 stays OPEN. Real Native, watchdog and full-glob gates remain UNRUN; all commands stay Sol-owned.

Sol's `watchdog-independent-prepared-1` semantic review then returned REQUIRES_CHANGES over the four selected Node owners (`watchdog.test.mjs` externally timed out at 35.0155 s with two failed labels and no aggregate, `watchdog-cleanup.test.mjs` 3/12 with eight first-stage CLEANUP_UNPROVEN failures plus the delayed-start TERM case, `watchdog-records.test.mjs` 3/6 with the STORE_ARGS mode failure and two cleanup-gated receipt failures, `workspace-footprint.test.mjs` 6/6 unchanged). The same-session bounded source pass applied the four-literal approved32 Section 3 timing amendment (Section 3 expected digest `070fbf…`, Sol-verified), added the private `record-lifecycle.mjs` attempt/fence/unfinished-closure leaf after its canonical row and README contract, implemented the actual R5/R6/R8 production repairs (original-bound teardown start independent of stop/evidence IO, all-scope/nested driver settlement before collector-last, retained observation `atMonoNs`/current/peak/sticky/accounting facts) and repaired the nine observing-fixture groups — scope 59/map 171. A following readable test-owner split (34) then moved whole blocks into three TEST-ONLY owners after declarations were captured while the files were absent: `watchdog-run-test-fixtures.mjs` (nine exports; nine named cases stay), `watchdog-cleanup-test-fixtures.mjs` (nine exports; sixteen named cases stay) and `record-lifecycle.test.mjs` (the four discovered unfinished-closure cases; the seven originals stay) — scope 62/map 174, 27 JS test files plus the same two Python commands, future 64 with the two native fixtures still uncreated. The frozen interrupted `watchdog-independent-not-prepared-2` snapshot (454/462/402-line authors) is retained history; current state is repair-authored and source-only with NO new test result, no hash/count/audit and no target execution — the earlier failed-gate diagnostics stand unchanged, R4 closed-evidence/publication/referenced-hold lifetime remains OPEN, and the planned full-harness execution stays ONE serial `node --test --test-concurrency=1 'train/scripts/browser_eval/*.test.mjs'` over the unchanged package glob, all Sol-owned.

The bounded continuation then ran WD35 (created `watchdog-boundaries.test.mjs` with the declared residual-boundary regressions after its absence was captured, plus the declared pending repairs — records.mjs arrow-property `closeIncompleteEvidence`, runtime `runningWritten`, cleanupArgs `settleRequiredLiveEvidence`, cleanup start-validation/deferred-observer/collector-stop, operations selftest bound guards, shutdown scheduled live-evidence with fresh-remaining partial starts at the captured end); source6 was owned SIGINT-stopped at readable caps (433/401/399, including a cap-driven yield-pair rewrite) — frozen `watchdog-independent-not-prepared-3`, NOT PREPARED, no gates ran. Capacity move 36 moved the WHOLE pure N08 command case and the WHOLE withheld-driver-close case into boundaries and restored both explicit yield pairs (watchdog.test 8 local, cleanup.test 15, boundaries 9 then 8 after the selftest move). Decision 37 created three declared TEST-ONLY owners — `watchdog-child-test-fixtures.mjs` (whole `forkDriverFixture` plus `createObservedDriver`), `watchdog-evidence-test-fixtures.mjs` (`makeEvidenceWorkspace`/`gateFs`/`makePreflightRun` over genuine realpath workspaces, real receipts and realpath-canonicalized fs gating), `watchdog-evidence-boundaries.test.mjs` (positive selftest control, held-IO stop guards, moved selftest-bound case) — and landed the WC07 driver close-fact retention fix plus the T1–T3 fixture structural repairs. Scope 66 / map 178, 29 JS test files plus the same two Python commands, future 68; all repair-authored and source-only, pending Sol verification — the earlier failed/timeout diagnostics (43/48 with five failures, separate 35 s watchdog and boundary timeouts) stand unchanged and full R4 stays OPEN.

Corrective 38 then restored the literal37 factory APIs and created the two declared test-only leaves after `watchdog-beforecreate-38` captured the 61 existing source/test bytes exact, both files absent and the 180-row map: `watchdog-resource.test.mjs` (the two WHOLE resource cases, `atMonoNs` 777 retained, companion in the fresh causal clean -> high projection through the returned monitor -> lower -> still-live finish-before-first-poll order) and `watchdog-fs-test-fixtures.mjs` (the WHOLE exact-path `gateFs` read/rename interception plus the private per-test `registerFixtureTeardown`/`disposeFixture` owner). `watchdog-evidence-test-fixtures.mjs` now produces the genuine selftest receipt through a real recorder bound to the actual `createCleanupController.verifyCleanup` with a fresh `verifyInternalSelfTest` positive control, returns the parent manifest unwritten, and exposes `makePreflightRun` whose `run` is a FUNCTION starting the real watchdog exactly once; the evidence boundaries suite was ported to the restored APIs and `watchdog.test.mjs` keeps seven named cases (all 70 names retained). Scope 68 created versus planned 70, map 180, 30 JS test files plus the same two Python commands — repair-authored and UNVERIFIED pending Sol execution; all earlier failed/timeout/cap/private-API-drift diagnostics stand unchanged and full R4/Native/full-glob/C4b/C5 stay OPEN.

Historical native-fixture status (dated source-only note, UNEXECUTED at authoring — superseded by the verified receipt below): all five Native TEST helpers now exist on `feat/tinyaz-native-supervision` — `native-test-fixtures.mjs` 388 (sole `createNativeTestHarness` 7-input -> frozen public 12), `native-fixture.mjs` 384 entry (0 exports; header states D as a finite safety guard — actual events decide compliance, late overrun fails, no kernel scheduling guarantee), `native-fixture-protocol.mjs` 348 (4 exports), `native-fixture-io.mjs` 388 (EXACT8) and `native-fixture-admission.mjs` 375 (EXACT8, correcting the prior author-claimed 374). The three-leaf architecture and TEST runtime exclusion stay exact; `BackendIdentity.helpers` remains the three Python owners, map-209 actions/paths/order and the Section-3 `070fbf` slice are unchanged. `native-supervision.test.mjs` is authored as ONE serial real Native group over the frozen N01-N15 matrix with the original 60 s / 10 s / 4 MiB bounds and an explicit platform failure (no skip); it has NOT executed — the earlier "fixtures still uncreated" wording above is dated history, and the planned serial command stays `node --test --test-concurrency=1 'train/scripts/browser_eval/*.test.mjs'`, all Sol-owned.

Historical C4a2 verified status (2026-11-05, before C4b execution): the actual owned serial command — `node --test --test-concurrency=1` plus the 35 explicit `train/scripts/browser_eval/*.test.mjs` suite paths — naturally exited 0 in 38.9228 s with 352/352 pass, 0 fail/cancel/skip, stderr 0, no signals, and exactly the two deliberate `TINYAZ_BOOKKEEPING_OBSERVER`/`TinyazBookkeepingObserverWarning` null/undefined warning cases (receipt `/tmp/tinyaz-c4a2-sol-review/wd-child-term-ignore-89a-source-1/fullglob-gate/result.json`, stdout SHA `89a729f8804f94fcbcba84f693515d61b796f1b59b2e2fd1dd0407266ae09465`). The real-Native group passed: all 14 created direct handles settled real exit plus BOTH pipe closes, the three collectors exited 0/0/2 (the last the deliberate EOF), the watchdog lane ran, errors are empty, listener->TERM->reap order held, the collector input EOF was consumed, and combined evidence is 1,748,598 < 4 MiB under the unchanged 60 s/10 s/9.5 s bounds (summary SHA `13bb0d53e1cab0ee90326ca1b395a52d16ea2fba4e05b3d4bfe1591fc2e07f56`). The dated 344/343/1, 349/348/1, 350/349/1 and 352/351/1 receipts and every source-only/UNEXECUTED declaration above stay preserved history; the owning [browser_eval README](../../train/scripts/browser_eval/README.md) holds the current verified status and the actual implementation/export inventory. At that historical checkpoint, C4b browser capture/numeric parity/preflight, C5 and the ONE approved 64-visit/20-pair/40-game comparison had not run; no browser-evaluation phase pass, strength or Elo result existed then. Earlier development history: The current WORKTREE check/parity passage above supersedes that execution status. Containing-commit publication is owned separately; no Git/remote state is claimed here.

Update this index and the ledger with meaningful implementation changes. Compare final code and owning contracts before each green commit and final handoff.


## Accepted separate-verdicts direction (2026-11-10)

Hansel approved the reviewed `tinyaz-separate-verdicts-v2` amendment and Sol High implementation. The [accepted canonical contract](../superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#accepted-separate-verdicts-v2-contract-2026-11-10) and [Tasks 4-14](../superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md#task-4-accepted-contract-and-before-use-declarations) declare the prospective work. V2 implementation and runtime validation remain pending; current operational code remains strict v1. The fc30765 attempt remains incomplete at 6/40 acknowledged games and 3/20 pairs, with no eligible analysis and unproven Native cleanup/accounting. All earlier failed cohorts remain ineligible. M weights remain unchanged. No fresh strength or Elo result is claimed. Fresh scoped reviews, whole-change review, Root runtime/candidate/policy releases, strict prerequisites and one separately released fresh full40 remain required.

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

Owning contract: [exact v2 root grammar and diagnostics](../../train/scripts/browser_eval/README.md#task10-r1-exact-root-grammar-and-diagnostic-disclosure-2026-11-10).

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

Current repair status (2026-11-10): Task12 prepares one combined fix wave from the
completed whole-change review. [Owning contract and exact before-use map](../../train/scripts/browser_eval/README.md#task12-single-repair-wave-before-use-map-2026-11-10).
Production remains OLD; all new runtime/phase/cohort gates are UNRUN. Historical
failures remain ineligible; Task11 component cap remains resource-inconclusive.

Task12 same-wave preparation continues after the first Root-run OLD diagnostic.
Failed e84f8a9e evidence stays immutable; corrected TEST/v2 selection package
requires new exact Root GO. W/v2-task-12-report.md records the causal diagnosis.

Task12 retains the qualified49-case OLD control. A bounded W-only nested-error
diagnostic is source-prepared for a fresh exact Root gate; I5 attribution remains
unproven. W/v2-task-12-report.md preserves the actual receipts and qualifications.

Current implementation status (2026-11-10): Task12's six Important and three Minor
groups are implemented and locally validated. Causal49/49, related410/410 and
Native1059/1059 closed with Root audits. Controlled cap remains aggregate/resource
INCONCLUSIVE. [Owning status and limits](../../train/scripts/browser_eval/README.md#task12-fixed-implementation-and-local-validation-2026-11-10).
Scoped re-review, Task12 completion and phase/full40 release remain open. Earlier
failed attempts remain ineligible.

Current failed attempt (2026-11-10): reviewed/published4709b15 passed fresh strict
CHECK/PARITY/PREFLIGHT0 with BOTH resources passed/gaps0. Its ONE full40 failed
at descriptive12/40 games and6/20 pairs on Store age2300>1000ms and Recorder
sticky. No final graph, eligibility or verified persisted cleanup. Five quiet
producer scans did not reproduce timing; the historical cause remains UNKNOWN.
[Outcome and evidence limits](../../train/scripts/browser_eval/README.md#task14-failed-comparison-handoff-and-idle-control-2026-11-10).
Task14 documents this failed handoff; Task3/full40 is INCOMPLETE. No automatic retry.

Task15 is passive scan-attribution preparation after the consumed Store-freshness
failure. Hooks/runtime126 remain OLD for causal RED; no Task15 command has run.
The [harness contract](../../train/scripts/browser_eval/README.md#task15-before-use-scan-diagnostics-contract-2026-11-10)
declares the future runtime127 and ONE real M64-visit WORKTREE/v2 diagnostic CHECK,
with unchanged guards/bounds and no scientific-parent authority. Historical2300ms
cause remains UNKNOWN. No cohort retry or guessed fix; Task3/full40 INCOMPLETE.

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
[current prerequisite-results report](2026-11-11-tinyaz-serial-verification-prerequisites.md) for exact times, pins,
closure distinctions and UNKNOWN underlying delay cause. No latency-cure claim,
retry, new control or comparison follows. Old failures stay preserved/ineligible.

## Approved V3 implementation status (2026-11-11)

The [approved V3 contract](../superpowers/specs/2026-11-11-tinyaz-preflight-v3-software-design.md) is IN PROGRESS
at Task18 Stage A. The exact approval record is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5e912df4-8fd0-4b5e-ac68-9e9c625a23a0/implementation-approval.json`
for proposal SHA256 `ad4b3d8a710c1dc4af24e305a946ed7b4e8a83035efec89e4973f9fad30638a8`.
It supersedes historical pending-approval labels, with conditional Root
execution gates retained. The active fault-repair plan owns Tasks18..21.

Actual executable source remains V1/V2 at `67b85fe`, runtime127. Only the
prospective recognition TEST is newly authored; Root qualification is pending.
Later capacity checkpoints128/129 precede approved V3 runtime135/TEST96.
No V3 test pass, Native/browser phase or new comparison result is claimed.
Task3/full40 stays INCOMPLETE. The prior strict CHECK/control/parity passed;
V2 preflight failed at596.034ms>500ms, with no usable main completion graph.
The [dated prerequisite report](2026-11-11-tinyaz-serial-verification-prerequisites.md)
and all old evidence remain unchanged. Model, science and hard limits stay fixed.

The established status owners are this experiment index and its evidence
ledger. Root ruled to preserve that layout; the proposed
`tinyaz-software-status.md` path is absent and no duplicate file is created.

## Task18 Stage B: authored capacity split (2026-11-11)

The current authored Split A roster is128, preserving the exact original127
prefix and appending only `train/scripts/browser_eval/resource-quality-schema.mjs`.
The schema/primitive group is moved whole with original V2 validation; public
validator re-exports and the sole ledger factory remain unchanged. No V3 policy,
fixture, scope, graph or operator is activated. The compat leaf replaces the
archived recognition leaf, giving90 current TEST owners. Task19 runtime129 and
Task20 runtime135/TEST96 remain approved future work. Source is ready for Root's
actual tests and scoped review; Task18 is IN PROGRESS and no green commit or
publication is claimed. All project execution remains Root-owned.

Root qualified the sole OLD recognition RED on unchanged `67b85fe`: natural
exit1 in0.2093892078846693s, intended first doesNotThrow ERR_ASSERTION from
`SCHEMA_LITERAL: policy/version/protocol binding`,582 exact pins and actual
wait/both-pipe/raw/journal closure. This proves missing recognition only.
The exact22-line TEST, SHA256
`ea3bf64a96bd95a839f19c3bac2ffea9fdb36ff1ff947ea2978e9c8a82146765`, is archived
exclusively in E20/recognition-test-original.mjs and removed from the runtime
TEST directory until identical restoration with Task20. E20 is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.

Task18 gate update (2026-11-11): Root's complete covering gate passed100/100,
zero skip/cancel, natural0 in19.657593500s, with587 exact pins and actual
wait/BOTH raw-pipe/journal closure. Scoped Sol Max spec/code-to-document quality
review is Approved with zero Critical/Important/Minor findings. Source remains
the reviewed Split A runtime128/TEST90 with unchanged V1/V2 behavior. Root's
final documentation audit and separate green-commit release remain pending.
Task18 is IN PROGRESS; no commit, publication, V3 activation or phase result
is claimed. Audit: E20/root-task18-covering-audit.json.
