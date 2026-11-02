// Frame/sequence/ID/ack transitions, closed driver/collector/exec-gate
// variants, byte ceilings, sticky driver fault beside a healthy collector,
// teardown-only collector continuation and fixed declaration values. All
// messages are synthetic protocol frames; no real processes or sockets are
// exercised here.

import assert from "node:assert/strict";
import test from "node:test";
import { FIXED_LIMITS } from "./record-schema.mjs";
import {
  createProtocolValidator,
  IPC_LIMITS,
  RESOURCE_LIMITS,
  TIMING_LIMITS,
} from "./supervisor-protocol.mjs";
import { identity } from "./test-fixtures.mjs";

const RUN = "run-test";
const v = () => createProtocolValidator({ runId: RUN });

const fail = (fn, want = "IPC_INVALID") => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.code, want);
    return;
  }
  assert.fail("expected IPC_INVALID");
};

const msg = (seq, type, extra = {}) => ({ ipcVersion: 1, runId: RUN, seq, type, ...extra });
const bytes = IPC_LIMITS.frameBytes;

test("fixed declarations alias the frozen limits", () => {
  assert.equal(IPC_LIMITS.frameBytes, 1048576);
  assert.equal(IPC_LIMITS.driverBytes, 262144);
  assert.equal(IPC_LIMITS.chunkBytes, 65536);
  assert.equal(TIMING_LIMITS.cleanupMs, 5000);
  assert.equal(TIMING_LIMITS.heartbeatMs, 500);
  assert.equal(TIMING_LIMITS.heartbeatGapMs, 2000);
  assert.equal(TIMING_LIMITS.readinessMs, 30000);
  assert.equal(TIMING_LIMITS.commandMs, 90000);
  assert.equal(RESOURCE_LIMITS.workspaceBytes, 268435456);
  assert.equal(RESOURCE_LIMITS.finalReserveBytes, 2097152);
  assert.equal(TIMING_LIMITS, FIXED_LIMITS.timing);
});

const hello = (pv, seq = 0) =>
  pv.accept("driver", "d2s", msg(seq, "hello", { pid: 4242, phase: "check", commonIdentitySha256: "0".repeat(64) }), 100);
const start = (pv, seq = 0) =>
  pv.accept("driver", "s2d", msg(seq, "start", { manifestPath: "check/manifest.json", commonIdentitySha256: "0".repeat(64) }), 100);

const ready = (pv, seq = 0, collector = identity(11)) =>
  pv.accept(
    "collector",
    "c2s",
    msg(seq, "ready", {
      stage: "startup",
      requestId: null,
      collector,
      supervisor: identity(1),
      platform: "darwin",
      arch: "arm64",
      abi: { bsdInfoSize: 136, taskInfoSize: 96 },
      python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" },
      libprocPath: "/usr/lib/libproc.dylib",
    }),
    bytes,
  );

