#!/usr/bin/env python3
"""Climb-loop tests: visit split, snapshot 0.5, VOID, legal generate pi."""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"
JS_CONSTANTS = ROOT / "src/lib/chess/constants.ts"


def test_play_visits_is_64() -> None:
    assert PLAY_VISITS == 64
    text = JS_CONSTANTS.read_text()
    assert "export const PLAY_VISITS = 64;" in text
    assert "TRAIN_VISITS" not in text


def test_climb_m_generates_at_256_snapshots_at_64() -> None:
    text = (ROOT / "train/scripts/climb_m.py").read_text()
    assert "tinyaz-m.bin" in text
    assert "TRAIN_VISITS" in text
    assert "CLIMB_VISITS" in text
    assert "CLIMB_EPOCHS" in text
    assert "visits=gen_visits" in text
    assert "visits=PLAY_VISITS" in text
    assert "selfplay-m-256.jsonl" in text
    assert "vs_snapshot" in text
    assert "0.5" in text
    assert '"selfplayVisits": gen_visits' in text or '"selfplayVisits":gen_visits' in text
    assert "gauntletElo" in text


def test_train_visits_is_256() -> None:
    from tinyaz.constants import SNAPSHOT_VISITS, TRAIN_VISITS

    assert TRAIN_VISITS == 256
    assert SNAPSHOT_VISITS == 1


def test_identical_nets_snapshot_score_is_half() -> None:
    from tinyaz.rate import vs_snapshot

    result = vs_snapshot(WEIGHTS, WEIGHTS, games=8, visits=1)
    assert result["games"] == 8
    assert result["visits"] == 1
    assert abs(result["score"] - 0.5) < 1e-9, result


def test_void_does_not_change_public_weights() -> None:
    from tinyaz.promote import maybe_promote

    before = hashlib.sha256(WEIGHTS.read_bytes()).hexdigest()
    dummy = Path(tempfile.mkdtemp()) / "cand.bin"
    dummy.write_bytes(b"not-a-checkpoint")
    meta_path = Path(tempfile.mkdtemp()) / "meta.json"
    kept = maybe_promote(
        keep=False,
        candidate=dummy,
        public_weights=WEIGHTS,
        meta={"void": True},
        meta_paths=[meta_path],
    )
    after = hashlib.sha256(WEIGHTS.read_bytes()).hexdigest()
    assert kept is False
    assert before == after
    assert not meta_path.exists()


def test_beats_published_requires_strict_improvement() -> None:
    from tinyaz.promote import beats_published

    assert beats_published(0.25, 0.125) is True
    assert beats_published(0.125, 0.125) is False
    assert beats_published(0.0, 0.125) is False


def test_above_1320_needs_1500_point_or_mle() -> None:
    from tinyaz.promote import above_1320

    assert above_1320({"score": 0.25}, None, None) is False
    assert above_1320({"score": 0.5}, None, None) is False
    assert above_1320({"score": 0.25}, {"score": 0.125}, None) is True
    assert above_1320({"score": 0.625}, None, {"estimatedElo": 1400}) is True
    assert above_1320({"score": 0.625}, None, {"estimatedElo": 1200}) is False


def test_elo_label_is_wdl_not_plus() -> None:
    from tinyaz.promote import elo_label_from_sf

    label = elo_label_from_sf({"wins": 1, "draws": 0, "losses": 7, "games": 8, "uciElo": 1320})
    assert label == "1/8 vs 1320"
    assert "1320+" not in label


def test_mix_does_not_double_count_new() -> None:
    from tinyaz.train_loop import mix_for_train

    new = [{"fen": "a"}, {"fen": "b"}]
    replay_before = [{"fen": "old"}]
    lichess = [{"fen": "lic"}]
    mixed = mix_for_train(new, replay_before, lichess)
    fens = [r["fen"] for r in mixed]
    assert fens.count("a") == 1
    assert fens.count("b") == 1
    assert fens.count("old") == 1
    assert len(mixed) == 4


def test_generate_pi_indices_are_legal() -> None:
    from tinyaz.generate import generate

    out = Path(tempfile.mkdtemp()) / "sp.jsonl"
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
        test_play_visits_is_64,
        test_climb_m_generates_at_256_snapshots_at_64,
        test_train_visits_is_256,
        test_void_does_not_change_public_weights,
        test_beats_published_requires_strict_improvement,
        test_above_1320_needs_1500_point_or_mle,
        test_elo_label_is_wdl_not_plus,
        test_mix_does_not_double_count_new,
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
    print("climb-loop tests ok")


if __name__ == "__main__":
    main()
