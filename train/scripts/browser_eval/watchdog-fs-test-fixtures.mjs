import { privateFs as phaseFs } from "./private-fs.mjs";
// watchdog-fs-test-fixtures.mjs (TEST-ONLY, base child leaf): the
// exact-path private-FS facade interception owner for the
// evidence-boundary factories; the single per-test teardown owner
// lives in ./watchdog-teardown-test-fixtures.mjs and is re-exported
// here unchanged. gateFs holds ONLY the one selected real operation
// under the canonical workspace root: exactly ONE matching call
// consumes the gate — every later legitimate call delegates unchanged
// while still instrumented — operation "read" intercepts BOTH the
// exact-path phaseFs.open and the legacy phaseFs.readFile surface for existing
// callers (ONE claim across either surface): a claimed open returns
// the SAME real FileHandle with only its read method replaced — the
// ORIGINAL read/readFile runs first with the same this/args, retains
// the genuine {bytesRead,buffer}/bytes result and holds only the
// caller return; operation "rename" arms the actual deferred receipt
// BEFORE the original rename toward the exact target may issue on
// release. entered settles through the truthful entry channel — an
// actual original read failure REJECTS it with that same error after
// the real read completes — never a periodic poll; release latches
// permanently (even before the match) and is neither settlement nor
// join; join fences this gate's own new issuance and waits every
// admitted wrapper — canon, the original FS call, the held
// result/error and the caller return — to settle; restore returns
// instrumentation only after admitted wrappers are genuinely settled
// and rejects otherwise, restoring phaseFs.open and every pinned real
// handle's saved read descriptor beside readFile/rename. Every other
// path and call delegates unchanged. No kinds/multigate filter,
// write or unlink API, no production record, schema, verifier or
// runtime hook.
// registerFixtureTeardown/disposeFixture are PRIVATE helper-to-helper
// exports (never re-exported through the evidence helper) imported
// from and identically re-exported through the teardown leaf — gateFs
// uses the local registerFixtureTeardown binding, and the SAME cached
// actual promise is returned to every caller. ownFixtureAttempt is the
// PRIVATE helper-to-helper admission binding re-exported from the same
// leaf. No second operational ledger, native/process polling, runtime
// identity/status or queue authority. A synthetic unit pass is never
// Native, phase or cleanup acceptance.
import { promises as fsp, realpathSync } from "node:fs";
import path from "node:path";

import {
  disposeFixture,
  ownFixtureAttempt,
  registerFixtureTeardown,
} from "./watchdog-teardown-test-fixtures.mjs";

export { disposeFixture, ownFixtureAttempt, registerFixtureTeardown };

