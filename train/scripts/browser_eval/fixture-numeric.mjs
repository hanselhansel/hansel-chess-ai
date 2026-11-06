// Candidate-only numeric pipeline. Loaded lazily by the shared fixture only
// after its candidate guard. No model/engine work occurs at module import.
// The actual numeric pipeline over the snapshot's own modules. The raw
// parity case is {id,initialFen,movesUci,expectedRawEpTarget} — NOT a
// GamePosition — so the ONE replay creates from initialFen then pushes
// each recorded move once, and the actual rawEpTarget must equal the
// recorded expectation. encodeBoard consumes the real board plus raw
// en-passant target, unpackWeights decodes the verified delivered
// bytes, forward(planes,weights) returns the real {policy,value}, and
// encodeMovePlane maps legal UCI to policy indices.
// UCI "e2e4"/"e7e8q" -> the snapshot's PositionMove/chess.js move shape.
// A malformed length surfaces through the real board/replay error.
const uciToMove = (uci) => {
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length > 4) move.promotion = uci[4];
  return move;
};

export async function computeNumeric(testCase, loadModelBytes) {
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
  const bytes = await loadModelBytes();
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
}
