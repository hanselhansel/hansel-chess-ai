// TEST ONLY. Synthetic data, no Native/browser/model or publication proof.
// Real v1 helpers below retain their genuine Store/debt teardown in tests.
import { fixtureCommonIdentity, fixtureManifest, identity, proof, ref } from "./test-fixtures.mjs";
import { REQUIRED_CHECK_IDS, REQUIRED_PARENT_PHASES } from "./schema-constants.mjs";
import { V2_POLICY } from "./evaluation-policy.mjs";
import { createResourceQuality } from "./resource-quality.mjs";
import { deriveVerdicts } from "./verdicts-v2.mjs";

export function v2Workspace() {
  const commonIdentity = structuredClone(fixtureCommonIdentity());
  commonIdentity.evaluationPolicy = structuredClone(V2_POLICY);
  commonIdentity.fixtures.protocol.path = "train/fixtures/browser-protocol-v2.json";
  return { schemaVersion: 2, workspaceId: "test-v2", commonIdentity };
}

export function quality({ phase = "compare", runId = `run-${phase}`, gap = false, cap = false, pending = false } = {}) {
  const monitorRunId = phase === "watchdog-selftest" ? "parent" : runId;
  const q = createResourceQuality({ runId, phase, monitorRunId });
  const cycle = (start, end, bytes) => ({
    startedNs: start,
    finishedNs: end,
    nativeMaxDurationNs: "1",
    rssBytes: bytes,
    requestId: "request",
    handleLive: true,
  });
  q.bootstrap(cycle("0", "10", 4));
  if (gap) q.complete(cycle("500000010", "500000011", 4));
  if (cap) q.complete(cycle(gap ? "500000011" : "10", gap ? "500000012" : "11", 4294967297));
  const last = q.snapshot().lastCompleteNs;
  q.setPending(pending);
  q.close(last);
  return q.snapshot();
}

export function closedFacts(overrides = {}) {
  const phase = overrides.phase ?? "compare";
  const runId = overrides.runId ?? (phase === "watchdog-selftest" ? "parent:watchdog-selftest" : `run-${phase}`);
  return {
    phase,
    runId,
    eventsRef: ref(`${phase === "watchdog-selftest" ? "preflight/selftest" : phase}/events.jsonl`),
    resourceEvidence: quality({ phase, runId }),
    completedGames: phase === "compare" ? 40 : 0,
    completedPairs: phase === "compare" ? 20 : 0,
    cohortProven: true,
    scienceProven: true,
    identityProven: true,
    cleanupProven: true,
    recordsProven: true,
    prerequisitesProven: true,
    nativeProven: true,
    storeProven: true,
    monitoringComplete: true,
    workspaceLimitExceeded: false,
    hardFaultCount: 0,
    stoppedEarly: false,
    checksPassed: true,
    provenViolation: false,
    abandoned: false,
    stats: phase === "compare" ? { analysisEligible: true, classification: "no_detectable_advantage" } : null,
    prerequisiteResources: REQUIRED_PARENT_PHASES[phase].map((parent) => ({
      status: "passed",
      reasons: [],
      scope: "phase",
      phaseRunIds: [`run-${parent}`],
      resourceEvidenceRefs: [ref(`${parent}/events.jsonl`)],
    })),
    ...overrides,
  };
}

export function v2Graph(overrides = {}) {
  const facts = closedFacts(overrides);
  const ws = v2Workspace();
  const phase = facts.phase;
  const prerequisites = REQUIRED_PARENT_PHASES[phase].map((p) => ({
    phase: p,
    runId: `run-${p}`,
    completion: ref(`${p}/completion.json`),
  }));
  const manifest = {
    ...fixtureManifest({ workspace: ws, phase, runId: facts.runId, prerequisites }),
    schemaVersion: 2,
    evaluationPolicy: V2_POLICY,
  };
  if (phase === "watchdog-selftest") manifest.owner = { phase: "preflight", runId: "parent", supervisor: identity() };
  const verdicts = deriveVerdicts(facts);
  const head = {
    schemaVersion: 2,
    workspaceId: ws.workspaceId,
    runId: facts.runId,
    phase,
    commonIdentitySha256: manifest.commonIdentitySha256,
  };
  const final = {
    ...head,
    ...verdicts,
    evaluationPolicy: V2_POLICY,
    stopReason: facts.stoppedEarly ? (phase === "watchdog-selftest" ? "HEARTBEAT_TIMEOUT" : "TEST_STOP") : null,
    requiredChecks: REQUIRED_CHECK_IDS[phase].map((id) => ({ id, status: "passed", evidence: [] })),
    unplannedFaultCount: facts.hardFaultCount,
    analysisEligible: verdicts.strengthVerdict.analysisEligible,
    cleanup: proof(phase === "watchdog-selftest" ? "selftest-workload" : "phase-workload", identity()),
    summary: {},
    resourceEvidence: facts.resourceEvidence,
  };
  const completion = {
    ...head,
    ...verdicts,
    evaluationPolicy: V2_POLICY,
    kind: "tinyaz-phase-completion",
    prerequisites,
    artifacts: [facts.eventsRef],
    expectedSelfTest:
      phase === "preflight"
        ? { completion: ref("preflight/selftest/completion.json"), expectedStopReason: "HEARTBEAT_TIMEOUT" }
        : null,
  };
  const finalEvent = {
    schemaVersion: 2,
    workspaceId: ws.workspaceId,
    runId: head.runId,
    phase,
    seq: 0,
    kind: "resource",
    payload: { kind: "final-resource-evidence", resourceEvidence: facts.resourceEvidence },
  };
  return { ws, manifest, facts, final, completion, eventsRef: facts.eventsRef, finalEvent, checkpoints: [] };
}

