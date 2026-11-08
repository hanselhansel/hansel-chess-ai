// native-test-fixtures.mjs — TEST-only harness parent owner for the
// real Native supervision group. Sole export
// createNativeTestHarness({runId,recordRoot,pythonExecutable,
// helperPath,fixtureEntry,evidenceRoot,lifetime,observeChild?}); `lifetime` is a
// REQUIRED genuine createWatchdogLifetime owner minted by the caller
// BEFORE harness/monitor/Store/Recorder/WD and shared EXACTLY —
// brand-asserted before any debt, never a fallback or second owner.
// Construction is PURE: it captures the original group start
// G = floor(hrtime.bigint()/1e6), Gend = G+60000 and work end
// Gwork = Gend-5000, and performs no IO, timer, process or path
// resolution. Returned frozen twelve: runId, bounds, clock,
// createMonitor, spawnImpl, forkImpl, entry, launch, settleHandles,
// snapshot, finish, endCollectorInputForEof.
//
// Two private TEST leaves own the cohesive bodies over ONE borrowed
// state/inputs/bounds/clock/constants/observe: native-fixture-io.mjs
// owns the real spawn/fork physical records, pipe observation, bounded
// waits and the private-channel wait/send; native-fixture-admission.mjs
// owns the frozen fixture argv/options validation, the transparent
// real protocol/monitor composition, the closed private-frame matcher
// and the entry/launch admission flows. Neither leaf imports this
// parent or each other; the parent composes IO first with a lazy
// getAdmission() it may call only inside admitted runtime handlers,
// then admission over the real IO, and exposes the frozen public
// surface only after both are fully bound — never a TDZ callout.
//
// This parent keeps the shared state and ONE shared 4 MiB accounting:
// monotonic produced-byte counters that keep counting truthfully after
// overflow, plus retained trace/error/private projections charged by
// actual serialized size — crossing the unchanged bound is a retained
// failure flag, never a silent drop or underreport. It also owns the
// pure longest-match scope selection and wire-only scope assignment,
// scope settlement, the EOF one-shot, the once-cached finish and the
// copied bounded snapshot — never a pass, CleanupProof, native verdict
// or live handle. History: the whole-owner 941-line draft was declared
// KNOWN_OVERSIZE and is now split exactly along these boundaries with
// the bound corrections recorded in the current preparation binding.

import { realpathSync } from "node:fs";
import process from "node:process";

import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { createNativeFixtureIO } from "./native-fixture-io.mjs";
import { createNativeFixtureAdmission } from "./native-fixture-admission.mjs";
import { copyDeep, isAbs, isObj, strNE } from "./protocol-values.mjs";

const GROUP_MS = 60000;
const RESERVE_MS = 5000;
const FIXTURE_MS = 9500;
const FIXTURE_BOUND_MS = 10000;
const ADMIT_MS = 2000;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_LIST = 64;
const DIRECT_MODES = new Set(["idle", "listener", "term-ignore", "reparent", "finalizer"]);
const MODES = new Set([...DIRECT_MODES, "blocked-heartbeat"]);
const ARGV_FLAGS = new Set([
  "--mode", "--run-id", "--fixture-id", "--scope-run-id",
  "--fixture-start", "--fixture-end", "--role",
  "--manifest-path", "--node-image",
]);
const COMMON = ["testVersion", "runId", "fixtureId", "scopeRunId", "type", "pid"];
// Closed inbound private variants from the binding addendum: the only
// frame types a fixture may send, each with its exact extra keys.
const INBOUND_EXTRA = {
  waiting: ["mode", "role", "parentPid", "fixtureStartMonoMs", "fixtureEndMonoMs"],
  admitted: ["mode", "role", "fixtureStartMonoMs", "fixtureEndMonoMs"],
  listening: ["address", "port"],
  "descendant-waiting": ["descendant"],
  "descendant-admitted": ["descendantPid", "descendantFixtureId", "fixtureStartMonoMs", "fixtureEndMonoMs"],
};

const fail = (detail) => {
  const e = new Error(`native-harness ${detail}`);
  e.code = "NATIVE_HARNESS";
  return e;
};
// Serialized size of a retained projection — charged to the ONE shared
// pool so no retained copy escapes the accounting.
const sizeOf = (v) => {
  try {
    return Buffer.byteLength(JSON.stringify(v), "utf8");
  } catch {
    return 0;
  }
};

