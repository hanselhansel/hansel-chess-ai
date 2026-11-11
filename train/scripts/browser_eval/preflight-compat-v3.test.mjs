// TEST ONLY. Exact capacity roster and import closure; no V3 activation.
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { RUNTIME_PATHS } from "./snapshot-files.mjs";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("runtime closure is explicit, unique and includes every new runtime helper", async () => {
  assert.equal(sha256Bytes(canonicalBytes(RUNTIME_PATHS.slice(0, 115))), "97b329e3639dc91b101060a307477bccae7b6d437daee777fa79e939d3bfd3d1");
  assert.equal(sha256Bytes(canonicalBytes(RUNTIME_PATHS.slice(0, 115).filter(
    name => name !== "train/scripts/browser_eval/footprint-trace.mjs"))),
  "589718eeec8baf88eff67f72584167d2f3a30dcf21473fc0081ca0656ad58c0e");
  assert.deepEqual(RUNTIME_PATHS.slice(115, 127), ["train/fixtures/browser-protocol-v2.json",
    ...["evaluation-policy", "resource-quality", "verdicts-v2", "record-fields", "record-schema-v2",
      "receipt-verdicts-v2", "process-runtime-start", "watchdog-resource-policy", "watchdog-verdict-policy",
      "record-finalization-v2", "receipt-verification-v2"].map(name => `train/scripts/browser_eval/${name}.mjs`)]);
  assert.equal(RUNTIME_PATHS.length, 135);
  assert.equal(
    sha256Bytes(canonicalBytes(RUNTIME_PATHS.slice(0, 127))),
    "33e70d7c66132f0804c63ed3a452831ebaec20dabc6dbf5957d47efe8315e3a8",
  );
  assert.deepEqual(RUNTIME_PATHS.slice(127), [
    "train/scripts/browser_eval/resource-quality-schema.mjs",
    "train/scripts/browser_eval/watchdog-operation-context.mjs",
    "train/fixtures/browser-protocol-v3.json",
    ...["preflight-readiness-v3", "preflight-evidence-v3", "verdicts-v3", "record-finalization-v3",
      "process-preflight-quality"].map((name) => `train/scripts/browser_eval/${name}.mjs`),
  ]);
  for (const filename of RUNTIME_PATHS) assert.equal((await fsp.stat(path.join(SOURCE, filename))).isFile(), true);
  assert.equal(new Set(RUNTIME_PATHS).size, RUNTIME_PATHS.length);
  assert.equal(Object.isFrozen(RUNTIME_PATHS), true);
  for (const name of ["accounting-trace", "footprint-trace", "private-fs", "process-listeners", "snapshot-files", "snapshot-io", "snapshot-identity", "environment-files", "fixture-numeric", "watchdog-cleanup-context", "watchdog-faults"]) {
    assert.equal(RUNTIME_PATHS.includes(`train/scripts/browser_eval/${name}.mjs`), true);
  }
  const isTestPath = (name) => /\.test\.mjs$|(?:^|[/-])test-|README/.test(name);
  assert.equal(RUNTIME_PATHS.some(isTestPath), false);
  assert.equal(isTestPath("train/scripts/browser_eval/native-test-harness.mjs"), true);
  assert.equal(isTestPath("train/scripts/browser_eval/native-test-io.mjs"), true);
  assert.equal(isTestPath("train/scripts/browser_eval/watchdog-selftest-operation.mjs"), false);
});

test("current runtime closes every static and dynamic relative import", async () => {
  const members = new Set(RUNTIME_PATHS);
  const deferredExternal = new Map([
    ["train/scripts/browser_eval/browser.mjs", "name"],
    ["train/scripts/browser_eval/server.mjs", "pathToFileURL(require.resolve(name)).href"],
  ]);
  for (const filename of RUNTIME_PATHS) {
    assert.equal(/(?:^|\/)(?:docs|\.superpowers)\//.test(filename), false, filename);
    if (!filename.endsWith(".mjs")) continue;
    const source = await fsp.readFile(path.join(SOURCE, filename), "utf8");
    const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    assert.equal(tree.parseDiagnostics.length, 0, filename);
    const imports = [];
    const visit = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) imports.push(node.moduleSpecifier);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert.equal(node.arguments.length, 1, filename);
        const argument = node.arguments[0];
        if (!ts.isStringLiteralLike(argument)) {
          assert.equal(argument.getText(tree), deferredExternal.get(filename), filename);
        }
        imports.push(argument);
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    for (const specifier of imports) {
      if (!ts.isStringLiteralLike(specifier) || !specifier.text.startsWith(".")) continue;
      const resolved = path.resolve(SOURCE, path.dirname(filename), specifier.text);
      const relative = path.relative(SOURCE, resolved).split(path.sep).join("/");
      assert.equal(members.has(relative), true, `${filename} -> ${specifier.text}`);
      assert.equal((await fsp.stat(resolved)).isFile(), true, relative);
    }
  }
});

