// driver-bridge-test-fixtures.mjs — TEST-ONLY shared fixture owner
// for the driver-bridge suites (C4b-04): the WHOLE original fixture
// block lifted from the restored full571 suite — fake child
// process.send/message transport and fake interval clock only (the
// fake clock controls heartbeat delivery; the actual default
// lifetime keepalive is a real lazy hold, never a fake timer) — no
// Native/kernel-child/filesystem/browser/model work. Every
// emitted d2s frame and every well-formed injected s2d reply passes
// through the REAL createProtocolValidator as the wire-lifecycle
// oracle over a real createWatchdogLifetime. makeEnv(t,...) takes
// the real Node TestContext and registers its actual teardown
// BEFORE any bridge effect; every controlled fact — a held send
// callback, deferred gate or work promise — is released
// unconditionally at teardown before a genuine fresh whenSettled
// join, so an early assertion failure can never strand real held
// debt. Imports only the bridge facade plus canonical/supervisor-
// protocol/lifetime/test primitives — no back-import from either
// TEST owner. TEST file — excluded from the functional-runtime
// union.

import assert from "node:assert/strict";
import { canonicalBytes } from "./canonical-json.mjs";
import { createDriverCapabilities } from "./driver-bridge.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { H } from "./test-fixtures.mjs";

const RUN = "run-bridge-1";
const SHA = H(11);
const MANIFEST = { runId: RUN, phase: "check", commonIdentitySha256: SHA };
const MANIFEST_PATH = "runs/run-bridge-1/manifest.json";
const LISTENER = { address: "127.0.0.1", port: 7777 };
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Controlled deferred bound to one env: the release is registered
// with that env's controlled set so teardown retires it
// unconditionally, and its rejection is observed immediately — an
// abandoned controlled promise is never an unhandled rejection.
const deferred = (env) => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.then(
    () => {},
    () => {},
  );
  const gate = {
    pending: true,
    resolve: (v) => {
      if (!gate.pending) return;
      gate.pending = false;
      resolve(v);
    },
    reject: (e) => {
      if (!gate.pending) return;
      gate.pending = false;
      reject(e);
    },
  };
  env.controlled.add(gate);
  return { promise, resolve: gate.resolve, reject: gate.reject };
};

const makeEnv = (t, { sendImpl, createHold } = {}) => {
  const pv = createProtocolValidator({ runId: RUN });
  const owner =
    createHold === undefined
      ? createWatchdogLifetime()
      : createWatchdogLifetime({ createHold });
  const intervals = [];
  const clock = {
    setInterval: (fn, ms) => {
      const h = { fn, ms, cleared: false };
      intervals.push(h);
      return h;
    },
    clearInterval: (h) => {
      h.cleared = true;
    },
  };
  const msgFns = new Set();
  const closeFns = new Set();
  const sends = [];
  // Per-env controlled facts: every deferred() gate/work registered
  // with this env, plus every send callback actually invoked and
  // not yet delivered. Teardown releases them unconditionally —
  // no production authority, only truthful retirement of held
  // facts so an early failure can never hang a real hold.
  const controlled = new Set();
  const pendingSendCallbacks = new Set();
  const trackCallback = (cb) => {
    const tracked = (err) => {
      if (!pendingSendCallbacks.delete(tracked)) return;
      cb(err);
    };
    pendingSendCallbacks.add(tracked);
    return tracked;
  };
  const env = {
    pv,
    owner,
    clock,
    intervals,
    msgFns,
    closeFns,
    sends,
    controlled,
    emit: (m) => {
      for (const f of [...msgFns]) f(m);
    },
    drop: () => {
      for (const f of [...closeFns]) f();
    },
  };
  env.transport = {
    pid: 4242,
    send: (frame, cb) => {
      const tracked = trackCallback(cb);
      if (sendImpl !== undefined) return sendImpl(frame, tracked);
      pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
      sends.push({ msg: frame, cb: tracked });
      return true;
    },
    onMessage: (fn) => {
      msgFns.add(fn);
      return () => msgFns.delete(fn);
    },
    onClose: (fn) => {
      closeFns.add(fn);
      return () => closeFns.delete(fn);
    },
    clock,
    retainActual: owner.retainActual,
  };
  env.ext = new AbortController();
  // Actual teardown is armed BEFORE the first bridge effect: close
  // ordinary admission through the original external signal, then
  // unconditionally resolve every still-pending controlled
  // gate/work with a harmless valid OperationResult, then deliver
  // any unreturned real fake send callbacks — including the
  // deliberately unknown sync-throw submission, whose actual
  // callback may arrive only here and is truthfully retired then.
  // Only then await a genuine fresh owner.whenSettled and drop the
  // transport/unsubscribe lane after the actual join.
  t.after(async () => {
    env.ext.abort();
    for (const gate of controlled) {
      gate.resolve({ status: "completed", evidencePaths: [], detail: {} });
    }
    for (const cb of [...pendingSendCallbacks]) cb(null);
    await owner.whenSettled();
    env.drop();
  });
  env.b = createDriverCapabilities({
    runId: RUN,
    manifest: MANIFEST,
    transport: env.transport,
    signal: env.ext.signal,
  });
  let sin = 0;
  env.s2d = (type, fields) => {
    const msg = { ipcVersion: 1, runId: RUN, seq: sin, type, ...fields };
    sin += 1;
    pv.accept("driver", "s2d", msg, canonicalBytes(msg).length);
    env.emit(msg);
  };
  return env;
};

const driveStart = async (env) => {
  const p = env.b.start({ manifestPath: MANIFEST_PATH });
  assert.equal(env.sends.length, 1);
  assert.equal(env.sends[0].msg.type, "hello");
  assert.equal(env.sends[0].msg.seq, 0);
  assert.deepEqual(
    {
      pid: env.sends[0].msg.pid,
      phase: env.sends[0].msg.phase,
      commonIdentitySha256: env.sends[0].msg.commonIdentitySha256,
    },
    { pid: 4242, phase: "check", commonIdentitySha256: SHA },
  );
  env.s2d("start", { manifestPath: MANIFEST_PATH, commonIdentitySha256: SHA });
  env.sends[0].cb(null);
  await p;
};

export {
  RUN,
  SHA,
  MANIFEST,
  MANIFEST_PATH,
  LISTENER,
  flush,
  deferred,
  makeEnv,
  driveStart,
};
