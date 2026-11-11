// Real temporary Recorder/prepared/publication/recursive admission graphs.
import test from "node:test";
import assert from "node:assert/strict";
import { fstatSync, promises as fs } from "node:fs";
import path from "node:path";
import { verifyReceipt, admitPhase } from "./prerequisites.mjs";
import { collectPreflightEvidenceV3 } from "./preflight-evidence-v3.mjs";
import { phaseArtifactRefs } from "./artifact-store.mjs";
import { parseCanonicalBytes } from "./canonical-json.mjs";
import { assertBudgetHandle, createBudgetHandle } from "./process-budget.mjs";
import { createV3GraphFixture, now } from "./preflight-v3-test-fixtures.mjs";

function reread(f, ...contexts) {
  return verifyReceipt({ workspaceRoot: f.env.workspaceRoot, completionRef: f.preflight.completionRef,
    expectedIdentity: f.workspace.commonIdentity }, f.io, contexts.length ? contexts[0] : f.context);
}

test("genuine timing-failed ready graph publishes, replays and independently admits compare parents", async (t) => {
  const f = await createV3GraphFixture(t);
  assert.equal(f.preflight.final.scientificReadinessVerdict.status, "ready");
  assert.equal(f.preflight.final.exitCode, 2);
  assert.equal(f.preflight.final.resourceVerdict.status, "failed");
  assert.deepEqual((await reread(f)).final, f.preflight.final);
  const probes = [];
  const admitted = await admitPhase({ workspaceRoot: f.env.workspaceRoot, phase: "compare",
    commonIdentity: f.workspace.commonIdentity,
    parents: [f.check, f.parity, f.preflight].map((p) => p.completionRef),
    probeIdentity: async (id) => { probes.push(id); return "gone"; } }, f.io, f.context);
  assert.equal(probes.length, 3);
  assert.equal(admitted.parents.length, 3);
  await assert.rejects(admitPhase({ workspaceRoot: f.env.workspaceRoot, phase: "compare",
    commonIdentity: f.workspace.commonIdentity,
    parents: [f.check, f.parity, f.preflight].map((p) => p.completionRef),
    probeIdentity: async () => "same-live" }, f.io, f.context), /FINALIZER_LIVE/);
});

test("V3 graph rejects missing, spoofed, altered-original and spent verification contexts before IO", async (t) => {
  const f = await createV3GraphFixture(t);
  const noop = { assertLive() {}, deadlineMonoMs: () => Infinity };
  for (const context of [undefined, {}, { budget: noop }, { budget: { ...f.budget } },
    { budget: new Proxy(f.budget, {}) }, { budget: f.budget, extra: true }])
    await assert.rejects(reread(f, context));
  const original = f.budget.assertLive;
  try {
    f.budget.assertLive = () => {};
    assert.throws(() => assertBudgetHandle(f.budget));
    await assert.rejects(reread(f));
  } finally { f.budget.assertLive = original; }
  assert.doesNotThrow(() => assertBudgetHandle(f.budget));
  const spent = createBudgetHandle({ deadlineMonoMs: now() - 1, nowMonoMs: now, clock: { setTimeout, clearTimeout } });
  try { await assert.rejects(reread(f, { budget: spent })); }
  finally { spent.dispose(); }
});

test("bound A/A byte tampering invalidates fresh readback despite earlier ready publication", async (t) => {
  const f = await createV3GraphFixture(t);
  const selected = f.preflight.final.summary.gameEvidence.games[0].checkpoint.pgn;
  const filename = path.join(f.env.workspaceRoot, selected.path);
  const bytes = await fs.readFile(filename);
  await fs.writeFile(filename, Buffer.from(bytes.toString().replace("1/2-1/2", "0-1")));
  await assert.rejects(reread(f));
  assert.equal(f.preflight.final.scientificReadinessVerdict.status, "ready", "saved result is merely prior data");
});

