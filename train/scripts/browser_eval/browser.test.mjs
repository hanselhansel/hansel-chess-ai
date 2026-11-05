// C4b-11 TEST-only owner for browser.mjs. Helpers come whole from the
// shared connected-resource fixture leaf under the same local names —
// fake Playwright namespace through importModule plus a real confined
// workspace; no real browser, spawn, network, model or Native work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import { openBrowser } from "./browser.mjs";
import { canonicalBytes } from "./canonical-json.mjs";
import { assertRejectCode } from "./test-fixtures.mjs";
import {
  BROWSER_ENV as ENV,
  fakePlaywright,
  makeBrowserArgs as makeArgs,
  makeBrowserCaps as makeCaps,
  ownResourceStart,
} from "./connected-resource-test-fixtures.mjs";

const IPC = "IPC_INVALID";

// The two fixture origins every game opens against.
const GAME_URLS = Object.freeze({
  candidateUrl: "http://127.0.0.1:19001/engine",
  baselineUrl: "http://127.0.0.1:19002/engine",
});

// The real security digest over a given arg set — used to prove that a
// correctly-hashed unsafe arg list is still rejected by the deny list.
const securitySha = (args) =>
  createHash("sha256")
    .update(canonicalBytes({ headless: true, chromiumSandbox: true, ignoreDefaultArgs: false, args }))
    .digest("hex");

test("both registration ACKs complete before connect; fields and launch options are exact", async (t) => {
  const fake = fakePlaywright();
  let releaseFirst;
  let releaseSecond;
  const gates = [
    new Promise((resolve) => {
      releaseFirst = resolve;
    }),
    new Promise((resolve) => {
      releaseSecond = resolve;
    }),
  ];
  const caps = makeCaps({ gates });
  const args = await makeArgs(t, caps);
  const start = ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }), {
    release: () => {
      releaseFirst();
      releaseSecond();
    },
  });
  await caps.calledPromise;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(caps.calls.length, 1);
  assert.deepEqual(caps.calls[0], {
    kind: "browser",
    rootPid: 43210,
    expectedExecutable: ENV.chromium.realPath,
    listener: null,
  });
  assert.equal(fake.calls.connects.length, 0);
  releaseFirst();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(caps.calls.length, 2);
  assert.deepEqual(caps.calls[1], {
    kind: "fixture",
    rootPid: null,
    expectedExecutable: null,
    listener: { address: "127.0.0.1", port: 18123 },
  });
  assert.equal(fake.calls.connects.length, 0);
  releaseSecond();
  const handle = await start;
  assert.equal(fake.calls.connects.length, 1);
  const options = fake.calls.launchOptions;
  assert.equal(options.executablePath, ENV.chromium.invocationPath);
  assert.equal(options.headless, true);
  assert.equal(options.chromiumSandbox, true);
  assert.equal(options.ignoreDefaultArgs, false);
  assert.equal(options.host, "127.0.0.1");
  assert.equal(options.port, 0);
  assert.deepEqual(options.args, ENV.launch.args);
  assert.ok(options.downloadsPath.startsWith(args.workspaceRoot));
  assert.ok(options.env.TMPDIR.startsWith(args.workspaceRoot));
  assert.ok(Object.isFrozen(handle));
  await handle.close();
});

test("environment, launch literals, workspace and capabilities reject before any browser work", async (t) => {
  let imports = 0;
  const importModule = async () => {
    imports += 1;
    return fakePlaywright();
  };
  const caps = makeCaps();
  const ws = await makeArgs(t, caps);
  const base = { environment: ENV, workspaceRoot: ws.workspaceRoot, capabilities: caps };
  const bad = (patch) =>
    assertRejectCode(ownResourceStart(t, () => openBrowser({ ...base, ...patch }, { importModule })), IPC);
  await bad({ workspaceRoot: "relative" });
  await bad({ environment: { ...ENV, launch: { ...ENV.launch, host: "0.0.0.0" } } });
  await bad({ environment: { ...ENV, launch: { ...ENV.launch, headless: false } } });
  await bad({
    environment: { ...ENV, launch: { ...ENV.launch, viewport: { width: 800, height: 800 } } },
  });
  await bad({ environment: { ...ENV, launch: { ...ENV.launch, args: [42] } } });
  await bad({ environment: { ...ENV, chromium: { ...ENV.chromium, realPath: "rel" } } });
  await bad({ capabilities: { signal: caps.signal } });
  // Only the genuine AbortSignal brand is accepted — a duck-shaped
  // object fails before any browser work.
  const duck = { aborted: false, addEventListener() {}, removeEventListener() {} };
  await bad({ capabilities: { ...caps, signal: duck } });
  // The exact security binding: a wrong digest, a mutated arg set with
  // the stale digest, and a correctly-hashed unsafe arg list all fail.
  await bad({
    environment: { ...ENV, launch: { ...ENV.launch, securityOptionsSha256: "b".repeat(64) } },
  });
  await bad({ environment: { ...ENV, launch: { ...ENV.launch, args: ["--force-field"] } } });
  await bad({
    environment: {
      ...ENV,
      launch: {
        ...ENV.launch,
        args: ["--no-sandbox"],
        securityOptionsSha256: securitySha(["--no-sandbox"]),
      },
    },
  });
  assert.equal(imports, 0);
});

