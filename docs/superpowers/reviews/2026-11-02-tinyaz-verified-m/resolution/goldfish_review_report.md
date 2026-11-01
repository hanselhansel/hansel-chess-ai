# Goldfish Annotated Review Report

**Status:** resolved. All 21 accepted document fixes were applied and checked under the existing auto-accept authorization on 2026-11-02. No contests, escalations, declines, or unapplied document actions remain.

**Target:** [Canonical design](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md), full file. Original reviewed scope: 1..794.

**Original input:** [Byte-exact raw Markdown snapshot](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt), SHA256 `c708f35e3c6e0ce4eda679d7a68820c6232e2cdb56b17a3b98e7919b7d5cfd80`. It is historical input, not a second current checklist. Its relative links use the original canonical directory as their base.

**Exact amendment:** [Unified document patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch), SHA256 `84b04fdf2349abb4a340173a20cf00febff9882bf34e9829342ec6d56b839643`. It supplies every precise replacement, deletion and insertion against the frozen input, including formatting. The resulting design SHA256 is `d6ee4dd999f7c868b54191dddf1dbf21365c2443b82d0c9e91f470760d8da89b`.

**Authorization:** Hansel previously selected auto accept and approved continuing this 21-action resolution on 2026-11-02. This batch applies PROPOSE FIX items under that standing authorization. It preserves A/1/3, unchanged M/S bytes, search/experiment ceilings, no training/deployment/publication, source/test size limits, and code-to-doc checks.

**Counts:** 21 PROPOSE FIX; 0 CONTEST; 0 ESCALATE; 0 DECLINE. Severity remains 1 Blocker, 9 Major, 11 Nit. All 29 raw observations are retained through the original traceability matrix, including five Stage 8 repeats and both severity differences.

## Prioritized Findings & AI Suggestions

### R-B01. Resolve the climb-test workload contradiction. Severity: Blocker

- **Reviewers and original severities:** `S9-IR-002` (Major), `S9-CB-001` (Blocker).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 589](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:589), also 594 and 721. Raw IDs: `S9-CB-001`, `S9-IR-002`.

The required test's main entrypoint includes eight real S snapshot games and real one-game self-play generation. The target describes those checks as controlled mocks while prohibiting generation as verification. Source evidence is in [snapshot verification](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:121) and [generation verification](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/test_climb_loop.py:190). Correct the description and decide the test boundary before executing that command. Either explicitly permit and bound those finite operations with accounting, or map controlled replacements that preserve assertions and record displaced real coverage. Preserve legality and public-write protections. Codebase Details rated this Blocker; Implementation Readiness rated it Major. The consolidated severity retains Blocker.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The prescribed dispatcher and no-generation rule conflict in the frozen design. Select the controlled rewrite, preserve its required assertions, and retain the displaced real S regressions with an explicit non-pass coverage disposition. Actual M identity and thirteen-case numeric checks remain mandatory. This follows the accepted recommendation while preserving the approved compute boundary.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 2, 4, 7 and the controlled-climb coverage register.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The prescribed dispatcher and no-generation rule conflict in the frozen design. Select the controlled rewrite, preserve its required assertions, and retain the displaced real S regressions with an explicit non-pass coverage disposition. Actual M identity and thirteen-case numeric checks remain mandatory. This follows the accepted recommendation while preserving the approved compute boundary.

### R-M01. Declare the exact thinker and wire contracts. Severity: Major

- **Reviewers and original severities:** `S9-IR-003` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 535](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:535), also 466..481 and 536..575. Raw ID: `S9-IR-003`.

Specify the actual versioned envelope, message/result unions, terminal-reason values, state/subscription signatures, and malformed active-reply disposition. The current sketches leave incompatible C3 consumers to choose wire shape and failure policy. Use the declarations consistently across worker, client, hook, displays, and tests.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The client, worker, hook, displays and direct search callers need one concrete set of declarations and deterministic fault handling for their coupled migration. Explicit message versions, terminal branches, state transitions and immediate current-channel validation failures remove the missing choices without changing packed-weight format or search selection.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 3 declarations, protocol disposition and new type/guard file-map rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The client, worker, hook, displays and direct search callers need one concrete set of declarations and deterministic fault handling for their coupled migration. Explicit message versions, terminal branches, state transitions and immediate current-channel validation failures remove the missing choices without changing packed-weight format or search selection.

### R-M02. Freeze the Python parity reference inputs. Severity: Major

