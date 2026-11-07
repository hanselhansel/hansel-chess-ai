import { privateFs as phaseFs } from "./private-fs.mjs";
// TEST-ONLY suite: real-filesystem regressions over the genuine
// Store, its lifetime owner and the parent completion-publication
// raw APIs. Covers the opaque prepared capability, owner-token and
// seal guards, a frozen-primary pre-capability fault whose held
// writer close still finishes real containment inside the Store,
// and the OwnedFile bounded two-attempt raw close on arbitrary
// first faults. Ordinary node:test/assert/fs/path plus the declared
// existing APIs only; no subprocess, Native, browser, model or
// network work and no fabricated status or close.

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { makeStore } from "./test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import {
  markPublicationSealed,
  prepareCompletionFile,
  publishCompletionFile,
  readPreparedCompletion,
  recoverPreparedCompletion,
  retainFailedCompletion,
} from "./completion-publication.mjs";
import { openActual, ownedFileCloseReceipt } from "./artifact-files.mjs";

// Neutral both-outcome observation: presence flags keep null and
// undefined as genuine outcomes and the raw error channel is never
// discarded through a bare .finally or truthiness check.
const observe = (promise) => {
  const state = {
    settled: false,
    fulfilled: false,
    rejected: false,
    hasValue: false,
    value: undefined,
    hasError: false,
    error: undefined,
  };
  promise.then(
    (value) => {
      state.settled = true;
      state.fulfilled = true;
      state.hasValue = true;
      state.value = value;
    },
    (error) => {
      state.settled = true;
      state.rejected = true;
      state.hasError = true;
      state.error = error;
    },
  );
  return state;
};

// Preregistered two-way gate: `enter` signals the actual invocation,
// `release` is ALWAYS invoked before any original body is joined.
const makeGate = () => {
  let enter;
  let release;
  const entered = new Promise((resolve) => {
    enter = resolve;
  });
  const released = new Promise((resolve) => {
    release = resolve;
  });
  return { entered, released, enter, release };
};

const rejectsCode = async (promise, code) => {
  await assert.rejects(
    promise,
    (error) => error instanceof Error && error.code === code,
  );
};

const expectENOENT = async (abs) => {
  await assert.rejects(fsp.lstat(abs), (e) => e.code === "ENOENT");
};

