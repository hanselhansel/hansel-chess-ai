# Consolidated EGM Review Report

The frozen design has **21 unresolved actions: 1 Blocker, 9 Major, and 11 Nit**. All five review stages and all nine native reviewers completed. The detailed plan does not yet meet the implementation-readiness standard. Review completion is not an implementation pass or approval to implement.

The blocker is a source-backed contradiction in required verification: the prescribed climb test performs real S-model snapshot games and self-play generation, while the design calls it mocked and prohibits generation as verification. The remaining Major actions address exact protocol declarations, immutable Python parity inputs, successful prerequisite evidence, macOS watchdog design, the UCI child interpreter, fixture CSS compilation, Roadmap claims, public-interface inventories, and raw en-passant alternatives.

## Frozen target and review method

- **Target:** [Tinyaz verified M software design](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md), lines 1..794.
- **Target SHA256:** `c708f35e3c6e0ce4eda679d7a68820c6232e2cdb56b17a3b98e7919b7d5cfd80`.
- **FeatureRange:** 1..403. **DetailedRange:** 404..794. The Detailed Implementation heading remains at line 404.
- **Preset:** Owner-selected uninterrupted full flow, Stages 5, 6, 7, 8, and 9 in sequence. This was a single frozen pass, with no stage checkpoints, remediation, re-audits, or iterative-loop convergence claim.
- **Installed bundle:** `/Users/hansel/.codex/plugins/cache/egm/egm/0.1.0`. The orchestrator read its Codex integration, review skill, and synthesizer persona in full. Reviewers used the complete installed personas and supplied standards.
- **Model and isolation:** Every reviewer was separately launched through the native agent tool with `model: gpt-6.1-sol`, `reasoning_effort: max`, and `fork_turns: none`. No warm planning or synthesis context acted as a reviewer. These are the recorded native dispatch settings, not a claim that the host chat's model changed.
- **Baseline:** Root README, actual selected source and owning contracts, and the historical approved M ladder where needed. Existing-source and reuse claims were checked against actual code. Planned Create paths were treated as proposals.
- **History boundary:** Reviewers skipped memory, GBrain, chat history, restoration, excluded process-history documents, and prohibited directories. Stage 8 alone read the current Stage 5/6/7 reports as required by the protocol.
- **Stage 9 context:** [Execution-role note](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/plans/2026-11-02-tinyaz-devin-orchestration.md), 97 lines, review-input SHA256 `3781cadb94906fa030f5283e812475e835caac29b7fc7cfc01b468a84fa4aff4`. It was read as data. No operational links were followed and no Devin session was started.

The orchestrator re-read the target header, boundary, ranges, count, and hash before every stage. Reviewers independently checked the same frozen target before and after their work. The final target and execution-note input hashes matched. At this pass's completion, 129 recorded source/asset hashes and 20 captured owning-contract hashes also matched; HEAD remained `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec` on `chore/egm-bootstrap-tinyaz`.

## Stage and reviewer completion

| Stage | Report | Status | Raw observations | Distinct new actions |
| --- | --- | --- | ---: | ---: |
| 5. Initial Zoom Out | [zoom_out_report.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/zoom_out_report.md) | completed | 0 | 0 |
| 6. Comprehension | [comprehension_report.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/comprehension_report.md) | completed | 0 | 0 |
| 7. Critic | [critic_report.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/critic_report.md) | completed | 5 | 5 |
| 8. Intermediate Zoom Out | [intermediate_zoom_out_report.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/intermediate_zoom_out_report.md) | completed | 5 retained | 0 |
| 9. Implementation Readiness | [implementation_readiness_report.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/implementation_readiness_report.md) | completed | 19 | 16 |
| Total | All reports saved | completed | 29 | 21 |

| Stage / lens | Native task ID | Status | Raw B / M / N | Rubric |
| --- | --- | --- | --- | --- |
| 5 / Zoom Out | `/root/sol_egm_full_review/stage5_zoom_out` | completed | 0 / 0 / 0 | Zoom Out Standard |
| 6 / Comprehension | `/root/sol_egm_full_review/stage6_comprehension` | completed | 0 / 0 / 0 | Persona only |
| 7 / Design Critic | `/root/sol_egm_full_review/stage7_design` | completed | 0 / 0 / 0 | Feature Specification Standard |
| 7 / Structural | `/root/sol_egm_full_review/stage7_structural` | completed | 0 / 1 / 0 | Feature Specification Standard |
| 7 / Style | `/root/sol_egm_full_review/stage7_style` | completed | 0 / 0 / 4 | Persona only |
| 8 / New Zoom Out | `/root/sol_egm_full_review/stage8_zoom_out` | completed | 0 / 1 / 4 | Zoom Out Standard and selected current reports |
| 9 / Implementation Readiness | `/root/sol_egm_full_review/stage9_readiness` | completed | 0 / 6 / 1 | Implementation Readiness Standard |
| 9 / Codebase Details | `/root/sol_egm_full_review/stage9_codebase` | completed | 1 / 4 / 0 | Implementation Readiness Standard |
| 9 / Style | `/root/sol_egm_full_review/stage9_style` | completed | 0 / 0 / 7 | Persona only |

