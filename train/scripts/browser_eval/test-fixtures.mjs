// TEST-ONLY shared fixture owner. Imported only by the *.test.mjs
// suites: a closed synthetic CommonIdentity satisfying every pinned literal,
// canonical record builders, temporary workspace/store constructors and
// controlled cleanup/identity/probe callbacks. It performs no process,
// browser, model or network work, is never imported by production modules,
// is never a native/setup authority and is excluded from the
// functional-runtime input union. A synthetic fixture pass is never an
// actual phase or cleanup pass.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import {
  BASELINE_COMMIT,
  MODEL_IDENTITY,
  PROTOCOL_IDS,
  REQUIRED_CHECK_IDS,
} from "./record-schema.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createPhaseRecorder, writeWorkspaceOnce } from "./records.mjs";
import { PYTHON_EXECUTABLE, PYTHON_PREFIX, PYTHON_VERSION } from "./schema-constants.mjs";

// Shared rejection-code assertion: awaits the promise, requires the
// thrown value to carry the expected code and fails otherwise.
export const assertRejectCode = async (promise, want) => {
  try {
    await promise;
  } catch (e) {
    assert.equal(e.code, want);
    return;
  }
  assert.fail(`expected ${want}`);
};

const h = (seed) => `${seed}`.padStart(64, "0").slice(0, 64).replace(/[^0-9a-f]/g, "0");
export const H = (seed) => h(seed);
const COMMIT = (seed) => h(seed).slice(0, 40);

export const ref = (p, bytes = 4, seed = 1) =>
  Object.freeze({ path: p, byteLength: bytes, sha256: h(seed) });

export const identity = (pid = 4242) =>
  Object.freeze({ pid, startSec: "1730000000", startUsec: 123456 });

// Synthetic but structurally exact Python identity: the selected project
// venv executable, prefix and CPython version pinned by the schema.
const PY_RUNTIME = Object.freeze({
  invocationPath: PYTHON_EXECUTABLE,
  realPath: `${PYTHON_PREFIX}/bin/python3.11`,
  sha256: h(11),
  processImage: Object.freeze({
    realPath:
      "/opt/homebrew/opt/python@3.11/Frameworks/Python.framework/Versions/3.11/Resources/Python.app/Contents/MacOS/Python",
    sha256: h(12),
  }),
  version: PYTHON_VERSION,
  executable: PYTHON_EXECUTABLE,
  prefix: PYTHON_PREFIX,
  basePrefix: "/opt/homebrew/opt/python@3.11",
});

const SITE = `${PYTHON_PREFIX}/lib/python3.11/site-packages`;

const OS = Object.freeze({
  platform: "darwin",
  arch: "arm64",
  release: "25.6.0",
  version: "Darwin 25.6.0",
  build: "25A123",
});

const EXEC = (name, seed) =>
  Object.freeze({
    invocationPath: `/opt/bin/${name}`,
    realPath: `/opt/bin/${name}`,
    sha256: h(seed),
    version: "1.0.0",
  });

export function fixtureCommonIdentity({ candidateKind = "commit" } = {}) {
  return {
    candidate: {
      kind: candidateKind,
      commit: candidateKind === "commit" ? COMMIT(100) : null,
      contentSha256: h(101),
    },
    baseline: { commit: BASELINE_COMMIT, contentSha256: h(102) },
    harness: {
      contentSha256: h(103),
      files: [ref("train/scripts/browser_eval/canonical-json.mjs", 100, 104)],
    },
    pythonReference: {
      contentSha256: h(105),
      files: [
        "train/src/tinyaz/__init__.py",
        "train/src/tinyaz/constants.py",
        "train/src/tinyaz/encode.py",
        "train/src/tinyaz/model.py",
        "train/src/tinyaz/pack.py",
        "train/src/tinyaz/policy.py",
      ].map((p, i) => ref(p, 10 + i, 110 + i)),
    },
    fixtures: {
      protocol: ref("train/fixtures/browser-protocol.json", 20, 120),
      parity: ref("train/fixtures/browser-parity.json", 20, 121),
      openings: ref("train/fixtures/browser-openings.json", 20, 122),
    },
    model: structuredClone(MODEL_IDENTITY),
    baselineNormalization: {
      requestPath: "/weights/tinyaz-s.bin",
      responseSha256: MODEL_IDENTITY.sha256,
      provenance: "controlled-delivery-plus-ready",
    },
    conventions: structuredClone(PROTOCOL_IDS),
    environment: {
      node: EXEC("node", 130),
      python: {
        runtime: PY_RUNTIME,
        pipVersion: "25.2",
        pipFreezeSha256: h(131),
        distributions: [
          { name: "chess", version: "1.11.2", buildSha256: h(132), wheelSha256: h(133) },
          { name: "numpy", version: "2.3.5", buildSha256: h(134), wheelSha256: h(135) },
          { name: "torch", version: "2.10.0", buildSha256: h(136), wheelSha256: h(137) },
          {
            name: "zstandard",
            version: "0.25.0",
            buildSha256: h(138),
            wheelSha256: null,
          },
        ],
        imports: [
          { module: "chess", origin: `${SITE}/chess/__init__.py`, version: "1.11.2", sourceSha256: h(140) },
          { module: "numpy", origin: `${SITE}/numpy/__init__.py`, version: "2.3.5", sourceSha256: h(141) },
          { module: "torch", origin: `${SITE}/torch/__init__.py`, version: "2.10.0", sourceSha256: h(142) },
          { module: "zstandard", origin: `${SITE}/zstandard/__init__.py`, version: "0.25.0", sourceSha256: h(143) },
        ],
      },
      dependencies: {
        packageLockSha256: h(150),
        packages: [{ name: "chess.js", version: "1.4.0", buildSha256: h(151) }],
      },
      chromium: EXEC("chromium", 152),
      launch: {
        host: "127.0.0.1",
        headless: true,
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        args: [],
        securityOptionsSha256: h(153),
      },
      os: OS,
      hardware: {
        model: "Mac15,1",
        cpuModel: "Apple M4",
        logicalCpus: 10,
        physicalMemoryBytes: 34359738368,
      },
      monitoring: {
        backendId: "darwin-arm64-libproc-v1",
        os: OS,
        python: PY_RUNTIME,
        helpers: [ref("train/scripts/browser_eval/process-macos.py", 50, 160)],
        libproc: {
          path: "/usr/lib/libproc.dylib",
          abi: { bsdInfoSize: 136, taskInfoSize: 96 },
          image: { kind: "OS_SHARED_CACHE", osBuild: "25A123" },
        },
        lsof: { invocationPath: "/usr/sbin/lsof", realPath: "/usr/sbin/lsof", sha256: h(161) },
      },
    },
  };
}

