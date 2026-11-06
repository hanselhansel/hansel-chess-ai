// environment-python.mjs is the isolated selected-Python software audit
// for the premanifest environment capture. It runs the actual project
// venv interpreter through the ONE bounded setup-command provider
// (./setup-process.mjs) under the caller's SAME borrowed budget handle
// and genuine watchdog lifetime: THREE fixed `-I -B` one-shot commands —
// the inline stdlib environment audit, `pip freeze --all` and
// `pip check` — each returning raw stdout/stderr/exitCode as DATA. A
// nonzero exit or any stderr byte fails closed before any parsing.
// Every Python child arms a stdlib signal.setitimer against the ORIGINAL
// absolute monotonic budget deadline (deadlineMonoMs/1000 minus
// the same Node epoch, CLOCK_MONOTONIC_RAW on macOS) before any third-party
// import, so no audit child
// can outlive the borrowed horizon and no new clock, deadline, kill,
// grace or retry is invented here.
//
// The audit child measures — it never fabricates — every installed
// distribution's RECORD rows: each listed regular file is lstat-proven
// (no unexpected symlink or prefix escape), hashed entries are verified
// against their expected digests and unhashed install-side entries
// still contribute their actual bytes to the canonical sorted
// {path,byteLength,sha256} build digest. The torch distribution
// additionally proves the FULL cached-wheel correspondence: the whole
// archive body sha256 plus every hashed RECORD member matched against
// real archive member bytes — never a shortcut subset — while hashed
// install-side artifacts (entry-point console stubs, INSTALLER,
// REQUESTED) and unhashed install-only rows (the regenerated RECORD,
// .pyc files, direct_url family) are reported honestly, never blessed
// mismatches. The four required imports are really imported to measure
// their versions, their real confined __file__ origins and their source
// digests; any shadow tinyaz installation or importable module fails
// closed. Raw sys metadata keeps the interpreter's verbatim basePrefix
// alias.
//
// The child's stdout is one bounded canonical-JSON report; the genuine
// evidence leaf (./environment-python-evidence.mjs) parses it and
// re-reads raw RECORD bytes through the owned backend reader under the
// SAME handle/lifetime, emitted as setupFiles evidence that can be
// rechecked independently. The returned {metadata,packages,setupFiles}
// carries data only — no PID, clock, workspace, readiness, phase or
// Native proof fact is ever recorded here.
//
// DAG: environment -> environment-python -> setup-process +
// environment-python-program + environment-python-evidence -> pure
// metadata/reader/canonical helpers. Functional runtime input; never a
// parent, Native or TEST edge.

import { readPythonEnvironmentEvidence } from "./environment-python-evidence.mjs";
import { AUDIT_SCRIPT, PIP_RUNNER } from "./environment-python-program.mjs";
import { exactFields, isAbs, isObj } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import { runSetupCommand } from "./setup-process.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE python-env ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

// The declared default cached torch wheel body (Torch 2.10.0 build 2,
// cp311 macOS arm64) bound when the caller omits torchWheelPath.
const DEFAULT_TORCH_WHEEL =
  "/Users/hansel/Library/Caches/pip/http-v2/0/e/a/a/3/0eaa303e065e0e4f178f5c985c14a536c66920393d8ae37083d4db04.body";

// Fixed minimal child environment: the isolated env plus `-I -B` keep
// user site packages and bytecode writes out of
// every audit child; pip additionally gets version check, network
// fetch, cache and interactive prompts disabled by flag AND by env.
const CHILD_BASE = Object.freeze({
  PATH: "/usr/bin:/bin",
  PYTHONDONTWRITEBYTECODE: "1",
  PYTHONNOUSERSITE: "1",
});
const PIP_FLAGS = Object.freeze({
  PIP_DISABLE_PIP_VERSION_CHECK: "1",
  PIP_NO_CACHE_DIR: "off",
  PIP_NO_INPUT: "1",
  PIP_PROGRESS_BAR: "off",
});

