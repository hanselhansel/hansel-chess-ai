// process-lsof.mjs owns /usr/sbin/lsof result parsing and the gated
// wrapper transport. The wrapper is the selected Python helper launched
// with a private descriptor 3: it blocks before exec, accepts exactly
// one authorized `exec` frame bound byte-identically to the validator's
// authorization, then performs a same-PID execv of the fixed lsof argv.
// There is no shell and no arbitrary query path. Each wrapper is proven
// and registered through the borrowed `registerHelper` callback under
// the caller's requested scope before authorization; every stage
// settles under ONE borrowed BudgetHandle (or an isolated entry handle
// built from remainingMs), a pre-ack failure closes fd3 so the
// unexecuted wrapper exits, a still-live registered helper is signalled
// only through the borrowed `signalHelper` same-tuple authority —
// never a raw kill — and an unsettled handle retains unproven evidence
// rather than a faked reap. The overall query stays OUTSIDE the
// serialized queue while it awaits those callbacks, so its nested
// registration/signal work is never queued behind itself. ONE
// wrapper child's complete physical lifecycle — the deferred receipt,
// named listeners, bounded output, tracked fd-3 outcome and the
// physical+flow release — delegates to process-lsof-io.mjs.
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";

import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import { copyDeep, isObj, isQuery } from "./protocol-values.mjs";
import {
  createBudgetHandle,
  sleepHandle,
  waitHandle,
} from "./process-budget.mjs";
import { lsofError, parseLsofResult } from "./process-lsof-fields.mjs";
import { createLsofChildIO } from "./process-lsof-io.mjs";

export { parseLsofResult };

const LSOF_PATH = "/usr/sbin/lsof";

const realClock = {
  setTimeout,
  clearTimeout,
  nowMonoNs: () => process.hrtime.bigint().toString(),
};

