// watchdog-operations.mjs owns validated
// driver dispatch and the fixed-first preflight runInternalSelfTest handshake
// over the SAME shared run context supplied by watchdog.mjs.
// createWatchdogOperationContext lives in watchdog-operation-context.mjs.
// watchdog-config.mjs preserves its named re-export, re-exported here so the
// lifecycle keeps the original private import API. Dispatch semantics are
// unchanged: hello/
// heartbeat/end/finish/closed update lifecycle state synchronously; register/
// begin/event/artifact run through the bounded serialized ordinary queue with
// real Native deadlines. begun/recorded use the current remaining bound and
// the unchanged wire recordSeq. No copied registry, second writer, phase-clock
// reset, wire field, process launcher, direct kill or final-writer authority.
import { copyDeep, isObj } from "./protocol-values.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { verifyInternalSelfTest } from "./prerequisites.mjs";
import { issueActual } from "./artifact-files.mjs";
import { runSelftestBegin } from "./watchdog-selftest-operation.mjs";
import { createWatchdogOrdinaryQueue } from "./watchdog-ordinary.mjs";

export { createWatchdogOperationContext } from "./watchdog-config.mjs";

// Error factory: returns the Error. Guard sites throw explicitly; queue,
// callback and handshake paths record/latch without throwing first.
const fail = (code, detail) => {
  const e = new Error(`watchdog-operations ${code}: ${detail}`);
  e.code = code;
  return e;
};

