// driver-bridge.test.mjs — pure-fake unit suite for the integrated
// driver-bridge facade + wire + methods leaves: the FIRST TEN of
// the original thirteen cases (the finish/close lifecycle trio
// lives in driver-bridge-lifecycle.test.mjs under C4b-04). Fake
// child process.send/message transport and fake interval clock
// only — no real kernel/children/filesystem/browser/model/timers.
// Every emitted d2s frame and every well-formed injected s2d reply
// passes through the REAL createProtocolValidator as the
// wire-lifecycle oracle; malformed frames are injected raw exactly
// to prove the bridge faults them itself. The ownership layer is a
// real createWatchdogLifetime; a bounded createHold spy appears
// only in the deliberately unknown-submission fault case, whose
// pending actual is never awaited. Every controlled fact — held
// send callback, work or iterator promise — is released
// unconditionally by the shared fixture's real TestContext
// teardown before genuine joins, and intentionally unresolved debt
// is never awaited under the default real hold. TEST file —
// excluded from the functional-runtime union.

import test from "node:test";
import assert from "node:assert/strict";
import { canonicalBytes } from "./canonical-json.mjs";
import { createDriverCapabilities } from "./driver-bridge.mjs";
import { identity, ref } from "./test-fixtures.mjs";
import {
  RUN,
  SHA,
  MANIFEST,
  MANIFEST_PATH,
  LISTENER,
  flush,
  deferred,
  makeEnv,
  driveStart,
} from "./driver-bridge-test-fixtures.mjs";

test("capabilities expose the exact rosters and a genuine derived signal", (t) => {
  const env = makeEnv(t);
  const { b } = env;
  assert.deepEqual(Object.keys(b).sort(), ["capabilities", "close", "finish", "start"]);
  assert.deepEqual(
    Object.keys(b.capabilities).sort(),
    ["artifact", "event", "manifest", "operation", "register", "runId", "signal"],
  );
  assert.equal(b.capabilities.runId, RUN);
  assert.equal(b.capabilities.manifest.phase, "check");
  assert.equal(Object.isFrozen(b.capabilities.manifest), true);
  assert.equal(Object.isFrozen(b.capabilities), true);
  assert.equal(b.capabilities.signal instanceof AbortSignal, true);
  assert.equal(b.capabilities.signal.aborted, false);
  assert.throws(
    () =>
      createDriverCapabilities({
        runId: RUN,
        manifest: MANIFEST,
        transport: env.transport,
        signal: { aborted: false, addEventListener() {}, removeEventListener() {} },
      }),
    /signal/,
  );
});

test("hello then matching start; a reentrant start reply still resolves", async (t) => {
  let reentrant = false;
  const env = makeEnv(t, {
    sendImpl: (frame, cb) => {
      env.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
      env.sends.push({ msg: frame, cb });
      if (frame.type === "hello") {
        const reply = {
          ipcVersion: 1,
          runId: RUN,
          seq: 0,
          type: "start",
          manifestPath: MANIFEST_PATH,
          commonIdentitySha256: SHA,
        };
        env.pv.accept("driver", "s2d", reply, canonicalBytes(reply).length);
        env.emit(reply);
        reentrant = true;
      }
      return true;
    },
  });
  const p = env.b.start({ manifestPath: MANIFEST_PATH });
  assert.equal(reentrant, true);
  env.sends[0].cb(null);
  await p;
});

test("send(false) is exactly one submitted frame resolved by the real callback", async (t) => {
  let calls = 0;
  const env = makeEnv(t, {
    sendImpl: (frame, cb) => {
      calls += 1;
      env.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
      env.sends.push({ msg: frame, cb });
      return false;
    },
  });
  const p = env.b.start({ manifestPath: MANIFEST_PATH });
  let done = false;
  p.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );
  env.s2d("start", { manifestPath: MANIFEST_PATH, commonIdentitySha256: SHA });
  await flush();
  assert.equal(calls, 1);
  assert.equal(done, false);
  env.sends[0].cb(null);
  await p;
  assert.equal(done, true);
});

