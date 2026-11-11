// Owned V3 phase coordinator. No implicit phase chain or import-time work.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ownCommand } from './task-3-process-owner.mjs';
import { PLAN, ROOT, PHASES, POLICY, PROTOCOL, CONSTRAINTS, utc, json, write,
  assertBootstrapCurrentV3, assertReleasedInputs, currentInputs, ownerClosureVerified,
  operatorDecision } from './separate-verdicts-shared-v3.mjs';
import { openV3ReadOnlyGraphContext, assertPrior } from './separate-verdicts-graph-v3.mjs';

export async function runV3Command(phase, releaseFile, launchTripwire = null) {
  assert(PHASES.includes(phase));
  let r, before;
  if (phase === 'check') {
    const bootstrap = assertBootstrapCurrentV3(releaseFile);
    r = bootstrap.release; before = bootstrap.inputsBefore;
  } else {
    const opened = await openV3ReadOnlyGraphContext({ releasePath: releaseFile, purpose: 'prior-recheck' });
    r = opened.release;
    let primary, failed = false;
    try {
      opened.context.assertLive();
      const origin = json(path.join(r.orchestrationRoot, 'execution.json'));
      assert.equal(origin.releaseSha256, r.releaseSha256);
      assert.equal(origin.candidate, r.candidate); assert.equal(origin.workspaceRoot, r.workspaceRoot);
      assert(fs.statSync(r.workspaceRoot).isDirectory());
      for (const prior of PHASES.slice(0, PHASES.indexOf(phase))) await assertPrior(r, prior, opened.context);
      opened.context.assertLive(); before = assertReleasedInputs(r); opened.context.assertLive();
    } catch (error) { failed = true; primary = error; }
    try { await opened.context.close(); } catch (error) { if (!failed) { failed = true; primary = error; } }
    if (failed) throw primary;
  }
  // Test-only control stops here. Production CLI has no hook/flag.
  if (launchTripwire !== null) return launchTripwire({ phase, release: r, inputsBefore: before });
  if (phase === 'check') {
    fs.mkdirSync(r.orchestrationRoot);
    write(path.join(r.orchestrationRoot, 'execution.json'), { candidate: r.candidate,
      workspaceRoot: r.workspaceRoot, releaseSha256: r.releaseSha256, createdUtc: utc() });
  }
  const out = path.join(r.orchestrationRoot, phase);
  fs.mkdirSync(out);
  if (phase === 'compare') write(path.join(r.orchestrationRoot, 'comparison-claim.json'), {
    candidate: r.candidate, workspaceRoot: r.workspaceRoot, claimedUtc: utc(), cohorts: 1, ...CONSTRAINTS });
  write(path.join(out, 'inputs-before.json'), before);
  const env = { ...process.env };
  const nodeBin = path.dirname(r.runtimeIdentity.node.invocationPath);
  env.PATH = path.join(ROOT, 'train/.venv/bin') + path.delimiter + nodeBin +
    path.delimiter + (env.PATH ?? '');
  let argv;
  if (phase === 'parity') {
    env.PYTHONPATH = 'train/src';
    argv = [r.runtimeIdentity.python.invocationPath, 'train/scripts/check_browser_parity.py'];
  } else {
    const npm = path.join(nodeBin, '../lib/node_modules/npm/bin/npm-cli.js');
    argv = [r.runtimeIdentity.node.invocationPath, npm, 'run', {
      check: 'test:chess-browser', preflight: 'eval:browser:preflight', compare: 'eval:browser',
    }[phase], '--'];
  }
  argv.push('--protocol', PROTOCOL, '--candidate', r.candidate, '--out', r.workspaceRoot);
  const details = { phase, candidate: r.candidate, releaseSha256: r.releaseSha256,
    workspaceRoot: r.workspaceRoot, runtimeIdentity: r.runtimeIdentity,
    protocolRef: r.protocolRef, evaluationPolicy: POLICY };
  const owned = await ownCommand({ argv, cwd: ROOT, env, out, details });
  const after = currentInputs(r);
  write(path.join(out, 'inputs-after.json'), after);
  const command = { ...owned, inputHashesExactAfter: after.exact,
    comparisonCohortsLaunched: Number(phase === 'compare') };
  write(path.join(out, 'result.json'), command);
  let verification = null;
  let verifierOwner = null;
  if (ownerClosureVerified(command) && after.exact) {
    const readbackOut = path.join(out, 'readback');
    fs.mkdirSync(readbackOut);
    verifierOwner = await ownCommand({ argv: [r.runtimeIdentity.node.invocationPath,
      path.join(PLAN, 'separate-verdicts-verify-phase-v3.mjs'), '--verify', phase, releaseFile],
      cwd: ROOT, env, out: readbackOut, details: { ...details, readbackOnly: true } });
    if (ownerClosureVerified(verifierOwner) && verifierOwner.exitCode === 0)
      verification = json(path.join(out, 'verification.json'));
  }
  const settledInputs = currentInputs(r);
  write(path.join(out, 'inputs-after-readback.json'), settledInputs);
  if (!settledInputs.exact) verification = null;
  const decision = { ...details, ...operatorDecision(command, verification, verifierOwner),
    inputHashesExactAfterReadback: settledInputs.exact,
    experimentExitCode: command.exitCode, readbackExitCode: verifierOwner?.exitCode ?? null,
    noAutomaticNextPhase: true };
  write(path.join(out, 'decision.json'), decision);
  await new Promise((resolve, reject) => process.stdout.write(JSON.stringify(decision) + '\n',
    (error) => error ? reject(error) : resolve()));
  process.exitCode = decision.operatorExitCode;
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 5, 'usage: --run <phase> <controller-release.json>');
    assert.equal(process.argv[2], '--run');
    await runV3Command(process.argv[3], process.argv[4]);
  } catch (error) {
    console.error(String(error?.stack ?? error));
    process.exitCode = 1;
  }
}
