// Connected evaluation browser — driver-side resource only. Sole
// export openBrowser: launches the ONE recorded headless Chromium
// through public Playwright launchServer/process/wsEndpoint/connect,
// registers the browser root and the loopback RPC listener through the
// trusted capabilities.register (BOTH real ACKs before connect/context/
// page/model work), and delegates per-game context/page/close work to
// browser-contexts.mjs over the same public surface. close() marks
// expected teardown BEFORE graceful real closes — it is never a Native
// physical proof.
import path from "node:path";
import fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import { bridgeError } from "./driver-protocol.mjs";
import { canonicalBytes } from "./canonical-json.mjs";
import { freezeDeep, isPlainObject } from "./schema-primitives.mjs";
import { copyDeep, isAbs, isH, isObj, isPid, isPort, strNE } from "./protocol-values.mjs";
import { createBrowserContexts } from "./browser-contexts.mjs";

const LOOPBACK = "127.0.0.1";
const DEPENDENCY_KEYS = ["importModule", "mkdir"];
// Explicit security-disabling launch args are rejected outright — a
// caller may never self-hash an unsafe configuration.
const UNSAFE_ARGS = ["--no-sandbox", "--disable-web-security", "--disable-setuid-sandbox"];
// In the cohort phases an unexpected worker/model fault is sticky and
// the next ordinary call fails; deliberate check-phase runs record the
// same actual fact through the event channel without poisoning the
// run. A page crash is fatal in every phase like the process/browser
// level disconnects.
const COHORT_PHASES = new Set(["compare", "preflight"]);
const WORKER_MODEL_KINDS = new Set(["worker", "page", "pageerror", "requestfailed", "model"]);
const FATAL_KINDS = new Set(["crash"]);

const bad = (detail) => bridgeError(`fixture-browser ${detail}`);

// Genuine AbortSignal brand validation: the real aborted getter throws
// on any non-branded value — plain-object and prototype fakes reject.
const SIGNAL_ABORTED = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get;
const isSignal = (value) => {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  try {
    if (typeof SIGNAL_ABORTED.call(value) !== "boolean") return false;
  } catch {
    return false;
  }
  return (
    typeof value.addEventListener === "function" &&
    typeof value.removeEventListener === "function"
  );
};

// The recorded launch literals are the contract — any deviation,
// non-string arg, security-disabling arg or private extra field rejects
// before any work. securityOptionsSha256 is recomputed EXACTLY over
// canonicalBytes({headless:true,chromiumSandbox:true,
// ignoreDefaultArgs:false,args:[copiedArgs]}) — no mere isHash.
const checkEnvironment = (environment) => {
  if (!isObj(environment)) throw bad("environment");
  const chromium = environment.chromium;
  const launch = environment.launch;
  if (!isObj(chromium) || !isObj(launch)) throw bad("environment fields");
  if (
    !isAbs(chromium.invocationPath) ||
    !isAbs(chromium.realPath) ||
    !isH(chromium.sha256) ||
    !strNE(chromium.version)
  ) {
    throw bad("environment.chromium");
  }
  if (!isObj(launch.viewport)) throw bad("environment.launch.viewport");
  if (
    launch.host !== LOOPBACK ||
    launch.headless !== true ||
    launch.deviceScaleFactor !== 1 ||
    launch.viewport.width !== 1280 ||
    launch.viewport.height !== 800
  ) {
    throw bad("environment.launch");
  }
  if (!Array.isArray(launch.args) || launch.args.some((a) => typeof a !== "string")) {
    throw bad("environment.launch.args");
  }
  if (launch.args.some((a) => UNSAFE_ARGS.includes(a))) {
    throw bad("environment.launch.args security");
  }
  const securitySha256 = createHash("sha256")
    .update(
      canonicalBytes({
        headless: true,
        chromiumSandbox: true,
        ignoreDefaultArgs: false,
        args: [...launch.args],
      }),
    )
    .digest("hex");
  if (launch.securityOptionsSha256 !== securitySha256) {
    throw bad("environment.launch.securityOptionsSha256");
  }
  return freezeDeep(
    copyDeep({
      chromium: {
        invocationPath: chromium.invocationPath,
        realPath: chromium.realPath,
        sha256: chromium.sha256,
        version: chromium.version,
      },
      launch: {
        host: launch.host,
        headless: launch.headless,
        viewport: { width: launch.viewport.width, height: launch.viewport.height },
        deviceScaleFactor: launch.deviceScaleFactor,
        args: [...launch.args],
        securityOptionsSha256: launch.securityOptionsSha256,
      },
    }),
  );
};

