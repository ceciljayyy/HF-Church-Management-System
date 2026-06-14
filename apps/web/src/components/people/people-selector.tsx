'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { peopleService } from '@/lib/services/people.service';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';

export function PeopleSelector({
  value,
  onChange,
  placeholder = 'Search people',
  includeMembersOnly = false,
  allowAddNew = true,
  returnTo,
  filters,
}: {
  value?: string;
  onChange: (person: any | null) => void;
  placeholder?: string;
  includeMembersOnly?: boolean;
  allowAddNew?: boolean;
  returnTo?: string;
  filters?: Record<string, string | number | boolean | undefined>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => items.find((item) => item.personId === value || item.id === value), [items, value]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = includeMembersOnly
          ? await peopleService.getMembersLookup({ search, includeDepartments: true, ...filters })
          : await peopleService.getPeopleLookup({ search, includeDepartments: true, ...filters });
        if (!cancelled) setItems(response.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [search, includeMembersOnly, filters]);

  function addNew() {
    const params = new URLSearchParams();
    params.set('openAddUser', 'true');
    if (returnTo) params.set('returnTo', returnTo);
    router.push(`/people?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
        <input
          className={`${inputClass} pl-9`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={selected ? selected.fullName : placeholder}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-surface">
        {items.map((person) => {
          const active = value === person.personId || value === person.id;
          return (
            <button
              key={person.personId}
              type="button"
              onClick={() => onChange(person)}
              className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-hover ${active ? 'bg-lime/10 text-lime' : 'text-secondary'}`}
            >
              <span className="block font-semibold text-primary">{person.fullName}</span>
              <span className="mt-1 block text-xs text-muted">
                {[person.membershipNumber, person.phone, person.departments?.[0]?.name].filter(Boolean).join(' | ') || 'No member details'}
              </span>
            </button>
          );
        })}
        {!items.length ? (
          <div className="space-y-3 px-3 py-4 text-sm text-secondary">
            <p>{loading ? 'Loading people...' : 'No person found.'}</p>
            {allowAddNew ? (
              <button type="button" onClick={addNew} className="inline-flex items-center gap-2 rounded-lg bg-lime px-3 py-2 text-xs font-semibold text-darkGreen">
                <Plus className="h-3.5 w-3.5" />
                Add New Member
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
