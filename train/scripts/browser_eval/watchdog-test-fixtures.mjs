// watchdog-test-fixtures.mjs (TEST-ONLY): shared watchdog-suite fixture
// owner imported only by the watchdog suites. It re-exports the ONE
// shared fake monotonic clock/timer hub (whole-moved to the drain
// leaf) and the scripted monitor surface with its explicit tuple/probe/
// listener/observation facts and no proof authority (whole-moved to
// the child leaf), plus the faithful fork-shaped driver child
// validated by the REAL createProtocolValidator boundary inside the
// driver channel and the REAL-FS recorder interception owner
// (whole-moved to the child leaf); its own content is a real unstarted
// createPhaseRecorder over an owned temporary workspace with actual
// retained input bytes and the OUTER per-test closure observation
// whole-moved from the records adapter leaf. It performs no
// real fork/spawn/kill, Native, browser, model or network work, holds no
// production state, never mutates production modules, and is excluded
// from the functional-runtime input union and BackendIdentity.helpers.
// Owned temporary files are released by removeWorkspace. A synthetic
// fixture pass is never an actual Native, phase or cleanup pass.
import { promises as fsp, realpathSync } from "node:fs";
import path from "node:path";

import { issueActual } from "./artifact-files.mjs";
import { copyDeep } from "./protocol-values.mjs";
import { createPhaseRecorder, phaseRecorderLifetime, writeWorkspaceOnce } from "./records.mjs";
import { loadRecord } from "./receipt-files.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  fixtureCommonIdentity,
  fixtureManifest,
  fixtureWorkspace,
  makeStore,
  writeFixtureInputs,
} from "./test-fixtures.mjs";
import { cleanupMonitorFixture } from "./watchdog-child-test-fixtures.mjs";
import { watchdogTestClock } from "./watchdog-drain-test-fixtures.mjs";

// The WHOLE fork-shaped child implementation moved to the declared child
// leaf; this base owner re-exports it unchanged so every existing
// importer keeps the same signature and returned roster.
export { forkDriverFixture } from "./watchdog-child-test-fixtures.mjs";

// Corrective 67 whole moves: the shared fake clock/timer hub now lives
// on the drain leaf and the scripted monitor surface on the child
// leaf — both re-exported here as the IDENTICAL function objects so
// every existing importer and this owner's own callsites stay
// unchanged. The REAL-FS recorder interception owner whole-moved to
// the child leaf is re-exported the same way.
export { watchdogTestClock } from "./watchdog-drain-test-fixtures.mjs";
export { cleanupMonitorFixture } from "./watchdog-child-test-fixtures.mjs";
export { instrumentRecorderFs } from "./watchdog-child-test-fixtures.mjs";

