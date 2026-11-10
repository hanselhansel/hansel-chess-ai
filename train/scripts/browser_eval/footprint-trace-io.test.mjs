// Genuine observer/Store/FS integration. OLD hooks must fail on attribution.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { footprintTrace } from "./footprint-trace.mjs";
import { privateFs } from "./private-fs.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const tree = t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "footprint-trace-"));
  fs.writeFileSync(path.join(root, "input"), "real bytes");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};
const freshIds = () => new Set(footprintTrace.snapshot().scans.map(row => row.id));
const newScans = before => footprintTrace.snapshot().scans.filter(row => !before.has(row.id));
const getFailure = error => {
  const packet = footprintTrace.packet(error, 12);
  assert.ok(packet.some(line => line.includes("binding=exact")), `missing exact failed observation: ${packet}`);
  const row = footprintTrace.snapshot().failures.at(-1);
  assert.equal(row.binding, "exact");
  return row;
};

// Hold the actual callback containing private-fs fsDeliver, not its later promise.
const holdDelivery = root => {
  const originalImmediate = globalThis.setImmediate, originalStat = privateFs.lstat;
  const arrived = deferred(), release = deferred();
  let arm = false, held = false;
  globalThis.setImmediate = (callback, ...args) => {
    if (!arm || held) return originalImmediate(callback, ...args);
    held = true;
    return originalImmediate(() => {
      arrived.resolve();
      release.promise.then(() => callback(...args));
    });
  };
  privateFs.lstat = (...args) => {
    arm = args[0] === root;
    try { return originalStat(...args); }
    finally { arm = false; }
  };
  return { arrived: arrived.promise, release: release.resolve,
    restore() { globalThis.setImmediate = originalImmediate; privateFs.lstat = originalStat; } };
};

test("concurrent walks attribute exact FS calls and exclude unrelated synchronous work", async t => {
  const aRoot = tree(t), bRoot = tree(t), before = freshIds();
  const a = createFootprintObserver({ workspaceRoot: aRoot, clock: { nowMonoMs: () => 1000 } });
  const b = createFootprintObserver({ workspaceRoot: bRoot, clock: { nowMonoMs: () => 1000 } });
  const hold = holdDelivery(aRoot);
  const aScan = a.scan(), joined = a.scan();
  let bScan;
  assert.equal(joined, aScan, "in-flight join must return the original promise");
  try {
    await hold.arrived;
    bScan = b.scan(); const bSample = await bScan;
    await privateFs.lstat(aRoot); // Outside either scan's async context.
    const pending = newScans(before);
    assert.equal(pending.length, 2, "both genuine walks require independent diagnostic IDs");
    assert.equal(new Set(pending.map(row => row.id)).size, 2);
    const active = pending.find(row => row.completionNs === null);
    assert.ok(active); assert.equal(active.fs.lstat.issued, 1);
    assert.equal(active.fs.lstat.returned, 1); assert.equal(active.fs.lstat.delivered, 0);
    hold.release(); const aSample = await aScan;
    assert.notEqual(aSample, bSample); assert.equal(aSample.observedAtMs, bSample.observedAtMs);
    assert.equal(aSample.accountingValid, true); assert.equal(bSample.accountingValid, true);
    const complete = newScans(before);
    assert.equal(complete.length, 2);
    for (const scan of complete) {
      assert.equal(scan.fs.lstat.issued, 3); assert.equal(scan.fs.lstat.delivered, 3);
      assert.equal(scan.fs.readdir.issued, 1); assert.equal(scan.fs.readdir.delivered, 1);
      assert.ok(scan.publicationNs !== null); assert.equal(scan.partial, false);
    }
  } finally {
    hold.release(); hold.restore(); a.stop(); b.stop();
    await Promise.allSettled([aScan, bScan]);
  }
});

