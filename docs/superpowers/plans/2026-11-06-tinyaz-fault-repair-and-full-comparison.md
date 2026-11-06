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

After review/publication, use fresh committed check, 13-case parity and
preflight in a new workspace. Root supplies a separate release for a fresh
source-repaired full 40-game attempt under the unchanged 24-hour bound.
This continues Hansel's requested fix-and-finish work; it is not a resumed
or automatic same-candidate retry. Never tune against observed scores.


Create a fresh workspace and run committed check, 13-case Python/browser parity, and preflight in order. Verify all actual required checks, closed receipts, cleanup, and prerequisite graph. Then execute the newly authorized locked cohort once under its recorded larger bound, with one game at a time and fresh contexts/roots as specified.

Follow the owned command to closure. Monitor actual completed-game progress where the existing bounded stream permits; do not change source/settings while active. On a concrete failure preserve evidence and diagnose it. A failing or partial cohort cannot pass or produce statistical/Elo conclusions.

Verify exactly 40 complete games/20 complete pairs, identity-bound legal PGNs, zero unplanned faults, actual natural command exit, Native cleanup/accounting, original-input equality and genuine receipt graph. Only then derive the preregistered analysis. Report unchanged model identity and the method's limits. Update established result/status documents and accepted open-item ledger, inspect final code-to-doc consistency, and publish the final evidence-backed result. No retraining, merge or deployment.
