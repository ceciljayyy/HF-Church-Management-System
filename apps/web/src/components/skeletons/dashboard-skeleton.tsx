import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from './chart-skeleton';
import { PageHeaderSkeleton } from './page-header-skeleton';
import { StatCardGridSkeleton } from './stat-card-skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={0} />
      <StatCardGridSkeleton count={4} />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => <ChartSkeleton key={index} />)}
        </div>
        <div className="hidden rounded-lg border border-border bg-card p-5 xl:block">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="my-5 border-t border-border" />
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