test("a reentrant stop during hello arms no heartbeat and rejects start", async (t) => {
  const env = makeEnv(t, {
    sendImpl: (frame, cb) => {
      env.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
      env.sends.push({ msg: frame, cb });
      if (frame.type === "hello") {
        env.emit({
          ipcVersion: 1,
          runId: RUN,
          seq: 0,
          type: "stop",
          stopReason: "abort",
          cleanupRemainingMs: 5000,
        });
      }
      return true;
    },
  });
  await assert.rejects(env.b.start({ manifestPath: MANIFEST_PATH }));
  assert.equal(env.intervals.length, 0);
});

test("register binds the exact ACK, snapshots metadata and returns frozen copies", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const caller = { ...LISTENER };
  const reg = env.b.capabilities.register({
    kind: "browser",
    rootPid: 9001,
    expectedExecutable: "/bin/x",
    listener: caller,
  });
  const sent = env.sends.find((s) => s.msg.type === "register");
  caller.port = 1;
  assert.equal(sent.msg.listener.port, 7777);
  assert.notEqual(sent.msg.listener, caller);
  env.s2d("registered", {
    requestId: sent.msg.requestId,
    identity: identity(9001),
    listener: LISTENER,
  });
  sent.cb(null);
  const ack = await reg;
  assert.equal(ack.identity.pid, 9001);
  assert.equal(Object.isFrozen(ack.identity), true);
  assert.equal(Object.isFrozen(ack.listener), true);
  const bad = makeEnv(t);
  await driveStart(bad);
  const reg2 = bad.b.capabilities.register({
    kind: "fixture",
    rootPid: null,
    expectedExecutable: null,
    listener: null,
  });
  bad.emit({
    ipcVersion: 1,
    runId: RUN,
    seq: 1,
    type: "registered",
    requestId: `${RUN}:driver:request:999`,
    identity: null,
    listener: null,
  });
  await assert.rejects(reg2);
});

test("500 ms heartbeat carries the pending operation; work waits for begun", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  let invoked = 0;
  let workCtx = null;
  const workOut = deferred(env);
  const op = env.b.capabilities.operation("command", "op-1", (ctx) => {
    invoked += 1;
    workCtx = ctx;
    return workOut.promise;
  });
  const begin = env.sends.find((s) => s.msg.type === "begin");
  assert.equal(begin.msg.operationId, "op-1");
  assert.equal(begin.msg.kind, "command");
  assert.equal(env.intervals.length, 1);
  assert.equal(env.intervals[0].ms, 500);
  env.intervals[0].fn();
  const hb = env.sends.find((s) => s.msg.type === "heartbeat");
  assert.equal(hb.msg.operationId, "op-1");
  hb.cb(null);
  assert.equal(invoked, 0);
  begin.cb(null);
  env.s2d("begun", { operationId: "op-1", remainingMs: 60000 });
  await flush();
  assert.equal(invoked, 1);
  assert.equal(workCtx.remainingMs, 60000);
  assert.equal(workCtx.signal instanceof AbortSignal, true);
  workOut.resolve({ status: "completed", evidencePaths: [], detail: { note: "ok" } });
  await flush();
  const end = env.sends.find((s) => s.msg.type === "end");
  assert.deepEqual(end.msg.result, {
    status: "completed",
    evidencePaths: [],
    detail: { note: "ok" },
  });
  end.cb(null);
  assert.deepEqual(await op, { status: "completed", evidencePaths: [], detail: { note: "ok" } });
});

test("independent stop while a work body is held rejects publicly and sends no late end", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const workOut = deferred(env);
  const op = env.b.capabilities.operation("command", "op-1", () => workOut.promise);
  const begin = env.sends.find((s) => s.msg.type === "begin");
  begin.cb(null);
  env.s2d("begun", { operationId: "op-1", remainingMs: 60000 });
  await flush();
  env.s2d("stop", { stopReason: "watchdog", cleanupRemainingMs: 5000 });
  await assert.rejects(op);
  assert.equal(env.sends.every((s) => s.msg.type !== "end"), true);
  workOut.resolve({ status: "completed", evidencePaths: [], detail: {} });
  await flush();
  assert.equal(env.sends.every((s) => s.msg.type !== "end"), true);
  assert.equal(env.b.capabilities.signal.aborted, true);
  await env.owner.whenSettled();
});

