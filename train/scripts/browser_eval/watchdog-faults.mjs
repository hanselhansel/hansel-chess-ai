// Sole private fault array/recorder moved whole from Watchdog for readable capacity.
// Pure construction. First diagnostic is detached, bounded and never required debt.
import { reportSupervisorFault } from "./watchdog-lifetime.mjs";

export function createWatchdogFaultRecorder({ nowNs, lifetime, scope }) {
  const faults = [];
  const recordFault = (error) => {
    if (faults.length === 0) {
      Promise.resolve().then(() => reportSupervisorFault(lifetime, scope, error)).catch(() => {});
    }
    faults.push({
      code: error && error.code ? error.code : "FAULT",
      detail: error && error.message ? error.message.slice(0, 4096) : "?",
      atMonoNs: nowNs().toString(),
    });
  };
  return Object.freeze({ faults, recordFault });
}
