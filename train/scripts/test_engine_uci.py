#!/usr/bin/env python3
"""UCI protocol tests. One live 1-visit search on tinyaz-s (fast)."""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import chess  # noqa: E402
import uci_child_test_support as uci_child  # noqa: E402
from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.engine_uci import (  # noqa: E402
    ENGINE_AUTHOR,
    ENGINE_NAME,
    TinyazUci,
    clamp_visits,
    default_weights,
    parse_go,
    repo_root,
    run_stdio,
)

S_WEIGHTS = ROOT / "public" / "weights" / "tinyaz-s.bin"


def _prefix_board(fen: str, moves: list[str]) -> chess.Board:
    board = chess.Board(fen)
    for u in moves:
        board.push_uci(u)
    return board


def _assert_position_prefix(e: TinyazUci, expected: chess.Board) -> None:
    assert e.board.fen() == expected.fen()
    assert [m.uci() for m in e.board.move_stack] == [m.uci() for m in expected.move_stack]
    assert e.board.turn == expected.turn
    assert e.board.castling_rights == expected.castling_rights
    assert e.board.halfmove_clock == expected.halfmove_clock
    assert e.board.fullmove_number == expected.fullmove_number
    assert e.board.ep_square == expected.ep_square
    assert e._ev is None


def test_parse_go_nodes_and_clock() -> None:
    g = parse_go("go wtime 60000 btime 58000 winc 0 binc 0".split())
    assert g["wtime"] == 60000
    assert g["btime"] == 58000
    n = parse_go("go nodes 64".split())
    assert n["nodes"] == 64
    m = parse_go("go movetime 100".split())
    assert m["movetime"] == 100
    d = parse_go("go infinite depth 8 movestogo 20 nodes xyz".split())
    assert d["depth"] == 8
    assert d["movestogo"] == 20
    assert "nodes" not in d
    assert parse_go("go nodes".split()) == {}


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
    ev1 = e.ensure_eval()
    ev2 = e.ensure_eval()
    assert ev1 is ev2
    e.handle("position startpos")
    out = e.handle("go nodes 1")
    assert any(x.startswith("info ") for x in out)
    best = [x for x in out if x.startswith("bestmove ")]
    assert len(best) == 1
    mv = best[0].split()[1]
    board = chess.Board()
    assert chess.Move.from_uci(mv) in board.legal_moves


def test_parse_go_skips_bad_and_unknown() -> None:
    assert parse_go("go foo 1 nodes 4".split())["nodes"] == 4
    assert parse_go(["go"]) == {}


def test_position_edges_and_empty_command() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e.handle("") == []
    assert e.handle("   ") == []
    assert e.handle("debug on") == []
    e.handle("position")
    start = e.board.fen()
    e.handle("position startpos")
    assert e.board.fen() == chess.Board().fen()
    e.handle("position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")
    assert e.board.turn == chess.BLACK
    e.handle("position mystery")
    assert e.board.turn == chess.BLACK
    assert start != ""


def test_setoption_weights_and_missing_value() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=8)
    e._ev = object()  # type: ignore[assignment]
    assert e.handle("setoption name Visits") == []
    assert e.visits == 8
    e.handle("setoption name Weights value /tmp/tinyaz-x.bin")
    assert e.weights == Path("/tmp/tinyaz-x.bin")
    assert e._ev is None
    e.handle("setoption name NotARealOption value 3")
    assert e.visits == 8


def test_visits_for_go_black_and_defaults() -> None:
    e = TinyazUci(visits=16)
    assert e.weights == default_weights()
    assert default_weights() == repo_root() / "public" / "weights" / "tinyaz-m.bin"
    assert e.visits_for_go({}) == 16
    e.handle("position startpos moves e2e4")
    assert e.board.turn == chess.BLACK
    assert e.visits_for_go({"btime": 100}) == 1
    assert e.visits_for_go({"btime": 300}) == 16
    assert e.visits_for_go({"wtime": 50}) == 16


