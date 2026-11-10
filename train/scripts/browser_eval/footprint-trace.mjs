// Passive attribution only. Strong identity keys have hard COUNT bounds, not
// transitive byte bounds. No IO, timers, proof, work/debt queue or clock authority.
import { AsyncLocalStorage } from "node:async_hooks";

const ns = value => typeof value === "string" && /^\d{1,24}$/.test(value) ? value : null;
const scalar = value => Number.isFinite(value) ? value : null;
const object = value => value !== null && ["object", "function"].includes(typeof value);
const own = (value, key) => Object.getOwnPropertyDescriptor(value, key)?.value;
const clone = value => JSON.parse(JSON.stringify(value));
const fields = () => ({ issued: 0, returned: 0, delivered: 0, rejected: 0,
  syncNs: "0", deliveryNs: "0", maxSync: null, maxDelivery: null });
const publicConsumer = ({ sample, ...row }) => row;
const publicScan = ({ cpuStart, ...row }) => ({ ...row, partial: row.partial ||
  Object.values(row.fs).some(group => group.issued !== group.returned || group.returned !== group.delivered) });

export function createFootprintTrace({ nowNs = () => process.hrtime.bigint().toString(),
  cpuUsage = () => process.cpuUsage() } = {}) {
  const scope = new AsyncLocalStorage(), scans = new Map(), samples = new Map(),
    consumers = new Map(), errors = new Map();
  const counts = { unavailable: 0, overflow: 0, scanEvicted: 0, sampleEvicted: 0,
    consumerEvicted: 0, errorEvicted: 0, issuedScans: 0, startedScans: 0,
    publishedScans: 0, consumedSamples: 0 };
  let serial = 0, capturing = false;
  const projectScan = scan => ({ ...publicScan(scan), partial: publicScan(scan).partial ||
    counts.unavailable > 0 || counts.overflow > 0 });
  const mark = name => { if (counts[name] < Number.MAX_SAFE_INTEGER) counts[name]++; };
  const protect = body => (...args) => {
    if (capturing) { mark("unavailable"); return; }
    capturing = true;
    try { return body(...args); }
    catch { mark("unavailable"); }
    finally { capturing = false; }
  };
  const next = () => {
    if (serial === Number.MAX_SAFE_INTEGER) { mark("overflow"); return; }
    return ++serial;
  };
  const put = (map, key, value, capacity, counter) => {
    if (!map.has(key) && map.size >= capacity) {
      map.delete(map.keys().next().value); mark(counter);
    }
    map.set(key, value);
  };
  const now = () => {
    try { const value = ns(nowNs()); if (value === null) mark("unavailable"); return value; }
    catch { mark("unavailable"); return null; }
  };
  const cpu = () => {
    try {
      const value = cpuUsage(), user = own(value, "user"), system = own(value, "system");
      if ([user, system].every(n => Number.isSafeInteger(n) && n >= 0)) return { user, system };
    } catch {}
    mark("unavailable"); return null;
  };
  const scanFor = id => {
    const scan = scans.get(id);
    if (!scan) mark("unavailable");
    return scan;
  };
  const bindSample = (sample, association) => {
    if (!object(sample)) { mark("unavailable"); return; }
    const prior = samples.get(sample);
    const value = prior && (prior.binding === "ambiguous" || prior.scanId !== association.scanId)
      ? { binding: "ambiguous", scanId: null, exposureNs: null } : association;
    put(samples, sample, value, 32, "sampleEvicted");
  };
  const association = sample => {
    const saved = samples.get(sample);
    if (!saved || saved.binding === "missing") return { binding: "missing", scanId: null, exposureNs: null };
    if (saved.binding === "ambiguous") return { ...saved };
    return scans.has(saved.scanId) ? { ...saved } : { binding: "missing", scanId: null, exposureNs: null };
  };
  const issue = protect(() => {
    const id = next(); if (id === undefined) return;
    const record = { id, issueNs: now(), startNs: null, observedAtMs: null,
      completionNs: null, publicationNs: null, suppressed: false, valid: null,
      chargedBytes: null, cpuStart: cpu(), cpuUserUs: null, cpuSystemUs: null,
      partial: false, contextUnavailable: false,
      fs: { lstat: fields(), readdir: fields(), other: fields() } };
    record.partial = record.issueNs === null || record.cpuStart === null;
    put(scans, id, record, 8, "scanEvicted"); mark("issuedScans"); return id;
  });
  // Once-only body gate survives context setup AND teardown instrumentation
  // failures. An arbitrary original throw has a separate presence flag.
  const run = (id, body) => {
    let entered = false, failed = false, result, error;
    const once = () => {
      if (entered) return result;
      entered = true;
      try { result = body(); } catch (cause) { failed = true; error = cause; }
      return result;
    };
    try { scope.run(id, once); } catch {
      mark("unavailable");
      const affected = scans.get(id); if (affected) affected.partial = true;
      if (!entered) {
        // A failed nested setup must not inherit its parent's attribution.
        // Conservatively quarantine both bounded records, including later
        // async continuations carrying that inherited parent scalar ID.
        let inherited;
        try { inherited = scope.getStore(); } catch {}
        for (const key of [id, inherited]) {
          const scan = scans.get(key);
          if (scan) { scan.partial = true; scan.contextUnavailable = true; }
        }
      }
    }
    if (!entered) once();
    if (failed) throw error;
    return result;
  };
  const started = protect(observedAtMs => {
    const scan = scanFor(scope.getStore()); if (!scan) return;
    if (scan.contextUnavailable) { mark("unavailable"); return; }
    scan.startNs = now(); scan.observedAtMs = scalar(observedAtMs);
    scan.partial ||= scan.startNs === null || scan.observedAtMs === null;
    mark("startedScans");
  });
  const completed = protect((id, result) => {
    const scan = scanFor(id); if (!scan) return;
    scan.completionNs = now(); scan.chargedBytes = scalar(own(result, "chargedBytes"));
    const end = cpu(), start = scan.cpuStart;
    if (end && start && end.user >= start.user && end.system >= start.system) {
      scan.cpuUserUs = end.user - start.user; scan.cpuSystemUs = end.system - start.system;
    } else scan.partial = true;
    scan.partial ||= scan.completionNs === null;
  });
  const published = protect((id, sample) => {
    const scan = scanFor(id); if (!scan) return;
    scan.publicationNs = now();
    const valid = own(sample, "accountingValid"); scan.valid = typeof valid === "boolean" ? valid : null;
    scan.partial ||= scan.publicationNs === null || scan.valid === null;
    bindSample(sample, { binding: "exact", scanId: id, exposureNs: null }); mark("publishedScans");
  });
  const suppressed = protect(id => { const scan = scanFor(id); if (scan) scan.suppressed = true; });
  const copy = protect((from, to) => {
    const saved = association(from); bindSample(to, { ...saved, exposureNs: now() });
  });
  const consume = protect((sample, originalNowMs, role) => {
    if (!["pre-reservation", "post-write"].includes(role)) { mark("unavailable"); return; }
    const id = next(); if (id === undefined) return;
    const saved = association(sample), start = scalar(own(sample, "observedAtMs"));
    const nowMs = scalar(originalNowMs);
    const consumeNs = now();
    put(consumers, id, { id, sample, ...saved, consumeNs, nowMs,
      partial: saved.binding !== "exact" || start === null || nowMs === null || consumeNs === null,
      sampleStartMs: start, ageMs: nowMs === null || start === null ? null : nowMs - start, role },
    16, "consumerEvicted"); mark("consumedSamples");
  });
  const bindStaleError = protect((error, sample, originalNowMs, role) => {
    if (!object(error)) { mark("unavailable"); return; }
    const matches = [...consumers.values()].filter(row => row.sample === sample &&
      Object.is(row.nowMs, scalar(originalNowMs)) && row.role === role);
    const row = matches.length === 1 ? matches[0] : null;
    const scan = row?.binding === "exact" ? scans.get(row.scanId) : null;
    let binding = matches.length > 1 ? "ambiguous" : row?.binding ?? "missing";
    if (binding === "exact" && !scan) binding = "missing";
    const prior = errors.get(error);
    if (prior && (prior.binding === "ambiguous" || prior.consumer?.id !== row?.id)) binding = "ambiguous";
    const record = { binding, consumer: row ? clone(publicConsumer(row)) : null,
      scan: binding === "exact" ? clone(projectScan(scan)) : null };
    put(errors, error, record, 8, "errorEvicted");
  });
  const groupFor = (id, op) => {
    if (typeof op !== "string" || !/^(fs|fd|stream)\.[A-Za-z]{1,12}$/.test(op)) {
      mark("unavailable"); return null;
    }
    const scan = scanFor(id); if (!scan) return null;
    if (scan.contextUnavailable) { mark("unavailable"); return null; }
    return { scan, group: scan.fs[op === "fs.lstat" ? "lstat" : op === "fs.readdir" ? "readdir" : "other"] };
  };
  const increment = (scan, group, key) => {
    if (group[key] === Number.MAX_SAFE_INTEGER) { scan.partial = true; mark("overflow"); }
    else group[key]++;
  };
  const span = (scan, group, key, maxKey, op, start, end, fact) => {
    const a = ns(start), b = ns(end);
    if (a === null || b === null || BigInt(b) < BigInt(a)) {
      scan.partial = true; mark("unavailable"); return;
    }
    const elapsed = BigInt(b) - BigInt(a);
    if (group[key] !== null) {
      const total = BigInt(group[key]) + elapsed;
      if (total.toString().length > 24) { group[key] = null; scan.partial = true; mark("overflow"); }
      else group[key] = total.toString();
    }
    if (group[maxKey] === null || elapsed > BigInt(group[maxKey].durationNs)) {
      group[maxKey] = { op, ...fact, durationNs: elapsed.toString() };
    }
  };
  const fsBegin = protect((op, startNs) => {
    const id = scope.getStore(); if (id === undefined) return;
    const found = groupFor(id, op); if (!found) return;
    increment(found.scan, found.group, "issued");
    if (ns(startNs) === null) { found.scan.partial = true; mark("unavailable"); }
    return id;
  });
  const fsReturn = protect((id, op, startNs, returnNs, rejected) => {
    if (id === undefined) return;
    const found = groupFor(id, op); if (!found) return;
    const { scan, group } = found;
    increment(scan, group, "returned"); if (rejected === true) increment(scan, group, "rejected");
    span(scan, group, "syncNs", "maxSync", op, startNs, returnNs,
      { startNs: ns(startNs), returnNs: ns(returnNs), rejected: rejected === true });
  });
  const fsDeliver = protect((id, op, startNs, returnNs, deliveryNs, rejected) => {
    if (id === undefined) return;
    const found = groupFor(id, op); if (!found) return;
    const { scan, group } = found; increment(scan, group, "delivered");
    span(scan, group, "deliveryNs", "maxDelivery", op, returnNs, deliveryNs,
      { startNs: ns(startNs), returnNs: ns(returnNs), deliveryNs: ns(deliveryNs), rejected: rejected === true });
  });
  const selected = error => errors.get(error) ?? errors.get(own(error, "cause")) ?? null;
  const packet = protect((error, budget) => {
    const cause = object(error) ? own(error, "cause") : null;
    if (![object(error) ? own(error, "code") : null, object(cause) ? own(cause, "code") : null]
      .includes("STORE_ACCOUNTING")) return [];
    const saved = selected(error), binding = saved?.binding ?? "missing";
    const row = saved?.consumer, scan = saved?.scan;
    const lines = [`footprint binding=${binding} scan=${scan?.id ?? "?"} role=${row?.role ?? "?"}`];
    if (scan && row) {
      lines.push(`issue=${scan.issueNs} start=${scan.startNs} sampleMs=${scan.observedAtMs}`);
      lines.push(`done=${scan.completionNs} pub=${scan.publicationNs}`);
      lines.push(`expose=${row.exposureNs} consume=${row.consumeNs}`);
      lines.push(`original nowMs=${row.nowMs} startMs=${row.sampleStartMs} ageMs=${row.ageMs}`);
      const groups = Object.entries(scan.fs);
      lines.push(groups.map(([name, g]) => `${name}=${g.issued}/${g.returned}/${g.delivered}`).join(" "));
      const best = key => groups.map(([, g]) => g[key]).filter(Boolean)
        .reduce((a, b) => !a || BigInt(b.durationNs) > BigInt(a.durationNs) ? b : a, null);
      const sync = best("maxSync"), delivery = best("maxDelivery");
      lines.push(`scan sync=${sync?.op ?? "?"}:${sync?.durationNs ?? "?"} delivery=${delivery?.op ?? "?"}:${delivery?.durationNs ?? "?"}`);
      lines.push(`partial=${scan.partial || row.partial} processCPUus=${scan.cpuUserUs}/${scan.cpuSystemUs}`);
    }
    lines.push("Node hooks, overlap!=cause, partial-window, processCPU!=scanCPU, overhead>0");
    const limit = Number.isSafeInteger(budget) ? Math.min(12, Math.max(0, budget)) : 0;
    return lines.slice(0, limit).map(line => line.slice(0, 96));
  });
  const snapshot = protect(() => {
    const result = { schemaVersion: 1, diagnosticOnly: true, partialWindow: true,
      scans: [...scans.values()].map(projectScan),
      consumers: [...consumers.values()].map(publicConsumer), failures: [...errors.values()],
      stats: { ...counts, sampleKeys: samples.size, errorKeys: errors.size } };
    const text = JSON.stringify(result);
    if (Buffer.byteLength(text) > 65536) {
      mark("overflow"); return { schemaVersion: 1, diagnosticOnly: true, status: "overflow",
        partialWindow: true, scans: [], consumers: [], failures: [], stats: { ...counts } };
    }
    return JSON.parse(text);
  });
  return Object.freeze({ issue, run, started, completed, published, suppressed, copy,
    consume, bindStaleError, fsBegin, fsReturn, fsDeliver, packet, snapshot });
}

// One diagnostic window per canonical module URL and process, never shared proof.
export const footprintTrace = createFootprintTrace();
