// process-backend.test.mjs: the closed BackendIdentity capture through
// injected stat/stream/build/clock adapters. One entry horizon bounds
// every stage, physical receipts register BEFORE their IO initiates,
// binary payloads stream to hash without whole-buffer retention,
// listeners release at the real close event, and ENOENT is the only
// shared-cache path.
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { captureBackendIdentity } from "./process-backend.mjs";
import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import {
  assertBackendIdentity,
  assertCommonIdentity,
} from "./record-schema.mjs";
import { fixtureCommonIdentity, H } from "./test-fixtures.mjs";
import {
  PYTHON_EXECUTABLE,
  PYTHON_PREFIX,
  PYTHON_VERSION,
} from "./schema-constants.mjs";
import {
  fakeClock,
  fakeFile as file,
  fakeFileSystem as boundFs,
} from "./supervision-test-fixtures.mjs";
import { createBudgetHandle } from "./process-budget.mjs";

const PY = PYTHON_EXECUTABLE; // the frozen selected interpreter
const ROOT = "/record";
const PLIST = "/System/Library/CoreServices/SystemVersion.plist";
const acct = (p) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => assert.equal(e.code, "ACCOUNTING_UNAVAILABLE"),
  );

const ready = () => ({
  platform: "darwin",
  arch: "arm64",
  abi: { bsdInfoSize: 136, taskInfoSize: 96 },
  python: {
    executable: PYTHON_EXECUTABLE,
    prefix: PYTHON_PREFIX,
    basePrefix: PYTHON_PREFIX,
    version: PYTHON_VERSION,
  },
});

const HELPERS = [
  `${ROOT}/process-macos.py`,
  `${ROOT}/process-macos-native.py`,
  `${ROOT}/process-macos-abi.py`,
];

// A complete in-memory filesystem for a healthy capture.
const fullFs = () => ({
  [PLIST]: file(
    "<plist><key>ProductBuildVersion</key><string>25A123</string></plist>",
  ),
  [PY]: file("python-bytes"),
  [HELPERS[0]]: file("entry"),
  [HELPERS[1]]: file("core"),
  [HELPERS[2]]: file("abi"),
  "/usr/lib/libproc.dylib": file("libproc-bytes"),
  "/usr/sbin/lsof": file("lsof-bytes"),
});

const capture = (fs, extra = {}) =>
  captureBackendIdentity({
    ready: ready(),
    pythonExecutable: PY,
    helperPaths: HELPERS,
    recordRoot: ROOT,
    statFile: fs.statFile,
    createStream: fs.createStream,
    resolvePath: (p) => p,
    osRelease: () => "25.6.0",
    osVersion: () => "Darwin 25.6.0",
    ...extra,
  });

test("a healthy capture binds real streamed facts into the closed record", async () => {
  const fs = boundFs(fullFs());
  const id = await capture(fs);
  assert.equal(id.backendId, "darwin-arm64-libproc-v1");
  assert.equal(id.helpers.length, 3);
  assert.deepEqual(
    id.helpers.map((h) => h.path),
    [
      "process-macos-abi.py",
      "process-macos-native.py",
      "process-macos.py",
    ],
  );
  assert.equal(
    id.python.sha256,
    createHash("sha256").update("python-bytes").digest("hex"),
  );
  assert.equal(id.libproc.image.kind, "file");
  assert.equal(
    id.lsof.sha256,
    createHash("sha256").update("lsof-bytes").digest("hex"),
  );
});

test("ENOENT on libproc alone selects the shared-cache image bound to osBuild", async () => {
  const files = fullFs();
  delete files["/usr/lib/libproc.dylib"];
  const id = await capture(boundFs(files));
  assert.equal(id.libproc.image.kind, "OS_SHARED_CACHE");
  assert.equal(id.libproc.image.osBuild, "25A123");
});

test("ENOENT anywhere else fails closed, never a cache fallback", async () => {
  const files = fullFs();
  delete files["/usr/sbin/lsof"];
  // A non-libproc ENOENT stays the genuine IO error — it is never
  // normalized into an ACCOUNTING code and never a cache fallback.
  await assert.rejects(capture(boundFs(files)), (e) => e.code === "ENOENT");
});

test("a libproc permission error is distinct from the ENOENT fallback", async () => {
  const files = fullFs();
  const eacces = new Error("permission denied");
  eacces.code = "EACCES";
  files["/usr/lib/libproc.dylib"] = file("x", { statError: eacces });
  // EACCES must never select OS_SHARED_CACHE: the genuine error
  // propagates unchanged and no fallback image is produced.
  await assert.rejects(
    capture(boundFs(files)),
    (e) => e.code === "EACCES",
  );
});

test("a helper outside recordRoot fails confinement", async () => {
  const files = fullFs();
  files["/outside/process-macos-abi.py"] = file("abi");
  await acct(
    capture(boundFs(files), {
      helperPaths: [HELPERS[0], HELPERS[1], "/outside/process-macos-abi.py"],
    }),
  );
});

test("borrowed budget requires the retainActual registrar", async () => {
  const clock = fakeClock();
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 90000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  await acct(capture(boundFs(fullFs()), { budget: handle }));
});

// The bounded owned-reader physical ownership cases — deferred
// receipts before IO, pending-after-public-timeout to real late close,
// cap/restat/raw-IO distinctions and the streamed binary digest
// through a buffer-reusing fake — moved whole to
// process-backend-reader.test.mjs.

