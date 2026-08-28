#!/usr/bin/env python3
"""Supervised jump from Phase 1, then optional 64-visit self-play. Public only on SF point."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS, SOURCE_LICHESS_2013_01, SOURCE_SELFPLAY_64  # noqa: E402
from tinyaz.generate import generate  # noqa: E402
from tinyaz.promote import freeze_snapshot, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_snapshot, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, mix_for_train, train_candidate  # noqa: E402

PHASE1 = ROOT / "public/weights/tinyaz-s-lichess.bin"
PUBLIC = ROOT / "public/weights/tinyaz-s.bin"
HUMAN = ROOT / "train/checkpoints/tinyaz-s-human.bin"
CAND = ROOT / "train/checkpoints/tinyaz-s-cand.bin"
SNAPSHOT = ROOT / "train/checkpoints/snapshot.bin"
TRAIN_JSONL = ROOT / "train/data/human/train.jsonl"
SP_JSONL = ROOT / "train/data/selfplay.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"

MAX_SP_LOOPS = 3


def _meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def _sf(path: Path) -> dict | None:
    return vs_stockfish_64(path, elo=1320, sf_path=SF_PATH if SF_PATH.exists() else None, visits=PLAY_VISITS)


def _maybe_public(cand: Path, meta: dict, rnd: dict, sf: dict | None) -> bool:
    if not rnd.get("passed"):
        print("VOID: random-move failed. Public unchanged.", flush=True)
        return False
    if sf is None or sf.get("score", 0) <= 0:
        print("SF1320 no points. Side checkpoint kept. Public unchanged.", flush=True)
        return False
    maybe_promote(True, cand, PUBLIC, {**meta, "vsRandom": rnd, "vsSf1320": sf, "gauntletElo": {
        **(meta.get("gauntletElo") or {}),
        "visits": PLAY_VISITS,
        "eloLabel": "1320+",
        "estimatedElo": 1320,
    }}, [META_PUBLIC, META_SRC])
    print("NUMBER MOVED vs SF1320. Promoted", PUBLIC, flush=True)
    return True


def supervised() -> Path:
    if not PHASE1.exists():
        raise SystemExit(f"missing Phase 1 weights {PHASE1}")
    if not TRAIN_JSONL.exists():
        raise SystemExit(f"missing {TRAIN_JSONL} — run train/scripts/build_lichess.py")
    rows = load_jsonl(TRAIN_JSONL, cap=1_500_000)
    print(f"supervised {len(rows)} from {TRAIN_JSONL} base {PHASE1}", flush=True)
    history = train_candidate(
        PHASE1,
        rows,
        HUMAN,
        source_id=SOURCE_LICHESS_2013_01,
        epochs=int(os.environ.get("HUMAN_EPOCHS", "3")),
        batch=int(os.environ.get("HUMAN_BATCH", "256")),
    )
    meta = {**_meta(), "source": "lichess-2013-01", "sourceId": SOURCE_LICHESS_2013_01, "humanPositions": len(rows), "historyHuman": history}
    HUMAN.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    rnd = vs_random(HUMAN)
    print("human vs random", rnd, flush=True)
    sf = _sf(HUMAN)
    print("human vs SF1320", sf, flush=True)
    promoted = _maybe_public(HUMAN, meta, rnd, sf)
    return HUMAN, sf, promoted


def selfplay_loop(base: Path, loop: int) -> Path:
    games = int(os.environ.get("CLIMB_GAMES", "256"))
    workers = int(os.environ.get("CLIMB_WORKERS", str(max(1, (os.cpu_count() or 2) - 2))))
    freeze_snapshot(base, SNAPSHOT)
    replay = load_jsonl(SP_JSONL, 24_000)
    new_rows = generate(base, games=games, visits=PLAY_VISITS, workers=workers, out_jsonl=SP_JSONL)
    rows = mix_for_train(new_rows, replay, [])
    out = ROOT / f"train/checkpoints/tinyaz-s-sp{loop}.bin"
    history = train_candidate(base, rows, CAND, source_id=SOURCE_SELFPLAY_64, epochs=2, batch=64)
    snap = vs_snapshot(CAND, SNAPSHOT, games=8, visits=PLAY_VISITS)
    print("sp vs snapshot 64-visit", snap, flush=True)
    if snap["score"] <= 0.5:
        print("VOID: 64-visit snapshot <= 0.5. Human checkpoint kept.", flush=True)
        return base
    maybe_promote(True, CAND, out, {"vsSnapshot": snap, "historyClimb": history}, [out.with_suffix(".meta.json")])
    rnd = vs_random(out)
    print("sp vs random", rnd, flush=True)
    sf = _sf(out)
    print("sp vs SF1320", sf, flush=True)
    _maybe_public(out, {**_meta(), "vsSnapshot": snap, "selfplayLoops": loop}, rnd, sf)
    return out


def main() -> None:
    human, sf, promoted = supervised()
    if promoted or (sf is not None and sf.get("score", 0) > 0):
        return
    nloops = min(MAX_SP_LOOPS, max(0, int(os.environ.get("HUMAN_SP_LOOPS", "1"))))
    base = human
    for loop in range(1, nloops + 1):
        print(f"self-play loop {loop}/{nloops} at {PLAY_VISITS} visits", flush=True)
        base = selfplay_loop(base, loop)
        sf = _sf(base)
        if sf is not None and sf.get("score", 0) > 0:
            return
    print(f"STOP: supervised + {nloops} 64-visit loop(s) still 0 vs SF1320.", flush=True)


if __name__ == "__main__":
    main()
