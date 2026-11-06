// TEST-only full CLI archive. Its synthetic identities are never phase proof.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeWorkspace } from "./test-fixtures.mjs";
import { canonicalBytes } from "./canonical-json.mjs";

export async function prepareCliShutdownFixture({ mode, nativeEnvironment = null } = {}) {
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
  for (const name of ["browser-protocol.json", "browser-parity.json", "browser-openings.json"]) {
    await fs.copyFile(path.join(repoRoot, "train/fixtures", name), path.join(fixtures, name));
    await fs.chmod(path.join(fixtures, name), 0o444);
  }
  const workspace = structuredClone(env.ws);
  if (nativeEnvironment !== null) workspace.commonIdentity.environment = structuredClone(nativeEnvironment);
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
