// TEST only. Genuine Native and real-clock delivery stimulus. No phase/cohort
// result. Root source review and a separate exact execution GO precede use.
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import os from "node:os";
import { mkdirSync, realpathSync } from "node:fs";
import { privateFs } from "./private-fs.mjs";
import { fileURLToPath } from "node:url";
import { createNativeTestHarness } from "./native-test-fixtures.mjs";
import { createNativeFixtureWaits } from "./native-fixture-protocol.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { issueActual, openActual, writeAll } from "./artifact-files.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 4194304;
const DELAY_MS = 650;

// Wrap dispatch only. Every held event keeps original receiver/args/bytes and
// relative order. No listener is replaced, no frame/result/close is invented.
// The first data after arm is the actual private periodic response: the suite
// admits no public request during the hold and verifies its requestId below.
function deliveryObserver({ lifetime, readSnapshot }) {
  const controls = new Map();
  const observeChild = (child, meta) => {
    if (meta.kind !== "collector") return;
    const stream = child.stdout;
    const original = stream.emit;
    const state = { armed: false, startedNs: null, releasedNs: null,
      delivered: false, heldBytes: 0, error: null, done: null, requestId: null };
    controls.set(meta.monitorRunId, state);
    const held = [];
    let timer = null;
    let settle = null;
    const release = () => {
      if (state.delivered) return;
      clearTimeout(timer);
      state.releasedNs = process.hrtime.bigint().toString();
      meta.retainDiagnostic("delivery-release", { runId: meta.monitorRunId,
        startedNs: state.startedNs, releasedNs: state.releasedNs,
        byteLength: state.heldBytes }, state.releasedNs);
      state.delivered = true;
      try {
        // Inspect the already received bounded bytes without changing them.
        const bytes = held.filter(row => row.args[0] === "data")
          .map(row => Buffer.from(row.args[1]));
        const text = Buffer.concat(bytes).toString("utf8");
        const frames = text.trim().split("\n").map(line => JSON.parse(line));
        assert.equal(frames.length, 1, "one actual periodic response");
        assert.equal(frames[0].type, "process-samples");
        state.requestId = frames[0].requestId;
      } catch (error) { state.error ??= String(error); }
      try {
        for (const row of held.splice(0)) original.apply(row.receiver, row.args);
      } finally { state.heldBytes = 0; settle(); }
    };
    stream.emit = function (...args) {
      const event = args[0];
      if ((!state.armed || state.delivered) ||
        !["data", "end", "close", "error"].includes(event)) return original.apply(this, args);
      if (state.startedNs === null) {
        if (event !== "data") return original.apply(this, args);
        state.startedNs = process.hrtime.bigint().toString();
        state.done = new Promise(resolve => { settle = resolve; });
        lifetime.retainActual(state.done); // Actual delivery body, before timer.
        meta.retainDiagnostic("delivery-hold", { runId: meta.monitorRunId,
          startedNs: state.startedNs, delayMs: DELAY_MS }, state.startedNs);
        timer = setTimeout(release, DELAY_MS);
      }
      const bytes = event === "data" ? Buffer.byteLength(args[1]) : 0;
      state.heldBytes += bytes;
      held.push({ receiver: this, args });
      const snapshot = readSnapshot();
      // Allow the transient parse copies as well as held buffers. All prior
      // produced and retained bytes remain charged by the genuine harness.
      if (state.heldBytes > 65536 || snapshot.bytes.produced + snapshot.bytes.retained +
        state.heldBytes * 4 > MAX_BYTES) {
        state.error ??= "delivery retention bound";
        release();
      }
      return this.listenerCount(event) > 0;
    };
    meta.physicalSettlement.then(() => {
      stream.emit = original; // Only after genuine exit plus BOTH closes.
    });
  };
  return { controls, observeChild };
}

