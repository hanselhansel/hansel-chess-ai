import { OPERATION_DEADLINE_MS } from "./constants.ts";
import { Failure, diag, fault, faultOf } from "./think-failure.ts";
import { PositionInvalidError, verifyOutcome } from "./mcts.ts";
import { capturePosition, type GamePosition } from "./position.ts";
import { isContext } from "./think-message-guards.ts";
import { thinkRuntime } from "./think-runtime.ts";
import type {
  Attempt, Backend, ErrorCode, RequestContext, SessionReady,
  ThinkerFailure, ThinkResponse,
} from "./think-protocol.ts";
import type { SearchOutcome } from "./search-types.ts";

export { Failure, diag, fault, faultOf } from "./think-failure.ts";
export type { RequestFault } from "./think-failure.ts";

/** Thrown through the executor once its request lease is retired. */
const RETIRED = new Error("request lease is no longer current");

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

/** Append a frozen attempt record; shared by init bookkeeping and lease closes. */
export function recordAttempt(
  target: Attempt[], backend: Backend, epoch: number,
  setupMs: number, started: number,
  disposition: Attempt["disposition"], code: ErrorCode | null,
  searchMs: number | null = null, completedVisits: number | null = null,
): void {
  const elapsedMs = Math.max(0, thinkRuntime.now() - started);
  target.push(Object.freeze({
    backend, backendEpoch: epoch, setupMs, elapsedMs,
    searchMs, completedVisits, disposition, code,
  }));
}

export type ExecutedOutcome = Readonly<{
  outcome: SearchOutcome;
  backend: Backend;
  backendEpoch: number;
}>;

/** Closes one backend attempt record exactly once. */
export interface AttemptSpan {
  close(
    disposition: Attempt["disposition"],
    code: ErrorCode | null,
    metrics: Readonly<{ searchMs: number | null; completedVisits: number | null }>,
  ): void;
}

/** The opaque lease a request executor may use while it remains current. */
export interface RequestRun {
  readonly context: RequestContext;
  readonly deadlineMs: number;
  readonly signal: AbortSignal;
  assertCurrent(): void;
  beginAttempt(backend: Backend, epoch: number, setupMs: number): AttemptSpan;
  dispatch(open: () => {
    readonly promise: Promise<SearchOutcome>;
    cancel(): void;
  }): Promise<SearchOutcome>;
}

export type RequestExecutor = (run: RequestRun) => Promise<ExecutedOutcome>;

export type RequestEvent =
  | Readonly<{ type: "started"; context: RequestContext }>
  | Readonly<{ type: "complete"; response: ThinkResponse }>
  | Readonly<{ type: "failed" | "cancelled"; failure: ThinkerFailure }>;

export interface SessionRequests {
  submit(
    rawContext: RequestContext,
    initializationPending: boolean,
    ready: Promise<SessionReady>,
    execute: RequestExecutor,
  ): Promise<ThinkResponse>;
  cancel(requestId: number): boolean;
  stop(): void;
}

type OpenAttempt = Readonly<{ backend: Backend; epoch: number; setupMs: number; started: number }>;

type Lease = {
  readonly context: RequestContext;
  readonly started: number;
  readonly deadlineMs: number;
  timer: ReturnType<typeof setTimeout> | null;
  readonly control: AbortController;
  readonly attempts: Attempt[];
  open: OpenAttempt | null;
  settled: boolean;
  resolve(response: ThinkResponse): void;
  reject(failure: ThinkerFailure): void;
};

const dispositionFor = (code: ErrorCode): Attempt["disposition"] =>
  code === "CANCELLED" || code === "STOPPED" ? "cancelled"
    : code === "DEADLINE" ? "deadline"
    : code === "WORKER_UNAVAILABLE" ? "unavailable"
    : "fault";

const eventKind = (code: ErrorCode): "cancelled" | "stopped" | "failed" =>
  code === "CANCELLED" ? "cancelled" : code === "STOPPED" ? "stopped" : "failed";

/**
 * Owns the single active request slot for one engine session: immutable entry
 * context, monotonic request IDs, the permanent deadline timer, attempt
 * records, the independently settled public promise, and final verification
 * before acceptance. It emits a small typed event stream; it never reads or
 * writes backend/session internals beyond this boundary.
 */
export class ThinkSession implements SessionRequests {
  private readonly engineSessionId: string;
  private readonly initDeadlineMs: number;
  private readonly emit: (event: RequestEvent) => void;
  private lastRequestId: number;
  private active: Lease | null;
  private stopped: boolean;

