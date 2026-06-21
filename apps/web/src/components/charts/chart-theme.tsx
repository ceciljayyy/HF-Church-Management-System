export const chartColors = {
  axis: 'rgb(var(--color-secondary))',
  grid: 'rgb(var(--color-border))',
  muted: 'rgb(var(--color-muted))',
  card: 'rgb(var(--color-card))',
  primary: 'rgb(var(--color-primary))',
  lime: 'rgb(var(--color-lime))',
  green: 'rgb(var(--color-green))',
  danger: 'rgb(var(--color-danger))',
  warning: 'rgb(var(--color-warning))',
  info: 'rgb(var(--color-info))',
};

export const chartAxis = { fill: chartColors.axis, fontSize: 12 };

export const tooltipStyle = {
  background: chartColors.card,
  border: `1px solid ${chartColors.grid}`,
  borderRadius: 12,
  color: chartColors.primary,
};

export function EmptyChart({ message = 'No chart data yet.' }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/40 px-4 text-center text-sm text-secondary">
      {message}
    </div>
  );
}
