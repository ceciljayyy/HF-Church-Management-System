export function NotificationItem({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-sm text-primary">{title}</p>
      <p className="mt-1 text-xs text-secondary">{message}</p>
    </div>
  );
}