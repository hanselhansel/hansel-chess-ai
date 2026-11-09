// TEST ONLY. Actual child/Git/file ownership; synthetic environment acquisition.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { fixtureCommonIdentity } from "./test-fixtures.mjs";
import { RUNTIME_PATHS } from "./snapshot-files.mjs";
import { PYTHON_MODULES } from "./schema-constants.mjs";
const SOURCE = path.resolve(import.meta.dirname,"../../..");
let childCount = 0;
export async function child(executable,args) {
  const p=spawn(executable,args,{stdio:["ignore","pipe","pipe"]}); const chunks=[[],[]];
  const eof=[false,false];let exit=null;
  for(const [i,stream]of[p.stdout,p.stderr].entries()){stream.on("data",b=>chunks[i].push(b));stream.on("end",()=>{eof[i]=true;});}
  await new Promise((resolve,reject)=>{p.on("error",reject);p.on("exit",code=>{exit=code;});p.on("close",resolve);});
  assert.deepEqual(eof,[true,true]);assert.notEqual(exit,null);
  if (process.env.TINYAZ_COMPAT_EVIDENCE_ROOT) {
    const prefix = path.join(process.env.TINYAZ_COMPAT_EVIDENCE_ROOT, `child-${process.pid}-${++childCount}`);
    const {sha256Bytes} = await import("./canonical-json.mjs");
    const raw = {};
    for (const [i,name] of ["stdout","stderr"].entries()) {
      const bytes = Buffer.concat(chunks[i]);
      const file = await fs.open(`${prefix}.${name}`,"wx");
      try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
      raw[name] = {bytes:bytes.length,sha256:sha256Bytes(bytes)};
    }
    await fs.writeFile(`${prefix}.json`,JSON.stringify({argv:[executable,...args],pid:p.pid,
      exitCode:exit,processWaited:true,stdoutEOF:eof[0],stderrEOF:eof[1],rawFilesClosed:true,
      rawFilesFsynced:true,raw})+"\n",{flag:"wx"});
  }
  return {exit,stdout:Buffer.concat(chunks[0]).toString(),stderr:Buffer.concat(chunks[1]).toString()};
}
// Only environment acquisition is controlled. Archived snapshot/Git/identity
// owners execute unchanged in independent processes; this is not Native proof.
export async function snapshotChild(mode, workspaceRoot, protocolPath, extra = {}, repoRoot = SOURCE) {
  const moduleRoot = mode === "capture" ? repoRoot : path.join(workspaceRoot,"inputs/harness");
  const setupNames = ["python-audit-summary.json","python-pip-check.txt","python-pip-freeze.txt",
    "environment-static.json","hardware-model.txt","node-build-inventory.json",
    "chromium-build-inventory.json","python-build-inventory.json"];
  const fixtureEnvironment = fixtureCommonIdentity().environment;
  const declarations = `const environment=${JSON.stringify(fixtureEnvironment)};
    const setupFiles=${JSON.stringify(setupNames)}.map(name=>({path:"inputs/setup/"+name,bytes:Buffer.from("controlled "+name+"\\n")}));`;
  const code = `
    import {registerHooks} from "node:module";
    import {pathToFileURL} from "node:url";
    ${declarations}
    const moduleRoot=${JSON.stringify(moduleRoot)};
    const environmentURL=pathToFileURL(moduleRoot+"/train/scripts/browser_eval/environment.mjs").href;
    registerHooks({load(url,context,next){
      if(url===environmentURL)return{format:"module",shortCircuit:true,source:
        ${JSON.stringify(declarations)}+"export async function captureEnvironment(){return {environment,setupFiles};}"+
        "export async function verifyEnvironment(){return environment;}"};
      return next(url,context);
    }});
    const load=name=>import(pathToFileURL(moduleRoot+"/train/scripts/browser_eval/"+name+".mjs"));
    const {captureInputs,reopenInputs,verifyIdentity}=await load("snapshots");
    const {createWatchdogLifetime}=await load("watchdog-lifetime");
    const {createBudgetHandle}=await load("process-budget");
    const lifetime=createWatchdogLifetime();
    const now=()=>Number(process.hrtime.bigint()/1000000n);
    const budget=createBudgetHandle({deadlineMonoMs:now()+90000,nowMonoMs:now,clock:{setTimeout,clearTimeout}});
    try{
      const options=${JSON.stringify({workspaceRoot,candidate:"WORKTREE",...(protocolPath===undefined?{}:{protocolPath}),...extra})};
      const context={repoRoot:${JSON.stringify(repoRoot)},budget,lifetime};
      const result=${mode === "capture" ? `await captureInputs({...options,environment,setupFiles},context)` : `await reopenInputs(options,context)`};
      if(${JSON.stringify(mode)}==="capture"){
        const {fixtureManifest}=await import(${JSON.stringify(pathToFileURL(path.join(SOURCE,"train/scripts/browser_eval/test-fixtures.mjs")).href)});
        const {canonicalBytes}=await load("canonical-json");
        const fs=await import("node:fs/promises");
        const workspace=result.workspace;
        const manifest={...fixtureManifest({workspace,inputs:result.inputs}),schemaVersion:workspace.schemaVersion,
          ...(workspace.schemaVersion===2?{evaluationPolicy:workspace.commonIdentity.evaluationPolicy}:{})};
        await fs.mkdir(options.workspaceRoot+"/check");
        await fs.writeFile(options.workspaceRoot+"/check/manifest.json",canonicalBytes(manifest));
        const measured=await verifyIdentity({workspaceId:workspace.workspaceId,runId:manifest.runId,phase:"check",
          expectedCommonIdentity:workspace.commonIdentity,inputs:result.inputs},
          {workspaceRoot:options.workspaceRoot,budget,lifetime});
        if(!canonicalBytes(measured).equals(canonicalBytes(workspace.commonIdentity)))throw Error("final measurement mismatch");
      }
      console.log(JSON.stringify(result.workspace));
    }finally{budget.dispose();await lifetime.whenSettled();}
  `;
  return child(process.execPath,["--input-type=module","-e",code]);
}
export async function writableRemove(root) {
  const visit = async directory => {
    await fs.chmod(directory,0o755);
    for (const entry of await fs.readdir(directory,{withFileTypes:true})) {
      if (entry.isDirectory()&&!entry.isSymbolicLink()) await visit(path.join(directory,entry.name));
    }
  };
  await visit(root); await fs.rm(root,{recursive:true});
}

