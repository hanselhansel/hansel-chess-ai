# Browser evaluation harness libraries

Pure-JavaScript owners for the canonical bytes, record envelopes, bounded
artifact IO, sole-writer recording, prerequisite admission, supervisor IPC
validation and paired-cohort statistics used by the verified-M browser
evaluation. These modules contain no browser, native, model, child-process,
network or application imports. Unit evidence here is library evidence only;
it is never a completed check/parity/preflight/compare phase and never a
strength result.

## Module inventory

| Module | Exports | Boundary |
| ------ | ------- | -------- |
| [canonical-json.mjs](./canonical-json.mjs) | `canonicalBytes`, `parseCanonicalBytes`, `sha256Bytes` | One canonical byte codec and hash utility. No IO. |
| [record-schema.mjs](./record-schema.mjs) | `REQUIRED_CHECK_IDS`, `REQUIRED_PARENT_PHASES`, `PROTOCOL_IDS`, `MODEL_IDENTITY`, `BASELINE_COMMIT`, `FIXED_LIMITS`, `assertRecord`, `assertArtifactRef`, `assertProcessIdentity`, `assertCommonIdentity`, `assertBackendIdentity` | Single closed-envelope schema/constant owner (re-exports its private helper owners). |
| [schema-primitives.mjs](./schema-primitives.mjs) | private helpers only | Strict primitive/closed-shape/path/ref/identity checks and bounded schema failures. No schema/constants back-import. |
| [schema-constants.mjs](./schema-constants.mjs) | private helpers only | Frozen pin/check/phase/limit/protocol declarations; storage only, re-exported by record-schema.mjs. |
| [identity-schema.mjs](./identity-schema.mjs) | private helpers only | Executable/Python/backend/environment/CommonIdentity validation over primitives/constants. |
| [artifact-files.mjs](./artifact-files.mjs) | private helpers only | Confined paths, durable atomic file primitives, bounded streaming artifact hashing/inventory. |
| [record-finalization.mjs](./record-finalization.mjs) | private helpers only | Pure canonical final/check-evidence/completion construction and eligibility helpers. |
| [protocol-values.mjs](./protocol-values.mjs) | private helpers only | Stateless closed driver/collector/native field validators and shared predicates/constants. |
| [driver-protocol.mjs](./driver-protocol.mjs) | private helpers only | Driver message transitions over the supervisor-owned run state/ID authority. |
| [collector-protocol.mjs](./collector-protocol.mjs) | private helpers only | Collector/teardown message transitions over the same supervisor-owned authority. |
| [artifact-store.mjs](./artifact-store.mjs) | `createArtifactStore`, `inspectArtifactRef`, `phaseArtifactRefs` | Confined async artifact IO under one workspace root. |
| [records.mjs](./records.mjs) | `writeWorkspaceOnce`, `createPhaseRecorder` | Sole supervisor writer/state machine; delegates bytes/schema/IO. |
| [receipt-files.mjs](./receipt-files.mjs) | private helpers only | Confined stable receipt-record reads, hash/parse binding and retained-input ref verification for prerequisites.mjs only. |
| [prerequisites.mjs](./prerequisites.mjs) | `verifyReceipt`, `admitPhase`, `verifyInternalSelfTest`, `inspectIncompletePhase` | Receipt verification and admission; never writes. |
| [supervisor-protocol.mjs](./supervisor-protocol.mjs) | `IPC_LIMITS`, `TIMING_LIMITS`, `RESOURCE_LIMITS`, `createProtocolValidator` | One run-global duplex validator. No timers/processes. |
| [stats.mjs](./stats.mjs) | `signProbability`, `clopperPearson95`, `summarizePairs` | Exact paired sign/CP95 arithmetic and eligibility. |
| [test-fixtures.mjs](./test-fixtures.mjs) | fixture builders only | TEST-ONLY; never imported by production modules and excluded from the functional-runtime input union. |

## canonical-json.mjs

- `canonicalBytes(value): Buffer` emits UTF-8 without BOM, compact JSON,
  recursively ASCII-sorted object keys, preserved array order, and exactly one
  final LF. Integer-like keys are compared as ASCII text, so `"10"` precedes
  `"2"`; `JSON.stringify` on a pre-sorted object would silently reorder them
  and is not used for emission.
- It rejects `undefined` anywhere, non-finite numbers, sparse arrays, bigint,
  functions/symbols, custom `toJSON` substitutions, non-plain objects and
  cycles before producing bytes.
- `parseCanonicalBytes(bytes): JsonValue` decodes strict UTF-8, requires
  exactly one trailing LF, parses with duplicate-key rejection, then requires
  byte equality with `canonicalBytes` reserialization. This rejects BOM,
  CRLF, extra LF, surrounding whitespace, key-order differences, duplicate
  keys at any depth and noncanonical number spellings.
