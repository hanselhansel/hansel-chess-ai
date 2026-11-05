// workspace-footprint.test.mjs: whole-union counting, no link recursion,
// scan-start observedAtMs, in-flight joins, equal-time fault publication,
// interrupted-walk accounting, error retention, stop and owned-temp
// cleanup.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createFootprintObserver } from "./workspace-footprint.mjs";

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
