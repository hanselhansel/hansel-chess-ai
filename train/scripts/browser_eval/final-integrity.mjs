// Genuine same-run final scan collected before finish. No caller supplies
// a verifier, result, status, initial hash or observation import capability.
import path from "node:path";
import { canonicalBytes, parseCanonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { assertRecord, assertCommonIdentity } from "./record-schema.mjs";
import { createBudgetHandle } from "./process-budget.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";
import { issueActual } from "./artifact-files.mjs";
import { verifyIdentity } from "./snapshots.mjs";
import { isObj, exactFields } from "./protocol-values.mjs";

const copy = (value) => parseCanonicalBytes(canonicalBytes(value));
const equal = (a, b) => canonicalBytes(a).equals(canonicalBytes(b));
const fail = (detail) => {
  const error = new Error(`FINAL_INTEGRITY ${detail}`);
  error.code = "FINAL_INTEGRITY";
  return error;
};
const defaults = { clock: { setTimeout, clearTimeout }, nowMonoMs: () => Number(process.hrtime.bigint() / 1000000n) };

export function createFinalIntegrity(options, timing = defaults) {
  if (!isObj(options) || !exactFields(options, ["workspaceRoot", "manifest", "expectedCommonIdentity", "workEndMonoMs", "lifetime"]) ||
    !isObj(timing) || !exactFields(timing, ["clock", "nowMonoMs"])) {
    throw fail("closed construction fields");
  }
  const { workspaceRoot, manifest, expectedCommonIdentity, workEndMonoMs, lifetime } = options;
  assertWatchdogLifetime(lifetime);
  const mf = copy(manifest);
  const expected = copy(expectedCommonIdentity);
  assertRecord("manifest", mf);
  assertCommonIdentity(expected);
  if (!path.isAbsolute(workspaceRoot) || !Number.isSafeInteger(workEndMonoMs) ||
    sha256Bytes(canonicalBytes(expected)) !== mf.commonIdentitySha256 ||
    typeof timing.nowMonoMs !== "function" || typeof timing.clock?.setTimeout !== "function" ||
    typeof timing.clock?.clearTimeout !== "function") {
    throw fail("construction binding");
  }
  const nowMonoMs = timing.nowMonoMs;
  const clock = Object.freeze({ setTimeout: timing.clock.setTimeout, clearTimeout: timing.clock.clearTimeout });
  const args = copy({ workspaceId: mf.workspaceId, runId: mf.runId, phase: mf.phase,
    expectedCommonIdentity: expected, inputs: mf.inputs });
  let started = false;
  let consumed = false;
  let interrupted = false;
  let complete = false;
  let result;
  let current = null;
  let firstPresent = false;
  let first;
  const note = (error) => {
    if (!firstPresent) {
      firstPresent = true;
      first = error;
    }
  };
  const collect = async (supplied, { deadlineMonoMs }) => {
    if (started) {
      const error = fail("collection once");
      note(error);
      interrupted = true;
      if (current !== null) current.narrow(nowMonoMs());
      throw error;
    }
    started = true;
    try {
      const owned = copy(supplied);
      if (!equal(owned, args)) throw fail("collection association");
      if (interrupted || !Number.isSafeInteger(deadlineMonoMs) || deadlineMonoMs > workEndMonoMs ||
        nowMonoMs() >= deadlineMonoMs) {
        throw fail("original command/work end");
      }
      current = createBudgetHandle({ deadlineMonoMs, clock, nowMonoMs });
      result = await issueActual(lifetime.retainActual, () => verifyIdentity(copy(args), {
        workspaceRoot, budget: current, lifetime,
      }));
      current.assertLive("final integrity completed");
      assertCommonIdentity(result);
      if (interrupted || !equal(result, expected)) throw fail("interrupted or changed observation");
      result = copy(result);
      current.assertLive("final integrity copied");
      complete = true;
    } catch (error) {
      note(error);
      throw first;
    } finally {
      if (current !== null) current.dispose();
      current = null;
    }
  };
  const consume = (supplied, { deadlineMonoMs }) => {
    if (consumed) throw fail("consumption once");
    consumed = true;
    const owned = copy(supplied);
    if (!equal(owned, args) || !Number.isSafeInteger(deadlineMonoMs) || nowMonoMs() >= deadlineMonoMs) {
      throw fail("capture A association/end");
    }
    if (firstPresent) throw first;
    if (!complete || interrupted) throw fail("no completed own observation");
    const captured = copy(result);
    if (nowMonoMs() >= deadlineMonoMs) throw fail("capture A copied past original end");
    return captured;
  };
  const interrupt = () => {
    if (complete) return;
    interrupted = true;
    if (current !== null) current.narrow(nowMonoMs());
  };
  return Object.freeze({ collect, consume, interrupt, isComplete: () => complete && !consumed && !interrupted });
}
