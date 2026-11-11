// TEST ONLY. Real Store/Recorder/prepared/readback graphs over controlled SDK
// observations, identity/cleanup callbacks and Native stimuli. No phase claim.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import { V3_POLICY } from "./evaluation-policy.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { RUNTIME_PATHS } from "./snapshot-files.mjs";
import { createResourceQuality } from "./resource-quality.mjs";
import { createPhaseRecorder, phaseRecorderLifetime } from "./records.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { verifyReceipt } from "./prerequisites.mjs";
import { fixtureManifest, fixtureRunning, identity, proof, ref } from "./test-fixtures.mjs";
import { createV2RecorderWorkspace, v2Workspace, closedFacts } from "./separate-verdicts-test-fixtures.mjs";
import { makeOperationalFixture } from "./operational-test-fixtures.mjs";
import { runPhase } from "./phase-runners.mjs";
import { REQUIRED_CHECK_IDS, REQUIRED_PARENT_PHASES } from "./schema-constants.mjs";

export const SOURCE = path.resolve(import.meta.dirname, "../../..");
export const now = () => Number(process.hrtime.bigint() / 1000000n);
export function budgetForTest(t, deadlineMonoMs = now() + 90000) {
  const budget = createBudgetHandle({ deadlineMonoMs, nowMonoMs: now, clock: { setTimeout, clearTimeout } });
  t.after(() => budget.dispose());
  return budget;
}
export function v3Workspace() {
  const workspace = v2Workspace();
  workspace.commonIdentity.evaluationPolicy = structuredClone(V3_POLICY);
  workspace.commonIdentity.fixtures.protocol.path = "train/fixtures/browser-protocol-v3.json";
  workspace.workspaceId = "test-v3";
  return workspace;
}
export function qualityV3({ phase = "preflight", runId = `run-${phase}`, gap = false, cap = false, pending = false } = {}) {
  const monitorRunId = phase === "watchdog-selftest" ? runId.slice(0, -":watchdog-selftest".length) : runId;
  const ledger = createResourceQuality({ runId, phase, monitorRunId, evaluationPolicy: V3_POLICY });
  const cycle = (startedNs, finishedNs, rssBytes) => ({ startedNs, finishedNs,
    nativeMaxDurationNs: "1", rssBytes, requestId: "test-native", handleLive: true });
  ledger.bootstrap(cycle("0", "10", 4));
  if (gap) ledger.complete(cycle("500000010", "500000011", 4));
  if (cap) ledger.complete(cycle(gap ? "500000011" : "10", gap ? "500000012" : "11", 4294967297));
  ledger.setPending(pending);
  ledger.close(ledger.snapshot().lastCompleteNs);
  return ledger.snapshot();
}
export function factsV3(overrides = {}) {
  const phase = overrides.phase ?? "preflight";
  const facts = closedFacts({ phase, ...overrides });
  facts.evaluationPolicy = V3_POLICY;
  facts.resourceEvidence = qualityV3({ phase, runId: facts.runId });
  facts.requiredChecks = REQUIRED_CHECK_IDS[phase].map((id) => ({ id, status: "passed", evidence: [] }));
  facts.preflightEvidence = phase === "preflight" ? { runId: facts.runId, manifestSha256: "a".repeat(64),
    checks: ["cold-readiness", "ten-fresh-requests", "aa-color-pair", "timing-estimate"]
      .map((id) => ({ id, status: "passed", evidence: [] })) } : null;
  facts.selftestProven = phase === "preflight";
  facts.prerequisiteAdmissions = REQUIRED_PARENT_PHASES[phase].map((parent, index) => ({
    phase: parent, runId: `run-${parent}`, completionRef: ref(`${parent}/completion.json`),
    scientificAdmissible: true, resourceVerdict: facts.prerequisiteResources[index],
    closureResourceVerdict: { ...facts.prerequisiteResources[index], scope: "prerequisite-closure" } }));
  return { ...facts, ...overrides };
}
export async function createV3GraphFixture(t, { gap = true, archived = false, parentRunId = "run-preflight", parentSupervisor = identity(), candidate = null, runtimeIdentity = null, semanticThroughputFailure = false,
  recorderNow = now, beforePreflightSeal = null, preflightCaptureDeadlineMonoMs = null, preflightResourceEvidence = null, preflightCheckpoint = null } = {}) {
  const workspace = v3Workspace();
  if (candidate !== null) workspace.commonIdentity.candidate.commit = candidate;
  if (runtimeIdentity !== null) {
    workspace.commonIdentity.environment.node = structuredClone(runtimeIdentity.node);
    workspace.commonIdentity.environment.python.runtime = structuredClone(runtimeIdentity.python);
    workspace.commonIdentity.environment.monitoring.python = structuredClone(runtimeIdentity.python);
  }
  const archivedFiles = archived ? await Promise.all(RUNTIME_PATHS.map(async (filename) =>
    ({ path: filename, bytes: await fs.readFile(path.join(SOURCE, filename)) }))) : [];
  const protocolBytes = await fs.readFile(path.join(SOURCE, "train/fixtures/browser-protocol-v3.json"));
  workspace.commonIdentity.fixtures.protocol = { path: "train/fixtures/browser-protocol-v3.json",
    byteLength: protocolBytes.length, sha256: sha256Bytes(protocolBytes) };
  const env = await createV2RecorderWorkspace(t, { workspace, archivedFiles });
  if (archived) await fs.symlink(await fs.realpath(path.join(SOURCE, "node_modules")),
    path.join(env.workspaceRoot, "inputs/harness/node_modules"));
  const owner = artifactStoreLifetime(env.store);
  const budget = budgetForTest(t);
  const receiptCeilingMonoMs = budget.deadlineMonoMs();
  const context = Object.freeze({ budget });
  const io = Object.freeze({ retainActual: owner.retainActual, assertEffectLive: () => budget.assertLive("fixture graph") });
  const start = async (phase, parents = [], options = {}) => {
    const runId = options.owner ? `${options.owner.runId}:watchdog-selftest`
      : phase === "preflight" ? parentRunId : `run-${phase}`;
    const manifest = { ...fixtureManifest({ workspace, inputs: env.inputs, phase, runId,
      owner: options.owner ?? null, prerequisites: parents.map((p) => ({ phase: p.phase, runId: p.runId,
        completion: p.completionRef })) }), schemaVersion: 2, evaluationPolicy: V3_POLICY };
    const recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: async () => workspace.commonIdentity,
      verifyCleanup: async ({ claimedProof }) => proof(claimedProof.scope, claimedProof.expectedFinalizer) });
    env.recorders.push(recorder);
    recorder.bindRuntime({ lifetime: phaseRecorderLifetime(recorder), nowMonoMs: recorderNow,
      receiptCeilingMonoMs: phase === "watchdog-selftest" ? receiptCeilingMonoMs : null });
    await recorder.writeManifest();
    const running = { ...fixtureRunning({ manifest, supervisor: parentSupervisor }), schemaVersion: 2 };
    await recorder.writeRunning(running);
    const selftest = phase === "watchdog-selftest";
    const intent = { status: selftest ? "inconclusive" : "passed", exitCode: selftest ? 2 : 0,
      stopReason: selftest ? "HEARTBEAT_TIMEOUT" : null, unplannedFaultCount: 0,
      analysisEligible: false, summary: selftest ? { scoredGames: 0 } : {},
      resourceEvidence: qualityV3({ phase, runId, gap: phase === "preflight" && gap }) };
    if (phase === "preflight" && preflightResourceEvidence !== null) {
      intent.resourceEvidence = structuredClone(preflightResourceEvidence);
      intent.unplannedFaultCount = intent.resourceEvidence.hardReasons.length ? 1 : 0;
    }
    const checks = selftest ? [] : manifest.requiredCheckIds.filter((id) => id !== "cleanup")
      .map((id) => ({ id, status: "passed", evidencePaths: [] }));
    const finish = async (nested = null) => {
      if (phase === "preflight" && preflightCheckpoint !== null)
        await recorder.appendEvent({ kind: "resource", payload: preflightCheckpoint });
      const captureDeadlineMonoMs = phase === "preflight" && preflightCaptureDeadlineMonoMs !== null
        ? preflightCaptureDeadlineMonoMs : budget.deadlineMonoMs();
      await recorder.closeEvidenceBeforeCutoff({ intent, checks, prerequisites: manifest.prerequisites,
        expectedSelfTest: nested === null ? null : { completion: nested.completionRef,
          expectedStopReason: "HEARTBEAT_TIMEOUT" } }, { deadlineMonoMs: captureDeadlineMonoMs });
      if (phase === "preflight" && beforePreflightSeal !== null)
        await beforePreflightSeal({ env, recorder, manifest, captureDeadlineMonoMs,
          readbackDeadlineMonoMs: budget.deadlineMonoMs() });
      const result = await recorder.sealClosedEvidence();
      return verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef: result.completionRef,
        expectedIdentity: workspace.commonIdentity }, io, context);
    };
    return { recorder, manifest, running, intent, checks, finish };
  };
  const check = await (await start("check")).finish();
  const parityPhase = await start("parity", [check]);
  parityPhase.intent.summary = { fixtureCaseCount: 13, reference: { passed: true, importsStable: true,
    cases: Array.from({ length: 13 }, (_, id) => ({ id, failingPlanes: 0, failingLogits: 0, failingValues: 0 })) } };
  const parity = await parityPhase.finish();
  const nested = await (await start("watchdog-selftest", [], {
    owner: { phase: "preflight", runId: parentRunId, supervisor: parentSupervisor } })).finish();
  const main = await start("preflight", [check, parity]);
  const f = makeOperationalFixture(t);
  f.manifest = main.manifest;
  f.capabilities.manifest = main.manifest;
  f.capabilities.runId = parentRunId;
  f.resources.commonIdentity = workspace.commonIdentity;
  f.resources.fixtures.protocol = validateProtocolFixture(parseJSONBytes(protocolBytes));
  f.resources.selftestEvidence = { completionRef: nested.completionRef, final: nested.final };
  let session = 0;
  const open = f.resources.browser.openGame.bind(f.resources.browser);
  f.resources.browser.openGame = async (...args) => {
    const game = await open(...args);
    if (game.candidate.page.kind === "candidate") {
      const id = `controlled-session-${++session}`;
      const evaluate = game.candidate.page.evaluate.bind(game.candidate.page);
      game.candidate.page.evaluate = async (...args) => {
        const value = await evaluate(...args);
        return value === undefined ? value : JSON.parse(JSON.stringify(value).replaceAll("fixture-candidate-session", id));
      };
    }
    return game;
  };
  const artifact = f.capabilities.artifact.bind(f.capabilities);
  f.capabilities.artifact = async (filename, mode, chunks) => {
    const parts = [];
    for await (const bytes of chunks) parts.push(Buffer.from(bytes));
    const bytes = Buffer.concat(parts);
    const returned = await artifact(filename, mode, (async function* () { yield bytes; })());
    const actual = await env.store.writeOnce(filename, bytes, "ordinary");
    assert.deepEqual(actual, returned);
    return actual;
  };
  const operation = f.capabilities.operation.bind(f.capabilities);
  f.capabilities.operation = async (kind, operationId, work) => {
    const result = await operation(kind, operationId, work);
    await main.recorder.appendEvent({ kind: "operation", payload: { operationId, result } });
    return result;
  };
  const event = f.capabilities.event.bind(f.capabilities);
  f.capabilities.event = async (kind, payload) => {
    await event(kind, payload);
    await main.recorder.appendEvent({ kind, payload });
  };
  const produced = await f.own(runPhase(f));
  main.intent.summary = produced.summary;
  main.checks.splice(0, main.checks.length, ...produced.checks);
  const games = ["aa-g1", "aa-g2"].map((gameId) => {
    const payload = f.events.filter((e) => e.payload.gameId === gameId).at(-1).payload;
    const checkpoint = Object.fromEntries(["checkpointId", "ordinal", "slot", "plyCount", "initialFen", "fen", "pgn"]
      .map((key) => [key, payload[key]]));
    const fields = Object.fromEntries(["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor", "result"]
      .map((key) => [key, payload[key]]));
    return { ...fields, checkpoint, state: "complete", stopReason: null };
  });
  main.intent.summary.gameEvidence = { schemaVersion: 1, frozen: true, firstStopReason: null,
    freezeAtMonoNs: "10", games, diagnostics: [] };
  if (semanticThroughputFailure) {
    // Producer genuinely completed and claimed passed. Current inventoried
    // canonical bytes are structurally valid but arithmetically false.
    const throughputPath = path.join(env.workspaceRoot, "preflight/throughput.json");
    const throughput = parseCanonicalBytes(await fs.readFile(throughputPath));
    throughput.timings.candidate.medianMs += 1;
    await fs.writeFile(throughputPath, canonicalBytes(throughput));
  }
  const preflight = await main.finish(nested);
  return { env, workspace, archivedFiles, io, budget, context, start, check, parity, nested, main, preflight, f };
}

