// environment-python-evidence.mjs is the bounded report-and-evidence
// half of the isolated selected-Python software audit. It receives the
// THREE raw child results — the canonical-JSON audit report stdout,
// `pip freeze --all` stdout and `pip check` stdout — plus the selected
// cached torch wheel path from ./environment-python.mjs and runs under
// the caller's SAME borrowed {budget,lifetime} context: the bounded
// report parses through the strict canonical-byte codec, every audited
// RECORD descriptor and the whole cached wheel are re-read through the
// genuine owned backend reader (real lstat, real streamed bytes, real
// close) and the frozen {metadata,packages,setupFiles} triple stays
// pure data — never a PID, clock, workspace, readiness, phase or
// Native proof fact.
//
// This leaf never spawns a child and never mints an owner, deadline or
// queue: its only filesystem reach is realpathSync plus the owned
// reader, each bounded by the borrowed budget handle's live guard
// immediately before AND after every call.
//
// DAG: environment -> environment-python -> environment-python-evidence
// -> pure metadata/reader/canonical helpers. Functional runtime input;
// never a parent, Native or TEST edge.

import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import path from "node:path";

import { parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import {
  capturePythonSetupMetadata,
  createBackendReader,
} from "./process-backend-reader.mjs";
import {
  exactFields,
  isAbs,
  isH,
  isObj,
  isRel,
  nat,
  pos,
  strNE,
} from "./protocol-values.mjs";
import { PYTHON_IMPORTS } from "./schema-constants.mjs";
import { freezeDeep } from "./schema-primitives.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE python-env ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

const PIP_VERSION = "25.2";
// Bounded evidence ceilings: RECORD descriptors, the streamed wheel
// archive and every child stdout/stderr stay hard-capped.
const RECORD_CAP = 4 * 1024 * 1024;
const WHEEL_CAP = 128 * 1024 * 1024;

export async function readPythonEnvironmentEvidence({
  audit,
  freeze,
  check,
  wheelPath,
  context,
  adapters = undefined,
}) {
  // The caller already validated context as EXACTLY {budget,lifetime}
  // — the SAME borrowed BudgetHandle surface and a genuinely branded
  // watchdog lifetime; this leaf only aliases them and mints no owner,
  // deadline or queue of its own.
  const { budget, lifetime } = context;
  const allowed = ["spawn", "statFile", "createStream", "resolvePath"];
  if (adapters !== undefined && (
    !isObj(adapters) || !Object.keys(adapters).every((key) =>
      allowed.includes(key) && typeof adapters[key] === "function")
  )) {
    throw acct("evidence adapters");
  }
  const resolvePath = adapters?.resolvePath ?? realpathSync;
  const statFile = adapters?.statFile ?? ((p) => fsp.lstat(p));
  const createStream = adapters?.createStream ?? ((p) => createReadStream(p));

  // ONE small live-resolve closure: every path canonicalization is
  // bracketed by the SAME borrowed handle's assertLive immediately
  // before AND after the realpathSync call — no second clock or IO
  // owner is introduced here.
  const liveResolve = (literal, tag) => {
    budget.assertLive(tag);
    const resolved = resolvePath(literal);
    budget.assertLive(tag);
    return resolved;
  };

  // The bounded report parses through the strict canonical-byte codec:
  // a malformed, noncanonical or truncated child claim fails closed
  // with the codec's own bounded code, never a fabricated result.
  const report = parseCanonicalBytes(audit.stdout);
  if (
    !isObj(report) ||
    !exactFields(report, [
      "distributions",
      "imports",
      "metadata",
      "pipVersion",
      "torchWheel",
    ])
  ) {
    throw acct("audit report");
  }

  // The raw measured sys metadata is pinned through the genuine
  // capturePythonSetupMetadata helper — version, executable and prefix
  // must equal the selected constants while basePrefix stays the
  // interpreter's RAW alias verbatim.
  const metadata = capturePythonSetupMetadata(report.metadata);
  if (report.pipVersion !== PIP_VERSION) throw acct("audit pip version");

  if (!Array.isArray(report.distributions) || report.distributions.length === 0) {
    throw acct("audit distributions");
  }
  const dists = report.distributions;
  for (const d of dists) {
    if (
      !isObj(d) ||
      !exactFields(d, [
        "buildSha256",
        "name",
        "recordByteLength",
        "recordPath",
        "recordSha256",
        "version",
        "wheelSha256",
      ]) ||
      !isH(d.buildSha256) ||
      !strNE(d.name) ||
      !nat(d.recordByteLength) ||
      !isAbs(d.recordPath) ||
      !isH(d.recordSha256) ||
      !strNE(d.version) ||
      (d.wheelSha256 !== null && !isH(d.wheelSha256))
    ) {
      throw acct("audit distribution");
    }
  }
  for (let i = 1; i < dists.length; i += 1) {
    if (dists[i - 1].name >= dists[i].name) {
      throw acct("audit distribution order");
    }
  }
  for (const [mod, ver] of PYTHON_IMPORTS) {
    if (!dists.some((d) => d.name === mod && d.version === ver)) {
      throw acct(`audit pinned distribution ${mod}`);
    }
  }
  const torchDist = dists.find((d) => d.name === "torch");
  if (torchDist === undefined || torchDist.wheelSha256 === null) {
    throw acct("audit torch wheel");
  }

  const wheel = report.torchWheel;
  if (
    !isObj(wheel) ||
    !exactFields(wheel, [
      "byteLength",
      "generated",
      "installOnly",
      "matchedBytes",
      "matchedHashed",
      "path",
      "recordRows",
      "sha256",
    ]) ||
    wheel.path !== wheelPath ||
    !isH(wheel.sha256) ||
    !pos(wheel.byteLength) ||
    !nat(wheel.matchedBytes) ||
    !nat(wheel.matchedHashed) ||
    !pos(wheel.recordRows) ||
    !Array.isArray(wheel.generated) ||
    !wheel.generated.every(strNE) ||
    !Array.isArray(wheel.installOnly) ||
    !wheel.installOnly.every(strNE) ||
    wheel.sha256 !== torchDist.wheelSha256
  ) {
    throw acct("audit torch wheel");
  }

  const expectedImports = [...PYTHON_IMPORTS].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  );
  if (
    !Array.isArray(report.imports) ||
    report.imports.length !== expectedImports.length
  ) {
    throw acct("audit imports");
  }

  // The canonical selected prefix binds every returned RECORD path and
  // every measured import origin under the actual venv — a reported
  // path escaping it is a closed failure before any read.
  const prefixReal = liveResolve(metadata.prefix, "python prefix");
  for (let i = 0; i < expectedImports.length; i += 1) {
    const imp = report.imports[i];
    if (
      !isObj(imp) ||
      !exactFields(imp, ["module", "origin", "sourceSha256", "version"]) ||
      !isAbs(imp.origin) ||
      !isH(imp.sourceSha256) ||
      !imp.origin.startsWith(`${prefixReal}${path.sep}`) ||
      imp.module !== expectedImports[i][0] ||
      imp.version !== expectedImports[i][1]
    ) {
      throw acct("audit import");
    }
  }

  // The genuine owned reader re-reads each audited RECORD descriptor
  // under the SAME handle/lifetime: lstat proves the literal node is a
  // regular file (no symlink following), the real canonical path must
  // stay under the selected prefix, and the streamed bytes plus real
  // close must equal the child's audited digest/count — full evidence
  // that can be rechecked, never a summary blessed on trust.
  const reader = createBackendReader({
    handle: budget,
    retainActual: lifetime.retainActual,
    statFile,
    createStream,
  });
  const recordFiles = [];
  for (const d of dists) {
    const resolved = liveResolve(d.recordPath, "setup record");
    if (!resolved.startsWith(`${prefixReal}${path.sep}`)) {
      throw acct("setup record confinement");
    }
    const fact = await reader.readFact(d.recordPath, RECORD_CAP, "setup record");
    budget.assertLive("setup record");
    if (fact.sha256 !== d.recordSha256 || fact.buf.length !== d.recordByteLength) {
      throw acct("setup record binding");
    }
    const dirName = path.basename(path.dirname(d.recordPath));
    if (!dirName.endsWith(".dist-info") || path.basename(d.recordPath) !== "RECORD") {
      throw acct("setup record name");
    }
    const setupPath = `inputs/setup/records/${dirName}/RECORD`;
    if (!isRel(setupPath)) throw acct("setup record path");
    recordFiles.push({ path: setupPath, bytes: Buffer.from(fact.buf) });
  }

  // The Node side independently streams and hashes the whole cached
  // wheel through the same owned reader — the child's claimed archive
  // digest/count must equal this real fact, not merely its own report.
  const wheelFact = await reader.readFact(
    liveResolve(wheelPath, "torch wheel"),
    WHEEL_CAP,
    "torch wheel",
    true,
  );
  budget.assertLive("torch wheel");
  if (
    wheelFact.sha256 !== wheel.sha256 ||
    wheelFact.byteLength !== wheel.byteLength
  ) {
    throw acct("torch wheel binding");
  }

  const packages = freezeDeep({
    pipVersion: report.pipVersion,
    pipFreezeSha256: sha256Bytes(freeze.stdout),
    distributions: dists.map((d) => ({
      buildSha256: d.buildSha256,
      name: d.name,
      version: d.version,
      wheelSha256: d.wheelSha256,
    })),
    imports: report.imports.map((imp) => ({
      module: imp.module,
      origin: imp.origin,
      sourceSha256: imp.sourceSha256,
      version: imp.version,
    })),
  });

  // Deterministic evidence files: the bounded audit report, both raw
  // pip outputs and every audited RECORD raw byte payload, each owned
  // by this capture and sorted by its confined setup path.
  const setupFiles = [
    { path: "inputs/setup/python-audit-summary.json", bytes: Buffer.from(audit.stdout) },
    { path: "inputs/setup/python-pip-check.txt", bytes: Buffer.from(check.stdout) },
    { path: "inputs/setup/python-pip-freeze.txt", bytes: Buffer.from(freeze.stdout) },
    ...recordFiles,
  ];
  setupFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (let i = 1; i < setupFiles.length; i += 1) {
    if (setupFiles[i - 1].path === setupFiles[i].path) {
      throw acct("setup files duplicate");
    }
  }
  budget.assertLive("python environment");
  return Object.freeze({
    metadata,
    packages,
    setupFiles: Object.freeze(setupFiles.map((f) => Object.freeze(f))),
  });
}
