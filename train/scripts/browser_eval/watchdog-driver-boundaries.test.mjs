// watchdog-driver-boundaries.test.mjs: the declared TEST-ONLY
// physical driver-close boundary suite — the REAL createDriverChannel
// over the fork-shaped child fixture and the REAL
// createCleanupController settlement lane. It owns the WHOLE moved
// withheld-driver-close settlement case (actual exit plus stdout
// close while the stderr close stays owed — a destroyed-but-unclosed
// pipe is never physical close proof, retained pre-reap close facts
// already count, and a missing required pipe stays invalid/unproven
// under the real reap bound), the WHOLE moved staged-offsets cleanup
// case whose actual TERM+2000/KILL+4000 and retained driver
// exit+BOTH-close facts belong to the same physical-driver boundary,
// and the WHOLE moved pure N08 command-deadline case (full 90000 ms
// horizon, fresh 500 ms heartbeats with a real event-loop turn at
// every held-clock checkpoint, the actual stop send instant captured
// on the same fake clock through the genuine child send path, actual
// OPERATION_TIMEOUT — never a real-90-second Native test) from
// watchdog-boundaries.test.mjs.
// No real process, boolean reap stub, synthetic close fact or proof
// setter; a synthetic unit pass is never Native or phase acceptance.
import test from "node:test";
import assert from "node:assert/strict";

import {
  createDriverActualScope,
  createDriverChannel,
  finishDriverActualScope,
} from "./watchdog-driver.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { watchdogTestClock } from "./watchdog-test-fixtures.mjs";
import {
  OBS,
  ROWS,
  advanceBy,
  closeDriverFacts,
  drive,
  drivers,
  fixture,
  makeArgs,
  row,
} from "./watchdog-cleanup-test-fixtures.mjs";
import { yieldTurn } from "./watchdog-drain-test-fixtures.mjs";
import {
  closeFacts,
  drain,
  liveStart,
  setupRun,
} from "./watchdog-run-test-fixtures.mjs";
import {
  createObservedDriver,
  forkDriverFixture,
} from "./watchdog-child-test-fixtures.mjs";

test("driver settlement with a withheld handle close stays unproven until it settles", async () => {
  const rows = ROWS.concat(row(13, 10, "driver", true, "R1:watchdog-selftest"));
  const { clk, calls, cc, lifetime } = fixture(rows, {
    observation: OBS,
    probeDefault: "gone",
    listeners: {
      R1: { listeners: [], unexpected: [] },
      "R1:watchdog-selftest": { listeners: [], unexpected: [] },
    },
    stopResult: { exitCode: 0 },
  });
  // A REAL observed channel for the included nested driver: the genuine
  // fake child's exit and stdout close land while only the stderr close
  // is withheld — an actual physical debt through the real channel, so
  // a destroyed-but-unclosed pipe can never be mistaken for settlement.
  const driverMap = drivers(clk, { nested: { pid: 13 } }, {
    retainActual: lifetime.retainActual,
  });
  const nested = driverMap.get("nested");
  nested.driver.exit(0);
  nested.driver.closeOut();
  // The withheld pipe is a destroy request only — destroyed:true with
  // closed:false stays OWED: the channel's real retained close flag
  // never flips until the actual close event lands.
  nested.driver.child.stderr.destroyed = true;
  let p = null;
  try {
    p = cc.run(makeArgs(clk, driverMap));
    // Settlement follows the fixed +4000 KILL stage — advance PAST it
    // (+4250, before the inner +4500 proof fence) and flush real
    // turns until the genuine reap was actually ENTERED.
    await advanceBy(clk, 8);
    clk.advance(250);
    await yieldTurn();
    for (let i = 0; i < 20 && nested.channel.closedByUs !== true; i += 1) {
      await yieldTurn();
    }
    assert.equal(nested.channel.closedByUs, true);
    assert.ok(!calls.includes("stopAndReap")); // withheld close: no reap yet
    // The actual stderr close lands: the retained observation settles
    // the real reap and only then may the collector-last proceed.
    nested.driver.closeErr();
    const proof = await drive(clk, p);
    assert.ok(calls.includes("stopAndReap"));
    assert.equal(proof.verified, true);
  } finally {
    // Even on failure the withheld fact is supplied before the join.
    nested.driver.closeErr();
    if (p !== null) await p.catch(() => {});
    await finishDriverActualScope(nested.actualScope);
    await lifetime.whenSettled();
  }
});

