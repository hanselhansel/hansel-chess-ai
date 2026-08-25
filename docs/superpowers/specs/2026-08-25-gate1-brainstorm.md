# GATE 1 brainstorm — Hansel Chess AI workbench

Date: 2026-08-25
Work type: **front-end / design**
Skills: `design-ui` + `building-games` / `board-card-chess` (gstack:design-consultation and design-shotgun are not installed; done here by hand)

## Consultation (direction)

The product is not a research dashboard and not a Lichess clone. It is a **workbench**: you play, you watch the net think, you read one efficiency card.

Constraints that lock the visual system:

- `design-ui`: no purple, no gold chrome, no emoji, no gradient blobs, ≤5 colours, ≤2 fonts, tokens in `@theme`.
- `board-card-chess`: chess.js owns legality; turn FSM; ignore input on the model’s turn; search off the main thread (Web Worker).
- Board squares may be walnut/cream because they are the game, not brand chrome.

## Shotgun — three variants

| | A. Editorial ink/paper (recommend) | B. Club green | C. Lab terminal |
|---|---|---|---|
| Surfaces | Near-black ink `#0c0c0d`, elevated `#161513`, paper `#ece8e1` | Dark green baize, cream panel | Black, phosphor green |
| Type | Newsreader (display) + Figtree (body) | System sans, sporty | IBM Plex Mono only |
| Board | `#cfc6b8` / `#5c574e` | Classic green/cream | ASCII-adjacent grid |
| Accent | Cool paper `#d4d0c8` on dark | Saturated green (banned as brand if it leaks into chrome) | Phosphor |
| Feel | Quiet instrument | Twitch/Lichess | Hacker demo |
| Verdict | **Ship this.** Matches anti-slop and the existing brand card. | Too generic; fights the ink brand pass. | Cute, unreadable on mobile, one-font gimmick. |

Layout (all variants): three regions — **board**, **think** (1 / 64 visit, value bar, root children), **efficiency card**. Mobile stacks board first.

## Think panel (what “visual” means)

From AlphaZero practice (policy = priors that guide PUCT; value replaces rollouts; one visit = one leaf eval):

- Policy heatmap on destination squares.
- Root children: SAN, visits `n`, prior `P`, value `Q`.
- Value bar converted to White’s perspective.
- 1-visit vs 64-visit is a segmented control, not a buried slider.

## Engine (in the front-end)

tinyaz-s: 19-plane STM-canonical board, 8×64 ResNet, 73-plane AZ policy, tanh value, PUCT c_puct 1.5, 64-visit play. Random Kaiming weights, seed 2026. Worker so the UI never freezes.

## Phase 0 success (this chain)

You can play a legal game in the preview. The model replies. The tree is visible. The card says **random weights**. It will lose to you. That is the point.

## Out of this chain (see docs/LATER.md)

Supervised Lichess training, self-play, tinyaz-m, Stockfish gauntlet, Lichess BOT, Autoresearch overnight loop, ONNX export, 256-visit published Elo.
