'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Cake, CalendarDays, HandCoins, Phone, ShieldCheck, Users, UserPlus } from 'lucide-react';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { ChartCard } from '@/components/charts/chart-card';
import { MonthlyFinanceFlowChart } from '@/components/charts/monthly-finance-flow-chart';
import { WeeklyAttendanceTrendChart } from '@/components/charts/weekly-attendance-trend-chart';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { apiClient } from '@/lib/api-client';
import { useDashboardRefreshListener } from '@/lib/dashboard-refresh';
import { showErrorToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

type DashboardSummary = {
  cards?: {
    totalPeople?: number;
    newPeopleThisMonth?: number;
    totalAttendance?: number;
    netBalance?: number;
  };
  charts?: {
    weeklyAttendanceTrend?: any[];
    monthlyFinanceFlow?: any[];
  };
  recentActivities?: any[];
  rightPanel?: {
    birthdaysThisMonth?: BirthdayItem[];
    recentActivities?: RecentActivity[];
  };
};

type BirthdayItem = {
  id: string;
  fullName: string;
  birthdayLabel: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isToday?: boolean;
};

type RecentActivity = {
  id: string;
  title: string;
  description?: string | null;
  module?: string | null;
  createdAt?: string;
};

export function DashboardView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [birthdaysThisMonth, setBirthdaysThisMonth] = useState<BirthdayItem[]>([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (shouldUpdate: () => boolean = () => true) => {
    try {
      const cardPayload = await apiClient.getDashboardSummary('cards');
      if (shouldUpdate()) {
        setSummary((current) => ({ ...(current ?? {}), ...cardPayload }));
        setError(null);
      }

      try {
        const payload = await apiClient.getDashboardSummary();
        if (shouldUpdate()) {
          setSummary(payload);
          setError(null);
        }
      } catch (err) {
        if (shouldUpdate()) {
          const message = err instanceof Error ? err.message : 'Unable to load dashboard details';
          setError(message);
          showErrorToast(err, 'Unable to load dashboard details.');
        }
      }
    } catch (err) {
      if (shouldUpdate()) {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard summary';
        setError(message);
        showErrorToast(err, 'Unable to load dashboard summary.');
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadSummary(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadSummary]);

  useEffect(() => {
    let mounted = true;
    async function loadBirthdays() {
      setBirthdaysLoading(true);
      try {
        const payload = await apiClient.request<{ data: BirthdayItem[] }>('/people/birthdays?scope=thisMonth&limit=3');
        if (mounted) setBirthdaysThisMonth(payload.data ?? []);
      } catch (err) {
        if (mounted) {
          setBirthdaysThisMonth([]);
          showErrorToast(err, 'Unable to load birthday celebrants.');
        }
      } finally {
        if (mounted) setBirthdaysLoading(false);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, []);

  useDashboardRefreshListener(() => {
    void loadSummary();
  });

  if (!summary && !error) return <DashboardSkeleton />;

  if (!summary) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Track attendance, finance, people growth, and department health across the church."
        />
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      </div>
    );
  }

  const cards = summary.cards ?? {};
  const charts = summary.charts ?? {};
  const rightPanel = summary.rightPanel ?? {};
  const recentActivities = rightPanel.recentActivities ?? summary.recentActivities ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Track attendance, finance, people growth, and department health across the church."
      />

      {error ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total People" value={cards.totalPeople ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="New People This Month" value={cards.newPeopleThisMonth ?? 0} icon={<UserPlus className="h-5 w-5" />} accent="green" />
        <StatCard label="Total Attendance" value={cards.totalAttendance ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="info" />
        <StatCard label="Net Balance" value={formatCurrency(cards.netBalance ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <ChartCard title="Weekly Attendance Trend" description="Main service, children service, and total attendance over recent services.">
            <WeeklyAttendanceTrendChart data={charts.weeklyAttendanceTrend ?? []} />
          </ChartCard>
          <ChartCard title="Monthly Welfare & Finance Flow" description="Welfare, fund contributions, expenses, and monthly net balance.">
            <MonthlyFinanceFlowChart data={charts.monthlyFinanceFlow ?? []} />
          </ChartCard>
        </div>

        <aside className="hidden max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-glow xl:block">
          <BirthdaysThisMonth birthdays={birthdaysThisMonth} loading={birthdaysLoading} />
          <div className="mt-6 border-t border-border pt-5">
            <RecentActivities activities={recentActivities.slice(0, 3)} />
          </div>
        </aside>
      </section>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <Link href={href} className="rounded-lg border border-lime/40 px-3 py-1.5 text-xs font-semibold text-lime transition hover:bg-lime/10">
        View All
      </Link>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function BirthdaysThisMonth({ birthdays, loading }: { birthdays: BirthdayItem[]; loading: boolean }) {
  return (
    <section>
      <SectionHeader title="Birthdays This Month" href="/care/birthdays" />
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
          ))
        ) : birthdays.length ? (
          birthdays.slice(0, 3).map((person) => (
            <div key={person.id} className="rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-lime/40">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-lime/30 bg-lime/10 text-xs font-semibold text-lime">
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(person.fullName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-primary">{person.fullName}</p>
                    {person.isToday ? (
                      <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[11px] font-semibold text-lime">Today</span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-secondary">
                    <Cake className="h-3.5 w-3.5 text-lime" />
                    {person.birthdayLabel}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-secondary">
                    <Phone className="h-3.5 w-3.5 text-muted" />
                    {person.phone ?? 'No phone number'}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-sm text-secondary">
            No birthdays this month.
          </div>
        )}
      </div>
    </section>
  );
}

function RecentActivities({ activities }: { activities: RecentActivity[] }) {
  return (
    <section>
      <SectionHeader title="Recent Activities" href="/admin/audit-logs" />
      <div className="space-y-3">
        {activities.length ? (
          activities.map((activity) => (
            <div key={activity.id} className="rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-lime/40">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime/10 text-lime">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold capitalize text-primary">{activity.title}</p>
                    {activity.module ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize text-muted">
                        {activity.module}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-secondary">{activity.description ?? 'Activity recorded.'}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-sm text-secondary">
            No recent activities yet.
          </div>
        )}
      </div>
    </section>
  );
}
