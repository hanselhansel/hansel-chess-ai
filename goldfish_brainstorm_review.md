# Goldfish Brainstorm Review

**Target:** `concepts_brief.md`, frozen input lines 1-183, SHA256 `48bc533856c511d77a19cb4f4868248ecbee1fa7d18aa79eef6b0f0beb8063cc`.

**Mode/date:** BRAINSTORM, 2026-11-01. Source revision `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec` plus existing documentation changes. The [updated brief](./concepts_brief.md) is a synthesis after review. The reviewers did not review that later text.

**Outcome:** Six actual completed reviews. One deduplicated blocker, five major findings, and one nit are carried below. These are concept and evidence risks, not measured Elo losses. Findings and F1-F10 repairs remain OPEN. No code, weights, approved design, README contract, or dated drift report was changed by this review.

## Reviewer Status

All six were started in parallel using native `collaboration.spawn_agent` with `fork_turns: none`. Native nesting succeeded. Each read its installed persona and supplied standards before reporting. All returned full-read evidence and the matching frozen brief hash. No failures or retries occurred.

| Reviewer / role                                                               | Native task ID                                                 | Status    | Read records | Retry |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- | -----------: | ----: |
| egm-design, Cost, Quota & Token Economics Brainstormer                        | `/root/brainstorm_synthesis/goldfish_design`                   | completed |           26 |     0 |
| egm-codebase-details, Observability & SRE Debuggability Brainstormer          | `/root/brainstorm_synthesis/goldfish_codebase_details`         | completed |           24 |     0 |
| egm-zoom-out, Contrarian / YAGNI Brainstormer                                 | `/root/brainstorm_synthesis/goldfish_zoom_out`                 | completed |           26 |     0 |
| egm-comprehension, UX & Developer Ergonomics Brainstormer                     | `/root/brainstorm_synthesis/goldfish_comprehension`            | completed |           25 |     0 |
| egm-implementation-readiness, Migration & Backward Compatibility Brainstormer | `/root/brainstorm_synthesis/goldfish_implementation_readiness` | completed |           28 |     0 |
| egm-structural, Long-Term Tech Debt & Maintainability Brainstormer            | `/root/brainstorm_synthesis/goldfish_structural`               | completed |           23 |     0 |

The 152 returned read records cover all assigned personas, standards, common documents, sources, and applicable direct-directory READMEs. Line ranges cover each complete file. Returned hashes matched local bytes while the input was frozen; the parent audit also ran before synthesis intentionally replaced `concepts_brief.md`. Truncated reading batches were recovered by full subsequent reads. The brief remained frozen until all six final reports arrived. `collaboration.list_agents` then reported completed statuses. Canonical task paths are the IDs exposed by this host; the tool schema does not expose raw child tool transcripts as files.

Reviewers reported no writes, memory retrieval, compilation, tests, installs, network, bot activity, branch changes, or nested agents. They used only the installed EGM bundle's personas and standards. The common standard was Heilmeier; zoom-out and implementation-readiness also read their bundled standards. Readiness findings identify later design work, not approval of an executable plan.

## Prioritized Findings

### 1. Loaded identity and claimed identity can diverge. Severity: Blocker

- **Lenses:** All six, especially codebase-details and implementation-readiness.
- **Scope/evidence:** `src/lib/chess/weights.ts:188-195`; `src/lib/chess/think-client.ts:5-35,115-125,159-170`; `src/workers/think.worker.ts:10-20`; `src/components/chess/workbench.tsx:142-178`; `src/components/chess/card-panel.tsx:56-95`.
- **Discrepancy:** Browser selection defaults to S while labels/metadata name M. Failure can produce random S. Worker failure can reload a different checkpoint after readiness without refreshing identity. Count/source fields cannot distinguish two M checkpoints. Independent metadata fetches do not prove which bytes played a move.
- **Recommendation:** Centralize intended selection and carry actual digest/architecture/load state through readiness, backend transitions, results, and display. Preserve or visibly replace identity on fallback. Separate historical unbound records from active-model claims. Decide failed-load versus explicit demo behavior. Keep S architecture utilities intact.
- **Synthesis disposition:** F1 remains OPEN with exact file, contract, fixture, and browser-evidence maps. Existing M needs no retraining. Its selection alone does not explain UCI ratings because UCI already defaults to M.

### 2. A software comparison needs two software identities and a frozen measuring method. Severity: Major

