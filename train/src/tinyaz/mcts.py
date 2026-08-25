"""PUCT search matching src/lib/chess/mcts.ts. c_puct = 1.5."""

from __future__ import annotations

from dataclasses import dataclass, field

import chess
import numpy as np
import torch

from .constants import C_PUCT, POLICY_PLANES
from .encode import planes_nchw
from .policy import move_index


@dataclass
class Node:
    parent: Node | None
    move: chess.Move | None
    prior: float
    visits: int = 0
    value_sum: float = 0.0
    children: list[Node] = field(default_factory=list)
    expanded: bool = False
    terminal: bool = False
    terminal_value: float = 0.0


class NetEval:
    def __init__(self, model: torch.nn.Module, device: torch.device | None = None) -> None:
        self.model = model
        self.device = device or next(model.parameters()).device
        self.buf = torch.zeros(1, 19, 8, 8, dtype=torch.float32, device=self.device)
        self.np = np.zeros((19, 8, 8), dtype=np.float32)

    def __call__(self, board: chess.Board) -> tuple[np.ndarray, float]:
        self.np[:] = planes_nchw(board)
        self.buf[0].copy_(torch.from_numpy(self.np))
        with torch.inference_mode():
            pol, v = self.model(self.buf)
        return pol[0].contiguous().view(-1).detach().cpu().numpy(), float(v[0])


def _softmax(logits: list[float]) -> list[float]:
    m = max(logits) if logits else 0.0
    exps = [np.exp(x - m) for x in logits]
    s = sum(exps)
    if s <= 0:
        return [1 / len(logits)] * len(logits)
    return [e / s for e in exps]


def _select(node: Node) -> Node:
    best = node.children[0]
    best_score = -1e18
    parent_n = np.sqrt(node.visits + 1e-8)
    for ch in node.children:
        q = 0.0 if ch.visits == 0 else -(ch.value_sum / ch.visits)
        u = (C_PUCT * ch.prior * parent_n) / (1 + ch.visits)
        s = q + u
        if s > best_score:
            best_score = s
            best = ch
    return best


def _expand(board: chess.Board, node: Node, ev: NetEval) -> float:
    if board.is_checkmate():
        node.terminal = True
        node.terminal_value = -1.0
        node.expanded = True
        return -1.0
    if board.is_game_over():
        node.terminal = True
        node.terminal_value = 0.0
        node.expanded = True
        return 0.0
    pol, value = ev(board)
    flip = board.turn == chess.BLACK
    legal = list(board.legal_moves)
    logits: list[float] = []
    for mv in legal:
        frm, plane = move_index(mv, flip)
        if plane < 0 or plane >= POLICY_PLANES:
            logits.append(-1e9)
        else:
            logits.append(float(pol[plane * 64 + frm]))
    priors = _softmax(logits)
    node.children = [
        Node(parent=node, move=mv, prior=p) for mv, p in zip(legal, priors, strict=True)
    ]
    node.expanded = True
    return value


def _dirichlet(node: Node, alpha: float = 0.3, eps: float = 0.25) -> None:
    if not node.children:
        return
    noise = np.random.dirichlet([alpha] * len(node.children))
    for ch, n in zip(node.children, noise, strict=True):
        ch.prior = (1 - eps) * ch.prior + eps * float(n)


def search_root(
    board: chess.Board,
    visits: int,
    ev: NetEval,
    add_noise: bool = False,
) -> Node:
    root = Node(parent=None, move=None, prior=1.0)
    val = _expand(board, root, ev)
    root.visits += 1
    root.value_sum += val
    if add_noise:
        _dirichlet(root)
    for _ in range(visits - 1):
        node = root
        pushed = 0
        while node.expanded and not node.terminal and node.children:
            node = _select(node)
            assert node.move is not None
            board.push(node.move)
            pushed += 1
        if node.terminal:
            value = node.terminal_value
        else:
            value = _expand(board, node, ev)
        walk: Node | None = node
        sign = 1.0
        while walk is not None:
            walk.visits += 1
            walk.value_sum += value * sign
            sign = -sign
            walk = walk.parent
        for _ in range(pushed):
            board.pop()
    return root


def pick_move(root: Node, temperature: float, rng: np.random.Generator) -> tuple[chess.Move, list[tuple[int, float]]]:
    visits = np.array([ch.visits for ch in root.children], dtype=np.float64)
    total = visits.sum()
    if total <= 0:
        raise RuntimeError("search produced no visits")
    pi = visits / total
    if temperature <= 1e-6:
        idx = int(np.argmax(visits)) if total > 0 else int(np.argmax([c.prior for c in root.children]))
    else:
        w = np.power(pi, 1.0 / temperature)
        w = w / w.sum()
        idx = int(rng.choice(len(root.children), p=w))
    move = root.children[idx].move
    assert move is not None
    dist: list[tuple[int, float]] = []
    # filled by caller with policy indices
    return move, [(i, float(p)) for i, p in enumerate(pi) if p > 0]


def best_move(root: Node) -> chess.Move:
    ranked = sorted(root.children, key=lambda c: (c.visits, c.prior), reverse=True)
    mv = ranked[0].move
    if mv is None:
        raise RuntimeError("search produced no legal move")
    return mv
