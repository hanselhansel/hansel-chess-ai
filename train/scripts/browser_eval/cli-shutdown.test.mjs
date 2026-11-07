// Full CLI regression for planned STOP entering executeDriver's fault catch.
// Genuine archived Node/IPC/Recorder owners. Synthetic Native/SDK, no phase.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prepareCliShutdownFixture } from "./cli-shutdown-test-fixtures.mjs";

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