- **Lenses:** Design, zoom-out, comprehension, implementation-readiness.
- **Scope/evidence:** `train/src/tinyaz/rate.py:18-19,31-87,136-190`; `train/src/tinyaz/outcome.py:24-32`; `src/lib/chess/mcts.ts:179-200`; `train/src/tinyaz/mcts.py:104-137`.
- **Discrepancy:** `vs_snapshot` runs both checkpoints through one implementation and caps at eight games despite larger `games` values. It cannot compare old and new software using one M checkpoint. New openings, adjudication, timing, or inherited search state change the experiment. Repeated deterministic games do not supply unlimited independent evidence.
- **Recommendation:** Use the existing UCI boundary with two pinned engines and identical M bytes. Predeclare opening pairs/colors, errors, uncertainty/stopping rule, sample/time caps, and an independent final set. Preserve fresh-root 64. Give browser S-to-M delivery, same-M software, larger visits, clock mode, ruler changes, and new weights distinct comparisons. Rerun both software arms under each proposed ruler.
- **Synthesis disposition:** The brief now specifies these causal separations and an evaluation-only runner. A supported negative or inconclusive result can end the first milestone. Numerical experiment choices remain open before execution-ready design.

### 3. Requests, failures, and timeouts lack a bounded lifetime. Severity: Major

- **Lenses:** Codebase-details, comprehension, design, implementation-readiness.
- **Scope/evidence:** `src/components/chess/workbench.tsx:87-117,181-199`; `src/lib/chess/think-client.ts:37-42,112-179`; `train/src/tinyaz/engine_uci.py:64-93,164-196`; `train/src/tinyaz/uci.py:21-60`.
- **Discrepancy:** Old browser results can reach a reset game. Failed turns can retry automatically and load warnings can disappear. Initialization fallback starts another fetch; worker-search fallback retries outside its timeout. UCI blocks command handling during search and has no stop handler. Search timers omit startup/retries; Stockfish response reads have no deadline. Null moves hide multiple failure causes.
- **Recommendation:** Establish request/game/position identity, stale-result rejection, stable errors, bounded retries, and complete-operation deadlines. Count fault null moves separately from terminal outcomes. Record load/setup/search/retry and end-to-end latency separately. Use an external evaluation watchdog. Design an opt-in clock mode only after an extra-search/latency probe justifies it; preserve fixed Visits compatibility.
- **Synthesis disposition:** These are additional proposed software/measurement requirements with no measured Elo effect. F10 remains documentation-only; invalid-position semantics are not folded into this repair.

### 4. Verification recovery must preserve real contracts and establish numerical correctness. Severity: Major

- **Lenses:** Zoom-out, implementation-readiness, codebase-details, comprehension.
- **Scope/evidence:** `package.json:19`; `scripts/brand-check.test.mjs:304-373`; `scripts/with-app-env.test.mjs:62-83`; `scripts/grok-pwa-plugin.test.mjs:105-126,483-506`; `scripts/grok-pwa-shared.mjs:403-414`; `train/src/tinyaz/mcts.py:116-136`; `src/lib/chess/weights.ts:147-185,198-230`.
- **Discrepancy:** The dated npm failures mix portable fixtures, real deployment tripwires, and missing authoring-template checks. The command stops before TypeScript suites. PyTorch checks remain unrun. Python board restoration is not protected against evaluator exceptions. S/M readers do not establish numerical parity, and the JS writer remains S-sized.
- **Recommendation:** Reproduce/classify failures without changing unrelated auth/PWA behavior. Isolate portable fixtures and preserve actual integration checks. Restore a repeatable Python environment. Use forced-mate, terminal/value/history, error-restoration, and packed-M parity fixtures before changing algorithms. Use Python-packed M; defer serializer expansion without a writing use case.
- **Synthesis disposition:** The brief preserves the dated baseline and missing checks. F4 changes only its README. Any edited source/test must be under 400 lines: the 506-line PWA test needs a scoped split before repair; the 527-line shared helper is not a documentation-repair target. No new checks ran in this review.

### 5. Cost, schedule, and finite decision gates remain unresolved. Severity: Major