All statuses come from actual native final responses, not launch acknowledgements. No reviewer failed, required a retry, or has a not-run status. The complete Stage 6 paraphrases and findings were preserved directly. Raw observations total 1 Blocker, 12 Major, and 16 Nit before deduplication and severity consolidation.

## Prioritized consolidated actions

Every action below is **unresolved**. They are review recommendations. No design or source repair was applied.

### Blocker

**R-B01. Resolve the climb-test workload contradiction.** Target [line 589](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:589), also 594 and 721. Raw IDs: `S9-CB-001`, `S9-IR-002`.

The required test's main entrypoint includes eight real S snapshot games and real one-game self-play generation. The target describes those checks as controlled mocks while prohibiting generation as verification. Source evidence is in [snapshot verification](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:121) and [generation verification](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:190). Correct the description and decide the test boundary before executing that command. Either explicitly permit and bound those finite operations with accounting, or map controlled replacements that preserve assertions and record displaced real coverage. Preserve legality and public-write protections. Codebase Details rated this Blocker; Implementation Readiness rated it Major. The consolidated severity retains Blocker.

### Major

**R-M01. Declare the exact thinker and wire contracts.** Target [line 535](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:535), also 466..481 and 536..575. Raw ID: `S9-IR-003`.

Specify the actual versioned envelope, message/result unions, terminal-reason values, state/subscription signatures, and malformed active-reply disposition. The current sketches leave incompatible C3 consumers to choose wire shape and failure policy. Use the declarations consistently across worker, client, hook, displays, and tests.

**R-M02. Freeze the Python parity reference inputs.** Target [line 630](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:630), also 488, 495, 626..629, and 741. Raw ID: `S9-IR-004`.

The source snapshots omit train/src/tinyaz, while parity must execute those Python modules. Define an immutable reference input set, candidate-object/content checks, and child import path. Reconcile this with the archive-only rule and map. Reject dirty or mismatched Python references even when JavaScript and launcher inputs remain clean.

**R-M03. Define successful prerequisite proof.** Target [line 638](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:638), also 489, 494, 503, 639..640, 727, and 741. Raw ID: `S9-IR-005`.

Specify the prerequisite schema, exact hashed artifacts, serialization/hash convention, eligible final statuses, and identity checks. A pre-request manifest cannot prove a successful phase. Define how an expected failed watchdog self-test is accepted by a successful parent. Test failed/missing completion, altered final evidence, identity mismatch, and abandoned workspaces.

**R-M04. Select the macOS watchdog and supervisor protocol.** Target [line 634](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:634), also 493..504 and 635..640. Raw ID: `S9-IR-006`.

Choose the macOS process/RSS/start-identity/port collection backend and required tools. Define descendant and reparenting ownership, supervisor/driver messages, heartbeat interval and failure threshold, and deadline authority when the driver stalls. The existing Linux /proc preview helper does not supply this boundary. Cover blocked drivers, surviving children, PID reuse, and unavailable accounting.

**R-M05. Pin the UCI child interpreter.** Target [line 722](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:722), also 587 and 712..725. Raw IDs: `S9-IR-001`, `S9-CB-002`.

The UCI test invokes a [wrapper using bare python3](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/hansel-chess-ai:4). Selecting the virtual environment's interpreter for the parent does not alter inherited PATH. Specify activation, an absolute bin-path prefix, or the mapped test's controlled child environment. Preserve the production wrapper and record both interpreter identities.

**R-M06. Complete standalone Workbench style compilation.** Target [line 630](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:630), also 496 and 499. Raw IDs: `S9-CB-003`, `S9-IR-007`.

The fixture disables production Vite configuration and names React alone, but actual [styles require Tailwind](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/styles.css:1), and the app root normally imports them. Specify that stylesheet import, the installed Tailwind plugin, and snapshot-confined scan root. Verify computed board grid/square geometry. Codebase Details rated this Major; Implementation Readiness rated it Nit. Both assessments remain recorded; consolidation retains Major.

