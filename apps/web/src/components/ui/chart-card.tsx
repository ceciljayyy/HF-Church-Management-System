export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-glow">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}