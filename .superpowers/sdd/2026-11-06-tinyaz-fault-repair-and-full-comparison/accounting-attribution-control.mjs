// TEST-only. Execute only after independent review and a separate Root GO.
// No model/browser/game/SDK. Immutable source tree is never modified.
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { privateFs } from "../../../train/scripts/browser_eval/private-fs.mjs";
import { issueActual, openActual } from "../../../train/scripts/browser_eval/artifact-files.mjs";
import { createArtifactStore } from "../../../train/scripts/browser_eval/artifact-store.mjs";
import { createFootprintObserver } from "../../../train/scripts/browser_eval/workspace-footprint.mjs";
import { createNativeTestHarness } from "../../../train/scripts/browser_eval/native-test-fixtures.mjs";
import { createWatchdogLifetime } from "../../../train/scripts/browser_eval/watchdog-lifetime.mjs";
import { createCleanupController } from "../../../train/scripts/browser_eval/watchdog-cleanup.mjs";
import {
  createBudgetHandle,
  waitHandle,
} from "../../../train/scripts/browser_eval/process-budget.mjs";
import {
  createAttributionObserver,
  requireFullNativeWindow,
  attributionVerdict,
  attributionHarnessOptions,
} from "../../../train/scripts/browser_eval/native-attribution-observer.mjs";
import { PYTHON_EXECUTABLE } from "../../../train/scripts/browser_eval/schema-constants.mjs";

const FREEZE = fileURLToPath(
  new URL(
    "./task-3-failure-freeze-3c9a9c6-20261107T234839429Z-2be771b1-8bac-4207-960a-d6a57669fdb3/",
    import.meta.url,
  ),
);
const MANIFEST_SHA = "6c4eda2d108142151c0229488617fe73054b9fbf7998c73cb570e3e1f2751dab";
const MAX = 4 * 1024 * 1024;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const now = () => Number(process.hrtime.bigint() / 1000000n);
const clock = { setTimeout, clearTimeout };
const describe = (error) => ({
  code: error?.code ?? null,
  message: String(error?.message ?? error).slice(0, 2048),
});

