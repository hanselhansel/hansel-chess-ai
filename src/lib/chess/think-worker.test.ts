import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SELECTED_MODEL_IDENTITY } from "./checkpoint.ts";
import { THINK_PROTOCOL_VERSION } from "./constants.ts";
import type {
  ClientMessage,
  FatalMessage,
  ReadyMessage,
  ResultMessage,
  WorkerErrorMessage,
  WorkerMessage,
} from "./think-protocol.ts";
import { createWorkerHandler } from "../../workers/think.worker.ts";
import {
  contextOf,
  mCheckpoint,
  patchRuntime,
  sessionOf,
  START_FEN,
  until,
} from "./think-test-fixtures.ts";

const SESSION_ID = "worker-session-1";
const EPOCH = 5;
const MATE_FEN =
  "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

type Outbox = { sent: WorkerMessage[]; handle: (raw: unknown) => void };

function harness(): Outbox {
  const sent: WorkerMessage[] = [];
  const handle = createWorkerHandler((msg) => sent.push(msg));
  return { sent, handle };
}

function initMessage(
  bytes: ArrayBuffer,
): Extract<ClientMessage, { type: "init" }> {
  return {
    protocolVersion: THINK_PROTOCOL_VERSION,
    type: "init",
    engineSessionId: SESSION_ID,
    backendEpoch: EPOCH,
    modelIdentity: SELECTED_MODEL_IDENTITY,
    bytes,
  };
}

function thinkMessage(
  requestId: number, visits = 1,
): Extract<ClientMessage, { type: "think" }> {
  return {
    protocolVersion: THINK_PROTOCOL_VERSION,
    type: "think",
    engineSessionId: SESSION_ID,
    backendEpoch: EPOCH,
    context: contextOf(SESSION_ID, requestId, visits),
    remainingMs: 30000,
  };
}

const ofType = <T extends WorkerMessage["type"]>(
  sent: WorkerMessage[], type: T,
): Extract<WorkerMessage, { type: T }>[] =>
  sent.filter((m): m is Extract<WorkerMessage, { type: T }> => m.type === type);

async function readyWorker(): Promise<Outbox> {
  const w = harness();
  w.handle(initMessage(mCheckpoint()));
  await until(() => ofType(w.sent, "ready").length === 1);
  return w;
}

describe("worker import boundary", () => {
  it("installs no handler under Node", async () => {
    await import("../../workers/think.worker.ts");
    const scope = globalThis as Record<string, unknown>;
    assert.equal(typeof scope.DedicatedWorkerGlobalScope, "undefined");
    assert.equal(scope.onmessage, undefined);
    const sent: WorkerMessage[] = [];
    createWorkerHandler((m) => sent.push(m));
    assert.equal(sent.length, 0);
  });
});

