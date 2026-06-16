'use client';

import { PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SidebarToggle({
  expanded,
  onClick,
  className,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? (expanded ? 'Close navigation' : 'Open navigation')}
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-secondary transition hover:border-lime/40 hover:bg-hover hover:text-lime',
        className,
      )}
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}
