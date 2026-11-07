// watchdog-shutdown.mjs is the private bounded shutdown/finalization owner
// under the final readable-owners decision (19): createWatchdogShutdown
// receives the SAME grouped {config,capabilities,state,timing,control} run
// context and returns {finalize(expected), shutdown()} holding the whole
// bounded cleanup/finalization/outcome-fallback/shutdown sequence extracted
// from the facade. It calls the real records adapter, staged cleanup and
// driver settlement through control.cleanupArgs/intentOutcome/rssExceeded
// and capabilities — never a writer, proof, status or first-stop override.
// Construction is pure: all IO happens inside the returned methods. No
// facade import. It also owns the whole cleanupArgs capacity moved from
// the facade (createWatchdogCleanupArgs); the Awaiter pair now lives in
// watchdog-config.mjs.
import { copyDeep, isObj } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { finishDriverActualScope } from "./watchdog-driver.mjs";
import { observeAwaitStage } from "./watchdog-lifetime.mjs";
import { cleanupProofEnd } from "./watchdog-cleanup-context.mjs";
export { createWatchdogCleanupArgs } from "./watchdog-cleanup-context.mjs";

const fail = (code, detail) => {
  const e = new Error(`watchdog-shutdown ${code}: ${detail}`);
  e.code = code;
  return e;
};

