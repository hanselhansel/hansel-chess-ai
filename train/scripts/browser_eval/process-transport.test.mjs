// process-transport.test.mjs: collector wire lifecycle against the REAL
// protocol validator with a fake child and fake clock. Pending replies
// are retained until actual-clock acceptance, late acknowledgements
// reject actual work, frames are bounded before retention, backpressure
// never replays, and settlement is real exit plus BOTH pipe closes —
// never end()/destroy() invocation.
import test from "node:test";
import assert from "node:assert/strict";

import { createBudgetHandle } from "./process-budget.mjs";
import { createCollectorTransport } from "./process-transport.mjs";
import {
  collectorFixture,
  fakeClock,
  frame,
} from "./supervision-test-fixtures.mjs";

const ipc = (p) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => assert.equal(e.code, "IPC_INVALID"),
  );
const flush = () => new Promise((r) => setImmediate(r));

const setup = ({ script = {}, readyDeadlineMs = 30000 } = {}) => {
  const clock = fakeClock();
  const fixture = collectorFixture({ runId: "R1", script });
  const faults = [];
  const transport = createCollectorTransport({
    child: fixture.child,
    protocol: fixture.protocol,
    runId: "R1",
    clock,
    readyDeadlineMs,
    onFault: (e) => faults.push(e),
  });
  const mk = (ms = 1000) =>
    createBudgetHandle({
      deadlineMonoMs: clock.nowMs() + ms,
      clock,
      nowMonoMs: clock.nowMs,
    });
  // `tag` is a TEST-ONLY requestId selector: it is stripped before the
  // closed wire body so the real validator sees only legal fields.
  const sample = (handle, fields = {}) => {
    const { tag, ...body } = fields;
    return transport.send(
      "sample",
      { owned: [], inspectPids: [], probes: [], ...body },
      `req-${tag ?? fixture.written.length + 1}`,
      handle,
    );
  };
  // Withhold the fixture's synchronous auto-reply: the send stays
  // genuinely pending until the test drives the real reply itself.
  const silence = () => {
    fixture.child.stdin.write = (chunk, cb) => {
      fixture.written.push(JSON.parse(String(chunk).trim()));
      if (typeof cb === "function") cb();
      return true;
    };
  };
  return { clock, fixture, transport, faults, mk, sample, silence };
};

// A valid process-samples reply object for a requestId.
const reply = (requestId) => ({
  type: "process-samples",
  requestId,
  startedAtMonoNs: "1",
  finishedAtMonoNs: "2",
  discovered: [],
  samples: [],
  gone: [],
  inspected: [],
  probes: [],
});

test("awaitReady resolves only on the real ready frame", async () => {
  const { clock, fixture, transport, mk } = setup();
  const h = mk();
  const p = transport.awaitReady(h);
  clock.advance(5); // one poll, nothing yet
  fixture.ready();
  clock.advance(5); // the next poll observes it
  const ready = await p;
  assert.equal(ready.stage, "startup");
  assert.equal(ready.collector.pid, fixture.child.pid);
});

test("a valid reply resolves its pending request once", async () => {
  const { fixture, mk, sample } = setup();
  fixture.ready();
  const msg = await sample(mk());
  assert.equal(msg.type, "process-samples");
  assert.equal(fixture.written.length, 1);
  assert.equal(fixture.written[0].type, "sample");
});

test("late acknowledgement rejects actual send and fails the wire", async () => {
  const { clock, fixture, transport, faults, mk, sample, silence } =
    setup();
  fixture.ready();
  silence(); // the reply is withheld so the request stays pending
  const h = mk(10);
  const p = sample(h);
  // Rejection observation is attached BEFORE the clock advances past
  // the borrowed handle, so the failure can never land unhandled.
  const observed = ipc(p);
  clock.advance(10); // the borrowed handle expires with reply pending
  await observed;
  assert.equal(transport.failed, true);
  assert.equal(faults.length, 1);
  // The reply arriving now can never be admitted: the failed framer
  // drops every later byte and no waiter is stranded.
  fixture.emit(reply(fixture.written[0].requestId));
  await flush();
  assert.equal(transport.failed, true);
});

test("pending is installed before the write: a synchronous reply resolves", async () => {
  const { fixture, mk, sample } = setup();
  fixture.ready();
  // The fixture answers inside stdin.write — if pending were installed
  // after submission the reply would land on no waiter.
  const msg = await sample(mk());
  assert.equal(msg.type, "process-samples");
});

