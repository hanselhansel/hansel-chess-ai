#!/usr/bin/env python3
"""Challenge rotator unit tests. urllib mocked. No live Lichess."""

from __future__ import annotations

import json
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "train" / "lichess-bot"))

import challenge_rotator as cr  # noqa: E402


class FakeResp:
    def __init__(self, status: int, body: str) -> None:
        self.status = status
        self._body = body.encode()

    def read(self) -> bytes:
        return self._body

    def __enter__(self) -> FakeResp:
        return self

    def __exit__(self, *a) -> bool:
        return False


def _http_error(code: int, body: str) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(
        "https://lichess.org/x",
        code,
        "err",
        hdrs=None,
        fp=BytesIO(body.encode()),
    )


def _install_tmp() -> Path:
    tmp = Path(tempfile.mkdtemp())
    cr.TOKEN_PATH = tmp / ".token"
    cr.TOKEN_PATH.write_text("lip_testtoken\n")
    cr.STATE_PATH = tmp / "rotator_state.json"
    cr.WDL_PATH = tmp / "wdl.jsonl"
    cr.PGN_DIR = tmp / "game_records"
    return tmp


def test_token_accepts_lip_and_rejects_other() -> None:
    tmp = _install_tmp()
    assert cr.token() == "lip_testtoken"
    cr.TOKEN_PATH = tmp / "missing"
    try:
        cr.token()
        raise AssertionError("expected SystemExit")
    except SystemExit:
        pass
    cr.TOKEN_PATH = tmp / "bad"
    cr.TOKEN_PATH.write_text("not-a-token\n")
    try:
        cr.token()
        raise AssertionError("expected SystemExit")
    except SystemExit:
        pass


def test_load_and_save_state() -> None:
    _install_tmp()
    st = cr.load_state()
    assert st["seen_games"] == []
    assert st["cooldown"] == {}
    assert st["day_cap"] == {}
    st["seen_games"] = ["abc"]
    cr.save_state(st)
    loaded = cr.load_state()
    assert loaded["seen_games"] == ["abc"]


def test_api_get_post_and_http_error() -> None:
    captured: dict = {}

    def fake_open(req, timeout=20):
        captured["url"] = req.full_url
        captured["method"] = req.get_method()
        captured["timeout"] = timeout
        captured["auth"] = req.headers.get("Authorization") or req.get_header("Authorization")
        if req.full_url.endswith("/fail"):
            raise _http_error(429, "slow")
        body = '{"ok":true}'
        if req.data is not None:
            body = '{"challenge":{"id":"xyz"}}'
        return FakeResp(201 if req.data is not None else 200, body)

    old = urllib.request.urlopen
    urllib.request.urlopen = fake_open  # type: ignore[assignment]
    try:
        code, body = cr.api("https://lichess.org/api/user/hanselhansel", "lip_x")
        assert code == 200
        assert json.loads(body)["ok"] is True
        assert captured["method"] == "GET"
        assert captured["timeout"] == 20
        assert captured["auth"] is not None and "lip_x" in captured["auth"]
        assert captured["auth"].lower().startswith("bearer ")
        code, body = cr.api("https://lichess.org/api/challenge/bot", "lip_x", data=b"rated=true")
        assert code == 201
        assert captured["method"] == "POST"
        code, body = cr.api("https://lichess.org/fail", "lip_x")
        assert code == 429
        assert body == "slow"
    finally:
        urllib.request.urlopen = old


def test_account_and_blitz_stats() -> None:
    def fake_api(url, tok, data=None, accept="application/json"):
        if "missing" in url:
            return 404, ""
        return 200, json.dumps(
            {
                "id": "hanselhansel",
                "username": "hanselhansel",
                "perfs": {"blitz": {"games": 12, "rd": 45.5, "prov": True}},
                "count": {"playing": 1},
            }
        )

    old = cr.api
    cr.api = fake_api  # type: ignore[assignment]
    try:
        acct = cr.account("lip_x")
        assert acct is not None
        assert cr.blitz_stats(acct) == (12, 45.5, True, 1)
        assert cr.blitz_stats({}) == (0, 500.0, False, 0)
        cr.api = lambda *a, **k: (503, "no")  # type: ignore[assignment]
        assert cr.account("lip_x") is None
    finally:
        cr.api = old