export const copy = (v) => parseCanonicalBytes(canonicalBytes(v));
export const hashOf = (v) => sha256Bytes(canonicalBytes(v));

export function fixtureWorkspace({ workspaceId = "ws-test", commonIdentity } = {}) {
  return {
    schemaVersion: 1,
    workspaceId,
    commonIdentity: commonIdentity ?? fixtureCommonIdentity(),
  };
}

const roleFiles = (role, seeds) =>
  seeds.map(([p, s]) => ref(`inputs/${role}/${p}`, 8, s));

export function fixtureManifest({ workspace, phase = "check", runId = `run-${phase}`, prerequisites = [], owner = null, inputs } = {}) {
  const ws = workspace ?? fixtureWorkspace();
  return {
    schemaVersion: 1,
    workspaceId: ws.workspaceId,
    runId,
    phase,
    commonIdentitySha256: hashOf(ws.commonIdentity),
    inputs: inputs ?? {
      baseline: { root: "inputs/baseline", files: roleFiles("baseline", [["x", 1]]) },
      candidate: { root: "inputs/candidate", files: roleFiles("candidate", [["x", 2]]) },
      harness: { root: "inputs/harness", files: roleFiles("harness", [["x", 3]]) },
      model: ref("inputs/model/tinyaz-m.bin", 100, 4),
      setup: [ref("inputs/setup/env.json", 8, 5)],
    },
    limits: {
      ipc: { frameBytes: 1048576, driverBytes: 262144, chunkBytes: 65536 },
      timing: {
        readinessMs: 30000,
        commandMs: 90000,
        heartbeatMs: 500,
        heartbeatGapMs: 2000,
        sampleMs: 250,
        sampleGapMs: 500,
        cleanupMs: 5000,
        phaseMs: { check: 600000, parity: 600000, preflight: 600000, compare: 86400000 },
      },
      resources: {
        rssBytes: 4294967296,
        workspaceBytes: 268435456,
        ordinaryBytes: 266338304,
        finalReserveBytes: 2097152,
      },
      visits: 64,
      cohort: { pairs: 20, games: 40 },
    },
    requiredCheckIds: [...REQUIRED_CHECK_IDS[phase]],
    prerequisites,
    owner,
  };
}

export function fixtureRunning({ manifest, supervisor, startedAtUtc = "2026-11-02T00:00:00Z" } = {}) {
  return {
    schemaVersion: 1,
    workspaceId: manifest.workspaceId,
    runId: manifest.runId,
    phase: manifest.phase,
    commonIdentitySha256: manifest.commonIdentitySha256,
    supervisor: supervisor ?? identity(4242),
    startedAtUtc,
  };
}

export const proof = (scope, expectedFinalizer) => ({
  scope,
  expectedFinalizer,
  verified: true,
  survivorIdentities: [],
  listenersRemaining: [],
  accountingValid: true,
});

