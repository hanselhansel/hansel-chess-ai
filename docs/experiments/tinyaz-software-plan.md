# Tinyaz software implementation and evidence ledger

- **Date:** 2026-11-02
- **State:** C0 documentation baseline committed at `8e23a787771fd74a723a52aa8941aaa38de9adf8`; fresh baseline captured. C1 is implemented and verified in this change on `fix/tinyaz-test-fixtures` (verification base `0f5c5f72e1bbd0d760f7176a5308a205715aba5b`): Sol's full `npm test` passed 191/191 application script cases then 39/39 core cases and `npm run typecheck` exited 0 on that snapshot. The coordinator accepted the executable change, both documentation corrections and the static doc review, with the eight frozen executable hashes verified unchanged. The four upstream authoring checks remain unavailable without real `GROK_TEMPLATE_ROOT` input.
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
| F2/F3           | OPEN   | Comment-only changes compared with actual migration/database behavior.                                                 |
| F4-F9           | OPEN   | Source-backed owning export inventories, links and roles.                                                              |
| F10             | OPEN   | Current valid-prefix/no-response contract and focused regression, unchanged UCI implementation.                        |
| K1              | OPEN   | Real imported-module restoration regression, narrow fix and normal-path control.                                       |
| K2              | OPEN   | Browser raw-target path, restoration, thirteen exact-input/numeric cases. Training/live convention limitation remains. |
| R-M08-S/R-M08-A | OPEN   | Fifteen supplementary script exports and public JwksFetch contract, without runtime refactoring.                       |

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
| C2     | Pending                                                                   | Comments/inventories, controlled Python checks, environment and restoration repair. |
| C3     | Pending                                                                   | Coupled engine/protocol/UI migration and all owning contracts.                      |
| C4     | Pending                                                                   | Frozen browser/parity harness, completed receipts and native process monitoring.    |
| C5     | Not started                                                               | Exact green candidate, committed check/parity, preflight and one bounded cohort.    |

No browser phase, numeric comparison or strength cohort has run. Resource peaks, cleanup proof, W/D/L, pair counts and statistical result are absent until actual evidence exists. An agent session or a passing subset is not a phase completion receipt.

## Final code-to-doc comparison and rollback

Before each green commit, inspect the complete diff and compare affected READMEs, usage/API/configuration docs, this ledger and the canonical checklist against actual behavior, interfaces, invariants, side effects, paths and commands. Keep source/test files below 400 lines. Record why verify-only docs need no edit when they already match.

Use a reviewed inverse commit for scoped rollback. Preserve unrelated work, control assets and raw evidence. No checkout-wide reset, publication, deployed rollback or bot action is authorized here.

The final handoff requires the exact candidate/closure commits, all V01-V16 dispositions, required exits, numeric tolerances/results, native identity and UI/fault evidence, phase completion refs, raw games/events, resource/cleanup proof, paired result/limitations, unchanged assets and the final code-to-doc comparison. Retained real S coverage must remain disclosed as deferred unless separately authorized and actually run.
