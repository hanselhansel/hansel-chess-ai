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