def test_online_bots_parse_and_fallback() -> None:
    _install_tmp()
    ndjson = "\n".join(
        [
            json.dumps({"id": "AlphaBot", "perfs": {"blitz": {"rating": 1910}}}),
            "",
            json.dumps({"username": "norating"}),
            json.dumps({"id": "", "perfs": {"blitz": {"rating": 1800}}}),
            json.dumps({"id": "beta", "perfs": {"blitz": {"rating": 1400}}}),
        ]
    )
    old_api = cr.api
    cr.api = lambda *a, **k: (200, ndjson)  # type: ignore[assignment]
    try:
        assert cr.online_bots() == [("alphabot", 1910), ("beta", 1400)]
    finally:
        cr.api = old_api

    old_open = urllib.request.urlopen
    try:
        cr.api = lambda *a, **k: (500, "")  # type: ignore[assignment]
        urllib.request.urlopen = lambda *a, **k: FakeResp(200, ndjson)  # type: ignore[assignment]
        assert ("alphabot", 1910) in cr.online_bots()
    finally:
        urllib.request.urlopen = old_open

    def boom(*a, **k):
        raise OSError("down")

    urllib.request.urlopen = boom  # type: ignore[assignment]
    try:
        assert cr.online_bots() == []
    finally:
        urllib.request.urlopen = old_open
        cr.api = old_api


def test_skip_cooled_capped() -> None:
    cr.now = lambda: 1_000.0  # type: ignore[assignment]
    try:
        assert cr.skip_name("hanselhansel") is True
        assert cr.skip_name("LeelaQueenOdds") is True
        assert cr.skip_name("GiveAwayBot") is True
        assert cr.skip_name("queenpawn") is True
        assert cr.skip_name("normalbot") is False
        st: dict = {}
        assert cr.cooled(st, "x") is False
        cr.set_cooldown(st, "x", 50)
        assert st["cooldown"]["x"] == 1_050.0
        assert cr.cooled(st, "x") is True
        cr.now = lambda: 1_051.0  # type: ignore[assignment]
        assert cr.cooled(st, "x") is False
        today = datetime.now(timezone.utc).date().isoformat()
        st["day_cap"] = {"y": today, "z": "1999-01-01"}
        assert cr.capped(st, "y") is True
        assert cr.capped(st, "z") is False
        assert cr.capped(st, "missing") is False
    finally:
        cr.now = time.time  # type: ignore[assignment]


def test_parse_until_and_done_gates() -> None:
    assert cr.parse_until("nope") is None
    assert cr.parse_until("wait until not-a-date") is None
    ts = cr.parse_until("please wait until 2026-09-08T12:00:00.000Z")
    assert ts == datetime.fromisoformat("2026-09-08T12:00:00+00:00").timestamp()
    assert cr.parse_until("wait until 2026-99-99T00:00:00Z") is None
    assert cr.done(80, 500) is True
    assert cr.done(50, 79) is True
    assert cr.done(50, 80) is False
    assert cr.done(49, 0) is False
    assert cr.done(79, 81) is False


def test_pick_sorts_near_1900() -> None:
    cr.now = lambda: 0.0  # type: ignore[assignment]
    try:
        today = datetime.now(timezone.utc).date().isoformat()
        st = {
            "cooldown": {"coolbot": 10.0},
            "day_cap": {"capbot": today},
        }
        bots = [
            ("hanselhansel", 1900),
            ("leelaqueenodds", 1900),
            ("oddsfish", 1900),
            ("lowbot", 1000),
            ("highbot", 2500),
            ("coolbot", 1900),
            ("capbot", 1900),
            ("near1900", 1910),
            ("farther", 1700),
        ]
        assert cr.pick(st, bots) == "near1900"
        assert cr.pick(st, []) is None
        assert cr.pick({}, [("toohigh", 2201), ("toolow", 1399)]) is None
        assert cr.pick({}, [("floorbot", 1400)]) == "floorbot"
        assert cr.pick({}, [("ceilbot", 2200)]) == "ceilbot"
    finally:
        cr.now = time.time  # type: ignore[assignment]


