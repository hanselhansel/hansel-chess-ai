import { privateFs as phaseFs } from "./private-fs.mjs";
// Path/symlink confinement, logical-versus-allocated bytes, cumulative
// reserve/pending-concurrent admission, stale/unavailable accounting,
// atomic write/fsync/rename order and phase sealing, all on temporary
// workspaces with injected footprint/clock controls. These are unit
// receipts only: no real phase accounting is performed here.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { sha256Bytes } from "./canonical-json.mjs";
import {
  artifactStoreLifetime,
  createArtifactStore,
  inspectArtifactRef,
  phaseArtifactRefs,
} from "./artifact-store.mjs";
import { assertRejectCode as code, makeStore, makeTmpDir, ref } from "./test-fixtures.mjs";

test("writeOnce publishes canonical bytes and a logical-byte ref", async () => {
  const { store, workspaceRoot } = await makeStore();
  const bytes = Buffer.from("hello world");
  const out = await store.writeOnce("a/b.txt", bytes, "ordinary");
  assert.deepEqual(out, {
    path: "a/b.txt",
    byteLength: 11,
    sha256: sha256Bytes(bytes),
  });
  assert.deepEqual(await fsp.readFile(path.join(workspaceRoot, "a/b.txt")), bytes);
});

test("writeOnce rejects escapes, dot segments, backslashes and NUL", async () => {
  const { store } = await makeStore();
  for (const p of ["/abs", "../x", "a/../b", "a\\b", "a//b", "a/.", "", `a\0b`, "a/"]) {
    await code(store.writeOnce(p, Buffer.from("x"), "ordinary"), "STORE_PATH");
  }
});

test("writeOnce rejects an existing path, immutability and a sealed dir", async () => {
  const { store } = await makeStore();
  await store.writeOnce("d/f", Buffer.from("1"), "ordinary");
  await code(store.writeOnce("d/f", Buffer.from("2"), "ordinary"), "STORE_STATE");
  await store.sealPhase("d");
  await code(store.writeOnce("d/g", Buffer.from("3"), "ordinary"), "STORE_SEALED");
});

test("symlink components between root and target are rejected", async () => {
  const { store, workspaceRoot } = await makeStore();
  const outside = path.join(workspaceRoot, "..", "outside-target");
  await fsp.writeFile(outside, "x");
  await fsp.mkdir(path.join(workspaceRoot, "sub"));
  await fsp.symlink(outside, path.join(workspaceRoot, "sub", "link"));
  await code(store.writeOnce("sub/link", Buffer.from("x"), "ordinary"), "STORE_PATH");
});

test("reservations account pending concurrent bytes before admission", async () => {
  const { store, ctl } = await makeStore();
  // Twelve bytes of ordinary room: committed and pending bytes share it.
  ctl.chargedBytes = 266338304 - 12;
  await store.writeOnce("b", Buffer.alloc(4), "ordinary");
  const s1 = await store.openArtifact({ artifactId: "s1", path: "c", mode: "append", lane: "ordinary" });
  const s2 = await store.openArtifact({ artifactId: "s2", path: "d", mode: "append", lane: "ordinary" });
  try {
    // Two independent streams reserve through the same pending pool.
    await Promise.all([s1.append(Buffer.alloc(4)), s2.append(Buffer.alloc(4))]);
    // No room remains for any caller until held reservations drain.
    await code(store.writeOnce("e", Buffer.alloc(1), "ordinary"), "STORE_CAPACITY");
    await code(s1.append(Buffer.alloc(1)), "STORE_CAPACITY");
  } finally {
    await s1.close();
    await s2.close();
  }
});

test("final lane draws only from the final reserve", async () => {
  const { store, ctl } = await makeStore();
  ctl.chargedBytes = 268435450;
  await code(store.writeOnce("x", Buffer.alloc(8), "final"), "STORE_CAPACITY");
  const sink = await store.openArtifact({ artifactId: "f1", path: "y", mode: "append", lane: "final" });
  ctl.chargedBytes = 0;
  await sink.append(Buffer.alloc(2097150));
  ctl.chargedBytes = 2097150;
  await code(sink.append(Buffer.alloc(10)), "STORE_CAPACITY");
  await sink.close();
});

test("footprint sample that throws or goes stale poisons accounting", async () => {
  const { store, ctl } = await makeStore();
  ctl.accountingValid = false;
  await code(store.writeOnce("a", Buffer.alloc(1), "ordinary"), "STORE_ACCOUNTING");
  await code(store.writeOnce("b", Buffer.alloc(1), "ordinary"), "STORE_ACCOUNTING");
  const env = await makeStore();
  env.ctl.observedAtMs = -5000;
  await code(env.store.writeOnce("a", Buffer.alloc(1), "ordinary"), "STORE_ACCOUNTING");
});

