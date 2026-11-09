// Whole original collectorArgv/start group. Pure same-reference capture;
// the runtime keeps the sole tick/stop owner and all original authorities.
import { createCollectorTransport } from "./process-transport.mjs";
import { createLsofQueries } from "./process-lsof.mjs";
import { TIMING_LIMITS } from "./supervisor-protocol.mjs";
import { copyDeep } from "./protocol-values.mjs";

// The fixed collector argv: isolation flags, the pinned helper,
// collector mode and the run/supervisor bindings.
const collectorArgv = (helperPath, runId) => [
  "-I",
  "-B",
  helperPath,
  "--collector",
  "--run-id",
  runId,
  "--supervisor-pid",
  String(process.pid),
];

export function createProcessStart({
  config,
  state,
  authority,
  stopOwner,
  tick,
  makeAccountingError: acct,
  makeCleanupError: unproven,
}) {
  const { runId, pythonExecutable, helperPath, protocol, clock, spawnImpl } = config;

  // The whole start path under ONE readiness handle and ONE
  // ownOperation lifetime: a live-check and the stopping fence gate
  // the actual spawn (a spent bound or closed admission performs no
  // IO), the bootstrap-ready wait, the native bootstrap proof, the
  // optional trusted static-backend comparison, lsof composition,
  // the sample interval and the first covering cycle all
  // consume the same borrowed handle, and the public finally releases
  // only the owner acquisition — the handle is disposed when actual
  // settlement completes, not when the public promise settles. After
  // every awaited stage and before ready/UID/lsof/timer/first-cycle
  // commit and successful return, the fence is rechecked so a pending
  // start can never activate a new timer/cycle/healthy ready after
  // the first stop.
  const start = async (options) => {
    const h = authority.op(options, TIMING_LIMITS.readinessMs);
    const lifetime = authority.ownOperation(h);
    const finish = () => lifetime.finish();
    if (state.child !== null || state.transport !== null) {
      finish();
      throw acct("monitor started");
    }
    if (state.stopping) {
      finish();
      throw acct("monitor stopping");
    }
    state.startHandle = h;
    let settleCollector = null;
    try {
      h.assertLive("start deadline");
      // ONE collector physical debt on the SAME shared supervisor
      // owner, pre-armed BEFORE spawn and OUTSIDE the ordinary
      // queue — ordinary drain can never wait on collector exit
      // before shutdown is issued. Only the real
      // transport.whenReaped() fulfillment (exit plus BOTH output
      // closes) fulfills it; a raw spawn result/error, public reap,
      // end or destroy never does.
      const collectorPhysical = new Promise((resolve) => {
        settleCollector = resolve;
      });
      authority.retainSupervisorActual(collectorPhysical);
      state.collectorPhysical = collectorPhysical;
      if (state.stopping) throw acct("monitor stopping");
      const spawned = spawnImpl(
        pythonExecutable,
        collectorArgv(helperPath, runId),
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      if (spawned === null || spawned === undefined) {
        // The definite no-creation branch: no handle was returned at
        // all, so the never-acquired receipt retires in the catch.
        throw acct("collector spawn");
      }
      // ANY returned handle is adopted BEFORE shape/PID or bootstrap
      // validation — a real ChildProcess or EventEmitter is not a
      // plain JSON object. Transport/error/pipe/physical ownership is
      // installed on it first: a returned pid-less/failed child or an
      // ambiguous transport failure keeps its truthful exit/pipe
      // settlement through the pre-armed shared collector debt, and a
      // set state.child is never later read as absence.
      state.child = spawned;
      state.transport = createCollectorTransport({
        child: state.child,
        protocol,
        runId,
        clock,
        readyDeadlineMs: TIMING_LIMITS.readinessMs,
        onFault: authority.markFault,
        onInbound: (msg) => {
          if (msg.type === "accounting-fault") {
            authority.markFault(acct(`collector ${msg.reason}: ${msg.diagnostic}`));
          }
        },
      });
      state.transport.whenReaped().then(
        () => settleCollector(),
        () => {},
      );
      if (state.stopping) throw acct("monitor stopping");
      if (typeof state.child.pid !== "number") {
        throw acct("collector spawn");
      }
      const ready = await state.transport.awaitReady(h);
      // The live original handle AND the monotonic fence are rechecked
      // after every awaited stage and before any commit: a stop that
      // lands between the bounded fulfillment and this continuation
      // must never promote late readiness or start fresh work.
      h.assertLive("start deadline");
      if (state.stopping) throw acct("monitor stopping");
      // Native bootstrap proof binds the declared tuples to the actual
      // spawn handle, the supervisor tuple, resolved executables,
      // lineage and one UID before own-roots activates registrations.
      const boot = await authority.enqueue(
        () =>
          authority.proofs.proveBootstrap(
            { ready, childPid: state.child.pid },
            h,
          ),
        h,
      );
      h.assertLive("start deadline");
      if (state.stopping) throw acct("monitor stopping");
      // C4b-09: when configured, the static backend-identity
      // expectation is compared against a FRESH capture on the SAME
      // start handle and operation retainer before any ready commit.
      if (authority.verifyExpectedBackend != null) {
        await authority.verifyExpectedBackend(ready, h, lifetime.retainActual);
        h.assertLive("start deadline");
        if (state.stopping) throw acct("monitor stopping");
      }
      state.ownUid = boot.ownUid;
      state.readyEvidence = ready;
      state.lsof = createLsofQueries({
        registerHelper: authority.registerHelper,
        signalHelper: authority.signalHelper,
        proveTransition: authority.proveTransition,
        protocol,
        runId,
        pythonExecutable,
        helperPath,
        clock,
        spawnImpl,
      });
      state.timer = clock.setInterval(tick, TIMING_LIMITS.sampleMs);
      await authority.enqueue(() => authority.runCycle(h), h);
      h.assertLive("start deadline");
      if (state.stopping) {
        // A stop captured the fence while the first cycle ran: no
        // late healthy ready may be claimed after admission closed.
        throw acct("monitor stopping");
      }
      state.startHandle = null;
      finish();
      return copyDeep(state.readyEvidence);
    } catch (e) {
      authority.markFault(e);
      state.startHandle = null;
      // Definite no-creation may retire the never-opened collector
      // receipt; a returned/ambiguous child or an unadopted transport
      // keeps the shared debt held.
      if (state.child === null && settleCollector !== null) {
        settleCollector();
      }
      // A standalone bootstrap failure may attempt the wire-only
      // teardown only while its original handle is live and the stop
      // flow has not taken cleanup ownership; an unreaped child stays
      // on the shared collector debt, never on the START handle.
      if (state.transport !== null && !state.stopping) {
        try {
          await stopOwner.teardownCollector(h);
        } catch {
          authority.markFault(unproven("bootstrap child reap"));
          finish();
          throw unproven("bootstrap child reap");
        }
      }
      finish();
      throw e;
    }
  };

  return start;
}
