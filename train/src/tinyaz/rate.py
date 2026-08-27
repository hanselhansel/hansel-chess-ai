"""Rate a candidate: 1-visit vs snapshot, 64-visit vs SF1320, 1-visit vs random."""

from __future__ import annotations

import shutil
from pathlib import Path

import chess
import numpy as np
import torch

from .constants import PLAY_VISITS, SNAPSHOT_VISITS
from .mcts import NetEval, best_move, search_root
from .outcome import z_white
from .pack import load_model
from .uci import Stockfish

OPENINGS = ((), ("e2e4", "e7e5"), ("e2e4", "c7c5"), ("d2d4", "d7d5"))
MAX_PLIES = 160
RANDOM_MAX_PLIES = 240


def _cpu_eval(path: Path) -> NetEval:
    torch.set_num_threads(1)
    model, _ = load_model(path)
    model.to("cpu")
    model.eval()
    return NetEval(model, device=torch.device("cpu"))


def _move(board: chess.Board, ev: NetEval, visits: int) -> chess.Move:
    root = search_root(board, visits, ev, add_noise=False)
    return best_move(root)


def _play_pair(
    ev_a: NetEval,
    ev_b: NetEval,
    a_white: bool,
    visits: int,
    opening: tuple[str, ...],
    max_plies: int = MAX_PLIES,
) -> float:
    board = chess.Board()
    for u in opening:
        board.push_uci(u)
    plies = 0
    while not board.is_game_over() and plies < max_plies:
        our = (board.turn == chess.WHITE) == a_white
        board.push(_move(board, ev_a if our else ev_b, visits))
        plies += 1
    z = z_white(board)
    return z if a_white else -z


def vs_snapshot(
    cand: Path,
    snapshot: Path,
    games: int = 8,
    visits: int = SNAPSHOT_VISITS,
) -> dict:
    ev_c = _cpu_eval(cand)
    ev_s = _cpu_eval(snapshot)
    wins = draws = losses = 0
    n = 0
    for opening in OPENINGS:
        for cand_white in (True, False):
            if n >= games:
                break
            z = _play_pair(ev_c, ev_s, cand_white, visits, opening)
            if z > 0:
                wins += 1
            elif z < 0:
                losses += 1
            else:
                draws += 1
            n += 1
        if n >= games:
            break
    return {
        "visits": visits,
        "games": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "score": (wins + 0.5 * draws) / n if n else 0.0,
    }


def vs_random(cand: Path, games: int = 20, visits: int = 1, seed: int = 2026) -> dict:
    ev = _cpu_eval(cand)
    rng = np.random.default_rng(seed)
    wins = draws = losses = 0
    for i in range(games):
        net_white = i % 2 == 0
        board = chess.Board()
        plies = 0
        while not board.is_game_over() and plies < RANDOM_MAX_PLIES:
            net_turn = (board.turn == chess.WHITE) == net_white
            if net_turn:
                board.push(_move(board, ev, visits))
            else:
                legal = list(board.legal_moves)
                board.push(legal[int(rng.integers(0, len(legal)))])
            plies += 1
        z = z_white(board)
        if not net_white:
            z = -z
        if z > 0:
            wins += 1
        elif z < 0:
            losses += 1
        else:
            draws += 1
    n = wins + draws + losses
    score = (wins + 0.5 * draws) / n if n else 0.0
    return {
        "visits": visits,
        "games": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "score": score,
        "passed": score >= 0.7 and wins > losses,
        "adjudication": "mate, else material≥4 after 240 ply",
    }


def resolve_stockfish(sf_path: Path | None = None) -> Path | None:
    if sf_path is not None and sf_path.exists():
        return sf_path
    found = shutil.which("stockfish")
    return Path(found) if found else None


def vs_stockfish_64(
    cand: Path,
    elo: int = 1320,
    sf_path: Path | None = None,
    visits: int = PLAY_VISITS,
) -> dict | None:
    binary = resolve_stockfish(sf_path)
    if binary is None:
        print("Stockfish missing — 64-visit SF rate skipped (not rated)", flush=True)
        return None
    ev = _cpu_eval(cand)
    sf = Stockfish(binary, elo=elo, movetime_ms=100)
    wins = draws = losses = 0
    try:
        for opening in OPENINGS:
            for tiny_white in (True, False):
                board = chess.Board()
                for u in opening:
                    board.push_uci(u)
                sf.new_game()
                plies = 0
                while not board.is_game_over() and plies < MAX_PLIES:
                    our = (board.turn == chess.WHITE) == tiny_white
                    if our:
                        board.push(_move(board, ev, visits))
                    else:
                        board.push_uci(sf.bestmove(board.fen()))
                    plies += 1
                z = z_white(board)
                if not tiny_white:
                    z = -z
                if z > 0:
                    wins += 1
                elif z < 0:
                    losses += 1
                else:
                    draws += 1
                print(
                    f"  SF{elo} {'W' if tiny_white else 'B'} "
                    f"{'1-0' if z > 0 else '0-1' if z < 0 else '1/2'} "
                    f"plies {plies} WDL {wins}-{draws}-{losses}",
                    flush=True,
                )
    finally:
        sf.quit()
    n = wins + draws + losses
    return {
        "visits": visits,
        "uciElo": elo,
        "games": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "score": (wins + 0.5 * draws) / n if n else 0.0,
    }