test("unobserved write growth is kept until scan-start coverage is proven", async () => {
  const { store, ctl } = await makeStore();
  const cap = 266338304;
  ctl.chargedBytes = cap - 10;
  ctl.now = 100;
  await store.writeOnce("a", Buffer.alloc(8), "ordinary"); // commits at ms100
  // The same scan start covers nothing: the 8 bytes stay charged, 2 remain.
  await code(store.writeOnce("b", Buffer.alloc(4), "ordinary"), "STORE_CAPACITY");
  await store.writeOnce("b", Buffer.alloc(2), "ordinary"); // commits at ms100
  // A delayed sample whose scan started at ms1 still predates the ms100
  // commits: advancing the timestamp alone cannot retire the deltas.
  ctl.observedAtMs = 1;
  await code(store.writeOnce("d", Buffer.alloc(4), "ordinary"), "STORE_CAPACITY");
  await code(store.writeOnce("d", Buffer.alloc(2), "ordinary"), "STORE_CAPACITY");
  // A scan that started at ms101 genuinely covers every ms100 commit; the
  // deltas fold into the sample instead of double-counting.
  ctl.observedAtMs = 101;
  ctl.now = 101;
  ctl.chargedBytes = cap - 10 + 10;
  await store.writeOnce("e", Buffer.alloc(0), "ordinary");
  await code(store.writeOnce("f", Buffer.alloc(1), "ordinary"), "STORE_CAPACITY");
});

test("a regressing still-fresh scan start is sticky unavailable accounting", async () => {
  const { store, ctl } = await makeStore();
  const cap = 266338304;
  ctl.chargedBytes = cap - 4;
  ctl.now = 100;
  ctl.observedAtMs = 100;
  await store.writeOnce("a", Buffer.alloc(4), "ordinary"); // commits at ms100
  // A newer scan at ms101 covers the delta and reports the real total.
  ctl.observedAtMs = 101;
  ctl.now = 101;
  ctl.chargedBytes = cap;
  await store.writeOnce("b", Buffer.alloc(0), "ordinary");
  // A regressing still-fresh observation must never resurrect budget.
  ctl.observedAtMs = 100;
  ctl.chargedBytes = cap - 4;
  await code(store.writeOnce("c", Buffer.alloc(4), "ordinary"), "STORE_ACCOUNTING");
  await code(store.writeOnce("d", Buffer.alloc(0), "ordinary"), "STORE_ACCOUNTING");
});

test("a covering scan retires a committed stream delta once", async () => {
  const { store, ctl } = await makeStore();
  ctl.chargedBytes = 266338292; // ORDINARY-12
  ctl.now = 100;
  ctl.observedAtMs = 100;
  const s1 = await store.openArtifact({ artifactId: "c1", path: "c/a", mode: "append", lane: "ordinary" });
  const s2 = await store.openArtifact({ artifactId: "c2", path: "c/b", mode: "append", lane: "ordinary" });
  try {
    await s1.append(Buffer.alloc(4));
    await s2.append(Buffer.alloc(4));
    // The fresh whole scan already counts both committed chunks.
    ctl.observedAtMs = 101;
    ctl.now = 101;
    ctl.chargedBytes = 266338300; // ORDINARY-4
    await s1.append(Buffer.alloc(4)); // exact ordinary ceiling
    await code(s1.append(Buffer.alloc(1)), "STORE_CAPACITY");
    await code(s2.append(Buffer.alloc(1)), "STORE_CAPACITY");
  } finally {
    await s1.close();
    await s2.close();
  }
});

test("a reconcile accounting failure rejects the current write and sticks", async () => {
  const workspaceRoot = await makeTmpDir();
  let calls = 0;
  const store = createArtifactStore({
    workspaceRoot,
    // First call (pre-write reserve) is valid; the post-write reconcile
    // sample is unavailable, so the committed write itself must reject.
    readFootprint: async () => {
      calls += 1;
      return { chargedBytes: 0, observedAtMs: calls, accountingValid: calls === 1 };
    },
    monotonicNow: () => 100,
  });
  await code(store.writeOnce("a", Buffer.alloc(1), "ordinary"), "STORE_ACCOUNTING");
  assert.equal(calls, 2);
  await code(store.writeOnce("b", Buffer.alloc(1), "ordinary"), "STORE_ACCOUNTING");
  // The same post-commit gate rejects an append, not only writeOnce.
  let calls2 = 0;
  const store2 = createArtifactStore({
    workspaceRoot: await makeTmpDir(),
    readFootprint: async () =>
      ({ chargedBytes: 0, observedAtMs: (calls2 += 1), accountingValid: calls2 === 1 }),
    monotonicNow: () => 100,
  });
  const sink = await store2.openArtifact({ artifactId: "r1", path: "r/f", mode: "append", lane: "ordinary" });
  await code(sink.append(Buffer.alloc(1)), "STORE_ACCOUNTING");
  await code(sink.close(), "STORE_ACCOUNTING");
});

