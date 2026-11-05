// Bounded immutable snapshot filesystem operations. Pure construction;
// physical raw effects and owned descriptors retain the caller's lifetime.
import { constants, promises as fsp, createReadStream } from "node:fs";
import path from "node:path";
import { issueActual, openActual } from "./artifact-files.mjs";
import { createBackendReader } from "./process-backend-reader.mjs";
import { waitHandle } from "./process-budget.mjs";
import { canonicalBytes, sha256Bytes } from "./canonical-json.mjs";
import { exactFields, isAbs, isRel, isObj } from "./protocol-values.mjs";
import { FIXED_LIMITS } from "./schema-constants.mjs";
import { assertWatchdogLifetime } from "./watchdog-lifetime.mjs";

const fail = (detail) => {
  const error = new Error(`SNAPSHOT_UNAVAILABLE ${detail}`);
  error.code = "SNAPSHOT_UNAVAILABLE";
  return error;
};
const ROLES = ["baseline", "candidate", "harness"];

export function createSnapshotIO(options) {
  if (!isObj(options) || !exactFields(options, ["workspaceRoot", "repoRoot", "budget", "lifetime"]) ||
    !isAbs(options.workspaceRoot) || !isAbs(options.repoRoot)) {
    throw fail("IO context");
  }
  const { workspaceRoot, repoRoot, budget, lifetime } = options;
  assertWatchdogLifetime(lifetime);
  for (const key of ["assertLive", "onExpire", "remainingMs", "deadlineMonoMs"]) {
    if (typeof budget?.[key] !== "function") {
      throw fail("budget handle");
    }
  }
  const call = (tag, thunk) => {
    budget.assertLive(tag);
    const actual = issueActual(lifetime.retainActual, () => {
      budget.assertLive(tag);
      return thunk();
    });
    return waitHandle(budget, actual, tag);
  };
  const absolute = async (target) => {
    let cursor = "/";
    for (const segment of target.slice(1).split("/")) {
      cursor = path.join(cursor, segment);
      const st = await call("snapshot ancestor", () => fsp.lstat(cursor));
      if (st.isSymbolicLink() || cursor !== target && !st.isDirectory()) {
        throw fail("symlink or non-directory ancestor");
      }
    }
    const real = await call("snapshot realpath", () => fsp.realpath(target));
    if (real !== target) {
      throw fail("noncanonical root");
    }
  };
  const confined = async (root, rel) => {
    if ((root !== repoRoot && root !== workspaceRoot) || !isRel(rel)) {
      throw fail("confined path");
    }
    await absolute(root);
    const target = path.join(root, rel);
    await absolute(target);
    return target;
  };
  const reader = createBackendReader({
    handle: budget, retainActual: lifetime.retainActual,
    statFile: (p) => fsp.lstat(p),
    createStream: (p) => createReadStream(p, { flags: constants.O_RDONLY | constants.O_NOFOLLOW }),
  });
  const readAt = async (root, rel, readonly = false) => {
    const target = await confined(root, rel);
    const st = await call("snapshot file mode", () => fsp.lstat(target));
    if (!st.isFile() || readonly && (st.mode & 0o222) !== 0) {
      throw fail("regular readonly file");
    }
    const fact = await reader.readFact(target, FIXED_LIMITS.resources.ordinaryBytes, "snapshot read");
    await confined(root, rel);
    const after = await call("snapshot file mode recheck", () => fsp.lstat(target));
    if (readonly && (after.mode & 0o222) !== 0) {
      throw fail("readonly file changed");
    }
    return Buffer.from(fact.buf);
  };
  let creation;
  const ensureWorkspace = () => {
    if (creation === undefined) {
      creation = Promise.resolve().then(async () => {
        await absolute(path.dirname(workspaceRoot));
        await call("new snapshot workspace", () => fsp.mkdir(workspaceRoot, { mode: 0o755 }));
        await absolute(workspaceRoot);
      });
    }
    return creation;
  };
  const parents = async (rel) => {
    let cursor = workspaceRoot;
    for (const segment of rel.split("/").slice(0, -1)) {
      cursor = path.join(cursor, segment);
      try {
        await call("snapshot directory create", () => fsp.mkdir(cursor, { mode: 0o755 }));
      } catch (error) {
        if (error?.code !== "EEXIST") {
          throw error;
        }
      }
      const st = await call("snapshot directory check", () => fsp.lstat(cursor));
      if (!st.isDirectory() || st.isSymbolicLink()) {
        throw fail("snapshot directory binding");
      }
    }
  };
  let writtenBytes = 0;
  const writeFrozen = (rel, bytes) => {
    if (!isRel(rel) || rel !== "workspace.json" && !rel.startsWith("inputs/") || !Buffer.isBuffer(bytes)) {
      throw fail("write arguments");
    }
    const own = Buffer.from(bytes);
    writtenBytes += own.length;
    if (writtenBytes > FIXED_LIMITS.resources.ordinaryBytes) {
      throw fail("snapshot byte ceiling");
    }
    const body = issueActual(lifetime.retainActual, async () => {
      await ensureWorkspace();
      await parents(rel);
      const target = path.join(workspaceRoot, rel);
      try {
        await call("snapshot destination absent", () => fsp.lstat(target));
        throw fail("snapshot destination exists");
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
      budget.assertLive("snapshot open");
      const file = await openActual(lifetime.retainActual, () => fsp.open(
        target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600,
      ));
      let failed = false;
      let firstError;
      const note = (error) => {
        if (!failed) {
          failed = true;
          firstError = error;
        }
      };
      try {
        let offset = 0;
        while (offset < own.length) {
          budget.assertLive("snapshot write");
          const size = Math.min(65536, own.length - offset);
          const result = await waitHandle(budget, file.write(own, offset, size, offset), "snapshot write");
          if (!Number.isInteger(result.bytesWritten) || result.bytesWritten <= 0 || result.bytesWritten > size) {
            throw fail("short snapshot write");
          }
          offset += result.bytesWritten;
        }
        budget.assertLive("snapshot sync");
        await waitHandle(budget, file.sync(), "snapshot sync");
      } catch (error) {
        note(error);
      }
      // Mandatory true close is attempted even when the original bound
      // expired. Expiry stays a domain failure; it never vetoes closure,
      // proves settlement, or grants a later deadline to the public wait.
      try {
        budget.assertLive("snapshot close");
      } catch (error) {
        note(error);
      }
      try {
        await file.close();
      } catch (error) {
        note(error);
      }
      try {
        budget.assertLive("snapshot closed");
      } catch (error) {
        note(error);
      }
      if (failed) {
        throw firstError;
      }
      await call("snapshot readonly", () => fsp.chmod(target, 0o444));
      const actual = await readAt(workspaceRoot, rel, true);
      if (!actual.equals(own)) {
        throw fail("written bytes changed");
      }
      return Object.freeze({ path: rel, byteLength: actual.length, sha256: sha256Bytes(actual) });
    });
    return waitHandle(budget, body, "snapshot write body");
  };
  const dependencyRoot = async () => {
    await absolute(repoRoot);
    const root = await call("snapshot dependency root", () => fsp.realpath(path.join(repoRoot, "node_modules")));
    await absolute(root);
    return root;
  };
  const listAt = async (root, prefixes) => {
    if (!Array.isArray(prefixes) || !prefixes.every(isRel)) {
      throw fail("listing prefixes");
    }
    const paths = new Set();
    const walk = async (rel) => {
      const target = path.join(root, rel);
      const st = await call("snapshot listing stat", () => fsp.lstat(target));
      if (st.isSymbolicLink()) {
        if (root !== workspaceRoot || !ROLES.some((role) => rel === `inputs/${role}/node_modules`)) {
          throw fail("listing symlink");
        }
        const link = await call("snapshot dependency link", () => fsp.readlink(target));
        if (link !== await dependencyRoot()) {
          throw fail("dependency link target");
        }
        return;
      }
      await confined(root, rel);
      if (st.isFile()) {
        paths.add(rel);
      } else if (st.isDirectory()) {
        const names = await call("snapshot directory list", () => fsp.readdir(target));
        if (root === workspaceRoot && ROLES.some((role) => rel === `inputs/${role}`) && !names.includes("node_modules")) {
          throw fail("missing dependency link");
        }
        for (const name of names.sort()) {
          await walk(`${rel}/${name}`);
        }
        const after = await call("snapshot directory restat", () => fsp.lstat(target));
        const next = await call("snapshot directory relist", () => fsp.readdir(target));
        if (st.ino !== after.ino || st.mtimeMs !== after.mtimeMs ||
          !canonicalBytes(names).equals(canonicalBytes(next.sort()))) {
          throw fail("mixed directory capture");
        }
      } else {
        throw fail("nonregular snapshot input");
      }
    };
    await absolute(root);
    for (const prefix of [...prefixes]) {
      await walk(prefix);
    }
    budget.assertLive("snapshot listing");
    return [...paths].sort();
  };
  const linkDependencies = async (dependenciesRoot) => {
    const target = await dependencyRoot();
    if (dependenciesRoot !== target) {
      throw fail("dependency selection");
    }
    for (const role of ROLES) {
      const rel = `inputs/${role}/node_modules`;
      await parents(rel);
      await call("snapshot dependency link create", () => fsp.symlink(target, path.join(workspaceRoot, rel), "dir"));
    }
    const seal = async (dir) => {
      const names = await call("snapshot seal list", () => fsp.readdir(dir));
      for (const name of names) {
        const child = path.join(dir, name);
        const st = await call("snapshot seal stat", () => fsp.lstat(child));
        if (st.isDirectory()) {
          await seal(child);
        } else if (st.isSymbolicLink() && !ROLES.some((role) => child === path.join(workspaceRoot, `inputs/${role}/node_modules`))) {
          throw fail("unexpected seal symlink");
        }
      }
      await call("snapshot seal readonly", () => fsp.chmod(dir, 0o555));
    };
    await seal(path.join(workspaceRoot, "inputs"));
  };
  return Object.freeze({ call, readAt, writeFrozen, listAt, linkDependencies });
}
