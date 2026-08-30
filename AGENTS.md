# hansel-chess-ai (tinyaz)

From-scratch AlphaZero-style chess net, under 3M parameters, playable in the
browser. Read `README.md` for the claim and the current status. Read the design
spec before judging structure.

- Design: `docs/superpowers/specs/2026-08-25-hansel-chess-ai-design.md`
- Roadmap and dead ends: `docs/LATER.md`
- Plans and specs: `docs/superpowers/plans/`, `docs/superpowers/specs/`

## Commands

There is no CI in this repo. Nothing runs these for you. Run them locally
before you push.

```
npm test          # node --test over scripts/**/*.test.mjs and three src suites
npm run typecheck # tsc --noEmit
npm run lint      # eslint .
npm run dev       # vite dev on port 8080, wrapped by scripts/with-app-env.mjs
npm run build     # vite build, then npm run db:migrate
npm run check:auth
```

Python training lives under `train/` and needs `PYTHONPATH=train/src`.

```
PYTHONPATH=train/src python3 train/scripts/test_encode.py
PYTHONPATH=train/src python3 train/scripts/test_climb_loop.py
PYTHONPATH=train/src python3 train/scripts/elo_gauntlet.py
node --experimental-strip-types src/lib/chess/gauntlet.ts
```

`train/pyproject.toml` requires Python 3.10 or later. `numpy` is the base
dependency. `torch` and `chess` are in the `train` extra.
`train/scripts/fetch_stockfish.sh` is ubuntu-x86-64 only. On Hansel's Mac,
symlink Homebrew Stockfish 18 into `train/bin/stockfish` instead.

## Layout

| Path | Owns |
|---|---|
| `src/lib/chess/` | Encoding, policy, net, MCTS, weights, gauntlet. The model. |
| `src/workers/` | Search runs in a Web Worker so the board stays live. |
| `src/routes/`, `src/components/` | TanStack Start app and UI. |
| `src/lib/auth/`, `migrations/auth/` | Better Auth and its SQL. |
| `server/middleware/` | Request middleware. |
| `scripts/` | Build, env, migration, preview, and guard scripts. Each has a `.test.mjs` next to it. |
| `train/` | Python training, self-play, and rating. Separate package. |
| `public/weights/` | Published `.bin` and `.meta.json` checkpoints. |

## Rules

- `chess.js` owns the rules of chess. Do not fork chesslite or Lc0, and do not
  write a second move generator.
- 1-visit, 64-visit, and 256-visit numbers are different claims. 1-visit is the
  naked net and the snapshot gate. 64 visits is play and published rating. 256
  visits is self-play targets only. Never mix them in one number or one chart.
- A training loop that does not beat its gate is VOID. Record it in
  `docs/LATER.md` and leave `public/weights/` unchanged.
- No Lichess rating exists yet. Do not describe a gauntlet result as one.
- Changing a published checkpoint means updating `public/weights/`, its
  `.meta.json`, and `src/lib/chess/checkpoint-meta.json` together.
- Keep the guard scripts passing. `check:auth` and the `scripts/` tests exist
  because those invariants broke before.
