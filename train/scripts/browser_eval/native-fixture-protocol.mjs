// native-fixture-protocol.mjs — TEST-ONLY protocol leaf for
// native-fixture.mjs. Imports Node builtins ONLY — never the entry, the
// harness or any other project module — and owns five whole moved units:
// the strict argv parser with its own constants, the closed key-set frame
// predicate, the real loopback listener mode body, the REAL production
// blocked-heartbeat driver branch with its wire constants, and the shared
// bounded wait primitives the serial suite delegates to. The entry binds
// the fixture units through trusted refs at dispatch; nothing here
// creates a second clock, state, ledger, queue or owner.
//
// blocked-heartbeat speaks the EXISTING production driver wire only —
// canonical ipcVersion 1 frames {ipcVersion,runId,seq,type} with the exact
// driver-protocol fields: hello / 500ms heartbeat / register / begin /
// closed. It injects no testVersion frame and no private field onto that
// wire, then blocks its main loop in a finite Atomics.wait clamped to D
// (a JS timer is not an escape from a blocked loop) so the real watchdog
// observes a real heartbeat gap.

import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { isAbsolute } from "node:path";
import process from "node:process";

// Leaf-owned constants for the moved units below: the parser's fixed
// lifetime/mode/role allowlists, the driver wire's canonical ipcVersion,
// 500ms heartbeat cadence, allowed phases, hash shape and closed base
// keys, plus the SAME intrinsic ABI exit codes the entry owns — protocol
// constants kept in lockstep, never shared state, since the leaf can
// never import the entry.
const IPC_VERSION = 1;
const LIFETIME_MS = 9500;
const HEARTBEAT_MS = 500;
const EXIT_GRACE = 0;
const EXIT_PROTOCOL = 64;
const EXIT_BOUNDED = 70;
const EXIT_INTRINSIC = 88;
const MODES = new Set([
  "idle", "listener", "blocked-heartbeat", "term-ignore", "reparent", "finalizer",
]);
const ROLES = new Set(["root", "descendant"]);
const DRIVER_PHASES = new Set([
  "check", "parity", "preflight", "compare", "watchdog-selftest",
]);
const RE_HEX64 = /^[0-9a-f]{64}$/;
const DRIVER_BASE = ["ipcVersion", "runId", "seq", "type"];

