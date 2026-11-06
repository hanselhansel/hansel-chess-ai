// Lifecycle-order, exact-acknowledgement and binding regressions for the
// supervisor protocol: idle/begun/end/stop ordering, registration and
// roots-accepted acknowledgements, immutable authorization/root snapshots
// and closed compound shapes. All messages are synthetic protocol frames;
// no real processes or sockets are exercised here.

import assert from "node:assert/strict";
import test from "node:test";
import { createProtocolValidator, IPC_LIMITS } from "./supervisor-protocol.mjs";
import { identity } from "./test-fixtures.mjs";

const RUN = "run-test";
const v = () => createProtocolValidator({ runId: RUN });

const fail = (fn) => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.code, "IPC_INVALID");
    return;
  }
  assert.fail("expected IPC_INVALID");
};

const msg = (seq, type, extra = {}) => ({ ipcVersion: 1, runId: RUN, seq, type, ...extra });
const bytes = IPC_LIMITS.frameBytes;

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

test("idle heartbeat needs null; begun binds a real pending begin", () => {
  // Valid idle/begin traffic runs on validators untouched by the
  // intentional poisons beside them.
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "d2s", msg(1, "heartbeat", { operationId: null }), 100);
  pv.accept("driver", "d2s", msg(2, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pv.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100);
  const pvGhost = v();
  hello(pvGhost);
  start(pvGhost);
  fail(() =>
    pvGhost.accept("driver", "s2d", msg(1, "begun", { operationId: "ghost", remainingMs: 30000 }), 100),
  );
  const pvLate = v();
  hello(pvLate);
  start(pvLate);
  pvLate.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvLate.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100);
  fail(() => pvLate.accept("driver", "d2s", msg(2, "heartbeat", { operationId: null }), 100));
  const pvTwice = v();
  hello(pvTwice);
  start(pvTwice);
  pvTwice.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvTwice.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100);
  fail(() =>
    pvTwice.accept("driver", "s2d", msg(2, "begun", { operationId: "op1", remainingMs: 30000 }), 100),
  );
});

test("a late begun after stop, fault or close never activates", () => {
  // After a supervisor stop the pending begin cannot complete.
  const pvStop = v();
  hello(pvStop);
  start(pvStop);
  pvStop.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvStop.accept("driver", "s2d", msg(1, "stop", { stopReason: "DONE", cleanupRemainingMs: 5000 }), 100);
  fail(() =>
    pvStop.accept("driver", "s2d", msg(2, "begun", { operationId: "op1", remainingMs: 30000 }), 100),
  );
  // A run-global fault blocks activation on a still-unpoisoned driver.
  const pvFault = v();
  hello(pvFault);
  start(pvFault);
  pvFault.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvFault.accept("collector", "c2s", msg(0, "accounting-fault", { requestId: null, code: "IPC_INVALID", reason: "internal", diagnostic: "" }), bytes);
  fail(() =>
    pvFault.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100),
  );
  // After the driver's own finish the leftover begin cannot complete.
  const pvFin = v();
  hello(pvFin);
  start(pvFin);
  pvFin.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvFin.accept("driver", "d2s", msg(2, "finish", { requestedStatus: "passed", requestedExitCode: 0, stopReason: null, checks: [], summary: {}, analysisEligible: false }), 100);
  fail(() =>
    pvFin.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100),
  );
  // After graceful close the channel stays closed to begun.
  const pvClosed = v();
  hello(pvClosed);
  start(pvClosed);
  pvClosed.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  pvClosed.accept("driver", "d2s", msg(2, "closed", { gracefulCloseAttempted: true, expectedShutdowns: [] }), 100);
  fail(() =>
    pvClosed.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30000 }), 100),
  );
});

test("readiness/command ceilings bound the acknowledged remainingMs", () => {
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "readiness" }), 100);
  fail(() =>
    pv.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 30001 }), 100),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "command" }), 100);
  pv2.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 90000 }), 100);
  fail(() =>
    pv2.accept("driver", "s2d", msg(2, "begun", { operationId: "op1", remainingMs: 1 }), 100),
  );
});

test("end requires an actually acknowledged active operation", () => {
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "command" }), 100);
  fail(() =>
    pv.accept("driver", "d2s", msg(2, "end", {
      operationId: "op1",
      result: { status: "completed", evidencePaths: [], detail: {} },
    }), 100),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "d2s", msg(1, "begin", { operationId: "op1", kind: "command" }), 100);
  pv2.accept("driver", "s2d", msg(1, "begun", { operationId: "op1", remainingMs: 90000 }), 100);
  pv2.accept("driver", "d2s", msg(2, "end", {
    operationId: "op1",
    result: { status: "completed", evidencePaths: [], detail: {} },
  }), 100);
  fail(() =>
    pv2.accept("driver", "d2s", msg(3, "end", {
      operationId: "op1",
      result: { status: "completed", evidencePaths: [], detail: {} },
    }), 100),
  );
});

