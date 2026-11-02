#!/usr/bin/env python3
"""Encode / policy fixtures matching src/lib/chess conventions.

Mandatory real-M identity/load/count checks plus the thirteen shared
browser-parity input/policy cases in train/fixtures/browser-parity.json.
Fixture passage here is a Python input check, not browser/Python numeric
parity or K2 closure.
"""

from __future__ import annotations

import hashlib
import json
import struct
import sys
import tempfile
from pathlib import Path

import chess
import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "train" / "src"))

from tinyaz.constants import (  # noqa: E402
    CHANNELS_M,
    CHANNELS_S,
    N_BLOCKS,
    PARAM_CAP,
    algebraic_to_index,
    flip_index,
    index_to_algebraic,
    param_count,
)
from tinyaz.encode import encode_board  # noqa: E402
from tinyaz.model import TinyAZ  # noqa: E402
from tinyaz.pack import load_model, pack_model  # noqa: E402
from tinyaz.policy import encode_move_plane, move_index, move_to_plane  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
M_PATH = ROOT / "public/weights/tinyaz-m.bin"
S_PATH = ROOT / "public/weights/tinyaz-s.bin"
M_SHA256 = "b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee"
M_BYTES = 9706840
M_PARAMS = 2426706
FIXTURES = ROOT / "train/fixtures/browser-parity.json"
EXPECTED_CASE_IDS = [
    "start",
    "after-e4",
    "castle-white",
    "castle-black",
    "ep-white",
    "ep-black",
    "promote-white",
    "promote-black",
    "mate",
    "stalemate",
    "after-e4-d5",
    "initial-raw-e3",
    "pinned-ep",
]
POLICY_GOLDENS = [
    ("e2e4", "e7e5", 76),
    ("e1g1", "e8g8", 964),
    ("e1c1", "e8c8", 2756),
    ("e5d6", "e4d3", 3172),
    ("a7a8q", "a2a1q", 48),
    ("a7a8n", "a2a1n", 4208),
    ("a7a8b", "a2a1b", 4400),
    ("a7a8r", "a2a1r", 4592),
]


def _load_cases() -> list[dict]:
    data = json.loads(FIXTURES.read_text())
    assert data["schemaVersion"] == 1
    cases = data["cases"]
    assert [c["id"] for c in cases] == EXPECTED_CASE_IDS
    for c in cases:
        assert set(c) == {"id", "initialFen", "movesUci", "expectedRawEpTarget"}
    return cases


def _replay(case: dict) -> chess.Board:
    board = chess.Board(case["initialFen"])
    for u in case["movesUci"]:
        board.push_uci(u)
    return board


def _check_case(case: dict) -> None:
    board = _replay(case)
    planes = encode_board(board)
    assert planes.dtype == np.float32
    assert planes.shape == (19 * 64,)
    assert bool(np.isfinite(planes).all())

    flip = board.turn == chess.BLACK
    stm_king = board.king(board.turn)
    opp_king = board.king(not board.turn)
    i_stm = flip_index(stm_king) if flip else stm_king
    i_opp = flip_index(opp_king) if flip else opp_king
    assert planes[5 * 64 + i_stm] == 1.0
    assert planes[11 * 64 + i_opp] == 1.0
    assert int(planes[: 12 * 64].sum()) == len(board.piece_map())

    us, them = board.turn, not board.turn
    castling = {
        12: board.has_kingside_castling_rights(us),
        13: board.has_queenside_castling_rights(us),
        14: board.has_kingside_castling_rights(them),
        15: board.has_queenside_castling_rights(them),
    }
    for plane, expect in castling.items():
        seg = planes[plane * 64 : (plane + 1) * 64]
        assert bool((seg == np.float32(1.0 if expect else 0.0)).all()), (case["id"], plane)

    half_n = min(board.halfmove_clock / 100.0, 1.0)
    full_n = min(board.fullmove_number / 200.0, 1.0)
    assert bool((planes[17 * 64 : 18 * 64] == np.float32(half_n)).all())
    assert bool((planes[18 * 64 : 19 * 64] == np.float32(full_n)).all())

    seg = planes[16 * 64 : 17 * 64]
    raw = case["expectedRawEpTarget"]
    if raw is None:
        assert board.ep_square is None
        assert bool((seg == 0).all())
    else:
        assert board.ep_square == chess.parse_square(raw)
        idx = algebraic_to_index(raw)
        if flip:
            idx = flip_index(idx)
        assert seg[idx] == 1.0
        assert int(seg.sum()) == 1

    seen: set[int] = set()
    for mv in board.legal_moves:
        frm, plane = move_index(mv, flip)
        assert 0 <= plane < 73
        flat = plane * 64 + frm
        assert 0 <= flat < 4672
        assert flat not in seen
        seen.add(flat)
    if case["id"] in ("mate", "stalemate"):
        assert not seen


def test_thirteen_shared_input_policy_cases() -> None:
    for case in _load_cases():
        _check_case(case)


