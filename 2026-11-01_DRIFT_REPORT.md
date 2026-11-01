# EGM Drift Report

Scope: the 21 README contracts created or updated by EGM Bootstrap.
Source revision: `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`.
Review date: 2026-11-01.

This is a read-only comparison. Findings F1 through F10 identify distinct
differences; repeated IDs refer to the same finding across contracts.
API-index findings concern completeness of the public interface inventory.
Historical ratings were not refreshed.

## README.md

- **F1. Unresolved implementation drift.** The approved medium-model ladder requires promoted M in the browser and its card. Browser initialization still calls `loadPlayWeights()` without an argument, selecting `tinyaz-s.bin`, while frontend constants/metadata identify M and UCI defaults to M. The implementation requirement remains unmet. Evidence: [approved ladder, First experiment item 6](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md), [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts), [think-client.ts:createThinker](./src/lib/chess/think-client.ts), [think.worker.ts:self.onmessage](./src/workers/think.worker.ts), [constants.ts:WEIGHTS_URL](./src/lib/chess/constants.ts), [engine_uci.py:default_weights](./train/src/tinyaz/engine_uci.py).

## migrations/README.md

- **F2. Stale source documentation.** The nested auth SQL header says migrations in its folder apply automatically during build and startup. Both actual appliers select only top-level SQL. The README's opt-in description and the source header disagree. Update the stale header without changing the opt-in behavior. Evidence: [0001_auth.sql, opening comments](./migrations/auth/0001_auth.sql), [migration-plan.mjs:pendingMigrations](./scripts/migration-plan.mjs), [migrate.mjs:main](./scripts/migrate.mjs), [db.ts:createPgliteSql](./src/lib/db.ts).

## scripts/README.md

- **F4. API-index coverage gap.** The interface inventory groups helper roles without naming these 24 exported functions: [brand-check.mjs](./scripts/brand-check.mjs) `siteDeclaresOgTypeGame`; [browser-smoke-verdict.mjs](./scripts/browser-smoke-verdict.mjs) `normalizeBodyText`, `normalizedBodyTextHash`, `bodyTextPrefix`, `derivedPaths`; [check-auth-invariant.mjs](./scripts/check-auth-invariant.mjs) `authInvariantWarnings`; [grok-pwa-shared.mjs](./scripts/grok-pwa-shared.mjs) `escapeHtml`, `publicAppHost`, `grokPwaHeadTags`, `readGrokProjectId`, `readXCreator`, `readXCreatorId`, `grokXCreatorHeadTags`, `customOgAssetPath`, `titleFromDocument`, `siteHasCustomCard`, `resolveOgCardAsset`, `stripShareMetaTags`; [preview.mjs](./scripts/preview.mjs) `parsePid`, `parsePgid`, `parseListenerInodes`, `looksLikePreviewProcess`; [with-app-env.mjs](./scripts/with-app-env.mjs) `projectRoot`, `isMainModule`. Add their names/signatures to make the public API inventory explicit.

## server/README.md

No drift detected.

## src/README.md

- **F1. Unresolved implementation drift.** Approved M browser selection remains unmet: [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts) and its [worker caller](./src/workers/think.worker.ts) select S by default, against [the approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md).

## train/README.md

- **F1. Unresolved implementation drift.** UCI's M default differs from the browser's S default. Publication has not selected the promoted M asset in the browser as required by [the approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md). Evidence: [engine_uci.py:default_weights](./train/src/tinyaz/engine_uci.py), [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts).

## migrations/auth/README.md

