import {
  SearchCancelledError, SearchDeadlineError, searchAsync,
} from "./mcts.ts";
import { thinkRuntime } from "./think-runtime.ts";
import { unpackWeights, type WeightSet } from "./weights.ts";
import type { RequestContext } from "./think-protocol.ts";
import type { SearchOutcome } from "./search-types.ts";

export interface MainRequest {
  readonly promise: Promise<SearchOutcome>;
  cancel(): void;
}

export interface MainBackend {
  readonly weights: WeightSet;
  think(context: RequestContext, deadlineMs: number): MainRequest;
}

/**
 * Internal decode/search capabilities, resolved at call time so Node tests can
 * replace members through mocks. Importing this module performs no decode,
 * search, timer, or worker work.
 */
export const mainCapabilities: Readonly<{
  decode(bytes: ArrayBuffer): WeightSet;
  search: typeof searchAsync;
}> = {
  decode: (bytes) => unpackWeights(bytes),
  search: (position, visits, weights, control) =>
    searchAsync(position, visits, weights, control),
};

/**
 * Decodes retained verified checkpoint bytes once; each think reuses the same
 * weights. One serial tail orders requests: a successor accepted after an
 * explicit cancellation still waits for the previous search's internal cleanup
 * inside its own unchanged deadline, so two main searches never run
 * concurrently. The backend owns no session or cross-backend policy.
 */
export function createMainBackend(bytes: ArrayBuffer): MainBackend {
  const weights = mainCapabilities.decode(bytes);
  let tail: Promise<unknown> = Promise.resolve();
  return {
    weights,
    think(context, deadlineMs) {
      const control = new AbortController();
      const prior = tail;
      const promise = prior.then(() => {
        if (control.signal.aborted) throw new SearchCancelledError();
        if (thinkRuntime.now() >= deadlineMs) throw new SearchDeadlineError();
        return mainCapabilities.search(
          context.position, context.requestedVisits, weights, {
            signal: control.signal,
            deadlineMs,
            now: thinkRuntime.now,
          },
        );
      });
      tail = promise.then(
        () => undefined,
        () => undefined,
      );
      return { promise, cancel: () => control.abort() };
    },
  };
}
