// process-backend.mjs owns capture of the closed BackendIdentity record
// for the darwin-arm64-libproc-v1 backend. It performs no spawn, native
// call or import-side IO: the monitor passes its verified startup ready
// evidence plus the pinned interpreter/helper paths, and this module
// binds real same-process file/OS facts into the frozen closed shape
// before assertBackendIdentity validates it. Every stat/read/hash/close
// stage runs under ONE entry BudgetHandle — the monitor's borrowed
// `budget` or an isolated handle captured from deadlineMonoMs/90 s —
// with assertLive before each IO initiation. Every file fact comes from
// the ONE owned bounded reader in process-backend-reader.mjs:
// pre-stat regular identity and size ceiling,
// actual bytes counted while reading, exact EOF count, post-stat
// dev/ino/size/mtime, and the real `close` event observed on success,
// error, overflow, abort and timeout alike — `end`, a destroy() call
// or an outer rejection alone is never close proof. When actual
// closure cannot be proven within the ORIGINAL horizon the fact stays
// unavailable/unproven with its unresolved reader evidence retained,
// and no next IO or success is attempted. The only OS_SHARED_CACHE
// image is the documented case where the standalone libproc path
// provably does not exist (ENOENT only). C4b-09 adds the bounded
// STATIC setup entry and the pure monitor-capture factory: the same
// ONE internal assembly backs both entries — no copied IO
// implementation, second ledger or cache — and the setup descriptor
// is static expectation data, never a Native availability proof.
import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertBackendIdentity } from "./record-schema.mjs";
import { createBudgetHandle, waitHandle } from "./process-budget.mjs";
import {
  createBackendReader,
  createBackendIdentityExpectation,
  parsePythonVenvConfiguration,
  resolvePythonProcessImage,
} from "./process-backend-reader.mjs";
import { isAbs, isObj, strNE } from "./protocol-values.mjs";

const LIBPROC_PATH = "/usr/lib/libproc.dylib";
const LSOF_PATH = "/usr/sbin/lsof";
const SYSTEM_VERSION_PLIST =
  "/System/Library/CoreServices/SystemVersion.plist";
const HELPER_NAMES = new Set([
  "process-macos.py", "process-macos-native.py", "process-macos-abi.py",
]);
const ABI = { bsdInfoSize: 136, taskInfoSize: 96 };
// Stat-gated ceilings before any read: frozen plist/helper text vs the
// interpreter/lsof/libproc binaries.
const TEXT_CAP = 1024 * 1024;
const BIN_CAP = 256 * 1024 * 1024;
// Isolated library use stays bounded by the fixed command ceiling when
// no trusted harness deadline is supplied.
const IO_CEILING_MS = 90000;

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE backend ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

// The real OS build comes from the fixed SystemVersion.plist — bounded
// same-process metadata evidence, never a sysctl child or a release()
// fallback. A missing or unpinned build string is unavailable evidence.
const defaultReadOsBuild = async (readFile) => {
  const plist = await readFile(SYSTEM_VERSION_PLIST, "utf8");
  const m = plist.match(
    /<key>ProductBuildVersion<\/key>\s*<string>([0-9A-Za-z]{4,20})<\/string>/,
  );
  if (!m) throw acct("os build evidence");
  return m[1];
};

