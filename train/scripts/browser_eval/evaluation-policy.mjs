// Pure prospective selection. Inventory membership never selects a policy.
import { FIXED_LIMITS, PROTOCOL_IDS, REQUIRED_CHECK_IDS } from "./schema-constants.mjs";
import { eqLiteral, freezeDeep, schemaFail, shape } from "./schema-primitives.mjs";

export const V2_POLICY = freezeDeep({
  policyId: "tinyaz-separate-verdicts-v2",
  recordSchemaVersion: 2,
  softPhase: "compare",
});
export const V3_POLICY = freezeDeep({
  policyId: "tinyaz-separate-verdicts-v3",
  recordSchemaVersion: 2,
  softPhases: ["preflight", "compare"],
});
const V3_PATH = "train/fixtures/browser-protocol-v3.json";
const V1_PATH = "train/fixtures/browser-protocol.json";
const V2_PATH = "train/fixtures/browser-protocol-v2.json";

export function assertPolicyBinding({ schemaVersion, evaluationPolicy, protocolPath }) {
  if (schemaVersion === 1 && evaluationPolicy === null && protocolPath === V1_PATH) return;
  if (schemaVersion !== 2 || evaluationPolicy === null || protocolPath !== protocolPathForPolicy(evaluationPolicy)) {
    schemaFail("SCHEMA_LITERAL", "policy/version/protocol binding");
  }
}

// Receives the validated fixture declaration and its explicitly selected path.
export function policyForProtocol(protocol, protocolPath = V1_PATH) {
  shape(
    protocol,
    {
      schemaVersion: "nat",
      conventions: "obj",
      limits: "obj",
      requiredCheckIds: "obj",
      preflight: "obj",
      comparison: "obj",
      ...(protocol?.schemaVersion === 2 ? { evaluationPolicy: "obj" } : {}),
    },
    "protocol selection",
  );
  assertPolicyBinding({
    schemaVersion: protocol.schemaVersion,
    evaluationPolicy: protocol.schemaVersion === 1 ? null : protocol.evaluationPolicy,
    protocolPath,
  });
  eqLiteral(protocol.conventions, PROTOCOL_IDS, "protocol conventions");
  eqLiteral(protocol.limits, FIXED_LIMITS, "protocol limits");
  eqLiteral(protocol.requiredCheckIds, REQUIRED_CHECK_IDS, "protocol checks");
  eqLiteral(
    protocol.preflight,
    {
      controlFen: "7k/8/8/8/8/8/8/KR6 w - - 99 50",
      freshRequestsPerArm: 5,
    },
    "protocol preflight",
  );
  eqLiteral(protocol.comparison, { openingCount: 20, gameCount: 40 }, "protocol comparison");
  return protocol.schemaVersion === 1 ? null
    : protocolPath === V3_PATH ? V3_POLICY : V2_POLICY;
}

export function protocolPathForPolicy(evaluationPolicy) {
  if (evaluationPolicy === null) return V1_PATH;
  if (evaluationPolicy?.policyId === V3_POLICY.policyId) {
    eqLiteral(evaluationPolicy, V3_POLICY, "evaluationPolicy");
    return V3_PATH;
  }
  eqLiteral(evaluationPolicy, V2_POLICY, "evaluationPolicy");
  return V2_PATH;
}

export function isPeriodicQualityPhase(evaluationPolicy, phase) {
  const selected = protocolPathForPolicy(evaluationPolicy);
  return selected === V2_PATH ? phase === "compare"
    : selected === V3_PATH && ["preflight", "compare"].includes(phase);
}
