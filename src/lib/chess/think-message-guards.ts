import { SELECTED_MODEL_IDENTITY, sameModelIdentity } from "./checkpoint.ts";
import type { ModelIdentity } from "./checkpoint.ts";
import {
  MAX_VISITS,
  OPERATION_DEADLINE_MS,
  THINK_PROTOCOL_VERSION,
} from "./constants.ts";
import type { GamePosition } from "./position.ts";
import type {
  ChildStat,
  SearchOutcome,
  TerminalOutcome,
  ThinkResult,
} from "./search-types.ts";
import type {
  ClientMessage,
  RequestContext,
  WorkerMessage,
} from "./think-protocol.ts";

const DIAGNOSTIC_MAX = 2048;
const SQUARE_PATTERN = /^[a-h][1-8]$/;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const PROMOTIONS: readonly string[] = ["q", "r", "b", "n"];
const DRAW_REASONS: readonly string[] = [
  "stalemate", "insufficient-material", "threefold-repetition", "fifty-move",
];
const ERROR_CODES: readonly string[] = [
  "LOAD_HTTP", "LOAD_FORMAT", "LOAD_LENGTH", "LOAD_NONFINITE", "LOAD_DIGEST",
  "CRYPTO_UNAVAILABLE", "MODEL_MISMATCH", "POSITION_INVALID", "PROTOCOL_INVALID",
  "PROTOCOL_VERSION", "NOT_READY", "BUSY", "WORKER_UNAVAILABLE", "SEARCH_FAILED",
  "ILLEGAL_RESULT", "CANCELLED", "DEADLINE", "STOPPED",
];
const SESSION_KEYS = ["protocolVersion", "engineSessionId", "backendEpoch"];
const IDENTITY_KEYS = [
  "mode", "modelName", "sha256", "packedVersion", "parameterCount",
  "byteLength", "channels", "sourceId",
];
const POSITION_KEYS = ["initialFen", "movesUci", "expectedFen"];
const CONTEXT_KEYS = [
  "engineSessionId", "gameGeneration", "requestId", "position", "requestedVisits",
];
const RESULT_BASE_KEYS = [
  "uci", "san", "from", "to", "value", "visits", "ms", "children", "heatmap",
];
const FAILURE_KEYS = ["code", "diagnostic", "searchMs", "completedVisits"];
const INIT_KEYS = [...SESSION_KEYS, "type", "modelIdentity", "bytes"];
const THINK_KEYS = [...SESSION_KEYS, "type", "context", "remainingMs"];
const READY_KEYS = [...SESSION_KEYS, "type", "modelIdentity"];
const RESULT_KEYS = [...SESSION_KEYS, "type", "context", "modelIdentity", "outcome"];
const INIT_ERROR_KEYS = [...SESSION_KEYS, "type", "scope", "failure"];
const REQUEST_ERROR_KEYS = [...SESSION_KEYS, "type", "scope", "context", "failure"];
const FATAL_KEYS = ["protocolVersion", "type", "code", "diagnostic"];

function isRecord(u: unknown): u is Record<string, unknown> {
  return typeof u === "object" && u !== null && !Array.isArray(u);
}

function exactKeys(u: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(u).length === keys.length && keys.every((k) => Object.hasOwn(u, k))
  );
}

function isSafeNonnegInt(u: unknown): u is number {
  return Number.isSafeInteger(u) && (u as number) >= 0;
}

function isFiniteNonneg(u: unknown): u is number {
  return typeof u === "number" && Number.isFinite(u) && u >= 0;
}

function inUnitInterval(u: unknown): u is number {
  return typeof u === "number" && u >= 0 && u <= 1;
}

function inValueRange(u: unknown): u is number {
  return typeof u === "number" && u >= -1 && u <= 1;
}

function isSharedBuffer(value: unknown): boolean {
  return typeof SharedArrayBuffer === "function" && value instanceof SharedArrayBuffer;
}

function isFenSyntax(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const parts = u.trim().split(/\s+/);
  if (parts.length !== 6) return false;
  const ranks = parts[0].split("/");
  if (ranks.length !== 8) return false;
  for (const rank of ranks) {
    if (!/^[1-8pnbrqkPNBRQK]+$/.test(rank)) return false;
    if (/[1-8]{2}/.test(rank)) return false;
    let squares = 0;
    for (const ch of rank) squares += /\d/.test(ch) ? Number(ch) : 1;
    if (squares !== 8) return false;
  }
  if (parts[1] !== "w" && parts[1] !== "b") return false;
  if (!/^-$|^K?Q?k?q?$/.test(parts[2])) return false;
  if (!/^-$|^[a-h][36]$/.test(parts[3])) return false;
  if (!/^\d+$/.test(parts[4]) || !/^\d+$/.test(parts[5])) return false;
  const halfmove = Number(parts[4]);
  const fullmove = Number(parts[5]);
  return (
    Number.isSafeInteger(halfmove) &&
    Number.isSafeInteger(fullmove) &&
    fullmove >= 1
  );
}

