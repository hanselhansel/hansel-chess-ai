import type { ModelIdentity } from "./checkpoint.ts";
import type { RequestEvent } from "./think-session.ts";
import type {
  Attempt, Backend, EngineState, ErrorCode, FailureData, RequestContext,
} from "./think-protocol.ts";

/**
 * Immutable backend facts supplied by the controller at each call site. This
 * is a value snapshot, never callbacks, getters, or backend objects.
 */
export type BackendFacts = Readonly<{
  backend: Backend | null;
  backendEpoch: number;
  /** Controller fact: initialization has not settled yet (loading/starting/startup recovering). */
  initializationPending: boolean;
}>;

/**
 * The closed set of state publications. Each variant carries complete facts
 * for its snapshot: this is not a Partial<EngineState> patch boundary.
 */
export type StateTransition =
  | Readonly<{
      kind: "starting";
      modelIdentity: ModelIdentity;
      backend: Backend;
      backendEpoch: number;
    }>
  | Readonly<{ kind: "queued"; context: RequestContext }>
  | Readonly<{ kind: "cleared" }>
  | Readonly<{ kind: "thinking"; context: RequestContext; backend: Backend | null; backendEpoch: number }>
  | Readonly<{ kind: "recovering" }>
  | Readonly<{ kind: "backend"; backend: Backend; backendEpoch: number }>
  | Readonly<{ kind: "ready"; backend: Backend | null; backendEpoch: number }>
  | Readonly<{
      kind: "failed";
      code: ErrorCode;
      diagnostic: string;
      context: RequestContext | null;
      attempts: readonly Attempt[];
      backend: Backend | null;
      backendEpoch: number;
    }>;

type Listener = (state: EngineState) => void;

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

/**
 * Owns the immutable public `EngineState` snapshot and its subscribers for one
 * engine session. It constructs and freezes the canonical nested records,
 * projects an already-owned `ThinkSession` `RequestEvent` into display state,
 * and delivers every publication safely and immediately before the matching
 * promise settles. It owns no model loading, initialization, ready-promise
 * lifecycle, backend/epoch/recovery, or request ownership.
 */
export class ThinkState {
  private readonly engineSessionId: string;
  private readonly listeners: Set<Listener>;
  private state: EngineState;
  private stopped: boolean;

  constructor(engineSessionId: string) {
    this.engineSessionId = engineSessionId;
    this.listeners = new Set();
    this.stopped = false;
    this.state = Object.freeze({
      stage: "loading",
      engineSessionId,
      backendEpoch: 0,
      modelIdentity: null,
      backend: null,
      activeContext: null,
      error: null,
    });
  }

  getState(): EngineState {
    return this.state;
  }

  /** A broken or reentrant subscriber can never break publication. */
  private deliver(listener: Listener): void {
    try {
      listener(this.state);
    } catch {
      // intentionally swallowed
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) {
      this.deliver(listener);
    }
  }

  private set(state: EngineState): void {
    if (this.stopped) return;
    this.state = deepFreeze(state);
    this.emit();
  }

  private failureData(
    code: ErrorCode,
    diagnostic: string,
    context: RequestContext | null,
    attempts: readonly Attempt[],
  ): FailureData {
    return deepFreeze({ code, diagnostic, context, attempts: [...attempts] });
  }

  /** Publish a controller-owned transition; ignored after stop. */
  publish(transition: StateTransition): void {
    const base = {
      engineSessionId: this.engineSessionId,
      modelIdentity: this.state.modelIdentity,
    };
    switch (transition.kind) {
      case "starting":
        this.set({ ...base, modelIdentity: transition.modelIdentity,
          stage: "starting", backendEpoch: transition.backendEpoch,
          backend: transition.backend, activeContext: this.state.activeContext,
          error: null });
        return;
      case "queued":
        this.set({ ...base, stage: this.state.stage,
          backendEpoch: this.state.backendEpoch, backend: this.state.backend,
          activeContext: transition.context, error: this.state.error });
        return;
      case "cleared":
        this.set({ ...base, stage: this.state.stage,
          backendEpoch: this.state.backendEpoch, backend: this.state.backend,
          activeContext: null, error: this.state.error });
        return;
      case "thinking":
        this.set({ ...base, stage: "thinking", backendEpoch: transition.backendEpoch,
          backend: transition.backend, activeContext: transition.context, error: null });
        return;
      case "recovering":
        this.set({ ...base, stage: "recovering", backendEpoch: this.state.backendEpoch,
          backend: "main", activeContext: this.state.activeContext, error: null });
        return;
      case "backend":
        this.set({ ...base, stage: this.state.stage, backendEpoch: transition.backendEpoch,
          backend: transition.backend, activeContext: this.state.activeContext,
          error: this.state.error });
        return;
      case "ready":
        this.set({ ...base, stage: "ready", backendEpoch: transition.backendEpoch,
          backend: transition.backend, activeContext: null, error: null });
        return;
      case "failed":
        this.set({ ...base, stage: "failed", backendEpoch: transition.backendEpoch,
          backend: transition.backend, activeContext: null,
          error: this.failureData(
            transition.code, transition.diagnostic, transition.context, transition.attempts,
          ) });
        return;
    }
  }

  /**
   * Project an already-owned `ThinkSession` event into display state. The
   * controller supplies current immutable `BackendFacts` and the fatal-policy
   * `preserveFailure` flag; this helper acquires no request ownership.
   */
  request(event: RequestEvent, facts: BackendFacts, preserveFailure: boolean): void {
    if (event.type === "started") {
      if (facts.initializationPending) {
        this.publish({ kind: "queued", context: event.context });
      }
      return;
    }
    if (event.type === "complete") {
      this.publish({
        kind: "ready",
        backend: event.response.backend,
        backendEpoch: event.response.backendEpoch,
      });
      return;
    }
    if (event.type === "failed") {
      this.publish({
        kind: "failed",
        code: event.failure.code,
        diagnostic: event.failure.diagnostic,
        context: event.failure.context,
        attempts: event.failure.attempts,
        backend: facts.backend,
        backendEpoch: facts.backendEpoch,
      });
      return;
    }
    if (preserveFailure) return;
    if (facts.initializationPending) {
      this.publish({ kind: "cleared" });
      return;
    }
    this.publish({ kind: "ready", backend: facts.backend, backendEpoch: facts.backendEpoch });
  }

  /**
   * Terminal stop: preserve identity/diagnostic facts, null backend/context,
   * publish stopped once, clear listeners. Later calls and publications are
   * ignored; a late subscriber receives the stopped snapshot once.
   */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.state = deepFreeze({
      stage: "stopped",
      engineSessionId: this.engineSessionId,
      backendEpoch: this.state.backendEpoch,
      modelIdentity: this.state.modelIdentity,
      backend: null,
      activeContext: null,
      error: this.state.error,
    });
    this.emit();
    this.listeners.clear();
  }

  /** Subscribe for immediate current-state delivery; safe to remove twice. */
  subscribe(listener: Listener): () => void {
    if (this.stopped) {
      this.deliver(listener);
      return () => {};
    }
    this.listeners.add(listener);
    this.deliver(listener);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.listeners.delete(listener);
    };
  }
}
