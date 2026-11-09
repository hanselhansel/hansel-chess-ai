// Strict-v1 characterization, run unchanged before and after Task6 extraction.
// Genuine monitor/transport/queue/lifetime; scripted process and pipe facts only.
import test from "node:test";
import assert from "node:assert/strict";
import { processMonitorLifetime } from "./processes.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import {
  strictMonitorFixture,
  strictBootstrapScript,
  startStrictMonitor,
} from "./separate-verdicts-test-fixtures.mjs";
import {
  createMonitorFixture,
  monitorBootstrapScript,
  startMonitorFixture,
} from "./process-monitor-test-fixtures.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const samples = (env) => env.fixture.written.filter((m) => m.type === "sample");
const release = async (env) => {
  // Supply actual controlled exit and BOTH closes before any owner join.
  env.fixture.exit(0);
  await env.monitor.stopAndReap().catch(() => {});
  await processMonitorLifetime(env.monitor).whenSettled();
  env.cleanup();
};

test("Task6 seams retain the identical scripted factories", () => {
  assert.equal(strictMonitorFixture, createMonitorFixture);
  assert.equal(strictBootstrapScript, monitorBootstrapScript);
  assert.equal(startStrictMonitor, startMonitorFixture);
});

test("strict-v1 spent start issues no spawn or wire work", async () => {
  const env = strictMonitorFixture({ script: strictBootstrapScript() });
  try {
    await assert.rejects(env.monitor.start({ deadlineMonoMs: env.clock.nowMs() }),
      (error) => error.code === "ACCOUNTING_UNAVAILABLE");
    assert.deepEqual(env.spawns, []);
    assert.deepEqual(env.fixture.written, []);
    assert.equal(env.clock.liveIntervals(), 0);
    assert.equal(env.monitor.fault().code, "ACCOUNTING_UNAVAILABLE");
  } finally {
    await release(env);
  }
});

test("strict-v1 start admits one first observation and a single sampler", async () => {
  const env = strictMonitorFixture({ script: strictBootstrapScript() });
  try {
    await startStrictMonitor(env);
    assert.equal(env.spawns.length, 1);
    assert.equal(env.clock.liveIntervals(), 1);
    assert.equal(samples(env).length, 2, "bootstrap proof plus covering cycle");
    const first = env.monitor.lastObservation();
    assert.deepEqual(Object.keys(first).sort(), ["accountingValid", "atMonoNs", "gone",
      "intervalMs", "peakRssBytes", "rssBytes", "rssLimitExceeded", "sampled"].sort());
    assert.equal(first.accountingValid, true);
    assert.equal(first.atMonoNs, env.clock.nowMonoNs());
    assert.equal(first.peakRssBytes, first.rssBytes);
    assert.equal(env.monitor.fault(), null);
    await assert.rejects(env.monitor.start(), /monitor started/);
    assert.equal(env.spawns.length, 1);
    assert.equal(env.clock.liveIntervals(), 1);
    const stop = env.monitor.stopAndReap();
    assert.equal(env.monitor.stopAndReap(), stop);
    assert.equal((await stop).exitCode, 0);
    assert.equal(env.clock.liveIntervals(), 0);
    assert.equal(env.fixture.written.at(-1).type, "shutdown");
  } finally {
    await release(env);
  }
});

test("strict-v1 exact500ms sample passes and later501ms gap stays hard", async () => {
  const env = strictMonitorFixture({ script: strictBootstrapScript() });
  try {
    await startStrictMonitor(env);
    env.clock.jumpWithoutTimers(500);
    const admitted = await env.monitor.sample();
    assert.equal(admitted.intervalMs, 500);
    assert.equal(admitted.accountingValid, true);
    env.clock.jumpWithoutTimers(501);
    await assert.rejects(env.monitor.sample(), (error) =>
      error.code === "ACCOUNTING_UNAVAILABLE" && error.message.includes("sample interval"));
    const fault = env.monitor.fault();
    const invalid = env.monitor.lastObservation();
    assert.equal(invalid.atMonoNs, admitted.atMonoNs);
    assert.equal(invalid.accountingValid, false);
    const count = samples(env).length;
    env.clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    assert.equal(samples(env).length, count, "hard fault prevents fresh tick");
    assert.deepEqual(env.monitor.fault(), fault);
  } finally {
    await release(env);
  }
});

