// Supervisor-owned persisted checkpoint selection. Read-only actual PGN
// inspection; no writer, Native, cleanup, phase-status or timer authority.
import path from "node:path";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { validateGameSchedule } from "./phase-fixtures.mjs";
import { replayCheckpointPgn } from "./pgn-format.mjs";
import { exactFields, isAbs, isObj, isRef, nat, strNE } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./schema-constants.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";

const fail = (detail) => {
  const error = new Error(`PGN_EVIDENCE_INVALID ${detail}`);
  error.code = "PGN_EVIDENCE_INVALID";
  return error;
};
const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));
const payloadFields = [
  "recordType", "gameId", "pairNumber", "gameNumber", "openingId", "candidateColor",
  "checkpointId", "previousCheckpointId", "ordinal", "slot", "plyCount", "initialFen", "fen", "result", "pgn",
];

export function createPgnEvidence(options, context) {
  if (!isObj(options) || !exactFields(options, ["workspaceRoot", "runId", "phase", "gameSchedule"]) ||
    !isAbs(options.workspaceRoot) || !strNE(options.runId) ||
    !isObj(context) || !exactFields(context, ["budget", "lifetime"])) {
    throw fail("constructor fields");
  }
  const { workspaceRoot, phase } = options;
  const schedule = validateGameSchedule({ phase, gameSchedule: copy(options.gameSchedule) });
  const budget = context.budget;
  const io = createSnapshotIO({ workspaceRoot, repoRoot: workspaceRoot, budget, lifetime: context.lifetime });
  const expected = new Map(schedule.map((game) => [game.gameId, game]));
  const games = [];
  const slots = new Map();
  let lastRecordSeq = -1;
  let frozen = false;
  let frozenGames = null;
  let firstStopReason = null;
  let freezeAtMonoNs = null;
  let inspecting = false;
  const filename = (gameId, slot) => `${phase}/games/${gameId}.${slot}.pgn`;
  const lookup = (filename) => {
    for (const game of schedule) {
      for (const slot of ["a", "b"]) {
        if (filename === `${phase}/games/${game.gameId}.${slot}.pgn`) {
          return { game, slot };
        }
      }
    }
    return null;
  };
  const bound = (value) => {
    if (canonicalBytes(value).length > FIXED_LIMITS.ipc.driverBytes) {
      throw fail("metadata byte ceiling");
    }
    return value;
  };
  const gameBody = (entry, stopping) => {
    const { result, ...checkpoint } = entry.checkpoint;
    return {
    gameId: entry.game.gameId, pairNumber: entry.game.pairNumber, gameNumber: entry.game.gameNumber,
    openingId: entry.game.openingId, candidateColor: entry.game.candidateColor,
    state: entry.checkpoint.result !== "*" ? "complete" : stopping ? "incomplete" : "in-progress",
    result: entry.checkpoint.result,
    stopReason: stopping && entry.checkpoint.result === "*" ? firstStopReason : null,
    checkpoint: copy(checkpoint),
    };
  };

  const observeArtifact = (record) => {
    const selected = lookup(record.path);
    if (selected === null) {
      return;
    }
    const { game, slot } = selected;
    const current = games.find((entry) => entry.game.gameId === game.gameId);
    if (current?.checkpoint.slot === slot) {
      throw fail("current checkpoint slot targeted");
    }
    const prior = slots.get(record.path);
    const sameStream = prior !== undefined && prior.artifactId === record.artifactId;
    if (sameStream ? prior.closed || prior.mode !== record.mode :
      record.mode !== (prior === undefined ? "append" : "replace")) {
      throw fail("slot stream lifecycle");
    }
    if (!strNE(record.artifactId) || typeof record.last !== "boolean" ||
      (record.last ? !isRef(record.ref) || record.ref.path !== record.path : record.ref !== null)) {
      throw fail("actual closed ref");
    }
    if (record.ref !== null && record.ref.byteLength > FIXED_LIMITS.ipc.frameBytes) {
      throw fail("PGN inspection byte ceiling");
    }
    slots.set(record.path, {
      gameId: game.gameId, path: record.path, artifactId: record.artifactId,
      mode: record.mode, closed: record.last, ref: record.ref === null ? null : copy(record.ref),
      accepted: sameStream ? prior.accepted : false,
    });
  };

  const observeCheckpoint = async (record) => {
    const payload = record.payload;
    if (record.kind !== "response" || payload.recordType !== "pgn-checkpoint") {
      return;
    }
    if (!exactFields(payload, payloadFields) || !expected.has(payload.gameId) || !nat(payload.ordinal) ||
      !nat(payload.plyCount) || !isRef(payload.pgn)) {
      throw fail("checkpoint fields");
    }
    const game = expected.get(payload.gameId);
    for (const key of ["pairNumber", "gameNumber", "openingId", "candidateColor", "initialFen"]) {
      if (payload[key] !== game[key]) {
        throw fail("checkpoint schedule");
      }
    }
    const previous = games.find((entry) => entry.game.gameId === game.gameId);
    if (previous === undefined && (games.some((entry) => entry.checkpoint.result === "*") ||
      schedule[games.length]?.gameId !== game.gameId)) {
      throw fail("game order");
    }
    if (previous !== undefined && previous.checkpoint.result !== "*") {
      throw fail("checkpoint after terminal");
    }
    const ordinal = previous === undefined ? 0 : previous.checkpoint.ordinal + 1;
    const slot = ordinal % 2 === 0 ? "a" : "b";
    if (payload.ordinal !== ordinal || payload.slot !== slot ||
      payload.checkpointId !== `${game.gameId}-c${ordinal}` ||
      payload.previousCheckpointId !== (previous?.checkpoint.checkpointId ?? null) ||
      payload.pgn.path !== filename(game.gameId, slot)) {
      throw fail("checkpoint ordinal/slot");
    }
    const stored = slots.get(payload.pgn.path);
    if (stored === undefined || !stored.closed || !deepEqual(stored.ref, payload.pgn)) {
      throw fail("checkpoint lacks actual close");
    }
    if (frozen) {
      return;
    }
    const bytes = await io.readAt(workspaceRoot, payload.pgn.path, false, FIXED_LIMITS.ipc.frameBytes);
    if (bytes.length !== stored.ref.byteLength || sha256Bytes(bytes) !== stored.ref.sha256) {
      throw fail("persisted PGN bytes");
    }
    const replay = await replayCheckpointPgn({ phase, game, bytes, budget });
    if (payload.fen !== replay.fen || payload.result !== replay.result || payload.plyCount !== replay.movesUci.length ||
      !deepEqual(replay.movesUci.slice(0, game.movesUci.length), game.movesUci) ||
      previous === undefined && (replay.result !== "*" || replay.movesUci.length !== game.movesUci.length) ||
      previous !== undefined && (replay.movesUci.length !== previous.history.length + 1 ||
        !deepEqual(replay.movesUci.slice(0, -1), previous.history))) {
      throw fail("history/FEN/rules result");
    }
    // First-stop is synchronous and independent of this awaited read.
    // A late successful replay remains diagnostic, never a promotion.
    if (frozen) {
      return;
    }
    const checkpoint = {
      checkpointId: payload.checkpointId, ordinal, slot, plyCount: payload.plyCount,
      initialFen: game.initialFen, fen: replay.fen, result: replay.result, pgn: copy(stored.ref),
    };
    const next = { game, checkpoint, history: [...replay.movesUci] };
    if (previous === undefined) {
      games.push(next);
    } else {
      games[games.indexOf(previous)] = next;
    }
    stored.accepted = true;
  };

  const observePersisted = async (record) => {
    if (inspecting) {
      throw fail("observer must use existing serialized record chain");
    }
    const own = bound(copy(record));
    const fields = own.type === "artifact" ?
      ["type", "recordId", "recordSeq", "artifactId", "path", "mode", "last", "ref"] :
      ["type", "recordId", "recordSeq", "kind", "payload"];
    if (!isObj(own) || !["artifact", "event"].includes(own.type) || !exactFields(own, fields) ||
      !strNE(own.recordId) || own.recordSeq !== lastRecordSeq + 1 ||
      own.type === "event" && !isObj(own.payload)) {
      throw fail("persisted record metadata");
    }
    lastRecordSeq = own.recordSeq;
    inspecting = true;
    try {
      if (own.type === "artifact") {
        observeArtifact(own);
      } else {
        await observeCheckpoint(own);
      }
    } finally {
      inspecting = false;
    }
  };
  const freeze = (fact) => {
    if (frozen) {
      return;
    }
    if (!isObj(fact) || !exactFields(fact, ["stopReason", "atMonoNs"]) ||
      !(fact.stopReason === null || strNE(fact.stopReason)) || typeof fact.atMonoNs !== "bigint" || fact.atMonoNs < 0n) {
      throw fail("first-stop fact");
    }
    frozen = true;
    firstStopReason = fact.stopReason;
    freezeAtMonoNs = fact.atMonoNs.toString();
    frozenGames = games.map((entry) => gameBody(entry, true));
  };
  const snapshot = () => {
    if (frozen && frozenGames === null) {
      throw fail("frozen selection unavailable");
    }
    const selectedGames = frozen ? frozenGames : games.map((entry) => gameBody(entry, false));
    const diagnostics = [];
    for (const stored of slots.values()) {
      if (selectedGames.some((game) => deepEqual(game.checkpoint.pgn, stored.ref))) {
        continue;
      }
      diagnostics.push({
        gameId: stored.gameId, path: stored.path, artifactId: stored.artifactId,
        state: stored.accepted ? "previous-checkpoint" : "unacknowledged-diagnostic",
        storedRef: stored.ref === null ? null : copy(stored.ref),
      });
    }
    diagnostics.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    return freezeDeep(bound(copy({
      schemaVersion: 1, frozen, firstStopReason, freezeAtMonoNs,
      games: selectedGames, diagnostics,
    })));
  };
  return Object.freeze({ observePersisted, freeze, snapshot });
}