  constructor(engineSessionId: string, initDeadlineMs: number, emit: (event: RequestEvent) => void) {
    this.engineSessionId = engineSessionId;
    this.initDeadlineMs = initDeadlineMs;
    this.emit = emit;
    this.lastRequestId = -1;
    this.active = null;
    this.stopped = false;
  }

  private publish(event: RequestEvent): void {
    try {
      this.emit(event);
    } catch {
      // a broken event consumer must not break request settlement
    }
  }

  private closeAttempt(
    lease: Lease, disposition: Attempt["disposition"], code: ErrorCode | null,
    searchMs: number | null = null, completedVisits: number | null = null,
  ): void {
    const open = lease.open;
    if (open === null) return;
    lease.open = null;
    recordAttempt(
      lease.attempts, open.backend, open.epoch, open.setupMs, open.started,
      disposition, code, searchMs, completedVisits,
    );
  }

  /**
   * Settle the public promise once, release the slot, stop the timer and abort
   * the lease signal — without waiting for readiness or search cleanup. The
   * background coroutine finishes its own serial cleanup afterwards.
   */
  private settle(
    lease: Lease,
    kind: "complete" | "failed" | "cancelled" | "stopped",
    value: ThinkResponse | ThinkerFailure,
  ): void {
    if (lease.settled) return;
    lease.settled = true;
    if (this.active === lease) this.active = null;
    if (lease.timer !== null) {
      thinkRuntime.clearTimeout(lease.timer);
      lease.timer = null;
    }
    lease.control.abort();
    if (kind === "complete") {
      const response = value as ThinkResponse;
      this.publish({ type: "complete", response });
      lease.resolve(response);
      return;
    }
    if (kind !== "stopped") this.publish({ type: kind, failure: value as ThinkerFailure });
    lease.reject(value as ThinkerFailure);
  }

  /** Cooperative expiry used by the deadline timer, cancel and stop. */
  private expire(
    lease: Lease, code: "CANCELLED" | "DEADLINE" | "STOPPED", diagnostic: string,
  ): void {
    if (lease.settled) return;
    this.closeAttempt(lease, dispositionFor(code), code);
    this.settle(lease, eventKind(code), new Failure(code, diagnostic, lease.context, lease.attempts));
  }

  /**
   * Every rejection is rebuilt on this lease: the request's own frozen context
   * and correctly closed attempt ledger, never a foreign Failure's ownership.
   * The incoming error survives as the preserved cause.
   */
  private fail(lease: Lease, err: unknown): void {
    if (lease.settled) return;
    const f = faultOf(err);
    this.closeAttempt(lease, dispositionFor(f.code), f.code, f.searchMs, f.completedVisits);
    const failure = new Failure(f.code, f.diagnostic, lease.context, lease.attempts, f.cause);
    this.settle(lease, eventKind(f.code), failure);
  }

  private assertCurrent(lease: Lease): void {
    if (lease.settled || this.active !== lease || lease.control.signal.aborted) {
      throw RETIRED;
    }
    if (thinkRuntime.now() >= lease.deadlineMs) {
      throw fault("DEADLINE", "operation deadline elapsed");
    }
  }

  private checkDeadline(lease: Lease): void {
    if (thinkRuntime.now() >= lease.deadlineMs) throw fault("DEADLINE", "operation deadline elapsed");
  }

  private makeRun(lease: Lease): RequestRun {
    const owner = this;
    return {
      context: lease.context,
      deadlineMs: lease.deadlineMs,
      signal: lease.control.signal,
      assertCurrent: () => owner.assertCurrent(lease),
      dispatch(open) {
        owner.assertCurrent(lease);
        const handle = open();
        let delivered = false;
        const onAbort = () => {
          if (delivered) return;
          delivered = true;
          handle.cancel();
        };
        lease.control.signal.addEventListener("abort", onAbort, { once: true });
        if (lease.control.signal.aborted) onAbort();
        return handle.promise.finally(() =>
          lease.control.signal.removeEventListener("abort", onAbort)
        );
      },
      beginAttempt(backend: Backend, epoch: number, setupMs: number): AttemptSpan {
        owner.assertCurrent(lease);
        owner.closeAttempt(lease, "fault", "SEARCH_FAILED");
        const attempt: OpenAttempt = { backend, epoch, setupMs, started: thinkRuntime.now() };
        lease.open = attempt;
        let closed = false;
        return {
          close(disposition, code, metrics): void {
            if (closed || lease.open !== attempt) return;
            closed = true;
            owner.closeAttempt(lease, disposition, code, metrics.searchMs, metrics.completedVisits);
          },
        };
      },
    };
  }

