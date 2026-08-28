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