export function createWatchdogOperations({ ctx, records, runInternalSelfTest = null }) {
  if (!isObj(ctx)) throw fail("IPC_INVALID", "ctx");
  if (!isObj(records)) throw fail("IPC_INVALID", "records");
  let firstOpAdmitted = false;
  let integrityRequested = false;
  const integrityId = `${ctx.runId}:final-integrity`;
  const rejectExperiment = () => {
    const error = fail("FINAL_INTEGRITY", "experimental admission permanently fenced");
    ctx.recordFault(error);
    ctx.requestStop("FINAL_INTEGRITY");
  };

  // The bounded serialized ordinary queue lives in watchdog-ordinary.mjs —
  // ONE instance over the SAME ctx retainer, no copied chain here.
  const {
    enqueue,
    ordinaryAdmissionOpen,
    closeOrdinaryAdmission,
    whenOrdinarySettled,
  } = createWatchdogOrdinaryQueue({ ctx, retainActual: ctx.retainActual });
  if (ctx.stopped()) closeOrdinaryAdmission();

  const send = (type, fields) =>
    ctx.send(type, fields, Math.max(1, ctx.workRemainingMs()));

  const onRegister = async (msg) => {
    if (!ctx.admissionOpen()) return;
    // An accepted in-process fixture registration binds the ALREADY-PROVEN
    // driver owner — never an invented identity.
    if (msg.rootPid === null) {
      const owner = ctx.driverIdentity();
      if (owner === null) {
        const e = fail("ACCOUNTING_UNAVAILABLE", "no proven driver owner");
        ctx.recordFault(e);
        ctx.requestStop("ACCOUNTING_UNAVAILABLE");
        return;
      }
      if (msg.listener !== null) {
        ctx.monitor.registerPort({
          address: msg.listener.address,
          port: msg.listener.port,
          ownerIdentity: owner,
          scopeRunId: ctx.runId,
        });
      }
      await send("registered", {
        requestId: msg.requestId,
        identity: owner,
        listener: msg.listener,
      });
      return;
    }
    const reg = await ctx.monitor.registerRoot(
      {
        pid: msg.rootPid,
        kind: msg.kind,
        expectedExecutable: msg.expectedExecutable,
        scopeRunId: ctx.runId,
      },
      ctx.opDeadline(90000),
    );
    if (msg.listener !== null) {
      ctx.monitor.registerPort({
        address: msg.listener.address,
        port: msg.listener.port,
        ownerIdentity: reg.identity,
        scopeRunId: ctx.runId,
      });
    }
    await send("registered", {
      requestId: msg.requestId,
      identity: reg.identity,
      listener: msg.listener,
    });
  };

  const onBegin = async (msg, arm) => {
    if (!ctx.admissionOpen()) return;
    if (ctx.phase === "preflight" && msg.operationId === ctx.selftest.id) {
      return onSelftestBegin(msg, arm);
    }
    const begun = async () => {
      if (!ctx.admissionOpen()) return;
      const remainingMs = Math.floor(arm.deadlineMonoMs - ctx.nowMonoMs());
      if (remainingMs <= 0) {
        ctx.requestStop("OPERATION_TIMEOUT");
        return;
      }
      await send("begun", { operationId: msg.operationId, remainingMs });
    };
    if (ctx.finalIntegrity !== null && msg.operationId === integrityId) {
      // Queue position is serialized; the owned file-only scan uses the
      // EXISTING admission slot, joined after independent Native teardown.
      ctx.startFinalIntegrity(async () => {
        const inputs = await records.manifestInputs();
        if (!ctx.admissionOpen()) return;
        await ctx.finalIntegrity.collect({ workspaceId: ctx.workspaceId, runId: ctx.runId,
          phase: ctx.phase, expectedCommonIdentity: ctx.commonIdentity, inputs },
        { deadlineMonoMs: arm.deadlineMonoMs });
        if (!ctx.admissionOpen()) return;
        if (!ctx.finalIntegrity.isComplete()) throw fail("FINAL_INTEGRITY", "own scan incomplete");
        await begun();
      }).catch((error) => {
        if (!ctx.stopped()) {
          ctx.recordFault(error);
          ctx.requestStop(`FAULT ${error?.code ?? "WORK"}`);
        }
      });
      return;
    }
    await begun();
  };

  const onSelftestBegin = (msg, arm) => runSelftestBegin(ctx, records, runInternalSelfTest, msg, arm);

  // Provisional count-only metadata. Selection remains entirely with the
  // existing supervisor PGN observer, and the successful recorded ACK below
  // is mandatory. No timer, awaited logging, proof or result authority.
  const acknowledgedGames = new Set();
  const acknowledgedPairs = new Map();
  const reportCompletedGame = (msg) => {
    if (ctx.phase !== "compare" || msg.type !== "event" || msg.kind !== "response" ||
      msg.payload?.recordType !== "pgn-checkpoint" || acknowledgedGames.size >= 40 ||
      !ctx.admissionOpen() || !ordinaryAdmissionOpen()) return;
    const body = records.summaryEvidence();
    if (!body || body.frozen) return;
    const game = body.games.find((entry) => entry.gameId === msg.payload.gameId);
    if (game?.state !== "complete" || game.checkpoint.checkpointId !== msg.payload.checkpointId ||
      acknowledgedGames.has(game.gameId)) return;
    acknowledgedGames.add(game.gameId);
    acknowledgedPairs.set(game.pairNumber, (acknowledgedPairs.get(game.pairNumber) ?? 0) + 1);
    const counts = { completedGames: acknowledgedGames.size,
      completedPairs: [...acknowledgedPairs.values()].filter((count) => count === 2).length };
    const line = `TINYAZ_COMPARE_PROGRESS ${JSON.stringify(counts)}\n`;
    // Only the diagnostic sink is isolated. Original persistence, validation
    // and ACK failures keep their unchanged fault/stop behavior.
    try {
      if (Buffer.byteLength(line) <= 256) process.stderr.write(line, () => {});
    } catch {}
  };

  const onRecord = async (msg) => {
    if (!ctx.admissionOpen()) return;
    const ref =
      msg.type === "artifact"
        ? await records.persistArtifact(msg)
        : await records.persistEvent(msg);
    if (!ctx.admissionOpen()) return;
    await send("recorded", {
      recordId: msg.recordId,
      recordSeq: msg.recordSeq,
      ref: ref === undefined ? null : ref,
    });
    reportCompletedGame(msg);
  };

  // Re-verify the retained receipt before parent finalization while the
  // collector still answers probes. Returns the exact expectedSelfTest object
  // or null when no genuine receipt exists (incomplete evidence, never a
  // fabricated ref or retry).
  const selftestEvidence = async ({ deadlineMonoMs } = {}) => {
    const st = ctx.selftest;
    if (ctx.phase !== "preflight" || !st.completionRef) return null;
    // The trusted ORIGINAL absolute end (the captured cleanup end — never
    // phaseEnd) must be a finite safe integer; anything else is a binding
    // fault, not a fresh window.
    if (!Number.isSafeInteger(deadlineMonoMs)) {
      ctx.recordFault(fail("IPC_INVALID", "selftestEvidence bound"));
      return null;
    }
    // Snapshot the genuine retained ref/owner BEFORE the first await.
    const completionRef = copyDeep(st.completionRef);
    const parentSupervisor = ctx.parentSupervisor();
    // Clock guard BEFORE verifier IO: a spent bound never starts receipt
    // verification.
    if (ctx.nowMonoMs() >= deadlineMonoMs) return null;
    const assertEffectLive = () => {
      if (ctx.nowMonoMs() >= deadlineMonoMs) throw fail("OPERATION_TIMEOUT", "proof effect past cleanup fence");
    };
    const verificationBudget = ctx.commonIdentity.evaluationPolicy?.policyId === "tinyaz-separate-verdicts-v3"
      ? createBudgetHandle({ deadlineMonoMs,
        clock: { setTimeout, clearTimeout }, nowMonoMs: ctx.nowMonoMs }) : null;
    const proofIo = Object.freeze({ retainActual: ctx.io.retainActual, assertEffectLive });
    try {
      // Prearm the verifier body through the SAME actual retainer BEFORE
      // the verifier is invoked: the awaited issue covers its receipt IO
      // and post-FS probe dispatch as ONE genuine owner debt.
      const verified = await issueActual(ctx.retainActual, () =>
        verifyInternalSelfTest(
          {
            workspaceRoot: ctx.workspaceRoot,
            completionRef,
            parentRunId: ctx.runId,
            parentSupervisor,
            expectedIdentity: ctx.commonIdentity,
            probeIdentity: (identity) => {
              // The clock is checked AGAIN inside the actual probe AFTER
              // receipt IO and before the fresh Native dispatch — cleanup
              // proof may run after ordinary admission closed, but never
              // past the original captured end.
              if (ctx.nowMonoMs() >= deadlineMonoMs) {
                return Promise.reject(
                  fail("OPERATION_TIMEOUT", "probe past cleanup end"),
                );
              }
              return ctx.monitor.probeIdentity(identity, { deadlineMonoMs });
            },
          },
          proofIo,
          verificationBudget === null ? undefined : { budget: verificationBudget },
        ),
      );
      assertEffectLive();
      return {
        completion: copyDeep(verified.completionRef),
        expectedStopReason: "HEARTBEAT_TIMEOUT",
      };
    } catch (error) {
      ctx.recordFault(error);
      return null;
    } finally { verificationBudget?.dispose(); }
  };

  // Validated d2s dispatch. Control messages mutate lifecycle synchronously so
  // heartbeats, finish admission and first-stop handling never wait on the
  // ordinary queue. The begin operation clock arms at dispatch — a stalled
  // record queue can never defer the 30/90-second bound.
  const dispatch = (msg) => {
    switch (msg.type) {
      case "hello":
        if (
          ctx.channelPid() !== null &&
          msg.pid === ctx.channelPid() &&
          msg.phase === ctx.phase &&
          msg.commonIdentitySha256 === ctx.commonIdentitySha256
        ) {
          ctx.noteHelloOk();
        } else {
          const e = fail("HELLO_MISMATCH", "pid/phase/hash");
          ctx.recordFault(e);
          ctx.requestStop("HELLO_MISMATCH");
        }
        return;
      case "heartbeat":
        ctx.noteHeartbeat();
        return;
      case "closed":
        ctx.noteDriverClosed();
        return;
      case "end": {
        const dl = ctx.operationDeadline();
        ctx.disarmOperation();
        if (dl !== null && ctx.nowMonoMs() > dl) {
          const e = fail("OPERATION_TIMEOUT", "end after captured bound");
          ctx.recordFault(e);
          ctx.requestStop("OPERATION_TIMEOUT");
        }
        if (ctx.admissionOpen() && ordinaryAdmissionOpen()) {
          enqueue(() =>
            records.recordOperationEnd(msg.operationId, copyDeep(msg.result)),
          );
        }
        return;
      }
      case "finish":
        ctx.noteFinish(msg);
        return;
      case "register":
        if (!ordinaryAdmissionOpen()) return;
        if (integrityRequested) return rejectExperiment();
        enqueue(() => onRegister(msg));
        return;
      case "begin": {
        // Fence BEFORE firstOpAdmitted mutation and ctx.armOperation; the
        // clock still arms at dispatch, never behind the queue.
        if (!ordinaryAdmissionOpen()) return;
        if (ctx.finalIntegrity !== null && msg.operationId === integrityId) {
          if (integrityRequested || msg.kind !== "command") return rejectExperiment();
          integrityRequested = true;
        } else if (integrityRequested) {
          return rejectExperiment();
        }
        if (ctx.phase === "preflight" && !firstOpAdmitted) {
          if (msg.operationId !== ctx.selftest.id || msg.kind !== "command") {
            const e = fail("IPC_INVALID", "first op must be fixed selftest begin");
            ctx.recordFault(e);
            ctx.requestStop("SELFTEST_INVALID");
            return;
          }
          firstOpAdmitted = true;
        }
        const arm = ctx.armOperation(msg.kind);
        enqueue(() => onBegin(msg, arm));
        return;
      }
      case "event":
      case "artifact":
        if (!ordinaryAdmissionOpen()) return;
        if (integrityRequested) return rejectExperiment();
        if (ctx.phase === "preflight" && !firstOpAdmitted) {
          const e = fail("IPC_INVALID", "record before fixed selftest begin");
          ctx.recordFault(e);
          ctx.requestStop("SELFTEST_INVALID");
          return;
        }
        enqueue(() => onRecord(msg));
        return;
      default:
        return;
    }
  };

  return Object.freeze({
    dispatch,
    selftestEvidence,
    closeOrdinaryAdmission,
    whenOrdinarySettled,
  });
}
