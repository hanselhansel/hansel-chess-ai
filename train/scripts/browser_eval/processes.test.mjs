// processes.test.mjs: the monitor facade with the REAL validator and
// a fake clock — startup/roots/sample partition, proved registration,
// authorized signals, scoped listener wiring through the real lsof
// gate, backend identity against real fixed paths, and collector-last
// stop/reap. Every process, pipe and interval is fixture-faked. The
// actual-lifetime cases moved whole to process-lifecycle.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { realpathSync } from "node:fs";

import {
  bsdRow,
  fakeChild,
  identity,
} from "./supervision-test-fixtures.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import {
  createMonitorFixture as setup,
  monitorBootstrapScript as bootScript,
  startMonitorFixture as start,
} from "./process-monitor-test-fixtures.mjs";

const CPID = 31337;

test("start proves bootstrap, registers roots and samples once", async () => {
  const env = setup({ script: bootScript() });
  const { fixture, monitor, cleanup } = env;
  try {
    await start(env);
    const frames = fixture.written;
    assert.equal(frames[0].type, "sample"); // bootstrap inspect first
    assert.deepEqual(frames[0].inspectPids, [process.pid, CPID]);
    assert.equal(frames[1].type, "own-roots");
    assert.equal(frames[1].roots.length, 2);
    const obs = monitor.lastObservation();
    assert.equal(obs.accountingValid, true);
    assert.equal(obs.sampled, 2);
    await monitor.stopAndReap();
    assert.equal(fixture.written.at(-1).type, "shutdown");
  } finally {
    cleanup();
  }
});

test("registerRoot inspects the exact tuple before owning it; signal binds", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { fixture, monitor, cleanup } = env;
  try {
    await start(env);
    script.inspected[4242] = {
      pid: 4242,
      state: "live",
      process: bsdRow(4242, process.pid, 4242, 501),
      executable: "/bin/echo",
    };
    script.outcome = "sent";
    const before = fixture.written.length;
    const reg = await monitor.registerRoot({
      pid: 4242,
      kind: "driver",
      expectedExecutable: "/bin/echo",
      scopeRunId: "R1",
    });
    assert.equal(reg.identity.pid, 4242);
    const frames = fixture.written.slice(before);
    const inspect = frames.find((f) => f.type === "sample");
    const own = frames.find((f) => f.type === "own-roots");
    assert.ok(inspect.seq < own.seq); // the fresh proof precedes the registration
    assert.deepEqual(inspect.inspectPids, [4242]);
    const out = await monitor.signalOwned({
      identity: reg.identity,
      signal: "TERM",
      scopeRunId: "R1",
    });
    assert.equal(out, "sent");
    const sig = fixture.written.find((f) => f.type === "signal");
    assert.equal(sig.signal, "TERM");
    assert.deepEqual(sig.identity, reg.identity);
    await monitor.stopAndReap();
  } finally {
    cleanup();
  }
});

test("probeIdentity answers through a fresh native probe", async () => {
  const script = bootScript();
  const env = setup({ script });
  const { fixture, monitor, cleanup } = env;
  try {
    await start(env);
    script.probes = { "9000:1000:0": "gone" };
    assert.equal(await monitor.probeIdentity(identity(9000)), "gone");
    await monitor.stopAndReap();
  } finally {
    cleanup();
  }
});

test("backendIdentity binds the real helpers, image and digests", async () => {
  const env = setup({ script: bootScript() });
  const { monitor, cleanup } = env;
  try {
    await start(env);
    const b = await monitor.backendIdentity();
    assert.equal(b.backendId, "darwin-arm64-libproc-v1");
    assert.equal(b.helpers.length, 3);
    assert.equal(b.libproc.abi.bsdInfoSize, 136);
    assert.ok(b.helpers.every((h) => /^[0-9a-f]{64}$/.test(h.sha256)));
    await monitor.stopAndReap();
  } finally {
    cleanup();
  }
});