- **Reviewers and original severities:** `S9-IR-004` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 630](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:630), also 488, 495, 626..629, and 741. Raw ID: `S9-IR-004`.

The source snapshots omit train/src/tinyaz, while parity must execute those Python modules. Define an immutable reference input set, candidate-object/content checks, and child import path. Reconcile this with the archive-only rule and map. Reject dirty or mismatched Python references even when JavaScript and launcher inputs remain clean.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Browser and Python output comparisons require known executed sources. The six-module reference closure, frozen launcher/harness, isolated import root and module-origin checks bind both numeric paths to the same candidate while leaving training/generation code outside execution.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 5 frozen inputs/reference invocation and snapshot/parity file-map rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Browser and Python output comparisons require known executed sources. The six-module reference closure, frozen launcher/harness, isolated import root and module-origin checks bind both numeric paths to the same candidate while leaving training/generation code outside execution.

### R-M03. Define successful prerequisite proof. Severity: Major

- **Reviewers and original severities:** `S9-IR-005` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 638](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:638), also 489, 494, 503, 639..640, 727, and 741. Raw ID: `S9-IR-005`.

Specify the prerequisite schema, exact hashed artifacts, serialization/hash convention, eligible final statuses, and identity checks. A pre-request manifest cannot prove a successful phase. Define how an expected failed watchdog self-test is accepted by a successful parent. Test failed/missing completion, altered final evidence, identity mismatch, and abandoned workspaces.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** A startup manifest records intent. Completed receipts must instead bind the final status, exact required checks, artifacts, cleanup and common identity. Development check-to-parity is allowed only for identical frozen WORKTREE inputs; committed phases reject development ancestors.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 5 completed-record schemas/table/admission and prerequisite helper rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). A startup manifest records intent. Completed receipts must instead bind the final status, exact required checks, artifacts, cleanup and common identity. Development check-to-parity is allowed only for identical frozen WORKTREE inputs; committed phases reject development ancestors.

### R-M04. Select the macOS watchdog and supervisor protocol. Severity: Major

- **Reviewers and original severities:** `S9-IR-006` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 634](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:634), also 493..504 and 635..640. Raw ID: `S9-IR-006`.

Choose the macOS process/RSS/start-identity/port collection backend and required tools. Define descendant and reparenting ownership, supervisor/driver messages, heartbeat interval and failure threshold, and deadline authority when the driver stalls. The existing Linux /proc preview helper does not supply this boundary. Cover blocked drivers, surviving children, PID reuse, and unavailable accounting.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The selected Mac needs an explicit collection and supervisor boundary. The stdlib libproc collector, registered same-PID lsof exec, workload-only cleanup signals and finalizer proof satisfy that boundary with no compiler or new package. Observed sampling is not described as a hard quota or full transient-peak guarantee.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 5 macOS watchdog/IPC/cleanup and monitor/browser helper rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The selected Mac needs an explicit collection and supervisor boundary. The stdlib libproc collector, registered same-PID lsof exec, workload-only cleanup signals and finalizer proof satisfy that boundary with no compiler or new package. Observed sampling is not described as a hard quota or full transient-peak guarantee.

### R-M05. Pin the UCI child interpreter. Severity: Major

- **Reviewers and original severities:** `S9-IR-001` (Major), `S9-CB-002` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 722](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:722), also 587 and 712..725. Raw IDs: `S9-IR-001`, `S9-CB-002`.

The UCI test invokes a [wrapper using bare python3](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/scripts/hansel-chess-ai:4). Selecting the virtual environment's interpreter for the parent does not alter inherited PATH. Specify activation, an absolute bin-path prefix, or the mapped test's controlled child environment. Preserve the production wrapper and record both interpreter identities.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The production wrapper resolves python3 through PATH. Pinning the parent executable alone cannot prove the child environment. The command prefix and test-owned identity sidecar verify both interpreters without editing the wrapper or changing UCI behavior.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 4 environment, 7 command block and UCI test file-map row.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The production wrapper resolves python3 through PATH. Pinning the parent executable alone cannot prove the child environment. The command prefix and test-owned identity sidecar verify both interpreters without editing the wrapper or changing UCI behavior.

### R-M06. Complete standalone Workbench style compilation. Severity: Major

- **Reviewers and original severities:** `S9-IR-007` (Nit), `S9-CB-003` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 630](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:630), also 496 and 499. Raw IDs: `S9-CB-003`, `S9-IR-007`.

