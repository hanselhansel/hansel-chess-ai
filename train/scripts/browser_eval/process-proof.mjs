// process-proof.mjs owns the native registration/probe/signal/listener
// IO proof extracted from processes.mjs under the proof-split decision.
// It keeps no registry, spawn or wire of its own: every proof runs over
// the monitor's same ownership/protocol/transport/deadline state through
// explicit callbacks, every request consumes the caller's borrowed
// BudgetHandle (assertLive/remainingMs, one narrow-only absolute
// horizon), and a fresh native result is never replaced by a cached or
// invented verdict. Deadline capture/budget helpers live in
// process-budget.mjs and the RSS cycle/projection/inspectPids wire
// wrapper in process-observation.mjs; this owner does the native IO proof only.
import { realpathSync } from "node:fs";
import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import { readHelperReadyInspection, readLiveWorkloadPids, readProcessInspections } from "./process-observation.mjs";
import { copyDeep, eq, identityKey, isAbs, isIdentity, isObj, isPid, strNE } from "./protocol-values.mjs";

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

export function createProcessProofs({
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
  resolvePath = realpathSync,
}) {
  if (
    !strNE(runId) ||
    !isAbs(pythonExecutable) ||
    !isObj(protocol) ||
    typeof protocol.authorizeSignal !== "function" ||
    !isObj(ownership) ||
    typeof send !== "function" ||
    typeof enqueue !== "function" ||
    typeof nextRid !== "function" ||
    typeof requireHealthy !== "function" ||
    typeof lsofQueries !== "function" ||
    typeof ownUid !== "function" ||
    typeof resolvePath !== "function"
  ) {
    throw acct("proof options");
  }

  // One fresh native inspectPids read under the caller's borrowed
  // handle carrying the COMPLETE current owned union on every issue;
  // the caller classifies the returned rows itself. The wire
  // wrapper lives in process-observation.mjs (diagnostic move 22).
  const inspect = (pids, handle) =>
    readProcessInspections(pids, handle, { send, nextRid, getOwnedIdentities: ownership.ownedIdentities });

  // The accepted ready envelope declares tuples; they bind only to the
  // real child PID and this supervisor PID, then to native inspection:
  // both inspected rows must be live with the declared identities, the
  // resolved process images must match the pinned images byte-for-byte
  // (the collector's exec image derives from the pinned launcher), the
  // collector's parent must be the supervisor and both must share one
  // UID. Only after the exact roots-accepted ack do the local
  // registrations activate.
  const proveBootstrap = async ({ ready, childPid }, handle) => {
    requireHealthy();
    if (
      !isObj(ready) ||
      !isPid(childPid) ||
      ready.collector.pid !== childPid ||
      ready.supervisor.pid !== process.pid
    ) {
      throw acct("ready pids");
    }
    if (ready.python.executable !== pythonExecutable) {
      throw acct("ready python");
    }
    const supImage = resolvePath(process.execPath);
    const pyImage = resolvePythonProcessImage(pythonExecutable, {
      resolvePath,
    });
    const rows = await inspect([process.pid, childPid], handle);
    const supIns = rows.find((x) => x.pid === process.pid);
    const colIns = rows.find((x) => x.pid === childPid);
    if (
      !supIns ||
      supIns.state !== "live" ||
      !colIns ||
      colIns.state !== "live" ||
      !eq(supIns.process.identity, ready.supervisor) ||
      !eq(colIns.process.identity, ready.collector) ||
      supIns.executable !== supImage ||
      colIns.executable !== pyImage ||
      colIns.process.ppid !== process.pid ||
      supIns.process.uid !== colIns.process.uid
    ) {
      throw acct("bootstrap proof");
    }
    const uid = supIns.process.uid;
    const roots = [
      {
        identity: ready.supervisor,
        kind: "supervisor",
        expectedExecutable: supImage,
        scopeRunId: runId,
      },
      {
        identity: ready.collector,
        kind: "collector",
        expectedExecutable: pyImage,
        scopeRunId: runId,
      },
    ];
    const ack = await send(
      "own-roots",
      { roots },
      nextRid("roots"),
      handle,
    );
    if (ack.type !== "ready" || ack.stage !== "roots-accepted") {
      throw acct("roots ack");
    }
    handle.assertLive("bootstrap deadline");
    ownership.registerRoot(roots[0]);
    ownership.registerRoot(roots[1]);
    ownership._setRootRow(supIns.process);
    ownership._setRootRow(colIns.process);
    return { ownUid: uid };
  };

  // Proof before registration: only a live bracketed tuple with the
  // exact declared executable and the proven bootstrap UID proceeds.
  // Lineage beyond the supervisor requires a SECOND fresh native read
  // of the parent PID whose full tuple must equal a retained owned
  // tuple exactly: a cached owned PID number is never proof, so a
  // reused PID cannot adopt an unrelated child.
  const registerRootProved = async (
    { pid, kind, expectedExecutable, scopeRunId },
    handle,
  ) => {
    requireHealthy();
    if (
      !isPid(pid) ||
      !isAbs(expectedExecutable) ||
      typeof kind !== "string" ||
      typeof scopeRunId !== "string" ||
      scopeRunId.length === 0
    ) {
      throw acct("root fields");
    }
    const ins = await readHelperReadyInspection(
      { pid, kind, expectedExecutable, pythonExecutable, resolvePath, uid: ownUid(), inspect },
      handle,
    );
    if (!ins || ins.state !== "live") throw acct("root live");
    if (ins.executable !== expectedExecutable) {
      throw acct(
        `root executable expected ${expectedExecutable} actual ${ins.executable}`,
      );
    }
    const row = ins.process;
    const uid = ownUid();
    if (uid === null || row.uid !== uid) throw acct("root uid");
    if (row.ppid !== process.pid) {
      const pins = (await inspect([row.ppid], handle)).find(
        (x) => x.pid === row.ppid,
      );
      if (
        !pins ||
        pins.state !== "live" ||
        pins.process.uid !== uid ||
        !ownership
          ._ownedRows()
          .some((r) => eq(r.identity, pins.process.identity))
      ) {
        throw acct("root lineage");
      }
    }
    const root = {
      identity: row.identity,
      kind,
      expectedExecutable,
      scopeRunId,
    };
    const ack = await send(
      "own-roots",
      { roots: [root] },
      nextRid("roots"),
      handle,
    );
    if (ack.type !== "ready" || ack.stage !== "roots-accepted") {
      throw acct("roots ack");
    }
    handle.assertLive("root deadline");
    ownership.registerRoot(root);
    ownership._setRootRow(row);
    return { identity: copyDeep(row.identity) };
  };

  // A fresh exact-tuple probe through the collector: never a cached or
  // invented verdict; failure or deadline expiry is unavailable, not
  // gone.
  const probeIdentityFresh = async (identity, handle) => {
    if (!isIdentity(identity)) return "unavailable";
    try {
      const res = await send(
        "sample",
        { owned: ownership.ownedIdentities(), inspectPids: [], probes: [identity] },
        nextRid("probe"),
        handle,
      );
      const p = res.probes.find((x) => eq(x.identity, identity));
      handle.assertLive("probe deadline");
      return p ? p.state : "unavailable";
    } catch {
      return "unavailable";
    }
  };

  // Scoped cached ownership plus private one-shot authorization bound
  // to the exact tuple and request ID; the collector re-reads the tuple
  // natively immediately before os.kill and reports the real outcome.
  const signalOwnedProved = async (
    { identity, signal, scopeRunId },
    handle,
  ) => {
    requireHealthy();
    const target = ownership.assertSignalTarget(identity, scopeRunId);
    const rid = nextRid("signal");
    protocol.authorizeSignal({ requestId: rid, identity: target, signal });
    const res = await send(
      "signal",
      { identity: target, signal },
      rid,
      handle,
    );
    handle.assertLive("signal deadline");
    return res.outcome;
  };

  // Listener proof under the caller's absolute deadline: ONE queued
  // fresh liveness classification over the captured workload tuples —
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
        () => readLiveWorkloadPids(workload, handle, { inspect, uid: ownUid() }),
        handle,
      );
      for (const pid of livePids) {
        handle.assertLive("listener deadline");
        allRows.push(
          ...(await lsof.queryOwnedPids([pid], { remainingMs: handle.remainingMs(), scopeRunId, budget: handle, retainActual })).rows,
        );
      }
    }
    for (const p of registered) {
      handle.assertLive("listener deadline");
      allRows.push(
        ...(
          await lsof.queryPort(p.port, {
            remainingMs: handle.remainingMs(),
            scopeRunId,
            budget: handle,
            retainActual,
          })
        ).rows,
      );
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

  // The lsof exec-gate's private transition evidence: one fresh native
  // read of the same authorized tuple. The pinned interpreter image
  // becoming the pinned lsof image is the permitted transition; a fast
  // post-ack exit is the documented legal gone case; any tuple
  // mismatch, third image or failed read is not proof.
  const proveTransition = async (
    { identity, fromExecutable, toExecutable },
    handle,
  ) => {
    if (
      !isIdentity(identity) ||
      !isAbs(fromExecutable) ||
      !isAbs(toExecutable)
    ) {
      return "unavailable";
    }
    try {
      const ins = (await inspect([identity.pid], handle)).find(
        (x) => x.pid === identity.pid,
      );
      // A proven transition verdict is a claimed success: the same
      // handle must still be live on the actual clock, else the read
      // is reported unavailable like any failed proof.
      handle.assertLive("transition deadline");
      if (ins === undefined) return "unavailable";
      if (ins.state !== "live") return "gone";
      if (!eq(ins.process.identity, identity)) return "unexpected";
      if (ins.executable === toExecutable) return "live-transition";
      if (ins.executable === fromExecutable) return "pre-transition";
      return "unexpected";
    } catch {
      return "unavailable";
    }
  };

  return Object.freeze({
    proveBootstrap,
    registerRootProved,
    probeIdentityFresh,
    signalOwnedProved,
    queryListenersScoped,
    proveTransition,
  });
}
