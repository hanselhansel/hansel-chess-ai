// Actual coordinator/readback owner controls run in an isolated subprocess.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { child } from "./separate-verdicts-compat-fixtures.mjs";

const SOURCE = path.resolve(import.meta.dirname, "../../..");
const W = path.join(SOURCE, ".superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison");
test("V3 terminal cold CHECK and fresh awaited ready2 parent tamper controls", { timeout: 180000 }, async () => {
  const result = await child(process.execPath, [path.join(W, "separate-verdicts-owner-controls-v3.mjs")]);
  assert.equal(result.exit, 0, result.stderr);
  const report = JSON.parse(result.stdout.trim().split("\n").at(-1));
  for (const key of ["coldCheckLaunchAdmissionOnly", "occupiedRootsPreserved", "missingArchiveRejected",
    "genuineReady2PriorAdmitted", "freshTamperedPriorRejected", "noRejectedLaunchClaimOrOverwrite"])
    assert.equal(report[key], true, key);
  assert.equal(report.scientificPhaseLaunched, false);
});


import { promises as fsp, fstatSync } from "node:fs";
import { createV3GraphFixture } from "./preflight-v3-test-fixtures.mjs";
import { createV2RecorderWorkspace } from "./separate-verdicts-test-fixtures.mjs";
import { verifyPreparedReceiptGraph } from "./receipt-verification.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { readPreparedCompletion } from "./completion-publication.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
for (const mode of ["token-swap", "held-prepared", "held-publication", "held-prepared-swap"]) {
  test(`review regression: ${mode} preserves original prepared-read budget`, async (t) => {
    const source = await createV3GraphFixture(t), dest = await createV2RecorderWorkspace(t, { workspace: source.workspace });
    const phase = path.join(source.env.workspaceRoot, "check");
    for (const entry of await fsp.readdir(phase, { withFileTypes: true })) {
      assert.equal(entry.isFile(), true);
      if (entry.name !== "completion.json")
        await dest.store.writeOnce(`check/${entry.name}`, await fsp.readFile(path.join(phase, entry.name)), "final");
    }
    const prepared = await dest.store.prepareCompletion({ phaseDirectory: "check",
      bytes: await fsp.readFile(path.join(phase, "completion.json")) });
    let clock = Number(process.hrtime.bigint() / 1000000n), published = false;
    const original = createBudgetHandle({ deadlineMonoMs: clock + 90000, nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
    const later = createBudgetHandle({ deadlineMonoMs: clock + 180000, nowMonoMs: () => clock, clock: { setTimeout, clearTimeout } });
    const context = { budget: original }, { privateFs } = await import("./private-fs.mjs");
    const lstat = privateFs.lstat, open = privateFs.open;
    const pinned = await readPreparedCompletion(prepared);
    const temp = path.join(dest.workspaceRoot, pinned.temporaryRef.path);
    let metadata = 0, opens = 0, reads = 0, containment = false, cleanupOpens = 0, cleanupReads = 0;
    const descriptors = new Set(), canonical = path.join(dest.workspaceRoot, "check/completion.json");
    const hold = () => {
      privateFs.lstat = async (...args) => {
        // The issued canonical absence check may reject ENOENT. It enters
        // retainFailedCompletion before observeFailedCompletionFile.
        if (mode === "held-publication" && metadata && args[0] === canonical) containment = true;
        const value = await lstat(...args);
        if (args[0] === temp && !metadata) {
          metadata += 1; await new Promise(setImmediate); clock = original.deadlineMonoMs();
          if (mode === "held-prepared-swap") context.budget = later;
        }
        return value;
      };
      privateFs.open = async (...args) => {
        const file = await open(...args);
        if (args[0] !== temp || !metadata) return file;
        const cleanup = containment, fd = file.fd, read = file.read.bind(file), close = file.close.bind(file);
        if (cleanup) cleanupOpens += 1; else opens += 1;
        descriptors.add(fd);
        file.read = (...values) => { if (cleanup) cleanupReads += 1; else reads += 1; return read(...values); };
        file.close = async () => {
          await close(); descriptors.delete(fd); assert.throws(() => fstatSync(fd), { code: "EBADF" });
        };
        return file;
      };
    };
    try {
      if (mode.startsWith("held-prepared")) {
        hold();
        await assert.rejects(verifyPreparedReceiptGraph({ preparedCompletion: prepared,
          expectedIdentity: source.workspace.commonIdentity }, context));
      } else {
        const token = await verifyPreparedReceiptGraph({ preparedCompletion: prepared,
          expectedIdentity: source.workspace.commonIdentity }, context);
        if (mode === "token-swap") { clock = original.deadlineMonoMs(); context.budget = later; }
        else hold();
        const operation = dest.store.publishPreparedCompletion(prepared, token).then(result => { published = true; return result; });
        await assert.rejects(operation);
      }
      if (mode === "held-publication") await artifactStoreLifetime(dest.store).whenSettled();
      assert.equal(descriptors.size, 0, "every actual adopted reader is physically closed");
      if (mode === "held-publication") {
        assert.equal(containment, true);
        assert(cleanupOpens > 0 && cleanupReads > 0, "required failed-temp observation runs after expiry");
        const retained = await dest.store.containPreparedCompletion(prepared, new Error("verify actual containment"));
        assert.equal(retained.failedTemporaryPath, pinned.temporaryRef.path);
        assert.deepEqual(await fsp.readFile(path.join(dest.workspaceRoot, retained.failedTemporaryPath)), pinned.bytes);
      }
      assert.equal(opens, 0, "expired prepared metadata cannot admit positive open");
      assert.equal(reads, 0, "expired prepared metadata cannot admit read");
      if (mode !== "token-swap") assert.equal(metadata, 1);
      await assert.rejects(fsp.stat(path.join(dest.workspaceRoot, "check/completion.json")), { code: "ENOENT" });
      assert.equal(context.budget, mode.endsWith("swap") ? later : original);
    } finally {
      privateFs.lstat = lstat; privateFs.open = open;
      original.dispose(); later.dispose();
      if (!published) await dest.store.containPreparedCompletion(prepared, new Error("test containment"));
      await artifactStoreLifetime(dest.store).whenSettled();
    }
  });
}


test("review regression: actual events-await handoff cannot refresh collector effects", async () => {
  const root = path.join(SOURCE, "train/scripts/browser_eval");
  const code = `
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {pathToFileURL} from "node:url";
const root=${JSON.stringify(root)}, state={armed:false,active:false,swap:null,collector:null,replay:null};
globalThis.__handoff=state;
const edits={
 "receipt-verification-v2.mjs":[["  guard();\\n  if (bytes.length !== eventsRef.byteLength",
  "  guard();\\n  if(globalThis.__handoff.armed && verificationContext===globalThis.__handoff.context && headFields.phase==='preflight') queueMicrotask(()=>globalThis.__handoff.swap());\\n  if (bytes.length !== eventsRef.byteLength"]],
 "preflight-evidence-v3.mjs":[["const verificationContext = Object.freeze({ budget });",
  "const verificationContext = Object.freeze({ budget });\\nif(globalThis.__handoff.armed) globalThis.__handoff.collector(io,budget,verificationContext);"],
  ["return replayCheckpointPgn({ phase:","if(globalThis.__handoff.armed) globalThis.__handoff.replay();\\n      return replayCheckpointPgn({ phase:"]]
};
const hooked=new Set();
const hook=registerHooks({load(url,context,next){
 const result=next(url,context);
 for(const [name,pairs] of Object.entries(edits)){
  if(url!==pathToFileURL(root+"/"+name).href)continue;
  let source=typeof result.source==="string"?result.source:Buffer.from(result.source).toString("utf8");
  for(const [needle,replacement] of pairs){assert(source.includes(needle),name+" hook drift");source=source.replace(needle,replacement);}
  hooked.add(name);
  return {...result,source};
 }
 return result;
}});
const load=name=>import(pathToFileURL(root+"/"+name+".mjs").href), closes=[], reports=[];
try{
 const {createV3GraphFixture,now}=await load("preflight-v3-test-fixtures");
 const {createBudgetHandle}=await load("process-budget"), {createWatchdogLifetime}=await load("watchdog-lifetime");
 const {verifyReceipt}=await load("prerequisites"), {privateFs}=await load("private-fs");
 const f=await createV3GraphFixture({after:fn=>closes.push(fn)});
 assert.equal(f.preflight.final.scientificReadinessVerdict.status,"ready");
 for(const mode of ["expiry-at-handoff","held-collector-metadata"]){
  let clock=now(), release, entered, drained=false, timer;
  const gate=new Promise(resolve=>{release=resolve;}), seen=new Promise(resolve=>{entered=resolve;});
  const A=createBudgetHandle({deadlineMonoMs:clock+90000,nowMonoMs:()=>clock,clock:{setTimeout,clearTimeout}});
  const B=createBudgetHandle({deadlineMonoMs:clock+180000,nowMonoMs:()=>clock,clock:{setTimeout,clearTimeout}});
  const lifetime=createWatchdogLifetime(), io=Object.freeze({retainActual:lifetime.retainActual}), context={budget:A};
  const report={mode,mutations:0,collectors:0,metadataAfterExpiry:0,opensAfterExpiry:0,readsAfterExpiry:0,replaysAfterExpiry:0,held:0};
  const lstat=privateFs.lstat, open=privateFs.open, descriptors=new Set();
  state.context=context; state.active=false;
  const expired=()=>clock>=A.deadlineMonoMs();
  state.swap=()=>{report.mutations+=1;context.budget=B;if(mode==="expiry-at-handoff")clock=A.deadlineMonoMs();};
  state.collector=(actualIo,budget,view)=>{
   state.active=true;report.collectors+=1;
   assert.equal(actualIo,io);assert.equal(view.budget,budget);assert(Object.isFrozen(view));
   report.collectorUsedLater=budget===B;
  };
  state.replay=()=>{if(state.active&&expired())report.replaysAfterExpiry+=1;};
  privateFs.lstat=async(...args)=>{
   const active=state.active;
   if(active&&expired())report.metadataAfterExpiry+=1;
   const value=await lstat(...args);
   if(active&&mode==="held-collector-metadata"&&!report.held){
    report.held+=1;clock=A.deadlineMonoMs();entered();await gate;
   }
   return value;
  };
  privateFs.open=async(...args)=>{
   const active=state.active;
   if(active&&expired())report.opensAfterExpiry+=1;
   const file=await open(...args);
   if(!active)return file;
   const fd=file.fd, read=file.read.bind(file), close=file.close.bind(file);
   descriptors.add(fd);
   file.read=(...values)=>{if(expired())report.readsAfterExpiry+=1;return read(...values);};
   file.close=async()=>{await close();descriptors.delete(fd);};
   return file;
  };
  state.armed=true;
  const pending=verifyReceipt({workspaceRoot:f.env.workspaceRoot,completionRef:f.preflight.completionRef,
   expectedIdentity:f.workspace.commonIdentity},io,context).then(value=>({value}),error=>({error}));
  try{
   const first=await Promise.race([pending.then(result=>({result})),seen.then(()=>({held:true})),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("handoff setup timeout")),5000);})]);
   clearTimeout(timer);
   if(first.held){
    lifetime.whenSettled().then(()=>{drained=true;});
    await new Promise(setImmediate);assert.equal(drained,false,"held actual metadata remains owned");release();
   }
   const result=first.result??await pending;
   assert(result.error,"outer graph must reject replacement");
   assert.equal(report.mutations,1);assert.equal(context.budget,B);
   if(mode==="expiry-at-handoff"||report.held) assert.throws(()=>A.assertLive("original expired"),/ACCOUNTING_UNAVAILABLE/);
   else {assert.equal(report.collectors,0);assert.doesNotThrow(()=>A.assertLive("rejected before collector"));}
   await lifetime.whenSettled();assert.equal(descriptors.size,0);
   report.actualOwnerSettled=true;reports.push(report);
  }finally{
   clearTimeout(timer);release();await pending;await lifetime.whenSettled();
   privateFs.lstat=lstat;privateFs.open=open;state.armed=false;A.dispose();B.dispose();
  }
 }
 assert.equal(hooked.size,2);
 console.log(JSON.stringify({actualGraphAndCollectors:true,reports}));
 for(const report of reports)for(const key of ["metadataAfterExpiry","opensAfterExpiry","readsAfterExpiry","replaysAfterExpiry"])
  assert.equal(report[key],0,report.mode+" "+key+" cannot use a refreshed collector budget");
}finally{
 state.armed=false;
 for(const close of closes)await close();
 hook.deregister();delete globalThis.__handoff;
}
`;
  const result = await child(process.execPath, ["--input-type=module", "-e", code]);
  assert.equal(result.exit, 0, result.stderr);
  const evidence = JSON.parse(result.stdout.trim());
  assert.equal(evidence.actualGraphAndCollectors, true);
  assert.equal(evidence.reports.length, 2);
  for (const report of evidence.reports) assert.equal(report.actualOwnerSettled, true);
});
