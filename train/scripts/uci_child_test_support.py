#!/usr/bin/env python3
"""Test-only child-interpreter support for test_engine_uci.py.

Owns the temporary sitecustomize identity hook, the pinned project-venv child
environment, python3 resolution against the actual child PATH, bounded
identity sidecar validation, the parent/child build/executable comparison,
and the help-only subprocess launcher. Never imported by production code and
excluded from functional-runtime input snapshots.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENV = (ROOT / "train" / ".venv").resolve()
VENV_BIN = VENV / "bin"
CHILD_TIMEOUT = 30
IDENTITY_LIMIT = 65536
ALLOWED_PYTHON_BASENAMES = ("python", "python3", "python3.11")

SITECUSTOMIZE = (
    "import hashlib, json, os, shutil, sys\n"
    "o = os.environ.get('TINYAZ_CHILD_IDENTITY')\n"
    "p = os.path.realpath(sys.executable)\n"
    "b = open(p, 'rb').read()\n"
    "r = {'executable': sys.executable, 'resolvedExecutable': p,\n"
    " 'executableSha256': hashlib.sha256(b).hexdigest(),\n"
    " 'prefix': sys.prefix, 'basePrefix': sys.base_prefix,\n"
    " 'version': sys.version, 'versionInfo': list(sys.version_info),\n"
    " 'python3': shutil.which('python3')}\n"
    "o and open(o, 'w').write(json.dumps(r, sort_keys=True))\n"
)


def build_child_env(identity: Path, hook_dir: Path) -> dict:
    """Child env: project venv bin first on PATH, hook dir + train/src on PYTHONPATH."""
    env = dict(os.environ)
    env["PATH"] = str(VENV_BIN) + os.pathsep + env.get("PATH", "")
    env["PYTHONPATH"] = os.pathsep.join([str(hook_dir), str(ROOT / "train" / "src")])
    env["TINYAZ_CHILD_IDENTITY"] = str(identity)
    return env


def select_python3(env: dict) -> Path:
    """Resolve python3 through env['PATH']; require the unresolved venv path."""
    selected = shutil.which("python3", path=env["PATH"])
    assert selected is not None, "python3 not found on child PATH"
    candidate = Path(selected)
    assert candidate.parent == VENV_BIN, (
        f"python3 resolved outside the project venv: {candidate}"
    )
    return candidate


def parent_identity() -> dict:
    """Identity record of the actual running interpreter (the project venv)."""
    resolved = os.path.realpath(sys.executable)
    return {
        "executable": sys.executable,
        "resolvedExecutable": resolved,
        "executableSha256": hashlib.sha256(Path(resolved).read_bytes()).hexdigest(),
        "prefix": sys.prefix,
        "basePrefix": sys.base_prefix,
        "version": sys.version,
        "versionInfo": list(sys.version_info),
        "python3": shutil.which("python3", path=str(VENV_BIN)),
    }


def validate_parent() -> dict:
    """Require the running test interpreter to be the project venv."""
    rec = parent_identity()
    assert Path(rec["prefix"]).resolve() == VENV, (
        f"parent interpreter is not the project venv: {rec['prefix']}"
    )
    return rec


def validate_child(path: Path, parent: dict) -> dict:
    """Read a bounded identity sidecar and compare it to the parent record."""
    assert path.exists(), f"child identity sidecar missing: {path}"
    assert path.stat().st_size < IDENTITY_LIMIT, "child identity sidecar unbounded"
    rec = json.loads(path.read_text())
    assert Path(rec["prefix"]).resolve() == VENV, rec
    assert Path(rec["basePrefix"]).resolve() == Path(parent["basePrefix"]).resolve(), rec
    assert rec["version"] == parent["version"], rec
    assert rec["versionInfo"] == parent["versionInfo"], rec
    assert rec["resolvedExecutable"] == parent["resolvedExecutable"], rec
    assert rec["executableSha256"] == parent["executableSha256"], rec
    exe = Path(rec["executable"])
    assert exe.parent == VENV_BIN and exe.name in ALLOWED_PYTHON_BASENAMES, rec
    py3 = Path(rec["python3"])
    assert py3.parent == VENV_BIN and py3.name == "python3", rec
    return rec


def run_help_child(argv: list[str], env: dict) -> subprocess.CompletedProcess:
    """Help-only subprocess boundary; mocked in the no-spawn check."""
    return subprocess.run(
        argv,
        capture_output=True,
        text=True,
        check=False,
        env=env,
        timeout=CHILD_TIMEOUT,
    )


def run_help(
    argv: list[str],
    label: str,
    env: dict,
    parent: dict,
    use_project_python3: bool,
) -> dict:
    """Resolve python3 against the caller-built env, launch one --help child
    with that same environment, validate its sidecar, and return bounded
    evidence for the owning test."""
    py3 = select_python3(env)
    identity = Path(env["TINYAZ_CHILD_IDENTITY"])
    full_argv = ([str(py3)] + argv) if use_project_python3 else argv
    proc = run_help_child(full_argv, env)
    assert proc.returncode == 0, (label, proc.returncode, proc.stderr[:400])
    rec = validate_child(identity, parent)
    return {
        "label": label,
        "argv": full_argv,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "identity": rec,
    }
