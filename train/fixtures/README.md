# Evaluation fixtures

Machine-readable shared inputs for the tinyaz verification plan. These are
evaluation fixtures, not application endpoints, and not the final-opening set.

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

Final-opening game fixtures live in `browser-openings.json` (planned) and are
a separate control set; never tune on the final set.
