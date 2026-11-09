// Approved directory retirement: genuine observer/Store and real owned FS.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { privateFs } from "./private-fs.mjs";
import { createFootprintObserver, describeFootprintFailure } from "./workspace-footprint.mjs";
import { createArtifactStore } from "./artifact-store.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";

const allocated = st => st.isDirectory() || st.isSymbolicLink() ? st.blocks * 512 : Math.max(st.size, st.blocks * 512);
const scenario = async (t, kind = "second") => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fp-dir-"));
  const parent = path.join(root, "check");
  const target = path.join(parent, "BudgetDatabase");
  const file = path.join(parent, "first_party_sets.db");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "child"), Buffer.alloc(2048));
  fs.writeFileSync(file, Buffer.alloc(512));
  fs.writeFileSync(path.join(parent, "remaining"), Buffer.alloc(1024));
  const original = { lstat: privateFs.lstat, readdir: privateFs.readdir };
  let rootReads = 0;
  let retired = false;
  let removedFile = false;
  let absenceReads = 0;
  let confirmationReads = 0;
  let targetReadsAfterRemoval = 0;
  const calls = [];
  const first = kind === "first";
  const observer = createFootprintObserver({ workspaceRoot: root, clock: { nowMonoMs: () => 1100 } });
  t.after(() => {
    observer.stop();
    Object.assign(privateFs, original);
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(root + "-old", { recursive: true, force: true });
  });
  privateFs.readdir = async function (dir, ...args) {
    if (dir === root) rootReads++;
    calls.push({ op: "readdir", path: path.relative(root, dir), attempt: rootReads });
    if (dir === root && kind === "root-readdir") {
      fs.rmSync(root, { recursive: true });
    }
    if (dir === target && retired) {
      targetReadsAfterRemoval++;
      if (["EPERM", "EACCES", "EIO"].includes(kind)) {
        throw Object.assign(new Error("controlled read error"), { code: kind });
      }
    }
    const entries = await Reflect.apply(original.readdir, this, [dir, ...args]);
    if (!first && dir === parent && rootReads === 1 && !removedFile) {
      fs.unlinkSync(file);
      removedFile = true;
    }
    return entries;
  };
  privateFs.lstat = async function (name, ...args) {
    calls.push({ op: "lstat", path: path.relative(root, name), attempt: rootReads });
    if (retired && name === target) confirmationReads++;
    let st;
    try {
      st = await Reflect.apply(original.lstat, this, [name, ...args]);
    } catch (error) {
      if (retired && name === target && error.code === "ENOENT") {
        absenceReads++;
        if (absenceReads === 1 && ["reappeared", "symlink", "replacement"].includes(kind)) {
          if (kind === "symlink") fs.symlinkSync(parent, target);
          else if (kind === "replacement") fs.writeFileSync(target, "live replacement");
          else fs.mkdirSync(target);
        }
        if (absenceReads === 2 && kind === "stop-final") observer.stop();
        if (absenceReads === 2 && kind === "final-parent-replaced") {
          fs.renameSync(parent, path.join(root, "old-check"));
          fs.mkdirSync(parent);
        }
        if (absenceReads === 2 && kind === "final-permission") {
          throw Object.assign(new Error("controlled confirmation error"), { code: "EACCES" });
        }
      }
      throw error;
    }
    if (retired && name === parent) {
      if (kind === "unsafe-parent") return Object.assign(Object.create(st), { blocks: undefined });
      if (kind === "stop-confirmation") observer.stop();
    }
    if (name === target && !retired && rootReads === (first ? 1 : 2)) {
      // Explicit nonzero metadata makes known-charge rollback observable even
      // on APFS, whose actual directory st_blocks may be zero. All FS is real.
      st = Object.assign(Object.create(st), { blocks: 8 });
      if (kind === "unsafe-charge") return Object.assign(Object.create(st), { blocks: undefined });
      if (kind === "overflow-charge") return Object.assign(Object.create(st), { blocks: Number.MAX_SAFE_INTEGER });
      retired = true;
      if (!["EPERM", "EACCES", "EIO"].includes(kind)) fs.rmSync(target, { recursive: true });
      if (kind === "parent-replaced" || kind === "parent-symlink") {
        fs.renameSync(parent, path.join(root, "old-check"));
        if (kind === "parent-symlink") fs.symlinkSync(path.join(root, "old-check"), parent);
        else fs.mkdirSync(parent);
      }
      if (kind === "root-replaced" || kind === "root-lost") {
        fs.renameSync(root, root + "-old");
        if (kind === "root-replaced") fs.mkdirSync(root);
      }
    }
    return st;
  };
  const result = await observer.scan();
  assert.ok(rootReads <= 2, "never a third whole-root walk");
  return { root, parent, target, file, result, calls, rootReads, absenceReads, confirmationReads,
    targetReadsAfterRemoval, observer, original };
};

