// watchdog-resource.test.mjs: the resource- and configuration-guard
// companion suite — the WHOLE two high-poll/rapid-finish resource
// cases moved from watchdog.test.mjs under the same capacity move,
// PLUS under corrective 72 the WHOLE genuine internalContext
// signal/configuration guard case `internalContext requires a genuine
// platform AbortSignal`, PLUS under corrective 73 the WHOLE
// interrupted pending-start case `an interrupted pending start leaves
// no fabricated running or final records` moved from
// watchdog-boundaries.test.mjs (four named cases here; seven named
// cases remain local there). The moved pending-start case installs a
// PRIVATE actual start-entry tap on the returned monitor BEFORE run —
// the same original monitor.start still invoked directly with the same
// this/args/result/error — awaits the genuine entry before the
// monitorCalls assertion (never a fixed readiness poll, production
// hook, second owner or clock), stops REQUESTED synchronously, then
// releases the SAME held start gate {started:false} before the real
// drain, and its unconditional finally lands the idempotent first
// stop, the original gate release and ALL queued callback/childexit
// plus BOTH close/disconnect facts via closeFacts before joining the
// original run — early assertions can never strand running fake work.
// The transient-overage case keeps every original
// current/peak/sample-time/verdict assertion including the explicit
// atMonoNs 777. The companion owns the fresh causal order: the run
// starts CLEAN before driver ready, the actual scripted high
// projection is injected and read through the returned monitor, the
// current then falls with the sticky peak/flag retained, the run is
// verified still live (never an already-stopped state), and the finish
// lands while the fake clock is HELD before the first +1000 resource
// poll — the finish-time projection refusal alone produces the actual
// RESOURCE_RSS outcome. The per-run setup/control helpers live in
// watchdog-run-test-fixtures.mjs. A synthetic unit pass is never
// Native or phase acceptance.
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { phaseRecorderLifetime } from "./records.mjs";
import { createWatchdog } from "./watchdog.mjs";
import {
  createDriverActualScope,
  finishDriverActualScope,
} from "./watchdog-driver.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  watchdogRecordWorkspace,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import {
  FINISH,
  closeFacts,
  drain,
  heldGate,
  liveStart,
  row,
  setupRun,
  yieldTurn,
} from "./watchdog-run-test-fixtures.mjs";

