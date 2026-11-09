// Genuine Recorder/Store/prepared-graph/publication/readback. Synthetic science
// and cleanup collaborators establish no Native/browser/model/cohort result.
import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createPhaseRecorder } from "./records.mjs";
import { verifyReceipt, admitPhase } from "./prerequisites.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { createResourceQuality } from "./resource-quality.mjs";
import { createV2RecorderWorkspace as workspace, identityVerifierControl, quality, qualityMonitor, flushQuality, qualitySamples, periodicQuality } from "./separate-verdicts-test-fixtures.mjs";
import { fixtureManifest, fixtureRunning, identity, proof } from "./test-fixtures.mjs";
import { privateFs } from "./private-fs.mjs";


const read = async (env, rel) => JSON.parse(await fs.readFile(path.join(env.workspaceRoot, rel), "utf8"));
async function start(env, phase = "check", parents = [], options = {}) {
  const runId = options.runId ?? `run-${phase}`;
  const manifest = { ...fixtureManifest({ workspace: env.ws, inputs: env.inputs, phase, runId,
    owner: options.owner ?? null, prerequisites: parents.map((p) => ({ phase: p.phase, runId: p.runId, completion: p.completionRef })) }),
    schemaVersion: 2, evaluationPolicy: V2_POLICY };
  const recorder = createPhaseRecorder({ store: env.store, workspace: env.ws, manifest,
    verifyIdentity: options.verifyIdentity ?? (async () => options.identityObservation ?? env.ws.commonIdentity),
    verifyCleanup: options.verifyCleanup ?? (async ({ claimedProof }) => proof(claimedProof.scope, claimedProof.expectedFinalizer)) });
  env.recorders.push(recorder);
  await recorder.writeManifest();
  await recorder.writeRunning({ ...fixtureRunning({ manifest }), schemaVersion: 2 });
  const selftest = phase === "watchdog-selftest";
  const resourceEvidence = quality({ phase, runId, gap: options.gap, cap: options.cap });
  const intent = { status: selftest ? "inconclusive" : "passed", exitCode: selftest ? 2 : 0,
    stopReason: selftest ? "HEARTBEAT_TIMEOUT" : null, unplannedFaultCount: 0,
    analysisEligible: false, summary: selftest ? { scoredGames: 0 } : {}, resourceEvidence };
  const checks = selftest ? [] : manifest.requiredCheckIds.filter((id) => id !== "cleanup")
    .map((id) => ({ id, status: "passed", evidencePaths: [] }));
  const finish = async (override = {}) => {
    const completionRef = await recorder.finalize({ intent: { ...intent, ...override }, checks,
      prerequisites: manifest.prerequisites, expectedSelfTest: options.expectedSelfTest ?? null });
    return verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef, expectedIdentity: env.ws.commonIdentity });
  };
  return { env, manifest, recorder, intent, checks, finish };
}
async function parents(env) {
  const check = await (await start(env)).finish();
  const parity = await (await start(env, "parity", [check])).finish();
  const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity() };
  const nested = await (await start(env, "watchdog-selftest", [], { owner,
    runId: "run-preflight:watchdog-selftest" })).finish();
  const preflight = await (await start(env, "preflight", [check, parity], {
    expectedSelfTest: { completion: nested.completionRef, expectedStopReason: "HEARTBEAT_TIMEOUT" } })).finish();
  return [check, parity, preflight];
}
async function science(f, count = 40, recordResponses = true) {
  const games = [];
  const evidence = await f.env.store.writeOnce("compare/science.json", canonicalBytes({ synthetic: true }), "ordinary");
  for (const check of f.checks) check.evidencePaths = [evidence.path];
  for (let index = 0; index < count; index += 1) {
    const pairNumber = Math.floor(index / 2) + 1, gameNumber = index % 2 + 1;
    const openingId = `p${String(pairNumber).padStart(2, "0")}`, gameId = `${openingId}-g${gameNumber}`;
    const pgn = await f.recorder.appendArtifactChunk({ recordId: gameId, recordSeq: index,
      artifactId: gameId, path: `compare/games/${gameId}.a.pgn`, mode: "append",
      bytes: Buffer.from(`synthetic terminal fixture ${gameId}`), last: true });
    const game = { gameId, pairNumber, gameNumber, openingId,
      candidateColor: (pairNumber % 2 === 1) === (gameNumber === 1) ? "white" : "black",
      state: "complete", result: "1/2-1/2", stopReason: null,
      checkpoint: { checkpointId: `${gameId}-c2`, ordinal: 2, slot: "a", plyCount: 8,
        initialFen: "synthetic initial", fen: "synthetic terminal", pgn } };
    games.push(game);
    const { state, stopReason, checkpoint, ...fields } = game;
    if (recordResponses) await f.recorder.appendEvent({ kind: "response", payload: { recordType: "pgn-checkpoint", ...fields, ...checkpoint } });
  }
  f.intent.summary.gameEvidence = { schemaVersion: 1, frozen: true, firstStopReason: null,
    freezeAtMonoNs: "10", games, diagnostics: [] };
}