test("retained close facts observed before the first reap already count", async () => {
  const clk = watchdogTestClock();
  const owner = createWatchdogLifetime();
  const actualScope = createDriverActualScope({
    retainActual: owner.retainActual,
    runId: "R1",
  });
  const { driver, channel } = createObservedDriver({
    clock: clk,
    runId: "R1",
    pid: 6000,
    commonIdentitySha256: "0".repeat(64),
    retainActual: owner.retainActual,
    actualScope,
  });
  try {
    // The genuine exit and BOTH real pipe closes land BEFORE the channel
    // is ever asked to settle — the real retained observations satisfy
    // the first reap with no clock advance at all, never a second wait.
    driver.exit(0);
    driver.closeOut();
    driver.closeErr();
    const reaped = await channel.reap(50);
    assert.equal(channel.closedByUs, true);
    assert.deepEqual(reaped, { exitCode: 0, signalCode: null });
  } finally {
    // The genuine release at the outer boundary: every actual send
    // callback plus the exit and BOTH real pipe-close facts are
    // supplied BEFORE the SAME owned scope joins, then the owner's
    // fresh whenSettled observes the genuine zero.
    closeDriverFacts({ driver });
    await finishDriverActualScope(actualScope);
    await owner.whenSettled();
  }
});

test("a destroyed but unclosed required pipe stays owed at the real reap bound", async () => {
  const clk = watchdogTestClock();
  const owner = createWatchdogLifetime();
  const actualScope = createDriverActualScope({
    retainActual: owner.retainActual,
    runId: "R1",
  });
  const { driver, channel } = createObservedDriver({
    clock: clk,
    runId: "R1",
    pid: 6000,
    commonIdentitySha256: "0".repeat(64),
    retainActual: owner.retainActual,
    actualScope,
  });
  driver.exit(0);
  driver.closeOut();
  // A destroy request is not physical close proof: destroyed:true with
  // closed:false leaves the required stderr close OWED — the actual
  // reap timer expiry rejects unproven rather than settling early.
  driver.child.stderr.destroyed = true;
  const rq = channel.reap(1000);
  try {
    const guard = assert.rejects(rq, /CLEANUP_UNPROVEN/);
    clk.advance(1000);
    await guard;
    // A subsequent actual close can never rewrite the expired bound.
    driver.closeErr();
    await assert.rejects(rq, /CLEANUP_UNPROVEN/);
  } finally {
    // On assertion SUCCESS or FAILURE the actual held stderr close is
    // always supplied — exit plus BOTH pipe-close facts are then
    // complete — BEFORE the original reap body is joined. The caller's
    // expected rejection stays its own separate outcome, never counted
    // as physical close; a fake child holds no real OS descriptor.
    driver.closeErr();
    await rq.catch(() => {});
    await finishDriverActualScope(actualScope);
    await owner.whenSettled();
  }
});