def test_challenge_ok_and_fail() -> None:
    def fake_api(url, tok, data=None, accept="application/json"):
        assert "clock.limit" in data.decode()
        assert b"rated=true" in data
        if url.endswith("/okbot"):
            return 200, json.dumps({"challenge": {"id": "ch1"}})
        if url.endswith("/bare"):
            return 201, json.dumps({"id": "ch2"})
        return 400, "Nope\nline"

    old = cr.api
    cr.api = fake_api  # type: ignore[assignment]
    try:
        assert cr.challenge("lip_x", "okbot") == ("ok", "ch1")
        assert cr.challenge("lip_x", "bare") == ("ok", "ch2")
        kind, detail = cr.challenge("lip_x", "bad")
        assert kind == "fail"
        assert "Nope" in detail
        assert "\n" not in detail
        assert cr.challenge("lip_x", "../x") == ("fail", "bad name")
    finally:
        cr.api = old


def test_sync_games_wdl_and_skip() -> None:
    tmp = _install_tmp()
    calls: list[str] = []

    def fake_api(url, tok, data=None, accept="application/json"):
        calls.append(url)
        if "games/user" in url:
            rows = [
                {
                    "id": "started1",
                    "status": "started",
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "x"}, "rating": 1600},
                    },
                },
                {
                    "id": "seen1",
                    "status": "mate",
                    "winner": "white",
                    "speed": "blitz",
                    "rated": True,
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "old"}, "rating": 1600},
                    },
                },
                {
                    "id": "aborted1",
                    "status": "aborted",
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "x"}, "rating": 1600},
                    },
                },
                {
                    "id": "winW",
                    "status": "mate",
                    "winner": "white",
                    "speed": "blitz",
                    "rated": True,
                    "clock": {"initial": 180, "increment": 2},
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "OppA"}, "rating": 1800},
                    },
                },
                {
                    "id": "lossB",
                    "status": "resign",
                    "winner": "white",
                    "speed": "blitz",
                    "rated": True,
                    "players": {
                        "white": {"user": {"name": "OppB"}, "rating": 1700},
                        "black": {"user": {"name": "hanselhansel"}, "rating": 1500},
                    },
                },
                {
                    "id": "drawD",
                    "status": "draw",
                    "speed": "blitz",
                    "rated": True,
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "OppC"}, "rating": 1650},
                    },
                },
                {
                    "id": "lossW",
                    "status": "mate",
                    "winner": "black",
                    "speed": "blitz",
                    "rated": True,
                    "players": {
                        "white": {"user": {"name": "hanselhansel"}, "rating": 1500},
                        "black": {"user": {"name": "OppD"}, "rating": 1750},
                    },
                },
                {
                    "id": "winB",
                    "status": "mate",
                    "winner": "black",
                    "speed": "blitz",
                    "rated": True,
                    "players": {
                        "white": {"user": {"name": "OppE"}, "rating": 1600},
                        "black": {"user": {"name": "hanselhansel"}, "rating": 1500},
                    },
                },
            ]
            return 200, "\n".join(json.dumps(r) for r in rows)
        if "game/export/" in url:
            if url.endswith("lossB"):
                return 404, ""
            return 200, '[Event "t"]\n1. e4 *\n'
        return 500, ""

    old = cr.api
    cr.api = fake_api  # type: ignore[assignment]
    try:
        st = {"seen_games": ["seen1"]}
        cr.sync_games("lip_x", st)
        lines = [json.loads(x) for x in cr.WDL_PATH.read_text().splitlines()]
        by_id = {r["id"]: r for r in lines}
        assert "started1" not in by_id
        assert "aborted1" not in by_id
        assert "seen1" not in by_id
        assert by_id["winW"]["result"] == "W"
        assert by_id["winW"]["opponent"] == "OppA"
        assert by_id["winW"]["opp_rating"] == 1800
        assert by_id["lossB"]["result"] == "L"
        assert by_id["lossB"]["opponent"] == "OppB"
        assert by_id["drawD"]["result"] == "D"
        assert by_id["lossW"]["result"] == "L"
        assert by_id["winB"]["result"] == "W"
        assert (tmp / "game_records" / "winW.pgn").is_file()
        assert not (tmp / "game_records" / "lossB.pgn").exists()
        assert set(st["seen_games"]) == {
            "seen1",
            "aborted1",
            "winW",
            "lossB",
            "drawD",
            "lossW",
            "winB",
        }
        cr.api = lambda *a, **k: (500, "no")  # type: ignore[assignment]
        before = cr.WDL_PATH.read_text()
        cr.sync_games("lip_x", st)
        assert cr.WDL_PATH.read_text() == before
        cr.api = lambda *a, **k: (200, "   ")  # type: ignore[assignment]
        cr.sync_games("lip_x", st)
        assert cr.WDL_PATH.read_text() == before
    finally:
        cr.api = old