export async function createCompatRepo(root) {
  const repoRoot = path.join(root,"repo");
  const sources = [];
  const walk = async directory => {
    for (const row of await fs.readdir(path.join(SOURCE,directory),{withFileTypes:true})) {
      const name = `${directory}/${row.name}`;
      if (row.isDirectory()) await walk(name);
      else { assert.equal(row.isFile(),true); sources.push(name); }
    }
  };
  await walk("src");
  const names = new Set([...sources,...RUNTIME_PATHS,...PYTHON_MODULES,
    "public/weights/tinyaz-m.bin","public/weights/tinyaz-m.meta.json","train/requirements-verify.txt"]);
  for (const name of names) {
    const target = path.join(repoRoot,name);
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(path.join(SOURCE,name),target);
  }
  const initialized = await child("/usr/bin/git",["-c","core.hooksPath=/dev/null","init",
    "--template=","-b","feat/compat-data",repoRoot]);
  assert.equal(initialized.exit,0,initialized.stderr);
  await fs.writeFile(path.join(repoRoot,".git/objects/info/alternates"),
    `${await fs.realpath(path.join(SOURCE,".git/objects"))}\n`);
  await fs.symlink(await fs.realpath(path.join(SOURCE,"node_modules")),path.join(repoRoot,"node_modules"));
  return repoRoot;
}

