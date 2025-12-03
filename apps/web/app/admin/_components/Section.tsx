export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">{children}</div>
    </section>
  );
}
