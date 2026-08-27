"""Self-play at TRAIN_VISITS. CPU workers. Appends jsonl per game."""

from __future__ import annotations

import json
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import chess
import numpy as np
import torch

from .constants import TRAIN_VISITS
from .mcts import NetEval, search_root
from .outcome import z_white
from .pack import load_model
from .policy import move_index

MAX_PLIES = 160
TEMP_MOVES = 12


def _append_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def play_game(ev: NetEval, visits: int, rng: np.random.Generator) -> tuple[list[dict], float]:
    board = chess.Board()
    rows: list[dict] = []
    plies = 0
    while not board.is_game_over() and plies < MAX_PLIES:
        temp = 1.0 if plies < TEMP_MOVES else 0.0
        root = search_root(board, visits, ev, add_noise=True)
        visits_arr = np.array([ch.visits for ch in root.children], dtype=np.float64)
        total = float(visits_arr.sum())
        if total <= 0:
            visits_arr = np.array([ch.prior for ch in root.children], dtype=np.float64)
            total = float(visits_arr.sum())
        if total <= 0:
            break
        pi = visits_arr / total
        if temp <= 1e-6:
            idx = int(np.argmax(visits_arr))
        else:
            w = np.power(np.maximum(pi, 1e-12), 1.0 / temp)
            w = w / w.sum()
            idx = int(rng.choice(len(root.children), p=w))
        move = root.children[idx].move
        assert move is not None
        flip = board.turn == chess.BLACK
        dist = []
        for ch, p in zip(root.children, pi, strict=True):
            if p <= 0 or ch.move is None:
                continue
            frm, plane = move_index(ch.move, flip)
            if plane < 0:
                continue
            dist.append([int(plane * 64 + frm), float(p)])
        rows.append({"fen": board.fen(), "pi": dist, "stm_white": board.turn == chess.WHITE})
        board.push(move)
        plies += 1
    zw = z_white(board)
    out = [{"fen": r["fen"], "pi": r["pi"], "value": zw if r["stm_white"] else -zw} for r in rows]
    return out, zw


def _eval_from(weights_path: Path) -> NetEval:
    torch.set_num_threads(1)
    model, _ = load_model(weights_path)
    model.to("cpu")
    model.eval()
    return NetEval(model, device=torch.device("cpu"))


def _worker(payload: tuple[str, int, int, int, str]) -> tuple[list[dict], tuple[int, int, int]]:
    weights_path, games, seed, visits, out_jsonl = payload
    ev = _eval_from(Path(weights_path))
    rng = np.random.default_rng(seed)
    rows: list[dict] = []
    w = d = l = 0
    out = Path(out_jsonl)
    for i in range(games):
        r, z = play_game(ev, visits, rng)
        _append_jsonl(out, r)
        rows.extend(r)
        if z > 0:
            w += 1
        elif z < 0:
            l += 1
        else:
            d += 1
        if (i + 1) % 8 == 0 or i + 1 == games:
            print(f"  worker {seed} {i + 1}/{games} pos {len(rows)} WDL {w}-{d}-{l}", flush=True)
    return rows, (w, d, l)


def generate(
    weights_path: Path,
    games: int,
    visits: int = TRAIN_VISITS,
    workers: int = 1,
    out_jsonl: Path | None = None,
) -> list[dict]:
    if games <= 0:
        return []
    if out_jsonl is None:
        raise ValueError("out_jsonl is required")
    n = max(1, workers)
    if n == 1:
        rows, _wdl = _worker((str(weights_path), games, 2026, visits, str(out_jsonl)))
        print(f"self-play {games} games  pos {len(rows)}  visits {visits}", flush=True)
        return rows
    base = games // n
    extra = games % n
    jobs = []
    shards: list[Path] = []
    for i in range(n):
        g = base + (1 if i < extra else 0)
        if g:
            shard = out_jsonl.with_name(f"{out_jsonl.stem}.w{i}{out_jsonl.suffix}")
            shards.append(shard)
            jobs.append((str(weights_path), g, 2026 + i * 997, visits, str(shard)))
    rows: list[dict] = []
    w = d = l = 0
    with ProcessPoolExecutor(max_workers=n) as ex:
        for part, wdl in ex.map(_worker, jobs):
            rows.extend(part)
            w += wdl[0]
            d += wdl[1]
            l += wdl[2]
    out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with out_jsonl.open("a") as dest:
        for shard in shards:
            if shard.exists():
                dest.write(shard.read_text())
                shard.unlink()
    print(f"self-play {games} games  pos {len(rows)}  WDL {w}-{d}-{l}  visits {visits}", flush=True)
    return rows
