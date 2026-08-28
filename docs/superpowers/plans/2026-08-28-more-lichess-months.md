# More Lichess months Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fine-tune public tinyaz-s on up to 1.5M positions from Lichess 2013-01..04, re-rate 64-visit vs SF18 UCI_Elo 1320, promote only if score beats 0.125.

**Architecture:** Extend `write_human_month` to consume a list of archives. `build_lichess.py` globs `train/data/lichess_db_standard_rated_*.pgn.zst`. `human_month.py` trains from public `tinyaz-s.bin`, not Phase 1. Promote helper compares candidate SF score to published 0.125. Card label is actual WDL.

**Tech Stack:** Python 3.11, PyTorch MPS, python-chess, zstandard, Stockfish 18 ruler.

Spec: `docs/superpowers/specs/2026-08-28-more-lichess-months-design.md`

CURRENT_WORKING_FILE: `public/weights/tinyaz-s.bin`

---

## File map

**Create**
- none (tests extend `train/scripts/test_lichess_split.py` and `train/scripts/test_climb_loop.py`)

**Modify**
- `train/src/tinyaz/data.py` — `write_human_months(pgn_paths, ...)`
- `train/src/tinyaz/promote.py` — `beats_published`, `elo_label_from_sf`
- `train/scripts/build_lichess.py` — glob multiple months
- `train/scripts/human_month.py` — train from public; promote only if score > 0.125
- `train/scripts/test_lichess_split.py` — multi-archive + cap tests
- `train/scripts/test_climb_loop.py` — promote-gate + label tests
- `docs/LATER.md`, `README.md`, `train/README.md` — after the run

**Do not modify:** JS play path, Grok auth/PWA, `TRAIN_VISITS` constant, `PLAY_VISITS`.

---

### Task 1: Multi-archive writer (TDD)

**Files:** `train/src/tinyaz/data.py`, `train/scripts/test_lichess_split.py`

- [ ] **Step 1: Write the failing tests**

Add to `train/scripts/test_lichess_split.py`:

```python
def _tiny_pgn(gid: str, result: str = "1-0") -> str:
    moves = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O"
    return (
        f'[Event "t"]\n[Site "https://lichess.org/{gid}"]\n'
        f'[White "a"]\n[Black "b"]\n[Result "{result}"]\n\n{moves} {result}\n\n'
    )


def test_write_human_months_concatenates_two_files() -> None:
    from tinyaz.data import write_human_months

    d = Path(tempfile.mkdtemp())
    a = d / "a.pgn"
    b = d / "b.pgn"
    a.write_text(_tiny_pgn("AAAAAAAA") + _tiny_pgn("BBBBBBBB"))
    b.write_text(_tiny_pgn("CCCCCCCC") + _tiny_pgn("DDDDDDDD"))
    stats = write_human_months([a, b], d / "train.jsonl", d / "val.jsonl", max_train=100, max_val=100)
    total = stats["train_positions"] + stats["val_positions"]
    assert total >= 8
    assert (d / "train.jsonl").exists()


def test_write_human_months_respects_train_cap() -> None:
    from tinyaz.data import write_human_months

    d = Path(tempfile.mkdtemp())
    p = d / "m.pgn"
    p.write_text("".join(_tiny_pgn(f"G{i:07d}") for i in range(20)))
    stats = write_human_months([p], d / "train.jsonl", d / "val.jsonl", max_train=12, max_val=4)
    assert stats["train_positions"] <= 12
```

Add `import tempfile` at the top.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worktree && PYTHONPATH=train/src python3 train/scripts/test_lichess_split.py`

Expected: FAIL `write_human_months` is not defined.

- [ ] **Step 3: Write minimal implementation**

In `train/src/tinyaz/data.py`, add `write_human_months` that iterates `pgn_paths` with a global game counter for sample seeds, same caps as `write_human_month`. Keep `write_human_month` as a one-path wrapper:

```python
def write_human_month(pgn_path: Path, out_train: Path, out_val: Path, **kw) -> dict:
    return write_human_months([pgn_path], out_train, out_val, **kw)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=train/src python3 train/scripts/test_lichess_split.py`

Expected: `lichess split tests ok`

- [ ] **Step 5: Commit**

```bash
git add train/src/tinyaz/data.py train/scripts/test_lichess_split.py
git commit -m "test+feat: multi-month Lichess writer with train cap"
```

---

### Task 2: Promote gate and WDL label (TDD)

**Files:** `train/src/tinyaz/promote.py`, `train/scripts/test_climb_loop.py`

- [ ] **Step 1: Write the failing tests**

Add to `train/scripts/test_climb_loop.py`:

```python
def test_beats_published_requires_strict_improvement() -> None:
    from tinyaz.promote import beats_published

    assert beats_published(0.25, 0.125) is True
    assert beats_published(0.125, 0.125) is False
    assert beats_published(0.0, 0.125) is False


