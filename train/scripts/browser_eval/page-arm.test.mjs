// Execute the actual Page scripts through class-shaped public interfaces.
// Real pinned bytes are hashed; no browser, model or Native is executed.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createPageArm } from "./page-arm.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";

const model = await readFile(new URL("../../../public/weights/tinyaz-m.bin", import.meta.url));
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
function fixture(t, { kind = "baseline", bytes = model, deliver = true, holdBegin = false,
  holdBody = false, holdThink = false } = {}) {
  const controller = new AbortController();
  const begin = deferred();
  const body = deferred();
  const bodyEntered = deferred();
  const readyEntered = deferred();
  const think = deferred();
  const thinkEntered = deferred();
  const operations = [];
  const artifacts = [];
  const workers = [];
  let evaluates = 0;
  let deliveryReads = 0;
  let outstanding = 0;
  class Worker {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.listeners = [];
      workers.push(this);
    }
    addEventListener(name, callback) {
      assert.equal(name, "message");
      this.listeners.push(callback);
    }
    emit(raw) {
      for (const listener of this.listeners) {
        listener({ data: raw });
      }
    }
  }
  class Context extends EventEmitter {}
  const context = new Context();
  const sandbox = { window: { Worker }, structuredClone };
  const realm = vm.createContext(sandbox);
  const route = kind === "baseline" ? "/weights/tinyaz-s.bin" : "/weights/tinyaz-m.bin";
  class Response {
    url() { return `http://127.0.0.1:43210${route}`; }
    status() { return 200; }
    async body() {
      deliveryReads += 1;
      outstanding += 1;
      bodyEntered.resolve();
      try {
        if (holdBody) {
          await body.promise;
        }
        return bytes;
      } finally {
        outstanding -= 1;
      }
    }
  }
  const rawReady = { type: "ready", paramCount: 2426706, seed: 0, source: "lichess-2013-01" };
  const ready = { paramCount: 2426706, seed: 0, source: "lichess-2013-01" };
  sandbox.window.__tinyazEval = {
    async initialize() {
      readyEntered.resolve();
      const worker = new sandbox.window.Worker("/actual-worker.js", { type: "module" });
      if (deliver) {
        context.emit("response", new Response());
      }
      worker.emit(rawReady);
      return ready;
    },
    async think(request) {
      thinkEntered.resolve(request);
      if (holdThink) {
        await think.promise;
      }
      const response = { uci: "e2e4", visits: 64, value: 0 };
      workers.at(-1).emit({ type: "result", id: request.requestId, result: response });
      return response;
    },
  };
  class Page {
    url() { return "http://127.0.0.1:43210/engine"; }
    async evaluate(fn, argument) {
      evaluates += 1;
      realm.argument = structuredClone(argument);
      const value = await vm.runInContext(`(${fn.toString()})(argument)`, realm);
      return structuredClone(value);
    }
  }
  const page = new Page();
  const capabilities = {
    signal: controller.signal,
    manifest: { phase: "compare" },
    async operation(kind, id, work) {
      operations.push({ kind, id });
      if (holdBegin) {
        await begin.promise;
      }
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      const result = await work({ remainingMs: kind === "readiness" ? 30000 : 90000, signal: controller.signal });
      assert.deepEqual(Object.keys(result).sort(), ["detail", "evidencePaths", "status"]);
      assert.equal(result.status, "completed");
      return result;
    },
    async artifact(path, mode, chunks) {
      const parts = [];
      for await (const part of chunks) {
        parts.push(Buffer.from(part));
      }
      const bytes = Buffer.concat(parts);
      artifacts.push({ path, mode, bytes, parsed: JSON.parse(bytes) });
      return { path, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    },
  };
  const arm = createPageArm({ kind, id: "p01-g1-baseline", page, context, capabilities });
  const pending = new Set();
  const own = (promise) => {
    pending.add(promise);
    promise.then(() => pending.delete(promise), () => pending.delete(promise));
    return promise;
  };
  t.after(async () => {
    controller.abort(new Error("test teardown"));
    begin.resolve();
    body.resolve();
    think.resolve();
    await Promise.allSettled([...pending]);
    assert.equal(outstanding, 0);
    assert.equal(context.listenerCount("response"), 0);
  });
  return { arm, own, begin, body, bodyEntered, readyEntered, think, thinkEntered,
    controller, operations, artifacts, workers, sandbox, context, page, capabilities,
    get evaluates() { return evaluates; }, get deliveryReads() { return deliveryReads; } };
}
const request = (id = 1) => ({ requestId: id, gameGeneration: 1,
  position: { initialFen: "start", movesUci: [] }, requestedVisits: 64 });

