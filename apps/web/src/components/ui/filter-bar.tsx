export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:flex lg:flex-wrap">{children}</div>;
}
