import { privateFs as phaseFs } from "./private-fs.mjs";
// Immutable capture tests execute Git data operations and raw model byte
// checks only. Fixture runtime sources are DATA and are never imported.
import assert from "node:assert/strict";
import fs, { promises as fsp, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { createArtifactStore } from "./artifact-store.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { BASELINE_COMMIT, FIXTURE_PATHS, FIXED_LIMITS, PHASES, MODEL_IDENTITY, PYTHON_MODULES } from "./schema-constants.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { deepEqual } from "./schema-primitives.mjs";
import { createSnapshotFiles, RUNTIME_PATHS } from "./snapshot-files.mjs";
import { inventoryDigest, validateModelBytes } from "./snapshot-identity.mjs";
import { captureInputs, verifyIdentity, reopenInputs } from "./snapshots.mjs";
import { runSetupCommand } from "./setup-process.mjs";
import { fixtureCommonIdentity, fixtureManifest } from "./test-fixtures.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { ownFixtureAttempt, registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const modelFile = "public/weights/tinyaz-m.bin";
const own = (t, thunk) => ownFixtureAttempt(t, thunk);
const now = () => Number(process.hrtime.bigint() / 1000000n);

async function fixture(t, { complete = false } = {}) {
  const root = realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-snapshots-")));
  const repoRoot = path.join(root, "repo");
  const workspaceRoot = path.join(root, "workspace");
  const lifetime = createWatchdogLifetime();
  const budget = createBudgetHandle({
    deadlineMonoMs: now() + 90000, nowMonoMs: now,
    clock: { setTimeout, clearTimeout },
  });
  const writable = async (dir) => {
    const st = await phaseFs.lstat(dir);
    if (!st.isDirectory()) {
      return;
    }
    await fsp.chmod(dir, 0o755);
    for (const name of await fsp.readdir(dir)) {
      const child = path.join(dir, name);
      const stat = await phaseFs.lstat(child);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        await writable(child);
      }
    }
  };
  registerFixtureTeardown(t, {
    afterSettle: () => lifetime.whenSettled(),
    restore: () => budget.dispose(),
    remove: async () => {
      await writable(root);
      await fsp.rm(root, { recursive: true, force: true });
    },
  });
  const context = { repoRoot, budget, lifetime };
  const write = (rel, bytes) => own(t, async () => {
    const target = path.join(repoRoot, rel);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, bytes);
  });
  await own(t, () => fsp.mkdir(repoRoot));
  await write("src/a.ts", "source input\n");
  await write("package.json", "{\"name\":\"snapshot-data\",\"version\":\"1.0.0\"}\n");
  await write("package-lock.json", "{\"lockfileVersion\":3}\n");
  await write("node_modules/dependency/data.txt", "shared untouched dependency\n");
  if (complete) {
    for (const rel of [...RUNTIME_PATHS, ...PYTHON_MODULES]) {
      if (!["package.json", "package-lock.json"].includes(rel)) {
        await write(rel, [FIXTURE_PATHS.protocol, "train/fixtures/browser-protocol-v2.json"].includes(rel)
          ? await fsp.readFile(path.join(SOURCE, rel)) : `fixture DATA ${rel}\n`);
      }
    }
    const actual = createSnapshotFiles({ ...context, repoRoot: SOURCE, workspaceRoot });
    await write(modelFile, await own(t, () => actual.readActive(modelFile)));
    await write("public/weights/tinyaz-m.meta.json", "{\"controlled\":true}\n");
    await write("train/requirements-verify.txt", "controlled requirements\n");
  }
  const git = (args) => own(t, async () => {
    const result = await runSetupCommand({
      executable: "/usr/bin/git", args: ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", ...args],
      cwd: repoRoot, maxBytes: 1048576,
      env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid",
        GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid" },
    }, { budget, lifetime });
    assert.equal(result.exitCode, 0, result.stderr.toString());
    return result.stdout.toString().trim();
  });
  await git(["init", "--template=", "-b", "feat/snapshot-data"]);
  await write(".git/objects/info/alternates", `${realpathSync(path.join(SOURCE, ".git/objects"))}\n`);
  const files = createSnapshotFiles({ ...context, workspaceRoot });
  const args = {
    candidate: "WORKTREE", protocolPath: FIXTURE_PATHS.protocol, workspaceRoot,
    environment: fixtureCommonIdentity().environment,
    setupFiles: [{ path: "inputs/setup/unit-data.txt", bytes: Buffer.from("synthetic setup DATA\n") }],
  };
  const capture = (options = args) => own(t, () => captureInputs(options, context));
  return { root, repoRoot, workspaceRoot, context, write, files, git, args, capture };
}

