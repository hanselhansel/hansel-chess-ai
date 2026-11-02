// Sole supervisor recorder/state machine for canonical phase records.
// Owns write order: workspace once, manifest before collector startup,
// actual running before driver startup, bounded ordinary output, durable
// deletion descriptions, mandatory cleanup/identity verification, final
// before completion, completion written atomically last, then permanent
// seal. Delegates bytes, schema, artifact IO and pure finalization
// construction to the shared owners; this module remains the only writer.

import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { phaseArtifactRefs } from "./artifact-store.mjs";
import {
  buildCompletion,
  buildFinal,
  deriveSelfTestChecks,
  EXIT_CODES,
  isCleanupProven,
  resolveAnalysisEligible,
  resolvePhaseChecks,
  resolveStatus,
  structurallyValidProof,
  UNPROVEN_PROOF,
} from "./record-finalization.mjs";

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const copy = (value) => parseCanonicalBytes(canonicalBytes(value));
const deepEqual = (a, b) => canonicalBytes(a).equals(canonicalBytes(b));

const POST_STOP_KINDS = new Set(["fault", "cleanup", "resource", "artifact-deletion"]);

// Before actual running exists, only observed supervisor bootstrap
// evidence is admissible: fault, resource and cleanup facts. Ordinary
// operation/delivery/response/artifact work has no phase to bind to.
const BOOTSTRAP_KINDS = new Set(["fault", "resource", "cleanup"]);

export async function writeWorkspaceOnce({ store, workspace }) {
  const snapshot = copy(workspace);
  assertRecord("workspace", snapshot);
  return store.writeOnce("workspace.json", canonicalBytes(snapshot), "ordinary");
}

