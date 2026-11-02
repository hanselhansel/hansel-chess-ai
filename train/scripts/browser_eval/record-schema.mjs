// Single closed-envelope schema and constant owner for all harness records,
// prerequisites and supervisor-protocol consumers. Validation binds structure
// and identity only; it is never evidence that packages or tools were
// inspected. Errors carry stable bounded .code values; nothing returns a
// success-shaped failure.
//
// Internal delegation only: primitives live in schema-primitives.mjs, frozen
// declarations in schema-constants.mjs, and the environment/CommonIdentity
// chain in identity-schema.mjs. This module remains the public owner through
// named re-exports.

import {
  arr,
  assertArtifactRef,
  assertProcessIdentity,
  CHECK,
  deepEqual,
  eqLiteral,
  exactOnly,
  oneOf,
  schemaFail,
  shape,
  sortedRefs,
} from "./schema-primitives.mjs";
import {
  EVENT_KINDS,
  FIXED_LIMITS,
  PHASES,
  RECORDED_PHASES,
  REQUIRED_CHECK_IDS,
  REQUIRED_PARENT_PHASES,
} from "./schema-constants.mjs";
export {
  BASELINE_COMMIT,
  FIXED_LIMITS,
  MODEL_IDENTITY,
  PROTOCOL_IDS,
  REQUIRED_CHECK_IDS,
  REQUIRED_PARENT_PHASES,
} from "./schema-constants.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
export { assertArtifactRef, assertProcessIdentity } from "./schema-primitives.mjs";
export { assertBackendIdentity, assertCommonIdentity } from "./identity-schema.mjs";

const head = (v, n) => {
  if (v.schemaVersion !== 1) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
  if (!CHECK.strNE(v.workspaceId)) schemaFail("SCHEMA_FORMAT", `${n}.workspaceId`);
  if (!CHECK.strNE(v.runId)) schemaFail("SCHEMA_FORMAT", `${n}.runId`);
  oneOf(v.phase, RECORDED_PHASES, `${n}.phase`);
  if (!CHECK.hash(v.commonIdentitySha256)) {
    schemaFail("SCHEMA_FORMAT", `${n}.commonIdentitySha256`);
  }
};

const outcome = (v, n) => {
  oneOf(v.status, ["passed", "failed", "inconclusive", "abandoned"], `${n}.status`);
  const expected = { passed: 0, failed: 1, inconclusive: 2, abandoned: 2 };
  if (v.exitCode !== expected[v.status]) schemaFail("SCHEMA_COHERENCE", `${n}.exitCode`);
};

const vCheckSet = (v, n) => {
  const checks = arr(v.requiredChecks, `${n}.requiredChecks`);
  checks.forEach((c, i) => {
    shape(c, { id: "strNE", status: "strNE", evidence: "list" }, `${n}.requiredChecks[${i}]`);
    oneOf(c.status, ["passed", "failed"], `${n}.requiredChecks[${i}].status`);
    arr(c.evidence, `${n}.requiredChecks[${i}].evidence`).forEach((r) => assertArtifactRef(r));
  });
  const expected = REQUIRED_CHECK_IDS[v.phase];
  const ids = checks.map((c) => c.id);
  if (ids.length !== expected.length || new Set(ids).size !== ids.length) {
    schemaFail("SCHEMA_LITERAL", `${n}.requiredChecks`);
  }
  const sortedExpected = [...expected].sort();
  if (![...ids].sort().every((id, i) => id === sortedExpected[i])) {
    schemaFail("SCHEMA_LITERAL", `${n}.requiredChecks set`);
  }
};

const vCleanup = (v, n) => {
  shape(
    v,
    {
      scope: "strNE",
      expectedFinalizer: "nullObj",
      verified: "bool",
      survivorIdentities: "list",
      listenersRemaining: "list",
      accountingValid: "bool",
    },
    n,
  );
  if (v.expectedFinalizer !== null) assertProcessIdentity(v.expectedFinalizer);
  arr(v.survivorIdentities, `${n}.survivorIdentities`).forEach((s) => assertProcessIdentity(s));
  arr(v.listenersRemaining, `${n}.listenersRemaining`).forEach((l, i) => {
    const ln = `${n}.listenersRemaining[${i}]`;
    if (!CHECK.obj(l)) schemaFail("SCHEMA_TYPE", ln);
    const allowed = ["address", "port", "pid"];
    for (const f of allowed) {
      if (!(f in l) || l[f] === undefined) schemaFail("SCHEMA_MISSING", `${ln}.${f}`);
    }
    for (const k of Object.keys(l)) {
      if (!allowed.includes(k)) schemaFail("SCHEMA_EXTRA", `${ln}.${k}`);
    }
    if (!CHECK.strNE(l.address)) schemaFail("SCHEMA_FORMAT", `${ln}.address`);
    if (!CHECK.port(l.port)) schemaFail("SCHEMA_FORMAT", `${ln}.port`);
    if (l.pid !== null && !CHECK.pid(l.pid)) schemaFail("SCHEMA_FORMAT", `${ln}.pid`);
  });
  oneOf(v.scope, ["phase-workload", "selftest-workload"], `${n}.scope`);
};

