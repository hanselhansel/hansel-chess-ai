// native-fixture-admission.mjs — TEST-only admission/Native-binding
// leaf of the Native harness group. Sole export
// createNativeFixtureAdmission({inputs,state,bounds,clock,constants,
// observe,io}) -> frozen eight {checkFixtureArgv,createMonitor,
// onPrivateFrame,validateInbound,entry,launch,guardedText,
// guardedError}. It composes the REAL
// production monitor and run-global protocol validator under the ONE
// borrowed state, bounds, real clock, inputs and observe helpers —
// never a fake Native, second authority, registry, queue, counter or
// horizon — and imports the real production leaves plus Node builtins
// only. Factory construction invokes no borrowed callback, timer, IO
// or process; every monitor/lifecycle/IPC effect runs later through
// the admitted methods.

import path from "node:path";
import process from "node:process";

import { createProcessMonitor } from "./processes.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { copyDeep, strNE } from "./protocol-values.mjs";

export function createNativeFixtureAdmission({ inputs, state, bounds, clock, constants, observe, io }) {
  const { runId, pythonExecutable, helperPath, fixtureEntry, evidenceRoot, lifetime } = inputs;
  const { FIXTURE_MS, FIXTURE_BOUND_MS, ADMIT_MS, DIRECT_MODES, MODES, ARGV_FLAGS, COMMON, INBOUND_EXTRA } = constants;
  const { fail, isObj, nodeImagePath, recordError, retainEntry, selectMonitor, assignScope } = observe;
  const { forkImpl, waitPrivate, sendPrivate, waitUntil } = io;
  const { nowMonoMs, nowMonoNs } = clock;

  // Error values live behind an explicit presence flag with a bounded
  // guarded string so a null/undefined first fault is never lost.
  const guardedText = (v) => {
    try {
      return String(v !== null && v !== undefined && v.message !== undefined ? v.message : v).slice(0, 4096);
    } catch {
      return "<unprintable>";
    }
  };
  const guardedError = (v) => ({ present: true, text: guardedText(v) });

  // The strict frozen fixture argv: flag/value pairs only, each flag at
  // most once, nothing positional; mode/role/bounds/per-mode flags and
  // the fork options match the real entry parser and the WD channel.
  const checkFixtureArgv = (modulePath, args, opts) => {
    if (modulePath !== fixtureEntry || !Array.isArray(args) || args.length % 2 !== 0) throw fail("fork entry");
    const raw = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!ARGV_FLAGS.has(args[i]) || raw[args[i]] !== undefined) throw fail(`fork flag ${args[i]}`);
      if (typeof args[i + 1] !== "string" || args[i + 1].length === 0) throw fail(`fork value ${args[i]}`);
      raw[args[i]] = args[i + 1];
    }
    const req = (f) => {
      if (raw[f] === undefined) throw fail(`fork ${f}`);
      return raw[f];
    };
    const mode = req("--mode");
    if (!MODES.has(mode) || req("--role") !== "root") throw fail("fork binding");
    const scopeRunId = req("--scope-run-id");
    // The argv run-id binds the fixture to the SELECTED actual monitor
    // lifecycle — the longest-match genuine created monitor — never
    // the outer group id.
    const mrec = selectMonitor(scopeRunId);
    if (mrec === null || req("--run-id") !== mrec.runId) throw fail("fork run-id");
    const F = Number(req("--fixture-start"));
    const D = Number(req("--fixture-end"));
    if (!Number.isSafeInteger(F) || !Number.isSafeInteger(D) || D !== F + FIXTURE_MS) throw fail("fork bounds");
    const now = nowMonoMs();
    if (F > now || now >= D) throw fail("fork lifetime");
    if (F + FIXTURE_BOUND_MS > bounds.workEndMonoMs || F + 3000 > bounds.workEndMonoMs) throw fail("fork group bound");
    const manifest = raw["--manifest-path"];
    const nodeImage = raw["--node-image"];
    if (mode === "blocked-heartbeat" ? manifest !== path.join(evidenceRoot, "check", "manifest.json") : manifest !== undefined) throw fail("fork manifest");
    const forksChild = mode === "reparent" || mode === "blocked-heartbeat";
    if (forksChild && nodeImage !== nodeImagePath()) throw fail("fork node-image");
    if (!forksChild && nodeImage !== undefined && (mode === "listener" || mode === "finalizer" || nodeImage !== nodeImagePath())) throw fail("fork node-image");
    if (
      !isObj(opts) || opts.shell !== undefined ||
      !Array.isArray(opts.stdio) || opts.stdio.length !== 4 ||
      opts.stdio[0] !== "ignore" || opts.stdio[1] !== "pipe" ||
      opts.stdio[2] !== "pipe" || opts.stdio[3] !== "ipc" ||
      !Array.isArray(opts.execArgv) || opts.execArgv.length !== 0 ||
      opts.execPath !== nodeImagePath() || opts.detached !== true ||
      (opts.cwd !== undefined && opts.cwd !== path.dirname(fixtureEntry))
    ) {
      throw fail("fork options");
    }
    return { mode, scopeRunId, F, D, fixtureId: req("--fixture-id"), monitorRunId: mrec.runId };
  };

  // Transparent validator facade: every real method is invoked FIRST
  // and its exact return/throw preserved; only successful accepts get
  // bounded observational copies with supervisor-side receive times —
  // raw rounds, never claimed private commit timestamps. Observation
  // never throws INTO the real validator: a retention failure is
  // recorded and the real result still returned.
  const obs = (fn) => {
    try {
      fn();
    } catch (e) {
      recordError("protocol observe", e);
    }
  };
  const wrapProtocol = (mrec, real) =>
    Object.freeze({
      accept(channel, direction, message, encodedByteLength) {
        let out;
        try {
          out = real.accept(channel, direction, message, encodedByteLength);
        } catch (e) {
          recordError("protocol accept", e);
          throw e;
        }
        obs(() => observeAccept(mrec, channel, direction, message));
        return out;
      },
      authorizeSignal(input) {
        const out = real.authorizeSignal(input);
        obs(() => retainEntry("authorize-signal", { requestId: input.requestId, identity: input.identity, signal: input.signal }, nowMonoNs()));
        return out;
      },
      authorizeExecGate(input) {
        const out = real.authorizeExecGate(input);
        obs(() => {
          let g = mrec.gates.get(input.queryId);
          if (g === undefined) {
            g = { queryId: input.queryId, authorized: false, execAccepted: false, identity: null, query: null };
            mrec.gates.set(input.queryId, g);
          }
          g.authorized = true;
          g.identity = copyDeep(input.identity);
          g.query = copyDeep(input.query);
          retainEntry("authorize-exec", { queryId: input.queryId, identity: input.identity }, nowMonoNs());
        });
        return out;
      },
      authorizeTeardownCollector(input) {
        const out = real.authorizeTeardownCollector(input);
        obs(() => retainEntry("authorize-teardown", {}, nowMonoNs()));
        return out;
      },
    });
  const observeAccept = (mrec, channel, direction, msg) => {
    const at = nowMonoNs();
    if (channel === "exec-gate") {
      const g = mrec.gates.get(msg.requestId);
      if (g !== undefined) g.execAccepted = true;
      retainEntry("exec-gate", { requestId: msg.requestId, seq: msg.seq }, at);
      return;
    }
    if (channel !== "collector" && channel !== "teardown-collector") {
      retainEntry(`${channel}:${direction}`, { type: msg.type, requestId: msg.requestId ?? null, seq: msg.seq }, at);
      return;
    }
    const t = msg.type;
    if (direction === "c2s" && t === "ready" && msg.stage === "startup") {
      mrec.readyIdentity = copyDeep(msg.collector);
      retainEntry("ready", { collector: msg.collector }, at);
    } else if (direction === "s2c" && t === "own-roots") {
      mrec.pendingRoots.set(msg.requestId, copyDeep(msg.roots));
      retainEntry("own-roots", { requestId: msg.requestId, roots: msg.roots }, at);
    } else if (direction === "c2s" && t === "ready" && msg.stage === "roots-accepted") {
      const roots = mrec.pendingRoots.get(msg.requestId);
      if (roots !== undefined) {
        mrec.pendingRoots.delete(msg.requestId);
        for (const r of roots) {
          assignScope(r);
        }
      }
      retainEntry("roots-accepted", { requestId: msg.requestId }, at);
    } else if (direction === "s2c" && t === "sample") {
      retainEntry("sample-request", { requestId: msg.requestId, seq: msg.seq, owned: msg.owned, inspectPids: msg.inspectPids, probes: msg.probes }, at);
    } else if (direction === "c2s" && t === "process-samples") {
      retainEntry("process-samples", { requestId: msg.requestId, seq: msg.seq, startedAtMonoNs: msg.startedAtMonoNs, finishedAtMonoNs: msg.finishedAtMonoNs, samples: msg.samples, gone: msg.gone, discovered: msg.discovered, inspected: msg.inspected, probes: msg.probes }, at);
    } else if (direction === "s2c" && t === "signal") {
      retainEntry("signal-request", { requestId: msg.requestId, identity: msg.identity, signal: msg.signal }, at);
    } else if (direction === "c2s" && t === "signal-result") {
      retainEntry("signal-result", { requestId: msg.requestId, outcome: msg.outcome }, at);
    } else if (direction === "s2c" && t === "shutdown") {
      mrec.shutdownSeen = true;
      retainEntry("shutdown", { requestId: msg.requestId }, at);
    } else if (direction === "c2s" && t === "accounting-fault") {
      retainEntry("accounting-fault", { requestId: msg.requestId, code: msg.code, reason: msg.reason, diagnostic: msg.diagnostic }, at);
    } else {
      retainEntry(`${channel}:${direction}`, { type: t, requestId: msg.requestId ?? null, seq: msg.seq }, at);
    }
  };
  const createMonitor = ({ runId: monitorRunId, horizon = null, evaluationPolicy = null, phase = null } = {}) => {
    if (
      !strNE(monitorRunId) ||
      !(monitorRunId === runId || monitorRunId.startsWith(`${runId}:`)) ||
      state.monitors.has(monitorRunId) ||
      state.overflow
    ) {
      throw fail("monitor options");
    }
    if (horizon !== null && (!isObj(horizon) || !Object.isFrozen(horizon) || typeof horizon.read !== "function" || typeof horizon.subscribe !== "function")) throw fail("monitor horizon");
    // Serial only: every earlier collector must show actual exit 0 plus
    // BOTH closes and all direct workload/query debt settled — a failed
    // or still-live run is never rescued by a new lifecycle.
    for (const m of state.order) {
      const c = m.collectorRec;
      if (c !== null && (!c.settled || c.facts.exit === null || c.facts.exit.code !== 0)) throw fail("monitor serial");
    }
    for (const c of state.children) {
      if (c.kind !== "collector" && !c.settled) throw fail("monitor serial debt");
    }
    const mrec = {
      runId: monitorRunId, monitor: null, protocol: null, collectorRec: null,
      readyIdentity: null, shutdownSeen: false, eofConsumed: false, gates: new Map(), pendingRoots: new Map(),
    };
    const real = createProtocolValidator({ runId: monitorRunId });
    const wrapped = wrapProtocol(mrec, real);
    const options = { runId: monitorRunId, pythonExecutable, helperPath, protocol: wrapped, clock, spawnImpl: io.spawnImpl, recordRoot: inputs.recordRoot, lifetime, evaluationPolicy, phase };
    if (horizon === null) options.getDeadlineMonoMs = () => bounds.deadlineMonoMs;
    else options.horizon = horizon;
    mrec.protocol = real;
    mrec.monitor = createProcessMonitor(options);
    state.monitors.set(monitorRunId, mrec);
    state.order.push(mrec);
    return { protocol: wrapped, monitor: mrec.monitor };
  };

  // ONE bounded closed matcher for the fixed inbound private variants:
  // closed key sets and the argv-bound selected-monitor runId plus
  // fixtureId/scopeRunId/pid — malformed, extra-field, wrong-identity
  // or duplicate-phase frames are recorded failures rejecting the
  // pending waiter, never a fake pass. A latched fault rejects BEFORE
  // any later frame is consumed — no valid-looking frame revives it.
  const onPrivateFrame = (rec, msg) => {
    const ipc = rec.ipc;
    const failAll = (e) => {
      const error = fail("private frame");
      ipc.fault = e;
      for (const w of ipc.waiters.splice(0)) {
        w.reject(error);
      }
    };
    if (ipc.fault !== null) return;
    const extra = isObj(msg) ? INBOUND_EXTRA[msg.type] : undefined;
    const valid =
      extra !== undefined &&
      Object.keys(msg).length === COMMON.length + extra.length &&
      [...COMMON, ...extra].every((k) => Object.prototype.hasOwnProperty.call(msg, k)) &&
      msg.testVersion === 1 &&
      msg.runId === rec.monitorRunId &&
      msg.fixtureId === rec.fixtureId &&
      msg.scopeRunId === rec.scopeRunId &&
      msg.pid === rec.facts.pid;
    if (!valid || ipc.seen.has(msg.type)) {
      failAll(recordError("private frame", `${valid ? "duplicate" : "invalid"} ${isObj(msg) ? msg.type : "non-object"}`));
      return;
    }
    ipc.seen.add(msg.type);
    retainEntry("private-in", msg, nowMonoNs());
    const i = ipc.waiters.findIndex((w) => w.type === msg.type);
    if (i >= 0) {
      const w = ipc.waiters.splice(i, 1)[0];
      w.resolve(msg);
    } else {
      ipc.queue.push(msg);
    }
  };
  const PHASE_AFTER = { waiting: null, admitted: "waiting", listening: "admitted", "descendant-waiting": "admitted", "descendant-admitted": "descendant-waiting" };
  const validateInbound = (rec, m, type) => {
    if (rec.phase !== PHASE_AFTER[type]) throw fail(`private ${type} order`);
    const isBounds = m.fixtureStartMonoMs === rec.F && m.fixtureEndMonoMs === rec.D;
    if (type === "waiting" || type === "admitted") {
      if (m.mode !== rec.mode || m.role !== "root" || !isBounds) throw fail(`private ${type} binding`);
      if (type === "waiting" && m.parentPid !== process.pid) throw fail("private waiting parent");
    } else if (type === "listening") {
      if (rec.mode !== "listener" || m.address !== "127.0.0.1" || !Number.isInteger(m.port) || m.port <= 0) throw fail("private listening");
    } else if (type === "descendant-waiting") {
      const d = m.descendant;
      const keys = isObj(d) ? Object.keys(d) : [];
      if (
        keys.length !== 8 ||
        !Number.isInteger(d.pid) || d.parentPid !== rec.facts.pid ||
        d.fixtureId !== `${rec.fixtureId}:descendant` || d.scopeRunId !== rec.scopeRunId ||
        d.mode !== "term-ignore" || d.role !== "descendant" ||
        d.fixtureStartMonoMs !== rec.F || d.fixtureEndMonoMs !== rec.D
      ) {
        throw fail("private descendant-waiting");
      }
      rec.descPid = d.pid;
    } else {
      if (!isBounds || m.descendantPid !== rec.descPid || m.descendantFixtureId !== `${rec.fixtureId}:descendant`) throw fail("private descendant-admitted");
    }
    rec.phase = type;
    return m;
  };

  // Fixed Node entry shape: real resolved Node image, F captured BEFORE
  // the real fork, D = F+9500 inside the original F+10000 which must fit
  // the group WORK end; mode-specific flags match the real parser.
  const entry = ({ mode, scopeRunId } = {}) => {
    if (!MODES.has(mode) || !strNE(scopeRunId) || state.overflow) throw fail("entry options");
    const mrec = selectMonitor(scopeRunId);
    if (mrec === null) throw fail("entry scope");
    const F = nowMonoMs();
    if (F + FIXTURE_BOUND_MS > bounds.workEndMonoMs || F + 3000 > bounds.workEndMonoMs) throw fail("entry group bound");
    const D = F + FIXTURE_MS;
    const fixtureId = `${runId}:fixture:${(state.fixtureSeq += 1)}`;
    const argv = [
      "--mode", mode, "--run-id", mrec.runId, "--fixture-id", fixtureId,
      "--scope-run-id", scopeRunId, "--fixture-start", String(F),
      "--fixture-end", String(D), "--role", "root",
    ];
    if (mode === "blocked-heartbeat") argv.push("--manifest-path", path.join(evidenceRoot, "check", "manifest.json"));
    if (mode === "reparent" || mode === "blocked-heartbeat") argv.push("--node-image", nodeImagePath());
    state.fixtures.set(fixtureId, { fixtureId, mode, scopeRunId, monitorRunId: mrec.runId, F, D, P: F + FIXTURE_BOUND_MS });
    return { executable: nodeImagePath(), args: [fixtureEntry, ...argv], expectedExecutable: nodeImagePath() };
  };

  // Reparent flow: the forwarded descendant claim is untrusted data
  // until REAL native registration plus a covering sample prove the
  // same F/D tuple; only then admit, retain its identity, and ask the
  // parent exit — the root's real exit stays distinct from the
  // inherited pipe closes the descendant still holds.
  const reparentFlow = async (rec, monitor, spec, bound) => {
    const dw = await waitPrivate(rec, "descendant-waiting", bound);
    const desc = dw.descendant;
    const regInput = { pid: desc.pid, kind: "fixture", expectedExecutable: spec.expectedExecutable, scopeRunId: rec.scopeRunId };
    const reg = await waitUntil(() => monitor.registerRoot(regInput, { deadlineMonoMs: bound }), bound, "descendant register");
    await waitUntil(() => monitor.sample({ deadlineMonoMs: bound }), bound, "descendant sample");
    const admitDesc = { descendantPid: desc.pid, descendantFixtureId: desc.fixtureId, fixtureStartMonoMs: rec.F, fixtureEndMonoMs: rec.D };
    await waitUntil(() => sendPrivate(rec, "admit-descendant", admitDesc), bound, "admit-descendant send");
    await waitPrivate(rec, "descendant-admitted", bound);
    rec.descendant = { fixtureId: desc.fixtureId, pid: desc.pid, identity: copyDeep(reg.identity), F: rec.F, D: rec.D };
    await waitUntil(() => sendPrivate(rec, "exit-parent", { descendantPid: desc.pid, descendantFixtureId: desc.fixtureId }), bound, "exit-parent send");
  };
  // Direct-mode launch: fork, real waiting, actual monitor.registerRoot
  // ack BEFORE the private admit, real admitted, listener's real port
  // registered, the first covering sample by F+2000 — every wait on the
  // original absolute bound, never now+grace.
  const launch = async ({ monitor, mode, scopeRunId } = {}) => {
    if (!DIRECT_MODES.has(mode) || !strNE(scopeRunId) || state.overflow) throw fail("launch options");
    const mrec = selectMonitor(scopeRunId);
    if (mrec === null || mrec.monitor !== monitor) throw fail("launch monitor");
    const spec = entry({ mode, scopeRunId });
    const child = forkImpl(spec.args[0], spec.args.slice(1), {
      execPath: spec.executable, execArgv: [],
      stdio: ["ignore", "pipe", "pipe", "ipc"], detached: true,
    });
    const rec = state.children.find((c) => c.child === child);
    const bound = rec.F + ADMIT_MS;
    try {
      await waitPrivate(rec, "waiting", bound);
      const regInput = { pid: rec.facts.pid, kind: "fixture", expectedExecutable: spec.expectedExecutable, scopeRunId };
      const reg = await waitUntil(() => monitor.registerRoot(regInput, { deadlineMonoMs: bound }), bound, "launch register");
      const admit = { mode, role: "root", fixtureStartMonoMs: rec.F, fixtureEndMonoMs: rec.D };
      await waitUntil(() => sendPrivate(rec, "admit", admit), bound, "admit send");
      await waitPrivate(rec, "admitted", bound);
      if (mode === "listener") {
        const lm = await waitPrivate(rec, "listening", bound);
        monitor.registerPort({ address: "127.0.0.1", port: lm.port, ownerIdentity: reg.identity, scopeRunId });
        rec.port = lm.port;
      }
      await waitUntil(() => monitor.sample({ deadlineMonoMs: bound }), bound, "launch sample");
      rec.admission = { atMonoMs: nowMonoMs(), identity: copyDeep(reg.identity), port: rec.port ?? null };
      if (mode === "reparent") await reparentFlow(rec, monitor, spec, bound);
      return Object.freeze({
        child, identity: copyDeep(reg.identity), scopeRunId,
        deadlineMonoMs: rec.F + FIXTURE_BOUND_MS,
        whenPhysicallySettled: rec.receipt.promise,
      });
    } catch (e) {
      recordError("launch", e);
      throw e;
    }
  };

  return Object.freeze({
    checkFixtureArgv, createMonitor, onPrivateFrame, validateInbound, entry, launch,
    guardedText, guardedError,
  });
}
