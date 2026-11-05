// watchdog-evidence-boundaries.test.mjs: the genuine-evidence boundary
// suite. Every CommonIdentity, ArtifactRef, owner, receipt byte and
// verification comes from the REAL fixture workspace/store/records and
// the actual verifyInternalSelfTest/verifyReceipt implementations. The
// retained guard regressions: a first stop while the injected trusted
// callback is genuinely held cancels post-callback admission on the
// real AbortSignal/recheck lane with ZERO additional selected
// receipt-path metadata admission afterward, a stop while the
// genuine receipt read is held leaves the post-IO Native probe
// undispatched past closed admission or the captured bound, a spent
// partial start performs no fresh monitor/Native work after the
// original end, and pending/failed
// genuine FIRST running-write bodies take the real incomplete drain
// with no fabricated final/completion/seal (released real running
// bytes may exist). The WHOLE genuine handshake positive control moved
// to watchdog.test.mjs and the WHOLE selftestEvidence bound case moved
// to watchdog-selftest-evidence.test.mjs under the evidence partition.
// Held gates, the fake-child close facts and owned roots all settle
// through the one per-test teardown owner — even on assertion failure.
// A synthetic unit pass is never Native, phase or cleanup acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";

import {
  gateFs,
  makeEvidenceWorkspace,
  makePreflightRun,
  verifyReceipt,
} from "./watchdog-evidence-test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { ownFixtureAttempt } from "./watchdog-fs-test-fixtures.mjs";
import { watchdogTestClock } from "./watchdog-test-fixtures.mjs";
import {
  closeFacts as closeAll,
  drain as drainRun,
  heldGate,
  liveStart,
  yieldTurn,
} from "./watchdog-run-test-fixtures.mjs";
import {
  observeSelectedReceiptMetadata,
  registerFixtureTeardown,
} from "./watchdog-teardown-test-fixtures.mjs";

const yield2 = async () => {
  await yieldTurn();
  await yieldTurn();
};

// Waits on the truthful gate-entered channel across bounded real
// turns — entered resolves on actual entry, never a periodic poll;
// the neutral receipt keeps both outcome handlers so a rejected
// original entry floats no discarded descendant, and awaiting the
// original entered still throws the original error.
const awaitEntered = async (gate) => {
  let saw = false;
  void gate.entered.then(
    () => {
      saw = true;
    },
    () => {},
  );
  for (let i = 0; i < 60 && !saw; i += 1) await yield2();
  await gate.entered;
};

test("a first stop during the trusted callback cancels post-callback admission", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  // The selected-metadata observer is registered and installed BEFORE
  // the run may ever invoke the verifier — the ZERO ADDITIONAL count
  // below is an actual observed verdict on the genuine earliest
  // receipt-path admission, never a completion-read or all-IO proof.
  const seen = observeSelectedReceiptMetadata(
    t,
    evidence.env.workspaceRoot,
    evidence.selftestRef.path,
  );
  // The genuine evidence-only positive control: the REAL verifyReceipt
  // over the actual selftestRef/CommonIdentity through the SAME frozen
  // owner io proves the observer admits the real selected path — and
  // it dispatches NO Native probe.
  const owner = artifactStoreLifetime(evidence.env.store);
  const io = Object.freeze({ retainActual: owner.retainActual });
  await verifyReceipt(
    {
      workspaceRoot: evidence.env.workspaceRoot,
      completionRef: evidence.selftestRef,
      expectedIdentity: evidence.commonIdentity,
    },
    io,
  );
  assert.ok(seen.admissions > 0);
  const baseline = seen.admissions;
  const gate = heldGate();
  // The injected trusted callback passes through UNCHANGED — its own
  // function preregisters the actual body through ownFixtureAttempt
  // BEFORE the held effect — and it is genuinely held on an owned gate
  // so the first-stop latch and the real AbortSignal fire while the
  // callback is still in flight; its eventual genuine ref meets the
  // post-callback recheck, never admission.
  let callbackEntered = false;
  const { driver, monitorCalls, w, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
    runInternalSelfTest: (context) =>
      ownFixtureAttempt(t, async () => {
        callbackEntered = true;
        await gate.promise;
        return { completionRef: evidence.selftestRef };
      }),
  });
  let p = null;
  try {
    p = run();
    await liveStart(clk, driver);
    driver.emit({
      type: "begin",
      operationId: `${evidence.parentManifest.runId}:preflight-selftest`,
      kind: "command",
    });
    // Wait for the ACTUAL trusted callback to be entered and held — a
    // genuine pending dependency, not merely one optimistic turn.
    for (let i = 0; i < 60 && !callbackEntered; i += 1) {
      await yield2();
    }
    assert.equal(callbackEntered, true);
    w.requestStop("REQUESTED");
    // The held real dependency is released; the callback settles with the
    // genuine ref — it meets the post-callback recheck and the run
    // settles on real turns inside the original bound.
    gate.held = false;
    gate.release();
    closeAll(driver);
    const res = await drainRun(clk, p);
    // The post-callback recheck saw the stop: ZERO additional selected
    // receipt-path metadata admission landed on the genuine completion
    // path, no fresh Native probe dispatched and no late begun ack
    // exists.
    assert.equal(seen.admissions, baseline);
    assert.ok(!monitorCalls.some((c) => c.startsWith("probe:")));
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.ok(!driver.written.some((m) => m.type === "begun"));
  } finally {
    gate.held = false;
    gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});

