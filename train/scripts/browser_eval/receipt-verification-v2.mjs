// Same-verifier explicit-v2 group. Borrows existing confined reads and registrar.
// No Store, queue, Native, independent lifetime or publication capability.
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { confinedRead } from "./receipt-files.mjs";
import { assertRecordV2 } from "./record-schema-v2.mjs";
import { compileFinalV2 } from "./record-finalization-v2.mjs";
import { resolvePhaseChecks, deriveSelfTestChecks, isCleanupProven } from "./record-finalization.mjs";
import { verifyVerdictClosure, verifyResourcePrefixExtension } from "./receipt-verdicts-v2.mjs";
import { deepEqual, schemaFail } from "./schema-primitives.mjs";

const fail = (detail) => schemaFail("SCHEMA_COHERENCE", detail);
export async function readVerdictEventsV2({ workspaceRoot, eventsRef, headFields }, io) {
  const bytes = await confinedRead(workspaceRoot, eventsRef.path, "v2 events", io);
  if (bytes.length !== eventsRef.byteLength || sha256Bytes(bytes) !== eventsRef.sha256) fail("events ref");
  const lines = bytes.toString("utf8").split("\n");
  if (lines.pop() !== "") fail("events final newline");
  return lines.map((line, seq) => {
    const event = parseCanonicalBytes(Buffer.from(`${line}\n`));
    assertRecordV2("event", event);
    if (event.seq !== seq || ["schemaVersion", "workspaceId", "runId", "phase"]
      .some((key) => event[key] !== headFields[key])) fail("events sequence/head");
    return event;
  });
}

export async function verifyReceiptVerdictsV2({ workspaceRoot, workspace, manifest, running,
  final, completion, inventory, parents, nested }, io) {
  for (const record of [workspace, manifest, running, final, completion])
    if (record.schemaVersion !== 2) fail("mixed record version");
  if (!deepEqual(workspace.commonIdentity.evaluationPolicy, manifest.evaluationPolicy)) fail("workspace policy");
  const expectedParents = manifest.prerequisites;
  if (parents.length !== expectedParents.length || parents.some((p, index) =>
    p.final.schemaVersion !== 2 || p.runId !== expectedParents[index].runId ||
    !deepEqual(p.commonIdentity, workspace.commonIdentity))) fail("parent version/identity");
  const eventsRef = inventory.find((r) => r.path === `${final.phase === "watchdog-selftest" ? "preflight/selftest" : final.phase}/events.jsonl`);
  if (!eventsRef) fail("events missing");
  const events = await readVerdictEventsV2({ workspaceRoot, eventsRef, headFields: final }, io);
  const snapshots = events.filter((event) => event.kind === "resource" && event.payload.kind === "final-resource-evidence");
  if (snapshots.length !== 1 || snapshots[0] !== events.at(-1)) fail("mandatory last final snapshot");
  const outcome = final.summary.supervisorOutcome;
  if (!outcome || !Array.isArray(outcome.checkClaims) ||
    (final.phase === "watchdog-selftest" && outcome.checkClaims.length !== 0) || !["passed", "failed", "inconclusive", "abandoned"].includes(outcome.status) ||
    outcome.exitCode !== { passed: 0, failed: 1, inconclusive: 2, abandoned: 2 }[outcome.status] ||
    !Number.isSafeInteger(outcome.reportedFaultCount) || outcome.reportedFaultCount < 0 ||
    Object.keys(outcome).sort().join() !== "checkClaims,exitCode,identityObservation,reportedFaultCount,status") fail("supervisor outcome");
  const expectedFinalizer = final.phase === "watchdog-selftest" ? manifest.owner.supervisor : running.supervisor;
  const request = { status: outcome.status, exitCode: outcome.exitCode, stopReason: final.stopReason,
    unplannedFaultCount: outcome.reportedFaultCount, summary: final.summary,
    analysisEligible: false, resourceEvidence: snapshots[0].payload.resourceEvidence };
  const requiredChecks = final.phase === "watchdog-selftest"
    ? deriveSelfTestChecks({ request, recordedProof: final.cleanup, eventsRef })
    : resolvePhaseChecks({ claims: outcome.checkClaims, phase: final.phase,
      refs: new Map(inventory.map((r) => [r.path, r])),
      phaseDir: final.phase, eventsRef,
      cleanupOk: isCleanupProven(final.cleanup, "phase-workload", expectedFinalizer) });
  const result = compileFinalV2({ headFields: Object.fromEntries(
    ["schemaVersion", "workspaceId", "runId", "phase"].map((key) => [key, final[key]])),
    commonIdentitySha256: manifest.commonIdentitySha256,
    request, claims: outcome.checkClaims, requiredChecks, recordedProof: final.cleanup,
    expectedFinalizer, expectedIdentity: workspace.commonIdentity, identityObservation: outcome.identityObservation,
    artifactRefs: inventory, eventsRef, events, verifiedParents: parents });
  if (!deepEqual(result.final, final)) fail("independent final compilation");
  const e = final.resourceEvidence;
  if (final.phase === "watchdog-selftest") {
    if (e.closureKind !== "selftest-prefix" || e.monitorRunId !== manifest.owner.runId ||
      final.runId !== `${manifest.owner.runId}:watchdog-selftest`) fail("selftest monitor scope");
  } else if (e.closureKind !== "monitor-stop" || e.monitorRunId !== final.runId) fail("monitor scope");
  if (nested !== null) {
    const prefix = nested.final.resourceEvidence;
    if (nested.final.schemaVersion !== 2 || prefix.monitorRunId !== final.runId ||
      prefix.startedNs !== e.startedNs || BigInt(prefix.coverageEndNs) > BigInt(e.coverageEndNs) ||
      nested.final.resourceVerdict.status !== "passed" || nested.final.closureResourceVerdict.status !== "passed") fail("nested parent closure");
    verifyResourcePrefixExtension(prefix, e);
    // Parent's actual closure must extend the cached strict prefix. Pending
    // parent work can clear only in the eventual genuine monitor-stop graph.
    for (const key of ["completedCycles", "timelyCycles", "gapCount", "observedPeakRssBytes", "peakRssBytes"])
      if (e[key] < prefix[key]) fail("parent reset prefix");
  }
  verifyVerdictClosure({ facts: result.facts, final, completion, eventsRef,
    finalEvent: snapshots[0], checkpoints: events.filter((event) => event.kind === "resource" &&
      event.payload.kind === undefined).map((event) => event.payload) });
}