// Strict fixed pairs: each known flag at most once, nothing positional, no
// duration or wire-field override. Optional flags are per-mode only. The
// entry binds `die` and its one `nowMonoMs` clock — the parser owns no
// timing source of its own.
export const parseNativeFixtureArgv = (argv, { die, nowMonoMs }) => {
  const KNOWN = new Set([
    "--mode", "--run-id", "--fixture-id", "--scope-run-id",
    "--fixture-start", "--fixture-end", "--role",
    "--manifest-path", "--node-image",
  ]);
  if (argv.length % 2 !== 0) die(EXIT_PROTOCOL, "argv must be flag/value pairs");
  const raw = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (!KNOWN.has(flag)) die(EXIT_PROTOCOL, `unknown flag ${flag}`);
    if (raw[flag] !== undefined) die(EXIT_PROTOCOL, `duplicate flag ${flag}`);
    raw[flag] = val;
  }
  const word = (flag, required) => {
    const v = raw[flag];
    if (v === undefined) {
      if (required) die(EXIT_PROTOCOL, `missing ${flag}`);
      return null;
    }
    if (typeof v !== "string" || v.length === 0) die(EXIT_PROTOCOL, `empty ${flag}`);
    return v;
  };
  const int = (flag) => {
    const v = word(flag, true);
    if (!/^(0|[1-9][0-9]*)$/.test(v) || !Number.isSafeInteger(Number(v)))
      die(EXIT_PROTOCOL, `non-integer ${flag}`);
    return Number(v);
  };
  const abs = (flag, required) => {
    const v = word(flag, required);
    if (v !== null && !isAbsolute(v)) die(EXIT_PROTOCOL, `non-absolute ${flag}`);
    return v;
  };
  const mode = word("--mode", true);
  const role = word("--role", true);
  if (!MODES.has(mode)) die(EXIT_PROTOCOL, `bad mode ${mode}`);
  if (!ROLES.has(role)) die(EXIT_PROTOCOL, `bad role ${role}`);
  // --manifest-path exists only for blocked-heartbeat: the harness writes
  // evidenceRoot/<phase>/manifest.json BEFORE the driver fork.
  const manifestPath = abs("--manifest-path", mode === "blocked-heartbeat");
  if (mode !== "blocked-heartbeat" && manifestPath !== null)
    die(EXIT_PROTOCOL, "--manifest-path unused by mode");
  // --node-image is the REAL Node image: execPath for a mode's own forked
  // descendant and blocked-heartbeat's register expectedExecutable. A
  // forking parent passes it unchanged to its child, so the two modes a
  // fixture parent adopts (idle, term-ignore) accept it as forwarded
  // context; listener/finalizer never fork and reject it outright.
  const forksChild = mode === "reparent" || mode === "blocked-heartbeat";
  const nodeImage = abs("--node-image", forksChild);
  if (
    !forksChild && nodeImage !== null && mode !== "idle" && mode !== "term-ignore"
  )
    die(EXIT_PROTOCOL, "--node-image unused by mode");
  const F = int("--fixture-start");
  const D = int("--fixture-end");
  if (D !== F + LIFETIME_MS) die(EXIT_PROTOCOL, "fixture-end must equal start+9500");
  const now = nowMonoMs();
  if (F > now) die(EXIT_PROTOCOL, "fixture-start in the future");
  if (now >= D) die(EXIT_PROTOCOL, "fixture lifetime already expired");
  return {
    mode, role, manifestPath, nodeImage, F, D,
    runId: word("--run-id", true),
    fixtureId: word("--fixture-id", true),
    scopeRunId: word("--scope-run-id", true),
  };
};

// Closed key-set predicate shared by the private and driver wire checks:
// a frame carries exactly `base` plus the closed per-type `extra` keys.
export const nativeFixtureFieldsExact = (msg, base, extra) => {
  const ks = Object.keys(msg);
  return (
    ks.length === base.length + extra.length &&
    [...base, ...extra].every((k) => ks.includes(k))
  );
};

// listener binds 127.0.0.1:0 ONLY after admission — no HTTP, no external
// IO — reports the actual bound port after `admitted`, and on `close`
// destroys its sockets then awaits the REAL server.close callback before
// the graceful exit above.
export const runNativeListenerFixture = ({
  runDirect,
  sendAdmitted,
  sendParent,
  die,
}) => {
  let server = null;
  const sockets = new Set();
  runDirect({
    install: () => {
      server = createServer((sock) => {
        sockets.add(sock);
        sock.on("close", () => sockets.delete(sock));
      });
      server.on("error", (e) => die(EXIT_BOUNDED, `listen ${e && e.message}`));
      server.listen(0, "127.0.0.1", () => {
        sendAdmitted();
        sendParent("listening", { address: "127.0.0.1", port: server.address().port });
      });
    },
    onClose: () => {
      for (const s of sockets) s.destroy();
      return new Promise((resolve, reject) => {
        try {
          server.close((err) => (err ? reject(err) : resolve()));
        } catch (e) {
          reject(e);
        }
      });
    },
  });
};

