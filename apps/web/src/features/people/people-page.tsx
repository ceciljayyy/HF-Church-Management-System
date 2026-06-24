'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Download, Eye, FileUp, MoreVertical, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { AddPersonDialog } from './add-person-dialog';
import { ImportPeopleDialog } from './import-people-dialog';
import type { PeopleListResponse, PersonRecord } from './people-types';

function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission) || permissions.includes('admin.*');
}

function displayName(person: PersonRecord) {
  return [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
    .filter(Boolean)
    .join(' ');
}

function familyName(person: PersonRecord) {
  return person.familyMembers?.[0]?.family?.familyName ?? 'Unassigned';
}

function statusBadge(person: PersonRecord) {
  const archived = Boolean(person.deletedAt);
  return (
    <Badge className={archived ? 'border-muted/40 bg-muted/10 text-muted' : 'border-green/40 bg-green/10 text-green'}>
      {archived ? 'Archived' : 'Active'}
    </Badge>
  );
}

export function PeoplePageClient({
  initialData,
  permissions,
  openAddUser = false,
  returnTo,
}: {
  initialData: PeopleListResponse;
  permissions: string[];
  openAddUser?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialData.pagination?.page ?? 1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [classification, setClassification] = useState('');
  const [addOpen, setAddOpen] = useState(openAddUser);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [editingPerson, setEditingPerson] = useState<PersonRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<'archive' | 'hardDelete' | null>(null);
  const [bulkConfirmText, setBulkConfirmText] = useState('');

  const canCreate = hasPermission(permissions, 'people.create');
  const canImport = hasPermission(permissions, 'people.import') || canCreate;
  const canUpdate = hasPermission(permissions, 'people.update');
  const canArchive = hasPermission(permissions, 'people.archive');

  async function loadPeople(next?: { search?: string; status?: string; classification?: string; page?: number }) {
    setLoading(true);
    setError('');
    const nextPage = next?.page ?? page;
    try {
      const response = await apiClient.listResource('people', {
        page: nextPage,
        limit: data.pagination?.limit ?? 20,
        search: next?.search ?? search,
        status: next?.status ?? status,
        classification: next?.classification ?? classification,
      });
      setData(response);
      setPage(response.pagination?.page ?? nextPage);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load people.');
      showErrorToast(err, 'Unable to load people.');
    } finally {
      setLoading(false);
    }
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSearch = String(form.get('search') ?? '');
    setSearch(nextSearch);
    loadPeople({ search: nextSearch, page: 1 });
  }

  function goToPage(nextPage: number) {
    const totalPages = data.pagination?.totalPages ?? 1;
    const safePage = Math.max(1, Math.min(nextPage, totalPages));
    loadPeople({ page: safePage });
  }

  async function removePerson(person: PersonRecord, mode: 'archive' | 'delete') {
    setOpenMenuId(null);
    const label = mode === 'archive' ? 'archive' : 'permanently delete';
    if (!window.confirm(`Are you sure you want to ${label} ${displayName(person)}?`)) return;

    setLoading(true);
    setError('');
    try {
      await apiClient.request(`/people?id=${person.id}&mode=${mode}`, { method: 'DELETE' });
      await loadPeople();
      showSuccessToast(mode === 'archive' ? 'Person archived successfully.' : 'Person deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${mode} person.`);
      showErrorToast(err, `Unable to ${mode} person.`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    const visibleIds = (data.items ?? []).map((person) => person.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => (allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  }

  async function runBulkAction() {
    if (!bulkMode || !selectedIds.length || bulkConfirmText !== 'DELETE') return;
    setLoading(true);
    try {
      const response = await apiClient.request<{ count: number; mode: string }>('/people/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ personIds: selectedIds, mode: bulkMode }),
      });
      showSuccessToast(`${response.count} people ${bulkMode === 'archive' ? 'archived' : 'deleted'} successfully.`);
      setBulkMode(null);
      setBulkConfirmText('');
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete bulk action.');
      showErrorToast(err, 'Unable to complete bulk action.');
    } finally {
      setLoading(false);
    }
  }

  const rows =
    (data.items ?? []).map((person) => [
        <input
          key={`${person.id}-select`}
          aria-label={`Select ${displayName(person)}`}
          type="checkbox"
          checked={selectedIds.includes(person.id)}
          onChange={() => toggleSelected(person.id)}
          className="h-4 w-4 rounded border-border bg-surface"
        />,
        <button key={`${person.id}-name`} className="text-left font-medium text-primary hover:text-lime" onClick={() => setSelectedPerson(person)}>
          {displayName(person)}
        </button>,
        person.email ?? 'No email',
        person.mobilePhone ?? person.phone ?? 'No phone',
        <Badge key={`${person.id}-classification`}>{person.classification ?? 'Unassigned'}</Badge>,
        familyName(person),
        statusBadge(person),
        new Date(person.createdAt).toLocaleDateString(),
        <div key={`${person.id}-actions`} className="relative flex justify-end">
          <button
            type="button"
            aria-label={`Open actions for ${displayName(person)}`}
            onClick={() => setOpenMenuId((current) => (current === person.id ? null : person.id))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition hover:bg-hover hover:text-primary"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {openMenuId === person.id ? (
            <div className="absolute right-0 top-10 z-30 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-glow">
            <button
              type="button"
              onClick={() => {
                setSelectedPerson(person);
                setOpenMenuId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary"
            >
              <Eye className="h-4 w-4" />
              View
            </button>
              {canUpdate ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPerson(person);
                    setOpenMenuId(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              ) : null}
              {canArchive ? (
                <>
                  <button
                    type="button"
                    onClick={() => removePerson(person, 'archive')}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => removePerson(person, 'delete')}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger transition hover:bg-danger/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>,
      ]);

  const visibleIds = (data.items ?? []).map((person) => person.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="People Directory"
        subtitle="Manage all people, visitors, contacts, and ministry records from one searchable church directory."
        actions={
          <>
            {canImport ? (
              <Link
                href="/people/duplicates"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-hover"
              >
                Review Duplicates
              </Link>
            ) : null}
            {canImport ? (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-hover"
              >
                <FileUp className="h-4 w-4" />
                Import Data
              </button>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-lime to-green px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Add Person
              </button>
            ) : null}
          </>
        }
      />

      <form onSubmit={onSearch}>
        <FilterBar>
          <div className="min-w-0 sm:col-span-2 lg:min-w-64 lg:flex-1">
            <SearchInput placeholder="Search people by name, email, or phone" defaultValue={search} />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              loadPeople({ status: event.target.value, page: 1 });
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary outline-none lg:w-auto"
          >
            <option value="">Status</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
          <select
            value={classification}
            onChange={(event) => {
              setClassification(event.target.value);
              loadPeople({ classification: event.target.value, page: 1 });
            }}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary outline-none lg:w-auto"
          >
            <option value="">Classification</option>
            {['Visitor', 'First Timer', 'Regular Attendee', 'Member', 'Leader', 'Pastor', 'Staff'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <Download className="h-4 w-4" />
            Export
          </button>
        </FilterBar>
      </form>

      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {selectedIds.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-lime/30 bg-lime/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-primary">{selectedIds.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setBulkMode('archive')} className="rounded-lg border border-border bg-card px-3 py-2 text-primary transition hover:bg-hover">Archive</button>
            <button type="button" onClick={() => setBulkMode('hardDelete')} className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-danger transition hover:bg-danger/20">Delete</button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-border bg-card px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary">Clear selection</button>
          </div>
        </div>
      ) : null}
      {loading ? (
        <TableSkeleton rows={7} columns={9} avatarColumn={true} showFilters={false} />
      ) : rows.length ? (
        <DataTable
          columns={[
            <input key="select-all" aria-label="Select all visible people" type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 rounded border-border bg-surface" />,
            'Name',
            'Email',
            'Phone',
            'Classification',
            'Family',
            'Status',
            'Created At',
            'Actions',
          ]}
          rows={rows}
          minWidthClass="min-w-[1040px]"
        />
      ) : (
        <EmptyState title="No people yet" description="Add a person manually or import a Google Forms CSV export." />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{data.pagination?.total ?? data.items?.length ?? 0} total people</span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button
            type="button"
            disabled={loading || (data.pagination?.page ?? page) <= 1}
            onClick={() => goToPage((data.pagination?.page ?? page) - 1)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="whitespace-nowrap">Page {data.pagination?.page ?? page} of {data.pagination?.totalPages ?? 1}</span>
          <button
            type="button"
            disabled={loading || (data.pagination?.page ?? page) >= (data.pagination?.totalPages ?? 1)}
            onClick={() => goToPage((data.pagination?.page ?? page) + 1)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <AddPersonDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          await loadPeople();
          if (returnTo) router.push(returnTo);
        }}
      />
      <ImportPeopleDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => loadPeople()} />
      <Modal
        open={Boolean(bulkMode)}
        title={bulkMode === 'archive' ? 'Archive Selected People' : 'Delete Selected People'}
        subtitle={`You are about to ${bulkMode === 'archive' ? 'archive' : 'delete'} ${selectedIds.length} people.`}
        onClose={() => {
          setBulkMode(null);
          setBulkConfirmText('');
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            You are about to delete {selectedIds.length} people. This action may affect welfare, departments, funds, attendance, and audit history.
          </p>
          <label className="space-y-2 text-sm text-secondary">
            <span>Type DELETE to confirm</span>
            <input className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-lime" value={bulkConfirmText} onChange={(event) => setBulkConfirmText(event.target.value)} />
          </label>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setBulkMode(null)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
            <button type="button" disabled={bulkConfirmText !== 'DELETE' || loading} onClick={runBulkAction} className="rounded-lg bg-danger px-4 py-3 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:opacity-60">
              Confirm
            </button>
          </div>
        </div>
      </Modal>
      {editingPerson ? (
        <EditPersonDialog
          key={editingPerson.id}
          person={editingPerson}
          onClose={() => setEditingPerson(null)}
          onUpdated={() => loadPeople()}
        />
      ) : null}
      <Modal
        open={Boolean(selectedPerson)}
        title={selectedPerson ? displayName(selectedPerson) : 'Person'}
        subtitle="Person profile summary."
        onClose={() => setSelectedPerson(null)}
      >
        {selectedPerson ? (
          <div className="space-y-3 text-sm text-secondary">
            <p>Email: {selectedPerson.email ?? 'No email'}</p>
            <p>Phone: {selectedPerson.mobilePhone ?? selectedPerson.phone ?? 'No phone'}</p>
            <p>Classification: {selectedPerson.classification ?? 'Unassigned'}</p>
            <p>Family: {familyName(selectedPerson)}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function EditPersonDialog({
  person,
  onClose,
  onUpdated,
}: {
  person: PersonRecord;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [firstName, setFirstName] = useState(person.firstName);
  const [lastName, setLastName] = useState(person.lastName);
  const [email, setEmail] = useState(person.email ?? '');
  const [mobilePhone, setMobilePhone] = useState(person.mobilePhone ?? person.phone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(person.dateOfBirth?.slice(0, 10) ?? '');
  const [classification, setClassification] = useState(person.classification ?? 'Unassigned');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.request(`/people?id=${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          mobilePhone,
          dateOfBirth: dateOfBirth || null,
          classification,
        }),
      });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update person.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

  return (
    <Modal
      open
      title="Edit Person"
      subtitle="Update core contact and classification details."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-secondary">
            <span>First Name</span>
            <input className={inputClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Last Name</span>
            <input className={inputClass} value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Email</span>
            <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Mobile Phone</span>
            <input className={inputClass} value={mobilePhone} onChange={(event) => setMobilePhone(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-secondary">
            <span>Date of Birth</span>
            <input className={inputClass} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm text-secondary md:col-span-2">
            <span>Classification</span>
            <select className={inputClass} value={classification} onChange={(event) => setClassification(event.target.value)}>
              {['Unassigned', 'Visitor', 'First Timer', 'Regular Attendee', 'Member', 'Leader', 'Pastor', 'Staff'].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
