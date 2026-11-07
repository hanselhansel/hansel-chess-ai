// Private cleanup context: whole existing argument/callback owner, moved for capacity.
// One original start/C derives P; no clock, timer or work at construction.
import { FIXED_LIMITS } from "./record-schema.mjs";
import { finishDriverActualScope } from "./watchdog-driver.mjs";
import { observeAwaitStage } from "./watchdog-lifetime.mjs";

export const cleanupProofEnd = (start, end, scope) => scope === "selftest-workload" ? end :
  Math.min(end, Math.max(start, end - FIXED_LIMITS.timing.sampleGapMs));

// createWatchdogCleanupArgs owns the WHOLE cleanupArgs capacity moved
// intact from the facade under corrective 64: pure construction over the
// SAME grouped {config,capabilities,state,timing} refs — now = timing.now
// and T = FIXED_LIMITS.timing keep the original clock and fixed constants
// — and the returned function is assigned unchanged to
// control.cleanupArgs. No constructor clock read, callback, IO, second
// cleanup controller or new authority.
export function createWatchdogCleanupArgs({ config, capabilities, state, timing }) {
  const now = timing.now;
  const T = FIXED_LIMITS.timing;
  const stage = (label, issue) => observeAwaitStage(capabilities.lifetime,
    config.selftestPhase ? "selftest" : "phase", label, issue);
  const cleanupArgs = ({ settleRequiredLiveEvidence = null, proofDeadlineMonoMs = null } = {}) => {
    const start = state.cleanupStart === null ? now() : state.cleanupStart;
    const end = state.cleanupEnd === null ? Math.min(start + T.cleanupMs, state.phaseEnd) : state.cleanupEnd;
    const scope = config.selftestPhase ? "selftest-workload" : "phase-workload";
    const P = cleanupProofEnd(start, end, scope);
    if (proofDeadlineMonoMs !== null && proofDeadlineMonoMs !== P) throw new Error("cleanup proof fence mismatch");
    const check = () => {
      if (now() >= P) throw Object.assign(new Error("cleanup proof fence expired"), { code: "CLEANUP_UNPROVEN" });
    };
    return ({
    phase: config.phase,
    scope: config.selftestPhase ? "selftest-workload" : "phase-workload",
    scopeRunId: config.runId,
    expectedFinalizer: config.selftestPhase
      ? config.selftestOwnerSupervisor
      : state.running,
    supervisor: state.running,
    deadlineMonoMs: end,
    // Trusted run-context callback: the SAME operation owner's ordinary
    // settlement joins FIRST — outside its own drained body, covering
    // admitted nested callbacks and an own nested shutdown/STOP — then
    // the real driver channel reap/close under the same absolute
    // ORIGINAL end, then the enrolled driver scope finish, then the
    // supplied already-scheduled required live-evidence task. A null
    // channel never skips the remaining debts, and a missing ops method
    // is a failure, never a permissive skip. No proof boolean, identity
    // or signal authority.
    settleWorkloadHandles: async ({ deadlineMonoMs }) => {
      if (deadlineMonoMs !== P) throw new Error("cleanup callback fence mismatch");
      check();
      if (state.ops !== null) await stage("shutdown.ordinary", () => state.ops.whenOrdinarySettled());
      check();
      if (state.channel !== null) {
        await stage("shutdown.driver-reap", () => state.channel.reap(Math.max(1, deadlineMonoMs - now())));
      }
      check();
      // Own scope finish fences ctor/send/enrollment across the ENTIRE
      // enrolled subtree and passively joins its real receipts — nested
      // and partial-ctor attempts included, never a parent global zero.
      await stage("shutdown.driver-scope", () => finishDriverActualScope(capabilities.driverActualScope));
      check();
      if (typeof settleRequiredLiveEvidence === "function") {
        await Promise.resolve().then(() => { check(); return settleRequiredLiveEvidence(); });
        check();
      }
    },
    // Anchors TERM/KILL/proof staging to the ORIGINAL captured cleanup
    // entry — never to a delayed callback inside the cleanup routine.
    cleanupStartMonoMs: start,
  });
  };
  return cleanupArgs;
}
