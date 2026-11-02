import {
  FLOPS_PER_EVAL_M,
  FLOPS_PER_EVAL_S,
  PARAM_CAP,
} from "@/lib/chess/constants";
import type { ModelIdentity } from "@/lib/chess/checkpoint";
import type {
  Backend,
  ThinkResponse,
} from "@/lib/chess/think-protocol";

export type VsRecord = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  visits?: number;
  passed?: boolean;
  score?: number;
} | null;

export type GauntletRecord = {
  visits: number;
  eloLabel: string;
  estimatedElo: number | null;
  eloLo: number | null;
  eloHi: number | null;
  stockfish: string;
  games: number;
  levels?: { uciElo: number; wins: number; draws: number; losses: number; score: number }[];
} | null;

/** Records preserved from checkpoint metadata; unbound to the active session. */
export type HistoricalRecords = Readonly<{
  vsRandom: VsRecord;
  vsPhase1: VsRecord;
  selfplayGames: number | null;
  gauntletElo: GauntletRecord;
}>;

type Props = {
  /** Verified active-session model identity, or null before readiness. */
  identity: ModelIdentity | null;
  /** Last completed response backend, or the current engine backend before
   * the first completion; null when neither is known. */
  backend: Backend | null;
  /** Visit budget selected for the next request. */
  visits: number;
  /** Last completed response (move or terminal), never an in-flight guess. */
  lastResponse: ThinkResponse | null;
  status: string;
  /** Preserved records, shown only as labeled history in trained mode. */
  history: HistoricalRecords;
  /** Requested demo mode; hides trained history immediately during loading. */
  demoMode: boolean;
};

function fmtElo(g: NonNullable<GauntletRecord>): string {
  if (g.estimatedElo != null && g.eloLo != null && g.eloHi != null && g.eloLo !== g.eloHi) {
    return `${g.eloLabel} (${g.eloLo}–${g.eloHi})`;
  }
  return g.eloLabel;
}

export function CardPanel({
  identity,
  backend,
  visits,
  lastResponse,
  status,
  history,
  demoMode,
}: Props) {
  const params = identity?.parameterCount ?? null;
  const flopsOf = (id: ModelIdentity | null): number | null =>
    id === null ? null : id.channels === 128 ? FLOPS_PER_EVAL_M : FLOPS_PER_EVAL_S;
  const lastMove =
    lastResponse?.kind === "move" ? lastResponse : null;
  const arithmetic =
    lastResponse !== null && lastResponse.completedVisits > 0
      ? `${((flopsOf(lastResponse.modelIdentity) ?? 0) / 1e6).toFixed(0)}M × ${lastResponse.completedVisits} ≈ ${(((flopsOf(lastResponse.modelIdentity) ?? 0) * lastResponse.completedVisits) / 1e6).toFixed(0)}M MAC (nominal estimate, completed)`
      : flopsOf(identity) !== null
        ? `${(flopsOf(identity)! / 1e6).toFixed(0)}M × ${visits} ≈ ${((flopsOf(identity)! * visits) / 1e6).toFixed(0)}M MAC (nominal estimate, next request)`
        : null;
  const { vsRandom, vsPhase1, selfplayGames, gauntletElo } = history;
  const hasHistory =
    vsRandom !== null ||
    vsPhase1 !== null ||
    (selfplayGames !== null && selfplayGames > 0) ||
    gauntletElo !== null;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-elevated p-5 ring-1 ring-border">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Efficiency card</p>
        <h2 className="font-display text-xl font-medium tracking-tight text-fg">
          {identity?.modelName ?? "loading"}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {identity === null
            ? "verifying checkpoint…"
            : demoMode
              ? "untrained random demonstration"
              : "verified trained checkpoint"}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-muted">Parameters</dt>
          <dd className="font-mono tabular-nums text-fg">
            {params === null
              ? "—"
              : `${params.toLocaleString()} · ${(params / 1e6).toFixed(2)}M`}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Arithmetic / move</dt>
          <dd className="font-mono tabular-nums text-fg">
            {arithmetic ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Last completed move</dt>
          <dd className="font-mono tabular-nums text-fg">
            {lastMove
              ? `${lastMove.completedVisits} visits · search ${Math.round(lastMove.searchMs)} ms · total ${Math.round(lastMove.moveElapsedMs)} ms`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Backend</dt>
          <dd className="font-mono tabular-nums text-fg">
            {backend ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cap</dt>
          <dd className="font-mono tabular-nums text-fg">{`< ${(PARAM_CAP / 1e6).toFixed(0)}M`}</dd>
        </div>
        <div>
          <dt className="text-muted">Lichess Elo</dt>
          <dd className="font-mono tabular-nums text-fg">unavailable</dd>
        </div>
      </dl>
      <p className="rounded-md bg-subtle px-3 py-2 text-sm leading-relaxed text-muted">{status}</p>
      {!demoMode && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Recorded history · unbound to this session
          </p>
          {!hasHistory && (
            <p className="text-sm text-muted">unavailable: no recorded evaluations for this build</p>
          )}
          <dl className="grid grid-cols-1 gap-y-2 text-sm">
            {vsRandom && (
              <div>
                <dt className="text-muted">1-visit vs random-move (recorded)</dt>
                <dd className="font-mono tabular-nums text-fg">
                  {vsRandom.wins}–{vsRandom.draws}–{vsRandom.losses} / {vsRandom.games}
                  {vsRandom.passed ? " · beats random" : " · void"}
                </dd>
              </div>
            )}
            {vsPhase1 && (
              <div>
                <dt className="text-muted">1-visit vs Phase 1 net (recorded)</dt>
                <dd className="font-mono tabular-nums text-fg">
                  {vsPhase1.wins}–{vsPhase1.draws}–{vsPhase1.losses} / {vsPhase1.games}
                  {vsPhase1.score != null ? ` · ${(vsPhase1.score * 100).toFixed(0)}%` : ""}
                </dd>
              </div>
            )}
            {selfplayGames != null && selfplayGames > 0 && (
              <div>
                <dt className="text-muted">Self-play (recorded)</dt>
                <dd className="font-mono tabular-nums text-fg">{selfplayGames} games × 64 visits</dd>
              </div>
            )}
            {gauntletElo && (
              <div>
                <dt className="text-muted">vs Stockfish UCI_Elo (recorded)</dt>
                <dd className="font-mono tabular-nums text-fg">
                  {`${fmtElo(gauntletElo)} vs SF ${gauntletElo.stockfish}`}
                </dd>
              </div>
            )}
            {gauntletElo?.levels && gauntletElo.levels.length > 0 && (
              <div>
                <dt className="text-muted">SF level detail (recorded)</dt>
                <dd className="font-mono tabular-nums text-fg">
                  {gauntletElo.levels
                    .map((lv) => `${lv.uciElo} ${lv.wins}–${lv.draws}–${lv.losses}`)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
