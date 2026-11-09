# Tinyaz fault repair and full comparison

## Authorization and objective

Hansel requested on 2026-11-06: fix the unexpected faults and post-cap exit issue using Sol High, then rerun all 40 comparison games with enough time to finish. Keep the model weights unchanged. This authorizes one new full cohort after repairs and a larger time ceiling. It does not authorize training or candidate tuning against observed scores.

## Global Constraints

- Work in `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai` on `feat/tinyaz-browser-harness`, never main. Initial HEAD is `a74c988ec9688f1b6880443b34d4c7a06831590b`.
- GPT 6.1 Sol High writes implementation. The controller orchestrates and reviews. Do not delegate from an implementer.
- Keep every edited source and test file below 400 readable physical lines. Declare any new owner in the established map/contracts before creation. Preserve the historical Section-3 `070fbf0ee5cedb57cd1baaa7cdefed806f3b283b34e707898aac246f2757486c` slice.
- Keep all model weights and protected model metadata unchanged. M is 9,706,840 bytes, SHA256 `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`. Baseline remains `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec` with only the established same-M URL-body normalization.
- Preserve chess behavior, 64 actual visits, the locked openings/color schedule, 20 pairs/40 games, original statistical method, numeric tolerances, CPU Float32 parity, and all accounting/identity/cleanup proof requirements.
- Keep readiness 30 seconds, each command 90 seconds, Native cleanup 5 seconds, heartbeat/sample intervals and gap guards, RSS 4 GiB, and the existing output cap unless actual resource evidence shows a separate run-budget amendment is necessary. Any such amendment must be recorded before launch, not after a failure.
- Preserve old sealed workspaces and receipts. The prior cohort remains inconclusive, with five complete games, two pairs, raw 2W/2D/1L, `PHASE_TIMEOUT`, final unplannedFaultCount 2, and persisted `IPC_DISCONNECT`. Do not retroactively clear its faults.
- Never hide a leak using process.exit, blanket unref, suppressed callback errors, fabricated proof, late positive facts, or changed fault counting. Required actual operations, callbacks, process exit, and both pipe closes must join.
- Update affected READMEs/contracts and design/status notes with meaningful code changes. Before each green commit inspect the final code-to-doc diff. Commit green changes separately.
- Notify the controller before real Native tests or actual phases. During them only their owner polls; other local process activity stays idle. Never consume another agent's exec sessions.
- A new comparison needs fresh committed check, 13-case parity, and preflight receipts bound to its candidate, workspace, identities and inputs. No partial-cohort inference or repeated score-driven tuning.

## Task 1: Repair unexpected faults and post-cap exit

Read the current root README and relevant browser-evaluation README contracts, then trace the recorded faults and full CLI shutdown path. Preserve the old result; distinguish the timeout, the persisted disconnect event, and the counter of two unplanned faults.

Evidence starts at `/tmp/tinyaz-c4a2-sol-review/c4b-committed-comparison-1/main-final-result-handoff-v2.json` and its referenced immutable workspace, final/events/markers, stage receipts, and intervention evidence. Prior `/tmp/tinyaz-c4a2-sol-review/sol-high-postcap-exit-control/receipt.json` is a selected transport-boundary nonreproduction, not full CLI cap-status2 natural-exit proof.

Identify the actual causes with bounded controls that exercise full supervisor/CLI finalization and real Node process/pipe/owner closure. Tests may use controlled Native/browser collaborators and shortened test clocks; never count them as actual phases or launch another scoring cohort. Capture active resources/handles and creation provenance in a diagnostic child before termination if needed. Compare normal finish, planned timeout, and genuine unexpected-disconnect/error paths. Send the first concrete reproduction or exact blocker promptly, rather than doing an open-ended source scan.

Create causal failing regressions before production edits, then repair only demonstrated causes. Planned timeout must remain an inconclusive exit2 while naturally closing its command; real unexpected IPC failures must remain faults. Do not simply reduce fault counts to zero or force exit. Prove first-cause retention, no abandoned sends/IO, exact sealed evidence stability, actual child exit and BOTH pipes, and owner settlement.

Run the relevant whole test owners and appropriate full app/harness checks on frozen bytes. Read all current diff and affected documentation, commit the green repair, and report exact tests/receipts, code paths changed, and any unresolved finding. No push or real phase until controller review.

## Task 2: Bind an adequate second-cohort budget

Inspect observed per-game durations/plies and actual retained output/accounting from the prior run without using scores to tune candidate behavior. Select a finite comparison ceiling with enough margin for all 40 games. Record the user-authorized second-cohort/time amendment in the established experiment/design/usage contracts, preserving prior results and the historical protected slice.

Selected ceiling: **24 hours, 86,400,000 ms**. The prior run completed five games per hour; 40 at that observed pace projects about eight hours. Its longest completed game was 117 plies; 40 games of that length at the measured approximately 11.7-second command median would take about 15.2 hours before other overhead. A 24-hour ceiling provides margin without modifying visits or game rules. These are projections, not guarantees or strength claims.

Read-only retained allocation was 33,244,184 bytes, including 3,999,840 bytes in the prior one-hour comparison directory. This initial count omitted the 320-byte root entry. The corrected inclusive retained allocation is 33,244,504 bytes, not a historical peak. Linear persistent-growth projection does not show a known conflict with the existing 256 MiB cap, so keep that cap and its accounting/reserve unchanged. Actual accounting remains authoritative and any breach remains inconclusive.

Implement the comparison ceiling consistently in constants, schemas, CLI/manifest/prerequisite/snapshot bindings and tests. Preserve all shorter watchdogs and actual 5-second cleanup. Investigate output-growth feasibility before launch; do not silently keep a cap known to preclude the full cohort or weaken accounting. Record every amendment and its evidence before starting.

For the multi-hour run, emit a bounded count-only progress line after each supervisor-validated completed game. It must follow the actual PGN/checkpoint acknowledgement, never report a partial or late frozen checkpoint as complete, contain completed-game/pair counts without outcomes, add no timer or awaited IO, and have no proof/status/selection authority. Keep at most 40 lines, at most 256 UTF-8 bytes per line. A diagnostic sink failure cannot change evidence or failure behavior. Preserve the existing PgnEvidence/Recorder authority and use the smallest operational wiring needed. The controller's existing owned stream will consume this metadata; it is provisional progress, not a passed result.

Run changed-area tests, full required checks, and final code-to-doc comparison. Commit and publish the green candidate, verify authoritative origin and clean checkout, then freeze source and model identities.

## Task 3: Execute and verify all 40 games

### Approved failure-only collector containment amendment, 2026-11-07

Hansel explicitly approved the reviewed proposal
`e079b8a9d2237db1915391ee59e4357b1adc2c12f701c8fa8936f02f1ba894ec`.
Sol High implements it before another candidate release. The latest7ecb853
restored-browser attempt stopped at7/40games and3/20pairs, with no canonical
final/completion. Its actual command/pipes closed only after guarded Inspector
capture and supervisor TERM. Preserve its1091-file freeze and intervention
qualification. The causal whole-owner RED proves exhausted cleanup skips the
collector stop; it does not prove the historical stale-sample latency.

