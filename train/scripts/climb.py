#!/usr/bin/env python3
"""Climb orchestrator: freeze → generate → train → snapshot gate → promote → SF64."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import PLAY_VISITS, SOURCE_SELFPLAY_64, TRAIN_VISITS, param_count  # noqa: E402
from tinyaz.generate import generate  # noqa: E402
from tinyaz.promote import freeze_snapshot, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_snapshot, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, mix_for_train, train_candidate  # noqa: E402

WEIGHTS = ROOT / "public/weights/tinyaz-s.bin"
CAND = ROOT / "train/checkpoints/tinyaz-s-cand.bin"
SNAPSHOT = ROOT / "train/checkpoints/snapshot.bin"
SP_JSONL = ROOT / "train/data/selfplay.jsonl"
LICHESS_JSONL = ROOT / "train/data/train.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"

LICHESS_MIX = 2000
REPLAY_CAP = 24_000


def _cpu_count() -> int:
    n = os.cpu_count() or 2
    return max(1, n - 2)


def _read_meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def main() -> None:
    if not WEIGHTS.exists():
        raise SystemExit(f"missing {WEIGHTS}")
    games = int(os.environ.get("CLIMB_GAMES", "64"))
    workers = int(os.environ.get("CLIMB_WORKERS", str(_cpu_count())))
    visits = int(os.environ.get("CLIMB_VISITS", str(TRAIN_VISITS)))
    old = _read_meta()
    print(
        f"climb {games} games × {visits} train visits  play {PLAY_VISITS}  "
        f"workers {workers}  keep if 1-visit vs snapshot > 0.5",
        flush=True,
    )

    freeze_snapshot(WEIGHTS, SNAPSHOT)
    replay = load_jsonl(SP_JSONL, REPLAY_CAP)
    lichess = load_jsonl(LICHESS_JSONL, LICHESS_MIX)
    new_rows = generate(WEIGHTS, games=games, visits=visits, workers=workers, out_jsonl=SP_JSONL)
    rows = mix_for_train(new_rows, replay, lichess)
    print(f"train on {len(new_rows)} new + replay {len(replay)} + lichess {len(lichess)} = {len(rows)}", flush=True)
    history = train_candidate(WEIGHTS, rows, CAND)

    snap = vs_snapshot(CAND, SNAPSHOT, games=8, visits=1)
    print("candidate vs snapshot", snap, flush=True)
    if snap["score"] <= 0.5:
        print("VOID: snapshot score <= 0.5. Public weights unchanged.", flush=True)
        sys.exit(2)

    rnd = vs_random(CAND)
    print("candidate vs random", rnd, flush=True)
    if not rnd.get("passed"):
        print("VOID: random-move gauntlet failed. Public weights unchanged.", flush=True)
        sys.exit(2)

    meta = {
        **old,
        "source": "selfplay-64",
        "sourceId": SOURCE_SELFPLAY_64,
        "selfplayGames": int(old.get("selfplayGames", 0)) + games,
        "selfplayVisits": visits,
        "playVisits": PLAY_VISITS,
        "selfplayPositions": int(old.get("selfplayPositions", 0)) + len(new_rows),
        "selfplayLoops": int(old.get("selfplayLoops", 0)) + 1,
        "lichessMix": LICHESS_MIX,
        "epochs": 2,
        "params": param_count(),
        "historyClimb": history,
        "vsSnapshot": snap,
        "vsRandom": rnd,
        "climbGames": games,
        "keepDiscard": "1-visit-vs-frozen-snapshot",
        "collapsed": False,
    }
    maybe_promote(True, CAND, WEIGHTS, meta, [META_PUBLIC, META_SRC])
    print("promoted", WEIGHTS, flush=True)

    sf = vs_stockfish_64(WEIGHTS, elo=1320, sf_path=SF_PATH if SF_PATH.exists() else None)
    if sf is None:
        meta["vsSf1320"] = {"visits": PLAY_VISITS, "uciElo": 1320, "note": "not rated"}
        print("SF64 not rated (binary missing). Card Elo unchanged.", flush=True)
    else:
        meta["vsSf1320"] = sf
        print("candidate vs SF1320", sf, flush=True)
        gauntlet = dict(old.get("gauntletElo") or {})
        if sf["score"] > 0:
            gauntlet["eloLabel"] = "1320+"
            gauntlet["estimatedElo"] = 1320
            print("NUMBER MOVED vs SF1320", flush=True)
        else:
            gauntlet["eloLabel"] = "<1320"
            print("Elo still <1320 (no points). Weights kept because snapshot improved.", flush=True)
        meta["gauntletElo"] = {**gauntlet, "visits": PLAY_VISITS}
    maybe_promote(True, WEIGHTS, WEIGHTS, meta, [META_PUBLIC, META_SRC])
    print(json.dumps({"vsSnapshot": snap, "vsSf1320": meta.get("vsSf1320")}, indent=2), flush=True)


if __name__ == "__main__":
    main()
