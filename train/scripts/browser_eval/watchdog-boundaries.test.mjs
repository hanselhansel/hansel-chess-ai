// watchdog-boundaries.test.mjs: the meaningful residual-boundary
// regressions for the declared pending-repair private bindings — a
// supplied malformed cleanupStartMonoMs rejects without a fresh window
// on a fresh eligible controller per binding, missing/failed/withheld
// required settlement reaches no collector reap, a synchronous observer
// throw is retained while the actual original +2000/+4000 offsets still
// land, and the late ordinary/FINISH no-revival purposes run in FRESH
// independently eligible idle contexts — each kind is that context's
// own first post-stop attempt, never masked by a prior poisoned frame
// or a live operation slot.
// The WHOLE N08 command-deadline case moved on to the declared
// watchdog-driver-boundaries.test.mjs owner beside the
// withheld-driver-close settlement case; under corrective 73 the WHOLE
// interrupted pending-start case moved on to the declared
// watchdog-resource.test.mjs owner beside the resource and genuine
// signal/configuration guard cases.
// Driven on the
// existing TEST-ONLY fixtures, the REAL cleanup controller and the
// actual operations/record/receipt APIs — never a production debug
// hook or fabricated positive control. A synthetic unit pass is
// never Native or phase acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";

import { identity } from "./supervision-test-fixtures.mjs";
import {
  cleanupMonitorFixture,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import {
  OBS,
  ROWS,
  SUP,
  advanceBy,
  args,
  closeDriverFacts,
  drive,
  drivers,
  fixture,
  makeArgs,
  row,
} from "./watchdog-cleanup-test-fixtures.mjs";
import { createRunDrainBinding } from "./watchdog-drain-test-fixtures.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import {
  closeFacts,
  drain,
  liveStart,
  setupRun,
  yieldTurn,
} from "./watchdog-run-test-fixtures.mjs";

test("a supplied malformed cleanupStartMonoMs rejects without a fresh window", async () => {
  // Fraction, nonfinite, string and supplied-null bindings all reject —
  // each on a FRESH eligible controller so a previous rejection's
  // in-progress latch can never mask the intended binding failure.
  for (const bad of [1.5, Number.POSITIVE_INFINITY, "now", null]) {
    const { clk, calls, cc } = fixture(ROWS, {
      observation: OBS,
      probeDefault: "gone",
      listeners: { R1: { listeners: [], unexpected: [] } },
      stopResult: { exitCode: 0 },
    });
    const t0 = clk.nowMonoMs();
    await assert.rejects(
      cc.run(args(clk, { cleanupStartMonoMs: bad })),
      /CLEANUP_UNPROVEN/,
    );
    assert.equal(clk.nowMonoMs(), t0); // no window was consumed
    assert.ok(!calls.some((c) => c.startsWith("signal:")));
  }
  // A genuinely OMITTED argument still captures entry as the legacy
  // path: a fresh controller over the same scripted facts completes.
  const good = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const omitted = args(good.clk, {
    settleWorkloadHandles: async () => {},
    cleanupStartMonoMs: undefined,
  });
  const proof = await drive(good.clk, good.cc.run(omitted));
  assert.equal(proof.scope, "phase-workload");
  assert.equal(proof.verified, true);
});

test("a missing driver settlement reaches no collector reap", async () => {
  const { clk, calls, cc } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const proof = await drive(clk, cc.run(args(clk))); // no settle callback
  assert.equal(proof.accountingValid, false);
  assert.equal(proof.verified, false);
  // The unproven debt never falls through to the collector-last reap.
  assert.ok(!calls.includes("stopAndReap"));
});

test("a failed required settlement still reaches no collector reap", async () => {
  const { clk, calls, cc } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const proof = await drive(
    clk,
    cc.run(
      args(clk, {
        settleWorkloadHandles: async () => {
          throw new Error("reap lost");
        },
      }),
    ),
  );
  assert.equal(proof.accountingValid, false);
  assert.equal(proof.verified, false);
  assert.ok(!calls.includes("stopAndReap"));
});