Keep the original outer end C=min(cleanupStart+5000,inherited end), TERM+2000
and KILL+4000. For phase-workload derive P=min(C,max(cleanupStart,C-500)),
using existing sampleGapMs500. All fresh proof actions and the prestarted
live-evidence verifier's actual effect authority use P, with late-continuation
checks after awaits. Actual promises remain enrolled. Nested selftest-workload
retains its parent-collector behavior. The usual successful post-KILL proof
interval becomes500ms; an inherited window<=500ms immediately fails proof.

On failed proof, permit wire-only collector shutdown/EOF before C even if
required workload proof is unsettled. This is failure containment only:
CLEANUP_UNPROVEN/ineligibility and every actual workload/helper/driver/SDK/file
debt remain. No action starts at/after C, no early TERM/KILL, no added grace.
Normal proof keeps every original ordering prerequisite. The stop API accepts
validated failureContainment:true locally, with one cached flow and a monotonic
failure latch that also upgrades a pending normal stop. Validate before effects,
min-narrow the original handle, never repeat teardown or restore eligibility.
Already-settled calls join unchanged without new IO or retroactive result edits.

Independent implementation review found one integration gap: a periodic sample
admitted before normal stop can leave the monitor's actual ordinary drain pending
until C, so the caller never reaches failure upgrade at P. Bind that prerequisite's
decision to the captured P within the SAME cached flow and original stop handle.
If actual ordinary drain remains unproven at P, latch failure and initiate the
once-only teardown before C. Actual drain/physical receipts remain enrolled.
If ordinary drain already settled and normal teardown started, allow its physical
reap through C; do not downgrade merely because the whole stop promise is pending
at P. Private validated P plumbing is implementation of the accepted proof fence,
not another clock or wider stop window. Test the real cleanup/periodic-queue route,
both mode orders and actual delayed normal collector reap beyond P but before C.

### Concrete three-port listener-proof repair

The freshly committed cf1 check naturally closed inconclusive2 with one cleanup
fault. All11 application assertions and7 other required checks passed. Listener
proof entered at cleanup+4180ms, leaving320ms before P. Preserve its360-file
freeze and unverified cleanup; only the persisted supervisor tuple was later
proven gone, not global workload absence. No comparison was launched.

A bounded actual Native control reproduced LSOF_UNAVAILABLE settle with three
genuinely registered then closed ports. Serial port1 settled131.378ms, port2
248.738ms, and port3's exit/BOTHpipes arrived357.232ms, after320ms. All7actors
actually closed. This supports a port-query critical-path repair, not a host-load
attribution or any historical-latency claim.

Preserve Current81's mandatory sequential PER-LIVE-PID queries. The canonical
per-port rule requires every separate registered-port proof, not physical serial
execution. Under the SAME captured P/borrowed handle/genuine registrar and scope,
run independent port-query bodies with at most THREE active at once, matching
the actual two Vite ports plus Chromium RPC case without unbounded spawning.
Keep every individual gated helper registration, fixed argv/exec transition,
strict parsing/exit semantics, exact exec-slot consumption, physical exit/BOTH
pipes and final fresh-holder/declared-port/loopback/unexpected checks. No port
batching/skips/data reuse/new clock/deadline/queue or proof authority. Preserve
deterministic result association and every issued body's actual ownership.
On error/expiry, do not issue further effects; never fabricate completion or
discard pending helpers. If a shared existing slot is not concurrency-safe,
surface the exact dependency before weakening it.

Independent review reproduced a resumed-registration cancellation gap: the
bounded wait may fulfill while live, then a sibling expires the listener handle
before the gate's later continuation. Recheck the SAME borrowed handle after
registration resumes, before authorization/slot consumption and at fd3 exec-frame
issuance. Preserve mandatory empty gate close and all physical receipts. Add the
genuine queue/validator/handle regression for this fulfilled-wait gap; the older
unresolved-registration case alone is insufficient. No authority/timing change.

Sol High writes a causal regression, bounded port-only implementation and
negative expiry/failure/ownership checks, with docs and any necessary declared
whole-block capacity split before creation. Prove the same actual three-port
control succeeds within320ms with all helpers really closed. Run affected whole
owners, required full serial/Native and current short CLI cap on frozen bytes;
carry unrelated checks only with exact input equality. Inspect code-to-doc diff
and commit green for a fresh scoped source review. No scoring phase or new
check retry before reviewed publication and another Root release. M, all
scientific settings, P/C, sample gaps and other limits stay unchanged.

Add bounded first-fault decision-now/sample-start/age/class diagnostics through
the existing shared fault/lifetime owner, including periodic resource failures.
Keep1000ms freshness and full-tree/start coverage unchanged; age is not scan
duration and the diagnostic is not a latency fix. Record the accepted exception
outside the protected Section3 block and update affected READMEs/contracts,
status and usage docs in the same green change. Prove causal RED-to-green,
P/C and2s/4s ordering, mode upgrades/validation, held/failed/late actual debts,
withheld pipes and no fresh verifier effects after P/C. Run required affected
and full serial/Native/app checks with actual process/BOTHpipe closure, inspect
the final code-to-doc diff and commit green for independent review. Preserve M,
all old evidence and all scientific settings. Only then publish and obtain a
new Root release with fresh check/parity/preflight for one new full40 attempt.

### Incomplete 6ff0128 attempt and runtime qualification

Candidate `6ff0128b1ccff3f807098f883d915d743c93ef53` reached 30/40
acknowledged completed games and 15/20 pairs before shutdown hung. It was
contained by one supervisor TERM after 39,588.493 seconds. The command and
both pipes closed after intervention; the known supervisor/collector tuples
are gone and inspector listener absent. `final.json` and `completion.json`
are absent. This is an incomplete, intervention-qualified attempt, not a
sealed inconclusive/2 result or valid final receipt graph. No analysis is
eligible. Its actual same-process async filesystem stall remains UNKNOWN.

The official isolated Node 24.22.2 LTS distribution is qualified as a
same-major environment workaround. It is not a causal repair of the old
runtime stall. Fresh same-root real promise/callback lstat and the frozen
footprint scan naturally closed. On unchanged `6ff0128` source, app tests
191+184, typecheck, Python 58+19 and the serial 719-case harness passed.
All 14 Native actors had actual exit, BOTH pipe closes and settlement.
The short archived full-CLI normal/cap controls passed with natural exit 0/2,
including genuine-fault cases; they do not establish multi-hour closure.
No runtime enforcement, dependency install or algorithm change was added.

Keep the 3,581-file incomplete freeze and all prior evidence immutable.
Document the checksum-verified official archive, binary identity, isolated
Node-home and explicit PATH/Node usage in existing contracts. Source remains
unchanged; there is no version enforcement or causal-fix claim. Compare the
final docs against actual qualification/commands, commit this green docs-only
change, and obtain scoped source/documentation review before publication.
Review/publication, fresh preparation with the actual runtime CommonIdentity,
and fresh committed check, 13-case parity and preflight must precede ONE new
full 40-game attempt under a separate Root release. Model M, 24-hour phase
ceiling, all shorter limits, 64 visits, openings, schedule, tolerances and
statistical method remain unchanged. No score-based selection or automatic
retry. Earlier sealed cohorts and this incomplete evidence stay immutable.

