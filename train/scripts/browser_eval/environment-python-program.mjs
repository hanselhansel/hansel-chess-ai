// The ONE shared horizon bootstrap: every Python child receives the
// ORIGINAL absolute monotonic deadline (ms) through the isolated env
// and arms a stdlib ITIMER_REAL against deadlineMonoMs/1000 minus
// time.monotonic() BEFORE any third-party import — SIGALRM's default
// disposition kills a child that outlives the borrowed horizon.
const DEADLINE_BOUND = `import os
import signal
import sys
import time


def _die(detail):
    sys.exit("SETUP_AUDIT " + str(detail))


try:
    _remaining = (
        float(os.environ["SETUP_AUDIT_DEADLINE_MONO_MS"]) / 1000.0
        - time.monotonic()
    )
except (KeyError, ValueError):
    _die("deadline")
if not _remaining > 0.0 or not _remaining < 1000000000.0:
    _die("deadline")
signal.setitimer(signal.ITIMER_REAL, _remaining)
`;

// The pip runner rewrites argv and delegates to the genuine pip module
// through runpy — equivalent to `-m pip` — inside the SAME armed
// horizon so pip children are bound exactly like the audit child.
export const PIP_RUNNER = `${DEADLINE_BOUND}import runpy

sys.argv = ["pip"] + sys.argv[1:]
runpy.run_module("pip", run_name="__main__")
`;