test("a withheld required live-evidence join keeps the collector un-reaped", async () => {
  const { clk, calls, cc } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  let releaseEvidence;
  const evidence = new Promise((r) => {
    releaseEvidence = r;
  });
  const p = cc.run(
    args(clk, {
      settleWorkloadHandles: async ({ deadlineMonoMs }) => {
        calls.push("settle-evidence");
        // The joined required verification task — settled or still owed,
        // never a caller boolean.
        await evidence;
      },
    }),
  );
  try {
    // Past the fixed +4000 KILL stage, still inside the original window.
    await advanceBy(clk, 9);
    assert.ok(calls.includes("settle-evidence"));
    assert.ok(!calls.includes("stopAndReap"));
    releaseEvidence();
    // The released real continuation settles on REAL turns at the held
    // clock — never another 500 fake ms pushing to the +5000 cutoff.
    let done = false;
    void Promise.resolve(p).then(
      () => {
        done = true;
      },
      () => {
        done = true;
      },
    );
    for (let i = 0; i < 60 && !done; i += 1) await yieldTurn();
    const proof = await p;
    assert.ok(calls.indexOf("settle-evidence") < calls.indexOf("stopAndReap"));
    assert.equal(proof.verified, true);
  } finally {
    releaseEvidence();
    await p.catch(() => {});
  }
});

test("a synchronous observer throw is retained without delaying the stages", async () => {
  const live = new Set([10, 11, 12]);
  const sigAt = [];
  const clk = watchdogTestClock();
  const { monitor, calls } = cleanupMonitorFixture({
    runId: "R1",
    clock: clk,
    supervisor: SUP,
    collector: identity(2),
    rows: ROWS,
    script: {
      observation: OBS,
      probe: (i) => (live.has(i.pid) ? "same-live" : "gone"),
      onSignal: ({ signal, identity: idArg }) => {
        // The SAME fake clock timestamps the actual signal so the real
        // original-offset fact is asserted, not just a call's existence.
        sigAt.push({ signal, at: clk.nowMonoMs() });
        // The live set survives TERM — only the actual KILL removes a
        // target, so the genuine KILL stage is observed rather than
        // skipped with every tuple already gone.
        if (signal === "KILL") live.delete(idArg.pid);
      },
      signalResult: "sent",
      listeners: { R1: { listeners: [], unexpected: [] } },
      stopResult: { exitCode: 0 },
    },
  });
  // ONE real bound controller through the declared drain binding: the
  // observer function itself still throws BEFORE returning — the tap
  // forwards the identical original error — and the ORIGINAL run
  // promise stays associated for the bound drive, never a raw
  // unassociated controller promise or a second controller.
  const binding = createRunDrainBinding({
    monitor,
    clock: clk,
    runId: "R1",
    recordEvent: () => {
      throw new Error("sync observer boom"); // throws BEFORE returning
    },
  });
  // The stages still reach their fixed offsets — the sync fault is
  // retained as an accounting failure, never a postponed or lost stage.
  const t0 = clk.nowMonoMs();
  // This isolated raw-binding case has no fixture owner — ONE genuine
  // createWatchdogLifetime supplies the SAME retainer the drivers map
  // registers its real scope debt under, never a hidden default owner.
  const lifetime = createWatchdogLifetime();
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const proof = await drive(clk, binding.cleanup.run(makeArgs(clk, driverMap)));
  assert.ok(calls.some((c) => c.startsWith("signal:TERM")));
  assert.ok(calls.includes("stopAndReap"));
  // The actual original offsets are the asserted facts: first TERM at
  // the ORIGINAL +2000 and first KILL at the ORIGINAL +4000 — never a
  // shifted or fabricated stage time.
  assert.equal(sigAt.find((s) => s.signal === "TERM").at, t0 + 2000);
  assert.equal(sigAt.find((s) => s.signal === "KILL").at, t0 + 4000);
  assert.equal(proof.accountingValid, false);
  assert.equal(proof.verified, false);
});

