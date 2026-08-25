import { MODEL_NAME, ONE_VISIT, PARAM_CAP, PLAY_VISITS } from "@/lib/chess/constants";

type Vs = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  visits?: number;
  passed?: boolean;
  score?: number;
} | null;

type Props = {
  paramCount: number;
  seed: number;
  source: string;
  vsRandom: Vs;
  vsPhase1?: Vs;
  selfplayGames?: number | null;
  visits: number;
  lastMs: number | null;
  status: string;
};

export function CardPanel({
  paramCount,
  seed,
  source,
  vsRandom,
  vsPhase1 = null,
  selfplayGames = null,
  visits,
  lastMs,
  status,
}: Props) {
  const millions = (paramCount / 1e6).toFixed(2);
  const trained = source !== "random";
  const phase2 = source === "selfplay-64";
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-elevated p-5 ring-1 ring-border">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Efficiency card</p>
        <h2 className="font-display text-xl font-medium tracking-tight text-fg">{MODEL_NAME}</h2>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-muted">Parameters</dt>
          <dd className="font-mono tabular-nums text-fg">
            {paramCount.toLocaleString()} · {millions}M
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cap</dt>
          <dd className="font-mono tabular-nums text-fg">{`< ${(PARAM_CAP / 1e6).toFixed(0)}M`}</dd>
        </div>
        <div>
          <dt className="text-muted">This move</dt>
          <dd className="font-mono tabular-nums text-fg">
            {visits === ONE_VISIT ? "1-visit" : `${PLAY_VISITS}-visit`}
            {lastMs != null ? ` · ${lastMs} ms` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Weights</dt>
          <dd className="font-mono tabular-nums text-fg">
            {trained ? source : `random · seed ${seed}`}
          </dd>
        </div>
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
        {selfplayGames != null && selfplayGames > 0 && (
          <div className="col-span-2">
            <dt className="text-muted">Self-play</dt>
            <dd className="font-mono tabular-nums text-fg">{selfplayGames} games at 64 visits</dd>
          </div>
        )}
      </dl>
      <p className="rounded-md bg-subtle px-3 py-2 text-sm leading-relaxed text-muted">{status}</p>
      <p className="text-xs leading-relaxed text-muted">
        1-visit and 64-visit Elo are different claims. We will never print them as one number.
        {phase2
          ? " No published Elo — this is a self-play checkpoint, not a rating."
          : trained
            ? " No published Elo yet — this is the supervised checkpoint, not a rating."
            : " Gauntlet Elo lands after supervised training. Phase 0 is the random net — play it anyway."}
      </p>
    </section>
  );
}