async function manifestFor(t, f, result) {
  const manifest = fixtureManifest({ workspace: result.workspace, inputs: result.inputs });
  const observer = createFootprintObserver({ workspaceRoot: f.workspaceRoot });
  registerFixtureTeardown(t, { restore: () => observer.stop() });
  const store = createArtifactStore({
    workspaceRoot: f.workspaceRoot, readFootprint: observer.readFootprint,
    monotonicNow: now, lifetime: f.context.lifetime,
  });
  await own(t, () => store.writeOnce("check/manifest.json", canonicalBytes(manifest), "ordinary"));
  const mode = (await phaseFs.lstat(path.join(f.workspaceRoot, "check/manifest.json"))).mode;
  assert.notEqual(mode & 0o222, 0);
  return (overrides = {}) => own(t, () => verifyIdentity({
    workspaceId: result.workspace.workspaceId, runId: manifest.runId, phase: "check",
    expectedCommonIdentity: result.workspace.commonIdentity, inputs: result.inputs, ...overrides,
  }, { workspaceRoot: f.workspaceRoot, budget: f.context.budget, lifetime: f.context.lifetime }));
}

test("file owner captures real Git blobs and complete original active paths", async (t) => {
  const f = await fixture(t);
  await f.git(["add", "src", "package.json", "package-lock.json"]);
  await f.git(["commit", "-m", "fixture data"]);
  const commit = await f.git(["rev-parse", "HEAD"]);
  assert.deepEqual(await own(t, () => f.files.listGit(commit, ["src", "package.json", "package-lock.json"])),
    ["package-lock.json", "package.json", "src/a.ts"]);
  assert.equal((await own(t, () => f.files.readGit(commit, "src/a.ts"))).toString(), "source input\n");
  await f.write("src/untracked.ts", "new original path\n");
  assert.deepEqual(await own(t, () => f.files.listActive(["src"])), ["src/a.ts", "src/untracked.ts"]);
  await assert.rejects(own(t, () => f.files.readActive("../escape")), /confined path/);
  await assert.rejects(own(t, () => f.files.readActive("src")), /bounds|regular/);
  await own(t, () => fsp.symlink("a.ts", path.join(f.repoRoot, "src/link.ts")));
  await assert.rejects(own(t, () => f.files.listActive(["src"])), /symlink/);
});

test("writes are exclusive, readonly and actual bytes are independently re-read", async (t) => {
  const f = await fixture(t);
  const bytes = Buffer.from("retained data\n");
  const pending = own(t, () => f.files.writeFrozen("inputs/setup/data.txt", bytes));
  bytes.fill(120);
  const ref = await pending;
  assert.equal(ref.sha256, sha256Bytes(Buffer.from("retained data\n")));
  assert.equal((await own(t, () => f.files.readFrozen(ref.path))).toString(), "retained data\n");
  await assert.rejects(own(t, () => f.files.writeFrozen(ref.path, Buffer.from("overwrite"))), /destination exists/);
  assert.equal((await fsp.stat(path.join(f.workspaceRoot, ref.path))).mode & 0o222, 0);
});

