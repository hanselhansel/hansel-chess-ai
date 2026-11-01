# Think Worker

## Overview

Web Worker entry point for synchronous chess search away from the UI thread.
The consuming [thinker client](../lib/chess/think-client.ts) owns worker startup,
request promises, timeout handling, and main-thread fallback.

## Interface

- Accepts `{ type: "init", seed }` and `{ type: "think", fen, visits, id }`.
  Initialization replies with `{ type: "ready", paramCount, seed, source }`.
  Search replies with `{ type: "result", id, result }`. Error replies contain
  `type: "error"` and `message`, plus `id` for search failures.
  ([think.worker.ts:self.onmessage](./think.worker.ts))
- `result` has the shared `ThinkResult` shape, including the move, value, visits,
  elapsed milliseconds, child statistics, and heatmap. Search implementation
  belongs to the chess library.
  ([mcts.ts:ThinkResult](../lib/chess/mcts.ts))

## Invariants

- Message shapes are TypeScript assertions, without runtime validation or a
  worker-side visit default/bounds check. Search receives the requested FEN
  and visits unchanged. ([think.worker.ts:self.onmessage](./think.worker.ts))
- Unresolved implementation drift: initialization calls `loadPlayWeights()` with
  its actual default `/weights/tinyaz-s.bin`, while `WEIGHTS_URL` declares M.
  A random loader result is regenerated with the requested initialization seed.
  The [approved M ladder spec](../../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md),
  First experiment item 6, requires the browser to use published M.
  ([think.worker.ts:self.onmessage](./think.worker.ts),
  [weights.ts:loadPlayWeights](../lib/chess/weights.ts),
  [constants.ts:WEIGHTS_URL](../lib/chess/constants.ts))
- The cached weights start null. A think received before initialization completes
  uses `randomWeights(1)`; the handler does not enforce readiness. The public
  client normally awaits its ready promise before posting a think request.
  ([think.worker.ts:weights](./think.worker.ts),
  [think.worker.ts:self.onmessage](./think.worker.ts),
  [think-client.ts:createThinker](../lib/chess/think-client.ts))

## Side Effects

- Assigns `self.onmessage`, mutates the cached weights, and sends ready/result/error
  messages with `self.postMessage()`. Initialization fetches a weight asset through
  the loader. ([think.worker.ts:self.onmessage](./think.worker.ts),
  [weights.ts:loadPlayWeights](../lib/chess/weights.ts))
- Runs CPU search synchronously in the worker; the search records elapsed time.
  ([think.worker.ts:self.onmessage](./think.worker.ts), [mcts.ts:search](../lib/chess/mcts.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../package.json). The automated script includes chess
library tests but no dedicated worker-protocol test. Worker loading, messages,
and fallback require separate browser verification.
