// Bound async evidence collection and a detached synchronous validator.
import { Chess } from "chess.js";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { confinedRead } from "./receipt-files.mjs";
import { issueActual, assertReadEffect } from "./artifact-files.mjs";
import { assertBudgetHandle } from "./process-budget.mjs";
import { replayCheckpointPgn, checkpointResult } from "./pgn-format.mjs";
import { buildGameSchedule } from "./phase-fixtures.mjs";
import { validateArmReady, validateArmTurn } from "./match-observations.mjs";
import { assertRecordV2 } from "./record-schema-v2.mjs";
import { V3_POLICY } from "./evaluation-policy.mjs";
import { assertArtifactRef, deepEqual, eqLiteral, exactOnly, freezeDeep, shape } from "./schema-primitives.mjs";

const SCIENCE = ["cold-readiness", "ten-fresh-requests", "aa-color-pair", "timing-estimate"];
const finite = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
const signature = ({ ms, ...rest }) => sha256Bytes(canonicalBytes(rest));
const semantic = (fn) => { try { return fn() === true; } catch { return false; } };
const refEntry = (entry) => {
  shape(entry, { ref: "obj", value: "obj" }, "bound observation");
  assertArtifactRef(entry.ref);
};

export function validatePreflightEvidenceV3(input) {
  exactOnly(input, ["manifest", "inventory", "events", "summary", "observations", "throughput", "aaReplays"], "preflight input");
  const { manifest, inventory, events, summary, observations, throughput, aaReplays } = input;
  assertRecordV2("manifest", manifest);
  eqLiteral(manifest.evaluationPolicy, V3_POLICY, "preflight policy");
  if (manifest.phase !== "preflight" || !Array.isArray(inventory) || !Array.isArray(events) ||
    !Array.isArray(observations) || observations.length !== 20 || !Array.isArray(aaReplays) || aaReplays.length !== 2)
    throw new TypeError("closed preflight evidence input");
  inventory.forEach(assertArtifactRef);
  events.forEach((event, seq) => {
    assertRecordV2("event", event);
    if (event.seq !== seq || event.runId !== manifest.runId || event.phase !== manifest.phase ||
      event.workspaceId !== manifest.workspaceId) throw new TypeError("bound contiguous preflight events");
  });
  observations.forEach(refEntry);
  refEntry(throughput);
  for (const entry of aaReplays) {
    shape(entry, { gameId: "strNE", pgn: "obj", replayedBytes: "obj", replay: "obj" }, "AA replay");
    assertArtifactRef(entry.pgn);
    shape(entry.replayedBytes, { byteLength: "nat", sha256: "hash" }, "replayed bytes");
    shape(entry.replay, { movesUci: "list", fen: "strNE", result: "strNE" }, "detached replay");
    if (!entry.replay.movesUci.every((m) => typeof m === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)) ||
      !["1-0", "0-1", "1/2-1/2"].includes(entry.replay.result)) throw new TypeError("replay values");
  }
  const byPath = new Map(inventory.map((ref) => [ref.path, ref]));
  const operations = events.filter((e) => e.kind === "operation");
  const signatures = { candidate: [], baseline: [] };
  const sessions = new Set();
  let previousOperationSeq = -1;
  const attempts = semantic(() => {
    const paths = new Set();
    let cursor = 0;
    for (let index = 0; index < 5; index += 1) {
      for (const role of ["candidate", "baseline"]) {
        const id = `preflight-sample-${index}-${role}`;
        const arm = { kind: role };
        const ready = observations[cursor++];
        const move = observations[cursor++];
        for (const [entry, suffix, operation] of [[ready, "ready", "readiness"], [move, "move-1", "move-1"]]) {
          const path = `preflight/observations/${id}-${suffix}.json`;
          if (paths.has(path) || entry.ref.path !== path || !deepEqual(entry.ref, byPath.get(path)) ||
            canonicalBytes(entry.value).length !== entry.ref.byteLength || sha256Bytes(canonicalBytes(entry.value)) !== entry.ref.sha256) return false;
          paths.add(path);
          const matches = operations.filter((e) => e.payload.operationId === `${id}-${operation}`);
          if (matches.length !== 1 || matches[0].seq <= previousOperationSeq ||
            matches[0].payload.result.status !== "completed" ||
            !deepEqual(matches[0].payload.result.evidencePaths, [path]) ||
            matches[0].payload.result.detail.arm !== role ||
            matches[0].payload.result.detail.workerInstanceId !== ready.value.worker.instanceId) return false;
          previousOperationSeq = matches[0].seq;
        }
        validateArmReady(arm, ready.value);
        if (role === "candidate") {
          const session = ready.value.ready.engineSessionId;
          if (sessions.has(session)) return false;
          sessions.add(session);
        }
        const board = new Chess();
        const request = { requestId: 1, gameGeneration: 1, requestedVisits: 64,
          position: { initialFen: board.fen(), movesUci: [], expectedFen: board.fen() } };
        const result = validateArmTurn(arm, ready.value, move.value, request);
        const played = board.move(result.uci);
        if (!played || (result.from !== undefined && result.from !== played.from) ||
          (result.to !== undefined && result.to !== played.to) ||
          (result.san !== undefined && result.san !== played.san)) return false;
        signatures[role].push(signature(result));
      }
    }
    return Object.values(signatures).every((list) => list.length === 5 && new Set(list).size === 1);
  });
  const throughputBound = throughput.ref.path === "preflight/throughput.json" &&
    deepEqual(throughput.ref, byPath.get(throughput.ref.path)) &&
    canonicalBytes(throughput.value).length === throughput.ref.byteLength &&
    sha256Bytes(canonicalBytes(throughput.value)) === throughput.ref.sha256;
  const timing = semantic(() => {
    const t = throughput.value;
    exactOnly(t, ["coldReadinessMs", "timings", "games", "estimate"], "throughput");
    exactOnly(t.coldReadinessMs, ["candidate", "baseline"], "cold values");
    exactOnly(t.timings, ["candidate", "baseline"], "arm timings");
    for (const role of ["candidate", "baseline"]) {
      const row = t.timings[role];
      exactOnly(row, ["samples", "latenciesMs", "medianMs", "p95Ms", "maximumMs", "deterministic"], "latencies");
      if (!finite(t.coldReadinessMs[role]) || row.samples !== 5 || !Array.isArray(row.latenciesMs) ||
        row.latenciesMs.length !== 5 || !row.latenciesMs.every(finite) || row.deterministic !== true) return false;
      const sorted = [...row.latenciesMs].sort((a, b) => a - b);
      if (row.medianMs !== sorted[2] || row.p95Ms !== sorted[4] || row.maximumMs !== sorted[4]) return false;
    }
    eqLiteral(t.estimate, { gameLength: "unknown",
      commandPairMedianMs: t.timings.candidate.medianMs + t.timings.baseline.medianMs,
      comparisonCeilingMs: 86400000, capStopPossible: true }, "fixed estimate");
    return throughputBound && attempts && ["coldReadinessMs", "timings", "estimate"]
      .every((key) => deepEqual(summary[key], t[key]));
  });
  const aa = semantic(() => {
    const body = summary.gameEvidence;
    if (!body || body.schemaVersion !== 1 || body.frozen !== true || body.firstStopReason !== null ||
      !Array.isArray(body.games) || body.games.length !== 2 ||
      typeof body.freezeAtMonoNs !== "string" || !/^(0|[1-9][0-9]*)$/.test(body.freezeAtMonoNs)) return false;
    const schedule = buildGameSchedule({ phase: "preflight" });
    return schedule.every((game, index) => {
      const selected = body.games[index];
      const cp = selected.checkpoint;
      const detached = aaReplays[index];
      if (detached.gameId !== game.gameId || !cp || selected.state !== "complete" ||
        selected.stopReason !== null || selected.result !== "1/2-1/2" ||
        ["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor"]
          .some((key) => selected[key] !== game[key]) || cp.initialFen !== game.initialFen ||
        cp.checkpointId !== `${game.gameId}-c${cp.ordinal}` || cp.slot !== (cp.ordinal % 2 === 0 ? "a" : "b") ||
        cp.pgn.path !== `preflight/games/${game.gameId}.${cp.slot}.pgn` ||
        !deepEqual(cp.pgn, detached.pgn) || !deepEqual(byPath.get(cp.pgn.path), cp.pgn) ||
        detached.replayedBytes.byteLength !== cp.pgn.byteLength || detached.replayedBytes.sha256 !== cp.pgn.sha256 ||
        detached.replay.fen !== cp.fen || detached.replay.result !== selected.result ||
        detached.replay.movesUci.length !== cp.plyCount) return false;
      const board = new Chess(game.initialFen);
      for (const uci of detached.replay.movesUci) {
        if (checkpointResult(board) !== "*") return false;
        board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      }
      if (board.fen() !== detached.replay.fen || checkpointResult(board) !== detached.replay.result) return false;
      const matches = events.filter((event) => event.kind === "response" &&
        event.payload.recordType === "pgn-checkpoint" && event.payload.checkpointId === cp.checkpointId);
      if (matches.length !== 1) return false;
      const payload = matches[0].payload;
      if (!["gameId", "pairNumber", "gameNumber", "openingId", "candidateColor", "result"]
        .every((key) => deepEqual(payload[key], selected[key])) ||
        !Object.keys(cp).every((key) => deepEqual(payload[key], cp[key]))) return false;
      const played = throughput.value.games?.[index];
      return played?.gameId === game.gameId && played.result === selected.result && deepEqual(played.pgn, cp.pgn);
    });
  });
  const cold = timing && Object.values(throughput.value.coldReadinessMs).every((n) => n <= 30000);
  const passed = [cold, attempts && timing, aa, timing && aa];
  return freezeDeep({ runId: manifest.runId, manifestSha256: sha256Bytes(canonicalBytes(manifest)),
    checks: SCIENCE.map((id, index) => ({ id, status: passed[index] ? "passed" : "failed",
      evidence: id === "aa-color-pair" ? aaReplays.map((r) => r.pgn) : [throughput.ref] })) });
}

