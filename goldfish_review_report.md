# Goldfish Annotated Review Report

Status: resolved

**Resolved:** 2026-11-01. Hansel replied "auto accept".

**Outcome:** 6 accepted text fixes applied in one batch; 0 contested; 0 escalated; 1 declined; 0 unapplied accepted proposals. The ten implementation drifts remain OPEN.

**Archive note:** Findings, proposed replacement strings, and intake justifications below are retained as the approval record. References to unapproved proposals describe intake. All six PROPOSE FIX items are now accepted for formal design. No preflight, match, training, or runtime change was authorized or executed by this document resolution.

**Target:** [concepts_brief.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/concepts_brief.md) (`full file`, lines 1-196 at intake).
**Target SHA256 at intake:** `f671ae68d4cb6386aab4d14551d482f0533860412adb28789c37f8c8f4e04ba3`.
**Date:** 2026-11-01 (Asia/Shanghai).
**FindingsList:** Seven deduplicated findings from [goldfish_brainstorm_review.md](/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/goldfish_brainstorm_review.md). Original severities are preserved.

## Intake and Scope

Hansel confirmed alignment with the concept and its first milestone on 2026-11-01. That confirmation is recorded in the brief. The later auto-accept response approves the six textual proposals below for the concept baseline. Formal design approval remains separate. The known target, full-file range, and review findings are taken from this ongoing session; no new review was launched.

The Goldfish findings describe the frozen pre-synthesis brief. The current brief already incorporates much of that feedback. Each item below identifies the remaining choice or records why another text edit is unnecessary. A valid original critique is not contested merely because synthesis already addressed part of it.

**Counts:** 6 PROPOSE FIX, 0 CONTEST, 0 ESCALATE, 1 DECLINE. No escalation requires outside facts.

**Applied scope:** The six accepted textual edits were batch-applied to the brief, with its status and handoff synchronized. Source, F1-F10 completion states, dependencies, weights, and runtime were unchanged. The numeric limits in item 5 are now accepted concept limits for formal design. They do not establish performance or authorize a match run.

**Exact patch manifest:** [resolution-proposals.json](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-3ncocv9i/resolution-proposals.json). It preserves pre-application anchors, replacement text, and input hashes. The resolved brief intentionally has a new hash. See the resolution outcome for the resulting hashes and counts.

## Prioritized Findings & AI Suggestions

### 1. Loaded identity and claimed identity can diverge [All six, especially codebase-details and implementation-readiness.] - Severity: Blocker

- **Affected Scope:** F1 repair register, lines 39-45.
- **Discrepancy Description:** Browser selection defaults to S while labels/metadata name M. Failure can produce random S. Worker failure can reload a different checkpoint after readiness without refreshing identity. Count/source fields cannot distinguish two M checkpoints. Independent metadata fetches do not prove which bytes played a move.
- **Rationale:** Centralize intended selection and carry actual digest/architecture/load state through readiness, backend transitions, results, and display. Preserve or visibly replace identity on fallback. Separate historical unbound records from active-model claims. Decide failed-load versus explicit demo behavior. Keep S architecture utilities intact.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The source-backed blocker remains valid. The synthesis already requires identity agreement, but leaves failure/demo policy and fallback pinning open. This proposal makes those choices explicit for formal design. It does not claim F1 is repaired.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
- **Repair:** Reuse `WEIGHTS_URL` as intended selection. Make actual loaded checkpoint identity, readiness, backend fallback, completed results, and card claims agree. Preserve S utilities and legacy S/M readers. Specify visible loading/failure states and any explicitly selected random demonstration.
```

With:

```text
- **Repair:** Reuse `WEIGHTS_URL` as intended selection. Trained play must fail visibly if the intended M checkpoint cannot be verified. Do not automatically substitute random weights. An explicit random demonstration is separate and carries no trained-model rating claim. Pin a session to verified checkpoint bytes and their SHA256, architecture/count, and mode. Worker-to-main fallback must retain those bytes or verify the same digest before continuing. Carry that identity and the actual backend into readiness and each completed result. Show historical records as historical unless their evaluated checkpoint identity is established. Preserve S utilities and legacy S/M readers. These are design requirements to implement and test, not descriptions of current behavior.
```

### 2. A software comparison needs two software identities and a frozen measuring method [Design, zoom-out, comprehension, implementation-readiness.] - Severity: Major

- **Affected Scope:** Comparisons that isolate the cause, lines 113-126.
- **Discrepancy Description:** `vs_snapshot` runs both checkpoints through one implementation and caps at eight games despite larger `games` values. It cannot compare old and new software using one M checkpoint. New openings, adjudication, timing, or inherited search state change the experiment. Repeated deterministic games do not supply unlimited independent evidence.
- **Rationale:** Use the existing UCI boundary with two pinned engines and identical M bytes. Predeclare opening pairs/colors, errors, uncertainty/stopping rule, sample/time caps, and an independent final set. Preserve fresh-root 64. Give browser S-to-M delivery, same-M software, larger visits, clock mode, ruler changes, and new weights distinct comparisons. Rerun both software arms under each proposed ruler.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The synthesis already separates causal comparisons. It still needs an identical-engine control and an explicit rule against claiming a Python software gain when only browser delivery changed. The proposed text preserves the historical instrument and requires a locked method before games.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
Use two independently identified engine processes or revisions for software comparisons. Reuse UCI and existing legal-move libraries. `vs_snapshot` comparing one M file with itself would exercise one implementation twice. A small evaluation-only runner should write run records and raw games without training or public promotion.
```

