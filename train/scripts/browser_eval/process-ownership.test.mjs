// process-ownership.test.mjs: cached ownership registry cases with
// independent literal expectations. The added differential test bodies
// run bounded pure-Python transform children — fixed argv, no shell,
// no application IPC and no Native kernel calls — over standard pipes;
// normal node:test registration applies to the module itself.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createOwnership } from "./process-ownership.mjs";
import { createListenerProofFixture } from "./process-lsof-test-fixtures.mjs";
import { PYTHON_EXECUTABLE } from "./schema-constants.mjs";

// TEST-only bridge: the selected SDK interpreter runs the support
// module's sole --project-discovery mode over bounded JSON, which is
// the ACTUAL pure N.project_discovery — no libproc/kernel/probe calls.
const SUPPORT = fileURLToPath(new URL("./process_macos_test_support.py", import.meta.url));
const projectDiscovery = (rows, owned, roots) =>
  JSON.parse(
    execFileSync(PYTHON_EXECUTABLE, ["-I", "-B", SUPPORT, "--project-discovery"], {
      input: JSON.stringify({ rows, owned, roots }),
      encoding: "utf8",
      timeout: 2000,
      maxBuffer: 262144,
    }),
  );

const ikey = (i) => `${i.pid}:${i.startSec}:${i.startUsec}`;
const DIFF_SCOPES = ["R1", "R2"];

const targetOutcome = (o, ident, scope) => {
  try {
    return { ok: o.assertSignalTarget(ident, scope).pid };
  } catch (e) {
    return { code: e.code ?? e.message };
  }
};

// Drive TWO genuine registries over the same registered roots/scopes:
// `full` sees each complete native frame, `proj` sees only the actual
// Python projector output keyed by ITS complete current owned union.
// After EACH frame the exact owned/workload/ownedRows/signal surfaces
// must match over the identities seen so far — an intermediate
// discrepancy must not be masked by a later convergence. The
// projection is a data-only superset, never an ownership authority.
const rowKey = (r) =>
  [ikey(r.identity), r.ppid, r.pgid, r.kind, r.workload, r.scopeRunId].join("|");
const diffFrames = (roots, frames) => {
  const full = createOwnership({ runId: "R1" });
  const proj = createOwnership({ runId: "R1" });
  for (const r of roots) {
    full.registerRoot(r);
    proj.registerRoot(r);
  }
  const projectedFrames = [];
  const seen = new Map();
  for (const rows of frames) {
    full.observeDiscovery(rows);
    const projected = projectDiscovery(rows, proj.ownedIdentities(), roots);
    proj.observeDiscovery(projected);
    projectedFrames.push(projected);
    for (const r of rows) seen.set(ikey(r.identity), r.identity);
    assert.deepEqual(
      proj.ownedIdentities().map(ikey).sort(),
      full.ownedIdentities().map(ikey).sort(),
    );
    for (const scope of DIFF_SCOPES) {
      assert.deepEqual(
        proj.workloadIdentities(scope).map(ikey).sort(),
        full.workloadIdentities(scope).map(ikey).sort(),
      );
    }
    assert.deepEqual(
      proj._ownedRows().map(rowKey).sort(),
      full._ownedRows().map(rowKey).sort(),
    );
    for (const ident of seen.values()) {
      for (const scope of DIFF_SCOPES) {
        assert.deepEqual(targetOutcome(proj, ident, scope), targetOutcome(full, ident, scope));
      }
    }
  }
  return { full, proj, projectedFrames };
};

const id = (pid, sec = "1000", usec = 0) => ({
  pid,
  startSec: sec,
  startUsec: usec,
});
const row = (pid, ppid, pgid, uid = 501, sec = "1000") => ({
  identity: id(pid, sec),
  ppid,
  pgid,
  uid,
});

const root = (pid, kind = "browser", scope = "R1") => ({
  identity: id(pid),
  kind,
  expectedExecutable: "/opt/app/bin",
  scopeRunId: scope,
});

