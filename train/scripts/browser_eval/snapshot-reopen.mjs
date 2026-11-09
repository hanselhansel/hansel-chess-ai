// Fresh-process admission of an existing immutable workspace. Expected
// hashes are never imported as proof. Every binding is reconstructed from
// actual files/Git and a genuine new-owner environment capture.
import { policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { createHash } from "node:crypto";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { captureEnvironment } from "./environment.mjs";
import { exactFields, isAbs, isObj, strNE } from "./protocol-values.mjs";
import { assertRecord } from "./record-schema.mjs";
import { BASELINE_COMMIT, FIXTURE_PATHS, FIXED_LIMITS, PYTHON_MODULES } from "./schema-constants.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { createSnapshotFiles, RUNTIME_PATHS } from "./snapshot-files.mjs";
import { assembleSnapshotIdentity, validateModelBytes } from "./snapshot-identity.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { runSetupCommand } from "./setup-process.mjs";

const MODEL = "public/weights/tinyaz-m.bin";
const META = "public/weights/tinyaz-m.meta.json";
const REQUIREMENTS = "train/requirements-verify.txt";
const PACKAGES = ["package.json", "package-lock.json"];
const fail = (detail) => {
  const error = new Error(`SNAPSHOT_UNAVAILABLE reopen ${detail}`);
  error.code = "SNAPSHOT_UNAVAILABLE";
  return error;
};
const refFor = (filename, bytes) => ({ path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) });
const original = (refs, role) => refs.map((ref) => ({ ...ref, path: ref.path.slice(`inputs/${role}/`.length) }));

