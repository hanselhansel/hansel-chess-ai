// Exact private owner bodies with a controlled verifier dependency only in
// this AST-selected test realm. Production exposes no verifier injection.
import assert from "node:assert/strict";
import test from "node:test";
import { promises as fsp } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord, assertCommonIdentity } from "./record-schema.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createWatchdogLifetime, assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";
import { fixtureWorkspace, fixtureManifest } from "./test-fixtures.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";
import { createFinalIntegrity } from "./final-integrity.mjs";

const source = await fsp.readFile(new URL("./final-integrity.mjs", import.meta.url), "utf8");
const tree = ts.createSourceFile("final-integrity.mjs", source, ts.ScriptTarget.Latest, true);
const body = tree.statements.filter((node) => !ts.isImportDeclaration(node))
  .map((node) => node.getText(tree).replace(/^export /, "")).join("\n");
const compile = (verifyIdentity, overrides = {}) => {
  const bindings = { path, canonicalBytes, parseCanonicalBytes, sha256Bytes, assertRecord, assertCommonIdentity,
    isObj, exactFields, createBudgetHandle, assertWatchdogLifetime, issueActual, verifyIdentity, ...overrides };
  return new Function(...Object.keys(bindings), `${body}\nreturn createFinalIntegrity`)(...Object.values(bindings));
};
function fixture(t, behavior = async (args) => args.expectedCommonIdentity, overrides = {}) {
  const clock = fakeClock();
  const lifetime = createWatchdogLifetime();
  const workspace = fixtureWorkspace();
  const manifest = fixtureManifest({ workspace });
  const expected = structuredClone(workspace.commonIdentity);
  const args = { workspaceId: workspace.workspaceId, runId: manifest.runId, phase: manifest.phase,
    expectedCommonIdentity: structuredClone(expected), inputs: structuredClone(manifest.inputs) };
  const options = { workspaceRoot: "/unit-workspace", manifest, expectedCommonIdentity: expected,
    workEndMonoMs: clock.nowMs() + 100000, lifetime };
  const releases = [];
  const bodies = new Set();
  const calls = [];
  const factory = compile(async (observed, context) => {
    calls.push({ args: observed, context, originalEnd: context.budget.deadlineMonoMs() });
    return behavior(observed, context);
  }, overrides);
  const owner = factory(options, { clock, nowMonoMs: clock.nowMs });
  const own = (promise) => {
    bodies.add(promise);
    promise.then(() => bodies.delete(promise), () => bodies.delete(promise));
    return promise;
  };
  const gate = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    promise.catch(() => {});
    releases.push(() => resolve(structuredClone(expected)));
    return { promise, resolve, reject };
  };
  t.after(async () => {
    for (const release of releases) release();
    await Promise.allSettled([...bodies]);
    await lifetime.whenSettled();
  });
  return { owner, factory, options, args, expected, clock, lifetime, own, gate, calls,
    end: clock.nowMs() + 90000 };
}

test("one completed scan binds all inputs and A consumes it once without recollection", async (t) => {
  const f = fixture(t);
  const expected = structuredClone(f.expected);
  f.options.manifest.runId = "caller-mutated";
  f.options.expectedCommonIdentity.environment.hardware.model = "caller-mutated";
  await f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  assert.deepEqual(Object.keys(f.owner).sort(), ["collect", "consume", "interrupt", "isComplete"].sort());
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].originalEnd, f.end);
  assert.equal(f.calls[0].context.lifetime, f.lifetime);
  assert.equal(f.owner.isComplete(), true);
  const supplied = structuredClone(f.args);
  supplied.expectedCommonIdentity = expected;
  const result = f.owner.consume(supplied, { deadlineMonoMs: f.end + 5000 });
  assert.deepEqual(result, expected);
  assert.equal(f.calls.length, 1);
  assert.throws(() => f.owner.consume(supplied, { deadlineMonoMs: f.end + 5000 }), /consumption once/);
});

for (const changed of ["runId", "phase", "workspaceId", "inputs", "expectedCommonIdentity"]) {
  test(`A rejects the wrong ${changed} association permanently`, async (t) => {
    const f = fixture(t);
    await f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
    const bad = structuredClone(f.args);
    if (changed === "inputs") bad.inputs.model.sha256 = "a".repeat(64);
    else if (changed === "expectedCommonIdentity") bad.expectedCommonIdentity.environment.hardware.model = "wrong";
    else bad[changed] = "wrong";
    assert.throws(() => f.owner.consume(bad, { deadlineMonoMs: f.end + 5000 }), /association/);
    assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), /consumption once/);
    assert.equal(f.calls.length, 1);
  });
}

test("there is no constructor verifier/proof setter and no missing observation fallback", (t) => {
  const f = fixture(t);
  assert.throws(() => createFinalIntegrity({ ...f.options, verifyIdentity: () => f.expected }), /closed construction/);
  assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end }), /no completed own observation/);
  assert.equal(f.calls.length, 0);
});

