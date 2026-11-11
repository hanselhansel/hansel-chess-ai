// Archived child process assembly. The supervisor alone authorizes Native
// identities and physical signals. This owner closes public SDK resources.
import { policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { deepEqual } from "./schema-primitives.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { privateFs as fsp } from "./private-fs.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { assertRecord } from "./record-schema.mjs";
import { createWatchdogLifetime, reportDriverDiagnostic } from "./watchdog-lifetime.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createSnapshotIO } from "./snapshot-io.mjs";
import { createDriverCapabilities } from "./driver-bridge.mjs";
import { startFixtureServer } from "./server.mjs";
import { openBrowser } from "./browser.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { runPhase } from "./phase-runners.mjs";

const now = () => Number(process.hrtime.bigint() / 1000000n);
const PINS = new Set();
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};

async function syntheticChild(capabilities, lifetime, node) {
  const physical = deferred();
  const rawSpawn = deferred();
  const pin = { child: null, physical, rawSpawn };
  PINS.add(pin);
  lifetime.retainActual(physical.promise);
  lifetime.retainActual(rawSpawn.promise);
  let child;
  let exit = false;
  let knownNoChild = false;
  const closed = [false, false];
  const retire = () => {
    if ((exit || knownNoChild) && closed.every(Boolean)) {
      physical.resolve();
      PINS.delete(pin);
    }
  };
  try {
    child = spawn(node.invocationPath, ["-e", "setInterval(() => {}, 1000)"], {
      stdio: ["ignore", "pipe", "pipe"], env: { PATH: "/usr/bin:/bin" },
    });
    pin.child = child;
    rawSpawn.resolve();
  } catch (error) {
    rawSpawn.resolve();
    physical.resolve();
    PINS.delete(pin);
    throw error;
  }
  child.on("error", () => {
    if (child.pid === undefined) {
      knownNoChild = true;
      retire();
    }
  });
  child.on("exit", () => { exit = true; retire(); });
  for (const [index, pipe] of [child.stdout, child.stderr].entries()) {
    if (pipe) {
      pipe.on("error", () => {});
      pipe.on("data", () => {});
      pipe.on("close", () => { closed[index] = true; retire(); });
    }
  }
  if (!Number.isSafeInteger(child.pid)) {
    await physical.promise;
    throw new Error("RUN_INVALID synthetic child creation");
  }
  await capabilities.register({ kind: "fixture", rootPid: child.pid,
    expectedExecutable: node.realPath, listener: null });
  return { settled: physical.promise };
}

// Private actual body, also selected verbatim by the TEST AST bridge.
async function closeSdkResources(capabilities, resources) {
  const signal = capabilities.signal;
  const operation = capabilities.operation;
  const calls = resources.map((resource) => {
    if (resource === null || typeof resource?.close !== "function") {
      throw new Error("RUN_INVALID SDK close resource");
    }
    return resource.close.bind(resource);
  });
  if (signal.aborted) {
    throw signal.reason;
  }
  await operation("command", `${capabilities.runId}-sdk-close`, async () => {
    if (signal.aborted) {
      throw signal.reason;
    }
    let failed = false;
    let first;
    for (const close of calls) {
      try {
        await close();
      } catch (error) {
        if (!failed) {
          failed = true;
          first = error;
        }
      }
    }
    if (failed) {
      throw first;
    }
    if (signal.aborted) {
      throw signal.reason;
    }
    return { status: "completed", evidencePaths: [], detail: { attemptedSdkCloses: calls.length } };
  });
}

