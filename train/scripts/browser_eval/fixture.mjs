// Evaluation-only engine fixture module. Imports perform NO model,
// context, worker or engine work; every effect runs inside the explicit
// window.__tinyazEval calls. The server injects the frozen
// window.__tinyazArm {arm, engineUrl, workbenchUrl, model} as DATA; the
// module requires it on every entry so a bare import can never reach a
// snapshot or the network. All snapshot modules load through the `@`
// alias, which the server binds to the selected arm's immutable src —
// the actual candidate think-protocol API and the recorded baseline
// bb76439 API differ only in think(), handled below by arm.

const ARMS = ["candidate", "baseline"];

// The injected frozen configuration. Missing or malformed data fails
// closed on EVERY entry — the fixture never assumes an arm or model.
const requireConfig = () => {
  const cfg = window.__tinyazArm;
  if (
    cfg === null ||
    typeof cfg !== "object" ||
    !ARMS.includes(cfg.arm) ||
    cfg.model === null ||
    typeof cfg.model !== "object" ||
    typeof cfg.model.url !== "string" ||
    typeof cfg.model.byteLength !== "number" ||
    typeof cfg.model.sha256 !== "string"
  ) {
    throw new Error("tinyaz fixture: missing or invalid injected arm/config");
  }
  return cfg;
};

// One private session slot; initialize fills it, dispose empties it.
// The delivered model bytes are retained module-level so numeric()
// stays independent of the thinker session; dispose() clears both.
let state = null;
let modelBytes = null;

const requireThinker = () => {
  if (state === null || state.thinker === undefined || state.ready === undefined) {
    throw new Error("tinyaz fixture: call initialize() first");
  }
  return state;
};

// UCI "e2e4"/"e7e8q" -> the snapshot's PositionMove/chess.js move shape.
// A malformed length surfaces through the real board/replay error.
const uciToMove = (uci) => {
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci[4];
  return move;
};

// Baseline think(fen, visits) takes a plain FEN — replay the recorded
// GamePosition through real chess.js to the exact current position.
const positionToFen = async (position) => {
  const { Chess } = await import("chess.js");
  const board = new Chess(position.initialFen);
  for (const uci of position.movesUci ?? []) {
    board.move(uciToMove(uci));
  }
  return board.fen();
};

// The model bytes arrive ONLY through the server's controlled route —
// delivery facts are recorded server-side; the fixture retains one copy
// per session so repeated numeric() calls share the single delivery.
const fetchModelBytes = async (cfg) => {
  if (modelBytes !== null) return modelBytes;
  const response = await fetch(cfg.model.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`tinyaz fixture: model delivery failed HTTP ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== cfg.model.byteLength) {
    throw new Error("tinyaz fixture: model delivery byteLength mismatch");
  }
  // The delivered bytes must hash to the injected pinned identity —
  // byteLength alone is not a verification.
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== cfg.model.sha256) {
    throw new Error("tinyaz fixture: model delivery sha256 mismatch");
  }
  modelBytes = bytes;
  return bytes;
};

// Candidate: actual createThinker() -> ready -> SessionReady.
// Baseline: actual recorded createThinker() -> ready -> legacy Ready
// (which carries no digest — nothing is invented here). Errors from the
// real ready path propagate unchanged; there is no random fallback.
const initialize = async () => {
  requireConfig();
  if (state === null) state = {};
  if (state.thinker === undefined) {
    const client = await import("@/lib/chess/think-client.ts");
    if (typeof client.createThinker !== "function") {
      throw new Error("tinyaz fixture: snapshot exports no createThinker");
    }
    state.thinker = client.createThinker();
  }
  if (state.ready === undefined) {
    const ready = state.thinker.ready;
    if (ready === null || typeof ready !== "object" || typeof ready.then !== "function") {
      throw new Error("tinyaz fixture: snapshot thinker exposes no ready promise");
    }
    state.ready = await ready;
  }
  return state.ready;
};

// Candidate: the actual RequestContext over the real engineSessionId
// returns the actual ThinkResponse. Baseline: the recorded think(fen,
// visits) returns the actual legacy ThinkResult. Neither response is
// rewritten and no supplied identity is echoed back.
const think = async ({ requestId, gameGeneration, position, requestedVisits }) => {
  const cfg = requireConfig();
  const session = requireThinker();
  if (cfg.arm === "candidate") {
    return session.thinker.think({
      engineSessionId: session.ready.engineSessionId,
      gameGeneration,
      requestId,
      position,
      requestedVisits,
    });
  }
  const fen = await positionToFen(position);
  return session.thinker.think(fen, requestedVisits);
};

// The actual numeric pipeline over the snapshot's own modules. The raw
// parity case is {id,initialFen,movesUci,expectedRawEpTarget} — NOT a
// GamePosition — so the ONE replay creates from initialFen then pushes
// each recorded move once, and the actual rawEpTarget must equal the
// recorded expectation. encodeBoard consumes the real board plus raw
// en-passant target, unpackWeights decodes the verified delivered
// bytes, forward(planes,weights) returns the real {policy,value}, and
// encodeMovePlane maps legal UCI to policy indices.
const numeric = async (testCase) => {
  const cfg = requireConfig();
  const [position, encode, policy, weights, net] = await Promise.all([
    import("@/lib/chess/position.ts"),
    import("@/lib/chess/encode.ts"),
    import("@/lib/chess/policy.ts"),
    import("@/lib/chess/weights.ts"),
    import("@/lib/chess/net.ts"),
  ]);
  const replay = position.createPositionState(testCase.initialFen);
  for (const uci of testCase.movesUci ?? []) {
    position.pushPositionMove(replay, uciToMove(uci));
  }
  if (replay.rawEpTarget !== testCase.expectedRawEpTarget) {
    throw new Error("tinyaz fixture: raw en-passant target mismatch");
  }
  const planes = encode.encodeBoard(replay.board, replay.rawEpTarget);
  const bytes = await fetchModelBytes(cfg);
  const weightSet = weights.unpackWeights(new Uint8Array(bytes));
  const out = net.forward(planes, weightSet);
  const flip = replay.board.turn() === "b";
  const legalMoves = replay.board.moves({ verbose: true });
  const legalUci = legalMoves.map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
  const legalIndices = legalMoves.map((m) => {
    const encoded = policy.encodeMovePlane(m.from, m.to, m.promotion, flip);
    return encoded.plane * 64 + encoded.from;
  });
  return {
    id: testCase.id,
    planes: Array.from(planes),
    logits: Array.from(out.policy),
    legalUci,
    legalIndices,
    rawEpTarget: replay.rawEpTarget,
    value: out.value,
    fen: replay.board.fen(),
    history: replay.board.history(),
    movesUci: [...(testCase.movesUci ?? [])],
  };
};

// Dispose the REAL thinker through its actual terminate() — both the
// candidate and the recorded baseline snapshot expose that literal
// teardown; the session slot always clears.
const dispose = async () => {
  const session = state;
  state = null;
  modelBytes = null;
  if (session !== null && session.thinker !== undefined) {
    await session.thinker.terminate();
  }
};

window.__tinyazEval = Object.freeze({ initialize, think, numeric, dispose });
