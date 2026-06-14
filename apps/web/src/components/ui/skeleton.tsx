import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  rounded = 'rounded-lg',
  width,
  height,
}: {
  className?: string;
  rounded?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('skeleton-shimmer block bg-[#1F242A]', rounded, className)}
      style={{ width, height }}
    />
  );
}
