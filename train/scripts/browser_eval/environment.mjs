// Premanifest environment capture and post-stop static remeasurement.
// Only capture runs setup children. Verification borrows genuine initial
// metadata provenance and remeasures current bytes/OS under the SAME bound.
import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { createEnvironmentFiles } from "./environment-files.mjs";
import { capturePythonEnvironment } from "./environment-python.mjs";
import { assertEnvironment } from "./identity-schema.mjs";
import { captureSetupBackendIdentity } from "./process-backend.mjs";
import { exactFields, isAbs, isObj, isRel } from "./protocol-values.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { runSetupCommand } from "./setup-process.mjs";

const BIN_CAP = 512 * 1024 * 1024;
const TEXT_CAP = 8 * 1024 * 1024;
const PROVENANCE = new WeakMap();
const ADAPTERS = [
  "spawn", "statFile", "createStream", "resolvePath", "readdir", "readlink",
  "osPlatform", "osArch", "osRelease", "osVersion", "cpus", "totalmem", "loadPlaywright",
];
const fail = (detail) => {
  const error = new Error(`ACCOUNTING_UNAVAILABLE environment ${detail}`);
  error.code = "ACCOUNTING_UNAVAILABLE";
  return error;
};
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const subset = (adapters, names) => Object.fromEntries(
  names.filter((name) => adapters[name] !== undefined).map((name) => [name, adapters[name]]),
);
const bindAdapters = (adapters) => {
  if (adapters !== undefined && (!isObj(adapters) ||
    !Object.keys(adapters).every((key) =>
      ADAPTERS.includes(key) && typeof adapters[key] === "function"))) {
    throw fail("lowlevel adapters");
  }
  return Object.freeze({
    statFile: (p) => fsp.lstat(p),
    createStream: (p) => createReadStream(p),
    resolvePath: realpathSync,
    ...adapters,
  });
};
const ownContext = (context) => {
  if (!isObj(context) || !exactFields(context, ["budget", "lifetime"])) {
    throw fail("context fields");
  }
  return Object.freeze({ budget: context.budget, lifetime: context.lifetime });
};
const ownOptions = (options, keys) => {
  if (!isObj(options) || !isAbs(options.recordRoot) ||
    !Object.keys(options).every((key) => keys.includes(key))) {
    throw fail("options");
  }
  return Object.freeze({ ...options });
};
const pythonAdapters = (a) => subset(a, ["spawn", "statFile", "createStream", "resolvePath"]);
const fileAdapters = (a) => subset(a, ["statFile", "createStream", "resolvePath", "readdir", "readlink"]);
const setupFile = (name, value) => ({
  path: `inputs/setup/${name}.json`, bytes: canonicalBytes(value),
});
const ownSetupFiles = (files) => {
  if (!Array.isArray(files)) {
    throw fail("setup files array");
  }
  const own = files.map((file) => {
    if (!isObj(file) || !exactFields(file, ["path", "bytes"]) ||
      !isRel(file.path) || !file.path.startsWith("inputs/setup/") || !Buffer.isBuffer(file.bytes)) {
      throw fail("setup file binding");
    }
    return { path: file.path, bytes: Buffer.from(file.bytes) };
  });
  if (own.some((file, i) => i > 0 && own[i - 1].path >= file.path)) {
    throw fail("setup file order");
  }
  return own;
};
const setupDescriptors = (files) => files.map((file) => ({
  path: file.path, byteLength: file.bytes.length, sha256: sha256Bytes(file.bytes),
}));
const fingerprint = (environment) => sha256Bytes(canonicalBytes(environment));

