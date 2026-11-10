// PURE instrumented genuine FS/transport boundaries. Fake collector only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { accountingTrace } from "./accounting-trace.mjs";
import { footprintTrace } from "./footprint-trace.mjs";
import { privateFs, createPrivateReadStream } from "./private-fs.mjs";
import { createCollectorTransport } from "./process-transport.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { createMonitorFixture, monitorBootstrapScript, startMonitorFixture } from "./process-monitor-test-fixtures.mjs";
import { collectorFixture, fakeClock, sampleReply, identity } from "./supervision-test-fixtures.mjs";
const turn = () => new Promise((resolve) => setImmediate(resolve));
const select = (start, finish, requestId) => {
  const fact = { startedNs: String(start), finishedNs: String(finish), lastValidNs: String(start),
    gapMs: 600, preCycleGapMs: 200, cycleDurationMs: 400, nativeDurationMs: 1, coverageRounds: 1 };
  accountingTrace.cycle(fact, requestId);
  return accountingTrace.packet(Object.assign(new Error(`sample interval ${JSON.stringify(fact)}`),
    { code: "ACCOUNTING_UNAVAILABLE" }), 12);
};

test("genuine privateFs captures entry/return before dispatch and BOTH actual outcome settlements", async () => {
  const originalClock = process.hrtime.bigint, originalStat = fs.lstatSync;
  let current = 1000n, returned = false;
  const value = Object.freeze({ actual: "same result" });
  try {
    process.hrtime.bigint = () => current;
    fs.lstatSync = () => { current = 1100n; return value; };
    const actual = privateFs.lstat("/controlled");
    actual.then(() => { returned = true; });
    const pending = select(900, 1500, "FS-good");
    assert.ok(pending.includes("pending fs.lstat s=1000 r=1100 d=? err=false"));
    await Promise.resolve(); assert.equal(returned, false);
    current = 1400n;
    assert.equal(await actual, value);
    const packet = select(900, 1501, "FS-good-end");
    assert.ok(packet.includes("immediate fs.lstat s=1000 r=1100 d=1400 err=false"));
    assert.ok(packet.includes("delivery fs.lstat s=1000 r=1100 d=1400 err=false"));
    for (const [i, cause] of [null, undefined, new Error("original stat")].entries()) {
      current = 10000n + BigInt(i) * 1000n;
      const start = current;
      const immediate = 200n + BigInt(i) * 50n;
      const dispatch = 400n + BigInt(i) * 50n;
      fs.lstatSync = () => { current += immediate; throw cause; };
      const rejected = privateFs.lstat("/controlled");
      let settled = false;
      const joined = rejected.then(() => assert.fail("required rejection"), (error) => {
        settled = true; assert.equal(error, cause);
      });
      await Promise.resolve(); assert.equal(settled, false);
      current += dispatch; await joined;
      const lines = select(start, current + 1n, `FS-rejected-${i}`);
      assert.ok(lines.includes(`immediate fs.lstat s=${start} r=${start + immediate} d=${current} err=true`));
      assert.ok(lines.includes(`delivery fs.lstat s=${start} r=${start + immediate} d=${current} err=true`));
    }
  } finally { fs.lstatSync = originalStat; process.hrtime.bigint = originalClock; }
});

test("failed diagnostic clock preserves real FS original value, rejection, stream and FD closure", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trace-io-"));
  const file = path.join(root, "bytes"); fs.writeFileSync(file, "actual bytes");
  const originalClock = process.hrtime.bigint;
  try {
    for (const error of [null, undefined, false, new Error("clock")]) {
      let actual;
      try {
        process.hrtime.bigint = () => { throw error; };
        actual = privateFs.stat(file);
      } finally { process.hrtime.bigint = originalClock; }
      assert.equal((await actual).size, 12);
    }
    let rejected;
    try {
      process.hrtime.bigint = () => { throw null; };
      rejected = privateFs.stat(path.join(root, "absent"));
    } finally { process.hrtime.bigint = originalClock; }
    await assert.rejects(rejected, { code: "ENOENT" });
    const handle = await privateFs.open(file, "r");
    assert.equal((await handle.stat()).size, 12);
    await handle.close(); assert.equal(handle.fd, -1);
    let guards = 0;
    const stream = createPrivateReadStream(file, { assertEffectLive: () => { guards++; } });
    const closed = new Promise((resolve, reject) => { stream.once("close", resolve); stream.once("error", reject); });
    const chunks = []; stream.on("data", (chunk) => chunks.push(chunk));
    await closed;
    assert.equal(stream.closed, true); assert.equal(stream.fd, null);
    assert.equal(Buffer.concat(chunks).toString(), "actual bytes"); assert.ok(guards > 1);
    assert.ok(accountingTrace.stats().unavailable > 0);
  } finally { process.hrtime.bigint = originalClock; fs.rmSync(root, { recursive: true, force: true }); }
});

