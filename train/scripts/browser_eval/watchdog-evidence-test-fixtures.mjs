// watchdog-evidence-test-fixtures.mjs (TEST-ONLY): the genuine-evidence
// fixture owner for the watchdog evidence-boundary suite. The WHOLE
// makeEvidenceWorkspace factory moved to the declared
// watchdog-cleanup-test-fixtures.mjs owner under the split and is
// re-exported here identically — the same function object, never a
// wrapper — so the accepted import path and returned roster stay
// unchanged for existing consumers. This owner keeps the actual
// preflight parent watchdog over the same real root: ONE REAL
// createCleanupController/recorder bound verifyCleanup reached through
// the declared createRunDrainBinding tap. The exact-path fs
// interception and the single per-test teardown owner live in the
// watchdog-fs-test-fixtures.mjs child leaf; ONLY gateFs is re-exported
// here — the leaf's two per-test owner functions stay private
// helper-to-helper bindings. Imported only by the evidence-boundary
// suite; never imported by production modules.
// No fabricated ref/verifier/schema, no ProcessIdentity as
// CommonIdentity, no production debug hook, no real
// fork/spawn/kill/Native/network — a synthetic unit pass is never
// Native, phase or cleanup acceptance.
import path from "node:path";

import { copyDeep } from "./protocol-values.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { createPhaseRecorder } from "./records.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  cleanupMonitorFixture,
  forkDriverFixture,
  instrumentRecorderFs,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import { observeRecorderFixtureClosure } from "./watchdog-records-test-fixtures.mjs";