The fixture disables production Vite configuration and names React alone, but actual [styles require Tailwind](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/styles.css:1), and the app root normally imports them. Specify that stylesheet import, the installed Tailwind plugin, and snapshot-confined scan root. Verify computed board grid/square geometry. Codebase Details rated this Major; Implementation Readiness rated it Nit. Both assessments remain recorded; consolidation retains Major.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The actual board depends on generated Tailwind classes. Naming the installed plugin, snapshot Vite root and real stylesheet plus computed geometry makes the component gate exercise actual layout without substituting fixture CSS or loading production hooks.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 5 Vite/style configuration and computed-geometry acceptance; fixture/server/check rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The actual board depends on generated Tailwind classes. Naming the installed plugin, snapshot Vite root and real stylesheet plus computed geometry makes the component gate exercise actual layout without substituting fixture CSS or loading production hooks.

### R-M07. Migrate Roadmap's active and historical claims. Severity: Major

- **Reviewers and original severities:** `S9-CB-004` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 478](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:478), also 479..481 and 598. Raw ID: `S9-CB-004`.

The separately rendered [Roadmap](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/src/components/chess/roadmap.tsx:1) contains an unconditional current-rating claim, including when demo mode would hide trained claims in CardPanel. Decide its active-session versus historical behavior, map the source/owning-contract change, and check claims across the complete rendered Workbench.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Roadmap, header, status, reset and selector copy are visible outside CardPanel. Neutral prop-free project stages and verified active-session text prevent obsolete rating claims across the complete Workbench while preserving recorded historical results separately.
- **Proposed Edit:**
  - **Location:** Technical Plan 7/9, Roadmap/Workbench/ThinkPanel map rows and complete UI/closure criteria.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Roadmap, header, status, reset and selector copy are visible outside CardPanel. Neutral prop-free project stages and verified active-session text prevent obsolete rating claims across the complete Workbench while preserving recorded historical results separately.

### R-M08. Reconcile the remaining public export inventories. Severity: Major

- **Reviewers and original severities:** `S9-CB-005` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 758](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:758), also 515, 519, and 759..769. Raw ID: `S9-CB-005`.

The fixed additions omit public `JwksFetch`, seven more PWA functions, and eight script constants. Reconcile the source export sets and owning entries with signatures or roles. Preserve original F4/F7 historical sets and record the new omissions separately. The [complete codebase finding](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/stage9_codebase_raw.md) names every export and source line. These omissions justify documentation work, not runtime changes.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Source exports contain additional public names beyond the old fixed inventories. Add the 15 script entries and JwksFetch as supplementary sets, preserve original F4/F7 history, and make no runtime edits for these index omissions.
- **Proposed Edit:**
  - **Location:** Detailed Implementation 2/8 supplementary inventories and closure rows.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Source exports contain additional public names beyond the old fixed inventories. Add the 15 script entries and JwksFetch as supplementary sets, preserve original F4/F7 history, and make no runtime edits for these index omissions.

### R-M09. Record alternatives for raw en-passant choice 3. Severity: Major

- **Reviewers and original severities:** `S7-STR-001` (Major), `S8-ZO-001` (Major).
- **Affected scope:** The original target links and lines in the copied finding below. Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Target [line 192](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/reviewed-design-before-resolution.md.txt:192), also 13 and 289..389. Raw IDs: `S7-STR-001`, `S8-ZO-001`.

A1..A14 omit the viable input conventions and their rejection reasons even though this choice can change inputs and moves while preserving a training/live-input difference. Add that alternatives evaluation and selection rationale to the target. Preserve the approved choice and its limitations. Stage 8 retained this existing Major finding; it was not a new issue or evidence of a fix.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The input decision is already approved, but a reader needs its rejected alternatives and costs in the canonical design. Add choices 1, 2 and selected 3 with the existing limitations. The edit preserves the browser raw-target choice and does not authorize retraining.
- **Proposed Edit:**
  - **Location:** Alternatives A15-A17 and alternatives introduction.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The input decision is already approved, but a reader needs its rejected alternatives and costs in the canonical design. Add choices 1, 2 and selected 3 with the existing limitations. The edit preserves the browser raw-target choice and does not authorize retraining.

### R-N01. Replace broad summary language about dependable failures/results/verification with observable loading errors, checkpoint identity, stale-result rejection, and recorded check outcomes. Severity: Nit

