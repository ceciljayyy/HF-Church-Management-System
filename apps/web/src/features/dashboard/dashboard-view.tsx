import { CalendarDays, HandCoins, HeartPulse, Users, UserPlus } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardCharts } from '@/components/charts/dashboard-charts';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export function DashboardView({ summary }: { summary: any }) {
  const upcomingEvents = summary.upcomingEvents ?? [];
  const recentActivities = summary.recentActivities ?? [];
  const groupStats = summary.groupStats ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Track attendance, finance, groups, events, and ministry activity across every branch in one premium command center."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={summary.membersTotal ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active members" value={summary.activeMembers ?? 0} icon={<HeartPulse className="h-5 w-5" />} accent="green" />
        <StatCard label="Attendance today" value={summary.attendanceToday ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="info" />
        <StatCard label="Net balance" value={formatCurrency(summary.netBalance ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New members this month" value={summary.newMembersThisMonth ?? 0} icon={<UserPlus className="h-5 w-5" />} accent="green" />
        <StatCard label="Tithes" value={formatCurrency(summary.tithes ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="lime" />
        <StatCard label="Total giving this month" value={formatCurrency(summary.totalGivingThisMonth ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="green" />
        <StatCard label="Expenses" value={formatCurrency(summary.expenses ?? 0)} icon={<HandCoins className="h-5 w-5" />} accent="danger" />
      </section>

      <DashboardCharts
        memberGrowthSeries={summary.memberGrowthSeries ?? []}
        attendanceSeries={summary.attendanceSeries ?? []}
        financeSeries={summary.financeSeries ?? []}
      />

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
              ['Tithes', formatCurrency(summary.tithes ?? 0)],
              ['Offerings', formatCurrency(summary.offerings ?? 0)],
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
