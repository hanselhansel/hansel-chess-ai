// TEST-only genuine listener proof scheduling, strict parsing and gate debt.
import test from "node:test";
import assert from "node:assert/strict";
import { createListenerProofFixture, createLsofGateFixture, finishLsofFixture } from "./process-lsof-test-fixtures.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));
const empty = () => ({ exitCode: 1, stdout: "", stderr: "" });
const held = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  promise.catch(() => {}); // Held test gates may reject before admission on the RED serial path.
  return { promise, resolve, reject };
};
const fixture = (count, onPortQuery) => createListenerProofFixture({ script: {
  roots: [{ identity: identity(100), kind: "browser", expectedExecutable: "/x", scopeRunId: "R1" }],
  rootRows: [{ identity: identity(100), ppid: 1, pgid: 100, uid: 501 }],
  inspected: { 100: { pid: 100, state: "gone" } },
  ports: Array.from({ length: count }, (_, n) => ({ address: "127.0.0.1", port: 8000 + n, ownerIdentity: identity(100), scopeRunId: "R1" })),
  onPortQuery,
} });
const run = (f) => f.proofs.queryListenersScoped("R1", f.handle, { retainActual: f.retainActual });

test("three 130ms separate port proofs finish inside the same 320ms horizon", async () => {
  let f;
  f = fixture(3, (port, { budget }) => new Promise((resolve, reject) => {
    f.clock.setTimeout(() => {
      try { budget.assertLive("port settle"); resolve(empty()); }
      catch (e) { reject(e); }
    }, 130);
  }));
  f.handle.narrow(f.clock.nowMs() + 320);
  const result = run(f);
  const observed = result.then((v) => ({ value: v }), (e) => ({ error: e }));
  try {
    await flush();
    for (let i = 0; i < 3; i++) { f.clock.advance(130); await flush(); }
    const outcome = await observed;
    assert.equal(outcome.error, undefined, "serial third proof exceeds the original horizon");
    assert.deepEqual(outcome.value, { listeners: [], unexpected: [] });
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 3);
  } finally { f.handle.dispose(); }
});

test("at most three separate bodies and deterministic registered-port association", async () => {
  const gates = Array.from({ length: 7 }, held);
  let active = 0, peak = 0;
  const f = fixture(7, async (port, opts) => {
    assert.equal(opts.budget, f.handle);
    assert.equal(opts.retainActual, f.retainActual);
    peak = Math.max(peak, ++active);
    try { return await gates[port - 8000].promise; }
    finally { active--; }
  });
  const result = run(f);
  try {
    await flush();
    assert.equal(active, 3);
    const row = (n) => ({ exitCode: 0, stdout: `p100\0f1\0n*:800${n}\0`, stderr: "" });
    for (const n of [2, 0, 1]) gates[n].resolve(row(n));
    await flush(); assert.equal(active, 3);
    for (const n of [5, 4, 3]) gates[n].resolve(row(n));
    await flush(); assert.equal(active, 1);
    gates[6].resolve(row(6));
    const value = await result;
    assert.equal(peak, 3);
    assert.deepEqual(value.unexpected.map((v) => v.listener.port), [8000,8001,8002,8003,8004,8005,8006]);
    assert.ok(value.unexpected.every((v) => v.reason === "wildcard"));
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 7);
  } finally {
    gates.forEach((g) => g.resolve(empty()));
    await result.catch(() => {}); f.handle.dispose();
  }
});

test("first fault cancels local admission, preserves identity and joins issued outcomes", async () => {
  const gates = Array.from({ length: 4 }, held);
  const first = new Error("first separate port failure");
  const f = fixture(4, (port) => gates[port - 8000].promise);
  let done = false;
  const result = run(f);
  const observed = result.then(() => { done = true; }, (e) => { done = true; return e; });
  try {
    await flush();
    gates[1].reject(first); await flush();
    assert.throws(() => f.handle.assertLive("cancelled sibling"), /ACCOUNTING_UNAVAILABLE/);
    assert.equal(done, false, "issued bodies stay joined");
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 3);
    gates[0].resolve(empty()); gates[2].reject(new Error("later sibling cancellation"));
    assert.equal(await observed, first);
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 3);
  } finally {
    gates.forEach((g) => g.resolve(empty())); await observed; f.handle.dispose();
  }
});

test("expiry cannot admit another batch or fresh holder proof", async () => {
  const gates = Array.from({ length: 4 }, held);
  const f = fixture(4, (port) => gates[port - 8000].promise);
  const result = run(f); const observed = result.catch((e) => e);
  try {
    await flush(); f.handle.narrow(0);
    gates.slice(0, 3).forEach((g) => g.resolve(empty()));
    const error = await observed;
    assert.equal(error.code, "ACCOUNTING_UNAVAILABLE");
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 3);
    assert.equal(f.calls.filter((c) => c.kind === "inspect").length, 1);
  } finally { gates.forEach((g) => g.resolve(empty())); await observed; f.handle.dispose(); }
});

