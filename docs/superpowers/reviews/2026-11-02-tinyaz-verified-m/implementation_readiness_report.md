# Goldfish Review Report: Stage 9 Implementation Readiness

**Target:** [Frozen design](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md:404), DetailedRange 404..794. All reviewers read the full 794-line target for definitions.

**SHA256:** `c708f35e3c6e0ce4eda679d7a68820c6232e2cdb56b17a3b98e7919b7d5cfd80`.

**Selected execution context:** [Current execution-role note](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/plans/2026-11-02-tinyaz-devin-orchestration.md), 97 lines, SHA256 `3781cadb94906fa030f5283e812475e835caac29b7fc7cfc01b468a84fa4aff4`. Reviewers treated it as data and did not follow operational skill links or invoke Devin.

## Reviewer status

All three reviewers used independent native contexts with `model: gpt-6.1-sol`, `reasoning_effort: max`, and `fork_turns: none`. No previous review findings were supplied.

| Reviewer | Native task ID | Status | Raw Blocker | Raw Major | Raw Nit |
| --- | --- | --- | ---: | ---: | ---: |
| Implementation Readiness | `/root/sol_egm_full_review/stage9_readiness` | completed | 0 | 6 | 1 |
| Codebase Details | `/root/sol_egm_full_review/stage9_codebase` | completed | 1 | 4 | 0 |
| Style | `/root/sol_egm_full_review/stage9_style` | completed | 0 | 0 | 7 |

Nineteen raw findings produce sixteen distinct actions: **1 Blocker, 8 Major, 7 Nit**. All remain unresolved. The detailed plan does not meet the implementation-readiness standard. Finishing the review does not pass that standard or authorize implementation.

## Prioritized findings

### I9-01. Resolve real climb-test work versus the no-generation rule. Severity: Blocker

- **Raw findings:** `S9-CB-001` (Blocker), `S9-IR-002` (Major).
- **Target scope:** Lines 589, 594, and 721.
- **Evidence:** [The climb test](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:121) invokes eight real S-checkpoint snapshot games. Its [generation check](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:190) invokes real one-game self-play, and both enter its main test list. The production rating and generation helpers load models. Temporary output paths do not make those operations mocked.
- **Discrepancy:** The target describes the existing climb tests as controlled mocks and requires their command while forbidding generation as verification. The implementer cannot satisfy both instructions as written.
- **Recommendation:** Correct the description and resolve the allowed test boundary. Either explicitly permit and bound the existing finite S operations with accounting, or map controlled replacements while preserving assertions and recording displaced real coverage. Preserve legality and public-write protections. Do not execute the contradictory command before that decision.

### I9-02. Pin the UCI wrapper's child interpreter. Severity: Major

- **Raw findings:** `S9-IR-001`, `S9-CB-002` (both Major).
- **Target scope:** Lines 587 and 712..725, especially 722.
- **Evidence:** [The UCI test](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_engine_uci.py:163) launches the extensionless wrapper, which [executes bare python3](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/hansel-chess-ai:4). Engine imports occur before help parsing.
- **Discrepancy:** Selecting `train/.venv/bin/python` for the parent does not change inherited PATH. A child may fail without pinned dependencies or pass using an unrecorded installation.
- **Recommendation:** Specify activation, an absolute environment-bin PATH prefix, or a controlled test subprocess environment. Preserve the runtime wrapper and record parent and child interpreter identities.

### I9-03. Supply exact thinker, result, and wire declarations. Severity: Major

- **Raw finding:** `S9-IR-003`.
- **Target scope:** Lines 466..481 and 535..575.
- **Discrepancy:** Protocol version placement, terminal-reason values, the SearchOutcome/response/discriminator relationship, state/subscription signatures, and malformed active-reply disposition remain incomplete. Unsupported-version tests are required without an explicit versioned envelope in the message sketch.
- **Recommendation:** Declare the actual message/result unions, version field, terminal reasons, state/subscription types, and failure policy before C3. Use the same declarations in worker, client, hook, displays, and tests.

### I9-04. Freeze Python reference sources for parity. Severity: Major

