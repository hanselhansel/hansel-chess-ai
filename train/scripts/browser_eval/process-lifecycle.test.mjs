// process-lifecycle.test.mjs: the monitor actual-lifetime group moved
// from processes.test.mjs plus the original observing cases — spent
// start performs no spawn, an explicit shorter stop narrows ACTIVE
// ordinary work under the unchanged global getter, a startup public
// failure retains the returned child/pipe receipt until real
// settlement, an already-exited collector with one open pipe stays
// owned through public stop failure, the withheld-tick expiry to real
// teardown ordering, and the latched-overage sticky facts that never
// fault the monitor. Real createProcessMonitor and facade ownOperation
// only; every process, pipe and interval is fixture-faked.
import test from "node:test";
import assert from "node:assert/strict";

import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import {
  bsdRow,
  fakeFailedSpawnChild,
  identity,
} from "./supervision-test-fixtures.mjs";
import {
  createMonitorFixture as setup,
  monitorBootstrapScript as bootScript,
  startMonitorFixture as start,
} from "./process-monitor-test-fixtures.mjs";

const flush = () => new Promise((r) => setImmediate(r));

test("an already-spent start performs no spawn and latches the fault", async () => {
  const env = setup({ script: bootScript() });
  const { clock, monitor, spawns, cleanup } = env;
  try {
    // The captured readiness bound is already in the past: assertLive
    // must reject BEFORE any launch IO is initiated.
    await assert.rejects(
      monitor.start({ deadlineMonoMs: clock.nowMs() - 1 }),
      (e) => e.code === "ACCOUNTING_UNAVAILABLE",
    );
    assert.equal(spawns.length, 0); // no launch IO on a spent bound
    assert.notEqual(monitor.fault(), null); // sticky fault latched
  } finally {
    cleanup();
  }
});

test("an explicit shorter stop bound still drives a real reap", async () => {
  const env = setup({ script: bootScript() });
  const { clock, fixture, monitor, cleanup } = env;
  try {
    await start(env);
    // A caller-supplied bound inside the ceiling narrows every live
    // drain handle to THIS stop; the real shutdown plus exit still
    // proves the reap.
    const r = await monitor.stopAndReap({
      deadlineMonoMs: clock.nowMs() + 50,
    });
    assert.equal(r.exitCode, 0);
    assert.equal(fixture.written.at(-1).type, "shutdown");
  } finally {
    cleanup();
  }
});

test("a shorter stop narrows ACTIVE work — its public bound rejects the op", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { clock, fixture, monitor, cleanup } = env;
  try {
    await start(env);
    script.inspected[4242] = {
      pid: 4242,
      state: "live",
      process: bsdRow(4242, process.pid, 4242, 501),
      executable: "/bin/echo",
    };
    // The fresh inspect reply is withheld: registerRoot's actual task
    // stays dispatched while the shorter stop bound narrows ITS handle
    // to +50 — the op can never ride its original 90 s horizon.
    script.muteSample = true;
    const reg = monitor.registerRoot({
      pid: 4242,
      kind: "driver",
      expectedExecutable: "/bin/echo",
      scopeRunId: "R1",
    });
    const regObs = assert.rejects(reg);
    await flush();
    const stop = monitor.stopAndReap({
      deadlineMonoMs: clock.nowMs() + 50,
    });
    const stopObs = assert.rejects(stop);
    clock.advance(50);
    await flush();
    // The narrowed bound — not the op's own wider horizon — rejected
    // the live op; the drain itself cannot be proven either.
    await regObs;
    await stopObs;
    assert.notEqual(monitor.fault(), null);
    // The public stop promise is the ONE cached receipt: a repeated
    // call returns the SAME original CLEANUP_UNPROVEN rejection —
    // never a timed-out -> pass revival — while the REAL exit plus
    // both closes retires the retained physical debt independently,
    // observed passively through the genuine referenced owner.
    assert.equal(monitor.stopAndReap(), stop);
    await assert.rejects(stop, (e) => e.code === "CLEANUP_UNPROVEN");
    fixture.exit(0);
    await processMonitorLifetime(monitor).whenSettled();
  } finally {
    // Controlled physical facts are released BEFORE the genuine owner
    // is joined so a failed assertion can never strand retained debt
    // or the referenced hold; the first public error stays primary.
    fixture.exit(0);
    await processMonitorLifetime(monitor).whenSettled();
    cleanup();
  }
});

