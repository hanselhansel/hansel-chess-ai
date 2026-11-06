// workspace-footprint.test.mjs: whole-union counting, no link recursion,
// scan-start observedAtMs, in-flight joins, equal-time fault publication,
// interrupted-walk accounting, error retention, stop and owned-temp
// cleanup.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, promises as fsp } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createFootprintObserver, describeFootprintFailure } from "./workspace-footprint.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createWatchdogLifetime, observeAwaitStage } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";

const tree = () => {
  const root = mkdtempSync(path.join(tmpdir(), "fp-"));
  writeFileSync(path.join(root, "a.bin"), Buffer.alloc(1000));
  mkdirSync(path.join(root, "sub"));
  writeFileSync(path.join(root, "sub", "b.bin"), Buffer.alloc(2000));
  symlinkSync(path.join(root, "a.bin"), path.join(root, "link"));
  return root;
};

const ownedTree = (t) => {
  const root = tree();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const clock = () => {
  let now = 1000;
  return { nowMonoMs: () => now, bump: (ms) => (now += ms) };
};

test("scan charges every entry once without following links", async (t) => {
  const root = ownedTree(t);
  const c = clock();
  const o = createFootprintObserver({ workspaceRoot: root, clock: c });
  const r = await o.scan();
  assert.equal(r.accountingValid, true);
  // a.bin >=1000, b.bin >=2000, plus dir/symlink allocations; the link is
  // charged as a link only, never its target's 1000 bytes again.
  assert.ok(r.chargedBytes >= 3000);
  assert.ok(r.chargedBytes < 100000);
  assert.equal(r.observedAtMs, 1000);
});

test("observedAtMs is the scan start and starts are nondecreasing", async (t) => {
  const root = ownedTree(t);
  const c = clock();
  const o = createFootprintObserver({ workspaceRoot: root, clock: c });
  const p1 = o.scan();
  const p2 = o.readFootprint(); // joins the in-flight walk
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.observedAtMs, r2.observedAtMs);
  c.bump(50);
  const r3 = await o.scan();
  assert.ok(r3.observedAtMs > r1.observedAtMs);
});

test("an equal-time fault still publishes over an earlier good observation", async (t) => {
  const root = ownedTree(t);
  const c = clock();
  const o = createFootprintObserver({ workspaceRoot: root, clock: c });
  const good = await o.scan();
  assert.equal(good.accountingValid, true);
  // Same millisecond, real fault: deleting the root makes the next walk
  // genuinely unavailable at the SAME observedAtMs — the failure must not
  // hide behind the earlier valid coverage.
  rmSync(root, { recursive: true, force: true });
  const bad = await o.scan();
  assert.equal(bad.observedAtMs, good.observedAtMs); // equal-time publish
  assert.equal(bad.accountingValid, false);
  assert.equal(bad.chargedBytes, good.chargedBytes); // real bytes preserved
});

test("a walk error keeps the boundary moving but marks invalid", async () => {
  const root = path.join(tmpdir(), "fp-missing-dir-that-does-not-exist");
  const o = createFootprintObserver({ workspaceRoot: root, clock: clock() });
  const r = await o.scan();
  assert.equal(r.accountingValid, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0);
});

test("an interrupted walk can never publish a successful partial prefix", async (t) => {
  const root = ownedTree(t);
  const c = clock();
  const o = createFootprintObserver({ workspaceRoot: root, clock: c });
  const p = o.scan();
  o.stop(); // generation superseded before the walk drains
  const r = await p;
  assert.equal(r.accountingValid, false);
  assert.ok(Array.isArray(r.errors));
  await assert.rejects(o.scan());
});

test("stop prevents new scans; readFootprint still returns the last good", async (t) => {
  const root = ownedTree(t);
  const o = createFootprintObserver({ workspaceRoot: root, clock: clock() });
  const good = await o.scan();
  o.stop();
  await assert.rejects(o.scan());
  const r = await o.readFootprint();
  assert.equal(r.chargedBytes, good.chargedBytes);
});