- `sha256Bytes(bytes): string` returns lowercase 64-hex SHA-256 of the exact
  bytes, including any final LF. PGN/binary artifacts hash their exact stored
  bytes. No digest is ever hashed into itself.
- Returned buffers/objects are fresh copies; callers may mutate inputs after
  the call without changing results.

## record-schema.mjs

Frozen exports (all deeply frozen, never mutated):

- `BASELINE_COMMIT`: `bb76439ea7bb4ae84bf15fe1276d75dc336d3cec`.
- `REQUIRED_CHECK_IDS`: exact per-phase sets, `check` (verified-delivery,
  real-worker, retained-main-recovery, request-lifecycle,
  explicit-failure-actions, completed-display, workbench-layout, cleanup),
  `parity` (frozen-python-imports, input-planes-13, policy-mapping-13,
  numeric-tolerance-13, cleanup), `preflight` (cold-readiness,
  ten-fresh-requests, aa-color-pair, watchdog-selftest, timing-estimate,
  cleanup), `compare` (locked-suite-complete, identity-every-turn,
  legal-outcomes, raw-record-accounting, paired-analysis, cleanup) and
  `watchdog-selftest` (injected-heartbeat-timeout, zero-scored-games,
  surviving-child-cleanup, accounting-valid).
- `REQUIRED_PARENT_PHASES`: `check: []`, `parity: [check]`,
  `preflight: [check, parity]`, `compare: [check, parity, preflight]`,
  `watchdog-selftest: []` (its owner is bound through `manifest.owner`,
  never through prerequisites).
- `PROTOCOL_IDS`: `inputId` `baseline-fen-candidate-history-raw-ep-v1`,
  `ruleId` `chessjs-checkmate-first-draws-v1`, `visitId`
  `completed-root64-v1`, `analysisId` `paired-sign-cp95-v1`, and `reference`
  `{device:"cpu", dtype:"float32", inferenceMode:true, intraOpThreads:1,
  interOpThreads:1}`.
- `MODEL_IDENTITY`: `{format:"TAZS", packedVersion:1, source:1,
  parameterCount:2426706, byteLength:9706840,
  sha256:"b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee"}`.
- `FIXED_LIMITS`: `{ipc:{frameBytes:1048576, driverBytes:262144,
  chunkBytes:65536}, timing:{readinessMs:30000, commandMs:90000,
  heartbeatMs:500, heartbeatGapMs:2000, sampleMs:250, sampleGapMs:500,
  cleanupMs:5000, phaseMs:{check:600000, parity:600000, preflight:600000,
  compare:3600000}}, resources:{rssBytes:4294967296,
  workspaceBytes:268435456, ordinaryBytes:266338304,
  finalReserveBytes:2097152}, visits:64, cohort:{pairs:20, games:40}}`.

Validators throw `Error` with a stable bounded `code`; there is no
success-shaped failure result.

- `assertRecord(kind, value)` validates the closed version-1 envelopes:
  `workspace` `{schemaVersion:1, workspaceId, commonIdentity}`; `manifest`
  `{schemaVersion:1, workspaceId, runId, phase, commonIdentitySha256, inputs,
  limits, requiredCheckIds, prerequisites, owner}` with `limits` exactly
  `FIXED_LIMITS`, `requiredCheckIds` exactly that phase's set once,
  prerequisites exactly `REQUIRED_PARENT_PHASES[phase]` phases, `owner` null
  for top-level or `{phase:"preflight", runId, supervisor}` for
  `watchdog-selftest`; `running` `{schemaVersion:1, workspaceId, runId,
  phase, commonIdentitySha256, supervisor, startedAtUtc}`; `event`
  `{schemaVersion:1, workspaceId, runId, phase, seq, kind, payload}`; `final`
  (canonical `PhaseFinal`) with the phase's exact check set once each and
  passed-status coherence (exit 0, every check passed, zero unplanned faults,
  cleanup verified/accounting-valid/no survivors/no listeners/nonnull
  expectedFinalizer, scope matching the phase); `completion` (canonical
  `PhaseCompletion`) with path-sorted unique artifacts, top-level-phase
  prerequisite refs and `expectedSelfTest` nonnull only for `preflight`.
- `assertArtifactRef(value)` requires `{path, byteLength:Nat, sha256:H}` with
  a workspace-relative POSIX path: no absolute, empty, `.`, `..`, backslash,
  NUL or duplicate-slash components.
- `assertProcessIdentity(value)` requires `{pid, startSec, startUsec}`: pid
  integer `1..2147483647`, `startSec` a canonical `U64` decimal string,
  `startUsec` integer `0..999999`.