test("registration acknowledgements bind the requested identity and listener", () => {
  const pv = v();
  hello(pv);
  start(pv);
  pv.accept("driver", "d2s", msg(1, "register", {
    requestId: "q1", kind: "browser", rootPid: 55, expectedExecutable: "/opt/chromium/chromium", listener: null,
  }), 100);
  fail(() =>
    pv.accept("driver", "s2d", msg(1, "registered", {
      requestId: "q1",
      identity: identity(56),
      listener: null,
    }), 100),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "d2s", msg(1, "register", {
    requestId: "q1", kind: "browser", rootPid: 55, expectedExecutable: "/opt/chromium/chromium",
    listener: { address: "127.0.0.1", port: 9222 },
  }), 100);
  fail(() =>
    pv2.accept("driver", "s2d", msg(1, "registered", {
      requestId: "q1",
      identity: identity(55),
      listener: { address: "127.0.0.1", port: 9223 },
    }), 100),
  );
  const pv3 = v();
  hello(pv3);
  start(pv3);
  fail(() =>
    pv3.accept("driver", "s2d", msg(0, "registered", {
      requestId: "unknown",
      identity: null,
      listener: null,
    }), 100),
  );
});

test("authorization and root bindings are immutable snapshots", () => {
  const pv = v();
  ready(pv);
  const root = { identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN };
  pv.accept("collector", "s2c", msg(0, "own-roots", { requestId: "roots1", roots: [root] }), bytes);
  root.identity = { ...root.identity, pid: 999 };
  pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  pv.authorizeSignal({ requestId: "sig1", identity: identity(55), signal: "TERM" });
  pv.accept("collector", "s2c", msg(1, "signal", { requestId: "sig1", identity: identity(55), signal: "TERM" }), bytes);
  fail(() =>
    pv.accept("collector", "s2c", msg(2, "signal", { requestId: "sig2", identity: identity(999), signal: "TERM" }), bytes),
  );
});

test("compound message rows are closed: extra fields reject", () => {
  const pv = v();
  ready(pv);
  fail(() =>
    pv.accept("collector", "s2c", msg(0, "own-roots", {
      requestId: "roots1",
      roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN, extra: 1 }],
    }), bytes),
  );
  const pv2 = v();
  ready(pv2);
  pv2.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots1",
    roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
  }), bytes);
  pv2.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots1" }), bytes);
  pv2.accept("collector", "s2c", msg(1, "sample", { requestId: "s1", owned: [identity(55)], inspectPids: [], probes: [] }), bytes);
  fail(() =>
    pv2.accept("collector", "c2s", msg(2, "process-samples", {
      requestId: "s1",
      startedAtMonoNs: "1",
      finishedAtMonoNs: "2",
      discovered: [{ identity: identity(55), ppid: 1, pgid: 1, uid: 501, extra: 1 }],
      samples: [{ identity: identity(55), ppid: 1, pgid: 1, uid: 501, residentBytes: 100 }],
      gone: [],
      inspected: [],
      probes: [],
    }), bytes),
  );
});

test("a healthy collector keeps accounted cleanup helpers after a fault", () => {
  const pv = v();
  hello(pv);
  start(pv);
  ready(pv);
  // A driver fault sets the run-global ordinary stop without touching
  // this still-healthy collector.
  fail(() =>
    pv.accept("driver", "d2s", msg(1, "event", { recordId: "x", recordSeq: 9, kind: "operation", payload: {} }), 100),
  );
  // The trusted accounted cleanup-helper registration is still admitted
  // and acknowledged like any other root set.
  pv.accept("collector", "s2c", msg(0, "own-roots", {
    requestId: "roots-h",
    roots: [{ identity: identity(77), kind: "helper", expectedExecutable: "/opt/cleanup/helper", scopeRunId: RUN }],
  }), bytes);
  pv.accept("collector", "c2s", msg(1, "ready", { stage: "roots-accepted", requestId: "roots-h" }), bytes);
  // New workload roots stay rejected on a fresh healthy channel after
  // the same kind of run-global fault.
  const pv2 = v();
  hello(pv2);
  start(pv2);
  ready(pv2);
  fail(() =>
    pv2.accept("driver", "d2s", msg(1, "event", { recordId: "x", recordSeq: 9, kind: "operation", payload: {} }), 100),
  );
  fail(() =>
    pv2.accept("collector", "s2c", msg(0, "own-roots", {
      requestId: "roots-w",
      roots: [{ identity: identity(78), kind: "browser", expectedExecutable: "/opt/chromium/chromium", scopeRunId: RUN }],
    }), bytes),
  );
});

