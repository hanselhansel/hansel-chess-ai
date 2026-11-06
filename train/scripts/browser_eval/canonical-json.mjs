// Canonical JSON byte codec for all harness records and IPC measurement.
// UTF-8 without BOM, compact JSON, recursively ASCII-sorted object keys
// (integer-like keys compared as ASCII text, so "10" precedes "2"),
// preserved array order and exactly one final LF. No IO here.

import { createHash } from "node:crypto";

const fail = (code, detail) => {
  const error = new Error(`${code}: ${detail}`);
  error.code = code;
  throw error;
};

const utf8 = (text) => Buffer.from(text, "utf8");

const compareKeys = (a, b) => {
  const ba = utf8(a);
  const bb = utf8(b);
  const n = Math.min(ba.length, bb.length);
  for (let i = 0; i < n; i += 1) {
    if (ba[i] !== bb[i]) return ba[i] - bb[i];
  }
  return ba.length - bb.length;
};

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const emit = (value, out) => {
  if (value === null) {
    out.push("null");
    return;
  }
  const type = typeof value;
  if (type === "boolean") {
    out.push(value ? "true" : "false");
    return;
  }
  if (type === "number") {
    if (!Number.isFinite(value)) fail("CANONICAL_VALUE", "non-finite number");
    out.push(JSON.stringify(value));
    return;
  }
  if (type === "string") {
    out.push(JSON.stringify(value));
    return;
  }
  if (type === "undefined" || type === "bigint" || type === "function" || type === "symbol") {
    fail("CANONICAL_VALUE", `unsupported ${type}`);
  }
  if (Array.isArray(value)) {
    if (typeof value.toJSON === "function") fail("CANONICAL_VALUE", "array toJSON");
    out.push("[");
    for (let i = 0; i < value.length; i += 1) {
      if (!(i in value)) fail("CANONICAL_VALUE", "sparse array");
      if (i > 0) out.push(",");
      emit(value[i], out);
    }
    out.push("]");
    return;
  }
  if (!isPlainObject(value)) fail("CANONICAL_VALUE", "non-plain object");
  if (typeof value.toJSON === "function") fail("CANONICAL_VALUE", "object toJSON");
  for (const sym of Object.getOwnPropertySymbols(value)) {
    if (Object.prototype.propertyIsEnumerable.call(value, sym)) {
      fail("CANONICAL_VALUE", "symbol property");
    }
  }
  const keys = Object.keys(value).sort(compareKeys);
  out.push("{");
  keys.forEach((key, index) => {
    if (index > 0) out.push(",");
    out.push(JSON.stringify(key), ":");
    emit(value[key], out);
  });
  out.push("}");
};

const checkCycles = (root) => {
  const seen = new Set();
  const stack = new Set();
  const visit = (value) => {
    if (value === null || typeof value !== "object") return;
    if (stack.has(value)) fail("CANONICAL_VALUE", "cycle");
    if (seen.has(value)) return;
    seen.add(value);
    stack.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (isPlainObject(value)) {
      for (const key of Object.keys(value)) visit(value[key]);
    }
    stack.delete(value);
  };
  visit(root);
};

export function canonicalBytes(value) {
  checkCycles(value);
  const out = [];
  emit(value, out);
  return utf8(`${out.join("")}\n`);
}

// Strict JSON grammar with duplicate-key rejection at any depth.
const parseJson = (text) => {
  let i = 0;
  const peek = () => text[i];
  const expect = (ch) => {
    if (text[i] !== ch) fail("CANONICAL_PARSE", `expected ${ch} at ${i}`);
    i += 1;
  };
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i += 1;
  };
  const value = () => {
    ws();
    const ch = peek();
    if (ch === "{") {
      i += 1;
      const obj = {};
      ws();
      if (peek() === "}") {
        i += 1;
        return obj;
      }
      for (;;) {
        ws();
        const key = string();
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          fail("CANONICAL_PARSE", "duplicate key");
        }
        ws();
        expect(":");
        const member = value();
        // An own data property is required even for "__proto__": plain
        // assignment would invoke the inherited accessor and lose the key.
        Object.defineProperty(obj, key, {
          value: member,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        ws();
        if (peek() === ",") {
          i += 1;
          continue;
        }
        expect("}");
        return obj;
      }
    }
    if (ch === "[") {
      i += 1;
      const arr = [];
      ws();
      if (peek() === "]") {
        i += 1;
        return arr;
      }
      for (;;) {
        arr.push(value());
        ws();
        if (peek() === ",") {
          i += 1;
          continue;
        }
        expect("]");
        return arr;
      }
    }
    if (ch === '"') return string();
    if (ch === "t") return literal("true", true);
    if (ch === "f") return literal("false", false);
    if (ch === "n") return literal("null", null);
    return number();
  };
  const literal = (word, val) => {
    if (text.slice(i, i + word.length) !== word) fail("CANONICAL_PARSE", `bad literal at ${i}`);
    i += word.length;
    return val;
  };
  const string = () => {
    expect('"');
    let out = "";
    for (;;) {
      const ch = text[i];
      if (ch === undefined) fail("CANONICAL_PARSE", "unterminated string");
      if (ch === '"') {
        i += 1;
        return out;
      }
      if (ch === "\\") {
        const esc = text[i + 1];
        if (esc === '"' || esc === "\\" || esc === "/") out += esc;
        else if (esc === "b") out += "\b";
        else if (esc === "f") out += "\f";
        else if (esc === "n") out += "\n";
        else if (esc === "r") out += "\r";
        else if (esc === "t") out += "\t";
        else if (esc === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("CANONICAL_PARSE", "bad \\u escape");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else {
          fail("CANONICAL_PARSE", "bad escape");
        }
        i += 2;
        continue;
      }
      if (ch < " ") fail("CANONICAL_PARSE", "raw control char");
      out += ch;
      i += 1;
    }
  };
  const number = () => {
    const match = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/.exec(text.slice(i));
    if (!match) fail("CANONICAL_PARSE", `bad number at ${i}`);
    i += match[0].length;
    return parseFloat(match[0]);
  };
  const result = value();
  ws();
  if (i !== text.length) fail("CANONICAL_PARSE", "trailing data");
  return result;
};

export function parseCanonicalBytes(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? []);
  if (buffer.length === 0 || buffer[buffer.length - 1] !== 0x0a) {
    fail("CANONICAL_PARSE", "missing final LF");
  }
  if (buffer.length >= 2 && buffer[buffer.length - 2] === 0x0a) {
    fail("CANONICAL_PARSE", "extra final LF");
  }
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail("CANONICAL_PARSE", "BOM");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    fail("CANONICAL_PARSE", "invalid UTF-8");
  }
  const value = parseJson(text.slice(0, -1));
  const emitted = canonicalBytes(value);
  if (!emitted.equals(buffer)) fail("CANONICAL_PARSE", "noncanonical bytes");
  return value;
}

// Strict noncanonical subprocess JSON. The SAME parser rejects duplicates;
// canonical owned-copy validation rejects nonfinite values/invalid strings.
// Records keep the stricter parseCanonicalBytes exact-byte requirement.
export function parseJSONBytes(bytes) {
  const buffer = Buffer.from(bytes);
  if (buffer.length === 0 || buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail("CANONICAL_PARSE", "empty or BOM JSON");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    fail("CANONICAL_PARSE", "invalid UTF-8");
  }
  return parseCanonicalBytes(canonicalBytes(parseJson(text)));
}

export function sha256Bytes(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash("sha256").update(buffer).digest("hex");
}
