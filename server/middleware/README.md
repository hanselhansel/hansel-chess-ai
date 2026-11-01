# Server PWA middleware

## Overview

The deployed middleware serves app manifests and the iOS installation tutorial.
It also transforms downstream HTML streams to add PWA and social metadata.
Rendering policy lives in [the shared helpers](../../scripts/grok-pwa-shared.mjs).
The [Vite plugin](../../scripts/grok-pwa-plugin.mjs) provides the development and preview counterpart.

## Interface

- Default `grokPwaMiddleware(event, next)` returns `Promise<unknown>`. Its event contains `url: URL` and `req: { method: string; headers: Headers }`. The zero-argument `next` callback may return a value or promise. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts), [grok-pwa.ts:GrokPwaEvent](./grok-pwa.ts).
- GET `/__grok/manifest.webmanifest` and `/__grok/manifest.json` return a host-named manifest with `application/manifest+json; charset=utf-8` and `cache-control: no-cache`. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts), [../../scripts/grok-pwa-shared.mjs:renderWebManifest](../../scripts/grok-pwa-shared.mjs).
- GET document requests with `install=1` or `install=true`, a `platform` value matching `ios` case-insensitively, and an accepted HTML header return the bundled installation template. The response uses `text/html; charset=utf-8` and `cache-control: no-cache`. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts), [../../scripts/grok-pwa-shared.mjs:isInstallQuery](../../scripts/grok-pwa-shared.mjs).

## Invariants

- The method is uppercased, with a nullish fallback of `GET`. Other methods delegate directly to `next()`. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts).
- Document paths exclude prefixes `/__grok/`, `/api/`, `/@`, and `/node_modules`, plus paths ending in a dot followed by alphanumeric characters. Other paths delegate unless they match a manifest route. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts), [../../scripts/grok-pwa-shared.mjs:isDocumentPath](../../scripts/grok-pwa-shared.mjs).
- Request-host selection uses the first non-nullish value from `x-forwarded-host`, `host`, and `event.url.host`. Manifest and tutorial names derive from valid `.grok.me` host labels, otherwise `Grok App`. [grok-pwa.ts:requestHost](./grok-pwa.ts), [../../scripts/grok-pwa-shared.mjs:appNameFromHost](../../scripts/grok-pwa-shared.mjs).
- Tutorial requests accept an absent or empty `Accept` header, or one containing `text/html` or `*/*`. Rendering escapes substitutions and removes `install` and `platform` from the app link. [../../scripts/grok-pwa-shared.mjs:acceptsHtml](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:renderInstallPageHtml](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:stripInstallParams](../../scripts/grok-pwa-shared.mjs).
- Remaining document GETs await `next()`. Only a `Response` with a body, a content type containing `text/html`, and no nonempty `content-encoding` is transformed. This branch has no request `Accept` check. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts).
- The injector buffers through the first case-insensitive `</head>` and passes later bytes through. Without that marker, `flush()` transforms the buffered document at stream end. [grok-pwa.ts:injectHeadStreaming](./grok-pwa.ts), [../../scripts/grok-pwa-shared.mjs:createHeadInjector](../../scripts/grok-pwa-shared.mjs).
- Injection supplies the virtual module's baked `grokOgIdentity.site`. Shared rendering replaces its listed share metadata and adds missing PWA, extension, project, and creator tags. [grok-pwa.ts:injectHeadStreaming](./grok-pwa.ts), [../../scripts/grok-pwa-plugin.mjs:grokPwaPlugin](../../scripts/grok-pwa-plugin.mjs), [../../scripts/grok-pwa-shared.mjs:injectGrokPwaHead](../../scripts/grok-pwa-shared.mjs).

## Side Effects

- Delegated requests invoke `next()`. Eligible HTML bodies pass through a `TransformStream` into a new response. Status and status text are preserved; headers are cloned and `content-length` is removed. [grok-pwa.ts:grokPwaMiddleware](./grok-pwa.ts), [grok-pwa.ts:injectHeadStreaming](./grok-pwa.ts).
- Shared head helpers read the working directory and environment values `VITE_PROJECT_ID`, `X_CREATOR`, `X_CREATOR_ID`, and `VITE_PUBLIC_HOSTNAME`. Placeholder images also consult `VITE_OG_SERVICE_URL`. They probe local `public/og.jpg` and `public/og.png` paths even with baked metadata. [../../scripts/grok-pwa-shared.mjs:normalizeHeadContext](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:ogCardPublicPath](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:resolvePublicHost](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:ogServiceUrl](../../scripts/grok-pwa-shared.mjs).
- Generated markup can reference the deferred Grok extensions script and custom or placeholder OG images. These helpers construct the references without fetching them. [../../scripts/grok-pwa-shared.mjs:grokExtensionsHeadTags](../../scripts/grok-pwa-shared.mjs), [../../scripts/grok-pwa-shared.mjs:grokOgHeadTags](../../scripts/grok-pwa-shared.mjs).

## Verification

Run from the repository root using [package.json](../../package.json):

```sh
npm test
npm run typecheck
```

These are repository commands. There is no dedicated server test script.
