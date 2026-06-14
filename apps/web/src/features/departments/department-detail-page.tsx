'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreVertical, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PeopleSelector } from '@/components/people/people-selector';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { DepartmentMembership, DepartmentRecord, PersonSummary } from './department-types';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

function personName(person: PersonSummary) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function contact(person: PersonSummary) {
  return person.email ?? person.mobilePhone ?? person.phone ?? 'No contact';
}

function roleBadge(role?: string | null) {
  return <Badge className={role === 'HEAD' ? 'border-lime/40 bg-lime/10 text-lime' : undefined}>{role === 'HEAD' ? 'Head/Leader' : 'Member'}</Badge>;
}

export function DepartmentDetailPageClient({
  initialDepartment,
  people,
  departments,
}: {
  initialDepartment: DepartmentRecord;
  people: PersonSummary[];
  departments: DepartmentRecord[];
}) {
  const [department, setDepartment] = useState(initialDepartment);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentMembership | null>(null);
  const [transferring, setTransferring] = useState<DepartmentMembership | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function reload() {
    try {
      const response = await apiClient.listResource('departments', { id: department.id });
      setDepartment(response.item);
    } catch (err) {
      showErrorToast(err, 'Unable to load department.');
    }
  }

  async function removeMember(member: DepartmentMembership) {
    setOpenMenuId(null);
    if (!window.confirm(`Remove ${personName(member.person)} from ${department.name}?`)) return;
    try {
      await apiClient.request(`/departments/members?id=${member.id}`, { method: 'DELETE' });
      showSuccessToast('Department member removed.');
      await reload();
    } catch (err) {
      showErrorToast(err, 'Unable to remove member.');
    }
  }

  const members = department.members ?? [];
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));
  const visibleMembers = members.slice((page - 1) * pageSize, page * pageSize);

  const rows = visibleMembers.map((member) => [
    <span key={`${member.id}-name`} className="font-medium text-primary">{personName(member.person)}</span>,
    contact(member.person),
    department.name,
    member.status ?? 'Member',
    roleBadge(member.role),
    <div key={`${member.id}-actions`} className="relative flex justify-end">
      <button type="button" aria-label={`Open actions for ${personName(member.person)}`} onClick={() => setOpenMenuId((current) => (current === member.id ? null : member.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition hover:bg-hover hover:text-primary">
        <MoreVertical className="h-4 w-4" />
      </button>
      {openMenuId === member.id ? (
        <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-glow">
          <button type="button" onClick={() => { setEditing(member); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <Pencil className="h-4 w-4" />
            Edit Position
          </button>
          <button type="button" onClick={() => { setTransferring(member); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <Repeat2 className="h-4 w-4" />
            Transfer
          </button>
          <button type="button" onClick={() => removeMember(member)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger transition hover:bg-danger/10">
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      ) : null}
    </div>,
  ]);

  return (
    <div className="space-y-6">
      <Link href="/departments" className="inline-flex items-center gap-2 text-sm text-secondary transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Departments
      </Link>

      <PageHeader
        title={department.name}
        subtitle={department.description ?? 'Department details and member assignments.'}
        actions={
          <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-lime to-green px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110">
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Leader', department.leader ? personName(department.leader) : 'No leader assigned'],
          ['Leader Title', department.meetingDay ?? 'Department Head'],
          ['Members', String(members.length)],
          ['Status', department.status === 'ACTIVE' ? 'Active' : 'Inactive'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {rows.length ? (
        <DataTable columns={['Member', 'Email / Phone', 'Department', 'Position', 'Role Status', 'Actions']} rows={rows} minWidthClass="min-w-[980px]" />
      ) : (
        <EmptyState title="No department members yet" description="Add people to this department and assign their positions." />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{members.length} total members</span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
          <span className="whitespace-nowrap">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-border bg-surface px-3 py-2 text-secondary transition hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-primary">Transfer History</h3>
        {(department.transferHistory ?? []).length ? (
          <DataTable
            columns={['Date', 'Previous Position', 'New Position', 'Reason']}
            rows={(department.transferHistory ?? []).slice(0, 6).map((transfer) => [
              new Date(transfer.transferredAt).toLocaleDateString(),
              transfer.previousPosition ?? '-',
              transfer.newPosition ?? '-',
              transfer.reason ?? '-',
            ])}
          />
        ) : (
          <p className="text-sm text-secondary">No transfer history yet.</p>
        )}
      </div>

      <MemberDialog
        mode="add"
        open={addOpen}
        people={people}
        departments={departments}
        department={department}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          showSuccessToast('Department member saved.');
          await reload();
        }}
      />
      {editing ? (
        <MemberDialog
          mode="edit"
          open
          member={editing}
          people={people}
          departments={departments}
          department={department}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            showSuccessToast('Department role updated.');
            await reload();
          }}
        />
      ) : null}
      {transferring ? (
        <MemberDialog
          mode="transfer"
          open
          member={transferring}
          people={people}
          departments={departments}
          department={department}
          onClose={() => setTransferring(null)}
          onSaved={async () => {
            showSuccessToast('Member transferred successfully.');
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function MemberDialog({
  open,
  mode,
  member,
  people,
  departments,
  department,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'add' | 'edit' | 'transfer';
  member?: DepartmentMembership;
  people: PersonSummary[];
  departments: DepartmentRecord[];
  department: DepartmentRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(member?.person ? { personId: member.person.id, fullName: personName(member.person) } : null);
  const title = mode === 'add' ? 'Add Department Member' : mode === 'transfer' ? 'Transfer Department Member' : 'Edit Department Role';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const personId = selectedPerson?.personId ?? String(form.get('personId') ?? member?.person.id ?? '');
    const departmentId = String(form.get('departmentId') ?? department.id);
    const position = String(form.get('position') ?? '').trim();
    if (!personId || !departmentId || !position) {
      setError('Person, department, and position are required.');
      return;
    }

    setSaving(true);
    try {
    const payload = { personId, departmentId, position, roleType: form.get('roleType'), reason: form.get('reason') };
      if (mode === 'add') {
        await apiClient.request('/departments/members', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await apiClient.request(`/departments/members?id=${member?.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save membership.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={title} subtitle="Update department membership, position, and role status." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {member ? <p className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-secondary">Member: {personName(member.person)}</p> : null}
        <div className="space-y-2 text-sm text-secondary">
          <span>Member</span>
          {mode === 'add' ? (
            <PeopleSelector
              value={selectedPerson?.personId}
              returnTo={`/departments/${department.id}`}
              placeholder="Search people by name, phone, email, or membership number"
              onChange={setSelectedPerson}
            />
          ) : (
            <p className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-secondary">{member ? personName(member.person) : 'Selected person'}</p>
          )}
        </div>
        <label className="space-y-2 text-sm text-secondary">
          <span>{mode === 'transfer' ? 'New Department' : 'Department'}</span>
          <select name="departmentId" className={inputClass} defaultValue={member?.group?.id ?? department.id}>
            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {mode === 'transfer' ? <p className="text-sm text-secondary">Current department: {department.name}</p> : null}
        <label className="space-y-2 text-sm text-secondary">
          <span>Position</span>
          <input name="position" className={inputClass} defaultValue={member?.status ?? ''} placeholder="Assistant Leader, Coordinator, Member" />
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Role Type</span>
          <select name="roleType" className={inputClass} defaultValue={member?.role === 'HEAD' ? 'HEAD' : 'MEMBER'}>
            <option value="MEMBER">Member</option>
            <option value="HEAD">Head/Leader</option>
          </select>
        </label>
        {mode === 'transfer' ? (
          <label className="space-y-2 text-sm text-secondary">
            <span>Transfer Reason</span>
            <textarea name="reason" className={inputClass} rows={2} placeholder="Optional reason for the transfer" />
          </label>
        ) : null}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
