// One serial REAL Native group over the actual harness: real Darwin/arm64
// libproc collector, real selected-Python and Node fixtures, real lsof
// gates, real signals, real watchdog driver wire and bounded evidence —
// source-only, UNEXECUTED until safety clearance. The Phase2-4 normal
// cases plus the local sendClose live in the closed TEST leaf
// native-normal-test-cases.mjs, invoked ONCE inside this group; this
// suite retains the N01 bootstrap, the WD/EOF lanes and the ONE finally.
// Original bounds only: group <= 60000 ms (final 5000 reserved), each
// fixture <= 10000 ms, combined observed+retained <= 4 MiB. No skips,
// platform fallback, injected clocks, fake Native, raw/group kills or
// post-stop probes.
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import os from "node:os";
import { mkdirSync, realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createNativeTestHarness } from "./native-test-fixtures.mjs";
import { runNativeNormalCases } from "./native-normal-test-cases.mjs";
import { createNativeFixtureWaits } from "./native-fixture-protocol.mjs";
import { PYTHON_EXECUTABLE, PYTHON_PREFIX, PYTHON_VERSION } from "./schema-constants.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createNativeHorizon } from "./process-horizon.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { fixtureCommonIdentity, fixtureWorkspace, fixtureManifest, writeFixtureInputs } from "./test-fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const isIdentity = (t) =>
  t !== null && typeof t === "object" &&
  Number.isSafeInteger(t.pid) && t.pid > 0 &&
  typeof t.startSec === "string" && /^\d+$/.test(t.startSec) &&
  Number.isSafeInteger(t.startUsec) && t.startUsec >= 0 && t.startUsec < 1e6;

