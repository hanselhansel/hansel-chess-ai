// TEST-only whole captured-end re-verification case, moved for capacity.
// Scripted tuple observations are never actual Native/phase proof.
import test from "node:test";
import assert from "node:assert/strict";
import { makeEvidenceWorkspace, makePreflightRun, gateFs } from "./watchdog-evidence-test-fixtures.mjs";
import { watchdogTestClock } from "./watchdog-test-fixtures.mjs";
import { closeFacts as closeAll, drain as drainRun, liveStart, yieldTurn } from "./watchdog-run-test-fixtures.mjs";
import { observeDriverBegun } from "./watchdog-teardown-test-fixtures.mjs";
import { capturePriorReceiptProbes, awaitEvidenceEntry as awaitEntered } from "./watchdog-parent-admission-test-fixtures.mjs";
const yield2 = async () => {
  await yieldTurn();
  await yieldTurn();
};

test("a held re-verification read expiring past the captured end dispatches no fresh Native probe", async (t) => {
  const clk = watchdogTestClock();
  const evidence = await makeEvidenceWorkspace(t, { clock: clk });
  const { driver, monitorCalls, run, dispose } = await makePreflightRun(t, {
    evidence,
    clock: clk,
  });
  const priorKeys = Object.keys(await capturePriorReceiptProbes(t, evidence));
  const parent = evidence.parentSupervisor;
  const parentProbe = `probe:${parent.pid}:${parent.startSec}:${parent.startUsec}`;
  const opId = `${evidence.parentManifest.runId}:preflight-selftest`;
  // The shared begun observer installs BEFORE run/begin — the receipt
  // settles on the actual outgoing admission, a stop with its reason.
  const begunReceipt = observeDriverBegun(t, driver);
  let p = null;
  let gate = null;
  try {
    p = run();
    await liveStart(clk, driver);
    driver.emit({ type: "begin", operationId: opId, kind: "command" });
    // The positive handshake already admitted — the first verification's
    // own read and parent probe already landed; racing the original run
    // outcome reports an impossible early end instead of hanging.
    const earlyEnd = p.then((res) => {
      throw new Error(`run ended before begun admission: ${res.stopReason}`);
    });
    earlyEnd.catch(() => {}); // the race loser never floats unhandled
    await Promise.race([begunReceipt, earlyEnd]);
    assert.ok(driver.written.some((m) => m.type === "begun"));
    assert.ok(
      monitorCalls.includes(`probe:${evidence.parentSupervisor.pid}:1000:0`),
    );
    // Arm the read gate NOW so only the cleanup-specific re-verification
    // receipt read is held — never the already-completed first verify.
    gate = gateFs(t, {
      workspaceRoot: evidence.env.workspaceRoot,
      relativePath: "preflight/selftest/completion.json",
      operation: "read",
    });
    const endAt = clk.nowMonoMs();
    driver.emit({
      type: "end",
      operationId: opId,
      result: { status: "completed", evidencePaths: [], detail: {} },
    });
    await yield2();
    driver.emit({
      type: "finish",
      requestedStatus: "inconclusive",
      requestedExitCode: 2,
      stopReason: null,
      checks: [],
      summary: {},
      analysisEligible: false,
    });
    // The re-verification's genuine receipt read is held while the clock
    // is driven PAST the captured cleanup end — the original bound is
    // spent before the read resolves.
    await awaitEntered(gate);
    for (let i = 0; i < 12 && clk.nowMonoMs() < endAt + 5000; i += 1) {
      clk.advance(500);
      await yield2();
    }
    gate.release();
    closeAll(driver);
    const res = await drainRun(clk, p);
    // The spent original end admitted no fresh Native probe. Separate
    // exact historical admission probes from the one healthy-parent
    // handshake probe; the cleanup re-verification dispatched NONE.
    assert.equal(
      monitorCalls.filter((call) => call === parentProbe).length,
      1,
    );
    assert.equal(monitorCalls.filter((call) => priorKeys.some((key) => call === `probe:${key}`)).length,
      evidence.prerequisites.length);
    assert.equal(monitorCalls.filter((call) => call.startsWith("probe:")).length,
      evidence.prerequisites.length + 1);
    assert.equal(res.status, "inconclusive");
  } finally {
    if (gate !== null) gate.release();
    closeAll(driver);
    if (p !== null) await drainRun(clk, p, 30).catch(() => {});
    await dispose();
  }
});
