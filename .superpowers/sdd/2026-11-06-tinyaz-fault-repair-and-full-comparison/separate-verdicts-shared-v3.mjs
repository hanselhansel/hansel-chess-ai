// Plan-owned command/pipe owner. No kill, forced exit, or phase deadline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { RUNTIME_PATHS } from '../../../train/scripts/browser_eval/snapshot-files.mjs';
import { isDeepStrictEqual } from 'node:util';
import { PROGRESS, RESOURCES } from './task-3-stream.mjs';
export const PLAN = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = '/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai';
export const PHASES = ['check', 'parity', 'preflight', 'compare'];
export const SCRIPTS = ['task-3-stream.mjs', 'task-3-process-owner.mjs', 'task-3-control-child.mjs',
  'separate-verdicts-shared-v3.mjs', 'separate-verdicts-graph-v3.mjs',
  'separate-verdicts-owned-command-v3.mjs', 'separate-verdicts-verify-phase-v3.mjs',
  'separate-verdicts-owner-controls-v3.mjs'];
export const PROTOCOL = 'train/fixtures/browser-protocol-v3.json';
export const POLICY = Object.freeze({ policyId: 'tinyaz-separate-verdicts-v3',
  recordSchemaVersion: 2, softPhases: Object.freeze(['preflight', 'compare']) });
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const BRANCH = 'feat/tinyaz-browser-harness';
const SHA = /^[a-f0-9]{64}$/;
export const CONSTRAINTS = Object.freeze({ compareCeilingMs: 86400000, readinessMs: 30000,
  commandMs: 90000, nativeCleanupMs: 5000, rssBytes: 4294967296,
  workspaceBytes: 268435456, plannedPairs: 20, plannedGames: 40, visits: 64,
  baselineCommit: 'bb76439ea7bb4ae84bf15fe1276d75dc336d3cec', modelBytes: 9706840,
  modelSha256: 'b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee' });
export const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
export const RELEASE_KEYS = ['schemaVersion', 'status', 'controller', 'approvedUtc', 'candidate',
  'repositoryRoot', 'branch', 'safetyPath', 'safetySha256', 'orchestrationScriptsSha256',
  'workspaceRoot', 'orchestrationRoot', 'approvedComparisonCohorts', 'progressPrefix',
  'resourcesPrefix', 'constraints', 'evaluationPolicy', 'protocolRef', 'runtimeIdentity'].sort();