// blocked-heartbeat: a REAL production driver branch. Reads ONLY the
// supplied manifest (written by the harness before the fork) for
// runId/phase/commonIdentitySha256, speaks the canonical ipcVersion 1
// driver wire exclusively, registers ONE adopted term-ignore child as a
// fixture
// AFTER its private waiting claim — the native registered ack, never the
// claim, gates the child's private admit — then blocks the main loop in
// finite Atomics.wait so the real watchdog observes a real heartbeat gap.
// No finish/game/winner/end frame is ever manufactured; the only legal
// terminal reply to a pre-block stop is `closed` preserving seq.
// Every collaborator arrives through the entry's trusted refs: conf, die,
// malformed, its one nowMonoMs clock, isObj, keysExact, adoptChild and the
// explicit markAdmitted that sets the entry's own admission flag.
export const runBlockedHeartbeatFixture = ({
  conf,
  die,
  malformed,
  nowMonoMs,
  isObj,
  keysExact,
  adoptChild,
  markAdmitted,
}) => {
  if (conf.role !== "root") die(EXIT_PROTOCOL, "blocked-heartbeat root required");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(conf.manifestPath, "utf8"));
  } catch (e) {
    die(EXIT_BOUNDED, `manifest ${e && e.message}`);
  }
  if (
    !isObj(manifest) ||
    manifest.runId !== conf.runId ||
    !DRIVER_PHASES.has(manifest.phase) ||
    !RE_HEX64.test(manifest.commonIdentitySha256)
  )
    malformed("manifest binding");
  let seqD2S = 0;
  let expectS2D = 0;
  let liveOp = null;
  let started = false;
  let stopped = false;
  let adopted = null;
  let pendingRequest = null;
  let registeredId = null;
  let pendingOp = null;
  const driverSend = (type, fields) => {
    const msg = { ipcVersion: IPC_VERSION, runId: conf.runId, seq: seqD2S, type, ...fields };
    seqD2S += 1;
    try {
      process.send(msg, (err) => {
        // A submitted frame is never replayed; a real callback error is a
        // bounded failure, not a retry.
        if (err) die(EXIT_BOUNDED, `driver ${type} send`);
      });
    } catch {
      die(EXIT_BOUNDED, `driver ${type} send threw`);
    }
  };
  driverSend("hello", {
    pid: process.pid,
    phase: manifest.phase,
    commonIdentitySha256: manifest.commonIdentitySha256,
  });
  // Real 500ms heartbeats carrying the CURRENT pending/live operation id —
  // null before any begin, exactly as the production validator requires.
  const hb = setInterval(() => {
    if (!stopped) driverSend("heartbeat", { operationId: liveOp });
  }, HEARTBEAT_MS);
  // SIGTERM ignore is installed before the blocked loop (covering the whole
  // post-hello window) so the real TERM stage is observably survived and
  // escalation to the real KILL is the observed path.
  process.on("SIGTERM", () => {});
  const beginBlock = () => {
    driverSend("heartbeat", { operationId: liveOp });
    // One macrotask lets the real send callback land before the loop is
    // suspended; the Atomics.wait is the ONLY block — finite, clamped to
    // the original D, with the armed D timer as the outer bound.
    setImmediate(() => {
      clearInterval(hb);
      const remaining = conf.D - nowMonoMs();
      if (remaining > 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, remaining);
      }
      process.exit(EXIT_INTRINSIC);
    });
  };
  const DRIVER_FIELDS = {
    start: ["manifestPath", "commonIdentitySha256"],
    registered: ["requestId", "identity", "listener"],
    begun: ["operationId", "remainingMs"],
    stop: ["stopReason", "cleanupRemainingMs"],
  };
  process.on("message", (msg) => {
    if (!isObj(msg)) malformed("driver frame");
    const extra = DRIVER_FIELDS[msg.type];
    if (extra === undefined || !keysExact(msg, DRIVER_BASE, extra))
      malformed("driver fields");
    if (
      msg.ipcVersion !== IPC_VERSION ||
      msg.runId !== conf.runId ||
      msg.seq !== expectS2D
    )
      malformed("driver envelope");
    expectS2D += 1;
    if (msg.type === "stop") {
      stopped = true;
      driverSend("closed", {
        gracefulCloseAttempted: true,
        expectedShutdowns:
          registeredId !== null ? [{ kind: "fixture", id: registeredId }] : [],
      });
      // Graceful wire end: exit after the submitted closed frame's
      // callback turn; D remains the outer bound either way.
      setImmediate(() => process.exit(EXIT_GRACE));
      return;
    }
    if (stopped) malformed("post-stop frame");
    if (msg.type === "start") {
      if (started) malformed("start twice");
      if (
        msg.manifestPath !== conf.manifestPath ||
        msg.commonIdentitySha256 !== manifest.commonIdentitySha256
      )
        malformed("start binding");
      started = true;
      // The validated start IS this branch's admission — it marks the
      // driver admitted on the entry's own flag for its role-specific
      // disconnect policy.
      markAdmitted();
      adopted = adoptChild({
        childMode: "term-ignore",
        childFixtureId: `${conf.fixtureId}:term-ignore`,
        // Bundled correction: the small term-ignore child inherits the
        // driver's stdout/stderr like the reparent descendant, so the
        // harness observes the whole controlled output and the ACTUAL
        // pipe closure — the one explicit deviation inside this moved
        // driver. Its existing SIGTERM-ignore mode keeps it live through
        // the real TERM so the exact KILL stage is observed.
        stdio: ["ignore", "inherit", "inherit", "ipc"],
        onWaiting: () => {
          pendingRequest = `${conf.runId}:${conf.fixtureId}:register`;
          driverSend("register", {
            requestId: pendingRequest,
            kind: "fixture",
            rootPid: adopted.child.pid,
            expectedExecutable: conf.nodeImage,
            listener: null,
          });
        },
        onAdmitted: () => {
          pendingOp = `${conf.runId}:${conf.fixtureId}:op`;
          liveOp = pendingOp;
          driverSend("begin", { operationId: pendingOp, kind: "command" });
        },
      });
      return;
    }
    if (!started) malformed("pre-start frame");
    if (msg.type === "registered") {
      if (
        msg.requestId !== pendingRequest ||
        !isObj(msg.identity) ||
        msg.identity.pid !== adopted.child.pid ||
        msg.listener !== null
      )
        malformed("registered binding");
      registeredId = pendingRequest;
      pendingRequest = null;
      adopted.sendAdmit();
      return;
    }
    if (msg.type === "begun") {
      if (
        msg.operationId !== pendingOp ||
        typeof msg.remainingMs !== "number" ||
        msg.remainingMs <= 0
      )
        malformed("begun op");
      pendingOp = null;
      beginBlock();
      return;
    }
    malformed(`driver ${msg.type}`);
  });
};

