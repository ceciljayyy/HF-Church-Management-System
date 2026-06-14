import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton({ trend = false }: { trend?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-glow" aria-hidden="true">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-24" />
          {trend ? <Skeleton className="h-3 w-36" /> : null}
        </div>
        <Skeleton className="h-11 w-11" rounded="rounded-2xl" />
      </div>
    </div>
  );
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <StatCardSkeleton key={index} trend={index % 2 === 0} />
      ))}
    </section>
  );
}