test("queryListeners projects only owned loopback holders of the scope", async () => {
  const wrapper = (n) => {
    // Each gate gets a DISTINCT wrapper tuple: re-registering an
    // already-transitioned pid would defeat the real transition proof.
    const w = fakeChild({ pid: 7000 + n });
    // The authorized exec frame on fd-3 is the wrapper's only input:
    // end() emits the lsof rows then the real exit plus pipe closes.
    w.fd3.end = (chunk, cb) => {
      w.fd3.writes.push(Buffer.from(String(chunk)));
      queueMicrotask(() => {
        w.emitOut("p4242\0f13\0n127.0.0.1:9222\0");
        w.exit(0);
        w.stdout.emitClose();
        w.stderr.emitClose();
      });
      if (typeof cb === "function") cb();
      return w.fd3;
    };
    return w;
  };
  const script = bootScript();
  const env = setup({ script, wrapper });
  const { fixture, monitor, cleanup } = env;
  try {
    const drv = identity(4242);
    script.inspected[4242] = {
      pid: 4242,
      state: "live",
      process: bsdRow(4242, process.pid, 4242, 501),
      executable: "/bin/echo",
    };
    // The owned-pids gate and the per-port gate each spawn a wrapper:
    // each first fresh inspect proves the pinned Python image, then the
    // transition inspect must see the pinned lsof image. onSend swaps a
    // helper root's row after its registration request is written.
    const { python: PYIMG, lsof: LSOFIMG } = env.images;
    for (const wp of [7000, 7001]) {
      script.inspected[wp] = {
        pid: wp,
        state: "live",
        process: bsdRow(wp, process.pid, wp, 501),
        executable: PYIMG,
      };
    }
    script.onSend = (msg) => {
      if (msg.type !== "own-roots") return;
      for (const r of msg.roots) {
        if (r.kind !== "helper") continue;
        const wp = r.identity.pid;
        script.inspected[wp] = {
          pid: wp,
          state: "live",
          process: bsdRow(wp, process.pid, wp, 501),
          executable: LSOFIMG,
        };
      }
    };
    await start(env);
    await monitor.registerRoot({
      pid: 4242,
      kind: "driver",
      expectedExecutable: "/bin/echo",
      scopeRunId: "R1:L1",
    });
    monitor.registerPort({
      address: "127.0.0.1",
      port: 9222,
      ownerIdentity: drv,
      scopeRunId: "R1:L1",
    });
    const res = await monitor.queryListeners("R1:L1");
    assert.deepEqual(res.listeners, [
      { address: "127.0.0.1", port: 9222, pid: 4242 },
    ]);
    assert.deepEqual(res.unexpected, []);
    // The helper went through the real exec gate: exactly one seq-0
    // frame bound to its query and identity.
    const gate = JSON.parse(env.wrappers[0].fd3.writes[0].toString().trim());
    assert.equal(gate.seq, 0);
    assert.equal(gate.type, "exec");
    assert.deepEqual(gate.query, { kind: "owned-pids", pids: [4242] });
    assert.deepEqual(gate.identity, identity(7000));
    await monitor.stopAndReap();
  } finally {
    cleanup();
  }
});

// The helper-only readiness wait (corrective 79): a pending helper
// inspected as the pinned LAUNCHER waits through bounded same-handle
// native reads until the deterministic payload image appears; every
// other path keeps the single original read. The scripted rows use the
// real resolved launcher/payload strings — never a child-reported path.
const LAUNCHER = realpathSync(PYTHON_EXECUTABLE);
const helperRow = (pid, executable, over = {}) => ({
  pid,
  state: "live",
  process: { ...bsdRow(pid, process.pid, pid, 501), ...over },
  executable,
});
const helperReads = (env, pid) =>
  env.fixture.written.filter(
    (f) => f.type === "sample" && f.inspectPids?.includes(pid),
  );
const registerHelper = (env, pid, expectedExecutable, options) =>
  env.monitor.registerRoot(
    { pid, kind: "helper", expectedExecutable, scopeRunId: "R1" },
    options,
  );
// Unconditional teardown for the readiness cases: stopAndReap issues,
// the controlled FAKE collector exit plus BOTH pipe closes release
// unconditionally BEFORE the join, the real stop outcome propagates,
// and the temp record root is removed only after the join — even when
// an assertion already failed. TEST-only, never an OS kill or probe.
const disposeHelperFixture = async (env) => {
  const stop = env.monitor.stopAndReap();
  env.fixture.child.exit(0);
  env.fixture.child.stdout.emitClose();
  env.fixture.child.stderr.emitClose();
  try {
    await stop;
  } finally {
    env.cleanup();
  }
};

test("a helper inspected as launcher waits and only the payload registers", async () => {
  const WP = 7000;
  const script = bootScript();
  const env = setup({ script });
  try {
    const { python: PYIMG } = env.images;
    script.inspected[WP] = helperRow(WP, LAUNCHER);
    script.onSend = (msg) => {
      if (msg.type === "sample" && msg.inspectPids?.includes(WP)) {
        script.inspected[WP] = helperRow(WP, PYIMG);
      }
    };
    await start(env);
    const reg = await registerHelper(env, WP, PYIMG);
    assert.equal(reg.identity.pid, WP);
    // Exactly the first read plus the readiness re-read: no third call.
    assert.equal(helperReads(env, WP).length, 2);
    await env.monitor.stopAndReap();
  } finally {
    await disposeHelperFixture(env);
  }
});

