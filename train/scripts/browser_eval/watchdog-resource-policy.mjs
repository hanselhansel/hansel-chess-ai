// Whole original resource-poll group over borrowed references. The facade
// retains first-stop authority, and state.resourceTask remains the sole FS body.
import { FIXED_LIMITS } from "./record-schema.mjs";
import { issueActual } from "./artifact-files.mjs";

const L = FIXED_LIMITS;

export function armResourcePolling({ capabilities, state, timing, control, makeError: fail }) {
  const { clock, monitor, footprint, io } = capabilities;
  // The resource interval's Native check never waits on footprint IO.
  // Every bounded observation is retained through the existing
  // "resource" event lane with the ACTUAL sample's own atMonoNs,
  // current rss, peak, sticky flag and real accounting verdict —
  // including invalid projections — never a synthesized zero, so a
  // transient measured overage stays on record even when a later
  // reading drops below the limit or the projection turns invalid.
  const latchResource = (e, emit) => {
    control.recordFault(e);
    control.latchStop(e && e.code ? e.code : "ACCOUNTING_UNAVAILABLE");
    if (emit !== undefined) emit();
    void control.faultEvent(e);
  };
  const scan = clock.setInterval(() => {
    if (state.stopReq !== null || state.finishReq !== null) return;
    const mo = monitor.lastObservation();
    const rssBytes =
      mo !== null && Number.isSafeInteger(mo.rssBytes) ? mo.rssBytes : null;
    const peakRssBytes =
      mo !== null && Number.isSafeInteger(mo.peakRssBytes)
        ? mo.peakRssBytes
        : null;
    const rssLimitExceeded = mo !== null && mo.rssLimitExceeded === true;
    const accountingValid = mo !== null && mo.accountingValid === true;
    const atMonoNs =
      mo !== null && mo.atMonoNs !== undefined ? `${mo.atMonoNs}` : null;
    const emitResource = () => {
      if (state.records !== null) {
        void state.records
          .recordEvent("resource", {
            rssBytes,
            peakRssBytes,
            rssLimitExceeded,
            accountingValid,
            atMonoNs,
          })
          .catch(control.recordFault);
      }
    };
    try {
      if (!mo || mo.accountingValid !== true) {
        let detail = "native observation";
        try {
          const retained = monitor.fault?.()?.detail;
          if (typeof retained === "string") detail += `: ${retained}`;
        } catch {}
        throw fail("ACCOUNTING_UNAVAILABLE", detail.slice(0, 4096));
      }
      if (mo.rssLimitExceeded === true || mo.rssBytes > L.resources.rssBytes)
        throw fail("RESOURCE_RSS", `peak ${mo.peakRssBytes}`);
    } catch (e) {
      latchResource(e, emitResource);
      return;
    }
    emitResource();
    // No overlap: an in-flight slow FS body is retained as the ONE
    // private resourceTask promise for the later outside-body
    // shutdown join — an actual promise only, no proof flag or
    // second ledger — and its own finally clears the reference. The
    // Native check above stays independent of this scan; the
    // admitted raw callback settles truthfully on either outcome.
    if (state.resourceTask !== null) return;
    try {
      state.resourceTask = issueActual(io.retainActual, () =>
        footprint.scan(),
      )
        .then((s) => {
          if (state.stopReq !== null || state.finishReq !== null) return;
          if (!s || s.accountingValid !== true)
            throw fail("ACCOUNTING_UNAVAILABLE", "footprint");
          if (s.chargedBytes > L.resources.workspaceBytes)
            throw fail("RESOURCE_WORKSPACE", `${s.chargedBytes}`);
        })
        .catch(latchResource)
        .finally(() => {
          state.resourceTask = null;
        });
    } catch (e) {
      // A synchronous arm failure in this raw interval callback
      // still goes through the same fault/stop authority.
      latchResource(e);
    }
  }, 1000);
  timing.timers.add(scan);
}