test("native supervision serial group", { timeout: 60000 }, async () => {
  // Unsupported platform is an explicit failure, never a skip.
  assert.equal(process.platform, "darwin");
  assert.equal(process.arch, "arm64");

  const RUN_ID = "native-suite";
  const WD_RUN_ID = `${RUN_ID}:wd`;
  const EOF_RUN_ID = `${RUN_ID}:eof`;
  const NESTED = `${RUN_ID}:watchdog-selftest`;
  const recordRoot = realpathSync(path.join(HERE, "..", "..", ".."));
  const helperPath = realpathSync(path.join(HERE, "process-macos.py"));
  const fixtureEntry = realpathSync(path.join(HERE, "native-fixture.mjs"));
  const evidenceTmp = path.join(os.tmpdir(), `native-suite-${process.pid}-${Math.floor(Math.random() * 1e9)}`);
  mkdirSync(evidenceTmp);
  const evidenceRoot = realpathSync(evidenceTmp);

  // The genuine lifetime owner is created FIRST, before harness/monitor/
  // Store/Recorder/WD, and shared exactly.
  const lifetime = createWatchdogLifetime();
  const h = createNativeTestHarness({
    runId: RUN_ID, recordRoot, pythonExecutable: PYTHON_EXECUTABLE,
    helperPath, fixtureEntry, evidenceRoot, lifetime,
  });
  const { clock, bounds } = h;
  const now = clock.nowMonoMs;
  const groupEnd = bounds.deadlineMonoMs; // Gend
  const workEnd = bounds.workEndMonoMs; // Gwork = Gend - 5000
  const order = [];
  const errors = [];
  const backendFacts = [];
  const snap = () => h.snapshot();
  const handles = () => snap().handles;
  const recOf = (pid) => handles().find((c) => c.facts.pid === pid);
  const assertSettledChild = (pid) => {
    const r = recOf(pid);
    assert.ok(r !== undefined, `child rec ${pid}`);
    assert.notEqual(r.facts.exit, null, `exit ${pid}`);
    assert.equal(r.facts.outClosed, true, `stdout close ${pid}`);
    assert.equal(r.facts.errClosed, true, `stderr close ${pid}`);
    assert.equal(r.settled, true, `settled ${pid}`);
    return r;
  };
  const fixtureMeta = (pid) => {
    const f = snap().fixtures.find((x) => recOf(pid)?.fixtureId === x.fixtureId);
    assert.ok(f !== undefined, `fixture meta ${pid}`);
    return f;
  };
  // The bounded wait primitives are the protocol leaf's WHOLE existing
  // owner (correction 77) — constructed ONCE over the same real clock,
  // never a duplicate local waiter or second timer owner.
  const { until, within } = createNativeFixtureWaits({ clock });
  // Shared suite control flag only — false until the real formal
  // cleanup returns inside the leaf; never a proof or status.
  const normal = { formalDone: false };
  // Every created lifecycle stays reachable for the finally below.
  const lanes = [];
  let m1 = null;
  let ready = null;
  let horizonOwner = null;
  let wdMon = null;
  let wd = null;
  let runP = null;
  let eofMon = null;
  let wdRan = false;
  // One bounded formal cleanup on the still-live first monitor only when
  // the normal flow did not already complete it — the WD and EOF
  // lifecycles own their own settlement. Primary and cleanup failures
  // are both preserved through `errors`, never swallowed.
  const runCleanup = async () => {
    if (normal.formalDone || m1 === null || m1.fault() !== null) return;
    const rdy = m1._ready();
    if (rdy === null) return;
    const ctl = createCleanupController({ monitor: m1, clock, runId: RUN_ID });
    await ctl.run({
      phase: "check",
      scope: "phase-workload",
      scopeRunId: RUN_ID,
      expectedFinalizer: rdy.supervisor,
      supervisor: rdy.supervisor,
      deadlineMonoMs: groupEnd,
      settleWorkloadHandles: ({ deadlineMonoMs }) =>
        Promise.all([h.settleHandles(RUN_ID, { deadlineMonoMs }), h.settleHandles(NESTED, { deadlineMonoMs })]).then(() => undefined),
      cleanupStartMonoMs: now(),
    });
    normal.formalDone = true;
  };

  try {
    // ============ Phase 1 — N01: real collector bootstrap ============
    const first = h.createMonitor({ runId: RUN_ID });
    m1 = first.monitor;
    lanes.push({ rid: RUN_ID, m: m1 });
    ready = await m1.start({ deadlineMonoMs: workEnd });
    assert.equal(ready.platform, "darwin");
    assert.equal(ready.arch, "arm64");
    assert.deepEqual(ready.abi, { bsdInfoSize: 136, taskInfoSize: 96 });
    assert.equal(ready.python.executable, PYTHON_EXECUTABLE);
    assert.equal(ready.python.version, PYTHON_VERSION);
    assert.equal(ready.python.prefix, PYTHON_PREFIX);
    assert.notEqual(ready.python.basePrefix, ready.python.prefix);
    assert.ok(isIdentity(ready.collector), "collector tuple");
    assert.ok(isIdentity(ready.supervisor), "supervisor tuple");
    assert.equal(ready.supervisor.pid, process.pid);
    const ident = await m1.backendIdentity({ deadlineMonoMs: workEnd });
    backendFacts.push(ident);
    assert.equal(ident.backendId, "darwin-arm64-libproc-v1");
    assert.equal(ident.os.platform, "darwin");
    assert.equal(ident.os.arch, "arm64");
    assert.ok(typeof ident.os.release === "string" && ident.os.release.length > 0);
    assert.ok(typeof ident.os.version === "string" && ident.os.version.length > 0);
    assert.ok(typeof ident.os.build === "string" && ident.os.build.length > 0);
    assert.equal(ident.python.invocationPath, PYTHON_EXECUTABLE);
    assert.match(ident.python.sha256, /^[0-9a-f]{64}$/);
    assert.equal(ident.python.version, PYTHON_VERSION);
    assert.equal(ident.helpers.length, 3);
    for (const hp of ident.helpers) {
      assert.match(hp.sha256, /^[0-9a-f]{64}$/);
      assert.ok(hp.path.startsWith("train/"), `helper rel ${hp.path}`);
    }
    assert.equal(ident.lsof.invocationPath, "/usr/sbin/lsof");
    assert.match(ident.lsof.sha256, /^[0-9a-f]{64}$/);
    assert.equal(ident.libproc.path, "/usr/lib/libproc.dylib");
    assert.deepEqual(ident.libproc.abi, { bsdInfoSize: 136, taskInfoSize: 96 });
    assert.ok(ident.libproc.image !== null && typeof ident.libproc.image === "object");
    assert.equal(m1.fault(), null);

    // ============ Phases 2-4 — N02-N06/N09-N12 normal cases =========
    // Delegated ONCE to the closed TEST leaf over the SAME genuine
    // group capabilities; the original arbitrary failure rejects
    // through unchanged.
    await runNativeNormalCases({
      h, monitor: m1, ready, lifetime, clock, bounds,
      runId: RUN_ID, nestedRunId: NESTED, order, normal,
      until, within, fixtureMeta, recOf, assertSettledChild, isIdentity,
    });

    // ============ Phase 5 — N07: real WD blocked-heartbeat ============
    // Genuine horizon OWNER first, shared exactly with monitor/Store/
    // Recorder/WD; narrowed to the original Gend synchronously inside
    // the run thunk, before the first async continuation.
    horizonOwner = createNativeHorizon();
    const second = h.createMonitor({ runId: WD_RUN_ID, horizon: horizonOwner.reader });
    wdMon = second.monitor;
    lanes.push({ rid: WD_RUN_ID, m: wdMon });
    const footprint = createFootprintObserver({ workspaceRoot: evidenceRoot, clock: { nowMonoMs: clock.nowMonoMs } });
    const store = createArtifactStore({ workspaceRoot: evidenceRoot, readFootprint: footprint.readFootprint, monotonicNow: clock.nowMonoMs, lifetime });
    const ws = fixtureWorkspace({ commonIdentity: fixtureCommonIdentity() });
    await writeWorkspaceOnce({ store, workspace: ws });
    const inputs = await writeFixtureInputs({ store });
    const manifest = fixtureManifest({ workspace: ws, phase: "check", runId: WD_RUN_ID, inputs });
    const ctlWd = createCleanupController({ monitor: wdMon, clock, runId: WD_RUN_ID });
    const recorder = createPhaseRecorder({
      store,
      workspace: ws,
      manifest,
      verifyIdentity: async () => structuredClone(ws.commonIdentity),
      verifyCleanup: (a) => ctlWd.verifyCleanup(a),
    });
    const manifestPath = path.join(evidenceRoot, "check", "manifest.json");
    const wdEntry = h.entry({ mode: "blocked-heartbeat", scopeRunId: WD_RUN_ID });
    wd = createWatchdog({
      phase: "check", runId: WD_RUN_ID, commonIdentitySha256: manifest.commonIdentitySha256,
      workspace: ws, manifestPath, protocol: second.protocol, monitor: wdMon, footprint,
      recorder, cleanup: ctlWd, driverEntry: wdEntry, spawnImpl: h.forkImpl,
      prerequisites: [], lifetime, nativeHorizon: horizonOwner, clock,
    });
    const outcome = await within(
      () => {
        const p = wd.run();
        horizonOwner.narrow(groupEnd);
        runP = p;
        return p;
      },
      workEnd,
      "wd run",
    );
    wdRan = true;
    assert.equal(outcome.stopReason, "HEARTBEAT_TIMEOUT");
    assert.notEqual(outcome.status, "passed");
    assert.notEqual(outcome.exitCode, 0);
    // Actual protocol trace: real root+child admitted, begun, at least
    // one valid heartbeat, the real >2000 ms stall measured on ACTUAL
    // frames — last driver heartbeat to the supervisor's own stop —
    // literal HEARTBEAT_TIMEOUT and the KILL of the surviving workload,
    // never an invented first stop.
    const t5 = snap().trace;
    const d2s = (ty) => t5.some((e) => e.kind === "driver:d2s" && e.value.type === ty);
    const s2d = (ty) => t5.some((e) => e.kind === "driver:s2d" && e.value.type === ty);
    assert.ok(d2s("register") && s2d("registered") && d2s("begin") && s2d("begun"), "driver admitted/begun");
    assert.ok(d2s("heartbeat"), "valid heartbeat");
    const stop5 = t5.find((e) => e.kind === "driver:s2d" && e.value.type === "stop");
    assert.ok(s2d("stop"), "supervisor stop frame");
    const hbs = t5.filter((e) => e.kind === "driver:d2s" && e.value.type === "heartbeat");
    assert.ok(hbs.length >= 1 && stop5 !== undefined, "heartbeat+stop frames");
    assert.ok(BigInt(stop5.atMonoNs) - BigInt(hbs[hbs.length - 1].atMonoNs) > 2000000000n, "real >2000ms gap");
    // WD-scope correlation only — earlier normal/N09 roots/KILLs can
    // never satisfy: join each own-roots to ITS OWN requestId
    // roots-accepted, retain the accepted kind:'fixture' full-tuple
    // workload child — never driver/protected/helper — then KILL IT.
    const driverPid = handles().find((c) => c.mode === "blocked-heartbeat")?.facts.pid;
    assert.ok(Number.isSafeInteger(driverPid), "driver handle pid");
    const sameT = (a, b) => a !== null && typeof a === "object" && b !== null && a.pid === b.pid && a.startSec === b.startSec && a.startUsec === b.startUsec;
    const acceptedWd = [];
    for (const e of t5) {
      if (e.kind !== "own-roots" || !Array.isArray(e.value.roots) || !t5.some((a) => a.kind === "roots-accepted" && a.value.requestId === e.value.requestId)) continue;
      for (const r of e.value.roots) {
        if (r !== null && typeof r === "object" && r.kind === "fixture" && isIdentity(r.identity) && r.scopeRunId === WD_RUN_ID && r.identity.pid !== driverPid) acceptedWd.push(r.identity);
      }
    }
    assert.ok(acceptedWd.length >= 1, "accepted WD workload child");
    assert.ok(
      t5.some((e) => e.kind === "signal-request" && e.value.signal === "KILL" && sameT(e.value.identity, acceptedWd[0])),
      "KILL same WD child",
    );
    const wdCol = handles().find((c) => c.kind === "collector" && c.monitorRunId === WD_RUN_ID);
    assert.ok(wdCol !== undefined, "wd collector rec");
    assert.equal(wdCol.facts.exit.code, 0, "wd collector exit0");
    assert.equal(wdCol.facts.outClosed, true);
    assert.equal(wdCol.facts.errClosed, true);
    assert.equal(wdMon.fault(), null);

    // ============ Phase 6 — N13: final collector-only EOF failure ======
    const third = h.createMonitor({ runId: EOF_RUN_ID });
    eofMon = third.monitor;
    lanes.push({ rid: EOF_RUN_ID, m: eofMon });
    const ready3 = await eofMon.start({ deadlineMonoMs: workEnd });
    const obs3 = await eofMon.sample({ deadlineMonoMs: workEnd });
    assert.ok(obs3.accountingValid === true && obs3.rssBytes > 0);
    const eofReceipt = await h.endCollectorInputForEof({ runId: EOF_RUN_ID });
    assert.equal(eofReceipt.runId, EOF_RUN_ID);
    assert.deepEqual(eofReceipt.collectorIdentity, ready3.collector);
    assert.ok(eofReceipt.issuedAtMonoMs <= eofReceipt.stdinEndCallbackAtMonoMs);
    assert.ok(eofReceipt.stdinEndCallbackAtMonoMs <= eofReceipt.deadlineMonoMs);
    // The actual unexpected EOF's real exit 2 plus BOTH pipe closes are
    // joined by a FRESH genuine lifetime.whenSettled under the original
    // bound — the actual collector plus callback debt, never a poll —
    // THEN the physical facts, the sticky first fault, the retained
    // now-invalid RSS and the ordinary refusal are inspected BEFORE
    // stopAndReap. No shutdown/stop precedes the stimulus.
    await within(() => lifetime.whenSettled(), workEnd, "eof settle");
    const eofRec = handles().find((c) => c.kind === "collector" && c.monitorRunId === EOF_RUN_ID);
    assert.ok(eofRec !== undefined, "eof collector rec");
    assert.equal(eofRec.facts.exit.code, 2);
    assert.equal(eofRec.facts.outClosed, true);
    assert.equal(eofRec.facts.errClosed, true);
    assert.equal(eofRec.settled, true);
    const f3 = eofMon.fault();
    assert.ok(f3 !== null, "sticky fault");
    assert.equal(f3.code, "IPC_INVALID");
    const lastObs = eofMon.lastObservation();
    assert.ok(lastObs !== null && lastObs.rssBytes > 0);
    assert.equal(lastObs.accountingValid, false, "retained RSS now invalid");
    await assert.rejects(async () => eofMon.sample({ deadlineMonoMs: workEnd }));
    const reap3 = await eofMon.stopAndReap({ deadlineMonoMs: workEnd });
    assert.equal(reap3.exitCode, 2);
    const snapEnd = snap();
    assert.equal(snapEnd.bytes.overflow, false, "4 MiB bound held");
  } catch (e) {
    errors.push(e);
  } finally {
    // FAILURE-only WD fence: latch the genuine first-stop on a real
    // reason, then join the still-running cleanup/reap flow under the
    // original bound — the positive N07 first stop stays the actual
    // HEARTBEAT_TIMEOUT, never manufactured here.
    if (errors.length > 0 && wd !== null && runP !== null && !wdRan) {
      try {
        wd.requestStop("OPERATION_TIMEOUT");
      } catch (e) {
        errors.push(e);
      }
      try {
        await within(() => runP, groupEnd, "wd join");
      } catch (e) {
        errors.push(e);
      }
    }
    // EVERY created monitor lifecycle gets its genuine stop under the
    // ORIGINAL group bound: the healthy first monitor still attempts
    // its original formal cleanup first, and a faulted or already
    // physically-settled collector still gets stopAndReap — physical
    // settlement alone is never monitor shutdown proof (the referenced
    // Node sampler only clears through a real stop) — never skipped
    // and never a raw kill.
    for (const lane of lanes) {
      if (lane.m === m1) {
        try {
          await runCleanup();
        } catch (e) {
          errors.push(e);
        }
      }
      try {
        await lane.m.stopAndReap({ deadlineMonoMs: groupEnd });
      } catch (e) {
        errors.push(e);
      }
    }
    try {
      await h.finish({ runCleanup });
    } catch (e) {
      errors.push(e);
    }
    // Persist the FULL bounded retained raw trace plus actual snapshot
    // facts through the SAME prearmed lifetime FS body: the serialized
    // copy is charged against the SAME combined produced+retained
    // 4 MiB pool — the harness counter does not carry it — enforced
    // BEFORE issue; issue plus PUBLIC wait sit inside the same
    // `within` thunk under ORIGINAL groupEnd (a spent bound prevents
    // the write) while the receipt stays independently retained — its
    // real settlement joins the fresh owner-zero below, never a
    // public-timeout-as-safe claim; IO failure never masks a primary.
    try {
      const s = snap();
      const body = JSON.stringify({
        runId: RUN_ID, bounds: s.bounds, bytes: s.bytes, errors: s.errors,
        fixtures: s.fixtures, monitors: s.monitors,
        handles: s.handles.map((c) => ({
          kind: c.kind, monitorRunId: c.monitorRunId, scopeRunId: c.scopeRunId, mode: c.mode,
          pid: c.facts.pid, exit: c.facts.exit, outClosed: c.facts.outClosed, errClosed: c.facts.errClosed,
          settled: c.settled, fd3: c.fd3, port: c.port, admission: c.admission, descendant: c.descendant,
        })),
        trace: s.trace,
        order,
        wdRan,
        backendFacts,
      });
      const copyBytes = Buffer.byteLength(body, "utf8");
      const lastInspected = s.trace.findLast((e) => e.kind === "process-samples" && Array.isArray(e.value?.inspected) && e.value.inspected.length > 0)?.value.inspected ?? null;
      assert.ok(s.bytes.produced + s.bytes.retained + copyBytes <= 4194304, `summary within combined 4 MiB produced=${s.bytes.produced} retained=${s.bytes.retained} copy=${copyBytes} lastInspected=${JSON.stringify(lastInspected)}`);
      await within(
        () => {
          let wRes;
          let wRej;
          const wP = new Promise((res, rej) => {
            wRes = res;
            wRej = rej;
          });
          lifetime.retainActual(wP);
          writeFile(path.join(evidenceRoot, "native-suite-summary.json"), body).then(wRes, wRej);
          return wP;
        },
        groupEnd, "summary write",
      );
    } catch (e) {
      errors.push(e);
    }
  }
  // Fresh owner-zero after all closures: every issued callback, receipt
  // and direct handle joined under the original group bound — never a
  // static closed flag.
  try {
    await within(() => lifetime.whenSettled(), groupEnd, "owner zero");
  } catch (e) {
    errors.push(e);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "native-suite");
});
