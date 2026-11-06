// driver-bridge-lifecycle.test.mjs — pure-fake lifecycle owner of
// the driver-bridge suite (C4b-04): the WHOLE final THREE of the
// original thirteen cases moved from driver-bridge.test.mjs with
// every original name/assertion/purpose preserved — finish exact
// fields + close join/unwind, close-after-stop held-body ordering,
// and the real callback-error/unknown-sync-throw fault pair — plus
// the C4b-07 first-pull admission-fence regression (four bridge
// cases total), and the C4b-11e real-FS fixture-teardown ordering
// regression appended at capacity. Fake
// child process.send/message transport and fake interval clock
// only (heartbeat control — the actual default lifetime keepalive
// is a real lazy hold, never a fake timer); every emitted d2s
// frame and every well-formed injected s2d reply passes through
// the REAL createProtocolValidator oracle over a real
// createWatchdogLifetime; the bounded createHold spy appears only
// in the deliberately unknown-submission fault case, whose pending
// actual is never awaited. The appended case uses fakeVite and a
// genuine AbortSignal over REAL confined temp inputs — no real
// server listen or network. Every controlled fact is released
// unconditionally by the shared fixture's real TestContext
// teardown before genuine joins. TEST file — excluded from the
// functional-runtime union.

import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import { canonicalBytes } from "./canonical-json.mjs";
import { identity } from "./test-fixtures.mjs";
import { startFixtureServer } from "./server.mjs";
import {
  flush,
  deferred,
  makeEnv,
  driveStart,
} from "./driver-bridge-test-fixtures.mjs";
import {
  fakeVite,
  makeServerCaps as makeCaps,
  makeServerDeps as makeDeps,
  makeServerTree as makeTree,
  ownResourceStart,
} from "./connected-resource-test-fixtures.mjs";
import {
  disposeFixture,
  registerFixtureTeardown,
} from "./watchdog-teardown-test-fixtures.mjs";

test("finish sends the exact six fields; close joins real callbacks then unwinds", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const reg = env.b.capabilities.register({
    kind: "browser",
    rootPid: 5,
    expectedExecutable: "/b",
    listener: null,
  });
  const rsent = env.sends.find((s) => s.msg.type === "register");
  env.s2d("registered", { requestId: rsent.msg.requestId, identity: identity(5), listener: null });
  rsent.cb(null);
  await reg;
  const fin = env.b.finish({
    requestedStatus: "failed",
    requestedExitCode: 1,
    stopReason: "watchdog",
    checks: [{ id: "c1", status: "passed", evidencePaths: [] }],
    summary: { note: "x" },
    analysisEligible: false,
  });
  const fsent = env.sends.find((s) => s.msg.type === "finish");
  assert.deepEqual(
    Object.keys(fsent.msg).sort(),
    [
      "ipcVersion",
      "runId",
      "seq",
      "type",
      "requestedStatus",
      "requestedExitCode",
      "stopReason",
      "checks",
      "summary",
      "analysisEligible",
    ].sort(),
  );
  fsent.cb(null);
  env.s2d("stop", { stopReason: "FINISH", cleanupRemainingMs: 5000 });
  await fin;
  const cl = env.b.close({ gracefulCloseAttempted: true });
  const csent = env.sends.find((s) => s.msg.type === "closed");
  assert.equal(csent.msg.gracefulCloseAttempted, true);
  assert.deepEqual(csent.msg.expectedShutdowns, [{ kind: "browser", id: rsent.msg.requestId }]);
  let closed = false;
  cl.then(
    () => {
      closed = true;
    },
    () => {
      closed = true;
    },
  );
  await flush();
  assert.equal(closed, false);
  csent.cb(null);
  await cl;
  assert.equal(env.msgFns.size, 0);
  assert.equal(env.intervals[0].cleared, true);
});