test("fresh collector uses original cutoff across actual reads and awaited PGN replay", async (t) => {
  const f = await createV3GraphFixture(t, { gap: false });
  const inventory = await phaseArtifactRefs({ workspaceRoot: f.env.workspaceRoot, phaseDirectory: "preflight" }, f.io);
  const bytes = await fs.readFile(path.join(f.env.workspaceRoot, "preflight/events.jsonl"));
  const events = bytes.toString().trim().split("\n").map((line) => parseCanonicalBytes(Buffer.from(`${line}\n`)));
  const options = { workspaceRoot: f.env.workspaceRoot, manifest: f.main.manifest, inventory,
    events, summary: f.preflight.final.summary };
  const end = f.budget.deadlineMonoMs();
  const result = await collectPreflightEvidenceV3(options, { io: f.io, budget: f.budget });
  assert(result.checks.every((c) => c.status === "passed"));
  assert.equal(f.budget.deadlineMonoMs(), end);
  const { privateFs } = await import("./private-fs.mjs");
  const open = privateFs.open;
  let release, entered;
  const gate = new Promise((resolve) => { release = resolve; });
  const sawRead = new Promise((resolve) => { entered = resolve; });
  let actualClosed = false, fd;
  privateFs.open = async (...args) => {
    const file = await open(...args);
    if (!String(args[0]).endsWith("preflight-sample-0-candidate-ready.json")) return file;
    fd = file.fd;
    const read = file.read.bind(file), close = file.close.bind(file);
    file.read = async (...readArgs) => { entered(); await gate; return read(...readArgs); };
    file.close = async () => { await close(); actualClosed = true; };
    return file; // Preserve raw stat/read/write/sync/close for real OwnedFile adoption.
  };
  let settled = false;
  const pending = collectPreflightEvidenceV3(options, { io: f.io, budget: f.budget })
    .then(() => { settled = true; throw new Error("expired read accepted"); }, (error) => { settled = true; return error; });
  let setupTimer;
  try {
    await Promise.race([sawRead, pending.then(error => { throw error; }),
      new Promise((_, reject) => { setupTimer = setTimeout(() => reject(new Error("held read not reached")), 5000); })]);
    clearTimeout(setupTimer);
    f.budget.narrow(now());
    await new Promise(setImmediate);
    assert.equal(settled, false);
    assert.equal(actualClosed, false);
    assert.equal(fstatSync(fd).isFile(), true);
    release();
    const error = await pending;
    assert.match(error.message, /ACCOUNTING_UNAVAILABLE/);
    assert.equal(actualClosed, true);
    assert.throws(() => fstatSync(fd), { code: "EBADF" });
    assert.equal(f.budget.deadlineMonoMs() <= end, true);
  } finally { clearTimeout(setupTimer); release(); privateFs.open = open; await pending; }
});

test("actual full40 compiler and paired-analysis accept science while retaining failed parent resources", async (t) => {
  const { completeCompareFixture } = await import("./preflight-v3-test-fixtures.mjs");
  const f = await createV3GraphFixture(t);
  const comparison = await completeCompareFixture(f);
  assert.equal(comparison.final.strengthVerdict.completedGames, 40);
  assert.equal(comparison.final.strengthVerdict.completedPairs, 20);
  assert.equal(comparison.final.strengthVerdict.status, "eligible");
  assert.equal(comparison.final.summary.pairedAnalysis.analysisEligible, true);
  assert.equal(comparison.final.resourceVerdict.status, "passed");
  assert.equal(comparison.final.closureResourceVerdict.status, "failed");
  assert.equal(comparison.final.exitCode, 2);
  assert.deepEqual(comparison.final.closureResourceVerdict.reasons, ["COVERAGE_GAP", "PREREQUISITE_RESOURCE_FAILURE"]);
});

test("proven independent semantic science failure remains failed1 despite passed producer claims", async (t) => {
  const f = await createV3GraphFixture(t, { semanticThroughputFailure: true });
  const final = f.preflight.final;
  assert.equal(final.summary.supervisorOutcome.status, "passed");
  assert(final.summary.supervisorOutcome.checkClaims.every((check) => check.status === "passed"));
  assert.equal(final.requiredChecks.find((check) => check.id === "timing-estimate").status, "failed");
  assert.equal(final.scientificReadinessVerdict.status, "unready");
  assert.equal(final.status, "failed");
  assert.equal(final.exitCode, 1);
  assert(final.scientificReadinessVerdict.reasons.includes("SCIENTIFIC_CHECK_UNPROVEN"));
  assert(final.scientificReadinessVerdict.reasons.includes("HARD_STOP"));
  assert.equal(final.scientificReadinessVerdict.reasons.includes("RECORDS_UNPROVEN"), false);
  assert.deepEqual((await reread(f)).final, final);
});

