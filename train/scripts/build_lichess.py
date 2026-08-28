#!/usr/bin/env python3
"""Build ~1.5M-position human shards from full Lichess 2013-01. No Stockfish labels."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.data import write_human_month  # noqa: E402

DOWNLOAD = "https://database.lichess.org/standard/lichess_db_standard_rated_2013-01.pgn.zst"
CANDIDATES = (
    ROOT / "train/data/lichess_db_standard_rated_2013-01.pgn.zst",
    ROOT / "train/data/lichess_2013-01.pgn.zst",
    ROOT / "train/data/lichess_db_standard_rated_2013-01.pgn",
)
OUT_TRAIN = ROOT / "train/data/human/train.jsonl"
OUT_VAL = ROOT / "train/data/human/val.jsonl"


def find_pgn() -> Path:
    for p in CANDIDATES:
        if p.exists() and p.stat().st_size > 1000:
            return p
    raise SystemExit(f"missing Lichess 2013-01 PGN. Download:\n  {DOWNLOAD}\n  to {CANDIDATES[0]}")


def main() -> None:
    pgn = find_pgn()
    print(f"parsing {pgn} ({pgn.stat().st_size} bytes)", flush=True)
    stats = write_human_month(pgn, OUT_TRAIN, OUT_VAL)
    print("wrote", OUT_TRAIN, OUT_VAL, stats, flush=True)


if __name__ == "__main__":
    main()