def test_elo_label_is_wdl_not_plus() -> None:
    from tinyaz.promote import elo_label_from_sf

    label = elo_label_from_sf({"wins": 1, "draws": 0, "losses": 7, "games": 8, "uciElo": 1320})
    assert label == "1/8 vs 1320"
    assert "1320+" not in label
```

- [ ] **Step 2: Run to verify fail**

Run: `PYTHONPATH=train/src python3 train/scripts/test_climb_loop.py`

Expected: FAIL import `beats_published`.

Do **not** run the slow snapshot/generate tests while iterating this; the script runs all. That is acceptable (VOID + snapshot tests already pass on public weights).

- [ ] **Step 3: Implement**

In `train/src/tinyaz/promote.py`:

```python
def beats_published(candidate_score: float, published_score: float) -> bool:
    return float(candidate_score) > float(published_score)


def elo_label_from_sf(sf: dict) -> str:
    games = int(sf.get("games") or 0)
    wins = int(sf.get("wins") or 0)
    elo = int(sf.get("uciElo") or 1320)
    return f"{wins}/{games} vs {elo}"
```

- [ ] **Step 4: Tests pass**

Expected: `climb-loop tests ok`

- [ ] **Step 5: Commit**

```bash
git add train/src/tinyaz/promote.py train/scripts/test_climb_loop.py
git commit -m "test+feat: promote only if SF score beats published"
```

---

### Task 3: Builder glob and human_month from public

**Files:** `train/scripts/build_lichess.py`, `train/scripts/human_month.py`

- [ ] **Step 1: Failing test for glob**

Add to `test_lichess_split.py` a `find_pgns` test that writes two fake zst-named files into a temp dir. Export `find_pgns(root: Path)` from `build_lichess.py` (keep `ROOT` default).

```python
def test_find_pgns_lists_months_sorted() -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "build_lichess", ROOT / "train/scripts/build_lichess.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    d = Path(tempfile.mkdtemp())
    (d / "train/data").mkdir(parents=True)
    (d / "train/data/lichess_db_standard_rated_2013-02.pgn.zst").write_bytes(b"x" * 2000)
    (d / "train/data/lichess_db_standard_rated_2013-01.pgn.zst").write_bytes(b"x" * 2000)
    found = mod.find_pgns(d)
    names = [p.name for p in found]
    assert names[0].endswith("2013-01.pgn.zst")
    assert names[1].endswith("2013-02.pgn.zst")
```

- [ ] **Step 2: Run to verify fail**

Expected: FAIL `find_pgns() takes 0 positional arguments` or not defined.

- [ ] **Step 3: Implement builder + orchestrator**

`build_lichess.py`:

```python
DOWNLOAD = "https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst"
PATTERN = "train/data/lichess_db_standard_rated_*.pgn.zst"

def find_pgns(root: Path = ROOT) -> list[Path]:
    found = sorted(p for p in (root / "train/data").glob("lichess_db_standard_rated_*.pgn.zst") if p.stat().st_size > 1000)
    if not found:
        raise SystemExit(f"missing Lichess month PGN. Download:\n  {DOWNLOAD}\n  to {root / 'train/data/'}")
    return found
```

`human_month.py` changes:
- `BASE = PUBLIC` (not PHASE1)
- `published_score = float((_meta().get("vsSf1320") or {}).get("score") or 0)`
- `_maybe_public` uses `beats_published(sf["score"], published_score)` and `elo_label_from_sf(sf)`
- update `gauntletElo.levels[0]` with the new WDL when promoting
- skip a second SF run after promote (already true if `promoted` returns)
- source meta: `"lichess-2013-01..04"`

- [ ] **Step 4: Tests pass**

`PYTHONPATH=train/src python3 train/scripts/test_lichess_split.py`
`PYTHONPATH=train/src python3 train/scripts/test_encode.py`

- [ ] **Step 5: Commit**

```bash
git add train/scripts/build_lichess.py train/scripts/human_month.py train/scripts/test_lichess_split.py
git commit -m "feat: multi-month builder; train from public; improve-only promote"
```

---

### Task 4: Overnight run

- [ ] Download 2013-01..04 if missing.
- [ ] `PYTHONPATH=train/src python3 train/scripts/build_lichess.py`
- [ ] `PYTHONPATH=train/src python3 train/scripts/human_month.py` (HUMAN_SP_LOOPS=1, HUMAN_EPOCHS=3, HUMAN_BATCH=256)
- [ ] Record WDL in `docs/LATER.md`. Promote public only on score > 0.125.
- [ ] Update README claim line with the actual WDL. Never write `1320+` from one extra point.

---

### Task 5: Ship

- [ ] Relevant tests green.
- [ ] `/ship` then `/land-and-deploy`. Never commit to main locally.

---

## Spec coverage

| Spec item | Task |
|---|---|
| Start from public tinyaz-s.bin | 3 |
| 2013-01..04, 1.5M cap, game split | 1, 3, 4 |
| No SF teacher | 3–4 |
| Promote only if score > 0.125 | 2–3 |
| eloLabel is WDL not 1320+ | 2–3 |
| One 64-visit SP if no improve | 3–4 |
| Missing PGN loud | 3 |
