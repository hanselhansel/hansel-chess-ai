// Public operational entry owners. Bootstrap transfers into archived code;
// every supervisor invocation obtains fresh same-owner reopen provenance.
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { sha256Bytes } from "./canonical-json.mjs";
import { deepEqual } from "./schema-primitives.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWatchdogLifetime, observeAwaitStage } from "./watchdog-lifetime.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { captureEnvironment } from "./environment.mjs";
import { captureInputs, reopenInputs } from "./snapshots.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";
import { runSetupCommand } from "./setup-process.mjs";
import { FIXTURE_PATHS, PHASES, FIXED_LIMITS } from "./schema-constants.mjs";
import { executeSupervisor } from "./run-supervisor.mjs";
import { executeDriver } from "./run-driver.mjs";

const now = () => Number(process.hrtime.bigint() / 1000000n);
const fail = (detail) => {
  const error = new Error(`RUN_INVALID ${detail}`);
  error.code = "RUN_INVALID";
  return error;
};
const selection = (options) => {
  if (!isObj(options) || !exactFields(options, ["phase", "candidate", "protocolPath", "workspaceRoot", "repoRoot"])) {
    throw fail("selection fields");
  }
  const { phase, candidate, protocolPath, workspaceRoot, repoRoot } = options ?? {};
  if (!PHASES.includes(phase) || typeof candidate !== "string" || candidate.length === 0 || candidate.length > 200 ||
    !path.isAbsolute(workspaceRoot ?? "") || !path.isAbsolute(repoRoot ?? "") ||
    ![FIXTURE_PATHS.protocol, "train/fixtures/browser-protocol-v2.json", "train/fixtures/browser-protocol-v3.json",
      path.join(repoRoot, "train/fixtures/browser-protocol-v3.json"), path.join(repoRoot, FIXTURE_PATHS.protocol), path.join(repoRoot, "train/fixtures/browser-protocol-v2.json")].includes(protocolPath)) {
    throw fail("fixed phase/candidate/protocol/absolute paths");
  }
  if (["preflight", "compare"].includes(phase) && candidate === "WORKTREE") {
    throw fail("WORKTREE is development-only");
  }
  return Object.freeze({ phase, candidate, protocolPath: path.isAbsolute(protocolPath)
    ? path.relative(repoRoot, protocolPath) : protocolPath, workspaceRoot, repoRoot });
};
const setup = (phaseDeadlineMonoMs = null) => {
  let reportAwaitStage = null;
  if (phaseDeadlineMonoMs !== null) {
    // Best-effort stderr only. No backpressure/callback joins or fault route.
    process.stderr.on("error", () => {});
    reportAwaitStage = (line) => { process.stderr.write(line, () => {}); };
  }
  const lifetime = createWatchdogLifetime({ reportAwaitStage });
  const budget = createBudgetHandle({ deadlineMonoMs: Math.min(now() + 90000, phaseDeadlineMonoMs === null ? Infinity : phaseDeadlineMonoMs),
    clock: { setTimeout, clearTimeout }, nowMonoMs: now });
  return Object.freeze({ lifetime, budget });
};

