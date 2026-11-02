// Executable/Python/backend/environment/CommonIdentity validation built on
// schema-primitives.mjs and schema-constants.mjs only. record-schema.mjs
// re-exports the two public entrypoints unchanged.

import {
  arr,
  CHECK,
  deepEqual,
  eqLiteral,
  oneOf,
  schemaFail,
  shape,
  sortedRefs,
  sortedUnique,
} from "./schema-primitives.mjs";
import {
  BASELINE_COMMIT,
  FIXTURE_PATHS,
  MODEL_IDENTITY,
  PROTOCOL_IDS,
  PYTHON_EXECUTABLE,
  PYTHON_IMPORTS,
  PYTHON_MODULES,
  PYTHON_PREFIX,
  PYTHON_VERSION,
} from "./schema-constants.mjs";

const FILE_SPEC = { invocationPath: "abs", realPath: "abs", sha256: "hash" };
const EXEC_SPEC = { ...FILE_SPEC, version: "strNE" };
const PY_EXEC_SPEC = {
  ...EXEC_SPEC,
  executable: "abs",
  prefix: "abs",
  basePrefix: "abs",
};

// The selected Python identity is pinned to the project venv executable and
// CPython 3.11.14 exactly; the resolved real path and base prefix remain
// absolute strings so an actual resolved binary differs per install.
const vPyExec = (v, n) => {
  shape(v, PY_EXEC_SPEC, n);
  if (
    v.invocationPath !== PYTHON_EXECUTABLE ||
    v.executable !== PYTHON_EXECUTABLE ||
    v.prefix !== PYTHON_PREFIX ||
    v.version !== PYTHON_VERSION
  ) {
    schemaFail("SCHEMA_LITERAL", `${n} selected python`);
  }
};
const REF_SPEC = { path: "relPath", byteLength: "nat", sha256: "hash" };

const vOs = (v, n) => {
  shape(
    v,
    { platform: "strNE", arch: "strNE", release: "strNE", version: "strNE", build: "strNE" },
    n,
  );
  if (v.platform !== "darwin" || v.arch !== "arm64") {
    schemaFail("SCHEMA_LITERAL", `${n} platform/arch`);
  }
};

const vPyEnv = (v, n) => {
  shape(
    v,
    {
      runtime: "obj",
      pipVersion: "strNE",
      pipFreezeSha256: "hash",
      distributions: "list",
      imports: "list",
    },
    n,
  );
  vPyExec(v.runtime, `${n}.runtime`);
  if (v.pipVersion !== "25.2") schemaFail("SCHEMA_LITERAL", `${n}.pipVersion`);
  const names = [];
  let torchWheel = false;
  for (const [i, d] of v.distributions.entries()) {
    const dn = `${n}.distributions[${i}]`;
    if (!CHECK.obj(d)) schemaFail("SCHEMA_TYPE", dn);
    const spec = { name: "strNE", version: "strNE", buildSha256: "hash" };
    const keys = Object.keys(d);
    const allowed = ["name", "version", "buildSha256", "wheelSha256"];
    for (const f of Object.keys(spec)) {
      if (!(f in d) || d[f] === undefined) schemaFail("SCHEMA_MISSING", `${dn}.${f}`);
    }
    if (!("wheelSha256" in d)) schemaFail("SCHEMA_MISSING", `${dn}.wheelSha256`);
    for (const k of keys) {
      if (!allowed.includes(k)) schemaFail("SCHEMA_EXTRA", `${dn}.${k}`);
    }
    for (const f of keys) {
      if (f === "wheelSha256") {
        if (d[f] !== null && !CHECK.hash(d[f])) schemaFail("SCHEMA_FORMAT", `${dn}.${f}`);
      } else if (!CHECK[spec[f]](d[f])) {
        schemaFail("SCHEMA_FORMAT", `${dn}.${f}`);
      }
    }
    names.push(d.name);
    if (d.name === "torch") torchWheel = d.wheelSha256 !== null;
  }
  sortedUnique(names, `${n}.distributions`);
  if (!torchWheel) schemaFail("SCHEMA_COHERENCE", `${n}.distributions torch wheel`);
  for (const [mod, ver] of PYTHON_IMPORTS) {
    if (!v.distributions.some((d) => d.name === mod && d.version === ver)) {
      schemaFail("SCHEMA_COHERENCE", `${n}.distributions ${mod}`);
    }
  }
  const expected = [...PYTHON_IMPORTS].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const imports = arr(v.imports, `${n}.imports`);
  if (imports.length !== expected.length) schemaFail("SCHEMA_LITERAL", `${n}.imports`);
  imports.forEach((imp, i) => {
    shape(
      imp,
      { module: "strNE", origin: "abs", version: "strNE", sourceSha256: "hash" },
      `${n}.imports[${i}]`,
    );
    if (imp.module !== expected[i][0] || imp.version !== expected[i][1]) {
      schemaFail("SCHEMA_LITERAL", `${n}.imports[${i}]`);
    }
  });
};

