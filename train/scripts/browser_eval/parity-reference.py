"""Private registered reference child. Stdlib admission precedes ML imports."""
from __future__ import annotations

import argparse
import hashlib
import importlib
import importlib.abc
import json
import math
import os
from pathlib import Path
import stat
import sys
import tempfile

MODULES = ("__init__", "constants", "encode", "model", "pack", "policy")
MODEL_SHA = "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee"
MODEL_SIZE = 9706840


def fail(detail):
    raise ValueError("REFERENCE_INVALID " + detail)


def unique_object(items):
    value = {}
    for key, item in items:
        if key in value:
            fail("duplicate JSON key")
        value[key] = item
    return value


def parse_json(raw):
    return json.loads(raw, object_pairs_hook=unique_object,
                      parse_constant=lambda value: fail("nonfinite JSON"))


def read_regular(filename, cap, readonly=False):
    filename = Path(filename)
    before = filename.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_size > cap:
        fail("regular bounded file " + str(filename))
    if readonly and before.st_mode & 0o222:
        fail("frozen file writable")
    fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        chunks = []
        size = 0
        while True:
            chunk = os.read(fd, min(65536, cap + 1 - size))
            if not chunk:
                break
            chunks.append(chunk)
            size += len(chunk)
            if size > cap:
                fail("file grew beyond cap")
        after = os.fstat(fd)
    finally:
        os.close(fd)
    key = lambda value: (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns)
    if key(before) != key(opened) or key(opened) != key(after) or size != before.st_size:
        fail("file changed while reading")
    return b"".join(chunks)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def announce_entry(fd, manifest, manifest_raw):
    # DATA only. Parent still requires fresh strict Native root proof + ACK.
    if fd != 3:
        fail("private entry FD")
    raw = (json.dumps({"type": "reference-entry", "runId": manifest["runId"],
                       "pid": os.getpid(), "manifestSha256": sha(manifest_raw)},
                      separators=(",", ":")) + "\n").encode("utf-8")
    if len(raw) > 4096:
        fail("entry byte ceiling")
    while raw:
        written = os.write(fd, raw)
        if written <= 0:
            fail("entry write")
        raw = raw[written:]


def admit_gate(fd, manifest, manifest_raw):
    if fd != 3:
        fail("private gate FD")
    raw = bytearray()
    try:
        while not raw.endswith(b"\n"):
            chunk = os.read(fd, 4097 - len(raw))
            if not chunk:
                fail("gate EOF")
            raw.extend(chunk)
            if len(raw) > 4096:
                fail("gate byte ceiling")
    finally:
        os.close(fd)
    value = parse_json(raw)
    expected = {"type": "reference-go", "runId": manifest["runId"],
                "pid": os.getpid(), "manifestSha256": sha(manifest_raw), "imports": value.get("imports")}
    if value != expected:
        fail("run-bound registration gate")
    imports = value["imports"]
    pins = [("chess", "1.11.2"), ("numpy", "2.3.5"), ("torch", "2.10.0"), ("zstandard", "0.25.0")]
    if not isinstance(imports, list) or len(imports) != len(pins):
        fail("gated installed import inventory")
    for item, (name, version) in zip(imports, pins):
        if set(item) != {"module", "origin", "version", "sourceSha256"} or item["module"] != name or item["version"] != version:
            fail("gated installed import fields")
        if not Path(item["origin"]).is_absolute() or not isinstance(item["sourceSha256"], str) or len(item["sourceSha256"]) != 64:
            fail("gated installed import facts")
    return imports


def frozen_modules(root, manifest):
    refs = manifest["inputs"]["candidate"]["files"]
    expected = {}
    for leaf in MODULES:
        original = "train/src/tinyaz/" + leaf + ".py"
        matches = [item for item in refs if item["path"] == "inputs/candidate/" + original]
        if len(matches) != 1:
            fail("six-module inventory")
        filename = root / "tinyaz" / (leaf + ".py")
        if filename.resolve() != filename:
            fail("module symlink")
        raw = read_regular(filename, 1048576, True)
        ref = matches[0]
        if len(raw) != ref["byteLength"] or sha(raw) != ref["sha256"]:
            fail("module bytes " + leaf)
        expected["tinyaz" if leaf == "__init__" else "tinyaz." + leaf] = {
            "path": str(filename), "byteLength": len(raw), "sha256": sha(raw)}
    return expected