test("raw prepared capability stays opaque and owner-bound, publishes and restores the exact original temp", async (t) => {
  const { store, workspaceRoot } = await makeStore();
  const owner = artifactStoreLifetime(store);
  t.after(async () => {
    await owner.whenSettled();
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  });
  const io = Object.freeze({ retainActual: owner.retainActual });
  const ownerToken = Object.freeze({});
  const foreignToken = Object.freeze({});
  const phaseDirectory = "phase-alpha";
  const bytes = Buffer.from("completion-payload-alpha-é", "utf8");

  const prepared = await prepareCompletionFile({
    storeOwner: ownerToken,
    root: workspaceRoot,
    phaseDirectory,
    bytes,
    io,
  });
  assert.equal(typeof prepared, "object");
  assert.ok(Object.isFrozen(prepared));
  assert.deepEqual(Object.getOwnPropertyNames(prepared), []);
  assert.throws(() => {
    prepared.forged = true;
  }, TypeError);

  const read1 = await readPreparedCompletion(prepared);
  assert.ok(Object.isFrozen(read1));
  assert.deepEqual(
    [...Object.keys(read1)].sort(),
    [
      "bytes",
      "canonicalRef",
      "fileId",
      "io",
      "phaseDirectory",
      "temporaryRef",
      "workspaceRoot",
    ],
  );
  assert.equal(read1.workspaceRoot, path.resolve(workspaceRoot));
  assert.equal(read1.phaseDirectory, phaseDirectory);
  assert.equal(read1.io, io);
  assert.equal(typeof read1.fileId.dev, "bigint");
  assert.equal(typeof read1.fileId.ino, "bigint");
  assert.ok(Object.isFrozen(read1.canonicalRef));
  assert.ok(Object.isFrozen(read1.temporaryRef));
  assert.equal(read1.canonicalRef.path, `${phaseDirectory}/completion.json`);
  assert.equal(read1.canonicalRef.byteLength, bytes.length);
  assert.match(read1.canonicalRef.sha256, /^[0-9a-f]{64}$/);
  assert.equal(read1.temporaryRef.byteLength, bytes.length);
  assert.equal(read1.temporaryRef.sha256, read1.canonicalRef.sha256);
  assert.notEqual(read1.temporaryRef.path, read1.canonicalRef.path);
  assert.ok(read1.temporaryRef.path.startsWith(`${phaseDirectory}/`));
  assert.ok(Buffer.isBuffer(read1.bytes));
  assert.deepEqual(read1.bytes, bytes);

  const tempAbs = path.join(workspaceRoot, read1.temporaryRef.path);
  const canonicalAbs = path.join(workspaceRoot, read1.canonicalRef.path);
  const tempStat = await fsp.lstat(tempAbs, { bigint: true });
  assert.equal(tempStat.dev, read1.fileId.dev);
  assert.equal(tempStat.ino, read1.fileId.ino);
  assert.equal(tempStat.size, BigInt(bytes.length));
  assert.deepEqual(await fsp.readFile(tempAbs), bytes);
  await expectENOENT(canonicalAbs);

  for (const forged of [{}, { ...prepared }, new Proxy(prepared, {})]) {
    await rejectsCode(readPreparedCompletion(forged), "STORE_ARGS");
  }

  await rejectsCode(publishCompletionFile(prepared, foreignToken), "STORE_STATE");
  const read2 = await readPreparedCompletion(prepared);
  assert.deepEqual(read2.temporaryRef, read1.temporaryRef);
  assert.deepEqual(read2.bytes, bytes);

  await rejectsCode(
    prepareCompletionFile({
      storeOwner: ownerToken,
      root: workspaceRoot,
      phaseDirectory,
      bytes: Buffer.from("replacement-attempt"),
      io,
    }),
    "STORE_STATE",
  );
  assert.deepEqual(await fsp.readFile(tempAbs), bytes);

  assert.equal(recoverPreparedCompletion(ownerToken, phaseDirectory), prepared);
  assert.equal(recoverPreparedCompletion(ownerToken, "phase-never"), null);
  assert.throws(
    () => recoverPreparedCompletion(foreignToken, phaseDirectory),
    (e) => e instanceof Error && e.code === "STORE_ARGS",
  );

  const published = await publishCompletionFile(prepared, ownerToken);
  assert.ok(Object.isFrozen(published));
  assert.equal(published.path, read1.canonicalRef.path);
  assert.equal(published.byteLength, bytes.length);
  assert.equal(published.sha256, read1.canonicalRef.sha256);
  assert.deepEqual(await fsp.readFile(canonicalAbs), bytes);
  await expectENOENT(tempAbs);

  const retained = await retainFailedCompletion(
    prepared,
    ownerToken,
    new Error("post-publish unwind"),
  );
  assert.ok(Object.isFrozen(retained));
  assert.equal(retained.failedTemporaryPath, read1.temporaryRef.path);
  assert.deepEqual(retained.failedTemporaryRef, read1.temporaryRef);
  const restoredStat = await fsp.lstat(tempAbs, { bigint: true });
  assert.equal(restoredStat.dev, read1.fileId.dev);
  assert.equal(restoredStat.ino, read1.fileId.ino);
  assert.deepEqual(await fsp.readFile(tempAbs), bytes);
  await expectENOENT(canonicalAbs);
  assert.equal(
    await retainFailedCompletion(prepared, ownerToken, new Error("again")),
    retained,
  );
});

test("sealed raw publication forbids read, republish, containment and reseal while canonical bytes stay exact", async (t) => {
  const { store, workspaceRoot } = await makeStore();
  const owner = artifactStoreLifetime(store);
  t.after(async () => {
    await owner.whenSettled();
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  });
  const io = Object.freeze({ retainActual: owner.retainActual });
  const ownerToken = Object.freeze({});
  const phaseDirectory = "phase-seal";
  const bytes = Buffer.from("completion-payload-seal", "utf8");

  const prepared = await prepareCompletionFile({
    storeOwner: ownerToken,
    root: workspaceRoot,
    phaseDirectory,
    bytes,
    io,
  });
  const read1 = await readPreparedCompletion(prepared);
  await publishCompletionFile(prepared, ownerToken);
  markPublicationSealed(prepared, ownerToken);

  await rejectsCode(readPreparedCompletion(prepared), "STORE_STATE");
  await rejectsCode(publishCompletionFile(prepared, ownerToken), "STORE_STATE");
  await rejectsCode(
    retainFailedCompletion(prepared, ownerToken, new Error("late")),
    "STORE_STATE",
  );
  assert.throws(
    () => markPublicationSealed(prepared, ownerToken),
    (e) => e instanceof Error && e.code === "STORE_STATE",
  );

  const canonicalAbs = path.join(workspaceRoot, read1.canonicalRef.path);
  assert.deepEqual(await fsp.readFile(canonicalAbs), bytes);
  const stat = await fsp.lstat(canonicalAbs, { bigint: true });
  assert.equal(stat.dev, read1.fileId.dev);
  assert.equal(stat.ino, read1.fileId.ino);
});

