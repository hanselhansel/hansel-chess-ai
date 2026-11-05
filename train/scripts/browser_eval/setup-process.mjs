// setup-process.mjs is the bounded one-shot setup-command provider for the
// isolated premanifest environment audit. It runs ONE fixed short-lived
// command through a lowlevel spawn under the caller's SAME borrowed budget
// handle and a genuine watchdog lifetime — ALL FIVE command fields are
// validated and bound into ONE owned frozen snapshot before the first
// await or callout so no late or reentrant caller mutation can rebind the
// spawn or the byte cap, maxBytes is a combined stdout+stderr ceiling
// charged before append (never a silent truncation), retained chunks are
// owned copies, a null-code signal exit resolves no numeric exitCode and
// stays a recorded ACCOUNTING_UNAVAILABLE failure, nonzero exits and
// stderr bytes are DATA returned to the parent for rejection, and the
// provider invents no duration, phase, readiness, cleanup or Native proof
// claim.
//
// Physical contract: TWO neutral fulfill-only receipts — raw issuance and
// the physical child — are armed and indexed in the module STRONG pending
// set BEFORE the first lifetime.retainActual callout; adoption pins the
// returned handle before any shape/pid/semantic read; the genuine exit
// (or a trusted creation failure proving no OS child) plus BOTH real
// pipe close events alone retire the physical debt — never
// a public timeout, error, destroy, close-call or missing-pipe absence.
// A definite pre-issue decline (retainer or live-guard throw, or the
// synchronous default Node spawn failure) settles its unissued
// reservation truthfully. An asynchronous no-child fact still joins both
// allocated pipes; an unknown, ambiguous or unadoptable outcome
// stays held.
//
// DAG: environment -> environment-python -> setup-process -> budget /
// lifetime / protocol values + record-schema limits + node:child_process.
// Never a parent, Native or TEST edge. Functional runtime input.

import { spawn as nodeSpawn } from "node:child_process";
import { waitHandle } from "./process-budget.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import {
  exactFields,
  isAbs,
  isObj,
  pos,
  strNE,
} from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./record-schema.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

import {
  armSetupReceipt as armReceipt,
  adoptSetupHandle as adopt,
} from "./setup-process-actual.mjs";