test("root declarations require a structurally absolute executable", () => {
  const pv = v();
  ready(pv);
  fail(() =>
    pv.accept("collector", "s2c", msg(0, "own-roots", {
      requestId: "roots-rel",
      roots: [{ identity: identity(55), kind: "browser", expectedExecutable: "chromium", scopeRunId: RUN }],
    }), bytes),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  fail(() =>
    pv2.accept("driver", "d2s", msg(1, "register", {
      requestId: "q1", kind: "browser", rootPid: 55, expectedExecutable: "chromium", listener: null,
    }), 100),
  );
});

test("inspection pid must match its process identity", () => {
  const pv = v();
  ready(pv);
  pv.accept("collector", "s2c", msg(0, "sample", { requestId: "s1", owned: [], inspectPids: [55], probes: [] }), bytes);
  fail(() =>
    pv.accept("collector", "c2s", msg(1, "process-samples", {
      requestId: "s1",
      startedAtMonoNs: "1",
      finishedAtMonoNs: "2",
      discovered: [],
      samples: [],
      gone: [],
      inspected: [{
        pid: 55,
        state: "live",
        process: { identity: identity(56), ppid: 1, pgid: 1, uid: 501 },
        executable: "/bin/x",
      }],
      probes: [],
    }), bytes),
  );
});

test("stop binds the cleanup ceiling; a second stop is not admissible", () => {
  const pv = v();
  hello(pv);
  start(pv);
  fail(() =>
    pv.accept("driver", "s2d", msg(1, "stop", { stopReason: "DONE", cleanupRemainingMs: 5001 }), 100),
  );
  const pv2 = v();
  hello(pv2);
  start(pv2);
  pv2.accept("driver", "s2d", msg(1, "stop", { stopReason: "DONE", cleanupRemainingMs: 5000 }), 100);
  fail(() =>
    pv2.accept("driver", "s2d", msg(2, "stop", { stopReason: "AGAIN", cleanupRemainingMs: 5000 }), 100),
  );
});

test("terminal collector state keeps its stream closed", () => {
  const pv = v();
  ready(pv);
  pv.accept("collector", "c2s", msg(1, "accounting-fault", {
    requestId: null, code: "ACCOUNTING_UNAVAILABLE", reason: "sample-stale", diagnostic: "",
  }), bytes);
  fail(() => pv.accept("collector", "c2s", msg(2, "signal-result", { requestId: "x", identity: identity(1), signal: "TERM", outcome: "gone" }), bytes));
  fail(() => pv.accept("collector", "s2c", msg(1, "signal", { requestId: "x", identity: identity(1), signal: "TERM" }), bytes));
});

test("collector fault preserves validated pre-STOP liveness without admitting new work", () => {
  for (const kind of ["heartbeat", "bad-heartbeat", "bad-seq", "register"]) {
    const pv = v();
    hello(pv);
    start(pv);
    pv.accept("collector", "c2s", msg(0, "accounting-fault", {
      requestId: null, code: "ACCOUNTING_UNAVAILABLE", reason: "permission",
      diagnostic: "pidinfo-bsd 37355 errno 1",
    }), bytes);
    const frame = kind === "register" ? msg(1, "register", {
      requestId: "forbidden", kind: "fixture", rootPid: null, expectedExecutable: null, listener: null,
    }) : msg(kind === "bad-seq" ? 9 : 1, "heartbeat", { operationId: kind === "bad-heartbeat" ? "ghost" : null });
    if (kind !== "heartbeat") {
      fail(() => pv.accept("driver", "d2s", frame, 100));
      continue;
    }
    pv.accept("driver", "d2s", frame, 100);
    pv.accept("driver", "s2d", msg(1, "stop", { stopReason: "ACCOUNTING_UNAVAILABLE", cleanupRemainingMs: 5000 }), 100);
    pv.accept("driver", "d2s", msg(2, "closed", { gracefulCloseAttempted: true, expectedShutdowns: [] }), 100);
  }
  const stopped = v();
  hello(stopped);
  start(stopped);
  stopped.accept("driver", "s2d", msg(1, "stop", { stopReason: "ACCOUNTING_UNAVAILABLE", cleanupRemainingMs: 5000 }), 100);
  fail(() => stopped.accept("driver", "d2s", msg(1, "heartbeat", { operationId: null }), 100));
});
