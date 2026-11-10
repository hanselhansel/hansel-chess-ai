// Passive bounded scalar window. No clock/proof/debt/IO authority. Node absolute
// spans are process-wide; Python intervals are subtracted ONLY in their origin.
import { footprintTrace } from "./footprint-trace.mjs";
const ns = (value) => (typeof value === "string" && /^\d{1,24}$/.test(value) ? value : null);
const idString = (value) => typeof value === "string" && /^[A-Za-z0-9:_-]{1,128}$/.test(value);
const duration = (a, b) =>
  a !== null && b !== null && BigInt(b) >= BigInt(a) ? BigInt(b) - BigInt(a) : null;
const read = (object, key) => {
  try {
    return Object.getOwnPropertyDescriptor(object, key)?.value;
  } catch {
    return undefined;
  } // Diagnostic selection never invokes error accessors.
};

export function createAccountingTrace({ nowNs = () => process.hrtime.bigint().toString() } = {}) {
  const pending = new Map(),
    buckets = new Map(),
    wires = new Map(),
    raws = new Map(),
    cycles = new Map();
  let serial = 0,
    unavailable = 0,
    dropped = 0,
    capturing = false;
  const protect =
    (body) =>
    (...args) => {
      if (capturing) {
        unavailable += 1;
        return undefined;
      }
      capturing = true;
      try {
        return body(...args);
      } catch {
        unavailable += 1;
        return undefined;
      } finally {
        capturing = false;
      }
    };
  const now = () => {
    const value = ns(nowNs());
    if (value === null) unavailable += 1;
    return value;
  };
  const put = (map, key, value, capacity) => {
    if (!map.has(key) && map.size >= capacity) {
      map.delete(map.keys().next().value);
      dropped += 1;
    }
    map.set(key, value);
  };
  const saveMax = (bucket, key, fact, start, end) => {
    const elapsed = duration(start, end);
    if (elapsed !== null && (bucket[key] === undefined || elapsed > BigInt(bucket[key].elapsed))) {
      bucket[key] = { ...fact, elapsed: elapsed.toString() };
    }
  };
  const fsBegin = protect((op) => {
    if (typeof op !== "string" || !/^(fs|fd|stream)\.[A-Za-z]{1,12}$/.test(op)) {
      unavailable += 1;
      return;
    }
    const id = ++serial;
    const start = now();
    put(pending, id, { op, start, returned: null, rejected: null,
      scanId: footprintTrace.fsBegin(op, start) }, 64);
    return id;
  });
  const fsReturn = protect((id, rejected) => {
    const fact = pending.get(id);
    if (!fact) {
      unavailable += 1;
      return;
    }
    fact.returned = now();
    fact.rejected = rejected === true;
    footprintTrace.fsReturn(fact.scanId, fact.op, fact.start, fact.returned, fact.rejected);
  });
  const fsDeliver = protect((id) => {
    const fact = pending.get(id),
      delivered = now();
    if (!fact) {
      unavailable += 1;
      return;
    }
    pending.delete(id);
    footprintTrace.fsDeliver(fact.scanId, fact.op, fact.start, fact.returned, delivered, fact.rejected);
    if (delivered === null) return;
    const key = (BigInt(delivered) / 1000000000n).toString();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {};
      put(buckets, key, bucket, 8);
    }
    const span = { ...fact, delivered };
    saveMax(bucket, "immediate", span, fact.start, fact.returned);
    saveMax(bucket, "delivery", span, fact.returned, delivered);
  });
  const raw = protect((runId) => {
    if (!idString(runId)) {
      unavailable += 1;
      return;
    }
    put(raws, runId, now(), 8);
  });
  const frame = protect((runId) => ({ raw: raws.get(runId) ?? null, frame: now() }));
  const wire = protect((requestId, stage, value) => {
    if (!idString(requestId)) {
      unavailable += 1;
      return;
    }
    let fact = wires.get(requestId);
    if (!fact) {
      fact = { requestId };
      put(wires, requestId, fact, 16);
    }
    if (stage === "frame") {
      fact.raw = ns(value?.raw);
      fact.frame = ns(value?.frame);
    } else if (stage === "write") fact.write = now();
    else if (stage === "return") {
      fact.returned = now();
      fact.backpressure = value === false;
    } else if (stage === "throw") {
      fact.returned = now();
      fact.threw = true;
    } else if (stage === "validated") {
      fact.validated = now();
      const elapsed = duration(ns(value?.startedAtMonoNs), ns(value?.finishedAtMonoNs));
      fact.pythonNs = elapsed === null ? null : elapsed.toString();
    } else if (stage === "resolved") fact.resolved = now();
    else unavailable += 1;
  });
  const cycle = protect((fact, requestId) => {
    const copy = {};
    for (const key of ["startedNs", "finishedNs", "lastValidNs"]) copy[key] = ns(fact[key]);
    if (copy.startedNs === null || copy.finishedNs === null) {
      unavailable += 1;
      return;
    }
    for (const key of ["gapMs", "preCycleGapMs", "cycleDurationMs", "nativeDurationMs", "coverageRounds"]) {
      copy[key] = Number.isFinite(fact[key]) ? fact[key] : null;
    }
    copy.requestId = idString(requestId) ? requestId : null;
    put(cycles, ++serial, copy, 8);
  });
  const selectedCycle = (error) => {
    const detail = read(read(error, "fault"), "detail"),
      message = read(error, "message");
    for (const text of [detail, message]) {
      if (typeof text !== "string") continue;
      const bounded = text.slice(0, 4096),
        at = bounded.indexOf("sample interval {");
      if (at < 0) continue;
      try {
        const fact = JSON.parse(bounded.slice(at + "sample interval ".length));
        const matches = [...cycles.values()].filter(
          (saved) =>
            saved.finishedNs === fact.finishedNs &&
            saved.startedNs === fact.startedNs &&
            saved.lastValidNs === fact.lastValidNs,
        );
        if (matches.length === 1) return matches[0];
        if (matches.length > 1) unavailable += 1;
      } catch {} // Unavailable evidence is never synthesized or a control fault.
    }
    return null;
  };
  const packet = protect((error, budget) => {
    const code = read(error, "code"),
      causeCode = read(read(error, "cause"), "code");
    if (![code, causeCode].some((v) => ["ACCOUNTING_UNAVAILABLE", "STORE_ACCOUNTING"].includes(v))) return [];
    const fact = selectedCycle(error),
      wireFact = fact ? wires.get(fact.requestId) : null;
    let start = fact?.lastValidNs ?? fact?.startedNs,
      end = fact?.finishedNs;
    let footprint = false;
    if (!fact) {
      const retained = read(error, "detail") ?? read(read(error, "cause"), "detail");
      if (typeof retained === "string" && retained.length <= 256)
        try {
          const sample = JSON.parse(retained);
          if (
            sample.classification === "age-exceeded" &&
            [sample.nowMs, sample.sampleStartMs].every((n) => Number.isSafeInteger(n) && n >= 0)
          ) {
            start = (BigInt(sample.sampleStartMs) * 1000000n).toString();
            end = (BigInt(sample.nowMs) * 1000000n).toString();
            footprint = true;
          }
        } catch {} // Only the original retained Node-origin decision supplies a window.
    }
    const overlaps = (a, b) =>
      start && end && a && BigInt(a) <= BigInt(end) && (b === undefined || (b && BigInt(b) >= BigInt(start)));
    const max = (key) =>
      [...buckets.values()]
        .map((b) => b[key])
        .filter(
          (s) =>
            s && (key === "immediate" ? overlaps(s.start, s.returned) : overlaps(s.returned, s.delivered)),
        )
        .reduce((best, s) => (best === null || BigInt(s.elapsed) > BigInt(best.elapsed) ? s : best), null);
    const immediate = max("immediate"),
      delivery = max("delivery");
    const held = [...pending.values()].find((s) => overlaps(s.start, undefined));
    const lines = ["limits Node-absolute Python-duration process-wideFS overlap!=cause overhead>0",
      "residual unlocalized; raw callback!=kernel arrival; partial maxima only"];
    if (fact) {
      lines.push(`cycle s=${fact.startedNs} f=${fact.finishedNs} l=${fact.lastValidNs}`);
      lines.push(
        `g=${fact.gapMs} p=${fact.preCycleGapMs} c=${fact.cycleDurationMs} n=${fact.nativeDurationMs} r=${fact.coverageRounds}`,
      );
      lines.push(`rid=${fact.requestId ?? "missing"}`);
    } else
      lines.push(
        footprint ? `footprint start=${start} decision=${end}` : "cycle missing; no inferred failed interval",
      );
    if (wireFact) {
      lines.push(
        `write s=${wireFact.write ?? "?"} e=${wireFact.returned ?? "?"} bp=${wireFact.backpressure ?? "?"} err=${wireFact.threw === true}`,
      );
      lines.push(`frame raw=${wireFact.raw ?? "?"} full=${wireFact.frame ?? "?"}`);
      lines.push(
        `valid=${wireFact.validated ?? "?"} resolve=${wireFact.resolved ?? "?"} PythonNs=${wireFact.pythonNs ?? "?"}`,
      );
    } else lines.push("wire missing");
    for (const [label, span] of [
      ["immediate", immediate],
      ["delivery", delivery],
      ["pending", held],
    ]) {
      lines.push(
        span
          ? `${label} ${span.op} s=${span.start} r=${span.returned} d=${span.delivered ?? "?"} err=${span.rejected}`
          : `${label} missing`,
      );
    }
    const limit = Number.isSafeInteger(budget) ? Math.max(0, Math.min(budget, 12)) : 0;
    const association = footprintTrace.packet(error, 9) ?? [];
    const exact = association[0]?.includes("binding=exact") === true;
    const selected = exact ? [...association,
      `process-wide sync ${immediate?.op ?? "missing"} ns=${immediate?.elapsed ?? "?"}`,
      `process-wide delivery ${delivery?.op ?? "missing"} ns=${delivery?.elapsed ?? "?"}`] :
      [...(association.length ? [association[0]] : []), ...lines];
    const truncated = selected.some((line) => line.length > 96) || selected.length + 1 > limit;
    return [
      `v1 partial-window drop=${dropped} unavailable=${unavailable} pending=${pending.size} truncated=${truncated}`,
      ...selected,
    ]
      .slice(0, limit)
      .map((line) => line.slice(0, 96));
  });
  return Object.freeze({
    fsBegin,
    fsReturn,
    fsDeliver,
    raw,
    frame,
    wire,
    cycle,
    packet,
    stats: protect(() => ({
      pending: pending.size,
      buckets: buckets.size,
      wires: wires.size,
      raws: raws.size,
      cycles: cycles.size,
      dropped,
      unavailable,
    })),
  });
}

// Shared data window only. FIRST emission belongs to each existing lifetime/scope.
export const accountingTrace = createAccountingTrace();
