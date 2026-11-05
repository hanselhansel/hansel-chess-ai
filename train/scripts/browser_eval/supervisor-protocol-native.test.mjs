// supervisor-protocol-native.test.mjs: protocol/native-authority
// regressions against the REAL createProtocolValidator. Covers the
// prepared-1 repairs: one fresh exec seq-0 per helper gate after the
// prior authorization is consumed, the run-global ID registry and
// sticky ordinary-work failure persisting forever, roots that stay
// unsignalable until the exact roots-accepted acknowledgement, cached
// workload-descendant signal targets from the declared owned union,
// and protected accounting roots that are never signal targets.
import test from "node:test";
import assert from "node:assert/strict";

import { createProtocolValidator } from "./supervisor-protocol.mjs";

const ident = (pid, sec = "1000", usec = 0) => ({
  pid,
  startSec: sec,
  startUsec: usec,
});

const root = (pid, kind, scope = "R1") => ({
  identity: ident(pid),
  kind,
  expectedExecutable: "/opt/app",
  scopeRunId: scope,
});

// Closed envelope builders: per-direction sequences are tracked by the
// test so wire order is explicit, never implicit.
const mk = () => {
  const seq = { c2s: 0, s2c: 0 };
  const s2c = (type, fields) => ({
    ipcVersion: 1,
    runId: "R1",
    seq: seq.s2c++,
    type,
    ...fields,
  });
  const c2s = (type, fields) => ({
    ipcVersion: 1,
    runId: "R1",
    seq: seq.c2s++,
    type,
    ...fields,
  });
  const ready = () =>
    c2s("ready", {
      stage: "startup",
      requestId: null,
      collector: ident(2),
      supervisor: ident(1),
      platform: "darwin",
      arch: "arm64",
      abi: { bsdInfoSize: 136, taskInfoSize: 96 },
      python: {
        executable: "/py",
        prefix: "/v",
        basePrefix: "/b",
        version: "3.11.14",
      },
      libprocPath: "/usr/lib/libproc.dylib",
    });
  const exec = (queryId, identity, query) => ({
    ipcVersion: 1,
    runId: "R1",
    seq: 0,
    type: "exec",
    requestId: queryId,
    identity,
    query,
  });
  return { s2c, c2s, ready, exec };
};

const LEN = 4096; // under the closed IPC frame bound for every test frame

test("each fresh gate gets one seq-0 exec after the prior is consumed", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  p.authorizeExecGate({
    queryId: "q1",
    identity: ident(9),
    query: { kind: "port", port: 9222 },
  });
  p.accept("exec-gate", "s2c", w.exec("q1", ident(9), { kind: "port", port: 9222 }), LEN);
  // Consumption freed the slot: a second helper gets its own
  // authorization and its own sequence-0 stream.
  p.authorizeExecGate({
    queryId: "q2",
    identity: ident(10),
    query: { kind: "owned-pids", pids: [5, 6] },
  });
  p.accept(
    "exec-gate",
    "s2c",
    w.exec("q2", ident(10), { kind: "owned-pids", pids: [5, 6] }),
    LEN,
  );
});

test("concurrent gates, identity/query rebinding and id reuse reject", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  p.authorizeExecGate({
    queryId: "q1",
    identity: ident(9),
    query: { kind: "port", port: 1 },
  });
  assert.throws(() =>
    p.authorizeExecGate({
      queryId: "q2",
      identity: ident(10),
      query: { kind: "port", port: 2 },
    }),
  );
  // A frame bound to different fields than the authorization poisons.
  assert.throws(() =>
    p.accept(
      "exec-gate",
      "s2c",
      w.exec("q1", ident(9), { kind: "port", port: 2 }),
      LEN,
    ),
  );
  // The consumed registry id can never re-enter anywhere: a poisoned
  // channel and the run-global registry both stay terminal.
  const p2 = createProtocolValidator({ runId: "R1" });
  const w2 = mk();
  p2.accept("collector", "c2s", w2.ready(), LEN);
  p2.authorizeExecGate({
    queryId: "shared-q",
    identity: ident(9),
    query: { kind: "port", port: 1 },
  });
  p2.accept(
    "exec-gate",
    "s2c",
    w2.exec("shared-q", ident(9), { kind: "port", port: 1 }),
    LEN,
  );
  assert.throws(() =>
    p2.accept(
      "collector",
      "s2c",
      w2.s2c("own-roots", { requestId: "shared-q", roots: [root(7, "browser")] }),
      LEN,
    ),
  );
});