test("strict-v1 pending tick retains its slot until actual wire settlement", async () => {
  const script = strictBootstrapScript();
  const env = strictMonitorFixture({ script });
  try {
    await startStrictMonitor(env);
    script.muteSample = true;
    env.clock.advance(250);
    await flush();
    const issued = samples(env).length;
    env.clock.advance(250);
    await flush();
    assert.equal(samples(env).length, issued);
    env.clock.advance(TIMING_LIMITS.commandMs);
    await flush();
    assert.equal(env.monitor.fault().code, "IPC_INVALID");
    const stop = env.monitor.stopAndReap();
    let closed = false;
    processMonitorLifetime(env.monitor).whenSettled().then(() => { closed = true; });
    env.fixture.child.exit(0);
    env.fixture.child.stdout.emitClose();
    await flush();
    assert.equal(closed, false, "stderr remains actual physical debt");
    assert.equal(env.monitor.stopAndReap(), stop);
    env.fixture.child.stderr.emitClose();
    assert.equal((await stop).exitCode, 0);
    await processMonitorLifetime(env.monitor).whenSettled();
    assert.equal(closed, true);
    assert.equal(env.clock.liveIntervals(), 0);
  } finally {
    await release(env);
  }
});

import { qualityMonitor, periodicQuality, flushQuality, qualitySamples } from "./separate-verdicts-test-fixtures.mjs";

test("v2 bootstrap seed detects first idle501 without any getter and recovers current proof", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const seed = f.clock.nowMonoNs();
    const first = await periodicQuality(f, 501);
    assert.equal(f.monitor.fault(), null);
    assert.equal(first.accountingValid, true);
    assert.equal(first.coverageContinuous, false);
    assert.equal(first.resourceQuality.completedCycles, 2);
    assert.equal(first.resourceQuality.gapCount, 1);
    assert.equal(first.resourceQuality.lastCoverageQualifiedNs, seed);
    assert.equal(first.resourceQuality.firstGap.fromNs, seed);
    const next = await periodicQuality(f);
    assert.equal(next.resourceQuality.lastTimelyNs, f.clock.nowMonoNs());
    assert.equal(next.resourceQuality.lastCoverageQualifiedNs, seed);
    assert.equal(next.resourceQuality.gapCount, 1);
  } finally { await f.dispose(); }
});

test("v2 Python-only501 is typed soft, retains observed peak and timely next cycle", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const first = await periodicQuality(f, 250, { finishedAtMonoNs: "501000001" });
    assert.equal(f.monitor.fault(), null);
    assert.equal(first.cycleTimely, false);
    assert.equal(first.accountingValid, false);
    assert.equal(first.resourceQuality.causeCounts.PERIODIC_NATIVE_DURATION, 1);
    const next = await periodicQuality(f);
    assert.equal(next.accountingValid, true);
    assert.equal(next.resourceQuality.completedCycles, 3);
    assert.equal(next.resourceQuality.timelyCycles, 2);
    assert.equal(next.coverageContinuous, false);
  } finally { await f.dispose(); }
});

test("v2 observer-age pending episode merges with held actual tick and recovers", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    f.script.muteSample = true;
    f.clock.advance(250);
    await flushQuality();
    const count = qualitySamples(f).length;
    f.clock.advance(501);
    await flushQuality();
    const first = f.monitor.lastObservation();
    assert.equal(first.resourceQuality.pending, true);
    assert.equal(first.resourceQuality.gapCount, 1);
    assert.equal(f.monitor.lastObservation().resourceQuality.gapCount, 1);
    assert.equal(qualitySamples(f).length, count);
    f.reply();
    await flushQuality();
    assert.equal(f.monitor.fault(), null);
    assert.equal(f.monitor.lastObservation().resourceQuality.completedCycles, 2);
    assert.equal(f.monitor.lastObservation().resourceQuality.pending, false);
    const next = await periodicQuality(f);
    assert.equal(next.accountingValid, true);
    assert.equal(next.resourceQuality.gapCount, 1);
  } finally { await f.dispose(); }
});

for (const phase of ["check", "parity", "preflight"]) {
  test(`v2 ${phase} periodic quality remains hard`, async () => {
    const f = qualityMonitor({ phase });
    try {
      await f.start();
      await periodicQuality(f, 501);
      assert.equal(f.monitor.fault().code, "ACCOUNTING_UNAVAILABLE");
    } finally { await f.dispose(); }
  });
}