- **Lenses:** All six.
- **Scope/evidence:** Frozen `concepts_brief.md:120-127,151-178`; bundled `heilmeier-standard.md:25-30`; `src/lib/chess/weights.ts:147-185`; `train/src/tinyaz/train_loop.py:38-49`; `train/src/tinyaz/generate.py:78-141`; `train/scripts/climb_m.py:124-149`.
- **Discrepancy:** The concept did not set machine/time/memory/sample ceilings or a final stop decision. Existing M has a 9,706,840-byte file versus S's 2,560,088 bytes, but latency and peak RAM are unmeasured. Replay sampling caps occur after full-file loading; generation/shards can grow or retain interrupted-run content. A three-loop training limit is not a full resource bound.
- **Recommendation:** Use a bounded local preflight, then set paired-game, elapsed/process-time, RAM, disk, worker, candidate, and engineering-effort limits. Name target devices and latency/failure thresholds. Budget exhaustion must stop with an inconclusive result. No user budget, calendar estimate, paid compute, or Elo gain should be invented.
- **Synthesis disposition:** The brief exposes this as a gap before execution-ready design, identifies metrics and stage exams, and ends the first milestone before conditional follow-ups. Numerical caps and estimates still require alignment/design.

### 6. Training, publication, and live evidence need separate gates. Severity: Major

- **Lenses:** Structural, implementation-readiness, design, codebase-details.
- **Scope/evidence:** `train/src/tinyaz/promote.py:50-63`; `train/scripts/train_m.py:47-51,98-100`; `train/scripts/climb_m.py:57-78,107-117`; `train/lichess-bot/challenge_rotator.py:213-269,283-286,315-339`.
- **Discrepancy:** Promotion replaces artifacts separately and source rewriting is another step. Missing SF results can leave old gauntlet records on newly published weights. Bot records cannot identify active engine/configuration, mix game categories, use lifetime stop counts, and mark seen before exports finish. These are static risks, not observed historical incidents.
- **Recommendation:** Keep the first comparison evaluation-only. Open training only for observed learning weaknesses or demonstrated bad training targets, with its own data/resource/holdout rules. Before future publication, choose missing-result policy, coherent identity/activation, single-writer behavior, rollback, and runtime reload checks. Before separately authorized live work, bind game cohorts to actual runtime identity and recover exports.
- **Synthesis disposition:** Training, publication redesign, and bot export/cohort work are conditional or deferred. They are not prerequisites for selecting existing M. No training, live configuration check, bot action, publication, or deployment happened.

### 7. Closure and terminology must match actual evidence. Severity: Nit

- **Lenses:** Structural, comprehension, zoom-out.
- **Scope/evidence:** `2026-11-01_DRIFT_REPORT.md:14-97`; `src/lib/chess/constants.ts:30-33,61-79`; `src/components/chess/card-panel.tsx:86-146`; `train/src/tinyaz/engine_uci.py:95-124,146-148`.
- **Discrepancy:** API omissions are documentation gaps, not six strength defects. Selected visits can relabel the prior result. One-visit random control is not an Elo, operation estimates need conventions, and missing evidence does not mean an evaluation is running. F10 documents a current state transition rather than a proved valid-game defect.
- **Recommendation:** Track F1-F10 individually with OPEN status, repair action, Modify/Create paths, completion evidence, and possible Elo impact. Keep inventories in owning contracts, with parent links. Render completed result identity/budget/time together. Use recorded, unavailable, and running only when supported.
- **Synthesis disposition:** The updated brief contains the register and same-change documentation/final code-to-doc comparison obligations. No finding was marked fixed from documentation alone.

## Evidence Archive and Remaining Gates

Complete reviewer reports, with citation markup normalized in five reports, are outside the repository:

- [Evidence directory](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238)
- [Native completion observations and report paths](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/native-completion.json)
- [152 returned read records](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/reviewer-read-evidence.json)
- [Frozen input](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/concepts_brief.frozen.md)
- [Source hashes](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/source-union-manifest.json), [installed bundle hashes](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/installed-bundle-manifest.json), and [checkpoint byte/header hashes](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-brainstorm-synthesizer-qm4ea238/checkpoint-asset-manifest.json)

Root separately reported a passed audit of all 152 hashes, complete line-range unions, original assignments, and native completion evidence: [parent audit](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-root-t4_1b58d/root/goldfish-evidence-parent-audit.json).

Remaining decisions are failure/demo and identity compatibility, session pinning, request/deadline policy, target devices, experiment caps and statistical rules, cost/schedule estimates, and the conditions for optional clock/reuse/training work. The parent handles artifact alignment and the handoff gate. No implementation or requirement change is approved by reviewer completion.
