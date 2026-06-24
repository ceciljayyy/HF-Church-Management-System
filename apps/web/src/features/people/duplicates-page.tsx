'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type DuplicateGroup = {
  id: string;
  reason: string;
  matchValue: string;
  people: Array<{
    id: string;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    createdAt: string;
  }>;
};

export function DuplicatesPageClient() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiClient.request<{ groups: DuplicateGroup[] }>('/people/duplicates');
      setGroups(data.groups ?? []);
    } catch (err) {
      showErrorToast(err, 'Unable to load duplicate people.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function removePerson(personId: string, mode: 'archive' | 'delete') {
    if (!window.confirm(`Confirm ${mode === 'archive' ? 'archive' : 'delete'} for this duplicate record?`)) return;
    try {
      await apiClient.request(`/people?id=${personId}&mode=${mode}`, { method: 'DELETE' });
      showSuccessToast(mode === 'archive' ? 'Duplicate archived successfully.' : 'Duplicate deleted successfully.');
      await load();
    } catch (err) {
      showErrorToast(err, 'Unable to update duplicate record.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duplicate People"
        subtitle="Review existing people that match by normalized phone, email, name, or name plus date of birth."
        actions={
          <Link href="/people" className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-hover">
            Back to People
          </Link>
        }
      />

      {loading ? <div className="rounded-lg border border-border bg-card p-6 text-sm text-secondary">Scanning duplicate records...</div> : null}
      {!loading && !groups.length ? <div className="rounded-lg border border-border bg-card p-6 text-sm text-secondary">No duplicate groups found.</div> : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">{group.reason}</h3>
                <p className="text-xs text-secondary">{group.people.length} people matched.</p>
              </div>
              <span className="break-all rounded-full border border-border px-3 py-1 text-xs text-muted">{group.matchValue}</span>
            </div>
            <DataTable
              columns={['Name', 'Phone', 'Email', 'Date of Birth', 'Created', 'Actions']}
              rows={group.people.map((person) => [
                person.fullName,
                person.phone ?? 'No phone',
                person.email ?? 'No email',
                person.dateOfBirth ?? 'No DOB',
                new Date(person.createdAt).toLocaleDateString(),
                <div key={`${group.id}-${person.id}-actions`} className="flex justify-end gap-2">
                  <button type="button" onClick={() => removePerson(person.id, 'archive')} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-secondary transition hover:bg-hover hover:text-primary">
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                  <button type="button" onClick={() => removePerson(person.id, 'delete')} className="inline-flex items-center gap-1 rounded-lg border border-danger/40 px-2 py-1 text-xs text-danger transition hover:bg-danger/10">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>,
              ])}
              minWidthClass="min-w-[900px]"
            />
          </section>
        ))}
      </div>
    </div>
  );
}
