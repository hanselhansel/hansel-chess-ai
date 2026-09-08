#!/usr/bin/env python3
"""Challenge 3+2 rated bots while hanselhansel is idle. Token from .token only."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOKEN_PATH = HERE / ".token"
STATE_PATH = HERE / "rotator_state.json"
WDL_PATH = HERE / "wdl.jsonl"
PGN_DIR = HERE / "game_records"
ME = "hanselhansel"
MIN_ELO = 1400
MAX_ELO = 2200
TARGET_ELO = 1900
STOP_GAMES = 80
STOP_GAMES_RD = 50
STOP_RD = 80
CHALLENGE_LIMIT = 180
CHALLENGE_INC = 2
IDLE_SLEEP = 40
PLAYING_SLEEP = 20
DECLINE_COOLDOWN = 3600
CHALLENGE_COOLDOWN = 1200
SKIP_SUB = ("odds", "queenpawn", "giveaway")
SKIP_IDS = {
    "leelaqueenodds",
    "leelarookodds",
    "leelaknightodds",
    "leelapieceodds",
    "leelaqueenforknight",
    "leelaalien",
    "leelarogue",
    "worstfish",
    "anti-bot",
    "variantsbot",
}
UNTIL_RE = re.compile(r"wait until ([0-9T:\.\-Z]+)")
NAME_RE = re.compile(r"^[a-zA-Z0-9_-]{1,30}$")
GID_RE = re.compile(r"^[A-Za-z0-9]{4,12}$")
SKIP_STATUS = {"started", "created", "aborted", "noStart", "unknownFinish"}


def token() -> str:
    if not TOKEN_PATH.is_file():
        raise SystemExit("missing token file")
    t = TOKEN_PATH.read_text().strip()
    if not t.startswith("lip_"):
        raise SystemExit("missing token file")
    return t


def api(url: str, tok: str, data: bytes | None = None, accept: str = "application/json") -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        data=data,
        method="POST" if data is not None else "GET",
        headers={
            "Authorization": f"Bearer {tok}",
            "Accept": accept,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def load_state() -> dict:
    if not STATE_PATH.is_file():
        return {"seen_games": [], "cooldown": {}, "day_cap": {}}
    try:
        data = json.loads(STATE_PATH.read_text())
    except json.JSONDecodeError:
        return {"seen_games": [], "cooldown": {}, "day_cap": {}}
    if not isinstance(data, dict):
        return {"seen_games": [], "cooldown": {}, "day_cap": {}}
    data.setdefault("seen_games", [])
    data.setdefault("cooldown", {})
    data.setdefault("day_cap", {})
    return data


def save_state(st: dict) -> None:
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(st, indent=2))
    tmp.replace(STATE_PATH)


def now() -> float:
    return time.time()


def account(tok: str) -> dict | None:
    code, body = api("https://lichess.org/api/account", tok)
    if code != 200:
        return None
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    name = (data.get("username") or data.get("id") or "").lower()
    if name != ME:
        raise SystemExit(f"token account {name!r} is not {ME}")
    return data


def blitz_stats(acct: dict) -> tuple[int, float, bool, int]:
    b = (acct.get("perfs") or {}).get("blitz") or {}
    c = acct.get("count") or {}
    return (
        int(b.get("games") or 0),
        float(b.get("rd") or 500),
        bool(b.get("prov")),
        int(c.get("playing") or 0),
    )


def online_bots() -> list[tuple[str, int]]:
    code, body = api("https://lichess.org/api/bot/online?nb=80", token(), accept="application/x-ndjson")
    # public endpoint, but auth is fine
    out: list[tuple[str, int]] = []
    if code != 200:
        req = urllib.request.Request("https://lichess.org/api/bot/online?nb=80")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                body = r.read().decode("utf-8", "replace")
        except Exception:
            return []
    for line in body.splitlines():
        if not line.strip():
            continue
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        name = (d.get("id") or d.get("username") or "").lower()
        rating = ((d.get("perfs") or {}).get("blitz") or {}).get("rating")
        if not name or not rating or not NAME_RE.fullmatch(name):
            continue
        out.append((name, int(rating)))
    return out


def skip_name(name: str) -> bool:
    n = name.lower()
    if n == ME or n in SKIP_IDS:
        return True
    return any(s in n for s in SKIP_SUB)


def cooled(st: dict, name: str) -> bool:
    until = (st.get("cooldown") or {}).get(name)
    return bool(until and until > now())


def capped(st: dict, name: str) -> bool:
    day = (st.get("day_cap") or {}).get(name)
    return day == datetime.now(timezone.utc).date().isoformat()


def set_cooldown(st: dict, name: str, seconds: int) -> None:
    st.setdefault("cooldown", {})[name] = now() + seconds


def parse_until(msg: str) -> float | None:
    m = UNTIL_RE.search(msg)
    if not m:
        return None
    raw = m.group(1)
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt.timestamp()
    except ValueError:
        return None


def challenge(tok: str, name: str) -> tuple[str, str]:
    body = urllib.parse.urlencode(
        {
            "rated": "true",
            "clock.limit": str(CHALLENGE_LIMIT),
            "clock.increment": str(CHALLENGE_INC),
            "color": "random",
        }
    ).encode()
    if not NAME_RE.fullmatch(name):
        return "fail", "bad name"
    path = urllib.parse.quote(name, safe="")
    code, raw = api(f"https://lichess.org/api/challenge/{path}", tok, data=body)
    if code in (200, 201):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return "fail", raw.replace("\n", " ")
        ch = data.get("challenge") or data
        return "ok", str(ch.get("id") or "")
    return "fail", raw.replace("\n", " ")


def sync_games(tok: str, st: dict) -> None:
    code, body = api(
        "https://lichess.org/api/games/user/hanselhansel?max=30&moves=false&pgnInJson=true",
        tok,
        accept="application/x-ndjson",
    )
    if code != 200 or not body.strip():
        return
    PGN_DIR.mkdir(parents=True, exist_ok=True)
    seen = set(st.get("seen_games") or [])
    for line in body.splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        gid = d.get("id")
        if not gid or gid in seen or not GID_RE.fullmatch(str(gid)):
            continue
        if d.get("status") in ("started", "created"):
            continue
        seen.add(gid)
        st["seen_games"] = sorted(seen)
        save_state(st)
        if d.get("status") in SKIP_STATUS:
            continue
        w = ((d.get("players") or {}).get("white") or {})
        b = ((d.get("players") or {}).get("black") or {})
        wn = ((w.get("user") or {}).get("name") or "")
        bn = ((b.get("user") or {}).get("name") or "")
        opp = bn if wn.lower() == ME else wn
        me_white = wn.lower() == ME
        winner = d.get("winner")
        if winner == "white":
            result = "W" if me_white else "L"
        elif winner == "black":
            result = "L" if me_white else "W"
        else:
            result = "D"
        row = {
            "id": gid,
            "speed": d.get("speed"),
            "rated": d.get("rated"),
            "status": d.get("status"),
            "opponent": opp,
            "result": result,
            "tc": (d.get("clock") or {}),
            "opp_rating": (b if me_white else w).get("rating"),
        }
        with WDL_PATH.open("a") as f:
            f.write(json.dumps(row) + "\n")
        path = urllib.parse.quote(str(gid), safe="")
        pgn_code, pgn = api(
            f"https://lichess.org/game/export/{path}", tok, accept="application/x-chess-pgn"
        )
        dest = (PGN_DIR / f"{gid}.pgn").resolve()
        if pgn_code == 200 and pgn.strip() and dest.parent == PGN_DIR.resolve():
            dest.write_text(pgn)
        print(f"GAME {gid} {result} vs {opp} {row.get('opp_rating')} {d.get('speed')}", flush=True)


def pick(st: dict, bots: list[tuple[str, int]]) -> str | None:
    eligible = [
        (n, r)
        for n, r in bots
        if MIN_ELO <= r <= MAX_ELO and not skip_name(n) and not cooled(st, n) and not capped(st, n)
    ]
    eligible.sort(key=lambda x: abs(x[1] - TARGET_ELO))
    return eligible[0][0] if eligible else None


def done(games: int, rd: float) -> bool:
    if games >= STOP_GAMES:
        return True
    return games >= STOP_GAMES_RD and rd < STOP_RD


def vsbot_lockout_s(detail: str) -> int | None:
    low = detail.lower()
    if "please wait before challenging another bot" in low:
        return 60
    try:
        data = json.loads(detail)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    key = str((data.get("ratelimit") or {}).get("key") or "")
    if "vsbot" not in key.lower() and key != "bot.vsBot.day":
        return None
    try:
        secs = int((data.get("ratelimit") or {}).get("seconds") or 60)
    except (TypeError, ValueError):
        secs = 60
    return max(secs, 60)


def main() -> None:
    tok = token()
    st = load_state()
    print("rotator start", flush=True)
    while True:
        try:
            acct = account(tok)
            if acct is None:
                print("NET account", flush=True)
                time.sleep(IDLE_SLEEP)
                continue
            games, rd, _prov, playing = blitz_stats(acct)
            sync_games(tok, st)
            save_state(st)
            print(f"status blitz_games={games} rd={rd:.0f} playing={playing}", flush=True)
            if done(games, rd):
                print("STOP gates hit", flush=True)
                return
            if playing:
                time.sleep(PLAYING_SLEEP)
                continue
            bots = online_bots()
            name = pick(st, bots)
            if not name:
                print("no eligible opponent", flush=True)
                time.sleep(IDLE_SLEEP)
                continue
            kind, detail = challenge(tok, name)
            if kind == "ok":
                print(f"CHALLENGE {name} {detail}", flush=True)
                set_cooldown(st, name, CHALLENGE_COOLDOWN)
            else:
                shown = detail[:240]
                print(f"DECLINE {name} {shown}", flush=True)
                lock = vsbot_lockout_s(detail)
                if lock is not None:
                    time.sleep(lock)
                    continue
                until = parse_until(detail)
                if until:
                    st.setdefault("day_cap", {})[name] = datetime.now(timezone.utc).date().isoformat()
                    st.setdefault("cooldown", {})[name] = until
                else:
                    set_cooldown(st, name, DECLINE_COOLDOWN)
            save_state(st)
            time.sleep(IDLE_SLEEP)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
            print(f"NET {type(e).__name__}", flush=True)
            time.sleep(IDLE_SLEEP)


if __name__ == "__main__":
    main()
