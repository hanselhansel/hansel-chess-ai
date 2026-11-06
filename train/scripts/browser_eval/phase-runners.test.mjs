// Scripted raw transports run actual phase/controller bodies. Requested
// results are unit data; no browser/Native/reference inference is performed.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";
import { runPhase } from "./phase-runners.mjs";
import { loadLegacyResultFactory, makeOperationalFixture } from "./operational-test-fixtures.mjs";
import { PYTHON_EXECUTABLE, REQUIRED_CHECK_IDS } from "./schema-constants.mjs";

const execute = promisify(execFile);

test("scripted preflight performs ten separate full-64 commands and actual rules A/A draws", async (t) => {
  const f = makeOperationalFixture(t);
  const outcome = await f.own(runPhase(f));
  assert.equal(outcome.requestedStatus, "passed");
  assert.equal(outcome.analysisEligible, false);
  assert.deepEqual(outcome.checks.map((item) => item.id), REQUIRED_CHECK_IDS.preflight.filter((id) => id !== "cleanup"));
  assert.equal(f.calls.opens.length, 7);
  assert.equal(f.calls.closes, 14);
  assert.equal(f.calls.operations.filter((item) => item.kind === "command").length, 12);
  assert.equal(f.calls.operations.filter((item) => item.kind === "readiness").length, 14);
  assert.equal(f.calls.thinks.length, 12);
  for (const role of ["candidate", "baseline"]) {
    assert.equal(outcome.summary.timings[role].samples, 5);
    assert.equal(outcome.summary.timings[role].deterministic, true);
    assert.equal(outcome.summary.timings[role].latenciesMs.length, 5);
    assert.equal(outcome.summary.timings[role].p95Ms, outcome.summary.timings[role].maximumMs);
  }
  assert.deepEqual(outcome.summary.games.map((game) => game.result), ["1/2-1/2", "1/2-1/2"]);
  assert.deepEqual(f.events.filter((event) => event.payload.ordinal === 0).map((event) => event.payload.candidateColor), ["white", "black"]);
  assert.equal(Object.hasOwn(outcome.summary, "pairedAnalysis"), false);
  assert.equal(outcome.summary.estimate.gameLength, "unknown");
  assert.equal(outcome.summary.estimate.capStopPossible, true);
});

test("phase snapshots run data before a held SDK call can mutate later game URLs", async (t) => {
  const f = makeOperationalFixture(t, { holdThink: true });
  const original = structuredClone(f.resources.servers);
  const pending = f.own(runPhase(f));
  await f.thinkEntered;
  f.resources.servers.candidate.engineUrl = "http://external.invalid/changed";
  f.resources.servers.baseline.engineUrl = "http://external.invalid/changed-baseline";
  f.resources.fixtures.protocol.preflight.freshRequestsPerArm = 0;
  f.releaseThink();
  const result = await pending;
  assert.equal(result.requestedStatus, "passed");
  assert.equal(f.calls.opens.length, 7);
  assert.equal(f.calls.opens.slice(0, 5).every((entry) => entry.candidateUrl === original.candidate.engineUrl &&
    entry.baselineUrl === original.baseline.engineUrl), true);
  assert.equal(f.calls.opens.slice(5).every((entry) => entry.candidateUrl === original.baseline.engineUrl), true);
});

test("preflight rejects absent genuine selftest data before browser or engine work", async (t) => {
  const f = makeOperationalFixture(t);
  f.resources.selftestEvidence = null;
  await assert.rejects(f.own(runPhase(f)), /genuine first-operation selftest receipt/);
  assert.equal(f.calls.opens.length, 0);
  assert.equal(f.artifacts.length, 0);
});

test("short completed visits fail without A/A games or a successful phase", async (t) => {
  const f = makeOperationalFixture(t, { fault: "visits" });
  await assert.rejects(f.own(runPhase(f)), /candidate identity\/context\/worker\/visits/);
  assert.equal(f.calls.opens.length, 1);
  assert.equal(f.calls.closes, 2);
  assert.equal(f.events.length, 0);
  assert.equal(f.artifacts.some((item) => item.filename.endsWith("throughput.json")), false);
});

