# Tinyaz software implementation and evidence ledger

- **Date:** 2026-11-02
- **State:** C0 documentation baseline committed at `8e23a787771fd74a723a52aa8941aaa38de9adf8`; fresh baseline captured. C1 is implemented and verified in this change on `fix/tinyaz-test-fixtures` (verification base `0f5c5f72e1bbd0d760f7176a5308a205715aba5b`): Sol's full `npm test` passed 191/191 application script cases then 39/39 core cases and `npm run typecheck` exited 0 on that snapshot. The coordinator accepted the executable change, both documentation corrections and the static doc review, with the eight frozen executable hashes verified unchanged. The four upstream authoring checks remain unavailable without real `GROK_TEMPLATE_ROOT` input. C1 is committed at `f67ba10d2da6065aeccb54bf6af6af4e370b0c97` on `fix/tinyaz-test-fixtures`. Earlier push attempts hit GitHub TCP timeouts and a read-only connector then found no remote branch; the coordinator pushed the same commit at about 2026-11-02T01:02Z, and `git ls-remote` plus the GitHub connector now confirm `f67ba10d2da6065aeccb54bf6af6af4e370b0c97` at `refs/heads/fix/tinyaz-test-fixtures`, so C1 is local verified and remote published. C2a's comment/inventory packet passed Sol's static gates with verdict `ACCEPTED_FOR_METADATA_FINALIZATION` and is implemented and verified in this change on `fix/tinyaz-contract-inventories`, built on that unchanged base; the containing commit supplies its closure.
- **Requirements:** [Canonical design](../superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md).
- **Review:** [Five-stage report](../superpowers/reviews/2026-11-02-tinyaz-verified-m/consolidated_review_report.md) and [resolved text actions](../superpowers/reviews/2026-11-02-tinyaz-verified-m/resolution/goldfish_review_report.md).
- **Functional control source:** `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`.
- **Integration branch:** `chore/egm-bootstrap-tinyaz`. Never commit to main.
- **Candidate:** not yet implemented or frozen. No comparison, training, publication, deployment or live-bot action.

## Immutable control assets

| Asset                                |   Bytes | SHA256                                                             |
| ------------------------------------ | ------: | ------------------------------------------------------------------ |
| `public/weights/tinyaz-m.bin`        | 9706840 | `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee` |
| `public/weights/tinyaz-s.bin`        | 2560088 | `8b08996db7a6b41c1bcc06793147d934f5f311ff6b08bf7a926bd6b5cdb17247` |
| `public/weights/tinyaz-m.meta.json`  |    5632 | `09e5989f3fd1d9453a49c3626bdac50bedb847dc60992ecf2f98f922421e828d` |
| `public/weights/tinyaz-s.meta.json`  |    4202 | `524d100df1dd21509e8fc6a7abc6c4099a971de08a063eb0e954574d1fa2017f` |
| `src/lib/chess/checkpoint-meta.json` |    5632 | `09e5989f3fd1d9453a49c3626bdac50bedb847dc60992ecf2f98f922421e828d` |

Historical metadata is retained as recorded, with unknown checkpoint/measurement provenance kept unknown. These hashes identify present control files; they are not retroactive measurement provenance.

## Fresh baseline, before implementation

| Command                           | Exit | Result                                                                            |
| --------------------------------- | ---: | --------------------------------------------------------------------------------- |
| `npm test`                        |    1 | Script stage: 195 tests, 179 pass, 16 fail. It stops before the TypeScript stage. |
| Separate three-suite core command |    0 | 39 tests pass, no failures.                                                       |
| `npm run typecheck`               |    0 | Type checking passes.                                                             |

The separate core command was:

```sh
node --experimental-strip-types --test src/lib/chess/chess.test.ts src/lib/app-data/app-data.test.ts src/lib/auth/gate-identity.test.ts
```

Raw local command logs and exits were captured outside the repository:

| Log                                                                                                                                 | SHA256                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [local baseline-npm-test.log](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-cn8tqswa/baseline-npm-test.log)   | `dc25afa925d70de6167721d2683cb9db2544ddf6c9a650c196e32e98d94a13ef` |
| [local baseline-typecheck.log](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-cn8tqswa/baseline-typecheck.log) | `b2881edcc7fd0114feb3d216fcfe7a1bd82f425b5467f0ddf80c2627cabb0116` |
| [local baseline-core.log](/var/folders/48/mn49jb697djfv2xv2t03nbn40000gn/T/tinyaz-egm-resolve-cn8tqswa/baseline-core.log)           | `e7664a0342f349ffdcf67299c55c289ae9966af471ddc86966ec725cb3696383` |

