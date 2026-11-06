// Functional group/operation failure accounting with scripted public SDK.
// These tests cannot establish a real browser or functional phase pass.
import assert from "node:assert/strict";
import test from "node:test";
import { promises as fsp } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { canonicalBytes } from "./canonical-json.mjs";
import { makeEnv } from "./driver-bridge-test-fixtures.mjs";
import { checkWorkbench } from "./check-workbench.mjs";
import { ThinkSession } from "../../../src/lib/chess/think-session.ts";
import { searchAsync } from "../../../src/lib/chess/mcts.ts";
import { isContext } from "../../../src/lib/chess/think-message-guards.ts";
import { isWorkerMessage } from "../../../src/lib/chess/think-message-guards.ts";
import { runChecks } from "./checks.mjs";
import { runPhase } from "./phase-runners.mjs";
import { makeOperationalFixture } from "./operational-test-fixtures.mjs";
import { REQUIRED_CHECK_IDS } from "./schema-constants.mjs";

test("every functional group fails with actual assertion artifacts when the SDK cannot open", async (t) => {
  const f = makeOperationalFixture(t, { phase: "check", fault: "open" });
  const result = await f.own(runChecks(f));
  assert.deepEqual(result.checks.map((item) => item.id), REQUIRED_CHECK_IDS.check.filter((id) => id !== "cleanup"));
  assert.equal(result.checks.every((item) => item.status === "failed" && item.evidencePaths.length > 0), true);
  assert.equal(result.summary.assertions.length, 11);
  assert.equal(f.artifacts.length, 11);
  for (const item of f.artifacts) {
    const report = JSON.parse(item.bytes);
    assert.equal(report.passed, false);
    assert.match(report.error.message, /scripted.*open failure/);
  }
  assert.equal(f.calls.operations.every((item) => item.kind === "readiness"), true);
});

test("failed functional assertions produce failed/1 and no cleanup or analysis claim", async (t) => {
  const f = makeOperationalFixture(t, { phase: "check", fault: "open" });
  const result = await f.own(runPhase(f));
  assert.equal(result.requestedStatus, "failed");
  assert.equal(result.requestedExitCode, 1);
  assert.equal(result.stopReason, null);
  assert.equal(result.analysisEligible, false);
  assert.equal(result.checks.some((item) => item.id === "cleanup"), false);
  assert.equal(result.checks.every((item) => item.status === "failed"), true);
});

test("a genuine stop fences all new functional work and artifacts", async (t) => {
  const f = makeOperationalFixture(t, { phase: "check", fault: "open" });
  const reason = { code: "original stop" };
  f.controller.abort(reason);
  await assert.rejects(f.own(runChecks(f)), (error) => error === reason);
  assert.equal(f.calls.opens.length, 0);
  assert.equal(f.calls.operations.length, 0);
  assert.equal(f.artifacts.length, 0);
});

// Select exact private control/validator bodies, without exporting test hooks or
// running a browser. The protocol guard itself is imported from production.
const workbenchSource = await fsp.readFile(new URL("./check-workbench.mjs", import.meta.url), "utf8");
const parsedWorkbench = ts.createSourceFile("check-workbench.mjs", workbenchSource, ts.ScriptTarget.Latest, true);
const selectWorkbench = (...names) => {
  const selected = parsedWorkbench.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => names.includes(item.name.getText()))));
  assert.equal(selected.length, names.length);
  return selected.map((node) => node.getText(parsedWorkbench)).join("\n");
};