test("held command followed by stop produces no late sample/checkpoint promotion", async (t) => {
  const f = makeOperationalFixture(t, { holdThink: true });
  const pending = f.own(runPhase(f));
  await f.thinkEntered;
  const before = f.artifacts.length;
  const reason = new Error("original phase stop");
  f.controller.abort(reason);
  f.releaseThink();
  await assert.rejects(pending, (error) => error === reason);
  assert.equal(f.artifacts.length, before);
  assert.equal(f.events.length, 0);
  assert.equal(f.calls.closes, 2);
});

test("compare's first actual checkpoint binds locked prefix and survives a Page fault as incomplete", async (t) => {
  const f = makeOperationalFixture(t, { phase: "compare", fault: "evaluate" });
  await assert.rejects(f.own(runPhase(f)), /scripted Page failure/);
  const checkpoint = f.events.find((event) => event.payload.recordType === "pgn-checkpoint");
  assert.equal(checkpoint.payload.gameId, "p01-g1");
  assert.equal(checkpoint.payload.candidateColor, "white");
  assert.equal(checkpoint.payload.result, "*");
  assert.equal(checkpoint.payload.plyCount, f.resources.fixtures.openings.openings[0].movesUci.length);
  assert.equal(f.events.length, 1);
  assert.equal(f.artifacts.some((item) => item.filename.endsWith("completed-games.json")), false);
  assert.equal(f.calls.closes, 2);
});

test("parity requires all thirteen frozen cases before opening any context", async (t) => {
  const f = makeOperationalFixture(t, { phase: "parity" });
  f.resources.fixtures.parity.cases.pop();
  await assert.rejects(f.own(runPhase(f)), /thirteen frozen parity cases/);
  assert.equal(f.calls.opens.length, 0);
});