test("a non-loopback endpoint rejects and closes the real server before connect", async (t) => {
  const fake = fakePlaywright({ ws: "ws://169.254.1.1:9999/x" });
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  await assertRejectCode(ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake })), IPC);
  assert.equal(fake.calls.server.closed, 1);
  assert.equal(fake.calls.connects.length, 0);
  assert.equal(caps.calls.length, 0);
});

test("openGame creates two isolated contexts gated to the recorded fixture origins", async (t) => {
  const fake = fakePlaywright();
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  const game = await handle.openGame(GAME_URLS);
  assert.equal(fake.calls.contexts.length, 2);
  assert.notEqual(game.candidate.context, game.baseline.context);
  assert.equal(game.candidate.page.gotos[0], "http://127.0.0.1:19001/engine");
  assert.equal(game.baseline.page.gotos[0], "http://127.0.0.1:19002/engine");
  const handler = game.candidate.context.routes[0].handler;
  // A Playwright Request.url is a METHOD — the public shape, not a
  // string property.
  const run = async (url) => {
    const route = {
      request: () => ({ url: () => url }),
      hits: [],
      continue: async () => route.hits.push("continue"),
      abort: async () => route.hits.push("abort"),
    };
    await handler(route);
    return route.hits[0];
  };
  assert.equal(await run("http://127.0.0.1:19001/weights/tinyaz-m.bin"), "continue");
  assert.equal(await run("http://127.0.0.1:19002/fixture.mjs"), "continue");
  assert.equal(await run("http://169.254.169.254/meta"), "abort");
  assert.equal(await run("file:///etc/passwd"), "abort");
  await game.close();
  assert.equal(game.candidate.context.closed, 1);
  assert.equal(game.baseline.context.closed, 1);
  await handle.close();
});

test("openWorkbench returns one candidate context and refuses non-fixture origins", async (t) => {
  const fake = fakePlaywright();
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  const workbench = await handle.openWorkbench("http://127.0.0.1:19001/workbench");
  assert.equal(fake.calls.contexts.length, 1);
  assert.equal(workbench.page.gotos[0], "http://127.0.0.1:19001/workbench");
  await workbench.close();
  assert.equal(workbench.context.closed, 1);
  await assertRejectCode(handle.openWorkbench("https://external.example/"), IPC);
  await handle.close();
});

test("a partial openGame failure closes already-created contexts", async (t) => {
  const fake = fakePlaywright({ failContext: 1 });
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  await assert.rejects(handle.openGame(GAME_URLS), /context creation failed/);
  assert.equal(fake.calls.contexts[0].closed, 1);
  await handle.close();
});

test("unexpected process exit or disconnect is sticky; expected close marks teardown first", async (t) => {
  const fake = fakePlaywright();
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  fake.calls.proc.emit("exit");
  await assertRejectCode(
    handle.openGame(GAME_URLS),
    IPC,
  );
  await handle.close();
  assert.equal(fake.calls.browser.closed, 1);
  assert.equal(fake.calls.server.closed, 1);
  const faults = caps.events.filter((e) => e.kind === "fault");
  assert.ok(faults.some((e) => e.payload.kind === "browser process"));

  const fake2 = fakePlaywright();
  const caps2 = makeCaps();
  const args2 = await makeArgs(t, caps2);
  const handle2 = await ownResourceStart(t, () => openBrowser(args2, { importModule: async () => fake2 }));
  const closing = handle2.close();
  fake2.calls.proc.emit("exit");
  fake2.calls.browser.emit("disconnected");
  await closing;
  assert.equal(caps2.events.filter((e) => e.kind === "fault").length, 0);
});

test("abort rejects startup and starts the real graceful close", async (t) => {
  const fake = fakePlaywright();
  const controller = new AbortController();
  const caps = makeCaps({
    signal: controller.signal,
    gates: [
      new Promise((resolve) => controller.signal.addEventListener("abort", resolve, { once: true })),
      Promise.resolve(),
    ],
  });
  const args = await makeArgs(t, caps);
  const start = ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }), {
    release: () => controller.abort(),
  });
  await caps.calledPromise;
  controller.abort();
  await assertRejectCode(start, IPC);
  assert.equal(fake.calls.server.closed, 1);
});

test("close marks expected, runs real closes once and preserves the first failure", async (t) => {
  const first = new Error("browser close failed");
  const fake = fakePlaywright({ closeErrors: [first, new Error("server close failed")] });
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  // The memoized promise arms BEFORE the first SDK close effect — every
  // caller, including a reentrant one, shares the ONE close attempt.
  const closing1 = handle.close();
  const closing2 = handle.close();
  assert.strictEqual(closing1, closing2);
  await assert.rejects(closing1, { message: "browser close failed" });
  await assert.rejects(handle.close(), { message: "browser close failed" });
  assert.equal(fake.calls.browser.closed, 1);
  assert.equal(fake.calls.server.closed, 1);
  assert.equal(first.message, "browser close failed");
});

