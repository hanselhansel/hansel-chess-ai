const STAGES = [
  {
    n: "0",
    title: "Play",
    body: "An untrained net demonstrates legal moves and the search tree.",
  },
  {
    n: "1",
    title: "Learn",
    body: "Human games train the policy. Random-move controls are recorded separately.",
  },
  {
    n: "2",
    title: "Climb",
    body:
      "Self-play trains candidate checkpoints. Each recorded result states its search budget.",
  },
] as const;

export function Roadmap() {
  return (
    <section aria-labelledby="project-stages">
      <h2
        id="project-stages"
        className="text-xs font-medium uppercase tracking-[0.16em] text-muted"
      >
        Project stages
      </h2>
      <ol className="mt-2 grid gap-3 sm:grid-cols-3">
        {STAGES.map((p) => (
          <li
            key={p.n}
            className="rounded-xl bg-elevated p-4 ring-1 ring-border"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Stage {p.n}
            </p>
            <p className="mt-1 font-display text-lg text-fg">{p.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
