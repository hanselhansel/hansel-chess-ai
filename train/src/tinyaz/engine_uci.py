"""tinyaz as a UCI engine. Published search is 64 visits. Not a Stockfish wrapper."""

from __future__ import annotations

import time
from pathlib import Path

import chess
import torch

from .constants import PLAY_VISITS
from .mcts import NetEval, best_move, search_root
from .pack import load_model

ENGINE_NAME = "hansel-chess-ai"
ENGINE_AUTHOR = "Hansel"
MIN_VISITS = 1
MAX_VISITS = 4096
LOW_TIME_MS = 300


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_weights() -> Path:
    return repo_root() / "public" / "weights" / "tinyaz-m.bin"


def parse_go(parts: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    keys = {"movetime", "nodes", "depth", "wtime", "btime", "winc", "binc", "movestogo"}
    i = 1
    while i < len(parts):
        key = parts[i]
        if key in keys and i + 1 < len(parts):
            try:
                out[key] = int(parts[i + 1])
            except ValueError:
                pass
            i += 2
            continue
        i += 1
    return out


def clamp_visits(n: int) -> int:
    return max(MIN_VISITS, min(MAX_VISITS, n))


class TinyazUci:
    def __init__(
        self,
        weights: Path | None = None,
        visits: int = PLAY_VISITS,
        device: str = "cpu",
    ) -> None:
        self.weights = Path(weights) if weights else default_weights()
        self.visits = clamp_visits(visits)
        self.device_name = device
        self.board = chess.Board()
        self._ev: NetEval | None = None

    def ensure_eval(self) -> NetEval:
        if self._ev is not None:
            return self._ev
        if not self.weights.is_file():
            raise FileNotFoundError(f"weights not found: {self.weights}")
        torch.set_num_threads(1)
        model, _ = load_model(self.weights)
        device = torch.device(self.device_name)
        model.to(device)
        model.eval()
        self._ev = NetEval(model, device=device)
        return self._ev

    def visits_for_go(self, go: dict[str, int]) -> int:
        if "nodes" in go:
            return clamp_visits(go["nodes"])
        remaining = go.get("wtime") if self.board.turn == chess.WHITE else go.get("btime")
        if remaining is not None and remaining < LOW_TIME_MS:
            return MIN_VISITS
        return self.visits

    def search(self, visits: int) -> tuple[chess.Move, float, int]:
        ev = self.ensure_eval()
        t0 = time.perf_counter()
        root = search_root(self.board, visits, ev, add_noise=False)
        ms = int((time.perf_counter() - t0) * 1000)
        q = 0.0 if root.visits == 0 else root.value_sum / root.visits
        return best_move(root), q, ms

    def apply_position(self, parts: list[str]) -> None:
        if len(parts) < 2:
            return
        if parts[1] == "startpos":
            self.board.reset()
            if "moves" in parts:
                start = parts.index("moves") + 1
                for u in parts[start:]:
                    self.board.push_uci(u)
            return
        if parts[1] == "fen":
            if "moves" in parts:
                idx = parts.index("moves")
                fen = " ".join(parts[2:idx])
                moves = parts[idx + 1 :]
            else:
                fen = " ".join(parts[2:])
                moves = []
            self.board.set_fen(fen)
            for u in moves:
                self.board.push_uci(u)

    def handle(self, line: str) -> list[str]:
        text = line.strip()
        if not text:
            return []
        parts = text.split()
        cmd = parts[0]
        if cmd == "uci":
            return [
                f"id name {ENGINE_NAME}",
                f"id author {ENGINE_AUTHOR}",
                f"option name Visits type spin default {PLAY_VISITS} min {MIN_VISITS} max {MAX_VISITS}",
                f"option name Weights type string default {default_weights()}",
                "uciok",
            ]
        if cmd == "isready":
            self.ensure_eval()
            return ["readyok"]
        if cmd == "ucinewgame":
            self.board.reset()
            return []
        if cmd == "position":
            self.apply_position(parts)
            return []
        if cmd == "setoption" and len(parts) >= 5 and parts[1] == "name":
            if "value" not in parts:
                return []
            vidx = parts.index("value")
            name = " ".join(parts[2:vidx]).lower()
            value = " ".join(parts[vidx + 1 :])
            if name == "visits":
                self.visits = clamp_visits(int(value))
            elif name == "weights":
                self.weights = Path(value)
                self._ev = None
            return []
        if cmd == "go":
            go = parse_go(parts)
            visits = self.visits_for_go(go)
            move, q, ms = self.search(visits)
            nps = 0 if ms <= 0 else int(visits * 1000 / ms)
            cp = int(round(q * 1000))
            return [
                f"info depth 1 nodes {visits} nps {nps} time {ms} score cp {cp} pv {move.uci()}",
                f"bestmove {move.uci()}",
            ]
        if cmd == "quit":
            return ["#quit"]
        return []


def run_stdio(engine: TinyazUci | None = None) -> None:
    import sys

    eng = engine or TinyazUci()
    for raw in sys.stdin:
        for out in eng.handle(raw):
            if out == "#quit":
                return
            print(out, flush=True)