test("genuine v2 check publishes mandatory snapshot and strict resource-passed parent", async (t) => {
  const env = await workspace(t), f = await start(env);
  const v = await f.finish();
  assert.equal(v.final.status, "passed");
  assert.equal(v.final.resourceVerdict.status, "passed");
  assert.equal(v.final.strengthVerdict.status, "not-applicable");
  const log = (await fs.readFile(path.join(env.workspaceRoot, "check/events.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.deepEqual(log.at(-1).payload.resourceEvidence, v.final.resourceEvidence);
  assert.equal(log.at(-1).payload.kind, "final-resource-evidence");
  const admitted = await admitPhase({ workspaceRoot: env.workspaceRoot, phase: "parity", commonIdentity: env.ws.commonIdentity,
    parents: [v.completionRef], probeIdentity: async () => "gone" });
  assert.equal(admitted.parents[0].runId, v.runId);
});

for (const [count, gap, eligible, status] of [[40, false, true, "passed"], [40, true, true, "inconclusive"], [6, true, false, "inconclusive"]]) {
  test(`genuine full graph ${count}games gap=${gap} derives independent strength`, async (t) => {
    const env = await workspace(t), ps = await parents(env), f = await start(env, "compare", ps, { gap });
    await science(f, count);
    if (count < 40) f.checks.length = 0;
    Object.assign(f.intent.summary, { completedGames: [], completedPairs: 999 });
    const v = await f.finish();
    assert.equal(v.final.analysisEligible, eligible);
    assert.equal(v.final.status, status);
    assert.equal(v.final.exitCode, status === "passed" ? 0 : 2);
    assert.equal(v.final.strengthVerdict.completedGames, count);
    assert.equal(Object.hasOwn(v.final.summary, "completedGames"), false);
    assert.equal(v.final.summary.pairedAnalysis.pValue, eligible ? 1 : null);
    assert.equal(v.final.closureResourceVerdict.phaseRunIds.length, 4);
  });
}

for (const hardClass of ["SCIENCE", "IDENTITY", "NATIVE", "TIMESTAMP", "UNION", "AGGREGATE", "TRANSPORT", "BACKEND",
  "PERMISSION", "PROOF", "STORE", "DISK", "GRAPH", "TIMEOUT", "CLEANUP", "PHASE_CHECK", "ABANDONED"]) {
  test(`actual sealed comparison cannot soften ${hardClass}`, async (t) => {
    const env = await workspace(t), f = await start(env, "compare", await parents(env), { gap: true });
    await science(f);
    const evidence = structuredClone(f.intent.resourceEvidence);
    evidence.hardReasons = [hardClass];
    const v = await f.finish({ resourceEvidence: evidence });
    assert.equal(v.final.analysisEligible, false);
    assert.notEqual(v.final.status, "passed");
    if (["IDENTITY", "PROOF", "CLEANUP"].includes(hardClass))
      assert.ok(v.final.resourceVerdict.reasons.includes("NATIVE_UNPROVEN"));
    assert.equal(v.final.summary.pairedAnalysis.pValue, null);
  });
}

for (const fault of ["RSS_CAP", "WORKSPACE_CAP", "CLEANUP", "IDENTITY", "RECORDS", "CHECK", "EVENT_FAULT"]) {
  test(`actual full40 ${fault} strips inference despite quality-only intent`, async (t) => {
    const env = await workspace(t);
    const options = { gap: true, cap: fault === "RSS_CAP" };
    if (fault === "CLEANUP") options.verifyCleanup = async ({ claimedProof }) => ({ ...proof(claimedProof.scope, claimedProof.expectedFinalizer), verified: false });
    if (fault === "IDENTITY") options.identityObservation = { ...env.ws.commonIdentity,
      candidate: { ...env.ws.commonIdentity.candidate, contentSha256: "a".repeat(64) } };
    const f = await start(env, "compare", await parents(env), options);
    await science(f);
    if (fault === "RECORDS") f.intent.summary.gameEvidence.games[0].checkpoint.pgn = { ...f.intent.summary.gameEvidence.games[0].checkpoint.pgn, sha256: "b".repeat(64) };
    if (fault === "CHECK") f.checks[0].status = "failed";
    if (["WORKSPACE_CAP", "EVENT_FAULT"].includes(fault)) await f.recorder.appendEvent({ kind: "fault",
      payload: { code: fault === "WORKSPACE_CAP" ? "RESOURCE_WORKSPACE" : "SCRIPTED_HARD_FAILURE" } });
    const v = await f.finish();
    assert.equal(v.final.analysisEligible, false);
    assert.equal(v.final.summary.pairedAnalysis.pValue, null);
    assert.equal(v.final.resourceVerdict.status, fault.endsWith("CAP") ? "failed" : "inconclusive");
  });
}

for (const injection of ["strengthVerdict", "resourceVerdict", "closureResourceVerdict", "completedGames", "qualityCheckpoint"]) {
  test(`version2 intent rejects driver ${injection} before final capture`, async (t) => {
    const env = await workspace(t), f = await start(env);
    await assert.rejects(f.finish({ [injection]: {} }), { code: "RECORDER_INPUT" });
    await assert.rejects(fs.stat(path.join(env.workspaceRoot, "check/completion.json")), { code: "ENOENT" });
  });
}

// Rewrite a published isolated check graph coherently at the hash layer. These
// are intentional corruptions for real readback, never new Store publications.
async function corrupt(env, completionRef, mutate) {
  const directory = path.posix.dirname(completionRef.path);
  const completion = await read(env, completionRef.path), final = await read(env, `${directory}/final.json`);
  let events = (await fs.readFile(path.join(env.workspaceRoot, `${directory}/events.jsonl`), "utf8")).trim().split("\n").map(JSON.parse);
  mutate({ completion, final, events });
  const eventBytes = Buffer.concat(events.map(canonicalBytes));
  const eventRef = { path: `${directory}/events.jsonl`, byteLength: eventBytes.length, sha256: sha256Bytes(eventBytes) };
  await fs.writeFile(path.join(env.workspaceRoot, eventRef.path), eventBytes);
  for (const record of [final, completion]) {
    for (const key of ["resourceVerdict", "closureResourceVerdict"]) record[key].resourceEvidenceRefs = record[key].resourceEvidenceRefs.map((r) => r.path === eventRef.path ? eventRef : r);
  }
  final.requiredChecks.find((c) => c.id === "cleanup").evidence = [eventRef];
  const finalBytes = canonicalBytes(final);
  await fs.writeFile(path.join(env.workspaceRoot, `${directory}/final.json`), finalBytes);
  completion.artifacts = completion.artifacts.map((r) => r.path === eventRef.path ? eventRef : r.path === `${directory}/final.json`
    ? { path: r.path, byteLength: finalBytes.length, sha256: sha256Bytes(finalBytes) } : r);
  const bytes = canonicalBytes(completion);
  await fs.writeFile(path.join(env.workspaceRoot, completionRef.path), bytes);
  return { path: completionRef.path, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
}
const mutations = {
  missing: ({ events }) => events.pop(),
  duplicate: ({ events }) => events.push({ ...events.at(-1), seq: events.length }),
  sequence: ({ events }) => { events[0].seq = 9; },
  pending: ({ events, final }) => { events[0].payload.resourceEvidence.pending = true; final.resourceEvidence.pending = true; },
  counters: ({ events, final }) => { events[0].payload.resourceEvidence.completedCycles = 0; final.resourceEvidence.completedCycles = 0; },
  tail: ({ events, final }) => { events[0].payload.resourceEvidence.coverageEndNs = "500000011"; final.resourceEvidence.coverageEndNs = "500000011"; },
  peak: ({ events, final }) => { events[0].payload.resourceEvidence.observedPeakRssBytes = 3; final.resourceEvidence.observedPeakRssBytes = 3; },
  ring: ({ events, final }) => { events[0].payload.resourceEvidence.detailsDropped = 1; final.resourceEvidence.detailsDropped = 1; },
  identity: ({ final }) => { final.summary.supervisorOutcome.identityObservation.candidate.contentSha256 = "c".repeat(64); },
  cleanup: ({ final }) => { final.cleanup.expectedFinalizer = identity(999); },
  verdict: ({ completion }) => { completion.resourceVerdict.phaseRunIds = ["wrong"]; },
  version: ({ completion }) => { completion.schemaVersion = 1; },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`real hash-bound readback rejects ${name} graph forgery`, async (t) => {
    const env = await workspace(t), v = await (await start(env)).finish();
    const completionRef = await corrupt(env, v.completionRef, mutate);
    await assert.rejects(verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef, expectedIdentity: env.ws.commonIdentity }));
  });
}

test("real prepared-publication failure returns no authoritative eligible result", async (t) => {
  const env = await workspace(t), f = await start(env, "compare", await parents(env), { gap: true });
  await science(f);
  const original = privateFs.rename;
  let injections = 0;
  privateFs.rename = async (from, to, ...args) => {
    if (to === path.join(env.workspaceRoot, "compare/completion.json")) { injections += 1; throw Object.assign(new Error("scripted publication"), { code: "EIO" }); }
    return original(from, to, ...args);
  };
  let result;
  try { await assert.rejects(async () => { result = await f.finish(); }); }
  finally { privateFs.rename = original; }
  assert.equal(injections, 1);
  assert.equal(result, undefined);
  await assert.rejects(fs.stat(path.join(env.workspaceRoot, "compare/completion.json")), { code: "ENOENT" });
});

test("actual Store accounting failure cannot publish a final result", async (t) => {
  const env = await workspace(t), f = await start(env);
  env.ctl.accountingValid = false;
  await assert.rejects(f.finish());
  await assert.rejects(fs.stat(path.join(env.workspaceRoot, "check/completion.json")), { code: "ENOENT" });
});

test("strict v2 parent resource gap prevents admission with its real live probe", async (t) => {
  const env = await workspace(t), v = await (await start(env, "check", [], { gap: true })).finish();
  assert.equal(v.final.resourceVerdict.status, "inconclusive");
  await assert.rejects(admitPhase({ workspaceRoot: env.workspaceRoot, phase: "parity", commonIdentity: env.ws.commonIdentity,
    parents: [v.completionRef], probeIdentity: async () => "gone" }), { code: "PREREQUISITE_INVALID" });
});

for (const later of ["normal", "gap", "cap", "fault", "pending"]) {
  test(`cached pending selftest prefix binds eventual ${later} parent closure`, async (t) => {
    const env = await workspace(t);
    const check = await (await start(env)).finish();
    const parity = await (await start(env, "parity", [check])).finish();
    const owner = { phase: "preflight", runId: "run-preflight", supervisor: identity() };
    const nested = await start(env, "watchdog-selftest", [], { owner, runId: `${owner.runId}:watchdog-selftest` });
    const prefix = structuredClone(nested.intent.resourceEvidence);
    prefix.pending = true;
    const sealed = await nested.finish({ resourceEvidence: prefix });
    assert.equal(sealed.final.resourceVerdict.scope, "selftest-prefix");
    assert.equal(sealed.final.resourceEvidence.pending, true);
    const f = await start(env, "preflight", [check, parity], { gap: later === "gap", cap: later === "cap",
      expectedSelfTest: { completion: sealed.completionRef, expectedStopReason: "HEARTBEAT_TIMEOUT" } });
    const finalEvidence = structuredClone(f.intent.resourceEvidence);
    if (later === "fault") finalEvidence.hardReasons = ["NATIVE"];
    if (later === "pending") {
      finalEvidence.pending = true;
      await assert.rejects(f.finish({ resourceEvidence: finalEvidence }), { code: "RECORDER_INPUT" });
      await assert.rejects(fs.stat(path.join(env.workspaceRoot, "preflight/completion.json")), { code: "ENOENT" });
      return;
    }
    const v = await f.finish({ resourceEvidence: finalEvidence });
    assert.equal(v.final.status, later === "normal" ? "passed" : "inconclusive");
    assert.equal(v.final.resourceEvidence.pending, false);
    if (later !== "normal") await assert.rejects(admitPhase({ workspaceRoot: env.workspaceRoot,
      phase: "compare", commonIdentity: env.ws.commonIdentity,
      parents: [check.completionRef, parity.completionRef, v.completionRef], probeIdentity: async () => "gone" }));
  });
}

for (const key of ["resourceEvidence", "qualityCheckpoint", "supervisorOutcome", "closureResourceVerdict", "strengthVerdict"]) {
  test(`driver summary cannot inject reserved ${key}`, async (t) => {
    const env = await workspace(t), f = await start(env);
    await assert.rejects(f.finish({ summary: { [key]: {} } }), { code: "RECORDER_INPUT" });
  });
}

for (const cap of [4294967296, 4294967297]) {
  test(`real monitor drained post-fence ${cap} binds genuine full40 final graph`, async (t) => {
    const env = await workspace(t), f = await start(env, "compare", await parents(env), { runId: "R1" });
    await science(f);
    const m = qualityMonitor();
    try {
      await m.start();
      await periodicQuality(m, 501);
      m.script.muteSample = true;
      m.clock.advance(250);
      await flushQuality();
      const before = m.monitor.lastObservation().resourceQuality;
      assert.equal(before.pending, true);
      const stopping = m.monitor.stopAndReap({ deadlineMonoMs: m.clock.nowMs() + 5000 });
      await assert.rejects(fs.stat(path.join(env.workspaceRoot, "compare/final.json")), { code: "ENOENT" });
      m.reply({ samples: qualitySamples(m).at(-1).owned.map((i, n) => ({ identity: i,
        ppid: 1, pgid: i.pid, uid: 501, residentBytes: n === 0 ? cap : 0 })) });
      await stopping;
      const actual = m.monitor.lastObservation().resourceQuality;
      assert.equal(actual.pending, false);
      assert.equal(actual.completedCycles, before.completedCycles);
      assert.equal(actual.lateDrops.count, 1);
      f.intent.summary.gameEvidence.freezeAtMonoNs = actual.lastCompleteNs;
      const v = await f.finish({ resourceEvidence: actual,
        stopReason: cap > 4294967296 ? "RESOURCE_RSS" : null });
      assert.deepEqual(v.final.resourceEvidence, actual);
      assert.equal(v.final.analysisEligible, cap === 4294967296);
      assert.equal(v.final.resourceVerdict.status, cap > 4294967296 ? "failed" : "inconclusive");
    } finally { await m.dispose(); }
  });
}

for (const mutation of ["reset", "chronology", "after-fence", "ring"]) {
  test(`actual checkpoint and final graph reject valid-shaped ${mutation}`, async (t) => {
    const env = await workspace(t), f = await start(env);
    const q = createResourceQuality({ phase: "check", runId: f.manifest.runId });
    const cycle = (startedNs, finishedNs) => ({ startedNs, finishedNs, nativeMaxDurationNs: "0",
      requestId: "scripted", rssBytes: 4, handleLive: true });
    q.bootstrap(cycle("0", "10")); q.complete(cycle("10", "11"));
    await f.recorder.appendEvent({ kind: "resource", payload: { rssBytes: 4, peakRssBytes: 4,
      observedPeakRssBytes: 4, rssLimitExceeded: false, accountingValid: true,
      atMonoNs: "11", qualityCheckpoint: q.checkpoint("11") } });
    if (mutation === "ring") for (let index = 0; index < 65; index += 1) {
      const last = BigInt(q.snapshot().lastCompleteNs);
      q.complete(cycle(String(last), String(last + 500000001n)));
    }
    q.close(String(BigInt(q.snapshot().lastCompleteNs) + 1n));
    const v = await f.finish({ resourceEvidence: q.snapshot() });
    const completionRef = await corrupt(env, v.completionRef, ({ events, final }) => {
      if (mutation === "reset") {
        const reset = quality({ phase: "check", runId: f.manifest.runId });
        final.resourceEvidence = structuredClone(reset);
        final.resourceEvidence.coverageEndNs = "12";
        events.at(-1).payload.resourceEvidence = final.resourceEvidence;
      } else if (mutation === "ring") {
        assert.equal(final.resourceEvidence.details.length, 64);
        final.resourceEvidence.details[0].ordinal = 1;
        events.at(-1).payload.resourceEvidence = final.resourceEvidence;
      } else {
        const cp = events[0].payload;
        cp.atMonoNs = mutation === "chronology" ? "9" : "13";
        cp.qualityCheckpoint.capturedNs = cp.atMonoNs;
      }
    });
    await assert.rejects(verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef,
      expectedIdentity: env.ws.commonIdentity }));
  });
}

