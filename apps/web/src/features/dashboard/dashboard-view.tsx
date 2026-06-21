'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, HandCoins, HeartPulse, Users, UserPlus } from 'lucide-react';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/charts/chart-card';
import { AttendanceTrendChart } from '@/components/charts/attendance-trend-chart';
import { DepartmentMembersChart } from '@/components/charts/department-members-chart';
import { EventsAttendanceChart } from '@/components/charts/events-attendance-chart';
import { FinanceTrendChart } from '@/components/charts/finance-trend-chart';
import { IncomeExpensesChart } from '@/components/charts/income-expenses-chart';
import { MiniSparklineChart } from '@/components/charts/mini-sparkline-chart';
import { PeopleDistributionChart } from '@/components/charts/people-distribution-chart';
import { TaskCompletionChart } from '@/components/charts/task-completion-chart';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useDashboardRefreshListener } from '@/lib/dashboard-refresh';
import { showErrorToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

export function DashboardView() {
  const [summary, setSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (shouldUpdate: () => boolean = () => true) => {
    try {
      const cards = await apiClient.getDashboardSummary('cards');
      if (shouldUpdate()) {
        setSummary((current: any | null) => ({ ...(current ?? {}), ...cards }));
        setError(null);
      }

      try {
        const payload = await apiClient.getDashboardSummary();
        if (shouldUpdate()) {
          setSummary((current: any | null) => ({ ...(current ?? {}), ...payload }));
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

  useDashboardRefreshListener(() => {
    void loadSummary();
  });

  if (!summary && !error) return <DashboardSkeleton />;

  if (!summary) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Track attendance, finance, groups, events, and ministry activity across every branch in one premium command center."
        />
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      </div>
    );
  }

  const upcomingEvents = summary.upcomingEvents ?? [];
  const recentActivities = summary.recentActivities ?? [];
  const groupStats = summary.groupStats ?? [];
  const charts = summary.charts ?? {};
  const attendanceTrend = charts.attendanceTrend ?? (summary.attendanceSeries ?? []).map((item: any) => ({ label: item.name, attendance: item.value }));
  const financeTrend = charts.financeTrend ?? (summary.financeSeries ?? []).map((item: any) => ({ label: item.name, amount: item.giving }));
  const incomeExpenses = charts.incomeExpenses ?? (summary.financeSeries ?? []).map((item: any) => ({ label: item.name, income: item.giving, expenses: item.expenses }));
  const peopleDistribution = charts.peopleDistribution ?? (summary.givingByType ?? []);
  const departmentMembers = charts.departmentMembers ?? [];
  const eventsAttendance = charts.eventsAttendance ?? [];
  const taskCompletion = charts.taskCompletion ?? [];
  const peopleSparkline = (summary.peopleGrowthSeries ?? []).map((item: any) => ({ label: item.name, value: item.value }));
  const attendanceSparkline = attendanceTrend.map((item: any) => ({ label: item.label, value: item.attendance }));
  const givingSparkline = financeTrend.map((item: any) => ({ label: item.label, value: item.amount }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Track attendance, finance, groups, events, and ministry activity across every branch in one premium command center."
      />

      {error ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total people" value={summary.peopleTotal ?? 0} icon={<Users className="h-5 w-5" />}>
          <MiniSparklineChart data={peopleSparkline} />
        </StatCard>
        <StatCard label="New people this month" value={summary.newPeopleThisMonth ?? 0} icon={<UserPlus className="h-5 w-5" />} accent="green" />
        <StatCard label="Total attendance today" value={summary.latestPeopleAttendance ?? summary.attendanceToday ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="info">
          <MiniSparklineChart data={attendanceSparkline} color="rgb(var(--color-info))" />
        </StatCard>
        <StatCard label="Net balance" value={formatCurrency(summary.netBalance ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="warning">
          <MiniSparklineChart data={givingSparkline} color="rgb(var(--color-warning))" />
        </StatCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Main service attendance" value={summary.mainServiceAttendance ?? 0} icon={<Users className="h-5 w-5" />} accent="green" />
        <StatCard label="Children service attendance" value={summary.childrenServiceAttendance ?? 0} icon={<HeartPulse className="h-5 w-5" />} accent="info" />
        <StatCard label="Vehicles count" value={summary.vehiclesCount ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="warning" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Welfare collected this month" value={formatCurrency(summary.welfareCollectedThisMonth ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="lime" />
        <StatCard label="Welfare arrears" value={formatCurrency(summary.welfareArrears ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
        <StatCard label="Expenses this month" value={formatCurrency(summary.expenses ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="danger" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending approvals" value={summary.pendingExpenseApprovals ?? 0} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
        <StatCard label="Active fund campaigns" value={summary.activeFundCampaigns ?? 0} icon={<HandCoins className="h-5 w-5" />} accent="lime" />
        <StatCard label="Fund contributions this month" value={formatCurrency(summary.fundContributionsThisMonth ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="green" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Attendance trend" description="Attendance movement across recent months" className="lg:col-span-2">
          <AttendanceTrendChart data={attendanceTrend} />
        </ChartCard>
        <ChartCard title="Income vs expenses" description="Monthly giving compared with spending">
          <IncomeExpensesChart data={incomeExpenses} />
        </ChartCard>
        <ChartCard title="Finance trend" description="Contribution movement across recent months">
          <FinanceTrendChart data={financeTrend} />
        </ChartCard>
        <ChartCard title="Department members" description="Member count by department">
          <DepartmentMembersChart data={departmentMembers} />
        </ChartCard>
        <ChartCard title="Event attendance" description="Attendance recorded for events">
          <EventsAttendanceChart data={eventsAttendance} />
        </ChartCard>
        <ChartCard title="People distribution" description="People grouped by classification">
          <PeopleDistributionChart data={peopleDistribution} />
        </ChartCard>
        <ChartCard title="Event status" description="Published, completed, and cancelled events">
          <TaskCompletionChart data={taskCompletion} />
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Upcoming events</h3>
            <Badge>{upcomingEvents.length} scheduled</Badge>
          </div>
          <DataTable
            columns={['Event', 'Date', 'Status']}
            rows={upcomingEvents.slice(0, 5).map((event: any) => [
              event.title,
              new Date(event.startDateTime).toLocaleDateString(),
              <Badge key={event.id}>{event.status}</Badge>,
            ])}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Recent activities</h3>
            <Badge>{recentActivities.length} items</Badge>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity: any) => (
              <div key={activity.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-sm text-primary">{activity.title}</p>
                <p className="mt-1 text-xs text-secondary">{activity.description ?? activity.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Finance split</h3>
            <Badge>This month</Badge>
          </div>
          <DataTable
            columns={['Category', 'Amount']}
            rows={[
              ['Welfare collected', formatCurrency(summary.welfareCollectedThisMonth ?? 0)],
              ['Welfare arrears', formatCurrency(summary.welfareArrears ?? 0)],
              ['Fund contributions', formatCurrency(summary.fundContributionsThisMonth ?? 0)],
              ['Expenses', formatCurrency(summary.expenses ?? 0)],
            ]}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Group statistics</h3>
            <Badge>{groupStats.length} categories</Badge>
          </div>
          <DataTable
            columns={['Group type', 'Count']}
            rows={groupStats.map((stat: any) => [stat.type, stat._count._all])}
          />
        </div>
      </section>
    </div>
  );
}