test("recoverable UI fault owns its request frame before asynchronous delivery", () => {
  const queued = [];
  class Worker extends EventTarget {
    postMessage() { throw new Error("the controlled first request must not reach the Worker"); }
  }
  const window = { Worker };
  const install = vm.runInNewContext(`${selectWorkbench("installUiWorkerControl")}\ninstallUiWorkerControl`, {
    window, structuredClone, MessageEvent, queueMicrotask: (callback) => queued.push(callback),
  });
  install({ mode: "request-failure" });
  const worker = new window.Worker();
  let received;
  worker.addEventListener("message", (event) => { received = event.data; });
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const context = { engineSessionId: "owned-session", gameGeneration: 2, requestId: 3,
    position: { initialFen: fen, movesUci: [], expectedFen: fen }, requestedVisits: 64 };
  const expected = structuredClone(context);
  const message = { type: "think", protocolVersion: 1, engineSessionId: "owned-session", backendEpoch: 4, context };
  worker.postMessage(message);
  message.engineSessionId = "mutated";
  message.backendEpoch = 900;
  context.requestId = 999;
  context.position.movesUci.push("e2e4");
  window.__tinyazUiControl.requests[0].requestedVisits = 1;
  assert.equal(queued.length, 1);
  assert.equal(received, undefined);
  queued[0]();
  assert.equal(isWorkerMessage(received), true);
  assert.deepEqual(received.context, expected);
  assert.equal(received.engineSessionId, "owned-session");
  assert.equal(received.backendEpoch, 4);
  const missingContext = { ...received };
  delete missingContext.context;
  assert.equal(isWorkerMessage(missingContext), false);
});

const grid = (size = 50) => ({ display: "grid", columns: Array(8).fill("50px"),
  board: { x: 0, y: 0, width: 400, height: 400 }, content: { x: 0, y: 0, width: 400, height: 400 },
  squares: Array.from({ length: 64 }, (_, index) => ({ square: `${"abcdefgh"[index % 8]}${1 + Math.floor(index / 8)}`,
    x: (index % 8) * size, y: Math.floor(index / 8) * size, width: size, height: size })) });
const frameValidators = vm.runInNewContext(`${selectWorkbench("button", "geometry", "validateGeometry", "fullFrame")}\n({fullFrame,validateGeometry})`, { assert });

for (const state of ["loading", "failure", "demo"]) {
  test(`${state} requires the actual complete Workbench frame`, async () => {
    const stateText = { loading: "Verifying checkpoint", failure: "Engine failed to start",
      demo: "Random demo: an untrained seed-2026 net" }[state];
    const panels = ["Watch it think", "Search tree", "EFFICIENCY CARD"];
    const makePage = (missing = null) => ({
      evaluate: async () => grid(),
      locator: (selector) => ({ innerText: async () => selector === "body"
        ? [stateText, ...panels.filter((panel) => panel !== missing)].join("\n")
        : "Project stages Stage 0 Play Stage 1 Learn Stage 2 Climb" }),
      getByRole: (role, options) => {
        assert.equal(role, "button");
        assert.equal(options.name, "Play White");
        return { waitFor: async () => { if (missing === "reset") throw new Error("missing reset action"); } };
      },
    });
    await frameValidators.fullFrame(makePage());
    for (const missing of [...panels, "reset"]) {
      await assert.rejects(frameValidators.fullFrame(makePage(missing)));
    }
    const rated = makePage();
    const locate = rated.locator;
    rated.locator = (selector) => selector === "body" ? locate(selector)
      : { innerText: async () => "Project stages Current rating 1320" };
    await assert.rejects(frameValidators.fullFrame(rated));
  });
}

test("actual geometry validator rejects an uncovered grid content edge", () => {
  frameValidators.validateGeometry(grid());
  assert.throws(() => frameValidators.validateGeometry(grid(49)));
  const bordered = grid();
  bordered.board = { x: -2, y: -2, width: 404, height: 404 };
  frameValidators.validateGeometry(bordered);
});

test("CardPanel rendered title uses its actual uppercase style", async () => {
  const component = await fsp.readFile(new URL("../../../src/components/chess/card-panel.tsx", import.meta.url), "utf8");
  assert.match(component, /className="[^"]*\buppercase\b[^"]*">Efficiency card<\/p>/);
});

