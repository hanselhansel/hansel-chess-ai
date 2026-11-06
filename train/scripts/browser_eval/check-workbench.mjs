// Public Playwright actions against the actual Workbench component/styles.
// Fault controls exist only in these private evaluation Pages.
import assert from "node:assert/strict";

const waitText = (page, text) => page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 30000 });
const button = (page, name) => page.getByRole("button", { name, exact: true });
const defer = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
const geometry = async (page) => page.evaluate(() => {
  const squares = [...document.querySelectorAll("button[aria-label]")]
    .filter((item) => /^[a-h][1-8]$/.test(item.getAttribute("aria-label")));
  const parent = squares[0]?.parentElement;
  if (!parent || squares.length !== 64 || squares.some((item) => item.parentElement !== parent)) {
    throw new Error("actual common 64-square board container");
  }
  const style = getComputedStyle(parent);
  const board = parent.getBoundingClientRect();
  const left = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  const right = parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight);
  const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
  const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom);
  return { display: style.display, columns: style.gridTemplateColumns.split(/\s+/),
    content: { x: board.x + left, y: board.y + top,
      width: board.width - left - right, height: board.height - top - bottom },
    board: { x: board.x, y: board.y, width: board.width, height: board.height },
    squares: squares.map((item) => {
      const rect = item.getBoundingClientRect();
      return { square: item.getAttribute("aria-label"), x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }) };
});
const validateGeometry = (value) => {
  assert.equal(value.display, "grid");
  assert.equal(value.columns.length, 8);
  assert.equal(new Set(value.squares.map((item) => item.square)).size, 64);
  const rows = [];
  const columns = [];
  for (const square of value.squares) {
    assert.ok(square.width > 0 && square.height > 0);
    assert.ok(Math.abs(square.width - square.height) <= 1);
    assert.ok(Math.abs(square.width - value.board.width / 8) <= 1);
    assert.ok(Math.abs(square.height - value.board.height / 8) <= 1);
    assert.ok(square.x >= value.board.x - 1 && square.y >= value.board.y - 1);
    assert.ok(square.x + square.width <= value.board.x + value.board.width + 1);
    assert.ok(square.y + square.height <= value.board.y + value.board.height + 1);
    if (!rows.some((coordinate) => Math.abs(coordinate - square.y) <= 1)) {
      rows.push(square.y);
    }
    if (!columns.some((coordinate) => Math.abs(coordinate - square.x) <= 1)) {
      columns.push(square.x);
    }
  }
  const { content, squares } = value;
  assert.ok(Math.abs(Math.min(...squares.map((item) => item.x)) - content.x) <= 1);
  assert.ok(Math.abs(Math.min(...squares.map((item) => item.y)) - content.y) <= 1);
  assert.ok(Math.abs(Math.max(...squares.map((item) => item.x + item.width)) - content.x - content.width) <= 1);
  assert.ok(Math.abs(Math.max(...squares.map((item) => item.y + item.height)) - content.y - content.height) <= 1);
  assert.equal(rows.length, 8);
  assert.equal(columns.length, 8);
  for (let a = 0; a < 64; a += 1) {
    for (let b = a + 1; b < 64; b += 1) {
      const one = value.squares[a];
      const two = value.squares[b];
      const overlapX = Math.min(one.x + one.width, two.x + two.width) - Math.max(one.x, two.x);
      const overlapY = Math.min(one.y + one.height, two.y + two.height) - Math.max(one.y, two.y);
      assert.ok(overlapX <= 1 || overlapY <= 1);
    }
  }
};

// Every required engine state retains the same rendered Workbench frame.
const fullFrame = async (page) => {
  const measured = await geometry(page);
  validateGeometry(measured);
  const roadmap = await page.locator('section[aria-labelledby="project-stages"]').innerText();
  assert.doesNotMatch(roadmap, /\b(?:elo|rating|rated|current|done|later)\b|[0-9]{3,}/i);
  const text = await page.locator("body").innerText();
  assert.match(text, /Watch it think/);
  assert.match(text, /Search tree/);
  assert.match(text, /EFFICIENCY CARD/);
  await button(page, "Play White").waitFor({ state: "visible", timeout: 30000 });
  assert.doesNotMatch(text, /currently\s*<?\s*1320/i);
  return { geometry: measured, roadmap };
};

