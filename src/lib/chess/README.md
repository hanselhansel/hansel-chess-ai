# Chess Engine

## Overview

TypeScript neural inference, canonical board/policy encoding, PUCT search,
weight serialization, and browser thinker orchestration. `chess.js` supplies
legal moves and terminal-state rules. A separate Node entry point evaluates
checkpoints against random legal moves and can publish S assets.

## Interface

- Constants describe the 19-plane input, S/M widths (64/128), eight residual
  blocks, 73 policy planes, source identifiers, display metrics, and visit
  defaults. Geometry helpers convert algebraic squares, indices, files/ranks,
  and rank-flipped indices.
  ([constants.ts:N_PLANES](./constants.ts), [constants.ts:CHANNELS_S](./constants.ts),
  [constants.ts:CHANNELS_M](./constants.ts), [constants.ts:SOURCE_NAMES](./constants.ts),
  [constants.ts:squareIndex](./constants.ts), [constants.ts:flipIndex](./constants.ts))
- `encodeBoard(chess)` returns canonical `Float32Array` planes; `stmIsBlack`
  reports the side to move. `moveToPlane`, `encodeMovePlane`, `legalLogits`, and
  `softmax` map legal moves to policy scores; `PromoPiece` describes promotions.
  ([encode.ts:encodeBoard](./encode.ts), [encode.ts:stmIsBlack](./encode.ts),
  [policy.ts:moveToPlane](./policy.ts), [policy.ts:encodeMovePlane](./policy.ts),
  [policy.ts:legalLogits](./policy.ts), [policy.ts:softmax](./policy.ts))
- `WeightSet` holds model tensors and source metadata. `paramCount`,
  `randomWeights`, `unpackWeights`, `packWeights`, and `loadPlayWeights` manage
  model data. `forward(planes, weights)` returns `NetOut` policy/value tensors.
  ([weights.ts:WeightSet](./weights.ts), [weights.ts:paramCount](./weights.ts),
  [weights.ts:randomWeights](./weights.ts), [weights.ts:unpackWeights](./weights.ts),
  [weights.ts:packWeights](./weights.ts), [weights.ts:loadPlayWeights](./weights.ts),
  [net.ts:forward](./net.ts))
- `search(fen, visits, weights)` returns `ThinkResult`; `searchAsync` returns
  its promise. Results contain move coordinates/UCI/SAN, value, visits, timing,
  up to eight `ChildStat` records, and destination heat.
  ([mcts.ts:search](./mcts.ts), [mcts.ts:searchAsync](./mcts.ts),
  [mcts.ts:ThinkResult](./mcts.ts), [mcts.ts:ChildStat](./mcts.ts))
- `createThinker()` returns a `Thinker` with `ready: Promise<Ready>`,
  `think(fen, visits)`, and `terminate()`. It selects worker or main-thread
  execution. ([think-client.ts:createThinker](./think-client.ts),
  [think-client.ts:Thinker](./think-client.ts))
- `playGauntlet(weights, games = 20, visits = 1, seed = 2026)` returns a
  `GauntletResult` against random moves. Its CLI takes one optional positional
  checkpoint path, defaulting to `train/checkpoints/tinyaz-s.bin`, with no named
  flags. ([gauntlet.ts:playGauntlet](./gauntlet.ts), [gauntlet.ts:main](./gauntlet.ts))

## Invariants

- Squares use `rank * 8 + file` with `a1 = 0`. Black canonicalization flips ranks
  with `index ^ 56`, preserving files. Input planes are side-to-move pieces,
  opponent pieces, castling rights, en passant, halfmove/100, and fullmove/200.
  ([constants.ts:squareIndex](./constants.ts), [constants.ts:flipIndex](./constants.ts),
  [encode.ts:encodeBoard](./encode.ts))
- Policy planes are 56 sliding, eight knight, and nine underpromotion planes.
  Queen promotion uses ordinary movement planes. Legal policy lookup indexes
  `plane * 64 + from`. Inference derives width from the weights and uses eight
  residual blocks with policy and tanh-value heads.
  ([policy.ts:moveToPlane](./policy.ts), [policy.ts:legalLogits](./policy.ts),
  [net.ts:forward](./net.ts))
