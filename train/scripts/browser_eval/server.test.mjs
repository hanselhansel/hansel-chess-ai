// C4b-11 TEST-only owner for server.mjs. Helpers come whole from the
// shared connected-resource fixture leaf under the same local names —
// fake Vite/plugin/fs adapters only, real confined temporary roots,
// fixed-shape capabilities with controlled ACK gates. No real server
// listen, model, browser, network or Native work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { startFixtureServer } from "./server.mjs";
import { MODEL_IDENTITY } from "./schema-constants.mjs";
import { assertRejectCode } from "./test-fixtures.mjs";
import {
  SERVER_META_BYTES as META_BYTES,
  SERVER_MODEL_BYTES as MODEL_BYTES,
  fakeVite,
  hitFixture as hit,
  makeServerCaps as makeCaps,
  makeServerDeps as makeDeps,
  makeServerTree as makeTree,
  ownResourceStart,
} from "./connected-resource-test-fixtures.mjs";

const IPC = "IPC_INVALID";
const metaSha = () => createHash("sha256").update(META_BYTES).digest("hex");

test("routes stay closed until the listener ACK, then serve engine, workbench and pinned bytes", async (t) => {
  const tree = await makeTree(t);
  const vite = fakeVite();
  let release = () => {};
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const caps = makeCaps({ gate });
  const modelReal = await fsp.realpath(tree.modelRef.path);
  let modelReads = 0;
  const deps = makeDeps(vite, {
    readFile: async (p) => {
      if (p === modelReal) modelReads += 1;
      return fsp.readFile(p);
    },
  });
  const start = ownResourceStart(
    t,
    () => startFixtureServer({ ...tree, arm: "candidate", capabilities: caps }, deps),
    { release: () => release() },
  );
  await caps.calledPromise;
  assert.equal(caps.calls.length, 1);
  assert.equal(caps.calls[0].kind, "fixture");
  assert.equal(caps.calls[0].rootPid, null);
  assert.equal(caps.calls[0].expectedExecutable, null);
  assert.deepEqual(caps.calls[0].listener, { address: "127.0.0.1", port: 19001 });
  const early = await hit(vite.calls.middlewares, "/weights/tinyaz-m.bin");
  assert.equal(early.res.statusCode, 503);
  assert.equal(modelReads, 0);
  release();
  const handle = await start;
  assert.equal(handle.engineUrl, "http://127.0.0.1:19001/engine");
  assert.equal(handle.workbenchUrl, "http://127.0.0.1:19001/workbench");
  const model = await hit(vite.calls.middlewares, "/weights/tinyaz-m.bin");
  assert.equal(model.res.statusCode, 200);
  assert.deepEqual(model.res.body, MODEL_BYTES);
  const meta = await hit(vite.calls.middlewares, "/weights/tinyaz-m.bin.meta.json");
  assert.equal(meta.res.statusCode, 200);
  assert.deepEqual(meta.res.body, META_BYTES);
  const engine = await hit(vite.calls.middlewares, "/engine");
  assert.equal(engine.res.statusCode, 200);
  const page = engine.res.body.toString("utf8");
  assert.match(page, /Object\.defineProperty\(window,"__tinyazArm"/);
  assert.match(page, /writable:false,configurable:false/);
  assert.match(page, /\/fixture\.mjs/);
  assert.match(page, /"arm":"candidate"/);
  // The injected literal is provably deep-frozen and non-writable: the
  // emitted script runs in an isolated vm context and the real property
  // descriptor is inspected — no browser required.
  const script = /<script>(.*?)<\/script>/s.exec(page)[1];
  const sandbox = {};
  vm.runInNewContext(script, { window: sandbox });
  const descriptor = Object.getOwnPropertyDescriptor(sandbox, "__tinyazArm");
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.ok(Object.isFrozen(descriptor.value));
  assert.ok(Object.isFrozen(descriptor.value.model));
  const deliveries = caps.events.filter((e) => e.kind === "delivery");
  assert.equal(deliveries.length, 2);
  assert.equal(deliveries[0].payload.route, "/weights/tinyaz-m.bin");
  assert.equal(deliveries[0].payload.sha256, MODEL_IDENTITY.sha256);
  assert.equal(deliveries[0].payload.byteLength, MODEL_IDENTITY.byteLength);
  assert.equal(deliveries[1].payload.route, "/weights/tinyaz-m.bin.meta.json");
  assert.equal(deliveries[1].payload.sha256, metaSha());
  assert.equal(deliveries[1].payload.byteLength, META_BYTES.length);
  await handle.close();
  assert.equal(vite.calls.server.closed, 1);
});

test("candidate arm refuses the baseline S URL; baseline normalizes it and hides workbench", async (t) => {
  const tree = await makeTree(t);
  const candidateVite = fakeVite();
  const candidate = await ownResourceStart(t, () =>
    startFixtureServer(
      { ...tree, arm: "candidate", capabilities: makeCaps() },
      makeDeps(candidateVite),
    ),
  );
  const sUrl = await hit(candidateVite.calls.middlewares, "/weights/tinyaz-s.bin");
  assert.equal(sUrl.res.statusCode, 404);
  const other = await hit(candidateVite.calls.middlewares, "/weights/evil.txt");
  assert.equal(other.res.statusCode, 404);
  const workbench = await hit(candidateVite.calls.middlewares, "/workbench");
  assert.equal(workbench.res.statusCode, 200);
  assert.match(workbench.res.body.toString("utf8"), /\/workbench-fixture\.mjs/);
  await candidate.close();

  const baselineVite = fakeVite();
  const baseline = await ownResourceStart(t, () =>
    startFixtureServer(
      {
        ...tree,
        arm: "baseline",
        snapshotRoot: path.join(tree.inputsDir, "baseline"),
        capabilities: makeCaps(),
      },
      makeDeps(baselineVite),
    ),
  );
  assert.equal(baseline.workbenchUrl, null);
  const normalized = await hit(baselineVite.calls.middlewares, "/weights/tinyaz-s.bin");
  assert.equal(normalized.res.statusCode, 200);
  assert.deepEqual(normalized.res.body, MODEL_BYTES);
  const legacyMeta = await hit(baselineVite.calls.middlewares, "/weights/legacy.json");
  assert.equal(legacyMeta.res.statusCode, 404);
  const arbitraryBin = await hit(baselineVite.calls.middlewares, "/weights/arbitrary.bin");
  assert.equal(arbitraryBin.res.statusCode, 404);
  const hidden = await hit(baselineVite.calls.middlewares, "/workbench");
  assert.equal(hidden.res.statusCode, 404);
  await baseline.close();
});

test("invalid roots, arm, descriptor and capabilities reject before any IO", async (t) => {
  const tree = await makeTree(t);
  let ioCalls = 0;
  const spy = () => {
    ioCalls += 1;
    return Promise.reject(new Error("must not run"));
  };
  const deps = { lstat: spy, stat: spy, readFile: spy, realpath: spy, importModule: spy };
  const base = {
    snapshotRoot: tree.snapshotRoot,
    harnessRoot: tree.harnessRoot,
    dependenciesRoot: tree.dependenciesRoot,
    modelRef: tree.modelRef,
    capabilities: makeCaps(),
  };
  const rejects = (patch, d = deps) =>
    assertRejectCode(ownResourceStart(t, () => startFixtureServer({ ...base, ...patch }, d)), IPC);
  await rejects({ arm: "other" });
  await rejects({ arm: "candidate", snapshotRoot: "relative" });
  await rejects({ arm: "candidate", modelRef: { ...tree.modelRef, sha256: "0".repeat(64) } });
  await rejects({ arm: "candidate", capabilities: { signal: new AbortController().signal } });
  // Only the genuine AbortSignal brand is accepted: a duck-shaped object
  // and an AbortSignal.prototype fake both reject before the first IO.
  // cap.event is REQUIRED — a caps object without it fails before IO.
  const duck = { aborted: false, addEventListener() {}, removeEventListener() {} };
  await rejects({ arm: "candidate", capabilities: { ...makeCaps(), signal: duck } });
  const protoFake = Object.create(AbortSignal.prototype);
  await rejects({ arm: "candidate", capabilities: { ...makeCaps(), signal: protoFake } });
  await rejects({ arm: "candidate", capabilities: { ...makeCaps(), event: undefined } });
  assert.equal(ioCalls, 0);
  // The supplied symlink root is caught by the real lstat before any
  // module or model IO — fake adapters would bypass the real check.
  const link = path.join(tree.root, "link-snapshot");
  await fsp.symlink(tree.snapshotRoot, link);
  await rejects({ arm: "candidate", snapshotRoot: link }, makeDeps(fakeVite()));
  // Mixed roots fail the frozen workspace layout AFTER real
  // confinement: the baseline arm dir is a real snapshot but not the
  // selected candidate root, a model file outside inputs/model/ is not
  // the pinned path, and a metadata file outside inputs/setup/ is not
  // the retained metadata path.
  await rejects(
    { arm: "candidate", snapshotRoot: path.join(tree.inputsDir, "baseline") },
    makeDeps(fakeVite()),
  );
  const stray = path.join(tree.root, "stray.bin");
  await fsp.writeFile(stray, MODEL_BYTES);
  await rejects({ arm: "candidate", modelRef: { ...tree.modelRef, path: stray } }, makeDeps(fakeVite()));
  const strayMeta = path.join(tree.root, "stray-meta.json");
  await fsp.writeFile(strayMeta, META_BYTES);
  await rejects(
    { arm: "candidate", modelRef: { ...tree.modelRef, metadataPath: strayMeta } },
    makeDeps(fakeVite()),
  );
});

test("model bytes must hash to the pinned identity; mismatch closes the real server", async (t) => {
  const tree = await makeTree(t);
  const vite = fakeVite();
  const deps = makeDeps(vite, { sha256: () => "0".repeat(64) });
  await assertRejectCode(
    ownResourceStart(t, () => startFixtureServer({ ...tree, arm: "candidate", capabilities: makeCaps() }, deps)),
    IPC,
  );
  assert.equal(vite.calls.server.closed, 1);
});

test("vite configuration is evaluation-only with confined roots and recorded deps resolution", async (t) => {
  const tree = await makeTree(t);
  const vite = fakeVite();
  const handle = await ownResourceStart(t, () =>
    startFixtureServer({ ...tree, arm: "candidate", capabilities: makeCaps() }, makeDeps(vite)),
  );
  const options = vite.calls.options;
  assert.equal(options.root, tree.snapshotRoot);
  assert.equal(options.configFile, false);
  assert.equal(options.envFile, false);
  assert.equal(options.publicDir, false);
  assert.equal(options.appType, "custom");
  assert.equal(options.cacheDir, path.join(tree.root, "cache", "candidate"));
  assert.equal(options.server.host, "127.0.0.1");
  assert.equal(options.server.port, 0);
  assert.equal(options.server.hmr, false);
  assert.equal(options.server.watch, null);
  assert.equal(options.server.fs.strict, true);
  assert.deepEqual(options.server.fs.allow, [
    tree.snapshotRoot,
    tree.fixtureDir,
    tree.dependenciesRoot,
    path.join(tree.root, "cache", "candidate"),
  ]);
  const snapshotSrc = path.join(tree.snapshotRoot, "src");
  assert.equal(options.resolve.alias.find((a) => a.find === "@").replacement, snapshotSrc);
  assert.equal(
    options.resolve.alias.find((a) => a.find === "react").replacement,
    path.join(tree.dependenciesRoot, "react"),
  );
  const names = options.plugins.map((p) => p?.name);
  assert.equal(names[0], "tinyaz-fixture-routes");
  assert.deepEqual(names.slice(1), ["fake-@vitejs/plugin-react", "fake-@tailwindcss/vite"]);
  const foreign = await hit(vite.calls.middlewares, "/index.html");
  assert.equal(foreign.passed, true);
  await handle.close();
});

test("abort before startup rejects before IO; abort during registration closes the server", async (t) => {
  const tree = await makeTree(t);
  const aborted = new AbortController();
  aborted.abort();
  let ioCalls = 0;
  const spy = () => {
    ioCalls += 1;
    return Promise.reject(new Error("must not run"));
  };
  await assertRejectCode(
    ownResourceStart(t, () =>
      startFixtureServer(
        { ...tree, arm: "candidate", capabilities: makeCaps({ signal: aborted.signal }) },
        { lstat: spy, stat: spy, readFile: spy, realpath: spy, importModule: spy },
      ),
    ),
    IPC,
  );
  assert.equal(ioCalls, 0);

  // An abort inside the first lstat stops the confinement walk — the
  // post-await fence runs before stat/import so no fresh IO starts.
  const midIo = new AbortController();
  let lstatCalls = 0;
  let statCalls = 0;
  let importCalls = 0;
  await assertRejectCode(
    ownResourceStart(t, () =>
      startFixtureServer(
        { ...tree, arm: "candidate", capabilities: makeCaps({ signal: midIo.signal }) },
        {
          lstat: async (p) => {
            lstatCalls += 1;
            midIo.abort();
            return fsp.lstat(p);
          },
          stat: async (p) => {
            statCalls += 1;
            return fsp.stat(p);
          },
          importModule: async () => {
            importCalls += 1;
            return {};
          },
        },
      ),
    ),
    IPC,
  );
  assert.equal(lstatCalls, 1);
  assert.equal(statCalls, 0);
  assert.equal(importCalls, 0);

  const vite = fakeVite();
  const controller = new AbortController();
  const caps = makeCaps({
    signal: controller.signal,
    gate: new Promise((resolve) => {
      controller.signal.addEventListener("abort", resolve, { once: true });
    }),
  });
  const start = ownResourceStart(
    t,
    () =>
      startFixtureServer(
        { ...tree, arm: "candidate", capabilities: caps },
        makeDeps(vite),
      ),
    { release: () => controller.abort() },
  );
  await caps.calledPromise;
  controller.abort();
  await assertRejectCode(start, IPC);
  assert.equal(vite.calls.server.closed, 1);
});

test("close runs the real server close once and preserves its failure for every caller", async (t) => {
  const tree = await makeTree(t);
  const failure = new Error("real close failure");
  const vite = fakeVite({ closeError: failure });
  const handle = await ownResourceStart(t, () =>
    startFixtureServer({ ...tree, arm: "candidate", capabilities: makeCaps() }, makeDeps(vite)),
  );
  await assert.rejects(handle.close(), failure);
  await assert.rejects(handle.close(), failure);
  assert.equal(vite.calls.server.closed, 1);
});

test("a held delivery ACK holds the response; a rejected record surfaces through next(error)", async (t) => {
  const tree = await makeTree(t);
  const vite = fakeVite();
  let releaseEvent = () => {};
  const eventGate = new Promise((resolve) => {
    releaseEvent = resolve;
  });
  const caps = makeCaps({ eventGate });
  const handle = await ownResourceStart(
    t,
    () => startFixtureServer({ ...tree, arm: "candidate", capabilities: caps }, makeDeps(vite)),
    { release: () => releaseEvent() },
  );
  let settled = false;
  const pending = hit(vite.calls.middlewares, "/weights/tinyaz-m.bin").then((out) => {
    settled = true;
    return out;
  });
  while (!caps.events.some((e) => e.kind === "delivery")) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(settled, false);
  releaseEvent();
  const held = await pending;
  assert.equal(held.res.statusCode, 200);

  const failure = new Error("record sink failed");
  const vite2 = fakeVite();
  const caps2 = makeCaps({ eventError: failure });
  const handle2 = await ownResourceStart(t, () =>
    startFixtureServer({ ...tree, arm: "candidate", capabilities: caps2 }, makeDeps(vite2)),
  );
  const out = await hit(vite2.calls.middlewares, "/weights/tinyaz-m.bin");
  assert.equal(out.error, failure);
  await handle.close();
  await handle2.close();

  // A delivery ACK released after close() never serves — the post-await
  // admission recheck answers 503 instead of the recorded bytes.
  const vite3 = fakeVite();
  let releaseEvent3 = () => {};
  const caps3 = makeCaps({ eventGate: new Promise((r) => (releaseEvent3 = r)) });
  const handle3 = await ownResourceStart(
    t,
    () => startFixtureServer({ ...tree, arm: "candidate", capabilities: caps3 }, makeDeps(vite3)),
    { release: () => releaseEvent3() },
  );
  const late = hit(vite3.calls.middlewares, "/weights/tinyaz-m.bin");
  while (!caps3.events.some((e) => e.kind === "delivery")) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  await handle3.close();
  releaseEvent3();
  assert.equal((await late).res.statusCode, 503);
});
