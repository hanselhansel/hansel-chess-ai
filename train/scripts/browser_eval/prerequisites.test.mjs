// Completed-receipt verification, identity/path/symlink/WORKTREE/closure/
// abandoned admission, exact required parent sets and internal self-test
// acceptance, all against real fixture receipts on a shared temporary
// workspace. Fixture receipts are never actual phase evidence.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import {
  admitPhase,
  inspectIncompletePhase,
  verifyInternalSelfTest,
  verifyReceipt,
} from "./prerequisites.mjs";
import {
  fixtureCommonIdentity,
  identity,
  makeWorkspace,
  ref,
  runReceiptPhase,
} from "./test-fixtures.mjs";

const code = async (promise, want) => {
  try {
    await promise;
  } catch (e) {
    assert.equal(e.code, want);
    return;
  }
  assert.fail(`expected ${want}`);
};

const gone = async () => "gone";
const live = async () => "same-live";

const chain = async () => {
  const env = await makeWorkspace();
  const check = await runReceiptPhase({ env, phase: "check" });
  const parity = await runReceiptPhase({
    env,
    phase: "parity",
    prerequisites: [
      { phase: "check", runId: "run-check", completion: check.completionRef },
    ],
  });
  // The selftest owner binds the supervisor identity the preflight phase
  // will declare in its own running.json (the fixture default 4242).
  const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity(4242) };
  const selftest = await runReceiptPhase({ env, phase: "watchdog-selftest", runId: "run-selftest", owner });
  const preflight = await runReceiptPhase({
    env,
    phase: "preflight",
    prerequisites: [
      { phase: "check", runId: "run-check", completion: check.completionRef },
      { phase: "parity", runId: "run-parity", completion: parity.completionRef },
    ],
    expectedSelfTest: {
      completion: selftest.completionRef,
      expectedStopReason: "HEARTBEAT_TIMEOUT",
    },
  });
  return { env, check, parity, selftest, preflight, owner };
};

test("verifyReceipt verifies a real completion chain with closure", async () => {
  const { env, check, parity } = await chain();
  const ev = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef: parity.completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  assert.equal(ev.phase, "parity");
  assert.equal(ev.closure.length, 1);
  assert.equal(ev.closure[0].phase, "check");
  const evCheck = await verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef: check.completionRef,
    expectedIdentity: env.ws.commonIdentity,
  });
  assert.equal(evCheck.closure.length, 0);
});

test("tampered completion bytes and wrong refs are rejected", async () => {
  const { env, check } = await chain();
  const p = path.join(env.workspaceRoot, check.completionRef.path);
  const bytes = await fsp.readFile(p);
  bytes[bytes.length - 3] ^= 0x01;
  await fsp.writeFile(p, bytes);
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: check.completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_MISMATCH",
  );
});

test("altered final status inside a receipt is rejected", async () => {
  const { env, check } = await chain();
  const finalPath = path.join(env.workspaceRoot, "check/final.json");
  const finalBytes = await fsp.readFile(finalPath);
  const tampered = Buffer.from(finalBytes.toString("utf8").replace('"passed"', '"failed"'));
  await fsp.writeFile(finalPath, tampered);
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: check.completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_INCOMPLETE",
  );
});

test("missing artifacts and deleted records are rejected", async () => {
  const { env, check } = await chain();
  await fsp.rm(path.join(env.workspaceRoot, "check/running.json"));
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: check.completionRef,
      expectedIdentity: env.ws.commonIdentity,
    }),
    "EVIDENCE_INCOMPLETE",
  );
});

