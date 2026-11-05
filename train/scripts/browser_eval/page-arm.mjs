// Public Page transport. The bridge owns operation admission and clocks;
// the enclosing game owns context teardown and real body joining.
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { MODEL_IDENTITY, FIXED_LIMITS } from "./schema-constants.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { exactFields, isObj, strNE } from "./protocol-values.mjs";

const fail = (detail) => {
  const error = new Error(`PAGE_ARM_INVALID ${detail}`);
  error.code = "PAGE_ARM_INVALID";
  return error;
};
const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));

// This function executes inside the actual Page. The tap forwards the
// original constructor arguments and returns the actual native Worker.
// Its first listener copies received messages before the client consumes
// them. No traffic, engine method or backend selection is changed.
function installWorkerObservation() {
  if (Object.hasOwn(window, "__tinyazWorkerEvidence")) {
    throw new Error("worker observation already installed");
  }
  const state = { count: 0, ready: null, result: null };
  const NativeWorker = window.Worker;
  if (typeof NativeWorker !== "function") {
    throw new Error("actual Worker unavailable");
  }
  window.Worker = new Proxy(NativeWorker, {
    construct(target, args) {
      const worker = Reflect.construct(target, args);
      const instanceId = `worker-${++state.count}`;
      worker.addEventListener("message", (event) => {
        const raw = event.data;
        if (raw !== null && typeof raw === "object" && ["ready", "result"].includes(raw.type)) {
          state[raw.type] = { instanceId, raw: structuredClone(raw) };
        }
      });
      return worker;
    },
  });
  Object.defineProperty(window, "__tinyazWorkerEvidence", {
    value: state, configurable: false, enumerable: false, writable: false,
  });
}

// Prearmed before fixture initialization. Every issued SDK body read is
// joined in close(), including the failure path. Aborting an absent
// response releases its passive waiter; it cannot prove an issued read
// complete. Context teardown remains the enclosing driver's obligation.
function observeDelivery({ context, origin, route, signal }) {
  let resolve;
  let reject;
  let reading = null;
  let seen = false;
  let duplicate = false;
  const result = new Promise((yes, no) => { resolve = yes; reject = no; });
  result.catch(() => {});
  const onResponse = (response) => {
    let url;
    try {
      url = new URL(response.url());
    } catch {
      return;
    }
    if (url.origin !== origin || url.pathname !== route) {
      return;
    }
    if (seen) {
      duplicate = true;
      reject(fail("duplicate model response"));
      return;
    }
    seen = true;
    reading = Promise.resolve().then(async () => {
      if (response.status() !== 200) {
        throw fail("model HTTP status");
      }
      const bytes = Buffer.from(await response.body());
      const observed = { path: route, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
      if (observed.byteLength !== MODEL_IDENTITY.byteLength || observed.sha256 !== MODEL_IDENTITY.sha256) {
        throw fail("actual delivered M bytes");
      }
      return freezeDeep(observed);
    });
    reading.then(resolve, reject);
  };
  const abort = () => reject(signal.reason);
  context.on("response", onResponse);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) {
    abort();
  }
  return {
    result,
    assertUnique() {
      if (duplicate) {
        throw fail("duplicate model response");
      }
    },
    async close() {
      context.off("response", onResponse);
      signal.removeEventListener("abort", abort);
      reject(fail("delivery observation closed"));
      if (reading !== null) {
        await reading.then(() => {}, () => {});
      }
    },
  };
}