test("driver duplex accepts a full ordered dialogue", () => {
  const pv = v();
  hello(pv);
  const pvEarly = v();
  hello(pvEarly);
  fail(() => pvEarly.accept("driver", "s2d", msg(0, "registered", { requestId: "q1", identity: null, listener: null }), 100));
  start(pv);
  pv.accept("driver", "d2s", msg(1, "register", {
    requestId: "q1", kind: "browser", rootPid: 55, expectedExecutable: "/opt/chromium/chromium",
    listener: { address: "127.0.0.1", port: 9222 },
  }), 100);
  pv.accept("driver", "s2d", msg(1, "registered", { requestId: "q1", identity: identity(55), listener: { address: "127.0.0.1", port: 9222 } }), 100);
  pv.accept("driver", "d2s", msg(2, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pv.accept("driver", "s2d", msg(2, "begun", { operationId: "op1", remainingMs: 30000 }), 100);
  pv.accept("driver", "d2s", msg(3, "heartbeat", { operationId: "op1" }), 100);
  pv.accept("driver", "d2s", msg(4, "event", { recordId: "e1", recordSeq: 0, kind: "operation", payload: {} }), 100);
  pv.accept("driver", "s2d", msg(3, "recorded", { recordId: "e1", recordSeq: 0, ref: null }), 100);
  pv.accept("driver", "d2s", msg(5, "artifact", {
    recordId: "a1", recordSeq: 1, artifactId: "art1", path: "check/f", mode: "append",
    encoding: "base64", data: Buffer.from("x").toString("base64"), last: true,
  }), 100);
  pv.accept("driver", "d2s", msg(6, "end", { operationId: "op1", result: { status: "completed", evidencePaths: [], detail: {} } }), 100);
  pv.accept("driver", "d2s", msg(7, "finish", {
    requestedStatus: "passed", requestedExitCode: 0, stopReason: null,
    checks: [], summary: {}, analysisEligible: false,
  }), 100);
  pv.accept("driver", "s2d", msg(4, "stop", { stopReason: "DONE", cleanupRemainingMs: 5000 }), 100);
  pv.accept("driver", "d2s", msg(8, "closed", { gracefulCloseAttempted: true, expectedShutdowns: [] }), 100);
});

test("after stop only the graceful closed marker is admissible", () => {
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "s2d", msg(1, "stop", { stopReason: "DONE", cleanupRemainingMs: 5000 }), 100);
  fail(() =>
    pv.accept("driver", "d2s", msg(1, "finish", {
      requestedStatus: "passed", requestedExitCode: 0, stopReason: null,
      checks: [], summary: {}, analysisEligible: false,
    }), 100),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "command" }), 100);
  pv2.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 90000 }), 100);
  pv2.accept("driver", "s2d", msg(2, "stop", { stopReason: "STOP", cleanupRemainingMs: 5000 }), 100);
  fail(() =>
    pv2.accept("driver", "d2s", msg(2, "end", {
      operationId: "op1",
      result: { status: "completed", evidencePaths: [], detail: {} },
    }), 100),
  );
  const pv3 = v();
  hello(pv3);
  start(pv3);
  pv3.accept("driver", "s2d", msg(1, "stop", { stopReason: "STOP", cleanupRemainingMs: 5000 }), 100);
  pv3.accept("driver", "d2s", msg(1, "closed", { gracefulCloseAttempted: true, expectedShutdowns: [] }), 100);
});

test("sequence, runId, ipcVersion and field closure are enforced", () => {
  const pv = v();
  fail(() => pv.accept("driver", "d2s", msg(1, "hello", { pid: 1, phase: "check", commonIdentitySha256: "0".repeat(64) }), 100));
  const pv2 = v();
  fail(() => pv2.accept("driver", "d2s", { ipcVersion: 2, runId: RUN, seq: 0, type: "hello", pid: 1, phase: "check", commonIdentitySha256: "0".repeat(64) }, 100));
  const pv3 = v();
  fail(() => pv3.accept("driver", "d2s", { ipcVersion: 1, runId: "other", seq: 0, type: "hello", pid: 1, phase: "check", commonIdentitySha256: "0".repeat(64) }, 100));
  const pv4 = v();
  fail(() => pv4.accept("driver", "d2s", msg(0, "hello", { pid: 1, phase: "check", commonIdentitySha256: "0".repeat(64), extra: 1 }), 100));
  const pv5 = v();
  hello(pv5);
  fail(() => pv5.accept("driver", "d2s", msg(2, "heartbeat", { operationId: null }), 100));
  const pv6 = v();
  hello(pv6);
  start(pv6);
  fail(() => pv6.accept("driver", "d2s", msg(0, "heartbeat", { operationId: null }), 100));
});

test("shared ID registry rejects cross-channel reuse", () => {
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "d2s", msg(1, "register", { requestId: "dup", kind: "fixture", rootPid: null, expectedExecutable: null, listener: null }), 100);
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "d2s", msg(1, "begin", { operationId: "dup", kind: "command" }), 100);
  fail(() => pv2.accept("driver", "d2s", msg(2, "begin", { operationId: "dup", kind: "command" }), 100));
});

test("frame byte ceilings differ for driver and collector", () => {
  const pv = v();
  fail(() => pv.accept("driver", "d2s", msg(0, "hello", { pid: 1, phase: "check", commonIdentitySha256: "0".repeat(64) }), IPC_LIMITS.driverBytes + 1));
  const pv2 = v();
  fail(() => pv2.accept("collector", "c2s", { type: "ready" }, IPC_LIMITS.frameBytes + 1));
  const pv3 = v();
  fail(() => pv3.accept("collector", "c2s", { type: "ready" }, 0));
});