def test_vsbot_lockout_and_failed_account() -> None:
    assert cr.vsbot_lockout_s("please wait before challenging another bot") == 60
    body = json.dumps({"ratelimit": {"key": "bot.vsBot.day", "seconds": 90}})
    assert cr.vsbot_lockout_s(body) == 90
    assert cr.vsbot_lockout_s("No thanks") is None
    seq = iter([None, {"perfs": {"blitz": {"games": 80, "rd": 40}}, "count": {"playing": 0}}])
    challenges: list[str] = []
    old = {"account": cr.account, "challenge": cr.challenge, "sync": cr.sync_games, "sleep": time.sleep}
    cr.account = lambda _t: next(seq)  # type: ignore[assignment]
    cr.challenge = lambda *a, **k: challenges.append("x") or ("ok", "1")  # type: ignore[assignment]
    cr.sync_games = lambda *a, **k: None  # type: ignore[assignment]
    time.sleep = lambda s: None  # type: ignore[assignment]
    _install_tmp()
    try:
        cr.main()
        assert challenges == []
    finally:
        cr.account = old["account"]
        cr.challenge = old["challenge"]
        cr.sync_games = old["sync"]
        time.sleep = old["sleep"]


def test_main_playing_challenge_and_stop() -> None:
    tmp = _install_tmp()
    seq = iter(
        [
            {"perfs": {"blitz": {"games": 10, "rd": 120}}, "count": {"playing": 1}},
            {"perfs": {"blitz": {"games": 10, "rd": 120}}, "count": {"playing": 0}},
            {"perfs": {"blitz": {"games": 10, "rd": 120}}, "count": {"playing": 0}},
            {"perfs": {"blitz": {"games": 80, "rd": 40}}, "count": {"playing": 0}},
        ]
    )
    challenges: list[str] = []
    sleeps: list[float] = []

    def fake_account(_tok):
        return next(seq)

    def fake_bots():
        return [("goodbot", 1900), ("hanselhansel", 1500)]

    def fake_challenge(_tok, name):
        challenges.append(name)
        return "ok", "abc123"

    old = {
        "account": cr.account,
        "online_bots": cr.online_bots,
        "challenge": cr.challenge,
        "sync_games": cr.sync_games,
        "sleep": time.sleep,
        "IDLE_SLEEP": cr.IDLE_SLEEP,
        "PLAYING_SLEEP": cr.PLAYING_SLEEP,
    }
    cr.account = fake_account  # type: ignore[assignment]
    cr.online_bots = fake_bots  # type: ignore[assignment]
    cr.challenge = fake_challenge  # type: ignore[assignment]
    cr.sync_games = lambda *a, **k: None  # type: ignore[assignment]
    time.sleep = lambda s: sleeps.append(s)  # type: ignore[assignment]
    cr.IDLE_SLEEP = 0
    cr.PLAYING_SLEEP = 0
    try:
        cr.main()
        assert challenges == ["goodbot"]
        st = json.loads((tmp / "rotator_state.json").read_text())
        assert "goodbot" in st["cooldown"]
        assert cr.PLAYING_SLEEP in sleeps or 0 in sleeps
    finally:
        cr.account = old["account"]
        cr.online_bots = old["online_bots"]
        cr.challenge = old["challenge"]
        cr.sync_games = old["sync_games"]
        time.sleep = old["sleep"]
        cr.IDLE_SLEEP = old["IDLE_SLEEP"]
        cr.PLAYING_SLEEP = old["PLAYING_SLEEP"]

    # no eligible opponent then stop
    _install_tmp()
    n = {"i": 0}

    def acct2(_tok):
        n["i"] += 1
        if n["i"] >= 2:
            return {"perfs": {"blitz": {"games": 80, "rd": 40}}, "count": {"playing": 0}}
        return {"perfs": {"blitz": {"games": 10, "rd": 200}}, "count": {"playing": 0}}

    cr.account = acct2  # type: ignore[assignment]
    cr.online_bots = lambda: [("leelaqueenodds", 1900)]  # type: ignore[assignment]
    cr.sync_games = lambda *a, **k: None  # type: ignore[assignment]
    time.sleep = lambda s: None  # type: ignore[assignment]
    cr.IDLE_SLEEP = 0
    try:
        cr.main()
        assert n["i"] >= 2
    finally:
        cr.account = old["account"]
        cr.online_bots = old["online_bots"]
        cr.sync_games = old["sync_games"]
        time.sleep = old["sleep"]
        cr.IDLE_SLEEP = old["IDLE_SLEEP"]