const failureThroughStore = async (root, readFootprint, lines = []) => {
  const owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const store = createArtifactStore({ workspaceRoot: root, lifetime: owner,
    monotonicNow: () => 1000,
    readFootprint: () => issueActual(owner.retainActual, readFootprint) });
  const actual = store.writeOnce("unadmitted", Buffer.from("never written"), "ordinary");
  assert.equal(observeAwaitStage(owner, "phase", "cleanup.event", () => actual), actual);
  let failure;
  await assert.rejects(actual, (error) => {
    failure = error;
    return error.code === "STORE_ACCOUNTING" && error.message === "artifact-store STORE_ACCOUNTING: invalid sample";
  });
  await owner.whenSettled();
  await assert.rejects(fsp.stat(path.join(root, "unadmitted")), { code: "ENOENT" });
  return { failure, owner, store };
};

test("controlled filesystem error survives producer, Store and passive marker", async (t) => {
  const root = ownedTree(t);
  const read = fsp.readdir;
  t.after(() => { fsp.readdir = read; });
  fsp.readdir = async function (dir, ...args) {
    if (dir === root) {
      throw Object.assign(new Error("denied"), { code: "EACCES" });
    }
    return Reflect.apply(read, this, [dir, ...args]);
  };
  const observer = createFootprintObserver({ workspaceRoot: root, clock: clock() });
  const lines = [];
  const { failure } = await failureThroughStore(root, observer.readFootprint, lines);
  assert.equal(failure.detail, "EACCES readdir(root) a=false b=ok t=ok");
  const marker = JSON.parse(lines.at(-1).slice("TINYAZ_AWAIT ".length));
  assert.equal(marker.code, "STORE_ACCOUNTING");
  assert.ok(marker.detail.includes("EACCES readdir(root)"));
  assert.ok(Buffer.byteLength(lines.at(-1)) <= 256);
});

test("unsafe allocation metadata stays invalid with its actual cause", async (t) => {
  const root = ownedTree(t);
  const stat = fsp.lstat;
  t.after(() => { fsp.lstat = stat; });
  fsp.lstat = async function (file, ...args) {
    if (file === root) {
      return { size: 0, blocks: undefined };
    }
    return Reflect.apply(stat, this, [file, ...args]);
  };
  const observer = createFootprintObserver({ workspaceRoot: root, clock: clock() });
  const { failure } = await failureThroughStore(root, observer.readFootprint);
  assert.equal(failure.detail, "unsafe-metadata charge(root) a=false b=ok t=ok");
});

test("interrupted real walk drains and preserves its stop/generation reason", async (t) => {
  const root = ownedTree(t);
  const read = fsp.readdir;
  let enter;
  let release;
  const entered = new Promise((resolve) => { enter = resolve; });
  const held = new Promise((resolve) => { release = resolve; });
  let scan;
  t.after(async () => {
    release();
    if (scan) await scan;
    fsp.readdir = read;
  });
  fsp.readdir = async function (...args) {
    const entries = await Reflect.apply(read, this, args);
    if (args[0] === root) {
      enter();
      await held;
    }
    return entries;
  };
  const observer = createFootprintObserver({ workspaceRoot: root, clock: clock() });
  scan = observer.scan();
  await entered;
  observer.stop();
  release();
  const sample = await scan;
  assert.equal(sample.accountingValid, false);
  assert.equal(sample.interruption, "stopped/generation-changed");
  assert.deepEqual(sample.errors, []);
  const { failure } = await failureThroughStore(root, observer.readFootprint);
  assert.equal(failure.detail, "stopped/generation-changed a=false b=ok t=ok");
});

test("long root prefixes retain genuine relative roles and tail basenames", async (t) => {
  const root = ownedTree(t);
  const longRoot = "/" + "long-prefix/".repeat(1000) + "workspace";
  const sample = { accountingValid: false, chargedBytes: 7, observedAtMs: 1000,
    errors: [`readdir ${longRoot}/inputs/harness/fixtures: EACCES`,
      `lstat ${longRoot}/browser/cache/model.bin: ENOENT`] };
  const detail = describeFootprintFailure(sample, longRoot);
  assert.equal(detail, "EACCES>ENOENT readdir inputs/fixtures>lstat browser/model.bin a=false b=ok t=ok");
  const outside = { ...sample, errors: [`lstat ${longRoot}-other/browser/model.bin: ENOENT`] };
  assert.equal(describeFootprintFailure(outside, longRoot), "ENOENT lstat(entry) a=false b=ok t=ok");
  for (const role of ["inputs", "browser", "driver-tmp"]) {
    const lines = [];
    const provider = { ...sample, errors: [`lstat ${root}/${role}/cache/model.bin: ENOENT`] };
    const { failure } = await failureThroughStore(root, async () => provider, lines);
    assert.ok(failure.detail.includes(`${role}/model.bin`));
    const marker = JSON.parse(lines.at(-1).slice("TINYAZ_AWAIT ".length));
    assert.ok(marker.detail.includes(`${role}/model.bin`));
    assert.equal(marker.detail.includes(root), false);
    assert.ok(Buffer.byteLength(lines.at(-1)) <= 256);
  }
});