// Genuine monitor/transport/queue ownership with a scripted collector/clock.
import { mkdtempSync, realpathSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createProcessMonitor, processMonitorLifetime } from "./processes.mjs";
import { fakeClock, collectorFixture, sampleReply } from "./supervision-test-fixtures.mjs";
import { monitorBootstrapScript, monitorReadyOptions } from "./process-monitor-test-fixtures.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
export function monitorV3({ phase = "preflight", scope = null, policy = V3_POLICY, lifetime = undefined } = {}) {
  const clock = fakeClock({ startNs: 1000000000n });
  const script = monitorBootstrapScript();
  const fixture = collectorFixture({ runId: "R1", script });
  const write = fixture.child.stdin.write;
  fixture.child.stdin.write = (...args) => {
    if (JSON.parse(String(args[0]).trim()).type === "shutdown") {
      queueMicrotask(() => write(...args)); return true;
    }
    return write(...args);
  };
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "preflight-monitor-v3-")));
  for (const name of ["process-macos.py", "process-macos-native.py", "process-macos-abi.py"])
    writeFileSync(path.join(root, name), "# controlled collector\n");
  const monitor = createProcessMonitor({ runId: "R1", phase, evaluationPolicy: policy, lifetime,
    preflightQualityReader: scope?.reader ?? null, pythonExecutable: PYTHON_EXECUTABLE,
    helperPath: path.join(root, "process-macos.py"), recordRoot: root,
    protocol: fixture.protocol, clock, spawnImpl: () => fixture.child });
  return { clock, script, fixture, monitor,
    async start() {
      const started = monitor.start(); fixture.ready(monitorReadyOptions()); clock.advance(10); return started;
    },
    reply(extra = {}) {
      const request = fixture.written.filter((m) => m.type === "sample").at(-1);
      fixture.emit({ ...sampleReply({ ...request, script }), ...extra });
    },
    async close() {
      fixture.exit(0);
      await monitor.stopAndReap().catch(() => {});
      await processMonitorLifetime(monitor).whenSettled();
      rmSync(root, { recursive: true });
    } };
}
export async function openTestScope(scope, graph, probeIdentity = async () => "same-live") {
  return scope.verifyAndOpen({ workspaceRoot: graph.env.workspaceRoot, completionRef: graph.nested.completionRef,
    parentRunId: graph.nested.manifest.owner.runId, parentSupervisor: graph.nested.manifest.owner.supervisor,
    expectedIdentity: graph.workspace.commonIdentity, probeIdentity },
  { io: graph.io, budget: graph.budget }, () => graph.budget.assertLive("test scope parent admission"));
}

