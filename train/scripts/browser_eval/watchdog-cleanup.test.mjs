// watchdog-cleanup.test.mjs: the real createCleanupController over the
// scripted monitor fixture — original-start staged timing,
// descendants-first ordering, all-scope coverage (the nested selftest
// scope and a third actual scope with its own ports included),
// protected-root and listener proof, collector-last reap, missing and
// failed driver settlement before that reap, sticky probe verdicts
// (unavailable -> gone), shorter inherited horizons and the private
// settled proof vs claimedProof. The withheld-driver-close settlement
// case and the staged-offsets anchoring case moved WHOLE to the
// declared watchdog-driver-boundaries.test.mjs owner under the
// same-path capacity move (fourteen named cases remain local). A
// synthetic unit pass is never Native or phase acceptance.
import test from "node:test";
import assert from "node:assert/strict";

import { identity } from "./supervision-test-fixtures.mjs";
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

test("descendants-first TERM, all-scope coverage, protected roots, collector-last", async () => {
  const live = new Set([10, 11, 12]);
  const { clk, monitor, calls, cc, lifetime } = fixture(ROWS, {
    observation: OBS,
    probe: (i) => (live.has(i.pid) ? "same-live" : "gone"),
    // A TERM alone never removes the controlled target: the live set
    // survives TERM so the real KILL stage at the original +4000 is
    // genuinely observed — never deleted on TERM merely to fake gone.
    onSignal: ({ signal, identity: idArg }) => {
      if (signal === "KILL") live.delete(idArg.pid);
    },
    signalResult: "sent",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  // The driver row's handle settles through a REAL observed channel —
  // actual exit plus BOTH retained pipe closes, emitted on the genuine
  // fake child before cleanup (a pre-reap close already counts).
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const proof = await drive(clk, cc.run(makeArgs(clk, driverMap)));
  const sigs = calls.filter((c) => c.startsWith("signal:"));
  // TERM lands first descendants-first 12,11,10 while every target is
  // still live; the same actual order is then observed at KILL — the
  // real +2000/+4000 stages, never a TERM-only shortcut.
  assert.deepEqual(
    sigs
      .filter((s) => s.startsWith("signal:TERM"))
      .map((s) => s.split(":")[2]),
    ["12", "11", "10"],
  );
  assert.deepEqual(
    sigs
      .filter((s) => s.startsWith("signal:KILL"))
      .map((s) => s.split(":")[2]),
    ["12", "11", "10"],
  );
  // Protected healthy roots are never targets or signals.
  assert.ok(!sigs.some((s) => ["1", "2"].includes(s.split(":")[2])));
  // Listener proof while the collector lives; collector reap last —
  // asserted on the controller's OWN completed call sequence BEFORE the
  // negative probe below adds its own entry to the shared log.
  assert.ok(calls.indexOf("queryListeners:R1") < calls.indexOf("stopAndReap"));
  assert.equal(calls.at(-1), "stopAndReap");
  assert.equal(proof.verified, true);
  assert.equal(proof.survivorIdentities.length, 0);
  await assert.rejects(
    monitor.signalOwned({ identity: SUP, signal: "TERM", scopeRunId: "R1" }),
    /SIGNAL_PROTECTED/,
  );
});

test("selftest scope narrows exactly and never reaps the collector", async () => {
  const { clk, calls, cc } = fixture(ROWS, {
    observation: OBS,
    listeners: { SELF: { listeners: [], unexpected: [] } },
  });
  const proof = await drive(
    clk,
    cc.run(args(clk, { scope: "selftest-workload", scopeRunId: "SELF" })),
  );
  assert.equal(proof.scope, "selftest-workload");
  assert.ok(calls.includes("queryListeners:SELF"));
  assert.ok(!calls.includes("stopAndReap"));
  assert.ok(!calls.some((c) => c.startsWith("signal:")));
  assert.equal(proof.verified, true);
});

test("a nested selftest-scope row is covered exactly under phase-workload", async () => {
  const rows = ROWS.concat(row(13, 10, "workload", true, "R1:watchdog-selftest"));
  const { clk, calls, cc, lifetime } = fixture(rows, {
    observation: OBS,
    // Every included tuple carries its own explicit coherent fact — the
    // nested row's verdict is the discriminating one under test.
    probes: {
      "10:1000:0": "gone",
      "11:1000:0": "gone",
      "12:1000:0": "gone",
      "13:1000:0": "gone",
    },
    listeners: {
      R1: { listeners: [], unexpected: [] },
      "R1:watchdog-selftest": { listeners: [], unexpected: [] },
    },
    stopResult: { exitCode: 0 },
  });
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const proof = await drive(clk, cc.run(makeArgs(clk, driverMap)));
  assert.ok(calls.some((c) => c.startsWith("probe:13:")));
  assert.ok(calls.includes("queryListeners:R1"));
  assert.ok(calls.includes("queryListeners:R1:watchdog-selftest"));
  assert.equal(proof.verified, true);
});

test("a third actual scope contributes its rows and registered ports", async () => {
  const rows = ROWS.concat(
    row(13, 10, "workload", true, "R1:watchdog-selftest"),
    row(14, 10, "helper", true, "R1:query"),
  );
  const { clk, monitor, calls, cc, lifetime } = fixture(rows, {
    observation: OBS,
    // Every OTHER included tuple is coherent gone so only the third
    // scope's retained port can keep the proof unverified.
    probes: {
      "10:1000:0": "gone",
      "11:1000:0": "gone",
      "12:1000:0": "gone",
      "13:1000:0": "gone",
      "14:1000:0": "gone",
    },
    listeners: {
      R1: { listeners: [], unexpected: [] },
      "R1:watchdog-selftest": { listeners: [], unexpected: [] },
      "R1:query": {
        listeners: [{ address: "127.0.0.1", port: 7555, pid: 4141 }],
        unexpected: [],
      },
    },
    stopResult: { exitCode: 0 },
  });
  // The third scope's port is genuinely REGISTERED under it before
  // cleanup — the query finding it live is the discriminating fact.
  monitor.registerPort({
    address: "127.0.0.1",
    port: 7555,
    ownerIdentity: identity(14),
    scopeRunId: "R1:query",
  });
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const proof = await drive(clk, cc.run(makeArgs(clk, driverMap)));
  assert.ok(calls.includes("queryListeners:R1"));
  assert.ok(calls.includes("queryListeners:R1:watchdog-selftest"));
  assert.ok(calls.includes("queryListeners:R1:query"));
  // The third scope's live port keeps the proof unverified and recorded.
  assert.equal(proof.verified, false);
  assert.deepEqual(
    proof.listenersRemaining.map((l) => l.port),
    [7555],
  );
});

test("a shorter inherited horizon never advances stages and stays unproven", async () => {
  const { clk, calls, cc } = fixture(ROWS, {});
  const t0 = clk.nowMonoMs();
  const p = cc.run(args(clk, { deadlineMonoMs: t0 + 1500 }));
  await assert.rejects(drive(clk, p), /CLEANUP_UNPROVEN/);
  // TERM at original+2000 was beyond the window; nothing fired early.
  assert.ok(!calls.some((c) => c.startsWith("signal:")));
});

test("an already-exhausted window admits no fresh stage", async () => {
  const { clk, calls, cc } = fixture(ROWS, {});
  const t0 = clk.nowMonoMs();
  const p = cc.run(args(clk, { cleanupStartMonoMs: t0 - 6000 }));
  await assert.rejects(drive(clk, p), /CLEANUP_UNPROVEN/);
  assert.ok(!calls.some((c) => c.startsWith("probe:") || c.startsWith("signal:")));
});

test("returned unavailable verdicts and thrown probes are sticky failures", async () => {
  const a = fixture(ROWS, { observation: OBS, probeDefault: "unavailable" });
  const pa = await drive(a.clk, a.cc.run(args(a.clk)));
  assert.equal(pa.accountingValid, false);
  assert.equal(pa.verified, false);
  assert.ok(pa.survivorIdentities.length > 0);

  const err = new Error("probe lost");
  const b = fixture(ROWS, { observation: OBS, probeError: err });
  const pb = await drive(b.clk, b.cc.run(args(b.clk)));
  assert.equal(pb.accountingValid, false);
  assert.equal(pb.verified, false);
});

test("an unavailable verdict followed by gone settles on the LAST probe", async () => {
  let gone = false;
  const { clk, calls, cc, lifetime } = fixture(ROWS, {
    observation: OBS,
    probe: () => (gone ? "gone" : "unavailable"),
    signalResult: "sent",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  const p = cc.run(makeArgs(clk, driverMap));
  // The early stage probes all returned unavailable: sticky fault set,
  // targets still live candidates signalled at TERM.
  await advanceBy(clk, 6);
  gone = true;
  const proof = await drive(clk, p);
  assert.ok(calls.some((c) => c.startsWith("signal:TERM")));
  assert.equal(proof.accountingValid, false); // sticky
  assert.equal(proof.verified, false);
  assert.equal(proof.survivorIdentities.length, 0);
});

test("survivors and registered listeners keep the proof unverified but recorded", async () => {
  const { clk, calls, cc } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "same-live",
    listeners: {
      R1: {
        listeners: [{ address: "127.0.0.1", port: 9222, pid: 9999 }],
        unexpected: [{ listener: { address: "0.0.0.0", port: 1, pid: 8888 } }],
      },
    },
    stopResult: { exitCode: 0 },
  });
  const proof = await drive(clk, cc.run(args(clk)));
  assert.equal(proof.verified, false);
  assert.equal(proof.survivorIdentities.length, 3);
  assert.deepEqual(
    proof.listenersRemaining.map((l) => l.port).sort(),
    [1, 9222],
  );
  assert.ok(calls.includes("queryListeners:R1"));
});

test("a missing settleWorkloadHandles with an actual driver row stays unproven", async () => {
  const { clk, cc } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const proof = await drive(clk, cc.run(args(clk))); // no settle callback
  assert.equal(proof.accountingValid, false);
  assert.equal(proof.verified, false);
});

test("a nested driver row owes settlement under the selftest scope too", async () => {
  const rows = ROWS.concat(row(13, 10, "driver", true, "SELF"));
  const { clk, cc } = fixture(rows, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { SELF: { listeners: [], unexpected: [] } },
  });
  // selftest-workload with an actual included driver row and no settle
  // callback is unproven — the same registry debt as the parent scope.
  const proof = await drive(
    clk,
    cc.run(args(clk, { scope: "selftest-workload", scopeRunId: "SELF" })),
  );
  assert.equal(proof.accountingValid, false);
  assert.equal(proof.verified, false);
});

test("a failed driver settlement stays unproven before the collector reap", async () => {
  const bad = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const p2 = await drive(
    bad.clk,
    bad.cc.run(
      args(bad.clk, {
        settleWorkloadHandles: async () => {
          throw new Error("reap lost");
        },
      }),
    ),
  );
  assert.equal(p2.accountingValid, false);
  assert.equal(p2.verified, false);
});

test("verifyCleanup returns the actual settled proof, never a claimed shape", async () => {
  const { clk, cc, lifetime } = fixture(ROWS, {
    observation: OBS,
    probeDefault: "gone",
    signalResult: "sent",
    listeners: { R1: { listeners: [], unexpected: [] } },
    stopResult: { exitCode: 0 },
  });
  const driverMap = drivers(clk, { driver: { pid: 10 } }, {
    retainActual: lifetime.retainActual,
  });
  closeDriverFacts(driverMap.get("driver"));
  await drive(clk, cc.run(makeArgs(clk, driverMap)));
  // A null or mismatched claim is rejected outright.
  assert.throws(
    () =>
      cc.verifyCleanup({
        phase: "check",
        runId: "R1",
        supervisor: SUP,
        claimedProof: null,
      }),
    /CLEANUP_UNPROVEN/,
  );
  assert.throws(
    () =>
      cc.verifyCleanup({
        phase: "check",
        runId: "R1",
        supervisor: SUP,
        claimedProof: { scope: "selftest-workload", expectedFinalizer: SUP },
      }),
    /CLEANUP_UNPROVEN/,
  );
  // The valid bound claim receives a deep copy of the real settled
  // proof; mutating it never weakens the retained settlement.
  const p = cc.verifyCleanup({
    phase: "check",
    runId: "R1",
    supervisor: SUP,
    claimedProof: { scope: "phase-workload", expectedFinalizer: SUP },
  });
  assert.equal(p.scope, "phase-workload");
  assert.equal(p.verified, true);
  p.verified = false;
  p.survivorIdentities.push(identity(999));
  const p2 = cc.verifyCleanup({
    phase: "check",
    runId: "R1",
    supervisor: SUP,
    claimedProof: { scope: "phase-workload", expectedFinalizer: SUP },
  });
  assert.equal(p2.verified, true);
  assert.equal(p2.survivorIdentities.length, 0);
  assert.throws(() =>
    cc.verifyCleanup({
      phase: "check",
      runId: "OTHER",
      supervisor: SUP,
      claimedProof: { scope: "phase-workload", expectedFinalizer: SUP },
    }),
  );
});

test("unsettled verifyCleanup throws CLEANUP_UNPROVEN", () => {
  const { cc } = fixture(ROWS, {});
  assert.throws(() =>
    cc.verifyCleanup({
      phase: "check",
      runId: "R1",
      supervisor: SUP,
      claimedProof: null,
    }),
  );
});