const PYTHON_PURE_BRIDGE = String.raw`
import ast, hashlib, importlib.abc, json, math, os, socket, stat, sys, tempfile
from pathlib import Path
source = Path(sys.argv[1]).read_text()
selected = {"fail", "unique_object", "parse_json", "read_regular", "sha", "announce_entry", "admit_gate", "frozen_modules", "compare_vector", "FrozenTinyazFinder"}
program = ast.parse(source)
body = [node for node in program.body if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in selected]
assert {node.name for node in body} == selected
namespace = dict(globals(), MODULES=("__init__", "constants", "encode", "model", "pack", "policy"))
exec(compile(ast.Module(body=body, type_ignores=[]), str(sys.argv[1]), "exec"), namespace)
compare = namespace["compare_vector"]
for case in range(13):
    for size in (1216, 4672):
        actual = [0.0] * size
        expected = [0.0] * size
        assert compare(actual, expected, size)["failingIndices"] == []
        actual[-1] = 0.001
        result = compare(actual, expected, size)
        assert result["failingIndices"] == [size - 1]
        assert result["maximumAbsoluteError"] == 0.001
assert compare([0.0001], [0.0], 1)["failingIndices"] == []
assert compare([0.00010001], [0.0], 1)["failingIndices"] == [0]
for invalid in ([True], [float("nan")], [float("inf")], []):
    try:
        compare(invalid, [0.0], 1)
        raise AssertionError("invalid numeric accepted")
    except ValueError:
        pass
raw = b'{"phase":"parity","runId":"pure-reference-run"}\n'
manifest = {"phase":"parity", "runId":"pure-reference-run"}
left, right = socket.socketpair()
assert left.fileno() == 3
original_write = os.write
writes = []
def partial_write(fd, data):
    writes.append(fd)
    return original_write(fd, data[:7])
try:
    os.write = partial_write
    namespace["announce_entry"](left.fileno(), manifest, raw)
    entry = bytearray()
    while not entry.endswith(b"\n"):
        entry.extend(right.recv(4096 - len(entry)))
    assert len(writes) > 1 and set(writes) == {3}
    assert json.loads(entry) == {"type":"reference-entry", "runId":manifest["runId"],
        "pid":os.getpid(), "manifestSha256":hashlib.sha256(raw).hexdigest()}
    before = len(writes)
    for fd, data in [(2, manifest), (3, {"runId":"x" * 4096})]:
        try:
            namespace["announce_entry"](fd, data, raw)
            raise AssertionError("invalid entry producer admitted")
        except ValueError:
            pass
    assert len(writes) == before
    assert "torch" not in sys.modules and "tinyaz" not in sys.modules
finally:
    os.write = original_write
    left.close()
    right.close()
for valid in (True, False):
    read_fd, write_fd = os.pipe()
    assert read_fd == 3
    message = {"type":"reference-go", "runId":manifest["runId"] if valid else "wrong-run",
               "pid":os.getpid(), "manifestSha256":hashlib.sha256(raw).hexdigest(),
               "imports":[{"module":name, "version":version, "origin":"/stdlib-test/" + name + ".py", "sourceSha256":"a" * 64}
                   for name, version in [("chess","1.11.2"),("numpy","2.3.5"),("torch","2.10.0"),("zstandard","0.25.0")]]}
    os.write(write_fd, (json.dumps(message) + "\n").encode())
    os.close(write_fd)
    try:
        namespace["admit_gate"](read_fd, manifest, raw)
        assert valid
    except ValueError:
        assert not valid
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory).resolve()
    (root / "tinyaz").mkdir()
    refs = []
    for leaf in namespace["MODULES"]:
        filename = root / "tinyaz" / (leaf + ".py")
        data = ("# pure data " + leaf + "\n").encode()
        filename.write_bytes(data)
        filename.chmod(0o444)
        refs.append({"path":"inputs/candidate/train/src/tinyaz/" + leaf + ".py", "byteLength":len(data), "sha256":hashlib.sha256(data).hexdigest()})
    expected = namespace["frozen_modules"](root, {"inputs":{"candidate":{"files":refs}}})
    assert len(expected) == 6
    finder = namespace["FrozenTinyazFinder"](expected)
    try:
        finder.find_spec("tinyaz.unlisted")
        raise AssertionError("extra module admitted")
    except ValueError:
        pass
    filename = root / "tinyaz/constants.py"
    filename.chmod(0o644)
    filename.write_bytes(b"changed\n")
    filename.chmod(0o444)
    try:
        namespace["frozen_modules"](root, {"inputs":{"candidate":{"files":refs}}})
        raise AssertionError("changed module admitted")
    except ValueError:
        pass
public_tree = ast.parse(Path(sys.argv[2]).read_text())
public_names = {"fail", "preparation_now_ns", "check_deadline", "read_file"}
public_body = [node for node in public_tree.body if isinstance(node, ast.FunctionDef) and node.name in public_names]
assert {node.name for node in public_body} == public_names
from types import SimpleNamespace
public = dict(globals(), PREPARATION_END_NS=100, time=SimpleNamespace(monotonic_ns=lambda: 101, clock_gettime_ns=lambda clock: 101, CLOCK_MONOTONIC_RAW=4))
exec(compile(ast.Module(body=public_body, type_ignores=[]), sys.argv[2], "exec"), public)
try:
    public["read_file"]("/unissued-deadline-case", 1024)
    raise AssertionError("spent setup performed IO")
except ValueError as error:
    assert "setup90 deadline spent" in str(error)
with tempfile.TemporaryDirectory() as directory:
    filename = Path(directory).resolve() / "bounded.txt"
    filename.write_bytes(b"actual stdlib data")
    ticks = [0]
    opened = []
    original_open = Path.open
    def tracked_open(self, *args, **kwargs):
        handle = original_open(self, *args, **kwargs)
        opened.append(handle)
        return handle
    def after_read_clock(*args):
        ticks[0] += 1
        return 101 if ticks[0] >= 4 else 0
    public["time"] = SimpleNamespace(monotonic_ns=after_read_clock, clock_gettime_ns=after_read_clock, CLOCK_MONOTONIC_RAW=4)
    Path.open = tracked_open
    try:
        try:
            public["read_file"](filename, 1024)
            raise AssertionError("late setup read promoted")
        except ValueError as error:
            assert "setup90 deadline spent" in str(error)
    finally:
        Path.open = original_open
    assert len(opened) == 1 and opened[0].closed
assert "torch" not in sys.modules and "tinyaz" not in sys.modules
print(json.dumps({"cases":13,"planes":1216,"logits":4672,"gateCases":2,"modules":6,"mlImported":False,"setupDeadlineCases":2}))
`;

