import { Skeleton } from '@/components/ui/skeleton';
import { LAYOUT } from '@/lib/layout-constants';
import { ChartSkeleton } from './chart-skeleton';
import { PageHeaderSkeleton } from './page-header-skeleton';
import { StatCardGridSkeleton, StatCardSkeleton } from './stat-card-skeleton';
import { TableSkeleton } from './table-skeleton';

export function DashboardSkeleton({ includeRightPanel = false }: { includeRightPanel?: boolean }) {
  return (
    <div className="flex min-w-0 gap-6" aria-busy="true" aria-live="polite">
      <div className="min-w-0 flex-1 space-y-6">
        <PageHeaderSkeleton actions={0} />
        <StatCardGridSkeleton count={4} />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, index) => <StatCardSkeleton key={index} />)}
        </section>
        <section className="grid gap-5 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </section>
        <section className="grid gap-5 xl:grid-cols-2">
          <TableSkeleton rows={5} columns={3} showFilters={false} />
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border bg-surface p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      {includeRightPanel ? <DashboardRightPanelSkeleton /> : null}
    </div>
  );
}

export function DashboardRightPanelSkeleton() {
  return (
    <aside
      style={{ width: LAYOUT.rightPanel }}
      className="fixed inset-y-0 right-0 z-30 hidden h-screen shrink-0 space-y-6 overflow-y-auto overflow-x-hidden overscroll-contain border-l border-border bg-surface/90 px-5 py-6 pb-8 xl:block"
      aria-hidden="true"
    >
      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section} className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
