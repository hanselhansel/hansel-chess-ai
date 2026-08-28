#!/usr/bin/env python3
"""Add Lichess months until 64-visit Elo is above 1320. Python while, not a Grok workflow."""

from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))
sys.path.insert(0, str(ROOT / "train" / "scripts"))

from build_lichess import (  # noqa: E402
    OUT_TRAIN,
    OUT_VAL,
    download_url,
    find_pgns,
    months_label,
    next_month,
)
from human_month import PUBLIC, SF_PATH, _meta, published_score, supervised  # noqa: E402
from tinyaz.data import write_human_months  # noqa: E402
from tinyaz.promote import above_1320  # noqa: E402
from tinyaz.rate import vs_stockfish_64  # noqa: E402

from tinyaz.constants import PLAY_VISITS  # noqa: E402

MAX_VOID = 3


def last_trained_month(meta: dict) -> str:
    hm = str(meta.get("humanMonths") or "2013-04")
    tail = hm.split("..")[-1].replace("lichess-", "")
    if len(tail) == 7 and tail[4] == "-":
        return tail
    return "2013-04"


def ensure_month(ym: str) -> Path:
    dest = ROOT / "train/data" / f"lichess_db_standard_rated_{ym}.pgn.zst"
    if dest.exists() and dest.stat().st_size > 1000:
        return dest
    url = download_url(ym)
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"GET {url}", flush=True)
    try:
        urllib.request.urlretrieve(url, dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise SystemExit(f"missing Lichess {ym} PGN. Download:\n  {url}\n  to {dest}\n{e}") from e
    if dest.stat().st_size < 1000:
        dest.unlink(missing_ok=True)
        raise SystemExit(f"missing Lichess {ym} PGN. Download:\n  {url}\n  to {dest}")
    return dest


def rebuild() -> str:
    pgns = find_pgns()
    label = months_label(pgns)
    print(f"rebuild {label} archives {len(pgns)}", flush=True)
    stats = write_human_months(pgns, OUT_TRAIN, OUT_VAL)
    print("wrote", OUT_TRAIN, stats, flush=True)
    return label


def one_loop() -> str:
    meta = _meta()
    nxt = next_month(last_trained_month(meta))
    ensure_month(nxt)
    label = rebuild()
    os.environ["HUMAN_MONTHS"] = label
    os.environ.setdefault("HUMAN_SP_LOOPS", "0")
    human, sf, promoted = supervised()
    sf1500 = None
    gauntlet = None
    score = 0.0 if sf is None else float(sf.get("score") or 0)
    if score >= 0.5:
        print("rating 64-visit vs SF1500", flush=True)
        sf1500 = vs_stockfish_64(
            human,
            elo=1500,
            sf_path=SF_PATH if SF_PATH.exists() else None,
            visits=PLAY_VISITS,
        )
        print("human vs SF1500", sf1500, flush=True)
    if above_1320(sf, sf1500, gauntlet):
        print("GATE >1320", sf, sf1500, flush=True)
        return "GATE"
    if promoted:
        return "IMPROVED"
    return "VOID"


def main() -> None:
    if not PUBLIC.exists():
        raise SystemExit(f"missing public weights {PUBLIC}")
    max_loops = int(os.environ.get("CLIMB_MAX_LOOPS", "6"))
    voids = 0
    print(f"published SF1320 score {published_score()} max_loops {max_loops}", flush=True)
    for i in range(1, max_loops + 1):
        print(f"climb loop {i}/{max_loops}", flush=True)
        status = one_loop()
        print(f"loop {i} {status}", flush=True)
        if status == "GATE":
            print("STOP: published >1320 gate hit.", flush=True)
            return
        if status == "VOID":
            voids += 1
            if voids >= MAX_VOID:
                print("STOP: 3 VOID loops. Next is tinyaz-m.", flush=True)
                return
        else:
            voids = 0
    print(f"STOP: hit CLIMB_MAX_LOOPS={max_loops}. Public still {published_score()}.", flush=True)


if __name__ == "__main__":
    main()