// Task10: real graph owners, explicitly synthetic science/environment/context.
import { createV2RecorderWorkspace, v2Workspace, quality } from './separate-verdicts-test-fixtures.mjs';
import { createPhaseRecorder } from './records.mjs';
import { verifyReceipt } from './prerequisites.mjs';
import { fixtureManifest, fixtureRunning, identity, proof } from './test-fixtures.mjs';
import { canonicalBytes, sha256Bytes } from './canonical-json.mjs';
import { V2_POLICY } from './evaluation-policy.mjs';
export async function operatorGraph(t, { gap = true, operator }) {
  const archivedFiles = await Promise.all(RUNTIME_PATHS.map(async name =>
    ({ path: name, bytes: await fs.readFile(path.join(SOURCE, name)) })));
  const workspace = v2Workspace();
  const protocol = archivedFiles.find(file => file.path === operator.PROTOCOL);
  workspace.commonIdentity.fixtures.protocol = { path: protocol.path,
    byteLength: protocol.bytes.length, sha256: sha256Bytes(protocol.bytes) };
  const env = await createV2RecorderWorkspace(t, { workspace, archivedFiles });
  const start = async (phase, parents = [], options = {}) => {
    const runId = options.owner ? `${options.owner.runId}:watchdog-selftest` : `run-${phase}`;
    const manifest = { ...fixtureManifest({ workspace, inputs: env.inputs, phase, runId,
      owner: options.owner ?? null, prerequisites: parents.map(p =>
        ({ phase: p.phase, runId: p.runId, completion: p.completionRef })) }),
      schemaVersion: 2, evaluationPolicy: V2_POLICY };
    const recorder = createPhaseRecorder({ store: env.store, workspace, manifest,
      verifyIdentity: async () => workspace.commonIdentity,
      verifyCleanup: async ({ claimedProof }) => proof(claimedProof.scope, claimedProof.expectedFinalizer) });
    env.recorders.push(recorder);
    await recorder.writeManifest();
    await recorder.writeRunning({ ...fixtureRunning({ manifest }), schemaVersion: 2 });
    const selftest = phase === 'watchdog-selftest';
    const intent = { status: selftest ? 'inconclusive' : 'passed', exitCode: selftest ? 2 : 0,
      stopReason: selftest ? 'HEARTBEAT_TIMEOUT' : null, unplannedFaultCount: 0,
      analysisEligible: false, summary: selftest ? { scoredGames: 0 } : {},
      resourceEvidence: quality({ phase, runId, gap: phase === 'compare' && gap }) };
    const checks = selftest ? [] : manifest.requiredCheckIds.filter(id => id !== 'cleanup')
      .map(id => ({ id, status: 'passed', evidencePaths: [] }));
    const finish = async () => {
      const completionRef = await recorder.finalize({ intent, checks,
        prerequisites: manifest.prerequisites, expectedSelfTest: options.expectedSelfTest ?? null });
      return verifyReceipt({ workspaceRoot: env.workspaceRoot, completionRef,
        expectedIdentity: workspace.commonIdentity });
    };
    return { recorder, checks, intent, finish };
  };
  const check = await (await start('check')).finish();
  const parity = await (await start('parity', [check])).finish();
  const owner = { phase: 'preflight', runId: 'run-preflight', supervisor: identity() };
  const nested = await (await start('watchdog-selftest', [], { owner })).finish();
  const preflight = await (await start('preflight', [check, parity], {
    expectedSelfTest: { completion: nested.completionRef, expectedStopReason: 'HEARTBEAT_TIMEOUT' } })).finish();
  const f = await start('compare', [check, parity, preflight]);
  const evidence = await env.store.writeOnce('compare/science.json', canonicalBytes({ synthetic: true }), 'ordinary');
  for (const check of f.checks) check.evidencePaths = [evidence.path];
  const games = [];
  for (let index = 0; index < 40; index += 1) {
    const pairNumber = Math.floor(index / 2) + 1;
    const gameNumber = index % 2 + 1;
    const openingId = `p${String(pairNumber).padStart(2, '0')}`;
    const gameId = `${openingId}-g${gameNumber}`;
    const pgn = await f.recorder.appendArtifactChunk({ recordId: gameId, recordSeq: index,
      artifactId: gameId, path: `compare/games/${gameId}.a.pgn`, mode: 'append',
      bytes: Buffer.from(`synthetic terminal fixture ${gameId}`), last: true });
    const fields = { gameId, pairNumber, gameNumber, openingId,
      candidateColor: (pairNumber % 2 === 1) === (gameNumber === 1) ? 'white' : 'black', result: '1/2-1/2' };
    const checkpoint = { checkpointId: `${gameId}-c2`, ordinal: 2, slot: 'a', plyCount: 8,
      initialFen: 'synthetic initial', fen: 'synthetic terminal', pgn };
    games.push({ ...fields, state: 'complete', stopReason: null, checkpoint });
    await f.recorder.appendEvent({ kind: 'response', payload: { recordType: 'pgn-checkpoint', ...fields, ...checkpoint } });
  }
  f.intent.summary.gameEvidence = { schemaVersion: 1, frozen: true, firstStopReason: null,
    freezeAtMonoNs: '10', games, diagnostics: [] };
  const verified = await f.finish();
  return { env, workspace, archivedFiles, verified };
}