const vDeps = (v, n) => {
  shape(v, { packageLockSha256: "hash", packages: "list" }, n);
  const names = [];
  arr(v.packages, `${n}.packages`).forEach((p, i) => {
    shape(p, { name: "strNE", version: "strNE", buildSha256: "hash" }, `${n}.packages[${i}]`);
    names.push(p.name);
  });
  sortedUnique(names, `${n}.packages`);
};

const vLaunch = (v, n) => {
  shape(
    v,
    {
      host: "strNE",
      headless: "bool",
      viewport: "obj",
      deviceScaleFactor: "nat",
      args: "list",
      securityOptionsSha256: "hash",
    },
    n,
  );
  if (v.host !== "127.0.0.1" || v.headless !== true || v.deviceScaleFactor !== 1) {
    schemaFail("SCHEMA_LITERAL", n);
  }
  shape(v.viewport, { width: "nat", height: "nat" }, `${n}.viewport`);
  if (v.viewport.width !== 1280 || v.viewport.height !== 800) {
    schemaFail("SCHEMA_LITERAL", `${n}.viewport`);
  }
  arr(v.args, `${n}.args`).forEach((a, i) => {
    if (typeof a !== "string") schemaFail("SCHEMA_FORMAT", `${n}.args[${i}]`);
  });
};

export function assertBackendIdentity(value) {
  const n = "BackendIdentity";
  shape(
    value,
    { backendId: "strNE", os: "obj", python: "obj", helpers: "list", libproc: "obj", lsof: "obj" },
    n,
  );
  if (value.backendId !== "darwin-arm64-libproc-v1") {
    schemaFail("SCHEMA_LITERAL", `${n}.backendId`);
  }
  vOs(value.os, `${n}.os`);
  vPyExec(value.python, `${n}.python`);
  sortedRefs(value.helpers, `${n}.helpers`);
  shape(value.libproc, { path: "strNE", abi: "obj", image: "obj" }, `${n}.libproc`);
  if (value.libproc.path !== "/usr/lib/libproc.dylib") {
    schemaFail("SCHEMA_LITERAL", `${n}.libproc.path`);
  }
  eqLiteral(value.libproc.abi, { bsdInfoSize: 136, taskInfoSize: 96 }, `${n}.libproc.abi`);
  const img = value.libproc.image;
  if (img.kind === "file") {
    shape(img, { kind: "strNE", sha256: "hash" }, `${n}.libproc.image`);
  } else if (img.kind === "OS_SHARED_CACHE") {
    shape(img, { kind: "strNE", osBuild: "strNE" }, `${n}.libproc.image`);
  } else {
    schemaFail("SCHEMA_LITERAL", `${n}.libproc.image.kind`);
  }
  shape(value.lsof, FILE_SPEC, `${n}.lsof`);
  if (value.lsof.invocationPath !== "/usr/sbin/lsof") {
    schemaFail("SCHEMA_LITERAL", `${n}.lsof`);
  }
}