With:

```text
Use two independently identified engine processes or revisions for software comparisons. Reuse UCI and existing legal-move libraries. First run a small identical-engine control to verify the runner, legal moves, pairing, identities, and output accounting. This control is not strength evidence. A same-M software comparison requires an actual change in the engine under test. If only browser delivery changed and Python execution is unchanged, record that no Python engine gain was tested. Keep the S-to-existing-M comparison separate. Establish browser/Python inference and search parity before using Python matches as supporting evidence for browser delivery; report any remaining difference. `vs_snapshot` comparing one M file with itself exercises one implementation twice. The evaluation-only runner writes run records and raw games without training, promotion, or historical-metadata replacement. Freeze software, checkpoint, openings, outcome protocol, and the statistical rule before candidate games.
```

### 3. Requests, failures, and timeouts lack a bounded lifetime [Codebase-details, comprehension, design, implementation-readiness.] - Severity: Major

- **Affected Scope:** Additional software and evaluation limits, lines 104-105.
- **Discrepancy Description:** Old browser results can reach a reset game. Failed turns can retry automatically and load warnings can disappear. Initialization fallback starts another fetch; worker-search fallback retries outside its timeout. UCI blocks command handling during search and has no stop handler. Search timers omit startup/retries; Stockfish response reads have no deadline. Null moves hide multiple failure causes.
- **Rationale:** Establish request/game/position identity, stale-result rejection, stable errors, bounded retries, and complete-operation deadlines. Count fault null moves separately from terminal outcomes. Record load/setup/search/retry and end-to-end latency separately. Use an external evaluation watchdog. Design an opt-in clock mode only after an extra-search/latency probe justifies it; preserve fixed Visits compatibility.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The lifecycle critique is valid. The current brief describes requirements without choosing retry ownership, stale-result rules, or a whole-operation ceiling. The proposal defines those behaviors and a visible, provisional time bound. Physical cancellation remains distinct from game-state protection.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
Specify stable errors, bounded retries, and stale-result rejection by game/request/position identity. Physical cancellation is a separate compute question.
```

With:

```text
Require game-generation, request-position, request-ID, and checkpoint checks before applying a result. Reset or engine replacement invalidates earlier work. A late result cannot mutate the current game. A failed turn remains stopped until an explicit retry or reset; automatic effects must not restart it. Keep load failures visible until recovery succeeds. Physical cancellation is best effort and does not replace result invalidation.
```

Location 2: replace this exact text in the affected scope:

```text
Measure and bound the whole operation, with an external evaluation watchdog.
```

With:

```text
For the first design, propose a 90-second total browser-operation deadline starting before loading or search and shared by worker/main fallback. Permit at most one backend transition within that deadline. Retire the previous backend before retrying. Report loading, search, fallback, cancellation, and stale-result disposition separately. Use an external evaluation watchdog for engine commands. This proposed ceiling is a stop bound, not a measured latency promise. Do not add a UCI clock mode in this milestone.
```

### 4. Verification recovery must preserve real contracts and establish numerical correctness [Zoom-out, implementation-readiness, codebase-details, comprehension.] - Severity: Major

- **Affected Scope:** Proposed stages, verification recovery, line 182.
- **Discrepancy Description:** The dated npm failures mix portable fixtures, real deployment tripwires, and missing authoring-template checks. The command stops before TypeScript suites. PyTorch checks remain unrun. Python board restoration is not protected against evaluator exceptions. S/M readers do not establish numerical parity, and the JS writer remains S-sized.
- **Rationale:** Reproduce/classify failures without changing unrelated auth/PWA behavior. Isolate portable fixtures and preserve actual integration checks. Restore a repeatable Python environment. Use forced-mate, terminal/value/history, error-restoration, and packed-M parity fixtures before changing algorithms. Use Python-packed M; defer serializer expansion without a writing use case.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The synthesis correctly limits test repair. A per-failure ledger makes ownership and unresolved checks auditable and prevents a passing subset from being reported as a green full suite. This is documentation for later verification, not permission to remove tests or change auth/PWA behavior.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
Establish a repeatable Python environment and record versions before using skipped checks as evidence.
```

