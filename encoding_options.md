# Tinyaz: en-passant input contract

- **Date:** 2026-11-01
- **State:** Hansel selected choice 3 on 2026-11-01. Detailed Implementation, including this choice's exact files and checks, approved on 2026-11-02. Final design saved to the owner-selected destination on 2026-11-02; independent EGM review remains pending.
- **Scope:** Choose how this milestone handles a newly reproduced input mismatch. Preserve the accepted M checkpoint, loading A, real-browser evaluation, fresh-root 64 visits, and no-training boundary.
- **Source baseline:** `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`.

## What the probe established

The [TypeScript encoder](./src/lib/chess/encode.ts) reads the en-passant field from `chess.fen()`. The [Python encoder](./train/src/tinyaz/encode.py) reads `board.ep_square` directly. These differ when a double pawn move creates a raw target square but no legal en-passant capture exists.

The probe executed the actual TypeScript encoder under Node and the actual Python encoder under Python 3.11. It loaded no weights, Torch, or search. It did not launch a browser, play model games, or measure strength.

| Position supplied through its actual move history or explicit FEN | TypeScript plane 16 | Python plane 16                                   | Different input elements |
| ----------------------------------------------------------------- | ------------------- | ------------------------------------------------- | -----------------------: |
| Standard start, then `e2e4`                                       | Empty               | Raw `e3`, flipped to canonical index 44 for Black |                        1 |
| Standard start, then `e2e4 d7d5`                                  | Empty               | Raw `d6`, canonical index 43 for White            |                        1 |
| `4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2`, legal en-passant capture     | `d6`                | `d6`                                              |                        0 |
| `k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 2`, pawn pinned to its king     | Empty               | Raw `d6`                                          |                        1 |

In these four cases, rebuilding Python's board from its default, normalized FEN makes all input planes match. That is a narrower FEN-input parity check. It would hide the live-history mismatch if presented as full runtime parity.

The installed chess.js 1.4.0 retains a raw target only when an adjacent enemy pawn exists. `fen({ forceEnpassantSquare: true })` preserves its pinned target, but cannot recover the discarded target after ordinary `e2e4`. Merely turning on that option cannot align all cases.

There is a relevant training boundary. [Human-data rows](./train/src/tinyaz/data.py) and [self-play rows](./train/src/tinyaz/generate.py) store default `board.fen()` strings. [Training](./train/src/tinyaz/train_loop.py) reconstructs boards from those strings. Default FEN omits non-legal en-passant targets. Live Python search instead evaluates its history-bearing board directly through [NetEval](./train/src/tinyaz/mcts.py). This establishes two code paths, not the exact provenance of every row used for historical M training.

No effect on the chosen move, win rate, or Elo has been measured. The gap does not establish intent to suppress a score. Fixing an input convention can change inference with existing weights; it does not itself require retraining.

## Choice 1. Keep encoders unchanged in this milestone

- **Mechanism:** Preserve both encoders. Verify numeric inference on identical normalized FEN inputs, and add separate history/pinned-target regressions that record the known compatibility gap explicitly. Do not call those regressions a full parity pass.
- **Benefit:** Keeps this milestone's playing-input changes confined to the already planned browser delivery/history/lifecycle repair. The primary same-M comparison remains browser against browser.
- **Cost and failure condition:** Live Python and browser input equivalence stays unresolved, alongside their existing draw-claim difference. Python games cannot support a browser-strength claim. A later encoder alignment needs a separate decision.
- **File effect:** Numeric fixture/coordinator tests and verification documentation record both scopes. No encoder production file changes.

## Choice 2. Make Python encode only legal en-passant targets

- **Mechanism:** Change Python plane 16 to include the target only when a legal en-passant capture exists. Preserve all other planes, model shape, weights, search selection, and draw predicates.
- **Benefit:** Aligns live Python input with current browser input and the inspected default-FEN training-row path. Handles absent adjacent pawns and pinned captures consistently.
- **Cost and failure condition:** Changes existing Python inference inputs in these positions, so Python moves may change. It is a separate software treatment from the browser-only comparison and must not inherit old ratings. It does not prove a strength gain or erase the draw-rule gap. Historical training provenance still needs honest qualification.
- **File effect:** Modify `train/src/tinyaz/encode.py`; add real-history and pinned-capture cases to `train/scripts/test_encode.py` and shared parity fixtures; update Python/browser contracts, experiment protocol and design. Preserve default FEN data generation and do not regenerate datasets or train.

## Choice 3. Make browser input retain raw en-passant targets

- **Mechanism:** Carry the raw target from initial FEN or the last double pawn move through request replay and every search descent/undo. Encode it even when capture is illegal, matching the current live Python convention. Keep public rules/FEN comparisons on their existing legal convention.
- **Benefit:** Aligns the browser with live Python's current input meaning without changing the Python encoder.
- **Cost and failure condition:** Requires extra position/search encoding state because chess.js can discard that target. A FEN-only caller cannot recover history it never received. It also differs from the inspected default-FEN training-row path. A missing restore or inferred target can change search inputs incorrectly. More browser inputs change in the final software treatment; gain remains unmeasured.
- **File effect:** Modify `src/lib/chess/encode.ts` and the planned position/search modules; add history/raw-target parity and restoration tests; update all relevant contracts/protocol. No new weights or automatic retraining.

## Decision and next step

Hansel selected **choice 3**, browser raw-target retention, by answering `3` on 2026-11-01. Choices 1 and 2 are not selected. The chosen input contract, its risks and affected files are in [Detailed Implementation](./docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md#detailed-implementation-plan), approved on 2026-11-02. No encoder source has been repaired, no weights changed, and no model-strength effect measured. Do not normalize away a failing live-history case or label a known mismatch fixed through documentation alone.
