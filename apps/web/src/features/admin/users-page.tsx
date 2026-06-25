'use client';

import { FormEvent, useMemo, useState } from 'react';
import { KeyRound, Plus, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Role = {
  id: string;
  name: string;
};

type PersonOption = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
};

type DepartmentOption = {
  id: string;
  name: string;
};

type PlatformUser = {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  person?: { id: string; firstName: string; lastName: string } | null;
  roles?: Array<{ role: Role; scopeType?: string; scopeId?: string | null }>;
};

type CreateForm = {
  personId: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  mustChangePassword: boolean;
  roleId: string;
  scopeType: 'GLOBAL' | 'DEPARTMENT' | 'SELF' | 'NONE';
  scopeId: string;
  sendLoginDetails: boolean;
  status: 'ACTIVE' | 'INACTIVE';
};

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%';
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function initialForm(roles: Role[]): CreateForm {
  return {
    personId: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    password: generatePassword(),
    mustChangePassword: true,
    roleId: roles[0]?.id ?? '',
    scopeType: 'GLOBAL',
    scopeId: '',
    sendLoginDetails: false,
    status: 'ACTIVE',
  };
}

function roleLabels(user: PlatformUser) {
  return (user.roles ?? []).map((entry) => entry.role.name).join(', ') || 'No role';
}

function scopeLabel(user: PlatformUser, departments: DepartmentOption[]) {
  const scopes = (user.roles ?? []).map((entry) => {
    const type = entry.scopeType ?? 'GLOBAL';
    if (type !== 'DEPARTMENT') return type;
    const department = departments.find((item) => item.id === entry.scopeId);
    return department ? `DEPARTMENT: ${department.name}` : 'DEPARTMENT';
  });
  return scopes.join(', ') || 'GLOBAL';
}

export function AdminUsersPageClient({
  initialUsers,
  roles,
  people,
  departments,
}: {
  initialUsers: PlatformUser[];
  roles: Role[];
  people: PersonOption[];
  departments: DepartmentOption[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(() => initialForm(roles));
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term || [user.name, user.email, user.username, user.phone, roleLabels(user)].some((value) => value?.toLowerCase().includes(term));
      const matchesRole = !roleFilter || (user.roles ?? []).some((entry) => entry.role.name === roleFilter);
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  function selectPerson(personId: string) {
    const person = people.find((item) => item.id === personId);
    setForm((current) => ({
      ...current,
      personId,
      name: person?.fullName ?? current.name,
      email: person?.email ?? current.email,
      phone: person?.phone ?? current.phone,
      username: person?.email ? person.email.split('@')[0] ?? current.username : current.username,
    }));
  }

  async function refreshUsers() {
    const data = await apiClient.listResource('users');
    setUsers(data.items ?? []);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiClient.request('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          scopeId: form.scopeType === 'DEPARTMENT' ? form.scopeId : null,
        }),
      });
      showSuccessToast('User access created successfully.');
      setModalOpen(false);
      setForm(initialForm(roles));
      await refreshUsers();
    } catch (error) {
      showErrorToast(error, 'Unable to create platform user.');
    } finally {
      setSaving(false);
    }
  }

  const rows = filteredUsers.map((user) => [
    <div key={`${user.id}-name`}>
      <p className="font-semibold text-primary">{user.name}</p>
      <p className="text-xs text-muted">{user.person ? `${user.person.firstName} ${user.person.lastName}` : 'No linked person'}</p>
    </div>,
    user.username ?? 'No username',
    user.email,
    user.phone ?? 'No phone',
    roleLabels(user),
    scopeLabel(user, departments),
    <Badge key={`${user.id}-status`} className={user.status === 'ACTIVE' ? 'border-green/40 bg-green/10 text-green' : undefined}>{user.status}</Badge>,
    user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        subtitle="Manage login access, roles, scopes, and account status."
        actions={
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90">
            <Plus className="h-4 w-4" />
            Add Platform User
          </button>
        }
      />

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary">
          <Search className="h-4 w-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted" />
        </label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={inputClass}>
          <option value="">All roles</option>
          {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="button" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary">
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </section>

      {rows.length ? (
        <DataTable columns={['Name', 'Username', 'Email', 'Phone', 'Roles', 'Scope', 'Status', 'Last Login']} rows={rows} minWidthClass="min-w-[1100px]" />
      ) : (
        <EmptyState title="No platform users found" description="Give system access to selected People when they need to use the admin platform." />
      )}

      <Modal open={modalOpen} title="Create Login Account" subtitle="Give an existing Person access to the platform." onClose={() => setModalOpen(false)} className="max-w-3xl">
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-secondary">
              <span>Selected Person</span>
              <select className={inputClass} value={form.personId} onChange={(event) => selectPerson(event.target.value)}>
                <option value="">No linked person</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Name</span>
              <input required className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Username</span>
              <input className={inputClass} value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Email</span>
              <input required type="email" className={inputClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Phone</span>
              <input className={inputClass} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Temporary Password</span>
              <div className="flex gap-2">
                <input required className={inputClass} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                <button type="button" onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))} className="rounded-lg border border-border bg-surface px-3 text-secondary transition hover:bg-hover hover:text-primary" title="Generate temporary password">
                  <KeyRound className="h-4 w-4" />
                </button>
              </div>
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Role</span>
              <select required className={inputClass} value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm text-secondary">
              <span>Scope Type</span>
              <select className={inputClass} value={form.scopeType} onChange={(event) => setForm((current) => ({ ...current, scopeType: event.target.value as CreateForm['scopeType'] }))}>
                <option value="GLOBAL">Global</option>
                <option value="DEPARTMENT">Department</option>
                <option value="SELF">Self</option>
                <option value="NONE">None</option>
              </select>
            </label>
            {form.scopeType === 'DEPARTMENT' ? (
              <label className="space-y-2 text-sm text-secondary">
                <span>Scope Target</span>
                <select className={inputClass} value={form.scopeId} onChange={(event) => setForm((current) => ({ ...current, scopeId: event.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="space-y-2 text-sm text-secondary">
              <span>Account Status</span>
              <select className={inputClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CreateForm['status'] }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 text-sm text-secondary md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.mustChangePassword} onChange={(event) => setForm((current) => ({ ...current, mustChangePassword: event.target.checked }))} />
              Must change password on first login
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.sendLoginDetails} onChange={(event) => setForm((current) => ({ ...current, sendLoginDetails: event.target.checked }))} />
              Send login details by SMS/email
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">
              <ShieldCheck className="h-4 w-4" />
              {saving ? 'Creating...' : 'Create Login Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
