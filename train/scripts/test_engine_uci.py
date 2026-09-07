#!/usr/bin/env python3
"""UCI protocol tests. One live 1-visit search on tinyaz-s (fast)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.engine_uci import (  # noqa: E402
    ENGINE_AUTHOR,
    ENGINE_NAME,
    TinyazUci,
    clamp_visits,
    parse_go,
)

S_WEIGHTS = ROOT / "public" / "weights" / "tinyaz-s.bin"


def test_parse_go_nodes_and_clock() -> None:
    g = parse_go("go wtime 60000 btime 58000 winc 0 binc 0".split())
    assert g["wtime"] == 60000
    assert g["btime"] == 58000
    n = parse_go("go nodes 64".split())
    assert n["nodes"] == 64
    m = parse_go("go movetime 100".split())
    assert m["movetime"] == 100


def test_clamp_visits() -> None:
    assert clamp_visits(0) == 1
    assert clamp_visits(64) == 64
    assert clamp_visits(99999) == 4096


def test_uci_handshake() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=PLAY_VISITS)
    lines = e.handle("uci")
    assert f"id name {ENGINE_NAME}" in lines
    assert f"id author {ENGINE_AUTHOR}" in lines
    assert any(x.startswith("option name Visits") for x in lines)
    assert lines[-1] == "uciok"
    assert e.handle("quit") == ["#quit"]


def test_position_startpos_and_fen() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    e.handle("ucinewgame")
    e.handle("position startpos moves e2e4 e7e5")
    assert e.board.fen().startswith("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR")
    e.handle("position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 moves g1f3")
    assert e.board.peek().uci() == "g1f3"


def test_setoption_visits() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=64)
    e.handle("setoption name Visits value 8")
    assert e.visits == 8
    go = parse_go("go nodes 1".split())
    assert e.visits_for_go(go) == 1
    e.board.reset()
    assert e.visits_for_go({"wtime": 100}) == 1
    assert e.visits_for_go({"wtime": 60000}) == 8


def test_go_one_visit_is_legal() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    ready = e.handle("isready")
    assert ready == ["readyok"]
    e.handle("position startpos")
    out = e.handle("go nodes 1")
    assert any(x.startswith("info ") for x in out)
    best = [x for x in out if x.startswith("bestmove ")]
    assert len(best) == 1
    mv = best[0].split()[1]
    board = chess.Board()
    assert chess.Move.from_uci(mv) in board.legal_moves


def main() -> None:
    test_parse_go_nodes_and_clock()
    print("ok test_parse_go_nodes_and_clock")
    test_clamp_visits()
    print("ok test_clamp_visits")
    test_uci_handshake()
    print("ok test_uci_handshake")
    test_position_startpos_and_fen()
    print("ok test_position_startpos_and_fen")
    test_setoption_visits()
    print("ok test_setoption_visits")
    test_go_one_visit_is_legal()
    print("ok test_go_one_visit_is_legal")
    print("engine-uci tests ok")


if __name__ == "__main__":
    main()
