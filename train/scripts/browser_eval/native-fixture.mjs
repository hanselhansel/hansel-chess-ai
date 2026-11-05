// native-fixture.mjs — TEST-ONLY Native-supervision fixture entry.
//
// Fixed internal argv ABI for the real Native group: strict `--name value`
// pairs only, no exports, Node builtins plus its closed protocol TEST leaf
// (native-fixture-protocol.mjs), no app/browser/model/production-JS
// imports. The SAME intrinsic finite end D = F + 9500ms
// (floor(hrtime.bigint()/1e6), the origin the harness captured F in) is
// armed BEFORE any private waiting, admission IO or mode work and is NEVER
// revised: D is only a finite safety guard — actual process events decide
// whether the fixture complied, a late overrun still fails, and there is no
// kernel scheduling guarantee. Exit 88 at D is the intrinsic safety end —
// never a pass, a proof, or a cleanup claim.
//
// Private direct-fixture wire (testVersion 1): every frame carries the
// exact common keys {testVersion,runId,fixtureId,scopeRunId,type,pid} plus
// the closed per-type fields frozen in the binding addendum. `pid` is the
// TARGET fixture's own pid — parent→child frames name the child, and
// child→parent frames name the sender. Every received frame is revalidated
// against this process's argv-bound runId/fixtureId/scopeRunId/pid/F/D/
// mode/role under a closed field set: unknown, malformed, extra-field,
// wrong-run or wrong-bound frames are bounded stderr + exit 64, never an
// indefinite wait. Captured claims stay data for the harness — never
// Native proof — and no mode work, listener bind or child fork happens
// before the actual parent `admit`.
//
// Disconnect is role-specific by binding: before admission, or on an
// admitted root whose only remaining input was the wire, it ends bounded;
// an ADMITTED fixture whose remaining inputs are real signals (term-ignore)
// or whose role is `descendant` stays quiet and alive until the actual
// signal or D — the reparent case needs parent exit distinct from actual
// pipe close, so a generic disconnect-exit handler would invalidate it.
// Adopted descendants inherit the SAME F/D through argv, never a rebased
// birth+9500.
//
// The strict argv parser, the closed key-set predicate, the real loopback
// listener mode body and the whole REAL production blocked-heartbeat
// driver branch moved WHOLE to the trusted Node-only leaf
// ./native-fixture-protocol.mjs — this entry binds them through trusted
// refs at dispatch and keeps the remaining modes, the lifetime timer,
// fork/admission mechanics and the graceful paths.
//
// Draft history (dated 2026-11-05): the 628-line single-entry draft and
// the 409-line post-split entry each declared KNOWN_OVERSIZE for the same
// kept-whole bound protocols. With the listener body also delegated the
// entry sits under the 400 target — no guard or comment was shaved to fit.

import { fork } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  nativeFixtureFieldsExact as keysExact,
  parseNativeFixtureArgv,
  runBlockedHeartbeatFixture,
  runNativeListenerFixture,
} from "./native-fixture-protocol.mjs";

const TEST_VERSION = 1;
const EXIT_GRACE = 0;      // graceful close / exit-parent / post-stop end
const EXIT_PROTOCOL = 64;  // malformed argv or wire frame
const EXIT_BOUNDED = 70;   // finite internal failure, never an open wait
const EXIT_INTRINSIC = 88; // finite D reached — safety end only
const STDERR_LIMIT = 400;

const COMMON_KEYS = ["testVersion", "runId", "fixtureId", "scopeRunId", "type", "pid"];
const ENTRY = fileURLToPath(import.meta.url);

// Bounded diagnostics: one truncated stderr line per failure — the wire
// and the exit code carry the verdict, never an unbounded dump.
const note = (detail) => {
  try {
    process.stderr.write(`native-fixture ${String(detail).slice(0, STDERR_LIMIT)}\n`);
  } catch {}
};
const die = (code, detail) => {
  note(detail);
  process.exit(code);
};
const malformed = (detail) => die(EXIT_PROTOCOL, detail);
const nowMonoMs = () => Number(process.hrtime.bigint() / 1_000_000n);

const conf = parseNativeFixtureArgv(process.argv.slice(2), { die, nowMonoMs });