export async function inspectReopenedInputs(options, context) {
  if (!isObj(options) || !exactFields(options, ["workspaceRoot", "candidate",
    ...(Object.hasOwn(options ?? {}, "protocolPath") ? ["protocolPath"] : [])]) ||
    !isAbs(options.workspaceRoot) || !strNE(options.candidate) || options.candidate.length > 200 ||
    !isObj(context) || !exactFields(context, ["repoRoot", "budget", "lifetime"]) || !isAbs(context.repoRoot)) {
    throw fail("arguments");
  }
  const own = Object.freeze({ workspaceRoot: options.workspaceRoot, candidate: options.candidate,
    protocolPath: options.protocolPath ?? FIXTURE_PATHS.protocol });
  context = Object.freeze({ repoRoot: context.repoRoot, budget: context.budget, lifetime: context.lifetime });
  const config = Object.freeze({ ...context, workspaceRoot: own.workspaceRoot });
  const resources = Object.freeze({ budget: context.budget, lifetime: context.lifetime });
  const files = createSnapshotFiles(config);
  const io = createSnapshotIO(config);
  const workspace = parseCanonicalBytes(await files.readFrozen("workspace.json"));
  assertRecord("workspace", workspace);
  const expected = workspace.commonIdentity;
  const protocolPath = own.protocolPath;
  const evaluationPolicy = expected.evaluationPolicy ?? null;
  assertPolicyBinding({ schemaVersion: workspace.schemaVersion, evaluationPolicy, protocolPath });
  if (expected.fixtures.protocol.path !== protocolPath) throw fail("requested protocol binding");
  const frozenProtocol = await files.readFrozen(`inputs/harness/${protocolPath}`);
  if (!deepEqual(refFor(protocolPath, frozenProtocol), expected.fixtures.protocol) ||
    !(await files.readActive(protocolPath)).equals(frozenProtocol)) throw fail("selected protocol bytes");
  const protocol = validateProtocolFixture(parseJSONBytes(frozenProtocol));
  if (!deepEqual(policyForProtocol(protocol, protocolPath), evaluationPolicy)) throw fail("selected protocol policy");
  const git = async (args) => {
    const result = await runSetupCommand({
      executable: "/usr/bin/git", args: ["--no-optional-locks", "--no-replace-objects", ...args],
      cwd: context.repoRoot, maxBytes: FIXED_LIMITS.ipc.frameBytes,
      env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
    }, resources);
    if (result.exitCode !== 0 || result.stderr.length !== 0) {
      throw fail("Git resolution");
    }
    return result.stdout.toString("utf8").trim();
  };
  const requestedCommit = own.candidate === "WORKTREE" ? null :
    await git(["rev-parse", "--verify", "--end-of-options", `${own.candidate}^{commit}`]);
  if (requestedCommit === null ? expected.candidate.kind !== "WORKTREE" :
    !/^[0-9a-f]{40}$/.test(requestedCommit) || expected.candidate.kind !== "commit" ||
    expected.candidate.commit !== requestedCommit) {
    throw fail("requested candidate binding");
  }
  const allPaths = await io.listAt(own.workspaceRoot, ["inputs"]);
  const observed = new Map();
  for (const filename of allPaths) {
    observed.set(filename, await files.readFrozen(filename));
  }
  const group = (role) => ({ root: `inputs/${role}`, files: allPaths
    .filter((filename) => filename.startsWith(`inputs/${role}/`))
    .map((filename) => refFor(filename, observed.get(filename))) });
  const inputs = {
    baseline: group("baseline"), candidate: group("candidate"), harness: group("harness"),
    model: refFor("inputs/model/tinyaz-m.bin", observed.get("inputs/model/tinyaz-m.bin") ?? Buffer.alloc(0)),
    setup: allPaths.filter((filename) => filename.startsWith("inputs/setup/"))
      .map((filename) => refFor(filename, observed.get(filename))),
  };
  const retainedRefs = [
    ...inputs.baseline.files, ...inputs.candidate.files, ...inputs.harness.files,
    inputs.model, ...inputs.setup,
  ];
  if (!deepEqual(allPaths, retainedRefs.map((ref) => ref.path).sort())) {
    throw fail("unexpected frozen input scope");
  }
  const requiredSetup = [
    "python-audit-summary.json", "python-pip-check.txt", "python-pip-freeze.txt",
    "environment-static.json", "hardware-model.txt", "node-build-inventory.json",
    "chromium-build-inventory.json", "python-build-inventory.json",
  ];
  if (requiredSetup.some((name) => !observed.has(`inputs/setup/${name}`))) {
    throw fail("missing retained setup evidence");
  }
  if (!observed.get("inputs/setup/environment.json")?.equals(canonicalBytes(expected.environment))) {
    throw fail("retained environment bytes");
  }
  const candidateFiles = original(inputs.candidate.files, "candidate");
  const harnessFiles = original(inputs.harness.files, "harness");
  if (!deepEqual(harnessFiles.map((ref) => ref.path), [...RUNTIME_PATHS].sort())) {
    throw fail("harness path set");
  }
  validateModelBytes(observed.get(inputs.model.path));
  const measured = assembleSnapshotIdentity({
    protocolPath, evaluationPolicy, candidate: expected.candidate, baselineFiles: original(inputs.baseline.files, "baseline"),
    candidateFiles, harnessFiles,
    pythonFiles: candidateFiles.filter((ref) => PYTHON_MODULES.includes(ref.path)),
    environment: expected.environment,
  });
  if (!deepEqual(measured, expected)) {
    throw fail("actual frozen identity");
  }
  const sourcePaths = await files.listActive(["src", ...PACKAGES]);
  const wantedCandidate = [...new Set([...sourcePaths, ...PYTHON_MODULES])].sort();
  if (!deepEqual(candidateFiles.map((ref) => ref.path), wantedCandidate)) {
    throw fail("current source path set");
  }
  const baselinePaths = await files.listGit(BASELINE_COMMIT, ["src", ...PACKAGES]);
  if (!deepEqual(original(inputs.baseline.files, "baseline").map((ref) => ref.path), baselinePaths)) {
    throw fail("baseline Git path set");
  }
  for (const filename of baselinePaths) {
    if (!(await files.readGit(BASELINE_COMMIT, filename)).equals(observed.get(`inputs/baseline/${filename}`))) {
      throw fail("baseline Git bytes");
    }
  }
  if (requestedCommit !== null && !deepEqual(await files.listGit(requestedCommit, ["src", ...PACKAGES]), sourcePaths)) {
    throw fail("candidate Git path set");
  }
  const active = new Map();
  for (const filename of [...new Set([...wantedCandidate, ...RUNTIME_PATHS, META, REQUIREMENTS, MODEL])].sort()) {
    const bytes = await files.readActive(filename);
    active.set(filename, bytes);
    const frozen = observed.get(`inputs/candidate/${filename}`) ?? observed.get(`inputs/harness/${filename}`) ??
      observed.get(filename === META ? "inputs/setup/tinyaz-m.meta.json" :
        filename === REQUIREMENTS ? "inputs/setup/requirements-verify.txt" : "inputs/model/tinyaz-m.bin");
    if (frozen === undefined || !bytes.equals(frozen)) {
      throw fail(`current source bytes ${filename}`);
    }
    if (requestedCommit !== null && filename !== MODEL && !(await files.readGit(requestedCommit, filename)).equals(bytes)) {
      throw fail(`candidate Git bytes ${filename}`);
    }
  }
  if (requestedCommit !== null) {
    const bytes = active.get(MODEL);
    const objectId = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (await git(["rev-parse", "--verify", `${requestedCommit}:${MODEL}`]) !== objectId) {
      throw fail("candidate model Git object");
    }
  }
  const recordRoot = path.join(own.workspaceRoot, "inputs/harness");
  const fresh = await captureEnvironment({ recordRoot }, resources);
  if (!deepEqual(fresh.environment, expected.environment)) {
    throw fail("fresh environment identity");
  }
  const producerSetup = fresh.setupFiles.map((file) => Object.freeze({ path: file.path, bytes: Buffer.from(file.bytes) }));
  const expectedSetup = [
    ...producerSetup,
    { path: "inputs/setup/requirements-verify.txt", bytes: active.get(REQUIREMENTS) },
    { path: "inputs/setup/tinyaz-m.meta.json", bytes: active.get(META) },
    { path: "inputs/setup/environment.json", bytes: canonicalBytes(fresh.environment) },
  ].sort((a, b) => a.path < b.path ? -1 : 1);
  if (!deepEqual(inputs.setup.map((ref) => ref.path), expectedSetup.map((file) => file.path))) {
    throw fail("fresh setup path set");
  }
  for (const file of expectedSetup) {
    if (!observed.get(file.path).equals(file.bytes)) {
      throw fail(`fresh setup bytes ${file.path}`);
    }
  }
  // The genuine audit is asynchronous. Recheck both complete path sets
  // and every current/frozen byte after it before admitting this owner.
  if (!deepEqual(await files.listActive(["src", ...PACKAGES]), sourcePaths) ||
    !deepEqual(await io.listAt(own.workspaceRoot, ["inputs"]), allPaths)) {
    throw fail("mixed reopen path set");
  }
  for (const [filename, bytes] of active) {
    if (!(await files.readActive(filename)).equals(bytes)) {
      throw fail("mixed reopen current bytes");
    }
  }
  for (const [filename, bytes] of observed) {
    if (!(await files.readFrozen(filename)).equals(bytes)) {
      throw fail("mixed reopen frozen bytes");
    }
  }
  if (!(await files.readFrozen("workspace.json")).equals(canonicalBytes(workspace))) {
    throw fail("mixed reopen workspace");
  }
  context.budget.assertLive("reopened inputs admitted");
  return Object.freeze({
    workspace: freezeDeep(workspace), inputs: freezeDeep(inputs), repoRoot: context.repoRoot,
    recordRoot, producerSetup: Object.freeze(producerSetup),
  });
}