export function createPageArm(options) {
  if (!isObj(options) || !exactFields(options, ["kind", "id", "page", "context", "capabilities"])) {
    throw fail("options");
  }
  const { kind, id, page, context, capabilities } = options;
  if (!["candidate", "baseline"].includes(kind) || !strNE(id) || !/^[a-z0-9-]+$/.test(id) ||
    typeof page?.evaluate !== "function" || typeof page?.url !== "function" ||
    typeof context?.on !== "function" || typeof context?.off !== "function" ||
    typeof capabilities?.operation !== "function" || typeof capabilities?.artifact !== "function") {
    throw fail("public interfaces");
  }
  const { signal, operation, artifact } = capabilities;
  const phase = capabilities.manifest?.phase;
  if (!["check", "parity", "preflight", "compare"].includes(phase)) {
    throw fail("phase");
  }
  const aborted = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get;
  try {
    aborted.call(signal);
  } catch {
    throw fail("genuine signal");
  }
  const fence = () => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };
  let initialized = false;
  let attempted = false;
  let busy = false;
  let turns = 0;
  let workerId = null;
  const record = async (suffix, observation) => {
    fence();
    const bytes = canonicalBytes(observation);
    if (bytes.length > FIXED_LIMITS.ipc.driverBytes) {
      throw fail("observation byte ceiling");
    }
    const chunks = async function* () {
      for (let offset = 0; offset < bytes.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
        fence();
        yield bytes.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
      }
    };
    const ref = await artifact(`${phase}/observations/${id}-${suffix}.json`, "append", chunks());
    fence();
    if (ref?.byteLength !== bytes.length || ref?.sha256 !== sha256Bytes(bytes) ||
      ref?.path !== `${phase}/observations/${id}-${suffix}.json`) {
      throw fail("persisted observation ref");
    }
    return ref.path;
  };
  const initialize = async () => {
    fence();
    if (attempted || busy) {
      throw fail("initialize once");
    }
    attempted = true;
    busy = true;
    let observation;
    try {
      await operation("readiness", `${id}-readiness`, async () => {
        fence();
        const url = new URL(page.url());
        if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
          throw fail("fixture origin");
        }
        const delivery = observeDelivery({ context, origin: url.origin,
          route: kind === "candidate" ? "/weights/tinyaz-m.bin" : "/weights/tinyaz-s.bin", signal });
        try {
          await page.evaluate(installWorkerObservation);
          fence();
          const ready = await page.evaluate(() => window.__tinyazEval.initialize());
          fence();
          const worker = await page.evaluate(() => {
            const state = window.__tinyazWorkerEvidence;
            if (state.count !== 1 || state.ready === null) {
              throw new Error("one actual ready Worker required");
            }
            return state.ready;
          });
          const actualDelivery = await delivery.result;
          fence();
          observation = freezeDeep(copy({ ready, delivery: actualDelivery, worker }));
          workerId = worker.instanceId;
          delivery.assertUnique();
          const evidence = await record("ready", observation);
          delivery.assertUnique();
          return { status: "completed", evidencePaths: [evidence], detail: { arm: kind, workerInstanceId: workerId } };
        } finally {
          await delivery.close();
        }
      });
      fence();
      initialized = true;
      return observation;
    } finally {
      busy = false;
    }
  };
  const think = async (request) => {
    const own = copy(request);
    fence();
    if (!initialized || busy) {
      throw fail("think admission");
    }
    busy = true;
    const ordinal = ++turns;
    let observation;
    try {
      await operation("command", `${id}-move-${ordinal}`, async () => {
        fence();
        await page.evaluate(() => { window.__tinyazWorkerEvidence.result = null; });
        fence();
        const response = await page.evaluate((value) => window.__tinyazEval.think(value), own);
        fence();
        const worker = await page.evaluate(() => {
          const state = window.__tinyazWorkerEvidence;
          if (state.count !== 1 || state.result === null) {
            throw new Error("one actual result Worker required");
          }
          return state.result;
        });
        if (worker.instanceId !== workerId) {
          throw fail("Worker changed");
        }
        observation = freezeDeep(copy({ response, worker }));
        const evidence = await record(`move-${ordinal}`, observation);
        return { status: "completed", evidencePaths: [evidence], detail: { arm: kind, workerInstanceId: workerId } };
      });
      fence();
      return observation;
    } finally {
      busy = false;
    }
  };
  return Object.freeze({ kind, initialize, think });
}