test("close after stop waits held bodies and the closed callback before unsubscribing", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const pull = deferred(env);
  const entered = deferred(env);
  const art = env.b.capabilities.artifact(
    "held.bin",
    "append",
    (async function* () {
      yield new Uint8Array([9]);
      yield new Uint8Array([8]);
      entered.resolve();
      await pull.promise;
      yield new Uint8Array([7]);
    })(),
  );
  await flush();
  const sent0 = env.sends.find((s) => s.msg.type === "artifact");
  env.s2d("recorded", { recordId: sent0.msg.recordId, recordSeq: sent0.msg.recordSeq, ref: null });
  sent0.cb(null);
  // The actual entry proves the lookahead body genuinely reached the
  // held gate BEFORE the stop is injected — the stop can never
  // preempt the second lookahead pull.
  await entered.promise;
  env.s2d("stop", { stopReason: "halt", cleanupRemainingMs: 5000 });
  await assert.rejects(art);
  const cl = env.b.close({ gracefulCloseAttempted: false });
  const csent = env.sends.find((s) => s.msg.type === "closed");
  assert.equal(csent.msg.gracefulCloseAttempted, false);
  let done = false;
  cl.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );
  await flush();
  assert.equal(done, false);
  // Close waits on the held BODY independently of the real closed
  // callback: deliver it, and the passive join still keeps close
  // pending while only the body remains held.
  csent.cb(null);
  await flush();
  assert.equal(done, false);
  assert.equal(env.sends.filter((s) => s.msg.type === "artifact").length, 1);
  pull.resolve();
  await cl;
  assert.equal(env.msgFns.size, 0);
});

test("a real callback error after a public ACK faults; an unknown sync throw holds actual pending", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const ev = env.b.capabilities.event("operation", { n: 1 });
  await flush();
  const sent = env.sends.find((s) => s.msg.type === "event");
  env.s2d("recorded", { recordId: sent.msg.recordId, recordSeq: sent.msg.recordSeq, ref: null });
  sent.cb(new Error("flush failed"));
  await assert.rejects(ev, /flush failed/);
  await assert.rejects(env.b.capabilities.event("operation", { n: 2 }));
  let active = 0;
  const thrown = { boom: true };
  const envB = makeEnv(t, {
    createHold: () => {
      active += 1;
      return () => {
        active -= 1;
      };
    },
    sendImpl: (frame, cb) => {
      if (frame.type === "register") throw thrown;
      envB.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
      envB.sends.push({ msg: frame, cb });
      return true;
    },
  });
  await driveStart(envB);
  const reg = envB.b.capabilities.register({
    kind: "fixture",
    rootPid: null,
    expectedExecutable: null,
    listener: null,
  });
  await reg.then(
    () => assert.fail("expected rejection"),
    (e) => assert.strictEqual(e, thrown),
  );
  assert.equal(active, 1);
});

test("stop during the first iterator pull admits no second pull or artifact frame", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const first = deferred(env);
  const entered = deferred(env);
  let pulls = 0;
  const chunks = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      pulls += 1;
      entered.resolve();
      return first.promise;
    },
  };
  const art = env.b.capabilities.artifact("held.bin", "append", chunks);
  // The actual entry proves the first retained pull is genuinely
  // pending BEFORE the stop is injected.
  await entered.promise;
  env.s2d("stop", { stopReason: "halt", cleanupRemainingMs: 5000 });
  await assert.rejects(art);
  const cl = env.b.close({ gracefulCloseAttempted: false });
  const csent = env.sends.find((s) => s.msg.type === "closed");
  csent.cb(null);
  // Releasing the held first pull only after close is underway: the
  // admission fence retires the body without a second next(), a late
  // chunk, or a fabricated final frame — without it the same
  // iterator's now-fulfilled second next() would make pulls === 2.
  first.resolve({ done: false, value: new Uint8Array([1]) });
  await cl;
  await env.owner.whenSettled();
  assert.equal(pulls, 1);
  assert.equal(env.sends.filter((s) => s.msg.type === "artifact").length, 0);
});

