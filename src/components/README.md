# Components

## Overview

Shared React integration for preview hosting and the chess workbench UI.

## Interface

- `PreviewHostBridge()` is a prop-free, renderless adapter. It passes TanStack
  `router.history.push` to the bridge installer and collects route suggestions
  from `router.routeTree`. It does not declare routes.
  ([preview-host-bridge.tsx:PreviewHostBridge](./preview-host-bridge.tsx),
  [preview-host-bridge.ts:collectRoutePathsFromTree](../lib/preview-host-bridge.ts))
- [Chess components](./chess/README.md) expose `Workbench`, `ChessBoard`,
  `SquarePiece`, `CardPanel`, `MoveList`, `PieceGlyph`, `Roadmap`, and `ThinkPanel`.
  The child contract owns their props and interaction boundaries.
  ([chess/workbench.tsx:Workbench](./chess/workbench.tsx),
  [chess/board.tsx:ChessBoard](./chess/board.tsx))

## Invariants

- The preview adapter renders null. Its effect depends on the router and returns
  the installer's disposer. Mount-once guidance is not enforced as a singleton.
  ([preview-host-bridge.tsx:PreviewHostBridge](./preview-host-bridge.tsx))
- Activation, parent-origin checks, message validation, safe paths, and history
  boundaries belong to the bridge library. Without a browser or resolved parent,
  installation returns a no-op disposer.
  ([preview-host-bridge.ts:installPreviewHostBridge](../lib/preview-host-bridge.ts),
  [preview-embedder-origin.ts:resolveParentEmbedderOrigin](../lib/preview-embedder-origin.ts))

## Side Effects

- The adapter installs the bridge and disposes it on effect cleanup or router
  replacement. Active library integration patches browser history, installs
  listeners, posts location/routes/ready messages, and can request navigation.
  Disposal removes listeners and restores the saved history functions.
  ([preview-host-bridge.tsx:PreviewHostBridge](./preview-host-bridge.tsx),
  [preview-host-bridge.ts:installPreviewHostBridge](../lib/preview-host-bridge.ts))
- The chess child owns game/React mutations, thinker lifecycle, and metadata
  fetching through `Workbench`. ([chess/workbench.tsx:Workbench](./chess/workbench.tsx))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../package.json). The automated script has no dedicated
component test file. Preview navigation, cleanup, and chess interactions require
separate browser verification.