test("malformed and hostile diagnostics cannot replace primary or admit reentry", async (t) => {
  const root = ownedTree(t);
  let store;
  let reentry;
  let conversions = 0;
  let nestedDetail;
  const raw = { toString() {
    conversions += 1;
    throw null;
  } };
  const errors = Object.defineProperty([], "0", { get() {
    reentry = store.writeOnce("reentered", Buffer.from("forbidden"), "ordinary");
    reentry.catch(() => {});
    nestedDetail = describeFootprintFailure(sample, root);
    throw undefined;
  } });
  const sample = { accountingValid: false, chargedBytes: -1, observedAtMs: Infinity, errors,
    get interruption() { return raw; } };
  const owner = createWatchdogLifetime();
  store = createArtifactStore({ workspaceRoot: root, lifetime: owner,
    monotonicNow: () => 1000, readFootprint: async () => sample });
  await assert.rejects(store.writeOnce("first", Buffer.alloc(1), "ordinary"), (error) => {
    assert.equal(error.message, "artifact-store STORE_ACCOUNTING: invalid sample");
    assert.equal(error.detail, "diagnostic-unavailable a=false b=invalid t=invalid");
    return error.code === "STORE_ACCOUNTING";
  });
  await assert.rejects(reentry, (error) => error.code === "STORE_ACCOUNTING");
  await owner.whenSettled();
  assert.equal(conversions, 0);
  assert.equal(nestedDetail, "diagnostic-unavailable");
  await assert.rejects(fsp.stat(path.join(root, "reentered")), { code: "ENOENT" });
});

test("a genuinely retired enumerated child triggers one complete fresh walk", async (t) => {
  const root = ownedTree(t);
  const directory = path.join(root, "sub");
  const retired = path.join(directory, "b.bin");
  const replacement = path.join(directory, "current.bin");
  const read = fsp.readdir;
  const c = clock();
  let enumerations = 0;
  let rootEnumerations = 0;
  t.after(() => { fsp.readdir = read; });
  fsp.readdir = async function (dir, ...args) {
    const entries = await Reflect.apply(read, this, [dir, ...args]);
    if (dir === root) rootEnumerations += 1;
    if (dir === directory && enumerations++ === 0) {
      await fsp.unlink(retired);
      await fsp.writeFile(replacement, Buffer.alloc(12000));
      c.bump(50);
    }
    return entries;
  };
  const observer = createFootprintObserver({ workspaceRoot: root, clock: c });
  const result = await observer.scan();
  assert.equal(result.accountingValid, true);
  assert.equal(result.observedAtMs, 1000, "restart borrows the original scan start");
  assert.equal(enumerations, 2, "the second attempt enumerates the entire parent again");
  assert.equal(rootEnumerations, 2, "restart begins at the root, not the missing entry");
  let expected = 0;
  for (const file of [root, path.join(root, "a.bin"), path.join(root, "link"), directory, replacement]) {
    const st = await fsp.lstat(file);
    expected += st.isDirectory() || st.isSymbolicLink() ? st.blocks * 512 : Math.max(st.size, st.blocks * 512);
  }
  assert.equal(result.chargedBytes, expected, "no partial first-walk charge survives");
});