test("fixture teardown releases gates, joins the real start body and closes the SDK before root removal", async (t) => {
  // fakeVite + a genuine AbortSignal only; the tree and model are REAL
  // confined temp files. The held model read proves the owner ordering:
  // release -> actual start-body completion -> fake-SDK close -> root
  // removal, all through the ONE shared teardown owner.
  const tree = await makeTree(t);
  const vite = fakeVite();
  const modelReal = await fsp.realpath(tree.modelRef.path);
  let readEntered = 0;
  let readDone = 0;
  let releaseRead = () => {};
  const readGate = new Promise((resolve) => {
    releaseRead = resolve;
  });
  const deps = makeDeps(vite, {
    readFile: async (p) => {
      if (p === modelReal) {
        readEntered += 1;
        await readGate;
        readDone += 1;
      }
      return fsp.readFile(p);
    },
  });
  // The IDENTICAL original start promise is never awaited by the test
  // body — the owner's settle stage joins the real held body.
  ownResourceStart(
    t,
    () => startFixtureServer({ ...tree, arm: "candidate", capabilities: makeCaps() }, deps),
    { release: () => releaseRead() },
  );
  // The actual read entry is observed BEFORE teardown runs — the start
  // body is genuinely held inside its real model readFile.
  while (readEntered === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  // A captured early-failure marker stands in for the real test error
  // this teardown would follow — the owner stages never swallow it.
  const earlyError = new Error("simulated early test failure");
  let captured;
  try {
    throw earlyError;
  } catch (error) {
    captured = error;
  }
  // The afterSettle probe runs after the actual start body and SDK
  // close, but BEFORE the root removal — it must see the read done and
  // the root still present.
  let observed = null;
  registerFixtureTeardown(t, {
    afterSettle: async () => {
      observed = {
        readDone,
        sdkClosed: vite.calls.server.closed ?? 0,
        rootPresent: await fsp.stat(tree.root).then(() => true, () => false),
      };
    },
  });
  await disposeFixture(t);
  assert.strictEqual(captured, earlyError);
  assert.deepEqual(observed, { readDone: 1, sdkClosed: 1, rootPresent: true });
  // The owner's remove stage ran after the probe — the root is gone.
  await assert.rejects(fsp.stat(tree.root), { code: "ENOENT" });
});

for (const mode of ["missing", "invalid", "fault", "early"]) {
  test(`finish cannot treat ${mode} STOP as the normal supervisor handshake`, async (t) => {
    const env = makeEnv(t);
    await driveStart(env);
    const fields = { requestedStatus: "failed", requestedExitCode: 1, stopReason: null,
      checks: [], summary: {}, analysisEligible: false };
    if (mode === "early") {
      env.s2d("stop", { stopReason: "FINISH", cleanupRemainingMs: 5000 });
      await assert.rejects(env.b.finish(fields), /finish order/);
      assert.equal(env.sends.some((item) => item.msg.type === "finish"), false);
      return;
    }
    const pending = env.b.finish(fields);
    env.sends.find((item) => item.msg.type === "finish").cb(null);
    let finished = false;
    pending.then(() => { finished = true; }, () => { finished = true; });
    await flush();
    assert.equal(finished, false, "raw callback alone cannot release normal close");
    assert.equal(env.sends.some((item) => item.msg.type === "closed"), false);
    if (mode === "missing") {
      env.drop();
      await assert.rejects(pending, /transport closed/);
    } else if (mode === "invalid") {
      env.emit({ ipcVersion: 1, runId: env.b.capabilities.runId, seq: 1, type: "stop",
        stopReason: false, cleanupRemainingMs: 5000 });
      await assert.rejects(pending, /stopReason/);
    } else {
      env.s2d("stop", { stopReason: "CONTROLLED_FAULT", cleanupRemainingMs: 5000 });
      await assert.rejects(pending, /stop CONTROLLED_FAULT/);
    }
    await env.owner.whenSettled();
  });
}
