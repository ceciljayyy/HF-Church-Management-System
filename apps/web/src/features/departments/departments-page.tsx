'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import type { DepartmentRecord, Paginated } from './department-types';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

function statusBadge(status: string) {
  return <Badge className={status === 'ACTIVE' ? 'border-green/40 bg-green/10 text-green' : 'border-muted/40 bg-muted/10 text-muted'}>{status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>;
}

export function DepartmentsPageClient({ initialData }: { initialData: Paginated<DepartmentRecord> }) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.pagination?.page ?? 1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDepartments(next?: { page?: number; search?: string; status?: string }) {
    setLoading(true);
    setError('');
    const nextPage = next?.page ?? page;
    try {
      const response = await apiClient.listResource('departments', {
        page: nextPage,
        limit: data.pagination?.limit ?? 20,
        search: next?.search ?? search,
        status: next?.status ?? status,
      });
      setData(response);
      setPage(response.pagination?.page ?? nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = String(new FormData(event.currentTarget).get('search') ?? '');
    setSearch(nextSearch);
    loadDepartments({ search: nextSearch, page: 1 });
  }

  function goToPage(nextPage: number) {
    const totalPages = data.pagination?.totalPages ?? 1;
    loadDepartments({ page: Math.max(1, Math.min(nextPage, totalPages)) });
  }

  const rows = useMemo(
    () =>
      (data.items ?? []).map((department) => [
        <Link key={`${department.id}-name`} href={`/departments/${department.id}`} className="font-medium text-primary hover:text-lime">
          {department.name}
        </Link>,
        department.meetingDay ?? 'Department Head',
        department.leader ? `${department.leader.firstName} ${department.leader.lastName}` : 'No leader assigned',
        department._count?.members ?? 0,
        statusBadge(department.status),
        department.updatedAt ? new Date(department.updatedAt).toLocaleDateString() : '-',
        <Link key={`${department.id}-view`} href={`/departments/${department.id}`} className="inline-flex items-center justify-end gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-lime transition hover:bg-hover">
          <Eye className="h-4 w-4" />
          View More
        </Link>,
      ]),
    [data.items],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Create departments, assign leaders, manage positions, and transfer members across ministry teams."
        actions={
          <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-lime to-green px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110">
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        }
      />

      <form onSubmit={submitSearch}>
        <FilterBar>
          <div className="min-w-0 sm:col-span-2 lg:min-w-64 lg:flex-1">
            <SearchInput placeholder="Search departments" defaultValue={search} />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              loadDepartments({ status: event.target.value, page: 1 });
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary outline-none lg:w-auto"
          >
            <option value="">Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
        </FilterBar>
      </form>

      {message ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{message}</div> : null}
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {loading ? <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-secondary">Loading departments...</div> : null}

      {rows.length ? (
        <DataTable columns={['Department', 'Head Position', 'Head of Department', 'Members', 'Status', 'Last Updated', 'Actions']} rows={rows} minWidthClass="min-w-[1040px]" />
      ) : (
        <EmptyState title="No departments yet" description="Create a department to start assigning leaders, positions, and members." />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{data.pagination?.total ?? data.items?.length ?? 0} total departments</span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" disabled={loading || (data.pagination?.page ?? page) <= 1} onClick={() => goToPage((data.pagination?.page ?? page) - 1)} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <span className="whitespace-nowrap">Page {data.pagination?.page ?? page} of {data.pagination?.totalPages ?? 1}</span>
          <button type="button" disabled={loading || (data.pagination?.page ?? page) >= (data.pagination?.totalPages ?? 1)} onClick={() => goToPage((data.pagination?.page ?? page) + 1)} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>

      <AddDepartmentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setMessage('Department created successfully.');
          loadDepartments({ page: 1 });
        }}
      />
    </div>
  );
}

function AddDepartmentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) {
      setError('Department name is required.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.request('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name,
          leaderTitle: form.get('leaderTitle'),
          description: form.get('description'),
          status: form.get('status'),
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create department.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Add Department" subtitle="Create a church department and assign members from the detail page." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        <label className="space-y-2 text-sm text-secondary">
          <span>Department Name</span>
          <input name="name" className={inputClass} />
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Leader Title / Head Title</span>
          <input name="leaderTitle" className={inputClass} placeholder="Chief Usher, Music Director, Coordinator" />
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Description</span>
          <textarea name="description" className={`${inputClass} min-h-24 resize-y`} />
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Status</span>
          <select name="status" className={inputClass} defaultValue="ACTIVE">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">{saving ? 'Saving...' : 'Save Department'}</button>
        </div>
      </form>
    </Modal>
  );
}