export function createNativeTestHarness({ runId, recordRoot, pythonExecutable, helperPath, fixtureEntry, evidenceRoot, lifetime, observeChild = null }) {
  if (
    !strNE(runId) ||
    ![recordRoot, pythonExecutable, helperPath, fixtureEntry, evidenceRoot].every(isAbs)
  ) {
    throw fail("options");
  }
  if (lifetime === undefined || lifetime === null) throw fail("lifetime");
  assertWatchdogLifetime(lifetime);
  if (observeChild !== null && typeof observeChild !== "function") throw fail("child observer");
  const nowMonoMs = () => Number(process.hrtime.bigint() / 1_000_000n);
  const Gstart = nowMonoMs();
  const bounds = Object.freeze({
    startedMonoMs: Gstart,
    workEndMonoMs: Gstart + GROUP_MS - RESERVE_MS,
    deadlineMonoMs: Gstart + GROUP_MS,
  });
  const clock = Object.freeze({
    setTimeout, clearTimeout, setInterval, clearInterval,
    nowMonoNs: () => process.hrtime.bigint().toString(),
    nowMonoMs,
    nowUtc: () => new Date().toISOString(),
  });
  const state = {
    produced: 0, retained: 0, overflow: false,
    errors: [], trace: [], children: [], fixtures: new Map(),
    monitors: new Map(), order: [], fixtureSeq: 0, finishP: null, nodeImage: null,
  };
  const nodeImagePath = () => {
    if (state.nodeImage === null) state.nodeImage = realpathSync(process.execPath);
    return state.nodeImage;
  };
  // Crossing the shared 4 MiB bound is a retained failure flag latched
  // once — the marker record itself is charged, never an unrecorded
  // transition and never a throw into a production listener.
  const markOverflow = () => {
    if (state.overflow) return;
    state.overflow = true;
    const e = { atMonoMs: nowMonoMs(), where: "retention", present: true, text: "4MiB bound" };
    state.errors.push(e);
    state.retained += sizeOf(e);
  };
  const charge = (n) => {
    state.retained += n;
    if (state.retained + state.produced > MAX_BYTES) markOverflow();
  };
  // Bounded error capture; the 64-entry pool is the error-diagnostic
  // bound only — every retained record is charged to the shared pool.
  const recordError = (where, value) => {
    const e = { atMonoMs: nowMonoMs(), where, ...guardedError(value) };
    if (state.errors.length >= MAX_LIST) {
      state.overflow = true;
    } else {
      state.errors.push(e);
      charge(sizeOf(e));
    }
    return e;
  };
  // Account n real produced child bytes: the counter stays monotonic
  // and truthful even after overflow — exceeding the unchanged bound
  // flags failure, never a dropped or underreported count.
  const room = (n) => {
    state.produced += n;
    if (state.retained + state.produced > MAX_BYTES) markOverflow();
  };
  // Retain a REQUIRED projection COMPLETE: the full serialized copy is
  // stored and charged; when the shared pool cannot hold it the
  // overflow flag plus a charged error record mark the failure — never
  // a silent drop, truncation substitute or second ledger.
  const retainEntry = (kind, value, atMonoNs) => {
    let copy;
    try {
      copy = copyDeep(value);
    } catch {
      copy = { unmeasurable: true };
    }
    const entry = { kind, atMonoNs: String(atMonoNs), value: copy };
    const bytes = sizeOf(entry);
    if (state.retained + state.produced + bytes > MAX_BYTES) {
      markOverflow();
      recordError("retention", `cannot retain ${kind}`);
      return false;
    }
    state.trace.push(entry);
    charge(bytes);
    return true;
  };
  // A scope belongs to the genuine created monitor whose runId it equals
  // or namespaces under; the LONGEST matching runId wins.
  const selectMonitor = (scopeRunId) => {
    let best = null;
    for (const m of state.order) {
      if (typeof scopeRunId === "string" && (scopeRunId === m.runId || scopeRunId.startsWith(`${m.runId}:`)) && (best === null || m.runId.length > best.runId.length)) {
        best = m;
      }
    }
    return best;
  };
  // Scope assignment comes ONLY from a real own-roots plus its matching
  // roots-accepted acknowledgement: a spawned child's pid is matched to
  // the acked identity — never a caller PID claim.
  const assignScope = (root) => {
    if (!isObj(root) || !isObj(root.identity)) return;
    for (const c of state.children) {
      if (c.kind !== "collector" && c.scopeRunId === null && c.facts.pid === root.identity.pid) {
        c.scopeRunId = root.scopeRunId;
      }
    }
  };

  const inputs = Object.freeze({ runId, recordRoot, pythonExecutable, helperPath, fixtureEntry, evidenceRoot, lifetime, observeChild });
  const constants = Object.freeze({ FIXTURE_MS, FIXTURE_BOUND_MS, ADMIT_MS, MAX_BYTES, MAX_LIST, DIRECT_MODES, MODES, ARGV_FLAGS, COMMON, INBOUND_EXTRA });
  const observe = Object.freeze({ fail, isObj, nodeImagePath, recordError, room, retainEntry, selectMonitor, assignScope });

  // Compose the two private leaves over the SAME borrowed owner and
  // state: IO first with the lazy admission getter it calls only from
  // admitted runtime handlers, then admission over the real IO. The
  // frozen public surface exists only after both are fully bound.
  let admission = null;
  const io = createNativeFixtureIO({ inputs, state, bounds, clock, constants, observe, getAdmission: () => admission });
  const { deferred, guardedText, guardedError, waitUntil, spawnImpl, forkImpl } = io;
  admission = createNativeFixtureAdmission({ inputs, state, bounds, clock, constants, observe, io });
  const { createMonitor, entry, launch } = admission;

  // Joins ONLY the actual direct workload/query receipts of the exact
  // scope under the original min bound — the protected live collector
  // is never joined here; the cleanup callback owns collector-last and
  // joining it inside the callback would be a self-wait. A supplied
  // malformed bound rejects; omitted borrows the group end only.
  const settleHandles = (scopeRunId, { deadlineMonoMs } = {}) => {
    if (!strNE(scopeRunId)) return Promise.reject(fail("settle scope"));
    if (deadlineMonoMs !== undefined && !Number.isSafeInteger(deadlineMonoMs)) return Promise.reject(fail("settle bound"));
    const bound = Math.min(
      deadlineMonoMs === undefined ? bounds.deadlineMonoMs : deadlineMonoMs,
      bounds.deadlineMonoMs,
    );
    const debts = [];
    for (const c of state.children) {
      if (c.kind !== "collector" && c.scopeRunId === scopeRunId) debts.push(c.receipt.promise, ...c.sendReceipts);
    }
    return waitUntil(() => Promise.all(debts), bound, "settleHandles").then(() => undefined);
  };

  // ONE-SHOT test-private EOF: matches the real ready collector tuple/
  // invocation/lifecycle, requires all prior normal collectors at actual
  // exit 0 plus BOTH closes, this lifecycle collector-only and healthy
  // under a fresh real sample, no pending debt, no accepted shutdown,
  // no previous EOF. The one-shot flag is consumed SYNCHRONOUSLY before
  // the first asynchronous sample — a concurrent or retried call can
  // never issue a second end. After the await, the ORIGINAL conditions
  // are re-proven (unspent bound, same live collector handle and tuple,
  // healthy, no accepted shutdown, no new workload debt) before the
  // real stdin.end; the same prearmed receipt carries the callback's
  // actual outcome — a public deadline is never its settlement. exit 2
  // plus BOTH closes stays a separate physical fact; no fault frame,
  // closeTransport, kill or stop comes first.
  const endCollectorInputForEof = ({ runId: target } = {}) => {
    const refuse = (d) => Promise.reject(fail(`eof ${d}`));
    const mrec = typeof target === "string" ? state.monitors.get(target) : undefined;
    if (mrec === undefined) return refuse("runId");
    if (state.overflow || mrec.eofConsumed || mrec.shutdownSeen || mrec.pendingRoots.size !== 0) return refuse("lifecycle");
    const coll = mrec.collectorRec;
    if (mrec.readyIdentity === null || coll === null || coll.child === null || coll.settled || coll.facts.stdinEnded) return refuse("collector");
    for (const m of state.order) {
      if (m !== mrec && m.collectorRec !== null && (!m.collectorRec.settled || m.collectorRec.facts.exit.code !== 0)) return refuse("prior collector");
    }
    for (const c of state.children) {
      if (c.kind !== "collector" && (!c.settled || c.monitorRunId === target)) return refuse("debt");
    }
    mrec.eofConsumed = true;
    const bound = bounds.deadlineMonoMs;
    return (async () => {
      await waitUntil(() => mrec.monitor.sample({ deadlineMonoMs: bound }), bound, "eof sample");
      if (nowMonoMs() >= bound) throw fail("eof bound");
      if (mrec.shutdownSeen || mrec.pendingRoots.size !== 0) throw fail("eof lifecycle");
      if (mrec.collectorRec !== coll || coll.child === null || coll.settled || coll.facts.stdinEnded) throw fail("eof collector");
      if (mrec.monitor.fault() !== null) throw fail("eof fault");
      for (const c of state.children) {
        if (c.kind !== "collector" && (!c.settled || c.monitorRunId === target)) throw fail("eof debt");
      }
      const receipt = deferred();
      lifetime.retainActual(receipt.promise);
      const issuedAtMonoMs = nowMonoMs();
      const out = deferred();
      try {
        coll.child.stdin.end((err) => {
          const atMonoMs = nowMonoMs();
          receipt.resolve({
            atMonoMs,
            present: err !== null && err !== undefined,
            text: err === null || err === undefined ? null : guardedText(err),
          });
          if (err === null || err === undefined) {
            out.resolve(Object.freeze({
              runId: target, collectorIdentity: copyDeep(mrec.readyIdentity),
              issuedAtMonoMs, stdinEndCallbackAtMonoMs: atMonoMs,
              deadlineMonoMs: bound,
            }));
          } else {
            recordError("eof callback", err);
            out.reject(err);
          }
        });
      } catch (e) {
        recordError("eof end", e);
        receipt.reject(e);
        out.reject(e);
      }
      return waitUntil(() => out.promise, bound, "eof end");
    })();
  };

  // Once-cached finally: the deferred promise is armed and cached BEFORE
  // any cleanup callback can reenter — the caller's actual bound cleanup
  // runs ONCE (it may reject), then the SAME actual physical/issued debt
  // — collector included — is joined under the SAME original min bound,
  // cleanup and physical errors preserved together, never a self-wait.
  // Named own listeners release only after ACTUAL settlement plus the
  // completed flow; unresolved debt stays strong/held, never faked reap.
  const finish = ({ runCleanup, deadlineMonoMs } = {}) => {
    if (state.finishP !== null) return state.finishP;
    if (deadlineMonoMs !== undefined && !Number.isSafeInteger(deadlineMonoMs)) return Promise.reject(fail("finish bound"));
    const bound = Math.min(
      deadlineMonoMs === undefined ? bounds.deadlineMonoMs : deadlineMonoMs,
      bounds.deadlineMonoMs,
    );
    const done = deferred();
    state.finishP = done.promise;
    state.finishP.then(
      () => {},
      () => {},
    );
    (async () => {
      const errors = [];
      if (typeof runCleanup === "function") {
        try {
          await runCleanup();
        } catch (e) {
          errors.push(e);
        }
      }
      let joined = false;
      try {
        await waitUntil(
          () =>
            Promise.all([
              lifetime.whenSettled(),
              ...state.children.map((c) => c.receipt.promise),
              ...state.children.flatMap((c) => c.sendReceipts),
            ]),
          bound,
          "finish",
        );
        joined = true;
      } catch (e) {
        errors.push(e);
      }
      if (joined) {
        for (const c of state.children) {
          for (const [ee, ev, fn] of c.listeners.splice(0)) {
            try {
              ee.off(ev, fn);
            } catch {}
          }
        }
      }
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, "native-harness finish");
    })().then(
      () => done.resolve(),
      (e) => done.reject(e),
    );
    return state.finishP;
  };

  // Copied bounded diagnostic only — every fact already a guarded copy,
  // never a pass verdict, CleanupProof, native proof or live handle.
  const snapshot = () =>
    copyDeep({
      runId,
      bounds,
      bytes: { produced: state.produced, retained: state.retained, overflow: state.overflow },
      errors: state.errors,
      trace: state.trace,
      handles: state.children.map((c) => ({
        kind: c.kind, monitorRunId: c.monitorRunId, scopeRunId: c.scopeRunId,
        fixtureId: c.fixtureId, queryId: c.queryId, mode: c.mode,
        F: c.F, D: c.D, pid: c.facts.pid, facts: c.facts, settled: c.settled,
        fd3: c.fd3, port: c.port ?? null, admission: c.admission ?? null,
        descendant: c.descendant ?? null,
      })),
      fixtures: [...state.fixtures.values()],
      monitors: state.order.map((m) => ({
        runId: m.runId, readyIdentity: m.readyIdentity, shutdownSeen: m.shutdownSeen,
        eofConsumed: m.eofConsumed, gates: [...m.gates.values()],
      })),
    });

  return Object.freeze({
    runId, bounds, clock, createMonitor, spawnImpl, forkImpl, entry,
    launch, settleHandles, snapshot, finish, endCollectorInputForEof,
  });
}
