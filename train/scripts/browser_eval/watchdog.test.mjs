// watchdog.test.mjs: external supervisor lifecycle over the actual
// fork-shaped IPC fixture and the REAL createProtocolValidator, real
// createPhaseRecorder/artifact-store/receipt readback, the SAME real
// staged cleanup controller bound into verifyCleanup, and the shared
// fake monotonic clock. Covers monitor-before-driver and
// hello/register/start/operation/finish order, begun.remainingMs, the
// operation event schema, bootstrap heartbeat supervision under a
// released registration gate, fault-path teardown while an owned
// fault-IO gate is held (exact IPC_INVALID), an interrupted partial
// monitor start and the once-submitted send — plus the WHOLE genuine
// selftest handshake positive-control case moved from
// watchdog-evidence-boundaries.test.mjs under the evidence partition.
// The pure N08 command-deadline case moved WHOLE to
// watchdog-boundaries.test.mjs and the two high-poll/rapid-finish
// resource cases plus the WHOLE genuine internalContext
// signal/configuration guard case moved WHOLE to
// watchdog-resource.test.mjs under the same capacity move (seven named
// cases remain local).
// The per-run setup/control helpers live in
// watchdog-run-test-fixtures.mjs. A synthetic unit pass is never
// Native or phase acceptance.
import test from "node:test";
import assert from "node:assert/strict";

