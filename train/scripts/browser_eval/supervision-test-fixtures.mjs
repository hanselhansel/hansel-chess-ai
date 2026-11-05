// supervision-test-fixtures.mjs (TEST-ONLY): shared builders imported
// only by the process-budget/process-transport/process-backend/
// processes/process-lsof/supervisor-protocol-native suites. It provides
// a fully driven fake of the shared hrtime clock, EventEmitter-shaped
// fakes of ChildProcess/stdin/stdout/stderr/fd-3, one REAL
// createProtocolValidator bound to a scripted fake collector, and
// literal tuple/row/envelope builders matching the closed wire shapes.
// It performs no process, browser, model, libproc, lsof or network
// work, holds no production state, never mutates production modules,
// and is excluded from the functional-runtime input union and
// BackendIdentity.helpers. Temporary files its consumers create are
// removed in finally. A synthetic fixture pass is never an actual
// phase or cleanup pass.
import { EventEmitter } from "node:events";

import { createProtocolValidator } from "./supervisor-protocol.mjs";

// One closed ProcessIdentity: pid, canonical u64 start seconds and
// integer microseconds.
export const identity = (pid, startSec = "1000", startUsec = 0) =>
  Object.freeze({ pid, startSec, startUsec });

export const identityKeyOf = (i) => `${i.pid}:${i.startSec}:${i.startUsec}`;

// One closed BSD row: exact identity/ppid/pgid/uid fields.
export const bsdRow = (
  pid,
  ppid = 1,
  pgid = pid,
  uid = 501,
  startSec = "1000",
  startUsec = 0,
) =>
  Object.freeze({
    identity: identity(pid, startSec, startUsec),
    ppid,
    pgid,
    uid,
  });

// One canonical JSON line exactly as it crosses a wire.
export const frame = (msg) => `${JSON.stringify(msg)}\n`;

// A valid c2s process-samples reply covering a sample request's exact
// partition: samples+gone must equal the request's owned set, inspected
// rows the request's inspectPids and probes its probes. Callers
// override rows through the `script` maps keyed by pid or identityKey.
export const sampleReply = ({
  requestId,
  owned = [],
  inspectPids = [],
  probes = [],
  discovered = [],
  script = {},
}) => ({
  type: "process-samples",
  requestId,
  startedAtMonoNs: "1",
  finishedAtMonoNs: "2",
  discovered,
  samples: owned.map(
    (i) =>
      script.samples?.[identityKeyOf(i)] ?? {
        identity: i,
        ppid: 1,
        pgid: i.pid,
        uid: 501,
        residentBytes: script.rss ?? 1024,
      },
  ),
  gone: (script.gone ?? []).map(
    (i) => owned.find((o) => identityKeyOf(o) === identityKeyOf(i)) ?? i,
  ),
  inspected: inspectPids.map(
    (p) =>
      script.inspected?.[p] ?? {
        pid: p,
        state: "live",
        process: bsdRow(p, 1, p),
        executable: script.executable ?? "/bin/echo",
      },
  ),
  probes: probes.map((i) => ({
    identity: i,
    state: script.probes?.[identityKeyOf(i)] ?? "same-live",
  })),
});

// A fully driven fake of the shared hrtime clock: timers and intervals
// fire only when the test advances time or runs due work, so deadline,
// losing-timer and ordering assertions are exact. nowMonoNs returns
// the decimal-string ns the production adapters consume.
export function fakeClock({ startNs = 1_000_000_000n } = {}) {
  let now = BigInt(startNs);
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  const setTimeout = (fn, ms) => {
    const id = nextId++;
    timeouts.set(id, {
      due: now + BigInt(Math.max(0, Math.floor(ms))) * 1_000_000n,
      fn,
    });
    return id;
  };
  const clearTimeout = (id) => timeouts.delete(id);
  const setInterval = (fn, ms) => {
    const id = nextId++;
    intervals.set(id, fn);
    return id;
  };
  const clearInterval = (id) => intervals.delete(id);
  const runDue = () => {
    const due = [...timeouts.entries()]
      .filter(([, t]) => t.due <= now)
      .sort((a, b) => (a[1].due < b[1].due ? -1 : 1));
    for (const [id, t] of due) {
      timeouts.delete(id);
      t.fn();
    }
    // Each live interval fires once per due pass; a poll or tick that
    // needs more cycles advances again.
    for (const fn of intervals.values()) fn();
  };
  const advance = (ms) => {
    now += BigInt(Math.max(0, Math.floor(ms))) * 1_000_000n;
    runDue();
  };
  // Move only the monotonic clock past a bound WITHOUT running the due
  // callbacks: the actual-clock gate (assertLive/narrowing) observes an
  // expired horizon while a delayed timeout callback still sits armed —
  // the two are asserted separately, then runDue drains the timers.
  const jumpWithoutTimers = (ms) => {
    now += BigInt(Math.max(0, Math.floor(ms))) * 1_000_000n;
  };
  return {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    nowMonoNs: () => now.toString(),
    nowMs: () => Number(now / 1_000_000n),
    advance,
    runDue,
    jumpWithoutTimers,
    pendingTimeouts: () => timeouts.size,
    liveIntervals: () => intervals.size,
  };
}