import { V2_POLICY, V3_POLICY, policyForProtocol, protocolPathForPolicy, isPeriodicQualityPhase, assertPolicyBinding } from "./evaluation-policy.mjs";
import { assertRecord } from "./record-schema.mjs";
import { factsV3, createV3GraphFixture } from "./preflight-v3-test-fixtures.mjs";
import { deriveVerdictsV3 } from "./verdicts-v3.mjs";
import { child, snapshotChild } from "./separate-verdicts-compat-fixtures.mjs";
import { createProtocolValidator } from "./supervisor-protocol.mjs";

test("exact policy/path/layout cross product and ordered soft phases reject mixed selection", async () => {
  const protocols = await Promise.all(["browser-protocol.json", "browser-protocol-v2.json", "browser-protocol-v3.json"]
    .map(async (name) => JSON.parse(await fsp.readFile(path.join(SOURCE, "train/fixtures", name)))));
  const policies = [null, V2_POLICY, V3_POLICY];
  for (let selected = 0; selected < 3; selected += 1) {
    const protocolPath = protocolPathForPolicy(policies[selected]);
    assert.deepEqual(policyForProtocol(protocols[selected], protocolPath), policies[selected]);
    for (let other = 0; other < 3; other += 1) if (other !== selected)
      assert.throws(() => policyForProtocol(protocols[other], protocolPath));
  }
  for (const value of [undefined, {}, { ...V3_POLICY, extra: 1 },
    { ...V3_POLICY, softPhases: ["compare", "preflight"] }, { ...V3_POLICY, softPhase: "compare" },
    { ...V3_POLICY, recordSchemaVersion: true }]) assert.throws(() => protocolPathForPolicy(value));
  assert.throws(() => assertPolicyBinding({ schemaVersion: 2, evaluationPolicy: null,
    protocolPath: "train/fixtures/browser-protocol.json" }));
  assert.throws(() => createProtocolValidator({ runId: "no-schema2-inference", recordSchemaVersion: 2, evaluationPolicy: null }));
  assert.equal(isPeriodicQualityPhase(V3_POLICY, "preflight"), true);
  assert.equal(isPeriodicQualityPhase(V2_POLICY, "preflight"), false);
  for (const phase of ["check", "parity", "watchdog-selftest"]) assert.equal(isPeriodicQualityPhase(V3_POLICY, phase), false);
});

test("V3 readiness is a closed final/completion variant; V2 rejects it", async (t) => {
  const f = await createV3GraphFixture(t, { gap: false });
  assert.doesNotThrow(() => assertRecord("final", f.preflight.final));
  assert.doesNotThrow(() => assertRecord("completion", f.preflight.completion));
  for (const record of [f.preflight.final, f.preflight.completion]) {
    const kind = record.kind === "tinyaz-phase-completion" ? "completion" : "final";
    const missing = structuredClone(record); delete missing.scientificReadinessVerdict;
    assert.throws(() => assertRecord(kind, missing));
    const mixed = { ...record, evaluationPolicy: V2_POLICY };
    assert.throws(() => assertRecord(kind, mixed));
    const extra = { ...record, scientificReadinessVerdict: { status: "ready", reasons: [], fake: true } };
    assert.throws(() => assertRecord(kind, extra));
  }
});