test("admitPhase enforces exact parent sets and probes finalizers", async () => {
  const { env, check, parity } = await chain();
  const admitted = await admitPhase({
    workspaceRoot: env.workspaceRoot,
    phase: "preflight",
    commonIdentity: env.ws.commonIdentity,
    parents: [check.completionRef, parity.completionRef],
    probeIdentity: gone,
  });
  assert.equal(admitted.phase, "preflight");
  assert.deepEqual(
    admitted.parents.map((p) => p.phase),
    ["check", "parity"],
  );
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "preflight",
      commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef],
      probeIdentity: gone,
    }),
    "PREREQUISITE_INVALID",
  );
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "parity",
      commonIdentity: env.ws.commonIdentity,
      parents: [parity.completionRef],
      probeIdentity: gone,
    }),
    "PREREQUISITE_INVALID",
  );
});

test("admitPhase rejects a live finalizer and probe failures", async () => {
  const { env, check } = await chain();
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "parity",
      commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef],
      probeIdentity: live,
    }),
    "FINALIZER_LIVE",
  );
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "parity",
      commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef],
      probeIdentity: async () => {
        throw new Error("down");
      },
    }),
    "PROBE_UNAVAILABLE",
  );
});

test("admitPhase rejects extra parents and conflicting parent receipts", async () => {
  const { env, check, parity } = await chain();
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "parity",
      commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef, parity.completionRef],
      probeIdentity: gone,
    }),
    "PREREQUISITE_INVALID",
  );
});

test("compare admission requires the full transitive closure", async () => {
  const { env, check, parity, preflight } = await chain();
  const admitted = await admitPhase({
    workspaceRoot: env.workspaceRoot,
    phase: "compare",
    commonIdentity: env.ws.commonIdentity,
    parents: [check.completionRef, parity.completionRef, preflight.completionRef],
    probeIdentity: gone,
  });
  assert.deepEqual(
    admitted.closure.map((c) => c.phase),
    ["check", "parity", "preflight"],
  );
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "compare",
      commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef, preflight.completionRef],
      probeIdentity: gone,
    }),
    "PREREQUISITE_INVALID",
  );
});

test("WORKTREE candidate identity is rejected for preflight and compare", async () => {
  const env = await makeWorkspace();
  const worktreeIdentity = fixtureCommonIdentity({ candidateKind: "WORKTREE" });
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "preflight",
      commonIdentity: worktreeIdentity,
      parents: [],
      probeIdentity: gone,
    }),
    "WORKTREE_REJECTED",
  );
  await code(
    admitPhase({
      workspaceRoot: env.workspaceRoot,
      phase: "compare",
      commonIdentity: worktreeIdentity,
      parents: [],
      probeIdentity: gone,
    }),
    "WORKTREE_REJECTED",
  );
});

test("verifyInternalSelfTest binds owner, outcome and parent live probe", async () => {
  const { env, selftest, owner } = await chain();
  const out = await verifyInternalSelfTest({
    workspaceRoot: env.workspaceRoot,
    completionRef: selftest.completionRef,
    parentRunId: "run-preflight",
    parentSupervisor: owner.supervisor,
    expectedIdentity: env.ws.commonIdentity,
    probeIdentity: async (id) => (id.pid === owner.supervisor.pid ? "same-live" : "gone"),
  });
  assert.equal(out.parentRunId, "run-preflight");
  await code(
    verifyInternalSelfTest({
      workspaceRoot: env.workspaceRoot,
      completionRef: selftest.completionRef,
      parentRunId: "run-other",
      parentSupervisor: owner.supervisor,
      expectedIdentity: env.ws.commonIdentity,
      probeIdentity: gone,
    }),
    "SELFTEST_INVALID",
  );
  await code(
    verifyInternalSelfTest({
      workspaceRoot: env.workspaceRoot,
      completionRef: selftest.completionRef,
      parentRunId: "run-preflight",
      parentSupervisor: owner.supervisor,
      expectedIdentity: env.ws.commonIdentity,
      probeIdentity: gone,
    }),
    "SELFTEST_INVALID",
  );
});

