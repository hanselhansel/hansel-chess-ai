// Driver phase bodies. Claims never prove cleanup or paired inference;
// only the supervisor's closed facts can establish either after teardown.
import { Chess } from "chess.js";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord } from "./record-schema.mjs";
import { assertCommonIdentity } from "./identity-schema.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { REQUIRED_CHECK_IDS, FIXED_LIMITS } from "./schema-constants.mjs";
import { buildGameSchedule, validateProtocolFixture, validateOpeningFixture } from "./phase-fixtures.mjs";
import { createPageArm } from "./page-arm.mjs";
import { validateArmReady, validateArmTurn } from "./match-observations.mjs";
import { createGameCheckpoint, playGame } from "./match.mjs";
import { runPythonReference } from "./reference-child.mjs";
import { runChecks } from "./checks.mjs";

const fail = (detail) => {
  const error = new Error(`PHASE_INVALID ${detail}`);
  error.code = "PHASE_INVALID";
  return error;
};
const copy = (value) => JSON.parse(canonicalBytes(value).toString("utf8"));
const now = () => Number(process.hrtime.bigint()) / 1e6;

export async function runPhase({ manifest, capabilities, resources }) {
  manifest = freezeDeep(copy(manifest));
  assertRecord("manifest", manifest);
  assertCommonIdentity(resources?.commonIdentity);
  if (capabilities?.runId !== manifest.runId ||
    !canonicalBytes(capabilities.manifest).equals(canonicalBytes(manifest)) ||
    sha256Bytes(canonicalBytes(resources.commonIdentity)) !== manifest.commonIdentitySha256 || resources.browser === undefined ||
    !resources.servers?.candidate || !resources.servers?.baseline ||
    typeof resources.workspaceRoot !== "string") {
    throw fail("actual run resources");
  }
  // Own all serializable run data before the first SDK callout. Resource
  // handles retain identity; caller mutation cannot redirect later games.
  resources = Object.freeze({ browser: resources.browser, lifetime: resources.lifetime,
    workspaceRoot: resources.workspaceRoot, commonIdentity: freezeDeep(copy(resources.commonIdentity)),
    fixtures: freezeDeep(copy(resources.fixtures)),
    selftestEvidence: freezeDeep(copy(resources.selftestEvidence ?? null)),
    servers: freezeDeep(copy({ candidate: { engineUrl: resources.servers.candidate.engineUrl,
      workbenchUrl: resources.servers.candidate.workbenchUrl ?? null },
    baseline: { engineUrl: resources.servers.baseline.engineUrl } })),
  });
  const { browser, servers, workspaceRoot, commonIdentity, lifetime } = resources;
  const { signal } = capabilities;
  const protocol = validateProtocolFixture(resources.fixtures.protocol);
  const openings = validateOpeningFixture(resources.fixtures.openings);
  const parity = freezeDeep(copy(resources.fixtures.parity));
  const fence = () => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };
  const persist = async (filename, value) => {
    fence();
    const bytes = canonicalBytes(value);
    const chunks = async function* () {
      for (let offset = 0; offset < bytes.length; offset += FIXED_LIMITS.ipc.chunkBytes) {
        fence();
        yield bytes.subarray(offset, offset + FIXED_LIMITS.ipc.chunkBytes);
      }
    };
    const ref = await capabilities.artifact(filename, "append", chunks());
    fence();
    if (ref.path !== filename || ref.byteLength !== bytes.length || ref.sha256 !== sha256Bytes(bytes)) {
      throw fail("persisted phase evidence");
    }
    return filename;
  };
  const check = (id, passed, evidencePaths) => ({ id, status: passed ? "passed" : "failed", evidencePaths });
  const result = (checks, summary) => {
    const expected = REQUIRED_CHECK_IDS[manifest.phase].filter((id) => id !== "cleanup");
    if (checks.length !== expected.length || checks.some((item, index) => item.id !== expected[index])) {
      throw fail("whole required group coverage");
    }
    const passed = checks.every((entry) => entry.status === "passed");
    return { requestedStatus: passed ? "passed" : "failed", requestedExitCode: passed ? 0 : 1,
      stopReason: null, checks, summary, analysisEligible: false };
  };
  const open = (baselineOnly = false) => browser.openGame({
    candidateUrl: baselineOnly ? servers.baseline.engineUrl : servers.candidate.engineUrl,
    baselineUrl: servers.baseline.engineUrl,
  });
  const armsFor = (game, id, baselineOnly = false) => ({
    candidate: createPageArm({ kind: baselineOnly ? "baseline" : "candidate", id: `${id}-candidate`,
      page: game.candidate.page, context: game.candidate.context, capabilities }),
    baseline: createPageArm({ kind: "baseline", id: `${id}-baseline`, page: game.baseline.page, context: game.baseline.context, capabilities }),
  });
  if (manifest.phase === "check") {
    const checked = await runChecks({ manifest, capabilities, resources });
    return result(checked.checks, checked.summary);
  }
  if (manifest.phase === "parity") {
    if (parity.schemaVersion !== 1 || !Array.isArray(parity.cases) || parity.cases.length !== 13) {
      throw fail("thirteen frozen parity cases");
    }
    const game = await open();
    const cases = [];
    try {
      const arm = armsFor(game, "parity").candidate;
      validateArmReady(arm, await arm.initialize());
      for (const testCase of parity.cases) {
        fence();
        await capabilities.operation("command", `parity-numeric-${testCase.id}`, async () => {
          const output = await game.candidate.page.evaluate((value) => window.__tinyazEval.numeric(value), testCase);
          fence();
          if (output.id !== testCase.id || output.planes?.length !== 1216 || output.logits?.length !== 4672) {
            throw fail("actual numeric export shape");
          }
          cases.push(output);
          return { status: "completed", evidencePaths: [], detail: { id: output.id } };
        });
      }
      await persist("parity/browser-results.json", { cases });
    } finally {
      await game.close();
    }
    const report = await runPythonReference({ manifest, capabilities, workspaceRoot, lifetime,
      commonIdentity });
    const paths = ["parity/python-reference.json", "parity/browser-results.json"];
    const stable = report.device === "cpu" && report.dtype === "float32" && report.inferenceMode === true &&
      report.intraOpThreads === 1 && report.interOpThreads === 1 &&
      canonicalBytes(report.importsBefore).equals(canonicalBytes(report.importsAfter)) &&
      canonicalBytes(report.installedImportsBefore).equals(canonicalBytes(report.installedImportsAfter));
    const all = Array.isArray(report.cases) && report.cases.length === 13;
    const planes = all && report.cases.every((item) => item.planes.failingIndices.length === 0);
    const numeric = all && report.cases.every((item) => item.logits.failingIndices.length === 0 && item.value.failingIndices.length === 0);
    return result([check("frozen-python-imports", stable, paths), check("input-planes-13", planes, paths),
      check("policy-mapping-13", all, paths), check("numeric-tolerance-13", numeric && report.passed, paths)],
    { reference: { passed: report.passed, importsStable: stable,
      cases: report.cases.map((entry) => ({ id: entry.id,
        planeMaximumAbsoluteError: entry.planes.maximumAbsoluteError,
        logitMaximumAbsoluteError: entry.logits.maximumAbsoluteError,
        valueAbsoluteError: entry.value.maximumAbsoluteError,
        failingPlanes: entry.planes.failingIndices.length, failingLogits: entry.logits.failingIndices.length,
        failingValues: entry.value.failingIndices.length })), evidencePaths: paths }, fixtureCaseCount: cases.length });
  }
  if (manifest.phase === "preflight") {
    const selftest = resources.selftestEvidence;
    const selftestPassed = selftest?.completionRef?.path === "preflight/selftest/completion.json" &&
      selftest.final?.runId === `${manifest.runId}:watchdog-selftest` &&
      selftest.final?.workspaceId === manifest.workspaceId && selftest.final?.status === "inconclusive" &&
      selftest.final?.exitCode === 2 && selftest.final?.stopReason === "HEARTBEAT_TIMEOUT" &&
      selftest.final?.unplannedFaultCount === 0 && selftest.final?.summary?.scoredGames === 0 &&
      selftest.final?.cleanup?.verified === true && selftest.final?.requiredChecks?.every((item) => item.status === "passed");
    if (!selftestPassed) {
      throw fail("genuine first-operation selftest receipt");
    }
    const timings = { candidate: [], baseline: [] };
    const signatures = { candidate: [], baseline: [] };
    const cold = {};
    for (let sample = 0; sample < protocol.preflight.freshRequestsPerArm; sample += 1) {
      const game = await open();
      const arms = armsFor(game, `preflight-sample-${sample}`);
      try {
        for (const role of ["candidate", "baseline"]) {
          const started = now();
          const ready = validateArmReady(arms[role], await arms[role].initialize());
          const readyMs = now() - started;
          if (sample === 0) {
            cold[role] = readyMs;
          }
          const board = new Chess();
          const request = { requestId: 1, gameGeneration: 1,
            position: { initialFen: board.fen(), movesUci: [], expectedFen: board.fen() }, requestedVisits: 64 };
          const before = now();
          const observation = await arms[role].think(request);
          const elapsedMs = now() - before;
          const move = validateArmTurn(arms[role], ready, observation, request);
          board.move(move.uci);
          timings[role].push(elapsedMs);
          // Timing is descriptive. Full deterministic search output drops
          // only its measured duration, never move/visits/value/children.
          const { ms, ...deterministic } = move;
          signatures[role].push(sha256Bytes(canonicalBytes(deterministic)));
        }
      } finally {
        await game.close();
      }
    }
    const descriptive = {};
    for (const role of ["candidate", "baseline"]) {
      const values = [...timings[role]].sort((a, b) => a - b);
      descriptive[role] = { samples: values.length, latenciesMs: timings[role], medianMs: values[2],
        p95Ms: values[Math.ceil(0.95 * values.length) - 1], maximumMs: values.at(-1),
        deterministic: new Set(signatures[role]).size === 1 };
    }
    const games = [];
    for (const scheduled of buildGameSchedule({ phase: "preflight" })) {
      const game = await open(true);
      try {
        const played = await playGame({ game: scheduled, arms: armsFor(game, scheduled.gameId, true),
          checkpoint: createGameCheckpoint({ game: scheduled, capabilities }), signal });
        if (played.result !== "1/2-1/2") {
          throw fail("actual baseline A/A draw");
        }
        games.push(played);
      } finally {
        await game.close();
      }
    }
    const summary = { coldReadinessMs: cold, timings: descriptive, games,
      estimate: { gameLength: "unknown", commandPairMedianMs: descriptive.candidate.medianMs + descriptive.baseline.medianMs,
        comparisonCeilingMs: FIXED_LIMITS.timing.phaseMs.compare, capStopPossible: true } };
    const evidence = await persist("preflight/throughput.json", summary);
    return result([check("cold-readiness", Object.values(cold).every((ms) => ms <= 30000), [evidence]),
      check("ten-fresh-requests", Object.values(descriptive).every((item) => item.samples === 5 && item.deterministic), [evidence]),
      check("aa-color-pair", games.length === 2, games.map((item) => item.pgn.path)),
      check("watchdog-selftest", selftestPassed, ["preflight/selftest/completion.json"]),
      check("timing-estimate", Number.isFinite(summary.estimate.commandPairMedianMs) && summary.estimate.capStopPossible, [evidence])], summary);
  }
  if (manifest.phase === "compare") {
    const games = [];
    for (const scheduled of buildGameSchedule({ phase: "compare", openings })) {
      fence();
      const game = await open();
      try {
        games.push(await playGame({ game: scheduled, arms: armsFor(game, scheduled.gameId),
          checkpoint: createGameCheckpoint({ game: scheduled, capabilities }), signal }));
      } finally {
        await game.close();
      }
    }
    const evidence = await persist("compare/completed-games.json", { games });
    return result(REQUIRED_CHECK_IDS.compare.filter((id) => id !== "cleanup").map((id) =>
      check(id, games.length === 40, [evidence])), { completedGames: games, completedPairs: games.length / 2 });
  }
  throw fail("phase dispatcher");
}