const FAIL = (detail) => {
  const e = new Error(`watchdog-fs-fixture ${detail}`);
  e.code = "FIXTURE_CONFIG";
  return e;
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// The exact-path interception: ONLY the selected real operation under
// the canonical root is ever held — every other path/call delegates
// untouched. The path predicate canonicalizes the EXISTING parent
// directory through the real realpath then rejoins the basename, so a
// not-yet-created rename target still matches and /var versus
// /private/var aliases never miss. Returns
// {entered, release, join, restore}: entered resolves on actual entry
// through the selected interception path, release(error = null) admits
// the held work (a supplied Error rejects the admitted real operation
// on the caller's own channel — never a fake positive), join() waits
// for every actual issued operation and its continuations — releasing
// alone is never joining — and restore() returns the instrumentation.
export function gateFs(t, { workspaceRoot, relativePath, operation } = {}) {
  if (operation !== "read" && operation !== "rename") {
    throw FAIL("operation must be read or rename");
  }
  const wanted = path.join(
    realpathSync(`${workspaceRoot}`),
    `${relativePath}`,
  );
  const orig = {
    open: phaseFs.open,
    readFile: phaseFs.readFile,
    realpath: fsp.realpath,
    rename: phaseFs.rename,
  };
  const ops = [];
  // The claimed real handles stay pinned with their saved read
  // descriptors until restore — strong references, never a WeakMap —
  // so instrumentation is returned exactly where it was installed.
  const pinnedReads = [];
  let pending = 0;
  let consumed = false;
  let released = false;
  let issuanceClosed = false;
  let disposed = false;
  let sawEntry = false;
  const held = deferred();
  // A release(error) fired before any match still latches; the rejected
  // receipt is pre-observed so an unconsumed injection never floats an
  // unhandled rejection.
  held.promise.then(
    () => {},
    () => {},
  );
  const entryReceipt = deferred();
  const entered = entryReceipt.promise;
  // entered may reject with the ACTUAL original read failure — the
  // pre-observed branch keeps an unconsumed rejection from floating
  // while callers still see the genuine error.
  entered.then(
    () => {},
    () => {},
  );
  // An explicit failure flag carries the PRESENCE of an original error
  // while value carries it exactly — a genuine null/undefined rejection
  // is still a rejection, never a falsy success.
  const markEntered = (failed, value) => {
    if (!sawEntry) {
      sawEntry = true;
      if (!failed) entryReceipt.resolve();
      else entryReceipt.reject(value);
    }
  };
  const canon = async (p) => {
    const abs = path.resolve(`${p}`);
    try {
      const real = await orig.realpath(path.dirname(abs));
      return path.join(real, path.basename(abs));
    } catch {
      return null;
    }
  };
  // Exactly ONE matching operation consumes the gate: the claim is taken
  // synchronously the moment the canonical path matches — a prior match
  // or a restored gate delegates unchanged. Selection eligibility stays
  // DISTINCT from the new-entry fence: closing NEW entry through join
  // never makes an ALREADY-ADMITTED canon wrapper ineligible for its
  // first matching one-shot — its op was registered before canon ran,
  // so it still claims and receives the latched held result — while a
  // call STARTING after release/closed issuance delegates before
  // wrapping below, so no newly held gate can form.
  const claim = (c) => {
    if (consumed || disposed || c !== wanted) {
      return false;
    }
    consumed = true;
    return true;
  };
  const heldRead = async (p, rest) => {
    let data;
    let readFailed = false;
    let readError;
    try {
      data = await orig.readFile(p, ...rest);
    } catch (e) {
      readFailed = true;
      readError = e;
    }
    // entered settles only AFTER the actual bytes/error landed: a real
    // read failure REJECTS entered with that original error — the
    // failure flag keeps a null/undefined rejection a failure — and the
    // caller channel throws the same error; an injected release error
    // never masks the real one.
    markEntered(readFailed, readError);
    if (readFailed) {
      await held.promise.catch(() => {});
      throw readError;
    }
    await held.promise;
    return data;
  };
  const heldRename = async (a, b) => {
    // entered marks the real selected pre-issuance boundary — the
    // ORIGINAL rename toward the exact target issues only on release.
    markEntered(false);
    await held.promise;
    return orig.rename(a, b);
  };
  // Every admitted call — matched or delegated — registers its WHOLE
  // wrapper receipt BEFORE canon or the underlying original invocation
  // may run (the body only starts on a microtask after the ops entry
  // lands), so join covers canon bodies, the held result/error and the
  // caller return alike.
  const wrap = (body) => {
    pending += 1;
    const op = Promise.resolve()
      .then(body)
      .finally(() => {
        pending -= 1;
      });
    ops.push(op);
    return op;
  };
  // A claimed open returns the SAME real FileHandle with ONLY its read
  // method replaced by the truthful held wrapper: the ORIGINAL read is
  // invoked with the same this/args exactly once FIRST, entered
  // settles through the same truthful channel on the actual
  // result/error (the real read failure still rejects entered and the
  // caller channel alike — an injected release error never masks the
  // real one), and only the FIRST genuine read's caller return is held
  // behind the existing latch — later reads delegate to the original
  // method unchanged. The read receipt registers its WHOLE wrapper
  // before the original invocation just like every admitted call, and
  // an already-claimed handle keeps its first-read eligibility through
  // the join fence while a restored gate delegates before wrapping.
  // No fabricated result, second underlying read, replacement handle,
  // proxy or close wrapper — the returned object identity, result,
  // args, errors and this stay the original's.
  const heldOpen = async (p, rest) => {
    const handle = await orig.open(p, ...rest);
    const hadOwn = Object.prototype.hasOwnProperty.call(handle, "read");
    const desc = hadOwn
      ? Object.getOwnPropertyDescriptor(handle, "read")
      : undefined;
    const origRead = handle.read;
    const rec = { claimed: false, desc, hadOwn, handle };
    pinnedReads.push(rec);
    handle.read = function (...readArgs) {
      if (rec.claimed || disposed) {
        return origRead.apply(this, readArgs);
      }
      rec.claimed = true;
      return wrap(async () => {
        let result;
        let readFailed = false;
        let readError;
        try {
          result = await origRead.apply(this, readArgs);
        } catch (e) {
          readFailed = true;
          readError = e;
        }
        markEntered(readFailed, readError);
        if (readFailed) {
          await held.promise.catch(() => {});
          throw readError;
        }
        await held.promise;
        return result;
      });
    };
    return handle;
  };
  const onRead = (p, ...rest) => {
    if (issuanceClosed || disposed || released) return orig.readFile(p, ...rest);
    return wrap(async () =>
      claim(await canon(p)) ? heldRead(p, rest) : orig.readFile(p, ...rest),
    );
  };
  // The open surface shares the ONE claim with the legacy readFile
  // surface — whichever canonical match arrives first consumes the
  // gate and every later call delegates unchanged.
  const onOpen = (p, ...rest) => {
    if (issuanceClosed || disposed || released) return orig.open(p, ...rest);
    return wrap(async () =>
      claim(await canon(p)) ? heldOpen(p, rest) : orig.open(p, ...rest),
    );
  };
  const onRename = (a, b) => {
    if (issuanceClosed || disposed || released) return orig.rename(a, b);
    return wrap(async () =>
      claim(await canon(b)) ? heldRename(a, b) : orig.rename(a, b),
    );
  };
  // Latches permanently — even before a match so a delayed matching call
  // can never create a newly held gate after release. A supplied Error
  // rejects the admitted operation on the caller's own channel.
  const release = (error = null) => {
    released = true;
    if (error !== null && error !== undefined) held.reject(error);
    else held.resolve();
  };
  // Fences this gate's own new issuance, then joins every ACTUAL admitted
  // wrapper — canon, the original call and the caller return — settled
  // or genuinely observed. Never a release, never a nested global
  // dispose and never a wait on another gate's debt.
  const join = async () => {
    issuanceClosed = true;
    for (let i = 0; i < ops.length; i += 1) {
      await ops[i].catch(() => {});
    }
  };
  // Instrumentation returns only once issued admission is closed and
  // admitted wrappers are genuinely settled — restoring while a canon
  // or a caller return can still resume would cut a held body loose.
  const restore = () => {
    if (!issuanceClosed || pending !== 0) {
      throw FAIL("restore before admitted wrappers settled");
    }
    disposed = true;
    issuanceClosed = true;
    phaseFs.open = orig.open;
    phaseFs.readFile = orig.readFile;
    phaseFs.rename = orig.rename;
    // Each pinned real handle's saved read descriptor returns only here
    // — an own descriptor is restored verbatim, an inherited one
    // reverts by deleting the shadowing property; no restorer runs
    // around an unknown descriptor or fd.
    for (const rec of pinnedReads) {
      if (rec.hadOwn) Object.defineProperty(rec.handle, "read", rec.desc);
      else delete rec.handle.read;
    }
    pinnedReads.length = 0;
  };
  // The gate registers its own release/settle/restore BEFORE the
  // interception effect installs — the shared owner invokes every
  // release first, joins every settle, and restores only after
  // settlement is closed.
  registerFixtureTeardown(t, {
    release: () => release(),
    settle: join,
    restore,
  });
  if (operation === "read") {
    phaseFs.open = onOpen;
    phaseFs.readFile = onRead;
  } else {
    phaseFs.rename = onRename;
  }
  return { entered, release, join, restore };
}