test("event snapshots pre-queue, keeps recordSeq and a serialization failure burns no slot", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const payload = { note: 1 };
  const ev = env.b.capabilities.event("operation", payload);
  payload.note = 999;
  await flush();
  const sent = env.sends.find((s) => s.msg.type === "event");
  assert.equal(sent.msg.payload.note, 1);
  assert.equal(sent.msg.recordSeq, 0);
  env.s2d("recorded", { recordId: sent.msg.recordId, recordSeq: 0, ref: null });
  sent.cb(null);
  await ev;
  await assert.rejects(env.b.capabilities.event("operation", { bad: 1n }));
  const good = env.b.capabilities.event("operation", { note: 2 });
  await flush();
  const sent2 = env.sends.filter((s) => s.msg.type === "event").at(-1);
  assert.equal(sent2.msg.recordSeq, 1);
  env.s2d("recorded", { recordId: sent2.msg.recordId, recordSeq: 1, ref: null });
  sent2.cb(null);
  await good;
});

test("multichunk and empty artifacts keep contiguous recordSeq and exact final refs", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  const art = env.b.capabilities.artifact("out/raw.bin", "append", [
    new Uint8Array([1, 2]),
    new Uint8Array([3]),
  ]);
  await flush();
  let frames = env.sends.filter((s) => s.msg.type === "artifact");
  assert.equal(frames.length, 1);
  assert.equal(frames[0].msg.last, false);
  assert.equal(frames[0].msg.data, Buffer.from([1, 2]).toString("base64"));
  env.s2d("recorded", {
    recordId: frames[0].msg.recordId,
    recordSeq: frames[0].msg.recordSeq,
    ref: null,
  });
  frames[0].cb(null);
  await flush();
  frames = env.sends.filter((s) => s.msg.type === "artifact");
  assert.equal(frames.length, 2);
  assert.equal(frames[1].msg.last, true);
  assert.equal(frames[1].msg.recordSeq, frames[0].msg.recordSeq + 1);
  env.s2d("recorded", {
    recordId: frames[1].msg.recordId,
    recordSeq: frames[1].msg.recordSeq,
    ref: ref("out/raw.bin", 3, 7),
  });
  frames[1].cb(null);
  const got = await art;
  assert.equal(got.path, "out/raw.bin");
  assert.equal(Object.isFrozen(got), true);
  const empty = env.b.capabilities.artifact("out/empty.bin", "replace", []);
  await flush();
  const ef = env.sends.filter((s) => s.msg.type === "artifact" && s.msg.path === "out/empty.bin");
  assert.equal(ef.length, 1);
  assert.equal(ef[0].msg.last, true);
  assert.equal(ef[0].msg.data, "");
  assert.equal(ef[0].msg.recordSeq, frames[1].msg.recordSeq + 1);
  env.s2d("recorded", {
    recordId: ef[0].msg.recordId,
    recordSeq: ef[0].msg.recordSeq,
    ref: ref("out/empty.bin", 0, 8),
  });
  ef[0].cb(null);
  assert.equal((await empty).byteLength, 0);
});

test("duplicate seq, wrong-runId and mismatched ACKs fault; a reused operationId rejects", async (t) => {
  const env = makeEnv(t);
  await driveStart(env);
  env.emit({ ipcVersion: 1, runId: "run-other", seq: 1, type: "stop", stopReason: "x", cleanupRemainingMs: 1 });
  await assert.rejects(env.b.capabilities.event("operation", { n: 1 }));
  const dup = makeEnv(t);
  await driveStart(dup);
  dup.emit({ ipcVersion: 1, runId: RUN, seq: 9, type: "stop", stopReason: "x", cleanupRemainingMs: 1 });
  await assert.rejects(dup.b.capabilities.event("operation", { n: 1 }));
  const re = makeEnv(t);
  await driveStart(re);
  const workOut = deferred(re);
  const op = re.b.capabilities.operation("command", "op-x", () => workOut.promise);
  const begin = re.sends.find((s) => s.msg.type === "begin");
  begin.cb(null);
  re.s2d("begun", { operationId: "op-x", remainingMs: 1000 });
  workOut.resolve({ status: "completed", evidencePaths: [], detail: {} });
  await flush();
  re.sends.find((s) => s.msg.type === "end").cb(null);
  await op;
  await assert.rejects(re.b.capabilities.operation("command", "op-x", () => ({})), /reuse/);
  assert.equal(re.sends.filter((s) => s.msg.type === "begin").length, 1);
});
