import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';

export function ModulePage({
  title,
  description,
  rows,
  columns = ['Name', 'Details', 'Status'],
  actionLabel,
  actionHref = '#',
  filters = ['Filter', 'Status', 'Export'],
}: {
  title: string;
  description: string;
  rows: Array<Array<React.ReactNode>>;
  columns?: string[];
  actionLabel?: string;
  actionHref?: string;
  filters?: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          actionLabel ? (
            <Link
              href={actionHref}
              className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90"
            >
              {actionLabel}
            </Link>
          ) : undefined
        }
      />

      <FilterBar>
        <div className="min-w-0 sm:col-span-2 lg:min-w-64 lg:flex-1">
          <SearchInput placeholder={`Search ${title.toLowerCase()}`} />
        </div>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary"
          >
            {filter}
          </button>
        ))}
      </FilterBar>

      {rows.length ? (
        <DataTable columns={columns} rows={rows} />
      ) : (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description={`Create your first ${title.toLowerCase()} record to get started.`}
        />
      )}
    </div>
  );
}
