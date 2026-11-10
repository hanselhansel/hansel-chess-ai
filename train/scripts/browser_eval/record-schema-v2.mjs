// Closed prospective schema2. Pure structural validation is not publication.
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
import { assertCommonIdentity } from "./identity-schema.mjs";
import { RECORD_FIELDS } from "./record-fields.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { assertVerdicts } from "./verdicts-v2.mjs";
import { assertResourceEvidence, assertQualityCheckpoint } from "./resource-quality.mjs";

const additions = ["evaluationPolicy", "strengthVerdict", "resourceVerdict", "closureResourceVerdict"];
const FIELDS = {
  ...RECORD_FIELDS,
  manifest: [...RECORD_FIELDS.manifest, "evaluationPolicy"],
  final: [...RECORD_FIELDS.final, ...additions, "resourceEvidence"],
  completion: [...RECORD_FIELDS.completion, ...additions],
};
const verdictFields = (v) => {
  eqLiteral(v.evaluationPolicy, V2_POLICY, "record policy");
  assertVerdicts(
    Object.fromEntries(
      ["strengthVerdict", "resourceVerdict", "closureResourceVerdict", "status", "exitCode"].map((k) => [k, v[k]]),
    ),
  );
  const expected = v.phase === "watchdog-selftest" ? "selftest-prefix" : "phase";
  if (
    v.resourceVerdict.scope !== expected ||
    (v.phase === "compare") === (v.strengthVerdict.status === "not-applicable")
  ) {
    schemaFail("SCHEMA_COHERENCE", "phase verdict binding");
  }
  eqLiteral(v.resourceVerdict.phaseRunIds, [v.runId], "local run binding");
};
const resourcePayload = (p) => {
  if (p.kind === "final-resource-evidence") {
    exactOnly(p, ["kind", "resourceEvidence"], "final resource event");
    assertResourceEvidence(p.resourceEvidence);
    return;
  }
  exactOnly(
    p,
    [
      "rssBytes",
      "peakRssBytes",
      "observedPeakRssBytes",
      "rssLimitExceeded",
      "accountingValid",
      "atMonoNs",
      "qualityCheckpoint",
    ],
    "resource event",
  );
  for (const k of ["rssBytes", "peakRssBytes", "observedPeakRssBytes"]) {
    if (p[k] !== null && !CHECK.nat(p[k])) schemaFail("SCHEMA_FORMAT", k);
  }
  if (
    !CHECK.bool(p.rssLimitExceeded) ||
    !CHECK.bool(p.accountingValid) ||
    typeof p.atMonoNs !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(p.atMonoNs)
  )
    schemaFail("SCHEMA_FORMAT", "resource event facts");
  assertQualityCheckpoint(p.qualityCheckpoint);
  if (
    p.atMonoNs !== p.qualityCheckpoint.lastCompleteNs ||
    p.peakRssBytes > p.observedPeakRssBytes ||
    p.rssLimitExceeded !== p.observedPeakRssBytes > 4294967296
  )
    schemaFail("SCHEMA_COHERENCE", "resource event facts");
};