test("registerRoot validates and is idempotent, conflicting tuple rejects", () => {
  const o = createOwnership({ runId: "R1" });
  const rec = o.registerRoot(root(100));
  assert.equal(rec.identity.pid, 100);
  o.registerRoot(root(100)); // identical repeat is a no-op
  assert.throws(() =>
    o.registerRoot({
      identity: id(100),
      kind: "driver",
      expectedExecutable: "/opt/app/bin",
      scopeRunId: "R1",
    }),
  );
  assert.throws(() => o.registerRoot({ ...root(9), expectedExecutable: "rel" }));
  assert.throws(() => o.registerRoot({ ...root(9), kind: "nope" }));
});

test("ancestry discovery joins descendants once and keeps them on reparent", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(100, "browser", "R1"));
  // Parent not yet observed: child must not join.
  let r = o.observeDiscovery([row(200, 100, 100)]);
  assert.equal(o.workloadIdentities("R1").length, 1);
  // Parent observed: child joins transitively as workload.
  r = o.observeDiscovery([row(100, 1, 100), row(200, 100, 100), row(300, 200, 300)]);
  assert.equal(r.owned, 3); // whole union: root plus two descendants
  const wl = o.workloadIdentities("R1").map((i) => i.pid);
  assert.deepEqual(new Set(wl), new Set([100, 200, 300]));
  // Reparenting keeps the member owned per full tuple.
  o.observeDiscovery([row(100, 1, 100), row(200, 1, 200), row(300, 1, 999)]);
  assert.deepEqual(new Set(o.workloadIdentities("R1").map((i) => i.pid)), new Set([100, 200, 300]));
});

test("group discovery joins only while a live member exists", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(50, "driver", "R1"));
  // pgid 50 led by root 50: a sibling in the same group joins.
  o.observeDiscovery([row(50, 1, 50), row(60, 1, 50)]);
  assert.deepEqual(new Set(o.workloadIdentities("R1").map((i) => i.pid)), new Set([50, 60]));
  // Every group member gone: the group retires, and a row reusing the
  // pgid in a later complete list is not adopted.
  o.observeDiscovery([row(90, 1, 90)]);
  o.observeDiscovery([row(90, 1, 90), row(80, 1, 50)]);
  assert.deepEqual(new Set(o.workloadIdentities("R1").map((i) => i.pid)), new Set([50, 60]));
});

test("reused pid with a different tuple is a different process", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(80, "browser", "R1"));
  o.observeDiscovery([row(80, 1, 80), row(81, 80, 80)]);
  // PID 81 reappears with a new start tuple; it is not the old member.
  o.observeDiscovery([row(80, 1, 80), row(81, 1, 81, 501, "2000")]);
  assert.equal(o.workloadIdentities("R1").length, 2);
});

test("foreign uid row rejects the discovery", () => {
  const o = createOwnership({ runId: "R1" });
  o.observeDiscovery([row(1, 0, 1, 501)]);
  assert.throws(() => o.observeDiscovery([row(2, 0, 2, 502)]));
});

test("assertSignalTarget enforces owned+workload+scope", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(10, "supervisor", "R1"));
  o.registerRoot(root(20, "browser", "R1"));
  o.registerRoot(root(21, "browser", "R2"));
  assert.equal(o.assertSignalTarget(id(20), "R1").pid, 20);
  assert.throws(() => o.assertSignalTarget(id(10), "R1")); // accounting root
  assert.throws(() => o.assertSignalTarget(id(21), "R1")); // wrong scope
  assert.throws(() => o.assertSignalTarget(id(99), "R1")); // unowned
});

