#!/usr/bin/env python3
"""Continue tinyaz-m on the next Lichess month. Public if 1500 floor holds and a rung improves."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))
sys.path.insert(0, str(ROOT / "train" / "scripts"))

from build_lichess import OUT_TRAIN, OUT_VAL, find_pgns, months_label, next_month  # noqa: E402
from climb_until import ensure_month  # noqa: E402
from elo_gauntlet import mle_elo  # noqa: E402
from tinyaz.constants import PLAY_VISITS, SOURCE_LICHESS_2013_01  # noqa: E402
from tinyaz.data import write_human_months  # noqa: E402
from tinyaz.promote import beats_published, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, train_candidate  # noqa: E402

PUBLIC = ROOT / "public/weights/tinyaz-m.bin"
CAND = ROOT / "train/checkpoints/tinyaz-m-months.bin"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-m.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"
PER_MONTH = 300_000
MAX_LOOPS = 3


def _meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def last_trained_month(meta: dict) -> str:
    override = os.environ.get("MONTHS_FROM", "").strip()
    if override:
        return override
    hm = str(meta.get("humanMonths") or meta.get("source") or "2013-05")
    tail = hm.split("..")[-1].replace("lichess-", "")
    if len(tail) == 7 and tail[4] == "-":
        return tail
    return "2013-05"


def published_score(meta: dict, key: str) -> float:
    vs = meta.get(key) or {}
    if vs:
        return float(vs.get("score") or 0)
    return 0.0


def published_1500(meta: dict) -> float:
    return published_score(meta, "vsSf1500")


def _flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes"}


def _sf(path: Path, elo: int) -> dict | None:
    return vs_stockfish_64(path, elo=elo, sf_path=SF_PATH if SF_PATH.exists() else None, visits=PLAY_VISITS)


def _expand(row: dict) -> list[tuple[int, float]]:
    elo = int(row["uciElo"])
    return [(elo, 1.0)] * int(row["wins"]) + [(elo, 0.5)] * int(row.get("draws") or 0) + [(elo, 0.0)] * int(row["losses"])


def _write_card(
    meta: dict,
    rnd: dict,
    sf1320: dict | None,
    sf1500: dict | None,
    sf1800: dict | None = None,
    sf2000: dict | None = None,
) -> dict:
    out = {
        **meta,
        "vsRandom": rnd,
        "vsSf1320": sf1320,
        "vsSf1500": sf1500,
        "vsSf1800": sf1800,
        "vsSf2000": sf2000,
        "playVisits": PLAY_VISITS,
    }
    g = dict(out.get("gauntletElo") or {})
    g["visits"] = PLAY_VISITS
    levels = [lv for lv in (sf1320, sf1500, sf1800, sf2000) if lv]
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


def one_loop(loop: int) -> str:
    meta = _meta()
    nxt = next_month(last_trained_month(meta))
    rate_only = _flag("MONTHS_RATE_ONLY")
    skip_rebuild = rate_only or _flag("MONTHS_SKIP_REBUILD")
    skip_rate = _flag("MONTHS_SKIP_RATE")
    if not skip_rebuild:
        ensure_month(nxt)
    pgns = find_pgns()
    label = months_label(pgns)
    max_train = PER_MONTH * len(pgns)
    epochs = int(os.environ.get("HUMAN_EPOCHS", "3"))
    batch = int(os.environ.get("HUMAN_BATCH", "256"))
    history: list = []
    if rate_only:
        print(f"rate only {CAND}", flush=True)
        if not CAND.exists():
            raise SystemExit(f"missing {CAND}")
    else:
        if skip_rebuild:
            print(f"skip rebuild: train existing {OUT_TRAIN} cap {max_train}", flush=True)
        else:
            print(f"rebuild {label} archives {len(pgns)} cap {max_train}", flush=True)
            stats = write_human_months(pgns, OUT_TRAIN, OUT_VAL, max_train=max_train)
            print("wrote", OUT_TRAIN, stats, flush=True)
        rows = load_jsonl(OUT_TRAIN, cap=max_train)
        print(f"train_candidate m {len(rows)} epochs {epochs} batch {batch}", flush=True)
        history = train_candidate(PUBLIC, rows, CAND, source_id=SOURCE_LICHESS_2013_01, epochs=epochs, batch=batch)
        if skip_rate:
            print("TRAINED. Packed", CAND, "skip rate.", flush=True)
            return "TRAINED"
    rnd = vs_random(CAND)
    print("m vs random", rnd, flush=True)
    if not rnd.get("passed"):
        print("VOID: random-move failed. Public m unchanged.", flush=True)
        return "VOID"
    sf1320 = _sf(CAND, 1320)
    sf1500 = _sf(CAND, 1500)
    sf1800 = _sf(CAND, 1800)
    sf2000 = _sf(CAND, 2000)
    print("m vs SF1320", sf1320, flush=True)
    print("m vs SF1500", sf1500, flush=True)
    print("m vs SF1800", sf1800, flush=True)
    print("m vs SF2000", sf2000, flush=True)
    score1500 = 0.0 if sf1500 is None else float(sf1500.get("score") or 0)
    score1800 = 0.0 if sf1800 is None else float(sf1800.get("score") or 0)
    score2000 = 0.0 if sf2000 is None else float(sf2000.get("score") or 0)
    floor = published_1500(meta)
    floor1800 = published_score(meta, "vsSf1800")
    floor2000 = published_score(meta, "vsSf2000")
    keep = score1500 >= floor and (
        beats_published(score1500, floor)
        or beats_published(score1800, floor1800)
        or beats_published(score2000, floor2000)
    )
    card = _write_card(
        {**meta, "humanMonths": label, "historyMonths": history, "selfplayLoops": loop},
        rnd,
        sf1320,
        sf1500,
        sf1800,
        sf2000,
    )
    if not keep:
        print(
            f"VOID public: 1500 {score1500} need>={floor} and "
            f"(1500>{floor} or 1800>{floor1800} or 2000>{floor2000}). Side checkpoint kept.",
            flush=True,
        )
        maybe_promote(True, CAND, ROOT / f"train/checkpoints/tinyaz-m-mo{loop}.bin", card, [CAND.with_suffix(".meta.json")])
        return "VOID"
    maybe_promote(True, CAND, PUBLIC, card, [META_PUBLIC, META_SRC])
    print("KEEP. Promoted", PUBLIC, "1500", score1500, "1800", score1800, "2000", score2000, flush=True)
    if score2000 >= 0.5:
        return "GATE"
    return "IMPROVED"


def main() -> None:
    if not PUBLIC.exists():
        raise SystemExit(f"missing {PUBLIC}")
    nloops = min(MAX_LOOPS, max(1, int(os.environ.get("CLIMB_MAX_LOOPS", "3"))))
    print(f"months_m play {PLAY_VISITS} floor1500 {published_1500(_meta())} loops {nloops}", flush=True)
    voids = 0
    for loop in range(1, nloops + 1):
        status = one_loop(loop)
        print(f"loop {loop} {status}", flush=True)
        if status == "GATE":
            print("STOP: 50% vs SF2000.", flush=True)
            return
        if status == "VOID":
            voids += 1
            if voids >= 3:
                print("STOP: 3 VOID loops.", flush=True)
                return
        else:
            voids = 0
    print("STOP: loop cap. 1500 still", published_1500(_meta()), flush=True)


if __name__ == "__main__":
    main()