test("a requestId still pending can never be claimed again", async () => {
  const { fixture, mk, sample, silence } = setup();
  fixture.ready();
  silence(); // the first reply is withheld so its waiter stays owned
  const first = sample(mk(), { tag: "one" });
  // The colliding send rejects before touching the map; the first
  // waiter stays owned and resolves on its real reply.
  await ipc(sample(mk(), { tag: "one" }));
  fixture.emit(reply("req-one"));
  const msg = await first;
  assert.equal(msg.requestId, "req-one");
});

test("reap is real exit plus BOTH pipe closes; end/destroy never settle", async () => {
  const { fixture, transport, mk } = setup();
  fixture.ready();
  const h = mk();
  const reaped = transport.reap(h);
  let settled = false;
  reaped.then(() => (settled = true), () => (settled = true));
  fixture.child.exit(0);
  fixture.child.stdout.emitEnd(); // 'end' is not close proof
  fixture.child.stdin.end(); // end() invocation is not proof
  fixture.child.stdin.destroy(); // destroy() invocation is not proof
  fixture.child.stdout.emitClose();
  await flush();
  assert.equal(settled, false); // stderr still open
  fixture.child.stderr.emitClose();
  const r = await reaped;
  assert.equal(r.exitCode, 0);
});

test("whenReaped is the same physical receipt, not a fresh wait", async () => {
  const { fixture, transport } = setup();
  let done = false;
  transport.whenReaped().then(() => (done = true));
  fixture.child.exit(3);
  fixture.child.stdout.emitClose();
  fixture.child.stderr.emitClose();
  const r = await transport.whenReaped();
  assert.equal(r.exitCode, 3);
  await flush();
  assert.equal(done, true);
});

test("coalesced frames in one chunk decode every reply", async () => {
  const { fixture, transport, mk, sample } = setup();
  fixture.ready();
  fixture.child.stdin.write = (chunk, cb) => {
    const msg = JSON.parse(String(chunk).trim());
    fixture.written.push(msg);
    if (msg.type === "sample" && fixture.written.length === 2) {
      // Both c2s replies arrive inside ONE data chunk: seqs 1 and 2
      // (ready consumed seq 0), each bound to its own requestId.
      fixture.child.stdout.emitData(
        frame({
          ipcVersion: 1,
          runId: "R1",
          seq: 1,
          ...reply(fixture.written[0].requestId),
        }) +
          frame({
            ipcVersion: 1,
            runId: "R1",
            seq: 2,
            ...reply(msg.requestId),
          }),
      );
    }
    if (typeof cb === "function") cb();
    return true;
  };
  const a = sample(mk(), { tag: "a" });
  const b = sample(mk(), { tag: "b" });
  assert.equal((await a).requestId, "req-a");
  assert.equal((await b).requestId, "req-b");
});

test("an oversize unterminated tail is bounded before retention", async () => {
  const { fixture, transport } = setup();
  fixture.ready();
  // 1 MiB + 1 bytes with NO LF anywhere: the pre-retention bound fires
  // and the fragment is discarded rather than buffered.
  fixture.child.stdout.emitData(Buffer.alloc(1048577, 0x62));
  assert.equal(transport.failed, true);
  assert.equal(transport.lastError.code, "IPC_INVALID");
});

test("an oversize complete frame fails before any concat", async () => {
  const { fixture, transport } = setup();
  fixture.ready();
  fixture.child.stdout.emitData(
    Buffer.concat([Buffer.alloc(1048577, 0x61), Buffer.from("\n")]),
  );
  assert.equal(transport.failed, true);
});

test("a blank frame and an unterminated tail at close fail closed", async () => {
  {
    const { fixture, transport } = setup();
    fixture.ready();
    fixture.child.stdout.emitData(Buffer.from("\n"));
    assert.equal(transport.failed, true);
  }
  {
    const { fixture, transport, faults } = setup();
    fixture.ready();
    fixture.child.stdout.emitData(Buffer.from('{"partial"'));
    fixture.child.exit(0);
    fixture.child.stdout.emitClose();
    fixture.child.stderr.emitClose();
    await flush();
    assert.equal(transport.failed, true);
    assert.equal(faults.length, 1);
  }
});

test("backpressure pauses writes and drain never replays a frame", async () => {
  const { fixture, transport, mk, sample } = setup();
  fixture.ready();
  const stdin = fixture.child.stdin;
  let calls = 0;
  stdin.writeResult = false; // every write reports a full buffer once
  stdin.write = (chunk, cb) => {
    calls += 1;
    fixture.written.push(JSON.parse(String(chunk).trim()));
    void cb;
    return false;
  };
  const p1 = sample(mk(), { tag: "p1" });
  const p2 = sample(mk(), { tag: "p2" });
  assert.equal(calls, 1); // p1 written once, p2 held behind backpressure
  assert.equal(fixture.written.length, 1);
  // Reply to p1 so it settles, then drain admits p2 exactly once.
  fixture.emit(reply(fixture.written[0].requestId));
  stdin.writeResult = true;
  stdin.emit("drain");
  assert.equal(fixture.written.length, 2);
  assert.equal(calls, 2); // the first frame was never re-written
  fixture.emit(reply(fixture.written[1].requestId));
  await p1;
  await p2;
});

