// PURE genuine fault integration. No actual Native/process/browser/model work.
import test from "node:test";
import assert from "node:assert/strict";
import { createMonitorFixture, monitorBootstrapScript, startMonitorFixture } from "./process-monitor-test-fixtures.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createWatchdogFaultRecorder } from "./watchdog-faults.mjs";
const turn = () => new Promise((resolve) => setImmediate(resolve));
const decode = (line) => JSON.parse(line.slice("TINYAZ_AWAIT ".length));

test("genuine first accounting failure retains original cause then supplies bounded runtime timing",async()=>{
  const lines=[];
  const owner=createWatchdogLifetime({reportAwaitStage:(line)=>lines.push(line)});
  const f=createMonitorFixture({script:monitorBootstrapScript(),lifetime:owner});
  const bound=f.clock.nowMs()+30000;
  const faults=createWatchdogFaultRecorder({nowNs:()=>f.clock.nowMonoNs(),lifetime:owner,scope:"phase"});
  try {
    await startMonitorFixture(f);
    f.clock.jumpWithoutTimers(600); // Existing real guard, not a mirrored predicate.
    let first;
    await assert.rejects(f.monitor.sample({deadlineMonoMs:bound}),e=>{first=e;return e.code==="ACCOUNTING_UNAVAILABLE";});
    faults.recordFault(first);await turn();
    assert.equal(faults.faults.length,1);
    assert.equal(decode(lines[0]).stage,"supervisor.fault");
    assert.equal(decode(lines[0]).code,"ACCOUNTING_UNAVAILABLE");
    assert.ok(lines.some(line=>decode(line).stage==="accounting.trace"),"actual fault lane needs selected runtime timing");
  } finally {
    f.fixture.exit(2);await f.monitor.stopAndReap({deadlineMonoMs:bound});
    await processMonitorLifetime(f.monitor).whenSettled();f.cleanup();
  }
});

import { createAccountingTrace } from "./accounting-trace.mjs";
import { observeAwaitStage, reportSupervisorFault, reportStoppedFault } from "./watchdog-lifetime.mjs";
const fault = (facts) => Object.assign(new Error(`ACCOUNTING_UNAVAILABLE sample interval ${JSON.stringify(facts)}`),
  { code: "ACCOUNTING_UNAVAILABLE" });
const cycleFacts = (start = "100", finish = "500") => ({ startedNs: start, finishedNs: finish,
  lastValidNs: "90", gapMs: 600, preCycleGapMs: 250, cycleDurationMs: 350,
  nativeDurationMs: 10, coverageRounds: 1 });

test("completed success and rejected results retain exact immediate/delivery spans and pending crossings", () => {
  let clock = "100";
  const trace = createAccountingTrace({ nowNs: () => clock });
  const a = trace.fsBegin("fs.stat");
  clock = "180"; trace.fsReturn(a, false);
  clock = "260"; trace.fsDeliver(a);
  clock = "270"; const b = trace.fsBegin("fd.write");
  clock = "300"; trace.fsReturn(b, true);
  clock = "490"; trace.fsDeliver(b);
  clock = "320"; const held = trace.fsBegin("stream.read");
  clock = "330"; trace.fsReturn(held, false);
  const facts = cycleFacts(); trace.cycle(facts, "original-request");
  const lines = trace.packet(fault(facts), 12);
  assert.ok(lines.includes("immediate fs.stat s=100 r=180 d=260 err=false"));
  assert.ok(lines.includes("delivery fd.write s=270 r=300 d=490 err=true"));
  assert.ok(lines.includes("pending stream.read s=320 r=330 d=? err=false"));
  assert.equal(trace.stats().pending, 1); // Diagnostic data is never a real receipt.
  clock = "550"; trace.fsDeliver(held);
  assert.equal(trace.stats().pending, 0);
  assert.ok(trace.packet(fault(facts), 12).some((s) => s.startsWith("delivery stream.read")));
});

