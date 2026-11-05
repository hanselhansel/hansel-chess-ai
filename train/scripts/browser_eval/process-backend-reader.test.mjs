// process-backend-reader.test.mjs: the bounded owned-reader physical
// ownership cases moved whole from process-backend.test.mjs plus the
// original observations — deferred receipts before stat/stream, a
// pending receipt after public timeout that only the REAL late close
// settles, cap/restat/raw-IO distinctions and the streamed binary
// digest through a buffer-REUSING fake — retaining the MUTABLE chunk
// references until EOF hashes the final mutated bytes (copies that
// preserve the original bytes can still pass; the separate scoped
// Buffer.concat observation on the binary leaf proves that path).
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { captureBackendIdentity } from "./process-backend.mjs";
import { createBackendReader } from "./process-backend-reader.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import {
  PYTHON_EXECUTABLE,
  PYTHON_PREFIX,
  PYTHON_VERSION,
} from "./schema-constants.mjs";
import {
  fakeClock,
  fakeBinStream,
  fakeFile as file,
  fakeFileSystem as boundFs,
} from "./supervision-test-fixtures.mjs";

const PY = PYTHON_EXECUTABLE;
const ROOT = "/record";
const PLIST = "/System/Library/CoreServices/SystemVersion.plist";
const acct = (p) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => assert.equal(e.code, "ACCOUNTING_UNAVAILABLE"),
  );
const flush = () => new Promise((r) => setImmediate(r));

const ready = () => ({
  platform: "darwin",
  arch: "arm64",
  abi: { bsdInfoSize: 136, taskInfoSize: 96 },
  python: {
    executable: PYTHON_EXECUTABLE,
    prefix: PYTHON_PREFIX,
    basePrefix: PYTHON_PREFIX,
    version: PYTHON_VERSION,
  },
});

const HELPERS = [
  `${ROOT}/process-macos.py`,
  `${ROOT}/process-macos-native.py`,
  `${ROOT}/process-macos-abi.py`,
];

const fullFs = () => ({
  [PLIST]: file(
    "<plist><key>ProductBuildVersion</key><string>25A123</string></plist>",
  ),
  [PY]: file("python-bytes"),
  [HELPERS[0]]: file("entry"),
  [HELPERS[1]]: file("core"),
  [HELPERS[2]]: file("abi"),
  "/usr/lib/libproc.dylib": file("libproc-bytes"),
  "/usr/sbin/lsof": file("lsof-bytes"),
});

const capture = (fs, extra = {}) =>
  captureBackendIdentity({
    ready: ready(),
    pythonExecutable: PY,
    helperPaths: HELPERS,
    recordRoot: ROOT,
    statFile: fs.statFile,
    createStream: fs.createStream,
    resolvePath: (p) => p,
    osRelease: () => "25.6.0",
    osVersion: () => "Darwin 25.6.0",
    ...extra,
  });

test("physical receipts register before IO and hold until real close", async () => {
  const clock = fakeClock();
  const files = fullFs();
  // The python stream is driven manually so its receipt can be
  // observed pending before the real close and fulfilled after it.
  files[PY].manual = true;
  const fs = boundFs(files);
  const receipts = [];
  const streams = {};
  const realStream = fs.createStream;
  fs.createStream = (abs) => (streams[abs] = realStream(abs));
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 90000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const p = capture(fs, {
    budget: handle,
    retainActual: (r) => {
      receipts.push(r);
      fs.calls.push("receipt");
    },
  });
  await flush();
  // Retention is recorded into the SAME order log as IO initiation:
  // the first call is always a receipt, and every stat/stream
  // immediately follows its own registration.
  assert.equal(fs.calls[0], "receipt");
  for (let i = 0; i < fs.calls.length; i += 1) {
    if (fs.calls[i].startsWith("stat") || fs.calls[i].startsWith("stream")) {
      assert.equal(fs.calls[i - 1], "receipt");
    }
  }
  const states = receipts.map(() => false);
  receipts.forEach((r, i) => r.then(() => (states[i] = true)));
  await flush();
  // The withheld stream keeps its own receipt genuinely pending while
  // every already-closed read has fulfilled.
  assert.ok(states.includes(false));
  const pyStream = streams[PY];
  for (const c of files[PY].chunks) pyStream.emitData(c);
  pyStream.emitEnd();
  await flush();
  assert.ok(states.includes(false)); // end alone is never fulfillment
  pyStream.emitClose();
  await p;
  await flush();
  assert.ok(states.every(Boolean));
});