  private buildResponse(lease: Lease, facts: SessionReady, executed: ExecutedOutcome): ThinkResponse {
    const outcome = executed.outcome;
    const base = {
      context: lease.context, modelIdentity: facts.modelIdentity,
      backend: executed.backend, backendEpoch: executed.backendEpoch,
      moveElapsedMs: Math.max(0, thinkRuntime.now() - lease.started),
      attempts: Object.freeze([...lease.attempts]),
    };
    return deepFreeze(
      outcome.kind === "move"
        ? { ...base, kind: "move" as const, result: outcome.result,
            completedVisits: outcome.completedVisits, searchMs: outcome.searchMs }
        : { ...base, kind: "terminal" as const, terminal: outcome.terminal,
            completedVisits: 0 as const, searchMs: outcome.searchMs },
    );
  }

  private async drive(lease: Lease, ready: Promise<SessionReady>, execute: RequestExecutor) {
    const run = this.makeRun(lease);
    try {
      const facts = await ready;
      this.assertCurrent(lease);
      this.checkDeadline(lease);
      const executed = await execute(run);
      this.assertCurrent(lease);
      this.checkDeadline(lease);
      const verdict = verifyOutcome(lease.context.position, executed.outcome);
      if (verdict !== "ok") {
        const code: ErrorCode = verdict === "illegal" ? "ILLEGAL_RESULT" : "PROTOCOL_INVALID";
        const text = verdict === "illegal"
          ? "search produced an illegal or false outcome"
          : "request context could not be reconstructed";
        throw fault(code, text);
      }
      this.assertCurrent(lease);
      this.checkDeadline(lease);
      this.closeAttempt(lease, "complete", null,
        executed.outcome.searchMs, executed.outcome.completedVisits);
      this.settle(lease, "complete", this.buildResponse(lease, facts, executed));
    } catch (err) {
      if (err !== RETIRED) this.fail(lease, err);
    } finally {
      if (this.active === lease) this.active = null;
      if (lease.timer !== null) {
        thinkRuntime.clearTimeout(lease.timer);
        lease.timer = null;
      }
    }
  }

  submit(
    rawContext: RequestContext,
    initializationPending: boolean,
    ready: Promise<SessionReady>,
    execute: RequestExecutor,
  ): Promise<ThinkResponse> {
    if (this.stopped) {
      return Promise.reject(new Failure("STOPPED", "thinker is stopped", null, []));
    }
    if (!isContext(rawContext) || rawContext.engineSessionId !== this.engineSessionId) {
      return Promise.reject(new Failure("PROTOCOL_INVALID", "request context failed validation", null, []));
    }
    let position: GamePosition;
    try {
      position = capturePosition(
        rawContext.position.initialFen,
        rawContext.position.movesUci,
        rawContext.position.expectedFen,
      );
    } catch (err) {
      return Promise.reject(new Failure(
        err instanceof PositionInvalidError ? "POSITION_INVALID" : "PROTOCOL_INVALID",
        diag(err), null, [], err,
      ));
    }
    const requestId = rawContext.requestId;
    if (!Number.isSafeInteger(requestId) || requestId < 0 || requestId <= this.lastRequestId) {
      return Promise.reject(new Failure("PROTOCOL_INVALID", "request id is not monotonic", null, []));
    }
    if (this.active !== null) {
      return Promise.reject(new Failure("BUSY", "a request is already active", null, []));
    }
    this.lastRequestId = requestId;
    const started = thinkRuntime.now();
    const deadlineMs = Math.min(
      started + OPERATION_DEADLINE_MS,
      initializationPending ? this.initDeadlineMs : Infinity,
    );
    const context = deepFreeze<RequestContext>({ ...rawContext, position });
    let resolvePub!: (value: ThinkResponse) => void;
    let rejectPub!: (failure: ThinkerFailure) => void;
    const pub = new Promise<ThinkResponse>((res, rej) => { resolvePub = res; rejectPub = rej; });
    const lease: Lease = {
      context, started, deadlineMs, timer: null, control: new AbortController(),
      attempts: [], open: null, settled: false,
      resolve: resolvePub, reject: rejectPub,
    };
    lease.timer = thinkRuntime.setTimeout(
      () => this.expire(lease, "DEADLINE", "request deadline elapsed"),
      Math.max(1, deadlineMs - started),
    );
    this.active = lease;
    this.publish({ type: "started", context });
    void this.drive(lease, ready, execute);
    return pub;
  }

  cancel(requestId: number): boolean {
    const lease = this.active;
    if (lease === null || lease.settled || lease.context.requestId !== requestId) return false;
    this.expire(lease, "CANCELLED", "request cancelled");
    return true;
  }

  stop(): void {
    this.stopped = true;
    if (this.active !== null) this.expire(this.active, "STOPPED", "thinker stopped");
  }
}