test("an abort at the first mkdir never reaches launch or registration", async (t) => {
  const fake = fakePlaywright();
  const controller = new AbortController();
  const caps = makeCaps({ signal: controller.signal });
  const args = await makeArgs(t, caps);
  await assertRejectCode(
    ownResourceStart(t, () =>
      openBrowser(args, {
        importModule: async () => fake,
        mkdir: async (p, opts) => {
          controller.abort();
          return fsp.mkdir(p, opts);
        },
      }),
    ),
    IPC,
  );
  assert.equal(fake.calls.launchOptions, null);
  assert.equal(fake.calls.connects.length, 0);
  assert.equal(caps.calls.length, 0);
});

test("close rejects an arbitrary nil first value and still closes everything", async (t) => {
  // A genuine nil rejection: the fake cannot throw null through its
  // closeErrors guard, so the real fake close body is bound directly.
  // BOTH null and undefined keep the explicit presence flag.
  for (const nil of [null, undefined]) {
    const fake = fakePlaywright();
    const caps = makeCaps();
    const args = await makeArgs(t, caps);
    const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
    fake.calls.browser.close = async () => {
      fake.calls.browser.closed += 1;
      throw nil;
    };
    const outcome = await handle.close().then(
      () => ({ resolved: true }),
      (error) => ({ resolved: false, error }),
    );
    assert.strictEqual(outcome.resolved, false);
    assert.strictEqual(outcome.error, nil);
    assert.equal(fake.calls.browser.closed, 1);
    assert.equal(fake.calls.server.closed, 1);
  }
});

test("an abort-driven close rejection is handled and preserved for callers", async (t) => {
  const failure = new Error("browser close failed");
  const fake = fakePlaywright({ closeErrors: [failure] });
  const controller = new AbortController();
  const caps = makeCaps({ signal: controller.signal });
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  controller.abort();
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(handle.close(), { message: "browser close failed" });
  assert.equal(fake.calls.browser.closed, 1);
  assert.equal(fake.calls.server.closed, 1);
});

test("worker close is quiet under expected teardown, sticky in a cohort phase, recorded in a check phase", async (t) => {
  const makeWorker = () => ({
    handlers: {},
    on(name, fn) {
      (this.handlers[name] ??= []).push(fn);
    },
    emit(name) {
      for (const fn of this.handlers[name] ?? []) fn();
    },
    async close() {},
  });

  // Expected game teardown marks before the real close — a worker
  // dying with its page records no fault.
  const fake = fakePlaywright();
  const caps = makeCaps();
  const args = await makeArgs(t, caps);
  const handle = await ownResourceStart(t, () => openBrowser(args, { importModule: async () => fake }));
  const game = await handle.openGame(GAME_URLS);
  const quietWorker = makeWorker();
  for (const fn of game.candidate.page.handlers.worker ?? []) fn(quietWorker);
  await game.close();
  quietWorker.emit("close");
  assert.equal(caps.events.filter((e) => e.kind === "fault").length, 0);
  await handle.close();

  // In the compare phase an unexpected worker close is sticky — the
  // fact records and the next ordinary call fails.
  const fake2 = fakePlaywright();
  const caps2 = makeCaps();
  const args2 = await makeArgs(t, { ...caps2, manifest: { phase: "compare" } });
  const handle2 = await ownResourceStart(t, () => openBrowser(args2, { importModule: async () => fake2 }));
  const game2 = await handle2.openGame(GAME_URLS);
  const worker2 = makeWorker();
  for (const fn of game2.candidate.page.handlers.worker ?? []) fn(worker2);
  worker2.emit("close");
  await assertRejectCode(
    handle2.openGame(GAME_URLS),
    IPC,
  );
  const faults2 = caps2.events.filter((e) => e.kind === "fault");
  assert.ok(faults2.some((e) => e.payload.kind === "worker"));
  await handle2.close();

  // A deliberate check phase records the same actual fact without
  // poisoning the run — the next game still opens.
  const fake3 = fakePlaywright();
  const caps3 = makeCaps();
  const args3 = await makeArgs(t, { ...caps3, manifest: { phase: "check" } });
  const handle3 = await ownResourceStart(t, () => openBrowser(args3, { importModule: async () => fake3 }));
  const game3 = await handle3.openGame(GAME_URLS);
  const worker3 = makeWorker();
  for (const fn of game3.candidate.page.handlers.worker ?? []) fn(worker3);
  worker3.emit("close");
  const faults3 = caps3.events.filter((e) => e.kind === "fault");
  assert.ok(faults3.some((e) => e.payload.kind === "worker"));
  const again = await handle3.openGame(GAME_URLS);
  await again.close();
  await handle3.close();
});