export async function bootstrapWorkspace(options) {
  const own = selection(options);
  const preparationStart = process.hrtime.bigint();
  const { lifetime, budget } = setup();
  try {
    const reader = createSnapshotIO({ workspaceRoot: own.workspaceRoot, repoRoot: own.repoRoot, budget, lifetime });
    const protocolBytes = await reader.readAt(own.repoRoot, own.protocolPath);
    const selectedProtocol = validateProtocolFixture(parseJSONBytes(protocolBytes));
    const evaluationPolicy = policyForProtocol(selectedProtocol, own.protocolPath);
    let captured;
    if (own.phase === "check") {
      // SnapshotIO exclusively creates the root when capture first writes.
      // Bootstrap never precreates or reuses that immutable workspace.
      const environment = await captureEnvironment({ recordRoot: own.repoRoot }, { budget, lifetime });
      captured = await captureInputs({ candidate: own.candidate, protocolPath: own.protocolPath, evaluationPolicy,
        workspaceRoot: own.workspaceRoot, environment: environment.environment, setupFiles: environment.setupFiles },
      { repoRoot: own.repoRoot, budget, lifetime });
    } else {
      const workspace = parseCanonicalBytes(await reader.readAt(own.workspaceRoot, "workspace.json", true));
      assertRecord("workspace", workspace);
      assertPolicyBinding({ schemaVersion: workspace.schemaVersion,
        evaluationPolicy: workspace.commonIdentity.evaluationPolicy ?? null, protocolPath: own.protocolPath });
      if (workspace.commonIdentity.fixtures.protocol.path !== own.protocolPath) throw fail("requested frozen protocol");
      let commit = null;
      if (own.candidate !== "WORKTREE") {
        const result = await runSetupCommand({ executable: "/usr/bin/git",
          args: ["--no-optional-locks", "--no-replace-objects", "rev-parse", "--verify", "--end-of-options", `${own.candidate}^{commit}`],
          cwd: own.repoRoot, env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" }, maxBytes: 4096 },
        { budget, lifetime });
        if (result.exitCode !== 0 || result.stderr.length !== 0) throw fail("requested Git candidate");
        commit = result.stdout.toString("utf8").trim();
      }
      if (commit === null ? workspace.commonIdentity.candidate.kind !== "WORKTREE" :
        workspace.commonIdentity.candidate.kind !== "commit" || workspace.commonIdentity.candidate.commit !== commit) {
        throw fail("requested frozen candidate");
      }
      captured = { workspace, frozenCliPath: path.join(own.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs") };
    }
    const cliRel = "train/scripts/browser_eval/cli.mjs";
    const current = await reader.readAt(own.repoRoot, cliRel);
    const frozen = await reader.readAt(own.workspaceRoot, `inputs/harness/${cliRel}`, true);
    if (!current.equals(frozen)) throw fail("archived CLI bytes");
    const protocol = await reader.readAt(own.repoRoot, own.protocolPath);
    const frozenProtocol = await reader.readAt(own.workspaceRoot, `inputs/harness/${own.protocolPath}`, true);
    if (!protocol.equals(frozenProtocol) || !protocol.equals(protocolBytes) ||
      !deepEqual(captured.workspace.commonIdentity.fixtures.protocol, { path: own.protocolPath,
        byteLength: protocol.length, sha256: sha256Bytes(protocol) })) throw fail("requested protocol bytes");
    return Object.freeze({ ...own, frozenCliPath: captured.frozenCliPath,
      elapsedPreparationMs: Number(process.hrtime.bigint() - preparationStart) / 1e6,
      preparationDeadlineMonoNs: (BigInt(budget.deadlineMonoMs()) * 1000000n).toString() });
  } finally {
    budget.dispose();
    await lifetime.whenSettled();
  }
}

export async function runSupervisor(options) {
  const own = selection(options);
  const expectedCli = path.join(own.workspaceRoot, "inputs/harness/train/scripts/browser_eval/cli.mjs");
  if (fileURLToPath(new URL("./cli.mjs", import.meta.url)) !== expectedCli) {
    throw fail("supervisor must execute archived CLI");
  }
  const phaseDeadlineMonoMs = now() + FIXED_LIMITS.timing.phaseMs[own.phase];
  const { lifetime, budget } = setup(phaseDeadlineMonoMs);
  try {
    const captured = await reopenInputs({ workspaceRoot: own.workspaceRoot, candidate: own.candidate, protocolPath: own.protocolPath },
      { repoRoot: own.repoRoot, budget, lifetime });
    return await executeSupervisor({ phase: own.phase, workspaceRoot: own.workspaceRoot,
      repoRoot: own.repoRoot, captured, lifetime, budget, phaseDeadlineMonoMs });
  } finally {
    budget.dispose();
    await observeAwaitStage(lifetime, "phase", "run-supervisor.lifetime", () => lifetime.whenSettled());
  }
}

export async function runDriver(options) {
  return executeDriver(options);
}