test("actual M validation checks all bytes without model execution", async (t) => {
  const f = await fixture(t);
  const files = createSnapshotFiles({ ...f.context, repoRoot: SOURCE, workspaceRoot: f.workspaceRoot });
  const bytes = await own(t, () => files.readActive(modelFile));
  assert.deepEqual(validateModelBytes(bytes), MODEL_IDENTITY);
  for (const [offset, value, pattern] of [[0, 0, /header/], [4, 2, /header/], [8, 1, /header/], [12, 0, /header/]]) {
    const changed = Buffer.from(bytes);
    changed.writeUInt32LE(value, offset);
    assert.throws(() => validateModelBytes(changed), pattern);
  }
  const nonfinite = Buffer.from(bytes);
  nonfinite.writeFloatLE(NaN, 16);
  assert.throws(() => validateModelBytes(nonfinite), /nonfinite/);
  const changed = Buffer.from(bytes);
  changed[changed.length - 1] ^= 1;
  assert.throws(() => validateModelBytes(changed), /digest|nonfinite/);
});

test("missing runtime input fails closed before any workspace is published", async (t) => {
  const f = await fixture(t, { complete: true });
  await own(t, () => fsp.rm(path.join(f.repoRoot, "train/scripts/browser_eval/cli.mjs")));
  await assert.rejects(f.capture(), (error) => error.code === "ENOENT");
  await assert.rejects(phaseFs.lstat(f.workspaceRoot), (error) => error.code === "ENOENT");
});

test("committed capture rejects dirty Python against requested Git data", async (t) => {
  const f = await fixture(t, { complete: true });
  await f.git(["add", "."]);
  await f.git(["commit", "-m", "fixture runtime data"]);
  await f.write(PYTHON_MODULES[0], "dirty Python DATA\n");
  await assert.rejects(f.capture({ ...f.args, candidate: "HEAD" }), /differs from requested commit.*__init__/);
});

