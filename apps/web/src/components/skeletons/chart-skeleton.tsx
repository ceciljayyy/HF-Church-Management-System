import { Skeleton } from '@/components/ui/skeleton';

export function ChartSkeleton({ bars = 8 }: { bars?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5" aria-hidden="true">
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="flex h-52 items-end gap-3">
        {Array.from({ length: bars }).map((_, index) => (
          <Skeleton
            key={index}
            className="w-full"
            height={`${34 + ((index * 17) % 58)}%`}
            rounded="rounded-t-lg rounded-b-sm"
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-3" />
        ))}
      </div>
    </div>
  );
}
