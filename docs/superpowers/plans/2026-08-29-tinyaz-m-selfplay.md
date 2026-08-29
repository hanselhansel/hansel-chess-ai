# tinyaz-m 64-visit self-play Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** One 64-visit self-play loop of tinyaz-m. Keep public only if snapshot > 0.5, random passes, and SF1500 score is not worse than 0.25.

CURRENT_WORKING_FILE: `docs/LATER.md`

### Task 1: Tests then `climb_m.py`

Failing tests: script generate/snapshot visits are 64 not 256; weights path is `tinyaz-m.bin`; TRAIN_VISITS not passed as generate default.

Implement `train/scripts/climb_m.py`. Run tests. First overnight: `CLIMB_GAMES=64`.
