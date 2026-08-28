"""Atomic promote to public/weights. VOID is a no-op on public bytes."""

from __future__ import annotations

import json
import os
from pathlib import Path


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def _atomic_write_text(path: Path, text: str) -> None:
    _atomic_write_bytes(path, text.encode("utf-8"))


def freeze_snapshot(public_weights: Path, snapshot_path: Path) -> None:
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    _atomic_write_bytes(snapshot_path, public_weights.read_bytes())


def beats_published(candidate_score: float, published_score: float) -> bool:
    return float(candidate_score) > float(published_score)


def elo_label_from_sf(sf: dict) -> str:
    games = int(sf.get("games") or 0)
    wins = int(sf.get("wins") or 0)
    elo = int(sf.get("uciElo") or 1320)
    return f"{wins}/{games} vs {elo}"


def maybe_promote(
    keep: bool,
    candidate: Path,
    public_weights: Path,
    meta: dict,
    meta_paths: list[Path],
) -> bool:
    if not keep:
        return False
    _atomic_write_bytes(public_weights, candidate.read_bytes())
    text = json.dumps(meta, indent=2) + "\n"
    for p in meta_paths:
        _atomic_write_text(p, text)
    return True
