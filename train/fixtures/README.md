# Evaluation fixtures

Machine-readable evaluation inputs for the tinyaz verification plan, not
application endpoints. Parity, development and control fixtures stay separate
from the locked final-opening fixture in `browser-openings.json`.

## browser-parity.json

Early shared fixture consumed now by `train/scripts/test_encode.py` (Python
input/policy checks) and later by the C4 browser/Python numeric-parity gate.
Schema: `{"schemaVersion": 1, "cases": [...]}`. Each case has exactly:

- `id`: stable case identifier.
- `initialFen`: the complete initial FEN. The standard initial position is
  stored in full; there is no magic start alias.
- `movesUci`: ordered UCI moves replayed on a live board from `initialFen`.
  Encoders never rebuild the position from a final normalized FEN, so the raw
  en-passant target set by actual move history is preserved.
- `expectedRawEpTarget`: the raw en-passant target square in algebraic form,
  or `null`. This is the retained raw target, not the legal-convention FEN
  field (which omits targets with no legal capture).

## Conventions

- Board input: 19 planes of 64 squares, Float32, `plane * 64 + square`.
  Side-to-move canonical: Black-to-move positions rank-flip every square with
  `i ^ 56` (files stay put). Plane 16 carries the raw en-passant target bit.
- Policy targets: `plane * 64 + canonicalFrom` over 73 planes. Queen
  promotions use ordinary movement planes; underpromotions use the last nine.
- Python reference: `tinyaz.encode.encode_board`, `tinyaz.policy.move_index`.
- Numeric parity (C4, not this fixture's check): same verified M bytes, exact
  input planes and legal policy indices on all thirteen cases, and every
  finite logit/value within `1e-4 + 1e-4 * abs(python)` at CPU Float32, one
  thread. Passing fixture checks here are not parity or K2 closure.

Final-opening prefixes live in `browser-openings.json` as a separate locked
control set. Never tune on the final set.

## browser-protocol.json

The closed protocol binds existing conventions, literal limits and every
required check group. It fixes five fresh requests per arm, the disjoint
A/A control FEN, and the declared comparison size. The runtime validator
rejects missing checks, changed limits and unknown fields. These are method
inputs, not evidence that a check or game passed.

## browser-openings.json

The ordered entries preserve the twenty Runtime-section-6 opening prefixes,
IDs p01 through p20, full initial FENs and exact six-ply UCI histories.
Rules-only validation requires distinct nonterminal White-to-move end
positions. Compare uses both color-swapped games in each pair before the
next pair. Preflight consumes its separate A/A fixture and no final opening.
No browser, model or strength game runs while validating these JSON inputs.

## browser-protocol-v3.json (Task20, 2026-11-11)

The new data-only protocol keeps experimental schemaVersion2 and the exact
V2 conventions, limits, required checks, five requests per arm, A/A FEN and
20-pair/40-game schedule. Only evaluationPolicy changes to the exact closed
V3 literal with ordered softPhases `["preflight","compare"]`. Selection is
explicit by exact path/policy/layout, never fixture inventory or schema2 alone.
V1/V2 fixture bytes remain unchanged. The file is a method input, not proof
of readiness, monitoring coverage, an executed phase or a strength result.
