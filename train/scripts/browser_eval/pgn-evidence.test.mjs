// Actual PGN persistence, selection and ACK regressions. No Native/browser phase.
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createPgnEvidence } from "./pgn-evidence.mjs";
import { createWatchdogOperations } from "./watchdog-operations.mjs";
import { registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";
import { fixture, own, deferred, operationHarness, terminalComparison } from "./pgn-evidence-test-fixtures.mjs";

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


test("count progress follows actual validated terminal checkpoint and successful ACK", async (t) => {
  const f = await fixture(t);
  const h = operationHarness(t, f);
  const terminal = await terminalComparison(t, f, h);
  assert.equal(h.lines.length, 0); // partial PGNs and close alone cannot count
  const entered = deferred();
  const release = deferred();
  registerFixtureTeardown(t, { release: () => release.resolve() });
  h.ack.send = async (type) => { assert.equal(type, "recorded"); entered.resolve(); await release.promise; };
  h.operations.dispatch(terminal.message);
  await entered.promise;
  assert.equal(f.observer.snapshot().games[0].state, "complete");
  assert.equal(h.lines.length, 0); // validation without ACK settlement cannot count
  release.resolve();
  await new Promise(setImmediate);
  assert.equal(h.lines[0], 'TINYAZ_COMPARE_PROGRESS {"completedGames":1,"completedPairs":0}\n');
  h.ack.send = async () => {};
  const second = await terminalComparison(t, f, h, 1);
  await h.record(second.message);
  assert.equal(h.lines[1], 'TINYAZ_COMPARE_PROGRESS {"completedGames":2,"completedPairs":1}\n');
  assert.ok(h.lines.every((line) => Buffer.byteLength(line) <= 256));
  // Re-ACK of the same record must not emit a duplicate completion.
  await h.record(second.message);
  assert.equal(h.lines.length, 2);
});

for (const boundary of ["failed-ack", "stop-during-ack", "freeze-during-ack", "stop-before-validation", "invalid-terminal"]) {
  test(`count progress excludes ${boundary}`, async (t) => {
    const f = await fixture(t);
    const h = operationHarness(t, f);
    const terminal = await terminalComparison(t, f, h);
    if (boundary === "failed-ack") h.ack.send = async () => { throw new Error("actual ACK failure"); };
    if (boundary === "stop-during-ack") h.ack.send = async () => { h.stop(); };
    if (boundary === "freeze-during-ack") h.ack.send = async () => {
      f.adapter.freeze({ stopReason: "PHASE_TIMEOUT", atMonoNs: 5000000n });
    };
    if (boundary === "stop-before-validation") h.stop();
    if (boundary === "invalid-terminal") terminal.message.payload.fen = "forged";
    await h.record(terminal.message);
    assert.equal(h.lines.length, 0);
    assert.equal(f.faults.length, boundary === "invalid-terminal" ? 2 : boundary === "failed-ack" ? 1 : 0);
  });
}

for (const failure of ["throw", "callback"]) {
  test(`progress sink ${failure} failure preserves selected evidence and ordinary admission`, async (t) => {
    const f = await fixture(t);
    const h = operationHarness(t, f);
    const terminal = await terminalComparison(t, f, h);
    const originalWrite = process.stderr.write;
    registerFixtureTeardown(t, { restore: () => { process.stderr.write = originalWrite; } });
    process.stderr.write = function (line, callback) {
      if (!String(line).startsWith("TINYAZ_COMPARE_PROGRESS ")) return originalWrite.call(this, line, callback);
      if (failure === "throw") throw new Error("diagnostic sink unavailable");
      callback(new Error("diagnostic write failed"));
      return false;
    };
    await h.record(terminal.message);
    assert.equal(f.observer.snapshot().games[0].state, "complete");
    assert.equal(f.faults.length, 0);
    process.stderr.write = originalWrite;
    const second = await terminalComparison(t, f, h, 1);
    await h.record(second.message);
    assert.equal(h.lines[0], 'TINYAZ_COMPARE_PROGRESS {"completedGames":2,"completedPairs":1}\n');
    assert.equal(f.faults.length, 0);
  });
}


test("all forty rules-validated terminal ACKs yield bounded counts through twenty pairs", async (t) => {
  const f = await fixture(t);
  const h = operationHarness(t, f);
  for (let index = 0; index < 40; index += 1) {
    const terminal = await terminalComparison(t, f, h, index);
    await h.record(terminal.message);
  }
  assert.equal(h.lines.length, 40);
  assert.equal(h.lines.at(-1), 'TINYAZ_COMPARE_PROGRESS {"completedGames":40,"completedPairs":20}\n');
  assert.ok(h.lines.every((line) => Buffer.byteLength(line) <= 256));
  assert.equal(f.faults.length, 0);
  f.adapter.freeze({ stopReason: null, atMonoNs: 10000000n });
  assert.equal(f.observer.snapshot().games.filter((game) => game.state === "complete").length, 40);
});

test("late terminal PGN read after first stop stays diagnostic with no ACK or progress", async (t) => {
  const f = await fixture(t);
  const h = operationHarness(t, f);
  const terminal = await terminalComparison(t, f, h);
  const entered = deferred();
  const release = deferred();
  const originalStat = fsp.lstat;
  registerFixtureTeardown(t, { release: () => release.resolve(), restore: () => { fsp.lstat = originalStat; } });
  fsp.lstat = async function (filename, ...args) {
    if (filename === path.join(f.root, terminal.payload.pgn.path)) {
      entered.resolve();
      await release.promise;
    }
    return originalStat.call(this, filename, ...args);
  };
  let ackCount = 0;
  h.ack.send = async () => { ackCount += 1; };
  h.operations.dispatch(terminal.message);
  await entered.promise;
  h.stop();
  release.resolve();
  await h.operations.whenOrdinarySettled();
  const body = f.observer.snapshot();
  assert.equal(body.games[0].state, "incomplete");
  assert.equal(body.games[0].checkpoint.ordinal, 7);
  assert.equal(ackCount, 0);
  assert.equal(h.lines.length, 0);
  assert.equal(f.faults.length, 0);
});