test("maxima use their own overlap interval and never infer missing/ambiguous cycles", () => {
  let clock = "1";
  const trace = createAccountingTrace({ nowNs: () => clock });
  const a = trace.fsBegin("fs.stat");
  clock = "80"; trace.fsReturn(a, false); // Immediate is BEFORE gap start90.
  clock = "200"; trace.fsDeliver(a);
  const facts = cycleFacts(); trace.cycle(facts, "first");
  assert.ok(trace.packet(fault(facts), 12).includes("immediate missing"));
  assert.ok(trace.packet(fault(facts), 12).some((s) => s.startsWith("delivery fs.stat")));
  trace.cycle(facts, "different-owner");
  assert.ok(trace.packet(fault(facts), 12).includes("cycle missing; no inferred failed interval"));
  assert.ok(trace.stats().unavailable > 0);
});

test("bounded windows evict scalar data, expose loss and never retain untrusted resources", () => {
  let clock = 0n;
  const trace = createAccountingTrace({ nowNs: () => String(++clock) });
  for (let i = 0; i < 90; i++) trace.fsBegin("fs.stat");
  for (let i = 0; i < 20; i++) {
    trace.raw(`run-${i}`); trace.wire(`request-${i}`, "write");
    trace.cycle(cycleFacts(String(i), String(i + 1)), `request-${i}`);
    clock += 1000000000n;
    const id = trace.fsBegin("fs.lstat"); trace.fsReturn(id, i % 2 === 0); trace.fsDeliver(id);
  }
  const stats = trace.stats();
  assert.equal(stats.pending, 63); assert.equal(stats.buckets, 8);
  assert.equal(stats.wires, 16); assert.equal(stats.raws, 8); assert.equal(stats.cycles, 8);
  assert.ok(stats.dropped > 0);
  trace.fsBegin("/secret/path"); trace.wire("/secret/path", "write");
  trace.wire("request", "validated", { startedAtMonoNs: Buffer.alloc(3), finishedAtMonoNs: Promise.resolve() });
  const lines = trace.packet({ code: "STORE_ACCOUNTING" }, 2);
  assert.equal(lines.length, 2); assert.ok(lines[0].includes("truncated=true"));
  assert.ok(lines.every((s) => s.length <= 96));
  assert.ok(!JSON.stringify(lines).includes("/secret"));
  assert.deepEqual(trace.packet({ code: "OTHER" }, 12), []);
  assert.deepEqual(trace.packet({ code: "STORE_ACCOUNTING" }, 0), []);
});

test("arbitrary diagnostic clock/getter errors remain contained without extra timers or IO", () => {
  for (const thrown of [null, undefined, false, new Error("diagnostic clock")]) {
    const trace = createAccountingTrace({ nowNs: () => { throw thrown; } });
    assert.doesNotThrow(() => {
      trace.fsBegin("fs.stat"); trace.fsReturn(1, true); trace.fsDeliver(1);
      trace.raw("run"); trace.frame("run"); trace.wire("request", "write");
      trace.cycle(cycleFacts(), "request");
      trace.packet(Object.defineProperty({}, "code", { get() { throw thrown; } }), 12);
    });
    assert.ok(trace.stats().unavailable > 0);
  }
});

test("first emissions belong independently to nested owners and phase/selftest in one lifetime", async () => {
  const lines = [], error = Object.assign(new Error("original"), { code: "ACCOUNTING_UNAVAILABLE" });
  const parent = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(["parent", decode(line)]) });
  const nested = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(["nested", decode(line)]) });
  for (const [owner, scope] of [[nested, "selftest"], [parent, "phase"], [parent, "selftest"]]) {
    const recorder = createWatchdogFaultRecorder({ nowNs: () => 1n, lifetime: owner, scope });
    recorder.recordFault(error); recorder.recordFault(new Error("second"));
    await turn();
    assert.equal(recorder.faults.length, 2);
    const count = lines.length; reportStoppedFault(owner, scope, error);
    assert.equal(lines.length, count + 1, "same scope cannot emit another packet");
  }
  for (const [name, scope] of [["nested", "selftest"], ["parent", "phase"], ["parent", "selftest"]]) {
    const group = lines.filter(([n, row]) => n === name && row.scope === scope).map(([, row]) => row);
    assert.equal(group[0].stage, "supervisor.fault");
    assert.equal(group[0].message, "original");
    assert.ok(group.some((row) => row.stage === "accounting.trace"));
  }
});

