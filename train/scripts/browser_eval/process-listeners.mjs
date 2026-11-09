// Whole listener-proof block over the monitor's original callbacks and
// operation-local borrowed handle. No registry, queue, clock or IO owner.
import { readLiveWorkloadPids } from "./process-observation.mjs";
import { copyDeep, eq, identityKey } from "./protocol-values.mjs";

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

export function createProcessListenerProof({
  ownership, enqueue, inspect, ownUid, requireHealthy, lsofQueries, acct, isTerminalIdentity = () => false,
}) {
  // Listener proof under the caller's absolute deadline: ONE queued
  // liveness classification over the full captured workload tuples, with
  // only Node-admitted terminal exacttuples excluded from fresh inspection —
  // a cached-gone PID never reaches the lsof gate — then one gated
  // owned-pids query PER remaining live PID plus one gated port query
  // per registered port (which always runs, even for a gone owner),
  // then ONE fresh native inspection of every distinct holder PID. A
  // holder is a listener only when its fresh tuple exactly equals a
  // retained owned workload tuple of the scope and any declared port
  // owner matches as a full tuple: stale livePids/PID membership is
  // never proof, a reused PID with a new start tuple stays unexpected,
  // and no holder is adopted or signalled. A proven empty holder set
  // is valid absence.
  const queryListenersScoped = async (
    scopeRunId,
    handle,
    { retainActual } = {},
  ) => {
    requireHealthy();
    const lsof = lsofQueries();
    if (lsof === null || lsof === undefined) throw acct("lsof gate");
    const registered = ownership.portsForScope(scopeRunId);
    const workload = ownership.workloadIdentities(scopeRunId);
    const allRows = [];
    if (workload.length > 0) {
      handle.assertLive("listener deadline");
      const livePids = await enqueue(
        () => readLiveWorkloadPids(workload, handle, { inspect, uid: ownUid(), isTerminalIdentity }),
        handle,
      );
      for (const pid of livePids) {
        handle.assertLive("listener deadline");
        allRows.push(
          ...(await lsof.queryOwnedPids([pid], { remainingMs: handle.remainingMs(), scopeRunId, budget: handle, retainActual })).rows,
        );
      }
    }
    // Live-PID gates above remain strictly sequential. Independent port
    // bodies overlap in bounded groups, each with its own fixed query,
    // registration and exec frame. The validator consumes its one exec
    // slot synchronously before any subsequent await, never per exit.
    let firstFault;
    let failed = false;
    for (let offset = 0; offset < registered.length; offset += 3) {
      handle.assertLive("listener deadline");
      const outcomes = await Promise.allSettled(
        registered.slice(offset, offset + 3).map(async (p) => {
          if (failed) throw firstFault;
          try {
            requireHealthy();
            handle.assertLive("listener deadline");
            return await lsof.queryPort(p.port, {
              remainingMs: handle.remainingMs(), scopeRunId,
              budget: handle, retainActual,
            });
          } catch (error) {
            if (!failed) {
              failed = true;
              firstFault = error;
              // ONLY this listener operation's handle. Its expiry
              // cancels queued registration/transition admission too;
              // collector C and other operations are independent.
              // Actual physical receipts and mandatory gate closes
              // remain owned after their public outcome rejects.
              handle.narrow(0);
            }
            throw error;
          }
        }),
      );
      // Observe every issued outcome before reporting the original
      // first error. Physical exit/BOTHpipe/fd3 receipts independently
      // stay acquired on the SAME genuine registrar until settlement.
      if (failed) throw firstFault;
      handle.assertLive("listener deadline");
      for (const outcome of outcomes) allRows.push(...outcome.value.rows);
    }
    const holderPids = [...new Set(allRows.map((r) => r.pid))];
    const freshTuples = new Map();
    if (holderPids.length > 0) {
      // This query runs UNQUEUED while its nested lsof registrations
      // enqueue on the same chain, so the final holder inspection must
      // also ride the SAME queue with the SAME borrowed handle.
      const rows = await enqueue(
        () => inspect(holderPids, handle),
        handle,
      );
      for (const ins of rows) {
        freshTuples.set(
          ins.pid,
          ins.state === "live" ? ins.process.identity : null,
        );
      }
    }
    const ownedTuples = new Set(
      ownership
        ._ownedRows()
        .filter((r) => r.workload && r.scopeRunId === scopeRunId)
        .map((r) => identityKey(r.identity)),
    );
    const listeners = [];
    const unexpected = [];
    const seen = new Set();
    for (const row of allRows) {
      const key = `${row.address}|${row.port}|${row.pid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const declared = registered.find(
        (p) => p.port === row.port && p.address === row.address,
      );
      const loopback = LOOPBACK.has(row.address);
      const holder = freshTuples.get(row.pid);
      const ownedHolder =
        holder != null && ownedTuples.has(identityKey(holder));
      const declaredMatch =
        declared === undefined ||
        (holder != null && eq(declared.ownerIdentity, holder));
      if (loopback && ownedHolder && declaredMatch) {
        listeners.push(copyDeep(row));
        continue;
      }
      const reason =
        row.address === "*"
          ? "wildcard"
          : !loopback
            ? "nonloopback"
            : declared !== undefined && !declaredMatch
              ? "holder-mismatch"
              : "holder-not-owned";
      unexpected.push({ listener: copyDeep(row), reason });
    }
    // The unqueued path may reach success with no awaited request at
    // all (empty workload and ports), so the shared handle is rechecked
    // on the actual clock before the projection is claimed.
    handle.assertLive("listener deadline");
    return { listeners, unexpected };
  };

  return queryListenersScoped;
}
