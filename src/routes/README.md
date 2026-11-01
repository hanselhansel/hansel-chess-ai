# Routes

## Overview

TanStack file routes for the application document shell and chess workbench.

## Interface

- The root `Route` defines the English HTML document, viewport/title/description
  metadata, theme color, favicon/manifest/touch-icon links, font resources, and
  stylesheet URL. Its body mounts `PreviewHostBridge`, `AuthProvider` around
  `Outlet`, then `Scripts`. ([__root.tsx:Route](./__root.tsx), [__root.tsx:appCss](./__root.tsx))
- The index `Route` explicitly registers `/`; `Home` renders `Workbench` in a
  `main` element with `min-h-dvh bg-bg text-fg` classes.
  ([index.tsx:Route](./index.tsx), [index.tsx:Home](./index.tsx),
  [workbench.tsx:Workbench](../components/chess/workbench.tsx))
- `AuthProvider` currently returns its children in a fragment. The route shell
  does not install an authentication context or route guard through it.
  ([provider.tsx:AuthProvider](../lib/auth/provider.tsx), [__root.tsx:Route](./__root.tsx))

## Invariants

- None.

## Side Effects

- Mounting the preview component installs its browser effect and returns its
  disposal callback. Activation and messaging belong to the bridge library.
  ([__root.tsx:Route](./__root.tsx),
  [preview-host-bridge.tsx:PreviewHostBridge](../components/preview-host-bridge.tsx),
  [preview-host-bridge.ts:installPreviewHostBridge](../lib/preview-host-bridge.ts))
- Mounting the workbench initializes its thinker and fetches checkpoint
  metadata. The root document declares local stylesheet and external Google
  Fonts resources. ([index.tsx:Home](./index.tsx),
  [workbench.tsx:Workbench](../components/chess/workbench.tsx),
  [__root.tsx:Route](./__root.tsx))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../package.json). The automated test script has no dedicated
route test file. Document rendering, resource loading, and navigation require
separate browser verification. CSS bodies and generated route files are outside
this contract's source inspection.
