// PURE real proof/listener/monitor owners. No actual Native or raw signal.
import test from "node:test";
import assert from "node:assert/strict";
import { makeTerminalObservation } from "./terminal-test-fixtures.mjs";
import { createProcessProofs } from "./process-proof.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { identity, bsdRow, sampleReply } from "./supervision-test-fixtures.mjs";
import {
  createMonitorFixture,
  monitorBootstrapScript,
  startMonitorFixture,
} from "./process-monitor-test-fixtures.mjs";
import { processMonitorLifetime } from "./processes.mjs";
const turn = () => new Promise((r) => setImmediate(r));
const old = identity(4444),
  next = identity(4444, "2000", 1);
const setup = (f) => {
  const signalProtocol = createProtocolValidator({ runId: "terminal" });
  const calls = [],
    state = { replacement: next, rows: [], sticky: null };
  const proofs = createProcessProofs({
    runId: "terminal",
    pythonExecutable: "/py",
    protocol: { authorizeSignal: (args) => {
      signalProtocol.authorizeSignal(args);
      calls.push({ type: "authorize", ...args });
    } },
    ownership: f.ownership,
    sampleOwnedIdentities: f.observer.sampleOwnedIdentities,
    isTerminalIdentity: f.observer.isTerminalIdentity,
    assertNoTerminalReappearance: (reply) => {
      try {
        f.observer.assertNoTerminalReappearance(reply);
      } catch (e) {
        state.sticky = e;
        throw e;
      }
    },
    nextRid: (kind) => `${kind}-${calls.length}`,
    requireHealthy: () => {
      if (state.sticky) throw state.sticky;
    },
    enqueue: (issue) => issue(),
    ownUid: () => 501,
    resolvePath: (p) => p,
    lsofQueries: () => ({
      queryOwnedPids: async (pids) => {
        calls.push({ type: "owned-pids", pids });
        return { rows: [] };
      },
      queryPort: async (port) => {
        calls.push({ type: "port", port });
        return { rows: state.rows };
      },
    }),
    send: async (type, fields, requestId) => {
      calls.push({ type, ...structuredClone(fields) });
      if (type === "signal") return { outcome: "sent" };
      const reply = sampleReply({ requestId, owned: fields.owned, probes: fields.probes });
      reply.inspected = fields.inspectPids.map((pid) => ({
        pid,
        state: "live",
        executable: "/replacement",
        process: bsdRow(pid, 1, pid, 501, state.replacement.startSec, state.replacement.startUsec),
      }));
      reply.probes = fields.probes.map((i) => ({ identity: i, state: "gone" }));
      return reply;
    },
  });
  return { proofs, calls, state };
};

test("standalone probe gone does not admit; terminal probe/no-action avoids wire authorization", async () => {
  const f = makeTerminalObservation();
  try {
    const { proofs, calls, state } = setup(f);
    assert.equal(await proofs.probeIdentityFresh(old, f.handle), "gone");
    assert.equal(f.observer.isTerminalIdentity(old), false);
    await f.run();
    const before = calls.length;
    assert.equal(await proofs.probeIdentityFresh(old, f.handle), "gone");
    assert.equal(
      await proofs.signalOwnedProved({ identity: old, signal: "TERM", scopeRunId: "terminal" }, f.handle),
      "gone",
    );
    assert.equal(calls.length, before);
    state.sticky = new Error("earlier fault");
    await assert.rejects(
      proofs.signalOwnedProved({ identity: old, signal: "TERM", scopeRunId: "terminal" }, f.handle),
      (e) => e === state.sticky,
    );
    assert.equal(await proofs.probeIdentityFresh(old, f.handle), "unavailable");
    state.sticky = null;
    f.handle.narrow(0);
    assert.equal(await proofs.probeIdentityFresh(old, f.handle), "unavailable");
    assert.equal(calls.length, before);
  } finally {
    f.dispose();
  }
});

test("all gone-owner ports remain queried; holder replacement is freshly inspected and unexpected", async () => {
  const f = makeTerminalObservation();
  try {
    await f.run();
    f.ownership.registerPort({
      address: "127.0.0.1",
      port: 9222,
      ownerIdentity: old,
      scopeRunId: "terminal",
    });
    const { proofs, calls, state } = setup(f);
    const result = await proofs.queryListenersScoped("terminal", f.handle, { retainActual: () => {} });
    assert.deepEqual(result, { listeners: [], unexpected: [] });
    assert.deepEqual(
      calls.map((c) => c.type),
      ["port"],
    );
    state.rows = [{ pid: old.pid, address: "127.0.0.1", port: 9222 }];
    const replaced = await proofs.queryListenersScoped("terminal", f.handle, { retainActual: () => {} });
    assert.equal(replaced.unexpected[0].reason, "holder-mismatch");
    const inspect = calls.find((c) => c.type === "sample");
    assert.deepEqual(inspect.inspectPids, [old.pid]);
    assert.deepEqual(inspect.owned, []);
    state.replacement = old;
    await assert.rejects(
      proofs.queryListenersScoped("terminal", f.handle, { retainActual: () => {} }),
      /terminal identity reappeared/,
    );
    assert.match(state.sticky.message, /terminal identity reappeared/);
  } finally {
    f.dispose();
  }
});

