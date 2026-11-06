// Genuine observation timing and first-fault retention. Controlled fake
// process/pipe facts only; no actual Native, browser, model or phase work.
import test from "node:test";
import assert from "node:assert/strict";
import { createProcessObservation } from "./process-observation.mjs";
import { createOwnership } from "./process-ownership.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { fakeClock, sampleReply } from "./supervision-test-fixtures.mjs";
import { createMonitorFixture as setup, monitorBootstrapScript as bootScript,
  startMonitorFixture as start } from "./process-monitor-test-fixtures.mjs";
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("a faulted physically-settled collector still stops and clears its sampler", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { clock, fixture, monitor, cleanup } = env;
  const count = () =>
    fixture.written.filter((f) => f.type === "sample").length;
  // The ORIGINAL test bound is captured once BEFORE start — neither
  // the later stop nor the unconditional finally stop gets a fresh
  // budget after the failure.
  const bound = clock.nowMs() + 30000;
  try {
    await start(env);
    assert.equal(clock.liveIntervals(), 1); // the live sampling tick
    // A near-limit valid fault preserves both actual pair classifications.
    const first = JSON.stringify({ sameMembership: true, orderEqual: false });
    const second = JSON.stringify({ sameMembership: false, orderEqual: false });
    const diagnostic = `pid list never stable [${first},${" ".repeat(3800)}${second}]`;
    fixture.emit({
      type: "accounting-fault",
      code: "ACCOUNTING_UNAVAILABLE",
      reason: "unstable-list",
      diagnostic,
    });
    await flush();
    const fault = monitor.fault();
    assert.notEqual(fault, null);
    assert.equal(fault.code, "ACCOUNTING_UNAVAILABLE");
    assert.equal(fault.detail, `ACCOUNTING_UNAVAILABLE collector unstable-list: ${diagnostic}`);
    assert.ok(Buffer.byteLength(fault.detail) <= 4096);
    await assert.rejects(monitor.sample({ deadlineMonoMs: bound }),
      (error) => error.code === "ACCOUNTING_UNAVAILABLE");
    assert.deepEqual(monitor.fault(), fault);
    // Physical settlement alone leaves the referenced sampler live —
    // settled is never shutdown proof.
    fixture.exit(2);
    await processMonitorLifetime(monitor).whenSettled();
    assert.equal(clock.liveIntervals(), 1);
    // The genuine stop under the captured bound still runs: the real
    // exit-2 result returns, the sampler clears, the primary fault's
    // facts are preserved and the receipt is the ONE cached promise.
    const stop = monitor.stopAndReap({ deadlineMonoMs: bound });
    const r = await stop;
    assert.equal(r.exitCode, 2);
    assert.equal(clock.liveIntervals(), 0);
    // fault() returns a fresh copy per call; the facts are unchanged.
    assert.deepEqual(monitor.fault(), fault); // SAME primary fault facts
    assert.equal(monitor.stopAndReap(), stop); // SAME cached receipt
    const sent = count();
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    assert.equal(count(), sent); // sampling never resumes
  } finally {
    // Controlled physical facts are released BEFORE the genuine stop
    // and owner join so a failed assertion can never strand retained
    // debt; a stop rejection is retained and rethrown, never discarded.
    fixture.exit(0);
    const stopErr = await monitor
      .stopAndReap({ deadlineMonoMs: bound })
      .then(() => null, (e) => e);
    await processMonitorLifetime(monitor).whenSettled();
    cleanup();
    if (stopErr) throw stopErr;
  }
});

const timedObservation = ({ startNs, finishNs, lastNs, requireHealthy = () => {}, stickyAfterSend = null }) => {
  const timer = fakeClock({ startNs: 10000000000n });
  let current = 10000000000n;
  const readings = [startNs, finishNs];
  let clockReads = 0;
  let sends = 0;
  let commits = 0;
  let stickyFault = null;
  const retained = { atMonoNs: lastNs, rssBytes: 17, peakRssBytes: 17,
    rssLimitExceeded: false, accountingValid: true, intervalMs: 250, sampled: 0, gone: 0 };
  const handle = createBudgetHandle({ deadlineMonoMs: 100000, clock: timer,
    nowMonoMs: () => Number(current / 1000000n) });
  const observer = createProcessObservation({
    ownership: createOwnership({ runId: "timed" }), requireHealthy,
    nextRid: () => "controlled-sample",
    send: async (type, payload, requestId) => {
      sends += 1;
      assert.equal(type, "sample");
      stickyFault = stickyAfterSend;
      return { ...sampleReply({ requestId, owned: payload.owned }),
        startedAtMonoNs: "900000000000000", finishedAtMonoNs: "900000012000000" };
    },
    clock: { nowMonoNs: () => {
      current = readings[clockReads++];
      return current.toString();
    } },
    state: () => ({ lastValidNs: lastNs, stickyFault, lastObservation: retained,
      sampling: true, nowMonoNs: current.toString() }),
    commitCycle: () => { commits += 1; },
  });
  return { observer, handle, retained, counts: () => ({ clockReads, sends, commits }),
    dispose: () => { handle.dispose(); assert.equal(timer.pendingTimeouts(), 0); } };
};

