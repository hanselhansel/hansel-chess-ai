# Hansel Chess AI (tinyaz)

Date: 2026-08-25
Status: **approved** (brainstorming sections 1–4)
Repo: `hanselhansel/hansel-chess-ai` (private)
Playable workbench: the Grok app

Predecessor: `hanselhansel/hansel-chesslite` — a searchless research pipeline that never produced a playable model. We do not fork it.

## 1. Claim

> Strongest from-scratch AlphaZero-style chess net you can play in the browser, watch think, and rate, under 3M parameters.

X is **not** “beats Stockfish.” X is a tiny AZ you can inspect, with a public Elo and an efficiency card that never mixes 1-visit and N-visit numbers.

## 2. Architecture

Mini-AlphaZero: conv ResNet, policy + value, MCTS at play time.

```
19 planes × 8 × 8  (side-to-move canonical)
        |
   stem conv 3×3 → 64 ch
        |
   8 residual blocks (64 ch)     tinyaz-s  ~0.7M   ← v1 default
        |
        ├─ policy: 1×1 → 73 planes (AlphaZero move encoding)
        └─ value:  1×1 → MLP → tanh
```

Ladder size **tinyaz-m**: 8×128, ~2.4M, under the 3M cap. Not trained until S is playable and beats random.

Input planes: 12 piece, 4 castling, 1 en passant, 1 halfmove/100, 1 fullmove/200.

## 3. Search

Visit = one look-ahead trip from the current position.

| Mode | Visits | Role |
|---|---|---|
| 1-visit | 1 | Naked net. Policy argmax. The searchless column |
| Play / rate | 64 | What you play. What we publish |
| Think harder | 256 | Slider only. Not the published Elo unless we re-rate |

PUCT, c_puct = 1.5. Same constants in Python and in the browser worker.

## 4. Training

You never play to teach it.

```
Phase 0  random weights     → playable UI (this ship)
Phase 1  Lichess PGN        → policy = human move, value = result
Phase 2  self-play + MCTS   → climb
```

Stockfish is a **ruler**, not a teacher, in v1. Labelling at depth 12 is how chesslite stalled.

Training hardware for the Grok cloud box: 2 CPU cores, 4 GB RAM, no GPU. Train tinyaz-s on CPU. Autoresearch (Karpathy) is NVIDIA-only; steal the *loop* after we have Elo, do not clone the repo now.

## 5. Proof

1. You play it (legal moves, visible tree).
2. Random-move control must lose after Phase 1 or the run is void.
3. Gauntlet vs Stockfish `UCI_Elo` when a static binary can be dropped in.
4. Lichess BOT only after gauntlet is not random (irreversible per account).

## 6. Efficiency card

Always four rows: Lichess Elo (pools separate), gauntlet Elo, params + FLOPs/move, browser ms/move.

1-visit and 64-visit are different claims. Wall-clock and node-count invert rankings (Rapfi). Publish both when comparing to Lc0.

## 7. Non-goals (v1)

Beating Stockfish/Lc0/DeepMind 270M. Forking chesslite or Lc0. Mutation-gate theatre before a game. Reimplementing chess rules (`chess.js` / `python-chess`).

## 8. Explicitly later

See `docs/LATER.md`. Do not drop that list.
