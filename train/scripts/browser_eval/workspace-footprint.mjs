// workspace-footprint.mjs owns the retained whole-workspace footprint
// observer. One async lstat walk charges the workspace ROOT entry itself plus
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

  const walk = async (dir, errors, gen) => {
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
        return { total, unavailable: true };
      }
      const c = charge(st);
      if (c === null || !Number.isSafeInteger(total + c)) {
        errors.push(`charge ${p}: unsafe metadata`);
        return { total, unavailable: true };
      }
      total += c;
      if (st.isDirectory()) {
        const sub = await walk(p, errors, gen);
        if (!Number.isSafeInteger(total + sub.total)) {
          errors.push(`charge ${p}: unsafe total`);
          return { total, unavailable: true };
        }
        total += sub.total;
        if (sub.unavailable) return { total, unavailable: true };
      }
    }
    return { total, unavailable: false };
  };

  const run = async (gen) => {
    const observedAtMs = clock.nowMonoMs();
    const errors = [];
    let rootStat;
    try {
      rootStat = await fsp.lstat(workspaceRoot);
    } catch (e) {
      errors.push(`lstat ${workspaceRoot}: ${e.code || e.message}`);
      return { observedAtMs, chargedBytes: 0, errors, unavailable: true };
    }
    const rootCharge = charge(rootStat);
    if (rootCharge === null) {
      errors.push(`charge ${workspaceRoot}: unsafe metadata`);
      return { observedAtMs, chargedBytes: 0, errors, unavailable: true };
    }
    const inner = await walk(workspaceRoot, errors, gen);
    // The final root+inner sum is itself safe-integer checked — checked
    // inner additions do not cover this last addition.
    const total = rootCharge + inner.total;
    if (!Number.isSafeInteger(total) || total < 0) {
      errors.push(`charge ${workspaceRoot}: unsafe sum`);
      return { observedAtMs, chargedBytes: 0, errors, unavailable: true };
    }
    return {
      observedAtMs,
      chargedBytes: total,
      errors,
      unavailable: inner.unavailable,
    };
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