// The ONE shared bounded static file/OS/hash assembly backing both
// public entries — an internal function, never a public proof knob.
// It owns the original entry-horizon/receipts/readFact composition and
// every identical stage; `setup` selects the actual selected-venv
// config read that derives the expected python metadata, while
// `pyMeta` supplies the monitor-verified ready facts on the fresh
// entry. No second reader, queue, clock or ledger exists.
const assembleBackendIdentity = async ({
  setup,
  pyMeta,
  pythonExecutable,
  helperPaths,
  recordRoot,
  deadlineMonoMs = undefined,
  budget = undefined,
  retainActual = undefined,
  statFile = (p) => fsp.stat(p),
  createStream = (p) => createReadStream(p),
  resolvePath = realpathSync,
  osRelease = () => os.release(),
  osVersion = () => os.version(),
  osPlatform = () => process.platform,
  osArch = () => process.arch,
  readOsBuild = defaultReadOsBuild,
  nowMonoMs = () => Number(process.hrtime.bigint() / 1000000n),
  delay = setTimeout,
  clearDelay = clearTimeout,
}) => {
  if (!isAbs(pythonExecutable) || !isAbs(recordRoot)) {
    throw acct("python invocation binding");
  }
  if (
    !Array.isArray(helperPaths) ||
    helperPaths.length !== HELPER_NAMES.size ||
    !helperPaths.every(isAbs) ||
    new Set(helperPaths.map((h) => path.basename(h))).size !==
      HELPER_NAMES.size ||
    !helperPaths.every((h) => HELPER_NAMES.has(path.basename(h)))
  ) {
    throw acct("helper set");
  }

  // ONE entry horizon for the whole capture: the borrowed monitor
  // handle, an explicit deadlineMonoMs, or the isolated 90 s ceiling.
  const own = budget === undefined || budget === null;
  // A borrowed monitor budget must carry the operation's physical
  // registrar: each stat/stream receipt is registered BEFORE its IO
  // is initiated and stays acquired until real settlement — a public
  // rejection never releases it.
  if (!own && typeof retainActual !== "function") {
    throw acct("retention");
  }
  if (deadlineMonoMs !== undefined && deadlineMonoMs !== null &&
    (typeof deadlineMonoMs !== "number" || !Number.isFinite(deadlineMonoMs))) {
    throw acct("deadline");
  }
  const handle = own
    ? createBudgetHandle({
        deadlineMonoMs: deadlineMonoMs === undefined || deadlineMonoMs === null
          ? nowMonoMs() + IO_CEILING_MS
          : deadlineMonoMs,
        clock: { setTimeout: delay, clearTimeout: clearDelay },
        nowMonoMs,
      })
    : budget;
  if (!isObj(handle) || typeof handle.assertLive !== "function" ||
    typeof handle.onExpire !== "function") {
    throw acct("budget");
  }

  // Every deferred physical-settlement receipt this capture creates:
  // each fulfills only on its real stat return/error or stream close.
  const receipts = [];
  // The owned reader invokes this combined retention callback BEFORE
  // it initiates each actual stat/stream: the deferred receipt joins
  // this capture's own receipts and, when the handle is borrowed, the
  // monitor's operation lifetime — exactly once per actual receipt.
  const retain = (receipt) => {
    receipts.push(receipt);
    if (typeof retainActual === "function") retainActual(receipt);
  };
  const readFact = createBackendReader({
    handle, retainActual: retain, statFile, createStream,
  }).readFact;
  // ONE same-handle live wrapper over the original supplied resolve:
  // every fresh synchronous resolve is fenced by assertLive BEFORE
  // the actual resolve and again after a successful return — a raw
  // throw or a null/undefined return propagates unchanged, with no
  // new clock, deadline or IO owner.
  const liveResolve = (p) => {
    handle.assertLive("backend resolve");
    const r = resolvePath(p);
    handle.assertLive("backend resolve");
    return r;
  };

  try {
    let meta = pyMeta;
    let pyReal;
    if (setup) {
      // The static entry binds the ACTUAL host before any config/FS
      // IO — expected static facts only, never Native readiness;
      // the trusted adapters exist for isolated tests and a
      // malformed supplied adapter fails closed the same way.
      if (
        typeof osPlatform !== "function" || typeof osArch !== "function" ||
        osPlatform() !== "darwin" || osArch() !== "arm64"
      ) {
        throw acct("backend platform");
      }
      // The actual selected-venv pyvenv.cfg is read through the SAME
      // bounded owned reader under this entry horizon, decoded with
      // strict UTF-8 (never replacement) and bound to the SAME
      // canonical resolved selected invocation — static expectation
      // data, never a Native availability proof or a forged envelope.
      const prefix = path.dirname(path.dirname(pythonExecutable));
      const cfgRead = await readFact(
        path.join(prefix, "pyvenv.cfg"), TEXT_CAP, "venv config",
      );
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(cfgRead.buf);
      } catch {
        throw acct("venv config utf8");
      }
      const cfg = parsePythonVenvConfiguration(text);
      pyReal = liveResolve(pythonExecutable);
      // The recorded executable and the resolved home/python<maj.min>
      // must resolve to the selected launcher's canonical path; home
      // realpath is NOT the launcher dirname on the Homebrew layout,
      // so resolved executable paths are compared, never the dirs.
      const verMM = cfg.version.slice(0, cfg.version.lastIndexOf("."));
      const homePy = path.join(cfg.home, `python${verMM}`);
      if (liveResolve(cfg.executable) !== pyReal || liveResolve(homePy) !== pyReal) {
        throw acct("venv config invocation");
      }
      if (cfg.command !== `${homePy} -m venv ${prefix}`) {
        throw acct("venv config command");
      }
      meta = {
        version: cfg.version, executable: pythonExecutable, prefix,
        basePrefix: path.dirname(path.dirname(pyReal)),
      };
    }
    const osBuild = await waitHandle(
      handle,
      Promise.resolve(
        readOsBuild((p, o) =>
          readFact(p, TEXT_CAP, "os build").then((r) =>
            o === "utf8" ? r.buf.toString("utf8") : r.buf,
          ),
        ),
      ),
      "os build",
    );
    if (!setup) pyReal = liveResolve(pythonExecutable);
    const pyImage = resolvePythonProcessImage(pythonExecutable, { resolvePath: liveResolve });
    const lsofReal = liveResolve(LSOF_PATH);

    // Exactly the three frozen Python sources, sorted by their
    // recorded-root-relative refs with real size/digest. A helper outside
    // the recorded root fails confinement.
    const helpers = [];
    for (const h of helperPaths) {
      const abs = liveResolve(h);
      const rel = path.relative(recordRoot, abs).split(path.sep).join("/");
      if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
        throw acct(`helper outside recordRoot ${rel}`);
      }
      const r = await readFact(abs, TEXT_CAP, "helper");
      helpers.push({ path: rel, byteLength: r.buf.length, sha256: r.sha256 });
    }
    helpers.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

    // A readable libproc image is hashed; the ONLY shared-cache case is a
    // provably absent standalone path (ENOENT from stat or read), bound
    // to the observed OS build and the fixed ABI. Any other IO failure —
    // permission, interruption, malformed — fails closed, never a cache
    // fallback.
    let image;
    try {
      image = { kind: "file",
        sha256: (await readFact(LIBPROC_PATH, BIN_CAP, "libproc", true)).sha256 };
    } catch (e) {
      if (e && e.code === "ENOENT") {
        image = { kind: "OS_SHARED_CACHE", osBuild };
      } else {
        throw e;
      }
    }

    // The selected venv invocation resolves to the LAUNCHER image; a
    // canonical framework launcher execs the derived Python.app
    // payload — the distinct process image gets its own bounded
    // stat/read/close fact through the same owned reader while a
    // direct image reuses the launcher's fact unchanged.
    const pyFact = await readFact(pyReal, BIN_CAP, "python", true);
    const pyImageFact = pyImage === pyReal
      ? pyFact
      : await readFact(pyImage, BIN_CAP, "python image", true);
    const identity = {
      backendId: "darwin-arm64-libproc-v1",
      os: { platform: "darwin", arch: "arm64", release: osRelease(),
        version: osVersion(), build: osBuild },
      python: {
        invocationPath: pythonExecutable, realPath: pyReal, sha256: pyFact.sha256,
        processImage: { realPath: pyImage, sha256: pyImageFact.sha256 },
        version: meta.version, executable: meta.executable,
        prefix: meta.prefix, basePrefix: meta.basePrefix,
      },
      helpers,
      libproc: { path: LIBPROC_PATH, abi: { ...ABI }, image },
      lsof: {
        invocationPath: LSOF_PATH, realPath: lsofReal,
        sha256: (await readFact(lsofReal, BIN_CAP, "lsof", true)).sha256,
      },
    };
    handle.assertLive("backend identity");
    assertBackendIdentity(identity);
    return Object.freeze(identity);
  } finally {
    // Only the isolated entry handle is disposed, and only after every
    // physical receipt this capture created has actually settled; a
    // borrowed monitor handle belongs to its operation lifetime.
    if (own) {
      Promise.all(receipts).then(
        () => handle.dispose(),
        () => handle.dispose(),
      );
    }
  }
};