for (const scenario of ["reappeared", "parent-replaced", "restart-parent-replaced", "parent-symlink", "root-lost", "root-replaced", "root-symlink", "unsafe-parent", "stop-confirmation", "repeated", "retired-final-reappeared", "retired-final-parent-replaced", "stopped", "EPERM", "EIO"]) {
  test(scenario === "repeated" ? "two positively retired children remain completely accounted" : `retirement confirmation remains unavailable: ${scenario}`, async (t) => {
    const root = ownedTree(t);
    const parent = path.join(root, "sub");
    const retired = path.join(parent, "b.bin");
    const read = fsp.readdir;
    const stat = fsp.lstat;
    let reads = 0;
    let recreate = false;
    let againChecks = 0;
    const repeated = scenario === "repeated" || scenario.startsWith("retired-final-");
    const oldRoot = root + "-retired";
    let observer;
    t.after(() => {
      fsp.readdir = read;
      fsp.lstat = stat;
      rmSync(oldRoot, { recursive: true, force: true });
    });
    fsp.readdir = async function (dir, ...args) {
      const entries = await Reflect.apply(read, this, [dir, ...args]);
      if (dir === root && reads === 1 && scenario === "restart-parent-replaced") {
        await fsp.rename(parent, path.join(root, "old-parent"));
        await fsp.mkdir(parent);
        await fsp.writeFile(path.join(parent, "current.bin"), "fresh replacement");
      }
      if (dir === parent) {
        reads += 1;
        if (reads === 1) {
          await fsp.unlink(retired);
          if (repeated && reads === 1) {
            await fsp.writeFile(path.join(parent, "again.bin"), "another retired entry");
          }
          if (scenario === "parent-replaced" || scenario === "parent-symlink") {
            await fsp.rename(parent, path.join(root, "old-parent"));
            if (scenario === "parent-symlink") {
              await fsp.symlink(path.join(root, "old-parent"), parent);
            } else {
              await fsp.mkdir(parent);
            }
          }
          if (scenario === "root-lost") await fsp.rm(root, { recursive: true });
          if (scenario === "root-replaced" || scenario === "root-symlink") {
            await fsp.rename(root, oldRoot);
            if (scenario === "root-symlink") await fsp.symlink(oldRoot, root);
            else await fsp.mkdir(root);
          }
          if (scenario === "stopped") observer.stop();
          recreate = scenario === "reappeared";
        }
      }
      return entries;
    };
    fsp.lstat = async function (file, ...args) {
      if (file === retired && ["EPERM", "EIO"].includes(scenario)) {
        throw Object.assign(new Error("controlled access failure"), { code: scenario });
      }
      if (repeated && reads === 2 && file === path.join(parent, "again.bin")) {
        againChecks += 1;
        if (againChecks === 1) await fsp.unlink(file);
        if (againChecks === 3 && scenario === "retired-final-reappeared") {
          await fsp.writeFile(file, "reappeared before final absence proof");
        }
        if (againChecks === 3 && scenario === "retired-final-parent-replaced") {
          await fsp.rename(parent, path.join(root, "old-parent"));
          await fsp.mkdir(parent);
        }
      }
      try {
        const result = await Reflect.apply(stat, this, [file, ...args]);
        if (file === parent && reads === 1 && scenario === "unsafe-parent") {
          return Object.assign(Object.create(result), { blocks: undefined });
        }
        if (file === parent && reads === 1 && scenario === "stop-confirmation") observer.stop();
        return result;
      } catch (error) {
        if (file === retired && recreate) {
          recreate = false;
          await fsp.writeFile(retired, "live again before confirmation");
        }
        throw error;
      }
    };
    observer = createFootprintObserver({ workspaceRoot: root, clock: clock() });
    const result = await observer.scan();
    assert.equal(result.accountingValid, scenario === "repeated");
    assert.ok(reads <= 2, "at most one whole-walk restart");
    if (scenario === "repeated") {
      assert.deepEqual(result.errors ?? [], []);
      assert.equal(result.observedAtMs, 1000);
      assert.equal(reads, 2);
      let expected = 0;
      for (const file of [root, path.join(root, "a.bin"), path.join(root, "link"), parent]) {
        const st = await Reflect.apply(stat, fsp, [file]);
        expected += st.isDirectory() || st.isSymbolicLink() ? st.blocks * 512 : Math.max(st.size, st.blocks * 512);
      }
      assert.equal(result.chargedBytes, expected, "complete remaining tree, absent entries zero");
    }
    if (scenario !== "stopped" && scenario !== "repeated") {
      assert.ok(result.errors[0].includes(scenario === "EPERM" || scenario === "EIO" ? scenario : "ENOENT"));
    }
  });
}
