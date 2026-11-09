// PURE test data/clock bindings. Genuine observation, ownership and handles.
import { createProcessObservation } from "./process-observation.mjs";
import { createOwnership } from "./process-ownership.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { fakeClock, identity, bsdRow, sampleReply } from "./supervision-test-fixtures.mjs";
export function makeTerminalObservation({ identities = [identity(4444)], commit = () => {} } = {}) {
  const clock = fakeClock(),
    ownership = createOwnership({ runId: "terminal" });
  for (const ident of identities) {
    ownership.registerRoot({
      identity: ident,
      kind: "browser",
      expectedExecutable: "/bin/x",
      scopeRunId: "terminal",
    });
    ownership._setRootRow(bsdRow(ident.pid, 1, ident.pid, 501, ident.startSec, ident.startUsec));
  }
  const requests = [],
    script = { gone: identities, reply: null, error: null, sticky: null };
  const handle = createBudgetHandle({ deadlineMonoMs: clock.nowMs() + 10000, clock, nowMonoMs: clock.nowMs });
  let observation = null,
    lastValidNs = null;
  const observer = createProcessObservation({
    ownership,
    clock,
    nextRid: () => `request-${requests.length + 1}`,
    requireHealthy: () => {
      if (script.health) throw script.health;
    },
    send: async (type, fields, rid, budget) => {
      requests.push({ type, ...structuredClone(fields), requestId: rid, budget });
      if (script.error) throw script.error;
      let reply = sampleReply({
        requestId: rid,
        owned: fields.owned,
        inspectPids: fields.inspectPids,
        probes: fields.probes,
      });
      reply.gone = fields.owned.filter((i) =>
        script.gone.some((g) => JSON.stringify(g) === JSON.stringify(i)),
      );
      reply.samples = reply.samples.filter(
        (s) => !reply.gone.some((g) => JSON.stringify(g) === JSON.stringify(s.identity)),
      );
      return script.reply ? script.reply(reply, requests.at(-1)) : reply;
    },
    state: () => ({
      lastObservation: observation,
      lastValidNs,
      stickyFault: script.sticky,
      sampling: true,
      nowMonoNs: clock.nowMonoNs(),
    }),
    commitCycle: (obs, time) => {
      commit(obs, time);
      observation = obs;
      lastValidNs = time;
    },
  });
  return {
    clock,
    ownership,
    observer,
    requests,
    script,
    handle,
    run: () => observer.runCycle(handle),
    dispose: () => handle.dispose(),
  };
}
