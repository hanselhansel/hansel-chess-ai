// Pure constructor/run-context capture and validation, shared-owner capability
// derivation, and the whole stop-aware createWatchdogAwaiter producer.
// The whole createWatchdogOperationContext body now belongs to
// watchdog-operation-context.mjs under the approved V3 Split B; this module
// preserves its named re-export and Operations preserves its existing API.
// No timer, IO, spawn, Native action or second authority at construction.
import path from "node:path";
import { copyDeep, isObj, isIdentity } from "./protocol-values.mjs";
import { phaseRecorderLifetime } from "./records.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { processMonitorLifetime } from "./processes.mjs";
import { assertNativeHorizon } from "./process-horizon.mjs";
import { createDriverActualScope } from "./watchdog-driver.mjs";

const fail = (code, detail) => {
  const e = new Error(`watchdog-config ${code}: ${detail}`);
  e.code = code;
  return e;
};
const isAbs = (s) => typeof s === "string" && path.isAbsolute(s);
const strNE = (s) => typeof s === "string" && s.length > 0;

// Whole constructor/run-context capture and validation. No timer, IO,
// spawn, Native operation or await.
export function captureWatchdogRuntimeConfig(options, defaultClock = undefined) {
  const o = isObj(options) ? options : {};
  const {
    phase,
    runId,
    commonIdentitySha256,
    workspace,
    manifestPath,
    protocol,
    monitor,
    footprint,
    recorder,
    cleanup,
    driverEntry,
    spawnImpl = null,
    prerequisites = [],
    expectedSelfTest = null,
    selftestOwnerSupervisor = null,
    runInternalSelfTest = null,
    pgnEvidence = null,
    internalContext = null,
    phaseDeadlineMonoMs = null,
    lifetime,
    nativeHorizon,
    onBookkeepingSettlement = null,
    finalIntegrity = null,
  } = o;
  let clock;
  if (defaultClock === undefined) {
    clock = o.clock;
  } else if (Object.hasOwn(o, "clock")) {
    clock = o.clock;
  } else {
    clock = defaultClock;
  }
  if (!strNE(runId)) throw fail("IPC_INVALID", "runId");
  if (!strNE(phase)) throw fail("IPC_INVALID", "phase");
  if (!strNE(commonIdentitySha256)) throw fail("IPC_INVALID", "commonIdentitySha256");
  if (!isObj(workspace)) throw fail("IPC_INVALID", "workspace");
  if (!strNE(workspace.workspaceId)) throw fail("IPC_INVALID", "workspaceId");
  if (!isObj(workspace.commonIdentity)) throw fail("IPC_INVALID", "commonIdentity");
  if (!strNE(manifestPath)) throw fail("IPC_INVALID", "manifestPath");
  if (!isObj(protocol) || typeof protocol.accept !== "function")
    throw fail("IPC_INVALID", "protocol");
  if (!isObj(monitor)) throw fail("IPC_INVALID", "monitor");
  if (!isObj(footprint) || typeof footprint.scan !== "function")
    throw fail("IPC_INVALID", "footprint");
  if (!isObj(recorder) || !strNE(recorder.phaseDirectory))
    throw fail("IPC_INVALID", "recorder");
  if (!isObj(cleanup) || typeof cleanup.run !== "function")
    throw fail("IPC_INVALID", "cleanup");
  if (!isObj(clock)) throw fail("IPC_INVALID", "clock");
  if (typeof clock.setTimeout !== "function") throw fail("IPC_INVALID", "clock setTimeout");
  if (typeof clock.clearTimeout !== "function") throw fail("IPC_INVALID", "clock clearTimeout");
  if (typeof clock.setInterval !== "function") throw fail("IPC_INVALID", "clock setInterval");
  if (typeof clock.clearInterval !== "function") throw fail("IPC_INVALID", "clock clearInterval");
  if (typeof clock.nowMonoMs !== "function") throw fail("IPC_INVALID", "clock nowMonoMs");
  if (typeof clock.nowUtc !== "function") throw fail("IPC_INVALID", "clock nowUtc");
  if (!isObj(driverEntry)) throw fail("IPC_INVALID", "driverEntry");
  if (!isAbs(driverEntry.executable)) throw fail("IPC_INVALID", "driverEntry executable");
  if (!isAbs(driverEntry.expectedExecutable))
    throw fail("IPC_INVALID", "driverEntry expectedExecutable");
  if (!Array.isArray(driverEntry.args)) throw fail("IPC_INVALID", "driverEntry args");
  if (driverEntry.args.length < 1) throw fail("IPC_INVALID", "driverEntry args empty");
  if (!isAbs(driverEntry.args[0])) throw fail("IPC_INVALID", "driverEntry module abs");
  if (!driverEntry.args.every((a) => typeof a === "string"))
    throw fail("IPC_INVALID", "driverEntry args strings");
  if (!Array.isArray(prerequisites)) throw fail("IPC_INVALID", "prerequisites");
  if (runInternalSelfTest !== null && typeof runInternalSelfTest !== "function")
    throw fail("IPC_INVALID", "runInternalSelfTest");
  const integrityKeys = ["collect", "consume", "interrupt", "isComplete"];
  if (finalIntegrity !== null && (!isObj(finalIntegrity) || Object.keys(finalIntegrity).length !== 4 ||
    integrityKeys.some((key) => typeof finalIntegrity[key] !== "function"))) {
    throw fail("IPC_INVALID", "private finalIntegrity");
  }
  const ownedIntegrity = finalIntegrity === null ? null : Object.freeze(Object.fromEntries(
    integrityKeys.map((key) => [key, finalIntegrity[key]]),
  ));

  if (phaseDeadlineMonoMs !== null &&
    (!Number.isSafeInteger(phaseDeadlineMonoMs) || phaseDeadlineMonoMs <= 0)) {
    throw fail("IPC_INVALID", "phaseDeadlineMonoMs");
  }
  const selftestPhase = phase === "watchdog-selftest";
  // Trusted narrowing/cancel capability: selftest phase only. An absolute
  // hrtime-origin bound plus a genuine AbortSignal; invalid/missing selftest
  // context, or any other phase supplying it, is rejected.
  let ctxDeadlineMs = Infinity;
  let ctxSignal = null;
  if (internalContext !== null && internalContext !== undefined) {
    if (!selftestPhase) throw fail("IPC_INVALID", "internalContext phase");
    if (!isObj(internalContext)) throw fail("IPC_INVALID", "internalContext");
    if (typeof internalContext.deadlineMonoNs !== "bigint")
      throw fail("IPC_INVALID", "internalContext deadlineMonoNs");
    const ms = Number(internalContext.deadlineMonoNs / 1000000n);
    if (!Number.isSafeInteger(ms)) throw fail("IPC_INVALID", "internalContext bound safe");
    if (ms <= 0) throw fail("IPC_INVALID", "internalContext bound positive");
    // A genuine AbortSignal is a capability, not a canonical/plain object:
    // invoke the REAL platform `aborted` accessor so a duck-typed object or
    // prototype imitation (no AbortSignal brand) rejects rather than being
    // trusted. The capability is retained, never cloned.
    const sig = internalContext.signal;
    let genuine = false;
    try {
      const read = Object.getOwnPropertyDescriptor(
        AbortSignal.prototype,
        "aborted",
      ).get;
      genuine =
        sig !== null &&
        typeof sig === "object" &&
        typeof sig.addEventListener === "function" &&
        typeof sig.removeEventListener === "function" &&
        typeof read.call(sig) === "boolean";
    } catch {
      genuine = false;
    }
    if (!genuine) throw fail("IPC_INVALID", "internalContext signal genuine");
    // The REQUIRED private parent driver scope: mandatory for
    // watchdog-selftest only and retained by reference — a missing or
    // null value can never mint a permissive new root. The scope
    // factory's own brand/registrar/open checks run before any parent
    // property is read.
    if (
      internalContext.parentDriverScope === null ||
      internalContext.parentDriverScope === undefined
    ) {
      throw fail("IPC_INVALID", "internalContext parentDriverScope");
    }
    ctxDeadlineMs = ms;
    ctxSignal = sig;
  } else if (selftestPhase) {
    throw fail("IPC_INVALID", "watchdog-selftest requires internalContext");
  }
  if (selftestPhase && !isIdentity(selftestOwnerSupervisor))
    throw fail("IPC_INVALID", "selftestOwnerSupervisor");
  if (!selftestPhase && phase !== "preflight" && expectedSelfTest !== null)
    throw fail("IPC_INVALID", "expectedSelfTest phase");

  // Derive the absolute workspace root: dirname(manifestPath) must end with
  // the recorder's phaseDirectory segments directly under it.
  const dir = path.dirname(path.resolve(manifestPath));
  const depth = recorder.phaseDirectory.split("/").length;
  const workspaceRoot = path.resolve(dir, ...Array(depth).fill(".."));
  if (path.join(workspaceRoot, recorder.phaseDirectory) !== dir)
    throw fail("IPC_INVALID", "workspaceRoot/phaseDirectory");
  const manifestRel = path.relative(workspaceRoot, path.resolve(manifestPath));

  // Derived shared-owner binding: the GENUINE lifetime is inherited from
  // the recorder's store association — never a new ledger, a fallback
  // owner or a fake alias. Own-property presence, not truthiness,
  // decides omission: an explicit undefined/null is still supplied and
  // fails the brand assert rather than silently selecting the
  // trusted-fake lane.
  const hasLifetime = Object.hasOwn(o, "lifetime");
  const hasHorizon = Object.hasOwn(o, "nativeHorizon");
  const inheritedOwner = phaseRecorderLifetime(recorder);
  assertWatchdogLifetime(inheritedOwner);
  if (hasLifetime) {
    assertWatchdogLifetime(lifetime);
    if (lifetime !== inheritedOwner) {
      throw fail("IPC_INVALID", "lifetime owner identity");
    }
  }
  // The monitor's genuine Native association must carry the SAME owner:
  // a mismatched real monitor rejects even with both operational
  // options omitted. A null association is the trusted scripted
  // unit-fake lane, admissible ONLY with lifetime AND nativeHorizon
  // both genuinely omitted; there is no allowFake/testMode flag.
  const monitorOwner = processMonitorLifetime(monitor);
  if (monitorOwner !== null && monitorOwner !== inheritedOwner) {
    throw fail("IPC_INVALID", "monitor lifetime identity");
  }
  if (monitorOwner === null && (hasLifetime || hasHorizon)) {
    throw fail("IPC_INVALID", "monitor native association");
  }
  // A supplied horizon is brand-asserted BEFORE any owner property is
  // read: forged, spread, proxy, null and primitive values all reject
  // inside the owner authority. The nested watchdog-selftest never
  // holds a parent writer — any own-present horizon rejects there.
  if (hasHorizon) {
    assertNativeHorizon(nativeHorizon);
    if (selftestPhase) throw fail("IPC_INVALID", "nativeHorizon nested");
  }
  if (
    onBookkeepingSettlement !== null &&
    typeof onBookkeepingSettlement !== "function"
  ) {
    throw fail("IPC_INVALID", "onBookkeepingSettlement");
  }

  // ONE driver actual scope per run context: a top phase mints the root
  // scope and a watchdog-selftest enrolls under its REQUIRED supplied
  // parent — the SAME owner registrar, never a permissive nested root.
  // The opaque scope is retained by reference only, never copied.
  const driverActualScope = createDriverActualScope({
    retainActual: inheritedOwner.retainActual,
    runId,
    parentScope: selftestPhase ? internalContext.parentDriverScope : null,
  });

  const config = Object.freeze({
    phase,
    runId,
    commonIdentitySha256,
    workspace: copyDeep(workspace),
    manifestPath: `${manifestPath}`,
    driverEntry: Object.freeze({
      executable: driverEntry.executable,
      args: Object.freeze(driverEntry.args.slice()),
      expectedExecutable: driverEntry.expectedExecutable,
    }),
    prerequisites: copyDeep(prerequisites),
    expectedSelfTest: expectedSelfTest === null ? null : copyDeep(expectedSelfTest),
    selftestOwnerSupervisor: isIdentity(selftestOwnerSupervisor)
      ? copyDeep(selftestOwnerSupervisor)
      : null,
    selftestPhase,
    ctxDeadlineMs,
    phaseDeadlineMonoMs,
    ctxSignal,
    workspaceRoot,
    manifestRel,
  });
  const capabilities = Object.freeze({
    protocol,
    monitor,
    footprint,
    recorder,
    cleanup,
    clock,
    spawnImpl,
    runInternalSelfTest,
    finalIntegrity: ownedIntegrity,
    pgnEvidence,
    // Derived internal fields: the ONE genuine inherited owner, the
    // brand-asserted horizon (null only when truly omitted), the ONE
    // driver actual scope and the descriptive bookkeeping callback —
    // plus ONE frozen io reusing the owner's registrar, never a
    // caller-supplied capability bag.
    lifetime: inheritedOwner,
    nativeHorizon: hasHorizon ? nativeHorizon : null,
    driverActualScope,
    onBookkeepingSettlement,
    io: Object.freeze({ retainActual: inheritedOwner.retainActual }),
  });
  return { config, capabilities };
}

