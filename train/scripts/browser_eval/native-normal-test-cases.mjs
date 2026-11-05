// native-normal-test-cases.mjs — TEST-ONLY leaf for the ONE serial real
// Native group: the WHOLE local sendClose plus the Phase2-4 normal
// cases moved intact out of native-supervision.test.mjs (corrective
// 76). Sole export runNativeNormalCases(ctx) — the import is
// effect-free; explicit work is invoked ONCE inside the SAME existing
// serial group over the SAME already-created genuine group
// capabilities, and the original arbitrary failure is rejected
// unchanged. This leaf holds NO proof/status/owner/clock/queue/budget
// authority — `normal` is the suite's shared control flag only.
// Source-only, UNEXECUTED until safety clearance. Original bounds
// only: group <= 60000 ms, each fixture <= 10000 ms, combined
// observed+retained <= 4 MiB — no skips, platform fallback, injected
// clocks, fake Native, raw/group kills or post-stop probes.
import assert from "node:assert/strict";
import { createCleanupController } from "./watchdog-cleanup.mjs";

// Private EXACT copy of the suite's local pure identity predicate —
// N01 keeps the suite's own predicate/assertions; this is a copy
// input, never an undeclared export.
const isIdentity = (t) =>
  t !== null && typeof t === "object" &&
  Number.isSafeInteger(t.pid) && t.pid > 0 &&
  typeof t.startSec === "string" && /^\d+$/.test(t.startSec) &&
  Number.isSafeInteger(t.startUsec) && t.startUsec >= 0 && t.startUsec < 1e6;

