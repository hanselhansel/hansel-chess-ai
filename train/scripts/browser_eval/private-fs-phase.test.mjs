import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createArtifactStore } from "./artifact-store.mjs";
import { createFootprintObserver } from "./workspace-footprint.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";

test("complete actual Store IO avoids an unavailable async metadata pool", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "private-fs-red-"));
  const lifetime = createWatchdogLifetime();
  const footprint = createFootprintObserver({ workspaceRoot: root });
  const store = createArtifactStore({
    workspaceRoot: root,
    lifetime,
    monotonicNow: () => Number(process.hrtime.bigint() / 1000000n),
    readFootprint: () => issueActual(lifetime.retainActual, () => footprint.readFootprint()),
  });
  let release, entered;
  const hold = new Promise((r) => {
    release = r;
  });
  const usedPool = new Promise((r) => {
    entered = r;
  });
  const original = fsp.lstat;
  fsp.lstat = (...args) => {
    entered({ kind: "async-pool-entered" });
    return hold.then(() => original(...args));
  };
  const body = (async () => {
    await store.writeOnce("control/first.json", Buffer.from('{"real":true}\n'), "ordinary");
    const sink = await store.openArtifact({
      artifactId: "control-events",
      path: "control/events.jsonl",
      mode: "append",
      lane: "ordinary",
    });
    await sink.append(Buffer.from('{"actual":true}\n'));
    const ref = await sink.close();
    assert.equal(ref.byteLength, 16);
    return { kind: "finished" };
  })();
  const outcome = body.then(
    (v) => v,
    (error) => ({ kind: "failed", error }),
  );
  try {
    const result = await Promise.race([outcome, usedPool]);
    assert.equal(
      result.kind,
      "finished",
      "private phase IO must not depend on the blocked async metadata pool",
    );
  } finally {
    fsp.lstat = original;
    release();
    await outcome;
    assert.equal(
      (await outcome).kind,
      "finished",
      "actual controlled Store body must finish after release",
    );
    footprint.stop();
    await lifetime.whenSettled();
    await fsp.rm(root, { recursive: true, force: true });
    console.log("actual Store body, sink FD and inherited lifetime joined");
  }
});

test("real Recorder publication and retained receipt reads avoid every async private default", async () => {
  const { makeWorkspace, makeRecorder } = await import("./test-fixtures.mjs");
  const { REQUIRED_CHECK_IDS } = await import("./schema-constants.mjs");
  const { verifyReceipt } = await import("./prerequisites.mjs");
  const { artifactStoreLifetime } = await import("./artifact-store.mjs");
  const base = await makeWorkspace();
  const { privateFs } = await import("./private-fs.mjs");
  const originals = Object.fromEntries(Object.keys(privateFs).map((name) => [name, fsp[name]]));
  let release, entered;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const touchedPool = new Promise((resolve) => {
    entered = resolve;
  });
  const calls = [];
  for (const name of Object.keys(originals)) {
    fsp[name] = (...args) => {
      calls.push(name);
      entered({ kind: "async-pool-entered", name });
      return hold.then(() => originals[name](...args));
    };
  }
  let recorder,
    finalizeIssued = false;
  const body = (async () => {
    const env = await makeRecorder({ env: base });
    recorder = env.recorder;
    await recorder.appendEvent({ kind: "resource", payload: { retained: true } });
    finalizeIssued = true;
    const completion = await recorder.finalize({
      intent: {
        status: "passed",
        exitCode: 0,
        stopReason: null,
        summary: {},
        unplannedFaultCount: 0,
        analysisEligible: false,
      },
      checks: REQUIRED_CHECK_IDS.check
        .filter((id) => id !== "cleanup")
        .map((id) => ({ id, status: "passed", evidencePaths: [] })),
      prerequisites: [],
      expectedSelfTest: null,
    });
    const verified = await verifyReceipt({
      workspaceRoot: base.workspaceRoot,
      completionRef: completion,
      expectedIdentity: base.ws.commonIdentity,
    });
    assert.equal(verified.final.status, "passed");
    return { kind: "finished" };
  })();
  const outcome = body.then(
    (v) => v,
    (error) => ({ kind: "failed", error }),
  );
  try {
    const result = await Promise.race([outcome, touchedPool]);
    if (result.kind === "failed") throw result.error;
    assert.equal(result.kind, "finished");
    assert.deepEqual(calls, []);
  } finally {
    Object.assign(fsp, originals);
    release();
    await outcome;
    if (recorder && !finalizeIssued) await recorder.closeIncompleteEvidence();
    await artifactStoreLifetime(base.store).whenSettled();
    await fsp.rm(base.workspaceRoot, { recursive: true, force: true });
  }
});

test("explicit functional closure has no remaining harness async FS defaults", async () => {
  const { RUNTIME_PATHS } = await import("./snapshot-files.mjs");
  const root = new URL("../../../", import.meta.url);
  assert.equal(RUNTIME_PATHS.length, 128);
  assert.equal(RUNTIME_PATHS.includes("train/scripts/browser_eval/private-fs.mjs"), true);
  assert.equal(RUNTIME_PATHS.includes("train/scripts/browser_eval/footprint-trace.mjs"), true);
  for (const name of RUNTIME_PATHS.filter((p) => p.endsWith(".mjs"))) {
    const source = await fsp.readFile(new URL(name, root), "utf8");
    assert.equal(/from ["']node:fs\/promises["']/.test(source), false, name);
    for (const binding of source.matchAll(/import([^;]+)from ["']node:fs["'];/g)) {
      if (name.endsWith("/private-fs.mjs")) continue;
      assert.equal(/promises|createReadStream/.test(binding[1]), false, name);
    }
  }
});

test("a slow real sync stat cannot authorize later stream IO after the borrowed end", async () => {
  const { default: syncFs } = await import("node:fs");
  const { createBackendReader } = await import("./process-backend-reader.mjs");
  const { createBudgetHandle } = await import("./process-budget.mjs");
  const { fakeClock } = await import("./supervision-test-fixtures.mjs");
  const { privateFs, createPrivateReadStream } = await import("./private-fs.mjs");
  const clock = fakeClock();
  const handle = createBudgetHandle({
    deadlineMonoMs: clock.nowMs() + 10,
    clock,
    nowMonoMs: clock.nowMs,
  });
  const lifetime = createWatchdogLifetime();
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "private-fs-late-"));
  const file = path.join(root, "data");
  await fsp.writeFile(file, "actual bytes");
  const original = syncFs.statSync;
  let streams = 0,
    stats = 0;
  syncFs.statSync = (...args) => {
    stats++;
    const result = original(...args);
    clock.jumpWithoutTimers(11);
    return result;
  };
  const reader = createBackendReader({
    handle,
    retainActual: lifetime.retainActual,
    statFile: privateFs.stat,
    createStream: (...args) => {
      streams++;
      return createPrivateReadStream(...args);
    },
  });
  try {
    await assert.rejects(reader.readFact(file, 1024, "slow sync"), {
      code: "ACCOUNTING_UNAVAILABLE",
    });
    await lifetime.whenSettled();
    assert.equal(stats, 1);
    assert.equal(streams, 0);
  } finally {
    syncFs.statSync = original;
    handle.dispose();
    await fsp.rm(root, { recursive: true, force: true });
  }
});
