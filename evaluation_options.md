# Tinyaz evaluation-runtime options

- **Date:** 2026-11-01
- **Purpose:** Accepted runtime decision for the one bounded comparison.
- **Decision:** Hansel selected 1, real browser contexts, on 2026-11-01. Options 2 and 3 remain the considered alternatives. Hansel approved the resulting Technical Plan on 2026-11-01; independent EGM review remains pending.
- **Already selected:** [Loading option A](./architecture_options.md). The browser client downloads and retains verified M bytes. This decision is not reopened here.
- **Design:** [final design](./docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md). Overview & Goals is approved. Technical Plan was approved by Hansel on 2026-11-01. The design is saved; independent EGM review remains pending.

## Why this choice matters

Browser fixes change TypeScript execution. The published UCI path uses a separate Python implementation that already defaults to M. A Python match can measure Python behavior or compare checkpoint weights. It does not automatically measure the effect of browser software repairs.

Source inspection and two small rules-only probes established a concrete history difference:

- [Browser oneVisit](./src/lib/chess/mcts.ts) constructs `new Chess(fen)` for every visit. That preserves the current board but omits the earlier moves needed for repetition counts.
- Replaying `g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1`, then playing `f6g8`, produces identical FENs in a board with full history and a board reconstructed from the pre-move FEN. The history-bearing board reports a threefold draw; the FEN reconstruction does not.
- [Python search](./train/src/tinyaz/mcts.py) calls `board.is_game_over()` with its default draw-claim handling. Installed `chess` 1.11.2 reports the repeated position as not game-over by default, and as game-over when `claim_draw=True`. The browser library reports it as a draw with full history.

The probes did not load a model, run MCTS, train, play rating games, or establish an Elo effect. This is not evidence that either library is broken. It shows that rule conventions and history transport must be recorded before calling the two full engines equivalent. Their current rules should not be silently unified or used to rewrite historical results.

The accepted brief already calls for repetition-history and cross-language parity fixtures. The Technical Plan must preserve the browser's complete game context when checking search. A self-contained request can replay the starting position and move sequence while each request still starts a fresh search tree. This does not require retraining or persistent search trees.

## Requirements shared by the options

- Keep the selected loading architecture A, unchanged M control bytes, fresh-root 64 visits, and the accepted resource ceilings.
- Choose one primary bounded comparison. Do not run three separate 40-game cohorts under one authorization.
- Run an identical-engine control first. Lock identities, comparison type, openings, game-end rules, errors, statistical method, and stopping criteria before candidate games.
- Separate S-to-M checkpoint delivery from an actual same-M software change. An unchanged Python engine cannot produce evidence of a Python software gain merely because its browser sibling changed.
- Preserve the old eight-game instrument and historical metadata. No promotion, live bot work, paid compute, or training belongs in this run.
- Record the actual runtime, rule behavior, complete latency, incomplete games, and faults. A resource/time stop or fault before the planned cohort is complete remains inconclusive.

## 1. Run the engines in real browser contexts

**Mechanism:** Use the existing Playwright and Vite tooling with a small test-only page to call each pinned version's actual thinker and worker. The game controller supplies moves and records replies from the two browser contexts. Separate UI smoke checks cover card claims and reset/recovery interactions; engine matches do not replace those checks.

**What it measures:** The browser JavaScript engine and its loading/worker path on the recorded browser/runtime configuration. For a same-M software comparison, explicitly normalize the old revision to the same M bytes in the test fixture. Preserve that override in the run record; the old browser's original S default is a different delivery comparison.

**Trade-offs:** It exercises more of the repaired browser path. It requires browser fixture/server orchestration, runtime pinning, and accounting for browser subprocesses. Startup, load, and worker costs can consume more of the fixed local budget. No throughput advantage is assumed.

**Failure conditions:** Failure to start the fixture or browser, inconsistent model overrides, unavailable assets, worker failure, rule-controller disagreement, or exceeding the shared time/memory ceiling invalidates the strength claim. Browser automation must not accidentally exercise training or publication entrypoints.

## 2. Run the same TypeScript search in Node

**Mechanism:** Add a small evaluation adapter around the actual pinned TypeScript search modules and existing chess.js dependency. Reuse UCI for engine process control where it fits. Keep history/rule handling explicit and compatible with the browser search being tested. The adapter belongs to evaluation, not a new production engine. Browser loading, worker recovery, and UI behavior are checked separately.

**What it measures:** The JavaScript search algorithm with the chosen checkpoint and rule convention. It can compare old and repaired JavaScript at the same M hash. Browser-to-Node fixtures must establish matching inputs and outputs before results support a browser algorithm claim. A Node result is not a measurement of browser loading or worker timing.

**Trade-offs:** It separates match execution from the UI and browser startup. It adds a small adapter and requires parity evidence for the runtime boundary. Any higher throughput must be measured. A Python game controller must not silently impose a different draw convention on the JavaScript engines.

**Failure conditions:** Wrong revision/dependency resolution, adapter changes to search or adjudication, missing history, runtime numerical differences that fail parity, or resource/watchdog failure invalidates the comparison. A Python-only result cannot substitute for the missing browser-to-Node check.

## 3. Use the existing Python UCI engine

**Mechanism:** Use the existing Python engine and a bounded evaluation-only runner. Keep its rule convention explicit. If no Python engine behavior changed, compare existing S and M weights as a checkpoint experiment, or record that no software change was tested. Do not call an unchanged-M-versus-itself control a strength gain.

**What it measures:** Python engine behavior or the effect of existing checkpoint weights under a pinned Python protocol. It can address the historical UCI research path. It cannot quantify the browser repairs or assign a new browser Elo without the required full-engine compatibility evidence.

**Trade-offs:** It reuses the current UCI boundary and existing model-loading path. The PyTorch environment still needs setup and verification. The simpler connection to historical UCI work comes with a narrower claim about browser software.

**Failure conditions:** Missing PyTorch or weights, hidden null-move errors, mixed checkpoint/code identity, draw/adjudication changes, or watchdog/resource stops invalidate the run. The existing eight-game evaluator cannot be made into a 40-game comparison merely by increasing its games argument.

## Next design action

After the owner selects one runtime, complete the Technical Plan with that evaluation data flow and its permitted claim. Define exact model/request/result interfaces, history and terminal fixtures, error/deadline behavior, fixture or adapter boundaries, and run records. Keep the remaining statistical/device details for explicit resolution before the Detailed Implementation section can be approved.

A choice of runtime does not approve a numerical Elo gain, admit retraining, change the selected loading architecture, or authorize match execution during drafting.

## Source references

- [Accepted brief](./concepts_brief.md), especially causal comparisons and verification requirements.
- [Chess library contract](./src/lib/chess/README.md) and [browser search](./src/lib/chess/mcts.ts).
- [Component contract](./src/components/chess/README.md), whose workbench owns the full game.
- [Python package contract](./train/src/tinyaz/README.md), [search](./train/src/tinyaz/mcts.py), and [UCI engine](./train/src/tinyaz/engine_uci.py).
- [Package manifest](./package.json), which already includes Playwright, Vite, TypeScript, and chess.js.