test("v2 public sample cannot select soft compare treatment", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    f.clock.jumpWithoutTimers(501);
    await assert.rejects(f.monitor.sample(), /sample interval/);
    assert.equal(f.monitor.fault().code, "ACCOUNTING_UNAVAILABLE");
  } finally { await f.dispose(); }
});

for (const failure of ["reversed", "unsafe", "EOF", "permission", "unknown"]) {
  test(`v2 complete timing policy preserves hard ${failure}`, async () => {
    const f = qualityMonitor();
    try {
      await f.start();
      f.script.muteSample = true;
      f.clock.advance(250);
      await flushQuality();
      if (failure === "EOF") f.fixture.exit(1);
      else if (["permission", "unknown"].includes(failure)) f.fixture.emit({
        type: "accounting-fault", reason: "ACCOUNTING_UNAVAILABLE", diagnostic: failure });
      else f.reply(failure === "reversed" ? { startedAtMonoNs: "3", finishedAtMonoNs: "2" } :
        { samples: qualitySamples(f).at(-1).owned.map((i) => ({ identity: i, ppid: 1,
          pgid: i.pid, uid: 501, residentBytes: Number.MAX_SAFE_INTEGER })) });
      await flushQuality();
      assert.notEqual(f.monitor.fault(), null);
      assert.equal(f.monitor.lastObservation().accountingValid, false);
      const count = qualitySamples(f).length;
      f.clock.advance(250);
      await flushQuality();
      assert.equal(qualitySamples(f).length, count);
    } finally { await f.dispose(); }
  });
}

test("v2 strict bootstrap native501 cannot seed a ledger", async () => {
  const f = qualityMonitor();
  try {
    f.script.muteSample = true;
    const rejected = assert.rejects(f.start(), /native interval/);
    await flushQuality();
    f.reply(); // strict native bootstrap identity proof
    await flushQuality();
    f.reply({ finishedAtMonoNs: "501000001" });
    await rejected;
    assert.equal(f.monitor.lastObservation(), null);
    assert.notEqual(f.monitor.fault(), null);
  } finally { await f.dispose(); }
});

for (const cap of [4294967296, 4294967297]) {
  test(`v2 already-issued post-fence ${cap} retains only positive cap and exact late metadata`, async () => {
    const f = qualityMonitor();
    try {
      await f.start();
      f.script.muteSample = true;
      f.clock.advance(250);
      await flushQuality();
      const before = f.monitor.lastObservation();
      const end = f.clock.nowMs() + 5000;
      const stop = f.monitor.stopAndReap({ deadlineMonoMs: end });
      f.reply({ samples: qualitySamples(f).at(-1).owned.map((i, n) => ({ identity: i,
        ppid: 1, pgid: i.pid, uid: 501, residentBytes: n === 0 ? cap : 0 })) });
      await stop;
      const after = f.monitor.lastObservation();
      assert.equal(f.monitor.fault(), null);
      assert.equal(after.resourceQuality.completedCycles, before.resourceQuality.completedCycles);
      assert.equal(after.resourceQuality.lastCompleteNs, before.resourceQuality.lastCompleteNs);
      assert.equal(after.peakRssBytes, before.peakRssBytes);
      assert.equal(after.atMonoNs, before.atMonoNs);
      assert.equal(after.resourceQuality.pending, false);
      assert.equal(after.resourceQuality.lateDrops.count, 1);
      assert.equal(after.resourceQuality.lateDrops.first.observedAtNs, f.clock.nowMonoNs());
      assert.equal(after.rssLimitExceeded, cap > 4294967296);
      assert.equal(after.observedPeakRssBytes, cap > 4294967296 ? cap : before.observedPeakRssBytes);
      assert.equal(qualitySamples(f).length, 3);
    } finally { await f.dispose(); }
  });
}

