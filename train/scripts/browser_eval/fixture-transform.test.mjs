// Genuine pinned Vite import-analysis over actual source DATA. No listener,
// watcher, browser, Native collector or model/inference execution.
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { BASELINE_COMMIT } from "./schema-constants.mjs";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const fixtureDir = fileURLToPath(new URL("./", import.meta.url));
const dependencies = await fs.realpath(path.join(repo, "node_modules"));
const numericFiles = ["position.ts", "encode.ts", "policy.ts", "weights.ts", "net.ts"];

async function sources(t, candidateRuntime = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tinyaz-fixture-transform-"));
  const children = [];
  const servers = [];
  t.after(async () => {
    await Promise.all(servers.map(async (server) => {
      // Pinned Vite close snapshots optimizationResult before awaiting its
      // scan. Join that issued scan first so close owns the resulting optimizer.
      const scans = await Promise.allSettled(Object.values(server.environments)
        .map((env) => env.depsOptimizer?.scanProcessing));
      const close = await Promise.allSettled([server.close()]);
      const failures = [...scans, ...close].filter((result) => result.status === "rejected");
      if (failures.length === 1) throw failures[0].reason;
      if (failures.length > 1) throw new AggregateError(failures.map((result) => result.reason));
    }));
    await Promise.all(children.map((entry) => entry.closed));
    for (const entry of children) assert.deepEqual(entry.facts, [true, true, true]);
    await fs.rm(root, { recursive: true, force: true });
  });
  const git = (args) => {
    let child;
    const value = new Promise((resolve, reject) => {
      child = execFile("/usr/bin/git", ["--no-optional-locks", "--no-replace-objects", ...args],
        { cwd: repo, encoding: "buffer", maxBuffer: 2 * 1024 * 1024, timeout: 10000 },
        (error, stdout, stderr) => {
          if (error) reject(error);
          else if (stderr.length) reject(new Error("unexpected Git DATA stderr"));
          else resolve(stdout);
        });
    });
    const facts = [false, false, false];
    child.once("exit", () => { facts[0] = true; });
    child.stdout.once("close", () => { facts[1] = true; });
    child.stderr.once("close", () => { facts[2] = true; });
    const closed = new Promise((resolve) => child.once("close", resolve));
    children.push({ closed, facts });
    return value.finally(() => closed);
  };
  for (const role of ["candidate", "baseline"]) {
    const target = path.join(root, role);
    await fs.mkdir(path.join(target, "src/lib/chess"), { recursive: true });
    for (const filename of ["package.json", "package-lock.json", ...["think-client.ts", ...numericFiles]
      .filter((name) => role !== "baseline" || name !== "position.ts")
      .map((name) => `src/lib/chess/${name}`)]) {
      const bytes = role === "baseline" ? await git(["show", `${BASELINE_COMMIT}:${filename}`]) :
        await fs.readFile(path.join(repo, filename));
      await fs.writeFile(path.join(target, filename), bytes, { flag: "wx", mode: 0o444 });
    }
  }
  if (candidateRuntime) {
    for (const name of ["constants.ts", "checkpoint.ts", "think-runtime.ts", "search-types.ts"]) {
      await fs.writeFile(path.join(root, "candidate/src/lib/chess", name),
        await fs.readFile(path.join(repo, "src/lib/chess", name)), { flag: "wx", mode: 0o444 });
    }
  }
  await assert.rejects(git(["show", `${BASELINE_COMMIT}:src/lib/chess/position.ts`]), { code: 128 });
  const makeServer = async (role) => {
    const target = path.join(root, role);
    const cache = path.join(root, "cache", role);
    const server = await createServer({ root: target, configFile: false, envFile: false,
      publicDir: false, cacheDir: cache, appType: "custom", logLevel: "silent",
      plugins: [react(), tailwind()],
      resolve: { alias: [{ find: "@", replacement: path.join(target, "src") },
        ...["react", "react-dom", "chess.js"].map((name) => ({ find: name, replacement: path.join(dependencies, name) }))] },
      // Middleware mode creates no HTTP listener. Import analysis, plugins,
      // aliases, no-watch/no-HMR and entries match the operational binding.
      server: { hmr: false, watch: null, middlewareMode: true,
        fs: { strict: true, allow: [target, fixtureDir, dependencies, cache] } },
      optimizeDeps: { entries: [] },
    });
    servers.push(server);
    assert.equal(server.httpServer, null);
    assert.equal(server.config.server.hmr, false);
    assert.equal(server.config.server.watch, null);
    return server;
  };
  return { root, makeServer };
}

