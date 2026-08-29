# 256-visit targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `climb_m.py` generates at 256 visits, keeps/discards and publishes at 64, trains 4 epochs.

**Architecture:** Env `CLIMB_VISITS` (default `TRAIN_VISITS=256`) is generate-only. Snapshot, SF, and `gauntletElo.visits` stay `PLAY_VISITS=64`. Fresh jsonl `selfplay-m-256.jsonl`.

**Tech Stack:** Python, existing `tinyaz.generate` / `train_loop` / `rate`.

CURRENT_WORKING_FILE: docs/LATER.md

---

### Task 1: Visit split in climb_m

**Files:**
- Modify: `train/scripts/test_climb_loop.py`
- Modify: `train/scripts/climb_m.py`

- [ ] Write failing test `test_climb_m_generates_at_256_snapshots_at_64`
- [ ] Run it; expect FAIL (TRAIN_VISITS missing, generate still PLAY_VISITS)
- [ ] Minimal climb_m change
- [ ] Tests pass
- [ ] Commit on `feat/tinyaz-m-256-targets`
