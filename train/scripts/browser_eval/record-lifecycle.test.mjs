// record-lifecycle.test.mjs: the discovered unfinished-evidence-closure
// cases for the private record-lifecycle owner, moved whole from
// records-finalization.test.mjs — pending sink-open drains before real
// closes with the same-promise fence and no fabricated
// running/final/completion/seal, pending-append drains with every real
// sink close ATTEMPTED despite one injected FIRST rejection (the
// retained first fault propagates while the OwnedFile's bounded real
// retry physically settles the same FD during the drain — the error is
// asserted, never a fake physical close), retained sticky failure
// while the closure drains, and active-finalizer/post-seal closure
// refusal. Driven on real temporary workspaces; fixture passes are
// never actual phase or cleanup evidence.

import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import test from "node:test";
import { REQUIRED_CHECK_IDS } from "./record-schema.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createPhaseRecorder } from "./records.mjs";
import {
  fixtureManifest,
  fixtureRunning,
  identity,
  makeRecorder,
  makeWorkspace,
  proof,
  verifyCallbacks,
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

const passChecks = (phase, evidencePaths = {}) =>
  REQUIRED_CHECK_IDS[phase]
    .filter((id) => id !== "cleanup")
    .map((id) => ({ id, status: "passed", evidencePaths: evidencePaths[id] ?? [] }));

const passIntent = {
  status: "passed",
  exitCode: 0,
  stopReason: null,
  summary: {},
  unplannedFaultCount: 0,
  analysisEligible: false,
};

const cleanCallbacks = (ws) => {
  const cb = verifyCallbacks({ commonIdentity: ws.commonIdentity });
  cb.verifyCleanup.impl = async () => proof("phase-workload", identity(4242));
  return cb;
};

const binds = (cb) => ({
  verifyIdentity: cb.verifyIdentity.fn.bind(cb.verifyIdentity),
  verifyCleanup: cb.verifyCleanup.fn.bind(cb.verifyCleanup),
});

// One neutral settlement receipt is prearmed BEFORE the real FS/gate
// body runs and settles on either outcome; the caller-visible promise
// carries the ORIGINAL result or error unchanged, so a joined receipt
// is body settlement — never a physical-close proof.
const issue = (bodies, invoke) => {
  let settle;
  const receipt = new Promise((resolve) => {
    settle = resolve;
  });
  bodies.push(receipt);
  let result;
  try {
    result = invoke();
  } catch (error) {
    settle();
    throw error;
  }
  Promise.resolve(result).then(() => settle(), () => settle());
  return result;
};

// Binds the five real FileHandle methods to the SAME raw handle so the
// OwnedFile adoption keeps a genuine descriptor. Every raw close call
// records its artifact label; an optional firstFault is thrown only on
// the FIRST raw call while the next call genuinely invokes and awaits
// the real close of the same FD — at most one injected rejection,
// never a perpetual refusal, third retry or destroy-as-close. The
// latest real close promise is pinned for the teardown's physical
// confirmation.
const trackAppendHandle = (handles, handle, label, closed, firstFault) => {
  const slot = { label, realClosePromise: null, closes: 0 };
  handles.push(slot);
  return {
    stat: handle.stat.bind(handle),
    read: handle.read.bind(handle),
    write: handle.write.bind(handle),
    sync: handle.sync.bind(handle),
    close: async () => {
      slot.closes += 1;
      closed.push(label);
      if (firstFault !== null && slot.closes === 1) {
        throw firstFault;
      }
      slot.realClosePromise = handle.close();
      return slot.realClosePromise;
    },
  };
};

// Shared teardown for the FS-patched tests: every controlled gate is
// released FIRST, then the prearmed receipts plus the caller bodies
// and the genuine incomplete closure are joined — the closure is
// created here only when an early failure left a real recorder
// unfinished. Each tracked FD's actual real close promise is
// confirmed, the SAME owner's FRESH whenSettled is awaited outside all
// bodies only after issuance closed, then the patch is restored and
// the owned root removed. A rejected public outcome is never physical
// proof: unknown or failed close debt keeps whenSettled pending and
// retains the root and instrumentation instead of deleting around it.
const drainPatchedTest = async ({
  env,
  rec,
  bodies,
  handles,
  closing,
  releaseGates,
  restore,
}) => {
  releaseGates();
  for (const receipt of bodies) {
    await receipt;
  }
  let closure = closing;
  if (closure === null && rec !== null) {
    closure = rec.closeIncompleteEvidence();
  }
  if (closure !== null) {
    await closure.catch(() => {});
  }
  for (const slot of handles) {
    if (slot.realClosePromise !== null) {
      await slot.realClosePromise;
    }
  }
  await artifactStoreLifetime(env.store).whenSettled();
  restore();
  await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
};

test("a pending sink open drains before the real sinks close", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const eventsPath = path.join(env.workspaceRoot, "check", "events.jsonl");
  const closed = [];
  const bodies = [];
  const handles = [];
  let signalEntered;
  const entered = new Promise((resolve) => {
    signalEntered = resolve;
  });
  let releaseOpen;
  const gate = new Promise((resolve) => {
    releaseOpen = resolve;
  });
  let rec = null;
  let opening = null;
  let closing = null;
  const realOpen = fsp.open;
  try {
    // Exact-path patch only: the real events.jsonl append open is
    // entered, held at the gate BEFORE the saved real open runs, and
    // every other IO is delegated unchanged.
    fsp.open = (target, flags) =>
      issue(bodies, async () => {
        const held = target === eventsPath && flags === "a";
        if (held) {
          signalEntered();
          await gate;
        }
        const handle = await realOpen(target, flags);
        return held
          ? trackAppendHandle(handles, handle, `${mf.runId}:events`, closed, null)
          : handle;
      });
    rec = createPhaseRecorder({ store: env.store, workspace: env.ws, manifest: mf, ...binds(cleanCallbacks(env.ws)) });
    opening = rec.writeManifest(); // admitted, now held at the real sink open
    await entered; // causal: the intended real open site is reached
    closing = rec.closeIncompleteEvidence();
    // Repeated calls return the same actual closure promise.
    assert.equal(rec.closeIncompleteEvidence(), closing);
    // The admission fence is synchronous: every later mutation is rejected.
    await code(rec.appendEvent({ kind: "fault", payload: {} }), "RECORDER_STATE");
    let settled = false;
    closing.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
    assert.equal(settled, false); // the pending body still holds the drain
    releaseOpen();
    await opening;
    await closing;
    // Only actually-closed evidence exists: no invented running, final,
    // completion or seal record.
    const names = (await fsp.readdir(path.join(env.workspaceRoot, "check"))).sort();
    assert.deepEqual(names, ["events.jsonl", "manifest.json"]);
  } finally {
    // The owned gate releases, bodies and the genuine closure join,
    // the tracked FD's real close is confirmed and the SAME owner's
    // fresh zero is awaited before restore and rm.
    await drainPatchedTest({
      env,
      rec,
      bodies,
      handles,
      closing,
      releaseGates: () => releaseOpen(),
      restore: () => {
        fsp.open = realOpen;
      },
    });
  }
});

