// Controlled clock/purpose lanes; real monitor owner and genuine scope graph.
import test from "node:test";
import assert from "node:assert/strict";
import { createPreflightQualityScope, allowsPreflightPeriodic, assertPreflightQualityScope } from "./process-preflight-quality.mjs";
import { V2_POLICY, V3_POLICY } from "./evaluation-policy.mjs";
import { createV3GraphFixture, monitorV3, openTestScope } from "./preflight-v3-test-fixtures.mjs";

const flush = () => new Promise(setImmediate);
const scopeFor = (runId = "R1") => createPreflightQualityScope({ runId, phase: "preflight", evaluationPolicy: V3_POLICY });

test("private scope requires a genuine graph, live parent probe and original-budget admission", async (t) => {
  const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
  const scope = scopeFor();
  assert.equal(allowsPreflightPeriodic(scope.reader, "R1"), false);
  assert.doesNotThrow(() => assertPreflightQualityScope(scope, "R1"));
  for (const bad of [{ ...scope }, new Proxy(scope, {}), { reader: {}, close() {}, verifyAndOpen() {} }])
    assert.throws(() => assertPreflightQualityScope(bad, "R1"));
  assert.throws(() => allowsPreflightPeriodic(scope.reader, "another-run"));
  assert.throws(() => allowsPreflightPeriodic({}, "R1"));
  let probes = 0;
  await openTestScope(scope, graph, async () => { probes += 1; return "same-live"; });
  assert.equal(probes, 1);
  assert.equal(allowsPreflightPeriodic(scope.reader, "R1"), true);
  await assert.rejects(openTestScope(scope, graph), /scope association/);
  scope.close(); scope.close();
  assert.equal(allowsPreflightPeriodic(scope.reader, "R1"), false);
  await assert.rejects(openTestScope(scope, graph));
});

test("stop while genuine selftest verification awaits the real probe cannot reopen scope", async (t) => {
  const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
  const scope = scopeFor();
  let release, entered;
  const gate = new Promise((resolve) => { release = resolve; });
  const seen = new Promise((resolve) => { entered = resolve; });
  const pending = openTestScope(scope, graph, async () => { entered(); await gate; return "same-live"; });
  await seen; scope.close(); release();
  await assert.rejects(pending);
  assert.equal(allowsPreflightPeriodic(scope.reader, "R1"), false);
});

test("exact500ms passes;500ms+1ns is typed quality only in the opened private periodic scope", async (t) => {
  const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
  for (const extraNs of [0n, 1n]) {
    const scope = scopeFor(); await openTestScope(scope, graph);
    const f = monitorV3({ scope });
    try {
      await f.start();
      f.script.muteSample = true;
      f.clock.advance(250); await flush();
      f.clock.jumpWithoutTimers(250);
      if (extraNs) {
        const read = f.clock.nowMonoNs;
        f.clock.nowMonoNs = () => String(BigInt(read()) + extraNs);
      }
      f.reply(); await flush();
      assert.equal(f.monitor.fault(), null);
      assert.equal(f.monitor.lastObservation().resourceQuality.coverageLost, extraNs > 0n);
    } finally { scope.close(); await f.close(); }
  }
});

test("V2 preflight, unopened V3 preflight, CHECK and explicit sample retain strict timing", async (t) => {
  const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
  for (const lane of ["v2-preflight", "unopened", "check", "public-sample", "closed"]) {
    const scope = lane === "public-sample" || lane === "closed" ? scopeFor() : null;
    if (scope) await openTestScope(scope, graph);
    const f = monitorV3({ phase: lane === "check" ? "check" : "preflight", scope,
      policy: lane === "v2-preflight" ? V2_POLICY : V3_POLICY });
    try {
      await f.start();
      if (lane === "closed") scope.close();
      if (lane === "public-sample") {
        f.clock.jumpWithoutTimers(501);
        await assert.rejects(f.monitor.sample(), /ACCOUNTING_UNAVAILABLE/);
      } else {
        f.script.muteSample = true; f.clock.advance(250); await flush();
        f.clock.jumpWithoutTimers(251); f.reply(); await flush();
        assert.equal(f.monitor.fault().code, "ACCOUNTING_UNAVAILABLE");
      }
    } finally { scope?.close(); await f.close(); }
  }
});