export function createWatchdogShutdown({ config, capabilities, state, timing, control }) {
  const { monitor, cleanup } = capabilities;
  const stage = (label, issue) => observeAwaitStage(capabilities.lifetime,
    config.selftestPhase ? "selftest" : "phase", label, issue);

  // The coherent real result for a missing/failed receipt readback: never a
  // retained zero exit or requested pass. Only the coherent pairs survive —
  // failed/1, inconclusive/2 — never a stale nonzero or a zero exit.
  const intentToOutcome = (intent) => ({
    status: intent.status === "passed" ? "inconclusive" : intent.status,
    exitCode: intent.status === "failed" ? 1 : 2,
    stopReason: intent.stopReason,
  });
  const fallbackOutcome = () => intentToOutcome(control.intentOutcome());

  // Bind the actual final result, including recorder downgrades, never the
  // submitted intent. A missing receipt reports the real nonzero outcome.
  const finalize = async (expected) => {
    const checks = config.selftestPhase
      ? []
      : state.finishReq
        ? copyDeep(state.finishReq.checks)
        : [];
    const res = await stage("records.finalize", () => state.records.finalizeAndRead(
        {
          intent: control.intentOutcome(),
          checks,
          prerequisites: config.prerequisites,
          expectedSelfTest: expected,
        },
        // The ORIGINAL absolute cleanup end — the adapter awaits its
        // actual capture/seal against this bound, never a fresh window.
        { deadlineMonoMs: state.cleanupEnd },
      ))
      .catch(async (e) => {
        control.recordFault(e);
        await stage("records.containment", () => state.records.closeIncompleteEvidence())
          .catch((closeError) => control.recordFault(closeError));
        return null;
      });
    if (res !== null && isObj(res.final)) {
      return {
        status: res.final.status,
        exitCode: res.final.exitCode,
        stopReason: res.final.stopReason,
      };
    }
    return fallbackOutcome();
  };

  // Every shutdown wait consumes the ONE captured end — a stalled writer or
  // callback can never push cleanup past it.
  const boundedCleanup = (p, what, end = state.cleanupEnd) =>
    new Promise((res, rej) => {
      const t = timing.later(
        () => rej(fail("CLEANUP_DEADLINE", what)),
        Math.max(1, end - timing.now()),
      );
      Promise.resolve(p).then(
        (v) => {
          timing.clearT(t);
          res(v);
        },
        (e) => {
          timing.clearT(t);
          rej(e);
        },
      );
    });

  // One bounded shutdown under the SINGLE captured end: staged native
  // teardown/partial-monitor reap starts AT the captured entry,
  // independent of the stop-send/stop-ordinary/evidence waits, then the
  // best-effort stop envelope (the wire requires the nonempty TRANSPORT
  // reason "FINISH" on the normal path while final/PGN reasons stay
  // null), ordinary lane close, frozen PGN stop association and selftest
  // re-verify run while the native stages proceed under the same original
  // bound, then the post-cleanup sticky-flag check and finalize + receipt
  // readback or the genuine incomplete-evidence drain.
  const shutdown = async () => {
    timing.clearAll();
    timing.disarmOperation();
    // Capture-once authority stays in the facade: entering shutdown without
    // a prior stop/finish still stamps the ONE original cleanup end.
    control.captureCleanupBound();
    // The required live-evidence task is scheduled and owned BEFORE any
    // awaited stop/evidence writer — `Promise.resolve().then` registers the
    // actual verifier continuation under the ONE captured cleanup end and
    // is never replaced by the public bounded wait.
    const proofEnd = cleanupProofEnd(state.cleanupStart, state.cleanupEnd,
      config.selftestPhase ? "selftest-workload" : "phase-workload");
    const liveEvidence =
      config.phase === "preflight" && state.ops !== null
        ? Promise.resolve().then(() =>
            state.ops.selftestEvidence({ deadlineMonoMs: proofEnd }),
          )
        : null;
    // Staged native teardown starts NOW through the existing owner at the
    // captured entry — a stalled stop send or evidence writer can never
    // postpone TERM/KILL/proof, and its failures stay retained as faults
    // rather than gating the stages.
    let teardown = null;
    if (state.running !== null) {
      teardown = boundedCleanup(
        stage("cleanup.run", () => cleanup.run(
          control.cleanupArgs({
            proofDeadlineMonoMs: proofEnd,
            settleRequiredLiveEvidence:
              liveEvidence === null
                ? null
                : () => liveEvidence.then(() => undefined),
          }),
        )),
        "cleanup",
      ).catch((e) => control.recordFault(e));
    } else if (state.monitorStartAttempted === true) {
      // monitor.start was attempted but never produced a running tuple:
      // the genuine partial collector/child handles still stop and reap
      // under the ORIGINAL captured end passed directly — a fresh
      // remaining>0 is required; a spent bound dispatches no fresh Native
      // call and no fabricated tuple or cancellation.
      if (timing.cleanupRemainingMs() > 0) {
        teardown = boundedCleanup(
          stage("cleanup.monitor", () => monitor.stopAndReap({ deadlineMonoMs: state.cleanupEnd,
            ...(config.selftestPhase ? {} : { ordinaryDeadlineMonoMs: proofEnd }) })),
          "monitor-reap",
        ).catch((e) => control.recordFault(e));
      } else {
        control.recordFault(
          fail("CLEANUP_DEADLINE", "spent partial-start bound"),
        );
      }
    }
    if (
      state.channel !== null &&
      state.channel.connected &&
      !state.channel.exited &&
      !state.driverClosed
    ) {
      // Legal STOP admission keeps the ORIGINAL remaining guard: a spent
      // end admits no fresh stop send — the debt stays unproven and the
      // passive scope/reap joins below carry it, never a fake closure.
      if (timing.cleanupRemainingMs() > 0) {
        await boundedCleanup(
          stage("shutdown.stop-send", () => state.channel.send(
            "stop",
            {
              stopReason:
                state.stopReq !== null ? state.stopReq.reason : "FINISH",
              cleanupRemainingMs: Math.floor(timing.cleanupRemainingMs()),
            },
            Math.max(1, timing.cleanupRemainingMs()),
          )),
          "stop-send",
        ).catch((e) => control.recordFault(e));
      } else {
        control.recordFault(fail("CLEANUP_DEADLINE", "spent stop bound"));
      }
    }
    // Native stages already run independently. A normal finish must drain
    // its admitted final end before Recorder closes ordinary evidence.
    if (state.finishReq !== null && state.stopReq === null && state.ops !== null) {
      await boundedCleanup(stage("shutdown.ordinary", () => state.ops.whenOrdinarySettled()), "finish-operation-tail", proofEnd)
        .catch((error) => control.recordFault(error));
    }
    if (state.records !== null) {
      await boundedCleanup(stage("records.stop-ordinary", () => state.records.stopOrdinary()), "stop-ordinary").catch(
        (e) => control.recordFault(e),
      );
      if (state.stopReq !== null) {
        await boundedCleanup(
          stage("records.game-stop", () => state.records.gameStopAssociation()),
          "game-stop",
        ).catch((e) => control.recordFault(e));
      }
    }
    let expected = null;
    if (liveEvidence !== null) {
      // The SAME owned task resolves the expected evidence — its true
      // settlement was already joined inside the collector-last ordering;
      // a stalled proof stays unproven and can never dispatch a late probe.
      expected = await boundedCleanup(liveEvidence, "selftest-evidence", proofEnd).catch(
        (e) => {
          control.recordFault(e);
          return null;
        },
      );
      if (expected === null && config.expectedSelfTest !== null) {
        expected = config.expectedSelfTest;
      }
    } else {
      expected = config.expectedSelfTest;
    }
    // Await the already-running teardown under the same captured end —
    // a stalled required dependency leaves it unproven, never faked.
    if (teardown !== null) await teardown;
    // Outside-the-bodies actual join: the SAME ordinary settlement, the
    // in-flight initial/periodic resource body, the existing channel
    // reap/close and the enrolled driver scope debts join here even when
    // cleanup failed, was skipped, the constructor was partial or no
    // channel exists — an empty root scope finishes truthfully, no late
    // Native IO, no ledger and no global wait. Actual callback/task
    // failures stay ineligible and retained; a public timeout never
    // clears the SAME resourceTask reference — its own finally does.
    if (state.ops !== null) {
      await stage("shutdown.ordinary", () => state.ops.whenOrdinarySettled())
        .catch((e) => control.recordFault(e));
    }
    const admissionJoin = state.admissionTask;
    if (admissionJoin !== null) {
      await stage("shutdown.admission", () => admissionJoin).catch((e) => control.recordFault(e));
    }
    const resourceJoin = state.resourceTask;
    if (resourceJoin !== null) {
      await stage("shutdown.resource", () => resourceJoin).catch((e) => control.recordFault(e));
    }
    if (state.channel !== null) {
      await boundedCleanup(
        stage("shutdown.driver-reap", () => state.channel.reap(Math.max(1, timing.cleanupRemainingMs()))),
        "driver-reap",
      ).catch((e) => control.recordFault(e));
    }
    // The own scope finish runs AFTER the legal STOP/reap/close
    // initiations above: it fences the ENTIRE enrolled subtree and
    // passively joins every enrolled receipt — nested and partial-ctor
    // attempts included — never a healthy-parent global zero.
    await stage("shutdown.driver-scope", () => finishDriverActualScope(capabilities.driverActualScope)).catch(
      (e) => control.recordFault(e),
    );
    // Post-cleanup sticky check: an overage -> lower -> rapid finish
    // sequence can never pass finalization. The actual observation is
    // PURE-captured first, then the SYNCHRONOUS stop/narrow/fence owns
    // the latch BEFORE the resource/fault event dispatch — same as W3 —
    // and its actual separate current/peak/flag/time/verdict stays
    // retained in the resource lane.
    if (control.rssExceeded()) {
      const mo = monitor.lastObservation();
      // The mutable observation's primitive fields are copied BEFORE any
      // stop/record observer callback runs — never re-read after the
      // synchronous latch — so the emitted resource/fault observations
      // carry the same real numbers, flag and time.
      const obsRss = mo !== null ? mo.rssBytes : null;
      const obsPeak = mo !== null ? mo.peakRssBytes : null;
      const obsAccounting = mo !== null ? mo.accountingValid : null;
      const obsAtNs = mo !== null ? mo.atMonoNs : undefined;
      const e = fail("RESOURCE_RSS", `peak ${mo !== null ? obsPeak : "?"}`);
      control.latchStop(e.code);
      control.recordFault(e);
      if (state.records !== null) {
        void state.records
          .recordEvent("resource", {
            rssBytes: Number.isSafeInteger(obsRss) ? obsRss : null,
            peakRssBytes: Number.isSafeInteger(obsPeak) ? obsPeak : null,
            rssLimitExceeded: true,
            accountingValid: obsAccounting === true,
            atMonoNs: obsAtNs !== undefined ? `${obsAtNs}` : null,
          })
          .catch(control.recordFault);
      }
    }
    // Canonical finalization is selected ONLY by the durable genuine
    // running-receipt flag — a copied monitor supervisor tuple, a pending
    // or failed running write never reaches finalize. The real adapter
    // seal/containment is awaited UNABANDONED under the ORIGINAL end —
    // no bounded race discards it — and the external outcome is only the
    // trusted res.final triple; a genuine contained failure still lands
    // on the coherent nonzero fallback.
    if (state.records !== null && state.runningWritten === true) {
      const outcome = await finalize(expected).catch((e) => {
        control.recordFault(e);
        return fallbackOutcome();
      });
      // The SAME saved outcome — finalized success or safely contained
      // failure — is held while a FRESH TOP-only owner settlement joins
      // the remaining actual debt AFTER the seal/containment and the
      // issuance fences above; a nested selftest returns after its own
      // scope/transaction, never a parent global zero, and a barrier
      // timeout/rejection stays a retained fault, never a zero.
      if (config.selftestPhase !== true) {
        await stage("shutdown.lifetime", () => capabilities.lifetime.whenSettled()).catch((e) =>
          control.recordFault(e),
        );
      }
      return outcome;
    }
    // No canonical final is possible without a genuine running receipt:
    // perform the real incomplete-evidence drain and await its REAL file
    // settlement
    // before the exit-safe fallback. This filesystem-only bookkeeping may
    // finish after the original Native cutoff under the approved timing
    // boundary; a close error or unresolved body stays failed/owned.
    if (state.records !== null) {
      await stage("records.containment", () => state.records.closeIncompleteEvidence()).catch((e) => control.recordFault(e));
    }
    // TOP phase only — every issuance is fenced and the own safe
    // transaction/incomplete drain above is real — so a FRESH owner
    // settlement may join the remaining actual debt. A nested selftest
    // joins only its own scope/transaction, never a healthy-parent
    // global zero; the barrier never runs inside a publication,
    // ordinary, capture, continuation or collector body.
    if (config.selftestPhase !== true) {
      await stage("shutdown.lifetime", () => capabilities.lifetime.whenSettled()).catch((e) =>
        control.recordFault(e),
      );
    }
    return fallbackOutcome();
  };

  return Object.freeze({ finalize, shutdown });
}
