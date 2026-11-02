# Application Source

## Overview

TanStack application source for the chess workbench, browser thinker worker,
and shared service libraries. The router factory imports the generated route
tree; the route source contract identifies the explicit `/` page.

## Interface

- `getRouter()` constructs a TanStack router using the imported `routeTree` and
  `AppErrorComponent` as its default error renderer.
  ([router.tsx:getRouter](./router.tsx),
  [error-component.tsx:AppErrorComponent](./lib/error-component.tsx))
- [Components](./components/README.md) provide the preview-host adapter and
  chess UI, including `Workbench`.
  ([components/preview-host-bridge.tsx:PreviewHostBridge](./components/preview-host-bridge.tsx),
  [components/chess/workbench.tsx:Workbench](./components/chess/workbench.tsx))
- [Libraries](./lib/README.md) provide database queries, preview messaging,
  connector/authentication helpers, chess inference/search, and WebRTC transport.
  ([lib/db.ts:getSql](./lib/db.ts),
  [lib/preview-host-bridge.ts:installPreviewHostBridge](./lib/preview-host-bridge.ts),
  [lib/chess/think-client.ts:createThinker](./lib/chess/think-client.ts))
- [Routes](./routes/README.md) own the HTML shell and `/` workbench page.
  ([routes/__root.tsx:Route](./routes/__root.tsx), [routes/index.tsx:Route](./routes/index.tsx))
- [Workers](./workers/README.md) own the protocol-v1 `init`/`think` message
  entry point and ready/result/error/fatal replies carrying typed
  `SearchOutcome` data.
  ([workers/think.worker.ts:createWorkerHandler](./workers/think.worker.ts),
  [lib/chess/search-types.ts:SearchOutcome](./lib/chess/search-types.ts))

## Invariants

- The router factory supplies the route tree and error component. Route mounting
  and library/worker initialization belong to the respective child packages.
  ([router.tsx:getRouter](./router.tsx))
- Server-only SQL rejects browser use. PGlite applies top-level migrations
  transactionally; the configured pg path does not apply migrations here.
  ([lib/db.ts:createSql](./lib/db.ts), [lib/db.ts:createPgliteSql](./lib/db.ts),
  [lib/db.ts:createNeonSql](./lib/db.ts))
- The earlier S-loader drift is resolved at source level: trained mode loads
  only through `loadPlayWeightsTimed(SELECTED_CHECKPOINT)`, which fetches the
  pinned M asset once and enforces the full SHA256/architecture/length
  verification; the worker independently re-verifies transferred bytes; and
  the main-thread recovery decodes the same retained verified bytes. The
  [approved M ladder spec](../docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md),
  First experiment item 6, is satisfied in source; native browser execution
  remains a separate check. ([lib/chess/weights.ts:loadPlayWeightsTimed](./lib/chess/weights.ts),
  [lib/chess/think-client.ts:createThinker](./lib/chess/think-client.ts),
  [workers/think.worker.ts:createWorkerHandler](./workers/think.worker.ts),
  [lib/chess/constants.ts:SELECTED_CHECKPOINT](./lib/chess/constants.ts),
  [components/chess/workbench.tsx:Workbench](./components/chess/workbench.tsx))

## Side Effects

- Mounting the route tree renders browser resource links, installs the preview
  integration, and mounts the workbench's game state, thinker lifecycle, and
  metadata fetch. These effects belong to the children.
  ([routes/__root.tsx:Route](./routes/__root.tsx),
  [components/preview-host-bridge.tsx:PreviewHostBridge](./components/preview-host-bridge.tsx),
  [components/chess/workbench.tsx:Workbench](./components/chess/workbench.tsx))
- Worker messages verify transferred model bytes, run synchronous CPU search,
  and post replies through the handler's send. Server library imports/use can
  initialize databases, queries, migrations, and authentication adapters, as
  their contracts specify.
  ([workers/think.worker.ts:createWorkerHandler](./workers/think.worker.ts),
  [lib/db.ts:globalBoot](./lib/db.ts), [lib/auth/server.ts:auth](./lib/auth/server.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../package.json).

With an already running dev server, run `npm run check:auth`. This is an HTTP
probe of dev/build environment agreement. An unavailable or unobservable dev
server is indeterminate (exit 2), rather than a unit/type-check result.
([check-auth-invariant.mjs:probeDevAuthEnabled](../scripts/check-auth-invariant.mjs),
[check-auth-invariant.mjs:main](../scripts/check-auth-invariant.mjs))

Automated tests and type checks do not establish browser behavior, live service
connectivity, real gauntlet outcomes, or current ratings. The random-move
gauntlet is a separate command with publication effects in the
[chess contract](./lib/chess/README.md). Generated route code, CSS bodies, and
test source were excluded from this contract's source inspection.
