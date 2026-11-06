// workspace-footprint.mjs owns the retained whole-workspace footprint
// observer. One retained scan charges the workspace ROOT entry itself plus
// every entry beneath it exactly once: every regular file
// max(logical size, blocks*512), every directory/symlink its own allocation,
// never following links, and only real allocation metadata through
// safe-integer arithmetic — a missing blocks field or an unsafe size/total is
// an unavailable observation, never an invented charge. The published
// observedAtMs is the monotonic SCAN START: the store retires a committed
// delta only when a scan start is strictly after the write's commit boundary,
// so a delayed result can never undercount. Scan starts publish
// nondecreasing through one in-flight walk; an older walk can never overwrite
// a newer observation. stop() prevents new scans, invalidates the in-flight
// generation so an interrupted walk can never publish a successful partial
// prefix, and lets the active walk drain.
import { promises as fsp } from "node:fs";
import path from "node:path";

const realClock = {
  nowMonoMs: () => Number(process.hrtime.bigint() / 1000000n),
};

let describing = false;
// Diagnostic strings only. Slice before parsing; never render provider objects
// or full workspace paths. Every property read is optional and fallible.
export function describeFootprintFailure(sample, root) {
  const read = (value, key) => {
    try {
      return value?.[key];
    } catch {
      return undefined;
    }
  };
  const classify = (value) => {
    const head = value.slice(0, 16);
    const tail = value.slice(-96);
    const operation = head.startsWith("readdir ") ? "readdir" :
      head.startsWith("lstat ") ? "lstat" : head.startsWith("charge ") ? "charge" : "scan";
    let op = `${operation}(entry)`;
    if (typeof root === "string" && root.length > 0) {
      const prefix = `${operation} ${root}`;
      if (value.startsWith(prefix) && value[prefix.length] === ":") {
        op = `${operation}(root)`;
      } else if (value.startsWith(prefix + "/")) {
        const relativeHead = value.slice(prefix.length + 1, prefix.length + 65);
        const role = relativeHead.split(/[/:]/, 1)[0];
        const pathTail = tail.slice(0, tail.lastIndexOf(": "));
        const basename = pathTail.slice(pathTail.lastIndexOf("/") + 1);
        if (/^[A-Za-z0-9._-]+$/.test(role) && /^[A-Za-z0-9._-]+$/.test(basename) &&
          ![".", ".."].includes(role) && ![".", ".."].includes(basename)) {
          op = `${operation} ${role.slice(0, 16)}/${basename.slice(-24)}`;
        }
      }
    }
    const errno = /:\s*(E[A-Z0-9_]{1,19})\s*$/.exec(tail)?.[1];
    const reason = errno ?? (tail.includes("unsafe metadata") ? "unsafe-metadata" :
      tail.includes("unsafe total") ? "unsafe-total" :
      tail.includes("unsafe sum") ? "unsafe-sum" : "unclassified");
    return { reason, op };
  };
  if (describing) {
    return "diagnostic-unavailable";
  }
  describing = true;
  try {
    const errors = read(sample, "errors");
    const reasons = [];
    if (Array.isArray(errors)) {
      for (let index = 0; index < 8; index += 1) {
        const value = read(errors, index);
        if (typeof value === "string") {
          reasons.push(classify(value));
        }
      }
    }
    const first = reasons[0];
    const last = reasons.at(-1);
    const interruption = read(sample, "interruption");
    let detail = interruption === "stopped/generation-changed" ? interruption : "diagnostic-unavailable";
    if (first) {
      detail = first.reason + (last.reason === first.reason ? "" : `>${last.reason}`) +
        ` ${first.op}` + (last.op === first.op ? "" : `>${last.op}`);
      if (interruption === "stopped/generation-changed") {
        detail += " stopped/gen-changed";
      }
    }
    const valid = read(sample, "accountingValid");
    const bytes = read(sample, "chargedBytes");
    const at = read(sample, "observedAtMs");
    return `${detail} a=${valid === true ? "true" : valid === false ? "false" : "invalid"}` +
      ` b=${Number.isFinite(bytes) && bytes >= 0 ? "ok" : "invalid"}` +
      ` t=${Number.isFinite(at) ? "ok" : "invalid"}`;
  } catch {
    return "diagnostic-unavailable";
  } finally {
    describing = false;
  }
}

