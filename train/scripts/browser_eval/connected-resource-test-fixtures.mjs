// C4b-11c TEST-only shared fixture leaf for the connected-resource
// owners. The COMPLETE helper bodies move here whole from
// server.test.mjs and browser.test.mjs under the declared export-alias
// names — `makePage`, `HTML` and the fake server/browser/process stay
// private. Imports are Node plus the existing pure canonical/schema/
// test-fixtures modules plus the one per-test teardown owner
// (watchdog-teardown-test-fixtures.mjs — Node-only, no project
// backedge): every created root removes through that owner's release ->
// settle -> afterSettle -> restore -> remove order instead of an
// independent t.after, and ownResourceStart wraps each issued
// startFixtureServer/openBrowser through ownFixtureAttempt. Never
// server/browser/browser-contexts or any *.test.mjs owner.
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { MODEL_IDENTITY } from "./schema-constants.mjs";
import { canonicalBytes } from "./canonical-json.mjs";
import { makeTmpDir } from "./test-fixtures.mjs";
import {
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-teardown-test-fixtures.mjs";

// The recorded launch security binding (11d): the actual launchServer
// MUST run chromiumSandbox:true — the installed SDK would otherwise add
// --no-sandbox. securityOptionsSha256 is the REAL digest over
// canonicalBytes({headless,chromiumSandbox,ignoreDefaultArgs,args});
// the browser recomputes and checks this exact constant, no mere isHash.
const SECURITY_OPTIONS = Object.freeze({
  headless: true,
  chromiumSandbox: true,
  ignoreDefaultArgs: false,
  args: ["--use-mock-keychain"],
});
const securityOptionsSha256 = () =>
  createHash("sha256")
    .update(canonicalBytes({
      headless: SECURITY_OPTIONS.headless, chromiumSandbox: SECURITY_OPTIONS.chromiumSandbox,
      ignoreDefaultArgs: false, args: [...SECURITY_OPTIONS.args],
    }))
    .digest("hex");

export const BROWSER_ENV = Object.freeze({
  chromium: {
    invocationPath: "/opt/chromium/Chrome",
    realPath: "/opt/chromium/Chrome.app/Contents/MacOS/Chromium",
    sha256: "a".repeat(64),
    version: "131.0.0",
  },
  launch: {
    host: "127.0.0.1",
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [...SECURITY_OPTIONS.args],
    securityOptionsSha256: securityOptionsSha256(),
  },
});

// Fixed-shape capabilities; each register call awaits its own gate so
// ordering before connect/context/model work is provable.
export const makeBrowserCaps = ({ gates = [], signal } = {}) => {
  const calls = [];
  const events = [];
  let called;
  const calledPromise = new Promise((resolve) => {
    called = resolve;
  });
  return {
    runId: "test-run",
    signal: signal ?? new AbortController().signal,
    calls,
    events,
    calledPromise,
    register: async (fields) => {
      const index = calls.length;
      calls.push({ ...fields });
      called();
      if (gates[index] !== undefined) await gates[index];
      return { identity: null, listener: fields.listener };
    },
    event: async (kind, payload) => {
      events.push({ kind, payload });
    },
  };
};

// The fake page surface: handlers for on() registration plus goto
// recording — the public shape the context owner drives.
const makePage = () => ({
  handlers: {},
  gotos: [],
  on(name, fn) {
    (this.handlers[name] ??= []).push(fn);
  },
  async goto(url) {
    this.gotos.push(url);
  },
  async close() {},
});

// The actual BrowserType surface is a CLASS instance exposing public
// launchServer/connect — a bare-literal fake would let the suite pass
// against a call shape the real SDK never had.
class FakeBrowserType {
  constructor(calls, server, browser) {
    this.calls = calls;
    this.server = server;
    this.browser = browser;
  }
  async launchServer(options) {
    this.calls.launchOptions = options;
    return this.server;
  }
  async connect(url) {
    this.calls.connects.push(url);
    return this.browser;
  }
}

// Fake Playwright: launchServer records options and returns a fake
// BrowserServer whose process/wsEndpoint/connect are all spied.
export const fakePlaywright = (
  { ws, pid = 43210, closeErrors = [], failContext = -1 } = {},
) => {
  const calls = {
    contexts: [],
    pages: [],
    connects: [],
    launchOptions: null,
    server: null,
    browser: null,
    proc: null,
  };
  const proc = {
    pid,
    handlers: {},
    on(name, fn) {
      (this.handlers[name] ??= []).push(fn);
    },
    emit(name) {
      for (const fn of this.handlers[name] ?? []) fn();
    },
  };
  const browser = {
    handlers: {},
    closed: 0,
    on(name, fn) {
      (this.handlers[name] ??= []).push(fn);
    },
    emit(name) {
      for (const fn of this.handlers[name] ?? []) fn();
    },
    newContext: async (options) => {
      if (calls.contexts.length === failContext) {
        calls.contexts.push({ failed: true, closed: 0 });
        throw new Error("context creation failed");
      }
      const context = {
        options,
        routes: [],
        pages: [],
        closed: 0,
        route: async (glob, handler) => {
          context.routes.push({ glob, handler });
        },
        newPage: async () => {
          const page = makePage();
          context.pages.push(page);
          calls.pages.push(page);
          return page;
        },
        close: async () => {
          context.closed += 1;
        },
      };
      calls.contexts.push(context);
      return context;
    },
    close: async () => {
      browser.closed += 1;
      if (closeErrors[0] !== undefined) throw closeErrors[0];
    },
  };
  const server = {
    closed: 0,
    wsEndpoint: () => ws ?? "ws://127.0.0.1:18123/secret-capability-token",
    process: () => proc,
    close: async () => {
      server.closed += 1;
      if (closeErrors[1] !== undefined) throw closeErrors[1];
    },
  };
  calls.server = server;
  calls.browser = browser;
  calls.proc = proc;
  return { calls, chromium: new FakeBrowserType(calls, server, browser) };
};

export const makeBrowserArgs = async (t, caps, overrides = {}) => {
  const workspaceRoot = await makeTmpDir("be-browser-");
  registerFixtureTeardown(t, {
    remove: () => fsp.rm(workspaceRoot, { recursive: true, force: true }),
  });
  return {
    environment: BROWSER_ENV,
    workspaceRoot,
    capabilities: caps,
    ...overrides,
  };
};

// ---- server side (moved whole from server.test.mjs) ----

const HTML =
  '<!doctype html>\n<html><head><title>f</title></head>\n<body><div id="root"></div>\n' +
  '<script type="module" src="/fixture.mjs"></script>\n</body></html>\n';

// Unit-controlled stand-in bytes: EXACTLY MODEL_IDENTITY.byteLength so
// the real pin length check runs — never real weights or inference.
// makeServerDeps.sha256 returns the pin only for these bytes.
export const SERVER_MODEL_BYTES = Buffer.alloc(MODEL_IDENTITY.byteLength, 0xa5);
export const SERVER_META_BYTES = Buffer.from(
  '{"format":"TAZS","packedVersion":1}',
);

// A real confined temp tree in the frozen inputs layout:
// <workspace>/inputs/{harness,<arm>,model,setup} plus a recorded
// dependencies root. Both arm snapshots carry a real src/ so the suite
// can select either; snapshotRoot defaults to the candidate arm.
export const makeServerTree = async (t) => {
  const created = await makeTmpDir("be-server-");
  // The shared per-test owner removes the root even on an early
  // assertion failure — registered BEFORE any covered root effects.
  registerFixtureTeardown(t, {
    remove: () => fsp.rm(created, { recursive: true, force: true }),
  });
  const root = await fsp.realpath(created);
  const inputsDir = path.join(root, "inputs");
  const harnessRoot = path.join(inputsDir, "harness");
  const dependenciesRoot = path.join(root, "deps");
  const fixtureDir = path.join(harnessRoot, "train", "scripts", "browser_eval");
  await fsp.mkdir(fixtureDir, { recursive: true });
  await fsp.mkdir(dependenciesRoot, { recursive: true });
  await fsp.writeFile(path.join(fixtureDir, "fixture.html"), HTML);
  await Promise.all(
    ["candidate", "baseline"].map((arm) =>
      fsp.mkdir(path.join(inputsDir, arm, "src"), { recursive: true }),
    ),
  );
  const modelDir = path.join(inputsDir, "model");
  await fsp.mkdir(modelDir, { recursive: true });
  const modelPath = path.join(modelDir, "tinyaz-m.bin");
  // The retained metadata lives in the workspace's inputs/setup dir so
  // the manifest inputs.setup refs bind it by actual path.
  const setupDir = path.join(inputsDir, "setup");
  await fsp.mkdir(setupDir, { recursive: true });
  const metadataPath = path.join(setupDir, "tinyaz-m-metadata.json");
  await fsp.writeFile(modelPath, SERVER_MODEL_BYTES);
  await fsp.writeFile(metadataPath, SERVER_META_BYTES);
  const modelRef = { path: modelPath, byteLength: MODEL_IDENTITY.byteLength, sha256: MODEL_IDENTITY.sha256, metadataPath };
  const snapshotRoot = path.join(inputsDir, "candidate");
  return { root, inputsDir, snapshotRoot, harnessRoot, dependenciesRoot, modelRef, fixtureDir };
};

// Fixed-shape capabilities: register records each call and returns the
// binding; a supplied gate defers the real ACK. event() records each
// fact — eventGate holds the ACK and eventError rejects the record.
export const makeServerCaps = ({ gate, signal, eventGate, eventError } = {}) => {
  const calls = [];
  const events = [];
  let called;
  const calledPromise = new Promise((resolve) => {
    called = resolve;
  });
  return {
    runId: "test-run",
    signal: signal ?? new AbortController().signal,
    calls,
    events,
    calledPromise,
    register: async (fields) => {
      calls.push({ ...fields });
      called();
      if (gate !== undefined) await gate;
      return { identity: null, listener: fields.listener };
    },
    event: async (kind, payload) => {
      events.push({ kind, payload });
      if (eventGate !== undefined) await eventGate;
      if (eventError !== undefined) throw eventError;
    },
  };
};

// Fake Vite server: the route plugin's configureServer installs the
// captured middleware; listen/bind/transform are spied.
export const fakeVite = ({ address, closeError } = {}) => {
  const calls = { middlewares: [], server: null };
  const server = {
    middlewares: { use: (fn) => calls.middlewares.push(fn) },
    httpServer: { address: () => address ?? { address: "127.0.0.1", port: 19001 } },
    listen: async () => {
      server.listened = (server.listened ?? 0) + 1;
    },
    close: async () => {
      server.closed = (server.closed ?? 0) + 1;
      if (closeError !== undefined) throw closeError;
    },
    transformIndexHtml: async (url, html) => {
      server.transforms = [...(server.transforms ?? []), { url, html }];
      return html;
    },
  };
  calls.server = server;
  calls.createServer = async (options) => {
    calls.options = options;
    for (const plugin of options.plugins) {
      if (plugin && typeof plugin.configureServer === "function") {
        plugin.configureServer(server);
      }
    }
    return server;
  };
  // The faithful {calls,createServer} shape — every owner drives the
  // SAME recorded calls object through vite.calls.* and the SAME spy
  // through vite.createServer.
  return { calls, createServer: calls.createServer };
};

// The private trusted dependencies: fake module namespaces through
// importModule; the sha256 adapter returns the pinned identity ONLY for
// the unit-controlled model bytes — every other buffer gets the real
// Node digest so metadata delivery records its own actual hash.
export const makeServerDeps = (vite, { readFile, sha256 } = {}) => ({
  sha256:
    sha256 ??
    ((buf) =>
      Buffer.isBuffer(buf) && buf.equals(SERVER_MODEL_BYTES)
        ? MODEL_IDENTITY.sha256
        : createHash("sha256").update(buf).digest("hex")),
  importModule: async (name) => {
    if (name === "vite") return { createServer: vite.createServer };
    return { default: () => ({ name: `fake-${name}` }) };
  },
  ...(readFile === undefined ? {} : { readFile }),
});

// The ONE attempt wrapper for issued startFixtureServer/openBrowser
// calls: controlled releases arm in the owner's release stage BEFORE
// issue so held gates open ahead of settlement; ownFixtureAttempt
// registers the raw-body receipt before the thunk's first effect,
// attaches its handled neutral observation and returns the IDENTICAL
// original promise/error channel. The settle stage then awaits the
// actual original start body and closes the produced fake-SDK resource
// — expected close rejections stay on the original asserted caller
// channel; neutral settlement here is never a Native/FD proof.
export const ownResourceStart = (t, issueThunk, { release } = {}) => {
  registerFixtureTeardown(t, { release });
  const start = ownFixtureAttempt(t, issueThunk);
  registerFixtureTeardown(t, {
    settle: async () => {
      const handle = await Promise.resolve(start).catch(() => null);
      if (handle !== null && typeof handle?.close === "function") {
        await handle.close().catch(() => {});
      }
    },
  });
  return start;
};

// Drive the captured middleware chain like a real loopback request;
// next(error) is captured so route failures surface to the caller.
export const hitFixture = async (middlewares, url) => {
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(bytes) {
      this.body = bytes;
    },
  };
  let passed = false;
  let error;
  for (const fn of middlewares) {
    passed = false;
    error = undefined;
    await fn({ url }, res, (e) => {
      passed = true;
      error = e;
    });
    if (!passed) break;
  }
  return { res, passed, error };
};
