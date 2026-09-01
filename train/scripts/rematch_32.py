#!/usr/bin/env python3
"""32-game 64-visit rematch vs SF1500 and SF1800. Extra openings, no noise."""

from __future__ import annotations

import sys
from pathlib import Path

import chess

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))
sys.path.insert(0, str(ROOT / "train" / "scripts"))

from elo_gauntlet import mle_elo  # noqa: E402
from tinyaz.constants import PLAY_VISITS  # noqa: E402
from tinyaz.mcts import best_move, search_root  # noqa: E402
from tinyaz.outcome import z_white  # noqa: E402
from tinyaz.rate import _cpu_eval, resolve_stockfish  # noqa: E402
from tinyaz.uci import Stockfish  # noqa: E402

CAND = ROOT / "train/checkpoints/tinyaz-m-mo2014-02.bin"
SF_PATH = ROOT / "train/bin/stockfish"
MAX_PLIES = 160
OPENINGS = (
    (),
    ("e2e4", "e7e5"),
    ("e2e4", "c7c5"),
    ("d2d4", "d7d5"),
    ("e2e4", "e7e6"),
    ("e2e4", "c7c6"),
    ("d2d4", "g8f6"),
    ("c2c4",),
    ("g1f3",),
    ("e2e4", "d7d5"),
    ("e2e4", "g8f6"),
    ("d2d4", "c7c5"),
    ("e2e4", "g7g6"),
    ("d2d4", "g7g6"),
    ("e2e4", "d7d6"),
    ("c2c4", "e7e5"),
)


def _play(ev, sf: Stockfish, opening: tuple[str, ...], tiny_white: bool, visits: int) -> tuple[float, int]:
    board = chess.Board()
    for u in opening:
        board.push_uci(u)
    sf.new_game()
    plies = 0
    while not board.is_game_over() and plies < MAX_PLIES:
        our = (board.turn == chess.WHITE) == tiny_white
        if our:
            root = search_root(board, visits, ev, add_noise=False)
            board.push(best_move(root))
        else:
            board.push_uci(sf.bestmove(board.fen()))
        plies += 1
    z = z_white(board)
    if not tiny_white:
        z = -z
    return z, plies


def rate(cand: Path, elo: int, visits: int = PLAY_VISITS) -> dict:
    binary = resolve_stockfish(SF_PATH if SF_PATH.exists() else None)
    if binary is None:
        raise SystemExit("stockfish missing")
    ev = _cpu_eval(cand)
    sf = Stockfish(binary, elo=elo, movetime_ms=100)
    wins = draws = losses = 0
    try:
        for opening in OPENINGS:
            for tiny_white in (True, False):
                z, plies = _play(ev, sf, opening, tiny_white, visits)
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
        "openings": len(OPENINGS),
    }


def _expand(elo: int, w: int, d: int, l: int) -> list[tuple[int, float]]:
    return [(elo, 1.0)] * w + [(elo, 0.5)] * d + [(elo, 0.0)] * l


def main() -> None:
    if not CAND.exists():
        raise SystemExit(f"missing {CAND}")
    print(f"rematch 32 {CAND.name} visits {PLAY_VISITS}", flush=True)
    sf1500 = rate(CAND, 1500)
    print("vs SF1500", sf1500, flush=True)
    sf1800 = rate(CAND, 1800)
    print("vs SF1800", sf1800, flush=True)
    obs = _expand(1320, 8, 0, 0)
    obs += _expand(1500, sf1500["wins"], sf1500["draws"], sf1500["losses"])
    obs += _expand(1800, sf1800["wins"], sf1800["draws"], sf1800["losses"])
    est = mle_elo(obs)
    print("MLE with original 8-game SF1320 8-0 plus this 32+32", est, flush=True)
    print(
        f"floor check: 1500 {sf1500['score']:.4g} vs published 0.875; "
        f"1800 {sf1800['score']:.4g} vs published 0.4375",
        flush=True,
    )


if __name__ == "__main__":
    main()