With:

```text
Establish a project-local Python environment and record versions before using skipped checks as evidence. Add a verification ledger to the experiment plan with one row per existing failure or missing check: contract owner, reproduction command, classification, chosen repair, and result. Separate portable fixtures, application integration checks, and upstream authoring-template checks. Preserve required deployment and authentication checks. Do not waive a required check, change runtime defaults, or remove a template check without an explicit ownership decision. A green chess subset does not imply the full npm command is green.
```

### 5. Cost, schedule, and finite decision gates remain unresolved [All six.] - Severity: Major

- **Affected Scope:** Cost, schedule, and conditional risks, line 140.
- **Discrepancy Description:** The concept did not set machine/time/memory/sample ceilings or a final stop decision. Existing M has a 9,706,840-byte file versus S's 2,560,088 bytes, but latency and peak RAM are unmeasured. Replay sampling caps occur after full-file loading; generation/shards can grow or retain interrupted-run content. A three-loop training limit is not a full resource bound.
- **Rationale:** Use a bounded local preflight, then set paired-game, elapsed/process-time, RAM, disk, worker, candidate, and engineering-effort limits. Name target devices and latency/failure thresholds. Budget exhaustion must stop with an inconclusive result. No user budget, calendar estimate, paid compute, or Elo gain should be invented.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The resource and finite-stop critique remains valid. The limits below are new proposals for review, not user-approved budgets or empirical estimates. Statistical choices and task/schedule estimates still belong in formal design before any match execution. Accepting this text does not run the preflight or matches.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
No machine allowance, engineer-time estimate, calendar schedule, numerical match cap, or latency threshold has been approved. This remains a gap before execution-ready design. Use a bounded local preflight to estimate throughput, then record maximum paired games, process-hours, elapsed time, RAM, disk, worker/process count, and stopping conditions before a long run. Keep runs sequential initially and record thread/device settings. Budget exhaustion produces an inconclusive result, not automatic extensions. No paid compute is authorized.
```

With:

```text
Proposed first-run ceilings for formal design: use one existing local machine, one game at a time, and no paid or remote compute. Limit the throughput preflight to 10 minutes. Limit the comparison cohort to 20 complete opening/color pairs, 40 games, or 60 minutes, whichever bound is reached first. Use a 30-second startup/readiness watchdog and a 90-second per-command watchdog. Cap aggregate evaluation-process resident memory at 4 GiB and new evaluation outputs at 256 MiB. Record hardware, runtime, device, thread settings, and actual use; do not silently raise a ceiling. Retain incomplete games/pairs and every fault in raw records. A fault or a time/resource stop before the planned complete cohort yields an inconclusive strength result. These are proposed resource limits, not measured requirements or performance estimates. Before matches, formal design must lock the opening list and independent final set, outcome rules, statistical decision method, error treatment, and exact pass/stop criteria. It must also provide task-effort and elapsed-run estimates from the detailed file plan and preflight. Do not infer a delivery date or numerical Elo gain. Preserve the old eight-game instrument separately.
```

### 6. Training, publication, and live evidence need separate gates [Structural, implementation-readiness, design, codebase-details.] - Severity: Major

- **Affected Scope:** When retraining is needed, line 134.
- **Discrepancy Description:** Promotion replaces artifacts separately and source rewriting is another step. Missing SF results can leave old gauntlet records on newly published weights. Bot records cannot identify active engine/configuration, mix game categories, use lifetime stop counts, and mark seen before exports finish. These are static risks, not observed historical incidents.
- **Rationale:** Keep the first comparison evaluation-only. Open training only for observed learning weaknesses or demonstrated bad training targets, with its own data/resource/holdout rules. Before future publication, choose missing-result policy, coherent identity/activation, single-writer behavior, rollback, and runtime reload checks. Before separately authorized live work, bind game cohorts to actual runtime identity and recover exports.
- _**AI Suggestion:**_ PROPOSE FIX
- **Disposition:** Accepted and applied to concepts_brief.md.
- _**Justification:**_ The synthesis already defers training, publishing, and live play. The proposal makes their admission evidence explicit and prevents missing measurements or old ratings from being treated as new-checkpoint passes. It does not expand the first milestone or change existing publisher behavior.
- _**Proposed Edit:**_

Location 1: replace this exact text in the affected scope:

```text
Before opening training, specify the observed failure, data/target correction, candidate count, resource budget, and independent pass/stop criteria. Retain old M bytes as the control. Training is not automatic after a disappointing result. No training has happened here.
```

With:

```text
Before opening training, require a separate design decision naming the repeatable learning weakness or demonstrated training-target defect, proposed data/target correction, candidate count, resource budget, and independent pass/stop criteria. Retain old M bytes as the control. No required measurement that is missing, failed, or linked to different weights can count as a pass. New weights cannot inherit an earlier checkpoint's rating. Before any later publication, choose and test complete-release identity, activation, missing-result behavior, single-writer coordination, and rollback. Before live bot work, obtain its separate runtime scope and bind completed eligible games and exports to authoritative engine/configuration identity. These are admission requirements for deferred work. They do not alter legacy publishers or authorize training, promotion, deployment, or live play. Training is not automatic after a disappointing result. No training has happened here.
```

### 7. Closure and terminology must match actual evidence [Structural, comprehension, zoom-out.] - Severity: Nit

- **Affected Scope:** F1-F10 register, lines 35-99; stages and documentation obligations, lines 184-194.
- **Discrepancy Description:** API omissions are documentation gaps, not six strength defects. Selected visits can relabel the prior result. One-visit random control is not an Elo, operation estimates need conventions, and missing evidence does not mean an evaluation is running. F10 documents a current state transition rather than a proved valid-game defect.
- **Rationale:** Track F1-F10 individually with OPEN status, repair action, Modify/Create paths, completion evidence, and possible Elo impact. Keep inventories in owning contracts, with parent links. Render completed result identity/budget/time together. Use recorded, unavailable, and running only when supported.
- _**AI Suggestion:**_ DECLINE
- **Disposition:** Declined. No additional edit; existing concept coverage retained.
- _**Justification:**_ This is the original Nit. Its concept-level requests are already incorporated: ten OPEN rows, owning README maps, precise measurement labels, F10 documentation-only scope, completed-result display requirements, and same-change docs/final comparison. Another textual rewrite would duplicate that content. Runtime UI corrections remain future work; declining an additional text edit does not close those repairs.
- _**Proposed Edit:**_

No change. Retain the current concept text and future runtime work as recorded.

## Resolution Outcome

[Resolution outcome and hashes](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-3ncocv9i/resolution-outcome.json) records the applied items and preserved scope.

## Handoff and Remaining Work

The six accepted text fixes are applied; the Nit is declined without an extra edit. Counts: accepted 6, contested 0, escalated 0, declined 1, unapplied accepted proposals 0. Formal-design details remain to be specified as listed below. A resolved annotation is not a repaired engine. F1-F10 remain OPEN until their actual completion evidence exists.

The next design skill is **egm-draft**, using the aligned brief and accepted resolution decisions. It must specify implementation interfaces, files, tests, parity tolerances, exact match protocol and statistical rules, target devices, estimates, failure/rollback handling, and documentation changes. Preserve its section approval and final design approval gates. An implementation-readiness review follows the formal draft before code changes.

No algorithm change, new training, broader publication system, or live bot work is admitted by this resolution. Documentation stays current with each later meaningful code change. A final code-to-document comparison is required before each green commit or completion claim.
