# hansel-chess-ai

Start with `README.md` (claim, status, how to play) and `docs/LATER.md` (roadmap
and dead ends). Design specs and plans are under `docs/superpowers/`. This file
only holds what those do not say.

- No CI runs in this repo. Before you push: `npm test`, `npm run typecheck`,
  `npm run lint`. Python training needs `PYTHONPATH=train/src`.
- Changing a published checkpoint touches three files together:
  `public/weights/<name>.bin`, its `.meta.json`, and
  `src/lib/chess/checkpoint-meta.json`.
- The model lives in `src/lib/chess/`. Search runs in `src/workers/`. Python
  training is a separate package under `train/`.
- Rating rules that a diff must not break are in `README.md`. The short version:
  `chess.js` owns the rules, and 1-visit, 64-visit, and 256-visit numbers never
  mix.
