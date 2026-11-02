# Template authoring contract

## Overview

`contract.mjs` holds the four checks that pin the Grok og/brand **authoring
documents** to this checkout's real parsers and marker constants. The prompts
in those documents are the only enforcement of the brand-task contract, so
they are tested against the same code the task will run.

This app does not ship those documents, so the file's basename deliberately
does not match the application `*.test.mjs` discovery glob and `npm test`
never runs it. It is an upstream authoring contract with its own explicit
command:

```sh
GROK_TEMPLATE_ROOT=/path/to/template-checkout npm run test:template-authoring
```

## Required input

`GROK_TEMPLATE_ROOT` must name a readable checkout of the authoring template
containing the real documents:

- `AGENTS.md`
- `.grok/skills/og/SKILL.md`
- `.grok/skills/og/references/`, the actual recipe documents (nonempty)

Missing or empty root input, invalid paths or types, absent required
documents, and a missing or empty references directory fail preflight with a
`[template-authoring]` diagnostic. An unreadable document fails nonzero when
its contents are read. These failures leave the external check unavailable,
never passed, skipped, or replaced by a fallback template.

## The four checks

Each check keeps the assertions it had when it lived in the application
suite; only the document reads moved to `GROK_TEMPLATE_ROOT`.

1. `SKILL.md and AGENTS.md name the marker path and bound this script uses`:
   both documents name `/workspace/` plus this checkout's `OG_PENDING_REL_PATH`
   and the staleness bound derived from `OG_PENDING_MAX_AGE_MS`.
2. `the sections that own the brand-task prohibition never affirm a wait`:
   the SKILL.md "Brand-asset pass" section and AGENTS.md execution-loop step 6
   are extracted by the same section parser, and every `wait_tasks` /
   `get_task_output` mention must sit in an explicit negation context.
3. `SKILL.md tells the pass to self-check with the flag this CLI accepts`:
   every `node scripts/brand-check.mjs` invocation printed in the skill parses
   through this checkout's `parseBrandCheckArgs` with no error.
4. `every hand-over the og skill prints is one this script accepts`: every
   `node scripts/write-atomic.mjs` invocation across `SKILL.md` and all of
   `references/` (at least three: `og.jpg`, `x-banner.jpg`, `site.json`) parses
   through this checkout's `parseWriteAtomicArgs` and is not rejected by
   `stagingError` for staging inside `public/`.

`OG_PENDING_REL_PATH`, `OG_PENDING_MAX_AGE_MS`, `parseBrandCheckArgs`,
`parseWriteAtomicArgs`, and `stagingError` are imported from
`../brand-check.mjs` and `../write-atomic.mjs` in this checkout; they are not
copied. An authoring document that drifts from these parsers or constants
fails the relevant check against the real template.

## Why it is separate

The application gate must pass in this checkout alone. These four checks
need real upstream documents this repo does not carry, so they live behind an
explicit command and input variable rather than being weakened into a
filesystem fixture or reported as passing.
