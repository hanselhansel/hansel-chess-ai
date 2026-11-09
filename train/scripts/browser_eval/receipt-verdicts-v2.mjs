// Pure coherence over already read, hash-bound graph facts. This function
// cannot read files, mint a prepared token, publish or prove actual closure.
import { assertArtifactRef, eqLiteral, exactOnly, schemaFail } from "./schema-primitives.mjs";
import { assertRecordV2 } from "./record-schema-v2.mjs";
import { deriveVerdicts } from "./verdicts-v2.mjs";
import { assertQualityCheckpoint, assertResourceEvidence } from "./resource-quality.mjs";

const fail = (detail) => schemaFail("SCHEMA_COHERENCE", detail);
const bundle = (v) =>
  Object.fromEntries(
    ["strengthVerdict", "resourceVerdict", "closureResourceVerdict", "status", "exitCode"].map((k) => [k, v[k]]),
  );
const counterFields = ["completedCycles", "timelyCycles", "gapCount"];
const stamp = (s) => (s === null ? -1n : BigInt(s));

const extendsCheckpoint = (before, after) => {
  for (const k of counterFields) if (after[k] < before[k]) fail(`regressed ${k}`);
  for (const c of Object.keys(before.causeCounts))
    if (after.causeCounts[c] < before.causeCounts[c]) fail("regressed causes");
  if (
    stamp(after.maxGapNs) < stamp(before.maxGapNs) ||
    (before.coverageLost && !after.coverageLost) ||
    stamp(after.lastCompleteNs) < stamp(before.lastCompleteNs) ||
    stamp(after.lastTimelyNs) < stamp(before.lastTimelyNs) ||
    after.lateDropCount < before.lateDropCount
  )
    fail("regressed resource checkpoint");
  if (
    after.completedCycles === before.completedCycles &&
    (after.lastCompleteNs !== before.lastCompleteNs ||
      after.lastTimelyNs !== before.lastTimelyNs ||
      after.timelyCycles !== before.timelyCycles)
  )
    fail("fabricated completion clocks");
};

export function verifyVerdictClosure(input) {
  exactOnly(input, ["facts", "final", "completion", "eventsRef", "finalEvent", "checkpoints"], "verdict closure input");
  const { facts, final, completion, eventsRef, finalEvent, checkpoints } = input;
  assertRecordV2("final", final);
  assertRecordV2("completion", completion);
  assertRecordV2("event", finalEvent);
  assertArtifactRef(eventsRef);
  const directory = final.phase === "watchdog-selftest" ? "preflight/selftest" : final.phase;
  if (eventsRef.path !== `${directory}/events.jsonl`) fail("events path binding");
  for (const k of ["schemaVersion", "workspaceId", "runId", "phase", "commonIdentitySha256", "evaluationPolicy"])
    eqLiteral(final[k], completion[k], `final/completion ${k}`);
  for (const k of ["schemaVersion", "workspaceId", "runId", "phase"])
    eqLiteral(final[k], finalEvent[k], `final event ${k}`);
  if (finalEvent.kind !== "resource" || finalEvent.payload.kind !== "final-resource-evidence")
    fail("mandatory final resource snapshot");
  eqLiteral(final.resourceEvidence, finalEvent.payload.resourceEvidence, "mandatory final snapshot equality");
  eqLiteral(facts.eventsRef, eventsRef, "facts events ref");
  eqLiteral(facts.resourceEvidence, final.resourceEvidence, "facts resource evidence");
  if (facts.runId !== final.runId || facts.phase !== final.phase) fail("facts phase binding");
  if (
    !completion.artifacts.some(
      (r) => r.path === eventsRef.path && r.sha256 === eventsRef.sha256 && r.byteLength === eventsRef.byteLength,
    )
  )
    fail("completion events binding");
  eqLiteral(final.resourceVerdict.resourceEvidenceRefs, [eventsRef], "local evidence refs");
  const e = final.resourceEvidence;
  assertResourceEvidence(e);
  if (e.coverageEndNs === null) fail("missing coverage fence");
  if (e.closureKind === "monitor-stop" && e.pending) fail("unsettled monitor body");
  if (e.closureKind === "selftest-prefix" && (e.coverageLost || e.hardReasons.length || e.rssLimitExceeded))
    fail("unproven strict prefix");
  if (!Array.isArray(checkpoints)) fail("checkpoint array");
  let previous = null;
  let previousPayload = null;
  for (const payload of checkpoints) {
    // Reuse the closed event payload check; sequence/hash/order ownership is
    // still enforced by the real graph reader before this pure call.
    assertRecordV2("event", { ...finalEvent, payload });
    if (payload.kind !== undefined) fail("checkpoint/final variant");
    const cp = payload.qualityCheckpoint;
    assertQualityCheckpoint(cp);
    if (BigInt(cp.capturedNs) > BigInt(e.coverageEndNs)) fail("checkpoint after sampling fence");
    if (previous) {
      if (BigInt(cp.capturedNs) < BigInt(previous.capturedNs)) fail("checkpoint chronology");
      extendsCheckpoint(previous, cp);
      for (const k of ["peakRssBytes", "observedPeakRssBytes"])
        if (payload[k] < previousPayload[k]) fail("lost checkpoint peak");
      if (previousPayload.rssLimitExceeded && !payload.rssLimitExceeded) fail("lost checkpoint cap");
    }
    previous = cp;
    previousPayload = payload;
  }
  if (previous) {
    const finalCheckpoint = { ...e, lateDropCount: e.lateDrops.count };
    extendsCheckpoint(previous, finalCheckpoint);
    for (const k of ["peakRssBytes", "observedPeakRssBytes"]) if (e[k] < previousPayload[k]) fail("lost final peak");
    if (previousPayload.rssLimitExceeded && !e.rssLimitExceeded) fail("lost final cap");
  }
  const parentRunIds = completion.prerequisites.map((parent) => parent.runId).sort();
  const resourceRunIds = facts.prerequisiteResources
    .flatMap((parent) => {
      if (parent.scope !== "phase" || parent.phaseRunIds.length !== 1) fail("parent phase resource scope");
      return parent.phaseRunIds;
    })
    .sort();
  eqLiteral(resourceRunIds, parentRunIds, "parent resource coverage");
  const reduced = deriveVerdicts(facts);
  eqLiteral(bundle(final), reduced, "final reducer equality");
  eqLiteral(bundle(completion), reduced, "completion reducer equality");
  return reduced;
}