- `assertCommonIdentity(value)` validates the closed CommonIdentity:
  `candidate` `{kind:"commit", commit, contentSha256}` or `{kind:"WORKTREE",
  commit:null, contentSha256}`; `baseline` `{commit:BASELINE_COMMIT,
  contentSha256}`; `harness` and `pythonReference` `BundleIdentity`
  `{contentSha256, files:InputDigest[]}` with sorted unique original
  project-relative paths (pythonReference exactly the six
  `train/src/tinyaz/` modules); `fixtures` `{protocol, parity, openings}`
  InputDigests at exactly `train/fixtures/browser-protocol.json`,
  `browser-parity.json`, `browser-openings.json`; `model` exactly
  `MODEL_IDENTITY`; `baselineNormalization` `{requestPath:
  "/weights/tinyaz-s.bin", responseSha256:<MODEL_IDENTITY.sha256>,
  provenance:"controlled-delivery-plus-ready"}`; `conventions` exactly
  `PROTOCOL_IDS`; `environment` the closed Environment below. Validation
  binds structure and identity only; it is not evidence that packages or
  tools were inspected.
- `assertBackendIdentity(value)` validates `BackendIdentity`
  `{backendId:"darwin-arm64-libproc-v1", os, python, helpers, libproc,
  lsof}`: `os` is `OsIdentity` `{platform:"darwin", arch:"arm64", release,
  version, build}`; `python` is `PythonExecutableIdentity`
  (`FileIdentity`/`ExecutableIdentity` plus `{executable, prefix,
  basePrefix}`); `helpers` sorted `InputDigest[]`; `libproc` `{path:
  "/usr/lib/libproc.dylib", abi:{bsdInfoSize:136, taskInfoSize:96}, image}`
  with `image` `{kind:"file", sha256}` or `{kind:"OS_SHARED_CACHE",
  osBuild}`; `lsof` `FileIdentity` with `invocationPath` `/usr/sbin/lsof`.
- Environment fields validated by `assertCommonIdentity`: `node` and
  `chromium` `ExecutableIdentity` (`{invocationPath, realPath, sha256,
  version}`); `python` `PythonEnvironment` `{runtime:
  PythonExecutableIdentity, pipVersion:"25.2", pipFreezeSha256:H,
  distributions:[{name, version, buildSha256, wheelSha256|H|null}],
  imports:[{module, origin, version, sourceSha256}]}` with sorted unique
  distributions (the `torch` distribution's wheelSha256 must be nonnull;
  other entries may be null when no original archive is established) and
  imports exactly `chess` 1.11.2, `numpy` 2.3.5, `torch` 2.10.0, `zstandard`
  0.25.0; `dependencies` `{packageLockSha256:H, packages:[{name, version,
  buildSha256}]}` sorted unique; `launch` `{host:"127.0.0.1", headless:true,
  viewport:{width:1280, height:800}, deviceScaleFactor:1, args:string[],
  securityOptionsSha256:H}`; `os` an `OsIdentity`; `hardware` `{model,
  cpuModel, logicalCpus:positive, physicalMemoryBytes:positiveSafeInteger}`;
  `monitoring` a `BackendIdentity` whose `os`/`python` deep-equal the
  environment `os`/`python.runtime` entries. All identifying strings are
  nonempty and all digests match `^[0-9a-f]{64}$`. Every executable
  `invocationPath`/`realPath`, Python `executable`/`prefix`/`basePrefix`
  and every import `origin` must be an absolute path. The pinned Python
  selection is invocation/executable exactly
  `/Users/hansel/Workspace/github/hanselhansel/hansel-chess-ai/train/.venv/bin/python`,
  `prefix` the project's `train/.venv`, `basePrefix` the actual absolute
  base installation the venv derives from, CPython `3.11.14`;
  the four pinned import/distribution versions must agree with it. The
  rule-06 archive exception is preserved: only `torch` requires a nonnull
  `wheelSha256`, while other distributions keep the unknown-archive null.

## artifact-store.mjs

- `createArtifactStore({workspaceRoot, readFootprint, monotonicNow})`
  returns a store with readonly normalized absolute `root`. `readFootprint`
  and `monotonicNow` are mandatory functions; `readFootprint()` resolves to
  `{observedAtMs, chargedBytes, accountingValid}` for the whole workspace.
  A missing/throwing read, non-finite or negative charge, `accountingValid
  !== true`, or a sample older than 1000 ms rejects the write as unavailable
  accounting; a recorded accounting fault is sticky for that store.
- `writeOnce(path, bytes, lane)`: confined immutable create; fails if the
  target exists or any ancestor is a symlink. Same-directory temp, bounded
  write, file fsync, atomic rename, directory fsync where supported.
- `openArtifact({artifactId, path, mode, lane})` returns a sink with
  `append(bytes)` and `close(): Promise<ArtifactRef>`. `append` writes to the
  destination for `mode:"append"` or to a same-directory temp for
  `mode:"replace"`; `close` flushes/fsyncs, publishes replace streams
  atomically and returns the logical-byte ref. One active sink per path and
  per `artifactId`; a `replace` cannot target an existing finalized file.
  The sink preserves its first terminal append/write/zero-progress/close/
  reconcile/hash failure: every later close or retry rejects with that
  retained error instead of resolving `null` or a success-shaped ref, and
  the owned handle is always drained. A later `append` on a store-failed
  sink may instead surface the store's sticky `STORE_IO`, because the
  store-health check runs before the per-stream check; both reject with
  no fabricated ref. A required durable write/sync/rename failure is a
  sticky store IO fault; path/setup rejections such as `ENOTDIR` stay
  caller-correctable and do not poison the store.