for (const winner of ["constructor", "getter", "call"]) {
  test(`v2 fractional ${winner} original bound survives genuine later narrowing`, async () => {
    let reads = 0, narrow = false;
    const f = qualityMonitor({ startNs: 0n, getDeadlineMonoMs: winner === "call" ? null : () => {
      reads += 1;
      if (narrow) return 900;
      return winner === "constructor" ? (reads === 1 ? 1000.25 : 2000) : (reads === 1 ? 2000 : 1000.25);
    } });
    try {
      await f.start();
      f.script.muteSample = true;
      let pending = null;
      if (winner === "call") { pending = f.monitor.sample({ deadlineMonoMs: 1000.25 }); await flushQuality(); }
      else { f.clock.advance(250); await flushQuality(); }
      narrow = true;
      const stop = f.monitor.stopAndReap({ deadlineMonoMs: 900 });
      f.reply();
      if (pending) assert.equal((await pending).kind, "fenced-observation");
      await stop;
      const q = f.monitor.lastObservation().resourceQuality;
      assert.equal(q.lateDrops.first.originalEndNs, "1000250000");
      assert.equal(q.completedCycles, 1);
    } finally { await f.dispose(); }
  });
}

test("v2 fence rejects queued-not-issued work and closes an age-only tail exactly once", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    f.script.muteSample = true;
    const pending = f.monitor.sample();
    await flushQuality();
    const queued = f.monitor.sample();
    const rejected = assert.rejects(queued, /monitor stopping/);
    f.clock.jumpWithoutTimers(501);
    const count = qualitySamples(f).length;
    const stop = f.monitor.stopAndReap();
    f.reply();
    await pending;
    await rejected;
    await stop;
    const q = f.monitor.lastObservation().resourceQuality;
    assert.equal(qualitySamples(f).length, count);
    assert.equal(q.gapCount, 1);
    assert.equal(q.lastGap.toNs, q.coverageEndNs);
    assert.deepEqual(q.lastGap.causes, ["PERIODIC_OBSERVER_AGE"]);
    assert.equal(q.lateDrops.count, 1);
  } finally { await f.dispose(); }
});

for (const failure of ["decoded-expired", "malformed", "expired-wire"]) {
  test(`v2 post-fence ${failure} never grants cap or freshness`, async () => {
    const f = qualityMonitor();
    try {
      await f.start(); f.script.muteSample = true;
      f.clock.advance(250); await flushQuality();
      const end = f.clock.nowMs() + 1000;
      const stop = f.monitor.stopAndReap({ deadlineMonoMs: end });
      const rejected = stop.catch(() => {});
      if (failure === "expired-wire") { f.clock.advance(1001); f.reply(); }
      else {
        f.reply(failure === "malformed" ? { samples: [] } : {});
        if (failure === "decoded-expired") f.clock.jumpWithoutTimers(1001);
      }
      await flushQuality(); f.fixture.exit(0); await rejected;
      const obs = f.monitor.lastObservation();
      assert.notEqual(f.monitor.fault(), null);
      assert.equal(obs.resourceQuality.completedCycles, 1);
      assert.equal(obs.rssLimitExceeded, false);
      assert.equal(obs.resourceQuality.lateDrops.count, failure === "decoded-expired" ? 1 : 0);
      if (failure === "decoded-expired") assert.equal(obs.resourceQuality.lateDrops.last.observedAtNs, f.clock.nowMonoNs());
    } finally { await f.dispose(); }
  });
}

test("v2 unknown hard source class cannot replace the first native error", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const error = Object.assign(new Error("unknown source"), { resourceReason: "UNKNOWN" });
    assert.doesNotThrow(() => f.fixture.child.emit("error", error));
    assert.match(f.monitor.fault().detail, /unknown source/);
    assert.deepEqual(f.monitor.lastObservation().resourceQuality.hardReasons, ["NATIVE"]);
  } finally { await f.dispose(); }
});

test("v2 genuine periodic exactly500ms passes and500ms+1ns loses only coverage", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const exact = await periodicQuality(f, 500);
    assert.equal(exact.coverageContinuous, true);
    f.script.muteSample = true;
    f.clock.advance(500); await flushQuality();
    const originalNs = f.clock.nowMonoNs;
    f.clock.nowMonoNs = () => String(BigInt(originalNs()) + 1n);
    f.reply(); await flushQuality();
    const after = f.monitor.lastObservation();
    assert.equal(f.monitor.fault(), null);
    assert.equal(after.accountingValid, true);
    assert.equal(after.coverageContinuous, false);
    assert.equal(after.resourceQuality.maxGapNs, "500000001");
    assert.equal(after.resourceQuality.causeCounts.PERIODIC_COMPLETION_GAP, 1);
  } finally { await f.dispose(); }
});
