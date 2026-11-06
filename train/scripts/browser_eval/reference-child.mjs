// Driver-owned reference process. The existing bridge owns its command
// deadline and the supervisor owns every physical signal/cleanup action.
import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { issueActual } from "./artifact-files.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { FIXED_LIMITS } from "./schema-constants.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
import { assertRecord } from "./record-schema.mjs";
import { freezeDeep, deepEqual } from "./schema-primitives.mjs";
import { isAbs, isObj } from "./protocol-values.mjs";

const fail = (detail) => {
  const error = new Error(`REFERENCE_UNAVAILABLE ${detail}`);
  error.code = "REFERENCE_UNAVAILABLE";
  return error;
};
// Strong resource pins retain child/pipe and pending-write observations until
// actual terminal closure. This is storage over the SAME lifetime receipts.
const ACTIVE = new Set();
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  promise.catch(() => {});
  return { promise, resolve, reject };
};

export async function runPythonReference({ manifest, capabilities, workspaceRoot, lifetime, commonIdentity }, adapters = undefined) {
  assertWatchdogLifetime(lifetime);
  if (adapters !== undefined && (!isObj(adapters) ||
    Object.keys(adapters).some((key) => key !== "spawn") || typeof adapters.spawn !== "function")) {
    throw fail("lowlevel spawn adapter");
  }
  const trustedSpawn = adapters === undefined;
  const spawnChild = trustedSpawn ? spawn : adapters.spawn;
  if (!isObj(manifest) || manifest.phase !== "parity" || !isAbs(workspaceRoot) ||
    typeof capabilities?.register !== "function" || typeof capabilities?.operation !== "function" ||
    typeof capabilities?.artifact !== "function") {
    throw fail("arguments");
  }
  manifest = freezeDeep(parseCanonicalBytes(canonicalBytes(manifest)));
  assertRecord("manifest", manifest);
  commonIdentity = freezeDeep(parseCanonicalBytes(canonicalBytes(commonIdentity)));
  assertCommonIdentity(commonIdentity);
  if (!deepEqual(manifest, capabilities.manifest) ||
    sha256Bytes(canonicalBytes(commonIdentity)) !== manifest.commonIdentitySha256) {
    throw fail("captured manifest/interpreter binding");
  }
  const python = commonIdentity.environment.python.runtime.invocationPath;
  const processImage = commonIdentity.environment.monitoring.python.processImage.realPath;
  const { signal, register, operation, artifact } = capabilities;
  const get = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get;
  try {
    get.call(signal);
  } catch {
    throw fail("genuine signal");
  }
  const fence = () => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };
  let report;
  await operation("command", `${manifest.runId}-python-parity`, async () => {
    fence();
    const scratch = path.join(workspaceRoot, "parity/tmp");
    await issueActual(lifetime.retainActual, () => fsp.mkdir(scratch, { mode: 0o700 }));
    fence();
    const scratchStat = await issueActual(lifetime.retainActual, () => fsp.lstat(scratch));
    fence();
    const scratchReal = await issueActual(lifetime.retainActual, () => fsp.realpath(scratch));
    fence();
    if (!scratchStat.isDirectory() || scratchStat.isSymbolicLink() || scratchReal !== scratch) {
      throw fail("owned scratch directory");
    }
    const physical = deferred();
    lifetime.retainActual(physical.promise);
    const pin = { child: null, physical, writes: new Set(), failure: null };
    ACTIVE.add(pin);
    let child;
    let gateAttempted = false;
    let issued = false;
    let first;
    let failed = false;
    const entry = deferred();
    let entryComplete = false;
    let entryBytes = Buffer.alloc(0);
    const fault = (error) => {
      if (!failed) {
        failed = true;
        first = error;
        pin.failure = { cause: error };
      }
      entry.reject(error);
    };
    const onAbort = () => fault(signal.reason);
    const stdout = [];
    const stderr = [];
    let total = 0;
    let exited = false;
    let knownNoChild = false;
    let exitCode = null;
    let exitSignal = null;
    const closed = [false, false, false];
    const retire = () => {
      if ((exited || knownNoChild) && closed.every(Boolean)) {
        physical.resolve();
        ACTIVE.delete(pin);
      }
    };
    try {
      EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
      const launcher = path.join(workspaceRoot, "inputs/harness/train/scripts/check_browser_parity.py");
      const args = ["-I", "-B", launcher, "--reference-child", "--gate-fd", "3",
        "--reference-root", path.join(workspaceRoot, "inputs/candidate/train/src"),
        "--manifest", path.join(workspaceRoot, "parity/manifest.json"),
        "--browser-results", path.join(workspaceRoot, "parity/browser-results.json")];
      try {
        // A supplied thunk can create resources before throwing. Crossing
        // its call boundary commits unknown physical debt before callout.
        fence();
        if (failed) {
          throw first;
        }
        issued = !trustedSpawn;
        child = spawnChild(python, args, {
          cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe", "pipe"],
          env: { PATH: "/usr/bin:/bin", PYTHONNOUSERSITE: "1", PYTHONDONTWRITEBYTECODE: "1",
            OMP_NUM_THREADS: "1", MKL_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1",
            TMPDIR: scratch, TMP: scratch, TEMP: scratch, HOME: scratch,
            XDG_CACHE_HOME: scratch, TORCH_HOME: scratch },
        });
        pin.child = child;
        issued = true;
      } catch (error) {
        if (trustedSpawn) {
          // Node's synchronous pre-issue validation allocated no child.
          physical.resolve();
          ACTIVE.delete(pin);
        }
        throw error;
      }
      let resolveCreation;
      let rejectCreation;
      const creation = new Promise((resolve, reject) => { resolveCreation = resolve; rejectCreation = reject; });
      creation.catch(() => {});
      child.on("error", (error) => {
        fault(error);
        if (child.pid === undefined) {
          knownNoChild = true;
          rejectCreation(error);
          retire();
        }
      });
      child.on("exit", (code, terminationSignal) => {
        exited = true;
        exitCode = code;
        exitSignal = terminationSignal;
        if (!entryComplete) fault(fail("interpreter entry exit"));
        retire();
      });
      const pipes = [child.stdout, child.stderr, child.stdio[3]];
      for (const [index, pipe] of pipes.entries()) {
        if (pipe === null || pipe === undefined) {
          fault(fail("missing allocated pipe"));
          continue;
        }
        pipe.on("error", fault);
        pipe.on("close", () => {
          closed[index] = true;
          if (index === 2 && !entryComplete) fault(fail("interpreter entry EOF"));
          retire();
        });
        if (index === 2) {
          pipe.on("end", () => {
            if (!entryComplete) fault(fail("interpreter entry EOF"));
          });
          pipe.on("data", (chunk) => {
            try {
              if (entryComplete) throw fail("duplicate interpreter entry");
              const bytes = Buffer.from(chunk);
              if (entryBytes.length + bytes.length > 4096) throw fail("interpreter entry byte ceiling");
              entryBytes = Buffer.concat([entryBytes, bytes]);
              const newline = entryBytes.indexOf(10);
              if (newline < 0) return;
              if (newline !== entryBytes.length - 1) throw fail("interpreter entry extra bytes");
              const value = parseJSONBytes(entryBytes);
              const expected = { type: "reference-entry", runId: manifest.runId, pid: child.pid,
                manifestSha256: sha256Bytes(canonicalBytes(manifest)) };
              if (!deepEqual(value, expected)) throw fail("interpreter entry binding");
              fence();
              if (failed) throw first;
              entryComplete = true;
              entry.resolve();
            } catch (error) {
              fault(error);
            }
          });
        }
        if (index < 2) {
          pipe.on("data", (chunk) => {
            const bytes = Buffer.from(chunk);
            total += bytes.length;
            if (total > FIXED_LIMITS.ipc.frameBytes) {
              fault(fail("combined child output ceiling"));
              // Continue draining to actual close. The child stays owned
              // and physical termination remains supervisor authority.
              return;
            }
            (index === 0 ? stdout : stderr).push(bytes);
          });
        }
      }
      retire();
      if (child.pid === undefined) {
        await creation;
      } else if (!Number.isSafeInteger(child.pid) || child.pid <= 0) {
        throw fail("child creation");
      } else {
        resolveCreation();
      }
      // DATA only. The unchanged strict Native image proof still follows.
      await entry.promise;
      fence();
      if (failed) throw first;
      const registration = await register({ kind: "python", rootPid: child.pid,
        expectedExecutable: processImage, listener: null });
      fence();
      if (failed) throw first;
      if (registration?.identity?.pid !== child.pid) {
        throw fail("registration ACK binding");
      }
      const gate = canonicalBytes({ type: "reference-go", runId: manifest.runId, pid: child.pid,
        manifestSha256: sha256Bytes(canonicalBytes(manifest)), imports: commonIdentity.environment.python.imports });
      gateAttempted = true;
      const sent = deferred();
      pin.writes.add(sent);
      lifetime.retainActual(sent.promise);
      // Genuine terminal closure independently settles an unknown write.
      // A synchronous throw alone never retires its receipt.
      physical.promise.then(() => sent.resolve());
      await new Promise((resolve, reject) => {
        try {
          child.stdio[3].end(gate, (error) => {
            sent.resolve();
            pin.writes.delete(sent);
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        } catch (error) {
          reject(error);
        }
      });
      await physical.promise;
      fence();
      const rawOut = Buffer.concat(stdout);
      const rawErr = Buffer.concat(stderr);
      const chunks = async function* () {
        for (let offset = 0; offset < rawOut.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
          yield rawOut.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
        }
      };
      await artifact("parity/python-reference.json", "append", chunks());
      const errorChunks = async function* () {
        for (let offset = 0; offset < rawErr.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
          yield rawErr.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
        }
      };
      fence();
      await artifact("parity/python-reference.stderr.txt", "append", errorChunks());
      if (failed) {
        throw first;
      }
      if (exitSignal !== null || ![0, 1].includes(exitCode) || rawErr.length !== 0) {
        throw fail(`child exit=${exitCode} signal=${exitSignal} stdoutBytes=${rawOut.length} stderrBytes=${rawErr.length} stderr=${rawErr.toString("utf8").slice(0, 4096)}`);
      }
      report = parseJSONBytes(rawOut);
      if (report.runId !== manifest.runId || report.passed !== (exitCode === 0)) {
        throw fail("actual report binding");
      }
      return { status: report.passed ? "completed" : "failed",
        evidencePaths: ["parity/python-reference.json", "parity/browser-results.json"],
        detail: { exitCode, stdoutBytes: rawOut.length, stderrBytes: rawErr.length } };
    } catch (error) {
      fault(error);
      if (!issued) {
        physical.resolve();
        ACTIVE.delete(pin);
      }
      if (issued && !knownNoChild && !gateAttempted && !signal.aborted && child?.stdio?.[3]) {
        // A live pre-gate failure may send EOF to reject before imports.
        // Prearm this separate raw write; closure still owns physical debt.
        gateAttempted = true;
        const sent = deferred();
        pin.writes.add(sent);
        lifetime.retainActual(sent.promise);
        physical.promise.then(() => sent.resolve());
        try {
          child.stdio[3].end(() => {
            sent.resolve();
            pin.writes.delete(sent);
          });
        } catch {
          // Unknown issue remains retained until actual terminal closure.
        }
      }
      throw first;
    } finally {
      EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      if (issued) {
        await physical.promise;
      }
    }
  });
  return report;
}