def test_after_e4_matches_initial_raw_e3() -> None:
    cases = {c["id"]: c for c in _load_cases()}
    board = _replay(cases["after-e4"])
    assert board.ep_square == chess.E3
    assert " e3 " not in f" {board.fen()} "
    a = encode_board(board)
    b = encode_board(_replay(cases["initial-raw-e3"]))
    assert bool(np.array_equal(a, b))


def test_pinned_ep_keeps_raw_bit_without_capture() -> None:
    case = next(c for c in _load_cases() if c["id"] == "pinned-ep")
    board = _replay(case)
    assert board.ep_square == chess.D6
    assert not board.has_legal_en_passant()
    planes = encode_board(board)
    assert planes[16 * 64 + algebraic_to_index("d6")] == 1.0
    quiet = chess.Move.from_uci("e1d1")
    assert quiet in board.legal_moves
    board.push(quiet)
    assert board.ep_square is None
    cleared = encode_board(board)
    assert bool((cleared[16 * 64 : 17 * 64] == 0).all())


def test_special_move_policy_goldens() -> None:
    for white, black, expected in POLICY_GOLDENS:
        frm, plane = move_index(chess.Move.from_uci(white), False)
        assert plane * 64 + frm == expected, (white, plane, frm)
        frm, plane = move_index(chess.Move.from_uci(black), True)
        assert plane * 64 + frm == expected, (black, plane, frm)


def test_real_m_identity_and_load() -> None:
    assert M_PATH.is_file()
    raw = M_PATH.read_bytes()
    assert len(raw) == M_BYTES
    assert hashlib.sha256(raw).hexdigest() == M_SHA256
    magic, version, count, source_id = struct.unpack_from("<4sIII", raw, 0)
    assert magic == b"TAZS"
    assert version == 1
    assert count == M_PARAMS
    assert source_id == 1
    model, sid = load_model(M_PATH)
    assert sid == 1
    assert model.channels == CHANNELS_M
    assert len(model.blocks) == N_BLOCKS
    assert sum(p.numel() for p in model.parameters()) == M_PARAMS
    assert M_PARAMS < PARAM_CAP


def test_hand_checked_geometry() -> None:
    assert flip_index(algebraic_to_index("e8")) == algebraic_to_index("e1")
    assert flip_index(algebraic_to_index("a8")) == algebraic_to_index("a1")
    assert index_to_algebraic(flip_index(algebraic_to_index("a8"))) == "a1"
    assert flip_index(algebraic_to_index("a8")) != algebraic_to_index("h1")

    start = chess.Board()
    planes = encode_board(start)
    assert planes[5 * 64 + algebraic_to_index("e1")] == 1
    assert planes[0 * 64 + algebraic_to_index("a2")] == 1
    assert planes[6 * 64 + algebraic_to_index("a7")] == 1

    start.push_san("e4")
    planes = encode_board(start)
    assert start.turn == chess.BLACK
    assert planes[0 * 64 + algebraic_to_index("a2")] == 1
    assert planes[5 * 64 + algebraic_to_index("e1")] == 1
    assert planes[11 * 64 + algebraic_to_index("e8")] == 1

    assert move_to_plane(algebraic_to_index("e2"), algebraic_to_index("e4"), None) == 1
    assert move_to_plane(algebraic_to_index("b1"), algebraic_to_index("c3"), None) == 56
    frm, plane = encode_move_plane("e7", "e5", None, True)
    assert frm == algebraic_to_index("e2")
    assert plane == 1


def test_param_counts_and_roundtrip() -> None:
    n = param_count()
    assert n == param_count(CHANNELS_S)
    assert 500_000 < n < PARAM_CAP
    model = TinyAZ()
    assert sum(p.numel() for p in model.parameters()) == n
    nm = param_count(CHANNELS_M)
    assert 2_000_000 < nm < PARAM_CAP
    m = TinyAZ(CHANNELS_M)
    assert m.stem.out_channels == CHANNELS_M
    assert sum(p.numel() for p in m.parameters()) == nm
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "roundtrip.bin"
        pack_model(m, 1, tmp)
        loaded, sid = load_model(tmp)
    assert loaded.channels == CHANNELS_M
    assert sid == 1
    assert len(loaded.blocks) == N_BLOCKS
    for (_, t1), (_, t2) in zip(m.state_dict().items(), loaded.state_dict().items()):
        assert torch.equal(t1, t2)
    s_model, _ = load_model(S_PATH)
    assert s_model.channels == CHANNELS_S
    assert sum(p.numel() for p in s_model.parameters()) == n


def main() -> None:
    tests = [
        test_hand_checked_geometry,
        test_thirteen_shared_input_policy_cases,
        test_after_e4_matches_initial_raw_e3,
        test_pinned_ep_keeps_raw_bit_without_capture,
        test_special_move_policy_goldens,
        test_real_m_identity_and_load,
        test_param_counts_and_roundtrip,
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
    print("python encode/policy/param ok")


if __name__ == "__main__":
    main()