test("actual AST-selected Python validators cover all numeric indices, FD3 binding and six-module bytes", async () => {
  const { stdout, stderr } = await execute(PYTHON_EXECUTABLE, ["-I", "-B", "-c", PYTHON_PURE_BRIDGE,
    path.join(import.meta.dirname, "parity-reference.py"), path.join(import.meta.dirname, "../check_browser_parity.py")], { maxBuffer: 16384 });
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), { cases: 13, planes: 1216, logits: 4672, gateCases: 2, modules: 6, mlImported: false, setupDeadlineCases: 2 });
});

// Actual selected-Python clock measurements must transfer into Node without
// changing the original ninety-second allowance. The late Node guard alone
// uses a controlled clock; no supervisor or phase is admitted.
test("public Python preparation deadline shares Node epoch and rejects exact late transfer", async () => {
  const before = process.hrtime.bigint();
  const script = `
import ast, json, sys, time
from pathlib import Path
source = Path(sys.argv[1])
tree = ast.parse(source.read_text())
names = {"preparation_now_ns", "check_deadline", "fail"}
body = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
assert {node.name for node in body} == names
namespace = {"sys":sys, "time":time, "PREPARATION_END_NS":None}
exec(compile(ast.Module(body=body, type_ignores=[]), str(source), "exec"), namespace)
start = namespace["preparation_now_ns"]()
end = start + 90_000_000_000
namespace["PREPARATION_END_NS"] = end
namespace["check_deadline"]()
namespace["preparation_now_ns"] = lambda: end
try:
    namespace["check_deadline"]()
    raise AssertionError("exact late preparation admitted")
except ValueError as error:
    assert "setup90 deadline spent" in str(error)
assert namespace["PREPARATION_END_NS"] == end
print(json.dumps({"start":str(start),"end":str(end)}))
`;
  const { stdout, stderr } = await execute(PYTHON_EXECUTABLE, ["-I", "-B", "-c", script,
    path.join(import.meta.dirname, "../check_browser_parity.py")], { maxBuffer: 4096 });
  const after = process.hrtime.bigint();
  assert.equal(stderr, "");
  const measured = JSON.parse(stdout);
  const start = BigInt(measured.start);
  const end = BigInt(measured.end);
  assert.ok(before <= start && start <= after);
  assert.equal(end - start, 90000000000n);
  assert.ok(end > after && end - after <= 90000000000n);
  const cli = new URL("./cli.mjs", import.meta.url);
  const argv = [process.execPath, cli.pathname, "parity", "--protocol", "train/fixtures/browser-protocol.json",
    "--candidate", "WORKTREE", "--out", "/unissued-clock-transfer", "--repo-root", "/unissued-repo",
    "--archived", "--preparation-deadline-ns", measured.end];
  const late = `process.argv = ${JSON.stringify(argv)}; process.hrtime.bigint = () => ${measured.end}n; await import(${JSON.stringify(cli.href)});`;
  await assert.rejects(execute(process.execPath, ["--input-type=module", "-e", late], { maxBuffer: 4096 }),
    (error) => error.code === 1 && error.stdout === "" && /original immutable preparation deadline spent before transfer/.test(error.stderr));
});

test("actual legacy result DTO reaches full preflight signatures and A/A match validation", async (t) => {
  const baselineResultFactory = await loadLegacyResultFactory();
  const f = makeOperationalFixture(t, { baselineResultFactory });
  const outcome = await f.own(runPhase(f));
  assert.equal(outcome.requestedStatus, "passed");
  assert.equal(outcome.summary.timings.baseline.samples, 5);
  assert.equal(outcome.summary.timings.baseline.deterministic, true);
  assert.deepEqual(outcome.summary.games.map((game) => game.result), ["1/2-1/2", "1/2-1/2"]);
  const turns = f.artifacts.filter((artifact) => /move-.*json$/.test(artifact.filename))
    .map((artifact) => JSON.parse(artifact.bytes));
  assert.ok(turns.length > 0);
  const legacy = turns.filter((turn) => Object.hasOwn(turn, "baselineOptionalUndefined"));
  assert.equal(legacy.length, 7);
  for (const turn of legacy) {
    assert.deepEqual(turn.baselineOptionalUndefined, ["response.promotion", "worker.raw.result.promotion"]);
    assert.equal(Object.hasOwn(turn.response, "promotion"), false);
    assert.equal(turn.response.visits, 64);
  }
});