def test_run_stdio_and_missing_weights() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    e.search = lambda visits: (chess.Move.from_uci("e2e4"), 0.0, 0)  # type: ignore[method-assign]
    out = e.handle("go")
    assert "nps 0" in out[0]
    assert "score cp 0" in out[0]
    assert out[1] == "bestmove e2e4"
    buf = io.StringIO("uci\nquit\n")
    old_in = sys.stdin
    sys.stdin = buf
    try:
        run_stdio(e)
    finally:
        sys.stdin = old_in
    missing = TinyazUci(weights=Path("/no/such/tinyaz.bin"), visits=1)
    try:
        missing.handle("isready")
        raise AssertionError("expected FileNotFoundError")
    except FileNotFoundError as err:
        assert "tinyaz.bin" in str(err)
    parent = uci_child.validate_parent()
    with tempfile.TemporaryDirectory() as td:
        hook = Path(td)
        (hook / "sitecustomize.py").write_text(uci_child.SITECUSTOMIZE)
        help_py = uci_child.run_help(
            [str(ROOT / "train" / "scripts" / "tinyaz_uci.py"), "--help"],
            "direct",
            uci_child.build_child_env(hook / "id-direct.json", hook),
            parent,
            use_project_python3=True,
        )
        assert "weights" in help_py["stdout"].lower()
        wrap = uci_child.run_help(
            [str(ROOT / "train" / "scripts" / "hansel-chess-ai"), "--help"],
            "wrapper",
            uci_child.build_child_env(hook / "id-wrapper.json", hook),
            parent,
            use_project_python3=False,
        )
        assert "visits" in wrap["stdout"].lower() or "weights" in wrap["stdout"].lower()
        wrapped = wrap["identity"]
        direct = help_py["identity"]
        assert wrapped["resolvedExecutable"] == direct["resolvedExecutable"]
        assert wrapped["executableSha256"] == direct["executableSha256"]
        evidence = {
            "parent": parent,
            "direct-help": direct,
            "wrapper-help": wrapped,
        }
        print("UCI-EVIDENCE " + json.dumps(evidence, sort_keys=True))


def test_ucinewgame_resets_board() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    e.handle("position startpos moves e2e4")
    assert e.board.peek().uci() == "e2e4"
    assert e.handle("ucinewgame") == []
    assert e.board.fen() == chess.Board().fen()


def test_setoption_missing_value_with_extra_tokens() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=8)
    assert e.handle("setoption name Visits extra tokens") == []
    assert e.visits == 8
    assert e.handle("setoption foo Visits value 64") == []
    assert e.visits == 8


def test_setoption_visits_rejects_non_int() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=8)
    e.handle("setoption name Visits value nope")
    assert e.visits == 8


def test_go_on_checkmate_emits_bestmove() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    e.handle("isready")
    e.handle("position fen rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3")
    out = e.handle("go nodes 1")
    assert any(x.startswith("bestmove ") for x in out)


def test_position_invalid_later_move_keeps_prefix() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e.handle("position startpos moves e2e4 e7e5 e1e3 g8f6") == []
    _assert_position_prefix(e, _prefix_board(chess.STARTING_FEN, ["e2e4", "e7e5"]))
    e2 = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e2.handle("position startpos moves e2e4 bogus e7e5") == []
    _assert_position_prefix(e2, _prefix_board(chess.STARTING_FEN, ["e2e4"]))
    e3 = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e3.handle("position startpos moves e1e3 e2e4") == []
    _assert_position_prefix(e3, _prefix_board(chess.STARTING_FEN, []))