- `deleteEphemeral(path)` unlinks a confined regular file.
- `sealPhase(phaseDirectory)` permanently rejects further writes under that
  directory and rejects while any path under it still has an active sink.
- `lane` is `"ordinary"` or `"final"` and is chosen only by records.mjs.
  Admission sums three distinct quantities: the latest accepted
  whole-workspace footprint, serialized pending reservations (only
  genuinely uncommitted in-flight writes), and committed-but-unobserved
  growth. Ordinary writes require `charged + unobserved + pending +
  size <= 266338304` (254 MiB); final-lane writes require `charged +
  unobserved + pending + size <= 268435456` (256 MiB) and cumulative
  final-lane bytes `<= 2097152` (2 MiB) across the store's lifetime.
  That sum is a conservative upper bound used only for admission — it
  is never reported as the measured footprint itself.
- When a chunk write succeeds, only its own reservation moves from
  pending into a commit-bound unobserved delta before the append is
  acknowledged; other streams' in-flight reservations stay in pending.
  A later fresh whole scan already counts the active append destination
  or replace temp bytes, so the covered delta retires instead of
  double-counting. A `replace` stream still covers the old+temp
  coexistence peak while it writes. A post-write observation over
  ceiling is recorded as actual overrun and invalidates later
  compliance, never rewritten.
- The `observedAtMs` a provider reports is the conservative start boundary
  of its whole-scan, not the finish: a scan can only prove bytes committed
  strictly before its start. The store keeps each committed write as an
  individual unobserved delta until a sample whose `observedAtMs` is
  strictly later than that delta's commit boundary arrives; a sample that
  began before or at the commit boundary cannot retire the bytes, so
  delayed samples never undercount and covered deltas never double-count.
  Accepted scan starts are nondecreasing: a still-fresh observation older
  than the greatest accepted start is rejected as sticky
  `STORE_ACCOUNTING` before its charge is read or any delta retires, so
  an out-of-order result can never resurrect retired budget. A future
  footprint observer must serialize its walks or suppress obsolete
  results rather than publishing out of order. Unavailable post-write
  accounting or an observed ceiling breach rejects the current write,
  even on the final lane, while preserving the actual bytes and the
  latched fault.
- `inspectArtifactRef({workspaceRoot, ref})` re-reads the confined regular
  file, verifies logical `byteLength` and `sha256`, and returns a fresh
  frozen `ArtifactRef`. `phaseArtifactRefs({workspaceRoot, phaseDirectory})`
  enumerates every retained regular file recursively without following
  links, excluding only `<phaseDirectory>/completion.json`, and returns
  path-sorted refs. Both are read-only and need no footprint provider.

## records.mjs

- `writeWorkspaceOnce({store, workspace})` snapshots and validates the
  workspace record, then writes `workspace.json` once through the store.
- `createPhaseRecorder({store, workspace, manifest, verifyCleanup,
  verifyIdentity})` snapshots both records before any await, validates them,
  requires equal `workspaceId` and requires
  `sha256(canonicalBytes(workspace.commonIdentity))` to equal
  `manifest.commonIdentitySha256`. Both callbacks are mandatory; there is no
  default or fallback.
- Recorder methods and required order: `writeManifest()` writes
  `<phase>/manifest.json` and opens the bounded `events.jsonl` sink before
  any collector/driver startup; `writeRunning(running)` then writes the
  immutable `running.json` before any driver spawn; `appendEvent({kind,
  payload})` assigns the canonical `seq` `0,1,...`; `appendArtifactChunk
  ({recordId, recordSeq, artifactId, path, mode, bytes, last})` accepts
  decoded `bytes <= 64 KiB` with unique `recordId`, strictly increasing
  `recordSeq` and one stable `artifactId`/`path`/`mode` stream until `last`;
  `deleteEphemeral({path, reason})` appends a durable `artifact-deletion`
  event before unlinking; `stopOrdinary()` forbids new driver work and
  ordinary output (post-stop supervisor `fault`/`cleanup`/`resource`/
  `artifact-deletion` events remain admissible on the ordinary events sink);
  `finalize({intent, checks, prerequisites, expectedSelfTest})` performs the
  full close. Before `running.json` exists, `appendEvent` admits only the
  observed supervisor bootstrap evidence (`fault`, `resource`, `cleanup`);
  ordinary `operation`/`delivery`/`response` and artifact work is rejected
  rather than bound to an invented running tuple.
