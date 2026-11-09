// TEST-only genuine monitor/transport/ownership; controlled Native envelope facts.
import test from "node:test";
import assert from "node:assert/strict";
import { identity, bsdRow, sampleReply } from "./supervision-test-fixtures.mjs";
import { qualityMonitor, qualitySamples, flushQuality } from "./separate-verdicts-test-fixtures.mjs";

const old = identity(4444);
const root = async (f, startSec = "1000") => {
  f.script.inspected[4444] = { pid: 4444, state: "live",
    process: bsdRow(4444, process.pid, 4444, 501, startSec), executable: "/bin/echo" };
  return f.monitor.registerRoot({ pid: 4444, kind: "driver", expectedExecutable: "/bin/echo", scopeRunId: "R1" });
};
const gone = (f, { nativeSlow = false, cap = false } = {}) => {
  const request = qualitySamples(f).at(-1);
  const reply = sampleReply({ ...request, script: f.script });
  reply.gone = [old];
  reply.samples = reply.samples.filter((s) => s.identity.pid !== old.pid);
  if (nativeSlow) reply.finishedAtMonoNs = "501000001";
  if (cap) reply.samples[0].residentBytes = 4294967297;
  f.fixture.emit(reply);
};
const tick = async (f, ms = 250) => { f.script.muteSample = true; f.clock.advance(ms); await flushQuality(); };

test("v2 timely-after-gap admits terminal absence with full immutable ownership history", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); await root(f);
    await tick(f, 501); gone(f); await flushQuality();
    assert.equal(f.monitor.fault(), null);
    assert.equal(f.monitor.lastObservation().coverageContinuous, false);
    const count = qualitySamples(f).length;
    assert.equal(await f.monitor.probeIdentity(old), "gone");
    assert.equal(qualitySamples(f).length, count, "admitted exact absence needs no fresh native probe");
    assert.ok(f.monitor._ownership.ownedIdentities().some((i) => i.pid === old.pid));
  } finally { await f.dispose(); }
});

for (const cause of ["nativeSlow", "cap"]) {
  test(`v2 complete ${cause} gone cannot mint terminal absence`, async () => {
    const f = qualityMonitor();
    try {
      await f.start(); await root(f);
      await tick(f); gone(f, { [cause]: true }); await flushQuality();
      assert.equal(f.monitor.fault(), null);
      f.clock.advance(250); await flushQuality();
      assert.ok(qualitySamples(f).at(-1).owned.some((i) => i.pid === old.pid));
      if (cause === "nativeSlow") {
        gone(f); await flushQuality();
        const count = qualitySamples(f).length;
        assert.equal(await f.monitor.probeIdentity(old), "gone");
        assert.equal(qualitySamples(f).length, count);
      } else { f.reply(); await flushQuality(); }
    } finally { await f.dispose(); }
  });
}

test("v2 terminal exact reappearance stays hard and same PID/new birth has fresh admission", async () => {
  for (const newBirth of [false, true]) {
    const f = qualityMonitor();
    try {
      await f.start(); await root(f);
      await tick(f, 501); gone(f); await flushQuality();
      f.script.muteSample = false;
      if (newBirth) {
        await root(f, "2000");
        await tick(f);
        assert.deepEqual(qualitySamples(f).at(-1).owned.find((i) => i.pid === old.pid), identity(4444, "2000"));
        f.reply(); await flushQuality();
        assert.equal(f.monitor.fault(), null);
      } else {
        await tick(f);
        f.reply({ discovered: [bsdRow(4444, process.pid, 4444, 501)] }); await flushQuality();
        assert.match(f.monitor.fault().detail, /terminal identity reappeared/);
      }
    } finally { await f.dispose(); }
  }
});

test("v2 terminal absence and fenced cap cannot retire missing actual parent pipe", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); await root(f);
    await tick(f, 501); gone(f); await flushQuality();
    f.script.holdShutdown = true;
    const stop = f.monitor.stopAndReap();
    let settled = false;
    stop.then(() => { settled = true; });
    await flushQuality();
    f.fixture.child.exit(0); f.fixture.child.stdout.emitClose();
    await flushQuality();
    assert.equal(settled, false);
    assert.equal(f.monitor.lastObservation().resourceQuality.coverageEndNs, f.clock.nowMonoNs());
    f.fixture.child.stderr.emitClose(); await stop;
    assert.equal(settled, true);
  } finally { await f.dispose(); }
});

test("v2 already-issued numeric root proof cannot commit after the stop fence", async () => {
  const f = qualityMonitor();
  try {
    await f.start(); f.script.muteSample = true;
    const pending = root(f);
    const rejected = assert.rejects(pending, /monitor stopping/);
    await flushQuality();
    const stop = f.monitor.stopAndReap();
    f.reply(); await rejected; await stop;
    assert.equal(f.monitor._ownership.ownedIdentities().some((i) => i.pid === old.pid), false);
    assert.equal(f.fixture.written.filter((m) => m.type === "own-roots").length, 1);
  } finally { await f.dispose(); }
});

test("v2 unqueued backend work admitted before the fence cannot issue afterward", async () => {
  const f = qualityMonitor();
  try {
    await f.start();
    const backend = f.monitor.backendIdentity();
    const rejected = assert.rejects(backend, /monitor stopping/);
    const count = f.fixture.written.length;
    await f.monitor.stopAndReap(); await rejected;
    assert.equal(f.fixture.written.length, count + 1, "only authorized shutdown issues");
  } finally { await f.dispose(); }
});