### Concrete 17d2ff8 failure and source repair

The committed attempt naturally exited 2 after 5172.471 seconds at 6/40
complete games, 3/20 pairs and `p04-g1` incomplete at 115 total plies.
Preserve its inconclusive IPC_INVALID result, three faults and invalid
Native cleanup/accounting. The later 36-known-tuple gone/reused probe does
not repair sealed cleanup; unknown actors and PID 37355's exact historical
cause remain unknown. Freeze the 486 compare files and all handoff refs.

Sol High repairs the causal Native-fault/valid-heartbeat poisoning path and
adds one whole readable-census revalidation after a first discover BSD
permission denial. Keep all vector/UID/owned tuple/RSS and first-start timing
requirements, persistent-denial fatality, actual shutdown debts and fault
visibility. Update affected READMEs, accepted contract addendum and result
status with the code; run focused and full checks, inspect the final
code-to-doc diff and commit green for independent source review.

Source review of `92eec4b` identified the separate exit-first callback gap:
check the retained Native fault before recording/latching DRIVER_EXIT too.
A causal whole Watchdog/monitor/Recorder regression must retain the Native
primary plus the genuine exit fault, actual exit, BOTH pipes and lifetime
settlement. Run affected whole owners and the full serial harness on the
corrected frozen bytes, update contract/report, and commit green for scoped
source re-review. The AST diagnostic fixture records both permitted Native
probe and later descriptive-read state, then asserts order outside production
catch blocks. Census and heartbeat admission rules remain unchanged.

After review/publication, use fresh committed check, 13-case parity and
preflight in a new workspace. Root supplies a separate release for a fresh
source-repaired full 40-game attempt under the unchanged 24-hour bound.
This continues Hansel's requested fix-and-finish work; it is not a resumed
or automatic same-candidate retry. Never tune against observed scores.


Create a fresh workspace and run committed check, 13-case Python/browser parity, and preflight in order. Verify all actual required checks, closed receipts, cleanup, and prerequisite graph. Then execute the newly authorized locked cohort once under its recorded larger bound, with one game at a time and fresh contexts/roots as specified.

Follow the owned command to closure. Monitor actual completed-game progress where the existing bounded stream permits; do not change source/settings while active. On a concrete failure preserve evidence and diagnose it. A failing or partial cohort cannot pass or produce statistical/Elo conclusions.

Verify exactly 40 complete games/20 complete pairs, identity-bound legal PGNs, zero unplanned faults, actual natural command exit, Native cleanup/accounting, original-input equality and genuine receipt graph. Only then derive the preregistered analysis. Report unchanged model identity and the method's limits. Update established result/status documents and accepted open-item ledger, inspect final code-to-doc consistency, and publish the final evidence-backed result. No retraining, merge or deployment.


### Approved failed-cleanup implementation checkpoint (2026-11-07)

The accepted failure-only containment amendment is implemented and locally green. Final serial harness736/736, app191+184, typecheck and Python58+19 passed. All14 real Native actor exit/BOTHpipe receipts settled; the reviewed actual-Native short archived cap naturally exited2 with zero faults and valid cleanup/accounting. Preserve the preceding734/736 failure, repaired Vite test-owner scan/close ordering, and UNKNOWN cause of that run's fatal616.296667ms Native interval. Exact scope, TDD receipts, source/input hashes and code-to-doc/immutable audit are in `failed-cleanup-implementation-report.md` in the SDD workspace. Independent implementation review, publication and fresh committed prerequisites plus a separate Root full40 release remain OPEN. No push or scoring execution occurred; no historical latency/global-FS cause is claimed fixed.

I1 scoped correction checkpoint (2026-11-07): causal real periodic-queue RED is fixed with validated private ordinaryDeadlineMonoMs=P on the SAME stop flow/C handle, including the top-level partial-start caller. Positive collector physical reap after P remains allowed when ordinary settlement was timely; delayed-timer receipt checks prevent late prerequisite success. Whole owners85/85, final changed owner19/19, refrozen full740/740 and current-byte actual-Native short cap2 passed with actual closure. Preserve the739/740 miss and unknown original proof/accounting cause; do not attribute it to the P timer or claim scheduling repair. Full implementation report is appended in the SDD workspace. Scoped I1 re-review, publication and new prerequisite/full40 release remain pending.


### Listener-query local implementation checkpoint, 2026-11-07

Declared whole-block listener leaf and bounded THREE-port overlap are implemented
with sequential live-PID queries unchanged. Causal serial320ms RED is preserved;
the same actual Native three-port control completed in94ms, all7 actors physically
closed. Covering owners122/122, frozen full serial747/747 and actual-Native short
archived CLI cap2 passed with real exit/BOTHpipe/lifetime receipts. Full Native
14 actors physically settled, original500ms/P/C limits and4MiB unchanged. Carried
app/typecheck/Python have178 exact executed-input hashes. Protected23/Section3/M,
old cohorts and the360-file cf1 check freeze remain exact. The original sealed
failed query and historical causes stay UNKNOWN; old cleanup remains unverified.
See SDD listener-query-implementation-report.md. Independent scoped source review,
publication and a new Root release before fresh check/parity/preflight/full40
remain OPEN. No push, fresh check retry or scoring execution occurred.


Listener I1 local correction checkpoint (2026-11-07): the actual fulfilled-
registration/late-continuation RED is fixed by3 SAME-handle effect guards in
process-lsof.mjs. No slot/frame after sibling cancellation; mandatory empty
close and all physical debt remain. Whole affected owners73/73, final listener
8/8, final frozen748/748 plus14 actual Native actor joins, same three-port
118ms/320ms control and current-byte natural actual-Native CLI cap2 passed.
178 carried input refs,23 protected refs/Section3/M and all old evidence are
exact. Source/test remains below400; no new owner/API/clock/timing/settings.
Round0 report and review RED are pinned; append-only implementation report
records exact commands/closure/limits. Scoped I1 re-review, publication and new
Root release before prerequisites/cohort remain OPEN. No push or phase.


### Private filesystem backend mitigation continuation, 2026-11-07

The 0ccfc56 attempt reached13games/6pairs, then remained incomplete with an
operation timeout and required shutdown work pending. Preserve its intervention-
qualified freeze and all scientific/model/settings identities. Same-pause native
read-only evidence linked the actual observer LSTAT request to a nonempty global
work queue while all4workers were waiting. The underlying OS/native cause stays
UNKNOWN. No old process was woken or old cleanup promoted.

Implement ONE declared private-fs.mjs backend across all20 harness-private FS
default owners; functional union111, Python helpers3 unchanged. Existing callers
preregister and guard before actual immediate synchronous Node FS. One
setImmediate delivers the completed value/original throw only, preserving fair
IO turns and Promise/injected-async interfaces. Cold bounded streams keep actual
FD/close receipts, same captured read guards and physical-only close state.
Ambiguous FD errors remain unknown; never reuse that integer for another OS
close/read/write. No new clock, retry, freshness/limit waiver, runtime upgrade,
model or scientific change. Node internals/dependencies/Python remain excluded.