test("missing claimed check bytes stay unproven rather than a proven scientific violation", async (t) => {
  const env = await workspace(t), f = await start(env);
  f.checks[0].evidencePaths = ["check/missing.json"];
  const v = await f.finish();
  assert.equal(v.final.status, "inconclusive");
  assert.ok(v.final.resourceVerdict.reasons.includes("RECORDS_UNPROVEN"));
});

test("parent cannot reset its cached strict prefix clocks without completing a cycle", async (t) => {
  const env = await workspace(t), ps = await parents(env), v = ps[2];
  const completionRef = await corrupt(env, v.completionRef, ({ final, events }) => {
    const e = final.resourceEvidence;
    e.lastCompleteNs = e.lastTimelyNs = e.lastCoverageQualifiedNs = e.coverageEndNs = "11";
    events.at(-1).payload.resourceEvidence = e;
  });
  await assert.rejects(verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef,
    expectedIdentity: env.ws.commonIdentity }));
});

for (const missing of ["actual selections", "frozen chronology", "nonarray body", "null game"]) {
  test(`caller full40 body cannot substitute for ${missing}`, async (t) => {
    const env = await workspace(t), f = await start(env, "compare", await parents(env));
    await science(f, 40, missing !== "actual selections");
    if (missing === "frozen chronology") f.intent.summary.gameEvidence.freezeAtMonoNs = "999999999999";
    if (missing === "nonarray body") f.intent.summary.gameEvidence.games = {};
    if (missing === "null game") f.intent.summary.gameEvidence.games = [null];
    const v = await f.finish();
    assert.equal(v.final.analysisEligible, false);
    assert.equal(v.final.summary.pairedAnalysis.pValue, null);
    assert.ok(v.final.resourceVerdict.reasons.includes("RECORDS_UNPROVEN"));
  });
}