// Private to the whole-moved closure observation below — its original
// watchdog-records-fixture prefix and FIXTURE_CONFIG code are kept.
const FAIL = (detail) => {
  const e = new Error(`watchdog-records-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

// One owned temporary workspace with a real unstarted createPhaseRecorder
// bound to actual retained input bytes and a genuine cleanup hook. The
// canonical realpath root resolves macOS /var aliases; `commonIdentity`
// overrides the closed synthetic identity when supplied; `verifyCleanup`
// overrides the hook (a real createCleanupController.verifyCleanup is
// bound otherwise — never an always-true stub). readFile reads bounded
// files; removeWorkspace releases required files then deletes owned
// temporary data. No receipt, hash or artifact reference is synthesized.
export async function watchdogRecordWorkspace({
  phase = "check",
  runId = "R1",
  clock,
  verifyCleanup,
  commonIdentity,
} = {}) {
  const { store, workspaceRoot } = await makeStore();
  const canonicalRoot = realpathSync(workspaceRoot);
  const ws = fixtureWorkspace({
    commonIdentity: commonIdentity ?? fixtureCommonIdentity(),
  });
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  const manifest = fixtureManifest({ workspace: ws, phase, runId, inputs });
  const clk = clock ?? watchdogTestClock();
  const supervisor = identity(7000);
  const { monitor, calls } = cleanupMonitorFixture({
    runId,
    clock: clk,
    supervisor,
    collector: identity(7001),
    rows: [],
    // The bound controller's own explicit coherent facts — an empty
    // registry settles verified with no fabricated probe/signal/handle.
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
  const cleanup = createCleanupController({ monitor, clock: clk, runId });
  const verifyIdentity = async () => copyDeep(ws.commonIdentity);
  const recorder = createPhaseRecorder({
    store,
    workspace: ws,
    manifest,
    verifyIdentity,
    verifyCleanup: verifyCleanup ?? ((arg) => cleanup.verifyCleanup(arg)),
  });
  const readFile = (rel) => fsp.readFile(path.join(canonicalRoot, rel));
  const removeWorkspace = async () => {
    await fsp.rm(canonicalRoot, { recursive: true, force: true });
  };
  return {
    workspaceRoot: canonicalRoot,
    store,
    workspace: ws,
    manifest,
    recorder,
    inputs,
    supervisor,
    monitor,
    monitorCalls: calls,
    cleanup,
    readFile,
    removeWorkspace,
  };
}

// PRIVATE helper-to-helper exports declared under corrective 41 before
// use: the WHOLE owned check-workspace block — genuine acquisition on
// the same real constructors, the actual unfinished-recorder close
// policy and the owned root removal — moved whole from the run fixture
// and bound to the SAME caller-preregistered `slots` object. These
// helpers touch ONLY slots.root/slots.recorder/slots.env and the
// actual run/incomplete-promise slots: the driver/watchdog/controller
// ownership, the
// closed latch, the late-body aggregate and the raw run bindings stay
// with the run fixture, which preregisters the assembly receipt before
// invocation and registers no fresh global debt after a closed fence.
// All three are inert at import — every filesystem or recorder effect
// happens only inside an explicit call — and no catch ever converts a
// factory error or a rejected close into success.

// The genuine check-workspace assembly: slots.root lands immediately
// after acquisition/realpath and BEFORE the next writes, slots.recorder
// BEFORE subsequent use and slots.env BEFORE return. `cleanup` is the
// SAME real-controller tap the caller bound — verifyCleanup forwards
// its real verifier — and verifyIdentity copies the actual workspace
// commonIdentity. Env keeps every original watchdogRecordWorkspace key.
export async function assembleOwnedWatchdogCheckWorkspace({
  runId,
  supervisor,
  monitor,
  monitorCalls,
  cleanup,
  slots,
} = {}) {
  const { store, workspaceRoot } = await makeStore();
  // The actual acquired root lands in the slot BEFORE the throwing
  // canonicalization — a realpath failure still leaves the owned root
  // removable; on success the slot refines to the canonical path.
  slots.root = workspaceRoot;
  slots.root = realpathSync(workspaceRoot);
  const ws = fixtureWorkspace({ commonIdentity: fixtureCommonIdentity() });
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  const manifest = fixtureManifest({ workspace: ws, phase: "check", runId, inputs });
  const verifyIdentity = async () => copyDeep(ws.commonIdentity);
  const recorder = createPhaseRecorder({
    store,
    workspace: ws,
    manifest,
    verifyIdentity,
    verifyCleanup: (a) => cleanup.verifyCleanup(a),
  });
  slots.recorder = recorder;
  const env = {
    workspaceRoot: slots.root,
    store,
    workspace: ws,
    manifest,
    recorder,
    inputs,
    supervisor,
    monitor,
    monitorCalls,
    cleanup,
    readFile: (rel) => fsp.readFile(path.join(slots.root, rel)),
    removeWorkspace: () => fsp.rm(slots.root, { recursive: true, force: true }),
  };
  slots.env = env;
  return env;
}

// The actual unfinished-recorder close: issued only when the fixture
// never admitted a real run — an admitted run owns the recorder
// pipeline and the OUTER afterSettle observation classifies its
// closure, so no obsolete sealed flag decides here. The exact issued
// closeIncompleteEvidence promise is retained on slots.incompletePromise
// for that observation; a rejected close stays the actual error, never
// an assumed settlement, and a missing/failed/unresolved close never
// authorizes deletion.
export async function closeOwnedWatchdogWorkspace(slots) {
  if (slots.recorder === null || slots.recorder === undefined) return;
  if (slots.runs !== null && slots.runs !== undefined && slots.runs.length > 0) return;
  slots.incompletePromise = slots.recorder.closeIncompleteEvidence();
  await slots.incompletePromise;
}

// The owned root removal: the acquired env's real removeWorkspace else
// the exact slots.root else no owned root at all — called only from the
// same per-test owner's remove stage after every required body/physical
// close and instrumentation restore has succeeded. Never an early
// finally delete and never a caller-proof or status setter.
export function removeOwnedWatchdogWorkspace(slots) {
  if (slots.env !== null && slots.env !== undefined) {
    return slots.env.removeWorkspace();
  }
  if (slots.root !== null && slots.root !== undefined) {
    return fsp.rm(slots.root, { recursive: true, force: true });
  }
  return undefined;
}

// Corrective 43 whole moves: the run fixture's row/OBS primitives land
// here unchanged — the run owner re-exports the IDENTICAL objects so
// the accepted import path and roster stay unchanged. row uses the
// already-imported supervision identity; no new dependency is added.
export const row = (pid, ppid, kind, workload, scope) => ({
  identity: identity(pid),
  ppid,
  pgid: pid,
  kind,
  workload,
  scopeRunId: scope,
});

export const OBS = {
  accountingValid: true,
  rssBytes: 0,
  peakRssBytes: 0,
  rssLimitExceeded: false,
  atMonoNs: "0",
};

// The OUTER per-test closure observation (corrective 67, declared
// before use): runs ONLY inside the shared owner's afterSettle stage —
// every supplier release and every actual per-test run/controller/body
// callback already completed — never inside a nested fixture's inner
// cleanup. It obtains the genuine phaseRecorderLifetime(recorder),
// derives ONE frozen same-owner io and awaits a FRESH whenSettled
// before any explicit read — no initially-resolved cache — then
// preopens the EXACT canonical phase completion path through
// issueActual plus real fsp.lstat: ONLY an actual ENOENT from THAT
// preopen maps to missing, never a caught EVIDENCE_INCOMPLETE from
// loadRecord/verifyReceipt. A present stat runs the real loadRecord
// and verifyReceipt with the record's own returned ref on the same io
// — genuine graph success plus the already-joined real run/own zero is
// the sealed observation and returns its exact VerifiedEvidence. A
// missing completion is unfinished ONLY with a fulfilled genuine
// incompleteClosure OR a fulfilled ORIGINAL tracked run plus a fresh
// owner-zero re-check — a rejected run or a caught state error alone
// supplies neither fact; every later parse/schema/ref/graph/read error
// stays a failure and retains instrumentation/root. Returns a frozen
// {state, verified} — TEST observation only, never a Recorder, status
// or proof setter.
export const observeRecorderFixtureClosure = async ({
  recorder,
  workspaceRoot,
  phase,
  commonIdentity,
  runs,
  incompleteClosure,
}) => {
  const owner = phaseRecorderLifetime(recorder);
  const io = Object.freeze({ retainActual: owner.retainActual });
  await owner.whenSettled();
  const phaseDir =
    phase === "watchdog-selftest" ? "preflight/selftest" : phase;
  const abs = path.join(
    realpathSync(`${workspaceRoot}`),
    phaseDir,
    "completion.json",
  );
  const stat = await issueActual(io.retainActual, () =>
    fsp.lstat(abs),
  ).then(
    (s) => s,
    (error) => {
      if (error !== null && error !== undefined && error.code === "ENOENT") {
        return null;
      }
      throw error;
    },
  );
  if (stat !== null) {
    const { ref } = await loadRecord(
      workspaceRoot,
      `${phaseDir}/completion.json`,
      "completion",
      undefined,
      io,
    );
    const verified = await verifyReceipt(
      { workspaceRoot, completionRef: ref, expectedIdentity: commonIdentity },
      io,
    );
    return Object.freeze({ state: "sealed", verified });
  }
  let closed = false;
  if (incompleteClosure !== null && incompleteClosure !== undefined) {
    closed = await Promise.resolve(incompleteClosure).then(
      () => true,
      () => false,
    );
  }
  if (!closed) {
    for (const p of runs) {
      if (
        await Promise.resolve(p).then(
          () => true,
          () => false,
        )
      ) {
        closed = true;
        break;
      }
    }
    if (closed) await owner.whenSettled();
  }
  if (!closed) throw FAIL("recorder closure unproven");
  return Object.freeze({ state: "unfinished", verified: null });
};