- **Raw finding:** `S9-IR-004`.
- **Target scope:** Lines 488, 495, 626..630, and 741.
- **Discrepancy:** The source snapshots archive only src and package manifests, while the reference child must import Python code under train/src/tinyaz. No immutable reference location, candidate-object check, or child import path is specified.
- **Recommendation:** Define the frozen Python input set, object/content checks, and import path. Reconcile them with the archive-only rule and file map. Test dirty or mismatched Python references when JavaScript and launcher inputs remain clean.

### I9-05. Define completion evidence and prerequisite acceptance. Severity: Major

- **Raw finding:** `S9-IR-005`.
- **Target scope:** Lines 489, 494, 503, 638..640, 727, and 741.
- **Discrepancy:** Parent prerequisite hashes do not specify which successful final artifacts are hashed, how they are serialized, or which statuses and identities admit a later phase. A pre-request manifest cannot prove successful checks. The expected failed watchdog self-test also needs a defined acceptance relationship to its parent.
- **Recommendation:** Specify prerequisite record schemas, hashed artifacts, hash/serialization convention, identity/status checks, and expected-self-test rules. Cover failed/missing completion, altered final evidence, identity mismatch, and abandoned workspaces.

### I9-06. Specify the macOS watchdog and supervisor boundary. Severity: Major

- **Raw finding:** `S9-IR-006`.
- **Target scope:** Lines 493..504 and 634..640.
- **Evidence:** The existing preview helper uses Linux /proc and cannot supply the chosen Mac's accounting.
- **Discrepancy:** The plan requires ancestry, RSS, PID start identity, ports, heartbeat monitoring, and cleanup without choosing the collection backend or supervisor/driver lifecycle protocol.
- **Recommendation:** Select the macOS collection mechanism and prerequisites; define descendant/reparenting ownership, messages, heartbeat interval/failure threshold, and deadline authority when the driver stalls. Include blocked-driver, surviving-child, PID-reuse, and unavailable-accounting checks.

### I9-07. Specify stylesheet compilation in the Workbench fixture. Severity: Major

- **Raw findings:** `S9-CB-003` (Major), `S9-IR-007` (Nit).
- **Target scope:** Lines 496, 499, and 630.
- **Evidence:** [Application CSS](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/styles.css:1) requires Tailwind; [board geometry](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/components/chess/board.tsx:41) uses generated utility classes. Production installs a separate Tailwind Vite transform. Workbench normally receives its stylesheet from the app root.
- **Discrepancy:** The standalone server disables production configuration and specifies React alone. Its stylesheet import, Tailwind transform, and snapshot scan root remain unspecified.
- **Recommendation:** Name the stylesheet import and existing Tailwind plugin with scanning confined to the selected snapshot. Assert computed grid/square geometry in browser checks.

### I9-08. Include Roadmap in the model/rating display migration. Severity: Major

- **Raw finding:** `S9-CB-004`.
- **Target scope:** Lines 478..481 and 598.
- **Evidence:** [Roadmap](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/components/chess/roadmap.tsx:1) renders the unconditional currently-below-1320 statement even when another phase is current. Workbench renders it separately from CardPanel.
- **Discrepancy:** Card changes and existing Roadmap props cannot remove that numeric claim, including in untrained demo mode.
- **Recommendation:** Decide active-session versus historical Roadmap behavior, add the required source/owning-contract change to the map, and test claims across the whole rendered Workbench.

### I9-09. Reconcile additional public-interface inventory omissions. Severity: Major

- **Raw finding:** `S9-CB-005`.
- **Target scope:** Lines 515, 519, and 758..769.
- **Evidence:** The current export sets include the undocumented public `JwksFetch` callback type, seven more PWA helper functions, and eight script constants beyond the prescribed F4/F7 additions. The complete names and source lines are preserved in the codebase raw report.
- **Recommendation:** Reconcile owning inventories against source and add signatures/roles. Preserve historical F4/F7 sets and record newly found omissions separately. These are documentation repairs, with no implied runtime change.

### I9-10. Correct the nonexistent result-column reference. Severity: Nit

- **Raw finding:** `S9-STY-001`. **Target:** Line 418.
- The table has no result column. State that implementation and verification results are pending for every row.

