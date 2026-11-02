import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import type { ModelIdentity } from "./checkpoint.ts";
import { capturePosition } from "./position.ts";
import type { RequestContext } from "./think-protocol.ts";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const OPEN_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
export const POSITION = capturePosition(START_FEN, ["e2e4", "e7e5"], OPEN_FEN);
export const CONTEXT: RequestContext = {
  engineSessionId: "session-1",
  gameGeneration: 2,
  requestId: 7,
  position: POSITION,
  requestedVisits: 64,
};
export const SESSION = {
  protocolVersion: 1,
  engineSessionId: "session-1",
  backendEpoch: 3,
};
export const DEMO_IDENTITY: ModelIdentity = {
  mode: "random-demo",
  modelName: "tinyaz-s",
  sha256: "a".repeat(64),
  packedVersion: 1,
  parameterCount: 640018,
  byteLength: 2560088,
  channels: 64,
  sourceId: 0,
  seed: 2026,
};
export const MOVE_RESULT = {
  uci: "f1c4",
  san: "Bc4",
  from: "f1",
  to: "c4",
  value: 0.25,
  visits: 64,
  ms: 12,
  children: [
    { san: "Bc4", uci: "f1c4", visits: 30, q: 0.1, prior: 0.5 },
    { san: "Nf3", uci: "g1f3", visits: 20, q: -0.2, prior: 0.3 },
  ],
  heatmap: { c4: 1, f3: 0.5 },
};
export const MOVE_OUTCOME = {
  kind: "move",
  result: MOVE_RESULT,
  completedVisits: 64,
  searchMs: 12.4,
};
export const INIT_MESSAGE = {
  ...SESSION,
  type: "init",
  modelIdentity: SELECTED_MODEL_IDENTITY,
  bytes: new ArrayBuffer(16),
};
export const THINK_MESSAGE = {
  ...SESSION,
  type: "think",
  context: CONTEXT,
  remainingMs: 45000,
};
export const READY_MESSAGE = {
  ...SESSION,
  type: "ready",
  modelIdentity: SELECTED_MODEL_IDENTITY,
};
export const RESULT_MESSAGE = {
  ...SESSION,
  type: "result",
  context: CONTEXT,
  modelIdentity: SELECTED_MODEL_IDENTITY,
  outcome: MOVE_OUTCOME,
};
export const INIT_ERROR = {
  ...SESSION,
  type: "error",
  scope: "initialization",
  failure: {
    code: "LOAD_DIGEST",
    diagnostic: "hash mismatch",
    searchMs: null,
    completedVisits: null,
  },
};
export const REQUEST_ERROR = {
  ...SESSION,
  type: "error",
  scope: "request",
  context: CONTEXT,
  failure: {
    code: "SEARCH_FAILED",
    diagnostic: "boom",
    searchMs: 3,
    completedVisits: 10,
  },
};
export const FATAL_MESSAGE = {
  protocolVersion: 1,
  type: "fatal",
  code: "PROTOCOL_VERSION",
  diagnostic: "unsupported version",
};
