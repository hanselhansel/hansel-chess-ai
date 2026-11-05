// watchdog-child-test-fixtures.mjs (TEST-ONLY): the child/fixture leaf
// of the watchdog fixture DAG. Corrective 69 moved the WHOLE
// forkDriverFixture, createObservedDriver and drivers factories — the
// faithful fork-shaped child and the real-channel assemblies that mint
// each channel's OWN genuine driver actual scope BEFORE the
// constructor under the SAME trusted retainActual registrar — plus the
// shared watchdogTestClock into the new
// watchdog-driver-test-fixtures.mjs leaf; this owner imports and
// re-exports the IDENTICAL three factories so the accepted roster and
// every existing import path stay unchanged. Corrective 67 moved
// liveStart/closeFacts/FINISH to the drain leaf — re-exported
// identically as well. What stays owned here is the WHOLE scripted
// cleanupMonitorFixture surface, the moved cleanup fixture/SUP/COL
// bindings, the closeDriverFacts close-emitter and the WHOLE REAL-FS
// recorder interception owner whole-moved from the base owner (the
// base re-exports the IDENTICAL function object). Imported only by
// test-fixture and test owners; never imported by production modules.
// No real fork/spawn/kill, Native, browser, model or network work, no
// proof authority, and no inherited runtime flags.
import { constants as fsConstants, promises as fsp, realpathSync } from "node:fs";
import path from "node:path";

import { copyDeep } from "./protocol-values.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { identity } from "./supervision-test-fixtures.mjs";
import {
  createRunDrainBinding,
  issueFixtureBody,
  watchdogTestClock,
} from "./watchdog-drain-test-fixtures.mjs";
import { registerFixtureTeardown } from "./watchdog-fs-test-fixtures.mjs";

// The driver-assembly factories whole-moved to the driver leaf under
// 69 — re-exported identically so the accepted roster stays.
export {
  forkDriverFixture,
  createObservedDriver,
  drivers,
} from "./watchdog-driver-test-fixtures.mjs";

// liveStart/closeFacts/FINISH whole-moved to the drain leaf under 67.
export { liveStart, closeFacts, FINISH } from "./watchdog-drain-test-fixtures.mjs";

// Emit the actual child facts a driver channel's reap waits on — the
// genuine exit and BOTH real pipe closes through the fork-shaped child.
// EVERY still-queued actual send callback is released FIRST — delivery
// is attempted for all even when one throws — and the retained first
// thrown value rethrows only after the genuine facts still deliver, so
// a held callback can never be abandoned or stand in for close proof.
export const closeDriverFacts = ({ driver }) => {
  try {
    driver.releaseSendCallbacks();
  } finally {
    driver.exit(0);
    driver.closeOut();
    driver.closeErr();
  }
};

const FAIL = (code, detail) => {
  const e = new Error(`watchdog-fixture ${code}: ${detail}`);
  e.code = code;
  return e;
};
const keyOf = (i) => (i ? `${i.pid}:${i.startSec}:${i.startUsec}` : null);

