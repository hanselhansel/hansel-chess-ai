// Pure canonical input capture and validation leaf for records.mjs.
// This module owns only the caller-input boundary: canonical copies of
// constructor and finalize arguments plus the synchronous guards that
// records.mjs used to run inline. No IO, callback invocation, mutable
// state, status authority or lifetime control lives here. records.mjs
// remains the sole writer and state owner and calls these helpers at
// the same points the inline guards occupied.

import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { EXIT_CODES } from "./record-finalization.mjs";

const fail = (code, detail) => {
  const error = new Error(`records ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const copy = (value) => parseCanonicalBytes(canonicalBytes(value));

// Freeze only the copies this module made, never caller objects. The
// copies are plain JSON, so enumerable own keys cover the whole graph,
// including an own "__proto__" data key the parser carries through.
const deepFreeze = (value) => {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

// Input boundary of createPhaseRecorder. The mandatory native callbacks
// are type-checked first exactly as before, but validation is all that
// happens here: they are never copied, invoked or returned. The returned
// workspace and manifest are independently owned canonical copies.
export function captureRecorderInputs({ workspace, manifest, verifyIdentity, verifyCleanup }) {
  if (typeof verifyCleanup !== "function" || typeof verifyIdentity !== "function") {
    fail("RECORDER_CONFIG", "mandatory native callbacks");
  }
  const ws = copy(workspace);
  const mf = copy(manifest);
  // Staging fence: schema2 construction is pure until full Task8 wiring.
  if (ws.schemaVersion !== 1 || mf.schemaVersion !== 1) {
    fail("RECORDER_CONFIG", "v2 recorder integration unavailable");
  }
  assertRecord("workspace", ws);
  assertRecord("manifest", mf);
  if (ws.workspaceId !== mf.workspaceId) fail("RECORDER_CONFIG", "workspaceId mismatch");
  if (sha256Bytes(canonicalBytes(ws.commonIdentity)) !== mf.commonIdentitySha256) {
    fail("RECORDER_CONFIG", "commonIdentitySha256 mismatch");
  }
  const phaseDirectory = mf.phase === "watchdog-selftest" ? "preflight/selftest" : mf.phase;
  return deepFreeze({ workspace: ws, manifest: mf, phaseDirectory });
}

// finalize() used to canonical-copy caller data before its first await
// so later mutation could not alter the recorded outcome. This is that
// same capture with the same []/[]/null defaults, hoisted so the caller
// can freeze and reuse the bundle.
export function captureFinalizationRequest({ intent, checks, prerequisites, expectedSelfTest }) {
  const request = copy(intent);
  const claims = copy(checks ?? []);
  const parents = copy(prerequisites ?? []);
  const nested = copy(expectedSelfTest ?? null);
  return deepFreeze({ request, claims, parents, nested });
}

// Intent status must name one declared outcome and carry the matching
// canonical exit code. records.mjs runs this inside its attempt after
// the manifest/running/once state guards; no status is accepted or
// rejected here outside that order.
export function validateFinalizationIntent(request) {
  if (
    !["passed", "failed", "inconclusive", "abandoned"].includes(request.status) ||
    request.exitCode !== EXIT_CODES[request.status]
  ) {
    fail("RECORDER_INPUT", "intent status/exitCode");
  }
}

// The running record must repeat the identity fields the manifest
// declared. records.mjs still copies the caller snapshot before its
// attempt and calls this inside it, after the manifest/running/phase
// state guards and before the write. Schema validation and the four
// equalities moved here unchanged.
export function validateRunningInput(
  runningSnapshot,
  { workspaceId, runId, phase, commonIdentitySha256 },
) {
  if (runningSnapshot?.schemaVersion !== 1) {
    fail("RECORDER_CONFIG", "v1 recorder requires v1 running");
  }
  assertRecord("running", runningSnapshot);
  if (
    runningSnapshot.workspaceId !== workspaceId ||
    runningSnapshot.runId !== runId ||
    runningSnapshot.phase !== phase ||
    runningSnapshot.commonIdentitySha256 !== commonIdentitySha256
  ) {
    fail("RECORDER_CONFIG", "running does not match manifest");
  }
}