test("registration is authoritative over earlier accounting inheritance", () => {
  const o = createOwnership({ runId: "R1" });
  // Child joins under the ambient supervisor ancestry BEFORE its own
  // registration: the explicit root registration must win role/scope.
  o.registerRoot(root(400, "supervisor", "R1"));
  o.observeDiscovery([row(400, 1, 400), row(401, 400, 400)]);
  o.registerRoot(root(401, "driver", "S1"));
  // Signal targets derive from the registered scope, not the inherited one.
  assert.equal(o.assertSignalTarget(id(401), "S1").pid, 401);
  assert.throws(() => o.assertSignalTarget(id(401), "R1"));
  assert.deepEqual(new Set(o.workloadIdentities("S1").map((i) => i.pid)),
    new Set([401]));
});

test("group liveness requires a live full tuple in that group", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(50, "driver", "R1"));
  o.observeDiscovery([row(50, 1, 50), row(60, 1, 50)]);
  // Root's tuple vanishes while a new process reuses pgid 50: the group
  // retires on tuple liveness, and the reuse is never adopted.
  o.observeDiscovery([row(70, 1, 50, 501, "2000")]);
  assert.deepEqual(o.workloadIdentities("R1").map((i) => i.pid).sort(),
    [50, 60]);
});

test("registerPort binds to owned member only; portsForScope returns copies", () => {
  const o = createOwnership({ runId: "R1" });
  o.registerRoot(root(30, "browser", "R1"));
  o.registerPort({ address: "127.0.0.1", port: 9222, ownerIdentity: id(30), scopeRunId: "R1" });
  assert.equal(o.portsForScope("R1")[0].port, 9222);
  assert.throws(() =>
    o.registerPort({ address: "127.0.0.1", port: 1, ownerIdentity: id(31), scopeRunId: "R1" }),
  );
  assert.throws(() =>
    o.registerPort({ address: "8.8.8.8", port: 1, ownerIdentity: id(30), scopeRunId: "R1" }),
  );
});

test("differential: reverse-order deep ancestry joins, unrelated rows removed", () => {
  const roots = [root(100, "browser", "R1")];
  const frame = [row(300, 200, 300), row(200, 100, 200), row(100, 1, 100), row(999, 1, 999)];
  const { proj, projectedFrames } = diffFrames(roots, [frame]);
  // PPID closure over the complete snapshot finds 200/300 in any order;
  // the unrelated row is actually removed before JS ever sees it.
  assert.deepEqual(projectedFrames[0].map((r) => r.identity.pid), [300, 200, 100]);
  assert.deepEqual(
    new Set(proj.workloadIdentities("R1").map((i) => i.pid)),
    new Set([100, 200, 300]),
  );
});

test("differential: protected supervisor ambient group is data-only, never owned", () => {
  const roots = [root(400, "supervisor", "R1")];
  const frame = [row(400, 1, 400), row(401, 50, 400), row(50, 1, 50)];
  const { proj, projectedFrames } = diffFrames(roots, [frame]);
  // The conservative superset may carry the ambient group member as
  // data; JS ownership still refuses to adopt it.
  assert.deepEqual(
    new Set(projectedFrames[0].map((r) => r.identity.pid)),
    new Set([400, 401]),
  );
  assert.deepEqual(proj.ownedIdentities().map((i) => i.pid), [400]);
});

test("differential: reparent+pgid change retains member, new descendant joins", () => {
  const roots = [root(100, "browser", "R1")];
  diffFrames(roots, [
    [row(100, 1, 100), row(200, 100, 100)],
    [row(100, 1, 100), row(200, 1, 555)],
    [row(100, 1, 100), row(200, 1, 555), row(300, 200, 300)],
  ]);
});

test("differential: dead root's live group member keeps group, new member joins", () => {
  const roots = [root(50, "driver", "R1")];
  diffFrames(roots, [
    [row(50, 1, 50), row(60, 1, 50)],
    [row(60, 1, 50)],
    [row(60, 1, 50), row(70, 1, 50)],
  ]);
});

