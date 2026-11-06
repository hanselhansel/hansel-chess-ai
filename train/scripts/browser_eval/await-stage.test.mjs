// Passive await diagnostics only. No Native, child, model or phase execution.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import ts from "typescript";
import { createNativeHorizon } from "./process-horizon.mjs";
import { makeRecorder } from "./test-fixtures.mjs";
import { phaseRecorderLifetime } from "./records.mjs";
import { createWatchdogLifetime, observeAwaitStage } from "./watchdog-lifetime.mjs";

const gate = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const decode = (line) => JSON.parse(line.slice("TINYAZ_AWAIT ".length));

test("entry and real settlement preserve the exact issued promise and paired call identity", async () => {
  const lines = [];
  let holds = 0;
  const owner = createWatchdogLifetime({
    reportAwaitStage: (line) => lines.push(line),
    createHold: () => { holds += 1; return () => {}; },
  });
  const held = gate();
  let issued = 0;
  const observed = observeAwaitStage(owner, "phase", "cleanup.run", () => {
    issued += 1;
    return held.promise;
  });
  assert.equal(observed, held.promise);
  assert.equal(issued, 1);
  assert.deepEqual(lines.map(decode), [
    { seq: 0, call: 0, scope: "phase", stage: "cleanup.run", state: "entered" },
  ]);
  const result = Object.freeze({ original: true });
  held.resolve(result);
  assert.equal(await observed, result);
  assert.deepEqual(lines.map(decode).map(({ state }) => state), ["entered", "fulfilled"]);
  assert.equal(decode(lines[0]).call, decode(lines[1]).call);
  await owner.whenSettled();
  assert.equal(holds, 0, "descriptions never register required lifetime debt");
});

test("throwing and reentrant reporters cannot replace original results or arbitrary causes", async () => {
  for (const mode of ["throw", "reenter"]) {
    let owner;
    let reports = 0;
    let nestedIssues = 0;
    owner = createWatchdogLifetime({ reportAwaitStage: () => {
      reports += 1;
      if (mode === "throw") throw undefined;
      const result = observeAwaitStage(owner, "phase", "shutdown.resource", () => {
        nestedIssues += 1;
        return "nested unchanged";
      });
      assert.equal(result, "nested unchanged");
    } });
    const result = Object.freeze({ original: true });
    const actual = Promise.resolve(result);
    assert.equal(observeAwaitStage(owner, "phase", "cleanup.run", () => actual), actual);
    assert.equal(await actual, result);
    assert.equal(reports, 2);
    assert.equal(nestedIssues, mode === "reenter" ? 2 : 0);
    for (const cause of [null, undefined, false, 0, "", new Error("original")]) {
      const rejected = Promise.reject(cause);
      const returned = observeAwaitStage(owner, "selftest", "records.finalize", () => rejected);
      assert.equal(returned, rejected);
      let caught = false;
      try {
        await returned;
      } catch (error) {
        caught = true;
        assert.equal(error, cause);
      }
      assert.equal(caught, true);
      let syncCaught = false;
      try {
        observeAwaitStage(owner, "phase", "records.containment", () => { throw cause; });
      } catch (error) {
        syncCaught = true;
        assert.equal(error, cause);
      }
      assert.equal(syncCaught, true);
    }
    await owner.whenSettled();
  }
});

test("fixed labels and scopes bound serialized records independently of caller work", async () => {
  const lines = [];
  const owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const pending = [];
  for (let index = 0; index < 50; index += 1) {
    const actual = Promise.resolve(index);
    const result = observeAwaitStage(owner, "phase", "shutdown.lifetime", () => actual);
    assert.equal(result, actual);
    pending.push(result);
  }
  assert.deepEqual(await Promise.all(pending), Array.from({ length: 50 }, (_, index) => index));
  assert.equal(lines.length, 64);
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
  assert.ok(lines.reduce((total, line) => total + Buffer.byteLength(line), 0) <= 16384);
  assert.deepEqual(lines.map(decode).map(({ seq }) => seq), Array.from({ length: 64 }, (_, index) => index));
  const invalidLines = [];
  const quiet = createWatchdogLifetime({ reportAwaitStage: (line) => invalidLines.push(line) });
  for (const [scope, label] of [["other", "cleanup.run"], ["phase", "x".repeat(10000)]]) {
    const original = Promise.resolve(label);
    assert.equal(observeAwaitStage(quiet, scope, label, () => original), original);
    assert.equal(await original, label);
  }
  assert.deepEqual(invalidLines, []);
});

test("omitted diagnostics preserve the original value and do not access then getters", async () => {
  const owner = createWatchdogLifetime();
  const actual = Promise.resolve("original");
  let reads = 0;
  const value = Object.defineProperty({}, "then", { get() { reads += 1; throw null; } });
  assert.equal(observeAwaitStage(owner, "phase", "cleanup.run", () => value), value);
  assert.equal(reads, 0);
  assert.equal(observeAwaitStage(owner, "phase", "cleanup.run", () => actual), actual);
  assert.equal(await actual, "original");
});

