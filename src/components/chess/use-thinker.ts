import { useCallback, useEffect, useRef, useState } from "react";
import { capturePosition } from "@/lib/chess/position";
import { createThinker, isSessionFatal } from "@/lib/chess/think-client";
import { sameContext } from "@/lib/chess/think-message-guards";
import type {
  EngineState,
  ErrorCode,
  RequestContext,
  SessionReady,
  Thinker,
  ThinkerFailure,
  ThinkResponse,
} from "@/lib/chess/think-protocol";

export type ThinkerMode = "trained" | "random-demo";

function isCancel(code: unknown): boolean {
  return code === "CANCELLED" || code === "STOPPED";
}

const LOAD_FAILURE_MSG =
  "Engine could not verify or load the checkpoint. Restart the engine.";
const SHORT_FAILURES: Record<string, string> = {
  BUSY: "Engine is already thinking.",
  DEADLINE: "The move request timed out.",
  CANCELLED: "Move request cancelled.",
  STOPPED: "Move request cancelled.",
  NOT_READY: "Engine is not ready yet.",
  WORKER_UNAVAILABLE: "Engine worker was lost; the move may need a retry.",
  POSITION_INVALID: "Move request failed. Retry the move or restart the engine.",
  ILLEGAL_RESULT: "Move request failed. Retry the move or restart the engine.",
  SEARCH_FAILED: "Move request failed. Retry the move or restart the engine.",
  MODEL_MISMATCH: LOAD_FAILURE_MSG,
  PROTOCOL_VERSION: LOAD_FAILURE_MSG,
  PROTOCOL_INVALID: LOAD_FAILURE_MSG,
  LOAD_HTTP: LOAD_FAILURE_MSG,
  LOAD_FORMAT: LOAD_FAILURE_MSG,
  LOAD_LENGTH: LOAD_FAILURE_MSG,
  LOAD_NONFINITE: LOAD_FAILURE_MSG,
  LOAD_DIGEST: LOAD_FAILURE_MSG,
  CRYPTO_UNAVAILABLE: LOAD_FAILURE_MSG,
};

/** One short player message per failure code; full diagnostics stay on the Failure record. */
export function shortThinkerFailure(failure: unknown): string {
  const code = (failure as { code?: unknown } | null)?.code;
  return SHORT_FAILURES[String(code)] ?? "Something failed. Retry or restart the engine.";
}

/** The private owner record installed before an engine's subscriptions. */
type EngineOwner = { thinker: Thinker; alive: boolean };

/** The immutable lease that owns one in-flight request through application. */
type Lease = Readonly<{
  owner: EngineOwner;
  context: RequestContext;
  requestId: number;
}>;

/** The synchronous callbacks runTurn invokes while the lease is still held. */
export type TurnHandlers = Readonly<{
  /** True while the workbench game/history still matches the issued context. */
  isPositionCurrent(context: RequestContext): boolean;
  /** Apply a verified response synchronously inside the held lease. */
  onSuccess(response: ThinkResponse): void;
  /** Report a request failure synchronously inside the held lease. */
  onFailure(failure: unknown): void;
}>;

export type ThinkerHandle = Readonly<{
  /** Latest published engine state, or null before the first subscription tick. */
  state: EngineState | null;
  /** Resolved session facts once the engine is ready. */
  session: SessionReady | null;
  /** Retained load failure; survives resets/replacement until a ready succeeds. */
  sessionError: ThinkerFailure | null;
  /** The explicit mode this handle's session runs. */
  mode: ThinkerMode;
  /** The engine-owned in-flight request id, or null when idle. */
  pendingRequestId: number | null;
  /**
   * Latched eligible request failure. Protocol/model/load/fatal errors require
   * an engine restart instead; automatic effects never clear the latch.
   */
  turnFailed: boolean;
  /**
   * Run one request turn: copy the context, hold the lease through the
   * synchronous handlers, then release. Resolves after every path.
   */
  runTurn(context: RequestContext, handlers: TurnHandlers): Promise<void>;
  /** Retire the pending lease before cancelling it. */
  cancelPending(): void;
  /** Release the failed-turn latch (explicit retry/new game only). */
  clearTurnFailed(): void;
  /** Terminate the session and start a fresh one, optionally in another mode. */
  restart(mode?: ThinkerMode): void;
}>;

