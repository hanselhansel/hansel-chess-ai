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
- `encodeBoard(chess, rawEpTarget?)` returns canonical `Float32Array` planes;
  the optional raw en-passant square overrides the legal-convention field and
  otherwise falls back to the played-history derivation; `stmIsBlack` reports
  the side to move. `moveToPlane`, `encodeMovePlane`, `legalLogits`, and
  `softmax` map legal moves to policy scores; `PromoPiece` describes promotions.
  ([encode.ts:encodeBoard](./encode.ts), [encode.ts:stmIsBlack](./encode.ts),
  [policy.ts:moveToPlane](./policy.ts), [policy.ts:encodeMovePlane](./policy.ts),
  [policy.ts:legalLogits](./policy.ts), [policy.ts:softmax](./policy.ts))
- `WeightSet` holds model tensors and source metadata. `randomWeights`,
  `unpackWeights`, `packWeights`, and `loadPlayWeights` manage model data;
  `paramCount` is re-exported unchanged from `constants.ts` for existing
  callers. `loadPlayWeightsTimed(spec?, signal?)` is the strict trained loader:
  an already-aborted signal rejects before any fetch, the abort signal is
  re-checked after the fetch, after the body read, and after verification,
  and an abort preserves the signal's original reason rather than wrapping it
  as HTTP. It fetches the pinned descriptor exactly once, runs
  `verifyCheckpointBytes` on the body, and returns the `TimedVerifiedCheckpoint`
  (`checkpoint`/`fetchMs`/`verificationMs`) with no decode and no random
  fallback; HTTP/body failures surface as `CheckpointError` `LOAD_HTTP`.
  `loadDemoWeights` is the demo-only path: it packs `randomWeights(2026)`
  locally and verifies it against the deterministic demo identity with no
  fetch. `forward(planes, weights)` returns `NetOut` policy/value tensors.
  ([weights.ts:WeightSet](./weights.ts), [weights.ts:paramCount](./weights.ts),
  [weights.ts:randomWeights](./weights.ts), [weights.ts:unpackWeights](./weights.ts),
  [weights.ts:packWeights](./weights.ts), [weights.ts:loadPlayWeights](./weights.ts),
  [weights.ts:loadPlayWeightsTimed](./weights.ts),
  [weights.ts:TimedVerifiedCheckpoint](./weights.ts),
  [weights.ts:loadDemoWeights](./weights.ts), [net.ts:forward](./net.ts))
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
  (`LOAD_HTTP`, `LOAD_FORMAT`, `LOAD_LENGTH`, `LOAD_NONFINITE`, `LOAD_DIGEST`,
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
  mutable platform capability boundary used by checkpoint verification and the
  thinker runtime: `fetch`, `digestSha256`, `now`,
  `setTimeout`/`clearTimeout`, and `createWorker`. Every global resolves at call
  time, so importing the module performs no fetch, digest, or Worker
  construction and never evaluates an absent `Worker` global; Node tests replace
  members through `mock.method`.
  ([think-runtime.ts:ThinkRuntime](./think-runtime.ts),
  [think-runtime.ts:thinkRuntime](./think-runtime.ts))
- `GamePosition` is a frozen snapshot of `initialFen`, `movesUci`, and
  `expectedFen`. `capturePosition` copies and freezes the caller-owned root
  FEN string, complete UCI sequence, and expected FEN before any asynchronous
  work; it never derives a root from chess history or a current FEN.
  `createPositionState(GamePosition | string)` loads the exact initial FEN
  into a new private `Chess` board, replays the full UCI history through
  public chess.js legality (castling, promotions, en-passant captures), and
  verifies the legal-convention `expectedFen`; malformed UCI, illegal
  prefixes, invalid roots, and final mismatches throw without mutating any
  caller board. `PositionState` is a frozen facade exposing only readonly
  `board`/`rawEpTarget` getter accessors; the mutable target and undo
  storage lives in module-private WeakMap state reachable only through the
  helper functions. `pushPositionMove` applies a legal `PositionMove` (`{from, to, promotion?}`)
  and `undoPositionMove` restores the saved board and prior raw target. The
  independent raw en-passant target initializes from the initial FEN's fourth
  field even when chess.js normalizes it away, becomes the midpoint square
  after every legal same-file double pawn move regardless of adjacent
  capturers, and clears after any other move.
  ([position.ts:GamePosition](./position.ts),
  [position.ts:PositionMove](./position.ts),
  [position.ts:PositionState](./position.ts),
  [position.ts:capturePosition](./position.ts),
  [position.ts:createPositionState](./position.ts),
  [position.ts:pushPositionMove](./position.ts),
  [position.ts:undoPositionMove](./position.ts))
- `search-types.ts` owns the canonical result and control types:
  `Promotion` (`q`/`r`/`b`/`n`), `ChildStat`, `ThinkResult`, `DrawReason`,
  `TerminalOutcome`, `SearchOutcome`, and `SearchControl`, all readonly.
  `SearchOutcome` is `kind: "move"` with `result`/`completedVisits`/`searchMs`
  or `kind: "terminal"` with `terminal`/`completedVisits: 0`/`searchMs`.
  These are the active types: `mcts.ts` `search`/`searchAsync` return
  `SearchOutcome` and every consumer unwraps it.
  ([search-types.ts:Promotion](./search-types.ts),
  [search-types.ts:ChildStat](./search-types.ts),
  [search-types.ts:ThinkResult](./search-types.ts),
  [search-types.ts:DrawReason](./search-types.ts),
  [search-types.ts:TerminalOutcome](./search-types.ts),
  [search-types.ts:SearchOutcome](./search-types.ts),
  [search-types.ts:SearchControl](./search-types.ts))
- `think-protocol.ts` owns the canonical protocol-v1 application types and
  wire unions: `ErrorCode` (exactly eighteen stable codes), `Backend`,
  `RequestContext`, `Attempt`, `FailureData`, `ThinkerFailure`,
  `SessionReady`, `ThinkResponse`, `EngineState`, `ThinkerOptions`,
  `Thinker`, `InitMessage`, `ThinkMessage`, `ReadyMessage`,
  `ResultMessage`, `WorkerErrorMessage`, `FatalMessage`, `ClientMessage`, and
  `WorkerMessage`. `WireFailure` is the `{code, diagnostic, searchMs,
  completedVisits}` payload carried only by scoped `error` replies; a `fatal`
  reply carries a top-level `code`/`diagnostic` pair, never a `failure`
  payload. It
  re-exports the `GamePosition` type, the
  checkpoint-owned `sameModelIdentity`, and the guard boundary
  (`sameContext`, `isClientMessage`, `isWorkerMessage`) implemented in
  `think-message-guards.ts`. The canonical `createThinker(options?:
  ThinkerOptions): Thinker` signature is the active factory's contract in
  `think-client.ts`. ([think-protocol.ts:ErrorCode](./think-protocol.ts),
  [think-protocol.ts:RequestContext](./think-protocol.ts),
  [think-protocol.ts:Attempt](./think-protocol.ts),
  [think-protocol.ts:FailureData](./think-protocol.ts),
  [think-protocol.ts:ThinkerFailure](./think-protocol.ts),
  [think-protocol.ts:SessionReady](./think-protocol.ts),
  [think-protocol.ts:ThinkResponse](./think-protocol.ts),
  [think-protocol.ts:EngineState](./think-protocol.ts),
  [think-protocol.ts:ThinkerOptions](./think-protocol.ts),
  [think-protocol.ts:Thinker](./think-protocol.ts),
  [think-protocol.ts:ClientMessage](./think-protocol.ts),
  [think-protocol.ts:WorkerMessage](./think-protocol.ts),
  [think-protocol.ts:WireFailure](./think-protocol.ts))
- `isClientMessage` and `isWorkerMessage` validate unknown records at
  runtime: exact allowed keys, branch discriminators, protocol version 1,
  safe integer IDs and counts, finite durations, value/prior/heat ranges,
  SHA256 strings, model-identity discriminants, session/context agreement,
  UCI and FEN syntax, an `ArrayBuffer` init body, complete move-budget
  equality, unique top-eight child records, omitted optional promotion,
  `result.ms === Math.round(searchMs)`, and zero terminal visits. Move
  histories must be dense index-owned UCI strings, FEN fields must carry
  single-digit rank counts with a safe nonnegative halfmove and a safe
  positive fullmove. `sameContext` compares every context field and every
  ordered history index symmetrically. `isErrorCode` validates a string
  against the canonical closed eighteen-code set; `think-failure.ts` reuses it
  for normalization so no second code list exists. Malformed or unknown
  variants return false rather than trusting a cast.
  ([think-message-guards.ts:isClientMessage](./think-message-guards.ts),
  [think-message-guards.ts:isWorkerMessage](./think-message-guards.ts),
  [think-message-guards.ts:sameContext](./think-message-guards.ts),
  [think-message-guards.ts:isErrorCode](./think-message-guards.ts))
- `mcts-core.ts` owns the single selection/expansion/backup/visit engine:
  `coreSearch` and `coreSearchAsync` run against a `PositionState` and a
  `PositionEvaluator` seam (production wraps `forward`; tests inject fakes),
  honour `SearchControl` signal/deadline/`now` cooperatively, restore the
  board and raw en-passant target on every exit path, re-check control after
  terminal diagnosis before accepting any terminal return, and return typed
  `SearchOutcome` values. `diagnoseTerminal` reports checkmate/draw truth for
  the position to move; `SearchCancelledError` and `SearchDeadlineError` are
  the control-surface errors.
  ([mcts-core.ts:coreSearch](./mcts-core.ts),
  [mcts-core.ts:coreSearchAsync](./mcts-core.ts),
  [mcts-core.ts:diagnoseTerminal](./mcts-core.ts),
  [mcts-core.ts:PositionEvaluator](./mcts-core.ts))
- `search(positionOrFen, visits, weights, control?)` and `searchAsync` are the
  history-aware wrappers: a `GamePosition` replays full UCI history and the raw
  en-passant target, a legacy FEN string keeps its documented zero-history
  semantics, and replay failures reject through `PositionInvalidError`.
  Terminal positions return typed terminal outcomes, never fabricated moves.
  `verifyOutcome(position, outcome)` is the final acceptance check: it replays
  the request position and returns `ok` only when a move outcome is legal there
  or a terminal outcome matches the real diagnosis (`illegal`/`badpos`
  otherwise). Canonical `Promotion`/`ChildStat`/`ThinkResult`/`DrawReason`/
  `TerminalOutcome`/`SearchOutcome`/`SearchControl`/`GamePosition` types are
  re-exported here.
  ([mcts.ts:search](./mcts.ts), [mcts.ts:searchAsync](./mcts.ts),
  [mcts.ts:verifyOutcome](./mcts.ts), [mcts.ts:PositionInvalidError](./mcts.ts))
- `createThinker(options?: ThinkerOptions)` returns the canonical `Thinker`:
  `ready: Promise<SessionReady>`, `getState()`, `subscribe(listener)`,
  `think(context)`, `cancel(requestId)`, and `terminate()`. The client owns
  verified private bytes, mode, initialization/deadline state, frozen published
  `EngineState` (delegated to `ThinkState`), backend/epoch assignment, the
  sole availability recovery onto the retained-byte main backend, and request
  dispatch through `ThinkSession`. Consolidated operation-current assertions
  (engine-live, unsettled init or request lease, live signal, and the original
  monotonic deadline) run before worker construction, immediately after the
  constructor, before byte copy/transfer, after every synchronous state
  publication, before and after decode, and inside both success and rejection
  continuations before ordinary error classification; a failed pre-init guard
  retires the newly constructed channel, an abort that already fired is checked
  after its listener attaches, a deadline-caused abort is classified before
  checkpoint errors, and an expiry inside the final backend publication retires
  the just-assigned worker. The shared `guardOrRetire` also runs inside the
  worker branch of the request error path: a failed authority check retires
  that captured channel and clears the backend assignment only while it still
  references that same channel, so repeated errors or messages on a retired
  channel stay inert and a newer successor is never cleared. The synchronous
  orphan-fault owner catches
  intentional retirement/deadline guard throws: stopped settlement is left
  alone and pending initialization routes through the existing failure
  authority, so nothing escapes the transport listener. `think` delegates the
  raw context to `ThinkSession`, which validates/captures it before claiming
  the slot. Recovery decode time is measured and carried into that
  request's main attempt `setupMs` only. `mode: "trained"` fetches and verifies the
  pinned M checkpoint through `loadPlayWeightsTimed`; `mode: "random-demo"`
  selects the deterministic seed-2026 S demo, never an implicit fallback.
  `isSessionFatal(code)` reports the codes that end the session (load,
  crypto, mismatch, protocol, and STOPPED). Session faults surface as
  `Failure`/`ThinkerFailure` rejections carrying code, bounded diagnostic,
  context, and attempt records; `RequestFault`, `fault`, `faultOf`, and
  `diag` are the shared failure helpers it reuses from `think-failure.ts`
  and `recordAttempt` comes from `think-session.ts`.
  ([think-client.ts:createThinker](./think-client.ts),
  [think-failure.ts:isSessionFatal](./think-failure.ts))
- `think-session.ts` is an internal request-lease helper consumed only by the
  client. `SessionRequests.submit(rawContext, initializationPending, ready,
  execute)` validates the raw entry shape and engine-session alias, captures
  the position through `capturePosition` (`POSITION_INVALID`/
  `PROTOCOL_INVALID` rejections preserve the original cause), then claims the
  single request slot, freezes a copied immutable entry
  context, validates and claims the caller-allocated, strictly increasing
  request ID (the session never allocates one), starts the permanent deadline
  timer, and returns the independently settled public promise; `cancel`
  settles it once and `stop` retires it as `STOPPED`. `RequestRun` is the
  opaque lease passed to the client `RequestExecutor`: it exposes the frozen
  context, deadline, abort signal, `assertCurrent()` (ownership, signal, and
  the original monotonic deadline), `beginAttempt`, which returns an
  `AttemptSpan` closing one attempt record, and `dispatch(open)`, which runs
  a backend request under the captured attempt handle: it checks current
  ownership before constructing work, observes the returned internal promise
  until cleanup, and binds cancellation to that captured handle so a successor
  is never touched. If `open` throws there is no returned handle to cancel and
  the exception propagates to reject the lease; if `open` returned and the
  signal was already aborted, cancellation binds only to that captured
  returned handle and its cleanup promise is observed until settlement.
  Rejection rebuilds the
  `Failure` on the lease's own frozen context and correctly closed attempt
  ledger, keeping the incoming error as the preserved cause rather than
  reusing foreign ownership. Completion runs
  final outcome verification with a fresh monotonic deadline check, deep
  freezes context/outcome/attempts, emits the typed `RequestEvent` boundary
  (`started`/`complete`/`failed`/`cancelled`), then settles the public
  promise. No mutable request internals cross the module boundary.
  ([think-session.ts:ThinkSession](./think-session.ts),
  [think-session.ts:SessionRequests](./think-session.ts),
  [think-session.ts:RequestRun](./think-session.ts),
  [think-session.ts:AttemptSpan](./think-session.ts),
  [think-session.ts:RequestExecutor](./think-session.ts),
  [think-session.ts:RequestEvent](./think-session.ts),
  [think-session.ts:ExecutedOutcome](./think-session.ts),
  [think-session.ts:recordAttempt](./think-session.ts))
- `think-failure.ts` is an internal shared failure-normalization helper
  consumed by the client and session. `Failure` is the typed rejection
  (`code`, bounded `diagnostic`, context, frozen attempts, original `cause`)
  built with ordinary constructor assignments — its attempts array and the
  `RequestFault` records are frozen, but the `Error` object itself is not
  runtime-frozen; `diag` bounds unknown error text to 2048 chars;
  `RequestFault` is the normalized fault record and `fault`/`faultOf` convert
  thrown values into frozen fault records using the canonical `isErrorCode`
  validation (unknown string codes become `SEARCH_FAILED` while the original
  cause is retained; `searchMs` is finite nonnegative or null, and
  `completedVisits` is a safe integer in `0..MAX_VISITS` or null);
  `isSessionFatal` is the shared fatal-code policy. It owns no state, backend,
  deadline or transport behavior. `think-client.ts` re-exports the names its
  callers already import. ([think-failure.ts:Failure](./think-failure.ts),
  [think-failure.ts:RequestFault](./think-failure.ts),
  [think-failure.ts:fault](./think-failure.ts),
  [think-failure.ts:faultOf](./think-failure.ts),
  [think-failure.ts:diag](./think-failure.ts),
  [think-failure.ts:isSessionFatal](./think-failure.ts))
- `think-main.ts` is the slim main-thread backend: `createMainBackend(bytes)`
  decodes retained verified bytes once through `mainCapabilities.decode`, then
  answers each `think(context, deadlineMs)` with a real `searchAsync` under a
  cooperative abort/deadline control. One serial promise tail orders requests
  so a successor accepted after a cancellation still waits for the previous
  search's cleanup inside its own unchanged deadline; after that tail resolves
  it re-checks the captured signal and deadline before invoking search, so an
  expired or cancelled waiting successor rejects without ever running;
  `cancel` aborts only the captured control. It owns no session state, worker
  transport, or
  cross-backend policy. `mainCapabilities` exposes `decode`/`search` as the
  test seam.
  ([think-main.ts:createMainBackend](./think-main.ts),
  [think-main.ts:MainBackend](./think-main.ts),
  [think-main.ts:MainRequest](./think-main.ts),
  [think-main.ts:mainCapabilities](./think-main.ts))
- `think-state.ts` is an internal state-publication helper consumed only by the
  client. `new ThinkState(engineSessionId)` owns the immutable `EngineState`
  snapshot, the listener set, safe immediate delivery, idempotent unsubscribe,
  and terminal stopped delivery. `publish(transition)` accepts only the closed
  readonly `StateTransition` union (starting/queued/cleared/thinking/
  recovering/backend/ready/failed facts), constructs and deep-freezes the
  canonical nested records, and keeps
  publication before the corresponding ready/request settlement. `request`
  projects an already-owned `ThinkSession` event plus controller-supplied
  immutable `BackendFacts` (backend, epoch, and `initializationPending`, true
  through every unsettled init stage including startup recovery) and the
  fatal-policy `preserveFailure` flag:
  `starting` publishes the backend actually being initialized, its reserved
  epoch and any preserved queued context; `started` publishes `queued` only
  while `initializationPending` holds and never regresses a post-ready
  stage; `cancelled` clears the active request while preserving the truthful
  initialization stage instead of manufacturing an unverified `ready`.
  `ready` always carries a null context and null error. It owns
  no requests. `stop` publishes stopped once, preserves identity/diagnostic
  facts, clears listeners, and ignores later publications; a late subscriber
  receives the stopped snapshot once with a no-op disposer. It owns no model
  loading, initialization, ready-promise lifecycle, backend/epoch/recovery, or
  request ownership.
  ([think-state.ts:ThinkState](./think-state.ts),
  [think-state.ts:StateTransition](./think-state.ts),
  [think-state.ts:BackendFacts](./think-state.ts))
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
  a digest alone makes no readiness claim. The trained thinker path loads only
  through this strict verifier, retains the private verified bytes, and hands
  a fresh copy to each worker epoch; the demo path verifies a deterministic
  local pack and never fetches.
  ([checkpoint.ts:verifyCheckpointBytes](./checkpoint.ts),
  [weights.ts:loadPlayWeightsTimed](./weights.ts),
  [weights.ts:loadDemoWeights](./weights.ts))
- `SELECTED_CHECKPOINT` is a local pin for the existing M file, not a
  publication service or model registry. Unchanged train/promotion helpers may
  later replace public weights, metadata and some frontend constants, but they
  do not maintain this new digest/length/source identity: a future public
  replacement requires a coordinated reviewed selection-description and
  input-identity update with fresh verification, and a mismatch must fail
  visibly. ([constants.ts:SELECTED_CHECKPOINT](./constants.ts))
- The position helpers never read or write private chess.js fields, never
  reload the board from FEN between visits, and never infer a target from
  pawn layout. `GamePosition.initialFen` must be the explicit original root
  and `movesUci` the complete sequence, both supplied by the caller; the UI
  retains them independently and appends only after a successful legal move.
  A legacy FEN string input is a root with zero earlier history and only the
  raw data present in that string: an already-normalized FEN cannot recover a
  discarded raw target or repetition history, which is the known FEN-only
  limitation for legacy callers.
  ([position.ts:capturePosition](./position.ts),
  [position.ts:createPositionState](./position.ts))
- The protocol guards validate wire values only: they start no timers, fetch
  no weights, construct no workers, run no search, and mutate no application
  state. `openWorkerChannel` and the worker-side `isClientMessage` check are
  the active consumers: the worker independently verifies the transferred
  bytes, and the channel rejects malformed, stale-epoch, future-epoch,
  unknown-id, and retired-id replies.
  ([think-message-guards.ts:isClientMessage](./think-message-guards.ts),
  [think-message-guards.ts:isWorkerMessage](./think-message-guards.ts),
  [think-message-guards.ts:isContext](./think-message-guards.ts),
  [think-message-guards.ts:sameContext](./think-message-guards.ts),
  [think-worker-client.ts:openWorkerChannel](./think-worker-client.ts))
- Every search starts with a fresh root and expands only legal moves. PUCT uses
  `C_PUCT = 1.5`; backpropagation alternates value signs. Final selection sorts
  by visits, then prior, so one visit selects the policy argmax. A nonterminal
  position with no legal root move throws an error. `SearchControl` deadlines
  and abort signals are checked before and during the visit loop, and the
  position is always restored afterwards. Visits are never clamped by the
  search; the protocol guards bound `requestedVisits` to `MAX_VISITS`.
  ([mcts-core.ts:select](./mcts-core.ts), [mcts-core.ts:oneVisit](./mcts-core.ts),
  [mcts-core.ts:finishMove](./mcts-core.ts), [mcts-core.ts:checkControl](./mcts-core.ts),
  [constants.ts:C_PUCT](./constants.ts), [constants.ts:MAX_VISITS](./constants.ts))
- The earlier S-loader drift is resolved at source level: `SELECTED_CHECKPOINT`
  is the single trained-mode source of truth, `loadPlayWeightsTimed` fetches it
  once and verifies the full pin before any decode, and there is no
  random-weight fallback anywhere in trained play. The `random-demo` mode is an
  explicit deterministic seed-2026 S demonstration, labeled untrained. A future
  public weight replacement still requires the coordinated
  selection-description update recorded under the pin invariant above.
  ([constants.ts:SELECTED_CHECKPOINT](./constants.ts),
  [weights.ts:loadPlayWeightsTimed](./weights.ts),
  [weights.ts:loadDemoWeights](./weights.ts),
  [think-client.ts:createThinker](./think-client.ts))
- Request and initialization work is bounded by `OPERATION_DEADLINE_MS` (90s);
  a queued request's deadline additionally cannot exceed the original
  initialization deadline, so queued work never outlives init. The worker
  acknowledgement bound is `WORKER_ACK_MS` (8s); exceeding it consumes the one
  availability recovery onto the main backend decoded from retained verified
  bytes, advancing `backendEpoch`. Worker thinking uses the request's remaining
  budget; cancellation and stop settle the public promise immediately while
  backend cleanup finishes serially in the background, and main-backend
  successors wait behind that cleanup inside their own unchanged deadline.
  ([constants.ts:OPERATION_DEADLINE_MS](./constants.ts),
  [constants.ts:WORKER_ACK_MS](./constants.ts),
  [think-client.ts:createThinker](./think-client.ts),
  [think-session.ts:ThinkSession](./think-session.ts),
  [think-main.ts:createMainBackend](./think-main.ts))
- `think-worker-client.ts` owns the worker transport boundary:
  `openWorkerChannel({ engineSessionId, backendEpoch, expectedIdentity,
  onOrphan })` binds one epoch to one worker, posts the protocol-v1
  `init`/`think` messages, validates every reply through the guards before
  reading scoped fields, and discards stale epochs, retired request IDs, and
  late duplicates as `staleCount` rather than faults. `init`/`think` reject
  with typed frozen `ChannelFailure` records (`isChannelFailure`);
  `expireRequest` retires one id client-side; `retire` detaches listeners and
  keeps post-retirement traffic as stale counters. `FAULT_CODES`
  (`PROTOCOL_INVALID`, `PROTOCOL_VERSION`, `MODEL_MISMATCH`) are the codes that
  retire the channel.
  ([think-worker-client.ts:openWorkerChannel](./think-worker-client.ts),
  [think-worker-client.ts:WorkerChannel](./think-worker-client.ts),
  [think-worker-client.ts:ChannelResult](./think-worker-client.ts),
  [think-worker-client.ts:ChannelFailure](./think-worker-client.ts),
  [think-worker-client.ts:isChannelFailure](./think-worker-client.ts),
  [think-worker-client.ts:FAULT_CODES](./think-worker-client.ts))
- The random gauntlet alternates colors, stops at game-over or 240 plies, and
  adjudicates non-mate results by material magnitude of at least four. Passing
  requires score at least 0.7 and more wins than losses. The CLI fixes 20 games,
  one visit, and seed 2026. ([gauntlet.ts:playGame](./gauntlet.ts),
  [gauntlet.ts:playGauntlet](./gauntlet.ts), [gauntlet.ts:main](./gauntlet.ts))

## Side Effects

- Fetches weights, creates/terminates a module worker, exchanges messages, and
  schedules readiness/search/yield timers. ([weights.ts:loadPlayWeights](./weights.ts),
  [think-worker-client.ts:openWorkerChannel](./think-worker-client.ts),
  [think-client.ts:createThinker](./think-client.ts), [mcts.ts:searchAsync](./mcts.ts))
- The checkpoint and think-runtime modules add no import-time effects: no
  fetch, Worker construction, digest or model initialization happens on import.
  The verification helpers read a supplied buffer and the capability digest
  only. ([checkpoint.ts:verifyCheckpointBytes](./checkpoint.ts),
  [think-runtime.ts:thinkRuntime](./think-runtime.ts),
  [think-runtime.ts:ThinkWorker](./think-runtime.ts))
- The position, search-types, protocol, and message-guard modules add no
  import-time effects and hold no timers, workers, fetches, or model state.
  ([position.ts](./position.ts), [search-types.ts](./search-types.ts),
  [think-protocol.ts](./think-protocol.ts),
  [think-message-guards.ts](./think-message-guards.ts))
- The gauntlet CLI reads checkpoints, creates `public/weights`, logs results,
  and writes `tinyaz-s.meta.json` before checking its pass gate. Passing also
  copies the S binary and overwrites bundled `checkpoint-meta.json`. Missing
  checkpoints or a failed gate exit with code 2.
  ([gauntlet.ts:main](./gauntlet.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`.
The automated script discovers every `src/**/*.test.ts`, including all chess
suites below; see [package.json](../../../package.json).
The focused command
`node --experimental-strip-types --test src/lib/chess/checkpoint.test.ts`
runs the checkpoint validation suite directly: it reads the real pinned M file,
exercises the deterministic seed-2026 S demo, malformed/mismatched payloads,
the mocked capability boundary, and buffer-ownership invariants.

The focused command
`node --experimental-strip-types --test src/lib/chess/position.test.ts src/lib/chess/think-protocol.test.ts`
runs the prepared position/protocol suites directly: immutable snapshots,
full-history replay with castling, promotions and both en-passant directions,
raw-target retention for arbitrary and pinned roots, push/undo restoration,
threefold history versus a final-FEN-only board, and schema-level message,
identity, context, and result validation. These are C3b foundation checks;
they assert no real worker handshake, availability recovery, or active
runtime change.

`think-test-fixtures.ts` is a test-only module of canonical sample records:
`START_FEN`, `OPEN_FEN`, `POSITION`, `CONTEXT`, `SESSION`, `DEMO_IDENTITY`,
`MOVE_RESULT`, `MOVE_OUTCOME`, `INIT_MESSAGE`, `THINK_MESSAGE`,
`READY_MESSAGE`, `RESULT_MESSAGE`, `INIT_ERROR`, `REQUEST_ERROR`, and
`FATAL_MESSAGE`, plus the shared harness machinery the C3c tests use:
`mCheckpoint` (loads the real pinned M bytes), `FakeWorker`/`workerFactory`
(`FakeWorker.postMessage` accepts both real `Worker.postMessage` call forms —
transfer array and `StructuredSerializeOptions` — and stores a genuine
`structuredClone` with the supplied transfer list, so transferred buffers
detach exactly as in a browser), `makeClock`/`clockRuntime`/`delayedClock`
  (advance moves time while `runDue` fires held timers separately and
  `pending()` observes the remaining timer count),
  `patchRuntime`, `tick`/`pause`/`until`,
`fetchOnce`, `sessionOf`/`readyMsg`/`moveOutcome`/`contextOf`, and the
`rejection`/`expectCode` typed-failure helpers. Only test files import it; it carries no
production import, runtime knob, player test mode, or alternate engine.
([think-test-fixtures.ts](./think-test-fixtures.ts))

`think-lifecycle.test.ts`, `think-worker.test.ts`, `think-deadline.test.ts`,
`think-main.test.ts`, and `think-retirement.test.ts` are the dedicated C3c
suites: the retirement file owns captured-worker retirement and late-event
isolation (a late failed transport after the request deadline rejects
DEADLINE with the captured worker terminated, zero decode, a closed attempt,
deferred backend and no remaining timer; repeated old errors and malformed
or old messages on the retired channel cannot decode or revive readiness;
a permitted successor completes on a fresh epoch/backend untouched by old
events; expiry inside the final backend publication retires the just-assigned
worker with no remaining operation timer; and an idle orphan fault inside a
terminating recovery escapes no listener) plus the held-loading
queued-context case (a request submitted
while the load body is held keeps its exact context through the starting
publication carrying identity/backend/epoch); the lifecycle file
covers recovery provenance, queued-state fields, dispose phases, state
transitions, subscriber semantics (including a terminating `starting`
subscriber, constructor-side expiry, a terminating `recovering` subscriber,
and a cancelled queued request during startup recovery), queued-failure
context ownership, and entry-context ownership; the worker
file drives the production `createWorkerHandler`/`send` boundary under Node
with the real pinned M bytes (import safety, init-once, terminal fatal,
busy, envelope/model/protocol faults and real `structuredClone` transfer
lists); the deadline file owns init/request deadline authority including
delayed-timer expiry, late transport failures, loader abort classification
across fetch, body, and digest fulfillment or rejection, and terminal
final-control; the main file owns actually dispatched
main-backend cancellation, held cleanup serialization, the entry-anchored
successor deadline after a nonzero cleanup wait,
captured-handle isolation, recovering-publication cancellation without
decode, deadline-crossing decode, and per-request recovery setup time.
They assert no native worker, browser,
parity or strength behavior.
([think-lifecycle.test.ts](./think-lifecycle.test.ts),
[think-worker.test.ts](./think-worker.test.ts),
[think-deadline.test.ts](./think-deadline.test.ts),
[think-main.test.ts](./think-main.test.ts),
[think-retirement.test.ts](./think-retirement.test.ts))

The separate command `node --experimental-strip-types src/lib/chess/gauntlet.ts`
runs the real random-move gauntlet and can publish assets. Append a checkpoint
path to override its default. It is not the automated test command or a
Stockfish/Lichess rating run. Stored checkpoint metadata is historical input,
without fresh evaluation evidence from this documentation pass.