test("actual write/raw/frame/validation/resolve boundaries preserve synchronous receiver and reply order", async () => {
  const fixture = collectorFixture({ runId: "trace-wire" }), clock = fakeClock();
  const originalClock = process.hrtime.bigint;
  let current = 20000n;
  const order = [];
  const protocol = { accept(...args) {
    assert.equal(this, protocol); order.push(`validate-${args[1]}`);
    const result = Reflect.apply(fixture.protocol.accept, fixture.protocol, args);
    if (args[1] === "c2s" && args[2].type !== "ready") current = 20125n;
    return result;
  } };
  const transport = createCollectorTransport({ child: fixture.child, protocol, runId: "trace-wire", clock,
    onInbound: () => { order.push("inbound"); current = 20130n; } });
  const handle = createBudgetHandle({ deadlineMonoMs: clock.nowMs() + 1000, clock, nowMonoMs: clock.nowMs });
  try {
    fixture.ready();
    fixture.child.stdin.write = function (bytes) {
      assert.equal(this, fixture.child.stdin); order.push("write");
      const msg = JSON.parse(String(bytes)); fixture.written.push(msg);
      current = 20110n; fixture.emit(sampleReply({ requestId: msg.requestId }));
      current = 20140n; order.push("write-return"); return false;
    };
    process.hrtime.bigint = () => current;
    const actual = transport.send("sample", { owned: [], inspectPids: [], probes: [] }, "original-wire-request", handle);
    assert.equal((await actual).requestId, "original-wire-request");
    const lines = select(19999, 20200, "original-wire-request");
    assert.ok(lines.includes("write s=20000 e=20140 bp=true err=false"));
    assert.ok(lines.includes("frame raw=20110 full=20110"));
    assert.ok(lines.includes("valid=20125 resolve=20130 PythonNs=1"));
    assert.deepEqual(order.slice(-5), ["validate-s2c", "write", "validate-c2s", "inbound", "write-return"]);
    let physical = false; transport.whenReaped().then(() => { physical = true; });
    transport.close(); fixture.child.exit(0); fixture.child.stdout.emitClose();
    await Promise.resolve(); assert.equal(physical, false);
    fixture.child.stderr.emitClose(); assert.equal((await transport.whenReaped()).exitCode, 0);
  } finally { process.hrtime.bigint = originalClock; transport.close(); fixture.exit(0); await transport.whenReaped(); }
});

test("original write throw and expired reply cannot become a successful traced result", async () => {
  for (const mode of ["throw", "late"]) {
    const fixture = collectorFixture({ runId: `trace-${mode}` }), clock = fakeClock();
    const first = Object.assign(new Error("original write"), { code: "ORIGINAL" }), faults = [];
    const transport = createCollectorTransport({ child: fixture.child, protocol: fixture.protocol,
      runId: `trace-${mode}`, clock, onFault: (error) => faults.push(error) });
    const handle = createBudgetHandle({ deadlineMonoMs: clock.nowMs() + 10, clock, nowMonoMs: clock.nowMs });
    fixture.ready();
    fixture.child.stdin.write = () => { if (mode === "throw") throw first; return true; };
    try {
      const actual = transport.send("sample", { owned: [], inspectPids: [], probes: [] }, `held-${mode}`, handle);
      const observed = assert.rejects(actual, (error) => mode === "throw" ? error === first : error.code === "IPC_INVALID");
      if (mode === "late") {
        clock.jumpWithoutTimers(11); fixture.emit(sampleReply({ requestId: "held-late" }));
      }
      await observed;
      assert.equal(faults.length, 1); assert.equal(transport.failed, true);
      if (mode === "throw") assert.equal(faults[0], first);
    } finally { transport.close(); fixture.exit(2); await transport.whenReaped(); }
  }
  await turn();
});

test("decoded null LF faults the real framer and rejects an outstanding request without reaping", async () => {
  const fixture = collectorFixture({ runId: "null-frame", script: { muteSample: true } });
  const clock = fakeClock(), faults = [];
  const transport = createCollectorTransport({ child: fixture.child, protocol: fixture.protocol,
    runId: "null-frame", clock, onFault: error => faults.push(error) });
  const handle = createBudgetHandle({ deadlineMonoMs: clock.nowMs() + 1000, clock, nowMonoMs: clock.nowMs });
  fixture.ready();
  const request = transport.send("sample", { owned: [], inspectPids: [], probes: [] }, "null-held", handle);
  // Always observe rejection before pushing malformed wire bytes. OLD throws
  // out of the stdout listener; finally then physically closes the fake child.
  const rejected = assert.rejects(request, { code: "IPC_INVALID" });
  let physical = false; transport.whenReaped().then(() => { physical = true; });
  try {
    assert.doesNotThrow(() => fixture.child.emitOut(Buffer.from("null\n")));
    await rejected;
    assert.equal(faults.length, 1); assert.equal(transport.failed, true);
    assert.equal(physical, false);
    fixture.child.exit(2); fixture.child.stdout.emitClose(); await turn();
    assert.equal(physical, false, "fault and exit cannot replace BOTH close events");
    fixture.child.stderr.emitClose(); await transport.whenReaped();
    assert.equal(physical, true);
  } finally {
    fixture.exit(2); transport.close(); await rejected; await transport.whenReaped();
  }
});

