// watchdog-records-test-fixtures.mjs (TEST-ONLY): the WHOLE local
// adapter setup/settle helpers moved from watchdog-records.test.mjs
// under the declared corrective-46 record-adapter fixture leaf —
// original comments, actual argument/default meanings and caller
// result/error preserved; the suite imports the IDENTICAL exported
// helpers as setup/settleCleanup aliases with no local mirror. ONE
// cleanupMonitorFixture and ONE createRunDrainBinding over that SAME
// monitor; the genuine temporary store/workspace/input bytes/manifest/
// createPhaseRecorder are constructed directly through the existing
// real exports so no unused second raw controller exists — env.cleanup
// is the SAME binding.cleanup and the recorder's verifyCleanup uses
// that exact binding verifier unless the already-intentional
// negative-case override supplies a genuine failing callback.
// The genuine R4 binding: the ORIGINAL recorder's timed runtime binds
// ONCE through phaseRecorderLifetime(recorder) plus the SAME fixture
// clock callback BEFORE any recorder use, ONE frozen same-owner io
// forwards unchanged into the real 8-field adapter, and ONE finite
// ORIGINAL entry end at nowMonoMs()+10000 captured BEFORE acquisition
// bounds every returned transparent finalizeAndRead(request) — the
// additive 8th return key indexes and returns the ORIGINAL adapter
// Promise unchanged. Preregistered slots and the local actual-body
// array land on the SAME per-test teardown owner BEFORE any
// factory/FS/finalize effect: the acquired store/root are saved
// before canonicalization and write awaits, the recorder slot before
// later effects, settle joins the actual factory body then every
// actual finalize/body debt and binding.settleActual, and a real
// incomplete close runs only when no finalization was ever admitted —
// an admitted actual finalize pipeline owns the closure and is never
// blindly closed or caught RECORDER_STATE-as-sealed, while a
// rejected/unknown close retains the root and the original error,
// never catch-error-then-rm. The OUTER per-test closure observation
// whole-moved to the shared base owner and is re-exported here as the
// IDENTICAL function object. No test() declaration, import-time
// effect, second controller/proof mint, fake validator, status setter
// or production hook; a synthetic pass is never Native or phase
// acceptance.
import path from "node:path";
import { promises as fsp } from "node:fs";