// Removing producer publication vs validated-consumer boundaries must fail.
for (const delay of ["internal-delivery", "published-consumer"]) {
  test(`stale pre-reservation localizes ${delay} without changing original Store refusal`, async t => {
    const root = tree(t), owner = createWatchdogLifetime(), before = freshIds();
    const originalClock = process.hrtime.bigint;
    let ns = 1000000000n, nowMs = 1000, clockReads = 0, reads = 0, returned;
    process.hrtime.bigint = () => ns;
    const observer = createFootprintObserver({ workspaceRoot: root, clock: { nowMonoMs: () => 1000 } });
    const exposed = deferred(), release = deferred();
    const hold = delay === "internal-delivery" ? holdDelivery(root) : null;
    const store = createArtifactStore({ workspaceRoot: root, lifetime: owner,
      monotonicNow: () => { clockReads++; return nowMs; },
      readFootprint: () => issueActual(owner.retainActual, async () => {
        reads++; const sample = await observer.scan(); returned = sample;
        exposed.resolve();
        if (delay === "published-consumer") await release.promise;
        return sample;
      }) });
    const actual = store.writeOnce("unadmitted", Buffer.from("x"), "ordinary");
    const outcome = actual.then(value => ({ value }), error => ({ error }));
    try {
      if (hold) await hold.arrived; else await exposed.promise;
      ns = 2001000000n; nowMs = 2001;
      if (hold) hold.release(); else release.resolve();
      const { error } = await outcome;
      assert.equal(error?.code, "STORE_ACCOUNTING");
      assert.deepEqual(JSON.parse(error.detail), { classification: "age-exceeded",
        nowMs: 2001, sampleStartMs: 1000, ageMs: 1001 });
      assert.equal(clockReads, 1); assert.equal(reads, 1);
      assert.equal(fs.existsSync(path.join(root, "unadmitted")), false);
      assert.equal(returned.observedAtMs, 1000); assert.equal(returned.accountingValid, true);
      const failure = getFailure(error), scan = failure.scan;
      assert.equal(failure.consumer.role, "pre-reservation");
      assert.equal(failure.consumer.nowMs, 2001); assert.equal(failure.consumer.ageMs, 1001);
      assert.equal(newScans(before).length, 1);
      if (hold) {
        assert.equal(scan.fs.lstat.maxDelivery.durationNs, "1001000000");
        assert.equal(scan.completionNs, "2001000000");
        assert.equal(scan.publicationNs, failure.consumer.consumeNs);
      } else {
        assert.equal(scan.completionNs, "1000000000");
        assert.equal(scan.publicationNs, "1000000000");
        assert.equal(failure.consumer.consumeNs, "2001000000");
        assert.equal(scan.fs.lstat.deliveryNs, "0");
      }
      await assert.rejects(store.writeOnce("later", Buffer.from("x"), "ordinary"), { code: "STORE_ACCOUNTING" });
      assert.equal(reads, 1, "sticky accounting cannot issue a replacement scan");
      assert.ok(footprintTrace.packet({ cause: error }, 12).some(line => line.includes("binding=exact")));
    } finally {
      release.resolve(); hold?.release(); hold?.restore(); observer.stop();
      await outcome; await owner.whenSettled(); process.hrtime.bigint = originalClock;
    }
  });
}

test("equality accepts a genuine1000ms scan age while1001ms remains refused", async t => {
  const root = tree(t), lifetime = createWatchdogLifetime();
  const observer = createFootprintObserver({ workspaceRoot: root, clock: { nowMonoMs: () => 1000 } });
  let reads = 0;
  const store = createArtifactStore({ workspaceRoot: root, lifetime, monotonicNow: () => 2000,
    readFootprint: () => issueActual(lifetime.retainActual, () => { reads++; return observer.scan(); }) });
  try {
    const ref = await store.writeOnce("equal", Buffer.from("real accepted"), "ordinary");
    assert.equal(fs.readFileSync(path.join(root, ref.path), "utf8"), "real accepted");
    assert.equal(reads, 2, "pre-reservation and post-write both consumed real scans");
    const consumers = footprintTrace.snapshot().consumers.slice(-2);
    assert.deepEqual(consumers.map(row => [row.binding, row.ageMs, row.role]),
      [["exact", 1000, "pre-reservation"], ["exact", 1000, "post-write"]]);
  } finally { observer.stop(); await lifetime.whenSettled(); }
});

test("stale post-write keeps committed bytes and attributes the exact second observation", async t => {
  const root = tree(t), lifetime = createWatchdogLifetime(), exposed = deferred(), release = deferred();
  const observer = createFootprintObserver({ workspaceRoot: root, clock: { nowMonoMs: () => 1000 } });
  let reads = 0, now = 1000, original, clockReads = 0;
  const samples = [];
  const store = createArtifactStore({ workspaceRoot: root, lifetime,
    monotonicNow: () => { clockReads++; return now; },
    readFootprint: () => issueActual(lifetime.retainActual, async () => {
      reads++; const sample = await observer.scan(); samples.push(sample);
      if (reads === 2) { exposed.resolve(); await release.promise; }
      return sample;
    }) });
  const write = store.writeOnce("committed", Buffer.from("committed bytes"), "ordinary");
  const outcome = write.then(value => ({ value }), error => ({ error }));
  try {
    await exposed.promise; now = 2001; release.resolve();
    original = (await outcome).error;
    assert.equal(original?.code, "STORE_ACCOUNTING"); assert.equal(JSON.parse(original.detail).ageMs, 1001);
    assert.equal(reads, 2); assert.equal(clockReads, 3);
    assert.equal(fs.readFileSync(path.join(root, "committed"), "utf8"), "committed bytes");
    assert.notEqual(samples[0], samples[1]);
    const failure = getFailure(original), consumers = footprintTrace.snapshot().consumers.slice(-2);
    assert.equal(failure.consumer.role, "post-write");
    assert.equal(failure.consumer.scanId, consumers[1].scanId);
    assert.notEqual(failure.consumer.scanId, consumers[0].scanId);
    await assert.rejects(store.writeOnce("blocked", Buffer.from("x"), "ordinary"), { code: "STORE_ACCOUNTING" });
    assert.equal(reads, 2); assert.equal(fs.existsSync(path.join(root, "blocked")), false);
  } finally { release.resolve(); observer.stop(); await outcome; await lifetime.whenSettled(); }
});
