# Think Worker

## Overview

Web Worker entry point for CPU chess search away from the UI thread, speaking
protocol version 1. The consuming [thinker client](../lib/chess/think-client.ts)
owns session identity, worker startup, request deadlines, cancellation, and the
one availability recovery. This file never fetches weights, never synthesizes
random weights, and never runs a search without independently verified bytes.

## Interface

- `WorkerSend = (msg: WorkerMessage) => void` is the single outbound edge: the
  production bootstrap sends through the worker scope's `postMessage`, and
  tests collect replies by supplying their own function. `createWorkerHandler`
  only ever emits through this value.
  ([think.worker.ts:WorkerSend](./think.worker.ts),
  [think-protocol.ts:WorkerMessage](../lib/chess/think-protocol.ts))
- `WorkerHandle = (raw: unknown) => void` is the inbound boundary returned by
  `createWorkerHandler`. It accepts every raw incoming value, validates it
  through `isClientMessage`, and routes it to init or think handling; the
  guarded bootstrap installs an event wrapper on `self.onmessage` that
  forwards `event.data` to `handle` inside a genuine
  `DedicatedWorkerGlobalScope`, rather than assigning the raw handle
  directly.
  ([think.worker.ts:WorkerHandle](./think.worker.ts))
- `createWorkerHandler(send)` is the single internal boundary. It returns the
  `handle(raw)` function that validates every incoming message through
  `isClientMessage` before any field is used and emits every reply through
  `send`. The guarded bootstrap installs a wrapper on
  `self.onmessage` forwarding `event.data` to that handler, only when
  `globalThis` is a genuine
  `DedicatedWorkerGlobalScope` instance with a `postMessage` function, so
  importing this module under Node or inside a Window installs nothing and
  runs no bootstrap.
  ([think.worker.ts:createWorkerHandler](./think.worker.ts),
  [think-protocol.ts:ClientMessage](../lib/chess/think-protocol.ts))
- Replies are protocol-v1 worker messages: `ready` with the verified
  `modelIdentity`; `result` echoing the request context with the typed
  `SearchOutcome`; scoped `error` replies (`initialization` or `request`)
  carrying a `WireFailure` (`code`, `diagnostic`, `searchMs`,
  `completedVisits`); and unscoped `fatal` for unrecognizable, wrong-version,
  or foreign-session input.
  ([think-protocol.ts:WorkerMessage](../lib/chess/think-protocol.ts),
  [think-protocol.ts:WireFailure](../lib/chess/think-protocol.ts))
- `init` runs `verifyCheckpointBytes` on the transferred bytes inside the
  worker, decodes them with `unpackWeights`, and replies `ready` only on a
  full identity match. Initialization is one-time: a second `init` or a
  failed first `init` leaves the handler in its terminal failed state, and no
  `ready`/`result` can follow.
  ([checkpoint.ts:verifyCheckpointBytes](../lib/chess/checkpoint.ts),
  [weights.ts:unpackWeights](../lib/chess/weights.ts))
- `think` reconstructs the full-position state (initial FEN, complete UCI
  history, expected FEN, raw en-passant target) and runs the real `search`.
  The request's remaining-time budget is anchored to message receipt
  (`remainingMs` counted from receipt, not from a later search start) and
  bounds the search cooperatively, including terminal positions. A `think`
  before `ready` answers
  `NOT_READY`; a `think` while a request is active answers `BUSY`; a `think`
  whose session or epoch fields disagree with the established session is a
  terminal `fatal`. Search faults map to typed codes (`CANCELLED`,
  `DEADLINE`, `POSITION_INVALID`, else `SEARCH_FAILED`) with honest partial
  metrics.
  ([mcts.ts:search](../lib/chess/mcts.ts))

## Invariants

- Every incoming message passes `isClientMessage` before any field is used:
  exact keys, version 1, session/context agreement, dense UCI history,
  `ArrayBuffer` init body, and a positive bounded `remainingMs`. Anything else
  produces a `fatal` reply (`PROTOCOL_VERSION` when a numeric version differs,
  `PROTOCOL_INVALID` otherwise).
  ([think-message-guards.ts:isClientMessage](../lib/chess/think-message-guards.ts))
- The worker independently re-verifies the transferred checkpoint bytes rather
  than trusting the client's word: hash, header, length, source, and identity
  are all rechecked before decode. The earlier drift where initialization
  fetched the S asset or accepted a seed is resolved; no fetch and no random
  weights exist on this path.
  ([checkpoint.ts:verifyCheckpointBytes](../lib/chess/checkpoint.ts))
- The handler tracks init-attempted, initializing, ready, busy, and failed
  states. Any fatal envelope fault or failed/repeated initialization is
  terminal: the failed state swallows every later message, including a pending
  digest fulfillment or rejection, so no `ready` or `result` is ever emitted
  after fatal.
  ([think.worker.ts:createWorkerHandler](./think.worker.ts))

## Side Effects

- Importing the module adds no message handler, worker, fetch, timer, or model
  state; the guarded bootstrap is the only side effect and runs only when the
  ambient object really is a dedicated worker. `handle` sends
  ready/result/error/fatal messages through the supplied `send`.
  ([think.worker.ts:createWorkerHandler](./think.worker.ts))
- Runs CPU search synchronously in the worker against the verified decoded
  weights; the receipt-anchored deadline bounds the search cooperatively.
  ([mcts.ts:search](../lib/chess/mcts.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../package.json). `think-worker.test.ts` drives the real
`createWorkerHandler` boundary under Node with the pinned M bytes; real
browser worker execution remains a separate native check.
