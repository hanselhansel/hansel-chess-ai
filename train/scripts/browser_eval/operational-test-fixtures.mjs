// TEST-only public SDK scripts and raw observations. No engine inference.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { Chess } from "chess.js";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { fixtureWorkspace, fixtureManifest } from "./test-fixtures.mjs";
import { BASELINE_COMMIT, REQUIRED_CHECK_IDS, MODEL_IDENTITY } from "./schema-constants.mjs";

const modelBytes = await readFile(new URL("../../../public/weights/tinyaz-m.bin", import.meta.url));
const load = async (name) => JSON.parse(await readFile(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));
const fixtures = { protocol: await load("browser-protocol.json"), openings: await load("browser-openings.json"),
  parity: await load("browser-parity.json") };
const model = { mode: "trained", modelName: "tinyaz-m", sha256: MODEL_IDENTITY.sha256,
  packedVersion: 1, parameterCount: MODEL_IDENTITY.parameterCount, byteLength: MODEL_IDENTITY.byteLength,
  channels: 128, sourceId: 1 };
const defer = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};

export function makeOperationalFixture(t, { phase = "preflight", fault = null, holdThink = false, baselineResultFactory = null } = {}) {
  const workspace = fixtureWorkspace();
  const prerequisites = { check: [], parity: ["check"], preflight: ["check", "parity"], compare: ["check", "parity", "preflight"] }[phase]
    .map((parent) => ({ phase: parent, runId: `fixture-${parent}`,
      completion: { path: `${parent}/completion.json`, byteLength: 1, sha256: "a".repeat(64) } }));
  const manifest = fixtureManifest({ workspace, phase, prerequisites });
  const controller = new AbortController();
  const lifetime = createWatchdogLifetime();
  const calls = { operations: [], opens: [], closes: 0, thinks: [], evaluations: 0 };
  const artifacts = [];
  const events = [];
  const bodies = new Set();
  const contexts = new Set();
  const gate = defer();
  const thinkEntered = defer();
  let liveOperation = false;
  const capabilities = { runId: manifest.runId, manifest, signal: controller.signal,
    async operation(kind, id, work) {
      assert.equal(liveOperation, false, "operations are sequential, never nested");
      calls.operations.push({ kind, id });
      if (controller.signal.aborted) throw controller.signal.reason;
      liveOperation = true;
      try {
        const result = await work({ remainingMs: kind === "readiness" ? 30000 : 90000, signal: controller.signal });
        assert.deepEqual(Object.keys(result).sort(), ["detail", "evidencePaths", "status"]);
        return result;
      } finally {
        liveOperation = false;
      }
    },
    async artifact(filename, mode, chunks) {
      if (controller.signal.aborted) throw controller.signal.reason;
      const parts = [];
      for await (const chunk of chunks) {
        assert.ok(chunk.length <= 65536);
        parts.push(Buffer.from(chunk));
      }
      const bytes = Buffer.concat(parts);
      const ref = { path: filename, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
      artifacts.push({ filename, mode, bytes, ref });
      return ref;
    },
    async event(kind, payload) {
      if (controller.signal.aborted) throw controller.signal.reason;
      events.push({ kind, payload: structuredClone(payload) });
    },
  };
  class Context extends EventEmitter {
    constructor() {
      super();
      this.closed = false;
      contexts.add(this);
    }
    async close() {
      if (!this.closed) {
        this.closed = true;
        calls.closes += 1;
      }
    }
  }
  class Page {
    constructor(kind, context) {
      this.kind = kind;
      this.context = context;
      this.workers = [];
      const owner = this;
      class Worker {
        constructor() { this.listeners = []; owner.workers.push(this); }
        addEventListener(name, listener) { assert.equal(name, "message"); this.listeners.push(listener); }
        emit(raw) { for (const listener of this.listeners) listener({ data: raw }); }
      }
      const session = kind === "candidate" ? "fixture-candidate-session" : null;
      const ready = kind === "candidate" ? { engineSessionId: session, modelIdentity: model,
        initialBackend: "worker", initialBackendEpoch: 1 } : { paramCount: 2426706, seed: 0, source: "lichess-2013-01" };
      this.sandbox = { window: { Worker }, structuredClone };
      this.sandbox.window.__tinyazEval = {
        initialize: async () => {
          const worker = new this.sandbox.window.Worker();
          const route = kind === "candidate" ? "/weights/tinyaz-m.bin" : "/weights/tinyaz-s.bin";
          context.emit("response", { url: () => `http://127.0.0.1:43210${route}`, status: () => 200, body: async () => modelBytes });
          worker.emit(kind === "candidate" ? { type: "ready", protocolVersion: 1, engineSessionId: session,
            backendEpoch: 1, modelIdentity: model } : { type: "ready", ...ready });
          return ready;
        },
        think: async (request) => {
          calls.thinks.push({ kind, request: structuredClone(request) });
          thinkEntered.resolve();
          if (holdThink) await gate.promise;
          const board = new Chess(request.position.initialFen);
          for (const uci of request.position.movesUci) board.move(uci);
          const move = board.moves({ verbose: true })[0];
          const result = kind === "baseline" && baselineResultFactory !== null ?
            baselineResultFactory(request.position, request.requestedVisits) : { uci: move.from + move.to + (move.promotion ?? ""), visits: fault === "visits" ? 63 : 64,
            value: 0, ms: 1, children: [], heatmap: {} };
          let response;
          let raw;
          if (kind === "candidate") {
            const context = { engineSessionId: session, ...request };
            const outcome = { kind: "move", result, completedVisits: result.visits, searchMs: 1 };
            response = { ...outcome, context, modelIdentity: model, backend: "worker", backendEpoch: 1,
              attempts: [{ backend: "worker", disposition: "complete", completedVisits: result.visits }] };
            raw = { type: "result", protocolVersion: 1, engineSessionId: session,
              backendEpoch: 1, modelIdentity: model, context, outcome };
          } else {
            response = result;
            raw = { type: "result", id: request.requestId, result };
          }
          this.workers.at(-1).emit(raw);
          return response;
        },
      };
      this.realm = vm.createContext(this.sandbox);
    }
    url() { return "http://127.0.0.1:43210/engine"; }
    async evaluate(fn, argument) {
      calls.evaluations += 1;
      if (fault === "evaluate") throw new Error("scripted Page failure");
      this.realm.argument = structuredClone(argument);
      return structuredClone(await vm.runInContext(`(${fn.toString()})(argument)`, this.realm));
    }
  }
  const browser = {
    async openGame(urls) {
      calls.opens.push(structuredClone(urls));
      if (fault === "open") throw new Error("scripted open failure");
      const candidate = new Context();
      const baseline = new Context();
      const kind = urls.candidateUrl.includes("baseline") ? "baseline" : "candidate";
      return { candidate: { context: candidate, page: new Page(kind, candidate) },
        baseline: { context: baseline, page: new Page("baseline", baseline) },
        async close() { await baseline.close(); await candidate.close(); } };
    },
    async openWorkbench() { throw new Error("scripted Workbench open failure"); },
  };
  const selftestEvidence = { completionRef: { path: "preflight/selftest/completion.json", byteLength: 1, sha256: "a".repeat(64) },
    final: { runId: `${manifest.runId}:watchdog-selftest`, workspaceId: manifest.workspaceId,
      status: "inconclusive", exitCode: 2, stopReason: "HEARTBEAT_TIMEOUT", unplannedFaultCount: 0,
      summary: { scoredGames: 0 }, cleanup: { verified: true },
      requiredChecks: REQUIRED_CHECK_IDS["watchdog-selftest"].map((id) => ({ id, status: "passed" })) } };
  const resources = { browser, servers: { candidate: { engineUrl: "http://127.0.0.1:43210/candidate", workbenchUrl: "http://127.0.0.1:43210/workbench" },
    baseline: { engineUrl: "http://127.0.0.1:43210/baseline" } }, workspaceRoot: "/fixture-workspace",
  commonIdentity: workspace.commonIdentity, lifetime, fixtures: structuredClone(fixtures), selftestEvidence };
  const own = (promise) => {
    bodies.add(promise);
    promise.then(() => bodies.delete(promise), () => bodies.delete(promise));
    return promise;
  };
  t.after(async () => {
    controller.abort(new Error("fixture teardown"));
    gate.resolve();
    await Promise.allSettled([...bodies]);
    for (const context of contexts) await context.close();
    assert.equal([...contexts].every((context) => context.closed && context.listenerCount("response") === 0), true);
    await lifetime.whenSettled();
  });
  return { manifest, capabilities, resources, controller, calls, artifacts, events, own,
    releaseThink: gate.resolve, thinkEntered: thinkEntered.promise };
}


// Actual frozen result construction only. Never execute search/forward or
// produce a unit claim that these controlled visits were an actual search.
export async function loadLegacyResultFactory() {
  const source = execFileSync("/usr/bin/git", ["--no-optional-locks", "--no-replace-objects", "show",
    `${BASELINE_COMMIT}:src/lib/chess/mcts.ts`], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)), maxBuffer: 2 * 1024 * 1024,
  }).toString("utf8");
  const tree = ts.createSourceFile("mcts.ts", source, ts.ScriptTarget.Latest, true);
  const selected = tree.statements.filter((node) => ts.isFunctionDeclaration(node) &&
    ["uciOf", "finish"].includes(node.name?.text));
  assert.equal(selected.length, 2);
  const body = ts.transpileModule(selected.map((node) => node.getText(tree)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const finish = new Function("performance", `${body}\nreturn finish;`)(performance);
  return (position, visits = 64, selectedUci = null) => {
    const board = new Chess(position.initialFen);
    for (const uci of position.movesUci) board.move(uci);
    const move = selectedUci === null ? board.moves({ verbose: true })[0] : board.move(selectedUci);
    assert.ok(move);
    return finish({ visits, valueSum: 0, children: [{ move, visits, valueSum: 0, prior: 1 }] }, visits, performance.now());
  };
}