// The scripted monitor surface: only explicit tuple, probe, listener,
// signal, observation and handle facts in `script`; unscripted calls
// remain UNAVAILABLE — never a fabricated gone/sent/closed/success —
// matching the real controller's sticky-failure verdicts. Unscripted
// registerRoot rejects with the real ACCOUNTING_UNAVAILABLE (no
// unconditional identity for an unknown root); protected
// supervisor/collector roots are never signalled; no raw/group/PID-only
// kill path exists; no proof/status authority and no alternate registry.
// Ambiguous or failed scripted facts remain unavailable to the real
// createCleanupController, which still computes and retains the genuine
// proof.
export function cleanupMonitorFixture({
  runId,
  clock,
  supervisor,
  collector,
  rows = [],
  script = {},
}) {
  const calls = [];
  const registeredPorts = [];
  const rowList = () => copyDeep(typeof rows === "function" ? rows() : rows);
  // A signal is coherent only when the addressed full tuple is an actual
  // retained registry row under the SAME scope — the real controller
  // echoes each row's own scopeRunId, so an exact tuple+scope match is
  // the discriminating fact. An unknown or scope-mismatched tuple stays
  // unavailable; a positive scripted result can never bless it.
  const coherentTarget = (arg) =>
    rowList().some(
      (r) =>
        keyOf(r.identity) === keyOf(arg.identity) &&
        r.scopeRunId === arg.scopeRunId,
    );
  const monitor = {
    _ready: () => ({
      supervisor: copyDeep(supervisor),
      collector: copyDeep(collector),
      ...(script.readyExtra ?? {}),
    }),
    _ownership: { _ownedRows: () => rowList() },
    lastObservation: () =>
      copyDeep(
        typeof script.observation === "function"
          ? script.observation()
          : (script.observation ?? { accountingValid: false }),
      ),
    probeIdentity: async (identityArg) => {
      calls.push(`probe:${keyOf(identityArg)}`);
      if (script.probeError !== undefined) throw script.probeError;
      if (typeof script.probe === "function") return script.probe(identityArg);
      const map = script.probes ?? {};
      const k = keyOf(identityArg);
      return k in map ? map[k] : (script.probeDefault ?? "unavailable");
    },
    registerRoot: async (arg) => {
      calls.push(`registerRoot:${arg.pid}:${arg.kind}`);
      if (typeof script.registerRoot === "function") return script.registerRoot(arg);
      const known = script.knownRoots ?? {};
      if (arg.pid in known) return { identity: copyDeep(known[arg.pid]) };
      throw FAIL("ACCOUNTING_UNAVAILABLE", "unscripted root");
    },
    registerPort: (arg) => {
      calls.push(`registerPort:${arg.port}:${arg.scopeRunId}`);
      // The registration is RETAINED: the real coherent fact a later
      // listener query must answer against, not a logged no-op.
      registeredPorts.push(
        copyDeep({
          address: arg.address,
          port: arg.port,
          ownerIdentity: arg.ownerIdentity,
          scopeRunId: arg.scopeRunId,
        }),
      );
    },
    signalOwned: async (arg) => {
      calls.push(`signal:${arg.signal}:${keyOf(arg.identity)}:${arg.scopeRunId}`);
      const k = keyOf(arg.identity);
      if (k === keyOf(supervisor) || k === keyOf(collector)) {
        throw FAIL("SIGNAL_PROTECTED", "protected root");
      }
      if (script.signalError !== undefined) throw script.signalError;
      if (!coherentTarget(arg)) {
        throw FAIL("SIGNAL_UNAVAILABLE", "no coherent tuple+scope row");
      }
      if (typeof script.onSignal === "function") script.onSignal(arg);
      if (script.signalResult !== undefined) return script.signalResult;
      throw FAIL("SIGNAL_UNAVAILABLE", "unscripted signal");
    },
    queryListeners: async (scope) => {
      calls.push(`queryListeners:${scope}`);
      if (script.queryError !== undefined) throw script.queryError;
      const l = (script.listeners ?? {})[scope];
      if (l === undefined) throw FAIL("LISTENERS_UNAVAILABLE", `unscripted ${scope}`);
      return copyDeep(l);
    },
    stopAndReap: async (arg) => {
      calls.push("stopAndReap");
      if (script.stopError !== undefined) throw script.stopError;
      // A scripted REAL channel settles the collector reap through its own
      // actual lifecycle — genuine exit plus BOTH retained pipe closes —
      // never a canned receipt or a no-op settlement callback.
      if (script.stopChannel !== undefined) {
        const remaining =
          arg && Number.isSafeInteger(arg.deadlineMonoMs)
            ? Math.max(1, arg.deadlineMonoMs - clock.nowMonoMs())
            : 5000;
        return script.stopChannel.reap(remaining);
      }
      if (script.stopResult !== undefined) return copyDeep(script.stopResult);
      throw FAIL("REAP_UNAVAILABLE", "unscripted reap");
    },
    start: async () => {
      calls.push("monitor.start");
      if (script.startError !== undefined) throw script.startError;
      if (script.startPromise !== undefined) return script.startPromise;
      if (script.startStall === true) return new Promise(() => {});
      return { started: true };
    },
  };
  return { monitor, calls, registeredPorts };
}

