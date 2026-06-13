export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}