import { Chess } from "chess.js";
import { buildGameSchedule } from "./phase-fixtures.mjs";
import { serializeCheckpointPgn, checkpointResult } from "./pgn-format.mjs";
export async function completeCompareFixture(f, { gameCount = 40, gap = false } = {}) {
  const main = await f.start("compare", [f.check, f.parity, f.preflight]);
  main.intent.resourceEvidence = qualityV3({ phase: "compare", gap });
  const science = await f.env.store.writeOnce("compare/science.json", canonicalBytes({ controlledSDK: true }), "ordinary");
  main.checks.forEach((check) => { check.evidencePaths = [science.path]; });
  const openings = JSON.parse(await fs.readFile(path.join(SOURCE, "train/fixtures/browser-openings.json"), "utf8"));
  const games = [];
  for (const game of buildGameSchedule({ phase: "compare", openings }).slice(0, gameCount)) {
    const board = new Chess(game.initialFen);
    const movesUci = [...game.movesUci];
    for (const move of movesUci) board.move(move);
    while (checkpointResult(board) === "*") {
      assert(board.history().length < 2000, "bounded controlled legal game");
      const move = board.move(board.moves()[0]);
      movesUci.push(`${move.from}${move.to}${move.promotion ?? ""}`);
    }
    const result = checkpointResult(board);
    const bytes = serializeCheckpointPgn({ phase: "compare", game, movesUci, result });
    const pgn = await f.env.store.writeOnce(`compare/games/${game.gameId}.a.pgn`, bytes, "ordinary");
    const checkpoint = { checkpointId: `${game.gameId}-c2`, ordinal: 2, slot: "a",
      plyCount: movesUci.length, initialFen: game.initialFen, fen: board.fen(), pgn };
    const fields = Object.fromEntries(["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor"]
      .map((key) => [key, game[key]]));
    games.push({ ...fields, result, state: "complete", stopReason: null, checkpoint });
    await main.recorder.appendEvent({ kind: "response", payload: { recordType: "pgn-checkpoint", ...fields, result, ...checkpoint } });
  }
  main.intent.summary.gameEvidence = { schemaVersion: 1, frozen: true, firstStopReason: null,
    freezeAtMonoNs: "10", games, diagnostics: [] };
  return main.finish();
}