import { createWatchdogResourceChecks } from "./watchdog-verdict-policy.mjs";
import { deriveScientificReadinessV3 } from "./preflight-readiness-v3.mjs";
import { factsV3 } from "./preflight-v3-test-fixtures.mjs";

test("V3 watchdog projection cannot soften strict prefix age before private scientific admission", async (t) => {
  const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
  const scope = scopeFor();
  const f = monitorV3({ scope });
  try {
    await f.start(); f.clock.jumpWithoutTimers(501);
    const checks = createWatchdogResourceChecks({ monitor: f.monitor, state: { finishReq: null, stopReq: null },
      recordFault() {}, latchStop() {}, makeError: (code, detail) => Object.assign(new Error(detail), { code }),
      evaluationPolicy: V3_POLICY, phase: "preflight", runId: "R1", preflightQualityReader: scope.reader,
      nowNs: f.clock.nowMonoNs });
    assert.throws(() => checks.readObservation(), /native current proof/);
    await openTestScope(scope, graph);
    assert.doesNotThrow(() => checks.readObservation());
    scope.close();
    assert.throws(() => checks.readObservation(), /native current proof/);
  } finally { scope.close(); await f.close(); }
});

for (const cap of [4294967296, 4294967297]) {
  test(`V3 live-handle fenced diagnostic ${cap} preserves clocks/counters and only observed positive cap`, async (t) => {
    const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
    const scope = scopeFor(); await openTestScope(scope, graph);
    const f = monitorV3({ scope });
    try {
      await f.start(); f.script.muteSample = true;
      f.clock.advance(250); await flush();
      const before = f.monitor.lastObservation();
      const stop = f.monitor.stopAndReap({ deadlineMonoMs: f.clock.nowMs() + 5000 });
      const request = f.fixture.written.filter((m) => m.type === "sample").at(-1);
      f.reply({ samples: request.owned.map((identity, index) => ({ identity, ppid: 1, pgid: identity.pid,
        uid: 501, residentBytes: index === 0 ? cap : 0 })) });
      await stop;
      const after = f.monitor.lastObservation();
      assert.equal(f.monitor.fault(), null);
      assert.equal(after.atMonoNs, before.atMonoNs);
      assert.equal(after.resourceQuality.lastCompleteNs, before.resourceQuality.lastCompleteNs);
      assert.equal(after.resourceQuality.completedCycles, before.resourceQuality.completedCycles);
      assert.equal(after.resourceQuality.timelyCycles, before.resourceQuality.timelyCycles);
      assert.equal(after.resourceQuality.lateDrops.count, 1);
      assert.equal(after.resourceQuality.pending, false);
      assert.equal(after.rssLimitExceeded, cap > 4294967296);
      const ready = deriveScientificReadinessV3(factsV3({ runId: "R1", resourceEvidence: after.resourceQuality }));
      assert.equal(ready.status, cap > 4294967296 ? "unready" : "ready");
      if (cap > 4294967296) assert(ready.reasons.includes("HARD_STOP"));
    } finally { scope.close(); await f.close(); }
  });
}

import { createProcessAccounting } from "./process-accounting.mjs";
import { createOwnership } from "./process-ownership.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createResourceQuality } from "./resource-quality.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { fakeClock, sampleReply, identity, bsdRow } from "./supervision-test-fixtures.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";

