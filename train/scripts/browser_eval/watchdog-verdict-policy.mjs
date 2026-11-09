// Whole original sticky-RSS and finish-boundary projection/retention group.
// No owned state, stop latch, clock, timer or ledger. Pure capture only.
export function createWatchdogResourceChecks({
  monitor,
  state,
  recordFault,
  latchStop,
  makeError: fail,
}) {
  // The sticky Native overage flag: a retained historical observed fact —
  // never a fresh sample — checked before ordinary admission, before a
  // finish may be admitted and again after cleanup before finalization.
  const rssExceeded = () => {
    try {
      const mo = monitor.lastObservation();
      return mo !== null && mo.rssLimitExceeded === true;
    } catch {
      return false;
    }
  };

  const stopFinishOnOverage = () => {
    const mo = monitor.lastObservation();
    if (mo !== null && mo.rssLimitExceeded === true) {
      const e = fail("RESOURCE_RSS", `peak ${mo.peakRssBytes}`);
      // Retain the actual separate current/peak/flag/time/verdict for the
      // rapid high -> lower -> finish race through the existing resource
      // lane — the fault detail alone never replaces real observations.
      const rssBytes = Number.isSafeInteger(mo.rssBytes) ? mo.rssBytes : null;
      const peakRssBytes = Number.isSafeInteger(mo.peakRssBytes) ? mo.peakRssBytes : null;
      const accountingValid = mo.accountingValid === true;
      const atMonoNs = mo.atMonoNs !== undefined ? `${mo.atMonoNs}` : null;
      recordFault(e);
      latchStop(e.code);
      if (state.records !== null) {
        void state.records
          .recordEvent("resource", {
            rssBytes,
            peakRssBytes,
            rssLimitExceeded: true,
            accountingValid,
            atMonoNs,
          })
          .catch(recordFault);
      }
      return true;
    }
    return false;
  };

  return Object.freeze({ rssExceeded, stopFinishOnOverage });
}