import { collectPreflightEvidenceV3 } from "./preflight-evidence-v3.mjs";
import { phaseArtifactRefs } from "./artifact-store.mjs";
export async function compilerInputForFixture(f) {
  const final = f.preflight.final;
  const outcome = final.summary.supervisorOutcome;
  const artifactRefs = await phaseArtifactRefs({ workspaceRoot: f.env.workspaceRoot, phaseDirectory: "preflight" }, f.io);
  const events = (await fs.readFile(path.join(f.env.workspaceRoot, "preflight/events.jsonl"), "utf8"))
    .trim().split("\n").map((line) => parseCanonicalBytes(Buffer.from(`${line}\n`)));
  const preflightEvidence = await collectPreflightEvidenceV3({ workspaceRoot: f.env.workspaceRoot,
    manifest: f.main.manifest, inventory: artifactRefs, events, summary: final.summary }, { io: f.io, budget: f.budget });
  return { headFields: Object.fromEntries(["schemaVersion", "workspaceId", "runId", "phase"].map((key) => [key, final[key]])),
    commonIdentitySha256: f.main.manifest.commonIdentitySha256,
    request: { status: outcome.status, exitCode: outcome.exitCode, stopReason: final.stopReason,
      summary: final.summary, unplannedFaultCount: outcome.reportedFaultCount, analysisEligible: false,
      resourceEvidence: final.resourceEvidence }, claims: outcome.checkClaims, phaseDirectory: "preflight",
    recordedProof: final.cleanup, identityProven: true, identityMismatch: false, cleanupOk: true,
    identityObservation: outcome.identityObservation, expectedIdentity: f.workspace.commonIdentity,
    expectedFinalizer: f.main.running.supervisor, artifactRefs, eventsRef: final.resourceVerdict.resourceEvidenceRefs[0],
    events, verifiedParents: [f.check, f.parity], requiredChecks: final.requiredChecks,
    preflightEvidence, verifiedSelfTest: f.nested };
}