test("new root registration remains numeric-fresh and new-birth signals retain authorization/wire", async () => {
  const f = makeTerminalObservation();
  try {
    await f.run();
    const { proofs, calls } = setup(f);
    await assert.rejects(
      proofs.registerRootProved(
        { pid: old.pid, kind: "browser", expectedExecutable: "/old", scopeRunId: "terminal" },
        f.handle,
      ),
      /root executable/,
    );
    assert.deepEqual(calls[0].inspectPids, [old.pid]);
    f.ownership.registerRoot({
      identity: next,
      kind: "browser",
      expectedExecutable: "/replacement",
      scopeRunId: "terminal",
    });
    assert.equal(
      await proofs.signalOwnedProved({ identity: next, signal: "TERM", scopeRunId: "terminal" }, f.handle),
      "sent",
    );
    assert.deepEqual(
      calls.slice(-2).map((c) => c.type),
      ["authorize", "signal"],
    );
    assert.deepEqual(calls.at(-1).identity, next);
  } finally {
    f.dispose();
  }
});

test("genuine monitor retains physical exit/BOTHpipe debt after terminal admission", async () => {
  const script = monitorBootstrapScript(),
    f = createMonitorFixture({ script });
  const bound = f.clock.nowMs() + 30000;
  const orig = f.fixture.child.stdin.write;
  try {
    await startMonitorFixture(f);
    script.inspected[4444] = {
      pid: 4444,
      state: "live",
      executable: "/bin/x",
      process: bsdRow(4444, process.pid, 4444, 501),
    };
    await f.monitor.registerRoot({
      pid: 4444,
      kind: "browser",
      expectedExecutable: "/bin/x",
      scopeRunId: "R1",
    });
    f.fixture.child.stdin.write = function (bytes, cb) {
      const msg = JSON.parse(String(bytes));
      if (msg.type === "sample" && msg.owned.some((i) => i.pid === 4444)) {
        f.fixture.written.push(msg);
        const reply = sampleReply({ requestId: msg.requestId, owned: msg.owned });
        reply.samples = reply.samples.filter((s) => s.identity.pid !== 4444);
        reply.gone = [old];
        f.fixture.emit(reply);
        return true;
      }
      if (msg.type === "shutdown") {
        f.fixture.written.push(msg);
        f.fixture.child.exit(0);
        f.fixture.child.stdout.emitClose();
        return true;
      }
      return Reflect.apply(orig, this, [bytes, cb]);
    };
    await f.monitor.sample({ deadlineMonoMs: bound });
    const count = f.fixture.written.length;
    assert.equal(await f.monitor.probeIdentity(old, { deadlineMonoMs: bound }), "gone");
    assert.equal(
      await f.monitor.signalOwned(
        { identity: old, signal: "TERM", scopeRunId: "R1" },
        { deadlineMonoMs: bound },
      ),
      "gone",
    );
    assert.equal(f.fixture.written.length, count);
    assert.equal(f.monitor._ownership.isTerminalIdentity, undefined);
    let settled = false;
    processMonitorLifetime(f.monitor)
      .whenSettled()
      .then(() => {
        settled = true;
      });
    const stop = f.monitor.stopAndReap({ deadlineMonoMs: bound });
    await turn();
    assert.equal(settled, false, "stderr is still physically open");
    f.fixture.child.stderr.emitClose();
    assert.equal((await stop).exitCode, 0);
    await processMonitorLifetime(f.monitor).whenSettled();
  } finally {
    f.fixture.exit(0);
    await f.monitor.stopAndReap({ deadlineMonoMs: bound });
    await processMonitorLifetime(f.monitor).whenSettled();
    f.cleanup();
  }
});


test("terminal no-action preserves genuine signal-field rejection without authorization", async () => {
  const f = makeTerminalObservation();
  try {
    await f.run();
    const { proofs, calls } = setup(f);
    const original = createProtocolValidator({ runId: "original-signal-fields" });
    let expected;
    try { original.authorizeSignal({ requestId: "invalid", identity: old, signal: "BOGUS" }); }
    catch (error) { expected = error; }
    assert.equal(expected.code, "IPC_INVALID");
    await assert.rejects(proofs.signalOwnedProved({ identity: old, signal: "BOGUS", scopeRunId: "terminal" }, f.handle),
      (error) => error.code === expected.code && error.message === expected.message);
    assert.deepEqual(calls, []);
  } finally { f.dispose(); }
});

test("legacy malformed ownership rejects through the original proof-options guard", () => {
  for (const ownership of [undefined, null]) {
    assert.throws(() => createProcessProofs({ runId: "terminal", pythonExecutable: "/py",
      protocol: { authorizeSignal() {} }, ownership, send() {}, enqueue() {},
      nextRid() {}, requireHealthy() {}, lsofQueries() {}, ownUid() {} }),
    (error) => error.code === "ACCOUNTING_UNAVAILABLE" && error.message.includes("proof options"));
  }
});
