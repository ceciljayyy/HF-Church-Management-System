'use client';

import { Component, type ErrorInfo } from 'react';
import { cn } from '@/lib/utils';

class ChartErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[chart] render failed', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">Unable to render this chart.</div>;
    }

    return this.props.children;
  }
}

export function ChartCard({
  title,
  description,
  children,
  className,
  loading = false,
  error,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-glow', className)}>
      <div className="mb-4 min-w-0">
        <h3 className="truncate text-sm font-semibold text-primary">{title}</h3>
        {description ? <p className="mt-1 text-xs text-secondary">{description}</p> : null}
      </div>
      {loading ? (
        <div className="h-[300px] rounded-lg border border-border bg-surface skeleton-shimmer" />
      ) : error ? (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : (
        <ChartErrorBoundary>{children}</ChartErrorBoundary>
      )}
    </div>
  );
}
