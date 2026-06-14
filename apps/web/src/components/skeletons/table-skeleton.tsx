import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({
  rows = 6,
  columns = 5,
  showFilters = true,
  avatarColumn = false,
}: {
  rows?: number;
  columns?: number;
  showFilters?: boolean;
  avatarColumn?: boolean;
}) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {showFilters ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_8rem_8rem]">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="hidden divide-y divide-border md:block">
          <div className="grid gap-4 bg-surface px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid items-center gap-4 px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <div key={columnIndex} className="flex min-w-0 items-center gap-3">
                  {avatarColumn && columnIndex === 0 ? <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" /> : null}
                  <Skeleton className={columnIndex === columns - 1 ? 'h-8 w-16 ml-auto' : 'h-4 w-full max-w-36'} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="divide-y divide-border md:hidden">
          {Array.from({ length: Math.min(rows, 4) }).map((_, rowIndex) => (
            <div key={rowIndex} className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                {avatarColumn ? <Skeleton className="h-10 w-10" rounded="rounded-full" /> : null}
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
