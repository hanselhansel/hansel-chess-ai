// watchdog-cleanup.mjs owns the fixed staged cleanup and the privately
// retained settled proof. Stages anchor to ONE original monotonic start —
// the trusted cleanupStartMonoMs captured at cleanup entry when supplied,
// else this call's own first tick: graceful 0..2000 ms, TERM at +2000,
// KILL at +4000. Top-level proof ends 500ms before the original outer
// +5000/inherited end; failure-only collector teardown uses that outer end. Awaited
// probe/signal/query time is charged to the same horizon, a shorter
// inherited bound never advances a stage, and no fresh stage begins after
// exhaustion. Workload targets are reconciled live every stage
// (phase-workload covers EVERY actual retained workload/helper row in the
// same registry — the nested <scopeRunId>:watchdog-selftest scope included
// exactly; selftest-workload narrows to the exact scope), signalled
// descendants-first through fresh exact tuples, and healthy
// supervisor/collector roots are never targets. Listener proof runs while
// the collector lives; normal stopAndReap is collector-last. Failed
// containment may stop earlier without retiring any required physical debt. The closed proof schema is preserved exactly;
// run context fields are {phase, scope, scopeRunId, expectedFinalizer,
// supervisor, deadlineMonoMs, settleWorkloadHandles, cleanupStartMonoMs}.
import { copyDeep, isIdentity, isObj } from "./protocol-values.mjs";
import { freezeDeep } from "./schema-primitives.mjs";
import { issueActual } from "./artifact-files.mjs";
import { cleanupProofEnd } from "./watchdog-cleanup-context.mjs";
import { observeAwaitStage } from "./watchdog-lifetime.mjs";

const TERM_MS = 2000;
const KILL_MS = 4000;
const PROOF_MS = 5000;

const realClock = {
  setTimeout,
  clearTimeout,
  nowMonoMs: () => Number(process.hrtime.bigint() / 1000000n),
};

const unproven = (detail) => {
  const e = new Error(`CLEANUP_UNPROVEN ${detail}`);
  e.code = "CLEANUP_UNPROVEN";
  throw e;
};

const eqIdentity = (a, b) =>
  isIdentity(a) &&
  isIdentity(b) &&
  a.pid === b.pid &&
  a.startSec === b.startSec &&
  a.startUsec === b.startUsec;

const delay = (clock, ms) =>
  new Promise((resolve) => clock.setTimeout(resolve, Math.max(0, ms)));

const depthOf = (row, byPid) => {
  let d = 0;
  let p = row.ppid;
  const seen = new Set();
  while (byPid.has(p) && !seen.has(p)) {
    seen.add(p);
    d += 1;
    p = byPid.get(p).ppid;
  }
  return d;
};

