# App Data

## Overview

Server-side transport for remote connector tools, with a client-safe entry point
for shared types and login helpers. Connector operations run at the resolved
remote service; this package does not implement each provider's tools.

## Interface

- `callTool(toolName, args, options)` returns a `CallToolResult` envelope.
  Options specify a connector type, optional catalog identifier, and optional
  token. Arguments are an unrestricted string-keyed object.
  ([client.server.ts:callTool](./client.server.ts), [types.ts:CallToolOptions](./types.ts),
  [types.ts:ToolArgs](./types.ts), [types.ts:CallToolResult](./types.ts))
- `ConnectorType`, `ConnectorTypeName`, `GoogleDriveTools`, and
  `CONNECTOR_TOKEN_HEADER` expose connector identifiers, Drive tool names, and
  the `x-connector-access-token` header. Shared types and login helpers are
  available from the client-safe [entry point](./index.ts).
  ([types.ts:ConnectorType](./types.ts), [types.ts:GoogleDriveTools](./types.ts),
  [types.ts:CONNECTOR_TOKEN_HEADER](./types.ts))
- `resolveGateAppDataBase()`, `getConnectorAccessToken()`, and `failureMemoSize()`
  expose resolved request context and failure-cache size. The exported
  connector-host strings `CONNECTORS_HOST_STAGING` and `CONNECTORS_HOST_PROD`
  supply the base for recognized `app-builder-testing.com` and `grok.me`
  public hosts respectively; explicit `GROK_CONNECTORS_URL` takes precedence,
  and unmatched or loopback hosts have no default base.
  ([client.server.ts:resolveGateAppDataBase](./client.server.ts),
  [client.server.ts:getConnectorAccessToken](./client.server.ts),
  [client.server.ts:failureMemoSize](./client.server.ts),
  [client.server.ts:CONNECTORS_HOST_STAGING](./client.server.ts),
  [client.server.ts:CONNECTORS_HOST_PROD](./client.server.ts))
- `isLoginRequired(result)` identifies failed login-required envelopes.
  `redirectToLoginIfRequired(result)` attempts browser navigation and returns
  whether it initiated a redirect. `assertAppDataServerOnly()` guards transport
  imports. ([login.ts:isLoginRequired](./login.ts),
  [login.ts:redirectToLoginIfRequired](./login.ts),
  [server-only.ts:assertAppDataServerOnly](./server-only.ts))

## Invariants

- The transport rejects browser evaluation. With inbound request context,
  connector calls require POST and must pass the same-site guard. Missing
  request context is permitted. ([server-only.ts:assertAppDataServerOnly](./server-only.ts),
  [client.server.ts:nonPostBlockedResult](./client.server.ts),
  [isolation.server.ts:assertSameSiteRequest](../auth/isolation.server.ts))
- `GROK_CONNECTORS_URL` overrides base selection. Otherwise recognized public
  host suffixes select staging or production; unmatched/loopback hosts have no
  default base. Fetch requires an absolute HTTP(S) base.
  ([client.server.ts:connectorsBaseFor](./client.server.ts),
  [client.server.ts:gatePost](./client.server.ts))
- An explicit token takes precedence over the inbound connector-token header.
  The development environment token is disabled in production. Missing tokens
  produce login-required results; `Mcp` requires a catalog identifier.
  ([client.server.ts:inboundContext](./client.server.ts), [client.server.ts:callTool](./client.server.ts))
- Transport/tool failures can be memoized for five seconds. Keys include tool,
  arguments, connector/catalog, and hashed token identity, but omit host/base.
  JWT payload decoding serves cache identity only, without verifying identity.
  ([client.server.ts:FAILURE_MEMO_TTL_MS](./client.server.ts),
  [client.server.ts:safeMemoKey](./client.server.ts),
  [client.server.ts:tokenIdentityKey](./client.server.ts))

## Side Effects

- POSTs JSON to `<base>/call-tool` with the resolved bearer token and optional
  forwarded host. Inbound cookies and Authorization are not copied. Redirects
  are manual; the fetch has no timeout or AbortSignal.
  ([client.server.ts:gatePost](./client.server.ts))
- Mutates and lazily expires a module-level failure map.
  ([client.server.ts:memoizeFailure](./client.server.ts),
  [client.server.ts:memoizedFailure](./client.server.ts))
- Login redirection calls `window.location.assign()` when a failed login-required
  envelope supplies a URL. ([login.ts:redirectToLoginIfRequired](./login.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`, as declared
in [package.json](../../../package.json). The automated test script explicitly
includes `src/lib/app-data/app-data.test.ts`.

With an already running dev server, run `npm run check:auth`. This is an HTTP
probe, and unobservable dev state is indeterminate (exit 2).
([check-auth-invariant.mjs:probeDevAuthEnabled](../../../scripts/check-auth-invariant.mjs),
[check-auth-invariant.mjs:main](../../../scripts/check-auth-invariant.mjs))

Remote connector success and login flows require separate integration verification.