test("a pending append drains and every real sink close is attempted despite one rejection", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const heldPath = path.join(env.workspaceRoot, "check", "held.bin");
  const eventsPath = path.join(env.workspaceRoot, "check", "events.jsonl");
  const closed = [];
  const bodies = [];
  const handles = [];
  // The SAME original close fault is injected on the held FD's FIRST
  // raw close only: it is retained as the observed attempt error while
  // the OwnedFile's bounded SECOND raw call genuinely closes the same
  // FD during the drain — the rejection itself is never close proof.
  const ioErr = new Error("close failed");
  ioErr.code = "STORE_CLOSE";
  let signalEntered;
  const entered = new Promise((resolve) => {
    signalEntered = resolve;
  });
  let releaseOpen;
  const gate = new Promise((resolve) => {
    releaseOpen = resolve;
  });
  let rec = null;
  let appending = null;
  let closing = null;
  const realOpen = fsp.open;
  try {
    // Exact-path patch only: held.bin append opens enter and gate
    // before the saved real open; held and events handles keep the
    // five real bound methods, and every other IO delegates unchanged.
    fsp.open = (target, flags) =>
      issue(bodies, async () => {
        const held = target === heldPath && flags === "a";
        if (held) {
          signalEntered();
          await gate;
        }
        const handle = await realOpen(target, flags);
        if (held) {
          return trackAppendHandle(handles, handle, "held", closed, ioErr);
        }
        if (target === eventsPath && flags === "a") {
          return trackAppendHandle(handles, handle, `${mf.runId}:events`, closed, null);
        }
        return handle;
      });
    rec = createPhaseRecorder({ store: env.store, workspace: env.ws, manifest: mf, ...binds(cleanCallbacks(env.ws)) });
    await rec.writeManifest();
    await rec.writeRunning(fixtureRunning({ manifest: mf }));
    appending = rec.appendArtifactChunk({
      recordId: "r1",
      recordSeq: 0,
      artifactId: "held",
      path: "check/held.bin",
      mode: "append",
      bytes: Buffer.from("held-bytes"),
      last: false,
    });
    // The real held open must be entered before the closure starts —
    // causal ordering, never an arbitrary tick substitute.
    await entered;
    closing = rec.closeIncompleteEvidence();
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
    releaseOpen();
    await appending; // real bytes appended into a sink opened past the fence
    await code(closing, "STORE_CLOSE"); // the rejecting close propagates
    // Every real close was ATTEMPTED — including the one that rejected.
    assert.ok(closed.includes("held"));
    assert.ok(closed.includes(`${mf.runId}:events`));
  } finally {
    // The gate releases first, then bodies and the genuine closure
    // join, every tracked FD's real close promise is confirmed and the
    // SAME owner's fresh zero is awaited before restore and rm — the
    // retained first fault stays an observation, never a close.
    await drainPatchedTest({
      env,
      rec,
      bodies,
      handles,
      closing,
      releaseGates: () => releaseOpen(),
      restore: () => {
        fsp.open = realOpen;
      },
    });
  }
});