Preserve causal RED, cover actual Store/Recorder/retained readers plus injected
async failures, FD reuse/ambiguous stream close/fairness/late guards, then run
covering whole owners and ONE frozen full serial/Native14 gate/current-byte
actual-Native short CLI cap. Carry app/typecheck/Python solely under exact prior
executed-input equality. Finish immutable/code-to-doc audit and green local
commit for fresh independent review. No push or fresh real prerequisites/cohort
before reviewed publication and a separate Root release. Full evidence and
limits go in SDD private-fs-implementation-report.md.


Private-FS local implementation checkpoint: causal RED preserved and migration
implemented across20 defaults with one declared leaf. Frozen serial760/760,
actual Native14 physical receipts and controlled current-byte archived CLI cap2
are green. Cap fault0/verified cleanup/accounting and driver/collector exit0/
BOTHpipes are actual; controlled8s SDK/body is not multi-hour/scoring evidence.
App191+184/typecheck/Python58+19 carry only on178 exact executed-input refs.
Preserve the first ambiguous-stream state RED and286-case covering3 failures;
corrected whole owners39/39 passed. All sources/tests<400, runtime111/helpers3,
protected23/Section3/M and all old attempts exact. Full report: SDD private-fs-
implementation-report.md. Native/OS root cause stays UNKNOWN. Fresh independent
source review, publication and Root release before fresh committed check/parity/
preflight/ONE full40 remain OPEN. No push or real phase occurred.


### Bounded accounting attribution implementation, 2026-11-08

Strict3c9 sample rejection is intended; historical415.45925ms remainder unlocalized.
Declare BEFORE creation/use TEST-only native-attribution-observer.mjs,
native-attribution.test.mjs and SDD accounting-attribution-control.mjs. Add the
validated optional child observer to existing fixture construction only, after
real adoption/attach and before return, preserving frozen12 facade and SAME
physical Promise. Transparent method/emit observation preserves this/args/arbitrary
throw/original Promise/listener identity; diagnostic errors/overflow never change
actual outcomes or release debt. Restore only after actual settlement.
Run meaningful PURE held/error/ownership/bounds/overflow controls, compare direct
code/doc diff and commit locally. No actual Native/control/full suite containing
Native until fresh review and separate Root GO. Original90/60/55+5/4MiB, P/C,
2s/4s/250/500/1000 and all M/science/runtime/protected inputs remain. The standalone
one-body fresh-tree control preserves genuine Store reserve/reconcile scans and
all physical joins. No production fix/backend change/retry/full40 authorization.


Attribution local checkpoint: same-owner TEST-only child seam, diagnostic observer
and standalone entry implemented; PURE covering42/42, final14/14, syntax only0.
No actual Native/control, full Native suite, model/browser/cohort or push occurred.
Frozen12/runtime111/protected23/Section3/M/failure evidence exact, max399. Fixed
body uses full reserve/reconcile scans and genuine admitted-body drains; late
non-close effects/actual late closure cannot pass. Original monitor fault and
all caught errors remain separate. Max source review plus new exclusive Root GO
precede ONE attribution run; neither outcome authorizes a repair/full40 retry.
Exact temporal declarations, source/control hashes, actual PURE process/pipe/file
closure and direct code-to-doc audit: SDD accounting-attribution-implementation-report.md.


Attribution scoped review round1 declaration BEFORE use/creation (2026-11-08):
existing TEST-only native-attribution-observer.mjs adds pure attributionVerdict
({primary,cleanupProof,monitorFault,snapshot,diagnostics})->{exitCode,failures}.
The actual standalone control uses this shared helper: genuine negative cleanup,
final sticky monitor, fixture errors/overflow and observer failure/late/pending
facts cannot pass, even with successful cached stop. Original first fault and
all actual drains remain; this is no production proof authority.
Declare native-attribution-verdict.test.mjs BEFORE creation: PURE genuine cleanup
controller/fake clock negative result + cached stop, genuine fixture callback
failure/sticky monitor and held-rejection timing controls. Existing test cases
stay whole. Rejected/fulfilled original Promises share the same contained
settlement timestamp/sum/max logic; original Promise/rejection identity remains.
Runtime111/protected23/M/Section3/helpers/clocks/tolerances unchanged; no Native
execution/control/full suite/phase/push until scoped review and new Root GO.


Attribution review round1 implementation checkpoint: I1 shared pure verdict is
called by the actual standalone control and requires verified cleanup/accounting,
no final sticky monitor, no genuine fixture errors/overflow and clean observer
facts. Successful cached physical stop cannot turn a negative proof into pass.
All original negative facts remain recorded; the existing first-primary latch
and actual drains are unchanged. I2 has ONE contained result-settlement path for
fulfilled/rejected ORIGINAL Promises, retaining timestamp/dispatch sum/exact max
and pending crossings, with identical rejection reason/Promise identity.
Causal PURE RED reproduced4 gaps; corrected focused5/5 passed. Existing397-line
owner is unchanged; new declared verdict owner is201 lines, helper322, control359.
No real Native/control/full serial/scoring execution. Runtime111/protected23/M/
Section3/helpers/90/60/55+5/P/C/4MiB/250/500/1000 stay exact. Round1 evidence and
append-only report are under the SDD attribution implementation report. Scoped
re-review and a separate exclusive Root GO remain required before execution.


Attribution scoped setup correction I3, round2 (declared before use, 2026-11-08):
existing TEST-only native-attribution-observer.mjs exports attributionHarnessOptions
({controlUrl,runId,pythonExecutable,evidenceRoot,lifetime,observeChild})->constructor
options. Actual standalone control and PURE real-control-URL regression share
this exact option builder, with no mirrored recordRoot/helper/fixture mapping.
Normalize ONLY file-URL-derived recordRoot structurally; genuine isAbs remains
strict, with a negative trailing-slash assertion. Existing native-attribution-
verdict.test.mjs gains this whole construction/settlement case, no new owner/path.
Constructor/group clock capture remains AFTER setup. Previous actual invocation
was FAILED_SETUP/options, NOT a latency nonreproduction; all evidence remains
sealed. Runtime111/protected23/M/Section3/helpers/timing/science unchanged. No new
Native execution/control/full suite/phase/push without review and new Root GO.


Attribution I3 round2 checkpoint: the ONE actual f1b908a diagnostic was FAILED_SETUP
(native-harness options) after copying the tree, before group/Native/body stages;
not a timing nonreproduction. Its natural1/15.533674917s and physical command/
pipe/file closure remain sealed, GO consumed. Pure real-call URL configuration
regression reproduced the same genuine constructor error before the fix. Shared
actual option assembly now normalizes ONLY URL-derived recordRoot with structural
path.resolve, no filesystem resolution/contract waiver. Strict trailing-slash
rejection and constructor-after-setup clock remain. Covering20/20 +syntax-only0
pass; actual diagnostic is NOT rerun. Helper346/test249/control359, no new path/
owner; prior I1/I2 cases unchanged. Runtime111/protected23/M/Section3/helpers/
90/60/55+5/P/C/4MiB/250/500/1000 remain exact. Round2 report appended in the SDD;
scoped f1b908a..HEAD review and separate new Root GO are required before execution.
Historical415.45925ms attribution remains UNKNOWN. No push or scoring phase.


