// Module STRONG pending-resource index: pins every armed receipt entry and
// every adopted physical handle independently of task or error
// reachability, so unknown actual debt can never be garbage-collected out
// of the lifetime join. Physical-resource storage only — never a counter,
// ledger, queue, proof or status authority; entries retire only on a
// truthful settle and an adopted handle stays reachable until genuine
// physical close settles it.
const pendingSetup = new Set();

// A neutral physical receipt is a deferred whose executor only captures
// resolve: settle FULFILLS only, never rejects, so retirement is always a
// truthful actual fact owned here — never a rejection-based fake
// completion. Each entry indexes BEFORE the FIRST registrar callout, so a
// reentrant settlement observer already sees the debt; settle is
// idempotent and retires entry and adopted handle from the SAME index.
const armReceipt = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  const entry = {
    promise,
    handle: null,
    settled: false,
    settle: () => {
      if (entry.settled) return;
      entry.settled = true;
      if (entry.handle !== null) {
        pendingSetup.delete(entry.handle);
        entry.handle = null;
      }
      pendingSetup.delete(entry);
      resolve();
    },
  };
  pendingSetup.add(entry);
  return entry;
};

// adopt pins the actual returned child handle in the STRONG index BEFORE
// any shape/pid/semantic read or user-visible outcome — a null, primitive
// or repeat adoption leaves the physical debt owed, never invents a
// no-child proof.
const adopt = (receipt, value) => {
  if (receipt.settled || receipt.handle !== null) return;
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return;
  }
  receipt.handle = value;
  pendingSetup.add(value);
};

export { armReceipt as armSetupReceipt, adopt as adoptSetupHandle };
