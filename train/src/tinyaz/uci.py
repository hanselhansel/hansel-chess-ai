"""Stockfish UCI wrapper. Ruler only — never used as a teacher."""

from __future__ import annotations

import subprocess
from pathlib import Path


class Stockfish:
    def __init__(self, path: Path, elo: int, movetime_ms: int = 100, hash_mb: int = 16) -> None:
        self.movetime_ms = movetime_ms
        self.p = subprocess.Popen(
            [str(path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        assert self.p.stdin and self.p.stdout
        self._send("uci")
        self._wait("uciok")
        self._send("setoption name UCI_LimitStrength value true")
        self._send(f"setoption name UCI_Elo value {elo}")
        self._send("setoption name Threads value 1")
        self._send(f"setoption name Hash value {hash_mb}")
        self._send("setoption name Ponder value false")
        self._send("isready")
        self._wait("readyok")

    def _send(self, line: str) -> None:
        assert self.p.stdin
        self.p.stdin.write(line + "\n")
        self.p.stdin.flush()

    def _wait(self, token: str) -> str:
        assert self.p.stdout
        while True:
            line = self.p.stdout.readline()
            if not line:
                raise RuntimeError("stockfish exited")
            if token in line:
                return line.rstrip("\n")

    def new_game(self) -> None:
        self._send("ucinewgame")
        self._send("isready")
        self._wait("readyok")

    def bestmove(self, fen: str) -> str:
        self._send(f"position fen {fen}")
        self._send(f"go movetime {self.movetime_ms}")
        while True:
            line = self._wait("bestmove")
            parts = line.split()
            if len(parts) >= 2 and parts[0] == "bestmove":
                mv = parts[1]
                if mv in ("(none)", "0000"):
                    raise RuntimeError(f"stockfish gave no move: {line}")
                return mv

    def quit(self) -> None:
        try:
            self._send("quit")
            self.p.wait(timeout=5)
        except Exception:
            self.p.kill()
