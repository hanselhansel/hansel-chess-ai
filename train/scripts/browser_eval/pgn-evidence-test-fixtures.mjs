// TEST-only real Store/Recorder/PgnEvidence fixture. No Native/browser phase.
import { promises as fsp, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Chess } from "chess.js";
import { createArtifactStore } from "./artifact-store.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createPgnEvidence } from "./pgn-evidence.mjs";
import { checkpointResult, serializeCheckpointPgn } from "./pgn-format.mjs";
import { buildGameSchedule } from "./phase-fixtures.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createWatchdogRecordAdapter } from "./watchdog-records.mjs";
import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { fixtureWorkspace, fixtureManifest, fixtureRunning, ref, identity } from "./test-fixtures.mjs";
import { ownFixtureAttempt, registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

export const own = (t, thunk) => ownFixtureAttempt(t, thunk);
const now = () => Number(process.hrtime.bigint() / 1000000n);
export const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

export async function fixture(t, phase = "compare") {
  const root = realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-pgn-")));
  const lifetime = createWatchdogLifetime();
  const budget = createBudgetHandle({ deadlineMonoMs: now() + 90000, nowMonoMs: now, clock: { setTimeout, clearTimeout } });
  const footprint = createFootprintObserver({ workspaceRoot: root });
  let recorder;
  registerFixtureTeardown(t, {
    settle: () => recorder === undefined ? undefined : recorder.closeIncompleteEvidence(),
    afterSettle: () => lifetime.whenSettled(),
    restore: () => { budget.dispose(); footprint.stop(); },
    remove: () => fsp.rm(root, { recursive: true, force: true }),
  });
  const schedule = phase === "preflight" ? buildGameSchedule({ phase }) : buildGameSchedule({ phase,
    openings: JSON.parse(await own(t, () => fsp.readFile(new URL("../../fixtures/browser-openings.json", import.meta.url), "utf8"))) });
  const observer = createPgnEvidence({ workspaceRoot: root, runId: "R1", phase, gameSchedule: schedule }, { budget, lifetime });
  const store = createArtifactStore({ workspaceRoot: root, lifetime, monotonicNow: now, readFootprint: footprint.readFootprint });
  const workspace = fixtureWorkspace();
  await own(t, () => writeWorkspaceOnce({ store, workspace }));
  const prerequisites = (phase === "preflight" ? ["check", "parity"] : ["check", "parity", "preflight"]).map((phase) => ({ phase, runId: `fixture-${phase}`, completion: ref(`${phase}/completion.json`) }));
  const manifest = fixtureManifest({ workspace, phase, runId: "R1", prerequisites });
  recorder = createPhaseRecorder({
    store, workspace, manifest,
    verifyIdentity: async () => { throw new Error("unit fixture cannot verify a real phase"); },
    verifyCleanup: async () => { throw new Error("unit fixture has no Native proof"); },
  });
  recorder.bindRuntime({ lifetime, nowMonoMs: now });
  await own(t, () => recorder.writeManifest());
  await own(t, () => recorder.writeRunning(fixtureRunning({ manifest, supervisor: identity(7000) })));
  const faults = [];
  const adapter = createWatchdogRecordAdapter({
    recorder, pgnEvidence: observer, workspaceRoot: root, manifestRel: `${phase}/manifest.json`,
    commonIdentity: workspace.commonIdentity, phase, onObserverFault: (e) => faults.push(e),
    io: Object.freeze({ retainActual: lifetime.retainActual }),
  });
  let seq = 0;
  const nextMessage = (type, fields) => ({ type, recordId: `record-${seq}`, recordSeq: seq++, ...fields });
  const prepare = async (ordinal, extraMoves = [], gameIndex = 0) => {
    const game = schedule[gameIndex];
    const movesUci = [...game.movesUci, ...extraMoves];
    const board = new Chess(game.initialFen);
    for (const uci of movesUci) {
      board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
    }
    const result = checkpointResult(board);
    const bytes = serializeCheckpointPgn({ phase, game, movesUci, result });
    const slot = ordinal % 2 === 0 ? "a" : "b";
    const filename = `${phase}/games/${game.gameId}.${slot}.pgn`;
    const msg = nextMessage("artifact", { artifactId: `${game.gameId}-artifact-${ordinal}`, path: filename,
      mode: ordinal < 2 ? "append" : "replace", data: bytes.toString("base64"), last: true });
    const pgn = await own(t, () => adapter.persistArtifact(msg));
    const payload = { recordType: "pgn-checkpoint", gameId: game.gameId, pairNumber: game.pairNumber,
      gameNumber: game.gameNumber, openingId: game.openingId, candidateColor: game.candidateColor,
      checkpointId: `${game.gameId}-c${ordinal}`, previousCheckpointId: ordinal === 0 ? null : `${game.gameId}-c${ordinal - 1}`,
      ordinal, slot, plyCount: movesUci.length, initialFen: game.initialFen, fen: board.fen(), result, pgn };
    return { payload, message: nextMessage("event", { kind: "response", payload }), bytes };
  };
  const promote = async (ordinal, moves = [], gameIndex = 0) => {
    const data = await prepare(ordinal, moves, gameIndex);
    await own(t, () => adapter.persistEvent(data.message));
    return data;
  };
  return { root, lifetime, budget, observer, adapter, faults, prepare, promote, nextMessage, schedule };
}


// Real record queue and actual PGN validator; transport settlement is controlled.
export function operationHarness(t, f) {
  let stopped = false;
  const lines = [];
  const originalWrite = process.stderr.write;
  registerFixtureTeardown(t, { restore: () => { process.stderr.write = originalWrite; } });
  process.stderr.write = function (line, ...args) {
    if (String(line).startsWith("TINYAZ_COMPARE_PROGRESS ")) {
      lines.push(String(line));
      return true;
    }
    return originalWrite.call(this, line, ...args);
  };
  const ack = { send: async () => {} };
  let pending = null;
  const finish = () => pending?.resolve();
  const operations = createWatchdogOperations({ records: f.adapter, ctx: {
    phase: "compare", retainActual: f.lifetime.retainActual,
    stopped: () => stopped, admissionOpen: () => !stopped,
    workRemainingMs: () => 90000,
    send: async (...args) => {
      try { await ack.send(...args); } finally { finish(); }
    },
    recordFault: (error) => { f.faults.push(error); finish(); },
    requestStop: () => { stopped = true; },
  } });
  const record = async (message) => {
    if (stopped) return;
    pending = deferred();
    operations.dispatch(message);
    await pending.promise;
    await new Promise(setImmediate);
  };
  const stop = () => {
    stopped = true;
    operations.closeOrdinaryAdmission();
    f.adapter.freeze({ stopReason: "PHASE_TIMEOUT", atMonoNs: 5000000n });
  };
  return { operations, record, ack, stop, lines };
}

export async function terminalComparison(t, f, h, index = 0) {
  const board = new Chess(f.schedule[index].initialFen);
  for (const move of f.schedule[index].movesUci) {
    board.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
  }
  let loop = null;
  const quiet = (move) => move.piece !== "p" && !move.captured && !move.flags.includes("k") && !move.flags.includes("q");
  for (const white of board.moves({ verbose: true }).filter(quiet)) {
    const first = new Chess(board.fen());
    first.move(white);
    for (const black of first.moves({ verbose: true }).filter(quiet)) {
      const second = new Chess(first.fen());
      second.move(black);
      const reverseWhite = second.moves({ verbose: true }).find((m) => m.from === white.to && m.to === white.from);
      if (!reverseWhite) continue;
      second.move(reverseWhite);
      const reverseBlack = second.moves({ verbose: true }).find((m) => m.from === black.to && m.to === black.from);
      if (!reverseBlack) continue;
      second.move(reverseBlack);
      if (second.fen().split(" ").slice(0, 4).join(" ") !== board.fen().split(" ").slice(0, 4).join(" ")) continue;
      loop = [white, black, reverseWhite, reverseBlack].map((m) => `${m.from}${m.to}`);
      break;
    }
    if (loop) break;
  }
  if (!loop) throw new Error("test fixture has no reversible cycle");
  const cycle = [...loop, ...loop];
  for (let ordinal = 0; ordinal < cycle.length; ordinal += 1) {
    const data = await f.prepare(ordinal, cycle.slice(0, ordinal), index);
    await h.record(data.message);
  }
  return f.prepare(8, cycle, index);
}