test("admitted teardown exit rejects pendings without poisoning the wire", async () => {
  const { fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  // The reply is withheld so the request stays genuinely pending until
  // the real exit facts arrive.
  silence();
  const pending = sample(mk());
  // Rejection observation is attached BEFORE the exit facts land.
  const observed = ipc(pending);
  // close() is the admitted-teardown path: ended stdin, then real exit
  // plus both closes settles the stranded request without a fault.
  transport.close();
  fixture.exit(0);
  await observed;
  assert.equal(transport.failed, false);
  assert.equal(transport.exited, true);
});

test("send on a dead or exited wire rejects before any write", async () => {
  const { fixture, mk, sample } = setup();
  fixture.ready();
  fixture.exit(0);
  await ipc(sample(mk()));
  assert.equal(fixture.written.length, 0);
});

test("a reply past the actual bound with a DELAYED timer still fails", async () => {
  const { clock, fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  silence(); // the request stays genuinely pending
  const h = mk(10);
  const p = sample(h);
  const observed = ipc(p);
  // The monotonic bound passes WITHOUT firing the expiry callback:
  // the late reply arrives while the waiter is still retained, and
  // the reply-admission assertLive recheck — not the timer — is what
  // rejects the actual send and fails the wire.
  clock.jumpWithoutTimers(10);
  fixture.emit(reply(fixture.written[0].requestId));
  await observed;
  assert.equal(transport.failed, true);
  // Draining the delayed timer changes nothing: the failure already
  // landed through the actual-clock gate.
  clock.runDue();
  await flush();
  assert.equal(transport.failed, true);
});

test("malformed UTF-8 on the wire fails the pending request", async () => {
  const { clock, fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  silence();
  const h = mk(50);
  const p = sample(h);
  const observed = ipc(p); // attached BEFORE any stimulus
  // A partial tail is retained across the multibyte boundary: two
  // bytes with no LF must NOT reject — strict decoding applies only
  // to a COMPLETE LF frame.
  fixture.child.stdout.emitData(Buffer.from([0xf0, 0x9f]));
  await flush();
  assert.equal(transport.failed, false);
  // The completed frame is malformed UTF-8: the actual decode fails.
  fixture.child.stdout.emitData(Buffer.from([0x28, 0x0a]));
  // Causal order first: after only a microtask flush — with the fake
  // clock UNCHANGED, so no timer has fired — the wire must already be
  // failed by the strict decode, not by any deadline.
  await flush();
  assert.equal(transport.failed, true);
  // The bounded advance is only cleanup for the still-retained
  // request: a timer-triggered IPC_INVALID must not be what satisfies
  // the decode test, so it follows the causal assertion.
  clock.advance(60);
  await observed;
});

test("a reply that violates owned partition fails the real validator", async () => {
  const { fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  silence();
  // The request owns pid 9 with a VALID numeric usec tuple so the
  // frame is genuinely written; a reply whose samples+gone do not
  // cover the owned set can never satisfy the closed partition rule.
  const p = sample(mk(), { owned: [{ pid: 9, startSec: "1", startUsec: 1 }] });
  const observed = ipc(p);
  assert.equal(fixture.written.length, 1);
  const bad = reply(fixture.written[0].requestId);
  bad.samples = [];
  bad.gone = [];
  fixture.emit(bad);
  await observed;
  assert.equal(transport.failed, true);
});

test("a reply missing an inspected pid fails completeness", async () => {
  const { fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  silence();
  const p = sample(mk(), { inspectPids: [4242] });
  const observed = ipc(p);
  const bad = reply(fixture.written[0].requestId);
  bad.inspected = []; // the requested inspect pid is absent
  fixture.emit(bad);
  await observed;
  assert.equal(transport.failed, true);
});

test("a reply missing a requested probe fails completeness", async () => {
  const { fixture, transport, mk, sample, silence } = setup();
  fixture.ready();
  silence();
  const id = { pid: 9000, startSec: "1000", startUsec: 0 };
  const p = sample(mk(), { probes: [id] });
  const observed = ipc(p);
  assert.equal(fixture.written.length, 1);
  const bad = reply(fixture.written[0].requestId);
  bad.probes = []; // the requested probe identity is absent
  fixture.emit(bad);
  await observed;
  assert.equal(transport.failed, true);
});
