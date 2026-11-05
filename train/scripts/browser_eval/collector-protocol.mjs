// Collector/teardown message transitions over the same supervisor-owned run
// state and shared ID authority passed in as `ctx`. No separate registry or
// factory: the owned-roots registry, signal authorization map and teardown
// authorization are read from the run-global structures owned by
// supervisor-protocol.mjs. A healthy collector must remain usable after a
// driver fault; a fresh teardown-only channel may continue identity-safe
// cleanup but can never take new roots or launch workload.

import {
  ABI,
  base,
  copyDeep,
  envelope,
  eq,
  exactFields,
  faultReasons,
  identityKey,
  isAbs,
  isBsdRow,
  isIdentity,
  isInspection,
  isObj,
  isPid,
  isProbeResult,
  isSample,
  isU64,
  need,
  poison,
  rootKinds,
  strNE,
  unique,
  workloadKinds,
} from "./protocol-values.mjs";

const startupReady = (ctx, st, teardown, message) => {
  need(st, !st.ready && st.seq.c2s === 0, "ready order");
  envelope(
    st,
    "c2s",
    message,
    [
      ...base,
      "stage",
      "requestId",
      "collector",
      "supervisor",
      "platform",
      "arch",
      "abi",
      "python",
      "libprocPath",
    ],
    ctx.runId,
  );
  const p = message.python;
  need(
    st,
    message.stage === "startup" &&
      message.requestId === null &&
      isIdentity(message.collector) &&
      isIdentity(message.supervisor) &&
      message.platform === "darwin" &&
      message.arch === "arm64" &&
      eq(message.abi, ABI) &&
      message.libprocPath === "/usr/lib/libproc.dylib" &&
      isObj(p) &&
      exactFields(p, ["executable", "prefix", "basePrefix", "version"]) &&
      strNE(p.executable) &&
      strNE(p.prefix) &&
      strNE(p.basePrefix) &&
      strNE(p.version),
    "ready fields",
  );
  const auth = ctx.getTeardownAuth();
  need(
    st,
    !teardown || (auth !== null && eq(message.collector, auth.identity)),
    "teardown identity",
  );
  st.ready = true;
};

const rootsAccepted = (ctx, st, message) => {
  need(st, st.ready && !st.terminal && !st.closing, "roots-accepted order");
  envelope(st, "c2s", message, [...base, "stage", "requestId"], ctx.runId);
  const req = st.pending.get(message.requestId);
  need(st, req !== undefined && req.type === "own-roots", "roots-accepted binding");
  // Root ownership activates only on the exact acknowledgement: pending
  // copies move into the shared registry now, still failing on a conflict.
  for (const r of req.roots) {
    const key = identityKey(r.identity);
    const prev = ctx.ownedRoots.get(key);
    need(st, prev === undefined || eq(prev, r), "root conflict");
    ctx.ownedRoots.set(key, r);
  }
  st.pending.delete(message.requestId);
};

const processSamples = (ctx, st, message) => {
  envelope(
    st,
    "c2s",
    message,
    [
      ...base,
      "requestId",
      "startedAtMonoNs",
      "finishedAtMonoNs",
      "discovered",
      "samples",
      "gone",
      "inspected",
      "probes",
    ],
    ctx.runId,
  );
  const req = st.pending.get(message.requestId);
  need(st, req !== undefined && req.type === "sample", "sample binding");
  need(
    st,
    isU64(message.startedAtMonoNs) &&
      isU64(message.finishedAtMonoNs) &&
      BigInt(message.finishedAtMonoNs) >= BigInt(message.startedAtMonoNs) &&
      Array.isArray(message.discovered) &&
      message.discovered.every(isBsdRow) &&
      unique(message.discovered, (d) => d.identity.pid) &&
      Array.isArray(message.samples) &&
      message.samples.every(isSample) &&
      Array.isArray(message.gone) &&
      message.gone.every(isIdentity) &&
      Array.isArray(message.inspected) &&
      message.inspected.every(isInspection) &&
      Array.isArray(message.probes) &&
      message.probes.every(isProbeResult),
    "sample fields",
  );
  const covered = [...message.samples.map((s) => s.identity), ...message.gone].map(identityKey);
  const want = req.owned.map(identityKey);
  need(
    st,
    covered.length === want.length &&
      new Set(covered).size === want.length &&
      want.every((k) => covered.includes(k)),
    "sample partition",
  );
  need(
    st,
    unique(message.inspected, (x) => x.pid) &&
      message.inspected.length === req.inspectPids.length &&
      req.inspectPids.every((p) => message.inspected.some((x) => x.pid === p)) &&
      unique(message.probes, (x) => identityKey(x.identity)) &&
      message.probes.length === req.probes.length &&
      req.probes.every((p) => message.probes.some((x) => eq(x.identity, p))),
    "inspection/probe sets",
  );
  st.pending.delete(message.requestId);
};