export async function captureBackendIdentity({ ready, ...options }) {
  // Only the monitor's natively verified startup facts may seed this
  // record: the accepted ready envelope carries the exact backend/ABI and
  // the collector's own Python fact set.
  if (!isObj(ready) || !isObj(ready.python) || !isObj(ready.abi)) {
    throw acct("ready evidence");
  }
  if (
    ready.platform !== "darwin" ||
    ready.arch !== "arm64" ||
    ready.abi.bsdInfoSize !== ABI.bsdInfoSize ||
    ready.abi.taskInfoSize !== ABI.taskInfoSize
  ) {
    throw acct("backend facts");
  }
  const py = ready.python;
  for (const f of ["executable", "prefix", "basePrefix", "version"]) {
    if (!strNE(py[f])) throw acct(`ready python ${f}`);
  }
  if (py.executable !== options.pythonExecutable) {
    throw acct("python invocation binding");
  }
  return assembleBackendIdentity({
    ...options,
    setup: false,
    pyMeta: { version: py.version, executable: py.executable, prefix: py.prefix, basePrefix: py.basePrefix },
  });
}

// The bounded STATIC setup entry (C4b-09): it captures the same closed
// BackendIdentity from the actual selected-venv configuration and real
// file/OS facts BEFORE monitor readiness exists, so the manifest /
// CommonIdentity can precede phase children. It never takes a `ready`
// argument and never fabricates a ready-shaped envelope — the result is
// static expectation data, not Native readiness or bootstrap proof.
export async function captureSetupBackendIdentity(options) {
  if (!isObj(options) || "ready" in options) {
    throw acct("setup options");
  }
  return assembleBackendIdentity({ ...options, setup: true });
}