test("frozen original rejection retains bounded safe code/message/detail", async () => {
  const lines = [];
  const owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const cause = Object.freeze(Object.assign(new Error("controlled raw write"), {
    code: "CONTROLLED_WRITE", detail: "known original file failure",
  }));
  const original = Promise.reject(cause);
  const observed = observeAwaitStage(owner, "phase", "records.finalize", () => original);
  assert.equal(observed, original);
  await assert.rejects(observed, (error) => error === cause);
  const rejected = lines.map(decode).find((record) => record.state === "rejected");
  assert.equal(rejected.code, cause.code);
  assert.equal(rejected.message, cause.message);
  assert.equal(rejected.detail, cause.detail);
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
});

test("hostile rejection accessors cannot reenter formatting or render raw objects", async () => {
  const lines = [];
  let owner;
  let toStringCalls = 0;
  let getterCalls = 0;
  let nestedIssues = 0;
  let causeGetterReads = 0;
  const rawObject = { toString() {
    toStringCalls += 1;
    throw null;
  } };
  const cause = Object.freeze(Object.defineProperties({}, {
    code: { get() {
      getterCalls += 1;
      throw undefined;
    } },
    message: { get() {
      getterCalls += 1;
      return rawObject;
    } },
    detail: { get() {
      getterCalls += 1;
      observeAwaitStage(owner, "phase", "records.containment", () => {
        nestedIssues += 1;
        return Promise.resolve();
      });
      return '\u0000"\\\ud83d\ude00'.repeat(10000);
    } },
    cause: { get() {
      causeGetterReads += 1;
      throw undefined;
    } },
  }));
  owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const original = Promise.reject(cause);
  assert.equal(observeAwaitStage(owner, "phase", "records.finalize", () => original), original);
  await assert.rejects(original, (error) => error === cause);
  assert.equal(getterCalls, 3);
  assert.equal(nestedIssues, 1);
  assert.equal(causeGetterReads, 1);
  assert.equal(toStringCalls, 0);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
  const rejected = decode(lines[1]);
  assert.equal(rejected.state, "rejected");
  assert.equal(Object.hasOwn(rejected, "code"), false);
  assert.equal(Object.hasOwn(rejected, "message"), false);
  assert.equal(typeof rejected.detail, "string");
});

test("one-level cause detail wins over verbose wrapper metadata in the full frame", async () => {
  const lines = [];
  const detail = "ENOENT lstat inputs/xxxxxxxxxxxxxxxxxxxx.bin a=false b=ok t=ok";
  const first = Object.freeze(Object.assign(new Error("artifact-store STORE_ACCOUNTING: invalid sample"), {
    code: "STORE_ACCOUNTING", detail,
  }));
  const wrapper = Object.freeze(Object.assign(new Error("wrapper-".repeat(1000), { cause: first }), {
    code: "RECORDER_STICKY", detail: "verbose top-level detail-".repeat(1000),
  }));
  const owner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const original = Promise.reject(wrapper);
  assert.equal(observeAwaitStage(owner, "phase", "records.finalize", () => original), original);
  await assert.rejects(original, (error) => error === wrapper);
  const marker = decode(lines.at(-1));
  assert.equal(marker.code, "RECORDER_STICKY");
  assert.equal(marker.causeCode, "STORE_ACCOUNTING");
  assert.equal(marker.detail, detail);
  assert.equal(wrapper.cause, first);
  assert.ok(Buffer.byteLength(lines.at(-1)) <= 256);
});

test("one-level hostile cause access and reporter failure cannot recurse or replace rejection", async () => {
  const lines = [];
  let owner;
  let deepReads = 0;
  let nestedIssues = 0;
  let renders = 0;
  const raw = { toString() {
    renders += 1;
    throw null;
  } };
  const first = Object.freeze(Object.defineProperties({}, {
    code: { get() { throw undefined; } },
    message: { get() { return raw; } },
    detail: { get() {
      observeAwaitStage(owner, "phase", "records.containment", () => {
        nestedIssues += 1;
        return Promise.resolve();
      });
      return "ENOENT lstat cache/retained.bin";
    } },
    cause: { get() {
      deepReads += 1;
      throw null;
    } },
  }));
  const wrapper = Object.freeze(new Error("wrapper", { cause: first }));
  owner = createWatchdogLifetime({ reportAwaitStage: (line) => {
    lines.push(line);
    throw false;
  } });
  const original = Promise.reject(wrapper);
  assert.equal(observeAwaitStage(owner, "phase", "records.finalize", () => original), original);
  await assert.rejects(original, (error) => error === wrapper);
  assert.equal(deepReads, 0);
  assert.equal(nestedIssues, 1);
  assert.equal(renders, 0);
  assert.equal(lines.length, 2);
  assert.equal(decode(lines[1]).detail, "ENOENT lstat cache/retained.bin");
  assert.ok(lines.every((line) => Buffer.byteLength(line) <= 256));
});

