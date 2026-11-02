import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import type { ModelIdentity } from "./checkpoint.ts";
import { capturePosition } from "./position.ts";
import type { SearchOutcome } from "./search-types.ts";
import type {
  ClientMessage,
  RequestContext,
  ThinkerFailure,
} from "./think-protocol.ts";
import { thinkRuntime } from "./think-runtime.ts";
import type { ThinkRuntime, ThinkWorker } from "./think-runtime.ts";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const OPEN_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
export const POSITION = capturePosition(START_FEN, ["e2e4", "e7e5"], OPEN_FEN);
export const CONTEXT: RequestContext = {
  engineSessionId: "session-1",
  gameGeneration: 2,
  requestId: 7,
  position: POSITION,
  requestedVisits: 64,
};
export const SESSION = {
  protocolVersion: 1,
  engineSessionId: "session-1",
  backendEpoch: 3,
};
export const DEMO_IDENTITY: ModelIdentity = {
  mode: "random-demo",
  modelName: "tinyaz-s",
  sha256: "a".repeat(64),
  packedVersion: 1,
  parameterCount: 640018,
  byteLength: 2560088,
  channels: 64,
  sourceId: 0,
  seed: 2026,
};
export const MOVE_RESULT = {
  uci: "f1c4",
  san: "Bc4",
  from: "f1",
  to: "c4",
  value: 0.25,
  visits: 64,
  ms: 12,
  children: [
    { san: "Bc4", uci: "f1c4", visits: 30, q: 0.1, prior: 0.5 },
    { san: "Nf3", uci: "g1f3", visits: 20, q: -0.2, prior: 0.3 },
  ],
  heatmap: { c4: 1, f3: 0.5 },
};
export const MOVE_OUTCOME = {
  kind: "move",
  result: MOVE_RESULT,
  completedVisits: 64,
  searchMs: 12.4,
};
export const INIT_MESSAGE = {
  ...SESSION,
  type: "init",
  modelIdentity: SELECTED_MODEL_IDENTITY,
  bytes: new ArrayBuffer(16),
};
export const THINK_MESSAGE = {
  ...SESSION,
  type: "think",
  context: CONTEXT,
  remainingMs: 45000,
};
export const READY_MESSAGE = {
  ...SESSION,
  type: "ready",
  modelIdentity: SELECTED_MODEL_IDENTITY,
};
export const RESULT_MESSAGE = {
  ...SESSION,
  type: "result",
  context: CONTEXT,
  modelIdentity: SELECTED_MODEL_IDENTITY,
  outcome: MOVE_OUTCOME,
};
export const INIT_ERROR = {
  ...SESSION,
  type: "error",
  scope: "initialization",
  failure: {
    code: "LOAD_DIGEST",
    diagnostic: "hash mismatch",
    searchMs: null,
    completedVisits: null,
  },
};
export const REQUEST_ERROR = {
  ...SESSION,
  type: "error",
  scope: "request",
  context: CONTEXT,
  failure: {
    code: "SEARCH_FAILED",
    diagnostic: "boom",
    searchMs: 3,
    completedVisits: 10,
  },
};
export const FATAL_MESSAGE = {
  protocolVersion: 1,
  type: "fatal",
  code: "PROTOCOL_VERSION",
  diagnostic: "unsupported version",
};

const M_PATH = new URL(
  "../../../public/weights/tinyaz-m.bin",
  import.meta.url,
).pathname;
let mBytes: ArrayBuffer | null = null;
export function mCheckpoint(): ArrayBuffer {
  if (mBytes === null) {
    const b = readFileSync(M_PATH);
    mBytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  }
  return mBytes.slice(0);
}

type Listener = (event: unknown) => void;

export class FakeWorker implements ThinkWorker {
  readonly posted: ClientMessage[] = [];
  readonly transfers: (readonly Transferable[])[] = [];
  private readonly listeners = new Map<string, Set<Listener>>();
  terminated = false;
  postMessage(message: unknown, transfer: Transferable[]): void;
  postMessage(message: unknown, options?: StructuredSerializeOptions): void;
  postMessage(
    message: unknown,
    second?: Transferable[] | StructuredSerializeOptions,
  ): void {
    const options = Array.isArray(second) ? { transfer: second } : second;
    this.posted.push(structuredClone(message, options) as ClientMessage);
    if (options?.transfer !== undefined) this.transfers.push(options.transfer);
  }
  addEventListener(type: string, fn: Listener): void {
    let set = this.listeners.get(type);
    if (set === undefined) this.listeners.set(type, (set = new Set()));
    set.add(fn);
  }
  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn);
  }
  terminate(): void {
    this.terminated = true;
  }
  emit(type: string, data: unknown): void {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn({ data });
  }
}