export const fileRef = (file, rel = file) => ({ path: rel, byteLength: fs.statSync(file).size, sha256: sha(file) });
export function assertRuntime(runtime) {
  assert.deepEqual(Object.keys(runtime).sort(), ['node', 'python']);
  assert.deepEqual(Object.keys(runtime.node).sort(), ['invocationPath', 'realPath', 'sha256', 'version']);
  assert.deepEqual(Object.keys(runtime.python).sort(), ['basePrefix', 'executable', 'invocationPath',
    'prefix', 'processImage', 'realPath', 'sha256', 'version']);
  for (const descriptor of [runtime.node, runtime.python]) {
    assert.equal(fs.realpathSync(descriptor.invocationPath), descriptor.realPath);
    assert.equal(sha(descriptor.realPath), descriptor.sha256);
  }
  assert.equal(process.execPath, runtime.node.invocationPath);
  assert.equal(process.version, runtime.node.version);
  assert.equal(runtime.python.invocationPath, path.join(ROOT, 'train/.venv/bin/python'));
  assert.equal(runtime.python.executable, runtime.python.invocationPath);
  assert.equal(runtime.python.prefix, path.join(ROOT, 'train/.venv'));
  assert.equal(runtime.python.version, '3.11.14');
  assert.deepEqual(Object.keys(runtime.python.processImage).sort(), ['realPath', 'sha256']);
  assert.equal(sha(runtime.python.processImage.realPath), runtime.python.processImage.sha256);
}
export function ownerClosureVerified(command) {
  return command?.commandNaturalClosure === true && command.exitSignal === null &&
    Number.isInteger(command.exitCode) && command.actualSpawn?.pid === command.pid &&
    command.exitEvent?.code === command.exitCode && command.exitEvent?.signal === null &&
    command.wholeCommandAndRawPipesJoined === true && command.rawByteCountsExact === true &&
    ['stdout', 'stderr'].every((name) => {
      const p = command.pipes?.[name];
      return p?.ended === true && p.closed === true && p.rawFileClosed === true &&
        p.rawFsynced === true && p.retainedBytes === command[`${name}Bytes`];
    }) && command.journal?.fsynced === true && command.journal.closed === true &&
    command.intervention === null && Array.isArray(command.managerErrors) &&
    command.managerErrors.length === 0 && Array.isArray(command.managerSignalsReceived) &&
    command.managerSignalsReceived.length === 0 && Array.isArray(command.signalsSent) &&
    command.signalsSent.length === 0;
}
export function operatorDecision(command, readback, verifierOwner) {
  const closed = ownerClosureVerified(command) && command.inputHashesExactAfter === true;
  const graph = closed && ownerClosureVerified(verifierOwner) && verifierOwner.exitCode === 0 &&
    readback?.authoritativeGraphVerified === true && readback.actualVerifierOwnerSettled === true &&
    readback.ownerClosureVerified === true && readback.releaseSha256 === command.releaseSha256 &&
    readback.candidate === command.candidate && readback.workspaceRoot === command.workspaceRoot &&
    readback.final?.exitCode === command.exitCode;
  return { ownerClosureVerified: closed, authoritativeGraphVerified: Boolean(graph),
    preflightScientificReady: Boolean(graph && readback.preflightScientificReady),
    scientificEvidenceEligible: Boolean(graph && readback.scientificEvidenceEligible),
    operatorExitCode: graph && [0, 2].includes(command.exitCode) ? command.exitCode : 1 };
}
export const utc = () => new Date().toISOString();
function canonicalFuture(value) {
  assert.equal(typeof value, 'string');
  assert(path.isAbsolute(value));
  assert.equal(path.resolve(value), value);
  assert.equal(path.join(fs.realpathSync(path.dirname(value)), path.basename(value)), value);
  return value;
}
export function assertScriptBindings(bindings) {
  assert.deepEqual(Object.keys(bindings).sort(), [...SCRIPTS].sort());
  for (const name of SCRIPTS) {
    assert.match(bindings[name], SHA);
    assert.equal(sha(path.join(PLAN, name)), bindings[name]);
  }
}
export function loadRelease(file) {
  const r = json(file);
  assert.equal(r.status, 'GO', 'controller GO has not been supplied');
  assert.equal(r.schemaVersion, 3);
  assert.deepEqual(r.evaluationPolicy, POLICY);
  assert.deepEqual(Object.keys(r).sort(), RELEASE_KEYS);
  assert.deepEqual(r.protocolRef, fileRef(path.join(ROOT, PROTOCOL), PROTOCOL));
  assertRuntime(r.runtimeIdentity);
  assert.equal(r.controller, '/root');
  assert.equal(typeof r.approvedUtc, 'string');
  assert(Number.isFinite(Date.parse(r.approvedUtc)));
  assert.match(r.candidate, /^[a-f0-9]{40}$/);
  assert.equal(r.repositoryRoot, ROOT);
  assert.equal(r.branch, BRANCH);
  assert.equal(r.approvedComparisonCohorts, 1);
  assert.equal(r.progressPrefix, PROGRESS);
  assert.equal(r.resourcesPrefix, RESOURCES);
  assert(isDeepStrictEqual(r.constraints, CONSTRAINTS));
  assertScriptBindings(r.orchestrationScriptsSha256);
  canonicalFuture(r.workspaceRoot); canonicalFuture(r.orchestrationRoot);
  assert.equal(path.dirname(r.orchestrationRoot), PLAN);
  assert.match(path.basename(r.orchestrationRoot), new RegExp(`^task-3-execution-${r.candidate.slice(0, 7)}-${UUID}$`));
  assert.match(path.basename(r.workspaceRoot), new RegExp(`^tinyaz-v3-${r.candidate.slice(0, 7)}-${UUID}$`));
  assert(!r.workspaceRoot.startsWith(ROOT + path.sep));
  assert.match(r.safetySha256, SHA);
  assert.equal(sha(r.safetyPath), r.safetySha256);
  const safety = json(r.safetyPath);
  assert.deepEqual(safety.runtimeIdentity, r.runtimeIdentity);
  assert.equal(safety.head, r.candidate);
  assert.equal(safety.branch, BRANCH);
  assert.equal(safety.executionRoot, ROOT);
  const expected = {};
  for (const name of ['sourceAndTestSha256', 'protectedAndPythonRefsSha256']) {
    const map = safety[name];
    assert(map && Object.keys(map).length > 0);
    for (const [rel, hash] of Object.entries(map)) {
      assert(!path.isAbsolute(rel) && rel.split('/').every((part) => part && part !== '..' && part !== '.'));
      assert.match(hash, SHA);
      assert(!expected[rel] || expected[rel] === hash);
      expected[rel] = hash;
    }
  }
  for (const rel of [...RUNTIME_PATHS, 'package.json', 'package-lock.json', 'train/fixtures/browser-protocol.json', PROTOCOL,
    'train/scripts/browser_eval/cli.mjs', 'train/scripts/check_browser_parity.py',
    'public/weights/tinyaz-m.bin', 'public/weights/tinyaz-m.meta.json', 'src/lib/chess/checkpoint-meta.json']) {
    assert(expected[rel], `reviewed safety manifest missing ${rel}`);
  }
  const tests = fs.readdirSync(path.join(ROOT, 'train/scripts/browser_eval')).filter((name) => name.endsWith('.test.mjs'));
  assert.equal(tests.length, 96);
  for (const name of tests) assert(expected[`train/scripts/browser_eval/${name}`], `missing TEST pin ${name}`);
  for (const rel of ['README.md', 'train/README.md', 'train/scripts/README.md', 'train/fixtures/README.md',
    'train/scripts/browser_eval/README.md', 'docs/experiments/README.md', 'docs/experiments/tinyaz-software-plan.md',
    'docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md',
    'docs/superpowers/specs/2026-11-11-tinyaz-preflight-v3-software-design.md',
    'docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md'])
    assert(expected[rel], `missing documentation pin ${rel}`);
  assert.equal(expected['public/weights/tinyaz-m.bin'], CONSTRAINTS.modelSha256);
  assert.equal(expected[PROTOCOL], r.protocolRef.sha256);
  for (const name of SCRIPTS) {
    const rel = path.relative(ROOT, path.join(PLAN, name));
    assert.equal(expected[rel], r.orchestrationScriptsSha256[name], `missing/wrong safety script pin ${rel}`);
  }
  assert(expected[path.relative(ROOT, path.join(PLAN, 'separate-verdicts-release-v3.template.json'))],
    'reviewed safety manifest missing inert v3 template');
  for (const name of ['task-3-owned-command.mjs', 'task-3-verify-phase.mjs', 'task-3-owner-controls.mjs']) {
    const rel = path.relative(ROOT, path.join(PLAN, name));
    assert(expected[rel], `reviewed safety manifest missing ${rel}`);
  }
  return { ...r, releasePath: path.resolve(file), releaseSha256: sha(file), expected };
}
export function currentInputs(r) {
  const actual = {}, errors = [];
  for (const rel of Object.keys(r.expected).sort()) {
    try { actual[rel] = sha(path.join(ROOT, rel)); }
    catch (error) { actual[rel] = null; errors.push({ path: rel, error: String(error) }); }
  }
  return { actual, errors, exact: isDeepStrictEqual(actual, r.expected), utc: utc() };
}
export function assertReleasedInputs(r) {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 10000, maxBuffer: 4194304 }).trim();
  assertRuntime(r.runtimeIdentity);
  assert.equal(git(['rev-parse', 'HEAD']), r.candidate);
  assert.equal(git(['branch', '--show-current']), BRANCH);
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'checkout is not clean');
  const before = currentInputs(r);
  assert(before.exact, 'reviewed original input bytes changed');
  assert.equal(fs.statSync(path.join(ROOT, 'public/weights/tinyaz-m.bin')).size, CONSTRAINTS.modelBytes);
  return before;
}

export function assertBootstrapCurrentV3(releasePath) {
  const release = loadRelease(releasePath);
  const inputsBefore = assertReleasedInputs(release);
  assert.equal(RUNTIME_PATHS.length, 135);
  for (const root of [release.workspaceRoot, release.orchestrationRoot]) {
    let absent = false;
    try { fs.lstatSync(root); }
    catch (error) { if (error.code !== 'ENOENT') throw error; absent = true; }
    assert(absent, 'cold CHECK requires both exclusive roots absent');
  }
  return Object.freeze({ release, inputsBefore });
}

export { RUNTIME_PATHS };
