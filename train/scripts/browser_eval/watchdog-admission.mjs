// Pre-driver admission over the existing owned admission slot. A stop-aware
// public wait never substitutes for the actual body joined after Native stop.
import { createBudgetHandle } from "./process-budget.mjs";
import { admitPhase } from "./prerequisites.mjs";
import { issueActual } from "./artifact-files.mjs";

export async function admitWatchdogDriver({ config, capabilities, state, timing, bounded, checkLive }) {
  if (config.selftestPhase && capabilities.finalIntegrity === null) return;
  const { io, monitor, finalIntegrity } = capabilities;
  state.admissionTask = issueActual(io.retainActual, async () => {
    if (!config.selftestPhase) {
      const budget = config.workspace.commonIdentity.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3"
        ? createBudgetHandle({ deadlineMonoMs: state.workEnd,
          clock: { setTimeout, clearTimeout }, nowMonoMs: timing.now }) : null;
      try { return await admitPhase({
        workspaceRoot: config.workspaceRoot, phase: config.phase,
        commonIdentity: config.workspace.commonIdentity,
        parents: config.prerequisites.map((parent) => parent.completion),
        probeIdentity: (identity) => monitor.probeIdentity(identity, { deadlineMonoMs: state.workEnd }),
      }, io, budget === null ? undefined : { budget }); } finally { budget?.dispose(); }
    }
    // Own durable manifest/running already exist. Never import a parent
    // observation; collection checks all own association fields before IO.
    const inputs = await state.records.manifestInputs();
    checkLive("own scan inputs");
    await finalIntegrity.collect({ workspaceId: config.workspace.workspaceId,
      runId: config.runId, phase: config.phase,
      expectedCommonIdentity: config.workspace.commonIdentity, inputs },
    { deadlineMonoMs: state.workEnd });
  }).finally(() => { state.admissionTask = null; });
  await bounded(state.admissionTask, Math.max(1, timing.workRemainingMs()), "parent/own-scan admission");
  checkLive("parent/own-scan admission");
}