export function createPhaseRecorder({ store, workspace, manifest, verifyCleanup, verifyIdentity }) {
  if (typeof verifyCleanup !== "function" || typeof verifyIdentity !== "function") {
    fail("RECORDER_CONFIG", "mandatory native callbacks");
  }
  const ws = copy(workspace);
  const mf = copy(manifest);
  assertRecord("workspace", ws);
  assertRecord("manifest", mf);
  if (ws.workspaceId !== mf.workspaceId) fail("RECORDER_CONFIG", "workspaceId mismatch");
  if (sha256Bytes(canonicalBytes(ws.commonIdentity)) !== mf.commonIdentitySha256) {
    fail("RECORDER_CONFIG", "commonIdentitySha256 mismatch");
  }

  const phaseDir = mf.phase === "watchdog-selftest" ? "preflight/selftest" : mf.phase;
  const selftest = mf.phase === "watchdog-selftest";
  const state = {
    manifest: false,
    running: null,
    stopped: false,
    finalizing: false,
    finalized: false,
    sticky: null,
    eventSeq: 0,
    eventsSink: null,
    lanePromoted: false,
    recordSeq: 0,
    recordIds: new Set(),
    streams: new Map(),
    closedArtifactIds: new Set(),
  };

  // Caller-correctable rejections never poison the recorder; only store,
  // schema, callback or IO failures latch the sticky state.
  const CORRECTABLE = new Set(["RECORDER_STATE", "RECORDER_INPUT", "RECORDER_CLAIM"]);
  const attempt = async (fn) => {
    if (state.sticky !== null) fail("RECORDER_STICKY", state.sticky);
    try {
      return await fn();
    } catch (error) {
      if (!CORRECTABLE.has(error.code)) state.sticky = error.code ?? String(error);
      throw error;
    }
  };

  const need = (cond, detail) => {
    if (!cond) fail("RECORDER_STATE", detail);
  };

  const headFields = () => ({
    schemaVersion: 1,
    workspaceId: mf.workspaceId,
    runId: mf.runId,
    phase: mf.phase,
  });

  const appendRawEvent = async (kind, payload) => {
    const record = { ...headFields(), seq: state.eventSeq, kind, payload };
    assertRecord("event", record);
    state.eventSeq += 1;
    if (state.stopped && !state.lanePromoted) {
      state.eventsSink.setLane("final");
      state.lanePromoted = true;
    }
    await state.eventsSink.append(canonicalBytes(record));
  };

  const api = {
    phaseDirectory: phaseDir,

    async writeManifest() {
      return attempt(async () => {
        need(!state.manifest, "manifest already written");
        await store.writeOnce(`${phaseDir}/manifest.json`, canonicalBytes(mf), "ordinary");
        state.eventsSink = await store.openArtifact({
          artifactId: `${mf.runId}:events`,
          path: `${phaseDir}/events.jsonl`,
          mode: "append",
          lane: "ordinary",
        });
        state.manifest = true;
      });
    },

    async writeRunning(running) {
      const record = copy(running);
      return attempt(async () => {
        need(state.manifest, "manifest required first");
        need(state.running === null, "running already written");
        need(!state.stopped && !state.finalized, "phase ended");
        assertRecord("running", record);
        if (
          record.workspaceId !== mf.workspaceId ||
          record.runId !== mf.runId ||
          record.phase !== mf.phase ||
          record.commonIdentitySha256 !== mf.commonIdentitySha256
        ) {
          fail("RECORDER_CONFIG", "running does not match manifest");
        }
        await store.writeOnce(`${phaseDir}/running.json`, canonicalBytes(record), "ordinary");
        state.running = record;
      });
    },

    async appendEvent({ kind, payload }) {
      const snapshot = copy(payload);
      return attempt(async () => {
        need(state.manifest, "manifest required first");
        need(!state.finalized, "phase finalized");
        if (state.running === null) {
          if (!BOOTSTRAP_KINDS.has(kind)) {
            fail("RECORDER_STATE", "running required first");
          }
        } else if (state.stopped && !POST_STOP_KINDS.has(kind)) {
          fail("RECORDER_STATE", "ordinary work stopped");
        }
        await appendRawEvent(kind, snapshot);
      });
    },

    async appendArtifactChunk({ recordId, recordSeq, artifactId, path, mode, bytes, last }) {
      const buffer = Buffer.from(bytes ?? []);
      const pathSnapshot = typeof path === "string" ? `${path}` : path;
      return attempt(async () => {
        need(state.running !== null, "running required first");
        need(!state.stopped && !state.finalized, "ordinary work stopped");
        if (typeof recordId !== "string" || recordId.length === 0 || state.recordIds.has(recordId)) {
          fail("RECORDER_INPUT", "recordId");
        }
        if (recordSeq !== state.recordSeq) fail("RECORDER_INPUT", "recordSeq gap");
        if (buffer.length > 65536) fail("RECORDER_INPUT", "chunk over 64KiB");
        if (typeof pathSnapshot !== "string" || !pathSnapshot.startsWith(`${phaseDir}/`)) {
          fail("RECORDER_INPUT", "path outside phase");
        }
        if (typeof last !== "boolean") fail("RECORDER_INPUT", "last");
        let stream = state.streams.get(artifactId);
        if (!stream) {
          if (state.closedArtifactIds.has(artifactId)) {
            fail("RECORDER_INPUT", "artifactId closed");
          }
          const sink = await store.openArtifact({
            artifactId,
            path: pathSnapshot,
            mode,
            lane: "ordinary",
          });
          stream = { sink, path: pathSnapshot, mode };
          state.streams.set(artifactId, stream);
        } else if (stream.path !== pathSnapshot || stream.mode !== mode) {
          fail("RECORDER_INPUT", "stream binding changed");
        }
        state.recordIds.add(recordId);
        state.recordSeq += 1;
        await stream.sink.append(buffer);
        if (last === true) {
          const ref = await stream.sink.close();
          state.streams.delete(artifactId);
          state.closedArtifactIds.add(artifactId);
          return ref;
        }
        return null;
      });
    },

    async deleteEphemeral({ path, reason }) {
      const payload = copy({ path, reason });
      return attempt(async () => {
        need(state.manifest, "manifest required first");
        need(!state.finalized, "phase finalized");
        await appendRawEvent("artifact-deletion", payload);
        await store.deleteEphemeral(payload.path);
      });
    },

    async stopOrdinary() {
      return attempt(async () => {
        need(state.manifest, "manifest required first");
        need(!state.finalized, "phase finalized");
        state.stopped = true;
      });
    },

    async finalize({ intent, checks, prerequisites, expectedSelfTest }) {
      // Caller data is captured by canonical copy before the first await so
      // later mutation cannot alter the recorded outcome.
      const request = copy(intent);
      const claims = copy(checks ?? []);
      const parents = copy(prerequisites ?? []);
      const nested = copy(expectedSelfTest ?? null);
      return attempt(async () => {
        need(state.manifest && state.running !== null, "manifest+running required");
        need(!state.finalized && !state.finalizing, "finalize once");
        if (
          !["passed", "failed", "inconclusive", "abandoned"].includes(request.status) ||
          request.exitCode !== EXIT_CODES[request.status]
        ) {
          fail("RECORDER_INPUT", "intent status/exitCode");
        }
        // Finalizing is distinct from finalized: ordinary work stops now,
        // but trusted cleanup/fault/resource events remain writable until
        // the evidence sinks close, and a second finalizer is rejected.
        state.finalizing = true;
        state.stopped = true;

        let identityMismatch = false;
        let identityProven = false;
        try {
          const observed = await verifyIdentity({
            workspaceId: mf.workspaceId,
            runId: mf.runId,
            phase: mf.phase,
            expectedCommonIdentity: copy(ws.commonIdentity),
            inputs: copy(mf.inputs),
          });
          identityProven = deepEqual(observed, ws.commonIdentity);
          identityMismatch = !identityProven;
        } catch {
          identityProven = false;
        }

        const expectedFinalizer = selftest
          ? copy(mf.owner.supervisor)
          : copy(state.running.supervisor);
        const scope = selftest ? "selftest-workload" : "phase-workload";
        let proof = null;
        try {
          proof = await verifyCleanup({
            phase: mf.phase,
            runId: mf.runId,
            supervisor: copy(state.running.supervisor),
            claimedProof: { scope, expectedFinalizer: copy(expectedFinalizer) },
          });
        } catch {
          proof = null;
        }
        const proofStructOk = structurallyValidProof(
          proof,
          headFields(),
          mf.commonIdentitySha256,
        );
        const recordedProof = proofStructOk ? proof : UNPROVEN_PROOF(scope);
        const cleanupOk = proofStructOk && isCleanupProven(proof, scope, expectedFinalizer);

        for (const stream of state.streams.values()) await stream.sink.close();
        state.streams.clear();
        if (!state.lanePromoted && state.eventsSink) state.eventsSink.setLane("final");
        const eventsRef = await state.eventsSink.close();

        const refs = await phaseArtifactRefs({
          workspaceRoot: store.root,
          phaseDirectory: phaseDir,
        });
        const byPath = new Map(refs.map((r) => [r.path, r]));

        let requiredChecks;
        if (selftest) {
          if (claims.length !== 0) fail("RECORDER_CLAIM", "selftest claims");
          requiredChecks = deriveSelfTestChecks({ request, recordedProof, eventsRef });
        } else {
          requiredChecks = resolvePhaseChecks({
            claims,
            phase: mf.phase,
            refs: byPath,
            phaseDir,
            cleanupOk,
            eventsRef,
          });
        }

        const faults = Number.isSafeInteger(request.unplannedFaultCount)
          ? request.unplannedFaultCount
          : 1;
        const status = resolveStatus({
          request,
          identityProven,
          identityMismatch,
          cleanupOk,
          faults,
          requiredChecks,
        });
        const analysisEligible = resolveAnalysisEligible({
          request,
          status,
          cleanupOk,
          identityProven,
          faults,
        });

        const final = buildFinal({
          headFields: headFields(),
          commonIdentitySha256: mf.commonIdentitySha256,
          status,
          requiredChecks,
          faults,
          analysisEligible,
          cleanup: recordedProof,
          request,
        });
        await store.writeOnce(`${phaseDir}/final.json`, canonicalBytes(final), "final");

        const artifacts = await phaseArtifactRefs({
          workspaceRoot: store.root,
          phaseDirectory: phaseDir,
        });
        const completion = buildCompletion({
          headFields: headFields(),
          commonIdentitySha256: mf.commonIdentitySha256,
          status,
          prerequisites: parents,
          artifacts,
          expectedSelfTest: nested,
        });
        const ref = await store.writeOnce(
          `${phaseDir}/completion.json`,
          canonicalBytes(completion),
          "final",
        );
        await store.sealPhase(phaseDir);
        state.finalized = true;
        return ref;
      });
    },
  };

  return Object.freeze(api);
}