import { identity } from "./supervision-test-fixtures.mjs";
import {
  makeEvidenceWorkspace,
  makePreflightRun,
  verifyReceipt,
} from "./watchdog-evidence-test-fixtures.mjs";
import { watchdogTestClock } from "./watchdog-test-fixtures.mjs";
import {
  FINISH,
  closeFacts,
  drain,
  heldGate,
  liveStart,
  row,
  setupRun,
  yieldTurn,
} from "./watchdog-run-test-fixtures.mjs";
import { registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

test("monitor before driver; hello/register/start/end/finish reach the real receipt", async (t) => {
  const { clk, env, driver, monitorCalls, journal, run } = await setupRun(t, {
    monitorScript: { knownRoots: { 6000: identity(6000), 6100: identity(6100) } },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  assert.equal(driver.written[0].type, "start");
  driver.emit({
    type: "register",
    requestId: "rq1",
    kind: "browser",
    rootPid: 6100,
    expectedExecutable: "/opt/chrome",
    listener: null,
  });
  driver.emit({ type: "begin", operationId: "op1", kind: "readiness" });
  driver.emit({ type: "heartbeat", operationId: "op1" });
  await yieldTurn();
  await yieldTurn();
  const types = driver.written.map((m) => m.type);
  assert.deepEqual(types.slice(0, 3), ["start", "registered", "begun"]);
  // The acknowledged readiness bound is the real remaining horizon.
  assert.equal(driver.written[2].remainingMs, 30000);
  driver.emit({
    type: "end",
    operationId: "op1",
    result: { status: "completed", evidencePaths: [], detail: {} },
  });
  await yieldTurn();
  driver.emit(FINISH("inconclusive", 2));
  closeFacts(driver);
  const res = await drain(clk, p);
  // The receipt-derived outcome, not the submitted intent.
  assert.equal(res.status, "inconclusive");
  assert.equal(res.exitCode, 2);
  assert.equal(res.stopReason, null); // normal finish carries the actual null reason
  // Ordering: one shared journal proves manifest-write -> monitor.start
  // -> running-write -> fork across owners — never inferred from two
  // separate logs or file existence afterward.
  assert.deepEqual(journal, ["manifest", "monitor.start", "running", "fork"]);
  assert.equal(monitorCalls[0], "monitor.start");
  assert.equal(driver.calls.length, 1);
  assert.ok((await env.readFile("check/manifest.json")).length > 0);
  const running = JSON.parse((await env.readFile("check/running.json")).toString());
  assert.equal(running.supervisor.pid, 7000);
  const lines = (await env.readFile("check/events.jsonl"))
    .toString()
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.ok(
    lines.some(
      (l) => l.kind === "operation" && l.payload.operationId === "op1",
    ),
  );
});

test("a once-submitted send(false) is never replayed", async (t) => {
  const { clk, driver, run } = await setupRun(t, {
    driverScript: { sendResult: false },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  assert.deepEqual(
    driver.written.map((m) => m.type),
    ["start"],
  );
  driver.emit(FINISH("inconclusive", 2));
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(driver.written.filter((m) => m.type === "start").length, 1);
});

test("bootstrap heartbeat supervision expires inside a released registration gate", async (t) => {
  const gate = heldGate();
  const { clk, driver, monitorCalls, run } = await setupRun(t, {
    monitorScript: {
      registerRoot: async () => gate.promise, // genuinely held until released
    },
  });
  try {
    const p = run();
    await driver.ready;
    driver.emit({ type: "hello" });
    clk.advance(50);
    await yieldTurn();
    // Registration is pending; the hello-live interval still expires.
    clk.advance(2100);
    await yieldTurn();
    closeFacts(driver);
    const res = await drain(clk, p);
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "HEARTBEAT_TIMEOUT");
    assert.ok(monitorCalls.includes("registerRoot:6000:driver"));
  } finally {
    gate.held = false;
    gate.release({ identity: identity(6000) });
  }
});

test("a validated poison envelope tears down while fault IO stays held", async (t) => {
  const gate = heldGate();
  let probes = 0;
  const { clk, env, driver, monitorCalls, run } = await setupRun(t, {
    monitorScript: {
      // The driver row stays live through the TERM/KILL stage probes and
      // is gone by the final proof — real staged signal progress is
      // observable while the fault append remains held.
      probe: () => {
        probes += 1;
        return probes <= 2 ? "same-live" : "gone";
      },
    },
    rows: [row(6000, 1, "driver", true, "R1")],
    faultGate: gate,
  });
  const p = run();
  try {
    await liveStart(clk, driver);
    // A duplicate hello is rejected by the real validator's hello-order
    // guard before any tuple comparison — the exact cause is IPC_INVALID.
    driver.emit({ type: "hello", commonIdentitySha256: "0".repeat(64) });
    await yieldTurn();
    await yieldTurn();
    // The REAL fault append was actually invoked and is held at the owned
    // gate — entered, not merely assumed pending.
    assert.equal(gate.entered, true);
    // The synchronous first-stop latched IPC_INVALID before the next
    // heartbeat deadline could satisfy a different stop: no further
    // driver admission and teardown already issued.
    assert.equal(driver.written.filter((m) => m.type === "start").length, 1);
    assert.ok(monitorCalls.includes("monitor.start"));
    // Staged native teardown makes real progress at the ORIGINAL offsets
    // while the fault append remains held — TERM then KILL on schedule.
    clk.advance(2000);
    await yieldTurn();
    await yieldTurn();
    assert.ok(monitorCalls.includes("signal:TERM:6000:1000:0:R1"));
    clk.advance(2000);
    await yieldTurn();
    await yieldTurn();
    assert.ok(monitorCalls.includes("signal:KILL:6000:1000:0:R1"));
    assert.ok(!monitorCalls.includes("stopAndReap"));
    // Releasing lets the held fault append land through the admitted
    // post-stop fault lane while teardown is still in flight.
    gate.held = false;
    gate.release();
    closeFacts(driver);
    const res = await drain(clk, p);
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "IPC_INVALID");
    assert.ok(monitorCalls.includes("stopAndReap"));
    const lines = (await env.readFile("check/events.jsonl"))
      .toString()
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.ok(lines.some((l) => l.kind === "fault"));
  } finally {
    // Every held gate is released, the real fake-child exit/BOTH-close
    // facts are supplied BEFORE the join, bounded stage timers are driven
    // and the run is joined even on assertion failure; the pending real
    // append then completes against owned files.
    if (gate.held) {
      gate.held = false;
      gate.release();
    }
    closeFacts(driver);
    await drain(clk, p, 30).catch(() => {});
  }
});

test("an interrupted monitor.start still reaches genuine teardown", async (t) => {
  const gate = heldGate();
  const { clk, driver, monitor, monitorCalls, w, run } = await setupRun(t, {
    monitorScript: {
      // The genuine start enters and is held at the owned gate — the stop
      // lands while the real dependency is pending, not merely after one
      // optimistic event-loop turn.
      startPromise: gate.promise,
      stopResult: { exitCode: 0, stdoutClosed: true, stderrClosed: true },
    },
  });
  // A PRIVATE entry tap on the genuine monitor.start settles the owned
  // entry receipt at the actual call — the SAME original
  // this/args/result/Promise/error and the existing retainer are
  // preserved through a direct apply, never a replacement body.
  let entered;
  const entry = new Promise((resolve) => {
    entered = resolve;
  });
  const monitorStart = monitor.start;
  monitor.start = function (...args) {
    entered();
    return monitorStart.apply(this, args);
  };
  let p = null;
  try {
    p = run();
    // Wait until monitor.start has ACTUALLY been entered and is pending
    // — real manifest IO completes first on ordinary event-loop turns.
    await entry;
    assert.ok(monitorCalls.includes("monitor.start"));
    // The synchronous REQUESTED stop lands while the genuine start is
    // still held; the SAME owned gate then releases BEFORE the actual
    // join so the pending real dependency can settle.
    w.requestStop("REQUESTED");
    gate.held = false;
    gate.release({ started: false });
    const res = await drain(clk, p);
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    // The genuine partial handles stop and reap under the original end —
    // never a fabricated tuple.
    assert.ok(monitorCalls.includes("stopAndReap"));
    assert.equal(driver.calls.length, 0); // driver never launched
  } finally {
    // The idempotent stop, the original gate release and the real
    // fake-child callbacks/exit/BOTH-close facts all land BEFORE the
    // bounded join — even when an earlier assertion failed.
    w.requestStop("REQUESTED");
    if (gate.held) {
      gate.held = false;
      gate.release({ started: false });
    }
    closeFacts(driver);
    // Drive the bounded stage timers through real turns so the joined
    // run's owned cleanup can actually settle before workspace removal.
    if (p !== null) await drain(clk, p, 30).catch(() => {});
  }
});

test("a stopped run never preserves a requested pass", async (t) => {
  const { clk, driver, w, run } = await setupRun(t, {
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  w.requestStop("REQUESTED");
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(res.exitCode, 2);
  assert.equal(res.stopReason, "REQUESTED");
});

test("the genuine selftest handshake produces a real verified completionRef", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { driver, monitorCalls, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
  });
  const opId = `${evidence.parentManifest.runId}:preflight-selftest`;
  // A transparent child.send observer settles the actual begun receipt
  // only AFTER the SAME original send admitted that outgoing type:begun
  // — same method/this/args/callback/result/error, never a replay or a
  // canned envelope — and rejects with the actual stop reason on an
  // outgoing type:stop, reporting a genuine failure, never latency.
  let settleBegun;
  const begunReceipt = new Promise((resolve, reject) => {
    settleBegun = { resolve, reject };
  });
  // Both outcomes are pre-observed so a rejection never floats
  // unhandled; the ORIGINAL receipt is awaited below, exact.
  begunReceipt.then(
    () => {},
    () => {},
  );
  const origSend = driver.child.send;
  // The restore preregisters with the SAME shared teardown owner BEFORE
  // the tap installs, returning the original method only after the
  // existing owned run/closure settles.
  registerFixtureTeardown(t, {
    release: () => {},
    settle: () => {},
    restore: () => {
      driver.child.send = origSend;
    },
  });
  driver.child.send = function (...args) {
    const admitted = origSend.apply(this, args);
    const outgoing = args[0];
    if (outgoing && outgoing.type === "stop") {
      settleBegun.reject(outgoing.stopReason);
    } else if (outgoing && outgoing.type === "begun") {
      settleBegun.resolve(outgoing);
    }
    return admitted;
  };
  const p = run();
  await liveStart(clk, driver);
  driver.emit({ type: "begin", operationId: opId, kind: "command" });
  // The REAL callback returns the genuine pre-produced ref and the real
  // verifyInternalSelfTest admits it — the begun receipt resolves on
  // the actual admitted send; racing the original run outcome reports
  // an impossible early run end instead of hanging.
  const earlyEnd = p.then((res) => {
    throw new Error(`run ended before begun admission: ${res.stopReason}`);
  });
  earlyEnd.catch(() => {}); // the race loser never floats unhandled
  await Promise.race([begunReceipt, earlyEnd]);
  assert.ok(
    monitorCalls.includes(`probe:${evidence.parentSupervisor.pid}:1000:0`),
  );
  const begun = driver.written.find((m) => m.type === "begun");
  assert.ok(begun !== undefined);
  driver.emit({
    type: "end",
    operationId: opId,
    result: { status: "completed", evidencePaths: [], detail: {} },
  });
  await yieldTurn();
  await yieldTurn();
  driver.emit({
    type: "finish",
    requestedStatus: "inconclusive",
    requestedExitCode: 2,
    stopReason: null,
    checks: [],
    summary: {},
    analysisEligible: false,
  });
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(res.exitCode, 2);
  // The genuine receipt verifies AGAIN through the real public verifier
  // over the same real root — the control is an actual ArtifactRef.
  const verified = await verifyReceipt({
    workspaceRoot: evidence.env.workspaceRoot,
    completionRef: evidence.selftestRef,
    expectedIdentity: evidence.commonIdentity,
  });
  assert.equal(verified.phase, "watchdog-selftest");
  assert.equal(verified.runId, `${evidence.parentManifest.runId}:watchdog-selftest`);
  // The caller's checks stayed empty: the REAL recorder itself derived
  // the four watchdog-selftest checks from the recorded request and the
  // proven cleanup proof — every one passed, never a supplied claim.
  assert.deepEqual(
    verified.final.requiredChecks.map((c) => c.id),
    [
      "injected-heartbeat-timeout",
      "zero-scored-games",
      "surviving-child-cleanup",
      "accounting-valid",
    ],
  );
  assert.ok(verified.final.requiredChecks.every((c) => c.status === "passed"));
  await dispose();
});