const vPrereq = (v, n) => {
  shape(v, { phase: "strNE", runId: "strNE", completion: "obj" }, n);
  oneOf(v.phase, PHASES, `${n}.phase`);
  assertArtifactRef(v.completion);
};

const vInputs = (v, n) => {
  shape(v, { baseline: "obj", candidate: "obj", harness: "obj", model: "obj", setup: "list" }, n);
  for (const role of ["baseline", "candidate", "harness"]) {
    shape(v[role], { root: "strNE", files: "list" }, `${n}.${role}`);
    const root = `inputs/${role}`;
    if (v[role].root !== root) schemaFail("SCHEMA_LITERAL", `${n}.${role}.root`);
    sortedRefs(v[role].files, `${n}.${role}.files`);
    for (const f of v[role].files) {
      if (!f.path.startsWith(`${root}/`)) schemaFail("SCHEMA_LITERAL", `${n}.${role}.files`);
    }
  }
  shape(v.model, { path: "relPath", byteLength: "nat", sha256: "hash" }, `${n}.model`);
  if (v.model.path !== "inputs/model/tinyaz-m.bin") schemaFail("SCHEMA_LITERAL", `${n}.model`);
  sortedRefs(v.setup, `${n}.setup`);
  for (const f of v.setup) {
    if (!f.path.startsWith("inputs/setup/")) schemaFail("SCHEMA_LITERAL", `${n}.setup`);
  }
};

const RECORD_FIELDS = {
  workspace: ["schemaVersion", "workspaceId", "commonIdentity"],
  manifest: [
    "schemaVersion",
    "workspaceId",
    "runId",
    "phase",
    "commonIdentitySha256",
    "inputs",
    "limits",
    "requiredCheckIds",
    "prerequisites",
    "owner",
  ],
  running: [
    "schemaVersion",
    "workspaceId",
    "runId",
    "phase",
    "commonIdentitySha256",
    "supervisor",
    "startedAtUtc",
  ],
  event: ["schemaVersion", "workspaceId", "runId", "phase", "seq", "kind", "payload"],
  final: [
    "schemaVersion",
    "workspaceId",
    "runId",
    "phase",
    "commonIdentitySha256",
    "status",
    "exitCode",
    "stopReason",
    "requiredChecks",
    "unplannedFaultCount",
    "analysisEligible",
    "cleanup",
    "summary",
  ],
  completion: [
    "schemaVersion",
    "kind",
    "workspaceId",
    "runId",
    "phase",
    "commonIdentitySha256",
    "status",
    "exitCode",
    "prerequisites",
    "artifacts",
    "expectedSelfTest",
  ],
};

