import { cn } from '@/lib/utils';

export function DataTable({
  columns,
  rows,
  minWidthClass = 'min-w-[640px]',
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  minWidthClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="divide-y divide-border md:hidden">
        {rows.map((row, index) => (
          <div key={index} className="space-y-3 p-4">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{columns[cellIndex]}</span>
                <div className="min-w-0 break-words text-secondary">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden max-w-full overflow-x-auto md:block">
        <table className={cn('w-full table-fixed divide-y divide-border text-left text-sm', minWidthClass)}>
          <thead className="bg-surface text-xs uppercase tracking-wide text-secondary">
            <tr>
              {columns.map((column, index) => (
                <th key={column} className={cn('px-4 py-3 font-medium', index === columns.length - 1 && 'w-24 text-right')}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr key={index} className={cn('transition hover:bg-hover/60')}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={cn('min-w-0 break-words px-4 py-4 text-secondary', cellIndex === row.length - 1 && 'text-right')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <div className="border-t border-border px-4 py-8 text-center text-sm text-secondary">
          No records found.
        </div>
      ) : null}
    </div>
  );
}
