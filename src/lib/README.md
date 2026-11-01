# Shared Libraries

## Overview

Shared database/query access, preview-host messaging, class-name/error helpers,
and child packages for connectors, authentication, chess, and WebRTC transport.
Browser helpers and server-only database/authentication code have separate
execution boundaries.

## Interface

- `cn(...inputs)` combines `clsx` and Tailwind class merging.
  `AppErrorComponent` renders a router error message or fallback.
  ([cn.ts:cn](./cn.ts), [error-component.tsx:AppErrorComponent](./error-component.tsx))
- `DbSource`, `dbSource`, and `Sql` describe backend selection and parameterized
  tagged-template/query calls. `getSql()` returns the shared query wrapper;
  `getPglite()` returns the initialized embedded client; `ensureDbReady()`
  bootstraps the embedded backend.
  ([db.ts:DbSource](./db.ts), [db.ts:Sql](./db.ts), [db.ts:getSql](./db.ts),
  [db.ts:getPglite](./db.ts), [db.ts:ensureDbReady](./db.ts))
- Origin helpers classify Grok/sandbox hosts and resolve an eligible parent.
  `installPreviewHostBridge(options?)` returns a disposer; options supply
  navigation and route suggestions. `isSafeBridgePath` validates navigation,
  and `collectRoutePathsFromTree` returns deduplicated path patterns.
  ([preview-embedder-origin.ts:resolveParentEmbedderOrigin](./preview-embedder-origin.ts),
  [preview-host-bridge.ts:PreviewHostBridgeOptions](./preview-host-bridge.ts),
  [preview-host-bridge.ts:installPreviewHostBridge](./preview-host-bridge.ts),
  [preview-host-bridge.ts:isSafeBridgePath](./preview-host-bridge.ts),
  [preview-host-bridge.ts:collectRoutePathsFromTree](./preview-host-bridge.ts))
- [App Data](./app-data/README.md) owns remote connector transport and shared
  connector/login helpers. ([app-data/client.server.ts:callTool](./app-data/client.server.ts))
- [Authentication](./auth/README.md) owns Better Auth, Gate identity/session
  binding, request guards, and the PGlite dialect.
  ([auth/server.ts:auth](./auth/server.ts),
  [auth/gate-session.server.ts:gateIdentitySessions](./auth/gate-session.server.ts))
- [Chess](./chess/README.md) owns encoding, model weights/inference, MCTS,
  thinker orchestration, and the random-move gauntlet.
  ([chess/mcts.ts:search](./chess/mcts.ts), [chess/think-client.ts:createThinker](./chess/think-client.ts))
- [Multiplayer](./multiplayer/README.md) owns the WebRTC room client.
  ([multiplayer/p2p.ts:P2PRoom](./multiplayer/p2p.ts))
- The selected [OG configuration](./og/site.json) declares the title and card
  type; its directory contains no code contract.
  ([og/site.json:title](./og/site.json), [og/site.json:card](./og/site.json))

## Invariants

- Backend selection is captured at module evaluation. A nonblank `DATABASE_URL`
  selects the `neon` label and a pg pool; absent/blank input selects in-memory
  PGlite. `getSql()` rejects browser execution. Query values remain positional
  parameters. Both drivers normalize int8 to Number and date/interval to strings;
  large integers can lose precision.
  ([db.ts:dbSource](./db.ts), [db.ts:createSql](./db.ts), [db.ts:toSql](./db.ts),
  [db.ts:createNeonSql](./db.ts), [db.ts:createPgliteSql](./db.ts))
- PGlite applies only the top-level `/migrations/*.sql` glob. Nested auth SQL is
  opt-in. Pending files are sorted/keyed by basename; file execution and the
  `_migrations` insert share one transaction. The configured pg path does not
  apply migrations or issue a readiness query here.
  ([db.ts:createPgliteSql](./db.ts), [db.ts:createNeonSql](./db.ts),
  [db.ts:ensureDbReady](./db.ts),
  [migration-plan.mjs:pendingMigrations](../../scripts/migration-plan.mjs))
- Global initialization promises survive HMR and clear failed initialization
  for retry. PGlite migration passes are serialized on a global recovery chain.
  The embedded data resets with the server process.
  ([db.ts:globalRef](./db.ts), [db.ts:getSql](./db.ts), [db.ts:createPgliteSql](./db.ts))
- Parent resolution rejects top-level execution and tries referrer before
  ancestor origin. HTTP(S) Grok/loopback origins qualify; sandbox guests can
  accept other HTTP(S) parents, and an explicit Remint hostname pairing also
  qualifies. This policy is broader than a Grok-only parent allowlist.
  ([preview-embedder-origin.ts:resolveParentEmbedderOrigin](./preview-embedder-origin.ts),
  [preview-embedder-origin.ts:isSandboxPreviewGuestHost](./preview-embedder-origin.ts),
  [preview-embedder-origin.ts:isRemintPreviewPair](./preview-embedder-origin.ts))
- Bridge messages require the resolved parent source/origin, fixed channel,
  version 1, and the applicable schema. Commands are `hello`, `navigate`, and
  `history` with delta -1 or 1. Navigation rejects protocol-relative paths and
  backslashes. Back is blocked when the current history root marker is true.
  ([preview-host-bridge.ts:installPreviewHostBridge](./preview-host-bridge.ts),
  [preview-host-bridge.ts:isSafeBridgePath](./preview-host-bridge.ts))
- Route suggestions are best-effort patterns from the supplied tree, without
  composing ancestor paths or declaring application routes.
  ([preview-host-bridge.ts:collectRoutePathsFromTree](./preview-host-bridge.ts))

## Side Effects

- DB initialization mutates global promise slots, configures pg parsers/pools,
  or creates an embedded DB and `_migrations` table. Queries and embedded
  migration transactions affect the selected database. No close API is exported.
  Server evaluation eagerly starts PGlite bootstrap and logs/rethrows failure.
  ([db.ts:createNeonSql](./db.ts), [db.ts:createPgliteSql](./db.ts), [db.ts:globalBoot](./db.ts))
- Active preview integration marks/patches history, registers three listeners,
  sends location/routes/ready messages, and can navigate or queue a location
  report. Disposal removes listeners and restores saved history functions,
  leaving existing history markers and queued microtasks in place.
  ([preview-host-bridge.ts:installPreviewHostBridge](./preview-host-bridge.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../package.json). The automated script includes app-data,
Gate identity, and chess suites.

With an already running dev server, run `npm run check:auth`. This sends an HTTP
probe to compare dev/build flags; unobservable dev state is indeterminate (exit 2).
([check-auth-invariant.mjs:probeDevAuthEnabled](../../scripts/check-auth-invariant.mjs),
[check-auth-invariant.mjs:main](../../scripts/check-auth-invariant.mjs))

Database connectivity, broker/connector flows, preview messaging, and WebRTC
need separate integration verification. Chess gauntlets are separate commands
with checkpoint/publication effects; see the [chess contract](./chess/README.md).
