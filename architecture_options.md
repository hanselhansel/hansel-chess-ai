# Tinyaz model-loading ownership options

- **Date:** 2026-11-01
- **Purpose:** Accepted loading-ownership decision for the Technical Plan.
- **Related design:** [final design](./docs/superpowers/specs/2026-11-02-tinyaz-verified-m-software-design.md). Overview & Goals is approved. Technical Plan was approved by Hansel on 2026-11-01. The design is saved; independent EGM review remains pending.
- **Decision:** Hansel selected A on 2026-11-01 by replying "agree" to the recommendation for A. B and C are retained as the considered alternatives. This selects loading ownership. Hansel approved the resulting Technical Plan on 2026-11-01; independent EGM review remains pending.

## The decision

A browser worker runs search on a background thread. The choice here is which side downloads the model and which side keeps its original binary for recovery. It does not change the model, its visit budget, or the accepted failure policy.

The existing M binary is 9,706,840 bytes, with SHA256 `b716fe7b9a663c8c839f49cefd592ebc7ba771452057bac2404c24f48d2af4ee`. Decoded tensor arrays require additional memory. The options below describe ownership and possible costs, not measured latency or memory results.

## Requirements shared by all three options

- Use the intended existing M checkpoint through the existing selected URL. Verify its expected identity, recognized architecture/count, and file content before accepting trained readiness.
- Pin the session to the verified checkpoint. Readiness, results, backend transitions, and displayed claims carry that identity. Historical records without demonstrated checkpoint provenance stay historical.
- Reject trained loading visibly when verification fails. Do not silently substitute random weights. An explicit random demonstration has its own mode and no trained-model rating claim.
- If a worker is unavailable or fails, permit at most one transition to main-thread execution inside the accepted whole-operation deadline. Retire the old backend before recovery. If the same checkpoint cannot be recovered in time, stop visibly.
- Reject results belonging to an earlier game, request, position, or checkpoint. Physical cancellation does not replace result checks.
- Keep the existing S utilities and packed S/M format. Do not add a registry, publication system, persistent search tree, new training, or new dependency to answer this ownership question.

## A. Browser client downloads and keeps the bytes

**Mechanism:** The thinker client downloads and verifies M once. It retains the binary for the session and sends a separate buffer to the worker for decoding and search. If worker execution fails, main-thread execution decodes the retained verified binary. If workers cannot start, the same client-owned loading path initializes main-thread execution directly.

**Trade-offs:** Recovery after successful loading does not need another network request. One place controls the downloaded checkpoint identity. The client retains a 9.7 MB binary in addition to the active decoded weights. Sending a separate buffer and decoding can add temporary memory and copying. Initialization cost must be measured in the actual browser.

**Failure conditions:** The initial fetch or verification can fail. Buffer ownership must prevent a worker handoff from detaching or changing the only retained recovery copy. Memory pressure or a slow initialization can still exceed the shared deadline. Cached bytes do not guarantee that main-thread search is responsive or completes on time.

**Evidence needed:** One successful weight download per initialized session; identical digest in worker and main results; fallback after blocking later downloads; safe buffer lifetime; missing/corrupt/mismatched input rejection; deadline, termination, and reset fixtures.

## B. Worker downloads; fallback downloads the same model again

**Mechanism:** The worker downloads, verifies, decodes, and searches with M. The client retains verified identity rather than the binary. If worker execution fails, the client downloads M again and verifies it against the pinned identity before decoding it for main-thread execution. If no worker starts, the client loads and verifies the intended M directly.

**Trade-offs:** This retains the current placement of normal worker loading and avoids keeping the original binary in the client after readiness. Recovery depends on a second fetch, verification, and decoding within the remaining deadline. A browser cache may satisfy that request, but the design cannot assume it will.

**Failure conditions:** Recovery stops if the asset changes, the network or cache is unavailable, or the remaining time is insufficient. The model must never change silently merely to continue a game. Less retained client data does not establish lower peak memory or faster play.

**Evidence needed:** Worker and direct-main initialization; successful fallback with an exact matching digest; failure when the second response is unavailable, corrupt, or different; no random substitution; full recovery latency and one-transition/deadline fixtures.

## C. Worker downloads and returns the verified bytes to the client

**Mechanism:** The worker downloads, verifies, and decodes M. It returns the verified binary and its identity to the client for session retention. The client confirms it holds the required recovery data before accepting trained readiness. Worker search uses its decoded weights; later main-thread recovery uses the retained binary. If the worker fails before that handoff completes, initialization may transition once to direct client loading under the same identity and deadline.

**Trade-offs:** Normal loading remains in the worker, and recovery after successful readiness does not require another download. Both sides participate in initialization and readiness. The client retains the binary, and additional messages, buffer ownership, acknowledgement, and early-failure cases need tests. No latency or memory advantage over A is established.

**Failure conditions:** Worker failure during the handoff must not produce a ready session without recovery data. Message ordering, cancellation, and detached or missing buffers must fail visibly. The initial fetch and main-thread fallback can still exceed the deadline. Retained bytes do not make search cancellation automatic.

**Evidence needed:** Ready is withheld until the client has usable matching bytes; worker failure before and after the handoff; missing/out-of-order messages; buffer lifetime; recovery without later downloads; reset, termination, and full-deadline fixtures.

## Effect on the rest of the design

All three can satisfy the accepted brief. None requires retraining. None establishes an Elo gain. The choice changes loading ownership, worker messages, failure handling, and memory/network trade-offs. It does not authorize a publisher change or alter historical measurements.

After selection, the Technical Plan will define the selected model description, exact message and result fields, loading states, retry/reset behavior, metadata compatibility, verification fixtures, and evaluation data flow. Remaining architecture decisions will be brought to the owner when more than one defensible answer remains. Mechanical naming and formatting stay implementation details.

## Current source references

- [Chess library contract](./src/lib/chess/README.md)
- [Worker contract](./src/workers/README.md)
- [Component contract](./src/components/chess/README.md)
- [Current loader and decoder](./src/lib/chess/weights.ts): the default selects S, errors return random S, and unpacking copies tensor arrays.
- [Current thinker client](./src/lib/chess/think-client.ts): the worker initializes independently; failed thinking reloads for main execution outside the original timeout.
- [Current worker](./src/workers/think.worker.ts): initialization fetches weights and reports count/source; no binary is handed back to the client.
- [Accepted brief](./concepts_brief.md) and [resolved review](./goldfish_review_report.md): authority for the shared requirements above.
