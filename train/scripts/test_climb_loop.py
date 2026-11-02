#!/usr/bin/env python3
"""Climb-loop tests: visit split, controlled snapshot/generate, VOID, legality.

The two required operational cases are controlled rewrites: model loading and
game playing are replaced by recorded test doubles behind fail-fast guards.
They verify real aggregation, dispatch, JSONL append and legality checking —
not real inference or self-play. The original real S snapshot/self-play
regressions moved to test_climb_real_regressions.py and stay deferred: not
run, not passed, and not equivalent coverage.
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"
JS_CONSTANTS = ROOT / "src/lib/chess/constants.ts"

FIXED_ROWS = [
    {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "pi": [[76, 1.0]],
        "value": 0.0,
    },
    {
        "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        "pi": [[76, 1.0]],
        "value": 0.0,
    },
]


def _forbidden(name: str):
    def _raise(*_a, **_k):
        raise AssertionError(f"forbidden compute path called: {name}")

    return _raise


def _assert_legal_pi(row: dict) -> None:
    board = chess.Board(row["fen"])
    legal: set[int] = set()
    flip = board.turn == chess.BLACK
    for mv in board.legal_moves:
        frm, plane = move_index(mv, flip)
        if plane >= 0:
            legal.add(plane * 64 + frm)
    for idx, _p in row["pi"]:
        assert int(idx) in legal, f"illegal pi index {idx} in {row['fen']}"


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


def test_climb_m_skip_generate_uses_existing_jsonl_and_mix_env() -> None:
    text = (ROOT / "train/scripts/climb_m.py").read_text()
    assert "CLIMB_SKIP_GENERATE" in text
    assert "CLIMB_LICHESS_MIX" in text
    assert "skip generate" in text


def test_months_m_continues_tinyaz_m() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "tinyaz-m.bin" in text
    assert "tinyaz-s.bin" not in text
    assert "train_candidate" in text
    assert "PLAY_VISITS" in text
    assert "300_000" in text
    assert "vs_stockfish_64" in text
    assert "beats_published" in text


def test_months_m_keep_requires_1500_floor_and_rates_1800() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "or score1320 > 0.5" not in text
    assert "score1500 >= floor" in text
    assert "elo=1800" in text or "_sf(CAND, 1800)" in text


def test_months_m_rates_2000_and_gates_on_2000() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "_sf(CAND, 2000)" in text
    assert "score2000 >= 0.5" in text
    assert "vsSf2000" in text
    assert "STOP: 50% vs SF2000." in text
    assert "STOP: 50% vs SF1500." not in text


def test_months_m_rates_2200_and_2500() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "_sf(CAND, 2200)" in text
    assert "_sf(CAND, 2500)" in text
    assert "vsSf2200" in text
    assert "vsSf2500" in text
    assert "MONTHS_RATE_HIGHER" in text
    assert "rate_higher" in text


def test_months_m_from_env_overrides_last_trained_month() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "MONTHS_FROM" in text
    src = ROOT / "train/scripts"
    sys.path.insert(0, str(src))
    import months_m

    prev = os.environ.get("MONTHS_FROM")
    os.environ["MONTHS_FROM"] = "2013-09"
    try:
        assert months_m.last_trained_month({}) == "2013-09"
        assert months_m.last_trained_month({"humanMonths": "lichess-2013-01..2013-07"}) == "2013-09"
    finally:
        if prev is None:
            os.environ.pop("MONTHS_FROM", None)
        else:
            os.environ["MONTHS_FROM"] = prev


def test_months_m_skip_rebuild_and_rate_only_env() -> None:
    text = (ROOT / "train/scripts/months_m.py").read_text()
    assert "MONTHS_SKIP_REBUILD" in text
    assert "MONTHS_SKIP_RATE" in text
    assert "MONTHS_RATE_ONLY" in text
    assert "skip rebuild" in text
    assert "TRAINED" in text


def test_train_visits_is_256() -> None:
    from tinyaz.constants import SNAPSHOT_VISITS, TRAIN_VISITS

    assert TRAIN_VISITS == 256
    assert SNAPSHOT_VISITS == 1


def test_void_does_not_change_public_weights() -> None:
    from tinyaz.promote import maybe_promote

    before = hashlib.sha256(WEIGHTS.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory() as td:
        dummy = Path(td) / "cand.bin"
        dummy.write_bytes(b"not-a-checkpoint")
        meta_path = Path(td) / "meta.json"
        kept = maybe_promote(
            keep=False,
            candidate=dummy,
            public_weights=WEIGHTS,
            meta={"void": True},
            meta_paths=[meta_path],
        )
        assert not meta_path.exists()
    after = hashlib.sha256(WEIGHTS.read_bytes()).hexdigest()
    assert kept is False
    assert before == after


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


def test_controlled_snapshot_pairs_score_is_half() -> None:
    from tinyaz import rate

    paths: list[Path] = []
    pair_calls: list[dict] = []
    outcomes = iter([1.0, -1.0, 1.0, -1.0, 1.0, -1.0, 1.0, -1.0])

    def fake_cpu_eval(path: Path):
        paths.append(Path(path))
        return "INERT_EVAL"

    def fake_play_pair(ev_a, ev_b, a_white, visits, opening, max_plies=rate.MAX_PLIES):
        pair_calls.append(
            {
                "ev_a": ev_a,
                "ev_b": ev_b,
                "aWhite": a_white,
                "visits": visits,
                "opening": tuple(opening),
                "maxPlies": max_plies,
            }
        )
        return next(outcomes)

    orig_eval, orig_pair = rate._cpu_eval, rate._play_pair
    with (
        mock.patch.object(rate, "_cpu_eval", fake_cpu_eval),
        mock.patch.object(rate, "_play_pair", fake_play_pair),
        mock.patch.object(rate, "load_model", _forbidden("rate.load_model")),
        mock.patch.object(rate, "search_root", _forbidden("rate.search_root")),
    ):
        result = rate.vs_snapshot(WEIGHTS, WEIGHTS, games=8, visits=1)
    assert rate._cpu_eval is orig_eval and rate._play_pair is orig_pair
    try:
        with mock.patch.object(rate, "_cpu_eval", fake_cpu_eval):
            raise RuntimeError("injected failure")
    except RuntimeError:
        pass
    assert rate._cpu_eval is orig_eval

    assert paths == [WEIGHTS, WEIGHTS]
    expected_order = [(tuple(o), w) for o in rate.OPENINGS for w in (True, False)]
    assert [(c["opening"], c["aWhite"]) for c in pair_calls] == expected_order
    assert all(c["visits"] == 1 for c in pair_calls)
    assert all(c["ev_a"] == "INERT_EVAL" and c["ev_b"] == "INERT_EVAL" for c in pair_calls)
    assert result["games"] == 8
    assert result["visits"] == 1
    assert result["wins"] == 4
    assert result["draws"] == 0
    assert result["losses"] == 4
    assert abs(result["score"] - 0.5) < 1e-9, result


def test_controlled_generate_rows_are_legal_and_written() -> None:
    from tinyaz import generate

    eval_calls: list[Path] = []
    game_calls: list[dict] = []

    def fake_eval_from(path: Path):
        eval_calls.append(Path(path))
        return "INERT_EVAL"

    def fake_play_game(ev, visits, rng):
        game_calls.append({"ev": ev, "visits": visits})
        return copy.deepcopy(FIXED_ROWS), 0.0

    orig_eval, orig_game = generate._eval_from, generate.play_game
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "sp.jsonl"
        with (
            mock.patch.object(generate, "_eval_from", fake_eval_from),
            mock.patch.object(generate, "play_game", fake_play_game),
            mock.patch.object(generate, "load_model", _forbidden("generate.load_model")),
            mock.patch.object(generate, "search_root", _forbidden("generate.search_root")),
            mock.patch.object(
                generate, "ProcessPoolExecutor", _forbidden("generate.ProcessPoolExecutor")
            ),
        ):
            rows = generate.generate(WEIGHTS, games=1, visits=1, workers=1, out_jsonl=out)
        assert eval_calls == [WEIGHTS]
        assert len(game_calls) == 1
        assert game_calls[0]["visits"] == 1
        assert game_calls[0]["ev"] == "INERT_EVAL"
        assert rows, "expected at least one position"
        assert out.exists()
        written = [json.loads(line) for line in out.read_text().splitlines() if line.strip()]
        assert written == rows
        for row in rows:
            _assert_legal_pi(row)
    assert generate._eval_from is orig_eval and generate.play_game is orig_game
    try:
        with mock.patch.object(generate, "_eval_from", fake_eval_from):
            raise RuntimeError("injected failure")
    except RuntimeError:
        pass
    assert generate._eval_from is orig_eval

    bad = dict(FIXED_ROWS[0])
    bad["pi"] = [[4672, 1.0]]
    try:
        _assert_legal_pi(bad)
    except AssertionError:
        pass
    else:
        raise AssertionError("illegal pi index 4672 was accepted")


def main() -> None:
    tests = [
        test_play_visits_is_64,
        test_climb_m_generates_at_256_snapshots_at_64,
        test_climb_m_skip_generate_uses_existing_jsonl_and_mix_env,
        test_months_m_continues_tinyaz_m,
        test_months_m_keep_requires_1500_floor_and_rates_1800,
        test_months_m_rates_2000_and_gates_on_2000,
        test_months_m_rates_2200_and_2500,
        test_months_m_from_env_overrides_last_trained_month,
        test_months_m_skip_rebuild_and_rate_only_env,
        test_train_visits_is_256,
        test_void_does_not_change_public_weights,
        test_beats_published_requires_strict_improvement,
        test_above_1320_needs_1500_point_or_mle,
        test_elo_label_is_wdl_not_plus,
        test_mix_does_not_double_count_new,
        test_controlled_snapshot_pairs_score_is_half,
        test_controlled_generate_rows_are_legal_and_written,
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
