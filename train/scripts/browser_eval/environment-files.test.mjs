// Pure bounded file scheduling and true-close ownership. No OS process,
// Native, browser, installed software or model is loaded by these fakes.
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { promises as fsp, createReadStream } from "node:fs";
import ts from "typescript";
import test from "node:test";
import { createEnvironmentFiles } from "./environment-files.mjs";
import { isObj, exactFields, isAbs } from "./protocol-values.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { makeEnvironmentFilesFixture as fixture } from "./environment-files-test-fixtures.mjs";


test("full inventory uses bounded independent reads with stable sorted current hashes", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  await f.entered;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.streams.length, 1);
  assert.equal(f.live(), 1);
  assert.equal(f.peak(), 1);
  f.release();
  const result = await pending;
  const expected = [...f.data].map(([file, bytes]) => ({ path: path.relative(f.root, file),
    byteLength: bytes.length, sha256: sha256Bytes(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(result.files, expected);
  assert.equal(result.sha256, sha256Bytes(canonicalBytes({ files: expected, links: [] })));
  assert.equal(f.peak(), 1);
  assert.equal(f.streams.every((stream) => stream.end === f.originalEnd && stream.closed), true);
  await f.lifetime.whenSettled();
});

test("first arbitrary nil failure joins all issued closes and admits no later file", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  let settled = false;
  pending.then(() => { settled = true; }, () => { settled = true; });
  let zero = false;
  await f.entered;
  const owner = f.lifetime.whenSettled().then(() => { zero = true; });
  const first = f.streams[0];
  first.emit("error", undefined);
  first.emit("error", new Error("later failure on same stream"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(zero, false);
  assert.equal(first.destroyed, true);
  assert.equal(first.closed, false);
  assert.equal(f.streams.length, 1);
  first.close();
  f.release();
  await assert.rejects(pending, (error) => error === undefined);
  await owner;
  assert.equal(zero, true);
  assert.equal(f.streams.length, 1);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
});

test("all issued reads borrow the original end and expiry cannot settle held closes", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  await f.entered;
  f.clock.advance(5000);
  assert.equal(f.budget.deadlineMonoMs(), f.originalEnd);
  assert.equal(f.streams.every((stream) => stream.destroyed && !stream.closed), true);
  let zeroSeen = false;
  const zero = f.lifetime.whenSettled().then(() => { zeroSeen = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(zeroSeen, false);
  f.release();
  await assert.rejects(pending, (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  await zero;
  assert.equal(f.streams.length, 1);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
});

test("every directory entry set is rechecked after the full content pass", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  await f.entered;
  f.data.set(path.join(f.root, "added-late.txt"), Buffer.from("late"));
  f.release();
  await assert.rejects(pending, /inventory changed entries/);
  assert.equal(f.streams.length, 45);
  assert.equal(f.streams.every((stream) => stream.closed), true);
});

test("one fresh pass derives both full outputs, reads external payloads and never reuses earlier calls", async (t) => {
  const f = fixture(t, { python: true });
  const pending = f.own(f.files.pythonInstalled("/venv"));
  await f.entered;
  assert.equal(f.peak(), 1);
  f.release();
  const result = await pending;
  const entries = [...f.data].map(([file, bytes]) => ({ path: path.relative("/venv", file),
    byteLength: bytes.length, sha256: sha256Bytes(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(result.distributions, [{ name: "demo", version: "1", buildSha256: sha256Bytes(canonicalBytes(entries)) }]);
  const siteFiles = [...f.data].filter(([file]) => file.startsWith(`${f.root}/`))
    .map(([file, bytes]) => ({ path: path.relative(f.root, file), byteLength: bytes.length, sha256: sha256Bytes(bytes) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(result.inventory.files, siteFiles);
  assert.equal(result.inventory.sha256, sha256Bytes(canonicalBytes({ files: siteFiles, links: [] })));
  const recordPath = path.join(f.root, "demo-1.dist-info/RECORD");
  assert.deepEqual(result.records, [{ path: recordPath, byteLength: f.data.get(recordPath).length,
    sha256: sha256Bytes(f.data.get(recordPath)) }]);
  assert.equal(f.streams.filter((stream) => f.payloads.includes(stream.file)).length, 45);
  assert.equal(f.streams.filter((stream) => stream.file === "/venv/bin/demo").length, 1);
  f.data.set(f.payloads[0], Buffer.from("changed current payload\n"));
  const second = await f.own(f.files.pythonInstalled("/venv"));
  assert.notEqual(second.distributions[0].buildSha256, result.distributions[0].buildSha256);
  assert.notEqual(second.inventory.sha256, result.inventory.sha256);
  assert.equal(f.streams.filter((stream) => f.payloads.includes(stream.file)).length, 90);
  assert.equal(f.streams.filter((stream) => stream.file === "/venv/bin/demo").length, 2);
  assert.equal(f.peak(), 1);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
});

for (const leaf of ["METADATA", "RECORD"]) {
  test(`fresh inventory must match the exact parsed ${leaf} bytes`, async (t) => {
    const f = fixture(t, { python: true, changeText: leaf });
    const pending = f.own(f.files.pythonInstalled("/venv"));
    await f.entered;
    f.release();
    await assert.rejects(pending, /distribution text changed during inventory/);
    assert.equal(f.streams.every((stream) => stream.closed), true);
    await f.lifetime.whenSettled();
  });
}

test("fresh facts still reject a RECORD digest mismatch and duplicate membership", async (t) => {
  for (const duplicate of [false, true]) {
    const f = fixture(t, { python: true });
    const recordPath = path.join(f.root, "demo-1.dist-info/RECORD");
    const original = f.data.get(recordPath).toString();
    const first = original.split("\n")[0];
    const [name] = first.split(",");
    const replacement = duplicate ? `${first}\n${original}`
      : original.replace(first, `${name},sha256=incorrect,${f.data.get(f.payloads[0]).length}`);
    f.data.set(recordPath, Buffer.from(replacement));
    f.release();
    await assert.rejects(f.own(f.files.pythonInstalled("/venv")), duplicate ? /RECORD duplicate/ : /RECORD digest/);
    assert.equal(f.streams.every((stream) => stream.closed), true);
    await f.lifetime.whenSettled();
  }
});

// Select exact private default bindings without adding operational hooks.
const selectedOwner = async (filename, names, bindings, result) => {
  const source = await fsp.readFile(new URL(filename, import.meta.url), "utf8");
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const nodes = parsed.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => names.includes(item.name.getText()))));
  assert.equal(nodes.length, names.length);
  const code = nodes.map((node) => node.getText(parsed).replace(/^export /, "")).join("\n");
  return new Function(...Object.keys(bindings), `${code}\nreturn ${result}`)(...Object.values(bindings));
};

test("both defaults use native canonicalization while explicit adapter snapshots retain every call", async (t) => {
  const f = fixture(t);
  const calls = [];
  const plain = () => { throw new Error("legacy JavaScript component walker invoked"); };
  plain.native = (filename) => { calls.push(filename); return filename; };
  const bindings = { isObj, exactFields, isAbs, assertWatchdogLifetime, fsp, createReadStream, realpathSync: plain };
  const factory = await selectedOwner("./environment-files.mjs", ["fail", "createEnvironmentFiles"], bindings, "createEnvironmentFiles");
  const bind = await selectedOwner("./environment.mjs", ["ADAPTERS", "fail", "bindAdapters"], bindings, "bindAdapters");
  const context = { budget: f.budget, lifetime: f.lifetime };
  assert.equal(bind().resolvePath, plain.native);
  const files = factory(context);
  assert.equal(files.resolve("/same/original/path"), "/same/original/path");
  assert.equal(files.resolve("/same/original/path"), "/same/original/path");
  assert.deepEqual(calls, ["/same/original/path", "/same/original/path"]);
  const explicit = (filename) => `${filename}/resolved`;
  const adapters = { resolvePath: explicit };
  const owned = factory(context, adapters);
  const bound = bind(adapters);
  adapters.resolvePath = () => { throw new Error("later mutation"); };
  assert.equal(bound.resolvePath, explicit);
  assert.equal(owned.resolve("/adapter"), "/adapter/resolved");
  assert.equal(calls.length, 2);
});

test("native default retains actual canonical symlink and failure guards", async (t) => {
  const f = fixture(t);
  const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "tinyaz-native-resolve-")));
  t.after(() => fsp.rm(root, { recursive: true }));
  await fsp.writeFile(path.join(root, "file"), "data");
  await fsp.symlink("file", path.join(root, "alias"));
  await fsp.symlink("absent", path.join(root, "dangling"));
  await fsp.symlink("loop", path.join(root, "loop"));
  const files = createEnvironmentFiles({ budget: f.budget, lifetime: f.lifetime });
  assert.equal(files.resolve(path.join(root, "alias")), path.join(root, "file"));
  for (const [leaf, code] of [["missing", "ENOENT"], ["dangling", "ENOENT"], ["loop", "ELOOP"], ["file/child", "ENOTDIR"]]) {
    assert.throws(() => files.resolve(path.join(root, leaf)), (error) => error.code === code);
  }
  f.clock.advance(5000);
  assert.throws(() => files.resolve(path.join(root, "file")), (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  await f.lifetime.whenSettled();
});

test("ordinary RECORD resolution yields a real event-loop turn before all rows exhaust", async (t) => {
  const resolved = new Set();
  let seen = null;
  let notify;
  const observed = new Promise((resolve) => { notify = resolve; });
  const f = fixture(t, { python: true, payloadCount: 513, onResolve: (file) => {
    if (seen !== null || !f.payloads.includes(file)) return;
    const first = resolved.size === 0;
    resolved.add(file);
    if (first) {
      setImmediate(() => { seen = resolved.size; notify(); });
    }
  } });
  f.own(observed);
  const pending = f.own(f.files.pythonInstalled("/venv"));
  await observed;
  assert.ok(seen > 0 && seen < f.payloads.length, `observer saw ${seen} of ${f.payloads.length} ordinary rows`);
  await f.entered;
  assert.equal(f.peak(), 1);
  f.release();
  const result = await pending;
  const entries = [...f.data].map(([file, bytes]) => ({ path: path.relative("/venv", file),
    byteLength: bytes.length, sha256: sha256Bytes(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(result.distributions, [{ name: "demo", version: "1", buildSha256: sha256Bytes(canonicalBytes(entries)) }]);
  const site = entries.filter((entry) => entry.path.startsWith("lib/python3.11/site-packages/"))
    .map((entry) => ({ ...entry, path: entry.path.slice("lib/python3.11/site-packages/".length) }));
  assert.deepEqual(result.inventory.files, site);
  assert.equal(result.inventory.sha256, sha256Bytes(canonicalBytes({ files: site, links: [] })));
  const record = path.join(f.root, "demo-1.dist-info/RECORD");
  assert.deepEqual(result.records, [{ path: record, byteLength: f.data.get(record).length,
    sha256: sha256Bytes(f.data.get(record)) }]);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
  await f.lifetime.whenSettled();
});

test("expiry at a real cooperative turn admits no later row and joins every issued turn", async (t) => {
  const immediate = globalThis.setImmediate;
  const tickets = [];
  let entered;
  const turnEntries = new Promise((resolve) => { entered = resolve; });
  const resolved = new Set();
  let expiredAt = null;
  const f = fixture(t, { python: true, payloadCount: 513, onResolve: (file) => {
    if (!f.payloads.includes(file)) return;
    const first = resolved.size === 0;
    resolved.add(file);
    if (first) {
      immediate(() => {
        expiredAt = resolved.size;
        f.clock.advance(5000);
      });
    }
  } });
  globalThis.setImmediate = function (callback, ...args) {
    return Reflect.apply(immediate, this, [function (...values) {
      tickets.push(() => Reflect.apply(callback, this, values));
      if (tickets.length === 1) entered();
    }, ...args]);
  };
  let pending;
  let zero = false;
  let settled = false;
  let streamsAtYield;
  const release = () => {
    for (const invoke of tickets.splice(0)) invoke();
  };
  try {
    pending = f.own(f.files.pythonInstalled("/venv"));
    pending.then(() => { settled = true; }, () => { settled = true; });
    await turnEntries;
    streamsAtYield = f.streams.length;
    assert.equal(tickets.length, 1);
    assert.ok(expiredAt > 0 && expiredAt < f.payloads.length);
    assert.equal(f.budget.deadlineMonoMs(), f.originalEnd);
    f.lifetime.whenSettled().then(() => { zero = true; });
    assert.equal(zero, false);
    assert.equal(settled, false, "expired public waits do not settle issued turn bodies");
  } finally {
    release();
    globalThis.setImmediate = immediate;
  }
  await assert.rejects(pending, (error) => error.code === "ACCOUNTING_UNAVAILABLE");
  await f.lifetime.whenSettled();
  assert.equal(zero, true);
  assert.equal(resolved.size, expiredAt, "no extra row after original-end expiry");
  assert.equal(f.streams.length, streamsAtYield);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
});

test("first pre-issue nil turn failure admits no later row and joins owned closes", async (t) => {
  const immediate = globalThis.setImmediate;
  let count = 0;
  let issued = 0;
  let atFailure;
  const resolved = new Set();
  const f = fixture(t, { python: true, payloadCount: 513, onResolve: (file) => {
    if (f.payloads.includes(file)) resolved.add(file);
  } });
  globalThis.setImmediate = function (callback, ...args) {
    count += 1;
    if (count === 1) {
      atFailure = resolved.size;
      throw undefined; // Definite failure before issuing any callback.
    }
    issued += 1;
    return Reflect.apply(immediate, this, [callback, ...args]);
  };
  try {
    await assert.rejects(f.own(f.files.pythonInstalled("/venv")), (error) => error === undefined);
  } finally {
    globalThis.setImmediate = immediate;
  }
  assert.equal(count, 1);
  assert.equal(issued, 0);
  assert.ok(atFailure > 0 && atFailure < f.payloads.length);
  assert.equal(resolved.size, atFailure);
  assert.equal(f.budget.deadlineMonoMs(), f.originalEnd);
  assert.equal(f.streams.every((stream) => stream.closed && stream.end === f.originalEnd), true);
  await f.lifetime.whenSettled();
});
