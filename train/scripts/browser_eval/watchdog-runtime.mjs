// watchdog-runtime.mjs owns the whole lifecycle routine extracted from
// watchdog.mjs under the runtime readable-split decision (15).
// runWatchdogLifecycle performs the whole
// run-entry/bootstrap/supervision/wake/shutdown routine over the grouped
// {config,capabilities,state,timing,control} context supplied by the facade.
// captureWatchdogRuntimeConfig now lives in watchdog-config.mjs under the
// final readable-owners decision (19) and is re-exported here so existing
// consumers keep the original private import API. No second state or
// validator, no wire/public/status change, no facade import. It also
// arms the optional shared nativeHorizon once with the original phase
// end and forwards the derived io/retainActual unchanged to the record
// adapter and driver channel for their NEXT consumers.
// KNOWN_OVERSIZE over the 375 target: the run-entry horizon arm and the
// resourceTask overlap guards are kept whole, not packed.
import path from "node:path";
import { admitWatchdogDriver } from "./watchdog-admission.mjs";
import { copyDeep, isIdentity } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { createDriverChannel } from "./watchdog-driver.mjs";
import {
  createWatchdogOperationContext,
  createWatchdogOperations,
} from "./watchdog-operations.mjs";
import { createWatchdogRecordAdapter } from "./watchdog-records.mjs";
import { createWatchdogAwaiter } from "./watchdog-config.mjs";
import { issueActual } from "./artifact-files.mjs";

export { captureWatchdogRuntimeConfig } from "./watchdog-config.mjs";

const L = FIXED_LIMITS;
const T = L.timing;

const fail = (code, detail) => {
  const e = new Error(`watchdog-runtime ${code}: ${detail}`);
  e.code = code;
  return e;
};
const strNE = (s) => typeof s === "string" && s.length > 0;