test("differential: retired group's reused pid+pgid new tuple never inherits", () => {
  const roots = [root(50, "driver", "R1")];
  const { proj } = diffFrames(roots, [
    [row(50, 1, 50), row(60, 1, 50)],
    [row(999, 1, 999)],
    [row(50, 1, 50, 501, "2000"), row(60, 1, 50, 501, "2000")],
  ]);
  assert.ok(!proj.ownedIdentities().some((i) => i.startSec === "2000"));
});

test("differential: two scopes, protected and wrong-scope signal rejection", () => {
  const roots = [
    root(10, "supervisor", "R1"),
    root(20, "browser", "R1"),
    root(21, "browser", "R2"),
  ];
  diffFrames(roots, [
    [row(10, 1, 10), row(20, 1, 20), row(21, 1, 21), row(30, 20, 20)],
  ]);
});

// Scripted native inspection rows for the listener-proof fixture.
const liveIns = (pid, ppid = 1, pgid = pid, sec = "1000", uid = 501) => ({
  pid,
  state: "live",
  process: { identity: id(pid, sec), ppid, pgid, uid },
  executable: "/x",
});
const goneIns = (pid) => ({ pid, state: "gone" });

// One bounded listener-proof run; the fake budget handle is disposed
// after the real proof settles, pass or fail.
const runListeners = async (f) => {
  try {
    return await f.proofs.queryListenersScoped("R1", f.handle, { retainActual: f.retainActual });
  } finally {
    f.handle.dispose();
  }
};

test("listener: mixed cached-gone and live owners query only the live PID", async () => {
  const f = createListenerProofFixture({ script: {
    roots: [root(100, "browser", "R1")],
    rootRows: [row(100, 1, 100), row(200, 100, 100)],
    inspected: { 100: goneIns(100), 200: liveIns(200, 100, 100) },
    queryResults: { 200: { exitCode: 0, stdout: "p200\0f13\0n127.0.0.1:9222\0", stderr: "" } },
    onQuery: (o) => o.registerRoot({ identity: id(300), kind: "python", expectedExecutable: "/p", scopeRunId: "R1" }),
  }});
  const res = await runListeners(f);
  assert.equal(res.listeners.length, 1);
  assert.equal(res.unexpected.length, 0);
  const kinds = f.calls.map((c) => c.kind);
  assert.ok(kinds.indexOf("inspect") < kinds.indexOf("owned")); // classification precedes the gate
  const ownedCalls = f.calls.filter((c) => c.kind === "owned");
  assert.deepEqual(ownedCalls.map((c) => c.pids), [[200]]); // gone 100 and new-root 300 never reach lsof
  assert.equal(ownedCalls[0].opts.budget, f.handle); // SAME borrowed handle
  assert.equal(ownedCalls[0].opts.retainActual, f.retainActual);
  const firstIns = f.calls.find((c) => c.kind === "inspect").fields;
  assert.deepEqual(firstIns.inspectPids, [100, 200]); // frozen snapshot, no iteration growth
  assert.deepEqual(firstIns.owned.map((i) => i.pid), [100, 200]); // full owned context on the issue
  assert.ok(f.ownership.ownedIdentities().some((i) => i.pid === 100 && i.startSec === "1000")); // cache retained
});

test("listener: two live PIDs get sequential single-PID gates", async () => {
  const f = createListenerProofFixture({ script: {
    roots: [root(100, "browser", "R1")],
    rootRows: [row(100, 1, 100), row(200, 100, 100), row(201, 100, 100)],
    inspected: { 100: liveIns(100, 1, 100), 200: liveIns(200, 100, 100), 201: liveIns(201, 100, 100) },
    queryResults: {
      100: { exitCode: 1, stdout: "", stderr: "" },
      200: { exitCode: 1, stdout: "", stderr: "" },
      201: { exitCode: 0, stdout: "p201\0f13\0n127.0.0.1:9333\0", stderr: "" },
    },
  }});
  const res = await runListeners(f);
  assert.deepEqual(f.calls.filter((c) => c.kind === "owned").map((c) => c.pids), [[100], [200], [201]]);
  assert.deepEqual(res.listeners.map((r) => r.pid), [201]);
  assert.deepEqual(res.unexpected, []);
});

