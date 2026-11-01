# Multiplayer

## Overview

Browser WebRTC room transport. The package exchanges signaling through `/api/rtc`
and sends application messages over peer data channels. It provides the client
boundary, with no signaling server implementation in this directory.

## Interface

- `P2PRoom(options)` accepts room/self identifiers, optional names and ICE servers,
  and callbacks for peers, messages, and initial signaling connectivity.
  `PeerRow`, `SignalRow`, `RtcPollResponse`, `PeerInfo`, and `SignalKind` describe
  the transport records. ([p2p.ts:P2PRoomOptions](./p2p.ts), [p2p.ts:P2PRoom](./p2p.ts))
- `join()` starts signaling and diagnostics; `close()` tears down the room.
  `broadcast(data)` uses state channels, `send(data, peerId?)` uses reliable
  channels, and `peerList()` returns copied peer diagnostics.
  ([p2p.ts:P2PRoom.join](./p2p.ts), [p2p.ts:P2PRoom.close](./p2p.ts),
  [p2p.ts:P2PRoom.broadcast](./p2p.ts), [p2p.ts:P2PRoom.send](./p2p.ts),
  [p2p.ts:P2PRoom.peerList](./p2p.ts))
- `defaultIceServers()` uses comma-separated `VITE_STUN_URLS` or the built-in
  Google/Cloudflare STUN defaults. The package entry point re-exports the class,
  helper, and public record types.
  ([p2p.ts:defaultIceServers](./p2p.ts), [index.ts:P2PRoom](./index.ts))

## Invariants

- The lexicographically larger peer identifier initiates; the smaller peer is
  polite during offer collision handling. Unknown signal senders must appear
  in the current roster before a peer connection is created.
  ([p2p.ts:P2PRoom.reconcileRoster](./p2p.ts), [p2p.ts:P2PRoom.onSignal](./p2p.ts))
- Initiators create an unordered `state` channel with `maxRetransmits: 0` and an
  ordered `reliable` channel. ICE received before a remote description is buffered.
  ([p2p.ts:P2PRoom.connectTo](./p2p.ts), [p2p.ts:P2PRoom.onSignal](./p2p.ts))
- Signal posts are serialized per peer and attempted at most three times, with
  250 ms and 750 ms retry delays. Polling uses 400 ms while pairs connect and
  2000 ms otherwise. ([p2p.ts:P2PRoom.sendSignal](./p2p.ts),
  [p2p.ts:SIGNAL_RETRY_DELAYS_MS](./p2p.ts), [p2p.ts:P2PRoom.poll](./p2p.ts))
- A stall exceeds 10 seconds without progress. The initiating peer rebuilds
  connections within the three-attempt recovery budget; a later expired window
  marks the pair terminal. ([p2p.ts:P2PRoom.watchdog](./p2p.ts),
  [p2p.ts:MAX_RECOVERY_ATTEMPTS](./p2p.ts))

## Side Effects

- Fetches `/api/rtc` for roster/signals and posts JSON signal or keepalive leave
  operations. Creates WebRTC peer connections, exchanges descriptions/ICE, and
  sends JSON application envelopes, pings, and pongs over data channels.
  ([p2p.ts:P2PRoom.pollOnce](./p2p.ts), [p2p.ts:P2PRoom.postSignal](./p2p.ts),
  [p2p.ts:P2PRoom.close](./p2p.ts), [p2p.ts:P2PRoom.attachChannel](./p2p.ts))
- Schedules poll/retry timeouts and a two-second ping/watchdog interval, reads
  WebRTC statistics, updates diagnostics, invokes callbacks, and logs exhausted
  signal retries or ICE-addition failures.
  ([p2p.ts:P2PRoom.join](./p2p.ts), [p2p.ts:P2PRoom.postSignal](./p2p.ts),
  [p2p.ts:P2PRoom.readCandidateType](./p2p.ts), [p2p.ts:P2PRoom.emitPeers](./p2p.ts))
- `close()` clears retained poll/ping timers and peer connections. In-flight
  fetches and retry-delay timeouts are not aborted; guarded later work observes
  the closed state. ([p2p.ts:P2PRoom.close](./p2p.ts), [p2p.ts:P2PRoom.postSignal](./p2p.ts))

## Verification

From the repository root, run `npm test` and `npm run typecheck`.
The automated test script has no dedicated multiplayer test file. WebRTC,
signaling availability, and browser connectivity require separate integration
verification. These commands were identified from [package.json](../../../package.json).
