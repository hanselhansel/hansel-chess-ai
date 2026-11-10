import { accountingTrace } from "./accounting-trace.mjs";

// process-framing.mjs is the bounded LF byte-assembly owner
// extracted from process-transport.mjs under the readable-runtime
// split decision: the fixed 1 MiB inclusive-LF bound on every
// complete frame AND on the one incomplete tail (checked BEFORE any
// concatenation), legal coalesced/multi-frame chunks, and the
// finish/discard buffer-release rules. The whole frame handler below
// borrows identical transport pending/validator/callback references.
// Neither function mints timers, process IO or a second failure authority:
// every oversize/truncated condition reports a detail string through
// the transport's single onFault latch, which isFailed reads so a
// failed wire stops all further framing.
const MAXFRAME = 1048576;

const isFn = (f) => typeof f === "function";

export function createCollectorFramer({ onFrame, onFault, isFailed, runId }) {
  if (!isFn(onFrame) || !isFn(onFault) || !isFn(isFailed)) {
    throw new Error("framer options");
  }
  // Buffer fragments of the current incomplete frame only, each <=1MiB.
  let tailParts = [];
  let tailBytes = 0;
  const release = () => {
    tailParts = [];
    tailBytes = 0;
  };

  // Incremental LF framing: complete frames are split out of each chunk
  // before any concatenation, so coalesced legal frames never compete
  // with the per-frame ceiling and the tail bound only ever applies to
  // one incomplete frame.
  const push = (d) => {
    if (runId !== undefined) accountingTrace.raw(runId);
    if (isFailed()) return;
    let rest = d;
    for (;;) {
      const at = rest.indexOf(0x0a);
      if (at < 0) {
        // The incomplete-tail bound (tail + piece + eventual LF) is
        // enforced BEFORE the fragment is retained, so an oversize
        // unterminated frame is never buffered in the first place.
        if (tailBytes + rest.length + 1 > MAXFRAME) {
          release();
          onFault("inbound overflow");
          return;
        }
        if (rest.length > 0) {
          tailParts.push(rest);
          tailBytes += rest.length;
        }
        return;
      }
      const piece = rest.subarray(0, at);
      rest = rest.subarray(at + 1);
      // The per-frame bound including its LF is enforced BEFORE any
      // concatenation, so an oversize frame can never be assembled.
      if (tailBytes + piece.length + 1 > MAXFRAME) {
        release();
        onFault("inbound overflow");
        return;
      }
      const frame =
        tailParts.length === 0
          ? piece
          : Buffer.concat([...tailParts, piece]);
      release();
      onFrame(frame);
      if (isFailed()) return;
    }
  };

  // Real stream close: only a still-buffered partial tail is a
  // truncated EOF; a clean boundary releases silently. Never proves
  // process or pipe settlement — the transport owns that.
  const finish = () => {
    if (tailBytes > 0) {
      release();
      onFault("truncated EOF");
      return;
    }
    release();
  };

  // Release buffer ownership without any truncated-EOF claim (a
  // latched transport fault or teardown already decided the wire).
  const discard = () => {
    release();
  };

  return Object.freeze({ push, finish, discard });
}

// Whole original frame handler, same captured transport state and call order.
export function createCollectorFrameHandler({ pending, protocol, onInbound,
  onStartup, failOnce, makeError, decoder, runId }) {
  return (bytes) => {
    const boundary = accountingTrace.frame(runId);
    if (bytes.length === 0) {
      failOnce(makeError("blank frame"));
      return;
    }
    if (bytes.length + 1 > MAXFRAME) {
      failOnce(makeError("frame bytes"));
      return;
    }
    let msg;
    try {
      msg = JSON.parse(decoder.decode(bytes));
    } catch {
      failOnce(makeError("frame decode"));
      return;
    }
    if (msg === null || typeof msg !== "object" || Array.isArray(msg)) {
      failOnce(makeError("frame envelope"));
      return;
    }
    // The pending entry stays owned until BOTH the same-handle
    // actual-clock check and protocol acceptance succeed: a late
    // acknowledgement arriving after its request expired can never be
    // admitted into protocol state, and the failure rejects the actual
    // send/proof promise together with its public wrapper instead of
    // leaving a stranded waiter.
    const p = pending.get(msg.requestId);
    if (p) accountingTrace.wire(msg.requestId, "frame", boundary);
    if (p) {
      try {
        p.handle.assertLive("reply deadline");
      } catch {
        failOnce(makeError("reply deadline"));
        return;
      }
    }
    try {
      protocol.accept("collector", "c2s", msg, bytes.length + 1);
    } catch (e) {
      failOnce(e);
      return;
    }
    if (p) accountingTrace.wire(msg.requestId, "validated", msg);
    if (msg.type === "ready" && msg.stage === "startup") {
      onStartup(msg);
      return;
    }
    onInbound(msg);
    if (p) {
      pending.delete(msg.requestId);
      p.unsub();
      accountingTrace.wire(msg.requestId, "resolved");
      p.resolve(msg);
    }
  };
}
