import { cn, formatNumber } from '@/lib/utils';

export function StatCard({
  label,
  value,
  delta,
  icon,
  accent = 'lime',
}: {
  label: string;
  value: number | string;
  delta?: string;
  icon: React.ReactNode;
  accent?: 'lime' | 'green' | 'info' | 'warning' | 'danger';
}) {
  const accentClasses: Record<string, string> = {
    lime: 'from-lime/20 to-lime/5 text-lime',
    green: 'from-green/20 to-green/5 text-green',
    info: 'from-info/20 to-info/5 text-info',
    warning: 'from-warning/20 to-warning/5 text-warning',
    danger: 'from-danger/20 to-danger/5 text-danger',
  };

  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-glow transition hover:-translate-y-0.5 hover:bg-hover">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-secondary">{label}</p>
          <h3 className="mt-2 break-words text-xl font-semibold leading-tight text-primary sm:text-2xl">{displayValue}</h3>
          {delta ? <p className="mt-2 min-w-0 break-words text-xs text-secondary">{delta}</p> : null}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br', accentClasses[accent])}>{icon}</div>
      </div>
    </div>
  );
}