export const SUP = identity(1);
export const COL = identity(2);

export const fixture = (rows, script = {}) => {
  const clk = watchdogTestClock();
  const { monitor, calls } = cleanupMonitorFixture({
    runId: "R1",
    clock: clk,
    supervisor: SUP,
    collector: COL,
    rows,
    script,
  });
  // The returned cc is the declared transparent tap over the ONE frozen
  // real controller: run forwards exactly once with the original
  // q/result/error and verifyCleanup passes through unchanged — the
  // frozen object is never mutated and no proof or second controller
  // is minted. Every cc.run(q) result is the ORIGINAL promise already
  // associated for drive/drain — callers never wrap it.
  const binding = createRunDrainBinding({ monitor, clock: clk, runId: "R1" });
  const cc = binding.cleanup;
  // The additive binding: ONE genuine default createWatchdogLifetime,
  // pure/lazy — the hold arms only when actual debt registers, never
  // at construction; no extra owner, noop or allowFake.
  const lifetime = createWatchdogLifetime();
  return { clk, monitor, calls, cc, lifetime };
};

// The REAL-FS recorder interception owner whole-moved here from the
// declared base owner: its private error factory keeps the original
// watchdog-test-fixture prefix and FIXTURE_CONFIG code under the
// name-only recorderFsFail alias — this leaf's own two-arg FAIL above
// stays untouched — and the base owner re-exports the IDENTICAL
// function object so every existing importer keeps the same signature
// and returned roster.
const recorderFsFail = (detail) => {
  const e = new Error(`watchdog-test-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

// The REAL-FS recorder interception owner (corrective 67, declared
// before use): exact canonical phase manifest/running rename ADMISSION
// journals — in the original [manifest, monitor.start, running, fork]
// order, never a seal marker — plus the ONE held kind:fault events
// write on the actual append-mode events.jsonl FileHandle. Install
// AFTER the genuine root/Recorder acquisition and before w.run; the
// Recorder passed to createWatchdog stays the ORIGINAL object. Saved
// fsp.open/fsp.rename delegate every other path/call with the SAME
// this/args/result/error; the append acquisition pins the returned
// REAL FileHandle and replaces ONLY that object's write method — the
// saved descriptor is restored later, all stat/read/sync/close and
// ownership behavior intact. The instrumented write preregisters its
// WHOLE wrapper on `bodies` — the SAME caller-owned lateBodies
// aggregate — BEFORE inspection: an owned buffer copy recognizes the
// FIRST complete canonical kind:fault line at offset zero, the
// existing faultGate.entered latches at that ACTUAL write entry, the
// still-held gate is awaited, then the saved write runs with the
// original args/this on the original caller channel. No payload
// rewrite, replacement writer, fabricated event or stop-send proxy;
// one selected fault consumes the gate and later writes delegate while
// instrumentation stays installed. release unconditionally unlatches
// the existing fault gate BEFORE any join — including a late entry —
// join only fences NEW interception and waits every admitted
// open/write/rename wrapper plus its actual continuation (never FD
// closure, never a nested global dispose or own-body self-wait), and
// restore returns the exact saved descriptors/methods only after join
// and the outer actual closure validation. Registration lands BEFORE
// the interception installs. Returns a frozen {join, restore}.
export function instrumentRecorderFs(
  t,
  { workspaceRoot, phase, journal, faultGate = null, bodies } = {},
) {
  const phaseDir = phase === "watchdog-selftest" ? "preflight/selftest" : phase;
  const canonicalRoot = realpathSync(`${workspaceRoot}`);
  const wanted = {
    manifest: path.join(canonicalRoot, phaseDir, "manifest.json"),
    running: path.join(canonicalRoot, phaseDir, "running.json"),
    events: path.join(canonicalRoot, phaseDir, "events.jsonl"),
  };
  const orig = {
    open: fsp.open,
    realpath: fsp.realpath,
    rename: fsp.rename,
  };
  const ops = [];
  const pinned = [];
  let pending = 0;
  let eventsPinned = false;
  let faultSeen = false;
  let issuanceClosed = false;
  let disposed = false;
  // Canonical selection identical in spirit to gateFs: realpath the
  // EXISTING parent then rejoin the basename, so a not-yet-created
  // rename target still matches and /var aliases never miss.
  const canon = async (p) => {
    const abs = path.resolve(`${p}`);
    try {
      const real = await orig.realpath(path.dirname(abs));
      return path.join(real, path.basename(abs));
    } catch {
      return null;
    }
  };
  // Every admitted call registers its WHOLE wrapper receipt BEFORE the
  // underlying invocation may run so join covers canon, the original FS
  // call and the caller return alike.
  const wrap = (body) => {
    pending += 1;
    const op = Promise.resolve()
      .then(body)
      .finally(() => {
        pending -= 1;
      });
    ops.push(op);
    return op;
  };
  // The append-mode events.jsonl acquisition pins the SAME real
  // FileHandle and replaces ONLY its write: descriptor saved for the
  // exact restore; the pinned entries stay strongly reachable until it.
  const pin = (handle) => {
    const own = Object.getOwnPropertyDescriptor(handle, "write");
    const savedWrite = handle.write;
    const writeBody = async (...wargs) => {
      let claim = false;
      if (
        faultGate !== null &&
        !faultSeen &&
        Buffer.isBuffer(wargs[0]) &&
        (wargs[1] === 0 || wargs[1] === undefined)
      ) {
        try {
          claim =
            JSON.parse(Buffer.from(wargs[0]).toString().split("\n")[0])
              .kind === "fault";
        } catch {
          claim = false;
        }
      }
      if (claim) {
        faultSeen = true;
        faultGate.entered = true;
        if (faultGate.held) await faultGate.promise;
      }
      return savedWrite.apply(handle, wargs);
    };
    pinned.push({ handle, own });
    handle.write = (...wargs) =>
      issueFixtureBody(bodies, () => wrap(() => writeBody(...wargs)));
  };
  const onOpen = (p, flags, mode) => {
    if (issuanceClosed || disposed) return orig.open(p, flags, mode);
    return wrap(async () => {
      const handle = await orig.open(p, flags, mode);
      const isAppend =
        typeof flags === "string"
          ? flags.includes("a")
          : (flags & fsConstants.O_APPEND) !== 0;
      if (!eventsPinned && isAppend && (await canon(p)) === wanted.events) {
        eventsPinned = true;
        pin(handle);
      }
      return handle;
    });
  };
  const onRename = (a, b) => {
    if (issuanceClosed || disposed) return orig.rename(a, b);
    return wrap(async () => {
      const cb = await canon(b);
      if (cb === wanted.manifest) journal.push("manifest");
      else if (cb === wanted.running) journal.push("running");
      return orig.rename(a, b);
    });
  };
  const join = async () => {
    issuanceClosed = true;
    for (let i = 0; i < ops.length; i += 1) {
      await ops[i].catch(() => {});
    }
  };
  const restore = () => {
    if (!issuanceClosed || pending !== 0) {
      throw recorderFsFail("restore before admitted wrappers settled");
    }
    disposed = true;
    issuanceClosed = true;
    for (const entry of pinned) {
      if (entry.own === undefined) delete entry.handle.write;
      else Object.defineProperty(entry.handle, "write", entry.own);
    }
    fsp.open = orig.open;
    fsp.rename = orig.rename;
  };
  // The instrument registers its release/settle/restore BEFORE the
  // interception installs — the fault gate is unconditionally released
  // first, then every admitted wrapper joins, then descriptors return.
  registerFixtureTeardown(t, {
    release: () => {
      if (faultGate !== null) {
        faultGate.held = false;
        faultGate.release();
      }
    },
    settle: join,
    restore,
  });
  fsp.open = onOpen;
  fsp.rename = onRename;
  return Object.freeze({ join, restore });
}
