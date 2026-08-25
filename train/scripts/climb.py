#!/usr/bin/env python3
"""64-visit climb. Keep/discard by Stockfish 18 UCI_Elo 1320. Not a teacher."""

from __future__ import annotations

import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import chess
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS, SOURCE_SELFPLAY_64, param_count  # noqa: E402
from tinyaz.encode import planes_nchw  # noqa: E402
from tinyaz.mcts import NetEval, best_move, search_root  # noqa: E402
from tinyaz.model import TinyAZ  # noqa: E402
from tinyaz.pack import load_model, pack_model  # noqa: E402
from tinyaz.policy import move_index  # noqa: E402
from tinyaz.uci import Stockfish  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"
CAND = ROOT / "train/checkpoints/tinyaz-s-cand.bin"
SP_JSONL = ROOT / "train/data/selfplay.jsonl"
LICHESS_JSONL = ROOT / "train/data/train.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"

GAMES = int(os.environ.get("CLIMB_GAMES", "256"))
WORKERS = int(os.environ.get("CLIMB_WORKERS", "2"))
VISITS = PLAY_VISITS
MAX_PLIES = 160
TEMP_MOVES = 12
EPOCHS = 2
BATCH = 64
LR = 2e-4
LICHESS_MIX = 2000
REPLAY_CAP = 24_000
SF_ELO = 1320
SF_GAMES_OPENINGS = ((), ("e2e4", "e7e5"), ("e2e4", "c7c5"), ("d2d4", "d7d5"))


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
    z_w = _z_white(board)
    out = [{"fen": r["fen"], "pi": r["pi"], "value": z_w if r["stm_white"] else -z_w} for r in rows]
    return out, z_w


def _worker(payload: tuple[str, int, int, int]) -> tuple[list[dict], tuple[int, int, int]]:
    weights_path, games, seed, visits = payload
    torch.set_num_threads(1)
    model, _ = load_model(weights_path)
    model.eval()
    ev = NetEval(model)
    rng = np.random.default_rng(seed)
    rows: list[dict] = []
    w = d = l = 0
    for i in range(games):
        r, z = play_game(ev, visits, rng)
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


def selfplay(weights_path: Path, games: int) -> list[dict]:
    n = max(1, WORKERS)
    base = games // n
    extra = games % n
    jobs = []
    for i in range(n):
        g = base + (1 if i < extra else 0)
        if g:
            jobs.append((str(weights_path), g, 2026 + i * 997, VISITS))
    t0 = time.time()
    rows: list[dict] = []
    w = d = l = 0
    with ProcessPoolExecutor(max_workers=n) as ex:
        for part, wdl in ex.map(_worker, jobs):
            rows.extend(part)
            w += wdl[0]
            d += wdl[1]
            l += wdl[2]
    print(f"self-play {games} games  pos {len(rows)}  WDL {w}-{d}-{l}  {time.time() - t0:.0f}s", flush=True)
    return rows


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
            wt = torch.tensor([p[1] for p in pi], dtype=torch.float32)
        else:
            idx = torch.tensor([row["target"]], dtype=torch.long)
            wt = torch.tensor([1.0], dtype=torch.float32)
        v = torch.tensor(row["value"], dtype=torch.float32)
        return x, idx, wt, v


def collate(batch):
    xs, idxs, ws, vs = zip(*batch, strict=True)
    return torch.stack(xs, 0), list(idxs), list(ws), torch.stack(vs, 0)


def load_jsonl(path: Path, cap: int) -> list[dict]:
    if not path.exists() or cap <= 0:
        return []
    rows = []
    with path.open() as f:
        for line in f:
            rows.append(json.loads(line))
    if len(rows) > cap:
        rng = np.random.default_rng(11)
        pick = rng.choice(len(rows), size=cap, replace=False)
        rows = [rows[int(i)] for i in pick]
    return rows


def train_on(model: TinyAZ, rows: list[dict]) -> list[dict]:
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
            pol, vhat = model(x)
            logp = torch.nn.functional.log_softmax(pol.flatten(1), dim=1)
            lp = x.new_zeros(())
            for i, (ix, w) in enumerate(zip(idxs, ws, strict=True)):
                w = w / w.sum().clamp_min(1e-8)
                lp = lp + -(w * logp[i].index_select(0, ix)).sum()
            lp = lp / x.size(0)
            lv = torch.nn.functional.mse_loss(vhat, v)
            loss = lp + lv
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot += float(loss.detach())
            tot_p += float(lp.detach())
            tot_v += float(lv.detach())
            n += 1
        row = {"epoch": epoch, "policy": tot_p / max(n, 1), "value": tot_v / max(n, 1), "loss": tot / max(n, 1)}
        history.append(row)
        print(row, f"{time.time() - t0:.0f}s", flush=True)
    model.eval()
    return history


