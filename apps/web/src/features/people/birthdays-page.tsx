'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cake, Phone, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { showErrorToast } from '@/lib/toast';

type BirthdayPerson = {
  id: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth: string;
  birthdayLabel: string;
  birthdayMonth: number;
  birthdayDay: number;
  age: number;
  daysUntilBirthday: number;
  classification?: string | null;
  gender?: string | null;
  isToday: boolean;
};

type BirthdayGroup = {
  month: string;
  monthName?: string;
  monthNumber: number;
  celebrants: BirthdayPerson[];
};

const months = [
  ['1', 'January'],
  ['2', 'February'],
  ['3', 'March'],
  ['4', 'April'],
  ['5', 'May'],
  ['6', 'June'],
  ['7', 'July'],
  ['8', 'August'],
  ['9', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

const initialFilters = {
  search: '',
  month: '',
  week: '',
  ageMin: '',
  ageMax: '',
  classification: '',
  gender: '',
};

export function BirthdaysPageClient() {
  const currentMonth = new Date().getMonth() + 1;
  const [groups, setGroups] = useState<BirthdayGroup[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let mounted = true;
    async function loadBirthdays() {
      setLoading(true);
      try {
        const payload = await apiClient.request<{ data: BirthdayGroup[] }>(`/people/birthdays/all${query ? `?${query}` : ''}`);
        if (mounted) setGroups(payload.data ?? []);
      } catch (err) {
        if (mounted) {
          setGroups([]);
          showErrorToast(err, 'Unable to load birthday celebrants.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, [query]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const orderedGroups = useMemo(() => {
    const current = groups.find((group) => group.monthNumber === currentMonth);
    return current ? [current, ...groups.filter((group) => group.monthNumber !== currentMonth)] : groups;
  }, [currentMonth, groups]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Birthday Celebrants"
        subtitle="Celebrate members by month, week, age, and classification."
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <SlidersHorizontal className="h-4 w-4 text-lime" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary xl:col-span-2">
            <Search className="h-4 w-4" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search name or phone"
              className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted"
            />
          </label>
          <select value={filters.month} onChange={(event) => updateFilter('month', event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="">All months</option>
            {months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.week} onChange={(event) => updateFilter('week', event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="">Any week</option>
            <option value="thisWeek">This week</option>
            <option value="nextWeek">Next week</option>
            <option value="month">This month</option>
          </select>
          <select value={filters.classification} onChange={(event) => updateFilter('classification', event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="">All classifications</option>
            <option value="Member">Member</option>
            <option value="Visitor">Visitor</option>
            <option value="First Timer">First Timer</option>
            <option value="New Convert">New Convert</option>
          </select>
          <select value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="">All genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <input value={filters.ageMin} onChange={(event) => updateFilter('ageMin', event.target.value)} inputMode="numeric" placeholder="Min age" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-muted sm:w-28" />
            <input value={filters.ageMax} onChange={(event) => updateFilter('ageMax', event.target.value)} inputMode="numeric" placeholder="Max age" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-muted sm:w-28" />
          </div>
          <button type="button" onClick={() => setFilters(initialFilters)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>
        </div>
      </section>

      {loading ? (
        <BirthdaySkeleton />
      ) : orderedGroups.length ? (
        <div className="space-y-5">
          {orderedGroups.map((group) => (
            <section key={group.monthNumber} className={`rounded-lg border p-4 ${group.monthNumber === currentMonth ? 'border-lime/60 bg-lime/5' : 'border-border bg-card'}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
                    {group.month}
                    {group.monthNumber === currentMonth ? <Cake className="h-5 w-5 text-lime" /> : null}
                  </h2>
                  <p className="text-sm text-secondary">{group.celebrants.length} celebrants</p>
                </div>
                {group.monthNumber === currentMonth ? <Badge className="border-lime/50 bg-lime/10 text-lime">Current month</Badge> : null}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.celebrants.map((person) => (
                  <article key={person.id} className="rounded-lg border border-border bg-surface p-4 transition hover:border-lime/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-primary">{person.fullName}</h3>
                        <p className="mt-1 text-sm text-secondary">{person.birthdayLabel} - Age {person.age}</p>
                      </div>
                      {person.isToday ? <Badge className="border-lime/50 bg-lime/10 text-lime">Today</Badge> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-secondary">
                      <Badge>{person.classification ?? 'Unassigned'}</Badge>
                      {person.gender ? <Badge>{person.gender}</Badge> : null}
                      <Badge>{person.daysUntilBirthday === 0 ? 'Birthday today' : `${person.daysUntilBirthday} days away`}</Badge>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-sm text-secondary">
                      <Phone className="h-4 w-4 text-lime" />
                      {person.phone ?? 'No phone number'}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No birthday celebrants found"
          description={hasFilters ? 'No people match the selected birthday filters.' : 'Add dates of birth to People records to show celebrants here.'}
        />
      )}
    </div>
  );
}

function BirthdaySkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <section key={groupIndex} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-2 h-4 w-24" />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface p-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="mt-3 h-4 w-32" />
                <Skeleton className="mt-5 h-4 w-52" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
