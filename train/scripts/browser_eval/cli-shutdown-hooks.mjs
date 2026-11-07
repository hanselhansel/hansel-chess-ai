// TEST-only preload. All substitutions are isolated to this synthetic archive.
import { registerHooks } from "node:module";
import { readFileSync, appendFileSync } from "node:fs";
import { createHook } from "node:async_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../../../../..");
const control = JSON.parse(readFileSync(path.join(root, "control.json")));
const { mode } = control;
const record = (row) => appendFileSync(path.join(root, "diagnostics.jsonl"),
  JSON.stringify({ pid: process.pid, ...row }) + "\n");
globalThis[Symbol.for("tinyaz.test.record")] = record;
const active = new Map();
createHook({
  init(id, type, trigger, resource) {
    if (["Timeout", "PIPEWRAP", "PROCESSWRAP", "TCPWRAP", "FSEVENTWRAP", "WORKER"].includes(type)) {
      active.set(id, { type, resource, stack: new Error().stack });
    }
  },
  destroy(id) { active.delete(id); },
}).enable();
const snapshot = (stage) => record({ stage, resources: process.getActiveResourcesInfo(),
  active: [...active.values()].filter(({ resource }) => resource.hasRef?.()).map(({ type, resource, stack }) => ({
    type, ms: resource._idleTimeout, repeat: resource._repeat, destroyed: resource._destroyed, stack,
  })),
});
// Diagnostic observation only. The outer owner contains a hung child after
// recording provenance; this timer cannot keep one alive or clear real debt.
setTimeout(() => snapshot("before-containment"), 9000).unref();
process.on("beforeExit", () => snapshot("beforeExit"));
record({ stage: "entry", driver: process.argv.includes("--driver") });
const fixtureURL = new URL("./test-fixtures.mjs", import.meta.url).href;
const identityModule = `import {identity} from ${JSON.stringify(fixtureURL)};`;
const controlRead = `import {readFileSync} from 'node:fs';
const {workspace,inputs}=JSON.parse(readFileSync(${JSON.stringify(path.join(root, "control.json"))}));`;
const replacements = {
  "snapshots.mjs": `${controlRead}
export async function reopenInputs(){return {workspace,inputs};}
export async function verifyIdentity(){return workspace.commonIdentity;}
export async function captureInputs(){throw Error('not capture');}`,
  "prerequisites.mjs": `export async function admitPhase(){return {};}
export async function verifyReceipt(){throw Error('unused');}
export async function verifyInternalSelfTest(){throw Error('unused');}`,
  "server.mjs": `export async function startFixtureServer({arm}){
return {engineUrl:'http://127.0.0.1:1/'+arm,workbenchUrl:'http://127.0.0.1:1/workbench',async close(){}};}`,
  "browser.mjs": `export async function openBrowser(){return {async close(){
    if(${JSON.stringify(mode)}==='cap-close-error')throw Object.assign(Error('actual SDK close failure'),{code:'CONTROLLED_CLOSE'});
  }};}`,
  "phase-runners.mjs": `import {REQUIRED_CHECK_IDS} from './schema-constants.mjs';
export async function runPhase({capabilities}){
  if(${JSON.stringify(mode)}.startsWith('cap'))await new Promise((resolve,reject)=>{
    const stopped=()=>reject(capabilities.signal.reason);
    if(capabilities.signal.aborted)stopped();
    else capabilities.signal.addEventListener('abort',stopped,{once:true});
  });
  if(${JSON.stringify(mode)}==='error')throw Object.assign(Error('genuine controlled failure'),{code:'CONTROLLED_DRIVER'});
  if(${JSON.stringify(mode)}==='disconnect'){
    process.disconnect();
    await capabilities.operation('command','after-disconnect',async()=>{throw Error('must not run');});
  }
  return {requestedStatus:'passed',requestedExitCode:0,stopReason:null,
    checks:REQUIRED_CHECK_IDS.check.filter(id=>id!=='cleanup').map(id=>({id,status:'passed',evidencePaths:[]})),
    summary:{},analysisEligible:false};
}`,
};
if (!control.native) {
  replacements["processes.mjs"] = `${identityModule}
const owners=new WeakMap();
export const processMonitorLifetime=monitor=>owners.get(monitor);
export function createProcessMonitor({lifetime}){
  const monitor={start:async()=>{},_ready:()=>({supervisor:identity(process.pid)}),
    registerRoot:async({pid})=>({identity:identity(pid)}),
    lastObservation:()=>({accountingValid:true,rssBytes:1,peakRssBytes:1,rssLimitExceeded:false,atMonoNs:'1'}),
    fault:()=>null};
  owners.set(monitor,lifetime);return monitor;
}`;
  replacements["watchdog-cleanup.mjs"] = `import {cleanupProofEnd} from "./watchdog-cleanup-context.mjs";
import {proof} from ${JSON.stringify(fixtureURL)};
export function createCleanupController(){let result;return {
  async run(args){
    await new Promise(resolve=>setTimeout(resolve,100));
    await args.settleWorkloadHandles({deadlineMonoMs:cleanupProofEnd(args.cleanupStartMonoMs,args.deadlineMonoMs,args.scope)});
    result=proof(args.scope,args.expectedFinalizer);return result;
  },
  async verifyCleanup(){return result;}
};}`;
}
const replaceOnce = (source, original, replacement) => {
  if (source.split(original).length !== 2) throw Error("test hook exact replacement count");
  return source.replace(original, replacement);
};
registerHooks({
  load(url, context, next) {
    const result = next(url, context);
    if (!url.startsWith(new URL("./", import.meta.url).href)) return result;
    const name = url.split("/").at(-1);
    if (Object.hasOwn(replacements, name)) return { ...result, source: replacements[name] };
    let source = result.source.toString();
    if (name === "cli.mjs" && mode === "normal-retained-timer") {
      source = replaceOnce(source, "const outcome = await runSupervisor(options);", `
        const outcome = await runSupervisor(options);
        const held = setInterval(() => {}, 1000);
        setTimeout(() => {
          clearInterval(held);
          globalThis[Symbol.for('tinyaz.test.record')]({stage:'diagnostic-hold-released'});
        }, 150);`);
    }
    if (name === "schema-constants.mjs") {
      source = replaceOnce(source, "check: 600000", "check: 8000");
      record({ stage: "test-clock", phaseMs: 8000, cleanupMs: 5000 });
    }
    if (name === "run-driver.mjs" && mode === "cap-send-error") {
      source = replaceOnce(source, "send: (frame, callback) => process.send(frame, callback),", `
        send: (frame, callback) => process.send(frame, error => callback(frame.type === 'closed' ?
          Object.assign(Error('actual closed callback failure'), {code:'CONTROLLED_SEND'}) : error)),`);
    }
    if (name === "watchdog-driver.mjs") {
      source = replaceOnce(source, "execArgv: [],", `execArgv: ['--import',${JSON.stringify(import.meta.url)}],`);
      source = replaceOnce(source, "rawFork.settle();\n  // Adopt", `
      child.once('exit',(code,signal)=>record({stage:'driver-exit',childPid:child.pid,code,signal}));
      for(const [which,pipe] of [['stdout',child.stdout],['stderr',child.stderr]]){
        pipe.once('close',()=>record({stage:'driver-pipe-close',childPid:child.pid,which}));
      }
      rawFork.settle();\n  // Adopt`);
      source = `const record=${record.toString().replace("path.join(root, \"diagnostics.jsonl\")", JSON.stringify(path.join(root, "diagnostics.jsonl")))};\n` + source;
      // The inline observer needs its own builtin binding, no runtime API change.
      source = "import {appendFileSync} from 'node:fs';\n" + source;
    }
    return { ...result, source };
  },
});
