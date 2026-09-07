#!/usr/bin/env python3
"""UCI entry for hansel-chess-ai. PYTHONPATH=train/src python3 train/scripts/tinyaz_uci.py"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.engine_uci import TinyazUci, default_weights, run_stdio  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="hansel-chess-ai UCI engine (64-visit tinyaz-m)")
    p.add_argument("--weights", type=Path, default=None, help="packed .bin checkpoint")
    p.add_argument("--visits", type=int, default=PLAY_VISITS)
    p.add_argument("--device", default="cpu", help="cpu (default) or mps")
    args = p.parse_args()
    weights = args.weights or default_weights()
    run_stdio(TinyazUci(weights=weights, visits=args.visits, device=args.device))


if __name__ == "__main__":
    main()
