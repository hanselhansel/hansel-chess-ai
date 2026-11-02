import { Chess, type Piece, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLAY_VISITS } from "@/lib/chess/constants";
import checkpoint from "@/lib/chess/checkpoint-meta.json";
import { capturePosition } from "@/lib/chess/position";
import type { RequestContext, ThinkResponse } from "@/lib/chess/think-protocol";
import { ChessBoard, type SquarePiece } from "./board";
import { CardPanel, type HistoricalRecords } from "./card-panel";
import { MoveList } from "./move-list";
import { Roadmap } from "./roadmap";
import { ThinkPanel } from "./think-panel";
import { shortThinkerFailure, useThinker } from "./use-thinker";
import { WorkbenchControls } from "./workbench-controls";

type Promo = "q" | "r" | "b" | "n";

/** A completed response bound to the side that was to move at request time. */
type Completed = Readonly<{ response: ThinkResponse; mover: "w" | "b" }>;

/** The literal root every owned game history starts from. */
const ROOT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function snapshot(chess: Chess): SquarePiece[][] {
  return chess.board().map((row) =>
    row.map((p: Piece | null) => (p ? { type: p.type, color: p.color } : null)),
  );
}

function uciOf(m: { from: string; to: string; promotion?: string }): string {
  return m.from + m.to + (m.promotion ?? "");
}