// One in-memory file entry moved whole from the backend suite:
// content, emitted chunks and optional statSize/statError/
// streamError/noEnd/noClose/manual overrides.
export function fakeFile(content, extra = {}) {
  return {
    content: Buffer.isBuffer(content) ? content : Buffer.from(content),
    chunks: extra.chunks ?? [
      Buffer.isBuffer(content) ? content : Buffer.from(content),
    ],
    ...extra,
  };
}

// A deterministic fake filesystem moved whole: calls records every
// stat/stream initiation in order. A scripted statError throws its
// OWN coded error — a fake permission/read failure stays distinct
// from genuine ENOENT. `streamError.after` fails mid-stream.
export function fakeFileSystem(files) {
  const fs = { calls: [] };
  fs.statFile = async (abs) => {
    fs.calls.push(`stat ${abs}`);
    const f = files[abs];
    if (f === undefined) {
      const e = new Error("missing");
      e.code = "ENOENT";
      throw e;
    }
    if (f.statError) throw f.statError;
    return {
      isFile: () => true,
      size: f.statSize ?? f.content.length,
      dev: 1,
      ino: 7,
      mtimeMs: 42,
    };
  };
  fs.createStream = (abs) => {
    fs.calls.push(`stream ${abs}`);
    const f = files[abs];
    const s = fakePipe();
    if (f === undefined) {
      const e = new Error("stream missing");
      e.code = "ENOENT";
      throw e;
    }
    if (f.streamError && !f.streamError.after) throw f.streamError;
    if (!f.manual) {
      queueMicrotask(() => {
        let sent = 0;
        for (const c of f.chunks) {
          s.emitData(c);
          sent += 1;
          if (f.streamError && f.streamError.after === sent) {
            s.emit("error", f.streamError);
            if (!f.noClose) s.emitClose();
            return;
          }
        }
        if (!f.noEnd) s.emitEnd();
        if (!f.noClose) s.emitClose();
      });
    }
    return s;
  };
  return fs;
}

// A binary read fake that REUSES one chunk buffer: after each data
// callback the same storage is overwritten with the next chunk, so a
// digest retaining the MUTABLE chunk references until EOF hashes the
// final mutated bytes — only a rolling update over the ORIGINAL
// ordered bytes matches. Copies preserving the originals could still
// pass; the no-whole-concat observation lives in the reader test's
// scoped Buffer.concat wrapper on the binary leaf.
export function fakeBinStream(chunks) {
  const s = fakePipe();
  const store = Buffer.alloc(Math.max(...chunks.map((c) => c.length)));
  s.drive = () => {
    for (const c of chunks) {
      c.copy(store, 0);
      s.emitData(store.subarray(0, c.length));
    }
    s.emitEnd();
    s.emitClose();
  };
  return s;
}

// An EventEmitter-shaped pipe: stdin/fd-3 writable semantics
// (write/end/drain/destroy observable) and stdout/stderr readable
// semantics (data/end/error/close and listener counts observable).
// It emits only what the test drives; destroy() marks the pipe but
// never fabricates a close event.
export function fakePipe() {
  const p = new EventEmitter();
  p.writes = [];
  p.ended = false;
  p.destroyed = false;
  p.writeResult = true;
  p.write = (chunk, cb) => {
    p.writes.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    if (typeof cb === "function") cb();
    return p.writeResult;
  };
  p.end = (chunk, cb) => {
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = undefined;
    }
    if (chunk !== undefined) p.write(chunk);
    p.ended = true;
    p.emit("finish");
    if (typeof cb === "function") cb();
    return p;
  };
  p.destroy = () => {
    p.destroyed = true;
    return p;
  };
  p.emitData = (d) => p.emit("data", Buffer.isBuffer(d) ? d : Buffer.from(d));
  p.emitEnd = () => p.emit("end");
  p.emitClose = () => p.emit("close");
  return p;
}

