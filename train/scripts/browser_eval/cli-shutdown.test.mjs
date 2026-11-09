// Full CLI regression for planned STOP entering executeDriver's fault catch.
// Genuine archived Node/IPC/Recorder owners. Synthetic Native/SDK, no phase.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { bindCliFixtureNativeEnvironment, prepareCliShutdownFixture } from "./cli-shutdown-test-fixtures.mjs";

for (const mode of ["normal", "cap", "error", "disconnect", "cap-close-error", "cap-send-error", "normal-retained-timer"]) {
  test(`full CLI ${mode} joins owners and pipes and exits naturally`, { timeout: 15000 }, async (t) => {
    const normal = mode.startsWith("normal");
    const env = await prepareCliShutdownFixture({ mode });
    t.after(() => fs.rm(env.workspaceRoot, { recursive: true, force: true }));
    const args = ["--import", env.hooks, env.cli, "check", "--protocol", "train/fixtures/browser-protocol.json",
      "--candidate", "WORKTREE", "--out", env.workspaceRoot, "--repo-root", env.repoRoot,
      "--archived", "--preparation-deadline-ns", (process.hrtime.bigint() + 90000000000n).toString()];
    const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    const pipes = [false, false];
    let exited = false;
    let forced = false;
    let code;
    let signal;
    child.stdout.on("data", (bytes) => stdout.push(bytes));
    child.stderr.on("data", (bytes) => stderr.push(bytes));
    child.stdout.once("close", () => { pipes[0] = true; });
    child.stderr.once("close", () => { pipes[1] = true; });
    child.once("exit", (status, cause) => { exited = true; code = status; signal = cause; });
    const cutoff = setTimeout(() => { forced = true; child.kill("SIGTERM"); }, 11000);
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    clearTimeout(cutoff);
    assert.equal(forced, false, Buffer.concat(stderr).toString());
    assert.equal(exited, true);
    assert.deepEqual(pipes, [true, true]);
    assert.equal(signal, null);
    assert.notEqual(Buffer.concat(stdout).length, 0, Buffer.concat(stderr).toString());
    const outcome = JSON.parse(Buffer.concat(stdout));
    const final = JSON.parse(await fs.readFile(path.join(env.workspaceRoot, "check/final.json")));
    const events = (await fs.readFile(path.join(env.workspaceRoot, "check/events.jsonl"), "utf8"))
      .trim().split("\n").map(JSON.parse);
    assert.equal(code, normal ? 0 : 2, Buffer.concat(stderr).toString());
    assert.equal(outcome.exitCode, code);
    assert.equal(outcome.stopReason, normal ? null : mode.startsWith("cap") ? "PHASE_TIMEOUT" : "IPC_DISCONNECT");
    if (mode.startsWith("cap-")) assert.ok(final.unplannedFaultCount > 0, "genuine close/send fault survives STOP");
    else assert.equal(final.unplannedFaultCount, normal || mode === "cap" ? 0 : 2, Buffer.concat(stderr).toString());
    assert.equal(final.analysisEligible, false);
    const errors = events.filter((event) => event.kind === "fault").map((event) => event.payload.code);
    if (!mode.startsWith("cap-")) assert.deepEqual(errors, normal || mode === "cap" ? [] : ["IPC_DISCONNECT"]);
    const markers = Buffer.concat(stderr).toString();
    for (const stage of ["records.finalize", "shutdown.driver-scope", "shutdown.lifetime", "run-supervisor.lifetime"]) {
      assert.ok(markers.split("\n").some((line) => line.includes(`"stage":"${stage}"`) && line.includes('"state":"fulfilled"')));
    }
    const resources = markers.split("\n").filter((line) => line.startsWith("TINYAZ_RESOURCES "));
    assert.equal(resources.length, 1);
    assert.ok(Buffer.byteLength(resources[0] + "\n") <= 2048);
    const snapshot = JSON.parse(resources[0].slice("TINYAZ_RESOURCES ".length));
    if (mode === "normal-retained-timer") assert.ok(snapshot.types.some((entry) => entry.type === "Timeout" && entry.count >= 1));
    if (mode === "cap") assert.equal(markers.includes('"stage":"driver.fault"'), false);
    if (mode === "error") assert.match(markers, /CONTROLLED_DRIVER/);
    const diagnostics = (await fs.readFile(path.join(env.workspaceRoot, "diagnostics.jsonl"), "utf8"))
      .trim().split("\n").map(JSON.parse);
    assert.equal(diagnostics.some((row) => row.stage === "test-clock" && row.phaseMs === 8000), true);
    assert.equal(diagnostics.some((row) => row.stage === "driver-exit"), true);
    assert.deepEqual(diagnostics.filter((row) => row.stage === "driver-pipe-close").map((row) => row.which).sort(), ["stderr", "stdout"]);
    for (const row of diagnostics.filter((row) => row.stage === "beforeExit")) {
      assert.deepEqual(row.active.filter((resource) => resource.type !== "PIPEWRAP"), []);
      assert.equal(row.resources.includes("Timeout"), false);
    }
    assert.equal(diagnostics.filter((row) => row.stage === "beforeExit").length, 2);
    if (mode === "normal-retained-timer") {
      assert.equal(diagnostics.some((row) => row.stage === "diagnostic-hold-released"), true);
      assert.ok(diagnostics.findIndex((row) => row.stage === "diagnostic-hold-released") <
        diagnostics.findIndex((row) => row.stage === "beforeExit" && row.pid === child.pid));
    }
    const sealed = await Promise.all(["final.json", "completion.json", "events.jsonl"].map((name) => fs.readFile(path.join(env.workspaceRoot, "check", name))));
    await new Promise((resolve) => setImmediate(resolve));
    const reopened = await Promise.all(["final.json", "completion.json", "events.jsonl"].map((name) => fs.readFile(path.join(env.workspaceRoot, "check", name))));
    assert.deepEqual(reopened, sealed);
  });
}

