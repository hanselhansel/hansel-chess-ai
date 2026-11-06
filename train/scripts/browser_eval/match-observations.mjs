// Whole authoritative raw readiness/turn validation shared by match and
// preflight. No engine, operation, clock, IO or cleanup authority.
import { canonicalBytes } from "./canonical-json.mjs";
import { MODEL_IDENTITY } from "./schema-constants.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { exactFields, isObj, nat, strNE } from "./protocol-values.mjs";
const fail = (detail) => {
  const error = new Error(`MATCH_INVALID ${detail}`);
  error.code = "MATCH_INVALID";
  return error;
};
const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));
const model = Object.freeze({
  mode: "trained", modelName: "tinyaz-m", sha256: MODEL_IDENTITY.sha256,
  packedVersion: MODEL_IDENTITY.packedVersion, parameterCount: MODEL_IDENTITY.parameterCount,
  byteLength: MODEL_IDENTITY.byteLength, channels: 128, sourceId: MODEL_IDENTITY.source,
});
export const validateArmReady = (arm, observation) => {
  if (!isObj(observation) || !exactFields(observation, ["ready", "delivery", "worker"]) ||
    !isObj(observation.ready) || !isObj(observation.delivery) || !isObj(observation.worker) ||
    !strNE(observation.worker.instanceId) || observation.worker.raw?.type !== "ready") {
    throw fail("actual readiness observations");
  }
  const { ready, delivery, worker } = observation;
  if (delivery.path !== (arm.kind === "baseline" ? "/weights/tinyaz-s.bin" : "/weights/tinyaz-m.bin") ||
    delivery.sha256 !== MODEL_IDENTITY.sha256 || delivery.byteLength !== MODEL_IDENTITY.byteLength) {
    throw fail("actual M delivery");
  }
  if (arm.kind === "candidate") {
    if (!deepEqual(ready.modelIdentity, model) || !strNE(ready.engineSessionId) ||
      ready.initialBackend !== "worker" || !nat(ready.initialBackendEpoch) ||
      worker.raw.protocolVersion !== 1 || worker.raw.engineSessionId !== ready.engineSessionId || worker.raw.backendEpoch !== ready.initialBackendEpoch ||
      !deepEqual(worker.raw.modelIdentity, model)) {
      throw fail("candidate worker readiness");
    }
  } else if (ready.paramCount !== MODEL_IDENTITY.parameterCount || ready.seed !== 0 || ready.source !== "lichess-2013-01" ||
    worker.raw.paramCount !== ready.paramCount || worker.raw.seed !== ready.seed || worker.raw.source !== ready.source) {
    throw fail("baseline raw readiness");
  }
  return freezeDeep(copy(observation));
};
export const validateArmTurn = (arm, ready, observation, request) => {
  if (!isObj(observation) || !exactFields(observation, ["response", "worker"]) ||
    !isObj(observation.response) || !isObj(observation.worker) || observation.worker.instanceId !== ready.worker.instanceId ||
    observation.worker.raw?.type !== "result") {
    throw fail("actual turn observations");
  }
  const response = observation.response;
  const raw = observation.worker.raw;
  let result;
  if (arm.kind === "candidate") {
    const expectedContext = { engineSessionId: ready.ready.engineSessionId, ...request };
    if (response.kind !== "move" || response.backend !== "worker" ||
      response.backendEpoch !== ready.ready.initialBackendEpoch || response.completedVisits !== 64 ||
      !deepEqual(response.context, expectedContext) || !deepEqual(response.modelIdentity, model) ||
      !Array.isArray(response.attempts) || response.attempts.length !== 1 ||
      response.attempts.some((attempt) => attempt.backend !== "worker" || attempt.disposition !== "complete" || attempt.completedVisits !== 64) ||
      raw.protocolVersion !== 1 || raw.engineSessionId !== ready.ready.engineSessionId || raw.backendEpoch !== response.backendEpoch ||
      !deepEqual(raw.context, expectedContext) || !deepEqual(raw.modelIdentity, model) ||
      !deepEqual(raw.outcome, { kind: response.kind, result: response.result, completedVisits: response.completedVisits, searchMs: response.searchMs })) {
      throw fail("candidate identity/context/worker/visits");
    }
    result = response.result;
  } else {
    if (raw.id !== request.requestId || !deepEqual(raw.result, response)) {
      throw fail("baseline actual worker result");
    }
    result = response;
  }
  if (!isObj(result) || result.visits !== 64 || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(result.uci)) {
    throw fail("move/64 visits");
  }
  return result;
};