- **F2. Stale source documentation.** The README describes the schema as opt-in, but [0001_auth.sql's opening comments](./migrations/auth/0001_auth.sql) still promise automatic application from this nested folder. [migration-plan.mjs:pendingMigrations](./scripts/migration-plan.mjs), [migrate.mjs:main](./scripts/migrate.mjs), and [db.ts:createPgliteSql](./src/lib/db.ts) exclude it until it is copied to the top-level migration input.

## server/middleware/README.md

No drift detected.

## src/components/README.md

No drift detected.

## src/lib/README.md

- **F3. Stale source documentation.** `getSql()`'s JSDoc says schema migrations are applied before the first query on both backends. `createNeonSql()` only creates the pg query wrapper; deployment migrations belong to `scripts/migrate.mjs`. The source comment promises a migration effect that the pg query wrapper does not perform. Evidence: [db.ts:getSql](./src/lib/db.ts), [db.ts:createNeonSql](./src/lib/db.ts), [migrate.mjs:main](./scripts/migrate.mjs).
- **F5. API-index coverage gap.** The interface inventory omits the exported names `isGrokEmbedderOrigin`, `PREVIEW_BRIDGE_CHANNEL`, and `PREVIEW_BRIDGE_VERSION`. Their host/protocol roles are summarized, but callers cannot retrieve the complete public symbol inventory from the contract. Evidence: [preview-embedder-origin.ts:isGrokEmbedderOrigin](./src/lib/preview-embedder-origin.ts), [preview-host-bridge.ts:PREVIEW_BRIDGE_CHANNEL](./src/lib/preview-host-bridge.ts), [preview-host-bridge.ts:PREVIEW_BRIDGE_VERSION](./src/lib/preview-host-bridge.ts).

## src/routes/README.md

No drift detected.

## src/workers/README.md

- **F1. Unresolved implementation drift.** Initialization calls the loader's S default despite the approved M browser requirement. Evidence: [think.worker.ts:self.onmessage](./src/workers/think.worker.ts), [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts), [approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md).

## train/lichess-bot/README.md

No drift detected.

## train/scripts/README.md

No drift detected.

## train/src/README.md

No drift detected.

## src/components/chess/README.md

- **F1. Unresolved implementation drift.** `Workbench` fetches M metadata and the card uses M labels while the thinker loads S by default. The metadata therefore does not identify the loaded browser checkpoint. Evidence: [workbench.tsx:Workbench](./src/components/chess/workbench.tsx), [card-panel.tsx:CardPanel](./src/components/chess/card-panel.tsx), [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts), [approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md).

## src/lib/app-data/README.md

- **F6. API-index coverage gap.** The contract says staging and production host constants are exported but omits their public identifiers, `CONNECTORS_HOST_STAGING` and `CONNECTORS_HOST_PROD`. Add both names to the interface inventory. Evidence: [client.server.ts:CONNECTORS_HOST_STAGING](./src/lib/app-data/client.server.ts), [client.server.ts:CONNECTORS_HOST_PROD](./src/lib/app-data/client.server.ts).

## src/lib/auth/README.md

- **F7. API-index coverage gap.** The contract groups exported option/account types, header/key-path constants, and preview configuration without naming `GateJwks`, `VerifyGateIdentityTokenOptions`, `GateLinkedAccount`, `GATE_IDENTITY_HEADER`, `GATE_JWKS_PATH`, `PREVIEW_CLIENT_SECRET`, `GROK_ISSUER_DEFAULT`, `PREVIEW_ALLOWED_HOSTS`, or `GrokProvider`. Add the exported names and relevant type shapes. Evidence: [gate-identity.server.ts](./src/lib/auth/gate-identity.server.ts), [preview.ts](./src/lib/auth/preview.ts), [providers.ts](./src/lib/auth/providers.ts).

## src/lib/chess/README.md

- **F1. Unresolved implementation drift.** `WEIGHTS_URL` names M, but the browser's actual loader default and callers select S. The approved M-selection requirement remains open. Evidence: [constants.ts:WEIGHTS_URL](./src/lib/chess/constants.ts), [weights.ts:loadPlayWeights](./src/lib/chess/weights.ts), [think-client.ts:createThinker](./src/lib/chess/think-client.ts), [approved M ladder](./docs/superpowers/specs/2026-08-29-tinyaz-m-ladder-design.md).
- **F8. API-index coverage gap.** Geometry helpers are grouped by role, without naming four public functions: `fileOf`, `rankOf`, `algebraicToIndex`, and `indexToAlgebraic`. Add these names/signatures to the interface inventory. Evidence: [constants.ts](./src/lib/chess/constants.ts).

## src/lib/multiplayer/README.md

No drift detected.

## train/src/tinyaz/README.md

- **F9. API-index coverage gap.** The constants row groups square helpers without naming five public functions: `square_index`, `file_of`, `rank_of`, `algebraic_to_index`, and `index_to_algebraic`. Add these names/signatures to the interface inventory. Evidence: [constants.py](./train/src/tinyaz/constants.py).
- **F10. UCI error/state behavior is undocumented.** The interface lists the `position` command but omits `TinyazUci.apply_position` and its partial-update behavior. For `startpos moves ...` or `fen ... moves ...`, valid moves are pushed immediately; the first invalid move returns without rolling back earlier mutations, and `handle("position ...")` returns no protocol error. Document this state transition and error behavior. Evidence: [engine_uci.py:TinyazUci.apply_position](./train/src/tinyaz/engine_uci.py), [engine_uci.py:TinyazUci.handle](./train/src/tinyaz/engine_uci.py).
