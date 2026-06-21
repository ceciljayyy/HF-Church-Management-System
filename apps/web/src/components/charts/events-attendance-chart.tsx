'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type EventsAttendancePoint = {
  label: string;
  attendance: number;
};

export function EventsAttendanceChart({ data }: { data: EventsAttendancePoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No event attendance data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-hover) / 0.45)' }} />
          <Bar dataKey="attendance" name="Attendance" fill={chartColors.info} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