### Runtime passive accounting trace declaration BEFORE creation/use, 2026-11-08

Declare ONE private runtime accounting-trace.mjs: createAccountingTrace({nowNs})
and default accountingTrace, pure scalar storage, no clock at construction.
Frozen internal API fsBegin(op),fsReturn(id,rejected),fsDeliver(id),raw(runId),
frame(runId),wire(requestId,stage,value),cycle(existingDiagnostic,requestId),
packet(error,remainingMarkerBudget),stats(). Fixed64 FS pending slots,8 recent
one-second completion buckets with scalar immediate/delivery maxima,16 request
records,8 raw-run slots and8 failed-cycle records. Whitelisted operation/ID/
timestamp/boolean/count scalars only, no buffers/paths/FDs/promises/resources.
Eviction/unavailable/truncated/pending facts explicit; never debt/proof authority.
Clocks/data/output failures are contained, original outcomes/guards/call order
remain. No healthy log IO, new worker/timer/queue/wire/flag/recovery or authority.
Runtime union111->112; Python helpers3 and execution helpers6 unchanged.

PrivateFs records inside its EXISTING immediate syscall and one completed-result
turn for both outcomes, raw files and bounded stream operations. Transport records
actual write/backpressure/throw, raw callback, complete-frame, original validated
reply boundaries keyed original requestIds. Existing failed-cycle scalars/Ns are
copied before original throw without another validity-clock read or changed guard.
No absolute Python/Node clock subtraction, ownership or cause inferred from overlap.

Capacity move declared BEFORE use: the WHOLE existing transport onFrame group
delegates to existing process-framing.mjs createCollectorFrameHandler over SAME
pending/protocol/onInbound/onStartup/failOnce/makeError/decoder/runId references.
No new state owner/queue/validation authority. Preserve original receiver,
ready->onInbound->pending-resolution order, synchronous reentry and all late/
malformed faults. Existing framer receives runId DATA to timestamp its original
push callback without listener replacement. Runtime DAG: privateFs/transport/
framing/observation/lifetime -> accounting-trace; transport -> existing framing, no backedge.

First relevant accounting trace uses existing lifetime's phase/selftest scope
bits, no global emitted latch. Original first-cause marker is attempted FIRST
and must return successfully before trace output. Bounded selected scalar lines
use SAME64-marker x256-byte total budget, no new allowance/required IO/join.
Process-wide FS overlap, partial/window loss, missing timing and nonzero overhead
are explicit. Protected wholeSection3/model/science/timing/ownership remain exact.

Declare PURE accounting-trace.test.mjs and accounting-trace-io.test.mjs before
creation, runtime-excluded. Genuine monitor/first-fault missing-evidence RED,
transport/framer, original500/1000 guards, fulfilled/rejected delivery, capacity,
clock/output errors, pending/held ownership and independent nested-owner scope
controls precede local commit/review. No Native/full serial/cap/phase execution
until separate reviewed Root release. Prior short control was bounded green
NONREPRODUCTION only; historical415.45925ms cause remains UNKNOWN.


### Runtime accounting trace implemented, pending source review

The passive implementation is present. Runtime roster112 and both literal docs
rosters agree; helpers3/execution helpers6 stay unchanged. Genuine first-fault
RED closed1 because the timing packet was absent. Covering PURE gate184/184
closed0 with both pipes/rawfiles, including unchanged500ms/1000ms guards. One
intermediate sweep failed on unsorted new runtime membership and a legacy111
expectation; corrected roster order/count only. All evidence remains retained.

Healthy capture performs scalar bookkeeping only. Immediate spans bracket the
existing privateFs issue function, including its original guard/resource
bookkeeping, not a measured kernel syscall. Delivery stamps run inside the SAME
completed-result callback before its original resolve/reject. Raw is the stdout
push callback that completed the frame (last fragment, not kernel/first-byte
arrival); full is complete-frame entry; valid is successful validator return;
resolve precedes the original pending resolver. Synchronous replies can validate
BEFORE write returns. PythonNs is a Python-local duration only.

Output stage accounting.trace is best effort after the original accounting
cause. Up to12 selected lines use the remaining ORIGINAL64x256 budget; budget
loss, unavailable clocks and evicted data remain explicit. Only one maximum per
kind/completion-second is retained in8 buckets, so a missing overlapping maximum
cannot prove absence. Diagnostic pending is not physical debt. Ambiguous cycle
matches stay missing. Retained Store age-exceeded start/decision milliseconds
can select a Node-origin window without refreshing its1000ms validity clock.
Process-wide FS overlap and residual durations do not identify a cause; capture
has nonzero unquantified overhead. No healthy log IO or extra mandatory output.

No actual Native/full serial/cap/phase/comparison was run for this change. Source
review, serialized current-byte Native validation, publication, fresh committed
prerequisites and a separate Root execution GO remain required. Historical
415.45925ms attribution and underlying OS cause remain UNKNOWN. This change
collects evidence and does not repair or qualify any old attempt. Report and raw
commands/closure/immutable audit: runtime-accounting-trace-report.md in the SDD.


Final safety control: correlation copies the original nextRid result at its
UNCHANGED argument-evaluation position. It never reads a new injected reply
requestId accessor outside diagnostic containment. Focused genuine observation/
Watchdog/trace owners28/28 pass after the accessor RED; no guard or message
changes. Current literal rosters were also corrected108 documented ->111 actual
prior entries ->112 with this new leaf: fixture-numeric, watchdog-cleanup-context
and watchdog-faults were pre-existing omissions, not new runtime behavior. Dated
historical rosters and protectedSection3 are preserved.


### Runtime trace round1 TEST-only checkpoint, 2026-11-08

Reviewed4925be4 full gate FAILED792/793, natural1/104.440s; actual command,
BOTHpipes/rawfiles/journal joined,385 inputs exact. Its genuine Native14 PASSED
with real exit/BOTHpipes/settlement and collector exits0/0/2. These are separate
facts; no full-gate success or successor cap/phase is claimed. Frozen handoff
c10bbe8157e62f6952044b51e7898269ea536cc45794eb2770c898aa9db0f75e and manifest
4832d8f47170c35dfd955ab767fbdbc430040e2fd6b1ab89cbdd13f426175d06 remain exact.

Sole failure was process-lifecycle's stale lines.at(-1) selector: the original
registration code+message assertions passed, while the final accounting.trace
row intentionally has no original code. The test now selects the UNIQUE
ordinary.fault by stage and requires it to precede accounting.trace. Original
exact code/message, BOTH distinctive suffixes,256B/no-adoption/real-stop/owner-
settlement checks remain. Whole PURE lifecycle8/8 passed naturally0/0.320s with
BOTHpipes/rawfiles joined. Runtime112 and original guards/science/debt untouched.
Scoped review and separate Root execution release remain required. No Native,
full-suite, cap/control/browser/model/phase was run for this TEST-only correction.
Historical415.45925ms cause remains UNKNOWN. Round1 evidence/report is appended
to runtime-accounting-trace-report.md; original report prefix/receipts preserved.


### Runtime trace actual validation checkpoint, 2026-11-08 (docs only)