const vEnvironment = (v, n) => {
  shape(
    v,
    {
      node: "obj",
      python: "obj",
      dependencies: "obj",
      chromium: "obj",
      launch: "obj",
      os: "obj",
      hardware: "obj",
      monitoring: "obj",
    },
    n,
  );
  shape(v.node, EXEC_SPEC, `${n}.node`);
  vPyEnv(v.python, `${n}.python`);
  vDeps(v.dependencies, `${n}.dependencies`);
  shape(v.chromium, EXEC_SPEC, `${n}.chromium`);
  vLaunch(v.launch, `${n}.launch`);
  vOs(v.os, `${n}.os`);
  shape(
    v.hardware,
    { model: "strNE", cpuModel: "strNE", logicalCpus: "pos", physicalMemoryBytes: "pos" },
    `${n}.hardware`,
  );
  assertBackendIdentity(v.monitoring);
  if (!deepEqual(v.monitoring.os, v.os)) schemaFail("SCHEMA_COHERENCE", `${n}.monitoring.os`);
  if (!deepEqual(v.monitoring.python, v.python.runtime)) {
    schemaFail("SCHEMA_COHERENCE", `${n}.monitoring.python`);
  }
};

export function assertCommonIdentity(value) {
  const n = "CommonIdentity";
  shape(
    value,
    {
      candidate: "obj",
      baseline: "obj",
      harness: "obj",
      pythonReference: "obj",
      fixtures: "obj",
      model: "obj",
      baselineNormalization: "obj",
      conventions: "obj",
      environment: "obj",
    },
    n,
  );
  const c = value.candidate;
  if (!CHECK.obj(c)) schemaFail("SCHEMA_TYPE", `${n}.candidate`);
  const cAllowed = ["kind", "commit", "contentSha256"];
  for (const f of cAllowed) {
    if (!(f in c) || c[f] === undefined) schemaFail("SCHEMA_MISSING", `${n}.candidate.${f}`);
  }
  for (const k of Object.keys(c)) {
    if (!cAllowed.includes(k)) schemaFail("SCHEMA_EXTRA", `${n}.candidate.${k}`);
  }
  if (!CHECK.strNE(c.kind)) schemaFail("SCHEMA_FORMAT", `${n}.candidate.kind`);
  oneOf(c.kind, ["commit", "WORKTREE"], `${n}.candidate.kind`);
  if (!CHECK.hash(c.contentSha256)) schemaFail("SCHEMA_FORMAT", `${n}.candidate.contentSha256`);
  if (c.kind === "commit" ? !CHECK.commit(c.commit) : c.commit !== null) {
    schemaFail("SCHEMA_LITERAL", `${n}.candidate.commit`);
  }
  shape(value.baseline, { commit: "commit", contentSha256: "hash" }, `${n}.baseline`);
  if (value.baseline.commit !== BASELINE_COMMIT) {
    schemaFail("SCHEMA_LITERAL", `${n}.baseline.commit`);
  }
  shape(value.harness, { contentSha256: "hash", files: "list" }, `${n}.harness`);
  sortedRefs(value.harness.files, `${n}.harness.files`);
  shape(value.pythonReference, { contentSha256: "hash", files: "list" }, `${n}.pythonReference`);
  sortedRefs(value.pythonReference.files, `${n}.pythonReference.files`);
  eqLiteral(
    value.pythonReference.files.map((f) => f.path),
    [...PYTHON_MODULES],
    `${n}.pythonReference.files`,
  );
  shape(value.fixtures, { protocol: "obj", parity: "obj", openings: "obj" }, `${n}.fixtures`);
  for (const key of Object.keys(FIXTURE_PATHS)) {
    shape(value.fixtures[key], REF_SPEC, `${n}.fixtures.${key}`);
    if (value.fixtures[key].path !== FIXTURE_PATHS[key]) {
      schemaFail("SCHEMA_LITERAL", `${n}.fixtures.${key}.path`);
    }
  }
  eqLiteral(value.model, MODEL_IDENTITY, `${n}.model`);
  shape(
    value.baselineNormalization,
    { requestPath: "strNE", responseSha256: "hash", provenance: "strNE" },
    `${n}.baselineNormalization`,
  );
  const bn = value.baselineNormalization;
  if (
    bn.requestPath !== "/weights/tinyaz-s.bin" ||
    bn.responseSha256 !== MODEL_IDENTITY.sha256 ||
    bn.provenance !== "controlled-delivery-plus-ready"
  ) {
    schemaFail("SCHEMA_LITERAL", `${n}.baselineNormalization`);
  }
  eqLiteral(value.conventions, PROTOCOL_IDS, `${n}.conventions`);
  vEnvironment(value.environment, `${n}.environment`);
}
