// Fixed operational assembly. No injected proof/capture/verifier callbacks.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createNativeHorizon } from "./process-horizon.mjs";
import { createProcessMonitor } from "./processes.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createPhaseRecorder } from "./records.mjs";
import { createCleanupController } from "./watchdog-cleanup.mjs";
import { createWatchdog } from "./watchdog.mjs";
import { createPgnEvidence } from "./pgn-evidence.mjs";
import { createFinalIntegrity } from "./final-integrity.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { issueActual } from "./artifact-files.mjs";
import { buildGameSchedule, validateOpeningFixture } from "./phase-fixtures.mjs";
import { FIXED_LIMITS, REQUIRED_CHECK_IDS, REQUIRED_PARENT_PHASES } from "./schema-constants.mjs";

const now = () => Number(process.hrtime.bigint() / 1000000n);
const clock = { setTimeout, clearTimeout };
const handle = (deadlineMonoMs) => createBudgetHandle({ deadlineMonoMs, clock, nowMonoMs: now });
const refFor = (filename, bytes) => ({ path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) });
const manifestFor = ({ phase, runId, workspace, inputs, prerequisites, owner = null }) => ({
  schemaVersion: 1, workspaceId: workspace.workspaceId, runId, phase,
  commonIdentitySha256: sha256Bytes(canonicalBytes(workspace.commonIdentity)),
  inputs, limits: FIXED_LIMITS, requiredCheckIds: REQUIRED_CHECK_IDS[phase], prerequisites, owner,
});

