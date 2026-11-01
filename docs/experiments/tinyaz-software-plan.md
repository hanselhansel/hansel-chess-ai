# Tinyaz software implementation and evidence ledger

- **Date:** 2026-11-02
- **State:** C0 documentation and fresh baseline captured. Functional implementation has not started.
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

## V01-V16 ownership and current results

| ID  | Recorded failing assertion                                               | Owner                                 | Current disposition                                                                                                   |
| --- | ------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| V01 | `SKILL.md and AGENTS.md name the marker path and bound this script uses` | External template authoring           | Baseline failure. C1 must retain it in the explicit authoring command; missing real input is unavailable, not passed. |
| V02 | `the sections that own the brand-task prohibition never affirm a wait`   | External template authoring           | Baseline failure. C1 must retain it in the explicit authoring command; missing real input is unavailable, not passed. |
| V03 | `SKILL.md tells the pass to self-check with the flag this CLI accepts`   | External template authoring           | Baseline failure. C1 must retain it in the explicit authoring command; missing real input is unavailable, not passed. |
| V04 | `the build side resolves the template's shipped app-env`                 | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V05 | `platform chrome overwrites share-card metas and always sets og:title`   | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V06 | `published grok.me slug is still a title fallback`                       | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V07 | `emits og:image for a public host and prefers a custom card`             | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V08 | `placeholder og:image appends site.color when it is 6-digit hex`         | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V09 | `document title entities are not double-escaped on og:title`             | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V10 | `injects into documents with no head element`                            | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V11 | `streaming injector matches </HEAD> case-insensitively`                  | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V12 | `uses the app name in the injected title tag`                            | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V13 | `the template ships auth off`                                            | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V14 | `the wrapped command runs with the app env applied`                      | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V15 | `the CLI still runs when invoked through a symlinked path`               | Application fixture/runtime assertion | Baseline failure. C1 repair and actual passing evidence pending.                                                      |
| V16 | `every hand-over the og skill prints is one this script accepts`         | External template authoring           | Baseline failure. C1 must retain it in the explicit authoring command; missing real input is unavailable, not passed. |

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

| Change | Status                                             | Evidence                                                                            |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| C0     | Baseline captured; documentation baseline prepared | Dated command exits, immutable control hashes and resolved design above.            |
| C1     | Pending Devin implementation                       | Portable fixtures, authoring ownership and required test discovery.                 |
| C2     | Pending                                            | Comments/inventories, controlled Python checks, environment and restoration repair. |
| C3     | Pending                                            | Coupled engine/protocol/UI migration and all owning contracts.                      |
| C4     | Pending                                            | Frozen browser/parity harness, completed receipts and native process monitoring.    |
| C5     | Not started                                        | Exact green candidate, committed check/parity, preflight and one bounded cohort.    |

No browser phase, numeric comparison or strength cohort has run. Resource peaks, cleanup proof, W/D/L, pair counts and statistical result are absent until actual evidence exists. An agent session or a passing subset is not a phase completion receipt.

## Final code-to-doc comparison and rollback

Before each green commit, inspect the complete diff and compare affected READMEs, usage/API/configuration docs, this ledger and the canonical checklist against actual behavior, interfaces, invariants, side effects, paths and commands. Keep source/test files below 400 lines. Record why verify-only docs need no edit when they already match.

Use a reviewed inverse commit for scoped rollback. Preserve unrelated work, control assets and raw evidence. No checkout-wide reset, publication, deployed rollback or bot action is authorized here.

The final handoff requires the exact candidate/closure commits, all V01-V16 dispositions, required exits, numeric tolerances/results, native identity and UI/fault evidence, phase completion refs, raw games/events, resource/cleanup proof, paired result/limitations, unchanged assets and the final code-to-doc comparison. Retained real S coverage must remain disclosed as deferred unless separately authorized and actually run.