test("new compiler/classifier/scope arguments reject extra, missing and mistyped fields", async (t) => {
  const { compilerInputForFixture } = await import("./preflight-v3-test-fixtures.mjs");
  const { compileFinalV3 } = await import("./record-finalization-v3.mjs");
  const { classifyVerifiedParentV3 } = await import("./preflight-readiness-v3.mjs");
  const { createPreflightQualityScope } = await import("./process-preflight-quality.mjs");
  const { V3_POLICY } = await import("./evaluation-policy.mjs");
  const f = await createV3GraphFixture(t);
  const input = await compilerInputForFixture(f);
  assert.deepEqual(compileFinalV3(input).final, f.preflight.final);
  assert.throws(() => compileFinalV3({ ...input, bypass: true }));
  for (const key of Object.keys(input)) {
    const missing = { ...input }; delete missing[key];
    assert.throws(() => compileFinalV3(missing), undefined, key);
    assert.throws(() => compileFinalV3({ ...input, [key]: "invalid" }), undefined, key);
  }
  const classifier = { forPhase: "compare", expectedIdentity: f.workspace.commonIdentity, evidence: f.preflight };
  assert.throws(() => classifyVerifiedParentV3({ ...classifier, bypass: true }));
  assert.throws(() => classifyVerifiedParentV3({ expectedIdentity: f.workspace.commonIdentity, evidence: f.preflight }));
  assert.throws(() => createPreflightQualityScope({ runId: "R1", phase: "preflight", evaluationPolicy: V3_POLICY, open: true }));
  assert.throws(() => createPreflightQualityScope({ runId: "R1", evaluationPolicy: V3_POLICY }));
});

test("actual producer seal stops at fixed B after held metadata without new open/read/replay", async () => {
  const root = path.resolve(import.meta.dirname);
  const code = `
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {pathToFileURL} from "node:url";
const root=${JSON.stringify(root)}, state={budget:null};globalThis.__heldReceipt=state;
const hook=registerHooks({load(url,ctx,next){
 const result=next(url,ctx);
 if(url!==pathToFileURL(root+"/record-finalizer.mjs").href)return result;
 const source=(typeof result.source==="string"?result.source:Buffer.from(result.source).toString()), needle="const sealBody = async (sealed) => {";
 assert(source.includes(needle));return {...result,source:source.replace(needle,
  needle+"\\n globalThis.__heldReceipt.budget=verificationContext?.budget;")};
}});
const closes=[],load=name=>import(pathToFileURL(root+"/"+name+".mjs").href);
let originalStat,originalOpen,privateFs;
try{
 const {createV3GraphFixture,now}=await load("preflight-v3-test-fixtures");
 ({privateFs}=await load("private-fs"));originalStat=privateFs.lstat;originalOpen=privateFs.open;
 let clock=now(),opens=0,held=0,workspaceRoot,firstEnd;
 await assert.rejects(createV3GraphFixture({after:fn=>closes.push(fn)},{recorderNow:()=>clock,
  beforePreflightSeal:async({env})=>{
   workspaceRoot=env.workspaceRoot;
   privateFs.open=(...args)=>{opens+=1;return originalOpen(...args)};
   privateFs.lstat=async(...args)=>{
    const value=await originalStat(...args);
    if(!held&&args[0]===workspaceRoot+"/preflight"){
     held+=1;firstEnd=state.budget.deadlineMonoMs();clock=firstEnd;
    }
    return value;
   };
  }}),/ACCOUNTING_UNAVAILABLE/);
 assert.equal(held,1);assert.equal(opens,0,"spent metadata cannot admit open/read/replay");
 assert.equal(state.budget.deadlineMonoMs(),firstEnd,"original B end remains fixed");
 const {promises:fs}=await import("node:fs");
 for(const name of ["final.json","completion.json"])
  await assert.rejects(fs.stat(workspaceRoot+"/preflight/"+name),{code:"ENOENT"});
}finally{
 if(privateFs){privateFs.lstat=originalStat;privateFs.open=originalOpen;}
 for(const close of closes)await close();hook.deregister();delete globalThis.__heldReceipt;
}
`;
  const result = await child(process.execPath, ["--input-type=module", "-e", code]);
  assert.equal(result.exit, 0, result.stderr);
});