// This shared assembly contains no subprocess or SDK-load path. Raw sys
// metadata, pip stdout digests and sysctl model remain initial observations;
// every current file, inventory, package version, OS and CPU fact is measured.
async function measure(recordRoot, initial, context, a, files) {
  const { budget, lifetime } = context;
  const backend = await captureSetupBackendIdentity({
    setupPythonMetadata: initial.metadata,
    pythonExecutable: initial.metadata.executable,
    recordRoot,
    helperPaths: ["process-macos.py", "process-macos-native.py", "process-macos-abi.py"]
      .map((name) => path.join(recordRoot, "train/scripts/browser_eval", name)),
    budget,
    retainActual: lifetime.retainActual,
    ...subset(a, ["statFile", "createStream", "resolvePath", "osPlatform", "osArch", "osRelease", "osVersion"]),
  });
  const installed = await files.pythonInstalled(initial.metadata.prefix);
  const audited = initial.audit.distributions.map((d) => ({
    name: d.name, version: d.version, buildSha256: d.buildSha256,
  }));
  if (!deepEqual(installed.distributions, audited)) {
    throw fail("installed Python build");
  }
  const recordFacts = [...installed.records].sort((x, y) => compare(x.path, y.path));
  const expectedRecords = initial.audit.distributions.map((d) => ({
    path: d.recordPath, byteLength: d.recordByteLength, sha256: d.recordSha256,
  })).sort((x, y) => compare(x.path, y.path));
  if (!deepEqual(recordFacts, expectedRecords)) {
    throw fail("Python RECORD facts");
  }
  for (const imp of initial.packages.imports) {
    if (files.resolve(imp.origin) !== imp.origin) {
      throw fail("Python import origin");
    }
    const fact = await files.read(imp.origin, BIN_CAP, "Python import", true);
    if (fact.sha256 !== imp.sourceSha256) {
      throw fail("Python import bytes");
    }
  }
  const wheel = initial.audit.torchWheel;
  const wheelFact = await files.read(wheel.path, BIN_CAP, "Python wheel", true);
  if (wheelFact.sha256 !== wheel.sha256 || wheelFact.byteLength !== wheel.byteLength) {
    throw fail("Python wheel bytes");
  }
  const executable = async (invocationPath, version) => {
    const realPath = files.resolve(invocationPath);
    const fact = await files.read(realPath, BIN_CAP, "executable", true);
    return { invocationPath, realPath, sha256: fact.sha256, version };
  };
  const node = await executable(process.execPath, process.version);
  const lock = await files.read(path.join(recordRoot, "package-lock.json"), TEXT_CAP, "package lock");
  const depsRoot = files.resolve(path.join(recordRoot, "node_modules"));
  const nodeInventory = await files.inventory(depsRoot, "node-bin");
  const packages = [];
  const rootPackage = /^(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*\/package\.json$/;
  for (const entry of nodeInventory.files.filter((f) => rootPackage.test(f.path))) {
    const prefix = entry.path.slice(0, -"/package.json".length);
    const fact = await files.read(path.join(depsRoot, entry.path), TEXT_CAP, "Node package metadata");
    const pkg = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fact.buf));
    if (typeof pkg.version !== "string" || pkg.version.length === 0 ||
      typeof pkg.name !== "string" || pkg.name.length === 0) {
      throw fail("Node package metadata");
    }
    const content = nodeInventory.files.filter((f) =>
      f.path.startsWith(`${prefix}/`) && !f.path.startsWith(`${prefix}/node_modules/`),
    ).map((f) => ({ ...f, path: f.path.slice(prefix.length + 1) }));
    packages.push({ name: prefix, version: pkg.version, buildSha256: sha256Bytes(canonicalBytes(content)) });
  }
  packages.sort((x, y) => compare(x.name, y.name));
  if (packages.length === 0) {
    throw fail("installed Node packages");
  }
  const chromeReal = files.resolve(initial.chromiumExecutable);
  const match = /^(.*\.app)\/Contents\/MacOS\/[^/]+$/.exec(chromeReal);
  if (match === null) {
    throw fail("Chromium app path");
  }
  const plist = await files.read(path.join(match[1], "Contents/Info.plist"), TEXT_CAP, "Chromium plist");
  const versions = [...plist.buf.toString("utf8").matchAll(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/g,
  )];
  if (versions.length !== 1 || !/^\d+(?:\.\d+){3}$/.test(versions[0][1])) {
    throw fail("Chromium version");
  }
  const chromium = await executable(initial.chromiumExecutable, versions[0][1]);
  const appInventory = await files.inventory(match[1], "framework");
  budget.assertLive("hardware");
  const cpus = (a.cpus ?? os.cpus)();
  const physicalMemoryBytes = (a.totalmem ?? os.totalmem)();
  budget.assertLive("hardware");
  if (!Array.isArray(cpus) || cpus.length === 0 ||
    cpus.some((cpu) => typeof cpu.model !== "string" || cpu.model.length === 0) ||
    !Number.isSafeInteger(physicalMemoryBytes) || physicalMemoryBytes <= 0) {
    throw fail("hardware facts");
  }
  const environment = freezeDeep({
    node,
    python: { runtime: backend.python, ...structuredClone(initial.packages) },
    dependencies: { packageLockSha256: lock.sha256, packages },
    chromium,
    launch: {
      host: "127.0.0.1", headless: true, viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1, args: [],
      securityOptionsSha256: sha256Bytes(canonicalBytes({
        headless: true, chromiumSandbox: true, ignoreDefaultArgs: false, args: [],
      })),
    },
    os: backend.os,
    hardware: {
      model: initial.hardwareModel,
      cpuModel: [...new Set(cpus.map((cpu) => cpu.model))].sort(compare).join(", "),
      logicalCpus: cpus.length,
      physicalMemoryBytes,
    },
    monitoring: backend,
  });
  assertEnvironment(environment);
  budget.assertLive("environment measurement");
  return { environment, nodeInventory, appInventory, installed };
}

