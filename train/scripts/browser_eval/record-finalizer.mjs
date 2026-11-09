// Private recorder finalization owner — a runtime split, never a new
// owner or public boundary. Holds the once-only runtime binding, the
// admitted evidence capture A, the ticketed settlement continuation B
// and the four methods the recorder delegates by identical function
// reference. The pure constructor only captures trusted same-instance
// references: all state, write authority, error channels and the seal
// outcome stay the recorder's.

import { canonicalBytes } from "./canonical-json.mjs";
import { phaseArtifactRefs } from "./artifact-store.mjs";
import { buildCompletion, buildFinalFromClosedFacts } from "./record-finalization.mjs";
import { createEvidenceCapture } from "./record-evidence.mjs";
import {
  captureFinalizationRequest,
  validateFinalizationIntent,
} from "./record-inputs.mjs";
import { createBookkeepingObserver } from "./record-bookkeeping.mjs";
import { readVerdictEventsV2 } from "./receipt-verification-v2.mjs";
import { verifyPreparedReceiptGraph, verifyReceiptGraph } from "./receipt-verification.mjs";

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

export function createRecorderFinalizer({
  store,
  workspace,
  manifest,
  phaseDirectory,
  state,
  lifecycle,
  closeWriters,
  appendRawEvent,
  headFields,
  verifyIdentity,
  verifyCleanup,
  owner,
  io,
}) {
  const ws = workspace;
  const mf = manifest;
  const phaseDir = phaseDirectory;
  const attempt = lifecycle.attempt;

  const need = (cond, detail) => {
    if (!cond) fail("RECORDER_STATE", detail);
  };

  // The valid binding tuple, the optional bookkeeping observer, the
  // private sealed A bundle and the cached seal promise stay
  // recorder-private — never caller facts or wire state.
  let bound = null;
  let observer = null;
  let pending = null;
  let sealPromise = null;
  // True only after the admitted A body actually fulfilled and its
  // lifecycle finally ran — a private settlement fact, never a caller
  // proof flag or a bounded race/promise snapshot.
  let captureSettled = false;

  // The ONE actual capture body A, admitted through a single lifecycle
  // attempt. Original state guards then intent validation run first;
  // finalizing/stopped latch synchronously BEFORE the first await or
  // effectful callback so a competing request cannot overwrite the
  // slots. The real evidence capture runs while the trusted POST_STOP
  // kinds stay admitted — the mandatory cleanup callback may itself
  // await a real cleanup append — then the late total fence, the
  // other-body drain and the Records-owned close-all. Only after every
  // actual close succeeds does finishClosedEvidence retain the private
  // sealed bundle; a failed A leaves no usable ticket, facts or
  // publication.
  const captureEvidenceA = async (bundle, deadlineMonoMs) => {
    await attempt(async (token) => {
      need(state.manifest && state.running !== null, "manifest+running required");
      need(!state.finalized && !state.finalizing, "finalize once");
      validateFinalizationIntent(bundle.request, mf);
      // Finalizing is distinct from finalized: ordinary work stops now,
      // but trusted cleanup/fault/resource events remain writable until
      // the evidence sinks close, and a second finalizer is rejected.
      state.finalizing = true;
      state.stopped = true;
      const capture = createEvidenceCapture({
        workspace: ws,
        manifest: mf,
        verifyIdentity,
        verifyCleanup,
        nowMonoMs: bound === null ? null : bound.nowMonoMs,
        retainActual: owner.retainActual,
        diagnosticOwner: owner,
      });
      try {
        await capture.capture({
          running: state.running,
          request: bundle.request,
          claims: bundle.claims,
          deadlineMonoMs,
        });
        const ticket = await lifecycle.fenceFinalEvidence(token);
        if (!state.lanePromoted && state.eventsSink !== null) {
          state.eventsSink.setLane("final");
          state.lanePromoted = true;
        }
        if (mf.schemaVersion === 2) {
          await appendRawEvent("resource", { kind: "final-resource-evidence",
            resourceEvidence: bundle.request.resourceEvidence });
        }
        await closeWriters();
        capture.finishClosedEvidence();
        pending = {
          capture,
          ticket,
          parents: bundle.parents,
          nested: bundle.nested,
          eventsRef: state.eventsRef,
        };
        if (observer !== null) observer.observeCaptureClosed();
      } catch (error) {
        // A failure after finalizing started permanently closes
        // admission, drains the other pre-fence bodies and attempts ALL
        // real closes; the original primary wins over any secondary
        // cleanup failure and a still-unknown close emits no report.
        try {
          await lifecycle.fenceFinalEvidence(token);
        } catch {
          // The total fence is already installed or cannot install.
        }
        let closed = false;
        try {
          if (!state.lanePromoted && state.eventsSink !== null) {
            state.eventsSink.setLane("final");
            state.lanePromoted = true;
          }
          await closeWriters();
          closed = true;
        } catch {
          // A secondary close failure never replaces the primary.
        }
        if (closed && observer !== null) {
          observer.notifySettled({ hasPrimary: true, primary: error });
        }
        throw error;
      }
    });
    // Settled only after the real admitted attempt fulfilled and the
    // raw lifecycle finally ran; a failed A never reaches this line.
    captureSettled = true;
  };

  // The settlement body B, admitted only through the single-use
  // ticketed continuation after A actually settled. The real retained
  // inventory, the pure closed-facts final, the final-lane write, a
  // fresh post-final inventory and the initially captured
  // parents/nested build the completion; the actual Store prepare, the
  // genuine prepared graph verification and the immutable publish
  // result are the only seal outcome — verified.final stays the sole
  // status feed with no postseal verification, retry or
  // reclassification.
  const sealBody = async (sealed) => {
    const artifactRefs = await phaseArtifactRefs(
      { workspaceRoot: store.root, phaseDirectory: phaseDir },
      io,
    );
    const v2 = {};
    if (mf.schemaVersion === 2) {
      v2.events = await readVerdictEventsV2({ workspaceRoot: store.root,
        eventsRef: sealed.eventsRef, headFields: headFields() }, io);
      v2.verifiedParents = [];
      for (const parent of sealed.parents) {
        v2.verifiedParents.push(await verifyReceiptGraph({ workspaceRoot: store.root,
          completionRef: parent.completion, expectedIdentity: ws.commonIdentity }, new Map(), io));
      }
    }
    const final = buildFinalFromClosedFacts({
      ...v2,
      ...sealed.capture.finalInputs(),
      artifactRefs,
      eventsRef: sealed.eventsRef,
    });
    await store.writeOnce(`${phaseDir}/final.json`, canonicalBytes(final), "final");
    const artifacts = await phaseArtifactRefs(
      { workspaceRoot: store.root, phaseDirectory: phaseDir },
      io,
    );
    const completion = buildCompletion({
      headFields: headFields(),
      commonIdentitySha256: mf.commonIdentitySha256,
      status: final.status,
      prerequisites: sealed.parents,
      artifacts,
      expectedSelfTest: sealed.nested,
      final,
    });
    const prepared = await store.prepareCompletion({
      phaseDirectory: phaseDir,
      bytes: canonicalBytes(completion),
    });
    let verification;
    try {
      verification = await verifyPreparedReceiptGraph({
        preparedCompletion: prepared,
        expectedIdentity: ws.commonIdentity,
      });
    } catch (error) {
      // Only the SAME genuine prepared capability is contained and the
      // original primary is preserved after its truthful safe
      // settlement; an unknown containment stays pending, never a
      // fake-cancelled report or an invented capability.
      await store.containPreparedCompletion(prepared, error);
      throw error;
    }
    const result = await store.publishPreparedCompletion(prepared, verification);
    state.finalized = true;
    state.sealedResult = result;
    return result;
  };

  const sealEvidenceB = (sealed) =>
    lifecycle.continueFinalEvidence(sealed.ticket, async () => {
      try {
        return await sealBody(sealed);
      } catch (error) {
        // Only a known failed B reports, and only with the exact
        // original primary; an unknown failure can neither report nor
        // return through a fake cancellation.
        if (observer !== null) {
          observer.notifySettled({ hasPrimary: true, primary: error });
        }
        throw error;
      }
    });

  return Object.freeze({
    // Binds the genuine inherited owner and the real same-origin clock
    // at most once BEFORE FIRST RECORDER USE. Pure validation plus the
    // optional observer construction only — no clock read, IO or
    // rebind; an invalid, late or repeated call is caller-correctable
    // and never replaces a prior valid binding.
    bindRuntime({ lifetime, nowMonoMs, onBookkeepingSettlement }) {
      if (bound !== null) fail("RECORDER_STATE", "runtime already bound");
      if (state.used) fail("RECORDER_STATE", "recorder already used");
      if (lifetime !== owner) fail("RECORDER_CONFIG", "lifetime");
      if (typeof nowMonoMs !== "function") fail("RECORDER_CONFIG", "nowMonoMs");
      if (
        onBookkeepingSettlement !== undefined &&
        typeof onBookkeepingSettlement !== "function"
      ) {
        fail("RECORDER_CONFIG", "onBookkeepingSettlement");
      }
      bound = Object.freeze({ nowMonoMs });
      if (onBookkeepingSettlement !== undefined) {
        observer = createBookkeepingObserver({
          runId: mf.runId,
          phase: mf.phase,
          nowMonoMs,
          onBookkeepingSettlement,
        });
      }
    },

    // Timed evidence capture: the same structured finalization request
    // as the legacy finalizer plus the ORIGINAL absolute monotonic-ms
    // end. Binding and the finite nonnegative safe-integer bound are
    // required before any effect; the pure request capture still runs
    // before the first await so later caller mutation cannot alter the
    // recorded outcome.
    async closeEvidenceBeforeCutoff({ intent, checks, prerequisites, expectedSelfTest }, options) {
      if (bound === null) fail("RECORDER_STATE", "runtime not bound");
      const deadlineMonoMs = options?.deadlineMonoMs;
      if (!Number.isSafeInteger(deadlineMonoMs) || deadlineMonoMs < 0) {
        fail("RECORDER_INPUT", "deadlineMonoMs");
      }
      const bundle = captureFinalizationRequest({
        intent,
        checks,
        prerequisites,
        expectedSelfTest,
      });
      await captureEvidenceA(bundle, deadlineMonoMs);
    },

    // Settlement half of the timed pair: no arguments, no replacement
    // intent. Binding, an actually settled capture, the once guard and
    // the sticky/state guards all validate BEFORE the ticket is
    // consumed or the seal promise is cached, so an early call can
    // never poison a later legal seal.
    async sealClosedEvidence() {
      if (bound === null) fail("RECORDER_STATE", "runtime not bound");
      if (sealPromise !== null) fail("RECORDER_STATE", "seal once");
      if (!captureSettled) fail("RECORDER_STATE", "capture not settled");
      if (pending === null) fail("RECORDER_STATE", "closed evidence required");
      if (state.finalizing !== true || state.finalized !== false) {
        fail("RECORDER_STATE", "finalizing required");
      }
      if (state.sticky !== null) fail("RECORDER_STICKY", state.sticky);
      const sealed = pending;
      sealPromise = sealEvidenceB(sealed);
      const result = await sealPromise;
      if (observer !== null) {
        observer.notifySettled({ hasPrimary: false, primary: null });
      }
      return result;
    },

    // The unbound legacy finalizer: the SAME private untimed A -> B
    // actual held pipeline, returning only the real completionRef. It
    // cannot establish operational timing, is never usable once bound
    // and is itself no lifecycle-admitted outer attempt.
    async finalize({ intent, checks, prerequisites, expectedSelfTest }) {
      if (bound !== null) fail("RECORDER_STATE", "runtime bound");
      const bundle = captureFinalizationRequest({
        intent,
        checks,
        prerequisites,
        expectedSelfTest,
      });
      await captureEvidenceA(bundle, undefined);
      const sealed = pending;
      sealPromise = sealEvidenceB(sealed);
      const result = await sealPromise;
      return result.completionRef;
    },
  });
}
