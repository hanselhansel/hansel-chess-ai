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
// provably does not exist (ENOENT only).
import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertBackendIdentity } from "./record-schema.mjs";
import { createBudgetHandle, waitHandle } from "./process-budget.mjs";
import {
  createBackendReader,
  resolvePythonProcessImage,
} from "./process-backend-reader.mjs";
import { isAbs, isObj, strNE } from "./protocol-values.mjs";

const LIBPROC_PATH = "/usr/lib/libproc.dylib";
const LSOF_PATH = "/usr/sbin/lsof";
const SYSTEM_VERSION_PLIST =
  "/System/Library/CoreServices/SystemVersion.plist";
const HELPER_NAMES = new Set([
  "process-macos.py",
  "process-macos-native.py",
  "process-macos-abi.py",
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

export async function captureBackendIdentity({
  ready,
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
  readOsBuild = defaultReadOsBuild,
  nowMonoMs = () => Number(process.hrtime.bigint() / 1000000n),
  delay = setTimeout,
  clearDelay = clearTimeout,
}) {
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
  if (
    !isAbs(pythonExecutable) ||
    !isAbs(recordRoot) ||
    py.executable !== pythonExecutable
  ) {
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
  if (
    deadlineMonoMs !== undefined &&
    deadlineMonoMs !== null &&
    (typeof deadlineMonoMs !== "number" || !Number.isFinite(deadlineMonoMs))
  ) {
    throw acct("deadline");
  }
  const handle = own
    ? createBudgetHandle({
        deadlineMonoMs:
          deadlineMonoMs === undefined || deadlineMonoMs === null
            ? nowMonoMs() + IO_CEILING_MS
            : deadlineMonoMs,
        clock: { setTimeout: delay, clearTimeout: clearDelay },
        nowMonoMs,
      })
    : budget;
  if (
    !isObj(handle) ||
    typeof handle.assertLive !== "function" ||
    typeof handle.onExpire !== "function"
  ) {
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
    handle,
    retainActual: retain,
    statFile,
    createStream,
  }).readFact;

  try {
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
    const pyReal = resolvePath(pythonExecutable);
    const pyImage = resolvePythonProcessImage(pythonExecutable, {
      resolvePath,
    });
    const lsofReal = resolvePath(LSOF_PATH);

    // Exactly the three frozen Python sources, sorted by their
    // recorded-root-relative refs with real size/digest. A helper outside
    // the recorded root fails confinement.
    const helpers = [];
    for (const h of helperPaths) {
      const abs = resolvePath(h);
      const rel = path.relative(recordRoot, abs).split(path.sep).join("/");
      if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
        throw acct(`helper outside recordRoot ${rel}`);
      }
      const r = await readFact(abs, TEXT_CAP, "helper");
      helpers.push({
        path: rel,
        byteLength: r.buf.length,
        sha256: r.sha256,
      });
    }
    helpers.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

    // A readable libproc image is hashed; the ONLY shared-cache case is a
    // provably absent standalone path (ENOENT from stat or read), bound
    // to the observed OS build and the fixed ABI. Any other IO failure —
    // permission, interruption, malformed — fails closed, never a cache
    // fallback.
    let image;
    try {
      image = {
        kind: "file",
        sha256: (await readFact(LIBPROC_PATH, BIN_CAP, "libproc", true))
          .sha256,
      };
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
    const pyImageFact =
      pyImage === pyReal
        ? pyFact
        : await readFact(pyImage, BIN_CAP, "python image", true);
    const identity = {
      backendId: "darwin-arm64-libproc-v1",
      os: {
        platform: "darwin",
        arch: "arm64",
        release: osRelease(),
        version: osVersion(),
        build: osBuild,
      },
      python: {
        invocationPath: pythonExecutable,
        realPath: pyReal,
        sha256: pyFact.sha256,
        processImage: {
          realPath: pyImage,
          sha256: pyImageFact.sha256,
        },
        version: py.version,
        executable: py.executable,
        prefix: py.prefix,
        basePrefix: py.basePrefix,
      },
      helpers,
      libproc: { path: LIBPROC_PATH, abi: { ...ABI }, image },
      lsof: {
        invocationPath: LSOF_PATH,
        realPath: lsofReal,
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
}