export function useThinker(initialMode: ThinkerMode = "trained"): ThinkerHandle {
  const ownerRef = useRef<EngineOwner | null>(null);
  const thinkerRef = useRef<Thinker | null>(null);
  const leaseRef = useRef<Lease | null>(null);
  const [mode, setMode] = useState<ThinkerMode>(initialMode);
  const [epoch, setEpoch] = useState(0);
  const [state, setState] = useState<EngineState | null>(null);
  const [session, setSession] = useState<SessionReady | null>(null);
  const [sessionError, setSessionError] = useState<ThinkerFailure | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [turnFailed, setTurnFailed] = useState(false);

  /** Synchronously retire owner/subscription/lease authority, then cancel and terminate. */
  const retireOwner = useCallback(() => {
    const owner = ownerRef.current;
    if (owner !== null) {
      owner.alive = false;
      ownerRef.current = null;
    }
    const thinker = thinkerRef.current;
    thinkerRef.current = null;
    const lease = leaseRef.current;
    leaseRef.current = null;
    setPendingRequestId(null);
    if (lease !== null) lease.owner.thinker.cancel(lease.requestId);
    thinker?.terminate();
  }, []);

  useEffect(() => {
    const thinker = createThinker(mode === "trained" ? undefined : { mode });
    const owner: EngineOwner = { thinker, alive: true };
    ownerRef.current = owner;
    thinkerRef.current = thinker;
    const unsubscribe = thinker.subscribe((s) => {
      if (owner.alive) setState(s);
    });
    thinker.ready.then(
      (s) => {
        if (owner.alive && ownerRef.current === owner) {
          setSession(s);
          setSessionError(null);
        }
      },
      (e) => {
        if (owner.alive && ownerRef.current === owner) setSessionError(e);
      },
    );
    return () => {
      retireOwner();
      unsubscribe();
      setSession(null);
      setState(null);
    };
  }, [mode, epoch, retireOwner]);

  const runTurn = useCallback(
    async (context: RequestContext, handlers: TurnHandlers): Promise<void> => {
      if (leaseRef.current !== null) return;
      const owner = ownerRef.current;
      if (owner === null || !owner.alive || owner.thinker !== thinkerRef.current) return;
      let copied: RequestContext;
      try {
        const position = capturePosition(
          context.position.initialFen,
          [...context.position.movesUci],
          context.position.expectedFen,
        );
        copied = Object.freeze({ ...context, position });
      } catch {
        return;
      }
      const lease: Lease = Object.freeze({ owner, context: copied, requestId: copied.requestId });
      leaseRef.current = lease;
      setPendingRequestId(lease.requestId);
      const owned = () =>
        owner.alive &&
        ownerRef.current === owner &&
        thinkerRef.current === owner.thinker &&
        leaseRef.current === lease;
      try {
        const response = await owner.thinker.think(copied);
        if (
          !owned() ||
          !sameContext(response.context, copied) ||
          !handlers.isPositionCurrent(copied)
        ) {
          return;
        }
        handlers.onSuccess(response);
        if (owned()) setTurnFailed(false);
      } catch (failure) {
        if (!owned() || !handlers.isPositionCurrent(copied)) return;
        try {
          handlers.onFailure(failure);
        } catch {
          // a broken consumer must not break release bookkeeping
        }
        if (owned()) {
          const code = (failure as { code?: unknown }).code;
          if (!isCancel(code) && !isSessionFatal(code as ErrorCode)) setTurnFailed(true);
        }
      } finally {
        if (
          owner.alive &&
          ownerRef.current === owner &&
          thinkerRef.current === owner.thinker &&
          leaseRef.current === lease
        ) {
          leaseRef.current = null;
          setPendingRequestId(null);
        }
      }
    },
    [],
  );

  const cancelPending = useCallback(() => {
    const lease = leaseRef.current;
    leaseRef.current = null;
    setPendingRequestId(null);
    if (lease !== null) lease.owner.thinker.cancel(lease.requestId);
  }, []);

  const clearTurnFailed = useCallback(() => {
    setTurnFailed(false);
  }, []);

  const restart = useCallback((next?: ThinkerMode) => {
    retireOwner();
    setTurnFailed(false);
    setSession(null);
    setState(null);
    if (next !== undefined) setMode(next);
    setEpoch((n) => n + 1);
  }, [retireOwner]);

  return {
    state,
    session,
    sessionError,
    mode,
    pendingRequestId,
    turnFailed,
    runTurn,
    cancelPending,
    clearTurnFailed,
    restart,
  };
}
