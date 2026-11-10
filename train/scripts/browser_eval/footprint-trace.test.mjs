// PURE diagnostic controls. Removing identity/coverage guards must fail these.
import test from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createFootprintTrace } from "./footprint-trace.mjs";

const sample = () => ({ observedAtMs: 1000, chargedBytes: 4096, accountingValid: true });
const stale = () => Object.assign(new Error("original stale"), { code: "STORE_ACCOUNTING" });
const fixture = () => {
  let time = 1000000000n, cpu = 10;
  const trace = createFootprintTrace({ nowNs: () => String(time),
    cpuUsage: () => ({ user: cpu, system: cpu * 2 }) });
  const publish = (value = sample()) => {
    const id = trace.issue();
    trace.run(id, () => trace.started(1000));
    time += 100n; cpu += 1;
    trace.completed(id, value); trace.published(id, value);
    return { id, value };
  };
  return { trace, publish, advance: () => { time += 100n; } };
};
const bind = (trace, value, now = 2001, role = "pre-reservation", error = stale()) => {
  trace.consume(value, now, role);
  trace.bindStaleError(error, value, now, role);
  return error;
};

// Missing exact-object association must never fall back to same-clock matching.
test("different same-time samples retain distinct scans and immutable failure facts", () => {
  const { trace, publish } = fixture();
  const a = publish(), b = publish(), clone = { ...a.value };
  trace.copy(a.value, clone);
  const error = bind(trace, clone);
  const first = trace.snapshot().failures[0];
  assert.equal(first.binding, "exact"); assert.equal(first.consumer.scanId, a.id);
  assert.notEqual(first.consumer.scanId, b.id);
  assert.equal(first.consumer.role, "pre-reservation"); assert.equal(first.consumer.ageMs, 1001);
  assert.equal(first.scan.observedAtMs, 1000);
  assert.equal(first.scan.cpuUserUs, 1); assert.equal(first.scan.cpuSystemUs, 2);
  a.value.observedAtMs = 99;
  for (let i = 0; i < 9; i++) publish();
  const retained = trace.snapshot().failures[0];
  assert.deepEqual(retained, first, "later source mutation/scan eviction cannot rewrite captured scalars");
  assert.ok(trace.packet(error, 12).some(line => line.includes("binding=exact")));
  assert.ok(trace.packet({ cause: error }, 12).some(line => line.includes(`scan=${a.id}`)));
  assert.ok(trace.snapshot().stats.scanEvicted > 0);
});

test("ambiguous sample and consumer identities are visible rather than latest-wins", () => {
  const f = fixture(), shared = sample();
  f.publish(shared); f.publish(shared);
  const ambiguous = bind(f.trace, shared);
  assert.ok(f.trace.packet(ambiguous, 12).some(line => line.includes("binding=ambiguous")));
  const good = f.publish();
  f.trace.consume(good.value, 2001, "post-write");
  const duplicate = bind(f.trace, good.value, 2001, "post-write");
  assert.ok(f.trace.packet(duplicate, 12).some(line => line.includes("binding=ambiguous")));
  const absent = bind(f.trace, { ...good.value });
  assert.ok(f.trace.packet(absent, 12).some(line => line.includes("binding=missing")));
});

test("sample32 consumer16 failure8 windows evict without inventing associations", () => {
  const f = fixture(), old = f.publish();
  for (let i = 0; i < 40; i++) f.trace.copy(old.value, sample());
  const target = sample(); f.trace.copy(old.value, target);
  const missing = bind(f.trace, target);
  assert.ok(f.trace.packet(missing, 12).some(line => line.includes("binding=missing")));
  const current = f.publish();
  f.trace.consume(current.value, 2001, "post-write");
  for (let i = 0; i < 17; i++) f.trace.consume(current.value, 3000 + i, "post-write");
  const evicted = stale(); f.trace.bindStaleError(evicted, current.value, 2001, "post-write");
  assert.ok(f.trace.packet(evicted, 12).some(line => line.includes("binding=missing")));
  const first = bind(f.trace, current.value, 5000);
  for (let i = 0; i < 9; i++) bind(f.trace, current.value, 6000 + i);
  assert.ok(f.trace.packet(first, 12).some(line => line.includes("binding=missing")));
  const state = f.trace.snapshot();
  assert.equal(state.stats.sampleKeys, 32); assert.equal(state.consumers.length, 16);
  assert.equal(state.failures.length, 8); assert.ok(state.stats.errorEvicted > 0);
  assert.ok(state.stats.consumerEvicted > 0); assert.ok(state.stats.sampleEvicted > 0);
  assert.ok(Buffer.byteLength(JSON.stringify(state)) <= 65536);
});