test("construction is pure and readiness waits for begun before Page work", async (t) => {
  const f = fixture(t, { holdBegin: true });
  assert.equal(f.evaluates, 0);
  assert.deepEqual(Object.keys(f.arm).sort(), ["initialize", "kind", "think"]);
  const pending = f.own(f.arm.initialize());
  assert.equal(f.evaluates, 0);
  assert.deepEqual(f.operations, [{ kind: "readiness", id: "p01-g1-baseline-readiness" }]);
  f.begin.resolve();
  const observation = await pending;
  assert.equal(observation.delivery.sha256, sha256Bytes(model));
  assert.equal(observation.delivery.byteLength, model.length);
  assert.equal(observation.delivery.path, "/weights/tinyaz-s.bin");
  assert.equal(observation.worker.instanceId, "worker-1");
  assert.equal(Object.hasOwn(observation.ready, "modelIdentity"), false);
  assert.equal(f.workers[0].url, "/actual-worker.js");
  assert.deepEqual(f.workers[0].options, { type: "module" });
  assert.equal(f.context.listenerCount("response"), 0);
  await assert.rejects(f.arm.initialize(), /initialize once/);
});

test("each move has a separate command and persisted untouched raw observations", async (t) => {
  const f = fixture(t);
  await f.own(f.arm.initialize());
  const one = await f.own(f.arm.think(request()));
  const two = await f.own(f.arm.think(request(2)));
  assert.equal(one.worker.raw.id, 1);
  assert.equal(two.worker.raw.id, 2);
  assert.deepEqual(one.response, one.worker.raw.result);
  assert.deepEqual(f.operations.map((value) => value.kind), ["readiness", "command", "command"]);
  assert.equal(new Set(f.operations.map((value) => value.id)).size, 3);
  assert.deepEqual(f.artifacts.map((value) => value.path), [
    "compare/observations/p01-g1-baseline-ready.json",
    "compare/observations/p01-g1-baseline-move-1.json",
    "compare/observations/p01-g1-baseline-move-2.json",
  ]);
  assert.deepEqual(f.artifacts[2].bytes, canonicalBytes(two));
  assert.equal(f.deliveryReads, 1);
});

test("wrong actual model bytes cannot be replaced with pinned metadata", async (t) => {
  const f = fixture(t, { bytes: Buffer.alloc(model.length) });
  await assert.rejects(f.own(f.arm.initialize()), /actual delivered M bytes/);
  assert.equal(f.artifacts.length, 0);
  assert.equal(f.context.listenerCount("response"), 0);
});

test("stop retains an issued actual response-body read until true settlement", async (t) => {
  const f = fixture(t, { holdBody: true });
  const pending = f.own(f.arm.initialize());
  const reason = new Error("stop while actual body held");
  await f.bodyEntered.promise;
  f.controller.abort(reason);
  let settled = false;
  pending.then(() => { settled = true; }, () => { settled = true; });
  assert.equal(settled, false);
  f.body.resolve();
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(f.artifacts.length, 0);
  assert.equal(f.context.listenerCount("response"), 0);
});

test("absent delivery stops with original reason and removes passive waiter", async (t) => {
  const f = fixture(t, { deliver: false });
  const pending = f.own(f.arm.initialize());
  await f.readyEntered.promise;
  const reason = new Error("no model delivery");
  f.controller.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(f.artifacts.length, 0);
});

test("worker replacement and concurrent commands reject before acceptance", async (t) => {
  const f = fixture(t, { holdThink: true });
  await f.own(f.arm.initialize());
  const pending = f.own(f.arm.think(request()));
  await f.thinkEntered.promise;
  await assert.rejects(f.arm.think(request(2)), /think admission/);
  new f.sandbox.window.Worker("/replacement.js");
  f.think.resolve();
  await assert.rejects(pending, /one actual result Worker required/);
  assert.equal(f.artifacts.length, 1);
});

test("stop during a held response produces no late observation artifact", async (t) => {
  const f = fixture(t, { holdThink: true });
  await f.own(f.arm.initialize());
  const pending = f.own(f.arm.think(request()));
  await f.thinkEntered.promise;
  const reason = { stop: "original" };
  f.controller.abort(reason);
  f.think.resolve();
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(f.artifacts.length, 1);
});


test("candidate route keeps its raw Ready and Worker data distinct", async (t) => {
  const f = fixture(t, { kind: "candidate" });
  const value = await f.own(f.arm.initialize());
  assert.equal(value.delivery.path, "/weights/tinyaz-m.bin");
  assert.equal(value.worker.raw.type, "ready");
  assert.equal(Object.hasOwn(value.ready, "type"), false);
  assert.equal(f.artifacts[0].parsed.delivery.sha256, sha256Bytes(model));
});

test("malformed public binding rejects before any Page or Context call", async (t) => {
  const f = fixture(t);
  assert.throws(() => createPageArm({ kind: "baseline", id: "unsafe/path", page: f.page,
    context: f.context, capabilities: f.capabilities }), /public interfaces/);
  assert.throws(() => createPageArm({ kind: "baseline", id: "valid", page: f.page,
    context: f.context, capabilities: { ...f.capabilities, signal: {} } }), /genuine signal/);
  assert.equal(f.evaluates, 0);
  assert.equal(f.context.listenerCount("response"), 0);
});