test("baseline shared fixture transforms without candidate-only position binding", { timeout: 20000 }, async (t) => {
  const f = await sources(t);
  await assert.rejects(fs.lstat(path.join(f.root, "baseline/src/lib/chess/position.ts")), { code: "ENOENT" });
  const server = await f.makeServer("baseline");
  const output = await server.transformRequest(`/@fs${path.join(fixtureDir, "fixture.mjs")}`);
  assert.ok(output?.code.includes("__tinyazEval"));
  assert.equal(output.code.includes("/lib/chess/position.ts"), false);
  assert.match(output.code, /\/src\/lib\/chess\/think-client.ts/);
  const resolved = await server.pluginContainer.resolveId("@/lib/chess/think-client.ts", path.join(fixtureDir, "fixture.mjs"));
  assert.equal(await fs.realpath(resolved.id), await fs.realpath(path.join(f.root, "baseline/src/lib/chess/think-client.ts")));
  assert.match(output.code, /fixture-numeric.mjs/);
});

test("candidate shared fixture and numeric leaf resolve the real numeric modules", { timeout: 20000 }, async (t) => {
  const f = await sources(t);
  const server = await f.makeServer("candidate");
  const entry = await server.transformRequest(`/@fs${path.join(fixtureDir, "fixture.mjs")}`);
  assert.match(entry.code, /\/src\/lib\/chess\/think-client.ts/);
  const numeric = await server.transformRequest(`/@fs${path.join(fixtureDir, "fixture-numeric.mjs")}`);
  assert.match(numeric.code, /computeNumeric/);
  for (const filename of numericFiles) {
    assert.ok(numeric.code.includes(`/src/lib/chess/${filename}`), filename);
    const resolved = await server.pluginContainer.resolveId(`@/lib/chess/${filename}`, path.join(fixtureDir, "fixture-numeric.mjs"));
    assert.equal(await fs.realpath(resolved.id), await fs.realpath(path.join(f.root, "candidate/src/lib/chess", filename)));
    assert.ok((await fs.readFile(path.join(f.root, "candidate/src/lib/chess", filename)))
      .equals(await fs.readFile(path.join(repo, "src/lib/chess", filename))));
  }
  assert.equal(numeric.code.includes("/baseline/"), false);
});

test("baseline numeric rejects before importing candidate code or fetching a model", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.window = { __tinyazArm: { arm: "baseline", model: {
    url: "/weights/tinyaz-s.bin", byteLength: 1, sha256: "a".repeat(64),
  } } };
  globalThis.fetch = () => { fetches += 1; throw new Error("unexpected model fetch"); };
  try {
    await import("./fixture.mjs");
    assert.deepEqual(Object.keys(window.__tinyazEval), ["initialize", "think", "numeric", "dispose"]);
    await assert.rejects(window.__tinyazEval.numeric({}), /numeric requires candidate arm/);
    assert.equal(fetches, 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
    globalThis.fetch = previousFetch;
  }
});


test("candidate numeric replays nonempty history before its exact model-load sentinel", { timeout: 20000 }, async (t) => {
  const f = await sources(t, true);
  const server = await f.makeServer("candidate");
  const numeric = await server.ssrLoadModule(`/@fs${path.join(fixtureDir, "fixture-numeric.mjs")}`);
  const sentinel = Object.freeze(new Error("controlled stop before model unpack/forward"));
  let loads = 0;
  await assert.rejects(numeric.computeNumeric({ id: "nonempty-history",
    initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    movesUci: ["e2e4"], expectedRawEpTarget: "e3" }, () => {
    loads += 1;
    throw sentinel;
  }), (error) => error === sentinel);
  assert.equal(loads, 1);
});