for (const value of [null, undefined, false]) {
  test(`a falsey scanner result ${String(value)} cannot become an observation`, async (t) => {
    const f = fixture(t, async () => value);
    await assert.rejects(f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end })));
    assert.equal(f.owner.isComplete(), false);
    assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }));
  });
}

for (const raw of [null, undefined]) {
  test(`the exact first scanner rejection ${String(raw)} survives until A`, async (t) => {
    const f = fixture(t, async () => { throw raw; });
    await assert.rejects(f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end })), (error) => error === raw);
    assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), (error) => error === raw);
  });
}

test("pending interruption narrows the original handle and joins real work before returning", async (t) => {
  let entered;
  const entry = new Promise((resolve) => { entered = resolve; });
  let held;
  const f = fixture(t, async () => { entered(); return held.promise; });
  held = f.gate();
  const pending = f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  await entry;
  f.owner.interrupt("real first stop");
  assert.ok(f.calls[0].context.budget.deadlineMonoMs() <= f.clock.nowMs());
  assert.equal(f.calls[0].originalEnd, f.end);
  let zero = false;
  const joined = f.lifetime.whenSettled().then(() => { zero = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(zero, false);
  held.resolve(f.expected);
  await assert.rejects(pending);
  await joined;
  assert.equal(f.owner.isComplete(), false);
  assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }));
});

test("late completion cannot renew the original end or promote a result", async (t) => {
  let held;
  const f = fixture(t, async () => held.promise);
  held = f.gate();
  const pending = f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  await new Promise((resolve) => setImmediate(resolve));
  f.clock.advance(90000);
  held.resolve(f.expected);
  await assert.rejects(pending);
  assert.equal(f.calls[0].originalEnd, f.end);
  assert.equal(f.owner.isComplete(), false);
});

test("completed own-subrun observation survives induced stop but duplicate collection poisons it", async (t) => {
  const f = fixture(t);
  await f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  f.owner.interrupt("HEARTBEAT_TIMEOUT");
  assert.equal(f.owner.isComplete(), true);
  assert.deepEqual(f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), f.expected);
  const other = fixture(t);
  await other.own(other.owner.collect(other.args, { deadlineMonoMs: other.end }));
  await assert.rejects(other.own(other.owner.collect(other.args, { deadlineMonoMs: other.end })), /collection once/);
  assert.equal(other.owner.isComplete(), false);
  assert.throws(() => other.owner.consume(other.args, { deadlineMonoMs: other.end + 5000 }), /collection once/);
});


test("reentrant collection cannot replace pending work or its first cause", async (t) => {
  let entered;
  const entry = new Promise((resolve) => { entered = resolve; });
  let held;
  const f = fixture(t, async () => { entered(); return held.promise; });
  held = f.gate();
  const pending = f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  await entry;
  let duplicate;
  await assert.rejects(f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end })), (error) => {
    duplicate = error;
    return /collection once/.test(error.message);
  });
  assert.equal(f.calls.length, 1);
  held.resolve(f.expected);
  await assert.rejects(pending, (error) => error === duplicate);
  assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), (error) => error === duplicate);
  assert.equal(f.owner.isComplete(), false);
});


test("CPU result copying cannot complete after the original collection end", async (t) => {
  let f;
  let armed = false;
  f = fixture(t, async (args) => { armed = true; return args.expectedCommonIdentity; }, {
    parseCanonicalBytes: (bytes) => {
      const value = parseCanonicalBytes(bytes);
      if (armed) {
        armed = false;
        f.clock.advance(90000);
      }
      return value;
    },
  });
  await assert.rejects(f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end })));
  assert.equal(f.owner.isComplete(), false);
});

test("A cannot return an identity whose copy crosses its original cleanup end", async (t) => {
  let f;
  let copies = null;
  f = fixture(t, undefined, { parseCanonicalBytes: (bytes) => {
    const value = parseCanonicalBytes(bytes);
    if (copies !== null && ++copies === 2) f.clock.advance(95000);
    return value;
  } });
  await f.own(f.owner.collect(f.args, { deadlineMonoMs: f.end }));
  copies = 0;
  assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), /copied past original end/);
});

for (const changed of ["runId", "phase", "workspaceId", "inputs", "expectedCommonIdentity"]) {
  test(`collection rejects wrong ${changed} before any scanner IO`, async (t) => {
    const f = fixture(t);
    const wrong = structuredClone(f.args);
    if (changed === "inputs") wrong.inputs.model.sha256 = "a".repeat(64);
    else if (changed === "expectedCommonIdentity") wrong.expectedCommonIdentity.environment.hardware.model = "wrong";
    else wrong[changed] = "wrong";
    await assert.rejects(f.own(f.owner.collect(wrong, { deadlineMonoMs: f.end })), /collection association/);
    assert.equal(f.calls.length, 0);
    assert.equal(f.owner.isComplete(), false);
    assert.throws(() => f.owner.consume(f.args, { deadlineMonoMs: f.end + 5000 }), /collection association/);
  });
}