import { confinedRead } from "./receipt-files.mjs";
import { issueActual } from "./artifact-files.mjs";
import { replayCheckpointPgn } from "./pgn-format.mjs";
export async function detachedInputForFixture(f) {
  const input = await compilerInputForFixture(f);
  const inventory = input.artifactRefs;
  const byPath = new Map(inventory.map((ref) => [ref.path, ref]));
  const read = async (filename) => {
    f.budget.assertLive("detached test fixture");
    const bytes = await confinedRead(f.env.workspaceRoot, filename, "detached test fixture", f.io, f.context);
    const ref = byPath.get(filename);
    assert.equal(bytes.length, ref.byteLength);
    assert.equal(sha256Bytes(bytes), ref.sha256);
    f.budget.assertLive("detached test fixture");
    return { ref, bytes };
  };
  const observations = [];
  for (let i = 0; i < 5; i += 1) {
    for (const role of ["candidate", "baseline"]) {
      for (const suffix of ["ready", "move-1"]) {
        const bound = await read(`preflight/observations/preflight-sample-${i}-${role}-${suffix}.json`);
        observations.push({ ref: bound.ref, value: parseCanonicalBytes(bound.bytes) });
      }
    }
  }
  const raw = await read("preflight/throughput.json");
  const aaReplays = [];
  for (const game of buildGameSchedule({ phase: "preflight" })) {
    const selected = f.preflight.final.summary.gameEvidence.games.find((g) => g.gameId === game.gameId);
    const bound = await read(selected.checkpoint.pgn.path);
    const replay = await issueActual(f.io.retainActual, () =>
      replayCheckpointPgn({ phase: "preflight", game, bytes: bound.bytes, budget: f.budget }));
    f.budget.assertLive("detached test replay");
    aaReplays.push({ gameId: game.gameId, pgn: bound.ref,
      replayedBytes: { byteLength: bound.bytes.length, sha256: sha256Bytes(bound.bytes) }, replay });
  }
  return { manifest: f.main.manifest, inventory, events: input.events,
    summary: f.preflight.final.summary, observations,
    throughput: { ref: raw.ref, value: parseCanonicalBytes(raw.bytes) }, aaReplays };
}