test("evicting an in-flight scan leaves later updates missing and cannot recreate it", () => {
  const f = fixture(), id = f.trace.issue();
  f.trace.run(id, () => f.trace.started(1000));
  for (let i = 0; i < 9; i++) f.publish();
  const value = sample(); f.trace.completed(id, value); f.trace.published(id, value);
  const error = bind(f.trace, value);
  assert.ok(f.trace.packet(error, 12).some(line => line.includes("binding=missing")));
  assert.ok(!f.trace.snapshot().scans.some(scan => scan.id === id));
});

test("scoped wrapper returns exact values/promises and invokes every original body once", async () => {
  const original = AsyncLocalStorage.prototype.run;
  for (const mode of ["normal", "before", "after"]) {
    AsyncLocalStorage.prototype.run = function (...args) {
      if (mode === "before") throw null;
      const value = Reflect.apply(original, this, args);
      if (mode === "after") throw undefined;
      return value;
    };
    try {
      const { trace } = fixture(), id = trace.issue();
      for (const value of [false, undefined, { exact: true }, Promise.resolve("same")]) {
        let calls = 0;
        assert.equal(trace.run(id, () => { calls++; return value; }), value);
        assert.equal(calls, 1);
      }
      for (const thrown of [null, undefined, new Error("body")]) {
        let calls = 0, caught = false;
        try { trace.run(id, () => { calls++; throw thrown; }); }
        catch (error) { caught = true; assert.equal(error, thrown); }
        assert.equal(caught, true); assert.equal(calls, 1);
      }
      const error = new Error("promise rejection"), rejected = Promise.reject(error);
      const observed = assert.rejects(rejected, value => value === error);
      assert.equal(trace.run(id, () => rejected), rejected); await observed;
    } finally { AsyncLocalStorage.prototype.run = original; }
  }
});

test("reentrant and hostile diagnostic providers are inert and never read accessors", () => {
  for (const thrown of [null, undefined, false, new Error("diagnostic")]) {
    const trace = createFootprintTrace({ nowNs: () => { throw thrown; }, cpuUsage: () => { throw thrown; } });
    const id = trace.issue(), value = sample();
    assert.doesNotThrow(() => {
      trace.run(id, () => trace.started(1000)); trace.completed(id, value); trace.published(id, value);
      trace.copy(value, { ...value }); bind(trace, value);
    });
    assert.ok(trace.snapshot().stats.unavailable > 0);
  }
  let trace, entered = false;
  trace = createFootprintTrace({ nowNs: () => {
    if (!entered) { entered = true; trace.issue(); }
    return "1000";
  }, cpuUsage: () => ({ user: 1, system: 2 }) });
  trace.issue(); assert.ok(trace.snapshot().stats.unavailable > 0);
  let reads = 0;
  const hostile = Object.defineProperty({}, "observedAtMs", { get() { reads++; throw null; } });
  const id = trace.issue(); trace.published(id, hostile); bind(trace, hostile);
  const error = Object.defineProperty({}, "code", { get() { reads++; throw null; } });
  assert.deepEqual(trace.packet(error, 12), []); assert.equal(reads, 0);
});