const head = (v, n) => {
  if (v.schemaVersion !== 2) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
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

export const assertCleanupProofV2 = (v, n = "cleanup") => {
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

const VALIDATORS = {
  workspace(v, n) {
    exactOnly(v, FIELDS.workspace, n);
    if (v.schemaVersion !== 2) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
    if (!CHECK.strNE(v.workspaceId)) schemaFail("SCHEMA_FORMAT", `${n}.workspaceId`);
    if (!Object.hasOwn(v.commonIdentity ?? {}, "evaluationPolicy")) schemaFail("SCHEMA_LITERAL", "v2 policy required");
    assertCommonIdentity(v.commonIdentity);
  },

  manifest(v, n) {
    exactOnly(v, FIELDS.manifest, n);
    head(v, n);
    eqLiteral(v.evaluationPolicy, V2_POLICY, "manifest policy");
    vInputs(v.inputs, `${n}.inputs`);
    eqLiteral(v.limits, FIXED_LIMITS, `${n}.limits`);
    eqLiteral(v.requiredCheckIds, [...REQUIRED_CHECK_IDS[v.phase]], `${n}.requiredCheckIds`);
    arr(v.prerequisites, `${n}.prerequisites`).forEach((p, i) => vPrereq(p, `${n}.prerequisites[${i}]`));
    if (
      !deepEqual(
        v.prerequisites.map((p) => p.phase),
        REQUIRED_PARENT_PHASES[v.phase],
      )
    ) {
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
    exactOnly(v, FIELDS.running, n);
    head(v, n);
    assertProcessIdentity(v.supervisor);
    if (!CHECK.utc(v.startedAtUtc)) schemaFail("SCHEMA_FORMAT", `${n}.startedAtUtc`);
  },

  event(v, n) {
    exactOnly(v, FIELDS.event, n);
    if (v.schemaVersion !== 2) schemaFail("SCHEMA_LITERAL", `${n}.schemaVersion`);
    if (!CHECK.strNE(v.workspaceId) || !CHECK.strNE(v.runId)) schemaFail("SCHEMA_FORMAT", n);
    oneOf(v.phase, RECORDED_PHASES, `${n}.phase`);
    if (!CHECK.nat(v.seq)) schemaFail("SCHEMA_FORMAT", `${n}.seq`);
    oneOf(v.kind, EVENT_KINDS, `${n}.kind`);
    if (!CHECK.obj(v.payload)) schemaFail("SCHEMA_TYPE", `${n}.payload`);
    if (v.kind === "resource") resourcePayload(v.payload);
  },

  final(v, n) {
    exactOnly(v, FIELDS.final, n);
    head(v, n);
    outcome(v, n);
    verdictFields(v);
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
    assertCleanupProofV2(v.cleanup, `${n}.cleanup`);
    const scope = v.phase === "watchdog-selftest" ? "selftest-workload" : "phase-workload";
    if (v.cleanup.scope !== scope) schemaFail("SCHEMA_LITERAL", `${n}.cleanup.scope`);
    if (!CHECK.obj(v.summary)) schemaFail("SCHEMA_TYPE", `${n}.summary`);
    assertResourceEvidence(v.resourceEvidence);
    if (v.resourceEvidence.runId !== v.runId || v.resourceEvidence.phase !== v.phase)
      schemaFail("SCHEMA_COHERENCE", "resource evidence binding");
    if (v.analysisEligible !== v.strengthVerdict.analysisEligible)
      schemaFail("SCHEMA_COHERENCE", "analysis eligibility");
    if (
      !v.analysisEligible &&
      ["pValue", "interval95", "conditionalEstimate", "classification"].some((k) => v.summary[k] != null)
    )
      schemaFail("SCHEMA_COHERENCE", "unadmitted inference");
    if (v.summary.pairedAnalysis?.analysisEligible === true && !v.analysisEligible)
      schemaFail("SCHEMA_COHERENCE", "unadmitted paired analysis");
    if (
      (v.status === "passed" || v.strengthVerdict.status === "eligible") &&
      ((v.strengthVerdict.status === "eligible" && v.stopReason !== null) ||
        v.unplannedFaultCount !== 0 ||
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
    exactOnly(v, FIELDS.completion, n);
    if (v.kind !== "tinyaz-phase-completion") schemaFail("SCHEMA_LITERAL", `${n}.kind`);
    head(v, n);
    outcome(v, n);
    verdictFields(v);
    arr(v.prerequisites, `${n}.prerequisites`).forEach((p, i) => vPrereq(p, `${n}.prerequisites[${i}]`));
    if (
      !deepEqual(
        v.prerequisites.map((p) => p.phase),
        REQUIRED_PARENT_PHASES[v.phase],
      )
    ) {
      schemaFail("SCHEMA_LITERAL", `${n}.prerequisites`);
    }
    sortedRefs(v.artifacts, `${n}.artifacts`);
    if (v.expectedSelfTest === null) {
      if (v.phase === "preflight") schemaFail("SCHEMA_COHERENCE", `${n}.expectedSelfTest`);
    } else {
      if (v.phase !== "preflight") schemaFail("SCHEMA_COHERENCE", `${n}.expectedSelfTest`);
      shape(v.expectedSelfTest, { completion: "obj", expectedStopReason: "strNE" }, `${n}.expectedSelfTest`);
      assertArtifactRef(v.expectedSelfTest.completion);
      if (v.expectedSelfTest.expectedStopReason !== "HEARTBEAT_TIMEOUT") {
        schemaFail("SCHEMA_LITERAL", `${n}.expectedSelfTest.expectedStopReason`);
      }
    }
  },
};

export function assertRecordV2(kind, value) {
  const validator = VALIDATORS[kind];
  if (!validator) schemaFail("SCHEMA_LITERAL", `unknown record kind ${kind}`);
  validator(value, kind);
}