const VALIDATORS = {
  workspace(v, n) {
    exactOnly(v, RECORD_FIELDS.workspace, n);
    if (v.schemaVersion !== 1) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
    if (!CHECK.strNE(v.workspaceId)) schemaFail("SCHEMA_FORMAT", `${n}.workspaceId`);
    assertCommonIdentity(v.commonIdentity);
  },

  manifest(v, n) {
    exactOnly(v, RECORD_FIELDS.manifest, n);
    head(v, n);
    vInputs(v.inputs, `${n}.inputs`);
    eqLiteral(v.limits, FIXED_LIMITS, `${n}.limits`);
    eqLiteral(v.requiredCheckIds, [...REQUIRED_CHECK_IDS[v.phase]], `${n}.requiredCheckIds`);
    arr(v.prerequisites, `${n}.prerequisites`).forEach((p, i) =>
      vPrereq(p, `${n}.prerequisites[${i}]`),
    );
    if (!deepEqual(v.prerequisites.map((p) => p.phase), REQUIRED_PARENT_PHASES[v.phase])) {
      schemaFail("SCHEMA_LITERAL", `${n}.prerequisites`);
    }
    if (v.owner === null) {
      if (v.phase === "watchdog-selftest") schemaFail("SCHEMA_COHERENCE", `${n}.owner`);
    } else {
      if (v.phase !== "watchdog-selftest") schemaFail("SCHEMA_COHERENCE", `${n}.owner`);
      shape(v.owner, { phase: "strNE", runId: "strNE", supervisor: "obj" }, `${n}.owner`);
      if (v.owner.phase !== "preflight") schemaFail("SCHEMA_LITERAL", `${n}.owner.phase`);
      assertProcessIdentity(v.owner.supervisor);
    }
  },

  running(v, n) {
    exactOnly(v, RECORD_FIELDS.running, n);
    head(v, n);
    assertProcessIdentity(v.supervisor);
    if (!CHECK.utc(v.startedAtUtc)) schemaFail("SCHEMA_FORMAT", `${n}.startedAtUtc`);
  },

  event(v, n) {
    exactOnly(v, RECORD_FIELDS.event, n);
    if (v.schemaVersion !== 1) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
    if (!CHECK.strNE(v.workspaceId) || !CHECK.strNE(v.runId)) schemaFail("SCHEMA_FORMAT", n);
    oneOf(v.phase, RECORDED_PHASES, `${n}.phase`);
    if (!CHECK.nat(v.seq)) schemaFail("SCHEMA_FORMAT", `${n}.seq`);
    oneOf(v.kind, EVENT_KINDS, `${n}.kind`);
    if (!CHECK.obj(v.payload)) schemaFail("SCHEMA_TYPE", `${n}.payload`);
  },

  final(v, n) {
    exactOnly(v, RECORD_FIELDS.final, n);
    head(v, n);
    outcome(v, n);
    if (v.stopReason !== null && typeof v.stopReason !== "string") {
      schemaFail("SCHEMA_FORMAT", `${n}.stopReason`);
    }
    vCheckSet(v, n);
    if (!CHECK.nat(v.unplannedFaultCount)) {
      schemaFail("SCHEMA_FORMAT", `${n}.unplannedFaultCount`);
    }
    if (typeof v.analysisEligible !== "boolean") {
      schemaFail("SCHEMA_FORMAT", `${n}.analysisEligible`);
    }
    vCleanup(v.cleanup, `${n}.cleanup`);
    const scope = v.phase === "watchdog-selftest" ? "selftest-workload" : "phase-workload";
    if (v.cleanup.scope !== scope) schemaFail("SCHEMA_LITERAL", `${n}.cleanup.scope`);
    if (!CHECK.obj(v.summary)) schemaFail("SCHEMA_TYPE", `${n}.summary`);
    if (
      v.status === "passed" &&
      (v.unplannedFaultCount !== 0 ||
        !v.requiredChecks.every((c) => c.status === "passed") ||
        v.cleanup.verified !== true ||
        v.cleanup.accountingValid !== true ||
        v.cleanup.survivorIdentities.length !== 0 ||
        v.cleanup.listenersRemaining.length !== 0 ||
        v.cleanup.expectedFinalizer === null)
    ) {
      schemaFail("SCHEMA_COHERENCE", `${n}.passed coherence`);
    }
  },

  completion(v, n) {
    exactOnly(v, RECORD_FIELDS.completion, n);
    if (v.kind !== "tinyaz-phase-completion") schemaFail("SCHEMA_LITERAL", `${n}.kind`);
    head(v, n);
    outcome(v, n);
    arr(v.prerequisites, `${n}.prerequisites`).forEach((p, i) =>
      vPrereq(p, `${n}.prerequisites[${i}]`),
    );
    if (!deepEqual(v.prerequisites.map((p) => p.phase), REQUIRED_PARENT_PHASES[v.phase])) {
      schemaFail("SCHEMA_LITERAL", `${n}.prerequisites`);
    }
    sortedRefs(v.artifacts, `${n}.artifacts`);
    if (v.expectedSelfTest === null) {
      if (v.phase === "preflight") schemaFail("SCHEMA_COHERENCE", `${n}.expectedSelfTest`);
    } else {
      if (v.phase !== "preflight") schemaFail("SCHEMA_COHERENCE", `${n}.expectedSelfTest`);
      shape(
        v.expectedSelfTest,
        { completion: "obj", expectedStopReason: "strNE" },
        `${n}.expectedSelfTest`,
      );
      assertArtifactRef(v.expectedSelfTest.completion);
      if (v.expectedSelfTest.expectedStopReason !== "HEARTBEAT_TIMEOUT") {
        schemaFail("SCHEMA_LITERAL", `${n}.expectedSelfTest.expectedStopReason`);
      }
    }
  },
};

export function assertRecord(kind, value) {
  const validator = VALIDATORS[kind];
  if (!validator) schemaFail("SCHEMA_LITERAL", `unknown record kind ${kind}`);
  validator(value, kind);
}