**R-M07. Migrate Roadmap's active and historical claims.** Target [line 478](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:478), also 479..481 and 598. Raw ID: `S9-CB-004`.

The separately rendered [Roadmap](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/components/chess/roadmap.tsx:1) contains an unconditional current-rating claim, including when demo mode would hide trained claims in CardPanel. Decide its active-session versus historical behavior, map the source/owning-contract change, and check claims across the complete rendered Workbench.

**R-M08. Reconcile the remaining public export inventories.** Target [line 758](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:758), also 515, 519, and 759..769. Raw ID: `S9-CB-005`.

The fixed additions omit public `JwksFetch`, seven more PWA functions, and eight script constants. Reconcile the source export sets and owning entries with signatures or roles. Preserve original F4/F7 historical sets and record the new omissions separately. The [complete codebase finding](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_codebase_raw.md) names every export and source line. These omissions justify documentation work, not runtime changes.

**R-M09. Record alternatives for raw en-passant choice 3.** Target [line 192](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:192), also 13 and 289..389. Raw IDs: `S7-STR-001`, `S8-ZO-001`.

A1..A14 omit the viable input conventions and their rejection reasons even though this choice can change inputs and moves while preserving a training/live-input difference. Add that alternatives evaluation and selection rationale to the target. Preserve the approved choice and its limitations. Stage 8 retained this existing Major finding; it was not a new issue or evidence of a fix.

### Nit

| Action | Target lines | Raw IDs | Required editorial action |
| --- | --- | --- | --- |
| **R-N01** | 19..21, 42 | `S7-STY-001`, `S8-ZO-002` | Replace broad summary language about dependable failures/results/verification with observable loading errors, checkpoint identity, stale-result rejection, and recorded check outcomes. |
| **R-N02** | 125 | `S7-STY-002`, `S8-ZO-003` | Limit the no-new-dependency claim to browser JavaScript. State Python verification setup separately. |
| **R-N03** | 40, 44, 178, 287 | `S7-STY-003`, `S8-ZO-004` | Replace completed document-authoring instructions with direct section references. Retain later implementation and file-map obligations. |
| **R-N04** | 192 | `S7-STY-004`, `S8-ZO-005` | Split the raw-target addendum into input behavior, preserved rules/restoration, and limitations/comparison meaning. Keep the approval date once. |
| **R-N05** | 418 | `S9-STY-001` | Replace the nonexistent result-column reference with a statement that implementation and verification results are pending for every row. |
| **R-N06** | 452, 520, 626 | `S9-STY-002` | Replace tripwires, ruler/defaults, and documentation dirt with deployment integration assertions, historical rating protocol/default settings, and uncommitted documentation changes. |
| **R-N07** | 475, 596, 750 | `S9-STY-003` | Use worker-to-main availability recovery for the automatic transition. Reserve engine retry and move retry for explicit user actions. |
| **R-N08** | 480, 642, 766 | `S9-STY-004` | Replace subjective display qualifiers with observable conditions or exact section references, including missing records labeled unavailable. |
| **R-N09** | 638 | `S9-STY-005` | Separate artifact contracts into artifact/contents/write-and-finalization timing. Keep workspace layout and publication restrictions separate. |
| **R-N10** | 750, 780 | `S9-STY-006` | Expand slash chains into parallel nouns or checklists, preserving paths, identifiers, and numeric conventions. |
| **R-N11** | 671, 673 | `S9-STY-007` | Use Queen's Gambit Declined and King's Indian. Preserve IDs and UCI prefixes. |

## Complete finding traceability

The matrix maps every raw finding to one unresolved action. Stage 8's five retained observations map to their Stage 7 origins. Three same-issue overlaps in Stage 9 are merged. Separate editorial edits at different contracts remain separate actions. No low-severity finding was discarded.