function isModelIdentity(u: unknown): u is ModelIdentity {
  if (!isRecord(u)) return false;
  if (u.mode === "trained") {
    return (
      exactKeys(u, IDENTITY_KEYS) &&
      sameModelIdentity(u as unknown as ModelIdentity, SELECTED_MODEL_IDENTITY)
    );
  }
  if (u.mode === "random-demo") {
    return (
      exactKeys(u, [...IDENTITY_KEYS, "seed"]) &&
      u.modelName === "tinyaz-s" &&
      typeof u.sha256 === "string" &&
      SHA256_PATTERN.test(u.sha256) &&
      u.packedVersion === 1 &&
      u.parameterCount === 640018 &&
      u.byteLength === 2560088 &&
      u.channels === 64 &&
      u.sourceId === 0 &&
      u.seed === 2026
    );
  }
  return false;
}

function isGamePosition(u: unknown): u is GamePosition {
  if (
    !isRecord(u) ||
    !exactKeys(u, POSITION_KEYS) ||
    !isFenSyntax(u.initialFen) ||
    !isFenSyntax(u.expectedFen) ||
    !Array.isArray(u.movesUci)
  ) {
    return false;
  }
  const moves = u.movesUci;
  for (let i = 0; i < moves.length; i++) {
    if (!Object.hasOwn(moves, i)) return false;
    const m = moves[i];
    if (typeof m !== "string" || !UCI_PATTERN.test(m)) return false;
  }
  return true;
}

function isContext(u: unknown): u is RequestContext {
  return (
    isRecord(u) &&
    exactKeys(u, CONTEXT_KEYS) &&
    typeof u.engineSessionId === "string" &&
    u.engineSessionId.length > 0 &&
    isSafeNonnegInt(u.gameGeneration) &&
    isSafeNonnegInt(u.requestId) &&
    isGamePosition(u.position) &&
    Number.isInteger(u.requestedVisits) &&
    (u.requestedVisits as number) >= 1 &&
    (u.requestedVisits as number) <= MAX_VISITS
  );
}

export function sameContext(a: RequestContext, b: RequestContext): boolean {
  const pa = a.position;
  const pb = b.position;
  if (
    a.engineSessionId !== b.engineSessionId ||
    a.gameGeneration !== b.gameGeneration ||
    a.requestId !== b.requestId ||
    a.requestedVisits !== b.requestedVisits ||
    pa.initialFen !== pb.initialFen ||
    pa.expectedFen !== pb.expectedFen ||
    pa.movesUci.length !== pb.movesUci.length
  ) {
    return false;
  }
  for (let i = 0; i < pa.movesUci.length; i++) {
    if (pa.movesUci[i] !== pb.movesUci[i]) return false;
  }
  return true;
}

function isTerminalOutcome(u: unknown): u is TerminalOutcome {
  if (!isRecord(u) || !exactKeys(u, ["reason", "winner"])) return false;
  if (u.reason === "checkmate") return u.winner === "w" || u.winner === "b";
  return (
    typeof u.reason === "string" && DRAW_REASONS.includes(u.reason) && u.winner === null
  );
}

function isChildStat(u: unknown, requestedVisits: number): u is ChildStat {
  return (
    isRecord(u) &&
    exactKeys(u, ["san", "uci", "visits", "q", "prior"]) &&
    typeof u.san === "string" &&
    u.san.length > 0 &&
    typeof u.uci === "string" &&
    UCI_PATTERN.test(u.uci) &&
    Number.isInteger(u.visits) &&
    (u.visits as number) >= 0 &&
    (u.visits as number) < requestedVisits &&
    inValueRange(u.q) &&
    inUnitInterval(u.prior)
  );
}

function isThinkResult(u: unknown, requestedVisits: number): u is ThinkResult {
  if (!isRecord(u)) return false;
  const promoted = Object.hasOwn(u, "promotion");
  if (!exactKeys(u, promoted ? [...RESULT_BASE_KEYS, "promotion"] : RESULT_BASE_KEYS)) {
    return false;
  }
  if (
    typeof u.uci !== "string" ||
    !UCI_PATTERN.test(u.uci) ||
    typeof u.san !== "string" ||
    u.san.length === 0 ||
    typeof u.from !== "string" ||
    !SQUARE_PATTERN.test(u.from) ||
    typeof u.to !== "string" ||
    !SQUARE_PATTERN.test(u.to)
  ) {
    return false;
  }
  if (promoted && (typeof u.promotion !== "string" || !PROMOTIONS.includes(u.promotion))) {
    return false;
  }
  if (u.uci !== `${u.from}${u.to}${promoted ? String(u.promotion) : ""}`) return false;
  if (
    !inValueRange(u.value) ||
    !Number.isInteger(u.visits) ||
    (u.visits as number) < 1 ||
    !Number.isInteger(u.ms) ||
    (u.ms as number) < 0 ||
    !Array.isArray(u.children) ||
    u.children.length > 8 ||
    !isRecord(u.heatmap)
  ) {
    return false;
  }
  const seen = new Set<string>();
  for (const child of u.children) {
    if (!isChildStat(child, requestedVisits)) return false;
    const uci = (child as ChildStat).uci;
    if (seen.has(uci)) return false;
    seen.add(uci);
  }
  return Object.entries(u.heatmap).every(
    ([square, v]) => SQUARE_PATTERN.test(square) && inUnitInterval(v),
  );
}

