# Tinyaz implementation with Devin and GPT 6.1 Sol Max

- **Date:** 2026-11-02
- **Owner direction:** Hansel requested Devin CLI with SWE 2.0 for implementation, with GPT 6.1 Sol Max planning, orchestrating and reviewing. Subagents may be used as needed.
- **State:** CLI/authentication/model availability checked. The five-stage EGM review completed with nine fresh Sol Max reviewers. Its 21 document actions (1 Blocker, 9 Major, 11 Nit) are addressed by the owner-authorized resolution. Warm Sol Max planning checks verified the integrated amendments; these are not a second independent EGM pass or runtime evidence. A fresh application/core/type baseline is recorded. No Devin implementation session, worktree, commit, push, training or comparison cohort has started.
- **Design authority:** [Verified M delivery and bounded software evaluation](../specs/2026-11-02-tinyaz-verified-m-software-design.md). Its behavior, file map, approval gates and experiment limits remain unchanged.

## Verified tools and exact model settings

The installed `devin` executable is `/Users/hansel/.local/bin/devin`, version `3000.11.234` (`92c83011d113`). `devin auth status` reports logged in. Credentials and account identity were not printed or copied into this plan.

`devin models` lists the SWE-2 family and exact model ID `swe-2-max`. Use that ID for Hansel's SWE 2.0 implementation request. Do not substitute SWE-1.7, a Fusion model or a Lightning variant. This checks account/catalog availability, not the outcome of an implementation run.

The native planning coordinator was launched with model `gpt-6.1-sol`, reasoning effort `max`, and a fresh context. Planning, orchestration and code-review agents use those explicit settings. This does not assert that this chat's own model setting was changed.