export async function runSetupCommand(command, context, adapters = undefined) {
  // Every serializable input is validated and copied BEFORE the first
  // await, registrar callout or effect: the closed five-field command,
  // absolute executable and cwd, an all-string argv, a flat nonempty-key
  // string env map and a positive maxBytes bounded by the shared IPC
  // frame ceiling. All FIVE fields are then bound into ONE owned frozen
  // snapshot — the spawn call, the combined byte ceiling and every later
  // statement read ONLY that snapshot, so a caller mutating the original
  // command object after validation (or a reentrant listener) can never
  // rebind the executable path, cwd, argv, env or the byte cap, and
  // shell interpretation is never enabled.
  if (
    !isObj(command) ||
    !exactFields(command, ["executable", "args", "cwd", "env", "maxBytes"])
  ) {
    throw acct("command fields");
  }
  if (!isAbs(command.executable)) throw acct("executable absolute");
  if (
    !Array.isArray(command.args) ||
    !command.args.every((a) => typeof a === "string")
  ) {
    throw acct("args strings");
  }
  if (command.cwd !== "/" && !isAbs(command.cwd)) {
    throw acct("cwd absolute");
  }
  if (
    !isObj(command.env) ||
    !Object.keys(command.env).every(
      (k) => strNE(k) && typeof command.env[k] === "string",
    )
  ) {
    throw acct("env strings");
  }
  if (!pos(command.maxBytes) || command.maxBytes > FIXED_LIMITS.ipc.frameBytes) {
    throw acct("maxBytes bound");
  }
  const own = Object.freeze({
    executable: command.executable,
    args: Object.freeze(command.args.slice()),
    cwd: command.cwd,
    env: Object.freeze({ ...command.env }),
    maxBytes: command.maxBytes,
  });

  // Context is EXACTLY {budget, lifetime}: the SAME borrowed BudgetHandle
  // surface (assertLive/onExpire/deadlineMonoMs/remainingMs) and a
  // genuinely branded watchdog lifetime — this provider never mints an
  // owner and never waits on a global whenSettled inside its own body.
  if (!isObj(context) || !exactFields(context, ["budget", "lifetime"])) {
    throw acct("context fields");
  }
  const { budget, lifetime } = context;
  if (
    !isObj(budget) ||
    typeof budget.assertLive !== "function" ||
    typeof budget.onExpire !== "function" ||
    typeof budget.deadlineMonoMs !== "function" ||
    typeof budget.remainingMs !== "function"
  ) {
    throw acct("budget handle");
  }
  assertWatchdogLifetime(lifetime);

  // adapters is the isolated lowlevel spawn ONLY, defaulting to the
  // imported Node spawn; operational callers never supply it.
  let spawnImpl = nodeSpawn;
  if (adapters !== undefined) {
    if (
      !isObj(adapters) ||
      !exactFields(adapters, ["spawn"]) ||
      typeof adapters.spawn !== "function"
    ) {
      throw acct("adapters spawn");
    }
    spawnImpl = adapters.spawn;
  }

  // Both neutral receipts arm and index BEFORE the first registrar
  // callout, so a reentrant settlement observer already sees the debt.
  // Each SAME native .promise registers exactly once; a retainer or
  // live-guard throw is a definite pre-issue decline — both unissued
  // reservations settle truthfully and the original value propagates.
  const rawSpawn = armReceipt();
  const physicalChild = armReceipt();
  try {
    lifetime.retainActual(rawSpawn.promise);
    budget.assertLive("setup command retain");
    lifetime.retainActual(physicalChild.promise);
    budget.assertLive("setup command issue");
  } catch (e) {
    rawSpawn.settle();
    physicalChild.settle();
    throw e;
  }

  let child;
  try {
    child = spawnImpl(own.executable, own.args, {
      cwd: own.cwd,
      env: own.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
  } catch (error) {
    // The observed synchronous throw ALWAYS settles the raw issuance
    // receipt and preserves the original value. Only the trusted default
    // Node spawn identity may also retire the physical reservation on its
    // documented no-child branch — an injected spawn-then-throw stays
    // held, never a fabricated absent handle.
    rawSpawn.settle();
    if (spawnImpl === nodeSpawn) physicalChild.settle();
    throw error;
  }
  // The observed issuance return settles the raw receipt even when a
  // later adoption or semantic read throws.
  rawSpawn.settle();
  adopt(physicalChild, child);
  if (child === null || child === undefined) {
    throw acct("spawn returned no child");
  }

  // Persistent physical observation attaches immediately after adoption,
  // BEFORE connected/pid/semantic reads. Actual exit plus BOTH real pipe
  // close flags are recorded first in every listener and alone retire the
  // physical receipt; the domain task keeps the captured first arbitrary
  // failure behind an explicit presence flag so a thrown null/undefined
  // is never a falsy success — raw spawn/stdio failures propagate the
  // exact first value while nonzero exits and stderr stay DATA.
  let actualExited = false;
  let knownNoChild = false;
  let actualOutClosed = false;
  let actualErrClosed = false;
  let sawFailure = false;
  let firstFailure;
  let exitCode = null;
  let exitSignal = null;
  let observedBytes = 0;
  let taskSettled = false;
  let resolveTask;
  let rejectTask;
  const streams = {
    stdout: { chunks: [], total: 0 },
    stderr: { chunks: [], total: 0 },
  };

  const notePhysical = () => {
    if ((actualExited || knownNoChild) && actualOutClosed && actualErrClosed) {
      physicalChild.settle();
    }
  };

  const task = new Promise((resolve, reject) => {
    resolveTask = resolve;
    rejectTask = reject;
  });
  // The task always keeps one benign consumer even before the public
  // wait subscribes, so a rejection captured during the synchronous
  // observer attach can never read as unhandled; the real settlement
  // still flows through waitHandle's own reaction below.
  task.then(undefined, () => {});

  const noteFailure = (value) => {
    if (!sawFailure) {
      sawFailure = true;
      firstFailure = value;
    }
  };

  // The public task resolves only on the real exit plus BOTH pipe closes
  // with no recorded failure; a captured first failure rejects it early
  // while the physical receipt stays retained through true close.
  const noteTask = () => {
    if (taskSettled) return;
    if (sawFailure) {
      taskSettled = true;
      rejectTask(firstFailure);
      return;
    }
    if (actualExited && actualOutClosed && actualErrClosed) {
      taskSettled = true;
      resolveTask(
        Object.freeze({
          stdout: Buffer.concat(streams.stdout.chunks),
          stderr: Buffer.concat(streams.stderr.chunks),
          exitCode,
        }),
      );
    }
  };

  // The bound is ONE combined stdout+stderr byte ceiling: the aggregate
  // count is charged BEFORE a chunk is appended, so crossing the bound
  // is a recorded failure fact — never a silent truncation — and
  // appends stop while the drain continues. Per-stream totals stay as
  // observations only. Every retained chunk is a fresh owned copy, so a
  // producer mutating its delivered Buffer can never move observed bytes.
  const noteData = (which, chunk) => {
    if (taskSettled) return;
    if (typeof chunk !== "string" && !Buffer.isBuffer(chunk)) {
      noteFailure(acct(`${which} chunk`));
      noteTask();
      return;
    }
    const bytes = Buffer.isBuffer(chunk)
      ? Buffer.from(chunk)
      : Buffer.from(chunk, "utf8");
    observedBytes += bytes.length;
    if (observedBytes > own.maxBytes) {
      noteFailure(acct(`${which} bound`));
      noteTask();
      return;
    }
    const stream = streams[which];
    stream.total += bytes.length;
    stream.chunks.push(bytes);
  };

  // The ACTUAL exit facts are recorded FIRST in every path: a genuine
  // exit event retires physical debt only together with BOTH real pipe
  // closes regardless of how the child ended. A null code — a signal
  // termination or any other no-code exit — can never resolve the
  // numeric exitCode API as null, so it is kept as the exitSignal fact
  // and driven through the SAME ACCOUNTING_UNAVAILABLE failure path;
  // the code 0 is never fabricated.
  child.on("exit", (code, signal) => {
    actualExited = true;
    exitCode = code;
    exitSignal = signal;
    if (exitCode === null) {
      noteFailure(acct(`exit signal ${String(exitSignal)}`));
    }
    notePhysical();
    noteTask();
  });
  child.on("error", (error) => {
    noteFailure(error);
    // The default Node spawn's documented creation failure — an error
    // event on a child that never received a pid — is a definite
    // no-child fact only. BOTH allocated pipes must still actually close;
    // an injected adapter's ambiguous child stays held.
    if (spawnImpl === nodeSpawn && !actualExited && child.pid === undefined) {
      knownNoChild = true;
    }
    notePhysical();
    noteTask();
  });

  // Guarded pipe reads: a throwing getter is a captured first failure,
  // and a missing expected pipe stays unproven physical — its close flag
  // never sets, the debt stays held, never a positive absence.
  let childOut = null;
  let childErr = null;
  try {
    childOut = child.stdout;
  } catch (error) {
    noteFailure(error);
  }
  try {
    childErr = child.stderr;
  } catch (error) {
    noteFailure(error);
  }
  const attachPipe = (which, pipe) => {
    if (
      pipe === null ||
      pipe === undefined ||
      (typeof pipe !== "object" && typeof pipe !== "function") ||
      typeof pipe.on !== "function"
    ) {
      noteFailure(acct(`${which} pipe`));
      return;
    }
    pipe.on("data", (chunk) => noteData(which, chunk));
    pipe.on("error", (error) => {
      noteFailure(error);
      noteTask();
    });
    pipe.on("close", () => {
      if (which === "stdout") actualOutClosed = true;
      else actualErrClosed = true;
      notePhysical();
      noteTask();
    });
  };
  attachPipe("stdout", childOut);
  attachPipe("stderr", childErr);

  // The public wait is the genuine shared bounded-wait primitive on the
  // SAME handle — a pre-issue live guard before initiation and
  // waitHandle's own assertLive recheck before any successful resolve,
  // with the original absolute bound unchanged and no new timer,
  // deadline, ledger or queue. Subscription runs BEFORE the guarded-read
  // failure flush so every captured rejection already has a consumer,
  // and the retained task plus physical receipt keep tracking true
  // physical close even when this wait rejects early.
  budget.assertLive("setup command wait");
  const wait = waitHandle(budget, task, "setup command");
  noteTask();
  return await wait;
}
