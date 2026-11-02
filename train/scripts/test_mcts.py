#!/usr/bin/env python3
"""MCTS mechanics tests against the real imported tinyaz.mcts module.

No checkpoint, optimizer, root noise or real model is used. Every case runs a
deterministic fake evaluator returning finite float32 policy logits of length
4672 and scripted values. Boards and evaluators are fresh per case, and no
search exceeds 64 visits. Test-only CLI modes:

  --capture-control PATH   Write the normal-path control payload to PATH plus
                           a PATH.provenance.json companion, then run the
                           full mechanics suite. An unfixed search still
                           exits nonzero on the K1 restoration assertion.
  --compare-control PATH   Recompute the same normal control, require exact
                           equality with the captured payload, write a
                           PATH.compare.provenance.json companion, then run
                           the full mechanics suite.

With no option the script runs every self-contained mechanics assertion and
needs no historical scratch file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

import chess  # noqa: E402
import numpy as np  # noqa: E402

import tinyaz.mcts as mcts  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402

MCTS_PATH = (ROOT / "train" / "src" / "tinyaz" / "mcts.py").resolve()
POLICY_LEN = 4672
MATE_FEN = "7k/8/6K1/5Q2/8/8/8/8 w - - 0 1"
CHECKMATE_FEN = "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1"
STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"


class InjectedEvalError(RuntimeError):
    """Distinguished error raised by the scripted evaluator."""


class FakeEval:
    """Deterministic evaluator: finite float32 logits, scripted behavior."""

    def __init__(
        self,
        logits: np.ndarray | None = None,
        values: list[float] | None = None,
        fail_on: int | None = None,
        const_value: float = 0.25,
    ) -> None:
        self.logits = np.zeros(POLICY_LEN, dtype=np.float32) if logits is None else logits
        assert self.logits.shape == (POLICY_LEN,)
        assert self.logits.dtype == np.float32
        assert bool(np.isfinite(self.logits).all())
        self.values = values
        self.const_value = const_value
        self.fail_on = fail_on
        self.calls = 0
        self.trace: list[str] = []
        self.depths: list[int] = []

    def __call__(self, board: chess.Board) -> tuple[np.ndarray, float]:
        self.calls += 1
        self.trace.append(board.fen())
        self.depths.append(len(board.move_stack))
        if self.fail_on is not None and self.calls == self.fail_on:
            raise InjectedEvalError(f"C2B_K1_CALL_{self.calls}")
        value = self.const_value if self.values is None else self.values[self.calls - 1]
        return self.logits, value


def state(board: chess.Board) -> dict:
    fen = board.fen()
    return {
        "fen": fen,
        "epRaw": None if board.ep_square is None else chess.square_name(board.ep_square),
        "stack": [mv.uci() for mv in board.move_stack],
        "turn": "w" if board.turn == chess.WHITE else "b",
        "castling": fen.split(" ")[2],
        "halfmove": board.halfmove_clock,
        "fullmove": board.fullmove_number,
    }


def module_provenance() -> dict:
    real = Path(mcts.__file__).resolve()
    return {
        "moduleFile": str(real),
        "moduleSha256": hashlib.sha256(real.read_bytes()).hexdigest(),
        "expectedFile": str(MCTS_PATH),
        "sameFile": real == MCTS_PATH,
    }


def provenance(extra: dict) -> dict:
    return {
        "utc": datetime.now(timezone.utc).isoformat(),
        "argv": list(sys.argv),
        "cwd": str(Path.cwd()),
        "python": {
            "executable": sys.executable,
            "prefix": sys.prefix,
            "basePrefix": sys.base_prefix,
            "version": sys.version.split()[0],
        },
        "module": module_provenance(),
        **extra,
    }


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n")


def normal_control() -> dict:
    """64-visit deterministic control on the after-e4 board."""
    board = chess.Board()
    board.push_uci("e2e4")
    initial = state(board)
    ev = FakeEval(const_value=0.25)
    root = mcts.search_root(board, 64, ev, add_noise=False)
    return {
        "root": {
            "visits": root.visits,
            "valueSum": float(root.value_sum),
            "expanded": root.expanded,
            "terminal": root.terminal,
            "terminalValue": float(root.terminal_value),
        },
        "children": [
            {
                "uci": None if ch.move is None else ch.move.uci(),
                "prior": float(ch.prior),
                "visits": ch.visits,
                "valueSum": float(ch.value_sum),
                "expanded": ch.expanded,
                "terminal": ch.terminal,
            }
            for ch in root.children
        ],
        "bestMove": mcts.best_move(root).uci(),
        "evalCalls": ev.calls,
        "evalTrace": list(ev.trace),
        "initialBoard": initial,
        "finalBoard": state(board),
    }


def capture_control(path: Path) -> None:
    payload = normal_control()
    write_json(path, payload)
    extra = {
        "mode": "capture-control",
        "payloadFile": str(path),
        "payloadSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
    write_json(Path(str(path) + ".provenance.json"), provenance(extra))
    print("wrote control", path)


def compare_control(path: Path) -> None:
    saved = json.loads(path.read_text())
    actual = normal_control()
    assert actual == saved, "normal-path control payload changed"
    extra = {
        "mode": "compare-control",
        "payloadFile": str(path),
        "payloadSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "matched": True,
    }
    write_json(Path(str(path) + ".compare.provenance.json"), provenance(extra))
    print("control equal", path)


def test_import_is_checkout_module() -> None:
    info = module_provenance()
    assert info["sameFile"], info


def test_call_two_error_restores_board() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    before = state(board)
    ev = FakeEval(fail_on=2)
    try:
        mcts.search_root(board, 2, ev, add_noise=False)
    except InjectedEvalError as err:
        assert str(err) == "C2B_K1_CALL_2"
    else:
        raise AssertionError("expected InjectedEvalError")
    assert ev.calls == 2
    after = state(board)
    assert after == before, f"caller board left mutated: {after}"


def test_deeper_descent_error_restores_board() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    before = state(board)
    ev = FakeEval(fail_on=22)
    try:
        mcts.search_root(board, 22, ev, add_noise=False)
    except InjectedEvalError as err:
        assert str(err) == "C2B_K1_CALL_22"
    else:
        raise AssertionError("expected InjectedEvalError")
    assert ev.calls == 22
    assert ev.trace[-1] != before["fen"], "error did not occur inside a descent"
    assert ev.depths[-1] >= len(before["stack"]) + 2, (
        f"failing evaluation was not at least two plies deep: {ev.depths}"
    )
    after = state(board)
    assert after == before, f"caller board left mutated: {after}"


def test_normal_path_restores_board() -> None:
    board = chess.Board()
    board.push_uci("e2e4")
    before = state(board)
    ev = FakeEval(const_value=0.25)
    root = mcts.search_root(board, 64, ev, add_noise=False)
    assert root.visits == 64
    assert ev.calls == 64
    assert state(board) == before


def test_root_counts_one_and_64() -> None:
    one = mcts.search_root(chess.Board(), 1, FakeEval(const_value=0.0), add_noise=False)
    assert one.visits == 1
    assert all(ch.visits == 0 for ch in one.children)
    full = mcts.search_root(chess.Board(), 64, FakeEval(const_value=0.0), add_noise=False)
    assert full.visits == 64
    assert sum(ch.visits for ch in full.children) == 63


def test_two_visit_sign_backup() -> None:
    board = chess.Board()
    ev = FakeEval(values=[0.5, -0.25])
    root = mcts.search_root(board, 2, ev, add_noise=False)
    assert ev.calls == 2
    assert root.visits == 2
    visited = [ch for ch in root.children if ch.visits == 1]
    assert len(visited) == 1
    assert visited[0].value_sum == -0.25
    assert root.value_sum == 0.75


def test_checkmate_terminal_no_evaluator() -> None:
    board = chess.Board(CHECKMATE_FEN)
    assert board.is_checkmate()
    ev = FakeEval()
    root = mcts.search_root(board, 4, ev, add_noise=False)
    assert ev.calls == 0
    assert root.terminal is True
    assert root.terminal_value == -1.0
    assert not root.children
    assert root.visits == 4
    assert root.value_sum == -4.0


def test_stalemate_terminal_no_evaluator() -> None:
    board = chess.Board(STALEMATE_FEN)
    assert board.is_stalemate()
    ev = FakeEval()
    root = mcts.search_root(board, 4, ev, add_noise=False)
    assert ev.calls == 0
    assert root.terminal is True
    assert root.terminal_value == 0.0
    assert not root.children
    assert root.visits == 4
    assert root.value_sum == 0.0


def test_legal_mate_selected() -> None:
    board = chess.Board(MATE_FEN)
    assert not board.is_game_over()
    mating: set[str] = set()
    for mv in board.legal_moves:
        board.push(mv)
        if board.is_checkmate():
            mating.add(mv.uci())
        board.pop()
    assert mating, "expected at least one legal mating move"
    logits = np.full(POLICY_LEN, -10.0, dtype=np.float32)
    for mv in board.legal_moves:
        frm, plane = move_index(mv, False)
        assert plane >= 0
        if mv.uci() in mating:
            logits[plane * 64 + frm] = 10.0
    ev = FakeEval(logits=logits, const_value=0.0)
    root = mcts.search_root(board, 8, ev, add_noise=False)
    assert mcts.best_move(root).uci() in mating


TESTS = [
    test_import_is_checkout_module,
    test_call_two_error_restores_board,
    test_deeper_descent_error_restores_board,
    test_normal_path_restores_board,
    test_root_counts_one_and_64,
    test_two_visit_sign_backup,
    test_checkmate_terminal_no_evaluator,
    test_stalemate_terminal_no_evaluator,
    test_legal_mate_selected,
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    ctl = parser.add_mutually_exclusive_group()
    ctl.add_argument("--capture-control", type=Path, default=None)
    ctl.add_argument("--compare-control", type=Path, default=None)
    args = parser.parse_args()
    if args.capture_control is not None:
        capture_control(args.capture_control)
    if args.compare_control is not None:
        compare_control(args.compare_control)
    failed = 0
    for fn in TESTS:
        try:
            fn()
            print("ok", fn.__name__)
        except Exception as err:
            failed += 1
            print("FAIL", fn.__name__, type(err).__name__, err)
    if failed:
        raise SystemExit(1)
    print("mcts mechanics tests ok")


if __name__ == "__main__":
    main()
