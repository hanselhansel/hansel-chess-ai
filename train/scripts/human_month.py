#!/usr/bin/env python3
"""Fine-tune public tinyaz-s on extra Lichess months. Public only if SF score improves."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS, SOURCE_LICHESS_2013_01, SOURCE_SELFPLAY_64  # noqa: E402
from tinyaz.generate import generate  # noqa: E402
from tinyaz.promote import beats_published, elo_label_from_sf, freeze_snapshot, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_snapshot, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, mix_for_train, train_candidate  # noqa: E402

PUBLIC = ROOT / "public/weights/tinyaz-s.bin"
HUMAN = ROOT / "train/checkpoints/tinyaz-s-human.bin"
CAND = ROOT / "train/checkpoints/tinyaz-s-cand.bin"
SNAPSHOT = ROOT / "train/checkpoints/snapshot.bin"
TRAIN_JSONL = ROOT / "train/data/human/train.jsonl"
SP_JSONL = ROOT / "train/data/selfplay.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"
MONTHS = os.environ.get("HUMAN_MONTHS", "lichess-2013-01..04")
MAX_SP_LOOPS = 3


def _meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def published_score(meta: dict | None = None) -> float:
    return float(((meta or _meta()).get("vsSf1320") or {}).get("score") or 0)


def _sf(path: Path) -> dict | None:
    return vs_stockfish_64(path, elo=1320, sf_path=SF_PATH if SF_PATH.exists() else None, visits=PLAY_VISITS)


def _patch_gauntlet(meta: dict, sf: dict) -> dict:
    g = dict(meta.get("gauntletElo") or {})
    g["visits"] = PLAY_VISITS
    g["eloLabel"] = elo_label_from_sf(sf)
    g["estimatedElo"] = None
    g["eloHi"] = int(sf.get("uciElo") or 1320)
    levels = list(g.get("levels") or [{}])
    head = dict(levels[0])
    for k in ("uciElo", "games", "wins", "draws", "losses", "score"):
        if k in sf:
            head[k] = sf[k]
    g["levels"] = [head, *levels[1:]]
    return g


def _maybe_public(cand: Path, meta: dict, rnd: dict, sf: dict | None, floor: float) -> bool:
    if not rnd.get("passed"):
        print("VOID: random-move failed. Public unchanged.", flush=True)
        return False
    score = None if sf is None else sf.get("score", 0)
    if sf is None or not beats_published(score, floor):
        print(f"SF1320 score {score} does not beat {floor}. Public unchanged.", flush=True)
        return False
    out = {
        **meta,
        "vsRandom": rnd,
        "vsSf1320": sf,
        "gauntletElo": _patch_gauntlet(meta, sf),
        "keepDiscard": "stockfish-18-uci-elo-1320-64-visit",
    }
    maybe_promote(True, cand, PUBLIC, out, [META_PUBLIC, META_SRC])
    print("NUMBER MOVED vs SF1320. Promoted", PUBLIC, flush=True)
    return True


def supervised() -> tuple[Path, dict | None, bool]:
    if not PUBLIC.exists():
        raise SystemExit(f"missing public weights {PUBLIC}")
    if not TRAIN_JSONL.exists():
        raise SystemExit(f"missing {TRAIN_JSONL} — run train/scripts/build_lichess.py")
    rows = load_jsonl(TRAIN_JSONL, cap=1_500_000)
    print(f"supervised {len(rows)} from {TRAIN_JSONL} base {PUBLIC}", flush=True)
    history = train_candidate(
        PUBLIC,
        rows,
        HUMAN,
        source_id=SOURCE_LICHESS_2013_01,
        epochs=int(os.environ.get("HUMAN_EPOCHS", "3")),
        batch=int(os.environ.get("HUMAN_BATCH", "256")),
    )
    label = os.environ.get("HUMAN_MONTHS", MONTHS)
    meta = {
        **_meta(),
        "source": label,
        "sourceId": SOURCE_LICHESS_2013_01,
        "humanPositions": len(rows),
        "humanMonths": label,
        "historyHuman2": history,
    }
    HUMAN.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    rnd = vs_random(HUMAN)
    print("human vs random", rnd, flush=True)
    sf = _sf(HUMAN)
    print("human vs SF1320", sf, flush=True)
    promoted = _maybe_public(HUMAN, meta, rnd, sf, published_score())
    return HUMAN, sf, promoted


def selfplay_loop(base: Path, loop: int, floor: float) -> Path:
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
    _maybe_public(out, {**_meta(), "vsSnapshot": snap, "selfplayLoops": loop}, rnd, sf, floor)
    return out


def main() -> None:
    floor = published_score()
    print(f"published SF1320 score {floor}", flush=True)
    human, sf, promoted = supervised()
    if promoted:
        return
    nloops = min(MAX_SP_LOOPS, max(0, int(os.environ.get("HUMAN_SP_LOOPS", "1"))))
    base = human
    for loop in range(1, nloops + 1):
        print(f"self-play loop {loop}/{nloops} at {PLAY_VISITS} visits", flush=True)
        base = selfplay_loop(base, loop, floor)
        if published_score() > floor:
            return
    print(f"STOP: extra months + {nloops} 64-visit loop(s) did not beat {floor}.", flush=True)


if __name__ == "__main__":
    main()