// A referenced fake ChildProcess: pid, stdin/stdout/stderr pipes and a
// private fd-3 pipe for the exec gate. kill() is a trap: the suites
// must never reach a raw signal path.
export function fakeChild({ pid = 4242 } = {}) {
  const c = new EventEmitter();
  c.pid = pid;
  c.stdin = fakePipe();
  c.stdout = fakePipe();
  c.stderr = fakePipe();
  c.fd3 = fakePipe();
  c.stdio = [c.stdin, c.stdout, c.stderr, c.fd3];
  c.emitOut = (d) => c.stdout.emitData(d);
  c.emitErr = (d) => c.stderr.emitData(d);
  c.exit = (code = 0) => c.emit("exit", code);
  c.kill = () => {
    throw new Error("raw kill must never be called");
  };
  return c;
}

// A returned-but-failed spawn: the ChildProcess exists but carries NO
// pid, and its truthful events are an error plus real pipe closes —
// never an invented successful PID or a fabricated exit receipt.
// `fail(e)` drives exactly those facts; exit stays absent unless the
// test itself models a later genuine exit.
export function fakeFailedSpawnChild() {
  const c = fakeChild({ pid: null });
  c.fail = (e) => {
    c.emit("error", e ?? new Error("spawn failed"));
    c.stdout.emitClose();
    c.stderr.emitClose();
  };
  return c;
}

// One fake collector child bound to a REAL createProtocolValidator:
// the transport validates every outbound s2c frame and every scripted
// c2s reply through the same closed validator, so envelopes, requestId
// bindings, seq order and poison semantics exercise the real contract.
// A deliberate duplicate poisons only this fixture's validator.
export function collectorFixture({ runId = "R1", pid = 31337, script = {} } = {}) {
  const protocol = createProtocolValidator({ runId });
  const child = fakeChild({ pid });
  let c2sSeq = 0;
  const written = [];
  const emit = (msg) => {
    child.emitOut(
      frame({ ipcVersion: 1, runId, seq: c2sSeq++, requestId: null, ...msg }),
    );
  };
  const api = {
    child,
    protocol,
    written,
    emit,
    // The startup ready envelope: real abi/python field set with the
    // declared collector/supervisor tuples.
    ready({ python = {}, supervisor = identity(1), collector } = {}) {
      emit({
        type: "ready",
        stage: "startup",
        requestId: null,
        collector: collector ?? identity(pid),
        supervisor,
        platform: "darwin",
        arch: "arm64",
        abi: { bsdInfoSize: 136, taskInfoSize: 96 },
        python: {
          executable: "/py",
          prefix: "/v",
          basePrefix: "/b",
          version: "3.11.14",
          ...python,
        },
        libprocPath: "/usr/lib/libproc.dylib",
      });
    },
    // Real exit plus BOTH pipe closes, exactly as production requires.
    exit(code = 0) {
      child.exit(code);
      child.stdout.emitClose();
      child.stderr.emitClose();
    },
  };
  child.stdin.write = (chunk, cb) => {
    child.stdin.writes.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
    );
    const msg = JSON.parse(String(chunk).trim());
    written.push(msg);
    if (msg.type === "own-roots") {
      emit({ type: "ready", stage: "roots-accepted", requestId: msg.requestId });
    } else if (msg.type === "sample") {
      // script.muteSample withholds the reply entirely: the send stays
      // genuinely pending until the test drives the real reply itself.
      if (script.muteSample !== true) {
        emit(
          sampleReply({
            requestId: msg.requestId,
            owned: msg.owned,
            inspectPids: msg.inspectPids,
            probes: msg.probes,
            discovered: script.discovered ?? [],
            script,
          }),
        );
      }
    } else if (msg.type === "signal") {
      emit({
        type: "signal-result",
        requestId: msg.requestId,
        identity: msg.identity,
        signal: msg.signal,
        outcome: script.outcome ?? "sent",
      });
    } else if (msg.type === "shutdown") {
      api.exit(0);
    }
    if (typeof script.onSend === "function") script.onSend(msg, api);
    if (typeof cb === "function") cb();
    return true;
  };
  return api;
}