export async function openBrowser({ environment, workspaceRoot, capabilities }, dependencies = {}) {
  if (!isPlainObject(dependencies)) throw bad("dependencies");
  const cap = capabilities;
  if (!isObj(cap) || typeof cap.register !== "function" || !isSignal(cap.signal)) {
    throw bad("capabilities");
  }
  const signal = cap.signal;
  const fence = () => {
    if (signal.aborted) throw bad("stop");
  };
  const env = checkEnvironment(environment);
  if (!isAbs(workspaceRoot)) throw bad("workspaceRoot");
  for (const key of DEPENDENCY_KEYS) {
    if (dependencies[key] !== undefined && typeof dependencies[key] !== "function") {
      throw bad(`dependency ${key}`);
    }
  }
  const io = {
    importModule: dependencies.importModule ?? ((name) => import(name)),
    mkdir: dependencies.mkdir ?? ((p, opts) => fsp.mkdir(p, opts)),
  };

  let sticky;
  let hasSticky = false;
  let expected = false;
  let closing = false;
  const emitFault = (kind, detail) => {
    // The record must survive a synchronously-throwing sink as well as
    // a rejected return — neither becomes an unhandled error.
    try {
      if (typeof cap.event === "function") {
        Promise.resolve(cap.event("fault", copyDeep({ kind, detail }))).catch(() => {});
      }
    } catch {
      // a throwing sink never escapes the fault path
    }
  };
  const markSticky = (kind, detail) => {
    if (!hasSticky) {
      hasSticky = true;
      sticky = bad(`${kind}: ${detail}`);
    }
    emitFault(kind, detail);
  };
  // cap.manifest.phase is read-only data: compare/preflight make
  // worker/model facts sticky while deliberate check phases only record
  // the same actual fact — no invented allowFailure knob. Crash facts
  // are fatal in every phase like process exit/disconnect.
  const phase = isObj(cap.manifest) ? cap.manifest.phase : undefined;
  const cohortPhase = COHORT_PHASES.has(phase);
  const noteFault = (kind, detail) => {
    if (FATAL_KINDS.has(kind) || (cohortPhase && WORKER_MODEL_KINDS.has(kind))) {
      markSticky(kind, detail);
      return;
    }
    emitFault(kind, detail);
  };

  // Ordinary calls reject on the sticky raw cause first, then on the
  // synchronous closing fence, then on the caller signal.
  const assertLive = () => {
    if (hasSticky) throw sticky;
    if (closing) throw bad("closed");
    fence();
  };

  // One flag-guarded teardown shared by close() and the startup catch:
  // contexts -> browser -> server ALL attempted even after an earlier
  // failure, each resource closed at most once even when an abort
  // landed mid-adoption, and the FIRST arbitrary thrown value retained
  // by an explicit presence flag — never a null sentinel or ??=.
  let server = null;
  let browser = null;
  let contexts = null;
  const closed = { contexts: false, browser: false, server: false };
  const teardown = async () => {
    let first;
    let hasFirst = false;
    const attempt = async (fn) => {
      try {
        await fn();
      } catch (error) {
        if (!hasFirst) {
          hasFirst = true;
          first = error;
        }
      }
    };
    if (contexts !== null && !closed.contexts) {
      closed.contexts = true;
      await attempt(() => contexts.closeAll());
    }
    if (browser !== null && !closed.browser) {
      closed.browser = true;
      if (typeof browser.close === "function") await attempt(() => browser.close());
    }
    if (server !== null && !closed.server) {
      closed.server = true;
      if (typeof server.close === "function") await attempt(() => server.close());
    }
    if (hasFirst) throw first;
  };
  let closePromise = null;
  const close = () => {
    if (closePromise === null) {
      // Ordinary calls fence synchronously and expected teardown marks
      // BEFORE the real closes.
      closing = true;
      expected = true;
      // The memoized promise arms BEFORE any close effect — teardown
      // runs on a queued microtask so a reentrant close() (a disconnect
      // handler firing synchronously mid-close) shares the ONE attempt
      // instead of starting a second teardown.
      closePromise = Promise.resolve().then(() => teardown());
    }
    return closePromise;
  };

  try {
    fence();
    const pw = await io.importModule("playwright");
    fence();
    // The real BrowserType surface is a CLASS instance — accept a
    // non-null object with the required public methods, never an isObj
    // plain-object brand check on the instance.
    const chromium = pw === null || typeof pw !== "object" ? null : pw.chromium;
    if (
      chromium === null ||
      (typeof chromium !== "object" && typeof chromium !== "function") ||
      typeof chromium.launchServer !== "function" ||
      typeof chromium.connect !== "function"
    ) {
      throw bad("playwright");
    }
    const browserDir = path.join(workspaceRoot, "browser");
    const tmpDir = path.join(browserDir, "tmp");
    const downloadsDir = path.join(browserDir, "downloads");
    await io.mkdir(tmpDir, { recursive: true });
    fence();
    await io.mkdir(downloadsDir, { recursive: true });
    fence();
    server = await chromium.launchServer({
      executablePath: env.chromium.invocationPath,
      headless: env.launch.headless,
      chromiumSandbox: true,
      ignoreDefaultArgs: false,
      args: [...env.launch.args],
      host: env.launch.host,
      port: 0,
      downloadsPath: downloadsDir,
      env: { ...process.env, TMPDIR: tmpDir },
    });
    fence();
    const proc = typeof server.process === "function" ? server.process() : null;
    if (proc === null || !isPid(proc.pid)) throw bad("browser process");
    proc.on?.("exit", () => {
      if (!expected) markSticky("browser process", "unexpected exit");
    });
    if (typeof server.wsEndpoint !== "function") throw bad("browser endpoint");
    const ws = server.wsEndpoint();
    let endpoint;
    try {
      endpoint = new URL(ws);
    } catch {
      throw bad("browser endpoint");
    }
    // Only the loopback origin is ever retained — the capability path
    // and token inside the ws URL stay out of evidence and registrations.
    if (endpoint.protocol !== "ws:" || endpoint.hostname !== LOOPBACK) {
      throw bad("browser endpoint");
    }
    const port = Number(endpoint.port);
    if (!isPort(port)) throw bad("browser endpoint");

    fence();
    await cap.register({
      kind: "browser",
      rootPid: proc.pid,
      expectedExecutable: env.chromium.realPath,
      listener: null,
    });
    fence();
    await cap.register({
      kind: "fixture",
      rootPid: null,
      expectedExecutable: null,
      listener: { address: LOOPBACK, port },
    });
    fence();
    browser = await chromium.connect(ws);
    fence();
    browser.on?.("disconnected", () => {
      if (!expected) markSticky("browser", "unexpected disconnect");
    });
  } catch (error) {
    // The same flag-guarded close path as the abort listener — adopted
    // resources close at most once and an abort landing mid-startup
    // shares the ONE memoized attempt instead of orphaning the server.
    await close().catch(() => {});
    throw error;
  }

  contexts = createBrowserContexts({
    browser,
    launch: env.launch,
    assertLive,
    noteFault,
  });

  // External abort rejects ordinary waits through fence() and starts
  // the same real graceful close. Its rejection is ALWAYS handled and
  // retained as the first sticky raw cause when the slot is still
  // empty — it never replaces the primary close/error channel and no
  // global warning hook is installed.
  signal.addEventListener(
    "abort",
    () => {
      close().catch((error) => {
        if (!hasSticky) {
          hasSticky = true;
          sticky = error;
        }
      });
    },
    { once: true },
  );

  return Object.freeze({
    openGame: contexts.openGame,
    openWorkbench: contexts.openWorkbench,
    close,
  });
}
