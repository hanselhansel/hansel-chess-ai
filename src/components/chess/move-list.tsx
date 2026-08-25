type Props = {
  sans: string[];
};

export function MoveList({ sans }: Props) {
  const rows: { n: number; w?: string; b?: string }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: sans[i], b: sans[i + 1] });
  }
  return (
    <section className="rounded-xl bg-elevated p-4 ring-1 ring-border">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Moves</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Click a piece, then a highlighted square.</p>
      ) : (
        <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm tabular-nums sm:grid-cols-3">
          {rows.map((r) => (
            <li key={r.n} className="flex gap-2 text-fg">
              <span className="w-6 text-muted">{r.n}.</span>
              <span className="w-10">{r.w}</span>
              <span className="w-10 text-muted">{r.b ?? ""}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
