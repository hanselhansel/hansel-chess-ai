#!/usr/bin/env python3
"""Train tinyaz-m (8x128) from scratch on the 1.5M mix. Promote only if it beats s vs SF1500."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "src"))

from tinyaz.constants import CHANNELS_M, PLAY_VISITS, SOURCE_LICHESS_2013_01, flops_per_eval, param_count  # noqa: E402
from tinyaz.promote import beats_published, maybe_promote  # noqa: E402
from tinyaz.rate import vs_random, vs_stockfish_64  # noqa: E402
from tinyaz.train_loop import load_jsonl, train_fresh  # noqa: E402

PUBLIC_S = ROOT / "public/weights/tinyaz-s.bin"
PUBLIC_M = ROOT / "public/weights/tinyaz-m.bin"
CKPT = ROOT / "train/checkpoints/tinyaz-m.bin"
TRAIN_JSONL = ROOT / "train/data/human/train.jsonl"
SF_PATH = ROOT / "train/bin/stockfish"
META_PUBLIC = ROOT / "public/weights/tinyaz-s.meta.json"
META_M = ROOT / "public/weights/tinyaz-m.meta.json"
META_SRC = ROOT / "src/lib/chess/checkpoint-meta.json"
JS_CONSTANTS = ROOT / "src/lib/chess/constants.ts"


def _meta() -> dict:
    if META_PUBLIC.exists():
        return json.loads(META_PUBLIC.read_text())
    return {}


def published_1500(meta: dict) -> float:
    vs = meta.get("vsSf1500") or {}
    if vs:
        return float(vs.get("score") or 0)
    levels = (meta.get("gauntletElo") or {}).get("levels") or []
    for lv in levels:
        if int(lv.get("uciElo") or 0) == 1500:
            return float(lv.get("score") or 0)
    return 0.0


def point_js_at_m() -> None:
    text = JS_CONSTANTS.read_text()
    text = text.replace('export const WEIGHTS_URL = "/weights/tinyaz-s.bin";', 'export const WEIGHTS_URL = "/weights/tinyaz-m.bin";')
    text = text.replace('export const MODEL_NAME = "tinyaz-s";', 'export const MODEL_NAME = "tinyaz-m";')
    JS_CONSTANTS.write_text(text)


def main() -> None:
    if not TRAIN_JSONL.exists():
        raise SystemExit(f"missing {TRAIN_JSONL}")
    rows = load_jsonl(TRAIN_JSONL, cap=1_500_000)
    print(f"train_m {len(rows)} channels {CHANNELS_M} params {param_count(CHANNELS_M)}", flush=True)
    history = train_fresh(
        rows,
        CKPT,
        channels=CHANNELS_M,
        source_id=SOURCE_LICHESS_2013_01,
        epochs=int(os.environ.get("HUMAN_EPOCHS", "3")),
        batch=int(os.environ.get("HUMAN_BATCH", "256")),
    )
    meta = {
        **_meta(),
        "name": "tinyaz-m",
        "params": param_count(CHANNELS_M),
        "flopsPerEval": flops_per_eval(CHANNELS_M),
        "channels": CHANNELS_M,
        "historyM": history,
        "humanPositions": len(rows),
    }
    CKPT.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    rnd = vs_random(CKPT)
    print("m vs random", rnd, flush=True)
    sf_path = SF_PATH if SF_PATH.exists() else None
    sf1320 = vs_stockfish_64(CKPT, elo=1320, sf_path=sf_path, visits=PLAY_VISITS)
    print("m vs SF1320", sf1320, flush=True)
    sf1500 = vs_stockfish_64(CKPT, elo=1500, sf_path=sf_path, visits=PLAY_VISITS)
    print("m vs SF1500", sf1500, flush=True)
    floor = published_1500(_meta())
    ok_rand = bool(rnd.get("passed"))
    ok_1500 = sf1500 is not None and beats_published(sf1500.get("score") or 0, floor)
    ok_1320 = sf1320 is not None and float(sf1320.get("score") or 0) >= 0.5
    keep = ok_rand and ok_1500 and ok_1320
    out = {**meta, "vsRandom": rnd, "vsSf1320": sf1320, "vsSf1500": sf1500}
    if not keep:
        print(
            f"VOID: m not promoted. random={ok_rand} sf1500={None if sf1500 is None else sf1500.get('score')} "
            f"need>{floor} sf1320={None if sf1320 is None else sf1320.get('score')}",
            flush=True,
        )
        CKPT.with_suffix(".meta.json").write_text(json.dumps(out, indent=2) + "\n")
        return
    maybe_promote(True, CKPT, PUBLIC_M, out, [META_M, META_SRC])
    point_js_at_m()
    print("NUMBER MOVED vs SF1500. Promoted", PUBLIC_M, flush=True)


if __name__ == "__main__":
    main()