def test_position_fen_invalid_later_move_keeps_prefix() -> None:
    fen = chess.STARTING_FEN
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e.handle(f"position fen {fen} moves g1f3 e7e5 b1b1 g8f6") == []
    _assert_position_prefix(e, _prefix_board(fen, ["g1f3", "e7e5"]))
    e2 = TinyazUci(weights=S_WEIGHTS, visits=1)
    assert e2.handle(f"position fen {fen} moves g1f3 z9 e7e5") == []
    _assert_position_prefix(e2, _prefix_board(fen, ["g1f3"]))


def test_position_only_stdio_emits_no_response() -> None:
    e = TinyazUci(weights=S_WEIGHTS, visits=1)
    cmds = (
        "position startpos moves e2e4 e7e5 e1e3 g8f6\n"
        f"position fen {chess.STARTING_FEN} moves g1f3 zzz e7e5\n"
        "quit\n"
    )
    buf_out = io.StringIO()
    old_in, old_out = sys.stdin, sys.stdout
    sys.stdin, sys.stdout = io.StringIO(cmds), buf_out
    try:
        run_stdio(e)
    finally:
        sys.stdin, sys.stdout = old_in, old_out
    assert buf_out.getvalue() == ""
    _assert_position_prefix(e, _prefix_board(chess.STARTING_FEN, ["g1f3"]))


def test_wrong_python3_selection_rejects_before_spawn() -> None:
    parent = uci_child.validate_parent()
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        hook = tmp / "hook"
        hook.mkdir()
        (hook / "sitecustomize.py").write_text(uci_child.SITECUSTOMIZE)
        wrong_bin = tmp / "wrong-bin"
        wrong_bin.mkdir()
        foreign = wrong_bin / "python3"
        foreign.write_text("#!/bin/sh\n")
        foreign.chmod(0o755)
        env = uci_child.build_child_env(tmp / "id-wrong.json", hook)
        env["PATH"] = str(wrong_bin) + os.pathsep + env["PATH"]
        spawned: list[list[str]] = []

        def sentinel(argv, env):
            spawned.append(argv)
            raise AssertionError("launcher reached despite rejected python3")

        with patch.object(uci_child, "run_help_child", sentinel):
            rejected = False
            try:
                uci_child.run_help(
                    ["--help"],
                    "wrong",
                    env,
                    parent,
                    use_project_python3=True,
                )
            except AssertionError:
                rejected = True
            assert spawned == [], "a child was launched despite wrong python3 selection"
            assert rejected, "wrong python3 selection was not rejected"
            assert not (tmp / "id-wrong.json").exists(), "sidecar written without a child"


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
    test_parse_go_skips_bad_and_unknown()
    print("ok test_parse_go_skips_bad_and_unknown")
    test_position_edges_and_empty_command()
    print("ok test_position_edges_and_empty_command")
    test_setoption_weights_and_missing_value()
    print("ok test_setoption_weights_and_missing_value")
    test_visits_for_go_black_and_defaults()
    print("ok test_visits_for_go_black_and_defaults")
    test_run_stdio_and_missing_weights()
    print("ok test_run_stdio_and_missing_weights")
    test_ucinewgame_resets_board()
    print("ok test_ucinewgame_resets_board")
    test_setoption_missing_value_with_extra_tokens()
    print("ok test_setoption_missing_value_with_extra_tokens")
    test_setoption_visits_rejects_non_int()
    print("ok test_setoption_visits_rejects_non_int")
    test_go_on_checkmate_emits_bestmove()
    print("ok test_go_on_checkmate_emits_bestmove")
    test_position_invalid_later_move_keeps_prefix()
    print("ok test_position_invalid_later_move_keeps_prefix")
    test_position_fen_invalid_later_move_keeps_prefix()
    print("ok test_position_fen_invalid_later_move_keeps_prefix")
    test_position_only_stdio_emits_no_response()
    print("ok test_position_only_stdio_emits_no_response")
    test_wrong_python3_selection_rejects_before_spawn()
    print("ok test_wrong_python3_selection_rejects_before_spawn")
    print("engine-uci tests ok")


if __name__ == "__main__":
    main()