The selected `/opt/homebrew/opt/python@3.11/bin/python3.11` is 3.11.14. Metadata/import-spec probes found NumPy 2.3.5, chess 1.11.2, zstandard 0.25.0 and no Torch. No dependency was installed for this baseline. Required Torch checks remain pending. The old real-game climb dispatcher was source-inspected and was not executed.

## C1 targeted evidence (prepared diff, 2026-11-02)

Implemented and verified in this change; Sol's full gates and the coordinator's static doc review are recorded below. Devin's scoped commands ran from the assigned checkout on `fix/tinyaz-test-fixtures` at unchanged base `0f5c5f72e1bbd0d760f7176a5308a205715aba5b`.

| Command                                                                                                                          | Exit | Result                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------------------------------------- |
| `node --test scripts/brand-check.test.mjs scripts/write-atomic.test.mjs scripts/check-auth-invariant.test.mjs scripts/with-app-env.test.mjs scripts/grok-pwa-plugin.test.mjs scripts/grok-pwa-head.test.mjs` | 0 | 106 tests, 106 pass, 0 fail/skip/todo. 26 brand + 10 atomic + 11 auth + 12 app-env + 16 head + 31 plugin. |
| `env -u GROK_TEMPLATE_ROOT npm run test:template-authoring`                                                                        |    1 | Expected fail-closed probe: `[template-authoring] GROK_TEMPLATE_ROOT is not set` diagnostic, 1 test-file failure, 0 passes. |
| `env GROK_TEMPLATE_ROOT=<existing empty dir> npm run test:template-authoring`                                                      |    1 | Expected fail-closed probe: `[template-authoring] required authoring input is missing or unreadable: .../AGENTS.md`, 1 test-file failure, 0 passes. |

Sol ran the required gates once on this exact prepared snapshot (review artifacts at `/tmp/tinyaz-c1-sol-review/`):

| Command             | UTC start             | UTC end               | Exit | Result                                                                                          |
| ------------------- | --------------------- | --------------------- | ---: | ----------------------------------------------------------------------------------------------- |
| `npm test`          | 2026-11-02 00:23:59.489 | 2026-11-02 00:24:00.735 |    0 | Scripts stage 191/191 pass; core stage 39/39 pass, 12 suites. Both stages 0 fail/cancelled/skipped/todo. |
| `npm run typecheck` | 2026-11-02 00:24:00.737 | 2026-11-02 00:24:02.109 |    0 | `tsc --noEmit` passed.                                                                          |

Node v24.4.1, npm 11.4.2, darwin arm64. Review decision `CONDITIONAL_ACCEPT_DOCS_ONLY`: the executable change is accepted and its eight package/source/test SHA-256s are frozen in [review-summary.json](/tmp/tinyaz-c1-sol-review/review-summary.json); the two required documentation corrections are applied in this same diff. Command logs:

| Log                                                                                     | SHA256                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [npm-test.stdout.log](/tmp/tinyaz-c1-sol-review/npm-test.stdout.log)                   | `32c80508d34a2c225d532eda0348c8a698bf92d4c0651b96b5a93d02d48a1de7` |
| [npm-test.stderr.log](/tmp/tinyaz-c1-sol-review/npm-test.stderr.log)                   | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) |
| [npm-typecheck.stdout.log](/tmp/tinyaz-c1-sol-review/npm-typecheck.stdout.log)         | `b2881edcc7fd0114feb3d216fcfe7a1bd82f425b5467f0ddf80c2627cabb0116` |
| [npm-typecheck.stderr.log](/tmp/tinyaz-c1-sol-review/npm-typecheck.stderr.log)         | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) |

Machine-readable evidence: [verification.json](/tmp/tinyaz-c1-sol-review/verification.json), [review.md](/tmp/tinyaz-c1-sol-review/review.md).

