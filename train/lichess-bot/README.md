# Lichess BOT: hansel-chess-ai

## Overview

Local challenge rotation and an example configuration for the external
`lichess-bot` runtime. The rotator sends challenges and records games; the
external runtime runs the UCI engine and plays them.

Recorded repository results, retained from revision `bb76439` (2026-09-09).
That date identifies the repository snapshot, not each measurement. Ratings
and latency below were not checked against a live service in this pass.

Recorded published Lichess blitz: **1531** over **108** games (RD 45), 64 visits, vs other BOT accounts. [hanselhansel](https://lichess.org/@/hanselhansel).

The gauntlet MLE 2035 is a Stockfish `UCI_LimitStrength` number. Do not paste it as a Lichess Elo. Not a human pool. Not 2500.

The Lichess account is **hanselhansel**. Upgrade is irreversible. The account must have **zero games** before the upgrade. Never convert a human account that has already played. UCI engine id is still `hansel-chess-ai`.

Published search is **64 visits**. On this M4, a 64-visit startpos move is ~100 ms on CPU after load, so bullet is on. Re-time on the 24/7 host before leaving bullet enabled.

## One-time

1. Use the Lichess user `hanselhansel` (BOT). Play nothing before upgrade.
2. [Create a token](https://lichess.org/account/oauth/token/create) with scope `bot:play`. Save it.
3. Clone [lichess-bot](https://github.com/lichess-bot-devs/lichess-bot) into `train/lichess-bot/runtime/` (gitignored) or anywhere.
4. Copy [config.yml.example](./config.yml.example) to that clone as `config.yml`.
5. Put the token in the config's `token` field. Set `engine.dir` to this repo's absolute path.
6. From the lichess-bot clone: `python3 lichess-bot.py --upgrade` then `python3 lichess-bot.py`.

Pin the config: `shasum -a 256 config.yml`. Export PGNs from `game_records/`. Report bullet / blitz / rapid / classical separately.

The account-upgrade requirements above are operator setup notes. The local
rotator checks the token's account name, but does not upgrade the account or
validate its BOT title, token scope, or prior game count.

## Scale loop (3+2)

[challenge_rotator.py](./challenge_rotator.py) challenges idle time at 3+2 rated vs 1400–2200 bots. It skips configured odds accounts and recent declines, and honors server cap responses. The original setup described these as 100/day caps; the script does not count a fixed daily limit. Token stays in `.token`. Stop when blitz games hit 80, or 50 with RD under 80.

```
python3 -u train/lichess-bot/challenge_rotator.py
```

WDL lines go to `wdl.jsonl`. PGNs go to `game_records/`. Do not raise concurrency.

## Engine

```
train/scripts/hansel-chess-ai
```

That wrapper sets `PYTHONPATH=train/src` and runs `tinyaz_uci.py`. Weights default to `public/weights/tinyaz-m.bin`. CPU only for the bot. Flags: `--weights`, `--visits`, `--device`.

Cute Chess / CCRL testers can point at the same wrapper.

CPU-only bot operation is operator policy. The CLI defaults to CPU and permits
a device override. Engine implementation: [tinyaz](../src/tinyaz/README.md).

## Interface

- `token` reads the sibling `.token`; `api` returns HTTP status and body. `account` retrieves and validates the configured account identity; `blitz_stats` extracts games, RD, provisional state, and playing count. `[challenge_rotator.py:token]` `[challenge_rotator.py:api]` `[challenge_rotator.py:account]` `[challenge_rotator.py:blitz_stats]`
- `load_state`, `save_state`, `now`, `skip_name`, `cooled`, `capped`, `set_cooldown`, `parse_until`, and `vsbot_lockout_s` manage local selection state and server cooldowns. `[challenge_rotator.py:load_state]` `[challenge_rotator.py:save_state]` `[challenge_rotator.py:now]` `[challenge_rotator.py:skip_name]` `[challenge_rotator.py:cooled]` `[challenge_rotator.py:capped]` `[challenge_rotator.py:set_cooldown]` `[challenge_rotator.py:parse_until]` `[challenge_rotator.py:vsbot_lockout_s]`
- `online_bots`, `pick`, `challenge`, `sync_games`, `done`, and `main` discover opponents, send requests, export results, and run the polling loop. `[challenge_rotator.py:online_bots]` `[challenge_rotator.py:pick]` `[challenge_rotator.py:challenge]` `[challenge_rotator.py:sync_games]` `[challenge_rotator.py:done]` `[challenge_rotator.py:main]`
- The example config selects the repository UCI wrapper and 64 visits. Its external-runtime settings request concurrency 1, bot-only standard chess, bullet/blitz/rapid/classical, and casual/rated games; matchmaking is disabled. The rotator does not parse this YAML. `[config.yml.example:engine.name]` `[config.yml.example:engine.uci_options.Visits]` `[config.yml.example:challenge.concurrency]` `[config.yml.example:challenge.only_bot]` `[config.yml.example:challenge.variants]` `[config.yml.example:challenge.time_controls]` `[config.yml.example:challenge.modes]` `[config.yml.example:matchmaking.allow_matchmaking]` `[challenge_rotator.py:main]`
- The [UCI wrapper](../scripts/hansel-chess-ai) forwards arguments to [tinyaz_uci.py](../scripts/tinyaz_uci.py), which owns CLI flags `--weights`, `--visits`, and `--device` and delegates engine behavior to `tinyaz.engine_uci`. `[../scripts/hansel-chess-ai:exec]` `[../scripts/tinyaz_uci.py:main]`

## Invariants

- The stripped token must start with `lip_`; there is no environment-variable fallback. The authenticated account must match `hanselhansel`, compared in lowercase. `[challenge_rotator.py:token]` `[challenge_rotator.py:account]` `[challenge_rotator.py:ME]`
- Opponents have valid names, inclusive blitz ratings 1400..2200, no active cooldown or current-UTC-day cap, and pass configured name exclusions. Selection chooses the rating nearest 1900. `[challenge_rotator.py:NAME_RE]` `[challenge_rotator.py:pick]` `[challenge_rotator.py:skip_name]` `[challenge_rotator.py:capped]`
- Challenges request rated 180+2, random color. Request success is not proof of acceptance or a completed game. `[challenge_rotator.py:challenge]` `[challenge_rotator.py:CHALLENGE_LIMIT]` `[challenge_rotator.py:CHALLENGE_INC]`
- Stop at at least 80 blitz games, or at least 50 with RD strictly below 80. The provisional flag does not affect this gate. Polling waits while the account reports playing; it is not an interprocess lock. `[challenge_rotator.py:done]` `[challenge_rotator.py:main]`
- Success sets an opponent cooldown of 1200 seconds; ordinary failure sets 3600 seconds. Parsed wait-until responses set a same-day cap and cooldown. Recognized global bot lockouts sleep at least 60 seconds. `[challenge_rotator.py:main]` `[challenge_rotator.py:CHALLENGE_COOLDOWN]` `[challenge_rotator.py:DECLINE_COOLDOWN]` `[challenge_rotator.py:vsbot_lockout_s]`
- Game IDs must match the configured alphanumeric pattern. Started/created games remain unseen; other skipped statuses are marked seen without a result. PGN writes require a successful, nonblank response and a destination inside `game_records`. `[challenge_rotator.py:sync_games]` `[challenge_rotator.py:GID_RE]` `[challenge_rotator.py:SKIP_STATUS]`

## Side Effects

- Reads `.token` and `rotator_state.json`; state saves write a temporary file then replace the state file. `[challenge_rotator.py:token]` `[challenge_rotator.py:load_state]` `[challenge_rotator.py:save_state]`
- Makes authenticated Lichess account, bot-list, recent-game, and PGN GETs, plus challenge POSTs. Bot-list lookup has an unauthenticated fallback. Requests use 20-second timeouts. `[challenge_rotator.py:api]` `[challenge_rotator.py:account]` `[challenge_rotator.py:online_bots]` `[challenge_rotator.py:challenge]` `[challenge_rotator.py:sync_games]`
- Appends result rows to `wdl.jsonl`, creates/writes `game_records`, prints progress, and sleeps between polls. Recent-game synchronization is not restricted to blitz, rated games, or BOT opponents. Seen IDs are saved before result/PGN writes, so these outputs are not transactional. `[challenge_rotator.py:sync_games]` `[challenge_rotator.py:WDL_PATH]` `[challenge_rotator.py:PGN_DIR]` `[challenge_rotator.py:main]`
- The adjacent wrapper exports `PYTHONPATH` and replaces its process with unbuffered Python; the CLI starts the package's UCI stdio runner. `[../scripts/hansel-chess-ai:PYTHONPATH]` `[../scripts/hansel-chess-ai:exec]` `[../scripts/tinyaz_uci.py:main]`

## Verification

From the repository root, the standalone mocked rotator checks require Python
and do not require a token or a running bot:

```sh
PYTHONPATH=train/src python3 train/scripts/test_challenge_rotator.py
```

The setup, engine, and scale-loop commands above are operational examples.
No bot launch, live challenge, or account upgrade was performed for this
documentation pass.