export async function operatorReadbackFixture(t, { gap = true, operator, controlRoot }) {
  assert.equal(typeof controlRoot, 'string');
  const graph = await operatorGraph(t, { gap, operator });
  const actualRoot = controlRoot;
  const actualCase = gap ? 'exit2' : 'normal';
  const owner = JSON.parse(await fs.readFile(path.join(actualRoot, actualCase, 'owner-receipt.json')));
  assert.equal(operator.ownerClosureVerified(owner), true);
  assert.equal(owner.exitCode, graph.verified.final.exitCode);
  const root = await fs.realpath(await fs.mkdtemp(path.join(path.dirname(graph.env.workspaceRoot), 'operator-readback-')));
  t.after(() => fs.rm(root, { recursive: true }));
  await fs.mkdir(path.join(root, 'compare'));
  await fs.copyFile(path.join(actualRoot, actualCase, 'owner-events.jsonl'),
    path.join(root, 'compare/owner-events.jsonl'));
  for (const name of ['stdout', 'stderr'])
    await fs.copyFile(path.join(actualRoot, actualCase, `${name}.log`), path.join(root, 'compare', `${name}.log`));
  const id = graph.workspace.commonIdentity;
  const release = { candidate: id.candidate.commit, releaseSha256: 'a'.repeat(64),
    workspaceRoot: graph.env.workspaceRoot, orchestrationRoot: root,
    protocolRef: id.fixtures.protocol, runtimeIdentity: { node: id.environment.node, python: id.environment.python.runtime },
    constraints: { baselineCommit: id.baseline.commit, modelBytes: id.model.byteLength, modelSha256: id.model.sha256 },
    expected: Object.fromEntries(graph.archivedFiles.map(file => [file.path, sha256Bytes(file.bytes)])) };
  // Only graph-binding context is synthetic. Actual owner exit/pipes/errors stay exact.
  const command = { ...owner, candidate: release.candidate, releaseSha256: release.releaseSha256,
    workspaceRoot: release.workspaceRoot, runtimeIdentity: release.runtimeIdentity,
    protocolRef: release.protocolRef, evaluationPolicy: V2_POLICY, inputHashesExactAfter: true };
  const verifierOwner = JSON.parse(await fs.readFile(path.join(actualRoot, 'normal/owner-receipt.json')));
  await fs.writeFile(path.join(root, 'synthetic-context.json'), JSON.stringify({
    syntheticOverlayFields: ['candidate', 'releaseSha256', 'workspaceRoot', 'runtimeIdentity',
      'protocolRef', 'evaluationPolicy', 'inputHashesExactAfter'],
    originalOwnerReceipt: { path: path.join(actualRoot, actualCase, 'owner-receipt.json'),
      sha256: sha256Bytes(await fs.readFile(path.join(actualRoot, actualCase, 'owner-receipt.json'))) },
    verifierOwnerQualification: 'Actual exit0 control receipt composed with actual in-process graph readback. No verifier process launch claimed.',
    command, release }, null, 2) + '\n', { flag: 'wx' });
  return { ...graph, release, command, owner, verifierOwner };
}
