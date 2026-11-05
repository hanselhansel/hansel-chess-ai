// process-lsof-fields.mjs owns the pure fixed `-F0pn` field grammar:
// strict UTF-8 decode, real NUL field terminators plus newline
// process/file-set separators, canonical numeric PID/fd/port and
// known-letter checks, and the exact exit/stderr rules. A process set
// starts p and its FILE sets start f — f is always selected by the
// fixed flags — and each f carries exactly one n name. It has no
// subprocess, native call, clock, IO or cached state; process-lsof.mjs
// re-exports parseLsofResult so callers keep one public API.
import { TextDecoder } from "node:util";

import { isPid, isPort } from "./protocol-values.mjs";

const decoder = new TextDecoder("utf-8", { fatal: true });

const lsofError = (detail) => {
  const e = new Error(`LSOF_UNAVAILABLE ${detail}`);
  e.code = "LSOF_UNAVAILABLE";
  return e;
};

// Strict UTF-8 across the whole captured stream: an invalid or
// incomplete sequence is malformed, never lossy text.
const strictText = (buf, tag) => {
  try {
    return typeof buf === "string" ? buf : decoder.decode(buf);
  } catch {
    throw lsofError(`${tag} utf8`);
  }
};

// lsof -F0pn emits NUL-terminated fields plus newline process/file-set
// separators. A TCP endpoint may carry a peer after `->`; the local
// half is the holder address. Canonical digits only, strict ranges.
const parseEndpoint = (name) => {
  const local = name.split("->", 1)[0];
  const at = local.lastIndexOf(":");
  if (at <= 0) return null;
  const digits = local.slice(at + 1);
  if (!/^[0-9]+$/.test(digits) || String(Number(digits)) !== digits) {
    return null;
  }
  const port = Number(digits);
  const host = local.slice(0, at).replace(/^\[|\]$/g, "");
  if (!isPort(port) || host.length === 0 || host.includes("\0")) {
    return null;
  }
  return { address: host, port };
};

// {exitCode, stdout, stderr} -> {rows:[{address,port,pid}]}. stdout and
// stderr are Buffers (or strict strings); exit 1 with no output is
// proven absent; every malformed frame, field, PID, fd, newline or
// truncation is an error, never a fabricated empty holder set.
export function parseLsofResult({ exitCode, stdout, stderr }) {
  const out = strictText(stdout, "stdout");
  const err = strictText(stderr, "stderr");
  if (exitCode !== 0 && exitCode !== 1) {
    throw lsofError(`exit ${exitCode} stderr ${err.slice(0, 200)}`);
  }
  if (err.length > 0) {
    // Any warning line on stderr makes accounting unavailable, not a
    // partial guess.
    throw lsofError(`stderr ${err.slice(0, 200)}`);
  }
  if (exitCode === 1) {
    if (out.length === 0) return Object.freeze({ rows: [] });
    throw lsofError("exit 1 with output");
  }
  if (out.length === 0) throw lsofError("empty exit-0 output");
  // Real fixed-flag framing: every field ends in NUL, and one newline
  // may precede each field as the process/file-set separator; the last
  // NUL may be followed by one trailing newline. Any other newline,
  // empty field, non-p/f/n letter or missing final terminator fails.
  let body = out;
  if (body.endsWith("\0\n")) body = body.slice(0, -1);
  if (!body.endsWith("\0")) throw lsofError("unterminated output");
  const tokens = body.slice(0, -1).split("\0");
  const fields = [];
  for (const tok of tokens) {
    const t = tok.startsWith("\n") ? tok.slice(1) : tok;
    if (t.length === 0 || t.includes("\n")) {
      throw lsofError("field separator");
    }
    fields.push(t);
  }
  const records = [];
  let current = null;
  let pendingFd = false; // an f set still awaiting its exactly-one n
  for (const tok of fields) {
    const tag = tok[0];
    const value = tok.slice(1);
    if (tag !== "p" && tag !== "n" && tag !== "f") {
      throw lsofError(`field ${tok.slice(0, 40)}`);
    }
    if (value.length === 0) throw lsofError("empty field");
    if (tag === "p") {
      if (pendingFd) throw lsofError("unfinished file set");
      if (!/^[0-9]+$/.test(value) || String(Number(value)) !== value) {
        throw lsofError(`pid ${tok.slice(0, 40)}`);
      }
      const pid = Number(value);
      if (!isPid(pid)) throw lsofError(`pid ${tok.slice(0, 40)}`);
      if (current && current.names.length === 0) {
        throw lsofError("empty record");
      }
      current = { pid, names: [] };
      records.push(current);
      continue;
    }
    if (tag === "f") {
      if (current === null) throw lsofError("fd before record");
      if (pendingFd) throw lsofError("unfinished file set");
      // The fd is a canonical nonnegative decimal integer: zero is
      // legal, signs, leading zeros, suffixes and pseudo-names are not.
      if (!/^[0-9]+$/.test(value) || String(Number(value)) !== value) {
        throw lsofError(`fd ${tok.slice(0, 40)}`);
      }
      if (!Number.isSafeInteger(Number(value))) {
        throw lsofError(`fd ${tok.slice(0, 40)}`);
      }
      pendingFd = true;
      continue;
    }
    if (current === null) throw lsofError("name before record");
    if (!pendingFd) throw lsofError("name without file descriptor");
    pendingFd = false;
    current.names.push(value);
  }
  if (current === null || current.names.length === 0) {
    throw lsofError("empty record");
  }
  if (pendingFd) throw lsofError("unfinished file set");
  const rows = [];
  const seen = new Set();
  for (const rec of records) {
    for (const name of rec.names) {
      const ep = parseEndpoint(name);
      if (!ep) throw lsofError(`endpoint ${name.slice(0, 80)}`);
      const key = `${ep.address}:${ep.port}:${rec.pid}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({ address: ep.address, port: ep.port, pid: rec.pid });
      }
    }
  }
  return Object.freeze({ rows });
}

export { lsofError };