export function createFootprintObserver({ workspaceRoot, clock = realClock }) {
  let stopped = false;
  let inFlight = null;
  let lastGood = null;
  let lastStart = -Infinity;
  let generation = 0;

  // Real allocation only: statx-class metadata supplies st_blocks; where it
  // is absent the charge cannot be trusted, so the observation is
  // unavailable rather than an invented fallback.
  const charge = (st) => {
    if (!Number.isSafeInteger(st.size)) return null;
    if (typeof st.blocks !== "number" || !Number.isSafeInteger(st.blocks))
      return null;
    const allocated = st.blocks * 512;
    if (!Number.isSafeInteger(allocated) || allocated < 0) return null;
    if (st.isDirectory() || st.isSymbolicLink()) return allocated;
    return Math.max(st.size, allocated);
  };

  const safeDirectory = (st) => charge(st) !== null && st.isDirectory() &&
    !st.isSymbolicLink() && Number.isSafeInteger(st.dev) && Number.isSafeInteger(st.ino);
  const sameDirectory = (a, b) => safeDirectory(b) && a.dev === b.dev &&
    a.ino === b.ino && a.mode === b.mode && a.birthtimeMs === b.birthtimeMs;
  const unchanged = async (ancestors, gen) => {
    for (const [dir, before] of ancestors) {
      if (stopped || gen !== generation) {
        return false;
      }
      if (!sameDirectory(before, await fsp.lstat(dir))) {
        return false;
      }
    }
    return !stopped && gen === generation;
  };
  const retired = async (file, ancestors, gen) => {
    try {
      if (!await unchanged(ancestors, gen)) {
        return false;
      }
      try {
        await fsp.lstat(file);
        return false; // Reappeared/live is not positive absence.
      } catch (error) {
        if (error.code !== "ENOENT") {
          return false;
        }
      }
      return await unchanged(ancestors, gen);
    } catch {
      return false; // Root/parent loss or unreadable confirmation is unproven.
    }
  };

  const walk = async (dir, errors, gen, ancestors) => {
    let total = 0;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
      errors.push(`readdir ${dir}: ${e.code || e.message}`);
      return { total, unavailable: true };
    }
    for (const ent of entries) {
      if (stopped || gen !== generation) return { total, unavailable: true };
      const p = path.join(dir, ent.name);
      let st;
      try {
        st = await fsp.lstat(p);
      } catch (e) {
        errors.push(`lstat ${p}: ${e.code || e.message}`);
        const retry = e.code === "ENOENT" && await retired(p, ancestors, gen) ? ancestors : null;
        return { total, unavailable: true, retry };
      }
      const c = charge(st);
      if (c === null || !Number.isSafeInteger(total + c)) {
        errors.push(`charge ${p}: unsafe metadata`);
        return { total, unavailable: true };
      }
      total += c;
      if (st.isDirectory()) {
        if (!safeDirectory(st)) {
          errors.push(`charge ${p}: unsafe directory`);
          return { total, unavailable: true };
        }
        const sub = await walk(p, errors, gen, [...ancestors, [p, st]]);
        if (!Number.isSafeInteger(total + sub.total)) {
          errors.push(`charge ${p}: unsafe total`);
          return { total, unavailable: true };
        }
        total += sub.total;
        if (sub.unavailable) return { total, unavailable: true, retry: sub.retry };
      }
    }
    return { total, unavailable: false };
  };

  const run = async (gen) => {
    const observedAtMs = clock.nowMonoMs();
    const firstErrors = [];
    let originalRoot = null;
    let restartAncestors = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const errors = [];
      let rootStat;
      try {
        rootStat = await fsp.lstat(workspaceRoot);
      } catch (error) {
        errors.push(`lstat ${workspaceRoot}: ${error.code || error.message}`);
        return { observedAtMs, chargedBytes: 0, errors: [...firstErrors, ...errors], unavailable: true };
      }
      if (!safeDirectory(rootStat) || (originalRoot && !sameDirectory(originalRoot, rootStat))) {
        errors.push(`charge ${workspaceRoot}: unsafe metadata`);
        return { observedAtMs, chargedBytes: 0, errors: [...firstErrors, ...errors], unavailable: true };
      }
      originalRoot ??= rootStat;
      if (restartAncestors) {
        try {
          if (!await unchanged(restartAncestors, gen)) {
            throw new Error("changed ancestor");
          }
        } catch {
          return { observedAtMs, chargedBytes: 0, errors: firstErrors, unavailable: true };
        }
      }
      const inner = await walk(workspaceRoot, errors, gen, [[workspaceRoot, rootStat]]);
      // Checked inner additions do not cover the final root allocation.
      const total = charge(rootStat) + inner.total;
      if (!Number.isSafeInteger(total) || total < 0) {
        errors.push(`charge ${workspaceRoot}: unsafe sum`);
        inner.unavailable = true;
      }
      if (!inner.unavailable) {
        try {
          if (!await unchanged(restartAncestors ?? [[workspaceRoot, originalRoot]], gen)) {
            errors.push(`charge ${workspaceRoot}: unsafe metadata`);
            inner.unavailable = true;
          }
        } catch (error) {
          errors.push(`lstat ${workspaceRoot}: ${error.code || error.message}`);
          inner.unavailable = true;
        }
      }
      if (attempt === 0 && inner.retry && !stopped && gen === generation) {
        firstErrors.push(...errors);
        restartAncestors = inner.retry;
        continue; // Discard every partial charge; restart the WHOLE root once.
      }
      return { observedAtMs, chargedBytes: total,
        errors: inner.unavailable ? [...firstErrors, ...errors] : errors,
        unavailable: inner.unavailable };
    }
  };

  const publish = (result, gen) => {
    // Suppress ONLY obsolete coverage: a strictly older scan start. A
    // same-millisecond or interrupted result still publishes — a fault may
    // never be hidden behind an earlier valid observation.
    if (result.observedAtMs < lastStart) return;
    lastStart = result.observedAtMs;
    if (
      gen === generation &&
      !result.unavailable &&
      result.errors.length === 0
    ) {
      lastGood = {
        observedAtMs: result.observedAtMs,
        chargedBytes: result.chargedBytes,
        accountingValid: true,
      };
      return;
    }
    // An interrupted walk (generation superseded) or a real fault marks the
    // observation invalid while preserving the last real bytes/timestamp —
    // never a zero or stale success.
    lastGood = {
      observedAtMs: result.observedAtMs,
      chargedBytes: lastGood ? lastGood.chargedBytes : 0,
      accountingValid: false,
      errors: result.errors.slice(0, 8),
      ...(gen !== generation ? { interruption: "stopped/generation-changed" } : {}),
    };
  };

  const scan = () => {
    if (stopped) {
      return Promise.reject(new Error("footprint observer stopped"));
    }
    if (inFlight) return inFlight;
    const gen = generation;
    inFlight = run(gen)
      .then((result) => {
        publish(result, gen);
        return current();
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const current = () => {
    if (!lastGood) {
      return Promise.reject(
        new Error("ACCOUNTING_UNAVAILABLE footprint never observed"),
      );
    }
    return Promise.resolve({ ...lastGood });
  };

  const readFootprint = () => {
    if (stopped) return current();
    if (inFlight) return inFlight;
    return scan();
  };

  const stop = () => {
    stopped = true;
    // Invalidate the in-flight generation: an interrupted walk can never
    // publish a successful partial prefix after stop.
    generation += 1;
  };

  return Object.freeze({ scan, readFootprint, stop });
}
