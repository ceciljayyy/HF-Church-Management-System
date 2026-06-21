'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type AttendanceTrendPoint = {
  label: string;
  attendance: number;
};

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No attendance trend data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartColors.green, strokeOpacity: 0.25 }} />
          <Area type="monotone" dataKey="attendance" name="Attendance" stroke={chartColors.green} fill="rgb(var(--color-green) / 0.18)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
