// Sole supervisor recorder/state machine for canonical phase records.
// Owns write order: workspace once, manifest before collector startup,
// actual running before driver startup, bounded ordinary output, durable
// deletion descriptions, mandatory cleanup/identity verification, final
// before completion, completion published atomically last through the
// Store's prepared transaction, then permanent seal. Delegates bytes,
// schema, artifact IO and pure finalization construction to the shared
// owners; this module remains the only writer.

import { canonicalBytes, parseCanonicalBytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createRecorderFinalizer } from "./record-finalizer.mjs";
import { createRecorderLifecycle } from "./record-lifecycle.mjs";
import {
  captureRecorderInputs,
  validateRunningInput,
} from "./record-inputs.mjs";

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

const POST_STOP_KINDS = new Set(["fault", "cleanup", "resource", "artifact-deletion"]);

// Before actual running exists, only observed supervisor bootstrap
// evidence is admissible: fault, resource and cleanup facts. Ordinary
// operation/delivery/response/artifact work has no phase to bind to.
const BOOTSTRAP_KINDS = new Set(["fault", "resource", "cleanup"]);

// Identity-keyed association from each constructor-produced recorder to
// its EXACT inherited store lifetime owner; WeakMap keys reject spread
// copies, lookalikes and proxies by construction.
const RECORDER_OWNERS = new WeakMap();

export async function writeWorkspaceOnce({ store, workspace }) {
  const snapshot = copy(workspace);
  assertRecord("workspace", snapshot);
  return store.writeOnce("workspace.json", canonicalBytes(snapshot), "ordinary");
}

// Returns the genuine lifetime owner the recorder inherited from its
// store at construction. The WeakMap key accepts only a real
// createPhaseRecorder result: spread copies, lookalikes and proxies
// carry no association.
export function phaseRecorderLifetime(recorder) {
  const owner = RECORDER_OWNERS.get(recorder);
  if (owner === undefined) fail("RECORDER_INPUT", "unknown recorder");
  return owner;
}

export function createPhaseRecorder({ store, workspace, manifest, verifyCleanup, verifyIdentity }) {
  const { workspace: ws, manifest: mf, phaseDirectory: phaseDir } =
    captureRecorderInputs({ workspace, manifest, verifyIdentity, verifyCleanup });
  // The genuine owner is inherited from the provided store — never a
  // new default — and ONE private frozen io reuses its registrar
  // unchanged for every Records-owned inventory read below.
  const owner = artifactStoreLifetime(store);
  const io = Object.freeze({ retainActual: owner.retainActual });

  const state = {
    used: false,
    manifest: false,
    running: null,
    stopped: false,
    finalizing: false,
    finalized: false,
    sticky: null,
    eventsRef: null,
    sealedResult: null,
    eventSeq: 0,
    eventsSink: null,
    lanePromoted: false,
    recordSeq: 0,
    recordIds: new Set(),
    streams: new Map(),
    closedArtifactIds: new Set(),
  };

  // Caller-correctable rejections never poison the recorder; only store,
  // schema, callback or IO failures latch the sticky state. The attempt
  // wrapper, admission fences and unfinished-evidence closure delegate to
  // the shared lifecycle owner; the trusted closures and the SAME
  // inherited registrar stay recorder-owned.
  const CORRECTABLE = new Set(["RECORDER_STATE", "RECORDER_INPUT", "RECORDER_CLAIM"]);
  // Close every real sink observed now — including one acquired by an
  // earlier pending open — even when an individual close rejects. A
  // fulfilled events close retains its actual ref for the finalizer;
  // the first arbitrary rejection propagates unchanged.
  const closeWriters = async () => {
    const sinks = [];
    if (state.eventsSink !== null) sinks.push(state.eventsSink);
    for (const stream of state.streams.values()) sinks.push(stream.sink);
    const outcomes = await Promise.allSettled(sinks.map((sink) => sink.close()));
    state.streams.clear();
    const eventsOutcome = state.eventsSink === null ? undefined : outcomes[0];
    if (eventsOutcome !== undefined && eventsOutcome.status === "fulfilled") {
      state.eventsRef = eventsOutcome.value;
    }
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    if (rejected) throw rejected.reason;
  };
  const lifecycle = createRecorderLifecycle({
    readState: () => {
      // Ordinary attempt entry marks use synchronously: an admitted
      // body ends the pre-use binding window before its own guards run.
      state.used = true;
      return {
        sticky: state.sticky,
        finalizing: state.finalizing,
        finalized: state.finalized,
      };
    },
    latchFailure: (error) => {
      // Arbitrary thrown values — null, undefined or a throwing code
      // accessor — still latch the sticky state instead of masking or
      // quietly clearing the first operation fault.
      if (state.sticky !== null) return;
      let code;
      try {
        code = error?.code;
      } catch {
        code = undefined;
      }
      if (CORRECTABLE.has(code)) return;
      try {
        state.sticky = code ?? String(error);
      } catch {
        state.sticky = "unprintable thrown value";
      }
    },
    closeAdmission: () => {
      state.used = true;
      state.stopped = true;
    },
    closeWriters,
    retainActual: owner.retainActual,
  });
  const attempt = lifecycle.attempt;

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

  // The private finalization owner is created once — after the real
  // lifecycle and head fields exist — with trusted same-instance
  // references only: the owned ws/mf snapshots, the original phaseDir,
  // the actual state/lifecycle/closeWriters/headFields, the mandatory
  // callbacks, the genuine inherited owner and the SAME frozen io. Its
  // four returned methods land on the api by identical reference below.
  const finalizer = createRecorderFinalizer({
    store,
    workspace: ws,
    manifest: mf,
    phaseDirectory: phaseDir,
    state,
    lifecycle,
    closeWriters,
    headFields,
    verifyIdentity,
    verifyCleanup,
    owner,
    io,
  });

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
        validateRunningInput(record, {
          workspaceId: mf.workspaceId,
          runId: mf.runId,
          phase: mf.phase,
          commonIdentitySha256: mf.commonIdentitySha256,
        });
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

    // Private unfinished-evidence drain: fences all later admission,
    // waits every admitted attempt body, then closes the real sinks.
    // Direct delegation — the SAME cached closure promise, never a fresh
    // async wrapper. Never admitted through `attempt` and never a
    // finalized receipt.
    closeIncompleteEvidence: lifecycle.closeIncompleteEvidence,

    // Runtime binding, the timed capture/seal pair and the unbound
    // legacy finalizer are owned by the private recorder finalizer —
    // these are its IDENTICAL returned function references, never
    // wrappers, aliases or rebound copies.
    bindRuntime: finalizer.bindRuntime,
    closeEvidenceBeforeCutoff: finalizer.closeEvidenceBeforeCutoff,
    sealClosedEvidence: finalizer.sealClosedEvidence,
    finalize: finalizer.finalize,
  };

  RECORDER_OWNERS.set(api, owner);
  return Object.freeze(api);
}
