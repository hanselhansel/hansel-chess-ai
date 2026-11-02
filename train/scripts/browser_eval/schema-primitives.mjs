// Strict shared primitive and closed-shape checks plus bounded schema
// failures. Leaf module: no schema or constant back-import. Every check
// rejects implicit coercions; string-shaped primitives require actual
// strings.

const RE_H = /^[0-9a-f]{64}$/;
const RE_COMMIT = /^[0-9a-f]{40}$/;
const RE_U64 = /^(0|[1-9][0-9]{0,19})$/;
const RE_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const U64_MAX = 18446744073709551615n;

export const schemaFail = (code, detail) => {
  const error = new Error(`record-schema ${code}: ${detail}`);
  error.code = code;
  throw error;
};

export const freezeDeep = (value) => {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) freezeDeep(value[key]);
  }
  return Object.freeze(value);
};

export const isPlainObject = (v) => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
};

export const isRelPath = (v) =>
  typeof v === "string" &&
  v.length > 0 &&
  !v.includes("\\") &&
  !v.includes("\0") &&
  !v.startsWith("/") &&
  !v.endsWith("/") &&
  !v.split("/").some((p) => p === "" || p === "." || p === "..");

export const CHECK = {
  obj: isPlainObject,
  list: (v) => Array.isArray(v),
  nullObj: (v) => v === null || isPlainObject(v),
  abs: (v) => typeof v === "string" && v.startsWith("/") && !v.includes("\0") && !v.includes("\\"),
  str: (v) => typeof v === "string",
  strNE: (v) => typeof v === "string" && v.length > 0,
  hash: (v) => typeof v === "string" && RE_H.test(v),
  commit: (v) => typeof v === "string" && RE_COMMIT.test(v),
  u64: (v) => typeof v === "string" && RE_U64.test(v) && BigInt(v) <= U64_MAX,
  nat: (v) => Number.isSafeInteger(v) && v >= 0,
  pos: (v) => Number.isSafeInteger(v) && v > 0,
  int: (v) => Number.isSafeInteger(v),
  bool: (v) => typeof v === "boolean",
  pid: (v) => Number.isSafeInteger(v) && v >= 1 && v <= 2147483647,
  port: (v) => Number.isSafeInteger(v) && v >= 1 && v <= 65535,
  usec: (v) => Number.isSafeInteger(v) && v >= 0 && v <= 999999,
  utc: (v) => typeof v === "string" && RE_UTC.test(v) && !Number.isNaN(Date.parse(v)),
  relPath: isRelPath,
};

export const arr = (v, n) => {
  if (!Array.isArray(v)) schemaFail("SCHEMA_TYPE", n);
  return v;
};

export const oneOf = (v, list, n) => {
  if (!list.includes(v)) schemaFail("SCHEMA_LITERAL", n);
};

// Closed shape check: `spec` maps required field names to CHECK keys. Missing,
// extra or format-mismatched fields each fail with a bounded code.
export const shape = (v, spec, n) => {
  if (!isPlainObject(v)) schemaFail("SCHEMA_TYPE", n);
  const names = Object.keys(spec);
  for (const f of names) {
    if (!(f in v) || v[f] === undefined) schemaFail("SCHEMA_MISSING", `${n}.${f}`);
  }
  for (const k of Object.keys(v)) {
    if (!names.includes(k)) schemaFail("SCHEMA_EXTRA", `${n}.${k}`);
  }
  for (const f of names) {
    if (!CHECK[spec[f]](v[f])) schemaFail("SCHEMA_FORMAT", `${n}.${f}`);
  }
};

// Closed-shape check without CHECK values, for callers that validate fields
// individually after name verification.
export const exactOnly = (v, names, n) => {
  if (!isPlainObject(v)) schemaFail("SCHEMA_TYPE", n);
  for (const f of names) {
    if (!(f in v) || v[f] === undefined) schemaFail("SCHEMA_MISSING", `${n}.${f}`);
  }
  for (const k of Object.keys(v)) {
    if (!names.includes(k)) schemaFail("SCHEMA_EXTRA", `${n}.${k}`);
  }
};

export const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && deepEqual(a[k], b[k]));
};

export const eqLiteral = (v, literal, n) => {
  if (!deepEqual(v, literal)) schemaFail("SCHEMA_LITERAL", `${n} mismatch`);
};

export const sortedUnique = (values, n) => {
  const sorted = [...values].sort();
  if (values.some((x, i) => x !== sorted[i])) schemaFail("SCHEMA_ORDER", `${n} not sorted`);
  if (new Set(values).size !== values.length) schemaFail("SCHEMA_ORDER", `${n} duplicate`);
};

const ARTIFACT_REF_SPEC = { path: "relPath", byteLength: "nat", sha256: "hash" };
const IDENTITY_SPEC = { pid: "pid", startSec: "u64", startUsec: "usec" };

export function assertArtifactRef(value) {
  shape(value, ARTIFACT_REF_SPEC, "ArtifactRef");
}

export function assertProcessIdentity(value) {
  shape(value, IDENTITY_SPEC, "Identity");
}

export const sortedRefs = (v, n) => {
  arr(v, n).forEach((r, i) => shape(r, ARTIFACT_REF_SPEC, `${n}[${i}]`));
  sortedUnique(v.map((r) => r.path), n);
};
