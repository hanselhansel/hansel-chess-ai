// process-proof.mjs owns native registration/probe/signal proof and delegates
// listener proof to process-listeners.mjs under the proof-split decision.
// It keeps no registry, spawn or wire of its own: every proof runs over
// the monitor's same ownership/protocol/transport/deadline state through
// explicit callbacks, every request consumes the caller's borrowed
// BudgetHandle (assertLive/remainingMs, one narrow-only absolute
// horizon). Retained exact terminal-gone facts require original health,
// scope and live-handle guards. Deadline capture/budget helpers live in
// process-budget.mjs and the RSS cycle/projection/inspectPids wire
// wrapper in process-observation.mjs; this owner adds no independent proof authority.
import { createProcessListenerProof } from "./process-listeners.mjs";
import { realpathSync } from "node:fs";
import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import { readHelperReadyInspection, readProcessInspections } from "./process-observation.mjs";
import { copyDeep, eq, fail as ipcFail, isAbs, isIdentity, isObj, isPid, strNE } from "./protocol-values.mjs";



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
  sampleOwnedIdentities = () => ownership.ownedIdentities(),
  isTerminalIdentity = () => false,
  assertNoTerminalReappearance = () => {},
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
    typeof sampleOwnedIdentities !== "function" ||
    typeof isTerminalIdentity !== "function" ||
    typeof assertNoTerminalReappearance !== "function" ||
    typeof resolvePath !== "function"
  ) {
    throw acct("proof options");
  }

  // One fresh native inspectPids read under the caller's borrowed
  // handle carrying the full unresolved/live partition on every issue;
  // ONLY whole-cycle Node-admitted terminal tuples may be omitted.
  // the caller classifies the returned rows itself. The wire
  // wrapper lives in process-observation.mjs (diagnostic move 22).
  const inspect = (pids, handle) =>
    readProcessInspections(pids, handle, { send, nextRid, getOwnedIdentities: sampleOwnedIdentities, assertNoTerminalReappearance });

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
      const error = acct(`root executable expected ${expectedExecutable} actual ${ins.executable}`);
      // Validated path tails survive the existing bounded passive frame.
      error.detail = `expected=${expectedExecutable.slice(-36)} actual=${ins.executable.slice(-36)}`;
      throw error;
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

  // Approved exact-terminal hit after health/live guards needs no Native
  // effect. Every unproven tuple still uses the original fresh collector
  // probe; failures/expiry are unavailable, never new terminal authority.
  const probeIdentityFresh = async (identity, handle) => {
    if (!isIdentity(identity)) return "unavailable";
    try {
      requireHealthy();
      handle.assertLive("probe deadline");
      if (isTerminalIdentity(identity)) return "gone";
      const res = await send(
        "sample",
        { owned: sampleOwnedIdentities(), inspectPids: [], probes: [identity] },
        nextRid("probe"),
        handle,
      );
      assertNoTerminalReappearance(res);
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
    handle.assertLive("signal deadline");
    if (isTerminalIdentity(target)) {
      if (!["TERM", "KILL"].includes(signal)) ipcFail("signal authorize fields");
      return "gone";
    }
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

  const queryListenersScoped = createProcessListenerProof({
    ownership, enqueue, inspect, ownUid, requireHealthy, lsofQueries, acct, isTerminalIdentity,
  });

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
