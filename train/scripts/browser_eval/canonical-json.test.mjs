// Literal-byte, ordering, rejection and digest cases for the canonical
// codec owner. Independent expectations: expected bytes are written out by
// hand, never re-derived through the implementation under test.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";

const utf8 = (s) => Buffer.from(s, "utf8");

test("literal compact bytes with one final LF", () => {
  assert.deepEqual(canonicalBytes({ b: 1, a: 2 }), utf8('{"a":2,"b":1}\n'));
  assert.deepEqual(canonicalBytes([]), utf8("[]\n"));
  assert.deepEqual(canonicalBytes({}), utf8("{}\n"));
  assert.deepEqual(canonicalBytes("x"), utf8('"x"\n'));
  assert.deepEqual(canonicalBytes(1.5), utf8("1.5\n"));
  assert.deepEqual(canonicalBytes(null), utf8("null\n"));
});

test("recursive ASCII key order, integer-like keys as text", () => {
  const out = canonicalBytes({ 2: "b", 10: "a", 1: "c" });
  assert.deepEqual(out, utf8('{"1":"c","10":"a","2":"b"}\n'));
  const nested = canonicalBytes({ z: { 9: 1, 10: 2, a: 3 }, a: [{ y: 1, b: 2 }] });
  assert.deepEqual(nested, utf8('{"a":[{"b":2,"y":1}],"z":{"10":2,"9":1,"a":3}}\n'));
});

test("arrays keep order", () => {
  assert.deepEqual(canonicalBytes([3, 1, { b: 1, a: 2 }]), utf8('[3,1,{"a":2,"b":1}]\n'));
});

test("hash covers exact bytes including final LF", () => {
  const bytes = canonicalBytes({ a: 1 });
  assert.equal(sha256Bytes(bytes), createHash("sha256").update(bytes).digest("hex"));
  assert.equal(sha256Bytes(utf8("x\n")), createHash("sha256").update(utf8("x\n")).digest("hex"));
});

test("round trip returns an equal plain value", () => {
  const value = { k: [1, "x", null, { 10: "y", 2: "z" }], b: false };
  assert.deepEqual(parseCanonicalBytes(canonicalBytes(value)), value);
});

test("__proto__ parses as an own JSON data property", () => {
  const emitted = canonicalBytes(JSON.parse('{"__proto__":null}'));
  const parsed = parseCanonicalBytes(emitted);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, "__proto__"), true);
  assert.equal(parsed.__proto__, null);
  const nested = parseCanonicalBytes(canonicalBytes({ a: JSON.parse('{"__proto__":{"x":1}}') }));
  assert.equal(nested.a.__proto__.x, 1);
  assert.throws(() => parseCanonicalBytes(utf8('{"__proto__":1,"__proto__":2}\n')), /CANON/);
});

test("rejects undefined anywhere", () => {
  assert.throws(() => canonicalBytes({ a: undefined }), /CANON/);
  assert.throws(() => canonicalBytes([undefined]), /CANON/);
  assert.throws(() => canonicalBytes(undefined), /CANON/);
});

test("rejects noncanonical values", () => {
  for (const v of [NaN, Infinity, -Infinity, 1n, Symbol("s"), () => 1]) {
    assert.throws(() => canonicalBytes(v), /CANON/);
  }
  assert.throws(() => canonicalBytes(new Date(0)), /CANON/);
  assert.throws(() => canonicalBytes(new Map()), /CANON/);
  assert.throws(() => canonicalBytes([1, , 3]), /CANON/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalBytes(cyclic), /CANON/);
  const toJson = { a: 1, toJSON: () => ({}) };
  assert.throws(() => canonicalBytes(toJson), /CANON/);
});

test("rejects non-finite and noncanonical parse inputs", () => {
  assert.throws(() => parseCanonicalBytes(utf8('{"a":1}\n\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"a":1}')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8(' {"a":1}\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"a":1}\r\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8('{"a":1}\n')])), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"b":1,"a":2}\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"a":1,"a":2}\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"a":01}\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('{"a":1e0}\n')), /CANON/);
  assert.throws(() => parseCanonicalBytes(Buffer.from([0xff, 0xfe, 0x0a])), /CANON/);
  assert.throws(() => parseCanonicalBytes(utf8('["a",]\n')), /CANON/);
});

test("integer-like parse order is enforced as text", () => {
  assert.throws(() => parseCanonicalBytes(utf8('{"2":1,"10":2}\n')), /CANON/);
  assert.deepEqual(parseCanonicalBytes(utf8('{"1":1,"10":2,"2":3}\n')), { 1: 1, 10: 2, 2: 3 });
});

test("snapshot copy: caller mutation after emit does not change bytes", () => {
  const value = { a: [1, 2], b: { c: "x" } };
  const bytes = canonicalBytes(value);
  value.a.push(3);
  value.b.c = "mutated";
  assert.deepEqual(canonicalBytes(value), utf8('{"a":[1,2,3],"b":{"c":"mutated"}}\n'));
  assert.deepEqual(bytes, utf8('{"a":[1,2],"b":{"c":"x"}}\n'));
  const parsed = parseCanonicalBytes(bytes);
  parsed.b.c = "later";
  assert.deepEqual(parseCanonicalBytes(bytes), { a: [1, 2], b: { c: "x" } });
});

test("input buffer is not retained or hashed by reference", () => {
  const buf = utf8('{"a":1}\n');
  const digest = sha256Bytes(buf);
  buf[0] = 0x7b;
  assert.equal(sha256Bytes(utf8('{"a":1}\n')), digest);
});