// The pure monitor backend-capture factory (C4b-09): it holds the
// bound config/clock options and the frozen expectation privately and
// NEVER accepts an injected verifier or capture callback. `capture`
// always calls the genuine verified-ready entry with the dynamic SAME
// original borrowed budget h and the actual retainActual — no new
// deadline is created. `verifyStartup` is null ONLY for the omitted
// isolated-library-compatibility case; when configured it awaits the
// genuine capture on the same borrowed handle/retainer, rechecks the
// same-handle live guard and applies the pure expected equality —
// never a fake or no-op operational verification.
export function createMonitorBackendCapture({
  expectedBackendIdentity = undefined,
  captureOptions,
}) {
  const expected = createBackendIdentityExpectation(expectedBackendIdentity);
  if (
    !isObj(captureOptions) ||
    !isAbs(captureOptions.pythonExecutable) ||
    !isAbs(captureOptions.recordRoot) ||
    !Array.isArray(captureOptions.helperPaths) ||
    !captureOptions.helperPaths.every(isAbs)
  ) {
    throw acct("monitor capture options");
  }
  // Reserved authority keys are rejected synchronously BEFORE any IO
  // (Object.hasOwn catches even nonenumerable own props): a supplied
  // ready/budget/retainActual/setup/pyMeta can never impersonate the
  // genuine passed fields, which are always bound LAST.
  for (const k of ["ready", "budget", "retainActual", "setup", "pyMeta"]) {
    if (Object.hasOwn(captureOptions, k)) {
      throw acct(`reserved option ${k}`);
    }
  }
  const bound = Object.freeze({
    ...captureOptions,
    helperPaths: Object.freeze([...captureOptions.helperPaths]),
  });
  const capture = (ready, h, retainActual) => captureBackendIdentity({ ...bound, ready, budget: h, retainActual });
  const verifyStartup =
    expected === null
      ? null
      : async (ready, h, retainActual) => {
          h.assertLive("backend startup");
          const actual = await capture(ready, h, retainActual);
          h.assertLive("backend startup");
          expected.assertMatches(actual);
        };
  return Object.freeze({ capture, verifyStartup });
}