function sameHistory(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

const HISTORY_SEED: HistoricalRecords = {
  vsRandom: checkpoint.vsRandom ?? null,
  vsPhase1: checkpoint.vsPhase1 ?? null,
  selfplayGames:
    typeof checkpoint.selfplayGames === "number" ? checkpoint.selfplayGames : null,
  gauntletElo: checkpoint.gauntletElo ?? null,
};

export function Workbench() {
  const gameRef = useRef(new Chess());
  const uciRef = useRef<string[]>([]);
  const generationRef = useRef(0);
  const requestIdRef = useRef(0);
  const {
    state: engine,
    session,
    sessionError,
    mode,
    pendingRequestId,
    turnFailed,
    runTurn,
    cancelPending,
    clearTurnFailed,
    restart,
  } = useThinker("trained");
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [human, setHuman] = useState<"w" | "b">("w");
  const [selected, setSelected] = useState<string | null>(null);
  const [visits, setVisits] = useState(PLAY_VISITS);
  const [result, setResult] = useState<Completed | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [history, setHistory] = useState<HistoricalRecords>(HISTORY_SEED);
  const [status, setStatus] = useState("Verifying the selected checkpoint.");
  const [detail, setDetail] = useState<string | null>(null);

  const chess = gameRef.current;
  const turn = chess.turn();
  const over = chess.isGameOver();
  const busy = pendingRequestId !== null;
  const identity = session?.modelIdentity ?? engine?.modelIdentity ?? null;
  const demo = mode === "random-demo";

  const legalTargets = useMemo(() => {
    void fen;
    const set = new Set<string>();
    if (!selected) return set;
    for (const m of gameRef.current.moves({ square: selected as Square, verbose: true })) {
      set.add(m.to);
    }
    return set;
  }, [selected, fen]);
  const board = useMemo(() => (void fen, snapshot(gameRef.current)), [fen]);
  const sans = useMemo(() => (void fen, gameRef.current.history()), [fen]);
  const response = result?.response ?? null;
  const lastMove = response?.kind === "move" ? response : null;
  const whiteValue = result == null || response?.kind !== "move" ? null
    : result.mover === "w" ? response.result.value : -response.result.value;
  const sync = useCallback(() => {
    setFen(gameRef.current.fen());
    setSelected(null);
  }, []);

  const outcomeText = useCallback(() => {
    const g = gameRef.current;
    if (g.isCheckmate()) return g.turn() === "w" ? "Checkmate — Black wins." : "Checkmate — White wins.";
    if (g.isStalemate()) return "Draw by stalemate.";
    if (g.isDraw()) return "Draw.";
    if (g.isCheck()) return "Check.";
    return null;
  }, []);

  const modeLine = useCallback(
    (forBlack: boolean) => {
      const who = forBlack ? "You have Black. Model moves first." : "Your move.";
      if (demo) return `${who} Untrained random demo. No rating claims.`;
      if (identity === null) return `${who} Checkpoint verification pending.`;
      return `${who} Verified ${identity.modelName}.`;
    },
    [demo, identity],
  );

  const runThink = useCallback(
    (auto: boolean) => {
      const g = gameRef.current;
      if (g.isGameOver() || g.turn() === human) return;
      if (pendingRequestId !== null) return;
      if (auto && engine?.stage !== "ready") return;
      const engineSessionId = session?.engineSessionId ?? engine?.engineSessionId;
      if (engineSessionId === undefined) return;
      const generation = generationRef.current;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const mover = g.turn();
      const fenAtRequest = g.fen();
      const context: RequestContext = {
        engineSessionId, gameGeneration: generation, requestId,
        position: capturePosition(ROOT_FEN, [...uciRef.current], fenAtRequest),
        requestedVisits: visits,
      };
      setDetail(null);
      setStatus("Model is thinking.");
      void runTurn(context, {
        isPositionCurrent: (ctx) =>
          gameRef.current === g && generationRef.current === generation &&
          g.fen() === fenAtRequest && ctx.requestId === requestId &&
          ctx.engineSessionId === engineSessionId &&
          ctx.position.expectedFen === fenAtRequest &&
          sameHistory(ctx.position.movesUci, uciRef.current),
        onSuccess: (r) => {
          if (r.kind === "terminal") {
            setResult({ response: r, mover });
            setStatus(`Position is terminal (${r.terminal.reason}). No move played.`);
            return;
          }
          const applied = g.move({
            from: r.result.from, to: r.result.to, promotion: r.result.promotion,
          });
          if (!applied) throw new Error(`Illegal model move ${r.result.uci}`);
          uciRef.current.push(uciOf(applied));
          setResult({ response: r, mover });
          setLast({ from: r.result.from, to: r.result.to });
          sync();
          setStatus(
            outcomeText() ??
              `Model played ${r.result.san} · ${r.completedVisits} visits · ${Math.round(r.searchMs)} ms · ${r.backend}`,
          );
        },
        onFailure: (failure) => {
          setDetail(shortThinkerFailure(failure));
          setStatus("No model move was applied.");
        },
      });
    },
    [engine, session, human, visits, pendingRequestId, runTurn, sync, outcomeText],
  );

  const freshBoard = useCallback(() => {
    gameRef.current = new Chess();
    uciRef.current = [];
    setResult(null);
    setLast(null);
    setPromo(null);
    setSelected(null);
    setFen(gameRef.current.fen());
  }, []);

  const reset = useCallback(
    (color: "w" | "b") => {
      cancelPending();
      generationRef.current += 1;
      freshBoard();
      setHuman(color);
      setDetail(null);
      clearTurnFailed();
      setStatus(modeLine(color === "b"));
    },
    [cancelPending, clearTurnFailed, freshBoard, modeLine],
  );

  const retryMove = useCallback(() => {
    if (!turnFailed) return;
    clearTurnFailed();
    void runThink(false);
  }, [turnFailed, clearTurnFailed, runThink]);

  const restartEngine = useCallback(
    (next?: "trained" | "random-demo", newGame = false) => {
      cancelPending();
      generationRef.current += 1;
      clearTurnFailed();
      setStatus(
        next === "random-demo" ? "Starting the demo engine." : "Verifying the selected checkpoint.",
      );
      restart(next);
      if (newGame) freshBoard();
    },
    [cancelPending, clearTurnFailed, freshBoard, restart],
  );

  useEffect(() => {
    void fetch("/weights/tinyaz-m.meta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (!meta) return;
        setHistory((h) => ({
          vsRandom: meta.vsRandom ?? h.vsRandom,
          vsPhase1: meta.vsPhase1 ?? h.vsPhase1,
          selfplayGames: typeof meta.selfplayGames === "number" ? meta.selfplayGames : h.selfplayGames,
          gauntletElo: meta.gauntletElo ?? h.gauntletElo,
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionError) {
      setStatus("Engine unavailable.");
    } else if (session) {
      setDetail(null);
      setStatus((s) =>
        s.startsWith("Verifying") || s.startsWith("Starting the demo") ? modeLine(human === "b") : s,
      );
    }
  }, [session, sessionError, human, modeLine]);

  useEffect(() => {
    if (busy || over || turnFailed || engine?.stage !== "ready") return;
    if (gameRef.current.turn() !== human) void runThink(true);
  }, [engine?.stage, fen, human, busy, over, turnFailed, runThink]);

  function tryMove(from: string, to: string, promotion?: Promo) {
    const g = gameRef.current;
    const verbose = g.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    if (!verbose.length) return;
    const needsPromo = verbose.some((m) => m.promotion);
    if (needsPromo && !promotion) {
      setPromo({ from, to });
      return;
    }
    const moved = g.move({ from, to, promotion: promotion ?? (needsPromo ? "q" : undefined) });
    if (!moved) return;
    uciRef.current.push(uciOf(moved));
    setPromo(null);
    setLast({ from, to });
    clearTurnFailed();
    const end = outcomeText();
    setStatus(end ?? `You played ${moved.san}`);
    sync();
    void runThink(true);
  }

  function onSquare(sq: string) {
    if (busy || over || promo || chess.turn() !== human) return;
    const piece = chess.get(sq as Square);
    if (selected && legalTargets.has(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (piece && piece.color === human) {
      setSelected(sq);
      return;
    }
    setSelected(null);
  }

  const engineStage = engine?.stage ?? null;
  const displayDetail =
    sessionError !== null ? shortThinkerFailure(sessionError) : detail;
  const banner = sessionError
    ? "Engine failed to start."
    : !session || busy || (turn !== human && !over && !turnFailed)
      ? session ? "Model is thinking." : "Verifying checkpoint."
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Hansel Chess AI</p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg md:text-4xl">
            Watch it think
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted md:text-base">
            {demo
              ? "Random demo: an untrained seed-2026 net drives the board. No rating claims."
              : "From-scratch AlphaZero-style net under 3M params. The browser verifies the selected checkpoint before play. Click a piece, then a highlighted square."}
          </p>
        </div>
        <WorkbenchControls
          onPlayWhite={() => reset("w")}
          onPlayBlack={() => reset("b")}
          showRetryMove={turnFailed}
          onRetryMove={retryMove}
          showRetryEngine={sessionError !== null || engineStage === "failed"}
          onRetryEngine={() => restartEngine()}
          demo={demo}
          onToggleMode={() => restartEngine(demo ? "trained" : "random-demo", true)}
        />
      </header>

      <div className="flex flex-col gap-5">
        <div className="order-2 lg:order-1">
          <Roadmap />
        </div>
        <div className="order-1 lg:order-2 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="flex flex-col gap-4">
            <ChessBoard
              board={board}
              flipped={human === "b"}
              selected={selected}
              legalTargets={legalTargets}
              lastFrom={last?.from}
              lastTo={last?.to}
              heatmap={lastMove?.result.heatmap}
              thinking={busy || !session}
              banner={banner}
              disabled={busy || over || turn !== human}
              onSquare={onSquare}
            />
            {promo && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-elevated p-3 ring-1 ring-border">
                <span className="text-sm text-muted">Promote to</span>
                {(["q", "r", "b", "n"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="rounded-md bg-subtle px-3 py-2 text-sm font-medium uppercase text-fg"
                    onClick={() => tryMove(promo.from, promo.to, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {displayDetail && <p className="text-xs leading-relaxed text-muted">{displayDetail}</p>}
            <MoveList sans={sans} />
          </div>
          <div className="flex flex-col gap-5">
            <ThinkPanel
              visits={visits}
              onVisits={setVisits}
              thinking={busy || engineStage === "thinking"}
              response={response}
              whiteValue={whiteValue}
            />
            <CardPanel
              identity={identity}
              backend={response?.backend ?? engine?.backend ?? null}
              visits={visits}
              lastResponse={response}
              status={status}
              history={history}
              demoMode={demo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
