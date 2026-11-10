// TEST-only whole file fixture. No Native, installed software or inference.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import { createEnvironmentFiles } from "./environment-files.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { fakeClock } from "./supervision-test-fixtures.mjs";

export function makeEnvironmentFilesFixture(t, { python = false, changeText = null, payloadCount = 45, onResolve = null } = {}) {
  const clock = fakeClock();
  const originalEnd = clock.nowMs() + 5000;
  const budget = createBudgetHandle({ deadlineMonoMs: originalEnd, clock, nowMonoMs: clock.nowMs });
  const lifetime = createWatchdogLifetime();
  const root = python ? "/venv/lib/python3.11/site-packages" : "/tree";
  const data = new Map();
  const payloads = Array.from({ length: payloadCount }, (_, index) =>
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
    statFile, resolvePath: (file) => {
      if (onResolve !== null) onResolve(file);
      return file;
    }, readdir: async (dir) => children(dir).reverse(),
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
        if (held === 1) enter();
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
