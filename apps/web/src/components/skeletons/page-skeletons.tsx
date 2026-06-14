import { Skeleton } from '@/components/ui/skeleton';
import { ChartSkeleton } from './chart-skeleton';
import { PageHeaderSkeleton } from './page-header-skeleton';
import { StatCardGridSkeleton, StatCardSkeleton } from './stat-card-skeleton';
import { TableSkeleton } from './table-skeleton';

export function PeoplePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={2} />
      <StatCardGridSkeleton count={4} />
      <TableSkeleton rows={7} columns={8} avatarColumn />
    </div>
  );
}

export function DepartmentsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-5 h-8 w-24" />
            <Skeleton className="mt-5 h-10 w-full" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}

export function AttendancePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={3} />
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <StatCardSkeleton key={index} />)}
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <ChartSkeleton />
        <TableSkeleton rows={5} columns={5} showFilters={false} />
      </section>
    </div>
  );
}

export function FinanceOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={8} />
      <section className="grid gap-5 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </section>
      <TableSkeleton rows={5} columns={8} showFilters={false} />
    </div>
  );
}

export function WelfarePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={7} />
      <TableSkeleton rows={7} columns={10} avatarColumn />
    </div>
  );
}

export function ExpensesPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={4} />
      <TableSkeleton rows={7} columns={9} />
    </div>
  );
}

export function FundsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={1} />
      <StatCardGridSkeleton count={4} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-6 h-3 w-full" rounded="rounded-full" />
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={0} />
      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]" aria-hidden="true">
        <aside className="rounded-lg border border-border bg-card p-3">
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        </aside>
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-32" />
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuditLogsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton actions={0} />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