// Same real accounting/observation entry, genuine original handles and owned
// tuple registry. Collector replies/clock are controlled data, never Native.
function hardAggregateFixture(policy = V3_POLICY) {
  const clock = fakeClock({ startNs: 0n });
  const quality = createResourceQuality({ runId: "R1", phase: "preflight", evaluationPolicy: policy });
  const ownership = createOwnership({ runId: "R1" });
  const roots = [identity(11), identity(12)];
  for (const root of roots) ownership.registerRoot({ identity: root, kind: "driver",
    expectedExecutable: "/test/driver", scopeRunId: "R1" });
  const faults = [], calls = [];
  let last = null, stopping = false, plan = {}, commits = 0, eligible = true;
  const markFault = (error) => {
    faults.push(error);
    const reason = ["IDENTITY", "TIMESTAMP", "UNION", "AGGREGATE"].includes(error?.resourceReason)
      ? error.resourceReason : error?.code === "CLEANUP_UNPROVEN" ? "CLEANUP"
        : error?.code === "IPC_INVALID" ? "TRANSPORT" : "NATIVE";
    quality.markHard(reason);
  };
  const accounting = createProcessAccounting({ runId: "R1", pythonExecutable: PYTHON_EXECUTABLE,
    protocol: createProtocolValidator({ runId: "R1" }), ownership, clock, quality, softCompare: () => eligible,
    enqueue: (fn) => fn(), nextRid: () => `hard-${calls.length}`, lsofQueries: () => null, ownUid: () => 501,
    requireHealthy: () => { if (faults.length) throw faults[0]; }, markFault,
    state: () => ({ stopping, lastValidNs: last?.atMonoNs ?? null, lastObservation: last,
      stickyFault: faults[0] ?? null, sampling: false, nowMonoNs: clock.nowMonoNs(), pending: false }),
    commitCycle: (value) => { last = value; commits += 1; },
    send: async (type, fields, requestId) => {
      calls.push({ type, fields, requestId });
      if (plan.jumpMs) clock.jumpWithoutTimers(plan.jumpMs);
      const reply = sampleReply({ ...fields, requestId, script: { rss: 4 } });
      if (plan.rss !== undefined) reply.samples.forEach((row, index) => { row.residentBytes = index === 0 ? plan.rss : 0; });
      if (plan.revoke) eligible = false;
      if (plan.nativeSlow) reply.finishedAtMonoNs = "500000002";
      if (plan.reversed) reply.finishedAtMonoNs = "0";
      if (plan.gone) { reply.gone = [roots[1]]; reply.samples = reply.samples.slice(0, 1); }
      if (plan.reappear) reply.discovered = [bsdRow(12, 1, 12)];
      if (plan.incomplete) reply.discovered = [bsdRow(11), bsdRow(12), bsdRow(99, 11, 99)];
      if (plan.unsafe) reply.samples.forEach((row) => { row.residentBytes = Number.MAX_SAFE_INTEGER; });
      if (plan.fence) { stopping = true; quality.close(clock.nowMonoNs()); }
      calls.at(-1).reply = reply;
      return reply;
    } });
  return { quality, ownership, faults, calls, roots, clock, accounting,
    commits: () => commits,
    async run(next = {}) {
      plan = next;
      const end = clock.nowMs() + (next.expire ? 1 : 10000);
      const budget = createBudgetHandle({ deadlineMonoMs: end, clock, nowMonoMs: clock.nowMs });
      try { return await accounting.runCycle(budget, { purpose: next.purpose ?? "ordinary", originalEndNs: String(end * 1000000) }); }
      finally { budget.dispose(); assert.equal(clock.pendingTimeouts(), 0); }
    } };
}

for (const seeded of [false, true]) {
  for (const cap of [4294967296, 4294967297]) {
    test(`V3 actual ${seeded ? "seeded" : "bootstrap0"} strict Native501 retains observed ${cap} without admission`, async () => {
      const f = hardAggregateFixture();
      if (seeded) await f.run({ purpose: "bootstrap" });
      const before = f.quality.snapshot(), commits = f.commits();
      let caught;
      try { await f.run({ purpose: seeded ? "ordinary" : "bootstrap", nativeSlow: true, rss: cap }); }
      catch (error) { caught = error; }
      assert.equal(caught, f.faults[0]);
      assert.equal(caught.message, "ACCOUNTING_UNAVAILABLE native interval");
      const after = f.quality.snapshot();
      assert.equal(after.observedPeakRssBytes, cap);
      assert.equal(after.rssLimitExceeded, cap > 4294967296);
      for (const key of ["peakRssBytes", "completedCycles", "timelyCycles", "lastCompleteNs", "lastTimelyNs", "lastCoverageQualifiedNs"])
        assert.equal(after[key], before[key]);
      assert.equal(after.coverageLost, false);
      assert.equal(after.lateDrops.count, 0);
      assert.equal(f.commits(), commits);
      assert.deepEqual(after.hardReasons, ["NATIVE"]);
    });
  }
}