test("same64-marker budget preserves first cause and contains reentrant/throwing reporters", async () => {
  const error = Object.assign(new Error("first cause"), { code: "STORE_ACCOUNTING" });
  for (const used of [60, 63, 64]) {
    const lines = [], owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
    for (let i = 0; i < used; i++) reportStoppedFault(owner, "phase", { code: "OTHER" });
    reportSupervisorFault(owner, "phase", error);
    assert.equal(lines.length, 64);
    if (used < 64) {
      const first = decode(lines[used]);
      assert.equal(first.stage, "supervisor.fault"); assert.equal(first.message, "first cause");
    }
    assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
    assert.ok(lines.reduce((a, line) => a + Buffer.byteLength(line), 0) <= 64 * 256);
  }
  let called = 0, owner;
  owner = createWatchdogLifetime({ reportAwaitStage: () => {
    called++; reportSupervisorFault(owner, "selftest", error); throw null;
  } });
  reportSupervisorFault(owner, "phase", error);
  assert.equal(called, 1, "a failed original output cannot issue trace output");
  const rejected = Promise.reject(error);
  assert.equal(observeAwaitStage(owner, "phase", "records.finalize", () => rejected), rejected);
  await assert.rejects(rejected, (e) => e === error);
  await owner.whenSettled();
});


test("retained Store age decision selects process-wide spans without refreshing its scan clock", () => {
  let clock = "1000000000";
  const trace = createAccountingTrace({ nowNs: () => clock });
  const id = trace.fsBegin("fs.lstat");
  clock = "1200000000"; trace.fsReturn(id, true);
  clock = "2100000000"; trace.fsDeliver(id);
  const error = { code: "STORE_ACCOUNTING", detail: JSON.stringify({ classification: "age-exceeded",
    sampleStartMs: 1000, nowMs: 2100, ageMs: 1100 }) };
  const lines = trace.packet(error, 12);
  assert.ok(lines.includes("footprint start=1000000000 decision=2100000000"));
  assert.ok(lines.includes("delivery fs.lstat s=1000000000 r=1200000000 d=2100000000 err=true"));
  assert.ok(lines.includes("wire missing"));
  assert.equal(clock, "2100000000"); // Packet consumes no additional validity-clock reading.
  let accessorReads = 0;
  assert.deepEqual(trace.packet(Object.defineProperty({}, "code", { get() { accessorReads++; throw null; } }), 12), []);
  assert.equal(accessorReads, 0);
});

import { createProcessObservation } from "./process-observation.mjs";
import { createOwnership } from "./process-ownership.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { fakeClock, sampleReply } from "./supervision-test-fixtures.mjs";

test("diagnostic correlation uses issued requestId without reading an injected reply accessor", async () => {
  const timer = fakeClock(), order = [];
  let reads = 0, clockReads = 0;
  const handle = createBudgetHandle({ deadlineMonoMs: 100000, clock: timer, nowMonoMs: timer.nowMs });
  const ownership = createOwnership({ runId: "accessor" });
  const actualOwned = ownership.ownedIdentities;
  const proxy = { ...ownership, ownedIdentities: () => { order.push("owned"); return actualOwned(); } };
  const observer = createProcessObservation({ ownership: proxy, requireHealthy: () => {},
    nextRid: () => { order.push("nextRid"); return "issued-RID"; },
    send: async (type, payload, requestId) => {
      order.push("send");
      return Object.defineProperty(sampleReply({ requestId, owned: payload.owned }), "requestId", {
        get() { reads++; throw new Error("diagnostic accessor"); },
      });
    },
    clock: { nowMonoNs: () => String(clockReads++ === 0 ? 1000000000 : 1600000000) },
    state: () => ({ lastValidNs: "1000000000", stickyFault: null }),
    commitCycle: () => assert.fail("late sample cannot commit"),
  });
  try {
    await assert.rejects(observer.runCycle(handle), (error) => error.code === "ACCOUNTING_UNAVAILABLE" &&
      error.message.startsWith("ACCOUNTING_UNAVAILABLE sample interval "));
    assert.equal(reads, 0); assert.deepEqual(order.slice(0, 3), ["owned", "nextRid", "send"]);
  } finally { handle.dispose(); assert.equal(timer.pendingTimeouts(), 0); }
});