test("a missing required pipe stays invalid and unproven at the real reap bound", async () => {
  const clk = watchdogTestClock();
  const driver = forkDriverFixture({
    runId: "R1",
    phase: "check",
    commonIdentitySha256: "0".repeat(64),
    pid: 6000,
  });
  // The stderr pipe is ABSENT before the channel is constructed — a
  // missing required pipe is an invalid fact, never positive absence:
  // no listener is attached and no retained flag can ever flip.
  driver.child.stderr = null;
  const errors = [];
  // The absent required pipe leaves the channel's physical receipt
  // UNKNOWN forever — the synthetic fake child holds no real OS FD, so
  // this isolated owner's hold is the explicit createHold spy returning
  // a bare release, never a real hold timer parked on unprovable debt.
  const holdSpy = () => () => {};
  const owner = createWatchdogLifetime({ createHold: holdSpy });
  const actualScope = createDriverActualScope({
    retainActual: owner.retainActual,
    runId: "R1",
  });
  const channel = createDriverChannel({
    entry: "/drv/driver.js",
    args: [],
    cwd: "/drv",
    execPath: "/drv/node",
    protocol: createProtocolValidator({ runId: "R1" }),
    runId: "R1",
    clock: clk,
    forkImpl: driver.forkImpl,
    onMessage: () => {},
    onError: (error) => errors.push(error),
    retainActual: owner.retainActual,
    actualScope,
  });
  driver.exit(0);
  driver.closeOut();
  // The actual reap's own remaining budget bounds the wait: at the
  // real timer expiry the absent pipe keeps settlement unproven —
  // never closed by a synthetic fact or an arbitrary clock window.
  const rq = channel.reap(1000);
  const guard = assert.rejects(rq, /CLEANUP_UNPROVEN/);
  clk.advance(1000);
  await guard;
});

