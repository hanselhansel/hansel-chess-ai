# Chess Components

## Overview

Interactive chess workbench and its display components. `chess.js` supplies the
rules and game history. The local components own selection, promotion, board
orientation, search controls, and model/evaluation displays.

## Interface

- `Workbench()` composes the complete game UI with no props. It owns the
  `Chess` game, the literal initial FEN, the full UCI history, the game
  generation counter, legal-move application, promotion, and selection; engine
  ownership is delegated to `useThinker`.
  ([workbench.tsx:Workbench](./workbench.tsx))
- `useThinker(initialMode)` owns the engine session lifecycle: thinker
  construction per mode/epoch inside an `EngineOwner` record, the
  `EngineState` subscription, `SessionReady` and session-failure capture, the
  pending `requestId` slot, the failed-turn latch, and termination. It returns
  `{ state, session, sessionError, mode, pendingRequestId, turnFailed,
  runTurn, cancelPending, clearTurnFailed, restart }`.
  `runTurn(context, handlers)` copies and freezes the request context,
  installs the in-flight `Lease`, awaits `thinker.think`, then invokes the
  synchronous `TurnHandlers` (`isPositionCurrent`, `onSuccess`, `onFailure`)
  only while owner, thinker, and lease are still current — a retired
  settlement forwards nothing and release happens in a guarded `finally`.
  `cancelPending` invalidates the owned request slot before
  cancelling it; `CANCELLED`/`STOPPED` never set the latch; only an explicit
  retry, new game, or restart clears it. `retireOwner` synchronously clears
  the owner, thinker ref, lease, and ready/subscription authority before
  cancelling and terminating, so restart and unmount retire the old engine
  before scheduling a React replacement. `shortThinkerFailure(failure)` maps
  a typed failure code to one short player message; full `Failure` context
  and attempt diagnostics stay off player prose. `ThinkerHandle`,
  `ThinkerMode`, and `TurnHandlers` are its types.
  ([use-thinker.ts:useThinker](./use-thinker.ts),
  [use-thinker.ts:ThinkerHandle](./use-thinker.ts),
  [use-thinker.ts:TurnHandlers](./use-thinker.ts),
  [use-thinker.ts:shortThinkerFailure](./use-thinker.ts),
  [use-thinker.ts:ThinkerMode](./use-thinker.ts))
- `ChessBoard` accepts the board, orientation, selection, legal targets, and
  square callback; optional props add last-move markers, the readonly sparse
  Square-keyed heatmap (`ThinkResult["heatmap"]` is
  `Readonly<Partial<Record<Square, number>>>`), thinking, banner, and
  disabled state. `SquarePiece` is the nullable display piece type.
  ([board.tsx:ChessBoard](./board.tsx), [board.tsx:SquarePiece](./board.tsx))
- `ThinkPanel` accepts the next-request visit selector, thinking, the last
  completed `ThinkResponse`, and its White-perspective value; its completed
  summary labels `completedVisits` plus the core `search` and whole `move`
  durations and backend from that response. `CardPanel`
  accepts the verified `ModelIdentity | null`, the backend label (the last
  completed response backend, or the current engine backend before the first
  completion), next-request
  visits, the last completed response, the single status line,
  `history` records, and the requested `demoMode` flag that hides
  trained history immediately. Historical records are labeled unbound to the
  active session; `VsRecord`, `GauntletRecord`, and `HistoricalRecords` are
  its record types.
  ([think-panel.tsx:ThinkPanel](./think-panel.tsx),
  [card-panel.tsx:CardPanel](./card-panel.tsx),
  [card-panel.tsx:VsRecord](./card-panel.tsx),
  [card-panel.tsx:GauntletRecord](./card-panel.tsx),
  [card-panel.tsx:HistoricalRecords](./card-panel.tsx))
- `MoveList({ sans })` displays numbered move pairs. `PieceGlyph({ type, color })`
  renders chess SVGs. `Roadmap()` renders static prop-free stage text.
  `WorkbenchControls` renders the controls row (Play White, Play Black,
  conditional Retry move/Retry engine, and the trained/random-demo switch)
  from presentation booleans and callbacks only; it holds no game, engine,
  identity, history, or effect state.
  ([move-list.tsx:MoveList](./move-list.tsx), [pieces.tsx:PieceGlyph](./pieces.tsx),
  [roadmap.tsx:Roadmap](./roadmap.tsx),
  [workbench-controls.tsx:WorkbenchControls](./workbench-controls.tsx))

## Invariants