for (const expired of [true, false]) {
  test(`queued original-stop shutdown ${expired ? "cannot write after C" : "writes before C and retains physical debt"}`, async () => {
    const f = createMonitorFixture({ script: monitorBootstrapScript() });
    let stop = null;
    try {
      await startMonitorFixture(f);
      const write = f.fixture.child.stdin.write;
      let blocked = false;
      f.fixture.child.stdin.write = (...args) => {
        const frame = JSON.parse(String(args[0]));
        if (frame.type === "shutdown") { f.fixture.written.push(frame); return true; }
        const result = write(...args);
        if (frame.type === "sample") { blocked = true; return false; }
        return result;
      };
      const tuple = identity(9000), before = f.fixture.written.length;
      const prior = f.monitor.probeIdentity(tuple);
      assert.equal(await prior, "same-live"); // Actual reply, still awaiting drain.
      assert.equal(f.fixture.written.length, before + 1);
      assert.equal(f.fixture.written.at(-1).type, "sample");
      assert.deepEqual(f.fixture.written.at(-1).probes, [tuple]);
      assert.equal(blocked, true);
      assert.equal(f.fixture.child.stdin.listenerCount("drain"), 1);
      stop = f.monitor.stopAndReap({ deadlineMonoMs: f.clock.nowMs() + 50 });
      const outcome = stop.then(value => ({ value }), error => ({ error }));
      await turn();
      const shutdowns = () => f.fixture.written.filter(frame => frame.type === "shutdown");
      assert.equal(shutdowns().length, 0, "shutdown is queued behind actual backpressure");
      let physical = false;
      processMonitorLifetime(f.monitor).whenSettled().then(() => { physical = true; });
      if (expired) f.clock.jumpWithoutTimers(51);
      f.fixture.child.stdin.emit("drain");
      assert.equal(shutdowns().length, expired ? 0 : 1);
      if (expired) { f.clock.advance(0); assert.equal((await outcome).error.code, "CLEANUP_UNPROVEN"); }
      assert.equal(physical, false, "deadline refusal never fabricates physical settlement");
      f.fixture.child.exit(0); f.fixture.child.stdout.emitClose(); await turn();
      assert.equal(physical, false);
      f.fixture.child.stderr.emitClose();
      if (!expired) assert.equal((await outcome).value.exitCode, 0);
      await processMonitorLifetime(f.monitor).whenSettled();
      assert.equal(physical, true);
    } finally {
      f.fixture.exit(0);
      if (stop) await stop.catch(() => {});
      else await f.monitor.stopAndReap().catch(() => {});
      await processMonitorLifetime(f.monitor).whenSettled(); f.cleanup();
    }
  });
}

// Breaking inert diagnostics must not duplicate/replace a genuine syscall or debt.
test("scan attribution clock faults preserve original FS value error and physical close", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scan-trace-fault-"));
  const file = path.join(root, "bytes"); fs.writeFileSync(file, "same bytes");
  const originalClock = process.hrtime.bigint, originalStat = fs.lstatSync;
  const error = new Error("original syscall"), id = footprintTrace.issue();
  let calls = 0;
  try {
    fs.lstatSync = (...args) => { calls++; return originalStat(...args); };
    let actual;
    try {
      process.hrtime.bigint = () => { throw null; };
      actual = footprintTrace.run(id, () => {
        footprintTrace.started(1000); return privateFs.lstat(file);
      });
    } finally { process.hrtime.bigint = originalClock; }
    assert.equal((await actual).size, 10); assert.equal(calls, 1);
    fs.lstatSync = () => { calls++; throw error; };
    let rejected;
    try {
      process.hrtime.bigint = () => { throw undefined; };
      rejected = footprintTrace.run(id, () => {
        footprintTrace.started(1000); return privateFs.lstat(file);
      });
    } finally { process.hrtime.bigint = originalClock; }
    await assert.rejects(rejected, value => value === error); assert.equal(calls, 2);
    const handle = await footprintTrace.run(id, () => privateFs.open(file, "r"));
    assert.equal((await handle.stat()).size, 10);
    await handle.close(); assert.equal(handle.fd, -1);
    assert.ok(footprintTrace.snapshot().stats.unavailable > 0);
  } finally {
    process.hrtime.bigint = originalClock; fs.lstatSync = originalStat;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
