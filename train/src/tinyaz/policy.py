"""73-plane AlphaZero move encoding. Must match src/lib/chess/policy.ts."""

from __future__ import annotations

from .constants import KNIGHT_DELTAS, POLICY_PLANES, QUEEN_DIRS, algebraic_to_index, file_of, flip_index, rank_of


def _sign(x: int) -> int:
    return 0 if x == 0 else (1 if x > 0 else -1)


def move_to_plane(frm: int, to: int, promotion: str | None) -> int:
    fr, ff = rank_of(frm), file_of(frm)
    tr, tf = rank_of(to), file_of(to)
    dr, df = tr - fr, tf - ff

    if promotion and promotion != "q":
        piece_idx = {"n": 0, "b": 1, "r": 2}.get(promotion)
        if piece_idx is None:
            return -1
        dir_idx = df + 1
        if dir_idx < 0 or dir_idx > 2:
            return -1
        return 64 + piece_idx * 3 + dir_idx

    for k, (kd, kr) in enumerate(KNIGHT_DELTAS):
        if df == kd and dr == kr:
            return 56 + k

    for d, (ddf, ddr) in enumerate(QUEEN_DIRS):
        if ddf == 0 and df != 0:
            continue
        if ddr == 0 and dr != 0:
            continue
        if ddf != 0 and ddr != 0 and abs(df) != abs(dr):
            continue
        if _sign(df) != _sign(ddf) and df != 0:
            continue
        if _sign(dr) != _sign(ddr) and dr != 0:
            continue
        dist = max(abs(df), abs(dr))
        if dist < 1 or dist > 7:
            continue
        if ddf != 0 and abs(df) != dist:
            continue
        if ddr != 0 and abs(dr) != dist:
            continue
        return d * 7 + (dist - 1)
    return -1


def encode_move_plane(from_alg: str, to_alg: str, promotion: str | None, flip: bool) -> tuple[int, int]:
    frm = algebraic_to_index(from_alg)
    to = algebraic_to_index(to_alg)
    if flip:
        frm = flip_index(frm)
        to = flip_index(to)
    return frm, move_to_plane(frm, to, promotion)


def move_index(move, flip: bool) -> tuple[int, int]:
    """python-chess Move → (stm-from, plane)."""
    import chess

    frm = move.from_square
    to = move.to_square
    if flip:
        frm = flip_index(frm)
        to = flip_index(to)
    promo = None
    if move.promotion:
        promo = {chess.KNIGHT: "n", chess.BISHOP: "b", chess.ROOK: "r", chess.QUEEN: "q"}.get(
            move.promotion
        )
    return frm, move_to_plane(frm, to, promo)


def policy_target_index(from_alg: str, to_alg: str, promotion: str | None, flip: bool) -> int:
    frm, plane = encode_move_plane(from_alg, to_alg, promotion, flip)
    if plane < 0 or plane >= POLICY_PLANES:
        return -1
    return plane * 64 + frm