test("actual V3 hello/start envelopes bind exact selected policy", () => {
  const protocol = createProtocolValidator({ runId: "wire-v3", recordSchemaVersion: 2, evaluationPolicy: V3_POLICY });
  const message = { protocolVersion: 1, seq: 0, runId: "wire-v3", type: "hello", pid: 123,
    phase: "preflight", commonIdentitySha256: "a".repeat(64), recordSchemaVersion: 2, evaluationPolicy: V3_POLICY };
  // Existing wire version field is kept exact by the protocol owner.
  delete message.protocolVersion; message.ipcVersion = 1;
  assert.doesNotThrow(() => protocol.accept("driver", "d2s", message, Buffer.byteLength(JSON.stringify(message))));
  const start = { ipcVersion: 1, seq: 0, runId: "wire-v3", type: "start", manifestPath: "preflight/manifest.json",
    commonIdentitySha256: "a".repeat(64), recordSchemaVersion: 2, evaluationPolicy: V3_POLICY };
  assert.doesNotThrow(() => protocol.accept("driver", "s2d", start, Buffer.byteLength(JSON.stringify(start))));
  const wrong = createProtocolValidator({ runId: "wire-v3", recordSchemaVersion: 2, evaluationPolicy: V3_POLICY });
  assert.throws(() => wrong.accept("driver", "d2s", { ...message, evaluationPolicy: V2_POLICY }, 100));
  assert.throws(() => protocol.accept("driver", "d2s", { ipcVersion: 1, seq: 1, runId: "wire-v3", type: "finish",
    requestedStatus: "passed", requestedExitCode: 0, stopReason: null, checks: [], summary: {}, analysisEligible: false,
    scientificReadinessVerdict: { status: "ready", reasons: [] } }, 200));
});

test("V3 Python selector rejects bool/mixed/reordered policies under actual selected module", async () => {
  const code = `import importlib.util,json,copy
s=importlib.util.spec_from_file_location("selection",${JSON.stringify(path.join(SOURCE, "train/scripts/check_browser_parity.py"))})
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=json.load(open(${JSON.stringify(path.join(SOURCE, "train/fixtures/browser-protocol-v3.json"))}))
w={"schemaVersion":2,"commonIdentity":{"evaluationPolicy":copy.deepcopy(m.V3_POLICY),"fixtures":{"protocol":{"path":m.V3_PROTOCOL}}}}
assert m.validate_selection(w,m.V3_PROTOCOL,p)==2
for mutation in ("bool","order","extra","path"):
 q=copy.deepcopy(p);x=copy.deepcopy(w)
 if mutation=="bool": q["schemaVersion"]=True
 if mutation=="order": q["evaluationPolicy"]["softPhases"].reverse()
 if mutation=="extra": q["evaluationPolicy"]["extra"]=1
 try: m.validate_selection(x,m.V2_PROTOCOL if mutation=="path" else m.V3_PROTOCOL,q)
 except Exception: pass
 else: raise AssertionError(mutation)
print("V3 Python selector accepted exact policy and rejected four malformed variants")
`;
  const result = await child(path.join(SOURCE, "train/.venv/bin/python"), ["-c", code]);
  assert.equal(result.exit, 0, result.stderr);
});