export async function captureEnvironment(options, context, adapters = undefined) {
  context = ownContext(context);
  const own = ownOptions(options, ["recordRoot", "pythonExecutable", "chromiumExecutable"]);
  const pythonExecutable = own.pythonExecutable === undefined
    ? PYTHON_EXECUTABLE : own.pythonExecutable;
  if (pythonExecutable !== PYTHON_EXECUTABLE || own.chromiumExecutable !== undefined &&
    !isAbs(own.chromiumExecutable)) {
    throw fail("executable selection");
  }
  const a = bindAdapters(adapters);
  const files = createEnvironmentFiles(context, fileAdapters(a));
  const python = await capturePythonEnvironment({ pythonExecutable }, context, pythonAdapters(a));
  const summary = python.setupFiles.find((f) => f.path === "inputs/setup/python-audit-summary.json");
  const audit = parseCanonicalBytes(summary.bytes);
  const playwright = await files.call("load Playwright", () =>
    a.loadPlaywright === undefined ? import("playwright") : a.loadPlaywright(),
  );
  if (typeof playwright?.chromium?.executablePath !== "function") {
    throw fail("public Chromium selection");
  }
  context.budget.assertLive("Chromium selection");
  const chromiumExecutable = playwright.chromium.executablePath();
  context.budget.assertLive("Chromium selection");
  if (!isAbs(chromiumExecutable) || own.chromiumExecutable !== undefined &&
    own.chromiumExecutable !== chromiumExecutable) {
    throw fail("Chromium selection binding");
  }
  const tool = await runSetupCommand({
    executable: "/usr/sbin/sysctl", args: ["-n", "hw.model"], cwd: "/",
    env: { PATH: "/usr/bin:/bin" }, maxBytes: 4096,
  }, context, a.spawn === undefined ? undefined : { spawn: a.spawn });
  const hardwareModel = tool.stdout.toString("utf8").trim();
  if (tool.exitCode !== 0 || tool.stderr.length !== 0 ||
    !/^[A-Za-z0-9,._ -]{1,128}$/.test(hardwareModel)) {
    throw fail("hardware model");
  }
  const initial = freezeDeep({
    metadata: structuredClone(python.metadata), packages: structuredClone(python.packages),
    audit: structuredClone(audit), chromiumExecutable, hardwareModel,
  });
  const measured = await measure(own.recordRoot, initial, context, a, files);
  const setupFiles = [
    ...python.setupFiles.map((f) => ({ path: f.path, bytes: Buffer.from(f.bytes) })),
    setupFile("node-build-inventory", measured.nodeInventory),
    setupFile("chromium-build-inventory", measured.appInventory),
    setupFile("python-build-inventory", measured.installed.inventory),
    setupFile("environment-static", { environment: measured.environment, metadata: initial.metadata }),
    { path: "inputs/setup/hardware-model.txt", bytes: Buffer.from(tool.stdout) },
  ].sort((x, y) => compare(x.path, y.path));
  if (setupFiles.some((f, i) => i > 0 && setupFiles[i - 1].path === f.path)) {
    throw fail("duplicate setup evidence");
  }
  context.budget.assertLive("environment capture");
  let captures = PROVENANCE.get(context.lifetime);
  if (captures === undefined) {
    captures = new Map();
    PROVENANCE.set(context.lifetime, captures);
  }
  const key = fingerprint(measured.environment);
  const provenance = {
    recordRoot: own.recordRoot, initial,
    nodeSha256: measured.nodeInventory.sha256, appSha256: measured.appInventory.sha256,
    pythonSha256: measured.installed.inventory.sha256,
    setupDescriptors: freezeDeep(setupDescriptors(setupFiles)),
  };
  const previous = captures.get(key);
  if (previous !== undefined && (
    previous.recordRoot !== provenance.recordRoot ||
    previous.nodeSha256 !== provenance.nodeSha256 || previous.appSha256 !== provenance.appSha256 ||
    previous.pythonSha256 !== provenance.pythonSha256 ||
    !deepEqual(previous.setupDescriptors, provenance.setupDescriptors)
  )) {
    throw fail("conflicting initial capture provenance");
  }
  captures.set(key, previous ?? provenance);
  return Object.freeze({
    environment: measured.environment,
    setupFiles: Object.freeze(setupFiles.map((f) => Object.freeze(f))),
  });
}

