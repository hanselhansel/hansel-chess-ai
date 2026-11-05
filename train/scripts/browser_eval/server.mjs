// Connected evaluation fixture server — driver-side resource only.
// Sole export startFixtureServer: serves the evaluation fixture pages
// and the pinned model/metadata bytes over one loopback Vite listener.
// The listener registers through the trusted capabilities.register and
// its real ACK is awaited BEFORE model bytes are read or any controlled
// route admits traffic; the caller signal fences every await; close()
// only runs the genuine vite.close() — no Native/proof/status authority.
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import fsp from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MODEL_IDENTITY } from "./schema-constants.mjs";
import { bridgeError } from "./driver-protocol.mjs";
import { freezeDeep, isPlainObject } from "./schema-primitives.mjs";
import { copyDeep, isAbs, isObj } from "./protocol-values.mjs";

const LOOPBACK = "127.0.0.1";
const MODEL_URL = "/weights/tinyaz-m.bin";
const S_MODEL_URL = "/weights/tinyaz-s.bin";
const META_URL = "/weights/tinyaz-m.bin.meta.json";
const ENGINE_PATH = "/engine";
const WORKBENCH_PATH = "/workbench";
const ENGINE_MODULE = "fixture.mjs";
const WORKBENCH_MODULE = "workbench-fixture.mjs";
const HTML_MODULE_SRC = 'src="/fixture.mjs"';
const FIXTURE_HTML_REL = path.join("train", "scripts", "browser_eval", "fixture.html");
const DEPENDENCY_KEYS = ["lstat", "stat", "readFile", "realpath", "sha256", "importModule"];

const bad = (detail) => bridgeError(`fixture-server ${detail}`);

// Genuine AbortSignal brand validation: the real
// AbortSignal.prototype.aborted getter throws on any non-branded value,
// so duck-shaped objects and Object.create(AbortSignal.prototype)
// fakes all reject — a plain-object check cannot see the internal slot.
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

// One confinement pass per supplied directory root: the supplied path
// must be an absolute non-symlink real directory; the canonical realpath
// is the value every later consumer uses. Missing roots, supplied
// symlinks and non-directories all fail closed. The caller fence runs
// before every fresh IO attempt and after every await so an abort never
// starts another read.
const confineDirectory = async (supplied, what, io, fence) => {
  fence();
  const lst = await io.lstat(supplied);
  fence();
  if (lst.isSymbolicLink()) throw bad(`${what} root symlink`);
  if (!lst.isDirectory()) throw bad(`${what} root directory`);
  const real = io.realpath(supplied);
  fence();
  if (!isAbs(real)) throw bad(`${what} root realpath`);
  const st = await io.stat(real);
  fence();
  if (!st.isDirectory()) throw bad(`${what} root stat`);
  return real;
};

// Same confinement for the two model-side files — supplied path must be
// an absolute non-symlink real regular file, canonicalized once, fenced
// around every fresh read exactly like the directory pass.
const confineFile = async (supplied, what, io, fence) => {
  fence();
  const lst = await io.lstat(supplied);
  fence();
  if (lst.isSymbolicLink()) throw bad(`${what} symlink`);
  if (!lst.isFile()) throw bad(`${what} file`);
  const real = io.realpath(supplied);
  fence();
  if (!isAbs(real)) throw bad(`${what} realpath`);
  const st = await io.stat(real);
  fence();
  if (!st.isFile()) throw bad(`${what} stat`);
  return real;
};

// The default module loader: package entry points resolved strictly
// through the recorded installed dependencies root, then dynamically
// imported — never a fallback global resolution.
const createDefaultImporter = (depsReal) => {
  const require = createRequire(path.join(depsReal, ".fixture-resolve.cjs"));
  return (name) => import(pathToFileURL(require.resolve(name)).href);
};

const respond = (res, status, bytes, contentType) => {
  res.statusCode = status;
  res.setHeader("cache-control", "no-store");
  if (contentType !== undefined) res.setHeader("content-type", contentType);
  res.end(status === 200 ? bytes : String(status));
};

