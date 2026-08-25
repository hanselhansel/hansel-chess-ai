#!/usr/bin/env python3
"""Phase 2: 64-visit self-play fine-tune. Keep Phase 1 if the run is void."""

from __future__ import annotations

import json
import shutil
import sys
import time
from pathlib import Path

import chess
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import SOURCE_SELFPLAY_64, param_count  # noqa: E402
from tinyaz.encode import planes_nchw  # noqa: E402
from tinyaz.mcts import NetEval, best_move, search_root  # noqa: E402
from tinyaz.model import TinyAZ  # noqa: E402
from tinyaz.pack import load_model, pack_model  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402

LICHESS_JSONL = ROOT / "train/data/train.jsonl"
SP_JSONL = ROOT / "train/data/selfplay.jsonl"
PHASE1 = ROOT / "public/weights/tinyaz-s.bin"
CKPT_SP = ROOT / "train/checkpoints/tinyaz-s-sp.bin"
META = ROOT / "train/checkpoints/tinyaz-s-sp.meta.json"
LICHESS_BAK = ROOT / "public/weights/tinyaz-s-lichess.bin"

GAMES = 64
VISITS = 64
MAX_PLIES = 160
TEMP_MOVES = 12
EPOCHS = 2
BATCH = 64
LR = 3e-4
LICHESS_MIX = 8000


def _material(board: chess.Board) -> int:
    vals = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0,
    }
    s = 0
    for sq, p in board.piece_map().items():
        s += vals[p.piece_type] * (1 if p.color == chess.WHITE else -1)
    return s


def _outcome(board: chess.Board) -> float:
    """White-perspective result in [-1, 1]."""
    if board.is_checkmate():
        return -1.0 if board.turn == chess.WHITE else 1.0
    if board.is_game_over():
        return 0.0
    mat = _material(board)
    if abs(mat) >= 4:
        return 1.0 if mat > 0 else -1.0
    return 0.0


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
    z_white = _outcome(board)
    out = []
    for row in rows:
        z = z_white if row["stm_white"] else -z_white
        out.append({"fen": row["fen"], "pi": row["pi"], "value": z})
    return out, z_white


def selfplay(model: TinyAZ, games: int, visits: int) -> list[dict]:
    ev = NetEval(model)
    rng = np.random.default_rng(2026)
    all_rows: list[dict] = []
    t0 = time.time()
    wins = draws = losses = 0
    for g in range(1, games + 1):
        rows, z = play_game(ev, visits, rng)
        all_rows.extend(rows)
        if z > 0:
            wins += 1
        elif z < 0:
            losses += 1
        else:
            draws += 1
        print(
            f"sp {g}/{games}  plies {len(rows)}  z {z:+.0f}  "
            f"pos {len(all_rows)}  {time.time() - t0:.0f}s  "
            f"WDL {wins}-{draws}-{losses}",
            flush=True,
        )
    return all_rows


class MixDataset(Dataset):
    def __init__(self, rows: list[dict]):
        self.rows = rows

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        row = self.rows[i]
        board = chess.Board(row["fen"])
        x = torch.from_numpy(np.ascontiguousarray(planes_nchw(board)))
        pi = row.get("pi")
        if pi:
            idx = torch.tensor([p[0] for p in pi], dtype=torch.long)
            w = torch.tensor([p[1] for p in pi], dtype=torch.float32)
        else:
            idx = torch.tensor([row["target"]], dtype=torch.long)
            w = torch.tensor([1.0], dtype=torch.float32)
        v = torch.tensor(row["value"], dtype=torch.float32)
        return x, idx, w, v


def collate(batch):
    xs, idxs, ws, vs = zip(*batch, strict=True)
    return torch.stack(xs, 0), list(idxs), list(ws), torch.stack(vs, 0)


def load_lichess_mix(n: int) -> list[dict]:
    if not LICHESS_JSONL.exists() or n <= 0:
        return []
    rows = []
    with LICHESS_JSONL.open() as f:
        for line in f:
            rows.append(json.loads(line))
            if len(rows) >= n * 4:
                break
    rng = np.random.default_rng(7)
    if len(rows) > n:
        pick = rng.choice(len(rows), size=n, replace=False)
        rows = [rows[i] for i in pick]
    return rows


