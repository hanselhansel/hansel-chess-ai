import type { ModelIdentity } from "./checkpoint.ts";
import type { GamePosition } from "./position.ts";
import type { SearchOutcome } from "./search-types.ts";

export type { GamePosition } from "./position.ts";
export { sameModelIdentity } from "./checkpoint.ts";
export {
  isClientMessage,
  isWorkerMessage,
  sameContext,
} from "./think-message-guards.ts";

export type ErrorCode =
  | "LOAD_HTTP"
  | "LOAD_FORMAT"
  | "LOAD_LENGTH"
  | "LOAD_NONFINITE"
  | "LOAD_DIGEST"
  | "CRYPTO_UNAVAILABLE"
  | "MODEL_MISMATCH"
  | "POSITION_INVALID"
  | "PROTOCOL_INVALID"
  | "PROTOCOL_VERSION"
  | "NOT_READY"
  | "BUSY"
  | "WORKER_UNAVAILABLE"
  | "SEARCH_FAILED"
  | "ILLEGAL_RESULT"
  | "CANCELLED"
  | "DEADLINE"
  | "STOPPED";
export type Backend = "worker" | "main";
export type RequestContext = Readonly<{
  engineSessionId: string;
  gameGeneration: number;
  requestId: number;
  position: GamePosition;
  requestedVisits: number;
}>;
export type Attempt = Readonly<{
  backend: Backend;
  backendEpoch: number;
  setupMs: number;
  elapsedMs: number;
  searchMs: number | null;
  completedVisits: number | null;
  disposition: "complete" | "unavailable" | "cancelled" | "deadline" | "fault";
  code: ErrorCode | null;
}>;
export type FailureData = Readonly<{
  code: ErrorCode;
  diagnostic: string;
  context: RequestContext | null;
  attempts: readonly Attempt[];
}>;
export interface ThinkerFailure extends Error {
  readonly code: ErrorCode;
  readonly diagnostic: string;
  readonly context: RequestContext | null;
  readonly attempts: readonly Attempt[];
}
export type SessionReady = Readonly<{
  engineSessionId: string;
  modelIdentity: ModelIdentity;
  initialBackend: Backend;
  initialBackendEpoch: number;
  fetchMs: number;
  verificationMs: number;
  initializationMs: number;
  attempts: readonly Attempt[];
}>;
export type ThinkResponse = Readonly<{
  context: RequestContext;
  modelIdentity: ModelIdentity;
  backend: Backend;
  backendEpoch: number;
  moveElapsedMs: number;
  attempts: readonly Attempt[];
}> &
  SearchOutcome;
export type EngineState = Readonly<{
  stage: "loading" | "starting" | "ready" | "thinking" | "recovering" | "failed" | "stopped";
  engineSessionId: string;
  backendEpoch: number;
  modelIdentity: ModelIdentity | null;
  backend: Backend | null;
  activeContext: RequestContext | null;
  error: FailureData | null;
}>;
export type ThinkerOptions = Readonly<{ mode?: "trained" | "random-demo" }>;
export interface Thinker {
  readonly ready: Promise<SessionReady>;
  getState(): EngineState;
  subscribe(listener: (state: EngineState) => void): () => void;
  think(context: RequestContext): Promise<ThinkResponse>;
  cancel(requestId: number): boolean;
  terminate(): void;
}

type Version = Readonly<{ protocolVersion: 1 }>;
type WireSession = Version &
  Readonly<{
    engineSessionId: string;
    backendEpoch: number;
  }>;
export type InitMessage = WireSession &
  Readonly<{
    type: "init";
    modelIdentity: ModelIdentity;
    bytes: ArrayBuffer;
  }>;
export type ThinkMessage = WireSession &
  Readonly<{
    type: "think";
    context: RequestContext;
    remainingMs: number;
  }>;
export type ReadyMessage = WireSession &
  Readonly<{
    type: "ready";
    modelIdentity: ModelIdentity;
  }>;
export type ResultMessage = WireSession &
  Readonly<{
    type: "result";
    context: RequestContext;
    modelIdentity: ModelIdentity;
    outcome: SearchOutcome;
  }>;
type WireFailure = Readonly<{
  code: ErrorCode;
  diagnostic: string;
  searchMs: number | null;
  completedVisits: number | null;
}>;
export type WorkerErrorMessage = WireSession &
  (
    | Readonly<{ type: "error"; scope: "initialization"; failure: WireFailure }>
    | Readonly<{
        type: "error";
        scope: "request";
        context: RequestContext;
        failure: WireFailure;
      }>
  );
export type FatalMessage = Version &
  Readonly<{
    type: "fatal";
    code: "PROTOCOL_INVALID" | "PROTOCOL_VERSION";
    diagnostic: string;
  }>;
export type ClientMessage = InitMessage | ThinkMessage;
export type WorkerMessage = ReadyMessage | ResultMessage | WorkerErrorMessage | FatalMessage;
