// Harness-private real FS backend. Syscalls run inside the caller's already
// guarded/preregistered issue; one I/O turn delivers only the completed result.
// Existing raw/close receipts remain authority. This is resource storage only,
// not a second debt ledger, clock, deadline, request queue or runtime switch.
import fs from "node:fs";
import { accountingTrace } from "./accounting-trace.mjs";
import { Readable } from "node:stream";

const resources = new Set();
const completed = (op, issue) => {
  const traceId = accountingTrace.fsBegin(op);
  let failed = false;
  let result;
  try {
    result = issue();
  } catch (error) {
    failed = true;
    result = error;
  }
  accountingTrace.fsReturn(traceId, failed);
  return new Promise((resolve, reject) => {
    try {
      setImmediate(() => {
        accountingTrace.fsDeliver(traceId);
        if (failed) reject(result);
        else resolve(result);
      });
    } catch (error) {
      reject(failed ? result : error);
    }
  });
};
const closedError = () => Object.assign(new Error("file handle closed"), { code: "EBADF" });

const rawFile = (file, flags, mode) => {
  const entry = { fd: undefined, state: "issuing", cause: undefined };
  resources.add(entry);
  try {
    entry.fd = fs.openSync(file, flags, mode);
    entry.state = "open";
  } catch (error) {
    entry.state = "unknown";
    entry.cause = error;
    throw error;
  }
  const usable = () => {
    if (entry.state === "unknown") throw entry.cause;
    if (entry.state !== "open") throw closedError();
    return entry.fd;
  };
  return {
    get fd() {
      return entry.state === "closed" ? -1 : entry.fd;
    },
    stat: (...args) => completed("fd.stat", () => fs.fstatSync(usable(), ...args)),
    read: (buffer, offset, length, position) =>
      completed("fd.read", () => ({
        bytesRead: fs.readSync(usable(), buffer, offset, length, position),
        buffer,
      })),
    write: (buffer, offset, length, position) =>
      completed("fd.write", () => ({
        bytesWritten: fs.writeSync(usable(), buffer, offset, length, position),
        buffer,
      })),
    sync: () => completed("fd.sync", () => fs.fsyncSync(usable())),
    close: () =>
      completed("fd.close", () => {
        if (entry.state === "closed") return;
        const fd = usable();
        try {
          fs.closeSync(fd);
        } catch (error) {
          // The integer may already be recycled. Never issue another operation
          // on it after an ambiguous close, including an OS-level close retry.
          entry.state = "unknown";
          entry.cause = error;
          throw error;
        }
        entry.state = "closed";
        entry.fd = undefined;
        resources.delete(entry);
      }),
  };
};

// Mutable only for trusted existing test instrumentation. Operational code
// receives these same functions; there is no CLI/configuration backend choice.
export const privateFs = {};
for (const name of [
  "lstat",
  "stat",
  "readlink",
  "readdir",
  "mkdir",
  "chmod",
  "symlink",
  "unlink",
  "rename",
  "readFile",
]) {
  privateFs[name] = (...args) => completed(`fs.${name}`, () => fs[`${name}Sync`](...args));
}
privateFs.realpath = (...args) => completed("fs.realpath", () => fs.realpathSync.native(...args));
privateFs.open = (...args) => completed("fs.open", () => rawFile(...args));

// Cold byte delivery with a real immediately-opened descriptor. The reader's
// existing receipt is armed before this factory; every fresh read uses its
// original captured effect guard. An emitted close is physical proof only.
export function createPrivateReadStream(file, options = {}) {
  const flags = options.flags ?? "r";
  const guard = options.assertEffectLive;
  if (guard !== undefined && typeof guard !== "function") throw new TypeError("stream guard");
  const entry = {
    fd: undefined,
    state: "new",
    stream: null,
    readTask: null,
    faultPresent: false,
    fault: undefined,
    openIssued: false,
  };
  const fault = (error) => {
    if (!entry.faultPresent) {
      entry.faultPresent = true;
      entry.fault = error;
    }
  };
  let opened;
  const stream = new Readable({
    highWaterMark: 64 * 1024,
    emitClose: false,
    autoDestroy: true,
    construct(callback) {
      opened.then(
        () => callback(),
        () => {
          // Node treats null/undefined callback errors as success. The original
          // arbitrary open fault is retained above and emitted by _destroy.
          this.destroy();
          callback();
        },
      );
    },
    read() {
      if (this.destroyed || entry.state !== "open" || entry.readTask !== null) return;
      const buffer = Buffer.allocUnsafe(64 * 1024);
      entry.readTask = completed("stream.read", () => {
        try {
          guard?.();
          return fs.readSync(entry.fd, buffer, 0, buffer.length, null);
        } catch (error) {
          fault(error);
          throw error;
        }
      });
      entry.readTask.then(
        (count) => {
          entry.readTask = null;
          if (this.destroyed || entry.state !== "open") return;
          try {
            guard?.();
          } catch (error) {
            fault(error);
            this.destroy(error);
            return;
          }
          this.push(count === 0 ? null : buffer.subarray(0, count));
        },
        (error) => {
          entry.readTask = null;
          this.destroy(error);
        },
      );
    },
    destroy(error, callback) {
      if (error !== null && error !== undefined) fault(error);
      const finish = (physical) => {
        // The original error reaches listeners before close removes them.
        try {
          if (entry.faultPresent) this.emit("error", entry.fault);
        } finally {
          callback(null);
          if (physical) this.emit("close");
        }
      };
      const close = () => {
        if (entry.state === "never" || entry.state === "closed") {
          finish(true);
          return;
        }
        if (entry.state !== "open") {
          finish(false);
          return;
        }
        completed("stream.close", () => {
          try {
            fs.closeSync(entry.fd);
          } catch (cause) {
            entry.state = "unknown";
            fault(cause);
            throw cause;
          }
          entry.state = "closed";
          entry.fd = undefined;
          this.fd = null;
          resources.delete(entry);
        }).then(
          () => finish(true),
          () => finish(false),
        );
      };
      // The syscall already completed, but its result/error delivery stays
      // owned. No data or new read may follow destroy/physical close.
      if (entry.readTask !== null) entry.readTask.then(close, close);
      else close();
    },
  });
  // Readable's logical destruction can finish with an unknown FD. Do not
  // expose its internal logical closed bit as physical-close evidence.
  Object.defineProperty(stream, "closed", {
    get: () => entry.state === "closed" || entry.state === "never",
  });
  entry.stream = stream;
  resources.add(entry);
  opened = completed("stream.open", () => {
    try {
      guard?.();
      entry.openIssued = true;
      entry.fd = fs.openSync(file, flags);
      entry.state = "open";
      stream.fd = entry.fd;
    } catch (error) {
      fault(error);
      entry.state = entry.openIssued ? "unknown" : "never";
      if (!entry.openIssued) resources.delete(entry);
      throw error;
    }
  });
  // _construct observes the real outcome on Node's next construction turn.
  opened.catch(() => {});
  return stream;
}
