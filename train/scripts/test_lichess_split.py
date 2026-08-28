#!/usr/bin/env python3
"""Game-level split and sampling for the human-month climb."""

from __future__ import annotations

import sys
import tempfile
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


def _tiny_pgn(gid: str, result: str = "1-0") -> str:
    moves = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O"
    return (
        f'[Event "t"]\n[Site "https://lichess.org/{gid}"]\n'
        f'[White "a"]\n[Black "b"]\n[Result "{result}"]\n\n{moves} {result}\n\n'
    )


def test_write_human_months_concatenates_two_files() -> None:
    from tinyaz.data import write_human_months

    d = Path(tempfile.mkdtemp())
    a = d / "a.pgn"
    b = d / "b.pgn"
    a.write_text(_tiny_pgn("AAAAAAAA") + _tiny_pgn("BBBBBBBB"))
    b.write_text(_tiny_pgn("CCCCCCCC") + _tiny_pgn("DDDDDDDD"))
    stats = write_human_months([a, b], d / "train.jsonl", d / "val.jsonl", max_train=100, max_val=100)
    total = stats["train_positions"] + stats["val_positions"]
    assert total >= 8
    assert (d / "train.jsonl").exists()


def test_write_human_months_respects_train_cap() -> None:
    from tinyaz.data import write_human_months

    d = Path(tempfile.mkdtemp())
    p = d / "m.pgn"
    p.write_text("".join(_tiny_pgn(f"G{i:07d}") for i in range(20)))
    stats = write_human_months([p], d / "train.jsonl", d / "val.jsonl", max_train=12, max_val=4)
    assert stats["train_positions"] <= 12


def test_find_pgns_lists_months_sorted() -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "build_lichess", ROOT / "train/scripts/build_lichess.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    d = Path(tempfile.mkdtemp())
    (d / "train/data").mkdir(parents=True)
    (d / "train/data/lichess_db_standard_rated_2013-02.pgn.zst").write_bytes(b"x" * 2000)
    (d / "train/data/lichess_db_standard_rated_2013-01.pgn.zst").write_bytes(b"x" * 2000)
    found = mod.find_pgns(d)
    names = [p.name for p in found]
    assert names[0].endswith("2013-01.pgn.zst")
    assert names[1].endswith("2013-02.pgn.zst")


def test_human_month_trains_from_public_not_phase1() -> None:
    text = (ROOT / "train/scripts/human_month.py").read_text()
    assert "PHASE1" not in text
    assert "tinyaz-s.bin" in text
    assert "beats_published" in text
    assert "elo_label_from_sf" in text
    assert '"1320+"' not in text


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
        test_write_human_months_concatenates_two_files,
        test_write_human_months_respects_train_cap,
        test_find_pgns_lists_months_sorted,
        test_human_month_trains_from_public_not_phase1,
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
