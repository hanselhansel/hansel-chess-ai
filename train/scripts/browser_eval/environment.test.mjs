// Pure environment/provider regressions. Fake children carry actual exit and
// BOTH close events. Every attempt belongs to the shared teardown owner.
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";

import { captureEnvironment, verifyEnvironment } from "./environment.mjs";
import { makeEnvironmentFixture, runPythonAuditValidatorCases } from "./environment-test-fixtures.mjs";
import { PYTHON_PREFIX } from "./schema-constants.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { runSetupCommand } from "./setup-process.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import {
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-teardown-test-fixtures.mjs";

const command = () => ({
  executable: "/selected/python",
  args: ["-I", "-B"],
  cwd: "/",
  env: { PATH: "/usr/bin" },
  maxBytes: 8,
});

function fixture(t, onHold = () => {}) {
  const child = new EventEmitter();
  child.pid = 4242;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  let closed = false;
  let releases = 0;
  const lifetime = createWatchdogLifetime({
    createHold: () => {
      onHold();
      return () => { releases += 1; };
    },
  });
  const budget = {
    assertLive: () => {},
    onExpire: () => () => {},
    deadlineMonoMs: () => 100000,
    remainingMs: () => 100000,
  };
  const close = (code = 0, signal = null) => {
    if (closed) {
      return;
    }
    closed = true;
    child.emit("exit", code, signal);
    child.stdout.emit("close");
    child.stderr.emit("close");
  };
  registerFixtureTeardown(t, {
    release: close,
    afterSettle: () => lifetime.whenSettled(),
  });
  return { child, context: { budget, lifetime }, close, releases: () => releases };
}

test("setup snapshots all five command inputs before a retainer callout", async (t) => {
  const input = command();
  const f = fixture(t, () => {
    input.executable = "/changed/python";
    input.cwd = "/changed";
    input.args[0] = "changed";
    input.env.PATH = "changed";
    input.maxBytes = 1;
  });
  let observed;
  const result = ownFixtureAttempt(t, () => runSetupCommand(input, f.context, {
    spawn: (executable, args, options) => {
      observed = { executable, args, options };
      return f.child;
    },
  }));
  assert.equal(observed.executable, "/selected/python");
  assert.equal(observed.options.cwd, "/");
  assert.deepEqual(observed.args, ["-I", "-B"]);
  assert.deepEqual(observed.options.env, { PATH: "/usr/bin" });
  const bytes = Buffer.from("hello");
  f.child.stdout.emit("data", bytes);
  bytes.fill(120);
  f.close();
  const value = await result;
  assert.equal(value.stdout.toString(), "hello");
  assert.equal(value.exitCode, 0);
  await f.context.lifetime.whenSettled();
});

test("setup signal exit rejects while joining actual exit and both pipes", async (t) => {
  const f = fixture(t);
  const result = ownFixtureAttempt(t, () => runSetupCommand(command(), f.context, {
    spawn: () => f.child,
  }));
  const rejection = assert.rejects(result, /exit signal SIGTERM/);
  f.close(null, "SIGTERM");
  await rejection;
  await f.context.lifetime.whenSettled();
  assert.equal(f.releases(), 1);
});

test("setup byte cap charges combined stdout and stderr before append", async (t) => {
  const f = fixture(t);
  const result = ownFixtureAttempt(t, () => runSetupCommand(command(), f.context, {
    spawn: () => f.child,
  }));
  const rejection = assert.rejects(result, /stderr bound/);
  f.child.stdout.emit("data", Buffer.from("12345"));
  f.child.stderr.emit("data", Buffer.from("6789"));
  await rejection;
  assert.equal(f.releases(), 0);
  f.close();
  await f.context.lifetime.whenSettled();
});

test("trusted asynchronous no-child error still waits for BOTH allocated pipes", async (t) => {
  const f = fixture(t);
  f.child.pid = undefined;
  const originalSpawn = childProcess.spawn;
  registerFixtureTeardown(t, {
    restore: () => {
      childProcess.spawn = originalSpawn;
      syncBuiltinESMExports();
    },
  });
  childProcess.spawn = () => f.child;
  syncBuiltinESMExports();
  const error = new Error("creation failed");
  const result = ownFixtureAttempt(t, () => runSetupCommand(command(), f.context));
  const rejection = assert.rejects(result, (actual) => actual === error);
  f.child.emit("error", error);
  await rejection;
  assert.equal(f.releases(), 0);
  f.child.stdout.emit("close");
  assert.equal(f.releases(), 0);
  f.child.stderr.emit("close");
  await f.context.lifetime.whenSettled();
  assert.equal(f.releases(), 1);
});

test("setup preserves a first arbitrary failure value and later physical closure", async (t) => {
  const f = fixture(t);
  const result = ownFixtureAttempt(t, () => runSetupCommand(command(), f.context, {
    spawn: () => f.child,
  }));
  const rejection = result.then(
    () => assert.fail("failure must reject"),
    (error) => assert.equal(error, undefined),
  );
  f.child.stderr.emit("error", undefined);
  await rejection;
  assert.equal(f.releases(), 0);
  f.close();
  await f.context.lifetime.whenSettled();
});

runPythonAuditValidatorCases();

const capture = (t, f, options = {}) => ownFixtureAttempt(t, () => captureEnvironment(
  { recordRoot: f.root, ...options }, f.context, f.adapters,
));
const verify = (t, f, expectedEnvironment) => ownFixtureAttempt(t, () => verifyEnvironment(
  { recordRoot: f.root, expectedEnvironment }, f.context, f.adapters,
));

test("environment assembles authoritative closed identity using class BrowserType", async (t) => {
  const f = await makeEnvironmentFixture(t);
  const result = await capture(t, f);
  assert.equal(f.spawnCalls.length, 4);
  assert.deepEqual(result.environment.monitoring.python, result.environment.python.runtime);
  assert.equal(result.environment.python.runtime.basePrefix, f.audit.metadata.basePrefix);
  assert.equal(result.environment.chromium.version, "151.0.7922.34");
  assert.equal(result.environment.hardware.model, "Mac16,1");
  assert.deepEqual(result.environment.dependencies.packages.map((p) => p.name),
    ["playwright", "playwright/node_modules/nested"]);
  assert.equal(Object.isFrozen(result.environment.launch.args), true);
  assert.equal(Object.isFrozen(result.setupFiles), true);
  const saved = structuredClone(result.environment);
  // Finalizer verification cannot invoke setup tools or public SDK entry.
  f.adapters.spawn = () => assert.fail("post-stop subprocess");
  f.adapters.loadPlaywright = () => assert.fail("post-stop SDK load");
  const verified = await verify(t, f, saved);
  assert.deepEqual(verified, saved);
  assert.equal(f.spawnCalls.length, 4);
  await f.context.lifetime.whenSettled();
});

for (const change of ["node", "package", "record", "wheel", "origin", "lock", "app", "extra"]) {
  test(`environment verifier rejects changed actual ${change}`, async (t) => {
    const f = await makeEnvironmentFixture(t);
    const { environment } = await capture(t, f);
    const targets = {
      node: "/fixture/node",
      package: `${f.root}/node_modules/playwright/index.js`,
      record: f.audit.distributions[0].recordPath,
      wheel: f.audit.torchWheel.path,
      origin: f.audit.imports[0].origin,
      lock: `${f.root}/package-lock.json`,
      app: "/fixture/Google Chrome for Testing.app/Contents/Resources/build.dat",
      extra: `${PYTHON_PREFIX}/lib/python3.11/site-packages/extra.pth`,
    };
    await f.write(targets[change], "changed actual bytes\n");
    f.adapters.spawn = () => assert.fail("verifier must not spawn");
    await assert.rejects(verify(t, f, environment));
    assert.equal(f.spawnCalls.length, 4);
  });
}

test("environment rejects malformed raw setup metadata from the real provider", async (t) => {
  const f = await makeEnvironmentFixture(t);
  f.audit.metadata.basePrefix = "relative";
  await assert.rejects(capture(t, f), /python setup metadata/);
  assert.equal(f.spawnCalls.length, 3);
});

test("environment rejects changed cfg relation and explicit SDK selection mismatch", async (t) => {
  const f = await makeEnvironmentFixture(t);
  await assert.rejects(capture(t, f, { chromiumExecutable: "/other/Chrome" }), /selection binding/);
  assert.equal(f.spawnCalls.length, 3);
  await f.write(`${PYTHON_PREFIX}/pyvenv.cfg`, "home = /invalid\n");
  await assert.rejects(capture(t, f), /venv config missing/);
});

test("environment keeps original budget preissue and post-IO guards", async (t) => {
  const before = await makeEnvironmentFixture(t);
  before.expire();
  await assert.rejects(capture(t, before), (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  assert.equal(before.spawnCalls.length, 0);
  const after = await makeEnvironmentFixture(t);
  const original = after.adapters.statFile;
  after.adapters.statFile = async (file) => {
    const stat = await original(file);
    after.expire();
    return stat;
  };
  await assert.rejects(capture(t, after), (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  assert.equal(after.spawnCalls.length, 3);
});

test("environment rejects foreign provenance and malformed lowlevel adapters before IO", async (t) => {
  const first = await makeEnvironmentFixture(t);
  const second = await makeEnvironmentFixture(t);
  const { environment } = await capture(t, first);
  await assert.rejects(verify(t, second, environment), /initial capture provenance/);
  assert.equal(second.spawnCalls.length, 0);
  second.adapters.statFile = 1;
  await assert.rejects(capture(t, second), /lowlevel adapters/);
  assert.equal(second.spawnCalls.length, 0);
});

test("environment snapshots resource references and lowlevel functions before callouts", async (t) => {
  const f = await makeEnvironmentFixture(t);
  const originalContext = { ...f.context };
  const originalAdapters = { ...f.adapters };
  const spawn = originalAdapters.spawn;
  f.adapters.spawn = (...args) => {
    f.context.budget = { assertLive: () => assert.fail("mutated budget") };
    f.context.lifetime = {};
    for (const key of Object.keys(f.adapters)) {
      f.adapters[key] = () => assert.fail(`mutated adapter ${key}`);
    }
    return spawn(...args);
  };
  const { environment } = await capture(t, f);
  assert.equal(f.spawnCalls.length, 4);
  const verified = await ownFixtureAttempt(t, () => verifyEnvironment({
    recordRoot: f.root, expectedEnvironment: environment,
  }, originalContext, originalAdapters));
  assert.deepEqual(verified, environment);
  assert.equal(f.spawnCalls.length, 4);
});

test("Python facade snapshots validated filesystem functions across its children", async (t) => {
  const { capturePythonEnvironment } = await import("./environment-python.mjs");
  const f = await makeEnvironmentFixture(t);
  const originalContext = { ...f.context };
  const { spawn, statFile, createStream, resolvePath } = f.adapters;
  const adapters = { spawn, statFile, createStream, resolvePath };
  adapters.spawn = (...args) => {
    f.context.budget = { assertLive: () => assert.fail("changed Python budget") };
    f.context.lifetime = {};
    adapters.statFile = () => assert.fail("changed admitted stat function");
    adapters.createStream = () => assert.fail("changed admitted stream function");
    adapters.resolvePath = () => assert.fail("changed admitted resolve function");
    return spawn(...args);
  };
  const result = await ownFixtureAttempt(t, () => capturePythonEnvironment({
    pythonExecutable: f.audit.metadata.executable,
  }, f.context, adapters));
  assert.equal(result.metadata.basePrefix, f.audit.metadata.basePrefix);
  assert.equal(f.spawnCalls.length, 3);
  assert.notEqual(f.context.budget, originalContext.budget);
  assert.notEqual(f.context.lifetime, originalContext.lifetime);
  await originalContext.lifetime.whenSettled();
});

test("verification uses its current live handle on the original genuine owner", async (t) => {
  const f = await makeEnvironmentFixture(t);
  const { environment } = await capture(t, f);
  f.context.budget.dispose();
  const budget = createBudgetHandle({
    deadlineMonoMs: 100, nowMonoMs: () => 1,
    clock: { setTimeout: () => ({}), clearTimeout: () => {} },
  });
  registerFixtureTeardown(t, { restore: () => budget.dispose() });
  const context = { budget, lifetime: f.context.lifetime };
  const issue = () => ownFixtureAttempt(t, () => verifyEnvironment({
    recordRoot: f.root, expectedEnvironment: environment,
  }, context, f.adapters));
  assert.deepEqual(await issue(), environment);
  assert.equal(f.spawnCalls.length, 4);
  budget.narrow(1);
  await assert.rejects(issue(), (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  assert.equal(f.spawnCalls.length, 4);
});

test("Python child failures preserve bounded actual command diagnostics", async (t) => {
  const { capturePythonEnvironment } = await import("./environment-python.mjs");
  const f = fixture(t);
  const stderr = Buffer.alloc(5000, 120);
  const result = ownFixtureAttempt(t, () => capturePythonEnvironment({
    pythonExecutable: "/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/.venv/bin/python",
  }, f.context, { spawn: () => f.child }));
  const rejected = assert.rejects(result, (error) => {
    assert.equal(error.code, "ACCOUNTING_UNAVAILABLE");
    assert.equal(error.command.exitCode, 1);
    assert.equal(error.command.stdoutBytes, 0);
    assert.equal(error.command.stderrBytes, 5000);
    assert.deepEqual(error.command.stderr, stderr.subarray(0, 4096));
    return true;
  });
  f.child.stderr.emit("data", stderr);
  f.close(1);
  await rejected;
});

test("environment binds setup buffers to genuine capture provenance", async (t) => {
  const f = await makeEnvironmentFixture(t);
  const { environment, setupFiles } = await capture(t, f);
  const issue = (files) => ownFixtureAttempt(t, () => verifyEnvironment({
    recordRoot: f.root, expectedEnvironment: environment, setupFiles: files,
  }, f.context, f.adapters));
  assert.deepEqual(await issue(setupFiles), environment);
  const changed = setupFiles.map((file) => ({ path: file.path, bytes: Buffer.from(file.bytes) }));
  changed[0].bytes[0] ^= 1;
  for (const files of [changed, setupFiles.slice(1),
    [...setupFiles, { path: "inputs/setup/zzz-extra", bytes: Buffer.from("forged") }]]) {
    await assert.rejects(issue(files), /setup file provenance/);
  }
  for (const files of [null, undefined]) {
    await assert.rejects(issue(files), /setup files array/);
  }
  assert.equal(f.spawnCalls.length, 4);
});


test("actual Python timer bootstrap subtracts the Node raw epoch without renewing its bound", async () => {
  const { PIP_RUNNER } = await import("./environment-python-program.mjs");
  const script = `
import ast, json, sys
from types import SimpleNamespace
program = ast.parse(json.loads(sys.stdin.read()))
body = []
for node in program.body:
    if isinstance(node, ast.Import) and any(item.name == "runpy" for item in node.names):
        break
    if not isinstance(node, (ast.Import, ast.ImportFrom)):
        body.append(node)
code = compile(ast.Module(body=body, type_ignores=[]), "actual-deadline-bootstrap", "exec")
for deadline, expected in [(5090000, 90.0), (5000000, None), (4999999, None)]:
    armed = []
    raw_calls = []
    def raw(clock):
        raw_calls.append(clock)
        return 5000.0
    namespace = {"os":SimpleNamespace(environ={"SETUP_AUDIT_DEADLINE_MONO_MS":str(deadline)}),
        "sys":SimpleNamespace(platform="darwin", exit=sys.exit),
        "time":SimpleNamespace(monotonic=lambda: 1.0, clock_gettime=raw, CLOCK_MONOTONIC_RAW=4),
        "signal":SimpleNamespace(ITIMER_REAL=0, setitimer=lambda clock, delay: armed.append([clock, delay]))}
    try:
        exec(code, namespace)
        assert expected is not None and armed == [[0, expected]], armed
    except SystemExit as error:
        assert expected is None and not armed and "deadline" in str(error)
    assert raw_calls == [4]
print(json.dumps({"remainingSeconds":90,"spentCases":2}))
`;
  const result = childProcess.spawnSync("/usr/bin/python3", ["-I", "-B", "-c", script], {
    input: JSON.stringify(PIP_RUNNER), encoding: "utf8", timeout: 10000, maxBuffer: 4096,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { remainingSeconds: 90, spentCases: 2 });
});