test("a failed-spawn collector keeps unproven debt through the monitor", async () => {
  const failed = fakeFailedSpawnChild();
  // The ONE isolated unproven-fault exception: a genuine watchdog
  // lifetime whose createHold spy records acquisition/release and
  // returns a descriptive release callback — never a Node keepalive
  // timer. Every other fixture keeps the real referenced default.
  const holdCalls = { acquired: 0, released: 0 };
  const lifetime = createWatchdogLifetime({
    createHold: () => {
      holdCalls.acquired += 1;
      return () => {
        holdCalls.released += 1;
      };
    },
  });
  const env = setup({
    script: bootScript(),
    collectorChild: failed,
    lifetime,
  });
  const { clock, monitor, spawns, cleanup } = env;
  try {
    const p = monitor.start();
    const observed = assert.rejects(p);
    await flush();
    // The returned child has NO pid: ownership was installed on it,
    // yet registration never invents an identity for it.
    assert.equal(spawns.length, 1);
    assert.equal(failed.pid, null);
    failed.fail(new Error("spawn ENOENT")); // error plus real closes
    clock.advance(TIMING_LIMITS.readinessMs ?? 30000);
    await observed;
    assert.notEqual(monitor.fault(), null);
    // No exec frame rode the wire: the only outbound frame is the
    // private shutdown attempt, and no exit ever arrived — the
    // whenReaped receipt stays unproven and the drain blocks on it.
    for (const w of failed.stdin.writes) {
      assert.notEqual(JSON.parse(w.toString().trim()).type, "exec");
    }
    const stop = monitor.stopAndReap({ deadlineMonoMs: clock.nowMs() + 40 });
    const stopObs = assert.rejects(stop);
    clock.advance(40);
    await stopObs;
    // The SAME genuine owner still observes the unproven physical
    // receipt: its fresh whenSettled stays pending forever — a
    // rejected stop is never physical close evidence and no unknown
    // zero is awaited — and the single hold stays acquired, never
    // released.
    assert.equal(processMonitorLifetime(monitor), lifetime);
    const settleObs = { settled: false };
    processMonitorLifetime(monitor).whenSettled().then(() => {
      settleObs.settled = true;
    });
    await flush();
    assert.equal(settleObs.settled, false);
    assert.equal(holdCalls.acquired, 1);
    assert.equal(holdCalls.released, 0);
  } finally {
    cleanup();
  }
});

test("an already-exited collector with one open pipe reaps only at close", async () => {
  const env = setup({ script: bootScript() });
  const { clock, fixture, monitor, cleanup } = env;
  try {
    await start(env);
    // The real exit plus the stdout close arrive while stderr stays
    // open: whenReaped — retained whenever transport exists — stays
    // pending, so the shorter public stop fails unproven.
    fixture.child.exit(0);
    fixture.child.stdout.emitClose();
    const stop = monitor.stopAndReap({
      deadlineMonoMs: clock.nowMs() + 50,
    });
    const stopObs = assert.rejects(stop);
    clock.advance(50);
    await stopObs;
    // The public stop promise is the ONE cached receipt: a repeated
    // call returns the SAME original CLEANUP_UNPROVEN rejection —
    // never a timed-out -> pass revival — while the late REAL stderr
    // close retires the retained physical debt independently,
    // observed passively through the genuine referenced owner.
    assert.equal(monitor.stopAndReap(), stop);
    await assert.rejects(stop, (e) => e.code === "CLEANUP_UNPROVEN");
    fixture.child.stderr.emitClose();
    await processMonitorLifetime(monitor).whenSettled();
  } finally {
    // Controlled physical facts are released BEFORE the genuine owner
    // is joined so a failed assertion can never strand retained debt
    // or the referenced hold; the first public error stays primary.
    fixture.exit(0);
    await processMonitorLifetime(monitor).whenSettled();
    cleanup();
  }
});

test("a publicly-expired tick holds actual debt; no second tick is admitted", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { clock, fixture, monitor, cleanup } = env;
  const count = () =>
    fixture.written.filter((f) => f.type === "sample").length;
  try {
    await start(env);
    const base = count();
    // Withhold the reply so the tick's real send stays pending: the
    // actual queue item is unsettled while the public bound runs out.
    script.muteSample = true;
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    const during = count();
    assert.equal(during, base + 1); // the tick's real send is out
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    // A second tick can never be admitted while the first cycle's
    // actual queue item is still unsettled.
    assert.equal(count(), during);
    // The public expiry lands while actual debt remains: the send's
    // handle expiry fails the wire truthfully, the fault latches, and
    // only the actual task settle — never the public timeout — could
    // release tickQueued (static evidence: the private flag is reset
    // from lifetime.actualSettled, not inside the queue task itself).
    clock.advance(TIMING_LIMITS.commandMs);
    // The stop is issued BEFORE flushing the expired task's promise
    // continuations: cleanup ordering cannot depend on draining them.
    const stop = monitor.stopAndReap();
    await flush();
    assert.notEqual(monitor.fault(), null);
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    // tickQueued released, but the latched fault blocks new cycles.
    assert.equal(count(), during);
    // The shutdown frame cannot ride the dead wire, stdin ends
    // privately, and the REAL exit plus BOTH closes still proves the
    // reap — a partial close keeps stop pending.
    fixture.child.exit(0);
    fixture.child.stdout.emitClose();
    await flush();
    let reaped = false;
    stop.then((r) => (reaped = r));
    await flush();
    assert.equal(reaped, false);
    fixture.child.stderr.emitClose();
    const r = await stop;
    assert.equal(r.exitCode, 0);
  } finally {
    cleanup();
  }
});

