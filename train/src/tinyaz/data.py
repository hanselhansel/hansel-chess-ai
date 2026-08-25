"""Stream a Lichess PGN (zst or plain) into (fen, target, value) rows. Split by game."""

from __future__ import annotations

import io
import json
from pathlib import Path

import chess
import chess.pgn
import zstandard as zstd

from .policy import policy_target_index

RESULT_Z = {"1-0": 1.0, "0-1": -1.0, "1/2-1/2": 0.0}


def _open_pgn(path: Path):
    raw = path.open("rb")
    if path.suffix == ".zst":
        reader = zstd.ZstdDecompressor().stream_reader(raw)
        return io.TextIOWrapper(reader, encoding="utf-8", errors="replace"), raw
    raw.close()
    return path.open("r", encoding="utf-8", errors="replace"), None


def iter_games(path: Path, max_games: int, min_plies: int = 16):
    text, raw = _open_pgn(path)
    n = 0
    try:
        while n < max_games:
            game = chess.pgn.read_game(text)
            if game is None:
                break
            result = game.headers.get("Result", "*")
            if result not in RESULT_Z:
                continue
            plies = 0
            node = game
            while node.variations:
                node = node.variations[0]
                plies += 1
            if plies < min_plies:
                continue
            n += 1
            yield game, result, n
    finally:
        text.close()
        if raw is not None:
            raw.close()


def game_rows(game: chess.pgn.Game, result: str) -> list[dict]:
    z_white = RESULT_Z[result]
    board = game.board()
    rows: list[dict] = []
    for move in game.mainline_moves():
        flip = board.turn == chess.BLACK
        uci = move.uci()
        promo = uci[4] if len(uci) > 4 else None
        target = policy_target_index(uci[0:2], uci[2:4], promo, flip)
        if target >= 0:
            stm_z = z_white if board.turn == chess.WHITE else -z_white
            rows.append({"fen": board.fen(), "target": target, "value": stm_z})
        board.push(move)
    return rows


def write_jsonl(
    pgn_path: Path,
    out_train: Path,
    out_val: Path,
    max_games: int,
    val_every: int = 10,
    max_positions: int = 80_000,
) -> dict:
    out_train.parent.mkdir(parents=True, exist_ok=True)
    n_train_g = n_val_g = 0
    n_train_p = n_val_p = 0
    with out_train.open("w") as ft, out_val.open("w") as fv:
        for game, result, n in iter_games(pgn_path, max_games):
            rows = game_rows(game, result)
            val = n % val_every == 0
            dest = fv if val else ft
            written = 0
            for row in rows:
                if not val and n_train_p >= max_positions:
                    break
                dest.write(json.dumps(row) + "\n")
                written += 1
            if val:
                n_val_g += 1
                n_val_p += written
            else:
                n_train_g += 1
                n_train_p += written
            if n_train_p >= max_positions:
                break
    return {
        "train_games": n_train_g,
        "val_games": n_val_g,
        "train_positions": n_train_p,
        "val_positions": n_val_p,
    }