export async function makeTmpDir(prefix = "be-fixture-") {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

// A real artifact store over a temp workspace with a fully controlled
// footprint/clock so tests drive accounting deterministically.
export async function makeStore({ chargedBytes = 0, lifetime = undefined } = {}) {
  const workspaceRoot = await makeTmpDir();
  const ctl = { chargedBytes, observedAtMs: 0, accountingValid: true, now: 0 };
  const store = createArtifactStore({
    workspaceRoot,
    lifetime,
    readFootprint: async () => ({
      chargedBytes: ctl.chargedBytes,
      observedAtMs: ctl.observedAtMs,
      accountingValid: ctl.accountingValid,
    }),
    monotonicNow: () => ctl.now,
  });
  return { store, workspaceRoot, ctl };
}

// Controlled mandatory callbacks; callers may swap `impl` per case.
export const verifyCallbacks = ({ commonIdentity, cleanupProof } = {}) => ({
  verifyIdentity: {
    impl: async () => copy(commonIdentity),
    calls: [],
    async fn(arg) {
      this.calls.push(arg);
      return this.impl(arg);
    },
  },
  verifyCleanup: {
    impl: async ({ claimedProof }) =>
      cleanupProof ?? proof(claimedProof.scope, claimedProof.expectedFinalizer),
    calls: [],
    async fn(arg) {
      this.calls.push(arg);
      return this.impl(arg);
    },
  },
});

export async function makeRecorder({ manifest, workspace, callbacks, env } = {}) {
  const base = env ?? (await makeWorkspace());
  const ws = workspace ?? base.ws;
  const mf = manifest ?? fixtureManifest({ workspace: ws, inputs: base.inputs });
  const cb = callbacks ?? verifyCallbacks({ commonIdentity: ws.commonIdentity });
  const recorder = createPhaseRecorder({
    store: base.store,
    workspace: ws,
    manifest: mf,
    verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
    verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
  });
  await recorder.writeManifest();
  await recorder.writeRunning(fixtureRunning({ manifest: mf }));
  return {
    store: base.store,
    workspaceRoot: base.workspaceRoot,
    ctl: base.ctl,
    recorder,
    ws,
    mf,
    cb,
  };
}

// Writes the actual retained input bytes a manifest's declared refs commit
// to. Receipt verification reads these real files under inputs/ — the
// production verifier is never weakened to admit absent fake refs.
export async function writeFixtureInputs({ store }) {
  const put = (rel, bytes) => store.writeOnce(rel, Buffer.alloc(bytes, 7), "ordinary");
  return {
    baseline: { root: "inputs/baseline", files: [await put("inputs/baseline/x", 8)] },
    candidate: { root: "inputs/candidate", files: [await put("inputs/candidate/x", 8)] },
    harness: { root: "inputs/harness", files: [await put("inputs/harness/x", 8)] },
    model: await put("inputs/model/tinyaz-m.bin", 100),
    setup: [await put("inputs/setup/env.json", 8)],
  };
}

// One temp workspace root with workspace.json and the retained input bytes
// already written, shared by every receipt phase so prerequisite chains and
// declared input refs resolve inside one root.
export async function makeWorkspace({ workspaceId = "ws-test" } = {}) {
  const { store, workspaceRoot, ctl } = await makeStore();
  const ws = fixtureWorkspace({ workspaceId });
  await writeWorkspaceOnce({ store, workspace: ws });
  const inputs = await writeFixtureInputs({ store });
  return { store, workspaceRoot, ctl, ws, inputs };
}

// Drives a real minimal phase to a passed receipt so prerequisite tests can
// verify the produced artifacts on disk.
export async function runReceiptPhase({
  env,
  phase = "check",
  runId,
  prerequisites = [],
  owner = null,
  checks,
  intent,
  expectedSelfTest = null,
}) {
  const ws = env.ws;
  const mf = fixtureManifest({
    workspace: ws,
    phase,
    runId: runId ?? `run-${phase}`,
    prerequisites,
    owner,
    inputs: env.inputs,
  });
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  const expectedFinalizer = phase === "watchdog-selftest" ? owner.supervisor : identity(4242);
  const scope = phase === "watchdog-selftest" ? "selftest-workload" : "phase-workload";
  cb.verifyCleanup.impl = async () => proof(scope, expectedFinalizer);
  const rec = await makeRecorder({ env, manifest: mf, callbacks: cb });
  const selftest = phase === "watchdog-selftest";
  const completionRef = await rec.recorder.finalize({
    intent: intent ?? {
      status: selftest ? "inconclusive" : "passed",
      exitCode: selftest ? 2 : 0,
      stopReason: selftest ? "HEARTBEAT_TIMEOUT" : null,
      summary: selftest ? { scoredGames: 0 } : {},
      unplannedFaultCount: 0,
      analysisEligible: false,
    },
    checks:
      checks ??
      (selftest
        ? []
        : REQUIRED_CHECK_IDS[phase]
            .filter((id) => id !== "cleanup")
            .map((id) => ({ id, status: "passed", evidencePaths: [] }))),
    prerequisites,
    expectedSelfTest,
  });
  return { env, mf, completionRef };
}