import { createRunDrainBinding, drain } from "./watchdog-run-test-fixtures.mjs";
import { issueFixtureBody } from "./watchdog-drain-test-fixtures.mjs";
import {
  disposeFixture,
  gateFs,
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-fs-test-fixtures.mjs";

export { gateFs, verifyReceipt };
export { makeEvidenceWorkspace } from "./watchdog-cleanup-test-fixtures.mjs";

const FAIL = (detail) => {
  const e = new Error(`watchdog-evidence-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

const keyOf = (i) => (i ? `${i.pid}:${i.startSec}:${i.startUsec}` : null);

const CLEAN_OBS = {
  accountingValid: true,
  rssBytes: 0,
  peakRssBytes: 0,
  rssLimitExceeded: false,
  atMonoNs: "0",
};

// The actual parent watchdog for phase "preflight" over the REAL
// workspace/records and the REAL cleanup verifier reached through the
// declared createRunDrainBinding tap — the injected genuine fake fork
// driver and one fake hrtime clock, the exact preflight
// manifest/CommonIdentity and the SAME check+parity prerequisite rows
// the parent manifest declares, plus one shared cross-owner journal.
// `run` is a FUNCTION: construction starts no runtime effects, the
// first call starts the actual w.run() exactly once and preregisters
// the real body BEFORE the actual invocation through ownFixtureAttempt;
// a second start or a call after ANY shared-owner disposal — including
// evidence.dispose — rejects before effects through the same closed
// admission latch. The injected trusted callback passes through
// UNCHANGED and its body stays caller-owned via ownFixtureAttempt —
// never wrapped into a different trusted callback; the default returns
// the genuine pre-produced completionRef, no duplicate selftest path
// rewrite. The runtime writes its own parent manifest/running exactly
// once — no prewritten parent state. Disposal delegates to the same
// per-test owner: ALL release actions first (the actual TEARDOWN stop
// and the genuine fake-child exit/BOTH-close facts), then each
// ORIGINAL tracked run drained on its bound stage policy, the
// binding's actual bodies and the late bodies joined, the real
// unfinished recorder closed — a known sealed one never sent the
// forbidden incomplete close — then restore/remove. No
// gate.join/global-dispose self-wait, constructor-effect test-only
// ops, Store/Recorder wrapper association, public runtime hook, fake
// Native flag, fabricated proof/ref/schema or top-level
// process/Native.
export async function makePreflightRun(
  t,
  {
    evidence,
    clock,
    runInternalSelfTest,
    monitorScript = {},
    driverScript = {},
    rows = [],
    faultGate = null,
  } = {},
) {
  const clk = clock ?? watchdogTestClock();
  const env = evidence.env;
  const runId = evidence.parentManifest.runId;
  const parentSupervisor = evidence.parentSupervisor;
  const { monitor, calls: monitorCalls } = cleanupMonitorFixture({
    runId,
    clock: clk,
    supervisor: parentSupervisor,
    collector: identity(7001),
    rows,
    script: {
      knownRoots: { 6000: identity(6000) },
      probes: { [keyOf(parentSupervisor)]: "same-live" },
      observation: CLEAN_OBS,
      listeners: {
        [runId]: { listeners: [], unexpected: [] },
        [`${runId}:watchdog-selftest`]: { listeners: [], unexpected: [] },
      },
      signalResult: "sent",
      stopResult: { exitCode: 0 },
      ...monitorScript,
    },
  });
  // The SAME real controller verifies the recorder through the declared
  // binding tap: no unrelated hook can conceal an unproven cleanup
  // behind an inconclusive intent.
  const binding = createRunDrainBinding({ monitor, clock: clk, runId });
  const cleanup = binding.cleanup;
  // Preregistered slots and the late-acquisition aggregate, installed
  // BEFORE the first acquisition effect: release sets the closing latch
  // then invokes every queued supplier, while a resource acquired after
  // the latch still receives its owned closure as a joined body — never
  // skipped on a null ref, never a fresh global registration.
  // slots.incompletePromise holds the exact genuine incomplete-close
  // promise ONLY when the fixture issues one (no run was admitted);
  // slots.runs exposes the ORIGINAL tracked run array so the close
  // decision and the OUTER closure observation read real admission —
  // never an obsolete sealed flag.
  const slots = {
    recorder: null,
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
  let runAdmissionClosed = false;
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
    lateBodies.push(Promise.resolve().then(supply));
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
  // Registration lands BEFORE the recorder/driver/watchdog effects it
  // covers: ALL release actions fire first — a still-live run is
  // actually stopped with TEARDOWN and the genuine fake-child
  // exit/BOTH-close facts are supplied — then each ORIGINAL tracked run
  // is drained, the binding's real bodies and the late bodies are
  // joined, and the actual unfinished-recorder close runs last.
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
      // A competing RECORDER_STATE stays a diagnostic, never proof.
      if (
        slots.recorder !== null &&
        !(slots.runs !== null && slots.runs.length > 0)
      ) {
        try {
          slots.incompletePromise = slots.recorder.closeIncompleteEvidence();
          await slots.incompletePromise;
        } catch (e) {
          if (firstError === null) firstError = e;
        }
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
            workspaceRoot: env.workspaceRoot,
            phase: "preflight",
            commonIdentity: env.ws.commonIdentity,
            runs,
            incompleteClosure: slots.incompletePromise,
          }),
  });
  const records = (slots.recorder = createPhaseRecorder({
    store: env.store,
    workspace: env.ws,
    manifest: evidence.parentManifest,
    verifyIdentity: async () => copyDeep(env.ws.commonIdentity),
    verifyCleanup: (arg) => cleanup.verifyCleanup(arg),
  }));
  const driver = (slots.driver = forkDriverFixture({
    runId,
    phase: "preflight",
    commonIdentitySha256: evidence.parentManifest.commonIdentitySha256,
    pid: 6000,
    script: driverScript,
  }));
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
  // ADMISSION journals — the Recorder passed to createWatchdog is the
  // ORIGINAL records object unchanged, never a spread or facade.
  const instrument = instrumentRecorderFs(t, {
    workspaceRoot: env.workspaceRoot,
    phase: "preflight",
    journal,
    faultGate,
    bodies: lateBodies,
  });
  const w0 = (slots.w0 = createWatchdog({
    phase: "preflight",
    runId,
    commonIdentitySha256: evidence.parentManifest.commonIdentitySha256,
    workspace: env.ws,
    manifestPath: path.join(
      env.workspaceRoot,
      evidence.parentManifest.phase,
      "manifest.json",
    ),
    protocol: createProtocolValidator({ runId }),
    monitor,
    footprint: {
      scan: async () => ({ accountingValid: true, chargedBytes: 100 }),
      stop: () => {},
    },
    recorder: records,
    cleanup,
    driverEntry: {
      executable: "/drv/node",
      args: ["/drv/driver.js"],
      expectedExecutable: "/drv/node",
    },
    clock: clk,
    spawnImpl: driver.forkImpl,
    // The SAME check+parity prerequisite rows the parent manifest
    // already declares — identical, never a second roster.
    prerequisites: evidence.prerequisites,
    // The injected callback reference passes through UNCHANGED — its
    // body is owned by the caller itself via ownFixtureAttempt, never
    // wrapped into a different trusted callback.
    runInternalSelfTest:
      runInternalSelfTest ??
      (async () => ({ completionRef: copyDeep(evidence.selftestRef) })),
  }));
  // A watchdog acquired after the closing latch still receives the
  // actual TEARDOWN stop; before the latch this supplier queues with
  // the other releases and the stopRequested guard keeps it single.
  admitLate(requestTeardown);
  // The additive owned run: one-shot, closes admission the moment the
  // shared owner begins disposal (closedLatch is set by our release even
  // when evidence.dispose started it), preregisters the raw run promise
  // BEFORE the actual invocation through ownFixtureAttempt, binds it to
  // the observed cleanup flow and returns the ORIGINAL p.
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
  // w is the ACTUAL watchdog object — never a substitute shape. The
  // additive settleRecordWrites return is the IDENTICAL
  // instrumentRecorderFs.join: it tracks only actual open/rename/write
  // wrappers — the held kind:fault write included — never the separate
  // required-read gate's FileHandle.read, FD closure or a global
  // self-wait.
  return {
    w: w0,
    driver,
    monitor,
    monitorCalls,
    cleanup,
    journal,
    run,
    dispose,
    settleRecordWrites: instrument.join,
  };
}
