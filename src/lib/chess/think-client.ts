import { OPERATION_DEADLINE_MS, SELECTED_CHECKPOINT } from "./constants.ts";
import { CheckpointError, type ModelIdentity } from "./checkpoint.ts";
import { loadDemoWeights, loadPlayWeightsTimed } from "./weights.ts";
import { thinkRuntime } from "./think-runtime.ts";
import { createMainBackend, type MainBackend } from "./think-main.ts";
import {
  FAULT_CODES, isChannelFailure, openWorkerChannel,
  type ChannelFailure, type WorkerChannel,
} from "./think-worker-client.ts";
import { Failure, diag, faultOf, isSessionFatal } from "./think-failure.ts";
import {
  ThinkSession, recordAttempt,
  type ExecutedOutcome, type RequestEvent, type RequestRun, type SessionRequests,
} from "./think-session.ts";
import { ThinkState } from "./think-state.ts";
import type {
  Attempt, Backend, ErrorCode, RequestContext, SessionReady, Thinker,
  ThinkerFailure, ThinkerOptions, ThinkResponse,
} from "./think-protocol.ts";

export { isSessionFatal } from "./think-failure.ts";

let sessionCounter = 0;

type BackendRef = Readonly<{ kind: "worker"; epoch: number; channel: WorkerChannel }>
  | Readonly<{ kind: "main"; epoch: number; impl: MainBackend }>;

type InitTrack = Readonly<{ backend: Backend; epoch: number; started: number }>;