Use the local CLI against the isolated local checkout. Do not add `--cloud` or create a cloud development box. The [official Devin CLI documentation](https://docs.devin.ai/work-with-devin/devin-cli) describes that local execution surface. Remote coding inference is the requested coding-tool choice; it does not authorize remote chess training or evaluation, deployment, new weights or a changed experiment budget.

Installed CLI help confirms `--prompt-file`, `-p`, `--model`, `-c`, `-r`, `--permission-mode` and optional `--sandbox`. Pin `--model swe-2-max` on every initial session and every resume. Omitting it on a resume retains the session's previous model, so relying on a global default is insufficient.

## Responsibilities

| Role                                          | Responsibility                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPT 6.1 Sol Max coordinator                   | Maintain the plan, choose bounded task boundaries, freeze inputs, issue exact-file briefs, review diffs/tests/docs, integrate accepted changes, and own full verification and interpretation.                             |
| Devin CLI, `swe-2-max`                        | Implement one bounded task in its assigned worktree, update its corresponding contracts/checklist in the same change, run targeted checks, and return concrete branch/commit/test evidence.                               |
| Fresh EGM Goldfish reviewers, GPT 6.1 Sol Max | Apply the installed personas and standards independently. Start with no parent turns. Skip memory, chat history and context restoration. The warm planning coordinator is not reused as an independent Goldfish reviewer. |
| Local verification processes                  | Run the approved Node/browser/Python checks and the single bounded chess cohort on the recorded local machine. An agent's assurance does not replace command exits, identities, raw games or cleanup evidence.            |

The [local delegation skill](/Users/hansel/.agents/skills/delegation/SKILL.md) defines the Devin lane convention. Its “Claude plans, briefs, reviews, and merges” role is assigned to the user-requested GPT 6.1 Sol Max coordinator here. Devin remains the implementation worker.

## Review before implementation

The saved design ends with independent EGM review before production implementation. Hansel selected the full consolidated-report mode. All five stages and nine fresh reviewers completed. The [consolidated review report](../reviews/2026-11-02-tinyaz-verified-m/consolidated_review_report.md) maps 29 observations to 21 actions and preserves both severity disagreements. The [annotated resolution](../reviews/2026-11-02-tinyaz-verified-m/resolution/goldfish_review_report.md) records 21 accepted text fixes under the standing auto-accept and subsequent approve/continue instruction. Original code findings remain open. Dispatch implementation against the amended contracts, preserving the deferred real S coverage disclosure.

Use the installed EGM plugin's personas and standards. Every Goldfish launch must explicitly use `fork_turns: none` or the equivalent native fresh-context setting. Reviewers get the target, rubric and selected source/contracts, not this chat transcript or GBrain facts. Do not fill a missing design explanation with the predecessor brief or earlier review history. Record any missing reads or inaccessible inputs as incomplete review coverage.

Keep source/weights and the approved design unchanged during the review pass. Put new review artifacts in the established reviews area without overwriting the historical brainstorm/resolve reports. Resolve new design findings through the EGM gates before dispatching implementation packets.

## Bounded work sequence

Default to **one active Devin implementation session**. The canonical progress checklist and experiment ledger are shared files required in meaningful code commits. They make apparently separate source tasks overlap. Read-only review subagents may run concurrently where the EGM stage permits. Parallel implementation requires disjoint code and documentation ownership, not merely different source modules.

| Packet | Scope and prerequisite                                                                                                                                                                                                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C0     | After EGM review, preserve dirty-work/source/asset evidence and establish the reviewed documentation baseline and experiment ledger. Retain `chore/egm-bootstrap-tinyaz` as the integration branch. Do not touch main.                                                                                                                                          |
| C1     | Portable script fixtures, required test discovery, the scoped split of the 506-line PWA test, and the four retained authoring checks under their approved separate command. Preserve app auth/PWA/Nitro/runtime behavior.                                                                                                                                       |
| C2a    | F2/F3 comment corrections and exact F4-F10 contract inventories/behavior. Keep the UCI implementation and SQL statements unchanged.                                                                                                                                                                                                                             |
| C2b    | Project-local Python verification inputs, controlled climb rewrite before its required invocation, separately retained deferred real S regressions, F10's regression and K1's reproduced restoration fix. Verify the real imported module before repairing it; preserve normal-path selection and Python encoding.                                              |
| C3     | Compatible foundations may be separate green packets. Keep incompatible loader/search/protocol changes together with every affected thinker, worker, gauntlet, hook, Workbench, neutral Roadmap and display consumer. Retain raw en-passant state under approved choice 3. Extract the hook before the existing 335-line Workbench grows past the source limit. |
| C4a    | Bounded record/watchdog/statistics helpers and their meaningful targeted tests. Freeze helper interfaces before another packet consumes them.                                                                                                                                                                                                                   |
| C4b    | Source snapshots, fixture servers, actual browser adapters, UI checks and numeric parity. Sol runs the actual development-snapshot browser/parity gates before the corresponding green commit. No final-opening games.                                                                                                                                          |
| C5     | Sol freezes the exact green candidate and rebinds checks/parity to that commit, runs preflight, then the one final cohort if prerequisites pass. Keep the candidate unchanged during games and retain inconclusive evidence.                                                                                                                                    |

Each packet's launch brief must replace the packet description with exact allowed files from the canonical 91-file map. Include the actual base commit, required owning READMEs, precise test commands, expected outputs and stop conditions. Shared-doc write ownership is assigned to only that active packet. A file split or interface change outside the brief stops for coordinator review; it does not silently enlarge the task.

The coordinator prepares an isolated worktree on a `fix/`, `feat/` or `chore/` branch for each bounded session, using the host's worktree tooling. Preserve the original checkout's dirty documentation. No worktree has been created during this setup.

## Launch and resume contract

Run the command with the executor's working directory set to the assigned worktree. `TINYAZ_DEVIN_BRIEF` is an absolute path to the reviewed brief. The following are future invocation templates, not commands executed by this setup:

```sh
devin --model swe-2-max --permission-mode smart -p --prompt-file "$TINYAZ_DEVIN_BRIEF"
```

Resume the recorded session explicitly. `TINYAZ_DEVIN_SESSION_ID` and `TINYAZ_DEVIN_FOLLOWUP` come from that task's launch record:

```sh
devin --model swe-2-max --permission-mode smart -p -r "$TINYAZ_DEVIN_SESSION_ID" --prompt-file "$TINYAZ_DEVIN_FOLLOWUP"
```

Use `-c` only when the coordinator has established that the directory's most recent session is the intended task, and still pass the explicit model. The `smart` mode runs actions the CLI's safety classifier accepts; it is not a promise that every command is unattended. If permissions or workspace trust block a run, record the block. Do not silently switch to `dangerous`, disable trust or change global configuration to bypass it.

Capture the actual launch PID, session ID, model, working directory, branch/base, prompt-file hash and stdout/stderr paths. Wait on that exact process/session. Never find or terminate Devin by process-name pattern. Keep logs outside the source tree and omit credentials from evidence.

The brief requires targeted tests, source/test files below 400 lines, code-to-doc comparison, a green scoped change, a commit and push to its scoped branch after each green change, no PR, and a final response listing branch, each commit and exact test result. Those commit/push rules come from the delegation skill. Preserve the design's no-deployment boundary; if actual branch automation would conflict, report that concrete conflict before triggering it. A blocked or red task stops without inventing a successful commit.

When a required gate belongs to Sol, such as the real browser/parity check before a harness commit, Devin stops at the prepared diff and targeted-test evidence. Sol runs that gate. Resume the same explicit-model session to finish the commit only after the gate passes. Do not call a subset a full-suite pass.

## Sol's acceptance checks

Before integration, inspect the complete actual diff and verify:

- Worktree/base/branch/commit identity and exact allowed-path compliance.
- Targeted command exits, regression reproduction, artifacts, blockers and source/test line counts.
- Affected README/API/usage changes and progress/ledger updates in the corresponding change. Compare behavior, interfaces, invariants, side effects, paths and commands. Do not use timestamps as synchronization evidence.
- V01-V16 ownership/results and F1-F10/K1/K2 closure proof. Keep missing or failed evidence open.
- Unchanged M/S bytes, legacy metadata, historical instruments and dependencies outside the approved declaration/pins.
- For later browser work, native M identity, one fetch/recovery, stale/cancel/error protection, actual UI checks, all 13 numeric cases/tolerances, raw manifests/events/PGNs, resource peaks and verified process/port cleanup.

Sol runs one full verification at a time. Reviewed task commits integrate only into the scoped integration branch. No automatic merge to main, release, deployment or publication is added by this tool choice.

The chess comparison remains fresh-root 64 visits, one machine and one game at a time: a 10-minute preflight; at most 20 complete pairs/40 games or 60 minutes; 30-second readiness and 90-second command watchdogs; 4 GiB aggregate evaluation-process RSS; and 256 MiB workspace footprint with peak accounting. The original fault/incomplete rules remain. A finished agent session, passing subset or favorable partial score is not completion evidence.

## Evidence boundaries

The configured GPT 6.1 Sol Max planning agent completed its read-only coordination pass, source/contract spot-checks and review of this execution note. It found no blocking setup mismatch. That is setup evidence, not an independent EGM review or a code fix. Explicit spawned-agent settings do not change the host chat's model. Native fresh-context and nested support were verified by an actual probe and completed child before the separate nine-reviewer EGM pass. Parent checks confirmed actual reviewer completions, report links, finding traceability and unchanged design/source/checkpoint inputs. CLI version/auth/catalog checks succeeded; no Devin implementation prompt has run. The canonical design remained unchanged throughout the completed review. This note's review-status metadata was updated afterward; the report preserves the exact execution-note hash supplied to Stage 9.

The subsequent Resolve pass amended the canonical design and synchronized this note and the root pointer. It preserves the exact original reviewed snapshot and prior reports. The map now has 91 paths, including explicit protocol, completed-evidence and macOS-monitor splits, Roadmap, and the controlled/deferred climb-test separation. Fresh baseline: `npm test` has 179/195 script passes and the same 16 failures; the 39 core tests and type checking pass. Torch remains absent. No original real climb/self-play command was executed.