// STATIC actual file/OS identity only, no libproc/collector/browser/model.
import { fixtureCommonIdentity } from "./test-fixtures.mjs";
import { captureSetupBackendIdentity } from "./process-backend.mjs";
import { createBackendIdentityExpectation } from "./process-backend-reader.mjs";
import { PYTHON_EXECUTABLE, PYTHON_PREFIX, PYTHON_VERSION } from "./schema-constants.mjs";
import { fileURLToPath } from "node:url";
const repo = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const helpers = ["process-macos.py", "process-macos-native.py", "process-macos-abi.py"];
const staticBackend = (root, python) => captureSetupBackendIdentity({
  recordRoot: root,
  helperPaths: helpers.map(name => path.join(root, "train/scripts/browser_eval", name)),
  pythonExecutable: python.invocationPath,
  setupPythonMetadata: Object.fromEntries(["version", "executable", "prefix", "basePrefix"].map(k => [k, python[k]])),
});
const nativeEnvironment = async () => {
  const python = { invocationPath: PYTHON_EXECUTABLE, executable: PYTHON_EXECUTABLE,
    prefix: PYTHON_PREFIX, version: PYTHON_VERSION,
    basePrefix: path.dirname(path.dirname(await fs.realpath(PYTHON_EXECUTABLE))) };
  const environment = structuredClone(fixtureCommonIdentity().environment);
  environment.monitoring = await staticBackend(repo, python);
  environment.python.runtime = environment.monitoring.python;
  environment.os = environment.monitoring.os;
  return environment;
};

test("native fixture binds CURRENT copied helper refs rather than stale provided source hashes", async (t) => {
  const supplied = await nativeEnvironment();
  const old = supplied.monitoring.helpers.find(ref => ref.path.endsWith("/process-macos.py"));
  old.byteLength -= 216; old.sha256 = "0".repeat(64);
  const original = structuredClone(supplied);
  const env = await prepareCliShutdownFixture({ mode: "cap", nativeEnvironment: supplied });
  t.after(() => fs.rm(env.workspaceRoot, { recursive: true, force: true }));
  const workspace = JSON.parse(await fs.readFile(path.join(env.workspaceRoot, "workspace.json"), "utf8"));
  const actual = await staticBackend(path.join(env.workspaceRoot, "inputs/harness"), supplied.monitoring.python);
  createBackendIdentityExpectation(workspace.commonIdentity.environment.monitoring).assertMatches(actual);
  assert.deepEqual(supplied, original, "provided environment stays provenance, unchanged");
  assert.deepEqual(workspace.commonIdentity.environment.os, supplied.os);
  assert.deepEqual(workspace.commonIdentity.environment.python, supplied.python);
  assert.deepEqual(workspace.commonIdentity.environment.chromium, supplied.chromium);
});


test("native fixture rejects wrong pins/paths and strict matcher rejects copied-helper tamper", async (t) => {
  const supplied = await nativeEnvironment();
  const before = structuredClone(supplied);
  const env = await prepareCliShutdownFixture({ mode: "cap", nativeEnvironment: supplied });
  t.after(() => fs.rm(env.workspaceRoot, { recursive: true, force: true }));
  const harness = path.join(env.workspaceRoot, "inputs/harness");
  const recorded = JSON.parse(await fs.readFile(path.join(env.workspaceRoot, "workspace.json"), "utf8"));
  for (const field of ["lsof", "python-image", "os"]) {
    const wrong = structuredClone(supplied);
    if (field === "lsof") wrong.monitoring.lsof.sha256 = "0".repeat(64);
    if (field === "python-image") wrong.monitoring.python.processImage.sha256 = "0".repeat(64);
    if (field === "os") {
      wrong.monitoring.os.release = "wrong-release";
      wrong.os.release = "wrong-release";
    }
    await assert.rejects(bindCliFixtureNativeEnvironment(wrong, harness), error =>
      error.code === "ACCOUNTING_UNAVAILABLE" && error.message.includes("expected backend identity"));
  }
  const badPath = structuredClone(supplied);
  badPath.monitoring.helpers[2].path = "train/scripts/browser_eval/unknown.py";
  await assert.rejects(bindCliFixtureNativeEnvironment(badPath, harness), /CLI fixture helper paths/);
  assert.deepEqual(supplied, before);
  const helper = path.join(harness, "train/scripts/browser_eval/process-macos.py");
  await fs.chmod(helper, 0o644);
  await fs.appendFile(helper, "\n# controlled fixture tamper\n");
  const tampered = await staticBackend(harness, supplied.monitoring.python);
  assert.throws(() => createBackendIdentityExpectation(recorded.commonIdentity.environment.monitoring)
    .assertMatches(tampered), error => error.code === "ACCOUNTING_UNAVAILABLE");
});
