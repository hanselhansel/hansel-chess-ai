// Private mandatory-verifier capture and immutable closed-facts owner
// for records.mjs. Holds the canonical workspace/manifest snapshots,
// invokes the two trusted verifier callbacks under the original
// optional bound, preregisters each actual callback settlement through
// the inherited registrar and freezes the captured facts for the later
// closed-evidence bundle. No Records, Store, IO, lifetime, clock owner,
// writer authority or status ladder lives here; records.mjs remains the
// sole writer, state owner and the only caller.

import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertCommonIdentity, assertRecord } from "./record-schema.mjs";
import { reportCleanupVerification } from "./watchdog-lifetime.mjs";
import {
  isCleanupProven,
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

// Freeze only copies this module produced, never caller objects. The
// copies are plain JSON, so enumerable own keys cover the whole graph,
// including an own "__proto__" data key the parser carries through.
const deepFreeze = (value) => {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

export function createEvidenceCapture({
  workspace,
  manifest,
  verifyIdentity,
  verifyCleanup,
  nowMonoMs,
  retainActual,
  diagnosticOwner,
}) {
  if (
    typeof verifyIdentity !== "function" ||
    typeof verifyCleanup !== "function" ||
    typeof retainActual !== "function"
  ) {
    fail("RECORDER_CONFIG", "mandatory native callbacks");
  }
  // Timed capture binds the real inherited clock; the explicit private
  // legacy mode is exactly null — never undefined, noop, Infinity or a
  // fabricated start.
  if (nowMonoMs !== null && typeof nowMonoMs !== "function") {
    fail("RECORDER_CONFIG", "nowMonoMs");
  }
  const ws = copy(workspace);
  const mf = copy(manifest);
  assertRecord("workspace", ws);
  assertRecord("manifest", mf);
  if (ws.workspaceId !== mf.workspaceId) fail("RECORDER_CONFIG", "workspaceId mismatch");
  if (sha256Bytes(canonicalBytes(ws.commonIdentity)) !== mf.commonIdentitySha256) {
    fail("RECORDER_CONFIG", "commonIdentitySha256 mismatch");
  }
  const timed = nowMonoMs !== null;
  const selftest = mf.phase === "watchdog-selftest";
  const phaseDirectory = selftest ? "preflight/selftest" : mf.phase;
  const headFields = {
    schemaVersion: 1,
    workspaceId: mf.workspaceId,
    runId: mf.runId,
    phase: mf.phase,
  };

  let captured = false;
  let finished = false;
  let facts = null;

  // Private raw first verifier rejection, held behind an explicit
  // presence flag so null/undefined/non-extensible values keep identity.
  // Separate from the neutral settlement receipt and the nine-fact
  // classification: never cleared, never promoted, never exposed.
  let verifierErrorPresent = false;
  let verifierError;

  const capture = async ({ running, request, claims, deadlineMonoMs }) => {
    if (captured) fail("RECORDER_STATE", "capture once");
    if (timed) {
      if (!Number.isSafeInteger(deadlineMonoMs) || deadlineMonoMs < 0) {
        fail("RECORDER_INPUT", "deadlineMonoMs");
      }
    } else if (deadlineMonoMs !== undefined) {
      fail("RECORDER_INPUT", "deadlineMonoMs");
    }
    captured = true;
    const runningSnapshot = copy(running);
    const requestSnapshot = copy(request);
    const claimsSnapshot = copy(claims);

    // The same bound gates every live verifier call: a missing, invalid
    // or spent original end starts nothing new, and only a result read
    // on time after actual settlement may promote a fact. A neutral
    // receipt is retained BEFORE invocation and fulfills only when that
    // real callback settles — a still-pending callback is awaited,
    // never raced away or granted new grace, and its error stays
    // unproven rather than promoted.
    const describe = (classification, cause, at) => reportCleanupVerification(
      diagnosticOwner, selftest ? "selftest" : "phase", classification, cause, at, deadlineMonoMs);
    const invokeVerifier = async (fn, arg, cleanupVerifier = false) => {
      let observedAt;
      if (timed) {
        const now = nowMonoMs();
        observedAt = now;
        if (!Number.isFinite(now) || now >= deadlineMonoMs) {
          if (cleanupVerifier) {
            describe("pre-bound-spent", undefined, now);
          }
          return { ok: false };
        }
      }
      let markSettled;
      const receipt = new Promise((resolve) => {
        markSettled = resolve;
      });
      retainActual(receipt);
      try {
        const value = timed ? await fn(arg, { deadlineMonoMs }) : await fn(arg);
        if (timed) {
          const after = nowMonoMs();
          observedAt = after;
          if (!Number.isFinite(after) || after >= deadlineMonoMs) {
            if (cleanupVerifier) {
              describe("post-bound-spent", undefined, after);
            }
            return { ok: false };
          }
        }
        return { ok: true, value, observedAt };
      } catch (error) {
        if (!verifierErrorPresent) {
          verifierErrorPresent = true;
          verifierError = error;
        }
        if (cleanupVerifier) {
          describe("callback-rejected", error, observedAt);
        }
        return { ok: false };
      } finally {
        markSettled();
      }
    };

    let identityProven = false;
    let identityMismatch = false;
    const identity = await invokeVerifier(verifyIdentity, {
      workspaceId: mf.workspaceId,
      runId: mf.runId,
      phase: mf.phase,
      expectedCommonIdentity: copy(ws.commonIdentity),
      inputs: copy(mf.inputs),
    });
    if (identity.ok) {
      // Only a genuine on-time unequal VALID observation is a mismatch;
      // a missing, malformed, late or rejected result stays unproven.
      try {
        const observed = copy(identity.value);
        assertCommonIdentity(observed);
        identityProven = deepEqual(observed, ws.commonIdentity);
        identityMismatch = !identityProven;
      } catch {
        identityProven = false;
      }
    }

    const expectedFinalizer = selftest
      ? copy(mf.owner.supervisor)
      : copy(runningSnapshot.supervisor);
    const scope = selftest ? "selftest-workload" : "phase-workload";
    const cleanup = await invokeVerifier(verifyCleanup, {
      phase: mf.phase,
      runId: mf.runId,
      supervisor: copy(runningSnapshot.supervisor),
      claimedProof: { scope, expectedFinalizer: copy(expectedFinalizer) },
    }, true);
    let proof = null;
    let proofCopied = false;
    if (cleanup.ok) {
      try {
        proof = copy(cleanup.value);
        proofCopied = true;
      } catch (error) {
        proof = null;
        describe("copy-invalid", error, cleanup.observedAt);
      }
    }
    const proofStructOk = structurallyValidProof(
      proof,
      headFields,
      mf.commonIdentitySha256,
    );
    if (cleanup.ok && proofCopied) {
      describe(proofStructOk ? "accepted" : "shape-invalid", undefined, cleanup.observedAt);
    }
    const recordedProof = proofStructOk ? proof : UNPROVEN_PROOF(scope);
    const cleanupOk =
      proofStructOk && isCleanupProven(proof, scope, expectedFinalizer);

    facts = {
      headFields,
      commonIdentitySha256: mf.commonIdentitySha256,
      request: requestSnapshot,
      claims: claimsSnapshot,
      phaseDirectory,
      recordedProof,
      identityProven,
      identityMismatch,
      cleanupOk,
    };
  };

  // Opaque internal ordering capability only: records.mjs calls it
  // solely after the v2 late fence, the other-body drain and every
  // actual evidence sink close have succeeded. It certifies that
  // internal order — never a physical close — and takes no caller
  // facts, proof booleans or closure callbacks.
  const finishClosedEvidence = () => {
    if (finished || facts === null) fail("RECORDER_STATE", "closed evidence");
    finished = true;
    facts = deepFreeze(copy(facts));
    return Object.freeze({});
  };

  // Fresh independently owned deep-frozen copies of the same captured
  // nine plain fields on every access — never a mutable callback
  // alias, Map, Buffer or capability, and never artifactRefs/eventsRef,
  // which only records.mjs obtains after actual closure.
  const finalInputs = () => {
    if (!finished) fail("RECORDER_STATE", "final inputs");
    return deepFreeze(copy(facts));
  };

  return Object.freeze({ capture, finishClosedEvidence, finalInputs });
}