test("staged offsets anchor to the ORIGINAL captured start under delayed IO", async () => {
  // The intended tuples stay LIVE until the real TERM/KILL signal removes
  // them — a gone tuple must never be signalled, and a TERM alone never
  // deletes one: the live set survives TERM so the genuine KILL stage is
  // actually observed rather than skipped as already gone.
  const live = new Set([10, 11, 12]);
  let resolveTermEntered;
  const termEntered = new Promise((r) => {
    resolveTermEntered = r;
  });
  const { clk, calls, cc, lifetime } = fixture(ROWS, {
    observation: OBS,
    probe: (i) => (live.has(i.pid) ? "same-live" : "gone"),
    onSignal: ({ signal, identity: idArg }) => {
      if (signal === "TERM") resolveTermEntered();
      if (signal === "KILL") live.delete(idArg.pid);
    },
    signalResult: "sent",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const t0 = clk.nowMonoMs();
  // run() began 1500ms after the real cleanup entry: TERM is due at the
  // ORIGINAL +2000 (t0+500), never +2000 from this call. The driver
  // handle still settles through its REAL observed channel.
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const p = cc.run(
    makeArgs(clk, driverMap, { cleanupStartMonoMs: t0 - 1500 }),
  );
  clk.jumpWithoutTimers(499);
  clk.runDue();
  await Promise.resolve();
  assert.ok(!calls.some((c) => c.startsWith("signal:")));
  clk.jumpWithoutTimers(1);
  clk.runDue();
  // The awaited receipt is the ACTUAL TERM signal-admission callback at
  // the ORIGINAL +2000 bound on the SAME held clock — no extra elapsed
  // advance, no arbitrary microtask count, no new time.
  await termEntered;
  assert.ok(calls.some((c) => c.startsWith("signal:TERM")));
  const proof = await drive(clk, p);
  // Targets survived TERM, so the KILL stage genuinely fired too.
  assert.ok(calls.some((c) => c.startsWith("signal:KILL")));
  assert.equal(proof.verified, true);
});

test("a command operation with fresh heartbeats expires at its original deadline", async (t) => {
  const { clk, driver, run } = await setupRun(t, {
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  // Outbound s2d envelopes are observed through the channel's ACTUAL
  // driver.written — real validator-accepted envelopes carrying their
  // own operationId/recordId fields, never timestamp-only rows missing
  // the operation identity. A transparent tap on the genuine fake
  // child's real send path records the SAME-clock instant the stop
  // envelope is actually submitted — this/args/arity-2 preserved, the
  // original result returned, the identical callback forwarded and
  // exactly one submission — never a second send or a wire stub.
  let stopSentAt = null;
  const origSend = driver.child.send;
  driver.child.send = function (msg, cb) {
    if (msg !== null && typeof msg === "object" && msg.type === "stop") {
      stopSentAt = clk.nowMonoMs();
    }
    return origSend.call(this, msg, cb);
  };
  const p = run();
  await liveStart(clk, driver);
  // The original command start is captured while the clock is held —
  // the armed deadline is exactly this instant + 90000.
  const beginAt = clk.nowMonoMs();
  driver.emit({ type: "begin", operationId: "op1", kind: "command" });
  await yieldTurn();
  await yieldTurn();
  const begun = driver.written.find((m) => m.type === "begun");
  assert.equal(begun.operationId, "op1");
  assert.equal(begun.remainingMs, 90000);
  const boundAt = beginAt + 90000;
  // Valid main-loop heartbeat every 500 injected ms through the full
  // 90000 ms command deadline — the freshness guard never trips and no
  // stop arrives at ANY earlier 500 ms tick. A REAL event-loop turn at
  // every held-clock checkpoint runs BEFORE the no-stop check, so an
  // early-latched timeout can never hide inside an unflushed interval.
  for (let i = 1; i < 180; i += 1) {
    clk.advance(500);
    driver.emit({ type: "heartbeat", operationId: "op1" });
    await yieldTurn();
    await yieldTurn();
    assert.ok(clk.nowMonoMs() < boundAt);
    assert.ok(!driver.written.some((m) => m.type === "stop"));
  }
  // The final tick lands exactly on the original bound: the heartbeat
  // is still fresh and the actual deadline timer fires there — never
  // an early 89000 stop or a late 91000 substitute. The REAL stop
  // envelope is first observable only now, at the held bound instant.
  clk.advance(500);
  driver.emit({ type: "heartbeat", operationId: "op1" });
  await yieldTurn();
  await yieldTurn();
  assert.equal(clk.nowMonoMs(), boundAt);
  const stop = driver.written.find((m) => m.type === "stop");
  assert.ok(stop !== undefined);
  assert.equal(stop.stopReason, "OPERATION_TIMEOUT");
  // The ACTUAL same-clock send instant of that stop envelope is exactly
  // the original begin + 90000 — observed through the real child send
  // path, never inferred from the final clock value alone.
  assert.equal(stopSentAt, boundAt);
  // Otherwise-VALID closed-shape late frames — heartbeat, event,
  // artifact, a fresh begin and an attempted passed finish — never
  // revive record, ack, pass or admission lanes after the original
  // stop: no recorded ack, no new begun, no second stop and no fresh
  // s2d envelope at all. Only the graceful closed marker is wire-legal
  // after stop; the finish is equally rejected post-stop, which is the
  // guard under test.
  const writtenAt = driver.written.length;
  driver.emit({ type: "heartbeat", operationId: "op1" });
  driver.emit({
    type: "event",
    recordId: "e1",
    recordSeq: 0,
    kind: "operation",
    payload: { operationId: "op1", result: { status: "completed" } },
  });
  driver.emit({
    type: "artifact",
    recordId: "a1",
    recordSeq: 1,
    artifactId: "late-art",
    path: "check/late.bin",
    mode: "append",
    encoding: "base64",
    data: Buffer.from("late").toString("base64"),
    last: true,
  });
  driver.emit({ type: "begin", operationId: "op2", kind: "readiness" });
  driver.emit({
    type: "finish",
    requestedStatus: "passed",
    requestedExitCode: 0,
    stopReason: null,
    checks: [],
    summary: {},
    analysisEligible: true,
  });
  await yieldTurn();
  await yieldTurn();
  assert.equal(driver.written.length, writtenAt);
  assert.equal(driver.written.filter((m) => m.type === "stop").length, 1);
  assert.ok(
    !driver.written.some((m) => m.type === "begun" && m.operationId === "op2"),
  );
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(res.exitCode, 2);
  assert.equal(res.stopReason, "OPERATION_TIMEOUT");
});
