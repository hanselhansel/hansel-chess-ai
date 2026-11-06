// watchdog-run-test-fixtures.mjs (TEST-ONLY): the WHOLE watchdog.test.mjs
// per-run setup and temporal/driver-control block, moved under the
// readable test-owner split. Imported only by watchdog.test.mjs; never
// imported by production modules. setupRun binds the SAME real
// createCleanupController into the real recorder's verifyCleanup through
// the declared createRunDrainBinding tap — owned by the declared
// watchdog-drain-test-fixtures.mjs leaf and re-exported here IDENTICALLY
// (the same function objects, never wrappers) — the real fork-IPC
// fixture, an owned workspace and an optional owned fault-IO gate. The
// returned w is the ACTUAL watchdog object unchanged — never a
// shape-compatible {run, requestStop} substitute — and the additive
// owned run()/dispose() share the one per-test owner so run admission
// closes synchronously the moment ANY shared-owner disposal begins.
// The WHOLE workspace acquisition, actual recorder-close and owned
// root-removal block delegates to the base watchdog-test-fixtures
// owner's three declared private exports over the SAME preregistered
// caller slots — this owner keeps the driver/watchdog/controller
// ownership, the closed latch, the late-body aggregate and the raw run
// bindings, so late-acquired resources still receive their owned
// closure rather than being skipped on a null ref, an unfinished real
// recorder without an admitted run is physically closed with its
// exact promise retained, the OUTER afterSettle observation
// classifies the genuine sealed/unfinished closure, and roots are
// removed only after every required body settles.
// No test() declaration, Native/phase/proof authority or new runtime
// export; a synthetic pass is never a Native or phase pass.
import path from "node:path";

import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  assembleOwnedWatchdogCheckWorkspace,
  cleanupMonitorFixture,
  closeOwnedWatchdogWorkspace,
  forkDriverFixture,
  instrumentRecorderFs,
  OBS,
  removeOwnedWatchdogWorkspace,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import { observeRecorderFixtureClosure } from "./watchdog-records-test-fixtures.mjs";