// Intrinsic finite end, armed BEFORE any waiting/admission/IO and never
// revised — the ref'd timer both guarantees and bounds the quiet lifetime.
setTimeout(() => process.exit(EXIT_INTRINSIC), Math.max(0, conf.D - nowMonoMs()));

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const selfIdent = { fixtureId: conf.fixtureId, pid: process.pid };
const boundsFields = { fixtureStartMonoMs: conf.F, fixtureEndMonoMs: conf.D };

// Closed-set validation of a private frame against the argv-bound identity
// of the channel's expected counterparty; pid is always the TARGET pid.
const checkPrivate = (msg, extra, ident) => {
  if (!isObj(msg) || !keysExact(msg, COMMON_KEYS, extra)) malformed("closed fields");
  if (
    msg.testVersion !== TEST_VERSION ||
    msg.runId !== conf.runId ||
    msg.fixtureId !== ident.fixtureId ||
    msg.scopeRunId !== conf.scopeRunId ||
    msg.pid !== ident.pid
  )
    malformed("identity binding");
};
const checkBounds = (msg) => {
  if (msg.fixtureStartMonoMs !== conf.F || msg.fixtureEndMonoMs !== conf.D)
    malformed("bounds");
};

// One submitted frame per send; a real callback error or synchronous throw
// is a bounded failure, never a replay or an unlogged drop.
const sendFrame = (send, type, ident, extra) => {
  const msg = {
    testVersion: TEST_VERSION, runId: conf.runId, fixtureId: ident.fixtureId,
    scopeRunId: conf.scopeRunId, type, pid: ident.pid, ...extra,
  };
  try {
    send(msg, (err) => {
      if (err) die(EXIT_BOUNDED, `${type} send failed`);
    });
  } catch {
    die(EXIT_BOUNDED, `${type} send threw`);
  }
};
const sendParent = (type, extra) => sendFrame(process.send.bind(process), type, selfIdent, extra);
const sendChild = (child, type, ident, extra) => sendFrame(child.send.bind(child), type, ident, extra);
const sendWaiting = () =>
  sendParent("waiting", {
    mode: conf.mode, role: conf.role, parentPid: process.ppid, ...boundsFields,
  });
const sendAdmitted = () =>
  sendParent("admitted", { mode: conf.mode, role: conf.role, ...boundsFields });

// Admission gate shared by every direct mode: the first parent frame must
// be the closed `admit` echoing this fixture's own mode/role/bounds.
const expectAdmit = (msg) => {
  if (!isObj(msg) || msg.type !== "admit") malformed("expected admit");
  checkPrivate(msg, ["mode", "role", "fixtureStartMonoMs", "fixtureEndMonoMs"], selfIdent);
  checkBounds(msg);
  if (msg.mode !== conf.mode || msg.role !== conf.role) malformed("mode/role");
};
let admitted = false;

