import { FLOPS_PER_EVAL, MODEL_NAME, ONE_VISIT, PARAM_CAP, PLAY_VISITS } from "@/lib/chess/constants";

type Vs = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  visits?: number;
  passed?: boolean;
  score?: number;
} | null;

type Gauntlet = {
  visits: number;
  eloLabel: string;
  estimatedElo: number | null;
  eloLo: number | null;
  eloHi: number | null;
  stockfish: string;
  games: number;
  levels?: { uciElo: number; wins: number; draws: number; losses: number; score: number }[];
} | null;

type Props = {
  paramCount: number;
  seed: number;
  source: string;
  vsRandom: Vs;
  vsPhase1?: Vs;
  selfplayGames?: number | null;
  gauntletElo?: Gauntlet;
  visits: number;
  lastMs: number | null;
  status: string;
};

function fmtElo(g: NonNullable<Gauntlet>): string {
  if (g.estimatedElo != null && g.eloLo != null && g.eloHi != null && g.eloLo !== g.eloHi) {
    return `${g.eloLabel} (${g.eloLo}–${g.eloHi})`;
  }
  return g.eloLabel;
}

export function CardPanel({
  paramCount,
  seed,
  source,
  vsRandom,
  vsPhase1 = null,
  selfplayGames = null,
  gauntletElo = null,
  visits,
  lastMs,
  status,
}: Props) {
  const millions = (paramCount / 1e6).toFixed(2);
  const trained = source !== "random";
  const flopsM = (FLOPS_PER_EVAL / 1e6).toFixed(0);
  const flopsMove = ((FLOPS_PER_EVAL * visits) / 1e6).toFixed(0);
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-elevated p-5 ring-1 ring-border">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Efficiency card</p>
        <h2 className="font-display text-xl font-medium tracking-tight text-fg">{MODEL_NAME}</h2>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-muted">Lichess Elo</dt>
          <dd className="font-mono tabular-nums text-fg">— · BOT later</dd>
        </div>
        <div>
          <dt className="text-muted">64-visit gauntlet</dt>
          <dd className="font-mono tabular-nums text-fg">
            {gauntletElo
              ? `${fmtElo(gauntletElo)} vs SF ${gauntletElo.stockfish}`
              : "rating…"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Parameters</dt>
          <dd className="font-mono tabular-nums text-fg">
            {paramCount.toLocaleString()} · {millions}M
          </dd>
        </div>
        <div>
          <dt className="text-muted">FLOPs / move</dt>
          <dd className="font-mono tabular-nums text-fg">
            {flopsM}M × {visits} = {flopsMove}M
          </dd>
        </div>
        <div>
          <dt className="text-muted">This move</dt>
          <dd className="font-mono tabular-nums text-fg">
            {visits === ONE_VISIT ? "1-visit" : `${PLAY_VISITS}-visit`}
            {lastMs != null ? ` · ${lastMs} ms` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cap</dt>
          <dd className="font-mono tabular-nums text-fg">{`< ${(PARAM_CAP / 1e6).toFixed(0)}M`}</dd>
        </div>
        <div>
          <dt className="text-muted">Weights</dt>
          <dd className="font-mono tabular-nums text-fg">
            {trained ? source : `random · seed ${seed}`}
          </dd>
        </div>
        {selfplayGames != null && selfplayGames > 0 && (
          <div>
            <dt className="text-muted">Self-play</dt>
            <dd className="font-mono tabular-nums text-fg">{selfplayGames} games × 64 visits</dd>
          </div>
        )}
        {vsRandom && (
          <div className="col-span-2">
            <dt className="text-muted">1-visit vs random-move</dt>
            <dd className="font-mono tabular-nums text-fg">
              {vsRandom.wins}–{vsRandom.draws}–{vsRandom.losses} / {vsRandom.games}
              {vsRandom.passed ? " · beats random" : " · void"}
            </dd>
          </div>
        )}
        {vsPhase1 && (
          <div className="col-span-2">
            <dt className="text-muted">1-visit vs Phase 1 net</dt>
            <dd className="font-mono tabular-nums text-fg">
              {vsPhase1.wins}–{vsPhase1.draws}–{vsPhase1.losses} / {vsPhase1.games}
              {vsPhase1.score != null ? ` · ${(vsPhase1.score * 100).toFixed(0)}%` : ""}
            </dd>
          </div>
        )}
        {gauntletElo?.levels && gauntletElo.levels.length > 0 && (
          <div className="col-span-2">
            <dt className="text-muted">vs SF UCI_Elo (64-visit)</dt>
            <dd className="font-mono tabular-nums text-fg">
              {gauntletElo.levels
                .map((lv) => `${lv.uciElo} ${lv.wins}–${lv.draws}–${lv.losses}`)
                .join(" · ")}
            </dd>
          </div>
        )}
      </dl>
      <p className="rounded-md bg-subtle px-3 py-2 text-sm leading-relaxed text-muted">{status}</p>
      <p className="text-xs leading-relaxed text-muted">
        1-visit and 64-visit Elo are different claims. The published number is 64-visit vs Stockfish
        UCI_Elo only. Lichess humans and Lichess bots are different pools — we will never mix them.
        {gauntletElo
          ? ""
          : trained
            ? " Gauntlet running or pending — no number on the card until it finishes."
            : " Phase 0 is the random net — play it anyway."}
      </p>
    </section>
  );
}