def vs_stockfish(weights_path: Path, elo: int = SF_ELO) -> dict:
    torch.set_num_threads(2)
    model, _ = load_model(weights_path)
    ev = NetEval(model)
    sf = Stockfish(SF_PATH, elo=elo, movetime_ms=100)
    wins = draws = losses = 0
    t0 = time.time()
    try:
        for opening in SF_GAMES_OPENINGS:
            for tiny_white in (True, False):
                board = chess.Board()
                for u in opening:
                    board.push_uci(u)
                sf.new_game()
                plies = 0
                while not board.is_game_over() and plies < MAX_PLIES:
                    our = (board.turn == chess.WHITE) == tiny_white
                    if our:
                        root = search_root(board, VISITS, ev, add_noise=False)
                        board.push(best_move(root))
                    else:
                        board.push_uci(sf.bestmove(board.fen()))
                    plies += 1
                z = _z_white(board)
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
                    f"plies {plies} WDL {wins}-{draws}-{losses} {time.time() - t0:.0f}s",
                    flush=True,
                )
    finally:
        sf.quit()
    n = wins + draws + losses
    return {
        "visits": VISITS,
        "uciElo": elo,
        "games": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "score": (wins + 0.5 * draws) / n if n else 0.0,
    }


def merge_meta(update: dict) -> dict:
    meta = json.loads(META_PUBLIC.read_text()) if META_PUBLIC.exists() else {}
    meta.update(update)
    text = json.dumps(meta, indent=2)
    META_PUBLIC.write_text(text)
    META_SRC.write_text(text)
    return meta


def main() -> None:
    if not WEIGHTS.exists():
        raise SystemExit(f"missing {WEIGHTS}")
    if not SF_PATH.exists():
        raise SystemExit(f"missing {SF_PATH} — run train/scripts/fetch_stockfish.sh")
    old_meta = json.loads(META_PUBLIC.read_text()) if META_PUBLIC.exists() else {}
    old_sf = (old_meta.get("vsSf1320Loop2") or old_meta.get("vsSf1320") or {})
    old_pts = float(old_sf.get("wins", 0)) + 0.5 * float(old_sf.get("draws", 0))
    old_n = int(old_sf.get("games", 8) or 8)
    old_score = old_pts / old_n if old_n else 0.0
    print(
        f"climb {GAMES} games × {VISITS} visits  workers {WORKERS}  "
        f"keep if SF{SF_ELO} score >= {old_score:.3f} ({int(old_sf.get('wins', 0))}-{int(old_sf.get('draws', 0))}-{int(old_sf.get('losses', 8))})",
        flush=True,
    )

    new_rows = selfplay(WEIGHTS, GAMES)
    SP_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with SP_JSONL.open("a") as f:
        for row in new_rows:
            f.write(json.dumps(row) + "\n")
    replay = load_jsonl(SP_JSONL, REPLAY_CAP)
    lichess = load_jsonl(LICHESS_JSONL, LICHESS_MIX)
    print(f"train on {len(new_rows)} new + replay {len(replay)} + lichess {len(lichess)}", flush=True)
    student, _ = load_model(WEIGHTS)
    history = train_on(student, new_rows + replay + lichess)
    pack_model(student, SOURCE_SELFPLAY_64, CAND)

    sf = vs_stockfish(CAND, SF_ELO)
    print("candidate vs SF1320", sf, flush=True)
    if sf["score"] + 1e-9 < old_score:
        print("VOID: worse vs Stockfish 1320. Public weights unchanged.", flush=True)
        sys.exit(2)

    print("SF1320 not worse — random gauntlet next (must still pass)", flush=True)
    cand_meta = {
        "source": "selfplay-64",
        "sourceId": SOURCE_SELFPLAY_64,
        "selfplayGames": int(old_meta.get("selfplayGames", 0)) + GAMES,
        "selfplayVisits": VISITS,
        "selfplayPositions": int(old_meta.get("selfplayPositions", 0)) + len(new_rows),
        "selfplayLoops": int(old_meta.get("selfplayLoops", 2)) + 1,
        "lichessMix": LICHESS_MIX,
        "epochs": EPOCHS,
        "params": param_count(),
        "historyClimb": history,
        "vsSf1320": sf,
        "climbGames": GAMES,
        "keepDiscard": "stockfish-18-uci-elo-1320-64-visit",
        "collapsed": False,
    }
    # gauntlet.ts merges this file
    (ROOT / "train/checkpoints/tinyaz-s.meta.json").write_text(json.dumps({**old_meta, **cand_meta}, indent=2))
    print(json.dumps(cand_meta, indent=2), flush=True)
    print(f"candidate {CAND}", flush=True)
    if sf["score"] > old_score:
        print("NUMBER MOVED vs SF1320", flush=True)
    else:
        print("Elo still <1320 (no points). Weights kept if random-move still loses.", flush=True)


if __name__ == "__main__":
    main()
