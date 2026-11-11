// Immutable input capture. Snapshot data never admits a phase or proves
// Native readiness. Final verification reads actual retained files and
// calls the fixed genuine file-only environment verifier.
import { policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { verifyEnvironment } from "./environment.mjs";
import { assertCommonIdentity, assertEnvironment } from "./identity-schema.mjs";
import { exactFields, isAbs, isObj, isRel, strNE } from "./protocol-values.mjs";
import { assertRecord } from "./record-schema.mjs";
import { BASELINE_COMMIT, FIXTURE_PATHS, FIXED_LIMITS, PYTHON_MODULES, RECORDED_PHASES } from "./schema-constants.mjs";
import { assertArtifactRef, deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { createSnapshotFiles, RUNTIME_PATHS } from "./snapshot-files.mjs";
import { assembleSnapshotIdentity, validateModelBytes } from "./snapshot-identity.mjs";
import { inspectReopenedInputs } from "./snapshot-reopen.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { runSetupCommand } from "./setup-process.mjs";

const FROZEN_READ_WIDTH = 1;
const CAPTURES = new WeakMap();
const PACKAGES = ["package.json", "package-lock.json"];
const MODEL_PATH = "public/weights/tinyaz-m.bin";
const META_PATH = "public/weights/tinyaz-m.meta.json";
const REQUIREMENTS_PATH = "train/requirements-verify.txt";
const fail = (detail) => {
  const error = new Error(`SNAPSHOT_UNAVAILABLE ${detail}`);
  error.code = "SNAPSHOT_UNAVAILABLE";
  return error;
};
const copy = (value) => parseCanonicalBytes(canonicalBytes(value));
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const refFor = (filename, bytes) => ({ path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) });
const original = (refs, role) => refs.map((ref) => ({ ...ref, path: ref.path.slice(`inputs/${role}/`.length) }));
const contextFor = (context, rootKey) => {
  if (!isObj(context) || !exactFields(context, [rootKey, "budget", "lifetime"]) || !isAbs(context[rootKey])) {
    throw fail("context fields");
  }
  return Object.freeze({ [rootKey]: context[rootKey], budget: context.budget, lifetime: context.lifetime });
};
const ownSetup = (setupFiles) => {
  if (!Array.isArray(setupFiles)) {
    throw fail("setup file array");
  }
  const files = setupFiles.map((file) => {
    if (!isObj(file) || !exactFields(file, ["path", "bytes"]) || !isRel(file.path) ||
      !file.path.startsWith("inputs/setup/") || !Buffer.isBuffer(file.bytes)) {
      throw fail("setup file fields");
    }
    return Object.freeze({ path: file.path, bytes: Buffer.from(file.bytes) });
  }).sort((a, b) => compare(a.path, b.path));
  if (files.some((file, i) => i > 0 && files[i - 1].path === file.path)) {
    throw fail("duplicate setup file");
  }
  return Object.freeze(files);
};
const validateInputs = (inputs) => {
  if (!isObj(inputs) || !exactFields(inputs, ["baseline", "candidate", "harness", "model", "setup"])) {
    throw fail("input fields");
  }
  const all = [];
  for (const role of ["baseline", "candidate", "harness"]) {
    const group = inputs[role];
    if (!isObj(group) || !exactFields(group, ["root", "files"]) ||
      group.root !== `inputs/${role}` || !Array.isArray(group.files)) {
      throw fail("input role");
    }
    for (const ref of group.files) {
      assertArtifactRef(ref);
      if (!ref.path.startsWith(`${group.root}/`)) {
        throw fail("input role path");
      }
    }
    all.push(...group.files);
  }
  assertArtifactRef(inputs.model);
  if (inputs.model.path !== "inputs/model/tinyaz-m.bin" || !Array.isArray(inputs.setup)) {
    throw fail("model/setup inputs");
  }
  for (const ref of inputs.setup) {
    assertArtifactRef(ref);
    if (!ref.path.startsWith("inputs/setup/")) {
      throw fail("setup input path");
    }
  }
  for (const refs of [inputs.baseline.files, inputs.candidate.files, inputs.harness.files, inputs.setup]) {
    if (refs.some((ref, i) => i > 0 && refs[i - 1].path >= ref.path)) {
      throw fail("input order");
    }
  }
  all.push(inputs.model, ...inputs.setup);
  if (new Set(all.map((ref) => ref.path)).size !== all.length) {
    throw fail("duplicate input");
  }
  return all;
};

export async function captureInputs(options, context) {
  context = contextFor(context, "repoRoot");
  if (!isObj(options) || !exactFields(options, ["candidate", "protocolPath", "workspaceRoot", "environment", "setupFiles",
    ...(Object.hasOwn(options ?? {}, "evaluationPolicy") ? ["evaluationPolicy"] : [])])) {
    throw fail("capture fields");
  }
  const { setupFiles, ...serializable } = options;
  const own = freezeDeep(copy({ ...serializable, protocolPath: serializable.protocolPath ===
    path.join(context.repoRoot, FIXTURE_PATHS.protocol) ? FIXTURE_PATHS.protocol : serializable.protocolPath }));
  const producerSetup = ownSetup(setupFiles);
  if (!strNE(own.candidate) || own.candidate.length > 200 || !isAbs(own.workspaceRoot) ||
    ![FIXTURE_PATHS.protocol, "train/fixtures/browser-protocol-v2.json", "train/fixtures/browser-protocol-v3.json"].includes(own.protocolPath)) {
    throw fail("capture selection");
  }
  assertEnvironment(own.environment);
  const resources = Object.freeze({ budget: context.budget, lifetime: context.lifetime });
  const fileContext = Object.freeze({ ...context, workspaceRoot: own.workspaceRoot });
  const files = createSnapshotFiles(fileContext);
  const git = async (args) => {
    const result = await runSetupCommand({
      executable: "/usr/bin/git", args: ["--no-optional-locks", "--no-replace-objects", ...args],
      cwd: context.repoRoot, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
      maxBytes: FIXED_LIMITS.ipc.frameBytes,
    }, resources);
    if (result.exitCode !== 0 || result.stderr.length !== 0) {
      throw fail("Git resolution");
    }
    return result.stdout.toString("utf8").trim();
  };
  const commit = own.candidate === "WORKTREE" ? null :
    await git(["rev-parse", "--verify", "--end-of-options", `${own.candidate}^{commit}`]);
  if (commit !== null && !/^[0-9a-f]{40}$/.test(commit)) {
    throw fail("resolved candidate commit");
  }
  const sourcePaths = await files.listActive(["src", ...PACKAGES]);
  const candidatePaths = [...new Set([...sourcePaths, ...PYTHON_MODULES])].sort();
  const activePaths = [...new Set([...candidatePaths, ...RUNTIME_PATHS, REQUIREMENTS_PATH, META_PATH, MODEL_PATH])].sort();
  const before = new Map();
  for (const filename of activePaths) {
    before.set(filename, await files.readActive(filename));
  }
  const protocol = validateProtocolFixture(parseJSONBytes(before.get(own.protocolPath)));
  const evaluationPolicy = policyForProtocol(protocol, own.protocolPath);
  if (!deepEqual(own.evaluationPolicy ?? null, evaluationPolicy)) throw fail("capture policy selection");
  validateModelBytes(before.get(MODEL_PATH));
  if (commit !== null) {
    const requestedPaths = await files.listGit(commit, ["src", ...PACKAGES]);
    if (!deepEqual(requestedPaths, sourcePaths)) {
      throw fail("committed source path set");
    }
    for (const filename of activePaths.filter((name) => name !== MODEL_PATH)) {
      if (!(await files.readGit(commit, filename)).equals(before.get(filename))) {
        throw fail(`active input differs from requested commit ${filename}`);
      }
    }
    const objectId = await git(["rev-parse", "--verify", `${commit}:${MODEL_PATH}`]);
    const bytes = before.get(MODEL_PATH);
    const actualId = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    if (objectId !== actualId) {
      throw fail("committed model object");
    }
  }
  const baselinePaths = await files.listGit(BASELINE_COMMIT, ["src", ...PACKAGES]);
  if (!PACKAGES.every((filename) => baselinePaths.includes(filename))) {
    throw fail("baseline package inputs");
  }
  const inputs = { baseline: { root: "inputs/baseline", files: [] },
    candidate: { root: "inputs/candidate", files: [] }, harness: { root: "inputs/harness", files: [] },
    model: null, setup: [] };
  for (const filename of baselinePaths) {
    inputs.baseline.files.push(await files.writeFrozen(`inputs/baseline/${filename}`, await files.readGit(BASELINE_COMMIT, filename)));
  }
  for (const filename of candidatePaths) {
    inputs.candidate.files.push(await files.writeFrozen(`inputs/candidate/${filename}`, before.get(filename)));
  }
  for (const filename of [...RUNTIME_PATHS].sort()) {
    inputs.harness.files.push(await files.writeFrozen(`inputs/harness/${filename}`, before.get(filename)));
  }
  inputs.model = await files.writeFrozen("inputs/model/tinyaz-m.bin", before.get(MODEL_PATH));
  const setup = [
    ...producerSetup,
    { path: "inputs/setup/requirements-verify.txt", bytes: before.get(REQUIREMENTS_PATH) },
    { path: "inputs/setup/tinyaz-m.meta.json", bytes: before.get(META_PATH) },
    { path: "inputs/setup/environment.json", bytes: canonicalBytes(own.environment) },
  ].sort((a, b) => compare(a.path, b.path));
  if (setup.some((file, i) => i > 0 && setup[i - 1].path === file.path)) {
    throw fail("reserved setup file collision");
  }
  for (const file of setup) {
    inputs.setup.push(await files.writeFrozen(file.path, file.bytes));
  }
  if (!deepEqual(await files.listActive(["src", ...PACKAGES]), sourcePaths)) {
    throw fail("active source path set changed");
  }
  for (const filename of activePaths) {
    if (!(await files.readActive(filename)).equals(before.get(filename))) {
      throw fail(`mixed active capture ${filename}`);
    }
  }
  const candidate = { kind: commit === null ? "WORKTREE" : "commit", commit };
  const candidateFiles = original(inputs.candidate.files, "candidate");
  const commonIdentity = assembleSnapshotIdentity({
    candidate, protocolPath: own.protocolPath, evaluationPolicy,
    baselineFiles: original(inputs.baseline.files, "baseline"), candidateFiles,
    harnessFiles: original(inputs.harness.files, "harness"),
    pythonFiles: candidateFiles.filter((ref) => PYTHON_MODULES.includes(ref.path)), environment: own.environment,
  });
  validateInputs(inputs);
  await files.linkDependencies(path.join(context.repoRoot, "node_modules"));
  const workspace = freezeDeep({ schemaVersion: protocol.schemaVersion, workspaceId: randomUUID(), commonIdentity });
  assertRecord("workspace", workspace);
  await files.writeFrozen("workspace.json", canonicalBytes(workspace));
  context.budget.assertLive("snapshot captured");
  let captures = CAPTURES.get(context.lifetime);
  if (captures === undefined) {
    captures = new Map();
    CAPTURES.set(context.lifetime, captures);
  }
  captures.set(workspace.workspaceId, {
    repoRoot: context.repoRoot, recordRoot: context.repoRoot, workspaceRoot: own.workspaceRoot,
    inputs: freezeDeep(copy(inputs)), producerSetup,
  });
  return Object.freeze({ workspace, inputs: freezeDeep(inputs),
    frozenCliPath: path.join(own.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs") });
}

export async function verifyIdentity(options, context) {
  context = contextFor(context, "workspaceRoot");
  if (!isObj(options) || !exactFields(options, ["workspaceId", "runId", "phase", "expectedCommonIdentity", "inputs"])) {
    throw fail("verify fields");
  }
  const own = freezeDeep(copy(options));
  if (!strNE(own.workspaceId) || !strNE(own.runId) || !RECORDED_PHASES.includes(own.phase)) {
    throw fail("verify identity fields");
  }
  assertCommonIdentity(own.expectedCommonIdentity);
  if (own.expectedCommonIdentity.candidate.kind === "WORKTREE" && ["preflight", "compare"].includes(own.phase)) {
    throw fail("WORKTREE forbidden for final phase");
  }
  const refs = validateInputs(own.inputs);
  const captured = CAPTURES.get(context.lifetime)?.get(own.workspaceId);
  if (captured === undefined || captured.workspaceRoot !== context.workspaceRoot || !deepEqual(captured.inputs, own.inputs)) {
    throw fail("initial snapshot association");
  }
  const config = Object.freeze({ ...context, repoRoot: captured.repoRoot });
  const files = createSnapshotFiles(config);
  const workspace = parseCanonicalBytes(await files.readFrozen("workspace.json"));
  assertRecord("workspace", workspace);
  if (workspace.workspaceId !== own.workspaceId || !deepEqual(workspace.commonIdentity, own.expectedCommonIdentity)) {
    throw fail("workspace identity changed");
  }
  const phaseDir = own.phase === "watchdog-selftest" ? "preflight/selftest" : own.phase;
  const io = createSnapshotIO(config);
  const manifest = parseCanonicalBytes(await io.readAt(context.workspaceRoot, `${phaseDir}/manifest.json`));
  assertRecord("manifest", manifest);
  if (manifest.workspaceId !== own.workspaceId || manifest.runId !== own.runId || manifest.phase !== own.phase ||
    manifest.commonIdentitySha256 !== sha256Bytes(canonicalBytes(own.expectedCommonIdentity)) || !deepEqual(manifest.inputs, own.inputs)) {
    throw fail("manifest identity changed");
  }
  const observed = new Map();
  for (let offset = 0; offset < refs.length; offset += FROZEN_READ_WIDTH) {
    let failed = false;
    let first;
    const batch = refs.slice(offset, offset + FROZEN_READ_WIDTH);
    await Promise.allSettled(batch.map(async (ref) => {
      try {
        context.budget.assertLive("snapshot concurrent input");
        const bytes = await files.readFrozen(ref.path);
        if (!deepEqual(refFor(ref.path, bytes), ref)) {
          throw fail(`frozen input changed ${ref.path}`);
        }
        observed.set(ref.path, bytes);
      } catch (error) {
        if (!failed) {
          failed = true;
          first = error;
        }
      }
    }));
    if (failed) {
      throw first;
    }
  }
  const paths = await io.listAt(context.workspaceRoot, ["inputs"]);
  if (!deepEqual(paths, refs.map((ref) => ref.path).sort())) {
    throw fail("frozen input path set changed");
  }
  validateModelBytes(observed.get(own.inputs.model.path));
  const candidateFiles = original(own.inputs.candidate.files, "candidate");
  const protocolPath = own.expectedCommonIdentity.fixtures.protocol.path;
  const evaluationPolicy = own.expectedCommonIdentity.evaluationPolicy ?? null;
  const protocol = validateProtocolFixture(parseJSONBytes(observed.get(`inputs/harness/${protocolPath}`)));
  assertPolicyBinding({ schemaVersion: workspace.schemaVersion, evaluationPolicy, protocolPath });
  if (!deepEqual(policyForProtocol(protocol, protocolPath), evaluationPolicy) || manifest.schemaVersion !== workspace.schemaVersion ||
    !deepEqual(manifest.evaluationPolicy ?? null, evaluationPolicy)) throw fail("final policy selection");
  const actualIdentity = assembleSnapshotIdentity({
    protocolPath, evaluationPolicy,
    candidate: own.expectedCommonIdentity.candidate,
    baselineFiles: original(own.inputs.baseline.files, "baseline"), candidateFiles,
    harnessFiles: original(own.inputs.harness.files, "harness"),
    pythonFiles: candidateFiles.filter((ref) => PYTHON_MODULES.includes(ref.path)),
    environment: await verifyEnvironment({
      expectedEnvironment: own.expectedCommonIdentity.environment, recordRoot: captured.recordRoot,
      setupFiles: captured.producerSetup.map((file) => ({ path: file.path, bytes: observed.get(file.path) })),
    }, { budget: context.budget, lifetime: context.lifetime }),
  });
  if (!deepEqual(actualIdentity, own.expectedCommonIdentity)) {
    throw fail("recomputed common identity");
  }
  context.budget.assertLive("snapshot verified");
  return actualIdentity;
}

export async function reopenInputs(options, context) {
  context = contextFor(context, "repoRoot");
  const own = freezeDeep(copy(options));
  const reopened = await inspectReopenedInputs(own, context);
  let captures = CAPTURES.get(context.lifetime);
  if (captures === undefined) {
    captures = new Map();
    CAPTURES.set(context.lifetime, captures);
  }
  captures.set(reopened.workspace.workspaceId, {
    repoRoot: reopened.repoRoot, recordRoot: reopened.recordRoot,
    workspaceRoot: own.workspaceRoot,
    inputs: reopened.inputs, producerSetup: ownSetup(reopened.producerSetup),
  });
  return Object.freeze({
    workspace: reopened.workspace, inputs: reopened.inputs,
    frozenCliPath: path.join(own.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs"),
  });
}
