// process-backend-setup.test.mjs: the C4b-09 static backend-identity
// owner — the strict pyvenv.cfg parser, the bounded static setup
// capture and the pure monitor-capture factory through injected
// stat/stream/build/clock adapters only. Every platform fact is a
// fake, explicitly isolated and never availability evidence: no
// Kernel, real child, actual environment mutation or Native work.
// The static descriptor is expectation data only — never a Native
// readiness or bootstrap proof — and the fresh startup comparison
// still flows through the genuine verified-ready capture under the
// SAME borrowed handle and actual retainer.
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import {
  captureBackendIdentity,
  captureSetupBackendIdentity,
  createMonitorBackendCapture,
} from "./process-backend.mjs";
import {
  parsePythonVenvConfiguration,
  createBackendIdentityExpectation,
} from "./process-backend-reader.mjs";
import { fixtureCommonIdentity } from "./test-fixtures.mjs";
import { PYTHON_PREFIX, PYTHON_VERSION } from "./schema-constants.mjs";
import {
  fakeClock,
  fakeFile as file,
  fakeFileSystem as boundFs,
} from "./supervision-test-fixtures.mjs";
import {
  BACKEND_SETUP,
  backendSetupAdapters as adapters,
  backendSetupFiles as fullFs,
  backendSetupReady as ready,
} from "./process-backend-test-fixtures.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";

const {
  PY, ROOT, PLIST, CFG, HOME, LAUNCH, BASE, HELPERS, CFG_TEXT,
} = BACKEND_SETUP;
const acct = (p) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => assert.equal(e.code, "ACCOUNTING_UNAVAILABLE"),
  );

const captureReady = (fs, extra = {}) =>
  captureBackendIdentity({ ready: ready(), ...adapters(fs, extra) });
// The setup entry REQUIRES the isolated setup python metadata as
// static expectation data — supplied here only, never through the
// factory's captureOptions.
const captureSetup = (fs, extra = {}) =>
  captureSetupBackendIdentity({
    setupPythonMetadata: ready().python,
    ...adapters(fs, extra),
  });
const handle = (clock, ms = 90000) =>
  createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + ms,
    clock,
    nowMonoMs: clock.nowMs,
  });

test("the config-derived static descriptor equals the verified capture on the same facts", async () => {
  const fs = boundFs(fullFs());
  const [setup, verified] = await Promise.all([
    captureSetup(fs),
    captureReady(fs),
  ]);
  assert.deepEqual(setup, verified);
  assert.equal(setup.python.executable, PY);
  assert.equal(setup.python.prefix, PYTHON_PREFIX);
  assert.equal(setup.python.basePrefix, BASE);
  assert.equal(setup.python.version, PYTHON_VERSION);
});

// The framework launcher layout: the recorded executable and the
// resolved home/python3.11 bind to the same canonical launcher while
// the process image hashes the distinct Python.app payload bytes.
// The RAW basePrefix stays an /opt/homebrew-style alias whose
// canonical path is the framework version root.
const FW_ROOT = "/opt/fw/Python.framework/Versions/3.11";
const FW_LAUNCHER = `${FW_ROOT}/bin/python3.11`;
const FW_PAYLOAD = `${FW_ROOT}/Resources/Python.app/Contents/MacOS/Python`;
const FW_BASE_RAW =
  "/opt/homebrew/opt/python@3.11/Frameworks/Python.framework/Versions/3.11";
const fwResolve = (p) =>
  p === PY || p === FW_LAUNCHER
    ? FW_LAUNCHER
    : p === FW_BASE_RAW
      ? FW_ROOT
      : p;

test("the setup capture retains and hashes both launcher and payload bytes", async () => {
  const fwCfg = [
    `home = ${FW_ROOT}/bin`,
    "include-system-site-packages = false",
    `version = ${PYTHON_VERSION}`,
    `executable = ${FW_LAUNCHER}`,
    `command = ${FW_ROOT}/bin/python3.11 -m venv ${PYTHON_PREFIX}`,
    "",
  ].join("\n");
  const fs = boundFs({
    ...fullFs(),
    [CFG]: file(fwCfg),
    [FW_LAUNCHER]: file("launcher-bytes"),
    [FW_PAYLOAD]: file("payload-bytes"),
  });
  const fwPython = { ...ready().python, basePrefix: FW_BASE_RAW };
  const [id, verified] = await Promise.all([
    captureSetup(fs, {
      resolvePath: fwResolve,
      setupPythonMetadata: fwPython,
    }),
    captureBackendIdentity({
      ready: { ...ready(), python: fwPython },
      ...adapters(fs, { resolvePath: fwResolve }),
    }),
  ]);
  assert.deepEqual(id, verified);
  assert.equal(id.python.realPath, FW_LAUNCHER);
  assert.equal(
    id.python.sha256,
    createHash("sha256").update("launcher-bytes").digest("hex"),
  );
  assert.deepEqual(id.python.processImage, {
    realPath: FW_PAYLOAD,
    sha256: createHash("sha256").update("payload-bytes").digest("hex"),
  });
  // The RAW sys.base_prefix alias is preserved verbatim — never the
  // canonical framework root it resolves to.
  assert.equal(id.python.basePrefix, FW_BASE_RAW);
});

