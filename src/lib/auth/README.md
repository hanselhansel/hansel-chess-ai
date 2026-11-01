# Authentication

## Overview

Better Auth client/server configuration, broker sign-in helpers, Gate identity
verification and session binding, request guards, and a shared-PGlite Kysely
dialect. Handler helpers and generated authentication URLs do not establish
that a corresponding application route is registered.

## Interface

- Browser exports include `authClient`, `authEnabled`, `getBearerToken`,
  `signIn(providerId, options?)`, and `signOut(redirectTo?)`. `GROK_PROVIDERS`
  currently lists Google and X broker providers. Email/password is disabled;
  preview broker configuration is exported separately.
  ([client.ts:authClient](./client.ts), [client.ts:signIn](./client.ts),
  [client.ts:signOut](./client.ts), [providers.ts:GROK_PROVIDERS](./providers.ts),
  [email-password.ts:emailAndPasswordEnabled](./email-password.ts),
  [preview.ts:PREVIEW_CLIENT_ID](./preview.ts))
- `useCurrentUserState()` returns `CurrentUserState`; `useCurrentUser()` returns
  its normalized `AppUser`. `DEV_USER` is the disabled-auth fallback.
  `SignedIn`, `SignedOut`, `RedirectToSignIn`, `SIGN_IN_PATH`, and `UserButton`
  provide UI helpers. `AuthProvider` currently returns a fragment.
  ([use-current-user.ts:useCurrentUserState](./use-current-user.ts),
  [use-current-user.ts:useCurrentUser](./use-current-user.ts),
  [gates.tsx:SignedIn](./gates.tsx), [gates.tsx:SignedOut](./gates.tsx),
  [gates.tsx:RedirectToSignIn](./gates.tsx), [gates.tsx:UserButton](./gates.tsx),
  [provider.tsx:AuthProvider](./provider.tsx))
- Server exports are `auth`, `authConfigured`, `SESSION_TOKEN_COOKIE`,
  `readSessionToken()`, `getSessionUser(bearerToken?)`, `requireUserId(bearerToken?)`,
  `VerifiedUser`, `UnauthorizedError`, and `DEV_USER_ID`. `authMiddleware`
  supplies resolved `context.userId`; `handleAuthPopupRequest(request)` returns
  an OAuth redirect or popup completion response.
  ([server.ts:auth](./server.ts), [server.ts:readSessionToken](./server.ts),
  [verify.server.ts:getSessionUser](./verify.server.ts),
  [verify.server.ts:requireUserId](./verify.server.ts),
  [middleware.ts:authMiddleware](./middleware.ts),
  [popup.server.ts:handleAuthPopupRequest](./popup.server.ts))
- Gate exports include identity/JWKS/account option types, header/key-path
  constants, `gateIdentityEnabled`, `gateKeyResolver`, `verifyGateIdentityToken`,
  `resolveGateEndpoints`, `gateIdentityFromHeaders`, and `sessionBoundToGateIdentity`.
  `gateIdentitySessions()` builds the Better Auth plugin using `GATE_PROVIDER_ID`.
  ([gate-identity.server.ts:GateIdentity](./gate-identity.server.ts),
  [gate-identity.server.ts:verifyGateIdentityToken](./gate-identity.server.ts),
  [gate-identity.server.ts:gateIdentityFromHeaders](./gate-identity.server.ts),
  [gate-session.server.ts:gateIdentitySessions](./gate-session.server.ts))
- `assertSameSiteRequest()` throws `CrossSiteRequestError` for disallowed request
  contexts. `pgliteDialect(getClient)` supplies a Kysely PostgreSQL dialect over
  the shared embedded client.
  ([isolation.server.ts:assertSameSiteRequest](./isolation.server.ts),
  [pglite-dialect.ts:pgliteDialect](./pglite-dialect.ts))

## Invariants

- Only literal `VITE_AUTH_ENABLED="false"` disables the browser client flag.
  Server federation also requires effective broker credentials, with preview
  defaults available. Gate identity separately requires `GROK_PROJECT_ID`.
  ([client.ts:authEnabled](./client.ts), [server.ts:authConfigured](./server.ts),
  [gate-identity.server.ts:gateIdentityEnabled](./gate-identity.server.ts))
- The development user ID is permitted only with federation and Gate identity
  disabled and no nonempty `DATABASE_URL`. Disabled auth with a configured
  database throws a configuration error; enabled auth without a session throws
  `UnauthorizedError`. ([verify.server.ts:requireUserId](./verify.server.ts))
