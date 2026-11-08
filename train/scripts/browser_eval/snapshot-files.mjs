// Explicit functional runtime closure and immutable file/Git operations.
// No constructor IO. Missing declared runtime files fail closed.
import { privateFs as fsp } from "./private-fs.mjs";
import path from "node:path";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { runSetupCommand } from "./setup-process.mjs";
import { FIXED_LIMITS } from "./schema-constants.mjs";
import { isRel, exactFields, isObj } from "./protocol-values.mjs";

export const RUNTIME_PATHS = Object.freeze([
  "package-lock.json",
  "package.json",
  "train/fixtures/browser-openings.json",
  "train/fixtures/browser-parity.json",
  "train/fixtures/browser-protocol.json",
  "train/scripts/browser_eval/accounting-trace.mjs",
  "train/scripts/browser_eval/artifact-completion-failure.mjs",
  "train/scripts/browser_eval/artifact-completion.mjs",
  "train/scripts/browser_eval/artifact-files.mjs",
  "train/scripts/browser_eval/artifact-owned-file.mjs",
  "train/scripts/browser_eval/artifact-sinks.mjs",
  "train/scripts/browser_eval/artifact-store.mjs",
  "train/scripts/browser_eval/browser-contexts.mjs",
  "train/scripts/browser_eval/browser.mjs",
  "train/scripts/browser_eval/canonical-json.mjs",
  "train/scripts/browser_eval/check-engine.mjs",
  "train/scripts/browser_eval/check-workbench.mjs",
  "train/scripts/browser_eval/checks.mjs",
  "train/scripts/browser_eval/cli.mjs",
  "train/scripts/browser_eval/collector-protocol.mjs",
  "train/scripts/browser_eval/completion-file-observation.mjs",
  "train/scripts/browser_eval/completion-prepared-read.mjs",
  "train/scripts/browser_eval/completion-publication.mjs",
  "train/scripts/browser_eval/driver-bridge-methods.mjs",
  "train/scripts/browser_eval/driver-bridge-wire.mjs",
  "train/scripts/browser_eval/driver-bridge.mjs",
  "train/scripts/browser_eval/driver-protocol.mjs",
  "train/scripts/browser_eval/environment-files.mjs",
  "train/scripts/browser_eval/environment-python-evidence.mjs",
  "train/scripts/browser_eval/environment-python-program.mjs",
  "train/scripts/browser_eval/environment-python.mjs",
  "train/scripts/browser_eval/environment.mjs",
  "train/scripts/browser_eval/final-integrity.mjs",
  "train/scripts/browser_eval/fixture-numeric.mjs",
  "train/scripts/browser_eval/fixture.html",
  "train/scripts/browser_eval/fixture.mjs",
  "train/scripts/browser_eval/identity-schema.mjs",
  "train/scripts/browser_eval/match-observations.mjs",
  "train/scripts/browser_eval/match.mjs",
  "train/scripts/browser_eval/page-arm.mjs",
  "train/scripts/browser_eval/parity-reference.py",
  "train/scripts/browser_eval/pgn-evidence.mjs",
  "train/scripts/browser_eval/pgn-format.mjs",
  "train/scripts/browser_eval/pgn-summary.mjs",
  "train/scripts/browser_eval/phase-fixtures.mjs",
  "train/scripts/browser_eval/phase-runners.mjs",
  "train/scripts/browser_eval/prerequisites.mjs",
  "train/scripts/browser_eval/private-fs.mjs",
  "train/scripts/browser_eval/process-backend-reader.mjs",
  "train/scripts/browser_eval/process-backend.mjs",
  "train/scripts/browser_eval/process-budget.mjs",
  "train/scripts/browser_eval/process-framing.mjs",
  "train/scripts/browser_eval/process-horizon.mjs",
  "train/scripts/browser_eval/process-listeners.mjs",
  "train/scripts/browser_eval/process-lsof-fields.mjs",
  "train/scripts/browser_eval/process-lsof-io.mjs",
  "train/scripts/browser_eval/process-lsof.mjs",
  "train/scripts/browser_eval/process-macos-abi.py",
  "train/scripts/browser_eval/process-macos-native.py",
  "train/scripts/browser_eval/process-macos.py",
  "train/scripts/browser_eval/process-observation.mjs",
  "train/scripts/browser_eval/process-ownership.mjs",
  "train/scripts/browser_eval/process-proof.mjs",
  "train/scripts/browser_eval/process-runtime.mjs",
  "train/scripts/browser_eval/process-stop.mjs",
  "train/scripts/browser_eval/process-transport.mjs",
  "train/scripts/browser_eval/processes.mjs",
  "train/scripts/browser_eval/protocol-values.mjs",
  "train/scripts/browser_eval/receipt-files.mjs",
  "train/scripts/browser_eval/receipt-verification.mjs",
  "train/scripts/browser_eval/record-bookkeeping.mjs",
  "train/scripts/browser_eval/record-evidence.mjs",
  "train/scripts/browser_eval/record-finalization.mjs",
  "train/scripts/browser_eval/record-finalizer.mjs",
  "train/scripts/browser_eval/record-inputs.mjs",
  "train/scripts/browser_eval/record-lifecycle.mjs",
  "train/scripts/browser_eval/record-schema.mjs",
  "train/scripts/browser_eval/records.mjs",
  "train/scripts/browser_eval/reference-child.mjs",
  "train/scripts/browser_eval/run-driver.mjs",
  "train/scripts/browser_eval/run-supervisor.mjs",
  "train/scripts/browser_eval/run.mjs",
  "train/scripts/browser_eval/schema-constants.mjs",
  "train/scripts/browser_eval/schema-primitives.mjs",
  "train/scripts/browser_eval/server.mjs",
  "train/scripts/browser_eval/setup-process-actual.mjs",
  "train/scripts/browser_eval/setup-process.mjs",
  "train/scripts/browser_eval/snapshot-files.mjs",
  "train/scripts/browser_eval/snapshot-identity.mjs",
  "train/scripts/browser_eval/snapshot-io.mjs",
  "train/scripts/browser_eval/snapshot-reopen.mjs",
  "train/scripts/browser_eval/snapshots.mjs",
  "train/scripts/browser_eval/stats.mjs",
  "train/scripts/browser_eval/supervisor-protocol.mjs",
  "train/scripts/browser_eval/watchdog-admission.mjs",
  "train/scripts/browser_eval/watchdog-cleanup-context.mjs",
  "train/scripts/browser_eval/watchdog-cleanup.mjs",
  "train/scripts/browser_eval/watchdog-config.mjs",
  "train/scripts/browser_eval/watchdog-driver-actual.mjs",
  "train/scripts/browser_eval/watchdog-driver.mjs",
  "train/scripts/browser_eval/watchdog-faults.mjs",
  "train/scripts/browser_eval/watchdog-lifetime.mjs",
  "train/scripts/browser_eval/watchdog-operations.mjs",
  "train/scripts/browser_eval/watchdog-ordinary.mjs",
  "train/scripts/browser_eval/watchdog-records.mjs",
  "train/scripts/browser_eval/watchdog-runtime.mjs",
  "train/scripts/browser_eval/watchdog-selftest-operation.mjs",
  "train/scripts/browser_eval/watchdog-shutdown.mjs",
  "train/scripts/browser_eval/watchdog.mjs",
  "train/scripts/browser_eval/workbench-fixture.mjs",
  "train/scripts/browser_eval/workspace-footprint.mjs",
  "train/scripts/check_browser_parity.py"
]);