test("unknown channel, direction and poisoned state are rejected", () => {
  const pv = v();
  fail(() => pv.accept("mystery", "d2s", {}, 10));
  fail(() => pv.accept("driver", "c2s", {}, 10));
  fail(() => pv.accept("driver", "d2s", { type: "nonsense" }, 10));
  fail(() => pv.accept("driver", "d2s", msg(0, "hello", {}), 10));
});

test("driver fault sets run-global stop; collector continues cleanup only", () => {
  const pv = v();
  hello(pv);
  start(pv);
  ready(pv);
  pv.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots1",
    roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
  }), bytes);
  pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  fail(() => pv.accept("driver", "d2s", msg(1, "event", { recordId: "x", recordSeq: 9, kind: "operation", payload: {} }), 100));
  fail(() => pv.accept("driver", "d2s", msg(2, "heartbeat", { operationId: null }), 100));
  fail(() => pv.accept("driver", "d2s", msg(2, "begin", { operationId: "op-late", kind: "command" }), 100));
  fail(() =>
    pv.accept("collector", "s2c", msg(1, "own-roots", {
      requestId: "roots2",
      roots: [{ identity: identity(56), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
    }), bytes),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  ready(pv2);
  pv2.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots1",
    roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
  }), bytes);
  pv2.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  pv2.accept("collector", "c2s", msg(2, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  fail(() => pv2.accept("driver", "d2s", msg(1, "begin", { operationId: "op2", kind: "readiness" }), 100));
  const pv3 = v();
  hello(pv3);
  start(pv3);
  ready(pv3);
  pv3.accept("collector", "c2s", msg(1, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  fail(() =>
    pv3.accept("driver", "d2s", msg(1, "finish", {
      requestedStatus: "passed", requestedExitCode: 0, stopReason: null,
      checks: [], summary: {}, analysisEligible: false,
    }), 100),
  );
  const pv4 = v();
  hello(pv4);
  start(pv4);
  ready(pv4);
  pv4.accept("collector", "c2s", msg(1, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  pv4.accept("driver", "d2s", msg(1, "closed", { gracefulCloseAttempted: true, expectedShutdowns: [] }), 100);
  fail(() =>
    pv4.accept("collector", "c2s", msg(2, "ready", {
      stage: "roots-accepted",
      requestId: "late",
    }), bytes),
  );
});

test("collector ready requires the exact startup envelope once", () => {
  const pv = v();
  fail(() =>
    pv.accept("collector", "c2s", msg(0, "ready", {
      stage: "startup",
      requestId: null,
      collector: identity(11),
      supervisor: identity(1),
      platform: "darwin",
      arch: "x86_64",
      abi: { bsdInfoSize: 136, taskInfoSize: 96 },
      python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" },
      libprocPath: "/usr/lib/libproc.dylib",
    }), bytes),
  );
  const pv2 = v();
  pv2.accept("collector", "c2s", { ...msg(0, "ready", {
    stage: "startup",
    requestId: null,
    collector: identity(11),
    supervisor: identity(1),
    platform: "darwin",
    arch: "arm64",
    abi: { bsdInfoSize: 136, taskInfoSize: 96 },
    python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" },
    libprocPath: "/usr/lib/libproc.dylib",
  }) }, bytes);
  fail(() => pv2.accept("collector", "c2s", msg(1, "ready", { stage: "startup", requestId: null, collector: identity(11), supervisor: identity(1), platform: "darwin", arch: "arm64", abi: { bsdInfoSize: 136, taskInfoSize: 96 }, python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" }, libprocPath: "/usr/lib/libproc.dylib" }), bytes));
});

test("roots-accepted ready binds to a pending own-roots request only", () => {
  const pv = v();
  ready(pv);
  fail(() => pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "nope" }), bytes));
});

test("signal authorization binds identity, signal and owned workload root", () => {
  const pv = v();
  ready(pv);
  pv.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots1",
    roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
  }), bytes);
  pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  pv.authorizeSignal({ requestId: "sig1", identity: identity(55), signal: "TERM" });
  pv.accept("collector", "s2c", msg(1, "signal", { requestId: "sig1", identity: identity(55), signal: "TERM" }), bytes);
  pv.accept("collector", "c2s", msg(2, "signal-result", { requestId: "sig1", identity: identity(55), signal: "TERM", outcome: "gone" }), bytes);
});

test("unauthorized or unbound signals are rejected", () => {
  const pv = v();
  ready(pv);
  fail(() => pv.accept("collector", "s2c", msg(0, "signal", { requestId: "sig9", identity: identity(55), signal: "KILL" }), bytes));
  const pv2 = v();
  fail(() => pv2.authorizeSignal({ requestId: "s", identity: { pid: "x" }, signal: "TERM" }));
  fail(() => pv2.authorizeSignal({ requestId: "s", identity: identity(1), signal: "HUP" }));
});

test("exec gate consumes exactly one authorized frame", () => {
  const pv = v();
  const query = { kind: "port", port: 9222 };
  pv.authorizeExecGate({ queryId: "q1", identity: identity(7), query });
  pv.accept("exec-gate", "s2c", msg(0, "exec", { requestId: "q1", identity: identity(7), query }), bytes);
  fail(() => pv.accept("exec-gate", "s2c", msg(0, "exec", { requestId: "q1", identity: identity(7), query }), bytes));
  const pv2 = v();
  fail(() => pv2.accept("exec-gate", "s2c", msg(0, "exec", { requestId: "x", identity: identity(7), query }), bytes));
  const pv3 = v();
  pv3.authorizeExecGate({ queryId: "q1", identity: identity(7), query });
  fail(() => pv3.accept("exec-gate", "s2c", msg(0, "exec", { requestId: "q1", identity: identity(8), query }), bytes));
  const pv4 = v();
  pv4.authorizeExecGate({ queryId: "q1", identity: identity(7), query: { kind: "owned-pids", pids: [1] } });
  fail(() => pv4.accept("exec-gate", "s2c", msg(0, "exec", { requestId: "q1", identity: identity(7), query }), bytes));
});

test("teardown collector continues identity-safe cleanup after fault", () => {
  const pv = v();
  ready(pv);
  pv.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots1",
    roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
  }), bytes);
  pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  fail(() => pv.authorizeTeardownCollector({ identity: identity(99) }));
  pv.accept("collector", "c2s", msg(2, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  pv.authorizeTeardownCollector({ identity: identity(66) });
  pv.accept("teardown-collector", "c2s", msg(0, "ready", {
    stage: "startup",
    requestId: null,
    collector: identity(66),
    supervisor: identity(1),
    platform: "darwin",
    arch: "arm64",
    abi: { bsdInfoSize: 136, taskInfoSize: 96 },
    python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" },
    libprocPath: "/usr/lib/libproc.dylib",
  }), bytes);
  pv.authorizeSignal({ requestId: "sig2", identity: identity(55), signal: "KILL" });
  pv.accept("teardown-collector", "s2c", msg(0, "signal", { requestId: "sig2", identity: identity(55), signal: "KILL" }), bytes);
  pv.accept("teardown-collector", "c2s", msg(1, "signal-result", { requestId: "sig2", identity: identity(55), signal: "KILL", outcome: "sent" }), bytes);
  fail(() => pv.accept("teardown-collector", "s2c", msg(1, "own-roots", { requestId: "r2", roots: [] }), bytes));
});

test("teardown ready with wrong identity is rejected", () => {
  const pv = v();
  pv.accept("collector", "c2s", msg(0, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  pv.authorizeTeardownCollector({ identity: identity(66) });
  fail(() =>
    pv.accept("teardown-collector", "c2s", msg(0, "ready", {
      stage: "startup",
      requestId: null,
      collector: identity(77),
      supervisor: identity(1),
      platform: "darwin",
      arch: "arm64",
      abi: { bsdInfoSize: 136, taskInfoSize: 96 },
      python: { executable: "/p", prefix: "/p", basePrefix: "/p", version: "3" },
      libprocPath: "/usr/lib/libproc.dylib",
    }), bytes),
  );
});

test("shutdown requires no pending requests and starts closing", () => {
  const pv = v();
  ready(pv);
  pv.accept("collector", "s2c", msg(0, "shutdown", { requestId: "sd1" }), bytes);
  fail(() => pv.accept("collector", "s2c", msg(1, "sample", { requestId: "s1", owned: [], inspectPids: [], probes: [] }), bytes));
});
