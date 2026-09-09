# Changelog

All notable changes to this project are documented in this file.

## [0.1.0.0] - 2026-09-09

### Added

- UCI engine `hansel-chess-ai` at 64 visits so Cute Chess, CCRL testers, and lichess-bot can play tinyaz-m.
- Lichess BOT [hanselhansel](https://lichess.org/@/hanselhansel) with a 3+2 rated challenge rotator against other bots.

### Changed

- Published Lichess blitz is **1531** over **108** games (RD 45) vs BOT accounts. That number is not the Stockfish gauntlet MLE 2035.

### Fixed

- Rotator stays up on dropped connections, failed account fetches, vsBot daily caps, and truncated state files.
- UCI process no longer dies on illegal moves, non-integer Visits, or mate positions.
