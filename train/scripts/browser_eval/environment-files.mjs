// Shared bounded static filesystem measurements. Construction is pure and
// borrows the caller's ONE budget/lifetime. No subprocess or parent import.
import { promises as fsp, createReadStream, realpathSync } from "node:fs";
import path from "node:path";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { createBackendReader } from "./process-backend-reader.mjs";
import { waitHandle } from "./process-budget.mjs";
import { isAbs, isObj, exactFields } from "./protocol-values.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";

const TEXT_CAP = 8 * 1024 * 1024;
const BIN_CAP = 512 * 1024 * 1024;
const fail = (detail) => {
  const error = new Error(`ACCOUNTING_UNAVAILABLE environment ${detail}`);
  error.code = "ACCOUNTING_UNAVAILABLE";
  return error;
};
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

// Strict CSV supports quoted RECORD paths, including escaped quotes and
// embedded newlines. Malformed quotes, truncated rows and CR-only rows fail.
const csvRows = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let endedQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
        endedQuote = true;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "" && !endedQuote) {
      quoted = true;
    } else if (ch === "," || ch === "\n") {
      row.push(field);
      field = "";
      endedQuote = false;
      if (ch === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (ch === "\r" && text[i + 1] === "\n") {
      continue;
    } else {
      if (endedQuote || ch === '"' || ch === "\r") {
        throw fail("RECORD csv");
      }
      field += ch;
    }
  }
  if (quoted) {
    throw fail("RECORD csv truncated");
  }
  if (field !== "" || row.length !== 0 || endedQuote) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

export function createEnvironmentFiles(context, adapters = {}) {
  if (!isObj(context) || !exactFields(context, ["budget", "lifetime"])) {
    throw fail("context fields");
  }
  const allowed = ["statFile", "createStream", "resolvePath", "readdir", "readlink"];
  if (!isObj(adapters) || !Object.keys(adapters).every((key) =>
    allowed.includes(key) && typeof adapters[key] === "function")) {
    throw fail("filesystem adapters");
  }
  const { budget, lifetime } = context;
  assertWatchdogLifetime(lifetime);
  for (const key of ["assertLive", "onExpire", "remainingMs", "deadlineMonoMs"]) {
    if (typeof budget?.[key] !== "function") {
      throw fail("budget handle");
    }
  }
  const statFile = adapters.statFile ?? ((p) => fsp.lstat(p));
  const createStream = adapters.createStream ?? ((p) => createReadStream(p));
  const resolvePath = adapters.resolvePath ?? realpathSync.native;
  const readdir = adapters.readdir ?? ((p) => fsp.readdir(p));
  const readlink = adapters.readlink ?? ((p) => fsp.readlink(p));
  for (const binding of [statFile, createStream, resolvePath, readdir, readlink]) {
    if (typeof binding !== "function") {
      throw fail("filesystem adapter");
    }
  }
  // These local join lists carry the SAME owner's actual raw receipts.
  // They never observe global owner zero or turn a deadline into closure.
  const read = async (...args) => {
    const actual = [];
    const reader = createBackendReader({
      handle: budget, statFile, createStream,
      retainActual: (receipt) => {
        lifetime.retainActual(receipt);
        actual.push(receipt);
      },
    });
    try {
      return await reader.readFact(...args);
    } finally {
      await Promise.allSettled(actual);
    }
  };
  const parallel = async (items, work) => {
    const results = new Array(items.length);
    let next = 0;
    let failed = false;
    let first;
    const worker = async () => {
      let completed = 0;
      while (!failed && next < items.length) {
        try {
          // Fulfilled microtasks alone cannot keep Native timers responsive.
          if (completed === 16) {
            await call("environment cooperative turn", () => new Promise((resolve) => setImmediate(resolve)));
            completed = 0;
          }
          budget.assertLive("environment concurrent file");
          if (failed || next >= items.length) {
            return;
          }
          const index = next;
          next += 1;
          results[index] = await work(items[index]);
          completed += 1;
        } catch (error) {
          if (!failed) {
            failed = true;
            first = error;
          }
        }
      }
    };
    await Promise.allSettled(Array.from({ length: Math.min(16, items.length) }, worker));
    if (failed) {
      throw first;
    }
    budget.assertLive("environment concurrent files complete");
    return results;
  };
  const resolve = (literal) => {
    budget.assertLive("environment resolve");
    const real = resolvePath(literal);
    budget.assertLive("environment resolve");
    if (!isAbs(real)) {
      throw fail("resolved path");
    }
    return real;
  };
  const call = async (tag, thunk) => {
    budget.assertLive(tag);
    let settle;
    const receipt = new Promise((res) => { settle = res; });
    try {
      lifetime.retainActual(receipt);
      budget.assertLive(tag);
    } catch (error) {
      settle();
      throw error;
    }
    const body = Promise.resolve().then(() => {
      budget.assertLive(tag);
      return thunk();
    });
    body.then(() => settle(), () => settle());
    try {
      return await waitHandle(budget, body, tag);
    } finally {
      await Promise.allSettled([body]);
    }
  };
  const list = async (dir) => {
    const names = await call("environment directory", () => readdir(dir));
    if (!Array.isArray(names) || names.some((name) =>
      typeof name !== "string" || name === "" || name === "." ||
      name === ".." || name.includes("/") || name.includes("\0")
    ) || new Set(names).size !== names.length) {
      throw fail("directory entries");
    }
    return names.slice().sort(compare);
  };
  const inventory = async (root, links = "none") => {
    const base = resolve(root);
    const paths = [];
    const directories = [];
    const pending = [base];
    const linkFacts = [];
    let cursor = 0;
    while (cursor < pending.length) {
      const batch = pending.slice(cursor, cursor + 16);
      cursor += batch.length;
      await parallel(batch, async (dir) => {
        const before = await call("inventory stat", () => statFile(dir));
        if (!before.isDirectory() || resolve(dir) !== dir) {
          throw fail("inventory directory");
        }
        const names = await list(dir);
        directories.push({ dir, before, names });
        for (const name of names) {
          const abs = path.join(dir, name);
          const rel = path.relative(base, abs).split(path.sep).join("/");
          const st = await call("inventory entry", () => statFile(abs));
          if (st.isSymbolicLink()) {
            const allowed = links === "framework" && rel.includes(".framework/") ||
              links === "node-bin" && /(^|\/)\.bin\//.test(rel);
            const target = await call("inventory link", () => readlink(abs));
            if (!allowed || typeof target !== "string" || path.isAbsolute(target) ||
              !resolve(abs).startsWith(`${base}${path.sep}`)) {
              throw fail("inventory symlink");
            }
            linkFacts.push({ path: rel, target });
          } else if (st.isDirectory()) {
            pending.push(abs);
          } else if (st.isFile() && resolve(abs) === abs) {
            paths.push({ abs, rel });
          } else {
            throw fail("inventory file kind");
          }
        }
      });
    }
    const files = await parallel(paths, async ({ abs, rel }) => ({
      path: rel, ...await read(abs, BIN_CAP, "inventory file", true),
    }));
    // Every directory spans the full content-read pass, so concurrent
    // additions/removals cannot escape a completed child-directory check.
    await parallel(directories, async ({ dir, before, names }) => {
      const after = await call("inventory restat", () => statFile(dir));
      if (!after.isDirectory() || before.dev !== after.dev || before.ino !== after.ino ||
        before.mtimeMs !== after.mtimeMs) {
        throw fail("inventory changed directory");
      }
      const afterNames = await list(dir);
      if (names.length !== afterNames.length || names.some((n, i) => n !== afterNames[i])) {
        throw fail("inventory changed entries");
      }
    });
    files.sort((a, b) => compare(a.path, b.path));
    budget.assertLive("environment inventory");
    linkFacts.sort((a, b) => compare(a.path, b.path));
    return { files, links: linkFacts, sha256: sha256Bytes(canonicalBytes({ files, links: linkFacts })) };
  };

  const pythonInstalled = async (prefix) => {
    const base = resolve(prefix);
    const site = path.join(base, "lib/python3.11/site-packages");
    const descriptions = [];
    const names = await list(site);
    if (names.some((n) => /^tinyaz(?:[.\-]|$)/i.test(n))) {
      throw fail("shadow tinyaz");
    }
    for (const name of names.filter((n) => n.endsWith(".dist-info"))) {
      const info = path.join(site, name);
      if (resolve(info) !== info) {
        throw fail("distribution link");
      }
      const metadataPath = path.join(info, "METADATA");
      const metadata = await read(metadataPath, TEXT_CAP, "distribution metadata");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(metadata.buf);
      const field = (key) => {
        const matches = [...text.matchAll(new RegExp(`^${key}: (.+)\\r?$`, "gm"))];
        if (matches.length !== 1 || matches[0][1].trim() === "") {
          throw fail("distribution metadata field");
        }
        return matches[0][1].trim();
      };
      const recordPath = path.join(info, "RECORD");
      const record = await read(recordPath, TEXT_CAP, "distribution RECORD");
      const rows = csvRows(new TextDecoder("utf-8", { fatal: true }).decode(record.buf));
      const seen = new Set();
      const payloads = await parallel(rows, async (row) => {
        if (row.length !== 3 || row[0] === "" || row[0].includes("\\") ||
          row[0].includes("\0") || path.isAbsolute(row[0])) {
          throw fail("RECORD row");
        }
        const literal = path.resolve(site, row[0]);
        const real = resolve(literal);
        if (real !== literal || !real.startsWith(`${base}${path.sep}`)) {
          throw fail("RECORD confinement");
        }
        const rel = path.relative(base, real).split(path.sep).join("/");
        if (seen.has(rel)) {
          throw fail("RECORD duplicate");
        }
        seen.add(rel);
        const inSite = real.startsWith(`${site}${path.sep}`);
        return { path: rel, row, sitePath: inSite ? path.relative(site, real).split(path.sep).join("/") : null,
          outside: inSite ? null : await read(literal, BIN_CAP, "installed file", true) };
      });
      descriptions.push({ name: field("Name").toLowerCase().replace(/[-_.]+/g, "-"), version: field("Version"),
        metadataPath, metadata, recordPath, record, payloads });
    }
    // One complete fresh content pass supplies both roles. This map is
    // invocation-local measured data, never initial/expected/cross-call facts.
    const installedInventory = await inventory(site);
    const current = new Map(installedInventory.files.map((file) => [file.path, file]));
    const records = [];
    const distributions = [];
    for (const description of descriptions) {
      const { name, version, metadataPath, metadata, recordPath, record, payloads } = description;
      for (const [filename, textFact] of [[metadataPath, metadata], [recordPath, record]]) {
        const fact = current.get(path.relative(site, filename).split(path.sep).join("/"));
        if (fact === undefined || fact.sha256 !== textFact.sha256 || fact.byteLength !== textFact.buf.length) {
          throw fail("distribution text changed during inventory");
        }
      }
      const entries = payloads.map(({ path: rel, row, sitePath, outside }) => {
        const fact = sitePath === null ? outside : current.get(sitePath);
        if (fact === undefined) {
          throw fail("RECORD file absent from inventory");
        }
        if (row[1] !== "") {
          const want = `sha256=${Buffer.from(fact.sha256, "hex").toString("base64url")}`;
          if (row[1] !== want || row[2] !== "" && Number(row[2]) !== fact.byteLength) {
            throw fail("RECORD digest");
          }
        }
        return { path: rel, sha256: fact.sha256, byteLength: fact.byteLength };
      });
      entries.sort((a, b) => compare(a.path, b.path));
      // Python's canonical build codec uses ensure_ascii=True. Preserve
      // that exact byte encoding, including UTF-16 surrogate pairs.
      const encoded = canonicalBytes(entries).toString("utf8")
        .replace(/[\u0080-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
      distributions.push({ name, version, buildSha256: sha256Bytes(Buffer.from(encoded)) });
      records.push({ path: recordPath, byteLength: record.buf.length, sha256: record.sha256 });
    }
    distributions.sort((a, b) => compare(a.name, b.name));
    if (distributions.length === 0 || distributions.some((d, i) =>
      d.name === "tinyaz" || i > 0 && distributions[i - 1].name === d.name
    )) {
      throw fail("distribution names");
    }
    budget.assertLive("installed Python");
    return { distributions, records, inventory: installedInventory };
  };
  return Object.freeze({ read, resolve, call, inventory, pythonInstalled });
}
