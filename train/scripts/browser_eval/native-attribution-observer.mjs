// TEST-only observations. Original operations/Promises/listeners/debts are authority.
// Aggregates are diagnostic data, never validity, cancellation or physical proof.
export function requireFullNativeWindow(outerEndMs, nowMs) {
  if (!Number.isFinite(outerEndMs) || !Number.isFinite(nowMs) || outerEndMs - nowMs < 60000) {
    throw new Error("attribution original command has less than60s remaining");
  }
}

export function createAttributionObserver({ nowNs, workEndMonoMs = null }) {
  if (typeof nowNs !== "function") throw new TypeError("attribution clock");
  if (workEndMonoMs !== null && !Number.isFinite(workEndMonoMs))
    throw new TypeError("attribution fence");
  const workEndNs = workEndMonoMs === null ? null : BigInt(Math.floor(workEndMonoMs * 1e6));
  let lateEffects = 0,
    firstLate = null,
    lastLate = null;
  let retain = null;
  let failed = false;
  let first;
  let sequence = 0;
  const restores = [];
  const hookedFiles = new WeakSet();
  let bins = new Map();
  const pending = new Map();
  const faults = (error) => {
    if (!failed) {
      failed = true;
      first = error;
    }
  };
  const safe = (fn) => {
    try {
      return fn();
    } catch (error) {
      faults(error);
    }
  };
  const stamp = () => BigInt(nowNs());
  const record = (kind, value, at) =>
    safe(() => {
      if (failed) return;
      if (retain === null) throw new Error("attribution has no original diagnostic accountant");
      if (retain(`attribution:${kind}`, value, at.toString()) === false) {
        throw new Error("attribution original4MiB overflow");
      }
    });
  const flush = (reason, at = stamp()) => {
    if (bins.size === 0 && pending.size === 0) return;
    const result = [...bins].map(([name, bin]) => ({ name, ...bin }));
    bins = new Map();
    record(
      "fs",
      { reason, bins: result, pending: [...pending.values()].map((p) => ({ ...p })) },
      at,
    );
  };
  const binFor = (name) => {
    let bin = bins.get(name);
    if (!bin) {
      bin = {
        calls: 0,
        returned: 0,
        settled: 0,
        rejected: 0,
        syncNs: "0",
        dispatchNs: "0",
        maximum: null,
        maximumDispatch: null,
      };
      bins.set(name, bin);
    }
    return bin;
  };
  const add = (bin, field, value) => {
    bin[field] = (BigInt(bin[field]) + value).toString();
  };
  const measure = (name, fn, self, args, onValue) => {
    let start, id;
    safe(() => {
      start = stamp();
      id = sequence++;
      binFor(name).calls++;
      pending.set(id, { id, name, startNs: start.toString(), returnNs: null });
      if (workEndNs !== null && start >= workEndNs && name !== "fd.close") {
        lateEffects++;
        lastLate = { id, name, atMonoNs: start.toString(), workEndNs: workEndNs.toString() };
        firstLate ??= lastLate;
      }
    });
    let value,
      threw = false,
      cause;
    try {
      value = Reflect.apply(fn, self, args);
    } catch (error) {
      threw = true;
      cause = error;
    }
    let returned;
    safe(() => {
      returned = stamp();
      const bin = binFor(name);
      bin.returned++;
      if (pending.has(id)) pending.get(id).returnNs = returned.toString();
      if (start !== undefined) {
        const duration = returned - start;
        add(bin, "syncNs", duration);
        if (bin.maximum === null || duration > BigInt(bin.maximum.durationNs)) {
          bin.maximum = {
            startNs: start.toString(),
            returnNs: returned.toString(),
            durationNs: duration.toString(),
          };
        }
      }
    });
    if (!threw && value instanceof Promise) {
      safe(() => {
        // Observe, never replace or await ahead of the original caller.
        Promise.prototype.then.call(
          value,
          (result) => {
            safe(() => {
              const bin = binFor(name);
              bin.settled++;
              if (returned !== undefined) {
                const settled = stamp(),
                  duration = settled - returned;
                add(bin, "dispatchNs", duration);
                if (
                  bin.maximumDispatch === null ||
                  duration > BigInt(bin.maximumDispatch.durationNs)
                ) {
                  bin.maximumDispatch = {
                    startNs: start?.toString() ?? null,
                    returnNs: returned.toString(),
                    settledNs: settled.toString(),
                    durationNs: duration.toString(),
                  };
                }
              }
              pending.delete(id);
              onValue?.(result);
            });
          },
          () => {
            safe(() => {
              binFor(name).settled++;
              binFor(name).rejected++;
              pending.delete(id);
            });
          },
        );
      });
    } else
      safe(() => {
        pending.delete(id);
        if (!threw) onValue?.(value);
      });
    if (threw) throw cause;
    return value;
  };
  const wrap = (target, name, label, onValue) => {
    const own = Object.getOwnPropertyDescriptor(target, name);
    const original = target[name];
    if (typeof original !== "function") throw new TypeError(`attribution method ${name}`);
    const wrapped = function (...args) {
      return measure(label, original, this, args, onValue);
    };
    Object.defineProperty(target, name, { configurable: true, writable: true, value: wrapped });
    restores.push(() => {
      if (own) Object.defineProperty(target, name, own);
      else delete target[name];
    });
  };
  const file = (raw) => {
    if (raw === null || typeof raw !== "object" || hookedFiles.has(raw)) return;
    hookedFiles.add(raw);
    for (const name of ["stat", "read", "write", "sync", "close"]) wrap(raw, name, `fd.${name}`);
  };
  const instrumentFs = (fs) => {
    for (const name of Object.keys(fs))
      wrap(fs, name, `fs.${name}`, name === "open" ? file : undefined);
  };
  const wire = (child, meta) => {
    if (
      typeof meta.retainDiagnostic !== "function" ||
      !(meta.physicalSettlement instanceof Promise)
    ) {
      throw new TypeError("attribution genuine diagnostic/physical bindings");
    }
    if (retain !== null && retain !== meta.retainDiagnostic)
      throw new Error("attribution accountant changed");
    retain = meta.retainDiagnostic;
    const local = [];
    const replace = (target, name, factory) => {
      const own = Object.getOwnPropertyDescriptor(target, name),
        original = target[name];
      Object.defineProperty(target, name, {
        configurable: true,
        writable: true,
        value: factory(original),
      });
      local.push(() => {
        if (own) Object.defineProperty(target, name, own);
        else delete target[name];
      });
    };
    if (meta.kind === "collector") {
      replace(
        child.stdin,
        "write",
        (original) =>
          function (...args) {
            const id = sequence++;
            safe(() => {
              const at = stamp();
              flush("stdin.write", at);
              let tag = null;
              try {
                const frame = JSON.parse(args[0].toString());
                tag = { type: frame.type, requestId: frame.requestId ?? null, seq: frame.seq };
              } catch {}
              record("write-enter", { id, bytes: args[0]?.length ?? null, tag }, at);
            });
            let value;
            try {
              value = Reflect.apply(original, this, args);
            } catch (error) {
              safe(() => record("write-throw", { id }, stamp()));
              throw error;
            }
            safe(() => record("write-return", { id, accepted: value }, stamp()));
            return value;
          },
      );
      // Do not wrap .on/.once or listeners. Original identity/order/removal and
      // EventEmitter's return/throw remain exact. This is callback DISPATCH time.
      replace(
        child.stdout,
        "emit",
        (original) =>
          function (...args) {
            if (args[0] === "data")
              safe(() => {
                const at = stamp();
                flush("stdout.data", at);
                record("stdout-dispatch", { bytes: args[1]?.length ?? null }, at);
              });
            let value;
            try {
              value = Reflect.apply(original, this, args);
            } catch (error) {
              if (args[0] === "data") safe(() => record("stdout-throw", {}, stamp()));
              throw error;
            }
            if (args[0] === "data") safe(() => record("stdout-return", {}, stamp()));
            return value;
          },
      );
    }
    // Borrow the actual existing exit+BOTHpipe receipt. No logical flags.
    meta.physicalSettlement.then(() => {
      safe(() => {
        for (const restore of local.reverse()) restore();
      });
    }, faults);
  };
  const restoreAfter = (physical) =>
    Promise.prototype.then.call(physical, () => {
      safe(() => {
        flush("settled");
        for (const restore of restores.reverse()) restore();
      });
    });
  const result = () => ({
    failed,
    first,
    lateEffects,
    firstLate,
    lastLate,
    remainingBins: bins.size,
    pendingCalls: pending.size,
  });
  return Object.freeze({ observeChild: wire, instrumentFs, flush, restoreAfter, result });
}