test("a first stop while idle admits no late ordinary event, artifact, begin or finish", async (t) => {
  // Each kind runs in a FRESH independently eligible idle context: a
  // live started run with no active operation, stopped by a real
  // REQUESTED stop, then the kind's own closed-shape valid frame is
  // that context's FIRST post-stop ordinary attempt — never masked by
  // a prior poisoned frame or a still-live operation slot. After the
  // actual child facts are released and the ORIGINAL run is drained,
  // the retained workspace itself proves the frame never persisted,
  // revived or acknowledged — the missing recorded/begun ack alone is
  // never the write-proof.
  const idleStop = async (st, frame) => {
    const { clk, env, driver, w, run } = await setupRun(st, {
      rows: [row(6000, 1, "driver", true, "R1")],
    });
    const p = run();
    await liveStart(clk, driver);
    w.requestStop("REQUESTED");
    driver.emit(frame);
    await yieldTurn();
    await yieldTurn();
    // The real exit plus BOTH pipe closes settle the owned run before
    // any retained file is read — no root is touched while a physical
    // debt is still owed.
    closeFacts(driver);
    const res = await drain(clk, p);
    return { env, driver, res };
  };

  await t.test("a late ordinary event is never persisted or acknowledged", async (st) => {
    const { env, driver, res } = await idleStop(st, {
      type: "event",
      recordId: "e1",
      recordSeq: 0,
      kind: "operation",
      payload: { operationId: "late-op", marker: "late-ev-1" },
    });
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(driver.written.filter((m) => m.type === "stop").length, 1);
    assert.ok(!driver.written.some((m) => m.type === "recorded"));
    // The retained journal itself shows the unique marker never
    // persisted — legitimate fault/cleanup records remain beside its
    // absence.
    const text = (await env.readFile("check/events.jsonl")).toString();
    assert.ok(!text.includes("late-ev-1"));
  });

  await t.test("a late ordinary artifact lands no owned file or admitted ref", async (st) => {
    const { env, driver, res } = await idleStop(st, {
      type: "artifact",
      recordId: "a1",
      recordSeq: 0,
      artifactId: "late-art",
      path: "check/late.bin",
      mode: "append",
      encoding: "base64",
      data: Buffer.from("late").toString("base64"),
      last: true,
    });
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(driver.written.filter((m) => m.type === "stop").length, 1);
    assert.ok(!driver.written.some((m) => m.type === "recorded"));
    // The owned late path never materialized and the artifact ref was
    // never admitted into the retained evidence.
    await assert.rejects(
      fsp.lstat(path.join(env.workspaceRoot, "check", "late.bin")),
      /ENOENT/,
    );
    const text = (await env.readFile("check/events.jsonl")).toString();
    assert.ok(!text.includes("late-art"));
  });

  await t.test("a late begin is never begun or recorded", async (st) => {
    const { env, driver, res } = await idleStop(st, {
      type: "begin",
      operationId: "late-op",
      kind: "command",
    });
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(driver.written.filter((m) => m.type === "stop").length, 1);
    assert.ok(
      !driver.written.some(
        (m) => m.type === "begun" && m.operationId === "late-op",
      ),
    );
    // No operation record ever carries the late operationId.
    const text = (await env.readFile("check/events.jsonl")).toString();
    assert.ok(!text.includes("late-op"));
  });

  await t.test("a late closed-shape finish cannot revive a pass or admission", async (st) => {
    const { env, driver, res } = await idleStop(st, {
      type: "finish",
      requestedStatus: "passed",
      requestedExitCode: 0,
      stopReason: null,
      checks: [],
      summary: {},
      analysisEligible: true,
    });
    assert.equal(res.status, "inconclusive");
    assert.equal(res.exitCode, 2);
    assert.equal(res.stopReason, "REQUESTED");
    assert.equal(driver.written.filter((m) => m.type === "stop").length, 1);
    // The retained final record itself stays the receipt-derived
    // inconclusive/REQUESTED — the attempted passed finish never
    // revived the sealed outcome or reopened admission.
    const final = JSON.parse(
      (await env.readFile("check/final.json")).toString(),
    );
    assert.equal(final.status, "inconclusive");
    assert.equal(final.stopReason, "REQUESTED");
  });
});
