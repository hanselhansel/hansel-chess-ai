# Lichess BOT: hansel-chess-ai

Public rating lives on Lichess. The gauntlet MLE 2035 is a Stockfish `UCI_LimitStrength` number. Do not paste it on the bot page as a Lichess Elo.

The Lichess account is **hanselhansel**. Upgrade is irreversible. The account must have **zero games** before the upgrade. Never convert a human account that has already played. UCI engine id is still `hansel-chess-ai`.

Published search is **64 visits**. On this M4, a 64-visit startpos move is ~100 ms on CPU after load, so bullet is on. Re-time on the 24/7 host before leaving bullet enabled.

## One-time

1. Use the Lichess user `hanselhansel` (BOT). Play nothing before upgrade.
2. Token: https://lichess.org/account/oauth/token/create with scope `bot:play`. Save it.
3. Clone https://github.com/lichess-bot-devs/lichess-bot next to this repo (or anywhere).
4. Copy `config.yml.example` to that clone as `config.yml`.
5. Put the token in `token`. Set `engine.dir` to this repo's absolute path.
6. From the lichess-bot clone: `python3 lichess-bot.py --upgrade` then `python3 lichess-bot.py`.

Pin the config: `shasum -a 256 config.yml`. Export PGNs from `game_records/`. Report bullet / blitz / rapid / classical separately.

## Scale loop (3+2)

`challenge_rotator.py` challenges idle time at 3+2 rated vs 1400–2200 bots. It skips odds accounts, 100/day caps, and recent declines. Token stays in `.token`. Stop when blitz games hit 80, or 50 with RD under 80.

```
python3 -u train/lichess-bot/challenge_rotator.py
```

WDL lines go to `wdl.jsonl`. PGNs go to `game_records/`. Do not raise concurrency.

## Engine

```
train/scripts/hansel-chess-ai
```

That wrapper sets `PYTHONPATH=train/src` and runs `tinyaz_uci.py`. Weights default to `public/weights/tinyaz-m.bin`. CPU only for the bot.

Cute Chess / CCRL testers can point at the same wrapper.