def test_main_decline_until_and_net_error() -> None:
    tmp = _install_tmp()
    n = {"i": 0}

    def fake_account(_tok):
        n["i"] += 1
        if n["i"] == 3:
            raise urllib.error.URLError("down")
        if n["i"] >= 4:
            return {"perfs": {"blitz": {"games": 80, "rd": 40}}, "count": {"playing": 0}}
        return {"perfs": {"blitz": {"games": 10, "rd": 200}}, "count": {"playing": 0}}

    def fake_bots():
        if n["i"] == 1:
            return [("untilbot", 1900)]
        return [("plainbot", 1900)]

    def fake_challenge(_tok, name):
        if name == "untilbot":
            return "fail", "try again wait until 2099-12-31T00:00:00Z"
        return "fail", "No thanks"

    old = {
        "account": cr.account,
        "online_bots": cr.online_bots,
        "challenge": cr.challenge,
        "sync_games": cr.sync_games,
        "sleep": time.sleep,
        "IDLE_SLEEP": cr.IDLE_SLEEP,
    }
    cr.account = fake_account  # type: ignore[assignment]
    cr.online_bots = fake_bots  # type: ignore[assignment]
    cr.challenge = fake_challenge  # type: ignore[assignment]
    cr.sync_games = lambda *a, **k: None  # type: ignore[assignment]
    time.sleep = lambda s: None  # type: ignore[assignment]
    cr.IDLE_SLEEP = 0
    try:
        cr.main()
        st = json.loads((tmp / "rotator_state.json").read_text())
        assert st["day_cap"]["untilbot"] == datetime.now(timezone.utc).date().isoformat()
        assert st["cooldown"]["untilbot"] > time.time()
        assert st["cooldown"]["plainbot"] > time.time()
        assert n["i"] >= 4
    finally:
        cr.account = old["account"]
        cr.online_bots = old["online_bots"]
        cr.challenge = old["challenge"]
        cr.sync_games = old["sync_games"]
        time.sleep = old["sleep"]
        cr.IDLE_SLEEP = old["IDLE_SLEEP"]


def main() -> None:
    tests = [
        test_token_accepts_lip_and_rejects_other,
        test_load_and_save_state,
        test_api_get_post_and_http_error,
        test_account_and_blitz_stats,
        test_online_bots_parse_and_fallback,
        test_skip_cooled_capped,
        test_parse_until_and_done_gates,
        test_pick_sorts_near_1900,
        test_challenge_ok_and_fail,
        test_sync_games_wdl_and_skip,
        test_vsbot_lockout_and_failed_account,
        test_main_playing_challenge_and_stop,
        test_main_decline_until_and_net_error,
    ]
    failed = 0
    for fn in tests:
        try:
            fn()
            print("ok", fn.__name__)
        except Exception as e:
            failed += 1
            print("FAIL", fn.__name__, type(e).__name__, e)
    if failed:
        raise SystemExit(1)
    print("challenge-rotator tests ok")


if __name__ == "__main__":
    main()
