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

### Latest factual status pointer, 2026-11-09

See the [experiment ledger checkpoint](../../experiments/tinyaz-software-plan.md#fresh-repaired-candidate-comparison-2026-11-09)
for published candidate `fc307657d8c33af9c6e226087610a454ec6bbfcf`: the
836/836 harness gate and fresh CHECK/PARITY/PREFLIGHT passed. Its fresh full
40-game comparison failed naturally at 6 acknowledged games / 3 pairs, with no
eligible analysis and Native cleanup/accounting unproven. M weights are unchanged.
The optional PURE frame diagnostic measures synthetic scaling, not historical
cause or Native closure. The next architectural direction awaits the user; no
amendment is approved. This is a docs-only checkpoint; runtime tests were not
rerun. A valid full 40-game result and whole-change final review remain open.


### V2 execution constraints and common acceptance

This prospective plan implements approved amendment SHA256 `e78f19e33659fe31eb4472a558189022eea0f865422cdcc78040a1ef429df041`; approval receipt SHA256 `8ec6ff43316d0bfd44b8b8a758b5c1669d0138e938089c0041d9840c9c6105ff`. The accepted canonical amendment takes versioned precedence over the old Global Constraints' continuous-adjacent-gap and aggregate-pass prerequisites only for explicit v2 compare periodic quality. V1 behavior remains strict. It does not weaken scientific identity, Native/transport/filesystem/proof/cleanup/Store/graph/cap failures or any bound. Task 3 stays incomplete until a valid fresh full40 result. No failed cohort is reused.

Execution is serialized by Root. Every task depends on the previous green commit and fresh scoped Max source/specification/quality review before its successor; implementation fixes and review are separate states. Root owns review dispatch. No implementer delegates. Every task updates affected owning README/API/usage and accepted design/status/checklist documents in the same green change, performs a direct final code-to-doc/diff comparison, keeps source/tests below400 readable lines, audits protected23/M/whole Section3, commits locally on `feat/tinyaz-browser-harness`, and reports exact checks, receipts, gaps and commit. No adjacent refactor, new dependency, training, merge or deploy. Root may publish only a reviewed candidate at the explicit publication stage.

Each task's writable subset is its table below plus the seven shared documentation paths listed in Task4 (except Task13, which has no tracked writes). Table paths follow approved section9: unprefixed paths are relative to `train/scripts/browser_eval/`, `/` means repository root, and `W/` means the SDD workspace. Tables preserve the approved section9 eventual change envelope; each task narrative limits the exact phased symbol/action. C means first creation only; later listed reuse modifies that same owner without recreating it. Where the next task explicitly reuses an already introduced owner, only its stated symbol/action is authorized. Read existing tests without edits; the approved new TEST leaves own new controls. New semantic REDs must exercise genuine owners through controlled seams, not missing imports or tests mirroring constants. GREEN means causal cases plus relevant whole owners pass on frozen inputs with actual bodies, process exit, BOTH pipe closes, raw files and journal settlement. Preserve failed gates; no automatic retry or fabricated closure. V2 remains fail-closed and operational default v1 until the complete integration exists.

All runtime commands below are FUTURE, UNRUN in Task4. Qualified Node/Python descriptors come from the current fc30765 safety/runtime records and must be freshly reattested by Root before execution. Runtime/input bytes cannot change during any Native or phase command; all other local agents/process activity stays quiescent while Root is sole executor/poller. Do not feed an unreviewed Native owner through any implicit package glob.

```sh
TINYAZ_NODE="/Users/hansel/Library/Caches/tinyaz-node-qualification/node24.22.2-20261107-77b65dbc-2cfe-4ac4-8834-6a222f856823/node-v24.22.2-darwin-arm64/bin/node"
TINYAZ_NPM_CLI="/Users/hansel/Library/Caches/tinyaz-node-qualification/node24.22.2-20261107-77b65dbc-2cfe-4ac4-8834-6a222f856823/node-v24.22.2-darwin-arm64/lib/node_modules/npm/bin/npm-cli.js"
TINYAZ_VERIFY_BIN="$PWD/train/.venv/bin"
PATH="$TINYAZ_VERIFY_BIN:/Users/hansel/Library/Caches/tinyaz-node-qualification/node24.22.2-20261107-77b65dbc-2cfe-4ac4-8834-6a222f856823/node-v24.22.2-darwin-arm64/bin:$PATH"
```

Use `"$TINYAZ_NODE" --test --test-concurrency=1 --test-timeout=90000` followed by exact reviewed owner paths for each Node harness command. The 90000ms file guard comes from the current accepted Native gate argv; it does not replace original per-operation/Native limits. App commands are `"$TINYAZ_NODE" "$TINYAZ_NPM_CLI" run test:scripts`, `"$TINYAZ_NODE" "$TINYAZ_NPM_CLI" run test:core`, and `"$TINYAZ_NODE" "$TINYAZ_NPM_CLI" run typecheck` under that PATH. Never substitute `npm test` for distinct stage evidence. Current `test:browser-harness` is an implicit glob containing actual Native and is withheld until Task11.

Required isolated Python commands: `"$TINYAZ_VERIFY_BIN/python" -I -B train/scripts/browser_eval/process-macos.test.py`, `"$TINYAZ_VERIFY_BIN/python" -I -B train/scripts/browser_eval/process-macos-wire.test.py`, `"$TINYAZ_VERIFY_BIN/python" -I -B train/scripts/browser_eval/terminal-identity.test.py`. Also retain the project's standalone verification sequence with `PYTHONPATH=train/src "$TINYAZ_VERIFY_BIN/python"` and each exact `train/scripts/test_encode.py`, `train/scripts/test_lichess_split.py`, `train/scripts/test_climb_loop.py`, `train/scripts/test_engine_uci.py`, `train/scripts/test_challenge_rotator.py`, `train/scripts/test_mcts.py` path from train/scripts/README.md. No `test_climb_real_regressions.py`, training entry, browser/model phase or network work belongs to Task10. Python Native-module tests use scripted ABI/kernel/clock collaborators; they are not actual Native execution.


## Task 4: Accepted contract and before-use declarations

DOCS ONLY checkpoint, dependent on Hansel's bound approval. Append the faithful accepted canonical projection and all before-use declarations. Record approved direction separately from unimplemented v2 and old failed history. RED is the preexisting absence of accepted projection, complete declarations and executable Tasks4-14; GREEN is exact normative projection/prefix proof, all63 map paths assigned, local links/anchors, seven-file diff and protected hashes. Static reads/hash/diff only, no runtime import/test/Native/browser/model/network. Root independently reviews the one local docs commit; W/v2-task-4-report.md records limits.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| M `/README.md` | Current direction/proposal vs approval vs implementation vs fresh run; separate authoritative verdict/exit usage. |
| M `/train/scripts/README.md` | Versioned command/protocol and nonzero eligible semantics, original bounds. |
| M `/train/scripts/browser_eval/README.md` | Complete APIs/state/schemas/allowlist/runtime union, limits, compatibility, handoff and before-use TEST declarations. |
| M `/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md` | Append approved amendment and exact file map only after user approval; preserve earlier historical requirements. |
| M `/docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md` | Buildable phased tasks, test ownership and final code/doc comparison gates. |
| M `/docs/experiments/tinyaz-software-plan.md` | Preserve failed cohorts; record proposed/approved/implemented/verified/released results separately. |
| M `/docs/experiments/README.md` | Update experiment index pointer/status only, without a strength claim. |


## Task 5: Pure policy, closed schema, identity, ledger and verdict foundations

Dependency: reviewed Task4. Implement pure closed constants/selection/binding, exact schema2 dispatch and identity, resource ledger and reducers. Move the whole v1 immutable RECORD_FIELDS unchanged, without circular validator imports. Add semantic RED/GREEN controls in resource-quality.test.mjs and separate-verdicts-records.test.mjs with TEST-only fixtures: exact500ms/500ms+1ns, bootstrap seed,64-detail ring/65+ episodes, counters/chronology/1024B and65536B overflow; all verdict truth-table rows, closed unknown/missing/version/policy fields and v1 unchanged readback. Run both exact new owners plus record-schema.test.mjs and canonical-json.test.mjs and typecheck. Pure helpers cannot supply IO/publication/Native authority; operational default stays v1 and incomplete v2 fails closed.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `evaluation-policy.mjs` | Pure closed policy constants/fixture selection/version compatibility. Exports V2_POLICY, policyForProtocol, assertPolicyBinding. No IO/state. |
| C `resource-quality.mjs` | Pure ledger transitions/checks for section6. Exports createResourceQuality; monitor owns its only instance. Same clock facts passed as data, no timers/IO. |
| C `verdicts-v2.mjs` | Pure closed schemas/reducers for strength, phase/closure resource and aggregate status. Exports assertVerdicts, deriveVerdicts. Imports only schema primitives/constants/policy, never record-schema or stats; no writer, Native or statistical recomputation. |
| C `record-fields.mjs` | Move the whole immutable v1 RECORD_FIELDS declaration unchanged from record-schema; exports RECORD_FIELDS only. Both version validators import this leaf, never each other. |
| C `record-schema-v2.mjs` | Complete closed v2 record validators, reusing primitive/environment validators and record-fields without weakening v1. Exports assertRecordV2. |
| C `receipt-verdicts-v2.mjs` | Pure v2 graph coherence/reducer equality and resource snapshot reconciliation. Exports verifyVerdictClosure. No file/Native IO or publication authority. |
| M `record-schema.mjs` | Explicit v1/v2 dispatch, move unchanged v1 fields to record-fields for exact v2 construction; old branch keeps literals/coherence. |
| M `identity-schema.mjs` | Exact CommonIdentity dispatch: absent policy=v1 only, exact v2 policy shape=v2; fixture binding; environment/backend validators unchanged. |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `resource-quality.test.mjs` | Pure exact boundary/counter/ring/chronology/overflow tests from section10. |
| C `separate-verdicts-records.test.mjs` | Genuine Recorder/Store/prepared publication/graph v2 controls and v1 readback rejection controls. |


Task5 local implementation checkpoint: pure foundations and v1-only staging guards are implemented and locally verified. Positive v2 Recorder/publication remains Task8. The additional Task5 writable symbol scope is the two minimal guards in `record-inputs.mjs`, authorized by Root and declared before edit below. Fresh scoped Root review remains pending before Task6.

## Task 6: Whole start, resource and RSS extractions with v1 equivalence

Dependency: reviewed Task5. Extract whole existing collectorArgv/start, resource polling and RSS projection/retention groups into the three declared owners on identical config/state/authority/stopOwner/monitor/record/fault/latch references. No second queue/lifetime/ledger/stop owner, no changed cadence or behavior. RED/GREEN first add v1 equivalence assertions to the new separate-verdicts-monitor.test.mjs and separate-verdicts-watchdog.test.mjs using current strict-v1 cases and exact function/reference/debt behavior. Run those new owners plus process-lifecycle.test.mjs, process-observation.test.mjs, watchdog-resource.test.mjs and watchdog-cleanup.test.mjs; typecheck and readable-line audit. Keep existing tests intact. Reuse the Task5 TEST fixture owner only for these controlled equivalence seams.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `process-runtime-start.mjs` | Whole existing start/collectorArgv group extracted from process-runtime on the same config/state/authority/stopOwner references; exports createProcessStart. No second lifetime/queue. |
| C `watchdog-resource-policy.mjs` | Whole resource-poll group plus v2 projection routing extracted from watchdog-runtime; exports armResourcePolling with borrowed timing/control/state/capabilities. No new stop owner/timer cadence. |
| C `watchdog-verdict-policy.mjs` | Whole RSS boundary projection/retention group extracted from watchdog; exports createWatchdogResourceChecks using same monitor/records/fault/latch bindings. No stop, state or ledger ownership. |
| M `process-runtime.mjs` | Delegate whole start; tick selects private periodic purpose and captures its original admitted end before enqueue, keeps sampling after quality loss, retains actual tickQueued ownership. |
| M `watchdog.mjs` | Delegate RSS checks, use typed hard fault/quality boundary, preserve single latchStop and original captureCleanupBound. |
| M `watchdog-runtime.mjs` | Delegate resource group; hard invalid/missing facts stop, compare periodic quality records without stop; write policy-correct running version. |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `separate-verdicts-monitor.test.mjs` | Genuine monitor/observation/protocol causal tests, no Native or browser claims. |
| C `separate-verdicts-watchdog.test.mjs` | Actual watchdog stop/finish/cleanup, sticky cap, pending and physical-debt controls. |


## Task 7: Monitor quality, current proof, sticky cap and stopping-fence split

Dependency: reviewed Task6. Integrate approved compare-only typed periodic classification, strict bootstrap seed, rolling complete/timely references and frozen coverage origin. Capture original numeric minimum admitted-end metadata before enqueue, including fractional1000.25ms and later narrowing. Implement sticky observed cap, stopping fence/tail, late-drop guard, post-fence already-issued positive-cap retention and synchronous nested-prefix capture/readback with truthful parent debt. Reuse process-runtime.mjs, watchdog.mjs, watchdog-runtime.mjs, watchdog-resource-policy.mjs, watchdog-verdict-policy.mjs and Task5 ledger/fixture owners solely for this policy wiring. Causal RED/GREEN in new monitor/terminal/watchdog owners must cover all section10 monitor/deadline/tick/terminal/cap/prefix/fence controls: idle501ms with no getter, Python-only501ms, age-only loss, gap recovery without coverage repair, held actual tick, strict noncompare/bootstrap, hard error/EOF/permission, timely-after-gap versus untimely/cap terminal admission, exact birth/reappearance/listeners, pending child/parent pipes, missing/stale/current proof, late/expired/queued-not-issued replies, synchronous prefix no IO/timer/queue mutation and later parent cap/fault. Run these three new owners plus process-observation.test.mjs, processes.test.mjs, terminal-identity.test.mjs, terminal-consumers.test.mjs, watchdog-resource.test.mjs and watchdog-cleanup.test.mjs; run isolated terminal-identity.test.py and typecheck. No real Native.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `resource-quality.mjs` | Pure ledger transitions/checks for section6. Exports createResourceQuality; monitor owns its only instance. Same clock facts passed as data, no timers/IO. |
| C `process-runtime-start.mjs` | Whole existing start/collectorArgv group extracted from process-runtime on the same config/state/authority/stopOwner references; exports createProcessStart. No second lifetime/queue. |
| C `watchdog-resource-policy.mjs` | Whole resource-poll group plus v2 projection routing extracted from watchdog-runtime; exports armResourcePolling with borrowed timing/control/state/capabilities. No new stop owner/timer cadence. |
| C `watchdog-verdict-policy.mjs` | Whole RSS boundary projection/retention group extracted from watchdog; exports createWatchdogResourceChecks using same monitor/records/fault/latch bindings. No stop, state or ledger ownership. |
| M `processes.mjs` | createProcessMonitor policy/phase binding; hardFault vs coverage states; same-state observation commit; private periodic purpose, original admitted-end metadata captured before enqueue; resource snapshot exposure and scope-validated synchronous _captureResourcePrefix with original-C/parent-bound freshness guards and no queue/horizon effect. |
| M `process-observation.mjs` | runCycle classification, actual rolling completion, timely terminal admission, separate peaks, bootstrap seed/counters, age/tail/stopping guards, guard-observed lateDrops, narrowly retained post-fence positive cap and typed observation. |
| M `process-accounting.mjs` | Forward exact borrowed policy/state refs and immutable original admitted-end metadata alongside the same runCycle handle; mark only thrown hard failures, not returned periodic quality data. |
| M `process-runtime.mjs` | Delegate whole start; tick selects private periodic purpose and captures its original admitted end before enqueue, keeps sampling after quality loss, retains actual tickQueued ownership. |
| M `process-stop.mjs` | Capture sampling fence/end/tail once; prevent late success while retaining eligible already-issued positive caps through actual drain; retain original drain/teardown/physical proof. |
| M `watchdog.mjs` | Delegate RSS checks, use typed hard fault/quality boundary, preserve single latchStop and original captureCleanupBound. |
| M `watchdog-runtime.mjs` | Delegate resource group; hard invalid/missing facts stop, compare periodic quality records without stop; write policy-correct running version. |
| M `watchdog-shutdown.mjs` | Final cap/quality snapshots, exact cached nested prefix selection through cleanup.readResourcePrefix, typed intent propagation and authoritative verified outcome projection after cleanup. |
| M `watchdog-cleanup.mjs` | Current timely snapshot predicate separated from coverage continuity only for v2 compare; capture actual fence-bound quality without granting proof; nested branch invokes synchronous _captureResourcePrefix after its actual child-scope proof and before original C, caches it once and exposes private readResourcePrefix for finalization. |
| M `watchdog-records.mjs` | composeIntent carries supervisor-owned resource facts, preserves all hard stops; final snapshot comes from real monitor closure or exact cached nested prefix, no driver substitution; preserve truthful selftest parent-pending attribution and explicit selftest-prefix verdict scope. |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `separate-verdicts-monitor.test.mjs` | Genuine monitor/observation/protocol causal tests, no Native or browser claims. |
| C `separate-verdicts-terminal.test.mjs` | Timely-after-gap versus untimely terminal admission and unchanged proofs/listeners tests. |
| C `separate-verdicts-watchdog.test.mjs` | Actual watchdog stop/finish/cleanup, sticky cap, pending and physical-debt controls. |


## Task 8: Recorder, closed facts, graph, prerequisites and paired eligibility

Dependency: reviewed Task7. Keep the sole Recorder/Store/state/queue and prepared publication sequence. Compile scientific closed facts independently before resource aggregate degradation, append mandatory final-resource-evidence before events close, bind final/completion/closure graph and strict v2 parents. Math and stats.mjs remain unchanged. Reuse record-schema.mjs, record-schema-v2.mjs, verdicts-v2.mjs, receipt-verdicts-v2.mjs and TEST fixture/records owner only for this integration. Genuine Store/Recorder/graph causal RED/GREEN must include full40 quality-only eligible/inconclusive2, partial cohort/no inference, all fatal/cap/cleanup/Store/graph negatives, missing final snapshot, forged/reset/ring/counter/chronology/peak/pending facts, failed prepared publication/no authoritative eligibility, strict parent resource admission, exact selftest-prefix scope and eventual parent closure. Run separate-verdicts-records.test.mjs plus artifact-store.test.mjs, record-evidence.test.mjs, records-finalization.test.mjs, completion-publication.test.mjs, record-schema.test.mjs, prerequisites.test.mjs and pgn-evidence.test.mjs; typecheck. Only controlled scientific fixtures, no model/match execution.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `verdicts-v2.mjs` | Pure closed schemas/reducers for strength, phase/closure resource and aggregate status. Exports assertVerdicts, deriveVerdicts. Imports only schema primitives/constants/policy, never record-schema or stats; no writer, Native or statistical recomputation. |
| C `record-schema-v2.mjs` | Complete closed v2 record validators, reusing primitive/environment validators and record-fields without weakening v1. Exports assertRecordV2. |
| C `receipt-verdicts-v2.mjs` | Pure v2 graph coherence/reducer equality and resource snapshot reconciliation. Exports verifyVerdictClosure. No file/Native IO or publication authority. |
| M `record-schema.mjs` | Explicit v1/v2 dispatch, move unchanged v1 fields to record-fields for exact v2 construction; old branch keeps literals/coherence. |
| M `records.mjs` | Head version from manifest, append final supervisor resource event before writer close; keep sole recorder/state/queue and post-stop evidence lane. |
| M `record-evidence.mjs` | Head version from validated manifest, capture resource snapshot and graph-bound closure facts with existing verifier/lifetime. |
| M `record-inputs.mjs` | Version-aware intent validation; canonical detached copies include supervisor resource evidence; reject driver verdict injection. |
| M `record-finalization.mjs` | Keep v1 functions; v2 closed-facts strength/resources reduction before aggregate status, correct cleanup proof validation and final/completion construction. |
| M `record-finalizer.mjs` | Supply final verdicts to v2 completion; existing final/prepared-token/graph/readback sequence unchanged. |
| M `pgn-summary.mjs` | Separate frozen-game evidence validation from aggregate-resource status only in explicit v2; preserve science checks and stats formulas. |
| M `receipt-verification.mjs` | Dispatch new pure coherence verification after real graph reads; bind version/policy/final/completion/evidence and parent closure; old verifier semantics unchanged. |
| M `prerequisites.mjs` | Explicit v2 parent rules section7; same live-identity probe and receipt graph; read old graphs without cross-version admission. |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `separate-verdicts-records.test.mjs` | Genuine Recorder/Store/prepared publication/graph v2 controls and v1 readback rejection controls. |


## Task 9: Explicit fixture, snapshot, reopen, driver, CLI and Python parity selection

Dependency: reviewed Task8. Add exact prospective v2 fixture without editing v1 bytes; append only approved runtime leaves/fixture to the functional union, excluding TEST leaves. Bind explicit protocolPath/evaluationPolicy through fresh-process capture, final remeasurement and independent reopen, manifest/monitor/driver hello/start and verified CLI projection before SDK work. Reuse evaluation-policy.mjs and identity-schema.mjs plus TEST fixture owner solely for selection/version binding. Causal RED/GREEN separate-verdicts-compat.test.mjs covers both fixtures present, v1/v2 same-selected roundtrips, missing/unknown/mixed/wrong path/hash/policy/version, forged driver verdict/summary, full selected-path forwarding and strict Python parity admission. Run the new compat owner plus phase-fixtures.test.mjs, snapshots.test.mjs, run.test.mjs, driver-ipc.test.mjs, supervisor-protocol-native.test.mjs and record-schema.test.mjs; required isolated Python and typecheck. The protocol-native filename is scripted validator work, not real Native. No actual CHECK/PARITY/browser/model phase.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `evaluation-policy.mjs` | Pure closed policy constants/fixture selection/version compatibility. Exports V2_POLICY, policyForProtocol, assertPolicyBinding. No IO/state. |
| M `identity-schema.mjs` | Exact CommonIdentity dispatch: absent policy=v1 only, exact v2 policy shape=v2; fixture binding; environment/backend validators unchanged. |
| M `phase-fixtures.mjs` | validateProtocolFixture exact v2 branch; opening/schedule/scientific validators unchanged. |
| M `snapshot-identity.mjs` | Explicit protocolPath/evaluationPolicy signature/defaults from section8; assembleSnapshotIdentity includes policy only for exactly selected v2, correct protocol ref/digest. |
| M `snapshots.mjs` | Policy-aware capture/final remeasurement/reopen; forward explicit protocolPath/evaluationPolicy into every identity reconstruction and requested path into independent reopen. |
| M `snapshot-reopen.mjs` | inspectReopenedInputs validates requested selection against workspace schema/policy/selected ref and actual fixture bytes, passes both selected arguments into independent assembleSnapshotIdentity; retain genuine fresh-process environment/byte rechecks. |
| M `snapshot-files.mjs` | Include Task8 `record-finalization-v2.mjs` and `receipt-verification-v2.mjs`, plus exact new runtime leaves and v2 fixture in functional closure; preserve all original paths/order; exclude TEST leaves. |
| M `run.mjs` | Closed --protocol selection supports exact v1/v2 paths; bootstrap compares selected current/frozen bytes and runSupervisor forwards own.protocolPath explicitly to reopenInputs, no arbitrary path or implicit v1 fallback for v2. |
| M `run-supervisor.mjs` | makeManifest version/policy, create monitor with phase/policy, pass expected driver protocol binding and final outcome fields. |
| M `run-driver.mjs` | Read selected archived protocol path from identity, validate v2 policy/manifest before SDK work; bind bridge version. |
| M `supervisor-protocol.mjs` | Optional expected evaluationPolicy/recordSchemaVersion, default strict v1, private ctx binding for driver only. |
| M `driver-protocol.mjs` | Exact versioned hello/start fields, prevent mismatch before start; existing fault/sequence/ordinary barriers unchanged. |
| M `driver-bridge.mjs` | Bind hello/start version/policy against validated manifest; preserve untrusted PhaseResult and finish/close contracts. |
| M `driver-bridge-wire.mjs` | Strict versioned start envelope check only; same callbacks/waits/debts/STOP logic. |
| M `cli.mjs` | Verified v2 JSON projection and existing exitCode; exact syntax unchanged, no relaxed flag. |
| C `/train/fixtures/browser-protocol-v2.json` | Section8 exact fixture, same science/limits, prospective policy; v1 fixture never edited. |
| M `/train/scripts/check_browser_parity.py` | Recognize exact v2 fixture path, workspace/manifest version/policy binding before archive exec, same original90s and byte checks. |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `separate-verdicts-compat.test.mjs` | Exact v1/v2 fixture/schema/identity/driver/prereq/CLI/parity controls, including fresh-process capture/reopen with both fixtures present, selected-policy roundtrips and every mixed/missing/wrong path/hash/policy negative. |


## Task 10: V2 operator, readback, inert release and complete scripted validation

Dependency: reviewed Task9. Create only new operator/readback/owner-controls/template; preserve all six old helper bytes and receipts. Bind exact v2 runtime/protocol/candidate/safety identities, fresh helper-compatible UUID roots, actual closure separately from unchanged raw ownerSucceeded, exit2 readback and graph-verified eligible/inconclusive semantics. Template stays PREPARATION_ONLY with candidate/safety/runtime/path/hash null until Root release. RED/GREEN synthetic ownCommand controls prove exit0/2/7, missing pipe/raw/journal, sink and manager failures, root collisions/mixed releases and missing graph cannot claim eligibility. Run the new separate-verdicts-owner-controls-v2.mjs directly with qualified Node as a SCRIPTED control, not a phase. Its exact argv/inputs must be reviewed before use; it must not auto-launch another phase. Reuse separate-verdicts-test-fixtures.mjs and separate-verdicts-compat.test.mjs only for operator binding/causal tests. Then run the complete explicit SCRIPTED owner roster below serially, app test:scripts/test:core, typecheck and required Python commands. Actual Native owners are withheld for Task11 and Root GO. Runtime commands must be owned with actual closure receipts; no implicit glob.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `separate-verdicts-test-fixtures.mjs` | TEST-only v2 workspace/monitor/clock/scripted transport fixtures, no relaxed verifier. Retain explicit actual debt teardown. |
| C `separate-verdicts-compat.test.mjs` | Exact v1/v2 fixture/schema/identity/driver/prereq/CLI/parity controls, including fresh-process capture/reopen with both fixtures present, selected-policy roundtrips and every mixed/missing/wrong path/hash/policy negative. |
| C `W/separate-verdicts-owned-command-v2.mjs` | New explicit v2 release loader/operator derived from task-3-owned-command.mjs. Same original constraints/branch/input safety, count-only owner and one-cohort claim; exact v2 protocol path, policy and runtime binding; reuse unchanged ownCommand. Preserve raw ownerSucceeded, derive ownerClosureVerified from actual joins/bytes/journal/no-intervention/no-manager-errors. Run exit2 still receives readback; eligible evidence requires the v2 verifier, never ownerSucceeded. No automatic next phase; use exact fresh helper-compatible roots from section9. |
| C `W/separate-verdicts-verify-phase-v2.mjs` | New readback derived from task-3-verify-phase.mjs using frozen v2 verifyReceipt, exact version/policy/runtime/release/completion identity and physical verifier lifetime. Output final/closure verdicts, authoritativeGraphVerified, ownerClosureVerified, scientificEvidenceEligible; verifier exit0 means successful readback only, experiment exit remains separate. Missing graph cannot produce eligible output. |
| C `W/separate-verdicts-owner-controls-v2.mjs` | New operator tests using unchanged task-3-control-child.mjs and ownCommand under exact fresh task-3-owner-controls-<UUID>/<case> roots; prove child exit0/2/7 and missing pipe/raw/journal/manager failure semantics; synthetic final graphs cannot be called Native/cohort proof. |
| C `W/separate-verdicts-release-v2.template.json` | Inert PREPARATION_ONLY template. Exact old release keys with schemaVersion2 plus evaluationPolicy, protocolRef and runtimeIdentity. protocolRef is actual v2 fixture ref; runtimeIdentity is exact Node/Python descriptors from safety/CommonIdentity. Candidate/safety/runtime/path/hash values remain null until future controller release. Hash-bind exactly new operator/verifier/controls plus unchanged task-3-stream.mjs/task-3-process-owner.mjs/task-3-control-child.mjs. No old release accepted. |

### Task10 exact scripted owner command (future, reviewed frozen inputs only)

The current77-file inventory has76 scripted owners and one actual Native owner. `native-attribution.test.mjs` and `native-attribution-verdict.test.mjs` use fake child events/no-spawn constructor controls; `supervisor-protocol-native.test.mjs` uses the real validator with scripted records. They stay scripted. Add the six new scripted owners explicitly. Do not silently replace this roster with a glob.

```sh
"$TINYAZ_NODE" --test --test-concurrency=1 --test-timeout=90000 \
  train/scripts/browser_eval/accounting-trace-io.test.mjs \
  train/scripts/browser_eval/accounting-trace.test.mjs \
  train/scripts/browser_eval/artifact-store.test.mjs \
  train/scripts/browser_eval/await-stage.test.mjs \
  train/scripts/browser_eval/browser-transitions.test.mjs \
  train/scripts/browser_eval/browser.test.mjs \
  train/scripts/browser_eval/canonical-json.test.mjs \
  train/scripts/browser_eval/checks.test.mjs \
  train/scripts/browser_eval/cli-shutdown.test.mjs \
  train/scripts/browser_eval/completion-publication.test.mjs \
  train/scripts/browser_eval/driver-bridge-lifecycle.test.mjs \
  train/scripts/browser_eval/driver-bridge.test.mjs \
  train/scripts/browser_eval/driver-diagnostics.test.mjs \
  train/scripts/browser_eval/driver-ipc.test.mjs \
  train/scripts/browser_eval/environment-files.test.mjs \
  train/scripts/browser_eval/environment.test.mjs \
  train/scripts/browser_eval/failed-cleanup.test.mjs \
  train/scripts/browser_eval/final-integrity.test.mjs \
  train/scripts/browser_eval/fixture-transform.test.mjs \
  train/scripts/browser_eval/listener-query.test.mjs \
  train/scripts/browser_eval/match.test.mjs \
  train/scripts/browser_eval/native-attribution-verdict.test.mjs \
  train/scripts/browser_eval/native-attribution.test.mjs \
  train/scripts/browser_eval/page-arm.test.mjs \
  train/scripts/browser_eval/pgn-evidence.test.mjs \
  train/scripts/browser_eval/pgn-summary.test.mjs \
  train/scripts/browser_eval/phase-fixtures.test.mjs \
  train/scripts/browser_eval/phase-runners.test.mjs \
  train/scripts/browser_eval/prerequisites-evidence.test.mjs \
  train/scripts/browser_eval/prerequisites.test.mjs \
  train/scripts/browser_eval/private-fs-phase.test.mjs \
  train/scripts/browser_eval/private-fs.test.mjs \
  train/scripts/browser_eval/process-backend-reader.test.mjs \
  train/scripts/browser_eval/process-backend-setup.test.mjs \
  train/scripts/browser_eval/process-backend.test.mjs \
  train/scripts/browser_eval/process-budget.test.mjs \
  train/scripts/browser_eval/process-lifecycle.test.mjs \
  train/scripts/browser_eval/process-lsof-fields.test.mjs \
  train/scripts/browser_eval/process-lsof-io.test.mjs \
  train/scripts/browser_eval/process-lsof.test.mjs \
  train/scripts/browser_eval/process-observation.test.mjs \
  train/scripts/browser_eval/process-ownership.test.mjs \
  train/scripts/browser_eval/process-transport.test.mjs \
  train/scripts/browser_eval/processes.test.mjs \
  train/scripts/browser_eval/receipt-publication.test.mjs \
  train/scripts/browser_eval/record-cleanup-diagnostics.test.mjs \
  train/scripts/browser_eval/record-evidence.test.mjs \
  train/scripts/browser_eval/record-lifecycle.test.mjs \
  train/scripts/browser_eval/record-schema.test.mjs \
  train/scripts/browser_eval/records-finalization.test.mjs \
  train/scripts/browser_eval/records.test.mjs \
  train/scripts/browser_eval/reference-child.test.mjs \
  train/scripts/browser_eval/run.test.mjs \
  train/scripts/browser_eval/server.test.mjs \
  train/scripts/browser_eval/snapshots.test.mjs \
  train/scripts/browser_eval/stats.test.mjs \
  train/scripts/browser_eval/supervisor-protocol-lifecycle.test.mjs \
  train/scripts/browser_eval/supervisor-protocol-native.test.mjs \
  train/scripts/browser_eval/supervisor-protocol.test.mjs \
  train/scripts/browser_eval/terminal-consumers.test.mjs \
  train/scripts/browser_eval/terminal-identity.test.mjs \
  train/scripts/browser_eval/watchdog-boundaries.test.mjs \
  train/scripts/browser_eval/watchdog-cleanup.test.mjs \
  train/scripts/browser_eval/watchdog-driver-boundaries.test.mjs \
  train/scripts/browser_eval/watchdog-evidence-boundaries.test.mjs \
  train/scripts/browser_eval/watchdog-finish-ordering.test.mjs \
  train/scripts/browser_eval/watchdog-integrity-selftest.test.mjs \
  train/scripts/browser_eval/watchdog-integrity.test.mjs \
  train/scripts/browser_eval/watchdog-native-fault.test.mjs \
  train/scripts/browser_eval/watchdog-prior-evidence.test.mjs \
  train/scripts/browser_eval/watchdog-records.test.mjs \
  train/scripts/browser_eval/watchdog-resource.test.mjs \
  train/scripts/browser_eval/watchdog-selftest-evidence.test.mjs \
  train/scripts/browser_eval/watchdog.test.mjs \
  train/scripts/browser_eval/workspace-footprint-directory.test.mjs \
  train/scripts/browser_eval/workspace-footprint.test.mjs \
  train/scripts/browser_eval/resource-quality.test.mjs \
  train/scripts/browser_eval/separate-verdicts-monitor.test.mjs \
  train/scripts/browser_eval/separate-verdicts-terminal.test.mjs \
  train/scripts/browser_eval/separate-verdicts-records.test.mjs \
  train/scripts/browser_eval/separate-verdicts-recorder.test.mjs \
  train/scripts/browser_eval/separate-verdicts-watchdog.test.mjs \
  train/scripts/browser_eval/separate-verdicts-compat.test.mjs
```


## Task 11: Root-released serial harness and genuine Native controls

Dependency: Task10 green plus fresh scoped source/code-doc Max review and a separate Root control-execution GO bound to exact frozen runtime/candidate/inputs. Only Root executes/polls; all others quiescent. Implement/review the declared genuine separate-verdicts-native.test.mjs using existing native fixture/lifetime factories and a transparent bounded TEST Node delivery delay on one periodic reply. Keep actual transport/validator/receipt and original Native60s/55s work/5s cleanup,10s actor/4MiB bounds. Do not claim delay is fake Native timing or historical repair. Run one full explicit serial owner command formed from the Task10 exact roster plus `train/scripts/browser_eval/native-supervision.test.mjs` and `train/scripts/browser_eval/separate-verdicts-native.test.mjs`, same qualified Node --test --test-concurrency=1 --test-timeout=90000. Require original actual Native14 receipt inventory plus every new actor real exit/BOTHpipe/body/descriptor settlement and strict/cap controls. Then one reviewed current-byte archived CLI controlled cap under unchanged controlled operator constraints, genuine Native/environment and actual closure. Root pins the exact controlled-cap argv in its future GO from actual current helper interfaces; do not guess one now or invoke an old v1 release against v2. Preserve original guard bounds, all failed evidence and cap exit2 semantics. No automatic retry, synthetic join, actual scoring/prerequisite phase or cohort proof.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| C `separate-verdicts-native.test.mjs` | Genuine Native short controls using existing native fixture/lifetime factories; original bounds and actors' receipts. |


## Task 12: Whole-change fresh review, warning triage and publication candidate

Dependency: Task11 actual gates and fresh scoped Max review. Root dispatches fresh Max whole-change source/spec/code-doc review from original `a74c988ec9688f1b6880443b34d4c7a06831590b` through the new candidate, independently of prior scoped reviews. Triage original deferred Minor M1/M2 warning findings and M3 introductory-comment finding explicitly; preserve deliberate warning controls and avoid source rewrites absent an actionable defect. A bounded fix wave may touch only the specific approved section9 owners named by Root in that wave brief (subset of Tasks5-11, no added file); require causal RED/GREEN, affected owners and a fresh review before refreezing. Final diff/code-doc/line-cap/protected audit, green local commit and Root-reviewed feature publication candidate are distinct gates. Document results in the seven shared docs and fresh W evidence; no full40 release follows automatically.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| M `/README.md` | Current direction/proposal vs approval vs implementation vs fresh run; separate authoritative verdict/exit usage. |
| M `/train/scripts/README.md` | Versioned command/protocol and nonzero eligible semantics, original bounds. |
| M `/train/scripts/browser_eval/README.md` | Complete APIs/state/schemas/allowlist/runtime union, limits, compatibility, handoff and before-use TEST declarations. |
| M `/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md` | Append approved amendment and exact file map only after user approval; preserve earlier historical requirements. |
| M `/docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md` | Buildable phased tasks, test ownership and final code/doc comparison gates. |
| M `/docs/experiments/tinyaz-software-plan.md` | Preserve failed cohorts; record proposed/approved/implemented/verified/released results separately. |
| M `/docs/experiments/README.md` | Update experiment index pointer/status only, without a strength claim. |


## Task 13: Fresh runtime/candidate/policy release, strict parents and one full40

Dependency: reviewed/published Task12 candidate, Root fresh qualified runtime/candidate/policy release. No tracked source/config/test writes. Only fresh generated release/handoff/receipt artifacts within approved section9 roots and one new external v2 workspace. Root sole executor releases CHECK, then PARITY, then PREFLIGHT separately through the new exact v2 operator and verifies each actual closed graph with same-policy/identity, passed0 and phase/closure resource passed. Use unchanged phase aliases/CLI syntax with explicit --protocol train/fixtures/browser-protocol-v2.json; parity uses train/.venv/bin/python train/scripts/check_browser_parity.py with that explicit selection under qualified PATH. The future v2 release/GO pins the exact reviewed argv and fresh paths before IO. No old owner/release/receipt/prerequisite reuse. Only after all strict parents pass does Root separately release ONE new 40-game/20-pair/64-visit compare. Earlier user authorization already permits comparison after repair; Root releases are operational gates, not new design approval. Preserve24h and all shorter original watchdog/cap/cleanup guards. Count-only progress, no partial outcomes/PGN inference or tuning. Require actual final/completion graph, original-input equality and actual owner closure before paired-sign-cp95-v1 analysis. An exit2 eligible/inconclusive cohort requires v2 graph readback/ownerClosureVerified, never ownerSucceeded. Failed/interrupted/unsealed work stays ineligible. No automatic retry, new cohort or Task3 completion without valid full40.

No tracked-file write allowlist. Generated artifacts use only the approved section9 fresh roots.

## Task 14: Actual result documentation, handoff and feature publication

Dependency: Task13 authoritative result or explicit failed-gate handoff. Update actual result/status/receipt pointers, separate strength/phase-resource/closure-resource/aggregate/exit and scope, gap count/max, observed/admitted peak, exact policy/candidate/runtime and real exit/BOTHpipe/rawfile/journal/cleanup closure. Describe partial counts only as descriptive and retain old failures. Final direct code-to-doc comparison against approved v2 and actual implementation, final protected23/M/wholeSection3 audit and fresh Max review, then green result-doc commit and Root-authorized feature publication/handoff. No merge, deploy or retraining. Task3 and the full40 objective remain incomplete without a valid full40 result; no absolute Elo claim.

| Action/path | Symbol, action and rationale (approved section9) |
| --- | --- |
| M `/README.md` | Current direction/proposal vs approval vs implementation vs fresh run; separate authoritative verdict/exit usage. |
| M `/train/scripts/README.md` | Versioned command/protocol and nonzero eligible semantics, original bounds. |
| M `/train/scripts/browser_eval/README.md` | Complete APIs/state/schemas/allowlist/runtime union, limits, compatibility, handoff and before-use TEST declarations. |
| M `/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md` | Append approved amendment and exact file map only after user approval; preserve earlier historical requirements. |
| M `/docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md` | Buildable phased tasks, test ownership and final code/doc comparison gates. |
| M `/docs/experiments/tinyaz-software-plan.md` | Preserve failed cohorts; record proposed/approved/implemented/verified/released results separately. |
| M `/docs/experiments/README.md` | Update experiment index pointer/status only, without a strength claim. |

### Task 5 staging guard declaration (2026-11-10)

Root authorized a minimal early change in the already declared Task8 owner `train/scripts/browser_eval/record-inputs.mjs`: `captureRecorderInputs` rejects non-v1 workspace/manifest and `validateRunningInput` rejects non-v1 running records until complete Task8 integration. This guards the existing v1 Recorder from mixed-version publication while the pure schema validators accept closed v2 data. It adds no IO, writer or publication authority. Genuine Recorder negative controls belong to `separate-verdicts-records.test.mjs`; positive v2 publication remains Task8. The accepted normative amendment projection stays unchanged.

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


### Task6 Root execution clarification (2026-11-10)

The Task6 checkpoint is a behavior-preserving whole-group extraction. Establish genuine strict-v1 characterization before moving production code, then run identical inputs afterward. Do not manufacture RED through a missing import or intentional production breakage. Task6 table descriptions of periodic purpose/deadline metadata, continued sampling after quality loss, typed v2 routing and policy-correct running version are eventual Task7 roles. Task6 changes none of those behaviors. Keep original references, error paths, cadence, physical debts and Task5 Recorder staging. The owning README declares exact extraction signatures and unchanged TEST factory re-exports.


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


### Task7 review-fix component seam declaration (2026-11-10)

Root approved mechanical whole-facade factoring in existing watchdog.mjs.
Internal `createWatchdogFacade({config,capabilities},runLifecycle=runWatchdogLifecycle)`
trusts already-captured component inputs and retains the original shared
state/timing/control/operations/cleanup/lifetime and callback order. Public
`createWatchdog(options)` performs the exact existing config capture and delegates
with the original lifecycle default; no new public option or validator bypass.
The TEST-only lifecycle collaborator may drive real facade admission, fault,
stop, original cleanup capture and actual owned settlement with controlled IO.
It cannot establish a normal v2 runtime, Recorder publication, graph or Native
result. Real Recorder WeakMap ownership and v1-only staging guards remain intact.
The existing separate-verdicts fixture and watchdog TEST owners own these controls;
no new file/owner is introduced. Original operational ms timing/containment remain
on the existing clock origin. Exact ns quality capture must fail closed without
becoming the fault/stop/cleanup clock or fabricating a quality timestamp.


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


### Task8 before-use capacity and API declaration (2026-11-10)

Root authorizes three focused leaves under the Task8 brief, preserving the
approved policy and every existing owner. `record-finalization-v2.mjs` exports
pure `compileFinalV2(input)` over captured head/identity/cleanup/request/checks,
actual closed artifacts/events and verified parent graphs; it calls the existing
PGN evidence/statistics owners before resource aggregation. It returns frozen
`{final,facts}`, with no IO, Native, writer or publication authority.
`receipt-verification-v2.mjs` exports `readVerdictEventsV2({workspaceRoot,eventsRef,headFields},io)`
and `verifyReceiptVerdictsV2({workspaceRoot,workspace,manifest,running,final,completion,inventory,parents,nested},io)`.
The first performs confined hash-bound event reads through existing receipt IO
and the same inherited registrar. The second reconstructs captured facts,
checks versions/policy/strict parents and nested scope, invokes the same pure
compiler and `verifyVerdictClosure`, and returns no publication capability.
It owns no Store, queue, lifetime, Native probe or independent verifier.
`separate-verdicts-recorder.test.mjs` owns genuine Recorder/Store/prepared graph,
publication/readback and prerequisite controls with controlled science fixtures.
It executes with the original eight Task8 owners and joins actual writer/body
debts. Its tests make no Native, browser, model, phase or cohort claim.

Version2 input construction replaces the temporary both-v2 rejection only as
this integration lands. The original pure records owner retains v1 golden and
mixed-version controls. Task9 must add both new runtime leaves to its functional
snapshot union. Task10's exact scripted roster includes the new recorder TEST
owner. No operational archive, CLI, phase or release qualification follows.


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


### Task9 before-use selection declarations (2026-11-10)

Task9 reuses the approved evaluation-policy and identity-schema owners.
`assembleSnapshotIdentity` explicitly defaults protocolPath to the v1 fixture
and evaluationPolicy to null; explicit v2 requires both exact arguments.
Capture validates the selected fixture and retains that binding for final
measurement. Reopen accepts an optional requested protocolPath (v1 default),
validates workspace/version/policy/ref and actual selected bytes, then rebuilds
the whole identity with both arguments. Presence of both fixtures selects nothing.
The prospective fixture preserves every v1 science/limit field.

The new `separate-verdicts-compat.test.mjs` is TEST-only. It owns selection,
version/policy/driver binding, verified CLI projection and isolated Python
admission controls. Fresh-process controls execute real snapshot/Git/file/body
owners with explicitly controlled environment acquisition, never permissive
identity/graph verification. Every subprocess owns actual wait/BOTH EOF and
raw files. Synthetic environment facts are not Native qualification.
The exact new fixture and compat TEST paths were absent before declaration.
Evidence root is W/`separate-verdicts-implementation-evidence/63022b8a-a92e-4059-82d9-3aaa1257fdc8/`.
Runtime leaves include all Tasks5/6 additions plus Task8 compiler/receipt leaves;
TEST leaves stay excluded. Task9 source integration remains in progress, with
Root review and separate execution releases open.


Task9 Root mechanical rulings, declared before use: the complete plain const
S2D_FIELDS object moves unchanged from driver-bridge-wire.mjs into existing
driver-protocol.mjs, with one internal export/import. V1 arrays/order stay exact;
v2 start extends a fresh field array. Same callback/debt/lifecycle references.
The narrowly admitted snapshots.test.mjs updates only the obsolete114/sorted
union assertion to original-prefix/exact12-additions/unique/files checks, writes
valid selected protocol DATA in its complete fixture and supplies exact new AST
bootstrap import bindings. All new behaviors belong to compat.test.
watchdog-runtime.mjs changes only the existing actual start-envelope construction
(the other start literal is its bounded-wait label) to carry exact v2 policy and
version. Both top-level and nested execution reach this same constructor.
Causal producer controls execute its actual extracted body against strict protocol
validation; no callback, wait, bound, STOP or debt changes. No new source path.


Task9 capacity declaration before creation: `separate-verdicts-compat-fixtures.mjs`
is TEST-only. It exports `child(executable,args)` (actual child exit/BOTH EOF,
optional fsynced/closed raw/hash receipts under the inherited TEST evidence root),
`snapshotChild(mode,workspaceRoot,protocolPath,extra={},repoRoot=SOURCE)`
(actual current/archived snapshot owners in a fresh process, controlled
environment-acquisition module hook only), `createCompatRepo(root)` (new temporary
Git worktree-shaped repository, actual runtime/source/Python/model byte copies,
shared read-only dependency link and existing baseline-object alternates), and
`writableRemove(root)` (only owned temporary-tree teardown after child closure).
No model decoding, Native, browser, phase, proof/graph verifier substitute or
production options are created. Real environment/archived CLI qualification stays
open. Task9 and Task10 reuse this helper through the single compat TEST roster
entry. It is excluded from RUNTIME_PATHS. Failed controls remain retained.


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


### Task9 R1 narrow filesystem TEST declaration (2026-11-10)

Before-use Root consumer-count ruling admits only the stale closure count in
`train/scripts/browser_eval/private-fs-phase.test.mjs`:114 becomes126. Every other
byte, including all asynchronous-filesystem checks over each runtime module,
remains exact. The whole owner runs RED then GREEN under the qualified Node,
serial test execution and original 90000ms file guard. Production, compat helper
and compat TEST implementations remain unchanged. The earlier Task9 code-to-doc
comparison missed this consumer and omitted helper return/error details; R1
corrects those findings without changing approved requirements or proof limits.


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


### Task10 before-use operator TEST declaration (2026-11-10)

The new v2 W operator/readback/owner-controls and inert template are prospective
operator code. They reuse the immutable ownCommand and stream/child helpers.
They do not authorize execution. Owner controls have one explicit command,
`<qualified-node> W/separate-verdicts-owner-controls-v2.mjs --controls
W/task-3-owner-controls-<fresh-UUID>`, optionally `--red-v1-closure` for the
causal legacy-success RED. Roots are canonical absent UUID directories, created
exclusively; collisions reject. Exactly normal/exit2/nonzero/sink cases may run.
The unchanged child accepts0/7. Exit2 uses Root's approved fixed eval module:
record real eval argv, adapt process.argv to the unchanged child's exit0 argv,
await that body's import, assert its exit0, then request natural exit2.
No body/import failure is masked. Sink recovery stays in unchanged ownCommand.

The existing TEST-only createV2RecorderWorkspace(t,options={}) gains optional
`workspace` (default v2Workspace()) and `archivedFiles` (default empty array).
Each archived file is `{path,bytes}` with a repository-relative runtime path and
Buffer bytes. It writes each once through the genuine Store below inputs/harness,
then writes the selected workspace and ordinary fixture inputs. It resolves the
same environment object; Store/write/schema failures reject with existing errors.
Existing teardown still closes every Recorder, joins the actual Store lifetime,
then removes only its owned temporary tree. These options supply scripted
identity/runtime bytes for graph binding, never environment or Native proof.

The already authorized compat-fixtures helper owns new operator graph constructors
and binding scenarios used only by compat.test. They copy released runtime bytes
into the temporary workspace, build real Recorder/Store prerequisite/selftest/
compare publications, and invoke the actual new frozen readback function.
Scientific game/check/cleanup/environment facts remain synthetic collaborators.
No production verifier substitution, phase, Native helper or inference runs.
The component graph can test eligible/inconclusive2 handling but establishes no
actual cohort result. Missing graphs and mutated release/runtime/policy/exit/raw
bindings must reject, and all helper debt teardown remains mandatory.


### Task10 Root mechanical TEST grouping clarification (2026-11-10)

This supersedes only the preceding Task10 TEST placement description.
The83 ordinary scripted roster retains every pre-Task10 compat case unchanged,
without importing ignored W code or requiring control receipts/environment.
The explicit W owner-controls command owns the operator-binding and both real
graph/readback positive/negative cases after its four just-created child receipts.
It passes an explicit controlRoot and exact imported operator/readback modules.
No tests skip, no extra child or phase launches, and no W import occurs in the
ordinary compat helper. The minimal after(callback) registrar collects existing
factory teardown callbacks and actually awaits all of them before success.
It provides no alternate lifetime or physical proof.

`operatorGraph(t,{gap=true,operator})` resolves `{env,workspace,archivedFiles,
verified}` after genuine Store/Recorder parent, scoped selftest and40 synthetic
game publications/readback. The explicit operator supplies the exact selected
protocol constant. Actual runtime bytes are read from this checkout and written
once as archivedFiles. All scientific/cleanup/environment collaborators remain
synthetic. Store/schema/read/verification failures reject with original errors.

`operatorReadbackFixture(t,{gap=true,operator,controlRoot})` requires explicit
controlRoot, consumes unchanged normal/exit2 owner receipts/raw/journal bytes,
creates an owned temporary compare readback directory, and resolves the graph
fields plus `{release,command,owner,verifierOwner}`. Release/command identity
context is explicitly synthetic; exit/pipes/errors are copied from the actual
control receipt. The separate original receipt path/hash and exact overlay fields
are written in exclusive synthetic-context.json. verifierOwner is the actual
normal exit0 control receipt composed with actual in-process graph readback.
This does not claim that its process executed the verifier. Original receipts
are unchanged. Missing files, invalid closure/exit and any IO/assertion failure
reject. Caller awaits genuine factory teardown callbacks and temp-tree cleanup.
These are component eligibility/decision controls, not Native or cohort proof.

The allowed evidence-only nonce/run-gate.py owns one explicitly listed command
per invocation, preserving failed attempts, actual wait/BOTH EOF/raw-file and
journal fsync/close, and full before/after maps including newW4+old6 and itself.
It inherits environment except safe documented explicit overrides, adds no
kill, retry, time limit or phase authority, and requires Root's static GO.


Task10 before-use ownership clarification: run-gate input maps also bind its
static-review.json configuration authority and manager/runtime bytes. Raw writes
loop over actual returned counts, retain observed versus written counts, and
check physical file size. Sink/journal event errors remain manager errors while
the normal read/drain/wait continues. No failed sink becomes eligible even when
all child streams later close. Exceptional unreadable-pipe, selector or wait
errors may leave actual child settlement unproven; the receipt records that
failure, never invents EOF/wait or sends signals to recover it. The manager has
no timeout/kill/retry authority. Every registered graph teardown is attempted
serially even after body/earlier-teardown failure; all failures are retained in
a final AggregateError, and no success summary is emitted for that command.


### Task10 post-gate repair declaration (Root, before use, 2026-11-10)

The original83-owner gate failed1010/1018. Seven old CLI-shutdown scenarios
used synthetic protocol refs for real copied bytes. The strict pre-SDK production
ref guard remains correct. One delayed-P strict-v1 case exposed an unintended
Task7 primary-fault-order change. Accepted e78 compatibility preserves v1's exact
historical meaning; the later README strengthened-fence qualification did not
authorize changing that first-fault order. Original evidence remains failed.

Only these three additional repair owners are admitted before use:
- cli-shutdown-test-fixtures.mjs binds its workspace CommonIdentity protocol ref
  to the actual copied v1 relative path, raw byte length and SHA256 before writing
  workspace/control data. Its arguments, returned paths, all modes/hooks and
  synthetic Native/environment proof limits stay unchanged. No v2 extension.
- failed-cleanup.test.mjs changes only the final delayed-P case to a labelled
  +50/+150 pair over the same real monitor/wire/lifetime. C=+500/P=+100 stays
  unchanged. Both public samples reject across the existing return fence. +50
  proves actual on-time ordinary drain and no spurious first accounting fault.
  +150 retains public CLEANUP_UNPROVEN, first sticky CLEANUP_UNPROVEN and one
  shutdown. All actual waits/teardown remain; earlier tests stay byte-exact.
- process-observation.mjs removes only the unconditional current.stopping throw
  after the existing quality-fence branch, after causal paired RED. The complete
  v2 fence/cap-positive block remains byte-exact. Strict-v1 interval, first sticky
  fault, live-handle, original commit/drain and P/C checks retain their meaning.
  processes.call's public return/admission/queue/actual-debt guards stay untouched.

StageA prepares only fixture and paired TEST, observer unchanged, then requires
a new Root GO for focused scripted CLI GREEN and paired cleanup causal RED.
StageB follows actual RED/closure, removes only the named observer line, and
requires another Root GO for focused cleanup GREEN, one fresh83 roster and one
fresh W-control GREEN with fresh helper-compatible UUID and archive-byte pins.
No original legacy RED or already-passing app/core/Python repetition is implied.
No additional source/path, Native/public archived-CLI cap/phase/cohort/runtime or
publication release is granted. All prior commands/configs/maps/failures remain.


Task10 second CLI-fixture alignment (Root, before use): StageA focused CLI
remains FAILED2/9 after actual-ref correction, now at the existing TEST clock
versus protocol-literal mismatch. The same allowed fixture helper will serialize
ONLY its temporary v1 protocol limits.timing.phaseMs.check as8000 before readonly
sealing and raw-length/SHA binding. This matches the existing exact synthetic8s
schema-constants preload hook. Repository v1 fixture, production constants,
validators, policy selector and all hooks stay byte-exact. All other protocol
fields stay equal to the repository fixture. These scripted short-clock cases
establish lifecycle behavior, not an unchanged-fixture or actual phase/Native
qualification. The genuine driver still validates exact selected bytes/version/
policy and the existing synthetic limits. Earlier failed gates remain failed.


Task10 final paired-TEST scheduling seam (Root, before use): the final +50/+150
controls alone wrap the existing collector stdin.write. Only a decoded outgoing
shutdown write defers the ORIGINAL write to queueMicrotask with exact args,
this and callback; all other writes execute immediately. The original scripted
child/validator still supplies exit and BOTH closes, and the original owner is
actually joined. This removes impossible same-stack OS-exit reentry before
transport ended=true. It adds no timer, grace, production transport/global
fixture change or alternate settlement. All public-fence/+150 first-cleanup/
once-shutdown/P100/C500 expectations remain. No Native proof follows.

The corrected final TEST must itself run causal RED on the frozen old observer
profile d6f0d018, then after actual closure restore only its missing line to the
fixed profile1b39ab94 for focused GREEN, whole83 and fresh W GREEN. Profiles
differ in exactly that one unconditional postreply stopping throw; the full v2
fenced block remains exact. Each command requires Root's exact reviewed source
profile/argv/inputs GO, preserves failures and has no automatic retry. Previously
passing9/9 CLI and app/core/Python stages remain separate results, not rerun
solely for this final TEST-only scheduling correction.


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

Owning contract: [exact v2 root grammar and diagnostics](../../../train/scripts/browser_eval/README.md#task10-r1-exact-root-grammar-and-diagnostic-disclosure-2026-11-10).

### Task11 source-preparation interface ruling (2026-11-10)

Before source use, admit only two minimal factory adaptations: native-fixture-
admission createMonitor forwards optional evaluationPolicy=null/phase=null to
its same genuine monitor, and cli-shutdown-test-fixtures accepts exact v1(default)
or v2 protocolPath with matching workspace version/policy and selected actual
8s TEST protocol byte ref before sealing. No other existing TEST source edit.
Owning README/spec contain full signatures/defaults/returns/errors/IO/proof limits.

Prepare planned separate-verdicts-native.test.mjs with genuine Native/transport/
validator/handles/lifetime/clock/bytes, original60s group55s work5s cleanup,
10s actor4MiB. One transparent650ms real periodic Node delivery hold per compare
and strict-v2-check control; same bytes/order/original receipt, actual delayed
body settlement, sticky compare loss and later timely cleanup, strict hard fault
and genuine physical teardown. No Native/RSS fabrication or4GiB allocation.

Prepare admitted W/actual-native-cap-v2-control.mjs (local writeClosed,
observeCollectorHook,runCap; no exports): fresh exclusive UUID argv root,
current genuine captureEnvironment with original90s setup budget/lifetime and
actual debt join even on error; exact v2 fixture/identity; existing controlled
SDK/body/input reopen; synthetic8s check/actual5s Native cleanup; actual CLI,
driver,collector exit/BOTH closes and owner/body settlement; raw/readback
fsync+close. Independent20s containment records before TERM and must stay unused.
Natural2/PHASE_TIMEOUT and zero unrelated faults define TIME-cap evidence.
Scripted RSS-positive/at-limit/post-fence controls stay scripted, never actual
Native RSS-overage evidence. No old environment/workspace/release reuse.

Freeze full source supplement/diff/pins, exact85 argv (Task10 explicit83 plus
originalNative/newNative), cap argv/fresh root, unchanged170-line Task10 manager
and new static config. Root dispatches fresh isolated Max source/code-doc review
BEFORE actual Native, then issues separate exact GO to its sole executor.
No runtime/tests/imports/phase/network/commit/publication during source prep.
After actual Root receipts, compare final code and docs, audit protected23/M/
wholeSection3/e78/approval/oldhelpers/NativePython, preserve all failures, update
seven shared docs with actual proof limits and make one green local commit.
Task11 stays incomplete until actual gates and fresh completion review pass.

Task11 explicit-v2 only: add selected actual temporary protocol artifact ref to
sorted inputs.harness.files in control.json, matching workspace byte/path/SHA
with inputs/harness/ prefix. Controlled reopen forwards the same inputs/workspace
into genuine version/policy/commonIdentity-SHA manifest construction; generic
fixture refs remain synthetic. V1 default inputs stay exact. No snapshot waiver.

Task11 source fix R1 I1, source preparation only: replace the two rejecting
logical persistence-Promise retainers with existing issueActual neutral raw
receipts plus openActual's separate genuine OwnedFile close debt. Use existing
writeAll partial-write loops/sync/actual close and preserve first arbitrary
error via presence flags. Successful close after write/sync failure releases
physical debt but fails the control; ambiguous open/close remains held. Preserve
setup error report and all original bounds. Map existing covering assertions,
freeze fix-only diff against E33461fd3 reviewed source snapshot and new UUID
manager/config/pins/full source. Fresh scoped Max review precedes any execution;
all runtime/test outputs stay future, no green commit during preparation.

Task11 source R2 I1: the R1 statement that ambiguous close stays held was not
established for its selected Node FileHandles. A logical idempotent second-close
fulfillment could falsely retire descriptor debt. Preserve that failed history;
change ONLY both TEST persistence open calls to existing privateFs.open beneath
same neutral/OwnedFile/writeAll owners. Its original ambiguous-close rejection
and no-second-OS-close guard remain unchanged. Map private-fs.test79-116 to this
selected backend, without execution. Fresh fix-only diff versus R1 supplement,
new UUID/same manager/exact85/cap shape, scoped Max review and separate Root GO
remain required. No production/helper/factory/Native/delivery/bound edits.

Task11 runtime-fault R3 before-use scope: preserve actual1021/1021 Native85 and
14+3 actual actor receipts, no repeat. Actual cap failed/intervened before CLI:
basename setup copying collided at RECORD; no actual historical error/JS stack
captured and descriptor proof remains UNPROVEN. Failed root/evidence stay exact.
Repair ONLY W cap copy/local persistSetup(fresh,out,lifetime,budget): prevalidate
unique confined complete target plan (including file/directory conflicts) before
output file opens; preserve full inputs/setup-relative paths and original bytes;
create only needed directories via actual issueActual/privateFs; same writeClosed/
privateFs/openActual/writeAll/sync/close; verify all actual artifact paths/counts/
bytes/hashes and return setupEvidence with derived counts. Keep90s/20s/8s/5s and
all existing ownership/error semantics. No EEXIST waiver or changed helper.
Fresh source-only package uses same170line manager, CAP-ONLY exact argv/fresh
root and unchanged Native dependency attestation. Scoped source Max review then
Root fresh cap GO/GREEN precede final docs/audit/greencommit/completion review.

Task11 R4 readback-close correction (before source use): R3 fixed the RECORD
collision but introduced a separate Important I3. Its issueActual/privateFs.readFile
readback could retire the neutral receipt after opaque fs.readFileSync threw
from an issued internal close, without owning that descriptor separately. R3's
complete setup-close claim was unsupported for this read path; previous write
I1 remains closed. Preserve all prior source/report prefixes and failed evidence.

Only persistSetup readback now reuses existing createBackendReader with the SAME
original setup BudgetHandle, SAME lifetime.retainActual, privateFs.lstat adapter
and existing createPrivateReadStream. Before any stream issue, require the
observed file path in the already validated complete expected-artifact plan.
Derive its byte cap from that artifact's original planned bytes, then invoke
readFact(absolutePath,expected.byteLength,tag,true). The existing reader returns
streamed {sha256,byteLength}, counts/caps chunks, checks stat/restat identity and
owns a preregistered receipt until real stream close. The existing private raw
stream guards each effect and emits physical close only after actual close;
unknown issued open/close remains held through public failure or expiry. No
opaque whole-file read remains in setup inventory readback. Exact full sorted
path/count/byte/hash inventory comparison remains mandatory.

No new reader/module/API/deadline/lifetime/dependency, helper edit or test owner.
Whole-plan-before-IO, hierarchy, writes/first-error presence, original90s setup,
20s independent containment,8s TEST/5s cleanup and Native sources stay exact.
Existing reader/private-FS assertions are mapped without execution in the R4
report. Actual Native85 proof remains retained on unchanged dependencies, with
no repeat. R4 remains SOURCE_READY/unrun pending fresh scoped Max I3/new-breakage
review and separate exact Root cap GO; no green commit or completion claim.


### Task11 R5 timestamp binding repair (before source creation)

Fresh cap3bc32bd1 failed naturally after successful setup hierarchy/readback
(22 setup files/14 RECORDs). CLI natural2/PHASE_TIMEOUT and driver/collector
actual0/BOTH closes do not qualify the cap: SCHEMA_COHERENCE resource event facts
made Recorder sticky; no final/completion exists. Preserve that failed root,
actual raw receipts and all prior failures. No historical result is rescued.

Root admits M `record-schema-v2.mjs` ONLY the resource payload timestamp
coherence predicate: bind legacy `atMonoNs` to `qualityCheckpoint.lastCompleteNs`,
not its later `capturedNs`. This repairs drift from accepted e78 lines142-143.
Actual Native observation completion time and actual checkpoint capture time
retain their separate meanings. Producer, Native clocks/freshness/epoch, ledger,
v1 schema and model bytes remain unchanged. Retain lastTimely<=lastComplete<=
captured, closed fields, graph capture<=final fence and all maximum/counter/
peak/cap reconciliation guards. No approved design decision changes.

Root admits C `separate-verdicts-resource-events.test.mjs`, TEST-only under400
lines, excluded from the runtime union. It uses genuine resourcePayload and real
record schema/graph verification with distinct valid observation/capture clocks,
falsified observation/capture and graph-fence negatives. Existing records and
watchdog tests are unchanged, including capture11/finalFence10 rejection and
v1 golden. No extra helper/module/export/dependency is admitted.

TDD source preparation keeps production OLD. Stage the causal test and inert
old/fixed schema text profiles differing only in the admitted predicate. Freeze
exact SCRIPTED RED, same-test GREEN and related-owner argv with qualified runtime
pins and the same170line manager in a fresh UUID package. Root alone executes
and polls after an exact scripted GO. Only after actual RED closure may Root
promote exact fixed bytes; no automatic chaining or pre-RED activation.

After actual scripted proof, fresh isolated Max source/code-doc PASS precedes
separate exact Root GO for full86 serial owners (exact previous85 plus this
TEST), then another exact GO for one fresh cap. Production changed, so earlier
1021/1021 Native85 remains historical and cannot validate final R5 source.
No app/type/Python repeats without dependency cause. Final code-doc/protected23/
M/wholeSection3/e78/approval audit and all required actual gates precede a green
commit and completion. Preparation executes no Node/Python/import/test/Native,
model/browser/phase/network, commit or push. Task11 remains incomplete.

R5 precise TEST-fixture exception (declared before edit): only two timestamp
assignments in existing resource-quality.test.mjs may change. In the
age-only episode payload, `atMonoNs: "600000010"` becomes
`atMonoNs: captured.lastCompleteNs`. In checkpointGraph, `atMonoNs: cp.capturedNs`
becomes `atMonoNs: cp.lastCompleteNs`. Actual q.noteAge advances capture/age,
not Native completion. Preserve all ledger inputs, capture values, mutations,
assertions and every other byte. These same TEST bytes apply to both OLD and
FIXED profiles; causal before/after input maps differ only at production schema.
No line growth, new TEST helper or runtime union change. All graph negatives,
including capture11/finalFence10, remain mandatory.


### Task11 R5 actual scripted proof and source-review checkpoint

Root's exact SCRIPTED release completed naturally on unchanged TEST bytes.
OLD schema RED was1/4 pass, exit1: valid observation10/capture12 was rejected,
forged observation12 accepted, and the schema prevented the isolated fence
negative. After actual wait/BOTH EOF/raw+journal closure, Root promoted exactly
the inert FIXED313line schema56694779. Only atMonoNs===lastCompleteNs changed.
Same-test GREEN passed4/4 exit0. Related13 owners passed220/220 exit0 in
57.192576709s, no failures/cancelled/skipped/todo. All three commands retained
actual wait/BOTH EOF/fsynced+closed raw/journal, managerErrors[], no signals or
intervention and stable611 OLD or FIXED pins. The maps differ only at schema.
Original records/watchdog/v1 golden, chronology/fence/max/counter/peak/cap guards
and all Native/producer/helper/model bytes remain exact. This is scripted proof.

Promotion's Perl emitter produced two print-spacing warnings and completed0;
Root verified exact FIXED bytes/all611 pins before GREEN. The warning note and
all receipts/raws remain in becad3ca-8520-4d21-8ba1-295eb85935a2. Passing tests
were not repeated to remove noise. Earlier failed/intervened caps stay ineligible.

Current FIXED source is frozen for fresh isolated Max source/code-doc review in
W/separate-verdicts-implementation-evidence/4103de8f-9f45-4224-bdf7-dfec389e83b8/.
Only documentation/status/metadata changed after those commands. New config
contains only future exact Native86 (previous85 plus the new TEST) and one fresh
cap. Native86 and cap remain UNRUN. Fresh Max PASS, then separate exact Root GO
for each command, actual closure/receipt audits and final code-doc/protected
audit precede a green commit/completion review. Prior Native85 is historical,
not final-source qualification. No Native/model/phase/network/commit/push ran
during this documentation/package step. Task11 remains incomplete.


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

### Task12 combined fix-wave execution map (2026-11-10, before use)

The [owning before-use API/TEST map](../../../train/scripts/browser_eval/README.md#task12-single-repair-wave-before-use-map-2026-11-10)
is authoritative for this bounded repair. Existing owners are receipt-verdicts-v2,
resource-quality, record-schema-v2, process-stop, process-transport,
process-framing, watchdog-verdict-policy, watchdog-resource-policy; comment-only
process-proof/native-supervision TEST; W verifier and W owner controls. Causal
TESTs use resource-events, terminal, accounting-trace-io and process-lifecycle.
No new source/TEST leaf, runtime owner or execution authority is created.

Prepare tests against OLD, exact inert FIXED profiles and frozen explicit
command/config/pins with unchanged170-line manager. Root reviews before SCRIPTED
GO, inspects actual semantic RED closure before promotion, then releases identical
GREEN and covering owners. Root separately releases serial86, W controls and one
fresh current-byte controlled cap. Preserve every failed receipt. One scoped
fresh Max re-review covers combined diff and actual evidence. Keep seven docs
current with the same final green change and compare affected contracts directly
to final code, paths, interfaces, side effects and commands before local commit.
Production remains OLD and all new runtime gates are UNRUN at this append.

Task12 same-wave continuation: preserve failed OLD e84f8a9e receipt and all source
snapshots. Correct only the invalid TEST probe tuple and FIXED-only v2 admission
selection/finish-cap dedup, with genuine v1 and cap-after-finish characterization
in existing roomy TESTs. Freeze fresh d85bf532 OLD/FIXED package before new Root
GO. No automatic promotion, new fix wave, runtime authority or deadline.

Task12 W-only diagnostic preparation: retain d85's qualified49-case OLD gate.
Preserve its unqualified W-red receipt. Add only bounded actual nested-cause
output in the existing W control top catch, then freeze a fresh W-RED-only
command/config/pins and await exact Root GO. No source promotion or scripted49
repeat follows hidden AggregateError output. Existing owners/bounds remain exact.

Task12 current implementation status (2026-11-10): all six Important and three
Minor groups implemented and locally validated. Exact FIXED causal49/49, W0,
related410/410 and Native86 1059/1059 have actual Root-audited closure. The fresh
TIME-cap is component-only, aggregate/resource INCONCLUSIVE. The final direct
code-to-doc/protected audit accompanies the local green change. Independent
scoped Max re-review is pending; Task12 remains open. Publication, strict phases
and full40 need later Root gates. Exact evidence and limits: W/v2-task-12-report.md
and [the owning status](../../../train/scripts/browser_eval/README.md#task12-fixed-implementation-and-local-validation-2026-11-10).

### Task14 failed-gate handoff status (2026-11-10)

Task12 completed its ONE scoped Max review, all9 groups addressed, and4709b15 was
feature-published. Fresh strict CHECK/PARITY/PREFLIGHT each passed0, BOTH resources
passed/gaps0. Task13 consumed its ONE comparison release: descriptive12/40 games,
6/20 pairs, outer1/13281.469110750s, CLI2/readback1. Store age2300>1000ms correctly
latched accounting sticky; no final/completion/verification/final-resource event,
analysis eligibility or verified persisted Native cleanup. Direct-owner closure
and fulfilled cleanup/lifetime markers retain their separate, narrower meanings.

Task14 retains the failed evidence, read-only diagnosis and ONE actual quiet
producer control. Five ages44/35/32/30/30ms did not reproduce historical timing;
no live cause/fix/cap/cleanup/eligibility claim follows. Seven-doc status updates
and protected/source/diff audit require no source suite rerun because runtime,
TEST, interfaces, guards and contracts are unchanged. One fresh scoped Max
result-doc review follows the local documentation commit. Task14 failed-handoff
completion cannot mark Task3/full40 complete. No automatic retry or further fix wave.
See [the owning outcome](../../../train/scripts/browser_eval/README.md#task14-failed-comparison-handoff-and-idle-control-2026-11-10)
and E14/task14-report.md. Other unavailable/deferred drifts remain open.

## Task 15: Scan-correlated workspace timing diagnostics

Dependency: Task14 failed-gate handoff complete. The user requested continuing diagnosis of the new concrete Store freshness failure. Full40 remains incomplete; its old release is consumed. This task adds passive attribution and ONE short real-inference development CHECK, not a guessed fix or another cohort. No accounting/guard/science decision changes.

Read E15/task15-proposal.md (SHA256 cd0b6cd37496f0347cd339a594110369ab951b021c528a4594d2be126ca2b259) and E15/task15-root-rulings.md (SHA256 6a8c88a5117fee1607a45f89a85aef257835f17ab2f3226d127f2654968eda0e) as the exact requirements and before-use map. E15 is W/separate-verdicts-implementation-evidence/55ea3e6a-6428-40c8-a676-9f065ff15fce. Root rulings settle routine diagnostic implementation details; original approved requirements remain binding.

Declare before creation: one passive footprint-trace.mjs leaf and footprint-trace.test.mjs/footprint-trace-io.test.mjs; modify only accounting-trace.mjs, workspace-footprint.mjs, artifact-store.mjs, snapshot-files.mjs and two existing accounting-trace TEST owners, plus seven shared documentation paths. Runtime union becomes127 only by adding the diagnostic leaf. All source/TEST/control files stay below400 readable lines. Full API/state/capacity/clock/error/ownership documentation precedes use. No new runtime backend/configuration, clock/proof/debt authority, Native/Python/helper/model/training/fixture change or capture-policy relaxation.

Stages: Sol High prepares the leaf and causal tests with OLD hooks; Root executes reviewed genuine integration RED. Then connect declared hooks, run covering GREEN/whole owners and explicit88-file serial suite through actual owners; obtain independent scoped code/doc review. Root separately releases ONE fresh WORKTREE diagnostic CHECK using genuine64-visit M inference, exact v2 fixture, original CHECK600000ms and all shorter readiness30000/command90000/cleanup5000ms and resource caps. Preload merely exports cached archived trace at natural exit. This CHECK can never serve as a comparison prerequisite. Actual wait/BOTHpipe/raw/journal/physical cleanup/input equality and separately owned graph readback are required; missing attribution is not success. No automatic retry or next phase.

Final code-to-doc comparison covers actual identity binding, original promise/body/sample/error behavior, Store roles/decision clock, line/state bounds, exact interfaces/commands and diagnostic limitations. Audit protected23/M, whole Section3/e78/approval, v1 fixture, old six helpers and all old evidence. A final green implementation/doc commit, scoped review and Root feature publication remain separate. Historical2300ms cause stays unknown until new causal evidence warrants a conclusion; no scientific/Elo/whole40 or all-drift closure claim.

### Task15 B1 before-use API and causal-owner elaboration

Root's preceding Task15 release/map remains authoritative. B1 adds only the
passive leaf, two new TESTs, two declared existing TEST amendments and these
seven shared contracts. Existing production hooks and snapshot-files runtime126
remain OLD; no runtime command/import/test/Native/browser/model/cohort runs.
The full method/retention/clock/error/packet/snapshot contract is the harness
README Task15 section. Safe IDs and four count-limited maps (scan8/sample32/
consumer16/error8) never supply validity/proof/debt authority. Strong keys retain
bounded-count identities, not bounded transitive object graphs. Failed nested
context setup quarantines inherited attribution, including async continuations.
Store's original const now/throw error and original observer clone return stay
outside observational methods. Exact packets preserve separately scoped useful
process-wide overlapping FS context within original12x96/64-marker bounds.

The two new TEST owners and accounting-trace TEST amendments precede the leaf.
Genuine integration RED must fail on absent attribution with all APIs/imports
present. Holds distinguish actual privateFs delivery continuation from later
consumer delay and always release/join original work. The SAME TEST bytes apply
to later GREEN; no copied-threshold assertion or physical-debt shortcut.
Root's unchanged170-line Python manager owns exact reviewed RED argv/config/input
pins in E15; no generic JS runner exists for WORKTREE. A later separate GO connects
only declared hooks/runtime127, then covering GREEN/whole-owner/explicit88 gates
and independent review precede ONE genuine development WORKTREE CHECK. Test-only
beforeExit export and genuine frozen WORKTREE/check/v2 readback are separately
concrete owned commands. Diagnostic CHECK is never a scientific prerequisite.

Final direct code/doc comparison covers actual APIs/roles/times/sample/promise/
error/body-once semantics, count/line/output bounds, runtime127 and TEST exclusion,
original clock/cap/cleanup contracts and exact command/resource ownership.
Protected23/M/wholeSection3/e78/approval/v1fixture/old-six-helper/old-evidence audit
and all actual gates precede one green commit; Root review/publication remain
separate. E15/task-15-report.md records preparation and later actual receipts.
No guessed delay fix/new full40. Historical cause UNKNOWN; Task3/full40 INCOMPLETE.

Task15 B2 before-use map addition: M browser_eval/private-fs-phase.test.mjs solely exact runtime127 expectation and added diagnostic-leaf membership; all uniqueness/import-closure/physical-FD checks retained. OLD-hook phase keeps original126. Four causal TESTs stay identical through OLD/FIXED. This is a regression expectation for the declared dependency, not a guard change.

### Task15 B2 current authority and gate preparation

The preceding initial-rulings6a8c88a5 reference identifies the initial snapshot.
Current amended Root-rulings SHAaa2df17b11a99bfc87b755dd664fa8a37e21e2d4ee3e66df5f9d69d577e26e51
is authoritative for B2; it adds ONLY private-fs-phase.test.mjs's obsolete126->127
count and explicit footprint-trace membership, preserving all lifecycle controls.
E15/task-15-brief.md retains its initial prefix and records this current amendment.
No approved e78/accounting decision changes.

Root qualified normal OLD-hook RED: natural1/0.381963542s,33 tests27pass/6 intended
attribution failures, no skipped/cancelled tests,587 stable pins, actual wait/BOTH
EOF/raw/journal closure and no errors/signals/intervention. Sticky A->B->B passed.
B2 connects only accounting-trace/observer/Store hooks and runtime127. All four
causal TEST files stay identical; Store original clock/throw and observer original
sample allocation/return/promise chain remain. Separate frozen GREEN/whole-owner/
explicit88 packages use the unchanged170-line owner. Root releases each command;
no worker runtime, commit/push or automatic succession. Live preload/readback
package follows actual test closure. All live/scientific gates stay UNRUN and
Task3/full40 INCOMPLETE; historical delay cause UNKNOWN.


Ruling: Task15 actual whole-owner run failed only obsolete snapshots.test.mjs runtime-prefix expectation (112/113 pass). Root statically verified old126 entries unchanged/in order, sole footprint-trace addition at index6, old114 digest589718ee exact, new115 digest97b329e3639dc91b101060a307477bccae7b6d437daee777fa79e939d3bfd3d1 and identical v2 tail12. Before-use admit M snapshots.test.mjs only head114->115 with this exact independently derived digest, tail114->115 and explicit new-leaf membership in existing helper list. Keep every freeze/unique/path/test-exclusion/physical control; no runtime/design change or causal TEST mutation. Preserve failed whole and unrun serial01; prepare new whole02/serial02 pins. Costifwrong: closure assertions/full88/review reject any unrelated roster drift.


Task15 snapshots expectation ruling clarification: keep the already GREEN-tested runtime order. An additional assertion may filter ONLY the declared footprint-trace leaf from the new115 prefix and retain the original historical114 digest589718ee. This preserves old-prefix evidence alongside new exact115 digest and unchanged12-tail assertion; no other validation is removed.

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


## Task 17: Approved serial verification repair and fresh full40 execution

Hansel explicitly approved the reviewed serial-verification amendment on2026-11-11. The exact immutable requirements are E17/approved-serial-verification.md (SHA821b448edd2f0d930228333703e48a568be0897edaeafa0785e76b880309cd83), recorded approval E17/approval.json. E17=/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/507bc314-6904-4be0-bbef-f3a33c1e94fe. Base f75871d2069a31ddfa3e286feb5a780551e37d8b, same feature checkout. This acceptance supersedes the proposal's historical pending-approval label. Model weights, runtime127 and every original clock/proof/resource/science limit remain exact.

Sol High is the implementer, no children. StageA writes only the approved TEST/fixture migrations and new independent-pool TEST plus before-use contracts, leaving both production widths OLD16. Root alone executes the two selected semanticRED tests from the approved document through unchanged170-line owner; migrated FIXED-only ownership controls are not OLDRED. StageB then changes only approved production widths and matching docs; same causalTEST bytes, covering/whole-owner/explicitserial suite and exact preserved-control body on currentbytes must qualify. No worker runtime/test/import/Native/browser/commit/push while Root owns these gates.

The fresh scoped SolMax implementation/code-doc review is Approved with no Critical/Important findings after GREEN5/5, affected owners83/83 and full89 serial1077/1077. Its sole Minor expected optional-observer warning qualification is recorded separately. Hansel approved E17/control-binding-proposed-correction.md SHA86efd98290b2a90057c87a74c8d860df35a0a8530a3c86b1f24b777c0b51ef1e in E17/control-binding-approval.json after the same-body old-data control correctly rejected changed source bytes before any scan. Final diff/source-to-doc/protected/model/wholeSection3/oldhelper/evidence audit now precedes the reviewed green source/docs commit and Root feature publication. Root then runs ONE fresh strict committed CHECK. Only its successful CLOSED graph, exact input equality, actual owner/pipe/body/descriptor cleanup and both passed resource verdicts admit the SAME147-line control with ONLY fresh workspaceRoot/candidate literals. The control must qualify before13-case parity and preflight, then ONE new40-game/20-pair/64-visit comparison under24h and all original shorter limits. External control qualification rejects any original1000ms scan-start age excess or late/missing/failed closure. Fresh frozen verifier bytes and sealed records require descriptive path/call-count/timing comparison, not a paired causal ratio. At the historical source-commit checkpoint, control and fresh phases were UNRUN. Subsequent CHECK/control/parity passed and strict preflight failed; the current prerequisite-results report linked below records these outcomes without a latency-cure claim. Count-only progress, no partial outcome tuning, no extra diagnostic CHECK or automatic retry. All old failures/diagnostic runs remain ineligible and cannot be parents. No extra planning/review beyond concrete findings.

Before-use paths/tests/data/risks are exactly the accepted amendment. Source/TEST/control files below400 readable lines. Additional test owner needed to maintain that bound requires a concrete Root before-use map ruling; no adjacent refactor or new runtime owner. Final actual code-to-doc comparison and current result documentation remain required.


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
[current prerequisite-results report](../../experiments/2026-11-11-tinyaz-serial-verification-prerequisites.md) for exact times, pins,
closure distinctions and UNKNOWN underlying delay cause. No latency-cure claim,
retry, new control or comparison follows. Old failures stay preserved/ineligible.


## Task 18: Approved V3 contracts, recognition RED and first capacity split

Hansel approved the reviewed prospective V3 amendment on2026-11-11. Normative source is `.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5e912df4-8fd0-4b5e-ac68-9e9c625a23a0/preflight-separate-verdicts-proposed-amendment.md`, SHA256 `ad4b3d8a710c1dc4af24e305a946ed7b4e8a83035efec89e4973f9fad30638a8`; implementation-approval.json records the exact answer and conditional fresh-execution scope. Historical pending labels are superseded by that approval, not rewritten. Current base67b85fe is clean and published. Use the existing feature checkout. Model/protected inputs and old evidence remain unchanged.

Sol High implements serially, no children. Root/Sol Max reviews and alone executes all tests/runtime gates. Before functional changes, copy the approved contract into new tracked `docs/superpowers/specs/2026-11-11-tinyaz-preflight-v3-software-design.md`, changing only title/approval metadata and explicit original E19 reference resolution. Preserve all functional requirements; append a precedence/status pointer to the established verified-M design outside protected whole Section3. Update root/train-scripts/harness contracts with approved prospective V3 versus actual current-stage behavior; remaining affected documentation follows its corresponding code change. Preserve valid content.

First write ONLY the exact selector-recognition TEST from amendment section10 in `train/scripts/browser_eval/preflight-policy-v3.test.mjs`; production remains executable67b85fe. Stop for Root's pinned same-byte OLD semantic RED. After Root qualifies it, archive the exact TEST bytes/hashes into new implementation evidence and remove only that agent-created temporary leaf, so it does not fail intermediate capacity checkpoints. Restore those identical bytes with selector implementation in Task20. No missing import/fixture/runtime or unrelated assertion qualifies as RED; this RED proves recognition only.

Then implement amendment section8 Split A: extract the whole pure resource schema/primitive group into declared `resource-quality-schema.mjs` with original V2 behavior and public re-exports intact. Add only that functional suffix path: old127 prefix plus one, total128. Move the complete existing runtime-roster test from snapshots.test into real new `preflight-compat-v3.test.mjs` and assert the exact128 roster/closure; update private-fs-phase explicit count128. Existing89 TEST leaves plus compat equals90. No placeholders, compression, new policy activation or unseen owner. Changed source/TEST stays below400 readable lines. Update affected contracts to current128, approved future135. Root runs the complete covering schema/ledger/snapshot/compat/private-FS owners through the qualified actual owner, checks imports/protected pins, obtains scoped spec/quality review, then the implementer commits the green change and matching docs after Root's final actual diff/code-to-doc audit. No push or phase by the implementer.

## Task 19: Second V3 capacity split

Use the approved amendment section8 Split B after Task18 is complete. Sol High moves the whole existing createWatchdogOperationContext group into declared watchdog-operation-context.mjs, preserving existing config/operations re-exports and behavior. Append only this second suffix path: total129, still90 TEST owners. No private V3 scope fields until the real later implementation. Update exact compat/private-FS roster expectations, run whole affected config/operations/watchdog/closure owners and import checks, review spec/quality and actual code-to-doc diff, then commit green source/docs. Routine internal/test splits use the amendment's explicit Root before-use map/review rule; policy/API/ownership/proof changes retain design approval requirements.

## Task 20: Complete approved V3 policy, proof graph and operators

Implement the exact approved amendment, including its two reviewed fix rounds and cold-CHECK branch. This is the connected policy/Native-scope/schema/readiness/evidence/compiler/parent/reducer/receipt/CLI/Python/operator feature. The full exact existing-owner map is amendment section7, future helper/contracts/counts section8, acyclic W source and operational3 release section9, and all tests section10. Do not infer schema2=>V2 or trust producer readiness labels. Old V1/V2 semantics, fixtures, all old W executables, model/training/science and numeric caps stay unchanged. Complete real six remaining runtime files and exact final suffix135; exactly seven new TEST leaves produce96. Restore identical recognition TEST bytes and Root qualifies GREEN plus separate FIXED timing/proof contrasts. Keep source/TEST/W source below400 without placeholders or compression.

Every meaningful source change includes affected contracts/status and commands in the same green commit. Root runs named new/affected owners, explicit whole96 serial suite, genuine Native/graph/operator/Python and appropriate unchanged-app checks from the amendment; no worker runs tests/imports/Native/model/phase concurrently. Required checks include retained async budgeted replay, full prepared/ordinary reconstruction, truthful resource failure, actual fresh parent rechecks, cold-CHECK absence, positive caps and all hard negatives. Source/schema/ownership findings receive scoped fixes and re-review. Only actual same-byte green evidence, fresh scoped implementation review and final source-to-doc/protected/old-fixture/operator/import audit permit green commit/publication. No execution GO follows from a test pass alone.

## Task 21: Fresh V3 prerequisites, approved control and one full comparison

After the approved implementation is green, reviewed, committed and published, Root makes an entirely new operational3 release with exact candidate/runtime/source/policy/protocol/operator pins and canonical absent roots. Old E18 V2 failed preflight and all old data remain immutable and cannot be parents. Root alone runs strict V3 CHECK; only its successful CLOSED graph admits the explicitly approved ONE147-line read-only control with exactly candidate/workspace/protocolPath substitutions, reversed-original hash proof and original90s/1000ms qualification. Then strict parity13 and one fully sealed scientifically ready V3 preflight. Readiness2/resource-failed is admissible only under the exact full-proof V3 rule; readback0 does not turn experiment2 into resource pass. All Native/current cleanup/store/identity/hard cap proof remains mandatory.

Only then Root releases ONE40-game/20-pair/64-visit cohort under unchanged24h comparison and original shorter bounds, with count-only progress and no outcome tuning. Own the actual experiment, both pipes/raw/journal, graph readback and source/model equality to closure; report separate science/resource/closure/aggregate grades and exact statistical scope. No automatic retry or rescue. Task3 is complete only after this authorized comparison has an authoritative final outcome. Keep final current documentation, actual code-to-doc comparison and reporting/source commits distinct. No main merge, deployment, training or weight change is included.

## Task18 Stage A: approved contract publication and recognition handoff

Status: IN PROGRESS, before functional edits. The complete
[canonical V3 contract](../specs/2026-11-11-tinyaz-preflight-v3-software-design.md)
copies the approved proposal's functional sections byte-for-byte. Its metadata
resolves E19 to the original evidence directory and names the exact approval.
The Root-authored Tasks18..21 outline above is preserved.

Actual source remains `67b85fe`, V1/V2 behavior, runtime127. The standalone
recognition TEST makes90 present owners (89 existing plus one temporary leaf).
No V3 production helper or fixture is created at Stage A. Root must execute
and qualify the unchanged-source semantic RED from canonical section10 before
this implementer resumes. Root retains all test/import/Native/browser/phase,
review, publication and release gates. Evidence sink is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.

- Stage A: canonical full contracts, README/status precedence and exact sole
  recognition TEST. Static diff/pin audit only. Stop quiescent for Root RED.
- After qualified RED: archive identical TEST bytes/hash in new evidence and
  remove only that temporary leaf. Split A then extracts the complete schema
  group and real compat roster owner: runtime128, working TEST owners90.
- Task19: unchanged whole operation-context extraction: runtime129/TEST90.
- Task20: exact remaining six runtime inputs, closed V3 dispatch/scope/facts/
  replay/graphs/CLI/Python/operators and final runtime135/TEST96. Restore the
  identical recognition TEST for GREEN. Canonical sections7/8/9/10 own the
  complete source/API/shape/count/operator/test maps; no guessed owner is used.
- At each meaningful code checkpoint: update affected contracts in the same
  change, compare final actual code/diff against documents, obtain Root's
  affected checks and scoped review, then commit only the green reviewed change.
- Task21: only after reviewed green publication and Root's exact releases,
  fresh strict CHECK, approved one-use three-binding control, parity13, sealed
  scientifically ready V3 preflight and ONE unchanged40/20/64 comparison.

Current scientific measurements remain in the unchanged dated prerequisite
report. Existing experiment status owners are `docs/experiments/README.md` and
`docs/experiments/tinyaz-software-plan.md`; the amendment's named
`tinyaz-software-status.md` is absent. Root ruled to maintain the existing
layout rather than create a duplicate status owner. Python/fixture contracts
and dated result facts follow corresponding later actual behavior changes.

## Task18 Stage B: Split A source ready, gates pending

At the historical Task18 source-ready checkpoint, the Split A roster was128, preserving the exact original127
prefix and appending only `train/scripts/browser_eval/resource-quality-schema.mjs`.
The schema/primitive group is moved whole with original V2 validation; public
validator re-exports and the sole ledger factory remain unchanged. No V3 policy,
fixture, scope, graph or operator is activated. The compat leaf replaces the
archived recognition leaf, giving90 current TEST owners. Task19 runtime129 and
Task20 runtime135/TEST96 were approved future work at that checkpoint. The
following dated Task18 gate update records its later covering result. The
Task19 section below records the current source-ready state.

Root qualified the sole OLD recognition RED on unchanged `67b85fe`: natural
exit1 in0.2093892078846693s, intended first doesNotThrow ERR_ASSERTION from
`SCHEMA_LITERAL: policy/version/protocol binding`,582 exact pins and actual
wait/both-pipe/raw/journal closure. This proves missing recognition only.
The exact22-line TEST, SHA256
`ea3bf64a96bd95a839f19c3bac2ffea9fdb36ff1ff947ea2978e9c8a82146765`, is archived
exclusively in E20/recognition-test-original.mjs and removed from the runtime
TEST directory until identical restoration with Task20. E20 is
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.

The complete original schema/primitive group moved to its approved leaf;
factory body remains byte-identical and public validator re-exports remain.
Only snapshot-files' final resource-quality-schema entry is added to the
functional roster. The full old runtime-roster TEST moved from snapshots.test
to preflight-compat-v3.test, preserving old assertions and adding exact128/
prefix/suffix/static-and-dynamic-import closure. Private-FS count is128.
All changed SOURCE/TEST stays below400 readable lines. No future placeholder,
missing import, fixture or other helper was introduced.

Root's next gates: whole affected schema/ledger/snapshot/compat/private-FS
owners with actual command closure, import/protected/old-fixture/operator pin
checks, scoped spec/quality review and final actual diff/code-to-doc audit.
Only Root's green review instruction permits the implementer to commit matching
source/docs. No push or experimental phase is performed by the implementer.
This checkpoint's new report and pins are E20/task-18-stage-b-report.md and
E20/task-18-stage-b-pins.json. Stage A reports, source pins and raw RED evidence
are immutable. Dated prerequisite facts and Python/fixture contracts stay
unchanged because this whole-group extraction changes none of their behavior.

Historical Task18 gate update before commit (2026-11-11): Root's complete covering gate passed100/100,
zero skip/cancel, natural0 in19.657593500s, with587 exact pins and actual
wait/BOTH raw-pipe/journal closure. Scoped Sol Max spec/code-to-document quality
review is Approved with zero Critical/Important/Minor findings. Source remains
the reviewed Split A runtime128/TEST90 with unchanged V1/V2 behavior. Root's
final documentation audit and separate green-commit release remain pending.
Task18 is IN PROGRESS; no commit, publication, V3 activation or phase result
is claimed. Audit: E20/root-task18-covering-audit.json.

## Task19 Split B: context extraction source ready (2026-11-11)

Task18 Split A is green-reviewed and locally committed at
`c1ef53d6e05aa2cdb31aa7bc529e8b8fe2cbd7c5`. Its Root covering gate passed
100/100; those results cover Split A only. Current authored Split B has129
functional inputs: the exact original128 prefix followed only by
`train/scripts/browser_eval/watchdog-operation-context.mjs`. The same90 TEST
owners remain. Root's complete16-owner covering gate passed102/102, zero
fail/skip/cancel, natural exit0 in9.105876124929637s. All595 before/after/current
pins were exact; actual wait, BOTH EOF/raw/pipe and journal closure were
verified, with stderr0. Audit: E20/root-task19-covering-audit.json. Fresh scoped
Sol Max spec and quality reviews are Approved, zero Critical/Important/Minor
findings. Final Root code-to-document audit and separate local green-commit
release remain pending. Task19 stays IN PROGRESS; no commit, publication,
V3 activation or phase result is claimed here.

The new pure leaf owns the whole unchanged
`createWatchdogOperationContext({config,capabilities,state,timing,control})`
group. Its body and comments move byte for byte. The exact grouped references,
frozen return fields, capability identity and error text/code are preserved.
Config retains its named re-export; Operations retains its existing Config
re-export. Config still owns the unchanged whole capture and awaiter groups.
The new leaf imports only the existing protocol-value, lifetime and actual-IO
helpers; its local pure error factory preserves the original Config prefix.
There is no Config back-import or added authority. Private V3 scope forwarding
waits for the later real implementation.

Compat now asserts129 with the exact schema/context suffix, retaining every
original prefix/hash/membership/existence/uniqueness/frozen/import/exclusion
check. Private-FS asserts129 and scans the full current runtime closure. No
TEST leaf, fixture, policy, operator, Python, model, science or limit changes.
Task20's135 runtime/96 TEST transition remains prospective. Original failed
evidence and the archived recognition TEST remain unchanged and ineligible.

Root alone runs the complete affected watchdog/config/operations/lifecycle,
terminal, compat and private-FS owners. The implementer has performed static
reads, edits, byte comparisons and Git inspection only. Source-ready evidence
is E20/task-19-source-ready-report.md and E20/task-19-source-ready-pins.json;
E20 is the existing `5415eb97-ed40-4c92-8633-01764e186014` evidence directory.
The experiment index and existing ledger remain the current status owners.

## Task20 connected V3 implementation checkpoint (2026-11-11)

The approved V3 implementation is authored on `feat/tinyaz-browser-harness`
from committed Split B `32ede424e787b40ccfd9f887880c6b2d9125d797`.
Root alone runs gates and commissions independent review. The implementer has
performed source edits, static reads, hashes, Python AST parsing and Git
inspection only. No project import, test, Native operation, browser, model,
phase, commit or publication was executed by the implementer. Test results
remain UNRUN at this checkpoint. Historical results above retain their dated
scope. No new scientific or runtime phase result is claimed.

Current functional membership is135, preserving the exact original127 prefix.
Its ordered suffix is resource-quality-schema.mjs, watchdog-operation-context.mjs,
train/fixtures/browser-protocol-v3.json, preflight-readiness-v3.mjs,
preflight-evidence-v3.mjs, verdicts-v3.mjs, record-finalization-v3.mjs and
process-preflight-quality.mjs. All mjs names use train/scripts/browser_eval/.
The exact96 TEST owners include seven V3 leaves. The restored policy leaf is
byte-identical to the qualified recognition-only OLD RED. Timing, graph and
Native controls are FIXED contrasts and prospective implementation validation.

V3 is selected only by the exact browser-protocol-v3.json path, layout2 and
`{policyId:"tinyaz-separate-verdicts-v3",recordSchemaVersion:2,softPhases:["preflight","compare"]}`.
V1/V2 fixtures, V2 policy literal, old W sources, model/metadata, all hard limits
and statistics remain unchanged. V3 final/completion add only the derived
scientificReadinessVerdict. The complete graph independently reconstructs it.
Ready preflight with allowed completed periodic quality loss keeps failed
local/closure resource grades and aggregate inconclusive/2. Only V3 compare
admits that exact verified parent; finalizer-gone probes remain mandatory.
A full40 scientific comparison can remain eligible while retaining the actual
failed preflight resource grade and PREREQUISITE_RESOURCE_FAILURE. This never
certifies continuous RSS coverage, a latency cure or Elo.

The approved functional contract remains the canonical V3 software design.
The current API, test map, immutable-byte checks, roster/import closure,
code-to-document comparison and Root gate commands are recorded in
`task-20-source-ready-report.md` and `task-20-source-ready-pins.json` under
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/5415eb97-ed40-4c92-8633-01764e186014`.


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

Hansel approved the [receipt-sealing amendment](../specs/2026-11-11-tinyaz-preflight-v3-software-design.md#task22-approved-receipt-sealing-correction-2026-11-11)
(proposal SHA256 `3fc18bacefe9fbe59ba36ace283c64a2c091d2a1ac778d01fd229d292f819f29`).
It explicitly supersedes only V3's producer C-across-A/B coupling and matching
API/map wording. A retains original P/C and real writer/body/FD closure.
After actual A settlement, one fixed receipt-only B90 gates whole Store
transaction admission, existing proof/read/replay and the in-Store semantic
seal. Nested B is clamped to the original parent end. Already-admitted IO
settles under actual ownership after expiry. An immutable Store result survives
later continuation/diagnostic failure. The canonical contract records exact
APIs, whole-transaction limits, import edges and passive sink observation.

Task20 is complete/published at `ccd839011b9deb831ffe9c79325879f00041857f`.
Task21 CHECK/control qualified; parity failed finalization without an authoritative
completion. Its unsealed numerical/resource/cleanup facts cannot admit preflight.
No preflight or comparison launched. Failed evidence remains immutable.
Root accepted actual RED2:60 tests,50 passed,10 intended failures,0 skip/cancel,
natural exit1 in40.792294208s,649 exact pins and complete command/BOTH raw/journal
closure, without intervention. The two corrected preparation controls passed.
All required local gates now passed on the frozen14 SOURCE/TEST paths.
Root full96 passed1162/1162, natural exit0 in223.116871292s,0 skip/cancel,
660 exact execution pins and actual process/BOTH raw/journal closure without
intervention. Causal60 and focused fixture4 are subsets, not added counts.
Python58/19/8, scripts191/core184 and typecheck0 passed with649 exact pins and
actual closure. Two deliberate null/undefined BookkeepingObserverWarnings
remain expected and unsuppressed. Worker imports/tests are UNRUN.
Final scope23 is7 SOURCE,7 TEST/support and9 DOC paths. The additional existing
fixture-transform TEST drains actual Vite optimization batches before close;
its public receipts do not claim arbitrary global IO/detached-cache-rm closure.
Runtime135/TEST96, model weights, baseline/statistics and original experiment/
Native/cleanup/resource limits remain unchanged. Fresh Sol Max review and Root
acceptance/commit/publication/scientific successors remain pending.

After required tests, Sol Max review, code-to-doc acceptance and green publication,
Root separately releases fresh CHECK, ONE replacement diagnostic control, parity,
preflight and ONE40-game comparison. No prior run/control is reused. The replacement
control requires the new published candidate's successful CLOSED CHECK.
Evidence and exact pins: E22/implementation-approval.json and task22-report.md in
`.superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison/separate-verdicts-implementation-evidence/00cb72f4-cff2-412d-9c9c-e6f3ce8e4b59`.

Implementation handoff: preserve causal TEST bytes after accepted RED. Compare
actual final code, interfaces, ownership, side effects, paths, commands and limits
to all nine affected docs before Root green acceptance. Include needed docs in
the corresponding green change and report unresolved drift. Timestamps do not
establish synchronization. No production change or test result is claimed here.

Stage B evidence: E22/root-task22-causal-red-acceptance.json,
E22/task22-source-ready-report.md and task22-source-ready-pins.json. The linked
canonical amendment and harness README describe the implemented API/clock/
containment/diagnostic boundaries. The source-ready report records the final
code-to-doc comparison. The final measured comparison and23-path status are in
task22-implementation-review-ready-report.md. Local GREEN does not establish
review acceptance, publication or scientific passage.

Current evidence: E22/root-task22-all-required-checks-summary.json,
root-task22-causal-green-acceptance.json, root-task22-fixture-focused-acceptance.json
and task22-implementation-review-ready-report.md. The earlier full96
1161pass/1 teardown failure and RED1's two loader setup failures remain dated
immutable history; neither was reclassified as passing. No Task22 scientific
CHECK/control/parity/preflight/comparison, commit/publication or Elo result is
claimed. Root owns fresh review and every subsequent release gate.


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

Implementation handoff: retain exact causal TEST bytes; compare final code, APIs,
identities, guards, owner/FD side effects, paths, limits and commands against all
five affected docs with the matching code change. Record actual remaining gates
and unresolved drift; do not infer synchronization or release from timestamps.
