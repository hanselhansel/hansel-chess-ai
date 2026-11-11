# Tinyaz V3 preflight: approved software design

Status: APPROVED design; implementation REVIEWED and required tests VALIDATED (2026-11-11). Source is READY for Root green commit/publication action. Gate10 full96 passed1140/1140, handoff6/6 and required Python/app/typecheck passed; fresh scoped Sol Max re-review passed and all four production findings are addressed. Runtime135/TEST96 and changed inputs78 remain exact. Scientific execution is separately gated and ALL V3 scientific phases remain UNRUN at this checkpoint, with no phase GO/Elo/cure claim. This status records no commit/publication. Original approved functional sections1..14 remain byte-identical. E20 is W/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014; final evidence is E20/task20-final-commit-docs-ready-report.md and Root gate10 audits. Every prior result remains immutable history.

This amendment proposes one v3 policy. A future preflight may finish every scientific and safety check after a periodic monitoring timing-quality loss. It must report that resource failure. Only a genuine complete, sealed and independently verified preflight graph can admit a future comparison. There is no bypass flag, threshold increase, failed-run repair or automatic retry.

`R` is `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai`. `W` is `R/.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison`. `E18` is `W/separate-verdicts-implementation-evidence/ab96ba53-8491-41a6-932e-a42111ebaa00`. `E19` is `W/separate-verdicts-implementation-evidence/5e912df4-8fd0-4b5e-ac68-9e9c625a23a0`, the original approved proposal and review directory (not this canonical document's directory). Paths below are repository-relative unless prefixed `W/`.

## 1. Evidence and scope

- The evaluated executable source is `d98db3f6185ac02400ca3275f58f8f272c5ca24c`. Root reports documentation-only published tip `67b85fe0fee54519bb0b0eae09c6083cd37df07d`, with runtime/source/TEST unchanged. This proposal did not run Git, imports, tests, a model or a phase.
- E18's four Root audits establish closed strict CHECK, approved rebound control and strict parity13/13. Strict preflight then failed at a completed Native-observation gap of596.034ms against500ms. Seven fresh requests completed. The fourth baseline request, eighth of ten, did not have a persisted move completion. Main A/A, throughput and final integrity were unreached.
- E18 lacks main `final.json`/`completion.json`; full graph verification failed and persisted Native cleanup remains UNPROVEN. Its exact input/model pins and operator closure do not substitute for those missing proofs. E18 remains failed, immutable and unusable as any v3 parent.
- `E19/design-direction.json` selects design only. The current result report is `docs/experiments/2026-11-11-tinyaz-serial-verification-prerequisites.md`; the earlier E18 diagnosis/review and audits remain the historical evidence. No causal diagnosis, timing cure, speedup or strength result follows.

Fixed inputs and science remain: M9706840 bytes, SHA256 `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`; baseline `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`;64 completed visits;20 locked opening pairs/40 games; original rules, schedules, identity checks, raw accounting, paired sign/CP95 analysis and classification thresholds. No training, weight replacement, dependency or package-script change is included.

## 2. Exact version selection and compatibility

Add `train/fixtures/browser-protocol-v3.json`. Its `schemaVersion` remains2 because its serialized layout is unchanged. Its policy is the exact closed literal:

```json
{
  "policyId": "tinyaz-separate-verdicts-v3",
  "recordSchemaVersion": 2,
  "softPhases": ["preflight", "compare"]
}
```

Export this as `V3_POLICY` from `evaluation-policy.mjs`. Everything else in the new protocol is byte-equivalent JSON data to v2's conventions, limits, required checks, five requests per arm, A/A control FEN and20/40 schedule. The v1 and v2 fixture files remain byte-for-byte unchanged. `V2_POLICY` stays exactly `{policyId:"tinyaz-separate-verdicts-v2",recordSchemaVersion:2,softPhase:"compare"}`.

Dispatch is the closed cross-product below. Unknown, mixed, absent-required, extra-field or reordered-literal combinations reject before IO, Native startup or driver execution.

| Record layout | Selected protocol path | Exact identity/manifest policy | Meaning |
| --- | --- | --- | --- |
|1|`train/fixtures/browser-protocol.json`|Absent/null at the existing v1 boundary|Existing strict v1.|
|2|`train/fixtures/browser-protocol-v2.json`|Exact `V2_POLICY`|Existing v2. Only compare periodic timing is soft. CHECK/parity/preflight stay strict.|
|2|`train/fixtures/browser-protocol-v3.json`|Exact `V3_POLICY`|This prospective policy. Only private eligible preflight/compare periodic timing is soft.|

Record schema2 gains a **policy-discriminated closed variant**, not an inferred meaning for every schema2 record. Final/completion under V3 require `scientificReadinessVerdict`; V2 rejects that field. Workspace/CommonIdentity, manifest, selected fixture ref/hash, driver hello/start and resource evidence policy ID must agree. Running/event layout remains2; events without a policy field inherit the graph's hash-bound identity. Every final-resource snapshot must have that graph's exact policy ID/run/phase/monitor association. A schema2 event alone never selects policy or proves readiness.

Use `assertPolicyBinding` at each existing boundary and add pure `protocolPathForPolicy(evaluationPolicy)` and `isPeriodicQualityPhase(evaluationPolicy,phase)` helpers. The first returns only one of the three exact paths after validating the complete policy. The second returns true only for V2/compare or V3/preflight/compare. No loose `policyId` prefix, schema2 catch-all, inventory-presence inference or fallback to v2 is permitted. Keep schema primitives, fixed science/limit declarations and v1 fields unchanged.

This is the smallest sound version change: a new protocol/policy identity and a closed schema2 variant. A third record layout, Native wire change or driver IPC version change is unnecessary. Fresh identity and frozen source graphs prevent old receipts from acquiring new semantics.

## 3. Runtime timing boundary

The only soft causes are the existing bounded ledger causes, with the original500ms comparisons and nanosecond arithmetic:

- `PERIODIC_COMPLETION_GAP`.
- `PERIODIC_NATIVE_DURATION`.
- `PERIODIC_OBSERVER_AGE`.

A soft return requires the actual private periodic purpose, exact selected policy/phase, a previously admitted strict bootstrap, a live original operation handle, a structurally valid full-union response and no sticky hard fault. Observer-age loss while a request is in flight is provisional resource failure only. That request and its actual debt must subsequently settle within its original bounds. An unresolved, timed-out, malformed or after-fence observation never becomes scientific evidence.

Bootstrap, explicit `sample()`, proof/control/selftest/cleanup-purpose calls, Native identity/backend/probe/lsof operations and strict preflight selftest prefix remain strict. No public caller can select a periodic purpose. Do not change250ms sampling,500ms maximum timing-quality gap,1000ms footprint age, request IDs, allocator, queue, clock domains, original handles, stop fences, terminal identity store, collector ownership or actual settlement rules.

For V3 preflight only, add the private `process-preflight-quality.mjs` scope described in section8. It starts strict. Only the existing fixed-first selftest handshake, after genuine `verifyInternalSelfTest` graph verification and its live parent probe, can open the scientific periodic scope. Recheck existing admission/abort/original command end after that await. No BEGIN ACK or scientific scope opens from a merely present receipt or a producer flag. All periodic cycles before that transition, including the nested selftest interval, remain strict. Comparison retains its existing private-periodic behavior under its exact policy.

The scope lasts through the ordinary browser/server SDK close and the subsequent final-integrity operation while the same Native monitor is active. Ordinary `game.close`, `closeSdkResources`, integrity completion, file/sink close or an individual operation END does not revoke it. Only the genuine top-level terminal transition (first accepted watchdog finish, first stop or entry to Native monitor shutdown/stop-and-reap, whichever occurs first) irreversibly closes the scope, before the corresponding Native stopping fence, without granting more time. Purpose and scope must be valid at dispatch and at the original pre-commit fence. Every explicit cleanup/proof call remains strict independently of this scope.

A held response crossing that Native fence cannot mint a fresh sample, timely clock, terminal-identity admission or positive cleanup/readiness proof. Preserve the existing `fenced-observation` diagnostic path and its actual physical debt. **`lateDrops.count>0` alone is not a new readiness or strength blocker.** A decoded, full-union negative fenced observation whose original handle is still live can settle as a diagnostic if all actual debt subsequently closes and independent strict current/cleanup/monitor-stop proofs are valid. It never supplies those proofs. An expired handle, transport/decode failure, positive measured cap, missing settlement or invalid independent proof remains hard through the existing fault/cap/proof fields. This keeps the distinction in current `process-observation.mjs` and `record-finalization-v2.mjs:93-98`; it does not turn after-fence data into evidence.

`watchdog-verdict-policy` may tolerate invalid current accounting only when its complete validated projection proves the exact allowed policy/phase, an already admitted cycle, periodic quality loss and no hard reason. It still returns actual observation timestamps and measured peaks. RSS positive facts are checked before any softness branch. Footprint accounting stays independent and hard.

Top-level V3 preflight cleanup may distinguish historical coverage continuity from **current timely Native cleanup proof**, as V2 compare already does. This does not relax a cleanup probe: current `accountingValid`, strict current/fresh Native observations, exact identity probes, scoped lsof/listener checks, workload handles, collector-last physical closure and the original proof end remain mandatory. `selftest-workload` always requires its strict continuous prefix. A gap never clears, resets the coverage-qualified clock or changes a false current proof into true.

## 4. Hard failures and fixed limits

The following remain hard during preflight and compare, including after an earlier soft episode:

- Native backend/permission/process/transport failure, missing or malformed response, wrong/negative/reversed timestamp, unsafe RSS arithmetic, terminal identity reappearance, identity mismatch, unclosed full owned union, coverage-round exhaustion, expired original operation or late Native proof.
- Measured RSS above4294967296 bytes, including a decoded positive overage on an otherwise late/slow response. Missing coverage never proves compliance. Every complete observed aggregate contributes to the observed peak; admitted/timely peaks keep their existing separate meaning.
- Workspace above268435456 bytes, ordinary/final reservation violations, unaccounted file/FD/store work, invalid or older-than1000ms scan-start footprint proof, missing/late integrity scan, disk or graph failure.
- Readiness above30000ms, command above90000ms, phase end600000ms for CHECK/parity/preflight or86400000ms for compare, heartbeat/control failure, any first-stop or abandoned run. All original inherited min-only bounds apply.
- Missing child exit, either pipe close, Native/monitor task, raw sink/FD close, timer/lifetime join, journal closure, exact finalizer proof, listener proof or canonical completion graph. Unknown remains unproven.
- Any failed or missing scientific/required check, model or source pin, worker identity/context/visits, selftest receipt/outcome/prefix, PGN/rules/checkpoint, raw accounting or paired-math proof.

Cleanup remains5000ms with the current P/C proof reserve and TERM/KILL placement, narrowed by inherited bounds. No new cleanup window, clock refresh, synthetic completion, caught-error-as-closure, shortened cohort, waived check or extra comparison is authorized. A missing graph cannot qualify even if a post-close `ps` routing check finds nothing.

The approval tradeoff is explicit: scientific admission would no longer depend on perfect periodic resource coverage. Across a coverage gap, continuous/full-run resource compliance cannot be claimed. An unseen transient RSS breach may have occurred even when every observed aggregate is below4GiB. Every measured breach remains hard, and all current Native/end/physical proofs remain mandatory. A ready verdict therefore certifies the complete scientific and specified safety evidence, while the failed resource and closure grades preserve the missing resource guarantee. This is a prospective requirements change, not proof that monitoring timing was cured.

## 5. Persisted scientific readiness and resource grades

Only V3 final/completion records add this closed field:

```text
scientificReadinessVerdict = {
  status: "ready" | "unready" | "not-applicable",
  reasons: sorted unique enum strings
}
```

For non-preflight phases use exactly `not-applicable/["NOT_PREFLIGHT"]`. For preflight, ready means the reason set derived below is empty; otherwise the status is unready. A proven failed check still retains the existing hard/proven-violation aggregate classification. The new field is necessary for parent admission, never sufficient by itself.

Use the closed `V3ClosedFacts` shape defined in section8. Let `e=f.resourceEvidence`; `badCheck(id)` means the exact required check is absent or its resolved status is not passed; `badScience` means any of `cold-readiness`, `ten-fresh-requests`, `aa-color-pair`, `timing-estimate` has `badCheck(id)`, or its independently recomputed evidence check is not passed. The malformed/missing required field of a closed facts object is a schema rejection, not a guessed boolean. A missing semantic proof represented by a validated false/failed field maps deterministically as follows:

| Add reason | Exact predicate for preflight |
| --- | --- |
|`SCIENTIFIC_CHECK_UNPROVEN`|`badScience`.|
|`IDENTITY_UNPROVEN`|`!f.identityProven`. For preflight this fact requires committed candidate plus exact source/model/environment/protocol identity and successful final integrity, not only a syntactically valid CommonIdentity.|
|`SELFTEST_UNPROVEN`|`!f.selftestProven || badCheck("watchdog-selftest")`. This fact covers exact genuine nested owner/outcome/strict prefix and its parent extension.|
|`NATIVE_UNPROVEN`|`!f.nativeProven` or any hard reason in `NATIVE TIMESTAMP UNION AGGREGATE TRANSPORT BACKEND PERMISSION TIMEOUT IDENTITY PROOF CLEANUP`.|
|`MONITORING_UNPROVEN`|`!f.monitoringComplete || e.closureKind!=="monitor-stop" || e.monitorRunId!==f.runId || e.coverageEndNs===null || e.pending || e.completedCycles===0`. A late-drop counter is deliberately not this predicate.|
|`CLEANUP_UNPROVEN`|`!f.cleanupProven || badCheck("cleanup")`.|
|`RECORDS_UNPROVEN`|`!f.recordsProven || e.hardReasons.includes("GRAPH")`.|
|`STORE_UNPROVEN`|`!f.storeProven` or hard reason `STORE`/`DISK`.|
|`PREREQUISITE_UNPROVEN`|`!f.prerequisitesProven`, which is derived from the exact required verified-parent admissions, not the parent resource status alone.|
|`HARD_STOP`|`f.hardFaultCount>0 || f.stoppedEarly || f.provenViolation || f.abandoned || f.workspaceLimitExceeded || e.rssLimitExceeded || e.hardReasons.length>0`.|

Evaluate every predicate, union the matching literal strings, deduplicate and sort by the existing ASCII string ordering. Do not stop at the first reason. Overlap is intentional: an expired Native operation can add NATIVE_UNPROVEN, MONITORING_UNPROVEN and HARD_STOP when all corresponding predicates hold. Coverage loss or a settled negative fenced diagnostic alone adds none of these readiness reasons. Missing physical proof, an actual timeout or a measured cap still adds its matching reasons. Readback must derive the exact same full set, not merely accept one plausible enum.

`preflight-readiness-v3.mjs` derives readiness from supervisor-owned verified facts, not from the driver's requested pass, summary counters, a caller boolean or the persisted readiness value. At minimum all of these must be true:

1. Exact committed V3 identity, full model/source/environment/selected-protocol pins and valid final integrity. CHECK and parity parents are genuine same-workspace V3 graphs, strict passed/0 with both resource grades passed and finalizers freshly proven gone at admission.
2. Every original required preflight check passes, with its exact retained evidence. Both arms have five separate fresh64-visit requests, complete delivery/readiness/worker/request/result observations and matching completed operation records. Both actual baseline A/A color games finish as draws with validated selected PGNs and checkpoint events. Cold readiness and throughput/timing-estimate evidence are complete and arithmetically consistent.
3. The fixed-first internal selftest has the exact nested owner/run/path, expected inconclusive/2 heartbeat outcome, zero scored games, no unexpected faults, all required checks, strict resource prefix and genuine child-scope cleanup. Its cached strict prefix reconciles monotonically with the parent's eventual closure.
4. Actual main SDK/workload closure, source/integrity verification, unchanged identity, exact recorded cleanup, native proof and all graph/artifact/store checks succeed. No hard reasons, unexpected faults, stop, abandonment, cap breach, missing/expired result or monitor pending body exists. The narrow settled negative fenced diagnostic in section3 contributes no proof and is not an extra blocker. `coverageEndNs` is a real monitor-stop fence, never a prefix substituted for main closure.
5. Any remaining resource nonpass is **only** fully recorded allowed periodic quality loss. `coverageLost` stays sticky. Counters, cause counts, episode boundaries, lost-detail counts, timestamps, observed/admitted peaks and final/checkpoint reconciliation remain truthful. An age episode cannot hide an unfinished operation at closure.

`preflight-evidence-v3.mjs` reads only graph-inventoried, hash/length-bound bytes through the existing confined IO and same registrar. For indices0..4 and both roles it requires `preflight/observations/preflight-sample-<i>-<role>-ready.json` and `...-move-1.json`, with one matching successful `<id>-readiness` and `<id>-move-1` operation result referencing each exact path. Reuse the current `validateArmReady`/`validateArmTurn` contracts on the fixed start-position request (`requestId:1`, `gameGeneration:1`,64 visits), legal-move validation and the existing baseline optional-promotion representation. Source-bound fresh contexts, distinct candidate sessions, complete ordered operations and unique evidence paths establish the five fresh attempts; identical deterministic baseline bytes are not rejected merely for matching hashes.

Recompute five deterministic signatures per arm after removing only the measured `ms` field. Validate `preflight/throughput.json` shape, finite nonnegative five latencies per arm, sample counts, sorted median/p95/maximum arithmetic, deterministic flags, both cold readiness values, command-pair median sum, unknown game-length label, original86400000ms comparison ceiling and `capStopPossible:true`. Timings remain descriptive and cannot authorize a longer command or comparison. Reconcile throughput with the actual ten completions and two A/A games. Actual watchdog bounds remain authoritative for operation ceilings; do not invent operation start timestamps absent from the old event layout.

The **async collector** replays both selected A/A PGNs; the pure validator does not call the asynchronous PGN helper. For each fixed A/A schedule game, collect the actual confined PGN bytes, require their length/hash to equal the inventoried selected ref, and await the genuine `replayCheckpointPgn({phase:"preflight",game,bytes,budget})`. Its return is `Promise<{movesUci,fen,result}>`; preserve its guards before replay, per move, after each16-move yield and at completion. Enroll that actual replay promise through the same `issueActual(io.retainActual,...)` before invocation, then recheck the same budget after the await. A rejected or expired replay never becomes a detached success or a cleanup receipt. No no-op guard or unbounded fallback is permitted.

The collector supplies the exact detached replay-result shape in section8 to the pure validator. The validator requires `aa-g1`/`aa-g2`, both colors, `aa-control`, original control FEN, terminal draw, matching frozen supervisor-selected checkpoint metadata, persisted response events, exact selected PGN refs/byte commitments and no first stop. It compares replayed FEN/result/move data with those bound records; it performs no asynchronous work, IO, clock or budget calls. Final compilation and every independent prepared/ordinary graph verification must await a fresh collector invocation from actual bytes. Driver claims or a previously serialized replay result cannot substitute. Added verification cost may still cause a real hard failure under the original bound.

V3 resource status uses `failed` for a measured cap, `COVERAGE_GAP` or inherited verified resource failure; unproven safety/resource facts remain `inconclusive`. Preserve all V2 status behavior in its own branch. Add V3-only reason `PREREQUISITE_RESOURCE_FAILURE` for a proven nonpassing parent grade. Carry the actual parent reasons, run IDs and resource event refs into closure; never manufacture a passed parent verdict. Existing `PREREQUISITE_RESOURCE_UNPROVEN` remains appropriate when its proof is absent.

| Future complete V3 outcome | Scientific readiness | Strength | Local resource | Closure resource | Aggregate/exit |
| --- | --- | --- | --- | --- | --- |
|Preflight, every proof and continuous coverage passes|ready|not-applicable|passed|passed|passed/0|
|Preflight, every science/safety proof passes, only allowed completed periodic timing loss|ready|not-applicable|failed|failed|inconclusive/2|
|Preflight missing eighth request, either A/A game, throughput, cleanup or full graph|unready or no authoritative verdict|not-applicable|nonpass or unavailable|nonpass or unavailable|nonzero, cannot parent|
|Full40, all science/safety proofs, local coverage good, admitted timing-failed preflight|not-applicable|eligible|passed|failed|inconclusive/2|
|Full40, same proofs with own allowed periodic timing loss|not-applicable|eligible|failed|failed|inconclusive/2|
|Any actual hard fault, cap, late/unsettled proof or missing cohort|not-applicable|ineligible|actual nonpass|actual nonpass|failed/1 or inconclusive/2 by existing violation rules|

Resource-only loss cannot produce aggregate passed/0. An eligible comparison with resource failure is a qualified locked-suite result, never evidence of500ms coverage compliance or an Elo claim.

## 6. Full graph and comparison-parent admission

The same policy-specific classifier must govern every parent consumer. It consumes only evidence freshly produced by `verifyReceiptGraph`, never a JSON readback label trusted as its own proof.

- CHECK/parity parents remain strict successful graphs. Preflight itself cannot import a nonpassing CHECK/parity parent.
- For compare, V1/V2 keep the present passed/0/both-resource-passed requirement. There is no V2 fallback exception.
- V3 compare may admit a preflight that is either strict passed/0, or inconclusive/2 with recomputed `scientificReadinessVerdict.ready`, failed resource grades containing only the allowed own `COVERAGE_GAP`, all unchanged scientific/safety proofs, exact policy/identity/ref binding and real full monitor-stop closure. Because its own CHECK/parity parents are strict, preflight cannot use inherited parent failure as this exception.
- `admitPhase` still independently walks all three required compare parents, checks exact common identity and conflicting ancestors, and freshly probes every expected parent finalizer as gone. Readback verification performs no substitute Native probe; runtime admission retains the actual probe.
- `record-finalization-v3` uses actual verified parent graphs to establish **scientific prerequisite admissibility** separately from their resource grades. Its `scienceReady`, paired-analysis admission and strength reducer use that scientific result. Its closure reducer uses actual resource verdicts, including preflight failure. A changed reducer predicate alone is insufficient.
- Prepared-completion verification independently reconstructs final/checks/readiness/resource/strength outcomes from the actual final resource event, observations/throughput/PGNs, cleanup, identity observation, parents and nested prefix. It checks exact final/completion equality before existing one-use prepared publication. Ordinary readback repeats the same genuine graph logic.
- If event/record/artifact/parent verification, monotonic prefix reconciliation, exact inventory, actual task or store closure fails, no usable completion is published or admitted. A readiness label in a lone `final.json` is not an authoritative successful preflight.

V3 comparison strength eligibility requires the unchanged full40/20-pair science, exact identities/checkpoints/raw accounting, legal results, verified paired analysis and genuine physical closure, plus every strict/safety condition above. The three allowed timing causes alone do not remove eligibility. RSS/workspace breaches, hard reasons, stops, expired/unsettled observations or absent Native/store/cleanup/full-graph evidence always remove eligibility. A settled negative fenced diagnostic follows section3 and never supplies missing proof. Do not alter `stats.mjs` or fabricate a passed-resource parent for the existing reducer.

### Mandatory verification budget propagation

`VerificationContextV3` is the closed private `{budget}` carrying the genuine existing `createBudgetHandle` handle for the caller's fixed absolute end (producer B uses the approved Task22 receipt-only end below). It is mandatory for V3 before graph/replay work; legacy V1/V2 APIs retain their current optional/untimed behavior. A supplied V3 context cannot be missing, noop, unbounded, replaced after an await or refreshed per ancestor/game. The same original graph IO retainer and any existing `assertEffectLive` guard are forwarded unchanged. The collector checks budget before/after each awaited read/replay and the replay helper checks it at every existing internal boundary. No new experimental or cleanup window is created.

| Caller path | Required context and awaited propagation |
| --- | --- |
|Producer finalization|`closeEvidenceBeforeCutoff` keeps original C for A only. After actual A closure, `sealClosedEvidence()` captures one B_start/B_end and genuine frozen `{budget}` context under the approved Task22 amendment below, nested-clamped to the original parent end. Before calling pure compileFinalV3, await collector with `{io,budget}` using that handle and the recorder/store's same actual owner. V3 cannot use the untimed legacy finalize path to omit this context.|
|Prepared verification and post-publication readback|Pass that exact context to `verifyPreparedReceiptGraph(options,verificationContext)`. Guard before/after its branded prepared read and await the matching compiler's fresh collector inside the full graph. The existing private VERIFIED association and consumePreparedVerification result carry the exact additional private field `verificationContext` for V3 only. Store publication forwards it to the mandatory fresh canonical verifyReceiptGraph call after publication, preserving every existing proof/read/replay guard under fixed B, gating whole Store transaction admission immediately before enqueue and checking association context inside Store immediately before immutable seal. Already-admitted context-free preparation/accounting settlement may finish after B. No fallible finalizer guard follows the immutable result. It is never serialized, caller-replaced or widened; V1/V2 associations retain their old shape. Preserve opaque token identity, one-use consumption, actual prepared IO and containment/first-error rules; expiry cannot return a verified published result.|
|Runtime parent/selftest admission|Thread the current original setup/work/admission/operation context through `verifyReceipt(options,io,verificationContext)`, `admitPhase(options,io,verificationContext)`, `verifyInternalSelfTest(options,io,verificationContext)` and recursive `verifyReceiptGraph(options,memo,io,verificationContext)`. `executeSupervisor`'s initial parent reads use their already captured setup budget; watchdog admission uses its original work/operation end; selftest and cleanup re-verification use the original arm/cleanup end. If an existing caller has only that captured absolute end, create a min-only handle for that same end, never now+another duration. Await every graph/collector/replay before parent admission and the unchanged real finalizer probe.|
|Ordinary readback and pre-spawn prior recheck|Use the named `V3ReadOnlyGraphContext` in section9, with one captured90000ms read-only command end for the entire command/recheck. It bounds metadata/graph/replay work and owns its actual read handles/tasks. It is a separate read-only command context after or before the experimental process; it cannot extend, reset, rescue or alter any experiment, operation or cleanup clock or grade.|

Recursive parents, nested selftest, resource-verdict verification and `readVerdictEventsV2` inherit the same V3 context. `collectPreflightEvidenceV3` is awaited at the producer and each prepared/ordinary reconstruction. An expired public wait does not prove the replay/read task settled: keep its actual retained promise and real FD-close debt, preserve the first error, and join actual bodies before disposing their context. A late success cannot regain eligibility. V3 ordinary callers without a bounded context reject before new work, rather than using the old untimed metadata route.

## 7. Source map and consumer changes

Current inspected owner sizes include `resource-quality.mjs`399, `watchdog-config.mjs`399, `processes.mjs`385, `receipt-verification.mjs`395, `driver-protocol.mjs`395 and `snapshots.test.mjs`399. The splits below are required before additions. Every changed/new SOURCE and TEST remains **strictly under400 readable lines**, with no statement compression, unrelated movement or adjacent refactor. Documentation is not subject to that source cap.

| Existing owner | Exact planned change/boundary |
| --- | --- |
|`evaluation-policy.mjs`|Add exact V3 literal/path mapping and the two pure helpers. Preserve V2 literal and V1/V2 selection behavior.|
|`schema-constants.mjs`, `schema-primitives.mjs`, `record-fields.mjs`|Unchanged. Reuse fixed science/caps/closed-shape primitives. Do not add readiness to unversioned v1 fields.|
|`phase-fixtures.mjs`|Accept exactly the V3 policy with layout2 and unchanged science/limits. No inventory-driven choice.|
|`record-schema.mjs`, `record-schema-v2.mjs`|Keep V1 dispatch. Schema2 validates exact selected-policy variants. Add readiness only to V3 final/completion; strict per-policy resource ID and coherence. Shared running/events stay structurally2 and graph-bound.|
|`resource-quality.mjs`|Move its whole pure schema/primitive group to the declared schema leaf; keep public validator re-exports. Constructor gains exact validated policy selection with existing V2 default, emitting the selected ID. Same single ledger and all clocks/counters.|
|`processes.mjs`, `process-accounting.mjs`, `process-observation.mjs`|Validate exact policy and private preflight reader. Replace compare-only softness with exact policy/purpose/scope classification. Preserve the one state/queue/allocator/owner, strict bootstrap/proofs and pre-commit fence.|
|`process-runtime.mjs`, `process-runtime-start.mjs`, `process-stop.mjs`|Retain the original sole tick/start/stop lifetimes, handle bounds and fence behavior. Forward existing private purposes unchanged. The existing top-level stop entry invokes the private scope revocation immediately before its original stopping fence, using the borrowed association hook; no timer or sample-clock reset. Review/test these whole owners.|
|`watchdog-verdict-policy.mjs`, `watchdog-resource-policy.mjs`|Exact policy-bound allowed projection branch. Measured caps/hard native state first. Keep same1000ms poll and one owned footprint task.|
|`watchdog-config.mjs`|Move the whole `createWatchdogOperationContext` group to the declared context leaf and preserve its existing named re-export. Capture/forward only the genuine private preflight scope; validate phase/association before use.|
|`watchdog.mjs`, `watchdog-runtime.mjs`, `watchdog-selftest-operation.mjs`|Forward the scope from actual assembly. Genuine fixed-first selftest verification opens it; first finish/stop/shutdown closes it. Existing first-stop/deadline/ACK order stays authoritative.|
|`watchdog-cleanup.mjs`, `watchdog-cleanup-context.mjs`|Exact top-level V3 preflight historical-coverage distinction. Current timely/strict cleanup, nested prefix and actual physical closure remain mandatory. P/C unchanged.|
|`watchdog-admission.mjs`, `prerequisites.mjs`|Use the verified-parent scientific classifier only after genuine graph readback and before unchanged finalizer probes. Public `admitPhase` arguments gain no bypass flag.|
|`prerequisites-evidence.test.mjs`|Existing test owner, not a production `prerequisites-evidence.mjs` module. Add new genuine graph cases in new TEST leaves rather than inventing that absent source owner.|
|`record-inputs.mjs`, `driver-bridge.mjs`|Reserve/reject `scientificReadinessVerdict` and new supervisor evidence namespaces for V3. A driver cannot provide verdict authority. Exact V1/V2 request behavior stays unchanged.|
|`driver-protocol.mjs`, `driver-bridge-wire.mjs`, `driver-bridge-methods.mjs`, `supervisor-protocol.mjs`|Use exact selected policy/path mapping instead of schema2=>v2 path. V3 hello/start still add only recordSchemaVersion2/evaluationPolicy. Closed wire rejects readiness as a top-level finish field. Existing hard Native wire/registry/ACK bounds stay unchanged.|
|`record-evidence.mjs`, `records.mjs`, `record-finalizer.mjs`|Same canonical capture, final event, real close/fence/ticket/prepare/publish owner. Before pure final compilation, await graph-bound preflight collection/replay with the one fixed receipt-only B context, confined IO and registrar. A retains original C; B begins only after real A closure and carries through prepared verification. No new writer, second ledger or changed publication order.|
|`record-finalization.mjs`, `record-finalization-v2.mjs`|Dispatch exact V3 closed facts to the new compiler, keep V2 compiler semantics. V3 completion copies readiness only from actual derived final. Never rescope or rewrite failed parent resource verdicts.|
|`verdicts-v2.mjs`|Unchanged. New V3 reducer owns its own closed variant, literal failed timing grade and admitted-parent distinction.|
|`receipt-verification.mjs`|Keep complete inventory/ref/identity/nested/ancestor verification and prepared-token rules. Thread mandatory V3 budget context through recursion/prepared verification and private prepared association. For capacity, move the whole unchanged pure selftestOutcome group into existing receipt-verification-v2.mjs and preserve its current named re-export. This adds no runtime path or proof authority.|
|`receipt-verification-v2.mjs`|Preserve strict V2 exported entry; add `verifyReceiptVerdictsV3` and a validated internal policy dispatcher. Both reconstruct the matching compiler; V3 awaits fresh bounded collector/replay. Host the unchanged moved selftestOutcome group. Existing readVerdictEventsV2 denotes event layout2, not implicit policy selection; forward its current IO plus V3 verification context.|
|`artifact-completion.mjs`, `completion-publication.mjs`|Preserve actual prepared ownership/containment/publication. The private verified association forwards the exact V3 verification context into existing post-publication canonical graph readback; no caller can substitute a new cutoff, IO owner or verification token. V1/V2 private/public shapes retain their old behavior.|
|`receipt-verdicts-v2.mjs`|Keep the public coherence entry and V2 result. Dispatch exact V3 bundle/reducer including readiness; assert final-event policy association, final/completion equality, parent resource coverage and unchanged monotonic checkpoints/prefix/peaks.|
|`snapshots.mjs`, `snapshot-reopen.mjs`, `snapshot-identity.mjs`, `identity-schema.mjs`|Exact selected V3 path/policy/hash through initial capture, independent reopen and final remeasurement. Continue full source/input/environment/model checks. No auto-upgrade of old workspaces.|
|`snapshot-files.mjs`|Append exactly the eight paths in section8. Preserve the old127-entry prefix, dependency checks and frozen explicit membership.|
|`run.mjs`, `run-driver.mjs`, `run-supervisor.mjs`|Add V3 to the exact public selector. Actual supervisor creates/private-binds the scope; archived driver rechecks identity/manifest/protocol. Same phase/body/SDK-close/final-integrity order.|
|`phase-runners.mjs`, `page-arm.mjs`, `match-observations.mjs`, `pgn-evidence.mjs`, `pgn-summary.mjs`, `stats.mjs`|Science producers, count/identity/rules/paired formulas remain unchanged. Review and test actual ten-request, A/A, timing-estimate and full40 bodies. New reader reuses their existing contracts.|
|`watchdog-shutdown.mjs`, `cli.mjs`|Expose readiness only from published, verified V3 final. Keep actual nonzero aggregate exit and completionRef requirement; missing graph never produces ready CLI output.|
|`train/scripts/check_browser_parity.py`|Exact V3 path/policy with layout2 selection and exact manifest/common hash. Preserve strict parity, bool-vs-int rejection, original setup90/archived phase clocks and private reference-child behavior.|
|TEST-only `native-fixture-admission.mjs`|Forward a genuine optional private periodic-scope reader to the same monitor factory for the new V3 Native group. Preserve existing defaults, actual serial monitor admission, process/pipes/debt accounting and V1/V2 cases. The375-line owner must stay under400; the new TEST fixture owns any added setup logic.|

All relative runtime imports, dynamic archived imports, Python entry references and runtime roster consumers must be checked statically and in tests. Generic schema2 forwarding sites may need only a shared helper change, but each named consumer above must appear in the final code-to-contract review; do not assume version==2 implies V2 policy.

## 8. Before-use new owners, shapes and exact counts

Create exactly these seven runtime helpers plus one fixture. The final `RUNTIME_PATHS` keeps its complete old127-entry prefix and appends this exact ordered suffix: `resource-quality-schema.mjs`, `watchdog-operation-context.mjs`, `train/fixtures/browser-protocol-v3.json`, `preflight-readiness-v3.mjs`, `preflight-evidence-v3.mjs`, `verdicts-v3.mjs`, `record-finalization-v3.mjs`, `process-preflight-quality.mjs` (all .mjs paths have prefix `train/scripts/browser_eval/`). The prospective count is **135**, derived from127+8. No TEST, W operator or README enters the functional runtime roster. The table declares ownership, not a different insertion order.

| New path | Exports/private shape and ownership |
| --- | --- |
|`train/fixtures/browser-protocol-v3.json`|Closed layout2 protocol with exact V3_POLICY. Data only.|
|`train/scripts/browser_eval/preflight-readiness-v3.mjs`|Pure `assertScientificReadinessV3`, `deriveScientificReadinessV3`, `classifyVerifiedParentV3`. No IO/clock/writer. Consumes verified facts, never claims or persisted verdicts as authority. Parent classifier returns scientific admissibility plus the unchanged actual resource verdict; no synthetic pass.|
|`train/scripts/browser_eval/preflight-evidence-v3.mjs`|Async collectPreflightEvidenceV3(options,{io,budget}) reads exact bound evidence and awaits genuine budgeted PGN replay on the same registrar. Pure validatePreflightEvidenceV3 checks detached observations/replay facts only. No Native/writer/resource waiver. Results are independently reconstructed during graph verification.|
|`train/scripts/browser_eval/verdicts-v3.mjs`|Pure `assertVerdictsV3`/`deriveVerdictsV3`. Closed facts add readiness proof and per-parent scientific-admission facts while preserving actual parent resources. Owns only new policy's status/coherence reduction, no statistics recomputation.|
|`train/scripts/browser_eval/record-finalization-v3.mjs`|Pure `compileFinalV3` over detached actual closed facts, observations and verified parents. Derives readiness, unchanged full40 game/paired evidence and V3 verdicts. Reuses current game evidence helper with genuine science admission, never coerces resource status to passed.|
|`train/scripts/browser_eval/process-preflight-quality.mjs`|createPreflightQualityScope keeps frozen private `{reader,verifyAndOpen,close}`, opaque run-bound reader and unchanged terminal revocation. `verifyAndOpen(input,{io,budget},assertLive)` forwards the original-arm verification context to the same genuine internal-selftest verifier; no Native purpose, scope transition or authority changes. Only trusted supervisor context holds activation; monitor receives reader only and driver neither.|
|`train/scripts/browser_eval/resource-quality-schema.mjs`|Whole existing pure resource schema/primitive group extracted from399-line owner. Exports validators and the exact shared scalar/counter/episode helpers required by the same ledger. Allows only known policy IDs with explicit graph binding; no mutable ledger, writer or IO. `resource-quality.mjs` keeps its public validator re-exports and sole ledger factory.|
|`train/scripts/browser_eval/watchdog-operation-context.mjs`|Whole existing `createWatchdogOperationContext` group moved from399-line config on identical grouped refs. Adds private preflight-scope forwarding only. No second state, stop latch, clock, lifetime or writer. Existing config/operations re-export APIs remain.|

### Exact private helper contracts

These are closed argument/result shapes. Existing named shapes below retain their current validators: `ArtifactRef`, `CommonIdentity`, `CleanupProofV2`, resolved required-check entry `{id,status,evidence}`, schema2 records/events, current ResourceEvidence and `VerifiedEvidence` (the exact frozen result of genuine `verifyReceiptGraph`). A reference to such a shape does not allow arbitrary extra keys. Private booleans are derived compiler facts; public driver/CLI requests cannot supply any of these helper inputs or outputs as proof.

- `PreflightEvidenceInputV3` is exactly `{manifest,inventory,events,summary,observations,throughput,aaReplays}`. The first six fields keep the draft2 meanings: exact V3 manifest, actual sorted ArtifactRefs, validated contiguous events, detached summary,20 ordered `{ref,value}` readiness/move observations and throughput `{ref,value}`. `aaReplays` is exactly two canonical detached entries in aa-g1/aa-g2 order. Each entry is exactly `{gameId,pgn,replayedBytes,replay}`: pgn is its actual selected ArtifactRef; replayedBytes is `{byteLength,sha256}` computed from the actual confined Buffer passed to replay and must equal pgn's length/hash; replay is exactly `{movesUci,fen,result}` from the awaited genuine helper. movesUci is an array of legal-format UCI strings, fen is a nonempty canonical FEN and result is a terminal result literal. gameId binds the unchanged fixed A/A schedule and existing supervisor game/checkpoint events. No promise, bytes, budget, clock or callback enters this pure input. Missing/unreadable/hash-invalid/replay-failed input throws before constructing it; complete but semantically false detached facts produce a failed check.
- `validatePreflightEvidenceV3(input)` is synchronous/pure and returns frozen `PreflightEvidenceV3={runId,manifestSha256,checks}` with the same four ordered independently derived checks. It validates replay tuple/ref/schedule/result/FEN binding but never calls replayCheckpointPgn. `collectPreflightEvidenceV3({workspaceRoot,manifest,inventory,events,summary},{io,budget})` is async and returns `Promise<PreflightEvidenceV3>`. Its closed second argument requires the existing actual graph IO/retainer/effect guard and the original genuine budget. It bound-reads the actual Buffers, checks length/hash, uses the fixed schedule to await each retained replayCheckpointPgn({phase,game,bytes,budget}), detaches the exact return into aaReplays, then invokes the pure validator. Before/after every await and at each helper boundary the same budget/guard remains live. No no-op/unbounded fallback, new lifetime or refreshed bound is allowed.
- `classifyVerifiedParentV3({forPhase,expectedIdentity,evidence})` accepts a valid requested phase, exact CommonIdentity and a genuine freshly verified `VerifiedEvidence`. It returns frozen `{phase,runId,completionRef,scientificAdmissible,resourceVerdict,closureResourceVerdict}`. Identity/policy/ref/phase mismatch rejects. `scientificAdmissible` is true exactly for the strict required parent or the section6 V3-preflight exception; the two resource verdicts are unchanged copies from that actual final. This pure classifier cannot prove a live identity gone; the existing separate admission probe remains mandatory.
- `V3ClosedFacts` inherits **every exact field/type** of the closed `verdicts-v2.mjs:deriveVerdicts` input (phase,runId,eventsRef,resourceEvidence,completedGames,completedPairs,cohortProven,scienceProven,identityProven,cleanupProven,recordsProven,prerequisitesProven,nativeProven,storeProven,monitoringComplete,workspaceLimitExceeded,hardFaultCount,stoppedEarly,checksPassed,provenViolation,abandoned,stats,prerequisiteResources) and adds exactly `evaluationPolicy` (exact V3_POLICY), `requiredChecks` (the complete original phase check set), `preflightEvidence` (PreflightEvidenceV3 for preflight, null otherwise), `selftestProven` (boolean, false outside preflight), and `prerequisiteAdmissions` (the exact classifier-result array in required parent order). ResourceEvidence must carry V3's exact ID. `prerequisitesProven` is exactly all required admissions scientificAdmissible with exact set/refs; prerequisiteResources equals their actual resourceVerdicts, never passed substitutes. Preflight CHECK/parity admissions must both be strict. `selftestProven` is recomputed from the real nested graph, selftestOutcome and prefix extension. `badScience` in section5 compares the corresponding resolved/independent checks; preflightEvidence must bind the current run/manifest.
- `deriveScientificReadinessV3(facts)` accepts V3ClosedFacts and returns exactly the section5 `{status,reasons}`. `assertScientificReadinessV3(verdict)` validates that closed shape/status/reason coherence. `deriveVerdictsV3(facts)` accepts the same facts and returns the existing five-field verdict bundle plus exactly `scientificReadinessVerdict`; `assertVerdictsV3(bundle)` validates that closed V3 bundle. Recompute, do not trust a persisted readiness label. Non-preflight readiness remains the exact fixed not-applicable value.
- `compileFinalV3(input)` accepts exactly `{headFields,commonIdentitySha256,request,claims,phaseDirectory,recordedProof,identityProven,identityMismatch,cleanupOk,identityObservation,expectedIdentity,expectedFinalizer,artifactRefs,eventsRef,events,verifiedParents,requiredChecks,preflightEvidence,verifiedSelfTest}`. The first17 fields inherit the corresponding existing `createEvidenceCapture.finalInputs`, `compileFinalV2` and actual closed recorder inventory/event/parent values; requiredChecks is the resolved original complete check set. New preflightEvidence is the bound recomputed value above (null outside preflight); verifiedSelfTest is genuine VerifiedEvidence for the exact nested receipt (null outside preflight). The compiler recomputes identity/cleanup facts from raw captured observations/proof and derives selftest/parent facts, not the legacy compatibility booleans alone. It returns frozen `{final,facts}`, where final is the closed V3/schema2 final and facts is V3ClosedFacts. Prepared and ordinary graph verification reconstruct these same inputs, including rereading the actual nested graph.
- `createPreflightQualityScope({runId,evaluationPolicy,phase})` keeps its draft2 run/policy/phase validation, opaque reader, genuine selftest transition and terminal close semantics. Its private verification call is now `verifyAndOpen(input,{io,budget},assertLive)`, with the same existing verifyInternalSelfTest input and original-arm budget from section6. It forwards unchanged IO and VerificationContextV3 to that genuine verifier and runs the same admission/abort guards before/after the await. Return remains the genuine verifier result. `close()`, `allowsPreflightPeriodic(reader,runId)` and `closePreflightPeriodic(reader,runId)` retain their exact draft2 behavior. This budget propagation changes no Native scope, numeric cap, sampling purpose or proof requirement.
- `resource-quality-schema.mjs` exports the unchanged whole schema/primitive declarations needed by the ledger: `CAUSES,HARD,GAP,CAP,CHECKPOINT_FIELDS,ns,nat,count,counts,lateDetail,fieldSpec,fail,assertQualityCheckpoint,assertResourceEvidence`. Validators gain only exact known-policy handling; all scalar/episode rules remain. The ledger imports these names and the existing schema primitives; its state is not exported or duplicated.
- `watchdog-operation-context.mjs:createWatchdogOperationContext` keeps the exact existing `{config,capabilities,state,timing,control}` arguments and existing return fields, adding exactly `preflightQualityScope` (the genuine private scope control object for V3 top-level preflight, null otherwise). Configuration validates its run/policy/phase association before forwarding. No JSON/wire shape gains that private capability.

Additional runtime owners require a documented Root before-use path/API/count/import-test ruling and focused review before creation/use. A routine private SOURCE/TEST split needed for the under400 cap is within the approved implementation scope when it preserves semantics, authority and proofs; it does not automatically require another Hansel approval. Root must publish the revised exact intermediate/final roster and relevant tests before that owner is used. Changes to policy, public API, ownership authority or proof requirements still require the applicable reviewed-design approval. Do not compress or silently invent helpers.

New TEST-only owners, all under400 lines: `preflight-policy-v3.test.mjs`, `preflight-monitor-v3.test.mjs`, `preflight-readiness-v3.test.mjs`, `preflight-graph-v3.test.mjs`, `preflight-terminal-v3.test.mjs`, `preflight-compat-v3.test.mjs`, `preflight-native-v3.test.mjs`. The policy leaf owns only the one recognition feature regression specified in section10; other policy/closure/cross-product tests live in the compat leaf. One new TEST-only `preflight-v3-test-fixtures.mjs` provides genuine temporary store/recorder/graph fixtures and controlled process stimuli; no tests export production authority. Exactly seven new `*.test.mjs` leaves makes the current89-owner serial roster **96**. Test-case totals are observed results, not predicted counts. Test fixtures and Native controls are never actual browser/scientific phase receipts.

Buildable capacity checkpoints precede the rest of V3. No later V3 module, fixture or relative import may be listed before its real file exists:

1. Split A: extract the actual whole resource schema/primitive group and append only `train/scripts/browser_eval/resource-quality-schema.mjs`. Exact roster is old127 plus that one path, count128. Keep its exported behavior strictly V2 at this checkpoint. Move the whole existing runtime-roster test block from399-line `snapshots.test.mjs` into the newly declared real `preflight-compat-v3.test.mjs`, preserving its old prefix/tail assertions and adding the exact current suffix/import checks there. This new leaf has working tests and imports only already-existing or newly created real files. Existing89 owners plus this leaf gives90 TEST owners. Update `private-fs-phase.test.mjs`'s explicit count128 and scan all128 owners. Run the whole affected schema/ledger/snapshot/compat/private-FS owners with actual closure/import/existence checks; commit only green source plus its current contract docs.
2. Split B: move the actual whole operation-context group, preserve its existing config/operations re-export and append only `train/scripts/browser_eval/watchdog-operation-context.mjs`. Exact roster is old127 plus the preceding two helpers in that order, count129. Keep all existing context behavior; private V3 scope fields are added only later with the real scope implementation. The same90 TEST-owner set is available. Update the compat suffix assertion to those exact two paths and private-FS count129; run the whole affected config/operations/watchdog/closure owners and imports before a second green commit.
3. Final V3 transition: create the six remaining real files, wire their actual code, and append exactly the remaining six entries in the final ordered suffix above. Count becomes135. Update current compat suffix/closure expectations and private-FS count135 in the same change. Add the other six declared TEST leaves; the final serial owner count is96. Existing roster assertions keep the complete old127 prefix unchanged, not a guessed current count. No empty placeholder module, future missing import, test skip or closure-check omission can make an intermediate commit green.

The compat leaf owns all current count/suffix/import checks at each checkpoint; its V3 policy cross-product cases are added only when those APIs exist. The recognition RED in section10 uses a separately pinned OLD evidence profile and does not leave an expected-failing feature TEST in an intermediate green branch. Create that feature leaf in the real branch with its selector implementation and identical tested bytes. All roster tests assert uniqueness/frozen membership, file existence, static/dynamic relative import closure and exclusion of TEST/W/docs entries. Do not replace explicit membership with a glob.

## 9. New V3 operator, readback and release files

Create NEW `W/separate-verdicts-shared-v3.mjs` and `W/separate-verdicts-graph-v3.mjs`, plus NEW `W/separate-verdicts-owned-command-v3.mjs`, `W/separate-verdicts-verify-phase-v3.mjs`, `W/separate-verdicts-owner-controls-v3.mjs` and inert `W/separate-verdicts-release-v3.template.json`. Public CLI grammar remains `--run <phase> <release>` and `--verify <phase> <release>`. All old V1/V2 W files, templates, controls and pins remain byte-exact. Existing task-3 stream/process-owner/control-child are reused unchanged.

The shared module owns constants, release/source/runtime validation, JSON/hash helpers and pure owner/operator predicates. The graph module owns asynchronous genuine graph reads/rechecks and imports shared plus Node builtins. Neither module imports a CLI, launches work, reads files, starts timers or runs an awaiting main at import time. The command CLI and verifier CLI import shared/graph; the command never imports the verifier CLI, statically or dynamically. Deferred imports inside graph functions may load only exact released archived runtime modules after their pin barrier. Owner controls may exercise exported graph functions without evaluating a command main. This acyclic direction is mandatory.

The shared module also exports synchronous `assertBootstrapCurrentV3(releasePath) -> {release,inputsBefore}` for **exactly phase CHECK with zero parents**. It uses released CURRENT input authority: validate operational3 release, all eight W/source/runtime135/protocol/model safety pins, qualified current Node/Python identity, clean exact committed candidate/branch and unchanged model length/hash through the existing synchronous loadRelease/assertReleasedInputs/currentInputs checks. Canonical parent paths must be valid and lstatSync of each requested workspaceRoot/orchestrationRoot must return ENOENT; any existing file/directory/symlink or other error rejects. This path does not inspect a future archive, call openV3ReadOnlyGraphContext, read prior receipts or import archived modules. **No asynchronous metadata context, lifetime, timer or metadata promise is created.** Synchronous metadata reads and the existing synchronous checked Git/runtime subprocess calls must have returned with their handles/pipes closed before the function returns; retain their existing guards/timeouts and fail closed on error. Returned inputsBefore is the actual current-input snapshot, not a graph/readiness verdict. The command branch is selected solely by the existing exact CHECK phase, never a public bypass flag, archive-read failure or broad fallback.

The exact V3 `SCRIPTS`/orchestrationScriptsSha256 key set is eight names: `task-3-stream.mjs`, `task-3-process-owner.mjs`, `task-3-control-child.mjs`, `separate-verdicts-shared-v3.mjs`, `separate-verdicts-graph-v3.mjs`, `separate-verdicts-owned-command-v3.mjs`, `separate-verdicts-verify-phase-v3.mjs`, `separate-verdicts-owner-controls-v3.mjs`. The inert template and later one-use evidence control have separate required safety/control pins; they are not extra SCRIPTS entries. These W modules are excluded from functional runtime135 and TEST96. Each stays under400 readable lines.

The **operational release and inert template have schemaVersion3**, explicitly distinct from experimental recordSchemaVersion2. V3 loadRelease requires exactly operational3, exact V3_POLICY/protocol ref/hash and the same closed V2 release keys, with the expanded exact eight-script hash map. It rejects operational2 releases; old V2 operators remain unchanged and cannot load operational3. Preserve the committed candidate, released Node/Python identities, complete135 runtime/safety/TEST/operator/doc pins and unchanged constraints. Template stays PREPARATION_ONLY with no approved candidate/root/time/GO or cohort authority. Fresh released roots are absent, canonical, exclusive and disjoint from old workspaces; external workspace basename is `tinyaz-v3-<candidate7>-<UUID>`. Preserve existing orchestration basename grammar and one exclusive comparison-claim file.

This amendment also proposes exactly ONE fresh evidence-only read-only V3 integrity control, **after a successful CLOSED fresh committed V3 CHECK**. Name its future file before creation as `E19/scan-integrity-coverage-control-v3.mjs`; it is excluded from functional runtime paths and scientific parents. Copy the original147-line E16 control algorithm, preserving its original90s end,1000ms scan-start-age qualification, one genuine integrity collection, three idle scans before/after, serial250ms after-completion spacing, worst8/bounded output, exact root/content/source/environment/model checks and every actual task/timer/lifetime/FD/command/both-pipe/raw/journal join. Change exactly THREE string-literal bindings: candidate to the new full committed hash, workspaceRoot to that CLOSED V3 CHECK's exact canonical root, and protocolPath from `train/fixtures/browser-protocol-v2.json` to `train/fixtures/browser-protocol-v3.json`. No other body byte changes. Before GO, reverse only those three replacements and require original body SHA256 `0968139fa648fd15edabbaf2c90e6dccf04748d615d4130a780b79ac081bc8ad`, original147 lines, and an exact substitution diff; preserve all original/V2 bodies, pins and evidence. Root pins/reviews the concrete new bindings, source/runtime and evidence sinks and supplies a separate one-use control GO only after implementation approval and successful CHECK. The consumed V2 authorization does not authorize the third changed literal or this future execution. A failed CHECK/control/threshold/closure stops the sequence; no extra diagnostic phase, second control or automatic retry is granted. The new control remains diagnosticOnly/scientificEvidenceEligible=false and provides no causal timing ratio or cure.

V3 `assertPrior` still requires command and original readback natural closure, both raw pipes, exact byte counts/fsync/FD/journal closure, no intervention/errors/signals, exact release/runtime/source identity and genuine original verifier-owner exit0. CHECK/parity require experiment0 and strict passed resource grades. **Only** the preflight prior for compare may have experiment2/operator2 when its freshly recomputed ready graph and exact allowed own coverage failure satisfy section6. It must not require that2 become0 or accept every2. Operator2 preserves the experiment's inconclusive resource grade; it is not a failed owner or passed resource grade.

### Exact async W graph API and command context

- `openV3ReadOnlyGraphContext({releasePath,purpose})` is async; purpose is exactly phase-readback or prior-recheck. It is used after an archive exists: prior-recheck for parity/preflight/compare, and initial phase-readback only after its phase actually bootstrapped/closed. It is not used before first CHECK. It captures one real monotonic start and absolute end=start+90000ms **before** release/source reads, guards every pin/read/import stage and loads only the released archived verifier after all runtime135 pins match. Its initial import/pin guard uses that same actual end; constructing the genuine BudgetHandle after the pin barrier keeps the captured end, never now+another90s. Return is frozen `{release,context}`. Release is the validated operational3 release; context has exact private fields `{purpose,startedMonoNs,deadlineMonoMs,budget,io,assertLive,close}`. It owns one genuine actual lifetime, its same IO registrar/effect guard and real descriptor/task debt. Context exposes the original VerificationContextV3 budget, not a caller-selected extension.
- `context.close()` is idempotent async and returns `{actualVerifierOwnerSettled:true,budgetDisposed:true}` only after actual retained reads/replays/FDs have settled and its timer/budget is disposed. There is no retained outer body waiting on its own global join. On either success or failure, the caller awaits every issued body/real close, preserves the first error, then awaits close in finally. Expiry blocks new work and positive results; it does not fake physical settlement. Unknown close debt remains unknown/pending. No read-only context changes experiment/cleanup deadlines or historical grades.
- `readPhase(r,phase,command,context)` is async in the graph module. It validates the exact release/phase/current owner metadata/log bytes, then awaits the genuine archived verifyReceipt with the context's IO and `{budget:context.budget}`. It independently rebuilds the full graph and returns the existing readback result plus scientific readiness fields. It does not create directories, write verification.json, close a borrowed context or label its owner settled before context.close actually succeeds.
- `assertPrior(r,priorPhase,context)` is async in the graph module and returns `Promise<PriorAdmissionV3>`. It bound-reads the original result.json, decision.json, verification.json, readback owner receipt and their raw/log commitments; proves their exact release/source/runtime and truthful closed ownership; and **awaits readPhase with actual current workspace bytes**. It applies the section6 policy-specific strict/ready2 rule to that fresh result. `PriorAdmissionV3` is exactly frozen `{phase,runId,completionRef,scientificAdmissible,resourceVerdict,closureResourceVerdict,releaseSha256,candidate,workspaceRoot}`; successful return requires scientificAdmissible:true. This in-memory result does not replace the later Native gone probes or runtime admission. Saved JSON is provenance, not substitute graph authority.

Command CLI ordering has exactly two phase branches. **Cold CHECK:** synchronously call assertBootstrapCurrentV3; only after all current metadata checks/calls return closed, exclusively create its absent orchestration root, execution metadata and CHECK output, then launch the existing real command owner. Leave workspaceRoot absent for the actual CHECK bootstrap to create its archive under its unchanged preparation/experiment bounds. There are no parent reads, async graph-context cleanup or comparison claim in this branch. A successful launch admission is not a successful scientific CHECK.

**Parity/preflight/compare:** keep the existing awaited path unchanged: open one prior-recheck context; validate release/source/runtime and execution-root binding; for each required earlier phase in CHECK,parity,preflight order, `await assertPrior(r,prior,context)` sequentially; recheck all released source/runtime/policy/model pins under the same context; await context.close on success/failure; then, only after all checks and physical closure succeed, exclusively reserve the new phase output and (for compare) one comparison-claim.json and spawn through the existing real owner. No claim/output/spawn from an unresolved/failed prior. One original read-only90s end covers the whole parent set. Archive absence/corruption in a successor rejects; it never falls back to cold-CHECK authority. Native runtime admission independently verifies exact parents/finalizer-gone proofs under unchanged original bounds.

Verifier CLI ordering is fixed: after the phase's actual natural closure, open one phase-readback context; validate release/source/runtime and command ownership; await readPhase; recheck input pins; await context.close in finally; only on successful verification and real context closure add actualVerifierOwnerSettled:true and exclusively write the initial verification.json/print it. **CHECK's initial readback still requires its newly created full135 archived-pin barrier and genuine complete graph**; a missing/incomplete archive cannot qualify via the cold launch checks. This preserves readback0 for a valid experiment2. A fresh prior recheck calls graph functions directly and is strictly read-only: it never reruns --verify, overwrites/appends verification.json or changes old result/decision/receipt files. Its return is held in memory until admission; a changed prior rejects rather than rewriting verification.

Readback exposes scientificReadinessVerdict, preflightScientificReady (derived from that graph, not input), existing strength/resource/closure grades, actual experiment exit, independent readback exit and actual verifier settlement only after the sequence above. For compare, retain inherited failed preflight resource refs/reasons. Missing graph, arbitrary2, unready preflight, wrong policy or closure failure rejects/nonzero and never starts a successor.

`operatorDecision` in shared keeps distinct owner closure, authoritative graph, preflight scientific readiness, strength eligibility, experiment exit and operator exit. No automatic next phase. For parity/preflight/compare, before actual claim/spawn the async sequence freshly verifies all required graphs regardless of stored readback0/GO. Owner controls must first create real temporary recorder/prepared/closed graphs and original closed command/readback receipts, obtain a successful genuine assertPrior, then tamper one selected preflight PGN byte without altering its ref or prior verification.json. A second actual assertPrior must reject on fresh byte/graph verification despite unchanged earlier success metadata. Also exercise the actual command coordinator's awaited-parent path with a test-only phase-launch tripwire: rejected tampered prior must leave comparison-claim/output absent and observe zero phase launches. Do not stub the receipt verifier or substitute a failed/readiness boolean. The tripwire cannot launch a scientific cohort; all fixture owners/pipes/FDs/tasks must genuinely close.

Add a cold-CHECK coordinator/owner control using a valid operational3 release and qualified CURRENT pins with both target roots absent. The actual synchronous bootstrap validator must complete without any archived read/context; a test-only launch tripwire is reached exactly once with CHECK/V3/selected release arguments. It stops before running a browser/model/bootstrap and records only launch admission, never a fake scientific CHECK/completion. A sibling case with existing workspaceRoot and another with existing orchestrationRoot must reject before any launch/overwrite. Preserve the occupied roots and observe zero launches. Assert that a later initial CHECK readback with no archive still rejects at the full135 archived barrier. These cases live in the already declared preflight-terminal-v3.test.mjs and W owner-controls-v3, without a new functional owner, TEST leaf or runtime bypass.

## 10. RED/GREEN and verification matrix

Use exactly this feasible sequence. **The OLD RED proves policy recognition only.** It does not claim to prove the Native timing transition, full graph admission or a repaired E18.

1. Recognition RED stage: pinned unchanged source `67b85fe0fee54519bb0b0eae09c6083cd37df07d` plus only new `preflight-policy-v3.test.mjs`. That TEST file imports only the already-existing `policyForProtocol` API and Node builtins. It reads existing v1 browser-protocol.json and constructs the prospective valid fixture in memory by setting schemaVersion2 and the exact inline V3 literal. It imports no future helper, V3_POLICY export or V3 fixture file. Its sole test is named `explicit V3 policy selects the V3 protocol path`; it runs `assert.doesNotThrow(()=>policyForProtocol(protocol,"train/fixtures/browser-protocol-v3.json"))`, then asserts returned value equals the exact inline V3 literal. The expected RED is the first assertion's `ERR_ASSERTION`, reporting the old selector's `SCHEMA_LITERAL: policy/version/protocol binding`. There are no other tests to skip or filter. Exact command: `<released-node> --test --test-concurrency=1 train/scripts/browser_eval/preflight-policy-v3.test.mjs`. Original source pins must match before/after.
2. Recognition GREEN stage: after approved exact selector/fixture-policy recognition is implemented, run the **identical test bytes and command** under fresh pinned evidence. It passes only if the explicit API recognizes this exact prospective path/policy; cross-product rejection tests remain mandatory in the compat owner. This narrow green can precede timing/scope implementation. Missing imports/helpers/runtime/fixture or another assertion failure is a harness/setup failure, never the intended RED.
3. Timing isolation stage: under the completed reviewed FIXED source, `preflight-monitor-v3.test.mjs` covers deterministic purpose/scope and500ms boundaries. `preflight-native-v3.test.mjs` owns test `v3 preflight private periodic timing preserves strict controls`: genuine Native held periodic delivery (the existing650ms bounded stimulus and unchanged bytes/order) in an opened V3 scientific-preflight scope retains typed quality/no hard fault, while serial strict V1 preflight, V2 preflight and V3 CHECK/bootstrap/selftest/control/cleanup-purpose lanes reject their equivalent timing violation. Capture each lane's actual request, clocks, retained resource ledger, hard/quality result and physical settlement. This is a FIXED policy contrast, not an invented supported OLD V3 comparison or a paired latency-cure claim.
4. Proof/admission GREEN stage: new readiness/graph/terminal tests must generate real temporary V3 closed graphs, independently reconstruct readiness and admit only the exact section6 exception. These positive/negative gates and final whole-suite/Native evidence establish the new behavior. They are not labeled an OLD full-graph RED because old source cannot create V3 graphs. E18 remains historical failed evidence and is never a regression fixture or parent.

| Test family/whole owner | Required cases |
| --- | --- |
|Policy/compat and current `separate-verdicts-compat`, `phase-fixtures`, `record-schema`, `snapshots`, `run`, driver bridge/protocol/IPCs|All v1/v2 characterization unchanged; three fixtures present never selects V3. Full path/policy/schema/manifest/identity/resource-ID cross-product; absent/extra readiness and policy keys; reordered/changed softPhases; Python bool-vs-int; wrong frozen/current hash; stale/archive tamper. Operational release3 versus experimental record2 cross-products, exact eight-SCRIPTS hashes and side-effect-free shared/graph imports reject cycles/CLI dependencies/import-time main execution. Actual hello/start and archived selectors, not only helper mocks.|
|Monitor and current `separate-verdicts-monitor`, `process-observation`, `process-lifecycle`, `processes`, `process-budget`, `resource-quality`|Exactly500ms passes,500ms+1ns loses coverage only in eligible private periodic scope. Each of three causes and mixed causes; pending age merges once and closes truthfully. Strict bootstrap/control/public sample/selftest/cleanup and scope-before-open/after-close remain hard. Genuine selftest verification is required to open; forged reader, wrong run, duplicate/late opening, stop-during-verification reject.|
|Hard monitor/Native/ownership/transport/backend/lsof/listener whole owners|Negative/reversed clocks, unsafe sums, missing member/full-union exhaustion, identity reappearance, permission/EOF/backend/transport errors, original-handle expiry, missing response, after-fence data used as proof and unknown physical debt all remain hard after an earlier soft loss. A live-handle settled negative fenced diagnostic alone preserves its existing non-proof behavior; test no clock/counter/terminal admission and successful independent cleanup/closure separately. Its expired-handle, positive-cap and unsettled-debt twins reject. Measured exact4GiB versus4GiB+1, including slow/late positive cap, preserves sticky observed cap and no eligibility.|
|Watchdog and current resource/cleanup/integrity/selftest/boundary/finish-order/evidence/drain owners|Soft periodic projection continues scientific work and retains diagnostics. Hard/cap checks still stop before finish. Strict current cleanup can succeed after historical gap; stale current proof, cleanup failure, missing listener/both-pipe/task/FD/join, scope confusion, expected-selftest fault mismatch and exhausted P/C reject. Original90/30/5/600s/24h/1000ms and256MiB edges remain hard.|
|Readiness and actual `phase-runners`, page-arm/match/PGN/check owners|Ten complete requests pass only five per role with exact identities/visits and completed operation refs. Missing eighth request, duplicate/misbound observations/session/path, nondeterministic result, illegal move, substituted delivery, fewer than five samples, forged latency statistics, missing/failed timing estimate and missing/invalid A/A color/draw/PGN/checkpoint each reject. Source-bound final integrity and SDK closure stay required.|
|Real recorder/prepared graph/publication and current prerequisites/evidence/records/finalization/receipt/terminal owners|Generate real temporary V3 store/recorder graph with timing-failed ready preflight and strict CHECK/parity; genuine admitPhase(compare) plus real gone probes succeeds. Same construction under V2 rejects. Recompute readiness independently; mutate any field/ref/byte/check/parent/status/cleanup/prefix/final snapshot and fail before publication/admission. In preflight-graph-v3.test.mjs, cover genuine awaited replay, bound-byte/ref mismatch, malformed/illegal PGN, missing/expired budget, expiry between metadata read and replay, one fixed original B across producer/prepared/post-publication/recursive paths, distinct unchanged original command contexts for ordinary readback/admission, and failure with real replay/read/FD debt still retained. Pure validator tests receive only detached replay results and verify ref/FEN/result binding. Existing pgn-evidence.test.mjs covers real replay expiry across its16-move yield using a genuine handle/fake clock; A/A schedule itself remains unchanged. Missing completion, inventory, Native/store/cleanup or pending-monitor proof never qualifies.|
|Strength reducer/finalizer/PGN stats and terminal/operator whole owners|Real strict plus ready timing-failed preflight yields eligible full40 with closure resource failed and aggregate2; own timing loss also stays eligible with failed resources. Incomplete39-game/19-pair, failed scientific parent, cap or hard fault stays ineligible. Actual compiler `scienceReady` and paired-analysis paths must pass, not only hand-made reducer facts. Preserve exact formulas, no Elo.|
|V3 terminal/W operator controls and immutable V2 controls|Ready preflight0 passes strict; ready resource-failed preflight2 is admitted only for V3 compare; arbitrary2/nonzero/missing graph/unready/wrong policy/intervened owner/inexact pins reject. preflight-terminal-v3.test.mjs and W/separate-verdicts-owner-controls-v3.mjs cover the section9 absent-root cold CHECK launch tripwire, both existing-root rejections and missing-archive initial-readback rejection, without claiming a scientific CHECK. Successor tests retain actual fresh assertPrior success, tampered prior rejection, awaited CHECK/parity/preflight order before claim/spawn, zero launches/absent claim on rejection, no verification.json overwrite, shared90s parent context and actual success/failure cleanup. Readback0/experiment2 stay separate; V2 still rejects timing-failed preflight/operational3. Old W hashes remain exact.|
|Actual Native V3 group plus all existing Native groups|One serial genuine macOS Native delayed-delivery stimulus during opened preflight scientific scope proves typed quality retention and later real current cleanup/full monitor/child/both-pipe/task closure. The same stimulus in strict V3 CHECK, bootstrap/selftest/control/cleanup scopes proves hard rejection. Include original bound/positive-cap negatives and genuine graph/publication coverage. Unsupported platform is explicit failure, never skip. These are controlled test receipts, not a browser preflight or scientific result.|

Execute the seven new TEST owners first under fresh pinned evidence, then one whole96-owner serial suite (`node --test --test-concurrency=1` with an explicit sorted96-path roster). That whole pass includes every existing affected owner and genuine Native group. Run both existing isolated Python Native suites, Python terminal identity suite, appropriate app/core/script checks and typecheck. No skip, cancellation, warning suppression, fake physical closure or guessed test-case count. Qualify the existing expected optional-observer null/undefined warnings separately. Preserve actual command exit, both raw-pipe joins, timers/lifetimes, full logs and exact source/TEST/policy/runtime hashes.

Check every changed/new SOURCE/TEST/W SOURCE line count, all import closure, explicit135 runtime membership, immutable old fixtures/operators/protected model refs, and complete final diff. If a post-GREEN code/TEST change occurs, rerun its meaningful affected gates and the final full serial gate under those exact bytes before publication.

## 11. Ordered implementation and later execution gates

1. Root selects this concrete amendment, commissions fresh independent source/design reviewers with only selected files/standards, resolves findings, then obtains Hansel's explicit reviewed-design implementation approval. Until then this file is the only proposed change. Do not invoke imports, tests, model, phase, commit or push from this drafting task.
2. Before creating/using helpers, copy the approved contracts, exact owner/shape/count map and tests into the established canonical design/implementation plan and relevant README contracts. Record reviewed source/TEST/old-operator/fixture/model pins and the exact old127 roster. Preserve the E18 result and failed workspace. No implementation or operational GO is inferred from design-direction selection.
3. Make the two necessary whole-group capacity splits with preserved public re-exports and focused characterization. Then add exact V3 selection/schema/ledger dispatch, private selftest-gated periodic scope, semantic evidence/readiness compiler, all parent/reducer/graph consumers, public CLI/Python and new V3 operators. Develop in green, reviewable changes on the current feature branch or an approved non-main branch. Commit each green change with its corresponding docs after its final diff/code-to-doc check. Preserve old semantics and fixture/operator bytes throughout.
4. Obtain fresh review of the finished implementation, exact same-byte recognition feature RED/GREEN and separately qualified FIXED timing-isolation/proof/admission evidence; complete the full serial/Native/graph/Python/app checks above. Root audits actual closure and the final source-to-contract comparison. Publish only green reviewed source after implementation approval. No runtime phase is released by unit/Native tests or a commit alone.
5. From the resulting clean published committed source, Root prepares a new exact V3 release and entirely fresh external workspace/evidence. After the applicable execution GO, run strict committed CHECK. Only its successful CLOSED graph can supply the candidate/workspace bindings for the ONE new V3 control proposed in section9. Hansel's reviewed-amendment approval must explicitly include that new three-binding control rule; do not reuse consumed V2 approval. Then apply that approved rule, obtain Root's concrete binding/pin review and separate one-use GO, execute once with original90s/1000ms qualification and actual joins, and continue strict parity13 and one fresh V3 preflight. No second Hansel approval is implied for applying already-approved exact bindings. No additional diagnostic phase, control retry or relaxed freshness is granted.
6. Independently own/read back each phase, verify current source/policy/runtime/model pins and actual closure. Root may release **one** full40 only after the new preflight satisfies section6, including a fully sealed ready graph if its resource grade is failed. No command automatically retries or starts its successor. If any hard proof fails, stop and preserve evidence for diagnosis.
7. Own the comparison through actual completion or the original hard cap, both pipes/raw/journal closure, independent genuine final graph readback and final source/model equality. Report exact strength/resource/closure/aggregate grades and statistical scope. Keep absent or failed results explicit. No posthoc reinterpretation, extra cohort, timing cure or Elo claim.

## 12. Documentation and acceptance

Each meaningful code commit updates the affected contracts in the same commit: root `README.md`, `train/README.md` for Python selection where affected, `train/scripts/README.md`, `train/scripts/browser_eval/README.md`, `train/fixtures/README.md`, the canonical verified-M software design, the established fault-repair/full-comparison implementation plan, `docs/experiments/tinyaz-software-plan.md`, `docs/experiments/tinyaz-software-status.md` and the dated prerequisite report when its factual state changes. Append versioned precedence rather than rewriting approved V1/V2 requirements. Keep historical author-time/result statements and all old evidence truthful.

The final code-to-document check must compare exact policy/protocol/record/envelope shapes, mode transitions, allowed causes, unchanged hard limits/proofs, awaited collector/replay and original verification-budget propagation, pure detached facts, async prior admission before claim/spawn, side-effect-free W dependency direction, operational release3/eight-script hashes, artifact paths,135 runtime/96 TEST rosters, commands, actual side effects, closure/reducer statuses and measured execution states. Check final diff rather than timestamps. An unresolved mismatch blocks completion and must be reported. If a mapped documentation owner needs no change, state the concrete reason.

## 13. Root decisions before fresh review

Root selected these four directions for independent review in `root-draft-decisions.md`. Selection is not Hansel's implementation approval:

1. Exact V3 policy/protocol identity, sharing record layout2 through the closed policy discriminator and adding only the V3 scientific-readiness field.
2. Ready scientific preflight with literal failed resource/closure grades and aggregate inconclusive/2, including honest inherited closure failure in an otherwise strength-eligible full40.
3. The explicit resource-guarantee tradeoff above, while every measured cap and all current Native/end/graph/physical proofs stay hard.
4. The private genuine-selftest-gated preflight scope and exact preflight2 parent rule, with the declared135-runtime/96-TEST owner map.

The draft2 Root decisions and round1 graph/operator fixes remain unchanged. Fix round2 resolves only cold CHECK's absent-archive startup: synchronous released-current validation admits launch; all post-CHECK readbacks and successor rechecks keep their full archived barriers/guards. No policy, Native, numeric cap, replay/budget, resource tradeoff or135/96 contract changes. One scoped readiness re-review must verdict this finding and new breakage in the tiny fix diff only. No implementation feasibility/test success is claimed. Hansel's implementation approval and later execution releases remain pending.

## 14. Selected reading list for independent review

Review this revised target with `E19/root-draft-decisions.md` and `E19/design-direction.json`. Draft1 is historical evidence only. Read E18 `preflight-failure-diagnosis.md`, `preflight-failure-review.md`, `root-check-audit.json`, `root-control-audit.json`, `root-parity-audit.json`, `root-preflight-failure-audit.json`, and `scan-integrity-coverage-control.mjs`. For the control baseline, also read `W/separate-verdicts-implementation-evidence/507bc314-6904-4be0-bbef-f3a33c1e94fe/control-binding-proposed-correction.md` (original algorithm hash, not new execution authority).

Current contracts/data: `README.md` (Local browser verification commands; Accepted separate-verdicts direction; current Task17/result pointer); `train/README.md` (Browser reference verification); `train/scripts/README.md` (Browser evaluation PGNs and match control); `train/scripts/browser_eval/README.md` (Accepted separate-verdicts v2 declarations, Current Task5 ledger API, Task7 monitor/policy APIs, Task8 Recorder/graph APIs, Task9 selection APIs, V2 preparation operator APIs, Task17 serial verification); `docs/experiments/2026-11-11-tinyaz-serial-verification-prerequisites.md`; `train/fixtures/browser-protocol.json`; `train/fixtures/browser-protocol-v2.json`; `train/fixtures/browser-openings.json`; `train/fixtures/browser-parity.json`; `package.json`. Do not infer new approval from historical implementation checkpoints.

The exact selected existing SOURCE set below has prefix `train/scripts/browser_eval/`; read the relevant named functions/whole short owner as needed. The new future owners in section8 do not yet exist and are contracts in this target, not files a reviewer should import.

```text
evaluation-policy.mjs
schema-constants.mjs
schema-primitives.mjs
identity-schema.mjs
record-fields.mjs
record-schema.mjs
record-schema-v2.mjs
resource-quality.mjs
processes.mjs
process-accounting.mjs
process-observation.mjs
process-runtime.mjs
process-runtime-start.mjs
process-stop.mjs
watchdog-verdict-policy.mjs
watchdog-resource-policy.mjs
watchdog-config.mjs
watchdog-selftest-operation.mjs
watchdog-operations.mjs
watchdog-cleanup.mjs
watchdog-cleanup-context.mjs
watchdog-runtime.mjs
watchdog.mjs
watchdog-admission.mjs
record-inputs.mjs
record-evidence.mjs
records.mjs
record-finalizer.mjs
record-finalization.mjs
record-finalization-v2.mjs
artifact-completion.mjs
completion-publication.mjs
verdicts-v2.mjs
prerequisites.mjs
receipt-files.mjs
receipt-verification.mjs
receipt-verification-v2.mjs
receipt-verdicts-v2.mjs
snapshots.mjs
snapshot-files.mjs
snapshot-identity.mjs
snapshot-reopen.mjs
run.mjs
run-driver.mjs
run-supervisor.mjs
supervisor-protocol.mjs
driver-bridge.mjs
driver-bridge-wire.mjs
driver-bridge-methods.mjs
driver-protocol.mjs
phase-runners.mjs
phase-fixtures.mjs
page-arm.mjs
match-observations.mjs
pgn-evidence.mjs
pgn-summary.mjs
pgn-format.mjs
stats.mjs
watchdog-shutdown.mjs
cli.mjs
```

Additional exact entry/operator sources: `train/scripts/check_browser_parity.py`, `W/separate-verdicts-owned-command-v2.mjs`, `W/separate-verdicts-verify-phase-v2.mjs`, `W/separate-verdicts-owner-controls-v2.mjs`, `W/separate-verdicts-release-v2.template.json`. Selected existing TEST/support contracts (same browser_eval prefix): `native-fixture-admission.mjs`, `separate-verdicts-monitor.test.mjs`, `separate-verdicts-native.test.mjs`, `separate-verdicts-compat.test.mjs`, `separate-verdicts-records.test.mjs`, `separate-verdicts-terminal.test.mjs`, `prerequisites-evidence.test.mjs`, `prerequisites.test.mjs`, `snapshots.test.mjs`, `private-fs-phase.test.mjs`, `phase-runners.test.mjs`, `resource-quality.test.mjs`, `pgn-evidence.test.mjs`. For this fix round, read E19's two accepted review reports, preserved draft2 and the fix diff; source focus is pgn-format.mjs:replayCheckpointPgn, process-budget.mjs, receipt-files.mjs, record-finalizer.mjs, receipt-verification.mjs, receipt-verification-v2.mjs, artifact-completion.mjs, completion-publication.mjs and the two old W command/verifier modules. These are selected read-only review inputs, not permission to run tests, imports or phases.

## Task20 versioned implementation checkpoint

The connected V3 implementation and exact135/96 rosters are authored with
Root private-validation ruling E20/task20-private-validation-ruling.md.
The harness README records current APIs, scope/error/ownership/budget and
operator side effects. Functional sections1..14 above retain approved authority.
All Root same-byte tests, Native controls and independent source reviews remain
pending. No test pass, green commit, publication, fresh CHECK or phase GO is
claimed by this implementation checkpoint.


## Task20 reviewed implementation checkpoint2 (requirements unchanged)

Root's exact private map v2 and production GO authorize existing-contract
repairs for original handle association, event/prepared per-effect propagation,
scope original IO/budget, schema2 non-null policy and real Python main V3
selection. The authored implementation keeps changed inputs77/runtime135/
TEST96, original numeric limits, proof ownership and canonical sections1–14.
Required real close and failed-publication containment stay independent from
positive admission guards. Root causal GREEN/full verification are pending;
worker ran no runtime or tests. This checkpoint grants no scientific phase GO.


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


### Task20 final collector handoff repair. Source ready, rerun pending

Root's actual terminal causal RED passed5/6 and failed the one intended handoff
regression, natural exit1 in11.776329000 seconds,657 exact pins, no skips,
cancellations or intervention, and complete raw/owner closure. Both actual
scenarios used substituted genuine B: expiry-at-handoff admitted114 metadata,
23 opens,46 reads and2 replays after A expiry; held metadata admitted113/23/46/2.
Both owners genuinely settled. This establishes the residual without a setup
fault. Earlier1139/1139 and other green gates remain dated history.

The minimum receipt-verification-v2 repair now revalidates original association,
genuine handle methods and actual cutoff immediately after events await, before
collector handoff and after the awaited collector. The collector receives the
handle returned by that guard, never a raw mutable-field projection. Its same
one-carrier, original IO and real close/debt behavior remain unchanged. V1/V2
omitted-context routes keep their existing behavior. Runtime135/TEST96 and
changed inputs78 remain exact; the causal TEST bytes are unchanged.

Current repair GREEN, final full96/Python/app/typecheck, fresh scoped review,
Root acceptance, commit/publication and Task21 remain pending. All V3 scientific
phases remain UNRUN. No phase GO, cure, continuous coverage or Elo claim follows.
Worker ran no runtime or tests. Required semantics are unchanged; this repairs
implementation to the original approved handle contract.


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


## Task22 approved receipt-sealing correction (2026-11-11)

Hansel approved proposal SHA256
`3fc18bacefe9fbe59ba36ace283c64a2c091d2a1ac778d01fd229d292f819f29`
and the binding import clarification in E21/sealing-review-summary.md.
This dated acceptance supersedes only V3's producer C-across-A/B clock rule
and its corresponding API/map wording. All other V3 requirements remain.
Task20 is complete and published at `ccd839011b9deb831ffe9c79325879f00041857f`.
Task21's fresh CHECK passed and its diagnostic control qualified, but parity
failed receipt finalization. Its unsealed13/13 numerical checks, resource
and cleanup facts do not constitute an authoritative parity graph. No
preflight or comparison launched. Failed evidence remains immutable.

Stage A contracts and causal TEST/support preceded production edits. Root
accepted actual RED2:60 tests,50 passed,10 intended failures,0 skip/cancel,
natural exit1 in40.792294208s with649 exact pins and actual command/BOTH raw/
journal closure, without intervention. Both actual preparation controls passed.
All required local gates now passed on the frozen14 SOURCE/TEST paths.
Root full96 passed1162/1162, natural exit0 in223.116871292s,0 skip/cancel,
660 exact execution pins and actual process/BOTH raw/journal closure without
intervention. Causal60 and focused fixture4 are subsets, not added counts.
Python58/19/8, scripts191/core184 and typecheck0 passed with649 exact pins and
actual closure. Two deliberate null/undefined BookkeepingObserverWarnings
remain expected and unsuppressed. Worker imports/tests are UNRUN. Final scope23
is7 SOURCE,7 TEST/support and9 DOC paths, including the separately declared
existing fixture-transform TEST ownership repair. Runtime135/TEST96, weights,
baseline/statistics and original limits stay unchanged. Fresh Sol Max review,
Root acceptance/commit/publication and scientific successors remain pending.

A's science, identity, Native and cleanup proofs retain original P/C. Late
facts remain unproven. Real fence, other-body drain and writer/FD closes must
settle before a usable private closed bundle admits B. Then sealClosedEvidence()
captures one trusted nonnegative safe-integer B_start and one genuine frozen
`{budget}` context. Top-level B_end=B_start+90000ms; nested watchdog-selftest
uses min(B_start+90000ms,receiptCeilingMonoMs), the exact original parent end.
Throwing/invalid/overflowed construction fails closed. No retry refreshes B.
The same owner/IO registrar and every existing proof/read/replay guard remain.

B gates each whole existing Store transaction immediately before enqueue,
after pure argument encoding, without an intervening await. Its queue wait
and existing context-free preparation/creation/write/accounting may settle
after B_end under actual ownership and unchanged caps. No new proof or
transaction starts after expiry. Adopt the genuine returned prepared capability
before the next fallible guard inside its containment try/catch. Same-capability
containment preserves the first arbitrary error and real FD/body settlement.

The last fallible eligibility check is inside artifact-completion, after
publication/accounting/fresh canonical verification and immediately before the
synchronous claims-clear/seal/immutable/mark-sealed/resolve-safe batch. The
unchanged artifact-files checkVerification body is exported as
assertVerificationContext through the existing ArtifactCompletion to
ArtifactFiles edge. No fallible post-result finalizer deadline guard can
replace the genuine immutable Store result. Receipt reporting adds the direct
record-finalizer to watchdog-lifetime edge among existing135 modules.

Private bindRuntime retains lifetime/clock/optional observer and adds
receiptCeilingMonoMs (null top-level; required exact original parent end nested).
closeEvidenceBeforeCutoff(request,{deadlineMonoMs:C}) retains only A's bound.
sealClosedEvidence() accepts no replacement context. Raw Store/preparation/
accounting signatures and read-only/parent admission contexts remain unchanged.
Parent post-return deadline/abort/probe/ACK/scope checks remain hard.

reportReceiptBookkeeping(owner,scope,classification,atMonoMs,deadlineMonoMs,cause)
in existing watchdog-lifetime emits bounded records.receipt entered/fulfilled/
rejected markers. B_start/end are authoritative; final settlement sampling and
reporting are best effort. The shared emitMarker passively observes native
Promise sink rejections with Promise.prototype.then.call and fulfilling handlers.
Throwing, rejecting or pending diagnostics add no required debt or status
control. Keep the existing optional five-field bookkeeping observer unchanged.
Report A/C, actual B boundaries and total outer elapsed separately; missing
samples stay unknown. No extra resource coverage or scientific proof is created.

Original receipt-correction scope was7 SOURCE,6 TEST/support and9 DOC paths.
Root's routine fixture-transform before-use ruling adds one existing TEST path:
final23 paths are7 SOURCE,7 TEST/support and9 DOC. No new runtime/helper path,
queue, timer owner or four-split/runtime139 alternative is adopted.
The six TEST/support owners cover distinct A/readback bounds, C-crossing B,
late-A negatives, fixed-B expiry, preseal/postseal races, held real preparation,
same-capability containment/FD closure, nested parent ceiling and passive sinks.
Preserve all existing ownership/context assertions and readable source/TEST<400.

After Root causal GREEN, covering/full96, Python58/19/8, app scripts/core and
typecheck, fresh scoped Sol Max review and final code-to-document acceptance,
Root separately releases green commit/publication, fresh CHECK, ONE replacement
control, strict parity, preflight and ONE40-game comparison. Bind the replacement
control only to the new published candidate's successful CLOSED CHECK. Model
weights, baseline/statistics,64 visits/20pairs/40games and original experiment,
Native, cleanup, output and memory limits remain unchanged. No old run is rescued.
Evidence: E22/implementation-approval.json and task22-report.md, where E22 is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/00cb72f4-cff2-412d-9c9c-e6f3ce8e4b59`.

Stage B evidence: E22/root-task22-causal-red-acceptance.json,
E22/task22-source-ready-report.md and task22-source-ready-pins.json. The actual
source now retains C only for A, captures B once after the real closed bundle,
and gates final write/prepare/publish admission without changing raw APIs.
Prepared capability adoption precedes the guarded verification/containment
region. Store's final association guard precedes the no-await immutable seal;
no finalizer post-publish guard reclassifies its result. Receipt settlement
markers follow actual lifecycle continuation settlement and are best effort.
Shared diagnostic native Promise rejection is passively observed without debt.
The Stage B source-ready comparison is historical; the measured final code-to-
doc comparison is in task22-implementation-review-ready-report.md. Local GREEN
does not establish review acceptance, publication or scientific passage.

Current evidence: E22/root-task22-all-required-checks-summary.json,
root-task22-causal-green-acceptance.json, root-task22-fixture-focused-acceptance.json
and task22-implementation-review-ready-report.md. The earlier full96
1161pass/1 teardown failure and RED1's two loader setup failures remain dated
immutable history; neither was reclassified as passing. No Task22 scientific
CHECK/control/parity/preflight/comparison, commit/publication or Elo result is
claimed. Root owns fresh review and every subsequent release gate.

### Validated TEST-only Vite completion boundary

Existing fixture-transform.test.mjs is the sole additional TEST path, declared
before use in E22/root-task22-fixture-transform-before-use-go.json. Its197-line
owner preserves the four original test names/bodies/assertions byte-exact.
Local drainOptimizer retains genuine discovered/optimized processing promises
before metadata replacement, joins issued scan and actual waitForRequestsIdle
while Vite is open, and drains newly issued actual batches to a stable set.
Only then does teardown close every server and join all original Git child
exit/BOTH pipe receipts despite any other drain/close rejection. Original or
aggregate failures propagate and preserve the root. One original fs.rm runs
only after successful joins, with unchanged options and no sleep/retry/error mask.
Vite8.2.2/Rolldown1.2.5 public batch receipts cover actual admitted bundle write/
close/commit settlement. They do not prove arbitrary global IO or Vite's separate
detached old-cache fsp.rm completed. No plugin/package/noDiscovery/include/entries,
operational production binding or scientific/Native limit changed.
Root's focused owner passed4/4, then the fresh full96 passed1162/1162 on exact
frozen14 code/TEST bytes. The original failed temp and source-ready/raw evidence
remain unchanged. Docs-only final status follows these measured gates; no new
runtime execution or scientific result follows from this documentation update.


## Task24 shared-monitor association repair (2026-11-11)

Task22 was reviewed, committed and published as `ad419e90f0761639677be21f01a80ab5806b5f17`.
Fresh Task23 strict CHECK passed all8 in190.415634s. The ONE replacement
control qualified in42.812403s with61 scans. Strict parity passed13 cases/all5
checks in56.408613s with genuine sealed completion and no resource gaps.
Fresh preflight failed in55.304011s (experiment2/readback1/operator1), with no
parent completion and0 comparison cohorts. Old evidence remains immutable.

The nested facade incorrectly required raw shared-monitor resource IDs to
match its own subrun. Actual raw observations remain parent-owned; the later
strict prefix alone has nested runId/parent monitorRunId. This is an approved
shared-prefix implementation bug, not a policy change. Root causal RED ran13
existing-owner tests:8 passed,5 intended assertion failures,0 skip/cancel,
natural exit1 with658 exact pins and actual process/BOTH raw/journal closure.
The same two TEST/support hashes remain fixed. Root reran the same13 causal
tests GREEN13/13 (natural exit0,1.067095542s), then full96 GREEN1172/1172
(natural exit0,225.858033375s). The13 are a subset of1172. All gates preserved
664 exact before/after/current pins, actual process/BOTH raw/journal closure,
zero skip/cancel and no intervention. Python58/19/8, app scripts191/core184
and typecheck passed serially on the same664 pins. The two deliberate null
and undefined bookkeeping-observer warnings remain expected and unsuppressed.
Fresh native independent SolMax review returned specPASS/qualityPASS with no
findings. It inspected causal raw/receipts/journals and the full-gate summary;
it did not inspect every full-gate raw file. Root final code-to-doc acceptance,
green commit, publication and fresh prerequisite verification remain pending.
The already approved ONE40-game comparison remains unconsumed (0 cohorts);
Root phase GO is still pending.

The facade captures the expected monitor ID from the original validated private
context, forwards it to both admission/finish and polling checks, and keeps
policy/phase/run association exact. Nested selftest stays strict. V1/V2,
runtime135/TEST96, model, original limits, IPC and prefix/cleanup proofs remain.
The secondary parent heartbeat-after-stop followed failed selftest admission;
no independent initiating IPC defect is established and no IPC change is made.
The ONE replacement diagnostic control allowance is exhausted. Only renewal
for ONE further diagnostic control requires user confirmation. The original
ONE40-game comparison authorization remains valid after fresh prerequisites;
Root has not issued phase GO. No failed-run rescue is authorized.
Evidence: E24/root-task24-all-required-checks-summary.json,
task24-sol-max-source-review.md and root-task24-causal-red-acceptance.json,
where E24 is `.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/80f6cd8d-9745-44ca-b237-e2a8955acebe`.
Task23 actual phase/owner evidence remains in E23
`c5827fc8-64ae-428c-bd58-a29186e35e79`. Worker imports/tests are UNRUN.

The private frozen watchdog config adds resourceMonitorRunId. Top-level uses
its original runId. V3 nested capture requires the exact original context.monitor
reference, nonempty parentRunId, exact configured subrunRunId and
`${parentRunId}:watchdog-selftest`, owner.phase=preflight, matching owner.runId
and owner/parent supervisor tuples. Existing genuine monitor/store lifetime,
parent scope, AbortSignal and inherited deadline validation remain unchanged.
It captures the original parent ID before use; no q value or string stripping
selects authority. Facade and runtime polling pass that scalar through the
existing resource-check runId argument. The resource checker requires both raw
q IDs to match it, the selected policy and exact monitor phase (preflight for
nested, own phase top-level). Actual record/protocol/scope runId stays nested.
No new public argument, monitor, helper, ledger, prefix format or periodic
softening is added. Raw parent state is never rebound/mutated by nested reads.

The genuine shared-monitor/facade regression localizes pre-heartbeat admission;
it is not a full actual Native heartbeat/cleanup proof. Existing full V1/V2
heartbeat and strict prefix controls remain unchanged for covering/full96.
Current path scope is4 SOURCE,2 existing TEST/support and5 DOC, all changed
code/TEST owners below400 lines. This final docs-only pass records measured
gates and independent review while preserving all six tested code/TEST hashes.
Root final code-to-DOC acceptance precedes green commit and publication.
Fresh prerequisites and Root phase GO precede the already approved, unconsumed
ONE40-game comparison; diagnostic control renewal requires user confirmation.