test("a path rejection stays correctable; required IO failure latches", async () => {
  const { store, workspaceRoot } = await makeStore();
  await fsp.writeFile(path.join(workspaceRoot, "x"), "not a dir");
  // ENOTDIR is a path/setup rejection: it rejects the current op but does
  // not poison the store.
  await assert.rejects(
    store.writeOnce("x/y", Buffer.alloc(1), "ordinary"),
    (e) => e.code === "ENOTDIR",
  );
  await store.writeOnce("z", Buffer.alloc(1), "ordinary");
  // A real sync failure on an owned handle is required durable IO: it
  // latches a sticky fault and every later op rejects.
  const realOpen = phaseFs.open;
  try {
    phaseFs.open = async function (...args) {
      const handle = await realOpen.apply(this, args);
      handle.sync = async () => {
        const error = new Error("forced-sync");
        error.code = "EIO";
        throw error;
      };
      return handle;
    };
    await assert.rejects(
      store.writeOnce("w", Buffer.alloc(1), "ordinary"),
      (e) => e.code === "EIO",
    );
  } finally {
    await artifactStoreLifetime(store).whenSettled();
    phaseFs.open = realOpen;
  }
  await code(store.writeOnce("v", Buffer.alloc(1), "ordinary"), "STORE_IO");
  await code(store.deleteEphemeral("x"), "STORE_IO");
});

test("a failed durable close rejects on every repeated close", async () => {
  const { store } = await makeStore();
  const realOpen = phaseFs.open;
  let sink;
  try {
    phaseFs.open = async function (...args) {
      const handle = await realOpen.apply(this, args);
      handle.sync = async () => {
        throw new Error("forced-sync-failure");
      };
      return handle;
    };
    sink = await store.openArtifact({ artifactId: "c1", path: "c/f", mode: "append", lane: "ordinary" });
    await sink.append(Buffer.from("x"));
    await assert.rejects(sink.close(), /forced-sync-failure/);
    await assert.rejects(sink.close(), /forced-sync-failure/);
  } finally {
    if (sink !== undefined) {
      await sink.close().then(() => {}, () => {});
    }
    await artifactStoreLifetime(store).whenSettled();
    phaseFs.open = realOpen;
  }
});

test("a zero-progress append latches and every later close rejects", async () => {
  const { store } = await makeStore();
  const realOpen = phaseFs.open;
  let sink;
  try {
    phaseFs.open = async function (...args) {
      const handle = await realOpen.apply(this, args);
      handle.write = async () => ({ bytesWritten: 0 });
      return handle;
    };
    sink = await store.openArtifact({ artifactId: "z1", path: "z/f", mode: "append", lane: "ordinary" });
    // The first terminal failure is preserved verbatim.
    await code(sink.append(Buffer.from("x")), "STORE_IO");
    await code(sink.append(Buffer.from("y")), "STORE_IO");
    // A failed append never closes into a success-shaped ref.
    await code(sink.close(), "STORE_IO");
    await code(sink.close(), "STORE_IO");
  } finally {
    if (sink !== undefined) {
      await sink.close().then(() => {}, () => {});
    }
    await artifactStoreLifetime(store).whenSettled();
    phaseFs.open = realOpen;
  }
});

test("a close-time accounting failure rejects every repeated close", async () => {
  const { store, ctl } = await makeStore();
  const sink = await store.openArtifact({ artifactId: "o1", path: "o/f", mode: "append", lane: "ordinary" });
  await sink.append(Buffer.from("x"));
  // The post-write observation breaches the total ceiling during close.
  ctl.chargedBytes = 268435457;
  await code(sink.close(), "STORE_OVERRUN");
  await code(sink.close(), "STORE_OVERRUN");
  // The store latched the overrun; no later operation proceeds.
  await code(store.writeOnce("o/g", Buffer.from("y"), "ordinary"), "STORE_OVERRUN");
});

test("sealPhase drains active writers before sealing permanently", async () => {
  const { store } = await makeStore();
  const sink = await store.openArtifact({ artifactId: "s1", path: "ph/a", mode: "append", lane: "ordinary" });
  await sink.append(Buffer.from("x"));
  await code(store.sealPhase("ph"), "STORE_STATE");
  await sink.close();
  await store.sealPhase("ph");
  await code(store.writeOnce("ph/b", Buffer.from("y"), "ordinary"), "STORE_SEALED");
  await code(
    store.openArtifact({ artifactId: "s2", path: "ph/c", mode: "append", lane: "ordinary" }),
    "STORE_SEALED",
  );
});

