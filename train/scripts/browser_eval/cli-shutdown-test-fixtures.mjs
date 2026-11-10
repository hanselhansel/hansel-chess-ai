// TEST-only full CLI archive. Its synthetic identities are never phase proof.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeWorkspace } from "./test-fixtures.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { captureSetupBackendIdentity } from "./process-backend.mjs";
import { createBackendIdentityExpectation } from "./process-backend-reader.mjs";
import { assertEnvironment } from "./identity-schema.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";

const HELPER_REFS = ["process-macos-abi.py", "process-macos-native.py", "process-macos.py"]
  .map(name => `train/scripts/browser_eval/${name}`);

// TEST-only source rebinding, not Native availability/collector selfreport.
export async function bindCliFixtureNativeEnvironment(nativeEnvironment, harnessRoot) {
  const supplied = structuredClone(nativeEnvironment);
  assertEnvironment(supplied);
  const expected = supplied.monitoring;
  if (JSON.stringify(expected.helpers.map(ref => ref.path)) !== JSON.stringify(HELPER_REFS)) {
    throw new Error("CLI fixture helper paths");
  }
  const current = await captureSetupBackendIdentity({
    recordRoot: harnessRoot,
    helperPaths: HELPER_REFS.map(ref => path.join(harnessRoot, ref)),
    pythonExecutable: expected.python.invocationPath,
    setupPythonMetadata: Object.fromEntries(["version", "executable", "prefix", "basePrefix"]
      .map(key => [key, expected.python[key]])),
  });
  // ONLY source byte/hash facts are rebound. Every provided non-helper pin
  // must match actual static facts. Startup still compares ALL fresh fields.
  const rebound = { ...expected, helpers: current.helpers };
  createBackendIdentityExpectation(rebound).assertMatches(current);
  supplied.monitoring = current;
  return supplied;
}

export async function prepareCliShutdownFixture({ mode, nativeEnvironment = null,
  protocolPath = "train/fixtures/browser-protocol.json" } = {}) {
  if (!["train/fixtures/browser-protocol.json", "train/fixtures/browser-protocol-v2.json"].includes(protocolPath)) {
    throw new Error("CLI fixture protocol path");
  }
  const supplied = nativeEnvironment === null ? null : structuredClone(nativeEnvironment);
  if (supplied !== null) assertEnvironment(supplied);
  const env = await makeWorkspace();
  const workspaceRoot = await fs.realpath(env.workspaceRoot);
  const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
  const directory = path.join(workspaceRoot, "inputs/harness/train/scripts/browser_eval");
  await fs.mkdir(directory, { recursive: true });
  const source = fileURLToPath(new URL("./", import.meta.url));
  for (const name of await fs.readdir(source)) {
    if (!name.endsWith(".mjs") && !name.endsWith(".py")) continue;
    await fs.copyFile(path.join(source, name), path.join(directory, name));
    await fs.chmod(path.join(directory, name), 0o444);
  }
  await fs.symlink(path.join(repoRoot, "node_modules"), path.join(workspaceRoot, "inputs/harness/node_modules"));
  const fixtures = path.join(workspaceRoot, "inputs/harness/train/fixtures");
  await fs.mkdir(fixtures, { recursive: true });
  for (const name of [path.basename(protocolPath), "browser-parity.json", "browser-openings.json"]) {
    if (name === path.basename(protocolPath)) {
      const protocol = JSON.parse(await fs.readFile(path.join(repoRoot, "train/fixtures", name), "utf8"));
      // Match the existing TEST-only short-clock constants hook, before sealing.
      protocol.limits.timing.phaseMs.check = 8000;
      await fs.writeFile(path.join(fixtures, name), canonicalBytes(protocol));
    } else {
      await fs.copyFile(path.join(repoRoot, "train/fixtures", name), path.join(fixtures, name));
    }
    await fs.chmod(path.join(fixtures, name), 0o444);
  }
  const workspace = structuredClone(env.ws);
  if (protocolPath === "train/fixtures/browser-protocol-v2.json") {
    workspace.schemaVersion = 2;
    workspace.commonIdentity.evaluationPolicy = structuredClone(V2_POLICY);
  }
  const protocolBytes = await fs.readFile(path.join(workspaceRoot, "inputs/harness", protocolPath));
  workspace.commonIdentity.fixtures.protocol = {
    path: protocolPath, byteLength: protocolBytes.length, sha256: sha256Bytes(protocolBytes),
  };
  if (workspace.schemaVersion === 2) {
    env.inputs.harness.files.push({ ...workspace.commonIdentity.fixtures.protocol,
      path: `inputs/harness/${protocolPath}` });
    env.inputs.harness.files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  }
  if (supplied !== null) workspace.commonIdentity.environment =
    await bindCliFixtureNativeEnvironment(supplied, path.join(workspaceRoot, "inputs/harness"));
  workspace.commonIdentity.environment.node.invocationPath = process.execPath;
  workspace.commonIdentity.environment.node.realPath = await fs.realpath(process.execPath);
  const workspacePath = path.join(workspaceRoot, "workspace.json");
  await fs.chmod(workspacePath, 0o644);
  await fs.writeFile(workspacePath, canonicalBytes(workspace));
  await fs.chmod(workspacePath, 0o444);
  await fs.writeFile(path.join(workspaceRoot, "control.json"), JSON.stringify({
    mode, native: nativeEnvironment !== null, workspace, inputs: env.inputs,
  }));
  return { workspaceRoot, repoRoot, cli: path.join(directory, "cli.mjs"),
    hooks: path.join(directory, "cli-shutdown-hooks.mjs") };
}
