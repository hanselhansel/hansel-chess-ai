// process-backend-test-fixtures.mjs (TEST-ONLY): the shared fake
// backend setup fixture leaf extracted whole from
// process-backend-setup.test.mjs under C4b-12 — the frozen selected
// interpreter constants, the Homebrew-style canonical-launcher layout,
// the ready-shaped python fact builder, the direct-image pyvenv.cfg
// text and the complete fake filesystem/adapter set the setup suite
// shares. Every platform fact is a fake, explicitly isolated and never
// availability evidence: the ready() builder deliberately models
// verified-ready facts only so the static and monitor captures compare
// equal — it attests nothing about real readiness. No IO, realpath or
// environment work runs at import.
import {
  PYTHON_EXECUTABLE,
  PYTHON_PREFIX,
  PYTHON_VERSION,
} from "./schema-constants.mjs";
import { fakeFile as file } from "./supervision-test-fixtures.mjs";

const PY = PYTHON_EXECUTABLE; // the frozen selected interpreter
const ROOT = "/record";
const PLIST = "/System/Library/CoreServices/SystemVersion.plist";
const CFG = `${PYTHON_PREFIX}/pyvenv.cfg`;

// The Homebrew-style layout the tests share: the venv invocation and
// the base interpreter's home/python3.11 both resolve to the SAME
// canonical launcher, whose parent-parent is the real basePrefix.
const HOME = "/opt/py311/bin";
const LAUNCH = `${HOME}/python3.11`;
const BASE = "/opt/py311";
const resolveLaunch = (p) => (p === PY || p === LAUNCH ? LAUNCH : p);

const ready = () => ({
  platform: "darwin",
  arch: "arm64",
  abi: { bsdInfoSize: 136, taskInfoSize: 96 },
  python: {
    executable: PYTHON_EXECUTABLE,
    prefix: PYTHON_PREFIX,
    basePrefix: BASE,
    version: PYTHON_VERSION,
  },
});

const HELPERS = [
  `${ROOT}/process-macos.py`,
  `${ROOT}/process-macos-native.py`,
  `${ROOT}/process-macos-abi.py`,
];

// The direct-image config: the recorded executable and the resolved
// home/python3.11 bind to the same canonical launcher, and the
// command is the bound `<homePy> -m venv <prefix>` literal.
const CFG_TEXT = [
  `home = ${HOME}`,
  "include-system-site-packages = false",
  `version = ${PYTHON_VERSION}`,
  `executable = ${LAUNCH}`,
  `command = ${LAUNCH} -m venv ${PYTHON_PREFIX}`,
  "",
].join("\n");

const fullFs = () => ({
  [PLIST]: file(
    "<plist><key>ProductBuildVersion</key><string>25A123</string></plist>",
  ),
  [CFG]: file(CFG_TEXT),
  [LAUNCH]: file("python-bytes"),
  [HELPERS[0]]: file("entry"),
  [HELPERS[1]]: file("core"),
  [HELPERS[2]]: file("abi"),
  "/usr/lib/libproc.dylib": file("libproc-bytes"),
  "/usr/sbin/lsof": file("lsof-bytes"),
});

const adapters = (fs, extra = {}) => ({
  pythonExecutable: PY,
  helperPaths: HELPERS,
  recordRoot: ROOT,
  statFile: fs.statFile,
  createStream: fs.createStream,
  resolvePath: resolveLaunch,
  osRelease: () => "25.6.0",
  osVersion: () => "Darwin 25.6.0",
  // Explicit trusted host fakes keep the isolated units portable;
  // they are never availability evidence.
  osPlatform: () => "darwin",
  osArch: () => "arm64",
  ...extra,
});

export const BACKEND_SETUP = Object.freeze({PY,ROOT,PLIST,CFG,HOME,LAUNCH,BASE,HELPERS,CFG_TEXT});
export const backendSetupReady = ready;
export const backendSetupFiles = fullFs;
export const backendSetupAdapters = adapters;