test("inspectIncompletePhase reports complete/abandoned/in-use/unproven", async () => {
  const { env, check } = await chain();
  const done = await inspectIncompletePhase({
    workspaceRoot: env.workspaceRoot,
    phaseDirectory: "check",
    probeIdentity: gone,
  });
  assert.equal(done.state, "complete");
  assert.equal(done.completionRef.path, check.completionRef.path);
  const runningOnly = path.join(env.workspaceRoot, "orphan");
  await fsp.mkdir(runningOnly);
  const running = parseCanonicalBytes(
    await fsp.readFile(path.join(env.workspaceRoot, "check/running.json")),
  );
  await fsp.writeFile(path.join(runningOnly, "running.json"), canonicalBytes(running));
  const inUse = await inspectIncompletePhase({
    workspaceRoot: env.workspaceRoot,
    phaseDirectory: "orphan",
    probeIdentity: live,
  });
  assert.equal(inUse.state, "in-use");
  const abandoned = await inspectIncompletePhase({
    workspaceRoot: env.workspaceRoot,
    phaseDirectory: "orphan",
    probeIdentity: gone,
  });
  assert.equal(abandoned.state, "abandoned");
  const empty = await inspectIncompletePhase({
    workspaceRoot: env.workspaceRoot,
    phaseDirectory: "nothing",
    probeIdentity: gone,
  });
  assert.equal(empty.state, "unproven");
});

test("receipt ref path escapes are rejected by the ref schema", async () => {
  const { env } = await chain();
  await code(
    verifyReceipt({
      workspaceRoot: env.workspaceRoot,
      completionRef: ref("../outside.json", 1, 1),
      expectedIdentity: env.ws.commonIdentity,
    }),
    "SCHEMA_FORMAT",
  );
});

test("public seams snapshot caller refs, parents and supervisors", async () => {
  const { env, check, parity, selftest, owner } = await chain();
  const mutableRef = { ...check.completionRef };
  const mutableId = parseCanonicalBytes(canonicalBytes(env.ws.commonIdentity));
  const receipt = verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef: mutableRef,
    expectedIdentity: mutableId,
  });
  mutableRef.path = "check/manifest.json";
  mutableId.model.byteLength = 1;
  assert.equal((await receipt).completionRef.path, check.completionRef.path);
  // An initially wrong identity corrected mid-flight still rejects: a
  // different-but-valid content hash stays structurally legal so the
  // captured expectation reaches the EVIDENCE_MISMATCH comparison.
  const wrongId = parseCanonicalBytes(canonicalBytes(env.ws.commonIdentity));
  wrongId.candidate.contentSha256 = "9".repeat(64);
  const rejecting = verifyReceipt({
    workspaceRoot: env.workspaceRoot,
    completionRef: { ...check.completionRef },
    expectedIdentity: wrongId,
  });
  wrongId.candidate.contentSha256 = env.ws.commonIdentity.candidate.contentSha256;
  await code(rejecting, "EVIDENCE_MISMATCH");
  // Ghost-mutated parent lists and identities cannot rewrite admission.
  const parents = [{ ...check.completionRef }, { ...parity.completionRef }];
  const admitId = parseCanonicalBytes(canonicalBytes(env.ws.commonIdentity));
  const admitting = admitPhase({
    workspaceRoot: env.workspaceRoot,
    phase: "preflight",
    commonIdentity: admitId,
    parents,
    probeIdentity: gone,
  });
  parents.push({ ...check.completionRef });
  admitId.candidate.kind = "WORKTREE";
  assert.equal((await admitting).parents.length, 2);
  // The nested selftest's supervisor binding is owned as well.
  const supervisor = parseCanonicalBytes(canonicalBytes(owner.supervisor));
  const nested = verifyInternalSelfTest({
    workspaceRoot: env.workspaceRoot,
    completionRef: { ...selftest.completionRef },
    parentRunId: "run-preflight",
    parentSupervisor: supervisor,
    expectedIdentity: env.ws.commonIdentity,
    probeIdentity: async (id) => (id.pid === owner.supervisor.pid ? "same-live" : "gone"),
  });
  supervisor.pid = 1;
  assert.equal((await nested).parentSupervisor.pid, owner.supervisor.pid);
});
