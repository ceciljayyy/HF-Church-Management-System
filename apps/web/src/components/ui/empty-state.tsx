export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 rounded-full border border-border bg-surface px-4 py-2 text-lime">✦</div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-secondary">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}