// The injected arm/config lands as a deep-frozen non-writable DATA
// property — a plain window assignment would leave the page's
// configuration mutable, so the literal is deep-frozen in-page before
// defineProperty installs it.
const frozenConfigScript = (config) => `<script>
const freezeDeep = ${freezeDeep.toString()};
Object.defineProperty(window,"__tinyazArm",{value:freezeDeep(${JSON.stringify(config)}),writable:false,configurable:false});
</script>`;

// The evaluation-only route table. Before `admitted` every controlled
// path answers 503 so nothing can be exposed ahead of the registration
// ACK; afterwards the two pages, the pinned model/metadata bytes and the
// baseline-only exact-S normalization rules apply. A route failure —
// including a rejected delivery record — surfaces through next(error)
// instead of an unhandled rejection.
const createRoutes = (ctx) => async (req, res, next) => {
  try {
    const pathname = new URL(req.url ?? "/", `http://${LOOPBACK}`).pathname;
    const controlled = pathname === ENGINE_PATH || pathname === WORKBENCH_PATH ||
      pathname.startsWith("/weights/");
    if (controlled && !ctx.admitted()) {
      respond(res, 503);
      return;
    }
    if (pathname === ENGINE_PATH) {
      await ctx.servePage(req, res, ENGINE_MODULE);
      return;
    }
    if (pathname === WORKBENCH_PATH) {
      if (ctx.arm !== "candidate") {
        respond(res, 404);
        return;
      }
      await ctx.servePage(req, res, WORKBENCH_MODULE);
      return;
    }
    if (pathname.startsWith("/weights/")) {
      // Baseline normalization is exactly the recorded tinyaz-s.bin URL
      // to the pinned M bytes — every other wrong *.bin/*.json request,
      // including a legacy metadata URL, is a plain 404 on either arm.
      const modelReq = pathname === MODEL_URL || (ctx.arm === "baseline" && pathname === S_MODEL_URL);
      const metaReq = pathname === META_URL;
      if (!modelReq && !metaReq) {
        respond(res, 404);
        return;
      }
      const bytes = metaReq ? ctx.metaBytes() : ctx.modelBytes();
      await ctx.noteDelivery(pathname, bytes);
      // A late ACK after stop never serves the data — admission,
      // signal and closing are rechecked after every fresh await.
      if (!ctx.admitted()) {
        respond(res, 503);
        return;
      }
      respond(res, 200, bytes, metaReq ? "application/json" : "application/octet-stream");
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export async function startFixtureServer({ snapshotRoot, harnessRoot, dependenciesRoot, modelRef, arm, capabilities }, dependencies = {}) {
  // Every serializable input validates, copies and freezes BEFORE the
  // first await — later mutation of caller objects cannot rebind the
  // frozen configuration.
  if (!isPlainObject(dependencies)) throw bad("dependencies");
  const cap = capabilities;
  // cap.event is REQUIRED — delivery facts are recorded through it, so
  // a missing sink rejects before IO rather than silently skipping.
  const capOk = isObj(cap) && typeof cap.register === "function" &&
    typeof cap.event === "function" && isSignal(cap.signal);
  if (!capOk) {
    throw bad("capabilities");
  }
  const signal = cap.signal;
  const fence = () => {
    if (signal.aborted) throw bad("stop");
  };
  if (arm !== "candidate" && arm !== "baseline") throw bad("arm");
  if (!isObj(modelRef)) throw bad("modelRef");
  const model = freezeDeep(copyDeep({
    path: modelRef.path, byteLength: modelRef.byteLength,
    sha256: modelRef.sha256, metadataPath: modelRef.metadataPath,
  }));
  const modelBad = !isAbs(model.path) || !isAbs(model.metadataPath) ||
    model.byteLength !== MODEL_IDENTITY.byteLength || model.sha256 !== MODEL_IDENTITY.sha256;
  if (modelBad) {
    throw bad("modelRef descriptor");
  }
  for (const key of DEPENDENCY_KEYS) {
    if (dependencies[key] !== undefined && typeof dependencies[key] !== "function") {
      throw bad(`dependency ${key}`);
    }
  }
  const io = {
    lstat: dependencies.lstat ?? ((p) => fsp.lstat(p)),
    stat: dependencies.stat ?? ((p) => fsp.stat(p)),
    readFile: dependencies.readFile ?? ((p) => fsp.readFile(p)),
    realpath: dependencies.realpath ?? realpathSync,
    sha256: dependencies.sha256 ?? ((buf) => createHash("sha256").update(buf).digest("hex")),
    importModule: dependencies.importModule,
  };
  if (!isAbs(snapshotRoot) || !isAbs(harnessRoot) || !isAbs(dependenciesRoot)) {
    throw bad("root path");
  }

  const snapshotReal = await confineDirectory(snapshotRoot, "snapshot", io, fence);
  const harnessReal = await confineDirectory(harnessRoot, "harness", io, fence);
  const depsReal = await confineDirectory(dependenciesRoot, "dependencies", io, fence);
  const snapshotSrc = path.join(snapshotReal, "src");
  fence();
  const srcStat = await io.stat(snapshotSrc);
  fence();
  if (!srcStat.isDirectory()) throw bad("snapshot src directory");
  const fixtureDir = path.join(harnessReal, path.dirname(FIXTURE_HTML_REL));
  const fixtureHtmlPath = path.join(fixtureDir, "fixture.html");
  const modelPath = await confineFile(model.path, "model", io, fence);
  const metadataPath = await confineFile(model.metadataPath, "model metadata", io, fence);
  fence();
  const htmlText = (await io.readFile(fixtureHtmlPath)).toString("utf8");
  fence();

  // Frozen inputs layout — all three roots and the model pair are bound
  // to ONE workspace: harness at <workspace>/inputs/harness, the
  // selected arm snapshot at <workspace>/inputs/<arm>, the pinned model
  // at <workspace>/inputs/model/tinyaz-m.bin and its retained metadata
  // at <workspace>/inputs/setup/tinyaz-m-metadata.json so the manifest
  // inputs.setup refs bind it. Any other or mixed root binding rejects
  // AFTER real confinement — a triplet assembled across workspaces is
  // never trusted.
  const harnessBad = path.basename(harnessReal) !== "harness" ||
    path.basename(path.dirname(harnessReal)) !== "inputs";
  if (harnessBad) {
    throw bad("harness root layout");
  }
  const workspaceRoot = path.dirname(path.dirname(harnessReal));
  const inputsDir = path.join(workspaceRoot, "inputs");
  const modelDir = path.join(inputsDir, "model");
  if (snapshotReal !== path.join(inputsDir, arm)) {
    throw bad("snapshot root layout");
  }
  if (modelPath !== path.join(modelDir, "tinyaz-m.bin")) {
    throw bad("model path layout");
  }
  if (metadataPath !== path.join(inputsDir, "setup", "tinyaz-m-metadata.json")) {
    throw bad("metadata path layout");
  }
  const cacheDir = path.join(workspaceRoot, "cache", arm);

  const importModule = io.importModule ?? createDefaultImporter(depsReal);
  fence();
  const viteModule = await importModule("vite");
  fence();
  const reactModule = await importModule("@vitejs/plugin-react");
  fence();
  const tailwindModule = await importModule("@tailwindcss/vite");
  fence();
  const react = reactModule?.default ?? reactModule;
  const tailwind = tailwindModule?.default ?? tailwindModule;
  const modulesOk = isObj(viteModule) && typeof viteModule.createServer === "function" &&
    typeof react === "function" && typeof tailwind === "function";
  if (!modulesOk) {
    throw bad("vite modules");
  }

  const deliveries = [];
  let admitted = false;
  let closing = false;
  let modelBytes = null;
  let metaBytes = null;
  let pageConfig = null;

  // A delivery fact describes the ACTUAL served body — real byteLength
  // and digest, never the pinned constant (the metadata body does not
  // carry the bin SHA). The controlled record is awaited inside the
  // route before the response; a rejected record surfaces to next().
  const noteDelivery = async (route, bytes) => {
    const fact = freezeDeep({ route, arm, byteLength: bytes.byteLength, sha256: io.sha256(bytes) });
    deliveries.push(fact);
    await cap.event("delivery", copyDeep(fact));
  };

  let vite = null;
  const servePage = async (req, res, moduleFile) => {
    // The Vite root is the selected snapshot, so the fixture module is
    // served through a permitted /@fs/absolute harness URL instead.
    const html = htmlText
      .replace(HTML_MODULE_SRC, `src="/@fs${path.join(fixtureDir, moduleFile)}"`)
      .replace("</head>", `    ${frozenConfigScript(pageConfig)}\n  </head>`);
    const transformed = await vite.transformIndexHtml(req.url ?? "/", html);
    // A late transform after stop never serves the page body.
    if (!(admitted && !closing && !signal.aborted)) {
      respond(res, 503);
      return;
    }
    respond(res, 200, Buffer.from(transformed, "utf8"), "text/html; charset=utf-8");
  };

  const routes = createRoutes({
    arm, admitted: () => admitted && !closing && !signal.aborted,
    modelBytes: () => modelBytes, metaBytes: () => metaBytes, noteDelivery, servePage,
  });

  let closePromise = null;
  const close = () => {
    if (closePromise === null) {
      // Admission fences SYNCHRONOUSLY and the memoized promise arms
      // BEFORE the real vite close effect — a reentrant caller always
      // shares the one close attempt.
      closing = true;
      closePromise = Promise.resolve().then(() =>
        vite === null ? null : vite.close(),
      );
    }
    return closePromise;
  };

  try {
    vite = await viteModule.createServer({
      root: snapshotReal,
      configFile: false,
      envFile: false,
      publicDir: false,
      cacheDir,
      appType: "custom",
      logLevel: "warn",
      plugins: [
        { name: "tinyaz-fixture-routes", configureServer: (s) => s.middlewares.use(routes) },
        react(),
        tailwind(),
      ],
      resolve: {
        alias: [
          { find: "@", replacement: snapshotSrc },
          { find: "react", replacement: path.join(depsReal, "react") },
          { find: "react-dom", replacement: path.join(depsReal, "react-dom") },
          { find: "chess.js", replacement: path.join(depsReal, "chess.js") },
        ],
      },
      // The snapshot/harness inputs are immutable records — no
      // filesystem watcher, no HMR, no other live-server behavior.
      server: {
        host: LOOPBACK, port: 0, hmr: false, middlewareMode: false, watch: null,
        fs: { strict: true, allow: [snapshotReal, fixtureDir, depsReal, cacheDir] },
      },
      optimizeDeps: { entries: [] },
    });
    fence();
    await vite.listen();
    fence();
    const bound = vite.httpServer?.address?.();
    if (!isObj(bound) || bound.address !== LOOPBACK || typeof bound.port !== "number") {
      throw bad("listener address");
    }
    const listener = Object.freeze({ address: LOOPBACK, port: bound.port });
    const registered = await cap.register({ kind: "fixture", rootPid: null, expectedExecutable: null, listener });
    fence();

    // Model bytes are read and verified ONLY after the real
    // registration ACK — the pinned identity in schema-constants is the
    // authority, never the caller-supplied descriptor.
    modelBytes = await io.readFile(modelPath);
    fence();
    if (
      modelBytes.length !== MODEL_IDENTITY.byteLength ||
      io.sha256(modelBytes) !== MODEL_IDENTITY.sha256
    ) {
      throw bad("model bytes");
    }
    metaBytes = await io.readFile(metadataPath);
    fence();

    const origin = `http://${LOOPBACK}:${listener.port}`;
    const engineUrl = `${origin}${ENGINE_PATH}`;
    const workbenchUrl = arm === "candidate" ? `${origin}${WORKBENCH_PATH}` : null;
    pageConfig = freezeDeep({ arm, engineUrl, workbenchUrl,
      model: { url: MODEL_URL, metadataUrl: META_URL, byteLength: model.byteLength, sha256: model.sha256 } });
    admitted = true;
    const boundListener = isObj(registered) && isObj(registered.listener) ? registered.listener : listener;
    return Object.freeze({ engineUrl, workbenchUrl, listener: boundListener, close });
  } catch (error) {
    // The real server always closes on a failed start; a close failure
    // never replaces the original startup error.
    await close().catch(() => {});
    throw error;
  }
}