test("store prepare with a frozen primary and a held real writer close still finishes containment on the actual temp", async (t) => {
  const { store, workspaceRoot } = await makeStore();
  const owner = artifactStoreLifetime(store);
  const gate = makeGate();
  const seen = {
    handle: null,
    tempAbs: null,
    realCloseRan: false,
    wrapped: false,
    restore: null,
  };
  let prepareResult = null;
  t.after(async () => {
    gate.release();
    if (prepareResult !== null) {
      await prepareResult.then(
        () => {},
        () => {},
      );
    }
    await owner.whenSettled();
    if (seen.handle !== null) {
      assert.ok(seen.realCloseRan);
      await assert.rejects(seen.handle.stat(), (e) => e.code === "EBADF");
    }
    if (seen.restore !== null) seen.restore();
    await fsp.rm(workspaceRoot, { recursive: true, force: true });
  });

  const phaseDirectory = "phase-fault";
  const bytes = Buffer.from("contained-fault-bytes-é", "utf8");
  const primary = Object.freeze(new Error("primary writer sync fault"));

  const originalOpen = phaseFs.open;
  const patchedOpen = async function patchedOpen(file, flags, mode) {
    const handle = await originalOpen.call(this, file, flags, mode);
    if (
      typeof file === "string" &&
      flags === "wx" &&
      /^\.completion\.json\.tmp-[0-9a-f]{12}$/.test(path.basename(file))
    ) {
      seen.wrapped = true;
      seen.tempAbs = file;
      seen.handle = handle;
      const realSync = handle.sync.bind(handle);
      const realClose = handle.close.bind(handle);
      let syncCalls = 0;
      handle.sync = async () => {
        syncCalls += 1;
        if (syncCalls === 1) throw primary;
        return realSync();
      };
      handle.close = async () => {
        gate.enter();
        await gate.released;
        seen.realCloseRan = true;
        return realClose();
      };
    }
    return handle;
  };
  seen.restore = () => {
    if (phaseFs.open === patchedOpen) phaseFs.open = originalOpen;
  };
  phaseFs.open = patchedOpen;

  prepareResult = store.prepareCompletion({ phaseDirectory, bytes });
  const prepareState = observe(prepareResult);

  await gate.entered;
  const zeroState = observe(owner.whenSettled());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prepareState.settled, false);
  assert.equal(zeroState.fulfilled, false);

  gate.release();
  await assert.rejects(prepareResult, (e) => e === primary);
  assert.equal(prepareState.rejected, true);
  assert.equal(prepareState.hasError, true);
  assert.equal(prepareState.error, primary);
  await owner.whenSettled();
  assert.equal(zeroState.fulfilled, true);

  assert.ok(Object.isFrozen(primary));
  assert.equal("preparedCompletion" in primary, false);
  assert.ok(seen.wrapped);
  assert.equal(typeof seen.tempAbs, "string");
  const retainedStat = await fsp.lstat(seen.tempAbs);
  assert.ok(retainedStat.isFile());
  assert.deepEqual(await fsp.readFile(seen.tempAbs), bytes);
  await expectENOENT(path.join(workspaceRoot, phaseDirectory, "completion.json"));

  await rejectsCode(
    store.writeOnce("post-fault/probe.bin", Buffer.from("probe"), "ordinary"),
    "STORE_IO",
  );
  await rejectsCode(
    store.prepareCompletion({ phaseDirectory: "phase-after", bytes }),
    "STORE_IO",
  );
});

test("openActual bounds raw closes to two attempts and retains arbitrary first faults after a real close", async (t) => {
  for (const fault of [null, undefined]) {
    const label = fault === null ? "null" : "undefined";
    await t.test(`first raw close rejects ${label}`, async (st) => {
      const { store, workspaceRoot } = await makeStore();
      const owner = artifactStoreLifetime(store);
      st.after(async () => {
        await owner.whenSettled();
        await fsp.rm(workspaceRoot, { recursive: true, force: true });
      });
      const dir = await fsp.mkdtemp(path.join(workspaceRoot, "open-actual-"));
      const filePath = path.join(dir, "target.bin");
      await fsp.writeFile(filePath, Buffer.from("open-actual-bytes"));

      let rawCloseCalls = 0;
      let rawHandle = null;
      const owned = await openActual(owner.retainActual, async () => {
        const handle = await phaseFs.open(filePath, "r");
        const realClose = handle.close.bind(handle);
        handle.close = async () => {
          rawCloseCalls += 1;
          if (rawCloseCalls === 1) throw fault;
          return realClose();
        };
        rawHandle = handle;
        return handle;
      });
      assert.ok(Object.isFrozen(owned));
      const receipt = ownedFileCloseReceipt(owned);

      const first = owned.close();
      const second = owned.close();
      assert.equal(first, second);
      await assert.rejects(first, (e) => e === fault);
      await assert.rejects(owned.close(), (e) => e === fault);
      assert.equal(rawCloseCalls, 2);
      await receipt;
      await owner.whenSettled();
      await assert.rejects(rawHandle.stat(), (e) => e.code === "EBADF");
    });
  }
});