import { child } from "./separate-verdicts-compat-fixtures.mjs";
import { pathToFileURL } from "node:url";
test("actual producer/prepared/publication/recursive paths keep outer context and one original collector carrier", async () => {
  const root = path.resolve(import.meta.dirname);
  const code = `
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {pathToFileURL} from "node:url";
const root=${JSON.stringify(root)};
const trace={seals:[],prepared:[],associations:[],publishes:[],graphs:[],collections:[],reads:[]};
globalThis.__tinyazV3ContextTrace=trace;
const mark="globalThis.__tinyazV3ContextTrace";
const edits={
 "record-finalizer.mjs":[["const sealBody = async (sealed) => {", "const sealBody = async (sealed) => {\\n"+mark+".seals.push({context:verificationContext,io,runId:mf.runId,cutoff:verificationContext?.budget.deadlineMonoMs()});"]],
 "receipt-verification.mjs":[
  ["export async function verifyPreparedReceiptGraph({ preparedCompletion, expectedIdentity }, verificationContext) {", "export async function verifyPreparedReceiptGraph({ preparedCompletion, expectedIdentity }, verificationContext) {\\n"+mark+".prepared.push(verificationContext);"],
  ["entry.consumed = true;", "entry.consumed = true;\\n"+mark+".associations.push(entry.verificationContext);"],
  ["export async function verifyReceiptGraph({ workspaceRoot, completionRef, expectedIdentity }, memo, io, verificationContext) {", "export async function verifyReceiptGraph({ workspaceRoot, completionRef, expectedIdentity }, memo, io, verificationContext) {\\n"+mark+".graphs.push({context:verificationContext,io,path:completionRef.path});"]],
 "completion-publication.mjs":[["export async function publishCompletionFile(prepared, storeOwner, verificationContext) {", "export async function publishCompletionFile(prepared, storeOwner, verificationContext) {\\n"+mark+".publishes.push(verificationContext);"]],
 "preflight-evidence-v3.mjs":[["const verificationContext = Object.freeze({ budget });", "const verificationContext = Object.freeze({ budget });\\n"+mark+".collections.push({view:verificationContext,budget,io});"]],
 "receipt-files.mjs":[["export const confinedRead = async (root, rel, name, io, context) => {", "export const confinedRead = async (root, rel, name, io, context) => {\\n"+mark+".reads.push({context,io,rel});"]]
};
const hooked=new Set();
const hook=registerHooks({load(url,context,next){
 const result=next(url,context);
 for(const [name,pairs] of Object.entries(edits)){
  if(url!==pathToFileURL(root+"/"+name).href)continue;
  let source=typeof result.source==="string"?result.source:Buffer.from(result.source).toString("utf8");
  for(const [needle,replacement] of pairs){
   assert(source.includes(needle),name+" observational hook drift");
   source=source.replace(needle,replacement);
  }
  hooked.add(name);
  return {...result,source};
 }
 return result;
}});
const closes=[];
try{
 const {createV3GraphFixture}=await import(pathToFileURL(root+"/preflight-v3-test-fixtures.mjs").href);
 const f=await createV3GraphFixture({after:fn=>closes.push(fn)});
 assert.equal(f.preflight.final.scientificReadinessVerdict.status,"ready");
 assert.equal(hooked.size,Object.keys(edits).length);
 assert.equal(trace.seals.length,4);
 const contexts=new Set(trace.seals.map(row=>row.context));
 for(const list of [trace.prepared,trace.associations,trace.publishes]){
  assert.equal(list.length,4);
  for(const context of list)assert(contexts.has(context));
 }
 for(const row of trace.seals)assert.equal(row.context.budget.deadlineMonoMs(),row.cutoff);
 for(const row of trace.graphs)assert(contexts.has(row.context)||row.context===f.context);
 assert(trace.collections.length>=4);
 for(const collection of trace.collections){
  assert(Object.isFrozen(collection.view));
  assert.deepEqual(Object.keys(collection.view),["budget"]);
  assert.equal(collection.view.budget,collection.budget);
  assert(contexts.has(trace.seals.find(row=>row.context.budget===collection.budget)?.context)||collection.budget===f.budget);
  const reads=trace.reads.filter(row=>row.context===collection.view);
  assert.equal(reads.length,23);
  for(const read of reads)assert.equal(read.io,collection.io);
 }
 console.log(JSON.stringify({originalOuterContexts:true,stableProjectedCarrier:true,
  originalHandleAndIo:true,preparedAndPostpublication:true,collectors:trace.collections.length}));
}finally{
 for(const close of closes)await close();
 hook.deregister();
 delete globalThis.__tinyazV3ContextTrace;
}
`;
  const result = await child(process.execPath, ["--input-type=module", "-e", code]);
  assert.equal(result.exit, 0, result.stderr);
  const evidence = JSON.parse(result.stdout.trim());
  assert.equal(evidence.originalOuterContexts, true);
  assert.equal(evidence.stableProjectedCarrier, true);
  assert.equal(evidence.originalHandleAndIo, true);
  assert.equal(evidence.preparedAndPostpublication, true);
  assert(evidence.collectors >= 4);
});