describe("worker handler lifecycle", () => {
  it("rejects think before init with NOT_READY", () => {
    const w = harness();
    w.handle(thinkMessage(0));
    const errors = ofType(w.sent, "error") as WorkerErrorMessage[];
    assert.equal(errors.length, 1);
    assert.equal(errors[0].scope, "request");
    assert.equal(errors[0].failure.code, "NOT_READY");
  });

  it("verifies bytes independently, echoes identity, transfers detach", async () => {
    const w = harness();
    const bytes = mCheckpoint();
    const message = structuredClone(initMessage(bytes), { transfer: [bytes] });
    assert.equal(bytes.byteLength, 0);
    w.handle(message);
    await until(() => ofType(w.sent, "ready").length === 1);
    const ready = ofType(w.sent, "ready")[0] as ReadyMessage;
    assert.deepEqual(ready.modelIdentity, SELECTED_MODEL_IDENTITY);
    assert.equal(ready.engineSessionId, SESSION_ID);
    assert.equal(ready.backendEpoch, EPOCH);
    w.handle(thinkMessage(0, 1));
    await until(() => ofType(w.sent, "result").length === 1);
    const result = ofType(w.sent, "result")[0] as ResultMessage;
    assert.equal(result.outcome.kind, "move");
    if (result.outcome.kind === "move") {
      assert.equal(typeof result.outcome.result.uci, "string");
    }
    assert.equal(result.context.requestId, 0);
  });

  it("reports a second active think as BUSY, not a duplicate search", async () => {
    const w = await readyWorker();
    w.handle(thinkMessage(0));
    w.handle(thinkMessage(1));
    await until(() => ofType(w.sent, "result").length === 1);
    const errors = ofType(w.sent, "error") as WorkerErrorMessage[];
    assert.equal(errors.length, 1);
    assert.equal(errors[0].failure.code, "BUSY");
    assert.ok("context" in errors[0] && errors[0].context.requestId === 1);
  });

  it("fails malformed, wrong-version, and foreign-session envelopes terminally", async () => {
    const w = await readyWorker();
    w.handle({ protocolVersion: 9, type: "think", context: contextOf(SESSION_ID, 0) });
    const fatals = ofType(w.sent, "fatal") as FatalMessage[];
    assert.equal(fatals.length, 1);
    assert.equal(fatals[0].code, "PROTOCOL_VERSION");
    w.handle(thinkMessage(0));
    assert.equal(ofType(w.sent, "result").length, 0);
    assert.equal(ofType(w.sent, "ready").length, 1);
    assert.equal(w.sent.length, 2);

    const again = await readyWorker();
    again.handle({ ...thinkMessage(0), engineSessionId: "other-session" });
    const fatal = ofType(again.sent, "fatal") as FatalMessage[];
    assert.equal(fatal[0].code, "PROTOCOL_INVALID");
    again.handle(thinkMessage(0));
    assert.equal(ofType(again.sent, "result").length, 0);
  });

  it("treats repeated and failed initialization as terminal", async () => {
    const w = await readyWorker();
    w.handle(initMessage(mCheckpoint()));
    const fatals = ofType(w.sent, "fatal") as FatalMessage[];
    assert.equal(fatals.length, 1);
    assert.equal(fatals[0].code, "PROTOCOL_INVALID");
    w.handle(thinkMessage(0));
    assert.equal(ofType(w.sent, "result").length, 0);

    const broken = harness();
    const badBytes = mCheckpoint();
    new Uint8Array(badBytes)[100] ^= 0xff;
    broken.handle(initMessage(badBytes));
    await until(() => ofType(broken.sent, "error").length === 1);
    assert.equal(
      (ofType(broken.sent, "error")[0] as WorkerErrorMessage).failure.code,
      "LOAD_DIGEST",
    );
    broken.handle(initMessage(mCheckpoint()));
    broken.handle(thinkMessage(0));
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(ofType(broken.sent, "ready").length, 0);
    assert.equal(ofType(broken.sent, "result").length, 0);
    assert.equal(broken.sent.length, 1);
  });

  it("suppresses a pending digest continuation after a fatal", async () => {
    const w = harness();
    w.handle(initMessage(mCheckpoint()));
    w.handle("garbage");
    const fatals = ofType(w.sent, "fatal") as FatalMessage[];
    assert.equal(fatals.length, 1);
    assert.equal(fatals[0].code, "PROTOCOL_INVALID");
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(ofType(w.sent, "ready").length, 0);
    w.handle(thinkMessage(0));
    assert.equal(ofType(w.sent, "result").length, 0);
  });

  it("suppresses a pending digest rejection after a fatal", async () => {
    const gate: { release?: () => void } = {};
    const unpatch = patchRuntime({
      digestSha256: () =>
        new Promise<ArrayBuffer>((_res, rej) => {
          gate.release = () => rej(new Error("digest blew up"));
        }),
    });
    try {
      const w = harness();
      w.handle(initMessage(mCheckpoint()));
      w.handle("garbage");
      const fatals = ofType(w.sent, "fatal") as FatalMessage[];
      assert.equal(fatals.length, 1);
      assert.equal(fatals[0].code, "PROTOCOL_INVALID");
      gate.release?.();
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(w.sent.length, 1);
    } finally {
      unpatch();
    }
  });

  it("anchors the request budget to receipt, including a terminal position", async () => {
    let t = 0;
    const unpatch = patchRuntime({ now: () => t });
    try {
      const w = await readyWorker();
      const think = thinkMessage(0, 1);
      w.handle({ ...think, remainingMs: 10 });
      t = 11;
      await until(() => ofType(w.sent, "error").length === 1);
      const errors = ofType(w.sent, "error") as WorkerErrorMessage[];
      assert.equal(errors[0].failure.code, "DEADLINE");
      assert.equal(ofType(w.sent, "result").length, 0);

      const terminal = thinkMessage(1, 1);
      w.handle({
        ...terminal,
        context: {
          ...terminal.context,
          position: {
            initialFen: MATE_FEN,
            movesUci: [],
            expectedFen: MATE_FEN,
          },
        },
        remainingMs: 5,
      });
      t = 20;
      await until(() => ofType(w.sent, "error").length === 2);
      const last = ofType(w.sent, "error")[1] as WorkerErrorMessage;
      assert.equal(last.failure.code, "DEADLINE");
      assert.equal(ofType(w.sent, "result").length, 0);
    } finally {
      unpatch();
    }
  });

  it("produces typed request faults without resetting the session", async () => {
    const w = await readyWorker();
    const msg = thinkMessage(0, 1);
    w.handle({
      ...msg,
      context: {
        ...msg.context,
        position: {
          initialFen: START_FEN,
          movesUci: ["e2e5"],
          expectedFen: START_FEN,
        },
      },
    });
    await until(() => ofType(w.sent, "error").length === 1);
    const errors = ofType(w.sent, "error") as WorkerErrorMessage[];
    assert.equal(errors[0].scope, "request");
    assert.equal(errors[0].failure.code, "POSITION_INVALID");
    w.handle(thinkMessage(1, 1));
    await until(() => ofType(w.sent, "result").length === 1);
    assert.equal(w.sent.filter((m) => m.type === "fatal").length, 0);
  });
});

describe("worker handler state facts", () => {
  it("attaches the session envelope to every reply", async () => {
    const w = await readyWorker();
    const init = initMessage(mCheckpoint());
    for (const msg of w.sent) {
      assert.notEqual(msg.type, "fatal");
      if (msg.type !== "fatal") {
        assert.equal(msg.engineSessionId, sessionOf(init).engineSessionId);
      }
    }
    w.handle(thinkMessage(3));
    await until(() => ofType(w.sent, "result").length === 1);
    const result = ofType(w.sent, "result")[0];
    assert.equal(result.engineSessionId, SESSION_ID);
    assert.equal(result.backendEpoch, EPOCH);
  });
});
