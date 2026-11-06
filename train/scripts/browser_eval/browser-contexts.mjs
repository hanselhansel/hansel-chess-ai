// Per-game browser context owner — the WHOLE context/page/origin-gate/
// close block moved out of browser.mjs (C4b-11c declaration). Sole
// export createBrowserContexts: a PURE constructor borrowing the ONE
// connected public Browser, the frozen copied launch record, the
// parent's assertLive ordinary fence and its noteFault sink. It invokes
// nothing at construction — real effects run only through the explicit
// openGame/openWorkbench/closeAll methods. Context/page/worker entries
// are resource references only — no clock, timer, queue, debt ledger,
// proof or Native owner, and this module never imports its parent.
import { bridgeError } from "./driver-protocol.mjs";
import { isPort, strNE } from "./protocol-values.mjs";

const bad = (detail) => bridgeError(`fixture-browser ${detail}`);
const MODEL_PATH = "/weights/tinyaz-m.bin";

// A fixture/work URL must be strict http loopback — the origin is all
// the gate and the evidence ever see.
const parseHttpUrl = (url, what) => {
  if (!strNE(url)) throw bad(what);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw bad(what);
  }
  if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1") {
    throw bad(what);
  }
  const port = Number(parsed.port);
  if (!isPort(port)) throw bad(what);
  return parsed;
};