test("a sticky failure is retained while the closure still drains", async () => {
  const env = await makeWorkspace();
  const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
  const manifestPath = path.join(env.workspaceRoot, "check", "manifest.json");
  const io = new Error("disk gone");
  io.code = "STORE_IO";
  const bodies = [];
  let rec = null;
  let manifestRenameFaulted = false;
  const realRename = fsp.rename;
  try {
    // Exact-path patch only: the manifest-destination rename rejects
    // once AFTER the genuine temp write/sync/FD close — an issued open
    // is never rejected since that would retain unknown FD debt — and
    // every other rename delegates unchanged.
    fsp.rename = (source, dest) =>
      issue(bodies, async () => {
        if (dest === manifestPath && !manifestRenameFaulted) {
          manifestRenameFaulted = true;
          throw io;
        }
        return realRename(source, dest);
      });
    rec = createPhaseRecorder({ store: env.store, workspace: env.ws, manifest: mf, ...binds(cleanCallbacks(env.ws)) });
    await code(rec.writeManifest(), "STORE_IO");
    await code(rec.appendEvent({ kind: "fault", payload: {} }), "RECORDER_STICKY");
    await rec.closeIncompleteEvidence(); // the held sticky state never blocks the drain
    await code(rec.writeManifest(), "RECORDER_STATE");
  } finally {
    // The prearmed rename receipt joins, the genuine drain reuses its
    // cached closure, the SAME owner's fresh zero is awaited, then the
    // patch restores and the root goes — the latched sticky IO stays
    // a retained fault, never deleted around.
    await drainPatchedTest({
      env,
      rec,
      bodies,
      handles: [],
      closing: null,
      releaseGates: () => {},
      restore: () => {
        fsp.rename = realRename;
      },
    });
  }
});

test("finalizing or sealed evidence is never closed by the incomplete drain", async () => {
  const env = await makeWorkspace();
  let first = null;
  try {
    const mf = fixtureManifest({ workspace: env.ws, phase: "check", inputs: env.inputs });
    const rec = await makeRecorder({ env, manifest: mf, callbacks: cleanCallbacks(env.ws) });
    first = rec.recorder.finalize({
      intent: { ...passIntent },
      checks: passChecks("check"),
      prerequisites: [],
      expectedSelfTest: null,
    });
    await code(rec.recorder.closeIncompleteEvidence(), "RECORDER_STATE");
    const out = await first;
    assert.equal(out.path, "check/completion.json");
    await code(rec.recorder.closeIncompleteEvidence(), "RECORDER_STATE");
  } finally {
    // The ORIGINAL finalizer body is joined before the SAME owner's
    // fresh zero is observed — the incomplete drain is never invoked
    // on a finalizing or sealed recorder here.
    if (first !== null) {
      await first.catch(() => {});
    }
    await artifactStoreLifetime(env.store).whenSettled();
    await fsp.rm(env.workspaceRoot, { recursive: true, force: true });
  }
});