test("V3 W shared/graph have acyclic side-effect-free source dependencies and exact eight scripts", async () => {
  const W = path.join(SOURCE, ".superpowers/sdd/2026-11-06-tinyaz-fault-repair-and-full-comparison");
  const shared = await fsp.readFile(path.join(W, "separate-verdicts-shared-v3.mjs"), "utf8");
  const graph = await fsp.readFile(path.join(W, "separate-verdicts-graph-v3.mjs"), "utf8");
  for (const source of [shared, graph]) {
    assert.equal(/from ['"].*owned-command|from ['"].*verify-phase/.test(source), false);
    const tree = ts.createSourceFile("operator.mjs", source, ts.ScriptTarget.Latest, true);
    assert.equal(tree.parseDiagnostics.length, 0);
    for (const statement of tree.statements) {
      if (ts.isExpressionStatement(statement)) assert.fail("import-time expression statement");
    }
  }
  const template = JSON.parse(await fsp.readFile(path.join(W, "separate-verdicts-release-v3.template.json")));
  assert.equal(template.schemaVersion, 3);
  assert.equal(template.status, "PREPARATION_ONLY");
  assert.deepEqual(Object.keys(template.orchestrationScriptsSha256).sort(), ["task-3-stream.mjs", "task-3-process-owner.mjs",
    "task-3-control-child.mjs", "separate-verdicts-shared-v3.mjs", "separate-verdicts-graph-v3.mjs",
    "separate-verdicts-owned-command-v3.mjs", "separate-verdicts-verify-phase-v3.mjs", "separate-verdicts-owner-controls-v3.mjs"].sort());
});

import os from "node:os";
import { createCompatRepo, writableRemove } from "./separate-verdicts-compat-fixtures.mjs";
test("actual V3 snapshot capture/archive reopen preserves selection and rejects frozen protocol tamper", async (t) => {
  const base = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "v3-selected-archive-")));
  let workspaceRoot;
  t.after(async () => {
    if (workspaceRoot) await writableRemove(workspaceRoot);
    await fsp.rm(base, { recursive: true, force: true });
  });
  const repoRoot = await createCompatRepo(base);
  workspaceRoot = path.join(base, "workspace");
  const selected = "train/fixtures/browser-protocol-v3.json";
  const missingSelection = await snapshotChild("capture", workspaceRoot, selected, {}, repoRoot);
  assert.notEqual(missingSelection.exit, 0);
  assert.match(missingSelection.stderr, /capture policy selection/);
  const captured = await snapshotChild("capture", workspaceRoot, selected, { evaluationPolicy: V3_POLICY }, repoRoot);
  assert.equal(captured.exit, 0, captured.stderr);
  const workspace = JSON.parse(captured.stdout.trim());
  assert.equal(workspace.schemaVersion, 2);
  assert.deepEqual(workspace.commonIdentity.evaluationPolicy, V3_POLICY);
  assert.equal(workspace.commonIdentity.fixtures.protocol.path, selected);
  const reopened = await snapshotChild("reopen", workspaceRoot, selected, {}, repoRoot);
  assert.equal(reopened.exit, 0, reopened.stderr);
  assert.deepEqual(JSON.parse(reopened.stdout.trim()), workspace);
  const protocol = path.join(workspaceRoot, "inputs/harness", selected);
  const originalMode = (await fsp.stat(protocol)).mode & 0o777;
  await fsp.chmod(protocol, 0o644);
  try { await fsp.appendFile(protocol, "\n"); }
  finally { await fsp.chmod(protocol, originalMode); }
  const tampered = await snapshotChild("reopen", workspaceRoot, selected, {}, repoRoot);
  assert.notEqual(tampered.exit, 0);
  assert.match(tampered.stderr, /selected protocol bytes|frozen|identity/i);
});


import { createResourceQuality, assertResourceEvidence } from "./resource-quality.mjs";
import { verifyResourcePrefixExtension } from "./receipt-verdicts-v2.mjs";

test("hard observed peak exception is V3-only and cannot mint admitted clocks or peak", () => {
  const q = createResourceQuality({ runId: "R1", phase: "preflight", evaluationPolicy: V3_POLICY });
  q.markHard("NATIVE"); q.noteObservedAggregate(4294967297);
  const actual = q.snapshot();
  assert.doesNotThrow(() => assertResourceEvidence(actual));
  for (const mutate of [v => { v.policyId = V2_POLICY.policyId; }, v => { v.hardReasons = []; },
    v => { v.hardReasons = ["TIMESTAMP"]; }, v => { v.peakRssBytes = 1; },
    v => { v.lastCompleteNs = "1"; }, v => { v.rssLimitExceeded = false; }]) {
    const bad = structuredClone(actual); mutate(bad);
    assert.throws(() => assertResourceEvidence(bad));
  }
});