class FrozenTinyazFinder(importlib.abc.MetaPathFinder):
    def __init__(self, expected):
        self.expected = expected

    def find_spec(self, fullname, path=None, target=None):
        if fullname == "tinyaz" or fullname.startswith("tinyaz."):
            if fullname not in self.expected:
                fail("extra tinyaz import " + fullname)
        return None


def check_loaded(expected):
    actual = {}
    for name, module in list(sys.modules.items()):
        if name == "tinyaz" or name.startswith("tinyaz."):
            if name not in expected:
                fail("extra loaded tinyaz module")
            origin = Path(module.__file__).resolve()
            ref = expected[name]
            if str(origin) != ref["path"]:
                fail("module origin")
            raw = read_regular(origin, 1048576, True)
            if len(raw) != ref["byteLength"] or sha(raw) != ref["sha256"]:
                fail("loaded module changed")
            actual[name] = {**ref, "origin": str(origin)}
    if set(actual) != set(expected):
        fail("incomplete loaded module set")
    return actual


def compare_vector(browser, reference, size):
    if not isinstance(browser, list) or len(browser) != size or len(reference) != size:
        fail("numeric shape")
    failed = []
    maximum = 0.0
    for index, (left, right) in enumerate(zip(browser, reference)):
        if isinstance(left, bool) or not isinstance(left, (float, int)):
            fail("numeric primitive")
        if not math.isfinite(left) or not math.isfinite(right):
            fail("nonfinite numeric")
        error = abs(left - right)
        maximum = max(maximum, error)
        if error > 1e-4 + 1e-4 * abs(right):
            failed.append(index)
    return {"maximumAbsoluteError": maximum, "failingIndices": failed}


def installed_imports(expected):
    observed = []
    for item in expected:
        module = importlib.import_module(item["module"])
        origin = Path(module.__file__).resolve()
        raw = read_regular(origin, 1048576)
        actual = {"module": item["module"], "origin": str(origin),
                  "version": getattr(module, "__version__", None), "sourceSha256": sha(raw)}
        if actual != item:
            fail("installed import origin/build " + item["module"])
        observed.append(actual)
    return observed