// Evaluation-only Worker controls. Actual successful searches continue
// through the real Worker; only the named fault/stale delivery is injected.
function installUiWorkerControl({ mode }) {
  const state = { requests: [], workers: 0, held: null, old: null };
  window.__tinyazUiControl = state;
  window.Worker = new Proxy(window.Worker, {
    construct(target, args) {
      const worker = Reflect.construct(target, args);
      state.workers += 1;
      worker.addEventListener("message", (event) => {
        if (mode === "hold-result" && event.data?.type === "result" && state.held === null) {
          state.held = structuredClone(event.data);
          state.old = worker;
          event.stopImmediatePropagation();
        }
      });
      const post = worker.postMessage.bind(worker);
      worker.postMessage = (...args) => {
        const message = args[0];
        if (message?.type === "think") {
          state.requests.push(structuredClone(message.context));
          if (mode === "request-failure" && state.requests.length === 1) {
            const frame = {
              type: "error", protocolVersion: 1, engineSessionId: message.engineSessionId,
              backendEpoch: message.backendEpoch, scope: "request", context: structuredClone(message.context),
              failure: { code: "SEARCH_FAILED",
                diagnostic: "test-owned request failure", searchMs: 0, completedVisits: 0 },
            };
            queueMicrotask(() => worker.dispatchEvent(new MessageEvent("message", { data: frame })));
            return;
          }
        }
        return post(...args);
      };
      return worker;
    },
  });
}