test("WORKTREE capture retains original inventories, readonly links and immutable workspace", async (t) => {
  const f = await fixture(t, { complete: true });
  const hardwareModel = f.args.environment.hardware.model;
  const setupDigest = sha256Bytes(f.args.setupFiles[0].bytes);
  const pending = f.capture();
  f.args.environment.hardware.model = "caller mutation";
  f.args.setupFiles[0].bytes.fill(120);
  const result = await pending;
  assert.equal(result.workspace.commonIdentity.environment.hardware.model, hardwareModel);
  assert.equal(result.inputs.setup.find((ref) => ref.path === "inputs/setup/unit-data.txt").sha256, setupDigest);
  assert.equal(result.workspace.commonIdentity.candidate.kind, "WORKTREE");
  assert.equal(result.workspace.commonIdentity.candidate.commit, null);
  assert.equal(result.workspace.commonIdentity.baseline.commit, BASELINE_COMMIT);
  assert.deepEqual(result.workspace.commonIdentity.pythonReference.files.map((ref) => ref.path), PYTHON_MODULES);
  assert.equal(result.workspace.commonIdentity.harness.contentSha256,
    inventoryDigest(result.workspace.commonIdentity.harness.files));
  assert.equal(result.inputs.model.sha256, MODEL_IDENTITY.sha256);
  assert.equal(result.frozenCliPath, path.join(f.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs"));
  const workspaceBytes = await own(t, () => f.files.readFrozen("workspace.json"));
  assert.deepEqual(parseCanonicalBytes(workspaceBytes), result.workspace);
  for (const role of ["baseline", "candidate", "harness"]) {
    const dir = path.join(f.workspaceRoot, `inputs/${role}`);
    assert.equal(await fsp.readlink(path.join(dir, "node_modules")), path.join(f.repoRoot, "node_modules"));
    assert.equal((await fsp.stat(dir)).mode & 0o222, 0);
  }
  const verify = await manifestFor(t, f, result);
  for (const phase of ["preflight", "compare"]) {
    await assert.rejects(verify({ phase }), /WORKTREE forbidden/);
  }
  for (const target of [result.inputs.candidate.files[0], result.inputs.setup[0], result.inputs.model]) {
    await t.test(`rejects actual frozen tampering ${target.path}`, async (sub) => {
      const file = path.join(f.workspaceRoot, target.path);
      const originalBytes = await own(sub, () => fsp.readFile(file));
      registerFixtureTeardown(sub, { restore: async () => {
        await fsp.chmod(file, 0o644);
        await fsp.writeFile(file, originalBytes);
        await fsp.chmod(file, 0o444);
      } });
      await own(sub, async () => {
        await fsp.chmod(file, 0o644);
        await fsp.writeFile(file, "tampered actual bytes\n");
        await fsp.chmod(file, 0o444);
      });
      await assert.rejects(verify(), /frozen input changed/);
    });
  }
  // Synthetic setup DATA is intentionally unable to obtain genuine
  // environment provenance, even after all frozen bytes match.
  const originalOpen = fs.openSync;
  const originalClose = fs.closeSync;
  const refs = [...result.inputs.baseline.files, ...result.inputs.candidate.files,
    ...result.inputs.harness.files, ...result.inputs.setup, result.inputs.model];
  const targets = new Set(refs.map((ref) => path.join(f.workspaceRoot, ref.path)));
  const opened = new Set();
  const active = new Set();
  let peak = 0;
  fs.openSync = function (target, ...args) {
    const fd = originalOpen.call(this, target, ...args);
    if (targets.has(target)) {
      opened.add(target);
      active.add(fd);
      peak = Math.max(peak, active.size);
    }
    return fd;
  };
  fs.closeSync = function (fd, ...args) {
    const result = originalClose.call(this, fd, ...args);
    active.delete(fd); // Only a successful original physical close retires it.
    return result;
  };
  try {
    await assert.rejects(verify(), /initial capture provenance/);
    assert.equal(opened.size, targets.size);
    assert.equal(active.size, 0);
    assert.equal(peak, 1, "frozen input reads must not overlap open handles");
  } finally {
    fs.openSync = originalOpen;
    fs.closeSync = originalClose;
    await f.context.lifetime.whenSettled();
  }
  const freshOwner = createWatchdogLifetime();
  registerFixtureTeardown(t, { afterSettle: () => freshOwner.whenSettled() });
  await assert.rejects(own(t, () => reopenInputs({
    workspaceRoot: f.workspaceRoot, candidate: "WORKTREE",
  }, { ...f.context, lifetime: freshOwner })), /missing retained setup evidence/);
  await assert.rejects(f.capture(), (error) => error.code === "EEXIST");
});

for (const mutation of ["changed", "added", "deleted"]) {
  test(`capture rejects mixed source ${mutation} during extraction`, async (t) => {
    const f = await fixture(t, { complete: true });
    const originalStat = phaseFs.lstat;
    let changed = false;
    registerFixtureTeardown(t, { restore: () => { phaseFs.lstat = originalStat; } });
    phaseFs.lstat = async function (target, ...rest) {
      if (!changed && target === path.join(f.workspaceRoot, "inputs/candidate/src/a.ts")) {
        changed = true;
        if (mutation === "deleted") {
          await fsp.rm(path.join(f.repoRoot, "src/a.ts"));
        } else {
          await f.write(mutation === "added" ? "src/added.ts" : "src/a.ts", "changed during capture\n");
        }
      }
      return originalStat.call(this, target, ...rest);
    };
    await assert.rejects(f.capture(), /mixed active capture|source path set changed/);
    assert.equal(changed, true);
    assert.equal((await originalStat(f.workspaceRoot)).isDirectory(), true);
    await assert.rejects(originalStat(path.join(f.workspaceRoot, "workspace.json")), (error) => error.code === "ENOENT");
  });
}

test("committed capture records the resolved full commit and exact original inventory", async (t) => {
  const f = await fixture(t, { complete: true });
  await f.git(["add", "."]);
  await f.git(["commit", "-m", "complete fixture data"]);
  const commit = await f.git(["rev-parse", "HEAD"]);
  const result = await f.capture({ ...f.args, candidate: "HEAD" });
  assert.equal(result.workspace.commonIdentity.candidate.kind, "commit");
  assert.equal(result.workspace.commonIdentity.candidate.commit, commit);
  const refs = result.inputs.candidate.files.map((ref) => ({
    ...ref, path: ref.path.slice("inputs/candidate/".length),
  }));
  assert.equal(result.workspace.commonIdentity.candidate.contentSha256, inventoryDigest(refs));
});

test("a spent current handle initiates no snapshot file or Git work", async (t) => {
  const f = await fixture(t);
  f.context.budget.narrow(now() - 1);
  await assert.rejects(own(t, () => f.files.readActive("src/a.ts")),
    (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  await assert.rejects(own(t, () => f.files.writeFrozen("inputs/setup/spent", Buffer.from("data"))),
    (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  await assert.rejects(phaseFs.lstat(f.workspaceRoot), (error) => error.code === "ENOENT");
});

// Only environment acquisition is controlled here. The exact bootstrap body
// executes real captureInputs, SnapshotIO, Git data and pinned byte reads.
test("bootstrap leaves exclusive workspace creation to the actual snapshot owner", async (t) => {
  const f = await fixture(t, { complete: true });
  const source = await own(t, () => fsp.readFile(new URL("./run.mjs", import.meta.url), "utf8"));
  const parsed = ts.createSourceFile("run.mjs", source, ts.ScriptTarget.Latest, true);
  const names = ["now", "fail", "selection", "setup", "bootstrapWorkspace"];
  const selected = parsed.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => names.includes(item.name.getText()))));
  assert.equal(selected.length, names.length);
  const code = selected.map((node) => node.getText(parsed).replace(/^export /, "")).join("\n");
  let environmentCalls = 0;
  let captures = 0;
  let capturedOwner;
  const bindings = {
    path, process, Object, Math, Number, BigInt, Error,
    PHASES, FIXTURE_PATHS, FIXED_LIMITS, isObj, exactFields,
    validateProtocolFixture, policyForProtocol, assertPolicyBinding, deepEqual, sha256Bytes,
    createWatchdogLifetime, createBudgetHandle, createSnapshotIO,
    parseCanonicalBytes, parseJSONBytes, assertRecord: () => { throw new Error("unexpected existing-workspace branch"); },
    captureEnvironment: async (options, context) => {
      environmentCalls += 1;
      assert.equal(options.recordRoot, f.repoRoot);
      context.budget.assertLive("controlled environment acquisition");
      if (environmentCalls === 1) {
        await assert.rejects(phaseFs.lstat(f.workspaceRoot), (error) => error.code === "ENOENT");
      }
      return { environment: f.args.environment, setupFiles: f.args.setupFiles };
    },
    captureInputs: async (options, context) => {
      captures += 1;
      capturedOwner = context.lifetime;
      if (captures === 1) {
        await assert.rejects(phaseFs.lstat(f.workspaceRoot), (error) => error.code === "ENOENT");
      }
      return captureInputs(options, context);
    },
  };
  const bootstrap = new Function(...Object.keys(bindings), `${code}\nreturn bootstrapWorkspace`)(...Object.values(bindings));
  const options = { phase: "check", candidate: "WORKTREE", protocolPath: FIXTURE_PATHS.protocol,
    workspaceRoot: f.workspaceRoot, repoRoot: f.repoRoot };
  const result = await own(t, () => bootstrap(options));
  await capturedOwner.whenSettled();
  assert.equal(environmentCalls, 1);
  assert.equal(captures, 1);
  assert.equal(result.frozenCliPath, path.join(f.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs"));
  const workspace = await own(t, () => fsp.readFile(path.join(f.workspaceRoot, "workspace.json")));
  assert.equal((await fsp.stat(path.join(f.workspaceRoot, "workspace.json"))).mode & 0o222, 0);
  await assert.rejects(own(t, () => bootstrap(options)), (error) => error.code === "EEXIST");
  await capturedOwner.whenSettled();
  assert.equal((await own(t, () => fsp.readFile(path.join(f.workspaceRoot, "workspace.json")))).equals(workspace), true);
});