test("an end without the real close leaves the read unproven", async () => {
  const clock = fakeClock();
  const files = fullFs();
  files[PLIST].noClose = true; // data and end arrive; close never does
  const fs = boundFs(files);
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 100,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const p = capture(fs, { budget: handle, retainActual: () => {} });
  // Rejection observation is attached BEFORE the horizon lapses.
  const observed = acct(p);
  await flush();
  // destroy() was invoked by the read decision, yet the close never
  // arrived: the capture rejects only when the ORIGINAL horizon lapses.
  clock.advance(100);
  await observed;
});

test("named listeners release exactly at the observed close", async () => {
  const files = fullFs();
  const fs = boundFs(files);
  let plist;
  const realStream = fs.createStream;
  fs.createStream = (abs) => {
    const s = realStream(abs);
    if (abs === PLIST) plist = s;
    return s;
  };
  await capture(fs);
  assert.equal(plist.listenerCount("data"), 0);
  assert.equal(plist.listenerCount("end"), 0);
  assert.equal(plist.listenerCount("error"), 0);
  assert.equal(plist.listenerCount("close"), 0);
});

test("binary payloads stream to hash with no whole-buffer fact", async () => {
  const files = fullFs();
  const py = Buffer.alloc(4096, 0x70);
  files[PY] = file(py, {
    chunks: [py.subarray(0, 1000), py.subarray(1000, 3000), py.subarray(3000)],
  });
  const id = await capture(boundFs(files));
  assert.equal(
    id.python.sha256,
    createHash("sha256").update(py).digest("hex"),
  );
  assert.equal(id.python.version, PYTHON_VERSION);
});

test("the digest is the ORIGINAL ordered bytes, not a retained join", async () => {
  const files = fullFs();
  // The fake reuses ONE chunk buffer: each data callback hands the
  // reader the same storage, overwritten with the next chunk. A
  // digest retaining those MUTABLE chunk references until EOF gets
  // the FINAL mutated bytes; only rolling updates over the original
  // ordered bytes match. Copies taken before mutation could still
  // preserve the originals — that distinction belongs to the separate
  // scoped Buffer.concat observation on the readFact leaf.
  const chunks = [
    Buffer.alloc(997, 0x61),
    Buffer.alloc(1401, 0x62),
    Buffer.alloc(300, 0x63),
  ];
  const expected = createHash("sha256")
    .update(chunks[0])
    .update(chunks[1])
    .update(chunks[2])
    .digest("hex");
  const bin = fakeBinStream(chunks);
  files[PY] = file(chunks[0], { statSize: 2698, manual: true });
  const fs = boundFs(files);
  const realStream = fs.createStream;
  fs.createStream = (abs) => (abs === PY ? bin : realStream(abs));
  const p = capture(fs);
  await flush();
  bin.drive(); // emits each chunk through the SAME reused buffer
  const id = await p;
  assert.equal(id.python.sha256, expected);
  // BackendIdentity stays closed: it carries the digest, never a
  // byteLength field. The meaningful byte count is observed on the
  // actual binary leaf below.
});

test("the binary leaf counts bytes and never whole-concatenates", async () => {
  const chunks = [
    Buffer.alloc(997, 0x61),
    Buffer.alloc(1401, 0x62),
    Buffer.alloc(300, 0x63),
  ];
  const expected = createHash("sha256")
    .update(chunks[0])
    .update(chunks[1])
    .update(chunks[2])
    .digest("hex");
  const clock = fakeClock();
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 90000,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const bin = fakeBinStream(chunks);
  const files = { [PY]: file("x", { statSize: 2698, manual: true }) };
  const fs = boundFs(files);
  const realStream = fs.createStream;
  fs.createStream = (abs) => (abs === PY ? bin : realStream(abs));
  const receipts = [];
  const reader = createBackendReader({
    handle,
    retainActual: (r) => receipts.push(r),
    statFile: fs.statFile,
    createStream: fs.createStream,
  });
  // Scoped observation on THIS binary-only call: Buffer.concat is
  // wrapped only inside try/finally — no heap claim, no source hook.
  const origConcat = Buffer.concat;
  let concatCalls = 0;
  Buffer.concat = (...a) => {
    concatCalls += 1;
    return origConcat(...a);
  };
  let fact;
  try {
    const p = reader.readFact(PY, 1 << 20, "python", true);
    await flush();
    bin.drive();
    fact = await p;
  } finally {
    Buffer.concat = origConcat;
  }
  assert.equal(concatCalls, 0);
  assert.equal(fact.byteLength, 2698);
  assert.equal(fact.sha256, expected);
});