test("sticky ordinary failure preserves helpers and owned signals only", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  // Poison a different channel: the collector stays healthy but the
  // run-global fault flag now blocks new workload roots.
  assert.throws(() =>
    p.accept("exec-gate", "s2c", w.exec("qX", ident(1), { kind: "port", port: 1 }), LEN),
  );
  p.accept("collector", "c2s", w.ready(), LEN);
  // The preserved seam: one accounted cleanup-helper registration is
  // still admitted on the healthy channel after the fault.
  p.accept(
    "collector",
    "s2c",
    w.s2c("own-roots", { requestId: "r-helper", roots: [root(20, "helper")] }),
    LEN,
  );
  p.accept(
    "collector",
    "c2s",
    w.c2s("ready", { stage: "roots-accepted", requestId: "r-helper" }),
    LEN,
  );
  // Owned signals remain permitted after a fault: authorize then bind.
  p.authorizeSignal({ requestId: "sig-1", identity: ident(20), signal: "KILL" });
  p.accept(
    "collector",
    "s2c",
    w.s2c("signal", { requestId: "sig-1", identity: ident(20), signal: "KILL" }),
    LEN,
  );
  // A new workload root is rejected by the run-global fault — and the
  // rejection itself poisons this channel honestly.
  assert.throws(() =>
    p.accept(
      "collector",
      "s2c",
      w.s2c("own-roots", { requestId: "r-driver", roots: [root(10, "driver")] }),
      LEN,
    ),
  );
});

test("roots stay unsignalable until the exact roots-accepted ack", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  p.accept("collector", "c2s", w.ready(), LEN);
  p.accept(
    "collector",
    "s2c",
    w.s2c("own-roots", { requestId: "r1", roots: [root(10, "browser")] }),
    LEN,
  );
  // Pending registration: authorized but not yet activated — the
  // signal request is refused and poisons the channel honestly.
  p.authorizeSignal({ requestId: "sig-x", identity: ident(10), signal: "TERM" });
  assert.throws(() =>
    p.accept(
      "collector",
      "s2c",
      w.s2c("signal", { requestId: "sig-x", identity: ident(10), signal: "TERM" }),
      LEN,
    ),
  );
});

test("cached union descendants are targets; accounting roots are never", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  p.accept("collector", "c2s", w.ready(), LEN);
  p.accept(
    "collector",
    "s2c",
    w.s2c("own-roots", {
      requestId: "r1",
      roots: [root(1, "supervisor"), root(10, "browser")],
    }),
    LEN,
  );
  p.accept(
    "collector",
    "c2s",
    w.c2s("ready", { stage: "roots-accepted", requestId: "r1" }),
    LEN,
  );
  // The monitor's declared union adds descendant 11 through one sample
  // request; membership is additive and retained.
  p.accept(
    "collector",
    "s2c",
    w.s2c("sample", {
      requestId: "s1",
      owned: [ident(10), ident(11)],
      inspectPids: [],
      probes: [],
    }),
    LEN,
  );
  p.accept(
    "collector",
    "c2s",
    w.c2s("process-samples", {
      requestId: "s1",
      startedAtMonoNs: "1",
      finishedAtMonoNs: "2",
      discovered: [],
      samples: [
        { identity: ident(10), ppid: 1, pgid: 10, uid: 501, residentBytes: 1 },
        { identity: ident(11), ppid: 10, pgid: 10, uid: 501, residentBytes: 2 },
      ],
      gone: [],
      inspected: [],
      probes: [],
    }),
    LEN,
  );
  // The workload descendant is signalable through union membership.
  p.authorizeSignal({ requestId: "sig-d", identity: ident(11), signal: "TERM" });
  p.accept(
    "collector",
    "s2c",
    w.s2c("signal", { requestId: "sig-d", identity: ident(11), signal: "TERM" }),
    LEN,
  );
  // The registered supervisor root stays refused and the refusal
  // poisons honestly; every later accept on the channel fails closed.
  p.authorizeSignal({ requestId: "sig-s", identity: ident(1), signal: "TERM" });
  assert.throws(() =>
    p.accept(
      "collector",
      "s2c",
      w.s2c("signal", { requestId: "sig-s", identity: ident(1), signal: "TERM" }),
      LEN,
    ),
  );
  assert.throws(() =>
    p.accept("collector", "s2c", w.s2c("shutdown", { requestId: "sd" }), LEN),
  );
});

test("a foreign-scope root and a shutdown with pending requests reject", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  p.accept("collector", "c2s", w.ready(), LEN);
  assert.throws(() =>
    p.accept(
      "collector",
      "s2c",
      w.s2c("own-roots", {
        requestId: "r1",
        roots: [root(10, "browser", "OTHER")],
      }),
      LEN,
    ),
  );
  // A run-namespaced subrun scope is legal and does not get rewritten.
  const p2 = createProtocolValidator({ runId: "R1" });
  const w2 = mk();
  p2.accept("collector", "c2s", w2.ready(), LEN);
  p2.accept(
    "collector",
    "s2c",
    w2.s2c("own-roots", {
      requestId: "r1",
      roots: [root(10, "browser", "R1:S-child")],
    }),
    LEN,
  );
  // The pending root keeps shutdown refused: no close while work waits.
  assert.throws(() =>
    p2.accept("collector", "s2c", w2.s2c("shutdown", { requestId: "sd" }), LEN),
  );
});

test("a deliberate duplicate c2s frame poisons only its own validator", () => {
  const p = createProtocolValidator({ runId: "R1" });
  const w = mk();
  const r = w.ready();
  p.accept("collector", "c2s", r, LEN);
  assert.throws(() => p.accept("collector", "c2s", r, LEN));
  // The fixture contract: reuse the same validator for a second
  // positive case is impossible once poisoned — build a fresh one.
  const p2 = createProtocolValidator({ runId: "R1" });
  const w2 = mk();
  p2.accept("collector", "c2s", w2.ready(), LEN);
});