export async function capturePythonEnvironment(
  options,
  context,
  adapters = undefined,
) {
  // Closed options: the pinned selected executable plus an optional
  // cached torch wheel path defaulting to the declared cache body. All
  // validation runs synchronously BEFORE the first retain/IO callout.
  if (
    !isObj(options) ||
    !(
      exactFields(options, ["pythonExecutable"]) ||
      exactFields(options, ["pythonExecutable", "torchWheelPath"])
    )
  ) {
    throw acct("options fields");
  }
  if (options.pythonExecutable !== PYTHON_EXECUTABLE) {
    throw acct("python executable");
  }
  // The validated executable is bound ONCE synchronously — all three
  // child spawns below only ever see this selected scalar, never a
  // caller-mutated options field re-read after an await.
  const pythonExecutable = options.pythonExecutable;
  const wheelPath =
    options.torchWheelPath === undefined
      ? DEFAULT_TORCH_WHEEL
      : options.torchWheelPath;
  if (!isAbs(wheelPath)) throw acct("torch wheel path");

  // Context is EXACTLY {budget, lifetime}: the SAME borrowed
  // BudgetHandle surface and a genuinely branded watchdog lifetime —
  // this leaf never mints an owner, deadline or queue.
  if (!isObj(context) || !exactFields(context, ["budget", "lifetime"])) {
    throw acct("context fields");
  }
  const { budget, lifetime } = context;
  if (
    !isObj(budget) ||
    typeof budget.assertLive !== "function" ||
    typeof budget.onExpire !== "function" ||
    typeof budget.deadlineMonoMs !== "function" ||
    typeof budget.remainingMs !== "function"
  ) {
    throw acct("budget handle");
  }
  assertWatchdogLifetime(lifetime);
  // Bind the admitted resource references before any callout. Direct
  // callers may mutate their context object while a child is awaited.
  const ownedContext = Object.freeze({ budget, lifetime });

  // Isolated tests may replace only lowlevel issuance and filesystem
  // functions. Every supplied binding is checked before the first IO.
  const adapterKeys = ["spawn", "statFile", "createStream", "resolvePath"];
  if (adapters !== undefined && (
    !isObj(adapters) ||
    !Object.keys(adapters).every((key) =>
      adapterKeys.includes(key) && typeof adapters[key] === "function")
  )) {
    throw acct("adapters lowlevel");
  }
  const boundAdapters = Object.freeze({ ...adapters });
  const spawnAdapter = boundAdapters.spawn === undefined
    ? undefined : { spawn: boundAdapters.spawn };

  // The ORIGINAL absolute monotonic bound is snapshotted once and
  // passed verbatim to every child — each arms its own stdlib itimer
  // against it, never a new or reset deadline.
  const deadlineMonoMs = budget.deadlineMonoMs();
  if (typeof deadlineMonoMs !== "number" || !Number.isFinite(deadlineMonoMs)) {
    throw acct("budget deadline");
  }
  const auditEnv = Object.freeze({
    ...CHILD_BASE,
    SETUP_AUDIT_DEADLINE_MONO_MS: String(deadlineMonoMs),
    SETUP_AUDIT_TORCH_WHEEL: wheelPath,
  });
  const pipEnv = Object.freeze({
    ...CHILD_BASE,
    ...PIP_FLAGS,
    SETUP_AUDIT_DEADLINE_MONO_MS: String(deadlineMonoMs),
  });

  // ONE fixed child shape: live guard before AND after the genuine
  // provider call, and any nonzero exit or stderr byte is a closed
  // failure — the child's raw stdout stays DATA for the caller.
  const runChild = async (args, env, tag) => {
    budget.assertLive(tag);
    const result = await runSetupCommand(
      {
        executable: pythonExecutable,
        args,
        cwd: "/",
        env,
        maxBytes: FIXED_LIMITS.ipc.frameBytes,
      },
      ownedContext,
      spawnAdapter,
    );
    budget.assertLive(tag);
    if (result.exitCode !== 0 || result.stderr.length !== 0) {
      const error = acct(`${tag} child`);
      error.command = Object.freeze({
        tag, exitCode: result.exitCode,
        stdoutBytes: result.stdout.length, stderrBytes: result.stderr.length,
        stderr: Buffer.from(result.stderr.subarray(0, 4096)),
      });
      throw error;
    }
    return result;
  };

  const audit = await runChild(
    ["-I", "-B", "-c", AUDIT_SCRIPT],
    auditEnv,
    "python audit",
  );
  const freeze = await runChild(
    [
      "-I", "-B", "-c", PIP_RUNNER,
      "--disable-pip-version-check", "--no-cache-dir", "freeze", "--all",
    ],
    pipEnv,
    "pip freeze",
  );
  const check = await runChild(
    [
      "-I", "-B", "-c", PIP_RUNNER,
      "--disable-pip-version-check", "--no-cache-dir", "check",
    ],
    pipEnv,
    "pip check",
  );

  // The bounded report, both raw pip outputs, the selected wheel path
  // and the SAME borrowed context are handed verbatim to the genuine
  // evidence leaf — ONE delegating return, no parse/read tail here.
  return readPythonEnvironmentEvidence({
    audit,
    freeze,
    check,
    wheelPath,
    context: ownedContext,
    adapters: boundAdapters,
  });
}