test("a non-darwin host or malformed host adapter rejects before any IO", async () => {
  for (const extra of [
    { osPlatform: () => "linux" },
    { osArch: () => "x64" },
    { osPlatform: 42 },
    { osArch: null },
    // Malformed setup-python metadata — null, extra-field and
    // schema-drifted version/executable/prefix/basePrefix — fails the
    // same synchronous closed check before any IO.
    { setupPythonMetadata: null },
    { setupPythonMetadata: { ...ready().python, extra: "x" } },
    { setupPythonMetadata: { ...ready().python, version: "3.10.9" } },
    {
      setupPythonMetadata: {
        ...ready().python,
        executable: "/elsewhere/bin/python",
      },
    },
    { setupPythonMetadata: { ...ready().python, prefix: "/elsewhere" } },
    { setupPythonMetadata: { ...ready().python, basePrefix: "rel/base" } },
  ]) {
    const fs = boundFs(fullFs());
    await acct(captureSetup(fs, extra));
    assert.equal(fs.calls.length, 0);
  }
  // An absent setupPythonMetadata is the same pre-IO rejection.
  const fs = boundFs(fullFs());
  await acct(captureSetupBackendIdentity(adapters(fs)));
  assert.equal(fs.calls.length, 0);
});

test("the strict config parser fails closed on every malformed variant", () => {
  const good = parsePythonVenvConfiguration(CFG_TEXT);
  assert.deepEqual(
    Object.keys(good).sort(),
    ["command", "executable", "home", "includeSystemSitePackages", "version"],
  );
  assert.equal(good.includeSystemSitePackages, false);
  assert.equal(good.version, PYTHON_VERSION);
  const bad = [
    `${CFG_TEXT}home = /x\n`, // duplicate field
    CFG_TEXT.replace("home =", "surprise ="), // unknown field
    CFG_TEXT.replace(`home = ${HOME}\n`, ""), // missing field
    CFG_TEXT.replace("version =", "version"), // malformed line
    CFG_TEXT.replace("version = 3.11.14", "version = 3.10.9"),
    CFG_TEXT.replace("packages = false", "packages = true"),
    CFG_TEXT.replace(`home = ${HOME}`, "home = rel/bin"),
    CFG_TEXT.replace(`executable = ${LAUNCH}`, "executable = python3"),
    "home", // bare malformed prelude
    "home = ", // empty value
  ];
  for (const text of bad) {
    assert.throws(
      () => parsePythonVenvConfiguration(text),
      (e) => e.code === "ACCOUNTING_UNAVAILABLE",
    );
  }
  assert.throws(() => parsePythonVenvConfiguration(42));
  // A replacement character proves non-strict decoding reached the
  // parser — it fails closed before any field handling.
  assert.throws(() => parsePythonVenvConfiguration(`x = �`));
});

test("home, executable and command bindings fail closed on the actual config", async () => {
  const withCfg = (text) => ({ ...fullFs(), [CFG]: file(text) });
  // Recorded executable resolving elsewhere fails the invocation bind.
  await acct(
    captureSetup(
      boundFs(withCfg(CFG_TEXT.replace(
        `executable = ${LAUNCH}`,
        "executable = /elsewhere/bin/python3.11",
      ))),
    ),
  );
  // A home whose python3.11 resolves elsewhere fails the same bind.
  await acct(
    captureSetup(
      boundFs(withCfg(CFG_TEXT.replace(
        `home = ${HOME}`,
        "home = /opt/other/bin",
      ))),
    ),
  );
  // Paths bind but the recorded venv command drifted.
  await acct(
    captureSetup(
      boundFs(withCfg(CFG_TEXT.replace(
        ` -m venv ${PYTHON_PREFIX}`,
        " -m venv /opt/other",
      ))),
    ),
  );
  // A schema-valid metadata whose RAW basePrefix resolves to a
  // different canonical root than the launcher's parent-parent fails
  // closed on the same actual facts.
  await acct(
    captureSetup(boundFs(fullFs()), {
      setupPythonMetadata: { ...ready().python, basePrefix: "/opt/other" },
    }),
  );
});