// Real fork of this same fixed entry as a `descendant`: identical F/D via
// argv (never rebased), fixed execPath/execArgv:[], detached so later group
// signals cannot arrive through the parent's group. onWaiting/onAdmitted
// fire only after full closed-set validation of the child's own frames —
// the child's claims are data for the parent to relay, never Native proof.
// An early child exit/disconnect, a real child `error` event or a
// malformed frame is a bounded failure.
const adoptChild = ({ childMode, childFixtureId, stdio, onWaiting, onAdmitted }) => {
  const ident = { fixtureId: childFixtureId, pid: null };
  let stage = "waiting";
  const expectChild = (cmsg, extra) => {
    checkPrivate(cmsg, extra, ident);
    checkBounds(cmsg);
    if (cmsg.mode !== childMode || cmsg.role !== "descendant")
      malformed("child mode/role");
  };
  let child;
  try {
    child = fork(
      ENTRY,
      [
        "--mode", childMode, "--run-id", conf.runId,
        "--fixture-id", childFixtureId, "--scope-run-id", conf.scopeRunId,
        "--fixture-start", String(conf.F), "--fixture-end", String(conf.D),
        "--role", "descendant",
        ...(conf.nodeImage !== null ? ["--node-image", conf.nodeImage] : []),
      ],
      { execPath: conf.nodeImage, execArgv: [], stdio, detached: true },
    );
  } catch (e) {
    die(EXIT_BOUNDED, `fork ${e && e.message}`);
  }
  // The real error/exit/disconnect observers and the validated message
  // handler attach BEFORE the pid/shape validation beneath them — an
  // async spawn error, early frame or disconnect can never slip through
  // unobserved; an unadoptable handle is still a bounded failure.
  try {
    child.on("error", (e) => die(EXIT_BOUNDED, `child error ${e && e.message}`));
    child.on("exit", () => die(EXIT_BOUNDED, "child early exit"));
    child.on("disconnect", () => die(EXIT_BOUNDED, "child disconnect"));
    child.on("message", (cmsg) => {
      if (!isObj(cmsg)) malformed("child frame");
      if (stage === "waiting" && cmsg.type === "waiting") {
        expectChild(cmsg, ["mode", "role", "parentPid", "fixtureStartMonoMs", "fixtureEndMonoMs"]);
        if (cmsg.parentPid !== process.pid) malformed("child parentPid");
        stage = "await-admit";
        onWaiting(cmsg);
        return;
      }
      if (stage === "await-admitted" && cmsg.type === "admitted") {
        expectChild(cmsg, ["mode", "role", "fixtureStartMonoMs", "fixtureEndMonoMs"]);
        stage = "done";
        onAdmitted(cmsg);
        return;
      }
      malformed(`child ${cmsg.type}`);
    });
  } catch {
    die(EXIT_BOUNDED, "fork returned no child");
  }
  // ident.pid binds before any validated child callback can run — still
  // synchronous, after handler installation.
  if (child === null || !Number.isInteger(child.pid))
    die(EXIT_BOUNDED, "fork returned no child");
  ident.pid = child.pid;
  // Drain owned pipes so a bounded child stderr line can never stall on
  // backpressure; inherited stdio needs no drain.
  if (child.stdout) child.stdout.on("data", () => {});
  if (child.stderr) child.stderr.on("data", () => {});
  return {
    child,
    sendAdmit() {
      if (stage !== "await-admit") malformed("admit order");
      stage = "await-admitted";
      sendChild(child, "admit", ident, {
        mode: childMode, role: "descendant", ...boundsFields,
      });
    },
  };
};

// Shared direct-fixture body for idle, finalizer, listener and
// term-ignore: `waiting`, the closed `admit` gate, then the mode's own
// install step and `admitted` echo — every mode still ends only by its
// listed path or the armed D. install() runs ONLY after admission; it may
// defer the `admitted` send (listener reports its real bound port first
// inside the same turn). onClose null means `close` is never valid for the
// mode — term-ignore takes only the real signal stages. A second `close`
// while an async onClose is settling is a duplicate-frame protocol fault;
// the REAL close settlement MUST fulfill before the exit0 below — a
// rejected or thrown close is a bounded failure, never a swallowed error.
const runDirect = ({ install, onClose }) => {
  sendWaiting();
  let closing = false;
  process.on("message", (msg) => {
    if (!admitted) {
      expectAdmit(msg);
      admitted = true;
      install();
      return;
    }
    if (onClose === null || !isObj(msg) || msg.type !== "close")
      malformed("unexpected frame");
    checkPrivate(msg, [], selfIdent);
    if (closing) malformed("duplicate close");
    closing = true;
    Promise.resolve()
      .then(() => onClose())
      .then(
        () => process.exit(EXIT_GRACE),
        (e) => die(EXIT_BOUNDED, `close ${e && e.message}`),
      );
  });
};

// idle/finalizer: pure quiet-finite — no mode behavior, graceful `close`.
const runQuiet = () =>
  runDirect({ install: sendAdmitted, onClose: () => {} });

// listener: the whole mode body moved to the leaf — bind-after-admit, the
// real port report and the REAL server.close callback settlement are
// identical; the entry keeps a thin wrapper passing the same four refs.
const runListener = () =>
  runNativeListenerFixture({ runDirect, sendAdmitted, sendParent, die });

// term-ignore: the whole mode behavior is an installed SIGTERM ignore so
// the real TERM stage is observably survived; exit still requires the real
// KILL or D — `close` is never a substitute for the signal stages.
const runTermIgnore = () =>
  runDirect({
    install: () => {
      process.on("SIGTERM", () => {});
      sendAdmitted();
    },
    onClose: null,
  });