export function createCleanupController({
  monitor,
  clock = realClock,
  recordEvent,
  runId = null,
  lifetime = undefined,
}) {
  if (typeof runId !== "string" || runId.length === 0)
    unproven("runId required");
  if (typeof clock.nowMonoMs !== "function") unproven("clock nowMonoMs");
  let settled = null;
  let resourcePrefix = null;
  let inRun = false;

  const run = async ({
    phase,
    scope,
    scopeRunId,
    expectedFinalizer,
    supervisor,
    deadlineMonoMs,
    settleWorkloadHandles = null,
    cleanupStartMonoMs = undefined,
  }) => {
    if (inRun) unproven("in progress");
    if (settled) unproven("already settled");
    inRun = true;
    // Snapshot the run context before the first await: caller mutation or a
    // late field can never redirect or weaken the binding. The trusted
    // numeric bindings require finite safe integer facts — never a
    // fractional or unbounded horizon.
    const snap = Object.freeze({
      phase: `${phase}`,
      scope: `${scope}`,
      scopeRunId: `${scopeRunId}`,
      expectedFinalizer: isIdentity(expectedFinalizer)
        ? copyDeep(expectedFinalizer)
        : null,
      supervisor: isIdentity(supervisor) ? copyDeep(supervisor) : null,
      deadlineMonoMs:
        Number.isSafeInteger(deadlineMonoMs) && deadlineMonoMs > 0
          ? deadlineMonoMs
          : null,
      settleWorkloadHandles:
        typeof settleWorkloadHandles === "function" ? settleWorkloadHandles : null,
      cleanupStartMonoMs:
        cleanupStartMonoMs === undefined
          ? null
          : Number.isSafeInteger(cleanupStartMonoMs)
            ? cleanupStartMonoMs
            : "INVALID",
    });
    if (!snap.expectedFinalizer || !snap.supervisor || snap.deadlineMonoMs === null)
      unproven("context incomplete");
    // A SUPPLIED malformed start (fraction/nonfinite/string/null/other) is
    // rejected — never silently replaced by a fresh captured start. Only a
    // genuinely omitted argument captures entry.
    if (snap.cleanupStartMonoMs === "INVALID")
      unproven("cleanupStartMonoMs invalid");
    // The original captured cleanup start anchors every stage offset — a
    // delayed run-context callback can never restart the window.
    const startMono =
      snap.cleanupStartMonoMs === null
        ? clock.nowMonoMs()
        : snap.cleanupStartMonoMs;
    const absEnd = Math.min(startMono + PROOF_MS, snap.deadlineMonoMs);
    const proofEnd = cleanupProofEnd(startMono, absEnd, snap.scope);
    const dl = () => ({ deadlineMonoMs: proofEnd });
    const remaining = () => absEnd - clock.nowMonoMs();
    const stage = (label, issue) => observeAwaitStage(lifetime,
      snap.scope === "selftest-workload" ? "selftest" : "phase", label, issue);
    // No fresh capability call may begin once the original bound is spent;
    // a delayed wait or slow earlier call ends the run unproven instead of
    // starting further native work after absEnd.
    const cap = () => {
      if (clock.nowMonoMs() >= proofEnd) unproven("cleanup proof window exhausted");
    };
    // Only the public wait expires at P. Its original body/IO stays enrolled.
    const proofCall = (issue) => {
      cap();
      const actual = lifetime ? issueActual(lifetime.retainActual, issue) : Promise.resolve().then(issue);
      return new Promise((resolve, reject) => {
        const timer = clock.setTimeout(() => reject(Object.assign(new Error("cleanup proof deadline"),
          { code: "CLEANUP_UNPROVEN" })), Math.max(0, proofEnd - clock.nowMonoMs()));
        actual.then((value) => { clock.clearTimeout(timer); resolve(value); },
          (error) => { clock.clearTimeout(timer); reject(error); });
      });
    };
    let collectorAttempted = false;
    const stopCollector = async (failed) => {
      if (snap.scope !== "phase-workload" || collectorAttempted) return;
      if (remaining() <= 0) unproven("collector window exhausted");
      collectorAttempted = true;
      const options = { deadlineMonoMs: absEnd, ordinaryDeadlineMonoMs: proofEnd,
        ...(failed ? { failureContainment: true } : {}) };
      await stage("cleanup.monitor", () => monitor.stopAndReap(options));
    };
    let eventFaults = 0;
    // Cleanup-event persistence is nonblocking for the fixed stages: a
    // stalled event writer can never postpone TERM/KILL/proof, and a real
    // write failure still counts against accounting where it lands.
    const emit = (payload) => {
      if (!recordEvent) return;
      // The actual callback is deferred inside .then so BOTH a synchronous
      // observer throw and an asynchronous rejection are retained through
      // the same catch — never aborting or delaying the Native stages.
      void Promise.resolve()
        .then(() => stage("cleanup.event", () => recordEvent({ kind: "cleanup", payload })))
        .catch(() => {
          eventFaults += 1;
        });
    };
    // phase-workload covers EVERY actual retained workload/helper row in
    // the same registry — the nested selftest scope included exactly;
    // selftest-workload narrows to the exact scope.
    const inScope = (r) =>
      r.workload === true &&
      (snap.scope === "phase-workload" || r.scopeRunId === snap.scopeRunId);

    const rows = () => monitor._ownership._ownedRows();
    const targets = () => {
      const all = rows();
      const list = all.filter(inScope);
      const byPid = new Map(all.map((r) => [r.identity.pid, r]));
      return list.slice().sort((a, b) => depthOf(b, byPid) - depthOf(a, byPid));
    };

    let signalFaults = 0;
    let queryFaults = 0;
    let probeFaults = 0;
    // Fresh exact-tuple probe per candidate: gone is settled, and only a
    // real same-live stays neutral — a returned unavailable/unknown verdict
    // counts as a sticky accounting failure exactly like a thrown probe and
    // keeps the target a candidate.
    const liveNow = async (list) => {
      const live = [];
      for (const t of list) {
        cap();
        const s = await proofCall(() => monitor.probeIdentity(t.identity, dl())).catch(() => "unavailable");
        cap();
        if (s !== "gone") {
          if (s !== "same-live") probeFaults += 1;
          live.push(t.identity);
        }
      }
      return live;
    };
    const signalStage = async (list, signal) => {
      const live = await liveNow(list);
      for (const t of list) {
        if (!live.some((i) => i.pid === t.identity.pid)) continue;
        cap();
        await proofCall(() => monitor.signalOwned(
            { identity: t.identity, signal, scopeRunId: t.scopeRunId }, dl()))
          .catch(() => {
            signalFaults += 1;
          });
        cap();
      }
    };
    // Fixed stage offsets from the ORIGINAL start: a shorter inherited
    // bound can never advance a stage, an already-exhausted window admits
    // no fresh stage, and a delay that wakes past the bound settles
    // unproven instead of starting the next stage late.
    const stageWait = async (atMs) => {
      const due = startMono + atMs;
      cap();
      if (due >= proofEnd) {
        await delay(clock, proofEnd - clock.nowMonoMs());
        unproven("stage beyond cleanup window");
      }
      await delay(clock, due - clock.nowMonoMs());
      cap();
    };

    try {
      emit({ stage: "graceful", scope: snap.scope, targets: targets().length });
      await stageWait(TERM_MS);
      await stage("cleanup.term", () => signalStage(targets(), "TERM"));
      emit({ stage: "term", scope: snap.scope });
      await stageWait(KILL_MS);
      await stage("cleanup.kill", () => signalStage(targets(), "KILL"));
      emit({ stage: "kill", scope: snap.scope });

      // Final proof begins right after KILL — every remaining query/probe is
      // charged to absEnd and finishes by +5000 rather than sleeping to it.
      const survivorIdentities = await liveNow(targets());
      let listenersRemaining = [];
      let accountingValid = true;
      // Listener proof per actual included scope: phase-workload covers the
      // parent scope AND the real nested selftest scope's registered ports.
      const scopes = [
        ...new Set(rows().filter(inScope).map((r) => r.scopeRunId)),
      ];
      if (scopes.length === 0) scopes.push(snap.scopeRunId);
      for (const s of scopes) {
        try {
          cap();
          const lq = await proofCall(() => stage("cleanup.listeners", () => monitor.queryListeners(s, dl())));
          cap();
          listenersRemaining = listenersRemaining.concat(
            lq.listeners,
            lq.unexpected.map((u) => u.listener),
          );
        } catch {
          queryFaults += 1;
          accountingValid = false;
        }
      }
      // Helpers created during the query reconcile into a second live pass.
      const lateSurvivors = await liveNow(targets());
      const survivors = survivorIdentities.concat(
        lateSurvivors.filter(
          (l) => !survivorIdentities.some((s) => s.pid === l.pid),
        ),
      );
      // Trusted driver-handle settlement AFTER workload/query-helper
      // identity-listener settlement and BEFORE the collector-last reap: a
      // missing/failed/late settlement where an actual included driver row
      // exists stays unproven — for the parent scope AND the real nested
      // selftest scope under the same registry filter.
      // A missing/failed/unsettled required driver-handle debt is sticky
      // and never authorizes positive collector-last proof. The approved
      // failure-only teardown retains all actual debt and ineligibility.
      let settlementDebt = false;
      if (snap.settleWorkloadHandles !== null) {
        try {
          cap();
          await proofCall(() => stage("cleanup.workload", () => snap.settleWorkloadHandles({ deadlineMonoMs: proofEnd })));
          cap();
        } catch {
          signalFaults += 1;
          accountingValid = false;
          settlementDebt = true;
        }
      } else if (rows().some((r) => inScope(r) && r.kind === "driver")) {
        // An actual retained driver handle with no settlement callback stays
        // unproven — a missing hook is never silently skipped.
        accountingValid = false;
        settlementDebt = true;
      }
      // Current accounting captured WHILE the collector is still sampling —
      // the projection disables age checking once sampling has stopped.
      const obs = monitor.lastObservation();
      if (!obs || obs.accountingValid !== true || (obs.resourceQuality &&
        obs.resourceQuality.phase !== "compare" && obs.coverageContinuous !== true)) accountingValid = false;
      if (signalFaults > 0 || probeFaults > 0 || eventFaults > 0) accountingValid = false;
      if (snap.scope === "selftest-workload" && typeof monitor._captureResourcePrefix === "function") {
        if (!accountingValid || settlementDebt || survivors.length || listenersRemaining.length)
          unproven("nested prefix child proof");
        cap();
        resourcePrefix = monitor._captureResourcePrefix({ scopeRunId: snap.scopeRunId, deadlineMonoMs: absEnd });
      }
      const failedProof = settlementDebt; // Settled negative proof already has the original ordering.
      try { await stopCollector(failedProof); } catch { accountingValid = false; }
      const proof = {
        scope: snap.scope,
        expectedFinalizer: copyDeep(snap.expectedFinalizer),
        verified:
          survivors.length === 0 &&
          listenersRemaining.length === 0 &&
          accountingValid &&
          remaining() >= 0,
        survivorIdentities: survivors,
        listenersRemaining: listenersRemaining.map((l) => ({
          address: l.address,
          port: l.port,
          pid: l.pid,
        })),
        accountingValid,
      };
      // The whole private settlement is deep-frozen: supervisor, every
      // identity and listener element, arrays and finalizer alike.
      settled = freezeDeep({
        phase: snap.phase,
        runId,
        supervisor: copyDeep(snap.supervisor),
        proof: copyDeep(proof),
      });
      emit({
        stage: "settled",
        scope: snap.scope,
        verified: proof.verified,
        signalFaults,
        queryFaults,
      });
      return copyDeep(settled.proof);
    } catch (error) {
      // Approved failure-only exception: stop within C; never infer work settled.
      try { await stopCollector(true); } catch { /* Original failure stays primary. */ }
      throw error;
    } finally {
      inRun = false;
    }
  };

  const verifyCleanup = ({ phase, runId: reqRunId, supervisor, claimedProof }) => {
    if (inRun) unproven("in progress");
    if (!settled) unproven("no settled cleanup");
    if (`${phase}` !== settled.phase) unproven("phase");
    if (reqRunId !== settled.runId) unproven("runId");
    if (!eqIdentity(supervisor, settled.supervisor)) unproven("supervisor");
    if (
      !isObj(claimedProof) ||
      claimedProof.scope !== settled.proof.scope ||
      !eqIdentity(claimedProof.expectedFinalizer, settled.proof.expectedFinalizer)
    ) {
      unproven("claimed scope/finalizer");
    }
    // Always the actual settled proof; a mismatched claim still receives the
    // real proof, which fails the recorder's own coherence check.
    return copyDeep(settled.proof);
  };

  return Object.freeze({ run, verifyCleanup, readResourcePrefix: () => resourcePrefix });
}