export function workerFactory(workers: FakeWorker[]) {
  return () => {
    const w = new FakeWorker();
    workers.push(w);
    return w;
  };
}

/** One fake-clock patch: deterministic fetch, time, timers, and worker factory. */
export function clockRuntime(
  clock: ReturnType<typeof makeClock>, workers: FakeWorker[], counter: { n: number },
): Partial<ThinkRuntime> {
  return {
    fetch: fetchOnce(counter), now: clock.now,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    createWorker: workerFactory(workers),
  };
}

export function makeClock() {
  let t = 0;
  let next = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => t,
    setTimeout: (fn: () => void, ms: number) => {
      const id = next++;
      timers.set(id, { at: t + ms, fn });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      timers.delete(id as unknown as number);
    },
    advance(ms: number): void {
      const limit = (t += ms);
      for (;;) {
        let due: number | null = null;
        for (const [id, timer] of timers) {
          if (timer.at <= limit && (due === null || timer.at < timers.get(due)!.at)) due = id;
        }
        if (due === null) return;
        const timer = timers.get(due)!;
        timers.delete(due);
        timer.fn();
      }
    },
  };
}

/** Clock whose advance moves time only; runDue fires due timers separately. */
export function delayedClock() {
  let t = 0;
  let next = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => t,
    setTimeout: (fn: () => void, ms: number) => {
      const id = next++;
      timers.set(id, { at: t + ms, fn });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      timers.delete(id as unknown as number);
    },
    advance: (ms: number): void => {
      t += ms;
    },
    pending: (): number => timers.size,
    runDue(): void {
      for (const [id, timer] of [...timers]) {
        if (timer.at <= t) {
          timers.delete(id);
          timer.fn();
        }
      }
    },
  };
}

export function patchRuntime(patch: Partial<ThinkRuntime>): () => void {
  const saved = {
    fetch: thinkRuntime.fetch,
    digestSha256: thinkRuntime.digestSha256,
    now: thinkRuntime.now,
    setTimeout: thinkRuntime.setTimeout,
    clearTimeout: thinkRuntime.clearTimeout,
    createWorker: thinkRuntime.createWorker,
  };
  Object.assign(thinkRuntime, patch);
  return () => Object.assign(thinkRuntime, saved);
}

export const tick = () => new Promise((r) => setImmediate(r));
export const pause = (ms = 3) => new Promise((r) => setTimeout(r, ms));

export async function until(fn: () => boolean, tries = 300): Promise<void> {
  for (let i = 0; i < tries && !fn(); i++) await pause();
  assert.ok(fn(), "condition was not reached");
}

export function fetchOnce(counter: { n: number }): ThinkRuntime["fetch"] {
  return (async () => {
    counter.n += 1;
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => mCheckpoint(),
    };
  }) as unknown as ThinkRuntime["fetch"];
}

export function sessionOf(msg: ClientMessage) {
  const m = msg as { engineSessionId: string; backendEpoch: number };
  return {
    protocolVersion: 1,
    engineSessionId: m.engineSessionId,
    backendEpoch: m.backendEpoch,
  };
}

export function readyMsg(init: ClientMessage, identity: ModelIdentity) {
  return { ...sessionOf(init), type: "ready", modelIdentity: identity };
}

export function moveOutcome(uci: string, visits: number): SearchOutcome {
  return {
    kind: "move",
    result: {
      uci,
      san: "e4",
      from: uci.slice(0, 2) as never,
      to: uci.slice(2, 4) as never,
      value: 0,
      visits,
      ms: 1,
      children: [],
      heatmap: {},
    },
    completedVisits: visits,
    searchMs: 1,
  };
}

export function contextOf(
  sessionId: string,
  requestId: number,
  requestedVisits = 1,
): RequestContext {
  return {
    engineSessionId: sessionId,
    gameGeneration: 0,
    requestId,
    position: capturePosition(START_FEN, [], START_FEN),
    requestedVisits,
  };
}

export async function rejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  assert.fail("expected the promise to reject");
}

export async function expectCode(
  p: Promise<unknown>,
  code: string,
): Promise<ThinkerFailure> {
  const failure = (await rejection(p)) as ThinkerFailure;
  assert.equal(failure.code, code);
  return failure;
}