import { artifactStoreLifetime } from "./artifact-store.mjs";
import { copyDeep } from "./protocol-values.mjs";
import {
  createPhaseRecorder,
  phaseRecorderLifetime,
  writeWorkspaceOnce,
} from "./records.mjs";
import { createWatchdogRecordAdapter } from "./watchdog-records.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  fixtureCommonIdentity,
  fixtureManifest,
  fixtureRunning,
  fixtureWorkspace,
  makeStore,
  writeFixtureInputs,
} from "./test-fixtures.mjs";
import {
  cleanupMonitorFixture,
  observeRecorderFixtureClosure,
  watchdogTestClock,
} from "./watchdog-test-fixtures.mjs";
import {
  createRunDrainBinding,
  drain,
  issueFixtureBody,
} from "./watchdog-drain-test-fixtures.mjs";
import {
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-fs-test-fixtures.mjs";

// The OUTER per-test closure observation whole-moved to the shared
// base owner — re-exported here as the IDENTICAL function object so
// the accepted import path and the four-export roster stay unchanged.
export { observeRecorderFixtureClosure } from "./watchdog-test-fixtures.mjs";

// Drive the real cleanup controller's stage delays through the declared
// binding tap: the ORIGINAL associated cleanup.run q advances only the
// real +2000/+4000 boundaries with genuine turns for pending
// recorder/store IO — never a manual 500 ms pending-IO pump and never a
// whole-window jump past the ORIGINAL bound.
export const settleRecordCleanup = async (
  clk,
  env,
  binding,
  phase = "check",
  runId = "R1",
) => {
  const q = binding.cleanup.run({
    phase,
    scope: "phase-workload",
    scopeRunId: runId,
    expectedFinalizer: env.supervisor,
    supervisor: env.supervisor,
    deadlineMonoMs: clk.nowMonoMs() + 5000,
    cleanupStartMonoMs: clk.nowMonoMs(),
  });
  return drain(clk, q);
};

export function setupRecordAdapter(
  t,
  { phase = "check", runId = "R1", pgnEvidence = null, verifyCleanup } = {},
) {
  return ownFixtureAttempt(t, () =>
    setupRecordAdapterBody(t, { phase, runId, pgnEvidence, verifyCleanup }),
  );
}

// The raw assembly body: the ownFixtureAttempt receipt is preregistered
// BEFORE any monitor/binding/workspace effect below, so the whole setup
// is itself a joined body on the same per-test owner.
const setupRecordAdapterBody = async (
  t,
  { phase, runId, pgnEvidence, verifyCleanup },
) => {
  const clk = watchdogTestClock();
  const supervisor = identity(7000);
  // The ONE finite ORIGINAL fixture end captured at setup ENTRY on the
  // SAME fixture clock — before any monitor/binding/acquisition effect,
  // never a refreshed now+ recomputed after cleanup and never a caller
  // duration override.
  const originalEnd = clk.nowMonoMs() + 10000;
  // The declared binding tap over ONE real monitor: the recorder's
  // verifyCleanup forwards to the SAME bound controller the caller
  // drains — the genuine settled proof is the one the real receipt
  // verifies, no second controller or minted proof.
  const { monitor, calls: monitorCalls } = cleanupMonitorFixture({
    runId,
    clock: clk,
    supervisor,
    collector: identity(7001),
    rows: [],
    script: {
      observation: {
        accountingValid: true,
        rssBytes: 0,
        peakRssBytes: 0,
        rssLimitExceeded: false,
        atMonoNs: "0",
      },
      listeners: { [runId]: { listeners: [], unexpected: [] } },
      stopResult: { exitCode: 0 },
    },
  });
  const binding = createRunDrainBinding({ monitor, clock: clk, runId });
  // Preregistered slots and the local actual-body array, installed
  // BEFORE the first acquisition effect: the settle stage joins the
  // whole dynamic factory body and every actual finalize/body receipt
  // first, then binding.settleActual, then the strict real close ONLY
  // when no finalization was admitted — an admitted pipeline is never
  // sent the forbidden incomplete close and a rejected/unknown close
  // retains the root and the original error. slots.incompletePromise
  // holds the exact genuine incomplete-close promise ONLY when the
  // fixture issues one; runs exposes the ORIGINAL finalization
  // promises so the close decision and the OUTER closure observation
  // read real admission — never an obsolete sealed flag.
  const slots = {
    root: null,
    store: null,
    recorder: null,
    commonIdentity: null,
    incompletePromise: null,
  };
  const bodies = [];
  const runs = [];
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
      try {
        await binding.settleActual();
      } catch (e) {
        if (firstError === null) firstError = e;
      }
      // The actual unfinished-recorder close runs after every body is
      // joined — only when no finalization was ever genuinely
      // admitted; the EXACT issued promise is stored BEFORE the await
      // for the OUTER observation.
      if (slots.recorder !== null && runs.length === 0) {
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
    // every actual body and the SAME owner pipeline settled. A
    // partial factory that never produced a recorder still awaits the
    // SAME acquired store owner's fresh zero before removal.
    afterSettle: async () => {
      if (slots.recorder === null) {
        if (slots.store !== null) {
          await artifactStoreLifetime(slots.store).whenSettled();
        }
        return;
      }
      await observeRecorderFixtureClosure({
        recorder: slots.recorder,
        workspaceRoot: slots.root,
        phase,
        commonIdentity: slots.commonIdentity,
        runs,
        incompleteClosure: slots.incompletePromise,
      });
    },
    remove: () =>
      slots.root !== null
        ? fsp.rm(slots.root, { recursive: true, force: true })
        : undefined,
  });
  // The raw factory body receipt enters the local aggregate BEFORE the
  // acquisition effects run — a mid-assembly failure or early release
  // still removes the root and closes the recorder.
  const env = await issueFixtureBody(bodies, () =>
    acquireAdapterWorkspace({
      phase,
      runId,
      verifyCleanup,
      binding,
      monitor,
      monitorCalls,
      supervisor,
      slots,
    }),
  );
  // The genuine R4 binding BEFORE ANY recorder use: the real inherited
  // owner from phaseRecorderLifetime(recorder) and the SAME fixture
  // clock callback — never a new owner, an alias or a noop. The ONE
  // trusted io carries the exact same-owner {retainActual} own key and
  // forwards unchanged into the adapter; env.recorder is the ORIGINAL
  // genuine recorder, never a spread, proxy or rebranded facade.
  const owner = phaseRecorderLifetime(env.recorder);
  env.recorder.bindRuntime({ lifetime: owner, nowMonoMs: clk.nowMonoMs });
  const io = Object.freeze({ retainActual: owner.retainActual });
  const observerFaults = [];
  const adapter = createWatchdogRecordAdapter({
    recorder: env.recorder,
    pgnEvidence,
    workspaceRoot: env.workspaceRoot,
    manifestRel: `${env.recorder.phaseDirectory}/manifest.json`,
    commonIdentity: env.workspace.commonIdentity,
    phase,
    onObserverFault: (e) => observerFaults.push(e),
    io,
  });
  const boot = async () => {
    await env.recorder.writeManifest();
    await env.recorder.writeRunning(
      fixtureRunning({ manifest: env.manifest, supervisor: env.supervisor }),
    );
  };
  const events = async () =>
    (await env.readFile(`${env.recorder.phaseDirectory}/events.jsonl`))
      .toString()
      .trim()
      .split("\n")
      .map(JSON.parse);
  // The additive transparent finalization helper: the SAME local
  // actual-body receipt is prearmed through issueFixtureBody BEFORE
  // the unchanged adapter finalizeAndRead is invoked under the
  // ORIGINAL entry-captured end; the ORIGINAL Promise is indexed on
  // runs and returned unchanged — no .then wrapper, substitution or
  // new authority.
  const finalizeAndRead = (request) => {
    const p = issueFixtureBody(bodies, () =>
      adapter.finalizeAndRead(request, { deadlineMonoMs: originalEnd }),
    );
    runs.push(p);
    return p;
  };
  return { clk, env, adapter, boot, events, observerFaults, binding, finalizeAndRead };
};

