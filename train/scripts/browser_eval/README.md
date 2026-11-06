# Browser evaluation harness libraries

Owners for the canonical bytes, record envelopes, bounded artifact IO,
sole-writer recording, prerequisite admission, supervisor IPC validation,
paired-cohort statistics, persisted PGN selection, rules-owned match control
and the Darwin native-supervision boundary used by
the verified-M browser evaluation. The C4a1 evidence libraries contain no
browser, native, model, child-process, network or application imports; the
C4a2 native modules below add real process supervision on macOS arm64 only,
using the selected Python standard library and `/usr/lib/libproc.dylib` plus
the fixed `/usr/sbin/lsof` tool. Unit evidence here is library evidence only;
it is never a completed check/parity/preflight/compare phase and never a
strength result.

## Current verified status (2026-11-05)

The C4a2 native-supervision stack and this whole directory are VERIFIED
at the whole-JS boundary. On 2026-11-05 the actual owned serial command
— `node --test --test-concurrency=1` plus the 35 explicit `*.test.mjs`
suite paths — naturally exited 0 in 38.9228 s with 352/352 pass, 0
fail/cancel/skip, stderr 0 and no signals; the only warnings were the
two deliberate `TINYAZ_BOOKKEEPING_OBSERVER`/
`TinyazBookkeepingObserverWarning` null/undefined cases expected by
`record-evidence.test.mjs`. Receipt:
`/tmp/tinyaz-c4a2-sol-review/wd-child-term-ignore-89a-source-1/fullglob-gate/result.json`
(stdout SHA
`89a729f8804f94fcbcba84f693515d61b796f1b59b2e2fd1dd0407266ae09465`).
The real-Native group passed under the unchanged 60 s group / 10 s
fixture / 9.5 s horizon / 4 MiB combined bounds: all 14 created direct
handles settled real exit plus BOTH pipe closes, the three collectors
exited 0/0/2 (the last the deliberate EOF), the watchdog lane ran,
errors are empty, listener -> TERM -> reap order held, the collector
input EOF was consumed, and combined evidence is 1,748,598 bytes
(summary SHA
`13bb0d53e1cab0ee90326ca1b395a52d16ea2fba4e05b3d4bfe1591fc2e07f56`).
The earlier actual 344/343/1, 349/348/1, 350/349/1 and 352/351/1
receipts stay preserved failure history below.

Status convention: every "PLANNED, not yet created", "declared before
creation/use", "not yet implemented or verified green", "source-only",
"UNEXECUTED", "UNRUN", "pending Sol verification", ABSENT figure and
dated line/export count in this document is a DATED historical
declaration, not a current absence — all 111 scoped paths and all 35
test owners exist; every CODE/TEST source remains below 400 lines and
the receipt above is the current gate state. The before-use chronology, contracts
and failed/partial diagnostics stay preserved as dated history. C4b
browser capture/numeric parity/preflight, C5 and the ONE approved
64-visit/20-pair/40-game comparison have NOT run and remain open — this
directory's evidence is unit/Native-library evidence only, never a
phase, parity or strength result.

### Actual implementation/export inventory (AST-derived roster)

The JS owners and their actual named exports (identical re-exports
included); the three Python sources stay exactly
`BackendIdentity.helpers` and are outside this JS roster:

| Module | Lines | Actual named exports |
|---|---:|---|
| `artifact-completion-failure.mjs` | 186 | `createCompletionFailureMethods` |
| `artifact-completion.mjs` | 396 | `createStoreCompletionMethods` |
| `artifact-files.mjs` | 312 | `storeFail`, `normRel`, `issueActual`, `openActual`, `ownedFileCloseReceipt`, `confined`, `dirSync`, `tempIn`, `writeAll`, `writeAtomic`, `hashFileRef`, `inspectArtifactRef`, `phaseArtifactRefs` |
| `artifact-owned-file.mjs` | 226 | `createOwnedFileOperations` |
| `artifact-sinks.mjs` | 184 | `openStoreArtifact` |
| `artifact-store.mjs` | gate-enforced | `inspectArtifactRef`, `phaseArtifactRefs`, `createArtifactStore`, `artifactStoreLifetime` |
| `browser-contexts.mjs` | gate-enforced | `createBrowserContexts` |
| `browser.mjs` | gate-enforced | `openBrowser` |
| `browser.test.mjs` | gate-enforced | (TEST entry — no exports) |
| `canonical-json.mjs` | gate-enforced | `canonicalBytes`, `parseCanonicalBytes`, `parseJSONBytes`, `sha256Bytes` |
| `collector-protocol.mjs` | 347 | `collectC2S`, `collectS2C` |
| `completion-file-observation.mjs` | 337 | `observeFailedCompletionFile`, `readPreparedCompletionFile` |
| `completion-prepared-read.mjs` | 248 | `createPreparedCompletionReader` |
| `completion-publication.mjs` | 389 | `prepareCompletionFile`, `publishCompletionFile`, `retainFailedCompletion`, `markPublicationSealed`, `recoverPreparedCompletion`, `readPreparedCompletion` |
| `connected-resource-test-fixtures.mjs` | gate-enforced | `BROWSER_ENV`, `makeBrowserCaps`, `fakePlaywright`, `makeBrowserArgs`, `SERVER_MODEL_BYTES`, `SERVER_META_BYTES`, `makeServerTree`, `makeServerCaps`, `fakeVite`, `makeServerDeps`, `hitFixture`, `ownResourceStart` |
| `driver-protocol.mjs` | 381 | `driverD2S`, `driverS2D`, `bridgeError`, `defer`, `createDriverBridgeActual` |
| `fixture.mjs` | gate-enforced | (browser-side fixture module — `window.__tinyazEval` side effect, no exports) |
| `identity-schema.mjs` | gate-enforced | `assertBackendIdentity`, `assertCommonIdentity`, `assertEnvironment` |
| `native-fixture-admission.mjs` | 375 | `createNativeFixtureAdmission` |
| `native-fixture-io.mjs` | 388 | `createNativeFixtureIO` |
| `native-fixture-protocol.mjs` | 395 | `parseNativeFixtureArgv`, `nativeFixtureFieldsExact`, `runNativeListenerFixture`, `runBlockedHeartbeatFixture`, `createNativeFixtureWaits` |
| `native-fixture.mjs` | 387 | (TEST entry — no exports) |
| `native-normal-test-cases.mjs` | 399 | `runNativeNormalCases` |
| `native-test-fixtures.mjs` | 388 | `createNativeTestHarness` |
| `prerequisites.mjs` | 244 | `verifyReceipt`, `admitPhase`, `verifyInternalSelfTest`, `inspectIncompletePhase` |
| `process-backend-reader.mjs` | gate-enforced | `createBackendReader`, `resolvePythonProcessImage`, `parsePythonVenvConfiguration`, `createBackendIdentityExpectation`, `capturePythonSetupMetadata`, `defaultReadOsBuild` |
| `process-backend.mjs` | 398 | `captureBackendIdentity`, `captureSetupBackendIdentity`, `createMonitorBackendCapture` |
| `process-budget.mjs` | 398 | `captureDeadlineMs`, `createBudgetHandle`, `waitHandle`, `sleepHandle`, `pollHandle`, `createBoundedQueue` |
| `process-framing.mjs` | 89 | `createCollectorFramer` |
| `process-horizon.mjs` | 144 | `assertNativeHorizon`, `createNativeHorizon`, `bindProcessHorizon` |
| `process-lsof-fields.mjs` | 149 | `parseLsofResult`, `lsofError` |
| `process-lsof-io.mjs` | 335 | `createLsofChildIO` |
| `process-lsof-test-fixtures.mjs` | 160 | `lsofFixtureOut`, `createLsofGateFixture`, `finishLsofFixture`, `createListenerProofFixture` |
| `process-lsof.mjs` | 342 | `parseLsofResult`, `createLsofQueries` |
| `process-monitor-test-fixtures.mjs` | 142 | `monitorReadyOptions`, `monitorBootstrapScript`, `createMonitorFixture`, `startMonitorFixture` |
| `process-observation.mjs` | gate-enforced | `readProcessInspections`, `readHelperReadyInspection`, `readLiveWorkloadPids`, `createProcessObservation` |
| `process-ownership.mjs` | 310 | `createOwnership` |
| `process-proof.mjs` | 398 | `createProcessProofs` |
| `process-runtime.mjs` | 398 | `realProcessClock`, `createProcessLifetimeOwner`, `createProcessOperationCapture`, `createProcessRuntime` |
| `process-stop.mjs` | 214 | `createProcessStop` |
| `process-transport.mjs` | 397 | `createCollectorTransport` |
| `processes.mjs` | 399 | `processMonitorLifetime`, `createProcessMonitor` |
| `protocol-values.mjs` | 207 | `fail`, `isObj`, `strNE`, `nat`, `pos`, `isPid`, `isPort`, `isU64`, `isH`, `isIdentity`, `isRel`, `isAbs`, `isRef`, `isListener`, `eq`, `copyDeep`, `exactFields`, `identityKey`, `unique`, `base`, `eventKinds`, `phases`, `rootKinds`, `workloadKinds`, `faultReasons`, `ABI`, `isBsdRow`, `isSample`, `isInspection`, `isProbeResult`, `isQuery`, `poison`, `need`, `envelope` |
| `receipt-files.mjs` | 213 | `confinedRead`, `loadRecord`, `verifyInputRefs` |
| `receipt-verification.mjs` | 383 | `selftestOutcome`, `addClosure`, `verifyReceiptGraph`, `verifyPreparedReceiptGraph`, `consumePreparedVerification` |
| `record-bookkeeping.mjs` | 188 | `createBookkeepingObserver` |
| `record-evidence.mjs` | 221 | `createEvidenceCapture` |
| `record-finalization.mjs` | 291 | `EXIT_CODES`, `UNPROVEN_PROOF`, `structurallyValidProof`, `isCleanupProven`, `validateCheckClaims`, `resolvePhaseChecks`, `deriveSelfTestChecks`, `resolveStatus`, `resolveAnalysisEligible`, `buildFinal`, `buildCompletion`, `buildFinalFromClosedFacts` |
| `record-finalizer.mjs` | 306 | `createRecorderFinalizer` |
| `record-inputs.mjs` | 95 | `captureRecorderInputs`, `captureFinalizationRequest`, `validateFinalizationIntent`, `validateRunningInput` |
| `record-lifecycle.mjs` | gate-enforced | `createRecorderLifecycle` |
| `record-schema.mjs` | 302 | `BASELINE_COMMIT`, `FIXED_LIMITS`, `MODEL_IDENTITY`, `PROTOCOL_IDS`, `REQUIRED_CHECK_IDS`, `REQUIRED_PARENT_PHASES`, `assertArtifactRef`, `assertProcessIdentity`, `assertBackendIdentity`, `assertCommonIdentity`, `assertRecord` |
| `records.mjs` | gate-enforced | `writeWorkspaceOnce`, `phaseRecorderLifetime`, `createPhaseRecorder` |
| `schema-constants.mjs` | 144 | `PHASES`, `RECORDED_PHASES`, `EVENT_KINDS`, `BASELINE_COMMIT`, `REQUIRED_CHECK_IDS`, `REQUIRED_PARENT_PHASES`, `PROTOCOL_IDS`, `MODEL_IDENTITY`, `FIXED_LIMITS`, `PYTHON_MODULES`, `FIXTURE_PATHS`, `PYTHON_IMPORTS`, `PYTHON_EXECUTABLE`, `PYTHON_PREFIX`, `PYTHON_VERSION` |
| `schema-primitives.mjs` | 133 | `schemaFail`, `freezeDeep`, `isPlainObject`, `isRelPath`, `CHECK`, `arr`, `oneOf`, `shape`, `exactOnly`, `deepEqual`, `eqLiteral`, `sortedUnique`, `assertArtifactRef`, `assertProcessIdentity`, `sortedRefs` |
| `server.mjs` | gate-enforced | `startFixtureServer` |
| `server.test.mjs` | gate-enforced | (TEST entry — no exports) |
| `environment.mjs` | gate-enforced | `captureEnvironment`, `verifyEnvironment` |
| `environment-files.mjs` | gate-enforced | `createEnvironmentFiles` |
| `environment-python.mjs` | gate-enforced | `capturePythonEnvironment` |
| `environment-python-evidence.mjs` | gate-enforced | `readPythonEnvironmentEvidence` |
| `environment-python-program.mjs` | gate-enforced | `AUDIT_SCRIPT`, `PIP_RUNNER` |
| `environment-test-fixtures.mjs` | gate-enforced | `makeEnvironmentFixture`, `runPythonAuditValidatorCases` (TEST-only) |
| `environment.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `setup-process-actual.mjs` | gate-enforced | `armSetupReceipt`, `adoptSetupHandle` |
| `setup-process.mjs` | gate-enforced | `runSetupCommand` |
| `snapshots.mjs` | gate-enforced | `captureInputs`, `reopenInputs`, `verifyIdentity` |
| `snapshot-files.mjs` | gate-enforced | `RUNTIME_PATHS`, `createSnapshotFiles` |
| `snapshot-io.mjs` | gate-enforced | `createSnapshotIO` |
| `snapshot-identity.mjs` | gate-enforced | `validateModelBytes`, `inventoryDigest`, `assembleSnapshotIdentity` |
| `snapshots.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `run.mjs` | gate-enforced | `bootstrapWorkspace`, `runSupervisor`, `runDriver` |
| `cli.mjs` | gate-enforced | (CLI entry, no exports) |
| `run-supervisor.mjs` | gate-enforced | `executeSupervisor` |
| `run-driver.mjs` | gate-enforced | `executeDriver` |
| `phase-runners.mjs` | gate-enforced | `runPhase` |
| `checks.mjs` | gate-enforced | `runChecks` |
| `check-engine.mjs` | gate-enforced | `checkEngine` |
| `check-workbench.mjs` | gate-enforced | `checkWorkbench` |
| `match-observations.mjs` | gate-enforced | `validateArmReady`, `validateArmTurn` |
| `reference-child.mjs` | gate-enforced | `runPythonReference` |
| `parity-reference.py` | gate-enforced | (private Python entry) |
| `phase-runners.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `checks.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `run.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `watchdog-prior-evidence.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `watchdog-parent-admission-test-fixtures.mjs` | gate-enforced | `capturePriorReceiptProbes`, `awaitEvidenceEntry` (TEST-only) |
| `operational-test-fixtures.mjs` | gate-enforced | `makeOperationalFixture` (TEST-only) |
| `vite-test-fixtures.mjs` | gate-enforced | `fakeVite` (TEST-only) |
| `environment-files.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `page-arm.mjs` | gate-enforced | `createPageArm` |
| `page-arm.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `match.mjs` | gate-enforced | `playGame`, `createGameCheckpoint` |
| `match.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `pgn-evidence.mjs` | gate-enforced | `createPgnEvidence` |
| `pgn-format.mjs` | gate-enforced | `checkpointResult`, `serializeCheckpointPgn`, `replayCheckpointPgn` |
| `pgn-summary.mjs` | gate-enforced | `deriveFinalGameEvidence` |
| `pgn-evidence.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `pgn-summary.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `snapshot-reopen.mjs` | gate-enforced | `inspectReopenedInputs` |
| `phase-fixtures.mjs` | gate-enforced | `validateProtocolFixture`, `validateOpeningFixture`, `buildGameSchedule`, `validateGameSchedule` |
| `phase-fixtures.test.mjs` | gate-enforced | (TEST entry, no exports) |
| `stats.mjs` | 262 | `signProbability`, `clopperPearson95`, `summarizePairs` |
| `supervision-test-fixtures.mjs` | 399 | `identity`, `identityKeyOf`, `bsdRow`, `frame`, `sampleReply`, `fakeClock`, `fakeFile`, `fakeFileSystem`, `fakeBinStream`, `fakePipe`, `fakeChild`, `fakeFailedSpawnChild`, `collectorFixture` |
| `supervisor-protocol.mjs` | 210 | `IPC_LIMITS`, `TIMING_LIMITS`, `RESOURCE_LIMITS`, `createProtocolValidator` |
| `test-fixtures.mjs` | 393 | `assertRejectCode`, `H`, `ref`, `identity`, `fixtureCommonIdentity`, `copy`, `hashOf`, `fixtureWorkspace`, `fixtureManifest`, `fixtureRunning`, `proof`, `makeTmpDir`, `makeStore`, `verifyCallbacks`, `makeRecorder`, `writeFixtureInputs`, `makeWorkspace`, `runReceiptPhase` |
| `watchdog-child-test-fixtures.mjs` | 398 | `forkDriverFixture`, `createObservedDriver`, `drivers`, `liveStart`, `closeFacts`, `FINISH`, `closeDriverFacts`, `cleanupMonitorFixture`, `SUP`, `COL`, `fixture`, `instrumentRecorderFs` |
| `watchdog-cleanup-test-fixtures.mjs` | 391 | `row`, `ROWS`, `OBS`, `args`, `closeDriverFacts`, `drivers`, `SUP`, `COL`, `fixture`, `advanceBy`, `drive`, `makeArgs`, `makeEvidenceWorkspace` |
| `watchdog-cleanup.mjs` | 348 | `createCleanupController` |
| `watchdog-config.mjs` | 373 | `captureWatchdogRuntimeConfig`, `createWatchdogOperationContext`, `createWatchdogAwaiter` |
| `watchdog-drain-test-fixtures.mjs` | 379 | `yieldTurn`, `heldGate`, `createRunDrainBinding`, `drain`, `advanceBy`, `issueFixtureBody`, `drive`, `watchdogTestClock`, `liveStart`, `closeFacts`, `FINISH` |
| `watchdog-driver-actual.mjs` | 296 | `driverError`, `createDriverActualScope`, `finishDriverActualScope`, `beginDriverActualAttempt`, `observeDriverPhysicalChild` |
| `watchdog-driver-test-fixtures.mjs` | 264 | `forkDriverFixture`, `createObservedDriver`, `drivers`, `watchdogTestClock` |
| `watchdog-driver.mjs` | 392 | `createDriverActualScope`, `finishDriverActualScope`, `createDriverChannel` |
| `watchdog-evidence-test-fixtures.mjs` | 397 | `gateFs`, `verifyReceipt`, `makeEvidenceWorkspace`, `makePreflightRun` |
| `watchdog-fs-test-fixtures.mjs` | 326 | `disposeFixture`, `ownFixtureAttempt`, `registerFixtureTeardown`, `gateFs` |
| `watchdog-lifetime.mjs` | gate-enforced | `assertWatchdogLifetime`, `createWatchdogLifetime`, `observeAwaitStage`, `reportStoppedFault` |
| `watchdog-operations.mjs` | 382 | `createWatchdogOperationContext`, `createWatchdogOperations` |
| `watchdog-ordinary.mjs` | 89 | `createWatchdogOrdinaryQueue` |
| `watchdog-records-test-fixtures.mjs` | 397 | `observeRecorderFixtureClosure`, `settleRecordCleanup`, `setupRecordAdapter`, `registerCleanup` |
| `watchdog-records.mjs` | 314 | `createWatchdogRecordAdapter` |
| `watchdog-run-test-fixtures.mjs` | 361 | `createRunDrainBinding`, `drain`, `heldGate`, `yieldTurn`, `row`, `OBS`, `closeFacts`, `FINISH`, `liveStart`, `setupRun` |
| `watchdog-runtime.mjs` | 380 | `captureWatchdogRuntimeConfig`, `runWatchdogLifecycle` |
| `watchdog-shutdown.mjs` | 368 | `createWatchdogShutdown`, `createWatchdogCleanupArgs` |
| `watchdog-teardown-test-fixtures.mjs` | 353 | `registerFixtureTeardown`, `disposeFixture`, `ownFixtureAttempt`, `observeSelectedReceiptMetadata`, `observeDriverBegun`, `observeFixturePromise`, `captureFixtureThrow` |
| `watchdog-test-fixtures.mjs` | 339 | `forkDriverFixture`, `watchdogTestClock`, `cleanupMonitorFixture`, `instrumentRecorderFs`, `watchdogRecordWorkspace`, `assembleOwnedWatchdogCheckWorkspace`, `closeOwnedWatchdogWorkspace`, `removeOwnedWatchdogWorkspace`, `row`, `OBS`, `observeRecorderFixtureClosure` |
| `watchdog.mjs` | 376 | `createWatchdog` |
| `workspace-footprint.mjs` | gate-enforced | `createFootprintObserver`, `describeFootprintFailure` |
| `workbench-fixture.mjs` | 17 | (browser-side fixture module — mounts `Workbench`, no exports) |

The roster above is the C4a2-era AST-derived roster, historical to the
accepted C4b base `41d5bf36bae8bfd1759a664953b45ce9ac389c5c`. C4b-01
(declared before creation on NEW branch `feat/tinyaz-browser-harness`
under scope `c4b-scope-01-driver-bridge.json`, global 113 / active 4,
canonical map 210 -> 212) adds exactly one functional-runtime source and
one TEST-only suite: `driver-bridge.mjs` (sole export
`createDriverCapabilities`, contract below) and `driver-bridge.test.mjs`
(no exports; excluded from the functional-runtime input union). C4b-02
(scope `c4b-scope-02-readable-bridge.json`, global 115 / active 6 / map
212 -> 214) is Root's approved concrete three-owner capacity correction:
actual01's expanded-740 facade was interrupted mid-compression (manager
SIGINT, exit 1/677.484 — NOT complete; the condensed 654/669 is NOT
accepted), so the facade is restored to the full expanded 740 and stays
KnownOversize/NOT_PREPARED until the immediate facade+test integration
pass, while two new private leaves `driver-bridge-wire.mjs` and
`driver-bridge-methods.mjs` (both functional-runtime input) carry the
WHOLE wire/dispatch and ordinary-method bodies under the C4b-02
sections below — and `driver-bridge.test.mjs` remains ABSENT (declared
before creation). All are UNEXECUTED — a foundation only, never a
browser-evaluation phase pass, parity or strength result. C4b-03 (scope
`c4b-scope-03-bridge-integrated.json`, global 116 / active 7 / map 214
unchanged — `driver-protocol.mjs` activated, no new row) is the
integrated current state: `driver-protocol.mjs` gained the identical
`bridgeError`/`defer` helpers (exports4, protocol never imports any
bridge), `driver-bridge-wire.mjs` re-exports them identically while
keeping EXACT3, the facade `driver-bridge.mjs` is integrated over the
SAME ctx6 with the declared start/finish/close/AbortSignal corrections,
and `driver-bridge.test.mjs` is created TEST-only pure-fake coverage —
all still UNEXECUTED, no green claim. C4b-04 (scope
`c4b-scope-04-whole-bridge-capacity.json`, global 118 / active 9 /
map 214 -> 216) is the whole-bridge capacity correction: prior03
authored the partial facade289/methods371/protocol339/wire429
sources and the expanded original thirteen-test source571 —
actual03 then ended on manager SIGINT (exit 1/400.053) during the
rejected 536/477 compression after comma-expression unsubscribers
and repeated tight test rewrites, zero author target execution
calls — so the FULL original thirteen-test source571 is restored
first and the rejected 536/477 compressions are never the base.
`driver-protocol.mjs` gains the
pure private `createDriverBridgeActual({state:st,transport}) ->
frozen {retainBody,joinActual}` factory (exports5 — the WHOLE
31-line block moved byte-exact from the wire leaf including
comments), the wire instantiates it once over the same refs and
keeps EXACT3 plus its frozen EXACT15, and the suite splits WHOLE —
`driver-bridge.test.mjs` keeps the first ten original cases while
new TEST-only `driver-bridge-test-fixtures.mjs` (EXACT9 shared
fixture exports with explicit TestContext teardown) and
`driver-bridge-lifecycle.test.mjs` (the whole final three cases)
are declared before creation — all still UNEXECUTED, no green
claim. C4b-05 (scope
`c4b-scope-05-final-bridge-causality.json`, same 118 / active 9 /
map 216, no new path/API/owner/authority) completes the green
bridge foundation: the dated actual04 receipt ran
`driver-bridge.test.mjs` 10/10,
`driver-bridge-lifecycle.test.mjs` 3/3,
`supervisor-protocol.test.mjs` 16/16 and
`supervisor-protocol-lifecycle.test.mjs` 12/12, all exit0 with
zero warnings/stderr/timeout and exact 37-file hash closure — the
352-case C4a2 Native fullglob stays earlier pre-C4b evidence. The
test-only strengthening proves the held-body case's real gate
entry before stop and close waiting on the held body
independently of the closed callback, every original
assertion/order/literal preserved, plus a fixture header comment
clarity fix only — now COMPLETED: Main ran the affected whole
owner `node --test
train/scripts/browser_eval/driver-bridge-lifecycle.test.mjs` on
the fresh immutable 37-file static-cleared source closure —
exit0/0.1130 s, tests 3 / pass 3 / fail 0 / cancel 0 / skip 0,
warnings [], stderr 0, timeout false, hashes exact after; the
05 source closed exit0/107.337 with marker-triggered owned
SIGINT (never a natural exit). Dated actual04 receipts and the
pre-C4b Native 352 stay dated history — no fresh
fullglob/Native/phase/run/cohort validation; the remaining C4b
CLI/server/browser/snapshot/check/parity/preflight/comparison
stay unimplemented and unexecuted. C4b-07 (scope
`c4b-scope-07-bridge-pull-fence.json`, same 118 / active 9 /
map 216 — no new path/API/owner/authority/clock/budget) closes
the ONE production gap the final code-doc comparison found:
`driver-bridge-methods.mjs` (371 -> 375) gains exactly two
`wire.admissible()` guards inside `pull` — immediately BEFORE
the retained `iterator.next` and immediately AFTER the awaited
successful raw outcome before returning its value — so a stop
arriving while a next is pending can never let its late value
initiate a second pull or a late frame (`out.threw` still
rethrows the exact `out.value`; the neutral actual receipt and
lifetime retainer are unchanged). The lifecycle owner (180 ->
218) appends the meaningful causal regression `stop during the
first iterator pull admits no second pull or artifact frame` —
fourteen driver cases total (main 10 / lifecycle 4), all
thirteen original names/assertions preserved. Bundled
descriptive clarification only: fresh artifact/record IDs
reject concurrently-active path reuse and closed-ID reuse — a
completed path may bind a fresh artifactId (implementation and
canonical validator unchanged; needed for the already-approved
alternating PGN slots). COMPLETED actual07 gate: Main ran the
two changed whole owners — `node --test --test-concurrency=1
train/scripts/browser_eval/driver-bridge.test.mjs` -> 10/10
pass, exit0/0.0805 s, and `node --test --test-concurrency=1
train/scripts/browser_eval/driver-bridge-lifecycle.test.mjs`
-> 4/4 pass, exit0/0.0801 s, zero fail/cancel/skip, warnings
[], stderr 0, timeout false, current 37-file hash closure
exact after; the meaningful old-body RED proof ran the
immutable controlled prior methods371 against the current
lifecycle218 — 4 cases, 3 pass / 1 fail, only the new case
failing actual 2 != expected 1, 0 cancel/skip/warnings/stderr/
timeout — expected old-body red, never Native/phase/green
evidence. The 07 source closed exit0/213.021 with
marker-triggered owned SIGINT (never a natural exit). The
final bridge foundation is implemented and unit-validated —
READY for Main green commit, not yet committed or published;
the remaining C4b
static-identity/snapshot/CLI/server/browser/check/parity/
preflight and the ONE approved comparison stay unimplemented
and unrun, the earlier 352-case C4a2 Native fullglob stays
pre-C4b dated evidence, the dated actual04/actual05 receipts
stay dated history, and no fresh fullglob/Native/phase/
browser/Elo/cohort claim is made. C4b-09 (scope
`c4b-scope-09-static-backend-identity.json`, global 119 /
active 14 / map 216 -> 217, declared before creation/use on
the committed bridge foundation at
`63c8923c9d218a983276c6c0d01d16534160257e`) implements the
approved static backend identity / manifest-first startup
coupling repair: `process-backend-reader.mjs` gains the two
pure data helpers `parsePythonVenvConfiguration` (strict
pyvenv.cfg fields, closed-failure) and
`createBackendIdentityExpectation` (undefined-only null,
frozen full-eight-field snapshot plus pure
`assertMatches`); `process-backend.mjs` exports EXACT3 —
the original verified-ready `captureBackendIdentity`
unchanged plus `captureSetupBackendIdentity` (bounded
static setup capture through the SAME owned reader, NO
ready arg, never a forged envelope) and the pure
`createMonitorBackendCapture` factory (`capture` +
nullable `verifyStartup` over the genuine entry, never an
injected callback); `processes.mjs` takes the optional
data-only `expectedBackendIdentity` validated before the
bound getter/any IO and binds only the private trusted
`authority.verifyExpectedBackend`; `process-runtime.mjs`
awaits that same-factory comparison AFTER real awaitReady
and genuine Native proveBootstrap, BEFORE every
ownUid/ready/lsof/timer/first-cycle/start commit, on the
SAME start handle and `ownOperation` retainer. New TEST-only
`process-backend-setup.test.mjs` (excluded from the
functional-runtime union) covers the parse/bind
closed-failure matrix, pre-IO rejections, snapshot
immunity and match/mismatch under a borrowed handle — all
platform fakes isolated, no pass/Native/phase claim.

| Module | Exports | Boundary |
| ------ | ------- | -------- |
| [canonical-json.mjs](./canonical-json.mjs) | `canonicalBytes`, `parseCanonicalBytes`, `parseJSONBytes`, `sha256Bytes` | One canonical byte codec and hash utility. No IO. |
| [record-schema.mjs](./record-schema.mjs) | `REQUIRED_CHECK_IDS`, `REQUIRED_PARENT_PHASES`, `PROTOCOL_IDS`, `MODEL_IDENTITY`, `BASELINE_COMMIT`, `FIXED_LIMITS`, `assertRecord`, `assertArtifactRef`, `assertProcessIdentity`, `assertCommonIdentity`, `assertBackendIdentity` | Single closed-envelope schema/constant owner (re-exports its private helper owners). |
| [schema-primitives.mjs](./schema-primitives.mjs) | private helpers only | Strict primitive/closed-shape/path/ref/identity checks and bounded schema failures. No schema/constants back-import. |
| [schema-constants.mjs](./schema-constants.mjs) | private helpers only | Frozen pin/check/phase/limit/protocol declarations; storage only, re-exported by record-schema.mjs. |
| [identity-schema.mjs](./identity-schema.mjs) | `assertBackendIdentity`, `assertCommonIdentity`, `assertEnvironment` | Executable/Python/backend/environment/CommonIdentity validation over primitives/constants. |
| [artifact-files.mjs](./artifact-files.mjs) | private helpers only | Confined paths, durable atomic file primitives, bounded streaming artifact hashing/inventory. The unsupported-directory directory-sync compatibility covers only the open/sync issuance — every adopted handle owes a genuinely observed real close whose rejection propagates with its retained debt. R4 corrective (declared before use): private `ownedFileCloseReceipt(ownedFile) -> Promise<void>` returns only the SAME already-existing close-debt promise bound by module-private WeakMap to a genuine constructor-produced OwnedFile — forged/spread/proxy aliases reject, no new receipt/queue/clock/ledger/status/resolver is created or resolved, the OwnedFile method roster stays exactly `stat`/`read`/`write`/`sync`/`close`, actual close success alone fulfills and the first error stays retained; raw-open registration/issuance state is held internally so only an internally observed pre-issuance/no-resource path retires never-opened debt — a generic raw-open rejection or missing returned handle is never no-creation proof, with no caller flag, error-code certificate or fake close. Corrective 55 (declared before use — not yet implemented or verified green): ONE module-private strong Set of raw-resource entries `{handle, owned}` — each raw returned resource is added IMMEDIATELY after open resolves BEFORE shape validation, the minted OwnedFile is pinned on the same entry, and the entry is removed ONLY after the actual raw close succeeds just before/with the SAME `settleClose`/`closeDebt`; unknown/unadoptable/failed-close stays strongly owned, and the WHOLE `normRel` path predicate delegates to existing `schema-primitives.isRelPath` preserving the FIRST empty/type `STORE_PATH` error priority/message plus every later path check — no exported registry/drain/resolver/status/caller flag/second ledger, no OwnedFile method or getter change, no new IO path, and the Parent strong capability/resource associations remain required, not replaced. Corrective 57 (declared before use — not yet implemented or verified green): the WHOLE OwnedFile owner — `isFileHandle`, the genuine-OwnedFile identity/receipt WeakMap, the strong raw-resource `{handle, owned}` Set, `openActual` and `ownedFileCloseReceipt` plus their full comments — moves to [artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated) `createOwnedFileOperations({issueActual, storeFail})`, instantiated ONCE here with the returned functions re-exported as IDENTICAL references under the same names; `OwnedFile.close` owns ONE cached flow of at most TWO total raw-close attempts per handle joined by every repeated/concurrent/outer-retry call to the SAME prearmed closeDebt — superseding the earlier instant-reject-then-outer-retry wording, which stays preserved history. |
| [artifact-owned-file.mjs](./artifact-owned-file.mjs) | `createOwnedFileOperations` (SOLE private export) | created — the corrective-57 before-creation declaration is dated history. Whole OwnedFile owner extracted from artifact-files.mjs: the pure factory `createOwnedFileOperations({issueActual, storeFail}) -> frozen {openActual, ownedFileCloseReceipt}` captures TWO trusted ArtifactFiles bindings and invokes nothing; ArtifactFiles instantiates it ONCE and re-exports the IDENTICAL returned references under the same names — signatures `openActual(retainActual, issueOpenThunk)`/`ownedFileCloseReceipt(genuineOwnedFile)` and the `stat`/`read`/`write`/`sync`/`close` roster unchanged. `OwnedFile.close` owns ONE cached flow of at most TWO total raw-close attempts per handle joined by every repeated/concurrent/outer-retry call to the SAME prearmed closeDebt; an issued-open rejection or unadoptable return awaits its OWN closeDebt before error — never a completed-leaf failure. See [artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated). Functional runtime input. |
| [record-finalization.mjs](./record-finalization.mjs) | private helpers only | Pure canonical final/check-evidence/completion construction and eligibility helpers. Corrective 56 (declared before use — not yet implemented or verified green): adds the pure synchronous `buildFinalFromClosedFacts` aggregation over the EXACT 11-fact closed bundle (the nine `finalInputs` facts plus the Records-obtained `artifactRefs`/`eventsRef`) with the WHOLE canonical copy, own byPath Map and WHOLE existing pure claims/checks/fault/status/analysis/buildFinal/assertRecord logic preserved — the planned record-inputs.mjs leaf imports only the pure `EXIT_CODES` here, no backedge. |
| [protocol-values.mjs](./protocol-values.mjs) | private helpers only | Stateless closed driver/collector/native field validators and shared predicates/constants. |
| [driver-protocol.mjs](./driver-protocol.mjs) | private helpers only | Driver message transitions over the supervisor-owned run state/ID authority. C4b-03: gains the shared `bridgeError`/`defer` helpers moved WHOLE byte-exact from the wire leaf (exports4; wire imports and re-exports the IDENTICAL functions); protocol never imports any bridge module. C4b-04: gains the pure private `createDriverBridgeActual({state:st,transport}) -> frozen {retainBody,joinActual}` factory — the WHOLE 31-line retainBody/joinActual block moved byte-exact from the wire leaf including all comments over the SAME `st.actual` receipt Set and trusted transport (exports5); the wire instantiates it once and exposes the identical refs inside its unchanged frozen EXACT15; protocol still never imports any bridge module. |
| [collector-protocol.mjs](./collector-protocol.mjs) | private helpers only | Collector/teardown message transitions over the same supervisor-owned authority. |
| [artifact-store.mjs](./artifact-store.mjs) | `createArtifactStore`, `inspectArtifactRef`, `phaseArtifactRefs` | Confined async artifact IO under one workspace root. R4 (declared before use): optional trusted `lifetime` binds the EXACT owner (or an owned default), `artifactStoreLifetime` returns only that association, and `prepareCompletion`/`publishPreparedCompletion`/`containPreparedCompletion` own the prepared-temp publication transaction. Corrective 55 (declared before use — not yet implemented or verified green): those three methods are attached ONCE to the SAME frozen store from the pure `createStoreCompletionMethods(completionContext)` factory in [artifact-completion.mjs](#artifact-completionmjs-exists--r4-declaration-dated) over the EXACT 18-field borrowed/Store-owned context; the genuine facade/getter stays sole owner and the exact signatures/returns are unchanged. Corrective 57 (declared before use — not yet implemented or verified green): inside that attached trio the WHOLE first-primary/containment/failure-recovery/held-safe flow delegates further to [artifact-completion-failure.mjs](#artifact-completion-failuremjs-exists--r4-declaration-dated) `createCompletionFailureMethods`, and the universal OwnedFile physical-close boundary lives in [artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated); this Store keeps the same facade/getter sole identity. |
| [artifact-sinks.mjs](./artifact-sinks.mjs) | `openStoreArtifact` | created (before-creation declaration dated). Whole `openArtifact`/sink lifecycle over the store's ONE frozen `storeContext`; no sink-local queue/budget/clock. Functional runtime input. |
| [completion-file-observation.mjs](./completion-file-observation.mjs) | `observeFailedCompletionFile`, `readPreparedCompletionFile` (EXACTLY TWO private exports) | created — corrective 53 (dated before-use declaration) supersedes the earlier SOLE-export/single-observer wording, which stays preserved history. Completion-file observation leaf for completion-publication.mjs covering BOTH failed preservation and bounded prepared readback — the WHOLE prepared-file read plus its responsibility comments delegates here from parent `readPreparedCompletion` over the SAME `{writer,failedReader}` slots and ONE shared acquisition-uncertainty latch while the parent keeps its six exports and sole capability/owner/stage/cause/publication/recovery/seal authority. Bounded 64 KiB streaming/hash under the pinned intended-byte ceiling, stable original `{dev,ino}` identity across the actual close, fresh post-close temp stat, required dirsync and fresh canonical-absence proof — a contained `{failedTemporaryPath,failedTemporaryRef}` requires genuinely fulfilled original/reader close receipts and is never produced for a lost/replaced/unknown original or an outstanding handle; `readPreparedCompletionFile` returns the SAME frozen seven-field `PreparedRead` — never published VerifiedEvidence, no verification-token authority. Corrective 54 (declared before use — the declared leaf is not yet created, implemented or verified green): the WHOLE prepared-reader routine and comments move FURTHER into completion-prepared-read.mjs — this module calls its SOLE pure export `createPreparedCompletionReader({acquireReader})` ONCE at module composition with its own PRIVATE `acquireReader({retain,tempAbs,ownedFiles})` closure (the SAME actual acquisition/latch path serving BOTH reader paths) and re-exports the returned stable function as the DIRECT constant alias `readPreparedCompletionFile`; roster stays EXACTLY TWO, parent stays SIX, no caller-selectable override, and the corrective-53 prepared-read 'delegates here' phrasing above stays preserved history. DAG CompletionPublication -> CompletionFileObservation -> CompletionPreparedRead -> ArtifactFiles plus CompletionFileObservation -> ArtifactFiles, never reversed and never to Store/Graph. Functional runtime input. |
| [completion-prepared-read.mjs](./completion-prepared-read.mjs) | `createPreparedCompletionReader` (SOLE private export) | created — corrective 54 (dated before-creation declaration). Whole prepared-completion-reader owner extracted from completion-file-observation.mjs: the WHOLE prepared-read routine plus its responsibility comments move here preserving every guard/comment and original result/error semantics, adapting only the lexical acquisition dependency. Pure trusted factory — captures and validates the supplied trusted `acquireReader` immediately at construction, invokes nothing, creates no IO/queue/clock/timer/hold/ledger or mutable dependency/result object; the returned stable `readPreparedCompletionFile` takes EXACTLY the ten-fact object `{workspaceRoot,phaseDirectory,canonicalRel,tempAbs,tempRel,fileId,byteLength,sha256,io,ownedFiles}` and returns Promise of the SAME frozen seven-field `PreparedRead` — descriptive readback only, never published VerifiedEvidence/receipt/token/status, no callbacks in the caller's ten-fact object. `acquireReader` is observation's module-private actual-acquisition closure shared by BOTH reader paths over the ONE uncertainty latch, bound ONCE at pure module composition and re-exported there as a direct constant alias — never a permissive mock or caller-selectable override; each returned OwnedFile brand is validated via `ownedFileCloseReceipt` before reliance so a forged lookalike cannot yield positive readback. First-close-fault repair: handler armed on the SAME genuine close receipt BEFORE close captures the FIRST arbitrary close rejection (null/undefined included); absent a read failure, ANY failed close attempt rethrows that exact FIRST close error even if a later real close physically settled — failedReader clears ONLY on genuine receipt fulfillment, so a positive prepared read never loses a close fault. Exact bigint dev/ino/mtimeNs, pre-await identity snapshot, EXACT-64-lowercase sha256 before effects, owned Buffer/read-error retention, fresh post-close FULL regular/dev+ino/size/mtimeNs/count/hash stat. Imports only node fs/crypto plus actual artifact-files primitives. DAG CompletionPublication -> CompletionFileObservation -> CompletionPreparedRead -> ArtifactFiles plus CompletionFileObservation -> ArtifactFiles; no Observation/Parent/Store/Graph/Recorder back-import or cycle, same io/retainActual and genuine OwnedFile/closeDebt. Functional runtime input. |
| [completion-publication.mjs](./completion-publication.mjs) | `prepareCompletionFile`, `publishCompletionFile`, `retainFailedCompletion`, `markPublicationSealed`, `readPreparedCompletion`, `recoverPreparedCompletion` | created (before-creation declaration dated). Opaque `PreparedCompletion` capability, fixed canonical rename/dirsync, owned-entry failed-temp containment (the WHOLE failed-temp observation delegates to completion-file-observation.mjs over the same parent-private `{writer,failedReader}` resource slots, each pinned before further await and never overwriting an unclosed original; strong entry/resource retention holds from before acquisition through seal or truthful containment independently of nonextensible error properties — error attachment is optional diagnostic only, never sole recovery; genuine close receipts, required sync and proven canonical absence before any contained mark; a null failed ref requires a genuinely closed reader with original ownership proven) and branded temp readback — corrective 53 (declared before use): the WHOLE prepared-read implementation also delegates to completion-file-observation.mjs `readPreparedCompletionFile` over the same `{writer,failedReader}` slots and the shared acquisition-uncertainty latch while this parent keeps its exact six exports, validates the genuine prepared stage, copies the private input snapshots, retains the first thrown operation fault on the same entry and rethrows the original error channel. Functional runtime input. |
| [artifact-completion.mjs](./artifact-completion.mjs) | `createStoreCompletionMethods` (SOLE private export) | created — corrective 55 (dated before-use declaration). Pure frozen factory returning the Store's `{prepareCompletion, publishPreparedCompletion, containPreparedCompletion}` trio over the EXACT 18-field `completionContext` (borrowed Store closures/Sets plus Store-owned `storeOwner`/`io`/`retainFinalizerUntil`/strong phase Map/prepared WeakMap/synchronous `sealPhaseCore`); ONE continuous owner hold armed before any effect through genuine seal or truthful containment, once-enqueued public methods with direct same-queue contain/seal calls, actual Graph/Parent bindings with a fresh `new Map()` memo per real verifyReceiptGraph call, protected retained failed temp and conservative at-most-once full-reservation reconcile. Corrective 57 (declared before use — not yet implemented or verified green): the WHOLE retainEntryPrimary/containCore/failure-recovery/held-safe flow delegates further to [artifact-completion-failure.mjs](#artifact-completion-failuremjs-exists--r4-declaration-dated) `createCompletionFailureMethods` while this facade keeps the same trio/context/seal/phase authority. Functional runtime input. |
| [artifact-completion-failure.mjs](./artifact-completion-failure.mjs) | `createCompletionFailureMethods` (SOLE private export) | created — corrective 57 (dated before-use declaration). Whole completion failure/containment owner extracted from artifact-completion.mjs: the pure factory `createCompletionFailureMethods({storeOwner, postAccounting, reconcile, immutable, activePaths, completionByPrepared, markIoFault}) -> frozen {retainPrimary, containCore, failAfterContainment}` captures EXACTLY seven borrowed bindings from the SAME 18-field `completionContext` and invokes nothing — direct same-queue `containCore` (never public enqueue/self-wait), sealed guard BEFORE any cause/registry mutation, genuine same-cap contained idempotence, per-entry `safeSettlement` awaited BEFORE the required operation rejects, and the SAME shared `markIoFault` latched by actual required IO while owned cleanup still runs despite sticky `usable`. See [artifact-completion-failure.mjs](#artifact-completion-failuremjs-exists--r4-declaration-dated). Functional runtime input. |
| [records.mjs](./records.mjs) | `writeWorkspaceOnce`, `createPhaseRecorder`, `phaseRecorderLifetime` | Sole supervisor writer/state machine; delegates bytes/schema/IO. R4 (declared before use): `bindRuntime`, `closeEvidenceBeforeCutoff`, `sealClosedEvidence` and the `buildFinalFromClosedFacts` delegation. Corrective 56 (declared before use — not yet implemented or verified green): `bindRuntime` binds once BEFORE FIRST RECORDER USE, canonical snapshots/input guards delegate to the planned record-inputs.mjs pure leaf, evidence capture returns void and the private `{capture, finishClosedEvidence, finalInputs}` roster stays Records-only — the exact A-settles-before-B/late-fence/close-all contract is the corrective-56 block in [records.mjs](#recordsmjs). Corrective 58 (declared before use — not yet implemented or verified green): the optional `onBookkeepingSettlement` observer binds the exact five-field descriptive payload, once-only truthful post-settlement notification and best-effort `process.emitWarning` fallback declared in the corrective-58 block in [records.mjs](#recordsmjs). Corrective 59 (declared before use — not yet implemented or verified green): that WHOLE descriptive observer responsibility delegates to the planned [record-bookkeeping.mjs](#record-bookkeepingmjs-exists--r4-declaration-dated) pure leaf; the 58 semantic binding is unchanged and records.mjs keeps sole call-placement authority. Corrective 60 (declared before use — not yet implemented or verified green): the WHOLE private finalization/binding pipeline — the expanded private A/B bodies, the four `bindRuntime`/`closeEvidenceBeforeCutoff`/`sealClosedEvidence`/`finalize` methods, the private binding/caches and the private actual-A `captureSettled` seal guard — delegates to the planned [record-finalizer.mjs](#record-finalizermjs-exists--r4-declaration-dated) pure leaf whose EXACT4 returned methods stay IDENTICAL facade references; the 56/58/59 bindings are unchanged and records.mjs keeps sole writer/state/status/close/lifecycle/WeakMap authority. |
| [record-evidence.mjs](./record-evidence.mjs) | `createEvidenceCapture` | created (before-creation declaration dated). Mandatory verifier invocation and immutable `ClosedEvidence` capture under the original cutoff; no writer/status authority. Corrective 56 (declared before use — not yet implemented or verified green): the factory returns ONLY the private frozen `{capture, finishClosedEvidence, finalInputs}` roster held inside records.mjs — `capture({running, request, claims, deadlineMonoMs}) -> Promise<void>`, NO-ARG `finishClosedEvidence` only after ALL actual sink closes, NO-ARG `finalInputs` exact-nine frozen facts; the dated `capture({..., prerequisites, expectedSelfTest, ..., closeAdmission}) -> Promise<ClosedEvidence>` declaration is superseded history. Functional runtime input. |
| [record-inputs.mjs](./record-inputs.mjs) | `captureRecorderInputs`, `captureFinalizationRequest`, `validateFinalizationIntent`, `validateRunningInput` | created — corrective 56 (dated before-creation declaration). Whole pure-input leaf owning ONLY canonical snapshots and the unchanged pure input/schema guards moved whole out of records.mjs — validates/snapshots only, no state/writer/status/IO authority; imports canonical-json.mjs, record-schema.mjs and the pure `EXIT_CODES` from record-finalization.mjs only. Functional runtime input. |
| [record-bookkeeping.mjs](./record-bookkeeping.mjs) | `createBookkeepingObserver` (SOLE private export) | created — corrective 59 (dated before-creation declaration). Whole optional bookkeeping-observer owner extracted from records.mjs: the pure factory `createBookkeepingObserver({runId, phase, nowMonoMs, onBookkeepingSettlement}) -> frozen {observeCaptureClosed, notifySettled}` validates and captures FOUR trusted fixed values at pure construction — no clock/callback/IO — and owns the WHOLE corrective-58 descriptive time capture, safe arbitrary-error formatting, five-field payload, at-most-once notification and best-effort `process.emitWarning` fallback; records.mjs constructs it only when the optional observer exists and calls the two methods solely at the truthful A-close/B-settlement boundaries. See [record-bookkeeping.mjs](#record-bookkeepingmjs-exists--r4-declaration-dated). Functional runtime input. |
| [record-finalizer.mjs](./record-finalizer.mjs) | `createRecorderFinalizer` (SOLE private export) | created — corrective 60 (dated before-creation declaration). Whole private recorder finalization/binding owner extracted from records.mjs: the pure factory `createRecorderFinalizer({store, workspace, manifest, phaseDirectory, state, lifecycle, closeWriters, headFields, verifyIdentity, verifyCleanup, owner, io}) -> frozen {bindRuntime, closeEvidenceBeforeCutoff, sealClosedEvidence, finalize}` captures EXACT12 trusted same-instance references at pure construction — no IO, callback invocation, clock read, timer, default owner, second lifecycle/queue, proof or new status — and returns the frozen EXACT4 methods that records.mjs exposes on the facade by IDENTICAL function references; the private `captureSettled` flag is set only after the SAME awaited real A fulfilled and its raw lifecycle finally settled, so a premature `sealClosedEvidence` rejects caller-correctable `RECORDER_STATE` without consuming a ticket or caching a rejected seal promise. See [record-finalizer.mjs](#record-finalizermjs-exists--r4-declaration-dated). Functional runtime input. |
| [receipt-files.mjs](./receipt-files.mjs) | private helpers only | Confined stable receipt-record reads, hash/parse binding and retained-input ref verification for prerequisites.mjs and the planned receipt-verification.mjs graph. R4 (declared before use): `confinedRead`/`loadRecord`/`verifyInputRefs` thread the same optional private `io` registrar over explicitly owned bounded FileHandles. |
| [receipt-verification.mjs](./receipt-verification.mjs) | `verifyReceiptGraph`, `verifyPreparedReceiptGraph`, `consumePreparedVerification` | created (before-creation declaration dated). Whole exact-byte receipt-graph verifier plus the single-use `PreparedVerification` token; prerequisites keeps admission/probes/public snapshot. Corrective 52 (Root-approved, declared before use): `verifyReceiptGraph(args,memo,io?)` forwards the EXACT frozen same-owner `ActualIO` into receipt-files only — the direct incomplete-phase filesystem calls belong to `prerequisites.inspectIncompletePhase`, not the graph — fresh memo per real invocation, malformed supplied binding rejects before any filesystem operation, no default ledger/noop/fallback. Functional runtime input. |
| [prerequisites.mjs](./prerequisites.mjs) | `verifyReceipt`, `admitPhase`, `verifyInternalSelfTest`, `inspectIncompletePhase` | Receipt verification and admission; never writes. Corrective 52 (Root-approved, declared before use): all four APIs gain an optional PRIVATE second `io` argument — same first named-args object, returns, async rejection/error and wire; omitted `io` keeps legacy readonly compatibility, malformed supplied binding rejects before any filesystem operation, operational callers bind the EXACT frozen same-owner `ActualIO` forwarded through the graph/receipt-files/direct incomplete-phase calls; no new ledger/noop, fresh graph memo per real invocation, probes/deadlines/authority unchanged and finished before cutoff, no post-cutoff Native. |
| [supervisor-protocol.mjs](./supervisor-protocol.mjs) | `IPC_LIMITS`, `TIMING_LIMITS`, `RESOURCE_LIMITS`, `createProtocolValidator` | One run-global duplex validator. No timers/processes. |
| [stats.mjs](./stats.mjs) | `signProbability`, `clopperPearson95`, `summarizePairs` | Exact paired sign/CP95 arithmetic and eligibility. |
| [process-ownership.mjs](./process-ownership.mjs) | `createOwnership` | Cached full-tuple identity/ancestry/group registry; no process or IPC work. |
| [process-lsof.mjs](./process-lsof.mjs) | `parseLsofResult` (re-export), `createLsofQueries` | Gated wrapper transport over borrowed registerHelper/signalHelper/proveTransition callbacks; re-exports the pure parser from process-lsof-fields.mjs. |
| [process-lsof-io.mjs](./process-lsof-io.mjs) | `createLsofChildIO` | ONE wrapper child's complete physical lifecycle: deferred receipt registered pre-spawn, named listeners, bounded output, tracked fd-3 outcome, physical+flow release. No spawn/clock/registry authority. |
| [process-lsof-fields.mjs](./process-lsof-fields.mjs) | `parseLsofResult` | Pure fixed `-F0pn` field grammar: strict UTF8, real NUL+newline separators, canonical PID/port checks, exact exit/stderr rules. No subprocess/clock/IO. |
| [process-transport.mjs](./process-transport.mjs) | `createCollectorTransport` | Collector child/frame/request lifecycle: pending replies, backpressure, reap; LF byte assembly delegated to process-framing.mjs. |
| [process-framing.mjs](./process-framing.mjs) | `createCollectorFramer` | Pure bounded LF byte-assembly: pre-concat 1 MiB inclusive-LF bound, coalesced chunks, truncated-EOF rule. No IO/validators/timers. |
| [process-backend.mjs](./process-backend.mjs) | `captureBackendIdentity`, `captureSetupBackendIdentity`, `createMonitorBackendCapture` | Closed `BackendIdentity` capture from verified ready facts plus real file/OS evidence under one owned bounded reader; pure same-process assembly. C4b-09 (declared before use): adds the bounded STATIC `captureSetupBackendIdentity` (actual selected-venv `pyvenv.cfg` through the SAME reader, config/home/command bound to the same canonical resolved invocation, no ready arg, never a forged envelope — static expectation, not proof) and the pure `createMonitorBackendCapture` (`capture` + nullable `verifyStartup` over the genuine entry); ONE shared internal assembly backs both entries. C4b-10: the setup entry binds the ACTUAL darwin/arm64 host before any config/FS IO (trusted `osPlatform`/`osArch` adapters for isolated tests only); ONE same-handle `liveResolve` fences every fresh resolve with `assertLive` before AND after the actual resolve (passed into `resolvePythonProcessImage`); the factory rejects reserved own `ready`/`budget`/`retainActual`/`setup`/`pyMeta` keys via `Object.hasOwn` before IO and binds genuine passed fields LAST. |
| [process-backend-reader.mjs](./process-backend-reader.mjs) | `createBackendReader`, `resolvePythonProcessImage`, `parsePythonVenvConfiguration`, `createBackendIdentityExpectation`, `capturePythonSetupMetadata`, `defaultReadOsBuild` | The one owned bounded stat/stream/hash reader extracted from process-backend.mjs: pre/post stat, counted bytes, real-close listener release; same borrowed handle, injected IO adapters. C4b-09: gains the two pure data helpers — the strict pyvenv.cfg parser (closed-failure cfg5, strict UTF-8) and the frozen BackendIdentity expectation (undefined-only null, copied/deep-frozen snapshot plus pure `assertMatches`). |
| [watchdog-driver.mjs](./watchdog-driver.mjs) | `createDriverChannel` | Frozen-cwd detached Node fork IPC channel: bounded message queue, sends, close/error settlement. R4 (declared before use): required trusted `retainActual` registrar — raw fork issuance and the physical child lifecycle receipts are pre-registered before fork; public keys stay exactly `{send, close, reap, pid, exited, exitCode, connected, failed, closedByUs}`. Corrective 66 (declared before use — PLANNED, not yet implemented or verified green): the WHOLE 47-line physical observer block/comments moves to [watchdog-driver-actual.mjs](#watchdog-driver-actualmjs-created--corrective-65)'s new private `observeDriverPhysicalChild`, called ONCE immediately after `physicalChild.adopt(child)`/before connected/pid/user reads over the returned actual pipe refs, the borrowed `onPipeClose` updating the SAME public `outClosed`/`errClosed`/`noteSettle` — EXACT3 exports/EXACT13 ctor/EXACT9 roster unchanged, the observer never re-exported; a caught `child.send` throw now settles `settle(error, true)` on the existing error channel. Corrective 65 (declared before creation/use — leaf created; delegation current, not verified green): the WHOLE scope brand/tree, constructor admission, shared neutral-receipt prearming, strong pending-resource index and the WHOLE original `fail` error factory delegate to [watchdog-driver-actual.mjs](#watchdog-driver-actualmjs-created--corrective-65) — the roster stays EXACT3 `createDriverChannel` plus IDENTICAL re-exports of the leaf's `createDriverActualScope`/`finishDriverActualScope` (ctor EXACT13/public EXACT9 unchanged, `driverError` imported as `fail`, `beginDriverActualAttempt`/`driverError` never re-exported); the corrective-64 wording stays valid as the same contract now owned by the leaf. Corrective 64 (declared before use — not yet implemented): module roster becomes EXACT3 adding private `createDriverActualScope`/`finishDriverActualScope`; the channel gains REQUIRED trusted `retainActual`+`actualScope` (EXACT13 ctor fields, EXACT9 returns unchanged), scope brand/registrar/runId/open+unused admission validated before fork, and physical debt retires only on genuine exit plus BOTH actual close events — the WC07 `closed===true` shortcut wording is DATED, superseded by R4 actual events plus the required scope (preserved history). |
| [watchdog-driver-actual.mjs](./watchdog-driver-actual.mjs) | `createDriverActualScope`, `finishDriverActualScope`, `beginDriverActualAttempt`, `driverError`, `observeDriverPhysicalChild` (EXACT5 private exports) | Corrective 66 (declared before use — PLANNED, not yet implemented or verified green): roster becomes EXACT5 adding private `observeDriverPhysicalChild({child, physicalChild, onPipeClose}) -> frozen {stdout, stderr}` — EXACT3 trusted refs -> frozen two actual pipe refs — owning the WHOLE 47-line Driver physical-facts/listener block/comments with only the borrowed `onPipeClose` substitution; the prior four exports unchanged. created — corrective 65 (declared before file creation/use; consumer delegation current — not verified green). WHOLE private Driver actual owner extracted from watchdog-driver.mjs under literal `65-expanded-driver-whole-owner-input.json`: pure `createDriverActualScope({retainActual, runId, parentScope = null})` mints the frozen WeakMap-branded scope (parent `runId` may differ; same registrar/ancestors-open only; child ctor still matches own `runId`); `finishDriverActualScope(scope) -> Promise<void>` synchronously fences the ENTIRE enrolled subtree then passively joins the SAME real receipts (nested joins only its own subtree); effectful `beginDriverActualAttempt({retainActual, runId, actualScope}) -> frozen {isOpen, rawFork, physicalChild, armSend}` (EXACT3 args -> EXACT4 private caps; TWO neutral reserved receipt promises (rawfork issuance, physical child) indexed in the SAME scope and module-owned strong pending Set BEFORE the FIRST reentrant retainer call — `physicalChild` is `{promise, settle, adopt}` and the DRIVER owns the actual exit plus BOTH pipe-close listeners, calling the private physical settle only on true facts; begin never forks); `driverError(code, detail)` is the WHOLE original fail factory imported by Driver as `fail`. DAG Driver -> leaf one-way; JS intrinsics only, no Node/Driver/Config/Shutdown/back import. Functional runtime input; never TEST or a BackendPython helper. |
| [watchdog-operations.mjs](./watchdog-operations.mjs) | `createWatchdogOperations` | Private validated driver dispatch/selftest owner over the shared run context. R4 (declared before use): private roster becomes frozen `{dispatch, selftestEvidence, closeOrdinaryAdmission, whenOrdinarySettled}` — synchronous idempotent fence on first stop and normal finish; `whenOrdinarySettled` synchronously throws `IPC_INVALID` before the fence and returns the SAME actual admitted chain after. Corrective 61 (declared before use): the WHOLE ordinary queue (`MAX_QUEUE=256`, chain/queued counter, full enqueue) delegates to the new watchdog-ordinary.mjs owner; `ordinaryAdmissionOpen` is its private passive `!closed` query checked by dispatch before any synchronous arm, and the returned roster stays EXACT4 with `closeOrdinaryAdmission`/`whenOrdinarySettled` as identical owner references. Corrective 64 (declared before use — not yet implemented): the operation `ctx` carries the SAME opaque `ctx.driverActualScope` reference and the trusted `runInternalSelfTest` callback context gains EXACT field `parentDriverScope: ctx.driverActualScope` — never copied, serialized or exposed as proof. |
| [watchdog-ordinary.mjs](./watchdog-ordinary.mjs) | `createWatchdogOrdinaryQueue` | Private runtime owner of the WHOLE serialized ordinary-work queue moved from watchdog-operations.mjs (declared before use). Sole export; EXACT2 trusted ctx keys `{ctx, retainActual}` (SAME validated run context and its genuine `ctx.retainActual`) -> EXACT4 frozen private `{enqueue, ordinaryAdmissionOpen, closeOrdinaryAdmission, whenOrdinarySettled}`. DAG: Operations -> Ordinary -> ArtifactFiles.issueActual; joins the runtime functional union. |
| [watchdog-records.mjs](./watchdog-records.mjs) | `createWatchdogRecordAdapter` | Private recorder/artifact/PGN-evidence adapter and completion readback. Corrective 63 (declared before use): the constructor becomes EXACT8 trusted fields `{recorder, pgnEvidence, workspaceRoot, manifestRel, commonIdentity, phase, onObserverFault, io}`; `io` is ONE provided frozen `{retainActual}` whose function must equal the genuine `phaseRecorderLifetime(recorder).retainActual` (the SAME `io` object forwarded unchanged, no fallback owner/noop/spread alias), and `manifestInputs` passes it as `loadRecord`'s FIFTH argument. `finalizeAndRead` gains a PRIVATE second `{deadlineMonoMs}` bound, awaits real `closeEvidenceBeforeCutoff` then no-arg `sealClosedEvidence`, and returns `{completionRef, final: result.verified.final}` (the dated external `verifyReceipt` readback wording is superseded; the returned roster stays EXACT12). |
| [watchdog-runtime.mjs](./watchdog-runtime.mjs) | `captureWatchdogRuntimeConfig`, `runWatchdogLifecycle` | Private run-context capture and whole lifecycle extraction for the watchdog facade. Corrective 66 (declared before use — PLANNED, not yet implemented or verified green): the Awaiter owner changes to [watchdog-config.mjs](#watchdog-configmjs) — this module imports `createWatchdogAwaiter` from Config instead of Shutdown, still calling the SAME ONE factory once per run over identical refs and delegating identical `bounded`/`checkLive` function refs; the corrective-63 "into existing watchdog-shutdown.mjs" wording below is DATED superseded (preserved history). Corrective 63 (declared before use): the WHOLE `bounded`/`checkLive` wait block plus all comments moves verbatim into existing watchdog-shutdown.mjs as `createWatchdogAwaiter({timing, control, makeError}) -> frozen {bounded, checkLive}`; runtime creates ONE instance per run over the same timing/control/fail and delegates identical refs. The raw initial `footprint.scan` stays retained in `state.resourceTask` until actual settlement, with pure payload capture then synchronous stop/narrow/fence before resource/fault callbacks. Corrective 64 (declared before use — not yet implemented): `runWatchdogLifecycle` passes `actualScope: capabilities.driverActualScope` to the real `createDriverChannel` alongside the SAME `io.retainActual`, and the operational nested-selftest assembly forwards the trusted callback's `parentDriverScope` unchanged into the child's `internalContext.parentDriverScope`. |
| [watchdog-config.mjs](./watchdog-config.mjs) | `captureWatchdogRuntimeConfig`, `createWatchdogOperationContext`, `createWatchdogAwaiter` | Pure config/context extraction: whole option validation/derivation plus the whole ctx literal assembly; re-exported through watchdog-runtime.mjs and watchdog-operations.mjs. Corrective 66 (declared before use — PLANNED, not yet implemented or verified green): roster becomes EXACT3 adding `createWatchdogAwaiter({timing, control, makeError}) -> frozen {bounded, checkLive}` — the WHOLE unchanged 44-line factory and ALL comments moved from watchdog-shutdown.mjs (the exact corrective-63 pure contract; owner-only move, no re-export/extra clock/queue/state/back-import needed). Corrective 62 (declared before use): trusted `lifetime`/`nativeHorizon`/`onBookkeepingSettlement` options validated to the SAME owner by brand/equality — genuine Native association required when supplied, never a new default owner; grouped `capabilities.{lifetime,nativeHorizon,onBookkeepingSettlement,io}` and operation `ctx.{retainActual,io}` forward the SAME values before use. Corrective 63 (declared before use): `captureWatchdogRuntimeConfig(options, defaultClock?)` gains an optional PRIVATE second trusted clock; the facade passes the ORIGINAL `options` object (never spread, preserving nonenumerable own `lifetime`/`nativeHorizon`) plus its SAME `realClock`, the default applies only when the own `clock` is absent, and explicit `undefined`/`null` stays invalid. Corrective 64 (declared before use — not yet implemented): the selftest-only `internalContext` gains the REQUIRED private `parentDriverScope` (genuine, mandatory for `watchdog-selftest` only, retained by reference — no new public option or permissive nested root fallback); a top phase derives ONE root scope via pure `createDriverActualScope`, a nested selftest supplies its own parent to the SAME factory, and grouped `capabilities.driverActualScope`/`ctx.driverActualScope` forward the SAME opaque reference. |
| [watchdog-shutdown.mjs](./watchdog-shutdown.mjs) | `createWatchdogShutdown`, `createWatchdogCleanupArgs` | Private bounded shutdown/finalization owner: `{finalize(expected), shutdown()}` over the same grouped run context; pure construction, IO only in methods. Corrective 66 (declared before use — PLANNED, not yet implemented or verified green): roster becomes EXACT2 `createWatchdogShutdown`/`createWatchdogCleanupArgs` — the WHOLE unchanged 44-line `createWatchdogAwaiter` plus ALL comments moves to [watchdog-config.mjs](#watchdog-configmjs), so the corrective-64 EXACT3 roster wording below is DATED superseded (preserved history); Runtime imports the factory from Config directly with no re-export, extra queue/clock/state or back-import. R4 (declared before use): a fresh `lifetime.whenSettled()` barrier is taken only after issuance closes and the publication safe transaction settles. Corrective 63 (declared before use): module exports become EXACT2 factories — the existing `createWatchdogShutdown` (same `{finalize, shutdown}` return) plus the new private `createWatchdogAwaiter({timing, control, makeError}) -> frozen {bounded, checkLive}`; the finalize caller later adds `{deadlineMonoMs: state.cleanupEnd}`, the ORIGINAL captured end, with no B-leg race. Corrective 64 (declared before use — not yet implemented): module roster becomes EXACT3 factories — existing `createWatchdogShutdown`/`createWatchdogAwaiter` plus new pure `createWatchdogCleanupArgs({config, capabilities, state, timing})` receiving the WHOLE facade `cleanupArgs` declaration; the outer `settleWorkloadHandles` awaits the actual `state.ops.whenOrdinarySettled()` chain outside its body, then own channel reap/close, then `finishDriverActualScope(capabilities.driverActualScope)` and required liveEvidence before collector-last. |
| [processes.mjs](./processes.mjs) | `createProcessMonitor` | Request allocator, serialized scheduling, fault authority, API facade; delegates lifecycle to process-runtime.mjs, proof to process-proof.mjs, budget handles/queue to process-budget.mjs, observation to process-observation.mjs and closed backend identity to process-backend.mjs. R4 (declared before use): optional trusted `horizon = null`/`lifetime` members bound before effects, `processMonitorLifetime` genuine association, the whole `ownOperation` factory moves to `createProcessLifetimeOwner` in process-runtime.mjs; the 13 public keys stay exact. The whole capture/`op` glue delegates to the already-declared `createProcessOperationCapture` factory in existing process-runtime.mjs — the armed `readBounds` guard and the ordinary stopping fence remain in the facade. Capacity decision 50 (declared before use): the facade imports `realProcessClock` as `realClock` from process-runtime.mjs and passes that SAME default clock object via existing `config.clock` — the whole seven-line object moves without invocation, freezing or roster change. C4b-09 (declared before use): optional data-only `expectedBackendIdentity` validated/copied/frozen BEFORE the bound getter or any IO; the whole backendIdentity capture-options closure delegates to `createMonitorBackendCapture`, the 13 public keys stay exact and only private `authority.verifyExpectedBackend` is bound. |
| [process-runtime.mjs](./process-runtime.mjs) | `createProcessRuntime`, `createProcessLifetimeOwner`, `createProcessOperationCapture`, `realProcessClock` | Whole collector lifecycle (spawn, bootstrap, first observation, lsof composition, sampling tick, teardown, stop/reap) over the monitor's ONE shared state and borrowed authorities. Pure/lazy factories. R4 (declared before use): hosts `createProcessLifetimeOwner` (the moved `ownOperation` factory) and the ONE pre-spawn collector physical receipt; the whole stop flow delegates to process-stop.mjs. `createProcessOperationCapture({clock, nowMonoMs, queue, readBounds}) -> frozen {captureOperationBound, op}` is declared before its future use: the WHOLE existing 42-line capture/`op` block moves from `processes.mjs` preserving comments, guards and layout over the SAME `clock`/`queue`, pure construction invoking no callback, timer, queue or IO; `readBounds()` is the facade-owned armed/brand guard returning `{constructorDeadlineMs, laterDeadlineMs}`, strict deadline capture and BudgetHandle construction delegate to existing process-budget.mjs with `createBudgetHandle` for handle creation over the SAME queue (`queue.track` acquisitions belong to `createProcessLifetimeOwner`, never this capture factory), and the monotonic STOPPING rejection stays on facade ORDINARY `op` entry around `factory.op` — not inside `readBounds`/`captureOperationBound` — so a repeated stop may still validate and min-narrow after stopping; no public monitor-key change, no second owner/clock/queue, and the `{start, stopAndReap}` roster stays unchanged. C4b-09 (declared before use): the private nullable trusted `authority.verifyExpectedBackend` is awaited after real awaitReady and genuine proveBootstrap, before every ownUid/ready/lsof/timer/first-cycle/start commit, on the SAME start h and `ownOperation` retainer — constructor stays pure, roster unchanged. Capacity decision 50 (declared before use): `realProcessClock` is an additional private module export receiving the WHOLE existing seven-line default `realClock` object (`{setTimeout, clearTimeout, setInterval, clearInterval, nowMonoNs: () => process.hrtime.bigint().toString()}`) moved whole from `processes.mjs` — pure uninvoked declaration, no freezing, second clock, origin or roster change; the facade imports it as `realClock` and passes the SAME object via existing `config.clock`. |
| [process-horizon.mjs](./process-horizon.mjs) | `createNativeHorizon`, `bindProcessHorizon`, `assertNativeHorizon` | Module exists — earlier PLANNED wording and its line counts are dated declarations. Pure branded one-shot/min-only reader+writer and synchronous `queue.narrowAll` subscription — ALL live listeners run, then the FIRST thrown value (null/undefined included) is rethrown. Corrective 62 (dated before-implementation declaration): EXACT3 roster adds pure private `assertNativeHorizon(owner) -> void` over the SAME OWNERS WeakMap — genuine owner returns void; primitive/null/forged/spread/proxy reject with PROCESS_HORIZON owner-brand detail BEFORE any owner property read/effect. Identity checker only, never clock/pairing/cleanup proof. No timer/clock/process/IO. Functional runtime input. |
| [process-stop.mjs](./process-stop.mjs) | `createProcessStop` | created (before-creation declaration dated). Whole Native stop flow `{stopAndReap, teardownCollector}` over the same runtime state/clock/authority; collector-last ordering preserved. Functional runtime input. |
| [process-proof.mjs](./process-proof.mjs) | `createProcessProofs` | Native bootstrap/root/probe/signal/listener IO proof over the monitor's ownership/protocol/transport state through explicit callbacks. |
| [workspace-footprint.mjs](./workspace-footprint.mjs) | `createFootprintObserver`, `describeFootprintFailure` | Async whole-workspace allocated-charge observer for the store callback. |
| [process-budget.mjs](./process-budget.mjs) | `createBudgetHandle`, `captureDeadlineMs`, `waitHandle`, `sleepHandle`, `pollHandle`, `createBoundedQueue` | Sole handle/wait/queue leaf: one narrow-only mutable BudgetHandle authority, captured horizons and bounded waits/queue; pure leaf, no IO. |
| [process-observation.mjs](./process-observation.mjs) | `createProcessObservation`, `readProcessInspections` | Complete bounded RSS coverage cycle, native/supervisor timing checks, safe aggregate admission with private peak-RSS/limit flags, current-observation projection, and the shared inspectPids wire wrapper (diagnostic move 22). |
| [watchdog-cleanup.mjs](./watchdog-cleanup.mjs) | `createCleanupController` | Staged 0/2/4/5-second identity-safe cleanup and private settled proof. R4 (declared before use): outside-cleanup `settleWorkloadHandles` joins the actual admitted ordinary chain plus driver exit/BOTH-close settlement before collector-last reap, observing only the original armed horizon. Corrective 64 (declared before use — not yet implemented): that `settleWorkloadHandles` join order now covers the actual ordinary chain plus driver exit/BOTH-close settlement through `finishDriverActualScope` and required liveEvidence before collector-last, while the fixed Native 0/+2/+4 s stages start independently of that actual chain/FS on the ORIGINAL captured start/end — a null channel never skips the other debts. |
| [watchdog.mjs](./watchdog.mjs) | `createWatchdog` | External supervisor lifecycle, driver IPC, independent deadlines, self-test. R4 (declared before use): OPERATIONAL ASSEMBLY creates ONE genuine `createWatchdogLifetime()` before Store/Recorder/monitor/WD and binds the `createNativeHorizon` owner — WD validates/reuses the EXACT associated owner with the same-owner identity passed to Store/Recorder/monitor (an omitted isolated WD lifetime derives the existing genuine recorder owner, never creates a replacement fallback), phase end before any acquisition/IO, min-only narrow, public API stays exactly `{run, requestStop}`. Corrective 64 (declared before use — not yet implemented): the WHOLE existing `cleanupArgs` declaration (all comments/guards/defaults/body) moves to watchdog-shutdown.mjs under pure `createWatchdogCleanupArgs({config, capabilities, state, timing})`; the facade calls the ONE factory and assigns the SAME returned function to `control.cleanupArgs` — no new path/state/control authority or second cleanup controller. |
| [watchdog-lifetime.mjs](./watchdog-lifetime.mjs) | `createWatchdogLifetime`, `assertWatchdogLifetime`, `observeAwaitStage`, `reportStoppedFault` | created (before-creation declaration dated). Actual referenced-lifetime/deferred physical-debt owner: `retainActual`/`retainFinalizerUntil`/`whenSettled` over real debt, never public outcomes. Functional runtime input. |
| [process-macos.py](./process-macos.py) | script entrypoints only | Entry/wire owner: isolated core loader, argument parsing, bounded collector JSON-lines dispatch, private lsof exec gate. |
| [process-macos-native.py](./process-macos-native.py) | private helpers only | Lazy ctypes libproc primitives: PID/read/path/RSS/identity/probe/signal/discovery plus ABI re-exports. Loaded only by process-macos.py from the frozen sibling path. |
| [process-macos-abi.py](./process-macos-abi.py) | private helpers only | Shared ABI owner: constants, BackendError/fault taxonomy, field-by-field BsdInfo/TaskInfo declarations, lazy fixed libproc binding. Loaded only by process-macos-native.py. |
| [test-fixtures.mjs](./test-fixtures.mjs) | fixture builders only | TEST-ONLY; never imported by production modules and excluded from the functional-runtime input union. |
| [supervision-test-fixtures.mjs](./supervision-test-fixtures.mjs) | fixture builders only | TEST-ONLY fake clock/child/stream/validator-bound fixture assembly for the native unit suites; never imported by production modules and excluded from the functional-runtime input union and `BackendIdentity.helpers`. |
| [process-monitor-test-fixtures.mjs](./process-monitor-test-fixtures.mjs) | fixture builders only | TEST-ONLY monitor setup/bootstrap/start builders over fake spawn/collector children and the REAL validator; realpath-normalized temp record root, frozen selected-Python constants, separate supervisor image; never imported by production modules and excluded from the functional-runtime input union and `BackendIdentity.helpers`. |
| [process_macos_test_support.py](./process_macos_test_support.py) | fixture builders only | TEST-ONLY fake ABI/library/ctypes-buffer/backend scaffolding for `process-macos.test.py`; no assert/test discovery/real CDLL/libproc/os.kill and excluded from the runtime union and `BackendIdentity.helpers`. |
| [process-lsof-test-fixtures.mjs](./process-lsof-test-fixtures.mjs) | fixture builders only | TEST-ONLY `createLsofGateFixture`/`finishLsofFixture`/`lsofFixtureOut` gate environment for `process-lsof.test.mjs`; fake clock/spawn/ordered spies over the REAL validator; excluded from the functional-runtime input union and `BackendIdentity.helpers`. |
| [process_macos_path_test_cases.py](./process_macos_path_test_cases.py) | test cases only | TEST-ONLY path/discovery `unittest` companion with `make_pid_path_cases(N, fake_be)` and `make_discover_stability_cases(N, fake_be, bsd_struct)` bound into `process-macos.test.py`; synthetic path and complete-membership guards; excluded from the runtime union and `BackendIdentity.helpers`. |
| [server.mjs](./server.mjs) | `startFixtureServer` | C4b-11 (declared before creation): evaluation-only Vite fixture server over confined immutable snapshot/harness/dependencies roots, pinned `MODEL_IDENTITY` verification after the awaited `capabilities.register` listener ACK, baseline-only S->M normalization, evaluation-only `/engine` + candidate `/workbench` routes and `delivery` event facts. Private trusted test-dependency keys exactly `lstat`/`stat`/`readFile`/`realpath`/`sha256`/`importModule`. No Native/proof/status authority. C4b-11c (declared before creation): real `AbortSignal` brand validation; Vite `root` = canonical SELECTED `snapshotRoot`, `cacheDir` `<workspace>/cache/<arm>` under the derived `<workspace>/inputs/{harness,<arm>,model/}` layout, `watch:null` + `hmr:false`, pages rewrite to `/@fs/<fixtureDir>/<module>`; baseline normalization EXACTLY `/weights/tinyaz-s.bin`; delivery facts record actual served `byteLength`/`sha256` with the `delivery` record awaited before response (`next(error)` on rejection); admission fenced by `!signal.aborted && !closing` with synchronous close-fencing. C4b-11e: `cap.event` is required pre-IO; `fence()` wraps EACH module import and confinement await; route admission/signal/closing rechecks run after the awaited `delivery` record and `transformIndexHtml` before `res.end`; the injected config installs as a deep-frozen non-writable `window.__tinyazArm` data property; retained metadata binds `<workspace>/inputs/setup/tinyaz-m.meta.json`; the memoized `close()` promise arms via `Promise.resolve().then` BEFORE the real `vite.close()` effect so reentrant callers share the one attempt. |
| [browser.mjs](./browser.mjs) | `openBrowser` | C4b-11 (declared before creation): one recorded headless Chromium through public `launchServer`/`wsEndpoint`/`connect` only — browser-root plus fixture-RPC registrations (both real ACKs) strictly before connect/context/page work, strict loopback endpoint parsing, isolated per-game contexts gated to recorded loopback origins, sticky unexpected-closure fault, expected-close marking and graceful `close()` — never a Native physical proof. Private trusted test-dependency keys exactly `importModule`/`mkdir`. C4b-11d corrections: real `AbortSignal` brand validation; class-instance `BrowserType` accepted by public methods; `launchServer` binds `chromiumSandbox:true`/`ignoreDefaultArgs:false` with `securityOptionsSha256` recomputed exactly over `canonicalBytes({headless,chromiumSandbox,ignoreDefaultArgs,args})` and explicit security-disabling args rejected; per-context lifecycle delegated to `browser-contexts.mjs`; `cap.manifest.phase` makes worker/model faults sticky only in `compare`/`preflight` cohorts; `close()` runs contexts -> browser -> server all-attempted with first arbitrary thrown value retained, and the abort-driven close rejection is handled into the sticky slot. C4b-11e: the memoized `close()` promise arms via `Promise.resolve().then` BEFORE any SDK close effect — a reentrant `close()` (disconnect firing mid-close) shares the one attempt — and the startup catch routes through the SAME memoized `close()` so an abort-driven close can neither double-close nor orphan the server. |
| [fixture.html](./fixture.html) | evaluation-only page | C4b-11 (declared before creation): the transformed engine page — `#root` plus the `/fixture.mjs` module script, served only at `/engine`; the server injects the frozen `window.__tinyazArm` arm/config as DATA and rewrites the module to `/workbench-fixture.mjs` for the candidate-only `/workbench`. |
| [fixture.mjs](./fixture.mjs) | browser-side fixture module | C4b-11 (declared before creation): `window.__tinyazEval = {initialize,think,numeric,dispose}` — no model/context work at import; candidate uses the actual snapshot `createThinker`/`ready`/`think(RequestContext)`/`terminate`, baseline the recorded old `createThinker`/`ready`/`think(fen,visits)`; numeric runs the actual `createPositionState`/`encodeBoard`/`unpackWeights`/`forward`/`encodeMovePlane` pipeline over verified delivered bytes — no alternate engine or random fallback. C4b-11d corrections: the delivered bytes verify `crypto.subtle` SHA-256 against the injected pin before `unpackWeights`/numeric — byteLength alone is not a check; each raw parity case `{id,initialFen,movesUci,expectedRawEpTarget}` replays `createPositionState(initialFen)` plus one `pushPositionMove` per move with the actual `rawEpTarget` compared to the recorded expectation; `dispose` binds the literal `terminate()` on both arms. |
| [workbench-fixture.mjs](./workbench-fixture.mjs) | browser-side fixture module | C4b-11 (declared before creation): mounts the actual `@/components/chess/workbench.tsx` `Workbench` with actual `@/styles.css` through `react`/`react-dom/client` `createRoot` as-is — no production route or test props. |
| [server.test.mjs](./server.test.mjs) | test cases only | TEST-ONLY C4b-11 owner (declared before creation): fake Vite/fs adapters, real confined temporary roots; excluded from the functional-runtime input union. C4b-11c (declared before creation): helpers move whole into connected-resource-test-fixtures.mjs under identical local aliases — original seven test names/assertions preserved. C4b-11e: every `startFixtureServer` issue wraps `ownResourceStart` with controlled gates in the owner's release stage (no independent `t.after` rm); the injected config is proven deep-frozen/non-writable by executing the emitted script in `node:vm` and inspecting the real descriptor; added coverage — missing `cap.event` rejected pre-IO, retained metadata outside `inputs/setup/` rejected after confinement, and a `delivery` ACK released after `close()` answering 503 through the post-await recheck. |
| [browser.test.mjs](./browser.test.mjs) | test cases only | TEST-ONLY C4b-11 owner (declared before creation): fake Playwright adapter, real confined workspace; excluded from the functional-runtime input union. C4b-11d: helpers imported whole from connected-resource-test-fixtures.mjs under identical local aliases — original nine test names/assertions preserved plus added causal coverage (genuine vs duck signal, exact security-digest and unsafe-arg rejection before work, class `BrowserType`, `Request.url()` function, held-abort mkdir, nil first close value, handled abort-close, quiet expected teardown vs cohort-sticky vs check-recorded worker close). C4b-11e: every `openBrowser` issue wraps `ownResourceStart`; the actual `worker` event drives the fake page handlers; inside the close case, `handle.close()` identity equality proves the memoized promise arms before the SDK effect and the nil first-value case loops BOTH `null` and `undefined`. |
| [connected-resource-test-fixtures.mjs](./connected-resource-test-fixtures.mjs) | fixture builders only | TEST-ONLY C4b-11c shared leaf (declared before creation): EXACT11 exports `BROWSER_ENV`, `makeBrowserCaps`, `fakePlaywright`, `makeBrowserArgs`, `SERVER_MODEL_BYTES`, `SERVER_META_BYTES`, `makeServerTree`, `makeServerCaps`, `fakeVite`, `makeServerDeps`, `hitFixture` — complete helper bodies moved whole from both connected-resource owners; real canonical `securityOptionsSha256` binding, class-instance `chromium`, function `Request.url`; imports Node plus pure `canonical-json`/`schema-constants`/`test-fixtures` only; never imported by production modules and excluded from the functional-runtime input union. C4b-11e: EXACT12 exports adding `ownResourceStart(t, issueThunk, {release})` — controlled gates prearm in the owner's release stage before issue, `ownFixtureAttempt` returns the IDENTICAL original start promise, and the settle stage awaits the actual start body then closes the produced fake-SDK resource (expected close rejections stay on the caller channel — neutral settlement, never a Native/FD proof). `fakeVite` returns the faithful `{calls, createServer}` shape over the SAME recorded calls object; `makeServerTree`/`makeBrowserArgs` register root removal on the ONE `watchdog-teardown-test-fixtures` owner (`registerFixtureTeardown`/`ownFixtureAttempt` imported directly — TEST-leaf-to-teardown-DAG edge, no project backedge) and the tree carries the `inputs/setup/tinyaz-m.meta.json` retained-metadata path. |
| [browser-contexts.mjs](./browser-contexts.mjs) | `createBrowserContexts` | C4b-11c (declared before creation; created in C4b-11d): sole export `createBrowserContexts({browser,launch,assertLive,noteFault}) -> frozen {openGame,openWorkbench,closeAll}` — pure constructor over the ONE connected public `Browser`; the whole per-context/page/origin-gate/close methods move out of `browser.mjs` over the same public functions, no clock/timer/queue/debt-ledger/proof/owner, per-context expected-close before actual close, actual resource pointers retained until true close; DAG `browser -> contexts -> existing pure protocol/values` — contexts never imports its parent. Included in the functional-runtime input union. C4b-11e: the actual public `Page.on('worker')`/`Worker.on('close')` events replace the invented `workercreated`; each admitted entry OWNS its memoized close promise — `expected` marks synchronously and `Promise.resolve().then` arms the real `context.close()` BEFORE the SDK callout — so `game.close`, `closeAll` and the partial-start finally share the ONE attempt through the same `closeEntries`, entries leaving `owned` only on actual close fulfillment. |

## Native supervision boundary (C4a2)

The modules below are the only production owners that spawn, signal,
sample or reap operating-system processes. Everything they report flows
through the one accepted `createProtocolValidator({runId})` authority from
supervisor-protocol.mjs: exact closed envelopes, global ID registry, sticky
ordinary-work fault, `authorizeSignal`/`authorizeExecGate`/
`authorizeTeardownCollector` bindings. They never weaken a C4a1 rule: IDs
stay globally unique, sequences are per direction, faults stay sticky, and
ordinary work can never resume after an invalid message or accounting fault.

Selected interpreter: `/usr/bin/env`-independent absolute
`train/.venv/bin/python` (Homebrew CPython 3.11.14) invoked as
`python -I -B process-macos.py <mode>` — never `python3`, PATH lookup, or a
system/global environment. The native backend is fixed
`darwin-arm64-libproc-v1`; anything else is `unsupported-backend`.

The Python side is three frozen sibling sources under the delegated split
decisions: `process-macos.py` is the entrypoint (isolated same-directory
core loading, argument parsing, the bounded collector JSON-lines dispatch
and the private exec gate), `process-macos-native.py` is the ctypes/native
core, and `process-macos-abi.py` is the shared ABI-declaration layer. None
is a package; each sibling loads the next explicitly through
`importlib.util.spec_from_file_location` at the frozen same-directory path
so the `-I` interpreter never resolves them through `sys.path`, PYTHONPATH
or any installed/active fallback. All three files are recorded in
`BackendIdentity.helpers` and all source hashes are pinned; a missing or
altered sibling fails capture/identity. Importing any of them binds
nothing: `ctypes.CDLL` loads lazily inside `main()`/`bind_libproc()` only,
so `process-macos.test.py` can import the modules without touching libproc,
a collector loop or any model.

### process-macos-native.py

The ctypes/native core. It owns every bounded PID/read/path/RSS/identity/
probe/signal/UID-discovery primitive and the fixed `lsof_argv` validation.
`BackendError`, the fault taxonomy, the native constants, the explicit
`BsdInfo`/`TaskInfo` field declarations and the lazy `bind_libproc`
signatures live in `process-macos-abi.py` and are re-exported here
unchanged so callers keep one API. It imports no entrypoint and never
loads a CDLL or executes a loop on import.

- `proc_bsdinfo` is declared at exactly 136 bytes with `pid` at offset 12,
  `ppid` 16, `uid` 20, `pgid` 100, `start_tvsec` 120 (uint64) and
  `start_tvusec` 128 (uint64); `proc_taskinfo` is exactly 96 bytes with
  `resident_size` at offset 8. `bind_libproc()` asserts those
  `ctypes.sizeof` values and the presence of `proc_listpids`,
  `proc_pidinfo` and `proc_pidpath` before any call; a wrong ABI or missing
  symbol is `abi-mismatch`/`symbol-missing`, never a fallback.
- Every PID is range-checked `1..2147483647` before it reaches a ctypes
  `c_int` or `os.kill`. `startSec` travels as a canonical uint64 decimal
  string end-to-end; `startUsec` stays `0..999999`.
- `proc_listpids(PROC_UID_ONLY, getuid(), ...)` retries with a doubled
  buffer while the kernel reports a completely full buffer and fails
  `unstable-list` if it never settles. Only the caller's own UID is ever
  listed; a returned row whose `uid` differs is `uid-mismatch`.
- `proc_pidinfo` must return the exact struct size; a short positive read
  is `short-read`, `errno` `ESRCH` on a *repeated* lookup is a confirmed
  gone, `EPERM`/`EACCES` is `permission`, anything else is
  `unclassifiable-process`. A PID path comes from `proc_pidpath` and is
  decoded as STRICT UTF-8 — malformed bytes fail `unclassifiable-process`
  through the existing `BackendError`, never a surrogateescape guess; the
  returned count/NUL-terminator/absolute-path guards are unchanged. A
  denied root-owned path is `permission`, not a guess.
- Sampling is bracketed: `BSD -> TASKINFO -> BSD`. The first and last BSD
  tuples must be identical or the result is `unstable-identity`/gone —
  a PID-reused replacement is never charged to the old tuple. An ESRCH
  between reads counts as a normal exit only after a repeated lookup
  confirms the old identity is gone.
- `probe_identity` answers `same-live` only when a fresh BSD read returns
  the exact requested tuple; a different tuple or a confirmed double-ESRCH
  is `gone`. `signal_identity` re-reads the exact tuple immediately before
  `os.kill` and refuses (`identity-changed`) on any change — no stale,
  by-name or by-path signal.

### process-macos.py

The entry/wire owner. It resolves and loads `process-macos-native.py`
through `importlib.util.spec_from_file_location` from its own directory,
parses the mode/option arguments and owns both runtime modes. The core
module object is injected into the collector/gate internals, so the unit
suite can substitute a fake core without native access.

- `--collector` mode speaks the complete C4a1 collector wire on stdin/
  stdout JSON-lines: `ready` stage `startup` first (exact ABI/python/libproc
  fields), `ready` stage `roots-accepted` answers `own-roots`, `sample`
  returns the full current-UID `discovered` list plus exact `samples`/
  `gone`/`inspected`/`probes` partitions, `signal` returns `sent`/`gone`/
  `identity-changed`, `shutdown` permits clean exit. Frames are JSON-lines
  with the LF inside the 1 MiB cap; seq starts at 0 per direction; any
  failure surfaces as `accounting-fault` `ACCOUNTING_UNAVAILABLE` with a
  bounded `faultReasons` reason. A teardown-only continuation keeps the
  same collector executable and accepts only sample/signal/shutdown.
- `--exec-gated` mode is the lsof wrapper: it blocks reading one authorized
  `exec` frame on private descriptor 3, requires `ipcVersion:1`, `seq:0`,
  matching `runId`, the supervisor-declared `requestId`, its own freshly
  re-read tuple equal to the message `identity`, and the byte-equal `query`.
  Only then does the *same PID* `os.execv` the fixed `/usr/sbin/lsof`
  argv (`-nP -a -p <csv-pids> -iTCP -sTCP:LISTEN -F0pn` for `owned-pids`,
  `-nP -a -iTCP:<port> -sTCP:LISTEN -F0pn` for `port`). Any malformed or
  unauthorized frame exits nonzero with a bounded stderr diagnostic and no
  exec; there is no shell and no arbitrary argument path.

### process-ownership.mjs

`createOwnership({runId})` returns the run's cached registry. It performs no
process or IPC work; the monitor feeds it native facts.

- `registerRoot({identity, kind, expectedExecutable, scopeRunId})` validates
  and records one registered root after the monitor has natively proven it;
  duplicate identical registration is idempotent, a conflicting tuple is a
  `root-invalid` failure. `registerPort({address, port, ownerIdentity,
  scopeRunId})` binds a declared loopback listener to an already-owned
  member — a port number alone never adopts a process.
- `observeDiscovery(discovered)` consumes the collector's complete
  current-UID BSD list once per accepted sample: a row joins ownership
  through transitive `ppid` ancestry to a live member or through a live
  owned group led by an isolated registered root (the root's `pgid` equals
  its own `pid`); foreign-UID rows are never present in `discovered` and
  defensively rejected. Membership is retained permanently per full tuple:
  reparenting or a group change keeps the observed member owned, an empty
  group retires so a reused `pgid` is never adopted, and a reused `pid`
  with a different start tuple is a different process. An ancestry-
  admitted descendant keeps its proven parent binding; when that parent
  later registers as an explicit root, the descendant's cached role and
  scope follow the registration's authority. A group stays live for
  discovery while any owned member still shares its `pgid`, and an
  observed row conflicting with a registered or retained tuple is
  rejected rather than adopted.
- `ownedIdentities()` returns every cached owned tuple still accountable
  (registered roots plus live/retained members, each once);
  `workloadIdentities(scopeRunId)` returns the workload-kind subset for
  one scope — never accounting roots (`supervisor`/`collector`);
  `assertSignalTarget(identity, scopeRunId)` returns the member only when
  it is owned, workload-kind and inside that scope; `portsForScope
  (scopeRunId)` returns registered ports for the scope.

### process-lsof-fields.mjs

Pure owner of the fixed `-F0pn` grammar: no subprocess, native call,
clock, IO or cached state. `parseLsofResult({exitCode, stdout,
stderr})` is exported here and re-exported unchanged by
`process-lsof.mjs`, so existing callers keep one public API.

### process-lsof.mjs

`parseLsofResult({exitCode, stdout, stderr})` decodes `lsof -F0pn` output
into `{rows:[{address, port, pid}]}`. The real fixed-flag framing is
NUL-terminated fields *plus* newline process/file-set separators: each
NUL-split token may carry one leading `\n` separator (and the final NUL
may be followed by one trailing newline); any other `\n`, empty field,
non-`p`/`n` letter, non-canonical PID or port, out-of-range value or
missing final terminator is malformed and fails. `p<pid>` begins a
record and each `n<endpoint>` names one socket; every record must carry
at least one name. Output must be strict UTF-8. Exit 0 requires at least
one well-formed record; exit 1 is proven absence only when stdout and
stderr are both completely empty; exit 1 with output, any other exit,
any stderr warning or any malformed/ambiguous field throws a bounded
`LSOF_UNAVAILABLE` error — never a partial guess and never an
invented identity tuple.

`createLsofQueries({registerHelper, signalHelper, proveTransition,
protocol, runId, pythonExecutable, helperPath, clock, spawnImpl,
resolvePath})` returns `queryOwnedPids(pids, options)` and
`queryPort(port, options)`, each resolving to `{rows}`. The three
named borrowed callbacks are the monitor's private seams:
`registerHelper(input, handle)` enqueues
`proofs.registerRootProved` on the SAME queue with the SAME borrowed
handle, `signalHelper(input, handle)` enqueues
`proofs.signalOwnedProved` the same way, and
`proveTransition(args, handle)` enqueues the transition proof the
same way.
Each callback receives the query's borrowed BudgetHandle — a
borrowed child task NEVER disposes the owner handle, and the overall
query stays OUTSIDE the serialized queue while awaiting those
callbacks so nested registration/signal work is never queued behind
itself. Options: `budget` (the private borrowed BudgetHandle; when
present it bounds the WHOLE gate end-to-end), `retainActual` (the
borrowed operation's physical-settlement registrar, REQUIRED when
`budget` is supplied — the gate registers its deferred child/pipe
receipt before `spawnImpl` runs and the receipt fulfills only on the
real exit plus both pipe closes, the closed fd-3 issuance decision
and every issued fd-3 operation's real callback/error outcome, or on
a truthful synchronous no-child failure; a public failure, `end` or
`destroy` invocation never fulfills it), `remainingMs`
(required finite number only when `budget` is omitted — the gate
then creates ONE entry handle at `nowMonoMs()+remainingMs`, retains
its actual IO locally and disposes that owned handle only after BOTH
the physical receipt settles AND `finishFlow` completes) and
`scopeRunId` (the caller's requested registration scope, default the
parent `runId`). `handle.assertLive` gates `resolvePath` and
`spawnImpl`, so an already-spent bound never launches the wrapper.
One original deadline bounds spawn, native
registration, gate authorization, the fd-3 write, transition
observation, output, drain and reap — never a fresh per-stage or
post-failure allowance. The wrapper registers and is signalled under
the requested scope while global IDs and total RSS stay in the
parent union. Each query spawns `python -I -B
helperPath --exec-gated --run-id <runId> --query-id <id> --gate-fd 3
--query-json <json>` with descriptor 3 as a private pipe and no shell;
asks `registerHelper` to natively prove and register the
*wrapper's own* full tuple as a `helper` root under the requested
scope before authorization — the declared `expectedExecutable` is the
resolved image from the injectable `resolvePath` adapter (default
`fs.realpathSync`), so the venv invocation stays the spawn argv while
`proc_pidpath` truth is what the registration compares; calls
`protocol.authorizeExecGate({queryId, identity, query})`; writes
exactly one `exec` frame to fd 3 with its `error` ownership attached
before the write so write failures, backpressure and the finish
settlement all reach the same handle; then observes the permitted
pinned-Python to pinned-lsof same-tuple transition through
`proveTransition`. An immediate read may legitimately still see the
SAME pinned Python (`pre-transition`), so only that state is
rechecked — each bounded recheck still consumes the SAME handle with
no new grace window — until the pinned lsof image
(`live-transition`) or a valid fast post-ack exit (`gone`) appears;
a third image, an unavailable read or budget exhaustion fails. The
parse runs
only after the real stdout/stderr streams and the child handle all
settle. Combined stdout+stderr bytes are capped at 4 MiB *before*
accumulation. A pre-authorization failure closes fd 3 so the
unexecuted wrapper exits; a still-live registered helper is `KILL`ed
only through `signalHelper` on the proven same tuple inside the
same handle — there is no raw `kill` anywhere, and an unsettled
handle retains unproven evidence rather than faking a reap. The
private `_lastGate()` seam returns the last query's
`{queryId, identity, transition, exitCode, reaped}` evidence.
Queries serialize through the one persistent owner with run-global
query IDs.

The gate delegates ONE wrapper child's complete physical lifecycle to
`process-lsof-io.mjs#createLsofChildIO` (lsof child-IO readable
split). The gate itself keeps query validation, the borrowed/isolated
budget, path resolution, the fixed spawn argv, the scoped
register/signal/transition callbacks, the run-global gate
authorization/IDs/validator, the same-handle deadline races, the
output bound's parse call and the `_lastGate` projection.

### process-lsof-io.mjs

`createLsofChildIO({retainActual, onPhysicalSettled})` is a pure
factory. It creates the DEFERRED physical receipt and hands it to the
existing trusted `retainActual` registrar (null for an isolated gate)
BEFORE the caller initiates spawn; it never spawns, resolves paths,
registers roots, signals, samples, sets a timer or selects a
deadline/clock. The returned frozen owner exposes:

- `physical`: real exit plus BOTH output-pipe closes plus the closed
  fd-3 issuance decision plus every issued fd-3 operation's real
  callback/error outcome (an fd-3 error IS an issued operation's
  outcome, including the no-frame end) — rejection, public timeout,
  `end`/`destroy` or a child error alone never fulfills it.
- `done`: bounded query readiness; resolves on real exit plus both
  output closes, rejects promptly on an actual child/pipe/overflow
  error, and its original rejection carries an immediate observer so
  a delayed caller await can never surface as unhandled — the promise
  itself stays rejected with the real error.
- `attach(child)`: owns the returned child immediately, installing
  named stdout/stderr/fd3-error/exit/close listeners BEFORE any PID
  or bootstrap validation — no invented PID/exit/close on a
  failed-spawn child.
- `neverSpawned(error)`: only valid before `attach`; truthfully
  settles only the no-child receipt, ends the flow and preserves the
  original error on `done`.
- `writeGate(frame)`: issues the ONE authorized frame; the real
  callback/error outcome is armed BEFORE the end invocation and the
  physical receipt waits it even after public rejection. Exactly one
  issue — no replay, backpressure duplicate or second end.
- `closeGate()`: the bounded no-frame private gate end used to
  unblock a never-authorized wrapper; it too arms the real callback
  outcome BEFORE invocation, is idempotent and never introduces a
  second untracked `end`. Gate closure is permanent: after
  `neverSpawned`, `finishFlow` or the issued decision, a late
  `attach` throws and a late `writeGate` rejects — no work can follow
  the final closure or an already fulfilled receipt.
- `snapshot()`: fresh copied `{exited, exitCode, outClosed, errClosed,
  fd3Done}` primitive facts only.
- `output()`: bounded `Buffer` concatenations of the retained
  combined-<=4-MiB captures, consumed by the parse before release.
- `finishFlow()`: completes the caller's parse/control flow.

Terminal boundary: named listeners, captured buffers AND the isolated
`onPhysicalSettled` dispose callback are released together ONLY after
BOTH physical fulfillment AND `finishFlow` — never on the physical
receipt alone while the flow still parses under the same borrowed
budget. `process-lsof.mjs` calls `neverSpawned` only in the actual
no-child spawn catch, `attach` immediately after a returned child,
wraps `done`/`writeGate` under the SAME borrowed handle and calls
`finishFlow` in its finally. The helper imports only the pure
`lsofError` leaf — no facade or entry cycle — and is a functional
runtime input; `BackendIdentity.helpers` remains the three Python
sources.

### process-transport.mjs

`createCollectorTransport({child, protocol, runId, clock, readyDeadlineMs,
onFault, onInbound})` returns `send`, `sendNoAck`, `awaitReady`, `close`,
`reap`, `whenReaped`, `exited`, `exitCode`, `failed`, `ended`, `lastError` and the
private `_onFrame` seam. `clock` supplies `setTimeout`, `clearTimeout`,
`setInterval`, `clearInterval` and `nowMonoNs()` in the shared
`process.hrtime` domain. `onInbound` receives each accepted non-startup
message (the monitor marks `accounting-fault` sticky through it) and
`lastError` pairs the last transport error with a bounded 64 KiB stderr
byte tail. It owns only the wire: stdout bytes are consumed
incrementally — each LF-terminated frame is split before any
concatenation, the 1 MiB ceiling applies per frame *including* its LF
and to one incomplete tail, the tail+piece+LF bound is checked BEFORE
a complete frame is ever concatenated, and coalesced chunks carrying
several legal frames are legal. A multibyte UTF-8 sequence may span transport chunks;
a malformed or incomplete sequence at a frame boundary is fatal, as is a
blank frame, an oversize frame or a truncated EOF. The pending-reply map
is keyed on the validator-bound `requestId`, and the bounded write queue
honors stdin backpressure: a `write` that returns `false` parks the
queue until `drain`, then resumes with the *next* queued frame — the
already-submitted frame is never replayed.

`send(type, fields, requestId, handle)` requires the caller's
borrowed BudgetHandle and installs its pending-reply entry plus
`onExpire` subscription BEFORE any validation or write — a
synchronous reply inside `stdin.write` always finds its waiter, and
a validation/admission failure unwinds the entry and subscription
with no frame submitted. Each outbound envelope is validated
through `protocol.accept("collector","s2c")` before its bytes enter
the pipe, and a submitted frame is never replayed. The same handle
is rechecked against the actual clock before submission, before
every write and drain continue, and before a reply resolves — a
narrowed bound reaches the already-issued wait, an expired request
can never send or succeed late, and a late reply can never revive
expired work. The pending entry is retained until BOTH the
same-handle clock check and `protocol.accept` succeed for that
reply, and the check runs before acceptance, so a late
acknowledgement fails the transport and rejects the actual
send/proof together with its public wrapper instead of leaving a
stranded waiter or admitting the reply into protocol state. `sendNoAck(type, fields, requestId)` is the same
validated write without a reply entry or subscription (a null
handle, so teardown never gates shutdown on a spent one); it is
used for the no-ack `shutdown`, whose admission also marks the
channel teardown-admitted. `awaitReady(handle)` resolves the
startup `ready` bounded by `min(readyDeadlineMs, the handle
bound)`, or rejects on the bound/failure/exit. `close()` ends
writes. `reap(handle)` resolves once with `{exitCode}` only after
the real `exit` event plus the real `close` of BOTH stdout and
stderr — a pipe `error` event is a recorded fault, not an observed
close, so an errored pipe that never closes leaves the reap
unproven until its deadline instead of falsely settling; a spawn
`error` faults but never declares settlement. `whenReaped()` is the
pure observer: it returns the existing `reaped` promise resolved by
actual exit plus both real output closes — it takes no handle,
performs no IO, never rejects on its own and stays pending while
physical settlement is unproven, so callers can register it as an
operation's physical receipt. An unexpected `exit`
or `error` event is a sticky fault (`ended` distinguishes an
admitted shutdown/EOF); a later `reap` still sees the true exit
facts. Blank frames, truncated EOF, oversize accumulation and every
transport error route through `onFault` once — no transport fact
proves a process identity and no failure is swallowed. The pure
bounded LF byte-assembly (the pre-concatenation 1 MiB
inclusive-LF bound, the incomplete-tail accounting, the
coalesced-chunk split and the truncated-EOF call) delegates to
`process-framing.mjs#createCollectorFramer`; this module keeps
global requestIds, sequence, validators, the pending map, failure
authority and pipe-settlement ownership.

### process-framing.mjs

`createCollectorFramer({onFrame, onFault, isFailed}) -> {push,
finish, discard}` is the pure bounded LF byte-assembly owner
extracted from `process-transport.mjs` under the readable-runtime
split decision. `push(bytes)` consumes each stdout chunk
incrementally: complete frames split BEFORE any concatenation, the
1 MiB ceiling applies per frame *including* its LF and to the one
incomplete tail (`tailParts`/`tailBytes` are its only state), the
tail+piece+LF bound is checked before a complete frame is ever
concatenated, and coalesced chunks carrying several legal frames
are legal — each completed frame goes to `onFrame(bytes)` in order.
An oversize accumulation or a truncated tail calls `onFault(detail)`
exactly through the transport's own failure latch, which `isFailed`
reads so a failed wire stops all further framing. `finish()` is
called on real stream close and reports `truncated EOF` only when a
non-empty tail remains; `discard()` releases the buffer ownership
without any truncated-EOF claim — neither proves process or pipe
settlement. It holds no requestIds, validators, timers, process IO
or a second failure authority: every fault routes through the
transport's single `onFault` path.

### processes.mjs

`createProcessMonitor({runId, pythonExecutable, helperPath, protocol,
clock, spawnImpl, recordRoot, getDeadlineMonoMs})` returns `start`,
`registerRoot`, `registerPort`, `sample`, `probeIdentity`,
`signalOwned`, `queryListeners`, `stopAndReap`, `backendIdentity`,
`lastObservation`, `fault`, `_ready`, `_ownership`. The wire is
delegated to `process-transport.mjs`, cached ownership to
`process-ownership.mjs`, the lsof gate to `process-lsof.mjs`, the
native bootstrap/root/probe/signal/listener/transition IO proof to
`process-proof.mjs`, deadline capture/BudgetHandles/bounded waits and
the serialized bounded queue to `process-budget.mjs`, the complete
RSS coverage cycle and projection to `process-observation.mjs`, the
whole collector lifecycle (spawn, bootstrap, first observation, lsof
composition, sampling tick, teardown and stop/reap) to
`process-runtime.mjs`, and the closed identity capture to
`process-backend.mjs`; this module keeps the one request allocator,
serialized request scheduling, the sticky fault authority, the ONE
shared lifecycle `state` object and the monitor facade behind the
unchanged public roster and numeric options/results.

Clock and deadline seams: `clock` supplies `setTimeout`,
`clearTimeout`, `setInterval`, `clearInterval` and `nowMonoNs()`
returning a canonical decimal string; the default is the real
`process.hrtime` clock. `spawnImpl` defaults to `child_process.spawn`
and launches every helper (collector and lsof wrappers). `recordRoot`
defaults to `process.cwd()` and confines the recorded helper refs.
`getDeadlineMonoMs` is an optional trusted callback returning the
run's original absolute monotonic-ms deadline. The owning caller must
return the ORIGINAL PHASE END — the horizon that already includes the
final cleanup window — and supply narrower work/command/subrun
deadlines per call, since a constructor capture of the work end would
erase the closing seconds permanently. It is captured once at
construction and consulted again before every operation, and a later
narrower value only narrows — it can never extend an admitted request.

Every async monitor method also accepts an optional trusted
`{deadlineMonoMs}` harness budget — a finite absolute monotonic-ms
bound in the *same* hrtime domain (`floor(BigInt(clock.nowMonoNs()) /
1000000n)`; the watchdog/cleanup owners derive theirs from that same
origin, never `performance.now()` or `Date.now()`). A supplied
options object must own EXACTLY that one key with a finite value:
`{wrong:1}`, `{deadlineMonoMs:null}` or a missing value all fail
`ACCOUNTING_UNAVAILABLE` rather than silently defaulting.
Zero-argument IO methods take it as `start(options?)`,
`sample(options?)`, `stopAndReap(options?)` and
`backendIdentity(options?)`; methods with an existing input take
`registerRoot(input, options?)`, `probeIdentity(identity, options?)`,
`signalOwned(input, options?)` and `queryListeners(scopeRunId,
options?)`. Synchronous `registerPort` and the getters carry no
option. The captured operation horizon is computed *before* enqueue
as `min(constructor-captured deadline, later getter value, call
deadlineMonoMs, now + fixed operation ceiling)` where the fixed
ceiling is `commandMs` (90 s) for every public operation except
`start`, whose WHOLE spawn/ready/bootstrap/first-cycle path is
bounded by `readinessMs` (30 s) instead. The serialized queue is
itself bounded: the returned public promise must settle by the
captured horizon, admission re-checks the remaining budget before a
queued function may run, and a later-narrower trusted getter —
observed at any subsequent operation — re-arms every live queue and
reply wait earlier (never later), so a cleanup transition cannot
leave an older request waiting on its previous longer timer. An
expired queued function never issues native work, activates roots or
declares success; an already-dispatched request whose settlement is
unknown remains unproven rather than fabricated cancelled or gone.
Every queue, write, reply, read and reap wait consumes the same
captured horizon. A missed budget settles pending work with the fault
latched. Omitting the option leaves only the fixed ceilings, so
isolated library use stays valid; real monitored callers must supply
the original budget. This is a private harness seam — no wire, CLI or
driver field changes.

Each operation captures exactly ONE mutable narrow-only BudgetHandle
(`process-budget.mjs#createBudgetHandle`/`captureDeadlineMs`, glued
inside the monitor's facade-private `captureHandle`) BEFORE
enqueue; the SAME handle object rides the queue item into its
dispatched function, the transport pending reply, every native
send/inspect/sample round, root activation, observation commit,
listener projection, lsof stage and backend IO stage. A later
narrower trusted bound reaches every live handle — active AND queued
— through `queue.narrowAll`, and `queue.track` keeps unqueued work
(the lsof gate, the backend capture and the start/stop waits)
narrowable until its actual task settles; a nested queued subtask
finishing never ends the owner handle's narrowing, a borrowed child
never disposes the owner handle, and public rejection is never
treated as cancellation or settlement evidence. The private
`ownOperation(handle)` creates each call's actual-settlement
lifetime BEFORE enqueue: it immediately takes the owner
`queue.track` acquisition and captures `actualSettled =
queue.whenSettled(handle)`, then returns `{finish, retainActual,
actualSettled}`. `finish()` releases only the owner acquisition
once; `retainActual(p)` takes one more acquisition released exactly
when `p` — a physical settlement receipt registered BEFORE its IO
is initiated — fulfills on the real stat return/error, stream
close, exit-plus-pipe-closes or truthful no-child failure; and the
handle is disposed only when `actualSettled` resolves after every
acquisition reaches zero, never on public `finally`. `call` and
`callUnqueued` both run `fn` inside this lifetime (the unqueued
path invokes `fn(handle, lifetime.retainActual)` through a Promise
continuation so synchronous validation errors still reach
`finish`), and their public `finally` blocks call `finish` only —
public timeout, operation error or destruction initiation never
releases a physical acquisition or fabricates settlement.
`assertLive`
rechecks the actual clock before every claimed success, so an
expired or narrowed request can never activate a root, commit an
observation, emit a success or start a successor. The runtime is
composed through `createProcessRuntime({config, state, authority})`
from `process-runtime.mjs`: `config` carries the monitor's fixed
{runId, pythonExecutable, helperPath, protocol, clock, spawnImpl,
recordRoot}, `state` is the monitor-owned mutable {child, transport,
lsof, readyEvidence, ownUid, timer, tickQueued} union, and
`authority` carries the borrowed {op, ownOperation, enqueue, queue, nextRid,
markFault, hasAccountingFault, proofs, runCycle, getApi} plus the
named lsof callbacks {registerHelper, signalHelper, proveTransition}
which enqueue nested proof work on the SAME queue with the SAME
handle. The factory is pure and lazy — no spawn, timer or IO at
construction — and introduces no second queue, allocator, fault,
clock or state authority.

A monitor never signals by handle, PID guess, name, path or negative
process group: `child.kill`/`process.kill` appear nowhere. Where a
required settle outlives the admitted deadline the monitor ends its
private pipes and retains `CLEANUP_UNPROVEN` evidence with the true
unresolved handle/tuple state instead of faking a reaped exit or
widening protected-root authority.

- `start()` spawns the collector (`python -I -B helperPath --collector
  --run-id <runId> --supervisor-pid <pid>`, stdio pipes, no shell),
  validates the startup `ready` envelope through the shared protocol,
  then natively proves both bootstrap tuples before `own-roots`: the
  collector PID must equal the spawned child's real PID and the
  supervisor tuple must equal `process.pid`, the inspected collector
  `ppid` must be the supervisor, both must share one UID, and each
  resolved executable must match the realpath of the corresponding
  pinned image (`process.execPath` for the supervisor, the resolved
  `pythonExecutable` for the collector). Only after the exact
  `ready`/`roots-accepted` acknowledgement do the registrations
  activate locally; a forged or unverifiable tuple fails startup, the
  wire is asked to shut down (or the private pipes end on a failed
  wire) and the real handle is reaped inside the same start deadline —
  an unsettled child retains `CLEANUP_UNPROVEN`, never a raw kill or a
  faked reap. Startup then completes one full covering sample cycle
  and begins the 250 ms interval.
- `registerRoot({pid, kind, expectedExecutable, scopeRunId}) ->
  Promise<{identity}>` proves a spawned root through native
  `inspectPids` first: the inspection must report `live`, the resolved
  executable must equal the declared path byte-for-byte, the row's UID
  must equal the supervisor's, and the row's `ppid` must be the
  supervisor PID itself or a *freshly inspected* parent tuple that
  exactly equals a retained owned tuple — a cached owned PID number is
  never lineage proof, so a reused PID of a dead member cannot adopt
  an unrelated child. Only then is the exact
  `{identity, kind, expectedExecutable, scopeRunId}` record sent in
  `own-roots`, the exact `roots-accepted` acknowledgement awaited, and
  the registration activated in the cache. A caller-declared identity
  or a same-executable unrelated PID is never proof.
- `sample()` issues the composite `sample` request carrying
  `ownership.ownedIdentities()` as `owned`; every accepted sample
  reply's `discovered` refreshes `observeDiscovery`, and every newly
  discovered owned member is resampled inside the same bounded cycle
  until the whole union is covered — a zero, carried or missing
  `residentBytes` is never admitted, an unsafe aggregate is rejected,
  and unsettled coverage faults the monitor. Each reply's native
  `finishedAtMonoNs - startedAtMonoNs` duration and the supervisor's
  completed-cycle gap are both bounded by `sampleGapMs` (500 ms),
  including the slow first sample; clock origins are never mixed.
  `lastObservation()` retains the newest *valid* cycle
  `{atMonoNs, rssBytes, peakRssBytes, rssLimitExceeded, accountingValid, intervalMs, sampled, gone}`
  and reports `accountingValid:false` once a fault latches or a
  still-running monitor's last valid observation has gone stale; a
  failed cycle never overwrites the retained valid values with zeros
  or stale claims. At most one interval cycle is ever queued or in
  flight; caller-initiated `sample()` calls serialize through the
  same request chain, and any thrown coverage/timing error latches
  `ACCOUNTING_UNAVAILABLE` immediately.
- `probeIdentity(identity)` answers `same-live`/`gone`/`unavailable`
  from a fresh exact-tuple native probe — never a cached or invented
  verdict. `signalOwned({identity, signal, scopeRunId}) ->
  Promise<"sent"|"gone"|"identity-changed">` asserts the cached
  ownership/scope, binds `authorizeSignal` to the exact tuple, sends
  `signal` and returns the actual outcome; the collector re-reads the
  tuple natively immediately before `os.kill`.
- `queryListeners(scopeRunId) -> Promise<{listeners, unexpected}>`
  runs one gated `owned-pids` query over every captured workload PID
  of the scope plus one gated `port` query per registered port, each
  under the original remaining deadline. A proven empty holder set is
  valid absence, not a failure. Every reported holder PID is then
  *freshly inspected*: a holder is a listener only when its fresh
  native tuple exactly equals a retained owned workload tuple of that
  scope — a reused PID with a new start tuple stays `unexpected`, so
  a dead captured PID can never adopt an unrelated current holder. A
  declared port's `ownerIdentity` is compared as a full tuple, never
  by PID. Wildcard and nonloopback rows, unproven or not-owned
  holders and declared-port mismatches are reported in `unexpected`
  and never adopted or signalled.
- `stopAndReap() -> Promise<{exitCode}>` ends the interval, lets the
  serialized request chain settle inside the captured deadline,
  sends the real `shutdown` request (a rejected send ends the private
  stdin instead of being swallowed), and reaps the collector through
  its actual child handle — always last after workload and listener
  proof. A collector that does not settle inside the same deadline
  retains `CLEANUP_UNPROVEN` and the true exit state; no signal ever
  reaches the protected collector by handle or PID.
- `backendIdentity()` delegates to `captureBackendIdentity` in
  `process-backend.mjs` with the verified startup ready evidence, the
  pinned `pythonExecutable` invocation, the three frozen helper paths
  (`process-macos.py`, `process-macos-native.py`,
  `process-macos-abi.py`) and `recordRoot`. It returns the closed
  `BackendIdentity` after `assertBackendIdentity` validates it.
- Private seams for the watchdog/cleanup owners only: `_ready()`
  returns a copy of the accepted startup ready evidence,
  `_ownership` is the ownership registry object (with `_ownedRows()`,
  `_rowFor(identity)` and `_setRootRow(row)`), and `fault()` returns
  the sticky fault record once set. None substitutes for native proof.

### process-runtime.mjs

`createProcessRuntime({config, state, authority}) -> {start,
stopAndReap}` owns the WHOLE collector lifecycle extracted from
`processes.mjs` under the readable-runtime split decision. The
factory is pure and lazy: no spawn, timer, await or IO runs at
construction. `config` carries the monitor's fixed inputs `{runId,
pythonExecutable, helperPath, protocol, clock, spawnImpl,
recordRoot}`; `state` is the monitor's ONE shared mutable lifecycle
object `{child, transport, lsof, readyEvidence, ownUid, timer,
tickQueued}` — the runtime mutates it and the monitor's
proofs/observation/`requireHealthy` read the same object, so no
second state authority exists; `authority` carries the borrowed
monitor functions `{op, ownOperation, enqueue, queue, nextRid, markFault,
hasAccountingFault, proofs, runCycle, getApi}` plus the named lsof
callbacks `{registerHelper, signalHelper, proveTransition}`.

`createProcessOperationCapture({clock, nowMonoMs,
queue, readBounds}) -> frozen {captureOperationBound, op}`
is an additional private module factory export declared
before its future use: it receives the WHOLE existing
42-line capture/`op` block moved from `processes.mjs`
with the same comments, guards and layout over the SAME
`clock`/`queue`. Construction is pure — it invokes no
callback, timer, queue or IO. `readBounds()` is the
facade-owned armed/brand guard and returns
`{constructorDeadlineMs, laterDeadlineMs}`; strict
deadline capture and BudgetHandle construction delegate
to existing process-budget.mjs, with `createBudgetHandle`
for handle creation over the SAME queue (`queue.track`
acquisitions belong to `createProcessLifetimeOwner`,
never this capture factory). The monotonic STOPPING rejection stays
on facade ORDINARY `op` entry around the returned `op`
— not inside `readBounds` or `captureOperationBound` —
so a repeated stop may still validate and min-narrow
after stopping. No public monitor-key change, no second
owner/clock/queue, and the runtime `{start, stopAndReap}`
roster stays unchanged.

`realProcessClock` is an additional private module
export declared before its future use under capacity
decision 50: it receives the WHOLE existing seven-line
default `realClock` object `{setTimeout, clearTimeout,
setInterval, clearInterval, nowMonoNs: () =>
process.hrtime.bigint().toString()}` moved whole from
`processes.mjs`, preserving every function reference,
body and its comment. The facade imports it as
`realClock` and passes the SAME object via the existing
`config.clock` member. No member is invoked at module
or factory construction — actual timers and clock reads
occur only on existing operational calls — and there is
no object freezing, second clock, new origin or
`{start, stopAndReap}`/monitor-roster change.

- `start(options?)` captures ONE readiness BudgetHandle through
  `authority.op(options, readinessMs)` (30 s for the whole
  spawn/ready/bootstrap/first-cycle path) and one
  `authority.ownOperation` lifetime for its actual settlement,
  asserts the handle live immediately before `config.spawnImpl`
  launches the collector (a spent bound performs no IO), builds the
  `createCollectorTransport` wire,
  awaits `transport.awaitReady(handle)`, enqueues
  `proofs.proveBootstrap` with the SAME handle, stores `ownUid` and
  `readyEvidence` on `state`, composes `createLsofQueries` over the
  borrowed callbacks, starts the 250 ms `tick` interval and runs the
  first covering cycle — all inside the one readiness handle, whose
  public `finally` releases only the owner acquisition through
  `finish()`. On a bootstrap failure the returned child's
  `transport.whenReaped()` receipt is registered with
  `retainActual` BEFORE the bounded teardown wait, then private
  teardown reaps inside the same handle — `CLEANUP_UNPROVEN`, never
  a raw kill or faked reap; the actual receipt stays owned until the
  real exit plus both pipe closes even after the public start
  rejects. A healthy running child stays owned by `state` and is not
  an ordinary startup-drain dependency.
- The private `tick` enqueues one bounded `runCycle` per interval
  while `state.tickQueued` gates re-entry; the gate opens from the
  tick's own `ownOperation` lifetime and `state.tickQueued` resets
  only when `lifetime.actualSettled` resolves, so a public expiry
  cannot admit a second tick while the old actual queue item is
  still pending — a stalled cycle blocks later ticks rather than
  accumulating samples.
- Private `teardown(handle)` is wire-only: a no-ack `shutdown` frame
  or private-pipe EOF on a failed wire, then `transport.reap(handle)`
  requiring the real exit plus BOTH real pipe closes.
- `stopAndReap(options?)` captures its own per-call handle and
  `ownOperation` lifetime, clears the interval, narrows every live
  tracked handle to the stop bound through `queue.narrowAll` (a
  method-specific narrowing that never shortens unrelated healthy
  work), obtains `queue.settled({excludeHandle: handle})` so the
  drain cannot wait on itself, registers both that ordinary drain
  and `transport.whenReaped()` as physical receipts with
  `retainActual`, then waits on the SAME handle. A public drain
  timeout is `CLEANUP_UNPROVEN` — never swallowed as a successful
  drain and never followed by a late-success continuation; when the
  drain actually completes the bounded teardown reaps
  collector-last, and an unsettled child retains `CLEANUP_UNPROVEN`
  with the true exit state. `finish()` releases only the owner
  acquisition; drain/reap receipts keep the stop's actual ownership
  after public failure.

### process-proof.mjs

`createProcessProofs(options)` is the private native-proof owner
extracted from `processes.mjs` under the proof-split decision. It is
exported for the sole monitor caller, keeps no registry, spawn or wire
of its own, and joins the functional runtime input union. Every proof
runs over the monitor's same ownership/protocol/transport/deadline
state through explicit callbacks; it never substitutes a cached or
invented verdict for a fresh native result.

Options: `runId`, `pythonExecutable` (the pinned invocation bound to
the bootstrap ready evidence), `protocol` (the one run-global
validator authority, used only for `authorizeSignal`), `ownership`
(the monitor's one ownership registry), `send(type, fields,
requestId, handle)` (the monitor's transport-bound request
send consuming the caller's borrowed BudgetHandle), `enqueue(fn,
handle)` (the monitor's serialized bounded queue, used for proof
work issued from the unqueued listener path so every Native
submission rides the SAME queue with the SAME handle), `nextRid(prefix)` (the monitor's one
global request allocator), `requireHealthy()` (the monitor's
liveness/fault guard, invoked before proof IO), `lsofQueries()` (the
monitor's gated lsof query owner), `ownUid()` (the proven bootstrap
UID), and `resolvePath`
(injectable realpath adapter, default `fs.realpathSync`).

Every IO proof method takes the monitor's borrowed BudgetHandle as a
trailing argument and consumes it for every request it issues,
rechecking `assertLive` at each claimed success:

- `proveBootstrap({ready, childPid}, handle) ->
  Promise<{ownUid}>` binds the accepted ready envelope to the real
  child PID and supervisor PID and the pinned `pythonExecutable`,
  natively inspects both bootstrap tuples for live/identity/resolved-
  executable/ppid/UID proof, sends `own-roots` for supervisor and
  collector, awaits the exact `roots-accepted` ack and activates both
  registrations in the shared ownership. Any mismatch fails startup.
- `registerRootProved({pid, kind, expectedExecutable, scopeRunId},
  handle) -> Promise<{identity}>` performs the native
  inspect/executable/UID proof plus *fresh parent-tuple* lineage: a
  non-supervisor `ppid` is re-inspected in a second request and must
  equal a retained owned tuple exactly (PID reuse is not lineage).
  Then the own-roots acknowledgement described under `registerRoot`.
- `probeIdentityFresh(identity, handle) ->
  Promise<"same-live"|"gone"|"unavailable">` sends a fresh
  exact-tuple probe; an invalid identity, transport failure, deadline
  expiry or missing probe result is `unavailable`, never a guessed
  `gone`.
- `signalOwnedProved({identity, signal, scopeRunId}, handle)
  -> Promise<"sent"|"gone"|"identity-changed">` asserts the cached
  ownership/scope via `ownership.assertSignalTarget`, binds
  `authorizeSignal` on the exact tuple under the allocated request
  ID, sends `signal` and returns the real outcome.
- `queryListenersScoped(scopeRunId, handle, {retainActual} = {}) ->
  Promise<{listeners, unexpected}>` runs the captured-PID and
  per-port gated queries under the borrowed handle — forwarding
  `retainActual` into the lsof options so each gate's deferred
  child/pipe receipt is registered before its spawn — then freshly
  inspects every distinct holder PID through `enqueue` on the SAME
  queue with the SAME handle: a holder is a listener only when its
  fresh
  tuple exactly equals a retained owned workload tuple of that scope
  (declared `ownerIdentity` compared as a full tuple); wildcard,
  nonloopback, unproven/not-owned and mismatched holders are reported
  in `unexpected` and never adopted or signalled.
- `proveTransition({identity, fromExecutable, toExecutable},
  handle) -> Promise<"live-transition"|"pre-transition"|
  "unexpected"|"gone"|"unavailable">` is the lsof gate's private
  transition evidence: one `inspectPids` read on the same tuple —
  `toExecutable` means the authorized exec happened
  (`live-transition`), `fromExecutable` means the gate is still in
  its pinned interpreter (`pre-transition`), a mismatched tuple or
  third image is `unexpected`, and a fast post-ack exit is `gone`
  (the documented legal case).

### process-budget.mjs

Sole leaf owner of the BudgetHandle authority, bounded waits and the
one serialized bounded queue, shared by the monitor, proofs,
transport, lsof and backend. No registry, process, native call,
protocol ID, ownership state or IO on import and no fallback clock,
duration or authority.

- `createBudgetHandle({deadlineMonoMs, clock, nowMonoMs}) -> handle`
  creates the ONE private mutable narrow-only deadline handle over a
  finite safe absolute monotonic-ms bound in the shared hrtime origin.
  Methods: `deadlineMonoMs()` (current bound), `remainingMs()`
  (conservative floored remainder), `assertLive(detail)` (throws
  `ACCOUNTING_UNAVAILABLE detail` when the ACTUAL supplied clock has
  passed the bound — rechecked before every claimed success),
  `narrow(bound)` (moves the bound EARLIER only, immediately expiring
  or re-arming as needed — a later value never widens),
  `onExpire(callback) -> unsubscribe` (sticky expiry notifies each
  subscriber once; subscribing after expiry calls back immediately)
  and `dispose()` (clears the one re-armable owned timer and the
  subscriber set; a disposed/expired handle never revives). A
  duration override is never accepted as an absolute deadline.
- `captureDeadlineMs({nowMonoMs, constructorDeadlineMs,
  laterDeadlineMs, callOptions, ceilingMs}) -> bound` validates every
  present bound as a finite absolute monotonic-ms value and returns
  the clamped BOUND `min(nowMonoMs + ceilingMs, constructorDeadlineMs,
  laterDeadlineMs, callOptions.deadlineMonoMs)`, computed once BEFORE
  enqueue. `callOptions` is the trusted private `{deadlineMonoMs}`
  object only: a supplied object must own EXACTLY that one key with a
  finite value — `{wrong:1}`, `{deadlineMonoMs:null}` or
  `{deadlineMonoMs:undefined}` all fail `ACCOUNTING_UNAVAILABLE`.
  Only an omitted `undefined` option leaves the fixed ceilings. The
  handle-from-bounds glue `captureHandle` is facade-private inside
  `processes.mjs`; the leaf exports the bound primitive plus
  `createBudgetHandle`.
- `waitHandle(handle, promise, detail) -> Promise` settles the public
  side of an ALREADY-ISSUED settlement at the handle horizon through
  `onExpire`, clearing the subscription when the loser finishes. The
  underlying work keeps running and stays tracked — public rejection
  is not cancellation or settlement evidence.
- `sleepHandle(handle, clock, sleepMs) -> Promise` resolves after
  `sleepMs` under the injected `clock.setTimeout` or rejects
  `ACCOUNTING_UNAVAILABLE` at the handle horizon, always clearing the
  losing timer/subscription and rechecking the actual clock through
  `assertLive` before a late timer may resolve.
- `pollHandle({handle, clock, pollMs, boundMs, check}) -> Promise`
  repeats `check({resolve, reject})` under `clock.setTimeout` every
  `pollMs` until it settles, the handle expires or `boundMs` elapses —
  `check`'s `resolve` also rechecks `assertLive`, so an expired
  handle can never admit a late success — a whole wait/poll
  lifecycle owned in this leaf.
- `createBoundedQueue({clock, nowMonoMs}) -> {narrowAll, enqueue,
  track, whenSettled, settled}` is the monitor's one serialized
  bounded queue and the one acquisition authority.
  `enqueue(fn, handle)` admits `fn` on the shared chain only while
  its SAME handle stays live — an expired queued function never
  runs — and the public promise settles at the handle horizon even
  behind a longer earlier request. `track(handle)` registers a live
  handle for `narrowAll` outside the queue (unqueued lsof/backend
  and start/stop waits) and returns its `untrack`; every acquisition
  — a queued item's run, a tracked task or a physical receipt —
  reference-counts into that handle's live entry, so a nested queued
  subtask finishing never ends the owner handle's narrowing while
  the owner's actual task still runs. `whenSettled(handle)` returns
  the entry's zero-acquisitions promise: it resolves only after
  every actual acquisition on that handle — owner, queued run and
  registered physical receipts — has released, and stays pending
  while any receipt is unproven. `settled({excludeHandle} = {})`
  drains the serialized chain AND every live tracked entry's
  `whenSettled`, skipping `excludeHandle` so a caller cannot wait on
  itself; it is not a snapshot of public promises — physical
  acquisitions that outlive their public rejection still gate the
  drain. `narrowAll(bound)` narrows every acquired handle — active
  and queued — earlier, never later. Already-dispatched
  work stays unproven, never fabricated cancelled or gone.

### process-observation.mjs

`createProcessObservation(options)` owns the fixed-point RSS
observation cycle and the current-observation projection over the
monitor's same state. It keeps no second ownership/protocol/state
authority: every request uses the monitor's transport-bound `send` and
`nextRid` allocator, every cycle consumes the caller's borrowed
BudgetHandle, and committed facts flow back through
explicit callbacks only.

Options: `ownership` (the monitor's one registry, used for
`ownedIdentities` and `observeDiscovery`), `send(type, fields,
requestId, handle)` (the monitor's transport-bound send consuming the
caller's borrowed BudgetHandle), `nextRid(prefix)`,
`requireHealthy()`, `clock` (the shared hrtime clock), `state()`
(the monitor's `{lastObservation, lastValidNs, stickyFault, sampling,
nowMonoNs}` getters) and `commitCycle(obs, finishedNs)` (the
monitor's commit of the admitted observation and last-valid
timestamp).

- `runCycle(handle) -> Promise<observation>` performs one complete
  bounded cycle under the caller's ONE borrowed BudgetHandle: every
  owned union member is sampled or proven gone, members discovered
  during the cycle are resampled inside the same bounded round set
  (8) before admission, each reply's native `finishedAtMonoNs -
  startedAtMonoNs` duration is checked in the PYTHON monotonic origin
  only and the supervisor completed-gap is checked in the hrtime
  origin — origins are never mixed. The RSS aggregate must stay a
  safe non-negative integer, and `handle.assertLive` rechecks the
  actual clock immediately before commit so an expired or narrowed
  request can never admit late. A discovery, coverage, native-timing,
  supervisor-timing, aggregate or budget failure throws
  `ACCOUNTING_UNAVAILABLE` and the monitor latches it; only an
  admitted cycle commits `{atMonoNs, rssBytes, peakRssBytes,
  rssLimitExceeded, accountingValid:true, intervalMs, sampled,
  gone}`.
- Private peak aggregate: `peakRssBytes` is the running maximum of
  the actual whole-union `rssBytes` across every admitted complete
  250 ms cycle (equal to `rssBytes` on the first admitted sample —
  `lastObservation` stays `null` before any valid cycle, never a
  fabricated zero); `rssLimitExceeded` is the sticky boolean latched
  the first time a complete sample's `rssBytes` is strictly greater
  than 4294967296 (4 GiB). Both survive lower later samples and
  accounting faults, neither ever clears, and an overage alone never
  latches the monitor fault or blocks healthy cleanup. The watchdog
  consumes these flags in a later sequential pass — before ordinary
  admission/finish and again after cleanup — so no record, wire or
  schema field changes.
- `projectObservation()` returns the retained observation with the
  sticky/stale `accountingValid` rules applied: a latched fault or a
  still-sampling monitor whose last valid completion aged past
  `sampleGapMs` reports `accountingValid:false` without zeroing the
  retained facts. `processes.mjs#lastObservation` delegates here.
- `readProcessInspections(pids, handle, {send, nextRid}) -> Promise`
  is the shared inspectPids wire wrapper moved out of
  `process-proof.mjs` under the diagnostic-repair decision (22) to
  keep that owner under the readable cap: it sends ONE `sample`
  request `{owned:[], inspectPids:pids, probes:[]}` under request ID
  `nextRid("inspect")` on the caller's borrowed handle and returns
  `reply.inspected`. It performs no validation, IO, state, timer,
  registry, scheduler or clock of its own — caller validation and
  the transport/validator guards are unchanged. `process-proof.mjs`
  keeps a local two-argument `inspect` delegator plus all
  classification authority.

### process-backend.mjs

`captureBackendIdentity(options) -> Promise<BackendIdentity>` is the
private backend-identity owner. It is exported for the sole monitor
caller, performs no spawn, native call or import-side IO, and joins
the functional runtime input union.

Options: `ready` (the accepted startup ready evidence: collector,
supervisor, platform, arch, abi, python, libprocPath),
`pythonExecutable` (the absolute invocation path, which must equal
`ready.python.executable`), `helperPaths` (exactly the three frozen
Python sources), `recordRoot` (the confinement root the recorded
helper refs are relative to), `budget` (the documented private
borrowed BudgetHandle from the monitor — every stat/read/hash/close
initiation calls `assertLive` on it first; when omitted, the capture
creates ONE entry handle bounded by `deadlineMonoMs` or the isolated
90 s ceiling and disposes it only after every physical receipt
settles), `retainActual` (the borrowed operation's
physical-settlement registrar, REQUIRED when `budget` is supplied —
each stat/stream receipt is a deferred promise registered BEFORE the
actual `statFile`/`createStream` invocation and fulfills only on the
real stat return/error or stream `close`, so public failure never
releases a physical acquisition), `deadlineMonoMs` (optional finite absolute bound used
only for the isolated default), and the injectable same-process
adapters `statFile`, `createStream`, `resolvePath`
(default `fs`/`createReadStream`/`realpathSync`), `osRelease`,
`osVersion` (default `node:os`), `nowMonoMs`, `delay`/`clearDelay`
(the monitor forwards its own `clock.setTimeout`/`clearTimeout`
wrappers; default hrtime/`setTimeout`) and `readOsBuild` (default:
bounded read of the fixed
`/System/Library/CoreServices/SystemVersion.plist`
`ProductBuildVersion` — real observed OS build, never a sysctl child
or a release fallback).

Every file fact is produced by ONE owned bounded reader under the
same entry horizon — the `process-backend-reader.mjs` owner below:
`assertLive` runs before each IO initiation, a `statFile` pre-read
establishes regular-file identity and the size ceiling (1 MiB for
the plist and each Python helper source, 256 MiB for the Python,
lsof and libproc binaries) BEFORE the stream opens, actual bytes are
counted while reading so a mid-read overflow still fails the cap,
EOF requires the exact pre-stat byte count, and a post-read
`statFile` re-checks dev/ino/size/mtime — a file replaced or resized
mid-read fails closed. Binary payloads (the Python, lsof and libproc
images) stream each chunk directly into the rolling hash and byte
count with NO `parts` retention and no whole-binary concatenation;
only the ≤1 MiB text reads retain their chunk list. The named
`data`/`end`/`error` listeners and the handle's expiry subscription
stay attached until the real `close` event and are released exactly
there, and that same observed `close` is the only fulfillment of the
stream's physical receipt: `end`, a `destroy()` invocation or an
outer rejection alone is never close proof, and when actual closure
cannot be established within the ORIGINAL entry horizon — no fresh
close grace — the fact stays unavailable/unproven with its
unresolved reader evidence retained and no next IO or success is
attempted. A late settled read can never win after the horizon.
Oversized, interrupted or stat-unstable reads fail
`ACCOUNTING_UNAVAILABLE` closed, while a raw IO error such as
`EACCES` surfaces with its own original code — a catch-all never
converts an arbitrary IO error into evidence, nor evidence-mapping
into raw failure. The only `OS_SHARED_CACHE` image
is the documented case where the standalone
`/usr/lib/libproc.dylib` path provably does not exist (`ENOENT` from
stat/read), bound to the observed OS build and the fixed
`darwin-arm64-libproc-v1` ABI; every other read failure fails.

It constructs the unchanged closed shape: `backendId`
`"darwin-arm64-libproc-v1"`, `os {platform:"darwin", arch:"arm64",
release, version, build}`, `python {invocationPath, realPath, sha256,
version, executable, prefix, basePrefix}` (the invocation stays the
pinned path; `realPath`/`sha256` cover the resolved image),
`helpers` — exactly the three helper refs sorted by recorded-root-
relative path with real `byteLength`/`sha256`, `libproc {path:"/usr/
lib/libproc.dylib", abi:{bsdInfoSize:136, taskInfoSize:96}, image}` —
the actual file digest when readable, else `{kind:"OS_SHARED_CACHE",
osBuild}` tied to the observed build — and `lsof {invocationPath:"/
usr/sbin/lsof", realPath, sha256}`. `ready.platform`/`arch`/`abi`
must match the backend facts before assembly, and the finished record
is validated by `assertBackendIdentity` before it is returned.

### process-backend-reader.mjs

`createBackendReader({handle, retainActual, statFile, createStream})`
returns `{readFact(abs, cap, tag, binary = false)}` — the whole
stat/stream/hash owned-reader group extracted from
`process-backend.mjs` under the backend-reader readable-split
decision (21). It joins the functional runtime input union and holds
no independent deadline, clock, queue, registry, native or process
authority: `handle` is the capture's SAME already-captured borrowed
BudgetHandle (assertLive/onExpire only, never narrowed or disposed
here), `statFile`/`createStream` are the caller's injected
same-process IO adapters, and `retainActual` is the capture's
combined retention callback — invoked exactly once per physical
receipt BEFORE the actual `statFile`/`createStream` invocation
(deferred promise: the executor must not start IO early), so the
capture's own receipts array and, when borrowed, the monitor's
operation lifetime both hold the acquisition until real settlement.
The constructor performs no IO.

`readFact` keeps the exact contract: a `statFile` gate (regular
file, size <= `cap`) precedes the stream open; bytes are counted
while reading so mid-read overflow fails the cap; EOF requires the
exact pre-stat count; a post-read restat re-checks
dev/ino/size/mtime; the named `data`/`end`/`error` listeners and the
expiry subscription release only at the observed real `close`
(never `end`/`destroy()`/outer rejection), which is also the
physical receipt's only fulfillment. `binary:true` streams chunks
into the sha256/count with no parts retention and returns
`{sha256, byteLength}`; text returns `{buf, sha256}`. An unproven
close rejects `ACCOUNTING_UNAVAILABLE` with the reader facts
retained — no close grace, no late win.

### workspace-footprint.mjs

`createFootprintObserver({workspaceRoot, clock})` returns `scan`,
`readFootprint`, `stop`. `clock` supplies `nowMonoMs()` in the shared
`process.hrtime` origin. `scan()` performs one async `lstat` walk of the
whole workspace: the workspace root entry itself plus every prior phase,
selftest, input, model, profile, cache, temp and log subtree exactly
once, charging every regular file `max(logical size, blocks*512)` and
every directory/symlink its own allocation without following links.
Every entry requires real allocation metadata and safe-integer
arithmetic — a missing `blocks` field, an unsafe size/total or a walk
error makes the observation unavailable, never an invented charge.
`observedAtMs` is the actual monotonic *scan start* — the conservative
coverage boundary the artifact store uses for strictly-covered delta
retirement. Scan starts publish nondecreasing through one in-flight
walk; a `readFootprint()` joins the in-flight scan or starts a fresh
one, so no older completed walk can overwrite a newer observation —
only a strictly OLDER scan start is suppressed, so a same-millisecond
failed scan still marks its fault (the store permits same-timestamp
scans). The final `rootCharge + inner.total` addition is itself
safe-integer checked — inner additions being safe is not enough. Real
walk errors keep the last good observation flagged
`accountingValid:false` — never a zero or stale success. `stop()`
prevents new scans and invalidates the in-flight generation: an
interrupted walk still publishes an UNAVAILABLE observation preserving
the last real bytes/timestamp (suppression covers obsolete coverage
only, never the fault), and the active walk drains its current awaits.

### watchdog-cleanup.mjs

`createCleanupController({monitor, clock, recordEvent, runId})` returns
`run` and `verifyCleanup`. `runId` is the required run binding; `clock`
supplies `setTimeout`, `clearTimeout` and `nowMonoMs()` in the shared
`process.hrtime` origin — `Date.now`/`performance.now` are never used.
`run({phase, scope, scopeRunId, expectedFinalizer, supervisor,
deadlineMonoMs, cleanupStartMonoMs, settleWorkloadHandles})` executes
the fixed staging on one absolute monotonic start: `cleanupStartMonoMs`
is the trusted caller-captured ORIGINAL start in the same
`process.hrtime` origin (finite, non-`Date.now`); when it is absent the
controller captures `nowMonoMs()` at run entry (legacy omission only —
a supplied invalid value such as a fraction, non-finite number, string
or `null` is rejected without capturing a fresh start or window).
Graceful window
`0..2000 ms`, `TERM` at original `+2000`, `KILL` at original `+4000`,
and every live/listener/helper proof plus collector reap completes by
original `+5000` *or the earlier `deadlineMonoMs`* — a short inherited
bound never moves a future TERM/KILL earlier and no fresh stage or
probe starts once the window is exhausted (the run ends unproven
instead). The final proof begins right after the KILL stage, finishing
by `+5000` rather than sleeping to `+5000` first.
Awaited probe/signal/query time is subtracted from the same horizon, so
the final proof can never start after the window was spent waiting, and
the deadline predicate allows no grace millisecond.
`deadlineMonoMs` is the caller's original remaining bound, not
a fresh allowance. The scoped workload set is reconciled from live
`_ownedRows()` before every stage and again before the final proof, so
descendants or query helpers discovered mid-cleanup are still accounted;
targets go descendants-first and every identity is freshly probed
(`probeIdentity`) before `signalOwned` re-checks the exact tuple
natively. For `phase-workload`, targets are EVERY actual retained
workload/helper row in the same ownership registry (any scope,
including the registered `${scopeRunId}:watchdog-selftest` subtree and
its helpers); `selftest-workload` narrows to the exact `scopeRunId`
only. Healthy supervisor/collector accounting roots are never targets.
Listener proof queries `queryListeners` for EVERY actual included scope
(the parent scope plus the real nested scope for `phase-workload`), so
nested registered ports are never omitted. A probe exception or a
returned `unavailable`/`unknown` verdict keeps the target a candidate
AND stays a sticky accounting failure — no null/stale accounting and no
swallowed failure: probe/signal/query/reap faults all charge against
`accountingValid`. After workload and query-helper settlement the
trusted `settleWorkloadHandles({deadlineMonoMs})` callback awaits the
actual driver handle (real exit plus both pipe closes) under the same
absolute end — a failed/late settlement, or a MISSING callback while an
actual driver-kind workload row exists, stays unproven — then the
complete current `lastObservation` is
captured WHILE the collector is live (a stopped monitor's projection
disables age checking, so sampling must still be running), and only
then does the collector's own `stopAndReap` settlement run last for
`phase-workload` scope only; `selftest-workload` leaves the
parent supervisor/driver/browser/collector and whole-union accounting
untouched. The retained private settlement is snapshotted before the
first await and deep-frozen wholesale — supervisor, every identity and
listener element, arrays and finalizer — and returned only as copies; a
repeated or in-progress `run` throws `CLEANUP_UNPROVEN`. The closed
proof is exactly
`{scope, expectedFinalizer, verified, survivorIdentities,
listenersRemaining, accountingValid}` with listener rows exactly
`{address, port, pid}` — unexpected holder diagnostics stay in bounded
`cleanup` events, never in the schema.
`verifyCleanup({phase, runId, supervisor, claimedProof})` — the
recorder's mandatory callback — binds the actual settled run: the
requesting phase/runId, the captured running supervisor and the claimed
`{scope, expectedFinalizer}` must all match the private settlement or it
throws `CLEANUP_UNPROVEN`; it never echoes `claimedProof` or a caller
boolean.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the trusted outer `settleWorkloadHandles` keeps this
SAME ordering — it FIRST awaits the actual
`state.ops.whenOrdinarySettled()` chain outside the ordinary body it
drains (including admitted nested callbacks, the own nested shutdown
and STOP), then initiates the own parent/own-nested
`channel.reap`/`close` under the SAME original deadline — a null
channel never skips the other debts — then
`finishDriverActualScope(capabilities.driverActualScope)` and the
required already-scheduled liveEvidence, all BEFORE the collector-last
reap inside this real controller and with no parent fence while a
selected nested STOP is still owed. The fixed Native graceful/+2 s
TERM/+4 s KILL stages start independently of that actual chain/FS on
the ORIGINAL captured start/end — no new grace, clock or late Native.

### watchdog-driver.mjs

`createDriverChannel({entry, args, cwd, execPath, protocol, runId, clock,
forkImpl, onMessage, onError, onExit})` returns `send`, `close`, `reap`,
`pid`, `exited`, `exitCode`, `connected`, `failed` and the `closedByUs`
getter marking disconnects initiated by our own `close()`/`reap()` as
the expected closure. It performs the
frozen `child_process.fork` of the absolute `entry` module under the
frozen `cwd` (`path.dirname(entry)`) with explicit `execPath`,
`execArgv:[]` (no inherited `--test`/strip flags), `stdio:["ignore",
"pipe","pipe","ipc"]` and `detached:true` — the driver is carried on the
Node IPC channel, never stdin JSON-lines — plus a referenced child
handle. `forkImpl` is the injected fork-compatible launcher
`(modulePath, args, forkOptions) -> ChildProcess` (default
`child_process.fork`), so supplied fakes are honored at exactly this
boundary. Every inbound IPC message is validated synchronously through
`protocol.accept("driver","d2s")` before `onMessage` sees it; every
outbound envelope is validated `s2d` before `child.send`. `send(type,
fields, settleMs)` submits each envelope exactly once — a `send(false)`
backpressure return already submitted the message and is never requeued
or replayed — and its settlement is bounded by `settleMs` against the
shared clock while the pending-send count stays under the fixed bound.
Child `error`, IPC `disconnect`, unexpected `exit` and failed sends
route to `onError`/`onExit`; this channel never calls `child.kill`,
never decides eligibility and never fabricates a native cleanup proof.
A `disconnect` observed after our own `close()`/`reap()` initiation
(`closedByUs`) is the EXPECTED closure and settles without an
`IPC_DISCONNECT` fault — genuine unexpected disconnects still fault.
`reap(remainingMs)` settles the handle exactly once — disconnecting an
open IPC channel, then awaiting the real `exit` and both pipe closes
inside the bounded wait — and keeps `CLEANUP_UNPROVEN`-style true state
on expiry rather than faking settlement.

WC07 correction landed (truthful-evidence decision 37 — repair-authored,
pending Sol verification): immediately after the injected fork returns,
the channel retains the actual expected stdout/stderr close
observations for the full channel lifetime, including a close observed
before the first reap. Only a genuine `closed===true` or observed close
counts — `destroyed` is never physical proof — and because the stdio
requirement is BOTH pipes, a missing expected pipe stays
invalid/unproven rather than a positive absence. The exit requirement,
once-only `send(false)`, original reap bound and the no-extra-grace
contract are preserved: `reap()` consumes the retained channel-scope
close facts through a settleNote rather than attaching late listeners —
reap waits actual exit PLUS both closes, and no thrown validation may
abandon the returned child. This anticipates the already-approved R4
private physical observers without implementing any R4
registrar/lifetime now; no new wire, schema, status or Native API.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the module roster becomes EXACT3 — the existing
`createDriverChannel` plus TWO new private named exports, pure
`createDriverActualScope({retainActual, runId, parentScope = null})
-> frozen opaque DriverActualScope` and `finishDriverActualScope(scope)
-> Promise<void>`. The scope factory uses a genuine private WeakMap
brand, validates the trusted registrar/`runId` and a supplied genuine
parent BEFORE any parent property read, requires the same registrar
with every ancestor open, and synchronously enrolls the child — no IO,
timer, receipt, clock, queue or second debt counter. The channel gains
the REQUIRED trusted `retainActual` and `actualScope` (EXACT13
constructor fields ending `...onExit, retainActual, actualScope`; the
EXACT9 returned roster above is unchanged) and validates scope
brand/exact registrar/exact runId/open+unused admission before fork —
one scope admits ONE constructor attempt. `finishDriverActualScope`
permanently fences constructor/send and child enrollment for the
ENTIRE enrolled subtree before passively joining the SAME real
receipts — repeated calls share the SAME join Promise, a parent
aggregate covers enrolled nested and partial-constructor attempts, and
a nested finish joins ONLY its own subtree. The WC07 `closed===true`
shortcut and the no-registrar wording above are DATED — superseded by
the R4 rule that ONLY a genuine exit plus BOTH actual close events
retire physical debt under the required scope (preserved history; the
leaf now exists — delegation current, not verified green).

Corrective 65 (declared before creation/use — leaf created; delegation
current, not verified green): the WHOLE private scope brand/enrollment/tree,
constructor admission, shared neutral-receipt prearming, module-owned
strong pending-resource index and the WHOLE original `fail` error
factory above delegate to `watchdog-driver-actual.mjs`. The roster
stays EXACT3 — `createDriverChannel` plus the IDENTICAL re-exported
leaf `createDriverActualScope`/`finishDriverActualScope`; the EXACT13
constructor fields and EXACT9 public roster are unchanged, the module
imports the leaf `driverError` as the SAME `fail` with no duplicate
error constructor, and `beginDriverActualAttempt`/`driverError` are
never re-exported. The corrective-64 scope/admission/prearm wording
above stays valid as the SAME contract whose private owner is now the
leaf; the full contract is the spec's `#### Corrective 65 private
Driver actual owner (declared before creation/use)`.

Corrective 66 (declared before use — PLANNED, not yet implemented or
verified green): the WHOLE 47-line actual physical block — the expanded
109-122 physical booleans/`notePhysical` and 161-193 actual-exit plus
BOTH pipe-close observer block with every comment — moves to the leaf's
new private `observeDriverPhysicalChild`, invoked ONCE immediately after
`physicalChild.adopt(child)`/before connected/pid/user reads; the
returned ACTUAL pipe refs feed the data/error drains and public `closed`
flags, while the borrowed `onPipeClose("stdout"|"stderr")` still updates
the SAME public `outClosed`/`errClosed`/`noteSettle` after each actual
pipe fact plus `physicalChild.settle` — the "Driver installs the actual
listeners" wording above is DATED, superseded by the leaf's observer
ownership (preserved history). EXACT3 module exports, EXACT13
constructor fields and EXACT9 public roster are unchanged, the private
observer is never re-exported, and the synchronous `child.send` catch
now calls `settle(error, true)` on the existing error channel — ordinary
`null`/`undefined` callbacks still mean success while the ambiguous
issued throw stays owed; no new wire, schema or status. The full
contract is the spec's `#### Corrective 66 whole physical-observer and
awaiter owner binding (declared before use)`.

### watchdog-driver-actual.mjs (created — corrective 65)

Declared before creation/use — the leaf now exists and the consumer
wiring is current in this R4 batch; no green claim. The WHOLE private Driver actual owner extracted from
watchdog-driver.mjs under the literal
`65-expanded-driver-whole-owner-input.json` move authority: the WHOLE
24-30 error factory, the WHOLE 36-116 scope brand/enrollment/tree plus
pending-index regions and the WHOLE 138-149 constructor
admission/prearm guards move cohesively with every comment and the
original result/error semantics; the D1-D7 semantic corrections are
identified separately, so no claim says the expanded bytes were
already correct. The roster is EXACTLY four private exports:

- `createDriverActualScope({retainActual, runId, parentScope = null})
  -> frozen opaque DriverActualScope` — pure ScopeFactory over the
  SAME private WeakMap brand: validates the trusted registrar/`runId`
  and a supplied genuine parent BEFORE any parent property read,
  requires the same registrar and every ancestor open, and
  synchronously enrolls the child — no IO, timer, receipt, clock,
  queue or second debt counter. The parent's `runId` MAY DIFFER (D2);
  the child constructor still matches its OWN scope's `runId`.
- `finishDriverActualScope(scope) -> Promise<void>` — synchronously
  and permanently fences constructor/send AND child enrollment for the
  ENTIRE enrolled subtree before any await, then passively joins the
  SAME real receipts; repeated calls share the SAME join Promise; a
  nested finish joins ONLY its own subtree — no public reap, global
  zero, proof, `allSettled` or IO.
- `beginDriverActualAttempt({retainActual, runId, actualScope}) ->
  frozen {isOpen, rawFork, physicalChild, armSend}` — the sole
  effectful prearming owner (EXACT3 args -> EXACT4 private
  capabilities), owning the SAME registrar/scope/runId/open/one-
  attempt guards invoked AFTER the original Driver argument guards.
  BOTH the rawfork-issuance and physical-child neutral Promise
  receipts are created and indexed in the SAME scope plus the
  module-owned STRONG pending-entry Set BEFORE the FIRST reentrant
  `retainActual` call — each SAME `.promise` registered exactly once,
  never the entry object. `physicalChild` is a 3-member capability
  `{promise, settle, adopt}` — the DRIVER installs the actual `exit`
  plus BOTH `stdout.close`/`stderr.close` event listeners and calls the
  private physical settle only on true facts; `adopt` only pins.
  `isOpen()` reads the SAME private admission;
  `physicalChild.adopt(actualReturnedHandle)` pins the SAME returned
  resource immediately before semantic reads; `armSend()` preregisters
  the send-callback/no-issue receipt before fallible/reentrant
  preparations. `begin` never forks; the caller may copy the frozen
  fork args beforehand, and no fallible callout before the actual fork
  goes unowned.
- `driverError(code, detail) -> Error` — the WHOLE original `fail`
  factory and its comment, unchanged prefix/code/body; Driver imports
  it as `fail` with no duplicate error constructor.

D1/D7: the paired receipts and index exist BEFORE the first retainer
reentry; open is rechecked before the actual fork and a fenced/failed
registration aborts truthfully preissue/no-child (preissue
reservations settle, the exact original throw preserved); `armSend`
indexes BEFORE registrar/callouts and rejects no-issue after the
reentrant fence. D3: the STRONG pending index is independent of
WeakMap-key/channel/error reachability — fulfilled entries retire
truthfully including resolved send receipts, unknown/pending physical
stays pinned, and join snapshots after the fence. D4: fork return OR
throw settles RAW issuance preserving the original error;
null/undefined/unadoptable returns are never absence proof; only
genuine default-fork identity and its accepted synchronous no-child
throw may retire the physical reservation; preissue guards/failed
registration retire without IO. D5: actual pipe close updates physical
facts/settles physical BEFORE fallible public notification; an
`onExit` throw never loses an actual receipt. D6: the send callback
settles the raw receipt on real arrival and routes a late callback
error via existing `onError` without replacing the first public
result; PUBLIC `closed` is not physical proof — only exit plus BOTH
actual events. No new ledger, clock, queue, proof, status or public
bag; the returned caps are PRIVATE Driver-owned capabilities, never
public proof/status/cancel methods or caller flags. DAG:
`watchdog-driver.mjs -> watchdog-driver-actual.mjs` one-way; the leaf
uses ONLY JavaScript intrinsics — no Node, Driver, Config, Shutdown,
records, watchdog, Native or test import and no back-import. The
module joins the functional-runtime input union — never TEST or a
BackendPython helper; `BackendIdentity.helpers` stays exactly the
three Python sources. Driver keeps EXACT3 exports — `createDriverChannel`
plus IDENTICAL re-exports of the two scope functions;
`beginDriverActualAttempt` and `driverError` are never re-exported.
The full contract is the spec's `#### Corrective 65 private Driver
actual owner (declared before creation/use)`. Capacity forecasts only
(not acceptance): the leaf about 180 lines and watchdog-driver.mjs
about 370 after the whole-region moves, under the hard-399 actual
readable cap with every comment/guard preserved — a known expanded
oversize is returned truthfully, never trimmed.

Corrective 66 (declared before use — PLANNED, not yet implemented or
verified green): the roster becomes EXACT5 — the four exports above
UNCHANGED plus the new private `observeDriverPhysicalChild({child,
physicalChild, onPipeClose}) -> frozen {stdout, stderr}` (EXACT3 trusted
refs -> frozen two actual pipe refs, no caller proof boolean). It owns
the WHOLE 47-line expanded-Driver physical block — the 109-122 actual
physical booleans/`notePhysical` and 161-193 actual-exit plus BOTH
pipe-close observer block/comments — with ONLY the borrowed
public-callback substitution: after each actual pipe fact plus
`physicalChild.settle` it invokes `onPipeClose("stdout"|"stderr")` so
Driver's SAME public close facts update. This is an EFFECTFUL
subscription to the already-owned adopted handle — not a pure
constructor or new IO issuer: no fork, send, disconnect, signal, clock,
timer, Native, validator, status, proof, queue, new receipt or ledger;
JS intrinsics only, no imports/back-edge, DAG Driver -> leaf one-way.
Helper getter/missing-pipe/error stays unknown-held; only genuine exit
plus BOTH close events settle physical, the original early exit listener
still runs ahead of public `onExit`, and physical settlement still
precedes the fallible public callback. The full contract is the spec's
`#### Corrective 66 whole physical-observer and awaiter owner binding
(declared before use)`.

### watchdog.mjs

`createWatchdog({phase, runId, commonIdentitySha256, workspace,
manifestPath, protocol, monitor, footprint, recorder, cleanup,
driverEntry, clock, spawnImpl, prerequisites, expectedSelfTest,
selftestOwnerSupervisor, runInternalSelfTest, pgnEvidence,
internalContext})` returns `run` and `requestStop`. The facade composes
the grouped `{config, capabilities, state, timing, control}` context
through `watchdog-runtime.mjs` (`captureWatchdogRuntimeConfig` for the
whole validation/derivation, `runWatchdogLifecycle` for the whole run
routine) while retaining the SAME first-stop/fault/operation/
finalization authorities over the ONE shared private state; `run()`
simply invokes the sole lifecycle owner and `requestStop` is the same
first-stop latch. `driverEntry` keeps
its three fields: `executable` (the selected absolute Node invocation),
`args` (`[absoluteFrozenModulePath, ...moduleArgs]`) and
`expectedExecutable` (the resolved native Node image used by
`registerRoot`). `spawnImpl` is the injected fork-compatible adapter
passed to the driver channel. `runInternalSelfTest`/`pgnEvidence` are
optional trusted supervisor dependencies, never driver-supplied.
`internalContext` (`{deadlineMonoNs, signal}`) is accepted only for
phase `watchdog-selftest` — an absolute `process.hrtime`-origin bound
plus a genuine `AbortSignal` that narrows and cancels the nested run;
supplying it for another phase, or an invalid/missing selftest context,
is rejected. `run()` takes no phase duration: the phase ceiling is the
fixed `600000`/`3600000 ms` limit from before monitor startup (capped
by `internalContext.deadlineMonoNs` for a nested run), ordinary work
ends at `phaseEnd - 5000`, and the cleanup reserve is the original
fixed window, never a caller-selected duration or a reset clock.
`run()` resolves the actual `{status, exitCode, stopReason}` from the
verified `final` record — never a synthesized pass — and retains
incomplete observed evidence (no invented tuple/running/final) when
bootstrap stops early.

The facade's private `control` group also owns these exact semantic
authorities: `state.cleanupStart`/`state.cleanupEnd` are captured ONCE
at the first failure `latchStop` OR at an admitted normal finish —
`cleanupEnd = min(capture + 5000, phaseEnd)` — and every later
stop-send, ordinary close, PGN association, selftest re-verify, cleanup
run, driver reap and finalization consumes that same original end
(`cleanupRemainingMs` never recomputes a fresh `now+5s`). `noteFinish`
is a synchronous control callback: it checks the sticky Native
`rssLimitExceeded` flag (a latched overage makes the finish a resource
stop, never an admitted pass), copies the finish, closes ordinary
admission, freezes PGN evidence with the actual `null` reason, captures
the cleanup bound and wakes the run; a late `finish` after any stop or
driver close is ignored and can never revive passage. The normal
shutdown still sends the wire `stop` with the documented nonempty
TRANSPORT reason `"FINISH"` (the wire requires a nonempty `stopReason`)
while `final.stopReason` and the frozen PGN `firstStopReason` stay
actual `null` — failure stops carry their real latched reason.
`admissionOpen` additionally requires `!monitor.lastObservation()
?.rssLimitExceeded`, and the flag is rechecked after cleanup before
finalization so an overage-lower-rapid-finish sequence can never pass.
`intentOutcome` forces a stopped run to the actual ineligible result —
`status:"inconclusive"`, `analysisEligible:false`, a real nonzero
`exitCode` and the latched `stopReason` — independent of any previously
admitted requested pass or fault count. `summary.gameEvidence` is
removed unconditionally from the driver-supplied summary; only the
actual trusted `pgnEvidence.snapshot()` body may occupy that reserved
namespace, and the supervised `watchdog-selftest` summary binds the
actual fixed zero-game observation `scoredGames:0` even when the
blocked synthetic driver never finishes. A missing or failed receipt
readback returns the coherent real nonzero outcome (`inconclusive`/`2`,
or `failed`/`1` when the actual intent already resolved failed),
never a retained `0`. `cleanupArgs({settleRequiredLiveEvidence = null}
= {})` builds the SAME `cleanup.run` input shape — the trusted
`cleanupStartMonoMs` (the ONE captured `state.cleanupStart` in the
shared hrtime origin) so staged TERM/KILL/proof offsets stay anchored
to the original bound even when stop-send or record IO stalls, plus
the trusted `settleWorkloadHandles({deadlineMonoMs}) -> Promise<void>`
callback — supervisor-created, charged to the same captured end,
joining the real driver channel `reap` (actual exit plus both pipe
closes) when a driver handle exists AND the optional trusted
live-evidence task when supplied; it must not early-return on a null
channel before joining that required evidence, returns no proof/status
and grants no signal authority, and the cleanup controller invokes it
after workload/helper identity-listener settlement and before the
collector-last reap — a missing/unsettled required debt never falls
through to collector stop. Only shutdown supplies
`settleRequiredLiveEvidence` as `() -> actualLiveEvidencePromise.
then(() -> undefined)` — an actual-settlement dependency, never a
caller boolean, proof, status or Native authority. `state.
monitorStartAttempted` records that `monitor.start` was genuinely
attempted even when no running tuple was produced, so shutdown still
reaps the partial monitor under the original horizon — with fresh
remaining `> 0` and the original captured `cleanupEnd` passed directly,
never a spent `now+0` dispatch — instead of fabricating a tuple or
skipping the handle. `state.runningWritten` is the durable running-
write receipt flag set ONLY on genuine `recorder.writeRunning` body
fulfillment (a copied monitor supervisor tuple never sets it);
canonical finalization is selected only from that actual receipt, and
a pending/failed running write takes the real incomplete-evidence
drain. The driver-channel `onError` path records/latches the existing
`IPC_INVALID` first stop synchronously, then dispatches the existing
`faultEvent` NONBLOCKING (the same pattern as the runtime catch) so an
actually observed transport fault is retained through the existing
fault lane without delaying teardown. Observer/event writes are deferred through
`Promise.resolve().then(() -> recordEvent(...)).catch(fault)` — the
actual callback is invoked inside the protected continuation so BOTH a
synchronous observer throw and an asynchronous rejection are retained
in `eventFaults` without aborting or delaying the Native stages.

Startup order is: one initial whole-footprint observation, `writeManifest`
(before collector startup), `monitor.start` (skipped for the shared-
monitor `watchdog-selftest` phase, which reuses the parent's `_ready()`),
`writeRunning` with the actual supervisor tuple, then the fork/IPC driver
channel from `watchdog-driver.mjs`. The driver `hello` binds the real
child PID/phase/commonIdentitySha256, `registerRoot` natively proves the
driver before `start`, and `watchdog-operations.mjs` owns the validated
message dispatch/selftest seam while `watchdog-records.mjs` owns the
recorder calls, artifact ordinal, PGN observation and receipt readback.
Heartbeat freshness counts from when the driver becomes live: `>2000 ms`
gaps — including a driver that sends `hello` and never heartbeats — stop
the run. Independent readiness/command (`30000`/`90000 ms`), phase,
first-stop, resource (RSS `4 GiB`/workspace `256 MiB`) and footprint
(`>=1 Hz`) timers never reset on driver callbacks. The first stop latch
synchronously closes ordinary admission, freezes PGN evidence, aborts a
pending selftest callback and wakes the run independently of the driver
or a hung record write; a late `end`/`finish` can never revive passage.
`requestStop(reason)` triggers the same path.

Every monitor call carries an explicit narrower `{deadlineMonoMs}` in the
shared `process.hrtime` origin — the monitor's constructor
`getDeadlineMonoMs` horizon is the original PHASE END including cleanup,
while ordinary and cleanup operations each consume their own captured
bound. Cleanup delegates to `watchdog-cleanup.mjs` with the actual
`{phase, scope, scopeRunId, expectedFinalizer, supervisor,
deadlineMonoMs}` — `phase-workload` plus the running supervisor for
top-level phases (which reconciles the registered
`runId:watchdog-selftest` subtree), `selftest-workload` plus
`selftestOwnerSupervisor` for the nested run, which never reaps the
parent collector. The `game-stop` cleanup association is emitted by the
shutdown ordinary-lane close only for an actual stop; `finalize` then
composes the reserved `summary.gameEvidence` from the frozen PGN
snapshot (driver `finish.summary` cannot overwrite it), selftest claims
stay `[]`, and
`expectedSelfTest` binds the independently verified
`{completion, expectedStopReason:"HEARTBEAT_TIMEOUT"}` — a missing or
ungenuine preflight receipt leaves incomplete evidence plus a real
nonzero outcome, never a fabricated completion or retry.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the WHOLE existing `cleanupArgs` declaration
described above — all comments, guards, defaults and body — moves into
the existing watchdog-shutdown.mjs under the pure private
`createWatchdogCleanupArgs({config, capabilities, state, timing})
-> cleanupArgs` function, because the facade cannot absorb the new
actual join. This facade imports and calls the ONE factory and assigns
the SAME returned function to `control.cleanupArgs` — the aliases
`now = timing.now` and `T = FIXED_LIMITS.timing` keep the original
clock and fixed constants, and there is no new path, state or control
authority, no wrapper and no second cleanup controller.

### watchdog-config.mjs

`captureWatchdogRuntimeConfig(options)` and
`createWatchdogOperationContext(groupedContext)` are the two exact
private exports under the final readable-owners decision (19); this
owner joins the functional runtime input union as a pure leaf.
`captureWatchdogRuntimeConfig` owns the whole constructor/run-context
validation and derivation: the captured ordinary config (`phase`,
`runId`, `commonIdentitySha256`, `workspace`, `manifestPath`,
`driverEntry`, `prerequisites`, `expectedSelfTest`,
`selftestOwnerSupervisor`), the selftest-only `internalContext` absolute
`deadlineMonoNs` bound and a GENUINE platform `AbortSignal` verified by
the real `aborted` getter (duck-typed objects and prototype imitations
are rejected; the genuine signal stays a reference, never cloned) —
rejected for any other
phase, and required for `watchdog-selftest`), and the derived
`selftestPhase`/`ctxDeadlineMs`/`ctxSignal`/`workspaceRoot`/`manifestRel`.
It performs no timer, IO, spawn, Native operation or await; serializable
workspace/driver/context values are copied and frozen while genuine
capability refs pass through. It returns `{config, capabilities}` —
`capabilities` holds the same `protocol`, `monitor`, `footprint`,
`recorder`, `cleanup`, `clock`, `spawnImpl`, `runInternalSelfTest` and
`pgnEvidence` refs. `createWatchdogOperationContext` owns the whole pure
`ctx` literal assembly over the same grouped
`{config, capabilities, state, timing, control}` context: every required
field plus the private accessors `driverIdentity()` (the proven tuple
retained by bootstrap `registerRoot`), `channelPid()`, `noteHelloOk()`,
`operationDeadline()` and `stopReason()`, with `noteFinish` bound to the
facade's synchronous control callback — never a second authority.
`watchdog-runtime.mjs` and `watchdog-operations.mjs` preserve their
original private import APIs by re-exporting these names, so no consumer
renames.

Corrective 62 (declared before use): the capture also accepts the
trusted options `lifetime`, `nativeHorizon` and `onBookkeepingSettlement`
under existing 30/31/48/52 authority. It derives the GENUINE
`phaseRecorderLifetime(recorder)`, validates the supplied owner's
brand/equality and asserts a supplied `nativeHorizon` BEFORE any
`reader`/`initialize`/`narrow` property read — never constructing a new
default owner. `processMonitorLifetime(monitor)` must return the same
genuine owner or null when unassociated; any associated mismatch
rejects, an explicit `lifetime` or `nativeHorizon` option requires a
nonnull genuine Native association, and a FakeNode capability is
allowed ONLY when both operational options are omitted (no
allowFake/testMode switch). `capabilities` gains EXACT grouped
`{lifetime, nativeHorizon, onBookkeepingSettlement, io}` — `io` is ONE
frozen `{retainActual: lifetime.retainActual}` for WD-owned FS
verification, the SAME owner retainer forwarded UNCHANGED — and the
operation ctx gains `{retainActual, io}` forwarding the SAME capability
values before use; serializable fields stay owned copies, genuine
capability refs remain references, and public `{run, requestStop}`/
Ops4/schema/wire/status stay unchanged.

Corrective 63 (declared before use):
`captureWatchdogRuntimeConfig(options, defaultClock?)` gains an optional
PRIVATE second trusted clock argument. The facade calls it with the
ORIGINAL `options` object, never a spread or clone that would drop
nonenumerable own `lifetime`/`nativeHorizon` fields, plus its SAME
existing `realClock`; the default applies ONLY when the own `clock` is
absent, an explicit own `clock: undefined`/`null` remains invalid under
the original clock guards, and omitting the second argument preserves
existing one-arg callers with a provided clock (a missing clock still
fails). No new config export, clock owner, capability bag, public option
or fake flag; construction stays pure with no time, timer or IO.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the selftest-only `internalContext` gains the
REQUIRED private `parentDriverScope` field — mandatory and genuine for
`watchdog-selftest` only, retained by reference, with the original
`deadlineMonoNs`/genuine-`AbortSignal` validation and argument
priority unchanged and no new top-level public option or permissive
nested root fallback. A top phase creates ONE root scope through the
pure `createDriverActualScope({retainActual:
inheritedOwner.retainActual, runId, parentScope: null})`; a nested
selftest requires its supplied nonnull `parentDriverScope` and calls
the SAME factory with that parent, so a cross-owner, closed or forged
parent rejects before IO. The derived `capabilities.driverActualScope`
is that ONE scope and `createWatchdogOperationContext` forwards the
SAME opaque reference as `ctx.driverActualScope` — never deep-copied,
canonicalized or serialized, and never a driver/wire proof.

Corrective 66 (declared before use — PLANNED, not yet implemented or
verified green): the module roster becomes EXACT3 —
`captureWatchdogRuntimeConfig`/`createWatchdogOperationContext` plus
`createWatchdogAwaiter({timing, control, makeError}) -> frozen {bounded,
checkLive}`. The WHOLE unchanged 44-line factory plus ALL comments moves
from watchdog-shutdown.mjs: the exact corrective-63 pure contract, SAME
local `fail = makeError`, body, comments, code and clock refs — pure
construction, still a bounded public wait and never physical-settlement
proof. Runtime imports the factory from Config directly, so no re-export
is needed and there is no extra clock, queue, state or back-import — DAG
Runtime -> Config -> Driver -> Actual stays acyclic; the two-export
roster wording above is DATED, superseded by this EXACT3 (preserved
history). The full contract is the spec's `#### Corrective 66 whole
physical-observer and awaiter owner binding (declared before use)`.

### watchdog-runtime.mjs

`runWatchdogLifecycle(context)` is the private lifecycle export under
the runtime readable-split decision (15); `captureWatchdogRuntimeConfig`
is re-exported through this owner from watchdog-config.mjs so the
facade's existing import shape is preserved. This owner joins the
functional runtime input union.

`runWatchdogLifecycle({config, capabilities, state, timing, control})`
owns the whole current run routine: the `started` guard, original
phase/work bound initialization (`phaseEnd = min(now + fixed ceiling,
ctxDeadlineMs)`, `workEnd = phaseEnd - 5000`), phase and work clocks
armed AT RUN ENTRY before any bootstrap await, AbortSignal wiring with
listener removal at settlement (a pre-aborted context latches the real
parent reason and launches no driver or collector), records/operations
composition (the `ctx` literal assembled once by
`createWatchdogOperationContext` in watchdog-operations.mjs — this
owner no longer carries a duplicate literal), the ordered
footprint -> manifest -> monitor -> running -> fork -> hello ->
registerRoot -> start bootstrap whose every awaited step is stop-aware
(raced against `control.wake` under its own bound) and rechecked before
each launch, the independent heartbeat/resource/work/phase supervision
timers, the wake wait and the whole catch/finally shutdown path. The
catch path records the in-memory fault FIRST, latches the stop
(capturing the original cleanup bound), then dispatches the
fault-record IO nonblocking — a stalled record write can never
postpone cleanup. `state` is the ONE
shared mutable private object (`started`, `running`, `driverIdentity`,
`helloOk`, `lastHb`,
`driverClosed`, `finishReq`, `stopReq`, `channel`, `liveOp`,
`liveOpTimer`, `records`, `ops`, `phaseEnd`, `workEnd`,
`cleanupStart`, `cleanupEnd`, `monitorStartAttempted`,
`runningWritten`, `selftest`) —
no second state or validator. `timing` holds `now`, `nowNs`, `timers`,
`later`, `clearT`, `clearAll`, `opDeadline`, `workRemainingMs`,
`cleanupRemainingMs`, `armOperation`, `disarmOperation`. `control`
holds `wake`, `resolveWake`, `firstStopHooks`, `recordFault`, `latchStop`,
`requestStop`, `stopped`, `admissionOpen`, `noteFinish`, `rssExceeded`,
`captureCleanupBound`, `faultEvent`, `cleanupArgs`,
`intentOutcome`, `finalize`, `shutdown`, `onMessage`, `onError`,
`onExit` — the original facade authorities, not copied callbacks with
independent timers or IDs; `finalize`/`shutdown` delegate to the single
watchdog-shutdown.mjs owner. The heartbeat supervision interval is
armed before the register/start waits and becomes live on the validated
exact-tuple `hello`, so a `hello` followed by no first heartbeat inside
the literal `FIXED_LIMITS.timing.heartbeatGapMs` (2000 ms) expires the
run even while registration stays stalled; `monitor.start` is tracked
through `state.monitorStartAttempted` before it is awaited so an
interrupted start still reaches genuine teardown without a fabricated
running tuple. The resource interval checks the Native `lastObservation`
independently of any awaited footprint scan (a stuck walk can never
mask stale accounting or the sticky `rssLimitExceeded` flag), retains
the actual current `rssBytes`/`peakRssBytes`/sticky-flag facts through
the existing `resource` event lane with the real `atMonoNs`/accounting
verdict, and reaches bounded fault evidence without gating the
first-stop or cleanup path on that IO. The catch path records the
in-memory fault, latches the stop, then dispatches the fault-record IO
nonblocking without awaiting it.
The runtime owner imports the existing
records/operations/driver owners and never imports `watchdog.mjs` back.

Corrective 63 (declared before use): the WHOLE existing
`bounded`/`checkLive` declarations plus ALL comments move verbatim into
existing watchdog-shutdown.mjs under the sole new private export
`createWatchdogAwaiter({timing, control, makeError}) -> frozen {bounded,
checkLive}` — a pure capture-only constructor over EXACT3 trusted refs
(no timer, IO, clock read, callback or Native) where `makeError` is the
SAME runtime `fail` factory returning Error, with the original
prefix/codes, wake-race/timer/rejection paths and `checkLive` semantics
preserved (a bounded public wait, never a physical-settlement proof).
This owner imports the ONE factory, creates ONE instance per run over
the SAME timing/control/fail, removes the whole locals and delegates the
identical function refs; public exports stay exactly
`captureWatchdogRuntimeConfig`/`runWatchdogLifecycle`. RootW1: internal
`onBookkeepingSettlement` observer null absence is normalized to
undefined at the `Recorder.bindRuntime` boundary only, leaving the real
recorder guard (undefined-or-function) intact. RootW3: the actual
resource payload (`rssBytes`/`peakRssBytes`/`atMonoNs`/accounting flag)
is captured PURE first, then the SYNC first-stop/admission close and
Native horizon min-narrow run BEFORE the resource/fault event callbacks
(across `latchResource`, the periodic Native overage/invalid branch and
the facade `noteFinish` overage branch), preserving all measured
payloads and original error counts/outcomes. RootW4: the SAME initial
actual `footprint.scan` body stays retained in existing
`state.resourceTask` until actual settlement (cleared only by
settlement, never by public timeout/stop), and shutdown joins the
initial/periodic actual bodies from outside the ordinary body AFTER
Native cleanup progresses and BEFORE intent/A, scoped nested and never a
global healthy parent zero; direct FS accounting stays available through
B.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): `runWatchdogLifecycle` passes `actualScope:
capabilities.driverActualScope` into the real `createDriverChannel`
alongside the SAME `io.retainActual` — the genuine scope derived by
config, never a new owner, registrar, queue or driver authority. The
operational nested selftest assembly forwards the trusted callback's
`parentDriverScope` unchanged into the child's
`internalContext.parentDriverScope`.

Corrective 66 (declared before use — PLANNED, not yet implemented or
verified green): the Awaiter import path changes only — this owner
imports `createWatchdogAwaiter` from watchdog-config.mjs instead of
watchdog-shutdown.mjs, still calling the SAME ONE factory once per run
over the identical timing/control/`fail` refs and delegating the
identical `bounded`/`checkLive` function refs. Public exports stay
exactly `captureWatchdogRuntimeConfig`/`runWatchdogLifecycle`; no new
clock, queue, state or second instance. The full contract is the spec's
`#### Corrective 66 whole physical-observer and awaiter owner binding
(declared before use)`.

### watchdog-shutdown.mjs

`createWatchdogShutdown(context)` is the single private export under
the final readable-owners decision (19); this owner joins the
functional runtime input union. `context` is the SAME grouped
`{config, capabilities, state, timing, control}` run context the
lifecycle owner receives. It returns `{finalize(expected), shutdown()}`
holding the whole bounded cleanup/finalization/outcome-fallback/shutdown
sequence extracted from the facade: a private bounded wait charged to
`timing.cleanupRemainingMs`, the wire `stop` envelope with the nonempty
`"FINISH"` transport reason while `final.stopReason` and the frozen PGN
reason stay `null`, ordinary lane close and the `game-stop`
association, preflight selftest re-verification while the collector is
still live, the staged `cleanup.run(control.cleanupArgs({
settleRequiredLiveEvidence}))` on the one captured end, the
collector-last driver `reap`, the post-cleanup sticky
`rssLimitExceeded` check, and `finalize` binding the real
`VerifiedEvidence.final` readback with the coherent nonzero fallback on
a missing/failed receipt. At shutdown entry the ONE cleanupStart/end
is captured once and the ACTUAL required live-evidence promise is
scheduled and owned BEFORE any awaited stop/evidence writer —
`Promise.resolve().then(actualVerifierThunk)` registers the task before
invoking IO and is never replaced by the public bounded wait; the
staged Native teardown still starts immediately, and the supplied
`settleRequiredLiveEvidence` joins that true required dependency inside
the same original end so a stalled verifier stays unproven and no later
continuation dispatches a fresh Native probe. Canonical finalization
runs only when `state.runningWritten` proves the genuine running
receipt; a pending/failed running write takes the real
incomplete-evidence drain (which waits that body and the real sinks and
creates no running/final/completion/seal). `control` keeps the original `intentOutcome`,
`recordFault`, `latchStop`, `cleanupArgs` authorities plus the
`rssExceeded()` getter; the facade's `finalize`/`shutdown` wrappers
delegate here. Construction is pure — all IO happens inside the
returned methods; no writer, proof, status override or facade import.

Corrective 63 (declared before use): module exports become EXACT2
factories — the existing `createWatchdogShutdown` (its
`{finalize(expected), shutdown()}` return unchanged) plus the new
private `createWatchdogAwaiter({timing, control, makeError}) -> frozen
{bounded, checkLive}`, a pure construction over EXACT3 trusted refs
hosting the whole `bounded`/`checkLive` implementation and comments
moved verbatim from watchdog-runtime.mjs, with `makeError` the same
runtime `fail` factory returning Error. The DAG gains Runtime ->
Shutdown (Facade -> Shutdown already exists); Shutdown never imports
Runtime or the facade, and there is no cycle, second state or second
clock. The current finalize caller later adds `{deadlineMonoMs:
state.cleanupEnd}`, the ORIGINAL captured cleanup end, to the adapter's
`finalizeAndRead` without bounding or racing the filesystem B leg away.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the module roster becomes EXACT3 factories — the
existing `createWatchdogShutdown` (its `{finalize, shutdown}` return
unchanged), `createWatchdogAwaiter` and the new pure private
`createWatchdogCleanupArgs({config, capabilities, state, timing})
-> cleanupArgs`, which receives the WHOLE facade `cleanupArgs`
declaration with all comments, guards, defaults and body per the
literal `input64-whole-cleanup-args-input.json` authority and stays
assigned to `control.cleanupArgs`. Inside the moved
`settleWorkloadHandles` the actual order is: FIRST await the SAME
actual `state.ops.whenOrdinarySettled()` after its synchronous fence —
including admitted nested callbacks, the own nested shutdown and STOP —
from OUTSIDE the ordinary body it drains; then initiate the own
parent/own-nested `channel.reap`/`close` under the SAME original
deadline (a null channel never skips the other debts); then
`finishDriverActualScope(capabilities.driverActualScope)`; then join
the required already-scheduled liveEvidence — all before
collector-last and before any parent fence while a selected nested
STOP is still owed. Existing STOP-envelope issuance and reap/close
initiation still precede finish including partial startup; after
Native cleanup progresses the SAME `state.resourceTask` actual bodies
join before intent/A; the timed finalize caller passes the ORIGINAL
`state.cleanupEnd` and awaits real capture-A then actual FS B without
racing B away, so the outcome stays ONLY `verified.final`; and only
the TOP phase takes a FRESH `capabilities.lifetime.whenSettled()`
after all issuance is fenced and its own safe transaction/incomplete
drain settles — a nested run joins only its scoped actual handles/own
transaction.

Corrective 66 (declared before use — PLANNED, not yet implemented or
verified green): the roster becomes EXACT2 —
`createWatchdogShutdown`/`createWatchdogCleanupArgs`. The WHOLE
unchanged 44-line `createWatchdogAwaiter` factory plus ALL comments
moves to existing watchdog-config.mjs (owner-only move; the exact
corrective-63 pure `{timing, control, makeError} -> frozen {bounded,
checkLive}` contract unchanged), so the corrective-64 EXACT3 roster
wording above is DATED, superseded by this EXACT2 pair — preserved
history; Runtime now imports the factory from Config with no re-export
needed here, no extra queue/clock/state, and every
`settleWorkloadHandles` ordering/actual-join rule above stays valid. The
full contract is the spec's `#### Corrective 66 whole physical-observer
and awaiter owner binding (declared before use)`.

### watchdog-operations.mjs

`createWatchdogOperationContext` is re-exported through this owner from
watchdog-config.mjs so the lifecycle's existing import shape is
preserved; the whole `ctx` literal assembly lives there (the grouped
context fields of decision 15 plus the operation accessors
`driverIdentity()` — the proven tuple retained by
bootstrap `registerRoot` — and `operationDeadline()` — the currently
armed live-op bound). `createWatchdogOperations({ctx, records,
runInternalSelfTest})` is the private validated-dispatch owner under
the readable-owner split; it joins the functional runtime input union.
`ctx` is the shared run context this owner builds from facade
`control`/`timing`/`state`: `{phase, runId, workspaceRoot, manifestRel,
commonIdentity, monitor, clock, nowMonoMs, workEndMonoMs,
phaseEndMonoMs, opDeadline, send, workRemainingMs, cleanupRemainingMs,
recordFault, requestStop,
stopped, admissionOpen, armOperation, disarmOperation,
operationDeadline, noteHeartbeat, noteDriverClosed, noteFinish,
onFirstStop, parentSupervisor, driverIdentity, manifestInputs,
selftest}` — the same state/clock/protocol/Native authority, shared
through explicit capabilities, never a copied registry or second
writer. `noteFinish` binds the corrected `control.noteFinish` main-
control callback (sync admission close + null-reason PGN freeze +
captured cleanup bound + wake), never the earlier assignment-only bug.
The bounded serialized ordinary-work queue is owned inside this module;
a queue overflow is consumed through the existing fault/stop path and
never left as an unhandled rejection. `dispatch(msg)` handles every validated d2s
message: `heartbeat`/`end`/`finish`/`closed` update lifecycle state
*synchronously* (parent heartbeats stay accepted while a `begin` is
pending, and control/first-stop paths never wait on the queue), while
`register`/`begin`/`event`/`artifact` run through the bounded serialized
ordinary-work queue — `register` → `monitor.registerRoot`/`registerPort`
→ `registered`, and an accepted in-process fixture registration
(`rootPid:null`) binds the ALREADY-PROVEN driver tuple retained at
bootstrap and registers its listener port under it before `registered`
— never an invented process identity; `begin` arms the independent
`readiness`/`command` operation clock AT synchronous validated dispatch
(so a stalled record queue can never defer the 30/90 s bound) →
`begun` with real `remainingMs` bounded by `min(kind ceiling,
workRemaining)`; `end` checks that captured bound against the actual
monotonic clock before clearing the operation and retains its actual
`result` as a bounded `operation` record event; `event`/`artifact`
→ `records.persist*` → `recorded` with the original wire `recordSeq`.
For phase `preflight` the FIRST admitted `begin` must be the fixed
`${runId}:preflight-selftest` with `kind:"command"` — an `event`,
`artifact`, `end` or nonmatching `begin` ahead of it, a wrong kind, a
repeat, or an absent callback is a failed implementation, never a
skipped pass. That fixed `begin` invokes the trusted
`runInternalSelfTest` callback exactly once with the copied frozen
context (`workspaceRoot`, `parentRunId`, `parentSupervisor`,
`commonIdentity`, `inputs`, the shared `monitor` capability,
`subrunRunId`, `phaseDirectory`, `owner`, `deadlineMonoNs` = `min`
(command deadline, work end) in the hrtime origin, and an
`AbortSignal` the first-stop latch aborts synchronously WITH the
available parent stop reason); a wrong kind,
repeat, or absent callback is a failed implementation, never a skipped
pass. Stop/admission and the original bound are rechecked after the
awaited manifest-input load BEFORE invoking the callback — a stop
during that load cancels rather than invoking. The callback's only authority is `{completionRef}`; the owner then
independently calls `verifyInternalSelfTest` with a fresh `probeIdentity`
and saves the genuine ref privately before emitting `begun` with the
*current* remaining — only while still ordinary-work eligible and before
the original command deadline. `selftestEvidence({deadlineMonoMs}) ->
Promise<ExpectedSelfTest|null>` re-verifies the retained receipt before
parent finalization (while the collector is still live) and returns the
exact `{completion, expectedStopReason:"HEARTBEAT_TIMEOUT"}` object or
`null` when no genuine receipt exists: it validates the finite
safe-integer ORIGINAL absolute end (the captured cleanup end, never
`phaseEndMonoMs`), snapshots the real ref/owner before the first await,
checks `ctx.nowMonoMs` BEFORE starting verification and AGAIN inside
the actual `probeIdentity` callback AFTER receipt IO; while inside the
captured cleanup bound it may obtain its required live proof even
though ordinary admission has closed. The ordinary-admission
prohibition applies ONLY to the ordinary `onSelftestBegin` path: after
`await runInternalSelfTest` AND inside the actual post-receipt-IO probe
callback it rechecks `stopped`/`admissionOpen`/the genuine
`AbortSignal` plus the captured original arm bound — once the first
stop closes ordinary admission no fresh Native probe is dispatched and
no late positive ack/ref revives eligibility. The cleanup-specific
reverification instead consumes the separate captured `cleanupEnd` and
the true owned dependency. It has no phase-clock reset, wire field,
process launcher, direct kill or final-writer authority.

Corrective 61 (declared before use): the WHOLE bounded ordinary-work
queue described above — `MAX_QUEUE=256`, the resolved chain, the
queued counter and the full enqueue body with its comments, guards,
catch and finally — moves unchanged to the new private
watchdog-ordinary.mjs owner, which this module alone instantiates
once over the SAME `ctx`/`ctx.retainActual`. The returned private
roster stays EXACT4 `{dispatch, selftestEvidence,
closeOrdinaryAdmission, whenOrdinarySettled}` — the last two
IDENTICAL references to the queue owner's functions — while
`ordinaryAdmissionOpen` remains that owner's private passive
`!closed` query consulted by `dispatch` before any synchronous arm,
never publicly exposed.

Corrective 64 (declared before use — PLANNED, not yet implemented or
verified green): the operation `ctx` carries the SAME opaque
`ctx.driverActualScope` reference derived by config, and the trusted
`runInternalSelfTest` callback context above gains the EXACT field
`parentDriverScope: ctx.driverActualScope` alongside the original
`deadlineMonoNs`/signal/etc — forwarded by the operational nested
assembly unchanged into the child's `internalContext.parentDriverScope`.
The scope is never deep-copied, canonical/JSON-serialized or exposed
as a driver/wire proof; no new owner, registrar, queue or dispatch
authority.

### watchdog-ordinary.mjs

`createWatchdogOrdinaryQueue({ctx, retainActual})` is the private
runtime owner of the SAME bounded serialized ordinary-work queue,
declared before creation (the module does not exist yet; no green
claim). Sole export with EXACT2 trusted constructor keys — `ctx` is
the SAME already-validated frozen operation context and
`retainActual` is EXACT `ctx.retainActual` from the SAME genuine
validated supervisor lifetime — returning `Object.freeze({enqueue,
ordinaryAdmissionOpen, closeOrdinaryAdmission, whenOrdinarySettled})`
(EXACT4 private methods). The pure constructor only captures those
refs, defines the four functions and creates the ONE original
resolved chain, the queued counter and the closed flag: it invokes
no ctx callback, clock or retainer, creates no timer/IO/Native hold
and validates no new caller fields or error priority. Only
watchdog-operations.mjs creates ONE such instance — no second queue
or Set, no duplicated chain/queued counter/admission fence, no
copied registry or separate debt ledger. The WHOLE block moves here
unchanged from watchdog-operations.mjs: `MAX_QUEUE=256`, the
chain/queued declarations and the full enqueue comment/body with
every comment, guard, error catch and finally, preserving caller
result/error, existing fault accounting, first-stop gating and the
counter-finally across all channels; the local fail factory uses the
SAME watchdog-operations error prefix/code/style, and local pure
error construction adds no new public export. The module imports
ONLY the existing `issueActual` from artifact-files.mjs (acyclic,
the exact prearming primitive already required by root48) — never
operations/watchdog/records/process/tests.

The initial admission fence lives OUTSIDE the constructor:
operations applies it immediately AFTER the pure factory returns and
BEFORE exposing dispatch, only when actual `ctx.stopped()` is
already true — `ctx.stopped` is never invoked inside the factory,
and the fence is never set merely because hello/startup admission
is not yet open. `ordinaryAdmissionOpen()` is a private passive
`!closed` read with no callback, clock, IO or proof, consulted by
`dispatch` BEFORE any synchronous `armOperation`/`firstOpAdmitted`
mutation so a closed fence declines register/begin/event/artifact
without duplicating the boolean or deferring operation arming.
`closeOrdinaryAdmission()` is synchronous, idempotent and permanent
(`closed=true`); first-stop and admitted normal-finish paths invoke
it through the existing Ops delegate before awaited IO, and no
control path awaits its own chain — no nested selfwait or global
barrier. `enqueue(fn)` declines after the fence BEFORE
counter/receipt/queue/effects, returning a consumed resolved Promise
as ordinary declined dispatch; overflow retains the exact
`MAX_QUEUE=256` fault-plus-first-stop consumed behavior. Every
admitted body preregisters its neutral actual completion through
`issueActual(retainActual, issueThunk)` BEFORE `issueThunk` creates
`chain.then(fn)` — the SAME genuine retainer, unchanged — so failed
registration or issuance leaks no counter debt and starts no
operation before registration. `whenOrdinarySettled()` is NONASYNC:
before the fence it synchronously THROWS `IPC_INVALID` (no
Promise-rejection substitute); after the fence it returns the SAME
actual chain `Promise<void>` including its actual callback/verifier
and original catch/finally paths — no wrapper, race, snapshot or new
debt, and new enqueue is impossible after the fence. The existing
trusted cleanup joins this SAME chain plus actual driver exit and
BOTH required pipe closes from OUTSIDE an ordinary body, collector
last under the original end; error/normal-finish control closes
only, never self-waits. Operations keeps returning its EXACT frozen
`{dispatch, selftestEvidence, closeOrdinaryAdmission,
whenOrdinarySettled}` — the last two IDENTICAL references to this
owner's functions, `enqueue` private only — with public watchdog
`{run, requestStop}` unchanged and heartbeat/stop control
independent of the queue. DAG: Operations -> Ordinary ->
ArtifactFiles.issueActual, no backedge and no dependency on Native,
Recorder, watchdog or fixtures; all lifecycle/Store/phase/driver/
clock authorities stay with their existing owners. The module joins
the JS runtime functional union with no Python helper or
test-exclusion change. Capacity forecasts only (not acceptance): the
new module about 100–150 lines and watchdog-operations.mjs about
340–375 after the whole-block move, every module under the 400
readable cap with comments, guards and assertions preserved.

### watchdog-records.mjs

`createWatchdogRecordAdapter({recorder, pgnEvidence, workspaceRoot,
manifestRel, commonIdentity, phase, onObserverFault})` is the private
recorder/
evidence owner under the readable-owner split; it joins the functional
runtime input union. `persistEvent`/`persistArtifact` perform the real
`appendEvent`/`appendArtifactChunk` calls: artifact chunks decode
canonical base64 into an actual `Buffer` and carry a private contiguous
*artifact-call ordinal* as `recordSeq` while the driver wire `recordSeq`
(`0,+1` across events and artifacts) stays unchanged in the observer
metadata and the `recorded` ack. After each real persistence and before
its ack, the copied closed `PersistedPgnRecord` union — metadata and
actual close `ref`s only, never bytes or driver summary — is offered to
`pgnEvidence.observePersisted`. `freeze(fact)` synchronously latches the
real first `stopReason`/monotonic `atMonoNs` before any await and no
late promotion can change it; `gameStopAssociation()` writes the
supervisor `cleanup` event `{recordType:"game-stop", gameId,
checkpointId, pgn, result:"*", stopReason, atMonoNs}` (decimal text) for
the frozen current game only; `summaryEvidence()` returns the bounded
copied `GameEvidenceBody` for the reserved `summary.gameEvidence`.
`manifestInputs()` re-reads the sealed manifest through the stable
`loadRecord` seam when callback context needs `inputs`;
`finalizeAndRead({intent, checks, prerequisites, expectedSelfTest})`
(dated wording, superseded by corrective 63 below) performs
`recorder.finalize` then `verifyReceipt` and returns the actual
`{completionRef, final}` including recorder downgrades — it never
reports submitted intent. `recordEvent(kind, payload)` persists any
supervisor lifecycle event through `recorder.appendEvent`, and
`recordOperationEnd(operationId, result)` retains the actual validated
d2s `end` result through the EXISTING `operation` event kind — no new
event variant or schema field. `composeIntent({finishReq, stopReq,
faultCount})` takes `faultCount` as a fresh-count callback `() ->
number` invoked AFTER the trusted snapshot work inside composition, so
a snapshot/association observer fault recorded through the same
synchronous first-fault authority is included in the emitted
`unplannedFaultCount`; status/exitCode pairs stay the coherent
`passed`/`0`, `failed`/`1`, `inconclusive`/`2` set, a stopped run is
always `inconclusive`/`2` with the latched `stopReq.reason`, and a
normal finish carries the actual `stopReason:null` (driver finish text
has no authority). Observer/freeze/snapshot exceptions route to
`onObserverFault` (a recorded watchdog fault): they block the matching
ack but can never skip cleanup, restart a timer or become eligible.
`closeIncompleteEvidence()` is a pure passthrough exposing the
recorder's DIRECT `record-lifecycle.mjs` delegation — the same cached
closure promise with its synchronous fence and retained rejection — so
shutdown can drain genuine incomplete evidence without any wrapper,
new kind, status or proof authority.

Corrective 63 (declared before use): the constructor takes EXACT8
trusted fields `{recorder, pgnEvidence, workspaceRoot, manifestRel,
commonIdentity, phase, onObserverFault, io}`. The original
recorder/pgnEvidence validation order is kept, then ONE provided frozen
`io` of exact shape `{retainActual}` is required whose function equals
the genuine `phaseRecorderLifetime(recorder).retainActual`; no fallback
owner, noop, spread or alias association, and the SAME `io` object is
forwarded unchanged. `manifestInputs` calls `loadRecord(workspaceRoot,
manifestRel, "manifest", undefined, io)`, passing `io` as the FIFTH
argument with `declared` still undefined. `finalizeAndRead({intent,
checks, prerequisites, expectedSelfTest}, {deadlineMonoMs}) ->
Promise<{completionRef, final}>` gains a PRIVATE second ORIGINAL
absolute bound: the finite nonnegative safe-integer `deadlineMonoMs` is
validated and the initial owned copies of the whole request and its
parents are taken BEFORE the first await or effect, then it awaits the
real `recorder.closeEvidenceBeforeCutoff(snapshot, {deadlineMonoMs})`
and calls no-arg `recorder.sealClosedEvidence()`, returning ONLY
`{completionRef: result.completionRef, final: result.verified.final}`
from the genuine immutableStore result. The real fullGraph/readback
verification lives INSIDE immutableStore publication, so the earlier
`recorder.finalize` plus external `verifyReceipt` wording above is DATED
and superseded, not the current contract: no untimed `recorder.finalize`
fallback, no post-seal verifyReceipt, FS read, canonical copy,
validator, Native call or status reclassification, and the async error
channel is unchanged. The returned private roster stays EXACT12
(`persistEvent`, `persistArtifact`, `freeze`, `gameStopAssociation`,
`summaryEvidence`, `recordEvent`, `recordOperationEnd`, `composeIntent`,
`manifestInputs`, `finalizeAndRead`, `stopOrdinary`,
`closeIncompleteEvidence`) with PGN/ordinal/recordSeq/reserved-summary/
fault-count behavior preserved.

- `canonicalBytes(value): Buffer` emits UTF-8 without BOM, compact JSON,
  recursively ASCII-sorted object keys, preserved array order, and exactly one
  final LF. Integer-like keys are compared as ASCII text, so `"10"` precedes
  `"2"`; `JSON.stringify` on a pre-sorted object would silently reorder them
  and is not used for emission.
- It rejects `undefined` anywhere, non-finite numbers, sparse arrays, bigint,
  functions/symbols, custom `toJSON` substitutions, non-plain objects and
  cycles before producing bytes.
- `parseCanonicalBytes(bytes): JsonValue` decodes strict UTF-8, requires
  exactly one trailing LF, parses with duplicate-key rejection, then requires
  byte equality with `canonicalBytes` reserialization. This rejects BOM,
  CRLF, extra LF, surrounding whitespace, key-order differences, duplicate
  keys at any depth and noncanonical number spellings.
- `sha256Bytes(bytes): string` returns lowercase 64-hex SHA-256 of the exact
  bytes, including any final LF. PGN/binary artifacts hash their exact stored
  bytes. No digest is ever hashed into itself.
- Returned buffers/objects are fresh copies; callers may mutate inputs after
  the call without changing results.

## record-schema.mjs

Frozen exports (all deeply frozen, never mutated):

- `BASELINE_COMMIT`: `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`.
- `REQUIRED_CHECK_IDS`: exact per-phase sets, `check` (verified-delivery,
  real-worker, retained-main-recovery, request-lifecycle,
  explicit-failure-actions, completed-display, workbench-layout, cleanup),
  `parity` (frozen-python-imports, input-planes-13, policy-mapping-13,
  numeric-tolerance-13, cleanup), `preflight` (cold-readiness,
  ten-fresh-requests, aa-color-pair, watchdog-selftest, timing-estimate,
  cleanup), `compare` (locked-suite-complete, identity-every-turn,
  legal-outcomes, raw-record-accounting, paired-analysis, cleanup) and
  `watchdog-selftest` (injected-heartbeat-timeout, zero-scored-games,
  surviving-child-cleanup, accounting-valid).
- `REQUIRED_PARENT_PHASES`: `check: []`, `parity: [check]`,
  `preflight: [check, parity]`, `compare: [check, parity, preflight]`,
  `watchdog-selftest: []` (its owner is bound through `manifest.owner`,
  never through prerequisites).
- `PROTOCOL_IDS`: `inputId` `baseline-fen-candidate-history-raw-ep-v1`,
  `ruleId` `chessjs-checkmate-first-draws-v1`, `visitId`
  `completed-root64-v1`, `analysisId` `paired-sign-cp95-v1`, and `reference`
  `{device:"cpu", dtype:"float32", inferenceMode:true, intraOpThreads:1,
  interOpThreads:1}`.
- `MODEL_IDENTITY`: `{format:"TAZS", packedVersion:1, source:1,
  parameterCount:2426706, byteLength:9706840,
  sha256:"b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee"}`.
- `FIXED_LIMITS`: `{ipc:{frameBytes:1048576, driverBytes:262144,
  chunkBytes:65536}, timing:{readinessMs:30000, commandMs:90000,
  heartbeatMs:500, heartbeatGapMs:2000, sampleMs:250, sampleGapMs:500,
  cleanupMs:5000, phaseMs:{check:600000, parity:600000, preflight:600000,
  compare:3600000}}, resources:{rssBytes:4294967296,
  workspaceBytes:268435456, ordinaryBytes:266338304,
  finalReserveBytes:2097152}, visits:64, cohort:{pairs:20, games:40}}`.

Validators throw `Error` with a stable bounded `code`; there is no
success-shaped failure result.

- `assertRecord(kind, value)` validates the closed version-1 envelopes:
  `workspace` `{schemaVersion:1, workspaceId, commonIdentity}`; `manifest`
  `{schemaVersion:1, workspaceId, runId, phase, commonIdentitySha256, inputs,
  limits, requiredCheckIds, prerequisites, owner}` with `limits` exactly
  `FIXED_LIMITS`, `requiredCheckIds` exactly that phase's set once,
  prerequisites exactly `REQUIRED_PARENT_PHASES[phase]` phases, `owner` null
  for top-level or `{phase:"preflight", runId, supervisor}` for
  `watchdog-selftest`; `running` `{schemaVersion:1, workspaceId, runId,
  phase, commonIdentitySha256, supervisor, startedAtUtc}`; `event`
  `{schemaVersion:1, workspaceId, runId, phase, seq, kind, payload}`; `final`
  (canonical `PhaseFinal`) with the phase's exact check set once each and
  passed-status coherence (exit 0, every check passed, zero unplanned faults,
  cleanup verified/accounting-valid/no survivors/no listeners/nonnull
  expectedFinalizer, scope matching the phase); `completion` (canonical
  `PhaseCompletion`) with path-sorted unique artifacts, top-level-phase
  prerequisite refs and `expectedSelfTest` nonnull only for `preflight`.
- `assertArtifactRef(value)` requires `{path, byteLength:Nat, sha256:H}` with
  a workspace-relative POSIX path: no absolute, empty, `.`, `..`, backslash,
  NUL or duplicate-slash components.
- `assertProcessIdentity(value)` requires `{pid, startSec, startUsec}`: pid
  integer `1..2147483647`, `startSec` a canonical `U64` decimal string,
  `startUsec` integer `0..999999`.
- `assertCommonIdentity(value)` validates the closed CommonIdentity:
  `candidate` `{kind:"commit", commit, contentSha256}` or `{kind:"WORKTREE",
  commit:null, contentSha256}`; `baseline` `{commit:BASELINE_COMMIT,
  contentSha256}`; `harness` and `pythonReference` `BundleIdentity`
  `{contentSha256, files:InputDigest[]}` with sorted unique original
  project-relative paths (pythonReference exactly the six
  `train/src/tinyaz/` modules); `fixtures` `{protocol, parity, openings}`
  InputDigests at exactly `train/fixtures/browser-protocol.json`,
  `browser-parity.json`, `browser-openings.json`; `model` exactly
  `MODEL_IDENTITY`; `baselineNormalization` `{requestPath:
  "/weights/tinyaz-s.bin", responseSha256:<MODEL_IDENTITY.sha256>,
  provenance:"controlled-delivery-plus-ready"}`; `conventions` exactly
  `PROTOCOL_IDS`; `environment` the closed Environment below. Validation
  binds structure and identity only; it is not evidence that packages or
  tools were inspected.
- `assertBackendIdentity(value)` validates `BackendIdentity`
  `{backendId:"darwin-arm64-libproc-v1", os, python, helpers, libproc,
  lsof}`: `os` is `OsIdentity` `{platform:"darwin", arch:"arm64", release,
  version, build}`; `python` is `PythonExecutableIdentity`
  (`FileIdentity`/`ExecutableIdentity` plus `{executable, prefix,
  basePrefix}`); `helpers` sorted `InputDigest[]`; `libproc` `{path:
  "/usr/lib/libproc.dylib", abi:{bsdInfoSize:136, taskInfoSize:96}, image}`
  with `image` `{kind:"file", sha256}` or `{kind:"OS_SHARED_CACHE",
  osBuild}`; `lsof` `FileIdentity` with `invocationPath` `/usr/sbin/lsof`.
- Environment fields validated by `assertCommonIdentity`: `node` and
  `chromium` `ExecutableIdentity` (`{invocationPath, realPath, sha256,
  version}`); `python` `PythonEnvironment` `{runtime:
  PythonExecutableIdentity, pipVersion:"25.2", pipFreezeSha256:H,
  distributions:[{name, version, buildSha256, wheelSha256|H|null}],
  imports:[{module, origin, version, sourceSha256}]}` with sorted unique
  distributions (the `torch` distribution's wheelSha256 must be nonnull;
  other entries may be null when no original archive is established) and
  imports exactly `chess` 1.11.2, `numpy` 2.3.5, `torch` 2.10.0, `zstandard`
  0.25.0; `dependencies` `{packageLockSha256:H, packages:[{name, version,
  buildSha256}]}` sorted unique; `launch` `{host:"127.0.0.1", headless:true,
  viewport:{width:1280, height:800}, deviceScaleFactor:1, args:string[],
  securityOptionsSha256:H}`; `os` an `OsIdentity`; `hardware` `{model,
  cpuModel, logicalCpus:positive, physicalMemoryBytes:positiveSafeInteger}`;
  `monitoring` a `BackendIdentity` whose `os`/`python` deep-equal the
  environment `os`/`python.runtime` entries. All identifying strings are
  nonempty and all digests match `^[0-9a-f]{64}$`. Every executable
  `invocationPath`/`realPath`, Python `executable`/`prefix`/`basePrefix`
  and every import `origin` must be an absolute path. The pinned Python
  selection is invocation/executable exactly
  `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/.venv/bin/python`,
  `prefix` the project's `train/.venv`, `basePrefix` the actual absolute
  base installation the venv derives from, CPython `3.11.14`;
  the four pinned import/distribution versions must agree with it. The
  rule-06 archive exception is preserved: only `torch` requires a nonnull
  `wheelSha256`, while other distributions keep the unknown-archive null.

## artifact-store.mjs

- `createArtifactStore({workspaceRoot, readFootprint, monotonicNow})`
  returns a store with readonly normalized absolute `root`. `readFootprint`
  and `monotonicNow` are mandatory functions; `readFootprint()` resolves to
  `{observedAtMs, chargedBytes, accountingValid}` for the whole workspace.
  A missing/throwing read, non-finite or negative charge, `accountingValid
  !== true`, or a sample older than 1000 ms rejects the write as unavailable
  accounting; a recorded accounting fault is sticky for that store.
- `writeOnce(path, bytes, lane)`: confined immutable create; fails if the
  target exists or any ancestor is a symlink. Same-directory temp, bounded
  write, file fsync, atomic rename, directory fsync where supported.
- `openArtifact({artifactId, path, mode, lane})` returns a sink with
  `append(bytes)` and `close(): Promise<ArtifactRef>`. `append` writes to the
  destination for `mode:"append"` or to a same-directory temp for
  `mode:"replace"`; `close` flushes/fsyncs, publishes replace streams
  atomically and returns the logical-byte ref. One active sink per path and
  per `artifactId`; a `replace` cannot target an existing finalized file.
  The sink preserves its first terminal append/write/zero-progress/close/
  reconcile/hash failure: every later close or retry rejects with that
  retained error instead of resolving `null` or a success-shaped ref, and
  the owned handle is always drained. A later `append` on a store-failed
  sink may instead surface the store's sticky `STORE_IO`, because the
  store-health check runs before the per-stream check; both reject with
  no fabricated ref. A required durable write/sync/rename failure is a
  sticky store IO fault; path/setup rejections such as `ENOTDIR` stay
  caller-correctable and do not poison the store.
- `deleteEphemeral(path)` unlinks a confined regular file.
- `sealPhase(phaseDirectory)` permanently rejects further writes under that
  directory and rejects while any path under it still has an active sink.
- `lane` is `"ordinary"` or `"final"` and is chosen only by records.mjs.
  Admission sums three distinct quantities: the latest accepted
  whole-workspace footprint, serialized pending reservations (only
  genuinely uncommitted in-flight writes), and committed-but-unobserved
  growth. Ordinary writes require `charged + unobserved + pending +
  size <= 266338304` (254 MiB); final-lane writes require `charged +
  unobserved + pending + size <= 268435456` (256 MiB) and cumulative
  final-lane bytes `<= 2097152` (2 MiB) across the store's lifetime.
  That sum is a conservative upper bound used only for admission — it
  is never reported as the measured footprint itself.
- When a chunk write succeeds, only its own reservation moves from
  pending into a commit-bound unobserved delta before the append is
  acknowledged; other streams' in-flight reservations stay in pending.
  A later fresh whole scan already counts the active append destination
  or replace temp bytes, so the covered delta retires instead of
  double-counting. A `replace` stream still covers the old+temp
  coexistence peak while it writes. A post-write observation over
  ceiling is recorded as actual overrun and invalidates later
  compliance, never rewritten.
- The `observedAtMs` a provider reports is the conservative start boundary
  of its whole-scan, not the finish: a scan can only prove bytes committed
  strictly before its start. The store keeps each committed write as an
  individual unobserved delta until a sample whose `observedAtMs` is
  strictly later than that delta's commit boundary arrives; a sample that
  began before or at the commit boundary cannot retire the bytes, so
  delayed samples never undercount and covered deltas never double-count.
  Accepted scan starts are nondecreasing: a still-fresh observation older
  than the greatest accepted start is rejected as sticky
  `STORE_ACCOUNTING` before its charge is read or any delta retires, so
  an out-of-order result can never resurrect retired budget. A future
  footprint observer must serialize its walks or suppress obsolete
  results rather than publishing out of order. Unavailable post-write
  accounting or an observed ceiling breach rejects the current write,
  even on the final lane, while preserving the actual bytes and the
  latched fault.
- `inspectArtifactRef({workspaceRoot, ref})` re-reads the confined regular
  file, verifies logical `byteLength` and `sha256`, and returns a fresh
  frozen `ArtifactRef`. `phaseArtifactRefs({workspaceRoot, phaseDirectory})`
  enumerates every retained regular file recursively without following
  links, excluding only `<phaseDirectory>/completion.json`, and returns
  path-sorted refs. Both are read-only and need no footprint provider.

R4 declarations (recorded before creation/use, planned until source
exists): `createArtifactStore` gains the optional trusted `lifetime`
member — absent, the Store creates its OWN real default
`createWatchdogLifetime()`; supplied, the brand-checked EXACT owner is
retained before any IO and its `retainActual` becomes the frozen
`storeContext`/`ActualIO` registrar for every sink, OwnedFile, raw
syscall and readback — no noop fallback or mutable replacement.
Private `artifactStoreLifetime(store)` returns only that genuine
association. The Store privately mints the `storeOwner` token and owns
`prepareCompletion` (resolves only after actual temp close/accounting
— no caller `retainFinalizerUntil`), `publishPreparedCompletion`
(paired single-use `PreparedVerification`, fresh canonical
memo/readback/accounting/seal inside ONE owned outer queue operation)
and `containPreparedCompletion` (idempotent for the same contained
capability; actual failed bytes retained in the EXACT original temp,
required sync and fresh canonical-absence proof before failure-safe
hold release). The transaction `safeSettlement` is registered through
the same owner's `retainFinalizerUntil` before any effect; only
genuine immutable sealed publication or complete actual containment
fulfills it.

Corrective 55 (declared before use — the new module is currently
ABSENT, not yet implemented or verified green): the whole
prepared-completion transaction body moves to the SOLE pure factory
`createStoreCompletionMethods(completionContext)` in
[artifact-completion.mjs](#artifact-completionmjs-exists--r4-declaration-dated),
constructed ONCE at store creation and attached to this SAME frozen
store over an EXACT 18-field context `{root, enqueue, usable,
checkSeal, reserve, release, reconcile, postAccounting, immutable,
activePaths, markIoFault, retainActual, storeOwner, io,
retainFinalizerUntil, completionByPhase, completionByPrepared,
sealPhaseCore}` — the first twelve borrowed Store
closures/Sets/function identities, the last six Store-owned private
bindings (one minted frozen `storeOwner` token, the store's EXACT
frozen `io`, the same `retainFinalizerUntil`, ONE strong phase Map,
ONE prepared WeakMap and the synchronous `sealPhaseCore` factored
whole out of `sealPhase`, still enqueued by the public method and
invoked directly by a successful publication under the same queue).
The methods keep the exact approved signatures/returns and the owner
WeakMap/`artifactStoreLifetime` association stays the sole identity.

Corrective 57 (declared before use — both new leaves are currently
ABSENT, not yet implemented or verified green): inside that attached
trio the WHOLE first-primary-retention/containment/failure-recovery/
held-safe flow delegates further to
[artifact-completion-failure.mjs](#artifact-completion-failuremjs-exists--r4-declaration-dated)
`createCompletionFailureMethods({storeOwner, postAccounting, reconcile,
immutable, activePaths, completionByPrepared, markIoFault})`, and the
universal OwnedFile physical-close boundary lives in
[artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated)
`createOwnedFileOperations({issueActual, storeFail})`. The Store
context, facade/getter sole identity and the exact method signatures
stay unchanged.

## records.mjs

- `writeWorkspaceOnce({store, workspace})` snapshots and validates the
  workspace record, then writes `workspace.json` once through the store.
- `createPhaseRecorder({store, workspace, manifest, verifyCleanup,
  verifyIdentity})` snapshots both records before any await, validates them,
  requires equal `workspaceId` and requires
  `sha256(canonicalBytes(workspace.commonIdentity))` to equal
  `manifest.commonIdentitySha256`. Both callbacks are mandatory; there is no
  default or fallback.
- Recorder methods and required order: `writeManifest()` writes
  `<phase>/manifest.json` and opens the bounded `events.jsonl` sink before
  any collector/driver startup; `writeRunning(running)` then writes the
  immutable `running.json` before any driver spawn; `appendEvent({kind,
  payload})` assigns the canonical `seq` `0,1,...`; `appendArtifactChunk
  ({recordId, recordSeq, artifactId, path, mode, bytes, last})` accepts
  decoded `bytes <= 64 KiB` with unique `recordId`, strictly increasing
  `recordSeq` and one stable `artifactId`/`path`/`mode` stream until `last`;
  `deleteEphemeral({path, reason})` appends a durable `artifact-deletion`
  event before unlinking; `stopOrdinary()` forbids new driver work and
  ordinary output (post-stop supervisor `fault`/`cleanup`/`resource`/
  `artifact-deletion` events remain admissible on the ordinary events sink);
  `finalize({intent, checks, prerequisites, expectedSelfTest})` performs the
  full close. Before `running.json` exists, `appendEvent` admits only the
  observed supervisor bootstrap evidence (`fault`, `resource`, `cleanup`);
  ordinary `operation`/`delivery`/`response` and artifact work is rejected
  rather than bound to an invented running tuple.
- `finalize` requires a written running record and is single-use: it calls
  `verifyIdentity({workspaceId, runId, phase, expectedCommonIdentity,
  inputs})` (must return a `CommonIdentity` canonically equal to the
  workspace's, else pass is blocked), calls `verifyCleanup({phase, runId,
  supervisor, claimedProof})` (must return a structurally valid
  `CleanupProof`; a throw or malformed proof yields unproven cleanup and can
  never produce `passed`), closes every artifact sink and the events sink,
  resolves each `CheckClaim.evidencePaths` entry to its final `ArtifactRef`
  (rejecting missing paths, out-of-phase paths and
  final/completion self-reference), derives the canonical `cleanup` check
  from the actual proof for top-level phases or all four supervisor-owned
  checks for `watchdog-selftest` (which also requires
  `summary.scoredGames === 0`), builds the `PhaseFinal`/`PhaseCompletion`,
  writes `final.json` then `completion.json` atomically last through the
  `final` lane, and seals the phase. A requested `passed` that fails
  identity, cleanup, check or fault coherence is downgraded to
  `inconclusive`/2 (unproven cleanup/identity) or `failed`/1 (mismatched
  identity or invalid claims); `passed` is never synthesized.
- `FinalIntent` = `{status, exitCode, stopReason, unplannedFaultCount,
  analysisEligible, summary}`; `CheckClaim` = `{id, status, evidencePaths}`.
  For top-level phases the driver supplies every required check id except
  `cleanup`; for `watchdog-selftest` the supervisor derives all four checks
  and claims must be empty.
- Errors are sticky: after a required write, accounting or seal failure the
  recorder rejects further work; nothing can convert preserved incomplete
  evidence into a passed receipt.
- `closeIncompleteEvidence` is the private unfinished-evidence drain
  exposed as a direct arrow-property reference
  `closeIncompleteEvidence: lifecycle.closeIncompleteEvidence` on the
  returned facade — the lifecycle binding is an arrow closure with no
  `this` dependency, so the property IS the same cached actual closure
  promise authority (synchronous fence, retained rejection, repeated
  calls identical), never a public async wrapper. It fences
  all further admission synchronously, marks the existing stopped state,
  awaits every already-admitted actual-attempt receipt, then closes all
  real sinks observed at that time through the records-owned close
  callback. It rejects a competing `finalizing`/`finalized` state,
  repeated calls return the same actual closure promise, and it never
  invents a running/final/completion/seal or passed receipt.

R4 declarations (recorded before creation/use, planned until source
exists): the Recorder privately associates the EXACT store lifetime by
WeakMap and `phaseRecorderLifetime(recorder)` returns only that
inherited association — no rebind/alias/noop.
`recorder.bindRuntime({lifetime, nowMonoMs, onBookkeepingSettlement})`
is callable at most once BEFORE FIRST RECORDER USE;
`onBookkeepingSettlement` is descriptive-only — its exact
payload/notification/fallback binding is the corrective-58 block below
and its WHOLE physical owner is the planned record-bookkeeping.mjs leaf
declared by corrective 59 below.
Timed
`recorder.closeEvidenceBeforeCutoff(request, {deadlineMonoMs})` and
`recorder.sealClosedEvidence() -> {completionRef, verified}` run the
SAME real held pipeline through record-evidence.mjs capture then the
record-lifecycle `fenceFinalEvidence`/`continueFinalEvidence`
single-use continuation — the v2 fence lands AFTER mandatory verifier
callback/fact handling, capture settles before continuation, and no
post-seal reclassification or Native work after the original cutoff.
A bound legacy `finalize` rejects `RECORDER_STATE` before effects; the
unbound legacy `finalize` retains compatibility through the same
pipeline, untimed, returning only `completionRef`. Completion bytes
aggregate through the record-finalization.mjs pure
`buildFinalFromClosedFacts` delegation; records stays sole
writer/state/status owner.

Corrective 56 (declared before creation/use — the record-inputs.mjs
file is ABSENT, record-evidence.mjs stays PLANNED, and nothing below is
implemented or verified green): the canonical input snapshots and pure
input/schema guards delegate to the planned record-inputs.mjs pure leaf
(`captureRecorderInputs`, `captureFinalizationRequest`,
`validateFinalizationIntent`, `validateRunningInput`); records keeps
the actual callbacks, state, writer and status authority. The
record-evidence.mjs capture returns `Promise<void>` and the private
`{capture, finishClosedEvidence, finalInputs}` roster — never the
facade/wire — carries the sealed facts: NO-ARG `finishClosedEvidence`
runs only after the v2 late fence, the other-body drain and ALL actual
sink closes succeed, and NO-ARG `finalInputs` returns the fresh deeply
frozen exact-nine `{headFields, commonIdentitySha256, request, claims,
phaseDirectory, recordedProof, identityProven, identityMismatch,
cleanupOk}` bundle, excluding `artifactRefs`/`eventsRef`. `bindRuntime`
binds once BEFORE FIRST RECORDER USE — exact brand/identity plus a
valid clock/optional descriptive callback checked before mutation; an
invalid/repeated/late binding cannot replace a valid tuple. A bound
public untimed `finalize` rejects caller-correctable `RECORDER_STATE`
before callback/IO and never poisons away the timed path; the unbound
legacy path runs an explicit private untimed A then B with the SAME
true lifetime/held publication and no outer spanning attempt or
self-wait.

A captures request/checks/parents/nested before await (the initial
independently frozen `{parents, nested}` snapshots stay Records-private
through the NO-ARG `sealClosedEvidence`); inside ONE attempt it
validates manifest/running/once then intent and sets
finalizing/stopped synchronously. Capture is invoked while the trusted
POST_STOP_KINDS remain admitted and the mandatory cleanup callback may
await a real cleanup append. AFTER actual fact handling A installs
`fenceFinalEvidence(currentBodyToken)`, drains every OTHER admitted
body, then invokes the Recorder-owned close-all — closing ALL artifact
and event sinks despite an individual failure, preserving the actual
events ref and first error, the correct final lane and late
acquisitions. Only after successful closure does it call
`finishClosedEvidence` and retain the genuine ticket + capture
instance. A must ACTUALLY settle before B; an A failure closes the
genuine acquired evidence and leaves no usable ticket/facts/publication
— it never routes to containment with a null/invented capability.

B validates the premature/once/sticky/state guards BEFORE consuming the
ticket or caching the seal promise, then `continueFinalEvidence`
preregisters the separate actual body. It obtains the actual retained
inventory via `phaseArtifactRefs({workspaceRoot: store.root,
phaseDirectory}, io)` with ONE private frozen `{retainActual:
inheritedLifetime.retainActual}` binding reused unchanged across
Records-owned inventory operations — same registrar/owner, no new
owner/ledger, no no-op legacy FS. It builds the final through the
record-finalization.mjs `buildFinalFromClosedFacts` pure helper over
the exact-nine `finalInputs` facts plus the Records-obtained
`artifactRefs`/`eventsRef`, writes `final.json` through the Store final
lane, takes a FRESH complete inventory, builds the completion using the
EXACT captured `parents` as the completion prerequisites and EXACT
`nested` as `expectedSelfTest` (no fresh caller input), then runs the
actual `prepareCompletion`, the actual
`verifyPreparedReceiptGraph({preparedCompletion, expectedIdentity:
ws.commonIdentity})` and the actual `publishPreparedCompletion ->
{completionRef, verified}` over the actual Store51 literal three
methods — no qualified or invented Graph API and a fresh `new Map()`
memo per real graph invocation. A prepared-verification rejection calls
ONLY the genuine `containPreparedCompletion(actualPrepared, cause)`,
preserving the exact original primary and awaiting truthful safe
failure; there is no writeOnce completion shortcut, postseal
verification, callback verifier, second status derivation or retry of
an ended transaction — only the actual immutable Store result marks
finalized/sealedResult and `verified.final` remains the sole outcome
feed.

The timed actual verifier receives the trusted second
`{deadlineMonoMs}` while untimed calls keep the original one-argument
invocation; no fresh Native issues after the original end and the
original experiment/Native cleanup cutoffs do not move — only
filesystem evidence sealing may finish afterward, separately reported.
`onBookkeepingSettlement` may observe actual capture/seal times/errors
from the real bound clock but cannot submit status/proof/time
overrides, change eligibility, replace the primary transaction outcome,
invoke containment after seal, retract `verified.final` or require
postseal IO — a thrown/rejected observer result reaches only the ONE
best-effort `process.emitWarning` diagnostic declared in the
corrective-58 block below, and no new public observer/fault API is
added. `closeIncompleteEvidence` stays the IDENTICAL direct function
reference on the facade whose ONE valid closure is preregistered
outside the pending set it drains (see record-lifecycle.mjs). The
top-level fresh lifetime barrier remains WD responsibility after
issuance closes and the own safe transaction settles; nested never
waits healthy-parent debt. DAG: records.mjs -> Store/getter + Graph +
record-inputs.mjs + record-lifecycle.mjs + record-evidence.mjs +
record-finalization.mjs + record-bookkeeping.mjs +
record-finalizer.mjs; the record-finalizer.mjs edge runs one-way to
canonical-json.mjs, artifact-store.mjs `phaseArtifactRefs`, the
record-finalization.mjs aggregation pair, the record-inputs.mjs pair,
`createEvidenceCapture`, `createBookkeepingObserver` and
`verifyPreparedReceiptGraph` with no records.mjs backedge, so the
helper edges stay
acyclic per the record-inputs.mjs section. Functional runtime membership and the exact
Store/Graph bindings are unchanged.

Corrective 58 (declared before use — the optional observer binding
below is declared before its Records consumer implementation and is
not yet implemented or verified green; it fills the payload and
diagnostic channel left descriptive-only by the 31/56 contracts and
changes no requirement, eligibility rule, deadline, Store result or
Recorder roster): `bindRuntime` stays exact and the optional
`onBookkeepingSettlement` callback receives ONE independently owned
deeply frozen descriptive object with EXACTLY five keys — `runId` and
`phase` (the already captured manifest strings), `captureClosedMonoMs`
(the actual bound-clock time after A closed every evidence handle and
finished its closed-evidence capture, else null — never a deadline,
guessed duration or fabricated zero), `bookkeepingSettledMonoMs` (the
actual bound-clock sample after B's truthful own-safe settlement, or
after a failed A once every acquired actual evidence handle has
genuinely closed — never before settlement; unknown closure stays
pending and emits no settled report) and `primaryError` (null on
actual success, else a separately frozen `{code, detail}` with a
copied string-or-null code and detail bounded to 400 characters; the
original arbitrary fault and its presence flag stay untouched on the
transaction's own error channel, `null`/`undefined` throws describe
literally — never a clean result — and property access/String
conversion are guarded with a fixed type description if both throw).
A successful A does not notify before B; the callback runs at most
once per attempt after truthful actual own settlement through a
detached Promise continuation whose rejection handler is installed
before invocation. A synchronous throw, rejected result, throwing
thenable or asynchronous rejection — and any descriptive
clock-sampling/formatting failure, which skips the incomplete report
with no timestamp guess — reaches ONE best-effort diagnostic via the
EXISTING `process.emitWarning` with code `TINYAZ_BOOKKEEPING_OBSERVER`,
type `TinyazBookkeepingObserverWarning` and message `Tinyaz
bookkeeping observer failed: ` plus the bounded safe detail. The
notification is never awaited inside A, B, the Store transaction,
required IO or the shared lifetime — no hold, physical receipt,
status/proof/time override, containment, eligibility change, record
event or new public API — and a hanging observer cannot delay or
retract completed publication; best-effort emission cannot replace the
actual Store `{completionRef, verified}` or the original primary. With
no observer bound there is no extra descriptive work or clock read;
the trusted WD callback normally emits no warning and its private
`recordFault` array alone is not external diagnosis.

Corrective 59 (declared before creation/use — the record-bookkeeping.mjs
file is ABSENT and nothing here is implemented or verified green): the
WHOLE descriptive bookkeeping-observer responsibility above — bound-clock
sampling, safe arbitrary-error description, five-field payload
construction, at-most-once notification and the existing best-effort
`process.emitWarning` fallback — delegates to the planned
[record-bookkeeping.mjs](#record-bookkeepingmjs-exists--r4-declaration-dated)
pure leaf, which records.mjs constructs only when the optional observer
exists and calls solely at the truthful boundaries above. The
corrective-58 semantic binding is unchanged; 59 adds only the physical
module owner — no new observer, report, getter or public API.

Corrective 60 (declared before creation/use — the record-finalizer.mjs
file is ABSENT and nothing here is implemented or verified green): the
WHOLE private finalization/binding pipeline above — the expanded
private A/B bodies, the four `bindRuntime`/`closeEvidenceBeforeCutoff`/
`sealClosedEvidence`/`finalize` methods and the private
binding/caches — delegates to the planned
[record-finalizer.mjs](#record-finalizermjs-exists--r4-declaration-dated)
pure leaf, which records.mjs constructs ONCE after its real
lifecycle/headFields exist over the EXACT12 trusted same-instance
context and whose EXACT4 returned methods it exposes on the facade by
IDENTICAL function references — no async wrappers, aliases or extra
public surface. The corrective-56/58/59 semantic bindings are
unchanged; 60 adds only the physical module owner plus the private
actual-A `captureSettled` flag — set ONLY after the SAME awaited real
A attempt fulfilled and its raw lifecycle finally settled, checked by
`sealClosedEvidence` BEFORE the seal promise is cached or the ticket
consumed, so a premature caller-correctable `RECORDER_STATE` leaves
the later genuine legal call usable. records.mjs keeps all ordinary
Recorder methods, lifecycle/state/headFields/owner/io creation, the
actual `closeWriters` and the genuine `phaseRecorderLifetime` WeakMap —
no new public API, second owner, queue, status or proof.

## record-lifecycle.mjs

Private leaf runtime owner for the recorder lifecycle machinery; joins
the functional-runtime input union. `records.mjs` remains the sole
canonical writer, state/status owner and actual sink owner, and supplies
the four trusted recorder closures.

- `createRecorderLifecycle({readState, latchFailure, closeAdmission,
  closeWriters}) -> frozen {attempt, closeIncompleteEvidence}`. Pure
  construction only — no timer, IO, queue, clock, Native or status.
- `readState() -> {sticky, finalizing, finalized}` reads the SAME
  recorder state; no helper-owned duplicate finalization/proof/status.
  `latchFailure(error)` applies the existing caller-correctable code
  policy and retains the first existing sticky failure.
  `closeAdmission()` synchronously marks the recorder stopped.
  `closeWriters() -> Promise<void>` is the actual records-owned sink
  close callback, invoked only after all pre-fence attempts settle; it
  observes `state.streams`/`state.eventsSink` at that time, closes every
  real sink even when one rejects, and retains/rethrows the failure.
- `attempt(fn) -> Promise<T>` preserves the entire existing wrapper and
  caller-correctable policy: guards the incomplete fence and sticky
  state before invocation, registers a deferred actual-attempt receipt
  in a private set BEFORE invoking `fn`, invokes `fn` synchronously
  after registration, and settles that receipt only when the actual
  callback/body/store-operation promise settles — never a public
  timeout. Rejections retain the existing sticky semantics and still
  finish the body receipt; separate sink/handle closure remains owed.
- `closeIncompleteEvidence() -> Promise<void>` is never admitted through
  `attempt` and never waits on itself. It rejects a current
  `finalizing`/`finalized` state, then on the first valid call
  synchronously fences all new admission (including later
  fault/resource/cleanup mutations and finalization), closes existing
  state admission before the first await, captures and awaits every
  already-admitted actual-attempt receipt, and invokes `closeWriters`.
  Repeated calls return the same actual closure promise, including its
  rejection. No close failure or unresolved body counts as settled; an
  unfinished open is never cancelled and a pending closure promise alone
  is not process liveness or safe-exit proof. The fence is permanent
  after success or failure, the original sticky failure stays retained,
  and no public `finalize` exists after incomplete closure.

R4 declarations (recorded before creation/use, planned until source
exists): `createRecorderLifecycle` gains the REQUIRED trusted
`retainActual` input — the recorder's inherited owner registrar, never
an independent ledger — and its frozen return becomes `{attempt,
closeIncompleteEvidence, fenceFinalEvidence, continueFinalEvidence}`.
`attempt(fn)` preregisters the actual body receipt in the same pending
Set before synchronous `fn(currentBodyToken)` invocation (existing
callbacks ignore the extra private token; a receipt fulfills only on
actual body settlement and never proves sink/child closure).
`fenceFinalEvidence(currentBodyToken) -> FinalEvidenceTicket` installs
the permanent final-evidence admission fence and invokes
`closeAdmission()` synchronously before first await, then drains every
OTHER pre-fence actual receipt excluding this token — no new attempt
of any kind enters after the fence. `continueFinalEvidence(ticket,
fn)` is the ONLY route through the fence: it requires the genuine
unused ticket after successful capture and drained bodies, consumes
the ticket and preregisters a separate continuation receipt before
`fn()` without reopening ordinary admission. `CurrentBodyToken` and
`FinalEvidenceTicket` are frozen opaque WeakMap-branded objects, never
serialized as wire/record/status/proof; forged, foreign, expired or
already-used capabilities reject `RECORDER_STATE` before new effects.

Corrective 56 (declared before use — not yet implemented or verified
green): the exact v2 token/ticket WeakMap identities, neutral
actual-body receipts registered BEFORE `fn` invocation/queueing, the
original result/error/latch channel, the all-admission fence, the
no-self-wait/exclude-own-token drain and the B preregistration ONLY
AFTER A actually settles are all preserved; there is no public token
retrieval, timer, second debt ledger or global `whenSettled`, and
`readState`/`closeAdmission`/the real `closeWriters` remain
Recorder-owned closures. `closeIncompleteEvidence` stays the IDENTICAL
direct function reference on the Recorder: its ONE valid closure is
preregistered OUTSIDE the pending set it drains, fences synchronously,
awaits every earlier actual body including late-open acquisitions,
attempts ALL actual sink closes and preserves the original failure;
repeated valid calls return the SAME promise including failure, and a
competing/finalized state rejects BEFORE installing or caching an
invalid fence so it cannot steal a later valid finalizer. Arbitrary
thrown values must not make latch bookkeeping skip actual receipt
settlement or replace the operation's original first value.

## prerequisites.mjs

- `verifyReceipt({workspaceRoot, completionRef, expectedIdentity}, io?)`:
  verifies `completionRef` bytes/hash, parses the canonical completion,
  enumerates the phase directory and requires exact sorted inventory
  equality (every retained regular file except only that completion),
  parses/validates `manifest.json`, `running.json` and `final.json`,
  cross-checks workspaceId/runId/phase/commonIdentitySha256/status/exitCode
  consistency, compares the workspace `commonIdentity` to the supplied
  `expectedIdentity` snapshot by canonical bytes, and recursively verifies
  the declared prerequisite closure once per unique ancestor (conflicting
  same-phase receipts, cycles, missing/extra parents or altered bytes
  reject). Returns frozen `VerifiedEvidence` `{workspaceId, runId, phase,
  commonIdentity, completionRef, completion, final, manifest, running,
  closure}`; `closure` is path-sorted `{phase, runId, completionRef}` for
  top-level ancestors. It is evidence, not admission.
- `admitPhase({workspaceRoot, phase, commonIdentity, parents,
  probeIdentity}, io?)`: `phase` is one of `check`/`parity`/`preflight`/`compare`;
  `parents` are completion `ArtifactRef`s under the same workspace. Verifies
  each receipt, requires the parent phase set exactly
  `REQUIRED_PARENT_PHASES[phase]`, requires each parent `passed`/exit 0 with
  complete checks and verified cleanup, and requires `probeIdentity` to
  report the parent's `running.supervisor` tuple `gone`. `probeIdentity` is
  mandatory, receives the full identity tuple, and `same-live`, `gone`,
  `unavailable`, a throw or an unknown result fails closed appropriately —
  only `gone` admits. WORKTREE rules: a `WORKTREE` parity may use only a
  completed same-workspace `WORKTREE` check with identical content/common
  identity; committed parity requires a committed check; `preflight` and
  `compare` reject a `WORKTREE` self or any `WORKTREE` ancestor. Returns
  frozen `PrerequisiteAdmission` `{phase, commonIdentitySha256, parents,
  closure}`.
- `verifyInternalSelfTest({workspaceRoot, completionRef, parentRunId,
  parentSupervisor, expectedIdentity, probeIdentity}, io?)`: verifies the
  `watchdog-selftest` receipt rooted at `preflight/selftest/`, requires the
  manifest `owner` `{phase:"preflight", runId:parentRunId, supervisor:
  parentSupervisor}`, the exact expected outcome (`inconclusive`, exit 2,
  `HEARTBEAT_TIMEOUT`, `analysisEligible:false`, `unplannedFaultCount:0`,
  `summary.scoredGames===0`, all four checks passed), a verified
  `selftest-workload` cleanup proof whose `expectedFinalizer` is the parent
  supervisor, and `probeIdentity(parentSupervisor)` returning `same-live`.
  This is the only API where the named parent finalizer may remain live.
  Returns frozen `VerifiedSelfTest` `{runId, completionRef, parentRunId,
  parentSupervisor}`.
- `inspectIncompletePhase({workspaceRoot, phaseDirectory, probeIdentity},
  io?)`
  returns frozen `PhaseDisposition`: `complete` (a completion exists; the
  ref is reported without claiming admission), `in-use` (running without
  completion and `probeIdentity` reports `same-live`), `abandoned`
  (`gone`), or `unproven` (probe `unavailable`/throw or missing running).
  It never writes, signals, upgrades or fabricates a receipt.
- Error codes are stable and bounded: `EVIDENCE_INVALID`,
  `EVIDENCE_MISMATCH`, `EVIDENCE_INCOMPLETE`, `PREREQUISITE_INVALID`,
  `FINALIZER_LIVE`, `PROBE_UNAVAILABLE`, `WORKTREE_REJECTED`,
  `SELFTEST_INVALID`, `DISPOSITION_INVALID`.
- Byte binding: every parsed record is the exact stable bytes the declared
  inventory ref commits to (file identity/size pinned before and after the
  read). Every `manifest.inputs` retained ref — baseline/candidate/harness
  files, `setup` and `model` — must exist under the workspace `inputs/` tree
  with the declared bytes, verified by the streaming stable inspector rather
  than whole-file buffering. Every `final.requiredChecks[].evidence` ref
  must name a path in the phase inventory with the exact declared
  byteLength/sha256. For `preflight`, `completion.expectedSelfTest` must
  point at `preflight/selftest/completion.json`, be a member of the same
  inventory, and verify as a `watchdog-selftest` receipt with the exact
  owner, outcome and scoped cleanup described under
  `verifyInternalSelfTest` (minus the live-parent exception, which applies
  only to that public live API).

R4 declarations (recorded before creation/use, planned until source
exists): the whole exact-byte receipt-graph core delegates to
receipt-verification.mjs (`verifyReceiptGraph`/`selftestOutcome`/
`addClosure`) while prerequisites keeps admission/probes/public
snapshot boundary and the `verifyReceipt` three-input/
copy-before-await contract; `phaseArtifactRefs` is consumed through
artifact-files where it lives, with no new store dependency.
Corrective 52 (Root-approved, recorded before use): each of
`verifyReceipt`/`admitPhase`/`verifyInternalSelfTest`/
`inspectIncompletePhase` gains an optional PRIVATE second `io`
argument — the existing first named-args object, return shapes,
async rejection/error semantics and wire stay unchanged. An omitted
`io` keeps legacy readonly compatibility; a supplied malformed
binding rejects in the existing argument-error style BEFORE any
filesystem operation. Operational callers bind the EXACT frozen
same-owner `ActualIO` (`retainActual`), forwarded unchanged through
`verifyReceiptGraph`, receipt-files and the direct incomplete-phase
filesystem calls — each real graph invocation still owns a fresh
memo, with no default new ledger/noop/fallback or copied
registration authority. Public prerequisite policy, live identity
probes, original absolute deadlines and authority stay unchanged and
MUST finish before the original experiment/native cutoff;
evidence-only graph/prepared/canonical filesystem verification
issues no Native probe and may join approved post-cutoff evidence
sealing — the `io` is never authority for post-cutoff Native or for
bypassing admission/identity/cleanup checks.

## receipt-files.mjs

Private runtime helper imported by `prerequisites.mjs` and the planned `receipt-verification.mjs` graph; it is a member
of the functional-runtime input union and exposes no public authority.

- `confinedRead(root, rel, name, io?): Promise<Buffer>` requires a confined
  workspace-relative POSIX path (no absolute/`.`,`..`/backslash/NUL/empty or
  trailing components), rejects any symlink component between root and
  target, requires a regular file, reads it, and re-checks size/inode/mtime
  so the returned bytes are exactly the stable bytes an inventory hash
  committed to. `ENOENT` rejects `EVIDENCE_INCOMPLETE`; path/symlink
  problems reject `EVIDENCE_INVALID`; a concurrent change rejects
  `EVIDENCE_MISMATCH`.
- `loadRecord(root, rel, kind, declared?, io?): Promise<{value, ref}>` parses and
  schema-validates the same stable bytes for `kind`
  (`workspace`/`manifest`/`running`/`final`/`completion`), returning the
  value plus its computed `{path, byteLength, sha256}`; when `declared` is
  supplied it must equal that ref exactly or `EVIDENCE_MISMATCH` rejects.
- `verifyInputRefs(root, inputs, io?): Promise<void>` checks each retained ref
  in `inputs.baseline.files`, `inputs.candidate.files`,
  `inputs.harness.files`, `inputs.setup` and `inputs.model` by streaming the
  confined file through the shared stable artifact inspector — never by
  buffering a whole model/input — and requires the declared bytes/hash.
  Missing input rejects `EVIDENCE_INCOMPLETE`; changed or wrong bytes reject
  `EVIDENCE_MISMATCH`.
- All inputs are copied/compared synchronously before any await; no
  caller-owned object is retained across IO.

R4 declarations (recorded before creation/use, planned until source
exists): `confinedRead`/`loadRecord`/`verifyInputRefs` thread the same
optional private `io` registrar; JSON reads run over an explicitly
owned bounded FileHandle so a failure cannot falsely prove close —
stable byte/hash/parse checks and exact error mappings preserved. It
keeps importing `confined`/`hashFileRef` directly from artifact-files
with no artifact-store dependency. Corrective 52: that `io` is the
EXACT frozen same-owner `ActualIO` forwarded unchanged from the
calling prerequisites wrapper or receipt-verification graph —
never a default, new ledger or noop.

## supervisor-protocol.mjs

- Re-exports `IPC_LIMITS`, `TIMING_LIMITS`, `RESOURCE_LIMITS` as frozen
  aliases of the `FIXED_LIMITS` members: frame `1048576`, driver message
  `262144`, chunk `65536`; readiness `30000`, command `90000`, heartbeat
  `500`, heartbeat gap `2000`, sample `250`, sample gap `500`, cleanup
  `5000`, phase `600000/600000/600000/3600000`; rss `4294967296`, workspace
  `268435456`, ordinary `266338304`, final reserve `2097152`.
- `createProtocolValidator({runId})` creates the one run-global validator.
  `accept(channel, direction, message, encodedByteLength)` enforces the
  closed `{ipcVersion:1, runId, seq, type, ...}` envelope, `seq` `0,+1` per
  direction per channel, per-channel byte ceilings (`driver` both
  directions `262144`; `collector`/`teardown-collector`/`exec-gate`
  `1048576`), closed variant fields and lifecycle transitions. Channels:
  `driver` (directions `d2s`/`s2d`), `collector` and `teardown-collector`
  (`c2s`/`s2c`), `exec-gate` (`s2c` one-shot). One shared registry prevents
  request/operation/record/artifact ID conflicts across channels. A driver
  `recordSeq` is `0,+1` across its event/artifact requests and is separate
  from envelope `seq` and the canonical event `seq`.
- Driver types `hello`, `heartbeat`, `register`, `begin`, `end`, `event`,
  `artifact`, `finish`, `closed`; supervisor replies `start`, `registered`,
  `begun`, `recorded`, `stop`. No `begin` before `start`, no duplicate live
  operation, no record/use before the matching ack, no `end`/`recorded` ack
  mismatch. An idle `heartbeat` carries `operationId:null`; a `begin` is
  pending until its `begun` ack binds `remainingMs` within the fixed
  readiness/command ceiling for the stored kind, and only that acknowledged
  live operation satisfies `end`. A `begun` ack also requires the still
  open, ordinary-work-eligible driver state: a begin pending across `stop`,
  a run-global fault, `finish` or `closed` can never activate. After
  supervisor `stop` only the graceful `closed` marker remains admissible —
  no `end`, `finish` or ordinary output; `finish` once and never proof of
  success. A `register` request's exact `{kind, rootPid,
  expectedExecutable, listener}` binding is retained immutably and the
  `registered` ack must match it; `expectedExecutable` must be a
  structurally absolute resolved path (the same rule as collector roots),
  never a bare name. An `artifact` stream binds one artifactId to one
  confined relative path at a time; a path can be active on only one
  stream and closed artifactIds stay claimed.
- Collector types: `c2s` `ready` (`stage:"startup"` exactly first, once;
  `stage:"roots-accepted"` binding a pending `own-roots` request),
  `process-samples`, `signal-result`,
  `accounting-fault` (terminal on that stream); `s2c` `own-roots`,
  `sample`, `signal`, `shutdown` (only with no pending update). Sample
  messages must finish `>= start`, keep `samples`+`gone` exactly
  partitioning the requested owned set, report `inspected`/`probes` exactly
  once, use closed native row shapes whose inspection pid matches its
  process identity, and keep discovery PIDs unique. `own-roots` copies its
  roots pending; they enter the shared owned registry — and become
  signalable — only on the exact `roots-accepted` acknowledgement.
- `authorizeSignal`/`authorizeExecGate`/`authorizeTeardownCollector`
  deep-copy their bindings at authorization; later caller mutation cannot
  rebind an acknowledged identity. A sticky run-global ordinary-work fault
  is set by any invalid known-channel traffic or a collector
  `accounting-fault`: it blocks new ordinary driver work and new workload
  roots while preserving proof, owned signals, permitted accounted cleanup
  helpers and the teardown channel. On a still-healthy collector the one
  admitted post-fault root kind is `helper` — the trusted accounted
  cleanup-helper registration, acknowledged and bound like any other root
  set; new `browser`/`driver`/`python`/`fixture` workload stays rejected.
  A `passed` finish can never recover a faulted run. An invalid message
  poisons only its own channel (sticky) and throws `IPC_INVALID`; the
  healthy collector stays usable for cleanup and the global registry is
  preserved. A direct codec failure inside a known channel (a non-JSON
  value reaching a copy boundary) is normalized to the same bounded
  `IPC_INVALID` with poison and global stop; parsed JSON can never carry
  such a value.
- `authorizeSignal({requestId, identity, signal})` reserves a binding that
  exactly one matching `s2c` `signal` consumes.
  `authorizeExecGate({queryId, identity, query})` permits exactly one
  `seq:0` `exec` message on `exec-gate` carrying that `queryId`, full
  identity and query (`{kind:"owned-pids", pids:[...]}` or `{kind:"port",
  port}`). `authorizeTeardownCollector({identity})` permits one
  `teardown-collector` channel whose `ready` must carry that exact
  collector identity and which admits only sample/signal/shutdown traffic —
  proof and teardown continuation only, never new workload or restored
  passage.

## stats.mjs

- `signProbability(m, k)`: integers `0 <= k <= m <= 20`; `min(1,
  2 * sum(C(m,j), j=0..min(k,m-k)) / 2^m)`; `signProbability(0,0)` is 1.
  References: `(5,5)=0.0625`, `(6,6)=0.03125`,
  `(20,15)=0.04138946533203125`, `(20,10)=1`.
- `clopperPearson95(m, k)` returns `{low, high}`: equal-tail exact interval
  by binomial-tail inversion with 60 bisection steps per endpoint; `m=0`
  gives `{0,1}`, all-win `{0.025^(1/m), 1}`, all-loss `{0, 1-0.025^(1/m)}`.
- `summarizePairs(pairs, eligibility)` takes a `pairs` array of closed
  plain objects `{pairNumber, openingId, games}` — own keys exactly, no
  inherited or unrelated keys — where `pairNumber` is the ordered prefix
  `1..20`, `openingId` is a nonempty string unique across the input
  (duplicates reject), and `games` is the recorded prefix of at most 2
  closed `{gameNumber, candidateColor, result}` objects. `result` is one
  of the PGN literals `"1-0"`, `"0-1"`, `"1/2-1/2"` or `"*"` (recorded
  but incomplete, worth no points); candidate points decode the result
  through the declared `candidateColor` — odd pairs give the candidate
  White in game 1 and Black in game 2, even pairs the opposite. Only the
  single final pair may be partial (0-2 recorded games); a partial pair
  anywhere else rejects. `eligibility` is the closed
  `{unplannedFaultCount, stoppedEarly, cleanupVerified}` record under the
  same own-key rule.
- The returned frozen `PairSummary` is exactly `{recordedGames,
  completedGames, completedPairs, gameWdl:{wins, draws, losses,
  incomplete}, pairScores:[{pairNumber, openingId, completedGames,
  candidatePoints, baselinePoints, classification}],
  advantageousPairs, disadvantageousPairs, tiedPairs, nonTiedPairs,
  conditionalEstimate, pValue, interval95,
  pairedScoreDifference:{completedPairCount, totalPointsDifference,
  meanPerPair}, analysisEligible, classification}`. `recorded*` counts
  only actually recorded games; unplayed games are never invented, and
  `"*"` lands in `incomplete`. Per-pair `classification` is
  `advantageous`/`disadvantageous`/`tied` on candidate-versus-baseline
  points, or `incomplete` for a partial pair. `pairedScoreDifference`
  sums complete pairs only — a partial pair contributes nothing — with
  `meanPerPair` `null` when no pair is complete.
- Only 20 complete pairs / 40 complete games with zero faults, no early
  stop and verified cleanup are analysis-eligible; then `m` non-tied,
  `k` advantageous, `p <= 0.05` with `k > m/2` yields
  `advantage_signal_on_locked_suite`, `k < m/2`
  `regression_signal_on_locked_suite`, else `no_detectable_advantage`.
  Ineligible summaries keep raw counts with `null` inferential fields
  and `inconclusive`; a complete all-tied cohort has `p=1`, `null`
  estimate and `[0,1]`. No Elo, equivalence or population claims.

## watchdog-lifetime.mjs (exists — R4 declaration dated)

The supervisor's actual referenced-lifetime/deferred physical-debt
owner: `createWatchdogLifetime({createHold = defaultReferencedHold} = {})
-> frozen {retainActual, retainFinalizerUntil, whenSettled}` plus the
pure brand guard `assertWatchdogLifetime(owner)`. The default creates
ONE actual referenced Node timer in the same supervisor on first debt —
a process-lifetime hold, never a deadline/control clock; the
operational facade always constructs the default (isolated leaf tests
alone may inject a `createHold` spy). `retainActual(p)` registers debt
synchronously BEFORE the issuer invokes actual callback/IO;
`retainFinalizerUntil` registers the publication transaction's
safe-exit debt before any possible publication; a receipt rejection is
observed but never releases debt — no timeout, thrown error or
destroy/end/close invocation proves physical closure, and every open
FD/stream/child retains SEPARATE real-close/reap debt.
`whenSettled()` observes actual registered debt and fulfills only at
genuine zero; a publication never waits on a snapshot containing its
own safe receipt, and the top-level caller takes a FRESH barrier after
issuance closes. No queue, phase clock, Native capability or status
authority. Functional runtime input.

## process-horizon.mjs (exists — earlier PLANNED/R4 wording, its line counts and the not-green note are dated declarations)

Pure branded one-shot original-end/min-only horizon:
`createNativeHorizon() -> frozen {reader, initialize(deadlineMonoMs),
narrow(deadlineMonoMs)}` with owner/reader branded through private
WeakMaps. `reader` is the frozen readonly `{read(), subscribe(cb)}` —
`read()` is null while unarmed, else the finite nonnegative
safe-integer absolute hrtime-ms bound; `initialize` runs exactly once;
`narrow` publishes only `min(current, supplied)` and invokes ALL
subscribers synchronously — the FIRST thrown value is captured
unchanged (a listener throwing null or undefined included) and
rethrown only after every live listener ran. `bindProcessHorizon({reader, queue}) ->
{originalDeadlineMonoMs(), readDeadlineMonoMs(), releaseAfter(p)}`
uses the SAME `queue.narrowAll` — every strict update reaches already
acquired handles, transport pending replies, backpressure and
physical-debt lifetimes; `releaseAfter` accepts only the runtime's
truthful actual drain/reap settlement. No timer, clock, queue, process
or IO authority. Functional runtime input.

Corrective 62 (declared before implementation, not green): the module
already exists and declares the EXACT3 roster
`createNativeHorizon`, `bindProcessHorizon`, `assertNativeHorizon`.
NEW pure private `assertNativeHorizon(owner) -> void` consults ONLY the
SAME existing OWNERS WeakMap `.has` — a genuine factory-minted owner
returns `void`; primitive, null, forged, spread or proxied inputs
reject with the existing PROCESS_HORIZON error style and owner-brand
detail BEFORE any owner property read, mutation or effect. It holds
no constructor, callback, time, IO, owner, ledger, status or proof
role and sets no success marker; factory owner keys
`{reader, initialize, narrow}`, reader `{read, subscribe}` and the
binding's three methods stay unchanged. The checker proves owner
IDENTITY only — never clock choice, reader/monitor pairing or
cleanup.

## process-stop.mjs (exists — R4 declaration dated)

The whole Native stop flow: `createProcessStop({state, clock,
authority}) -> frozen {stopAndReap, teardownCollector}` constructed
once by process-runtime over the SAME shared state, `config.clock` and
borrowed frozen authorities (`op`, `ownOperation`, `queue.settled`,
`queue.narrowAll`, `captureOperationBound`, `nowMonoMs`, `nextRid`,
`markFault`, nullable `releaseHorizonAfter`) — pure construction, no
spawn/timer/state transition at construction.
`stopAndReap(options) -> Promise<{exitCode:number|null}>` reserves one
flow, fences new external admission, expires only the actual pending
start handle, captures `ordinaryDrain =
queue.settled({excludeHandle: stopHandle})` even when child is null,
creates the one passive `actualStopSettlement` (rereading the adopted
collector physical receipt after genuine drain — never self-waiting)
registered through the stop handle's `retainActual` BEFORE bounded
waiting, issues wire-only shutdown/EOF only while the original handle
is live, and rechecks the actual clock before the reap result —
repeated stops MIN-only narrow the same first flow; a rejected result
never becomes success. `teardownCollector(handle)` is the private
borrowed-handle wire-only teardown — asserts the supplied original
handle live before every fresh action and returns only the existing
handle-bounded public `transport.reap` attempt, never the collector
physical/ordinary receipts. Direction is Facade→Runtime→Stop→Budget —
acyclic, no new queue/ledger/authority. Functional runtime input.

## artifact-sinks.mjs (exists — R4 declaration dated)

The whole `openArtifact`/sink lifecycle extracted from artifact-store.mjs
under the exact frozen `openStoreArtifact({artifactId, path, mode,
lane}, storeContext)` private factory. `storeContext` is constructed
and frozen ONCE by the Store — `{root, lanes, enqueue, usable,
checkSeal, reserve, release, reconcile, postAccounting, immutable,
activePaths, activeArtifactIds, closedArtifactIds, markIoFault,
retainActual}` — with the same store-owned Sets mutated only inside
the existing queue; `reconcile` moves committed bytes before awaiting
`postAccounting`, `enqueue` admits only outer open/append/close
operations (no leaf inside one may enqueue and await itself), and
`retainActual` is the SAME owner's registrar. Imports only node
fs/path plus the artifact-files tracked-IO leaves — no
artifact-store/prerequisites/records import, no sink-local
budget/queue/clock. A returned handle is owned before any guard can
fail; a public timeout or append error never fabricates close.
Functional runtime input.

## completion-publication.mjs (exists — R4 declaration dated)

Owned completion-temp capability and publication owner over a
module-private WeakMap keyed by frozen opaque `PreparedCompletion`
objects — no constructor, plain-object import or setter; the entry
pins the store-owner token, normalized root/phase, fixed canonical
`<phase>/completion.json` target, exclusive original temp path,
`{dev,ino}` identity, intended bytes/hash, the same `io` registrar and
transaction stage. The capability and its entry are pinned BEFORE the
first acquisition await, so a pre-capability failure runs the same
owned containment — real close, required directory sync, observed
temp state and proven canonical absence — marks the entry contained
only when every proof lands, keeps actual failed/partial bytes in the
EXACT original temp and attaches the capability to the thrown primary
error only as an optional diagnostic — never the sole recovery or
strong-ownership path: the private entry and its `{writer,failedReader}`
resource slots stay strongly held through seal or truthful containment
independently of any nonextensible error property; an unproven step
stays strongly retained and uncontained, never orphaned or GC-as-close.
The WHOLE failed-temp streaming observation plus the actual
close/temp-state/dirsync/fresh-canonical-absence routines delegate to
completion-file-observation.mjs (declared below). Exact
private exports:
`prepareCompletionFile({storeOwner, root, phaseDirectory, bytes, io})`,
`publishCompletionFile(prepared, storeOwner)` (returns internally only
after raw rename/dirsync — never after store accounting/seal),
`retainFailedCompletion(prepared, storeOwner, cause) ->
{failedTemporaryPath, failedTemporaryRef}` (actual observed temp ref
or null only for unreadable bytes whose reader handle genuinely
closed — a real-close failure keeps the capability uncontained with
its error and retained close debt; never the intended-byte ref;
cannot fulfill while canonical absence/required sync/real close stay
unproven),
`markPublicationSealed(prepared, storeOwner)`,
`readPreparedCompletion(prepared) -> PreparedRead` — no caller
io/path/ref arguments; it reopens the owned temp with pre-armed close
debt and requires stable identity, exact byte count/hash and genuine
close. Corrective 53 (declared before use): the WHOLE prepared-file
read implementation and its responsibility comments delegate to
completion-file-observation.mjs `readPreparedCompletionFile` over the
SAME `{writer,failedReader}` slots and the shared
acquisition-uncertainty latch — this method validates the genuine
prepared stage, copies the exact private input snapshots, delegates,
retains the FIRST thrown operation fault on that same entry and
rethrows the original error channel — and
`recoverPreparedCompletion(storeOwner, phaseDirectory)
-> PreparedCompletion | null` (declared under the recovery channel
below). `PreparedRead` is exactly `{workspaceRoot, phaseDirectory,
canonicalRef, temporaryRef, fileId, bytes, io}` — `canonicalRef` is
projected from ACTUAL temp bytes, never a published receipt; callers
cannot supply one. Preparation builds the declared inventory before
creating the temp; private verification requires the canonical target
absent and removes exactly one temp entry after identity match — any
extra/missing/changed file fails; failed temps stay normal visible
retained evidence and never act as canonical refs. Imports only
artifact-files leaves — never receipt-verification or the Store.
Functional runtime input.

### recoverPreparedCompletion (pre-cap owner/phase recovery)

Private export `recoverPreparedCompletion(storeOwner, phaseDirectory)
-> PreparedCompletion | null`: a PURE reverse lookup over the SAME
genuine owner + normalized-phase / opaque-capability entry association
that `prepareCompletionFile` installs BEFORE its first await,
filesystem effect or acquisition — no extra capability constructor,
IO, queue, status/proof setter, error-property reader or second debt
ledger. A wrong or unregistered owner rejects; a registered owner with
no matching phase returns null — null means NO RECOVERY ASSOCIATION
and is never safe-containment or no-creation proof. A match returns
the SAME opaque capability, never a clone, entry, handles or boolean;
the association never replaces an existing owner+phase attempt, so a
duplicate prepare rejects before effects, and strong retention holds
until the original attempt reaches sealed/truthfully-contained
terminal ownership. On a pre-capability rejection the genuine Store
recovers via this exact lookup and drives the SAME private file-owner
containment core inside its already-owned queue transaction — it must
NOT await its own enqueued public `containPreparedCompletion`
(selfwait); only actual containment obligations, never lookup
presence, settle the safe transaction, a missing/wrong/unknown lookup
stays held/unproven with no writeOnce/untimed/safe-error fallback,
the original primary error remains the operation fault, and untimed
compatibility uses the same real held path.

### completion-file-observation.mjs (exists — R4 declaration dated)

Declared before creation/use — a dated declaration; the leaf now
exists and is implemented.
Corrective 53 (declarations recorded before use — the added export is
not yet implemented or verified green) supersedes the dated-51
SOLE-export/single-observer role wording, which stays preserved
history: the leaf's role expands to completion-file observations for
failed preservation AND bounded prepared readback. EXACTLY TWO
private exports:
`observeFailedCompletionFile({tempAbs, tempRel, phaseAbs, canonicalAbs,
fileId, maxBytes, io, ownedFiles}) -> Promise<{failedTemporaryPath,
failedTemporaryRef}>` (unchanged first argument/result) and
`readPreparedCompletionFile({workspaceRoot, phaseDirectory,
canonicalRel, tempAbs, tempRel, fileId, byteLength, sha256, io,
ownedFiles}) -> Promise<PreparedRead>`. Corrective 54 (declarations
recorded before use; the declared leaf is not yet created, implemented
or verified green): the roster stays EXACTLY TWO, but
`readPreparedCompletionFile` becomes the DIRECT constant alias of the
stable function returned by ONE pure module-composition
`createPreparedCompletionReader({acquireReader})` call in
completion-prepared-read.mjs — bound to this module's PRIVATE
`acquireReader` lexical closure, the literal real acquisition path
shared by BOTH reader paths, never a permissive mock or a
caller-selectable override.

- `io` is the EXACT same private ActualIO/registrar — no default or
  second ledger, and no queue, clock, status, phase, exit, seal or
  owner-registry authority.
- `fileId` is the original nonlossy identity captured from the
  genuinely adopted original writer — never a present pathname after
  a failed open. `maxBytes` is the pinned intended/reserved completion
  byte ceiling from that same entry, not a caller phase budget.
- `ownedFiles` is the SAME parent-private resource object with slots
  `{writer, failedReader}` — each null or a genuine existing OwnedFile
  and strongly pinned before the next await; associated first faults
  stay parent-owned and cannot be cleared. The leaf acquires/stores a
  new failedReader only after the old slot holds a genuinely fulfilled
  real-close receipt and never overwrites an unclosed original; no
  slot or handle is returned or exposed to driver/test debug APIs.
- Private path/id/size inputs are snapshotted before the first await.
  The leaf streams the failed temp in bounded 64 KiB chunks with the
  exact count/size ceiling, requires stable regular original identity
  before and after and across the actual close, then takes a fresh
  post-close temp stat, runs the required directory sync and proves
  fresh canonical absence after original and reader actual closure.
- The result is the existing frozen descriptive
  `{failedTemporaryPath, failedTemporaryRef}` only: a too-large,
  changed or unreadable owned file may yield a null ref solely after
  its actual reader closed and original ownership stayed proven; a
  lost, replaced or unknown original or any outstanding resource can
  never produce a contained result. No proof boolean, status, exit or
  admission authority.
- Corrective 54: the WHOLE prepared-file read implementation and its
  responsibility comments move here from parent
  `readPreparedCompletion` and ONWARD into completion-prepared-read.mjs
  (its own section below) — the corrective-53 'move here' phrasing
  stays preserved history and this leaf re-exports the factory-bound
  function unchanged. The exported `readPreparedCompletionFile` still
  receives only the ten explicit read facts plus the SAME two-slot
  resources — never the whole mutable entry, a `PreparedCompletion`
  capability or owner/stage/cause objects. `PreparedRead` stays
  EXACTLY `{workspaceRoot, phaseDirectory, canonicalRef, temporaryRef,
  fileId, bytes, io}` — frozen metadata with a fresh owned Buffer
  over the exact same private `io`; `canonicalRef` is projected from
  ACTUAL verified bytes and `temporaryRef` is real. It is NOT
  published or ordinary `VerifiedEvidence` and cannot mint a
  verification token; the graph still calls parent
  `readPreparedCompletion(genuinePrepared)` itself — no public
  plain-`PreparedRead` input or callback bypass.
- The parent keeps EXACTLY its existing SIX exports — no alias, new
  factory or debug hook — and sole opaque-capability/entry lookup,
  phase/stage/owner checks, strong owner+phase recovery, first-fault
  authority and all publication/restore/semantic-seal mutations. For
  the prepared read it validates the genuine prepared stage, copies
  the exact private input snapshots, delegates, retains the FIRST
  thrown operation fault on that SAME entry — null, undefined or
  nonextensible values included — and rethrows the original error
  channel; a later genuine close never clears the original
  transaction fault, and a prepared read still attempts actual close
  after a read failure, keeps the original read rejection when close
  also fails, retains outstanding genuine slot/debt and retains the
  later close fault on the original OwnedFile.
- ONE module-private acquisition-uncertainty latch keyed by the SAME
  parent-owned `ownedFiles` object serves BOTH readers — no ledger,
  resolver or public setter; it settles no debt and merely forbids
  success while actual debt stays unknown. Corrective 54: the WHOLE
  acquisition check/latch/adoption block lives inside ONE private
  `acquireReader({retain,tempAbs,ownedFiles}) ->
  Promise<genuineOwnedFile>` closure — the EXACT lexical argument
  passed to `createPreparedCompletionReader` once at module
  composition and the literal real acquisition path shared by BOTH
  reader paths, never a permissive mock; it acquires a real resource
  only, never attests closure/status/verification or clears
  ambiguity. It arms BEFORE
  `openActual`/actual issue; an adopted genuine handle pins to
  `failedReader` before the next await and successful adoption clears
  only the acquisition latch; an issued, rejected or unadoptable open
  with no handle leaves the latch sticky across retries — never
  overwritten or substituted by a later fresh reader — so fresh
  acquisition and contained results reject while latched. A null
  original identity is NEVER no-creation proof, even when the
  pathname is absent: any genuinely adopted slots are closed
  truthfully first, then unknown original identity rejects before
  any contained result. `ownedFiles` stays EXACT
  `{writer, failedReader}` — each null or a genuine OwnedFile, never
  cloned; the parent strong association keeps the key/attempt alive
  with no WeakMap-key-only retention or error-property sole recovery,
  and no `lifetime.whenSettled` runs inside its own transaction.
- Nonlossy identity: supported bigint `stat`/`lstat` throughout BOTH
  reader owners (this leaf and completion-prepared-read.mjs) — genuinely adopted original `writer.stat({bigint:true})`,
  opened-reader stat and path lstat — with private `dev`/`ino` kept
  as bigint, copied before the first await and never serialized or
  rounded; regular/no-symlink/full dev+ino checks hold, exact
  size/mtime compare through the read and a FRESH post-close stat,
  and only bounded byte counts convert for existing numeric
  ArtifactRef fields, compared safely against the BigInt pinned byte
  ceiling. No public schema/field expansion; exact path, identity,
  byte-limit and io values snapshot before await while `ownedFiles`
  stays the same shared resource object.
- Genuine close observation uses the ALREADY-EXISTING artifact-files
  `ownedFileCloseReceipt`: a handler arms on the SAME owned-file
  close receipt BEFORE any close attempt and the private
  observed-fulfillment flag changes ONLY from that genuine
  fulfillment — never inferred from public return/error or raced
  against an already-resolved false — while bounded real-close retry
  and the original first error hold; an unknown receipt stays
  uncontained/held. Corrective 57: that bounded real-close retry is
  the private MAX2-total-attempts cached flow inside
  `OwnedFile.close` itself
  ([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated))
  — repeated/concurrent/outer-retry close calls join that SAME flow
  and receipt and issue no extra raw closes, so this bullet's
  "bounded real-close retry" wording now refers to the leaf-owned
  flow, not a caller loop.
- Required final order: close original/old reader resources;
  observe/read the actual original; genuinely close the final
  reader; FRESH post-close original identity/size/mtime; required
  dirSync; FRESH canonical absence; only then the frozen
  FailedPublication — pre-read canonical/path guards and actual
  hash/count bounds preserved, a lost/replaced/unknown original
  never null-contained, no hidden deletion or post-seal mutation.
- DAG: CompletionPublication -> CompletionFileObservation ->
  CompletionPreparedRead -> ArtifactFiles -> OwnedFile
  ([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated)),
  plus CompletionFileObservation -> ArtifactFiles — never reversed
  and never to Store/Graph/Recorder — pure
  `node:fs`/`node:crypto`/`node:path` plus
  canonical hashing and the completion-prepared-read factory imports,
  no parent/Store/Recorder/ReceiptVerification/Prerequisites
  back-import and no Native/process/model/browser side effect at
  import or call. Corrective 57: the ArtifactFiles -> OwnedFile edge
  is the pure one-way factory composition; the leaf imports nothing
  back. Functional runtime input.

### completion-prepared-read.mjs (exists — R4 declaration dated)

Declared before file creation/use — a dated declaration; the leaf now
exists and is implemented.
Corrective 54 (declarations recorded before use): SOLE export
`createPreparedCompletionReader({acquireReader}) ->
readPreparedCompletionFile` — a pure trusted factory that captures the
supplied trusted acquisition function immediately at construction and
validates it before returning, invokes nothing, and creates no IO,
queue, clock, timer, hold, ledger or mutable dependency/result object.
The returned stable function accepts EXACTLY the ten-fact object
`{workspaceRoot, phaseDirectory, canonicalRel, tempAbs, tempRel,
fileId, byteLength, sha256, io, ownedFiles}` and returns
`Promise<PreparedRead>` — the SAME frozen seven-field `{workspaceRoot,
phaseDirectory, canonicalRef, temporaryRef, fileId, bytes, io}`. It is
descriptive file readback only — never published VerifiedEvidence or
receipt/token/status authority — and no callbacks ever enter the
caller's ten-fact object, the graph, the driver or the wire.

- `acquireReader` is the EXACT module-private lexical closure in
  completion-file-observation.mjs —
  `acquireReader({retain,tempAbs,ownedFiles}) ->
  Promise<genuineOwnedFile>` — owning the WHOLE existing acquisition
  check/latch/adoption block over the ONE uncertainty WeakSet keyed by
  the parent-owned `ownedFiles` object: it checks the existing
  uncertain latch and non-null slot before issuing, arms the SAME
  latch before `openActual`, pins the adopted genuine reader to
  `failedReader` before the next await and clears ONLY the
  successful-adoption latch; rejected or unadoptable opens stay
  sticky across retries with no fresh-reader substitution for unknown
  debt, and the callback can acquire a real resource only — it never
  attests closure, status or verification and never clears ambiguity.
  The operational callback is the literal real acquisition path,
  never a permissive mock.
- The WHOLE prepared-reader routine and its responsibility comments
  move here from the observation leaf (Source42 prepared301-466)
  preserving every guard, comment and body purpose — no shortened
  conditions or merged statements — with the sole dependency
  adaptation above plus the first-close-fault correction below.
- First-close-fault correction (corrective 54): the fault handler arms
  on the SAME genuine `ownedFileCloseReceipt` BEFORE the close attempt
  and captures the FIRST arbitrary close rejection through an explicit
  presence flag — null or undefined included — while bounded
  real-close retry is retained. An earlier read rejection still wins
  over a close rejection; when no read failure occurred but ANY close
  attempt failed, the exact FIRST close error rethrows EVEN IF a later
  real close physically settled. The `failedReader` slot clears ONLY
  on genuine receipt fulfillment — a positive prepared read never
  loses a close fault, physical-debt settlement stays separate from
  the operation error channel, and the failure-observation genuine
  boolean remains solely descriptive failed preservation that cannot
  mint prepared success. Corrective 57: the "bounded real-close
  retry" retained above is the leaf-owned MAX2-total cached flow
  inside `OwnedFile.close`
  ([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated));
  outer calls join it and issue no extra raw closes, so the
  FIRST-close-error rule is unchanged.
- The factory validates the actual returned OwnedFile identity through
  the existing `ownedFileCloseReceipt` before relying on its methods;
  a forged or mock lookalike can never yield positive readback.
- Exact nonlossy bigint `dev`/`ino`/`mtimeNs` throughout, owned
  identity snapshot before await, original source bounds, private
  `sha256` shape validated as EXACT-64 lowercase before effects, owned
  Buffer copy and original read-error retention, and the fresh
  post-close FULL regular/no-symlink dev+ino match to the pinned
  identity plus size/mtimeNs/count/hash — all stay53.
- Imports only `node:fs`, `node:crypto` and actual artifact-files
  primitives. DAG: CompletionPublication -> CompletionFileObservation
  -> CompletionPreparedRead -> ArtifactFiles -> OwnedFile
  ([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated)),
  plus CompletionFileObservation -> ArtifactFiles — no
  Observation/Parent/Store/Graph/Recorder back-import and no cycle;
  the SAME `io`/`retainActual` and genuine OwnedFile/closeDebt remain
  — no alternate physical registrar or proof flag — and no
  Native/process/model/browser side effect at import or call.
  Corrective 57: the OwnedFile edge is the pure factory composition
  only. Functional runtime input.

## receipt-verification.mjs (exists — R4 declaration dated)

The whole exact-byte receipt-graph verifier extracted from
prerequisites: `verifyReceiptGraph(args, memo, io?)` keeps the
ordinary fixed canonical-path/exact-byte semantics;
`verifyPreparedReceiptGraph({preparedCompletion, expectedIdentity})`
snapshots the FULL expected identity before await, calls
`readPreparedCompletion` itself and runs the same private full-graph
core over those exact bytes with its own fresh memo — no caller
memo/bytes/boolean/digest-only substitutes — returning only a frozen
opaque `PreparedVerification` token bound to the exact
PreparedCompletion identity through a second private WeakMap;
`consumePreparedVerification(preparedCompletion,
preparedVerification)` synchronously rejects forged/mismatched/used
tokens, consumes once and returns the frozen association for the store
to recheck before rename. The graph core imports `phaseArtifactRefs`
directly from artifact-files; allowed direction is
Store→ReceiptVerification→CompletionPublication/ReceiptFiles/
ArtifactFiles — no Store/Prerequisites import, acyclic. Corrective 52
(Root-approved, declared before use): a supplied `io` is the EXACT
frozen same-owner `ActualIO` (`retainActual`) forwarded unchanged
through receipt-files only — the direct incomplete-phase
filesystem calls belong to `prerequisites.inspectIncompletePhase`,
not the graph — each real graph invocation still carries a fresh
memo, a
malformed supplied binding rejects before any filesystem operation,
and there is no default new ledger/noop/fallback or copied
registration authority; the Store's frozen prepared publication calls
the private graph with the same io. Functional runtime input.

## record-evidence.mjs (exists — R4 declaration dated)

Corrective 56 (declared before creation/use — not yet implemented or
verified green; supersedes the dated prior `capture({running, request,
claims, prerequisites, expectedSelfTest, deadlineMonoMs,
closeAdmission}) -> Promise<ClosedEvidence>` declaration, which stays
preserved history and is no longer the current API): actual mandatory
verifier invocation and immutable fact capture under the original
cutoff, for records only. SOLE export
`createEvidenceCapture({workspace, manifest, verifyIdentity,
verifyCleanup, nowMonoMs, retainActual})` — pure construction that
validates and captures independently owned immutable
workspace/manifest and functions, performing no IO/callback/time read;
`nowMonoMs` is the real bound function for timed capture or EXPLICIT
null for Records' private unbound legacy mode — no invented Infinity,
fake start time or default/noop clock; `retainActual` is the REQUIRED
SAME inherited function. The factory returns ONLY the private frozen
`{capture, finishClosedEvidence, finalInputs}` roster accessible
solely inside records.mjs — never the Recorder facade or wire, never
an alternative record writer, status setter or caller-fact API.

- `capture({running, request, claims, deadlineMonoMs}) ->
  Promise<void>`, once only: independently snapshots canonical inputs
  before await. A timed instance requires a finite nonnegative
  safe-integer ORIGINAL absolute `deadlineMonoMs`; the explicit
  untimed private instance requires it omitted — no caller mode flag.
  The exact existing first-argument shapes for `verifyIdentity` and
  `verifyCleanup` are preserved; ONLY in timed mode a trusted second
  `{deadlineMonoMs}` is passed unchanged in meaning to those mandatory
  wrappers so they bind actual Native per-call original options, while
  untimed calls keep the original one-argument invocation. Before EACH
  live call the same `nowMonoMs` is validated/read and no call issues
  once the original end is spent — no fresh Native after the original
  end. An actual receipt is preregistered with `retainActual` BEFORE
  invoking each callback and fulfilled only when THAT actual callback
  settles; operation errors stay separate. After actual settlement the
  clock is read again; missing/late/invalid/error results remain
  unproven and cannot promote facts. A still-pending mandatory body is
  never raced away and a raw result is never mistaken for physical
  close; actual noncooperative debt stays referenced with no new grace
  or force-exit. Identity mismatch is only a genuine on-time unequal
  observation, and the cleanup proof scope/finalizer/head/schema rules
  preserve actual current logic including the selftest expected-PARENT
  supervisor and the empty caller-claims rule. No caller proof
  booleans or replaceable verifier functions.
- `finishClosedEvidence() -> opaque ClosedEvidence`, NO arguments:
  requires successful actual capture and no previous finish; called by
  records.mjs ONLY after the v2 late fence + other-body drain + ALL
  real evidence sink closes have succeeded; it deep-freezes the copied
  genuine private capture. This trusted internal ordering capability
  is NOT an independent physical-close certificate; no method takes
  caller facts/proof/closure callbacks, and a failed capture/close
  exposes no sealable facts.
- `finalInputs() -> fresh independently owned deeply frozen EXACT9
  plain fields {headFields, commonIdentitySha256, request, claims,
  phaseDirectory, recordedProof, identityProven, identityMismatch,
  cleanupOk}`: rejects before `finishClosedEvidence`, preserves the
  same real captured facts across every access, and excludes
  `artifactRefs`/`eventsRef` (records obtains those only after actual
  closure); no mutable callback aliases/Maps/Buffers/capabilities.

Mandatory real verifiers stay mandatory; `resolveStatus`/
`resolveAnalysisEligible` stay the sole outcome ladder. Functional
runtime input.

## record-inputs.mjs (exists — R4 declaration dated)

Corrective 56 (declared before file creation/use — the file is
currently ABSENT and nothing below is implemented or verified green):
the whole pure-input leaf for records.mjs. It owns ONLY canonical
snapshots and the unchanged pure input/schema guards moved whole out
of records.mjs — no state, writer, status or IO authority moves here
and no sticky error leaves its original attempt. Imports only
canonical-json.mjs, record-schema.mjs and the existing pure
`EXIT_CODES` from record-finalization.mjs; it imports no Records,
Store, IO, lifetime, Native or clock owner, and factory/callback
functions are validated but never copied, invoked or returned as
factual authority. Exact four exports:

- `captureRecorderInputs({workspace, manifest, verifyIdentity,
  verifyCleanup}) -> independently owned deeply frozen {workspace,
  manifest, phaseDirectory}` — moves the WHOLE current
  mandatory-callback type checks, workspace/manifest canonical
  copies + `assertRecord`, workspaceId equality, commonIdentity digest
  equality and phase-directory derivation, preserving the
  `RECORDER_CONFIG` messages and error order. Records retains the
  actual callbacks and state.
- `captureFinalizationRequest({intent, checks, prerequisites,
  expectedSelfTest}) -> independently owned deeply frozen {request,
  claims, parents, nested}` — moves the WHOLE canonical
  copy-before-await block with the same `[]`/`[]`/`null` defaults and
  error channel; no final intent/schema/status validation moves before
  the original state guards.
- `validateFinalizationIntent(request) -> void` — moves the WHOLE
  existing allowed-intent status/`EXIT_CODES` guard unchanged; records
  calls it INSIDE the original lifecycle-admitted A after the
  manifest/running/once guards, preserving sticky/correctable
  priority.
- `validateRunningInput(runningSnapshot, {workspaceId, runId, phase,
  commonIdentitySha256}) -> void` — moves the WHOLE existing
  `assertRecord` running and manifest-equality guard; records still
  canonical-copies BEFORE attempt, validates INSIDE attempt after the
  original state guards and retains the actual write/`state.running`
  assignment — no sticky error moves outside its original attempt.

DAG: records.mjs -> record-inputs.mjs -> canonical-json.mjs /
record-schema.mjs / record-finalization.mjs only — no backedge to
records.mjs. Joins the functional-runtime input union; never a test or
BackendPython helper.

## record-bookkeeping.mjs (exists — R4 declaration dated)

Corrective 59 (declared before file creation/use — the file is
currently ABSENT and nothing below is implemented or verified green):
the whole optional bookkeeping-observer owner extracted from
records.mjs. It owns the WHOLE corrective-58 descriptive responsibility
— actual bound-clock capture/settlement sampling, safe arbitrary-error
description, five-field payload construction, at-most-once truthful
notification and the existing best-effort `process.emitWarning`
fallback — with the 58 semantic binding unchanged; this corrective adds
only the physical module owner. records.mjs retains sole canonical
writer/state/status/close authority and call placement; the diagnostic
helper cannot certify settlement or decide a phase result. It imports
no Records, Store, Lifecycle, Evidence, Native or filesystem owner —
module-local pure guard/format/freezing functions plus the EXISTING
global `process.emitWarning` suffice, with no package dependency or
import cycle, no backedge, and no required IO, hold, debt, queue,
timer, status, wire, eligibility or native authority. SOLE export
`createBookkeepingObserver({runId, phase, nowMonoMs,
onBookkeepingSettlement}) -> frozen {observeCaptureClosed,
notifySettled}` — pure construction that validates and captures the
FOUR trusted fixed values (the already captured manifest `runId`/
`phase` strings, the SAME real bound `nowMonoMs` clock function and the
optional `onBookkeepingSettlement` function) without invoking the clock
or callback, scheduling anything or performing IO. records.mjs
constructs it ONLY when the optional observer exists after
`bindRuntime` validates the genuine inherited lifetime/clock/use state;
with the observer absent it keeps null and performs NO new descriptive
clock/format/notification work — never a no-op registrar, and it
receives no lifetime/`retainActual`/Store capability.

- `observeCaptureClosed() -> void`, NO arguments: called by
  records.mjs ONLY after body A really closed ALL evidence handles and
  finished `finishClosedEvidence`; reads the actual bound clock at call
  time and retains a finite observed time — never a deadline,
  fabricated zero, caller timestamp or new origin. A clock read/format
  failure invokes the SAME best-effort 58 warning, marks the
  descriptive report unavailable and skips the incomplete payload
  later; it never throws into or delays A, changes captured eligibility
  or creates a physical receipt, and does NOT notify the observer on a
  successful A — B is still required.
- `notifySettled({hasPrimary, primary}) -> void`: records.mjs supplies
  this trusted private tuple ONLY after actual own-safe B settlement,
  or a failed A once every acquired actual handle has genuinely closed
  — `hasPrimary` is the actual explicit presence flag and `primary` is
  the EXACT original arbitrary value, never a caller/driver proof
  field, and the input is not reusable as a settlement certificate.
  At most one notification per finalization attempt; unknown debt
  means NO notify. It first reads the true bookkeeping-settled clock,
  then constructs the independently owned deeply frozen EXACT
  corrective-58 five-key payload `{runId, phase, captureClosedMonoMs,
  bookkeepingSettledMonoMs, primaryError}` — `captureClosedMonoMs`
  stays null on a failed A; `primaryError` is null iff `hasPrimary` is
  false, else the separately frozen `{code: string|null, detail:
  string<=400}` description where literal `null`/`undefined` thrown
  faults stay literal diagnostic strings and property access/String
  conversion are guarded with the fixed type fallback — never cloning
  or mutating the original error, and no Evidence raw verifier private
  error is synthesized into `primaryError`. A formatting/clock failure
  warns and skips the incomplete payload without synthesizing a
  timestamp.

The callback is invoked through the exact corrective-58 detached
Promise continuation with its rejection handler installed BEFORE
invocation; it is never awaited or retained inside A, B, the Store
transaction, required actual IO or the shared lifetime, and a
rejected/throwing/hanging callback cannot retract or delay the
authoritative completed result. The sole diagnostic stays the ONE
best-effort existing `process.emitWarning` — code
`TINYAZ_BOOKKEEPING_OBSERVER`, type `TinyazBookkeepingObserverWarning`,
message `Tinyaz bookkeeping observer failed: ` plus the bounded safe
detail of at most 400 characters — with emission itself guarded; no
global warning handler, sink, getter, new report field or diagnostics
channel. Expected injected-warning tests stay explicit; a healthy run
normally emits none. The actual verified Store `{completionRef,
verified}` and the original primary stay authority — no postseal
required IO, containment, status, fault or eligibility rewrite.

DAG: records.mjs -> record-bookkeeping.mjs only — one-way, zero back
imports, alongside the existing Records -> Inputs/Lifecycle/Evidence/
Finalization/Store/Graph edges. Joins the functional-runtime input
union; never a test or BackendPython helper.

## record-finalizer.mjs (exists — R4 declaration dated)

Corrective 60 (declared before file creation/use — the file is
currently ABSENT and nothing below is implemented or verified green):
the whole private recorder finalization/binding owner extracted from
records.mjs. It owns the WHOLE expanded private A/B finalization
pipeline, the WHOLE four `bindRuntime`/`closeEvidenceBeforeCutoff`/
`sealClosedEvidence`/`finalize` methods and the WHOLE private
binding/caches comment+variables — all moved whole with comments from
the actual expanded537 records.mjs (the intentionally preserved
KNOWN_OVERSIZE source), never a compressed variant, with no
assertion/comment/guard shortening or blank/ternary packing.
records.mjs keeps sole canonical writer/state/status/close authority
and call placement — all ordinary Recorder methods, the lifecycle
creation, `readState`/`latchFailure`/admission closures, the actual
`closeWriters`, `state`, `headFields`, `owner`/`io` creation and the
genuine `phaseRecorderLifetime` WeakMap; the helper owns only
`bound`/observer/`pending`/`sealPromise` and the private actual-A
`captureSettled` flag — never caller proof booleans, an alternate seal
intent, borrowed facts or a second owner. SOLE export
`createRecorderFinalizer({store, workspace, manifest, phaseDirectory,
state, lifecycle, closeWriters, headFields, verifyIdentity,
verifyCleanup, owner, io}) -> frozen {bindRuntime,
closeEvidenceBeforeCutoff, sealClosedEvidence, finalize}` — EXACT12
trusted constructor keys and EXACT4 returned methods, no other export
or result. Pure construction captures the SAME trusted same-instance
references and defines closures only — no IO, callback invocation,
clock read, timer, default owner, second lifecycle/queue, proof or new
status at construction — and never re-validates or re-copies trusted
context into a new error-priority position; helper-local identical
`fail`/`need` error construction preserves the exact existing
codes/messages and async rejection channels. records.mjs creates ONE
instance only after its real lifecycle/headFields exist, passing the
owned `ws`/`mf` snapshots, the original `phaseDirectory`, the SAME
actual `state`/`lifecycle`/`closeWriters`/`headFields`, the original
mandatory `verifyIdentity`/`verifyCleanup` callbacks, the genuine
`artifactStoreLifetime(store)` owner and the SAME frozen private `io`,
then delegates the four facade members by IDENTICAL function
references — no async wrappers, aliases or extra public surface; the
public Recorder roster, `phaseRecorderLifetime` WeakMap semantics and
the direct `lifecycle.closeIncompleteEvidence` identity stay
unchanged.

- `bindRuntime({lifetime, nowMonoMs, onBookkeepingSettlement}) ->
  void`: binds once BEFORE FIRST RECORDER USE — exact brand/identity
  plus a valid clock/optional descriptive callback checked before
  mutation; an invalid/repeated/late binding cannot replace a valid
  tuple. The moved body is the SAME expanded implementation, comments
  included.
- `closeEvidenceBeforeCutoff(request, {deadlineMonoMs})` and
  `sealClosedEvidence() -> {completionRef, verified}`: the SAME real
  held timed pipeline — the nonadmitted captureEvidenceA wrapper
  awaits the SAME real `lifecycle.attempt` A and sets the private
  `captureSettled` flag ONLY after that attempt actually fulfilled and
  its raw lifecycle finally settled the original receipt (a failed A
  never sets it; no bounded promise/race is proof), then B checks
  bound/once/actual `captureSettled`/`pending`/sticky/state BEFORE
  assigning `sealPromise` or invoking the privileged continuation —
  a premature call rejects caller-correctable `RECORDER_STATE` without
  consuming a ticket, caching a rejected seal promise or poisoning the
  later genuine legal call. A body order, the mandatory callbacks, the
  late fence, the other-body drain, ALL actual sink closes before
  `finishClosedEvidence`, the actual inventory with the SAME `io`, the
  exact-11 `buildFinalFromClosedFacts` aggregation, the final write,
  the fresh inventory, completion with the initial parents/nested and
  the genuine Store prepare/Graph/consume/publish order plus
  `verified.final` authority stay at their current positions — no
  postseal required IO or reclassification, no global self-wait, no
  public fact/status/proof field or new duration.
- `finalize({intent, checks, prerequisites, expectedSelfTest})`: the
  SAME legacy path — a bound call rejects caller-correctable
  `RECORDER_STATE` before callback/IO and never poisons the timed
  path; the unbound legacy outer stays nonadmitted and awaits the
  SAME A before B with the SAME true lifetime/held publication and no
  outer spanning attempt or self-wait, returning only `completionRef`.

DAG: records.mjs -> record-finalizer.mjs -> canonical-json.mjs /
artifact-store.mjs (`phaseArtifactRefs`) / record-finalization.mjs
(`buildCompletion`, `buildFinalFromClosedFacts`) / record-inputs.mjs
(`captureFinalizationRequest`, `validateFinalizationIntent`) /
record-evidence.mjs (`createEvidenceCapture`) / record-bookkeeping.mjs
(`createBookkeepingObserver`) / receipt-verification.mjs
(`verifyPreparedReceiptGraph`) — seven imports only, NEVER records.mjs,
a lifecycle constructor, watchdog, process/native, fixture/test or a
second lifetime, zero back imports. records.mjs imports the private
factory and drops ONLY the now-unused moved imports. Joins the
functional-runtime input union; never a test or BackendPython helper.
Capacity: projected roughly 310-345 lines after readable imports/
factory/return plus the actual-settlement guard, with Records near 310
— measured-block forecasts, not cap acceptance; both target <=375 and
MUST actually stay under 400, else the expanded source is preserved
and KNOWN_OVERSIZE reported immediately with no shaving.

## artifact-completion.mjs (exists — R4 declaration dated)

Corrective 55 (declared before creation/use — the file is currently
ABSENT and nothing below is implemented or verified green): the sole
Store-completion transaction owner extracted from artifact-store.mjs.
SOLE private export `createStoreCompletionMethods(completionContext)` —
a pure trusted factory that validates and captures its frozen trusted
context at construction, invokes no callback/IO/clock/timer/queue/
hold/transaction, and returns a frozen `{prepareCompletion,
publishPreparedCompletion, containPreparedCompletion}` trio that the
Store constructs ONCE and attaches to the SAME genuine frozen store
(the existing owner WeakMap/`artifactStoreLifetime` getter stays the
sole identity association). Exact approved signatures:
`prepareCompletion({phaseDirectory, bytes}) ->
Promise<PreparedCompletion>`, `publishPreparedCompletion(prepared,
preparedVerification) -> Promise<{completionRef, verified}>` and
`containPreparedCompletion(prepared, cause) ->
Promise<FailedPublication>`.

`completionContext` is EXACTLY 18 fields `{root, enqueue, usable,
checkSeal, reserve, release, reconcile, postAccounting, immutable,
activePaths, markIoFault, retainActual, storeOwner, io,
retainFinalizerUntil, completionByPhase, completionByPrepared,
sealPhaseCore}` — the first twelve borrow the current Store
closures/Sets/function identities; the last six are Store-owned
private bindings: ONE minted frozen `storeOwner` token, the Store's
EXACT frozen `io` object (registrar/finalizer are the SAME
constructor-owner functions), the SAME `retainFinalizerUntil`, ONE
strong phase Map `completionByPhase`, ONE prepared WeakMap
`completionByPrepared`, and `sealPhaseCore`, the WHOLE existing
`sealPhase` body factored into a synchronous lexical core. Public
`sealPhase` still enqueues that core; a successful publication invokes
it DIRECTLY under the already-owned queue, never awaiting its own
enqueued public method — normRel, every active-path check and the same
sealedDirs semantics are preserved. No entire state object, second
queue, ledger, clock, second owner, global `whenSettled`, caller proof
flag or verifier callback; entries retain the original
phase/capability/reservation/first arbitrary fault/claims/safe
deferred and file stages stay Parent-owned.

Each public method enqueues ONCE; internal containment calls the
parent directly under the same queue and a preparation/publication
catch never awaits the public `containPreparedCompletion` queued
behind itself. Caller bytes are copied and the phase validated
synchronously before the first await; a duplicate live phase rejects.
A valid transaction installs its strong phase entry and arms the SAME
`retainFinalizerUntil(safeSettlement)` BEFORE any
reserve/footprint/preparation/verification effect — a registration
failure issues no IO — and the ONE actual owner hold runs continuously
until genuine sealed success or fully contained/accounted failure,
never a transient zero.

Preparation checks usable/seal plus all canonical active/immutable
guards, claims the fixed canonical path, reserves the FULL intended
bytes in the final lane, then calls parent `prepareCompletionFile`
with the exact owner/root/phase/owned bytes/io. The returned
capability associates immediately; the reconcile-attempt latch arms
BEFORE the single `reconcile(res)` that moves
reservation/unobserved/finalBytes ahead of its own await even when it
rejects. Parent `readPreparedCompletion` then pins the actual temp
ref/bigint fileId and genuinely closes before the queue returns — no
guessed temp name/metadata and no bypass of parent sticky-primary
guards. A pre-capability prepare rejection retains the FIRST arbitrary
fault and recovers ONLY through the pure
`recoverPreparedCompletion(SAME storeOwner, normalized phase)`; a
null/foreign/unknown recovery is HELD/UNPROVEN, never no-creation
proof or writeOnce fallback, then drives direct containment, and the
required failure stays the original operation rejection after complete
safe containment.

Publication applies the Store association/terminal/foreign guards,
consumes the genuine pair token ONCE inside the queue through
`consumePreparedVerification`, runs parent `readPreparedCompletion`
and rechecks current root/phase/canonical+temp refs/full bigint
fileId/io against the pinned consumed association and entry before the
unchanged `publishCompletionFile(cap, storeOwner)`; parent
positive-primary guards forbid earlier-fault revival and no extra
rename reservation is taken. `postAccounting` then a FRESH real
`verifyReceiptGraph({workspaceRoot: root, completionRef,
expectedIdentity: association.expectedIdentity}, new Map(), io)` —
full inventory/input/check/selftest/closure/real-close stays
mandatory; ordinary VerifiedEvidence is EXACTLY `{workspaceId, runId,
phase, commonIdentity, completionRef, completion, final, manifest,
running, closure}` and only `verified.final` feeds status/outcomes;
consume returns EXACTLY frozen `{workspaceRoot, phaseDirectory,
canonicalRef, temporaryRef, fileId, expectedIdentity}` with private
bigint `fileId`, never JSON-cloned. Pure owner/stage/other-active-path
preflight runs BEFORE the final synchronous mutation batch; only after
the genuine readback are this transaction's claims removed,
`sealPhaseCore` invoked, the canonical ref marked immutable, the
parent marked sealed and the safe deferred resolved — no required
fallible await/IO after the first semantic seal mutation, and
immutable success is never retracted or reclassified.

Containment calls parent `retainFailedCompletion` under the SAME
capability/owner, restoring matching canonical bytes to the EXACT
original temp without overwriting an unknown file — actual original
and reader closure, post-close identity/size/mtimeNs, required sync
and fresh canonical absence; lost/replaced/unknown/acquisition/close
failures stay held. Failed bytes are never deleted and no intended ref
is invented. The actual retained failed temp is protected through the
existing Store immutable registry from the ACTUAL returned owned path
(never caller data) with failure-safe claims kept while unproven, so
generic writeOnce/deleteEphemeral/append/replace cannot erase failed
evidence once those claims clear; sealed/contained tombstones plus the
first fault block duplicates/revival and containment is idempotent
only for the SAME already-contained capability. The FULL original
reservation stays conservative on unknown/partial — a null failed ref
is never zero — and only actual original containment plus required
fresh whole-workspace accounting may reconcile that SAME reservation
AT MOST ONCE, latched before await; never release/reduce/re-reserve
created or unknown bytes, double reconcile after a rejection, undo
committed growth/finalBytes or clear sticky faults; unknown
ownership/accounting/readback/closure stays HELD with no false safe
exit and the conservative admission charge is never reported as the
measured footprint. Only real sealed success or complete actual
containment/accounting/real-effect settlement resolves the safe
deferred — no global `whenSettled` inside the transaction.

Corrective 57 (declared before use — the new leaf is currently
ABSENT, not yet implemented or verified green): the WHOLE
first-primary retention, the containCore body and the
failure-recovery/held-safe path described above delegate to
[artifact-completion-failure.mjs](#artifact-completion-failuremjs-exists--r4-declaration-dated)
`createCompletionFailureMethods({storeOwner, postAccounting, reconcile,
immutable, activePaths, completionByPrepared, markIoFault}) -> frozen
{retainPrimary, containCore, failAfterContainment}`, instantiated ONCE
over seven borrowed bindings from the SAME 18-field context. The
sealed guard runs BEFORE any cause/registry mutation, genuine
same-capability contained results keep their idempotence, each entry's
own `safeSettlement` is awaited BEFORE the required operation rejects,
actual required IO still latches the SAME shared `markIoFault` while
owned cleanup runs despite sticky `usable`, and
`entry.requiredIoStarted` is set privately before the actual required
call — no public enqueue/self-wait, global `whenSettled`, second
owner, queue, clock, ledger or backedge. This facade keeps the same
trio, context, seal/phase authority and entry ownership.

Static imports only: `verifyReceiptGraph`/`consumePreparedVerification`
from receipt-verification.mjs, the six parent exports from
completion-publication.mjs, the ONE `createCompletionFailureMethods`
factory from artifact-completion-failure.mjs (corrective 57) and
actual pure byte/path primitives; the Recorder still invokes the REAL
`verifyPreparedReceiptGraph` itself — no injected verifier callback,
arbitrary bytes/read override or proof boolean. DAG: Store ->
ArtifactCompletion -> Graph (receipt-verification) -> Parent
(completion-publication)/ReceiptFiles/ArtifactFiles plus
ArtifactCompletion -> Parent/ArtifactFiles and ArtifactCompletion ->
CompletionFailure -> Parent/ArtifactFiles; ArtifactFiles -> OwnedFile
([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated),
pure one-way factory composition, nothing imported back); Parent ->
Observation -> PreparedRead -> ArtifactFiles -> OwnedFile, and never
helper/leaf -> Store/Recorder/Prerequisites/Watchdog/Native with no
back-cycle. Functional runtime input.

## artifact-owned-file.mjs (exists — R4 declaration dated)

Corrective 57 (declared before creation/use — the file is currently
ABSENT and nothing below is implemented or verified green): the sole
OwnedFile owner extracted from artifact-files.mjs. SOLE private export
`createOwnedFileOperations({issueActual, storeFail}) -> frozen
{openActual, ownedFileCloseReceipt}` — a pure trusted factory that
validates and captures its TWO trusted ArtifactFiles function bindings
at construction, invokes no callback/IO/clock/queue/timer/hold, and
creates no ledger or mutable dependency. ArtifactFiles instantiates it
ONCE at module composition and re-exports the IDENTICAL returned
function references under its existing `openActual`/
`ownedFileCloseReceipt` names — no extra facade keys, resolver,
registry, drain, debug hook or caller proof option. Caller signatures
stay exact: `openActual(retainActual, issueOpenThunk) ->
Promise<OwnedFile>` and `ownedFileCloseReceipt(genuineOwnedFile) ->
Promise<void>`; the OwnedFile method roster stays exactly
`stat`/`read`/`write`/`sync`/`close`.

- WHOLE move: the existing `isFileHandle` brand check, the genuine
  OwnedFile identity/receipt WeakMap, the ONE strong raw-resource
  `{handle, owned}` Set, `openActual` and `ownedFileCloseReceipt` plus
  their full explanatory comments move into this factory. ArtifactFiles
  retains the existing `issueActual` raw-effect owner, `storeFail` and
  all confined/durable/hash/inventory policy. The leaf imports NO
  ArtifactFiles/Store/Graph/Records/Lifetime — the trusted
  two-function injection avoids a backedge — and shares ONE existing
  `closeDebt` per actual acquisition under the same owner
  `retainActual` and the same WeakMap/strong Set: never another
  ledger, counter, clock, queue, owner or status authority.
- Arming/pinning order stays: registration arming BEFORE open
  issuance (a definite pre-issuance registration failure starts no
  actual open and preserves its original error/never-created
  completion on the immediate old channel), each returned raw
  resource pinned BEFORE shape validation and the minted wrapper
  pinned in the SAME entry, an entry removed ONLY on a genuine
  raw-close success with the same `settleClose`, and the original
  arbitrary first-close fault retained separately from physical
  closure — a later real close may settle the receipt but never
  clears the fault. Where a pending attempt entry is pinned before
  issue, attempt metadata (which a definite no-resource path may
  retire) is distinct from the returned resource entry, which ONLY an
  actual raw-close success retires — no fake hold.
- Universal bounded close: every bound caller (the generic
  readOwned/hash/dirSync/writeAtomic/sink.close paths and the Parent
  readers/writer) already uses the same `OwnedFile.close`, so the
  compositional physical-settlement boundary is owned ONCE here. Each
  OwnedFile starts at most ONE cached actual-close flow, associated
  BEFORE its first raw issue or any reentrant callback, making at
  most TWO actual raw-close attempts TOTAL for the handle. A genuine
  raw-close success alone marks closed, removes the strong resource
  entry and fulfills the SAME prearmed `closeDebt`; after the bounded
  attempts the flow awaits the SAME existing `closeDebt` before
  exposing a required close failure — two failed/ambiguous attempts
  leave `close()` pending/referenced, a real physical settlement
  stays distinct from a raw-close failure and no timeout/error/GC
  substitutes closure. Repeated, concurrent and outer-retry calls
  join this same flow and issue NO extra raw closes; an
  already-physically-closed call with a retained fault rethrows the
  same first value after the actual receipt, and a
  proven-closed/no-error call stays idempotent success. This private
  MAX2 settlement refinement supersedes the earlier
  instant-reject-then-outer-retry wording, which stays preserved
  history rather than a current contradiction; the existing outer
  at-most-two loops in Parent/ReceiptFiles remain harmless and must
  not produce extra raw attempts. The legacy unbound direct raw
  FileHandle path keeps its old compatibility behavior and no
  fabricated receipt, the actual noResource pre-issue branch is
  unchanged, and no scoped registrar, aggregate/global `whenSettled`,
  new debt counter/owner/clock, caller switch, exported debug hook,
  ledger, resolver, status, extra retry time or grace is introduced —
  the cached flow is the method's ordinary actual operation promise.
- Issued-open debt join: for an ISSUED open rejection or an
  unadoptable returned resource, the unknown real-close debt is never
  converted into a completed leaf failure that Graph/Store could
  contain and settle safe — the leaf retains the original arbitrary
  cause plus raw-resource/attempt ownership and awaits the SAME
  acquisition's OWN prearmed `closeDebt` before exposing the required
  failure. The definite never-issued/pre-issuance branch stays
  distinct and immediate — no errno whitelist, timeout, GC, raw
  result or null handle is no-creation proof; unknown stays
  pending/referenced and strongly owned with no new retry authority.
- DAG: Store/Sinks/Parent/Observation/PreparedRead -> ArtifactFiles
  -> OwnedFile (this leaf) — a pure one-way factory composition edge;
  the leaf imports nothing back, and no Native/process/model/browser
  side effect exists at import or call. Functional runtime input.

## artifact-completion-failure.mjs (exists — R4 declaration dated)

Corrective 57 (declared before creation/use — the file is currently
ABSENT and nothing below is implemented or verified green): the sole
completion failure/containment owner extracted from
artifact-completion.mjs. SOLE private export
`createCompletionFailureMethods({storeOwner, postAccounting, reconcile,
immutable, activePaths, completionByPrepared, markIoFault}) -> frozen
{retainPrimary, containCore, failAfterContainment}` — a pure trusted
factory that validates and captures EXACTLY those seven borrowed
bindings from the SAME 18-field `completionContext` at construction
and invokes nothing: no IO/hold/callback, queue, clock, second owner
or ledger. artifact-completion.mjs instantiates it ONCE and delegates
the WHOLE original retainEntryPrimary + containCore +
failure-recovery/held-safe flow; the main factory's three-method API
and 18-field context stay UNCHANGED.

- `retainPrimary(entry, cause) -> void` retains the exact FIRST
  arbitrary value behind `entry.hasPrimary`, never clearing or
  overwriting it — a transaction-local mutation, never a phase
  outcome/status setter. The sealed guard runs BEFORE ANY
  cause/registry mutation: a source successful seal stays immutable
  and a postseal contain rejects without setting primary or touching
  registries. The FIRST arbitrary fault — null, undefined or
  nonextensible included — is preserved exactly.
- `containCore(entry, cause) -> Promise<FailedPublication>` runs
  DIRECTLY inside the already-owned queue — it never enqueues or
  calls the public containment method and never self-waits globally.
  It validates nonsealed state before mutation and returns the same
  actual result separately for a genuine same-capability
  already-contained call. It captures the first primary, runs the
  actual Parent retention/restore/closure/sync/fresh
  canonical-absence sequence restoring the EXACT owned failed temp
  with no overwrite plus real close/dirsync/fresh absence, protects
  the ACTUAL failed temp in the existing `immutable` registry BEFORE
  clearing ONLY its own claims, runs the required fresh
  `postAccounting`, latches the full-reservation `reconcile` AT MOST
  ONCE BEFORE the await with no refund/double charge, sets
  contained/result and resolves its own safe deferred only after
  genuine own-IO/close settlement and ALL required containment/accounting.
  The transaction safe receipt fulfills only after complete truthful
  containment or genuine immutable publication, never a close alone.
  Unknown contain/open/accounting/FD stays held/pending: no refund,
  release, deletion or forged FailedPublication, and cleanup never
  calls `usable` or skips because of a sticky fault.
- `failAfterContainment(entry, cause) -> Promise<never>` performs the
  WHOLE existing pure same-owner+phase recovery/associate path when
  `entry.prepared` is absent, preserving a null/foreign/thrown lookup
  as unknown rather than proof. With a genuine capability it calls
  `containCore` directly — never the public enqueued method. It
  retains the original primary independently (a failed containment
  marks held without clearing the fault), then awaits
  `entry.safeSettlement` — the SAME per-entry promise armed BEFORE
  the first prepare reserve/effect — BEFORE exposing the original
  operation rejection; while unknown, the method and its owning
  public operation stay pending/referenced. No global `whenSettled`,
  no enqueue-await self-cycle and no synthetic resolution on
  rejection: a complete truthful containment fulfills safe and then
  rejects the exact primary. The explicit public containment wrapper
  likewise cannot expose a required containment failure until its
  OWN safe receipt proves settlement; a successful same-cap
  contained result returns the genuine result, never an
  error-as-safe claim.
- Shared required-IO fault: an actual required Parent
  preparation/read/write/close/publish/dirsync and full Graph
  IO/readback failure invokes the SAME captured `markIoFault` so
  later generic/other-phase positives reject through the existing
  `usable` — the original primary channel and accounting-fault
  priority stay, with no sticky reset. Pure forged
  owner/entry/phase/token guards run BEFORE their corresponding
  fresh required IO so malformed arguments are not misclassified;
  `consumePreparedVerification` stays pure/once/inside-queue. The
  leaf observes the trusted private `entry.requiredIoStarted` flow
  field set by the main helper BEFORE the actual required
  Parent/Graph call (or a direct concrete call-site marking) — never
  a caller flag, status or proof capability — and a subsequent
  own-cleanup IO fault also latches required IO while still
  attempting actual containment; `usable` is never a cleanup gate,
  and reserve/accounting keeps its existing fault latch unweakened.
- Retained authority: ArtifactCompletion keeps its pure context
  guards, positive method input snapshots/queue entry, strong phase
  Map/prepared-WeakMap/entry creation, ALL actual Parent/Graph
  prepared/publish/verify ordering and the synchronous seal batch —
  the strong phase/prepared associations and the main seal batch
  authority are NOT moved. Each entry retains `safeSettlement` plus
  its resolver with no cached global zero; the leaf may mutate only
  the SAME entry's failed/contained fields and the SAME registries —
  never phase status, record bytes, `sealPhaseCore`, a new hold or
  the canonical writer — and the original entry stays strongly
  phase-owned forever including tombstones. Static imports only
  Parent `recoverPreparedCompletion`/`retainFailedCompletion` and
  pure ArtifactFiles `storeFail` — no import back to
  ArtifactCompletion/Store/Graph/Recorder/Lifetime.
- DAG: ArtifactCompletion -> CompletionFailure -> Parent
  (completion-publication)/ArtifactFiles -> OwnedFile
  ([artifact-owned-file.mjs](#artifact-owned-filemjs-exists--r4-declaration-dated))
  — never leaf -> ArtifactCompletion/Store/Graph/Recorder/Lifetime/
  Native and no back-cycle. Functional runtime input.

## test-fixtures.mjs (TEST-ONLY)

Shared builders imported only by the `*.test.mjs` suites: a closed
synthetic `CommonIdentity`, canonical record/receipt writers onto temporary
workspaces, controlled `readFootprint`/`monotonicNow`/`verifyCleanup`/
`verifyIdentity`/`probeIdentity` callbacks, and temp-directory helpers. It
performs no process, browser, model or network work, is never imported by
production modules, is never a native/setup authority and is excluded from
the functional-runtime input union. A synthetic fixture pass is never an
actual phase or cleanup pass.

## supervision-test-fixtures.mjs (TEST-ONLY)

Shared builders imported only by the `process-budget`/`process-transport`/
`process-backend`/`processes`/`process-lsof`/`supervisor-protocol-native`
suites. Named exports (documented before use, none self-tested):

- `fakeClock({startNs})`: a fully driven fake of the shared hrtime clock —
  `setTimeout`/`clearTimeout`/`setInterval`/`clearInterval`/`nowMonoNs`
  plus `nowMs()`, `advance(ms)`/`runDue()` and
  `jumpWithoutTimers(ms)`, which moves only the monotonic clock past a
  bound WITHOUT running the due callbacks so a delayed timeout
  callback and its actual-clock gate are observed separately; timers
  fire only when the test runs due work, so deadline/losing-timer
  assertions are exact. `pendingTimeouts()`/`liveIntervals()` expose
  losing-timer release counts.
- `fakeFile(content, extra)` / `fakeFileSystem(files)`: in-memory
  file entries with emitted `chunks` and `statSize`/`statError`/
  `streamError`/`noEnd`/`noClose`/`manual` overrides — `manual`
  withholds the automatic chunk/end/close drive so the test emits
  them itself — and the deterministic fake binding whose `stat`/
  `stream` record every initiation in order; a `streamError` may
  carry `after` to fail mid-stream.
- `fakeBinStream(chunks)`: a binary read fake that reuses and mutates
  the same chunk buffer after each `data` callback, so a digest
  implementation retaining mutable chunk references or hashing at
  EOF fails against the original ordered bytes. It does not by itself
  exclude a whole-buffer implementation; the backend-reader suite
  adds a scoped `Buffer.concat` observation on the actual binary
  `readFact` call for that bound.
- `fakeChild({pid})` / `fakePipe()`: `EventEmitter`-shaped referenced
  fakes of `ChildProcess`, `stdin` (a writable whose `write`/`end`/
  `drain`/`destroy` are observable), `stdout`/`stderr` (readable
  emitters where `data`/`end`/`error`/`close` and listener counts are
  observable) and the private fd-3 pipe. They emit only what the test
  drives; no `spawn`, `kill`, fd or reactor exists.
- `fakeFailedSpawnChild()`: a returned-but-failed `ChildProcess` — no
  pid, and `fail(e)` emits exactly the real error plus both pipe
  closes; no successful PID or exit receipt is ever invented.
- `collectorFixture({runId, pid, script})`: assembles one fake collector
  child plus the REAL `createProtocolValidator({runId})` bound to it —
  the s2c writer validates every outbound frame, the scripted c2s
  replies carry real identity/requestId/seq fields, and a deliberate
  duplicate poisons only that fixture's validator. Used with the real
  `createCollectorTransport`. `script.muteSample === true` withholds
  the automatic sample reply so a send stays genuinely pending until
  the test drives the real reply; `script.onSend(msg, api)` observes
  each written frame and may rebind scripted rows.
- `identity(pid)`/`identityKeyOf(id)`/`bsdRow(pid, ppid, pgid, uid)`/
  `sampleReply(...)`/`frame(msg)`: literal tuple/row/envelope builders
  matching the closed wire shapes; `identityKeyOf` derives the
  `pid:startSec:startUsec` key tests use to rebind scripted rows;
  `frame` encodes one canonical JSON line.

It performs no process, browser, model, libproc, lsof or network work,
holds no production state, never mutates production modules, and is
excluded from the functional-runtime input union and
`BackendIdentity.helpers`. Temporary files its consumers create are
removed in `finally`.

## process-monitor-test-fixtures.mjs (TEST-ONLY)

The monitor setup/bootstrap/start builders moved whole from
`processes.test.mjs`, imported only by the `processes` and
`process-lifecycle` suites. Named exports (documented before use):

- `monitorBootstrapScript()`: the fixed scripted collector rows the
  existing lifecycle cases share.
- `monitorReadyOptions()`: the ready-facts literal — the supervisor
  tuple bound to `identity(process.pid)` plus the selected Python
  `executable`/`prefix`/`basePrefix`/`version` facts bound to the
  frozen constants (no record-root fact).
- `createMonitorFixture({script={},wrapper,collectorChild=null,
  getDeadlineMonoMs=null}={})`: creates the temp record root with
  `realpathSync(mkdtempSync(...))` BEFORE helper paths are joined, so
  the canonical `/private/var` form is what confinement compares;
  binds the collector image to `realpathSync(PYTHON_EXECUTABLE)` and
  the supervisor image separately to `realpathSync(process.execPath)`;
  returns `{clock,fixture,monitor,dir,wrappers,spawns,cleanup,
  getDeadlineMonoMs,collectorPid,images}` where `spawns` records
  collector spawn attempts only (wrapper children are kept
  separately in `wrappers`), `collectorPid` is the fixed fake
  collector tuple's pid, `images` carries the pinned
  `{python,supervisor,lsof}` paths and `cleanup` removes the temp
  files in `finally`. `collectorChild` substitutes a deliberate fake
  child for failed-spawn lifetime cases.
- `startMonitorFixture(env)`: the shared boot+start helper — it
  forwards `getDeadlineMonoMs` into the start options when present,
  drives `fixture.ready(monitorReadyOptions())` and awaits the real
  start; it returns `undefined`.

It performs no process, libproc, lsof, browser, model or network work
and is excluded from the functional-runtime input union and
`BackendIdentity.helpers`.

## process-lsof-test-fixtures.mjs (TEST-ONLY)

The gate environment moved whole from `process-lsof.test.mjs`,
imported only by that suite:

- `lsofFixtureOut(s)`: the latin1 `Buffer` builder used for fake lsof
  stdout bytes.
- `createLsofGateFixture({script={},spawned=[]}={}) ->
  {clock,protocol,order,children,lq,mk}`: the REAL
  `createProtocolValidator`, a fake clock/spawn pushing
  `{file,args,opts,child}` records into `spawned` (raw children also
  land in `children`), ordered `register`/`signal`/`transition`
  spies, the real `createLsofQueries` and the borrowed-handle
  factory `mk(ms)`.
  Script fields: `registerError` throws from the register seam,
  `deferredRegister` is a caller-held promise awaited first (real
  exit/close facts can land before the issuance decision),
  `alwaysPre`/`transitions` drive the prove results, and
  `resolvePath` overrides the path resolver — it runs during path
  resolution BEFORE the deferred receipt is registered; the
  after-receipt pre-spawn expiry boundary is driven from the
  `retainActual` registrar callback, not this hook.
- `finishLsofFixture(child, stdout="", code=0)`: optional fake stdout
  then the real fake exit and BOTH output closes — never used to
  fabricate an exit in the failed-spawn case.

Pure fake construction on call only; no process, IO, scheduler or
validator authority, no permissive mock. Excluded from the
functional-runtime input union and `BackendIdentity.helpers`.

## process_macos_test_support.py (TEST-ONLY)

Fake ABI/library/ctypes-buffer/backend scaffolding moved whole from
`process-macos.test.py`: `load_sibling(name, filename)`,
`FakeFunction`, `FakeLibproc`, `bsd_struct(native, **kw)`,
`task_struct(native, rss)` and `make_backend(native, pidinfo=None,
listpids=None, pidpath=None)`. It contains no `unittest` cases,
performs no assert, real CDLL/libproc/`os.kill`/process or import
side effect, and is loaded by path under `python -I -B`; excluded
from the runtime union and `BackendIdentity.helpers`.

## process_macos_path_test_cases.py (TEST-ONLY)

`make_pid_path_cases(N, fake_be) -> type[unittest.TestCase]` (where
`N` is the already loaded native module and `fake_be` the synthetic
backend constructor)
holds the `PidPathTests` class moved whole plus the strict
malformed-UTF8, EPERM/EACCES and accepted-multibyte `pid_path` cases
against synthetic callables only. The main suite loads it by path,
injects the already loaded native module and its `fake_be`
constructor, and binds the returned class into its globals for
discovery under the same `python -I -B process-macos.test.py`
command — no third command, no `sys.path` fallback. Stdlib only;
excluded from the runtime union and `BackendIdentity.helpers`.

## watchdog-test-fixtures.mjs (TEST-ONLY)

Shared watchdog-suite fixture owner imported only by
`watchdog.test.mjs`, `watchdog-cleanup.test.mjs`,
`watchdog-records.test.mjs` and `watchdog-resource.test.mjs`; never
imported by production modules.
Exactly nine named exports — the three corrective-41 additions are
PRIVATE helper-to-helper bindings declared before use and the two
corrective-43 additions are whole existing primitives moved in
identically:

- `watchdogTestClock() -> {setTimeout, clearTimeout, setInterval,
  clearInterval, nowMonoMs, nowUtc, advance, runDue, jumpWithoutTimers,
  pendingTimeouts, liveIntervals}`: wraps the shared fake clock so
  `nowMonoMs` is the SAME `nowMs` monotonic hrtime-origin clock and
  `nowUtc` is the fixed UTC supplier; `advance`/`runDue`/
  `jumpWithoutTimers` keep the existing semantics over one owned timer
  hub. Never mixes `Date.now`/`performance.now`, a real interval, a
  caller phase duration or production clock mutation.
- `forkDriverFixture({runId, phase, commonIdentitySha256, pid = 6000,
  script = {}}) -> {forkImpl, child, calls, emit, exit, closeOut,
  closeErr, disconnect, respondSend, ready, written}`: a faithful
  `forkImpl(entry, args, {execPath, execArgv, cwd, stdio})` honoring the
  actual Node fork argument meanings (never forks/spawns/kills a real
  process), the fake `child` (pid, `send`, `disconnect`, EventEmitter
  `stdout`/`stderr`), `calls`/`written` observed fork args and submitted
  outbound envelopes, `emit(msg)` delivering ONE validated d2s
  `{ipcVersion:1, runId, seq, ...msg}` envelope through the REAL
  `createProtocolValidator`, and the separately driven settlement facts
  `exit(code, signal)`, `closeOut()`, `closeErr()`, `disconnect()` and
  `respondSend(valueOrError)` for send-callback control, plus `ready`
  resolving only once the channel has actually attached its IPC message
  listener so an `emit` is never delivered before a listener exists. A
  `send` returning `false` is one submitted message and is never
  replayed. Under truthful-evidence decision 37 the whole
  `forkDriverFixture` body moved to the
  `watchdog-child-test-fixtures.mjs` leaf and this owner re-exports the
  identical signature/returned roster unchanged.
- `cleanupMonitorFixture({runId, clock, supervisor, collector, rows,
  script = {}}) -> {monitor, calls}`: a controlled unit monitor matching
  the accepted constructor return roster — `_ready`, `_ownership`
  (`_ownedRows` over the supplied explicit rows), `lastObservation`,
  `probeIdentity`, `registerRoot`, `registerPort`, `signalOwned`,
  `queryListeners`, `stopAndReap` and `start` — backed only by explicit
  scripted tuple/probe/listener/observation/signal/handle facts;
  `calls` records the observed method-call ordering. UNSCRIPTED calls
  stay unavailable rather than manufacturing positive proof: probes
  default to `unavailable`, `signalOwned`/`queryListeners`/
  `stopAndReap` reject their `SIGNAL_UNAVAILABLE`/
  `LISTENERS_UNAVAILABLE`/`REAP_UNAVAILABLE` facts unless `signalResult`
  /`listeners`/`stopResult` script them, and an unscripted observation
  is `accountingValid:false`. Script fields include `knownRoots`,
  `registerRoot`, `probes`, `probe`, `probeError`, `probeDefault`,
  `listeners`, `queryError`, `onSignal`, `signalResult`, `signalError`,
  `observation`, `stopResult`, `stopError`, `startError`,
  `startPromise`, `startStall` and `readyExtra`. No unconditional
  identity for unknown roots, no protected-root signal, no
  raw/group/PID-only kill, no verified-proof boolean or alternate
  registry; ambiguous or failed scripted facts stay unavailable.
  Controlled unit evidence only — actual `createCleanupController`
  still calculates and retains proof. T3 additions landed
  (truthful-evidence decision 37): the fixture retains exact selected
  full-tuple+scope registry and `registeredPorts` facts, checks a fresh
  coherent tuple before every sent signal, keeps the parent
  supervisor/collector protected and the unknown unavailable, and
  `stopChannel` delegates to the actual scripted channel's `reap()` —
  a canned result alone can never prove physical exit/pipes.
- `watchdogRecordWorkspace({phase = "check", runId = "R1", clock,
  verifyCleanup, commonIdentity} = {}) -> Promise<{workspaceRoot, store,
  workspace, manifest, recorder, inputs, supervisor, monitor,
  monitorCalls, cleanup, readFile, removeWorkspace}>`:
  an OWNED temporary workspace built from the real `makeStore`/
  `fixtureWorkspace`/`writeWorkspaceOnce`/`writeFixtureInputs`/
  `fixtureManifest` factories and a REAL UNSTARTED `createPhaseRecorder`
  (never the already-started `makeRecorder`) bound to canonical
  realpath roots, the actual retained input bytes and the injected
  `verifyCleanup`/`verifyIdentity` callbacks — the default cleanup hook
  is the real `createCleanupController` (`cleanup`) over the scripted
  `monitor`, never an always-true stub; `readFile(rel)` and
  `removeWorkspace()` release/read bounded files before owned-temp
  deletion. No synthetic receipt, hash or ref generator.
  `watchdogRecordWorkspace` keeps its existing signature/body
  compatible — the corrective-41 owners below do not rewrite it.
- PRIVATE `assembleOwnedWatchdogCheckWorkspace({runId, supervisor,
  monitor, monitorCalls, cleanup, slots}) -> Promise<Env>`
  (corrective 41 — declared before use): the WHOLE real
  check-workspace acquisition moved whole from the run fixture — same
  genuine `makeStore`/`fixtureWorkspace(fixtureCommonIdentity)`/
  `writeWorkspaceOnce`/`writeFixtureInputs`/`fixtureManifest`/
  `createPhaseRecorder` constructors over a fixed `"check"` phase, no
  new generic phase or control API. `cleanup` is the SAME
  real-controller tap passed by the caller and `verifyCleanup`
  forwards its real verifier; `verifyIdentity` copies the actual
  workspace `commonIdentity`. `slots` is the SAME caller-owned
  preregistered mutable resource object — this owner fills ONLY
  `slots.root` immediately after acquisition/realpath and BEFORE the
  next writes, `slots.recorder` BEFORE subsequent use, and
  `slots.env` BEFORE return (driver/controller/global-owner/closed
  latch/run aggregates stay with the run fixture); the caller's
  preregistered aggregate owns the actual assembly before invocation,
  so no fresh global debt is registered after a closed fence and no
  clock/controller/queue or global dispose is added or called. No
  catch converts a factory error into success. `Env` retains every
  original `watchdogRecordWorkspace` key: `workspaceRoot`, `store`,
  `workspace`, `manifest`, `recorder`, `inputs`, `supervisor`,
  `monitor`, `monitorCalls`, `cleanup`, `readFile`,
  `removeWorkspace` (`ctl` may ride along but is not a production
  identity field).
- PRIVATE `closeOwnedWatchdogWorkspace(slots) -> Promise<void>`
  (corrective 41 — declared before use; corrective 67 admission
  semantics): the WHOLE actual recorder-close policy —
  `closeIncompleteEvidence` on the acquired recorder ONLY when the
  fixture never admitted a real run (`slots.runs` empty); an admitted
  run owns the real pipeline and the exact issued close promise is
  retained on `slots.incompletePromise` for the OUTER closure
  observation, never an obsolete sealed flag; a rejection stays the
  actual error, never an assumed settlement. Actual close work,
  never a caller-proof or status setter; no controller/driver/
  global-owner waits inside. The caller joins actual assembly/run/
  controller/callback/record/file bodies first and awaits this close
  before safe removal; a late recorder in the prearmed slots still
  closes after assembly settles and a missing/failed/unresolved close
  never authorizes deletion.
- PRIVATE `removeOwnedWatchdogWorkspace(slots) -> Promise<void> |
  undefined` (corrective 41 — declared before use): the WHOLE owned
  root removal — `env.removeWorkspace()` when the env was acquired,
  else the exact `slots.root`, else no owned root at all. Called only
  by the same per-test owner's remove stage after actual debt and
  physical closes and instrumentation restoration have succeeded —
  never an early finally delete, and no evidence/status authority.
- `row(pid, ppid, kind, workload, scope) -> row` (owned here under
  corrective 43 — the whole existing primitive moved from the run
  fixture, which re-exports the IDENTICAL function unchanged): the
  exact registry-row builder `{identity: identity(pid), ppid,
  pgid: pid, kind, workload, scopeRunId: scope}`.
- `OBS` (owned here under corrective 43 — identical run-fixture
  re-export): the literal controlled observation constant
  (`accountingValid:true`, `rssBytes:0`, `peakRssBytes:0`,
  `rssLimitExceeded:false`, `atMonoNs:"0"`).
- `instrumentRecorderFs(t, {workspaceRoot, phase, journal,
  faultGate = null, bodies}) -> frozen {join, restore}` (corrective
  67 — declared before use): the REAL-FS recorder interception
  owner installed AFTER genuine root/Recorder acquisition and before
  `w.run` while the Recorder stays the ORIGINAL object. Canonical
  phase `manifest.json`/`running.json` rename ADMISSION journals
  only (`watchdog-selftest` canonicalizes to `preflight/selftest`;
  never a seal marker), and the append-mode `events.jsonl`
  acquisition pins the SAME real FileHandle replacing ONLY its
  write — the wrapped write preregisters on `bodies` BEFORE
  inspection, an owned copy claims the FIRST complete canonical
  kind:fault at offset zero, the existing `faultGate.entered`
  latches at the ACTUAL entry, the still-held gate awaits, then the
  saved write runs on the original caller channel. Its own release
  unconditionally unlatches the fault gate, `join` waits admitted
  wrappers (never FD closure or global dispose), and `restore`
  returns saved descriptors only after join and the outer closure
  validation; registration precedes install.

All ten are controlled unit fixtures only: no process, Native, model,
browser, network or real-process work, no proof/status authority, and a
synthetic pass is never a Native or phase pass. Excluded from the
functional-runtime input union and `BackendIdentity.helpers`. The DAG
stays acyclic: this base owner imports only node primitives and the
existing production records/protocol plus the real base
`test-fixtures.mjs` constructors and the supervision fake-clock/child
re-export — it NEVER imports the run/drain/evidence/cleanup TEST
fixture owners and never calls a global dispose; the three private
helpers are inert at import and touch only `slots.root`/`recorder`/
`env` plus the actual run/incomplete-promise slots.

Current corrective 67: `watchdogTestClock` is whole-moved to the
`watchdog-drain-test-fixtures.mjs` leaf (which imports the SAME
`fakeClock` directly) and `cleanupMonitorFixture` plus its private
`FAIL`/`keyOf` are whole-moved to the
`watchdog-child-test-fixtures.mjs` leaf — both re-exported here as the
IDENTICAL objects so the nine-export roster, every importer and this
owner's own callsites stay unchanged; the `fakeClock` import drops.

Current corrective 70 (declared before use): the WHOLE expanded
`instrumentRecorderFs` plus its authored commentary moves to the child
leaf — re-exported here as the IDENTICAL function so every importer
and callsite keeps the same signature — and the WHOLE expanded
`observeRecorderFixtureClosure({recorder, workspaceRoot, phase,
commonIdentity, runs, incompleteClosure}) -> Promise<frozen
{state, verified}>` moves in from the records leaf with its needed
imports (`issueActual`, `phaseRecorderLifetime`, `loadRecord`,
`verifyReceipt`); the roster becomes eleven. The observer keeps the
exact six argument fields, the genuine same-owner `io` and fresh
`whenSettled`, and the actual `fsp.lstat` preopen where ONLY ENOENT
maps to missing — its `loadRecord` reads the canonical FILE
`${phaseDir}/completion.json`, never the phase directory, retaining
the returned actual `ref` on the same io. The "Exactly nine"/"All
ten" roster wording above is DATED superseded, preserved as history.

## watchdog-run-test-fixtures.mjs (TEST-ONLY)

The WHOLE `watchdog.test.mjs` per-run setup and temporal/driver-control
block, moved under the readable test-owner split; imported only by
`watchdog.test.mjs` and `watchdog-resource.test.mjs`, and
never by production modules. Exactly nine named
exports, importing only actual production factories/protocol, the
existing `watchdog-test-fixtures.mjs` owner, the
`watchdog-fs-test-fixtures.mjs` per-test owner bindings and the
`watchdog-drain-test-fixtures.mjs` leaf — which supplies
`yieldTurn`/`drain`/`createRunDrainBinding` as IDENTICAL re-exports
under corrective 40 and `heldGate` as the IDENTICAL re-export under
corrective 42 — while the `watchdog-child-test-fixtures.mjs` leaf
supplies `liveStart`/`closeFacts`/`FINISH` and the base owner supplies
`row`/`OBS` as IDENTICAL re-exports under corrective 43:

- `yieldTurn() -> Promise<void>`: one real event-loop turn for pending
  real filesystem/callback IO (owned by the drain leaf under
  corrective 40 — identical re-export).
- `heldGate() -> {held, promise, release}` (owned by the drain leaf
  under corrective 42 — identical re-export): an owned releasable
  gate; tests hold and then release real awaited dependencies
  (registration, monitor start, fault IO) deterministically, always
  releasing in teardown.
- `drain(clk, p, max = 60) -> Promise<T>`: owned by the drain leaf
  under corrective 40 and re-exported identically — adopts the
  ORIGINAL `p` outcome; input MUST be an actual original promise
  associated through the binding — an unassociated or
  `.finally`/`Promise.all` wrapper input rejects with
  `FIXTURE_CONFIG` BEFORE any clock advance — driving only unconsumed
  ORIGINAL stage bounds with real IO turns, never a whole-window jump
  past an ORIGINAL bound and no blanket 500 ms-per-pending fallback.
- `row(pid, ppid, kind, workload, scope) -> row` (owned by the base
  `watchdog-test-fixtures.mjs` owner under corrective 43 — identical
  re-export): the exact registry-row builder — a registry row with a
  real `identity(pid)` tuple.
- `OBS` (owned by the base owner under corrective 43 — identical
  re-export): the literal controlled observation constant
  (`accountingValid:true`, zero rss/peak, `rssLimitExceeded:false`,
  `atMonoNs:"0"`).
- `setupRun(t, {monitorScript = {}, rows = [], driverScript = {},
  faultGate = null} = {}) -> Promise<{clk, env, driver, monitor,
  monitorCalls, journal, w, run, dispose}>`: one per-run environment — fake `watchdogTestClock`, the
  scripted `cleanupMonitorFixture` monitor, the SAME real
  `createCleanupController` bound into the real recorder's
  `verifyCleanup` through the drain-leaf binding tap, an owned check
  workspace assembled through the base owner's declared
  `assembleOwnedWatchdogCheckWorkspace` private helper (corrective 41)
  whose removal is owned by the shared per-test teardown owner, the
  `forkDriverFixture` driver, an optional owned
  fault-IO gate bound by the REAL-FS instrument's held kind:fault
  events write (the gate's `entered` flag is set when a real fault
  write is actually invoked while held), `journal`
  the shared cross-owner order log (`manifest`, `monitor.start`,
  `running`, `fork`, `stop` send markers in actual call order), `monitor`
  the actual injected monitor object itself so tests can observe/wrap
  the real entry and read its projected samples without a production
  hook, `w`
  the ACTUAL `createWatchdog` result `w0` itself — never a
  shape-compatible `{run, requestStop}` replacement — teardown stops
  an unfinished run, releases the held gate, joins every admitted run,
  drives the remaining driver close facts and only then deletes the
  owned workspace. Corrective 39
  (declarations recorded before use) adds two additive keys while the
  returned `w` capability stays the SAME actual watchdog unchanged:
  `run()` — a one-shot start that returns the ORIGINAL raw `w.run()`
  Promise, tracked before invocation, rejecting before effects after
  disposal — never a shape-compatible replacement for `w`, and
  `dispose()` — the SAME per-test disposal Promise used by every
  caller; a shared-owner dispose (including another factory's)
  synchronously closes owned-run admission. Corrective 40
  (declarations recorded before use): `setupRun` binds through the
  imported drain-leaf binding/drain and assembly/resource registration
  lands through prearmed local slots or a raw-parent aggregate BEFORE
  workspace acquisition and writes — a release fired before refs fill
  keeps late-acquired env/recorder/driver genuinely owned and closed,
  or retained unproven, never silently skipped because refs were null
  during the one release pass; resource closure joins raw
  callback/record/controller/file debt separately from the public
  result, a fixture that admitted no run issues the actual
  incomplete close and retains its exact promise while an admitted
  run owns the real pipeline — classified by the registered
  `afterSettle` `observeRecorderFixtureClosure` — and a rejected
  promise never counts as descriptor close.
  Corrective 41 (declarations recorded before use): the WHOLE
  workspace acquisition, recorder-close and owned-root-removal block
  delegates to the base owner's three PRIVATE exports —
  `assembleOwnedWatchdogCheckWorkspace` builds the genuine env under
  the SAME preregistered caller slots, `closeOwnedWatchdogWorkspace`
  runs the actual unfinished-recorder close policy, and
  `removeOwnedWatchdogWorkspace` runs the owned root removal — while
  this owner keeps the driver/watchdog/controller ownership, the
  closed latch, the late-body aggregate and the raw run bindings. The
  returned roster, the actual `w0` and the owned `run()`/`dispose()`
  are unchanged. Corrective 43 (declarations recorded before use):
  the local prearmed actual-settlement array gains the raw
  assembly/factory receipt through the drain leaf's PRIVATE
  `issueFixtureBody` BEFORE the body is invoked, and that receipt is
  awaited — success OR failure — BEFORE final resource slots are read
  or late bodies close; the raw `finalizeImpl`/monitor-`start`/
  register bodies are also preregistered through the SAME aggregate
  BEFORE their invocations, independently of the bounded public
  `w.run`, only the genuine `finalize` fulfillment sets `sealed`, and
  the strict production close policy stays unchanged. Corrective 44
  (declarations recorded before use): the raw monitor-`start`/register
  bodies named above include the ACTUAL original
  `monitor.registerRoot` — captured and preregistered through the SAME
  prearmed local aggregate via `issueFixtureBody` BEFORE invocation,
  the identical original result/Promise returned and the original
  args/error/`this` binding preserved; no new authority, proof, queue
  or synthetic receipt, and `monitorCalls` still records only the
  original implementation's calls.
- PRIVATE `createRunDrainBinding({monitor, clock, runId,
  recordEvent = null}) -> {cleanup, trackRun, settleActual}`
  (owned by the drain leaf under corrective 40 — identical re-export;
  declared under corrective 39 before use): `cleanup` is a
  transparent nonasync `run` tap forwarding EXACTLY ONCE to the ONE
  real `createCleanupController` with the original argument q/result/
  error — its local actual-body receipt/slot is registered BEFORE
  `actual.run(q)` is invoked and observer bodies before their
  effects — while `verifyCleanup` forwards unchanged; the actual
  controller is `Object.freeze({run, verifyCleanup})` and is never
  mutated or replaced; the tap mints no proof, association or second
  controller. `trackRun(originalPromise) -> that SAME Promise`
  associates the raw `w.run` body with the observed real cleanup flow
  through a WeakMap keyed on the ORIGINAL promise; `drain` keeps its
  signature and consults only that entry — no wrapper and no
  Promise.all association. `settleActual() -> Promise<void>` joins the
  actual registered controller/required-settlement bodies AFTER
  issuance is closed, separately from the bounded public run outcome —
  a public rejection is never physical settlement, and there is no
  nested global dispose or self-wait. The original-stage clock policy
  is the literal 38-drain-binding advice over the SAME real
  controller: hold fake time while real start/register/FS/callback
  prerequisites settle, advance only unconsumed ORIGINAL +2000 then
  +4000 with the actual TERM event awaited before the next advance,
  ZERO advance at the spent end while real IO/required settlement
  drains — `max` is finite scheduler bookkeeping, never another time
  allowance.
- `liveStart(clk, driver) -> Promise<void>` (owned by the
  `watchdog-child-test-fixtures.mjs` leaf under corrective 43 —
  identical re-export): awaits `driver.ready`
  (actual channel IPC-listener attachment) BEFORE emitting hello, then
  one bounded advance plus real turns so `written[0]` is `start`.
- `closeFacts(driver): void` (owned by the child leaf under
  corrective 43 — identical re-export): the driver-side close facts —
  `closed` envelope, `exit(0)`, `closeOut()`, `closeErr()` — as
  SEPARATE settlement facts, never one merged close.
- `FINISH(requestedStatus, requestedExitCode) -> driverFinishFields`
  (owned by the child leaf under corrective 43 — identical re-export):
  the finish envelope fields (`type`, `requestedStatus`,
  `requestedExitCode`, `stopReason:null`, `checks`, `summary`,
  `analysisEligible`).

No `test()` declaration, no Native/phase/proof authority, no new
runtime export; a synthetic pass is never a Native or phase pass.
Excluded from the functional-runtime input union and
`BackendIdentity.helpers`. All nine named cases are retained across
the discovered owners: seven remain local in `watchdog.test.mjs`
(eight after the declared corrective-39 handshake-case move), the two
whole resource cases moved to `watchdog-resource.test.mjs` under
corrective 38, and the whole genuine selftest handshake
positive-control case moves to `watchdog.test.mjs` under corrective
39.

## watchdog-drain-test-fixtures.mjs (TEST-ONLY)

test-only leaf (declared under corrective 40 before creation —
created as readable source-only pending Sol verification): the WHOLE
drain/binding group moved out of
`watchdog-run-test-fixtures.mjs` as one cohesive whole so both owners
stay readable without packing — the ONE module-private
original-promise WeakMap, the real-controller stage tap, the
actual-body settlement join and the original-stage scheduler all live
here. Exactly seven already-declared exports — the fourth is the
`heldGate` temporal primitive moved whole under corrective 42, the
fifth the `advanceBy` explicit partial-advance helper moved whole from
the cleanup fixture under corrective 43, the sixth the PRIVATE
`issueFixtureBody` raw-body receipt helper declared under corrective
43, and the seventh the `drive` bound-drain helper moved whole from
the cleanup fixture under corrective 44:

- `createRunDrainBinding({monitor, clock, runId, recordEvent = null})
  -> {cleanup, trackRun, settleActual}`: the SAME real
  `Object.freeze({run, verifyCleanup})` `createCleanupController` per
  binding. `cleanup.run` is a transparent nonasync tap forwarding
  EXACTLY ONCE to the actual controller with the original argument
  q/result/error — its local actual-body receipt/slot is registered
  BEFORE `actual.run(q)` is invoked and observer bodies before their
  effects — `verifyCleanup` forwards unchanged, the frozen object is
  never mutated and no proof, association or second controller is
  minted. `trackRun(originalPromise)` returns that SAME Promise and
  associates the raw run/controller body in the ONE WeakMap keyed on
  the ORIGINAL promise — a `.finally`/`Promise.all` wrapper is never
  associated. `settleActual() -> Promise<void>` joins the actual
  registered controller/required-settlement/event-callback bodies
  AFTER issuance is closed, independently of the bounded public run
  outcome — a public rejection is never physical settlement — with no
  nested global dispose and no self-wait. Corrective 47 (declarations
  recorded before use): the transparent `recordEvent` delegation
  prearms the actual callback completion through the existing
  `issueFixtureBody(meta.bodies, () => recordEvent(arg))` — the
  existing graceful/TERM/KILL stage facts and deferred receipts are
  recorded FIRST, then the SAME original callback result/error is
  directly invoked, returned and rethrown with NO extra `.then`
  deferral masking a synchronous error; the neutral completion receipt
  is the actual body settlement success OR error, never physical close
  or proof, an original production callback error stays an actual
  accounting failure, and the one controller/WeakMap/q/clock stays
  unchanged.
- `drain(clk, p, max = 60) -> Promise`: adopts the ORIGINAL `p`
  outcome. Input MUST be an actual original promise associated through
  `trackRun` or the bound `cleanup.run` tap — an unassociated or
  wrapper input is rejected with `FIXTURE_CONFIG` BEFORE any clock
  advance; there is NO blanket 500 ms-per-pending-promise fallback.
  The original-stage policy is the literal 38-drain-binding advice
  over the SAME real controller: hold fake time while real
  start/register/FS/callback prerequisites settle, advance only the
  unconsumed ORIGINAL +2000 then +4000 boundaries with the actual TERM
  event awaited before the next advance, ZERO advance at/through the
  captured end while real IO/required settlement drains — `max` is
  finite scheduler bookkeeping, never another time allowance.
  Corrective 43 (declarations recorded before use): private deferred
  graceful/TERM/actual-settlement receipts replace turn-count polling
  — held fake time awaits the relevant ACTUAL stage receipt or the
  original `p` settlement, `max` counts scheduler state transitions
  rather than IO turns, and a later genuine stage still triggers the
  unconsumed ORIGINAL +2000/+4000 advances after more than `max`
  turns; no rewind, 500 ms fallback, new grace or poll timeout is
  added.
- `yieldTurn() -> Promise<void>`: one real `setImmediate` event-loop
  turn, unchanged.
- `advanceBy(clk, rounds = 6)` (owned here under corrective 43 — the
  whole existing helper moved from the cleanup fixture, which
  re-exports the IDENTICAL function unchanged): explicit partial
  fake-clock advance — each requested round advances 500 then yields
  two real event-loop turns; it is NOT a pending-promise drain and
  never waits for settlement.
- PRIVATE `issueFixtureBody(bodies, issueThunk) -> T` (declared under
  corrective 43 before use; helper-to-helper binding, never a test
  import): `bodies` is the SAME caller-owned prearmed local array of
  actual-settlement receipts — a deferred raw-completion receipt is
  pushed SYNCHRONOUSLY BEFORE `issueThunk` is invoked and the
  IDENTICAL direct result or original Promise is returned unchanged —
  a synchronous error rethrows and the original rejected Promise
  stays on the caller channel. The receipt fulfils only when the
  actual body settles — fulfilled OR rejected — and never invents
  descriptor close, a pass or a safe exit from a rejection. No new
  owner, clock, queue, global registration or status hook; the caller
  closes its untrusted issuance and joins the fresh dynamic array —
  including the actual factory parent — before reading final resource
  slots or running the real close, with no cached initial-zero
  promise, no array copied before late acquisitions, no global
  dispose and no self-wait; the parent factory body itself never
  awaits its own teardown/aggregate.
- `heldGate() -> {held, promise, release}` (owned here under
  corrective 42 — identical re-export through the run fixture): an
  owned releasable gate — `held` is `true` initially and stays a
  caller-controlled mutable field with no automatic change, `promise`
  is the same real deferred Promise, and `release` is its original
  resolver; tests hold and then release real awaited dependencies
  (registration, monitor start, fault IO) deterministically, always
  releasing in teardown. No new callback, clock, queue or status.
- `drive(clk, p, max = 40) -> Promise` (owned here under corrective 44
  — the WHOLE existing helper moved with its comment from the cleanup
  fixture, which re-exports the IDENTICAL function unchanged): drives
  an admitted ORIGINAL controller/run promise to settlement through
  the declared bound `drain` — the input must already be associated
  through the bound `cleanup.run` tap or `trackRun`, never a
  `.finally`/`Promise.all` wrapper, and an unassociated promise is
  rejected BEFORE any clock advance. The default `max` stays 40, not
  `drain`'s 60 — the same stage-only associated-original helper with
  no new behavior, clock or authority.

Imports ONLY node primitives plus the actual production
`watchdog-cleanup.mjs` controller — NEVER imports run/cleanup/evidence
test fixtures, declares no `test()` and has no top-level effects. DAG:
`watchdog-run-test-fixtures.mjs` -> this leaf -> production
`watchdog-cleanup.mjs`; `watchdog-cleanup-test-fixtures.mjs` ->
run/this leaf is permitted; no reverse edge or cycle.
`watchdog-run-test-fixtures.mjs` imports and re-exports the IDENTICAL
four binding/temporal function objects unchanged so existing consumers
keep the same owning import path, `watchdog-cleanup-test-fixtures.mjs`
re-exports `advanceBy` and `drive` identically, and `issueFixtureBody`
stays a
private helper-to-helper binding never re-exported to tests — no
wrapper, no second WeakMap or controller. No
Native/phase/proof authority and no runtime/wire/schema requirement
change. Excluded from the unchanged `*.test.mjs` discovery, the
functional-runtime input union and `BackendIdentity.helpers`.

Current corrective 67: the roster becomes eleven — the WHOLE
`watchdogTestClock` (this leaf imports the SAME `fakeClock` directly
from the supervision fixture) and the WHOLE
`liveStart`/`closeFacts`/`FINISH` primitives move in from the child
leaf. `closeFacts` alone carries the declared delta: EVERY still-queued
send callback releases BEFORE the fake exit + BOTH pipe closes, the
genuine facts still deliver and the retained first thrown value
rethrows. The child leaf re-exports the IDENTICAL objects.

Current corrective 69: `watchdogTestClock` moved further to the
`watchdog-driver-test-fixtures.mjs` leaf — this owner imports and
re-exports the IDENTICAL function, keeping the eleven-export roster
unchanged.

## watchdog-cleanup-test-fixtures.mjs (TEST-ONLY)

The WHOLE `watchdog-cleanup.test.mjs` setup/constants/driver block under
the same split; imported only by `watchdog-cleanup.test.mjs`. Exactly
thirteen named exports over the same real controller and the existing
scripted test-only monitor/clock:

- `row(pid, ppid, kind, workload, scope)`, `ROWS`, `SUP`, `COL`, `OBS`:
  the registry-row builder and the shared constant bindings.
- `args(clk, extra = {})`: the literal `cleanup.run` argument object
  (`phase`, `scope`, `scopeRunId`, `expectedFinalizer`, `supervisor`,
  `deadlineMonoMs`, trusted `cleanupStartMonoMs`, extras).
- `advanceBy(clk, rounds = 6)` (owned by the drain leaf under
  corrective 43 — identical re-export): fake-clock advance in ordered
  500 ms steps WITHOUT awaiting settlement — held/interrupted cases
  only.
- `drive(clk, p, max = 40)` (owned by the drain leaf under corrective
  44 — identical re-export): drives an admitted ORIGINAL
  controller/run promise through the declared bound `drain` — an
  unassociated or `.finally`/`Promise.all` input is rejected BEFORE
  any clock advance; the original stages advance only the unconsumed
  +2000 then +4000 boundaries and `max` is finite scheduler
  bookkeeping, never another time allowance.
- `fixture(rows, script = {}) -> {clk, monitor, calls, cc}`: one fake
  clock, one scripted `cleanupMonitorFixture`, the observed `calls`,
  and `cc` the REAL `createCleanupController` over both — the same
  controller the declared `createRunDrainBinding` tap observes
  (forwarding once, `verifyCleanup` unchanged, frozen object never
  mutated).

Additions landed (truthful-evidence decision 37): the fixture's
returned roster also carries `drivers` — a per-driver-row map binding
each actual selected fake channel — `makeArgs(extra = {})` builds the
same controller input with a genuine per-scope selected channel
settlement callback consuming the real driver reap (the global `args`
remains for the deliberate missing/invalid-callback cases), and
`closeDriverFacts(drivers)` emits the genuine exit/both-pipe-close
facts. Positive driver-settlement callbacks consume the actual
selected channel reap — never `async () => {}`. Corrective 39 keeps
`drivers`/`makeArgs` standalone and narrows `closeDriverFacts` to take
ONE observed driver. Corrective 43 (declarations recorded before use):
`drivers` and `closeDriverFacts` move whole to the child
`watchdog-child-test-fixtures.mjs` leaf and `advanceBy` moves whole to
the drain leaf — each re-exported here as the IDENTICAL function
object so the accepted import path and roster stay stable.

Corrective 39 (declarations recorded before use): this owner receives
the WHOLE `makeEvidenceWorkspace(t, {clock, parentRunId = "R1",
parentSupervisor})` implementation from
`watchdog-evidence-test-fixtures.mjs` — the same `{env,
commonIdentity, parentSupervisor, selftestRef, prerequisites,
parentManifest, dispose}` roster — which the evidence helper
re-exports unchanged so the accepted import path stays stable. This
owner may import run/fs/test-fixtures/records helpers but NEVER the
evidence helper. The factory builds genuine check then parity
retained-ancestor receipts through the existing `runReceiptPhase`
ONLY as graph preconditions (row shape `{phase, runId, completion:
actual.completionRef}` — parity receives the check row and the parent
preflight receives check+parity rows supplied identically to both the
manifest and the `createWatchdog` constructor), while the nested
selftest stays the REAL recorder bound to the actual
`createCleanupController.verifyCleanup` with caller checks `[]` and
the fresh `verifyInternalSelfTest` positive control. Registration
lands before makeStore/mkdtemp/workspace/input/record effects through
preregistered slots/a raw-parent aggregate armed BEFORE effect —
late-acquired recorders/sinks enter the already closed disposal and
are physically closed (a known successfully sealed recorder is not
sent to `closeIncompleteEvidence`); on assembly failure the original
error is retained and every acquired real FileHandle/sink is
safe-closed before rm — no fabricated close and no WeakMap alias.
Corrective 43 (declarations recorded before use): the factory's local
prearmed actual-settlement array gains the raw assembly/factory
receipt through the drain leaf's PRIVATE `issueFixtureBody` BEFORE
the body is invoked, and that receipt — success OR failure — is
awaited BEFORE final `stBinding`/`stRecorder` slots are read or the
real close runs, so settle can never observe a null-slot gap while
the raw factory is still acquiring.

No new registry/clock/queue/proof authority, process or top-level IO;
a synthetic pass is never a Native or phase pass. Excluded from the
functional-runtime input union and `BackendIdentity.helpers`. All
sixteen named cleanup cases are retained across the discovered owners
(fifteen local plus the moved withheld-driver-close case); no
helper-to-test import cycle exists.

Current corrective 67: `SUP`, `COL` and the one-fixture `fixture`
assembly are whole-moved to the child leaf and re-exported
identically, so the thirteen-name roster is unchanged. `makeArgs`
keeps the original public reap bound/error and — only after the
positive reaps settle — joins the SAME owned driver scopes via
`finishDriverActualScope` before the collector-last stage.

## watchdog-child-test-fixtures.mjs (TEST-ONLY)

Test-only leaf owner created under truthful-evidence decision 37
(repair-authored, pending Sol verification). It owns the WHOLE existing
`forkDriverFixture` implementation unchanged (no assertion lives inside
a helper), while `watchdog-test-fixtures.mjs` re-exports the identical
signature and returned roster so existing consumers never move.
Exactly seven named exports — `forkDriverFixture`,
`createObservedDriver` and the five whole primitives moved in under
corrective 43, each re-exported identically by its former owner:

- `createObservedDriver({clock, runId, pid, phase = "check",
  commonIdentitySha256}) -> {driver, channel, errors}`: `driver` is the
  exact `forkDriverFixture` result; `channel` is the REAL
  `createDriverChannel` over the actual `createProtocolValidator` with
  the injected `driver.forkImpl`, an absolute module/cwd/execPath and no
  inherited test flags; `errors` retains the actual `onError` values.
- `drivers(clk, specs = {}) -> Map` (owned here under corrective 43 —
  identical cleanup-fixture re-export): each spec name binds a REAL
  `createObservedDriver({clock, runId:"R1", pid: spec.pid,
  commonIdentitySha256:"0".repeat(64)})` channel so required
  driver-handle settlement reaps through actual retained exit + BOTH
  pipe closes; no invented closed/gone.
- `closeDriverFacts({driver})` (owned here under corrective 43 —
  identical cleanup-fixture re-export): emits exactly `driver.exit(0)`,
  `driver.closeOut()`, `driver.closeErr()` for ONE observed driver —
  no added disconnect/proof.
- `liveStart(clk, driver) -> Promise<void>` (owned here under
  corrective 43 — identical run-fixture re-export): awaits
  `driver.ready`, emits `{type:"hello"}`, advances 50, then two real
  `yieldTurn` turns imported from the drain leaf — NEVER from the run
  fixture.
- `closeFacts(driver): void` (owned here under corrective 43 —
  identical run-fixture re-export): the `closed` envelope
  (`gracefulCloseAttempted:true`, `expectedShutdowns:[]`) then actual
  `exit(0)` + BOTH close facts.
- `FINISH(requestedStatus, requestedExitCode) -> driverFinishFields`
  (owned here under corrective 43 — identical run-fixture
  re-export): the declarative finish-request factory (`type`,
  `requestedStatus`, `requestedExitCode`, `stopReason:null`, empty
  `checks`/`summary`, `analysisEligible` predicate) — an untrusted
  driver request, never a phase verdict or status setter.

Import DAG: this leaf imports only `node:events` plus the actual
driver/protocol owners and `yieldTurn` from the
`watchdog-drain-test-fixtures.mjs` leaf — NEVER the run/cleanup/
evidence TEST helpers; `watchdog-test-fixtures.mjs` imports and
re-exports it; `watchdog-evidence-test-fixtures.mjs` imports base plus
child and re-exports `gateFs` from the
`watchdog-fs-test-fixtures.mjs` leaf; the run/cleanup fixtures import
and re-export the moved primitives identically; tests import helpers
only — no helper-to-test import and no cycle. No real process, Native, model,
browser or proof authority. Excluded from the functional-runtime input
union and `BackendIdentity.helpers`.

Current corrective 67: the roster becomes eleven —
`liveStart`/`closeFacts`/`FINISH` whole-move to the drain leaf
(re-exported identically), the WHOLE `cleanupMonitorFixture` + private
`FAIL`/`keyOf` and the cleanup `fixture`/`SUP`/`COL` move in,
`createObservedDriver` gains REQUIRED trusted `retainActual` +
`actualScope` forwarded to the real channel constructor with additive
`actualScope` in its return, `drivers` takes the REQUIRED third
`{retainActual, parentScope = null}` context minting each entry's OWN
genuine scope BEFORE the constructor (nested runIds may differ under
the SAME registrar), and `forkDriverFixture` gains
`releaseSendCallbacks(error = null)` — permanently unlatching the held
queue and rethrowing the exact first thrown value after ALL callbacks
are attempted. `closeFacts`/`closeDriverFacts` release all queued
callbacks before the genuine exit + BOTH closes, and `fixture` returns
additive `lifetime` (ONE genuine default `createWatchdogLifetime`,
pure/lazy — no debt or timer at construction).

Current corrective 69: `forkDriverFixture`, `createObservedDriver` and
`drivers` plus all their private dependencies/comments moved to the
`watchdog-driver-test-fixtures.mjs` leaf — this owner imports and
re-exports the IDENTICAL three factories, keeping the eleven-export
roster and `closeDriverFacts` local.

Current corrective 70 (declared before use): the WHOLE expanded
`instrumentRecorderFs(t, {workspaceRoot, phase, journal,
faultGate = null, bodies}) -> frozen {join, restore}` plus ALL
authored commentary/guards moves in from the base — the roster becomes
twelve. Its error helper preserves the original `watchdog-test-fixture`
`FIXTURE_CONFIG` channel through a name-only local alias beside the
existing `FAIL(code, detail)`; the needed node `fsp`/`realpathSync`/
`path`/`fsConstants`, Drain `issueFixtureBody` and FS
`registerFixtureTeardown` imports are added — `Child -> FS/Drain`
stays acyclic and NEVER imports Base/Run/Evidence/RecordsFixture. The
real-FS/FileHandle interception is effectful only on explicit
invocation — real same-handle/write, never pure at call. Identified
correction accompanying the move: the local `join` owns EACH actual
write wrapper through the SAME local `wrap` receipt INSIDE the
caller's `issueFixtureBody` preregistration — no global body join and
no self-wait.

## watchdog-driver-test-fixtures.mjs (TEST-ONLY)

Created test-only leaf declared under corrective 69 before creation —
implemented as readable source-only pending Sol verification. The
WHOLE `forkDriverFixture`, `createObservedDriver` and
`drivers` factories plus all their private dependencies/comments move
from `watchdog-child-test-fixtures.mjs`, and the WHOLE original
23-line `watchdogTestClock` moves from
`watchdog-drain-test-fixtures.mjs` — exactly four exports with every
signature/option/return/behavior and the identical function identities
unchanged from accepted 67: `createObservedDriver` keeps the REQUIRED
trusted `retainActual` + `actualScope` binding forwarded to the real
channel constructor with additive `actualScope` in its return,
`drivers` keeps the REQUIRED third `{retainActual, parentScope = null}`
context minting each entry's OWN genuine scope before the constructor
under the SAME registrar (nested runIds may differ), and
`forkDriverFixture` keeps `releaseSendCallbacks` — every queued
callback attempted, the exact first thrown value retained and
rethrown. `watchdog-child-test-fixtures.mjs` imports and re-exports
the IDENTICAL three factories preserving its eleven-name roster (its
`closeDriverFacts` stays local over the drain facts), the drain leaf
imports and re-exports the IDENTICAL clock preserving its eleven-name
roster, and the base aliases are unchanged. Imports ONLY
`node:events`, `copyDeep` from protocol-values,
`createProtocolValidator` from supervisor-protocol, the production
driver/actual-scope owners and the supervision `fakeClock` — NEVER
the drain/child/base/run/evidence TEST owners; no back-edge, new
clock/owner/queue/proof or Native behavior. Import-time is pure while
the factory calls stay effectful controlled fakes carrying genuine
held debt. Excluded from the functional-runtime input union and
`BackendIdentity.helpers`; no `test()` declaration — same
`*.test.mjs` glob discovery unchanged.

## watchdog-evidence-test-fixtures.mjs (TEST-ONLY)

Test-only evidence/IO fixture owner created under truthful-evidence
decision 37 (repair-authored, pending Sol verification); the literal37
factory signatures below are restored under corrective 38 — the interim
implementation-shaped signatures were drift, never approved APIs. All
factories explicit, no top-level IO, process, timer or proof authority:

- `makeEvidenceWorkspace(t, {clock, parentRunId = "R1",
  parentSupervisor}) -> Promise<{env, commonIdentity, parentSupervisor,
  selftestRef, prerequisites, parentManifest, dispose}>`: the WHOLE
  implementation is delegated to the `watchdog-cleanup-test-fixtures.mjs`
  owner under corrective 39 (declarations recorded before use) and
  re-exported here unchanged so the accepted import path stays stable —
  one realpath temp workspace, real store/records/retained tiny inputs
  and genuine `ArtifactRef`s. `env` passed to the existing
  `runReceiptPhase` carries the ACTUAL store, workspaceRoot, ws and
  inputs; genuine check then parity retained-ancestor receipts are
  built through `runReceiptPhase` ONLY as graph preconditions (row
  shape `{phase, runId, completion: actual.completionRef}` — parity
  receives the check row and the parent preflight receives
  check+parity rows supplied identically to both the manifest and the
  `createWatchdog` constructor) — explicitly synthetic library
  evidence, never claimed as phase evidence. The real selftest
  manifest owner is exactly
  `{phase:"preflight", runId:parentRunId, supervisor:parentSupervisor}`;
  its final is inconclusive/2/`HEARTBEAT_TIMEOUT` with scoredGames 0,
  unplannedFaultCount 0 and the four derived checks passed, produced by
  a REAL recorder plus the actual `createCleanupController.verifyCleanup`
  under coherent synthetic tuple/port/observation facts — never an
  always-true proof callback or the canned proof callback. The actual
  parent preflight manifest is built and returned UNWRITTEN — its write
  stays with the watchdog runtime, with no parent manifest/running
  write before the actual watchdog performs it. A fresh
  `verifyInternalSelfTest` positive control is validated with the whole
  CommonIdentity, the exact real ref/owner and the observed same-live
  parent before any negative case; a ProcessIdentity is never used as a
  CommonIdentity and `{ref, sha256}` is never fabricated. `dispose` is
  idempotent ordered closure delegated to the SAME per-test owner
  declared on `watchdog-fs-test-fixtures.mjs` below.
- `gateFs(t, {workspaceRoot, relativePath, operation})` is OWNED by the
  `watchdog-fs-test-fixtures.mjs` leaf and re-exported here unchanged
  so the accepted owning path stays stable; the leaf's per-test
  teardown functions and the corrective-39 `ownFixtureAttempt` helper
  are internal helper-to-helper bindings, never re-exported — only
  `makeEvidenceWorkspace` and `gateFs` are re-exported, and no
  WeakMap wrapper association is minted.
- `makePreflightRun(t, {evidence, clock, runInternalSelfTest,
  monitorScript = {}, driverScript = {}, rows = []}) -> Promise<{w, driver,
  monitor, monitorCalls, cleanup, journal, run, dispose}>`: assembles
  the actual `createWatchdog` for phase `"preflight"`, the real
  recorder/store and the SAME real cleanup verifier over the injected
  genuine fake fork driver, the exact preflight manifest/common
  identity/prerequisites and ONE fake hrtime clock. The trusted
  `runInternalSelfTest` default returns
  `{completionRef: evidence.selftestRef}`; a caller-supplied trusted
  callback passes through unchanged so both actual ordinary
  post-callback guards can be observed — an injected test callback
  must itself preregister its genuine body with `ownFixtureAttempt`
  before its effects — never a fabricated selftest and no
  unconditional abort before the selected post-await guard. The same
  genuine `prerequisites` rows are supplied identically to both the
  parent manifest and the `createWatchdog` constructor.
  `run` is a FUNCTION `run() -> Promise<Outcome>`: it starts actual
  `w.run()` exactly once, registers its actual body before invocation,
  retains the original caller outcome/error and is joined on dispose —
  construction never starts the runtime, and a call after disposal or
  a second start rejects before effects. The runtime writes its OWN
  parent manifest/running exactly once; no prewritten parent and no
  `stMonitor.monitor` dereference — the destructured monitor is the
  monitor. `dispose` delegates to the SAME per-test FSleaf owner:
  ownership is registered before effects, ALL controlled gates and
  genuine fake-child exit/BOTH-close facts are released first, only
  explicit original stages are driven, actual callbacks/bodies/IO and
  the run are joined, instrumentation is restored, genuine sinks are
  physically closed and only then is the owned workspace removed —
  release, an error or a timeout is never actual settlement and
  retained failures are never swallowed. Corrective 43 (declarations
  recorded before use): the same local prearmed aggregate preregisters
  the raw `finalizeImpl`/monitor-`start` bodies BEFORE their
  invocations — independently of the bounded public `w.run` — only
  the genuine `finalize` fulfillment marks the recorder sealed, and
  the strict production `RECORDER_STATE` close refusal is never
  weakened. Corrective 44 (declarations recorded before use): the
  ACTUAL original `monitor.registerRoot` is likewise captured and
  preregistered through the SAME prearmed local aggregate via
  `issueFixtureBody` BEFORE invocation — the identical original
  result/Promise returned and original args/error/`this` binding
  preserved, no new authority/proof/queue or synthetic receipt. Under
  corrective 67 the finalize/journal wrappers are removed — the
  Recorder passed in is the ORIGINAL object while the REAL-FS
  instrument owns the manifest/running admission journals and the
  `afterSettle` observer classifies genuine closure. No
  constructor-effect test
  ops, no Store/Recorder wrapper association, no public runtime hook,
  no fake Native operational flag and no actual Native.

Excluded from the functional-runtime input union and
`BackendIdentity.helpers`.

R4 GE producer TEST API (declared before use; source landed pending
verification): `makePreflightRun`'s existing options add ONLY optional
`rows=[]` passed verbatim to `cleanupMonitorFixture`; all existing
args/defaults/returned roster stay exact. The default `knownRoots`
6000->`identity(6000)` binds the ACTUAL configured fake child pid
6000, remains `monitorScript`-overridable, and arbitrary unknown roots
still reject; the debt caller supplies an explicit coherent
row/full-tuple/scope/liveSet KILL producer with no proof setter. The
actual earlier fault/`eventFileHandle` body is held and observed —
never a send-ack proxy.

Current corrective 67 (source pending verification): the Recorder
passed to `createWatchdog` is now the ORIGINAL `createPhaseRecorder`
result unchanged — the old spread `journaled`/`finalize`-wrapper and
its `sealed` flag are removed. The REAL-FS `instrumentRecorderFs`
owns the `manifest`/`running` rename-ADMISSION journals (the actual
`monitor.start`/`fork` journal taps remain), the no-run path issues
the genuine incomplete close and retains its exact promise on
`slots.incompletePromise`, and ONE registered `afterSettle`
`observeRecorderFixtureClosure` classifies the genuine
sealed/unfinished closure only after every actual body settles — a
competing `RECORDER_STATE` stays a diagnostic, never proof.

Current routine binding: `makePreflightRun` also accepts the OPTIONAL
named `faultGate = null` — the default preserves the previously
hardcoded null and a supplied gate forwards UNCHANGED into the same
`instrumentRecorderFs` call as the SAME FileHandle `kind:"fault"` write
gate, so the actual earlier record body is a genuinely held real write,
never a stop-send proxy.

## watchdog-fs-test-fixtures.mjs (TEST-ONLY)

Test-only leaf owner created under corrective 38 (repair-authored,
pending Sol verification): the WHOLE exact-path
gate ownership/real-filesystem interception group and the needed
module-private state moved out of `watchdog-evidence-test-fixtures.mjs`
so the evidence helper can hold a real join, owner teardown and the
literal37 factories without cosmetic shrink. Imports ONLY node
filesystem/path primitives — no evidence/base/production verifier
dependency; `watchdog-evidence-test-fixtures.mjs` imports and
re-exports ONLY `gateFs`; the child/base/run import DAG is unchanged.

- `gateFs(t, {workspaceRoot, relativePath, operation}) -> {entered:
  Promise<void>, release(error = null), join(): Promise<void>,
  restore(): void}`: an owned one-shot exact-path interception of
  `node:fs` promises ONLY, with `operation` ONLY `"read"` or
  `"rename"`. `"read"` calls the ORIGINAL real `readFile` and holds
  its genuine bytes before returning; `"rename"` holds immediately
  before the ORIGINAL rename to the exact `running.json` target, then
  issues it on release — a supplied Error deliberately rejects that
  already-admitted IO. The path predicate canonicalizes the observed
  EXISTING parent directory with realpath and rejoins the basename
  before comparing, so macOS `/var` versus `/private/var` aliases
  cannot bypass the gate (the rename target need not exist yet). The
  raw receipt is armed before invocation; `entered` discriminates the
  actual selected guard on the truthful entry channel — original
  errors reject on the original caller. `release` is never a join —
  `join()` waits the actual issued raw operation AND its relevant
  continuation settlement, preserving the original result/error
  independently; `restore()` runs only after closed issuance and
  actual settlement. All other paths and calls delegate unchanged. No
  `kinds` filter, no multigate, no polling and no write/unlink API. No
  verifier/record/schema mock, no invented ref, no production hook;
  gate state is test observation — never Native or close proof.
- `registerFixtureTeardown(t, {release, settle, afterSettle, restore,
  remove}) -> void` (the `afterSettle` slot is OPTIONAL under
  corrective 67 — existing four-option registrations stay valid) and
  `disposeFixture(t) -> Promise<void>`: two PRIVATE TESTONLY
  per-test ownership functions declared before their use, backed by
  one module-private per-test WeakMap. Register callbacks before
  effects, install ONE `t.after`, and permanently close registration
  when disposal starts; `disposeFixture` is idempotent and caches the
  SAME actual Promise — the cached deferred promise and the closed
  registration/admission fence are set synchronously BEFORE any
  callback executes, so a reentrant dispose returns the same promise.
  Disposal invokes ALL release callbacks first without awaiting any —
  controlled gates plus real fake-child exit/BOTH-close facts and
  original explicit timer advances only, and no release callback waits
  for a later release — then joins their actual returned bodies and
  every truthful actual settle callback, then awaits every registered
  afterSettle closure observation while instrumentation still holds
  (a rejected observation retains BOTH instrumentation and roots with
  the same original errors), then unwinds restore LIFO,
  then removes owned roots ONLY once every required body/physical
  close is actually settled. Every callback in a group is invoked even
  if one throws; errors are retained, never silently caught to
  success, and a failed/unavailable settlement never authorizes
  removal — a timeout or rejection alone never proves safe settlement
  and never deletes in finally. Closed registration rejects NEW
  external factory/run work while already-admitted bodies finish
  acquiring through preregistered slots or a raw-parent aggregate
  armed BEFORE effect — late-returned sinks/controller q fill the
  existing slots and are joined; no fresh global registration after
  the fence and no silently dropped late-acquired debt. A gate `join`
  fences only its own wrapper/original-FS/return settlement — actual
  run/controller/callback/recorder continuations are separately
  preregistered on the SAME owner and all joined before
  restore/remove; never a nested join->global dispose or mutually
  waiting gates. Expected injected operation errors stay on their
  asserted caller channel; close/unknown debt never counts as
  settled. No poll, external Native/process, runtime
  identity/status/queue authority or second operational ledger.
- `ownFixtureAttempt(t, issueThunk)` -> the identical direct result or
  original Promise returned by `issueThunk` (PRIVATE helper-to-helper
  binding declared under corrective 39 before use; NOT re-exported by
  the evidence helper): a deferred actual-return/body receipt is
  registered on the SAME per-test owner BEFORE invoking the thunk, a
  synchronous throw or the original rejected promise is preserved on
  the caller channel unchanged, and the receipt settles only on the
  actual raw completion — it never invents descriptor close,
  successful exit or safe cleanup from a rejection.
- `gateFs` refinements (declared under corrective 39): exactly ONE
  matching operation consumes the gate synchronously when matching is
  claimed — all later legitimate calls delegate unchanged while still
  instrumented; `release` latches permanently even before the match so
  a delayed match cannot create a newly held gate after release; for
  `"read"` the `entered` channel resolves only AFTER the actual
  original read bytes arrive and REJECTS with the actual original read
  failure once that read settles — the original caller still receives
  the same failure — before the caller return is released; `restore`
  rejects unless gate issuance and admitted wrappers are genuinely
  settled. Corrective 40 (declarations recorded before use): an
  already-admitted matching wrapper completing canonicalization after
  `release` still receives the latched injected error — never silently
  discarded as never selected — with no new delayed held gate and the
  whole wrapper still preregistered before canon/IO; a per-test owner
  restore failure never continues to root removal as if
  instrumentation safely restored — the original error/root are
  retained and actual settlement stays distinct, so no
  callback/release/close error is silently converted into cleanup
  success. Corrective 43 (declarations recorded before use):
  new-entry fencing and the selection eligibility of already-admitted
  wrappers stay distinct — closing NEW entry or a gate `join` never
  makes an already-registered canon wrapper ineligible for its first
  matching one-shot/latching, the original read error still wins over
  an injected error with `entered` rejecting the actual failure, and
  every actual wrapper continuation is joined before restore/remove.

`makeEvidenceWorkspace(...).dispose` and
`makePreflightRun(...).dispose` delegate to this SAME per-test owner,
so one factory cannot delete a workspace while another still holds an
admitted run/IO. No `test()` declaration, no helper-to-test import, no
cycle. Excluded from the functional-runtime input union and
`BackendIdentity.helpers`.

R4 GE3/GE4 instrumentation (declared before use, planned until source
exists): genuine Store/Recorder construction runs through REAL
FS/FileHandle instrumentation — no spread-object WeakMap aliases or
fake owner. The earliest confinement/lstat IO observer binds the
actual window plus the true ordinary-chain join and collector bound
before later legitimate FS sealing (no claimed leaf-read equals all
IO). ALL release flows order release first, then actual body/handle
joins, then LIFO restore/remove.

Current corrective 70 (declared before use — leaf PLANNED, not yet
created): the WHOLE per-test teardown group — the `owners` WeakMap,
`ownerFor` and the `registerFixtureTeardown`/`disposeFixture`/
`ownFixtureAttempt` exports — moves to the new
`watchdog-teardown-test-fixtures.mjs` leaf, which this owner imports
and re-exports as the IDENTICAL three functions; the EXACT4 roster and
every importer/callsite are unchanged, `gateFs` stays local, and this
owner retains the identical private pure `FAIL`/`deferred` it still
needs — no duplicate owners WeakMap. The three teardown bullets above
describe the moved functions verbatim; their owned-here wording is
DATED superseded, preserved as history.

Current corrective 73 (declared before use): the `"read"` gate holds
the actual SAME `FileHandle.read` result — `fsp.open` for the exact
canonical selected path is intercepted beside the legacy
`fsp.readFile` surface for existing callers, ONE claim consumes the
gate across either read surface, and a claimed open returns the SAME
real FileHandle with only `read` replaced by the truthful wrapper —
the ORIGINAL read invoked once FIRST with the same this/args, the
genuine `{bytesRead, buffer}` result or the real error retained on the
original channels, only the first genuine read's caller return held,
and the saved read descriptors plus `fsp.open` restored only after
closed issuance and actual settlement; the same EXACT4 API
`gateFs(t, {workspaceRoot, relativePath, operation}) -> {entered,
release, join, restore}` is unchanged. The earlier readFile-only
wording in the `gateFs` bullet above is superseded, preserved as
history.

## watchdog-teardown-test-fixtures.mjs (TEST-ONLY)

PLANNED test-only leaf declared under corrective 70 before creation
(not yet created): the WHOLE per-test teardown ownership group moved
from `watchdog-fs-test-fixtures.mjs` with ALL original comments,
layout and guards — the ONE `owners` WeakMap, the private `ownerFor`,
the three identical moved exports plus the shared observer below,
and the private pure `FAIL`/`deferred` it needs. Pure node/JS
intrinsics only beside `node:fs` promises/`node:path`: NO project
imports, no top-level effects and no `test()` declaration.

- `registerFixtureTeardown(t, {release, settle, afterSettle, restore,
  remove} = {}) -> void`: callbacks registered before effects; ONE
  `t.after` installed per test; registration closes permanently once
  disposal begins while already-admitted bodies still fill
  preregistered slots after the fence.
- `disposeFixture(t) -> Promise<void>`: idempotent — returns the SAME
  cached actual Promise. The cached deferred and the closed
  registration/admission fence are installed synchronously BEFORE any
  callback executes, including a reentrant dispose. Fixed order: ALL
  release callbacks invoke first without awaiting (no release waits on
  a later release), then the actual returned bodies and every settle
  body join, then every afterSettle observation awaits while
  instrumentation still holds — a rejected observation retains BOTH
  instrumentation and roots with the original errors — then restore
  unwinds LIFO, and owned roots remove ONLY once every required
  body/physical close is actually settled. A timeout or rejection
  alone never authorizes removal; nothing is deleted in a finally.
- `ownFixtureAttempt(t, issueThunk)`: returns the IDENTICAL direct
  result or original Promise — a deferred raw-body receipt is
  registered on the SAME per-test owner BEFORE the thunk's effects; a
  synchronous throw or original rejection stays on the caller channel
  unchanged and the receipt settles only on actual raw completion —
  never descriptor close, successful exit or safe-cleanup invention.
- `observeSelectedReceiptMetadata(t, workspaceRoot, refPath)`: the
  shared TEST-ONLY selected-metadata observer imported DIRECTLY by its
  two owning suites — preregisters its restore on the SAME per-test
  owner BEFORE the instrumentation lands, wraps the REAL
  `fsp.lstat`/`fsp.realpath` preserving the original
  this/args/result/errors, and counts the genuine admission only on
  the EXACT canonical completion target or its phase directory — a
  zero count is the observed absence of that selected admission,
  never a completion-read or all-IO proof.
- `observeDriverBegun(t, driverFixture)`: the shared TEST-ONLY
  outgoing-begun observer imported DIRECTLY by its owning suites —
  preregisters the child-send restore on the SAME per-test owner
  BEFORE the tap lands, invokes the saved send with the original
  this/ALL args (genuine callback, return and error pass through),
  and settles the returned handled receipt only AFTER the underlying
  send returns — an outgoing `type:begun` resolves even on a false
  submit while an actual `type:stop` rejects with the real
  `stopReason`; no physical close authority.

The SAME one per-test ledger — no second owner, clock, queue, status
or proof authority. `watchdog-fs-test-fixtures.mjs` imports and
re-exports the IDENTICAL three functions keeping its EXACT4 roster
with `gateFs` local, so `makeEvidenceWorkspace`/`makePreflightRun`
dispose delegates and every existing callsite keep the same owning
import path. DAG `watchdog-fs-test-fixtures.mjs` -> this leaf
one-way; never imported by production modules. Excluded from the
functional-runtime input union and `BackendIdentity.helpers`.

Current corrective 75 (declared before use): ONE whole shared-helper
move — the WHOLE `observeSelectedReceiptMetadata(t, workspaceRoot,
refPath)` observer plus every owned preceding comment moves into this
leaf, which now exports FOUR functions: `registerFixtureTeardown`,
`disposeFixture`, `ownFixtureAttempt` and
`observeSelectedReceiptMetadata`. The first three are unchanged and
`watchdog-fs-test-fixtures.mjs` keeps its SAME4 roster — `gateFs`
local plus the identical three re-exports, no new re-export — while
BOTH owning suites `watchdog-evidence-boundaries.test.mjs` and
`watchdog-selftest-evidence.test.mjs` import the SAME shared observer
DIRECTLY from this leaf; DAG suites -> teardown and FS -> teardown
stay unchanged acyclic with no runtime use. Prior 79h7 actual repair
state recorded: `settleRecordWrites` is the SAME instrument join
returned by `makePreflightRun`; the actual held fault write plus the
required re-verification read attribution, the original
early-admission guards, the actual selected-metadata positive
control and ALL releases BEFORE the true body joins are preserved.
No pass, safety or stage claim is made.

## watchdog-records-test-fixtures.mjs (TEST-ONLY)

PLANNED test-only record-adapter fixture leaf declared under
corrective 46 before creation (not yet created): owns the WHOLE local
adapter setup/settle helpers moved out of `watchdog-records.test.mjs`
with original comments, actual argument/default meanings and caller
result/error preserved. Exactly two named exports:

- `setupRecordAdapter(t, {phase = "check", runId = "R1", pgnEvidence =
  null, verifyCleanup} = {}) -> Promise<{clk, env, adapter, boot,
  events, observerFaults, binding}>` — the original setup option and
  return roster; `env` preserves the original genuine
  workspace/store/manifest/recorder/inputs/supervisor/monitor/
  monitorCalls/cleanup/readFile/removeWorkspace meanings.
- `settleRecordCleanup(clk, env, binding, phase = "check", runId =
  "R1") -> Promise<CleanupProof>` — original-outcome-adopting: calls
  EXACT `binding.cleanup.run` once with the existing
  phase-workload/supervisor/expectedFinalizer/original
  captured-start+5000 shape and drains that ORIGINAL q; no manual
  500-pending pump, new grace or proof setter.

The move makes ONE `cleanupMonitorFixture` and ONE
`createRunDrainBinding` over that SAME monitor, and the real temporary
store/workspace/input bytes/manifest/`createPhaseRecorder` is built
directly through the existing genuine `makeStore`/`fixtureWorkspace`/
`fixtureCommonIdentity`/`writeWorkspaceOnce`/`writeFixtureInputs`/
`fixtureManifest`/`createPhaseRecorder` exports — no unused second raw
controller; `env.cleanup` is the SAME `binding.cleanup` and recorder
`verifyCleanup` uses that exact `binding.cleanup.verifyCleanup` except
the already-intentional negative-test override which stays a genuine
failing callback. It uses the existing `registerFixtureTeardown`/
`ownFixtureAttempt`/`issueFixtureBody` with preregistered slots and a
local actual-body array BEFORE factory/FS/finalize effects; the
acquired root is saved immediately before canonicalization, closure
joins the actual factory first then all actual finalize/body debt then
`binding.settleActual`, a real incomplete close runs only when not
genuinely successfully finalized, and a successful actual finalize
alone marks sealed — a rejected/unknown close prevents removal and
retains the original error/root/instrumentation. An observer wrapper
of the actual recorder finalize keeps only the current pre-R4
sealing-observation meaning — never a WeakMap association or second
owner; genuine-constructor FS/FileHandle instrumentation stays open
for R4 as already frozen.

Imports only node fs/path, genuine records/test-fixtures, supervision
identity, the base watchdog fixture clock/monitor, the drain leaf, the
FS owner and the `watchdog-records` production adapter — NEVER any
`*.test.mjs`, the run/evidence/cleanup fixture owners or itself. No
`test()` declaration, no helper-to-test import, no cycle, no
import-time effects — discovered tests remain
`watchdog-records.test.mjs`. Excluded from the functional-runtime
input union and `BackendIdentity.helpers`.

Current corrective 68 (declared before use — not yet implemented or
verified green): ONE whole existing-owner move repairs the concrete
440-line records.test.mjs cap failure — the WHOLE local
`registerCleanup` comments+body moves unchanged into this leaf and the
suite imports the IDENTICAL function. The private roster is now
EXACT4 `setupRecordAdapter`/`settleRecordCleanup`/`registerCleanup`/
`observeRecorderFixtureClosure` — the accepted corrective-67 OUTER
closure observer landed in source pending verification
(`observeRecorderFixtureClosure({recorder, workspaceRoot, phase,
commonIdentity, runs, incompleteClosure}) -> Promise<frozen
{state, verified}>`: a fresh same-owner `phaseRecorderLifetime`
whenSettled, then the exact canonical phase `completion.json`
preopen through `issueActual` + real `fsp.lstat` where ONLY that
ENOENT maps to missing; a present stat runs actual `loadRecord` +
`verifyReceipt` on the record's own ref -> `"sealed"`, and a missing
completion is `"unfinished"` ONLY on a fulfilled genuine
incompleteClosure or a fulfilled ORIGINAL tracked run plus a fresh
owner-zero re-check — never a generic `EVIDENCE_INCOMPLETE` catch or
a rejected run as proof). The "exactly two named exports" roster and
the corrective-46 "PLANNED, not yet created" phrasing above are DATED
superseded, preserved as history (the file already exists at 266
lines). `registerCleanup(t, env) -> SAME env` attaches the additive
`env.finalize` on the plain fixture env only — genuine
`env.store`/`env.recorder` never spread, proxied or rebranded — which
prearms a neutral original-body receipt BEFORE synchronously invoking
the real `recorder.finalize` thunk, returns the ORIGINAL
result/promise/error unchanged and tracks actual fulfillment
separately. The `t.after` teardown joins every admitted actual body,
closes an unfinished recorder — tolerating `RECORDER_STATE` only for
a known actually-fulfilled finalizer that already owned closure —
awaits the SAME `artifactStoreLifetime` owner's fresh `whenSettled`
only after its own issuance closed, then removes the root; any other
close failure or unknown debt preserves the root and propagates.
Import-time declaration carries no effects, but CALLING
`registerCleanup` is EFFECTFUL TEST admission — it installs
`t.after` and attaches `env.finalize` — while actual IO stays
deferred to the admitted finalizer and teardown bodies; no Native,
status, proof, new clock, queue or second-ledger authority; the
TEST-only runtime exclusion is unchanged. The leaf adds the
`artifactStoreLifetime` import beside its existing fsp import while
the suite drops the whole helper plus the now-unused lifetime
import, keeps all 14 names/assertions, and restores the accidental
`r2` duplicate-recordId in the seq-1/`check/f` case to the ORIGINAL
`r1` in the same source pass.
Forecasts ~334 here and ~376 in the suite (~385 after the future
observer) stay projections against the actual <400 readable cap —
never a waiver.

Current corrective 70 (declared before use): the WHOLE expanded
`observeRecorderFixtureClosure` moves to the base owner — this leaf
imports and re-exports the IDENTICAL observer so the private roster
stays EXACT4 `setupRecordAdapter`/`settleRecordCleanup`/
`registerCleanup`/`observeRecorderFixtureClosure` with ALL 59
`registerCleanup` bytes/comments preserved; `Records -> Base` stays
unchanged and acyclic. The observer "landed in source" owned-here
wording above is DATED superseded, preserved as history.

Current corrective 71 (declared before use): the R4 genuine-binding
repair keeps the SAME ONE real monitor/controller/`env.cleanup`/
verifier/direct genuine store and the ORIGINAL recorder — never an
alias, proxy, second owner or minted proof. Setup captures ONE finite
ORIGINAL entry end at `clk.nowMonoMs() + 10000` BEFORE any
acquisition (never a refreshed now+ after cleanup or a caller
duration override), binds
`env.recorder.bindRuntime({lifetime: phaseRecorderLifetime(recorder),
nowMonoMs: clk.nowMonoMs})` BEFORE any recorder use, derives ONE
frozen `{retainActual}` io passed unchanged into the real 8-field
`createWatchdogRecordAdapter`, and returns an additive 8th key
`finalizeAndRead(request)` that prearms the SAME local actual-body
receipt through `issueFixtureBody` then invokes the unchanged
`adapter.finalizeAndRead(request, {deadlineMonoMs: originalEnd})` —
indexing and returning the ORIGINAL Promise unchanged while actual
A/no-arg B/`verified.final` stay the production authority. Teardown
joins the actual factory/body/finalizer receipts plus
`binding.settleActual`, stores the EXACT
`closeIncompleteEvidence()` promise BEFORE its await only when no
finalization was admitted (an admitted pipeline is never blindly
closed or caught `RECORDER_STATE`-as-sealed), and the afterSettle
`observeRecorderFixtureClosure` classification — genuine owner fresh
zero plus the real lstat ENOENT-missing/verified receipt — alone
gates restore/removal, while a recorder-less partial factory still
joins the actual attempt and awaits the SAME store owner's fresh
`whenSettled`. The pre-R4 Recorder spread finalize alias wrapper,
the obsolete `slots.sealed` bool and the "exactly two named
exports"/seven-key return roster paragraphs above are DATED
superseded, preserved as history.

### Current fixture correction 76

The FS read gate retains a separate failure-presence flag so original null or undefined rejection reaches both entered and the caller unchanged. The genuine handshake test observes the actual outgoing begun send, reporting an actual stop instead of using a fixed turn count. Same real owner, unchanged assertions and cleanup order. This records source behavior only.

### Current fixture correction 77

The teardown leaf gains a fifth private TEST export, `observeDriverBegun(t, driverFixture)`, returning the handled original begun-observation Promise under the same preregistered restore owner with node-only imports and no physical authority; the earlier four-export wording is dated history this supersedes. The genuine lifetime owner now comes from the SAME Store (`artifactStoreLifetime(evidence.env.store)`), and actual `monitor.start` entry, the outgoing begun admission and the fault gate's first-true assignment replace fixed-turn readiness checks. This records source behavior only.

## driver-bridge.mjs (C4b-01 — declared before creation)

Declared before creation under scope `c4b-scope-01-driver-bridge.json`
on `feat/tinyaz-browser-harness` at base
`41d5bf36bae8bfd1759a664953b45ce9ac389c5c`; the canonical Create row and
this contract were recorded BEFORE the file existed (the companion
`driver-bridge.test.mjs` is TEST-only and excluded from the
functional-runtime input union). The module is the driver-side bridge
owner running inside the supervisor-forked driver process over the
trusted child `process.send`/`message` transport supplied by later
`run.mjs` assembly — NEVER `createDriverChannel`, which the supervisor
forks and owns separately. Sole export
`createDriverCapabilities({runId,manifest,transport,signal}) ->
Object.freeze({capabilities,start,finish,close})`; `capabilities` is
frozen EXACT7 `{runId,manifest,signal,register,operation,event,artifact}`
and `start`/`finish`/`close` are private session controls invoked only
by later run assembly — no proof/status setters and no
Native/Store/Recorder/fork/filesystem/model/browser/network authority.

**Trusted transport.** Exact shape
`{pid,send(frame,callback)->boolean,onMessage(fn)->unsubscribe,onClose(fn)->unsubscribe,clock:{setInterval,clearInterval},retainActual(promise)}`:
a `false` send return means the frame was submitted ONCE, never replayed;
`retainActual` is the SAME genuine local driver-lifetime registrar the
later run assembly supplies (tests use a real `createWatchdogLifetime`).
The constructor validates and canonical-copies/freezes the serializable
manifest/run fields (`manifest.runId === runId`, `manifest.phase` inside
the five wire phases, `manifest.commonIdentitySha256` hex-64), validates
the transport and external signal shapes, retains both by reference, and
creates a local genuine AbortController exposing the read-only derived
`capabilities.signal` — external abort, an actual stop frame and
transport disconnect each propagate into it. The constructor performs NO
sends and NO timers; it subscribes `onMessage`/`onClose` ONCE before any
hello can reenter, and a construction/subscription failure unwinds its
own listeners without IO.

**Wire ownership.** ONE `seqOut` covers
hello/heartbeat/register/begin/end/event/artifact/finish/closed and ONE
expected `seqIn` must match every parent frame exactly once with the
closed field set, ipcVersion 1 and runId — wrong ids/recordSeq/
operationId/tuple/listener/ref, duplicates and late ACKs fault the
bridge (error code `IPC_INVALID`). The parent's `createProtocolValidator`
stays the sole run-global ID/protocol authority; the bridge adds no
second validator, allocator or canonical registry. Local fresh IDs
namespace `runId:driver:request|record|artifact:<counter>` rejecting
reuse and counter overflow; `operationId` is supplied exact by the
caller and is never rewritten or re-exposed. Pending ACKs are installed
BEFORE each send. BEFORE every raw send, canonical serialization and
actual work callback a neutral completion promise is prearmed+retained
through `transport.retainActual`: a real callback error is a failure even
after a public ACK already arrived, a synchronous send throw preserves
the exact arbitrary value, and an unknown actual submission stays held
until the real callback — never a fake no-issue. A serialization failure
before `transport.send` is the definite no-issue boundary. Stop or a
public rejection never retires callback/work debt, and no global
`whenSettled` is awaited inside any body — per-flow receipts only, all
with real rejection handlers. Outbound frames are canonical-serialized
and bounded by `IPC_LIMITS.driverBytes`; inbound frames keep
`IPC_LIMITS.frameBytes`.

**start.** `start({manifestPath})` runs once: it reserves the actual
start waiter BEFORE sending `hello{pid,phase,commonIdentitySha256}`,
awaits both its real send callback and the matching
`start{manifestPath,commonIdentitySha256}` exactly, and starts the 500 ms
heartbeat through `transport.clock` only after hello is issued — the
heartbeat carries the current pending/live `operationId` (null before
any begin), including while a `begun` ACK is still pending, and is
cleared synchronously on stop/fault/close/finish with no late ordinary
frames. The bridge owns no phase/deadline/timeout clock; the parent's
frame bounds and the external signal bound the public waits.

**register.** `register({kind,rootPid,expectedExecutable,listener}) ->
Promise<{identity,listener}>` allocates a fresh namespaced requestId,
sends the exact `{requestId,kind,rootPid,expectedExecutable,listener}`
wire and resolves only on the `registered` ACK matching requestId, the
identity/rootPid tuple and the listener exactly (a null rootPid admits a
null identity). Acknowledged `{kind,requestId}` pairs stay privately
cached for `closed.expectedShutdowns` — there is no public ID getter.

**operation.** `operation(kind,operationId,work) ->
Promise<OperationResult>` permits one pending/live operation (readiness
or command), sends `begin{operationId,kind}`, and invokes no work before
the matching `begun` whose `remainingMs` is positive and no greater than
the original kind ceiling. The actual work body is preregistered with
the SAME retainer BEFORE the callback is invoked and receives
`{remainingMs,signal}`; the snapshot actual result sends
`end{operationId,result:{status,evidencePaths,detail}}` only while the
operation is still eligible, a failed/throwing work body (arbitrary
values including null/undefined, carried by explicit presence) resolves
to a truthful `failed` end while eligible, and an independent
stop/abort/fault rejects the public wait while the genuine work receipt
stays held until actual settlement — no late `end`/`begun` effect and no
post-stop write ever follows. Caller operation IDs are claimed once and
never reused.

**event/artifact.** `event(kind,payload) -> Promise<void>` and
`artifact(path,mode,chunksAsyncIterable) -> Promise<ArtifactRef>`
serialize ordinary record delivery and artifact chunks through ONE
shared `recordSeq` with at most 256 pending public/record submissions.
`event` resolves only on the actual `recorded` ACK whose `ref` is null.
`artifact` allocates a fresh artifactId plus a fresh recordId per <=64
KiB base64 chunk (bytes snapshotted before any await), awaits each
chunk's `recorded` ACK before sending the next, sends exactly one final
`last:true` frame — an empty stream still sends one empty final chunk —
requires null nonfinal refs and a valid final ref bound to the exact
path, and reuses no concurrently-active path or closed
artifact/record ID (a completed path may bind a fresh artifactId).
Chunk and frame metadata stay
under the fixed 256 KiB / `IPC_LIMITS` ceilings.

**finish/close.** `finish(PhaseResult)` is private once after ordinary
record/operation work completes, sends the unchanged six-field finish
frame and awaits the real send callback — it synthesizes no status,
proof or evidence. `close({gracefulCloseAttempted})` is private once
after stop or finish, sends `closed{gracefulCloseAttempted,
expectedShutdowns}` with every acknowledged registered `{kind,id}`
derived privately, awaits the real send callback, and clears owned
timers/listeners only after genuine settlement — it never raw-kills,
disconnects, exits or claims cleanup proof; the caller closes real
resources outside the bridge.

**Errors.** Public validation/eligibility failures reject with
`IPC_INVALID`; a sticky session fault from a malformed/duplicate/late
parent frame, a real send-callback error or a transport disconnect
aborts the derived signal, clears the heartbeat, rejects every pending
public wait and admits no further ordinary work. Arbitrary thrown values
including null/undefined are carried by explicit presence, never
truthiness. Every source stays under 400 readable lines or is honestly
reported KnownOversize. Source-only foundation — UNEXECUTED, no green,
phase, parity, strength or publication claim. Under C4b-02 the
restored expanded-740 facade stood as interim KnownOversize (dated);
under C4b-03 the current source is the integrated facade over the SAME
ctx6 — still UNEXECUTED, no green claim.

## driver-bridge-wire.mjs (C4b-02 — exists; declaration dated)

C4b-02 Root-approved readable-bridge correction (scope `c4b-scope-02-readable-bridge.json`; dated ABSENT-before-creation declaration — now created source-only, UNEXECUTED; functional-runtime input): the private wire/dispatch leaf of the three-owner driver-bridge split — EXACT3 exports `bridgeError`, `defer`, `createDriverBridgeWire(ctx)`. The pure factory takes the SAME private ctx6 `{runId,manifest,transport,signal,state,endLatch}` (ctx is created only by the facade; `state` is the ONE original mutable closure over flags/maps/counters, never caller status or proof) and returns frozen EXACT15 `{sendFrame,onFrame,onTransportClose,onExternalAbort,startHeartbeat,clearHeartbeat,terminate,sessionFault,admissible,raced,freshId,claimId,retainBody,joinActual,unwind}` owning the WHOLE original raw-send/ACK-dispatch/parent-envelope/subscription-callback/heartbeat/fault/admission/ID blocks. Concrete repairs carried into the moved bodies (not scope expansion): the transport receives the validated PLAIN frame object exactly as Node `process.send` and the parent `driver-protocol` expect — `canonicalBytes` only bounds the 262144 driverBytes ceiling; every raw send arms a neutral actual receipt BEFORE serialization/send (held strong in the SAME private `state.actual` receipt Set — actual lifetime stays the sole debt/hold authority, no second ledger), which resolves ONLY at the real callback with any error or at a definite pre-issue serialization/ceiling failure, while a separate public promise carries the domain outcome — an uncertain sync `send` throw rejects the public with the exact arbitrary value yet never marks the actual receipt settled (no fired-flag ignoring a late callback, no fake completion), and a real callback error faults the session even after a public ACK or `closed`; `retainBody(fn)` preregisters the neutral actual before any real body invocation and resolves with the original `{threw,value}` outcome (a rejected domain value is not unclosed physical debt); `joinActual()` is a PASSIVE local join over `state.actual` after closed admission — never a global owner `whenSettled` or self-wait — and the real close callback plus local actual join finish before listeners unwind (facade integration next pass); every public defer's rejections are handled immediately and `endLatch`'s rejection is handled at the factory while ordinary `raced` keeps public waits prompt. The factory invokes NO transport/timer/callback and does no IO; imports only existing pure primitives/constants/canonical JSON — DAG `facade -> methods -> wire -> pure primitives`, no cycles or prodNative/filesystem.

## driver-bridge-methods.mjs (C4b-02 — exists; declaration dated)

C4b-02 readable-bridge correction (dated ABSENT-before-creation declaration — now created source-only, UNEXECUTED; functional-runtime input): the private ordinary-methods leaf — sole export `createDriverBridgeMethods(ctx,wire) -> frozen {register,operation,event,artifact}` over the SAME ctx6 plus the SAME wire instance. Owns the WHOLE `register`/`operation`/`event`/`artifact` public bodies, the exact `{status,evidencePaths,detail}` OperationResult validation, the ordinary 256 pending bound and the ONE serialized recordChain over the wire's single seq/state.recordSeq/ID counters/ACK maps — no second queue, validator or clock. Every queued ordinary body checks `wire.admissible()` before issue and after each await (no queued record, late iterator or end after stop); each actual record body/work/`iterator.next` is retained before effect through `wire.retainBody`; the event payload and registration metadata are snapshotted before queue awaits, chunk bytes before the lookahead await, and ACK-returned refs/identity/listener arrive fresh copied/frozen; the genuine checkSerialized intent holds — a serialization/byte failure consumes no recordSeq or pending ACK slot while the actual send still validates the exact frame and the 262144 driverBytes/64 KiB chunk/256 ceilings; fresh artifact/record IDs never reuse a concurrently-active path or a closed artifact/record ID (a completed path may bind a fresh artifactId — canonical `driver-protocol` semantics unchanged), the final REAL chunk carries `last:true` (empty stream one empty final), nonfinal refs are null and the final ref must match the exact path. May import shared `bridgeError`/`defer` from the wire leaf, never the facade.

## C4b-04 whole bridge capacity correction (declared before creation)

C4b-04 Root-approved whole-capacity correction (scope
`c4b-scope-04-whole-bridge-capacity.json`, global 118 / active 9 /
map 214 -> 216; prior03 authored the partial
facade289/methods371/protocol339/wire429 sources and the expanded
original thirteen-test source571 — actual03 then ended on
manager SIGINT, exit 1/400.053, during the rejected 536/477
compression after comma-expression unsubscribers and repeated
tight test rewrites with zero author target execution calls —
so the FULL original thirteen-test source571 is restored FIRST
and the rejected 536/477 compressions are never the
base): `driver-protocol.mjs` gains the pure PRIVATE
`createDriverBridgeActual({state:st,transport}) -> frozen
{retainBody,joinActual}` — the WHOLE 31-line block moved byte-exact
from the wire leaf's lines 380-410 including all comments, over the
SAME `st.actual` strong receipt Set and the SAME trusted
`transport.retainActual` authority; pure construction defines
closures only, invoking no retainActual/IO/clock/body itself and
adding no second queue/debt/ledger/proof/status/clock/globaljoin.
Protocol exports become EXACT5 while the original two validators
and shared helpers stay byte-identical and the protocol never
imports any bridge module; `driver-bridge-wire.mjs` instantiates
the pair ONCE and exposes the IDENTICAL two refs inside its
unchanged frozen EXACT15 (EXACT3 exports and public wire surface
unchanged, ordinary one-expression object reflow only) — DAG
wire -> protocol, no backedge. The suite splits WHOLE across three
owners: `driver-bridge-test-fixtures.mjs` (TEST-only, EXACT9
exports `RUN`, `SHA`, `MANIFEST`, `MANIFEST_PATH`, `LISTENER`,
`flush`, `deferred`, `makeEnv`, `driveStart`) owns the lifted
fixture block over the REAL validator oracle and a real
`createWatchdogLifetime` — the default lifetime keepalive is a real
lazy hold and the fake clock controls heartbeat only — with
`makeEnv(t,opts)` arming real TestContext teardown BEFORE effects,
a per-env private tracker wrapping each send's original raw
callback once (custom `sendImpl` receives the tracked callback),
`deferred(env)` binding each controlled release, and teardown
closing ordinary admission through the original signal abort,
resolving still-pending controlled gates/work with a harmless valid
OperationResult, delivering unreturned real fake send callbacks,
then awaiting a genuine fresh `owner.whenSettled` before dropping
transport/unsubscribe; `driver-bridge-lifecycle.test.mjs`
(TEST-only) owns the WHOLE final three original cases;
`driver-bridge.test.mjs` keeps the first ten — all thirteen
original names/order/assertions/purposes preserved with no TEST
back-import. All new paths are excluded from the functional-runtime
union; no production behavior changes.

C4b-05 final causality completion (scope
`c4b-scope-05-final-bridge-causality.json`, same 118 / active 9 /
map 216 — no new path, API, owner or authority; all production and
runtime bytes read-only/exact): the bridge foundation is created
and green — the dated actual04 receipt ran the affected whole
owners `driver-bridge.test.mjs` 10/10,
`driver-bridge-lifecycle.test.mjs` 3/3,
`supervisor-protocol.test.mjs` 16/16 and
`supervisor-protocol-lifecycle.test.mjs` 12/12, all exit0 with zero
warnings/stderr/timeout and exact 37-file hash closure after (the
352-case C4a2 Native fullglob stays earlier pre-C4b evidence, never
fresh against the new protocol bytes; no Native/browser/phase
validation). The test-only strengthening: the lifecycle held-body
case now proves the real lookahead body entered its gate — a
controlled `deferred(env)` entry resolved inside the same generator
immediately before `await pull.promise` and awaited after the first
recorded ACK + `sent0.cb` BEFORE the injected stop — then proves
close waits on the held body independently of the closed callback:
first `done===false` with both facts held, the real `csent.cb(null)`
delivered, the second `done===false` while only the body remains
held, then `pull.resolve()` before `await cl`; every original
assertion/order/literal preserved and the shared unconditional
teardown still covers early failure. The fixture header only drops
the conflicting generic timers wording (heartbeat-control fake and
genuine lazy hold unchanged). COMPLETED actual gate: Main ran the
affected whole owner `node --test
train/scripts/browser_eval/driver-bridge-lifecycle.test.mjs` on
the fresh immutable 37-file static-cleared source closure —
exit0/0.1130 s, tests 3 / pass 3 / fail 0 / cancel 0 / skip 0,
warnings [], stderr 0, timeout false, hashes exact after; the 05
source closed exit0/107.337 with marker-triggered owned SIGINT
(never a natural exit). No fresh fullglob/Native/phase/run/cohort
validation — the dated actual04 receipts and pre-C4b Native 352
stay dated history; the green bridge foundation is ready for
Main commit only, and the remaining C4b
CLI/server/browser/snapshot/check/parity/preflight/comparison
stay unimplemented and unexecuted.

C4b-07 first-pull admission fence (scope
`c4b-scope-07-bridge-pull-fence.json`, same 118 / active 9 /
map 216 — no new path, API, owner, authority, clock or budget;
every other production/runtime byte read-only/exact): the ONE
production gap the final code-doc comparison found —
`pull` in `driver-bridge-methods.mjs` awaited the retained
`iterator.next` without an ordinary-admission check, so a stop
arriving while the FIRST next was pending let its late value
reach the loop and initiate a SECOND next before the
post-await fence. `driver-bridge-methods.mjs` (371 -> 375)
now calls `wire.admissible()` immediately BEFORE the retained
`iterator.next` and immediately AFTER the awaited successful
raw outcome before returning its value — `out.threw` still
rethrows the exact `out.value`, the neutral actual receipt
and the genuine lifetime retainer are unchanged, and no
late pull/lookahead/frame can follow a stop. The lifecycle
owner (180 -> 218) appends the meaningful causal regression
`stop during the first iterator pull admits no second pull
or artifact frame`: a controlled iterator whose `next()`
increments `pulls`, resolves a controlled `deferred(env)`
actual entry and returns the same held `first.promise`;
after the real first entry a well-formed stop is injected,
the public artifact reject is awaited, a real close is
started, the real closed callback is delivered, and only
then is `first` released `{done:false,value:[1]}` — the
asserted `pulls === 1` and zero emitted artifact frames are
a concrete red without the fence (the same iterator's
now-fulfilled second `next()` makes `pulls === 2`) and
cannot hang. All thirteen original names/assertions/order
preserved — fourteen driver cases total (main 10 /
lifecycle 4). Bundled descriptive clarification only: the
methods header and owning descriptions now say fresh
artifact/record IDs reject concurrently-active path reuse
and closed-ID reuse — a completed path may bind a fresh
artifactId (implementation and canonical `driver-protocol`
validator unchanged; needed for the already-approved
alternating PGN slots). COMPLETED actual07 gate: Main ran
the two changed whole owners — `node --test
--test-concurrency=1
train/scripts/browser_eval/driver-bridge.test.mjs` -> 10/10
pass, exit0/0.0805 s, and `node --test --test-concurrency=1
train/scripts/browser_eval/driver-bridge-lifecycle.test.mjs`
-> 4/4 pass, exit0/0.0801 s, zero fail/cancel/skip, warnings
[], stderr 0, timeout false, current 37-file hash closure
exact after; the meaningful old-body RED proof ran the
immutable controlled prior methods371 against the current
lifecycle218 — 4 cases, 3 pass / 1 fail, only the new case
failing actual 2 != expected 1, 0 cancel/skip/warnings/
stderr/timeout — expected old-body red, never Native/phase/
green evidence. The 07 source closed exit0/213.021 with
marker-triggered owned SIGINT (never a natural exit). The
final bridge foundation is implemented and unit-validated —
READY for Main green commit, not yet committed or
published; the remaining C4b
static-identity/snapshot/CLI/server/browser/check/parity/
preflight and the ONE approved comparison stay unimplemented
and unrun, the earlier 352-case C4a2 Native fullglob stays
pre-C4b dated evidence, the dated actual04/actual05
receipts stay dated history, and no fresh fullglob/Native/
phase/browser/Elo/cohort claim is made.

## C4b-09 static backend identity and startup comparison (declared before creation/use)

Declared before creation/use under scope
`c4b-scope-09-static-backend-identity.json` (global 119 /
active 14 / map 216 -> 217 — exactly ONE TEST-only Create
row for `process-backend-setup.test.mjs`, every prior map
action/path/order preserved, the locked Runtime `070fbf`
slice byte-exact) on `feat/tinyaz-browser-harness` at the
committed, published and clean bridge foundation
`63c8923c9d218a983276c6c0d01d16534160257e`; this slice
claims no phase admission, Native pass or test result.

Root approved the two-stage static setup capture plus the
mandatory fresh startup comparison: BackendIdentity is
STATIC OS/software/Python/libproc/tool/helper facts with no
PID/readiness token, while the manifest/CommonIdentity must
precede phase children.

- `process-backend-reader.mjs` (256 -> 339): keeps the
  original `createBackendReader` and
  `resolvePythonProcessImage` bodies/semantics byte-exact
  and gains TWO pure data helpers (four exports total).
  `parsePythonVenvConfiguration(text) -> frozen
  {home,includeSystemSitePackages,version,executable,command}`
  accepts only strict UTF-8 text, requires each real
  pyvenv.cfg field exactly once, rejects
  unknown/duplicate/missing/malformed lines, requires
  `include-system-site-packages = false`, the pinned
  `3.11.14` version and nonempty absolute home/executable —
  no eval/spawn/IO.
  `createBackendIdentityExpectation(value)` returns null
  ONLY for `undefined`; a supplied malformed/null rejects
  synchronously before any IO. Otherwise it validates the
  closed BackendIdentity, copies/deep-freezes the SAME
  full-eight-field python identity and returns a frozen
  `{assertMatches(actual)}` — pure data equality and
  closed-shape validation only, never a status/proof
  getter/setter or user callback.
- `process-backend.mjs` (287 -> 398): EXACT3 exports. The
  original `captureBackendIdentity` VERIFIED-ready entry
  keeps every original ready/platform/ABI/Python
  invocation/helper/budget/physical-closure guard and error
  channel. The new `captureSetupBackendIdentity(options)`
  is the bounded static setup entry — NO ready argument
  accepted and never a fabricated envelope: it reads the
  actual `<prefix>/pyvenv.cfg` through the SAME bounded
  owned reader under the same original handle/receipts/
  default horizon, binds `config.executable` and resolved
  `home/python<maj.min>` to the SAME canonical resolved
  selected invocation (home realpath is NOT the launcher
  dirname on the Homebrew layout — resolved executable
  paths are compared, never the dirs), binds
  version/prefix/command to the selected venv, derives
  `basePrefix` as the canonical launcher parent-parent,
  then hashes the actual launcher/payload/helpers/lsof/
  libproc/OS exactly as before — STATIC EXPECTATION data,
  never a Native availability proof. The pure
  `createMonitorBackendCapture({expectedBackendIdentity,
  captureOptions}) -> frozen {capture(ready,h,retainActual),
  verifyStartup}` uses the same private expectation helper
  and the genuine `captureBackendIdentity`, never an
  injected verifier/capture callback: helperPaths copied,
  expected data snapshot-frozen, `capture` calls the
  genuine entry with the dynamic SAME original budget h and
  actual retainActual (no new deadline), and `verifyStartup`
  is null only for omitted isolated-library compatibility —
  otherwise it awaits the genuine capture then checks the
  same-handle live guard plus pure expected equality (no
  fake/no-op operational verification). One shared internal
  bounded file/OS/hash assembly backs both entries over the
  original ONE `createBackendReader` — no copied IO
  implementation, second ledger or cache. C4b-10: the setup
  entry binds the actual darwin/arm64 host before any IO
  (trusted `osPlatform`/`osArch` adapters exist for isolated
  tests only, defaults the real Node properties); every
  fresh synchronous resolve runs under ONE same-handle
  `liveResolve` — `assertLive` before AND after the actual
  resolve, raw throws/null propagating unchanged, passed
  into `resolvePythonProcessImage` too; and the factory
  rejects reserved own `ready`/`budget`/`retainActual`/
  `setup`/`pyMeta` keys via `Object.hasOwn` before IO,
  binding the genuine passed fields LAST.
- `processes.mjs` (398 -> 399): two exports and the
  returned-13 public roster unchanged. New optional
  DATA-only `expectedBackendIdentity` (undefined omitted;
  malformed/null rejected BEFORE the constructor bound
  getter or any IO — operational C4b always supplies the
  frozen `CommonIdentity.environment.monitoring`); the WHOLE
  backendIdentity capture-options closure delegates to
  `createMonitorBackendCapture` over the same bound
  config/clock; public `backendIdentity(options)` still
  performs the fresh actual capture; only the private
  trusted `authority.verifyExpectedBackend =
  backendCapture.verifyStartup` is added — no new public
  callback/proof hook and omitted-caller behavior retained.
- `process-runtime.mjs` (387 -> 398): four exports/results
  and lifecycle semantics unchanged, constructor still pure
  and lazy. The private nullable trusted
  `authority.verifyExpectedBackend` (never a user-provided
  runtime hook) is awaited AFTER the real awaitReady AND
  the existing genuine Native `proveBootstrap`, BEFORE the
  ownUid/readyEvidence/lsof/timer/first-cycle/start-ready
  commits, using the SAME start h and the SAME
  `ownOperation` `lifetime.retainActual` — `h.assertLive`
  plus the monotonic stopping fence are rechecked
  immediately before/after the awaited stage and before
  every commit; no new budget/clock/queue/owner/ledger or
  global join, no queued public API or self-wait, and no
  phase/workload admission until the actual start resolves.
  Physical collector adoption, proof/ACK guards and
  stop/error cleanup are untouched.
- `process-backend-setup.test.mjs` (NEW, TEST-only,
  excluded from the functional-runtime union): meaningful
  pure-fake coverage — a strict config-derived static
  descriptor equals the existing verified capture on the
  SAME supplied Python facts; launcher AND payload bytes
  retained/hashed; duplicate/unknown/missing/malformed/
  wrong-version/system-site and home/executable/command
  mismatches all fail closed; malformed UTF-8, config
  prelude errors and ready-shaped input trigger no IO;
  supplied malformed expectation and `null` reject
  synchronously before IO; the expected snapshot stays
  immune to original mutation; expected match/mismatch runs
  through the real capture under the SAME borrowed
  handle/retainer; an already-spent handle performs no
  fresh IO; omitted expectation preserves isolated
  compatibility while capture stays real — over existing
  fakeClock/fakeFile/fakeFileSystem/createBudgetHandle and
  a genuine lifetime only, no Kernel/real child/actual
  environment mutation and all platform fakes explicitly
  isolated (never availability evidence).

The `environment.monitoring.python ===
environment.python.runtime` full-eight-field coherence, the
original helper-paths/hash capture, the ENOENT-only
shared-cache rule and the real reader close receipts stay
intact — every fresh actual resolve/stat/read runs under
the original live handle with no reset; the launcher
seven-field facts are not repurposed as the full identity
and Runtime070/model6/protected17 are unchanged. No test,
import, Native, browser, model, network or Git execution
occurred and no green/phase/parity/strength claim is made.

C4b-10 (scope
`c4b-scope-10-backend-guard-corrections.json`; same global
119 / map 217 unchanged / Runtime `070fbf` byte-exact)
closes three concrete source-contract gaps in the same
owners: the static setup entry now binds the ACTUAL host —
real `process.platform`/`process.arch` must equal the
pinned darwin/arm64 BEFORE any config/FS IO (static
expected facts only, never Native readiness), with trusted
`osPlatform`/`osArch` adapters defaulting to the real Node
properties for isolated tests and malformed supplied
adapters failing closed before IO — while the
verified-ready entry's Native-ready platform/ABI guards
stay unchanged. ONE same-handle `liveResolve` wrapper over
the original supplied resolve function now fences every
fresh synchronous resolve — `assertLive` BEFORE the actual
resolve and AFTER a successful return, raw throws and
null/undefined propagating unchanged — and is passed into
`resolvePythonProcessImage` as well. The monitor-capture
factory rejects reserved own authority keys
`ready`/`budget`/`retainActual`/`setup`/`pyMeta` in
`captureOptions` synchronously BEFORE any IO
(`Object.hasOwn` catches even nonenumerable props) and the
genuine passed `ready`/`budget`/`retainActual` are bound
LAST. Coverage: the setup owner gains a
non-darwin/malformed-adapter no-IO case and the backend
owner gains reserved-key no-IO plus
one-live-guarded-resolve cases — the meaningful
affected-whole-owner commands are `node --test
--test-concurrency=1
train/scripts/browser_eval/process-backend.test.mjs` and
the same for `process-backend-setup.test.mjs`; no test,
import, Native or green claim is made.

## C4b-11 connected browser/server fixture resources (declared before creation)

Declared before creation under scope
`c4b-scope-11-connected-resources.json` (global 119 /
active 22 / map 217 -> 219 — exactly TWO TEST-only Create
rows for `server.test.mjs` and `browser.test.mjs` appended
at the unique tail of the unified map immediately before
`### 3.`, every prior map action/path/order preserved, the
locked Runtime `070fbf` slice byte-exact) on
`feat/tinyaz-browser-harness` at committed base
`a49f83f473a72c57f5bc66b8d2ded142d35cd074`; the five
remaining functional-runtime inputs keep their already-
mapped Create rows and are implemented under the current
C4b contracts here, which supersede earlier proposal
wording wherever it differs. This slice claims no test
result, phase admission, Native/browser/model execution
or green status.

- `server.mjs` — sole export
  `startFixtureServer({snapshotRoot,harnessRoot,
  dependenciesRoot,modelRef,arm,capabilities},
  dependencies?) -> Promise<frozen {engineUrl,workbenchUrl,
  listener,close}>`. Every serializable input is
  validated/copied/frozen before the first await; `arm` is
  exactly `candidate`/`baseline`; `modelRef` is the
  explicit `{path,byteLength,sha256,metadataPath}`
  descriptor required to equal the `MODEL_IDENTITY` pin
  from `schema-constants.mjs` (the pin, never the caller
  hash, is the authority — actual file bytes must hash to
  it after the registration ACK). Roots are absolute,
  rejected when the supplied path is a symlink or not a
  real directory, canonicalized through `realpath`, and
  the snapshot must contain a real `src/`; the fixture
  HTML stays confined under
  `harnessRoot/train/scripts/browser_eval`. Vite runs with
  `configFile:false`/`envFile:false`/`publicDir:false`/
  `appType:"custom"`, `server.host:"127.0.0.1"`,
  `port:0`, `hmr:false`, `fs.strict:true` allow limited to
  the fixture root, snapshot `src`, the recorded
  dependencies root and a run-owned `os.tmpdir()` cache;
  `@` aliases the snapshot `src` and
  `react`/`react-dom`/`chess.js` resolve explicitly from
  the recorded dependencies root. The real
  `vite.createServer`, `@vitejs/plugin-react` and
  `@tailwindcss/vite` factories arrive through the
  `importModule` dependency — defaults dynamically resolve
  the recorded installed packages via
  `createRequire(dependenciesRoot)` + dynamic `import()`;
  the private trusted test-dependency keys are exactly
  `lstat`/`stat`/`readFile`/`realpath`/`sha256`/
  `importModule`, never a public CLI or capability field.
  The bound listener registers `{kind:"fixture",
  rootPid:null,expectedExecutable:null,listener:{address,
  port}}` through `capabilities.register` and the real ACK
  is awaited BEFORE model bytes are read or any route
  admits traffic (the `admitted` gate answers 503
  earlier). Routes are evaluation-only: `/engine` serves
  the transformed fixture HTML with the frozen
  `window.__tinyazArm` arm/config injected as DATA;
  `/workbench` is candidate-only; `/weights/*` serves only
  the verified model/metadata bytes — any baseline
  `/weights/*.bin`/`*.json` normalizes to the exact pinned
  M/metadata while candidate requests outside the exact
  `MODEL_URL`/`META_URL` fail 404; each controlled
  delivery is emitted through
  `capabilities.event("delivery",fact)` when available —
  no baseline Native identity is ever fabricated. The
  caller signal fences every await, post-listen failure
  closes the real server, and `close()` runs the genuine
  `vite.close()` once with error preservation.
- `browser.mjs` — sole export
  `openBrowser({environment,workspaceRoot,capabilities},
  dependencies?) -> Promise<frozen {openGame,openWorkbench,
  close}>`. `environment.chromium` is the recorded
  EXEC_SPEC `{invocationPath,realPath,sha256,version}` and
  `environment.launch` the recorded literals
  (`127.0.0.1`/headless/`{1280,800}`/scale `1`/args/
  security hash) — any deviation or private field rejects
  before work. Only public `chromium.launchServer`/
  `process`/`wsEndpoint`/`connect` plus context/page
  methods are used; launch receives the recorded
  executable/headless/args with `downloadsPath`/`TMPDIR`
  confined under `workspaceRoot`. Registration runs in the
  caller driver Node — first `{kind:"browser",rootPid:
  process().pid,expectedExecutable:chromium.realPath,
  listener:null}`, then `{kind:"fixture",rootPid:null,
  expectedExecutable:null,listener:{address,port}}` — and
  BOTH real ACKs complete before `chromium.connect`,
  context/page creation or model work; the endpoint must
  parse as strict `ws://127.0.0.1:<port>` and capability
  path/token never enters evidence. `openGame` creates two
  isolated contexts on the same launched Chromium (no
  cross-game cache/tree), gates every request to the
  recorded loopback fixture origins and closes partials on
  error; `openWorkbench` does the same for the one
  candidate context. Unexpected process exit/disconnect is
  a sticky fault; failed requests/page errors are emitted
  through `capabilities.event("fault",fact)` when
  available, never silently passed; expected close is
  marked BEFORE graceful teardown, `close()` runs real
  `browser.close()`/`server.close()` once preserving the
  first error for duplicate callers, and external abort
  rejects ordinary waits while starting that same
  graceful close — public close is never a Native
  physical proof. Private trusted test-dependency keys are
  exactly `importModule` (default the actual installed
  `playwright` dynamic import) and `mkdir`.
- `fixture.html`/`fixture.mjs` — the evaluation-only
  engine fixture: `#root` plus the `/fixture.mjs` module
  script; the module does NO model/context work at import
  and installs exactly
  `window.__tinyazEval = {initialize,think,numeric,
  dispose}` driven by injected `window.__tinyazArm` data.
  Candidate initialize dynamically imports the actual
  `@/lib/chess/think-client.ts` `createThinker()`, awaits
  the real `thinker.ready` and returns the actual
  `SessionReady`; think builds the actual `RequestContext`
  (real `engineSessionId`/`gameGeneration`/`requestId`/
  `position`/`requestedVisits`) and returns the actual
  `ThinkResponse`; numeric uses the actual
  `createPositionState`/`pushPositionMove`,
  `encodeBoard(state.board,state.rawEpTarget)`,
  `unpackWeights` over the verified delivered bytes,
  `forward` and `encodeMovePlane` and emits all
  planes/logits/legal-UCI-and-indices/rawEP/value/fen/
  history; dispose terminates the real thinker. Baseline
  uses the same snapshot modules at their recorded paths —
  the real old Ready/`think(fen,visits)` over a
  chess.js-replayed FEN, with the external controlled M
  delivery recorded separately by the server — no
  invented digest/context/epoch, no alternate
  search/encoder/network, no trained-to-random fallback.
- `workbench-fixture.mjs` — imports the actual
  `@/components/chess/workbench.tsx` `Workbench`,
  `react`/`react-dom/client` and the actual
  `@/styles.css`, mounting the component as-is through
  `createRoot` — no production route, component test
  props, alternate UI or synthetic replacement; the
  baseline arm gets no workbench URL.
- `server.test.mjs`/`browser.test.mjs` — TEST-only
  whole-owner pure-fake suites (excluded from the
  functional-runtime union): injected fake
  Vite/Playwright namespaces through `importModule`, real
  confined temporary roots/files, fixed-shape
  capabilities with controlled ACK gates — proving ACK
  ordering before exposure/connect/model reads,
  confinement/descriptor/arm/environment rejections,
  baseline-only M normalization vs candidate-S failure,
  evaluation-only route rules, isolated per-game contexts
  with origin gating, unconditional partial/abort
  cleanup, sticky unexpected closure vs expected-close
  marking, and duplicate/failure close error preservation.
  Meaningful whole-owner commands for Main: `node --test
  --test-concurrency=1 train/scripts/browser_eval/
  server.test.mjs` and the same for `browser.test.mjs`.
  No test, import, Native, browser, model, network or
  green claim is made.

C4b-11c correction slice under
`c4b-scope-11c-resource-corrections.json` (global 128 /
active 24 / map 219 -> 221 — two Create rows appended at
the same unique map tail) at committed base
`a49f83f473a72c57f5bc66b8d2ded142d35cd074`; it declares
BOTH cohesive new leaves before creation and corrects
concrete `server.mjs`/`server.test.mjs` defects while
`browser.mjs`/`browser.test.mjs`/`fixture*` stay
read-only until the immediately-following 11d slice:

- `connected-resource-test-fixtures.mjs` — TEST-only
  shared leaf, EXACT11 exports `BROWSER_ENV`,
  `makeBrowserCaps`, `fakePlaywright`, `makeBrowserArgs`,
  `SERVER_MODEL_BYTES`, `SERVER_META_BYTES`,
  `makeServerTree`, `makeServerCaps`, `fakeVite`,
  `makeServerDeps`, `hitFixture`; the complete helper
  bodies/comments/private dependencies (`makePage`,
  `HTML`, the fake server/browser/process) move whole
  from BOTH connected-resource owners under these alias
  names, and the leaf imports Node plus the existing pure
  `canonical-json`/`schema-constants`/`test-fixtures`
  modules only — never `server`/`browser`/
  `browser-contexts` or any `*.test.mjs` owner.
  `SERVER_MODEL_BYTES` is a unit-controlled buffer of
  exactly `MODEL_IDENTITY.byteLength` and
  `makeServerDeps.sha256` returns the pin only for those
  bytes — the real Node digest otherwise, so metadata
  records its own actual digest.
  `BROWSER_ENV.launch.securityOptionsSha256` is the REAL
  `SHA256(canonicalBytes({headless:true,
  chromiumSandbox:true,ignoreDefaultArgs:false,
  args:[copiedArgs]}))` — the binding declared for 11d:
  actual `launchServer` MUST run `chromiumSandbox:true`,
  the browser recomputes and checks this exact constant
  against the recorded field, no schema field is added.
  `fakePlaywright.chromium` is a CLASS instance exposing
  public `launchServer`/`connect` and the fake route
  `Request.url` is a function.
- `browser-contexts.mjs` — declared functional-runtime
  leaf (created in 11d): sole export
  `createBrowserContexts({browser,launch,assertLive,
  noteFault}) -> frozen {openGame,openWorkbench,
  closeAll}` — pure constructor over the ONE connected
  public `Browser`; the whole per-context/page/
  origin-gate/close methods move out of `browser.mjs`
  over the same public functions, real effects only
  through the explicit methods, per-context
  expected-close before actual close, actual resource
  pointers retained until true close; DAG
  `browser -> contexts -> existing pure
  protocol/values` — contexts never imports its parent.
- `server.mjs` corrections: `capabilities.signal` uses
  the REAL `AbortSignal.prototype.aborted` getter `.call`
  in a guarded try plus `add/removeEventListener` (duck/
  prototype fakes reject before IO); the Vite `root` is
  the canonical SELECTED `snapshotRoot`, `cacheDir` is
  `<workspace>/cache/<arm>` under the derived frozen
  `<workspace>/inputs/{harness,<arm>,model/}` layout
  (other or mixed root bindings reject), `fs.allow` is
  exactly `[snapshotReal, fixtureDir, depsReal,
  cacheDir]`, `server.watch:null` joins `hmr:false`, and
  pages rewrite the module script to `/@fs/<fixtureDir>/
  <module>` URLs; baseline normalization is EXACTLY
  `/weights/tinyaz-s.bin` -> pinned M (all other
  `*.bin`/`*.json` 404 on either arm); delivery facts
  record the ACTUAL served `byteLength`/`sha256` and the
  `cap.event("delivery")` record is awaited inside the
  route before the response — a rejected record surfaces
  as `next(error)`; admission also requires
  `!signal.aborted && !closing`, `close()` fences
  admission synchronously before the real `vite.close()`,
  and `fence()` runs before AND after every fresh
  await/IO inside `confineDirectory`/`confineFile`.
- `server.test.mjs` keeps its original seven test names/
  assertions with helpers imported from the shared leaf
  under identical local aliases; added coverage: genuine
  vs duck/prototype signal fakes with zero IO, abort
  inside the first `lstat` blocking later `stat`/imports,
  workspace-internal root/cacheDir assertions, strict
  S-only baseline plus arbitrary-bin 404, actual metadata
  digest facts, and the awaited delivery ACK holding the
  response with a rejected record surfacing through
  `next(error)`.

C4b-11d correction slice under
`c4b-scope-11d-compact-identical-authority.json` (same
global 128 / active 24 / map 221 — the two 11c Create
rows already cover both new leaves) at committed base
`a49f83f473a72c57f5bc66b8d2ded142d35cd074`; it creates
the declared `browser-contexts.mjs` and corrects
concrete `browser.mjs`/`browser.test.mjs`/`fixture.mjs`
defects while the shared TEST leaf, `server.mjs` and
`server.test.mjs` stay read-only:

- `browser-contexts.mjs` — CREATED functional-runtime
  leaf exactly as declared in 11c: sole export
  `createBrowserContexts({browser,launch,assertLive,
  noteFault}) -> frozen {openGame,openWorkbench,
  closeAll}` — pure constructor invoking nothing; the
  whole `parseHttpUrl`/route-gate/`newIsolatedContext`/
  page+worker tracking/`closeOnce`/`openGame`/
  `openWorkbench` block moved out of `browser.mjs` over
  the same borrowed closures. Every fresh
  `newContext`/`route`/`newPage`/`goto` await is fenced
  before AND immediately after with the returned
  resource adopted into `owned` BEFORE the post-fence;
  cleanup never runs the ordinary fence; per-context
  `expected` marks BEFORE the true close and entries
  leave `owned` only on real close fulfillment;
  `closeAll` attempts every admitted context retaining
  the FIRST arbitrary thrown value by an explicit
  presence flag.
- `browser.mjs` — genuine `AbortSignal.prototype.aborted`
  getter `.call` brand validation; the Playwright
  `chromium` surface is accepted as a non-null object
  with public `launchServer`/`connect` (the real
  BrowserType is a class instance — no isObj brand
  check); `launchServer` binds `chromiumSandbox:true`
  and `ignoreDefaultArgs:false`, explicit
  security-disabling args (`--no-sandbox`,
  `--disable-web-security`, `--disable-setuid-sandbox`)
  reject outright, and `securityOptionsSha256` is
  recomputed EXACTLY over
  `canonicalBytes({headless:true,chromiumSandbox:true,
  ignoreDefaultArgs:false,args:[copiedArgs]})` — never
  a caller-supplied hash. `cap.manifest.phase` makes
  unexpected worker/model faults sticky only in the
  `compare`/`preflight` cohort phases — deliberate
  check-phase facts record through `cap.event("fault")`
  without poisoning the run — while crash/process/
  disconnect facts stay fatal always; `noteFault`
  guards synchronous sink throws and rejections. One
  flag-guarded `teardown` shared by `close()` and the
  startup catch runs contexts -> browser -> server
  all-attempted with the first arbitrary value
  retained (null/undefined included); `close()` arms
  the memoized promise before effects, new ordinary
  calls reject on `closing`, and the abort listener's
  close rejection is handled into the sticky slot.
- `fixture.mjs` — delivered model bytes verify the
  ACTUAL `crypto.subtle` SHA-256 against the injected
  `cfg.model.sha256` pin before `unpackWeights`/
  numeric (byteLength alone was not a check); each raw
  parity case `{id,initialFen,movesUci,
  expectedRawEpTarget}` replays
  `createPositionState(initialFen)` then ONE
  `pushPositionMove` per `movesUci` entry and compares
  the actual `rawEpTarget` to the recorded expectation;
  `dispose` binds the literal `terminate()` on both
  arms — no `dispose` duck fallback.
- `browser.test.mjs` — keeps its original nine test
  names/assertions with the helpers imported from the
  shared leaf under identical local aliases; added
  coverage: duck-signal rejection before work, wrong
  digest/stale-digest/correctly-hashed `--no-sandbox`
  rejection, `Request.url()` as a function, abort at
  the first `mkdir` never reaching launch, a nil first
  close value retained with all closes attempted, the
  abort-driven close rejection handled, and quiet
  expected teardown vs cohort-sticky vs check-recorded
  worker closes.

C4b-11e final existing-file corrections under
`c4b-scope-11e-final-existing-resource-fixes.json`
(same global 128 / active 24 / map 221 — no new file,
no new map row) at committed base
`a49f83f473a72c57f5bc66b8d2ded142d35cd074`; concrete
defect fixes only, all case names/assertions/comments
preserved:

- `connected-resource-test-fixtures.mjs` — `fakeVite`
  returns the faithful `{calls, createServer}` shape
  over the SAME recorded calls object (the real defect
  behind the actual first-case TypeError); `makeServerTree`
  and `makeBrowserArgs` register root removal on the ONE
  existing `watchdog-teardown-test-fixtures` per-test
  owner instead of independent `t.after` rm; the tree
  adds `inputs/setup/tinyaz-m-metadata.json`; EXACT12
  exports add `ownResourceStart(t, issueThunk,
  {release})` — release callbacks prearm before issue,
  `ownFixtureAttempt` returns the IDENTICAL original
  start promise, the settle stage awaits the actual
  start body then closes the produced fake-SDK resource
  (expected close rejections stay on the caller
  channel; neutral settlement, never a Native/FD
  proof). New DAG edge: TEST leaf -> teardown owner
  (`registerFixtureTeardown`/`ownFixtureAttempt`), no
  project backedge.
- `server.mjs` — `cap.event` is REQUIRED (missing sink
  rejects before IO); `fence()` wraps EACH `importModule`
  and confinement await before AND after; the awaited
  `delivery` record and `transformIndexHtml` recheck
  admission/signal/closing before `res.end` so a late
  ACK after close answers 503; the injected config
  installs `window.__tinyazArm` via `Object.defineProperty`
  with an in-page deep-freeze literal (non-writable,
  non-configurable DATA); retained metadata binds
  `<workspace>/inputs/setup/tinyaz-m-metadata.json`;
  `close()` arms the memoized promise BEFORE the SDK
  effect; the original `isSignal` braced guard is
  restored (the 424->392 reflow accidentally dropped
  its braces).
- `browser.mjs`/`browser-contexts.mjs` — the actual
  public `Page.on('worker')`/`Worker.on('close')`
  events replace `workercreated`; `browser.close()` and
  each context entry arm their memoized close promises
  via `Promise.resolve().then` BEFORE any SDK callout
  (reentrant close shares the ONE attempt; the startup
  catch routes through the same `close()`); partial-start
  catches call the SAME `closeEntries`.
- `server.test.mjs`/`browser.test.mjs` — every
  `startFixtureServer`/`openBrowser` issue wraps
  `ownResourceStart` with controlled gates in the
  owner's release stage; the vm-executed injected
  script proves the frozen non-writable descriptor;
  added coverage for missing `cap.event`, stray
  metadata path, late-ACK 503, same-promise reentrant
  close and a `null`/`undefined` first-value loop.
- `driver-bridge-lifecycle.test.mjs` — appended a fifth
  case (real confined temp tree, fakeVite only, genuine
  AbortSignal, held model-read entry) proving the ONE
  owner ordering release -> actual start-body
  completion -> fake-SDK close -> root removal via an
  `afterSettle` probe plus post-dispose ENOENT; the
  original four bridge case names/assertions are
  preserved.

## C4b-12 readable backend setup capacity corrections
(declared before creation)

Under `c4b-scope-12e-readable-setup.json` on
`feat/tinyaz-browser-harness` at committed base
`5f3fb4cc563c1a6859acb5264a073ea47b439215` — global 129 /
active 6 / map 221 -> 222 (exactly ONE TEST-only Create row
for `process-backend-test-fixtures.mjs` appended at the map
tail, every prior action/path/order and the locked Runtime
`070fbf` slice preserved). Source-only capacity
corrections:

- `process-backend-reader.mjs` — roster becomes EXACT6
  exports: the WHOLE `SYSTEM_VERSION_PLIST` constant, its
  responsibility comments and the complete
  `defaultReadOsBuild(readFile)` move out of
  `process-backend.mjs` verbatim (the `export` keyword is
  the only change); the reader already owns the IDENTICAL
  `acct` factory, no IO runs at import/factory and no new
  owner/timer/queue/clock exists. The backend imports the
  same function and keeps the SAME
  `readOsBuild = defaultReadOsBuild` default with the
  callback still bound to the original backend `readFact`
  and entry `handle`; the public Backend roster stays
  EXACT3 and the expanded comment/guard wording is
  otherwise byte-preserved.
- `process-backend-test-fixtures.mjs` — TEST-only leaf
  declared before creation, EXACT4 exports `BACKEND_SETUP`
  (frozen
  `{PY,ROOT,PLIST,CFG,HOME,LAUNCH,BASE,HELPERS,CFG_TEXT}`),
  `backendSetupReady`, `backendSetupFiles`,
  `backendSetupAdapters`: the whole fake Homebrew-layout
  fixture block moves verbatim from
  `process-backend-setup.test.mjs` with `resolveLaunch`
  private. Imports `schema-constants` plus
  `supervision-test-fixtures` (`fakeFile`) only — never
  `process-monitor-test-fixtures` (real import-side
  interpreter/lsof realpath would change the all-fake
  suite). DAG one-way: setup test -> leaf ->
  constants/fixture modules.
- `process-backend-setup.test.mjs` — imports the SAME4
  bindings under the local aliases
  `ready`/`fullFs`/`adapters` and destructures the data
  constants from `BACKEND_SETUP`;
  `captureReady`/`captureSetup`/`acct`/`handle` stay in the
  suite with all eleven original case names/assertions
  plus the raw-alias and invalid-metadata cases preserved;
  `fakeFile` stays imported for later bodies.
- truthful setup-metadata contract —
  `captureSetupBackendIdentity` REQUIRES
  `options.setupPythonMetadata` EXACT4
  `{version,executable,prefix,basePrefix}` pinned to the
  selected interpreter; the pure
  `capturePythonSetupMetadata` reader export
  validates/copies/freezes it BEFORE any IO and
  `liveResolve` compares the canonical RAW `basePrefix` to
  the launcher parent-parent while the recorded value
  keeps the raw alias verbatim. The supplied value is the
  ISOLATED selected-Python software audit executed
  independently BEFORE manifest/Native — never
  monitor-verified, never ready-shaped, never Native
  proof; the shared `pyMeta` slot carries genuine
  verified-ready facts on the monitor entry and that
  isolated setup data on the static entry.

## C4b-13 actual environment capture declared APIs (declared
before creation)

Under `c4b-scope-13a-setup-provider.json` on
`feat/tinyaz-browser-harness` at committed base
`f78ed5e75e1f76be68102196f514527358f3a3b2` — global 133 /
active 3 / map 222 -> 226 (exactly FOUR Create rows appended
at the map tail, every prior action/path/order and the locked
Runtime `070fbf` slice preserved). Declared APIs only; the
13a packet creates `setup-process.mjs` alone and the
remaining three owners are created under their own packets:

- `setup-process.mjs` — functional-runtime leaf, SOLE export
  `runSetupCommand({executable,args,cwd,env,maxBytes},
  context, adapters?) -> Promise<{stdout,stderr,exitCode}>`:
  bounded one-shot setup command through the lowlevel spawn
  (default Node `child_process.spawn`, `shell:false`, stdio
  `ignore/pipe/pipe`); argv/cwd/env validated and copied
  before the first await, executable/cwd absolute, `maxBytes`
  positive and bounded by `FIXED_LIMITS.ipc.frameBytes`;
  context EXACT `{budget,lifetime}` — the SAME borrowed
  BudgetHandle plus a genuine `assertWatchdogLifetime` owner;
  adapters is the isolated lowlevel spawn ONLY. Two neutral
  receipts (raw issuance, physical child) arm and
  strong-index BEFORE the first `retainActual` callout;
  adoption precedes any shape/pid read; actual exit plus BOTH
  real pipe closes alone retire the physical debt; each pipe
  counts its byte total before append (a bound crossing is a
  recorded failure, never silent truncation); nonzero exits
  and stderr are DATA for the parent; the first raw spawn/
  stdio failure value throws verbatim behind a presence flag
  (null/undefined retained); `waitHandle` on the same handle
  bounds the public wait with the original absolute end. Runs
  fixed setup commands before manifest only — never claims
  phase/readiness/cleanup/Native proof, never kills/polls.
  Imports `process-budget`, `watchdog-lifetime`,
  `protocol-values`, `record-schema` limits and Node
  `child_process` only — never a parent, Native or TEST edge.
- `environment-python.mjs` — declared functional-runtime
  leaf, SOLE export `capturePythonEnvironment(
  {pythonExecutable,torchWheelPath},context,adapters?) ->
  {metadata,packages,setupFiles}`: the ACTUAL isolated
  selected-Python software audit executed independently
  BEFORE manifest/Native, never monitor-verified or
  ready-shaped. Imports this setup provider plus pure
  metadata helpers only.
- `environment.mjs` — declared functional-runtime owner,
  exports `captureEnvironment({recordRoot,pythonExecutable,
  chromiumExecutable},context,adapters?) -> {environment,
  setupFiles}` (premanifest actual audit) and
  `verifyEnvironment({expectedEnvironment,recordRoot},
  context,adapters?) -> Environment` (post-stop same-process
  file/OS/inventory verification — NEVER spawn or Native calls);
  genuine Backend8 unchanged. Imports Python + Setup +
  Backend.
- `environment.test.mjs` — declared TEST entry (no exports):
  faithful lowlevel adapters, no actual Native/browser/
  model; excluded from the functional-runtime union.
- DAG one-way: environment -> python + setup + Backend8;
  python -> setup + pure helpers; setup -> budget/lifetime/
  protocol values only — never parent/Native/TEST. The three
  runtime leaves join the functional-runtime input union; the
  TEST owner does not. Source-only declaration — no test
  result, phase, Native/browser/model or green claim.

## C4b-13c python program/evidence and setup-actual split
(declared before creation)

Under `c4b-scope-13c-program-split.json` on
`feat/tinyaz-browser-harness` at committed base
`f78ed5e75e1f76be68102196f514527358f3a3b2` — global 136 /
active 3 / map 226 -> 229 (exactly THREE Create rows appended
at the map tail, every prior action/path/order and the locked
Runtime `070fbf` slice preserved). Same-change capacity repair
on the frozen provider source plus two actual audit false-pass
corrections — concrete repair, never new architecture or
approval. This packet creates `environment-python-program.mjs`
alone; `environment-python-evidence.mjs` and
`setup-process-actual.mjs` are created under their own later
packets:

- `environment-python-program.mjs` — functional-runtime leaf,
  SOLE TWO named exports `AUDIT_SCRIPT` and `PIP_RUNNER` as
  the SAME fixed string bindings: the WHOLE deadline
  bootstrap/pip-runner/audit program group moved verbatim out
  of `environment-python.mjs` with every comment/literal byte
  (`DEADLINE_BOUND` stays private), no project imports and no
  IO at import — pure program data. The moved audit keeps all
  RECORD/wheel checks and closes two actual false-pass gaps:
  each row's real installed digest is preserved as private
  audited data (no new report field) and EVERY ordinary
  archive file member is compared to it byte-for-byte even
  when the RECORD hash field is empty — only the exact known
  regenerated `<dist>.dist-info/RECORD` member is exempt,
  generated/install-only stay honest separate classes,
  unmapped members and all other mismatches fail closed — and
  duplicate archive file-member names reject before any
  insert/hash comparison instead of silently overwriting.
  DAG `python facade -> program`, no backedge. Runtime union.
- `environment-python-evidence.mjs` — declared
  functional-runtime leaf, SOLE export
  `readPythonEnvironmentEvidence({audit,freeze,check,
  wheelPath,context,adapters?}) -> Promise<{metadata,packages,
  setupFiles}>`: the WHOLE parse/report/schema/prefix/
  RECORD/wheel-reader/evidence tail moves later from the same
  facade over the SAME borrowed budget/lifetime and the
  genuine backend reader — fixed Node fs/path/crypto plus
  pure schema/protocol helpers only, no injected
  verifier/status/phase authority and no subprocess; the
  helper owns `PIP_VERSION`, `RECORD_CAP`, `WHEEL_CAP` and
  the identical `acct` factory while the caller keeps the
  three-child ordering and captured arguments. DAG `python
  facade -> evidence -> reader/pure`, no reverse. Runtime
  union.
- `setup-process-actual.mjs` — declared functional-runtime
  leaf, SOLE exports `armSetupReceipt` and
  `adoptSetupHandle`: direct stable aliases of the WHOLE
  existing arm/adopt pair plus ONE private strong pending set
  and complete comments — the same receipt object/settler, no
  new counter/ledger/clock/owner/resolver copy; the whole
  actual-resource group moves out of `setup-process.mjs`
  under its own packet while the provider imports the aliases
  and retains the exit/pipe facts — no imports, no
  import-side IO, leaving room for the actual async-no-child/
  BOTH-pipe-close repair later without premature debt
  retirement. DAG `setup -> actual`, never reverse. Runtime
  union.
- DAG one-way: python facade -> program/evidence -> pure
  helpers/reader; setup -> actual; never a reverse edge. The
  three leaves join the functional-runtime input union.
  Source-only declaration — no test result, phase,
  Native/browser/model or green claim.

## C4b-13 environment assembly and static inventory contract

`environment.mjs` exports exactly `captureEnvironment(options, context,
adapters?)` and `verifyEnvironment(options, context, adapters?)`. Capture
options are `{recordRoot, pythonExecutable?, chromiumExecutable?}`; verify
options are `{expectedEnvironment, recordRoot, setupFiles?}`. Both borrow the identical
`{budget, lifetime}`. Options are copied before any await or callout.

`environment-files.mjs` is declared before creation. Its sole export is
`createEnvironmentFiles(context, adapters)`, the shared same-process owned
reader, directory inventory, installed Python RECORD measurement and
canonical-path owner. It imports Node fs/path and existing bounded reader,
budget, canonical and protocol helpers. DAG: environment -> files ->
reader/pure helpers. It never imports environment, spawns, creates another
budget/lifetime, or waits on its own lifetime zero. Complete original
relative file paths, lengths and digests form sorted inventory evidence.
Unexpected links, escapes, duplicate paths and unknown file kinds reject.

`environment-test-fixtures.mjs` is declared before creation. It exports
`makeEnvironmentFixture(t)` only: a confined temporary filesystem with
lowlevel path/stream/stat/directory adapters, faithful fake child events,
class-shaped public Playwright BrowserType, and genuine watchdog lifetime.
The sole teardown owner releases controls, joins actual bodies and both
pipe closes, observes fresh same-owner zero, then removes the owned root.
DAG: environment tests -> fixture -> Node/teardown/schema helpers. This
TEST-only leaf is excluded from functional runtime inputs.

`identity-schema.mjs` additionally exports `assertEnvironment(value)` as a
direct call of its existing closed Environment validator. Capture and
reverification use the same schema as CommonIdentity, including mandatory
monitoring Python/runtime equality. No duplicate shape validator is added.

Python capture/evidence accept optional isolated lowlevel `spawn`,
`statFile`, `createStream`, and `resolvePath` adapters; operational callers
omit them. The parent additionally accepts lowlevel directory, OS and
public Playwright-loader adapters. No identity, capture, verification,
ready-envelope or phase-result callback is injectable.

Capture measures the selected Python audit first, then genuine static
BackendIdentity. Node binary, package-lock, installed Node package builds,
Chromium executable and full application builds are measured. Chromium
selection uses public `chromium.executablePath()` on real class instances;
its version comes from the actual Info.plist. Launch security is SHA256 of
canonical `{headless:true, chromiumSandbox:true,
ignoreDefaultArgs:false, args:[]}`. There is no browser launch here.

Post-stop verification performs file, OS and inventory remeasurement only.
It never spawns Python, sysctl, Native or a browser after shutdown. Initial
isolated Python metadata and hardware-model provenance stay bound to the
same capture context; they are not relabeled as fresh subprocess facts.
Current executable, cfg, helper, library, import, RECORD, wheel, dependency,
OS and application bytes must still match. Setup buffers are deterministic
owned data, without PIDs, timestamps, deadlines or workspace identifiers.

`setup-process.mjs` accepts root `/` as an absolute working directory,
snapshots all five fields before retention callouts, enforces one combined
stdout/stderr byte ceiling and rejects signal-only exits. A trusted Node
asynchronous creation failure establishes no OS child only. Physical debt
still waits for BOTH allocated pipe close events. Synchronous unissued
Node failures retain the immediate no-resource path.

Pure verification command: `node --test --test-concurrency=1
train/scripts/browser_eval/environment.test.mjs`. Its controlled Python
bridge AST-selects the actual validator definitions and uses only stdlib
ZIP/tempfile fixtures. It does not import Torch, models or Native modules.

The files factory returns exactly frozen `{read, resolve, call, inventory,
pythonInstalled}`. `read(path, cap, tag, binary?)` is the same owned backend
reader result (`{buf,sha256}` or `{byteLength,sha256}`); `resolve(path)` is
synchronously guarded canonicalization; `call(tag, thunk)` retains a neutral
actual receipt before issuing bounded metadata IO.
`inventory(root, links = "none")` returns
`{files,links,sha256}`. Regular files retain complete sorted
`{path,byteLength,sha256}` facts. Link facts are sorted `{path,target}`;
the digest binds both arrays. Only confined relative framework links in
`"framework"` mode and Node `.bin` links in `"node-bin"` mode are accepted;
other links reject. Links are recorded without traversing them, so build
contents are not charged twice. `pythonInstalled(prefix)` returns
`{distributions,records,inventory}` with measured name/version/build digest,
original RECORD descriptors, and the complete site-packages inventory.
The full site inventory catches added unrecorded files such as `.pth`.
Construction has
no IO and captures only the same borrowed context and lowlevel adapters.
The fixture factory returns `{root, context, adapters, audit, write,
spawnCalls, finish, expire}`; write maps a fixture identity path into its
owned physical temporary root. `finish()` releases fake child exit and BOTH
pipe-close controls; the shared teardown owner subsequently joins actual
bodies and fresh lifetime zero before removal. `expire()` advances the
fixture's original clock beyond its original deadline.

Current implementation roles are Sol High implementation, Sol Max
orchestration/review, and Devin review. Earlier SWE provenance is preserved
as dated history. Verification in this milestone requires initial capture in
the same process, genuine lifetime and recorded root; it does not provide a
cross-process provenance admission API. Actual Native startup must still
independently match the complete backend identity before driver admission.

Current lowlevel environment adapter keys are exactly `spawn`, `statFile`,
`createStream`, `resolvePath`, `readdir`, `readlink`, `osPlatform`, `osArch`,
`osRelease`, `osVersion`, `cpus`, `totalmem`, and `loadPlaywright`. Supplied
bindings must be functions and are snapshotted before callouts. Python's
four-function subset is snapshotted independently. Public operations also
snapshot the identical original budget/lifetime references, so mutation of
the caller's context object cannot switch admitted resources mid-operation.
The runtime union adds `environment-files.mjs`; the TEST fixture is excluded.
The two appended map rows preserve all previous row actions and ordering.
The current environment test command includes one bounded real stdlib-only
Python bridge per wheel case. No selected-venv, Torch, model, Native or
browser child executes in that bridge. Historical no-real-spawn wording
applies to the earlier fake-child declaration, not this explicit exception.

Setup and finalizer verification are separate bounded operations. Each
invocation snapshots and uses its supplied original BudgetHandle throughout
that call. Provenance binds the original genuine lifetime, recorded root,
identity and captured data, not the earlier setup handle object. A later
live finalizer handle is accepted after the setup handle is disposed; a
spent current handle still rejects before new IO. Conflicting initial
inventories for the same captured environment cannot overwrite provenance.

The existing TEST fixture additionally exports
`runPythonAuditValidatorCases() -> undefined`, an explicit test-registration
helper. The complete prior wheel bridge/case group moves there without
changing its three case names or assertions. The bridge also AST-selects
actual distribution audit definitions for confined stdlib-only own/vendored
RECORD cases. No tests register at module import. Python audit selection
requires exactly one top-level `<name>-<version>.dist-info/RECORD` matching
normalized distribution name and version; vendored RECORDs remain payload
rows. Failed setup child diagnostics retain exit/output counts and at most
4096 actual stderr bytes, with no return/status or raw-error substitution.

Operational immutable snapshots pass `setupFiles` to `verifyEnvironment`.
Its existing closed options additionally permit optional `setupFiles`, a
strict sorted unique array of exact `{path,bytes}` owned Buffers confined
to `inputs/setup/`. Explicit null/undefined are invalid; only true omission
retains isolated compatibility. Capture pins private exact byte descriptors
before exposing returned buffers. Verification compares supplied descriptors
to that genuine capture association, then performs unchanged file-only
remeasurement. Caller-crafted data cannot set provenance or skip inspection.

## C4b-14 immutable input capture contract

`snapshots.mjs` exports only `captureInputs({candidate,protocolPath,
workspaceRoot,environment,setupFiles}, {repoRoot,budget,lifetime})` returning
`{workspace,inputs,frozenCliPath}`, and `verifyIdentity({workspaceId,runId,
phase,expectedCommonIdentity,inputs}, {workspaceRoot,budget,lifetime})`
returning the freshly verified CommonIdentity. Each operation snapshots
serializable data and its original capability references before callouts.
Verification calls the genuine file-only `verifyEnvironment` directly;
there is no caller-supplied identity verifier or successful phase stub.
Same-process environment provenance remains required on the original owner,
using the current operation's live handle.

`snapshot-files.mjs` is declared before creation, runtime-only. It exports
frozen literal `RUNTIME_PATHS` and pure `createSnapshotFiles({workspaceRoot,
repoRoot,budget,lifetime})`. The frozen returned roster is exactly
`{readActive,readGit,listGit,listActive,writeFrozen,readFrozen,
linkDependencies}`. Read methods return owned Buffers, list methods return
sorted original relative regular-file paths, write returns the actual
workspace-relative ArtifactRef. Git reads use argv arrays and fixed
read-only commands. The three `inputs/{baseline,candidate,harness}/
node_modules` links share the measured canonical dependency root and are
excluded from frozen-file enumeration. No other links are accepted.

`snapshot-io.mjs` is declared before creation, runtime-only. Sole export
`createSnapshotIO({workspaceRoot,repoRoot,budget,lifetime})` returns frozen
`{call,readAt,writeFrozen,listAt,linkDependencies}`. `call(tag,thunk)` owns
raw metadata settlement before issue; `readAt(root,rel,readonly?,cap?)` returns
stable owned bytes; `listAt(root,prefixes)` returns original regular-file
paths. Explicit write/link operations exclusively create and seal inputs.
Actual open/read/write/close and Git child debt use existing genuine owners
and the same original bound. Mandatory actual close continues on failure;
a timeout cannot prove it complete or supply a new grace period.

`snapshot-identity.mjs` is declared before creation, runtime-only. Sole
exports `validateModelBytes(bytes)`, `inventoryDigest(refs)`, and
`assembleSnapshotIdentity({candidate,baselineFiles,candidateFiles,
harnessFiles,pythonFiles,environment})`. They are pure data validation and
assembly over original-path refs, the selected model pin and the existing
closed CommonIdentity validator. Model checking covers raw magic, packed
version, parameter count, source, exact length/digest and finite floats.

`snapshots.test.mjs` is declared before creation, TEST-only, no exports.
It uses confined temporary filesystem/Git data, actual pinned M bytes, and
existing shared teardown ownership. Synthetic environments are data only;
they cannot pass genuine environment provenance verification. No fixture
phase code, model inference, Native backend or browser executes.

DAG: snapshots -> files + IO + identity + environment; files -> snapshot-io +
setup-process; snapshot-io -> existing owned-file/reader/budget/lifetime
helpers; identity -> canonical/schema constants and closed identity schema.
No child imports its parent or a TEST owner. Runtime union adds both new
private runtime helpers; snapshots tests are excluded. Required missing
future runtime inputs fail closed. Active path sets and bytes are measured
before and after extraction. Committed candidates additionally bind active
executed inputs to the requested Git objects. Baseline stays fixed at
`bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`. Workspace creation and every file
are exclusive, readonly, and never resumed or removed on failure.

The exact current functional runtime union is the following literal list.
Package/lock and all genuine helper imports are included; TEST/docs/support
are excluded. This declaration supersedes earlier runtime registries:

```json
[
  "package-lock.json",
  "package.json",
  "train/fixtures/browser-openings.json",
  "train/fixtures/browser-parity.json",
  "train/fixtures/browser-protocol.json",
  "train/scripts/browser_eval/artifact-completion-failure.mjs",
  "train/scripts/browser_eval/artifact-completion.mjs",
  "train/scripts/browser_eval/artifact-files.mjs",
  "train/scripts/browser_eval/artifact-owned-file.mjs",
  "train/scripts/browser_eval/artifact-sinks.mjs",
  "train/scripts/browser_eval/artifact-store.mjs",
  "train/scripts/browser_eval/browser-contexts.mjs",
  "train/scripts/browser_eval/browser.mjs",
  "train/scripts/browser_eval/canonical-json.mjs",
  "train/scripts/browser_eval/check-engine.mjs",
  "train/scripts/browser_eval/check-workbench.mjs",
  "train/scripts/browser_eval/checks.mjs",
  "train/scripts/browser_eval/cli.mjs",
  "train/scripts/browser_eval/collector-protocol.mjs",
  "train/scripts/browser_eval/completion-file-observation.mjs",
  "train/scripts/browser_eval/completion-prepared-read.mjs",
  "train/scripts/browser_eval/completion-publication.mjs",
  "train/scripts/browser_eval/driver-bridge-methods.mjs",
  "train/scripts/browser_eval/driver-bridge-wire.mjs",
  "train/scripts/browser_eval/driver-bridge.mjs",
  "train/scripts/browser_eval/driver-protocol.mjs",
  "train/scripts/browser_eval/environment-files.mjs",
  "train/scripts/browser_eval/environment-python-evidence.mjs",
  "train/scripts/browser_eval/environment-python-program.mjs",
  "train/scripts/browser_eval/environment-python.mjs",
  "train/scripts/browser_eval/environment.mjs",
  "train/scripts/browser_eval/final-integrity.mjs",
  "train/scripts/browser_eval/fixture.html",
  "train/scripts/browser_eval/fixture.mjs",
  "train/scripts/browser_eval/identity-schema.mjs",
  "train/scripts/browser_eval/match-observations.mjs",
  "train/scripts/browser_eval/match.mjs",
  "train/scripts/browser_eval/page-arm.mjs",
  "train/scripts/browser_eval/parity-reference.py",
  "train/scripts/browser_eval/pgn-evidence.mjs",
  "train/scripts/browser_eval/pgn-format.mjs",
  "train/scripts/browser_eval/pgn-summary.mjs",
  "train/scripts/browser_eval/phase-fixtures.mjs",
  "train/scripts/browser_eval/phase-runners.mjs",
  "train/scripts/browser_eval/prerequisites.mjs",
  "train/scripts/browser_eval/process-backend-reader.mjs",
  "train/scripts/browser_eval/process-backend.mjs",
  "train/scripts/browser_eval/process-budget.mjs",
  "train/scripts/browser_eval/process-framing.mjs",
  "train/scripts/browser_eval/process-horizon.mjs",
  "train/scripts/browser_eval/process-lsof-fields.mjs",
  "train/scripts/browser_eval/process-lsof-io.mjs",
  "train/scripts/browser_eval/process-lsof.mjs",
  "train/scripts/browser_eval/process-macos-abi.py",
  "train/scripts/browser_eval/process-macos-native.py",
  "train/scripts/browser_eval/process-macos.py",
  "train/scripts/browser_eval/process-observation.mjs",
  "train/scripts/browser_eval/process-ownership.mjs",
  "train/scripts/browser_eval/process-proof.mjs",
  "train/scripts/browser_eval/process-runtime.mjs",
  "train/scripts/browser_eval/process-stop.mjs",
  "train/scripts/browser_eval/process-transport.mjs",
  "train/scripts/browser_eval/processes.mjs",
  "train/scripts/browser_eval/protocol-values.mjs",
  "train/scripts/browser_eval/receipt-files.mjs",
  "train/scripts/browser_eval/receipt-verification.mjs",
  "train/scripts/browser_eval/record-bookkeeping.mjs",
  "train/scripts/browser_eval/record-evidence.mjs",
  "train/scripts/browser_eval/record-finalization.mjs",
  "train/scripts/browser_eval/record-finalizer.mjs",
  "train/scripts/browser_eval/record-inputs.mjs",
  "train/scripts/browser_eval/record-lifecycle.mjs",
  "train/scripts/browser_eval/record-schema.mjs",
  "train/scripts/browser_eval/records.mjs",
  "train/scripts/browser_eval/reference-child.mjs",
  "train/scripts/browser_eval/run-driver.mjs",
  "train/scripts/browser_eval/run-supervisor.mjs",
  "train/scripts/browser_eval/run.mjs",
  "train/scripts/browser_eval/schema-constants.mjs",
  "train/scripts/browser_eval/schema-primitives.mjs",
  "train/scripts/browser_eval/server.mjs",
  "train/scripts/browser_eval/setup-process-actual.mjs",
  "train/scripts/browser_eval/setup-process.mjs",
  "train/scripts/browser_eval/snapshot-files.mjs",
  "train/scripts/browser_eval/snapshot-identity.mjs",
  "train/scripts/browser_eval/snapshot-io.mjs",
  "train/scripts/browser_eval/snapshot-reopen.mjs",
  "train/scripts/browser_eval/snapshots.mjs",
  "train/scripts/browser_eval/stats.mjs",
  "train/scripts/browser_eval/supervisor-protocol.mjs",
  "train/scripts/browser_eval/watchdog-admission.mjs",
  "train/scripts/browser_eval/watchdog-cleanup.mjs",
  "train/scripts/browser_eval/watchdog-config.mjs",
  "train/scripts/browser_eval/watchdog-driver-actual.mjs",
  "train/scripts/browser_eval/watchdog-driver.mjs",
  "train/scripts/browser_eval/watchdog-lifetime.mjs",
  "train/scripts/browser_eval/watchdog-operations.mjs",
  "train/scripts/browser_eval/watchdog-ordinary.mjs",
  "train/scripts/browser_eval/watchdog-records.mjs",
  "train/scripts/browser_eval/watchdog-runtime.mjs",
  "train/scripts/browser_eval/watchdog-selftest-operation.mjs",
  "train/scripts/browser_eval/watchdog-shutdown.mjs",
  "train/scripts/browser_eval/watchdog.mjs",
  "train/scripts/browser_eval/workbench-fixture.mjs",
  "train/scripts/browser_eval/workspace-footprint.mjs",
  "train/scripts/check_browser_parity.py"
]
```

Pure verification command: `node --test --test-concurrency=1
train/scripts/browser_eval/snapshots.test.mjs`. Capture checks do not imply
phase admission. WORKTREE remains forbidden for preflight/compare.

The facade uses the IO leaf's bounded `listAt(workspaceRoot,["inputs"])`
for a complete frozen path-set recheck, without expanding the file factory's
seven-method roster. Verification also reads the actual Store-written phase
manifest and binds workspaceId, runId, phase, input refs and CommonIdentity
hash to that record. Synthetic test setup can exercise capture as data, but
cannot pass the fixed genuine environment setup-provenance verification.

Workspace and frozen input files require readonly OS modes. The phase
manifest uses the same bounded owned reader without that mode requirement:
ArtifactStore enforces logical immutability and writes it with normal file
permissions. Its full schema and workspace/run/phase/common/input bindings
remain mandatory. The regression uses genuine ArtifactStore.writeOnce plus
the actual footprint observer, without a manual chmod of the manifest.
The snapshots TEST entry already had a canonical Create row; its existing
row is preserved. Only the three new runtime leaves append map rows.

## C4b-15 archived workspace admission

`snapshots.mjs` additionally exports private operational
`reopenInputs({workspaceRoot,candidate}, {repoRoot,budget,lifetime})`.
It admits an existing completed immutable workspace in a fresh archived
process. It never rewrites workspace/input files or imports expected hashes
as provenance. The original Git repository root is distinct from the
archived `inputs/harness` record root. Existing source, requested Git
objects, every original frozen inventory, exact readonly dependency links,
model and retained setup are independently remeasured before admission.
The new process performs genuine `captureEnvironment` against its archived
harness and compares actual identity and setup bytes to retained evidence.
Only that successful audit binds the existing owner's private association.

`snapshot-reopen.mjs` is declared before creation, runtime-only. Its sole
export `inspectReopenedInputs({workspaceRoot,candidate}, context)` returns
`{workspace,inputs,repoRoot,recordRoot,producerSetup}` after complete actual
read/hash/identity/setup verification. It receives the same exact capture
context `{repoRoot,budget,lifetime}` and owns no new deadline or lifecycle.
DAG: snapshots -> snapshot-reopen -> existing snapshot files/IO/identity,
environment capture and pure schema helpers. No parent/TEST backedge.
The literal runtime union adds this helper before use. Phase finalization
continues to use fixed file-only verification on the genuine new owner and
archived record root. No callback verifier, proof setter or resume path is
added. Missing runtime inputs continue to fail closed.

## C4b-15 locked protocol and game schedules

`browser-protocol.json` has closed `{schemaVersion,conventions,limits,
requiredCheckIds,preflight,comparison}` fields. Conventions, literal limits
and every fixed required-check set equal existing schema constants.
Preflight fixes the disjoint A/A FEN and five fresh requests per arm.
Comparison fixes the twenty-opening, forty-game schedule. No fixture field
can supply a pass, a different cap, adjudication or extra cohort.

`browser-openings.json` has closed `{schemaVersion,openings}`. Its ordered
entries are exact `{id,label,initialFen,movesUci}` records for the twenty
prefixes in locked Runtime section 6, with IDs p01 through p20. The ordinary
initial FEN and every six-ply UCI prefix remain literal fixed inputs.

`phase-fixtures.mjs` is declared before creation, runtime-only, exporting
`validateProtocolFixture(value)`, `validateOpeningFixture(value)`, and
`buildGameSchedule({phase,openings?})`. The validators return owned frozen
data and replay the actual pinned chess.js rules; they do no engine work.
The schedule returns exact game records `{gameId,pairNumber,gameNumber,
openingId,candidateColor,initialFen,movesUci}`. Compare uses p01-g1 through
p20-g2 with odd/even pair colors and both games completed before advancing.
Preflight uses only aa-g1/aa-g2 from the disjoint control FEN. No random
opening, tree, timeout loss, material/ply adjudication or inferred result is
introduced. DAG: phase runners/match -> phase-fixtures -> chess.js and
existing pure schema/constants. It never imports a parent or TEST source.

`phase-fixtures.test.mjs` is declared before creation, TEST-only, no exports.
It checks literal protocol bindings, exact locked opening prefixes/legal
rules, disjoint fixtures and schedule/color/accounting. Rules-only fixture
validation is not a played game or inference result.

## C4b-16 persisted PGN checkpoints

`pgn-evidence.mjs` is declared before creation. Sole export
`createPgnEvidence({workspaceRoot,runId,phase,gameSchedule}, {budget,lifetime})`
returns exactly `{observePersisted,freeze,snapshot}`. Construction copies the
verified fixed schedule and borrows the same original budget and genuine
lifetime. It owns no writer, Native handle, cleanup/status setter or clock.
Only actual Recorder-close metadata followed by a persisted response event
can promote a checkpoint. Existing Watchdog persistence/observer/ACK order,
first-stop freeze, private artifact ordinal and reserved gameEvidence remain
unchanged. First freeze copies the selected games synchronously; later
physical close facts remain diagnostics and never promote or score.

`pgn-format.mjs` is declared before creation, runtime-only. Exports
`checkpointResult(board)`, `serializeCheckpointPgn({phase,game,movesUci,
result})`, and async `replayCheckpointPgn({phase,game,bytes,budget})`.
Actual chess.js rules derive checkmate-first results. The canonical full
PGN carries initial FEN, full mainline, game/opening/pair/color headers and
consistent Result. No comments, variants, omitted prefix, invented terminal
or post-stop PGN patch is accepted. Reads/replay use the existing IPC frame
byte ceiling, without truncation, and yield during replay while retaining
the original bound so independent watchdog timers remain live.

The existing IO `readAt` gains optional fourth `cap`, defaulting to the
unchanged ordinary ceiling and rejecting values beyond it. PGN inspection
passes the fixed frame ceiling, including counted mid-read growth checks.
The existing phase fixture owner additionally exports
`validateGameSchedule({phase,gameSchedule})`, binding the exact preflight or
locked compare schedule before any PGN IO.

`pgn-evidence.test.mjs` is declared before creation, TEST-only, no exports.
Actual temporary PGNs/owned reads cover closed-ref/event promotion,
alternating slots, bad history/result/metadata, and held persistence followed
by synchronous stop and late release. No model, browser or Native runs.
DAG: PGN evidence -> format + fixed schedules + existing bounded snapshot IO;
format -> chess.js and pure constants. No backedge or additional queue.

## C4b-16 rules-owned match controller

`match.mjs` exports `playGame({game,arms,checkpoint,signal})` and
`createGameCheckpoint({game,capabilities})`. The controller copies the full
initial FEN/history, checks actual chess.js rules before every move, and
returns only a genuine terminal checkpoint. Abort/fault rejects without a
winner. There is no whole-game command timer, material/ply adjudication,
randomness, tree reuse or retry. Each recorded arm transport owns one actual
readiness operation and one command operation per move through existing
capabilities; phase resources supply the actual public fixture results.

`RecordedArmTransport` has `kind`, `initialize()` and `think(request)`.
Initialize returns `{ready,delivery,worker}` with untouched public Ready,
actual delivered path/byteLength/SHA and separate actual Worker observation
`{instanceId,raw}`. Think returns `{response,worker}` with untouched public
response and the actual Worker result message. Baseline fields are never
expanded with invented identity/context. Candidate session/model/context/
worker epoch and all 64 completed visits are checked every turn; baseline
legacy result is cross-checked against its actual worker message and pinned
external M delivery. These are driver-side observations, not Native proof.

The checkpoint factory uses exactly two alternating PGN slots, fresh bridge
artifact IDs, actual final-close ref followed by persisted response-event
ACK, and original recordSeq behavior. No local write or post-stop PGN patch
exists. Operational arm adapters are fixed private producers, not CLI-supplied
verification callbacks. Match tests use raw stub transports only and never
claim actual engine/worker/phase execution.

## C4b-16 final paired inference

`pgn-summary.mjs` is declared before creation, runtime-only. Sole export
`deriveFinalGameEvidence({request,status,artifactRefs,cleanupOk,
identityProven,faults})` returns `{request,status,pairedCheckPassed}` from
owned JSON data. The existing Finalizer closed-facts compiler invokes it
for compare with supervisor gameEvidence, after genuine cleanup and final
identity verification and before final publication. No closed-evidence
field or caller proof is added. Every selected checkpoint ref must equal
the actual closed artifact inventory. Changed/missing refs make bookkeeping
unproven and ineligible, without substituting a result.

Only complete frozen twenty-pair/forty-game zero-fault data with proven
cleanup/identity and passed method produces inference. Driver inference
namespaces are discarded. Paired-analysis check and analysisEligible follow
the derived actual result; partial/faulted evidence is descriptive and
inconclusive with null inferential fields. No Elo or repeated cohort exists.
DAG: finalization -> pgn-summary -> existing stats/schema helpers, without
IO, callbacks, Native or cleanup/status setters.

`pgn-summary.test.mjs` is declared before creation, TEST-only, no exports.
It covers actual-facts eligibility, incomplete/fault/cleanup/identity gates,
selected-ref mismatch, and driver inference replacement using synthetic
closed data only. These unit results are not played games or proof.

The existing record adapter also discards driver inference namespaces for
compare before snapshot work, including when observer snapshot fails. Only
the actual closed-facts compiler creates pairedAnalysis. This leaves the
ordinary record chain, wire sequence, private artifact ordinal, stop clocks
and cleanup ordering unchanged. Its derived paired-analysis check replaces
the driver's early claim and selected refs must match final closed bytes.

Before an append in the reserved preflight/compare games namespace, the
record adapter snapshots selected PGN refs and rejects writes to selected
paths. Unrelated artifacts retain their original behavior without a snapshot. This guard
runs before both mutation and private artifact-call ordinal consumption.
The observer remains three methods. Its later closed-ref/event check still
revalidates actual bytes and never supplies write authority. A real Recorder
replacement regression proves current bytes and their selected ref survive.
The nested checkpoint DTO omits private result; outer game.result owns it.
Zero-move PGNs receive the same strict blank header/mainline separator as
all later checkpoints, without weakening parsing or result validation.

## C4b-17 recorded public Page arm

`page-arm.mjs` is declared before creation, runtime-only. Sole export
`createPageArm({kind,id,page,context,capabilities})` is a pure constructor
returning exactly `{kind,initialize,think}` for the match controller.
Initialize owns one recorded readiness operation. Each think owns a separate
recorded command operation. No local deadline, second admission queue,
Native proof, cleanup setter or changed engine response is introduced.
The operation body installs a transparent public Worker constructor tap
before actual fixture initialization, retaining only the current ready and
result messages with their actual Worker instance ID. It observes the
actual context response body for the arm's model route and hashes all bytes.
Raw Ready/ThinkResponse and separate observations remain distinct.
Per-operation evidence is persisted before completion. Stops fence records
and model/Worker replacement rejects, preserving actual failures.
DAG: phase runners -> page-arm -> canonical/schema helpers; Page fixture
calls continue through the existing window.__tinyazEval API.
`page-arm.test.mjs` is TEST-only, no exports. Scripted public Page/Context/
Worker interfaces execute the actual injected observer script. Tests prove
begun-before-work, per-move operation scope, raw messages/delivery hashing,
held body closure, wrong bytes/worker and stop fences without an engine run.

The existing canonical codec additionally exports `parseJSONBytes(bytes)`
for strict finite UTF-8 subprocess JSON. It uses the same duplicate-key
parser and canonical owned-copy validation, while permitting Python's
numeric spelling. `parseCanonicalBytes` retains exact-byte record rules.
Raw Python stdout remains unmodified evidence. The existing Watchdog
lifecycle calls fixed genuine `admitPhase` after actual running and before
any driver fork, using existing parent completion refs, same monitor bound
and same IO registrar. Its public wait uses the existing original-bound
bootstrap waiter. The separately retained actual admission body stays
strongly referenced until genuine settlement; shutdown starts Native
teardown independently, then joins that body before finalization. No proof
callback or admission-disable switch exists.

The connected server now consumes the capture/reopen metadata path
`inputs/setup/tinyaz-m.meta.json` through the unchanged modelRef API.
The older `tinyaz-m-metadata.json` name in dated C4b-11 notes is superseded;
there is one retained metadata copy, with no alternate filename accepted.

## C4b-18 operational composition

The mapped `run.mjs` exports `bootstrapWorkspace(options)`,
`runSupervisor(options)` and `runDriver(options)`. The mapped `cli.mjs`
is the executable dispatcher, with no exported API. Public phase commands
select only the fixed phase, protocol, candidate and absolute workspace.
Bootstrap captures once, drains its genuine owner and replaces the process
with the archived CLI. Every archived invocation freshly reopens complete
frozen inputs and actual environment under its own genuine owner before
phase admission. `run-supervisor.mjs` privately exports
`executeSupervisor({phase,workspaceRoot,repoRoot,captured,lifetime,budget,phaseDeadlineMonoMs})`.
The existing Watchdog gains private `phaseDeadlineMonoMs`, a finite min-only
original bound captured before Store/startup and shared by PGN IO and Native
horizon. It is never a CLI option or clock extension.
It assembles the one horizon/protocol/monitor/footprint/Store/Recorder and
Watchdog, retaining fixed file-only identity and actual cleanup callbacks.
`run-driver.mjs` privately exports
`executeDriver({manifestPath,workspaceRoot,repoRoot})`; it owns process IPC,
public server/browser resources and true teardown before closed ACK.
The private fork creates a counted phase-local `driver-tmp` root and binds
its SDK HOME/temp/XDG paths before any public Vite/Playwright call, keeping
launchServer's Node-created temporary profiles inside the workspace.
The nested selftest borrows the existing parent monitor, owner and driver
scope; it never creates a second collector or waits on parent zero. Only
the top lifecycle stops the shared whole-workspace footprint observer.

The mapped `phase-runners.mjs` exports only
`runPhase({manifest,capabilities,resources})`. Resources are fixed run-owned
browser/server handles, frozen common identity, workspace path, genuine
local lifetime, frozen fixtures and actual `selftestEvidence` read through
fixed receipt verification during the first preflight command. The driver
performs that command before the recorded runtime readiness operation;
phase runners validate its actual zero-game timeout final, while the
supervisor independently owns admission and final re-verification. Actual parity uses the frozen fixture and candidate Page
numeric exports. Actual preflight performs the first-begin selftest, ten
fresh-root commands and two rules-only A/A draws. Compare performs the
fixed forty-game schedule and returns raw completed results only. Final
inference stays in the supervisor's closed-facts compiler.

The mapped `checks.mjs` exports only
`runChecks({manifest,capabilities,resources})`. Private `check-engine.mjs`
and `check-workbench.mjs` export `checkEngine(context)` and
`checkWorkbench(context)`, respectively. They execute real fixture/API and
actual Workbench assertions. Trained, loading, failure and demo states retain the full
board, header, ThinkPanel, CardPanel, reset action and unrated Roadmap. Board
squares cover the measured CSS content box within one pixel on every edge.
The recoverable Worker fault owns its complete RequestContext before queuing delivery.
Each actual initializer has its own readiness
operation; functional commands follow sequentially without nesting or
relabelling a whole scenario as readiness. exceptions produce failed check evidence,
never an omitted or successful placeholder group.

`match-observations.mjs` is a private runtime owner of the whole existing
readiness/turn validators, exported as `validateArmReady(arm,observation)`
and `validateArmTurn(arm,ready,observation,request)`. Match and preflight
share these same checks without changing raw engine interfaces.

`reference-child.mjs` privately exports
`runPythonReference({manifest,capabilities,workspaceRoot,lifetime,commonIdentity},adapters?)`.
An isolated optional adapters object accepts only lowlevel `spawn`; its
validated function is snapshotted before any callout. Operational callers
omit adapters. It starts only the archived selected Python with isolated/no-bytecode flags
and private FD3. A genuine registration ACK precedes the run/PID/manifest
bound gate and all Torch/model loading. The gate carries the actual captured four
installed-import descriptors as expected data; the child freshly checks
actual package versions/origins/source hashes before and after inference.
It never imports expected descriptors as evidence of observed bytes.
The original command creates/confines one
counted `parity/tmp` scratch root before spawn. HOME/temp/XDG/Torch cache
paths point there, and the stdlib child verifies actual tempfile selection
before ML imports. Issued stream writes, child exit
and every allocated pipe close remain real owned debt through teardown.
`parity-reference.py` is runtime-only, no public Python API. It validates
the gate and complete frozen six-module inventory before importing Torch,
then checks all thirteen fixtures on CPU float32 in inference mode with
one intra/inter-op thread, every 1216 plane and 4672 logit, value, raw EP
and legal UCI/index mapping. It retains exact failing indices/max errors
at the fixed tolerance and rechecks hashes/origins/extra imports afterward.
The mapped public `check_browser_parity.py` uses stdlib only to validate
requested/frozen launch bindings and process-replaces into archived CLI.
The public macOS wrapper measures preparation with `CLOCK_MONOTONIC_RAW`,
the same epoch as Node `hrtime`, so its one original setup90 deadline crosses
exec unchanged. Capture, checks, Git remaining time and elapsed reporting
use that same clock; the gated reference-child branch stays separate.
The shared environment-child timer bootstrap also subtracts that raw epoch
from its borrowed absolute Node deadline before arming `ITIMER_REAL`; it
never treats the different Python default epoch as remaining time.

All new private helpers above belong to the explicit runtime union.
DAG: CLI -> run -> supervisor/driver; driver -> phase runners -> checks,
Page/match and reference child; check owners -> public fixture/Workbench;
reference child -> archived Python entry. No TEST/support source executes.
`run.test.mjs` also imports the existing evidence/FS/drain TEST owners for
a held real parent-read regression, preserving release/join/restore order.
`phase-runners.test.mjs`, `checks.test.mjs` and `run.test.mjs` are TEST-only,
no exports. They use scripted public interfaces and genuine temporary
files/process-data only, without actual browser/Native/Torch execution.

`operational-test-fixtures.mjs` is declared before creation, TEST-only.
Sole export `makeOperationalFixture(t,{phase,fault,holdThink}?)` returns
`{manifest,capabilities,resources,controller,calls,artifacts,events,own,
releaseThink,thinkEntered}`. Its class-shaped public Page/Context/Worker
interfaces execute the actual Page-arm observer script in a VM, with raw
scripted responses and actual pinned-byte hashing. `own(promise)` retains
test bodies; teardown releases gates, joins bodies, closes all contexts and
observes fresh genuine local owner zero before removing controls. It never
imports a runtime consumer into the fixture or admits a real phase.


`vite-test-fixtures.mjs` is declared before creation, TEST-only, with sole
export `fakeVite({address,closeError}?) -> {calls,createServer}`. The whole
fake moves from the connected-resource TEST owner, which reexports the
same name and keeps every existing alias valid. `calls` retains the same
middleware/server/options/createServer observations and adds `postHooks`.
The Connect-shaped middleware app returns itself from `use`. `createServer`
awaits each configure hook, then invokes every truthy returned posthook
with no arguments, matching Vite's request-free post-configuration call.
The production route plugin installs middleware and explicitly returns
void. DAG: connected TEST fixture -> Vite TEST leaf (no imports); existing
server/browser/lifecycle TEST owners -> connected TEST fixture. This leaf
is excluded from the runtime union and adds no production API or resource.


Independent environment content reads use at most sixteen workers under the
same original budget and genuine lifetime. Every issued reader joins its
own raw stat/stream-close receipts on success or failure. Worker joins retain
the first arbitrary failure, including nil, and stop further admission.
Directory inventories enumerate every path, read every file's current bytes,
then recheck every original directory identity and sorted entry set. RECORD
payload and whole installed inventories derive both outputs from one fresh,
complete site content pass within that invocation. The METADATA and RECORD
text read for parsing must match that pass's exact byte length and SHA256.
Legitimate RECORD payloads outside site-packages are separately read under
the same original bound. No initial digest, cross-call cache or mtime
substitutes for a current read.
Default filesystem canonicalization uses pinned Node `realpathSync.native`.
Every resolution, confinement and equality check still executes; explicit
`resolvePath` adapters keep their snapshotted function. No path cache is used. Snapshot final
identity checks likewise read fixed batches of at most sixteen frozen refs,
join each batch's issued work and retain its first exact failure. Snapshot
IO joins only its own raw effects, never nested global lifetime zero.
`environment-files.test.mjs` is declared before creation, TEST-only, no exports.
It imports the existing files owner, budget/lifetime and fake clock helpers;
class-shaped controlled streams prove width, stable full hashes, common-end
expiry, first nil failure and all-issued true-close joins. No new runtime
API, owner, deadline, clock, authority or cache is introduced.


Private `final-integrity.mjs` is declared before creation. Sole export
`createFinalIntegrity({workspaceRoot,manifest,expectedCommonIdentity,workEndMonoMs,lifetime},
{clock,nowMonoMs}?) -> frozen {collect,consume,interrupt,isComplete}`. Construction
copies the complete association before callouts. The collection association is exactly `{workspaceId,runId,phase,expectedCommonIdentity,inputs}` and must match all five captured fields before any scan IO. `collect(association, {deadlineMonoMs})`
runs only the fixed genuine `verifyIdentity` once, under that original end
bounded by workEnd; it returns no driver proof. `consume(args,{deadlineMonoMs})`
returns the exact privately completed identity once for Recorder A, with exact
workspace/run/phase/CommonIdentity/input binding and the current cleanup bound.
`interrupt(reason)` synchronously expires an active scanner through its same
handle; an already completed own observation survives the induced selftest stop.
`isComplete()` is a private control predicate, never final identity authority.
Only lowlevel clock functions are optional; no supplied verifier/status setter.
The operational assembly always supplies this owner to Watchdog and Recorder.
The reserved existing command id is `${runId}:final-integrity`; dispatch fences
all later experimental begin/register/event/artifact requests while heartbeat,
Native, footprint, the matching end and finish remain live. No public capability,
wire, required-check or CLI field changes. First stop never awaits the scan.
The serialized command launch retains the file-only scan in the existing
Watchdog admission-task slot. Native cleanup never waits for that scan;
shutdown joins its actual body after Native teardown before capture A.
Lifecycle `finish` joins its own raw send callback even when normal STOP
arrives first; it preserves the actual send error and final close joins
that same debt. Ordinary waits retain their existing stop races.
The TEST-only `setupRun` adds optional trusted `finalIntegrity`, forwarded
unchanged for controlled lifecycle cases; operational assembly supplies
only its fixed genuine owner.

Private `watchdog-selftest-operation.mjs` is declared before creation. Sole
export `runSelftestBegin(ctx,records,runInternalSelfTest,msg,arm)` receives the
WHOLE existing first-begin handshake, preserving its original deadline, parent
pause, abort, exact receipt validation and ACK. DAG: operations -> selftest leaf
-> prerequisites/owned IO; supervisor -> final-integrity -> snapshots/budget;
Watchdog only forwards the trusted private four-method owner. Both runtime
paths are included in the literal archive union before creation. The two new
TEST owners have no exports and remain outside that union. Implementation:
Sol High; orchestration/review/publication: Sol Max; historical SWE provenance
is retained. The accepted addition is outside the locked Runtime070 block.

#### Accepted final integrity ordering amendment (2026-11-06)

Approved by Hansel on 2026-11-06 (Asia/Singapore), selecting “Approve ordering change (Recommended)”.
The accepted packet SHA256 is `9faa7e66ceba942531ce0a3924b4fe748e7a60840875ae7db7bce349cb3bcbf1`.
The failed five-second replays and complete-guard prototype are retained at
`/tmp/tinyaz-c4a2-sol-review/c4b-check2-identity-reproducer-5/result.json` and
`/tmp/tinyaz-c4a2-sol-review/sol-high-complete-sync-prototype-1793890260949978000/constraint-report.json`.

After the last experimental operation and expected SDK close, and before
requesting normal finish, the supervisor performs one mandatory fresh full
software/environment and frozen-input integrity verification. It is a
supervised command with end = min(commandStart + 90,000 ms, the ORIGINAL
phase work end). The supervisor permanently fences further experimental
operations before this verification; heartbeat, Native RSS/accounting and
workspace monitoring remain active. The scan reads every required current
byte and preserves every existing membership, RECORD, directory, symlink,
size, identity and digest check. It cannot reuse initial or cross-run hashes.

Only the genuine supervisor-owned result, bound to this exact workspace,
run, phase, expected CommonIdentity and complete input references, may be
consumed by final capture A without rerunning the full installed-content
scan. It must have completed within its original command/work bound.
A driver claim, cached starting identity or incomplete/late observation is
never a substitute. A still-pending actual read remains owned and joined.

An admitted normal finish or any stop still captures cleanupStart exactly
once and cleanupEnd = min(cleanupStart + 5,000 ms, phaseDeadline). No scan
may delay a fault/stop or postpone that capture. All fresh live-process
identity, listener, RSS/accounting and actual child/pipe cleanup proofs stay
inside that original five seconds. A validates the same-run integrity result
and actual cleanup proof before cleanupEnd. If the scan is absent, failed,
late or interrupted, the run cannot pass; its actual IO remains owned and
late completion cannot promote eligibility. No identity recollection starts
after the cutoff. Receipt-only filesystem sealing remains separate.

The existing expected heartbeat self-test keeps its FIRST trusted begin
pause exactly where it is. After that immediate pause, and after its OWN
subrun manifest/runId is established, collect one fresh same-subrun full
integrity observation as pre-driver admission, before synthetic heartbeat
silence is injected. This uses the remaining ORIGINAL parent command90 and
phase work bound, never a new allowance. It cannot reuse the parent's or
another run's observation. At the induced stop, consume that exact subrun
observation and require its fresh scoped Native cleanup within the unchanged
five seconds. The required result stays exactly HEARTBEAT_TIMEOUT,
inconclusive/2, zero scored games, analysisEligible false and verified
cleanup. A missing, failed or late pre-injection scan cannot qualify this
control. Neither the trusted first-begin pause nor the injection is delayed
after its admitted boundary; the scan occurs while the parent is paused
and before the synthetic driver/injection is admitted.

The original 10-minute check/parity/preflight and 60-minute comparison ends,
30-second readiness, 90-second command ceiling, output/RSS limits, and one
approved final comparison remain unchanged. This amendment changes when the
fresh final integrity observation is collected, not a resource limit.


## Operational command usage

Run each phase explicitly from the original checkout. `--out` is absolute.
Check exclusively creates a fresh directory and captures immutable inputs;
any partial attempt remains diagnostic and is never resumed or overwritten.
Parity reuses that completed check workspace. Public arguments are exactly
`--protocol`, `--candidate` and `--out`; the protocol is the fixed fixture.

```sh
npm run test:chess-browser -- --protocol train/fixtures/browser-protocol.json --candidate WORKTREE --out /absolute/fresh/development-workspace
train/.venv/bin/python train/scripts/check_browser_parity.py --protocol train/fixtures/browser-protocol.json --candidate WORKTREE --out /absolute/fresh/development-workspace
```

For the committed chain, use one resolved green commit and a separate fresh
workspace. Run committed check, parity, preflight, then comparison only when
the preceding real receipts are admitted. The aliases for the last two are:

```sh
npm run eval:browser:preflight -- --protocol train/fixtures/browser-protocol.json --candidate FULL_COMMIT --out /absolute/committed-workspace
npm run eval:browser -- --protocol train/fixtures/browser-protocol.json --candidate FULL_COMMIT --out /absolute/committed-workspace
```

Each command is independent. `WORKTREE` is rejected for preflight/compare.
Preparation uses one original setup90 deadline, reports its elapsed time,
and transfers that same bound through the private archived entry. The
archived entry rejects late transfer before starting the separate phase
clock. The original phase end is captured before fresh reopen/environment
remeasurement and never renewed by a lower owner. Whole CLI wall time also
includes preparation; execution receipts should retain both measurements.
The fixed readiness30/command90 and phase600000/compare3600000 bounds,
ordinary end D-5000, cleanup inside D, RSS and cumulative workspace caps
remain unchanged. Private `--archived`/`--driver` arguments have no public
admission-disable or proof flag. No command runs training or publishes data.

`bootstrapWorkspace` takes exactly `{phase,candidate,protocolPath,
workspaceRoot,repoRoot}` and returns those fields plus `{frozenCliPath,
elapsedPreparationMs,preparationDeadlineMonoNs}`. `runSupervisor` takes the
same selection and returns the actual `{status,exitCode,stopReason}`;
`runDriver` takes `{manifestPath,workspaceRoot,repoRoot}` and resolves void
only after real teardown. Driver resources are exactly `{browser,servers,
workspaceRoot,commonIdentity,lifetime,fixtures,selftestEvidence}`. Phase
entry snapshots all serializable data before SDK callouts and retains the
same resource references. `runChecks` returns `{checks,summary}`; each
private check owner returns nonempty per-group `{passed,path}` assertion
lists. Raw assertion/reference observations stay in their actual artifacts;
finish summaries contain compact indices/counts within the driver frame cap.

Functional groups include actual Worker and retained-main recovery with no
second fetch, controlled application deadlines/cancellation/history, real
Workbench computed geometry, retry/reset/stale results, explicit demo and
unbound/missing history. Every initializer owns a readiness operation and
functional commands follow separately. Unit SDK observations cannot replace
the required real WORKTREE check/parity gates or committed receipt chain.

`watchdog-parent-admission-test-fixtures.mjs` is declared before creation,
TEST-only, exporting `capturePriorReceiptProbes(t,evidence)` and
`awaitEvidenceEntry(gate)`. The latter is the whole existing truthful
entry-wait helper moved from the capacity-bound selftest TEST owner. It owns the
actual receipt-graph reads through the existing teardown/body owner and
same Store lifetime, derives exact historical running tuples, rejects a
prior tuple equal to the current healthy parent and returns only an exact
scripted prior-gone map. No wildcard unavailable bypass or runtime proof
API exists. DAG: evidence TEST owner -> new leaf -> existing receipt/Store/
teardown owners; no backedge. The existing positive selftest case races
actual driver startup against the original run outcome, preserving assertions.
Held-callback/read regressions first account for the exact legitimate parent
probes, then require zero additional probes after stop and real release.

The private driver closes every actual SDK resource before successful finish
inside one original-bound command operation. A failure prevents finish; a
held close remains true body debt while supervisor teardown runs independently.
Finally repeats only each SDK's existing idempotent close/join. The private
`closeSdkResources` function adds no export or wire/API. Its actual function
body is AST-selected by TypeScript's parser in the TEST owner for faithful
class-shaped close-error and held-close controls, without executing a phase.

`watchdog-prior-evidence.test.mjs` is declared before creation, TEST-only,
no exports. It receives the whole captured-end re-verification case from
the selftest TEST owner, preserving its gates/real release/assertions.
The case distinguishes exact current-parent and verified-prior tuple probes,
with no additional probe after expiry. This cohesive split preserves every
original named test and keeps full readable guards under the file cap.

## Test suites

The explicit whole `*.test.mjs` owners and the two stdlib `*.test.py`
suites are created and test-only, including the actual-native group. `watchdog-test-fixtures.mjs` and
`watchdog-records.test.mjs` are created test-only owners, as are
`watchdog-run-test-fixtures.mjs`, `watchdog-cleanup-test-fixtures.mjs`
and `record-lifecycle.test.mjs` under the readable test-owner split
(declarations were recorded before creation);
`watchdog-boundaries.test.mjs` is a created test-only owner (the
residual-boundaries regressions below; declarations were recorded
while the file was absent, and the private bindings it guards are
repair-authored, not passed);
`watchdog-child-test-fixtures.mjs`,
`watchdog-evidence-test-fixtures.mjs` and
`watchdog-evidence-boundaries.test.mjs` are created test-only owners
under truthful-evidence decision 37 — declarations were recorded before
creation and the private bindings they guard are repair-authored, not
passed;
`watchdog-resource.test.mjs` and `watchdog-fs-test-fixtures.mjs` are
created test-only owners under corrective 38 — declarations were
recorded before creation and the bindings they own are
repair-authored, not passed;
`watchdog-selftest-evidence.test.mjs` is a created test-only suite
declared under corrective 39 before creation;
`watchdog-driver-boundaries.test.mjs` is a created test-only suite
declared before creation;
`watchdog-records-test-fixtures.mjs` is a created test-only leaf
declared under corrective 46 before creation
(the corrective-46 absence wording is a dated declaration under
corrective 68 — the leaf already exists);
`completion-publication.test.mjs` is a created pure TEST suite under
the existing Root48 declaration — implemented as readable source-only
pending Sol verification (current correction 80a);
`artifact-store.test.mjs` fault fixtures inject their forced
sync/zero-progress faults on the SAME real opened FileHandle (current
correction 80a2 implementation correction, pending Sol verification);
`test-fixtures.mjs` gains the pure TEST assertion helper
`assertRejectCode(promise, want)` moved whole from
`artifact-store.test.mjs`, which imports the IDENTICAL function as
`code` (current correction 80a3, pending Sol verification);
`receipt-publication.test.mjs` is a created pure TEST suite under
the existing Root48 declaration — implemented as readable source-only
pending Sol verification (current correction 80b);
`record-evidence.test.mjs` is a created pure TEST suite under
the existing Root48 declaration — implemented as readable source-only
pending Sol verification (current correction 80c; its deliberate
bookkeeping-observer warning cases expect real TINYAZ_BOOKKEEPING_OBSERVER
emissions, never asserted silence);
`prerequisites-evidence.test.mjs` moves three negative expectations
to the approved mandatory fullGraph-before-publication boundary — the
ghost declared input rejects `recorder.finalize` itself
EVIDENCE_INCOMPLETE, and the failed-outcome/wrong-owner nested
selftests reject parent preflight generation SELFTEST_INVALID — same
test names, stimuli and expected codes, no relaxed validation
(current correction 80b, pending Sol verification);
`process-monitor-test-fixtures.mjs` gains an optional trusted
`lifetime` forwarded as the EXACT SAME reference to the real
`createProcessMonitor` (omitted keeps the default mint) —
`process-lifecycle.test.mjs` now asserts the repeated public
`stopAndReap` returns the SAME cached CLEANUP_UNPROVEN rejection
(never a timed-out -> pass revival) while the real exit+closes
retire physical debt observed only through the genuine
`processMonitorLifetime` owner, and the isolated failed-spawn case
alone injects a `createWatchdogLifetime({createHold})` spy (no Node
keepalive) whose acquired-never-released hold proves whenSettled
stays pending on the genuinely unproven receipt (current correction
80d, pending Sol verification);
`watchdog-teardown-test-fixtures.mjs` gains two pure TEST-ONLY
neutral-observation exports — `observeFixturePromise(promise)` (the
WHOLE original live settled/fulfilled/rejected/hasError/error/value
observation, never physical proof or a new ledger) and
`captureFixtureThrow(fn)` (exact arbitrary-throw capture behind an
explicit presence flag) — imported as the IDENTICAL local `observe`/
`captureThrow` by `record-evidence.test.mjs`, which also restores the
full original header/guards/separate boolean assertions/readable
observer+lookalike bodies lost to cap-fitting packing (current
correction 80e, pending Sol verification); the existing five exports
are unchanged and no project import/timer/IO/clock/status/owner
authority was added;
`watchdog-drain-test-fixtures.mjs` is a created test-only leaf
declared under corrective 40 before creation — implemented as
readable source-only pending Sol verification;
`watchdog-driver-test-fixtures.mjs` is a created test-only leaf
declared under corrective 69 before creation — implemented as
readable source-only pending Sol verification;
`watchdog-teardown-test-fixtures.mjs` is a created test-only leaf
declared under corrective 70 before creation;
`native-test-fixtures.mjs` and `native-fixture.mjs` are now created
TEST-only owners — the earlier PLANNED/absent wording is dated
as-of-CURRENT71 history, superseded by the CURRENT74/75 status below
(declared, created — earlier source-only wording is dated; now
verified with the whole harness):

| Suite | Ownership |
| ----- | --------- |
| canonical-json.test.mjs | Literal bytes, ordering, duplicate/`__proto__` keys, rejection and digest cases. |
| record-schema.test.mjs | Closed envelopes, exact pins (venv/CPython/imports/hash), array/nullable predicates, coherence. |
| artifact-store.test.mjs | Confinement, lane/pending accounting, unobserved growth, sticky IO/accounting faults, seal drain. |
| records.test.mjs | Sole-writer write order, stream binding, callback degradations, snapshot isolation. |
| records-finalization.test.mjs | Positive check/exit-code output, pre-running bootstrap admittance, finalizing-vs-closed events, cleanup hashes, competing finalizers. |
| prerequisites.test.mjs | Receipt chains, parent sets, probes, WORKTREE policy, dispositions, public-seam caller snapshots. |
| prerequisites-evidence.test.mjs | Retained-input/check-evidence tampering, stable-byte binding, declared-ref snapshot seams, nested selftest, shared ancestors. |
| supervisor-protocol.test.mjs | Ordered dialogues, envelopes, byte ceilings, run-global fault semantics, teardown channel. |
| supervisor-protocol-lifecycle.test.mjs | Idle/begun/end/stop order, late-begun gating, helper-after-fault, absolute-path roots, exact acks, immutable bindings, closed compound shapes. |
| supervisor-protocol-native.test.mjs | Native-authority regressions on the real validator: consumed-then-fresh exec gates, run-global ID reuse, sticky fault preserving helpers/owned signals only, pending-unsignalable roots, union-descendant vs protected signal targets and scope/shutdown refusals. |
| stats.test.mjs | PGN decode, PairSummary counts, exact sign/CP95 references, eligibility suppression. |
| process-macos.test.py | Stdlib `unittest` suite for the NATIVE/ABI Python owner over the process_macos_test_support fakes and the process_macos_path_test_cases companion: lazy binding signatures, ABI sizes/offsets/class identity, listpids retry and persistent-full rejection, bracketed reads, ESRCH confirmation, signal refusal on tuple change, pid_path NUL/count/relative/malformed-UTF8/EPERM-EACCES cases, short TASKINFO and uint64 start-second boundaries. Sol runs it once as `python -I -B process-macos.test.py`. |
| process-macos-wire.test.py | Stdlib `unittest` suite for the entry/wire owner over a fully fake injected core: collector ready/roots-accepted/sample/signal/shutdown envelopes, seq accounting, exec-gate authorization fields and bounded stderr diagnostics. Sol runs it once as `python -I -B process-macos-wire.test.py`. |
| process-ownership.test.mjs | Transitive ancestry/isolated-group discovery, each tuple once, retained membership through reparent/group change, empty-group retirement, PID/group reuse exclusion, foreign-UID distinction, registration/executable failures, workload scopes and port-adoption refusal. |
| process-lsof.test.mjs | Entry-gate integration: registration-before-authorization order, same-PID transition, pre-ack exit/gate failure, missing-PID registration rejection with no exec frame/signal, isolated resolvePath failure disposing only the owned handle and fixed argv with injected transports/clocks. |
| process-lsof-fields.test.mjs | Parser-only cases moved whole: NUL field grammar, exit-0/exit-1 semantics, malformed/warning unavailability, address/range/UTF-8 strictness. |
| process-lsof-io.test.mjs | Pure `createLsofChildIO` physical/fd-3 lifecycle — closed issuance decision required for settlement, issued-end callback/error accounting, callback-error polarity, pre-write error latch, late-work refusal after neverSpawned and after independent finishFlow, listener/buffer release only at physical+finishFlow — plus the WHOLE moved full-entry deferred-registration/early-exit/delayed-no-frame-end case observing named-listener release through the entry path. |
| processes.test.mjs | Collector transport/startup, sample partition, signal and listener wiring, backend identity and reap order with the real validator against a controlled fake collector. |
| process-lifecycle.test.mjs | Monitor actual-lifetime group: spent start no-spawn, active-work narrowing under a shorter explicit stop, startup failure retaining returned-child/pipe debt, already-exited one-open-pipe stop, withheld-tick teardown ordering and sticky overage staying usable. |
| process-backend-reader.test.mjs | Bounded owned-reader physical ownership: deferred receipts before stat/stream, pending-after-public-timeout to real late close, cap/restat/raw-IO distinctions and streamed binary digest through a buffer-reusing fake. |
| process-budget.test.mjs | Injected-clock deadline/narrowing coverage: queued expiry never dispatches, active/queued/unqueued narrowing, spent-bound no-IO, losing-timer clearing, `whenSettled`/`settled({excludeHandle})` and actual ownership after public timeout. |
| process-transport.test.mjs | Strict LF/UTF-8 framing, coalesced frames, pre-retention oversize bound, pending-before-write, late-ack rejection of actual work plus public wrapper, `send(false)` no-replay, `whenReaped` and real-close-vs-`end`/`destroy` settlement. |
| process-backend.test.mjs | Closed `BackendIdentity` through injected stat/stream/build adapters: one entry horizon, budget-before-IO ordering, bounded text/binary, stable pre/post facts, ENOENT-only cache, listener release on real close and binary streaming without whole-buffer retention. C4b-10 adds the monitor-capture factory reserved-key rejections (`ready`/`budget`/`retainActual`/`setup`/`pyMeta` via `Object.hasOwn` before any IO, genuine passed fields bound LAST) and the one-live-guarded-resolve case — a controlled resolve spending the borrowed horizon at its first call sees exactly one resolve and no later fact IO. |
| process-backend-setup.test.mjs | C4b-09 TEST-only owner (declared before creation): strict `parsePythonVenvConfiguration` closed-failure matrix plus the static `captureSetupBackendIdentity`/`createMonitorBackendCapture`/`createBackendIdentityExpectation` entries — config-derived static descriptor equals the verified capture on same supplied facts, launcher and process-image payload bytes retained, UTF-8/ready-shaped/malformed rejection before IO, expectation snapshot immunity and match/mismatch through the genuine capture under a borrowed handle and retainer, spent-handle no-IO and omitted-expectation compatibility — fakeClock/fakeFile/fakeFileSystem/createBudgetHandle and a genuine lifetime only, all platform fakes isolated, never availability evidence. Excluded from the functional-runtime union. C4b-10 adds the non-darwin/malformed-adapter rejection — the actual-host bind runs BEFORE any config/FS IO (trusted `osPlatform`/`osArch` fakes only). |
| workspace-footprint.test.mjs | Whole-union counting exactly once, no link recursion, allocated charge, scan-start observedAtMs, nondecreasing in-flight joins, error retention and stop. |
| watchdog-cleanup.test.mjs | Fourteen named cases locally (the withheld-driver-close settlement case moved whole to `watchdog-boundaries.test.mjs` under capacity move 36 and is declared to move whole again to `watchdog-driver-boundaries.test.mjs`, and under corrective 46 the WHOLE `staged offsets anchor to the ORIGINAL captured start under delayed IO` case is likewise declared to move whole to `watchdog-driver-boundaries.test.mjs` — all fifteen original local purposes retained across the discovered owners): staged 0/2/4/5 timing anchored to the ORIGINAL `cleanupStartMonoMs` under delayed IO and a shorter inherited horizon, descendants-first ordering, sticky unavailable probe verdicts, all-scope/ports coverage, nested-parent protection, missing/failed driver settlement before collector-last reap, private settled proof vs `claimedProof`. |
| watchdog.test.mjs | Seven named cases (the pure N08 command case `a command operation with fresh heartbeats expires at its original deadline` moved whole to `watchdog-boundaries.test.mjs` under capacity move 36 and is declared under corrective 47 to move whole again to `watchdog-driver-boundaries.test.mjs`; the two high-resource-poll cases moved whole to `watchdog-resource.test.mjs` under corrective 38), becoming eight under corrective 39 when the WHOLE genuine selftest handshake positive-control case `the genuine selftest handshake produces a real verified completionRef` moves here from `watchdog-evidence-boundaries.test.mjs` with all assertions/comments intact — strengthened to observe the four recorder-derived passed selftest checks without caller-supplied claims: watchdog lifecycle through the fork-IPC fixture and fake clock — manifest-before-running, Native accounting before driver/model, exact hello/register/start/operation/stop order, receipt-derived output, heartbeat expiry while registration stalls, blocked fault-event teardown, partial `monitor.start` ownership, failed-stop inconclusive 2 and normal-finish null reason. |
| watchdog-resource.test.mjs | Created under corrective 38 (repair-authored, pending Sol verification): receives the TWO WHOLE high-resource-poll cases moved from `watchdog.test.mjs` — `a transient measured overage stays ineligible after a lower rapid finish` (explicit `atMonoNs` 777 assertion retained) and `a finish before the first resource poll still stops on the retained overage` (fresh causal clean -> injected high projection read through the returned monitor -> lowered current with sticky peak/flag -> still-live finish before the first resource poll) — plus under corrective 72 the WHOLE genuine signal/configuration guard case `internalContext requires a genuine platform AbortSignal` moved from `watchdog.test.mjs`, and under corrective 73 the WHOLE `an interrupted pending start leaves no fabricated running or final records` moved from `watchdog-boundaries.test.mjs` (a PRIVATE actual `monitor.start` entry tap awaited before the monitorCalls assertion, synchronous REQUESTED first stop then the SAME held start gate released `{started:false}` before the real drain, unconditional finally first-stop/gate-release/closeFacts/drain never stranding running fake work) — every assertion/comment/flag and name preserved; four named cases; imports only already-declared test helper exports and stays discovered by the unchanged glob. |
| watchdog-records.test.mjs | WC08 integration through the REAL `createPhaseRecorder`/store and `verifyReceipt` readback with owned temporary files: mixed event/artifact ordinals, actual `ArtifactRef`s, the exact `operation` event schema, PGN snapshot fault before final intent, status/exit coherence, failed-stop inconclusive 2 and normal-finish null reason — no fabricated pass. Corrective 46 (declarations recorded before use): the seven named cases delegate through the new `watchdog-records-test-fixtures.mjs` leaf's `setupRecordAdapter`/`settleRecordCleanup` via identical imported aliases — no local mirror implementation. |
| record-lifecycle.test.mjs | The four whole unfinished-evidence-closure cases moved from `records-finalization.test.mjs`: pending sink-open drains before real closes with the same-promise fence and no fabricated running/final/completion/seal, pending-append drains with every real sink close attempted despite one rejection (the real held sink is truly closed in test-finally), retained sticky failure while the closure drains, and active-finalizer/post-seal closure refusal. |
| watchdog-boundaries.test.mjs | Five cases: the residual-boundary regressions for the declared pending-repair bindings (supplied malformed `cleanupStartMonoMs` rejected without a fresh window while an omitted start captures entry — each malformed value on a fresh eligible controller, missing/failed driver settlement reaching no collector reap, a withheld required live-evidence join keeping the collector un-reaped, and synchronous observer throws retained without delaying stages; the WHOLE interrupted pending-start case moved to `watchdog-resource.test.mjs` under corrective 73 with every assertion/comment preserved) — retaining all original late-ordinary/FINISH no-revival purposes in fresh independently eligible idle ready contexts for each kind (non-poisoned channel, no active-operation blocker), actual retained event/artifact absence after owned settlement, real ack absence/one first stop/ineligible outcome. BOTH capacity-36 whole moves are declared to move again to `watchdog-driver-boundaries.test.mjs`: the pure N08 command case `a command operation with fresh heartbeats expires at its original deadline` (exact original start + 90000 ms bound, same-clock send-observer timestamps, per-tick no-stop, actual OPERATION_TIMEOUT — pure, not a real-90-second Native test) from `watchdog.test.mjs`, and `driver settlement with a withheld handle close stays unproven until it settles` (a real driver channel over `forkDriverFixture` facts — exit/stdout-close/withheld-stderr-close) from `watchdog-cleanup.test.mjs`, each with all comments/assertions/purpose retained. The invalid/spent `selftestEvidence` case moved whole to `watchdog-evidence-boundaries.test.mjs` under truthful-evidence decision 37 and is declared to move again to `watchdog-selftest-evidence.test.mjs` under corrective 39. Over existing TEST-ONLY fixtures and actual production/record/receipt APIs, no production debug hook. |
| watchdog-driver-boundaries.test.mjs | created test-only suite declared before creation: owns the WHOLE original case `driver settlement with a withheld handle close stays unproven until it settles` moved from `watchdog-boundaries.test.mjs` with all comments/assertions/purpose retained — restoring the original physical observations: exit + stdout-close while stderr is still owed, `destroyed` true with `closed` false never settling, a cached actual close-before-reap counting, and a missing required pipe staying invalid/unproven — over the genuine `createDriverChannel`/`forkDriverFixture`/`createObservedDriver` and the REAL `createCleanupController` under controlled scripted facts only; no real process/Native, proof setter or debug hook. Under corrective 46 it additionally receives the WHOLE existing named case `staged offsets anchor to the ORIGINAL captured start under delayed IO` moved from `watchdog-cleanup.test.mjs` with every assertion/comment/flag/timestamp unchanged — actual TERM+2000/KILL+4000 and the retained actual driver exit+BOTH-close facts belong to the same physical-driver cleanup boundary — over the existing genuine `ROWS`/`fixture`/`makeArgs`/`drivers`/`closeDriverFacts`/`drive` exports. Under corrective 47 it additionally receives the WHOLE existing named pure command case `a command operation with fresh heartbeats expires at its original deadline` moved from `watchdog-boundaries.test.mjs` (it moved there whole from `watchdog.test.mjs` under capacity move 36) with every assertion/comment/flag/timestamp unchanged — the original full 90000 ms command horizon, valid 500 ms heartbeats, actual same-clock send-observer timestamps, per-tick no-stop and actual OPERATION_TIMEOUT at the original bound observed over the real channel; a PURE case, never a real-90-second Native test. The negative withheld-driver case always releases the actual withheld facts before join even when an assertion fails — no close fiction. Imports only already-declared helpers/production contracts plus node assert/test — never a helper-to-test cycle; discovered by the unchanged `*.test.mjs` glob. |
| watchdog-evidence-boundaries.test.mjs | Genuine-evidence boundary suite (truthful-evidence decision 37, repair-authored pending Sol verification): a first stop while the injected trusted callback is genuinely held cancelling post-callback admission on the real AbortSignal/post-callback recheck lane — observing ZERO real receipt-verifier IO admitted after the held callback release, with the callback owned unchanged via the declared `ownFixtureAttempt` and narrowly scoped test FS instrumentation registered before use and restored only at safe disposal; a stop while the genuine selftest receipt READ is held leaving the post-IO Native probe undispatched; the required-verifier debt observation (all OTHER driver exit/BOTH-close debt settled BEFORE the bound while the actual required receipt/verifier body is held, proving collector-last waits for it — earlier stop/event IO held too so required verification is shown to begin independently, then the genuine post-IO captured-end recheck admits no new Native probe); the spent partial-start actual zero-fresh-monitor/Native-call assertion; and pending AND failed genuine `preflight/running.json` rename bodies taking the real incomplete drain with no fabricated final/completion/seal (a released real running.json may truthfully exist; an injected original IO error never becomes a fake positive). Corrective 39 (declarations recorded before use): the WHOLE genuine selftest handshake positive-control case moves to `watchdog.test.mjs` and the WHOLE `selftestEvidence validates its bound and never probes past the original end` case moves to `watchdog-selftest-evidence.test.mjs`, freeing this suite for its actual callback/running-write/debt regressions under the readable cap. |
| watchdog-selftest-evidence.test.mjs | created test-only suite declared under corrective 39 before creation: owns the WHOLE current case `selftestEvidence validates its bound and never probes past the original end` moved from `watchdog-evidence-boundaries.test.mjs` plus the restored original malformed/spent assertions on fresh genuinely eligible contexts — malformed `deadlineMonoMs` values `[1.5, Infinity, "end", null]` each returning null and `IPC_INVALID` faults on the actual `createWatchdogOperations` API over genuine root/CommonIdentity/ref, a spent bound returning null with ZERO receipt-verification admissions and ZERO probes, and the useful actual shutdown-held-read post-IO observation kept as a separate clearly named case (exactly the one positive-handshake probe and zero post-bound probes, never an `/unreachable` guard or ProcessIdentity substitute); the required verifier-debt observation case may coherently live in this suite with the already-required selftest purpose — reflected in this owner description before any case creation or move. Imports only already-declared test helper exports; discovered by the unchanged `*.test.mjs` glob. |
| completion-publication.test.mjs | Created pure TEST suite under the existing Root48 declaration: controlled real-store publication regressions — prepared opaque-capability forgery/reuse-after-seal rejection, failed publication retaining actual bytes in the EXACT original temp with required sync/fresh canonical-absence proof and real closes before hold release, fresh canonical memo/readback/seal inside the one owned queue transaction, and lifetime-hold retention on stalled verifier/raw effect/close. |
| receipt-publication.test.mjs | Created pure TEST suite under the existing Root48 declaration: prepared-temp/full-inventory verification and post-gone closure admission races — `verifyPreparedReceiptGraph` full-graph coverage, single-use token consumption/forgery/mismatch, declared-inventory-before-temp ordering, ordinary `verifyReceiptGraph` exact-byte cases over genuine owners and real temporary workspaces. |
| record-evidence.test.mjs | Created pure TEST suite under the existing Root48 declaration: mandatory verifier/cutoff/frozen-eligibility regressions over the genuine recorder/record-evidence/record-lifecycle owners — retained-before-invocation callbacks, clock checked after actual settlement, no post-cutoff Native start, the v2 LATE fence after mandatory verifier handling, capture-A before single-use continuation-B, bound-legacy `finalize` rejection and the unbound same-pipeline compatibility path. |
| native-supervision.test.mjs | Serial actual-native suite: real collector spawn/sampling/gated lsof listener query/TERM-reparent/cleanup/collector order/failure facts/leak proof. Bounded whole-group 60 s, each fixture 10 s, 4 MiB combined output, all cleanup in `finally`. |
| driver-bridge.test.mjs | C4b-01 TEST-only suite (created; dated actual04 whole-owner receipt 10/10 exit0): pure fake transport/fake clock only — no real child/kernel/browser/model/filesystem — driving `createDriverCapabilities` against the REAL `createProtocolValidator` oracle and a real `createWatchdogLifetime` through the shared `driver-bridge-test-fixtures.mjs` leaf. Keeps the FIRST TEN of the original thirteen cases under the C4b-04 whole split (the finish/close lifecycle trio moved whole to `driver-bridge-lifecycle.test.mjs`): hello/start ordering and subscriber-before-reentrant-reply, send-false submitted once, real callbacks versus public ACK order, exact registered/begun/recorded binding, pending 500 ms heartbeat with a pending operation and no work before begun, independent stop while callback/work held with released controlled facts before genuine join, contiguous event/artifact recordSeq across multichunk artifacts and final/nonfinal refs, malformed/duplicate/wrong ACKs, reused operation IDs, and nil throws held truthfully — no fabricated proof. |
| driver-bridge-test-fixtures.mjs | C4b-04 TEST-only shared fixture leaf (declared before creation — now created; C4b-05 drops only the conflicting generic timers wording in its header, no body change): EXACT9 exports `RUN`, `SHA`, `MANIFEST`, `MANIFEST_PATH`, `LISTENER`, `flush`, `deferred`, `makeEnv`, `driveStart` — the WHOLE original fixture block over the REAL `createProtocolValidator` oracle and a real `createWatchdogLifetime` (the default lifetime keepalive is a real lazy hold; the fake clock controls heartbeat only). `makeEnv(t,opts)` arms real TestContext teardown before any bridge effect; the per-env send-callback tracker and controlled `deferred(env)` gates retire every held fact — including a deliberately unknown sync-throw submission — before a genuine fresh `owner.whenSettled` join and only then drop the transport/unsubscribe lane. Excluded from the functional-runtime union. |
| driver-bridge-lifecycle.test.mjs | C4b-04 TEST-only lifecycle owner (declared before creation — now created; dated actual04 whole-owner receipt 3/3 exit0; C4b-05 strengthened the held-body causality with a controlled entry proof and body-independent close ordering — the strengthened whole owner then gated 3/3 pass, exit0/0.1130 s, warnings [], stderr 0, hashes exact after): the WHOLE final THREE original cases — `finish` exact six fields plus close join/unwind, close-after-stop held-body/closed-callback ordering (two real chunks before the held gate so the first nonfinal send genuinely exists), and the real callback-error/unknown-sync-throw fault pair (the actual queued step awaited before the send lookup) — every original assertion/name/purpose preserved over the same shared fixture bindings, PLUS the appended C4b-07 first-pull admission-fence regression `stop during the first iterator pull admits no second pull or artifact frame` (four cases; a controlled iterator proves pulls===1 and zero artifact frames after a stop during a pending pull — a concrete red without the fence; the four-case owner then gated 4/4 pass, exit0/0.0801 s, warnings [], stderr 0, hashes exact after), PLUS the appended C4b-11e fifth case `fixture teardown releases gates, joins the real start body and closes the SDK before root removal` (real confined temp tree, fakeVite only, genuine AbortSignal, held model-read entry — the shared owner ordering release -> actual start-body completion -> fake-SDK close -> root removal is proven by an `afterSettle` probe and post-dispose ENOENT). Excluded from the functional-runtime union. |
| server.test.mjs | C4b-11 TEST-only owner (declared before creation): fake Vite/plugin/fs adapters over real confined temporary roots — listener-registration ACK gating before exposure or model reads, root/symlink/descriptor/arm/capability rejections before IO, pinned `MODEL_IDENTITY` verification with the pin as authority, baseline-S normalization versus candidate-S failure, candidate-only workbench route, injected frozen `window.__tinyazArm` config, unconditional post-listen failure/abort close, `delivery` event facts and once-only close error preservation. C4b-11c (declared before creation): helpers moved whole into connected-resource-test-fixtures.mjs under identical local aliases; genuine vs duck/prototype `AbortSignal` fakes with zero IO, abort inside the first `lstat` blocking later `stat`/imports, workspace-derived root/`cacheDir`/`fs.allow`/`watch:null` assertions, strict S-only baseline normalization plus arbitrary `*.bin`/`*.json` 404s, actual metadata digest delivery facts, and the awaited `delivery` record holding the response with a rejected record surfacing through `next(error)`. C4b-11e: `ownResourceStart` wraps every start with controlled gates in the owner's release stage; a `node:vm` execution of the emitted script proves the injected `window.__tinyazArm` descriptor is non-writable/deep-frozen; missing `cap.event`, a stray `inputs/setup/` metadata path and a post-close delivery ACK answering 503 are covered. Excluded from the functional-runtime union. |
| browser.test.mjs | C4b-11 TEST-only owner (declared before creation): fake Playwright namespace through `importModule` — browser-root plus fixture-RPC registration ACKs strictly before connect/context/page work, environment/launch literal validation, workspace-confined temp/download paths, strict loopback endpoint parsing with token redaction, isolated per-game contexts with recorded-origin request gating, partial-resource cleanup on error, sticky unexpected-closure fault versus expected-close marking, abort-driven graceful close and duplicate/failure close error preservation. C4b-11d: helpers imported from connected-resource-test-fixtures.mjs under identical aliases; class-instance `BrowserType` positive, duck-signal negative, exact `securityOptionsSha256` recompute plus correctly-hashed unsafe-arg rejection before work, `Request.url()` function fixture, held-abort at the first `mkdir` blocking launch/registration, arbitrary nil first close value with all closes still attempted, handled abort-driven close rejection, and quiet expected vs cohort-sticky vs check-recorded worker close. C4b-11e: `ownResourceStart` wraps every `openBrowser` issue; the actual `worker` event name drives the fake handlers; the same-promise reentrant close and the `null`/`undefined` first-value loop extend the existing close cases. Excluded from the functional-runtime union. |

### CURRENT71 native-fixture declaration (TEST-ONLY — declared before creation; now created and verified)

Declared before creation under the approved current R4 binding — the
exact four original native-fixture-preparation artifacts, the accepted
final-binding addendum and the N03 budget mapping (current binding
`/tmp/tinyaz-c4a2-sol-review/preparation/71-native-current-r4-binding.md`,
addendum `/tmp/tinyaz-c4b-readiness-plan/native-fixture-final-binding-addendum.md`,
N03 `/tmp/tinyaz-c4b-readiness-plan/native-fixture-n03-budget-binding.md`).
The earlier PLANNED2 absence wording above stays accurate as of this
declaration: both paths are now DECLARED, still absent, and nothing
here is created, executed or green. No production source, requirement
or map change; `BackendIdentity.helpers` stays exactly the three
Python owners and both TEST helpers stay excluded from the
functional-runtime input union.

Harness `native-test-fixtures.mjs`: ONE sole private export
`createNativeTestHarness({runId,recordRoot,pythonExecutable,helperPath,fixtureEntry,evidenceRoot,lifetime})`;
`lifetime` is a REQUIRED trusted constructor-produced
`createWatchdogLifetime` owner created BEFORE
harness/monitor/Store/Recorder/WD and shared exactly. Pure construction
captures the original hrtime start/end only — no IO/process/timer — and
returns the frozen twelve `{runId,bounds,clock,createMonitor,spawnImpl,forkImpl,entry,launch,settleHandles,snapshot,finish,endCollectorInputForEof}`.
`clock` carries the Native5 clock plus WD `nowMonoMs`/`nowUtc` on the
ONE `process.hrtime` origin — UTC is descriptive only, no time reset.
`createMonitor({runId,horizon=null})` returns `{protocol,monitor}`: a
supplied `horizon` is the genuine readonly NativeHorizon.reader passed
to the actual `createProcessMonitor` with the legacy
`getDeadlineMonoMs` OMITTED; when null the legacy getter of the
captured original group end is used — never both, never a new
lifetime; the monitor public 13 stays unchanged.

Entry `native-fixture.mjs`: exports NOTHING and imports ONLY Node
builtins plus its closed protocol TEST leaf
`native-fixture-protocol.mjs`; fixed six modes idle/listener/blocked-heartbeat/term-ignore/
reparent/finalizer; intrinsic finite self-exit `D=F+9500` inside the
original per-fixture `F+10000` with F captured before the real fork;
test-owned registration admission before substantive work; finite
`Atomics.wait` for the blocked loop, not a JS timer; the WD
blocked-heartbeat lane uses only the production ipcVersion1 driver
wire — no private fields on it; no raw kills, negative-PID/group
signals or post-stop native probes.

Private direct-fixture IPC (testVersion dialogue only; claims are
data, never native proof): every message carries the common keys
`{testVersion:1,runId,fixtureId,scopeRunId,type,pid}`, role
`root|descendant`, and F/D fields equal the argv-captured originals.

| Direction/type | Additional exact fields / effect |
| --- | --- |
| child→parent `waiting` | `{mode,role,parentPid,fixtureStartMonoMs:F,fixtureEndMonoMs:D}` after the intrinsic guard is armed |
| parent→child `admit` | `{mode,role,fixtureStartMonoMs:F,fixtureEndMonoMs:D}` only after actual native registration/ack |
| child→parent `admitted` | `{mode,role,fixtureStartMonoMs:F,fixtureEndMonoMs:D}` after installing mode behavior |
| child→parent `listening` | `{address:"127.0.0.1",port}` only after admitted bind; the real port is registered against the owner tuple |
| parent/root→helper `descendant-waiting` | `{descendant:{pid,parentPid,fixtureId,scopeRunId,mode:"term-ignore",role:"descendant",fixtureStartMonoMs:F,fixtureEndMonoMs:D}}`; Native independently proves/caches/covers it |
| helper→root `admit-descendant` | `{descendantPid,descendantFixtureId,fixtureStartMonoMs:F,fixtureEndMonoMs:D}`; root relays the exact admission |
| root→helper `descendant-admitted` | `{descendantPid,descendantFixtureId,fixtureStartMonoMs:F,fixtureEndMonoMs:D}`; data receipt only |
| helper→root `exit-parent` | `{descendantPid,descendantFixtureId}` only after actual cache/coverage and descendant admission |
| helper→child `close` | `{}`; graceful request for idle/listener/finalizer only — never a TERM-ignore substitute |

N13 one-shot EOF: `endCollectorInputForEof({runId})` returns a copied
stdin-end callback receipt `{runId,collectorIdentity,issuedAtMonoMs,stdinEndCallbackAtMonoMs,deadlineMonoMs}`
— never a reap/identity/cleanup verdict; physical settlement stays the
separate `settleHandles` actual exit+BOTH closes. Unexpected EOF
yields the actual collector exit 2 and the transport's real first
fault (`IPC_INVALID` / `collector exit`); no accounting-fault frame is
emitted or fabricated.

N03: real five-second admitted observation `[A, E=A+5000]`, graceful
`close` at `R<=F+7500`, and local retirement facts (fixture exit+BOTH
closes before D, fresh old-tuple `gone`, registered-listener absence,
helper gone/reap) complete before `P=F+10000` — the shared healthy
collector is NOT stopped; later formal cleanup runs its unchanged
original stages separately under the parent/group scope.

N08 stays the PURE 90000 ms command horizon with 500 ms heartbeats and
actual `OPERATION_TIMEOUT` in the unit owner — the real Native group
never claims a 90-second command.

N07: the caller creates the genuine `createNativeHorizon` OWNER before
Native/Store/Recorder/Footprint/WD, passes its reader to
`createMonitor` and the owner to WD with the exact shared lifetime to
all constructors; immediately after `run()` returns its promise the
owner synchronously narrows to the original `Gend` before the first
async IO continuation.

Execution binding: ONE real serial Native group inside the ONE
eventual serial fullglob
`node --test --test-concurrency=1 'train/scripts/browser_eval/*.test.mjs'`
only — group `<=60000` ms with the final `5000` reserved, each fixture
`<=10000` ms, `4 MiB` combined output, real `250` ms sampling with
`<=500` ms native duration/gap. No native test is executed by this
declaration. Serial monitor lifecycles run only after the previous
actual exit0+BOTH closes and all debt; the final EOF lifecycle only
after every normal lifecycle physically completes. Original required
assertions retained: N09 descendant shares the parent F/D, N10 nested
`${runId}:watchdog-selftest` scope, N11 same-live→gone on an
independent still-healthy collector, N12 original
TERM/listener-before-TERM-before-reap/exit0.

### CURRENT72 native-fixture-protocol declaration (TEST-ONLY — declared before creation; now created and verified)

Declared before creation under the root-accepted CURRENT72 binding
(`/tmp/tinyaz-c4a2-sol-review/preparation/72-native-entry-whole-protocol-capacity.md`;
the literal moved ranges are pinned in the adjacent
`72-native-entry-whole-protocol-inputs.json`). Status correction: the
CURRENT71 entry-absence wording is dated as-of-81a history —
`native-fixture.mjs` now exists at an actual 628 readable lines
(known oversize, NOT_PREPARED, not ready); `native-test-fixtures.mjs`
(the harness) remains absent, and this new leaf is declared before
creation. No tests or Native were invoked.

`native-fixture-protocol.mjs` is the ONE new trusted Node-only TEST
leaf for the concrete capacity split — TEST-only, excluded from the
functional-runtime input union and `BackendIdentity.helpers`. EXACT4
private exports (current73 listener delegation — the WHOLE listener
mode body plus all owned comments moved in literal as the fourth):

- `parseNativeFixtureArgv(argv,{die,nowMonoMs})` -> the SAME strict
  fixed configuration (the whole entry argv parser). Pure import —
  effects only on explicit call; the SAME original trusted
  `die`/`nowMonoMs` closures, no new origin/ceiling.
- `nativeFixtureFieldsExact(msg,base,extra)` -> the SAME boolean (the
  whole keysExact); the entry imports it IDENTICALLY as `keysExact`.
- `runNativeListenerFixture({runDirect,sendAdmitted,sendParent,die})`
  -> the original undefined (the whole real loopback listener mode
  body: bind-after-admit, the actual port report and the REAL
  `server.close` callback settlement before exit 0). The SAME four
  trusted function refs; the leaf imports the REAL Node `createServer`
  itself. Pure import — effects only on the explicit call; the entry
  keeps a thin `runListener` wrapper passing those exact refs.
- `runBlockedHeartbeatFixture({conf,die,malformed,nowMonoMs,isObj,keysExact,adoptChild,markAdmitted})`
  -> the original undefined (the whole blocked-heartbeat driver plus
  all owned comments/constants). All EIGHT captured trusted
  references are unchanged; ONLY `admitted=true` becomes
  `markAdmitted()`, directly setting the SAME entry-private flag.
  No new state/queue/owner/clock/ledger, no configurable timing or
  wire fields.

The leaf additionally receives the exact parser/driver-only constants
and the owned driver header moved whole — bodies literal apart from
`markAdmitted`; public name/signature/context wrappers are delegation
only. The entry retains the actualD timer armed BEFORE waiting/IO,
the remaining direct-private modes/admission/fork/descendant
mechanics and ZERO exports; its only new local import is this leaf,
so the WHOLE transitive child import closure remains ONLY Node
builtins — no production/app/browser/model/Python import — precisely
superseding the earlier "entry-direct-imports-Node-only" shorthand
(no public capability is added). DAG `entry -> leaf` one-way acyclic:
the leaf imports only Node builtins, never the harness, the entry or
another project module; the entry forwards the exact same closure
references. All strict malformed/role/seq/manifest/registration/
once-submitted-send/finiteAtomics/TERM/EOF/finally behavior, the
unchanged timer/owner/clock, the admission-before-bind listener
semantics and the production driver wire stay exact. Entry 0
exports, leaf 4, harness 1->12 unchanged.

Current73 status (literal capacity correction, source-only and NOT
executed — manager verifies BEFORE any target import or test): the
entry was 628 (KNOWN_OVERSIZE draft) then 409 after the first split;
after this whole listener move the actual counts are `native-fixture.mjs`
384 and `native-fixture-protocol.mjs` 348 readable lines, both under
the 400 target with no guard, comment or assertion shaved. No new
path, owner, row or scope — the same map-207 Create row covers this
existing leaf.

### CURRENT74 native-fixture-io/admission declaration (TEST-ONLY — declared before creation; now created and verified)

Declared before creation under the root-accepted CURRENT74 binding
(`/tmp/tinyaz-c4a2-sol-review/preparation/74-native-harness-whole-io-and-admission.md`;
literal moved ranges pinned in its adjacent inputs file). Status
correction: earlier absence wording is dated history —
`native-test-fixtures.mjs` now exists at an actual 941 readable lines
(SHA `ccbf6cd0a0f4415346c08211e9722c31c234f33be206ddcb36d4d5386779249f`
preserved; known oversize, NOT_PREPARED, source-only, not green);
`native-fixture.mjs` stands at 384 and `native-fixture-protocol.mjs`
at 348 after the current73 listener move (source-only, not executed);
the two new leaves below are ABSENT before creation. No tests or
Native were invoked.

Two cohesive whole-owner splits out of the harness, both TEST-only
and excluded from the functional-runtime input union and
`BackendIdentity.helpers` (still exactly the three Python owners):

- `train/scripts/browser_eval/native-fixture-io.mjs` — sole private
  export `createNativeFixtureIO({inputs,state,bounds,clock,constants,observe,getAdmission})`
  -> frozen EXACT8 `{spawnImpl,forkImpl,waitPrivate,sendPrivate,deferred,guardedText,guardedError,waitUntil}`
  (unchanged roster — under current75 `guardedText`/`guardedError`
  are thin synchronous delegates to the ONE admission-owned pair).
  Imports ONLY Node builtins; same strong children/receipt index and
  original real Node spawn/fork; no resource/retainer/timer/IO at
  construction. `getAdmission` is invoked ONLY inside admitted
  runtime methods/handlers, returning the ONE already-composed
  admission instance.
- `train/scripts/browser_eval/native-fixture-admission.mjs` — sole
  private export `createNativeFixtureAdmission({inputs,state,bounds,clock,constants,observe,io})`
  -> frozen EXACT8 `{checkFixtureArgv,createMonitor,onPrivateFrame,validateInbound,entry,launch,guardedText,guardedError}`
  (current75: EXACT6 -> EXACT8 — the WHOLE 10-line error-formatter
  block, both comments plus `guardedText`/`guardedError`, moved
  literal inside this existing factory before runtime use with the
  same 4096 bound and explicit presence; the leaf is the ONE pure
  formatter owner, no new owner/ctor/callback/queue/clock/status).
  Real production `createProcessMonitor`/`createProtocolValidator`/
  pure protocol-values plus Node builtins only — no fake Native or
  second authority; construction invokes NO borrowed
  callback/timer/IO/process.

Shared exact context: frozen `inputs` is the SAME 7-field harness
input object (identical `lifetime` reference, never cloned); shared
`constants` = `{FIXTURE_MS,FIXTURE_BOUND_MS,ADMIT_MS,MAX_BYTES,MAX_LIST,DIRECT_MODES,MODES,ARGV_FLAGS,COMMON,INBOUND_EXTRA}`
at original values — `MAX_LIST` 64 is an error-diagnostic bound only,
the `MAX_ENTRY_BYTES` silent truncation is removed, real protocol
frame limits are unchanged and combined `4 MiB` stays HARD; frozen
`observe` = `{fail,isObj,nodeImagePath,recordError,room,retainEntry,selectMonitor,assignScope}`
parent closures over ONE original state/owner/clock/`Gstart`/`Gend` —
no duplicate registry/queue/counter/horizon/proof or driver-wire
change. Pure factories: neither construction invokes a borrowed
callback/timer/IO/process.

Composition: the parent sets private `let admission`, constructs IO
with `getAdmission:()=>admission`, then assigns `admission` from the
pure admission factory and exposes the public 12 ONLY AFTER both are
fully assigned — one-way DAG: Parent->both leaves, IO has no project
import, Admission->production leaves only, and neither leaf imports
the parent or each other. The parent keeps the sole
`createNativeTestHarness` 7-input API and frozen public 12 EXACT and
retains EOF/finish/settleHandles/snapshot/group setup-accounting plus
the two pure registry closures, while borrowing `io.deferred`/
`guardedText`/`guardedError`/`waitUntil` and direct method aliases.

Bundled concrete binding corrections — preserved EXISTING
requirements, not new scope:

1. Entry argv `--run-id` is the selected `monitorRunId`, never the
   outer group; `checkFixtureArgv` compares to the selected actual
   monitor and private receive/send uses `rec.monitorRunId`; exact
   stdio `[ignore,pipe,pipe,ipc]` before the real fork.
2. `waitUntil` rejects spent/malformed bounds BEFORE waiting and
   rechecks the actual clock after fulfillment; every native
   registerRoot/sample invocation gets `{deadlineMonoMs:capturedBound}`
   plus a live check BEFORE invocation — no promise-only outer race,
   late root activation, new grace or deadline reset; malformed
   settle/finish bounds reject, omitted may borrow the original
   group end only.
3. Trace/output: no arbitrary 64-round truncation or successful
   `{truncatedBytes}` substitute — every required accepted
   round/projection is retained under the unchanged 4 MiB, flagged
   failure if it cannot be retained; produced bytes keep counting
   truthfully after overflow without retaining payload; retained
   projections charge actual serialized bytes to the SAME pool, no
   second ledger.
4. EOF one-shot reserved synchronously BEFORE the first async sample,
   never reset/retry; after sampling, the original bound and the
   current exact collector tuple+handle are rechecked before actual
   `stdin.end` — no shutdown/EOF replacement, new workload debt or
   duplicate end through concurrent invocation.
5. Private send returns a handled Promise of its ORIGINAL operation
   result awaited at the launch/reparent send sites under the
   original bound; a callback error rejects the SAME raw value, the
   neutral callback receipt stays separate, ambiguous synchronous
   throws keep the rejected/unproven receipt held by the genuine
   lifetime, and the FIRST raw failure is never erased by a late
   callback — no arity probe or replay.
6. Sticky malformed private channel: the fault is checked BEFORE
   queue consumption and before accepting any later frame — no
   valid-looking queued/replayed frame revives admission; original
   private closed fields/modes/role/F/D and Node parsed-object
   limits remain.
7. `clock.nowUtc` returns the ISO string per the WD contract (date
   descriptive only); `finish`'s once-promise is cached BEFORE any
   cleanup callback invocation (prearmed deferred), still joining the
   same actual lifetime/child/callback debts — no self-wait,
   public-promise proof or new time; primary and cleanup errors are
   both preserved.
8. Multi-statement callbacks/guards expand to readable
   one-statement-per-line form with every original assertion
   purpose/guard/comment preserved — a structural split plus
   identified fixes, not a claim the code stays byte-exact.

Current75 status (whole error-formatter move into the existing
admission owner plus the two bundled deadline corrections,
source-only and NOT executed — manager verifies BEFORE any target
import or test): the WHOLE 10-line `guardedText`/`guardedError`
block moved literal from the IO leaf inside the existing admission
factory (roster EXACT6 -> EXACT8; IO keeps its frozen EXACT8 through
thin synchronous delegates to `getAdmission()`), `waitPrivate`'s
already-queued branch now executes `consume` inside the SAME
`waitUntil` thunk under the captured original bound — a spent bound
rejects before any queued frame is consumed — and the EOF public
return is the original-group-bounded `waitUntil` wait on the raw
`out.promise` while the separate retained callback receipt stays
strongly held until the actual callback, never retired by the public
timeout. No refreshed deadline, new time, Native call, schema or
source helper. Actual counts: `native-fixture-io.mjs` 388,
`native-fixture-admission.mjs` 375 and `native-test-fixtures.mjs`
388 readable lines, all under the 400 cap with no guard, comment or
blank shaved (the earlier author-claimed admission 374 figure is
corrected to the actual 375). No new path, owner, map row or scope —
the same map-209 actions/paths/order stay exact.

Current81d status (source-only, UNEXECUTED — no target import, test or
Native ran): all five Native TEST helpers now exist —
`native-test-fixtures.mjs` 388 (sole `createNativeTestHarness` 7-input
-> frozen public 12), `native-fixture.mjs` 384 entry (0 exports,
importing Node builtins PLUS the closed `native-fixture-protocol.mjs`
TEST leaf whose transitive deps remain Node-only — no
app/browser/model imports; the header now states D as a finite safety guard with
actual events deciding compliance, late overrun failing and no kernel
scheduling guarantee), `native-fixture-protocol.mjs` 348 (4 exports),
`native-fixture-io.mjs` 388 (`createNativeFixtureIO` -> EXACT8) and
`native-fixture-admission.mjs` 375 (`createNativeFixtureAdmission` ->
EXACT8). The three-leaf architecture (entry -> protocol leaf;
harness parent -> io + admission leaves) and the runtime exclusion
stay exact — TEST-only, never in the functional-runtime input union,
and `BackendIdentity.helpers` remains exactly the three Python owners.
`native-supervision.test.mjs` is authored as ONE serial real Native
group covering the frozen N01-N15 matrix over these helpers with the
original 60 s group/10 s fixture/4 MiB bounds, an explicit failure on
unsupported platforms and no skip; it has NOT executed — no green,
pass or Native claim. The prior "still absent / PLANNED" wording above
stays qualified as dated history rather than erased; map-209
actions/paths/order and the Section-3 `070fbf` slice stay exact.

### CURRENT76 native-normal-test-cases declaration (TEST-ONLY — created source-only; now verified)

Declared under the concrete authorized CURRENT76 binding
(`/tmp/tinyaz-c4a2-sol-review/preparation/76-native-normal-case-capacity-and-concrete-fixes.md`;
the exact moved ranges/bodies/hashes are pinned in
`76-native-normal-whole-inputs.json`). Concrete status: the earlier
705-line KNOWNOVERSIZE suite measure stands as dated history (closed
baseline
`/tmp/tinyaz-c4a2-sol-review/native-suite-81d-not-prepared-1/handoff.json`);
the leaf is now CREATED at an actual 379 readable lines and the suite
at 396, both source-only and UNEXECUTED. Fresh Native safety and the
serial fullglob remain OPEN, and no pass/green/Native claim is made.

`./train/scripts/browser_eval/native-normal-test-cases.mjs` is the ONE
TEST-only suite helper — NOT a discovered test owner and not
part of the runtime. ONE private export
`runNativeNormalCases(ctx)->Promise<void>` taking the exact15 context
keys `{h,monitor,ready,lifetime,clock,bounds,runId,nestedRunId,order,normal,until,within,fixtureMeta,recOf,assertSettledChild}`:
every reference is the SAME already-created genuine group capability,
and `normal` is the existing suite control state with `formalDone`
initially false and set true only after actual formal cleanup returns
— control state only, no proof/status/owner/clock/queue/budget
authority. The method rejects the original arbitrary failure
unchanged. The suite retains N01's SAME local pure `isIdentity`
predicate and assertions; the leaf holds a private EXACT copy of that
predicate (a copy input, never an undeclared export) plus the WHOLE
moved local
`sendClose` plus its comments and the full Phase2-4 normal cases with
the identified semantic repairs; its import is effect-free and
explicit work is invoked once inside the SAME existing serial group —
the suite retains its sole ONE real group across the 35 explicit
serial owners. Module imports ONLY `node:assert/strict` and the
existing `watchdog-cleanup.mjs` — no backimport to
suite/harness/IO/admission, no app/browser/model/Python; TEST-only,
excluded from the functional-runtime input union and
`BackendIdentity.helpers` (still exactly three Python owners), under
the same hard 4 MiB / 60 s group / 10 s fixture / 250 ms sample /
500 ms bounds with the original Native5+owner semantics unchanged.

Bundled concrete repairs (identified corrections, original assertions
preserved): correlate complete full tuples and actual raw
requests/replies across N03 `[A,R]` keeping the canonical uint64
identity assertions — the final admitted covering observation lands
at/after `E=A+5000` before `R<=F+7500`, never a stale
lastObservation; the reparent case observes the actual direct-root
exit (real child exit event or already-recorded fact) before reading
`exit.code` under the same bound — no both-pipe wait while the
descendant lives — and asserts the actual TERM/KILL times at
`C+2000`/`C+4000` with still-live before KILL plus the TERM fixture's
physical exit+BOTH closes preceding the fresh gone probe; `within`
accepts a THUNK — rejects a spent bound before effect and rechecks
`now>=bound` after completion — and until/losing timers clear on
unwind; `sendClose` prearms the SAME owner callback receipt before
send so an ambiguous synchronous throw keeps its own debt unresolved;
the EOF lifecycle drops the `for(;;)`/now+25 poll for a fresh genuine
`lifetime.whenSettled` under the original bound before inspecting
actual exit2+BOTHclose/fault and ordinary refusal; `finally` retains
the actual monitor/controller/WD run refs for EVERY created lifecycle
including faulted/partial starts, preserving the first primary plus
all cleanup errors; the bounded retained raw trace persists through
the SAME prearmed FS body then a fresh owner-zero — never serialized
raw handles or a public-timeout-as-settlement claim; and the unneeded
unowned ephemeral server stimulus is replaced by the SAME actually
closed N03 registered listener port, meeting N06.

Current77 (same-change correction, declared before any Native
import/test — source-only, UNEXECUTED): `native-fixture-protocol.mjs`
becomes EXACT5 private exports — the new
`createNativeFixtureWaits({clock}) -> frozen {until,within}` is the
WHOLE existing 31-line bounded wait-primitive block moved literal out
of the suite (literal body pinned in
`77-native-waiters-whole-input.json`): a PURE constructor capturing
the SAME borrowed clock and its `nowMonoMs` reference only — no
timer/callback/clock invocation at import or construction, no new
end/default/grace/owner authority; the earlier four exports stay byte
exact and the leaf stays Node-builtins-only with no project imports.
The suite imports the factory, constructs ONCE over `h.clock` and
delegates `until`/`within` — no duplicate local waiter or second
timer owner — while the leaf receives the SAME methods through ctx.
Bundled source corrections: both normal `sendClose` issues plus their
real callback waits are PUBLIC bounded — the first close ISSUE
`<=F+7500` is asserted on the actual call-entry INSIDE the thunk
BEFORE the send issues (a private local fact, so a late issue is
prevented), while the public send-callback wait runs under the
ORIGINAL `min(D,groupEnd)` — physical exit+BOTH closes at original
`D=F+9500`, the final absence proof at original `P=F+10000` — the raw
callback receipt stays separately held; the finalizer close stays
under the original `min(D,P,Gend)`; the N03 covering sample's real
`{deadlineMonoMs}` is the SAME captured `min(F+7500,groupEnd)` as the
outer race — never the wider `F+10000` — and its comment now names
the admitted observation timestamp (never a private Native commit
time); the bounded summary's write issue plus PUBLIC wait both run
under the ORIGINAL groupEnd inside the same thunk with the receipt
prearmed BEFORE the write, and the serialized copy is enforced
against the SAME combined produced+retained 4 MiB before issue —
never a public-timeout-as-safe claim; and the N07 trace assertions
correlate own-roots/roots-accepted by the actual `requestId` inside
WD_RUN_ID scope, retaining the accepted `kind:'fixture'` full-tuple
workload child — never the actual direct driver handle, the
protected bootstrap supervisor/collector roots, a helper, or an
earlier normal/N09 root — before matching its KILL. An interim
cap-driven trim of the suite (merged stop assertion, shortened EOF
comment/thunk) was REJECTED and the pinned full 403-line source was
restored (dated baseline
`native-four-fixes-81g-not-prepared-1/public-write-versions/039-403-native-supervision.test.mjs`),
with ONLY the `createNativeTestHarness` call reflowed to ordinary
readable lines — no assertion/comment/guard lost; final readable
counts suite 397 / leaf 399 / protocol 392. Map-210
actions/paths/order, the serial command, 35 owners/ONE
group/60 s/10 s/4 MiB/250/500 bounds and the Section-3 `070fbf`
slice stay exact; still source-only and UNEXECUTED.

Current78 (same-change SourceA correction after the ACTUAL first
whole35-owner glob — 324 pass/1 Native bootstrap image fail in
62.520166 ms, collector really exit0+BOTH closes; root cause: the
resolved venv invocation lands on the framework
`.../Python.framework/Versions/<maj.min>/bin/python<maj.min>`
LAUNCHER while proc_pidpath reports the exec'd payload
`Resources/Python.app/Contents/MacOS/Python` — different
bytes/inodes, never aliases): `process-backend-reader.mjs` gains a
SECOND private export
`resolvePythonProcessImage(pythonExecutable,{resolvePath=realpathSync}={})
-> abs`. An explicit call realpaths the pinned invocation; a canonical
`.../Python.framework/Versions/<v>/bin/` launcher derives ONLY the
same-versionroot `Resources/Python.app/Contents/MacOS/Python`
payload, whose own realpath must equal that confined expected path —
a nonframework resolved executable IS its own image (direct case), a
recognized malformed framework layout or a missing/denied/redirected
payload fails ACCOUNTING_UNAVAILABLE, raw resolvePath failures
propagate, and no observed-child path, walk, spawn/probe or fallback
is ever used; import is effect-free (reader exports 1->2).
`process-proof.mjs` bootstrap now compares the collector's native
executable against the derived actual PROCESS image — every PID/full
tuple/UID/PPID and the pinned Node image guard unchanged —
`process-lsof.mjs` uses the same resolved process image for
registerHelper `expectedExecutable` and the transition
`fromExecutable` while spawn ARGV stays the selected venv invocation,
and `captureBackendIdentity` keeps ALL seven launcher fields exact
(`invocationPath`/`realPath`/`sha256` still the resolved LAUNCHER
content) plus REQUIRED `processImage:{realPath,sha256}` through the
SAME bounded owned reader/pre-post stat/real close/borrowed handle —
a distinct payload gets its own streamed hash, a direct image reuses
the launcher fact. Legacy 7-field python records reject; fresh
receipts/CommonIdentity are required. SourceB now wired: `PY_EXEC_SPEC` gains mandatory `processImage:"obj"`
with `vPyExec` validating the EXACT-2 `{realPath:"abs",sha256:"hash"}`
descriptor — the SAME type for `BackendIdentity.python` and
`CommonEnvironment.python.runtime`, all seven launcher fields and the
`deepEqual(environment.monitoring.python, environment.python.runtime)`
coherence guard unchanged; old 7-only records reject SCHEMA_MISSING
and fresh receipts/CommonIdentity are required. `PY_RUNTIME` carries a
structurally exact nested descriptor under the same freeze; the
existing backend test gains direct-image reuse, framework
launcher/payload independent-hash, deterministic resolver, missing/
redirected/malformed-launcher, missing/relative/bad-sha/extra-field
and processImage-only coherence-drift cases over injected fakes — no
real Native/spawn. The resolver also rejects any OTHER recognizable
framework `bin/` python layout (non-version Versions segment,
version/bin basename mismatch or a bin outside Versions) as
ACCOUNTING_UNAVAILABLE — only the canonical launcher derives a
payload and only the canonical `Resources/.../Python` payload or a
nonframework path qualifies as direct image. The serial suite persists
the actual captured `BackendIdentity` via a `backendFacts` array +
property in the same summary literal (+2 source lines, suite 399). The
prior glob remains the actual state — 324 pass/1 bootstrap image
fail, collector exit0+BOTH closes; this fix is UNEXECUTED pending
unit checks, fresh Native safety and the required whole35 serial
rerun. Map-210 actions/paths/order and the `070fbf` slice stay exact;
no green or pass claim. SourceB+82D: the shared monitor TEST fixture
now pins the SAME `resolvePythonProcessImage` resolver for the
inspected collector/wrapper Python image (the deterministic loaded
PROCESS image, never the launcher) while the ready `executable` and
the actual spawn ARGV remain the original selected invocation —
`SUPIMG`/`LSOFIMG` unchanged; the actual prior 5 `processes` failures
(ACCOUNTING_UNAVAILABLE bootstrap proof against the stale launcher
pin) are recorded and fresh pure gates plus the required whole35
serial rerun stay pending — no green claim. Current78+83A diagnostics
(after the ACTUAL second whole35 glob — 333 tests = 332 pass/1 Native
fail: bootstrap/backend identity and the 5 s N03 window now succeed,
`queryListeners` then failed LSOF_UNAVAILABLE register and the summary
4 MiB assertion prevented persisted diagnostics): the lsof `race`
mapping still throws the SAME `lsofError(tag)` with identical
code/message/tag but now carries the original ACCOUNTING_UNAVAILABLE
as `.cause`, so an AggregateError exposes the real root proof detail;
`registerRootProved`'s unchanged `acct` throw now names the validated
actual `ins.executable` beside `expectedExecutable` — every tuple/
live/UID/PPID/lineage/bound guard, wire and admission semantic intact;
and the same strict `produced+retained+copyBytes <= 4194304` assert
before write now reports the truthful byte counters plus ONLY the
actual `inspected` rows of the last retained `process-samples` entry
(or null) — the discovered table and whole sample entry are not
serialized — bounded failure-only metadata, never a cap waiver or raw
evidence substitute. The 333/332/1 failure receipt stands; no
Native/phase green claim. Current79 (helper-only readiness barrier —
the actual 83B cause: the exec-gated helper was natively inspected
while still the pinned LAUNCHER in its pre-payload exec window, same
full tuple/UID501/PPID supervisor): `process-observation.mjs` gains a
THIRD private export
`readHelperReadyInspection({pid,kind,expectedExecutable,pythonExecutable,resolvePath,uid,inspect},handle)`
— ONE first same-handle inspection shared by every registration
(non-helper rows or rows already at the expected image return with no
Python FS resolution); only a pending helper whose expectedExecutable
equals the deterministic `resolvePythonProcessImage` payload AND whose
resolved launcher differs, and whose first row is live exact-launcher
with the supplied non-null UID and this supervisor's PPID, qualifies
for the bounded wait — fresh same-handle inspections of ONLY that pid,
`assertLive` before every read and after each return, every row still
live with the same privately-copied full tuple/UID/PPID;
gone/unavailable/reuse or UID/PPID change and any third image fail
ACCOUNTING_UNAVAILABLE, a launcher row is NEVER returned as proof,
only the exact payload row returns — no sleep/tick/clock/budget/queue
or owner. `registerRootProved` delegates ONLY its first
registration-inspection acquisition to it; every original
live/image/UID/PPID/lineage/root-ack/ownership guard keeps position.
Pure regressions in the existing monitor suite script launcher→payload
transitions, changed tuple/UID/PPID, third image, expiry-zero-reads
and single-read paths — no real spawn/Native. The 83B gate is pending
a fresh required whole35 serial run; no green claim. Current80
(complete owned context — actual 84A cause: inspect/probe `sample`
frames were issued with `owned: []`, a stale owned context the wire
and discovery semantics could not accept): `readProcessInspections`
gains ctx key `getOwnedIdentities` and calls the genuine
`ownership.ownedIdentities()` at EVERY issue — the proof `inspect`
closure supplies it verbatim, `probeIdentityFresh` likewise sends the
full union, and `runCycle`'s coverage repeats now send the COMPLETE
current owned union (never fresh-only) while `fresh` still gates
extra rounds and the dedupe map keeps the latest actual samples; all
native-gap/500 ms/COVERAGE_ROUNDS/commit/peak guards and the third
`readHelperReadyInspection` transition API are unchanged. The
readiness tuple-negative now scripts the SAME pid with a different
`startSec` (the mismatched pid poisoned the wire validator), and the
new helper cases share an unconditional `disposeHelperFixture`
teardown — fake exit + BOTH pipe closes released before the awaited
stop join, temp root removed only after join, real stop rejection
retained. The stateless Python discovery projection stays a pending
separate slice: `project_discovery(rows,owned,roots)` would be
DATA-ONLY (full-tuple live seeds, candidate PGIDs live-seed PGID + all
registered root PIDs, transitive PPID closure) with JS ownership still
the sole ambient-group/PID-reuse authority and full-UID discovery
validation unchanged — Python `process-macos.py`/
`process-macos-native.py` are the ONLY approved readonly-exception
targets plus required existing TEST wire/support; Native ABI, the six
TinyAZ refs, protected 17, `BackendIdentity.helpers` (exact 3),
schema/wire/budget/counters, emitted raw rounds and the strict 4 MiB
summary fail all stay exact. Coherent Node-only partial, Native not
cleared — no green claim; the 84A pure-state receipt stands. Current80
continuation (85C differential TEST bridge — source-only): TEST-only
`process_macos_test_support.py` gains a guarded `__main__
--project-discovery` mode — the ONLY CLI entry; importing still has
no effect — reading bounded stdin JSON ≤ 64 KiB exactly
`{rows,owned,roots}` and emitting the ACTUAL `N.project_discovery`
result (native core loaded for definitions only, never
bind_libproc/CDLL/OS calls; not a fourth runtime helper). The Node
bridge uses `execFileSync` on the exact `PYTHON_EXECUTABLE` with fixed
argv `["-I","-B",SUPPORT,"--project-discovery"]`, controlled JSON
input, 2 s timeout, 256 KiB maxBuffer, no shell/eval/network.
`process-macos-wire.test.py` `fake_n` now binds the REAL projector and
a new case proves a native `uid-mismatch` inside `discover` still
faults ACCOUNTING_UNAVAILABLE/exit 2 before the projector runs —
upstream full-UID validation is never forgiven by output projection.
`process-ownership.test.mjs` gains differential bridge cases: two
genuine `createOwnership` instances share roots/scopes; per complete
frame one sees FULL rows, the other the actual projector output keyed
by ITS complete owned union (every frame, never roots-only), comparing
exact owned/workload/_ownedRows/signal-target parity over
reverse-order deep ancestry with unrelated rows proven removed,
protected ambient-group data-only rows, reparent+PGID-change
retention, dead-root live groups, retired-group pid+pgid tuple reuse
(new tuples never inherit) and two-scope protected/wrong-scope
rejections; only uid-501 rows in positive data, foreign-UID validation
covered by the existing JS negative plus the new upstream-fault wire
case. Source coherent but UNEXECUTED: prior 333/332/1 receipt and the
84A tuple failure stand; fresh static/SDK-unit/mock-Python/full-35
Native gates pending, no green claim. Native helper is 8 identity
files pending fresh content hashes; `BackendIdentity.helpers` stays
exactly 3 (TEST support excluded), six model refs, protected 17, the
`070fbf` slice and map-210 unchanged. Current81 (live-workload
listener selection — actual full-35 344/343/1 cause: the single
owned-pids union mixed permanently cached-gone PIDs with live ones;
lsof exits 1 on ANY unmatched PID while still printing other rows
(local manpage + upstream docs/manpage.md DIAGNOSTICS), and the strict
parser correctly accepts exit-1 only with BOTH streams empty — no -Q,
relaxation, flag or timing change): `process-observation.mjs` gains a
FOURTH private export
`readLiveWorkloadPids(identities,handle,{inspect,uid})` — privately
copies the exact full-tuple snapshot, deduplicates PIDs for ONE fresh
same-handle inspect (empty snapshot returns [] with no issue),
assertLive before and after, fails closed ACCOUNTING_UNAVAILABLE on
missing/unavailable/malformed rows or UID drift, skips ONLY native-gone
rows or a live same-PID different-tuple reuse (retained caches never
evicted), and returns the matching live PIDs. `queryListenersScoped`
freezes the workload snapshot once, classifies liveness through the
SAME enqueue/handle (`uid: ownUid()`), then runs one gated
`queryOwnedPids` PER remaining live PID sequentially on the same
borrowed handle/retainer/horizon — the old one-union implementation is
replaced, never relaxed. Every registered-port query still runs
including gone owners, and the fresh-holder tuple/declared-port/
loopback/unexpected checks stay exact; zero-live skips only owned-PID
queries, never port queries. Declared NEXT-slice TEST fixture:
`process-lsof-test-fixtures.mjs` gains a FOURTH export
`createListenerProofFixture({script={}}={})` returning frozen
`{clock,handle,ownership,proofs,calls,retainActual}` — REAL
ownership/proof/protocol factories over fake bounded inspect/query
spies plus the REAL strict parser, a pure fake-clock/handle
constructor, no process/Native/IO — used by existing roomy
`process-ownership.test.mjs` for 5 causal regressions; existing 3
export identities unchanged, no new path or authority. The actual
344/343/1 receipt with the 1,787,178-byte summary under 4 MiB and the
clean collector exit+BOTH-close proof stands as history; this fix is
UNEXECUTED pending the bound test slice and a fresh whole35 gate — no
green claim. Native ABI, six model refs, protected 17,
`BackendIdentity.helpers` exactly 3, map-210 actions/paths/order and
the `070fbf` slice all unchanged. Current82 (teardown/diagnostic —
actual 86B full-35 receipt 349=348pass/1NativeFAIL: the collector
emitted an `unstable-list` accounting-fault and exited 2 with BOTH
closes, the listener intrinsic guard exited 88 with BOTH closes, and
the suite's finally skipped `stopAndReap` for the already physically
settled collector so its referenced sampling interval never cleared —
the worker hung until the manager SIGTERMed only that proven
descendant-free Node TEST worker after confirming actual exit/pipe
facts; the parent finished 349/348/1 and the discarded `diagnostic`
field hid the exact cause): the finally loop now calls the genuine
`lane.m.stopAndReap({deadlineMonoMs:groupEnd})` for EVERY created
lifecycle — faulted or already physically settled included — after
the first monitor's formal cleanup attempt, because physical
settlement is never monitor shutdown proof;
`native-fixture-admission.mjs` retains the admitted required bounded
`diagnostic` field verbatim in the accounting-fault trace under the
SAME combined 4 MiB accounting; and a controlled fake-only lifecycle
regression proves a faulted physically-settled collector still stops,
returns the real exit-2 result, clears its sampler interval,
preserves the SAME primary fault facts and the ONE cached receipt,
and never resumes sampling.
The 349/348/1 receipt stands as history; this source is UNEXECUTED
pending the actual gates — no pass claim. `070fbf`, map-210,
Python/discovery and all approved runtime requirements untouched.
Current83 (lsof file-set framing — actual 87A2 full-35 receipt
350=349pass/1NativeFAIL, zero signals/stderr: a live listener query
hit LSOF_UNAVAILABLE `field f13` at the strict parser while the real
lsof exited 0 — the fixed argv `-F0pn` always selects the FILE-set
field, which the p/n-only grammar rejected): the installed lsof man
OUTPUT FOR OTHER PROGRAMS section and upstream docs confirm process
sets start `p`, FILE
sets start `f`, fields end NUL and sets end NL — real shape
`p7576\0\nf13\0n127.0.0.1:58689\0\n`. `parseLsofResult` now recognizes
and STRICTLY validates `f`: each file set requires a current valid
PID, a canonical nonnegative decimal fd (zero legal; no leading
zeros/sign/suffix/pseudo-name, safe bounded integer) and exactly one
nonempty `n`; orphan `f`, `n` without `f`, a duplicate `n`, an
unfinished or repeated `f`, `f` before `p` and every unknown letter
still fail. Strict UTF-8/NUL/truncation/newline/empty-field/PID/port/
endpoint/exit/stderr rules, the frozen row shape and dedup are
unchanged — no flags, -Q, argv, wire or timing change. All positive
test literals moved to real `p/f/n` framing with the real f13 shape
plus fd-0/IPv6/multiple-set coverage and the full fd negative roster;
the 350/349/1 receipt stands as history, source UNEXECUTED pending
the actual gates — no pass claim. `070fbf` describes p/n evidence
without prohibiting the validated mandatory `f` framing and stays
byte-exact; map-210 and every other requirement unchanged.
Current84 (watchdog child stimulus — actual 88A full-35 receipt
352=351pass/1NativeFAIL, zero signals/stderr, every created Native
handle exit+BOTHclose: the normal listener/TERM/reap path and the WD
real heartbeat gap + HEARTBEAT_TIMEOUT now pass; the exact failed
assertion was the KILL on the same WD CHILD — the adopted child 9393
took the real TERM and went gone while driver 9392 took the real KILL
and SIGKILL-exited, because the adopted child ran the `idle` stimulus
which exits on TERM): `runBlockedHeartbeatFixture` now adopts the
child in the EXISTING `term-ignore` mode (`:term-ignore`
fixtureId suffix) — the entry's already-implemented mode installs a
real SIGTERM ignore BEFORE `sendAdmitted`, so the child survives the
actual TERM and the exact same-full-tuple KILL assertion (readonly,
unweakened) observes the real signal. Same actual `adoptChild`,
inherited stdout/stderr, original F/D, full-tuple register+rootACK
admission, wire fields/seq, begin/begun/finite Atomics.wait, parent
SIGTERM handler and all physical cleanup semantics unchanged — no new
mode/handler/retry/deadline/proof. The parser framing comment now says
non-p/f/n to match the mandatory `f`. The 352/351/1 receipt stands
as history; this source is UNEXECUTED pending the actual Native gate
— no pass claim; `070fbf`, map-210 and all original bounds/gates
unchanged. Gate status update (2026-11-05): every
UNEXECUTED/source-only status line in Current79–84 above is a dated
authoring-time declaration — the subsequent actual owned full-35 gate
verified this source, and its receipt is recorded under Current
verified status at the top of this document; C4b/C5/comparison remain
open.

## Commands

```sh
train/.venv/bin/python -I -B train/scripts/browser_eval/process-macos.test.py  # Python suite once
npm run test:browser-harness   # node --test 'train/scripts/browser_eval/*.test.mjs' (native group included once via the glob)
```

The full-harness execution ran as ONE serial command — the actual
owned invocation listed the same 35 explicit `*.test.mjs` suite paths
(equivalent to the unchanged glob expansion) with the native group
included exactly once and no separate real-Native invocation preceding
or duplicating it:

```sh
node --test --test-concurrency=1 'train/scripts/browser_eval/*.test.mjs'
```

`--test-concurrency=1` is an execution-only serial file limit;
`package.json` and the glob are unchanged. The glob form above is the
documented equivalent; the verified owned run used the 35 explicit
suite paths — see the Current verified status receipt at the top.

The suites exercise the production libraries with literal independent
expectations, temporary directories and controlled callbacks. These are
unit/Native-library receipts only: phase runs and parity/strength
evidence remain pending later authorized packets.

Verification status (Sol review-5 on frozen prepared-5, 2026-11-02):
`npm run test:browser-harness` exited 0 at 14:13:43-14:13:48Z with 138/138
cases across the ten suites, zero failed/skipped/cancelled and no warnings;
`git diff --check` exited 0 and all 33 frozen source/doc hashes stayed
equal after the gates. Two independent Sol 6.1-Max bounded reviews
returned ACCEPTABLE and the final verdict is
ACCEPTED_SOURCE_FOR_FINAL_DOCUMENTATION_METADATA for this pure-JS
evidence-library boundary only. The app-191/core-184 and typecheck
receipts carry from prepared-1 on exact unchanged-input proof, not a
rerun. Real native cleanup/identity bindings, ABI/process/watchdog proof,
capture/browser checks, numeric parity, preflight and the final cohort
remain pending C4a2/C4b/C5; no strength, Elo or phase receipt exists.

C4a2 Native5 bounded acceptance (Sol's fifth frozen review,
`native-unit-prepared-5`, on the accepted source snapshot): the two
selected-Python suites ran 63/63 and the cleared fake-unit Node groups
ran 133/133 with no warnings or timeouts — a
`GREEN_ISOLATED_NATIVE_LIBRARY_FAKE_UNITS_NOT_REAL_NATIVE_OR_STAGE`
boundary, not real Native, watchdog, full-glob, model or browser
execution. The later bounded watchdog pass repaired the residual
watchdog semantic groups (existing `operation` event kind, coherent
status/exit intent, hello-live heartbeat supervision, original-start
cleanup staging, separate driver settlement, genuine `AbortSignal`
checks and retained resource facts) and added the test-only
`watchdog-test-fixtures.mjs`/`watchdog-records.test.mjs` owners; all
commands remain Sol-owned. Real Native, watchdog and full-glob gates
remain UNRUN. As of the truthful-evidence decision-37 pass, the actual
watchdog diagnostic history is: five normally completed watchdog owners
earlier ran 43/48 with five failures, plus a separate external 35 s
watchdog timeout (7 pass / 2 fail / 1 framework-cancelled) and a 35 s
boundary-suite timeout — none of these is a completed required owner
or a pass; the repaired snapshot in this tree is authored and still
unrun pending Sol's gates. The receipt-sealing timing question is now
a USER-APPROVED normative choice — experiment/cleanup limits stay,
only final receipt bookkeeping may seal afterward — with exact
publication/lifetime binding and runtime implementation pending under
the separate approved packet; R4 stays OPEN.

Corrective 72 (declared before use; authored, not yet verified green):
the WHOLE 62-line `internalContext requires a genuine platform
AbortSignal` case moved from `watchdog.test.mjs` to
`watchdog-resource.test.mjs` with every assertion, comment and
identity preserved — the resource owner now holds its original two
resource guards plus this genuine-signal/`parentDriverScope`
configuration guard (three named cases); `watchdog.test.mjs` keeps
seven named cases and its KNOWN_OVERSIZE marker is retired. No new
module, export or runtime behavior.

Whole-harness receipt (2026-11-05): the owned serial command —
`node --test --test-concurrency=1` plus the 35 explicit `*.test.mjs`
suite paths — naturally exited 0 in 38.9228 s with 352/352 pass, 0
fail/cancel/skip, stderr 0 and no signals, exactly the two deliberate
observer-warning cases, all 14 created direct Native handles settled
real exit plus BOTH pipe closes, collectors 0/0/2, watchdog ran,
listener -> TERM -> reap order held, collector input EOF consumed, and combined
evidence 1,748,598 bytes under the 4 MiB bound. Receipt and SHAs are
recorded under Current verified status at the top of this document.
C4b capture/parity/preflight, C5 and the ONE approved comparison have
not run.

Private `watchdog-admission.mjs`, declared before creation, exports only
`admitWatchdogDriver({config,capabilities,state,timing,bounded,checkLive})`.
It owns the complete pre-driver parent/own-scan admission body over the SAME
existing `admissionTask`, recorder, owner and original work end. Normal calls
use genuine `admitPhase`; own subruns read their actual manifest inputs and
supply their own exact association to the fixed scan before driver issue.
DAG: watchdog-runtime -> watchdog-admission -> prerequisites/artifact-files;
there is no new queue, ledger, clock, proof setter or public capability.
TEST-only `watchdog-integrity-selftest.test.mjs` has no exports and tests own
subrun ordering, parent-observation rejection and the genuine control receipt.
Both paths are appended to the map; only the admission owner is runtime.

#### Check transition and normal-finish bindings

The rendered CardPanel title is `EFFICIENCY CARD` in browser text. Complete
Workbench frame checks retain panel, Roadmap, reset and geometry predicates.
Opening a Workbench uses a distinct `*-open` readiness operation; each explicit
reload/control initialization retains its own `*-init` operation. Invalid-position
checks use a syntactically valid FEN that disagrees with the replay, preserving
the exact `POSITION_INVALID` semantic assertion.

The existing `createBrowserContexts` export and three-method factory roster stay
unchanged. Each returned per-Page game arm and Workbench handle additionally
exposes private `expectWorkerRetirement() -> void`. It synchronously marks only
that Page's currently observed live public Worker handles before an intentional
retirement/recovery/reload/mode transition; later Workers remain unmarked.
Page/context/browser unexpected-close and cohort sticky-failure predicates stay
unchanged. This is lifecycle intent, never Native/proof/status authority.

Normal finish fences new ordinary admission immediately and starts the original
Native cleanup independently. Before Recorder.stopOrdinary, shutdown drains the
already-admitted ordinary tail under the SAME original cleanup bound. Fault/stop
still stops Recorder immediately; no new grace, queue, ACK, wire field or writer
is introduced. Held tail IO remains actual owned debt and cannot promote a late
result.

TEST-only `browser-transitions.test.mjs` and
`watchdog-finish-ordering.test.mjs`, declared before creation, have no exports.
The former uses actual browser context ownership with controlled public Worker
resources; the latter uses the genuine Recorder/operation queue and exact
AST-selected shutdown ordering. Both remain outside the runtime union.

The earlier diagnostic-only implementation retained the `pid list never stable`
cause prefix and three-read ordered-list agreement (history, before the
2026-11-06 membership correction below). The existing error
detail includes bounded JSON for each of the two actually observed adjacent
pairs: counts, `sameMembership`, `orderEqual`, and at most four added/removed
PID samples in observed order. These are derived only from already-read vectors;
there is no extra OS read, sort, retry, UID dump, wire key, budget or successful
row/output change. The whole stdlib fake-backend suites retain malformed-list,
full-buffer, errno and UID checks and distinguish ordering-only from membership
churn. A new diagnostic sample cannot recover a historical unrecorded cause.

PageArm constructors receive exactly `{kind,id,page,context,capabilities}` at
all operational call sites. Per-Page lifecycle controls stay on their browser
handles and are never spread into the closed PageArm options schema.

The existing driver channel treats disconnect after a successfully validated
and dispatched `closed` notice as expected transport closure, like its own
explicit close initiation. This notice never proves process exit, either pipe
close or raw send/body settlement. Missing/invalid notices and unexpected
errors still fault; real exit plus BOTH closes and actual scope joins remain
mandatory. No new ACK, wire field or cleanup allowance is introduced.
TEST-only `driver-ipc.test.mjs`, declared before creation, has no exports and
stays outside the runtime union. It uses a controlled real Node IPC child,
actual bridge/driver channel and the AST-selected operational transport/close
body to exercise normal and unexpected disconnect ordering without any
Native/browser/model/phase execution.

Collector accounting-fault diagnostics remain on the existing fault-detail
path. The actual monitor retains the validated collector reason and diagnostic
in its sticky informational fault. Watchdog's invalid-Native-observation error
includes that actual retained detail when available and keeps its original
ACCOUNTING_UNAVAILABLE code and generic fallback when unavailable. Both existing
Watchdog fault-description copies use the existing 4096 diagnostic bound so
the persisted Recorder fault event can retain both observed PID-pair
classifications. This adds no wire key, authority, retry, clock, budget or
historical-cause inference. Stop, horizon narrowing and cleanup ordering stay
unchanged; invalid accounting remains unproven regardless of empty arrays.

Early startup/transport fault events preserve the original primary error,
code and stop priority. Only AFTER recordFault and first-stop/horizon narrowing,
the existing event description appends actual retained `monitor.fault().detail`
when available, within the same 4096 bound. Missing, throwing or reentrant
informational access cannot postpone/replace the first stop; fallback keeps
the original event. No guard, API, wire field, retry or allowance changes.
A shared-protocol collector-fault/startup-register control reads the genuine
canonical Recorder event before the resource poll; it does not recover a
historical failure's unrecorded cause. The existing finish-ordering TEST owner
also covers this first-stop/error-description ordering boundary. Its supplied
clock follows Node's cross-kind timer clearing. Controls inspect sampler
closure before manual teardown and hold the first genuine cleanup-event
callback under the same lifetime. Native stop completes under the original
cleanup end while that callback remains owned; releasing it permits the raw
Recorder write and run join. Neither a held event nor a Native accounting
fault can promote the control's cleanup proof. These controlled observations
do not identify an incomplete real run's blocking location.


`watchdog-native-fault.test.mjs` is declared before creation as a TEST-only
whole-owner split with no exports. It owns the complete full-Watchdog,
shared-protocol, genuine-monitor fault controls moved from
`watchdog-finish-ordering.test.mjs`, retaining every existing assertion.
It adds a periodic sample whose actual observed requestId binds the collector
fault reply, then true fixture exit and both pipe closes. TEST imports point
only to existing runtime/TEST owners; neither runtime nor the original TEST
imports this new owner. The runtime union stays unchanged. The original
finish-ordering owner retains operation-tail and error-description ordering.


#### Independent shutdown await diagnostics

`watchdog-lifetime.mjs` adds the private descriptive helper
`observeAwaitStage(owner, scope, label, issue)`, alongside its two existing
exports. `createWatchdogLifetime` accepts the optional trusted low-level
`reportAwaitStage(line)` synchronous sink, captured at construction. The helper
reports entry and actual native-Promise fulfillment/rejection, returns the exact issued Promise or
value, and rethrows an exact synchronous cause. It owns no required IO,
settlement receipt, proof or phase state. Missing/throwing reporters and
reentrant reporting are ignored. Only fixed labels and `phase`/`selftest`
scopes are accepted. Each genuine owner permits at most 64 records, each at
most 256 UTF-8 bytes, hence at most 16 KiB; records contain sequence, local call ordinal, scope, fixed stage and state.
Rejected observations may also retain safe STRING code/message/detail and
one-level causeCode/causeMessage, within the SAME 256-byte record bound.
Original cause detail receives priority over verbose wrapper descriptions. There is no stack, raw object, identity or input ref.

Operational `run.mjs` supplies a best-effort standard-stderr sink only to
the archived supervisor owner. Marker delivery and backpressure are never
awaited or retained. The existing shutdown owner observes cleanup, actual
ordinary/admission/resource/driver/scope joins, Recorder finalize/containment
and its final lifetime joins. The existing cleanup controller accepts the
same optional diagnostic `lifetime` and observes its Native stages and event
callbacks. The outer supervisor lifetime join is observed independently.
First stop and the original cleanup-end capture/narrow precede all shutdown
reporter calls. No marker uses Recorder or Store, changes a result/fault,
queries Native, adds a timer/deadline, retries work or authorizes clearance.

The runtime dependency graph adds only imports of the existing lifetime
owner from cleanup and shutdown; operational assembly forwards its SAME
owner. No runtime path is added to the fixed input union.
`await-stage.test.mjs` is TEST-only with no exports, importing the existing
lifetime owner. Existing shared-Native controls use a genuinely supplied
Store lifetime through the optional `makeStore({chargedBytes, lifetime})`
TEST fixture passthrough and `createRunDrainBinding` same-owner diagnostic
forwarding, preserving both omitted defaults. Their held real
Recorder callback demonstrates marker independence and unchanged cleanup
ineligibility. TEST imports remain one-way into runtime/fixtures.


#### Earlier cross-time membership overconstraint (2026-11-06, superseded)

The earlier implementation required two consecutive fully validated PID sets
to have identical membership, within three reads. It selected the current
vector's unsorted order. This was an implementation-only overconstraint,
superseded by the complete-vector interpretation below. Full-buffer retries, malformed/range/duplicate/errno rejection,
current-UID checks, ESRCH handling and full-tuple/sample guards remain unchanged.
That implementation failed on cross-time membership churn and emitted two-pair
diagnostics; the correction below removes that invented comparison.
There is no added read, retry, clock, deadline, Native authority or cleared fault.

Apple's [proc_listpids implementation](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/proc_info.c#L337-L457)
traverses allproc then zombproc, filtering UID and appending traversal order.
Its [exit transition](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/kern_exit.c#L1932-L1949)
moves a process between those lists while holding the process-list lock. The
[libproc private-interface declaration](https://github.com/apple-oss-distributions/xnu/blob/main/libsyscall/wrappers/libproc/libproc.h#L38-L40)
promises no ordering. Thus equal complete membership can have different order.
These sources explain ordering behavior, without requiring cross-time
quiescence or establishing the actual transition in check8. They do not
promote check7/check8's retained failed/incomplete proof.

For readable capacity, the WHOLE `DiscoverStabilityTests` class moves from
`process-macos.test.py` to the existing TEST-only
`process_macos_path_test_cases.py`. Before that move/use, its roster becomes
TWO factories: existing `make_pid_path_cases(N, fake_be)` plus
`make_discover_stability_cases(N, fake_be, bsd_struct)`, each returning its
`unittest.TestCase` class. The main suite binds the returned class into globals
through its SAME frozen-sibling loader and already loaded N/fake backend/struct
builder. No new module, command, sys.path fallback, runtime input or helper
identity is added. Existing negative assertions remain; the historical
order-only negative becomes the qualified positive. Causal cases assert exact
two/three read limits, current-vector row order, genuine churn rejection,
duplicate rejection before set agreement, wrong UID and ESRCH skipping.


#### Native discovery uses one complete capture (2026-11-06)

`discover` now calls the EXISTING `list_process_pids(be)` exactly once, then
iterates its complete validated vector unchanged and unsorted. The helper's
same four capacity attempts remain: a full returned buffer retries with larger
capacity; exhausted full buffers, empty/errno/unaligned/out-of-range/duplicate
vectors still fail. Every BSD/UID/ESRCH/identity/sample/ownership guard remains.
No later membership vector, intersection, union, cached/partial snapshot,
clock, extra retry, deadline or fault suppression is introduced.

The locked Runtime discovery table and unstable-capture paragraph require
sufficient buffer capacity and reject truncated/unstable capture after retry. They do not require consecutive
snapshots to have equal membership. Apple's
[locked UID-filtered traversal](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/proc_info.c#L377-L448)
produces a complete nonfull vector at capture. The original sampling clause
also explicitly permits transients between observations. Accordingly the
implementation-only ordered and membership-equality loops and their two-pair
comparison diagnostics are removed. The `unstable-list` reason remains for
actual vector-acquisition failures, with their original details.

The existing TEST companion retains its two-factory loader/API. Its discovery
cases now prove one actual helper admission despite mocked later churn,
unchanged first-vector order, no later-vector reads, buffer retry INSIDE that
single admission, and duplicate/UID/ESRCH guards. Historical check7/check8/check9
failures and the unlocalized check7 hang remain retained; this correction does
not establish eligibility or actual host-kernel transition history.


#### Sticky Recorder failure containment and descriptive rejection fields

If genuine `finalizeAndRead` rejects, the existing shutdown helper now records
that original failure, then awaits the Recorder's EXISTING
`closeIncompleteEvidence` before returning the same null/fallback and before
its global lifetime join. This handles pre-A sticky rejection, which occurs
before the finalizer's own close-all body is admitted. The incomplete drain
still enforces its actual finalization/fence guards, joins admitted bodies and
closes real sinks. A later containment failure is recorded separately and
cannot replace the original cause or promote an outcome. Successful finalization,
Native teardown, the original cleanup end and every deadline stay unchanged.
Held or failed physical close remains real outstanding debt, never forced zero.

The passive await reporter's optional rejected `code`, `message` and `detail`
are read only when strings, without String/toString, stack or raw-object
rendering. Each candidate is sliced before bounded JSON encoding and shortened
inside the unchanged 256-byte record/64-record budget. The reentry guard is
armed BEFORE any cause accessor; throwing/hostile access and reporter failures
cannot replace the original Promise/result/cause or control state. No diagnostic
IO is awaited or retained. Genuine Store/FD controls prove containment starts
before global zero and holds on actual close; arbitrary primary/secondary
handler controls retain exact values. This independently reproduces a missing
containment path. Check10's unrecorded original Store/Recorder cause remains
unknown and its incomplete evidence is not promoted.


#### Bounded footprint failure diagnostics

The existing producer owner `workspace-footprint.mjs` adds the pure
`describeFootprintFailure(sample, root) -> string` export beside
`createFootprintObserver`. It reads at most eight string errors and safe
validity/interruption fields, with fallible access isolated from accounting.
Only bounded operations, genuine root-relative first components/tail basenames,
first/tail errno or unsafe-metadata tags and validity tags reach Error.detail; full paths, raw samples, arbitrary
String/toString and stacks are not rendered. The invalid producer DTO keeps
its existing first-eight errors and may add the fixed descriptive
`interruption` string when stop/generation invalidates its actual scan.
Successful DTOs and every accounting decision remain unchanged. The captured
trusted Store root permits only exact known operation/root prefixes; unexpected,
outside or unreadable paths retain the generic classification. Root-relative
roles and bounded leaf tails distinguish inputs/browser/driver-tmp without
rendering the absolute workspace prefix.

Store's existing invalid-sample branch marks accounting sticky BEFORE optional
diagnostic access, retains the identical STORE_ACCOUNTING/invalid-sample
primary, and attaches only the helper's bounded string detail. Existing passive
markers retain that detail within their unchanged64-record/256-byte bounds.
Malformed, throwing or reentrant diagnostic providers cannot replace the
primary or admit another Store write. That diagnostic-only change introduced no
ENOENT skip or retry. The confirmed-retirement correction below supersedes its
no-retry implementation. It retains the original allocation/link,
freshness/regression, generation, deadline, resource limit and Native behavior.
Controlled producer/Store tests live in the existing roomy footprint
TEST owner; no runtime path, public command or authority is added. Check11
identifies invalid-sample accounting only; its exact source remains unknown
until a fresh actual observation supplies the preserved diagnostics.


#### Failed sample-interval scalar diagnostics

The existing failed `sample interval` branch keeps its exact >500 ms or
sticky-fault predicate, ACCOUNTING_UNAVAILABLE code and message prefix. It
adds only owned scalar diagnostics: already-read Node `startedNs`, `finishedNs`,
`lastValidNs`, `gapMs` (finished minus last valid, or first-cycle duration),
`preCycleGapMs` (started minus last valid, null on first cycle),
`cycleDurationMs` (finished minus started), sum `nativeDurationMs` from each
reply's OWN Python start/end pair, actual `coverageRounds` and `stickyPresent`.
No new clock read, queue timestamp, Native query, Promise, deadline or proof is
created. The existing first-fault monitor and 4096-byte descriptive event
funnel retain the bounded scalar text. Positive observation DTOs are unchanged.
Pre-cycle time combines timer scheduling, queue waiting and event-loop effects;
Node cycle duration is not itself libproc duration. No cause is inferred from
these values or from check12's retained resource projection timestamps.

For capacity, TEST-only `process-observation.test.mjs` is declared before
creation, with no exports. The WHOLE final first-sticky/physically-settled
collector case moves there from `process-lifecycle.test.mjs` without assertion
loss. New controlled-time cases use the actual observation and ownership
factories with genuine budget handles. This is a one-way TEST-to-existing
runtime/fixture DAG, excluded from the unchanged runtime input union. There
is no performance, scheduling, worker, threshold or accounting repair here.


#### First sticky cause retained through the passive diagnostic lane

The same private Recorder state now retains a presence bit and the exact raw
FIRST noncorrectable sticky cause, including null/undefined/false/frozen Errors.
Correctable rejections do not claim that slot; later failures cannot replace
it. Existing sticky semantic values and the original operation's exact
rejection are unchanged. The private lifecycle state reader forwards that
association only to construct the same RECORDER_STICKY code/message wrapper
with the standard one-level Error.cause. No Recorder getter, method, field,
record schema, status, proof or budget is exposed or changed.

The existing guarded passive formatter reads only safe strings at the top
and ONE optional cause level. It never reads cause.cause. Marker allocation
prioritizes bounded top code/causeCode and the original cause detail before
verbose wrapper message/causeMessage, preserving operation/errno/relative
role and basename within the FINAL full UTF-8 256-byte frame. Optional
causeCode/causeMessage remain descriptive fields only. The same 64-record/
16-KiB bound, pre-access reentry guard, no arbitrary String/toString/raw-object
rendering, no stack and no required diagnostic IO remain. Hostile, missing or
throwing optional access/reporters cannot replace the original Promise/cause.

Whole pure transport-description and finalize-handler controls move from the
full finish-ordering TEST owner to the existing roomy await-stage TEST owner,
with all original assertions retained. The genuine Store/Footprint/Recorder/
running-Watchdog control now includes a long-root/cache/long-basename failure:
containment can fulfill while the rejected sticky wrapper's final marker still
exposes the FIRST original filesystem cause. Genuine Recorder falsey/correctable
and no-overwrite controls cover the private association. No new path, runtime
union entry or public command is added. Check13's exact original filesystem
cause is still unknown; this repairs loss of subsequent diagnostic evidence.


#### Confirmed retired-child rescan and independent ordinary fault description

The footprint observer may restart the WHOLE root walk once inside the SAME
scan when a descendant lstat returns ENOENT and a second real lstat confirms
absence while every captured ancestor remains the same safe non-symlink
directory (device/inode/mode/birth identity), including the root, before and
after confirmation and across the complete restart. Root/parent loss, replacement, unsafe metadata, symlinks,
reappearance, other errno, repeated churn, stop or generation change stay
unavailable. A restart discards the first partial charge, keeps the ORIGINAL
scan-start timestamp and borrowed operation/owner, and charges every current
entry afresh. Failed confirmation/restart preserves the original ENOENT first.
The first attempt is never published as invalid then repaired. No earlier
published sample or Store sticky failure is repaired by this restart.

The existing private lifetime owner adds
`reportStoppedFault(owner, scope, error) -> undefined`, a synchronous data-only
report through the SAME reporter/64-record/256-byte full UTF8 frame budget.
Config supplies internal `ctx.reportOrdinaryFault(error)` to Ordinary; only
AFTER its original recordFault then requestStop return does Ordinary describe
the exact error. No public API, promise, IO debt, clock, query or control fact
is added. The guarded formatter may use safe one-level `error.fault.detail`
as informational Native context. For an existing sample-interval detail it
compacts only supplied finite scalar facts (the initial preCycleGapMs may be
null) as g=gapMs, p=preCycleGapMs,
c=cycleDurationMs, n=nativeDurationMs, r=coverageRounds. These are differences
already measured, not new timing or queue attribution. Missing/hostile
fields/reporters cannot replace the original failure or first-stop.
Parity1's exact original primary and full retired-log path remain UNKNOWN;
this separately proven filesystem race does not identify that historical log.


#### Root executable mismatch diagnostic tails

The existing process-proof root-executable mismatch still rejects the exact
same inspected image, with the same ACCOUNTING_UNAVAILABLE code/full message
and proof ordering. That SAME Error now carries a descriptive `detail` string:
`expected=<last36 validated path characters> actual=<last36 validated path characters>`.
Both bounded distinctive suffixes survive the existing full256-byte passive
ordinary-fault marker even when the original paths share a long prefix. No
path is learned/accepted, no registration or launcher/payload identity changes,
and no Native query, retry, readiness or deadline is added. Reference launch
still uses the selected invocationPath; registration still expects the pinned
monitoring.python.processImage.realPath. Parity2's actual mismatching observed
suffix was not retained historically and remains unknown until fresh evidence.


#### Private reference interpreter-entry data barrier

Before creation/use, `reference-child.test.mjs` is declared as one cohesive
TEST-only whole owner (no exports), importing the actual reference child,
Native-faked genuine monitor/proofs and existing fixture/lifetime owners.
It is not in the runtime union. Existing paths/APIs remain unchanged.

After isolated Python interpreter entry and the existing manifest/path and
ML-absent checks, parity-reference writes exactly one <=4096-byte newline JSON
DATA frame on existing duplex fd3: exact fields type=reference-entry, runId,
pid, manifestSha256. This is not readiness, identity or Native proof. The
parent consumes it exactly once, under the SAME original reference command,
then performs the unchanged kind=python strict pinned processImage proof and
real registration ACK. Only then may it send the existing reference-go gate.
The stdout reference JSON and raw stdout/stderr artifacts remain separate and
unchanged. Entry EOF, malformed/duplicate/extra/missing data, STOP/fault or a
late entry cannot authorize GO or renew an end. Every issued child remains
strongly owned from spawn until actual exit and stdout/stderr/fd3 close.
The separate diagnostic reproduced a launcher-to-payload transition before
ENTRY receipt; its later public probe proved same-live, not a fresh image.
That mechanism does not recover Parity3's exact historical registration time.

The existing phase-runners stdlib-only AST bridge also executes the actual
announce_entry body over a real duplex socket, including partial writes,
wrong-FD/oversize pre-write rejection and ML-absent checks. The new entry
TEST owner covers fragmented/extraneous frames and actual Native-faked strict
registration/ACK ordering. Its command-expiry control retains the same initial
end and holds true child debt through the last real gate-close event.


#### Cooperative environment file scheduling

The existing environment-files parallel owner preserves sixteen workers,
ordered results, complete validation and first arbitrary failure. Each worker
performs at most sixteen items before a cooperative event-loop turn through
the existing private call(tag, thunk). That turn borrows the SAME original
budget and actual-body receipt. Expiry/failure is rechecked before reserving
another row; all issued IO and turn bodies join before return. It creates no
clock, extended deadline, extra IO concurrency, cache or Native policy.

Before creation, `environment-files-test-fixtures.mjs` is declared as a
TEST-only cohesive move of the WHOLE existing fixture, sole export
`makeEnvironmentFilesFixture(t, {python=false, changeText=null, payloadCount=45,
onResolve=null}={})`. Returned fields remain files/root/data/payloads/streams/
entered/release/own/clock/budget/lifetime/originalEnd/peak/live. The optional
TEST-only row count and lowlevel resolve observer support count-gated genuine
RECORD fairness/expiry controls. DAG: environment-files.test -> this TEST leaf
-> existing environment-files/budget/lifetime/fake-clock owners; no runtime
union entry or operational hook. All existing assertions/fixture teardown stay.


#### Normal finish waits for the existing supervisor STOP

The private driver session now keeps IPC open after its real FINISH send
callback until the supervisor's existing validated STOP with reason FINISH.
The private queued-finish sequence and validated-stop latch distinguish that
reply from early, fault or malformed STOP. This is lifecycle ordering, never
phase success or cleanup proof. Only then does the operational driver send
CLOSED, join actual callbacks/bodies and disconnect. The wire/version, session
methods/capability keys, parent guards and original cleanup end are unchanged.

A normal STOP received while the FINISH callback is held does not settle that
callback or close debt; its later raw error still rejects with the original
value. Missing/invalid/fault STOP or disconnect cannot complete normal finish.
The parent still begins Native cleanup before STOP-send and all body/scope
joins. Raw STOP errors (including EPIPE before valid closure) and late callback
errors remain faults. No error is suppressed, no new ACK/timer/grace is added, and no
physical pipe/child fact is fabricated. Real Node IPC controls cover a delayed
parent raw write and unexpected peer disconnect, preserving exit/BOTH-pipe/
scope/owner joins. Scripted normal-parent fixtures now deliver literal FINISH
STOP at the actual finish submission, retaining their original assertions.
The failed committed check remains ineligible; this source repair does not
promote its receipt or claim a fresh actual phase passage.
