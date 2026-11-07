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
