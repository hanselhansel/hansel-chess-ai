// Frozen fixed pin/check/phase/limit/protocol declarations. Storage only:
// record-schema.mjs remains the public contract owner through named
// re-exports. Imports only primitive freeze support.

import { freezeDeep } from "./schema-primitives.mjs";

export const PHASES = freezeDeep(["check", "parity", "preflight", "compare"]);
export const RECORDED_PHASES = freezeDeep([...PHASES, "watchdog-selftest"]);
export const EVENT_KINDS = freezeDeep([
  "operation",
  "delivery",
  "response",
  "resource",
  "fault",
  "cleanup",
  "artifact-deletion",
]);

export const BASELINE_COMMIT = "bb76439ea7bb4ae84bf15fe1276d75dc336d3cec";

export const REQUIRED_CHECK_IDS = freezeDeep({
  check: [
    "verified-delivery",
    "real-worker",
    "retained-main-recovery",
    "request-lifecycle",
    "explicit-failure-actions",
    "completed-display",
    "workbench-layout",
    "cleanup",
  ],
  parity: [
    "frozen-python-imports",
    "input-planes-13",
    "policy-mapping-13",
    "numeric-tolerance-13",
    "cleanup",
  ],
  preflight: [
    "cold-readiness",
    "ten-fresh-requests",
    "aa-color-pair",
    "watchdog-selftest",
    "timing-estimate",
    "cleanup",
  ],
  compare: [
    "locked-suite-complete",
    "identity-every-turn",
    "legal-outcomes",
    "raw-record-accounting",
    "paired-analysis",
    "cleanup",
  ],
  "watchdog-selftest": [
    "injected-heartbeat-timeout",
    "zero-scored-games",
    "surviving-child-cleanup",
    "accounting-valid",
  ],
});

export const REQUIRED_PARENT_PHASES = freezeDeep({
  check: [],
  parity: ["check"],
  preflight: ["check", "parity"],
  compare: ["check", "parity", "preflight"],
  "watchdog-selftest": [],
});

export const PROTOCOL_IDS = freezeDeep({
  inputId: "baseline-fen-candidate-history-raw-ep-v1",
  ruleId: "chessjs-checkmate-first-draws-v1",
  visitId: "completed-root64-v1",
  analysisId: "paired-sign-cp95-v1",
  reference: {
    device: "cpu",
    dtype: "float32",
    inferenceMode: true,
    intraOpThreads: 1,
    interOpThreads: 1,
  },
});

export const MODEL_IDENTITY = freezeDeep({
  format: "TAZS",
  packedVersion: 1,
  source: 1,
  parameterCount: 2426706,
  byteLength: 9706840,
  sha256: "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee",
});

export const FIXED_LIMITS = freezeDeep({
  ipc: { frameBytes: 1048576, driverBytes: 262144, chunkBytes: 65536 },
  timing: {
    readinessMs: 30000,
    commandMs: 90000,
    heartbeatMs: 500,
    heartbeatGapMs: 2000,
    sampleMs: 250,
    sampleGapMs: 500,
    cleanupMs: 5000,
    phaseMs: { check: 600000, parity: 600000, preflight: 600000, compare: 3600000 },
  },
  resources: {
    rssBytes: 4294967296,
    workspaceBytes: 268435456,
    ordinaryBytes: 266338304,
    finalReserveBytes: 2097152,
  },
  visits: 64,
  cohort: { pairs: 20, games: 40 },
});

export const PYTHON_MODULES = freezeDeep([
  "train/src/tinyaz/__init__.py",
  "train/src/tinyaz/constants.py",
  "train/src/tinyaz/encode.py",
  "train/src/tinyaz/model.py",
  "train/src/tinyaz/pack.py",
  "train/src/tinyaz/policy.py",
]);

export const FIXTURE_PATHS = freezeDeep({
  protocol: "train/fixtures/browser-protocol.json",
  parity: "train/fixtures/browser-parity.json",
  openings: "train/fixtures/browser-openings.json",
});

export const PYTHON_IMPORTS = freezeDeep([
  ["chess", "1.11.2"],
  ["numpy", "2.3.5"],
  ["torch", "2.10.0"],
  ["zstandard", "0.25.0"],
]);

// The selected project interpreter: the declared absolute venv executable,
// prefix and CPython version a full phase must record.
export const PYTHON_EXECUTABLE =
  "/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/.venv/bin/python";
export const PYTHON_PREFIX =
  "/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/.venv";
export const PYTHON_VERSION = "3.11.14";
