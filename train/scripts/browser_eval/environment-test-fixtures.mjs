// TEST-only confined lowlevel environment. Virtual identity paths map into
// one owned temporary root. No actual selected interpreter or SDK runs.
import { EventEmitter } from "node:events";
import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { PYTHON_EXECUTABLE, PYTHON_PREFIX, PYTHON_VERSION, PYTHON_IMPORTS } from "./schema-constants.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { registerFixtureTeardown } from "./watchdog-teardown-test-fixtures.mjs";

export async function makeEnvironmentFixture(t) {
  const root = realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-environment-")));
  const recordRoot = path.join(root, "repo");
  const physical = (absolute) => path.join(root, "files", absolute.slice(1));
  const children = [];
  let now = 1;
  const budget = createBudgetHandle({
    deadlineMonoMs: 90000,
    nowMonoMs: () => now,
    clock: { setTimeout: () => ({}), clearTimeout: () => {} },
  });
  const lifetime = createWatchdogLifetime();
  const finish = () => {
    for (const close of children) {
      close();
    }
  };
  registerFixtureTeardown(t, {
    release: finish,
    afterSettle: () => lifetime.whenSettled(),
    restore: () => budget.dispose(),
    remove: () => fsp.rm(root, { recursive: true, force: true }),
  });
  const write = async (absolute, content) => {
    const target = physical(absolute);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, content);
  };
  const base = "/fixture/Python.framework/Versions/3.11";
  const launcher = `${base}/bin/python3.11`;
  const image = `${base}/Resources/Python.app/Contents/MacOS/Python`;
  const home = "/opt/homebrew/opt/python@3.11/bin";
  const rawBase = "/opt/homebrew/opt/python@3.11/Frameworks/Python.framework/Versions/3.11";
  const wheelPath = "/Users/hansel/Library/Caches/pip/http-v2/0/e/a/a/3/0eaa303e065e0e4f178f5c985c14a536c66920393d8ae37083d4db04.body";
  const chromiumPath = "/fixture/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
  const site = `${PYTHON_PREFIX}/lib/python3.11/site-packages`;
  const aliases = new Map([
    [PYTHON_EXECUTABLE, launcher], [`${home}/python3.11`, launcher],
    [rawBase, base], [process.execPath, "/fixture/node"],
  ]);
  const resolvePath = (absolute) => {
    const identity = aliases.get(absolute) ?? absolute;
    const real = realpathSync(physical(identity));
    if (real !== physical(identity)) {
      return `/${path.relative(path.join(root, "files"), real)}`;
    }
    return identity;
  };
  await write(launcher, "python launcher");
  await write(image, "python actual image");
  await write("/fixture/node", "Node executable bytes");
  await write("/usr/sbin/lsof", "lsof binary bytes");
  await write(`${PYTHON_PREFIX}/pyvenv.cfg`, [
    `home = ${home}`, "include-system-site-packages = false",
    `version = ${PYTHON_VERSION}`, `executable = ${launcher}`,
    `command = ${home}/python3.11 -m venv ${PYTHON_PREFIX}`, "",
  ].join("\n"));
  await write("/System/Library/CoreServices/SystemVersion.plist",
    "<plist><key>ProductBuildVersion</key><string>25A123</string></plist>");
  for (const name of ["process-macos.py", "process-macos-native.py", "process-macos-abi.py"]) {
    await write(`${recordRoot}/train/scripts/browser_eval/${name}`, `# fake helper ${name}\n`);
  }
  await write(`${recordRoot}/package-lock.json`, "{\"lockfileVersion\":3}\n");
  await write(`${recordRoot}/node_modules/playwright/package.json`, JSON.stringify({ name: "playwright", version: "1.0.0" }));
  await write(`${recordRoot}/node_modules/playwright/index.js`, "export const marker = 1;\n");
  await write(`${recordRoot}/node_modules/playwright/node_modules/nested/package.json`, JSON.stringify({ name: "nested", version: "2.0.0" }));
  await write(`${recordRoot}/node_modules/playwright/node_modules/nested/index.js`, "nested build\n");
  await write(chromiumPath, "Chromium binary bytes");
  await write("/fixture/Google Chrome for Testing.app/Contents/Info.plist",
    "<plist><key>CFBundleShortVersionString</key><string>151.0.7922.34</string></plist>");
  await write("/fixture/Google Chrome for Testing.app/Contents/Resources/build.dat", "complete app build\n");
  const wheelBytes = Buffer.from("controlled wheel identity");
  await write(wheelPath, wheelBytes);
  const distributions = [];
  const imports = [];
  for (const [name, version] of [...PYTHON_IMPORTS, ["pip", "25.2"]]) {
    const distInfo = `${name}-${version}.dist-info`;
    const moduleRel = `${name}/__init__.py`;
    const metadataRel = `${distInfo}/METADATA`;
    const recordRel = `${distInfo}/RECORD`;
    const code = Buffer.from(`# controlled ${name}\n`);
    const metadata = Buffer.from(`Name: ${name}\nVersion: ${version}\n`);
    const hash = (bytes) => `sha256=${Buffer.from(sha256Bytes(bytes), "hex").toString("base64url")}`;
    const record = Buffer.from([
      `${moduleRel},${hash(code)},${code.length}`,
      `${metadataRel},${hash(metadata)},${metadata.length}`,
      `${recordRel},,`, "",
    ].join("\n"));
    await write(`${site}/${moduleRel}`, code);
    await write(`${site}/${metadataRel}`, metadata);
    await write(`${site}/${recordRel}`, record);
    const entries = [[moduleRel, code], [metadataRel, metadata], [recordRel, record]]
      .map(([rel, bytes]) => ({ path: `lib/python3.11/site-packages/${rel}`, byteLength: bytes.length, sha256: sha256Bytes(bytes) }))
      .sort((a, b) => a.path < b.path ? -1 : 1);
    distributions.push({
      name, version, buildSha256: sha256Bytes(canonicalBytes(entries)),
      recordPath: `${site}/${recordRel}`, recordByteLength: record.length,
      recordSha256: sha256Bytes(record), wheelSha256: name === "torch" ? sha256Bytes(wheelBytes) : null,
    });
    if (name !== "pip") {
      imports.push({ module: name, version, origin: `${site}/${moduleRel}`, sourceSha256: sha256Bytes(code) });
    }
  }
  distributions.sort((a, b) => a.name < b.name ? -1 : 1);
  imports.sort((a, b) => a.module < b.module ? -1 : 1);
  const audit = {
    distributions, imports, pipVersion: "25.2",
    metadata: { version: PYTHON_VERSION, executable: PYTHON_EXECUTABLE, prefix: PYTHON_PREFIX, basePrefix: rawBase },
    torchWheel: {
      path: wheelPath, sha256: sha256Bytes(wheelBytes), byteLength: wheelBytes.length,
      generated: [], installOnly: [], matchedBytes: 1, matchedHashed: 1, recordRows: 3,
    },
  };
  const spawnCalls = [];
  const spawn = (executable, args, options) => {
    spawnCalls.push({ executable, args: [...args], options });
    const child = new EventEmitter();
    child.pid = 1000 + spawnCalls.length;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    let closed = false;
    const close = () => {
      if (closed) {
        return;
      }
      closed = true;
      child.emit("exit", 0, null);
      child.stdout.emit("close");
      child.stderr.emit("close");
    };
    children.push(close);
    queueMicrotask(() => {
      if (closed) {
        return;
      }
      const output = executable === "/usr/sbin/sysctl" ? Buffer.from("Mac16,1\n") :
        args.includes("freeze") ? Buffer.from("controlled freeze\n") :
        args.includes("check") ? Buffer.from("No broken requirements found.\n") : canonicalBytes(audit);
      child.stdout.emit("data", output);
      close();
    });
    return child;
  };
  class BrowserType {
    executablePath() {
      return chromiumPath;
    }
  }
  const adapters = {
    spawn,
    statFile: (absolute) => fsp.lstat(physical(absolute)),
    createStream: (absolute) => createReadStream(physical(absolute)),
    resolvePath,
    readdir: (absolute) => fsp.readdir(physical(absolute)),
    readlink: (absolute) => fsp.readlink(physical(absolute)),
    osPlatform: () => "darwin", osArch: () => "arm64",
    osRelease: () => "25.6.0", osVersion: () => "Darwin 25.6.0",
    cpus: () => [{ model: "Apple M4" }, { model: "Apple M4" }],
    totalmem: () => 16 * 1024 ** 3,
    loadPlaywright: async () => ({ chromium: new BrowserType() }),
  };
  return {
    root: recordRoot, context: { budget, lifetime }, adapters, audit, write,
    spawnCalls, finish, expire: () => { now = 90001; },
  };
}
