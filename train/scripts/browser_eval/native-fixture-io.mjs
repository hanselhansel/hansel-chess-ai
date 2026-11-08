// native-fixture-io.mjs — TEST-only physical-IO leaf of the Native
// harness group. Sole export
// createNativeFixtureIO({inputs,state,bounds,clock,constants,observe,
// getAdmission}) -> frozen eight {spawnImpl,forkImpl,waitPrivate,
// sendPrivate,deferred,guardedText,guardedError,waitUntil}. It borrows
// the parent's ONE shared state, bounds, real clock, constants and
// observe helpers by reference — never a second owner, registry,
// queue, counter or clock — and imports Node builtins only.
// Trusted sync observeChild runs only after adoption; failures are diagnostics.
// getAdmission() is invoked ONLY inside admitted runtime methods and
// handlers and always returns the ONE already-composed admission leaf;
// factory construction performs no IO, timer, process, spawn, fork,
// borrowed callout or clock read.
//
// Every lifecycle/physical/issued-callback observation is a real
// neutral receipt preregistered on the SAME lifetime.retainActual
// BEFORE its effect; a public bounded wait never retires debt and a
// rejected or unproven receipt stays held. A returned child gets its
// error/exit/BOTH-pipe-close listeners BEFORE any pid/mode/semantic
// read: a missing pipe or unobserved exit stays unproven — no
// destroyed/ended/closed shortcut, raw kill, negative-PID/group
// signal, child.kill/destroy or production-observer removal. Only an
// original Node spawn/fork synchronous pre-handle throw proves
// no-child. Named own listeners release only after truthful physical
// settlement plus a completed flow.
//
// spawnImpl delegates UNCHANGED to real spawn for exactly the
// selected-Python collector and exec-gated lsof argv; forkImpl
// delegates UNCHANGED to real fork for the fixed fixture entry with
// its strict frozen argv, execArgv [] and resolved-Node execPath —
// no eval, source or shell anywhere. Scope is assigned to a spawned
// child ONLY from a real own-roots plus its matching roots-accepted
// frame on the run-global validator; a reparented descendant gets no
// invented handle. Observed child bytes count separately while every
// retained trace/projection copy shares the ONE 4 MiB group bound;
// overflow is a retained failure, never an unbounded capture or a
// throw into the real validator. snapshot() is a copied bounded
// diagnostic — never a pass, CleanupProof, native verdict or handle.

import { spawn, fork } from "node:child_process";