- `finalize` requires a written running record and is single-use: it calls
  `verifyIdentity({workspaceId, runId, phase, expectedCommonIdentity,
  inputs})` (must return a `CommonIdentity` canonically equal to the
  workspace's, else pass is blocked), calls `verifyCleanup({phase, runId,
  supervisor, claimedProof})` (must return a structurally valid
  `CleanupProof`; a throw or malformed proof yields unproven cleanup and can
  never produce `passed`), closes every artifact sink and the events sink,
  resolves each `CheckClaim.evidencePaths` entry to its final `ArtifactRef`
  (rejecting missing paths, out-of-phase paths and
  final/completion self-reference), derives the canonical `cleanup` check
  from the actual proof for top-level phases or all four supervisor-owned
  checks for `watchdog-selftest` (which also requires
  `summary.scoredGames === 0`), builds the `PhaseFinal`/`PhaseCompletion`,
  writes `final.json` then `completion.json` atomically last through the
  `final` lane, and seals the phase. A requested `passed` that fails
  identity, cleanup, check or fault coherence is downgraded to
  `inconclusive`/2 (unproven cleanup/identity) or `failed`/1 (mismatched
  identity or invalid claims); `passed` is never synthesized.
- `FinalIntent` = `{status, exitCode, stopReason, unplannedFaultCount,
  analysisEligible, summary}`; `CheckClaim` = `{id, status, evidencePaths}`.
  For top-level phases the driver supplies every required check id except
  `cleanup`; for `watchdog-selftest` the supervisor derives all four checks
  and claims must be empty.
- Errors are sticky: after a required write, accounting or seal failure the
  recorder rejects further work; nothing can convert preserved incomplete
  evidence into a passed receipt.

## prerequisites.mjs

- `verifyReceipt({workspaceRoot, completionRef, expectedIdentity})`:
  verifies `completionRef` bytes/hash, parses the canonical completion,
  enumerates the phase directory and requires exact sorted inventory
  equality (every retained regular file except only that completion),
  parses/validates `manifest.json`, `running.json` and `final.json`,
  cross-checks workspaceId/runId/phase/commonIdentitySha256/status/exitCode
  consistency, compares the workspace `commonIdentity` to the supplied
  `expectedIdentity` snapshot by canonical bytes, and recursively verifies
  the declared prerequisite closure once per unique ancestor (conflicting
  same-phase receipts, cycles, missing/extra parents or altered bytes
  reject). Returns frozen `VerifiedEvidence` `{workspaceId, runId, phase,
  commonIdentity, completionRef, completion, final, manifest, running,
  closure}`; `closure` is path-sorted `{phase, runId, completionRef}` for
  top-level ancestors. It is evidence, not admission.
- `admitPhase({workspaceRoot, phase, commonIdentity, parents,
  probeIdentity})`: `phase` is one of `check`/`parity`/`preflight`/`compare`;
  `parents` are completion `ArtifactRef`s under the same workspace. Verifies
  each receipt, requires the parent phase set exactly
  `REQUIRED_PARENT_PHASES[phase]`, requires each parent `passed`/exit 0 with
  complete checks and verified cleanup, and requires `probeIdentity` to
  report the parent's `running.supervisor` tuple `gone`. `probeIdentity` is
  mandatory, receives the full identity tuple, and `same-live`, `gone`,
  `unavailable`, a throw or an unknown result fails closed appropriately —
  only `gone` admits. WORKTREE rules: a `WORKTREE` parity may use only a
  completed same-workspace `WORKTREE` check with identical content/common
  identity; committed parity requires a committed check; `preflight` and
  `compare` reject a `WORKTREE` self or any `WORKTREE` ancestor. Returns
  frozen `PrerequisiteAdmission` `{phase, commonIdentitySha256, parents,
  closure}`.
- `verifyInternalSelfTest({workspaceRoot, completionRef, parentRunId,
  parentSupervisor, expectedIdentity, probeIdentity})`: verifies the
  `watchdog-selftest` receipt rooted at `preflight/selftest/`, requires the
  manifest `owner` `{phase:"preflight", runId:parentRunId, supervisor:
  parentSupervisor}`, the exact expected outcome (`inconclusive`, exit 2,
  `HEARTBEAT_TIMEOUT`, `analysisEligible:false`, `unplannedFaultCount:0`,
  `summary.scoredGames===0`, all four checks passed), a verified
  `selftest-workload` cleanup proof whose `expectedFinalizer` is the parent
  supervisor, and `probeIdentity(parentSupervisor)` returning `same-live`.
  This is the only API where the named parent finalizer may remain live.
  Returns frozen `VerifiedSelfTest` `{runId, completionRef, parentRunId,
  parentSupervisor}`.
- `inspectIncompletePhase({workspaceRoot, phaseDirectory, probeIdentity})`
  returns frozen `PhaseDisposition`: `complete` (a completion exists; the
  ref is reported without claiming admission), `in-use` (running without
  completion and `probeIdentity` reports `same-live`), `abandoned`
  (`gone`), or `unproven` (probe `unavailable`/throw or missing running).
  It never writes, signals, upgrades or fabricates a receipt.
- Error codes are stable and bounded: `EVIDENCE_INVALID`,
  `EVIDENCE_MISMATCH`, `EVIDENCE_INCOMPLETE`, `PREREQUISITE_INVALID`,
  `FINALIZER_LIVE`, `PROBE_UNAVAILABLE`, `WORKTREE_REJECTED`,
  `SELFTEST_INVALID`, `DISPOSITION_INVALID`.
- Byte binding: every parsed record is the exact stable bytes the declared
  inventory ref commits to (file identity/size pinned before and after the
  read). Every `manifest.inputs` retained ref — baseline/candidate/harness
  files, `setup` and `model` — must exist under the workspace `inputs/` tree
  with the declared bytes, verified by the streaming stable inspector rather
  than whole-file buffering. Every `final.requiredChecks[].evidence` ref
  must name a path in the phase inventory with the exact declared
  byteLength/sha256. For `preflight`, `completion.expectedSelfTest` must
  point at `preflight/selftest/completion.json`, be a member of the same
  inventory, and verify as a `watchdog-selftest` receipt with the exact
  owner, outcome and scoped cleanup described under
  `verifyInternalSelfTest` (minus the live-parent exception, which applies
  only to that public live API).

## receipt-files.mjs

Private runtime helper imported only by `prerequisites.mjs`; it is a member
of the functional-runtime input union and exposes no public authority.

- `confinedRead(root, rel, name): Promise<Buffer>` requires a confined
  workspace-relative POSIX path (no absolute/`.`,`..`/backslash/NUL/empty or
  trailing components), rejects any symlink component between root and
  target, requires a regular file, reads it, and re-checks size/inode/mtime
  so the returned bytes are exactly the stable bytes an inventory hash
  committed to. `ENOENT` rejects `EVIDENCE_INCOMPLETE`; path/symlink
  problems reject `EVIDENCE_INVALID`; a concurrent change rejects
  `EVIDENCE_MISMATCH`.
- `loadRecord(root, rel, kind, declared?): Promise<{value, ref}>` parses and
  schema-validates the same stable bytes for `kind`
  (`workspace`/`manifest`/`running`/`final`/`completion`), returning the
  value plus its computed `{path, byteLength, sha256}`; when `declared` is
  supplied it must equal that ref exactly or `EVIDENCE_MISMATCH` rejects.
- `verifyInputRefs(root, inputs): Promise<void>` checks each retained ref
  in `inputs.baseline.files`, `inputs.candidate.files`,
  `inputs.harness.files`, `inputs.setup` and `inputs.model` by streaming the
  confined file through the shared stable artifact inspector — never by
  buffering a whole model/input — and requires the declared bytes/hash.
  Missing input rejects `EVIDENCE_INCOMPLETE`; changed or wrong bytes reject
  `EVIDENCE_MISMATCH`.
- All inputs are copied/compared synchronously before any await; no
  caller-owned object is retained across IO.

## supervisor-protocol.mjs

- Re-exports `IPC_LIMITS`, `TIMING_LIMITS`, `RESOURCE_LIMITS` as frozen
  aliases of the `FIXED_LIMITS` members: frame `1048576`, driver message
  `262144`, chunk `65536`; readiness `30000`, command `90000`, heartbeat
  `500`, heartbeat gap `2000`, sample `250`, sample gap `500`, cleanup
  `5000`, phase `600000/600000/600000/3600000`; rss `4294967296`, workspace
  `268435456`, ordinary `266338304`, final reserve `2097152`.
- `createProtocolValidator({runId})` creates the one run-global validator.
  `accept(channel, direction, message, encodedByteLength)` enforces the
  closed `{ipcVersion:1, runId, seq, type, ...}` envelope, `seq` `0,+1` per
  direction per channel, per-channel byte ceilings (`driver` both
  directions `262144`; `collector`/`teardown-collector`/`exec-gate`
  `1048576`), closed variant fields and lifecycle transitions. Channels:
  `driver` (directions `d2s`/`s2d`), `collector` and `teardown-collector`
  (`c2s`/`s2c`), `exec-gate` (`s2c` one-shot). One shared registry prevents
  request/operation/record/artifact ID conflicts across channels. A driver
  `recordSeq` is `0,+1` across its event/artifact requests and is separate
  from envelope `seq` and the canonical event `seq`.
- Driver types `hello`, `heartbeat`, `register`, `begin`, `end`, `event`,
  `artifact`, `finish`, `closed`; supervisor replies `start`, `registered`,
  `begun`, `recorded`, `stop`. No `begin` before `start`, no duplicate live
  operation, no record/use before the matching ack, no `end`/`recorded` ack
  mismatch. An idle `heartbeat` carries `operationId:null`; a `begin` is
  pending until its `begun` ack binds `remainingMs` within the fixed
  readiness/command ceiling for the stored kind, and only that acknowledged
  live operation satisfies `end`. A `begun` ack also requires the still
  open, ordinary-work-eligible driver state: a begin pending across `stop`,
  a run-global fault, `finish` or `closed` can never activate. After
  supervisor `stop` only the graceful `closed` marker remains admissible —
  no `end`, `finish` or ordinary output; `finish` once and never proof of
  success. A `register` request's exact `{kind, rootPid,
  expectedExecutable, listener}` binding is retained immutably and the
  `registered` ack must match it; `expectedExecutable` must be a
  structurally absolute resolved path (the same rule as collector roots),
  never a bare name. An `artifact` stream binds one artifactId to one
  confined relative path at a time; a path can be active on only one
  stream and closed artifactIds stay claimed.
- Collector types: `c2s` `ready` (`stage:"startup"` exactly first, once;
  `stage:"roots-accepted"` binding a pending `own-roots` request),
  `process-samples`, `signal-result`,
  `accounting-fault` (terminal on that stream); `s2c` `own-roots`,
  `sample`, `signal`, `shutdown` (only with no pending update). Sample
  messages must finish `>= start`, keep `samples`+`gone` exactly
  partitioning the requested owned set, report `inspected`/`probes` exactly
  once, use closed native row shapes whose inspection pid matches its
  process identity, and keep discovery PIDs unique. `own-roots` copies its
  roots pending; they enter the shared owned registry — and become
  signalable — only on the exact `roots-accepted` acknowledgement.
- `authorizeSignal`/`authorizeExecGate`/`authorizeTeardownCollector`
  deep-copy their bindings at authorization; later caller mutation cannot
  rebind an acknowledged identity. A sticky run-global ordinary-work fault
  is set by any invalid known-channel traffic or a collector
  `accounting-fault`: it blocks new ordinary driver work and new workload
  roots while preserving proof, owned signals, permitted accounted cleanup
  helpers and the teardown channel. On a still-healthy collector the one
  admitted post-fault root kind is `helper` — the trusted accounted
  cleanup-helper registration, acknowledged and bound like any other root
  set; new `browser`/`driver`/`python`/`fixture` workload stays rejected.
  A `passed` finish can never recover a faulted run. An invalid message
  poisons only its own channel (sticky) and throws `IPC_INVALID`; the
  healthy collector stays usable for cleanup and the global registry is
  preserved. A direct codec failure inside a known channel (a non-JSON
  value reaching a copy boundary) is normalized to the same bounded
  `IPC_INVALID` with poison and global stop; parsed JSON can never carry
  such a value.
- `authorizeSignal({requestId, identity, signal})` reserves a binding that
  exactly one matching `s2c` `signal` consumes.
  `authorizeExecGate({queryId, identity, query})` permits exactly one
  `seq:0` `exec` message on `exec-gate` carrying that `queryId`, full
  identity and query (`{kind:"owned-pids", pids:[...]}` or `{kind:"port",
  port}`). `authorizeTeardownCollector({identity})` permits one
  `teardown-collector` channel whose `ready` must carry that exact
  collector identity and which admits only sample/signal/shutdown traffic —
  proof and teardown continuation only, never new workload or restored
  passage.

## stats.mjs

- `signProbability(m, k)`: integers `0 <= k <= m <= 20`; `min(1,
  2 * sum(C(m,j), j=0..min(k,m-k)) / 2^m)`; `signProbability(0,0)` is 1.
  References: `(5,5)=0.0625`, `(6,6)=0.03125`,
  `(20,15)=0.04138946533203125`, `(20,10)=1`.
- `clopperPearson95(m, k)` returns `{low, high}`: equal-tail exact interval
  by binomial-tail inversion with 60 bisection steps per endpoint; `m=0`
  gives `{0,1}`, all-win `{0.025^(1/m), 1}`, all-loss `{0, 1-0.025^(1/m)}`.
- `summarizePairs(pairs, eligibility)` takes a `pairs` array of closed
  plain objects `{pairNumber, openingId, games}` — own keys exactly, no
  inherited or unrelated keys — where `pairNumber` is the ordered prefix
  `1..20`, `openingId` is a nonempty string unique across the input
  (duplicates reject), and `games` is the recorded prefix of at most 2
  closed `{gameNumber, candidateColor, result}` objects. `result` is one
  of the PGN literals `"1-0"`, `"0-1"`, `"1/2-1/2"` or `"*"` (recorded
  but incomplete, worth no points); candidate points decode the result
  through the declared `candidateColor` — odd pairs give the candidate
  White in game 1 and Black in game 2, even pairs the opposite. Only the
  single final pair may be partial (0-2 recorded games); a partial pair
  anywhere else rejects. `eligibility` is the closed
  `{unplannedFaultCount, stoppedEarly, cleanupVerified}` record under the
  same own-key rule.
- The returned frozen `PairSummary` is exactly `{recordedGames,
  completedGames, completedPairs, gameWdl:{wins, draws, losses,
  incomplete}, pairScores:[{pairNumber, openingId, completedGames,
  candidatePoints, baselinePoints, classification}],
  advantageousPairs, disadvantageousPairs, tiedPairs, nonTiedPairs,
  conditionalEstimate, pValue, interval95,
  pairedScoreDifference:{completedPairCount, totalPointsDifference,
  meanPerPair}, analysisEligible, classification}`. `recorded*` counts
  only actually recorded games; unplayed games are never invented, and
  `"*"` lands in `incomplete`. Per-pair `classification` is
  `advantageous`/`disadvantageous`/`tied` on candidate-versus-baseline
  points, or `incomplete` for a partial pair. `pairedScoreDifference`
  sums complete pairs only — a partial pair contributes nothing — with
  `meanPerPair` `null` when no pair is complete.
- Only 20 complete pairs / 40 complete games with zero faults, no early
  stop and verified cleanup are analysis-eligible; then `m` non-tied,
  `k` advantageous, `p <= 0.05` with `k > m/2` yields
  `advantage_signal_on_locked_suite`, `k < m/2`
  `regression_signal_on_locked_suite`, else `no_detectable_advantage`.
  Ineligible summaries keep raw counts with `null` inferential fields
  and `inconclusive`; a complete all-tied cohort has `p=1`, `null`
  estimate and `[0,1]`. No Elo, equivalence or population claims.

## test-fixtures.mjs (TEST-ONLY)

Shared builders imported only by the `*.test.mjs` suites: a closed
synthetic `CommonIdentity`, canonical record/receipt writers onto temporary
workspaces, controlled `readFootprint`/`monotonicNow`/`verifyCleanup`/
`verifyIdentity`/`probeIdentity` callbacks, and temp-directory helpers. It
performs no process, browser, model or network work, is never imported by
production modules, is never a native/setup authority and is excluded from
the functional-runtime input union. A synthetic fixture pass is never an
actual phase or cleanup pass.

## Test suites

Ten `*.test.mjs` suites, one per behavioral area, all test-only:

| Suite | Ownership |
| ----- | --------- |
| canonical-json.test.mjs | Literal bytes, ordering, duplicate/`__proto__` keys, rejection and digest cases. |
| record-schema.test.mjs | Closed envelopes, exact pins (venv/CPython/imports/hash), array/nullable predicates, coherence. |
| artifact-store.test.mjs | Confinement, lane/pending accounting, unobserved growth, sticky IO/accounting faults, seal drain. |
| records.test.mjs | Sole-writer write order, stream binding, callback degradations, snapshot isolation. |
| records-finalization.test.mjs | Positive check/exit-code output, pre-running bootstrap admittance, finalizing-vs-closed events, cleanup hashes, competing finalizers. |
| prerequisites.test.mjs | Receipt chains, parent sets, probes, WORKTREE policy, dispositions, public-seam caller snapshots. |
| prerequisites-evidence.test.mjs | Retained-input/check-evidence tampering, stable-byte binding, declared-ref snapshot seams, nested selftest, shared ancestors. |
| supervisor-protocol.test.mjs | Ordered dialogues, envelopes, byte ceilings, run-global fault semantics, teardown channel. |
| supervisor-protocol-lifecycle.test.mjs | Idle/begun/end/stop order, late-begun gating, helper-after-fault, absolute-path roots, exact acks, immutable bindings, closed compound shapes. |
| stats.test.mjs | PGN decode, PairSummary counts, exact sign/CP95 references, eligibility suppression. |

## Commands

```sh
npm run test:browser-harness   # node --test 'train/scripts/browser_eval/*.test.mjs'
```

The suites exercise the production libraries with literal independent
expectations, temporary directories and controlled callbacks. These are
unit receipts only: native cleanup/identity bindings, real driver/collector
wiring, phase runs and parity/strength evidence remain pending later
authorized packets.

Verification status (Sol review-5 on frozen prepared-5, 2026-11-02):
`npm run test:browser-harness` exited 0 at 14:13:43-14:13:48Z with 138/138
cases across the ten suites, zero failed/skipped/cancelled and no warnings;
`git diff --check` exited 0 and all 33 frozen source/doc hashes stayed
equal after the gates. Two independent Sol 6.1-Max bounded reviews
returned ACCEPTABLE and the final verdict is
ACCEPTED_SOURCE_FOR_FINAL_DOCUMENTATION_METADATA for this pure-JS
evidence-library boundary only. The app-191/core-184 and typecheck
receipts carry from prepared-1 on exact unchanged-input proof, not a
rerun. Real native cleanup/identity bindings, ABI/process/watchdog proof,
capture/browser checks, numeric parity, preflight and the final cohort
remain pending C4a2/C4b/C5; no strength, Elo or phase receipt exists.
