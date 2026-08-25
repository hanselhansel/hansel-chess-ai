import { MODEL_NAME, ONE_VISIT, PARAM_CAP, PLAY_VISITS } from "@/lib/chess/constants";

type Props = {
  paramCount: number;
  seed: number;
  visits: number;
  lastMs: number | null;
  status: string;
};

export function CardPanel({ paramCount, seed, visits, lastMs, status }: Props) {
  const millions = (paramCount / 1e6).toFixed(2);
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
          <dd className="font-mono tabular-nums text-fg">random · seed {seed}</dd>
        </div>
      </dl>
      <p className="rounded-md bg-subtle px-3 py-2 text-sm leading-relaxed text-muted">{status}</p>
      <p className="text-xs leading-relaxed text-muted">
        1-visit and 64-visit Elo are different claims. We will never print them as one number.
        Gauntlet Elo lands after supervised training. Phase 0 is the random net — play it anyway.
      </p>
    </section>
  );
}
