import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full border border-border bg-gradient-to-br from-lime/20 to-green/10 text-sm font-semibold text-lime', className)}>
      {initials}
    </div>
  );
}