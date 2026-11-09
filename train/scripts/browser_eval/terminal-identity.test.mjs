import test from "node:test";
import assert from "node:assert/strict";
import { makeTerminalObservation } from "./terminal-test-fixtures.mjs";

test("admitted Native gone prevents repeated oldtuple permission while full history remains", async () => {
  const f = makeTerminalObservation();
  try {
    await f.run();
    f.script.reply = (reply, request) => {
      if (request.owned.some((i) => i.pid === 4444)) {
        throw Object.assign(new Error("pidinfo-bsd 4444 errno 1"), { code: "ACCOUNTING_UNAVAILABLE" });
      }
      return reply;
    };
    await f.run();
    assert.deepEqual(f.requests[1].owned, []);
    assert.equal(f.ownership.ownedIdentities().length, 1);
  } finally {
    f.dispose();
  }
});

import { identity, bsdRow } from "./supervision-test-fixtures.mjs";
const old = identity(4444);
for (const failure of ["batch", "flush", "native-duration", "gap", "expiry", "sticky", "commit"]) {
  test(`whole ${failure} failure cannot admit a terminal fact`, async () => {
    const original = new Error(failure);
    const f = makeTerminalObservation({
      commit: () => {
        if (failure === "commit") throw original;
      },
    });
    try {
      f.script.reply = (reply) => {
        if (["batch", "flush"].includes(failure)) throw original;
        if (failure === "native-duration") reply.finishedAtMonoNs = "500000002";
        if (failure === "gap") f.clock.jumpWithoutTimers(501);
        if (failure === "expiry") f.handle.narrow(0);
        if (failure === "sticky") f.script.sticky = original;
        return reply;
      };
      await assert.rejects(f.run());
      assert.equal(f.observer.isTerminalIdentity(old), false);
      assert.deepEqual(f.observer.sampleOwnedIdentities(), [old]);
    } finally {
      f.dispose();
    }
  });
}

test("later coverage failure commits NONE; later-round reappearance is a contradiction", async () => {
  for (const contradiction of [false, true]) {
    const f = makeTerminalObservation();
    try {
      f.script.reply = (reply) => {
        if (f.requests.length === 1) {
          reply.discovered = [bsdRow(4444, 1, 4444, 501), bsdRow(4445, 4444, 4444, 501)];
          return reply; // Earlier SAME-batch census + later gone is legitimate.
        }
        if (!contradiction) throw new Error("later coverage failed");
        reply.discovered = [bsdRow(4444, 1, 4444, 501)];
        return reply;
      };
      await assert.rejects(f.run(), (error) =>
        contradiction
          ? /terminal identity reappeared/.test(error.message)
          : /later coverage/.test(error.message),
      );
      assert.equal(f.requests.length, 2);
      assert.equal(f.observer.isTerminalIdentity(old), false);
    } finally {
      f.dispose();
    }
  }
});

test("earlier same-batch census is legal, later exact reappearance faults without revival", async () => {
  const f = makeTerminalObservation();
  try {
    f.script.reply = (reply) => ({ ...reply, discovered: [bsdRow(4444, 1, 4444, 501)] });
    await f.run();
    assert.equal(f.observer.isTerminalIdentity(old), true);
    await assert.rejects(f.run(), /terminal identity reappeared/);
    assert.equal(f.observer.isTerminalIdentity(old), true);
    assert.equal(f.ownership.ownedIdentities().length, 1);
  } finally {
    f.dispose();
  }
});

test("same PID new birth is sampled freshly and never inherits absence or stale RSS", async () => {
  const f = makeTerminalObservation();
  const next = identity(4444, "2000", 1);
  try {
    await f.run();
    f.ownership.registerRoot({
      identity: next,
      kind: "browser",
      expectedExecutable: "/bin/x",
      scopeRunId: "terminal",
    });
    f.script.reply = (reply) => ({ ...reply, discovered: [bsdRow(4444, 1, 4444, 501, "2000", 1)] });
    const result = await f.run();
    assert.deepEqual(f.requests[1].owned, [next]);
    assert.equal(f.observer.isTerminalIdentity(next), false);
    assert.equal(result.sampled, 1);
    assert.equal(result.gone, 1);
    assert.equal(result.rssBytes, 1024);
    assert.equal(f.ownership.ownedIdentities().length, 2);
  } finally {
    f.dispose();
  }
});

test("fresh runs start empty and exported readers cannot forge/alter terminal state", async () => {
  const a = makeTerminalObservation(),
    b = makeTerminalObservation();
  try {
    await a.run();
    assert.equal(b.observer.isTerminalIdentity(old), false);
    const snapshot = b.observer.sampleOwnedIdentities();
    snapshot.length = 0;
    assert.deepEqual(b.observer.sampleOwnedIdentities(), [old]);
    assert.deepEqual(
      Object.keys(a.observer).sort(),
      [
        "assertNoTerminalReappearance",
        "isTerminalIdentity",
        "projectObservation",
        "runCycle",
        "sampleOwnedIdentities",
      ].sort(),
    );
    assert.equal(a.ownership.isTerminalIdentity, undefined);
    assert.throws(() => {
      a.observer.commitTerminal = () => {};
    }, TypeError);
    assert.equal(a.observer.isTerminalIdentity({ ...old, startUsec: 2 }), false);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test("never-proven denial stays fatal and cannot clear previously admitted facts", async () => {
  const f = makeTerminalObservation();
  const live = identity(5555);
  try {
    await f.run();
    f.ownership.registerRoot({
      identity: live,
      kind: "browser",
      expectedExecutable: "/bin/x",
      scopeRunId: "terminal",
    });
    const cause = Object.assign(new Error("pidinfo-bsd 5555 errno 13"), { code: "ACCOUNTING_UNAVAILABLE" });
    f.script.error = cause;
    await assert.rejects(f.run(), (e) => e === cause);
    assert.equal(f.observer.isTerminalIdentity(old), true);
    assert.equal(f.observer.isTerminalIdentity(live), false);
    assert.deepEqual(f.requests.at(-1).owned, [live]);
  } finally {
    f.dispose();
  }
});
