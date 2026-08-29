#!/usr/bin/env python3
"""Encode / policy fixtures matching src/lib/chess/chess.test.ts."""

from __future__ import annotations

import sys
from pathlib import Path

import chess
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "train" / "src"))

from tinyaz.constants import (
    CHANNELS_M,
    CHANNELS_S,
    algebraic_to_index,
    flip_index,
    index_to_algebraic,
    param_count,
)
from tinyaz.encode import encode_board
from tinyaz.policy import encode_move_plane, move_to_plane
from tinyaz.model import TinyAZ


def main() -> None:
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

    n = param_count()
    assert n == param_count(CHANNELS_S)
    assert n < 3_000_000
    assert n > 500_000
    model = TinyAZ()
    counted = sum(p.numel() for p in model.parameters())
    assert counted == n, f"torch {counted} != spec {n}"
    nm = param_count(CHANNELS_M)
    assert nm < 3_000_000
    assert nm > 2_000_000
    m = TinyAZ(CHANNELS_M)
    assert m.stem.out_channels == CHANNELS_M
    assert sum(p.numel() for p in m.parameters()) == nm
    from tinyaz.pack import load_model, pack_model

    tmp = Path("/tmp/tinyaz-m-roundtrip.bin")
    pack_model(m, 1, tmp)
    loaded, sid = load_model(tmp)
    assert loaded.channels == CHANNELS_M
    assert sid == 1
    s_model, _ = load_model(Path(__file__).resolve().parents[2] / "public/weights/tinyaz-s.bin")
    assert s_model.channels == CHANNELS_S
    print("python encode/policy/param ok", n, "m", nm)


if __name__ == "__main__":
    main()
