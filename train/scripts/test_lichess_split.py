#!/usr/bin/env python3
"""Game-level split and sampling for the human-month climb."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
from tinyaz.data import game_id, sample_rows, split_for_game  # noqa: E402
from tinyaz.policy import policy_target_index  # noqa: E402


def test_same_game_same_split() -> None:
    a = split_for_game("abcdefgh")
    b = split_for_game("abcdefgh")
    assert a == b
    assert a in ("train", "val")


def test_question_mark_id_rejected() -> None:
    try:
        split_for_game("?")
    except ValueError:
        return
    raise AssertionError("expected ValueError for '?'")


def test_lichess_site_id() -> None:
    gid = game_id({"Site": "https://lichess.org/AbCdEfGh", "White": "a", "Black": "b"})
    assert gid == "AbCdEfGh"


def test_missing_names_rejected() -> None:
    try:
        game_id({"Site": "?", "White": "?", "Black": "?"})
    except ValueError:
        return
    raise AssertionError("expected ValueError for ? headers")


def test_sample_skips_opening_and_caps() -> None:
    rows = [{"i": i} for i in range(20)]
    out = sample_rows(rows, skip_plies=8, per_game=4, seed=1)
    assert len(out) == 4
    assert all(r["i"] >= 8 for r in out)


def test_sampled_target_is_legal() -> None:
    board = chess.Board()
    move = next(iter(board.legal_moves))
    uci = move.uci()
    promo = uci[4] if len(uci) > 4 else None
    target = policy_target_index(uci[0:2], uci[2:4], promo, False)
    assert target >= 0
    legal = set()
    for mv in board.legal_moves:
        u = mv.uci()
        p = u[4] if len(u) > 4 else None
        t = policy_target_index(u[0:2], u[2:4], p, False)
        if t >= 0:
            legal.add(t)
    assert target in legal


def main() -> None:
    tests = [
        test_same_game_same_split,
        test_question_mark_id_rejected,
        test_lichess_site_id,
        test_missing_names_rejected,
        test_sample_skips_opening_and_caps,
        test_sampled_target_is_legal,
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
    print("lichess split tests ok")


if __name__ == "__main__":
    main()
