export function ActivityItem({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-sm text-primary">{title}</p>
      {description ? <p className="mt-1 text-xs text-secondary">{description}</p> : null}
    </div>
  );
}