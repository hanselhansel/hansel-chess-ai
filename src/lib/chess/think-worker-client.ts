import { THINK_PROTOCOL_VERSION, WORKER_ACK_MS } from "./constants.ts";
import { sameModelIdentity, type ModelIdentity } from "./checkpoint.ts";
import { isWorkerMessage, sameContext } from "./think-message-guards.ts";
import { thinkRuntime } from "./think-runtime.ts";
import type { ThinkWorker } from "./think-runtime.ts";
import type {
  ClientMessage,
  ErrorCode,
  RequestContext,
} from "./think-protocol.ts";
import type { SearchOutcome } from "./search-types.ts";

const STALE_LIMIT = 8;
const DIAGNOSTIC_MAX = 2048;
const IDENTITY_FIELDS = [
  "modelName", "sha256", "packedVersion", "parameterCount",
  "byteLength", "channels", "sourceId", "seed",
] as const;
const FAULT_CODES: readonly ErrorCode[] = [
  "PROTOCOL_INVALID", "PROTOCOL_VERSION", "MODEL_MISMATCH",
];

export type ChannelFailure = Readonly<{
  code: ErrorCode;
  diagnostic: string;
  searchMs: number | null;
  completedVisits: number | null;
  /**
   * Present and true when the fault arrived explicitly on the wire (a worker
   * `error` message). Only transport losses (error events, ack expiry) may
   * consume the one availability recovery; explicit wire errors never do.
   */
  wire?: true;
}>;

export type ChannelResult = Readonly<{
  context: RequestContext;
  modelIdentity: ModelIdentity;
  outcome: SearchOutcome;
}>;

export interface WorkerChannel {
  readonly backendEpoch: number;
  readonly staleCount: number;
  /** Resolve on worker ready; reject ChannelFailure on init error, fault or unavailability. */
  init(identity: ModelIdentity, bytes: ArrayBuffer): Promise<ModelIdentity>;
  /** Resolve on a checked result; reject ChannelFailure on request error, fault or unavailability. */
  think(context: RequestContext, remainingMs: number): Promise<ChannelResult>;
  /** Retire one request id so late replies are stale, not faults. */
  expireRequest(requestId: number): void;
  retire(): void;
}

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null && !Array.isArray(u);
}

function describe(err: unknown): string {
  const s = err instanceof Error ? err.message : String(err);
  return s.length > DIAGNOSTIC_MAX ? s.slice(0, DIAGNOSTIC_MAX) : s;
}

/** Present-but-different identity fields mark a wrong model; missing fields are just a broken shape. */
function recognizableMismatch(u: unknown, expected: ModelIdentity): boolean {
  if (!isRecord(u)) return false;
  if (u.mode !== "trained" && u.mode !== "random-demo") return false;
  if (u.mode !== expected.mode) return true;
  const target = expected as unknown as Record<string, unknown>;
  for (const key of IDENTITY_FIELDS) {
    if (Object.hasOwn(u, key) && u[key] !== target[key]) return true;
  }
  return false;
}

function failure(
  code: ErrorCode,
  diagnostic: string,
  searchMs: number | null = null,
  completedVisits: number | null = null,
): ChannelFailure {
  return Object.freeze({ code, diagnostic, searchMs, completedVisits });
}

/** Channel rejections are frozen ChannelFailure records; anything else is a raw error. */
export function isChannelFailure(u: unknown): u is ChannelFailure {
  return (
    isRecord(u) &&
    typeof u.code === "string" &&
    typeof u.diagnostic === "string" &&
    Object.hasOwn(u, "searchMs") &&
    Object.hasOwn(u, "completedVisits")
  );
}

/**
 * Own one worker transport: acknowledgement timer, one pending request,
 * strict reply validation, listener cleanup and retirement. Failures come
 * back as typed rejections; anomalies with no pending promise go to
 * `onOrphan`. Model loading stays outside.
 */
