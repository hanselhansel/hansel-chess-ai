# Chess Components

## Overview

Interactive chess workbench and its display components. `chess.js` supplies the
rules and game history. The local components own selection, promotion, board
orientation, search controls, and model/evaluation displays.

## Interface

- `Workbench()` composes the complete game UI with no props.
  ([workbench.tsx:Workbench](./workbench.tsx))
- `ChessBoard` accepts the board, orientation, selection, legal targets, and
  square callback; optional props add last-move markers, heatmap, thinking,
  banner, and disabled state. `SquarePiece` is the nullable display piece type.
  ([board.tsx:ChessBoard](./board.tsx), [board.tsx:SquarePiece](./board.tsx))
- `ThinkPanel` accepts visits, a visit callback, thinking/result state, and a
  White-perspective value. `CardPanel` accepts loaded-model information, live
  timing/visits, status, and optional stored evaluation records.
  ([think-panel.tsx:ThinkPanel](./think-panel.tsx), [card-panel.tsx:CardPanel](./card-panel.tsx))
- `MoveList({ sans })` displays numbered move pairs. `PieceGlyph({ type, color })`
  renders chess SVGs. `Roadmap({ current?, rated? })` renders static phase text.
  ([move-list.tsx:MoveList](./move-list.tsx), [pieces.tsx:PieceGlyph](./pieces.tsx),
  [roadmap.tsx:Roadmap](./roadmap.tsx))

## Invariants

- Legal destinations and applied moves come from the mutable `Chess` instance.
  Square interaction stops while thinking, after game over, on the model's turn,
  or during pending promotion. Promotion offers `q`, `r`, `b`, and `n` before
  applying a move. ([workbench.tsx:legalTargets](./workbench.tsx),
  [workbench.tsx:onSquare](./workbench.tsx), [workbench.tsx:tryMove](./workbench.tsx))
- Playing Black flips both board axes. New-game controls reset the existing
  game and interaction state while retaining visits and loaded-engine metadata.
  ([workbench.tsx:flipped](./workbench.tsx), [workbench.tsx:reset](./workbench.tsx),
  [board.tsx:ChessBoard](./board.tsx))
- Automatic model search waits for readiness, a nonterminal model turn, and no
  active search. Reset does not cancel a pending search, and completion applies
  its move without checking a game generation or matching FEN.
  ([workbench.tsx:Workbench](./workbench.tsx), [workbench.tsx:runThink](./workbench.tsx),
  [workbench.tsx:reset](./workbench.tsx))
- Visit buttons emit 1 or 64 and remain clickable while thinking. Evaluation
  rows separately label stored 1-visit comparisons and the 64-visit gauntlet;
  those labels do not validate metadata visits or loaded weight identity.
  The parameter cap is displayed rather than enforced.
  ([think-panel.tsx:ThinkPanel](./think-panel.tsx), [card-panel.tsx:CardPanel](./card-panel.tsx),
  [constants.ts:ONE_VISIT](../../lib/chess/constants.ts),
  [constants.ts:PLAY_VISITS](../../lib/chess/constants.ts))
- Roadmap phase text and the Lichess placeholder are static display content,
  without live rating verification. ([roadmap.tsx:PHASES](./roadmap.tsx),
  [card-panel.tsx:CardPanel](./card-panel.tsx))

## Side Effects

- A mount effect creates a thinker, updates readiness/model state, and terminates
  it on cleanup. Worker creation, weight fetches, timeouts, and fallback belong
  to the imported engine client. ([workbench.tsx:Workbench](./workbench.tsx),
  [think-client.ts:createThinker](../../lib/chess/think-client.ts))
- Fetches `/weights/tinyaz-m.meta.json` to refresh selected stored evaluation
  fields and silently ignores fetch/parse failures. Unresolved implementation
  drift: these M records/display labels do not match the thinker's default S
  weight asset. The [approved M ladder spec](../../../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md),
  First experiment item 6, requires published M in the browser and its card.
  ([workbench.tsx:Workbench](./workbench.tsx),
  [weights.ts:loadPlayWeights](../../lib/chess/weights.ts))
- Human moves, model replies, promotion choices, and new-game controls mutate
  the game and React state. Board/visit controls invoke supplied callbacks.
  ([workbench.tsx:tryMove](./workbench.tsx), [workbench.tsx:runThink](./workbench.tsx),
  [workbench.tsx:reset](./workbench.tsx), [board.tsx:ChessBoard](./board.tsx),
  [think-panel.tsx:ThinkPanel](./think-panel.tsx))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../../package.json). The automated script includes chess
library tests, without a dedicated component test file. Play, promotion, reset
during search, orientation, and worker fallback require separate browser checks.
Stored checkpoint metadata does not establish a fresh gauntlet or live rating.