function isSearchOutcome(u: unknown, requestedVisits: number): u is SearchOutcome {
  if (!isRecord(u)) return false;
  if (u.kind === "move") {
    if (!exactKeys(u, ["kind", "result", "completedVisits", "searchMs"])) return false;
    if (!isThinkResult(u.result, requestedVisits)) return false;
    const result = u.result as ThinkResult;
    return (
      result.visits === requestedVisits &&
      u.completedVisits === requestedVisits &&
      isFiniteNonneg(u.searchMs) &&
      result.ms === Math.round(u.searchMs as number)
    );
  }
  if (u.kind === "terminal") {
    return (
      exactKeys(u, ["kind", "terminal", "completedVisits", "searchMs"]) &&
      isTerminalOutcome(u.terminal) &&
      u.completedVisits === 0 &&
      isFiniteNonneg(u.searchMs)
    );
  }
  return false;
}

function isSessionBase(u: Record<string, unknown>): boolean {
  return (
    u.protocolVersion === THINK_PROTOCOL_VERSION &&
    typeof u.engineSessionId === "string" &&
    u.engineSessionId.length > 0 &&
    isSafeNonnegInt(u.backendEpoch)
  );
}

function isWireFailure(u: unknown): boolean {
  return (
    isRecord(u) &&
    exactKeys(u, FAILURE_KEYS) &&
    typeof u.code === "string" &&
    ERROR_CODES.includes(u.code) &&
    typeof u.diagnostic === "string" &&
    u.diagnostic.length <= DIAGNOSTIC_MAX &&
    (u.searchMs === null || isFiniteNonneg(u.searchMs)) &&
    (u.completedVisits === null ||
      (Number.isInteger(u.completedVisits) &&
        (u.completedVisits as number) >= 0 &&
        (u.completedVisits as number) <= MAX_VISITS))
  );
}

function contextAgrees(u: Record<string, unknown>): boolean {
  return (
    isContext(u.context) &&
    (u.context as RequestContext).engineSessionId === u.engineSessionId
  );
}

export function isClientMessage(u: unknown): u is ClientMessage {
  if (!isRecord(u)) return false;
  if (u.type === "init") {
    return (
      exactKeys(u, INIT_KEYS) &&
      isSessionBase(u) &&
      isModelIdentity(u.modelIdentity) &&
      u.bytes instanceof ArrayBuffer &&
      !isSharedBuffer(u.bytes)
    );
  }
  if (u.type === "think") {
    return (
      exactKeys(u, THINK_KEYS) &&
      isSessionBase(u) &&
      contextAgrees(u) &&
      typeof u.remainingMs === "number" &&
      Number.isFinite(u.remainingMs) &&
      u.remainingMs > 0 &&
      u.remainingMs <= OPERATION_DEADLINE_MS
    );
  }
  return false;
}

export function isWorkerMessage(u: unknown): u is WorkerMessage {
  if (!isRecord(u)) return false;
  if (u.type === "ready") {
    return (
      exactKeys(u, READY_KEYS) &&
      isSessionBase(u) &&
      isModelIdentity(u.modelIdentity)
    );
  }
  if (u.type === "result") {
    if (!exactKeys(u, RESULT_KEYS) || !isSessionBase(u) || !contextAgrees(u)) {
      return false;
    }
    if (!isModelIdentity(u.modelIdentity)) return false;
    return isSearchOutcome(u.outcome, (u.context as RequestContext).requestedVisits);
  }
  if (u.type === "error") {
    if (!isSessionBase(u)) return false;
    if (u.scope === "initialization") {
      return exactKeys(u, INIT_ERROR_KEYS) && isWireFailure(u.failure);
    }
    if (u.scope === "request") {
      return (
        exactKeys(u, REQUEST_ERROR_KEYS) &&
        contextAgrees(u) &&
        isWireFailure(u.failure)
      );
    }
    return false;
  }
  if (u.type === "fatal") {
    return (
      exactKeys(u, FATAL_KEYS) &&
      u.protocolVersion === THINK_PROTOCOL_VERSION &&
      (u.code === "PROTOCOL_INVALID" || u.code === "PROTOCOL_VERSION") &&
      typeof u.diagnostic === "string" &&
      u.diagnostic.length <= DIAGNOSTIC_MAX
    );
  }
  return false;
}