import { readVerdictEventsV2 } from "./receipt-verification-v2.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";

test("review regression: event read stops at original-budget metadata expiry with registrar-only IO", async (t) => {
  const f = await createV3GraphFixture(t);
  const { privateFs } = await import("./private-fs.mjs");
  const lstat = privateFs.lstat, open = privateFs.open;
  const lifetime = createWatchdogLifetime(), io = Object.freeze({ retainActual: lifetime.retainActual });
  let clock = now(), release, entered, held = 0, opens = 0, reads = 0, settled = false, drained = false;
  const budget = createBudgetHandle({ deadlineMonoMs: clock + 90000, nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
  const end = budget.deadlineMonoMs(), context = { budget };
  const gate = new Promise(resolve => { release = resolve; });
  const sawMetadata = new Promise(resolve => { entered = resolve; });
  privateFs.lstat = async (...args) => {
    const value = await lstat(...args);
    if (!held && args[0] === path.join(f.env.workspaceRoot, "preflight")) {
      held += 1; entered(); await gate;
    }
    return value;
  };
  privateFs.open = async (...args) => {
    opens += 1;
    const file = await open(...args), read = file.read.bind(file);
    file.read = (...values) => { reads += 1; return read(...values); };
    return file;
  };
  const pending = readVerdictEventsV2({ workspaceRoot: f.env.workspaceRoot,
    eventsRef: f.preflight.final.resourceVerdict.resourceEvidenceRefs[0], headFields: f.preflight.final }, io, context)
    .then(value => ({ value }), error => ({ error })).finally(() => { settled = true; });
  let timer;
  try {
    await Promise.race([sawMetadata, pending.then(() => assert.fail("metadata hold not reached")),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("metadata setup timeout")), 5000); })]);
    clearTimeout(timer);
    lifetime.whenSettled().then(() => { drained = true; });
    clock = end;
    await new Promise(setImmediate);
    assert.equal(settled, false);
    assert.equal(drained, false, "actual metadata remains owned until delivered");
    release();
    const result = await pending;
    await lifetime.whenSettled();
    assert.match(result.error?.message ?? "accepted", /ACCOUNTING_UNAVAILABLE/);
    assert.equal(held, 1);
    assert.equal(opens, 0, "spent original metadata cannot issue file open");
    assert.equal(reads, 0, "spent original metadata cannot issue file read");
    assert.equal(context.budget, budget);
    assert.equal(budget.deadlineMonoMs(), end);
  } finally {
    clearTimeout(timer); release(); await pending;
    privateFs.lstat = lstat; privateFs.open = open;
    await lifetime.whenSettled(); budget.dispose();
  }
});

for (const held of [false, true]) {
  test(`review regression: ${held ? "held metadata" : "reused context"} rejects replacement genuine budget`, async (t) => {
    const f = await createV3GraphFixture(t), { privateFs } = await import("./private-fs.mjs");
    let clock = now(), opens = 0, metadata = 0;
    const original = createBudgetHandle({ deadlineMonoMs: clock + 90000, nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
    const later = createBudgetHandle({ deadlineMonoMs: clock + 180000, nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
    const context = { budget: original }, lstat = privateFs.lstat, open = privateFs.open;
    const io = Object.freeze({ retainActual: f.io.retainActual });
    try {
      if (!held) {
        await verifyReceipt({ workspaceRoot: f.env.workspaceRoot, completionRef: f.preflight.completionRef,
          expectedIdentity: f.workspace.commonIdentity }, io, context);
        clock = original.deadlineMonoMs(); context.budget = later;
      } else privateFs.lstat = async (...args) => {
        const value = await lstat(...args);
        if (!metadata) {
          metadata += 1; await new Promise(setImmediate);
          clock = original.deadlineMonoMs(); context.budget = later;
        }
        return value;
      };
      privateFs.open = (...args) => { opens += 1; return open(...args); };
      await assert.rejects(verifyReceipt({ workspaceRoot: f.env.workspaceRoot,
        completionRef: f.preflight.completionRef, expectedIdentity: f.workspace.commonIdentity }, io, context));
      assert.equal(opens, 0, "replacement cannot admit an open after original expiry");
      assert.equal(context.budget, later, "caller wrapper remains mutable and unchanged by verifier");
      if (held) assert.equal(metadata, 1);
    } finally { privateFs.lstat = lstat; privateFs.open = open; original.dispose(); later.dispose(); }
  });
}