const signalResult = (ctx, st, message) => {
  envelope(st, "c2s", message, [...base, "requestId", "identity", "signal", "outcome"], ctx.runId);
  const req = st.pending.get(message.requestId);
  need(
    st,
    req !== undefined &&
      req.type === "signal" &&
      ["sent", "gone", "identity-changed"].includes(message.outcome) &&
      eq(message.identity, req.identity) &&
      message.signal === req.signal,
    "signal-result binding",
  );
  st.pending.delete(message.requestId);
};

const accountingFault = (ctx, st, message) => {
  envelope(st, "c2s", message, [...base, "requestId", "code", "reason", "diagnostic"], ctx.runId);
  need(
    st,
    (message.requestId === null || st.pending.has(message.requestId)) &&
      ["ACCOUNTING_UNAVAILABLE", "IPC_INVALID"].includes(message.code) &&
      faultReasons.includes(message.reason) &&
      typeof message.diagnostic === "string" &&
      Buffer.byteLength(message.diagnostic, "utf8") <= 4096,
    "accounting-fault fields",
  );
  if (message.requestId !== null) st.pending.delete(message.requestId);
  ctx.failed = true;
  st.terminal = true;
};

export const collectC2S = (ctx, st, teardown, message) => {
  const t = message.type;
  // A terminal stream is closed for every later message in both
  // directions; a fatal collector fault is honored even before startup
  // ready completes, it only terminates the channel, never injects
  // evidence.
  need(st, !st.terminal, "terminal stream");
  if (t === "accounting-fault") {
    accountingFault(ctx, st, message);
    return;
  }
  if (t === "ready") {
    if (message.stage === "startup") {
      startupReady(ctx, st, teardown, message);
      return;
    }
    if (message.stage === "roots-accepted") {
      rootsAccepted(ctx, st, message);
      return;
    }
    poison(st, "ready stage");
  }
  need(st, st.ready && !st.terminal && !st.closing, `${t} order`);
  if (t === "process-samples") {
    processSamples(ctx, st, message);
    return;
  }
  if (t === "signal-result") {
    signalResult(ctx, st, message);
    return;
  }
  poison(st, `c2s type ${t}`);
};

const ownRoots = (ctx, st, teardown, message) => {
  need(st, !teardown, "own-roots authority");
  envelope(st, "s2c", message, [...base, "requestId", "roots"], ctx.runId);
  need(st, Array.isArray(message.roots), "roots");
  const roots = copyDeep(message.roots);
  for (const r of roots) {
    need(
      st,
      isObj(r) &&
        exactFields(r, ["identity", "kind", "expectedExecutable", "scopeRunId"]) &&
        isIdentity(r.identity) &&
        rootKinds.includes(r.kind) &&
        isAbs(r.expectedExecutable) &&
        // A native-authorized selftest subrun keeps its own scope value
        // namespaced under the run; it is never coerced to the parent.
        (r.scopeRunId === ctx.runId ||
          r.scopeRunId.startsWith(`${ctx.runId}:`)),
      "root fields",
    );
    const key = identityKey(r.identity);
    const prev = ctx.ownedRoots.get(key);
    need(st, prev === undefined || eq(prev, r), "root conflict");
  }
  // A run-global ordinary-work fault admits no new workload roots on any
  // channel. The one preserved seam on a still-healthy collector is the
  // trusted accounted cleanup-helper registration; new browser/driver/
  // python/fixture workload after a fault stays rejected.
  need(st, !ctx.failed || roots.every((r) => r.kind === "helper"), "workload after fault");
  ctx.claimId(message.requestId, "request");
  // Roots stay pending and unsignalable until the exact roots-accepted
  // acknowledgement commits them into the shared registry.
  st.pending.set(message.requestId, { type: "own-roots", roots });
};