export { createWatchdogOperationContext } from "./watchdog-operation-context.mjs";

// createWatchdogAwaiter is the stop-aware wait producer under the SAME
// grouped run context: it receives the trusted {timing,control,makeError}
// triple and returns {bounded,checkLive}. bounded(p,ms,what) is the public
// wait bound only — never the awaited body or a physical receipt proof; a
// first stop (or driver close/finish wake) rejects the wait immediately
// instead of letting stalled IO postpone cleanup. Construction is pure:
// it captures references and defines the pair only — no timer, clock,
// callback, IO, Native, validator, hold, queue, ledger or status work.
export function createWatchdogAwaiter({ timing, control, makeError }) {
  const fail = makeError;

  // Every bootstrap/supervision await is stop-aware: the original bound
  // still applies, but a first stop (or driver close/finish wake) rejects
  // the wait immediately instead of letting stalled IO postpone cleanup.
  const bounded = (p, ms, what) =>
    new Promise((res, rej) => {
      const t = timing.later(
        () => rej(fail("ACCOUNTING_UNAVAILABLE", `${what} deadline`)),
        Math.max(1, ms),
      );
      control.wake.then(() => {
        timing.clearT(t);
        rej(fail("STOPPED", `${what} interrupted`));
      });
      Promise.resolve(p).then(
        (v) => {
          timing.clearT(t);
          res(v);
        },
        (e) => {
          timing.clearT(t);
          rej(e);
        },
      );
    });

  // Synchronous launch recheck: a stop observed before a launch aborts it.
  const checkLive = (what) => {
    if (control.stopped()) throw fail("STOPPED", what);
  };

  return Object.freeze({ bounded, checkLive });
}
