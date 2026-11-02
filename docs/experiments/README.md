# Tinyaz local software verification

The [canonical design](../superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md) owns requirements, the file map, protocol and experiment limits. The [implementation evidence ledger](./tinyaz-software-plan.md) records actual commands, finding status and the bounded attempt. It is not an alternative requirements document.

The first milestone uses existing M weights. Browser delivery, same-weight software behavior, learning changes and measured ratings remain separate. Historical Stockfish and Lichess instruments remain in their existing files and are not replaced by this ledger.

No comparison has run. Runtime artifacts will remain in the explicit external evaluation workspace with hashes and paths recorded here. Do not put generated weights, datasets, credentials or inferred ratings in this directory.

The C4a1 browser-evaluation evidence libraries under [train/scripts/browser_eval/](../../train/scripts/browser_eval/README.md) on `feat/tinyaz-browser-evidence` are accepted at the pure-JS library boundary: Sol's prepared-5 `test:browser-harness` gate passed 138/138 cases across the ten suites with zero fail/skip/cancel and no warnings, `git diff --check` exited 0, both independent Sol 6.1-Max reviewers returned ACCEPTABLE, and the final verdict is ACCEPTED_SOURCE_FOR_FINAL_DOCUMENTATION_METADATA. Three earlier failed reviews (55/86, 118/128, 133/136) and the qualified conservative stream-reservation assessment remain preserved in the ledger. Native cleanup/identity bindings, capture/browser wiring, numeric parity, preflight, the bounded cohort and any strength result remain pending C4a2/C4b/C5.

Update this index and the ledger with meaningful implementation changes. Compare final code and owning contracts before each green commit and final handoff.