test("real graph extends prior soft checkpoint by hard observed cap without a completion", async (t) => {
  const q = createResourceQuality({ runId: "run-preflight", phase: "preflight", evaluationPolicy: V3_POLICY });
  q.bootstrap({ startedNs: "0", finishedNs: "10", nativeMaxDurationNs: "1", rssBytes: 4,
    requestId: "bootstrap", handleLive: true });
  q.complete({ startedNs: "10", finishedNs: "500000011", nativeMaxDurationNs: "500000001", rssBytes: 4,
    requestId: "soft", handleLive: true });
  const before = q.snapshot();
  const checkpoint = { rssBytes: 4, peakRssBytes: 4, observedPeakRssBytes: 4, rssLimitExceeded: false,
    accountingValid: true, atMonoNs: before.lastCompleteNs, qualityCheckpoint: q.checkpoint(before.lastCompleteNs) };
  q.markHard("NATIVE"); q.noteObservedAggregate(4294967297); q.close(before.lastCompleteNs);
  const final = q.snapshot();
  assert.equal(final.completedCycles, before.completedCycles);
  assert.equal(final.timelyCycles, before.timelyCycles);
  assert.equal(final.lastCompleteNs, before.lastCompleteNs);
  assert.equal(final.peakRssBytes, before.peakRssBytes);
  assert.equal(final.lateDrops.count, 0);
  const f = await createV3GraphFixture(t, { preflightResourceEvidence: final, preflightCheckpoint: checkpoint });
  assert.equal(f.preflight.final.scientificReadinessVerdict.status, "unready");
  assert.notEqual(f.preflight.final.strengthVerdict.status, "eligible");
  assert.equal(f.preflight.final.resourceEvidence.observedPeakRssBytes, 4294967297);
  assert.doesNotThrow(() => verifyResourcePrefixExtension(f.nested.final.resourceEvidence, final));
  const noHard = structuredClone(final); noHard.hardReasons = [];
  await assert.rejects(createV3GraphFixture(t, { preflightResourceEvidence: noHard, preflightCheckpoint: checkpoint }),
    /observed peak without completion/);
  for (const mutate of [v => { v.peakRssBytes = 4294967297; },
    v => { v.lastTimelyNs = "11"; }]) {
    const bad = structuredClone(final); mutate(bad);
    assert.throws(() => verifyResourcePrefixExtension(f.nested.final.resourceEvidence, bad));
  }
});


import { v3Workspace } from "./preflight-v3-test-fixtures.mjs";

test("review regression: public schema2 manifest rejects null policy directly", async (t) => {
  const f = await createV3GraphFixture(t);
  for (const evaluationPolicy of [V2_POLICY, V3_POLICY])
    assert.doesNotThrow(() => assertRecord("manifest", { ...f.main.manifest, evaluationPolicy }));
  assert.equal(protocolPathForPolicy(null), "train/fixtures/browser-protocol.json");
  assert.throws(() => assertRecord("manifest", { ...f.main.manifest, evaluationPolicy: null }));
});

test("review regression: public schema2 completion rejects null policy directly", async (t) => {
  const f = await createV3GraphFixture(t), v2 = { ...f.check.completion, evaluationPolicy: V2_POLICY };
  delete v2.scientificReadinessVerdict;
  assert.doesNotThrow(() => assertRecord("completion", v2));
  assert.doesNotThrow(() => assertRecord("completion", f.check.completion));
  assert.throws(() => assertRecord("completion", { ...v2, evaluationPolicy: null }));
});

test("review regression: actual Python CLI accepts all fixed selected protocols before candidate binding", async (t) => {
  const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "v3-python-cli-selection-")));
  t.after(() => writableRemove(root));
  for (const evaluationPolicy of [null, V2_POLICY, V3_POLICY]) {
    const workspace = v3Workspace(), selected = protocolPathForPolicy(evaluationPolicy);
    workspace.schemaVersion = evaluationPolicy === null ? 1 : 2;
    if (evaluationPolicy === null) delete workspace.commonIdentity.evaluationPolicy;
    else workspace.commonIdentity.evaluationPolicy = evaluationPolicy;
    const bytes = await fsp.readFile(path.join(SOURCE, selected));
    workspace.commonIdentity.fixtures.protocol = { path: selected, byteLength: bytes.length, sha256: sha256Bytes(bytes) };
    assertRecord("workspace", workspace);
    const out = path.join(root, evaluationPolicy?.policyId ?? "v1");
    const frozen = path.join(out, "inputs/harness", selected);
    await fsp.mkdir(path.dirname(frozen), { recursive: true });
    await fsp.writeFile(frozen, bytes, { mode: 0o444 });
    await fsp.writeFile(path.join(out, "workspace.json"), canonicalBytes(workspace), { mode: 0o444 });
    for (const protocol of [selected, path.join(SOURCE, selected)]) {
      const result = await child(path.join(SOURCE, "train/.venv/bin/python"), ["-I", "-B",
        path.join(SOURCE, "train/scripts/check_browser_parity.py"), "--protocol", protocol,
        "--candidate", "WORKTREE", "--out", out]);
      assert.notEqual(result.exit, 0);
      assert.match(result.stderr, /PARITY_BOOTSTRAP_INVALID requested WORKTREE binding/);
      assert.doesNotMatch(result.stderr, /PARITY_BOOTSTRAP_INVALID fixed protocol/);
    }
  }
});