for (const failure of ["reappear", "unsafe", "incomplete"]) {
  test(`strict Native primary survives later ${failure} with no further sample or unsafe peak`, async () => {
    const f = hardAggregateFixture();
    await f.run({ purpose: "bootstrap", gone: failure === "reappear" });
    const before = f.quality.snapshot(), calls = f.calls.length;
    let caught;
    try { await f.run({ nativeSlow: true, rss: 4294967297, [failure]: true }); }
    catch (error) { caught = error; }
    assert.equal(caught, f.faults[0]);
    assert.equal(caught.message, "ACCOUNTING_UNAVAILABLE native interval");
    assert.equal(f.calls.length, calls + 1);
    const q = f.quality.snapshot();
    assert.equal(q.observedPeakRssBytes, before.observedPeakRssBytes);
    assert(q.hardReasons.includes({ reappear: "IDENTITY", unsafe: "AGGREGATE", incomplete: "UNION" }[failure]));
    if (failure === "incomplete") {
      const request = f.calls.at(-1);
      assert.deepEqual(request.fields.owned.map(row => row.pid).sort(), [11, 12]);
      assert.deepEqual(request.reply.discovered.map(row => row.identity.pid), [11, 12, 99]);
      assert.equal(request.reply.samples.some(row => row.identity.pid === 99), false);
      assert(f.ownership.ownedIdentities().some((row) => row.pid === 99));
      assert.equal(f.accounting.observation.isTerminalIdentity(identity(99)), false);
      assert.equal(f.commits(), 1);
      assert.equal(q.completedCycles, before.completedCycles);
    }
    if (failure === "reappear") assert.equal(f.accounting.observation.isTerminalIdentity(f.roots[1]), true);
  });
}

for (const lane of ["bootstrap0", "seeded", "prior-soft", "fenced"]) {
  test(`actual ${lane} original handle rejection retains safe cap and identical primary`, async () => {
    const f = hardAggregateFixture();
    if (lane !== "bootstrap0") await f.run({ purpose: "bootstrap" });
    if (lane === "prior-soft") await f.run({ purpose: "periodic", nativeSlow: true, jumpMs: 501 });
    const before = f.quality.snapshot(), commits = f.commits();
    let caught;
    try { await f.run({ purpose: lane === "bootstrap0" ? "bootstrap" : "periodic",
      expire: true, jumpMs: 2, fence: lane === "fenced", rss: 4294967297 }); }
    catch (error) { caught = error; }
    assert.equal(caught, f.faults[0]);
    assert.equal(caught.message, "ACCOUNTING_UNAVAILABLE observation commit");
    const after = f.quality.snapshot();
    assert.equal(after.rssLimitExceeded, true);
    assert.equal(after.completedCycles, before.completedCycles);
    assert.equal(after.lastCompleteNs, before.lastCompleteNs);
    assert.equal(after.peakRssBytes, before.peakRssBytes);
    assert.equal(f.commits(), commits);
    assert.equal(after.lateDrops.count, lane === "fenced" ? 1 : 0);
    if (lane === "bootstrap0") assert.equal(after.coverageEndNs, null);
  });
}

test("actual fence wins not-yet-evaluated scope/gap, but never an earlier Native error", async () => {
  for (const nativeSlow of [false, true]) {
    const f = hardAggregateFixture();
    await f.run({ purpose: "bootstrap" });
    const before = f.commits();
    if (nativeSlow) {
      await assert.rejects(f.run({ fence: true, nativeSlow, rss: 4294967297 }), /native interval/);
      assert.equal(f.faults[0].message, "ACCOUNTING_UNAVAILABLE native interval");
    } else {
      const value = await f.run({ purpose: "periodic", fence: true, jumpMs: 501, rss: 4294967297 });
      assert.equal(value.kind, "fenced-observation");
      assert.equal(f.faults.length, 0);
    }
    assert.equal(f.quality.snapshot().rssLimitExceeded, true);
    assert.equal(f.commits(), before);
  }
});


