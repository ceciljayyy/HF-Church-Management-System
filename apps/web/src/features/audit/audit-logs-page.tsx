'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

function moduleFor(log: AuditLog) {
  const value = log.newValue as { module?: string } | null;
  return value?.module ?? log.entity;
}

function cleanAction(action: string) {
  return action.replaceAll('_', ' ').toLowerCase();
}

export function AuditLogsPageClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({ search: '', action: '', entity: '', from: '', to: '' });

  async function load(nextFilters = filters) {
    setError('');
    try {
      const payload = await apiClient.listResource('audit-logs', { ...nextFilters, limit: 50 });
      setLogs(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    load(filters);
  }

  function resetFilters() {
    const empty = { search: '', action: '', entity: '', from: '', to: '' };
    setFilters(empty);
    setLoading(true);
    load(empty);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="Review security events, profile changes, finance actions, people updates, and system activity." />

      <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm text-secondary">
            <span>Search</span>
            <input className={inputClass} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="User, action, entity" />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Action</span>
            <input className={inputClass} value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} placeholder="LOGIN, UPDATE" />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Module / Entity</span>
            <input className={inputClass} value={filters.entity} onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value }))} placeholder="User, Person" />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>From</span>
            <input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>To</span>
            <input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen">
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </form>

      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-primary">System Activity</h3>
          <Badge>{`${logs.length} records`}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Module</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={6} columns={6} showFilters={false} />
                  </td>
                </tr>
              ) : null}
              {!loading && logs.map((log) => (
                <tr key={log.id} className="text-secondary transition hover:bg-hover">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <p className="text-primary">{log.user?.name ?? 'System'}</p>
                    <p className="text-xs text-muted">{log.user?.email ?? log.ipAddress ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{moduleFor(log)}</td>
                  <td className="px-4 py-3 capitalize">{cleanAction(log.action)}</td>
                  <td className="px-4 py-3">{log.entity}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelected(log)} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary transition hover:bg-hover">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!logs.length && !loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-secondary">No audit logs found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-glow">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold capitalize text-primary">{cleanAction(selected.action)}</h3>
                <p className="mt-1 text-sm text-secondary">{selected.entity} {selected.entityId ? `- ${selected.entityId}` : ''}</p>
              </div>
              <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className="rounded-lg border border-border bg-surface p-2 text-secondary transition hover:bg-hover hover:text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <JsonBlock title="Old Value" value={selected.oldValue} />
              <JsonBlock title="New Value" value={selected.newValue} />
            </div>
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
              <p>User agent: {selected.userAgent ?? 'Unknown'}</p>
              <p className="mt-1">IP address: {selected.ipAddress ?? 'Unknown'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h4 className="mb-3 text-sm font-semibold text-primary">{title}</h4>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs text-secondary">{JSON.stringify(value ?? {}, null, 2)}</pre>
    </div>
  );
}