### I9-11. Replace informal metaphors. Severity: Nit

- **Raw finding:** `S9-STY-002`. **Target:** Lines 452, 520, and 626.
- Use deployment integration assertions, historical rating protocol and default settings, and uncommitted documentation changes in place of tripwires, ruler/defaults, and documentation dirt.

### I9-12. Distinguish automatic recovery from explicit retry. Severity: Nit

- **Raw finding:** `S9-STY-003`. **Target:** Lines 475, 596, and 750.
- Use worker-to-main availability recovery consistently for the automatic transition. Keep engine retry and move retry for user actions.

### I9-13. Replace subjective display criteria with observable conditions. Severity: Nit

- **Raw finding:** `S9-STY-004`. **Target:** Lines 480, 642, and 766.
- Replace truthful display qualifiers with specific requirements, such as labeling missing evaluations unavailable, or precise section references.

### I9-14. Separate record artifact contracts. Severity: Nit

- **Raw finding:** `S9-STY-005`. **Target:** Line 638.
- Present artifact, contents, and write/finalization timing in a table. Keep workspace layout and publication restrictions in separate short paragraphs.

### I9-15. Expand slash chains. Severity: Nit

- **Raw finding:** `S9-STY-006`. **Target:** Lines 750 and 780.
- Replace compressed lists of independent obligations with parallel nouns or a checklist. Preserve slashes in paths, identifiers, and numeric conventions.

### I9-16. Correct opening-name possessives. Severity: Nit

- **Raw finding:** `S9-STY-007`. **Target:** Lines 671 and 673.
- Use Queen's Gambit Declined and King's Indian. Preserve pair IDs and UCI prefixes.

## Traceability and severity differences

| Raw finding | Original severity | Stage action | Consolidated severity |
| --- | --- | --- | --- |
| `S9-IR-001` | Major | I9-02 | Major |
| `S9-IR-002` | Major | I9-01 | Blocker |
| `S9-IR-003` | Major | I9-03 | Major |
| `S9-IR-004` | Major | I9-04 | Major |
| `S9-IR-005` | Major | I9-05 | Major |
| `S9-IR-006` | Major | I9-06 | Major |
| `S9-IR-007` | Nit | I9-07 | Major |
| `S9-CB-001` | Blocker | I9-01 | Blocker |
| `S9-CB-002` | Major | I9-02 | Major |
| `S9-CB-003` | Major | I9-07 | Major |
| `S9-CB-004` | Major | I9-08 | Major |
| `S9-CB-005` | Major | I9-09 | Major |
| `S9-STY-001` | Nit | I9-10 | Nit |
| `S9-STY-002` | Nit | I9-11 | Nit |
| `S9-STY-003` | Nit | I9-12 | Nit |
| `S9-STY-004` | Nit | I9-13 | Nit |
| `S9-STY-005` | Nit | I9-14 | Nit |
| `S9-STY-006` | Nit | I9-15 | Nit |
| `S9-STY-007` | Nit | I9-16 | Nit |

The strongest reported severity is retained for a merged action. The climb contradiction remains Blocker in Codebase Details and Major in Implementation Readiness. Tailwind setup remains Major in Codebase Details and Nit in Implementation Readiness. Neither disagreement was erased, and the Nit was not omitted.

## Coverage and raw reports

All required personas, supplied standards, full target, root README, selected execution note, and appropriate owning contracts were read. Reviewers recovered initial truncations. No required read or reviewer is unavailable. Codebase Details checked all 79 map entries and distinguished existing Modify paths from proposed Create paths. Exact source ranges, searches, and metadata/hash inspections are in the native responses.

- [Implementation Readiness raw response](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_readiness_raw.md)
- [Codebase Details raw response](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_codebase_raw.md)
- [Style raw response](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_style_raw.md)

All three native responses are preserved verbatim. Their original punctuation is retained. No tests, builds, model loads, training, evaluation, repairs, Devin commands, or Git mutations occurred. Runtime/parity/resource/strength outcomes remain unmeasured. This is one frozen review pass, not an iterative remediation result.