- **Reviewers and original severities:** `S7-STY-001` (Nit), `S8-ZO-002` (Nit).
- **Affected scope:** 19..21, 42 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Replace broad summary language about dependable failures/results/verification with observable loading errors, checkpoint identity, stale-result rejection, and recorded check outcomes.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Use observable failure, identity, stale-result and verification outcomes in the summary.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Use observable failure, identity, stale-result and verification outcomes in the summary.

### R-N02. Limit the no-new-dependency claim to browser JavaScript. State Python verification setup separately. Severity: Nit

- **Reviewers and original severities:** `S7-STY-002` (Nit), `S8-ZO-003` (Nit).
- **Affected scope:** 125 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Limit the no-new-dependency claim to browser JavaScript. State Python verification setup separately.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Scope the dependency statement to browser JavaScript and identify Python verification setup separately.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Scope the dependency statement to browser JavaScript and identify Python verification setup separately.

### R-N03. Replace completed document-authoring instructions with direct section references. Retain later implementation and file-map obligations. Severity: Nit

- **Reviewers and original severities:** `S7-STY-003` (Nit), `S8-ZO-004` (Nit).
- **Affected scope:** 40, 44, 178, 287 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Replace completed document-authoring instructions with direct section references. Retain later implementation and file-map obligations.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Replace fulfilled drafting instructions with references while retaining obligations for later implementation/file-map changes.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Replace fulfilled drafting instructions with references while retaining obligations for later implementation/file-map changes.

### R-N04. Split the raw-target addendum into input behavior, preserved rules/restoration, and limitations/comparison meaning. Keep the approval date once. Severity: Nit

- **Reviewers and original severities:** `S7-STY-004` (Nit), `S8-ZO-005` (Nit).
- **Affected scope:** 192 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Split the raw-target addendum into input behavior, preserved rules/restoration, and limitations/comparison meaning. Keep the approval date once.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Separate the raw-target input behavior, restoration/rules and limitations without changing requirements.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Separate the raw-target input behavior, restoration/rules and limitations without changing requirements.

### R-N05. Replace the nonexistent result-column reference with a statement that implementation and verification results are pending for every row. Severity: Nit

- **Reviewers and original severities:** `S9-STY-001` (Nit).
- **Affected scope:** 418 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Replace the nonexistent result-column reference with a statement that implementation and verification results are pending for every row.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** The named result column does not exist. State that implementation and verification results are pending.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). The named result column does not exist. State that implementation and verification results are pending.

### R-N06. Replace tripwires, ruler/defaults, and documentation dirt with deployment integration assertions, historical rating protocol/default settings, and uncommitted documentation changes. Severity: Nit

- **Reviewers and original severities:** `S9-STY-002` (Nit).
- **Affected scope:** 452, 520, 626 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Replace tripwires, ruler/defaults, and documentation dirt with deployment integration assertions, historical rating protocol/default settings, and uncommitted documentation changes.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Concrete engineering terms remove metaphors from acceptance and preservation requirements.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Concrete engineering terms remove metaphors from acceptance and preservation requirements.

### R-N07. Use worker-to-main availability recovery for the automatic transition. Reserve engine retry and move retry for explicit user actions. Severity: Nit

- **Reviewers and original severities:** `S9-STY-003` (Nit).
- **Affected scope:** 475, 596, 750 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Use worker-to-main availability recovery for the automatic transition. Reserve engine retry and move retry for explicit user actions.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Use a single term for automatic worker-to-main availability recovery and retain distinct user retry actions.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Use a single term for automatic worker-to-main availability recovery and retain distinct user retry actions.

### R-N08. Replace subjective display qualifiers with observable conditions or exact section references, including missing records labeled unavailable. Severity: Nit

- **Reviewers and original severities:** `S9-STY-004` (Nit).
- **Affected scope:** 480, 642, 766 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Replace subjective display qualifiers with observable conditions or exact section references, including missing records labeled unavailable.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Replace subjective display qualifiers with verified identity, historical/unavailable labels and complete demo-state checks.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Replace subjective display qualifiers with verified identity, historical/unavailable labels and complete demo-state checks.

### R-N09. Separate artifact contracts into artifact/contents/write-and-finalization timing. Keep workspace layout and publication restrictions separate. Severity: Nit