export async function executeDriver({ manifestPath, workspaceRoot, repoRoot }) {
  if (!path.isAbsolute(manifestPath) || !path.isAbsolute(workspaceRoot) || !path.isAbsolute(repoRoot) ||
    typeof process.send !== "function") {
    throw new Error("RUN_INVALID archived driver arguments/IPC");
  }
  const lifetime = createWatchdogLifetime({ reportAwaitStage: (line) => process.stderr.write(line) });
  const budget = createBudgetHandle({ deadlineMonoMs: now() + 30000,
    clock: { setTimeout, clearTimeout }, nowMonoMs: now });
  const reader = createSnapshotIO({ workspaceRoot, repoRoot, budget, lifetime });
  let session = null;
  let browser = null;
  const servers = [];
  const controller = new AbortController();
  let syntheticSilent = false;
  let diagnosticScope = "phase";
  let hasPrimary = false;
  let primary;
  const retainPrimary = (error) => {
    if (!hasPrimary) {
      hasPrimary = true;
      primary = error;
    }
  };
  try {
    const manifestRel = path.relative(workspaceRoot, manifestPath);
    const manifest = parseCanonicalBytes(await reader.readAt(workspaceRoot, manifestRel));
    assertRecord("manifest", manifest);
    diagnosticScope = manifest.phase === "watchdog-selftest" ? "selftest" : "phase";
    const expectedRel = manifest.phase === "watchdog-selftest"
      ? "preflight/selftest/manifest.json" : `${manifest.phase}/manifest.json`;
    if (manifestRel !== expectedRel) {
      throw new Error("RUN_INVALID exact manifest path");
    }
    const workspace = freezeDeep(parseCanonicalBytes(await reader.readAt(workspaceRoot, "workspace.json", true)));
    assertRecord("workspace", workspace);
    if (workspace.schemaVersion !== manifest.schemaVersion ||
      !deepEqual(workspace.commonIdentity.evaluationPolicy ?? null, manifest.evaluationPolicy ?? null) ||
      workspace.workspaceId !== manifest.workspaceId ||
      sha256Bytes(canonicalBytes(workspace.commonIdentity)) !== manifest.commonIdentitySha256) {
      throw new Error("RUN_INVALID manifest/workspace identity");
    }
    const protocolPath = workspace.commonIdentity.fixtures.protocol.path;
    const evaluationPolicy = workspace.commonIdentity.evaluationPolicy ?? null;
    assertPolicyBinding({ schemaVersion: manifest.schemaVersion, evaluationPolicy, protocolPath });
    const protocolBytes = await reader.readAt(workspaceRoot, `inputs/harness/${protocolPath}`, true);
    if (!deepEqual(workspace.commonIdentity.fixtures.protocol, { path: protocolPath,
      byteLength: protocolBytes.length, sha256: sha256Bytes(protocolBytes) })) throw new Error("RUN_INVALID protocol ref");
    const selectedProtocol = validateProtocolFixture(parseJSONBytes(protocolBytes));
    if (!deepEqual(policyForProtocol(selectedProtocol, protocolPath), evaluationPolicy)) throw new Error("RUN_INVALID protocol policy");
    const scratch = path.join(workspaceRoot, path.dirname(manifestRel), "driver-tmp");
    await reader.call("driver scratch directory", () => fsp.mkdir(scratch, { mode: 0o700 }));
    const scratchReal = await reader.call("driver scratch canonical path", () => fsp.realpath(scratch));
    if (scratchReal !== scratch) throw new Error("RUN_INVALID driver scratch root");
    // This private fork alone owns the SDK process environment. Public
    // launchServer/Vite temporary profiles and caches stay counted.
    for (const key of ["TMPDIR", "TMP", "TEMP", "HOME", "XDG_CACHE_HOME"]) {
      process.env[key] = scratch;
    }
    const transport = {
      pid: process.pid, retainActual: lifetime.retainActual,
      send: (frame, callback) => process.send(frame, callback),
      onMessage(callback) {
        process.on("message", callback);
        return () => process.off("message", callback);
      },
      onClose(callback) {
        process.on("disconnect", callback);
        return () => process.off("disconnect", callback);
      },
      clock: {
        setInterval(callback, ms) {
          return setInterval(() => {
            if (!syntheticSilent) callback();
          }, ms);
        },
        clearInterval,
      },
    };
    session = createDriverCapabilities({ runId: manifest.runId, manifest, transport, signal: controller.signal });
    await session.start({ manifestPath });
    const capabilities = session.capabilities;
    if (manifest.phase === "watchdog-selftest") {
      // Deliberately suppress this isolated driver's heartbeat only after
      // its surviving child has a genuine Native registration ACK. IPC
      // remains responsive to stop; no browser/model/scored game exists.
      budget.dispose();
      const surviving = await syntheticChild(capabilities, lifetime, workspace.commonIdentity.environment.node);
      // The registration must finish before the heartbeat is suppressed.
      // The child physical receipt is intentionally not awaited here:
      // it remains owned until Native scoped cleanup.
      surviving.settled.catch(retainPrimary);
      await capabilities.event("response", { syntheticChildStarted: true, scoredGames: 0 });
      syntheticSilent = true;
      if (!capabilities.signal.aborted) {
        await new Promise((resolve) => capabilities.signal.addEventListener("abort", resolve, { once: true }));
      }
      // Finally sends CLOSED before joining this SAME retained physical
      // child receipt. Native cleanup may terminate both child and driver.
    } else {
      const fixtureReader = reader;
      const fixtures = { protocol: selectedProtocol };
      for (const [name, file] of [["openings", "browser-openings.json"], ["parity", "browser-parity.json"]]) {
        fixtures[name] = parseJSONBytes(await fixtureReader.readAt(workspaceRoot,
          `inputs/harness/train/fixtures/${file}`, true));
      }
      const dependenciesRoot = await reader.call("canonical dependencies root", () =>
        fsp.realpath(path.join(workspaceRoot, "inputs/harness/node_modules")));
      budget.dispose();
      const harnessRoot = path.join(workspaceRoot, "inputs/harness");
      const modelRef = { path: path.join(workspaceRoot, "inputs/model/tinyaz-m.bin"),
        metadataPath: path.join(workspaceRoot, "inputs/setup/tinyaz-m.meta.json"),
        byteLength: workspace.commonIdentity.model.byteLength, sha256: workspace.commonIdentity.model.sha256 };
      let selftestEvidence = null;
      if (manifest.phase === "preflight") {
        await capabilities.operation("command", `${manifest.runId}:preflight-selftest`, async ({ remainingMs }) => {
          const current = createBudgetHandle({ deadlineMonoMs: now() + Math.floor(remainingMs),
            clock: { setTimeout, clearTimeout }, nowMonoMs: now });
          const abort = () => current.narrow(now());
          capabilities.signal.addEventListener("abort", abort, { once: true });
          try {
            if (capabilities.signal.aborted) throw capabilities.signal.reason;
            const io = createSnapshotIO({ workspaceRoot, repoRoot, budget: current, lifetime });
            const filename = "preflight/selftest/completion.json";
            const bytes = await io.readAt(workspaceRoot, filename);
            const completionRef = { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
            const verified = await verifyReceipt({ workspaceRoot, completionRef,
              expectedIdentity: workspace.commonIdentity }, { retainActual: lifetime.retainActual }, { budget: current });
            current.assertLive("selftest receipt read");
            if (capabilities.signal.aborted) throw capabilities.signal.reason;
            selftestEvidence = { completionRef, final: verified.final };
            return { status: "completed", evidencePaths: [filename], detail: { scoredGames: verified.final.summary.scoredGames } };
          } finally {
            capabilities.signal.removeEventListener("abort", abort);
            current.dispose();
          }
        });
      }
      const byArm = {};
      await capabilities.operation("readiness", `${manifest.runId}-runtime-readiness`, async () => {
      for (const arm of ["candidate", "baseline"]) {
        const server = await startFixtureServer({ snapshotRoot: path.join(workspaceRoot, `inputs/${arm}`),
          harnessRoot, dependenciesRoot,
          modelRef, arm, capabilities });
        servers.push(server);
        byArm[arm] = server;
      }
      browser = await openBrowser({ environment: workspace.commonIdentity.environment, workspaceRoot, capabilities, diagnosticOwner: lifetime });
        return { status: "completed", evidencePaths: [], detail: { registeredFixtureCount: servers.length } };
      });
      const outcome = await runPhase({ manifest, capabilities,
        resources: Object.freeze({ browser, servers: Object.freeze(byArm), workspaceRoot,
          commonIdentity: workspace.commonIdentity, lifetime, fixtures, selftestEvidence }) });
      await closeSdkResources(capabilities, [browser, ...servers.slice().reverse()]);
      await capabilities.operation("command", `${manifest.runId}:final-integrity`, async () => ({
        status: "completed", evidencePaths: [], detail: {},
      }));
      await session.finish(outcome);
    }
  } catch (error) {
    // A validated STOP is ordinary cancellation. Keep IPC until CLOSED
    // and join the same actual bodies, SDK closes and send callbacks.
    if (session === null || !session.isPlannedStop(error)) {
      retainPrimary(error);
      // Genuine faults still wake the supervisor before a held SDK close.
      if (process.connected) process.disconnect();
      controller.abort(error);
      reportDriverDiagnostic(lifetime, diagnosticScope, "driver.fault", primary);
    }
  } finally {
    budget.dispose();
    for (const resource of [browser, ...servers.reverse()]) {
      if (resource !== null) {
        try {
          await resource.close();
        } catch (error) {
          retainPrimary(error);
        }
      }
    }
    if (session !== null) {
      try {
        await session.close({ gracefulCloseAttempted: true });
      } catch (error) {
        retainPrimary(error);
      }
    }
    await lifetime.whenSettled();
    if (process.connected) process.disconnect();
  }
  if (hasPrimary) throw primary;
}