export async function verifyEnvironment(options, context, adapters = undefined) {
  context = ownContext(context);
  const own = ownOptions(options, ["expectedEnvironment", "recordRoot", "setupFiles"]);
  if (!exactFields(own, ["expectedEnvironment", "recordRoot"]) &&
    !exactFields(own, ["expectedEnvironment", "recordRoot", "setupFiles"])) {
    throw fail("verify fields");
  }
  const setup = Object.hasOwn(own, "setupFiles") ? ownSetupFiles(own.setupFiles) : null;
  const expected = freezeDeep(structuredClone(own.expectedEnvironment));
  assertEnvironment(expected);
  const a = bindAdapters(adapters);
  const files = createEnvironmentFiles(context, fileAdapters(a));
  context.budget.assertLive("environment verify");
  const provenance = PROVENANCE.get(context.lifetime)?.get(fingerprint(expected));
  if (provenance === undefined || provenance.recordRoot !== own.recordRoot) {
    throw fail("initial capture provenance");
  }
  if (setup !== null && !deepEqual(setupDescriptors(setup), provenance.setupDescriptors)) {
    throw fail("setup file provenance");
  }
  const measured = await measure(own.recordRoot, provenance.initial, context, a, files);
  if (!deepEqual(measured.environment, expected) ||
    measured.nodeInventory.sha256 !== provenance.nodeSha256 ||
    measured.appInventory.sha256 !== provenance.appSha256 ||
    measured.installed.inventory.sha256 !== provenance.pythonSha256) {
    throw fail("environment changed");
  }
  context.budget.assertLive("environment verified");
  return measured.environment;
}
