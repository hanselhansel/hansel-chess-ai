import {
  PositionInvalidError,
  SearchCancelledError,
  SearchDeadlineError,
} from "./mcts.ts";
import { MAX_VISITS } from "./constants.ts";
import { isErrorCode } from "./think-message-guards.ts";
import type {
  Attempt, ErrorCode, RequestContext, ThinkerFailure,
} from "./think-protocol.ts";

const DIAGNOSTIC_MAX = 2048;

const isRecord = (u: unknown): u is Record<string, unknown> =>
  typeof u === "object" && u !== null && !Array.isArray(u);

/** Bound arbitrary error text into a fixed-size diagnostic string. */
export function diag(err: unknown): string {
  const s = err instanceof Error ? err.message : String(err);
  return s.length > DIAGNOSTIC_MAX ? s.slice(0, DIAGNOSTIC_MAX) : s;
}

function searchMsOf(u: unknown): number | null {
  return typeof u === "number" && Number.isFinite(u) && u >= 0 ? u : null;
}

function visitsOf(u: unknown): number | null {
  return typeof u === "number" && Number.isSafeInteger(u) && u >= 0 && u <= MAX_VISITS
    ? u : null;
}

function mapSearchError(err: unknown): ErrorCode {
  if (err instanceof SearchCancelledError) return "CANCELLED";
  if (err instanceof SearchDeadlineError) return "DEADLINE";
  if (err instanceof PositionInvalidError) return "POSITION_INVALID";
  return "SEARCH_FAILED";
}

/** A typed executor/dispatch fault: code, bounded text, honest partial metrics. */
export type RequestFault = Readonly<{
  code: ErrorCode;
  diagnostic: string;
  searchMs: number | null;
  completedVisits: number | null;
  cause?: unknown;
}>;

export function fault(code: ErrorCode, diagnostic: string, cause?: unknown): RequestFault {
  return Object.freeze({ code, diagnostic: diag(diagnostic), searchMs: null, completedVisits: null, cause });
}

/** Normalize any rejection into a RequestFault, preserving the original cause. */
export function faultOf(err: unknown): RequestFault {
  if (isRecord(err) && typeof err.code === "string" && typeof err.diagnostic === "string") {
    return Object.freeze({
      code: isErrorCode(err.code) ? err.code : "SEARCH_FAILED",
      diagnostic: diag(err.diagnostic),
      searchMs: searchMsOf(err.searchMs),
      completedVisits: visitsOf(err.completedVisits),
      cause: Object.hasOwn(err, "cause") ? (err as { cause?: unknown }).cause : err,
    });
  }
  return fault(mapSearchError(err), diag(err), err);
}

/**
 * The typed rejection surfaced by session request and readiness promises.
 * Its attempts array and fault fields are frozen records; the Error object
 * itself is not frozen.
 */
export class Failure extends Error implements ThinkerFailure {
  readonly code: ErrorCode;
  readonly diagnostic: string;
  readonly context: RequestContext | null;
  readonly attempts: readonly Attempt[];

  constructor(
    code: ErrorCode, diagnostic: string, context: RequestContext | null,
    attempts: readonly Attempt[], cause?: unknown,
  ) {
    super(diag(diagnostic), cause === undefined ? undefined : { cause });
    this.name = "ThinkerFailure";
    this.code = code;
    this.diagnostic = diag(diagnostic);
    this.context = context;
    this.attempts = Object.freeze([...attempts]);
  }
}

/** Codes that end the session; everything else is a request-level failure. */
const SESSION_CODES: readonly ErrorCode[] = [
  "LOAD_HTTP", "LOAD_FORMAT", "LOAD_LENGTH", "LOAD_NONFINITE", "LOAD_DIGEST",
  "CRYPTO_UNAVAILABLE", "MODEL_MISMATCH", "PROTOCOL_INVALID", "PROTOCOL_VERSION",
  "STOPPED",
];

/** True when the engine can no longer accept a fresh request. */
export function isSessionFatal(code: ErrorCode): boolean {
  return SESSION_CODES.includes(code);
}
