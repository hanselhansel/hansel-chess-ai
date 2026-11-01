# Server PWA boundary

## Overview

This component supplies the TypeScript declaration for the build-generated OG identity.
Its middleware child serves app manifests, installation HTML, and transformed document streams.
The build provider and shared rendering helpers live in `scripts/`.

## Interface

- Ambient module `virtual:grok-og-identity` exports `grokOgIdentity`. It has a required `site` object with optional string fields `title`, `description`, `type`, `card`, `image`, `banner`, and `color`. [virtual-grok-og-identity.d.ts:grokOgIdentity](./virtual-grok-og-identity.d.ts).
- The external build provider resolves that module and generates its JavaScript export from `snapshotOgIdentity(root)`. This implementation belongs to `scripts/`. [../scripts/grok-pwa-plugin.mjs:GROK_OG_IDENTITY_ID](../scripts/grok-pwa-plugin.mjs), [../scripts/grok-pwa-plugin.mjs:grokPwaPlugin](../scripts/grok-pwa-plugin.mjs), [../scripts/grok-pwa-shared.mjs:snapshotOgIdentity](../scripts/grok-pwa-shared.mjs).
- [Middleware contract](./middleware/README.md): default `grokPwaMiddleware(event, next)` accepts a URL, request method and headers, and a zero-argument continuation. It serves GET manifests and eligible iOS installation requests, then transforms eligible downstream HTML responses. [middleware/grok-pwa.ts:grokPwaMiddleware](./middleware/grok-pwa.ts), [middleware/grok-pwa.ts:GrokPwaEvent](./middleware/grok-pwa.ts).

## Invariants

- The declaration specifies the required `site` object and optional string metadata fields. It contributes types without runtime schema validation. [virtual-grok-og-identity.d.ts:grokOgIdentity](./virtual-grok-og-identity.d.ts).
- The declared module name is `virtual:grok-og-identity`, matching the build provider's module identifier. [virtual-grok-og-identity.d.ts:grokOgIdentity](./virtual-grok-og-identity.d.ts), [../scripts/grok-pwa-plugin.mjs:GROK_OG_IDENTITY_ID](../scripts/grok-pwa-plugin.mjs).
- The child intercepts GET requests. Exact manifest routes precede document filtering; installation HTML also requires an accepted HTML header. Host selection uses `x-forwarded-host`, `host`, then `event.url.host` with nullish fallback. [middleware/grok-pwa.ts:grokPwaMiddleware](./middleware/grok-pwa.ts), [middleware/grok-pwa.ts:requestHost](./middleware/grok-pwa.ts), [../scripts/grok-pwa-shared.mjs:acceptsHtml](../scripts/grok-pwa-shared.mjs).
- Downstream transformation requires a `Response` with a body, a content type containing `text/html`, and no nonempty `content-encoding`. The injector buffers through the first closing head tag, or through stream end if none appears. [middleware/grok-pwa.ts:grokPwaMiddleware](./middleware/grok-pwa.ts), [../scripts/grok-pwa-shared.mjs:createHeadInjector](../scripts/grok-pwa-shared.mjs).

## Side Effects

- Local declaration: None. [virtual-grok-og-identity.d.ts:grokOgIdentity](./virtual-grok-og-identity.d.ts).
- The external build provider reads `src/lib/og/site.json` and checks OG image and banner assets when generating the virtual module. These filesystem operations belong to `scripts/`. [../scripts/grok-pwa-plugin.mjs:grokPwaPlugin](../scripts/grok-pwa-plugin.mjs), [../scripts/grok-pwa-shared.mjs:readOgSite](../scripts/grok-pwa-shared.mjs), [../scripts/grok-pwa-shared.mjs:snapshotOgIdentity](../scripts/grok-pwa-shared.mjs).
- The child invokes `next()` for delegated requests. Transformed responses preserve status and status text, clone headers, and remove `content-length`. [middleware/grok-pwa.ts:grokPwaMiddleware](./middleware/grok-pwa.ts), [middleware/grok-pwa.ts:injectHeadStreaming](./middleware/grok-pwa.ts).
- Runtime head helpers read the working directory and environment and probe local OG image paths even with baked metadata. Generated markup references external scripts and images without fetching them. [../scripts/grok-pwa-shared.mjs:normalizeHeadContext](../scripts/grok-pwa-shared.mjs), [../scripts/grok-pwa-shared.mjs:ogCardPublicPath](../scripts/grok-pwa-shared.mjs), [../scripts/grok-pwa-shared.mjs:grokExtensionsHeadTags](../scripts/grok-pwa-shared.mjs), [../scripts/grok-pwa-shared.mjs:grokOgHeadTags](../scripts/grok-pwa-shared.mjs).

## Verification

Run from the repository root using [package.json](../package.json):

```sh
npm test
npm run typecheck
```

These are repository commands. There is no dedicated server test script.
The [TypeScript configuration](../tsconfig.json) includes `server` and `src`.
