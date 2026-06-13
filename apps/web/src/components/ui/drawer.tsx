export function Drawer({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card p-6 shadow-glow">
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}