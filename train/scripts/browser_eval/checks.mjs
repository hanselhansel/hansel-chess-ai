// Whole functional group accounting. Only actual completed assertions can
// create passed claims. Cleanup remains the supervisor's separate check.
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { REQUIRED_CHECK_IDS, FIXED_LIMITS } from "./schema-constants.mjs";
import { checkEngine } from "./check-engine.mjs";
import { checkWorkbench } from "./check-workbench.mjs";

export async function runChecks({ manifest, capabilities, resources }) {
  if (manifest?.phase !== "check" || capabilities?.runId !== manifest.runId) {
    throw new Error("CHECK_INVALID phase binding");
  }
  const signal = capabilities.signal;
  const fence = () => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };
  const reports = [];
  const runCase = async (name, body, ownsOperations = false) => {
    fence();
    let report;
    const filename = `check/assertions/${name}.json`;
    const execute = async () => {
      try {
        const observed = await body();
        fence();
        report = { name, passed: true, observed };
      } catch (error) {
        fence();
        report = { name, passed: false,
          error: { code: typeof error?.code === "string" ? error.code : "ASSERTION_FAILED",
            message: String(error?.message ?? error).slice(0, 4096) } };
      }
      const bytes = canonicalBytes(report);
      const chunks = async function* () {
        for (let offset = 0; offset < bytes.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
          fence();
          yield bytes.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
        }
      };
      const ref = await capabilities.artifact(filename, "append", chunks());
      fence();
      if (ref.path !== filename || ref.byteLength !== bytes.length || ref.sha256 !== sha256Bytes(bytes)) {
        throw new Error("CHECK_INVALID assertion artifact ref");
      }
      return { status: report.passed ? "completed" : "failed", evidencePaths: [filename], detail: { name } };
    };
    if (ownsOperations) {
      await execute();
    } else {
      await capabilities.operation("command", `check-${name}`, execute);
    }
    reports.push(report);
    return { passed: report.passed, path: filename };
  };
  const context = Object.freeze({ manifest, capabilities, resources, runCase });
  const engine = await checkEngine(context);
  const workbench = await checkWorkbench(context);
  const groups = {};
  for (const owner of [engine, workbench]) {
    for (const [id, assertions] of Object.entries(owner)) {
      groups[id] = [...(groups[id] ?? []), ...assertions];
    }
  }
  const ids = REQUIRED_CHECK_IDS.check.filter((id) => id !== "cleanup");
  if (Object.keys(groups).length !== ids.length || ids.some((id) => !Array.isArray(groups[id]) || groups[id].length === 0)) {
    throw new Error("CHECK_INVALID missing actual group assertions");
  }
  const checks = ids.map((id) => ({ id,
    status: groups[id].every((entry) => entry.passed) ? "passed" : "failed",
    evidencePaths: groups[id].map((entry) => entry.path) }));
  return { checks, summary: { assertions: reports.map(({ name, passed, error }) => ({
    name, passed, evidencePath: `check/assertions/${name}.json`, ...(error === undefined ? {} : { error }),
  })) } };
}