async function main() {
  assert.equal(process.argv[2], "--execute-reviewed", "separate Root execution GO required");
  const out = process.argv[3];
  assert.ok(typeof out === "string" && path.isAbsolute(out));
  const originalStart = now(),
    originalEnd = originalStart + 90000;
  const outer = createBudgetHandle({ deadlineMonoMs: originalEnd, clock, nowMonoMs: now });
  const lifetime = createWatchdogLifetime();
  let h = null,
    monitor = null,
    footprint = null,
    observer = null,
    sink = null,
    ready = null;
  let primary = null,
    cleanupStart = null,
    cleanupEnd = null,
    proofEnd = null,
    cleanupProof = null;
  const outcomes = [],
    stages = [],
    caughtErrors = [];
  const fault = (error) => {
    const observedAt = now();
    caughtErrors.push({ detail: describe(error), observedAtMonoMs: observedAt });
    if (primary === null) {
      const native = monitor?.fault();
      primary = native
        ? {
            cause: native,
            detail: { code: native.code, message: native.detail },
            atMonoMs: Number(BigInt(native.atMonoNs) / 1000000n),
          }
        : { cause: error, detail: describe(error), atMonoMs: observedAt };
      cleanupStart = observedAt; // First CONTROL stop observation, not backdated native time.
    }
  };
  const raw = (fn) => issueActual(lifetime.retainActual, fn);
  const checked = async (fn) => {
    outer.assertLive("attribution setup");
    const value = await raw(fn);
    outer.assertLive("attribution setup return");
    return value;
  };
  let report,
    initialFootprint = null;
  try {
    // An exclusive direct child of the canonical temp parent cannot write into
    // the preserved repo/freeze/old workspaces, even with a mistaken output arg.
    const temporaryParent = await checked(() => privateFs.realpath(os.tmpdir()));
    assert.equal(path.dirname(out), temporaryParent);
    assert.ok(path.basename(out).startsWith("tinyaz-accounting-attribution-"));
    await checked(() => privateFs.mkdir(out, { mode: 0o700 }));
    const manifestBytes = await checked(() =>
      privateFs.readFile(path.join(FREEZE, "workspace-manifest.json")),
    );
    assert.equal(hash(manifestBytes), MANIFEST_SHA);
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.fileCount, 3361);
    assert.equal(manifest.fileBytes, 52866136);
    const source = path.join(FREEZE, "workspace"),
      tree = path.join(out, "tree");
    await checked(() => privateFs.mkdir(tree, { mode: 0o700 }));
    const entries = manifest.entries;
    const confined = (root, relative) => {
      assert.ok(typeof relative === "string" && relative !== "" && !path.isAbsolute(relative));
      const full = path.resolve(root, relative);
      assert.ok(full.startsWith(root + path.sep));
      return full;
    };
    // Traverse only the already sealed inventory. Never follow a source link.
    for (const entry of entries
      .filter((e) => e.type === "directory")
      .sort((a, b) => a.path.split("/").length - b.path.split("/").length)) {
      await checked(() => privateFs.mkdir(confined(tree, entry.path), { mode: 0o700 }));
    }
    let count = 0,
      bytes = 0;
    for (const entry of entries) {
      if (entry.type === "file") {
        const src = confined(source, entry.path),
          dst = confined(tree, entry.path);
        const stat = await checked(() => privateFs.lstat(src));
        assert.equal(stat.isSymbolicLink(), false);
        const data = await checked(() => privateFs.readFile(src));
        assert.equal(hash(data), entry.sha256);
        assert.equal(data.length, entry.bytes);
        outer.assertLive("copy open");
        const fd = await openActual(lifetime.retainActual, () => privateFs.open(dst, "wx", 0o600));
        try {
          for (let offset = 0; offset < data.length;) {
            outer.assertLive("copy write");
            const result = await fd.write(
              data,
              offset,
              Math.min(65536, data.length - offset),
              null,
            );
            assert.ok(result.bytesWritten > 0);
            offset += result.bytesWritten;
          }
          outer.assertLive("copy sync");
          await fd.sync();
        } finally {
          await fd.close();
        }
        count++;
        bytes += data.length;
      } else if (entry.type === "symlink") {
        await checked(() => privateFs.symlink(entry.target, confined(tree, entry.path)));
      }
    }
    assert.equal(count, 3361);
    assert.equal(bytes, 52866136);
    requireFullNativeWindow(originalEnd, now());
    const runId = `accounting-attribution-${process.pid}`;
    h = createNativeTestHarness(
      attributionHarnessOptions({
        controlUrl: import.meta.url,
        runId,
        pythonExecutable: PYTHON_EXECUTABLE,
        evidenceRoot: out,
        lifetime,
        observeChild: (...args) => observer.observeChild(...args),
      }),
    );
    assert.ok(h.bounds.deadlineMonoMs <= originalEnd, "unchanged full60s must fit original90s");
    observer = createAttributionObserver({
      nowNs: () => process.hrtime.bigint().toString(),
      workEndMonoMs: h.bounds.workEndMonoMs,
    });
    const work = createBudgetHandle({
      deadlineMonoMs: h.bounds.workEndMonoMs,
      clock: h.clock,
      nowMonoMs: now,
    });
    try {
      monitor = h.createMonitor({ runId }).monitor;
      observer.instrumentFs(privateFs);
      ready = await monitor.start({ deadlineMonoMs: h.bounds.workEndMonoMs });
      footprint = createFootprintObserver({ workspaceRoot: tree });
      const store = createArtifactStore({
        workspaceRoot: tree,
        lifetime,
        monotonicNow: now,
        readFootprint: () => raw(() => footprint.readFootprint()),
      });
      const admitted = async (name, fn) => {
        work.assertLive(name);
        const before = monitor.fault();
        if (before) throw Object.assign(new Error(before.detail), { code: before.code });
        const startNs = process.hrtime.bigint().toString();
        const actual = raw(fn);
        outcomes.push(actual);
        actual.catch(() => {});
        const value = await waitHandle(work, actual, name);
        work.assertLive(`${name} return`);
        const after = monitor.fault();
        if (after) throw Object.assign(new Error(after.detail), { code: after.code });
        stages.push({
          name,
          startNs,
          finishedNs: process.hrtime.bigint().toString(),
          observation: monitor.lastObservation(),
        });
        return value;
      };
      const initial = await admitted("full scan", () => footprint.scan());
      initialFootprint = initial;
      assert.equal(initial.accountingValid, true);
      const prefix = '{"diagnostic":"',
        suffix = '"}\n';
      const payload = Buffer.from(
        prefix + "x".repeat(313 - prefix.length - suffix.length) + suffix,
      );
      assert.equal(payload.length, 313);
      const once = await admitted("writeOnce313", () =>
        store.writeOnce("diagnostic/control.json", payload, "ordinary"),
      );
      assert.equal(once.byteLength, 313);
      await admitted("append open", async () => {
        sink = await store.openArtifact({
          artifactId: "attribution-lines",
          path: "diagnostic/events.jsonl",
          mode: "append",
          lane: "ordinary",
        });
      });
      await admitted("append313", () => sink.append(payload));
      const closed = await admitted("append close", () => sink.close());
      assert.equal(closed.byteLength, 313);
      sink = null;
    } finally {
      work.dispose();
    }
  } catch (error) {
    fault(error);
  } finally {
    if (h !== null && monitor !== null) {
      if (cleanupStart === null) cleanupStart = now();
      cleanupEnd = Math.min(cleanupStart + 5000, h.bounds.deadlineMonoMs, originalEnd);
      proofEnd = Math.min(cleanupEnd, Math.max(cleanupStart, cleanupEnd - 500));
      try {
        if (ready !== null) {
          const ctl = createCleanupController({
            monitor,
            clock: h.clock,
            runId: ready.runId ?? `accounting-attribution-${process.pid}`,
          });
          cleanupProof = await ctl.run({
            phase: "check",
            scope: "phase-workload",
            scopeRunId: `accounting-attribution-${process.pid}`,
            supervisor: ready.supervisor,
            expectedFinalizer: ready.supervisor,
            cleanupStartMonoMs: cleanupStart,
            deadlineMonoMs: cleanupEnd,
            settleWorkloadHandles: () =>
              Promise.all(outcomes).then(() =>
                h.settleHandles(`accounting-attribution-${process.pid}`, {
                  deadlineMonoMs: proofEnd,
                }),
              ),
          });
        }
      } catch (error) {
        fault(error);
      }
      try {
        await monitor.stopAndReap({
          deadlineMonoMs: cleanupEnd,
          ordinaryDeadlineMonoMs: proofEnd,
          ...(primary !== null || cleanupProof?.verified !== true
            ? { failureContainment: true }
            : {}),
        });
      } catch (error) {
        fault(error);
      }
    }
    // No new CONTROL/Native work. Already admitted real bodies and mandatory
    // physical closes drain truthfully; no rejection manufactures settlement.
    await Promise.allSettled(outcomes);
    if (sink !== null) {
      try {
        await sink.close();
      } catch (error) {
        fault(error);
      }
    }
    footprint?.stop();
    try {
      if (h !== null) await h.finish();
      await lifetime.whenSettled();
    } catch (error) {
      fault(error);
    }
    if (observer !== null) await observer.restoreAfter(lifetime.whenSettled());
    if (now() >= originalEnd) fault(new Error("attribution actual closure exceeded original90s"));
    outer.dispose();
    const snapshot = h?.snapshot() ?? null,
      diagnostics = observer?.result() ?? null;
    const finalFacts = {
      cleanupProof,
      monitorFault: monitor?.fault() ?? null,
      snapshot,
      diagnostics,
    };
    for (const failure of attributionVerdict({ primary, ...finalFacts }).failures) fault(failure);
    report = {
      kind: "accounting-attribution",
      qualification: "ONE fixed non-scoring body; no historical cause inference",
      originalStart,
      originalEnd,
      finishedMonoMs: now(),
      bounds: h?.bounds ?? null,
      cleanupStart,
      proofEnd,
      cleanupEnd,
      cleanupProof,
      primary: primary?.detail ?? null,
      monitorFault: monitor?.fault() ?? null,
      caughtErrors,
      stages,
      initialFootprint,
      diagnostics: diagnostics && {
        ...diagnostics,
        first: diagnostics.failed ? describe(diagnostics.first) : null,
      },
      snapshot,
      frozenInput: { manifestSha256: MANIFEST_SHA, files: 3361, bytes: 52866136 },
      out,
    };
    let serialized = JSON.stringify(report);
    const combined =
      (snapshot?.bytes.produced ?? 0) +
      (snapshot?.bytes.retained ?? 0) +
      Buffer.byteLength(serialized) +
      1;
    if (combined > MAX) {
      report = {
        kind: "accounting-attribution",
        failed: true,
        outputOverflow: true,
        combinedBytes: combined,
        primary: primary?.detail ?? null,
        diagnosticTraceUnavailable: true,
        bounds: h?.bounds ?? null,
      };
      fault(new Error("attribution original4MiB combined output exceeded"));
      serialized = JSON.stringify(report);
    }
    process.stdout.write(serialized + "\n");
    process.exitCode = attributionVerdict({ primary, ...finalFacts }).exitCode;
  }
}
await main();