import {
  createRunDrainBinding,
  drain,
  issueFixtureBody,
} from "./watchdog-drain-test-fixtures.mjs";
import {
  disposeFixture,
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-fs-test-fixtures.mjs";

export {
  createRunDrainBinding,
  drain,
  heldGate,
  yieldTurn,
} from "./watchdog-drain-test-fixtures.mjs";
// Corrective 43 whole moves: row/OBS now live on the base owner and
// liveStart/closeFacts/FINISH on the child leaf — every one is
// re-exported here as the IDENTICAL object so the accepted import
// path and returned roster stay unchanged for existing consumers.
export { row, OBS } from "./watchdog-test-fixtures.mjs";
export { closeFacts, FINISH, liveStart } from "./watchdog-child-test-fixtures.mjs";

const FAIL = (detail) => {
  const e = new Error(`watchdog-run-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

export const setupRun = async (t, { monitorScript = {}, rows = [], driverScript = {}, faultGate = null, finalIntegrity = null } = {}) =>
  ownFixtureAttempt(t, () =>
    setupRunBody(t, { monitorScript, rows, driverScript, faultGate, finalIntegrity }),
  );

// The raw assembly body: the ownFixtureAttempt receipt is preregistered
// BEFORE any workspace/monitor/driver/run effect below, so the whole
// setup is itself a joined body on the same per-test owner.
const setupRunBody = async (t, { monitorScript, rows, driverScript, faultGate, finalIntegrity }) => {
  const clk = watchdogTestClock();
  const supervisor = identity(7000);
  // The SAME real controller verifies the recorder through the declared
  // binding tap: no unrelated hook can conceal an unproven cleanup behind
  // an inconclusive intent.
  const { monitor, calls: monitorCalls } = cleanupMonitorFixture({
    runId: "R1",
    clock: clk,
    supervisor,
    collector: identity(7001),
    rows,
    script: {
      knownRoots: { 6000: identity(6000) },
      probes: { "6000:1000:0": "gone" },
      listeners: { R1: { listeners: [], unexpected: [] } },
      observation: OBS,
      signalResult: "sent",
      stopResult: { exitCode: 0 },
      ...monitorScript,
    },
  });
  const binding = createRunDrainBinding({ monitor, clock: clk, runId: "R1" });
  const cleanup = binding.cleanup;
  // Preregistered slots and the late-acquisition aggregate, installed
  // BEFORE the first acquisition effect: release sets the closing latch
  // then invokes every queued supplier, while a resource acquired after
  // the latch still receives its owned closure as a joined body — never
  // skipped on a null ref, never a fresh global registration.
  // slots.incompletePromise holds the exact genuine incomplete-close
  // promise ONLY when the fixture issues one (no run was admitted);
  // slots.runs exposes the ORIGINAL tracked run array so the close
  // helper and the OUTER closure observation read real admission —
  // never an obsolete sealed flag.
  const slots = {
    root: null,
    recorder: null,
    env: null,
    incompletePromise: null,
    driver: null,
    w0: null,
  };
  const lateReleases = [];
  const lateBodies = [];
  const runs = [];
  slots.runs = runs;
  let closedLatch = false;
  let runDone = false;
  let stopRequested = false;
  const retain = (e) => {
    const body = Promise.reject(e);
    body.catch(() => {});
    lateBodies.push(body);
  };
  const admitLate = (supply) => {
    if (!closedLatch) {
      lateReleases.push(supply);
      return;
    }
    try {
      lateBodies.push(Promise.resolve().then(supply));
    } catch (e) {
      retain(e);
    }
  };
  const supplyDriverFacts = () => {
    if (slots.driver === null) return;
    slots.driver.exit(0);
    slots.driver.closeOut();
    slots.driver.closeErr();
    slots.driver.disconnect();
  };
  const requestTeardown = () => {
    if (stopRequested || slots.w0 === null || runDone) return;
    stopRequested = true;
    slots.w0.requestStop("TEARDOWN");
  };
  // Registration lands BEFORE the workspace/fork effects it covers: all
  // releases fire first (a still-live run is actually stopped with
  // TEARDOWN and the genuine fake-child exit/BOTH-close facts are
  // supplied), then admitted run/controller/callback bodies are joined
  // through each ORIGINAL p's bound drain plus the binding's actual
  // settlement join, the actual recorder close runs, and the owned
  // workspace is removed only after physical settlement. Nothing
  // registers fresh work after the fence.
  registerFixtureTeardown(t, {
    release: () => {
      closedLatch = true;
      try {
        requestTeardown();
      } catch (e) {
        retain(e);
      }
      for (const supply of lateReleases) {
        try {
          supply();
        } catch (e) {
          retain(e);
        }
      }
    },
    settle: async () => {
      let firstError = null;
      for (const p of runs) {
        try {
          await drain(clk, p);
        } catch (e) {
          if (firstError === null) firstError = e;
        }
      }
      try {
        await binding.settleActual();
      } catch (e) {
        if (firstError === null) firstError = e;
      }
      for (const body of lateBodies) {
        try {
          await body;
        } catch (e) {
          if (firstError === null) firstError = e;
        }
      }
      // The actual unfinished-recorder close runs after every body is
      // joined — ONLY when no run was ever admitted; an admitted run
      // owns the real pipeline and its exact issued close promise is
      // retained on slots.incompletePromise for the OUTER observation.
      try {
        await closeOwnedWatchdogWorkspace(slots);
      } catch (e) {
        if (firstError === null) firstError = e;
      }
      if (firstError !== null) throw firstError;
    },
    // ONE registered OUTER observation, reading the preregistered
    // slots at call time so a late-acquired recorder still resolves —
    // it classifies the genuine sealed/unfinished closure only after
    // every actual body and physical fact above settled.
    afterSettle: () =>
      slots.recorder === null
        ? undefined
        : observeRecorderFixtureClosure({
            recorder: slots.recorder,
            workspaceRoot: slots.root,
            phase: "check",
            commonIdentity: slots.env.workspace.commonIdentity,
            runs,
            incompleteClosure: slots.incompletePromise,
          }),
    remove: () => removeOwnedWatchdogWorkspace(slots),
  });
  // The genuine workspace delegated whole to the base owner over the
  // SAME slots — every acquired piece lands before the next write/effect
  // so a mid-assembly failure or early release still removes the root
  // and closes the recorder. The raw assembly receipt is pushed into
  // lateBodies BEFORE the body is invoked through issueFixtureBody, so
  // the settle stage joins the actual assembly before final resource
  // slots are read or late bodies close.
  const env = await issueFixtureBody(lateBodies, () =>
    assembleOwnedWatchdogCheckWorkspace({
      runId: "R1",
      supervisor,
      monitor,
      monitorCalls,
      cleanup,
      slots,
    }),
  );
  const driver = forkDriverFixture({
    runId: "R1",
    phase: "check",
    commonIdentitySha256: env.manifest.commonIdentitySha256,
    pid: 6000,
    script: driverScript,
  });
  slots.driver = driver;
  admitLate(supplyDriverFacts);
  // One shared cross-owner journal: manifest/monitor.start/running/fork
  // markers land in actual call order so tests compare real sequencing
  // rather than inferring order across separate logs afterward.
  const journal = [];
  const monitorStart = monitor.start;
  monitor.start = (...a) => {
    journal.push("monitor.start");
    // The raw start body is preregistered on the SAME prearmed
    // aggregate BEFORE invocation — its settlement is joined debt
    // independent of the bounded public w.run.
    return issueFixtureBody(lateBodies, () => monitorStart(...a));
  };
  const monitorRegisterRoot = monitor.registerRoot;
  // The ACTUAL original registerRoot body is likewise preregistered on
  // the SAME prearmed aggregate BEFORE invocation — the identical
  // original result/Promise returns and the original args/error/this
  // binding is preserved; monitorCalls still records only the original
  // implementation's calls, no new authority or synthetic receipt.
  monitor.registerRoot = function (...a) {
    return issueFixtureBody(lateBodies, () =>
      monitorRegisterRoot.apply(this, a),
    );
  };
  const forkImpl = driver.forkImpl;
  driver.forkImpl = (...a) => {
    journal.push("fork");
    return forkImpl(...a);
  };
  // The REAL-FS recorder instrument owns the manifest/running rename
  // ADMISSION journals and the ONE held kind:fault events write — the
  // Recorder passed to createWatchdog is the ORIGINAL env.recorder
  // unchanged, never a spread or method facade.
  instrumentRecorderFs(t, {
    workspaceRoot: env.workspaceRoot,
    phase: "check",
    journal,
    faultGate,
    bodies: lateBodies,
  });
  const w0 = createWatchdog({
    phase: "check",
    runId: "R1",
    commonIdentitySha256: env.manifest.commonIdentitySha256,
    workspace: env.workspace,
    manifestPath: path.join(env.workspaceRoot, "check", "manifest.json"),
    protocol: createProtocolValidator({ runId: "R1" }),
    monitor,
    footprint: {
      scan: async () => ({ accountingValid: true, chargedBytes: 100 }),
      stop: () => {},
    },
    recorder: env.recorder,
    cleanup,
    finalIntegrity,
    driverEntry: {
      executable: "/drv/node",
      args: ["/drv/driver.js"],
      expectedExecutable: "/drv/node",
    },
    clock: clk,
    // The JOURNALED injected fork — the same dependency the watchdog
    // actually invokes, so the shared journal sees the real fork call.
    spawnImpl: driver.forkImpl,
  });
  slots.w0 = w0;
  // A watchdog acquired after the closing latch still receives the
  // actual TEARDOWN stop; before the latch this supplier queues with
  // the other releases and the stopRequested guard keeps it single.
  admitLate(requestTeardown);
  // The additive owned run: one-shot, closes admission the moment the
  // shared owner begins disposal (closedLatch is set by our release even
  // when another factory's dispose started it), preregisters the raw
  // run promise BEFORE the actual invocation through ownFixtureAttempt,
  // binds it to the observed cleanup flow and returns the ORIGINAL p.
  let runAdmissionClosed = false;
  const run = () => {
    if (runAdmissionClosed || closedLatch) {
      return Promise.reject(FAIL("run admission closed"));
    }
    runAdmissionClosed = true;
    try {
      const p = ownFixtureAttempt(t, () => w0.run());
      binding.trackRun(p);
      runs.push(p);
      p.then(
        () => {
          runDone = true;
        },
        () => {
          runDone = true;
        },
      );
      return p;
    } catch (e) {
      return Promise.reject(e);
    }
  };
  // Additive dispose: shares the SAME cached per-test disposal Promise
  // every caller uses and closes owned-run admission first.
  const dispose = () => {
    runAdmissionClosed = true;
    return disposeFixture(t);
  };
  // w is the ACTUAL watchdog object — never a substitute shape.
  return { clk, env, driver, monitor, monitorCalls, journal, w: w0, run, dispose };
};