test("a transient measured overage stays ineligible after a lower rapid finish", async (t) => {
  let lower = false;
  const { clk, env, driver, run } = await setupRun(t, {
    monitorScript: {
      // The observation samples actually move: first a REAL high-current
      // >4 GiB reading with the flag computed true, then the current
      // falls while the sticky peak/flag/accounting remain.
      observation: () =>
        lower
          ? {
              accountingValid: true,
              rssBytes: 1000, // current fell; the sticky flag and peak stay
              peakRssBytes: 4294967297,
              rssLimitExceeded: true,
              atMonoNs: "777",
            }
          : {
              accountingValid: true,
              rssBytes: 4294967297, // the actually-observed high sample
              peakRssBytes: 4294967297,
              rssLimitExceeded: true,
              atMonoNs: "555",
            },
    },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  await liveStart(clk, driver);
  // Drive one real resource poll at +1000 so the high-current sample is
  // OBSERVED through the accepted lane — not a pre-forged flag.
  clk.advance(1000);
  await yieldTurn();
  await yieldTurn();
  lower = true;
  // The rapid finish lands before the next one-second poll: the sticky
  // overage still stops the run with its actual retained facts.
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(res.stopReason, "RESOURCE_RSS");
  const lines = (await env.readFile("check/events.jsonl"))
    .toString()
    .trim()
    .split("\n")
    .map(JSON.parse);
  // The driven high-current sample was actually recorded.
  assert.ok(
    lines.some(
      (l) => l.kind === "resource" && l.payload.rssBytes === 4294967297,
    ),
  );
  const res_ = lines.find((l) => l.kind === "resource" && l.payload.atMonoNs === "777");
  assert.ok(res_ !== undefined);
  // The actual separate current/peak/sample-time/verdict is retained —
  // including the explicit observed sample time itself.
  assert.equal(res_.payload.atMonoNs, "777");
  assert.equal(res_.payload.rssBytes, 1000);
  assert.equal(res_.payload.peakRssBytes, 4294967297);
  assert.equal(res_.payload.rssLimitExceeded, true);
  assert.equal(res_.payload.accountingValid, true);
});

test("a finish before the first resource poll still stops on the retained overage", async (t) => {
  let phase = "clean";
  const { clk, env, driver, monitor, run } = await setupRun(t, {
    monitorScript: {
      // The injected monitor projects a CLEAN sample before driver
      // ready, then the actual scripted high projection is injected and
      // read through the returned monitor, then the current falls while
      // the sticky peak/flag remain. The finish refusal reads this
      // projection — a synthetic unit fact, never an actual Native
      // measurement.
      observation: () =>
        phase === "lower"
          ? {
              accountingValid: true,
              rssBytes: 1000, // current fell; the sticky flag and peak stay
              peakRssBytes: 4294967297,
              rssLimitExceeded: true,
              atMonoNs: "888",
            }
          : phase === "high"
            ? {
                accountingValid: true,
                rssBytes: 4294967297,
                peakRssBytes: 4294967297,
                rssLimitExceeded: true,
                atMonoNs: "888",
              }
            : {
                accountingValid: true,
                rssBytes: 0,
                peakRssBytes: 0,
                rssLimitExceeded: false,
                atMonoNs: "0",
              },
    },
    rows: [row(6000, 1, "driver", true, "R1")],
  });
  const p = run();
  let settled = false;
  void Promise.resolve(p).then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await liveStart(clk, driver);
  // Inject THEN read the actual scripted high projection through the
  // returned monitor — the genuine >4 GiB overage the sticky peak
  // retains.
  phase = "high";
  const observed = monitor.lastObservation();
  assert.equal(observed.rssBytes, 4294967297);
  assert.equal(observed.peakRssBytes, 4294967297);
  assert.equal(observed.rssLimitExceeded, true);
  phase = "lower";
  // Fresh causal finish guard: the run is genuinely still live — no
  // earlier stop was latched and the fake clock is HELD before the
  // first +1000 resource poll — so the finish-time projection refusal
  // alone must produce the actual RESOURCE_RSS outcome.
  assert.equal(settled, false);
  driver.emit(FINISH("passed", 0));
  closeFacts(driver);
  const res = await drain(clk, p);
  assert.equal(res.status, "inconclusive");
  assert.equal(res.exitCode, 2);
  assert.equal(res.stopReason, "RESOURCE_RSS");
  const lines = (await env.readFile("check/events.jsonl"))
    .toString()
    .trim()
    .split("\n")
    .map(JSON.parse);
  // The finish-time retained facts: low current vs the sticky peak and
  // flag with the actual projected sample time.
  const res_ = lines.find((l) => l.kind === "resource");
  assert.ok(res_ !== undefined);
  assert.equal(res_.payload.atMonoNs, "888");
  assert.equal(res_.payload.rssBytes, 1000);
  assert.equal(res_.payload.peakRssBytes, 4294967297);
  assert.equal(res_.payload.rssLimitExceeded, true);
  assert.equal(res_.payload.accountingValid, true);
});

test("internalContext requires a genuine platform AbortSignal", async (t) => {
  const env = await watchdogRecordWorkspace({ phase: "check", runId: "R1" });
  // The GENUINE recorder owner supplies the parent scope's registrar —
  // minted BEFORE the constructors so all three nested contexts carry
  // the SAME branded parentDriverScope unchanged. Parent and nested
  // runIds may differ; the scope's own runId alone gates its admission.
  const owner = phaseRecorderLifetime(env.recorder);
  const parentScope = createDriverActualScope({
    retainActual: owner.retainActual,
    runId: env.manifest.runId,
  });
  t.after(async () => {
    // The actual unstarted recorder closes first, the SAME parent scope
    // finishes its whole enrolled subtree, and the genuine owner's fresh
    // zero lands BEFORE the owned workspace removal — never a
    // parent-global wait inside healthy nested work.
    await env.recorder.closeIncompleteEvidence();
    await finishDriverActualScope(parentScope);
    await owner.whenSettled();
    await env.removeWorkspace();
  });
  const base = () => ({
    phase: "watchdog-selftest",
    runId: "R1:self",
    commonIdentitySha256: env.manifest.commonIdentitySha256,
    workspace: env.workspace,
    manifestPath: path.join(env.workspaceRoot, "check", "manifest.json"),
    protocol: createProtocolValidator({ runId: "R1:self" }),
    monitor: { _ready: () => ({ supervisor: identity(1) }) },
    footprint: { scan: async () => ({ accountingValid: true, chargedBytes: 1 }), stop: () => {} },
    recorder: env.recorder,
    cleanup: { run: async () => ({}) },
    driverEntry: { executable: "/drv/node", args: ["/drv/driver.js"], expectedExecutable: "/drv/node" },
    selftestOwnerSupervisor: identity(7000),
    clock: watchdogTestClock(),
  });
  const duck = { aborted: false, addEventListener() {}, removeEventListener() {} };
  const proto = Object.create(AbortSignal.prototype);
  // The REQUIRED parentDriverScope rides alongside deadlineMonoNs/signal
  // in every context — the duck/prototype negatives still reject on the
  // genuine-signal check in its original validation priority.
  const internalContext = (signal) => ({
    deadlineMonoNs: 10_000_000_000_000n,
    signal,
    parentDriverScope: parentScope,
  });
  assert.throws(
    () => createWatchdog({ ...base(), internalContext: internalContext(duck) }),
    /IPC_INVALID/,
  );
  assert.throws(
    () => createWatchdog({ ...base(), internalContext: internalContext(proto) }),
    /IPC_INVALID/,
  );
  const ctl = new AbortController();
  assert.doesNotThrow(() =>
    createWatchdog({
      ...base(),
      internalContext: internalContext(ctl.signal),
    }),
  );
});

test("an interrupted pending start leaves no fabricated running or final records", async (t) => {
  const gate = heldGate();
  const { clk, env, driver, monitor, monitorCalls, w, run } = await setupRun(
    t,
    {
      monitorScript: {
        startPromise: gate.promise,
        stopResult: { exitCode: 0 },
      },
    },
  );
  // A PRIVATE actual start-ENTRY tap on the returned monitor: the SAME
  // original monitor.start is still invoked directly with the same
  // this/args and its identical result/error returned — the owned
  // local entry receipt resolves at the genuine call so the real entry
  // is awaited BEFORE the monitorCalls assertion (never a fixed
  // readiness poll, production hook, second owner or clock; the
  // existing runtime/fixture retainer stays the sole authority).
  let resolveStartEntry;
  const startEntry = new Promise((resolve) => {
    resolveStartEntry = resolve;
  });
  const origStop = monitor.stopAndReap;
  const stops = [];
  monitor.stopAndReap = function (options) {
    stops.push({ ...options });
    return origStop.call(this, options);
  };
  const origStart = monitor.start;
  monitor.start = function (...startArgs) {
    try {
      return origStart.apply(this, startArgs);
    } finally {
      resolveStartEntry();
    }
  };
  let p = null;
  try {
    p = run();
    await startEntry;
    assert.ok(monitorCalls.includes("monitor.start"));
    const stopAt = clk.nowMonoMs();
    w.requestStop("REQUESTED");
    // The first-stop latch is synchronous — the original stop fence is
    // admitted while the genuine start gate is still held: one real
    // turn observes it, then the SAME gate resolves {started:false}
    // BEFORE the actual drain/quiescence join — a drain awaited
    // against a still-held dependency can never settle.
    await yieldTurn();
    gate.held = false;
    gate.release({ started: false });
    const res = await drain(clk, p);
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.deepEqual(stops, [{ deadlineMonoMs: stopAt + 5000,
      ordinaryDeadlineMonoMs: stopAt + 4500 }]);
    // The genuine incomplete drain ran: no running record, no final,
    // no completion and no seal were ever fabricated.
    const names = (
      await fsp.readdir(path.join(env.workspaceRoot, "check"))
    ).sort();
    assert.deepEqual(names, ["events.jsonl", "manifest.json"]);
  } finally {
    monitor.start = origStart;
    monitor.stopAndReap = origStop;
    // Unconditional and idempotent: the first stop, the original start
    // gate release and ALL queued callback/childexit plus BOTH
    // close/disconnect facts land BEFORE joining the original run —
    // an early assertion can never strand running fake work.
    w.requestStop("REQUESTED");
    gate.held = false;
    gate.release({ started: false });
    closeFacts(driver);
    // Drive the bounded stage timers through real turns so the joined
    // run's owned cleanup can actually settle before workspace removal.
    if (p !== null) await drain(clk, p, 30).catch(() => {});
  }
});
