"""tinyaz-s: 8 residual 64-ch convs. Layout matches src/lib/chess/net.ts."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from .constants import CHANNELS, N_BLOCKS, N_PLANES, POLICY_PLANES, VALUE_CH, VALUE_HIDDEN


class ResidualBlock(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(CHANNELS, CHANNELS, 3, padding=1)
        self.conv2 = nn.Conv2d(CHANNELS, CHANNELS, 3, padding=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y = F.relu(self.conv1(x))
        y = self.conv2(y)
        return F.relu(x + y)


class TinyAZ(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.stem = nn.Conv2d(N_PLANES, CHANNELS, 3, padding=1)
        self.blocks = nn.ModuleList([ResidualBlock() for _ in range(N_BLOCKS)])
        self.policy = nn.Conv2d(CHANNELS, POLICY_PLANES, 1)
        self.vconv = nn.Conv2d(CHANNELS, VALUE_CH, 1)
        self.vfc1 = nn.Linear(VALUE_CH * 64, VALUE_HIDDEN)
        self.vfc2 = nn.Linear(VALUE_HIDDEN, 1)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        x = F.relu(self.stem(x))
        for block in self.blocks:
            x = block(x)
        pol = self.policy(x)
        v = F.relu(self.vconv(x))
        v = F.relu(self.vfc1(v.flatten(1)))
        v = torch.tanh(self.vfc2(v))
        return pol, v.squeeze(-1)
