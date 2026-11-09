#!/usr/bin/env node
// No implicit phase chain. Each public command requests one fixed phase.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapWorkspace, runSupervisor, runDriver } from "./run.mjs";

// Only the Watchdog's published, independently verified outcome supplies
// verdicts. This projection cannot create verdicts from a driver request.
const projectOutcome = (outcome) => {
  if (outcome.schemaVersion !== 2) return outcome;
  if (outcome.completionRef === null || outcome.completionRef === undefined) {
    throw new Error("verified v2 outcome requires published completion");
  }
  const { schemaVersion, policyId, status, exitCode, stopReason, strengthVerdict,
    resourceVerdict, closureResourceVerdict, completionRef } = outcome;
  return { schemaVersion, policyId, status, exitCode, stopReason, strengthVerdict,
    resourceVerdict, closureResourceVerdict, completionRef };
};

// Passive post-return diagnostics only. No timer, wait, proof or status work.
const reportActiveResourceTypes = () => {
  try {
    const counts = new Map();
    let truncated = false;
    for (const type of process.getActiveResourcesInfo()) {
      if (typeof type !== "string" || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(type) ||
        (!counts.has(type) && counts.size === 16)) {
        truncated = true;
        continue;
      }
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    const types = [...counts].map(([type, count]) => ({ type, count }));
    const line = `TINYAZ_RESOURCES ${JSON.stringify({ types, truncated })}\n`;
    if (Buffer.byteLength(line) <= 2048) process.stderr.write(line, () => {});
  } catch {} // Best effort, never replacement of an actual result or error.
};

const parse = (argv) => {
  const values = {};
  const flags = new Set(["--archived", "--driver"]);
  const keys = new Set(["--protocol", "--candidate", "--out", "--repo-root", "--manifest", "--workspace-root", "--preparation-deadline-ns"]);
  let phase = null;
  for (let index = 0; index < argv.length; index += 1) {
    const word = argv[index];
    if (flags.has(word)) {
      if (Object.hasOwn(values, word)) throw new Error("duplicate CLI flag");
      values[word] = true;
    } else if (keys.has(word)) {
      if (Object.hasOwn(values, word) || index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
        throw new Error("missing or duplicate CLI value");
      }
      values[word] = argv[++index];
    } else if (phase === null && ["check", "parity", "preflight", "compare"].includes(word)) {
      phase = word;
    } else {
      throw new Error("unknown CLI argument");
    }
  }
  return { phase, values };
};

try {
  const { phase, values } = parse(process.argv.slice(2));
  const entry = fileURLToPath(import.meta.url);
  if (values["--driver"]) {
    const allowed = ["--driver", "--manifest", "--workspace-root", "--repo-root"];
    if (phase !== null || Object.keys(values).length !== allowed.length || allowed.some((key) => !Object.hasOwn(values, key))) {
      throw new Error("closed driver arguments");
    }
    const workspaceRoot = values["--workspace-root"];
    if (entry !== path.join(workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs")) {
      throw new Error("driver must execute archived CLI");
    }
    await runDriver({ manifestPath: path.join(workspaceRoot, values["--manifest"]),
      workspaceRoot, repoRoot: values["--repo-root"] });
  } else {
    const archived = values["--archived"] === true;
    const allowed = archived ? ["--protocol", "--candidate", "--out", "--repo-root", "--archived", "--preparation-deadline-ns"]
      : ["--protocol", "--candidate", "--out"];
    if (phase === null || Object.keys(values).length !== allowed.length || allowed.some((key) => !Object.hasOwn(values, key))) {
      throw new Error("closed public phase arguments");
    }
    const repoRoot = archived ? values["--repo-root"] : path.resolve(path.dirname(entry), "../../..");
    const options = { phase, candidate: values["--candidate"], protocolPath: values["--protocol"],
      workspaceRoot: values["--out"], repoRoot };
    if (archived) {
      const end = values["--preparation-deadline-ns"];
      if (!/^[0-9]{1,24}$/.test(end) || process.hrtime.bigint() >= BigInt(end)) {
        throw new Error("original immutable preparation deadline spent before transfer");
      }
      const outcome = await runSupervisor(options);
      reportActiveResourceTypes();
      process.stdout.write(`${JSON.stringify(projectOutcome(outcome))}\n`);
      process.exitCode = outcome.exitCode;
    } else {
      const launch = await bootstrapWorkspace(options);
      await new Promise((resolve, reject) => process.stdout.write(`${JSON.stringify({
        stage: "immutable-preparation", elapsedMs: launch.elapsedPreparationMs,
      })}\n`, (error) => error ? reject(error) : resolve()));
      if (typeof process.execve !== "function") throw new Error("Node process.execve required for archived transfer");
      if (process.hrtime.bigint() >= BigInt(launch.preparationDeadlineMonoNs)) {
        throw new Error("original immutable preparation deadline spent before transfer");
      }
      process.execve(process.execPath, [process.execPath, launch.frozenCliPath, phase,
        "--protocol", launch.protocolPath, "--candidate", launch.candidate, "--out", launch.workspaceRoot,
        "--repo-root", launch.repoRoot, "--archived", "--preparation-deadline-ns", launch.preparationDeadlineMonoNs], process.env);
      throw new Error("archived process transfer returned");
    }
  }
} catch (error) {
  process.stderr.write(`${String(error?.code ?? "RUN_INVALID")}: ${String(error?.message ?? error).slice(0, 4096)}\n`);
  process.exitCode = 1;
}
