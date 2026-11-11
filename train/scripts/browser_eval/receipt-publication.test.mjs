// TEST-ONLY suite: genuine prepared-graph publication regressions
// over real temporary workspaces. A source runReceiptPhase produces
// the real check receipt (sealing its own store), every actual phase
// file except completion.json is copied byte-exact into a second
// genuine workspace through its real writeOnce, and the Store pins
// the actual completion bytes under the still-absent canonical
// target. Covers the opaque single-use PreparedVerification token,
// authoritative publish/seal/reverify, a post-mint declared-input
// mutation failing the fresh canonical readback, and full physical
// inventory denial — never a fake token, path override, callback
// verifier or fabricated status. Ordinary node:test/assert/fs/path
// plus the declared existing APIs only.

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  assertRejectCode as code,
  copy,
  makeWorkspace,
  runReceiptPhase,
} from "./test-fixtures.mjs";
import { artifactStoreLifetime } from "./artifact-store.mjs";
import { readPreparedCompletion } from "./completion-publication.mjs";
import {
  consumePreparedVerification,
  verifyPreparedReceiptGraph,
  verifyReceiptGraph,
} from "./receipt-verification.mjs";

const expectENOENT = async (abs) => {
  await code(fsp.lstat(abs), "ENOENT");
};

// One genuine prepared graph per call: the real check receipt runs in
// a source workspace (its store actually seals the phase), then every
// actual phase file EXCEPT completion.json is copied into a second
// genuine workspace through writeOnce with the same bytes/refs, and
// the real completion bytes are prepared under the absent canonical
// target. The teardown is preregistered BEFORE any copy/prepare
// effect: a still-prepared unsealed capability is genuinely contained
// (never after an authoritative sealed result), both genuine owners
// drain to zero, then only the owned roots are removed.
const makePreparedEnv = async (t) => {
  const source = await makeWorkspace();
  await runReceiptPhase({ env: source, phase: "check" });
  const dest = await makeWorkspace();
  const owner = artifactStoreLifetime(dest.store);
  const sourceOwner = artifactStoreLifetime(source.store);
  const io = Object.freeze({ retainActual: owner.retainActual });
  const state = { prepared: null, sealed: false };
  t.after(async () => {
    if (state.prepared !== null && !state.sealed) {
      await dest.store.containPreparedCompletion(
        state.prepared,
        new Error("teardown containment"),
      );
    }
    await owner.whenSettled();
    await sourceOwner.whenSettled();
    await fsp.rm(dest.workspaceRoot, { recursive: true, force: true });
    await fsp.rm(source.workspaceRoot, { recursive: true, force: true });
  });
  const phaseAbs = path.join(source.workspaceRoot, "check");
  const walk = async (dirAbs, dirRel) => {
    for (const entry of await fsp.readdir(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      const rel = `${dirRel}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (rel !== "check/completion.json") {
        await dest.store.writeOnce(rel, await fsp.readFile(abs), "final");
      }
    }
  };
  await walk(phaseAbs, "check");
  const bytes = await fsp.readFile(path.join(phaseAbs, "completion.json"));
  state.prepared = await dest.store.prepareCompletion({
    phaseDirectory: "check",
    bytes,
  });
  return { source, dest, owner, io, state, bytes };
};

test("prepared verification mints an opaque single-use token bound to the exact branded read", async (t) => {
  const env = await makePreparedEnv(t);
  const read1 = await readPreparedCompletion(env.state.prepared);
  const callerIdentity = copy(env.dest.ws.commonIdentity);
  const pending = verifyPreparedReceiptGraph({
    preparedCompletion: env.state.prepared,
    expectedIdentity: callerIdentity,
  });
  // The schema-valid caller copy is pinned before the first await: a
  // post-invocation mutation cannot redirect the verified identity.
  callerIdentity.candidate.contentSha256 = "0".repeat(64);
  const token = await pending;
  assert.equal(typeof token, "object");
  assert.ok(Object.isFrozen(token));
  assert.deepEqual(Object.getOwnPropertyNames(token), []);

  for (const forged of [{}, { ...token }, new Proxy(token, {})]) {
    assert.throws(
      () => consumePreparedVerification(env.state.prepared, forged),
      (e) => e instanceof Error && e.code === "STORE_ARGS",
    );
  }
  const other = await makePreparedEnv(t);
  // A different genuine capability rejects the pairing WITHOUT
  // consuming the token.
  assert.throws(
    () => consumePreparedVerification(other.state.prepared, token),
    (e) => e instanceof Error && e.code === "STORE_STATE",
  );

  const association = consumePreparedVerification(env.state.prepared, token);
  assert.ok(Object.isFrozen(association));
  assert.deepEqual(
    [...Object.keys(association)].sort(),
    [
      "canonicalRef",
      "expectedIdentity",
      "fileId",
      "phaseDirectory",
      "temporaryRef",
      "workspaceRoot",
    ],
  );
  assert.equal(association.workspaceRoot, path.resolve(env.dest.workspaceRoot));
  assert.equal(association.phaseDirectory, "check");
  assert.deepEqual(association.canonicalRef, read1.canonicalRef);
  assert.deepEqual(association.temporaryRef, read1.temporaryRef);
  assert.equal(typeof association.fileId.dev, "bigint");
  assert.equal(typeof association.fileId.ino, "bigint");
  assert.deepEqual(association.fileId, read1.fileId);
  assert.deepEqual(association.expectedIdentity, env.dest.ws.commonIdentity);
  assert.equal(
    association.expectedIdentity.candidate.contentSha256,
    env.dest.ws.commonIdentity.candidate.contentSha256,
  );
  assert.ok(Object.isFrozen(association.expectedIdentity));
  assert.notEqual(association.expectedIdentity, callerIdentity);
  assert.equal(callerIdentity.candidate.contentSha256, "0".repeat(64));
  assert.throws(
    () => consumePreparedVerification(env.state.prepared, token),
    (e) => e instanceof Error && e.code === "STORE_STATE",
  );

  const failed1 = await env.dest.store.containPreparedCompletion(
    env.state.prepared,
    new Error("first cap done"),
  );
  assert.equal(failed1.failedTemporaryPath, read1.temporaryRef.path);
  const failed2 = await other.dest.store.containPreparedCompletion(
    other.state.prepared,
    new Error("other cap done"),
  );
  assert.equal(typeof failed2.failedTemporaryPath, "string");
});

test("a genuine token publishes the real completion and the phase seals with authoritative evidence", async (t) => {
  const env = await makePreparedEnv(t);
  const token = await verifyPreparedReceiptGraph({
    preparedCompletion: env.state.prepared,
    expectedIdentity: copy(env.dest.ws.commonIdentity),
  });
  const published = await env.dest.store.publishPreparedCompletion(
    env.state.prepared,
    token,
  );
  env.state.sealed = true;
  assert.ok(Object.isFrozen(published));
  assert.equal(published.completionRef.path, "check/completion.json");
  assert.equal(published.completionRef.byteLength, env.bytes.length);
  const canonicalAbs = path.join(
    env.dest.workspaceRoot,
    published.completionRef.path,
  );
  assert.deepEqual(await fsp.readFile(canonicalAbs), env.bytes);

  // A fresh ordinary full-graph readback through the SAME genuine io
  // reproduces the authoritative evidence; verified.final is the
  // record-derived final, never a returned intent.
  const reverified = await verifyReceiptGraph(
    {
      workspaceRoot: env.dest.workspaceRoot,
      completionRef: published.completionRef,
      expectedIdentity: env.dest.ws.commonIdentity,
    },
    new Map(),
    env.io,
  );
  assert.deepEqual(published.verified, reverified);
  assert.equal(published.verified.phase, "check");
  assert.equal(published.verified.runId, "run-check");
  assert.equal(published.verified.final.status, "passed");
  assert.equal(published.verified.final.exitCode, 0);
  assert.ok(Object.isFrozen(published.verified.final));

  await code(
    env.dest.store.writeOnce("check/extra", Buffer.from("x"), "ordinary"),
    "STORE_SEALED",
  );
  await code(
    env.dest.store.publishPreparedCompletion(env.state.prepared, token),
    "STORE_STATE",
  );
  await code(
    env.dest.store.containPreparedCompletion(
      env.state.prepared,
      new Error("late containment"),
    ),
    "STORE_STATE",
  );
  await code(
    verifyPreparedReceiptGraph({
      preparedCompletion: env.state.prepared,
      expectedIdentity: env.dest.ws.commonIdentity,
    }),
    "STORE_STATE",
  );
  assert.deepEqual(await fsp.readFile(canonicalAbs), env.bytes);
  await env.owner.whenSettled();
});

test("a declared input mutated after token mint fails the fresh canonical readback and retains the real temp", async (t) => {
  const env = await makePreparedEnv(t);
  const read1 = await readPreparedCompletion(env.state.prepared);
  const token = await verifyPreparedReceiptGraph({
    preparedCompletion: env.state.prepared,
    expectedIdentity: copy(env.dest.ws.commonIdentity),
  });
  // A real declared retained input under the DESTINATION workspace is
  // rewritten same-length/different-bytes after the token was minted.
  await fsp.writeFile(
    path.join(env.dest.workspaceRoot, "inputs/candidate/x"),
    Buffer.alloc(8, 3),
  );
  await code(
    env.dest.store.publishPreparedCompletion(env.state.prepared, token),
    "EVIDENCE_MISMATCH",
  );
  await expectENOENT(path.join(env.dest.workspaceRoot, "check/completion.json"));
  const failed = await env.dest.store.containPreparedCompletion(
    env.state.prepared,
    new Error("observed containment"),
  );
  assert.equal(failed.failedTemporaryPath, read1.temporaryRef.path);
  assert.deepEqual(failed.failedTemporaryRef, read1.temporaryRef);
  assert.deepEqual(
    await fsp.readFile(
      path.join(env.dest.workspaceRoot, read1.temporaryRef.path),
    ),
    env.bytes,
  );
  await code(
    env.dest.store.deleteEphemeral(read1.temporaryRef.path),
    "STORE_IO",
  );
  await env.owner.whenSettled();
});

test("the full physical inventory gates prepared verification: phase extras and changed inputs reject", async (t) => {
  const extra = await makePreparedEnv(t);
  const readExtra = await readPreparedCompletion(extra.state.prepared);
  // One test-owned completion-looking extra beside the declared files:
  // only the actual prepared temp may be excluded from the inventory.
  const shadowAbs = path.join(
    extra.dest.workspaceRoot,
    "check",
    "completion.shadow.json",
  );
  await fsp.writeFile(shadowAbs, Buffer.from("shadow-completion"));
  await code(
    verifyPreparedReceiptGraph({
      preparedCompletion: extra.state.prepared,
      expectedIdentity: copy(extra.dest.ws.commonIdentity),
    }),
    "EVIDENCE_INCOMPLETE",
  );
  await fsp.rm(shadowAbs);
  const failed = await extra.dest.store.containPreparedCompletion(
    extra.state.prepared,
    new Error("observed containment"),
  );
  assert.equal(failed.failedTemporaryPath, readExtra.temporaryRef.path);
  assert.deepEqual(
    await fsp.readFile(
      path.join(extra.dest.workspaceRoot, readExtra.temporaryRef.path),
    ),
    extra.bytes,
  );
  await extra.owner.whenSettled();

  const mutated = await makePreparedEnv(t);
  const readMut = await readPreparedCompletion(mutated.state.prepared);
  await fsp.writeFile(
    path.join(mutated.dest.workspaceRoot, "inputs/candidate/x"),
    Buffer.alloc(8, 3),
  );
  await code(
    verifyPreparedReceiptGraph({
      preparedCompletion: mutated.state.prepared,
      expectedIdentity: copy(mutated.dest.ws.commonIdentity),
    }),
    "EVIDENCE_MISMATCH",
  );
  const failedMut = await mutated.dest.store.containPreparedCompletion(
    mutated.state.prepared,
    new Error("observed containment"),
  );
  assert.equal(failedMut.failedTemporaryPath, readMut.temporaryRef.path);
  await mutated.owner.whenSettled();
});


import { child } from "./separate-verdicts-compat-fixtures.mjs";
for (const firstFailure of [false, true]) test(`receipt B owns late creation and same-cap containment, primary=${firstFailure}`, async () => {
  const root = path.resolve(import.meta.dirname);
  const code = `
import assert from "node:assert/strict";
import {registerHooks} from "node:module";
import {pathToFileURL} from "node:url";
import {fstatSync,promises as fs} from "node:fs";
const root=${JSON.stringify(root)}, firstFailure=${JSON.stringify(firstFailure)}, closes=[];
const state={armed:false,creating:false,prepared:null,budget:null};globalThis.__creation=state;
const hook=registerHooks({load(url,ctx,next){
 const result=next(url,ctx);let pairs=[];
 if(url===pathToFileURL(root+"/record-finalizer.mjs").href)pairs=[
  ["const sealBody = async (sealed) => {","const sealBody = async (sealed) => {\\n if(globalThis.__creation.armed)globalThis.__creation.budget=verificationContext.budget;"]];
 if(url===pathToFileURL(root+"/completion-publication.mjs").href)pairs=[
  ["  PREPARED.set(prepared, entry);","  PREPARED.set(prepared, entry);\\n if(globalThis.__creation.armed){globalThis.__creation.creating=true;globalThis.__creation.prepared=prepared;}"]];
 if(!pairs.length||result.source===null||result.source===undefined)return result;
 let source=typeof result.source==="string"?result.source:Buffer.from(result.source).toString();
 for(const [needle,replacement]of pairs){assert(source.includes(needle),"creation hook drift");source=source.replace(needle,replacement);}
 return {...result,source};
}});
let release,entered;const held=new Promise(yes=>{release=yes}),seen=new Promise(yes=>{entered=yes});
let privateFs,lstat,open,pending,env,clock,heldCount=0,rawOpens=0,settled=false,drained=false;
const descriptors=new Set(),primary=Object.freeze({controlled:"first raw sync failure"});
try{
 const load=name=>import(pathToFileURL(root+"/"+name+".mjs").href);
 const {createV3GraphFixture,now}=await load("preflight-v3-test-fixtures");
 const {artifactStoreLifetime}=await load("artifact-store");
 ({privateFs}=await load("private-fs"));lstat=privateFs.lstat;open=privateFs.open;clock=now();
 privateFs.lstat=async(...args)=>{
  const value=await lstat(...args);
  if(state.creating&&!heldCount){heldCount+=1;entered();await held;}
  return value;
 };
 privateFs.open=async(...args)=>{
  const file=await open(...args);if(!state.creating)return file;
  const fd=file.fd,close=file.close.bind(file),sync=file.sync.bind(file);descriptors.add(fd);
  if(clock>=state.budget.deadlineMonoMs())rawOpens+=1;
  file.close=async()=>{await close();descriptors.delete(fd);assert.throws(()=>fstatSync(fd),{code:"EBADF"});};
  if(firstFailure&&args[1]==="wx")file.sync=async()=>{await sync();throw primary;};
  return file;
 };
 pending=createV3GraphFixture({after:fn=>closes.push(fn)},{recorderNow:()=>clock,
  beforePreflightSeal:async actual=>{env=actual.env;state.armed=true;}})
  .then(value=>({value}),error=>({error})).finally(()=>{settled=true});
 const first=await Promise.race([seen.then(()=>"held"),pending.then(()=>"returned")]);
 assert.equal(first,"held","genuine admitted preparation metadata reached");
 const owner=artifactStoreLifetime(env.store);owner.whenSettled().then(()=>{drained=true;});
 clock=state.budget.deadlineMonoMs();assert.equal(settled,false);assert.equal(drained,false);
 release();const outcome=await pending;assert(Object.hasOwn(outcome,"error"));
 if(firstFailure)assert.equal(outcome.error,primary,"first arbitrary raw failure survives containment");
 else assert.equal(outcome.error.code,"ACCOUNTING_UNAVAILABLE");
 await owner.whenSettled();assert.equal(descriptors.size,0);assert(rawOpens>0,"admitted creation really settles after B");
 const failed=await env.store.containPreparedCompletion(state.prepared,new Error("inspect same capability"));
 assert.equal(failed.failedTemporaryPath,failed.failedTemporaryRef.path);
 const retained=await fs.readFile(env.workspaceRoot+"/"+failed.failedTemporaryPath);
 assert(retained.length>0,"actual failed bytes remain in the genuine prepared temp");
 await assert.rejects(fs.stat(env.workspaceRoot+"/preflight/completion.json"),{code:"ENOENT"});
 console.log(JSON.stringify({heldCount,rawOpens,actualSettled:true,sameCapabilityContained:true}));
}finally{
 release();if(pending)await pending;
 if(privateFs){privateFs.lstat=lstat;privateFs.open=open;}
 for(const close of closes)await close();hook.deregister();delete globalThis.__creation;
}
`;
  const result = await child(process.execPath, ["--input-type=module", "-e", code]);
  assert.equal(result.exit, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout.trim()).sameCapabilityContained, true);
});