// One persistent owner performs independently gated legal queries under the
// run-global ID and gate authorities. `resolvePath` feeds the shared
// process-image resolver: the venv invocation stays the spawn argv
// while the resolved PROCESS image — the framework payload under a
// launcher — is what proc_pidpath reports and registerRoot compares.
export function createLsofQueries({
  registerHelper,
  signalHelper,
  proveTransition,
  protocol,
  runId,
  pythonExecutable,
  helperPath,
  clock = realClock,
  spawnImpl = spawn,
  resolvePath = realpathSync,
}) {
  if (
    typeof registerHelper !== "function" ||
    typeof signalHelper !== "function" ||
    typeof proveTransition !== "function"
  ) {
    throw lsofError("gate callbacks");
  }
  let n = 0;
  let lastGate = null;

  const nowMonoMs = () => Number(BigInt(clock.nowMonoNs()) / 1000000n);

  const gate = async (
    query,
    { remainingMs, scopeRunId, budget, retainActual } = {},
  ) => {
    if (!isQuery(query)) throw lsofError("query fields");
    const own = budget === undefined || budget === null;
    if (own && (!Number.isSafeInteger(remainingMs) || remainingMs <= 0)) {
      throw lsofError("gate budget");
    }
    // A borrowed monitor budget must carry the operation's physical
    // registrar: the gate's child/pipe receipt stays acquired until
    // real settlement and a public rejection never releases it.
    if (!own && typeof retainActual !== "function") {
      throw lsofError("gate retention");
    }
    const scope =
      scopeRunId === undefined || scopeRunId === null ? runId : scopeRunId;
    if (typeof scope !== "string" || scope.length === 0) {
      throw lsofError("gate scope");
    }
    const handle = own
      ? createBudgetHandle({
          deadlineMonoMs: nowMonoMs() + remainingMs,
          clock,
          nowMonoMs,
        })
      : budget;
    if (
      !isObj(handle) ||
      typeof handle.assertLive !== "function" ||
      typeof handle.onExpire !== "function"
    ) {
      throw lsofError("gate budget");
    }
    const queryId = `lq-${runId}-${++n}`;
    const queryJson = JSON.stringify(query);
    // The actual clock gates every launch initiation: an already-spent
    // bound performs no path resolution and no spawn. Any failure in
    // this pre-child region — live check, path resolution or IO-owner
    // construction — leaves no child and no IO debt, so an ISOLATED
    // local handle disposes now and releases its losing timer under
    // the ORIGINAL remaining bound; a borrowed monitor handle always
    // stays owned by its caller and is never disposed here.
    let pyImage;
    let lsofImage;
    let io;
    try {
      handle.assertLive("gate launch");
      pyImage = resolvePythonProcessImage(pythonExecutable, {
        resolvePath,
      });
      lsofImage = resolvePath(LSOF_PATH);
      // The private child-IO owner creates the deferred physical
      // receipt and registers it BEFORE the child is initiated: it
      // fulfills only on the real exit plus BOTH output-pipe closes
      // plus every issued fd-3 operation's real callback/error — a
      // fault, public rejection, end() or destroy() invocation never
      // fulfills it — while a synchronous failure before any child
      // exists settles it truthfully through neverSpawned. An isolated
      // own handle's dispose callback shares the owner's terminal
      // boundary: it runs only after BOTH physical fulfillment AND this
      // flow's finishFlow, so the same parsing budget stays alive.
      io = createLsofChildIO({
        retainActual,
        onPhysicalSettled: own ? () => handle.dispose() : null,
      });
    } catch (e) {
      if (own) handle.dispose();
      throw e;
    }
    let child;
    try {
      // The pre-spawn live-check shares the no-child failure path: an
      // expired bound still prevents the launch IO, and the throw
      // lands in the same catch that truthfully settles only the
      // never-spawned receipt — no permanent fake child debt.
      handle.assertLive("gate spawn");
      child = spawnImpl(
        pythonExecutable,
        [
          "-I",
          "-B",
          helperPath,
          "--exec-gated",
          "--run-id",
          runId,
          "--query-id",
          queryId,
          "--gate-fd",
          "3",
          "--query-json",
          queryJson,
        ],
        { stdio: ["ignore", "pipe", "pipe", "pipe"] },
      );
    } catch (e) {
      io.neverSpawned(e);
      throw e;
    }
    // Ownership installs on the RETURNED child — every named
    // stdout/stderr/fd3-error/exit/close listener — BEFORE PID or any
    // registration/bootstrap validation can throw, so a failed-spawn
    // or pid-less child keeps truthful error/close settlement and no
    // event is missed. No PID, exit or close is ever invented.
    io.attach(child);
    // ONE borrowed handle bounds spawn, registration, ack, the fd-3
    // write, transition, drain and reap; no stage gets a fresh
    // allowance and budget failures map onto the gate's own code.
    const race = (p, tag) =>
      waitHandle(handle, p, tag).catch((e) => {
        if (e.code === "ACCOUNTING_UNAVAILABLE") {
          const mapped = lsofError(tag);
          mapped.cause = e;
          throw mapped;
        }
        throw e;
      });
    let reg = null;
    let transition = null;
    try {
      // Prove and register the wrapper's own full tuple under the
      // caller's requested scope before any authorization, through the
      // borrowed callback on the same queue and handle. A wrapper
      // already gone fails the monitor's native proof.
      reg = await race(
        registerHelper(
          {
            pid: child.pid,
            kind: "helper",
            expectedExecutable: pyImage,
            scopeRunId: scope,
          },
          handle,
        ),
        "register",
      );
      if (io.snapshot().exited) {
        throw lsofError("gate exited before authorization");
      }
      protocol.authorizeExecGate({
        queryId,
        identity: reg.identity,
        query,
      });
      const gateMsg = {
        ipcVersion: 1,
        runId,
        seq: 0,
        type: "exec",
        requestId: queryId,
        identity: reg.identity,
        query: copyDeep(query),
      };
      const frame = `${JSON.stringify(gateMsg)}\n`;
      protocol.accept(
        "exec-gate",
        "s2c",
        copyDeep(gateMsg),
        Buffer.byteLength(frame, "utf8"),
      );
      // The fd-3 write is issued through the child-IO owner: its real
      // callback/error outcome was armed BEFORE the end invocation —
      // so write failures, backpressure and the finish settlement all
      // reach the same handle — and that issued outcome is itself a
      // required input of the deferred physical receipt.
      await race(io.writeGate(frame), "fd3");
      // The permitted same-tuple pinned-Python to pinned-lsof
      // transition is observed through the monitor's fresh native
      // read. An immediate read may legitimately still see the SAME
      // pinned Python before its exec, so pre-transition alone is
      // rechecked — every recheck consumes the SAME handle with no
      // new grace window — until the pinned lsof image or the legal
      // fast post-ack exit appears. A third image, an unavailable
      // read or budget exhaustion fails.
      const probe = () =>
        race(
          proveTransition(
            {
              identity: reg.identity,
              fromExecutable: pyImage,
              toExecutable: lsofImage,
            },
            handle,
          ),
          "transition",
        );
      let seen = await probe();
      while (seen === "pre-transition") {
        try {
          await sleepHandle(handle, clock, 2);
        } catch {
          throw lsofError("transition deadline");
        }
        seen = await probe();
      }
      if (seen !== "live-transition" && seen !== "gone") {
        throw lsofError(`transition ${seen}`);
      }
      transition = seen;
      // Parse only after exit plus both stream closes, so no truncated
      // success or missed diagnostic passes. The bounded captures are
      // consumed BEFORE finishFlow permits their release.
      await race(io.done, "settle");
      const doneState = io.snapshot();
      if (doneState.exitCode === null) throw lsofError("gate not exited");
      const captured = io.output();
      return parseLsofResult({
        exitCode: doneState.exitCode,
        stdout: captured.stdout,
        stderr: captured.stderr,
      });
    } finally {
      // A pre-exit fd3 close unblocks a wrapper that never received
      // its authorized frame — the issued close's own real outcome
      // joins physical settlement, and a repeated close issues no
      // second untracked end; a registered wrapper is signalled only
      // through the borrowed same-tuple authority inside the SAME
      // handle. No raw kill anywhere: an unsettled handle keeps its
      // true unproven state in the gate evidence.
      io.closeGate();
      const flowState = io.snapshot();
      if (!flowState.exited && reg !== null) {
        try {
          await race(
            signalHelper(
              {
                identity: reg.identity,
                signal: "KILL",
                scopeRunId: scope,
              },
              handle,
            ),
            "signal",
          );
        } catch {
          // The wrapper may already be gone; exit settlement owns it.
        }
      }
      if (!flowState.exited || !flowState.outClosed || !flowState.errClosed) {
        await race(io.done.catch(() => {}), "settle").catch(() => {});
      }
      const finalState = io.snapshot();
      // The live listeners and child stay attached for real settlement:
      // a borrowed handle is disposed by its operation lifetime only
      // after the physical receipt fulfills, and an isolated own handle
      // disposes through the same receipt — a static snapshot never
      // substitutes for the still-pending child facts.
      lastGate = {
        queryId,
        identity: reg === null ? null : copyDeep(reg.identity),
        transition,
        exitCode: finalState.exitCode,
        reaped:
          finalState.exited && finalState.outClosed && finalState.errClosed,
      };
      // finishFlow completes the shared terminal boundary: the owner
      // releases named listeners, captured output and any isolated
      // dispose callback only now plus actual settlement.
      io.finishFlow();
    }
  };

  return Object.freeze({
    queryOwnedPids: (pids, opts) => {
      const unique = [...new Set(pids)].sort((a, b) => a - b);
      return gate({ kind: "owned-pids", pids: unique }, opts);
    },
    queryPort: (port, opts) => gate({ kind: "port", port }, opts),
    _lastGate: () => copyDeep(lastGate),
  });
}
