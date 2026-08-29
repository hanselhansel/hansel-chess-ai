"""Train a candidate on mixed self-play. MPS if available, else CPU."""

from __future__ import annotations

import json
import time
from pathlib import Path

import chess
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset

from .constants import CHANNELS_M, SOURCE_SELFPLAY_64
from .encode import planes_nchw
from .model import TinyAZ
from .pack import load_model, pack_model

EPOCHS = 2
BATCH = 64
LR = 2e-4


def pick_device() -> torch.device:
    if torch.backends.mps.is_available():
        dev = torch.device("mps")
    else:
        dev = torch.device("cpu")
    print(f"train device {dev}", flush=True)
    return dev


def mix_for_train(new_rows: list[dict], replay_before: list[dict], lichess: list[dict]) -> list[dict]:
    """New self-play plus replay taken *before* generate appended. Do not load jsonl after."""
    return new_rows + replay_before + lichess


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


def _train_on(
    model: TinyAZ,
    rows: list[dict],
    device: torch.device,
    epochs: int = EPOCHS,
    batch: int = BATCH,
) -> list[dict]:
    ds = MixDataset(rows)
    loader = DataLoader(ds, batch_size=batch, shuffle=True, num_workers=0, collate_fn=collate, drop_last=True)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    history: list[dict] = []
    model.train()
    t0 = time.time()
    for epoch in range(1, epochs + 1):
        tot = tot_p = tot_v = 0.0
        n = 0
        for x, idxs, ws, v in loader:
            x = x.to(device)
            v = v.to(device)
            pol, vhat = model(x)
            logp = torch.nn.functional.log_softmax(pol.flatten(1), dim=1)
            lp = x.new_zeros(())
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
            tot += float(loss.detach())
            tot_p += float(lp.detach())
            tot_v += float(lv.detach())
            n += 1
        row = {"epoch": epoch, "policy": tot_p / max(n, 1), "value": tot_v / max(n, 1), "loss": tot / max(n, 1)}
        history.append(row)
        print(row, f"{time.time() - t0:.0f}s", flush=True)
    model.eval()
    return history


def train_fresh(
    rows: list[dict],
    out_path: Path,
    channels: int = CHANNELS_M,
    source_id: int = SOURCE_SELFPLAY_64,
    epochs: int = EPOCHS,
    batch: int = BATCH,
) -> list[dict]:
    if not rows:
        raise ValueError("no rows to train on")
    device = pick_device()
    model = TinyAZ(channels)
    model.to(device)
    history = _train_on(model, rows, device, epochs=epochs, batch=batch)
    model.to("cpu")
    pack_model(model, source_id, out_path)
    return history


def train_candidate(
    base_weights: Path,
    rows: list[dict],
    out_path: Path,
    source_id: int = SOURCE_SELFPLAY_64,
    epochs: int = EPOCHS,
    batch: int = BATCH,
) -> list[dict]:
    if not rows:
        raise ValueError("no rows to train on")
    device = pick_device()
    model, _ = load_model(base_weights)
    model.to(device)
    history = _train_on(model, rows, device, epochs=epochs, batch=batch)
    model.to("cpu")
    pack_model(model, source_id, out_path)
    return history