test("a latched overage stays after lower samples and never blocks cleanup", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { clock, monitor, cleanup } = env;
  try {
    await start(env);
    // A real measured overage: the admitted cycle sums residentBytes
    // over the whole discovered union and latches BOTH sticky facts.
    script.rss = 5 * 1024 ** 3;
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    let obs = monitor.lastObservation();
    assert.equal(obs.rssLimitExceeded, true);
    const peak = obs.peakRssBytes;
    assert.ok(peak >= 5 * 1024 ** 3);
    // Later lower samples can never lower the peak or clear the latch.
    script.rss = 2048;
    clock.advance(TIMING_LIMITS.sampleMs);
    await flush();
    obs = monitor.lastObservation();
    assert.equal(obs.rssLimitExceeded, true);
    assert.equal(obs.peakRssBytes, peak);
    assert.ok(obs.rssBytes < peak);
    // The overage is an accounting fact, never a fault: the monitor
    // stays healthy and a scoped native probe still answers.
    assert.equal(monitor.fault(), null);
    script.probes = { "9000:1000:0": "gone" };
    assert.equal(await monitor.probeIdentity(identity(9000)), "gone");
    // An actually owned scoped WORKLOAD signal still rides the real
    // facade and protocol — never the protected collector/supervisor.
    // `fixture` is a legal workloadKinds root kind for the scripted
    // owned tuple/image/lineage under R1.
    script.inspected[9100] = {
      pid: 9100,
      state: "live",
      process: bsdRow(9100, process.pid, 9100, 501),
      executable: "/bin/echo",
    };
    const root = await monitor.registerRoot({
      pid: 9100,
      kind: "fixture",
      expectedExecutable: "/bin/echo",
      scopeRunId: "R1",
    });
    assert.equal(
      await monitor.signalOwned({
        identity: root.identity,
        signal: "TERM",
        scopeRunId: "R1",
      }),
      "sent",
    );
    // And the latched overage never blocks the healthy cleanup path.
    const r = await monitor.stopAndReap();
    assert.equal(r.exitCode, 0);
  } finally {
    cleanup();
  }
});

test("strict root-image rejection retains both distinctive suffixes in the full marker", async (t) => {
  const { reportStoppedFault } = await import("./watchdog-lifetime.mjs");
  const prefix = "/long-shared-prefix/" + "p".repeat(180);
  const expected = prefix + "/Resources/Python.app/Contents/MacOS/Python";
  for (const actual of [prefix + "/Versions/3.11/bin/python3.11", prefix + "/wrong-image/Contents/MacOS/OtherPython"]) {
    const lines = [];
    const owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
    const script = bootScript();
    const env = setup({ lifetime: owner, script });
    t.after(async () => {
      await env.monitor.stopAndReap();
      await owner.whenSettled();
      env.cleanup();
    });
    await start(env);
    script.inspected[4242] = { pid: 4242, state: "live",
      process: bsdRow(4242, process.pid, 4242, 501), executable: actual };
    const ownBefore = env.fixture.written.filter((frame) => frame.type === "own-roots").length;
    let primary;
    const registration = env.monitor.registerRoot({ pid: 4242, kind: "python",
      expectedExecutable: expected, scopeRunId: "R1" });
    await assert.rejects(registration, (error) => {
      primary = error;
      assert.equal(error.code, "ACCOUNTING_UNAVAILABLE");
      assert.equal(error.message, `ACCOUNTING_UNAVAILABLE root executable expected ${expected} actual ${actual}`);
      return true;
    });
    reportStoppedFault(owner, "phase", primary);
    const raw = lines.at(-1);
    const marker = JSON.parse(raw.slice("TINYAZ_AWAIT ".length));
    assert.ok(Buffer.byteLength(raw) <= 256);
    assert.equal(marker.code, "ACCOUNTING_UNAVAILABLE");
    assert.equal(marker.detail, `expected=${expected.slice(-36)} actual=${actual.slice(-36)}`);
    assert.equal(env.fixture.written.filter((frame) => frame.type === "own-roots").length, ownBefore);
    await env.monitor.stopAndReap();
    await owner.whenSettled();
  }
});