test("shared genuine exec slot, queued cancellation and mandatory fd3 close keep physical debts", async () => {
  const registration = held();
  const env = createLsofGateFixture({ script: { deferredRegister: registration.promise } });
  const lifetime = createWatchdogLifetime();
  const budget = env.mk(320);
  const first = new Error("original port parser failure");
  let f;
  f = fixture(4, async (port) => {
    if (port === 8001) { await flush(); throw first; }
    await env.lq.queryPort(port, { budget, retainActual: lifetime.retainActual });
    return empty();
  });
  // The genuine gates must borrow this exact listener-operation handle.
  const result = f.proofs.queryListenersScoped("R1", budget, { retainActual: lifetime.retainActual });
  const observed = result.catch((e) => e);
  let lifetimeSettled = false;
  try {
    await flush(); await flush();
    assert.equal(env.children.length, 2);
    assert.equal(await observed, first);
    registration.resolve(); await flush();
    assert.equal(env.order.includes("transition"), false);
    assert.ok(env.children.every((c) => c.fd3.ended && c.fd3.writes.length === 0));
    lifetime.whenSettled().then(() => { lifetimeSettled = true; });
    await flush(); assert.equal(lifetimeSettled, false);
    for (const c of env.children) { c.exit(1); c.stdout.emitClose(); }
    await flush(); assert.equal(lifetimeSettled, false, "BOTH output closes are required");
    for (const c of env.children) c.stderr.emitClose();
    await lifetime.whenSettled();
    assert.equal(env.children.length, 2, "no fourth port after failure");
  } finally {
    registration.resolve();
    env.children.forEach((c) => finishLsofFixture(c, "", 1));
    await observed; await lifetime.whenSettled(); budget.dispose(); f.handle.dispose();
  }
});


test("live-PID queries settle sequentially before the first port body", async () => {
  const gates = [held(), held()];
  let index = 0;
  const f = createListenerProofFixture({ script: {
    roots: [100,101].map((pid) => ({ identity: identity(pid), kind: "browser", expectedExecutable: "/x", scopeRunId: "R1" })),
    rootRows: [100,101].map((pid) => ({ identity: identity(pid), ppid: 1, pgid: pid, uid: 501 })),
    inspected: Object.fromEntries([100,101].map((pid) => [pid, { pid, state: "live", process: { identity: identity(pid), ppid: 1, pgid: pid, uid: 501 }, executable: "/x" }])),
    ports: [{ address: "127.0.0.1", port: 8000, ownerIdentity: identity(100), scopeRunId: "R1" }],
    onQuery: () => gates[index++].promise,
  } });
  const result = run(f);
  try {
    await flush(); assert.equal(index, 1);
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 0);
    gates[0].resolve(); await flush(); assert.equal(index, 2);
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 0);
    gates[1].resolve(); await result;
    assert.deepEqual(f.calls.filter((c) => c.kind === "owned").map((c) => c.pids), [[100],[101]]);
    assert.equal(f.calls.filter((c) => c.kind === "port").length, 1);
  } finally { gates.forEach((g) => g.resolve()); await result.catch(() => {}); f.handle.dispose(); }
});

test("three concurrent genuine gates each consume their exact exec slot and physical receipt", async () => {
  const env = createLsofGateFixture();
  const lifetime = createWatchdogLifetime();
  const budget = env.mk(320);
  const f = fixture(3, async (port) => {
    await env.lq.queryPort(port, { scopeRunId: "R1", budget, retainActual: lifetime.retainActual });
    return empty();
  });
  const result = f.proofs.queryListenersScoped("R1", budget, { retainActual: lifetime.retainActual });
  try {
    await flush();
    assert.equal(env.children.length, 3);
    const frames = env.children.map((c) => JSON.parse(c.fd3.writes[0].toString()));
    assert.deepEqual(frames.map((v) => v.query), [8000,8001,8002].map((port) => ({ kind: "port", port })));
    assert.deepEqual(frames.map((v) => v.identity), [5000,5001,5002].map((pid) => identity(pid)));
    assert.equal(new Set(frames.map((v) => v.requestId)).size, 3);
    assert.ok(frames.every((v) => v.seq === 0 && v.runId === "R1"));
    env.children.toReversed().forEach((c) => finishLsofFixture(c, "", 1));
    assert.deepEqual(await result, { listeners: [], unexpected: [] });
    await lifetime.whenSettled();
  } finally {
    env.children.forEach((c) => finishLsofFixture(c, "", 1));
    await result.catch(() => {}); await lifetime.whenSettled(); budget.dispose(); f.handle.dispose();
  }
});
