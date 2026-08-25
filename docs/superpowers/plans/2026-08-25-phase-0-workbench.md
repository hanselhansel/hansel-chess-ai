# Plan: Phase 0 playable TinyAZ workbench

Date: 2026-08-25
Work type: front-end / design
Branch: `feat/phase-0-workbench`
Turn cap: 40 (implement) + 20 (verify) + 10 (ship)

## Goal (four components)

| | |
|---|---|
| End state | You can play legal chess against tinyaz-s (random weights), watch 1-visit vs 64-visit search, see the efficiency card and a visual Phase 0→1→2 roadmap. |
| Check | `npm test` (chess suite) green; `npm run typecheck` and `npm run build` green; `browser-smoke` desktop+mobile clean; one legal game completable. |
| Must not change | Auth OFF, DB OFF. No chesslite/Lc0 fork. No mixing 1-visit and 64-visit Elo. chess.js owns the rules. No Stockfish-as-teacher. |
| Cap | 40 turns for implement. |

## Success criteria (do not weaken)

- [x] Rank-flip is `i ^ 56` (files stay put). Tests prove White-to-move and Black-to-move encodings.
- [x] Policy planes: queen slides, knights, under-promotions. e2e4 maps to the expected plane.
- [x] `search()` always returns a legal move. 1-visit picks the highest prior.
- [x] Param count < 3M and matches the card.
- [x] Board: only legal targets, ignore input on the model’s turn, promotion chooser, checkmate/stalemate copy.
- [x] Think panel: 1 vs 64, value bar from **White’s** view, root children n/P/Q, policy heatmap.
- [x] Efficiency card: params, cap, visit mode, seed, honest Phase 0 status. No `<` JSX parse error.
- [x] Visual roadmap: Phase 0 current / Phase 1 / Phase 2, plus a move list so the game is followable.
- [x] Worker search so the UI never freezes. `docs/LATER.md` is the climb, not this ship.

## Implementation order (TDD)

1. Tests for encode / policy / params / legal search (red).
2. Fix `flipIndex`, card JSX, value-bar colour, disabled-square dimming.
3. Roadmap + move list.
4. Wire `npm test` to the chess suite.
5. Typecheck, build, browser smoke, Playwright play-one-move.

## Reviews (gstack:autoplan not installed — recorded here)

**CEO — approve.** Ship a game you can play today. Training is the next chain. Do not import Autoresearch or Stockfish.

**Design — approve.** Direction A (ink/paper). Tokens only. Three regions + a slim roadmap. No gold, no purple, no emoji pieces.

**Eng — approve.** chess.js rules. STM rank-flip only. PUCT in a worker. Tests before claiming the net thinks.

**DX — approve.** README says it will lose. Card says random weights. LATER.md is the syllabus.

## Skip (chain rules)

- **gstack:codex:** skip. Personal chess-AI repo, not a public library. Codex would ship local context to OpenAI.
- **Greptile:** skip if the review bot is not on this repo. Do not wait 10 minutes for a bot that is not installed.