// The genuine acquisition tail: the real store/workspace/input/manifest
// IO and the real unstarted recorder bound to the declared binding —
// invoked only through the issueFixtureBody receipt above. The actual
// acquired root lands in the slot BEFORE the throwing canonicalization
// and the recorder lands before later effects.
const acquireAdapterWorkspace = async ({
  phase,
  runId,
  verifyCleanup,
  binding,
  monitor,
  monitorCalls,
  supervisor,
  slots,
}) => {
  const { store, workspaceRoot } = await makeStore();
  // The SAME acquired store lands in the slot immediately BEFORE the
  // canonical/write awaits; the actual acquired root lands BEFORE the
  // throwing canonicalization — a realpath failure still leaves the
  // owned root removable.
  slots.store = store;
  slots.root = workspaceRoot;
  const canonicalRoot = (slots.root = await fsp.realpath(workspaceRoot));
  const ws = fixtureWorkspace({ commonIdentity: fixtureCommonIdentity() });
  slots.commonIdentity = ws.commonIdentity;
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  const manifest = fixtureManifest({ workspace: ws, phase, runId, inputs });
  const recorder = (slots.recorder = createPhaseRecorder({
    store,
    workspace: ws,
    manifest,
    verifyIdentity: async () => copyDeep(ws.commonIdentity),
    verifyCleanup:
      verifyCleanup ?? ((arg) => binding.cleanup.verifyCleanup(arg)),
  }));
  return {
    workspaceRoot: canonicalRoot,
    store,
    workspace: ws,
    manifest,
    recorder,
    inputs,
    supervisor,
    monitor,
    monitorCalls,
    cleanup: binding.cleanup,
    readFile: (rel) => fsp.readFile(path.join(canonicalRoot, rel)),
    removeWorkspace: () =>
      fsp.rm(canonicalRoot, { recursive: true, force: true }),
  };
};

// One registration per created root/env: returns the SAME env after
// installing this test's teardown and attaching an additive finalize
// wrapper to the plain fixture env — env.recorder/env.store stay the
// genuine constructor-produced originals, never spread, proxied or
// rebranded. The wrapper prearms a neutral settlement receipt BEFORE
// synchronously invoking the real recorder.finalize thunk, then
// returns the ORIGINAL result/promise/error unchanged, so the
// before-first-await input snapshot behavior is preserved; actual
// fulfillment is tracked separately and a rejected body is never
// cancelled or retried into a fictional success. Teardown joins every
// admitted finalize body first, closes an unfinished recorder —
// tolerating RECORDER_STATE only when this env's own finalizer is
// known actually fulfilled and already owned the closure — awaits the
// SAME owner's fresh whenSettled only after its own issuance closed,
// then removes the root. Any other close failure or unknown debt
// preserves the root and propagates.
export const registerCleanup = (t, env) => {
  const bodies = new Set();
  let finalizerFulfilled = false;
  env.finalize = (args) => {
    let settle;
    const receipt = new Promise((resolve) => {
      settle = resolve;
    });
    bodies.add(receipt);
    let result;
    try {
      result = env.recorder.finalize(args);
    } catch (error) {
      settle();
      throw error;
    }
    Promise.resolve(result).then(
      () => {
        finalizerFulfilled = true;
        settle();
      },
      () => {
        settle();
      },
    );
    return result;
  };
  t.after(async () => {
    for (const receipt of [...bodies]) await receipt;
    if (env.recorder !== undefined) {
      try {
        await env.recorder.closeIncompleteEvidence();
      } catch (error) {
        if (!(finalizerFulfilled && error?.code === "RECORDER_STATE")) {
          throw error;
        }
      }
    }
    await artifactStoreLifetime(env.store).whenSettled();
    await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  });
  return env;
};
