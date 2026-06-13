export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  return <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm text-secondary">Page {page} of {totalPages}</div>;
}