// Per-Page generation intent against actual context ownership. Scripted
// public Worker events establish no browser/Native phase result.
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { promises as fsp } from "node:fs";
import ts from "typescript";
import { createPageArm } from "./page-arm.mjs";
import { openBrowser } from "./browser.mjs";
import { fakePlaywright, makeBrowserArgs, makeBrowserCaps, ownResourceStart } from "./connected-resource-test-fixtures.mjs";

for (const workbench of [false, true]) {
  test(`only current ${workbench ? "Workbench" : "game"} Workers retire quietly; new generation stays observed`, async (t) => {
    const sdk = fakePlaywright();
    const caps = makeBrowserCaps();
    const args = await makeBrowserArgs(t, { ...caps, manifest: { phase: "check" } });
    const browser = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => sdk }));
    const handle = workbench ? await browser.openWorkbench("http://127.0.0.1:19001/ui")
      : await browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
        baselineUrl: "http://127.0.0.1:19002/engine" });
    const arm = workbench ? handle : handle.candidate;
    const worker = new EventEmitter();
    for (const callback of arm.page.handlers.worker ?? []) callback(worker);
    // Intent is set BEFORE the synchronous close. It marks exactly these
    // already observed resources, never a permanent page/context blanket.
    arm.expectWorkerRetirement();
    worker.emit("close");
    assert.equal(caps.events.some((event) => event.payload.kind === "worker"), false);
    const next = new EventEmitter();
    for (const callback of arm.page.handlers.worker ?? []) callback(next);
    next.emit("close");
    assert.equal(caps.events.filter((event) => event.payload.kind === "worker").length, 1);
    const other = new EventEmitter();
    if (!workbench) {
      for (const callback of handle.baseline.page.handlers.worker ?? []) callback(other);
      other.emit("close");
      assert.equal(caps.events.filter((event) => event.payload.kind === "worker").length, 2);
    }
    await handle.close();
    await browser.close();
  });
}

test("every operational PageArm call selects closed fields from the actual browser handle", async (t) => {
  const sdk = fakePlaywright();
  const caps = makeBrowserCaps();
  const args = await makeBrowserArgs(t, { ...caps, manifest: { phase: "check" } });
  const browser = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => sdk }));
  const game = await browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
    baselineUrl: "http://127.0.0.1:19002/engine" });
  for (const arm of [game.candidate, game.baseline]) {
    assert.equal(typeof arm.expectWorkerRetirement, "function");
    arm.page.evaluate = async () => {};
    arm.page.url = () => "http://127.0.0.1:19001/engine";
    arm.context.on = () => {};
    arm.context.off = () => {};
  }
  const capabilities = { signal: args.capabilities.signal, manifest: { phase: "check" },
    operation: async () => {}, artifact: async () => {} };
  assert.throws(() => createPageArm({ kind: "candidate", id: "closed-guard", ...game.candidate, capabilities }),
    /PAGE_ARM_INVALID options/);
  let calls = 0;
  for (const name of ["check-engine.mjs", "phase-runners.mjs"]) {
    const source = await fsp.readFile(new URL(name, import.meta.url), "utf8");
    const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
    const expressions = [];
    const visit = (node) => {
      if (ts.isCallExpression(node) && node.expression.getText(tree) === "createPageArm") expressions.push(node);
      ts.forEachChild(node, visit);
    };
    visit(tree);
    for (const expression of expressions) {
      for (const baselineOnly of [false, true]) {
        const arm = new Function("createPageArm", "game", "capabilities", "id", "baselineOnly",
          `return ${expression.getText(tree)}`)(createPageArm, game, capabilities, "owned-arm", baselineOnly);
        assert.equal(typeof arm.initialize, "function");
        assert.equal(typeof arm.think, "function");
      }
      calls += 1;
    }
  }
  assert.equal(calls, 3);
  await game.close();
  await browser.close();
});

test("requestfailed snapshots actual SDK path/failure once without changing cohort policy", async (t) => {
  const { createWatchdogLifetime } = await import("./watchdog-lifetime.mjs");
  const lines = [];
  const diagnosticOwner = createWatchdogLifetime({ reportAwaitStage: (line) => lines.push(line) });
  const sdk = fakePlaywright();
  const caps = makeBrowserCaps();
  const args = await makeBrowserArgs(t, { ...caps, manifest: { phase: "preflight" } });
  const browser = await ownResourceStart(t, () => openBrowser({ ...args, diagnosticOwner },
    { importModule: async () => sdk }));
  const game = await browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
    baselineUrl: "http://127.0.0.1:19002/engine" });
  let urls = 0;
  let failures = 0;
  let methods = 0;
  const request = {
    url() { urls += 1; return "http://user:pass@127.0.0.1:19001/engine.html?token=secret#fragment"; },
    get failure() {
      methods += 1;
      return function () {
        assert.strictEqual(this, request);
        failures += 1;
        return { errorText: "net::ERR_ABORTED" };
      };
    },
  };
  for (const callback of game.candidate.page.handlers.requestfailed) callback(request);
  await assert.rejects(browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
    baselineUrl: "http://127.0.0.1:19002/engine" }), /requestfailed/);
  await game.close();
  await browser.close();
  await diagnosticOwner.whenSettled();
  assert.equal(caps.events.filter((item) => item.payload.kind === "requestfailed").length, 1);
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0].slice("TINYAZ_AWAIT ".length));
  assert.equal(row.stage, "driver.requestfailed");
  assert.match(row.detail, /\/engine.html/);
  assert.match(row.detail, /net::ERR_ABORTED/);
  assert.equal(urls, 1);
  assert.equal(methods, 1);
  assert.equal(failures, 1);
  assert.ok(Buffer.byteLength(lines[0]) <= 256);
  assert.equal(lines[0].includes("secret"), false);
  assert.equal(lines[0].includes("user:pass"), false);
});

for (const fault of ["failure-getter", "failure-call", "errorText-getter", "url-call"]) {
  test(`requestfailed ${fault} remains a fault with honest unavailable description`, async (t) => {
    const { createWatchdogLifetime } = await import("./watchdog-lifetime.mjs");
    const lines = [];
    const diagnosticOwner = createWatchdogLifetime({ reportAwaitStage: (line) => {
      lines.push(line);
      throw null;
    } });
    const sdk = fakePlaywright();
    const caps = makeBrowserCaps();
    const args = await makeBrowserArgs(t, { ...caps, manifest: { phase: "preflight" } });
    const browser = await ownResourceStart(t, () => openBrowser({ ...args, diagnosticOwner },
      { importModule: async () => sdk }));
    const game = await browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
      baselineUrl: "http://127.0.0.1:19002/engine" });
    let reads = 0;
    const request = {
      url() {
        if (fault === "url-call") throw false;
        return "http://127.0.0.1:19001/engine";
      },
      get failure() {
        reads += 1;
        if (fault === "failure-getter") throw undefined;
        return function () {
          if (fault === "failure-call") throw null;
          return { get errorText() {
            if (fault === "errorText-getter") throw false;
            return "net::ERR_FAILED";
          } };
        };
      },
    };
    for (const callback of game.candidate.page.handlers.requestfailed) assert.doesNotThrow(() => callback(request));
    await assert.rejects(browser.openGame({ candidateUrl: "http://127.0.0.1:19001/engine",
      baselineUrl: "http://127.0.0.1:19002/engine" }), /requestfailed/);
    await game.close();
    await browser.close();
    assert.equal(reads, 1);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /unavailable/);
    assert.equal(caps.events.filter((event) => event.payload.kind === "requestfailed").length, 1);
  });
}