test("listener: reused PID with a new tuple is skipped; port holder-mismatch", async () => {
  const f = createListenerProofFixture({ script: {
    roots: [root(80, "browser", "R1")],
    rootRows: [row(80, 1, 80)],
    inspected: { 80: liveIns(80, 1, 80, "2000") },
    ports: [{ address: "127.0.0.1", port: 8080, ownerIdentity: id(80), scopeRunId: "R1" }],
    portResults: { 8080: { exitCode: 0, stdout: "p80\0f13\0n127.0.0.1:8080\0", stderr: "" } },
  }});
  const res = await runListeners(f);
  assert.equal(f.calls.filter((c) => c.kind === "owned").length, 0); // no live old-tuple owner
  assert.deepEqual(f.calls.filter((c) => c.kind === "port").map((c) => c.port), [8080]); // port check still ran
  assert.equal(res.listeners.length, 0);
  assert.equal(res.unexpected[0].reason, "holder-mismatch"); // new-tuple holder, never accepted
  assert.throws(() => f.ownership.assertSignalTarget(id(80, "2000"), "R1")); // new tuple unowned
  assert.ok(f.ownership.ownedIdentities().some((i) => i.pid === 80 && i.startSec === "1000")); // old tuple kept
});

test("listener: missing row, UID drift or send failure aborts before any gate query", async () => {
  const acct = (e) => e.code === "ACCOUNTING_UNAVAILABLE";
  const sendErr = Object.assign(new Error("wire down"), { code: "ACCOUNTING_UNAVAILABLE" });
  const base = {
    roots: [root(100, "browser", "R1")],
    rootRows: [row(100, 1, 100), row(201, 100, 100)],
    inspected: { 100: liveIns(100, 1, 100) },
  };
  const variants = [
    // 201 absent from the fresh reply is never claimed gone.
    { script: base, match: acct },
    // A live row on a different UID fails accounting, not a query.
    { script: { ...base, inspected: { 100: liveIns(100, 1, 100), 201: liveIns(201, 100, 100, "1000", 502) } }, match: acct },
    // An injected transport failure is retained as the exact error.
    { script: { roots: [root(100, "browser", "R1")], rootRows: [row(100, 1, 100)], inspected: { 100: liveIns(100, 1, 100) }, inspectError: sendErr }, match: (e) => e === sendErr },
  ];
  for (const v of variants) {
    const f = createListenerProofFixture({ script: v.script });
    await assert.rejects(runListeners(f), v.match);
    assert.equal(f.calls.filter((c) => c.kind === "owned" || c.kind === "port").length, 0);
  }
});

test("listener: all owners native-gone still runs every registered port query", async () => {
  const f = createListenerProofFixture({ script: {
    roots: [root(100, "browser", "R1")],
    rootRows: [row(100, 1, 100), row(200, 100, 100)],
    inspected: { 100: goneIns(100), 200: goneIns(200) },
    ports: [{ address: "127.0.0.1", port: 9222, ownerIdentity: id(200), scopeRunId: "R1" }],
    portResults: { 9222: { exitCode: 1, stdout: "", stderr: "" } },
  }});
  const res = await runListeners(f);
  assert.equal(f.calls.filter((c) => c.kind === "owned").length, 0); // zero owned-PID queries
  assert.deepEqual(f.calls.filter((c) => c.kind === "port").map((c) => c.port), [9222]); // gone owner's port still checked
  assert.deepEqual(res.listeners, []);
  assert.deepEqual(res.unexpected, []); // proven empty holder set, not an error
  assert.equal(f.ownership.ownedIdentities().length, 2); // retained tuples never evicted
});
