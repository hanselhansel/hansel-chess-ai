// watchdog-records.mjs owns the real recorder/evidence adapter under the
// readable-owner split: appendEvent/appendArtifactChunk calls with a private
// contiguous artifact-call ordinal (never the wire recordSeq), copied
// persisted-metadata pgnEvidence observation before each recorded ack,
// synchronous first-stop freeze, the game-stop cleanup association and the
// reserved summary.gameEvidence snapshot, plus the timed finalize pair
// closeEvidenceBeforeCutoff -> sealClosedEvidence whose immutableStore
// publication result carries verified.final. No writer/status/native
// authority, no wire or schema field, no generic success fallback.
import { copyDeep, isObj } from "./protocol-values.mjs";
import { loadRecord } from "./receipt-files.mjs";
import { phaseRecorderLifetime } from "./records.mjs";

// Error factory: returns the Error. Guard sites throw explicitly.
const fail = (code, detail) => {
  const e = new Error(`watchdog-records ${code}: ${detail}`);
  e.code = code;
  return e;
};

export function createWatchdogRecordAdapter({
  recorder,
  pgnEvidence = null,
  workspaceRoot,
  manifestRel,
  commonIdentity,
  phase,
  onObserverFault = () => {},
  io,
}) {
  if (!isObj(recorder)) throw fail("IPC_INVALID", "recorder");
  if (pgnEvidence !== null && pgnEvidence !== undefined) {
    const ok =
      isObj(pgnEvidence) &&
      typeof pgnEvidence.observePersisted === "function" &&
      typeof pgnEvidence.freeze === "function" &&
      typeof pgnEvidence.snapshot === "function";
    if (!ok) throw fail("IPC_INVALID", "pgnEvidence shape");
  }
  // The ONE trusted io: a provided frozen object of exact own-key shape
  // {retainActual} bound to the genuine recorder lifetime for THIS recorder.
  // The same object is forwarded unchanged; no fallback owner, alias or noop.
  const lifetime = phaseRecorderLifetime(recorder);
  const ioKeys = isObj(io) ? Object.getOwnPropertyNames(io) : [];
  const ioOk =
    isObj(lifetime) &&
    ioKeys.length === 1 &&
    ioKeys[0] === "retainActual" &&
    Object.getOwnPropertySymbols(io).length === 0 &&
    Object.isFrozen(io) &&
    typeof io.retainActual === "function" &&
    io.retainActual === lifetime.retainActual;
  if (!ioOk) throw fail("IPC_INVALID", "io");
  let artifactOrdinal = 0;
  let frozen = false;

  // Observer faults are recorded watchdog faults; persistence faults abort the
  // matching record work so no ack is emitted for an unobserved record.
  const observe = (record) => {
    if (!pgnEvidence) return Promise.resolve();
    let copied;
    try {
      copied = copyDeep(record);
    } catch (error) {
      onObserverFault(error);
      return Promise.reject(error);
    }
    return Promise.resolve()
      .then(() => pgnEvidence.observePersisted(copied))
      .catch((error) => {
        onObserverFault(error);
        throw error;
      });
  };

  const persistEvent = (msg) =>
    Promise.resolve()
      .then(() =>
        recorder.appendEvent({ kind: msg.kind, payload: copyDeep(msg.payload) }),
      )
      .then(() =>
        observe({
          type: "event",
          recordId: msg.recordId,
          recordSeq: msg.recordSeq,
          kind: msg.kind,
          payload: copyDeep(msg.payload),
        }),
      )
      .then(() => null);

  const persistArtifact = (msg) => {
    const bytes = Buffer.from(msg.data, "base64");
    const ordinal = artifactOrdinal;
    artifactOrdinal += 1;
    return Promise.resolve()
      .then(() =>
        recorder.appendArtifactChunk({
          recordId: msg.recordId,
          recordSeq: ordinal,
          artifactId: msg.artifactId,
          path: msg.path,
          mode: msg.mode,
          bytes,
          last: msg.last === true,
        }),
      )
      .then((ref) =>
        observe({
          type: "artifact",
          recordId: msg.recordId,
          recordSeq: msg.recordSeq,
          artifactId: msg.artifactId,
          path: msg.path,
          mode: msg.mode,
          last: msg.last === true,
          ref: ref === undefined || ref === null ? null : copyDeep(ref),
        }).then(() => ref),
      );
  };

  // Synchronous first-stop freeze. atMonoNs stays a real bigint in the
  // dependency contract; it is never routed through the canonical codec.
  const freeze = (fact) => {
    if (!pgnEvidence || frozen) return;
    frozen = true;
    try {
      pgnEvidence.freeze({
        stopReason: fact && fact.stopReason !== undefined ? fact.stopReason : null,
        atMonoNs: BigInt(fact.atMonoNs),
      });
    } catch (error) {
      onObserverFault(error);
    }
  };

  const snapshot = () => {
    if (!pgnEvidence) return undefined;
    try {
      const body = pgnEvidence.snapshot();
      return isObj(body) ? copyDeep(body) : undefined;
    } catch (error) {
      onObserverFault(error);
      return undefined;
    }
  };

  // The bounded cleanup stop association for the frozen current game only.
  // Written through the existing recorder as an ordinary cleanup event; no
  // post-stop PGN patch.
  const gameStopAssociation = async () => {
    const body = snapshot();
    if (!body || !Array.isArray(body.games)) return;
    const current = body.games.find(
      (g) => isObj(g) && g.state === "incomplete" && g.result === "*",
    );
    if (!current) return;
    const checkpoint = isObj(current.checkpoint) ? current.checkpoint : {};
    await recorder.appendEvent({
      kind: "cleanup",
      payload: {
        recordType: "game-stop",
        gameId: current.gameId,
        checkpointId:
          checkpoint.checkpointId !== undefined ? checkpoint.checkpointId : null,
        pgn: checkpoint.pgn !== undefined ? checkpoint.pgn : null,
        result: "*",
        stopReason: body.firstStopReason !== undefined ? body.firstStopReason : null,
        atMonoNs:
          body.freezeAtMonoNs !== undefined ? body.freezeAtMonoNs : null,
      },
    });
  };

  const summaryEvidence = () => {
    const body = snapshot();
    return body === undefined ? undefined : copyDeep(body);
  };

  // Supervisor-originated record events: bounded lifecycle/fault/cleanup and
  // operation-end evidence through the same sole writer.
  const recordEvent = (kind, payload) =>
    Promise.resolve().then(() =>
      recorder.appendEvent({ kind, payload: copyDeep(payload) }),
    );

  // Retains the actual validated d2s end result as operation evidence
  // through the existing "operation" event kind — no new event variant
  // or schema field.
  const recordOperationEnd = (operationId, result) =>
    recordEvent("operation", { operationId, result });

  // The recorded intent for the ACTUAL run outcome. A stopped run is always
  // the real ineligible result — inconclusive, exit 2, the latched
  // reason — independent of any previously admitted requested pass or fault
  // count. Only the coherent pairs passed/0, failed/1 and inconclusive/2
  // leave this composition. A normal finish carries the actual supervisor
  // stopReason null — the driver's finish text has no authority. The
  // driver's reserved summary.gameEvidence namespace is discarded
  // unconditionally; only the actual trusted snapshot occupies it, and the
  // supervised synthetic subtree binds its real fixed zero-game observation
  // even when the blocked driver never finishes. faultCount is a fresh-count
  // callback read AFTER the trusted snapshot work so a snapshot/association
  // observer fault routed through the same first-fault authority is counted.
  const composeIntent = ({ finishReq, stopReq, faultCount }) => {
    const summary =
      finishReq !== null && isObj(finishReq.summary)
        ? copyDeep(finishReq.summary)
        : {};
    delete summary.gameEvidence;
    const ge = summaryEvidence();
    if (ge !== undefined) summary.gameEvidence = ge;
    if (phase === "watchdog-selftest") summary.scoredGames = 0;
    const base =
      stopReq !== null
        ? {
            status: "inconclusive",
            exitCode: 2,
            stopReason: stopReq.reason,
            analysisEligible: false,
            summary,
          }
        : finishReq !== null
          ? {
              status: finishReq.requestedStatus,
              exitCode:
                finishReq.requestedStatus === "passed"
                  ? 0
                  : finishReq.requestedStatus === "failed"
                    ? 1
                    : 2,
              stopReason: null,
              analysisEligible: finishReq.analysisEligible === true,
              summary,
            }
          : {
              status: "inconclusive",
              exitCode: 2,
              stopReason: "DRIVER_LOST",
              analysisEligible: false,
              summary,
            };
    base.unplannedFaultCount =
      typeof faultCount === "function" ? faultCount() : faultCount;
    return base;
  };

  const manifestInputs = async () => {
    const { value } = await loadRecord(
      workspaceRoot,
      manifestRel,
      "manifest",
      undefined,
      io,
    );
    if (!isObj(value) || !isObj(value.inputs)) {
      throw fail("EVIDENCE_INCOMPLETE", "manifest inputs");
    }
    return copyDeep(value.inputs);
  };

  // The timed finalize pair on the real recorder: deadlineMonoMs is the
  // trusted ORIGINAL absolute bound, validated before any effect. The entire
  // first request is copied (parents and nested) before the first await; A
  // admits it before the cutoff, then B seals with no arguments and the
  // genuine immutableStore publication result already carries verified.final.
  // Nothing is validated, copied or reclassified after the immutable seal.
  const finalizeAndRead = async (
    { intent, checks, prerequisites, expectedSelfTest },
    { deadlineMonoMs } = {},
  ) => {
    if (!Number.isSafeInteger(deadlineMonoMs) || deadlineMonoMs < 0) {
      throw fail("IPC_INVALID", "deadlineMonoMs");
    }
    const request = {
      intent: copyDeep(intent),
      checks: copyDeep(checks),
      prerequisites: copyDeep(prerequisites),
      expectedSelfTest:
        expectedSelfTest === null || expectedSelfTest === undefined
          ? null
          : copyDeep(expectedSelfTest),
    };
    await recorder.closeEvidenceBeforeCutoff(request, { deadlineMonoMs });
    const result = await recorder.sealClosedEvidence();
    return { completionRef: result.completionRef, final: result.verified.final };
  };

  const stopOrdinary = () => recorder.stopOrdinary();

  // The genuine unfinished-evidence drain on the real recorder: fences
  // admission, waits actual admitted bodies and closes real sinks. A
  // missing recorder capability stays a real failure, never an assumed
  // close.
  const closeIncompleteEvidence = () =>
    typeof recorder.closeIncompleteEvidence === "function"
      ? recorder.closeIncompleteEvidence()
      : Promise.reject(fail("EVIDENCE_INCOMPLETE", "recorder close"));

  return Object.freeze({
    persistEvent,
    persistArtifact,
    freeze,
    gameStopAssociation,
    summaryEvidence,
    recordEvent,
    recordOperationEnd,
    composeIntent,
    manifestInputs,
    finalizeAndRead,
    stopOrdinary,
    closeIncompleteEvidence,
  });
}
