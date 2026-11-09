// TEST ONLY. Explicit selection; no Native/browser/model/phase authority.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createProtocolValidator } from "./supervisor-protocol.mjs";
import { createDriverCapabilities } from "./driver-bridge.mjs";
import { createWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { v2Graph, quality } from "./separate-verdicts-test-fixtures.mjs";
import { canonicalBytes, parseCanonicalBytes, parseJSONBytes, sha256Bytes } from "./canonical-json.mjs";
import os from "node:os";
import path from "node:path";
import { child, snapshotChild, writableRemove, createCompatRepo } from "./separate-verdicts-compat-fixtures.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";
import { PYTHON_EXECUTABLE, PHASES, FIXTURE_PATHS, FIXED_LIMITS } from "./schema-constants.mjs";
import { validateProtocolFixture } from "./phase-fixtures.mjs";
import { V2_POLICY, policyForProtocol, assertPolicyBinding } from "./evaluation-policy.mjs";
import { assertRecord } from "./record-schema.mjs";
import { deepEqual, freezeDeep } from "./schema-primitives.mjs";
import { assembleSnapshotIdentity } from "./snapshot-identity.mjs";
import { fixtureCommonIdentity } from "./test-fixtures.mjs";
import { RUNTIME_PATHS } from "./snapshot-files.mjs";
const V1 = "train/fixtures/browser-protocol.json";
const V2 = "train/fixtures/browser-protocol-v2.json";
const original = JSON.parse(await fs.readFile(new URL("../../fixtures/browser-protocol.json", import.meta.url)));
const prospective = { ...structuredClone(original), schemaVersion: 2, evaluationPolicy: V2_POLICY };
const assembly = (selection = {}) => {
  const id = fixtureCommonIdentity();
  return assembleSnapshotIdentity({ candidate: id.candidate,
    baselineFiles: [], candidateFiles: id.pythonReference.files,
    harnessFiles: [...Object.values(id.fixtures), { ...id.fixtures.protocol, path: V2 }],
    pythonFiles: id.pythonReference.files, environment: id.environment, ...selection });
};
test("explicit v2 protocol validates unchanged science and limits", () => {
  assert.deepEqual(validateProtocolFixture(prospective), prospective);
  assert.deepEqual(policyForProtocol(prospective, V2), V2_POLICY);
});
test("both fixtures present never infer v2 and exact selected identity binds policy", () => {
  assert.equal(assembly().fixtures.protocol.path, V1);
  assert.equal(Object.hasOwn(assembly(), "evaluationPolicy"), false);
  const v2 = assembly({ protocolPath: V2, evaluationPolicy: V2_POLICY });
  assert.equal(v2.fixtures.protocol.path, V2);
  assert.deepEqual(v2.evaluationPolicy, V2_POLICY);
  for (const bad of [{protocolPath:V2}, {evaluationPolicy:V2_POLICY},
    {protocolPath:"train/fixtures/other.json",evaluationPolicy:V2_POLICY},
    {protocolPath:V2,evaluationPolicy:{...V2_POLICY,softPhase:"check"}}]) {
    assert.throws(() => assembly(bad));
  }
});
test("functional closure includes every new runtime owner and excludes TEST leaves", () => {
  for (const name of ["evaluation-policy", "resource-quality", "verdicts-v2", "record-fields",
    "record-schema-v2", "receipt-verdicts-v2", "process-runtime-start",
    "watchdog-resource-policy", "watchdog-verdict-policy", "record-finalization-v2",
    "receipt-verification-v2"]) {
    assert.equal(RUNTIME_PATHS.includes(`train/scripts/browser_eval/${name}.mjs`), true, name);
  }
  assert.equal(RUNTIME_PATHS.includes(V2), true);
  assert.equal(RUNTIME_PATHS.some(p => /\.test\.mjs$|test-fixtures/.test(p)), false);
});

const binding = {recordSchemaVersion: 2, evaluationPolicy: V2_POLICY};
const hello = { ipcVersion: 1, runId: "driver", seq: 0, type: "hello", pid: 123,
  phase: "check", commonIdentitySha256: "a".repeat(64), ...binding };
const start = { ipcVersion: 1, runId: "driver", seq: 0, type: "start",
  manifestPath: "/tmp/manifest.json", commonIdentitySha256: "a".repeat(64), ...binding };
const accept = (p, dir, frame) => p.accept("driver", dir, frame, canonicalBytes(frame).length);
test("driver hello/start bind exact policy/version and preserve closed v1 envelopes", () => {
  const p = createProtocolValidator({runId:"driver", ...binding});
  accept(p, "d2s", hello); accept(p, "s2d", start);
  for (const frame of [{...hello,recordSchemaVersion:1}, {...hello,evaluationPolicy:null},
    {...hello,evaluationPolicy:{...V2_POLICY,softPhase:"check"}}, {...hello,unexpected:true}]) {
    assert.throws(() => accept(createProtocolValidator({runId:"driver",...binding}), "d2s", frame));
  }
  assert.throws(() => accept(createProtocolValidator({runId:"driver"}), "d2s", hello));
  const v1 = createProtocolValidator({runId:"driver"});
  const {recordSchemaVersion, evaluationPolicy, ...oldHello} = hello;
  const {recordSchemaVersion:unusedVersion, evaluationPolicy:unusedPolicy, ...oldStart} = start;
  accept(v1,"d2s",oldHello); accept(v1,"s2d",oldStart);
  const missing = createProtocolValidator({runId:"driver",...binding});
  assert.throws(() => accept(missing,"d2s",oldHello));
  for (const frame of [{...start,recordSchemaVersion:1},{...start,evaluationPolicy:null},oldStart]) {
    const p = createProtocolValidator({runId:"driver",...binding}); accept(p,"d2s",hello);
    assert.throws(() => accept(p,"s2d",frame));
  }
});
test("bridge requires matching start and rejects forged final authority without releasing callbacks", async (t) => {
  const manifest = {...v2Graph({phase:"check",runId:"driver"}).manifest,commonIdentitySha256:"a".repeat(64)};
  for (const mode of ["valid","missing","wrong"]) {
    const lifetime=createWatchdogLifetime(), controller=new AbortController();
    let receive, rawCallback; const sent=[];
    const session=createDriverCapabilities({runId:"driver",manifest,signal:controller.signal,transport:{pid:123,
      retainActual:lifetime.retainActual, clock:{setInterval:()=>1,clearInterval:()=>{}},
      onMessage(fn){receive=fn;return()=>{};}, onClose(){return()=>{};},
      send(frame,callback){sent.push(frame);rawCallback=callback;} }});
    t.after(async()=>{controller.abort();if(rawCallback)rawCallback(null);await lifetime.whenSettled();});
    const pending=session.start({manifestPath:start.manifestPath}); pending.catch(()=>{});
    assert.deepEqual(sent[0],hello);
    let settled=false; const join=lifetime.whenSettled().then(()=>{settled=true;});
    const frame=structuredClone(start);
    if(mode==="missing"){delete frame.evaluationPolicy;delete frame.recordSchemaVersion;}
    if(mode==="wrong")frame.evaluationPolicy.softPhase="check";
    receive(frame); await new Promise(resolve=>setImmediate(resolve)); assert.equal(settled,false);
    rawCallback(null);rawCallback=null; await join;
    if(mode!=="valid") await assert.rejects(pending);
    else {
      await pending;
      await assert.rejects(session.finish({requestedStatus:"passed",requestedExitCode:0,stopReason:null,
        checks:[],summary:{strengthVerdict:{status:"eligible"}},analysisEligible:true}),/summary/);
    }
    controller.abort(); await lifetime.whenSettled();
  }
});
async function selectedConst(file,name) {
  const source=ts.createSourceFile(file,await fs.readFile(new URL(file,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const node=source.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText()===name));
  assert.ok(node,name); return new Function(`${node.getText(source)};return ${name}`)();
}
test("CLI projects synthetic mixed eligible/inconclusive2 without creating missing publication authority",async()=>{
  const project=await selectedConst("./cli.mjs","projectOutcome");
  const graph=v2Graph({resourceEvidence:quality({gap:true})});
  const outcome={schemaVersion:2,policyId:V2_POLICY.policyId,status:graph.final.status,
    exitCode:graph.final.exitCode,stopReason:null,strengthVerdict:graph.final.strengthVerdict,
    resourceVerdict:graph.final.resourceVerdict,closureResourceVerdict:graph.final.closureResourceVerdict,
    completionRef:{path:"compare/completion.json",byteLength:1,sha256:"a".repeat(64)}};
  assert.deepEqual(project(outcome),outcome);assert.equal(project(outcome).exitCode,2);
  assert.equal(project(outcome).strengthVerdict.status,"eligible");
  assert.throws(()=>project({...outcome,completionRef:null}),/published completion/);
  assert.deepEqual(project({status:"inconclusive",exitCode:2,stopReason:"GRAPH"}),{status:"inconclusive",exitCode:2,stopReason:"GRAPH"});
});
test("Python parity admission rejects mixed paths, policy, hash and versions before archived exec",async()=>{
  const code=`import runpy,copy,json,hashlib
m=runpy.run_path("train/scripts/check_browser_parity.py")
v1=json.load(open("train/fixtures/browser-protocol.json"));v2=json.load(open("train/fixtures/browser-protocol-v2.json"))
p=m["V2_POLICY"];validate=m["validate_selection"];manifest=m["validate_manifest_selection"]
for version,fixture,filename in [(1,v1,m["V1_PROTOCOL"]),(2,v2,m["V2_PROTOCOL"])]:
 identity={"fixtures":{"protocol":{"path":filename}}}
 if version==2:identity["evaluationPolicy"]=p
 w={"schemaVersion":version,"commonIdentity":identity}
 assert validate(w,filename,fixture)==version
 for bad in ["unknown",m["V1_PROTOCOL"] if version==2 else m["V2_PROTOCOL"]]:
  try:validate(w,bad,fixture);raise AssertionError("accepted wrong path")
  except ValueError:pass
 for field,value in [("schemaVersion",3),("schemaVersion",True)]:
  wrong=copy.deepcopy(w);wrong[field]=value
  try:validate(wrong,filename,fixture);raise AssertionError("accepted wrong version")
  except ValueError:pass
 mf={"schemaVersion":version,"commonIdentitySha256":hashlib.sha256((json.dumps(identity,sort_keys=True,separators=(",",":"))+"\\n").encode()).hexdigest()}
 if version==2:mf["evaluationPolicy"]=p
 manifest(w,mf,version)
 for field,value in [("schemaVersion",3),("evaluationPolicy",None),("commonIdentitySha256","0"*64)]:
  wrong=copy.deepcopy(mf);wrong[field]=value
  try:manifest(w,wrong,version);raise AssertionError("accepted wrong manifest")
  except ValueError:pass
 if version==2:
  for wrongpolicy in [None,{**p,"softPhase":"check"},{**p,"unknown":1}]:
   wrong=copy.deepcopy(w);wrong["commonIdentity"]["evaluationPolicy"]=wrongpolicy
   try:validate(wrong,filename,fixture);raise AssertionError("accepted wrong policy")
   except ValueError:pass
print("strict admission only; no archive exec/model")`;
  const result=await child(PYTHON_EXECUTABLE,["-I","-B","-c",code]);
  assert.equal(result.exit,0,result.stderr);assert.match(result.stdout,/strict admission only/);
});

for (const version of [1,2]) {
  test(`fresh-process v${version} capture/final measurement/archive reopen with both fixtures`,async t=>{
    const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),"tinyaz-compat-")));
    t.after(()=>writableRemove(root));
    const workspaceRoot=path.join(root,"workspace"), protocolPath=version===1?V1:V2;
    const repoRoot = await createCompatRepo(root);
    const invoke = (mode, requested = protocolPath, extra = {}) => snapshotChild(mode, workspaceRoot, requested, extra, repoRoot);
    const captured=await invoke("capture",protocolPath,
      version===1?{}:{evaluationPolicy:V2_POLICY});
    assert.equal(captured.exit,0,captured.stderr);
    const workspace=JSON.parse(captured.stdout);
    const reopened=await invoke("reopen",protocolPath);
    assert.equal(reopened.exit,0,reopened.stderr);
    assert.deepEqual(JSON.parse(reopened.stdout),workspace);
    if(version===1){
      const omitted=await snapshotChild("reopen",workspaceRoot,undefined,{},repoRoot);
      assert.equal(omitted.exit,0,omitted.stderr);
    }
    for(const requested of ["train/fixtures/unknown.json",version===1?V2:V1,...(version===2?[undefined]:[])]){
      const bad=await snapshotChild("reopen",workspaceRoot,requested,{},repoRoot);
      assert.notEqual(bad.exit,0);assert.equal(bad.stdout,"");
    }
    const workspaceFile=path.join(workspaceRoot,"workspace.json");
    const originalBytes=await fs.readFile(workspaceFile);
    const replaceWorkspace=async value=>{
      await fs.chmod(workspaceFile,0o644);await fs.writeFile(workspaceFile,canonicalBytes(value));await fs.chmod(workspaceFile,0o444);
    };
    const mutations=[value=>{value.schemaVersion=3;},value=>{value.commonIdentity.fixtures.protocol.sha256="0".repeat(64);},
      value=>{value.commonIdentity.fixtures.protocol.path=version===1?V2:V1;},
      value=>{value.commonIdentity.candidate.contentSha256="0".repeat(64);}];
    if(version===2)mutations.push(value=>{delete value.commonIdentity.evaluationPolicy;},
      value=>{value.commonIdentity.evaluationPolicy.softPhase="check";});
    for(const mutate of mutations){
      const wrong=structuredClone(workspace);mutate(wrong);await replaceWorkspace(wrong);
      const bad=await invoke("reopen",protocolPath);
      assert.notEqual(bad.exit,0,bad.stdout);assert.equal(bad.stdout,"");
      await replaceWorkspace(workspace);
    }
    assert.deepEqual(await fs.readFile(workspaceFile),originalBytes);
    const activeFixture = path.join(repoRoot, protocolPath);
    const activeBytes = await fs.readFile(activeFixture);
    await fs.writeFile(activeFixture, Buffer.concat([activeBytes, Buffer.from(" ")]));
    const changedCurrent = await invoke("reopen");
    assert.notEqual(changedCurrent.exit, 0); assert.equal(changedCurrent.stdout, "");
    await fs.writeFile(activeFixture, activeBytes);
    const fixtureFile=path.join(workspaceRoot,"inputs/harness",protocolPath);
    const fixtureBytes=await fs.readFile(fixtureFile);
    await fs.chmod(fixtureFile,0o644);await fs.writeFile(fixtureFile,Buffer.concat([fixtureBytes,Buffer.from(" ")]));await fs.chmod(fixtureFile,0o444);
    const tampered=await invoke("reopen",protocolPath);
    assert.notEqual(tampered.exit,0);assert.equal(tampered.stdout,"");
    await fs.chmod(fixtureFile,0o644);await fs.writeFile(fixtureFile,fixtureBytes);await fs.chmod(fixtureFile,0o444);
    await fs.chmod(path.dirname(fixtureFile),0o755);
    await fs.unlink(fixtureFile);
    await fs.chmod(path.dirname(fixtureFile),0o555);
    const missing=await invoke("reopen",protocolPath);
    assert.notEqual(missing.exit,0);assert.equal(missing.stdout,"");
  });
}
test("actual supervisor start construction binds the strict driver validator",async()=>{
  const source=ts.createSourceFile("watchdog-runtime.mjs",await fs.readFile(new URL("./watchdog-runtime.mjs",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const calls=[];
  const visit=node=>{
    if(ts.isCallExpression(node)&&node.expression.getText(source)==="state.channel.send"&&node.arguments[0]?.getText(source)==='"start"')calls.push(node);
    ts.forEachChild(node,visit);
  };
  visit(source);assert.equal(calls.length,1);
  const producer=new Function("config","state","timing",`return ${calls[0].getText(source)}`);
  for(const version of [1,2]){
    const p=createProtocolValidator({runId:"driver",...(version===2?binding:{})});
    const h=structuredClone(hello);
    if(version===1){delete h.recordSchemaVersion;delete h.evaluationPolicy;}
    accept(p,"d2s",h);
    let sends=0;
    const state={channel:{send(type,fields){sends++;accept(p,"s2d",{ipcVersion:1,runId:"driver",seq:0,type,...fields});}}};
    producer({workspace:{schemaVersion:version,commonIdentity:version===2?{evaluationPolicy:V2_POLICY}:{}},
      manifestPath:start.manifestPath,commonIdentitySha256:start.commonIdentitySha256},state,{workRemainingMs:()=>90000});
    assert.equal(sends,1);
  }
});

test("actual archived supervisor forwards the explicitly selected path to independent reopen", async () => {
  const source = ts.createSourceFile("run.mjs", await fs.readFile(new URL("./run.mjs",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const names = ["now","fail","selection","setup","runSupervisor"];
  const nodes = source.statements.filter(node =>
    (ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)) ||
    (ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>names.includes(item.name.getText()))));
  assert.equal(nodes.length,names.length);
  const code = nodes.map(node=>node.getText(source).replace(/^export /,"")).join("\n").replaceAll("import.meta.url",JSON.stringify(import.meta.url));
  for (const protocolPath of [V1,V2]) {
    const workspaceRoot = "/tmp/unissued-compat-workspace";
    let reopened = 0, assembled = 0;
    const bindings = {path,PHASES,FIXTURE_PATHS,FIXED_LIMITS,isObj,exactFields,
      createWatchdogLifetime,createBudgetHandle,
      fileURLToPath:()=>path.join(workspaceRoot,"inputs/harness/train/scripts/browser_eval/cli.mjs"),
      observeAwaitStage:async(owner,scope,label,issue)=>issue(),
      reopenInputs:async(options,context)=>{
        reopened++;
        assert.deepEqual(options,{workspaceRoot,candidate:"WORKTREE",protocolPath});
        assert.equal(context.repoRoot,"/tmp/unissued-compat-repo");
        return {selected:protocolPath};
      },
      executeSupervisor:async options=>{
        assembled++;
        assert.deepEqual(options.captured,{selected:protocolPath});
        return {status:"inconclusive",exitCode:2};
      }};
    const run = new Function(...Object.keys(bindings),`${code};return runSupervisor`)(...Object.values(bindings));
    const outcome = await run({phase:"check",candidate:"WORKTREE",protocolPath,
      workspaceRoot,repoRoot:"/tmp/unissued-compat-repo"});
    assert.equal(outcome.exitCode,2);
    assert.equal(reopened,1);assert.equal(assembled,1);
  }
});
test("unknown/missing/extra fixture policy and version reject before runtime admission",()=>{
  for(const value of [{...prospective,schemaVersion:3},{...prospective,evaluationPolicy:null},
    {...prospective,evaluationPolicy:{...V2_POLICY,softPhase:"check"}},
    {...prospective,evaluationPolicy:{...V2_POLICY,extra:true}},
    {...prospective,limits:{...prospective.limits,extra:true}},
    {...original,evaluationPolicy:V2_POLICY}]){
    assert.throws(()=>validateProtocolFixture(value));
  }
  const missing=structuredClone(prospective);delete missing.evaluationPolicy;
  assert.throws(()=>validateProtocolFixture(missing));
});

test("actual archived driver validates selected bytes/version/policy before SDK or scratch effects", async () => {
  const source = ts.createSourceFile("run-driver.mjs", await fs.readFile(new URL("./run-driver.mjs",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const node = source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="executeDriver");
  assert.ok(node);
  for (const mode of ["valid","manifest-version","manifest-policy","fixture-hash","fixture-version","fixture-policy"]) {
    const {ws,manifest} = v2Graph({phase:"check"});
    const fixture = structuredClone(prospective);
    if (mode === "fixture-version") fixture.schemaVersion = 1;
    if (mode === "fixture-policy") fixture.evaluationPolicy.softPhase = "check";
    const bytes = canonicalBytes(fixture);
    ws.commonIdentity.fixtures.protocol = {path:V2,byteLength:bytes.length,sha256:sha256Bytes(bytes)};
    if (mode === "fixture-hash") ws.commonIdentity.fixtures.protocol.sha256 = "0".repeat(64);
    manifest.commonIdentitySha256 = sha256Bytes(canonicalBytes(ws.commonIdentity));
    if (mode === "manifest-version") manifest.schemaVersion = 1;
    if (mode === "manifest-policy") manifest.evaluationPolicy = {...V2_POLICY,softPhase:"check"};
    let effects = 0;
    const reads = [];
    const reached = new Error("TEST exact pre-SDK boundary reached");
    const bindings = {path,now:()=>Number(process.hrtime.bigint()/1000000n),
      createWatchdogLifetime,createBudgetHandle,parseCanonicalBytes,parseJSONBytes,
      assertRecord,freezeDeep,sha256Bytes,canonicalBytes,policyForProtocol,assertPolicyBinding,
      validateProtocolFixture,deepEqual,reportDriverDiagnostic:()=>{},
      process:{send(){},connected:false},
      createSnapshotIO:()=>({
        async readAt(root,name){
          reads.push(name);
          if(name==="check/manifest.json")return canonicalBytes(manifest);
          if(name==="workspace.json")return canonicalBytes(ws);
          assert.equal(name,`inputs/harness/${V2}`);
          return bytes;
        },
        async call(){effects++;throw reached;},
      })};
    const run = new Function(...Object.keys(bindings),`${node.getText(source).replace(/^export /,"")};return executeDriver`)(...Object.values(bindings));
    await assert.rejects(run({manifestPath:"/tmp/unissued/check/manifest.json",workspaceRoot:"/tmp/unissued",repoRoot:"/tmp/unissued-repo"}),
      error=>mode==="valid"?error===reached:error!==reached);
    assert.equal(effects,mode==="valid"?1:0);
    if(mode==="valid")assert.ok(reads.includes(`inputs/harness/${V2}`));
  }
});
