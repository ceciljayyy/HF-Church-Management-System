export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  className = '',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-glow ${className}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-secondary">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary"
            >
              Close
            </button>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