export const closureInput = ({ facts, final, completion, eventsRef, finalEvent, checkpoints }) => ({
  facts,
  final,
  completion,
  eventsRef,
  finalEvent,
  checkpoints,
});

// Task6 equivalence seams are IDENTICAL existing scripted factory references.
// Their original owned teardown remains the caller's responsibility.
export {
  createMonitorFixture as strictMonitorFixture,
  monitorBootstrapScript as strictBootstrapScript,
  startMonitorFixture as startStrictMonitor,
} from "./process-monitor-test-fixtures.mjs";
export { setupRun as strictWatchdogRun } from "./watchdog-run-test-fixtures.mjs";

// Task7 TEST-only scripted collector. One genuine monitor, transport and owner.
import { realpathSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createProcessMonitor, processMonitorLifetime } from "./processes.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";
import { fakeClock, collectorFixture, sampleReply } from "./supervision-test-fixtures.mjs";
import { monitorReadyOptions, monitorBootstrapScript } from "./process-monitor-test-fixtures.mjs";

export function qualityMonitor({ phase = "compare", evaluationPolicy = V2_POLICY,
  getDeadlineMonoMs = null, startNs = 1000000000n } = {}) {
  const clock = fakeClock({ startNs });
  const script = monitorBootstrapScript();
  const fixture = collectorFixture({ runId: "R1", script });
  const write = fixture.child.stdin.write;
  fixture.child.stdin.write = (...args) => {
    // OS child exit cannot reenter the synchronous parent write stack.
    if (JSON.parse(String(args[0]).trim()).type === "shutdown") {
      queueMicrotask(() => {
        if (script.holdShutdown) fixture.written.push(JSON.parse(String(args[0]).trim()));
        else write(...args);
      });
      return true;
    }
    return write(...args);
  };
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "quality-mon-")));
  for (const name of ["process-macos.py", "process-macos-native.py", "process-macos-abi.py"])
    writeFileSync(path.join(dir, name), "# scripted helper\n");
  const spawns = [];
  let monitor;
  try {
    monitor = createProcessMonitor({ runId: "R1", phase, evaluationPolicy,
      pythonExecutable: PYTHON_EXECUTABLE, helperPath: path.join(dir, "process-macos.py"),
      recordRoot: dir, protocol: fixture.protocol, clock, getDeadlineMonoMs,
      spawnImpl: (...args) => { spawns.push(args); return fixture.child; } });
  } catch (error) { rmSync(dir, { recursive: true }); throw error; }
  const reply = (extra = {}) => {
    const request = fixture.written.filter((m) => m.type === "sample").at(-1);
    fixture.emit({ ...sampleReply({ ...request, script }), ...extra });
  };
  return { clock, fixture, script, monitor, spawns, reply,
    async start(options) {
      const p = monitor.start(options);
      fixture.ready(monitorReadyOptions());
      clock.advance(10);
      return p;
    },
    async dispose() {
      fixture.exit(0);
      await monitor.stopAndReap().catch(() => {});
      await processMonitorLifetime(monitor).whenSettled();
      rmSync(dir, { recursive: true });
    } };
}
export const flushQuality = () => new Promise((resolve) => setImmediate(resolve));
export const qualitySamples = (f) => f.fixture.written.filter((m) => m.type === "sample");
export async function periodicQuality(f, milliseconds = 250, reply = {}) {
  f.script.muteSample = true;
  f.clock.advance(milliseconds);
  await flushQuality();
  f.reply(reply);
  await flushQuality();
  f.script.muteSample = false;
  return f.monitor.lastObservation();
}
