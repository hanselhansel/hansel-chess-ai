import type { ThinkResult } from "@/lib/chess/mcts";
import { ONE_VISIT, PLAY_VISITS } from "@/lib/chess/constants";
import { cn } from "@/lib/cn";

type Props = {
  visits: number;
  onVisits: (n: number) => void;
  thinking: boolean;
  result: ThinkResult | null;
  whiteValue: number | null;
};

function barWidth(v: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(4, (v / max) * 100);
}

export function ThinkPanel({ visits, onVisits, thinking, result, whiteValue }: Props) {
  const maxVisits = result?.children[0]?.visits ?? 1;
  const shownValue = whiteValue ?? 0;
  const whitePct = (shownValue + 1) / 2;

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-elevated p-5 ring-1 ring-border">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Think</p>
          <h2 className="font-display text-xl font-medium tracking-tight text-fg">Search tree</h2>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {thinking ? "searching" : result ? `${result.ms} ms` : "idle"}
        </p>
      </header>

      <div className="flex rounded-lg bg-subtle p-1">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium",
            visits === ONE_VISIT ? "bg-elevated text-fg shadow-sm" : "text-muted",
          )}
          onClick={() => onVisits(ONE_VISIT)}
        >
          1 visit
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium",
            visits === PLAY_VISITS ? "bg-elevated text-fg shadow-sm" : "text-muted",
          )}
          onClick={() => onVisits(PLAY_VISITS)}
        >
          64 visits
        </button>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        {visits === ONE_VISIT
          ? "Naked net: one look, no calculation. This is the 1-visit number."
          : "Play / rated mode: 64 look-aheads. This is the Elo we will publish."}
      </p>

      <div>
        <div className="mb-1.5 flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
          <span>Black</span>
          <span>Value</span>
          <span>White</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full bg-fg transition-[width] duration-[var(--motion-fast)]"
            style={{ width: `${Math.round(whitePct * 100)}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted">
          {shownValue >= 0 ? "+" : ""}
          {shownValue.toFixed(3)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Root children</p>
        {thinking && (
          <p className="animate-pulse text-sm text-muted">Walking lines…</p>
        )}
        {!thinking && !result && (
          <p className="text-sm text-muted">Make a move, or start a game as Black.</p>
        )}
        {result?.children.map((ch) => (
          <div key={ch.uci} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-fg">{ch.san}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-fg/70"
                style={{ width: `${barWidth(ch.visits || ch.prior, maxVisits || 1)}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted">
              n {ch.visits} · P {(ch.prior * 100).toFixed(0)}% · Q {ch.q.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
