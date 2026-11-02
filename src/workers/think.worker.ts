import { THINK_PROTOCOL_VERSION } from "../lib/chess/constants.ts";
import {
  CheckpointError,
  verifyCheckpointBytes,
  type ModelIdentity,
} from "../lib/chess/checkpoint.ts";
import {
  PositionInvalidError,
  SearchCancelledError,
  SearchDeadlineError,
  search,
} from "../lib/chess/mcts.ts";
import { isClientMessage, isContext } from "../lib/chess/think-message-guards.ts";
import { thinkRuntime } from "../lib/chess/think-runtime.ts";
import { unpackWeights, type WeightSet } from "../lib/chess/weights.ts";
import type {
  ClientMessage,
  ErrorCode,
  WireFailure,
  WorkerMessage,
} from "../lib/chess/think-protocol.ts";

type Session = Readonly<{
  protocolVersion: 1;
  engineSessionId: string;
  backendEpoch: number;
}>;

/** The only outbound edge: production sends through postMessage; tests collect. */
export type WorkerSend = (msg: WorkerMessage) => void;

/** Dispatches one raw inbound message; safe to call under any runtime. */
export type WorkerHandle = (raw: unknown) => void;

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null && !Array.isArray(u);
}

function wireFailure(
  code: ErrorCode,
  diagnostic: string,
  searchMs: number | null = null,
  completedVisits: number | null = null,
): WireFailure {
  return Object.freeze({ code, diagnostic, searchMs, completedVisits });
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function searchErrorCode(err: unknown): ErrorCode {
  if (err instanceof SearchCancelledError) return "CANCELLED";
  if (err instanceof SearchDeadlineError) return "DEADLINE";
  if (err instanceof PositionInvalidError) return "POSITION_INVALID";
  return "SEARCH_FAILED";
}

/**
 * The actual worker protocol handler. One instance owns the worker-side
 * session lifecycle: init is accepted once, independent byte verification
 * precedes readiness, a second active think reports BUSY, and any fatal
 * protocol/version/model/envelope fault is terminal — no ready, result or
 * fresh state ever follows it. The worker never fetches and never generates
 * fallback weights.
 */
export function createWorkerHandler(send: WorkerSend): WorkerHandle {
  let weights: WeightSet | null = null;
  let identity: ModelIdentity | null = null;
  let session: Session | null = null;
  let initializing = false;
  let failed = false;
  let busy = false;

  const post = (msg: WorkerMessage): void => {
    try {
      send(msg);
    } catch {
      // the channel is gone; nothing else to do
    }
  };

  const fatal = (code: "PROTOCOL_INVALID" | "PROTOCOL_VERSION", diagnostic: string): void => {
    if (failed) return;
    failed = true;
    post({ protocolVersion: THINK_PROTOCOL_VERSION, type: "fatal", code, diagnostic });
  };

  const onInit = (msg: Extract<ClientMessage, { type: "init" }>): void => {
    if (session !== null || initializing) {
      fatal("PROTOCOL_INVALID", "init received after session was established");
      return;
    }
    initializing = true;
    const established = Object.freeze({
      protocolVersion: THINK_PROTOCOL_VERSION as 1,
      engineSessionId: msg.engineSessionId,
      backendEpoch: msg.backendEpoch,
    });
    session = established;
    void (async () => {
      try {
        const verified = await verifyCheckpointBytes(msg.bytes, msg.modelIdentity);
        if (failed || session !== established || !initializing) return;
        weights = unpackWeights(verified.bytes);
        identity = verified.identity;
        initializing = false;
        post({ ...established, type: "ready", modelIdentity: verified.identity });
      } catch (err) {
        if (failed || session !== established || !initializing) return;
        initializing = false;
        failed = true;
        const code =
          err instanceof CheckpointError ? err.code : ("SEARCH_FAILED" as const);
        post({
          ...established,
          type: "error",
          scope: "initialization",
          failure: wireFailure(code, describe(err)),
        });
      }
    })();
  };

  const onThink = (msg: Extract<ClientMessage, { type: "think" }>): void => {
    const started = thinkRuntime.now();
    const envelope = {
      protocolVersion: THINK_PROTOCOL_VERSION as 1,
      engineSessionId: msg.engineSessionId,
      backendEpoch: msg.backendEpoch,
    };
    const failReq = (failure: WireFailure) => {
      post({ ...envelope, type: "error", scope: "request", context: msg.context, failure });
    };
    if (session === null || weights === null || identity === null) {
      failReq(wireFailure("NOT_READY", "worker has no verified weights"));
      return;
    }
    if (
      msg.engineSessionId !== session.engineSessionId ||
      msg.backendEpoch !== session.backendEpoch
    ) {
      fatal("PROTOCOL_INVALID", "think envelope conflicts with the established session");
      return;
    }
    if (!isContext(msg.context)) {
      failReq(wireFailure("PROTOCOL_INVALID", "think context failed validation"));
      return;
    }
    if (busy) {
      failReq(wireFailure("BUSY", "worker is already processing a request"));
      return;
    }
    if (msg.remainingMs <= 0) {
      failReq(
        wireFailure(
          "DEADLINE",
          "no remaining time budget for this request",
          thinkRuntime.now() - started,
          0,
        ),
      );
      return;
    }
    busy = true;
    void (async () => {
      try {
        await Promise.resolve();
        if (failed) return;
        const outcome = search(
          msg.context.position,
          msg.context.requestedVisits,
          weights!,
          {
            signal: new AbortController().signal,
            deadlineMs: started + msg.remainingMs,
            now: thinkRuntime.now,
          },
        );
        if (failed) return;
        busy = false;
        post({
          ...envelope,
          type: "result",
          context: msg.context,
          modelIdentity: identity!,
          outcome,
        });
      } catch (err) {
        busy = false;
        if (failed) return;
        failReq(
          wireFailure(
            searchErrorCode(err),
            describe(err),
            thinkRuntime.now() - started,
            null,
          ),
        );
      }
    })();
  };

  return (raw: unknown): void => {
    if (failed) return;
    if (!isClientMessage(raw)) {
      const code =
        isRecord(raw) &&
        typeof raw.protocolVersion === "number" &&
        raw.protocolVersion !== THINK_PROTOCOL_VERSION
          ? ("PROTOCOL_VERSION" as const)
          : ("PROTOCOL_INVALID" as const);
      fatal(
        code,
        code === "PROTOCOL_VERSION"
          ? `unsupported client protocol ${String((raw as { protocolVersion: unknown }).protocolVersion)}`
          : "unrecognized client message",
      );
      return;
    }
    if (raw.type === "init") {
      onInit(raw);
      return;
    }
    onThink(raw);
  };
}

/**
 * Bootstrap only inside a genuine dedicated-worker global. Importing this
 * module under Node or inside a Window installs nothing and mutates nothing.
 */
const scope = globalThis as Record<string, unknown>;
const workerCtor = scope.DedicatedWorkerGlobalScope;
if (
  typeof workerCtor === "function" &&
  globalThis instanceof (workerCtor as new () => object) &&
  typeof scope.postMessage === "function"
) {
  const workerScope = globalThis as unknown as {
    postMessage: (message: WorkerMessage) => void;
    onmessage: ((event: MessageEvent) => void) | null;
  };
  const handle = createWorkerHandler((msg) => {
    try {
      workerScope.postMessage(msg);
    } catch {
      // the channel is gone; nothing else to do
    }
  });
  workerScope.onmessage = (e: MessageEvent) => handle(e.data);
}