for (const kind of ["second", "first"]) {
  test(`confirmed ${kind}-walk directory retirement removes its NONZERO known charge`, async t => {
    const f = await scenario(t, kind);
    assert.equal(f.result.accountingValid, true);
    assert.equal(f.result.observedAtMs, 1100, "restart retains original start");
    assert.equal(f.rootReads, 2, "exactly one whole-root restart");
    assert.equal(f.targetReadsAfterRemoval, 1, "no enumeration of unknown retired children");
    assert.equal(f.absenceReads, 2, "positive confirmation and final revalidation");
    let expected = 0;
    const remaining = [f.root, f.parent, path.join(f.parent, "remaining")];
    if (kind === "first") remaining.push(f.file);
    for (const p of remaining) expected += allocated(await f.original.lstat(p));
    assert.equal(f.result.chargedBytes, expected, "4096 stale directory charge and ALL partial first-walk bytes removed");
    assert.deepEqual(f.result.errors ?? [], []);
    if (kind === "second") {
      assert.ok(f.calls.some(c => c.path === "check/BudgetDatabase/child" && c.attempt === 1));
      assert.equal(f.calls.filter(c => c.path === "check/first_party_sets.db" && c.op === "lstat").length, 3,
        "first retired FILE is also revalidated after directory retirement");
    }
  });
}

for (const kind of ["root-readdir", "root-lost", "root-replaced", "parent-replaced", "parent-symlink",
  "unsafe-parent", "reappeared", "symlink", "replacement", "EPERM", "EACCES", "EIO",
  "stop-confirmation", "stop-final", "final-parent-replaced", "final-permission", "unsafe-charge", "overflow-charge"]) {
  test(`directory retirement remains unavailable: ${kind}`, async t => {
    const f = await scenario(t, kind);
    assert.equal(f.result.accountingValid, false);
    assert.equal(f.result.observedAtMs, 1100);
    if (!["root-readdir", "unsafe-charge", "overflow-charge"].includes(kind)) {
      assert.equal(f.targetReadsAfterRemoval, 1, "the targeted descendant readdir boundary was reached");
    }
    if (["final-parent-replaced", "final-permission", "stop-final", "reappeared", "symlink", "replacement"].includes(kind)) {
      assert.equal(f.confirmationReads, 2, "the final retirement proof was actually exercised, including live rejection");
    }
    if (!kind.startsWith("stop-")) assert.ok(f.result.errors.length > 0);
    if (kind === "root-readdir") assert.ok(f.result.errors[0].includes(`readdir ${f.root}: ENOENT`));
    if (["EPERM", "EACCES", "EIO"].includes(kind)) {
      assert.ok(f.result.errors.at(-1).endsWith(kind));
      assert.equal(f.absenceReads, 0, "permission/nonENOENT never becomes absence");
    }
  });
}

test("unproven directory retirement stays Store-sticky and owns actual body settlement without writes", async t => {
  const f = await scenario(t, "final-permission");
  assert.equal(f.result.accountingValid, false);
  assert.equal(describeFootprintFailure(f.result, f.root),
    "ENOENT lstat check/first_party_sets.db>readdir check/BudgetDatabase a=false b=ok t=ok");
  const lifetime = createWatchdogLifetime();
  let reads = 0;
  const store = createArtifactStore({ workspaceRoot: f.root, lifetime, monotonicNow: () => 1100,
    readFootprint: () => issueActual(lifetime.retainActual, async () => {
      reads++;
      return reads === 1 ? f.result : { observedAtMs: 1100, chargedBytes: 0, accountingValid: true };
    }) });
  await assert.rejects(store.writeOnce("never", Buffer.from("no"), "ordinary"), e => e.code === "STORE_ACCOUNTING");
  await assert.rejects(store.writeOnce("still-never", Buffer.from("no"), "ordinary"), e => e.code === "STORE_ACCOUNTING");
  await lifetime.whenSettled();
  assert.equal(reads, 1, "later success cannot clear the sticky failure");
  assert.equal(fs.existsSync(path.join(f.root, "never")), false);
  assert.equal(fs.existsSync(path.join(f.root, "still-never")), false);
});


test("a valid directory-retirement walk cannot bypass original Store freshness", async t => {
  const f = await scenario(t, "second");
  assert.equal(f.result.accountingValid, true);
  const lifetime = createWatchdogLifetime();
  const store = createArtifactStore({ workspaceRoot: f.root, lifetime, monotonicNow: () => 2101,
    readFootprint: () => issueActual(lifetime.retainActual, async () => f.result) });
  await assert.rejects(store.writeOnce("too-late", Buffer.from("no"), "ordinary"), error => {
    assert.equal(error.code, "STORE_ACCOUNTING");
    assert.deepEqual(JSON.parse(error.detail), {
      classification: "age-exceeded", nowMs: 2101, sampleStartMs: 1100, ageMs: 1001,
    });
    return true;
  });
  await lifetime.whenSettled();
  assert.equal(fs.existsSync(path.join(f.root, "too-late")), false);
});