No real `GROK_TEMPLATE_ROOT` was supplied, so V01/V02/V03/V16 are retained in `contract.mjs` and unavailable: they are not run, not passed, and not skipped by the application gate. The authoring command never falls back to this checkout, a global AGENTS file, or a synthetic template.

Case destination mapping against the 195-case baseline (179 pass, 16 fail): 26 brand + 10 atomic + 11 auth + 12 app-env + 16 moved head + 31 retained PWA = 106 targeted application cases; plus 85 unchanged cases in `browser-smoke-verdict`, `migration-plan`, `preview`, and `sign-out-plan` = 191 required application script cases, all of which Sol's `npm test` passed. Four authoring cases moved to `contract.mjs`. 39 core cases are discovered by `test:core` unchanged and all passed.

Edited/new source and test file line counts (all below 400): `brand-check.test.mjs` 305, `write-atomic.test.mjs` 181, `check-auth-invariant.test.mjs` 126, `with-app-env.test.mjs` 172, `grok-pwa-plugin.test.mjs` 386, `grok-pwa-head.test.mjs` 236 (new), `template-authoring/contract.mjs` 160 (new). The other touched paths (`package.json`, `README.md`, `scripts/README.md`, `template-authoring/README.md`, this ledger, the C1 progress block in the canonical design) carry no source-limit. Sol's full `npm test` and `typecheck` results are recorded above; the four upstream authoring checks are C1's only unverified gate, unavailable without real input. Later Python, browser, parity and comparison gates remain pending in their own packets.

## C2a documentation evidence (2026-11-02)

Implemented and verified in this change on `fix/tinyaz-contract-inventories`, built on unchanged base `f67ba10d2da6065aeccb54bf6af6af4e370b0c97`; Sol's final static review returned verdict `ACCEPTED_FOR_METADATA_FINALIZATION`, and the containing commit supplies closure for F2-F9 and R-M08-S/R-M08-A. Sol independently built `expected-inventory.json` and `expected-inventory.md` from immutable Git objects and ran the static gates in one inline `node --input-type=module` command, exit 0, from 2026-11-02T01:05:07.450Z to 01:05:07.672Z; `git diff --check f67ba10d2da6065aeccb54bf6af6af4e370b0c97` also exited 0 with empty output. Accepted results: exact SQL non-header byte equality with only blank/comment header lines changed; exact TypeScript bytes before and after the `getSql` JSDoc; all 63 owner/name entries explicit with accurate signatures, types and roles (41 normalized function signatures matched; types, constants and roles checked against the declarations); all 20 new/changed local Markdown links resolve and all 63 entries link their actual source owner; the eight frozen C1 executable hashes and protected C1 ledger sections match base; the canonical design is byte-identical outside the labeled C2a block; exactly the ten authorized paths with no adds, deletes, renames or untracked files; source counts 71 and 243; snapshot checks passed before and after. The review ran no application runtime, database, test, Python, network or Git mutation.

| Evidence                                                                                                    | SHA256                                                             |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [final-review.md](/tmp/tinyaz-c2a-sol-review/final-review.md)                                               | `3b197de4cd9ec5ecb28eab121cd4a999f5d22f21252f6af3178ff21aee40b7f1` |
| [static-verification.json](/tmp/tinyaz-c2a-sol-review/static-verification.json)                             | `0693a162a7a1f7b5dda1870eaa7543ed20bf9163691eb5c331f7c66e79500c97` |
| [boundary-validator-fragment.txt](/tmp/tinyaz-c2a-sol-review/boundary-validator-fragment.txt)               | `023c6fbff55e9af9d157b87f6aad09721518fe6957406c62e83195c391479dd8` |

Supporting review inputs: [expected-inventory.json](/tmp/tinyaz-c2a-sol-review/expected-inventory.json), [expected-inventory.md](/tmp/tinyaz-c2a-sol-review/expected-inventory.md), [final-summary.json](/tmp/tinyaz-c2a-sol-review/final-summary.json), [command-record.json](/tmp/tinyaz-c2a-sol-review/command-record.json). This packet is documentation and comments only; no runtime, test, build, Python, browser, database or migration execution occurred.