- **Reviewers and original severities:** `S9-STY-005` (Nit).
- **Affected scope:** 638 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Separate artifact contracts into artifact/contents/write-and-finalization timing. Keep workspace layout and publication restrictions separate.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** An artifact/contents/finalization table and exact completed-record contract make each output requirement locatable. Quote phase path placeholders for literal Markdown rendering.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). An artifact/contents/finalization table and exact completed-record contract make each output requirement locatable. Quote phase path placeholders for literal Markdown rendering.

### R-N10. Expand slash chains into parallel nouns or checklists, preserving paths, identifiers, and numeric conventions. Severity: Nit

- **Reviewers and original severities:** `S9-STY-006` (Nit).
- **Affected scope:** 750, 780 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Expand slash chains into parallel nouns or checklists, preserving paths, identifiers, and numeric conventions.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Expand compressed slash lists into parallel obligations, preserving paths, identifiers and measurement conventions.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Expand compressed slash lists into parallel obligations, preserving paths, identifiers and measurement conventions.

### R-N11. Use Queen's Gambit Declined and King's Indian. Preserve IDs and UCI prefixes. Severity: Nit

- **Reviewers and original severities:** `S9-STY-007` (Nit).
- **Affected scope:** 671, 673 Frozen line numbers refer to the original input.
- **Discrepancy and guidance from FindingsList:**

Use Queen's Gambit Declined and King's Indian. Preserve IDs and UCI prefixes.

- **AI Suggestion:** PROPOSE FIX.
- **Justification:** Correct opening labels only. All twenty IDs and UCI prefixes and all thirteen parity inputs remain unchanged.
- **Proposed Edit:**
  - **Location:** The frozen target lines identified above, with matching summary/checklist wording.
  - **Change:** Apply the exact corresponding replacements in [design-amendments.patch](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/docs/superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/design-amendments.patch). Correct opening labels only. All twenty IDs and UCI prefixes and all thirteen parity inputs remain unchanged.

## Synchronization and evidence

The runtime and verification planning agents used explicit GPT 6.1 Sol Max settings. Their warm integration checks are planning evidence, not another independent Goldfish review or a runtime pass. Three integration inconsistencies were corrected before application: development prerequisite admission, pre-exec process registration, and accounting-only cleanup roots.

The expanded map contains 91 planned files (52 Create, 39 Modify). New rows make previously required behavior and the controlled-test substitution explicit; they do not add training, a new model service or a larger comparison. All original source findings F1-F10/K1/K2 and supplementary R-M08-S/R-M08-A remain open until code/check evidence exists.

Fresh pre-implementation baseline on 2026-11-02: npm test exited 1 with 179 script passes and the same 16 V01-V16 failures; the separately run 39 core tests passed, and type checking passed. The chosen Python 3.11.14 has the pinned NumPy/chess/zstandard installed and no Torch. No real climb dispatcher, self-play generation or chess comparison was run. Controlled replacements are not implemented yet, and retained real S coverage is deferred, not run and not passed.

Contract snippets were parsed for syntax and duplicate members; this is not future implementation type/runtime validation. The 13 numeric input cases, 20 final UCI prefixes, original reviewed snapshot and prior raw review reports are preserved. Final application/link/source checks are recorded in the resolution audit.

## Handoff

Apply and verify the exact document batch, synchronize the pointer/orchestration metadata, then prepare bounded Devin swe-2-max implementation tasks under Sol Max planning/review. Each task includes owning READMEs, exact allowed paths, source/test sizes below 400, targeted tests, same-change documentation and the final code-to-doc comparison. Keep full verification and measurement separate from task completion.

## Application result

The canonical design now matches the exact patch at SHA256 `d6ee4dd999f7c868b54191dddf1dbf21365c2443b82d0c9e91f470760d8da89b`. Reverse patch validation, Markdown formatting/links/headings, six contract-snippet syntax/duplicate-member checks, and map uniqueness checks passed. All thirteen numeric inputs and twenty final UCI prefixes are unchanged. These static checks are not implementation type/runtime results.

All 15 original review artifacts retain their recorded hashes. Of the 217 pre-resolution inputs, only the canonical design and three process documents changed. Source, checkpoints, legacy records and original brief/reviews remain unchanged. The [resolution audit](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-cn8tqswa/resolution-validation.json) records the checks and exact hashes.

Accepted/applied: 21. Contested: 0. Escalated: 0. Declined: 0. Remaining unaddressed document actions: 0. Original source/check findings and deferred real S coverage remain open or deferred as explicitly recorded above. This status does not assert a second independent review pass or functional completion.
