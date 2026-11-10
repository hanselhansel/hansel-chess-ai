// UNIT ownership controls for distinct pools sharing one fixture/lifetime.
// Controlled stream close gates do not establish actual OS-FD closure.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { makeEnvironmentFilesFixture as fixture } from "./environment-files-test-fixtures.mjs";

test("independent pool nil failure settles without awaiting an unrelated issued peer turn", async (t) => {
  const immediate = globalThis.setImmediate;
  let pool = "B";
  const rows = { A: 0, B: 0 };
  let atFailure;
  let attempts = 0;
  let issued = 0;
  let invokePeer;
  let entered;
  const peerEntered = new Promise((resolve) => { entered = resolve; });
  const f = fixture(t, { python: true, payloadCount: 513, onResolve: (file) => {
    if (f.payloads.includes(file)) rows[pool] += 1;
  } });
  globalThis.setImmediate = function (callback, ...args) {
    attempts += 1;
    if (attempts === 2) {
      atFailure = rows.A;
      throw undefined; // A's first turn fails before scheduling.
    }
    issued += 1;
    return Reflect.apply(immediate, this, [function (...values) {
      invokePeer = () => Reflect.apply(callback, this, values);
      entered();
    }, ...args]);
  };
  let a;
  let b;
  let bResult;
  let peerSettled = false;
  let lifetimeSettled = false;
  try {
    b = f.own(f.files.pythonInstalled("/venv"));
    b.then(() => { peerSettled = true; }, () => { peerSettled = true; });
    await peerEntered;
    assert.equal(issued, 1);
    pool = "A";
    a = f.own(f.files.pythonInstalled("/venv"));
    await assert.rejects(a, (error) => error === undefined);
    f.lifetime.whenSettled().then(() => { lifetimeSettled = true; });
    await new Promise((resolve) => immediate(resolve));
    assert.equal(attempts, 2);
    assert.equal(issued, 1);
    assert.ok(atFailure > 0 && atFailure < f.payloads.length);
    assert.equal(rows.A, atFailure, "A admits no later row while B is retained");
    assert.equal(peerSettled, false);
    assert.equal(lifetimeSettled, false);
  } finally {
    globalThis.setImmediate = immediate;
    pool = "B";
    f.release();
    if (invokePeer !== undefined) invokePeer();
    const results = await Promise.allSettled([a, b].filter((body) => body !== undefined));
    bResult = results.at(-1);
    await f.lifetime.whenSettled();
  }
  assert.equal(bResult.status, "fulfilled");
  assert.equal(rows.A, atFailure);
  assert.equal(peerSettled, true);
  assert.equal(lifetimeSettled, true);
  const entries = [...f.data].map(([file, bytes]) => ({ path: path.relative("/venv", file),
    byteLength: bytes.length, sha256: sha256Bytes(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  const result = bResult.value;
  assert.deepEqual(result.distributions, [{ name: "demo", version: "1", buildSha256: sha256Bytes(canonicalBytes(entries)) }]);
  const site = entries.filter((entry) => entry.path.startsWith("lib/python3.11/site-packages/"))
    .map((entry) => ({ ...entry, path: entry.path.slice("lib/python3.11/site-packages/".length) }));
  assert.deepEqual(result.inventory.files, site);
  assert.equal(result.inventory.sha256, sha256Bytes(canonicalBytes({ files: site, links: [] })));
  const record = path.join(f.root, "demo-1.dist-info/RECORD");
  assert.deepEqual(result.records, [{ path: record, byteLength: f.data.get(record).length,
    sha256: sha256Bytes(f.data.get(record)) }]);
  assert.equal(f.streams.filter((stream) => f.payloads.includes(stream.file)).length, 513);
  assert.equal(f.streams.filter((stream) => stream.file === "/venv/bin/demo").length, 1);
  assert.equal(f.budget.deadlineMonoMs(), f.originalEnd);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
});