test("closed v2 intent admits cleanup but no ordinary resource checkpoint", async (t) => {
  const env = await workspace(t);
  let f, admitted = false;
  const q = createResourceQuality({ runId: "run-check", phase: "check" });
  q.bootstrap({ startedNs: "0", finishedNs: "10", nativeMaxDurationNs: "0", requestId: "fixture", rssBytes: 4, handleLive: true });
  f = await start(env, "check", [], { verifyCleanup: async ({ claimedProof }) => {
    try {
      await f.recorder.appendEvent({ kind: "resource", payload: { rssBytes: 4, peakRssBytes: 4,
        observedPeakRssBytes: 4, rssLimitExceeded: false, accountingValid: true,
        atMonoNs: "10", qualityCheckpoint: q.checkpoint("10") } });
      admitted = true;
    } catch (error) { assert.equal(error.code, "RECORDER_STATE"); }
    await f.recorder.appendEvent({ kind: "cleanup", payload: { actualCallback: true } });
    return proof(claimedProof.scope, claimedProof.expectedFinalizer);
  } });
  const v = await f.finish();
  assert.equal(v.final.status, "passed");
  assert.equal(admitted, false);
});

for (const mode of ["rejected", "malformed", "mismatched"]) for (const cap of [false, true]) {
  test(`continuous identity ${mode} cap=${cap} never grants resource proof`, async (t) => {
    const env = await workspace(t), f = await start(env, "check", [], {
      cap, verifyIdentity: identityVerifierControl(mode, env.ws.commonIdentity) });
    const v = await f.finish();
    assert.equal(v.final.resourceEvidence.coverageLost, false);
    for (const verdict of [v.final.resourceVerdict, v.final.closureResourceVerdict]) {
      assert.equal(verdict.status, cap ? "failed" : "inconclusive");
      assert.ok(verdict.reasons.includes("NATIVE_UNPROVEN"));
      if (cap) assert.ok(verdict.reasons.includes("RSS_CAP"));
    }
  });
}