test("genuine Recorder retains falsey firsts after correctable rejection without overwrite", async () => {
  const firstError = Object.freeze(Object.assign(new Error("first"), { code: "CONTROLLED_WRITE" }));
  for (const [first, sticky] of [[null, "null"], [undefined, "undefined"], [false, "false"],
    [firstError, "CONTROLLED_WRITE"]]) {
    const open = fsp.open;
    let env;
    let armed = false;
    fsp.open = async function (...args) {
      const file = await Reflect.apply(open, this, args);
      if (args[0].endsWith("/check/events.jsonl")) {
        const write = file.write;
        file.write = function (...values) {
          if (armed) {
            throw first;
          }
          return Reflect.apply(write, this, values);
        };
      }
      return file;
    };
    try {
      env = await makeRecorder();
      await assert.rejects(env.recorder.writeManifest(), (error) => error.code === "RECORDER_STATE");
      armed = true;
      let caught = false;
      try {
        await env.recorder.appendEvent({ kind: "resource", payload: { accountingValid: false } });
      } catch (error) {
        caught = true;
        assert.equal(error, first);
      }
      assert.equal(caught, true);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await assert.rejects(env.recorder.stopOrdinary(), (error) => {
          assert.equal(error.code, "RECORDER_STICKY");
          assert.equal(error.message, `records RECORDER_STICKY: ${sticky}`);
          assert.equal(Object.hasOwn(error, "cause"), true);
          assert.equal(error.cause, first);
          return true;
        });
      }
    } finally {
      armed = false;
      if (env) {
        await env.recorder.closeIncompleteEvidence().catch(() => {});
        await phaseRecorderLifetime(env.recorder).whenSettled();
      }
      fsp.open = open;
      if (env) {
        await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
      }
    }
  }
});

test("transport description reads monitor info only after primary stop/narrow and preserves arbitrary first values", async () => {
  const source = await fsp.readFile(new URL("./watchdog.mjs", import.meta.url), "utf8");
  const tree = ts.createSourceFile("watchdog.mjs", source, ts.ScriptTarget.Latest, true);
  let expression;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === "onError") expression = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression);
  for (const primary of [Object.assign(new Error("original IPC error"), { code: "IPC_INVALID" }),
    Object.assign(new Error("original disconnect"), { code: "IPC_DISCONNECT" }), null, undefined]) {
    for (const mode of ["missing", "absent", "throwing", "reentrant"]) {
      const horizon = createNativeHorizon();
      horizon.initialize(600000);
      const records = [];
      const expectedReason = primary?.code === "IPC_DISCONNECT" ? "IPC_DISCONNECT" : "IPC_INVALID";
      let reason = null;
      let described;
      const latchStop = (code) => {
        if (reason !== null) return;
        reason = code;
        horizon.narrow(5000);
      };
      const getter = () => {
        assert.equal(records[0], primary);
        assert.equal(reason, expectedReason);
        assert.equal(horizon.reader.read(), 5000);
        if (mode === "throwing") throw null;
        if (mode === "absent") return null;
        latchStop("LATE_OTHER_REASON");
        return { detail: "observed collector diagnostic" };
      };
      const handler = new Function("recordFault", "latchStop", "faultEvent", "monitor",
        `return ${expression.getText(tree)}`)((error) => records.push(error), latchStop,
      async (error) => { described = error; }, mode === "missing" ? {} : { fault: getter });
      handler(primary);
      assert.equal(records.length, 1);
      assert.equal(records[0], primary);
      assert.equal(reason, expectedReason);
      if (mode === "reentrant") {
        assert.equal(described.cause, primary);
        assert.equal(described.code, primary?.code ?? "FAULT");
        assert.ok(described.message.includes("observed collector diagnostic"));
      } else {
        assert.equal(described, primary);
      }
    }
  }
});

test("actual failed-finalize handler retains primary and secondary arbitrary values", async () => {
  const source = await fsp.readFile(new URL("./watchdog-shutdown.mjs", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("watchdog-shutdown.mjs", source, ts.ScriptTarget.Latest, true);
  let handler;
  const find = (node) => {
    if (ts.isArrowFunction(node) && node.getText(parsed).includes('stage("records.containment"') &&
      node.getText(parsed).includes("return null;") && node.parameters.length === 1) {
      handler = node;
    }
    ts.forEachChild(node, find);
  };
  find(parsed);
  assert.ok(handler);
  for (const primary of [null, undefined, Object.freeze(new Error("primary"))]) {
    for (const secondary of [null, undefined, Object.freeze(new Error("secondary"))]) {
      const faults = [];
      let calls = 0;
      const state = { records: { closeIncompleteEvidence: () => {
        calls += 1;
        return Promise.reject(secondary);
      } } };
      const actual = new Function("control", "stage", "state", `return (${handler.getText(parsed)})`)(
        { recordFault: (error) => faults.push(error) },
        (label, issue) => {
          assert.equal(label, "records.containment");
          assert.equal(faults[0], primary);
          return issue();
        }, state);
      assert.equal(await actual(primary), null);
      assert.equal(calls, 1);
      assert.equal(faults[0], primary);
      assert.equal(faults[1], secondary);
      assert.equal(faults.length, 2);
    }
  }
});