export async function collectPreflightEvidenceV3(options, context) {
  exactOnly(options, ["workspaceRoot", "manifest", "inventory", "events", "summary"], "collector options");
  exactOnly(context, ["io", "budget"], "collector context");
  const { io, budget } = context;
  const verificationContext = Object.freeze({ budget });
  assertBudgetHandle(budget);
  if (typeof io?.retainActual !== "function") throw new TypeError("actual graph registrar required");
  const guard = () => {
    assertBudgetHandle(budget);
    budget.assertLive("preflight evidence");
    assertReadEffect(io);
  };
  guard();
  const { workspaceRoot, manifest, inventory, events, summary } = options;
  const refs = new Map(inventory.map((r) => [r.path, r]));
  const read = async (path) => {
    guard();
    const ref = refs.get(path);
    assertArtifactRef(ref);
    const bytes = await confinedRead(workspaceRoot, path, "V3 preflight evidence", io, verificationContext);
    guard();
    if (bytes.length !== ref.byteLength || sha256Bytes(bytes) !== ref.sha256) throw new Error("V3 evidence ref mismatch");
    return { ref, bytes };
  };
  const observations = [];
  for (let i = 0; i < 5; i += 1) {
    for (const role of ["candidate", "baseline"]) {
      for (const suffix of ["ready", "move-1"]) {
        const { ref, bytes } = await read(`preflight/observations/preflight-sample-${i}-${role}-${suffix}.json`);
        guard();
        observations.push({ ref, value: parseCanonicalBytes(bytes) });
      }
    }
  }
  const rawThroughput = await read("preflight/throughput.json");
  guard();
  const throughput = { ref: rawThroughput.ref, value: parseCanonicalBytes(rawThroughput.bytes) };
  const aaReplays = [];
  for (const game of buildGameSchedule({ phase: "preflight" })) {
    guard();
    const selected = summary.gameEvidence?.games?.find((g) => g.gameId === game.gameId);
    const { ref, bytes } = await read(selected?.checkpoint?.pgn?.path);
    guard();
    const replay = await issueActual(io.retainActual, () => {
      guard();
      return replayCheckpointPgn({ phase: "preflight", game, bytes, budget });
    });
    guard();
    aaReplays.push({ gameId: game.gameId, pgn: ref,
      replayedBytes: { byteLength: bytes.length, sha256: sha256Bytes(bytes) }, replay });
  }
  guard();
  return validatePreflightEvidenceV3({ manifest, inventory, events, summary, observations, throughput, aaReplays });
}