test("mid-read overflow rejects while the cap is crossed", async () => {
  const files = fullFs();
  // stat admits 10 bytes but the stream then delivers over the 1 MiB
  // helper text cap: the mid-read bound must fire, not a stat error.
  const big = Buffer.alloc(1024 * 1024 + 1, 0x78);
  files[HELPERS[0]] = {
    content: big,
    statSize: 10,
    chunks: [big],
  };
  await acct(capture(boundFs(files)));
});

test("a mid-stream IO error surfaces its own code, never as evidence", async () => {
  const files = fullFs();
  const eio = new Error("mid read");
  eio.code = "EIO";
  eio.after = 1;
  files[HELPERS[1]] = file("core", { streamError: eio });
  await assert.rejects(capture(boundFs(files)), (e) => e.code === "EIO");
});

test("pre/post stat instability fails closed", async () => {
  const files = fullFs();
  const fs = boundFs(files);
  let n = 0;
  const real = fs.statFile;
  fs.statFile = async (abs) => {
    const st = await real(abs);
    if (abs === HELPERS[0]) {
      n += 1;
      if (n === 2) return { ...st, mtimeMs: st.mtimeMs + 1 };
    }
    return st;
  };
  await acct(capture(fs));
});

test("a spent entry horizon performs no stat, stream or hash IO", async () => {
  const clock = fakeClock();
  const fs = boundFs(fullFs());
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 5,
    clock,
    nowMonoMs: clock.nowMs,
  });
  clock.advance(10);
  await acct(capture(fs, { budget: handle, retainActual: () => {} }));
  assert.equal(fs.calls.length, 0);
});

test("size over the stat gate cap fails before any read", async () => {
  const files = fullFs();
  const big = Buffer.alloc(1024 * 1024 + 1, 0x68);
  files[HELPERS[1]] = file(big);
  const fs = boundFs(files);
  await acct(capture(fs));
  const opened = fs.calls.filter(
    (c) => c.startsWith("stream") && c.includes(HELPERS[1]),
  );
  assert.equal(opened.length, 0);
});

test("a post-timeout pending receipt settles only at the REAL late close", async () => {
  const clock = fakeClock();
  const files = fullFs();
  // A stream that never ends or closes: the public capture times out
  // while the physical receipt — and its named listeners — remain
  // genuinely held; only the later REAL close fulfills it.
  files[HELPERS[2]] = file("abi", { noEnd: true, noClose: true });
  const fs = boundFs(files);
  const streams = {};
  const realStream = fs.createStream;
  fs.createStream = (abs) => (streams[abs] = realStream(abs));
  const receipts = [];
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 50,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const p = capture(fs, {
    budget: handle,
    retainActual: (r) => receipts.push(r),
  });
  const observed = acct(p);
  await flush();
  const abiStream = streams[HELPERS[2]];
  clock.advance(60); // public rejection lands while debt is held
  await observed;
  // Named listeners stay attached and the open stream's receipt stays
  // pending after the public failure — neither rejection nor timeout
  // settles it; every already-closed read has fulfilled.
  const states = receipts.map(() => false);
  receipts.forEach((r, i) => r.then(() => (states[i] = true)));
  await flush();
  assert.ok(states.includes(false));
  assert.ok(abiStream.listenerCount("close") > 0);
  // The REAL late close — not end, destroy() or the public path —
  // finally fulfills the physical receipt and releases the listeners.
  abiStream.emitEnd();
  abiStream.emitClose();
  await flush();
  assert.ok(states.every(Boolean));
  assert.equal(abiStream.listenerCount("close"), 0);
});
