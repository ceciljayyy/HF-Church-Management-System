'use client';

import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Permission = {
  key: string;
  name: string;
  module: string;
};

type Role = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissionKeys: string[];
};

export function AdminRolesPageClient({ initialRoles, permissions }: { initialRoles: Role[]; permissions: Permission[] }) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];

  const permissionsByModule = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      acc[permission.module] ??= [];
      acc[permission.module]!.push(permission);
      return acc;
    }, {});
  }, [permissions]);

  function togglePermission(key: string) {
    if (!selectedRole) return;
    setRoles((current) =>
      current.map((role) =>
        role.id === selectedRole.id
          ? {
              ...role,
              permissionKeys: role.permissionKeys.includes(key)
                ? role.permissionKeys.filter((permission) => permission !== key)
                : [...role.permissionKeys, key],
            }
          : role,
      ),
    );
  }

  async function saveRole() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await apiClient.request('/roles', {
        method: 'PATCH',
        body: JSON.stringify({ id: selectedRole.id, permissionKeys: selectedRole.permissionKeys }),
      });
      showSuccessToast('Role permissions saved successfully.');
    } catch (error) {
      showErrorToast(error, 'Unable to save role permissions.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage approved platform roles and module permissions."
        actions={
          selectedRole ? (
            <button type="button" onClick={saveRole} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          ) : undefined
        }
      />

      {roles.length ? (
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-2 rounded-lg border border-border bg-card p-3">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full rounded-lg px-3 py-3 text-left transition ${role.id === selectedRole?.id ? 'bg-lime text-darkGreen' : 'bg-surface text-secondary hover:bg-hover hover:text-primary'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{role.name}</span>
                  {role.isSystem ? <Badge className={role.id === selectedRole?.id ? 'border-darkGreen/30 bg-darkGreen/10 text-darkGreen' : undefined}>System</Badge> : null}
                </div>
                <p className="mt-1 text-xs opacity-80">{role.permissionKeys.length} permissions</p>
              </button>
            ))}
          </aside>

          {selectedRole ? (
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{selectedRole.name}</h2>
                  <p className="text-sm text-secondary">{selectedRole.description ?? 'No description'}</p>
                </div>
                {selectedRole.isSystem ? <Badge>System role cannot be deleted</Badge> : null}
              </div>
              <div className="space-y-5">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                  <div key={module} className="rounded-lg border border-border bg-surface p-4">
                    <h3 className="mb-3 text-sm font-semibold capitalize text-primary">{module}</h3>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {modulePermissions.map((permission) => (
                        <label key={permission.key} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-secondary">
                          <input type="checkbox" checked={selectedRole.permissionKeys.includes(permission.key)} onChange={() => togglePermission(permission.key)} className="mt-1" />
                          <span>
                            <span className="block font-semibold text-primary">{permission.name}</span>
                            <span className="text-xs text-muted">{permission.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState title="No roles found" description="Run the RBAC seed to create the approved platform roles." />
      )}
    </div>
  );
}
