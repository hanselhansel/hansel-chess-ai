import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import {
  APP_ENV_REL_PATH,
  mergeAppEnv,
  parseAppEnv,
  projectRoot,
  readAppEnv,
} from "./with-app-env.mjs";

const execFileAsync = promisify(execFile);
const WRAPPER_SOURCE = join(projectRoot(), "scripts/with-app-env.mjs");
const PRINT_FLAG = "process.stdout.write(String(process.env.VITE_AUTH_ENABLED));";
const AUTH_OFF_JSON = '{"VITE_AUTH_ENABLED":"false"}';

function tempDir(t, prefix = "app-env-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function makeWorkspace(t, appEnvJson) {
  const root = tempDir(t);
  if (appEnvJson !== undefined) {
    mkdirSync(join(root, ".grok"), { recursive: true });
    writeFileSync(join(root, APP_ENV_REL_PATH), appEnvJson);
  }
  return root;
}

// The exact shipped wrapper beside the fixture's .grok/app-env.json: the copy
// computes projectRoot() from its own scripts/ location, so the fixture, not
// this checkout, supplies the app env.
function makeWrapperWorkspace(t, appEnvJson = AUTH_OFF_JSON) {
  const root = makeWorkspace(t, appEnvJson);
  mkdirSync(join(root, "scripts"), { recursive: true });
  const wrapper = join(root, "scripts/with-app-env.mjs");
  copyFileSync(WRAPPER_SOURCE, wrapper);
  return { root, wrapper };
}

// Drop only the ambient flag so the file value is what the child sees; the
// rest of the ordinary process environment passes through.
function childEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.VITE_AUTH_ENABLED;
  return { ...env, ...overrides };
}

test("keeps VITE_-prefixed string entries", () => {
  assert.deepEqual(parseAppEnv('{"VITE_AUTH_ENABLED":"false"}'), {
    VITE_AUTH_ENABLED: "false",
  });
});

test("drops non-VITE keys, non-string values and malformed documents", () => {
  assert.deepEqual(parseAppEnv('{"DATABASE_URL":"postgres://x","VITE_N":1,"VITE_OK":"y"}'), {
    VITE_OK: "y",
  });
  assert.deepEqual(parseAppEnv("not json"), {});
  assert.deepEqual(parseAppEnv('["VITE_AUTH_ENABLED"]'), {});
  assert.deepEqual(parseAppEnv("null"), {});
});

test("a missing app-env.json is a clean no-op", (t) => {
  assert.deepEqual(readAppEnv(makeWorkspace(t)), {});
});

test("reads the app env from a workspace", (t) => {
  const root = makeWorkspace(t, AUTH_OFF_JSON);
  assert.deepEqual(readAppEnv(root), { VITE_AUTH_ENABLED: "false" });
});

test("an explicit process-env override wins over the file", () => {
  const merged = mergeAppEnv(
    { VITE_AUTH_ENABLED: "false" },
    { VITE_AUTH_ENABLED: "true", PATH: "/usr/bin" },
  );
  assert.equal(merged.VITE_AUTH_ENABLED, "true");
  assert.equal(merged.PATH, "/usr/bin");
});

test("the controlled auth-off fixture supplies the flag", (t) => {
  const root = makeWorkspace(t, AUTH_OFF_JSON);
  assert.deepEqual(readAppEnv(root), { VITE_AUTH_ENABLED: "false" });
});

test("vite loadEnv resolves the wrapped value", (t) => {
  // What `import.meta.env.VITE_AUTH_ENABLED` becomes: loadEnv prefix-matches
  // process.env, so the wrapper's merge has to land before Vite starts.
  // Do not `import { loadEnv } from "vite"` here — Vite 8 loads rolldown
  // native bindings that SIGSEGV the test worker under qemu-user.
  const root = makeWorkspace(t, AUTH_OFF_JSON);
  const merged = mergeAppEnv(readAppEnv(root), { PATH: "/usr/bin" });
  assert.equal(merged.VITE_AUTH_ENABLED, "false");
});

test("the wrapped command runs with the app env applied", async (t) => {
  const { wrapper } = makeWrapperWorkspace(t);
  const { stdout } = await execFileAsync(
    process.execPath,
    [wrapper, process.execPath, "-e", PRINT_FLAG],
    { env: childEnv() },
  );
  assert.equal(stdout, "false");
});

test("the wrapped command sees an explicit override, not the file value", async (t) => {
  const { wrapper } = makeWrapperWorkspace(t);
  const { stdout } = await execFileAsync(
    process.execPath,
    [wrapper, process.execPath, "-e", PRINT_FLAG],
    { env: childEnv({ VITE_AUTH_ENABLED: "true" }) },
  );
  assert.equal(stdout, "true");
});

test("the wrapper propagates the command's exit code", async (t) => {
  const { wrapper } = makeWrapperWorkspace(t);
  await assert.rejects(
    execFileAsync(process.execPath, [wrapper, process.execPath, "-e", "process.exit(3)"], {
      env: childEnv(),
    }),
    (err) => err.code === 3,
  );
});

test("a signal-killed command is never reported as success", async (t) => {
  // The wrapper's own SIGTERM handler must not swallow the re-raised signal:
  // a cancelled build reporting exit 0 is a silently passing gate.
  const { wrapper } = makeWrapperWorkspace(t);
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        wrapper,
        process.execPath,
        "-e",
        "process.kill(process.pid, 'SIGTERM');setTimeout(() => {}, 1000);",
      ],
      { env: childEnv() },
    ),
    (err) => err.signal === "SIGTERM" || err.code !== 0,
  );
});

test("the CLI still runs when invoked through a symlinked path", async (t) => {
  // node realpaths import.meta.url but not process.argv[1], so a raw comparison
  // turns the wrapper into a no-op that exits 0 without starting anything.
  const { root } = makeWrapperWorkspace(t);
  const linkParent = tempDir(t, "app-env-link-");
  const link = join(linkParent, "scripts");
  symlinkSync(join(root, "scripts"), link);
  const { stdout } = await execFileAsync(
    process.execPath,
    [join(link, "with-app-env.mjs"), process.execPath, "-e", PRINT_FLAG],
    { env: childEnv() },
  );
  assert.equal(stdout, "false");
});
