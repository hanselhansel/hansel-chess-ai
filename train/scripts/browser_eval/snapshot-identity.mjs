// Pure immutable-input identity assembly. Original paths feed inventories;
// model bytes are checked as data only, with no decoder or inference.
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
import { assertArtifactRef, freezeDeep } from "./schema-primitives.mjs";
import { BASELINE_COMMIT, FIXTURE_PATHS, MODEL_IDENTITY, PROTOCOL_IDS } from "./schema-constants.mjs";

const fail = (detail) => {
  const error = new Error(`SNAPSHOT_UNAVAILABLE ${detail}`);
  error.code = "SNAPSHOT_UNAVAILABLE";
  return error;
};
const sorted = (refs) => refs.map((ref) => {
  assertArtifactRef(ref);
  return { path: ref.path, byteLength: ref.byteLength, sha256: ref.sha256 };
}).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function validateModelBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== MODEL_IDENTITY.byteLength) {
    throw fail("model length");
  }
  if (bytes.toString("ascii", 0, 4) !== MODEL_IDENTITY.format ||
    bytes.readUInt32LE(4) !== MODEL_IDENTITY.packedVersion ||
    bytes.readUInt32LE(8) !== MODEL_IDENTITY.parameterCount ||
    bytes.readUInt32LE(12) !== MODEL_IDENTITY.source ||
    bytes.length !== 16 + MODEL_IDENTITY.parameterCount * 4) {
    throw fail("model header");
  }
  for (let offset = 16; offset < bytes.length; offset += 4) {
    if (!Number.isFinite(bytes.readFloatLE(offset))) {
      throw fail("model nonfinite");
    }
  }
  if (sha256Bytes(bytes) !== MODEL_IDENTITY.sha256) {
    throw fail("model digest");
  }
  return MODEL_IDENTITY;
}

export function inventoryDigest(refs) {
  const files = sorted(refs);
  if (files.some((ref, i) => i > 0 && files[i - 1].path === ref.path)) {
    throw fail("duplicate inventory path");
  }
  return sha256Bytes(canonicalBytes(files));
}

export function assembleSnapshotIdentity({
  candidate, baselineFiles, candidateFiles, harnessFiles, pythonFiles, environment,
}) {
  const harness = sorted(harnessFiles);
  const fixtures = Object.fromEntries(Object.entries(FIXTURE_PATHS).map(([name, filename]) => {
    const ref = harness.find((f) => f.path === filename);
    if (ref === undefined) {
      throw fail("missing fixture input");
    }
    return [name, ref];
  }));
  const identity = {
    candidate: { kind: candidate.kind, commit: candidate.commit, contentSha256: inventoryDigest(candidateFiles) },
    baseline: { commit: BASELINE_COMMIT, contentSha256: inventoryDigest(baselineFiles) },
    harness: { contentSha256: inventoryDigest(harness), files: harness },
    pythonReference: { contentSha256: inventoryDigest(pythonFiles), files: sorted(pythonFiles) },
    fixtures,
    model: { ...MODEL_IDENTITY },
    baselineNormalization: {
      requestPath: "/weights/tinyaz-s.bin", responseSha256: MODEL_IDENTITY.sha256,
      provenance: "controlled-delivery-plus-ready",
    },
    conventions: structuredClone(PROTOCOL_IDS),
    environment: structuredClone(environment),
  };
  assertCommonIdentity(identity);
  return freezeDeep(identity);
}