const fail = (detail) => {
  const error = new Error(`SNAPSHOT_UNAVAILABLE ${detail}`);
  error.code = "SNAPSHOT_UNAVAILABLE";
  return error;
};
const COMMIT = /^[0-9a-f]{40}$/;

export function createSnapshotFiles(options) {
  if (!isObj(options) || !exactFields(options, ["workspaceRoot", "repoRoot", "budget", "lifetime"])) {
    throw fail("file context");
  }
  const own = Object.freeze({ ...options });
  const io = createSnapshotIO(own);
  const context = Object.freeze({ budget: own.budget, lifetime: own.lifetime });
  const git = async (args) => {
    const result = await runSetupCommand({
      executable: "/usr/bin/git",
      args: ["--no-optional-locks", "--no-replace-objects", ...args],
      cwd: own.repoRoot,
      env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_OPTIONAL_LOCKS: "0" },
      maxBytes: FIXED_LIMITS.ipc.frameBytes,
    }, context);
    if (result.exitCode !== 0 || result.stderr.length !== 0) {
      throw fail("Git object read");
    }
    return Buffer.from(result.stdout);
  };
  const readActive = (rel) => io.readAt(own.repoRoot, rel);
  const readFrozen = (rel) => io.readAt(own.workspaceRoot, rel, true);
  const readGit = async (commit, rel) => {
    if (!COMMIT.test(commit) || !isRel(rel)) {
      throw fail("Git blob arguments");
    }
    return git(["show", "--no-textconv", "--no-ext-diff", `${commit}:${rel}`]);
  };
  const listGit = async (commit, prefixes) => {
    if (!COMMIT.test(commit) || !Array.isArray(prefixes) || !prefixes.every(isRel)) {
      throw fail("Git listing arguments");
    }
    const bytes = await git(["ls-tree", "-rz", "--full-tree", commit, "--", ...prefixes]);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text !== "" && !text.endsWith("\0")) {
      throw fail("Git tree framing");
    }
    const paths = text === "" ? [] : text.slice(0, -1).split("\0").map((entry) => {
      const match = /^(100644|100755) blob [0-9a-f]{40}\t(.+)$/.exec(entry);
      if (match === null || !isRel(match[2])) {
        throw fail("Git tree nonregular input");
      }
      return match[2];
    });
    if (new Set(paths).size !== paths.length) {
      throw fail("duplicate Git paths");
    }
    return paths.sort();
  };
  const listActive = (prefixes) => io.listAt(own.repoRoot, [...prefixes]);
  const linkDependencies = async (dependenciesRoot) => {
    const literal = path.join(own.repoRoot, "node_modules");
    const real = await io.call("dependency canonical selection", () => fsp.realpath(literal));
    if (dependenciesRoot !== literal && dependenciesRoot !== real) {
      throw fail("dependency root mismatch");
    }
    return io.linkDependencies(real);
  };
  return Object.freeze({
    readActive, readGit, listGit, listActive,
    writeFrozen: io.writeFrozen, readFrozen, linkDependencies,
  });
}