test("separate verdicts genuine Native serial delivery controls", { timeout: 60000 }, async () => {
  assert.equal(process.platform, "darwin");
  assert.equal(process.arch, "arm64");
  const runId = "native-v2-delivery";
  const recordRoot = realpathSync(path.join(HERE, "../../.."));
  const target = process.env.TINYAZ_NATIVE_EVIDENCE_ROOT ??
    path.join(os.tmpdir(), `${runId}-${process.pid}-${Date.now()}`);
  mkdirSync(target);
  const evidenceRoot = realpathSync(target);
  const lifetime = createWatchdogLifetime();
  let h;
  const observer = deliveryObserver({ lifetime, readSnapshot: () => h.snapshot() });
  h = createNativeTestHarness({ runId, recordRoot, pythonExecutable: PYTHON_EXECUTABLE,
    helperPath: realpathSync(path.join(HERE, "process-macos.py")),
    fixtureEntry: realpathSync(path.join(HERE, "native-fixture.mjs")),
    evidenceRoot, lifetime, observeChild: observer.observeChild });
  const { clock, bounds } = h;
  const { until, within } = createNativeFixtureWaits({ clock });
  const lanes = [];
  const results = [];
  const errors = [];
  const waitFor = async predicate => {
    while (!predicate()) {
      assert.ok(clock.nowMonoMs() < bounds.workEndMonoMs, "original work end");
      await until(Math.min(clock.nowMonoMs() + 10, bounds.workEndMonoMs));
    }
  };
  try {
    for (const phase of ["compare", "check"]) {
      const id = `${runId}:${phase}`;
      const { monitor } = h.createMonitor({ runId: id, phase, evaluationPolicy: V2_POLICY });
      lanes.push(monitor);
      const ready = await monitor.start({ deadlineMonoMs: bounds.workEndMonoMs });
      const backend = await monitor.backendIdentity({ deadlineMonoMs: bounds.workEndMonoMs });
      assert.equal(backend.backendId, "darwin-arm64-libproc-v1");
      let fixture = null;
      if (phase === "compare") fixture = await h.launch({ monitor, mode: "idle", scopeRunId: id });
      const control = observer.controls.get(id);
      assert.ok(control);
      const before = monitor.lastObservation();
      assert.equal(before.accountingValid, true);
      const beforeCycles = before.resourceQuality.completedCycles;
      control.armed = true;
      await within(() => waitFor(() => control.delivered), bounds.workEndMonoMs, "actual delivery");
      await within(() => control.done, bounds.workEndMonoMs, "delivery body");
      assert.equal(control.error, null);
      assert.ok(BigInt(control.releasedNs) - BigInt(control.startedNs) >= 650000000n);
      const trace = h.snapshot().trace;
      assert.ok(trace.some(row => row.kind === "sample-request" && row.value.requestId === control.requestId));
      await within(() => waitFor(() => phase === "compare"
        ? monitor.lastObservation().resourceQuality.completedCycles > beforeCycles
        : monitor.fault() !== null), bounds.workEndMonoMs, "periodic classification");
      if (phase === "compare") {
        const after = monitor.lastObservation();
        assert.equal(monitor.fault(), null);
        assert.equal(after.resourceQuality.coverageLost, true);
        assert.ok(after.resourceQuality.gapCount > 0);
        assert.ok(after.resourceQuality.causeCounts.PERIODIC_COMPLETION_GAP > 0);
        const delayedComplete = after.resourceQuality.lastCompleteNs;
        await within(() => waitFor(() => {
          const current = monitor.lastObservation();
          return current.accountingValid && current.cycleTimely &&
            BigInt(current.resourceQuality.lastCompleteNs) > BigInt(delayedComplete);
        }), bounds.workEndMonoMs, "later timely Native cycle");
        assert.equal(monitor.lastObservation().resourceQuality.coverageLost, true);
        const cleanup = createCleanupController({ monitor, clock, runId: id, lifetime });
        const cleanupStart = clock.nowMonoMs();
        const proof = await within(() => cleanup.run({ phase, scope: "phase-workload",
          scopeRunId: id, expectedFinalizer: ready.supervisor, supervisor: ready.supervisor,
          deadlineMonoMs: bounds.deadlineMonoMs, cleanupStartMonoMs: cleanupStart,
          settleWorkloadHandles: ({ deadlineMonoMs }) => h.settleHandles(id, { deadlineMonoMs }),
        }), bounds.deadlineMonoMs, "compare actual cleanup");
        assert.equal(proof.verified, true);
        assert.equal(proof.accountingValid, true);
        assert.ok(clock.nowMonoMs() <= cleanupStart + 5000, "original C");
        assert.ok(clock.nowMonoMs() < fixture.deadlineMonoMs, "original actor10s");
        assert.equal(monitor.fault(), null);
        results.push({ phase, backend, proof, resource: monitor.lastObservation().resourceQuality });
      } else {
        assert.equal(monitor.fault().code, "ACCOUNTING_UNAVAILABLE");
        assert.equal(monitor.lastObservation().accountingValid, false);
        await assert.rejects(() => monitor.sample({ deadlineMonoMs: bounds.workEndMonoMs }));
        results.push({ phase, backend, fault: monitor.fault(), resource: monitor.lastObservation().resourceQuality });
      }
      const stopped = await monitor.stopAndReap({ deadlineMonoMs: bounds.deadlineMonoMs });
      assert.equal(stopped.exitCode, 0);
      await within(() => lifetime.whenSettled(), bounds.deadlineMonoMs, "lane owner zero");
    }
  } catch (error) { errors.push(error); }
  finally {
    for (const monitor of lanes) {
      try { await monitor.stopAndReap({ deadlineMonoMs: bounds.deadlineMonoMs }); }
      catch (error) { errors.push(error); }
    }
    try { await h.finish(); } catch (error) { errors.push(error); }
    const snapshot = h.snapshot();
    try {
      assert.equal(snapshot.bytes.overflow, false);
      assert.deepEqual(snapshot.errors, []);
      assert.ok(snapshot.handles.length >= 3, "two real collectors and compare fixture");
      for (const actor of snapshot.handles) {
        assert.notEqual(actor.facts.exit, null);
        assert.deepEqual({ code: actor.facts.exit.code, signal: actor.facts.exit.signal }, actor.kind === "fixture"
          ? { code: null, signal: "SIGTERM" } : { code: 0, signal: null });
        assert.equal(actor.facts.outClosed, true);
        assert.equal(actor.facts.errClosed, true);
        assert.equal(actor.settled, true);
      }
    } catch (error) { errors.push(error); }
    try {
      const body = JSON.stringify({ qualification: "TEST Native delivery/time-quality only; no RSS-overage/cohort proof",
        evidenceRoot, results, controls: [...observer.controls], snapshot,
        errors: errors.map(error => String(error)) });
      assert.ok(snapshot.bytes.produced + snapshot.bytes.retained + Buffer.byteLength(body) <= MAX_BYTES);
      await within(() => issueActual(lifetime.retainActual, async () => {
        const file = await openActual(lifetime.retainActual,
          () => privateFs.open(path.join(evidenceRoot, "native-v2-summary.json"), "wx"));
        let failed = false, first;
        try { await writeAll(file, Buffer.from(body)); await file.sync(); }
        catch (error) { failed = true; first = error; }
        try { await file.close(); }
        catch (error) { if (!failed) { failed = true; first = error; } }
        if (failed) throw first;
      }), bounds.deadlineMonoMs, "summary write/close");
    } catch (error) { errors.push(error); }
    try { await within(() => lifetime.whenSettled(), bounds.deadlineMonoMs, "fresh final owner zero"); }
    catch (error) { errors.push(error); }
  }
  console.log(JSON.stringify({ nativeV2EvidenceRoot: evidenceRoot, controls: results.length }));
  if (errors.length) throw new AggregateError(errors, "genuine Native separate-verdicts controls");
});