export async function checkWorkbench({ capabilities, resources, runCase }) {
  const { browser, servers } = resources;
  const step = async (kind, id, body) => {
    let observed;
    await capabilities.operation(kind, `check-ui-${id}`, async () => {
      observed = await body();
      return { status: "completed", evidencePaths: [], detail: { assertion: id } };
    });
    return observed;
  };
  const open = async (id) => {
    let handle;
    try {
      await step("readiness", `${id}-open`, async () => {
        handle = await browser.openWorkbench(servers.candidate.workbenchUrl);
        await waitText(handle.page, "verified trained checkpoint");
      });
      return handle;
    } catch (error) {
      if (handle) await handle.close();
      throw error;
    }
  };
  const groups = { "workbench-layout": [], "completed-display": [],
    "explicit-failure-actions": [], "request-lifecycle": [] };
  groups["workbench-layout"].push(await runCase("workbench-computed-geometry", async () => {
    const handle = await open("geometry");
    try {
      return await step("command", "geometry", async () => {
        return fullFrame(handle.page);
      });
    } finally {
      await handle.close();
    }
  }, true));
  groups["completed-display"].push(await runCase("workbench-trained-demo-history", async () => {
    const handle = await open("display");
    const page = handle.page;
    try {
      const completed = await step("command", "completed-move", async () => {
        const text = await page.locator("body").innerText();
        assert.match(text, /tinyaz-m/);
        assert.match(text, /Recorded history · unbound to this session/i);
        assert.match(text, /Lichess Elo\s+unavailable/i);
        await button(page, "Play Black").click();
        await waitText(page, "64 visits · search");
        const completed = await page.locator("body").innerText();
        assert.match(completed, /64 visits · search [0-9]+ ms · (?:move|total) [0-9]+ ms/);
        await button(page, "1 visit").click();
        assert.match(await page.locator("body").innerText(), /64 visits · search/);
        assert.match(await page.locator("body").innerText(), /Next request: one network evaluation/);
        await button(page, "Play White").click();
        await waitText(page, "no completed move yet");
        assert.doesNotMatch(await page.locator("body").innerText(), /64 visits · search/);
        return completed;
      });
      const demo = await step("readiness", "demo-init", async () => {
        handle.expectWorkerRetirement();
        await button(page, "Random demo").click();
        await waitText(page, "untrained random demonstration");
        await fullFrame(page);
        return page.locator("body").innerText();
      });
      assert.match(demo, /Random demo: an untrained seed-2026 net/);
      assert.match(demo, /Lichess Elo\s+unavailable/i);
      assert.doesNotMatch(demo, /verified trained checkpoint|Recorded history|vs Stockfish|vs Phase 1|beats random/i);
      const afterReset = await step("command", "demo-reset", async () => {
        await button(page, "64 visits").click();
        await button(page, "Play White").click();
        const text = await page.locator("body").innerText();
        assert.doesNotMatch(text, /Recorded history|vs Stockfish|verified trained checkpoint/i);
        return text;
      });
      return { completed, demo, afterReset };
    } finally {
      await handle.close();
    }
  }, true));
  groups["completed-display"].push(await runCase("workbench-load-failure-explicit-retry", async () => {
    const handle = await open("failure");
    const page = handle.page;
    const entered = defer();
    const release = defer();
    let failedRequest = false;
    const routeHandler = async (route) => {
      if (!failedRequest) {
        failedRequest = true;
        entered.resolve();
        await release.promise;
        await route.fulfill({ status: 404, body: "test-owned missing checkpoint" });
      } else {
        await route.continue();
      }
    };
    try {
      const observed = await step("readiness", "deliberate-failed-init", async () => {
        await handle.context.route("**/weights/tinyaz-m.bin", routeHandler);
        handle.expectWorkerRetirement();
        await page.reload({ waitUntil: "domcontentloaded" });
        await entered.promise;
        await fullFrame(page);
        const loading = await page.locator("body").innerText();
        assert.match(loading, /verifying checkpoint|Verifying the selected checkpoint|Verifying checkpoint/i);
        release.resolve();
        await button(page, "Retry engine").waitFor({ state: "visible", timeout: 30000 });
        await fullFrame(page);
        const failed = await page.locator("body").innerText();
        assert.match(failed, /Engine failed to start|could not verify or load/i);
        assert.doesNotMatch(failed, /verified trained checkpoint/);
        return { loading, failed };
      });
      await step("command", "failed-reset", async () => {
        await button(page, "Play White").click();
        await button(page, "Retry engine").waitFor({ state: "visible", timeout: 30000 });
        assert.doesNotMatch(await page.locator("body").innerText(), /verified trained checkpoint/);
      });
      const retried = await step("readiness", "engine-retry", async () => {
        await button(page, "Retry engine").click();
        await waitText(page, "verified trained checkpoint");
        return page.locator("body").innerText();
      });
      return { ...observed, retried };
    } finally {
      release.resolve();
      await handle.close();
    }
  }, true));
  groups["completed-display"].push(await runCase("workbench-main-reset-acceptance", async () => {
    const handle = await open("main");
    const page = handle.page;
    try {
      await step("readiness", "main-init", async () => {
        await page.addInitScript(() => {
          window.Worker = new Proxy(window.Worker, {
            construct() { throw new Error("test-owned Worker unavailable"); },
          });
          window.__tinyazResetClicks = 0;
          document.addEventListener("click", (event) => {
            if (event.target instanceof Element && event.target.closest("button")?.textContent?.trim() === "Play White") {
              window.__tinyazResetClicks += 1;
            }
          }, true);
        });
        handle.expectWorkerRetirement();
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitText(page, "verified trained checkpoint");
      });
      return await step("command", "main-reset", async () => {
        await button(page, "Play Black").click();
        const started = process.hrtime.bigint();
        await button(page, "Play White").click();
        const acceptedMs = Number(process.hrtime.bigint() - started) / 1e6;
        await waitText(page, "no completed move yet");
        const facts = await page.evaluate(() => ({ clicks: window.__tinyazResetClicks,
          squares: document.querySelectorAll('button[aria-label="e2"]').length,
          text: document.body.innerText }));
        assert.equal(facts.clicks, 1);
        assert.doesNotMatch(facts.text, /64 visits · search/);
        assert.equal(facts.squares, 1);
        assert.ok(Number.isFinite(acceptedMs) && acceptedMs >= 0);
        return { ...facts, resetAcceptedMs: acceptedMs };
      });
    } finally {
      await handle.close();
    }
  }, true));
  groups["completed-display"].push(await runCase("workbench-missing-history", async () => {
    const handle = await open("missing-history");
    const page = handle.page;
    try {
      const metadata = await page.evaluate(async () => (await import("/src/lib/chess/checkpoint-meta.json")).default);
      const missing = { ...metadata, vsRandom: null, vsPhase1: null, selfplayGames: null, gauntletElo: null };
      await step("readiness", "missing-history-init", async () => {
        await handle.context.route("**/src/lib/chess/checkpoint-meta.json*", (route) => route.fulfill({
          status: 200, contentType: "application/javascript", body: `export default ${JSON.stringify(missing)};`,
        }));
        handle.expectWorkerRetirement();
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitText(page, "verified trained checkpoint");
      });
      return await step("command", "missing-history", async () => {
        const text = await page.locator("body").innerText();
        assert.match(text, /unavailable: no recorded evaluations for this build/);
        assert.doesNotMatch(text, /vs Stockfish UCI_Elo|beats random/);
        return { controlledMissingHistory: true, text };
      });
    } finally {
      await handle.close();
    }
  }, true));
  for (const mode of ["request-failure", "hold-result"]) {
    const group = mode === "request-failure" ? "explicit-failure-actions" : "request-lifecycle";
    groups[group].push(await runCase(`workbench-${mode}`, async () => {
      const handle = await open(mode);
      const page = handle.page;
      try {
        await step("readiness", `${mode}-init`, async () => {
          await page.addInitScript(installUiWorkerControl, { mode });
          handle.expectWorkerRetirement();
          await page.reload({ waitUntil: "domcontentloaded" });
          await waitText(page, "verified trained checkpoint");
        });
        return await step("command", mode, async () => {
          await button(page, "Play Black").click();
          if (mode === "request-failure") {
            await button(page, "Retry move").waitFor({ state: "visible", timeout: 30000 });
            await fullFrame(page);
            const failed = await page.locator("body").innerText();
            assert.doesNotMatch(failed, /64 visits · search/);
            assert.equal(await page.evaluate(() => window.__tinyazUiControl.requests.length), 1);
            await button(page, "Retry move").click();
            await waitText(page, "64 visits · search");
            const requests = await page.evaluate(() => window.__tinyazUiControl.requests);
            assert.equal(requests.length, 2);
            assert.deepEqual(requests[0].position, requests[1].position);
            assert.notEqual(requests[0].requestId, requests[1].requestId);
            return { failed, requests, retried: await page.locator("body").innerText() };
          }
          await page.waitForFunction(() => window.__tinyazUiControl.held !== null, null, { timeout: 90000 });
          const retired = await page.evaluate(() => window.__tinyazUiControl.held);
          handle.expectWorkerRetirement();
          await button(page, "Play White").click();
          await page.evaluate(() => {
            const state = window.__tinyazUiControl;
            state.old.dispatchEvent(new MessageEvent("message", { data: state.held }));
          });
          await waitText(page, "no completed move yet");
          await button(page, "Play Black").click();
          await waitText(page, "64 visits · search");
          const current = await page.locator("body").innerText();
          await page.evaluate(() => {
            const state = window.__tinyazUiControl;
            state.old.dispatchEvent(new MessageEvent("message", { data: state.held }));
          });
          assert.equal(await page.locator("body").innerText(), current);
          const workers = await page.evaluate(() => window.__tinyazUiControl.workers);
          assert.equal(workers, 2);
          return { retired, current, workers };
        });
      } finally {
        await handle.close();
      }
    }, true));
  }
  return groups;
}