export function openWorkerChannel(options: {
  engineSessionId: string;
  backendEpoch: number;
  expectedIdentity: ModelIdentity;
  onOrphan: (failure: ChannelFailure) => void;
}): WorkerChannel {
  const { engineSessionId: sessionId, backendEpoch: epoch, expectedIdentity } = options;
  const onOrphan = options.onOrphan;
  const worker: ThinkWorker = thinkRuntime.createWorker();
  const session = {
    protocolVersion: THINK_PROTOCOL_VERSION,
    engineSessionId: sessionId,
    backendEpoch: epoch,
  } as const;

  type InitPending = {
    resolve: (identity: ModelIdentity) => void;
    reject: (failure: ChannelFailure) => void;
  };
  type ThinkPending = {
    context: RequestContext;
    resolve: (result: ChannelResult) => void;
    reject: (failure: ChannelFailure) => void;
  };
  let pendingInit: InitPending | null = null;
  let pendingThink: ThinkPending | null = null;
  let gotReady = false;
  let faulted = false;
  let retired = false;
  let orphanEmitted = false;
  const retiredIds = new Set<number>();
  let stale = 0;
  let ackTimer: ReturnType<typeof setTimeout> | null = null;

  const stopAck = () => {
    if (ackTimer !== null) {
      thinkRuntime.clearTimeout(ackTimer);
      ackTimer = null;
    }
  };
  const markStale = () => {
    if (stale < STALE_LIMIT) stale += 1;
  };
  const rejectPending = (f: ChannelFailure): void => {
    if (pendingInit !== null) {
      const p = pendingInit;
      pendingInit = null;
      stopAck();
      p.reject(f);
      return;
    }
    if (pendingThink !== null) {
      const p = pendingThink;
      pendingThink = null;
      retiredIds.add(p.context.requestId);
      p.reject(f);
      return;
    }
    if (!orphanEmitted) {
      orphanEmitted = true;
      onOrphan(f);
    }
  };
  const fault = (
    code: "PROTOCOL_INVALID" | "PROTOCOL_VERSION" | "MODEL_MISMATCH",
    diagnostic: string,
  ): void => {
    if (retired || faulted) return;
    faulted = true;
    rejectPending(failure(code, diagnostic));
  };
  const unavailable = (diagnostic: string): void => {
    if (retired || faulted) return;
    rejectPending(failure("WORKER_UNAVAILABLE", diagnostic));
  };

  function matchActive(context: RequestContext): ThinkPending | null {
    if (retiredIds.has(context.requestId)) {
      markStale();
      return null;
    }
    const active = pendingThink;
    if (active === null) {
      fault("PROTOCOL_INVALID", "reply for an unknown request");
      return null;
    }
    if (!sameContext(context, active.context)) {
      fault("PROTOCOL_INVALID", "reply context conflicts with the active request");
      return null;
    }
    return active;
  }

  function classify(raw: unknown): void {
    if (retired) return;
    if (faulted) {
      markStale();
      return;
    }
    if (isWorkerMessage(raw)) {
      if (raw.type === "fatal") {
        fault(raw.code, `worker fatal: ${raw.diagnostic}`);
        return;
      }
      if (raw.engineSessionId !== sessionId) {
        markStale();
        return;
      }
      if (raw.backendEpoch < epoch) {
        markStale();
        return;
      }
      if (raw.backendEpoch > epoch) {
        fault("PROTOCOL_INVALID", "reply claims a future backend epoch");
        return;
      }
      switch (raw.type) {
        case "ready": {
          if (gotReady || pendingInit === null) {
            fault("PROTOCOL_INVALID", "unexpected ready");
            return;
          }
          if (!sameModelIdentity(raw.modelIdentity, expectedIdentity)) {
            fault("MODEL_MISMATCH", "worker reported a different model identity");
            return;
          }
          gotReady = true;
          stopAck();
          const p = pendingInit;
          pendingInit = null;
          p.resolve(raw.modelIdentity);
          return;
        }
        case "result": {
          if (!gotReady) {
            fault("PROTOCOL_INVALID", "result before ready");
            return;
          }
          if (!sameModelIdentity(raw.modelIdentity, expectedIdentity)) {
            fault("MODEL_MISMATCH", "worker reported a different model identity");
            return;
          }
          const active = matchActive(raw.context);
          if (active === null) return;
          pendingThink = null;
          retiredIds.add(active.context.requestId);
          active.resolve({
            context: active.context,
            modelIdentity: raw.modelIdentity,
            outcome: raw.outcome,
          });
          return;
        }
        case "error": {
          if (raw.scope === "initialization") {
            if (gotReady || pendingInit === null) {
              fault("PROTOCOL_INVALID", "unexpected initialization error");
              return;
            }
            stopAck();
            const p = pendingInit;
            pendingInit = null;
            p.reject(Object.freeze({ ...raw.failure, wire: true as const }));
            return;
          }
          if (!gotReady) {
            fault("PROTOCOL_INVALID", "request error before ready");
            return;
          }
          const active = matchActive(raw.context);
          if (active === null) return;
          pendingThink = null;
          retiredIds.add(active.context.requestId);
          active.reject(Object.freeze({ ...raw.failure, wire: true as const }));
          return;
        }
      }
    }
    if (isRecord(raw)) {
      const version = raw.protocolVersion;
      if (typeof version === "number" && version !== THINK_PROTOCOL_VERSION) {
        fault("PROTOCOL_VERSION", `unsupported protocol version ${String(version)}`);
        return;
      }
      if (
        (raw.type === "ready" || raw.type === "result") &&
        recognizableMismatch(raw.modelIdentity, expectedIdentity)
      ) {
        fault("MODEL_MISMATCH", "worker reported a different model identity");
        return;
      }
    }
    fault("PROTOCOL_INVALID", "unrecognized worker message");
  }

  const onMessage = (event: MessageEvent) => classify(event.data);
  const onError = () => unavailable("worker error event");
  const onMessageError = () =>
    fault("PROTOCOL_INVALID", "worker message could not be deserialized");
  const onStaleMessage = () => markStale();
  worker.addEventListener("message", onMessage);
  worker.addEventListener("error", onError);
  worker.addEventListener("messageerror", onMessageError);

  const channel: WorkerChannel = {
    backendEpoch: epoch,
    get staleCount() {
      return stale;
    },
    init(identity: ModelIdentity, bytes: ArrayBuffer): Promise<ModelIdentity> {
      return new Promise((resolve, reject) => {
        if (retired || faulted || pendingInit !== null || gotReady) {
          reject(failure("PROTOCOL_INVALID", "init called out of order"));
          return;
        }
        const message: ClientMessage = {
          ...session, type: "init", modelIdentity: identity, bytes,
        };
        pendingInit = { resolve, reject };
        ackTimer = thinkRuntime.setTimeout(
          () => unavailable(`worker acknowledgement timed out after ${WORKER_ACK_MS} ms`),
          WORKER_ACK_MS,
        );
        try {
          worker.postMessage(message, [bytes]);
        } catch (err) {
          pendingInit = null;
          stopAck();
          reject(failure("PROTOCOL_INVALID", `init postMessage failed: ${describe(err)}`));
        }
      });
    },
    think(context: RequestContext, remainingMs: number): Promise<ChannelResult> {
      return new Promise((resolve, reject) => {
        if (retired || faulted || !gotReady || pendingThink !== null) {
          reject(failure("NOT_READY", "channel cannot think right now"));
          return;
        }
        if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
          reject(failure("DEADLINE", "no remaining time budget for this request"));
          return;
        }
        pendingThink = { context, resolve, reject };
        const message: ClientMessage = {
          ...session, type: "think", context, remainingMs,
        };
        try {
          worker.postMessage(message);
        } catch (err) {
          pendingThink = null;
          reject(failure("PROTOCOL_INVALID", `think postMessage failed: ${describe(err)}`));
        }
      });
    },
    expireRequest(requestId: number): void {
      if (pendingThink?.context.requestId === requestId) {
        const p = pendingThink;
        pendingThink = null;
        p.reject(failure("CANCELLED", "request retired client-side"));
      }
      retiredIds.add(requestId);
    },
    retire(): void {
      if (retired) return;
      retired = true;
      stopAck();
      if (pendingInit !== null) {
        const p = pendingInit;
        pendingInit = null;
        p.reject(failure("STOPPED", "channel retired"));
      }
      if (pendingThink !== null) {
        const p = pendingThink;
        pendingThink = null;
        p.reject(failure("STOPPED", "channel retired"));
      }
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
      worker.addEventListener("message", onStaleMessage);
      try {
        worker.terminate();
      } catch {
        // retirement is best-effort once the transport is dead
      }
    },
  };
  return channel;
}

export { FAULT_CODES };
