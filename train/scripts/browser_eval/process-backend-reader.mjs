// process-backend-reader.mjs owns the ONE bounded owned-reader group
// extracted from process-backend.mjs under the backend-reader readable
// split decision (21): the stat gate, the owned stream read and the
// readFact composition over the SAME already-captured borrowed
// BudgetHandle. It performs no spawn, native call or import-side IO
// and holds no independent deadline, clock, queue, registry or
// process authority: the caller injects the handle plus the
// statFile/createStream same-process IO adapters, and every deferred
// physical-settlement receipt is registered through the injected
// retainActual callback BEFORE its actual stat/stream invocation —
// the capture's own receipts array and, when the handle is borrowed,
// the monitor's operation lifetime both hold the acquisition until
// real settlement. A public rejection never releases a physical
// acquisition, and an unproven close stays unavailable with the
// unresolved reader evidence retained.
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import path from "node:path";

import { waitHandle } from "./process-budget.mjs";
import { isAbs, isObj } from "./protocol-values.mjs";

const acct = (detail) => {
  const e = new Error(`ACCOUNTING_UNAVAILABLE backend ${detail}`);
  e.code = "ACCOUNTING_UNAVAILABLE";
  return e;
};

export function createBackendReader({
  handle,
  retainActual,
  statFile,
  createStream,
}) {
  if (
    !isObj(handle) ||
    typeof handle.assertLive !== "function" ||
    typeof handle.onExpire !== "function" ||
    typeof retainActual !== "function" ||
    typeof statFile !== "function" ||
    typeof createStream !== "function"
  ) {
    throw acct("reader options");
  }

  // The actual clock is rechecked before every IO initiation and the
  // already-issued stat settles at the same entry horizon. The stat
  // receipt is created and registered BEFORE the actual statFile
  // invocation — a new Promise executor runs immediately, so the
  // acquisition must exist before the IO thunk ever runs — and it
  // fulfills when the real stat returns or errors even if the
  // bounded waiter already rejected.
  const statChecked = (abs, tag) => {
    handle.assertLive(`${tag} stat`);
    let settleStat;
    const receipt = new Promise((r) => (settleStat = r));
    retainActual(receipt);
    const run = Promise.resolve()
      .then(() => {
        handle.assertLive(`${tag} stat`);
        return statFile(abs);
      })
      .then(
        (v) => {
          settleStat();
          return v;
        },
        (e) => {
          settleStat();
          throw e;
        },
      );
    return waitHandle(handle, run, `${tag} stat`);
  };

  // The ONE owned bounded reader: bytes are counted while reading so
  // a mid-read overflow still fails the cap, and every decision —
  // end, error, overflow or expiry — destroys the stream then waits
  // for the REAL `close` event under the same original horizon. An
  // unproven close rejects unavailable with the unresolved reader
  // facts retained; a late callback can never win after a decision.
  // Binary payloads (`binary:true`) hash/count each chunk directly
  // with NO parts retention — the 256 MiB images are never buffered
  // whole — while text reads (<=1 MiB) keep their chunk list.
  const ownedRead = (abs, cap, tag, binary) =>
    new Promise((resolve, reject) => {
      try {
        handle.assertLive(tag);
      } catch (e) {
        reject(e);
        return;
      }
      const hash = createHash("sha256");
      const parts = binary === true ? null : [];
      let bytes = 0;
      let decided = false;
      // The deferred stream receipt is created and registered BEFORE
      // the actual stream is opened; it fulfills ONLY on the real
      // `close` event — never on end, error, destroy() invocation or
      // an outer rejection — and a synchronous createStream failure
      // settles it truthfully because no stream ever existed.
      let settleStream;
      const receipt = new Promise((res) => (settleStream = res));
      retainActual(receipt);
      let s;
      try {
        s = createStream(abs);
      } catch (e) {
        settleStream();
        reject(e);
        return;
      }
      const onData = (d) => {
        if (decided) return;
        bytes += d.length;
        if (bytes > cap) {
          decide(false, acct(`${tag} bounds`));
          return;
        }
        hash.update(d);
        if (parts !== null) parts.push(d);
      };
      const onEnd = () => decide(true, null);
      const onError = (e) => decide(false, e);
      const unsub = handle.onExpire(() =>
        decide(false, acct(`${tag} deadline`)),
      );
      s.on("data", onData);
      s.on("end", onEnd);
      s.on("error", onError);
      const closed = new Promise((res) => {
        s.once("close", () => {
          // Named listeners and the expiry subscription are released
          // exactly at the observed close, and that same event is the
          // receipt's only fulfillment.
          s.off("data", onData);
          s.off("end", onEnd);
          s.off("error", onError);
          unsub();
          settleStream();
          res(true);
        });
      });
      const decide = (ok, v) => {
        if (decided) return;
        decided = true;
        try {
          if (typeof s.destroy === "function") s.destroy();
        } catch {
          // destroy is best-effort; the close event is the proof.
        }
        waitHandle(handle, closed, `${tag} close`).then(
          () => {
            if (!ok) {
              reject(v);
              return;
            }
            try {
              handle.assertLive(tag);
              resolve({ bytes, parts, sha256: hash.digest("hex") });
            } catch (e) {
              reject(e);
            }
          },
          () => {
            const e = acct(`${tag} close`);
            e.reader = { bytes, decided };
            reject(e);
          },
        );
      };
    });

  // A stat gate precedes every read and a restat follows it: an
  // unknown permission, interrupted, resized, short-counted or
  // oversized fact fails closed, never a fallback. Binary reads
  // return only the streamed digest/count — no whole-buffer fact is
  // ever materialized.
  const readFact = async (abs, cap, tag, binary = false) => {
    const st = await statChecked(abs, tag);
    if (!st.isFile() || st.size > cap) throw acct(`${tag} bounds`);
    const r = await ownedRead(abs, cap, tag, binary);
    if (r.bytes !== st.size) throw acct(`${tag} bytes`);
    const st2 = await statChecked(abs, `${tag} restat`);
    if (
      !st2.isFile() ||
      st2.size !== st.size ||
      st2.dev !== st.dev ||
      st2.ino !== st.ino ||
      st2.mtimeMs !== st.mtimeMs
    ) {
      throw acct(`${tag} unstable`);
    }
    return binary === true
      ? { sha256: r.sha256, byteLength: r.bytes }
      : { buf: Buffer.concat(r.parts), sha256: r.sha256 };
  };

  return Object.freeze({ readFact });
}