// The launcher vs process-image repair (78): the selected venv
// invocation resolves to a LAUNCHER while the collector's real exec
// image is the framework Python.app payload — different bytes/inodes,
// never aliases. The deterministic resolver derives ONLY the canonical
// same-versionroot payload from the pinned invocation; it never learns
// a child-reported path.
const FW_ROOT = "/opt/fw/Python.framework/Versions/3.11";
const FW_LAUNCHER = `${FW_ROOT}/bin/python3.11`;
const FW_PAYLOAD = `${FW_ROOT}/Resources/Python.app/Contents/MacOS/Python`;
const fwFs = () => ({
  ...fullFs(),
  [FW_LAUNCHER]: file("launcher-bytes"),
  [FW_PAYLOAD]: file("payload-bytes"),
});
const fwResolve = (p) => (p === PY ? FW_LAUNCHER : p);

test("a direct nonframework image reuses the launcher fact", async () => {
  const id = await capture(boundFs(fullFs()));
  assert.equal(id.python.realPath, PY);
  assert.equal(id.python.processImage.realPath, PY);
  assert.equal(id.python.processImage.sha256, id.python.sha256);
  assert.equal(
    id.python.processImage.sha256,
    createHash("sha256").update("python-bytes").digest("hex"),
  );
});

test("a framework launcher captures the payload image independently", async () => {
  const id = await capture(boundFs(fwFs()), { resolvePath: fwResolve });
  assert.equal(id.python.realPath, FW_LAUNCHER);
  assert.equal(
    id.python.sha256,
    createHash("sha256").update("launcher-bytes").digest("hex"),
  );
  assert.deepEqual(id.python.processImage, {
    realPath: FW_PAYLOAD,
    sha256: createHash("sha256").update("payload-bytes").digest("hex"),
  });
});

test("the resolver derives the payload deterministically from the invocation alone", () => {
  assert.equal(
    resolvePythonProcessImage(PY, { resolvePath: fwResolve }),
    FW_PAYLOAD,
  );
  assert.equal(
    resolvePythonProcessImage(PY, { resolvePath: (p) => p }),
    PY,
  );
  // The already-canonical payload path resolves to itself — a direct
  // image stays a valid direct image.
  assert.equal(
    resolvePythonProcessImage(FW_PAYLOAD, { resolvePath: (p) => p }),
    FW_PAYLOAD,
  );
});

test("a missing framework payload propagates the raw resolve error", async () => {
  const enoent = Object.assign(new Error("no such file"), {
    code: "ENOENT",
  });
  await assert.rejects(
    capture(boundFs(fwFs()), {
      resolvePath: (p) => {
        if (p === PY) return FW_LAUNCHER;
        if (p === FW_PAYLOAD) throw enoent;
        return p;
      },
    }),
    (e) => e.code === "ENOENT",
  );
});

test("a redirected framework payload fails closed", async () => {
  await acct(
    capture(boundFs(fwFs()), {
      resolvePath: (p) => {
        if (p === PY) return FW_LAUNCHER;
        if (p === FW_PAYLOAD) return "/elsewhere/Python";
        return p;
      },
    }),
  );
});

test("malformed framework launcher layouts fail closed", async () => {
  for (const bad of [
    "/opt/fw/Python.framework/Versions/not-version/bin/python3.11",
    `${FW_ROOT}/bin/python3`,
    "/opt/fw/Python.framework/bin/python3",
  ]) {
    await acct(
      capture(boundFs(fwFs()), { resolvePath: (p) => (p === PY ? bad : p) }),
    );
  }
});

test("the mandatory processImage descriptor is validated exactly", () => {
  const mon = () => structuredClone(fixtureCommonIdentity().environment.monitoring);
  const missing = mon();
  delete missing.python.processImage;
  assert.throws(
    () => assertBackendIdentity(missing),
    (e) => e.code === "SCHEMA_MISSING",
  );
  const rel = mon();
  rel.python.processImage = {
    realPath: "rel/python",
    sha256: rel.python.sha256,
  };
  assert.throws(
    () => assertBackendIdentity(rel),
    (e) => e.code === "SCHEMA_FORMAT",
  );
  const badSha = mon();
  badSha.python.processImage = { realPath: "/opt/x", sha256: "nothex" };
  assert.throws(
    () => assertBackendIdentity(badSha),
    (e) => e.code === "SCHEMA_FORMAT",
  );
  const extra = mon();
  extra.python.processImage = { ...extra.python.processImage, stray: 1 };
  assert.throws(
    () => assertBackendIdentity(extra),
    (e) => e.code === "SCHEMA_EXTRA",
  );
});

test("monitoring python processImage-only drift fails the unchanged coherence guard", () => {
  const drifted = structuredClone(fixtureCommonIdentity());
  // Whole-object REPLACE on the clone: the shared frozen PY_RUNTIME is
  // never mutated and only processImage diverges between the two roles.
  drifted.environment.monitoring.python = {
    ...drifted.environment.monitoring.python,
    processImage: {
      realPath:
        drifted.environment.monitoring.python.processImage.realPath,
      sha256: H(999),
    },
  };
  assert.throws(
    () => assertCommonIdentity(drifted),
    (e) => e.code === "SCHEMA_COHERENCE",
  );
});
