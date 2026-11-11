// TEST ONLY. Prospective selector recognition; no phase authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { policyForProtocol } from "./evaluation-policy.mjs";

const policy = {
  policyId: "tinyaz-separate-verdicts-v3",
  recordSchemaVersion: 2,
  softPhases: ["preflight", "compare"],
};

const protocol = {
  ...JSON.parse(readFileSync(new URL("../../fixtures/browser-protocol.json", import.meta.url))),
  schemaVersion: 2,
  evaluationPolicy: policy,
};

test("explicit V3 policy selects the V3 protocol path", () => {
  assert.doesNotThrow(() => policyForProtocol(protocol, "train/fixtures/browser-protocol-v3.json"));
  assert.deepEqual(policyForProtocol(protocol, "train/fixtures/browser-protocol-v3.json"), policy);
});
