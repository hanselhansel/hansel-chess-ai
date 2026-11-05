// process-monitor-test-fixtures.mjs: TEST-ONLY monitor setup builders
// moved whole from processes.test.mjs — fake spawn/collector children
// bound to the REAL validator, a realpath-normalized temp record root,
// the deterministic loaded PROCESS image of the selected pinned
// launcher for the collector image and a separate
// realpathSync(process.execPath) supervisor image. No spawn,
// Native call, assertion or proof authority lives here.
import { realpathSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolvePythonProcessImage } from "./process-backend-reader.mjs";
import { createProcessMonitor } from "./processes.mjs";
import {
  PYTHON_EXECUTABLE,
  PYTHON_PREFIX,
  PYTHON_VERSION,
} from "./schema-constants.mjs";
import {
  bsdRow,
  collectorFixture,
  fakeChild,
  fakeClock,
  identity,
} from "./supervision-test-fixtures.mjs";

const CPID = 31337;
// The collector image is the deterministic loaded PROCESS image
// derived from the pinned selected launcher — not the launcher itself;
// the supervisor image is the separate Node binary — never the same file.
const PYIMG = resolvePythonProcessImage(PYTHON_EXECUTABLE);
const SUPIMG = realpathSync(process.execPath);
const LSOFIMG = realpathSync("/usr/sbin/lsof");

// The ready-frame literal: selected Python invocation/prefix/version
// bound to the frozen constants, supervisor bound to its own image.
export const monitorReadyOptions = () => ({
  supervisor: identity(process.pid),
  python: {
    executable: PYTHON_EXECUTABLE,
    prefix: PYTHON_PREFIX,
    basePrefix: PYTHON_PREFIX,
    version: PYTHON_VERSION,
  },
});

// Ready + bootstrap inspect rows binding the real supervisor/collector
// tuples to their DISTINCT pinned images. Tests mutate `script` live:
// the fixture reads each field at call time.
export const monitorBootstrapScript = () => ({
  inspected: {
    [process.pid]: {
      pid: process.pid,
      state: "live",
      process: bsdRow(process.pid, 1, process.pid, 501),
      executable: SUPIMG,
    },
    [CPID]: {
      pid: CPID,
      state: "live",
      process: bsdRow(CPID, process.pid, CPID, 501),
      executable: PYIMG,
    },
  },
});

// One monitor with a scripted collector child; helpers are real temp
// files under the record root. The mkdtemp path is realpath-normalized
// BEFORE helper paths are joined so confinement compares the canonical
// /private/var form. spawnImpl distinguishes the collector argv from
// the exec-gated lsof wrapper; created wrappers are kept and every
// collector spawn attempt is counted in `spawns`. `collectorChild`
// substitutes a deliberate fake child for failed-spawn lifetime cases.
// An optional trusted `lifetime` forwards the EXACT SAME referenced
// owner to the real createProcessMonitor constructor (the frozen
// isolated unproven-debt leaf exception); omitted keeps the existing
// default mint.
export const createMonitorFixture = ({
  script = {},
  wrapper,
  collectorChild = null,
  getDeadlineMonoMs = null,
  lifetime = undefined,
} = {}) => {
  const clock = fakeClock();
  const fixture = collectorFixture({ runId: "R1", pid: CPID, script });
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "mon-")));
  for (const n of [
    "process-macos.py",
    "process-macos-native.py",
    "process-macos-abi.py",
  ]) {
    writeFileSync(path.join(dir, n), "# helper\n");
  }
  const wrappers = [];
  const spawns = [];
  const spawnImpl = (file, args) => {
    if (args.includes("--exec-gated")) {
      const w = wrapper
        ? wrapper(wrappers.length)
        : fakeChild({ pid: 7000 + wrappers.length });
      wrappers.push(w);
      return w;
    }
    spawns.push(file);
    return collectorChild ?? fixture.child;
  };
  const monitor = createProcessMonitor({
    runId: "R1",
    pythonExecutable: PYTHON_EXECUTABLE,
    helperPath: path.join(dir, "process-macos.py"),
    protocol: fixture.protocol,
    clock,
    spawnImpl,
    recordRoot: dir,
    lifetime,
  });
  return {
    clock,
    fixture,
    monitor,
    dir,
    wrappers,
    spawns,
    getDeadlineMonoMs,
    collectorPid: CPID,
    images: { python: PYIMG, supervisor: SUPIMG, lsof: LSOFIMG },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

// Startup: emit the ready frame and let one readiness poll observe it.
export const startMonitorFixture = async ({ clock, fixture, monitor, getDeadlineMonoMs }) => {
  const p = monitor.start(
    getDeadlineMonoMs === null
      ? undefined
      : { deadlineMonoMs: getDeadlineMonoMs() },
  );
  fixture.ready(monitorReadyOptions());
  clock.advance(10);
  await p;
};