test("ready-shaped input, malformed UTF-8 and a broken prelude perform no IO", async () => {
  const fs = boundFs(fullFs());
  // A supplied ready-shaped option fails BEFORE the borrowed reader
  // sees any stat or stream call.
  await acct(captureSetupBackendIdentity({ ready: ready(), ...adapters(fs) }));
  assert.equal(fs.calls.length, 0);
  // Malformed UTF-8 bytes are read through the bounded leaf then fail
  // strict decode before any further fact stage runs.
  const badBytes = boundFs({
    ...fullFs(),
    [CFG]: file(Buffer.from([0xff, 0xfe, 0x41])),
  });
  await acct(captureSetup(badBytes));
  assert.ok(
    badBytes.calls.every((c) => c.includes("pyvenv.cfg")),
    "no fact stage beyond the config read",
  );
  // A prelude that is not `key = value` fails the strict parser the
  // same way — config read only, nothing further.
  const prelude = boundFs({
    ...fullFs(),
    [CFG]: file("home\ninclude-system-site-packages = false\n"),
  });
  await acct(captureSetup(prelude));
  assert.ok(
    prelude.calls.every((c) => c.includes("pyvenv.cfg")),
    "no fact stage beyond the config read",
  );
});

test("a supplied malformed expectation or null rejects before any IO", () => {
  assert.equal(createBackendIdentityExpectation(undefined), null);
  const opts = {
    expectedBackendIdentity: undefined,
    captureOptions: adapters(boundFs(fullFs())),
  };
  const drifted = structuredClone(
    fixtureCommonIdentity().environment.monitoring,
  );
  drifted.backendId = "other-backend";
  for (const bad of [null, {}, drifted, 42]) {
    assert.throws(() => createBackendIdentityExpectation(bad));
    assert.throws(() =>
      createMonitorBackendCapture({ ...opts, expectedBackendIdentity: bad }),
    );
  }
});

test("the expected snapshot stays immune to mutation of the original input", () => {
  const source = structuredClone(
    fixtureCommonIdentity().environment.monitoring,
  );
  const expected = createBackendIdentityExpectation(source);
  // Mutating the original after construction can never move the
  // expectation — it was already copied and deep-frozen.
  source.python.sha256 = "f".repeat(64);
  source.os.build = "00AAAA";
  expected.assertMatches(
    structuredClone(fixtureCommonIdentity().environment.monitoring),
  );
  assert.throws(
    () => expected.assertMatches(source),
    (e) => e.code === "ACCOUNTING_UNAVAILABLE",
  );
  // A malformed actual fails its own closed-shape check first.
  assert.throws(() => expected.assertMatches({}));
});

test("expected match and mismatch run through the genuine capture on the borrowed handle", async () => {
  const clock = fakeClock();
  const fs = boundFs(fullFs());
  // The expectation is itself a real static capture of the same facts.
  const expected = await captureSetup(fs);
  const lifetime = createWatchdogLifetime();
  const matching = createMonitorBackendCapture({
    expectedBackendIdentity: expected,
    captureOptions: adapters(fs),
  });
  // The genuine verified-ready capture runs under the SAME borrowed
  // start handle and the operation lifetime's real retainer.
  await matching.verifyStartup(ready(), handle(clock), lifetime.retainActual);
  const drift = boundFs({ ...fullFs(), [LAUNCH]: file("different-bytes") });
  const mismatched = createMonitorBackendCapture({
    expectedBackendIdentity: expected,
    captureOptions: adapters(drift),
  });
  await acct(
    mismatched.verifyStartup(ready(), handle(clock), lifetime.retainActual),
  );
});

test("an already-spent original handle performs no fresh IO", async () => {
  const clock = fakeClock();
  const fs = boundFs(fullFs());
  const expected = await captureSetup(fs);
  const spent = handle(clock, 5);
  clock.advance(10);
  const callsBefore = fs.calls.length;
  const backendCapture = createMonitorBackendCapture({
    expectedBackendIdentity: expected,
    captureOptions: adapters(fs),
  });
  await assert.rejects(
    backendCapture.verifyStartup(ready(), spent, () => {}),
    (e) => e.code === "ACCOUNTING_UNAVAILABLE",
  );
  assert.equal(fs.calls.length, callsBefore);
});

test("an omitted expectation keeps isolated compatibility while capture stays real", async () => {
  const clock = fakeClock();
  const fs = boundFs(fullFs());
  const backendCapture = createMonitorBackendCapture({
    expectedBackendIdentity: undefined,
    captureOptions: adapters(fs),
  });
  assert.equal(backendCapture.verifyStartup, null);
  const id = await backendCapture.capture(ready(), handle(clock), () => {});
  assert.equal(id.backendId, "darwin-arm64-libproc-v1");
  assert.equal(
    id.python.sha256,
    createHash("sha256").update("python-bytes").digest("hex"),
  );
});
