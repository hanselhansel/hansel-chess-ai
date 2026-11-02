#!/usr/bin/env python3
"""DEFERRED real-S climb regressions. Excluded from every required C2b gate.

These are the original operational real-compute cases retained unchanged from
test_climb_loop.py: an eight-game identical-S snapshot match and a one-game
real self-play generated-policy legality check. They load the real tinyaz-s
checkpoint and play actual games. They are deferred outside the no-generation
milestone scope: not run, not passed, and never equivalent to the controlled
replacements in test_climb_loop.py. Running this script requires a separately
approved real-compute budget. Do not import it from the required dispatcher.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"


def test_identical_nets_snapshot_score_is_half() -> None:
    from tinyaz.rate import vs_snapshot

    result = vs_snapshot(WEIGHTS, WEIGHTS, games=8, visits=1)
    assert result["games"] == 8
    assert result["visits"] == 1
    assert abs(result["score"] - 0.5) < 1e-9, result


def test_generate_pi_indices_are_legal() -> None:
    from tinyaz.generate import generate

    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "sp.jsonl"
        rows = generate(WEIGHTS, games=1, visits=1, workers=1, out_jsonl=out)
        assert rows, "expected at least one position"
        assert out.exists()
        for row in rows:
            board = chess.Board(row["fen"])
            legal: set[int] = set()
            flip = board.turn == chess.BLACK
            for mv in board.legal_moves:
                frm, plane = move_index(mv, flip)
                if plane >= 0:
                    legal.add(plane * 64 + frm)
            for idx, _p in row["pi"]:
                assert int(idx) in legal, f"illegal pi index {idx} in {row['fen']}"


def main() -> None:
    tests = [
        test_identical_nets_snapshot_score_is_half,
        test_generate_pi_indices_are_legal,
    ]
    failed = 0
    for fn in tests:
        try:
            fn()
            print("ok", fn.__name__)
        except Exception as e:
            failed += 1
            print("FAIL", fn.__name__, type(e).__name__, e)
    if failed:
        raise SystemExit(1)
    print("real-S regression tests ok")


if __name__ == "__main__":
    main()
