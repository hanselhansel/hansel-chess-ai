// process-lsof-fields.test.mjs: the WHOLE parser-only cases moved from
// process-lsof.test.mjs under the observing-unit repair split — NUL
// field grammar, exact exit semantics, malformed/warning
// unavailability and address strictness against the REAL
// parseLsofResult only. No gate, spawn or validator involvement.
import test from "node:test";
import assert from "node:assert/strict";

import { parseLsofResult } from "./process-lsof.mjs";

const out = (s) => Buffer.from(s, "latin1");

test("parseLsofResult decodes NUL p/n records into holder rows", () => {
  const r = parseLsofResult({
    exitCode: 0,
    stdout: out("p100\0f3\0n127.0.0.1:9222\0p101\0f13\0n[::1]:8080\0f14\0nlocalhost:5000\0"),
    stderr: Buffer.alloc(0),
  });
  assert.deepEqual(
    r.rows.map((h) => [h.pid, h.address, h.port]),
    [
      [100, "127.0.0.1", 9222],
      [101, "::1", 8080],
      [101, "localhost", 5000],
    ],
  );
});

test("newline process separators and a trailing newline are legal", () => {
  const r = parseLsofResult({
    exitCode: 0,
    stdout: out("p1\0\nf3\0n127.0.0.1:9\0\np2\0\nf5\0n[::1]:8\0\n"),
    stderr: "",
  });
  assert.equal(r.rows.length, 2);
});

test("the real selected output carries one f file set per n", () => {
  const r = parseLsofResult({
    exitCode: 0,
    stdout: out("p7576\0\nf13\0n127.0.0.1:58689\0\nf0\0n[::1]:9222\0\n"),
    stderr: "",
  });
  // The real `-F0pn` shape: an f13 then an fd-0 file set on the same
  // PID, one n name each, IPv4 and IPv6 endpoints.
  assert.deepEqual(
    r.rows.map((h) => [h.pid, h.address, h.port]),
    [
      [7576, "127.0.0.1", 58689],
      [7576, "::1", 9222],
    ],
  );
});

test("exit semantics: 1+empty is absent, other exits and stderr fail", () => {
  assert.deepEqual(
    parseLsofResult({ exitCode: 1, stdout: out(""), stderr: "" }).rows,
    [],
  );
  const bad = [
    { exitCode: 1, stdout: out("p1\0f3\0n127.0.0.1:9\0"), stderr: "" },
    { exitCode: 2, stdout: out(""), stderr: "" },
    { exitCode: 0, stdout: out("p1\0f3\0n127.0.0.1:9\0"), stderr: "warning" },
    { exitCode: 0, stdout: out(""), stderr: "" },
  ];
  for (const b of bad) {
    assert.throws(() => parseLsofResult(b), /LSOF_UNAVAILABLE/);
  }
});

test("malformed framing, fields and truncation are unavailable", () => {
  const bad = [
    "x9\0", // unknown field
    "pabc\0f1\0n127.0.0.1:9\0", // nonnumeric pid
    "p0\0f1\0n127.0.0.1:9\0", // pid out of range
    "p1\0f1\0n127.0.0.1:0\0", // port out of range
    "p1\0f1\0n127.0.0.1:9", // missing final terminator
    "n127.0.0.1:9\0", // n before any p
    "p1\0", // p with no file set
    "p1\0\0f1\0n127.0.0.1:9\0", // empty record inside
    "p1\0f1\0n127.0.0.1:9\0garbage", // trailing non-newline
  ];
  for (const s of bad) {
    assert.throws(
      () => parseLsofResult({ exitCode: 0, stdout: out(s), stderr: "" }),
      /LSOF_UNAVAILABLE/,
      JSON.stringify(s),
    );
  }
});

test("f file sets need a current PID, a canonical fd and exactly one n", () => {
  const bad = [
    "f13\0n127.0.0.1:9\0", // f before any p
    "p1\0f\0n127.0.0.1:9\0", // empty fd
    "p1\0f03\0n127.0.0.1:9\0", // leading zero is noncanonical
    "p1\0f-3\0n127.0.0.1:9\0", // negative fd
    "p1\0fcwd\0n127.0.0.1:9\0", // pseudo-name is not numeric
    "p1\0f3u\0n127.0.0.1:9\0", // suffixed fd
    "p1\0f3\0", // fd with no name
    "p1\0f3\0f4\0n127.0.0.1:9\0", // second f before its n
    "p1\0f3\0n127.0.0.1:9\0n127.0.0.1:8\0", // second n without f
    "p1\0n127.0.0.1:9\0", // n without f
  ];
  for (const s of bad) {
    assert.throws(
      () => parseLsofResult({ exitCode: 0, stdout: out(s), stderr: "" }),
      /LSOF_UNAVAILABLE/,
      JSON.stringify(s),
    );
  }
});

test("malformed UTF-8 stdout bytes are unavailable, not smuggled", () => {
  // The strict fatal decoder owns this boundary: a real invalid
  // sequence inside an otherwise well-formed field must fail closed.
  assert.throws(
    () =>
      parseLsofResult({
        exitCode: 0,
        stdout: Buffer.from([0x70, 0x31, 0x00, 0x66, 0x33, 0x00, 0x6e, 0xff, 0x3a, 0x39, 0x00]),
        stderr: "",
      }),
    /LSOF_UNAVAILABLE/,
  );
});

test("a non-loopback holder parses; loopback enforcement is not the parser's", () => {
  const r = parseLsofResult({
    exitCode: 0,
    stdout: out("p1\0f3\0n8.8.8.8:9\0"),
    stderr: "",
  });
  assert.equal(r.rows[0].address, "8.8.8.8");
});
