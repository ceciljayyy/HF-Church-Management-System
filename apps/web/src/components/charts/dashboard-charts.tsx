'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

const axisStyle = { fill: 'rgb(var(--color-secondary))', fontSize: 12 };
const gridColor = 'rgb(var(--color-border))';
const mutedColor = 'rgb(var(--color-muted))';
const cardColor = 'rgb(var(--color-card))';
const primaryColor = 'rgb(var(--color-primary))';
const limeColor = 'rgb(var(--color-lime))';
const greenColor = 'rgb(var(--color-green))';
const dangerColor = 'rgb(var(--color-danger))';

export function DashboardCharts({
  memberGrowthSeries,
  attendanceSeries,
  financeSeries,
}: {
  memberGrowthSeries: Array<{ name: string; value: number }>;
  attendanceSeries: Array<{ name: string; value: number }>;
  financeSeries: Array<{ name: string; giving: number; expenses: number }>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card title="Member growth">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={memberGrowthSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={mutedColor} tick={axisStyle} />
            <YAxis stroke={mutedColor} tick={axisStyle} />
            <Tooltip contentStyle={{ background: cardColor, border: `1px solid ${gridColor}`, borderRadius: 16, color: primaryColor }} />
            <Line type="monotone" dataKey="value" stroke={limeColor} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Attendance trend">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={attendanceSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={mutedColor} tick={axisStyle} />
            <YAxis stroke={mutedColor} tick={axisStyle} />
            <Tooltip contentStyle={{ background: cardColor, border: `1px solid ${gridColor}`, borderRadius: 16, color: primaryColor }} />
            <Area type="monotone" dataKey="value" stroke={greenColor} fill="rgb(var(--color-green) / 0.18)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Finance overview">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={mutedColor} tick={axisStyle} />
            <YAxis stroke={mutedColor} tick={axisStyle} />
            <Tooltip contentStyle={{ background: cardColor, border: `1px solid ${gridColor}`, borderRadius: 16, color: primaryColor }} />
            <Bar dataKey="giving" fill={limeColor} radius={[10, 10, 0, 0]} />
            <Bar dataKey="expenses" fill={dangerColor} radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