test("genuine monitor retains failed-cycle timestamps and the first gap fault", async () => {
  const env = setup({ script: bootScript() });
  const { clock, fixture, monitor, cleanup } = env;
  const bound = clock.nowMs() + 30000;
  try {
    await start(env);
    const retained = monitor.lastObservation();
    clock.jumpWithoutTimers(600);
    await assert.rejects(monitor.sample({ deadlineMonoMs: bound }),
      (error) => error.code === "ACCOUNTING_UNAVAILABLE");
    const fault = monitor.fault();
    const prefix = "ACCOUNTING_UNAVAILABLE sample interval ";
    assert.ok(fault.detail.startsWith(prefix));
    const data = JSON.parse(fault.detail.slice(prefix.length));
    assert.equal(data.lastValidNs, retained.atMonoNs);
    assert.equal(data.gapMs, 600);
    assert.equal(data.preCycleGapMs, 600);
    assert.equal(data.cycleDurationMs, 0);
    assert.equal(data.nativeDurationMs, 0.000001);
    assert.equal(data.coverageRounds, 1);
    assert.equal(data.stickyPresent, false);
    assert.equal(monitor.lastObservation().atMonoNs, retained.atMonoNs);
    assert.equal(monitor.lastObservation().accountingValid, false);
    await assert.rejects(monitor.sample({ deadlineMonoMs: bound }),
      (error) => error.code === "ACCOUNTING_UNAVAILABLE");
    assert.deepEqual(monitor.fault(), fault);
  } finally {
    fixture.exit(0);
    await monitor.stopAndReap({ deadlineMonoMs: bound });
    await processMonitorLifetime(monitor).whenSettled();
    cleanup();
  }
});

test("failed gap records already-read same-origin scalars without another clock read", async () => {
  const env = timedObservation({ startNs: 10450000000n, finishNs: 10600000000n, lastNs: "10000000000" });
  try {
    let failure;
    await assert.rejects(env.observer.runCycle(env.handle), (error) => {
      failure = error;
      return error.code === "ACCOUNTING_UNAVAILABLE" && error.message.startsWith("ACCOUNTING_UNAVAILABLE sample interval ");
    });
    const prefix = "ACCOUNTING_UNAVAILABLE sample interval ";
    assert.deepEqual(JSON.parse(failure.message.slice(prefix.length)), {
      startedNs: "10450000000", finishedNs: "10600000000", lastValidNs: "10000000000",
      gapMs: 600, preCycleGapMs: 450, cycleDurationMs: 150,
      nativeDurationMs: 12, coverageRounds: 1, stickyPresent: false,
    });
    assert.ok(Buffer.byteLength(failure.message) <= 4096);
    assert.deepEqual(env.counts(), { clockReads: 2, sends: 1, commits: 0 });
    assert.equal(env.observer.projectObservation().atMonoNs, env.retained.atMonoNs);
    assert.equal(env.observer.projectObservation().accountingValid, false);
  } finally {
    env.dispose();
  }
});

test("exact 500 ms boundary remains healthy with unrelated Python clock origin", async () => {
  const env = timedObservation({ startNs: 10450000000n, finishNs: 10500000000n, lastNs: "10000000000" });
  try {
    const result = await env.observer.runCycle(env.handle);
    assert.equal(result.accountingValid, true);
    assert.equal(result.intervalMs, 500);
    assert.equal(result.atMonoNs, "10500000000");
    assert.deepEqual(Object.keys(result).sort(), ["accountingValid", "atMonoNs", "gone", "intervalMs",
      "peakRssBytes", "rssBytes", "rssLimitExceeded", "sampled"].sort());
    assert.deepEqual(env.counts(), { clockReads: 2, sends: 1, commits: 1 });
  } finally {
    env.dispose();
  }
});

test("a first-cycle failure has no invented pre-cycle timestamp", async () => {
  const env = timedObservation({ startNs: 10000000000n, finishNs: 10600000000n, lastNs: null });
  try {
    await assert.rejects(env.observer.runCycle(env.handle), (error) => {
      const data = JSON.parse(error.message.slice("ACCOUNTING_UNAVAILABLE sample interval ".length));
      assert.equal(data.lastValidNs, null);
      assert.equal(data.preCycleGapMs, null);
      assert.equal(data.gapMs, 600);
      assert.equal(data.cycleDurationMs, 600);
      return error.code === "ACCOUNTING_UNAVAILABLE";
    });
  } finally {
    env.dispose();
  }
});

test("a sticky fault arriving during a short cycle keeps the original OR predicate", async () => {
  const first = Object.freeze({ code: "ACCOUNTING_UNAVAILABLE", detail: "earlier collector fault" });
  const env = timedObservation({ startNs: 10010000000n, finishNs: 10020000000n,
    lastNs: "10000000000", stickyAfterSend: first });
  try {
    await assert.rejects(env.observer.runCycle(env.handle), (error) => {
      const data = JSON.parse(error.message.slice("ACCOUNTING_UNAVAILABLE sample interval ".length));
      assert.equal(data.gapMs, 20);
      assert.equal(data.stickyPresent, true);
      assert.equal(data.cycleDurationMs, 10);
      return error.code === "ACCOUNTING_UNAVAILABLE";
    });
    assert.deepEqual(env.counts(), { clockReads: 2, sends: 1, commits: 0 });
  } finally {
    env.dispose();
  }
});

test("arbitrary first health failures escape unchanged before timing or sends", async () => {
  for (const cause of [null, undefined, false, Object.freeze(new Error("first"))]) {
    const env = timedObservation({ startNs: 10000000000n, finishNs: 10600000000n,
      lastNs: "10000000000", requireHealthy: () => { throw cause; } });
    try {
      let caught = false;
      try {
        await env.observer.runCycle(env.handle);
      } catch (error) {
        caught = true;
        assert.equal(error, cause);
      }
      assert.equal(caught, true);
      assert.deepEqual(env.counts(), { clockReads: 0, sends: 0, commits: 0 });
    } finally {
      env.dispose();
    }
  }
});