- Legal destinations and applied moves come from the mutable `Chess` instance.
  Square interaction stops while a request is pending, after game over, on the
  model's turn, while the failed-turn latch holds, or during pending promotion.
  Promotion offers `q`, `r`, `b`, and `n` before applying a move.
  ([workbench.tsx:onSquare](./workbench.tsx), [workbench.tsx:tryMove](./workbench.tsx))
- Playing Black flips both board axes. New-game controls reset the existing
  game and interaction state (selection, promotion, last-move markers, the
  completed response, and the failed-turn latch) while retaining visits and
  engine session ownership. ([workbench.tsx:reset](./workbench.tsx),
  [board.tsx:ChessBoard](./board.tsx))
- Automatic model search waits for engine `ready`, a nonterminal model turn,
  no pending request, and no latched failure. Every completion path runs
  inside the hook-held lease: `runTurn` verifies owner/thinker/lease currency
  plus the full response context, and Workbench's `isPositionCurrent`
  re-checks the live game object, generation, literal root, complete ordered
  UCI history, and current FEN before `onSuccess` applies the move or
  `onFailure` reports — a retired settlement mutates nothing. Reset, retry,
  and mode switches invalidate
  the pending slot before cancellation, and each request captures the literal
  initial FEN plus the full UCI history (including the raw en-passant target)
  through `capturePosition`. Exactly one short player error message renders
  under the board (`shortThinkerFailure`); the card `status` line carries
  status facts only and never the failure text.
  ([workbench.tsx:runThink](./workbench.tsx), [workbench.tsx:reset](./workbench.tsx),
  [use-thinker.ts:cancelPending](./use-thinker.ts))
- Retry move is an explicit user action from the latched failed state that
  issues a new request id; nothing retries automatically on render, selector
  change, or readiness. Load/protocol/session faults require engine restart;
  the retained load diagnostic stays visible until a matching successful
  readiness. ([workbench.tsx:retryMove](./workbench.tsx),
  [workbench.tsx:restartEngine](./workbench.tsx))
- Completed identity, backend, visits, value, timing, and attempt facts render
  only from the immutable `ThinkResponse`; the White value flips on the
  requesting side, not the human selector. A null identity shows as
  unavailable, never a guessed or verified claim. `demoMode` hides trained
  history immediately on selection, before demo identity resolves.
  ([workbench.tsx:Workbench](./workbench.tsx),
  [card-panel.tsx:CardPanel](./card-panel.tsx),
  [think-panel.tsx:ThinkPanel](./think-panel.tsx))
- Visit buttons emit the next request's budget and stay free while thinking.
  The displayed arithmetic-per-move estimate is a nominal checkpoint-bound
  figure, not a measured value; the parameter cap is displayed rather than
  enforced. ([think-panel.tsx:ThinkPanel](./think-panel.tsx),
  [card-panel.tsx:CardPanel](./card-panel.tsx),
  [constants.ts:PLAY_VISITS](../../lib/chess/constants.ts))
- Roadmap phase text and the Lichess placeholder are static display content,
  without live rating verification. Recorded historical results stay labeled
  unbound to the active session and are hidden in demo mode.
  ([roadmap.tsx:Roadmap](./roadmap.tsx), [card-panel.tsx:CardPanel](./card-panel.tsx))

## Side Effects

- `useThinker` creates the thinker per mode/epoch, subscribes to published
  engine state, captures readiness or the session failure, and terminates on
  cleanup or restart. Worker creation, weight fetch/verification, deadlines,
  cancellation, and backend recovery belong to the imported engine client.
  ([use-thinker.ts:useThinker](./use-thinker.ts),
  [think-client.ts:createThinker](../../lib/chess/think-client.ts))
- Fetches `/weights/tinyaz-m.meta.json` to refresh stored historical evaluation
  fields and silently ignores fetch/parse failures. Those records stay labeled
  unbound history; the earlier drift where displayed M records disagreed with
  the actually loaded S weights is resolved by the verified trained-mode
  loading described in the chess library contract.
  ([workbench.tsx:Workbench](./workbench.tsx),
  [weights.ts:loadPlayWeightsTimed](../../lib/chess/weights.ts))
- Human moves, model replies, promotion choices, retries, mode switches, and
  new-game controls mutate the game and React state. Board/visit controls
  invoke supplied callbacks.
  ([workbench.tsx:tryMove](./workbench.tsx), [workbench.tsx:runThink](./workbench.tsx),
  [workbench.tsx:reset](./workbench.tsx), [board.tsx:ChessBoard](./board.tsx),
  [think-panel.tsx:ThinkPanel](./think-panel.tsx))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../../package.json). The automated script includes chess
library tests, without a dedicated component test file. Play, promotion, reset
during search, orientation, and worker fallback require separate browser checks.
Stored checkpoint metadata does not establish a fresh gauntlet or live rating.