On unchanged4df7eb0 runtime/source, the full serial gate is GREEN793/793,
0fail/cancel/skip/todo. Parent natural0/103.716679208s; BOTHpipes/rawfiles/journal
joined. Genuine Native14 actual exits+BOTHpipes+settled, expected collector0/0/2,
errors[], valid ordering and1,646,307B<4MiB.387 inputs exact. Handoff
runtime-trace-native-gate-4df7eb0-2/completed-handoff.json SHA
ec53fd964e1340d6e04170a1f41304301aae77649aa919fbf460a2ad41fec97b; manifest
55e1ae209c96f7a2b907cbe9809f991854a0805bbccb830cf00cbc35362be0e2. Sealing
separately closed0/0.392524458s. Prior4925 gate remains FAILED792/793 with its
separate NativePASS;4df7eb0 is the TEST selector correction.

Controlled cap only: wrapper natural0/7.378600833s; CLI38750 natural2 planned
PHASE_TIMEOUT; driver38752+collector38751 exit0/no signal/BOTHpipes. Fault0,
cleanup verified/accounting true, analysis ineligible,45total markers (22entered/
fulfilled pairs +1accepted cleanup), all lifetime/body joins accepted. Original controlled8s/5s and unused20s containment;
forced false.235files/2,622,012B frozen,392 inputs exact; sealing separately
closed0/1.448705583s. Handoff runtime-trace-cap-4df7eb0-1-owner/completed-handoff.json
SHA0f47ccde823676999d10878510bd319c97a6f2c3e37d22c3eac0ec842e157e8f; manifest
d0f04f808e7f65543cba4af16488f289ed756af06d83775a10876793c4a49c81. Seven application
checks intentionally failed under the controlled SDK/body/input-reopen setup.
This is genuine CLI/Native/Recorder/Watchdog/driver cleanup closure evidence,
NOT a primary browser/model/check/parity/preflight/comparison or strength pass.

Runtime112/protected23/M/helpers/versions/dependencies/science/all original limits
are exact. App/typecheck/Python carry ONLY178 unchanged executed refs. Old3c9
31/40 remains invalid,415.45925ms cause UNKNOWN;43d5f33 short diagnostic remains
bounded NONREPRODUCTION and f1 setup remains FAILED_SETUP. Passive trace collects
evidence; no backend repair is claimed. No new workload ran for this docs-only
checkpoint. Publication, fresh committed check/parity/preflight, new Root full40
release and final whole-change/task review remain OPEN. No push or phase launch.


### Accepted terminal identity amendment and before-use declarations, 2026-11-09

Hansel approved terminal-gone-proposed-amendment.md SHA13cc15b7f5d1cfa41d9b1bb23ddf6d691d184f52cf38a9cab25b6eb2750f7f66
through terminal-gone-approval.json, after scoped reviewa7d02d088f67892883803fce8766591a5cb08dd391793c0f85daf1d8d1ac0b2c.
That immutable draft/review stays unchanged; approval is external. This addendum
supersedes the complete-historical-owned SAMPLE/fresh-every-cached-tuple literal
ONLY for exact Node-admitted terminal identities. Keep all roots/membership/history.
ONE monitor-local observation terminal set, admitted only with whole timely
validated runCycle at original live-handle/last-valid commit. No standalone read,
failed/late/native-duration/flush/batch/Node-rejected work admits facts. Python
frame flush is not Node acceptance. SamePID/newbirth gets no hit; exact later
reappearance is fatal, not revival. Earlier same-batch census before disappearance
is legal; a subsequent census/inspection contradicting absence is fatal.

Every SAMPLE partition omits ONLY admitted terminal exacttuples; all unresolved/
live owned identities still require original Native sampling. Complete currentUID
census remains mandatory and precedes unchanged projection. Native Collector gains
DATA-ONLY cumulative fulltuple projection-seed history, empty per collector, no
terminal/proof/ownership authority, no new wire/ACK. Preserve full projection
visibility for terminal members. Costs stay under original aggregate bounds.
Probe/no-action and workload PID selection may use admitted exact absence after
original health/scope/live-handle guards. Generic numericPID inspection/newroot/
newbirth stay fresh; all ports including gone owners and fresh holder binding
remain mandatory. Every ACTUAL signal keeps fresh tuple check immediately before
kill; terminal no-action consumes no authorization. No oldfact clears sticky
fault/accounting/overage or physical exit/BOTHpipe/fd/callback/body/lifetime debt.
All 250/500/1000ms,30/90s/24h,P/C,TERM2/KILL4/5s/resource/scientific limits remain.

Declare BEFORE creation/use for readable capacity:
- process-accounting.mjs: ONE pure createProcessAccounting over EXACT14 borrowed
  keys runId/pythonExecutable/protocol/ownership/send/enqueue/nextRid/requireHealthy/
  lsofQueries/ownUid/clock/state/commitCycle/markFault. Whole proof/observation
  constructor+runCycle wrapper group delegates over same refs, frozen return
  {proofs,observation,runCycle}. No extra queue/store/deadline/IO or constructor
  callback effects. imports only existing observation/proof owners.
- process-inspections.mjs: whole existing readProcessInspections,
  readHelperReadyInspection,readLiveWorkloadPids group from observation with its
  original guards/comments/error factory. Observation reexports IDENTICAL refs.
  Depends on existing backend-reader/protocol-values only, no proof/observation
  backedge. Existing private inspection context captures read-only terminal/
  contradiction bindings; standalone omitted bindings preserve no-terminal API.
- process-observation frozen private roster becomes runCycle/projectObservation/
  sampleOwnedIdentities/isTerminalIdentity/assertNoTerminalReappearance. No writer
  API; one private set is writable ONLY in runCycle successful atomic commit.
  processes/proof/listeners get genuine captured read-only same-monitor refs.
  Public monitor roster unchanged. DAG processes -> accounting -> proof/observation
  -> inspections -> backend-reader/protocol-values; no backedge/new state owner.
Functional runtime112->114; Python helper union3 and six execution helpers stay.

Declare PURE runtime-excluded TEST paths terminal-test-fixtures.mjs (sole factory
makeTerminalObservation over genuine observation/ownership/budget with staged
send/clock), terminal-identity.test.mjs (admission/partition/contradiction controls),
terminal-consumers.test.mjs (genuine monitor/proof/listener/physical debt controls)
and terminal-identity.test.py (genuine Collector/Native staged-kernel/flush controls).
No Native/browser/model/control/cohort execution before fresh review and Root GO.
Current66 failed8/40 and subsequent known38gone observations remain ineligible/
historical-cause UNKNOWN; no scores/weights change or old receipt repair. Required
whole PURE owners, docs/current usage/status and final code-to-doc check accompany
local green implementation. Protected wholeSection3 and approved artifact hashes
stay exact. No hidden minification; all changed source/tests below400.


### Terminal identity implementation checkpoint, 2026-11-09

Approved Node-admitted rule implemented, ready for fresh source review only.
Causal behavioral RED retained: repeated confirmed-gone oldtuple hit staged
permission. Whole affected PURE sweep245/245 passed; final proof/consumer/
monitor/protocol whole owners139/139 passed after preserving signal-field and
malformed private-binding guards. Python whole58+19 and new8 controls passed.
All command exits/BOTHpipes/rawfiles joined. No actual Native/control/fullserial
Native/cap/browser/model/phase/cohort ran. Current runtime114/helpers3; source/
tests below400. App/typecheck carry132 unchanged non-Python refs; the sole changed
prior Python ref is Collector, freshly covered by whole Python owners.

