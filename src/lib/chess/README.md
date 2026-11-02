# Chess Engine

## Overview

TypeScript neural inference, canonical board/policy encoding, PUCT search,
weight serialization, and browser thinker orchestration. `chess.js` supplies
legal moves and terminal-state rules. A separate Node entry point evaluates
checkpoints against random legal moves and can publish S assets.

## Interface

- Constants describe the 19-plane input, S/M widths (64/128), eight residual
  blocks, 73 policy planes, source identifiers, display metrics, and visit
  defaults. `paramCount` computes the S/M parameter total (default S).
  `SELECTED_CHECKPOINT` pins the existing M checkpoint: name `tinyaz-m`, URL
  `/weights/tinyaz-m.bin`, packed version 1, 2,426,706 parameters, 9,706,840
  bytes, expected SHA256
  `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`.
  `PACKED_WEIGHT_VERSION` and `THINK_PROTOCOL_VERSION` are independent version
  1 values; `OPERATION_DEADLINE_MS`, `WORKER_ACK_MS`, and `MAX_VISITS` hold the
  90-second operation deadline, the eight-second worker acknowledgement bound,
  and the existing 4096-visit UCI ceiling. Geometry helpers convert algebraic
  squares, indices, files/ranks, and rank-flipped indices using the existing
  a1 = 0 rank-major layout: `fileOf(i: number): number` keeps the low three
  bits, `rankOf(i: number): number` shifts by three, and
  `algebraicToIndex(sq: string): number` / `indexToAlgebraic(i: number): string`
  map between algebraic squares and indices. These conversions assume valid
  caller coordinates and add no validation.
  ([constants.ts:N_PLANES](./constants.ts), [constants.ts:CHANNELS_S](./constants.ts),
  [constants.ts:CHANNELS_M](./constants.ts), [constants.ts:SOURCE_NAMES](./constants.ts),
  [constants.ts:paramCount](./constants.ts), [constants.ts:SELECTED_CHECKPOINT](./constants.ts),
  [constants.ts:PACKED_WEIGHT_VERSION](./constants.ts),
  [constants.ts:THINK_PROTOCOL_VERSION](./constants.ts),
  [constants.ts:OPERATION_DEADLINE_MS](./constants.ts),
  [constants.ts:WORKER_ACK_MS](./constants.ts), [constants.ts:MAX_VISITS](./constants.ts),
  [constants.ts:squareIndex](./constants.ts), [constants.ts:fileOf](./constants.ts),
  [constants.ts:rankOf](./constants.ts), [constants.ts:algebraicToIndex](./constants.ts),
  [constants.ts:indexToAlgebraic](./constants.ts), [constants.ts:flipIndex](./constants.ts))
- `encodeBoard(chess)` returns canonical `Float32Array` planes; `stmIsBlack`
  reports the side to move. `moveToPlane`, `encodeMovePlane`, `legalLogits`, and
  `softmax` map legal moves to policy scores; `PromoPiece` describes promotions.
  ([encode.ts:encodeBoard](./encode.ts), [encode.ts:stmIsBlack](./encode.ts),
  [policy.ts:moveToPlane](./policy.ts), [policy.ts:encodeMovePlane](./policy.ts),
  [policy.ts:legalLogits](./policy.ts), [policy.ts:softmax](./policy.ts))
- `WeightSet` holds model tensors and source metadata. `randomWeights`,
  `unpackWeights`, `packWeights`, and `loadPlayWeights` manage model data;
  `paramCount` is re-exported unchanged from `constants.ts` for existing
  callers. `forward(planes, weights)` returns `NetOut` policy/value tensors.
  ([weights.ts:WeightSet](./weights.ts), [weights.ts:paramCount](./weights.ts),
  [weights.ts:randomWeights](./weights.ts), [weights.ts:unpackWeights](./weights.ts),
  [weights.ts:packWeights](./weights.ts), [weights.ts:loadPlayWeights](./weights.ts),
  [net.ts:forward](./net.ts))
