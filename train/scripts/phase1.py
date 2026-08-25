#!/usr/bin/env python3
"""Phase 1: Lichess 2013-01 → tinyaz-s checkpoint. CPU only."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import chess
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import SOURCE_LICHESS_2013_01, param_count  # noqa: E402
from tinyaz.data import write_jsonl  # noqa: E402
from tinyaz.encode import planes_nchw  # noqa: E402
from tinyaz.model import TinyAZ  # noqa: E402
from tinyaz.pack import pack_model  # noqa: E402

PGN = ROOT / "train/data/lichess_2013-01.pgn.zst"
TRAIN_JSONL = ROOT / "train/data/train.jsonl"
VAL_JSONL = ROOT / "train/data/val.jsonl"
CKPT = ROOT / "train/checkpoints/tinyaz-s.bin"
META = ROOT / "train/checkpoints/tinyaz-s.meta.json"

MAX_GAMES = 3500
MAX_POS = 60_000
EPOCHS = 3
BATCH = 64
LR = 1e-3
VALUE_COEF = 1.0


class JsonlPositions(Dataset):
    def __init__(self, path: Path):
        self.rows = []
        with path.open() as f:
            for line in f:
                self.rows.append(json.loads(line))

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int):
        row = self.rows[i]
        board = chess.Board(row["fen"])
        x = planes_nchw(board)
        return (
            torch.from_numpy(np.ascontiguousarray(x)),
            torch.tensor(row["target"], dtype=torch.long),
            torch.tensor(row["value"], dtype=torch.float32),
        )


def prepare() -> dict:
    if TRAIN_JSONL.exists() and TRAIN_JSONL.stat().st_size > 1000:
        print("jsonl exists, skip prepare", flush=True)
        n = sum(1 for _ in TRAIN_JSONL.open())
        nv = sum(1 for _ in VAL_JSONL.open()) if VAL_JSONL.exists() else 0
        return {"train_positions": n, "val_positions": nv, "skipped": True}
    if not PGN.exists():
        raise SystemExit(f"missing {PGN}")
    print(f"parsing {PGN} …", flush=True)
    stats = write_jsonl(PGN, TRAIN_JSONL, VAL_JSONL, MAX_GAMES, val_every=10, max_positions=MAX_POS)
    print(stats, flush=True)
    return stats


def train(stats: dict) -> None:
    device = torch.device("cpu")
    torch.set_num_threads(2)
    ds = JsonlPositions(TRAIN_JSONL)
    val = JsonlPositions(VAL_JSONL) if VAL_JSONL.exists() and VAL_JSONL.stat().st_size > 0 else None
    print(f"train {len(ds)}  val {0 if val is None else len(val)}  params {param_count()}", flush=True)
    loader = DataLoader(ds, batch_size=BATCH, shuffle=True, num_workers=0, drop_last=True)
    model = TinyAZ().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    t0 = time.time()
    history = []
    for epoch in range(1, EPOCHS + 1):
        model.train()
        tot_p = tot_v = tot = 0.0
        n = 0
        for x, target, value in loader:
            x, target, value = x.to(device), target.to(device), value.to(device)
            pol, vhat = model(x)
            logits = pol.flatten(1)
            lp = torch.nn.functional.cross_entropy(logits, target)
            lv = torch.nn.functional.mse_loss(vhat, value)
            loss = lp + VALUE_COEF * lv
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tot_p += float(lp)
            tot_v += float(lv)
            tot += float(loss)
            n += 1
            if n % 50 == 0:
                print(
                    f"epoch {epoch} step {n}/{len(loader)}  "
                    f"P {tot_p / n:.3f}  V {tot_v / n:.3f}  "
                    f"{time.time() - t0:.0f}s",
                    flush=True,
                )
        row = {
            "epoch": epoch,
            "policy": tot_p / max(n, 1),
            "value": tot_v / max(n, 1),
            "loss": tot / max(n, 1),
        }
        if val is not None and len(val) > 0:
            model.eval()
            with torch.no_grad():
                acc = 0
                m = min(len(val), 2048)
                for i in range(m):
                    x, target, _ = val[i]
                    pol, _ = model(x.unsqueeze(0))
                    pred = int(pol.flatten().argmax())
                    acc += int(pred == int(target))
                row["val_top1"] = acc / m
        history.append(row)
        print(row, flush=True)
    pack_model(model, SOURCE_LICHESS_2013_01, CKPT)
    meta = {
        "name": "tinyaz-s",
        "source": "lichess-2013-01",
        "sourceId": SOURCE_LICHESS_2013_01,
        "games": stats.get("train_games"),
        "positions": stats.get("train_positions", len(ds)),
        "epochs": EPOCHS,
        "params": param_count(),
        "history": history,
        "seconds": round(time.time() - t0),
    }
    META.write_text(json.dumps(meta, indent=2))
    print(f"wrote {CKPT} ({CKPT.stat().st_size} bytes) in {meta['seconds']}s", flush=True)


def main() -> None:
    stats = prepare()
    train(stats)


if __name__ == "__main__":
    main()