// reparent root: after its own admission it forks exactly ONE term-ignore
// descendant of THIS entry — same F/D, fixed execPath/execArgv, inherited
// stdout/stderr so the descendant's pipes stay open after this root exits.
// It relays the descendant's claims verbatim (data, never proof), admits
// the descendant only after the helper's native ack, and on a matching
// `exit-parent` exits 0 without ever killing the descendant.
const runReparent = () => {
  if (conf.role !== "root") die(EXIT_PROTOCOL, "reparent root required");
  const descFixtureId = `${conf.fixtureId}:descendant`;
  let adopted = null;
  let descWaiting = false;
  let descAdmitted = false;
  sendWaiting();
  process.on("message", (msg) => {
    if (!admitted) {
      expectAdmit(msg);
      admitted = true;
      adopted = adoptChild({
        childMode: "term-ignore",
        childFixtureId: descFixtureId,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
        onWaiting: () => {
          descWaiting = true;
          sendParent("descendant-waiting", {
            descendant: {
              pid: adopted.child.pid, parentPid: process.pid,
              fixtureId: descFixtureId, scopeRunId: conf.scopeRunId,
              mode: "term-ignore", role: "descendant", ...boundsFields,
            },
          });
        },
        onAdmitted: () => {
          descAdmitted = true;
          sendParent("descendant-admitted", {
            descendantPid: adopted.child.pid,
            descendantFixtureId: descFixtureId,
            ...boundsFields,
          });
        },
      });
      sendAdmitted();
      return;
    }
    if (!isObj(msg)) malformed("non-object");
    if (msg.type === "admit-descendant") {
      checkPrivate(
        msg,
        ["descendantPid", "descendantFixtureId", "fixtureStartMonoMs", "fixtureEndMonoMs"],
        selfIdent,
      );
      checkBounds(msg);
      if (!descWaiting || descAdmitted) malformed("admit-descendant order");
      if (
        msg.descendantPid !== adopted.child.pid ||
        msg.descendantFixtureId !== descFixtureId
      )
        malformed("descendant ids");
      adopted.sendAdmit();
      return;
    }
    if (msg.type === "exit-parent") {
      checkPrivate(msg, ["descendantPid", "descendantFixtureId"], selfIdent);
      if (!descAdmitted) malformed("exit-parent order");
      if (
        msg.descendantPid !== adopted.child.pid ||
        msg.descendantFixtureId !== descFixtureId
      )
        malformed("descendant ids");
      // Real parent exit: the descendant keeps its inherited pipes and
      // stays quiet until the actual KILL or D — never killed from here.
      process.exit(EXIT_GRACE);
    }
    malformed(`unexpected ${msg.type}`);
  });
};

// A fixture is always forked with an IPC stdio slot; a missing channel is
// a bounded failure, not a silent wait.
if (typeof process.send !== "function") die(EXIT_BOUNDED, "no ipc channel");

// Parent-channel loss: bounded before admission and for admitted roots
// whose only remaining input was the wire. An admitted term-ignore or
// DESCENDANT stays quiet until the actual signal or D — its real remaining
// input is signals, and the reparent case must survive parent exit with
// the inherited pipes still held open.
process.on("disconnect", () => {
  if (!admitted) die(EXIT_BOUNDED, "ipc disconnect before admit");
  if (conf.mode === "term-ignore" || conf.role === "descendant") return;
  die(EXIT_BOUNDED, "ipc disconnect");
});

if (conf.mode === "idle" || conf.mode === "finalizer") runQuiet();
else if (conf.mode === "listener") runListener();
else if (conf.mode === "term-ignore") runTermIgnore();
else if (conf.mode === "reparent") runReparent();
else
  // The production driver branch is leaf-owned; the entry binds the same
  // eight trusted refs and its own admission flag — no second wire/state.
  runBlockedHeartbeatFixture({
    conf,
    die,
    malformed,
    nowMonoMs,
    isObj,
    keysExact,
    adoptChild,
    markAdmitted: () => { admitted = true; },
  });