export function createThinker(options?: ThinkerOptions): Thinker {
  const mode = options?.mode ?? "trained";
  const engineSessionId = `engine-${++sessionCounter}`;
  const initStart = thinkRuntime.now();
  const initDeadlineMs = initStart + OPERATION_DEADLINE_MS;
  const states = new ThinkState(engineSessionId);
  const initAbort = new AbortController();
  const initAttempts: Attempt[] = [];
  let initTimer: ReturnType<typeof setTimeout> | null = null;
  let initAttempt: InitTrack | null = null;
  let terminated = false;
  let initSettled = false;
  let identity: ModelIdentity | null = null;
  let retained: ArrayBuffer | null = null;
  let fetchMs = 0;
  let verificationMs = 0;
  let epoch = 0;
  let backend: BackendRef | null = null;
  let availabilityUsed = false;
  let resolveReady!: (ready: SessionReady) => void;
  let rejectReady!: (failure: ThinkerFailure) => void;
  const ready = new Promise<SessionReady>((res, rej) => {
    resolveReady = res; rejectReady = rej;
  });
  ready.catch(() => {});

  const backendFacts = () => ({ backend: backend?.kind ?? null, backendEpoch: epoch });
  const requestFacts = () => ({ ...backendFacts(), initializationPending: !initSettled });
  const preserveFailure = () => {
    const { stage, error } = states.getState();
    return stage === "failed" && error !== null && isSessionFatal(error.code);
  };

  const retireChannel = (): void => {
    if (backend?.kind === "worker") {
      backend.channel.retire();
      backend = null;
    }
  };
  const clearInitTimer = (): void => {
    if (initTimer !== null) thinkRuntime.clearTimeout(initTimer);
    initTimer = null;
  };
  const closeInitAttempt = (disposition: Attempt["disposition"], code: ErrorCode | null): void => {
    const track = initAttempt;
    if (track === null) return;
    initAttempt = null;
    recordAttempt(initAttempts, track.backend, track.epoch, Math.max(0, thinkRuntime.now() - track.started), track.started, disposition, code);
  };
  const failInit = (code: ErrorCode, diagnostic: string, cause?: unknown): void => {
    if (initSettled) return;
    initSettled = true;
    closeInitAttempt("fault", code);
    clearInitTimer();
    states.publish({ kind: "failed", code, diagnostic, context: null, attempts: initAttempts, ...backendFacts() });
    rejectReady(new Failure(code, diagnostic, null, initAttempts, cause));
  };
  const pastInitDeadline = (): boolean => {
    if (thinkRuntime.now() < initDeadlineMs) return false;
    failInit("DEADLINE", "initialization deadline elapsed");
    return true;
  };
  const initGone = (): boolean => terminated || initSettled || pastInitDeadline();
  /** Classify an init continuation: the real original clock outranks ordinary error categories. */
  const failInitFrom = (err: unknown): void => {
    if (terminated || initSettled) return;
    if (thinkRuntime.now() >= initDeadlineMs) {
      failInit("DEADLINE", `operation deadline elapsed: ${diag(err)}`, err);
      return;
    }
    const f = faultOf(err);
    failInit(f.code, f.diagnostic, f.cause);
  };
  const opDeadline = () => faultOf({ code: "DEADLINE", diagnostic: "operation deadline elapsed" });

  /** Thrown when the guarded operation no longer exists (settled/retired). */
  const SETTLED = new Error("operation is already settled");
  const assertEngineLive = (): void => {
    if (terminated) throw faultOf({ code: "STOPPED", diagnostic: "thinker is stopped" });
  };
  /** Initialization authority: engine live, init unsettled, signal live, inside the original deadline. */
  const assertInitCurrent = (): void => {
    assertEngineLive();
    if (initSettled || initAbort.signal.aborted) throw SETTLED;
    if (thinkRuntime.now() >= initDeadlineMs) throw opDeadline();
  };
  /** Engine-lifetime authority for an orphan channel failure; init-pending keeps the init bound. */
  const assertOrphanCurrent = (): void => {
    assertEngineLive();
    if (!initSettled && (initAbort.signal.aborted || thinkRuntime.now() >= initDeadlineMs)) throw opDeadline();
  };
  /** An expired operation retires the captured channel and clears the factory
   * backend only while it still references that same channel — never a newer
   * successor. The authority error propagates unchanged. */
  const guardOrRetire = (channel: WorkerChannel, assertCurrent: () => void): void => {
    try {
      assertCurrent();
    } catch (err) {
      channel.retire();
      if (backend?.kind === "worker" && backend.channel === channel) backend = null;
      throw err;
    }
  };
  const finishInitReady = (): void => {
    if (initSettled || backend === null || terminated) return;
    initSettled = true;
    clearInitTimer();
    const decided = backend;
    states.publish({ kind: "ready", ...backendFacts() });
    resolveReady(Object.freeze({
      engineSessionId, modelIdentity: identity!, fetchMs, verificationMs,
      initialBackend: decided.kind, initialBackendEpoch: decided.epoch,
      initializationMs: Math.max(0, thinkRuntime.now() - initStart), attempts: Object.freeze([...initAttempts]),
    }));
  };

  /** The one availability recovery: retire the worker, decode retained verified
   * bytes on the main thread, advance the epoch. Returns measured decode ms for
   * the owning request's next attempt; null on spent allowance or decode fault.
   * Caller authority is re-checked after publication and decode. */
  const recoverToMain = (diagnostic: string, assertCurrent: () => void): number | null => {
    if (availabilityUsed || terminated) return null;
    assertCurrent();
    availabilityUsed = true;
    closeInitAttempt("unavailable", "WORKER_UNAVAILABLE");
    retireChannel();
    states.publish({ kind: "recovering" });
    assertCurrent();
    const setupStart = thinkRuntime.now();
    let impl: MainBackend;
    try {
      impl = createMainBackend(retained!);
    } catch (err) {
      assertCurrent();
      const text = `main backend could not decode retained bytes: ${diag(err)}`;
      states.publish({ kind: "failed", code: "SEARCH_FAILED", diagnostic: text, context: null, attempts: [], backend: "main", backendEpoch: epoch });
      return null;
    }
    assertCurrent();
    epoch += 1;
    backend = { kind: "main", epoch, impl };
    const setupMs = Math.max(0, thinkRuntime.now() - setupStart);
    if (!initSettled) {
      recordAttempt(initAttempts, "main", epoch, setupMs, setupStart, "complete", null);
    }
    states.publish({ kind: "backend", backend: "main", backendEpoch: epoch });
    return setupMs;
  };

  const onOrphanChannel = (f: ChannelFailure): void => {
    if (terminated) return;
    try {
      if (f.code === "WORKER_UNAVAILABLE" && f.wire !== true &&
          recoverToMain(f.diagnostic, assertOrphanCurrent) !== null) {
        if (!initSettled) finishInitReady();
        else states.publish({ kind: "ready", ...backendFacts() });
        return;
      }
    } catch (err) {
      // Stopped settlement or the init authority owns this intentional throw.
      failInitFrom(err);
      return;
    }
    retireChannel();
    states.publish({ kind: "failed", code: f.code, diagnostic: f.diagnostic, context: null, attempts: [], ...backendFacts() });
  };

  /**
   * One worker epoch: open a channel, transfer verified bytes, await the
   * bounded ack. The caller's operation-current guard runs before/after
   * construction and init and before reply classification.
   */
  const startWorkerHandshake = async (signal: AbortSignal, assertCurrent: () => void): Promise<void> => {
    assertCurrent();
    epoch += 1;
    const handshakeEpoch = epoch;
    let channel: WorkerChannel;
    try {
      channel = openWorkerChannel({
        engineSessionId, backendEpoch: handshakeEpoch,
        expectedIdentity: identity!, onOrphan: onOrphanChannel,
      });
    } catch (err) {
      assertCurrent();
      if (recoverToMain(`worker construction failed: ${diag(err)}`, assertCurrent) !== null) {
        return;
      }
      throw isChannelFailure(err) ? faultOf(err) : faultOf({
        code: "WORKER_UNAVAILABLE", diagnostic: `worker construction failed: ${diag(err)}`,
      });
    }
    guardOrRetire(channel, assertCurrent);
    const onAbort = () => channel.retire();
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    try {
      await channel.init(identity!, retained!.slice(0));
    } catch (err) {
      channel.retire();
      assertCurrent();
      const f = faultOf(err);
      const explicitWire = isChannelFailure(err) && err.wire === true;
      if (f.code === "WORKER_UNAVAILABLE" && !explicitWire &&
          recoverToMain(f.diagnostic, assertCurrent) !== null) return;
      throw Object.freeze(f);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    guardOrRetire(channel, assertCurrent);
    backend = { kind: "worker", epoch: handshakeEpoch, channel };
    states.publish({ kind: "backend", backend: "worker", backendEpoch: handshakeEpoch });
    // A synchronous backend subscriber may retire or expire this operation.
    guardOrRetire(channel, assertCurrent);
  };

  /** One attempt on the captured handle; `run.dispatch` owns the abort-listener glue. */
  const workerThink = (channel: WorkerChannel, run: RequestRun, remainingMs: number) =>
    run.dispatch(() => ({
      promise: channel.think(run.context, remainingMs).then((reply) => reply.outcome),
      cancel: () => {
        channel.expireRequest(run.context.requestId);
        if (backend?.kind === "worker" && backend.channel === channel) retireChannel();
      },
    }));

  /** Dispatch on the current backend, consume the one availability recovery on
   * unavailability, retry inside the lease's original deadline; recovery decode
   * time carries into that request's next attempt's setupMs only. */
  const executeRequest = async (run: RequestRun): Promise<ExecutedOutcome> => {
    let carriedSetupMs = 0;
    for (;;) {
      run.assertCurrent();
      const setupStart = thinkRuntime.now();
      if (backend === null) {
        await startWorkerHandshake(run.signal, run.assertCurrent);
        run.assertCurrent();
      }
      const setupMs = carriedSetupMs + (backend === null ? 0 : thinkRuntime.now() - setupStart);
      carriedSetupMs = 0;
      const b = backend;
      if (b === null) throw faultOf({ code: "WORKER_UNAVAILABLE", diagnostic: "no backend is available" });
      const remaining = run.deadlineMs - thinkRuntime.now();
      if (remaining <= 0) throw faultOf({ code: "DEADLINE", diagnostic: "operation deadline elapsed" });
      const span = run.beginAttempt(b.kind, b.epoch, setupMs);
      states.publish({ kind: "thinking", context: run.context, backend: b.kind, backendEpoch: b.epoch });
      try {
        const outcome = b.kind === "worker"
          ? await workerThink(b.channel, run, remaining)
          : await run.dispatch(() => b.impl.think(run.context, run.deadlineMs));
        return Object.freeze({ outcome, backend: b.kind, backendEpoch: b.epoch });
      } catch (err) {
        if (b.kind === "worker") guardOrRetire(b.channel, run.assertCurrent);
        else run.assertCurrent();
        const f = faultOf(err);
        const explicitWire = isChannelFailure(err) && err.wire === true;
        const metrics = { searchMs: f.searchMs, completedVisits: f.completedVisits };
        if (f.code === "WORKER_UNAVAILABLE" && !explicitWire) {
          span.close("unavailable", "WORKER_UNAVAILABLE", metrics);
          const decodeMs = recoverToMain(f.diagnostic, run.assertCurrent);
          if (decodeMs === null) throw Object.freeze(f);
          carriedSetupMs = decodeMs;
          continue;
        }
        if (b.kind === "worker" && FAULT_CODES.includes(f.code)) retireChannel();
        const disposition =
          f.code === "CANCELLED" || f.code === "STOPPED" ? "cancelled" : f.code === "DEADLINE" ? "deadline" : "fault";
        span.close(disposition, f.code, metrics);
        throw Object.freeze(f);
      }
    }
  };

  const requests: SessionRequests = new ThinkSession(engineSessionId, initDeadlineMs,
    (event: RequestEvent) => { if (!terminated) states.request(event, requestFacts(), preserveFailure()); });

  const rejectFailure = (code: ErrorCode, diagnostic: string, context: RequestContext | null, attempts: readonly Attempt[], cause?: unknown): Promise<never> =>
    Promise.reject(new Failure(code, diagnostic, context, attempts, cause));

  const think = (rawContext: RequestContext): Promise<ThinkResponse> => {
    if (terminated) return rejectFailure("STOPPED", "thinker is stopped", null, []);
    const error = states.getState().error;
    if (preserveFailure() && error !== null) return rejectFailure(error.code, error.diagnostic, error.context, error.attempts);
    return requests.submit(rawContext, !initSettled, ready, executeRequest);
  };

  const terminate = (): void => {
    if (terminated) return;
    terminated = true;
    requests.stop();
    initAbort.abort();
    clearInitTimer();
    retireChannel();
    backend = null;
    if (!initSettled) {
      initSettled = true;
      closeInitAttempt("cancelled", "STOPPED");
      rejectReady(new Failure("STOPPED", "thinker terminated before readiness", null, initAttempts));
    }
    states.stop();
  };

  const finishInitHandshake = async (): Promise<void> => {
    if (initGone()) return;
    initAttempt ??= { backend: "worker", epoch: epoch + 1, started: thinkRuntime.now() };
    states.publish({ kind: "starting", modelIdentity: identity!, backend: "worker", backendEpoch: epoch + 1 });
    try {
      await startWorkerHandshake(initAbort.signal, assertInitCurrent);
    } catch (err) {
      failInitFrom(err);
    }
    if (initGone()) return;
    closeInitAttempt("complete", null);
    finishInitReady();
  };

  const runInit = async (): Promise<void> => {
    try {
      if (mode === "trained") {
        const timed = await loadPlayWeightsTimed(SELECTED_CHECKPOINT, initAbort.signal);
        if (initGone()) return;
        retained = timed.checkpoint.bytes;
        identity = timed.checkpoint.identity;
        fetchMs = timed.fetchMs;
        verificationMs = timed.verificationMs;
      } else {
        const demoStart = thinkRuntime.now();
        const verified = await loadDemoWeights();
        if (initGone()) return;
        retained = verified.bytes;
        identity = verified.identity;
        verificationMs = thinkRuntime.now() - demoStart;
      }
    } catch (err) {
      if (terminated || initSettled) return;
      const code: ErrorCode = thinkRuntime.now() >= initDeadlineMs ? "DEADLINE"
        : initAbort.signal.aborted ? "CANCELLED"
        : err instanceof CheckpointError ? err.code : "LOAD_HTTP";
      failInit(code, diag(err), err);
      return;
    }
    await finishInitHandshake();
  };

  if (mode === "trained" || mode === "random-demo") {
    initTimer = thinkRuntime.setTimeout(() => {
      initAbort.abort();
      retireChannel();
      failInit("DEADLINE", "initialization deadline elapsed");
    }, OPERATION_DEADLINE_MS);
    void runInit();
  } else {
    const diagnostic = `unsupported thinker mode: ${String(mode)}`;
    initSettled = true;
    states.publish({ kind: "failed", code: "PROTOCOL_INVALID", diagnostic, context: null, attempts: [], ...backendFacts() });
    rejectReady(new Failure("PROTOCOL_INVALID", diagnostic, null, []));
  }

  return {
    ready,
    getState: () => states.getState(),
    subscribe: (listener) => states.subscribe(listener),
    think,
    cancel: (requestId: number) => requests.cancel(requestId),
    terminate,
  };
}
