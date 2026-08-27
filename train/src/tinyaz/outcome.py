"""Game outcomes. Mate, else material ≥4. Used by generate and rate."""

from __future__ import annotations

import chess

_VAL = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}


def material_white(board: chess.Board) -> int:
    s = 0
    for _, p in board.piece_map().items():
        s += _VAL[p.piece_type] * (1 if p.color == chess.WHITE else -1)
    return s


def z_white(board: chess.Board) -> float:
    if board.is_checkmate():
        return -1.0 if board.turn == chess.WHITE else 1.0
    if board.is_game_over():
        return 0.0
    mat = material_white(board)
    if abs(mat) >= 4:
        return 1.0 if mat > 0 else -1.0
    return 0.0
