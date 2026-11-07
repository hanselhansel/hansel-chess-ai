// process-lsof-test-fixtures.mjs: TEST-ONLY lsof gate environment
// moved whole from process-lsof.test.mjs under the gate-fixture
// readable split decision (26) — the REAL createProtocolValidator, a
// fake clock/spawn, ordered registration/transition/signal spies over
// createLsofQueries and the captured handle factory. Pure fake
// construction on call only: no process, IO, scheduler, validator or
// permissive-mock authority, no cycles. Excluded from the functional
// runtime union and BackendIdentity.helpers.
import { createLsofQueries, parseLsofResult } from "./process-lsof.mjs";
import { createOwnership } from "./process-ownership.mjs";
import { createProcessProofs } from "./process-proof.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import {
  fakeChild,
  fakeClock,
  identity,
} from "./supervision-test-fixtures.mjs";

export const lsofFixtureOut = (s) => Buffer.from(s, "latin1");

// One scripted gate environment: fake spawn children plus ordered
// register/prove/signal callback spies bound to the REAL validator.
export const createLsofGateFixture = ({ script = {}, spawned = [] } = {}) => {
  const clock = fakeClock();
  const protocol = createProtocolValidator({ runId: "R1" });
  const order = [];
  const children = [];
  const lq = createLsofQueries({
    registerHelper: async (input, handle) => {
      order.push(`register ${input.pid}`);
      // TEST-ONLY: a caller-held promise defers registration so real
      // exit/close facts can land before the issuance decision.
      if (script.deferredRegister) await script.deferredRegister;
      if (script.registerError) throw script.registerError;
      return { identity: identity(input.pid) };
    },
    signalHelper: async (input, handle) => {
      order.push(`signal ${input.signal}`);
      return { outcome: "sent" };
    },
    proveTransition: async (input, handle) => {
      order.push("transition");
      if (script.alwaysPre === true) return "pre-transition";
      const next = (script.transitions ?? ["live-transition"]).shift();
      return next ?? "live-transition";
    },
    protocol,
    runId: "R1",
    pythonExecutable: "/py",
    helperPath: "/h.py",
    clock,
    spawnImpl: (file, args, opts) => {
      order.push("spawn");
      const c = fakeChild({ pid: 5000 + children.length });
      spawned.push({ file, args, opts, child: c });
      children.push(c);
      return c;
    },
    // TEST-ONLY: a scripted resolve callback overrides the path
    // resolver. It runs during path resolution — BEFORE the deferred
    // receipt is registered — so it can only preempt resolution, not
    // the after-receipt pre-spawn guard. The after-receipt expiry is
    // driven from the retainActual registrar callback instead.
    resolvePath: (p) => (script.resolvePath ?? ((x) => x))(p),
  });
  const mk = (ms = 30000) =>
    createBudgetHandle({
      deadlineMonoMs: clock.nowMs() + ms,
      clock,
      nowMonoMs: clock.nowMs,
    });
  return { clock, protocol, order, children, lq, mk };
};

// Drive a wrapper child through its real physical settlement: optional
// fake stdout data, the actual fake exit, then BOTH output closes. It
// is never used to fabricate an exit in the returned failed-spawn
// test — that test drives error/close-only events and stays unproven.
export const finishLsofFixture = (child, stdout = "", code = 0) => {
  if (stdout) child.emitOut(lsofFixtureOut(stdout));
  child.exit(code);
  child.stdout.emitClose();
  child.stderr.emitClose();
};

// One controlled listener-proof environment (corrective 86 TEST-only):
// REAL createOwnership/createProcessProofs/createProtocolValidator/
// createBudgetHandle/fakeClock plus the REAL strict parseLsofResult;
// ONLY the inspect transport (send), the queue (enqueue), the lsof
// result feeds and retainActual are fake spies. No process, Native,
// store, recordproof, IO or global state — construction invokes
// nothing. script fields: roots/rootRows build the genuine root cache
// and uid-501 full-tuple rows; inspected maps pid -> scripted native
// inspection row (absent pid = missing reply); queryResults/portResults
// map pid/port -> REAL parseLsofResult inputs; inspectError injects a
// send failure; onQuery runs inside the owned-pids spy (it may register
// a new root to prove the frozen workload snapshot never expands).
export const createListenerProofFixture = ({ script = {} } = {}) => {
  const clock = fakeClock();
  const calls = [];
  const ownership = createOwnership({ runId: "R1" });
  for (const r of script.roots ?? []) ownership.registerRoot(r);
  ownership.observeDiscovery(script.rootRows ?? []);
  for (const p of script.ports ?? []) ownership.registerPort(p);
  const retainActual = (v) => calls.push({ kind: "retain", value: v });
  const send = async (type, fields, rid, handle) => {
    calls.push({ kind: "inspect", fields, handle });
    if (type !== "sample") throw new Error(`unexpected ${type}`);
    if (script.inspectError) throw script.inspectError;
    return {
      inspected: fields.inspectPids
        .map((pid) => script.inspected?.[pid])
        .filter(Boolean),
    };
  };
  const enqueue = async (fn, handle) => {
    calls.push({ kind: "enqueue", handle });
    return fn();
  };
  let rid = 0;
  const lsof = {
    queryOwnedPids: async (pids, opts) => {
      calls.push({ kind: "owned", pids: [...pids], opts });
      if (script.onQuery) await script.onQuery(ownership);
      const rows = [];
      for (const pid of pids) {
        const r = script.queryResults?.[pid] ??
          { exitCode: 1, stdout: "", stderr: "" };
        rows.push(...parseLsofResult(r).rows);
      }
      return { rows };
    },
    queryPort: async (port, opts) => {
      calls.push({ kind: "port", port, opts });
      const r = (script.onPortQuery ? await script.onPortQuery(port, opts) : undefined) ??
        script.portResults?.[port] ??
        { exitCode: 1, stdout: "", stderr: "" };
      return { rows: parseLsofResult(r).rows };
    },
  };
  const proofs = createProcessProofs({
    runId: "R1",
    pythonExecutable: "/py",
    protocol: createProtocolValidator({ runId: "R1" }),
    ownership,
    send,
    enqueue,
    nextRid: (tag) => `${tag}-${++rid}`,
    requireHealthy: () => {},
    lsofQueries: () => lsof,
    ownUid: () => 501,
    resolvePath: (p) => p,
  });
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 30000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  return Object.freeze({ clock, handle, ownership, proofs, calls, retainActual });
};