test("caller buffers are copied before the first await", async () => {
  const { store } = await makeStore();
  const buf = Buffer.from("original");
  const pending = store.writeOnce("copy/f", buf, "ordinary");
  buf.fill(0);
  const out = await pending;
  assert.equal(out.sha256, sha256Bytes(Buffer.from("original")));
  const sink = await store.openArtifact({ artifactId: "a1", path: "copy/g", mode: "append", lane: "ordinary" });
  const chunk = Buffer.from("chunk-data");
  const app = sink.append(chunk);
  chunk.fill(0);
  await app;
  const closed = await sink.close();
  assert.equal(closed.sha256, sha256Bytes(Buffer.from("chunk-data")));
});

test("append sink accumulates and reports the streamed ref", async () => {
  const { store } = await makeStore();
  const sink = await store.openArtifact({ artifactId: "a1", path: "ev/log.bin", mode: "append", lane: "ordinary" });
  await sink.append(Buffer.from("ab"));
  await sink.append(Buffer.from("cd"));
  const out = await sink.close();
  assert.equal(out.byteLength, 4);
  assert.equal(out.sha256, sha256Bytes(Buffer.from("abcd")));
  await code(sink.append(Buffer.from("e")), "STORE_STATE");
  await code(store.openArtifact({ artifactId: "a1", path: "ev/2", mode: "append", lane: "ordinary" }), "STORE_STATE");
});

test("replace sink swaps content atomically on close", async () => {
  const { store, workspaceRoot } = await makeStore();
  await fsp.mkdir(path.join(workspaceRoot, "d"));
  await fsp.writeFile(path.join(workspaceRoot, "d/f"), "old");
  const sink = await store.openArtifact({ artifactId: "r1", path: "d/f", mode: "replace", lane: "ordinary" });
  await sink.append(Buffer.from("new-bytes"));
  const out = await sink.close();
  assert.equal(out.sha256, sha256Bytes(Buffer.from("new-bytes")));
  assert.deepEqual(await fsp.readFile(path.join(workspaceRoot, "d/f")), Buffer.from("new-bytes"));
  await code(
    store.openArtifact({ artifactId: "r2", path: "d/missing", mode: "replace", lane: "ordinary" }),
    "STORE_STATE",
  );
});

test("concurrent writes to the same path serialize through the queue", async () => {
  const { store } = await makeStore();
  const sink = await store.openArtifact({ artifactId: "q1", path: "q", mode: "append", lane: "ordinary" });
  await code(store.writeOnce("q", Buffer.from("x"), "ordinary"), "STORE_STATE");
  await sink.close();
});

test("deleteEphemeral removes a file and blocks immutable paths", async () => {
  const { store, workspaceRoot } = await makeStore();
  await fsp.mkdir(path.join(workspaceRoot, "t"));
  await fsp.writeFile(path.join(workspaceRoot, "t/e"), "tmp");
  await store.deleteEphemeral("t/e");
  await code(fsp.lstat(path.join(workspaceRoot, "t/e")), "ENOENT");
  await store.writeOnce("t/i", Buffer.from("x"), "ordinary");
  await code(store.deleteEphemeral("t/i"), "STORE_STATE");
});

test("inspectArtifactRef verifies bytes against the declared ref", async () => {
  const { store, workspaceRoot } = await makeStore();
  const bytes = Buffer.from("content");
  const out = await store.writeOnce("p/f", bytes, "ordinary");
  assert.deepEqual(await inspectArtifactRef({ workspaceRoot, ref: out }), out);
  await code(
    inspectArtifactRef({ workspaceRoot, ref: { ...out, byteLength: 3 } }),
    "ARTIFACT_INTEGRITY",
  );
  await code(
    inspectArtifactRef({ workspaceRoot, ref: { ...out, sha256: "0".repeat(64) } }),
    "ARTIFACT_INTEGRITY",
  );
  await code(
    inspectArtifactRef({ workspaceRoot, ref: ref("p/missing", 1, 2) }),
    "ARTIFACT_MISSING",
  );
});

test("phaseArtifactRefs enumerates retained files sorted, excluding completion", async () => {
  const { store, workspaceRoot } = await makeStore();
  await store.writeOnce("ph/b", Buffer.from("2"), "ordinary");
  await store.writeOnce("ph/a", Buffer.from("1"), "ordinary");
  await fsp.writeFile(path.join(workspaceRoot, "ph", "completion.json"), "{}");
  const refs = await phaseArtifactRefs({ workspaceRoot, phaseDirectory: "ph" });
  assert.deepEqual(refs.map((r) => r.path), ["ph/a", "ph/b"]);
  await code(phaseArtifactRefs({ workspaceRoot, phaseDirectory: "../ph" }), "STORE_PATH");
});