export function createNativeFixtureIO({ inputs, state, bounds, clock, constants, observe, getAdmission }) {
  const { pythonExecutable, helperPath, lifetime } = inputs;
  const { DIRECT_MODES, FIXTURE_BOUND_MS } = constants;
  const { fail, isObj, recordError, room, retainEntry } = observe;
  const { nowMonoMs, nowMonoNs } = clock;

  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  const guardedText = (v) => getAdmission().guardedText(v);
  const guardedError = (v) => getAdmission().guardedError(v);

  // Public bounded wait on a THUNKED operation: a malformed or already
  // spent bound rejects BEFORE the effectful call is ever evaluated, so
  // every guarded Native invocation happens only on a live original
  // bound. After fulfillment the actual clock is rechecked — a success
  // landing at or past the bound is still a deadline rejection, never
  // a retire of the underlying debt.
  const waitUntil = (thunk, bound, tag) =>
    new Promise((resolve, reject) => {
      if (!Number.isSafeInteger(bound) || nowMonoMs() >= bound) {
        reject(fail(`${tag} deadline`));
        return;
      }
      let p;
      try {
        p = thunk();
      } catch (e) {
        reject(e);
        return;
      }
      const timer = clock.setTimeout(() => reject(fail(`${tag} deadline`)), Math.max(0, bound - nowMonoMs()));
      Promise.resolve(p).then(
        (v) => {
          clock.clearTimeout(timer);
          if (nowMonoMs() >= bound) reject(fail(`${tag} deadline`));
          else resolve(v);
        },
        (e) => {
          clock.clearTimeout(timer);
          reject(e);
        },
      );
    });

  // ONE coherent physical record shared by spawnImpl and forkImpl:
  // facts stay separate from settlement — only a real exit plus BOTH
  // real pipe closes fulfills the retained receipt.
  const newFacts = () => ({
    pid: null, syncError: null, error: null, exit: null, outClosed: false, errClosed: false,
    outError: null, errError: null, outBytes: 0, errBytes: 0, missingPipe: false, gateEarly: false, stdinEnded: false,
  });
  const checkPhys = (rec) => {
    const f = rec.facts;
    if (!rec.settled && f.exit !== null && f.outClosed && f.errClosed) {
      rec.settled = true;
      rec.receipt.resolve();
    }
  };
  const on = (rec, ee, ev, fn, required) => {
    if (ee !== null && ee !== undefined && typeof ee.on === "function") {
      ee.on(ev, fn);
      rec.listeners.push([ee, ev, fn]);
    } else if (required === true) {
      rec.facts.missingPipe = true;
    }
  };
  const pipeBytes = (rec, which) => (d) => {
    const n = d !== null && d !== undefined && typeof d.length === "number" ? d.length : Buffer.byteLength(String(d));
    // The produced counter stays truthful and monotonic — it keeps
    // counting real bytes even after the shared bound flags overflow.
    room(n);
    rec.facts[`${which}Bytes`] += n;
    // Gate output before the accepted exec frame is a real failure.
    if (rec.kind === "lsof" && !rec.facts.gateEarly && !(rec.gate !== null && rec.gate.execAccepted)) {
      rec.facts.gateEarly = true;
      recordError("lsof gate", "output before authorized exec");
    }
  };
  const attachChild = (rec, child) => {
    rec.child = child;
    // Every lifecycle/pipe listener lands BEFORE the first pid read so
    // no error, exit or close event can slip past unobserved.
    on(rec, child, "error", (e) => {
      if (rec.facts.error === null) rec.facts.error = guardedError(e);
      recordError(`${rec.kind} child`, e);
    });
    on(rec, child, "exit", (code, signal) => {
      rec.facts.exit = { code, signal, atMonoMs: nowMonoMs() };
      checkPhys(rec);
    });
    for (const [name, which] of [["stdout", "out"], ["stderr", "err"]]) {
      const s = child[name];
      const markClosed = () => {
        rec.facts[`${which}Closed`] = true;
        checkPhys(rec);
      };
      on(rec, s, "data", pipeBytes(rec, which), true);
      on(rec, s, "close", markClosed, true);
      on(rec, s, "error", (e) => {
        if (rec.facts[`${which}Error`] === null) rec.facts[`${which}Error`] = guardedError(e);
      });
    }
    if (rec.kind === "collector") {
      // Real stdin finish/error observation feeds the EOF one-shot
      // guard; production transport keeps every write authority.
      on(rec, child.stdin, "finish", () => {
        rec.facts.stdinEnded = true;
      });
      on(rec, child.stdin, "error", (e) => {
        if (rec.facts.errError === null) rec.facts.errError = guardedError(e);
      });
    }
    if (rec.ipc !== null) {
      on(rec, child, "message", (m) => getAdmission().onPrivateFrame(rec, m));
    }
    rec.facts.pid = typeof child.pid === "number" ? child.pid : null;
  };
  // Transparent fd-3 observation for the lsof child: same this/args/
  // return through ORIGINAL write/end, real callback outcomes kept,
  // originals restored only at actual physical settlement.
  const armFd3 = (rec) => {
    const fd3 = rec.child !== null && rec.child.stdio ? rec.child.stdio[3] : null;
    if (fd3 === null || typeof fd3.end !== "function") {
      rec.facts.missingPipe = true;
      return;
    }
    const facts = { writes: 0, ends: 0, writeBytes: 0, lastOutcome: null };
    const restores = [];
    for (const name of ["write", "end"]) {
      const orig = fd3[name];
      if (typeof orig !== "function") continue;
      restores.push(() => {
        fd3[name] = orig;
      });
      fd3[name] = function (...a) {
        if (name === "write") {
          facts.writes += 1;
        } else {
          facts.ends += 1;
        }
        if (a[0] !== null && a[0] !== undefined && typeof a[0].length === "number") facts.writeBytes += a[0].length;
        const last = a[a.length - 1];
        if (typeof last === "function") {
          a[a.length - 1] = (...cb) => {
            const e = cb.length > 0 ? cb[0] : null;
            facts.lastOutcome = { atMonoMs: nowMonoMs(), present: e !== null && e !== undefined, text: e === null || e === undefined ? null : guardedText(e) };
            return last(...cb);
          };
        }
        return orig.apply(this, a);
      };
    }
    rec.fd3 = facts;
    rec.receipt.promise.then(() => {
      for (const r of restores) {
        r();
      }
    });
  };
  const observed = (child, rec) => {
    try {
      inputs.observeChild?.(child, Object.freeze({ kind: rec.kind, monitorRunId: rec.monitorRunId,
        queryId: rec.queryId, physicalSettlement: rec.receipt.promise, retainDiagnostic: retainEntry }));
    } catch (error) {
      try { recordError("child observer", error); } catch { state.overflow = true; }
    }
    return child;
  };
  const adopt = (partial) => {
    const receipt = deferred();
    lifetime.retainActual(receipt.promise);
    const rec = {
      child: null, fixtureId: null, mode: null, scopeRunId: null, monitorRunId: null, queryId: null,
      F: null, D: null, receipt, settled: false, facts: newFacts(), listeners: [],
      gate: null, fd3: null, ipc: null, sendReceipts: [], phase: null, ...partial,
    };
    state.children.push(rec);
    return rec;
  };

  // Strict spawn allowlist: exactly the collector argv or the exec-gated
  // wrapper argv against the selected Python, fixed stdio, no shell.
  const classifySpawn = (exe, args, opts) => {
    const badShell = !isObj(opts) || opts.shell !== undefined;
    if (exe !== pythonExecutable || !Array.isArray(args) || badShell) throw fail("spawn allowlist");
    const st = opts.stdio;
    const head = args[0] === "-I" && args[1] === "-B" && args[2] === helperPath;
    if (!head) throw fail("spawn argv");
    if (
      args.length === 8 && args[3] === "--collector" && args[4] === "--run-id" &&
      args[6] === "--supervisor-pid" && args[7] === String(process.pid) &&
      Array.isArray(st) && st.length === 3 && st.every((s) => s === "pipe")
    ) {
      return { kind: "collector", monitorRunId: args[5], queryId: null };
    }
    if (
      args.length === 12 && args[3] === "--exec-gated" && args[4] === "--run-id" &&
      args[6] === "--query-id" && args[8] === "--gate-fd" && args[9] === "3" &&
      args[10] === "--query-json" &&
      Array.isArray(st) && st.length === 4 && st[0] === "ignore" && st.slice(1).every((s) => s === "pipe")
    ) {
      let query = null;
      try {
        query = JSON.parse(args[11]);
      } catch {
        throw fail("spawn query-json");
      }
      return { kind: "lsof", monitorRunId: args[5], queryId: args[7], query };
    }
    throw fail("spawn argv");
  };
  const spawnImpl = (exe, args, opts) => {
    const cls = classifySpawn(exe, args, opts);
    const mrec = state.monitors.get(cls.monitorRunId);
    if (mrec === undefined) throw fail("spawn runId");
    const rec = adopt({ kind: cls.kind, monitorRunId: cls.monitorRunId, queryId: cls.queryId });
    if (cls.kind === "lsof") {
      let gate = mrec.gates.get(cls.queryId);
      if (gate === undefined) {
        gate = { queryId: cls.queryId, authorized: false, execAccepted: false, identity: null, query: cls.query };
        mrec.gates.set(cls.queryId, gate);
      }
      rec.gate = gate;
    }
    if (cls.kind === "collector" && mrec.collectorRec === null) {
      mrec.collectorRec = rec;
    }
    let child;
    try {
      child = spawn(exe, args, opts);
    } catch (e) {
      // Original synchronous pre-handle throw: definite no-child.
      rec.facts.syncError = guardedError(e);
      recordError("spawn", e);
      rec.receipt.resolve();
      throw e;
    }
    attachChild(rec, child);
    if (cls.kind === "lsof") armFd3(rec);
    return observed(child, rec);
  };

  // forkImpl delegates UNCHANGED to real fork after the admission
  // leaf's strict frozen argv/options validation — the physical
  // receipt is armed before delegation and every private-waiter
  // channel is prearmed for direct modes only (the WD owns driver-wire
  // frames on blocked-heartbeat children).
  const forkImpl = (modulePath, args, opts) => {
    const conf = getAdmission().checkFixtureArgv(modulePath, args, opts);
    const rec = adopt({
      kind: "fixture", monitorRunId: conf.monitorRunId, scopeRunId: conf.scopeRunId,
      fixtureId: conf.fixtureId, mode: conf.mode, F: conf.F, D: conf.D,
      ipc: DIRECT_MODES.has(conf.mode) ? { queue: [], waiters: [], seen: new Set(), fault: null } : null,
    });
    if (!state.fixtures.has(conf.fixtureId)) {
      state.fixtures.set(conf.fixtureId, {
        fixtureId: conf.fixtureId, mode: conf.mode, scopeRunId: conf.scopeRunId, monitorRunId: conf.monitorRunId,
        F: conf.F, D: conf.D, P: conf.F + FIXTURE_BOUND_MS,
      });
    }
    let child;
    try {
      child = fork(modulePath, args, opts);
    } catch (e) {
      rec.facts.syncError = guardedError(e);
      recordError("fork", e);
      rec.receipt.resolve();
      throw e;
    }
    attachChild(rec, child);
    return observed(child, rec);
  };

  // Bounded private wait on a closed inbound type: a latched malformed
  // channel rejects BEFORE any queued frame is consumed — a later
  // valid-looking frame can never revive the channel.
  const waitPrivate = (rec, type, bound) => {
    const ipc = rec.ipc;
    if (ipc === null || ipc === undefined || ipc.fault !== null) {
      return Promise.reject(fail(`private ${type}`));
    }
    const consume = (m) => {
      try {
        return getAdmission().validateInbound(rec, m, type);
      } catch (e) {
        ipc.fault = recordError(`private ${type}`, e);
        throw e;
      }
    };
    const i = ipc.queue.findIndex((m) => m.type === type);
    if (i >= 0) {
      return waitUntil(() => consume(ipc.queue.splice(i, 1)[0]), bound, `private ${type}`);
    }
    return waitUntil(
      () =>
        new Promise((resolve, reject) => {
          ipc.waiters.push({
            type,
            resolve: (m) => {
              try {
                resolve(consume(m));
              } catch (e) {
                reject(e);
              }
            },
            reject,
          });
        }),
      bound,
      `private ${type}`,
    );
  };
  // ONE private send: a single submission even when send() returns
  // false; the neutral real-callback receipt is armed and retained
  // BEFORE the call and settles only on the actual callback. The
  // returned handled promise carries the ORIGINAL callback value —
  // success resolves, any error rejects with the same raw value, and
  // an ambiguous synchronous throw keeps the rejected receipt held by
  // the genuine lifetime rather than faking fulfilment. No replay, no
  // arity probe, and the FIRST raw failure is never erased late.
  const sendPrivate = (rec, type, extra) => {
    const d = deferred();
    lifetime.retainActual(d.promise);
    rec.sendReceipts.push(d.promise);
    const msg = { testVersion: 1, runId: rec.monitorRunId, fixtureId: rec.fixtureId, scopeRunId: rec.scopeRunId, type, pid: rec.facts.pid, ...extra };
    retainEntry("private-out", msg, nowMonoNs());
    return new Promise((resolve, reject) => {
      try {
        rec.child.send(msg, (err) => {
          d.resolve({ atMonoMs: nowMonoMs(), present: err !== null && err !== undefined, text: err === null || err === undefined ? null : guardedText(err) });
          if (err === null || err === undefined) {
            resolve();
          } else {
            recordError(`private ${type} callback`, err);
            reject(err);
          }
        });
      } catch (e) {
        recordError(`private ${type} send`, e);
        d.reject(e);
        reject(e);
      }
    });
  };

  return Object.freeze({
    spawnImpl, forkImpl, waitPrivate, sendPrivate,
    deferred, guardedText, guardedError, waitUntil,
  });
}
