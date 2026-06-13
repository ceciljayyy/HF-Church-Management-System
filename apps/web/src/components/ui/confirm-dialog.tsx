export function ConfirmDialog({ open, title, message }: { open: boolean; title: string; message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-glow">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-2 text-sm text-secondary">{message}</p>
      </div>
    </div>
  );
}