def train_on(model: TinyAZ, rows: list[dict]) -> list[dict]:
    device = torch.device("cpu")
    torch.set_num_threads(2)
    ds = MixDataset(rows)
    loader = DataLoader(ds, batch_size=BATCH, shuffle=True, num_workers=0, collate_fn=collate, drop_last=True)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    history = []
    model.train()
    t0 = time.time()
    for epoch in range(1, EPOCHS + 1):
        tot = tot_p = tot_v = 0.0
        n = 0
        for x, idxs, ws, v in loader:
            x = x.to(device)
            v = v.to(device)
            pol, vhat = model(x)
            logits = pol.flatten(1)
            logp = torch.nn.functional.log_softmax(logits, dim=1)
            lp = torch.zeros((), device=device)
            for i, (ix, w) in enumerate(zip(idxs, ws, strict=True)):
                ix = ix.to(device)
                w = w.to(device)
                w = w / w.sum().clamp_min(1e-8)
                lp = lp + -(w * logp[i].index_select(0, ix)).sum()
            lp = lp / x.size(0)
            lv = torch.nn.functional.mse_loss(vhat, v)
            loss = lp + lv
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot += float(loss)
            tot_p += float(lp)
            tot_v += float(lv)
            n += 1
        row = {
            "epoch": epoch,
            "policy": tot_p / max(n, 1),
            "value": tot_v / max(n, 1),
            "loss": tot / max(n, 1),
        }
        history.append(row)
        print(row, f"{time.time() - t0:.0f}s", flush=True)
    model.eval()
    return history


def pit(new: TinyAZ, old: TinyAZ, games: int = 12) -> dict:
    ev_n, ev_o = NetEval(new), NetEval(old)
    wins = draws = losses = 0
    for i in range(games):
        new_white = i % 2 == 0
        board = chess.Board()
        plies = 0
        while not board.is_game_over() and plies < MAX_PLIES:
            use_new = (board.turn == chess.WHITE) == new_white
            root = search_root(board, 1, ev_n if use_new else ev_o, add_noise=False)
            board.push(best_move(root))
            plies += 1
        z = _outcome(board)
        if not new_white:
            z = -z
        if z > 0:
            wins += 1
        elif z < 0:
            losses += 1
        else:
            draws += 1
        print(f"pit {i + 1}/{games} WDL {wins}-{draws}-{losses}", flush=True)
    score = (wins + 0.5 * draws) / games
    return {"games": games, "wins": wins, "draws": draws, "losses": losses, "score": score, "visits": 1}


def main() -> None:
    torch.set_num_threads(2)
    if not PHASE1.exists():
        raise SystemExit(f"missing {PHASE1}")
    if not LICHESS_BAK.exists():
        shutil.copy2(PHASE1, LICHESS_BAK)
        print("backed up Phase 1 →", LICHESS_BAK, flush=True)
    teacher, _ = load_model(PHASE1)
    student, _ = load_model(PHASE1)
    teacher.eval()
    student.eval()
    print(f"self-play {GAMES} games × {VISITS} visits  params {param_count()}", flush=True)
    rows = selfplay(student, GAMES, VISITS)
    SP_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with SP_JSONL.open("w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")
    mix = load_lichess_mix(LICHESS_MIX)
    print(f"train on {len(rows)} self-play + {len(mix)} lichess", flush=True)
    history = train_on(student, rows + mix)
    pack_model(student, SOURCE_SELFPLAY_64, CKPT_SP)
    vs_teacher = pit(student, teacher, 12)
    print("vs phase1", vs_teacher, flush=True)
    collapsed = vs_teacher["score"] < 0.35
    meta = {
        "name": "tinyaz-s",
        "source": "selfplay-64",
        "sourceId": SOURCE_SELFPLAY_64,
        "selfplayGames": GAMES,
        "selfplayVisits": VISITS,
        "selfplayPositions": len(rows),
        "lichessMix": len(mix),
        "epochs": EPOCHS,
        "params": param_count(),
        "history": history,
        "vsPhase1": vs_teacher,
        "collapsed": collapsed,
    }
    META.write_text(json.dumps(meta, indent=2))
    if collapsed:
        print("VOID: self-play net collapsed vs Phase 1. Keeping Lichess weights.", flush=True)
        sys.exit(2)
    print(f"wrote {CKPT_SP} — run JS gauntlet next", flush=True)


if __name__ == "__main__":
    main()
