'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type DepartmentMembersPoint = {
  department: string;
  members: number;
};

export function DepartmentMembersChart({ data }: { data: DepartmentMembersPoint[] }) {
  if (!data.length) return <div className="h-[320px]"><EmptyChart message="No department member data yet." /></div>;

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
          <XAxis type="number" stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="department" width={96} stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-hover) / 0.45)' }} />
          <Bar dataKey="members" name="Members" fill={chartColors.lime} radius={[0, 10, 10, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
