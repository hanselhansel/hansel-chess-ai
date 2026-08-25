"""Binary checkpoint: magic TAZS + version + paramCount + sourceId + float32 tensors."""

from __future__ import annotations

import struct
from pathlib import Path

import numpy as np
import torch

from .constants import (
    CHANNELS,
    N_BLOCKS,
    N_PLANES,
    POLICY_PLANES,
    VALUE_CH,
    VALUE_HIDDEN,
    param_count,
)
from .model import TinyAZ

MAGIC = b"TAZS"
VERSION = 1
HEADER_BYTES = 16


def _tensors(model: TinyAZ) -> list[np.ndarray]:
    out: list[np.ndarray] = [
        model.stem.weight.detach().cpu().contiguous().float().numpy().reshape(-1),
        model.stem.bias.detach().cpu().contiguous().float().numpy().reshape(-1),
    ]
    for block in model.blocks:
        out.append(block.conv1.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
        out.append(block.conv1.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
        out.append(block.conv2.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
        out.append(block.conv2.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.policy.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.policy.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vconv.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vconv.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vfc1.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vfc1.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vfc2.weight.detach().cpu().contiguous().float().numpy().reshape(-1))
    out.append(model.vfc2.bias.detach().cpu().contiguous().float().numpy().reshape(-1))
    return out


def pack_model(model: TinyAZ, source_id: int, path: str | Path) -> None:
    blobs = _tensors(model)
    n = int(sum(b.size for b in blobs))
    expected = param_count()
    if n != expected:
        raise RuntimeError(f"packed {n} floats, expected {expected}")
    header = struct.pack("<4sIII", MAGIC, VERSION, expected, source_id)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.write(header)
        for b in blobs:
            f.write(np.ascontiguousarray(b, dtype=np.float32).tobytes())


def expected_sizes() -> list[int]:
    sizes = [
        CHANNELS * N_PLANES * 9,
        CHANNELS,
    ]
    for _ in range(N_BLOCKS):
        sizes.extend(
            [
                CHANNELS * CHANNELS * 9,
                CHANNELS,
                CHANNELS * CHANNELS * 9,
                CHANNELS,
            ]
        )
    sizes.extend(
        [
            POLICY_PLANES * CHANNELS * 1 * 1,
            POLICY_PLANES,
            VALUE_CH * CHANNELS * 1 * 1,
            VALUE_CH,
            VALUE_HIDDEN * VALUE_CH * 64,
            VALUE_HIDDEN,
            1 * VALUE_HIDDEN,
            1,
        ]
    )
    return sizes


def load_model(path: str | Path) -> tuple[TinyAZ, int]:
    raw = Path(path).read_bytes()
    magic, version, count, source_id = struct.unpack_from("<4sIII", raw, 0)
    if magic != MAGIC or version != VERSION:
        raise ValueError(f"bad checkpoint header {magic!r} v{version}")
    if count != param_count():
        raise ValueError(f"param count {count} != {param_count()}")
    model = TinyAZ()
    offset = HEADER_BYTES
    arrays = []
    for n in expected_sizes():
        chunk = np.frombuffer(raw, dtype=np.float32, count=n, offset=offset).copy()
        arrays.append(chunk)
        offset += n * 4
    with torch.no_grad():
        model.stem.weight.copy_(torch.from_numpy(arrays[0].reshape(CHANNELS, N_PLANES, 3, 3)))
        model.stem.bias.copy_(torch.from_numpy(arrays[1]))
        i = 2
        for block in model.blocks:
            block.conv1.weight.copy_(torch.from_numpy(arrays[i].reshape(CHANNELS, CHANNELS, 3, 3)))
            block.conv1.bias.copy_(torch.from_numpy(arrays[i + 1]))
            block.conv2.weight.copy_(torch.from_numpy(arrays[i + 2].reshape(CHANNELS, CHANNELS, 3, 3)))
            block.conv2.bias.copy_(torch.from_numpy(arrays[i + 3]))
            i += 4
        model.policy.weight.copy_(torch.from_numpy(arrays[i].reshape(POLICY_PLANES, CHANNELS, 1, 1)))
        model.policy.bias.copy_(torch.from_numpy(arrays[i + 1]))
        model.vconv.weight.copy_(torch.from_numpy(arrays[i + 2].reshape(VALUE_CH, CHANNELS, 1, 1)))
        model.vconv.bias.copy_(torch.from_numpy(arrays[i + 3]))
        model.vfc1.weight.copy_(torch.from_numpy(arrays[i + 4].reshape(VALUE_HIDDEN, VALUE_CH * 64)))
        model.vfc1.bias.copy_(torch.from_numpy(arrays[i + 5]))
        model.vfc2.weight.copy_(torch.from_numpy(arrays[i + 6].reshape(1, VALUE_HIDDEN)))
        model.vfc2.bias.copy_(torch.from_numpy(arrays[i + 7]))
    model.eval()
    return model, source_id
