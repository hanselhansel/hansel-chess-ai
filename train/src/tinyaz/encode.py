"""STM-canonical 19-plane encoder. Must match src/lib/chess/encode.ts."""

from __future__ import annotations

import chess
import numpy as np

from .constants import N_PLANES, SQUARES, algebraic_to_index, flip_index

PIECE_ORDER = (
    chess.PAWN,
    chess.KNIGHT,
    chess.BISHOP,
    chess.ROOK,
    chess.QUEEN,
    chess.KING,
)


def encode_board(board: chess.Board) -> np.ndarray:
    """Return float32 length 19*64, same layout as the JS encoder."""
    out = np.zeros(N_PLANES * SQUARES, dtype=np.float32)
    us_white = board.turn == chess.WHITE
    flip = not us_white

    for sq, piece in board.piece_map().items():
        i = flip_index(sq) if flip else sq
        ours = piece.color == (chess.WHITE if us_white else chess.BLACK)
        idx = PIECE_ORDER.index(piece.piece_type)
        plane = idx if ours else 6 + idx
        out[plane * 64 + i] = 1.0

    def fill(plane: int) -> None:
        out[plane * 64 : (plane + 1) * 64] = 1.0

    if us_white:
        if board.has_kingside_castling_rights(chess.WHITE):
            fill(12)
        if board.has_queenside_castling_rights(chess.WHITE):
            fill(13)
        if board.has_kingside_castling_rights(chess.BLACK):
            fill(14)
        if board.has_queenside_castling_rights(chess.BLACK):
            fill(15)
    else:
        if board.has_kingside_castling_rights(chess.BLACK):
            fill(12)
        if board.has_queenside_castling_rights(chess.BLACK):
            fill(13)
        if board.has_kingside_castling_rights(chess.WHITE):
            fill(14)
        if board.has_queenside_castling_rights(chess.WHITE):
            fill(15)

    if board.ep_square is not None:
        i = flip_index(board.ep_square) if flip else board.ep_square
        out[16 * 64 + i] = 1.0

    parts = board.fen().split(" ")
    half_n = min(int(parts[4]) / 100.0, 1.0)
    full_n = min(int(parts[5]) / 200.0, 1.0)
    out[17 * 64 : 18 * 64] = half_n
    out[18 * 64 : 19 * 64] = full_n
    return out


def planes_nchw(board: chess.Board) -> np.ndarray:
    """(19, 8, 8) rank-major, file-minor — matches JS plane*64 + rank*8 + file."""
    return encode_board(board).reshape(N_PLANES, 8, 8)


def algebraic_ep_index(ep: str, flip: bool) -> int:
    i = algebraic_to_index(ep)
    return flip_index(i) if flip else i
