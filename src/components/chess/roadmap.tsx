const PHASES = [
  { n: "0", title: "Play", body: "Random net. Legal chess, visible tree." },
  { n: "1", title: "Learn", body: "Lichess games teach the policy. Must beat a random-move bot." },
  { n: "2", title: "Climb", body: "Self-play at 64 visits. Published Elo is 64-visit vs Stockfish — currently <1320." },
] as const;

export function Roadmap({ current = 0 }: { current?: number }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {PHASES.map((p, i) => (
        <li
          key={p.n}
          className={
            i === current
              ? "rounded-xl bg-elevated p-4 ring-1 ring-accent/40"
              : "rounded-xl bg-elevated/70 p-4 ring-1 ring-border"
          }
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Phase {p.n}
            {i === current ? " · current" : i < current ? " · done" : " · later"}
          </p>
          <p className="mt-1 font-display text-lg text-fg">{p.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>
        </li>
      ))}
    </ol>
  );
}