- `CheckpointSpec` describes a checkpoint by name, URL, packed version,
  parameter count, byte length, and expected SHA256. `Sha256` is the lowercase
  hex digest string alias used by the descriptor and identities. `ModelIdentity`
  is the discriminated trained-M / random-demo-S identity; `VerifiedCheckpoint`
  pairs retained bytes with one. `hashCheckpointBytes` returns a buffer's
  SHA256; `verifyCheckpointBytes` copies the supplied buffer, then enforces the
  16-byte `TAZS` header, packed version, recognized S/M count, exact
  declared/body length, a finite tensor payload read with explicit little-endian
  `DataView.getFloat32` access, and the full expected identity including digest.
  Failures reject through `CheckpointError` carrying a `CheckpointErrorCode`
  (`LOAD_FORMAT`, `LOAD_LENGTH`, `LOAD_NONFINITE`, `LOAD_DIGEST`,
  `CRYPTO_UNAVAILABLE`, `MODEL_MISMATCH`); a digest capability that is absent,
  throws during invocation or rejects while awaited normalizes to
  `CRYPTO_UNAVAILABLE` with the original error preserved as `cause`, and no path
  substitutes random weights or bypasses the pin. `sameModelIdentity` compares
  every identity field; `SELECTED_MODEL_IDENTITY` is the frozen trained pin. A
  trained identity must equal the selected M description; a random-demo identity
  must equal the deterministic seed-2026 S description.
  ([checkpoint.ts:Sha256](./checkpoint.ts),
  [checkpoint.ts:CheckpointSpec](./checkpoint.ts),
  [checkpoint.ts:ModelIdentity](./checkpoint.ts),
  [checkpoint.ts:VerifiedCheckpoint](./checkpoint.ts),
  [checkpoint.ts:CheckpointError](./checkpoint.ts),
  [checkpoint.ts:CheckpointErrorCode](./checkpoint.ts),
  [checkpoint.ts:hashCheckpointBytes](./checkpoint.ts),
  [checkpoint.ts:verifyCheckpointBytes](./checkpoint.ts),
  [checkpoint.ts:sameModelIdentity](./checkpoint.ts),
  [checkpoint.ts:SELECTED_MODEL_IDENTITY](./checkpoint.ts))
- `ThinkRuntime` is the capability-boundary object type; `thinkRuntime` is the
  mutable platform capability boundary used by checkpoint verification and
  future thinker code: `fetch`, `digestSha256`, `now`,
  `setTimeout`/`clearTimeout`, and `createWorker`. Every global resolves at call
  time, so importing the module performs no fetch, digest, or Worker
  construction and never evaluates an absent `Worker` global; Node tests replace
  members through `mock.method`.
  ([think-runtime.ts:ThinkRuntime](./think-runtime.ts),
  [think-runtime.ts:thinkRuntime](./think-runtime.ts))
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
- Checkpoint verification snapshots the caller's buffer before any awaited
  step, so a verified identity cannot be undermined by later mutation through a
  caller-held alias. The returned `VerifiedCheckpoint` owns that private copy;
  a digest alone makes no readiness claim. These helpers are foundations that
  are not yet used by trained play: the existing loader, thinker, worker,
  search and UI behavior is unchanged.
  ([checkpoint.ts:verifyCheckpointBytes](./checkpoint.ts))
- `SELECTED_CHECKPOINT` is a local pin for the existing M file, not a
  publication service or model registry. Unchanged train/promotion helpers may
  later replace public weights, metadata and some frontend constants, but they
  do not maintain this new digest/length/source identity: a future public
  replacement requires a coordinated reviewed selection-description and
  input-identity update with fresh verification, and a mismatch must fail
  visibly. ([constants.ts:SELECTED_CHECKPOINT](./constants.ts))
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
- The checkpoint and think-runtime modules add no import-time effects: no
  fetch, Worker construction, digest or model initialization happens on import.
  The verification helpers read a supplied buffer and the capability digest
  only. ([checkpoint.ts:verifyCheckpointBytes](./checkpoint.ts),
  [think-runtime.ts:thinkRuntime](./think-runtime.ts))
- The gauntlet CLI reads checkpoints, creates `public/weights`, logs results,
  and writes `tinyaz-s.meta.json` before checking its pass gate. Passing also
  copies the S binary and overwrites bundled `checkpoint-meta.json`. Missing
  checkpoints or a failed gate exit with code 2.
  ([gauntlet.ts:main](./gauntlet.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`.
The automated script includes `src/lib/chess/chess.test.ts` and
`src/lib/chess/checkpoint.test.ts`; see [package.json](../../../package.json).
The focused command
`node --experimental-strip-types --test src/lib/chess/checkpoint.test.ts`
runs the checkpoint validation suite directly: it reads the real pinned M file,
exercises the deterministic seed-2026 S demo, malformed/mismatched payloads,
the mocked capability boundary, and buffer-ownership invariants.

The separate command `node --experimental-strip-types src/lib/chess/gauntlet.ts`
runs the real random-move gauntlet and can publish assets. Append a checkpoint
path to override its default. It is not the automated test command or a
Stockfish/Lichess rating run. Stored checkpoint metadata is historical input,
without fresh evaluation evidence from this documentation pass.