export async function runNativeNormalCases(ctx) {
  const {
    h, monitor: m1, ready, lifetime, clock, bounds,
    runId: RUN_ID, nestedRunId: NESTED, order, normal,
    until, within, fixtureMeta, recOf, assertSettledChild,
  } = ctx;
  const now = clock.nowMonoMs;
  const groupEnd = bounds.deadlineMonoMs;
  const snap = () => h.snapshot();
  const handles = () => snap().handles;
  const tupleEq = (a, b) =>
    isIdentity(a) && isIdentity(b) &&
    a.pid === b.pid && a.startSec === b.startSec && a.startUsec === b.startUsec;
  const tupleKey = (t) => `${t.pid}|${t.startSec}|${t.startUsec}`;

  // The fixed private `close` frame only — the suite's own send is
  // receipt-retained on the same shared owner: the neutral callback
  // receipt always settles (recording an error fact), while a send
  // failure rejects the caller promise with the raw error. An
  // ambiguous synchronous send throw keeps the prearmed debt
  // UNRESOLVED — never a settle-as-proof or a replay.
  const sendClose = (child, fixtureId, scopeRunId) => {
    let done;
    const receipt = new Promise((r) => (done = r));
    lifetime.retainActual(receipt);
    return new Promise((resolve, reject) => {
      const msg = { testVersion: 1, runId: RUN_ID, fixtureId, scopeRunId, type: "close", pid: child.pid };
      try {
        child.send(msg, (err) => {
          done({ atMonoMs: now(), present: err !== null && err !== undefined, text: err == null ? null : String(err.message ?? err) });
          if (err === null || err === undefined) resolve();
          else reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  // Await the actual returned-child exit — the real exit event or an
  // already-landed recorded fact — under the SAME original bound. The
  // leaf's own listeners are removed on EVERY outcome (exit, error,
  // bound or unwind), never left as losing observers, and no
  // inherited-pipe close is awaited while a live descendant holds it.
  const awaitChildExit = async (child, end, tag) => {
    const r0 = recOf(child.pid);
    if (r0 !== undefined && r0.facts.exit !== null) return;
    let off = () => {};
    try {
      await within(
        () =>
          new Promise((resolve, reject) => {
            const onExit = () => {
              off();
              resolve();
            };
            const onErr = (e) => {
              off();
              reject(e);
            };
            off = () => {
              child.off("exit", onExit);
              child.off("error", onErr);
            };
            child.once("exit", onExit);
            child.once("error", onErr);
          }),
        end,
        tag,
      );
    } finally {
      off();
    }
  };

  // ============ Phase 2 — N02/N03 + N06 close/requery ============
  const launchA = await h.launch({ monitor: m1, mode: "listener", scopeRunId: RUN_ID });
  const metaA = fixtureMeta(launchA.identity.pid);
  const A = now();
  assert.ok(A <= metaA.F + 2000, `A ${A - metaA.F} > 2000`);
  // N02: the admitted Node fixture has a live full tuple, native image,
  // one UID and proven ancestry (direct fork of this supervisor).
  assert.ok(isIdentity(launchA.identity), "fixture tuple");
  const fixRow = m1._ownership._ownedRows().find((r) => r.identity.pid === launchA.identity.pid);
  assert.ok(fixRow !== undefined, "fixture row");
  assert.equal(fixRow.ppid, process.pid);
  for (const t of [ready.supervisor, ready.collector, launchA.identity]) {
    const row = m1._ownership._rowFor(t);
    assert.ok(row !== null, `full tuple ${t.pid}`);
    assert.ok(Number.isSafeInteger(row.uid), `uid ${t.pid}`);
  }
  const uids = new Set([ready.supervisor, ready.collector, launchA.identity].map((t) => m1._ownership._rowFor(t).uid));
  assert.equal(uids.size, 1, "one UID");
  const firstObs = m1.lastObservation();
  assert.ok(firstObs !== null && firstObs.accountingValid === true);
  assert.ok(firstObs.rssBytes > 0 && firstObs.sampled >= 3);
  // N03: real five-second admitted observation at the 250 ms tick — the
  // final admitted covering observation is a GENUINE fresh sample whose
  // admitted atMonoNs timestamp lands at/after E — never a private
  // Native commit time, never a stale lastObservation.
  const E = A + 5000;
  await until(E);
  // The sample's REAL options deadline is the SAME captured original
  // bound the outer race enforces — never the wider per-fixture P.
  const rEnd = Math.min(metaA.F + 7500, groupEnd);
  const obs = await within(() => m1.sample({ deadlineMonoMs: rEnd }), rEnd, "covering sample");
  const R = now();
  assert.ok(R <= metaA.F + 7500, `R ${R - metaA.F} > 7500`);
  assert.ok(BigInt(String(obs.atMonoNs)) >= BigInt(E) * 1000000n, "covering obs at/after E");
  // Raw-round evidence: exact request/reply IDs paired ONLY inside the
  // actual [A, R] window — native own-origin duration <= 500 ms,
  // supervisor send/reply latency and completed-cycle gaps <= 500 ms,
  // full (pid,startSec,startUsec) tuple coverage with a disjoint
  // samples/gone partition and retained discovery per request — paired
  // with the final admitted covering observation, never presented as
  // private commit timestamps.
  const winLo = BigInt(A) * 1000000n;
  const winHi = BigInt(R) * 1000000n;
  const rounds = new Map();
  for (const e of snap().trace) {
    const w = e.kind === "sample-request" || e.kind === "process-samples";
    if (!w || e.value.requestId === undefined || BigInt(e.atMonoNs) < winLo || BigInt(e.atMonoNs) > winHi) continue;
    const cur = rounds.get(e.value.requestId) ?? {};
    if (e.kind === "sample-request") cur.req = e;
    else cur.reply = e;
    rounds.set(e.value.requestId, cur);
  }
  let prevReplyNs = null;
  let covered = 0;
  for (const { req, reply } of rounds.values()) {
    if (req === undefined || reply === undefined) continue;
    const startNs = BigInt(reply.value.startedAtMonoNs);
    const finNs = BigInt(reply.value.finishedAtMonoNs);
    assert.ok(finNs >= startNs, "native duration order");
    assert.ok(Number(finNs - startNs) / 1e6 <= 500, "native duration");
    const latency = Number(BigInt(reply.atMonoNs) - BigInt(req.atMonoNs)) / 1e6;
    assert.ok(latency <= 500, "supervisor latency");
    if (prevReplyNs !== null) {
      const gap = Number(BigInt(reply.atMonoNs) - prevReplyNs) / 1e6;
      assert.ok(gap <= 500, "completed-cycle gap");
    }
    prevReplyNs = BigInt(reply.atMonoNs);
    if (
      Array.isArray(req.value.owned) &&
      req.value.owned.some((o) => tupleEq(o, launchA.identity))
    ) {
      covered += 1;
      const sKeys = new Set((reply.value.samples ?? []).map((s) => tupleKey(s.identity)));
      const gKeys = new Set((reply.value.gone ?? []).map((g) => tupleKey(g)));
      const keys = new Set([...sKeys, ...gKeys]);
      assert.equal(keys.size, sKeys.size + gKeys.size, "samples/gone partition");
      for (const o of req.value.owned) assert.ok(keys.has(tupleKey(o)), "coverage");
      for (const d of reply.value.discovered ?? []) assert.ok(isIdentity(d.identity), "discovery tuple");
    }
  }
  assert.ok(covered >= 15, `covering rounds ${covered}`);
  assert.ok(obs.accountingValid === true);
  assert.ok(obs.rssBytes > 0 && obs.sampled >= 3 && obs.peakRssBytes >= obs.rssBytes);
  // N06 graceful retirement: fixed private close at R, then fixture
  // exit+BOTH closes < D, fresh native old-tuple gone, registered
  // listener absence and healthy accounting all before P = F+10000 —
  // the shared healthy collector is never stopped here.
  order.push("listeners-before-close");
  // The first close ISSUE is bounded at the ORIGINAL R <= F+7500 —
  // asserted on the actual call-entry INSIDE the thunk BEFORE the send
  // issues (a private diagnostic, never the sample-end R), so a late
  // issue is prevented; the public send-callback wait is bounded by
  // the ORIGINAL min(D, Gend) and the raw callback receipt stays held.
  let Rclose;
  await within(() => {
    Rclose = now();
    assert.ok(Rclose <= metaA.F + 7500, `close entry ${Rclose - metaA.F} > 7500`);
    return sendClose(launchA.child, metaA.fixtureId, RUN_ID);
  }, Math.min(metaA.D, groupEnd), "listener close issue");
  await within(() => launchA.whenPhysicallySettled, metaA.D, "listener close");
  const recA = assertSettledChild(launchA.identity.pid);
  assert.equal(recA.facts.exit.code, 0);
  const goneA = await m1.probeIdentity(launchA.identity, { deadlineMonoMs: metaA.P });
  assert.equal(goneA, "gone");
  const lq0 = await m1.queryListeners(RUN_ID, { deadlineMonoMs: metaA.P });
  assert.equal(lq0.listeners.length, 0);
  assert.equal(lq0.unexpected.length, 0);
  assert.equal(m1.fault(), null);
  assert.ok(now() < metaA.P, "retirement before P");
  // N06: the SAME actually closed N03 registered port's real gated
  // query — the legal empty lsof exit 1 with empty stdout and stderr.
  // No unowned ephemeral reservation is ever made.
  const monA = snap().monitors.find((m) => m.runId === RUN_ID);
  const emptyGate = monA.gates.find((g) => g.query?.kind === "port" && g.query.port === recA.port);
  assert.ok(emptyGate !== undefined, "empty port gate");
  const emptyRec = handles().find((c) => c.queryId === emptyGate.queryId);
  assert.ok(emptyRec !== undefined, "empty lsof rec");
  assert.equal(emptyRec.facts.exit.code, 1);
  assert.equal(emptyRec.facts.outBytes, 0);
  assert.equal(emptyRec.facts.errBytes, 0);

  // ============ Phase 3 — N09/N10/N11 nested scope ============
  const launchF = await h.launch({ monitor: m1, mode: "finalizer", scopeRunId: RUN_ID });
  const metaF = fixtureMeta(launchF.identity.pid);
  const launchR = await h.launch({ monitor: m1, mode: "reparent", scopeRunId: NESTED });
  const metaR = fixtureMeta(launchR.identity.pid);
  const recR = recOf(launchR.identity.pid);
  assert.ok(recR.descendant !== null, "descendant retained");
  const descId = recR.descendant.identity;
  assert.ok(isIdentity(descId), "descendant tuple");
  // N10: the actual direct-root exit — real child exit event or an
  // already-landed fact — is observed BEFORE reading exit.code under
  // the same original bound; BOTH inherited pipes are still held by
  // the live descendant and are never awaited here.
  await awaitChildExit(launchR.child, metaR.F + 3000, "parent exit");
  const recR2 = recOf(launchR.identity.pid);
  assert.ok(recR2 !== undefined && recR2.facts.exit !== null, "parent exit landed");
  assert.equal(recR2.facts.exit.code, 0);
  assert.equal(recR2.facts.outClosed, false, "inherited stdout held");
  assert.equal(recR2.facts.errClosed, false, "inherited stderr held");
  const sameDesc = await m1.probeIdentity(descId, { deadlineMonoMs: metaR.P });
  assert.equal(sameDesc, "same-live");
  const C = now();
  assert.ok(C <= metaR.F + 3000, `C ${C - metaR.F} > 3000`);
  // N09/N10: nested selftest-workload cleanup — cached membership
  // through reparent, TERM >= C+2000 ignored, KILL >= C+4000 while the
  // tuple still matches, proof by min(C+5000, D, Gend).
  const nestedEnd = Math.min(C + 5000, metaR.D, groupEnd);
  const ctlNested = createCleanupController({ monitor: m1, clock, runId: RUN_ID });
  const nestedProof = await within(
    () =>
      ctlNested.run({
        phase: "check", scope: "selftest-workload", scopeRunId: NESTED,
        expectedFinalizer: ready.supervisor, supervisor: ready.supervisor,
        deadlineMonoMs: nestedEnd,
        settleWorkloadHandles: ({ deadlineMonoMs }) =>
          h.settleHandles(NESTED, { deadlineMonoMs }),
        cleanupStartMonoMs: C,
      }),
    nestedEnd, "nested cleanup",
  );
  assert.equal(nestedProof.verified, true);
  assert.deepEqual(nestedProof.survivorIdentities, []);
  assert.deepEqual(nestedProof.listenersRemaining, []);
  assert.equal(nestedProof.accountingValid, true);
  // N09: the ACTUAL TERM lands >= C+2000 and the ACTUAL KILL >= C+4000
  // on the cached descendant tuple, with a real same-live native probe
  // between the two sends — never an order-only or early-exit claim.
  const sigTrace = snap().trace.filter((e) => e.kind === "signal-request");
  const descSigs = sigTrace.filter((e) => tupleEq(e.value.identity, descId));
  const termReq = descSigs.find((e) => e.value.signal === "TERM");
  const killReq = descSigs.find((e) => e.value.signal === "KILL");
  assert.ok(termReq !== undefined && killReq !== undefined, "TERM then KILL issued");
  const termNs = BigInt(termReq.atMonoNs);
  const killNs = BigInt(killReq.atMonoNs);
  assert.ok(termNs >= BigInt(C + 2000) * 1000000n, "TERM >= C+2000");
  assert.ok(killNs >= BigInt(C + 4000) * 1000000n, "KILL >= C+4000");
  assert.ok(killNs > termNs, "KILL after TERM");
  const liveMid = snap().trace.some(
    (e) =>
      e.kind === "process-samples" && BigInt(e.atMonoNs) >= termNs && BigInt(e.atMonoNs) <= killNs &&
      (e.value.probes ?? []).some((p) => tupleEq(p.identity, descId) && p.state === "same-live"),
  );
  assert.ok(liveMid, "same-live before KILL");
  // The reparent root's physical exit+BOTH closes land only when the
  // descendant really dies — the fresh gone probe FOLLOWS the actual
  // physical closure, never precedes it.
  const recR3 = assertSettledChild(launchR.identity.pid);
  assert.equal(recR3.facts.exit.code, 0);
  const goneD = await m1.probeIdentity(descId, { deadlineMonoMs: groupEnd });
  assert.equal(goneD, "gone");
  // The surviving healthy parent fixture, supervisor and collector
  // stay live — a scoped nested cleanup never narrows them.
  assert.equal(await m1.probeIdentity(launchF.identity, { deadlineMonoMs: groupEnd }), "same-live");
  assert.equal(await m1.probeIdentity(ready.supervisor, { deadlineMonoMs: groupEnd }), "same-live");
  assert.equal(await m1.probeIdentity(ready.collector, { deadlineMonoMs: groupEnd }), "same-live");
  const unionObs = await m1.sample({ deadlineMonoMs: groupEnd });
  assert.ok(unionObs.accountingValid === true && unionObs.sampled >= 3);
  assert.equal(m1.fault(), null);
  // N11: the finalizer proves same-live as its named tuple, then closes
  // and exits; the still-healthy collector proves the old identity gone
  // after actual direct-handle exit+BOTH closes.
  const sameF = await m1.probeIdentity(launchF.identity, { deadlineMonoMs: metaF.P });
  assert.equal(sameF, "same-live");
  // The finalizer close ISSUE plus its real callback wait are bounded
  // by the original min(D, P, Gend); RcloseF is the actual call-entry
  // fact — the same private local diagnostic, never a proof or status.
  let RcloseF;
  await within(() => {
    RcloseF = now();
    return sendClose(launchF.child, metaF.fixtureId, RUN_ID);
  }, Math.min(metaF.D, metaF.P, groupEnd), "finalizer close issue");
  assert.ok(RcloseF <= metaF.P, "finalizer close entry");
  await within(() => launchF.whenPhysicallySettled, metaF.D, "finalizer close");
  const recF = assertSettledChild(launchF.identity.pid);
  assert.equal(recF.facts.exit.code, 0);
  const goneF = await m1.probeIdentity(launchF.identity, { deadlineMonoMs: metaF.P });
  assert.equal(goneF, "gone");
  assert.equal(m1.fault(), null);
  assert.ok(now() < metaF.P, "finalizer before P");

  // ============ Phase 4 — N04/N05/N12 original TERM + formal ============
  const launchB = await h.launch({ monitor: m1, mode: "listener", scopeRunId: RUN_ID });
  const metaB = fixtureMeta(launchB.identity.pid);
  // N04: real gated owned-PIDs and port query find the actual listener
  // tuple; no unexpected listener anywhere in scope.
  order.push("listeners");
  const lq1 = await m1.queryListeners(RUN_ID, { deadlineMonoMs: metaB.P });
  const hit = lq1.listeners.find((l) => l.port === recOf(launchB.identity.pid).port && l.pid === launchB.identity.pid);
  assert.ok(hit !== undefined, "listener hit");
  assert.equal(hit.address, "127.0.0.1");
  assert.deepEqual(lq1.unexpected, []);
  // N05: for every real query, the fresh wrapper tuple is pinned Python,
  // roots acknowledgement precedes authorization/frame, no lsof output
  // before the gate, and the helper is counted once and really reaped.
  const monDiag = snap().monitors.find((m) => m.runId === RUN_ID);
  assert.ok(monDiag !== undefined && monDiag.gates.length > 0, "gates");
  const traceNow = snap().trace;
  for (const g of monDiag.gates) {
    assert.equal(g.authorized, true, "gate authorized");
    assert.equal(g.execAccepted, true, "exec accepted");
    assert.ok(isIdentity(g.identity), "wrapper tuple");
    const own = traceNow.findIndex(
      (e) =>
        e.kind === "own-roots" &&
        e.value.roots.some((r) => r.kind === "helper" && r.identity.pid === g.identity.pid),
    );
    const reqId = own === -1 ? undefined : traceNow[own].value.requestId;
    const ackIdx = reqId === undefined ? -1 : traceNow.findIndex((e) => e.kind === "roots-accepted" && e.value.requestId === reqId);
    const authIdx = traceNow.findIndex((e) => e.kind === "authorize-exec" && e.value.queryId === g.queryId);
    const execIdx = traceNow.findIndex((e) => e.kind === "exec-gate" && e.value.requestId === g.queryId);
    assert.ok(own !== -1 && ackIdx > own && authIdx > ackIdx && execIdx > authIdx, "gate order");
    const lrec = handles().find((c) => c.queryId === g.queryId);
    assert.ok(lrec !== undefined, "lsof rec");
    assert.equal(lrec.facts.gateEarly, false, "no pre-gate output");
    assert.equal(lrec.settled, true, "helper reaped once");
    assert.ok(lrec.fd3.ends >= 1, "fd3 end issued");
  }
  // N12: original manual Native TERM — sent|gone, then the ACTUAL
  // physical exit + BOTH closes land BEFORE the fresh native gone
  // proof; the ordering stays listeners -> TERM -> reap with the
  // healthy collector reaped LAST.
  order.push("term");
  const term = await m1.signalOwned(
    { identity: launchB.identity, signal: "TERM", scopeRunId: RUN_ID }, { deadlineMonoMs: metaB.P });
  assert.ok(term === "sent" || term === "gone", `term ${term}`);
  await within(() => launchB.whenPhysicallySettled, metaB.P, "term settle");
  const recB = assertSettledChild(launchB.identity.pid);
  assert.equal(recB.facts.exit.code, null, "signal exit has no code");
  assert.equal(recB.facts.exit.signal, "SIGTERM", "real TERM outcome");
  const goneB = await m1.probeIdentity(launchB.identity, { deadlineMonoMs: metaB.P });
  assert.equal(goneB, "gone");
  // Formal TOP cleanup: unchanged 0/2/4/5 stages recheck every cached
  // tuple and port at the original bounds, settleWorkloadHandles joins
  // every direct handle BEFORE the collector-last reap.
  const ctlTop = createCleanupController({ monitor: m1, clock, runId: RUN_ID });
  const topProof = await ctlTop.run({
    phase: "check", scope: "phase-workload", scopeRunId: RUN_ID,
    expectedFinalizer: ready.supervisor, supervisor: ready.supervisor,
    deadlineMonoMs: groupEnd,
    settleWorkloadHandles: ({ deadlineMonoMs }) =>
      Promise.all([h.settleHandles(RUN_ID, { deadlineMonoMs }), h.settleHandles(NESTED, { deadlineMonoMs })]).then(() => undefined),
    cleanupStartMonoMs: now(),
  });
  normal.formalDone = true;
  assert.equal(topProof.verified, true);
  assert.deepEqual(topProof.survivorIdentities, []);
  assert.deepEqual(topProof.listenersRemaining, []);
  assert.equal(topProof.accountingValid, true);
  const colRec = handles().find((c) => c.kind === "collector" && c.monitorRunId === RUN_ID);
  assert.ok(colRec !== undefined, "collector rec");
  assert.equal(colRec.facts.exit.code, 0, "collector actual exit0");
  assert.equal(colRec.facts.outClosed, true, "collector stdout close");
  assert.equal(colRec.facts.errClosed, true, "collector stderr close");
  assert.equal(colRec.settled, true, "collector settled");
  assert.equal(m1.fault(), null);
  order.push("reap");
  assert.deepEqual(order, ["listeners-before-close", "listeners", "term", "reap"]);
}