// Whole run routine: started guard, original phase/work bounds, abort
// wiring with listener removal at settlement, records/operations
// composition, ordered bootstrap, independent supervision timers, the wake
// wait and the whole catch/finally shutdown path.
export async function runWatchdogLifecycle({ config, capabilities, state, timing, control }) {
  const {
    protocol,
    monitor,
    footprint,
    recorder,
    cleanup,
    clock,
    spawnImpl,
    runInternalSelfTest,
    pgnEvidence,
    nativeHorizon,
    io,
  } = capabilities;
  if (state.started) throw fail("IPC_INVALID", "run twice");
  state.started = true;
  const runStart = timing.now();
  const ceiling =
    T.phaseMs[config.phase] !== undefined ? T.phaseMs[config.phase] : T.phaseMs.check;
  state.phaseEnd = Math.min(runStart + ceiling, config.ctxDeadlineMs,
    config.phaseDeadlineMonoMs === null ? Infinity : config.phaseDeadlineMonoMs);
  state.workEnd = state.phaseEnd - 5000;

  // Kept at function scope for the finally's listener removal; the
  // wiring itself runs inside the try below, after the horizon arm.
  let abortListener = null;

  const { bounded, checkLive } = createWatchdogAwaiter({
    timing,
    control,
    makeError: fail,
  });

  try {
    // The optional shared Native horizon arms EXACTLY ONCE with the
    // ORIGINAL phase end — before any timer, queue work, footprint,
    // manifest or start IO. A cleanup end already captured by a pre-run
    // first stop min-narrows it; an arm or listener failure lands in
    // the same catch/shutdown below so cleanup is never bypassed.
    if (nativeHorizon !== null) {
      nativeHorizon.initialize(state.phaseEnd);
      if (state.cleanupEnd !== null) {
        nativeHorizon.narrow(state.cleanupEnd);
      }
    }

    // Abort wiring: an already-aborted context latches the real parent
    // reason before any await and launches no driver or collector; the
    // listener is removed at settlement.
    if (config.ctxSignal !== null) {
      const abortReason = () =>
        strNE(config.ctxSignal.reason) ? `${config.ctxSignal.reason}` : "PARENT_ABORT";
      if (config.ctxSignal.aborted) {
        control.latchStop(abortReason());
      } else {
        abortListener = () => control.latchStop(abortReason());
        config.ctxSignal.addEventListener("abort", abortListener, { once: true });
      }
    }

    state.records = createWatchdogRecordAdapter({
      recorder,
      pgnEvidence,
      workspaceRoot: config.workspaceRoot,
      manifestRel: config.manifestRel,
      commonIdentity: copyDeep(config.workspace.commonIdentity),
      phase: config.phase,
      onObserverFault: control.recordFault,
      io, // forwarded unchanged for the NEXT adapter consumer
    });
    // A stop latched before the adapter existed still gets its real
    // first-stop freeze with the latched timestamp.
    if (state.stopReq !== null) {
      state.records.freeze({
        stopReason: state.stopReq.reason,
        atMonoNs: state.stopReq.atMonoNs,
      });
    }
    state.ops = createWatchdogOperations({
      ctx: createWatchdogOperationContext({
        config,
        capabilities,
        state,
        timing,
        control,
      }),
      records: state.records,
      runInternalSelfTest,
    });

    // Phase/work control clocks armed AT RUN ENTRY — they bound bootstrap IO
    // as well as supervised work and never reset on driver callbacks.
    timing.later(
      () => control.latchStop("PHASE_TIMEOUT"),
      Math.max(1, state.workEnd - timing.now()),
    );
    timing.later(
      () => control.latchStop("PHASE_HARD_LIMIT"),
      Math.max(1, state.phaseEnd - timing.now()),
    );

    if (!control.stopped()) {
      state.resourceTask = issueActual(io.retainActual, () => footprint.scan())
        .finally(() => {
          state.resourceTask = null;
        });
      const obs = await bounded(
        state.resourceTask,
        Math.max(1, timing.workRemainingMs()),
        "footprint",
      );
      if (!obs || obs.accountingValid !== true)
        throw fail("ACCOUNTING_UNAVAILABLE", "initial footprint");
      await bounded(
        recorder.writeManifest(),
        Math.max(1, timing.workRemainingMs()),
        "manifest",
      );
      checkLive("collector launch");
      if (!config.selftestPhase) {
        // The genuine start attempt is tracked BEFORE the await so an
        // interrupted/errored start still reaches teardown with its real
        // partial handles — no fabricated running tuple.
        state.monitorStartAttempted = true;
        await bounded(
          monitor.start({ deadlineMonoMs: state.workEnd }),
          Math.max(1, timing.workRemainingMs()),
          "monitor start",
        );
      }
      state.running = copyDeep(monitor._ready().supervisor);
      if (!isIdentity(state.running))
        throw fail("ACCOUNTING_UNAVAILABLE", "supervisor tuple");
      await bounded(
        recorder.writeRunning({
          schemaVersion: 1,
          workspaceId: config.workspace.workspaceId,
          runId: config.runId,
          phase: config.phase,
          commonIdentitySha256: config.commonIdentitySha256,
          supervisor: copyDeep(state.running),
          startedAtUtc: clock.nowUtc(),
        }),
        Math.max(1, timing.workRemainingMs()),
        "running",
      );
      // The durable running-receipt flag is set ONLY on genuine body
      // fulfillment — a copied supervisor tuple can never select canonical
      // finalization on its own.
      state.runningWritten = true;
      await admitWatchdogDriver({ config, capabilities, state, timing, bounded, checkLive });
      checkLive("driver launch");
      const entry = config.driverEntry.args[0];
      const moduleArgs = config.driverEntry.args.slice(1);
      state.channel = createDriverChannel({
        entry,
        args: moduleArgs,
        cwd: path.dirname(entry),
        execPath: config.driverEntry.executable,
        protocol,
        runId: config.runId,
        clock,
        forkImpl: spawnImpl === null ? undefined : spawnImpl,
        onMessage: control.onMessage,
        onError: control.onError,
        onExit: control.onExit,
        // SAME owner registrar and the ONE derived actual scope,
        // forwarded for the NEXT driver consumer.
        retainActual: io.retainActual,
        actualScope: capabilities.driverActualScope,
      });
      // Heartbeat supervision is armed BEFORE the hello/register/start
      // waits. It stays inert until the validated hello goes live, then
      // checks freshness against lastHb — which hello admission itself sets,
      // so a never-arriving first heartbeat cannot outlive the 2000ms gap
      // even while a stalled registration/start wait is still pending.
      const hb = clock.setInterval(() => {
        if (state.stopReq !== null || state.finishReq !== null) return;
        if (!state.helloOk) return;
        if (state.driverClosed) return;
        if (state.lastHb !== null && timing.now() - state.lastHb > T.heartbeatGapMs)
          control.latchStop("HEARTBEAT_TIMEOUT");
      }, T.heartbeatMs);
      timing.timers.add(hb);

      // Bounded hello wait: the driver becomes heartbeat-live only on a
      // valid exact-tuple hello; a first stop aborts it through the wake race.
      await bounded(
        new Promise((res, rej) => {
          const t = timing.later(
            () => {
              if (state.helloOk) res();
              else rej(fail("HELLO_TIMEOUT", "no hello"));
            },
            Math.min(T.readinessMs, Math.max(1, timing.workRemainingMs())),
          );
          const poll = () => {
            if (state.helloOk) {
              timing.clearT(t);
              res();
            } else if (state.channel.exited) {
              timing.clearT(t);
              rej(fail("HELLO_TIMEOUT", "driver unavailable"));
            } else {
              timing.later(poll, 50);
            }
          };
          poll();
        }),
        Math.min(T.readinessMs, Math.max(1, timing.workRemainingMs())),
        "hello",
      );
      checkLive("driver register");
      const reg = await bounded(
        monitor.registerRoot(
          {
            pid: state.channel.pid,
            kind: "driver",
            expectedExecutable: config.driverEntry.expectedExecutable,
            scopeRunId: config.runId,
          },
          timing.opDeadline(T.commandMs),
        ),
        Math.max(1, timing.workRemainingMs()),
        "registerRoot",
      );
      state.driverIdentity = copyDeep(reg.identity);
      checkLive("driver start");
      await bounded(
        state.channel.send(
          "start",
          {
            manifestPath: config.manifestPath,
            commonIdentitySha256: config.commonIdentitySha256,
          },
          Math.max(1, timing.workRemainingMs()),
        ),
        Math.max(1, timing.workRemainingMs()),
        "start",
      );

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
      await control.wake;
    }
    return await control.shutdown();
  } catch (error) {
    control.recordFault(error);
    control.latchStop(error && error.code ? error.code : "FAULT");
    // First-stop and cleanup never await fault-record IO: the event is
    // dispatched through the serialized bounded queue without blocking the
    // synchronous latch or the original cleanup horizon.
    void control.faultEvent(error);
    return await control.shutdown();
  } finally {
    timing.clearAll();
    if (abortListener !== null && config.ctxSignal !== null) {
      config.ctxSignal.removeEventListener("abort", abortListener);
    }
    try {
      if (!config.selftestPhase) footprint.stop();
    } catch {}
  }
}
