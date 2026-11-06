#!/usr/bin/env python3
"""Stdlib-only bootstrap into the already captured archived parity CLI."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import runpy
import stat
import subprocess
import sys
import time


PREPARATION_END_NS = None


def preparation_now_ns():
    # On macOS Node hrtime uses the raw monotonic epoch. Python's default
    # monotonic epoch differs, so it cannot carry a deadline across exec.
    if sys.platform == "darwin":
        return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)
    return time.monotonic_ns()


def check_deadline():
    if PREPARATION_END_NS is None or preparation_now_ns() >= PREPARATION_END_NS:
        fail("original setup90 deadline spent")


def fail(detail):
    raise ValueError("PARITY_BOOTSTRAP_INVALID " + detail)


def unique(items):
    result = {}
    for key, value in items:
        if key in result:
            fail("duplicate JSON key")
        result[key] = value
    return result


def decode(raw):
    return json.loads(raw, object_pairs_hook=unique,
                      parse_constant=lambda value: fail("nonfinite JSON"))


def read_file(filename, cap, readonly=False):
    check_deadline()
    filename = Path(filename)
    if filename.resolve() != filename:
        fail("noncanonical or symlink file")
    check_deadline()
    before = filename.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_size > cap:
        fail("bounded regular file")
    if readonly and before.st_mode & 0o222:
        fail("frozen file writable")
    check_deadline()
    with filename.open("rb") as stream:
        opened = os.fstat(stream.fileno())
        raw = stream.read(cap + 1)
        after = os.fstat(stream.fileno())
    check_deadline()
    key = lambda value: (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns)
    if len(raw) != before.st_size or key(before) != key(opened) or key(opened) != key(after):
        fail("changed file")
    check_deadline()
    return raw


def check_ref(root, ref, readonly=False):
    if set(ref) != {"path", "byteLength", "sha256"}:
        fail("artifact ref shape")
    name = ref["path"]
    relative = Path(name)
    if relative.is_absolute() or relative.as_posix() != name or ".." in relative.parts:
        fail("artifact path")
    if isinstance(ref["byteLength"], bool) or not isinstance(ref["byteLength"], int) or not 0 <= ref["byteLength"] <= 266338304:
        fail("artifact byte length")
    raw = read_file(root / relative, ref["byteLength"], readonly)
    check_deadline()
    digest = hashlib.sha256(raw).hexdigest()
    check_deadline()
    if len(raw) != ref["byteLength"] or digest != ref["sha256"]:
        fail("actual artifact bytes")
    return raw


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--reference-child" in argv:
        if not sys.flags.isolated or not sys.dont_write_bytecode:
            fail("isolated no-bytecode reference invocation")
        entry = Path(__file__).resolve().parent / "browser_eval/parity-reference.py"
        runpy.run_path(str(entry), run_name="__main__")
        fail("reference child returned")
    global PREPARATION_END_NS
    preparation_start = preparation_now_ns()
    PREPARATION_END_NS = preparation_start + 90_000_000_000
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)
    check_deadline()
    repo = Path(__file__).resolve().parents[2]
    check_deadline()
    workspace = args.out
    if not workspace.is_absolute() or workspace.resolve() != workspace:
        fail("absolute canonical workspace")
    protocol_path = Path("train/fixtures/browser-protocol.json")
    if args.protocol not in (str(protocol_path), str(repo / protocol_path)):
        fail("fixed protocol")
    frozen = decode(read_file(workspace / "workspace.json", 1048576, True))
    identity = frozen["commonIdentity"]
    candidate = identity["candidate"]
    if args.candidate == "WORKTREE":
        if candidate["kind"] != "WORKTREE" or candidate["commit"] is not None:
            fail("requested WORKTREE binding")
    else:
        check_deadline()
        remaining_seconds = (PREPARATION_END_NS - preparation_now_ns()) / 1e9
        resolved = subprocess.run(["/usr/bin/git", "--no-optional-locks", "--no-replace-objects",
            "rev-parse", "--verify", "--end-of-options", args.candidate + "^{commit}"],
            cwd=repo, env={"PATH": "/usr/bin:/bin", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null"},
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=min(30, remaining_seconds), check=False)
        check_deadline()
        if resolved.returncode or resolved.stderr or len(resolved.stdout) != 41:
            fail("requested commit resolution")
        if candidate["kind"] != "commit" or candidate["commit"] != resolved.stdout.decode().strip():
            fail("requested commit binding")
    manifest = decode(read_file(workspace / "check/manifest.json", 1048576))
    if manifest["phase"] != "check" or manifest["workspaceId"] != frozen["workspaceId"]:
        fail("retained check workspace")
    # The archived supervisor independently validates the complete receipt
    # graph plus live Native parent probes. Existence here is no phase pass.
    read_file(workspace / "check/completion.json", 1048576)
    inputs = manifest["inputs"]
    refs = [*inputs["baseline"]["files"], *inputs["candidate"]["files"],
            *inputs["harness"]["files"], inputs["model"], *inputs["setup"]]
    names = [ref["path"] for ref in refs]
    if len(set(names)) != len(names):
        fail("duplicate frozen input")
    for ref in refs:
        actual = check_ref(workspace, ref, True)
        for role in ("candidate", "harness"):
            prefix = "inputs/" + role + "/"
            if ref["path"].startswith(prefix):
                original = ref["path"][len(prefix):]
                if read_file(repo / original, ref["byteLength"]) != actual:
                    fail("requested current source bytes " + original)
    expected_paths = set(names)
    observed = set()
    deps = (repo / "node_modules").resolve()
    walker = os.walk(workspace / "inputs", followlinks=False)
    while True:
        check_deadline()
        try:
            current, directories, files = next(walker)
        except StopIteration:
            break
        check_deadline()
        parent = Path(current)
        for name in list(directories):
            check_deadline()
            target = parent / name
            if target.is_symlink():
                rel = target.relative_to(workspace).as_posix()
                if rel not in {"inputs/baseline/node_modules", "inputs/candidate/node_modules", "inputs/harness/node_modules"} or target.resolve() != deps:
                    fail("readonly shared dependencies link")
                directories.remove(name)
        for name in files:
            observed.add((parent / name).relative_to(workspace).as_posix())
    check_deadline()
    if observed != expected_paths:
        fail("complete frozen path inventory")
    for role in ("baseline", "candidate", "harness"):
        link = workspace / "inputs" / role / "node_modules"
        if not link.is_symlink() or link.resolve() != deps:
            fail("missing shared dependencies link")
    if read_file(repo / protocol_path, 1048576) != read_file(workspace / "inputs/harness" / protocol_path, 1048576, True):
        fail("requested protocol bytes")
    runtime = identity["environment"]["python"]["runtime"]
    if str(Path(sys.executable)) != runtime["invocationPath"] or sys.prefix != runtime["prefix"]:
        fail("selected Python invocation/prefix")
    if sys.version.split()[0] != runtime["version"]:
        fail("selected Python version")
    node = identity["environment"]["node"]
    node_path = Path(node["realPath"])
    if hashlib.sha256(read_file(node_path, 268435456)).hexdigest() != node["sha256"]:
        fail("actual Node executable")
    cli = workspace / "inputs/harness/train/scripts/browser_eval/cli.mjs"
    launcher = workspace / "inputs/harness/train/scripts/check_browser_parity.py"
    if read_file(Path(__file__).resolve(), 1048576) != read_file(launcher, 1048576, True):
        fail("archived public wrapper bytes")
    check_deadline()
    print(json.dumps({"stage":"immutable-preparation", "elapsedMs":(preparation_now_ns() - preparation_start) / 1e6}), flush=True)
    check_deadline()
    os.execv(node["invocationPath"], [node["invocationPath"], str(cli), "parity", "--protocol", args.protocol,
        "--candidate", args.candidate, "--out", str(workspace), "--repo-root", str(repo), "--archived",
        "--preparation-deadline-ns", str(PREPARATION_END_NS)])
    fail("archived process transfer returned")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