| Raw finding | Stage / lens | Original severity | Consolidated action | Disposition |
| --- | --- | --- | --- | --- |
| `S7-STR-001` | 7 / Structural | Major | R-M09 | Retain |
| `S7-STY-001` | 7 / Style | Nit | R-N01 | Retain |
| `S7-STY-002` | 7 / Style | Nit | R-N02 | Retain |
| `S7-STY-003` | 7 / Style | Nit | R-N03 | Retain |
| `S7-STY-004` | 7 / Style | Nit | R-N04 | Retain |
| `S8-ZO-001` | 8 / Zoom Out | Major | R-M09 | Retained Stage 7 issue |
| `S8-ZO-002` | 8 / Zoom Out | Nit | R-N01 | Retained Stage 7 issue |
| `S8-ZO-003` | 8 / Zoom Out | Nit | R-N02 | Retained Stage 7 issue |
| `S8-ZO-004` | 8 / Zoom Out | Nit | R-N03 | Retained Stage 7 issue |
| `S8-ZO-005` | 8 / Zoom Out | Nit | R-N04 | Retained Stage 7 issue |
| `S9-IR-001` | 9 / Implementation Readiness | Major | R-M05 | Merge with same UCI issue |
| `S9-IR-002` | 9 / Implementation Readiness | Major | R-B01 | Merge; Blocker/Major difference preserved |
| `S9-IR-003` | 9 / Implementation Readiness | Major | R-M01 | Retain |
| `S9-IR-004` | 9 / Implementation Readiness | Major | R-M02 | Retain |
| `S9-IR-005` | 9 / Implementation Readiness | Major | R-M03 | Retain |
| `S9-IR-006` | 9 / Implementation Readiness | Major | R-M04 | Retain |
| `S9-IR-007` | 9 / Implementation Readiness | Nit | R-M06 | Merge; Major/Nit difference preserved |
| `S9-CB-001` | 9 / Codebase Details | Blocker | R-B01 | Retain stronger reported severity |
| `S9-CB-002` | 9 / Codebase Details | Major | R-M05 | Merge with same UCI issue |
| `S9-CB-003` | 9 / Codebase Details | Major | R-M06 | Retain stronger reported severity |
| `S9-CB-004` | 9 / Codebase Details | Major | R-M07 | Retain |
| `S9-CB-005` | 9 / Codebase Details | Major | R-M08 | Retain |
| `S9-STY-001` | 9 / Style | Nit | R-N05 | Retain |
| `S9-STY-002` | 9 / Style | Nit | R-N06 | Retain |
| `S9-STY-003` | 9 / Style | Nit | R-N07 | Retain |
| `S9-STY-004` | 9 / Style | Nit | R-N08 | Retain |
| `S9-STY-005` | 9 / Style | Nit | R-N09 | Retain |
| `S9-STY-006` | 9 / Style | Nit | R-N10 | Retain |
| `S9-STY-007` | 9 / Style | Nit | R-N11 | Retain |

The Design Critic reported no feature finding, while Structural reported the en-passant alternatives gap as Major. Both assessments remain visible in their raw reports. Initial and intermediate Zoom Out results do not override the more specific readiness or source findings. Severity consolidation retains the strongest reported severity for each merged issue without altering either native response.

## Raw reviewer responses and evidence

Each response below is preserved verbatim, including its appended path/range/read evidence. Native punctuation is retained. The reports were saved before synthesis.

| Stage / lens | Raw report |
| --- | --- |
| 5 / Zoom Out | [stage5_zoom_out_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage5_zoom_out_raw.md) |
| 6 / Comprehension | [stage6_comprehension_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage6_comprehension_raw.md) |
| 7 / Design Critic | [stage7_design_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage7_design_raw.md) |
| 7 / Structural | [stage7_structural_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage7_structural_raw.md) |
| 7 / Style | [stage7_style_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage7_style_raw.md) |
| 8 / New Zoom Out | [stage8_zoom_out_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage8_zoom_out_raw.md) |
| 9 / Implementation Readiness | [stage9_readiness_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_readiness_raw.md) |
| 9 / Codebase Details | [stage9_codebase_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_codebase_raw.md) |
| 9 / Style | [stage9_style_raw.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_style_raw.md) |

The [review manifest](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-full-review-7dmfsd9_/review_manifest.json) records native IDs/settings/statuses, input hashes and counts, stage checks, artifact hashes, action mappings, and source-preservation evidence. It is audit scratch, outside the Markdown artifact directory.

## Coverage limits and unchanged state

No required persona, standard, target, or reviewer is missing. Truncated displays were recovered through smaller reads, and exact coverage is documented in each raw appendix. Codebase Details checked all 79 map entries. An optional misnamed rating.py source supplied to Stage 5 was resolved through its owning contract to the actual rate.py module. It did not leave a required-read gap.

This was a read-only source and design review. Binaries were checked through size/header/hash inspection. Historical probes, external compatibility claims, numerical parity, browser behavior, process/resource behavior, and playing strength were not reproduced. No tests, builds, compilation, model loads, training, chess evaluation, environment installation, Devin invocation, Git mutation, implementation, publication, or deployment occurred.

The canonical design, source, weights, historical records, and approved requirements were not repaired by this pass. Existing F1..F10/K1/K2 completion remains dependent on future implementation evidence. All 21 actions above remain open. The review delivers findings and traceability; it does not supply the missing design decisions or turn reviewer completion into implementation readiness.
