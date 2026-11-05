// process-transport.mjs owns the collector child's wire lifecycle:
// strict incremental UTF-8 decoding of stdout into LF-terminated
// frames (1 MiB ceiling per frame including its LF and on one
// incomplete tail, checked before any concat; coalesced chunks legal),
// a pending-reply map bound to validator requestIds where every reply
// subscribes to the caller's borrowed BudgetHandle so narrowing and
// expiry reach already-issued waits, a bounded write queue honoring
// stdin backpressure without replaying a submitted frame, and bounded
// exit-plus-pipe settlement. It proves no process identity and never
// rescues a fault: failures route through onFault exactly once while
// close/reap stay available for cleanup.
import { TextDecoder } from "node:util";

import { pollHandle, waitHandle } from "./process-budget.mjs";
import { createCollectorFramer } from "./process-framing.mjs";

const MAXFRAME = 1048576;
const MAX_PENDING_WRITES = 256;
const MAXERR = 65536;
const decoder = new TextDecoder("utf-8", { fatal: true });

const realClock = {
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  nowMonoNs: () => process.hrtime.bigint().toString(),
};

const tErr = (detail) => {
  const e = new Error(`IPC_INVALID ${detail}`);
  e.code = "IPC_INVALID";
  return e;
};

export function createCollectorTransport({
  child,
  protocol,
  runId,
  clock = realClock,
  readyDeadlineMs = 30000,
  onFault = () => {},
  onInbound = () => {},
}) {
  let seqOut = 0;
  let failed = false;
  let exited = false;
  let exitCode = null;
  let ended = false;
  let stdoutClosed = false;
  let stderrClosed = false;
  let stdoutError = null;
  let stderrError = null;
  let readyMsg = null;
  let lastError = null;
  let stderrTail = Buffer.alloc(0);
  let resolveReaped;
  const reaped = new Promise((r) => (resolveReaped = r));
  const pending = new Map();
  const writeQueue = [];
  let writing = false;

  const rejectAll = (e) => {
    for (const p of pending.values()) {
      p.unsub();
      p.reject(e);
    }
    pending.clear();
  };

  const failOnce = (e) => {
    if (failed) return;
    failed = true;
    lastError = e;
    rejectAll(e);
    writeQueue.length = 0;
    framer.discard();
    child.stdin.off("drain", resumeWrite);
    onFault(e);
  };

  const settle = () => {
    // Settlement means the real exit event plus BOTH pipes closed.
    if (exited && stdoutClosed && stderrClosed) {
      resolveReaped({ exitCode });
    }
  };

  const onFrame = (bytes) => {
    if (bytes.length === 0) {
      failOnce(tErr("blank frame"));
      return;
    }
    if (bytes.length + 1 > MAXFRAME) {
      failOnce(tErr("frame bytes"));
      return;
    }
    let msg;
    try {
      msg = JSON.parse(decoder.decode(bytes));
    } catch {
      failOnce(tErr("frame decode"));
      return;
    }
    // The pending entry stays owned until BOTH the same-handle
    // actual-clock check and protocol acceptance succeed: a late
    // acknowledgement arriving after its request expired can never be
    // admitted into protocol state, and the failure rejects the actual
    // send/proof promise together with its public wrapper instead of
    // leaving a stranded waiter.
    const p = pending.get(msg.requestId);
    if (p) {
      try {
        p.handle.assertLive("reply deadline");
      } catch {
        failOnce(tErr("reply deadline"));
        return;
      }
    }
    try {
      protocol.accept("collector", "c2s", msg, bytes.length + 1);
    } catch (e) {
      failOnce(e);
      return;
    }
    if (msg.type === "ready" && msg.stage === "startup") {
      readyMsg = msg;
      return;
    }
    onInbound(msg);
    if (p) {
      pending.delete(msg.requestId);
      p.unsub();
      p.resolve(msg);
    }
  };

  // The bounded LF byte-assembly delegates to the framer owner: every
  // oversize/truncated condition routes back through the transport's
  // single failure latch, and isFailed stops all further framing once
  // the wire is doomed.
  const framer = createCollectorFramer({
    onFrame,
    onFault: (detail) => failOnce(tErr(detail)),
    isFailed: () => failed,
  });

  child.stdout.on("data", framer.push);
  // stderr carries no protocol bytes; a bounded byte tail stays as error evidence.
  child.stderr.on("data", (d) => {
    if (stderrTail.length < MAXERR) {
      stderrTail = Buffer.concat([stderrTail, d]).subarray(0, MAXERR);
    }
  });
  child.stdout.on("close", () => {
    stdoutClosed = true;
    framer.finish();
    settle();
  });
  child.stderr.on("close", () => {
    stderrClosed = true;
    settle();
  });
  // A pipe error is a recorded fault, never an observed close: the
  // wire fails and the error is kept as evidence, but settlement still
  // requires the real `close` events, so an errored pipe that never
  // closes leaves the reap unproven until its deadline.
  child.stdout.on("error", (e) => {
    stdoutError = e;
    failOnce(e);
    settle();
  });
  child.stderr.on("error", (e) => {
    stderrError = e;
    failOnce(e);
    settle();
  });
  // A spawn error faults the wire but never declares settlement.
  child.on("error", (e) => failOnce(e));
  child.on("exit", (code) => {
    exited = true;
    exitCode = code;
    if (ended) {
      // Admitted teardown (shutdown or private-pipe EOF): settle any
      // stranded request without poisoning the channel.
      rejectAll(tErr("collector exit"));
    } else {
      failOnce(tErr("collector exit"));
    }
    settle();
  });
  child.stdin.on("error", (e) => failOnce(e));

  const resumeWrite = () => {
    writing = false;
    drain();
  };

  const drain = () => {
    if (writing) return;
    writing = true;
    while (writeQueue.length > 0 && !failed) {
      const item = writeQueue.shift();
      // An expired request never writes late: its borrowed handle is
      // rechecked against the real clock before every write and drain
      // continue; a spent frame means the wire is already doomed.
      if (item.handle !== null) {
        try {
          item.handle.assertLive("send deadline");
        } catch {
          failOnce(tErr("send deadline"));
          return;
        }
      }
      // write(false) already accepted this frame into the stream's own
      // buffer; drain resumes with the NEXT frame, never a replay.
      if (child.stdin.write(item.buf) === false) {
        child.stdin.once("drain", resumeWrite);
        return;
      }
    }
    writing = false;
  };

  const enqueueFrame = (type, fields, requestId, handle) => {
    const msg = {
      ipcVersion: 1,
      runId,
      seq: seqOut,
      type,
      requestId,
      ...fields,
    };
    const frame = `${JSON.stringify(msg)}\n`;
    protocol.accept(
      "collector",
      "s2c",
      msg,
      Buffer.byteLength(frame, "utf8"),
    );
    seqOut += 1;
    writeQueue.push({ buf: Buffer.from(frame, "utf8"), handle });
    drain();
  };

  const send = (type, fields, requestId, handle) => {
    if (failed) return Promise.reject(tErr("transport failed"));
    if (exited) return Promise.reject(tErr("collector exited"));
    if (writeQueue.length >= MAX_PENDING_WRITES) {
      return Promise.reject(tErr("write queue"));
    }
    // A requestId still owned by a live waiter can never be claimed
    // again: rejecting the colliding send before any map write keeps
    // the first waiter intact instead of silently stranding it.
    if (pending.has(requestId)) {
      return Promise.reject(tErr("requestId pending"));
    }
    if (
      handle === null ||
      handle === undefined ||
      typeof handle.assertLive !== "function" ||
      typeof handle.onExpire !== "function"
    ) {
      return Promise.reject(tErr("send handle"));
    }
    try {
      handle.assertLive("request deadline");
    } catch {
      return Promise.reject(tErr("request deadline"));
    }
    // Pending entry and expiry subscription are installed BEFORE any
    // validation or submission: a collector replying inside the
    // synchronous stdin.write always finds its waiter, a narrower
    // bound reaches the already-issued reply wait through the shared
    // handle, and a validation or admission failure unwinds
    // entry+subscription with no frame submitted and no stale waiter.
    // A validator rejection poisons the run's channels, so the wire
    // latches the same failure instead of surviving poisoned.
    return new Promise((resolve, reject) => {
      const p = {
        handle,
        resolve,
        reject,
        unsub: handle.onExpire(() => failOnce(tErr("reply deadline"))),
      };
      pending.set(requestId, p);
      try {
        enqueueFrame(type, fields, requestId, handle);
      } catch (e) {
        pending.delete(requestId);
        p.unsub();
        failOnce(e);
        reject(e);
      }
    });
  };

  // The no-ack write: same validated frame, no pending entry or wait;
  // a null handle means teardown never gates shutdown on a spent one.
  const sendNoAck = (type, fields, requestId) => {
    if (failed) throw tErr("transport failed");
    if (exited) throw tErr("collector exited");
    if (writeQueue.length >= MAX_PENDING_WRITES) {
      throw tErr("write queue");
    }
    enqueueFrame(type, fields, requestId, null);
    if (type === "shutdown") ended = true;
    return true;
  };

  // Budget errors map onto the wire's own IPC codes.
  const mapDeadline = (p, tag) =>
    p.catch((e) => {
      throw e.code === "ACCOUNTING_UNAVAILABLE" ? tErr(tag) : e;
    });

  // The ready wait shares the caller's handle: narrowing reaches it
  // and expiry rejects before any success can be claimed.
  const awaitReady = (handle) =>
    mapDeadline(
      pollHandle({
        handle,
        clock,
        pollMs: 5,
        boundMs: readyDeadlineMs,
        check: (done) => {
          if (readyMsg !== null) done.resolve(readyMsg);
          else if (exited) done.reject(tErr("exit before ready"));
          else if (failed) done.reject(tErr("fault before ready"));
        },
      }),
      "ready deadline",
    );

  const close = () => {
    ended = true;
    try {
      child.stdin.end();
    } catch {
      // A closed pipe is already terminal; exit settlement follows.
    }
  };

  // Bounded settlement of the actual child handle and pipes: the
  // caller's handle bounds the wait and a spent handle rejects rather
  // than fabricating a reap.
  const reap = (handle) =>
    mapDeadline(waitHandle(handle, reaped, "reap deadline"), "reap deadline");

  // The pure physical-settlement observer: returns the existing reaped
  // promise fulfilled only by the real exit plus BOTH real pipe closes.
  // It takes no handle, performs no IO and stays pending while physical
  // settlement is unproven — the receipt operations register with
  // retainActual before any bounded teardown wait.
  const whenReaped = () => reaped;

  return Object.freeze({
    send,
    sendNoAck,
    awaitReady,
    close,
    reap,
    whenReaped,
    get exited() {
      return exited;
    },
    get exitCode() {
      return exitCode;
    },
    get failed() {
      return failed;
    },
    get ended() {
      return ended;
    },
    // Last transport error, the recorded pipe-error facts and the
    // bounded stderr byte tail.
    get lastError() {
      if (
        lastError === null &&
        stdoutError === null &&
        stderrError === null &&
        stderrTail.length === 0
      ) {
        return null;
      }
      return {
        code: lastError ? lastError.code : null,
        message: lastError ? String(lastError.message) : null,
        stdoutError: stdoutError === null ? null : String(stdoutError.message),
        stderrError: stderrError === null ? null : String(stderrError.message),
        stderr: stderrTail.toString("utf8"),
      };
    },
    _onFrame: onFrame,
  });
}
