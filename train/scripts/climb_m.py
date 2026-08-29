#!/usr/bin/env python3
"""64-visit self-play of tinyaz-m. Snapshot keep > 0.5. Public only if 1500 not worse."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))
sys.path.insert(0, str(ROOT / "train" / "scripts"))

from elo_gauntlet import mle_elo  # noqa: E402
from tinyaz.constants import PLAY_VISITS, SOURCE_SELFPLAY_64  # noqa: E402
from tinyaz.generate import generate  # noqa: E402
from tinyaz.promote import freeze_snapshot, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_snapshot, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, mix_for_train, train_candidate  # noqa: E402

PUBLIC = ROOT / "public/weights/tinyaz-m.bin"
CAND = ROOT / "train/checkpoints/tinyaz-m-cand.bin"
SNAPSHOT = ROOT / "train/checkpoints/snapshot-m.bin"
SP_JSONL = ROOT / "train/data/selfplay-m.jsonl"
HUMAN_JSONL = ROOT / "train/data/human/train.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-m.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"
REPLAY_CAP = 24_000
LICHESS_MIX = 2000
MAX_LOOPS = 3


def _meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def published_1500(meta: dict) -> float:
    vs = meta.get("vsSf1500") or {}
    if vs:
        return float(vs.get("score") or 0)
    return 0.0


def _sf(path: Path, elo: int) -> dict | None:
    return vs_stockfish_64(path, elo=elo, sf_path=SF_PATH if SF_PATH.exists() else None, visits=PLAY_VISITS)


def _expand(row: dict) -> list[tuple[int, float]]:
    elo = int(row["uciElo"])
    return [(elo, 1.0)] * int(row["wins"]) + [(elo, 0.5)] * int(row.get("draws") or 0) + [(elo, 0.0)] * int(row["losses"])


def _write_card(meta: dict, rnd: dict, sf1320: dict | None, sf1500: dict | None) -> dict:
    out = {**meta, "vsRandom": rnd, "vsSf1320": sf1320, "vsSf1500": sf1500, "selfplayVisits": PLAY_VISITS}
    g = dict(out.get("gauntletElo") or {})
    g["visits"] = PLAY_VISITS
    levels = []
    if sf1320:
        levels.append(sf1320)
    if sf1500:
        levels.append(sf1500)
    if levels:
        g["levels"] = levels
        obs = []
        for lv in levels:
            obs.extend(_expand(lv))
        est = mle_elo(obs)
        g["estimatedElo"] = est.get("elo")
        g["eloLabel"] = est.get("label")
        g["eloLo"] = est.get("lo")
        g["eloHi"] = est.get("hi")
        g["games"] = len(obs)
    out["gauntletElo"] = g
    return out


def one_loop(loop: int, games: int, workers: int, floor: float) -> str:
    freeze_snapshot(PUBLIC, SNAPSHOT)
    replay = load_jsonl(SP_JSONL, REPLAY_CAP)
    lichess = load_jsonl(HUMAN_JSONL, LICHESS_MIX)
    print(f"generate {games} games × {PLAY_VISITS} visits workers {workers}", flush=True)
    new_rows = generate(PUBLIC, games=games, visits=PLAY_VISITS, workers=workers, out_jsonl=SP_JSONL)
    rows = mix_for_train(new_rows, replay, lichess)
    print(f"train on {len(new_rows)} new + replay {len(replay)} + human {len(lichess)}", flush=True)
    history = train_candidate(PUBLIC, rows, CAND, source_id=SOURCE_SELFPLAY_64, epochs=2, batch=64)
    snap = vs_snapshot(CAND, SNAPSHOT, games=8, visits=PLAY_VISITS)
    print("m vs snapshot 64-visit", snap, flush=True)
    if snap["score"] <= 0.5:
        print("VOID: 64-visit snapshot <= 0.5. Public m unchanged.", flush=True)
        return "VOID"
    rnd = vs_random(CAND)
    print("m vs random", rnd, flush=True)
    if not rnd.get("passed"):
        print("VOID: random-move failed. Public m unchanged.", flush=True)
        return "VOID"
    sf1320 = _sf(CAND, 1320)
    sf1500 = _sf(CAND, 1500)
    print("m vs SF1320", sf1320, flush=True)
    print("m vs SF1500", sf1500, flush=True)
    score1500 = 0.0 if sf1500 is None else float(sf1500.get("score") or 0)
    if sf1500 is not None and score1500 < floor:
        print(f"VOID public: SF1500 {score1500} < floor {floor}. Side checkpoint kept.", flush=True)
        maybe_promote(True, CAND, ROOT / f"train/checkpoints/tinyaz-m-sp{loop}.bin", {"vsSnapshot": snap, "historyClimb": history, "vsSf1500": sf1500}, [CAND.with_suffix(".meta.json")])
        return "VOID"
    meta = _write_card({**_meta(), "vsSnapshot": snap, "historyClimb": history, "selfplayLoops": loop}, rnd, sf1320, sf1500)
    maybe_promote(True, CAND, PUBLIC, meta, [META_PUBLIC, META_SRC])
    print("KEEP. Promoted", PUBLIC, "1500", score1500, flush=True)
    if score1500 >= 0.5:
        return "GATE"
    return "IMPROVED"


def main() -> None:
    if not PUBLIC.exists():
        raise SystemExit(f"missing {PUBLIC}")
    games = int(os.environ.get("CLIMB_GAMES", "64"))
    workers = int(os.environ.get("CLIMB_WORKERS", str(max(1, (os.cpu_count() or 2) - 2))))
    nloops = min(MAX_LOOPS, max(1, int(os.environ.get("CLIMB_MAX_LOOPS", "3"))))
    floor = published_1500(_meta())
    print(f"climb_m games {games} play {PLAY_VISITS} floor1500 {floor} loops {nloops}", flush=True)
    voids = 0
    for loop in range(1, nloops + 1):
        status = one_loop(loop, games, workers, floor)
        print(f"loop {loop} {status}", flush=True)
        if status == "GATE":
            print("STOP: 50% vs SF1500.", flush=True)
            return
        if status == "VOID":
            voids += 1
            if voids >= 3:
                print("STOP: 3 VOID loops.", flush=True)
                return
        else:
            voids = 0
            floor = published_1500(_meta())
            games = int(os.environ.get("CLIMB_GAMES_KEEP", "256"))
    print("STOP: loop cap. 1500 still", published_1500(_meta()), flush=True)


if __name__ == "__main__":
    main()