- The request guard permits missing context/Fetch Metadata, same-origin, `none`,
  or GET navigation whose destination is neither object nor embed. Other cases
  throw 403. Middleware guards before resolving the user.
  ([isolation.server.ts:assertSameSiteRequest](./isolation.server.ts),
  [middleware.ts:authMiddleware](./middleware.ts))
- Gate tokens use EdDSA, issuer/audience checks, required `sub`/`iat`/`exp`, and
  maximum age ten minutes. Audience is `app:<projectId>`. The key resolver uses
  Ed25519 JWKS keys and a five-minute cache refresh interval.
  ([gate-identity.server.ts:verifyGateIdentityToken](./gate-identity.server.ts),
  [gate-identity.server.ts:gateIdentityFromHeaders](./gate-identity.server.ts),
  [gate-identity.server.ts:gateKeyResolver](./gate-identity.server.ts))
- The Gate hook matches `/get-session`, skips Authorization-bearing requests,
  and verifies identity before binding. An existing session is accepted as bound
  only after an exact linked `grok-gate`/subject match. Lookup or verification
  failure can return without replacing a session.
  ([gate-session.server.ts:gateIdentitySessions](./gate-session.server.ts))
- Session cookies use secure `__Host-grok-auth` names, SameSite Lax, path `/`,
  and no Domain. `tanstackStartCookies` is the last plugin. Auth chooses a pg
  pool with `DATABASE_URL`, otherwise the shared PGlite dialect; nested auth
  migration files are not automatically applied by the shared DB bootstrap.
  ([server.ts:auth](./server.ts), [server.ts:database](./server.ts),
  [db.ts:createPgliteSql](../db.ts))
- Preview sign-out is a bounded best-effort request before token clearing and
  redirect. Deployed sign-out requires a successful bounded request first.
  Popup completion messages check current origin and a source marker, without
  matching `event.source` to the opened window.
  ([client.ts:signOut](./client.ts), [client.ts:waitForPopupToken](./client.ts),
  [sign-out-plan.mjs:runSignOut](../../../scripts/sign-out-plan.mjs))
- The PGlite driver queues one active connection per driver and releases only
  its own connection. Transactions issue begin/commit/rollback; destroying this
  adapter does not close the shared client.
  ([pglite-dialect.ts:LazyPGliteDriver](./pglite-dialect.ts))

## Side Effects

- Server module evaluation starts DB readiness, configures Better Auth/database
  adapters, and stores a process-local random secret when `BETTER_AUTH_SECRET`
  is absent. ([server.ts:auth](./server.ts), [server.ts:previewAuthSecret](./server.ts))
- Browser helpers read/write the bearer token in sessionStorage, call Better
  Auth methods, open popups, install message/timer handlers, and navigate.
  UI helpers update React state or request navigation.
  ([client.ts:getBearerToken](./client.ts), [client.ts:signIn](./client.ts),
  [client.ts:signOut](./client.ts), [gates.tsx:RedirectToSignIn](./gates.tsx),
  [gates.tsx:UserButton](./gates.tsx))
- Gate verification fetches JWKS and updates its cache. Session binding uses
  Better Auth account/session adapters, changes cookies/request headers, and
  logs failures. Popup responses can forward Set-Cookie headers and emit code
  that posts a token to the opener and closes the window.
  ([gate-identity.server.ts:defaultJwksFetch](./gate-identity.server.ts),
  [gate-session.server.ts:gateIdentitySessions](./gate-session.server.ts),
  [popup.server.ts:handleAuthPopupRequest](./popup.server.ts),
  [popup.server.ts:completionHtml](./popup.server.ts))
- The PGlite adapter executes queries and transaction statements and mutates
  its connection queue. ([pglite-dialect.ts:PGliteConnection](./pglite-dialect.ts),
  [pglite-dialect.ts:LazyPGliteDriver](./pglite-dialect.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../../package.json). The automated script explicitly includes
`src/lib/auth/gate-identity.test.ts`.

With an already running dev server, run `npm run check:auth`. This is an HTTP
probe of dev/build flag agreement; unobservable dev state is indeterminate (exit 2).
([check-auth-invariant.mjs:probeDevAuthEnabled](../../../scripts/check-auth-invariant.mjs),
[check-auth-invariant.mjs:main](../../../scripts/check-auth-invariant.mjs))

Broker availability, registered routes, cookie delivery, and real sign-in or
sign-out require separate integration verification.
