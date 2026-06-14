'use client';

import { FormEvent, useMemo, useState } from 'react';
import { MoreVertical, Pencil, Repeat2, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { apiClient } from '@/lib/api-client';
import type { DepartmentMembership, DepartmentRecord, Paginated } from './department-types';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

function personName(member: DepartmentMembership) {
  return `${member.person.firstName} ${member.person.lastName}`.trim();
}

function roleBadge(role?: string | null) {
  return <Badge className={role === 'HEAD' ? 'border-lime/40 bg-lime/10 text-lime' : undefined}>{role === 'HEAD' ? 'Head/Leader' : 'Member'}</Badge>;
}

export function DepartmentRolesPageClient({ initialData }: { initialData: Paginated<DepartmentMembership> }) {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.pagination?.page ?? 1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DepartmentMembership | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRoles(next?: { page?: number; role?: string; search?: string }) {
    setLoading(true);
    setError('');
    const nextPage = next?.page ?? page;
    try {
      const response = await apiClient.listResource('departments/roles', {
        page: nextPage,
        limit: data.pagination?.limit ?? 20,
        role: next?.role ?? role,
        search: next?.search ?? search,
      });
      setData(response);
      setPage(response.pagination?.page ?? nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load department roles.');
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = String(new FormData(event.currentTarget).get('search') ?? '');
    setSearch(nextSearch);
    loadRoles({ search: nextSearch, page: 1 });
  }

  const rows = useMemo(
    () =>
      (data.items ?? []).map((member) => [
        <span key={`${member.id}-name`} className="font-medium text-primary">{personName(member)}</span>,
        member.group?.name ?? 'Department',
        member.status ?? 'Member',
        roleBadge(member.role),
        <div key={`${member.id}-actions`} className="relative flex justify-end">
          <button type="button" aria-label={`Open actions for ${personName(member)}`} onClick={() => setOpenMenuId((current) => (current === member.id ? null : member.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition hover:bg-hover hover:text-primary">
            <MoreVertical className="h-4 w-4" />
          </button>
          {openMenuId === member.id ? (
            <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-glow">
              <button type="button" onClick={() => { setEditing(member); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary">
                <Pencil className="h-4 w-4" />
                Update Role
              </button>
              <button type="button" onClick={() => { setEditing(member); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary">
                <Repeat2 className="h-4 w-4" />
                Transfer
              </button>
            </div>
          ) : null}
        </div>,
      ]),
    [data.items, openMenuId],
  );

  function goToPage(nextPage: number) {
    const totalPages = data.pagination?.totalPages ?? 1;
    loadRoles({ page: Math.max(1, Math.min(nextPage, totalPages)) });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Department Roles" subtitle="Filter and update department heads, members, positions, and transfers." />

      <form onSubmit={submitSearch}>
        <FilterBar>
          <div className="min-w-0 sm:col-span-2 lg:min-w-64 lg:flex-1">
            <SearchInput placeholder="Search users, departments, or positions" defaultValue={search} />
          </div>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              loadRoles({ role: event.target.value, page: 1 });
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary outline-none lg:w-auto"
          >
            <option value="">All users</option>
            <option value="HEAD">Heads of departments only</option>
            <option value="MEMBER">Members only</option>
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
        </FilterBar>
      </form>

      {message ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{message}</div> : null}
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {loading ? (
        <TableSkeleton rows={6} columns={5} showFilters={false} />
      ) : (
        <DataTable columns={['User', 'Department', 'Position', 'Role Type', 'Actions']} rows={rows} minWidthClass="min-w-[860px]" />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{data.pagination?.total ?? data.items?.length ?? 0} total role assignments</span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" disabled={loading || (data.pagination?.page ?? page) <= 1} onClick={() => goToPage((data.pagination?.page ?? page) - 1)} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <span className="whitespace-nowrap">Page {data.pagination?.page ?? page} of {data.pagination?.totalPages ?? 1}</span>
          <button type="button" disabled={loading || (data.pagination?.page ?? page) >= (data.pagination?.totalPages ?? 1)} onClick={() => goToPage((data.pagination?.page ?? page) + 1)} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>

      {editing ? (
        <EditRoleDialog
          member={editing}
          departments={data.departments ?? []}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setMessage('Department role updated.');
            await loadRoles();
          }}
        />
      ) : null}
    </div>
  );
}

function EditRoleDialog({ member, departments, onClose, onSaved }: { member: DepartmentMembership; departments: DepartmentRecord[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await apiClient.request(`/departments/members?id=${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          departmentId: form.get('departmentId'),
          position: form.get('position'),
          roleType: form.get('roleType'),
        }),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Update Department Role" subtitle="Change role type, position, or transfer this user to another department." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        <p className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-secondary">User: {personName(member)}</p>
        <label className="space-y-2 text-sm text-secondary">
          <span>Department</span>
          <select name="departmentId" className={inputClass} defaultValue={member.group?.id}>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Position</span>
          <input name="position" className={inputClass} defaultValue={member.status ?? ''} />
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Role Type</span>
          <select name="roleType" className={inputClass} defaultValue={member.role === 'HEAD' ? 'HEAD' : 'MEMBER'}>
            <option value="MEMBER">Member</option>
            <option value="HEAD">Head/Leader</option>
          </select>
        </label>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
