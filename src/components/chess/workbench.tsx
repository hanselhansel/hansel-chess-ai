import { Chess, type Piece, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLAY_VISITS } from "@/lib/chess/constants";
import { paramCount } from "@/lib/chess/weights";
import type { ThinkResult } from "@/lib/chess/mcts";
import { createThinker } from "@/lib/chess/think-client";
import { ChessBoard, type SquarePiece } from "./board";
import { CardPanel } from "./card-panel";
import { MoveList } from "./move-list";
import { Roadmap } from "./roadmap";
import { ThinkPanel } from "./think-panel";

type Promo = "q" | "r" | "b" | "n";

function snapshot(chess: Chess): SquarePiece[][] {
  return chess.board().map((row) =>
    row.map((p: Piece | null) => (p ? { type: p.type, color: p.color } : null)),
  );
}

export function Workbench() {
  const gameRef = useRef(new Chess());
  const thinkerRef = useRef<ReturnType<typeof createThinker> | null>(null);
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [human, setHuman] = useState<"w" | "b">("w");
  const [selected, setSelected] = useState<string | null>(null);
  const [visits, setVisits] = useState(PLAY_VISITS);
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<ThinkResult | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [params, setParams] = useState(paramCount());
  const [seed, setSeed] = useState(2026);
  const [source, setSource] = useState("random");
  const [vsRandom, setVsRandom] = useState<{
    games: number;
    wins: number;
    draws: number;
    losses: number;
    visits: number;
    passed: boolean;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Starting the engine…");
  const [err, setErr] = useState<string | null>(null);
  const inflight = useRef(false);

  const chess = gameRef.current;
  const turn = chess.turn();
  const over = chess.isGameOver();
  const flipped = human === "b";

  const legalTargets = useMemo(() => {
    void fen;
    const set = new Set<string>();
    if (!selected) return set;
    for (const m of gameRef.current.moves({ square: selected as Square, verbose: true })) {
      set.add(m.to);
    }
    return set;
  }, [selected, fen]);

  const board = useMemo(() => {
    void fen;
    return snapshot(gameRef.current);
  }, [fen]);
  const sans = useMemo(() => {
    void fen;
    return gameRef.current.history();
  }, [fen]);
  const whiteValue =
    result == null ? null : human === "b" ? result.value : -result.value;

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

  const runThink = useCallback(async () => {
    const g = gameRef.current;
    if (g.isGameOver() || g.turn() === human) return;
    if (inflight.current) return;
    const thinker = thinkerRef.current;
    if (!thinker) return;
    inflight.current = true;
    setThinking(true);
    setErr(null);
    setStatus("Model is thinking…");
    try {
      const r = await thinker.think(g.fen(), visits);
      const move = g.move({
        from: r.from,
        to: r.to,
        promotion: (r.promotion as Promo | undefined) ?? undefined,
      });
      if (!move) throw new Error(`Illegal model move ${r.uci}`);
      setResult(r);
      setLast({ from: r.from, to: r.to });
      sync();
      const end = outcomeText();
      setStatus(end ?? `Model played ${r.san} · ${r.visits} visits · ${r.ms} ms`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("Think failed — reset with Play White.");
    } finally {
      inflight.current = false;
      setThinking(false);
    }
  }, [human, visits, sync, outcomeText]);

  const trained = source !== "random";
  const yourMove = trained
    ? "Your move. Lichess-supervised net. No Elo yet — it should beat random."
    : "Your move. Random net — play it to see the tree.";
  const blackMove = trained
    ? "You have Black. Supervised net moves first."
    : "You have Black. Model moves first.";

  useEffect(() => {
    const thinker = createThinker();
    thinkerRef.current = thinker;
    thinker.ready
      .then((r) => {
        setParams(r.paramCount);
        setSeed(r.seed);
        setSource(r.source);
        setReady(true);
        const line =
          r.source !== "random"
            ? "Your move. Lichess-supervised net. No Elo yet — it should beat random."
            : "Your move. Random net — play it to see the tree.";
        setStatus((s) => (s === "Starting the engine…" ? line : s));
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setStatus("Engine failed to start.");
      });
    return () => thinker.terminate();
  }, []);

  useEffect(() => {
    void fetch("/weights/tinyaz-s.meta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (meta?.vsRandom) setVsRandom(meta.vsRandom);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || thinking || over) return;
    if (gameRef.current.turn() !== human) {
      void runThink();
    }
  }, [ready, fen, human, thinking, over, runThink]);

  function reset(color: "w" | "b") {
    gameRef.current.reset();
    inflight.current = false;
    setHuman(color);
    setResult(null);
    setLast(null);
    setPromo(null);
    setErr(null);
    setThinking(false);
    setStatus(color === "w" ? yourMove : blackMove);
    sync();
  }

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
    setPromo(null);
    setLast({ from, to });
    const end = outcomeText();
    setStatus(end ?? `You played ${moved.san}`);
    sync();
    void runThink();
  }

  function onSquare(sq: string) {
    if (thinking || over || chess.turn() !== human) return;
    if (promo) return;
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

  const banner = !ready
    ? "Starting engine…"
    : thinking || (turn !== human && !over)
      ? "Model is thinking…"
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
            From-scratch AlphaZero-style net. Phase 1 learned from Lichess 2013-01
            games. It beats a random-move bot; there is no published Elo yet. Click a
            piece, then a highlighted square. Watch 1-visit vs 64-visit on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-fg px-4 py-2.5 text-sm font-medium text-bg"
            onClick={() => reset("w")}
          >
            Play White
          </button>
          <button
            type="button"
            className="rounded-lg bg-subtle px-4 py-2.5 text-sm font-medium text-fg ring-1 ring-border"
            onClick={() => reset("b")}
          >
            Play Black
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-5">
        <div className="order-2 lg:order-1">
          <Roadmap current={trained ? 1 : 0} />
        </div>
        <div className="order-1 lg:order-2 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="flex flex-col gap-4">
          <ChessBoard
            board={board}
            flipped={flipped}
            selected={selected}
            legalTargets={legalTargets}
            lastFrom={last?.from}
            lastTo={last?.to}
            heatmap={result?.heatmap}
            thinking={thinking || !ready}
            banner={banner}
            disabled={thinking || over || turn !== human}
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
          {err && <p className="text-sm text-danger">{err}</p>}
          <MoveList sans={sans} />
        </div>
        <div className="flex flex-col gap-5">
          <ThinkPanel
            visits={visits}
            onVisits={setVisits}
            thinking={thinking || !ready}
            result={result}
            whiteValue={whiteValue}
          />
          <CardPanel
            paramCount={params}
            seed={seed}
            source={source}
            vsRandom={vsRandom}
            visits={visits}
            lastMs={result?.ms ?? null}
            status={status}
          />
        </div>
        </div>
      </div>
    </div>
  );
}
