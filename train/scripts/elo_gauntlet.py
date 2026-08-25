#!/usr/bin/env python3
"""64-visit Elo vs Stockfish UCI_Elo. Ruler only. Never mix with 1-visit."""

from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

import chess
import torch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS, flops_per_eval, param_count  # noqa: E402
from tinyaz.mcts import NetEval, best_move, search_root  # noqa: E402
from tinyaz.pack import load_model  # noqa: E402
from tinyaz.uci import Stockfish  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"
SF_PATH = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "train/bin/stockfish")
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"

ELOS = (1320, 1500, 1800, 2000)
MOVETIME_MS = 100
MAX_PLIES = 160
VISITS = PLAY_VISITS
OPENINGS = (
    ("start", ()),
    ("open", ("e2e4", "e7e5")),
    ("sicilian", ("e2e4", "c7c5")),
    ("qpawn", ("d2d4", "d7d5")),
)


def _material(board: chess.Board) -> int:
    vals = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
    s = 0
    for _, p in board.piece_map().items():
        s += vals[p.piece_type] * (1 if p.color == chess.WHITE else -1)
    return s


def _z_white(board: chess.Board) -> float:
    if board.is_checkmate():
        return -1.0 if board.turn == chess.WHITE else 1.0
    if board.is_game_over():
        return 0.0
    mat = _material(board)
    if abs(mat) >= 4:
        return 1.0 if mat > 0 else -1.0
    return 0.0


def play_game(ev: NetEval, sf: Stockfish, opening: tuple[str, ...], tiny_white: bool) -> dict:
    board = chess.Board()
    for u in opening:
        board.push_uci(u)
    sf.new_game()
    plies = 0
    while not board.is_game_over() and plies < MAX_PLIES:
        our_turn = (board.turn == chess.WHITE) == tiny_white
        if our_turn:
            root = search_root(board, VISITS, ev, add_noise=False)
            mv = best_move(root)
            board.push(mv)
        else:
            uci = sf.bestmove(board.fen())
            board.push_uci(uci)
        plies += 1
    z = _z_white(board)
    if not tiny_white:
        z = -z
    if z > 0:
        score = 1.0
        result = "1-0"
    elif z < 0:
        score = 0.0
        result = "0-1"
    else:
        score = 0.5
        result = "1/2"
    return {"plies": plies, "score": score, "result": result, "tinyWhite": tiny_white}


def mle_elo(obs: list[tuple[int, float]]) -> dict:
    """1D MLE. All-loss vs 1320 → report <1320 instead of inventing a number."""
    if not obs:
        return {"elo": None, "label": "unrated", "lo": None, "hi": None}

    def nll(r: float) -> float:
        s = 0.0
        for opp, sc in obs:
            p = 1.0 / (1.0 + 10 ** ((opp - r) / 400.0))
            p = min(max(p, 1e-6), 1 - 1e-6)
            s += -(sc * math.log(p) + (1 - sc) * math.log(1 - p))
        return s

    grid = list(range(800, 2401, 5))
    scores = [nll(r) for r in grid]
    best_i = min(range(len(grid)), key=lambda i: scores[i])
    best = grid[best_i]
    min_nll = scores[best_i]
    lo = hi = best
    for r, n in zip(grid, scores, strict=True):
        if 2 * (n - min_nll) <= 3.84:
            lo = min(lo, r)
            hi = max(hi, r)

    vs_floor = [sc for opp, sc in obs if opp == 1320]
    mean_floor = sum(vs_floor) / len(vs_floor) if vs_floor else 0.5
    vs_ceil = [sc for opp, sc in obs if opp == 2000]
    mean_ceil = sum(vs_ceil) / len(vs_ceil) if vs_ceil else 0.5

    if mean_floor < 0.15 and best <= 1320:
        return {"elo": None, "label": "<1320", "lo": None, "hi": 1320, "mle": best}
    if mean_ceil > 0.85 and best >= 2000:
        return {"elo": None, "label": ">2000", "lo": 2000, "hi": None, "mle": best}
    return {"elo": best, "label": str(best), "lo": lo, "hi": hi, "mle": best}


def merge_meta(gauntlet: dict) -> None:
    meta = {}
    if META_PUBLIC.exists():
        meta = json.loads(META_PUBLIC.read_text())
    meta["gauntletElo"] = gauntlet
    meta["flopsPerEval"] = flops_per_eval()
    meta["params"] = param_count()
    text = json.dumps(meta, indent=2)
    META_PUBLIC.write_text(text)
    META_SRC.write_text(text)


def main() -> None:
    torch.set_num_threads(2)
    if not SF_PATH.exists():
        raise SystemExit(f"no stockfish at {SF_PATH}")
    if not WEIGHTS.exists():
        raise SystemExit(f"no weights at {WEIGHTS}")
    model, src = load_model(WEIGHTS)
    model.eval()
    ev = NetEval(model)
    print(f"tinyaz-s source={src} visits={VISITS} vs Stockfish 18 UCI_Elo {list(ELOS)}", flush=True)

    obs: list[tuple[int, float]] = []
    levels = []
    t0 = time.time()
    for elo in ELOS:
        sf = Stockfish(SF_PATH, elo=elo, movetime_ms=MOVETIME_MS)
        wins = draws = losses = 0
        games = []
        try:
            for name, moves in OPENINGS:
                for tiny_white in (True, False):
                    g = play_game(ev, sf, moves, tiny_white)
                    obs.append((elo, g["score"]))
                    games.append({"opening": name, **g})
                    if g["score"] == 1:
                        wins += 1
                    elif g["score"] == 0:
                        losses += 1
                    else:
                        draws += 1
                    print(
                        f"  SF{elo} {name} {'W' if tiny_white else 'B'} "
                        f"{g['result']} plies {g['plies']}  WDL {wins}-{draws}-{losses}  "
                        f"{time.time() - t0:.0f}s",
                        flush=True,
                    )
        finally:
            sf.quit()
        n = wins + draws + losses
        levels.append(
            {
                "uciElo": elo,
                "games": n,
                "wins": wins,
                "draws": draws,
                "losses": losses,
                "score": (wins + 0.5 * draws) / n,
                "gamesDetail": games,
            }
        )

    est = mle_elo(obs)
    gauntlet = {
        "visits": VISITS,
        "stockfish": "18",
        "uciEloMin": 1320,
        "uciEloMax": 3190,
        "movetimeMs": MOVETIME_MS,
        "openings": [n for n, _ in OPENINGS],
        "coloursSwapped": True,
        "adjudication": "mate, else material≥4 after 160 ply",
        "levels": [{k: v for k, v in lv.items() if k != "gamesDetail"} for lv in levels],
        "estimatedElo": est["elo"],
        "eloLabel": est["label"],
        "eloLo": est["lo"],
        "eloHi": est["hi"],
        "games": len(obs),
        "note": "64-visit Elo vs Stockfish 18 UCI_LimitStrength. Not a 1-visit number. Not a Lichess rating.",
    }
    merge_meta(gauntlet)
    print(json.dumps({**gauntlet, "levels": gauntlet["levels"]}, indent=2), flush=True)
    print(f"published 64-visit Elo {est['label']}  ({time.time() - t0:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
