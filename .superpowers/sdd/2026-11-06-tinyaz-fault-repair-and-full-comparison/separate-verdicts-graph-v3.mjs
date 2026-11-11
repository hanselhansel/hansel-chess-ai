// Read-only graph authority. No import-time effects or command CLI dependency.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { loadRelease, assertReleasedInputs, PHASES, POLICY, PROTOCOL,
  ownerClosureVerified, RUNTIME_PATHS } from './separate-verdicts-shared-v3.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const now = () => Number(process.hrtime.bigint() / 1000000n);
const CONTEXTS = new WeakMap();
export async function openV3ReadOnlyGraphContext({ releasePath, purpose }) {
  assert(['phase-readback', 'prior-recheck'].includes(purpose));
  const startedMonoNs = process.hrtime.bigint().toString();
  const deadlineMonoMs = Number(BigInt(startedMonoNs) / 1000000n) + 90000;
  const pinGuard = () => { assert(now() < deadlineMonoMs, 'original V3 read-only bound expired'); };
  pinGuard();
  const release = loadRelease(releasePath);
  pinGuard(); assertReleasedInputs(release); pinGuard();
  assert.equal(RUNTIME_PATHS.length, 135);
  for (const rel of RUNTIME_PATHS) {
    pinGuard(); assert.equal(typeof release.expected[rel], 'string', `missing runtime pin ${rel}`);
    const bytes = fs.readFileSync(path.join(release.workspaceRoot, 'inputs/harness', rel));
    pinGuard(); assert.equal(hash(bytes), release.expected[rel]);
  }
  const modulePath = (name) => pathToFileURL(path.join(release.workspaceRoot,
    'inputs/harness/train/scripts/browser_eval', name)).href;
  pinGuard();
  const { createWatchdogLifetime } = await import(modulePath('watchdog-lifetime.mjs'));
  pinGuard();
  const { createBudgetHandle, assertBudgetHandle } = await import(modulePath('process-budget.mjs'));
  pinGuard();
  const { confinedRead } = await import(modulePath('receipt-files.mjs'));
  pinGuard();
  const { parseCanonicalBytes } = await import(modulePath('canonical-json.mjs'));
  pinGuard();
  const { verifyReceipt } = await import(modulePath('prerequisites.mjs'));
  pinGuard();
  const lifetime = createWatchdogLifetime();
  const budget = createBudgetHandle({ deadlineMonoMs, nowMonoMs: now, clock: { setTimeout, clearTimeout } });
  let closed = false, closing = null;
  const disposeBudget = budget.dispose;
  const assertLive = () => {
    assert(!closed, 'closed read-only context');
    assertBudgetHandle(budget);
    budget.assertLive('V3 read-only graph');
  };
  const io = Object.freeze({ retainActual: lifetime.retainActual, assertEffectLive: assertLive });
  const close = () => {
    if (closing === null) closing = (async () => {
      closed = true;
      await lifetime.whenSettled();
      disposeBudget();
      return Object.freeze({ actualVerifierOwnerSettled: true, budgetDisposed: true });
    })();
    return closing;
  };
  const context = Object.freeze({ purpose, startedMonoNs, deadlineMonoMs, budget, io, assertLive, close });
  CONTEXTS.set(context, { release, confinedRead, parseCanonicalBytes, verifyReceipt });
  assertLive();
  return Object.freeze({ release, context });
}
function apiFor(r, context) {
  const api = CONTEXTS.get(context);
  assert(api && api.release === r, 'genuine released graph context');
  context.assertLive();
  return api;
}
async function readBound(r, context, root, rel) {
  const api = apiFor(r, context);
  const bytes = await api.confinedRead(root, rel, rel, context.io);
  context.assertLive();
  return bytes;
}
const readJSON = async (r, context, root, rel) => JSON.parse(await readBound(r, context, root, rel));
export async function readPhase(r, phase, command, context) {
  const api = apiFor(r, context);
  assert(PHASES.includes(phase));
  for (const key of ['releaseSha256', 'candidate', 'workspaceRoot']) assert.equal(command[key], r[key]);
  assert.equal(ownerClosureVerified(command), true);
  assert.equal(command.inputHashesExactAfter, true);
  assert.deepEqual(command.runtimeIdentity, r.runtimeIdentity);
  assert.deepEqual(command.protocolRef, r.protocolRef);
  assert.deepEqual(command.evaluationPolicy, POLICY);
  const out = path.join(r.orchestrationRoot, phase);
  for (const name of ['stdout', 'stderr']) {
    const bytes = await readBound(r, context, out, `${name}.log`);
    assert.equal(bytes.length, command[`${name}Bytes`]);
    assert.equal(hash(bytes), command[`${name}Sha256`]);
  }
  const events = (await readBound(r, context, out, 'owner-events.jsonl')).toString('utf8')
    .trim().split('\n').map(JSON.parse);
  for (const kind of ['process-spawn', 'process-exit', 'process-close', 'owner-joined'])
    assert.equal(events.filter((e) => e.kind === kind).length, 1);
  const exit = events.find((e) => e.kind === 'process-exit');
  assert.equal(exit.code, command.exitCode); assert.equal(exit.signal, null);
  for (const name of ['stdout', 'stderr']) {
    assert.equal(events.filter((e) => e.kind === 'pipe-end' && e.stream === name).length, 1);
    const closes = events.filter((e) => e.kind === 'pipe-close' && e.stream === name);
    assert.equal(closes.length, 1);
    assert(closes[0].ended && closes[0].closed && closes[0].rawFsynced && closes[0].rawFileClosed);
  }
  const workspace = api.parseCanonicalBytes(await readBound(r, context, r.workspaceRoot, 'workspace.json'));
  const id = workspace.commonIdentity;
  assert.equal(workspace.schemaVersion, 2);
  assert.deepEqual(id.evaluationPolicy, POLICY); assert.deepEqual(id.fixtures.protocol, r.protocolRef);
  assert.equal(id.fixtures.protocol.path, PROTOCOL);
  assert.deepEqual(id.environment.node, r.runtimeIdentity.node);
  assert.deepEqual(id.environment.python.runtime, r.runtimeIdentity.python);
  assert.equal(id.candidate.kind, 'commit'); assert.equal(id.candidate.commit, r.candidate);
  assert.equal(id.baseline.commit, r.constraints.baselineCommit);
  assert.equal(id.model.sha256, r.constraints.modelSha256); assert.equal(id.model.byteLength, r.constraints.modelBytes);
  const rel = `${phase}/completion.json`;
  const bytes = await readBound(r, context, r.workspaceRoot, rel);
  const completionRef = { path: rel, byteLength: bytes.length, sha256: hash(bytes) };
  const verified = await api.verifyReceipt({ workspaceRoot: r.workspaceRoot, completionRef,
    expectedIdentity: id }, context.io, { budget: context.budget });
  context.assertLive();
  assert.equal(verified.final.phase, phase); assert.equal(verified.final.schemaVersion, 2);
  assert.deepEqual(verified.final.evaluationPolicy, POLICY);
  assert.equal(verified.final.exitCode, command.exitCode);
  const final = verified.final;
  return Object.freeze({ phase, candidate: r.candidate, releaseSha256: r.releaseSha256,
    runtimeIdentity: r.runtimeIdentity, protocolRef: r.protocolRef, evaluationPolicy: POLICY,
    workspaceRoot: r.workspaceRoot, completionRef, workspaceId: verified.workspaceId,
    runId: verified.runId, final, closure: verified.closure,
    scientificReadinessVerdict: final.scientificReadinessVerdict,
    preflightScientificReady: phase === 'preflight' && final.scientificReadinessVerdict.status === 'ready',
    strengthVerdict: final.strengthVerdict, resourceVerdict: final.resourceVerdict,
    closureResourceVerdict: final.closureResourceVerdict,
    resourceScope: final.resourceEvidence.closureKind, monitorRunId: final.resourceEvidence.monitorRunId,
    pending: final.resourceEvidence.pending, gapCount: final.resourceEvidence.gapCount,
    maxGapNs: final.resourceEvidence.maxGapNs, cleanup: final.cleanup,
    observedPeakRssBytes: final.resourceEvidence.observedPeakRssBytes, peakRssBytes: final.resourceEvidence.peakRssBytes,
    experimentExitCode: command.exitCode, authoritativeGraphVerified: true, ownerClosureVerified: true,
    scientificEvidenceEligible: final.strengthVerdict.status === 'eligible' && final.analysisEligible,
    readbackOnly: true });
}
export async function assertPrior(r, phase, context) {
  apiFor(r, context);
  assert.equal(context.purpose, 'prior-recheck');
  const out = path.join(r.orchestrationRoot, phase);
  const command = await readJSON(r, context, out, 'result.json');
  const saved = await readJSON(r, context, out, 'verification.json');
  const decision = await readJSON(r, context, out, 'decision.json');
  const owner = await readJSON(r, context, out, 'readback/owner-receipt.json');
  for (const value of [command, saved, decision, owner]) {
    assert.equal(value.releaseSha256, r.releaseSha256);
    assert.equal(value.candidate, r.candidate); assert.equal(value.workspaceRoot, r.workspaceRoot);
  }
  assert(ownerClosureVerified(owner) && owner.exitCode === 0);
  assert(saved.actualVerifierOwnerSettled && saved.authoritativeGraphVerified && saved.ownerClosureVerified);
  assert.deepEqual(saved.evaluationPolicy, POLICY); assert.deepEqual(saved.runtimeIdentity, r.runtimeIdentity);
  assert.deepEqual(saved.protocolRef, r.protocolRef);
  for (const name of ['stdout', 'stderr']) {
    const bytes = await readBound(r, context, path.join(out, 'readback'), `${name}.log`);
    assert.equal(bytes.length, owner[`${name}Bytes`]); assert.equal(hash(bytes), owner[`${name}Sha256`]);
    if (name === 'stdout') assert.deepEqual(JSON.parse(bytes.toString('utf8').trim()), saved);
  }
  const journal = (await readBound(r, context, path.join(out, 'readback'), 'owner-events.jsonl'))
    .toString('utf8').trim().split('\n').map(JSON.parse);
  for (const kind of ['process-spawn', 'process-exit', 'process-close', 'owner-joined'])
    assert.equal(journal.filter((event) => event.kind === kind).length, 1);
  const readbackExit = journal.find((event) => event.kind === 'process-exit');
  assert.equal(readbackExit.code, 0); assert.equal(readbackExit.signal, null);
  for (const name of ['stdout', 'stderr']) {
    assert.equal(journal.filter((event) => event.kind === 'pipe-end' && event.stream === name).length, 1);
    const closes = journal.filter((event) => event.kind === 'pipe-close' && event.stream === name);
    assert.equal(closes.length, 1);
    assert(closes[0].ended && closes[0].closed && closes[0].rawFsynced && closes[0].rawFileClosed);
  }
  const fresh = await readPhase(r, phase, command, context);
  assert.deepEqual(fresh.final, saved.final);
  assert.deepEqual(fresh.completionRef, saved.completionRef);
  const f = fresh.final;
  const strict = f.status === 'passed' && f.exitCode === 0 && f.resourceVerdict.status === 'passed' &&
    f.closureResourceVerdict.status === 'passed';
  const ready = phase === 'preflight' && fresh.preflightScientificReady && f.status === 'inconclusive' && f.exitCode === 2 &&
    f.resourceVerdict.status === 'failed' && f.closureResourceVerdict.status === 'failed' &&
    JSON.stringify(f.resourceVerdict.reasons) === '["COVERAGE_GAP"]' &&
    JSON.stringify(f.closureResourceVerdict.reasons) === '["COVERAGE_GAP"]';
  assert(strict || ready, 'prior scientific admission');
  assert.equal(decision.operatorExitCode, command.exitCode);
  assert.equal(f.unplannedFaultCount, 0); assert.equal(f.stopReason, null);
  assert(f.requiredChecks.every((c) => c.status === 'passed'));
  assert(f.cleanup.verified && f.cleanup.accountingValid && !f.cleanup.survivorIdentities.length && !f.cleanup.listenersRemaining.length);
  if (phase === 'parity') {
    assert.equal(f.summary.fixtureCaseCount, 13); assert.equal(f.summary.reference.passed, true);
    assert.equal(f.summary.reference.importsStable, true); assert.equal(f.summary.reference.cases.length, 13);
    assert(f.summary.reference.cases.every((x) => !x.failingPlanes && !x.failingLogits && !x.failingValues));
  }
  context.assertLive();
  return Object.freeze({ phase, runId: fresh.runId, completionRef: fresh.completionRef,
    scientificAdmissible: true, resourceVerdict: f.resourceVerdict, closureResourceVerdict: f.closureResourceVerdict,
    releaseSha256: r.releaseSha256, candidate: r.candidate, workspaceRoot: r.workspaceRoot });
}