// waits: the WHOLE existing bounded wait-primitive owner moved literal
// out of the serial suite (correction 77, the 31-line literal body
// pinned in `77-native-waiters-whole-input.json`). A PURE constructor:
// it captures the SAME borrowed clock and its nowMonoMs reference only
// — never invokes clocks, timers or callbacks at import or
// construction — and adds no deadline/default/grace/Native/wire/proof/
// status authority of its own.
export function createNativeFixtureWaits({ clock }) {
  const now = clock.nowMonoMs;
  // Bounded real-time waits on the ORIGINAL absolute bounds — every
  // losing timer is released on unwind and a spent bound rejects before
  // any wait begins. No now+grace anywhere, and no wait is retained on
  // the shared owner.
  const until = (deadline) =>
    new Promise((resolve) => {
      const left = deadline - now();
      if (left <= 0) {
        resolve();
        return;
      }
      clock.setTimeout(resolve, left);
    });
  // `within` takes a THUNK: it rejects a spent bound BEFORE any effect
  // is issued, races the thunk against the remaining original bound,
  // then rechecks `now() < end` after completion — a bound-crossing
  // resolution is still a failure, never equality success.
  const within = async (thunk, end, tag) => {
    if (!(now() < end)) throw new Error(`${tag} bound spent`);
    let t;
    const timeout = new Promise((_, rej) => {
      t = clock.setTimeout(() => rej(new Error(`${tag} bound`)), end - now());
    });
    try {
      const v = await Promise.race([thunk(), timeout]);
      if (!(now() < end)) throw new Error(`${tag} late`);
      return v;
    } finally {
      clock.clearTimeout(t);
    }
  };
  return Object.freeze({ until, within });
}