test("Native primary survives original expiry; live fence precedes scope revocation", async () => {
  const strict = hardAggregateFixture();
  let caught;
  try { await strict.run({ purpose: "bootstrap", nativeSlow: true, expire: true, jumpMs: 2, rss: 4294967297 }); }
  catch (error) { caught = error; }
  assert.equal(caught, strict.faults[0]);
  assert.equal(caught.message, "ACCOUNTING_UNAVAILABLE native interval");
  assert(strict.faults.some(error => error.message.includes("observation commit")));
  assert.equal(strict.quality.snapshot().rssLimitExceeded, true);
  for (const fence of [false, true]) {
    const f = hardAggregateFixture();
    await f.run({ purpose: "bootstrap" });
    const operation = f.run({ purpose: "periodic", revoke: true, fence, rss: 4294967297 });
    if (fence) assert.equal((await operation).kind, "fenced-observation");
    else await assert.rejects(operation, /periodic scope revoked/);
    assert.equal(f.quality.snapshot().rssLimitExceeded, true);
    assert.equal(f.quality.snapshot().completedCycles, 1);
  }
});

test("V2 strict early rejection and V3 malformed timestamps never retain an aggregate", async () => {
  for (const policy of [V2_POLICY, V3_POLICY]) {
    const f = hardAggregateFixture(policy);
    await assert.rejects(f.run({ purpose: "bootstrap", rss: 4294967297,
      ...(policy === V2_POLICY ? { nativeSlow: true } : { reversed: true }) }));
    const q = f.quality.snapshot();
    assert.equal(q.observedPeakRssBytes, null);
    assert.equal(q.peakRssBytes, null);
    assert.equal(q.completedCycles, 0);
    assert.equal(f.calls.length, 1);
  }
});


for (const boundary of ["graph", "probe"]) {
  for (const field of ["budget", "io"]) {
    test(`review regression: scope rejects ${field} replacement during actual ${boundary} await`, async (t) => {
      const graph = await createV3GraphFixture(t, { gap: false, parentRunId: "R1" });
      const scope = scopeFor(), { privateFs } = await import("./private-fs.mjs");
      const lstat = privateFs.lstat;
      const later = createBudgetHandle({ deadlineMonoMs: graph.budget.deadlineMonoMs() + 1000,
        nowMonoMs: () => Number(process.hrtime.bigint() / 1000000n), clock: { setTimeout, clearTimeout } });
      const context = { io: graph.io, budget: graph.budget };
      const replacement = field === "budget" ? later : Object.freeze({ retainActual: graph.io.retainActual });
      let mutations = 0, probes = 0;
      const mutate = () => { mutations += 1; context[field] = replacement; };
      if (boundary === "graph") privateFs.lstat = async (...args) => {
        const value = await lstat(...args);
        if (!mutations) { await new Promise(setImmediate); mutate(); }
        return value;
      };
      try {
        await assert.rejects(scope.verifyAndOpen({ workspaceRoot: graph.env.workspaceRoot,
          completionRef: graph.nested.completionRef, parentRunId: "R1",
          parentSupervisor: graph.nested.manifest.owner.supervisor, expectedIdentity: graph.workspace.commonIdentity,
          probeIdentity: async () => { probes += 1; if (boundary === "probe") { await new Promise(setImmediate); mutate(); } return "same-live"; } },
        context, () => graph.budget.assertLive("original scope caller")));
        assert.equal(mutations, 1);
        assert.equal(probes, boundary === "graph" ? 0 : 1, "changed graph context cannot admit the parent probe");
        assert.equal(context[field], replacement, "caller references remain mutable");
        assert.equal(allowsPreflightPeriodic(scope.reader, "R1"), false);
      } finally { privateFs.lstat = lstat; scope.close(); later.dispose(); }
    });
  }
}
