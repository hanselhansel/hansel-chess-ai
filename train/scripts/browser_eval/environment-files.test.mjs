// Pure bounded file scheduling and true-close ownership. No OS process,
// Native, browser, installed software or model is loaded by these fakes.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import os from "node:os";
import { promises as fsp, createReadStream } from "node:fs";
import ts from "typescript";
import test from "node:test";
import { createEnvironmentFiles } from "./environment-files.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { isObj, exactFields, isAbs } from "./protocol-values.mjs";
import { assertWatchdogLifetime, createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";

function fixture(t, { python = false, changeText = null } = {}) {
  const clock = fakeClock();
  const originalEnd = clock.nowMs() + 5000;
  const budget = createBudgetHandle({ deadlineMonoMs: originalEnd, clock, nowMonoMs: clock.nowMs });
  const lifetime = createWatchdogLifetime();
  const root = python ? "/venv/lib/python3.11/site-packages" : "/tree";
  const data = new Map();
  const payloads = Array.from({ length: 45 }, (_, index) =>
    path.join(root, python ? "demo" : "", `file${String(index).padStart(2, "0")}.txt`));
  for (const file of payloads) {
    data.set(file, Buffer.from(`${file}\n`));
  }
  if (python) {
    const info = path.join(root, "demo-1.dist-info");
    data.set(path.join(info, "METADATA"), Buffer.from("Name: Demo\nVersion: 1\n"));
    data.set("/venv/bin/demo", Buffer.from("external install entry point\n"));
    const names = [...data.keys(), path.join(info, "RECORD")];
    data.set(path.join(info, "RECORD"), Buffer.from(names.map((file) => `${path.relative(root, file)},,\n`).join("")));
  }
  const children = (dir) => [...new Set([...data.keys()]
    .filter((file) => file.startsWith(`${dir}/`)).map((file) => file.slice(dir.length + 1).split("/")[0]))];
  const statFile = async (file) => {
    const directory = !data.has(file) && children(file).length > 0;
    assert.ok(directory || data.has(file), `known fake path ${file}`);
    return { dev: 1, ino: file.length, mtimeMs: 1, size: data.get(file)?.length ?? 0,
      isFile: () => !directory, isDirectory: () => directory, isSymbolicLink: () => false };
  };
  const streams = [];
  const bodies = new Set();
  let enter;
  const entered = new Promise((resolve) => { enter = resolve; });
  let automatic = false;
  let held = 0;
  let live = 0;
  let peak = 0;
  class Stream extends EventEmitter {
    constructor(file) {
      super();
      this.file = file;
      this.closed = false;
      this.destroyed = false;
      this.end = budget.deadlineMonoMs();
      live += 1;
      peak = Math.max(peak, live);
      this.once("close", () => { live -= 1; });
    }
    destroy() { this.destroyed = true; }
    finish() {
      if (this.closed) return;
      this.emit("data", data.get(this.file));
      this.emit("end");
      this.close();
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      this.emit("close");
    }
  }
  const files = createEnvironmentFiles({ budget, lifetime }, {
    statFile, resolvePath: (file) => file, readdir: async (dir) => children(dir).reverse(),
    createStream: (file) => {
      if (changeText !== null && file.endsWith(`/${changeText}`) && streams.some((stream) => stream.file === file)) {
        const changed = Buffer.from(data.get(file));
        changed[0] ^= 1;
        data.set(file, changed);
      }
      const stream = new Stream(file);
      streams.push(stream);
      if (!automatic && payloads.includes(file)) {
        held += 1;
        if (held === 16) enter();
      } else {
        queueMicrotask(() => stream.finish());
      }
      return stream;
    },
  });
  const release = () => {
    automatic = true;
    for (const stream of streams) stream.finish();
  };
  const own = (body) => {
    bodies.add(body);
    body.then(() => bodies.delete(body), () => bodies.delete(body));
    return body;
  };
  t.after(async () => {
    release();
    await Promise.allSettled([...bodies]);
    await lifetime.whenSettled();
    budget.dispose();
    assert.equal(live, 0);
    assert.equal(streams.every((stream) => stream.closed), true);
  });
  return { files, root, data, payloads, streams, entered, release, own, clock, budget, lifetime, originalEnd,
    peak: () => peak, live: () => live };
}

test("full inventory uses bounded independent reads with stable sorted current hashes", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  await f.entered;
  assert.equal(f.streams.length, 16);
  assert.equal(f.live(), 16);
  f.release();
  const result = await pending;
  const expected = [...f.data].map(([file, bytes]) => ({ path: path.relative(f.root, file),
    byteLength: bytes.length, sha256: sha256Bytes(bytes) })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(result.files, expected);
  assert.equal(result.sha256, sha256Bytes(canonicalBytes({ files: expected, links: [] })));
  assert.equal(f.peak(), 16);
  assert.equal(f.streams.every((stream) => stream.end === f.originalEnd && stream.closed), true);
  await f.lifetime.whenSettled();
});

test("first arbitrary nil failure joins all issued closes and admits no later file", async (t) => {
  const f = fixture(t);
  const pending = f.own(f.files.inventory(f.root));
  let settled = false;
  pending.then(() => { settled = true; }, () => { settled = true; });
  await f.entered;
  f.streams[0].emit("error", undefined);
  f.streams[0].close();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(f.streams.length, 16);
  f.streams[1].emit("error", new Error("later failure"));
  f.streams[1].close();
  f.release();
  await assert.rejects(pending, (error) => error === undefined);
  assert.equal(f.streams.length, 16);
  assert.equal(f.streams.every((stream) => stream.closed), true);
  await f.lifetime.whenSettled();
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
  assert.equal(f.streams.length, 16);
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
  assert.equal(f.peak(), 16);
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
  assert.equal(f.peak(), 16);
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
