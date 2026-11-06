// Actual rules own every accepted ply/result. Recorded transports preserve
// raw candidate/legacy APIs and separate delivery/worker observations.
import { Chess } from "chess.js";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { checkpointResult, serializeCheckpointPgn } from "./pgn-format.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { exactFields, isObj, isRef, nat, strNE } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./schema-constants.mjs";

import { validateArmReady, validateArmTurn } from "./match-observations.mjs";

const fail = (detail) => {
  const error = new Error(`MATCH_INVALID ${detail}`);
  error.code = "MATCH_INVALID";
  return error;
};
const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));
const ownGame = (game) => {
  if (!isObj(game) || !exactFields(game, ["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor", "initialFen", "movesUci"]) ||
    !/^(?:p[0-9]{2}|aa)-g[12]$/.test(game.gameId) || !nat(game.pairNumber) || game.pairNumber < 1 || game.pairNumber > 20 ||
    ![1, 2].includes(game.gameNumber) || !strNE(game.openingId) ||
    !["white", "black"].includes(game.candidateColor) || !strNE(game.initialFen) ||
    !Array.isArray(game.movesUci) || !game.movesUci.every((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))) {
    throw fail("game fields");
  }
  return freezeDeep(copy(game));
};
const signalFence = (signal) => {
  const get = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get;
  try {
    get.call(signal);
  } catch {
    throw fail("genuine signal");
  }
  return () => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };
};

export async function playGame({ game, arms, checkpoint, signal }) {
  game = ownGame(game);
  const fence = signalFence(signal);
  if (!isObj(arms) || typeof checkpoint !== "function") {
    throw fail("game capabilities");
  }
  const transports = { candidate: arms.candidate, baseline: arms.baseline };
  for (const arm of Object.values(transports)) {
    if (!isObj(arm) || !["candidate", "baseline"].includes(arm.kind) ||
      typeof arm.initialize !== "function" || typeof arm.think !== "function") {
      throw fail("recorded arm transport");
    }
  }
  if (game.openingId === "aa-control" ? transports.candidate.kind !== "baseline" || transports.baseline.kind !== "baseline" :
    transports.candidate.kind !== "candidate" || transports.baseline.kind !== "baseline") {
    throw fail("software treatment roles");
  }
  const board = new Chess(game.initialFen);
  const movesUci = [...game.movesUci];
  for (const uci of movesUci) {
    if (checkpointResult(board) !== "*") {
      throw fail("terminal opening prefix");
    }
    board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  if (checkpointResult(board) !== "*") {
    throw fail("opening must be nonterminal");
  }
  let ordinal = 0;
  const persist = async () => {
    fence();
    const value = await checkpoint({ gameId: game.gameId, ordinal, initialFen: game.initialFen,
      movesUci: [...movesUci], fen: board.fen(), result: checkpointResult(board) });
    fence();
    if (!isObj(value) || !exactFields(value, ["checkpointId", "pgn"]) ||
      value.checkpointId !== `${game.gameId}-c${ordinal}` || !isRef(value.pgn)) {
      throw fail("acknowledged checkpoint");
    }
    return value;
  };
  await persist();
  const ready = {};
  const ids = { candidate: 0, baseline: 0 };
  for (const role of ["candidate", "baseline"]) {
    fence();
    ready[role] = validateArmReady(transports[role], await transports[role].initialize());
    fence();
  }
  for (;;) {
    fence();
    const role = (board.turn() === "w") === (game.candidateColor === "white") ? "candidate" : "baseline";
    const request = { requestId: ++ids[role], gameGeneration: 1,
      position: { initialFen: game.initialFen, movesUci: [...movesUci], expectedFen: board.fen() }, requestedVisits: 64 };
    const observation = await transports[role].think(copy(request));
    fence();
    const result = validateArmTurn(transports[role], ready[role], observation, request);
    const move = board.move({ from: result.uci.slice(0, 2), to: result.uci.slice(2, 4), promotion: result.uci[4] });
    if (move === null) {
      throw fail("illegal engine move");
    }
    movesUci.push(result.uci);
    ordinal += 1;
    const retained = await persist();
    const terminal = checkpointResult(board);
    if (terminal !== "*") {
      return Object.freeze({ gameId: game.gameId, result: terminal, ...retained });
    }
  }
}

export function createGameCheckpoint({ game, capabilities }) {
  game = ownGame(game);
  const phase = capabilities?.manifest?.phase;
  const fence = signalFence(capabilities?.signal);
  if (!["preflight", "compare"].includes(phase) || typeof capabilities.artifact !== "function" || typeof capabilities.event !== "function") {
    throw fail("checkpoint capabilities");
  }
  let ordinal = 0;
  let previous = null;
  let pending = false;
  let failed = false;
  let firstError;
  let complete = false;
  return async (state) => {
    const own = copy(state);
    fence();
    if (pending || complete || failed) {
      if (failed) {
        throw firstError;
      }
      throw fail("checkpoint admission");
    }
    if (!isObj(own) || !exactFields(own, ["gameId", "ordinal", "initialFen", "movesUci", "fen", "result"]) ||
      own.gameId !== game.gameId || own.ordinal !== ordinal || own.initialFen !== game.initialFen) {
      throw fail("checkpoint state");
    }
    const bytes = serializeCheckpointPgn({ phase, game, movesUci: own.movesUci, result: own.result });
    if (ordinal === 0 && bytes.length > FIXED_LIMITS.ipc.chunkBytes) {
      throw fail("initial checkpoint chunk bound");
    }
    pending = true;
    try {
      const slot = ordinal % 2 === 0 ? "a" : "b";
      const filename = `${phase}/games/${game.gameId}.${slot}.pgn`;
      const chunks = async function* () {
        for (let offset = 0; offset < bytes.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
          fence();
          yield bytes.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
        }
      };
      const pgn = await capabilities.artifact(filename, ordinal < 2 ? "append" : "replace", chunks());
      fence();
      if (!isRef(pgn) || pgn.path !== filename || pgn.byteLength !== bytes.length || pgn.sha256 !== sha256Bytes(bytes)) {
        throw fail("actual checkpoint close ref");
      }
      const checkpointId = `${game.gameId}-c${ordinal}`;
      await capabilities.event("response", { recordType: "pgn-checkpoint", gameId: game.gameId,
        pairNumber: game.pairNumber, gameNumber: game.gameNumber, openingId: game.openingId,
        candidateColor: game.candidateColor, checkpointId, previousCheckpointId: previous, ordinal, slot,
        plyCount: own.movesUci.length, initialFen: game.initialFen, fen: own.fen, result: own.result, pgn });
      fence();
      previous = checkpointId;
      ordinal += 1;
      complete = own.result !== "*";
      return Object.freeze({ checkpointId, pgn });
    } catch (error) {
      failed = true;
      firstError = error;
      throw error;
    } finally {
      pending = false;
    }
  };
}
