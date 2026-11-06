// TEST-only exact prior tuple observations from genuine retained receipts.
// Scripted gone data is never a Native availability/cleanup proof.
import { yieldTurn } from "./watchdog-drain-test-fixtures.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { ownFixtureAttempt } from "./watchdog-teardown-test-fixtures.mjs";

const key = (identity) => `${identity.pid}:${identity.startSec}:${identity.startUsec}`;
export function capturePriorReceiptProbes(t, evidence) {
  return ownFixtureAttempt(t, async () => {
    const lifetime = artifactStoreLifetime(evidence.env.store);
    const io = Object.freeze({ retainActual: lifetime.retainActual });
    const probes = {};
    for (const parent of evidence.prerequisites) {
      const actual = await verifyReceipt({ workspaceRoot: evidence.env.workspaceRoot,
        completionRef: parent.completion, expectedIdentity: evidence.commonIdentity }, io);
      const identityKey = key(actual.running.supervisor);
      if (identityKey === key(evidence.parentSupervisor)) {
        throw new Error("fixture prior finalizer equals current healthy parent");
      }
      probes[identityKey] = "gone";
    }
    return Object.freeze(probes);
  });
}

const yield2 = async () => {
  await yieldTurn();
  await yieldTurn();
};

// Waits on the truthful gate-entered channel across bounded real
// turns — entered resolves on actual entry, never a periodic poll;
// the neutral receipt keeps both outcome handlers so a rejected
// original entry floats no discarded descendant, and awaiting the
// original entered still throws the original error.
export const awaitEvidenceEntry = async (gate) => {
  let saw = false;
  void gate.entered.then(
    () => {
      saw = true;
    },
    () => {},
  );
  for (let i = 0; i < 60 && !saw; i += 1) await yield2();
  await gate.entered;
};