test("scan-local FS summaries reject reversed spans and report bounded sum overflow", () => {
  const { trace } = fixture(), id = trace.issue();
  trace.run(id, () => {
    trace.started(1000);
    assert.equal(trace.fsBegin("fs.lstat", "1"), id);
    trace.fsReturn(id, "fs.lstat", "1", "11", false);
    trace.fsDeliver(id, "fs.lstat", "1", "11", "31", false);
    trace.fsBegin("fs.readdir", "9");
    trace.fsReturn(id, "fs.readdir", "9", "1", true);
    trace.fsDeliver(id, "fs.readdir", "9", "1", "0", true);
    for (let i = 0; i < 2; i++) {
      trace.fsBegin("fs.stat", "0");
      trace.fsReturn(id, "fs.stat", "0", "999999999999999999999999", false);
      trace.fsDeliver(id, "fs.stat", "0", "999999999999999999999999", "999999999999999999999999", false);
    }
  });
  assert.equal(trace.fsBegin("fs.lstat", "1"), undefined, "unrelated work has no scan");
  const scan = trace.snapshot().scans[0];
  assert.equal(scan.fs.lstat.syncNs, "10"); assert.equal(scan.fs.lstat.deliveryNs, "20");
  assert.equal(scan.fs.readdir.rejected, 1); assert.equal(scan.partial, true);
  assert.ok(trace.snapshot().stats.overflow > 0);
  for (const budget of [0, 1, 4, 12, 100]) {
    const value = sample(); trace.published(id, value);
    const lines = trace.packet(bind(trace, value, 2001 + budget), budget);
    assert.ok(lines.length <= Math.min(12, budget)); assert.ok(lines.every(line => line.length <= 96));
  }
});

// Failed nested scope setup must not charge its work to an inherited outer scan.
test("failed nested context setup quarantines inherited asynchronous attribution", async () => {
  const f = fixture(), outer = f.trace.issue(), nested = f.trace.issue();
  const original = AsyncLocalStorage.prototype.run;
  let calls = 0;
  const result = f.trace.run(outer, () => {
    f.trace.started(1000);
    AsyncLocalStorage.prototype.run = () => { throw new Error("setup"); };
    try {
      return f.trace.run(nested, () => {
        calls++; f.trace.started(1000);
        assert.equal(f.trace.fsBegin("fs.lstat", "1"), undefined);
        return Promise.resolve().then(() => f.trace.fsBegin("fs.readdir", "2"));
      });
    } finally { AsyncLocalStorage.prototype.run = original; }
  });
  assert.equal(await result, undefined); assert.equal(calls, 1);
  const rows = f.trace.snapshot().scans;
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.contextUnavailable, true); assert.equal(row.partial, true);
    assert.equal(row.fs.lstat.issued, 0); assert.equal(row.fs.readdir.issued, 0);
  }
  assert.equal(rows.find(row => row.id === nested).startNs, null);
});

// A decreasing/hostile CPU reading cannot become a causal CPU attribution.
test("invalid CPU deltas remain unavailable and sample getter selection stays inert", () => {
  let reads = 0, cpu = 10;
  const trace = createFootprintTrace({ nowNs: () => "1000", cpuUsage: () => ({ user: cpu, system: cpu }) });
  const id = trace.issue(); cpu = 9; trace.completed(id, sample());
  const row = trace.snapshot().scans[0];
  assert.equal(row.cpuUserUs, null); assert.equal(row.cpuSystemUs, null); assert.equal(row.partial, true);
  const hostileCpu = createFootprintTrace({ cpuUsage: () => Object.defineProperty({}, "user", {
    get() { reads++; throw new Error("no getter"); },
  }) });
  hostileCpu.issue(); assert.ok(hostileCpu.snapshot().stats.unavailable > 0); assert.equal(reads, 0);
});

// Rebinding a previously ambiguous error must never recover latest-wins evidence.
test("error identity ambiguity stays sticky through A then B then B", () => {
  const { trace, publish } = fixture(), a = publish(), b = publish();
  const error = bind(trace, a.value);
  assert.ok(trace.packet(error, 12).some(line => line.includes("binding=exact")));
  trace.consume(b.value, 2001, "post-write");
  trace.bindStaleError(error, b.value, 2001, "post-write");
  assert.ok(trace.packet(error, 12).some(line => line.includes("binding=ambiguous")));
  const before = trace.snapshot().failures.at(-1);
  trace.bindStaleError(error, b.value, 2001, "post-write");
  assert.ok(trace.packet(error, 12).some(line => line.includes("binding=ambiguous")),
    "a repeated binding to B cannot erase earlier contradictory identity evidence");
  assert.deepEqual(before.consumer, trace.snapshot().failures.at(-1).consumer);
});
