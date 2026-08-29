# tinyaz-m first experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Train tinyaz-m (8×128) from scratch on the 1.5M mix. Promote over s only if 64-visit vs SF1500 beats 0.125 and vs 1320 stays ≥ 0.5.

**Architecture:** Parameterize `TinyAZ(channels)`. Pack still TAZS v1; width from param count. JS forward uses `stemB.length`. Orchestrator `train_m.py`.

**Tech Stack:** Python 3.11, PyTorch MPS, Stockfish 18 ruler, existing 1.5M jsonl.

CURRENT_WORKING_FILE: `public/weights/tinyaz-m.bin`

---

### Task 1: Python width (TDD)

- [ ] `param_count(64)==640018`, `param_count(128) < 3e6` and `> 2e6`, `TinyAZ(128)` numel matches, pack/load roundtrip, `load_model(tinyaz-s.bin)` still 64.

### Task 2: JS unpack both widths (TDD)

- [ ] `unpackWeights` of s.bin still works. `forward` uses `w.stemB.length`. chess.test.ts 14/14 plus m param count < 3M.

### Task 3: `train_m.py`

- [ ] Train from scratch on 1.5M. Rate random, SF1320, SF1500. Promote `tinyaz-m.bin` only on the keep rule. VOID leaves s.

### Task 4: Overnight run

- [ ] `HUMAN_EPOCHS=3 HUMAN_BATCH=256 PYTHONPATH=train/src python3 train/scripts/train_m.py`