// The SECOND private export: deterministic derivation of the REAL exec
// image from the pinned invocation. A canonical framework launcher —
// realpath `.../Python.framework/Versions/<maj.min>/bin/python<same
// maj.min>` — execs its versionroot payload
// `Resources/Python.app/Contents/MacOS/Python`; the derived path must
// resolve to exactly that confined expected location or the
// relationship is invalid. Any OTHER recognizable framework `bin/`
// python path — a non-version Versions segment, a version/bin
// basename mismatch or a bin outside Versions — is a malformed
// launcher layout and fails closed, never a direct image. A
// nonframework resolved executable IS its own image (the injected-test
// direct case), and the already-canonical `Resources/.../Python`
// payload resolves to itself. Raw resolvePath failures propagate and
// no observed-child path, filesystem walk, spawn/probe or
// missing/redirected fallback is ever used. The explicit call performs
// only the trusted synchronous resolvePath adapter IO — no owner,
// clock, queue, registry, wire or async debt — and import is
// effect-free.
const FRAMEWORK_LAUNCHER =
  /^(.+\/Python\.framework\/Versions\/([0-9]+\.[0-9]+))\/bin\/python[^/]*$/;
const FRAMEWORK_BIN_PY = /\/Python\.framework\/(?:[^/]+\/)*bin\/python[^/]*$/;

export function resolvePythonProcessImage(
  pythonExecutable,
  { resolvePath = realpathSync } = {},
) {
  if (!isAbs(pythonExecutable) || typeof resolvePath !== "function") {
    throw acct("python image options");
  }
  const resolved = resolvePath(pythonExecutable);
  if (!isAbs(resolved)) throw acct("python image resolved");
  const m = FRAMEWORK_LAUNCHER.exec(resolved);
  if (m === null) {
    if (FRAMEWORK_BIN_PY.test(resolved)) {
      throw acct("python image launcher");
    }
    return resolved;
  }
  const [, root, version] = m;
  if (path.basename(resolved) !== `python${version}`) {
    throw acct("python image launcher");
  }
  const expected = path.join(
    root,
    "Resources",
    "Python.app",
    "Contents",
    "MacOS",
    "Python",
  );
  if (resolvePath(expected) !== expected) {
    throw acct("python image payload");
  }
  return expected;
}