export async function executeSupervisor({ phase, workspaceRoot, repoRoot, captured, lifetime, budget, phaseDeadlineMonoMs }) {
  assertWatchdogLifetime(lifetime);
  const { workspace, inputs } = captured;
  assertRecord("workspace", workspace);
  if (!REQUIRED_PARENT_PHASES[phase] || !path.isAbsolute(workspaceRoot) || !path.isAbsolute(repoRoot)) {
    throw new Error("RUN_INVALID supervisor arguments");
  }
  budget.assertLive("supervisor inputs");
  const sourceIO = createSnapshotIO({ workspaceRoot, repoRoot, budget, lifetime });
  const io = Object.freeze({ retainActual: lifetime.retainActual });
  const parents = [];
  for (const parent of REQUIRED_PARENT_PHASES[phase]) {
    budget.assertLive("parent receipt read");
    const filename = `${parent}/completion.json`;
    const bytes = await sourceIO.readAt(workspaceRoot, filename);
    const completionRef = refFor(filename, bytes);
    const verified = await verifyReceipt({ workspaceRoot, completionRef,
      expectedIdentity: workspace.commonIdentity }, io);
    budget.assertLive("parent receipt verified");
    parents.push({ phase: verified.phase, runId: verified.runId, completion: completionRef });
  }
  // Capture once before Store and all Native/driver/browser startup.
  if (!Number.isSafeInteger(phaseDeadlineMonoMs) || phaseDeadlineMonoMs <= now()) {
    throw new Error("RUN_INVALID spent original phase deadline");
  }
  budget.assertLive("Native assembly admission");
  const phaseBudget = handle(phaseDeadlineMonoMs);
  let detach = null;
  try {
    const nativeHorizon = createNativeHorizon();
    detach = nativeHorizon.reader.subscribe((bound) => phaseBudget.narrow(bound));
    const runId = `${phase}-${randomUUID()}`;
    const protocol = createProtocolValidator({ runId });
    const environment = workspace.commonIdentity.environment;
    const harnessRoot = path.join(workspaceRoot, "inputs/harness");
    const cli = path.join(harnessRoot, "train/scripts/browser_eval/cli.mjs");
    const monitor = createProcessMonitor({ runId,
      pythonExecutable: environment.python.runtime.invocationPath,
      helperPath: path.join(harnessRoot, "train/scripts/browser_eval/process-macos.py"),
      recordRoot: harnessRoot, protocol, horizon: nativeHorizon.reader, lifetime,
      expectedBackendIdentity: environment.monitoring });
    const footprint = createFootprintObserver({ workspaceRoot });
    const store = createArtifactStore({ workspaceRoot, lifetime, monotonicNow: now,
      readFootprint: () => issueActual(lifetime.retainActual, () => footprint.readFootprint()) });
    const makeRun = ({ manifest, runProtocol, cleanup, internalContext = null }) => {
      const workEndMonoMs = Math.min(phaseDeadlineMonoMs,
        internalContext === null ? phaseDeadlineMonoMs : Number(internalContext.deadlineMonoNs / 1000000n)) - 5000;
      const finalIntegrity = createFinalIntegrity({ workspaceRoot, manifest,
        expectedCommonIdentity: workspace.commonIdentity, workEndMonoMs, lifetime });
      const recorder = createPhaseRecorder({ store, workspace, manifest,
        verifyIdentity: finalIntegrity.consume, verifyCleanup: cleanup.verifyCleanup });
      return { recorder, options: {
        phase: manifest.phase, runId: manifest.runId, commonIdentitySha256: manifest.commonIdentitySha256,
        workspace, manifestPath: path.join(workspaceRoot,
          manifest.phase === "watchdog-selftest" ? "preflight/selftest/manifest.json" : `${manifest.phase}/manifest.json`),
        protocol: runProtocol, monitor, footprint, recorder, cleanup, finalIntegrity,
        driverEntry: { executable: environment.node.invocationPath, expectedExecutable: environment.node.realPath,
          args: [cli, "--driver", "--workspace-root", workspaceRoot, "--repo-root", repoRoot,
            "--manifest", manifest.phase === "watchdog-selftest" ? "preflight/selftest/manifest.json" : `${manifest.phase}/manifest.json`] },
        prerequisites: manifest.prerequisites, lifetime,
        ...(internalContext === null ? { nativeHorizon, phaseDeadlineMonoMs } : {
          internalContext, selftestOwnerSupervisor: manifest.owner.supervisor,
        }),
      } };
    };
    const recordCleanup = (recorderRef) => ({ runId, monitor, lifetime,
      recordEvent: (event) => recorderRef.current.appendEvent(event) });
    const parentRecorder = { current: null };
    const cleanup = createCleanupController(recordCleanup(parentRecorder));
    const manifest = manifestFor({ phase, runId, workspace, inputs, prerequisites: parents });
    const assembled = makeRun({ manifest, runProtocol: protocol, cleanup });
    parentRecorder.current = assembled.recorder;
    let pgnEvidence = null;
    if (["preflight", "compare"].includes(phase)) {
      const openings = validateOpeningFixture(parseJSONBytes(await sourceIO.readAt(workspaceRoot,
        "inputs/harness/train/fixtures/browser-openings.json", true)));
      pgnEvidence = createPgnEvidence({ workspaceRoot, runId, phase,
        gameSchedule: buildGameSchedule(phase === "compare" ? { phase, openings } : { phase }) },
      { budget: phaseBudget, lifetime });
    }
    const runInternalSelfTest = async (context) => {
      // Borrow the exact parent monitor/Store/walk and opaque driver subtree.
      // The nested controller owns only its scoped cleanup, never the parent.
      if (context.monitor !== monitor || context.parentRunId !== runId || context.subrunRunId !== `${runId}:watchdog-selftest`) {
        throw new Error("RUN_INVALID nested owner binding");
      }
      const nestedId = context.subrunRunId;
      const nestedManifest = manifestFor({ phase: "watchdog-selftest", runId: nestedId,
        workspace, inputs, prerequisites: [], owner: context.owner });
      const nestedRecorder = { current: null };
      const nestedCleanup = createCleanupController({ runId: nestedId, monitor, lifetime,
        recordEvent: (event) => nestedRecorder.current.appendEvent(event) });
      const nested = makeRun({ manifest: nestedManifest,
        runProtocol: createProtocolValidator({ runId: nestedId }), cleanup: nestedCleanup, internalContext: context });
      nestedRecorder.current = nested.recorder;
      await createWatchdog(nested.options).run();
      const current = handle(Number(context.deadlineMonoNs / 1000000n));
      try {
        current.assertLive("selftest completion read");
        const reader = createSnapshotIO({ workspaceRoot, repoRoot, budget: current, lifetime });
        const filename = "preflight/selftest/completion.json";
        const bytes = await reader.readAt(workspaceRoot, filename);
        assertRecord("completion", parseCanonicalBytes(bytes));
        return { completionRef: refFor(filename, bytes) };
      } finally {
        current.dispose();
      }
    };
    // All constructor-only identities/resources are genuine before run entry.
    // The Watchdog owns manifest→Native→running→parent admission→driver order.
      return await createWatchdog({ ...assembled.options, pgnEvidence,
        runInternalSelfTest: phase === "preflight" ? runInternalSelfTest : null }).run();
  } finally {
    if (detach !== null) detach();
    phaseBudget.dispose();
  }
}
