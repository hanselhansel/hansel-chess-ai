// process-ownership.mjs owns the run's cached full-tuple identity,
// ancestry and group registry. It performs no process or IPC work: the
// monitor feeds it natively proven facts (root registrations and complete
// current-UID discovery rows) and it answers ownership, scope, signal-
// target and port questions from the cache. Membership is retained per
// full tuple, so reparenting or a process-group change never drops
// accountability. A registered root's role/scope is authoritative over
// any earlier accounting membership discovered before registration.
import {
  copyDeep,
  eq,
  fail,
  identityKey,
  isAbs,
  isBsdRow,
  isIdentity,
  isListener,
  rootKinds,
  workloadKinds,
} from "./protocol-values.mjs";

const bad = (detail) => fail(`root-invalid ${detail}`);

export function createOwnership({ runId }) {
  if (typeof runId !== "string" || runId.length === 0) bad("runId");
  // Registered roots by identityKey. Role/scope authority.
  const roots = new Map();
  // Latest observed BSD row for each registered root key.
  const rootRows = new Map();
  // Owned members by identityKey: {row, rootKey, via}. workload/scope are
  // derived live from roots.get(rootKey), never cached against the member.
  const members = new Map();
  // pgid -> {rootKey, memberKeys:Set}; formed only for isolated workload
  // roots (pgid === pid), never for accounting roots' ambient groups.
  const groups = new Map();
  // scopeRunId -> [{address,port,ownerIdentity}].
  const ports = new Map();
  let uid = null;

  const isOwnedKey = (key) => roots.has(key) || members.has(key);
  const isWorkloadKey = (key) => {
    const r = roots.get(key);
    if (r !== undefined) return workloadKinds.includes(r.kind);
    const m = members.get(key);
    return m ? rootWorkload(m.rootKey) : false;
  };
  const scopeOf = (key) => {
    const r = roots.get(key);
    if (r !== undefined) return r.scopeRunId;
    const m = members.get(key);
    return m ? rootScope(m.rootKey) : runId;
  };
  const rootWorkload = (key) => {
    const r = roots.get(key);
    return r !== undefined && workloadKinds.includes(r.kind);
  };
  const rootScope = (key) => {
    const r = roots.get(key);
    return r ? r.scopeRunId : runId;
  };

  const registerRoot = ({ identity, kind, expectedExecutable, scopeRunId }) => {
    if (
      !isIdentity(identity) ||
      !rootKinds.includes(kind) ||
      !isAbs(expectedExecutable) ||
      typeof scopeRunId !== "string" ||
      scopeRunId.length === 0
    ) {
      bad("fields");
    }
    const key = identityKey(identity);
    const prev = roots.get(key);
    if (prev !== undefined) {
      if (!eq(prev, { identity, kind, expectedExecutable, scopeRunId })) {
        bad("conflict");
      }
      return prev;
    }
    const rec = copyDeep({ identity, kind, expectedExecutable, scopeRunId });
    roots.set(key, rec);
    // A discovery-admitted member that is now an explicit root switches
    // its authority to the registration; accounting rows stay cached.
    const m = members.get(key);
    if (m) {
      m.rootKey = key;
      // Members admitted through this member's ancestry re-anchor to
      // its new authoritative root: a workload driver registered after
      // its children upgrades their scope through it, while members
      // anchored elsewhere keep their existing root.
      for (const [k2, m2] of members) {
        if (k2 === key) continue;
        let p = m2.parentKey;
        let hops = members.size + 1;
        while (p !== undefined && hops-- > 0) {
          if (p === key) {
            m2.rootKey = key;
            break;
          }
          p = members.get(p)?.parentKey;
        }
      }
    } else {
      members.set(key, {
        row: { identity, ppid: 0, pgid: 0, uid: uid ?? 0 },
        rootKey: key,
        via: "root",
      });
    }
    return rec;
  };

  const observeDiscovery = (discovered) => {
    if (!Array.isArray(discovered) || !discovered.every(isBsdRow)) {
      bad("discovery rows");
    }
    const rows = discovered.map(copyDeep);
    for (const r of rows) {
      if (uid === null) uid = r.uid;
      if (r.uid !== uid) bad(`uid ${r.pid}`);
    }
    const byPid = new Map(rows.map((r) => [r.identity.pid, r]));
    // Refresh every retained row (roots and members) so reparenting and
    // group changes keep ancestry current while the tuple is retained.
    for (const [key, rec] of roots) {
      const row = byPid.get(rec.identity.pid);
      if (row && eq(row.identity, rec.identity)) rootRows.set(key, row);
    }
    for (const [key, m] of members) {
      const row = byPid.get(m.row.identity.pid);
      if (row && eq(row.identity, m.row.identity)) m.row = row;
    }
    // Rebuild each group's live membership from the refreshed rows:
    // every owned member actually inside the pgid belongs to its live
    // set, whether it was admitted by ancestry or by the group itself.
    for (const [pgid, g] of groups) {
      g.memberKeys = new Set();
      for (const [key, m] of members) {
        if (m.row.pgid === pgid) g.memberKeys.add(key);
      }
    }
    // Form groups only around registered workload roots that are
    // isolated group leaders. Accounting roots' ambient process groups
    // (a shared parent shell group) never form one.
    for (const [key, rec] of roots) {
      const row = rootRows.get(key);
      if (
        row &&
        workloadKinds.includes(rec.kind) &&
        row.pgid === row.identity.pid &&
        !groups.has(row.pgid)
      ) {
        groups.set(row.pgid, { rootKey: key, memberKeys: new Set([key]) });
      }
    }
    // Retire groups whose live owned membership is empty BEFORE new
    // joins, so a reused pgid is never adopted. Liveness is a matching
    // full tuple actually present in this complete observation.
    for (const [pgid, g] of groups) {
      const stillLive = [...g.memberKeys].some((k) => {
        const r = roots.get(k);
        const m = members.get(k);
        const ident = r ? r.identity : m ? m.row.identity : null;
        const row = ident ? byPid.get(ident.pid) : null;
        return row !== undefined && ident && eq(row.identity, ident) && row.pgid === pgid;
      });
      if (!stillLive) groups.delete(pgid);
    }
    // Transitive admission to a fixpoint: ppid ancestry into a live
    // owned member/root, or pgid membership of a live owned group. An
    // ancestry-admitted member inside a live group's pgid also joins
    // its live set so the group cannot retire around it.
    let joined = true;
    while (joined) {
      joined = false;
      for (const row of rows) {
        const key = identityKey(row.identity);
        if (members.has(key)) continue;
        const g = groups.get(row.pgid);
        const parent = byPid.get(row.ppid);
        if (parent) {
          const pk = identityKey(parent.identity);
          if (isOwnedKey(pk)) {
            const pm = members.get(pk);
            members.set(key, {
              row,
              rootKey: pm ? pm.rootKey : pk,
              via: "ancestry",
              parentKey: pk,
            });
            if (g) g.memberKeys.add(key);
            joined = true;
            continue;
          }
        }
        if (g && !g.memberKeys.has(key)) {
          g.memberKeys.add(key);
          members.set(key, { row, rootKey: g.rootKey, via: "group" });
          joined = true;
        }
      }
    }
    return { owned: members.size };
  };

  const ownedIdentities = () => {
    const out = [];
    const seen = new Set();
    for (const [k, r] of roots) {
      seen.add(k);
      out.push(copyDeep(r.identity));
    }
    for (const [k, m] of members) {
      if (!seen.has(k)) out.push(copyDeep(m.row.identity));
    }
    return out;
  };

  const workloadIdentities = (scopeRunId) => {
    const out = [];
    for (const r of roots.values()) {
      if (workloadKinds.includes(r.kind) && r.scopeRunId === scopeRunId) {
        out.push(copyDeep(r.identity));
      }
    }
    for (const [k, m] of members) {
      if (!roots.has(k) && isWorkloadKey(k) && scopeOf(k) === scopeRunId) {
        out.push(copyDeep(m.row.identity));
      }
    }
    return out;
  };

  const assertSignalTarget = (identity, scopeRunId) => {
    if (!isIdentity(identity)) bad("identity");
    const k = identityKey(identity);
    const r = roots.get(k);
    if (r !== undefined) {
      if (workloadKinds.includes(r.kind) && r.scopeRunId === scopeRunId) {
        return copyDeep(r.identity);
      }
      bad("target scope");
    }
    const m = members.get(k);
    if (m && isWorkloadKey(k) && scopeOf(k) === scopeRunId) {
      return copyDeep(m.row.identity);
    }
    bad("target owned");
  };

  const registerPort = ({ address, port, ownerIdentity, scopeRunId }) => {
    if (
      !isListener({ address, port }) ||
      !isIdentity(ownerIdentity) ||
      typeof scopeRunId !== "string" ||
      scopeRunId.length === 0
    ) {
      bad("port fields");
    }
    if (!isOwnedKey(identityKey(ownerIdentity))) bad("port owner");
    const list = ports.get(scopeRunId) || [];
    list.push(copyDeep({ address, port, ownerIdentity }));
    ports.set(scopeRunId, list);
  };

  const portsForScope = (scopeRunId) => copyDeep(ports.get(scopeRunId) || []);

  const _ownedRows = () => [
    ...[...roots.values()].map((r) => ({
      identity: copyDeep(r.identity),
      ppid: rootRows.get(identityKey(r.identity))?.ppid ?? 0,
      pgid: rootRows.get(identityKey(r.identity))?.pgid ?? 0,
      kind: r.kind,
      workload: workloadKinds.includes(r.kind),
      scopeRunId: r.scopeRunId,
    })),
    ...[...members.entries()].map(([k, m]) => ({
      identity: copyDeep(m.row.identity),
      ppid: m.row.ppid,
      pgid: m.row.pgid,
      kind: roots.has(k) ? roots.get(k).kind : "workload",
      workload: isWorkloadKey(k),
      scopeRunId: scopeOf(k),
    })),
  ];

  const _rowFor = (identity) =>
    copyDeep(
      rootRows.get(identityKey(identity)) ||
        members.get(identityKey(identity))?.row ||
        null,
    );

  const _setRootRow = (row) => {
    if (isBsdRow(row)) rootRows.set(identityKey(row.identity), copyDeep(row));
  };

  return Object.freeze({
    registerRoot,
    observeDiscovery,
    ownedIdentities,
    workloadIdentities,
    assertSignalTarget,
    registerPort,
    portsForScope,
    _ownedRows,
    _rowFor,
    _setRootRow,
  });
}
