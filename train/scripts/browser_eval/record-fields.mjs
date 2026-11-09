// Whole v1 field payload, extracted unchanged. No validator imports.
import { freezeDeep } from "./schema-primitives.mjs";

export const RECORD_FIELDS = {
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


freezeDeep(RECORD_FIELDS);
