// watchdog-cleanup-test-fixtures.mjs (TEST-ONLY): the WHOLE
// watchdog-cleanup.test.mjs setup/constants/driver block, moved under
// the readable test-owner split, plus the WHOLE genuine-evidence
// workspace factory owned here under the declared delegation and
// re-exported identically through watchdog-evidence-test-fixtures.mjs
// (this owner NEVER imports the evidence helper — no cycle). Imported
// only by the cleanup suite and the evidence helper; never imported by
// production modules. It owns the registry-row builder, the shared
// supervisor/collector/observation bindings, the literal cleanup.run
// argument factory, the declared bound fake-clock drivers, the
// one-fixture assembly over the createRunDrainBinding tap on the REAL
// createCleanupController plus the scripted monitor/clock (whole-moved
// to the child leaf, re-exported identically with SUP/COL), and the
// evidence factory whose aggregate/slots and teardown are
// preregistered BEFORE the first acquisition effect. No test()
// declaration, new registry/clock/queue/proof authority, process or
// top-level IO; a synthetic pass is never Native or phase acceptance.
import path from "node:path";
import { promises as fsp } from "node:fs";

import { copyDeep } from "./protocol-values.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { verifyInternalSelfTest } from "./prerequisites.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  cleanupMonitorFixture,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import {
  fixtureCommonIdentity,
  fixtureManifest,
  fixtureRunning,
  fixtureWorkspace,
  makeStore,
  runReceiptPhase,
  writeFixtureInputs,
} from "./test-fixtures.mjs";
import {
  COL,
  SUP,
  fixture,
} from "./watchdog-child-test-fixtures.mjs";
import {
  createRunDrainBinding,
  drain,
  issueFixtureBody,
} from "./watchdog-drain-test-fixtures.mjs";
import { finishDriverActualScope } from "./watchdog-driver-actual.mjs";
import {
  disposeFixture,
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-fs-test-fixtures.mjs";

export const row = (pid, ppid, kind, workload, scope) => ({
  identity: identity(pid),
  ppid,
  pgid: pid,
  kind,
  workload,
  scopeRunId: scope,
});

// supervisor/collector stay healthy roots; driver/workload rows are the
// only targets, ordered descendants-first by the real controller.
export const ROWS = [
  row(1, 0, "supervisor", false, "R1"),
  row(2, 1, "collector", false, "R1"),
  row(10, 1, "driver", true, "R1"),
  row(11, 10, "workload", true, "R1"),
  row(12, 11, "workload", true, "R1"),
];

export const OBS = {
  accountingValid: true,
  rssBytes: 0,
  peakRssBytes: 0,
  rssLimitExceeded: false,
  atMonoNs: "0",
};

export const args = (clk, extra = {}) => ({
  phase: "check",
  scope: "phase-workload",
  scopeRunId: "R1",
  expectedFinalizer: SUP,
  supervisor: SUP,
  deadlineMonoMs: clk.nowMonoMs() + 5000,
  cleanupStartMonoMs: clk.nowMonoMs(),
  ...extra,
});

// Corrective 43/44 whole moves: drivers and closeDriverFacts now live
// on the child leaf while advanceBy and drive live on the drain leaf —
// each re-exported here as the IDENTICAL function object so the
// accepted import path stays unchanged. Corrective 67 also moves SUP,
// COL and the one-fixture assembly to the child leaf identically.
export { closeDriverFacts, drivers } from "./watchdog-child-test-fixtures.mjs";
export { SUP, COL, fixture } from "./watchdog-child-test-fixtures.mjs";
export { advanceBy, drive } from "./watchdog-drain-test-fixtures.mjs";

// args plus the REAL owned settleWorkloadHandles: every declared driver
// channel reaps under the same original absolute end, in map order. A
// retained close observed before this reap already counts; a withheld
// close leaves the debt unproven until the actual close lands.
export const makeArgs = (clk, driverMap = new Map(), extra = {}) =>
  args(clk, {
    settleWorkloadHandles: async ({ deadlineMonoMs }) => {
      const remaining = Math.max(1, deadlineMonoMs - clk.nowMonoMs());
      for (const { channel } of driverMap.values()) {
        await channel.reap(remaining);
      }
      // Only after every original public reap settles positively: join
      // the SAME owned driver scopes — physical join before the
      // collector-last stage, never a public catch treated as proof.
      for (const entry of driverMap.values()) {
        if (entry.actualScope !== undefined) {
          await finishDriverActualScope(entry.actualScope);
        }
      }
    },
    ...extra,
  });

const FAIL = (detail) => {
  const e = new Error(`watchdog-cleanup-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

const keyOf = (i) => (i ? `${i.pid}:${i.startSec}:${i.startUsec}` : null);

// One owned temporary workspace with REAL evidence: genuine retained
// input bytes, retained check then parity ancestors produced through
// the existing runReceiptPhase ONLY as graph preconditions — parity
// carries the check row and the parent preflight carries BOTH rows,
// identically in the parent manifest and the createWatchdog options —
// a genuine watchdog-selftest completion receipt (real ArtifactRef
// bytes+sha) produced by a real recorder bound to the REAL
// createCleanupController.verifyCleanup through the declared binding
// tap for the exact owner
// {phase:"preflight", runId:parentRunId, supervisor:parentSupervisor},
// and a fresh positive verifyInternalSelfTest control validating the
// whole CommonIdentity, the exact real ref/owner and an observed
// same-live parent. The parent manifest/running are constructed but
// returned UNWRITTEN — the actual watchdog runtime writes its own
// records. ownFixtureAttempt preregisters the raw body so the original
// caller error is preserved while every acquired resource still
// receives its actual closure; a failed or unknown physical close
// retains the root/instrumentation/error and no rm ever runs from a
// catch or a public timeout.
export function makeEvidenceWorkspace(
  t,
  { clock, parentRunId = "R1", parentSupervisor = identity(7000) } = {},
) {
  return ownFixtureAttempt(t, () =>
    makeEvidenceWorkspaceBody(t, { clock, parentRunId, parentSupervisor }),
  );
}

// The raw factory body: the slots and teardown are preregistered on the
// SAME per-test owner BEFORE the first makeStore/workspace/input/record
// effect — a root or recorder acquired before or after the disposal
// latch still reaches its actual close because settle reads the slots,
// never a null-time snapshot. stSealed is armed false and only the
// genuine finalize fulfillment below ever sets it. Nothing registers
// fresh global debt after the closed fence.
const makeEvidenceWorkspaceBody = async (t, { clock, parentRunId, parentSupervisor }) => {
  const clk = clock ?? watchdogTestClock();
  const slots = {
    root: null,
    stBinding: null,
    stRecorder: null,
    stSealed: false,
  };
  // The local prearmed actual-settlement array: issueFixtureBody
  // pushes the raw assembly receipt BEFORE the acquire body may run,
  // so this settle stage joins the whole dynamic body — including a
  // still-in-flight acquisition — BEFORE it reads the final
  // stBinding/stRecorder slots or runs the real close. A disposal
  // mid-acquisition can never observe a null-slot gap.
  const bodies = [];
  registerFixtureTeardown(t, {
    settle: async () => {
      let firstError = null;
      for (let i = 0; i < bodies.length; i += 1) {
        try {
          await bodies[i];
        } catch (e) {
          if (firstError === null) firstError = e;
        }
      }
      if (slots.stBinding !== null) {
        try {
          await slots.stBinding.settleActual();
        } catch (e) {
          if (firstError === null) firstError = e;
        }
      }
      // The actual unfinished-recorder close runs after the binding's
      // real bodies join — a known successfully sealed recorder is never
      // sent the forbidden incomplete close, and a close error stays an
      // error rather than being swallowed as settlement.
      if (slots.stRecorder !== null && !slots.stSealed) {
        try {
          await slots.stRecorder.closeIncompleteEvidence();
        } catch (e) {
          if (firstError === null) firstError = e;
        }
      }
      if (firstError !== null) throw firstError;
    },
    remove: () =>
      slots.root !== null
        ? fsp.rm(slots.root, { recursive: true, force: true })
        : undefined,
  });
  return issueFixtureBody(bodies, () =>
    acquireEvidenceWorkspace(t, { clk, parentRunId, parentSupervisor, slots }),
  );
};

// The raw acquire tail: the real store/workspace/input/record IO, the
// retained check then parity ancestors, the genuine selftest
// controller/recorder lane and the positive verifyInternalSelfTest
// control — invoked only through the issueFixtureBody receipt above.
const acquireEvidenceWorkspace = async (
  t,
  { clk, parentRunId, parentSupervisor, slots },
) => {
  const { store, workspaceRoot, ctl } = await makeStore();
  // The actual acquired root lands in the slot BEFORE the throwing
  // canonicalization — a realpath failure still leaves the owned root
  // removable; on success the slot refines to the canonical path.
  slots.root = workspaceRoot;
  const canonicalRoot = (slots.root = await fsp.realpath(workspaceRoot));
  const ws = fixtureWorkspace({ commonIdentity: fixtureCommonIdentity() });
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  const env = {
    store,
    workspaceRoot: canonicalRoot,
    ws,
    inputs,
    readFile: (rel) => fsp.readFile(path.join(canonicalRoot, rel)),
  };
  const receiptEnv = { ...env, ctl };
  // The retained ancestors: the EXISTING runReceiptPhase drives real
  // check then parity receipts as graph preconditions only — the exact
  // rows {phase, runId, completion} feed the parent, never fabricated
  // refs or a ProcessIdentity as CommonIdentity.
  const check = await runReceiptPhase({
    env: receiptEnv,
    phase: "check",
    runId: `${parentRunId}:check`,
  });
  const checkRow = {
    phase: "check",
    runId: check.mf.runId,
    completion: check.completionRef,
  };
  const parity = await runReceiptPhase({
    env: receiptEnv,
    phase: "parity",
    runId: `${parentRunId}:parity`,
    prerequisites: [checkRow],
  });
  const parityRow = {
    phase: "parity",
    runId: parity.mf.runId,
    completion: parity.completionRef,
  };
  const prerequisites = [checkRow, parityRow];
  const parentManifest = fixtureManifest({
    workspace: ws,
    phase: "preflight",
    runId: parentRunId,
    prerequisites,
    inputs,
  });
  const selftestRunId = `${parentRunId}:watchdog-selftest`;
  // The genuine nested receipt: a REAL recorder run bound to the REAL
  // staged cleanup controller — reached through the declared
  // createRunDrainBinding tap — under the same fake clock, with coherent
  // declared synthetic facts only (empty registry, valid observation,
  // empty listener inventory, observed same-live parent).
  const stManifest = fixtureManifest({
    workspace: ws,
    phase: "watchdog-selftest",
    runId: selftestRunId,
    owner: { phase: "preflight", runId: parentRunId, supervisor: parentSupervisor },
    inputs,
  });
  const { monitor: stMonitor } = cleanupMonitorFixture({
    runId: selftestRunId,
    clock: clk,
    supervisor: parentSupervisor,
    collector: identity(7001),
    rows: [],
    script: {
      probes: { [keyOf(parentSupervisor)]: "same-live" },
      observation: OBS,
      listeners: { [selftestRunId]: { listeners: [], unexpected: [] } },
      signalResult: "sent",
      stopResult: { exitCode: 0 },
    },
  });
  const stBinding = (slots.stBinding = createRunDrainBinding({
    monitor: stMonitor,
    clock: clk,
    runId: selftestRunId,
  }));
  const stCleanup = stBinding.cleanup;
  const stRecorder = (slots.stRecorder = createPhaseRecorder({
    store,
    workspace: ws,
    manifest: stManifest,
    verifyIdentity: async () => copyDeep(ws.commonIdentity),
    verifyCleanup: (arg) => stCleanup.verifyCleanup(arg),
  }));
  await stRecorder.writeManifest();
  await stRecorder.writeRunning(
    fixtureRunning({ manifest: stManifest, supervisor: parentSupervisor }),
  );
  // The REAL staged cleanup settles at its original fixed offsets
  // through the declared bound drain — no manual 500 ms pending-IO
  // loop: the original promise already associated by the tap advances
  // only the unconsumed +2000 then +4000 boundaries, then real
  // IO/required settlement drains with the clock held.
  const stRun = stCleanup.run({
    phase: "watchdog-selftest",
    scope: "selftest-workload",
    scopeRunId: selftestRunId,
    expectedFinalizer: parentSupervisor,
    supervisor: parentSupervisor,
    deadlineMonoMs: clk.nowMonoMs() + 60000,
    cleanupStartMonoMs: clk.nowMonoMs(),
  });
  await drain(clk, stRun);
  // Caller checks stay EMPTY — the real recorder derives the four
  // passed selftest checks; no caller claim is ever added. A genuinely
  // fulfilled finalize alone marks the recorder sealed.
  const selftestRef = await stRecorder
    .finalize({
      intent: {
        status: "inconclusive",
        exitCode: 2,
        stopReason: "HEARTBEAT_TIMEOUT",
        summary: { scoredGames: 0 },
        unplannedFaultCount: 0,
        analysisEligible: false,
      },
      checks: [],
      prerequisites: [],
      expectedSelfTest: null,
    })
    .then((v) => {
      slots.stSealed = true;
      return v;
    });
  // A FRESH positive verifyInternalSelfTest control validates the whole
  // CommonIdentity, the exact real ref/owner and the observed same-live
  // parent — verifyReceipt alone is never the equivalent control.
  const control = await verifyInternalSelfTest({
    workspaceRoot: canonicalRoot,
    completionRef: selftestRef,
    parentRunId,
    parentSupervisor,
    expectedIdentity: ws.commonIdentity,
    probeIdentity: stMonitor.probeIdentity,
  });
  if (
    control.runId !== selftestRunId ||
    control.parentRunId !== parentRunId ||
    control.completionRef.path !== selftestRef.path ||
    control.completionRef.byteLength !== selftestRef.byteLength ||
    control.completionRef.sha256 !== selftestRef.sha256
  ) {
    throw FAIL("positive selftest control mismatch");
  }
  const dispose = () => disposeFixture(t);
  return {
    env,
    commonIdentity: ws.commonIdentity,
    parentSupervisor,
    selftestRef,
    prerequisites,
    parentManifest,
    dispose,
  };
};