export function createBrowserContexts({ browser, launch, assertLive, noteFault, reportRequestFailure }) {
  if (
    browser === null ||
    typeof browser !== "object" ||
    typeof browser.newContext !== "function" ||
    typeof assertLive !== "function" ||
    typeof noteFault !== "function" ||
    launch === null ||
    typeof launch !== "object"
  ) {
    throw bad("contexts");
  }

  // Every page request must stay inside the recorded loopback fixture
  // origins — anything else (external, file, other origins) aborts.
  const gate = (allowed) => async (route) => {
    let origin;
    try {
      origin = new URL(route.request().url()).origin;
    } catch {
      await route.abort();
      return;
    }
    if (allowed.has(origin)) {
      await route.continue();
    } else {
      await route.abort();
    }
  };

  // One observation entry per admitted context. `expected` is set BEFORE
  // a deliberate true close so the page/worker close events that the
  // teardown itself causes can never look like unexpected faults. The
  // entry OWNS its memoized close promise — armed on a queued microtask
  // before the SDK close callout, so game.close, closeAll and the
  // partial-start finally all share the ONE real close attempt.
  const owned = new Set();
  const makeEntry = (context) => {
    const entry = {
      context,
      expected: false,
      closePromise: null,
      close() {
        entry.expected = true;
        entry.closePromise ??= Promise.resolve().then(() => entry.context.close());
        return entry.closePromise;
      },
    };
    return entry;
  };

  const trackPage = (page, entry) => {
    const workers = new Set();
    const retiring = new WeakSet();
    const expectWorkerRetirement = () => {
      // Existing-resource intent is also legal during actual cleanup.
      for (const worker of workers) retiring.add(worker);
    };
    page.on?.("requestfailed", (request) => {
      let detail = "unparseable";
      let kind = "requestfailed";
      let pathname = "unavailable";
      try {
        const url = new URL(request.url());
        detail = url.origin;
        pathname = url.pathname;
        if (url.pathname === MODEL_PATH) kind = "model";
      } catch {
        // detail stays "unparseable" — the raw URL never enters evidence
      }
      noteFault(kind, detail);
      // Existing failure policy runs first. SDK facts are read once, and
      // optional description cannot turn an unavailable failure into success.
      let failure = "unavailable";
      try {
        const method = request.failure;
        const result = typeof method === "function" ? Reflect.apply(method, request, []) : null;
        const text = result?.errorText;
        if (typeof text === "string") failure = text.slice(0, 44);
      } catch {}
      try {
        if (typeof reportRequestFailure === "function") {
          reportRequestFailure({ code: "REQUEST_FAILED", message: `${kind} ${detail}`,
            detail: `p=${pathname.slice(0, 40)} e=${failure}` });
        }
      } catch {} // Diagnostic callback failure never changes browser behavior.
    });
    page.on?.("pageerror", () => noteFault("pageerror", "page"));
    page.on?.("crash", () => noteFault("crash", "page"));
    page.on?.("close", () => {
      if (!entry.expected) noteFault("page", "unexpected close");
    });
    // The public event is "worker" (Page.on('worker', worker)) and the
    // public Worker API exposes "close" — no invented workercreated.
    page.on?.("worker", (worker) => {
      workers.add(worker);
      worker.on?.("close", () => {
        workers.delete(worker);
        if (!entry.expected && !retiring.has(worker)) noteFault("worker", "unexpected close");
      });
    });
    return Object.freeze({ expectWorkerRetirement });
  };

  const newIsolatedContext = async () => {
    const context = await browser.newContext({
      viewport: { ...launch.viewport },
      deviceScaleFactor: launch.deviceScaleFactor,
    });
    return context;
  };

  // Attempts EVERY admitted entry: expected-close is marked before each
  // true close, the entry leaves `owned` only on real close fulfillment,
  // and the FIRST arbitrary thrown value is retained by an explicit
  // presence flag — a null/undefined rejection is never lost.
  const closeEntries = async (entries) => {
    let first;
    let hasFirst = false;
    for (const entry of entries) {
      try {
        await entry.close();
        owned.delete(entry);
      } catch (error) {
        if (!hasFirst) {
          hasFirst = true;
          first = error;
        }
      }
    }
    if (hasFirst) throw first;
  };

  const closeAll = () => closeEntries([...owned].reverse());

  const closeOnce = (entries) => {
    let promise = null;
    return () => (promise ??= closeEntries(entries));
  };

  // Each fresh newContext/route/newPage/goto await is fenced BEFORE and
  // immediately AFTER; a returned context enters `owned`/`created`
  // BEFORE its post-fence so the finally path can close it even when
  // the fence throws. Cleanup itself never runs the ordinary fence.
  const openGame = async ({ candidateUrl, baselineUrl }) => {
    assertLive();
    const candidate = parseHttpUrl(candidateUrl, "candidateUrl");
    const baseline = parseHttpUrl(baselineUrl, "baselineUrl");
    const allowed = new Set([candidate.origin, baseline.origin]);
    const created = [];
    try {
      assertLive();
      const candidateContext = await newIsolatedContext();
      const candidateEntry = makeEntry(candidateContext);
      owned.add(candidateEntry);
      created.push(candidateEntry);
      assertLive();
      await candidateContext.route("**/*", gate(allowed));
      assertLive();
      const candidatePage = await candidateContext.newPage();
      assertLive();
      const candidateControls = trackPage(candidatePage, candidateEntry);
      assertLive();
      const baselineContext = await newIsolatedContext();
      const baselineEntry = makeEntry(baselineContext);
      owned.add(baselineEntry);
      created.push(baselineEntry);
      assertLive();
      await baselineContext.route("**/*", gate(allowed));
      assertLive();
      const baselinePage = await baselineContext.newPage();
      assertLive();
      const baselineControls = trackPage(baselinePage, baselineEntry);
      await candidatePage.goto(candidate.href);
      assertLive();
      await baselinePage.goto(baseline.href);
      assertLive();
      return Object.freeze({
        candidate: Object.freeze({ context: candidateContext, page: candidatePage, ...candidateControls }),
        baseline: Object.freeze({ context: baselineContext, page: baselinePage, ...baselineControls }),
        close: closeOnce([baselineEntry, candidateEntry]),
      });
    } catch (error) {
      // The SAME closeEntries path as closeAll — every created entry's
      // memoized close is attempted in reverse adoption order and its
      // first-failure retention never replaces the real start cause.
      await closeEntries(created.reverse()).catch(() => {});
      throw error;
    }
  };

  const openWorkbench = async (url) => {
    assertLive();
    const target = parseHttpUrl(url, "workbenchUrl");
    const allowed = new Set([target.origin]);
    const created = [];
    try {
      assertLive();
      const context = await newIsolatedContext();
      const entry = makeEntry(context);
      owned.add(entry);
      created.push(entry);
      assertLive();
      await context.route("**/*", gate(allowed));
      assertLive();
      const page = await context.newPage();
      assertLive();
      const controls = trackPage(page, entry);
      await page.goto(target.href);
      assertLive();
      return Object.freeze({ context, page, ...controls, close: closeOnce([entry]) });
    } catch (error) {
      await closeEntries(created.reverse()).catch(() => {});
      throw error;
    }
  };

  return Object.freeze({ openGame, openWorkbench, closeAll });
}
