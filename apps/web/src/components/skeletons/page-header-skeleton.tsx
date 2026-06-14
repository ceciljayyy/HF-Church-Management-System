import { Skeleton } from '@/components/ui/skeleton';

export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" aria-hidden="true">
      <div className="min-w-0 space-y-3">
        <Skeleton className="h-8 w-44 sm:w-64" />
        <Skeleton className="h-4 w-64 max-w-full sm:w-96" />
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-32" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