| Finding | Disposition | Status |
| ------- | ----------- | ------ |
| F2 | `migrations/auth/0001_auth.sql` opening header corrected, comments only: eligible direct `migrations/*.sql` children are the schema source applied to Neon during build and to PGlite at startup, recorded by basename in `_migrations`; this nested file is opt-in because deploy reads the directory non-recursively via `pendingMigrations` and PGlite globs `/migrations/*.sql`, so it stays unapplied until copied directly into `migrations/`. Every SQL statement byte is preserved. | Closed by this verified change |
| F3 | `getSql` JSDoc in `src/lib/db.ts` corrected only: PGlite readiness and eligible top-level migrations finish before the SQL wrapper resolves; the pg path creates or reuses the wrapper and pool with no migration and no readiness query in `getSql`; deploy migrations are a separate `scripts/migrate.mjs` build step. Memoization, browser rejection and all implementation bytes preserved. | Closed by this verified change |
| F4 | `scripts/README.md`: 24 original owner/name entries added to their owning rows — `siteDeclaresOgTypeGame`; `normalizeBodyText`, `normalizedBodyTextHash`, `bodyTextPrefix`, `derivedPaths`; `authInvariantWarnings`; `escapeHtml`, `publicAppHost`, `grokPwaHeadTags`, `readGrokProjectId`, `readXCreator`, `readXCreatorId`, `grokXCreatorHeadTags`, `customOgAssetPath`, `titleFromDocument`, `siteHasCustomCard`, `resolveOgCardAsset`, `stripShareMetaTags`; `parsePid`, `parsePgid`, `parseListenerInodes`, `looksLikePreviewProcess`; `projectRoot`, `isMainModule`. | Closed by this verified change |
| F5 | `src/lib/README.md`: `isGrokEmbedderOrigin` (re-exported by `preview-host-bridge.ts`), `PREVIEW_BRIDGE_CHANNEL`, `PREVIEW_BRIDGE_VERSION` added; the broader parent-resolution contract is unchanged. | Closed by this verified change |
| F6 | `src/lib/app-data/README.md`: `CONNECTORS_HOST_STAGING`, `CONNECTORS_HOST_PROD` added, with `GROK_CONNECTORS_URL` precedence and no default base for unmatched/loopback hosts. | Closed by this verified change |
| F7 | `src/lib/auth/README.md`: nine original names added — `GateJwks`, `VerifyGateIdentityTokenOptions`, `GateLinkedAccount`, `GATE_IDENTITY_HEADER`, `GATE_JWKS_PATH`, `PREVIEW_CLIENT_SECRET` (role only; value never printed, copied or quoted), `GROK_ISSUER_DEFAULT`, `PREVIEW_ALLOWED_HOSTS`, `GrokProvider`. | Closed by this verified change |
| F8 | `src/lib/chess/README.md`: `fileOf`, `rankOf`, `algebraicToIndex`, `indexToAlgebraic` added with the a1=0 rank-major/no-validation note. | Closed by this verified change |
| F9 | `train/src/tinyaz/README.md`: `square_index`, `file_of`, `rank_of`, `algebraic_to_index`, `index_to_algebraic` added, distinct from `flip_index` rank flipping. | Closed by this verified change |
| R-M08-S | `scripts/README.md`: 15 supplementary names added — `DEFAULT_APP_NAME`, `OG_SERVICE_URL_DEFAULT`, `OG_SITE_REL_PATH`, `appNameFromHost`, `stripInstallParams`, `renderInstallPageHtml`, `renderWebManifest`, `GROK_EXTENSIONS_SCRIPT_SRC`, `readOgSite`, `ogCardPublicPath`, `ogServiceUrl`, `APP_ENV_REL_PATH`, `OG_PENDING_REL_PATH`, `PREVIEW_SIGN_OUT_TIMEOUT_MS`, `DEPLOYED_SIGN_OUT_TIMEOUT_MS`. | Closed by this verified change |
| R-M08-A | `src/lib/auth/README.md`: public `JwksFetch` signature/role added for `gateKeyResolver` and optional `gateIdentityFromHeaders`, distinct from private `defaultJwksFetch`. | Closed by this verified change |
| F10 | `train/src/tinyaz/README.md` documents existing `position` behavior: `startpos` resets then applies moves in order; `fen` loads a valid supplied FEN first; an invalid later move leaves the valid applied prefix without rollback; a malformed FEN is caught before move application; `handle` returns `[]` for handled position forms (no success/error response); `run_stdio`'s outer handler can still emit `bestmove 0000` for uncaught errors. `engine_uci.py` is unchanged. | Focused valid-prefix/no-response runtime regression and final closure pending C2b |