// The bounded inline environment audit. It prints ONE canonical-JSON
// report (compact, sorted keys, UTF-8, one LF) holding the raw sys
// metadata, the pip version, every installed distribution's build
// digest plus RECORD descriptor, the four imports' measured facts and
// the honest torch-wheel correspondence summary — never the multi-MiB
// member inventory and never an environment/secret dump.
export const AUDIT_SCRIPT = `import base64
import csv
import hashlib
import importlib
import importlib.metadata
import importlib.util
import io
import json
import platform
import re
import stat
import zipfile

${DEADLINE_BOUND}
prefix_real = os.path.realpath(sys.prefix)
wheel_path = os.environ.get("SETUP_AUDIT_TORCH_WHEEL", "")
required_modules = ["chess", "numpy", "torch", "zstandard"]


def canon(value):
    return (
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
        ).encode("utf-8")
        + b"\\n"
    )


def file_digest(target):
    digest = hashlib.sha256()
    with open(target, "rb") as handle:
        while True:
            chunk = handle.read(1048576)
            if not chunk:
                break
            digest.update(chunk)
    return digest


def norm_name(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def record_want(spec):
    algo, sep, encoded = spec.partition("=")
    if sep != "=" or algo != "sha256" or not encoded:
        _die("record hash")
    try:
        return base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    except Exception:
        _die("record hash")


def regular_inside(literal, what):
    if not isinstance(literal, str) or not literal.startswith("/"):
        _die(what + " path")
    real = os.path.realpath(literal)
    if not real.startswith(prefix_real + os.sep):
        _die(what + " escape")
    if not stat.S_ISREG(os.lstat(literal).st_mode):
        _die(what + " file")
    return real


def audit_distribution(dist):
    meta_name = dist.metadata["Name"]
    if not isinstance(meta_name, str) or not meta_name:
        _die("distribution name")
    name = norm_name(meta_name)
    if name == "tinyaz":
        _die("shadow tinyaz")
    version = dist.version
    if not isinstance(version, str) or not version:
        _die("distribution version")
    matches = []
    if dist.files is not None:
        for entry in dist.files:
            rel = str(entry)
            parts = rel.split("/")
            if len(parts) != 2 or parts[1] != "RECORD":
                continue
            if not parts[0].endswith(".dist-info"):
                continue
            stem = parts[0][:-len(".dist-info")]
            own_name, sep, own_version = stem.rpartition("-")
            if (sep and norm_name(own_name) == name
                    and own_version == version.replace("-", "_")):
                matches.append(rel)
    if len(matches) != 1:
        _die("distribution record " + name)
    record_path = str(dist.locate_file(matches[0]))
    record_real = regular_inside(record_path, "record")
    with open(record_real, "rb") as handle:
        record_bytes = handle.read()
    try:
        record_text = record_bytes.decode("utf-8")
    except UnicodeDecodeError:
        _die("record utf8")
    site_root = os.path.realpath(str(dist.locate_file("")))
    entries = []
    rows = []
    seen = set()
    for row in csv.reader(io.StringIO(record_text)):
        if len(row) != 3:
            _die("record row")
        rel, hashspec, sizespec = row
        if not rel or rel.startswith("/") or "\\\\" in rel or "\\x00" in rel:
            _die("record path")
        literal = os.path.join(site_root, rel)
        real = regular_inside(literal, "record entry")
        size = os.lstat(literal).st_size
        digest = file_digest(real)
        if hashspec:
            if record_want(hashspec) != digest.digest():
                _die("record mismatch " + rel)
            if sizespec:
                try:
                    declared = int(sizespec)
                except ValueError:
                    _die("record size")
                if declared != size:
                    _die("record size " + rel)
        rows.append((rel, hashspec, size, digest.hexdigest()))
        venv_rel = os.path.relpath(real, prefix_real).replace(os.sep, "/")
        if venv_rel in seen:
            _die("record duplicate")
        seen.add(venv_rel)
        entries.append(
            {"byteLength": size, "path": venv_rel, "sha256": digest.hexdigest()}
        )
    entries.sort(key=lambda item: item["path"])
    return {
        "buildSha256": hashlib.sha256(canon(entries)).hexdigest(),
        "name": name,
        "recordByteLength": len(record_bytes),
        "recordPath": record_path,
        "recordRel": matches[0],
        "recordSha256": hashlib.sha256(record_bytes).hexdigest(),
        "rows": rows,
        "version": version,
    }


def verify_torch_wheel(audited):
    if not wheel_path.startswith("/"):
        _die("torch wheel path")
    wheel_stat = os.lstat(wheel_path)
    if not stat.S_ISREG(wheel_stat.st_mode):
        _die("torch wheel file")
    wheel_sha = file_digest(wheel_path).hexdigest()
    try:
        archive = zipfile.ZipFile(wheel_path)
    except Exception:
        _die("torch wheel zip")
    member_hash = {}
    with archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            # A repeated file-member name can never fold silently —
            # the archive is corrupt and fails closed before hashing.
            if info.filename in member_hash:
                _die("torch wheel duplicate")
            digest = hashlib.sha256()
            with archive.open(info) as member:
                while True:
                    chunk = member.read(1048576)
                    if not chunk:
                        break
                    digest.update(chunk)
            member_hash[info.filename] = digest.hexdigest()
    record_names = set(rel for rel, _, _, _ in audited["rows"])
    record_rel = audited["recordRel"]
    unmapped = sorted(name for name in member_hash if name not in record_names)
    mismatch = []
    generated = []
    install_only = []
    matched_hashed = 0
    matched_bytes = 0
    # Every ordinary archive file member is compared byte-for-byte
    # against the row's preserved ACTUAL installed digest — never the
    # declared hash alone — so a cleared RECORD hash field cannot skip
    # the comparison. A hashed row with no real member is honestly
    # reported as an install-side generated artifact (entry-point
    # console stubs, INSTALLER, REQUESTED) — already verified against
    # its declared hash in the RECORD walk, never a blessed mismatch.
    # Unhashed rows stay the install-only set (the regenerated RECORD,
    # .pyc, direct_url family); the ONE allowed install-side
    # divergence is the exact known regenerated dist-info/RECORD
    # member the installer rewrites. A wheel file member with no
    # RECORD row is unmapped and fails; every other member divergence
    # fails closed.
    for rel, hashspec, size, installed_hex in audited["rows"]:
        member = member_hash.get(rel)
        if member is None:
            if hashspec:
                generated.append(rel)
            else:
                install_only.append(rel)
        elif member != installed_hex:
            if rel == record_rel and not hashspec:
                install_only.append(rel)
            else:
                mismatch.append(rel)
        elif hashspec:
            matched_hashed += 1
            matched_bytes += size
        else:
            install_only.append(rel)
    if mismatch:
        _die("torch wheel mismatch " + ",".join(mismatch[:8]))
    if unmapped:
        _die("torch wheel unmapped " + ",".join(unmapped[:8]))
    return {
        "byteLength": wheel_stat.st_size,
        "generated": sorted(generated),
        "installOnly": sorted(install_only),
        "matchedBytes": matched_bytes,
        "matchedHashed": matched_hashed,
        "path": wheel_path,
        "recordRows": len(audited["rows"]),
        "sha256": wheel_sha,
    }


def main():
    if importlib.util.find_spec("tinyaz") is not None:
        _die("shadow tinyaz")
    distributions = []
    torch_wheel = None
    for dist in importlib.metadata.distributions():
        audited = audit_distribution(dist)
        wheel_sha = None
        if audited["name"] == "torch":
            torch_wheel = verify_torch_wheel(audited)
            wheel_sha = torch_wheel["sha256"]
        distributions.append(
            {
                "buildSha256": audited["buildSha256"],
                "name": audited["name"],
                "recordByteLength": audited["recordByteLength"],
                "recordPath": audited["recordPath"],
                "recordSha256": audited["recordSha256"],
                "version": audited["version"],
                "wheelSha256": wheel_sha,
            }
        )
    distributions.sort(key=lambda item: item["name"])
    names = [item["name"] for item in distributions]
    if len(set(names)) != len(names):
        _die("distribution names")
    if torch_wheel is None:
        _die("torch distribution")
    imports = []
    for module in required_modules:
        if importlib.util.find_spec(module) is None:
            _die("import spec " + module)
        loaded = importlib.import_module(module)
        version = getattr(loaded, "__version__", None)
        if not isinstance(version, str) or not version:
            _die("import version " + module)
        origin = regular_inside(
            getattr(loaded, "__file__", None), "import " + module
        )
        imports.append(
            {
                "module": module,
                "origin": origin,
                "sourceSha256": file_digest(origin).hexdigest(),
                "version": version,
            }
        )
    report = {
        "distributions": distributions,
        "imports": imports,
        "metadata": {
            "basePrefix": sys.base_prefix,
            "executable": sys.executable,
            "prefix": sys.prefix,
            "version": platform.python_version(),
        },
        "pipVersion": importlib.metadata.version("pip"),
        "torchWheel": torch_wheel,
    }
    sys.stdout.buffer.write(canon(report))


main()
`;
