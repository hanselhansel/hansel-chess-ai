import test from "node:test";
import assert from "node:assert/strict";
import fs, { promises as setup } from "node:fs";
import os from "node:os";
import path from "node:path";
import { privateFs, createPrivateReadStream } from "./private-fs.mjs";
import { openActual, ownedFileCloseReceipt } from "./artifact-files.mjs";

const turn = () => new Promise((resolve) => setImmediate(resolve));
const fixture = async (t) => {
  const root = await setup.mkdtemp(path.join(os.tmpdir(), "private-fs-unit-"));
  t.after(() => setup.rm(root, { recursive: true, force: true }));
  return path.join(root, "data");
};
const rejectsSame = (promise, error) =>
  promise.then(
    () => assert.fail("required failure"),
    (actual) => assert.equal(actual, error),
  );

test("actual sync metadata executes now; completed outcome yields a real IO turn", async (t) => {
  const file = await fixture(t);
  await setup.writeFile(file, "data");
  const original = fs.lstatSync;
  let issued = 0,
    delivered = false,
    microtask = false;
  fs.lstatSync = (...args) => {
    issued++;
    return original(...args);
  };
  try {
    const pending = privateFs.lstat(file).then((value) => {
      delivered = true;
      return value;
    });
    assert.equal(issued, 1);
    assert.equal(delivered, false);
    await Promise.resolve().then(() => {
      microtask = true;
    });
    assert.equal(delivered, false);
    assert.equal((await pending).size, 4);
    assert.equal(microtask, true);
  } finally {
    fs.lstatSync = original;
  }
});

test("sync primitive errors remain asynchronous and preserve arbitrary first value", async () => {
  const original = fs.lstatSync;
  for (const error of [null, undefined, new Error("actual raw failure")]) {
    fs.lstatSync = () => {
      throw error;
    };
    try {
      await rejectsSame(privateFs.lstat("/controlled"), error);
    } finally {
      fs.lstatSync = original;
    }
  }
});

test("real FD methods preserve reads, bigint identity, sync and idempotent physical close", async (t) => {
  const file = await fixture(t);
  const handle = await privateFs.open(file, "w+");
  const bytes = Buffer.from("real file bytes");
  assert.equal((await handle.write(bytes, 0, bytes.length, 0)).bytesWritten, bytes.length);
  await handle.sync();
  assert.equal((await handle.stat({ bigint: true })).size, BigInt(bytes.length));
  const read = Buffer.alloc(bytes.length);
  assert.equal((await handle.read(read, 0, read.length, 0)).bytesRead, read.length);
  assert.deepEqual(read, bytes);
  await handle.close();
  await handle.close();
  await assert.rejects(handle.stat(), { code: "EBADF" });
});

test("ambiguous close cannot close a recycled FD; original OwnedFile debt remains unknown", async (t) => {
  const file = await fixture(t);
  const receipts = [];
  const owned = await openActual(
    (p) => receipts.push(p),
    () => privateFs.open(file, "w+"),
  );
  const originalClose = fs.closeSync;
  const error = new Error("close physically landed but result ambiguous");
  let calls = 0,
    reused = null;
  fs.closeSync = (fd) => {
    calls++;
    originalClose(fd);
    reused = fs.openSync(file + ".other", "w+");
    assert.equal(reused, fd, "fresh synchronous allocation reuses the freed descriptor");
    throw error;
  };
  let physical = false;
  ownedFileCloseReceipt(owned).then(() => {
    physical = true;
  });
  const closing = owned.close();
  closing.catch(() => {});
  try {
    await turn();
    await turn();
    await turn();
    assert.equal(calls, 1);
    assert.equal(physical, false);
    assert.equal(fs.fstatSync(reused).isFile(), true);
    assert.equal(owned.close(), closing);
    await rejectsSame(owned.read(Buffer.alloc(1), 0, 1, 0), error);
  } finally {
    fs.closeSync = originalClose;
    if (reused !== null) originalClose(reused);
  }
});

test("cold stream delivers bounded chunks fairly and reports actual close", async (t) => {
  const file = await fixture(t);
  await setup.writeFile(file, Buffer.alloc(150000, 7));
  const stream = createPrivateReadStream(file);
  let total = 0,
    chunks = 0,
    closed = false,
    deliveredTurn = true;
  const physical = new Promise((resolve) =>
    stream.once("close", () => {
      closed = true;
      resolve();
    }),
  );
  assert.equal(closed, false);
  stream.on("data", (chunk) => {
    assert.equal(deliveredTurn, true, "each bounded chunk yields a real IO turn");
    deliveredTurn = false;
    setImmediate(() => {
      deliveredTurn = true;
    });
    assert.ok(chunk.length <= 65536);
    total += chunk.length;
    chunks++;
  });
  await physical;
  assert.equal(total, 150000);
  assert.ok(chunks >= 3);
  assert.equal(stream.closed, true);
  assert.equal(stream.fd, null);
});

test("late stream guard blocks later reads and data while mandatory real close remains", async (t) => {
  const file = await fixture(t);
  await setup.writeFile(file, Buffer.alloc(150000));
  let live = true,
    chunks = 0;
  const error = new Error("original borrowed horizon spent");
  const stream = createPrivateReadStream(file, {
    assertEffectLive: () => {
      if (!live) throw error;
    },
  });
  let first;
  stream.on("error", (e) => {
    first ??= e;
  });
  const closed = new Promise((resolve) => stream.once("close", resolve));
  stream.on("data", () => {
    chunks++;
    live = false;
  });
  await closed;
  await turn();
  assert.equal(chunks, 1);
  assert.equal(first, error);
  assert.equal(stream.closed, true);
});

test("logical destruction after close error is never physical closed state/event", async (t) => {
  const file = await fixture(t);
  await setup.writeFile(file, "stream data");
  const originalClose = fs.closeSync;
  const first = new Error("actual close result unavailable");
  let fd = null,
    calls = 0,
    closes = 0;
  fs.closeSync = (value) => {
    fd = value;
    calls++;
    throw first;
  };
  const stream = createPrivateReadStream(file);
  stream.on("close", () => {
    closes++;
  });
  const failed = new Promise((resolve) => stream.once("error", resolve));
  stream.resume();
  try {
    assert.equal(await failed, first);
    await turn();
    assert.equal(stream.destroyed, true);
    assert.equal(stream.closed, false, "logical Readable close is not FD close proof");
    assert.equal(closes, 0);
    assert.equal(calls, 1);
    assert.equal(fs.fstatSync(fd).isFile(), true);
  } finally {
    fs.closeSync = originalClose;
    if (fd !== null) originalClose(fd);
  }
});

test("arbitrary issued stream-open faults remain original and never prove close", async () => {
  const original = fs.openSync;
  for (const first of [null, undefined, new Error("issued open unknown")]) {
    fs.openSync = () => {
      throw first;
    };
    const stream = createPrivateReadStream("/controlled");
    let closes = 0;
    stream.on("close", () => {
      closes++;
    });
    const failed = new Promise((resolve) => stream.once("error", resolve));
    try {
      stream.resume();
      assert.equal(await failed, first);
      await turn();
      assert.equal(stream.destroyed, true);
      assert.equal(stream.closed, false);
      assert.equal(closes, 0);
    } finally {
      fs.openSync = original;
    }
  }
});
