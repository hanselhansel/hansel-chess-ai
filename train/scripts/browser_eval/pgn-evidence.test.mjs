// Actual Recorder/Store PGNs with read-only supervisor selection. All
// Native/identity fixtures are data only; no phase is finalized as passed.
import assert from "node:assert/strict";
import { promises as fsp, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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

const own = (t, thunk) => ownFixtureAttempt(t, thunk);
const now = () => Number(process.hrtime.bigint() / 1000000n);
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

async function fixture(t, phase = "compare") {
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

test("actual close alone is diagnostic; persisted event selects canonical full-history PGN", async (t) => {
  const f = await fixture(t);
  const zero = await f.prepare(0);
  assert.equal(f.observer.snapshot().games.length, 0);
  assert.equal(f.observer.snapshot().diagnostics[0].state, "unacknowledged-diagnostic");
  await own(t, () => f.adapter.persistEvent(zero.message));
  const game = f.observer.snapshot().games[0];
  assert.equal(game.checkpoint.checkpointId, "p01-g1-c0");
  assert.equal(game.state, "in-progress");
  assert.equal(game.result, "*");
  assert.equal(Object.hasOwn(game.checkpoint, "result"), false);
  assert.equal(Object.isFrozen(game.checkpoint.pgn), true);
  assert.equal(f.faults.length, 0);
});

test("two slots alternate append/append/replace/replace with distinct closed refs", async (t) => {
  const f = await fixture(t);
  const moves = [[], ["b5a4"], ["b5a4", "g8f6"], ["b5a4", "g8f6", "e1g1"]];
  const refs = [];
  for (let ordinal = 0; ordinal < moves.length; ordinal += 1) {
    const data = await f.promote(ordinal, moves[ordinal]);
    refs.push(data.payload.pgn);
    assert.equal(f.observer.snapshot().games[0].checkpoint.slot, ordinal % 2 === 0 ? "a" : "b");
  }
  assert.equal(refs[0].path, refs[2].path);
  assert.notEqual(refs[0].sha256, refs[2].sha256);
  assert.equal(f.observer.snapshot().diagnostics.length, 1);
  assert.equal(f.observer.snapshot().diagnostics[0].state, "previous-checkpoint");
});

for (const field of ["candidateColor", "fen", "result", "previousCheckpointId"]) {
  test(`persisted wrong checkpoint ${field} never promotes`, async (t) => {
    const f = await fixture(t);
    const zero = await f.prepare(0);
    zero.message.payload = { ...zero.payload, [field]: field === "result" ? "1-0" : "wrong" };
    await assert.rejects(own(t, () => f.adapter.persistEvent(zero.message)));
    assert.equal(f.observer.snapshot().games.length, 0);
    assert.equal(f.faults.length, 1);
  });
}

test("held actual persisted event cannot ACK or promote after independent first stop", async (t) => {
  const f = await fixture(t);
  const zero = await f.promote(0);
  const next = await f.prepare(1, ["b5a4"]);
  const entered = deferred();
  const gate = deferred();
  const originalStat = fsp.lstat;
  const selected = path.join(f.root, next.payload.pgn.path);
  registerFixtureTeardown(t, { release: () => gate.resolve(), restore: () => { fsp.lstat = originalStat; } });
  fsp.lstat = async function (filename, ...args) {
    if (filename === selected) {
      entered.resolve();
      await gate.promise;
    }
    return originalStat.call(this, filename, ...args);
  };
  let stopped = false;
  let heartbeat = 0;
  const acknowledgments = [];
  const operations = createWatchdogOperations({ records: f.adapter, ctx: {
    phase: "compare", retainActual: f.lifetime.retainActual,
    stopped: () => stopped, admissionOpen: () => !stopped,
    workRemainingMs: () => 90000,
    send: async (type, fields) => { acknowledgments.push({ type, fields }); },
    noteHeartbeat: () => { heartbeat += 1; },
    recordFault: (error) => f.faults.push(error),
    requestStop: () => { stopped = true; },
  } });
  operations.dispatch(next.message);
  await entered.promise;
  operations.dispatch({ type: "heartbeat" });
  assert.equal(heartbeat, 1);
  stopped = true;
  operations.closeOrdinaryAdmission();
  f.adapter.freeze({ stopReason: "HEARTBEAT_TIMEOUT", atMonoNs: 5000000n });
  f.adapter.freeze({ stopReason: "LATE_REASON", atMonoNs: 6000000n });
  assert.deepEqual(f.observer.snapshot().games[0].checkpoint.pgn, zero.payload.pgn);
  gate.resolve();
  await operations.whenOrdinarySettled();
  assert.equal(acknowledgments.length, 0);
  const body = f.observer.snapshot();
  assert.equal(body.firstStopReason, "HEARTBEAT_TIMEOUT");
  assert.equal(body.games[0].state, "incomplete");
  assert.equal(body.games[0].result, "*");
  assert.equal(body.games[0].checkpoint.ordinal, 0);
  assert.equal(body.diagnostics[0].state, "unacknowledged-diagnostic");
  await own(t, () => f.adapter.stopOrdinary());
  await own(t, () => f.adapter.gameStopAssociation());
  const events = (await own(t, () => fsp.readFile(path.join(f.root, "compare/events.jsonl"), "utf8"))).trim().split("\n").map(JSON.parse);
  const association = events.find((event) => event.payload.recordType === "game-stop").payload;
  assert.equal(association.stopReason, "HEARTBEAT_TIMEOUT");
  assert.deepEqual(association.pgn, zero.payload.pgn);
});

for (const malformed of [{ artifactId: "" }, { last: "true" }]) {
  test(`closed-ref metadata rejects ${Object.keys(malformed)[0]} before accepting a slot`, async (t) => {
    const f = await fixture(t);
    const zero = await f.prepare(0);
    const independent = createPgnEvidence({ workspaceRoot: f.root, runId: "R1", phase: "compare", gameSchedule: f.schedule },
      { budget: f.budget, lifetime: f.lifetime });
    await assert.rejects(own(t, () => independent.observePersisted({
      type: "artifact", recordId: "bad-closed", recordSeq: 0, artifactId: "fresh",
      path: zero.payload.pgn.path, mode: "append", last: true, ref: zero.payload.pgn, ...malformed,
    })), /actual closed ref/);
    assert.equal(independent.snapshot().diagnostics.length, 0);
  });
}

test("supervisor intent drops driver inference before any actual cleanup", async (t) => {
  const f = await fixture(t);
  const intent = f.adapter.composeIntent({
    finishReq: { requestedStatus: "passed", analysisEligible: true,
      summary: { pairedAnalysis: { pValue: 0.001 }, pValue: 0.001, elo: 3000, rawMeasurement: 7 } },
    stopReq: null, faultCount: () => 0,
  });
  assert.equal(Object.hasOwn(intent.summary, "pairedAnalysis"), false);
  assert.equal(Object.hasOwn(intent.summary, "pValue"), false);
  assert.equal(Object.hasOwn(intent.summary, "elo"), false);
  assert.equal(intent.summary.rawMeasurement, 7);
});

test("actual ordered A/A terminal PGNs freeze as two complete draws", async (t) => {
  const f = await fixture(t, "preflight");
  for (const index of [0, 1]) {
    await f.promote(0, [], index);
    await f.promote(1, ["b1b2"], index);
  }
  f.adapter.freeze({ stopReason: null, atMonoNs: 10000000n });
  const body = f.observer.snapshot();
  assert.equal(body.frozen, true);
  assert.equal(body.firstStopReason, null);
  assert.deepEqual(body.games.map((game) => game.gameId), ["aa-g1", "aa-g2"]);
  assert.deepEqual(body.games.map((game) => game.state), ["complete", "complete"]);
  assert.deepEqual(body.games.map((game) => game.result), ["1/2-1/2", "1/2-1/2"]);
  assert.deepEqual(body.games.map((game) => game.stopReason), [null, null]);
});

test("actual PGN growth beyond the inspection cap rejects before promotion", async (t) => {
  const f = await fixture(t);
  const zero = await f.prepare(0);
  await own(t, () => fsp.writeFile(path.join(f.root, zero.payload.pgn.path), Buffer.alloc(1048577, 32)));
  await assert.rejects(own(t, () => f.adapter.persistEvent(zero.message)), /bounds/);
  assert.equal(f.observer.snapshot().games.length, 0);
});

test("prewrite guard preserves the selected actual PGN and ref", async (t) => {
  const f = await fixture(t);
  const zero = await f.promote(0);
  const filename = path.join(f.root, zero.payload.pgn.path);
  const before = await own(t, () => fsp.readFile(filename));
  const attempt = f.nextMessage("artifact", { artifactId: "forbidden-current-replacement",
    path: zero.payload.pgn.path, mode: "replace", data: Buffer.from("destroyed").toString("base64"), last: true });
  await assert.rejects(own(t, () => f.adapter.persistArtifact(attempt)), /write targets selected checkpoint/);
  assert.deepEqual(await own(t, () => fsp.readFile(filename)), before);
  assert.deepEqual(f.observer.snapshot().games[0].checkpoint.pgn, zero.payload.pgn);
  await assert.rejects(own(t, () => f.adapter.persistArtifact({ ...attempt,
    artifactId: "forbidden-case-alias", path: attempt.path.replace("p01", "P01"),
  })), /noncanonical PGN path/);
  assert.deepEqual(await own(t, () => fsp.readFile(filename)), before);
});
