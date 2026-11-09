// Strict-v1 whole Watchdog/Recorder/cleanup characterization. No Native phase.
import test from "node:test";
import assert from "node:assert/strict";
import { strictWatchdogRun } from "./separate-verdicts-test-fixtures.mjs";
import {
  setupRun, liveStart, closeFacts, FINISH, drain, yieldTurn, row,
} from "./watchdog-run-test-fixtures.mjs";

const read = async (env, name) => JSON.parse((await env.readFile(`check/${name}.json`)).toString());
const events = async (env) => (await env.readFile("check/events.jsonl")).toString()
  .trim().split("\n").map(JSON.parse);
const observed = (changes = {}) => ({ accountingValid: true, rssBytes: 7,
  peakRssBytes: 7, rssLimitExceeded: false, atMonoNs: "123", ...changes });

test("Task6 watchdog seam is the identical existing owned factory", () => {
  assert.equal(strictWatchdogRun, setupRun);
});

test("strict-v1 requested finish retains running version and missing-check failure", async (t) => {
  const { clk, env, driver, journal, run } = await strictWatchdogRun(t);
  const p = run();
  await liveStart(clk, driver);
  const running = await read(env, "running");
  assert.equal(running.schemaVersion, 1);
  assert.deepEqual(journal, ["manifest", "monitor.start", "running", "fork"]);
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  // FINISH carries checks:[]; resolvePhaseChecks rejects missing checks.
  assert.deepEqual(result, { status: "failed", exitCode: 1, stopReason: null });
  const final = await read(env, "final");
  assert.equal(final.schemaVersion, 1);
  assert.equal(final.cleanup.verified, true);
  assert.equal(final.analysisEligible, false);
});

test("strict-v1 resource poll retains invalid actual fields and original reason", async (t) => {
  let invalid = false;
  const { clk, env, driver, run } = await strictWatchdogRun(t, {
    monitorScript: { observation: () => observed(invalid ? {
      accountingValid: false, rssBytes: 11, peakRssBytes: 19, atMonoNs: "456",
    } : {}) },
  });
  const p = run();
  await liveStart(clk, driver);
  invalid = true;
  clk.advance(1000);
  await yieldTurn();
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.deepEqual(result, { status: "inconclusive", exitCode: 2,
    stopReason: "ACCOUNTING_UNAVAILABLE" });
  const logged = await events(env);
  const resource = logged.find((event) => event.kind === "resource");
  assert.deepEqual(resource.payload, { rssBytes: 11, peakRssBytes: 19,
    rssLimitExceeded: false, accountingValid: false, atMonoNs: "456" });
  const fault = logged.find((event) => event.kind === "fault");
  assert.equal(fault.payload.code, "ACCOUNTING_UNAVAILABLE");
  assert.equal(fault.payload.detail, "watchdog-runtime ACCOUNTING_UNAVAILABLE: native observation");
});

test("strict-v1 sticky cap refuses finish before resource polling", async (t) => {
  let cap = false;
  const { clk, env, driver, monitor, run } = await strictWatchdogRun(t, {
    monitorScript: { observation: () => observed(cap ? {
      rssBytes: 8, peakRssBytes: 4294967297, rssLimitExceeded: true, atMonoNs: "789",
    } : {}) },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  cap = true;
  assert.equal(monitor.lastObservation().rssLimitExceeded, true);
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.equal(result.stopReason, "RESOURCE_RSS");
  const resource = (await events(env)).find((event) => event.kind === "resource");
  assert.deepEqual(resource.payload, { rssBytes: 8, peakRssBytes: 4294967297,
    rssLimitExceeded: true, accountingValid: true, atMonoNs: "789" });
  // Original noteFinish records the in-memory fault and resource event,
  // without dispatching faultEvent (the polling path dispatches both).
  assert.equal((await events(env)).some((event) => event.kind === "fault"), false);
  assert.ok((await read(env, "final")).unplannedFaultCount > 0);
  assert.equal((await read(env, "final")).cleanup.verified, true);
});

test("strict-v1 first stop keeps original cleanup bound across late finish", async (t) => {
  const { clk, env, driver, monitor, w, run } = await strictWatchdogRun(t);
  const stops = [];
  const original = monitor.stopAndReap;
  monitor.stopAndReap = function (options) {
    stops.push({ ...options });
    return original.call(this, options);
  };
  const p = run();
  await liveStart(clk, driver);
  const first = clk.nowMonoMs();
  w.requestStop("FIRST");
  clk.advance(25);
  w.requestStop("SECOND");
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const result = await drain(clk, p);
  assert.equal(result.stopReason, "FIRST");
  assert.deepEqual(stops, [{ deadlineMonoMs: first + 5000,
    ordinaryDeadlineMonoMs: first + 4500 }]);
  assert.equal((await read(env, "final")).stopReason, "FIRST");
});