One private observation set publishes only after all fallible preparation and
original last live guard/private cycle commit. All SAMPLE callers use the sole
read-only unresolved/live partition. Counts of gone include admitted terminal
history, not new BSD proof; live RSS is freshly sampled, peak/overage stays latched.
The Python history is only projection seeds, not Node-acceptance/death authority.
Contradiction ordering, generic present-PID/newbirth, all ports/fresh holders,
original signal validation/no authorization for no-action, actual signal tuple
reads and independent child/BOTHpipe/fd/body/debt obligations remain explicit.

Source/doc audit and raw commands/hashes/closure: terminal-gone-implementation-report.md
in the established SDD. Prior66 failed8/40, later known38gone only, all old seals/
proposal/review/report prefixes remain immutable and ineligible. Historical88834
cause stays UNKNOWN; no causal/score/strength or completed40 claim. Fresh Max
source review and separate Root operational releases/publication/fresh committed
prerequisites remain OPEN. No push/main/merge or new experiment is authorized.


### Terminal identity round1 TEST expectation checkpoint, 2026-11-09

The a8f1880 full gate remains FAILED812tests/811pass/1fail, natural1/92.484007666s;
BOTHpipes/rawfiles/journal closed,412 inputs exact. Its separate genuine Native14
PASS has real exits/BOTHpipes/settlement, expected collector0/0/2,errors[] and
966,386B output. No overall gate or new cap/phase success is claimed. Failed
handoff f4c897a70f65c59aef2518d6dd076cabbe82f8bf21aedffe46a2ca56f79078ba and
manifest94788c0b6d634df460e8ae5df58ddcc439e666ce6d64b0ce875d42050a7e71fa remain immutable.

Sole failure was accounting-trace's stale prefix-order assertion. Approved
runCycle first reads full historical ownership to seed admitted terminal gone
counts, then reads it for the unresolved/live request partition. These are
memory reads, not extra Native queries. Issued nextRid stays AFTER request
partition evaluation and BEFORE send; the original coverage check reads ownership
again. The fixture now asserts EXACT full sequence owned/owned/nextRid/send/owned,
not a sliced prefix. Zero injected reply-accessor reads and all original
ACCOUNTING_UNAVAILABLE/message/deadline checks remain. Runtime behavior unchanged.
Whole affected PURE trace/IO/observation/terminal owners39/39 passed naturally0/
0.404s with BOTHpipes/rawfiles joined. No Native/fullsuite/cap/control/browser/
model/phase was run for this TEST-only correction. Scoped Max review and fresh
Root operational release remain required. Original source/report prefix and
all old gate/cohort/probe seals remain exact; historical88834 cause UNKNOWN.


### Native cap TEST-fixture identity binding declaration, 2026-11-09

Closed55ce cap failed BEFORE driver admission on strict expected BackendIdentity.
Canonical STATIC reconstruction proves ONLY helpers[2] process-macos.py bytes/
SHA drift (16169/215ccc2b... ->16385/e103be96...), while all supplied OS/ABI/Python
launcher+process-image/libproc/lsof fields match. Old provided environment was
provenance, but the fixture copied CURRENT trusted helpers and blindly retained
OLD source refs. No Native matcher/policy failure or phase-cap closure proof.

Before use declare ONE additional private TEST-only export in EXISTING
cli-shutdown-test-fixtures.mjs: bindCliFixtureNativeEnvironment(nativeEnvironment,
harnessRoot). It captures/validates provided data before awaits, calls canonical
captureSetupBackendIdentity on the actual copied fixed three helper sources under
harnessRoot plus supplied pinned Python metadata, requires identical helper path
set and ALL supplied non-helper backend fields through the unchanged strict
expectation matcher, and returns a copied environment with canonical CURRENT
helper byte/hash refs. No collector selfreport, source edit/proof/authority bypass,
new runtime path/flag/backend/clock or skipped final helper equality. Existing
prepareCliShutdownFixture captures provided environment before setup awaits and
uses this binding after its readonly source copy. Default synthetic mode unchanged;
Node invocation/realpath normalization is the existing fixture behavior.
Native input means controlled actual-Native-cap TEST environment only, never a
real primary/browser/model/scoring receipt. No supplied OS/ABI/interpreter/libproc/
lsof pin is silently regenerated to excuse mismatch. Declared pure regressions
extend EXISTING cli-shutdown.test.mjs: causal stale-provided-helper failure,
correct copied-source binding, wrong pin/path rejection and postbinding helper
mutation rejected by original strict matcher. No new helper/path/framework.
Current reviewed cap/control script and old frozen workspace/provenance unchanged;
any new actual Native/cap execution requires fresh review and separate Root GO.

Fixture-binding PURE checkpoint: causal stale-helper test failed on the original
strict ACCOUNTING_UNAVAILABLE expected-identity error before the correction.
After binding, whole CLI-shutdown/backend-setup owners20/20 passed naturally0
in12.688s, BOTHpipes/rawfiles closed, stderr0. All original7 controlled CLI cases
remain; wrong OS/Python-image/lsof pins, helper paths and postbinding helper
tamper fail closed. Static file/OS capture is NOT Native readiness or cap closure.
The earlier55ce actual fullserial812/812+Native14 remains separate from its
failed pre-driver cap. Runtime114/protected23/M/six execution helpers/Section3
unchanged. Actual Native/cap/phase remains withheld for scoped review+Root GO.


### Closed terminal-identity verification checkpoint, 2026-11-09

Verified candidate d2551ae9642ac730510d85a4ba93c348a73ce26d. Full serial gate
814/814 passed,0 failures/cancelled/skipped/todo; parent natural0/94.424246875s,
BOTHpipes/rawfiles/journal joined. ActualNative14 all exit+BOTHpipes+settled,
expected collector0/0/2, errors[], shared output975744B below4MiB. Gate final
sealing separately closed0/0.35615s. W/terminal-gone-native-gate-d2551ae-20261109T041529832Z-8b6d5efb-5095-4e89-bb52-fe23c7eb29ae/completed-handoff.json
SHA74f0a0d567dd9fb7b0267767852b7b3cb1a5d23659cdde3fbcb124d1c951135e;
completed-evidence-manifest.json SHAccb7a8533228b1cedc7c78a0f748062e3677dab3fd6fa82e60f72d80e9ef241c.

Controlled CAP wrapper89343 natural0/7.493634375s; actual archived CLI89347
natural2/PHASE_TIMEOUT, fault0, BOTHpipes joined. Driver89349+collector89348
actualexit0/no signals/BOTHpipes; cleanup verified+accountingtrue,
analysisEligiblefalse, no containment.45 markers:22entered/22fulfilled/1accepted,
0rejected. All465 input/seal refs exact. Separate bookkeeping BEFORE handoff
1.357513917s; final sealing externally closed0, no extra duration inferred.
W/terminal-gone-cap-d2551ae-1-owner/completed-handoff.json
SHAe112ea8759cb0e2807617dbd70419c74f5393a85b8b51457b54cf779b72db8ac;
completed-evidence-manifest.json SHA85ceac3f47117e686c41907c5249779df32678566f98be90a91b9352151e0ebb.
This proves controlled SDK/body/input-reopen+genuine CLI/Native/Recorder/Watchdog/
driver closure only. Seven app checks intentionally failed in this controlled
setup. It is NOT a real primary check, browser/model/parity/cohort or score pass.

