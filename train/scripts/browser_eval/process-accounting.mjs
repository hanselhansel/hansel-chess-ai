// Pure whole monitor proof/observation assembly over identical borrowed refs.
// Sole terminal storage stays in observation. No IO/callback at construction.
import { createProcessObservation } from "./process-observation.mjs";
import { createProcessProofs } from "./process-proof.mjs";
export function createProcessAccounting({
  runId,
  pythonExecutable,
  protocol,
  ownership,
  send,
  enqueue,
  nextRid,
  requireHealthy,
  lsofQueries,
  ownUid,
  clock,
  state,
  commitCycle,
  markFault,
  quality = null,
  softCompare = false,
}) {
  if (typeof markFault !== "function") throw new TypeError("accounting markFault binding");
  const observation = createProcessObservation({
    ownership,
    send,
    nextRid,
    requireHealthy,
    clock,
    state,
    commitCycle,
    quality,
    softCompare,
  });
  const assertNoTerminalReappearance = (reply) => {
    try {
      observation.assertNoTerminalReappearance(reply);
    } catch (error) {
      markFault(error);
      throw error;
    }
  };
  const proofs = createProcessProofs({
    runId,
    pythonExecutable,
    protocol,
    ownership,
    send,
    enqueue,
    nextRid,
    requireHealthy,
    lsofQueries,
    ownUid,
    sampleOwnedIdentities: observation.sampleOwnedIdentities,
    isTerminalIdentity: observation.isTerminalIdentity,
    assertNoTerminalReappearance,
  });
  const runCycle = (handle, metadata) =>
    observation.runCycle(handle, metadata).catch((error) => {
      markFault(error);
      throw error;
    });
  return Object.freeze({ proofs, observation, runCycle });
}
