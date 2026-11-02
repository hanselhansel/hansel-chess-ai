export type ThinkRuntime = {
  fetch: typeof fetch;
  digestSha256(bytes: ArrayBuffer): Promise<ArrayBuffer> | null;
  now(): number;
  setTimeout(handler: () => void, ms: number): ReturnType<typeof setTimeout>;
  clearTimeout(id: ReturnType<typeof setTimeout>): void;
  createWorker(): Worker;
};

/** Real platform capabilities, resolved at call time so tests can mock them. */
export const thinkRuntime: ThinkRuntime = {
  fetch: (input, init) => fetch(input, init),
  digestSha256: (bytes) => globalThis.crypto?.subtle?.digest("SHA-256", bytes) ?? null,
  now: () => performance.now(),
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (id) => clearTimeout(id),
  createWorker: () =>
    new Worker(new URL("../../workers/think.worker.ts", import.meta.url), {
      type: "module",
    }),
};