Prior failed812/811 gate and failed55ce pre-driver CAP remain FAILED with their
separate Native/collector facts. Old66 eight-game and3c nine-hour31-game attempts
remain ineligible; known38gone observations do not repair old cleanup. Historical
88834/415ms/OS causes UNKNOWN. No old result promotion or ELO/strength refresh.
Runtime114, all TEST sources/deps, protected23/M/Section3/pins/six execution helpers
unchanged. This checkpoint changes documentation only; no tests/workload rerun.
MinorM3 introductory comment remains deferred without a source edit. Fresh
committed actualcheck/parity/preflight and separate Root full40 GO remain OPEN.
Publication is a separate Root action. All original limits/science remain exact.


### Accepted descendant-directory retirement, declared before use, 2026-11-09

User approval workspace-directory-retirement-approval.json binds immutable
amendment9df74de4865d81a505aaf470384a30a63d7f8e940ae3197fcece1a0a119a47b5
and scoped reviewa11d343ae2cec0bb191295549efc8d4ec85e9f476c6821846df606674695ec84.
This explicitly supersedes ONLY the earlier unconditional descendant-readdir
failure rule. Root lstat/root readdir remain strict. After safe same-walk
non-symlink descendant-directory lstat, pre-enumeration readdir ENOENT may use
the SAME per-scan retirement facts after positive child absence and unchanged
ROOT+ALL PARENT ancestor proof (excluding the retiring directory itself).
First walk uses the existing ONE whole-root restart; second walk may continue
with zero only after removing its caller-associated already-added known
directory charge. No unknown children enumerated, guessed bytes, third walk,
new timestamp or extra retry. Every retirement revalidates before publication;
replacement/reappearance/symlink/unsafe/lost ancestors/permission/nonENOENT/
stop/generation and all original freshness/phase/debt/sticky guards stay strict.
Old failed727 CHECK is not repaired or promoted; historical confirmations UNKNOWN.

Before creation declare TEST-only workspace-footprint-directory.test.mjs, no
exports: cohesive new approved-directory cases, genuine observer/Store/lifetime
and owned real temp trees, transparent privateFs test seams plus explicit
controlled allocation metadata for NONZERO rollback coverage. It imports only
existing runtime/test primitives and node builtins, creates no public API,
backend/proof/debt owner or runtime-union member. Existing385-line footprint
TEST owner/cases remain whole and unchanged; new leaf stays below400 readable
lines. Runtime114 membership unchanged; private workspace-footprint walk result
carries exact child-path retirement association solely to its original caller,
using original scan retirement list/generation/one inflight owner. No cache,
ledger, timer or alternate proof. Run whole affected PURE footprint/Store/
sticky/no-write/physical ownership owners; actual Native/phase remains withheld.


Accepted directory-retirement implementation checkpoint: workspace-footprint.mjs
now confirms ONLY the bound safe descendant's pre-enumeration readdir ENOENT
against captured parents/root. Its private exact-path return associates the zero
with the immediate caller's known directory charge; no child prefix exists.
First walk keeps one whole-root restart, second walk may continue after rollback;
all per-scan retirements retain original final proof. Root readdir and every
unsafe/unproven condition stay invalid. No prior invalid/sticky proof is cleared.
Causal PURE RED:2 approved positives failed while19 negatives/sticky passed.
Final six whole PURE owners95/95 passed natural0/2.894032333s, BOTHpipes/rawfiles
closed, including original footprint385-line owner, Store, physical-fs/drains and
passive error retention. New22-case directory leaf193lines proves NONZERO4096B
rollback, first/second walk, all unsafe/final-proof negatives, sticky/no writes
and valid-but1001ms-old Store rejection. Runtime owner359lines; runtime union114
unchanged. Failed727 CHECK and all old proofs remain ineligible, historical
confirmations UNKNOWN. Actual Native/fullserial/cap/phase review+GO still OPEN.
No M3 comment cleanup, model/science/dependency/runtime-pin change or score claim.


### Closed directory-retirement verification checkpoint, 2026-11-09

Verified candidate299625f8da6b0783f11135449a3f1efcbb98e3c8: actual full serial
836/836 passed,0 failures/cancelled/skipped/todo; parent natural0/103.05508225s,
BOTHpipes/rawfiles/journal joined. ActualNative14 all exit+BOTHpipes+settled,
expected collectors0/0/2, errors[], shared output1022967B below4MiB. Final gate
bookkeeping separately closed0/0.43921s. W/directory-retirement-native-gate-299625f-20261109T053822831Z-fd6c6b73-5c45-417d-a2da-49d3a083fe20/completed-handoff.json
SHA79dc3da712bd7b48dc380652ab19a908c88bbb63a5d4ad57bd043184d771c0c4;
completed-evidence-manifest.json SHAbac5fdfc01538fbe713bf4c194aecca6eda066ac6ae998e17779177e19eb5818.

Controlled CAP wrapper90658 natural0/7.482946042s; CLI90673 natural2/
PHASE_TIMEOUT, fault0, BOTHpipes joined. Driver90687+collector90681 actualexit0/
no signal/BOTHpipes; cleanup verified+accountingtrue, analysisEligiblefalse,
no containment.45markers:22entered/22fulfilled/1accepted/0rejected. All496
executed input/seal refs exact after. Bookkeeping BEFORE handoff1.343306958s;
final tool externally closed0, no extra exact duration inferred. W/directory-retirement-cap-299625f-1-owner/completed-handoff.json
SHAfe8fb2e6bd7e8aeb960e17a3fd17952a9f75825eac8eff4cd2ed7ba4b85ee7d2;
completed-evidence-manifest.json SHA4f7129ffbf7bddcf773987929dd7a6606595bf9cec99885f63af1e924f3ad631.
Seven app checks intentionally failed in controlled SDK/body/input-reopen setup.
This is genuine CLI/Native/Recorder/Watchdog/driver closure evidence ONLY, not a
real primary check, browser/model/parity/cohort/score pass or strength refresh.

The failed727 actual CHECK remains failed/ineligible, with missing completion
and unproven Native cleanup (handoffe2f531b3..., manifest08eb9456...). Earlier
failures and immutable approved9df amendment/approval/review remain unchanged.
Historical directory confirmations/88834/415ms/OS causes remain UNKNOWN. No old
proof or result is promoted. Runtime114, all TEST sources/deps, protected23/M/
Section3, pins/six execution helpers unchanged. MinorM3 remains deferred.
Docs-only factual checkpoint: no source edits/tests/workload. Fresh committed
actualcheck/parity/preflight and new Root full40 GO remain OPEN. Publication is
separate; original scientific/clock/resource/ownership/debt limits stay exact.
