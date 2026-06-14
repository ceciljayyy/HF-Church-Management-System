import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderSkeleton } from './page-header-skeleton';
import { StatCardGridSkeleton } from './stat-card-skeleton';
import { TableSkeleton } from './table-skeleton';

export function PageShellSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={4} />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background text-primary" aria-busy="true" aria-live="polite">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-surface/95 p-5 lg:block">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-11 w-11" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, section) => (
            <div key={section} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              {Array.from({ length: section === 1 ? 5 : 4 }).map((__, item) => (
                <Skeleton key={item} className="h-11 w-full" />
              ))}
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-4 lg:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-6 w-64 max-w-[55vw]" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-10 w-10 sm:block" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-11 w-40" />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:px-5 lg:px-6">
          <PageShellSkeleton />
        </main>
      </div>
    </div>
  );
}
