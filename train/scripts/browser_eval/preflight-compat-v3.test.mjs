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
  assert.equal(RUNTIME_PATHS.length, 129);
  assert.equal(
    sha256Bytes(canonicalBytes(RUNTIME_PATHS.slice(0, 127))),
    "33e70d7c66132f0804c63ed3a452831ebaec20dabc6dbf5957d47efe8315e3a8",
  );
  assert.deepEqual(RUNTIME_PATHS.slice(127), [
    "train/scripts/browser_eval/resource-quality-schema.mjs",
    "train/scripts/browser_eval/watchdog-operation-context.mjs",
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