test("actual invalid-position stimulus passes protocol syntax and fails replay before model access", async () => {
  const source = await fsp.readFile(new URL("./check-engine.mjs", import.meta.url), "utf8");
  const tree = ts.createSourceFile("check-engine.mjs", source, ts.ScriptTarget.Latest, true);
  let action;
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "page.evaluate" &&
      node.arguments[1]?.getText(tree) === "action") action = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(action);
  const session = new ThinkSession("session", performance.now() + 30000, () => {});
  let observed;
  let executes = 0;
  const thinker = { think: (context) => {
    observed = context;
    return session.submit(context, false, Promise.resolve({ engineSessionId: "session" }), async (run) => {
      executes += 1;
      const forbiddenWeights = new Proxy({}, { get() { throw new Error("model access forbidden in replay guard"); } });
      return searchAsync(run.context.position, 64, forbiddenWeights);
    });
  } };
  try {
    const invoke = new Function("window", `return (${action.getText(tree)});`)({
      __tinyazFunctional: { thinker, ready: { engineSessionId: "session" } },
    });
    assert.equal(await invoke("invalid"), "POSITION_INVALID");
    assert.equal(isContext(observed), true);
    assert.equal(executes, 1);
    await assert.rejects(thinker.think({ ...observed, position: { ...observed.position, expectedFen: "wrong" } }),
      (error) => error.code === "PROTOCOL_INVALID");
    assert.equal(executes, 1);
  } finally {
    session.stop();
  }
});

test("real bridge admits every Workbench open and distinct control initialization", async (t) => {
  let env;
  env = makeEnv(t, { sendImpl: (frame, callback) => {
    env.pv.accept("driver", "d2s", frame, canonicalBytes(frame).length);
    env.sends.push({ msg: frame, cb: callback });
    if (frame.type === "hello") env.s2d("start", { manifestPath: "unit/manifest.json",
      commonIdentitySha256: frame.commonIdentitySha256 });
    if (frame.type === "begin") env.s2d("begun", { operationId: frame.operationId,
      remainingMs: frame.kind === "readiness" ? 30000 : 90000 });
    callback(null);
    return true;
  } });
  await env.b.start({ manifestPath: "unit/manifest.json" });
  let controlEntries = 0;
  const reports = [];
  const stopControl = async () => { controlEntries += 1; throw new Error("scripted control body entered"); };
  const page = {
    getByText: () => ({ first: () => ({ waitFor: async () => {} }) }),
    getByRole: () => ({ click: async () => {}, waitFor: async () => {} }),
    locator: (selector) => ({ innerText: async () => selector === "body"
      ? "Watch it think Search tree EFFICIENCY CARD tinyaz-m Recorded history · unbound to this session Lichess Elo unavailable"
      : "Project stages Stage 0 Play Stage 1 Learn Stage 2 Climb" }),
    evaluate: async (callback) => callback.toString().includes("checkpoint-meta") ? {} : grid(),
    addInitScript: stopControl,
  };
  const browser = { openWorkbench: async () => ({ page,
    context: { route: stopControl }, expectWorkerRetirement: () => {}, close: async () => {} }) };
  await checkWorkbench({ capabilities: env.b.capabilities,
    resources: { browser, servers: { candidate: { workbenchUrl: "http://127.0.0.1:1234/ui" } } },
    runCase: async (name, body) => {
      let error;
      try { await body(); } catch (value) { error = value; }
      reports.push({ name, error });
      return { path: name, passed: error === undefined };
    },
  });
  assert.equal(reports.length, 7);
  assert.equal(controlEntries, 5);
  assert.equal(reports.some((report) => report.error?.code === "IPC_INVALID"), false);
  const begins = env.sends.filter((item) => item.msg.type === "begin").map((item) => item.msg.operationId);
  assert.equal(new Set(begins).size, begins.length);
  for (const id of ["main", "missing-history", "request-failure", "hold-result"]) {
    assert.ok(begins.includes(`check-ui-${id}-open`));
    assert.ok(begins.includes(`check-ui-${id}-init`));
  }
  await env.b.finish({ requestedStatus: "failed", requestedExitCode: 1, stopReason: null,
    checks: [], summary: {}, analysisEligible: false });
  await env.b.close({ gracefulCloseAttempted: true });
  await env.owner.whenSettled();
});