const sampleRequest = (ctx, st, message) => {
  envelope(st, "s2c", message, [...base, "requestId", "owned", "inspectPids", "probes"], ctx.runId);
  need(
    st,
    Array.isArray(message.owned) &&
      message.owned.every(isIdentity) &&
      unique(message.owned, identityKey) &&
      Array.isArray(message.inspectPids) &&
      message.inspectPids.every(isPid) &&
      unique(message.inspectPids, (x) => x) &&
      Array.isArray(message.probes) &&
      message.probes.every(isIdentity) &&
      unique(message.probes, identityKey),
    "sample request fields",
  );
  ctx.claimId(message.requestId, "request");
  // The monitor's declared cached owned union is the private
  // native-authorized membership a descendant signal may target; union
  // membership is additive because tuples are retained.
  for (const i of message.owned) ctx.ownedMembers.add(identityKey(i));
  st.pending.set(message.requestId, {
    type: "sample",
    owned: copyDeep(message.owned),
    inspectPids: [...message.inspectPids],
    probes: copyDeep(message.probes),
  });
};

const signalRequest = (ctx, st, message) => {
  envelope(st, "s2c", message, [...base, "requestId", "identity", "signal"], ctx.runId);
  const binding = ctx.signalAuth.get(message.requestId);
  const key = isObj(message.identity) ? identityKey(message.identity) : "";
  const root = isObj(message.identity)
    ? ctx.ownedRoots.get(key)
    : undefined;
  // A registered workload root is signalable; so is a cached workload
  // descendant from the monitor's declared union (a reparented member
  // need not be an explicit root). A known supervisor/collector or any
  // other accounting root stays refused either way.
  const target =
    root !== undefined
      ? workloadKinds.includes(root.kind)
      : ctx.ownedMembers.has(key);
  need(
    st,
    binding !== undefined &&
      eq(binding.identity, message.identity) &&
      binding.signal === message.signal &&
      isIdentity(message.identity) &&
      ["TERM", "KILL"].includes(message.signal) &&
      target,
    "signal authorization",
  );
  ctx.signalAuth.delete(message.requestId);
  ctx.activateId(message.requestId, "request");
  st.pending.set(message.requestId, {
    type: "signal",
    identity: copyDeep(message.identity),
    signal: message.signal,
  });
};

const shutdownRequest = (ctx, st, message) => {
  envelope(st, "s2c", message, [...base, "requestId"], ctx.runId);
  need(st, st.pending.size === 0, "shutdown pending");
  ctx.claimId(message.requestId, "request");
  st.closing = true;
};

export const collectS2C = (ctx, st, teardown, message) => {
  need(st, st.ready && !st.terminal && !st.closing, `${message.type} order`);
  const t = message.type;
  if (t === "own-roots") {
    ownRoots(ctx, st, teardown, message);
    return;
  }
  if (t === "sample") {
    sampleRequest(ctx, st, message);
    return;
  }
  if (t === "signal") {
    signalRequest(ctx, st, message);
    return;
  }
  if (t === "shutdown") {
    shutdownRequest(ctx, st, message);
    return;
  }
  poison(st, `s2c type ${t}`);
};