test("helper readiness rejects a changed tuple/UID/PPID or a third image", async () => {
  const WP = 7000;
  const cases = [
    { name: "tuple", row: (e) => helperRow(WP, e, { identity: { ...identity(WP), startSec: "1001" } }) },
    { name: "uid", row: (e) => helperRow(WP, e, { uid: 999 }) },
    { name: "ppid", row: (e) => helperRow(WP, e, { ppid: 1 }) },
    { name: "image", row: () => helperRow(WP, "/third/image") },
  ];
  for (const c of cases) {
    const script = bootScript();
    const env = setup({ script });
    try {
      const { python: PYIMG } = env.images;
      script.inspected[WP] = helperRow(WP, LAUNCHER);
      script.onSend = (msg) => {
        if (msg.type === "sample" && msg.inspectPids?.includes(WP)) {
          script.inspected[WP] = c.row(PYIMG);
        }
      };
      await start(env);
      await assert.rejects(
        registerHelper(env, WP, PYIMG),
        (e) => e.code === "ACCOUNTING_UNAVAILABLE",
        c.name,
      );
      await env.monitor.stopAndReap();
    } finally {
      await disposeHelperFixture(env);
    }
  }
});

test("a first-row wrong UID/PPID keeps the old strict rejection, no wait", async () => {
  const WP = 7000;
  for (const over of [{ uid: 999 }, { ppid: 1 }]) {
    const script = bootScript();
    const env = setup({ script });
    try {
      const { python: PYIMG } = env.images;
      script.inspected[WP] = helperRow(WP, LAUNCHER, over);
      await start(env);
      await assert.rejects(
        registerHelper(env, WP, PYIMG),
        (e) => e.code === "ACCOUNTING_UNAVAILABLE",
      );
      // The unqualified row returns immediately: one read, no wait.
      assert.equal(helperReads(env, WP).length, 1);
      await env.monitor.stopAndReap();
    } finally {
      await disposeHelperFixture(env);
    }
  }
});

test("an expiring bound performs zero additional native reads", async () => {
  const WP = 7000;
  const script = bootScript();
  const env = setup({ script });
  try {
    const { python: PYIMG } = env.images;
    script.inspected[WP] = helperRow(WP, LAUNCHER);
    script.onSend = (msg) => {
      if (msg.type === "sample" && msg.inspectPids?.includes(WP)) {
        env.clock.advance(50);
      }
    };
    await start(env);
    await assert.rejects(
      registerHelper(env, WP, PYIMG, {
        deadlineMonoMs: env.clock.nowMs() + 30,
      }),
      (e) => e.code === "ACCOUNTING_UNAVAILABLE",
    );
    assert.equal(helperReads(env, WP).length, 1);
    await env.monitor.stopAndReap();
  } finally {
    await disposeHelperFixture(env);
  }
});

test("a helper already at the payload and a non-helper use one read", async () => {
  const WP = 7000;
  const script = bootScript();
  const env = setup({ script });
  try {
    const { python: PYIMG } = env.images;
    script.inspected[WP] = helperRow(WP, PYIMG);
    await start(env);
    const reg = await registerHelper(env, WP, PYIMG);
    assert.equal(reg.identity.pid, WP);
    assert.equal(helperReads(env, WP).length, 1);
    script.inspected[4242] = {
      pid: 4242,
      state: "live",
      process: bsdRow(4242, process.pid, 4242, 501),
      executable: "/bin/echo",
    };
    const reg2 = await env.monitor.registerRoot({
      pid: 4242,
      kind: "driver",
      expectedExecutable: "/bin/echo",
      scopeRunId: "R1",
    });
    assert.equal(reg2.identity.pid, 4242);
    assert.equal(helperReads(env, 4242).length, 1);
    await env.monitor.stopAndReap();
  } finally {
    await disposeHelperFixture(env);
  }
});

// The actual-lifetime group — spent start, active-work narrowing under
// a shorter stop, startup failure retaining returned-child debt,
// already-exited one-open-pipe stop, withheld-tick teardown ordering
// and sticky overage usability — moved whole to
// process-lifecycle.test.mjs.