test("a stop while selftest receipt IO is held leaves the post-IO probe undispatched", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { driver, monitorCalls, w, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
  });
  // Arm the gate ONLY on the genuine nested receipt read — every other
  // real receipt byte (manifest/events/inputs) delegates untouched and
  // the finalize rename on the same path is never held.
  const gate = gateFs(t, {
    workspaceRoot: evidence.env.workspaceRoot,
    relativePath: "preflight/selftest/completion.json",
    operation: "read",
  });
  let p = null;
  try {
    p = run();
    await liveStart(clk, driver);
    driver.emit({
      type: "begin",
      operationId: `${evidence.parentManifest.runId}:preflight-selftest`,
      kind: "command",
    });
    // The genuine receipt read is actually held inside the real
    // verifyInternalSelfTest call — actual entry through the truthful
    // entry channel.
    await awaitEntered(gate);
    w.requestStop("REQUESTED");
    // Release the REAL bytes: the post-IO probe guard sees the latched
    // stop and rejects before ANY fresh Native probe may dispatch.
    gate.release();
    closeAll(driver);
    const res = await drainRun(clk, p);
    assert.equal(res.stopReason, "REQUESTED");
    assert.ok(!driver.written.some((m) => m.type === "begun"));
    // No Native probe call for the parent supervisor ever dispatched.
    assert.ok(!monitorCalls.some((c) => c.startsWith("probe:")));
  } finally {
    gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});

test("a pending genuine running-write body drains through the real incomplete path", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { driver, w, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
  });
  const gate = gateFs(t, {
    workspaceRoot: evidence.env.workspaceRoot,
    relativePath: "preflight/running.json",
    operation: "rename",
  });
  let p = null;
  try {
    p = run();
    // The parent's own running write is genuinely held inside the real
    // artifact-store rename for running.json — actual entry through the
    // truthful entry channel.
    await awaitEntered(gate);
    w.requestStop("REQUESTED");
    // Release AFTER the stop: the held body completes through the real
    // admitted drain — the released running.json may truthfully exist.
    gate.release();
    closeAll(driver);
    const res = await drainRun(clk, p);
    assert.equal(res.stopReason, "REQUESTED");
    const names = (
      await fsp.readdir(path.join(evidence.env.workspaceRoot, "preflight"))
    ).sort();
    // No final, completion or seal record is ever fabricated; a real
    // released running.json existing is the truthful outcome.
    assert.ok(!names.includes("final.json"));
    assert.ok(!names.includes("completion.json"));
    assert.ok(!names.some((n) => n.includes("seal")));
    assert.equal(driver.calls.length, 0); // the driver never launched
  } finally {
    gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});

test("a failed genuine running-write body drains without fabricated completion", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { driver, w, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
  });
  const gate = gateFs(t, {
    workspaceRoot: evidence.env.workspaceRoot,
    relativePath: "preflight/running.json",
    operation: "rename",
  });
  let p = null;
  try {
    p = run();
    await awaitEntered(gate);
    w.requestStop("REQUESTED");
    // A supplied REAL IO failure lands on the caller's original channel —
    // it can never become a fictitious positive body.
    const io = new Error("running write failed");
    io.code = "STORE_IO";
    gate.release(io);
    closeAll(driver);
    const res = await drainRun(clk, p);
    assert.equal(res.stopReason, "REQUESTED");
    const names = (
      await fsp.readdir(path.join(evidence.env.workspaceRoot, "preflight"))
    ).sort();
    assert.ok(!names.includes("running.json"));
    assert.ok(!names.includes("final.json"));
    assert.ok(!names.includes("completion.json"));
    // No fabricated seal record either — the same pending-case purpose,
    // never a production seal marker.
    assert.ok(!names.some((n) => n.includes("seal")));
  } finally {
    gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});

test("a spent partial start performs no fresh monitor or Native work", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const gate = heldGate();
  const { driver, monitor, monitorCalls, w, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
    // The genuine start enters and is held at the owned gate — the stop
    // lands and the whole captured end is spent while the real
    // dependency is still pending.
    monitorScript: { startPromise: gate.promise },
  });
  // A PRIVATE entry tap on the genuine monitor.start settles the owned
  // entry receipt at the actual call — the SAME original
  // this/args/result/error is preserved through a direct apply, never a
  // replacement body; its restore is preregistered on the SAME per-test
  // owner BEFORE the tap lands.
  let entered;
  const entry = new Promise((resolve) => {
    entered = resolve;
  });
  const monitorStart = monitor.start;
  registerFixtureTeardown(t, {
    restore: () => {
      monitor.start = monitorStart;
    },
  });
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
    w.requestStop("REQUESTED");
    // Spend the ONE captured end BEFORE the held dependency is released
    // — the original start resolves at the HELD clock, then its actual
    // body is joined through the drain.
    clk.advance(5000);
    gate.held = false;
    gate.release({ started: false });
    const res = await drainRun(clk, p);
    // The spent bound dispatched no fresh monitor/Native call at all —
    // no probe, no signal and no collector reap; the genuine
    // CLEANUP_DEADLINE fault is retained instead of a fabricated tuple.
    assert.ok(!monitorCalls.some((c) => c.startsWith("probe:")));
    assert.ok(!monitorCalls.some((c) => c.startsWith("signal:")));
    assert.ok(!monitorCalls.includes("stopAndReap"));
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(driver.calls.length, 0); // the driver never launched
  } finally {
    w.requestStop("REQUESTED");
    gate.held = false;
    gate.release({ started: false });
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});