Root `README.md`, `migrations/README.md`, `migrations/auth/README.md` and the parent contracts are unchanged at this base and were confirmed already accurate for these boundaries by the review, so they required no edit. Edited source files remain below 400 lines: `migrations/auth/0001_auth.sql` 71, `src/lib/db.ts` 243. F1, K1, K2, the controlled-climb requirements, the actual M/parity gates, the deferred real S coverage and every other non-C2a finding remain open.

## V01-V16 ownership and current results

| ID  | Recorded failing assertion                                               | Owner                                 | Current disposition                                                                                                   |
| --- | ------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| V01 | `SKILL.md and AGENTS.md name the marker path and bound this script uses` | External template authoring           | Moved unchanged to `scripts/template-authoring/contract.mjs` (`test:template-authoring`). No real `GROK_TEMPLATE_ROOT` supplied, so it is retained but unavailable; missing-input probes fail nonzero. |
| V02 | `the sections that own the brand-task prohibition never affirm a wait`   | External template authoring           | Moved unchanged with V01, including both prohibition sections and the negative-context parser. Retained, unavailable without real input.                                                             |
| V03 | `SKILL.md tells the pass to self-check with the flag this CLI accepts`   | External template authoring           | Moved unchanged with V01, still parsing every documented `brand-check.mjs` invocation through the real `parseBrandCheckArgs`. Retained, unavailable without real input.                                |
| V04 | `the build side resolves the template's shipped app-env`                 | Application fixture/runtime assertion | Repaired as `the build side resolves a controlled app-env fixture` in `check-auth-invariant.test.mjs`: temp root ships `.grok/app-env.json` with `VITE_AUTH_ENABLED: "false"`; false-from-file, explicit-true override, and absent/malformed no-op assertions all pass in the targeted run. |
| V05 | `platform chrome overwrites share-card metas and always sets og:title`   | Application fixture/runtime assertion | Repaired in `grok-pwa-head.test.mjs` with an empty temp `cwd` and explicit `site: {}`; targeted run passes.                                                                                            |
| V06 | `published grok.me slug is still a title fallback`                       | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with an explicit empty `site` and isolated `cwd`; slug fallback still asserted and passes.                                                                      |
| V07 | `emits og:image for a public host and prefers a custom card`             | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs`: placeholder leg uses a cardless temp root; custom leg creates the real `public/og.jpg` in its temp root. Both assertions pass.                                  |
| V08 | `placeholder og:image appends site.color when it is 6-digit hex`         | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with a cardless temp root and explicit color cases; valid/invalid color and custom-card assertions pass.                                                        |
| V09 | `document title entities are not double-escaped on og:title`             | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with explicit empty `site`/`cwd` removing incidental site-title precedence; escaping assertion passes.                                                          |
| V10 | `injects into documents with no head element`                            | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with isolated `cwd`/`site`; missing-head insertion and app-title assertions pass.                                                                               |
| V11 | `streaming injector matches </HEAD> case-insensitively`                  | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with isolated injector context; case-insensitive `</HEAD>` assertion passes.                                                                                    |
| V12 | `uses the app name in the injected title tag`                            | Application fixture/runtime assertion | Repaired in `grok-pwa-plugin.test.mjs` with no competing site title; app-name fallback passes.                                                                                                       |
| V13 | `the template ships auth off`                                            | Application fixture/runtime assertion | Renamed to `the controlled auth-off fixture supplies the flag` in `with-app-env.test.mjs`; real `readAppEnv` reads the fixture's `.grok/app-env.json` and passes.                                       |
| V14 | `the wrapped command runs with the app env applied`                      | Application fixture/runtime assertion | Repaired in `with-app-env.test.mjs`: a byte-identical copy of `with-app-env.mjs` runs from the fixture's `scripts/` beside its `.grok/app-env.json` with `VITE_AUTH_ENABLED` removed from the inherited child env; child sees `false`. Passes. |
| V15 | `the CLI still runs when invoked through a symlinked path`               | Application fixture/runtime assertion | Repaired in `with-app-env.test.mjs`: the symlink targets the fixture's `scripts/` directory so real-path root resolution finds its file. Passes.                                                       |
| V16 | `every hand-over the og skill prints is one this script accepts`         | External template authoring           | Moved unchanged to `scripts/template-authoring/contract.mjs`, including the `references/` traversal, the three-handover minimum, and real `parseWriteAtomicArgs`/`stagingError` public-staging rejection. Retained, unavailable without real input. |

## Finding closure register

| Finding         | Status | Required evidence                                                                                                      |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| F1              | OPEN   | Verified M delivery, identity/lifecycle/search/UI behavior and corresponding contracts/checks.                         |
| F2/F3           | CLOSED | Comment corrections accepted by Sol's static review (`ACCEPTED_FOR_METADATA_FINALIZATION`); the containing commit supplies closure. |
| F4-F9           | CLOSED | 47 original owner/name inventory entries accepted by Sol's static review; the containing commit supplies closure.      |
| F10             | OPEN   | Existing valid-prefix/no-response contract documented and accepted in C2a; focused runtime regression and closure pending C2b. |
| K1              | OPEN   | Real imported-module restoration regression, narrow fix and normal-path control.                                       |
| K2              | OPEN   | Browser raw-target path, restoration, thirteen exact-input/numeric cases. Training/live convention limitation remains. |
| R-M08-S/R-M08-A | CLOSED | Fifteen supplementary script exports and the public JwksFetch contract accepted by Sol's static review; the containing commit supplies closure. |

The 21 EGM document actions are resolved as text. That status closes none of the implementation rows above. Record closure commit, exact command/evidence and remaining limitations per row when proved.

## Controlled climb and retained real coverage

| Evidence                                                      | Current status                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Required controlled snapshot aggregation                      | Pending rewrite and run. Every prescribed assertion remains required.                |
| Required controlled generation dispatch/JSONL fixture         | Pending rewrite and run. No real game/model load may escape test doubles.            |
| Original eight-game identical-S snapshot regression           | Deferred, not run, not passed. Preserve in separately mapped real-regression script. |
| Original one-game real S generated-policy legality regression | Deferred, not run, not passed. No equivalence claim from controlled fixtures.        |
| Actual M identity and thirteen-case numeric parity            | Separately required; pending. Controlled results cannot satisfy these gates.         |

## Phase and implementation progress

| Change | Status                                                                    | Evidence                                                                            |
| ------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| C0     | Complete at documentation commit 8e23a787771fd74a723a52aa8941aaa38de9adf8 | Dated command exits, immutable control hashes and resolved design above.            |
| C1     | Implemented and verified in this change; doc corrections and static review accepted | 106/106 targeted cases; Sol `npm test` 191/191 + 39/39, `typecheck` exit 0; both authoring probes fail closed. Evidence above. |
| C2     | C2a implemented and verified in this change; C2b and remainder pending    | Sol static gates passed (`ACCEPTED_FOR_METADATA_FINALIZATION`); the containing commit supplies C2a closure; controlled Python checks, environment and restoration repair follow. |
| C3     | Pending                                                                   | Coupled engine/protocol/UI migration and all owning contracts.                      |
| C4     | Pending                                                                   | Frozen browser/parity harness, completed receipts and native process monitoring.    |
| C5     | Not started                                                               | Exact green candidate, committed check/parity, preflight and one bounded cohort.    |

No browser phase, numeric comparison or strength cohort has run. Resource peaks, cleanup proof, W/D/L, pair counts and statistical result are absent until actual evidence exists. An agent session or a passing subset is not a phase completion receipt.

## Final code-to-doc comparison and rollback

Before each green commit, inspect the complete diff and compare affected READMEs, usage/API/configuration docs, this ledger and the canonical checklist against actual behavior, interfaces, invariants, side effects, paths and commands. Keep source/test files below 400 lines. Record why verify-only docs need no edit when they already match.

Use a reviewed inverse commit for scoped rollback. Preserve unrelated work, control assets and raw evidence. No checkout-wide reset, publication, deployed rollback or bot action is authorized here.

The final handoff requires the exact candidate/closure commits, all V01-V16 dispositions, required exits, numeric tolerances/results, native identity and UI/fault evidence, phase completion refs, raw games/events, resource/cleanup proof, paired result/limitations, unchanged assets and the final code-to-doc comparison. Retained real S coverage must remain disclosed as deferred unless separately authorized and actually run.
