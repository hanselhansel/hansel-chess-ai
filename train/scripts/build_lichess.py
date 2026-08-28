#!/usr/bin/env python3
"""Build human shards from every Lichess month archive in train/data. No Stockfish labels."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.data import write_human_months  # noqa: E402

DOWNLOAD = "https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst"
OUT_TRAIN = ROOT / "train/data/human/train.jsonl"
OUT_VAL = ROOT / "train/data/human/val.jsonl"


def month_of(path: Path) -> str:
    name = path.name.replace(".pgn.zst", "").replace(".pgn", "")
    return name.rsplit("_", 1)[-1]


def next_month(ym: str) -> str:
    y_s, m_s = ym.split("-")
    y, m = int(y_s), int(m_s)
    m += 1
    if m == 13:
        y += 1
        m = 1
    return f"{y:04d}-{m:02d}"


def download_url(ym: str) -> str:
    return f"https://database.lichess.org/standard/lichess_db_standard_rated_{ym}.pgn.zst"


def months_label(paths: list[Path]) -> str:
    months = [month_of(p) for p in paths]
    if not months:
        return "lichess"
    if months[0] == months[-1]:
        return f"lichess-{months[0]}"
    return f"lichess-{months[0]}..{months[-1]}"


def find_pgns(root: Path = ROOT) -> list[Path]:
    data = root / "train/data"
    found = sorted(
        p for p in data.glob("lichess_db_standard_rated_*.pgn.zst") if p.stat().st_size > 1000
    )
    if not found:
        raise SystemExit(
            f"missing Lichess month PGN. Download:\n  {DOWNLOAD}\n  to {data}/"
        )
    return found


def main() -> None:
    pgns = find_pgns()
    print(f"archives {len(pgns)}", [p.name for p in pgns], flush=True)
    stats = write_human_months(pgns, OUT_TRAIN, OUT_VAL)
    print("wrote", OUT_TRAIN, OUT_VAL, stats, flush=True)


if __name__ == "__main__":
    main()
