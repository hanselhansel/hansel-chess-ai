// TEST-only operator controls. Real graphs/owners over isolated clean Git inputs.
// Loader changes only repository/plan locations and preserves the fixed Python
// installation. No browser, engine, Native control or scientific phase launch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { ownCommand } from './task-3-process-owner.mjs';
import { RUNTIME_PATHS } from '../../../train/scripts/browser_eval/snapshot-files.mjs';
import { createV3GraphFixture, SOURCE } from '../../../train/scripts/browser_eval/preflight-v3-test-fixtures.mjs';

const PLAN_SOURCE = path.dirname(fileURLToPath(import.meta.url));
const PLAN_REL = path.relative(SOURCE, PLAN_SOURCE);
const SCRIPT_NAMES = ['task-3-stream.mjs', 'task-3-process-owner.mjs', 'task-3-control-child.mjs',
  'separate-verdicts-shared-v3.mjs', 'separate-verdicts-graph-v3.mjs',
  'separate-verdicts-owned-command-v3.mjs', 'separate-verdicts-verify-phase-v3.mjs',
  'separate-verdicts-owner-controls-v3.mjs'];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha = (file) => digest(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const moduleURL = (name) => pathToFileURL(path.join(PLAN_SOURCE, name)).href;
export async function runV3OwnerControls(root = fs.mkdtempSync(path.join(os.tmpdir(), 'v3-owner-controls-'))) {
  root = fs.realpathSync(root);
  const repo = path.join(root, 'repo');
  const plan = path.join(repo, PLAN_REL);
  const teardowns = [];
  let succeeded = false;
  const local = { after: (callback) => teardowns.push(callback) };
  const sharedURL = moduleURL('separate-verdicts-shared-v3.mjs');
  const replacements = (source) => source
    .replace("export const PLAN = path.dirname(fileURLToPath(import.meta.url));", `export const PLAN = ${JSON.stringify(plan)};`)
    .replace(`path.join(ROOT, 'train/.venv/bin/python')`, JSON.stringify(path.join(SOURCE, 'train/.venv/bin/python')))
    .replace(`path.join(ROOT, 'train/.venv')`, JSON.stringify(path.join(SOURCE, 'train/.venv')))
    .replace(`export const ROOT = '${SOURCE}';`, `export const ROOT = ${JSON.stringify(repo)};`);
  const hook = registerHooks({ load(url, context, next) {
    const loaded = next(url, context);
    return url === sharedURL ? { ...loaded, source: replacements(typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source).toString('utf8')) } : loaded;
  } });
  try {
    fs.mkdirSync(repo, { recursive: true });
    const tests = fs.readdirSync(path.join(SOURCE, 'train/scripts/browser_eval')).filter((name) => name.endsWith('.test.mjs'));
    assert.equal(tests.length, 96);
    const names = new Set([...RUNTIME_PATHS, ...tests.map((name) => `train/scripts/browser_eval/${name}`),
      'package.json', 'package-lock.json', 'train/scripts/check_browser_parity.py',
      'README.md', 'train/README.md', 'train/scripts/README.md', 'train/fixtures/README.md',
      'train/scripts/browser_eval/README.md', 'docs/experiments/README.md', 'docs/experiments/tinyaz-software-plan.md',
      'docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md',
      'docs/superpowers/specs/2026-11-11-tinyaz-preflight-v3-software-design.md',
      'docs/superpowers/plans/2026-11-06-tinyaz-fault-repair-and-full-comparison.md',
      'public/weights/tinyaz-m.bin', 'public/weights/tinyaz-m.meta.json', 'src/lib/chess/checkpoint-meta.json',
      ...SCRIPT_NAMES.map((name) => `${PLAN_REL}/${name}`),
      ...['task-3-owned-command.mjs', 'task-3-verify-phase.mjs', 'task-3-owner-controls.mjs',
        'separate-verdicts-release-v3.template.json'].map((name) => `${PLAN_REL}/${name}`)]);
    for (const name of names) {
      const target = path.join(repo, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(SOURCE, name), target);
    }
    fs.writeFileSync(path.join(repo, '.gitignore'), `${PLAN_REL}/task-3-execution-*/\n`);
    const git = (args) => execFileSync('/usr/bin/git', ['-c', 'core.hooksPath=/dev/null', ...args],
      { cwd: repo, encoding: 'utf8', timeout: 10000, maxBuffer: 4194304 }).trim();
    git(['init', '--template=', '-b', 'feat/tinyaz-browser-harness']);
    git(['add', '.']);
    git(['-c', 'commit.gpgsign=false', '-c', 'user.name=Operator Control', '-c', 'user.email=control@example.invalid', 'commit', '-m', 'controlled current pins']);
    const candidate = git(['rev-parse', 'HEAD']);
    const shared = await import(sharedURL);
    const graph = await import(moduleURL('separate-verdicts-graph-v3.mjs'));
    const command = await import(moduleURL('separate-verdicts-owned-command-v3.mjs'));
    const template = JSON.parse(fs.readFileSync(path.join(PLAN_SOURCE, 'separate-verdicts-release-v3.template.json')));
    const pythonPath = path.join(SOURCE, 'train/.venv/bin/python');
    const realPython = fs.realpathSync(pythonPath);
    const py = JSON.parse(execFileSync(pythonPath, ['-c',
      'import json,sys;print(json.dumps({"version":".".join(map(str,sys.version_info[:3])),"prefix":sys.prefix,"basePrefix":sys.base_prefix,"executable":sys.executable}))'],
    { encoding: 'utf8', timeout: 10000 }));
    const runtimeIdentity = { node: { invocationPath: process.execPath, realPath: fs.realpathSync(process.execPath),
      sha256: sha(fs.realpathSync(process.execPath)), version: process.version },
    python: { invocationPath: pythonPath, realPath: realPython, sha256: sha(realPython),
      ...py, processImage: { realPath: realPython, sha256: sha(realPython) } } };
    const expected = Object.fromEntries([...names].map((name) => [name, sha(path.join(repo, name))]));
    const safetyPath = path.join(root, 'safety.json');
    write(safetyPath, { head: candidate, branch: template.branch, executionRoot: repo,
      runtimeIdentity, sourceAndTestSha256: expected,
      protectedAndPythonRefsSha256: { 'public/weights/tinyaz-m.bin': expected['public/weights/tinyaz-m.bin'] } });
    const release = { ...template, schemaVersion: 3, status: 'GO', approvedUtc: new Date().toISOString(),
      candidate, repositoryRoot: repo, safetyPath, safetySha256: sha(safetyPath), runtimeIdentity,
      workspaceRoot: path.join(root, `tinyaz-v3-${candidate.slice(0, 7)}-${randomUUID()}`),
      orchestrationRoot: path.join(plan, `task-3-execution-${candidate.slice(0, 7)}-${randomUUID()}`),
      orchestrationScriptsSha256: Object.fromEntries(SCRIPT_NAMES.map((name) => [name, sha(path.join(plan, name))])) };
    const releasePath = path.join(root, 'release.json'); write(releasePath, release);
    let launches = 0;
    const tripwire = ({ phase, release: selected }) => {
      launches += 1; assert.equal(phase, 'check'); assert.deepEqual(selected.evaluationPolicy, shared.POLICY);
      return { launchAdmissionOnly: true };
    };
    let archivedReads = 0, timersCreated = 0;
    const readFileSync = fs.readFileSync, setTimer = globalThis.setTimeout;
    fs.readFileSync = (filename, ...args) => {
      if (String(filename).startsWith(release.workspaceRoot + path.sep)) {
        archivedReads += 1; throw new Error('cold CHECK attempted archive read');
      }
      return readFileSync(filename, ...args);
    };
    globalThis.setTimeout = (...args) => { timersCreated += 1; return setTimer(...args); };
    try {
      assert.equal(shared.assertBootstrapCurrentV3(releasePath).inputsBefore.exact, true);
      await command.runV3Command('check', releasePath, tripwire);
    } finally { fs.readFileSync = readFileSync; globalThis.setTimeout = setTimer; }
    assert.equal(launches, 1); assert.equal(archivedReads, 0); assert.equal(timersCreated, 0);
    for (const occupied of [release.workspaceRoot, release.orchestrationRoot]) {
      for (const kind of ['file', 'directory', 'symlink']) {
        if (kind === 'file') fs.writeFileSync(occupied, 'preserve occupied root');
        else if (kind === 'directory') fs.mkdirSync(occupied);
        else fs.symlinkSync(root, occupied);
        const before = fs.lstatSync(occupied);
        await assert.rejects(command.runV3Command('check', releasePath, tripwire));
        const after = fs.lstatSync(occupied);
        assert.equal(after.ino, before.ino);
        if (kind === 'file') assert.equal(fs.readFileSync(occupied, 'utf8'), 'preserve occupied root');
        if (kind === 'directory') fs.rmdirSync(occupied); else fs.unlinkSync(occupied);
      }
    }
    assert.equal(launches, 1);
    await assert.rejects(graph.openV3ReadOnlyGraphContext({ releasePath, purpose: 'phase-readback' }));
    const fixture = await createV3GraphFixture(local, { gap: true, archived: true, candidate, runtimeIdentity });
    fs.renameSync(fixture.env.workspaceRoot, release.workspaceRoot);
    fixture.env.workspaceRoot = release.workspaceRoot;
    fs.mkdirSync(release.orchestrationRoot);
    write(path.join(release.orchestrationRoot, 'execution.json'), { candidate,
      workspaceRoot: release.workspaceRoot, releaseSha256: sha(releasePath) });
    const loader = path.join(root, 'environment-loader.mjs');
    fs.writeFileSync(loader, `import {registerHooks} from 'node:module';\nimport path from 'node:path';\nconst rewrite=${replacements.toString()};\n` +
      `const plan=${JSON.stringify(plan)},repo=${JSON.stringify(repo)},SOURCE=${JSON.stringify(SOURCE)};\n` +
      `registerHooks({load(url,context,next){const r=next(url,context);return url===${JSON.stringify(sharedURL)}?{...r,source:rewrite(typeof r.source==='string'?r.source:Buffer.from(r.source).toString('utf8'))}:r;}});\n`);
    const released = shared.loadRelease(releasePath);
    for (const phase of ['check', 'parity', 'preflight']) {
      const out = path.join(release.orchestrationRoot, phase); fs.mkdirSync(out);
      const details = { phase, candidate, releaseSha256: released.releaseSha256, workspaceRoot: release.workspaceRoot,
        runtimeIdentity, protocolRef: release.protocolRef, evaluationPolicy: release.evaluationPolicy,
        controlledCommandOnly: true, scientificPhaseLaunched: false };
      const childPath = path.join(PLAN_SOURCE, 'task-3-control-child.mjs');
      const exit = phase === 'preflight' ? 2 : 0;
      const code = `process.argv=[process.execPath,${JSON.stringify(childPath)},'0'];await import(${JSON.stringify(pathToFileURL(childPath).href)});process.exitCode=${exit};`;
      const actual = await ownCommand({ argv: [process.execPath, '--input-type=module', '-e', code],
        cwd: repo, env: { ...process.env }, out, details });
      assert.equal(shared.ownerClosureVerified(actual), true);
      write(path.join(out, 'result.json'), { ...actual, inputHashesExactAfter: true });
      const readbackOut = path.join(out, 'readback'); fs.mkdirSync(readbackOut);
      const verifier = await ownCommand({ argv: [process.execPath, '--import', loader,
        path.join(PLAN_SOURCE, 'separate-verdicts-verify-phase-v3.mjs'), '--verify', phase, releasePath],
      cwd: repo, env: { ...process.env }, out: readbackOut, details });
      assert.equal(shared.ownerClosureVerified(verifier), true);
      assert.equal(verifier.exitCode, 0,
        `actual verifier failure; raw receipt ${path.join(readbackOut, 'owner-receipt.json')}; ` +
        `stderr ${path.join(readbackOut, 'stderr.log')}:\n${fs.readFileSync(path.join(readbackOut, 'stderr.log'), 'utf8')}`);
      write(path.join(out, 'decision.json'), { ...details, operatorExitCode: exit });
    }
    let opened = await graph.openV3ReadOnlyGraphContext({ releasePath, purpose: 'prior-recheck' });
    try {
      for (const phase of ['check', 'parity', 'preflight']) {
        const admitted = await graph.assertPrior(opened.release, phase, opened.context);
        assert.equal(admitted.scientificAdmissible, true);
      }
    } finally { assert.deepEqual(await opened.context.close(), { actualVerifierOwnerSettled: true, budgetDisposed: true }); }
    let compareLaunches = 0;
    await command.runV3Command('compare', releasePath, () => { compareLaunches += 1; });
    assert.equal(compareLaunches, 1);
    const savedPath = path.join(release.orchestrationRoot, 'preflight/verification.json');
    const saved = fs.readFileSync(savedPath);
    const pgn = fixture.preflight.final.summary.gameEvidence.games[0].checkpoint.pgn;
    const selected = path.join(release.workspaceRoot, pgn.path);
    const bytes = fs.readFileSync(selected); bytes[bytes.length - 2] ^= 1; fs.writeFileSync(selected, bytes);
    opened = await graph.openV3ReadOnlyGraphContext({ releasePath, purpose: 'prior-recheck' });
    try { await assert.rejects(graph.assertPrior(opened.release, 'preflight', opened.context)); }
    finally { await opened.context.close(); }
    await assert.rejects(command.runV3Command('compare', releasePath, () => { compareLaunches += 1; }));
    assert.equal(compareLaunches, 1);
    assert.equal(fs.existsSync(path.join(release.orchestrationRoot, 'comparison-claim.json')), false);
    assert.equal(fs.existsSync(path.join(release.orchestrationRoot, 'compare')), false);
    assert.deepEqual(fs.readFileSync(savedPath), saved);
    succeeded = true;
    return { coldCheckLaunchAdmissionOnly: true, occupiedRootsPreserved: true, missingArchiveRejected: true,
      genuineReady2PriorAdmitted: true, freshTamperedPriorRejected: true, noRejectedLaunchClaimOrOverwrite: true,
      controlledEnvironmentBindings: ['repositoryRoot', 'planRoot', 'unchanged installed Python'], scientificPhaseLaunched: false };
  } finally {
    hook.deregister();
    for (const close of teardowns) await close();
    if (succeeded) fs.rmSync(root, { recursive: true, force: true });
    else console.error(JSON.stringify({ retainedV3OwnerControlRoot: root,
      qualification: 'Failed control. Actual raw pipes, owner receipts and journal retained. No phase claim.' }));
  }
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await runV3OwnerControls())); }
  catch (error) { console.error(error.stack ?? String(error)); process.exitCode = 1; }
}