- Weight files use a 16-byte `TAZS` header with little-endian version 1,
  parameter count, and source ID, followed by ordered Float32 tensors.
  Unpacking accepts S/M parameter counts. Packing allocates the fixed default
  S count and does not select M size from the input.
  ([weights.ts:unpackWeights](./weights.ts), [weights.ts:tensorSizes](./weights.ts),
  [weights.ts:packWeights](./weights.ts))
- Every search starts with a fresh root and expands only legal moves. PUCT uses
  `C_PUCT = 1.5`; backpropagation alternates value signs. Final selection sorts
  by visits, then prior, so one visit selects the policy argmax. A search with no
  legal root move throws an error. Neither search entry point clamps visits or accepts cancellation.
  ([mcts.ts:evaluate](./mcts.ts), [mcts.ts:oneVisit](./mcts.ts),
  [mcts.ts:finish](./mcts.ts), [mcts.ts:search](./mcts.ts),
  [mcts.ts:searchAsync](./mcts.ts), [constants.ts:C_PUCT](./constants.ts))
- Unresolved implementation drift: `WEIGHTS_URL` declares `/weights/tinyaz-m.bin`,
  but `loadPlayWeights()` defaults to `/weights/tinyaz-s.bin`. The thinker and
  worker use that S default. Failed fetch/decode selects deterministic random
  S weights. The [approved M ladder spec](../../../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md),
  First experiment item 6, requires the browser to use published M. This mismatch
  remains unresolved.
  ([constants.ts:WEIGHTS_URL](./constants.ts), [weights.ts:loadPlayWeights](./weights.ts),
  [think-client.ts:createThinker](./think-client.ts),
  [think.worker.ts:self.onmessage](../../workers/think.worker.ts))
- Worker initialization has an eight-second fallback timer. Think calls have a
  90-second timeout; failed worker thinking terminates the worker and retries
  through `searchAsync` outside that timeout wrapper. Async search yields every
  fourth visit; main-thread termination does not cancel an active search.
  ([think-client.ts:INIT_MS](./think-client.ts), [think-client.ts:THINK_MS](./think-client.ts),
  [think-client.ts:createThinker](./think-client.ts), [think-client.ts:mainThinker](./think-client.ts),
  [mcts.ts:searchAsync](./mcts.ts))
- The random gauntlet alternates colors, stops at game-over or 240 plies, and
  adjudicates non-mate results by material magnitude of at least four. Passing
  requires score at least 0.7 and more wins than losses. The CLI fixes 20 games,
  one visit, and seed 2026. ([gauntlet.ts:playGame](./gauntlet.ts),
  [gauntlet.ts:playGauntlet](./gauntlet.ts), [gauntlet.ts:main](./gauntlet.ts))

## Side Effects

- Fetches weights, creates/terminates a module worker, exchanges messages, and
  schedules readiness/search/yield timers. ([weights.ts:loadPlayWeights](./weights.ts),
  [think-client.ts:workerThinker](./think-client.ts),
  [think-client.ts:createThinker](./think-client.ts), [mcts.ts:searchAsync](./mcts.ts))
- The gauntlet CLI reads checkpoints, creates `public/weights`, logs results,
  and writes `tinyaz-s.meta.json` before checking its pass gate. Passing also
  copies the S binary and overwrites bundled `checkpoint-meta.json`. Missing
  checkpoints or a failed gate exit with code 2.
  ([gauntlet.ts:main](./gauntlet.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`.
The automated script includes `src/lib/chess/chess.test.ts`; see
[package.json](../../../package.json).

The separate command `node --experimental-strip-types src/lib/chess/gauntlet.ts`
runs the real random-move gauntlet and can publish assets. Append a checkpoint
path to override its default. It is not the automated test command or a
Stockfish/Lichess rating run. Stored checkpoint metadata is historical input,
without fresh evaluation evidence from this documentation pass.
