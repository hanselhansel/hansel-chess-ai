// Pure prospective selection. Inventory membership never selects a policy.
import { FIXED_LIMITS, PROTOCOL_IDS, REQUIRED_CHECK_IDS } from "./schema-constants.mjs";
import { eqLiteral, freezeDeep, schemaFail, shape } from "./schema-primitives.mjs";

export const V2_POLICY = freezeDeep({
  policyId: "tinyaz-separate-verdicts-v2",
  recordSchemaVersion: 2,
  softPhase: "compare",
});
const V1_PATH = "train/fixtures/browser-protocol.json";
const V2_PATH = "train/fixtures/browser-protocol-v2.json";

export function assertPolicyBinding({ schemaVersion, evaluationPolicy, protocolPath }) {
  if (schemaVersion === 1 && evaluationPolicy === null && protocolPath === V1_PATH) return;
  if (schemaVersion !== 2 || protocolPath !== V2_PATH) {
    schemaFail("SCHEMA_LITERAL", "policy/version/protocol binding");
  }
  eqLiteral(evaluationPolicy, V2_POLICY, "evaluationPolicy");
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
  return protocol.schemaVersion === 1 ? null : V2_POLICY;
}