def evaluate_case(case, browser, model, chess, torch, encode, policy):
    if browser["id"] != case["id"] or browser["movesUci"] != case["movesUci"]:
        fail("case binding")
    board = chess.Board(case["initialFen"])
    for uci in case["movesUci"]:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            fail("illegal recorded prefix")
        board.push(move)
    raw_ep = None if board.ep_square is None else chess.square_name(board.ep_square)
    if raw_ep != case["expectedRawEpTarget"] or browser["rawEpTarget"] != raw_ep:
        fail("raw EP target")
    if browser["fen"] != board.fen(en_passant="legal"):
        fail("current FEN")
    planes = encode.encode_board(board)
    tensor = torch.from_numpy(planes.reshape(1, 19, 8, 8))
    if tensor.dtype != torch.float32 or tensor.device.type != "cpu":
        fail("CPU float32 input")
    logits, value = model(tensor)
    plane_result = compare_vector(browser["planes"], planes.tolist(), 1216)
    logit_result = compare_vector(browser["logits"], logits.flatten().tolist(), 4672)
    value_result = compare_vector([browser["value"]], [value.item()], 1)
    legal = {move.uci(): policy.policy_target_index(move.uci()[:2], move.uci()[2:4],
             move.uci()[4:] or None, board.turn == chess.BLACK) for move in board.legal_moves}
    if len(browser["legalUci"]) != len(browser["legalIndices"]):
        fail("legal mapping shape")
    observed = dict(zip(browser["legalUci"], browser["legalIndices"]))
    if len(observed) != len(browser["legalUci"]) or observed != legal:
        fail("legal UCI/index mapping")
    return {"id": case["id"], "planes": plane_result, "logits": logit_result,
            "value": value_result, "legalMoveCount": len(legal), "rawEpTarget": raw_ep}


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-child", action="store_true", required=True)
    parser.add_argument("--gate-fd", type=int, required=True)
    parser.add_argument("--reference-root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--browser-results", type=Path, required=True)
    args = parser.parse_args(argv)
    manifest_path = args.manifest.absolute()
    workspace = manifest_path.parent.parent
    if manifest_path != workspace / "parity/manifest.json":
        fail("parity manifest path")
    root = args.reference_root.absolute()
    if root != workspace / "inputs/candidate/train/src" or root.resolve() != root:
        fail("reference root")
    if Path(__file__).resolve() != workspace / "inputs/harness/train/scripts/browser_eval/parity-reference.py":
        fail("archived child entry")
    manifest_raw = read_regular(manifest_path, 1048576)
    manifest = parse_json(manifest_raw)
    if manifest["phase"] != "parity":
        fail("manifest phase")
    if "torch" in sys.modules or any(name == "tinyaz" or name.startswith("tinyaz.") for name in sys.modules):
        fail("ML present before private gate")
    announce_entry(args.gate_fd, manifest, manifest_raw)
    expected_imports = admit_gate(args.gate_fd, manifest, manifest_raw)
    scratch = workspace / "parity/tmp"
    if scratch.resolve() != scratch or not scratch.is_dir():
        fail("owned scratch root")
    for name in ("TMPDIR", "TMP", "TEMP", "HOME", "XDG_CACHE_HOME", "TORCH_HOME"):
        if os.environ.get(name) != str(scratch):
            fail("workspace scratch environment")
    if Path(tempfile.gettempdir()).resolve() != scratch:
        fail("actual tempfile root")
    expected = frozen_modules(root, manifest)
    sys.meta_path.insert(0, FrozenTinyazFinder(expected))
    sys.path.insert(0, str(root))
    # No ML import or model loading occurs before the private gate above.
    installed_before = installed_imports(expected_imports)
    import chess
    import torch
    from tinyaz import encode, pack, policy
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    if torch.get_num_threads() != 1 or torch.get_num_interop_threads() != 1:
        fail("reference threads")
    model_path = workspace / "inputs/model/tinyaz-m.bin"
    raw_model = read_regular(model_path, MODEL_SIZE, True)
    if len(raw_model) != MODEL_SIZE or sha(raw_model) != MODEL_SHA:
        fail("actual M")
    model, source = pack.load_model(model_path)
    model = model.cpu().float().eval()
    if source != 1 or model.channels != 128 or sum(p.numel() for p in model.parameters()) != 2426706:
        fail("loaded M shape")
    before = check_loaded(expected)
    fixture_path = workspace / "inputs/harness/train/fixtures/browser-parity.json"
    cases = parse_json(read_regular(fixture_path, 1048576, True))["cases"]
    if len(cases) != 13 or len({case["id"] for case in cases}) != 13:
        fail("thirteen fixed cases")
    if args.browser_results.absolute() != workspace / "parity/browser-results.json":
        fail("browser results path")
    browser = parse_json(read_regular(args.browser_results, 16 * 1048576))
    if set(browser) != {"cases"} or len(browser["cases"]) != 13:
        fail("all browser cases")
    with torch.inference_mode():
        results = [evaluate_case(case, output, model, chess, torch, encode, policy)
                   for case, output in zip(cases, browser["cases"])]
    after = check_loaded(expected)
    installed_after = installed_imports(expected_imports)
    if before != after or installed_before != installed_after or frozen_modules(root, manifest) != expected:
        fail("reference import stability")
    if sha(read_regular(model_path, MODEL_SIZE, True)) != MODEL_SHA:
        fail("model changed")
    passed = all(not result[field]["failingIndices"] for result in results
                 for field in ("planes", "logits", "value"))
    report = {"runId": manifest["runId"], "passed": passed, "cases": results,
              "importsBefore": before, "importsAfter": after,
              "installedImportsBefore": installed_before, "installedImportsAfter": installed_after,
              "device": "cpu", "dtype": "float32", "inferenceMode": True,
              "intraOpThreads": 1, "interOpThreads": 1}
    print(json.dumps(report, sort_keys=True, separators=(",", ":"), allow_nan=False))
    return 0 if passed else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
