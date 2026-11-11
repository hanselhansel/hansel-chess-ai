// Private supervisor activation. The monitor receives only the opaque reader.
import { V3_POLICY } from "./evaluation-policy.mjs";
import { deepEqual, exactOnly, shape } from "./schema-primitives.mjs";
import { verifyInternalSelfTest } from "./prerequisites.mjs";
import { assertBudgetHandle } from "./process-budget.mjs";

const READERS = new WeakMap();
const SCOPES = new WeakMap();
const invalid = () => { throw new TypeError("private V3 preflight scope association"); };
const association = (reader, runId) => {
  const state = READERS.get(reader);
  if (!state || state.runId !== runId) invalid();
  return state;
};
export function allowsPreflightPeriodic(reader, runId) {
  return association(reader, runId).status === "open";
}
export function closePreflightPeriodic(reader, runId) {
  association(reader, runId).status = "closed";
}
export function assertPreflightQualityScope(scope, runId) {
  if (!SCOPES.has(scope) || SCOPES.get(scope) !== association(scope.reader, runId)) invalid();
}
export function createPreflightQualityScope(options) {
  shape(options, { runId: "strNE", evaluationPolicy: "obj", phase: "strNE" }, "preflight scope options");
  const { runId, evaluationPolicy, phase } = options;
  if (typeof runId !== "string" || !runId || phase !== "preflight" || !deepEqual(evaluationPolicy, V3_POLICY)) invalid();
  const state = { runId, status: "strict", verifying: false };
  const reader = Object.freeze({});
  READERS.set(reader, state);
  const close = () => { state.status = "closed"; };
  const verifyAndOpen = async (input, context, assertLive) => {
    exactOnly(input, ["workspaceRoot", "completionRef", "parentRunId", "parentSupervisor", "expectedIdentity", "probeIdentity"], "scope verification input");
    exactOnly(context, ["io", "budget"], "scope verification context");
    const ioField = Object.getOwnPropertyDescriptor(context, "io");
    const budgetField = Object.getOwnPropertyDescriptor(context, "budget");
    if (Reflect.ownKeys(context).length !== 2 || !ioField || !budgetField ||
      !Object.hasOwn(ioField, "value") || !Object.hasOwn(budgetField, "value")) invalid();
    const io = ioField.value, budget = budgetField.value;
    assertBudgetHandle(budget);
    const verificationContext = Object.freeze({ budget });
    const probeIdentity = input.probeIdentity;
    if (typeof assertLive !== "function" || typeof probeIdentity !== "function" || state.status !== "strict" || state.verifying ||
      input.parentRunId !== runId || !deepEqual(input.expectedIdentity.evaluationPolicy, V3_POLICY)) invalid();
    state.verifying = true;
    const guard = () => {
      const currentIo = Object.getOwnPropertyDescriptor(context, "io");
      const currentBudget = Object.getOwnPropertyDescriptor(context, "budget");
      if (Reflect.ownKeys(context).length !== 2 || !currentIo || !currentBudget || !Object.hasOwn(currentIo, "value") ||
        !Object.hasOwn(currentBudget, "value") || currentIo.value !== io || currentBudget.value !== budget) invalid();
      assertBudgetHandle(budget);
      budget.assertLive("preflight scope admission");
      assertLive();
      if (state.status !== "strict") invalid();
    };
    try {
      guard();
      const guardedProbe = async (...args) => {
        guard();
        const result = await probeIdentity(...args);
        guard();
        return result;
      };
      const verified = await verifyInternalSelfTest({ ...input, probeIdentity: guardedProbe }, io, verificationContext);
      guard();
      state.status = "open";
      return verified;
    } catch (error) {
      close();
      throw error;
    } finally {
      state.verifying = false;
    }
  };
  const scope = Object.freeze({ reader, verifyAndOpen, close });
  SCOPES.set(scope, state);
  return scope;
}
